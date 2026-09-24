create extension if not exists pgcrypto;

create table public.pull_worlds (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  schema_version integer not null default 1 check (schema_version = 1),
  revision bigint not null default 0 check (revision >= 0),
  last_simulated_at timestamptz not null default now(),
  simulation_revision bigint not null default 0 check (simulation_revision >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.pull_world_states (
  world_id uuid primary key references public.pull_worlds(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  state jsonb not null default '{}'::jsonb,
  overrides jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create table public.pull_morus (
  id uuid primary key default gen_random_uuid(),
  world_id uuid not null unique references public.pull_worlds(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  state_version integer not null default 7 check (state_version >= 1),
  semantic_state jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.pull_moru_intelligence (
  moru_id uuid primary key references public.pull_morus(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  preferences jsonb not null default '{}'::jsonb,
  familiarity jsonb not null default '{}'::jsonb,
  experience_sequence bigint not null default 0 check (experience_sequence >= 0),
  updated_at timestamptz not null default now()
);

create table public.pull_experiences (
  moru_id uuid not null references public.pull_morus(id) on delete cascade,
  id text not null check (length(id) between 1 and 120),
  user_id uuid not null references auth.users(id) on delete cascade,
  occurred_at timestamptz not null,
  payload jsonb not null,
  created_at timestamptz not null default now(),
  primary key (moru_id, id)
);

create table public.pull_memories (
  moru_id uuid not null references public.pull_morus(id) on delete cascade,
  id text not null check (length(id) between 1 and 120),
  experience_id text not null check (length(experience_id) between 1 and 120),
  user_id uuid not null references auth.users(id) on delete cascade,
  occurred_at timestamptz not null,
  payload jsonb not null,
  created_at timestamptz not null default now(),
  primary key (moru_id, id)
);

create index pull_experiences_user_time on public.pull_experiences(user_id, occurred_at desc);
create index pull_memories_user_time on public.pull_memories(user_id, occurred_at desc);

alter table public.pull_worlds enable row level security;
alter table public.pull_world_states enable row level security;
alter table public.pull_morus enable row level security;
alter table public.pull_moru_intelligence enable row level security;
alter table public.pull_experiences enable row level security;
alter table public.pull_memories enable row level security;

create policy pull_worlds_owner_all on public.pull_worlds for all to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy pull_world_states_owner_all on public.pull_world_states for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id and exists (
    select 1 from public.pull_worlds owner where owner.id = world_id and owner.user_id = (select auth.uid())
  ));
create policy pull_morus_owner_all on public.pull_morus for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id and exists (
    select 1 from public.pull_worlds owner where owner.id = world_id and owner.user_id = (select auth.uid())
  ));
create policy pull_moru_intelligence_owner_all on public.pull_moru_intelligence for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id and exists (
    select 1 from public.pull_morus owner where owner.id = moru_id and owner.user_id = (select auth.uid())
  ));
create policy pull_experiences_owner_all on public.pull_experiences for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id and exists (
    select 1 from public.pull_morus owner where owner.id = moru_id and owner.user_id = (select auth.uid())
  ));
create policy pull_memories_owner_all on public.pull_memories for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id and exists (
    select 1 from public.pull_morus owner where owner.id = moru_id and owner.user_id = (select auth.uid())
  ));

grant select, insert, update, delete on public.pull_worlds, public.pull_world_states, public.pull_morus,
  public.pull_moru_intelligence, public.pull_experiences, public.pull_memories to authenticated;
revoke all on public.pull_worlds, public.pull_world_states, public.pull_morus,
  public.pull_moru_intelligence, public.pull_experiences, public.pull_memories from anon;

create or replace function public.pull_bootstrap_world(
  p_world_id uuid,
  p_moru_id uuid,
  p_world_state jsonb,
  p_world_overrides jsonb,
  p_moru_state jsonb,
  p_preferences jsonb,
  p_familiarity jsonb,
  p_experience_sequence bigint,
  p_last_simulated_at timestamptz
) returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare v_user uuid := (select auth.uid());
begin
  if v_user is null then raise exception 'authentication required' using errcode = '42501'; end if;
  insert into public.pull_worlds(id,user_id,last_simulated_at) values(p_world_id,v_user,p_last_simulated_at);
  insert into public.pull_world_states(world_id,user_id,state,overrides) values(p_world_id,v_user,p_world_state,p_world_overrides);
  insert into public.pull_morus(id,world_id,user_id,state_version,semantic_state) values(p_moru_id,p_world_id,v_user,7,p_moru_state);
  insert into public.pull_moru_intelligence(moru_id,user_id,preferences,familiarity,experience_sequence)
    values(p_moru_id,v_user,p_preferences,p_familiarity,greatest(0,p_experience_sequence));
  return jsonb_build_object('worldId',p_world_id,'moruId',p_moru_id,'revision',0,'simulationRevision',0,'serverUpdatedAt',now());
end;
$$;

revoke all on function public.pull_bootstrap_world(uuid,uuid,jsonb,jsonb,jsonb,jsonb,jsonb,bigint,timestamptz) from public, anon;
grant execute on function public.pull_bootstrap_world(uuid,uuid,jsonb,jsonb,jsonb,jsonb,jsonb,bigint,timestamptz) to authenticated;

create or replace function public.pull_sync_state(
  p_world_id uuid,
  p_moru_id uuid,
  p_expected_revision bigint,
  p_world_state jsonb,
  p_world_overrides jsonb,
  p_moru_state jsonb,
  p_preferences jsonb,
  p_familiarity jsonb,
  p_experience_sequence bigint,
  p_experiences jsonb,
  p_memories jsonb,
  p_last_simulated_at timestamptz,
  p_expected_simulation_revision bigint
) returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_user uuid := (select auth.uid());
  v_revision bigint;
  v_simulation_revision bigint;
  v_item jsonb;
  v_advances_simulation boolean;
begin
  if v_user is null then raise exception 'authentication required' using errcode = '42501'; end if;
  select revision, simulation_revision into v_revision, v_simulation_revision
    from public.pull_worlds where id = p_world_id and user_id = v_user for update;
  if not found then raise exception 'world ownership mismatch' using errcode = '42501'; end if;
  if not exists (select 1 from public.pull_morus where id = p_moru_id and world_id = p_world_id and user_id = v_user) then
    raise exception 'moru ownership mismatch' using errcode = '42501';
  end if;
  if v_revision <> p_expected_revision or v_simulation_revision <> p_expected_simulation_revision then
    return jsonb_build_object('status','conflict','revision',v_revision,'simulationRevision',v_simulation_revision);
  end if;

  select p_last_simulated_at > last_simulated_at into v_advances_simulation from public.pull_worlds where id=p_world_id;

  update public.pull_worlds set revision = revision + 1,
    simulation_revision = simulation_revision + case when v_advances_simulation then 1 else 0 end,
    last_simulated_at = greatest(last_simulated_at, p_last_simulated_at), updated_at = now()
    where id = p_world_id;
  insert into public.pull_world_states(world_id,user_id,state,overrides)
    values(p_world_id,v_user,p_world_state,p_world_overrides)
    on conflict(world_id) do update set state=excluded.state,overrides=excluded.overrides,updated_at=now();
  update public.pull_morus set semantic_state=p_moru_state,state_version=7,updated_at=now() where id=p_moru_id;
  insert into public.pull_moru_intelligence(moru_id,user_id,preferences,familiarity,experience_sequence)
    values(p_moru_id,v_user,p_preferences,p_familiarity,greatest(0,p_experience_sequence))
    on conflict(moru_id) do update set preferences=excluded.preferences,familiarity=excluded.familiarity,
      experience_sequence=excluded.experience_sequence,updated_at=now();

  for v_item in select value from jsonb_array_elements(coalesce(p_experiences,'[]'::jsonb)) loop
    insert into public.pull_experiences(moru_id,id,user_id,occurred_at,payload)
      values(p_moru_id,v_item->>'id',v_user,(v_item->>'timestamp')::timestamptz,v_item)
      on conflict(moru_id,id) do nothing;
  end loop;
  for v_item in select value from jsonb_array_elements(coalesce(p_memories,'[]'::jsonb)) loop
    insert into public.pull_memories(moru_id,id,experience_id,user_id,occurred_at,payload)
      values(p_moru_id,v_item->>'id',v_item->>'experienceId',v_user,(v_item->>'timestamp')::timestamptz,v_item)
      on conflict(moru_id,id) do nothing;
  end loop;
  return jsonb_build_object('status','synced','revision',v_revision+1,
    'simulationRevision',v_simulation_revision + case when v_advances_simulation then 1 else 0 end,
    'serverUpdatedAt',now());
end;
$$;

revoke all on function public.pull_sync_state(uuid,uuid,bigint,jsonb,jsonb,jsonb,jsonb,jsonb,bigint,jsonb,jsonb,timestamptz,bigint) from public, anon;
grant execute on function public.pull_sync_state(uuid,uuid,bigint,jsonb,jsonb,jsonb,jsonb,jsonb,bigint,jsonb,jsonb,timestamptz,bigint) to authenticated;
