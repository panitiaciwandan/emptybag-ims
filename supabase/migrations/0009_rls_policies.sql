-- 0009_rls_policies.sql
-- EmptyBag-IMS: Row Level Security (PRD Section 18 - Access Control)
-- Enforcement model:
--  * Master/reference tables: SI can write, all authenticated can read.
--  * Operational tables (DO/transfer/transactions/stock/ledger/opname):
--    writes happen ONLY through SECURITY DEFINER RPC functions;
--    direct table writes are denied by RLS. Reads are role/location scoped.
--  * QC/environment/reports: any authenticated user can input.
--  * audit_logs: SI & LEADER read-only.

-- =============================================================
-- MASTER / REFERENCE TABLES
-- =============================================================
alter table public.roles enable row level security;
alter table public.permissions enable row level security;
alter table public.role_permissions enable row level security;
alter table public.products enable row level security;
alter table public.suppliers enable row level security;
alter table public.specifications enable row level security;
alter table public.pallets enable row level security;
alter table public.locations enable row level security;
alter table public.shifts enable row level security;
alter table public.items enable row level security;

create policy "roles_read_all_auth" on public.roles for select to authenticated using (true);
create policy "roles_write_si" on public.roles for all to authenticated using (public.current_user_role_code() = 'SI') with check (public.current_user_role_code() = 'SI');

create policy "permissions_read_all_auth" on public.permissions for select to authenticated using (true);
create policy "permissions_write_si" on public.permissions for all to authenticated using (public.current_user_role_code() = 'SI') with check (public.current_user_role_code() = 'SI');

create policy "role_permissions_read_all_auth" on public.role_permissions for select to authenticated using (true);
create policy "role_permissions_write_si" on public.role_permissions for all to authenticated using (public.current_user_role_code() = 'SI') with check (public.current_user_role_code() = 'SI');

create policy "products_read_all_auth" on public.products for select to authenticated using (true);
create policy "products_write_si" on public.products for all to authenticated using (public.current_user_role_code() = 'SI') with check (public.current_user_role_code() = 'SI');

create policy "suppliers_read_all_auth" on public.suppliers for select to authenticated using (true);
create policy "suppliers_write_si" on public.suppliers for all to authenticated using (public.current_user_role_code() = 'SI') with check (public.current_user_role_code() = 'SI');

create policy "specifications_read_all_auth" on public.specifications for select to authenticated using (true);
create policy "specifications_write_si" on public.specifications for all to authenticated using (public.current_user_role_code() = 'SI') with check (public.current_user_role_code() = 'SI');

create policy "pallets_read_all_auth" on public.pallets for select to authenticated using (true);
create policy "pallets_write_si" on public.pallets for all to authenticated using (public.current_user_role_code() = 'SI') with check (public.current_user_role_code() = 'SI');

create policy "locations_read_all_auth" on public.locations for select to authenticated using (true);
create policy "locations_write_si" on public.locations for all to authenticated using (public.current_user_role_code() = 'SI') with check (public.current_user_role_code() = 'SI');

create policy "shifts_read_all_auth" on public.shifts for select to authenticated using (true);
create policy "shifts_write_si" on public.shifts for all to authenticated using (public.current_user_role_code() = 'SI') with check (public.current_user_role_code() = 'SI');

create policy "items_read_all_auth" on public.items for select to authenticated using (true);
create policy "items_write_si" on public.items for all to authenticated using (public.current_user_role_code() = 'SI') with check (public.current_user_role_code() = 'SI');

-- =============================================================
-- USERS
-- =============================================================
alter table public.users enable row level security;

create policy "users_read_all_auth" on public.users for select to authenticated using (true);
-- Users may update their own profile; SI manages all.
create policy "users_update_self" on public.users for update to authenticated
  using (id = public.current_user_id() or public.current_user_role_code() = 'SI')
  with check (id = public.current_user_id() or public.current_user_role_code() = 'SI');
create policy "users_insert_si" on public.users for insert to authenticated
  with check (public.current_user_role_code() = 'SI');
create policy "users_delete_si" on public.users for delete to authenticated
  using (public.current_user_role_code() = 'SI');

-- =============================================================
-- DO (header + detail): read scoped by role; writes via RPC only
-- =============================================================
alter table public.do_header enable row level security;
alter table public.do_detail enable row level security;

create policy "do_header_read_auth" on public.do_header for select to authenticated using (true);
create policy "do_header_write_rpc" on public.do_header for all to authenticated using (false) with check (false);

create policy "do_detail_read_auth" on public.do_detail for select to authenticated using (true);
create policy "do_detail_write_rpc" on public.do_detail for all to authenticated using (false) with check (false);

-- =============================================================
-- TRANSFER (header + detail)
-- =============================================================
alter table public.transfer_header enable row level security;
alter table public.transfer_detail enable row level security;

create policy "transfer_header_read_auth" on public.transfer_header for select to authenticated
  using (public.is_location_visible(from_location_id) or public.is_location_visible(to_location_id));
create policy "transfer_header_write_rpc" on public.transfer_header for all to authenticated using (false) with check (false);

create policy "transfer_detail_read_auth" on public.transfer_detail for select to authenticated using (true);
create policy "transfer_detail_write_rpc" on public.transfer_detail for all to authenticated using (false) with check (false);

-- =============================================================
-- TRANSACTIONS + DETAILS + STOCK + LEDGER (core integrity tables)
-- Writes ONLY through SECURITY DEFINER RPCs. Reads scoped by location.
-- =============================================================
alter table public.transactions enable row level security;
alter table public.transaction_details enable row level security;
alter table public.stock enable row level security;
alter table public.stock_ledger enable row level security;

create policy "transactions_read_auth" on public.transactions for select to authenticated
  using (public.is_location_visible(location_id));
create policy "transactions_write_rpc" on public.transactions for all to authenticated using (false) with check (false);

create policy "transaction_details_read_auth" on public.transaction_details for select to authenticated using (true);
create policy "transaction_details_write_rpc" on public.transaction_details for all to authenticated using (false) with check (false);

create policy "stock_read_auth" on public.stock for select to authenticated
  using (public.is_location_visible(location_id));
create policy "stock_write_rpc" on public.stock for all to authenticated using (false) with check (false);

create policy "stock_ledger_read_auth" on public.stock_ledger for select to authenticated
  using (public.is_location_visible(location_id));
create policy "stock_ledger_write_rpc" on public.stock_ledger for all to authenticated using (false) with check (false);

-- =============================================================
-- STOCK OPNAME
-- =============================================================
alter table public.stock_opname enable row level security;

create policy "stock_opname_read_auth" on public.stock_opname for select to authenticated
  using (public.is_location_visible(location_id));
create policy "stock_opname_write_rpc" on public.stock_opname for all to authenticated using (false) with check (false);

-- =============================================================
-- QC / ENVIRONMENT / REPORTS (operator input)
-- =============================================================
alter table public.qc_sample enable row level security;
alter table public.environment_log enable row level security;
alter table public.reports enable row level security;

create policy "qc_read_auth" on public.qc_sample for select to authenticated using (true);
create policy "qc_insert_auth" on public.qc_sample for insert to authenticated with check (true);
create policy "qc_update_self" on public.qc_sample for update to authenticated
  using (checked_by = public.current_user_id() or public.current_user_role_code() in ('SI', 'LEADER'))
  with check (checked_by = public.current_user_id() or public.current_user_role_code() in ('SI', 'LEADER'));
create policy "qc_delete_si" on public.qc_sample for delete to authenticated using (public.current_user_role_code() = 'SI');

create policy "env_read_auth" on public.environment_log for select to authenticated using (true);
create policy "env_insert_auth" on public.environment_log for insert to authenticated with check (true);
create policy "env_update_self" on public.environment_log for update to authenticated
  using (recorded_by = public.current_user_id() or public.current_user_role_code() in ('SI', 'LEADER'))
  with check (recorded_by = public.current_user_id() or public.current_user_role_code() in ('SI', 'LEADER'));
create policy "env_delete_si" on public.environment_log for delete to authenticated using (public.current_user_role_code() = 'SI');

create policy "reports_read_auth" on public.reports for select to authenticated using (true);
create policy "reports_insert_auth" on public.reports for insert to authenticated with check (true);
create policy "reports_delete_si" on public.reports for delete to authenticated using (public.current_user_role_code() = 'SI');

-- =============================================================
-- AUDIT LOGS (SI & LEADER read-only; written by trigger as definer)
-- =============================================================
alter table public.audit_logs enable row level security;

create policy "audit_logs_read_si_leader" on public.audit_logs for select to authenticated
  using (public.current_user_role_code() in ('SI', 'LEADER'));
create policy "audit_logs_write_rpc" on public.audit_logs for all to authenticated using (false) with check (false);

-- =============================================================
-- Grant broad table privileges to service_role (bypasses RLS in admin paths)
-- =============================================================
grant all on all tables in schema public to service_role;
