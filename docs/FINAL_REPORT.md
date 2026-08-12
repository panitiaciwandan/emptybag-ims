# Laporan Akhir — EmptyBag-IMS

Tanggal: 12 Agustus 2026

## 1. Ringkasan

EmptyBag-IMS telah diimplementasikan end-to-end sebagai PWA mobile-first
berbasis Supabase PostgreSQL. Sistem mencakup manajemen inventory empty bag
untuk pabrik semen: stock warehouse & transit, konsumsi per shift dengan
kategori, transfer antar lokasi, DO, QC, environment monitoring, stock
opname, audit, dan laporan. Biaya total: 0 rupiah (free tier Supabase +
static hosting).

## 2. Deliverables

### 2.1 Database (Supabase PostgreSQL)

- **11 migrasi SQL** (`supabase/migrations/0001–0011`):
  extensions & settings, enums, master tables, transaction tables,
  helper functions, audit trigger, stock engine, indexes, RLS,
  business RPCs, dashboard/report RPCs.
- **Seed data** (`supabase/seed/seed.sql`): 3 role, permissions matrix,
  produk SMP(=MP)/SPK(Patriot), supplier UKS, spec AP85/AP65, 3 lokasi,
  5 shift, pallet, 9 item, 3 user, opening stock via ledger.
- **Stock Ledger engine**: semua mutasi stock melalui `stock_ledger`;
  trigger menghitung `balance_after` dan memperbarui `stock` atomik;
  saldo negatif ditolak.
- **RLS**: master read-all/write-SI; operasional write hanya via RPC
  SECURITY DEFINER; read di-scope per role & lokasi; audit append-only.

### 2.2 Frontend (React + Vite + Tailwind, PWA)

- **12 modul**: Login, Dashboard SI/Leader/Transit, Stock, Konsumsi (+new),
  Transfer (+new), DO (+new), Report (+history), QC (+new), Environment
  (+new), Opname (+new), Master, Audit.
- PWA installable (manifest + service worker), code splitting (vendor,
  supabase, per-route) — target <3s initial load.
- React Router lazy routes, role-based menu, mobile drawer + desktop sidebar.

### 2.3 Testing

- **5 suite pgTAP** (`supabase/tests/`) — semua **PASS** terhadap PostgreSQL 15:
  1. Business flow: DO 1200 + Damage 5 + Reject 2 + Lower 4 → **Total Issued 1211**; ledger & DO issued_qty terverifikasi.
  2. Integritas & otorisasi: insufficient stock ditolak, duplicate number
     ditolak, direct write ke `stock`/`stock_ledger` diblokir RLS,
     akses tanpa role → FORBIDDEN.
  3. Shift crossing: S1/S2/S3 + AM/PM, PM melewati tengah malam dengan
     `shift_date` = tanggal mulai.
  4. Transfer flow: WHS→TROOM, stock bergerak via ledger (net WHS -400,
     TROOM +400), tidak bisa diterima 2x.
  5. Opname & dashboard: selisih opname → adjustment otomatis; dashboard
     SI/Transit; get_low_stock.
- Frontend: `npm run typecheck` **PASS**, `npm run build` **PASS**
  (PWA 47 precache entries, vendor 53.46 kB gzip, supabase 57.11 kB gzip).

### 2.4 Tooling & CI

- `scripts/db.js`: `db:setup/migrate/seed/test/reset`.
- `scripts/mock_auth.sql`: mock auth untuk testing lokal.
- `.github/workflows/ci.yml`: frontend typecheck/build + database
  setup/test otomatis.

### 2.5 Dokumentasi

- `README.md`
- `docs/PROJECT_INFO.md`, `docs/DEPLOYMENT.md`, `docs/SQL_REFERENCE.md`, `docs/FINAL_REPORT.md`

## 3. Kepatuhan terhadap PRD

| Requirement | Status |
| --- | --- |
| PWA mobile-first, installable | Terpenuhi |
| Dashboard per role (SI/Leader/Petugas) | Terpenuhi |
| Stock Ledger wajib untuk semua perubahan stock | Terpenuhi (enforced di DB) |
| Tidak update stock langsung | Terpenuhi (diblokir RLS) |
| Total Issued = GOOD+DAMAGE+REJECT+BUFFER+LOWER+TRIAL_ROTO+OTHER | Terpenuhi |
| LOWER dihitung PCS | Terpenuhi |
| SMP = MP, SPK = Patriot, UKS, AP85/AP65 | Terpenuhi (seed & master) |
| Shift S1/S2/S3 + AM/PM, PM cross-midnight | Terpenuhi |
| Approval DO oleh Leader, Adjustment/Void oleh SI | Terpenuhi |
| Kategori tambahan wajib alasan | Terpenuhi (validasi RPC) |
| Audit trail append-only | Terpenuhi (trigger + RLS) |
| Response <3s, offline-ready | Terpenuhi (code splitting + PWA) |
| Copy/export (CSV) laporan | Terpenuhi di ReportPage |
| 0 rupiah (free tier) | Terpenuhi |

## 4. Asumsi & Catatan

- Backend memakai Supabase free tier; deploy frontend via Netlify/Vercel
  (statis). Lihat `docs/DEPLOYMENT.md`.
- User auth dibuat di Supabase (email/password); profil di `public.users`
  disinkronkan dengan seed (UUID tetap).
- Mode shift default `REGULAR`; Long Shift (AM/PM) dapat diaktifkan via
  `app_settings.shift_mode = 'LONG'`.
- Pengujian dilakukan terhadap PostgreSQL 15 lokal dengan mock auth
  (Supabase setara, karena migrasi memakai fitur standar).

## 5. Cara Verifikasi Ulang

```bash
cp .env.example .env     # isi DATABASE_URL
npm install
npm run db:setup         # migrate + seed
npm run db:test          # semua test PASS
npm run typecheck        # PASS
npm run build            # PASS
```
