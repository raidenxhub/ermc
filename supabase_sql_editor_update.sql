-- SQL Editor: Idempotent update script for ERMC / Khaleej-web
-- Safe to run multiple times.

create extension if not exists pgcrypto;

-- EVENTS
create table if not exists public.events (
  id uuid default gen_random_uuid() primary key,
  id_bigint text,
  vatsim_id integer unique,
  name text not null,
  short_description text,
  description text,
  banner text,
  link text,
  type text,
  start_time timestamptz not null,
  end_time timestamptz not null,
  airports text,
  routes text,
  status text default 'draft',
  cancelled_at timestamptz,
  delete_at timestamptz,
  vatsim_last_seen_at timestamptz,
  vatsim_missing_count integer not null default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.events enable row level security;
do $$ begin
  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'events' and policyname = 'Events are viewable by everyone'
  ) then
    execute 'create policy "Events are viewable by everyone" on public.events for select using (true)';
  end if;
end $$;

alter table public.events add column if not exists id_bigint text;
alter table public.events add column if not exists vatsim_id integer;
alter table public.events add column if not exists short_description text;
alter table public.events add column if not exists description text;
alter table public.events add column if not exists banner text;
alter table public.events add column if not exists link text;
alter table public.events add column if not exists type text;
alter table public.events add column if not exists airports text;
alter table public.events add column if not exists routes text;
alter table public.events add column if not exists status text;
alter table public.events add column if not exists cancelled_at timestamptz;
alter table public.events add column if not exists delete_at timestamptz;
alter table public.events add column if not exists vatsim_last_seen_at timestamptz;
alter table public.events add column if not exists vatsim_missing_count integer;
alter table public.events alter column vatsim_missing_count set default 0;

create unique index if not exists events_vatsim_id_unique on public.events(vatsim_id) where vatsim_id is not null;

do $$ begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public' and table_name = 'events' and column_name = 'id_bigint'
      and data_type <> 'text'
  ) then
    execute 'alter table public.events alter column id_bigint type text using id_bigint::text';
  end if;
end $$;

update public.events
set id_bigint = vatsim_id::text
where (id_bigint is null or id_bigint = '') and vatsim_id is not null;
update public.events set status = coalesce(status, 'draft') where status is null;

-- PROFILES
create table if not exists public.profiles (
  id uuid references auth.users(id) on delete cascade primary key,
  name text,
  email text unique,
  cid text unique,
  avatar_url text,
  discord_username text,
  rating integer,
  rating_short text,
  rating_long text,
  vatsim_region_id text,
  vatsim_division_id text,
  vatsim_subdivision_id text,
  vatsim_country text,
  vatsim_countystate text,
  region text,
  division text,
  subdivision text,
  role text default 'guest',
  position text,
  ermc_access_granted boolean not null default false,
  ermc_access_verified_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.profiles add column if not exists vatsim_region_id text;
alter table public.profiles add column if not exists vatsim_division_id text;
alter table public.profiles add column if not exists vatsim_subdivision_id text;
alter table public.profiles add column if not exists vatsim_country text;
alter table public.profiles add column if not exists vatsim_countystate text;
alter table public.profiles add column if not exists vatsim_pilotrating text;

alter table public.profiles enable row level security;
do $$ begin
  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'profiles' and policyname = 'Public profiles are viewable by everyone'
  ) then
    execute 'create policy "Public profiles are viewable by everyone" on public.profiles for select using (true)';
  end if;
  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'profiles' and policyname = 'Users can update their own profile'
  ) then
    execute 'create policy "Users can update their own profile" on public.profiles for update using (auth.uid() = id)';
  end if;
end $$;

create or replace function public.prevent_profile_identity_changes()
returns trigger as $$
declare
  requester_role text;
begin
  select role into requester_role from public.profiles where id = auth.uid();
  if requester_role in ('admin', 'staff', 'coordinator') then
    return new;
  end if;

  if old.cid is not null and new.cid is distinct from old.cid then
    raise exception 'CID is locked. Contact support to change it.' using errcode = '42501';
  end if;
  if old.rating is not null and new.rating is distinct from old.rating then
    raise exception 'VATSIM rating is locked. Contact support to change it.' using errcode = '42501';
  end if;
  if old.rating_short is not null and new.rating_short is distinct from old.rating_short then
    raise exception 'VATSIM rating is locked. Contact support to change it.' using errcode = '42501';
  end if;
  if old.rating_long is not null and new.rating_long is distinct from old.rating_long then
    raise exception 'VATSIM rating is locked. Contact support to change it.' using errcode = '42501';
  end if;

  if old.vatsim_region_id is not null and new.vatsim_region_id is distinct from old.vatsim_region_id then
    raise exception 'VATSIM details are locked. Contact support to change them.' using errcode = '42501';
  end if;
  if old.vatsim_division_id is not null and new.vatsim_division_id is distinct from old.vatsim_division_id then
    raise exception 'VATSIM details are locked. Contact support to change them.' using errcode = '42501';
  end if;
  if old.vatsim_subdivision_id is not null and new.vatsim_subdivision_id is distinct from old.vatsim_subdivision_id then
    raise exception 'VATSIM details are locked. Contact support to change them.' using errcode = '42501';
  end if;
  if old.vatsim_country is not null and new.vatsim_country is distinct from old.vatsim_country then
    raise exception 'VATSIM details are locked. Contact support to change them.' using errcode = '42501';
  end if;
  if old.vatsim_countystate is not null and new.vatsim_countystate is distinct from old.vatsim_countystate then
    raise exception 'VATSIM details are locked. Contact support to change them.' using errcode = '42501';
  end if;
  if old.vatsim_pilotrating is not null and new.vatsim_pilotrating is distinct from old.vatsim_pilotrating then
    raise exception 'VATSIM details are locked. Contact support to change them.' using errcode = '42501';
  end if;

  return new;
end;
$$ language plpgsql;

drop trigger if exists prevent_profile_identity_changes_trigger on public.profiles;
create trigger prevent_profile_identity_changes_trigger
before update on public.profiles
for each row
execute procedure public.prevent_profile_identity_changes();

-- ROSTER ENTRIES
create table if not exists public.roster_entries (
  id uuid default gen_random_uuid() primary key,
  event_id uuid references public.events(id) on delete cascade not null,
  event_id_bigint text not null,
  user_id uuid references public.profiles(id),
  position text not null,
  airport text not null,
  start_time timestamptz not null,
  end_time timestamptz not null,
  status text default 'open',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.roster_entries enable row level security;
do $$ begin
  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'roster_entries' and policyname = 'Roster entries are viewable by everyone'
  ) then
    execute 'create policy "Roster entries are viewable by everyone" on public.roster_entries for select using (true)';
  end if;
  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'roster_entries' and policyname = 'Authenticated users can claim open slots'
  ) then
    execute 'create policy "Authenticated users can claim open slots" on public.roster_entries for update using (auth.uid() = user_id or user_id is null)';
  end if;
end $$;

alter table public.roster_entries add column if not exists event_id_bigint text;

do $$ begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public' and table_name = 'roster_entries' and column_name = 'event_id_bigint'
      and data_type <> 'text'
  ) then
    execute 'alter table public.roster_entries alter column event_id_bigint type text using event_id_bigint::text';
  end if;
end $$;

update public.roster_entries as re set event_id_bigint = e.id_bigint
from public.events e
where re.event_id = e.id and (re.event_id_bigint is null or re.event_id_bigint = '');
alter table public.roster_entries alter column event_id_bigint set not null;

delete from public.roster_entries re
using (
  select
    id,
    row_number() over (
      partition by event_id, airport, position, start_time, end_time
      order by created_at asc, id asc
    ) as rn
  from public.roster_entries
) d
where re.id = d.id and d.rn > 1;

create unique index if not exists roster_entries_unique_slot
  on public.roster_entries (event_id, airport, position, start_time, end_time);

-- CLAIMS
create table if not exists public.roster_claims (
  id uuid default gen_random_uuid() primary key,
  roster_entry_id uuid references public.roster_entries(id) on delete cascade not null,
  user_id uuid references public.profiles(id) on delete cascade not null,
  type text check (type in ('primary','standby')) not null,
  created_at timestamptz default now()
);

alter table public.roster_claims enable row level security;
create unique index if not exists roster_claims_primary_unique on public.roster_claims (roster_entry_id) where type = 'primary';
create unique index if not exists roster_claims_standby_user_unique on public.roster_claims (roster_entry_id, user_id) where type = 'standby';

do $$ begin
  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'roster_claims' and policyname = 'Claims are viewable to everyone'
  ) then
    execute 'create policy "Claims are viewable to everyone" on public.roster_claims for select using (true)';
  end if;
  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'roster_claims' and policyname = 'Users can insert their own claims'
  ) then
    execute 'create policy "Users can insert their own claims" on public.roster_claims for insert with check (auth.uid() = user_id)';
  end if;
  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'roster_claims' and policyname = 'Users can delete their own claims'
  ) then
    execute 'create policy "Users can delete their own claims" on public.roster_claims for delete using (auth.uid() = user_id)';
  end if;
end $$;

-- Triggers to sync roster_entries on primary claim insert/delete
create or replace function public.apply_primary_claim()
returns trigger as $$
begin
  if (tg_op = 'INSERT') then
    if (new.type = 'primary') then
      update public.roster_entries
        set user_id = new.user_id, status = 'claimed', updated_at = now()
        where id = new.roster_entry_id and user_id is null;
    end if;
    return new;
  elsif (tg_op = 'DELETE') then
    if (old.type = 'primary') then
      update public.roster_entries
        set user_id = null, status = 'open', updated_at = now()
        where id = old.roster_entry_id and user_id = old.user_id;
    end if;
    return old;
  end if;
  return null;
end;
$$ language plpgsql security definer;

drop trigger if exists roster_primary_claim_insert on public.roster_claims;
create trigger roster_primary_claim_insert
after insert on public.roster_claims
for each row execute procedure public.apply_primary_claim();

drop trigger if exists roster_primary_claim_delete on public.roster_claims;
create trigger roster_primary_claim_delete
after delete on public.roster_claims
for each row execute procedure public.apply_primary_claim();

-- VATSIM deletion suppression
create table if not exists public.vatsim_event_suppressions (
  vatsim_id integer primary key,
  suppressed_at timestamptz default now(),
  suppressed_by uuid references public.profiles(id)
);
alter table public.vatsim_event_suppressions enable row level security;

-- CONTACT REQUESTS (Public form submissions)
create table if not exists public.contact_requests (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  email text not null,
  subject text not null,
  message text not null,
  created_at timestamptz default now()
);

alter table public.contact_requests enable row level security;
do $$ begin
  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'contact_requests' and policyname = 'Anyone can submit contact requests'
  ) then
    execute 'create policy "Anyone can submit contact requests" on public.contact_requests for insert with check (true)';
  end if;
end $$;

-- COORDINATION MESSAGES
create table if not exists public.messages (
  id uuid default gen_random_uuid() primary key,
  event_id uuid references public.events(id) on delete cascade not null,
  user_id uuid references public.profiles(id) on delete cascade not null,
  content text not null,
  created_at timestamptz default now()
);

alter table public.messages enable row level security;
create index if not exists messages_event_id_idx on public.messages(event_id);
create index if not exists messages_created_at_idx on public.messages(created_at);
do $$ begin
  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'messages' and policyname = 'Authenticated users can read coordination messages'
  ) then
    execute 'create policy "Authenticated users can read coordination messages" on public.messages for select using (auth.uid() is not null)';
  end if;
  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'messages' and policyname = 'Users can send their own coordination messages'
  ) then
    execute 'create policy "Users can send their own coordination messages" on public.messages for insert with check (auth.uid() = user_id)';
  end if;
end $$;

-- KNOCKS (User-to-user notifications)
create table if not exists public.knocks (
  id uuid default gen_random_uuid() primary key,
  from_user_id uuid references public.profiles(id) on delete cascade not null,
  to_user_id uuid references public.profiles(id) on delete cascade not null,
  event_id uuid references public.events(id) on delete cascade not null,
  roster_entry_id uuid references public.roster_entries(id) on delete cascade,
  message text,
  created_at timestamptz default now()
);

alter table public.knocks enable row level security;
create index if not exists knocks_to_user_id_idx on public.knocks(to_user_id);
create index if not exists knocks_event_id_idx on public.knocks(event_id);
do $$ begin
  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'knocks' and policyname = 'Users can insert their own knocks'
  ) then
    execute 'create policy "Users can insert their own knocks" on public.knocks for insert with check (auth.uid() = from_user_id)';
  end if;
  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'knocks' and policyname = 'Users can read knocks they are involved in'
  ) then
    execute 'create policy "Users can read knocks they are involved in" on public.knocks for select using (auth.uid() = to_user_id or auth.uid() = from_user_id)';
  end if;
end $$;
