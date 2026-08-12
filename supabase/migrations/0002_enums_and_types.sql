-- 0002_enums_and_types.sql
-- EmptyBag-IMS: enumerated types aligned with PRD Section 9/10

create type public.location_type as enum ('WAREHOUSE', 'TRANSIT');

create type public.unit_type as enum ('PCS', 'PACK', 'PALLET');

create type public.item_type as enum ('WOVEN_PP', 'KRAFT', 'HDPE', 'JUMBO_BAG', 'OTHER');

create type public.transaction_status as enum ('DRAFT', 'SUBMITTED', 'APPROVED', 'VOID');

create type public.do_status as enum ('DRAFT', 'SUBMITTED', 'APPROVED', 'REJECTED', 'CLOSED', 'VOID');

create type public.transfer_status as enum ('DRAFT', 'IN_TRANSIT', 'RECEIVED', 'COMPLETED', 'VOID');

create type public.opname_status as enum ('DRAFT', 'SUBMITTED', 'APPROVED', 'ADJUSTED', 'VOID');

create type public.transaction_type as enum ('OPENING', 'TRANSFER_IN', 'TRANSFER_OUT', 'ISSUE', 'ADJUSTMENT', 'RETURN');

create type public.consumption_category as enum ('GOOD', 'DAMAGE', 'REJECT', 'BUFFER', 'LOWER', 'TRIAL_ROTO', 'OTHER');

create type public.movement_type as enum ('IN', 'OUT');

create type public.qc_result as enum ('PASS', 'REJECT');

create type public.report_type as enum ('SHIFT_REPORT', 'CONSUMPTION', 'STOCK', 'DO', 'TRANSFER');

create type public.audit_action as enum ('CREATE', 'UPDATE', 'DELETE', 'APPROVE', 'REJECT', 'VOID', 'LOGIN', 'EXPORT');
