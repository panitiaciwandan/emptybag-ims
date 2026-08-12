-- 0008_indexes.sql
-- EmptyBag-IMS: performance indexes (PRD Section 19 - <3s response)
-- FK + date + status indexes for all hot query paths.

create index if not exists idx_do_header_date on public.do_header(do_date);
create index if not exists idx_do_header_status on public.do_header(status);
create index if not exists idx_do_header_shift on public.do_header(shift_id);
create index if not exists idx_do_detail_do on public.do_detail(do_id);
create index if not exists idx_do_detail_item on public.do_detail(item_id);

create index if not exists idx_transfer_header_date on public.transfer_header(transfer_date);
create index if not exists idx_transfer_header_status on public.transfer_header(status);
create index if not exists idx_transfer_header_from on public.transfer_header(from_location_id);
create index if not exists idx_transfer_header_to on public.transfer_header(to_location_id);
create index if not exists idx_transfer_detail_transfer on public.transfer_detail(transfer_id);
create index if not exists idx_transfer_detail_item on public.transfer_detail(item_id);

create index if not exists idx_transactions_date on public.transactions(transaction_date);
create index if not exists idx_transactions_type on public.transactions(transaction_type);
create index if not exists idx_transactions_status on public.transactions(status);
create index if not exists idx_transactions_location on public.transactions(location_id);
create index if not exists idx_transactions_shift on public.transactions(shift_id);
create index if not exists idx_transactions_created_by on public.transactions(created_by);
create index if not exists idx_transactions_reference on public.transactions(reference_type, reference_id);
create index if not exists idx_transaction_details_transaction on public.transaction_details(transaction_id);
create index if not exists idx_transaction_details_item on public.transaction_details(item_id);

create index if not exists idx_stock_location on public.stock(location_id);
create index if not exists idx_stock_item on public.stock(item_id);

create index if not exists idx_stock_ledger_date on public.stock_ledger(ledger_date);
create index if not exists idx_stock_ledger_item on public.stock_ledger(item_id);
create index if not exists idx_stock_ledger_location on public.stock_ledger(location_id);
create index if not exists idx_stock_ledger_transaction on public.stock_ledger(transaction_id);
create index if not exists idx_stock_ledger_type on public.stock_ledger(transaction_type);
create index if not exists idx_stock_ledger_category on public.stock_ledger(category);
create index if not exists idx_stock_ledger_movement on public.stock_ledger(movement_type);

create index if not exists idx_opname_date on public.stock_opname(opname_date);
create index if not exists idx_opname_status on public.stock_opname(status);
create index if not exists idx_opname_location on public.stock_opname(location_id);
create index if not exists idx_opname_item on public.stock_opname(item_id);

create index if not exists idx_qc_date on public.qc_sample(qc_date);
create index if not exists idx_qc_shift on public.qc_sample(shift_id);
create index if not exists idx_env_date on public.environment_log(log_date);
create index if not exists idx_env_shift on public.environment_log(shift_id);
create index if not exists idx_reports_date on public.reports(report_date);
create index if not exists idx_reports_type on public.reports(report_type);

create index if not exists idx_audit_logs_created on public.audit_logs(created_at desc);
create index if not exists idx_audit_logs_table on public.audit_logs(table_name);
create index if not exists idx_audit_logs_user on public.audit_logs(user_id);
