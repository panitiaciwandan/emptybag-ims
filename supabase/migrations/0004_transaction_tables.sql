-- 0004_transaction_tables.sql
-- EmptyBag-IMS: transactional tables (DO, transfer, transactions, stock, ledger, etc.)

-- ---------------------------------------------------------------
-- do_header
-- ---------------------------------------------------------------
create table public.do_header (
  id uuid primary key default gen_random_uuid(),
  do_number text not null unique,
  do_date date not null,
  shift_id uuid not null references public.shifts(id),
  requested_by uuid not null references public.users(id),
  approved_by uuid references public.users(id),
  status public.do_status not null default 'DRAFT',
  notes text,
  approved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.do_header is 'Header Delivery Order (PRD Section 10.2).';

-- ---------------------------------------------------------------
-- do_detail
-- ---------------------------------------------------------------
create table public.do_detail (
  id uuid primary key default gen_random_uuid(),
  do_id uuid not null references public.do_header(id) on delete cascade,
  item_id uuid not null references public.items(id),
  requested_qty numeric not null check (requested_qty > 0),
  issued_qty numeric not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.do_detail is 'Detail item DO.';

-- ---------------------------------------------------------------
-- transfer_header
-- ---------------------------------------------------------------
create table public.transfer_header (
  id uuid primary key default gen_random_uuid(),
  transfer_number text not null unique,
  transfer_date date not null,
  shift_id uuid not null references public.shifts(id),
  from_location_id uuid not null references public.locations(id),
  to_location_id uuid not null references public.locations(id),
  created_by uuid not null references public.users(id),
  received_by uuid references public.users(id),
  status public.transfer_status not null default 'DRAFT',
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.transfer_header is 'Header transfer antar lokasi (WHS -> Transit).';

-- ---------------------------------------------------------------
-- transfer_detail
-- ---------------------------------------------------------------
create table public.transfer_detail (
  id uuid primary key default gen_random_uuid(),
  transfer_id uuid not null references public.transfer_header(id) on delete cascade,
  item_id uuid not null references public.items(id),
  qty numeric not null check (qty > 0),
  pallet_code text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------
-- transactions
-- ---------------------------------------------------------------
create table public.transactions (
  id uuid primary key default gen_random_uuid(),
  transaction_number text not null unique,
  transaction_type public.transaction_type not null,
  transaction_date date not null,
  shift_id uuid not null references public.shifts(id),
  location_id uuid not null references public.locations(id),
  reference_type text,
  reference_id uuid,
  created_by uuid not null references public.users(id),
  approved_by uuid references public.users(id),
  status public.transaction_status not null default 'SUBMITTED',
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.transactions is 'Header transaksi stock (PRD Section 10.2).';

-- ---------------------------------------------------------------
-- transaction_details
-- ---------------------------------------------------------------
create table public.transaction_details (
  id uuid primary key default gen_random_uuid(),
  transaction_id uuid not null references public.transactions(id) on delete cascade,
  item_id uuid not null references public.items(id),
  qty numeric not null check (qty > 0),
  category public.consumption_category,
  reason text,
  created_at timestamptz not null default now()
);

comment on table public.transaction_details is 'Detail transaksi per item + kategori konsumsi.';

-- ---------------------------------------------------------------
-- stock (saldo terkini per item per lokasi)
-- FK ke stock_ledger ditambahkan setelah tabel stock_ledger dibuat
-- (referensi sirkuler: stock.last_ledger_id -> stock_ledger.id)
-- ---------------------------------------------------------------
create table public.stock (
  id uuid primary key default gen_random_uuid(),
  item_id uuid not null references public.items(id),
  location_id uuid not null references public.locations(id),
  qty numeric not null default 0,
  last_ledger_id uuid,
  updated_at timestamptz not null default now(),
  unique (item_id, location_id)
);

comment on table public.stock is 'Saldo stock terkini per item per lokasi. Dikelola via stock_ledger, tidak boleh di-update langsung.';

-- ---------------------------------------------------------------
-- stock_ledger (buku besar mutasi, append-only)
-- ---------------------------------------------------------------
create table public.stock_ledger (
  id uuid primary key default gen_random_uuid(),
  ledger_date date not null,
  shift_id uuid not null references public.shifts(id),
  item_id uuid not null references public.items(id),
  location_id uuid not null references public.locations(id),
  transaction_id uuid not null references public.transactions(id),
  transaction_type public.transaction_type not null,
  movement_type public.movement_type not null,
  category public.consumption_category,
  qty numeric not null,
  balance_after numeric not null,
  created_by uuid not null references public.users(id),
  created_at timestamptz not null default now()
);

comment on table public.stock_ledger is 'Buku besar mutasi stock (append-only). Semua perubahan stock WAJIB melalui tabel ini.';

-- ---------------------------------------------------------------
-- stock_opname
-- ---------------------------------------------------------------
create table public.stock_opname (
  id uuid primary key default gen_random_uuid(),
  opname_number text not null unique,
  opname_date date not null,
  location_id uuid not null references public.locations(id),
  item_id uuid not null references public.items(id),
  system_qty numeric not null default 0,
  physical_qty numeric not null default 0,
  difference numeric not null default 0,
  status public.opname_status not null default 'DRAFT',
  adjusted_by uuid references public.users(id),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.stock_opname is 'Pencatatan stock opname / perhitungan fisik.';

-- ---------------------------------------------------------------
-- qc_sample
-- ---------------------------------------------------------------
create table public.qc_sample (
  id uuid primary key default gen_random_uuid(),
  qc_date date not null,
  shift_id uuid not null references public.shifts(id),
  item_id uuid not null references public.items(id),
  sample_qty numeric not null check (sample_qty > 0),
  result public.qc_result not null,
  parameter jsonb,
  checked_by uuid not null references public.users(id),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------
-- environment_log
-- ---------------------------------------------------------------
create table public.environment_log (
  id uuid primary key default gen_random_uuid(),
  log_date date not null,
  shift_id uuid not null references public.shifts(id),
  location_id uuid not null references public.locations(id),
  temperature numeric,
  humidity numeric,
  remarks text,
  recorded_by uuid not null references public.users(id),
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------
-- reports
-- ---------------------------------------------------------------
create table public.reports (
  id uuid primary key default gen_random_uuid(),
  report_type public.report_type not null,
  report_date date not null,
  shift_id uuid references public.shifts(id),
  data_snapshot jsonb,
  created_by uuid not null references public.users(id),
  file_url text,
  created_at timestamptz not null default now()
);

comment on table public.reports is 'Metadata laporan (snapshot/export history).';

-- ---------------------------------------------------------------
-- audit_logs (append-only)
-- ---------------------------------------------------------------
create table public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.users(id),
  action public.audit_action not null,
  table_name text not null,
  record_id uuid,
  old_data jsonb,
  new_data jsonb,
  ip_address text,
  user_agent text,
  created_at timestamptz not null default now()
);

comment on table public.audit_logs is 'Audit trail append-only (PRD Section 18.5).';

-- ---------------------------------------------------------------
-- Circular FK: stock.last_ledger_id -> stock_ledger.id
-- (harus ditambahkan setelah stock_ledger ada)
-- ---------------------------------------------------------------
alter table public.stock
  add constraint stock_last_ledger_id_fkey
  foreign key (last_ledger_id) references public.stock_ledger(id)
  on delete set null;
