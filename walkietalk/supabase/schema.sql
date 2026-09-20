-- =====================================================================
-- WalkieTalk — Supabase schema
-- Run this in the Supabase SQL editor (Project -> SQL -> New query).
-- =====================================================================

-- ---------------------------------------------------------------------
-- profiles: one row per auth user, holds the unique callsign
-- ---------------------------------------------------------------------
create table if not exists profiles (
  id uuid references auth.users primary key,
  callsign text unique not null,
  created_at timestamp default now()
);

-- ---------------------------------------------------------------------
-- channels: named / private channel metadata
-- ---------------------------------------------------------------------
create table if not exists channels (
  id serial primary key,
  number int unique not null,
  name text,
  passcode text,
  is_private boolean default false,
  created_at timestamp default now()
);

-- ---------------------------------------------------------------------
-- transmission_logs: history of PTT transmissions
-- ---------------------------------------------------------------------
create table if not exists transmission_logs (
  id uuid default gen_random_uuid() primary key,
  channel_number int not null,
  callsign text not null,
  duration_seconds int,
  transmitted_at timestamp default now()
);

create index if not exists transmission_logs_transmitted_at_idx
  on transmission_logs (transmitted_at desc);

-- ---------------------------------------------------------------------
-- Seed default channels
-- ---------------------------------------------------------------------
insert into channels (number, name, is_private) values
  (1, 'General', false),
  (2, 'Squad', false),
  (3, 'Emergency', false)
on conflict (number) do nothing;

-- =====================================================================
-- Row Level Security
-- =====================================================================
alter table profiles enable row level security;
alter table channels enable row level security;
alter table transmission_logs enable row level security;

-- profiles ------------------------------------------------------------
-- Anyone authenticated can read profiles (needed for callsign uniqueness
-- checks + showing callsigns). Users may only insert/update their own row.
drop policy if exists "profiles are readable" on profiles;
create policy "profiles are readable"
  on profiles for select
  using (true);

drop policy if exists "users insert own profile" on profiles;
create policy "users insert own profile"
  on profiles for insert
  with check (auth.uid() = id);

drop policy if exists "users update own profile" on profiles;
create policy "users update own profile"
  on profiles for update
  using (auth.uid() = id);

-- channels ------------------------------------------------------------
-- Readable by everyone; managed by admins via the dashboard/service role.
drop policy if exists "channels are readable" on channels;
create policy "channels are readable"
  on channels for select
  using (true);

-- transmission_logs ---------------------------------------------------
-- Authenticated users can read all logs and insert their own transmissions.
drop policy if exists "logs are readable" on transmission_logs;
create policy "logs are readable"
  on transmission_logs for select
  to authenticated
  using (true);

drop policy if exists "authenticated can insert logs" on transmission_logs;
create policy "authenticated can insert logs"
  on transmission_logs for insert
  to authenticated
  with check (true);
