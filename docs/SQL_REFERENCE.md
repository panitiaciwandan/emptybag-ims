# SQL Reference

Referensi objek database EmptyBag-IMS (PostgreSQL / Supabase).

## Tabel Utama

### Master
| Tabel | Keterangan |
| --- | --- |
| `roles` | Role: SI, LEADER, PETUGAS_TRANSIT |
| `permissions` | Izin per modul (create/read/update/delete/approve) |
| `role_permissions` | Mapping role-permission |
| `products` | Produk semen (SMP, SPK) |
| `suppliers` | Supplier (UKS) |
| `specifications` | Spec (AP85, AP65) |
| `pallets` | Master pallet |
| `locations` | WHS (WAREHOUSE), TROOM/TSIDE (TRANSIT) |
| `shifts` | S1/S2/S3, AM/PM (long shift) |
| `items` | Master empty bag (item_code = identifier utama) |
| `users` | Profil pengguna (FK auth.users) |

### Operasional
| Tabel | Keterangan |
| --- | --- |
| `do_header` / `do_detail` | Delivery Order |
| `transfer_header` / `transfer_detail` | Transfer antar lokasi |
| `transactions` / `transaction_details` | Transaksi stock (OPENING, TRANSFER_IN/OUT, ISSUE, ADJUSTMENT, RETURN) |
| `stock` | Saldo terkini per item per lokasi (derived, jangan di-edit langsung) |
| `stock_ledger` | Buku besar mutasi (append-only, sumber kebenaran) |
| `stock_opname` | Stock opname / hitung fisik |
| `qc_sample` | Sampling QC |
| `environment_log` | Log environment |
| `reports` | Metadata laporan/export history |
| `audit_logs` | Audit trail (append-only) |

## Enums

- `location_type`: WAREHOUSE, TRANSIT
- `unit_type`: PCS, PACK, PALLET
- `item_type`: WOVEN_PP, KRAFT, HDPE, JUMBO_BAG, OTHER
- `transaction_status`: DRAFT, SUBMITTED, APPROVED, VOID
- `do_status`: DRAFT, SUBMITTED, APPROVED, REJECTED, CLOSED, VOID
- `transfer_status`: DRAFT, IN_TRANSIT, RECEIVED, COMPLETED, VOID
- `opname_status`: DRAFT, SUBMITTED, APPROVED, ADJUSTED, VOID
- `transaction_type`: OPENING, TRANSFER_IN, TRANSFER_OUT, ISSUE, ADJUSTMENT, RETURN
- `consumption_category`: GOOD, DAMAGE, REJECT, BUFFER, LOWER, TRIAL_ROTO, OTHER
- `movement_type`: IN, OUT
- `qc_result`: PASS, REJECT
- `report_type`: SHIFT_REPORT, CONSUMPTION, STOCK, DO, TRANSFER
- `audit_action`: CREATE, UPDATE, DELETE, APPROVE, REJECT, VOID, LOGIN, EXPORT

## Fungsi Helper

| Fungsi | Keterangan |
| --- | --- |
| `current_user_id()` | UUID user dari JWT `sub` |
| `current_user_role_code()` | Role code user saat ini |
| `has_permission(module, action)` | Cek izin role |
| `require_role(text[])` | Wajib salah satu role (raise FORBIDDEN) |
| `is_location_visible(uuid)` | Cek visibilitas lokasi berdasarkan role |
| `next_doc_number(prefix, seq, date)` | Nomor dokumen `PREFIX-YYYYMMDD-000001` |
| `get_active_shift(ts)` | Shift aktif + shift_date (REGULAR/LONG) |
| `resolve_shift_date(shift_id, date)` | Shift date efektif |

## Business RPC (dipanggil frontend)

### DO
| Fungsi | Role |
| --- | --- |
| `create_do(do_date, shift_id, notes, items[])` | LEADER, PETUGAS_TRANSIT |
| `submit_do(do_id)` | LEADER, PETUGAS_TRANSIT |
| `approve_do(do_id)` | LEADER |
| `reject_do(do_id, reason)` | LEADER |
| `close_do(do_id)` | LEADER |
| `void_do(do_id, reason)` | SI |

### Issue / Adjustment
| Fungsi | Role |
| --- | --- |
| `create_issue(location_id, shift_id, date, do_id, notes, items[])` | LEADER, PETUGAS_TRANSIT |
| `create_adjustment(location_id, shift_id, date, item_id, qty, reason, notes)` | SI |
| `approve_transaction(transaction_id)` | LEADER (ISSUE) |
| `void_transaction(transaction_id, reason)` | SI |

### Transfer
| Fungsi | Role |
| --- | --- |
| `create_transfer(date, shift_id, from, to, notes, items[])` | LEADER |
| `submit_transfer(transfer_id)` | LEADER |
| `receive_transfer(transfer_id)` | LEADER, PETUGAS_TRANSIT |
| `approve_transfer(transfer_id)` | LEADER |
| `void_transfer(transfer_id, reason)` | SI |

### Opname / User
| Fungsi | Role |
| --- | --- |
| `create_opname(date, location_id, item_id, physical_qty, notes)` | LEADER, PETUGAS_TRANSIT |
| `submit_opname(opname_id)` | LEADER, PETUGAS_TRANSIT |
| `approve_opname(opname_id)` | SI (buat adjustment otomatis) |
| `set_user_active(user_id, active)` | SI |

### Dashboard / Laporan
| Fungsi | Keterangan |
| --- | --- |
| `dashboard_summary_si(date_from, date_to)` | Overview SI |
| `dashboard_summary_leader()` | Overview Leader |
| `dashboard_summary_transit()` | Overview Petugas Transit |
| `get_shift_consumption_report(date_from, date_to)` | Laporan konsumsi per shift |
| `get_low_stock()` | Item di bawah reorder point |

## Pola Mutasi Stock

Semua perubahan stock WAJIB melalui `stock_ledger`:

1. RPC bisnis membuat `transactions` + `transaction_details`.
2. RPC memanggil `fn_post_ledger_rows(...)` → insert `stock_ledger`.
3. Trigger `BEFORE INSERT` pada `stock_ledger`:
   - kunci baris `stock` (FOR UPDATE),
   - hitung `balance_after` (mencegah saldo negatif),
4. Trigger `AFTER INSERT`: tulis `stock.qty`, `last_ledger_id`.

Update langsung pada `stock` / `stock_ledger` ditolak oleh RLS.

## Format Nomor Dokumen

- DO: `DO-YYYYMMDD-000001`
- Transfer: `TRF-YYYYMMDD-000001`
- Transaksi: `TRX-YYYYMMDD-000001`
- Opname: `OPN-YYYYMMDD-000001`
