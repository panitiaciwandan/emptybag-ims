-- 0001_extensions_and_settings.sql
-- EmptyBag-IMS: extensions and application settings

create extension if not exists "pgcrypto";
create extension if not exists "uuid-ossp";

-- Application settings table (key-value). Used e.g. for shift_mode.
create table if not exists public.app_settings (
  key text primary key,
  value text not null,
  description text,
  updated_at timestamptz not null default now()
);

comment on table public.app_settings is 'Key-value application settings (e.g. shift_mode).';
