create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  display_name text,
  role text not null default 'learner' check (role in ('learner', 'admin')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.question_progress (
  user_id uuid not null references public.profiles(id) on delete cascade,
  question_id integer not null check (question_id between 1 and 150),
  seen_count integer not null default 0 check (seen_count >= 0),
  correct_count integer not null default 0 check (correct_count >= 0),
  wrong_count integer not null default 0 check (wrong_count >= 0),
  streak integer not null default 0 check (streak >= 0),
  mastery integer not null default 0 check (mastery between 0 and 5),
  last_seen_at timestamptz,
  next_due_at timestamptz,
  last_result text check (last_result in ('correct', 'wrong')),
  last_response_ms integer check (last_response_ms is null or last_response_ms >= 0),
  marked_unsure boolean not null default false,
  updated_at timestamptz not null default now(),
  primary key (user_id, question_id)
);

create table if not exists public.mock_attempts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  profile_name text not null,
  score integer not null check (score >= 0),
  total integer not null check (total > 0),
  answers jsonb not null default '[]'::jsonb,
  started_at timestamptz not null,
  finished_at timestamptz not null,
  created_at timestamptz not null default now()
);

create table if not exists public.exam_profiles (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  question_count integer not null check (question_count between 1 and 150),
  duration_minutes integer not null check (duration_minutes > 0),
  pass_score integer,
  critical_rule text not null default 'unverified'
    check (critical_rule in ('unverified', 'none', 'must-correct')),
  active boolean not null default false,
  updated_at timestamptz not null default now()
);

create index if not exists question_progress_due_idx
  on public.question_progress(user_id, next_due_at);
create index if not exists question_progress_mastery_idx
  on public.question_progress(user_id, mastery);
create index if not exists mock_attempts_user_finished_idx
  on public.mock_attempts(user_id, finished_at desc);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email, display_name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'display_name', split_part(new.email, '@', 1))
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$$;

revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to authenticated;

alter table public.profiles enable row level security;
alter table public.question_progress enable row level security;
alter table public.mock_attempts enable row level security;
alter table public.exam_profiles enable row level security;

create policy "profiles_read_own_or_admin"
  on public.profiles for select to authenticated
  using (id = auth.uid() or public.is_admin());

create policy "profiles_update_own_learner_fields"
  on public.profiles for update to authenticated
  using (id = auth.uid())
  with check (id = auth.uid() and role = 'learner');

create policy "progress_read_own_or_admin"
  on public.question_progress for select to authenticated
  using (user_id = auth.uid() or public.is_admin());

create policy "progress_insert_own"
  on public.question_progress for insert to authenticated
  with check (user_id = auth.uid());

create policy "progress_update_own"
  on public.question_progress for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "attempts_read_own_or_admin"
  on public.mock_attempts for select to authenticated
  using (user_id = auth.uid() or public.is_admin());

create policy "attempts_insert_own"
  on public.mock_attempts for insert to authenticated
  with check (user_id = auth.uid());

create policy "attempts_update_own"
  on public.mock_attempts for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "exam_profiles_read_authenticated"
  on public.exam_profiles for select to authenticated
  using (true);

create policy "exam_profiles_admin_all"
  on public.exam_profiles for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create or replace view public.admin_user_progress_summary
with (security_invoker = true)
as
select
  p.id as user_id,
  p.email,
  p.display_name,
  count(q.question_id) filter (where q.seen_count > 0)::integer as seen_questions,
  count(q.question_id) filter (where q.mastery >= 3)::integer as mastered_questions,
  count(q.question_id) filter (
    where q.question_id = any(array[16, 27, 31, 32, 56, 58]) and q.mastery >= 3
  )::integer as critical_mastered,
  max(q.last_seen_at) as last_active_at
from public.profiles p
left join public.question_progress q on q.user_id = p.id
where p.role = 'learner'
group by p.id, p.email, p.display_name;

grant select on public.admin_user_progress_summary to authenticated;

insert into public.exam_profiles (
  name, question_count, duration_minutes, pass_score, critical_rule, active
)
select 'Thi thử tự đánh giá', 30, 20, null, 'unverified', true
where not exists (select 1 from public.exam_profiles);
