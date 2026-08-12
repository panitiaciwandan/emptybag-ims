# EmptyBag-IMS

Sistem Manajemen Inventory Empty Bag (PWA) berbasis **Supabase PostgreSQL + React (Vite)**.

- **Frontend**: React + TypeScript + Vite, mobile-first PWA (installable), Tailwind CSS.
- **Backend**: Supabase PostgreSQL — schema, RLS, dan business-logic RPC.
- **Biaya**: 0 rupiah (free tier Supabase + static hosting).

## Fitur Utama

- Dashboard per role: **SI** (enterprise overview), **Leader** (operasional), **Petugas Transit** (ringan).
- Manajemen **Stock**, **Konsumsi (Issue)**, **Transfer antar lokasi**, **DO**, **QC**, **Environment**, **Stock Opname**, **Master Data**, **Audit Log**, **Laporan**.
- **Stock Ledger** sebagai satu-satunya jalur perubahan stock (append-only, atomic).
- RLS: role + scope lokasi; audit trail lengkap.
- Laporan konsumsi per shift dengan kategori: GOOD, DAMAGE, REJECT, BUFFER, LOWER, TRIAL_ROTO, OTHER.

## Struktur Repo

```
apps/web                 # Frontend PWA (React + Vite)
supabase/
  migrations/            # Migrasi SQL 0001-0011
  seed/seed.sql          # Seed data master + opening stock
  tests/                 # pgTAP integration tests
scripts/db.js            # db:migrate / db:seed / db:test / db:reset / db:setup
scripts/mock_auth.sql    # Mock auth schema untuk testing lokal
docs/                    # Dokumentasi
```

## Prasyarat

- Node.js >= 18
- PostgreSQL 15 (untuk development/testing lokal) atau akun Supabase gratis
- pgTAP (`apt-get install -y postgresql-15-pgtap`) untuk `npm run db:test`

## Setup Lokal (PostgreSQL langsung)

```bash
cp .env.example .env
# isi DATABASE_URL=postgres://user:pass@host:5432/emptybag_ims

npm install
npm run db:setup      # buat DB (jika belum), mock auth, migrate, seed
npm run db:test       # jalankan integration tests (pgTAP)
```

### Perintah Database

| Perintah | Fungsi |
| --- | --- |
| `npm run db:setup` | setup lengkap: mock auth + migrate + seed |
| `npm run db:migrate` | terapkan migrasi yang belum jalan |
| `npm run db:seed` | seed data |
| `npm run db:test` | jalankan integration tests |
| `npm run db:reset` | **DROP + recreate DB** (hati-hati) |

## Setup dengan Supabase

1. Buat project baru di [supabase.com](https://supabase.com) (free tier).
2. Jalankan semua file di `supabase/migrations/` via SQL Editor (urut 0001 → 0011).
3. Jalankan `supabase/seed/seed.sql`.
4. Di **Authentication → Users**, buat 3 user dengan email yang sama dengan seed:
   - `si@emptybag.test`
   - `leader@emptybag.test`
   - `petugas@emptybag.test`
5. Salin `VITE_SUPABASE_URL` dan `VITE_SUPABASE_ANON_KEY` ke `.env`.

## Menjalankan Frontend

```bash
cp .env.example .env   # isi kredensial Supabase
npm run dev            # http://localhost:5173
npm run build          # build produksi (PWA)
npm run preview        # preview build
```

## Business Rules yang Diimplementasikan

- **Stock Ledger wajib** untuk semua perubahan stock (PRD 8.2/8.5). Tidak ada update stock langsung.
- Saldo = Opening + Transfer In - Transfer Out - Issued + Adjustment (PRD 8.4).
- **Total Issued** = GOOD + DAMAGE + REJECT + BUFFER + LOWER + TRIAL_ROTO + OTHER.
- **LOWER** dihitung PCS (bukan konversi tonase).
- **SMP = MP** (Semen Merah Putih); **SPK** menggunakan **Patriot**; supplier **UKS**; spec **AP85/AP65**.
- Shift: S1 00:01–08:00, S2 08:01–16:00, S3 16:01–00:00, AM 08:01–20:00, PM 20:01–08:00. `shift_date` PM = tanggal shift dimulai.
- Approval DO oleh Leader; Adjustment & Void oleh SI; Issue diverifikasi Leader.
- Kategori selain GOOD wajib menyertakan alasan.

## Testing

- `npm run db:test` — 5 file test (business flow, integrity/RLS, shift crossing, transfer, opname+dashboard).
- `npm run typecheck` — TypeScript check frontend.
- `npm run build` — build PWA.

## Deployment

Lihat `docs/DEPLOYMENT.md` untuk panduan deploy Supabase + static hosting.

## Dokumentasi Lain

- `docs/PROJECT_INFO.md` — ringkasan arsitektur & keputusan desain.
- `docs/SQL_REFERENCE.md` — daftar RPC dan tabel.
- `docs/FINAL_REPORT.md` — laporan akhir implementasi.

## Lisensi

Internal use.
