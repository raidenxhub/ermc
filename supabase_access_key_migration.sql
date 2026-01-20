-- Run in Supabase SQL Editor

create extension if not exists pgcrypto;

alter table public.profiles
add column if not exists position text;

alter table public.profiles
add column if not exists ermc_access_granted boolean not null default false;

alter table public.profiles
add column if not exists ermc_access_verified_at timestamptz;

create table if not exists public.messages (
  id uuid default gen_random_uuid() primary key,
  event_id uuid references public.events(id) on delete cascade not null,
  user_id uuid references public.profiles(id) on delete cascade not null,
  content text not null,
  created_at timestamptz default now()
);

alter table public.messages enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies where schemaname='public' and tablename='messages' and policyname='Messages are viewable by everyone'
  ) then
    execute 'create policy "Messages are viewable by everyone" on public.messages for select using (true)';
  end if;
  if not exists (
    select 1 from pg_policies where schemaname='public' and tablename='messages' and policyname='Users can insert their own messages'
  ) then
    execute 'create policy "Users can insert their own messages" on public.messages for insert with check (auth.uid() = user_id)';
  end if;
end $$;

alter table public.events
alter column id set default gen_random_uuid();
