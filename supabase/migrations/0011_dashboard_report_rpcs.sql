-- 0011_dashboard_report_rpcs.sql
-- EmptyBag-IMS: dashboard summaries + shift report (PRD Section 8, 10, 11)

-- =============================================================
-- get_low_stock: items at or below reorder point per location
-- =============================================================
create or replace function public.get_low_stock()
returns table (
  item_id uuid,
  item_code text,
  item_name text,
  qty numeric,
  min_stock numeric,
  reorder_point numeric,
  location_id uuid,
  location_code text
)
language sql
stable
security definer
set search_path = public
as $$
  select s.item_id, i.item_code, i.item_name, s.qty, i.min_stock, i.reorder_point,
         s.location_id, l.location_code
  from public.stock s
  join public.items i on i.id = s.item_id
  join public.locations l on l.id = s.location_id
  where s.qty <= coalesce(i.reorder_point, i.min_stock, 0)
    and i.is_active
    and public.is_location_visible(s.location_id)
  order by s.qty asc
$$;

-- =============================================================
-- get_shift_consumption_report: PRD Section 8 - per shift per item,
-- with issued categories, current transit stock, and WHS transfer in.
-- =============================================================
create or replace function public.get_shift_consumption_report(
  p_date_from date,
  p_date_to date
)
returns table (
  report_date date,
  shift_code text,
  pic text,
  item_code text,
  item_name text,
  good numeric,
  damage numeric,
  reject numeric,
  buffer numeric,
  lower numeric,
  trial_roto numeric,
  other numeric,
  total_issued numeric,
  stock_transit_room numeric,
  stock_transit_side numeric,
  transfer_from_whs numeric
)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  return query
  with issued as (
    select t.transaction_date as report_date,
           sh.shift_code,
           u.full_name as pic,
           i.item_code,
           i.item_name,
           coalesce(sum(td.qty) filter (where td.category = 'GOOD'), 0) as good,
           coalesce(sum(td.qty) filter (where td.category = 'DAMAGE'), 0) as damage,
           coalesce(sum(td.qty) filter (where td.category = 'REJECT'), 0) as reject,
           coalesce(sum(td.qty) filter (where td.category = 'BUFFER'), 0) as buffer,
           coalesce(sum(td.qty) filter (where td.category = 'LOWER'), 0) as lower,
           coalesce(sum(td.qty) filter (where td.category = 'TRIAL_ROTO'), 0) as trial_roto,
           coalesce(sum(td.qty) filter (where td.category = 'OTHER'), 0) as other,
           coalesce(sum(td.qty), 0) as total_issued
    from public.transactions t
    join public.transaction_details td on td.transaction_id = t.id
    join public.items i on i.id = td.item_id
    join public.shifts sh on sh.id = t.shift_id
    join public.users u on u.id = t.created_by
    where t.transaction_type = 'ISSUE'
      and t.status = 'APPROVED'
      and t.transaction_date between p_date_from and p_date_to
    group by t.transaction_date, sh.shift_code, u.full_name, i.item_code, i.item_name
  ),
  -- Transfer from central WHS into transit locations on each date
  trf as (
    select t.transaction_date as report_date,
           i.item_code,
           sum(td.qty) as qty
    from public.transactions t
    join public.transaction_details td on td.transaction_id = t.id
    join public.items i on i.id = td.item_id
    join public.locations l on l.id = t.location_id
    where t.transaction_type = 'TRANSFER_IN'
      and t.status = 'APPROVED'
      and t.transaction_date between p_date_from and p_date_to
      and l.location_type = 'TRANSIT'
    group by t.transaction_date, i.item_code
  ),
  -- Current stock at transit locations
  stk as (
    select s.item_id, i.item_code,
           coalesce(sum(s.qty) filter (where l.location_code = 'TROOM'), 0) as stock_transit_room,
           coalesce(sum(s.qty) filter (where l.location_code = 'TSIDE'), 0) as stock_transit_side
    from public.stock s
    join public.locations l on l.id = s.location_id
    join public.items i on i.id = s.item_id
    where l.location_type = 'TRANSIT'
    group by s.item_id, i.item_code
  )
  select iss.report_date,
         iss.shift_code,
         iss.pic,
         iss.item_code,
         iss.item_name,
         iss.good, iss.damage, iss.reject, iss.buffer, iss.lower, iss.trial_roto, iss.other,
         iss.total_issued,
         coalesce(stk.stock_transit_room, 0),
         coalesce(stk.stock_transit_side, 0),
         coalesce(trf.qty, 0)
  from issued iss
  left join trf on trf.report_date = iss.report_date and trf.item_code = iss.item_code
  left join stk on stk.item_code = iss.item_code
  order by iss.report_date desc, iss.shift_code, iss.item_code;
end;
$$;

-- =============================================================
-- dashboard_summary_si: enterprise overview for SI
-- =============================================================
create or replace function public.dashboard_summary_si(p_date_from date, p_date_to date)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_result jsonb;
  v_total_stock numeric;
  v_total_items bigint;
  v_today_consumption numeric;
  v_today_damage numeric;
  v_today_reject numeric;
  v_today_lower numeric;
  v_today_buffer numeric;
  v_today_good numeric;
  v_low_stock_count bigint;
  v_low_stock jsonb;
  v_by_location jsonb;
  v_by_category jsonb;
  v_trend jsonb;
begin
  select coalesce(sum(qty), 0) into v_total_stock from public.stock;
  select count(distinct item_id) into v_total_items from public.stock where qty <> 0;

  select coalesce(sum(td.qty), 0),
         coalesce(sum(td.qty) filter (where td.category = 'DAMAGE'), 0),
         coalesce(sum(td.qty) filter (where td.category = 'REJECT'), 0),
         coalesce(sum(td.qty) filter (where td.category = 'LOWER'), 0),
         coalesce(sum(td.qty) filter (where td.category = 'BUFFER'), 0),
         coalesce(sum(td.qty) filter (where td.category = 'GOOD'), 0)
  into v_today_consumption, v_today_damage, v_today_reject, v_today_lower, v_today_buffer, v_today_good
  from public.transactions t
  join public.transaction_details td on td.transaction_id = t.id
  where t.transaction_type = 'ISSUE'
    and t.status = 'APPROVED'
    and t.transaction_date between p_date_from and p_date_to;

  select count(*) into v_low_stock_count from public.get_low_stock();

  select coalesce(jsonb_agg(jsonb_build_object(
           'item_code', ls.item_code,
           'item_name', ls.item_name,
           'qty', ls.qty,
           'min_stock', ls.min_stock,
           'location_code', ls.location_code)), '[]'::jsonb)
  into v_low_stock
  from public.get_low_stock() ls;

  select coalesce(jsonb_agg(jsonb_build_object(
           'location_code', l.location_code,
           'location_name', l.location_name,
           'total', s.total)), '[]'::jsonb)
  into v_by_location
  from (
    select location_id, sum(qty) as total
    from public.stock group by location_id
  ) s
  join public.locations l on l.id = s.location_id;

  select coalesce(jsonb_agg(jsonb_build_object('category', c.category, 'total', c.total)), '[]'::jsonb)
  into v_by_category
  from (
    select td.category, sum(td.qty) as total
    from public.transactions t
    join public.transaction_details td on td.transaction_id = t.id
    where t.transaction_type = 'ISSUE' and t.status = 'APPROVED'
      and t.transaction_date between p_date_from and p_date_to
    group by td.category
  ) c;

  select coalesce(jsonb_agg(jsonb_build_object('day', d.day, 'total', d.total) order by d.day), '[]'::jsonb)
  into v_trend
  from (
    select to_char(transaction_date, 'YYYY-MM-DD') as day, sum(td.qty) as total
    from public.transactions t
    join public.transaction_details td on td.transaction_id = t.id
    where t.transaction_type = 'ISSUE' and t.status = 'APPROVED'
      and t.transaction_date between p_date_from and p_date_to
    group by to_char(transaction_date, 'YYYY-MM-DD')
  ) d;

  v_result := jsonb_build_object(
    'total_stock', coalesce(v_total_stock, 0),
    'total_items', v_total_items,
    'today_consumption', coalesce(v_today_consumption, 0),
    'today_damage', coalesce(v_today_damage, 0),
    'today_reject', coalesce(v_today_reject, 0),
    'today_lower', coalesce(v_today_lower, 0),
    'today_buffer', coalesce(v_today_buffer, 0),
    'today_good', coalesce(v_today_good, 0),
    'low_stock_count', v_low_stock_count,
    'low_stock', v_low_stock,
    'by_location', v_by_location,
    'by_category', v_by_category,
    'trend', v_trend
  );

  return v_result;
end;
$$;

-- =============================================================
-- dashboard_summary_leader: operational overview for Leader
-- =============================================================
create or replace function public.dashboard_summary_leader()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_result jsonb;
  v_draft bigint;
  v_in_transit bigint;
  v_today_consumption numeric;
  v_transit_stock jsonb;
  v_recent jsonb;
  v_today date := current_date;
begin
  select count(*) into v_draft from public.transfer_header where status = 'DRAFT';
  select count(*) into v_in_transit from public.transfer_header where status = 'IN_TRANSIT';

  select coalesce(sum(td.qty), 0) into v_today_consumption
  from public.transactions t
  join public.transaction_details td on td.transaction_id = t.id
  where t.transaction_type = 'ISSUE'
    and t.status = 'APPROVED'
    and t.transaction_date = v_today;

  select coalesce(jsonb_agg(jsonb_build_object(
           'item_code', i.item_code,
           'item_name', i.item_name,
           'qty', s.qty,
           'location_code', l.location_code) order by l.location_code, i.item_code), '[]'::jsonb)
  into v_transit_stock
  from public.stock s
  join public.locations l on l.id = s.location_id
  join public.items i on i.id = s.item_id
  where l.location_type = 'TRANSIT' and s.qty > 0;

  select coalesce(jsonb_agg(jsonb_build_object(
           'id', t.id,
           'transaction_number', t.transaction_number,
           'transaction_type', t.transaction_type,
           'created_at', t.created_at,
           'status', t.status) order by t.created_at desc), '[]'::jsonb)
  into v_recent
  from public.transactions t
  limit 10;

  v_result := jsonb_build_object(
    'draft_transfers', v_draft,
    'in_transit_transfers', v_in_transit,
    'today_consumption', coalesce(v_today_consumption, 0),
    'transit_stock', v_transit_stock,
    'recent_activity', v_recent
  );

  return v_result;
end;
$$;

-- =============================================================
-- dashboard_summary_transit: lightweight overview for Petugas Transit
-- =============================================================
create or replace function public.dashboard_summary_transit()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_result jsonb;
  v_current_stock jsonb;
  v_today_issued numeric;
  v_today_qc bigint;
  v_today_env bigint;
  v_report_status text;
  v_today date := current_date;
  v_shift record;
  v_shift_date date;
begin
  select * into v_shift from public.get_active_shift() limit 1;

  select coalesce(jsonb_agg(jsonb_build_object(
           'item_code', i.item_code,
           'item_name', i.item_name,
           'qty', s.qty,
           'location_code', l.location_code) order by l.location_code, i.item_code), '[]'::jsonb)
  into v_current_stock
  from public.stock s
  join public.locations l on l.id = s.location_id
  join public.items i on i.id = s.item_id
  where public.is_location_visible(s.location_id)
    and s.qty > 0;

  select coalesce(sum(td.qty), 0) into v_today_issued
  from public.transactions t
  join public.transaction_details td on td.transaction_id = t.id
  where t.transaction_type = 'ISSUE'
    and t.status = 'APPROVED'
    and t.transaction_date = v_today;

  select count(*) into v_today_qc from public.qc_sample where qc_date = v_today;
  select count(*) into v_today_env from public.environment_log where log_date = v_today;

  select case when count(*) > 0 then 'COMPLETED' else 'PENDING' end into v_report_status
  from public.reports where report_date = v_today;

  v_result := jsonb_build_object(
    'current_stock', v_current_stock,
    'today_issued', coalesce(v_today_issued, 0),
    'today_qc', v_today_qc,
    'today_env', v_today_env,
    'report_status', v_report_status
  );

  return v_result;
end;
$$;

-- =============================================================
-- GRANTS
-- =============================================================
grant execute on function
  public.get_low_stock(),
  public.get_shift_consumption_report(date, date),
  public.dashboard_summary_si(date, date),
  public.dashboard_summary_leader(),
  public.dashboard_summary_transit()
to authenticated;
