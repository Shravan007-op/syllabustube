-- 001_init.sql
-- SyllabusTube Supabase Schema: profiles, syllabi, user_progress with RLS and signup trigger

-- 1. PROFILES TABLE
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  region text,
  languages text[] default array[]::text[],
  preferred_channels text[] default array[]::text[],
  created_at timestamptz not null default now()
);

-- 2. SYLLABI TABLE
create table if not exists public.syllabi (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  subject_code text,
  content_hash text not null,
  structured_json jsonb not null,
  created_at timestamptz not null default now(),
  constraint syllabi_user_id_content_hash_key unique (user_id, content_hash)
);

-- 3. USER_PROGRESS TABLE
create table if not exists public.user_progress (
  user_id uuid not null references auth.users(id) on delete cascade,
  syllabus_id uuid not null references public.syllabi(id) on delete cascade,
  topic_id text not null,
  watched boolean not null default false,
  primary key (user_id, syllabus_id, topic_id)
);

-- 4. ENABLE ROW LEVEL SECURITY
alter table public.profiles enable row level security;
alter table public.syllabi enable row level security;
alter table public.user_progress enable row level security;

-- 5. RLS POLICIES FOR PROFILES (auth.uid() = id)
create policy "Users can view their own profile"
  on public.profiles for select
  using (auth.uid() = id);

create policy "Users can insert their own profile"
  on public.profiles for insert
  with check (auth.uid() = id);

create policy "Users can update their own profile"
  on public.profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

create policy "Users can delete their own profile"
  on public.profiles for delete
  using (auth.uid() = id);

-- 6. RLS POLICIES FOR SYLLABI (auth.uid() = user_id)
create policy "Users can view their own syllabi"
  on public.syllabi for select
  using (auth.uid() = user_id);

create policy "Users can insert their own syllabi"
  on public.syllabi for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own syllabi"
  on public.syllabi for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can delete their own syllabi"
  on public.syllabi for delete
  using (auth.uid() = user_id);

-- 7. RLS POLICIES FOR USER_PROGRESS (auth.uid() = user_id)
create policy "Users can view their own progress"
  on public.user_progress for select
  using (auth.uid() = user_id);

create policy "Users can insert their own progress"
  on public.user_progress for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own progress"
  on public.user_progress for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- In Postgres/Supabase, upserts require both select/update permissions or delete policy
create policy "Users can delete their own progress"
  on public.user_progress for delete
  using (auth.uid() = user_id);

-- 8. TRIGGER FOR AUTO-CREATING PROFILE ON USER SIGNUP
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id)
  values (new.id)
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
