-- Dip Hunter — AI signal + score columns
-- Run in the SQL editor after 20260817180000_init_dip_hunter.sql
--
-- Phase 1 UI reads/writes `dip_signals` (and also caches in user_snapshots.dh_dip_signals).
-- `stocks.ai_*` is ready for Phase 2 normalized stock CRUD.

-- ---------------------------------------------------------------------------
-- Phase 2 columns on public.stocks
-- ---------------------------------------------------------------------------
alter table public.stocks
  add column if not exists ai_signal text,
  add column if not exists ai_score smallint,
  add column if not exists ai_scored_at timestamptz;

alter table public.stocks drop constraint if exists stocks_ai_signal_check;
alter table public.stocks
  add constraint stocks_ai_signal_check
  check (ai_signal is null or ai_signal in ('buy', 'watch', 'skip'));

alter table public.stocks drop constraint if exists stocks_ai_score_check;
alter table public.stocks
  add constraint stocks_ai_score_check
  check (ai_score is null or (ai_score >= 0 and ai_score <= 100));

-- ---------------------------------------------------------------------------
-- Daily per-user AI scores (what the dashboard uses today)
-- ---------------------------------------------------------------------------
create table if not exists public.dip_signals (
  user_id uuid not null references auth.users (id) on delete cascade,
  symbol text not null,
  as_of_date date not null,
  action text not null check (action in ('buy', 'watch', 'skip')),
  score smallint not null check (score >= 0 and score <= 100),
  rationale text,
  confidence text,
  drop_type text,
  risk_note text,
  provider text,
  model text,
  updated_at timestamptz not null default now(),
  primary key (user_id, symbol, as_of_date)
);

create index if not exists dip_signals_user_date_idx
  on public.dip_signals (user_id, as_of_date);

drop trigger if exists dip_signals_set_updated_at on public.dip_signals;
create trigger dip_signals_set_updated_at
  before update on public.dip_signals
  for each row execute procedure public.set_updated_at();

alter table public.dip_signals enable row level security;

drop policy if exists "dip_signals_own_rows" on public.dip_signals;
create policy "dip_signals_own_rows" on public.dip_signals
  for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

grant select, insert, update, delete on public.dip_signals to authenticated;
grant select on public.dip_signals to anon;

-- ---------------------------------------------------------------------------
-- Retention: drop rows older than 14 IST days
-- App also deletes the signed-in user's stale rows after each daily upsert.
-- Run in SQL editor anytime:  select public.prune_dip_signals();
-- ---------------------------------------------------------------------------
create or replace function public.prune_dip_signals(retention_days integer default 14)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  deleted_count integer;
  cutoff date;
begin
  if retention_days is null or retention_days < 1 then
    raise exception 'retention_days must be >= 1';
  end if;

  cutoff := (timezone('Asia/Kolkata', now()))::date - retention_days;

  delete from public.dip_signals
  where as_of_date < cutoff;

  get diagnostics deleted_count = row_count;
  return deleted_count;
end;
$$;

revoke all on function public.prune_dip_signals(integer) from public, anon, authenticated;
grant execute on function public.prune_dip_signals(integer) to postgres, service_role;
