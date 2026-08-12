# Project Info

Ringkasan arsitektur dan keputusan desain EmptyBag-IMS.

## Ringkasan

EmptyBag-IMS adalah sistem manajemen inventory empty bag untuk pabrik semen:
mencatat masuk/keluar empty bag di warehouse dan transit, konsumsi per shift,
QC, environment monitoring, stock opname, dan pelaporan.

- **Platform**: PWA (installable, offline-ready), mobile-first untuk operator, enterprise dashboard untuk SI.
- **Backend**: Supabase PostgreSQL (free tier). Semua aturan bisnis di database.
- **Biaya**: 0 rupiah.

## Keputusan Desain Utama

### 1. Backend = Database (no custom server)
Karena budget 0 dan tidak ada server backend khusus, seluruh logika bisnis
diimplementasikan sebagai:
- **RPC functions** (SECURITY DEFINER) untuk mutasi,
- **RLS policies** untuk otorisasi,
- **Triggers** untuk integritas stock.

### 2. Stock Ledger sebagai satu-satunya sumber kebenaran
PRD menetapkan semua perubahan stock wajib melalui `stock_ledger` dan tidak
boleh update `stock` langsung. Implementasi:
- Tabel `stock` adalah turunan (derived) dari ledger.
- Trigger BEFORE INSERT menghitung `balance_after` dan melarang saldo negatif.
- Trigger AFTER INSERT memperbarui `stock` secara atomik dalam transaksi yang sama.
- RLS memblokir INSERT/UPDATE/DELETE langsung pada `stock` dan `stock_ledger`.

### 3. Auth-aware fungsi
`current_user_id()` membaca klaim JWT `sub` dari `request.jwt.claims` (di-set
PostgREST/Supabase). Pendekatan ini membuat SQL yang sama bisa diuji lokal
dengan `SET request.jwt.claims` dan mock auth schema.

### 4. Shift berjalan melintasi tengah malam
`get_active_shift()` menangani:
- Mode REGULAR: S1 (00:01–08:00), S2 (08:01–16:00), S3 (16:01–00:00).
- Mode LONG: AM (08:01–20:00), PM (20:01–08:00, cross-midnight).
- `shift_date` untuk PM = tanggal shift **dimulai** (bukan tanggal kalender).
- Mode dikendalikan `app_settings.shift_mode` agar fleksibel.

### 5. Approval workflow
- DO: DRAFT → SUBMITTED → APPROVED → CLOSED; reject/void juga didukung.
- Issue: SUBMITTED (input operator) → APPROVED (verifikasi Leader) → ledger.
- Transfer: DRAFT → IN_TRANSIT (TRANSFER_OUT dicatat) → RECEIVED (TRANSFER_IN
  dicatat) → COMPLETED.
- Opname: DRAFT → SUBMITTED → APPROVED/ADJUSTED (selisih → adjustment otomatis).

### 6. Kategori konsumsi & Total Issued
- GOOD merujuk DO (mengurangi kuota DO).
- DAMAGE/REJECT/BUFFER/LOWER/TRIAL_ROTO/OTHER wajib menyertakan alasan.
- Total Issued = jumlah semua kategori (bukan hanya GOOD).

## Frontend

- React 18 + TypeScript + Vite + Tailwind CSS.
- React Router dengan lazy loading per halaman (code splitting: vendor,
  supabase, per-route chunk — target <3s initial load).
- PWA: vite-plugin-pwa (manifest + service worker, generateSW).
- Auth: Supabase Auth (email/password), AuthProvider context.
- Layout: sidebar desktop + mobile drawer; role-based menu.

## Struktur Folder Frontend

```
apps/web/src/
  components/        # UI kit (Button, Card, Modal, Table, Form, ...)
  layouts/           # AppLayout (sidebar + drawer)
  pages/             # Halaman per modul (12 modul)
  services/          # Layer akses data (Supabase client)
  types/             # Domain types (mirror DB)
  hooks/             # useAuth, useToast, ...
  lib/               # supabase client, helpers
```

## Database: Migrasi

| File | Isi |
| --- | --- |
| 0001 | extensions, app_settings |
| 0002 | enums |
| 0003 | master tables |
| 0004 | transaction tables (DO, transfer, transactions, stock, ledger, opname, QC, env, reports, audit) |
| 0005 | helper functions (auth-aware) |
| 0006 | audit trigger |
| 0007 | stock engine (ledger trigger + fn_post_ledger_rows) |
| 0008 | indexes |
| 0009 | RLS policies |
| 0010 | business RPC (DO, issue, adjustment, transfer, opname, user) |
| 0011 | dashboard + report RPC |

## Testing

5 suite pgTAP:
- `test_01_business_flow`: DO 1200 + Damage 5 + Reject 2 + Lower 4 → Total Issued 1211, ledger & DO issued_qty.
- `test_02_integrity`: insufficient stock, duplicate number, RLS blokir direct write, FORBIDDEN role.
- `test_03_shift_crossing`: boundary shift LONG/REGULAR.
- `test_04_transfer_flow`: WHS→TROOM, stock bergerak via ledger.
- `test_05_opname_dashboard`: opname + adjustment otomatis + dashboard.

Semua lulus terhadap PostgreSQL 15 lokal.
