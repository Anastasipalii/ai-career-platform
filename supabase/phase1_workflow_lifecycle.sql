-- =============================================================
-- CareerAI — Phase 1: Workflow-run lifecycle + observable event log
-- -------------------------------------------------------------
-- ADDITIVE and BACKWARD-COMPATIBLE. It only ADDS columns/tables/
-- indexes; it never drops or renames anything, so the existing
-- Dashboard and completed workflow history keep working unchanged.
-- Safe to run more than once (guarded with IF NOT EXISTS / catch).
--
-- HOW TO APPLY (manually — do NOT auto-run against production):
--   Supabase → SQL Editor → New query → paste this file → Run.
--   Review on a staging project first if possible.
-- =============================================================

begin;

-- -------------------------------------------------------------
-- 0) updated_at trigger function (self-contained)
-- Ensure it exists so this migration runs on a fresh database
-- without assuming migrations.sql ran first. CREATE OR REPLACE
-- is safe to re-run and leaves an existing definition unchanged.
-- -------------------------------------------------------------
create or replace function public.handle_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- -------------------------------------------------------------
-- 0b) Base workflow_runs table (self-contained)
-- Create the original table if it does not exist yet, so this
-- migration works on a fresh database. On an existing database
-- this is a no-op (IF NOT EXISTS); the lifecycle columns are
-- added in section 1 below.
-- -------------------------------------------------------------
create table if not exists public.workflow_runs (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references auth.users (id) on delete cascade,
  resume_name    text,
  resume_preview text,
  analysis       jsonb not null default '{}',
  ats_score      integer check (ats_score between 0 and 100),
  cover_letter   jsonb not null default '{}',
  job_match      jsonb not null default '{}',
  interview      jsonb not null default '{}',
  source         text not null default 'demo-fallback',
  completed_at   timestamptz not null default now(),
  created_at     timestamptz not null default now()
);

alter table public.workflow_runs enable row level security;

-- Owner-only access (idempotent: drop-then-create re-asserts the same policies).
drop policy if exists "workflow_runs: select own" on public.workflow_runs;
create policy "workflow_runs: select own"
  on public.workflow_runs for select
  using (auth.uid() = user_id);

drop policy if exists "workflow_runs: insert own" on public.workflow_runs;
create policy "workflow_runs: insert own"
  on public.workflow_runs for insert
  with check (auth.uid() = user_id);

drop policy if exists "workflow_runs: update own" on public.workflow_runs;
create policy "workflow_runs: update own"
  on public.workflow_runs for update
  using (auth.uid() = user_id);

drop policy if exists "workflow_runs: delete own" on public.workflow_runs;
create policy "workflow_runs: delete own"
  on public.workflow_runs for delete
  using (auth.uid() = user_id);

-- -------------------------------------------------------------
-- 1) Extend workflow_runs with a real lifecycle (all additive)
-- -------------------------------------------------------------
alter table public.workflow_runs add column if not exists run_key       uuid not null default gen_random_uuid();
alter table public.workflow_runs add column if not exists mode          text not null default 'production';
alter table public.workflow_runs add column if not exists status        text not null default 'completed';
alter table public.workflow_runs add column if not exists current_step  text;
alter table public.workflow_runs add column if not exists progress      integer not null default 100;
alter table public.workflow_runs add column if not exists error_code    text;
alter table public.workflow_runs add column if not exists error_message text;
alter table public.workflow_runs add column if not exists started_at    timestamptz;
alter table public.workflow_runs add column if not exists updated_at    timestamptz not null default now();

-- Value constraints (guarded so re-running is safe)
do $$ begin
  alter table public.workflow_runs
    add constraint workflow_runs_mode_check check (mode in ('production','stress','demo'));
exception when duplicate_object then null; end $$;

do $$ begin
  alter table public.workflow_runs
    add constraint workflow_runs_status_check
    check (status in ('queued','running','completed','failed','cancelled'));
exception when duplicate_object then null; end $$;

do $$ begin
  alter table public.workflow_runs
    add constraint workflow_runs_progress_check check (progress between 0 and 100);
exception when duplicate_object then null; end $$;

-- Backfill lifecycle fields for pre-existing history rows so they stay valid.
update public.workflow_runs
   set started_at   = coalesce(started_at, created_at, completed_at),
       current_step = coalesce(current_step, 'completed')
 where started_at is null
    or current_step is null;

-- Idempotency key: one row per run_key.
create unique index if not exists workflow_runs_run_key_key
  on public.workflow_runs (run_key);

-- Query indexes for load + monitoring.
create index if not exists workflow_runs_user_id_idx        on public.workflow_runs (user_id);
create index if not exists workflow_runs_status_idx         on public.workflow_runs (status);
create index if not exists workflow_runs_mode_idx           on public.workflow_runs (mode);
create index if not exists workflow_runs_created_at_idx     on public.workflow_runs (created_at desc);
create index if not exists workflow_runs_current_step_idx   on public.workflow_runs (current_step);
create index if not exists workflow_runs_user_completed_idx on public.workflow_runs (user_id, completed_at desc);

-- Keep updated_at fresh on every UPDATE.
drop trigger if exists workflow_runs_updated_at on public.workflow_runs;
create trigger workflow_runs_updated_at
  before update on public.workflow_runs
  for each row execute procedure public.handle_updated_at();

-- -------------------------------------------------------------
-- 2) workflow_events — append-only observable event log
-- -------------------------------------------------------------
create table if not exists public.workflow_events (
  id          uuid primary key default gen_random_uuid(),
  run_id      uuid not null references public.workflow_runs (id) on delete cascade,
  user_id     uuid not null references auth.users (id) on delete cascade,
  mode        text not null default 'production',
  step        text,
  status      text,
  progress    integer,
  message     text,
  duration_ms integer,
  metadata    jsonb not null default '{}',
  created_at  timestamptz not null default now()
);

do $$ begin
  alter table public.workflow_events
    add constraint workflow_events_mode_check check (mode in ('production','stress','demo'));
exception when duplicate_object then null; end $$;

do $$ begin
  alter table public.workflow_events
    add constraint workflow_events_progress_check
    check (progress is null or progress between 0 and 100);
exception when duplicate_object then null; end $$;

alter table public.workflow_events enable row level security;

-- Append-only for authenticated users: SELECT + INSERT for own rows only.
-- No UPDATE / DELETE policies — with RLS enabled and no matching policy, those
-- operations are denied, so events cannot be modified or removed by clients.
-- Drop-then-create = re-runnable.
drop policy if exists "workflow_events: select own" on public.workflow_events;
create policy "workflow_events: select own"
  on public.workflow_events for select
  using (auth.uid() = user_id);

drop policy if exists "workflow_events: insert own" on public.workflow_events;
create policy "workflow_events: insert own"
  on public.workflow_events for insert
  with check (auth.uid() = user_id);

-- Explicitly remove any UPDATE/DELETE policies from earlier runs; do NOT
-- recreate them, keeping the event log append-only.
drop policy if exists "workflow_events: update own" on public.workflow_events;
drop policy if exists "workflow_events: delete own" on public.workflow_events;

create index if not exists workflow_events_run_id_idx     on public.workflow_events (run_id);
create index if not exists workflow_events_user_id_idx    on public.workflow_events (user_id);
create index if not exists workflow_events_mode_idx       on public.workflow_events (mode);
create index if not exists workflow_events_status_idx     on public.workflow_events (status);
create index if not exists workflow_events_step_idx       on public.workflow_events (step);
create index if not exists workflow_events_created_at_idx on public.workflow_events (created_at desc);

commit;
