# Deployment Guide

Panduan deployment EmptyBag-IMS dengan biaya 0 rupiah.

## Arsitektur

```
[ Browser / PWA ] --> [ Supabase ] --> [ PostgreSQL + RLS + RPC ]
        |
        +-- static hosting (Netlify / Vercel / GitHub Pages)
```

Frontend berupa static build (Vite) yang terhubung langsung ke Supabase
melalui `@supabase/supabase-js`. Semua business logic berada di database
(RPC + RLS), sehingga tidak perlu backend server terpisah.

## 1. Setup Supabase (Database)

1. Daftar di https://supabase.com (free tier, tanpa kartu kredit untuk penggunaan dasar).
2. Buat project baru.
3. Buka **SQL Editor**.
4. Jalankan file migrasi secara berurutan (isi dari repo):
   - `supabase/migrations/0001_extensions_and_settings.sql`
   - `supabase/migrations/0002_enums_and_types.sql`
   - `supabase/migrations/0003_master_tables.sql`
   - `supabase/migrations/0004_transaction_tables.sql`
   - `supabase/migrations/0005_helper_functions.sql`
   - `supabase/migrations/0006_audit_trigger.sql`
   - `supabase/migrations/0007_stock_engine.sql`
   - `supabase/migrations/0008_indexes.sql`
   - `supabase/migrations/0009_rls_policies.sql`
   - `supabase/migrations/0010_business_rpcs.sql`
   - `supabase/migrations/0011_dashboard_report_rpcs.sql`
5. Jalankan seed: `supabase/seed/seed.sql`
6. Buat 3 user auth di **Authentication → Users → Add user**:
   - `si@emptybag.test`
   - `leader@emptybag.test`
   - `petugas@emptybag.test`
   Kemudian pastikan baris profil di tabel `public.users` tersinkron (seed
   membuatnya dengan UUID tetap; jika user dibuat via UI UUID-nya berbeda,
   sesuaikan `public.users.id` dengan UUID auth user terkait).

### Perhatian

- `scripts/mock_auth.sql` **hanya untuk testing lokal**. Jangan dijalankan di Supabase.
- Pastikan `auth.users` sudah berisi user sebelum seed profil `public.users`
  (FK `users.id -> auth.users.id`).
- Mode shift default `REGULAR` (S1/S2/S3). Untuk mode Long Shift (AM/PM),
  ubah `app_settings.shift_mode = 'LONG'` dan aktifkan shift AM/PM.

## 2. Setup Supabase (Auth / Kredensial)

1. Di **Project Settings → API**, salin:
   - `Project URL` (untuk `VITE_SUPABASE_URL`)
   - `anon public` key (untuk `VITE_SUPABASE_ANON_KEY`)
2. Konfigurasi redirect (jika PWA login pakai OAuth) — tidak wajib untuk
   email/password.

## 3. Deploy Frontend

### Opsi A: Netlify (rekomendasi)

1. Build:
   ```bash
   npm install
   npm run build
   ```
2. Output ada di `apps/web/dist`.
3. Netlify: **Add new site → Deploy manually** → drag folder `apps/web/dist`.
   Atau hubungkan repo dengan build command `npm run build` dan publish
   directory `apps/web/dist`.
4. Set environment variables di Netlify:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`

### Opsi B: Vercel

1. Import repo di vercel.com.
2. Framework preset: **Vite**.
3. Root directory: `apps/web`.
4. Build command: `npm install && npm run build`.
5. Output directory: `dist`.
6. Tambahkan env variables.

### Opsi C: GitHub Pages

```bash
npm install
npm run build
# commit apps/web/dist ke branch gh-pages
```

## 4. Verifikasi

1. Buka URL preview.
2. Login sebagai `si@emptybag.test`, `leader@emptybag.test`, atau `petugas@emptybag.test`.
3. Cek dashboard sesuai role.
4. Pastikan PWA terinstall (manifest + service worker).

## 5. Monitoring & Backup (Free Tier)

- **Backup**: Supabase free tier menyediakan backup harian (PITR via upgrade; harian untuk database).
- **Monitoring**: Supabase Dashboard → Database → Reports untuk usage.
- **Alert**: belum tersedia di free tier; pantau usage dashboard.

## Catatan Keamanan

- `anon` key aman untuk frontend karena **RLS** adalah pengaman sebenarnya.
- Jangan pernah menaruh `service_role` key di frontend.
- Semua mutasi stock hanya melalui RPC SECURITY DEFINER yang memvalidasi role.
