-- =============================================================
-- CareerAI — Part A: DRY-RUN application preparation persistence
-- -------------------------------------------------------------
-- ADDITIVE and BACKWARD-COMPATIBLE. Creates two NEW tables only; it never
-- touches existing tables, columns, or policies. Safe to re-run.
--
-- APPLY ORDER (manually — do NOT auto-run against production):
--   1) phase1_workflow_lifecycle.sql  2) part_bc_monitoring.sql  3) THIS FILE
--   (needs public.is_admin() from part_bc for the admin read policies.)
--
-- SAFETY: every row is a DRY RUN. `is_dry_run` defaults true AND is constrained
-- to be true, so a real submission can never be recorded here. These tables
-- store ONLY safe metadata — no résumé text, cover-letter text, prompts, secrets
-- or PII. Nothing in this schema can send an application anywhere.
-- =============================================================

begin;

-- -------------------------------------------------------------
-- 1) application_runs — one row per prepared (dry-run) application
-- -------------------------------------------------------------
create table if not exists public.application_runs (
  id                uuid primary key default gen_random_uuid(),
  application_run_key uuid not null default gen_random_uuid(),
  user_id           uuid not null references auth.users (id) on delete cascade,
  -- the workflow run this application derives from (run_key), if any
  workflow_run_id   text,
  job_id            text,
  job_title         text,
  company           text,
  provider          text,
  external_url      text,
  status            text not null default 'running',
  current_step      text,
  progress          integer not null default 0,
  -- always true; a non-dry-run row is impossible
  is_dry_run        boolean not null default true,
  validation_result jsonb not null default '{}',
  started_at        timestamptz,
  completed_at      timestamptz,
  duration_ms       integer,
  created_at        timestamptz not null default now()
);

do $$ begin
  alter table public.application_runs
    add constraint application_runs_is_dry_run_true check (is_dry_run = true);
exception when duplicate_object then null; end $$;

do $$ begin
  alter table public.application_runs
    add constraint application_runs_status_check
    check (status in ('queued','running','completed','failed'));
exception when duplicate_object then null; end $$;

do $$ begin
  alter table public.application_runs
    add constraint application_runs_progress_check check (progress between 0 and 100);
exception when duplicate_object then null; end $$;

create unique index if not exists application_runs_run_key_key on public.application_runs (application_run_key);
create index if not exists application_runs_user_idx        on public.application_runs (user_id, created_at desc);
create index if not exists application_runs_status_idx      on public.application_runs (status, created_at desc);

alter table public.application_runs enable row level security;

drop policy if exists "application_runs: select own" on public.application_runs;
create policy "application_runs: select own"
  on public.application_runs for select using (auth.uid() = user_id);

drop policy if exists "application_runs: insert own" on public.application_runs;
create policy "application_runs: insert own"
  on public.application_runs for insert with check (auth.uid() = user_id and is_dry_run = true);

drop policy if exists "application_runs: update own" on public.application_runs;
create policy "application_runs: update own"
  on public.application_runs for update using (auth.uid() = user_id);

-- Admins can read all (reuses is_admin() from part_bc_monitoring.sql).
do $$ begin
  if to_regprocedure('public.is_admin()') is not null then
    drop policy if exists "application_runs: admin select all" on public.application_runs;
    create policy "application_runs: admin select all"
      on public.application_runs for select using (public.is_admin());
  end if;
end $$;

-- -------------------------------------------------------------
-- 2) application_events — append-only safe stage timeline
-- -------------------------------------------------------------
create table if not exists public.application_events (
  id           uuid primary key default gen_random_uuid(),
  run_id       uuid not null references public.application_runs (id) on delete cascade,
  user_id      uuid not null references auth.users (id) on delete cascade,
  mode         text not null default 'dry_run',
  stage        text,
  status       text,
  progress     integer,
  duration_ms  integer,
  started_at   timestamptz,
  completed_at timestamptz,
  is_dry_run   boolean not null default true,
  created_at   timestamptz not null default now()
);

do $$ begin
  alter table public.application_events
    add constraint application_events_is_dry_run_true check (is_dry_run = true);
exception when duplicate_object then null; end $$;

do $$ begin
  alter table public.application_events
    add constraint application_events_mode_check check (mode = 'dry_run');
exception when duplicate_object then null; end $$;

create index if not exists application_events_run_created_idx on public.application_events (run_id, created_at);
create index if not exists application_events_user_idx        on public.application_events (user_id);

alter table public.application_events enable row level security;

-- Append-only for users: SELECT + INSERT own only; no UPDATE/DELETE policy.
drop policy if exists "application_events: select own" on public.application_events;
create policy "application_events: select own"
  on public.application_events for select using (auth.uid() = user_id);

drop policy if exists "application_events: insert own" on public.application_events;
create policy "application_events: insert own"
  on public.application_events for insert with check (auth.uid() = user_id and is_dry_run = true);

drop policy if exists "application_events: update own" on public.application_events;
drop policy if exists "application_events: delete own" on public.application_events;

do $$ begin
  if to_regprocedure('public.is_admin()') is not null then
    drop policy if exists "application_events: admin select all" on public.application_events;
    create policy "application_events: admin select all"
      on public.application_events for select using (public.is_admin());
  end if;
end $$;

commit;
