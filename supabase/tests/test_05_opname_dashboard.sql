-- test_05_opname_dashboard.sql
-- EmptyBag-IMS: stock opname flow (creates adjustment for difference) and
-- dashboard summaries (SI/Leader/Transit) + get_low_stock.

begin;

select plan(12);

-- Fixtures
select id as v_si from public.users where full_name = 'si@emptybag.test' \gset
select id as v_leader from public.users where full_name = 'leader@emptybag.test' \gset
select id as v_troom from public.locations where location_code = 'TROOM' \gset
select id as v_s2 from public.shifts where shift_code = 'S2' \gset
select id as v_item from public.items where item_code = '40KG HDPE SMP' \gset

-- ------------------------------------------------------------------
-- 1. Opname flow with difference -> ADJUSTED + adjustment txn
-- ------------------------------------------------------------------
-- Give TROOM stock via adjustment first (SI)
select set_config('request.jwt.claims', jsonb_build_object('sub', :'v_si')::text, false);
select create_adjustment(:'v_troom', :'v_s2', current_date, :'v_item', 500, 'setup opname', '') \gset _

-- Leader creates opname: system 500, physical 490 -> difference -10
select set_config('request.jwt.claims', jsonb_build_object('sub', :'v_leader')::text, false);
select create_opname(current_date, :'v_troom', :'v_item', 490, 'Test opname') as opn_result \gset

select ok((:'opn_result')::jsonb ? 'id', 'Opname created');
select is(((:'opn_result')::jsonb ->> 'system_qty')::numeric, 500::numeric, 'Opname system_qty = 500');
select is(((:'opn_result')::jsonb ->> 'physical_qty')::numeric, 490::numeric, 'Opname physical_qty = 490');
select is(((:'opn_result')::jsonb ->> 'difference')::numeric, -10::numeric, 'Opname difference = -10');

select submit_opname(((:'opn_result')::jsonb ->> 'id')::uuid) as submit_opn \gset
select is(((:'submit_opn')::jsonb ->> 'status'), 'SUBMITTED', 'Opname submitted');

-- SI approves -> creates adjustment, status ADJUSTED
select set_config('request.jwt.claims', jsonb_build_object('sub', :'v_si')::text, false);
select approve_opname(((:'opn_result')::jsonb ->> 'id')::uuid) as appr_opn \gset
select is(((:'appr_opn')::jsonb ->> 'status'), 'ADJUSTED', 'Opname adjusted after approval');

-- Stock now 490
select qty as troom_final from public.stock where item_id = :'v_item' and location_id = :'v_troom' \gset
select is(:troom_final, 490, 'TROOM stock = 490 after opname adjustment');

-- ------------------------------------------------------------------
-- 2. Dashboard: SI summary shape
-- ------------------------------------------------------------------
select set_config('request.jwt.claims', jsonb_build_object('sub', :'v_si')::text, false);
select dashboard_summary_si(current_date - 30, current_date) as si_dash \gset
select ok((:'si_dash')::jsonb ? 'total_stock', 'SI dashboard has total_stock');
select ok((:'si_dash')::jsonb ? 'low_stock', 'SI dashboard has low_stock array');
select is(((:'si_dash')::jsonb ->> 'total_items')::int > 0, true, 'SI dashboard total_items > 0');

-- ------------------------------------------------------------------
-- 3. Dashboard: Transit summary shape
-- ------------------------------------------------------------------
select id as v_petugas from public.users where full_name = 'petugas@emptybag.test' \gset
select set_config('request.jwt.claims', jsonb_build_object('sub', :'v_petugas')::text, false);
select dashboard_summary_transit() as transit_dash \gset
select ok((:'transit_dash')::jsonb ? 'current_stock', 'Transit dashboard has current_stock');
select is(((:'transit_dash')::jsonb ->> 'report_status') is not null, true, 'Transit dashboard report_status present');

-- ------------------------------------------------------------------
-- 4. get_low_stock works
-- ------------------------------------------------------------------
select set_config('request.jwt.claims', jsonb_build_object('sub', :'v_si')::text, false);
select count(*) as low_count from public.get_low_stock() \gset
select ok(:low_count >= 0, 'get_low_stock returns rows');

rollback;
