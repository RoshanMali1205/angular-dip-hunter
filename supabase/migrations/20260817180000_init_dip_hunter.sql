-- Dip Hunter — initial Supabase schema
-- Run in the SQL editor (or supabase db push).
-- Requires Auth (email) to be enabled in the project.

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- Profiles (1:1 with auth.users)
-- ---------------------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Phase 1 snapshot (what the Angular CloudSyncService reads/writes)
-- ---------------------------------------------------------------------------
create table if not exists public.user_snapshots (
  user_id uuid primary key references auth.users (id) on delete cascade,
  payload jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Phase 2 normalized tables (RLS ready; Angular can switch later)
-- ---------------------------------------------------------------------------
create table if not exists public.folders (
  id text not null,
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  description text,
  stock_count integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, id)
);

create table if not exists public.stocks (
  id text not null,
  user_id uuid not null references auth.users (id) on delete cascade,
  symbol text not null,
  display_name text not null,
  exchange text not null default 'NSE' check (exchange in ('NSE', 'BSE')),
  folder_id text not null,
  rank integer not null default 0,
  is_active boolean not null default true,
  sector text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, id)
);

create index if not exists stocks_user_symbol_idx on public.stocks (user_id, symbol);

create table if not exists public.plans (
  id text not null,
  user_id uuid not null references auth.users (id) on delete cascade,
  month text not null,
  name text,
  status text not null default 'DRAFT' check (status in ('DRAFT', 'FINAL')),
  budget numeric not null default 0,
  strategy text,
  total_planned_amount numeric not null default 0,
  notes text,
  finalized_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, id)
);

create table if not exists public.plan_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  plan_id text not null,
  stock_id text,
  symbol text not null,
  target_amount numeric not null default 0,
  target_qty numeric,
  planned_price numeric,
  actual_price numeric,
  actual_qty numeric,
  is_executed boolean not null default false,
  executed_at timestamptz
);

create table if not exists public.drafts (
  id text not null,
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  budget numeric not null default 0,
  items jsonb not null default '[]'::jsonb,
  total_planned_amount numeric not null default 0,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, id)
);

create table if not exists public.transactions (
  id text not null,
  user_id uuid not null references auth.users (id) on delete cascade,
  type text not null check (type in ('BUY', 'DIVIDEND')),
  date date not null,
  symbol text not null,
  stock_id text,
  qty numeric,
  price numeric,
  charges numeric,
  total_amount numeric,
  amount numeric,
  dividend_per_share numeric,
  plan_id text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, id)
);

create table if not exists public.user_settings (
  user_id uuid primary key references auth.users (id) on delete cascade,
  settings jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- updated_at helper
-- ---------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute procedure public.set_updated_at();

drop trigger if exists user_snapshots_set_updated_at on public.user_snapshots;
create trigger user_snapshots_set_updated_at
  before update on public.user_snapshots
  for each row execute procedure public.set_updated_at();

-- ---------------------------------------------------------------------------
-- New user: profile + empty snapshot
-- ---------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1))
  )
  on conflict (id) do nothing;

  insert into public.user_snapshots (user_id, payload)
  values (new.id, jsonb_build_object('version', 1))
  on conflict (user_id) do nothing;

  insert into public.user_settings (user_id, settings)
  values (new.id, '{}'::jsonb)
  on conflict (user_id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.user_snapshots enable row level security;
alter table public.folders enable row level security;
alter table public.stocks enable row level security;
alter table public.plans enable row level security;
alter table public.plan_items enable row level security;
alter table public.drafts enable row level security;
alter table public.transactions enable row level security;
alter table public.user_settings enable row level security;

-- profiles.id is the user id
drop policy if exists "profiles_own_row" on public.profiles;
create policy "profiles_own_row" on public.profiles
  for all
  using (id = auth.uid())
  with check (id = auth.uid());

drop policy if exists "snapshots_own_row" on public.user_snapshots;
create policy "snapshots_own_row" on public.user_snapshots
  for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists "folders_own_rows" on public.folders;
create policy "folders_own_rows" on public.folders
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists "stocks_own_rows" on public.stocks;
create policy "stocks_own_rows" on public.stocks
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists "plans_own_rows" on public.plans;
create policy "plans_own_rows" on public.plans
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists "plan_items_own_rows" on public.plan_items;
create policy "plan_items_own_rows" on public.plan_items
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists "drafts_own_rows" on public.drafts;
create policy "drafts_own_rows" on public.drafts
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists "transactions_own_rows" on public.transactions;
create policy "transactions_own_rows" on public.transactions
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists "user_settings_own_row" on public.user_settings;
create policy "user_settings_own_row" on public.user_settings
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

grant usage on schema public to anon, authenticated;
grant select, insert, update, delete on all tables in schema public to authenticated;
grant select on all tables in schema public to anon;
