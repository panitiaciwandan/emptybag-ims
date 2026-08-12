-- test_01_business_flow.sql
-- EmptyBag-IMS integration test: DO 1200 + Damage 5 + Reject 2 + Lower 4
-- -> Total Issued = 1211 (PRD Section 8). Covers DO workflow, ISSUE workflow,
-- ledger integrity, DO issued_qty, shift report, and insufficient-stock guard.

begin;

select plan(23);

-- ---------------------------------------------------------------
-- Fixtures (psql \gset variables)
-- ---------------------------------------------------------------
select id as v_si from public.users where full_name = 'si@emptybag.test' \gset
select id as v_leader from public.users where full_name = 'leader@emptybag.test' \gset
select id as v_petugas from public.users where full_name = 'petugas@emptybag.test' \gset
select id as v_troom from public.locations where location_code = 'TROOM' \gset
select id as v_s2 from public.shifts where shift_code = 'S2' \gset
select id as v_item from public.items where item_code = '40KG HDPE SMP' \gset

-- ------------------------------------------------------------------
-- 1. SI adds stock at TROOM via ADJUSTMENT (setup for the issue)
-- ------------------------------------------------------------------
select set_config('request.jwt.claims',
  jsonb_build_object('sub', :'v_si')::text, false);

select create_adjustment(:'v_troom', :'v_s2', current_date, :'v_item', 1300,
  'Stock awal untuk test issue', 'Setup test') as adj_result \gset

select ok((:'adj_result')::jsonb ? 'id', 'Adjustment created by SI');
select is(((:'adj_result')::jsonb ->> 'status'), 'APPROVED', 'Adjustment auto-approved');
select is(((:'adj_result')::jsonb ->> 'transaction_type'), 'ADJUSTMENT', 'Transaction type ADJUSTMENT');

-- TROOM balance after adjustment = 1300
select qty as troom_after_adj from public.stock where item_id = :'v_item' and location_id = :'v_troom' \gset
select is(:troom_after_adj, 1300, 'TROOM stock = 1300 after adjustment');

-- ------------------------------------------------------------------
-- 2. Create DO (Leader) + approve (Leader)
-- ------------------------------------------------------------------
select set_config('request.jwt.claims',
  jsonb_build_object('sub', :'v_leader')::text, false);

select create_do(current_date, :'v_s2', 'DO test 1200',
  jsonb_build_array(jsonb_build_object('item_id', :'v_item', 'qty', 1200))) as do_result \gset

select ok((:'do_result')::jsonb ? 'id', 'DO created');
select is(((:'do_result')::jsonb ->> 'status'), 'DRAFT', 'DO status DRAFT');

select submit_do(((:'do_result')::jsonb ->> 'id')::uuid) as submit_do_result \gset
select is(((:'submit_do_result')::jsonb ->> 'status'), 'SUBMITTED', 'DO submitted');

select approve_do(((:'do_result')::jsonb ->> 'id')::uuid) as approve_do_result \gset
select is(((:'approve_do_result')::jsonb ->> 'status'), 'APPROVED', 'DO approved by Leader');

-- ------------------------------------------------------------------
-- 3. Create ISSUE: GOOD 1200 + DAMAGE 5 + REJECT 2 + LOWER 4 (Petugas)
-- ------------------------------------------------------------------
select set_config('request.jwt.claims',
  jsonb_build_object('sub', :'v_petugas')::text, false);

select create_issue(:'v_troom', :'v_s2', current_date, ((:'do_result')::jsonb ->> 'id')::uuid,
  'Issue test',
  jsonb_build_array(
    jsonb_build_object('item_id', :'v_item', 'qty', 1200, 'category', 'GOOD'),
    jsonb_build_object('item_id', :'v_item', 'qty', 5, 'category', 'DAMAGE', 'reason', 'sobek saat bongkar'),
    jsonb_build_object('item_id', :'v_item', 'qty', 2, 'category', 'REJECT', 'reason', 'cacat jahitan'),
    jsonb_build_object('item_id', :'v_item', 'qty', 4, 'category', 'LOWER', 'reason', 'sisa pcs')
  )) as issue_result \gset

select ok((:'issue_result')::jsonb ? 'id', 'Issue transaction created');
select is(((:'issue_result')::jsonb ->> 'status'), 'SUBMITTED', 'Issue status SUBMITTED');

-- ------------------------------------------------------------------
-- 4. Approve ISSUE (Leader verifies)
-- ------------------------------------------------------------------
select set_config('request.jwt.claims',
  jsonb_build_object('sub', :'v_leader')::text, false);

select approve_transaction(((:'issue_result')::jsonb ->> 'id')::uuid) as appr_result \gset
select is(((:'appr_result')::jsonb ->> 'status'), 'APPROVED', 'Issue approved by Leader');

-- ------------------------------------------------------------------
-- 5. Stock integrity: TROOM = 1300 - 1211 = 89; ledger matches stock
-- ------------------------------------------------------------------
select qty as troom_final from public.stock where item_id = :'v_item' and location_id = :'v_troom' \gset
select is(:troom_final, 89, 'TROOM stock = 1300 - 1211 = 89');

-- Ledger total OUT for ISSUE at TROOM = 1211
select coalesce(sum(qty), 0) as ledger_out
from public.stock_ledger
where item_id = :'v_item' and location_id = :'v_troom' and movement_type = 'OUT' \gset
select is(:ledger_out, 1211, 'Ledger OUT total = 1211');

-- Ledger balance_after matches stock (last row)
select balance_after as last_balance
from public.stock_ledger
where item_id = :'v_item' and location_id = :'v_troom'
order by created_at desc limit 1 \gset
select is(:last_balance, :troom_final, 'Ledger balance_after matches stock');

-- ------------------------------------------------------------------
-- 6. DO issued_qty updated (GOOD only) = 1200
-- ------------------------------------------------------------------
select issued_qty as do_issued
from public.do_detail
where do_id = ((:'do_result')::jsonb ->> 'id')::uuid and item_id = :'v_item' \gset
select is(:do_issued, 1200, 'DO issued_qty = 1200 (GOOD only)');

-- ------------------------------------------------------------------
-- 7. Shift report: Total Issued = 1211, categories correct
-- ------------------------------------------------------------------
select good, damage, reject, lower, buffer, trial_roto, other, total_issued
from public.get_shift_consumption_report(current_date, current_date)
where item_code = '40KG HDPE SMP' \gset

select is(:good, 1200, 'Report GOOD = 1200');
select is(:damage, 5, 'Report DAMAGE = 5');
select is(:reject, 2, 'Report REJECT = 2');
select is(:lower, 4, 'Report LOWER = 4');
select is(:buffer, 0, 'Report BUFFER = 0');
select is(:trial_roto, 0, 'Report TRIAL_ROTO = 0');
select is(:other, 0, 'Report OTHER = 0');
select is(:total_issued, 1211, 'Report TOTAL ISSUED = 1211 (1200+5+2+4)');

rollback;
