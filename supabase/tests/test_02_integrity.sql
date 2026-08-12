-- test_02_integrity.sql
-- EmptyBag-IMS integrity tests:
--  * insufficient stock guard (soft check enforced)
--  * duplicate transaction prevention
--  * direct stock write is blocked (ledger is the only write path)
--  * unauthorized role access (FORBIDDEN)

begin;

select plan(7);

-- Fixtures
select id as v_si from public.users where full_name = 'si@emptybag.test' \gset
select id as v_leader from public.users where full_name = 'leader@emptybag.test' \gset
select id as v_petugas from public.users where full_name = 'petugas@emptybag.test' \gset
select id as v_troom from public.locations where location_code = 'TROOM' \gset
select id as v_s2 from public.shifts where shift_code = 'S2' \gset
select id as v_item from public.items where item_code = '40KG HDPE SMP' \gset

-- ------------------------------------------------------------------
-- 1. Insufficient stock: Petugas creates issue > available, approve fails
-- ------------------------------------------------------------------
select set_config('request.jwt.claims', jsonb_build_object('sub', :'v_petugas')::text, false);

-- TROOM currently 0 stock (opening went to WHS). Try issue 100 -> should fail on approve.
select create_issue(:'v_troom', :'v_s2', current_date, NULL,
  'Test insufficient',
  jsonb_build_array(jsonb_build_object('item_id', :'v_item', 'qty', 100, 'category', 'GOOD'))) as insuf_result \gset

select set_config('request.jwt.claims', jsonb_build_object('sub', :'v_leader')::text, false);

select throws_ok(
  format('select public.approve_transaction(%L)', (:'insuf_result')::jsonb ->> 'id'),
  'P0001',
  'INSUFFICIENT_STOCK',
  'Approve fails when stock insufficient'
);

-- ------------------------------------------------------------------
-- 2. Duplicate transaction number: unique constraint
-- ------------------------------------------------------------------
select throws_ok(
  format('insert into public.transactions (id, transaction_number, transaction_type, transaction_date, shift_id, location_id, created_by, status) values (gen_random_uuid(), %L, %L, current_date, %L, %L, %L, %L)',
    (select transaction_number from public.transactions where transaction_type = 'OPENING' limit 1),
    'OPENING', :'v_s2', :'v_troom', :'v_si', 'APPROVED'),
  '23505',
  NULL,
  'Duplicate transaction_number rejected by unique constraint'
);

-- ------------------------------------------------------------------
-- 3. Direct stock write must be blocked by RLS (as authenticated role)
-- ------------------------------------------------------------------
set role authenticated;
select set_config('request.jwt.claims', jsonb_build_object('sub', :'v_si')::text, false);
select throws_like(
  'update public.stock set qty = 99999',
  '%new row violates row-level security policy%',
  'Direct stock update blocked by RLS'
);
reset role;

-- ------------------------------------------------------------------
-- 4. Direct stock_ledger insert blocked by RLS
-- ------------------------------------------------------------------
set role authenticated;
select throws_like(
  'insert into public.stock_ledger (ledger_date, shift_id, item_id, location_id, transaction_id, transaction_type, movement_type, qty, balance_after, created_by) values (current_date, ''id'', ''id'', ''id'', ''id'', ''OPENING'', ''IN'', 1, 1, ''id'')',
  '%new row violates row-level security policy%',
  'Direct ledger insert blocked by RLS'
);
reset role;

-- ------------------------------------------------------------------
-- 5. Unauthorized: Petugas cannot approve transactions (FORBIDDEN)
-- ------------------------------------------------------------------
select set_config('request.jwt.claims', jsonb_build_object('sub', :'v_petugas')::text, false);
select throws_ok(
  'select public.approve_transaction(gen_random_uuid())',
  'P0001',
  'FORBIDDEN',
  'Petugas cannot approve (Leader role required)'
);

-- ------------------------------------------------------------------
-- 6. Unauthorized: Petugas cannot create transfer (FORBIDDEN)
-- ------------------------------------------------------------------
select throws_ok(
  format('select public.create_transfer(current_date, %L, (select id from public.locations where location_code=''WHS''), %L, NULL, ''[]''::jsonb)', :'v_s2', :'v_troom'),
  'P0001',
  'FORBIDDEN',
  'Petugas cannot create transfer (Leader role required)'
);

-- ------------------------------------------------------------------
-- 7. Void of DO without sufficient rights blocked for Petugas (FORBIDDEN)
-- ------------------------------------------------------------------
select throws_ok(
  'select public.void_do(gen_random_uuid(), ''test'')',
  'P0001',
  'FORBIDDEN',
  'Petugas cannot void DO (SI role required)'
);

rollback;
