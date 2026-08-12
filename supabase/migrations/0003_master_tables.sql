-- 0003_master_tables.sql
-- EmptyBag-IMS: master / reference tables

-- ---------------------------------------------------------------
-- roles
-- ---------------------------------------------------------------
create table public.roles (
  id uuid primary key default gen_random_uuid(),
  code text not null unique check (code in ('SI', 'LEADER', 'PETUGAS_TRANSIT')),
  name text not null,
  description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.roles is 'Role pengguna: SI, LEADER, PETUGAS_TRANSIT (PRD Section 4).';

-- ---------------------------------------------------------------
-- permissions
-- ---------------------------------------------------------------
create table public.permissions (
  id uuid primary key default gen_random_uuid(),
  module text not null,
  action text not null check (action in ('create', 'read', 'update', 'delete', 'approve')),
  description text,
  created_at timestamptz not null default now(),
  unique (module, action)
);

comment on table public.permissions is 'Master izin per modul (PRD Section 10.2).';

-- ---------------------------------------------------------------
-- role_permissions
-- ---------------------------------------------------------------
create table public.role_permissions (
  id uuid primary key default gen_random_uuid(),
  role_id uuid not null references public.roles(id) on delete cascade,
  permission_id uuid not null references public.permissions(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (role_id, permission_id)
);

-- ---------------------------------------------------------------
-- products (SMP / Semen Merah Putih, MP = same as SMP, SPK -> Patriot)
-- ---------------------------------------------------------------
create table public.products (
  id uuid primary key default gen_random_uuid(),
  product_code text not null unique,
  product_name text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.products is 'Produk semen. Business rule: SMP dan MP adalah produk yang sama (Semen Merah Putih).';

-- ---------------------------------------------------------------
-- suppliers (UKS)
-- ---------------------------------------------------------------
create table public.suppliers (
  id uuid primary key default gen_random_uuid(),
  supplier_code text not null unique,
  supplier_name text not null,
  contact text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.suppliers is 'Supplier/vendor empty bag. Business rule: UKS adalah supplier.';

-- ---------------------------------------------------------------
-- specifications (AP85, AP65)
-- ---------------------------------------------------------------
create table public.specifications (
  id uuid primary key default gen_random_uuid(),
  spec_code text not null unique,
  spec_name text not null,
  description text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.specifications is 'Specification/type empty bag. Business rule: AP85 dan AP65 adalah specification supplier UKS.';

-- ---------------------------------------------------------------
-- pallets
-- ---------------------------------------------------------------
create table public.pallets (
  id uuid primary key default gen_random_uuid(),
  pallet_code text not null unique,
  description text,
  capacity numeric,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------
-- locations (WHS Empty Bag, Transit Room, Transit Side)
-- ---------------------------------------------------------------
create table public.locations (
  id uuid primary key default gen_random_uuid(),
  location_code text not null unique,
  location_name text not null,
  location_type public.location_type not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.locations is 'Lokasi penyimpanan: WHS (WAREHOUSE), Transit Room / Transit Side (TRANSIT).';

-- ---------------------------------------------------------------
-- shifts (S1, S2, S3, AM, PM)
-- ---------------------------------------------------------------
create table public.shifts (
  id uuid primary key default gen_random_uuid(),
  shift_code text not null unique check (shift_code in ('S1', 'S2', 'S3', 'AM', 'PM')),
  shift_name text not null,
  start_time time not null,
  end_time time not null,
  crosses_midnight boolean not null default false,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.shifts is 'Shift: S1 00:01-08:00, S2 08:01-16:00, S3 16:01-00:00, AM 08:01-20:00, PM 20:01-08:00 (crosses midnight).';

-- ---------------------------------------------------------------
-- items (empty bag master)
-- ---------------------------------------------------------------
create table public.items (
  id uuid primary key default gen_random_uuid(),
  item_code text not null unique,
  item_name text not null,
  item_type public.item_type not null default 'WOVEN_PP',
  weight numeric,
  material text,
  product_id uuid not null references public.products(id),
  supplier_id uuid not null references public.suppliers(id),
  specification_id uuid not null references public.specifications(id),
  unit public.unit_type not null default 'PCS',
  pallet_id uuid references public.pallets(id),
  qty_per_pallet numeric not null default 1,
  min_stock numeric not null default 0,
  reorder_point numeric not null default 0,
  target_stock numeric not null default 0,
  is_active boolean not null default true,
  remarks text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.items is 'Master item empty bag. Item Code adalah identifier utama (PRD Section 7).';

-- ---------------------------------------------------------------
-- users (profile, terhubung dengan Supabase Auth via id = auth.uid())
-- ---------------------------------------------------------------
create table public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  role_id uuid not null references public.roles(id),
  full_name text not null,
  employee_id text,
  location_ids uuid[] not null default '{}',
  phone text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.users is 'Profil pengguna terhubung ke Supabase Auth (PRD Section 10.2).';

-- ---------------------------------------------------------------
-- sequences for document numbers
-- ---------------------------------------------------------------
create sequence if not exists public.seq_do_number start 1;
create sequence if not exists public.seq_transfer_number start 1;
create sequence if not exists public.seq_transaction_number start 1;
create sequence if not exists public.seq_opname_number start 1;
