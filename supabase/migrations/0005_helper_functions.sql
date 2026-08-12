-- 0005_helper_functions.sql
-- EmptyBag-IMS: helper + security functions (auth-aware, portable)

-- ---------------------------------------------------------------
-- Current user id (reads JWT claims set by PostgREST)
-- Works in Supabase and local testing (SET request.jwt.claims).
-- ---------------------------------------------------------------
create or replace function public.current_user_id()
returns uuid
language sql
stable
as $$
  select nullif(current_setting('request.jwt.claims', true)::jsonb ->> 'sub', '')::uuid
$$;

-- ---------------------------------------------------------------
-- Current user role code
-- SECURITY DEFINER so policies can call it without RLS recursion on users.
-- ---------------------------------------------------------------
create or replace function public.current_user_role_code()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select r.code
  from public.users u
  join public.roles r on r.id = u.role_id
  where u.id = public.current_user_id()
$$;

revoke all on function public.current_user_role_code() from public;
grant execute on function public.current_user_role_code() to authenticated, service_role;

-- ---------------------------------------------------------------
-- Check a permission exists for the current user's role
-- ---------------------------------------------------------------
create or replace function public.has_permission(p_module text, p_action text)
returns boolean
language sql
stable
as $$
  select exists (
    select 1
    from public.role_permissions rp
    join public.roles r on r.id = rp.role_id
    join public.permissions p on p.id = rp.permission_id
    join public.users u on u.role_id = r.id
    where u.id = public.current_user_id()
      and p.module = p_module
      and p.action = p_action
  )
$$;

-- ---------------------------------------------------------------
-- Require the current user to have one of the given roles
-- Raises exception otherwise (used inside SECURITY DEFINER RPCs).
-- ---------------------------------------------------------------
create or replace function public.require_role(p_roles text[])
returns void
language plpgsql
as $$
declare
  v_role text;
begin
  v_role := public.current_user_role_code();
  if v_role is null then
    raise exception 'UNAUTHORIZED' using errcode = 'P0001', hint = 'Silakan login terlebih dahulu.';
  end if;
  if not (v_role = any(p_roles)) then
    raise exception 'FORBIDDEN' using errcode = 'P0001', hint = 'Role ' || v_role || ' tidak memiliki akses.';
  end if;
end;
$$;

-- ---------------------------------------------------------------
-- Is a location visible to the current user?
-- SI & LEADER: all locations. PETUGAS_TRANSIT: only assigned locations.
-- SECURITY DEFINER so policies can call it without RLS recursion on users.
-- ---------------------------------------------------------------
create or replace function public.is_location_visible(p_location_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    public.current_user_role_code() in ('SI', 'LEADER')
    or p_location_id in (
      select unnest(u.location_ids) from public.users u where u.id = public.current_user_id()
    )
$$;

revoke all on function public.is_location_visible(uuid) from public;
grant execute on function public.is_location_visible(uuid) to authenticated, service_role;

-- ---------------------------------------------------------------
-- Next document number: PREFIX-YYYYMMDD-000001
-- ---------------------------------------------------------------
create or replace function public.next_doc_number(p_prefix text, p_seq_name text, p_date date default current_date)
returns text
language plpgsql
as $$
declare
  v_num bigint;
begin
  execute format('select nextval(%L)', p_seq_name) into v_num;
  return p_prefix || '-' || to_char(p_date, 'YYYYMMDD') || '-' || lpad(v_num::text, 6, '0');
end;
$$;

-- ---------------------------------------------------------------
-- Get active shift for a timestamp (handles Long Shift PM crossing midnight)
-- shift_date = date the shift STARTED (PRD Section 6.4).
-- shift_mode from app_settings: 'REGULAR' (S1/S2/S3) or 'LONG' (AM/PM).
-- ---------------------------------------------------------------
create or replace function public.get_active_shift(p_ts timestamptz default now())
returns table (shift_id uuid, shift_code text, shift_name text, shift_date date)
language plpgsql
stable
as $$
declare
  v_mode text;
  v_t time;
  v_d date;
begin
  v_mode := coalesce((select value from public.app_settings where key = 'shift_mode'), 'REGULAR');
  v_t := p_ts::time;
  v_d := p_ts::date;

  if v_mode = 'LONG' then
    -- Long Shift AM: 08:01 - 20:00 (same day)
    -- Long Shift PM: 20:01 - 08:00 (crosses midnight; shift_date = start day)
    if v_t between time '08:01' and time '20:00' then
      return query select s.id, s.shift_code, s.shift_name, v_d::date
        from public.shifts s where s.shift_code = 'AM' and s.is_active;
    else
      -- PM: t >= 20:01 (today) OR t <= 08:00 (previous day)
      if v_t >= time '20:01' then
        return query select s.id, s.shift_code, s.shift_name, v_d::date
          from public.shifts s where s.shift_code = 'PM' and s.is_active;
      else
        -- t <= 08:00 -> PM of previous day
        return query select s.id, s.shift_code, s.shift_name, (v_d - 1)::date
          from public.shifts s where s.shift_code = 'PM' and s.is_active;
      end if;
    end if;
  else
    -- Regular: S1 00:01-08:00, S2 08:01-16:00, S3 16:01-00:00 (start same day)
    if v_t between time '00:01' and time '08:00' then
      return query select s.id, s.shift_code, s.shift_name, v_d::date
        from public.shifts s where s.shift_code = 'S1' and s.is_active;
    elsif v_t between time '08:01' and time '16:00' then
      return query select s.id, s.shift_code, s.shift_name, v_d::date
        from public.shifts s where s.shift_code = 'S2' and s.is_active;
    elsif v_t >= time '16:01' then
      return query select s.id, s.shift_code, s.shift_name, v_d::date
        from public.shifts s where s.shift_code = 'S3' and s.is_active;
    else
      -- exactly 00:00 -> belongs to previous day S3
      return query select s.id, s.shift_code, s.shift_name, (v_d - 1)::date
        from public.shifts s where s.shift_code = 'S3' and s.is_active;
    end if;
  end if;
end;
$$;

-- ---------------------------------------------------------------
-- Resolve a shift for a given shift_id and transaction date:
-- returns the effective shift_date (used when manual shift is selected).
-- For PM long shift, shift_date is derived from the shift + date context.
-- ---------------------------------------------------------------
create or replace function public.resolve_shift_date(p_shift_id uuid, p_date date)
returns date
language plpgsql
stable
as $$
declare
  v_code text;
begin
  select shift_code into v_code from public.shifts where id = p_shift_id;
  if v_code = 'PM' then
    return p_date; -- caller passes the shift start date explicitly
  end if;
  return p_date;
end;
$$;
