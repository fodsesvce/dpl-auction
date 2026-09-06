-- =========================================================
-- DPL AUCTION
-- AUTHENTICATION + ROLE BASED ACCESS + REALTIME STATE
-- =========================================================

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,

  role text not null
    check (role in ('operator', 'team')),

  team_id text,

  display_name text,

  created_at timestamptz not null default now()
);


create table if not exists public.auction_state (
  id bigint primary key,

  state jsonb not null,

  updated_at timestamptz not null default now()
);


-- =========================================================
-- ENABLE ROW LEVEL SECURITY
-- =========================================================

alter table public.profiles
enable row level security;

alter table public.auction_state
enable row level security;


-- =========================================================
-- OPERATOR CHECK
-- =========================================================

create or replace function public.is_operator()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and role = 'operator'
  );
$$;


revoke all
on function public.is_operator()
from public;

grant execute
on function public.is_operator()
to authenticated;


-- =========================================================
-- PROFILE POLICY
-- USER CAN ONLY READ OWN PROFILE
-- =========================================================

drop policy if exists "profiles_select_own"
on public.profiles;

create policy "profiles_select_own"
on public.profiles
for select
to authenticated
using (
  id = auth.uid()
);


-- =========================================================
-- AUCTION STATE
-- EVERY AUTHENTICATED USER CAN READ
-- =========================================================

drop policy if exists "auction_select_authenticated"
on public.auction_state;

create policy "auction_select_authenticated"
on public.auction_state
for select
to authenticated
using (true);


-- =========================================================
-- ONLY OPERATOR CAN INSERT
-- =========================================================

drop policy if exists "auction_insert_operator"
on public.auction_state;

create policy "auction_insert_operator"
on public.auction_state
for insert
to authenticated
with check (
  public.is_operator()
);


-- =========================================================
-- ONLY OPERATOR CAN UPDATE
-- =========================================================

drop policy if exists "auction_update_operator"
on public.auction_state;

create policy "auction_update_operator"
on public.auction_state
for update
to authenticated
using (
  public.is_operator()
)
with check (
  public.is_operator()
);


-- =========================================================
-- REALTIME
-- =========================================================

alter publication supabase_realtime
add table public.auction_state;