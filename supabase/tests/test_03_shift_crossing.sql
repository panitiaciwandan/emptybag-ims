-- test_03_shift_crossing.sql
-- EmptyBag-IMS shift boundary test (PRD Section 6.4):
-- Long shift PM 20:01-08:00 crosses midnight; shift_date = shift start day.
-- Also verifies S1/S2/S3 regular boundaries.

begin;

select plan(12);

-- Fixtures
select id as v_am from public.shifts where shift_code = 'AM' \gset
select id as v_pm from public.shifts where shift_code = 'PM' \gset
select id as v_s1 from public.shifts where shift_code = 'S1' \gset
select id as v_s2 from public.shifts where shift_code = 'S2' \gset
select id as v_s3 from public.shifts where shift_code = 'S3' \gset

-- Activate AM/PM (seed leaves them inactive)
update public.shifts set is_active = true where shift_code in ('AM', 'PM');

-- Switch to LONG shift mode for long-shift assertions
insert into public.app_settings (key, value) values ('shift_mode', 'LONG')
on conflict (key) do update set value = excluded.value;

-- ------------------------------------------------------------------
-- LONG mode
-- ------------------------------------------------------------------
-- PM started 2026-01-10 22:00 -> shift_date = 2026-01-10 (start day)
select shift_code as sc, shift_date as sd from public.get_active_shift('2026-01-10 22:00:00+00') \gset
select is(:'sc'::text, 'PM', 'Long mode: 22:00 -> PM');
select is((:'sd')::date, date '2026-01-10', 'PM shift_date = start day');

-- PM crossing midnight: 2026-01-11 02:00 -> still PM, shift_date = 2026-01-10
select shift_code as sc, shift_date as sd from public.get_active_shift('2026-01-11 02:00:00+00') \gset
select is(:'sc'::text, 'PM', 'Long mode: 02:00 (after midnight) -> PM');
select is((:'sd')::date, date '2026-01-10', 'PM after midnight keeps start-day shift_date');

-- AM: 2026-01-11 09:00 -> AM, same day
select shift_code as sc, shift_date as sd from public.get_active_shift('2026-01-11 09:00:00+00') \gset
select is(:'sc'::text, 'AM', 'Long mode: 09:00 -> AM');
select is((:'sd')::date, date '2026-01-11', 'AM shift_date = same day');

-- ------------------------------------------------------------------
-- REGULAR mode (S1/S2/S3)
-- ------------------------------------------------------------------
update public.app_settings set value = 'REGULAR' where key = 'shift_mode';

-- S1: 2026-01-11 05:00
select shift_code as sc, shift_date as sd from public.get_active_shift('2026-01-11 05:00:00+00') \gset
select is(:'sc'::text, 'S1', 'Regular: 05:00 -> S1');
select is((:'sd')::date, date '2026-01-11', 'S1 shift_date = same day');

-- S2: 2026-01-11 12:00
select shift_code as sc from public.get_active_shift('2026-01-11 12:00:00+00') \gset
select is(:'sc'::text, 'S2', 'Regular: 12:00 -> S2');

-- S3: 2026-01-11 22:00 (same day)
select shift_code as sc, shift_date as sd from public.get_active_shift('2026-01-11 22:00:00+00') \gset
select is(:'sc'::text, 'S3', 'Regular: 22:00 -> S3');
select is((:'sd')::date, date '2026-01-11', 'S3 shift_date = same day');

-- Exactly midnight 00:00 -> previous day S3
select shift_code as sc, shift_date as sd from public.get_active_shift('2026-01-11 00:00:00+00') \gset
select is(:'sc'::text, 'S3', 'Regular: 00:00 -> previous-day S3');
select is((:'sd')::date, date '2026-01-10', '00:00 shift_date = previous day');

-- Restore default shift mode
update public.app_settings set value = 'REGULAR' where key = 'shift_mode';

rollback;
