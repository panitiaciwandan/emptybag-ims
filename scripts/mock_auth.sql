-- mock_auth.sql
-- EmptyBag-IMS: LOCAL TESTING ONLY mock for Supabase Auth.
-- Supabase provides a real `auth` schema; this file creates a minimal
-- compatible one so migrations/seed/tests can run against plain Postgres.
-- NOT applied in Supabase (guard: skip if auth.users already exists).

-- Supabase-style roles used in RLS policies / grants
do $$
begin
  if not exists (select 1 from pg_roles where rolname = 'authenticated') then
    create role authenticated;
  end if;
  if not exists (select 1 from pg_roles where rolname = 'anon') then
    create role anon;
  end if;
  if not exists (select 1 from pg_roles where rolname = 'service_role') then
    create role service_role;
  end if;
end $$;

create schema if not exists auth;

create table if not exists auth.users (
  id uuid primary key,
  email text unique,
  encrypted_password text,
  email_confirmed_at timestamptz,
  raw_app_meta_data jsonb default '{}',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

grant usage on schema auth to public;
grant all on table auth.users to public;
