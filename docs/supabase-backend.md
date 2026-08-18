# Dip Hunter — Supabase backend plan

This document is the implementation plan for moving Dip Hunter from **browser-local mock auth + localStorage** to **Supabase Auth + Postgres**, so each user has a real account and **permanent, per-user data**.

Today: login is a client-side gate; `dh_stocks`, `dh_plans`, `dh_transactions`, etc. live in **one browser**. Two accounts on the same device share the same portfolio. There is no email verification.

Target: **Supabase Auth** (email + password) and **Row Level Security** so User A cannot read User B’s rows.

---

## 1. Architecture

```
┌─────────────────────────────────────────────────────────────┐
│ Angular SPA (Netlify)                                        │
│  AuthService ──► @supabase/supabase-js (anon key + JWT)     │
│  CloudSyncService ──► user_snapshots (JSONB) + later tables │
│  QuoteService / Finance Buddy ──► existing Netlify functions│
└───────────────┬──────────────────────────┬──────────────────┘
                │ HTTPS + JWT              │ no user JWT
                ▼                          ▼
     ┌─────────────────────┐    ┌─────────────────────┐
     │ Supabase            │    │ Netlify Functions   │
     │  Auth + Postgres    │    │  /api/quotes, /api/ai│
     │  GoTrue email       │    │  GEMINI_API_KEY     │
     │  RLS on all tables  │    └─────────────────────┘
     └─────────────────────┘
```

**API style:** no custom REST server for portfolio data. The SPA talks to:

| Surface | Protocol | Auth |
|---------|----------|------|
| Sign up / login / logout / refresh | Supabase Auth (`/auth/v1`) | anon key + email/password or refresh token |
| Confirm email / reset password | Supabase Auth email links → `/auth/callback` | PKCE / hash session |
| Portfolio CRUD | PostgREST (`/rest/v1/...`) | `Authorization: Bearer <access_token>` |
| Quotes + Gemini | Existing `/.netlify/functions/*` | Unchanged (server env keys) |

Do **not** put the Supabase **service_role** key in Angular or Netlify public env. Only `SUPABASE_URL` + **anon** key go in the client.

---

## 2. Database

Apply `supabase/migrations/20260817180000_init_dip_hunter.sql` in the Supabase SQL editor (or CLI).

### 2.1 Auth (managed by Supabase)

`auth.users` is created by GoTrue. We never write passwords. Columns we care about: `id` (uuid), `email`, `email_confirmed_at`, `last_sign_in_at`.

### 2.2 App schema (`public`)

**Phase 1 (shipped in this PR):** one snapshot row per user — fastest path that still isolates data by `auth.uid()`.

| Table | Purpose |
|-------|---------|
| `profiles` | Display name, avatar URL, `created_at`. PK = `auth.users.id`. |
| `user_snapshots` | JSONB blob of localStorage keys (`dh_folders`, `dh_stocks`, `dh_plans`, `dh_transactions`, `dh_drafts`, `dh_settings`, `dh_user`, `dh_dip_signals`). PK = `user_id`. |
| `dip_signals` | Daily AI Signal + Score per user/symbol (`as_of_date` IST). RLS `user_id = auth.uid()`. |

**Phase 2 (tables created now, wired later):** normalized rows for querying and backups.

| Table | Maps from |
|-------|-----------|
| `folders` | `dh_folders` |
| `stocks` | `dh_stocks` plus optional `ai_signal`, `ai_score`, `ai_scored_at` |
| `dip_signals` | Daily Gemini/local scores (`dh_dip_signals`) |
| `plans` | `dh_plans` (header) |
| `plan_items` | `MonthlyPlan.items` |
| `drafts` | `dh_drafts` |
| `transactions` | `dh_transactions` (buy + dividend, `type` check) |
| `user_settings` | `dh_settings` minus broker API keys |

**Never store in Postgres:** quote cache, exchange-rate cache, performance history cache, `GEMINI_API_KEY`, Finnhub/Alpha Vantage keys (keep those in Netlify / the user’s browser settings until a secrets vault exists).

### 2.3 Snapshot JSON shape

```json
{
  "version": 1,
  "dh_folders": [],
  "dh_stocks": [],
  "dh_plans": [],
  "dh_transactions": [],
  "dh_drafts": [],
  "dh_settings": {},
  "dh_user": {},
  "dh_dip_signals": {
    "asOfDate": "2026-08-18",
    "scoredAt": "2026-08-18T04:00:00.000Z",
    "prediction": {}
  }
}
```

`updated_at` is used for last-write-wins. Offline edits stay in localStorage and flush when the network is back.

---

## 3. API (what the app calls)

All paths are on `{SUPABASE_URL}`. The JS client wraps these.

### Auth

| Action | Method | Notes |
|--------|--------|--------|
| Register | `POST /auth/v1/signup` | `emailRedirectTo` = `{origin}/auth/callback` |
| Login | `POST /auth/v1/token?grant_type=password` | Rejects unconfirmed email if “Confirm email” is on |
| Refresh | `POST /auth/v1/token?grant_type=refresh_token` | Handled by the client |
| Logout | `POST /auth/v1/logout` | |
| Forgot password | `POST /auth/v1/recover` | `redirectTo` = `{origin}/auth/callback` |
| Update password | `PUT /auth/v1/user` | Requires recovery session from the email link |
| Session from email link | PKCE `exchangeCodeForSession` or hash tokens | `/auth/callback` |

### Data (Phase 1)

| Action | REST | RLS |
|--------|------|-----|
| Load portfolio | `GET /rest/v1/user_snapshots?select=payload,updated_at` | `user_id = auth.uid()` |
| Save portfolio | `POST /rest/v1/user_snapshots` upsert on `user_id` | same |
| Daily AI scores | `GET/POST /rest/v1/dip_signals` upsert on `(user_id,symbol,as_of_date)` | same |
| Prune old AI scores | App deletes the user’s rows older than 14 IST days after upsert. SQL editor: `select public.prune_dip_signals();` | function is `security definer` (owner / `service_role` only) |
| Profile | `GET/PATCH /rest/v1/profiles?id=eq.{uid}` | same |

`user_snapshots` and `stocks.ai_*` do **not** keep history — they overwrite in place. Only `dip_signals` grows by date, and those older rows are what we prune.

### Cleanup (old `dip_signals` rows)

Daily scores are keyed by `(user_id, symbol, as_of_date)`. Today’s row is upserted; dates older than **14 IST days** are deleted.

1. **Automatic:** after a successful upsert, the app deletes that user’s stale rows (`as_of_date < today - 14`).
2. **SQL editor (all users):** run this in Supabase → SQL Editor:

```sql
select public.prune_dip_signals();      -- keep 14 IST days
-- select public.prune_dip_signals(7);  -- or keep 7 days
```

One-shot without the function:

```sql
delete from public.dip_signals
where as_of_date < (timezone('Asia/Kolkata', now()))::date - 14;
```

---

## 4. Security

1. **RLS on every public table.** Policy: `USING (user_id = auth.uid())` (or `id = auth.uid()` on `profiles`). No `TO public` without a filter.
2. **Anon key is not a secret.** It is safe in the SPA **only because RLS is on**. Treat `service_role` as a root password.
3. **Enable Confirm email** in Auth settings so unverified inboxes cannot sign in.
4. **Password policy:** keep Dip Hunter’s client rules (8+ chars, upper, number, special) **and** set the same minimums in Supabase Auth → Providers → Email.
5. **Rate limits:** use Supabase Auth rate limits (replaces `dh_login_attempts`). Optional: Cloudflare in front of the SPA.
6. **Redirect allow-list:** Auth → URL Configuration → add production origin and `http://localhost:4200`. Never allow `*` in production.
7. **PKCE** for email links (`flowType: 'pkce'`).
8. **JWT on PostgREST only.** Do not send the user JWT to Yahoo/Gemini; those stay on Netlify with server env vars.
9. **Settings JSON:** do not put Finnhub/Alpha Vantage keys in `user_snapshots` long-term; strip or encrypt in Phase 2.
10. **CORS:** Supabase project URL only; SPA origin in Auth redirect URLs.

---

## 5. Authentication flows

### 5.1 Email registration

1. User submits name, email, password on `/auth/register`.
2. Client `signUp({ email, password, options: { data: { full_name }, emailRedirectTo }})`.
3. Postgres trigger creates `profiles` + empty `user_snapshots`.
4. Supabase sends **Confirm signup** mail (template in `supabase/email-templates/confirm-signup.html`).
5. SPA shows login with “Check your email to verify”.
6. User clicks the link → `/auth/callback` → session → dashboard (or login if confirm-only).

### 5.2 Login

`signInWithPassword`. If email is not confirmed, surface Auth’s error (do not leak whether the email exists beyond what Supabase already returns).

**Remember me:** Supabase persists the session in `localStorage` by default. If remember-me is off, use `sessionStorage` via `auth.storage` override (optional follow-up). v1 always persists (standard SPA).

### 5.3 Email verification

Dashboard Auth → Email → **Confirm email = ON**.  
Template: Confirm signup.  
Site URL: production SPA origin.  
Redirect: `{SiteURL}/auth/callback`.

### 5.4 Reset password

1. `/auth/forgot-password` → `resetPasswordForEmail(email, { redirectTo: origin/auth/callback })`.
2. Always show “If that account exists, we sent a link” (no account enumeration).
3. Template: Reset password (`reset-password.html`).
4. Link opens `/auth/callback`, which detects `PASSWORD_RECOVERY` and routes to `/auth/reset-password` (this route is **not** behind `guestGuard`, because the recovery session is already authenticated).
5. User sets a new password → `updateUser({ password })` → sign out recovery session → `/auth/login?passwordReset=true`.

Local HMAC reset tokens and EmailJS remain as a **fallback only when Supabase is not configured**.

---

## 6. Email templates (Dip Hunter)

Paste the HTML files from `supabase/email-templates/` into:

**Authentication → Email Templates**

| Supabase template | File | Primary button |
|-------------------|------|----------------|
| Confirm signup | `confirm-signup.html` | Confirm email |
| Reset password | `reset-password.html` | Reset password |
| Magic link (optional) | `magic-link.html` | Sign in |

Sender: Authentication → SMTP (Supabase default) or custom SMTP (SendGrid/AWS SES) for production deliverability. Set **Sender name** to `Dip Hunter`.

Go template variables used: `{{ .ConfirmationURL }}`, `{{ .Email }}`, `{{ .SiteURL }}`.

---

## 7. Angular impact

| Area | Change |
|------|--------|
| `AuthService` | Use Supabase when `environment.supabaseUrl` + `supabaseAnonKey` are set; otherwise keep local mock (dev/tests). |
| `/auth/callback` | Exchange code / hash, then redirect. |
| `guestGuard` | Do not wrap callback or reset-password. |
| `StorageService` | After local write of cloud keys, debounce upsert to `user_snapshots`. |
| `APP_INITIALIZER` | Restore session, then **pull snapshot into localStorage before** portfolio services construct. |
| Netlify | Set `SUPABASE_URL` + `SUPABASE_ANON_KEY` (Functions + Production). The SPA reads them from `/.netlify/functions/public-config`. Optional local fill: `environment.ts`. |

---

## 8. Rollout

1. Create a Supabase project (region close to users, e.g. `ap-south-1`).
2. Run the SQL migrations (`20260817180000_init_dip_hunter.sql`, then `20260818120000_dip_signals.sql`).
3. Auth: enable Email, confirm email ON, add redirect URLs, paste templates.
4. Put URL + anon key in Netlify env (production does **not** need them committed in git):
   - `SUPABASE_URL` = Project URL (`https://xxxx.supabase.co`)
   - `SUPABASE_ANON_KEY` = **anon public** key (never `service_role`)
   Scopes: **Builds, Functions, Runtime** + Production, then **redeploy**.
   The SPA loads them from `/.netlify/functions/public-config`.
   For local `ng serve`, you can still fill `src/environments/environment.ts`.
5. Deploy SPA. First user: register → verify email → login → data appears in Table Editor → `user_snapshots`.
6. Optional: import existing localStorage via Settings export, then login (Phase 1 does not auto-migrate anonymous local data into another account).

### Local without Supabase

Empty `supabaseUrl` keeps today’s mock auth so unit tests and offline demos still work.

---

## 9. Testing

| Layer | What |
|-------|------|
| Unit | AuthService still works with empty env (mock path). CloudSync no-ops. |
| Manual | Sign up → mail → confirm → login → add a stock → reload another browser → same data. Reset password mail. Second user cannot see first user’s snapshot. |
| SQL | `auth.uid()` policies: try REST without JWT → empty/401; with user JWT → only own row. |

---

## 10. Out of scope (later)

- Google/Apple OAuth
- Migrating normalized tables as the live write path
- Server-side quote/AI auth
- Multi-device conflict UI (beyond last-write-wins)
- Admin dashboard
