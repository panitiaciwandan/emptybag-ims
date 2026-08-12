-- 0006_audit_trigger.sql
-- EmptyBag-IMS: generic audit trigger (append-only audit trail)

-- Generic trigger function: records INSERT/UPDATE/DELETE into audit_logs.
-- SECURITY DEFINER: audit_logs is append-only via RLS; trigger must run as owner.
create or replace function public.fn_audit_trigger()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := public.current_user_id();
  v_action public.audit_action;
  v_old jsonb;
  v_new jsonb;
  v_record_id uuid;
begin
  if tg_op = 'INSERT' then
    v_action := 'CREATE';
    v_record_id := coalesce(new.id, null);
    v_new := to_jsonb(new);
  elsif tg_op = 'UPDATE' then
    v_action := 'UPDATE';
    v_record_id := coalesce(new.id, old.id);
    v_old := to_jsonb(old);
    v_new := to_jsonb(new);
  elsif tg_op = 'DELETE' then
    v_action := 'DELETE';
    v_record_id := old.id;
    v_old := to_jsonb(old);
  end if;

  insert into public.audit_logs (user_id, action, table_name, record_id, old_data, new_data)
  values (v_user_id, v_action, tg_table_name, v_record_id, v_old, v_new);

  return coalesce(new, old);
end;
$$;

-- Apply the audit trigger to business tables.
-- Note: NOT applied to audit_logs (no recursion), stock (derived), stock_ledger (itself a ledger).
do $$
declare t text;
begin
  foreach t in array array[
    'users', 'items', 'products', 'suppliers', 'specifications', 'pallets',
    'locations', 'shifts', 'do_header', 'do_detail', 'transfer_header', 'transfer_detail',
    'transactions', 'transaction_details', 'stock_opname', 'qc_sample', 'environment_log', 'reports'
  ] loop
    execute format('create trigger trg_audit_%s after insert or update or delete on public.%I for each row execute function public.fn_audit_trigger()', t, t);
  end loop;
end $$;
