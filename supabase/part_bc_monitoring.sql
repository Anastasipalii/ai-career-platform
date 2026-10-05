-- =============================================================
-- CareerAI — Part B/C: load-test simulation + admin monitoring
-- -------------------------------------------------------------
-- ADDITIVE and BACKWARD-COMPATIBLE. Only ADDS columns / functions /
-- policies / indexes. It never drops or renames anything, so the
-- existing single-user workflow, saved runs and Dashboard keep
-- working unchanged. Safe to re-run (IF NOT EXISTS / guarded catch).
--
-- APPLY ORDER (manually — do NOT auto-run against production):
--   1) phase1_workflow_lifecycle.sql   2) THIS FILE
--   Supabase → SQL Editor → paste → Run. Review on staging first.
--
-- WHY NO `profiles` DEPENDENCY:
--   The production database does NOT have public.profiles — the repo's
--   migrations.sql (which would create it via an auth.users signup trigger)
--   was never applied there, and the app treats profiles as OPTIONAL
--   (Dashboard reads it with .maybeSingle() and falls back to the auth.users
--   email). The canonical user store is auth.users; every feature table FKs to
--   it. So admin gating here is keyed on auth.users via a small allow-list
--   table (public.app_admins) — a permission mapping, NOT a duplicate user
--   table, and it stores no PII. Any interaction with profiles is guarded by a
--   to_regclass existence check so this migration runs whether or not profiles
--   happens to exist in a given environment.
--
-- Design notes (no field is duplicated under a new name):
--   * current_step  == the run's current STAGE (reused, not renamed).
--   * mode          == execution context ('production' | 'stress' | 'demo').
--   * is_simulation == GENERATED from mode (mode <> 'production'); it is the
--                      explicit, indexable "synthetic run" marker and is never
--                      set directly, so it can never disagree with mode.
--   * profession / resume_language are denormalized projections of analysis
--                      jsonb, added for fast monitoring filters/aggregates.
-- =============================================================

begin;

-- -------------------------------------------------------------
-- 1) Admin model — auth.users-based allow-list (no profiles dependency)
-- -------------------------------------------------------------
-- A role/permission mapping keyed on auth.users. This is NOT a user table:
-- it holds only the ids of users who are admins, plus a timestamp. No email,
-- name, or other PII. Membership is managed by a trusted operator (SQL editor
-- / service role), never by end users.
create table if not exists public.app_admins (
  user_id    uuid primary key references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table public.app_admins enable row level security;

-- Trusted server-side admin check. SECURITY DEFINER so it can read the
-- allow-list regardless of the caller's RLS; STABLE so it is usable inside
-- policies. Never trusts client-supplied input.
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.app_admins where user_id = auth.uid()
  );
$$;

-- The allow-list is readable only by admins; there is deliberately NO
-- INSERT/UPDATE/DELETE policy, so it can never be modified from the client.
drop policy if exists "app_admins: admin select" on public.app_admins;
create policy "app_admins: admin select"
  on public.app_admins for select
  using (public.is_admin());

-- OPTIONAL: if a profiles table exists in this environment, let admins read it
-- for run attribution in monitoring. Guarded with to_regclass so the migration
-- NEVER fails when profiles is absent (as in production).
do $$ begin
  if to_regclass('public.profiles') is not null then
    execute 'drop policy if exists "profiles: admin select all" on public.profiles';
    execute 'create policy "profiles: admin select all" on public.profiles for select using (public.is_admin())';
  end if;
end $$;

-- -------------------------------------------------------------
-- 2) workflow_runs — monitoring + simulation columns (additive)
-- -------------------------------------------------------------
alter table public.workflow_runs add column if not exists profession         text;
alter table public.workflow_runs add column if not exists resume_language     text;
alter table public.workflow_runs add column if not exists duration_ms         integer;
alter table public.workflow_runs add column if not exists jobs_found          integer;
alter table public.workflow_runs add column if not exists retry_count         integer not null default 0;
alter table public.workflow_runs add column if not exists simulation_user_id  text;
alter table public.workflow_runs add column if not exists is_simulation       boolean
  generated always as (mode <> 'production') stored;

do $$ begin
  alter table public.workflow_runs
    add constraint workflow_runs_retry_count_check check (retry_count >= 0);
exception when duplicate_object then null; end $$;

do $$ begin
  alter table public.workflow_runs
    add constraint workflow_runs_jobs_found_check check (jobs_found is null or jobs_found >= 0);
exception when duplicate_object then null; end $$;

do $$ begin
  alter table public.workflow_runs
    add constraint workflow_runs_duration_ms_check check (duration_ms is null or duration_ms >= 0);
exception when duplicate_object then null; end $$;

create index if not exists workflow_runs_is_simulation_idx      on public.workflow_runs (is_simulation);
create index if not exists workflow_runs_simulation_user_idx    on public.workflow_runs (simulation_user_id);
create index if not exists workflow_runs_status_created_idx     on public.workflow_runs (status, created_at desc);
create index if not exists workflow_runs_profession_idx         on public.workflow_runs (profession);

-- Admin can read ALL runs (owner policy from phase1 still applies for users).
drop policy if exists "workflow_runs: admin select all" on public.workflow_runs;
create policy "workflow_runs: admin select all"
  on public.workflow_runs for select
  using (public.is_admin());

-- -------------------------------------------------------------
-- 3) workflow_events — stage timeline columns (additive)
-- -------------------------------------------------------------
alter table public.workflow_events add column if not exists started_at    timestamptz;
alter table public.workflow_events add column if not exists completed_at  timestamptz;
alter table public.workflow_events add column if not exists error_code    text;
alter table public.workflow_events add column if not exists error_message text;
alter table public.workflow_events add column if not exists is_simulation boolean
  generated always as (mode <> 'production') stored;

create index if not exists workflow_events_is_simulation_idx on public.workflow_events (is_simulation);
create index if not exists workflow_events_run_created_idx   on public.workflow_events (run_id, created_at);

-- Admin can read ALL events (owner SELECT policy from phase1 still applies).
-- workflow_events stays append-only: no UPDATE/DELETE policies are added.
drop policy if exists "workflow_events: admin select all" on public.workflow_events;
create policy "workflow_events: admin select all"
  on public.workflow_events for select
  using (public.is_admin());

commit;

-- -------------------------------------------------------------
-- To grant yourself admin (run once, manually, with your user id):
--   insert into public.app_admins (user_id) values ('<your-auth-uid>')
--   on conflict (user_id) do nothing;
-- (Find your id: select id from auth.users where email = 'you@example.com';)
-- -------------------------------------------------------------
