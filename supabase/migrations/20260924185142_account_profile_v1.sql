create table public.pull_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null check (
    display_name = btrim(display_name)
    and char_length(display_name) between 1 and 40
  ),
  birthday date not null check (birthday <= current_date),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.pull_profiles enable row level security;

create policy pull_profiles_owner_select
on public.pull_profiles
for select
to authenticated
using ((select auth.uid()) = user_id);

create policy pull_profiles_owner_insert
on public.pull_profiles
for insert
to authenticated
with check ((select auth.uid()) = user_id);

create policy pull_profiles_owner_update
on public.pull_profiles
for update
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

grant select, insert, update on table public.pull_profiles to authenticated;
revoke all on table public.pull_profiles from anon;
