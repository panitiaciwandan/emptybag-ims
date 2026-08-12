-- 0010_business_rpcs.sql
-- EmptyBag-IMS: business workflow RPCs (PRD Section 9 & 10)
-- All are SECURITY DEFINER + role-checked. All stock mutations flow through
-- stock_ledger via fn_post_ledger_rows (PRD: no direct stock updates).

-- =============================================================
-- DO (Delivery Order) workflow
-- =============================================================

-- Create DO (DRAFT)
create or replace function public.create_do(
  p_do_date date,
  p_shift_id uuid,
  p_notes text,
  p_items jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := public.current_user_id();
  v_do_id uuid;
  v_num text;
  v_item jsonb;
  v_header jsonb;
begin
  perform public.require_role(array['LEADER', 'PETUGAS_TRANSIT']);

  if p_items is null or jsonb_array_length(p_items) = 0 then
    raise exception 'VALIDATION' using errcode='P0001', hint='Minimal satu item DO wajib diisi.';
  end if;

  v_num := public.next_doc_number('DO', 'seq_do_number', p_do_date);

  insert into public.do_header (do_number, do_date, shift_id, requested_by, status, notes)
  values (v_num, p_do_date, p_shift_id, v_user, 'DRAFT', p_notes)
  returning id into v_do_id;

  for v_item in select * from jsonb_array_elements(p_items) loop
    insert into public.do_detail (do_id, item_id, requested_qty)
    values (v_do_id, (v_item ->> 'item_id')::uuid, (v_item ->> 'qty')::numeric);
  end loop;

  select to_jsonb(h) into v_header
    from public.do_header h where h.id = v_do_id;
  return v_header;
end;
$$;

-- Submit DO (DRAFT -> SUBMITTED)
create or replace function public.submit_do(p_do_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := public.current_user_id();
  v_header jsonb;
begin
  perform public.require_role(array['LEADER', 'PETUGAS_TRANSIT']);

  update public.do_header
     set status = 'SUBMITTED', updated_at = now()
   where id = p_do_id and status = 'DRAFT';

  if not found then
    raise exception 'STATE_TRANSITION' using errcode='P0001', hint='DO hanya dapat disubmit dari status DRAFT.';
  end if;

  insert into public.audit_logs (user_id, action, table_name, record_id, new_data)
  values (v_user, 'UPDATE', 'do_header', p_do_id, jsonb_build_object('status', 'SUBMITTED'));

  select to_jsonb(h) into v_header from public.do_header h where h.id = p_do_id;
  return v_header;
end;
$$;

-- Approve DO (SUBMITTED -> APPROVED) - Leader only
create or replace function public.approve_do(p_do_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := public.current_user_id();
  v_header jsonb;
begin
  perform public.require_role(array['LEADER']);

  update public.do_header
     set status = 'APPROVED', approved_by = v_user, approved_at = now(), updated_at = now()
   where id = p_do_id and status = 'SUBMITTED';

  if not found then
    raise exception 'STATE_TRANSITION' using errcode='P0001', hint='DO hanya dapat diapprove dari status SUBMITTED.';
  end if;

  insert into public.audit_logs (user_id, action, table_name, record_id, new_data)
  values (v_user, 'APPROVE', 'do_header', p_do_id, jsonb_build_object('status', 'APPROVED'));

  select to_jsonb(h) into v_header from public.do_header h where h.id = p_do_id;
  return v_header;
end;
$$;

-- Reject DO (SUBMITTED -> REJECTED) - Leader only
create or replace function public.reject_do(p_do_id uuid, p_reason text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := public.current_user_id();
  v_header jsonb;
begin
  perform public.require_role(array['LEADER']);

  update public.do_header
     set status = 'REJECTED', notes = coalesce(notes, '') || E'\nReject: ' || coalesce(p_reason, ''), updated_at = now()
   where id = p_do_id and status = 'SUBMITTED';

  if not found then
    raise exception 'STATE_TRANSITION' using errcode='P0001', hint='DO hanya dapat direject dari status SUBMITTED.';
  end if;

  insert into public.audit_logs (user_id, action, table_name, record_id, new_data)
  values (v_user, 'REJECT', 'do_header', p_do_id, jsonb_build_object('status', 'REJECTED', 'reason', p_reason));

  select to_jsonb(h) into v_header from public.do_header h where h.id = p_do_id;
  return v_header;
end;
$$;

-- Void DO (SI only)
create or replace function public.void_do(p_do_id uuid, p_reason text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := public.current_user_id();
  v_header jsonb;
begin
  perform public.require_role(array['SI']);

  update public.do_header
     set status = 'VOID', notes = coalesce(notes, '') || E'\nVoid: ' || coalesce(p_reason, ''), updated_at = now()
   where id = p_do_id and status in ('DRAFT', 'SUBMITTED', 'APPROVED');

  if not found then
    raise exception 'STATE_TRANSITION' using errcode='P0001', hint='DO tidak dapat divoid dari status saat ini.';
  end if;

  insert into public.audit_logs (user_id, action, table_name, record_id, new_data)
  values (v_user, 'VOID', 'do_header', p_do_id, jsonb_build_object('status', 'VOID', 'reason', p_reason));

  select to_jsonb(h) into v_header from public.do_header h where h.id = p_do_id;
  return v_header;
end;
$$;

-- Close DO when fully issued (APPROVED -> CLOSED) - Leader only
create or replace function public.close_do(p_do_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := public.current_user_id();
  v_header jsonb;
begin
  perform public.require_role(array['LEADER']);

  update public.do_header
     set status = 'CLOSED', updated_at = now()
   where id = p_do_id and status = 'APPROVED'
     and not exists (
       select 1 from public.do_detail dd
       where dd.do_id = p_do_id and dd.issued_qty < dd.requested_qty
     );

  if not found then
    raise exception 'DO_NOT_FULLY_ISSUED' using errcode='P0001',
      hint='DO hanya dapat ditutup bila seluruh item telah ter-issue penuh.';
  end if;

  insert into public.audit_logs (user_id, action, table_name, record_id, new_data)
  values (v_user, 'UPDATE', 'do_header', p_do_id, jsonb_build_object('status', 'CLOSED'));

  select to_jsonb(h) into v_header from public.do_header h where h.id = p_do_id;
  return v_header;
end;
$$;

-- =============================================================
-- ISSUE (consumption) workflow
-- =============================================================

-- Create ISSUE transaction (SUBMITTED). Leader/Petugas input.
create or replace function public.create_issue(
  p_location_id uuid,
  p_shift_id uuid,
  p_transaction_date date,
  p_do_id uuid,
  p_notes text,
  p_items jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := public.current_user_id();
  v_txn_id uuid;
  v_num text;
  v_item jsonb;
  v_cat public.consumption_category;
  v_reason text;
  v_header jsonb;
begin
  perform public.require_role(array['LEADER', 'PETUGAS_TRANSIT']);
  perform public.is_location_visible(p_location_id);

  if p_items is null or jsonb_array_length(p_items) = 0 then
    raise exception 'VALIDATION' using errcode='P0001', hint='Minimal satu item issue wajib diisi.';
  end if;

  if p_do_id is not null then
    if not exists (select 1 from public.do_header where id = p_do_id and status = 'APPROVED') then
      raise exception 'DO_NOT_APPROVED' using errcode='P0001', hint='Referensi DO harus berstatus APPROVED.';
    end if;
  end if;

  v_num := public.next_doc_number('TRX', 'seq_transaction_number', p_transaction_date);

  insert into public.transactions
    (transaction_number, transaction_type, transaction_date, shift_id, location_id,
     reference_type, reference_id, created_by, status, notes)
  values
    (v_num, 'ISSUE', p_transaction_date, p_shift_id, p_location_id,
     case when p_do_id is not null then 'DO' else null end, p_do_id,
     v_user, 'SUBMITTED', p_notes)
  returning id into v_txn_id;

  for v_item in select * from jsonb_array_elements(p_items) loop
    v_cat := nullif(v_item ->> 'category', '')::public.consumption_category;
    v_reason := nullif(v_item ->> 'reason', '');

    if v_cat is null then
      raise exception 'VALIDATION' using errcode='P0001', hint='Kategori konsumsi wajib dipilih.';
    end if;
    -- Additional categories require reason (PRD Section 9.4)
    if v_cat <> 'GOOD' and v_reason is null then
      raise exception 'REASON_REQUIRED' using errcode='P0001',
        hint='Kategori ' || v_cat || ' wajib menyertakan alasan.';
    end if;

    insert into public.transaction_details (transaction_id, item_id, qty, category, reason)
    values (v_txn_id, (v_item ->> 'item_id')::uuid, (v_item ->> 'qty')::numeric, v_cat, v_reason);
  end loop;

  select to_jsonb(t) into v_header from public.transactions t where t.id = v_txn_id;
  return v_header;
end;
$$;

-- Create ADJUSTMENT transaction (approved immediately; SI only)
create or replace function public.create_adjustment(
  p_location_id uuid,
  p_shift_id uuid,
  p_transaction_date date,
  p_item_id uuid,
  p_qty numeric,
  p_reason text,
  p_notes text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := public.current_user_id();
  v_txn_id uuid;
  v_num text;
  v_header jsonb;
begin
  perform public.require_role(array['SI']);

  if p_qty = 0 then
    raise exception 'VALIDATION' using errcode='P0001', hint='Qty adjustment tidak boleh 0.';
  end if;
  if p_reason is null or p_reason = '' then
    raise exception 'REASON_REQUIRED' using errcode='P0001', hint='Alasan adjustment wajib diisi.';
  end if;

  v_num := public.next_doc_number('TRX', 'seq_transaction_number', p_transaction_date);

  insert into public.transactions
    (transaction_number, transaction_type, transaction_date, shift_id, location_id,
     created_by, approved_by, status, notes)
  values
    (v_num, 'ADJUSTMENT', p_transaction_date, p_shift_id, p_location_id,
     v_user, v_user, 'APPROVED', coalesce(p_notes, p_reason))
  returning id into v_txn_id;

  insert into public.transaction_details (transaction_id, item_id, qty, category, reason)
  values (v_txn_id, p_item_id, abs(p_qty), null, p_reason);

  perform public.fn_post_ledger_rows(
    v_txn_id, p_transaction_date, p_shift_id,
    jsonb_build_array(jsonb_build_object('item_id', p_item_id, 'qty', p_qty)),
    v_user
  );

  select to_jsonb(t) into v_header from public.transactions t where t.id = v_txn_id;
  return v_header;
end;
$$;

-- Approve ISSUE transaction (SUBMITTED -> APPROVED; posts ledger) - Leader only
create or replace function public.approve_transaction(p_transaction_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := public.current_user_id();
  v_txn record;
  v_header jsonb;
  v_detail record;
  v_items jsonb := '[]'::jsonb;
  v_item jsonb;
begin
  perform public.require_role(array['LEADER']);

  select * into v_txn
    from public.transactions
   where id = p_transaction_id and status = 'SUBMITTED' and transaction_type = 'ISSUE'
   for update;

  if not found then
    raise exception 'STATE_TRANSITION' using errcode='P0001',
      hint='Hanya transaksi ISSUE berstatus SUBMITTED yang dapat diapprove.';
  end if;

  for v_detail in
    select * from public.transaction_details where transaction_id = v_txn.id
  loop
    v_items := v_items || jsonb_build_object('item_id', v_detail.item_id, 'qty', v_detail.qty, 'category', v_detail.category, 'reason', v_detail.reason);
  end loop;

  update public.transactions
     set status = 'APPROVED', approved_by = v_user, updated_at = now()
   where id = v_txn.id;

  perform public.fn_post_ledger_rows(v_txn.id, v_txn.transaction_date, v_txn.shift_id, v_items, v_user);

  -- Update DO issued_qty for GOOD category referencing approved DO (PRD Section 9.4)
  if v_txn.reference_type = 'DO' and v_txn.reference_id is not null then
    update public.do_detail dd
       set issued_qty = dd.issued_qty + td.qty, updated_at = now()
      from public.transaction_details td
     where td.transaction_id = v_txn.id
       and td.category = 'GOOD'
       and dd.do_id = v_txn.reference_id
       and dd.item_id = td.item_id;
  end if;

  insert into public.audit_logs (user_id, action, table_name, record_id, new_data)
  values (v_user, 'APPROVE', 'transactions', v_txn.id, jsonb_build_object('status', 'APPROVED'));

  select to_jsonb(t) into v_header from public.transactions t where t.id = v_txn.id;
  return v_header;
end;
$$;

-- Void transaction (SI). If already APPROVED, posts reversal ledger entries.
create or replace function public.void_transaction(p_transaction_id uuid, p_reason text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := public.current_user_id();
  v_txn record;
  v_detail record;
  v_rev_items jsonb := '[]'::jsonb;
  v_rev_qty numeric;
  v_header jsonb;
begin
  perform public.require_role(array['SI']);

  select * into v_txn from public.transactions
   where id = p_transaction_id and status in ('SUBMITTED', 'APPROVED')
   for update;

  if not found then
    raise exception 'STATE_TRANSITION' using errcode='P0001',
      hint='Transaksi tidak dapat divoid dari status saat ini.';
  end if;

  -- If posted, reverse each ledger entry (reverse direction keeps audit trail)
  if v_txn.status = 'APPROVED' then
    for v_detail in
      select * from public.transaction_details where transaction_id = v_txn.id
    loop
      v_rev_qty := case when v_txn.transaction_type in ('TRANSFER_IN', 'OPENING', 'RETURN')
                        then -v_detail.qty else v_detail.qty end;
      v_rev_items := v_rev_items || jsonb_build_object('item_id', v_detail.item_id, 'qty', v_rev_qty, 'category', v_detail.category, 'reason', 'VOID: ' || coalesce(p_reason, ''));
    end loop;

    perform public.fn_post_ledger_rows(v_txn.id, v_txn.transaction_date, v_txn.shift_id, v_rev_items, v_user);
  end if;

  update public.transactions
     set status = 'VOID', notes = coalesce(notes, '') || E'\nVoid: ' || coalesce(p_reason, ''), updated_at = now()
   where id = v_txn.id;

  insert into public.audit_logs (user_id, action, table_name, record_id, new_data)
  values (v_user, 'VOID', 'transactions', v_txn.id, jsonb_build_object('status', 'VOID', 'reason', p_reason));

  select to_jsonb(t) into v_header from public.transactions t where t.id = v_txn.id;
  return v_header;
end;
$$;

-- =============================================================
-- TRANSFER workflow (WHS -> Transit)
-- =============================================================

-- Create transfer (DRAFT) - Leader only
create or replace function public.create_transfer(
  p_transfer_date date,
  p_shift_id uuid,
  p_from_location_id uuid,
  p_to_location_id uuid,
  p_notes text,
  p_items jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := public.current_user_id();
  v_transfer_id uuid;
  v_num text;
  v_item jsonb;
  v_header jsonb;
begin
  perform public.require_role(array['LEADER']);

  if p_from_location_id = p_to_location_id then
    raise exception 'VALIDATION' using errcode='P0001', hint='Lokasi asal dan tujuan tidak boleh sama.';
  end if;
  if p_items is null or jsonb_array_length(p_items) = 0 then
    raise exception 'VALIDATION' using errcode='P0001', hint='Minimal satu item transfer wajib diisi.';
  end if;

  v_num := public.next_doc_number('TRF', 'seq_transfer_number', p_transfer_date);

  insert into public.transfer_header
    (transfer_number, transfer_date, shift_id, from_location_id, to_location_id, created_by, status, notes)
  values
    (v_num, p_transfer_date, p_shift_id, p_from_location_id, p_to_location_id, v_user, 'DRAFT', p_notes)
  returning id into v_transfer_id;

  for v_item in select * from jsonb_array_elements(p_items) loop
    insert into public.transfer_detail (transfer_id, item_id, qty, pallet_code)
    values (v_transfer_id, (v_item ->> 'item_id')::uuid, (v_item ->> 'qty')::numeric,
            nullif(v_item ->> 'pallet_code', ''));
  end loop;

  select to_jsonb(h) into v_header from public.transfer_header h where h.id = v_transfer_id;
  return v_header;
end;
$$;

-- Submit transfer (DRAFT -> IN_TRANSIT; posts TRANSFER_OUT from origin)
create or replace function public.submit_transfer(p_transfer_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := public.current_user_id();
  v_tf record;
  v_detail record;
  v_items jsonb := '[]'::jsonb;
  v_txn_id uuid;
  v_num text;
  v_header jsonb;
begin
  perform public.require_role(array['LEADER']);

  select * into v_tf from public.transfer_header
   where id = p_transfer_id and status = 'DRAFT'
   for update;

  if not found then
    raise exception 'STATE_TRANSITION' using errcode='P0001',
      hint='Transfer hanya dapat disubmit dari status DRAFT.';
  end if;

  for v_detail in select * from public.transfer_detail where transfer_id = v_tf.id loop
    v_items := v_items || jsonb_build_object('item_id', v_detail.item_id, 'qty', v_detail.qty);
  end loop;

  -- Post TRANSFER_OUT from origin location
  v_num := public.next_doc_number('TRX', 'seq_transaction_number', v_tf.transfer_date);

  insert into public.transactions
    (transaction_number, transaction_type, transaction_date, shift_id, location_id,
     reference_type, reference_id, created_by, approved_by, status, notes)
  values
    (v_num, 'TRANSFER_OUT', v_tf.transfer_date, v_tf.shift_id, v_tf.from_location_id,
     'TRANSFER', v_tf.id, v_user, v_user, 'APPROVED',
     'Transfer Out ' || v_tf.transfer_number)
  returning id into v_txn_id;

  perform public.fn_post_ledger_rows(v_txn_id, v_tf.transfer_date, v_tf.shift_id, v_items, v_user);

  update public.transfer_header
     set status = 'IN_TRANSIT', updated_at = now()
   where id = v_tf.id;

  insert into public.audit_logs (user_id, action, table_name, record_id, new_data)
  values (v_user, 'UPDATE', 'transfer_header', v_tf.id, jsonb_build_object('status', 'IN_TRANSIT'));

  select to_jsonb(h) into v_header from public.transfer_header h where h.id = v_tf.id;
  return v_header;
end;
$$;

-- Receive transfer (IN_TRANSIT -> RECEIVED; posts TRANSFER_IN to destination)
create or replace function public.receive_transfer(p_transfer_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := public.current_user_id();
  v_tf record;
  v_detail record;
  v_items jsonb := '[]'::jsonb;
  v_txn_id uuid;
  v_num text;
  v_header jsonb;
begin
  perform public.require_role(array['LEADER', 'PETUGAS_TRANSIT']);

  select * into v_tf from public.transfer_header
   where id = p_transfer_id and status = 'IN_TRANSIT'
   for update;

  if not found then
    raise exception 'STATE_TRANSITION' using errcode='P0001',
      hint='Transfer hanya dapat diterima dari status IN_TRANSIT.';
  end if;

  for v_detail in select * from public.transfer_detail where transfer_id = v_tf.id loop
    v_items := v_items || jsonb_build_object('item_id', v_detail.item_id, 'qty', v_detail.qty);
  end loop;

  -- Post TRANSFER_IN to destination location
  v_num := public.next_doc_number('TRX', 'seq_transaction_number', v_tf.transfer_date);

  insert into public.transactions
    (transaction_number, transaction_type, transaction_date, shift_id, location_id,
     reference_type, reference_id, created_by, approved_by, status, notes)
  values
    (v_num, 'TRANSFER_IN', v_tf.transfer_date, v_tf.shift_id, v_tf.to_location_id,
     'TRANSFER', v_tf.id, v_user, v_user, 'APPROVED',
     'Transfer In ' || v_tf.transfer_number)
  returning id into v_txn_id;

  perform public.fn_post_ledger_rows(v_txn_id, v_tf.transfer_date, v_tf.shift_id, v_items, v_user);

  update public.transfer_header
     set status = 'RECEIVED', received_by = v_user, updated_at = now()
   where id = v_tf.id;

  insert into public.audit_logs (user_id, action, table_name, record_id, new_data)
  values (v_user, 'UPDATE', 'transfer_header', v_tf.id, jsonb_build_object('status', 'RECEIVED'));

  select to_jsonb(h) into v_header from public.transfer_header h where h.id = v_tf.id;
  return v_header;
end;
$$;

-- Approve transfer (RECEIVED -> COMPLETED) - Leader only
create or replace function public.approve_transfer(p_transfer_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := public.current_user_id();
  v_header jsonb;
begin
  perform public.require_role(array['LEADER']);

  update public.transfer_header
     set status = 'COMPLETED', updated_at = now()
   where id = p_transfer_id and status = 'RECEIVED';

  if not found then
    raise exception 'STATE_TRANSITION' using errcode='P0001',
      hint='Transfer hanya dapat diapprove dari status RECEIVED.';
  end if;

  insert into public.audit_logs (user_id, action, table_name, record_id, new_data)
  values (v_user, 'APPROVE', 'transfer_header', p_transfer_id, jsonb_build_object('status', 'COMPLETED'));

  select to_jsonb(h) into v_header from public.transfer_header h where h.id = p_transfer_id;
  return v_header;
end;
$$;

-- Void transfer (SI). Only allowed if no stock movement posted (DRAFT).
create or replace function public.void_transfer(p_transfer_id uuid, p_reason text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := public.current_user_id();
  v_header jsonb;
begin
  perform public.require_role(array['SI']);

  update public.transfer_header
     set status = 'VOID', notes = coalesce(notes, '') || E'\nVoid: ' || coalesce(p_reason, ''), updated_at = now()
   where id = p_transfer_id and status = 'DRAFT';

  if not found then
    raise exception 'STATE_TRANSITION' using errcode='P0001',
      hint='Transfer hanya dapat divoid dari status DRAFT (belum ada mutasi stock).';
  end if;

  insert into public.audit_logs (user_id, action, table_name, record_id, new_data)
  values (v_user, 'VOID', 'transfer_header', p_transfer_id, jsonb_build_object('status', 'VOID', 'reason', p_reason));

  select to_jsonb(h) into v_header from public.transfer_header h where h.id = p_transfer_id;
  return v_header;
end;
$$;

-- =============================================================
-- STOCK OPNAME workflow
-- =============================================================

-- Create opname (DRAFT; system_qty from current stock)
create or replace function public.create_opname(
  p_opname_date date,
  p_location_id uuid,
  p_item_id uuid,
  p_physical_qty numeric,
  p_notes text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := public.current_user_id();
  v_opname_id uuid;
  v_sys_qty numeric;
  v_num text;
  v_header jsonb;
begin
  perform public.require_role(array['LEADER', 'PETUGAS_TRANSIT']);

  select coalesce(qty, 0) into v_sys_qty
    from public.stock where item_id = p_item_id and location_id = p_location_id;

  v_num := public.next_doc_number('OPN', 'seq_opname_number', p_opname_date);

  insert into public.stock_opname
    (opname_number, opname_date, location_id, item_id, system_qty, physical_qty, difference, status, notes)
  values
    (v_num, p_opname_date, p_location_id, p_item_id, v_sys_qty, p_physical_qty,
     p_physical_qty - v_sys_qty, 'DRAFT', p_notes)
  returning id into v_opname_id;

  select to_jsonb(o) into v_header from public.stock_opname o where o.id = v_opname_id;
  return v_header;
end;
$$;

-- Submit opname (DRAFT -> SUBMITTED)
create or replace function public.submit_opname(p_opname_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := public.current_user_id();
  v_header jsonb;
begin
  perform public.require_role(array['LEADER', 'PETUGAS_TRANSIT']);

  update public.stock_opname
     set status = 'SUBMITTED', updated_at = now()
   where id = p_opname_id and status = 'DRAFT';

  if not found then
    raise exception 'STATE_TRANSITION' using errcode='P0001',
      hint='Opname hanya dapat disubmit dari status DRAFT.';
  end if;

  select to_jsonb(o) into v_header from public.stock_opname o where o.id = p_opname_id;
  return v_header;
end;
$$;

-- Approve opname (SUBMITTED -> APPROVED/ADJUSTED; creates adjustment for diff) - SI only
create or replace function public.approve_opname(p_opname_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := public.current_user_id();
  v_opn record;
  v_shift_id uuid;
  v_txn_id uuid;
  v_num text;
  v_items jsonb;
  v_header jsonb;
  v_new_status public.opname_status;
begin
  perform public.require_role(array['SI']);

  select * into v_opn from public.stock_opname
   where id = p_opname_id and status = 'SUBMITTED'
   for update;

  if not found then
    raise exception 'STATE_TRANSITION' using errcode='P0001',
      hint='Opname hanya dapat diapprove dari status SUBMITTED.';
  end if;

  v_new_status := 'APPROVED';

  -- If difference exists, create and post adjustment automatically (PRD Section 9.4)
  if v_opn.difference <> 0 then
    select sh.shift_id into v_shift_id from public.get_active_shift((v_opn.opname_date || ' 08:00:00')::timestamptz) sh;

    v_num := public.next_doc_number('TRX', 'seq_transaction_number', v_opn.opname_date);

    insert into public.transactions
      (transaction_number, transaction_type, transaction_date, shift_id, location_id,
       created_by, approved_by, status, notes)
    values
      (v_num, 'ADJUSTMENT', v_opn.opname_date, v_shift_id, v_opn.location_id,
       v_user, v_user, 'APPROVED',
       'Selisih opname ' || v_opn.opname_number)
    returning id into v_txn_id;

    insert into public.transaction_details (transaction_id, item_id, qty, category, reason)
    values (v_txn_id, v_opn.item_id, abs(v_opn.difference), null,
            'Penyesuaian selisih stock opname ' || v_opn.opname_number);

    v_items := jsonb_build_array(jsonb_build_object('item_id', v_opn.item_id, 'qty', v_opn.difference));

    perform public.fn_post_ledger_rows(v_txn_id, v_opn.opname_date, v_shift_id, v_items, v_user);

    update public.stock_opname
       set status = 'ADJUSTED', adjusted_by = v_user, updated_at = now()
     where id = v_opn.id;
    v_new_status := 'ADJUSTED';
  else
    update public.stock_opname
       set status = 'APPROVED', adjusted_by = v_user, updated_at = now()
     where id = v_opn.id;
  end if;

  insert into public.audit_logs (user_id, action, table_name, record_id, new_data)
  values (v_user, 'APPROVE', 'stock_opname', v_opn.id, jsonb_build_object('status', v_new_status));

  select to_jsonb(o) into v_header from public.stock_opname o where o.id = v_opn.id;
  return v_header;
end;
$$;

-- =============================================================
-- USER MANAGEMENT
-- =============================================================

-- Activate / deactivate a user (SI only)
create or replace function public.set_user_active(p_user_id uuid, p_active boolean)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := public.current_user_id();
  v_profile jsonb;
begin
  perform public.require_role(array['SI']);

  update public.users
     set is_active = p_active, updated_at = now()
   where id = p_user_id;

  if not found then
    raise exception 'NOT_FOUND' using errcode='P0001', hint='User tidak ditemukan.';
  end if;

  insert into public.audit_logs (user_id, action, table_name, record_id, new_data)
  values (v_user, 'UPDATE', 'users', p_user_id, jsonb_build_object('is_active', p_active));

  select to_jsonb(u) into v_profile from public.users u where u.id = p_user_id;
  return v_profile;
end;
$$;

-- =============================================================
-- GRANTS: RPCs callable by authenticated users
-- =============================================================
grant execute on function
  public.create_do(date, uuid, text, jsonb),
  public.submit_do(uuid),
  public.approve_do(uuid),
  public.reject_do(uuid, text),
  public.void_do(uuid, text),
  public.close_do(uuid),
  public.create_issue(uuid, uuid, date, uuid, text, jsonb),
  public.create_adjustment(uuid, uuid, date, uuid, numeric, text, text),
  public.approve_transaction(uuid),
  public.void_transaction(uuid, text),
  public.create_transfer(date, uuid, uuid, uuid, text, jsonb),
  public.submit_transfer(uuid),
  public.receive_transfer(uuid),
  public.approve_transfer(uuid),
  public.void_transfer(uuid, text),
  public.create_opname(date, uuid, uuid, numeric, text),
  public.submit_opname(uuid),
  public.approve_opname(uuid),
  public.set_user_active(uuid, boolean)
to authenticated;
