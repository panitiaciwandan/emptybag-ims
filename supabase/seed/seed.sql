-- seed.sql
-- EmptyBag-IMS: seed data (master data + opening stock)
-- Business rules applied:
--  * SMP and MP are the same product (Semen Merah Putih) -> product_code SMP
--  * SPK uses Patriot -> product_code SPK
--  * Supplier: UKS
--  * Specifications: AP85, AP65 (supplier UKS specs)
--  * Opening stock posted through stock_ledger (no direct stock writes)

begin;

-- ---------------------------------------------------------------
-- Roles & permissions
-- ---------------------------------------------------------------
insert into public.roles (code, name, description) values
  ('SI', 'System In-Charge', 'Admin & approval adjustment, users, audit'),
  ('LEADER', 'Leader', 'Approval DO, verifikasi issue, kelola transfer'),
  ('PETUGAS_TRANSIT', 'Petugas Transit', 'Input issue, QC, environment, receive transfer')
on conflict (code) do update set name = excluded.name, description = excluded.description;

-- Permissions matrix (PRD Section 10.2)
insert into public.permissions (module, action, description) values
  ('TRANSFER', 'create', 'Buat transfer antar lokasi'),
  ('TRANSFER', 'approve', 'Approve transfer'),
  ('DO', 'create', 'Buat DO'),
  ('DO', 'approve', 'Approve DO'),
  ('ISSUE', 'create', 'Buat transaksi issue/konsumsi'),
  ('ISSUE', 'approve', 'Verifikasi/approve transaksi issue'),
  ('QC', 'create', 'Input QC'),
  ('ENVIRONMENT', 'create', 'Input environment log'),
  ('OPNAME', 'create', 'Input stock opname'),
  ('ADJUSTMENT', 'approve', 'Approve adjustment (SI)'),
  ('USER', 'update', 'Kelola pengguna (SI)'),
  ('AUDIT', 'read', 'Lihat audit log (SI/Leader)')
on conflict (module, action) do update set description = excluded.description;

-- Map permissions to roles
insert into public.role_permissions (role_id, permission_id)
select r.id, p.id
from public.roles r, public.permissions p
where (r.code = 'SI' and p.action in ('approve', 'create', 'update', 'read'))
   or (r.code = 'LEADER' and p.module in ('TRANSFER', 'DO', 'ISSUE') and p.action in ('create', 'approve'))
   or (r.code = 'LEADER' and p.module in ('QC', 'ENVIRONMENT', 'OPNAME') and p.action = 'create')
   or (r.code = 'PETUGAS_TRANSIT' and p.module in ('ISSUE', 'QC', 'ENVIRONMENT', 'OPNAME') and p.action = 'create')
on conflict (role_id, permission_id) do nothing;

-- ---------------------------------------------------------------
-- Products
-- ---------------------------------------------------------------
insert into public.products (product_code, product_name, is_active) values
  ('SMP', 'Semen Merah Putih (SMP/MP)', true),
  ('SPK', 'Semen Putra Keluarga (Patriot)', true)
on conflict (product_code) do update set product_name = excluded.product_name;

-- ---------------------------------------------------------------
-- Suppliers
-- ---------------------------------------------------------------
insert into public.suppliers (supplier_code, supplier_name, contact, is_active) values
  ('UKS', 'PT United King Sacks', NULL, true)
on conflict (supplier_code) do update set supplier_name = excluded.supplier_name;

-- ---------------------------------------------------------------
-- Specifications (AP85, AP65)
-- ---------------------------------------------------------------
insert into public.specifications (spec_code, spec_name, description, is_active) values
  ('AP85', 'AP 85', 'Specification AP85', true),
  ('AP65', 'AP 65', 'Specification AP65', true)
on conflict (spec_code) do update set spec_name = excluded.spec_name;

-- ---------------------------------------------------------------
-- Locations
-- ---------------------------------------------------------------
insert into public.locations (location_code, location_name, location_type, is_active) values
  ('WHS', 'Warehouse Empty Bag', 'WAREHOUSE', true),
  ('TROOM', 'Transit Room', 'TRANSIT', true),
  ('TSIDE', 'Transit Side', 'TRANSIT', true)
on conflict (location_code) do update set location_name = excluded.location_name;

-- ---------------------------------------------------------------
-- Shifts (S1/S2/S3 regular + AM/PM long)
-- ---------------------------------------------------------------
insert into public.shifts (shift_code, shift_name, start_time, end_time, crosses_midnight, is_active) values
  ('S1', 'Shift 1', '00:01', '08:00', false, true),
  ('S2', 'Shift 2', '08:01', '16:00', false, true),
  ('S3', 'Shift 3', '16:01', '00:00', true, true),
  ('AM', 'Long Shift AM', '08:01', '20:00', false, false),
  ('PM', 'Long Shift PM', '20:01', '08:00', true, false)
on conflict (shift_code) do update set shift_name = excluded.shift_name;

-- Default shift mode: REGULAR (Long shift AM/PM available but inactive by default)
insert into public.app_settings (key, value) values ('shift_mode', 'REGULAR')
on conflict (key) do update set value = excluded.value;

-- ---------------------------------------------------------------
-- Pallets
-- ---------------------------------------------------------------
insert into public.pallets (pallet_code, description, capacity, is_active) values
  ('PAL-STD', 'Pallet Standar', 100, true),
  ('PAL-JUMBO', 'Pallet Jumbo', 50, true)
on conflict (pallet_code) do update set description = excluded.description;

-- ---------------------------------------------------------------
-- Items (empty bag master)
-- Note: item_code is the primary identifier (PRD Section 7)
-- ---------------------------------------------------------------
insert into public.items
  (item_code, item_name, item_type, weight, material, product_id, supplier_id,
   specification_id, unit, pallet_id, qty_per_pallet, min_stock, reorder_point, target_stock, is_active)
select
  v.code, v.name, v.itype::public.item_type, v.weight, v.material, pr.id, su.id, sp.id,
  v.unit::public.unit_type, pa.id, v.qpp, v.min, v.reorder, v.target, true
from (values
  ('40KG HDPE SMP',      '40 KG HDPE SMP',      'HDPE',     40, 'HDPE',     'SMP', 'UKS', 'AP85', 'PCS',    'PAL-STD', 50,  500, 800, 1200),
  ('40KG KRAFT SMP',     '40 KG KRAFT SMP',     'KRAFT',    40, 'Kraft',    'SMP', 'UKS', 'AP85', 'PCS',    'PAL-STD', 50,  500, 800, 1200),
  ('40KG HDPE PATRIOT',  '40 KG HDPE Patriot',  'HDPE',     40, 'HDPE',     'SPK', 'UKS', 'AP85', 'PCS',    'PAL-STD', 50,  500, 800, 1200),
  ('40KG KRAFT PATRIOT', '40 KG Kraft Patriot', 'KRAFT',    40, 'Kraft',    'SPK', 'UKS', 'AP85', 'PCS',    'PAL-STD', 50,  500, 800, 1200),
  ('50KG HDPE SMP',      '50 KG HDPE SMP',      'HDPE',     50, 'HDPE',     'SMP', 'UKS', 'AP65', 'PCS',    'PAL-STD', 40,  400, 600, 900),
  ('50KG WOVEN SMP',     '50 KG Woven SMP',     'WOVEN_PP', 50, 'Woven PP', 'SMP', 'UKS', 'AP65', 'PCS',    'PAL-STD', 40,  400, 600, 900),
  ('50KG HDPE PATRIOT',  '50 KG HDPE Patriot',  'HDPE',     50, 'HDPE',     'SPK', 'UKS', 'AP65', 'PCS',    'PAL-STD', 40,  400, 600, 900),
  ('JUMBO 1T',           'Jumbo Bag 1 Ton',    'JUMBO_BAG', 1, 'Woven PP', 'SMP', 'UKS', 'AP65', 'PCS',    'PAL-JUMBO', 10, 50, 100, 200),
  ('JUMBO 2T',           'Jumbo Bag 2 Ton',    'JUMBO_BAG', 2, 'Woven PP', 'SMP', 'UKS', 'AP85', 'PCS',    'PAL-JUMBO', 10, 50, 100, 200)
) as v(code, name, itype, weight, material, pcode, scode, specode, unit, pallet, qpp, min, reorder, target)
join public.products pr on pr.product_code = v.pcode
join public.suppliers su on su.supplier_code = v.scode
join public.specifications sp on sp.spec_code = v.specode
left join public.pallets pa on pa.pallet_code = v.pallet
on conflict (item_code) do nothing;

-- ---------------------------------------------------------------
-- Users (profile rows; auth.users must exist - created in Supabase
-- Auth or via mock auth schema in local setup)
-- Fixed UUIDs for reproducible references in tests.
-- ---------------------------------------------------------------
insert into auth.users (id, email, encrypted_password, email_confirmed_at, raw_app_meta_data, created_at, updated_at)
values
  ('00000000-0000-0000-0000-000000000001', 'si@emptybag.test',
   '$2a$10$AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA', now(), '{}', now(), now()),
  ('00000000-0000-0000-0000-000000000002', 'leader@emptybag.test',
   '$2a$10$AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA', now(), '{}', now(), now()),
  ('00000000-0000-0000-0000-000000000003', 'petugas@emptybag.test',
   '$2a$10$AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA', now(), '{}', now(), now())
on conflict (id) do nothing;

insert into public.users (id, role_id, full_name, employee_id, location_ids, is_active)
select
  a.id,
  r.id,
  a.email,
  'EMP-' || substr(a.id::text, 1, 8),
  case r.code
    when 'PETUGAS_TRANSIT' then array[(select id from public.locations where location_code = 'TROOM'),
                                       (select id from public.locations where location_code = 'TSIDE')]
    else '{}'::uuid[]
  end,
  true
from auth.users a
join public.roles r on r.code = case a.email
  when 'si@emptybag.test' then 'SI'
  when 'leader@emptybag.test' then 'LEADER'
  when 'petugas@emptybag.test' then 'PETUGAS_TRANSIT'
end
on conflict (id) do nothing;

-- ---------------------------------------------------------------
-- Opening stock: posted THROUGH stock_ledger (never direct stock writes).
-- Creates OPENING transactions + ledger rows + stock rows via trigger.
-- ---------------------------------------------------------------
do $$
declare
  v_user uuid;
  v_shift uuid;
  v_txn uuid;
  v_items record;
begin
  select id into v_user from public.users order by created_at limit 1;
  select id into v_shift from public.shifts where shift_code = 'S2';

  if v_user is null then
    -- Fallback: use a placeholder user id won't satisfy FK; skip if no users yet.
    raise notice 'No users seeded yet; opening stock skipped. Run after user seeding.';
    return;
  end if;

  for v_items in
    select i.id as item_id, i.item_code,
           case
             when i.item_code like 'JUMBO%' then 100
             else 1000
           end as qty
    from public.items i
  loop
    insert into public.transactions
      (transaction_number, transaction_type, transaction_date, shift_id, location_id,
       created_by, approved_by, status, notes)
    values
      ('OPEN-' || replace(v_items.item_code, ' ', '-'),
       'OPENING', current_date, v_shift, (select id from public.locations where location_code = 'WHS'),
       v_user, v_user, 'APPROVED',
       'Opening stock ' || v_items.item_code)
    returning id into v_txn;

    insert into public.transaction_details (transaction_id, item_id, qty, category, reason)
    values (v_txn, v_items.item_id, v_items.qty, 'GOOD', 'Opening balance');

    -- Use the engine helper so stock + ledger stay consistent
    perform public.fn_post_ledger_rows(
      v_txn, current_date, v_shift,
      jsonb_build_array(jsonb_build_object('item_id', v_items.item_id, 'qty', v_items.qty)),
      v_user
    );
  end loop;
end $$;

commit;
