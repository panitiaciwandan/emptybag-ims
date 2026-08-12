-- test_04_transfer_flow.sql
-- EmptyBag-IMS transfer workflow test (WHS -> Transit Room):
-- create -> submit (TRANSFER_OUT posted) -> receive (TRANSFER_IN posted)
-- -> approve (COMPLETED). Verifies stock moved correctly via ledger.

begin;

select plan(10);

-- Fixtures
select id as v_si from public.users where full_name = 'si@emptybag.test' \gset
select id as v_leader from public.users where full_name = 'leader@emptybag.test' \gset
select id as v_petugas from public.users where full_name = 'petugas@emptybag.test' \gset
select id as v_whs from public.locations where location_code = 'WHS' \gset
select id as v_troom from public.locations where location_code = 'TROOM' \gset
select id as v_s2 from public.shifts where shift_code = 'S2' \gset
select id as v_item from public.items where item_code = '40KG HDPE SMP' \gset

-- Opening stock at WHS = 1000 (from seed). Transfer 400 to TROOM.

-- ------------------------------------------------------------------
-- 1. Create transfer (Leader)
-- ------------------------------------------------------------------
select set_config('request.jwt.claims', jsonb_build_object('sub', :'v_leader')::text, false);

select create_transfer(current_date, :'v_s2', :'v_whs', :'v_troom', 'Transfer test',
  jsonb_build_array(jsonb_build_object('item_id', :'v_item', 'qty', 400, 'pallet_code', 'PAL-STD'))) as tf_result \gset

select ok((:'tf_result')::jsonb ? 'id', 'Transfer created');
select is(((:'tf_result')::jsonb ->> 'status'), 'DRAFT', 'Transfer status DRAFT');

-- ------------------------------------------------------------------
-- 2. Submit (DRAFT -> IN_TRANSIT; TRANSFER_OUT posted at WHS)
-- ------------------------------------------------------------------
select submit_transfer(((:'tf_result')::jsonb ->> 'id')::uuid) as submit_tf \gset
select is(((:'submit_tf')::jsonb ->> 'status'), 'IN_TRANSIT', 'Transfer submitted -> IN_TRANSIT');

-- WHS stock reduced: 1000 - 400 = 600
select qty as whs_after from public.stock where item_id = :'v_item' and location_id = :'v_whs' \gset
select is(:whs_after, 600, 'WHS stock = 600 after transfer out');

-- TROOM unchanged (0)
select coalesce((select qty from public.stock where item_id = :'v_item' and location_id = :'v_troom'), 0) as troom_after_out \gset
select is(:'troom_after_out', 0, 'TROOM stock unchanged after transfer out');

-- ------------------------------------------------------------------
-- 3. Receive (IN_TRANSIT -> RECEIVED; TRANSFER_IN posted at TROOM)
-- ------------------------------------------------------------------
select set_config('request.jwt.claims', jsonb_build_object('sub', :'v_petugas')::text, false);
select receive_transfer(((:'tf_result')::jsonb ->> 'id')::uuid) as recv_tf \gset
select is(((:'recv_tf')::jsonb ->> 'status'), 'RECEIVED', 'Transfer received by Petugas Transit');

-- TROOM stock = 400
select qty as troom_after_in from public.stock where item_id = :'v_item' and location_id = :'v_troom' \gset
select is(:troom_after_in, 400, 'TROOM stock = 400 after transfer in');

-- ------------------------------------------------------------------
-- 4. Approve (RECEIVED -> COMPLETED; Leader)
-- ------------------------------------------------------------------
select set_config('request.jwt.claims', jsonb_build_object('sub', :'v_leader')::text, false);
select approve_transfer(((:'tf_result')::jsonb ->> 'id')::uuid) as appr_tf \gset
select is(((:'appr_tf')::jsonb ->> 'status'), 'COMPLETED', 'Transfer completed by Leader');

-- ------------------------------------------------------------------
-- 5. Ledger integrity: net movement WHS -400, TROOM +400
-- ------------------------------------------------------------------
select coalesce(sum(case when movement_type='IN' then qty else -qty end), 0) as whs_net
from public.stock_ledger where item_id = :'v_item' and location_id = :'v_whs' \gset
select is(:whs_net, -400, 'Ledger net at WHS = -400');

select coalesce(sum(case when movement_type='IN' then qty else -qty end), 0) as troom_net
from public.stock_ledger where item_id = :'v_item' and location_id = :'v_troom' \gset
select is(:troom_net, 400, 'Ledger net at TROOM = +400');

-- ------------------------------------------------------------------
-- 6. Transfer cannot be received twice (state transition guard)
-- ------------------------------------------------------------------
select throws_ok(
  format('select public.receive_transfer(%L)', (:'tf_result')::jsonb ->> 'id'),
  'P0001',
  'STATE_TRANSITION',
  'Already-received transfer cannot be received again'
);

rollback;
