-- 0007_stock_engine.sql
-- EmptyBag-IMS: core stock engine
-- Rule: ALL stock changes go through stock_ledger. Stock table is updated
-- atomically by a trigger within the same transaction (PRD Section 8.2/8.5).

-- ---------------------------------------------------------------
-- Triggers: process a stock_ledger INSERT atomically.
--   * BEFORE INSERT: lock stock row, compute balance_after (set on NEW).
--   * AFTER INSERT: update stock row (row now exists, so the FK
--     stock.last_ledger_id -> stock_ledger.id is satisfiable).
-- Prevents negative stock for OUT movements (soft check enforced hard).
-- ---------------------------------------------------------------
create or replace function public.fn_stock_ledger_process()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_prev numeric := 0;
  v_delta numeric;
  v_has boolean;
begin
  select true into v_has from public.stock
    where item_id = new.item_id and location_id = new.location_id
    for update;

  if v_has is null then
    insert into public.stock (item_id, location_id, qty)
    values (new.item_id, new.location_id, 0);
    v_prev := 0;
  else
    select qty into v_prev from public.stock
      where item_id = new.item_id and location_id = new.location_id;
  end if;

  v_delta := case when new.movement_type = 'IN' then new.qty else -new.qty end;

  if v_prev + v_delta < 0 then
    raise exception 'INSUFFICIENT_STOCK: item=% location=% balance=% need=%',
      new.item_id, new.location_id, v_prev, -v_delta;
  end if;

  new.balance_after := v_prev + v_delta;

  return new;
end;
$$;

create trigger trg_stock_ledger_process
  before insert on public.stock_ledger
  for each row execute function public.fn_stock_ledger_process();

-- AFTER trigger: writes the stock balance once the ledger row exists.
create or replace function public.fn_stock_ledger_apply()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.stock
     set qty = new.balance_after,
         last_ledger_id = new.id,
         updated_at = now()
   where item_id = new.item_id and location_id = new.location_id;

  return new;
end;
$$;

create trigger trg_stock_ledger_apply
  after insert on public.stock_ledger
  for each row execute function public.fn_stock_ledger_apply();

-- ---------------------------------------------------------------
-- Core helper: post ledger rows for a transaction's details.
-- Called ONLY from SECURITY DEFINER RPC functions.
-- Each detail produces one ledger row (movement OUT for ISSUE/TRANSFER_OUT,
-- IN for TRANSFER_IN/OPENING, +/- for ADJUSTMENT).
-- ---------------------------------------------------------------
create or replace function public.fn_post_ledger_rows(
  p_transaction_id uuid,
  p_ledger_date date,
  p_shift_id uuid,
  p_items jsonb,
  p_created_by uuid
)
returns void
language plpgsql
as $$
declare
  v_item jsonb;
  v_item_id uuid;
  v_qty numeric;
  v_cat public.consumption_category;
  v_reason text;
  v_type public.transaction_type;
  v_loc uuid;
  v_movement public.movement_type;
begin
  select transaction_type, location_id into v_type, v_loc
    from public.transactions where id = p_transaction_id;

  for v_item in select * from jsonb_array_elements(p_items) loop
    v_item_id := (v_item ->> 'item_id')::uuid;
    v_qty := abs((v_item ->> 'qty')::numeric);
    v_cat := nullif(v_item ->> 'category', '')::public.consumption_category;
    v_reason := nullif(v_item ->> 'reason', '');

    if v_type = 'ADJUSTMENT' then
      -- qty sign decides direction
      if (v_item ->> 'qty')::numeric >= 0 then
        v_movement := 'IN'::public.movement_type;
      else
        v_movement := 'OUT'::public.movement_type;
      end if;
    elsif v_type in ('ISSUE', 'TRANSFER_OUT') then
      v_movement := 'OUT'::public.movement_type;
    else -- OPENING, TRANSFER_IN, RETURN
      v_movement := 'IN'::public.movement_type;
    end if;

    insert into public.stock_ledger (
      ledger_date, shift_id, item_id, location_id, transaction_id,
      transaction_type, movement_type, category, qty, created_by
    ) values (
      p_ledger_date, p_shift_id, v_item_id, v_loc, p_transaction_id,
      v_type, v_movement, v_cat, v_qty, p_created_by
    );
  end loop;
end;
$$;

-- ---------------------------------------------------------------
-- Maintenance: recompute stock balances from ledger (reconciliation).
-- Used for anomaly detection / after manual import.
-- ---------------------------------------------------------------
create or replace function public.recompute_stock()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  r record;
  v_bal numeric;
begin
  -- Reset balances
  update public.stock set qty = 0;

  -- Rebuild from ledger in chronological order
  for r in
    select item_id, location_id, movement_type, qty, id
    from public.stock_ledger
    order by created_at asc, id asc
  loop
    update public.stock
       set qty = qty + case when r.movement_type = 'IN' then r.qty else -r.qty end,
           last_ledger_id = r.id,
           updated_at = now()
     where item_id = r.item_id and location_id = r.location_id;
  end loop;
end;
$$;

-- Rebuild missing stock rows for any ledger entries
create or replace function public.ensure_stock_rows()
returns void
language sql
security definer
set search_path = public
as $$
  insert into public.stock (item_id, location_id, qty)
  select distinct sl.item_id, sl.location_id, 0
  from public.stock_ledger sl
  on conflict (item_id, location_id) do nothing;
$$;
