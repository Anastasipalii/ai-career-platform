-- =============================================================
-- CareerAI — Supabase Database Migration
-- Run this in: Supabase → SQL Editor → New query → Run
-- =============================================================


-- =============================================================
-- UTILITY: updated_at auto-update trigger function
-- =============================================================

create or replace function public.handle_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;


-- =============================================================
-- 1. PROFILES
-- One row per auth user, auto-created on signup via trigger.
-- =============================================================

create table if not exists public.profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  email       text,
  full_name   text,
  avatar_url  text,
  created_at  timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "profiles: select own"
  on public.profiles for select
  using (auth.uid() = id);

create policy "profiles: insert own"
  on public.profiles for insert
  with check (auth.uid() = id);

create policy "profiles: update own"
  on public.profiles for update
  using (auth.uid() = id);

create policy "profiles: delete own"
  on public.profiles for delete
  using (auth.uid() = id);

-- Auto-create a profile row when a new user signs up
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name, avatar_url)
  values (
    new.id,
    new.email,
    new.raw_user_meta_data ->> 'full_name',
    new.raw_user_meta_data ->> 'avatar_url'
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();


-- =============================================================
-- 2. RESUMES
-- =============================================================

create table if not exists public.resumes (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users (id) on delete cascade,
  title         text not null,
  language      text not null default 'English (US)',
  template_name text,
  content       jsonb not null default '{}',
  ats_score     integer check (ats_score between 0 and 100),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

alter table public.resumes enable row level security;

create policy "resumes: select own"
  on public.resumes for select
  using (auth.uid() = user_id);

create policy "resumes: insert own"
  on public.resumes for insert
  with check (auth.uid() = user_id);

create policy "resumes: update own"
  on public.resumes for update
  using (auth.uid() = user_id);

create policy "resumes: delete own"
  on public.resumes for delete
  using (auth.uid() = user_id);

drop trigger if exists resumes_updated_at on public.resumes;
create trigger resumes_updated_at
  before update on public.resumes
  for each row execute procedure public.handle_updated_at();


-- =============================================================
-- 3. COVER LETTERS
-- =============================================================

create table if not exists public.cover_letters (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users (id) on delete cascade,
  company_name text not null,
  job_title    text not null,
  language     text not null default 'English (US)',
  content      text not null default '',
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

alter table public.cover_letters enable row level security;

create policy "cover_letters: select own"
  on public.cover_letters for select
  using (auth.uid() = user_id);

create policy "cover_letters: insert own"
  on public.cover_letters for insert
  with check (auth.uid() = user_id);

create policy "cover_letters: update own"
  on public.cover_letters for update
  using (auth.uid() = user_id);

create policy "cover_letters: delete own"
  on public.cover_letters for delete
  using (auth.uid() = user_id);

drop trigger if exists cover_letters_updated_at on public.cover_letters;
create trigger cover_letters_updated_at
  before update on public.cover_letters
  for each row execute procedure public.handle_updated_at();


-- =============================================================
-- 4. TRANSLATIONS
-- =============================================================

create table if not exists public.translations (
  id                 uuid primary key default gen_random_uuid(),
  user_id            uuid not null references auth.users (id) on delete cascade,
  source_language    text not null,
  target_language    text not null,
  original_content   text not null default '',
  translated_content text not null default '',
  created_at         timestamptz not null default now()
);

alter table public.translations enable row level security;

create policy "translations: select own"
  on public.translations for select
  using (auth.uid() = user_id);

create policy "translations: insert own"
  on public.translations for insert
  with check (auth.uid() = user_id);

create policy "translations: update own"
  on public.translations for update
  using (auth.uid() = user_id);

create policy "translations: delete own"
  on public.translations for delete
  using (auth.uid() = user_id);


-- =============================================================
-- 5. LINKEDIN PROFILES
-- =============================================================

create table if not exists public.linkedin_profiles (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null references auth.users (id) on delete cascade,
  headline          text,
  about             text,
  skills            jsonb not null default '[]',
  optimized_content jsonb not null default '{}',
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

alter table public.linkedin_profiles enable row level security;

create policy "linkedin_profiles: select own"
  on public.linkedin_profiles for select
  using (auth.uid() = user_id);

create policy "linkedin_profiles: insert own"
  on public.linkedin_profiles for insert
  with check (auth.uid() = user_id);

create policy "linkedin_profiles: update own"
  on public.linkedin_profiles for update
  using (auth.uid() = user_id);

create policy "linkedin_profiles: delete own"
  on public.linkedin_profiles for delete
  using (auth.uid() = user_id);

drop trigger if exists linkedin_profiles_updated_at on public.linkedin_profiles;
create trigger linkedin_profiles_updated_at
  before update on public.linkedin_profiles
  for each row execute procedure public.handle_updated_at();


-- =============================================================
-- 6. INTERVIEW SESSIONS
-- =============================================================

create table if not exists public.interview_sessions (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references auth.users (id) on delete cascade,
  job_title      text,
  interview_type text not null,
  language       text not null default 'English (US)',
  score          integer check (score between 0 and 100),
  feedback       jsonb not null default '{}',
  created_at     timestamptz not null default now()
);

alter table public.interview_sessions enable row level security;

create policy "interview_sessions: select own"
  on public.interview_sessions for select
  using (auth.uid() = user_id);

create policy "interview_sessions: insert own"
  on public.interview_sessions for insert
  with check (auth.uid() = user_id);

create policy "interview_sessions: update own"
  on public.interview_sessions for update
  using (auth.uid() = user_id);

create policy "interview_sessions: delete own"
  on public.interview_sessions for delete
  using (auth.uid() = user_id);


-- =============================================================
-- 7. JOB MATCHES
-- =============================================================

create table if not exists public.job_matches (
  id                   uuid primary key default gen_random_uuid(),
  user_id              uuid not null references auth.users (id) on delete cascade,
  job_title            text not null,
  company_name         text,
  match_score          integer check (match_score between 0 and 100),
  missing_skills       jsonb not null default '[]',
  recommended_keywords jsonb not null default '[]',
  created_at           timestamptz not null default now()
);

alter table public.job_matches enable row level security;

create policy "job_matches: select own"
  on public.job_matches for select
  using (auth.uid() = user_id);

create policy "job_matches: insert own"
  on public.job_matches for insert
  with check (auth.uid() = user_id);

create policy "job_matches: update own"
  on public.job_matches for update
  using (auth.uid() = user_id);

create policy "job_matches: delete own"
  on public.job_matches for delete
  using (auth.uid() = user_id);


-- =============================================================
-- 8. CAREER PATHS
-- =============================================================

create table if not exists public.career_paths (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users (id) on delete cascade,
  current_role text not null,
  target_role  text not null,
  roadmap      jsonb not null default '{}',
  progress     integer not null default 0 check (progress between 0 and 100),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

alter table public.career_paths enable row level security;

create policy "career_paths: select own"
  on public.career_paths for select
  using (auth.uid() = user_id);

create policy "career_paths: insert own"
  on public.career_paths for insert
  with check (auth.uid() = user_id);

create policy "career_paths: update own"
  on public.career_paths for update
  using (auth.uid() = user_id);

create policy "career_paths: delete own"
  on public.career_paths for delete
  using (auth.uid() = user_id);

drop trigger if exists career_paths_updated_at on public.career_paths;
create trigger career_paths_updated_at
  before update on public.career_paths
  for each row execute procedure public.handle_updated_at();
