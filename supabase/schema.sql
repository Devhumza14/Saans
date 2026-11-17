-- Saans schema. Paste into the Supabase SQL editor and run once.
create extension if not exists "pgcrypto";

create table if not exists households (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  area text not null,
  lat real not null,
  lng real not null,
  language text not null default 'roman' check (language in ('ur','roman','en')),
  created_at timestamptz not null default now()
);

create table if not exists members (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references households(id) on delete cascade,
  name text not null,
  age_group text not null check (age_group in ('child','teen','adult','senior')),
  conditions text[] not null default '{}',
  is_pregnant boolean not null default false,
  occupation_exposure text not null default 'mixed' check (occupation_exposure in ('indoor','mixed','outdoor','rider')),
  commute text not null default 'none' check (commute in ('none','car','bike','rickshaw','public','walk')),
  school_going boolean not null default false,
  avatar text,
  created_at timestamptz not null default now()
);

create table if not exists plans (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references members(id) on delete cascade,
  area text not null,
  aqi int not null,
  risk_level text not null,
  plan jsonb not null,
  created_at timestamptz not null default now()
);
create index if not exists plans_member_created_idx on plans (member_id, created_at desc);

create table if not exists alerts (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references households(id) on delete cascade,
  member_id uuid not null references members(id) on delete cascade,
  level text not null,
  message_ur text not null,
  message_roman text not null,
  message_en text not null,
  aqi int not null,
  read boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists alerts_household_created_idx on alerts (household_id, created_at desc);

create table if not exists aq_snapshots (
  id uuid primary key default gen_random_uuid(),
  area text not null,
  data jsonb not null,
  fetched_at timestamptz not null default now()
);
create index if not exists aq_snapshots_area_idx on aq_snapshots (area, fetched_at desc);

create table if not exists messages (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references households(id) on delete cascade,
  role text not null check (role in ('user','assistant')),
  content text not null,
  created_at timestamptz not null default now()
);
create index if not exists messages_household_created_idx on messages (household_id, created_at);

-- Row level security: owners only see their own household and its children.
alter table households enable row level security;
alter table members enable row level security;
alter table plans enable row level security;
alter table alerts enable row level security;
alter table messages enable row level security;
alter table aq_snapshots enable row level security;

create policy "own households" on households for all to authenticated
  using (owner_id = auth.uid()) with check (owner_id = auth.uid());

create policy "own members" on members for all to authenticated
  using (exists (select 1 from households h where h.id = household_id and h.owner_id = auth.uid()))
  with check (exists (select 1 from households h where h.id = household_id and h.owner_id = auth.uid()));

create policy "own plans" on plans for all to authenticated
  using (exists (select 1 from members m join households h on h.id = m.household_id
                 where m.id = member_id and h.owner_id = auth.uid()))
  with check (exists (select 1 from members m join households h on h.id = m.household_id
                      where m.id = member_id and h.owner_id = auth.uid()));

create policy "own alerts" on alerts for all to authenticated
  using (exists (select 1 from households h where h.id = household_id and h.owner_id = auth.uid()))
  with check (exists (select 1 from households h where h.id = household_id and h.owner_id = auth.uid()));

create policy "own messages" on messages for all to authenticated
  using (exists (select 1 from households h where h.id = household_id and h.owner_id = auth.uid()))
  with check (exists (select 1 from households h where h.id = household_id and h.owner_id = auth.uid()));

-- Air snapshots: any signed-in user can read; only the service role writes (it bypasses RLS).
create policy "read snapshots" on aq_snapshots for select to authenticated using (true);
