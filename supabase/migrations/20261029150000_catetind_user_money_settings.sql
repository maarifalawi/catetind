-- ══════════════════════════════════════════════════════════════════════════════
-- CatetInd · 13 · PENGATURAN UANG & LIMIT BUDGET DI SERVER
--
-- Sebelum migrasi ini dua hal hidup HANYA di localStorage:
--   · konfigurasi uang (`lib/user-money-settings.ts`): pemasukan bulanan, total
--     cicilan, tanggal gajian, periode dashboard, konteks yang dipakai;
--   · limit budget per kategori (`lib/budget-storage.ts`).
--
-- Akibatnya user yang membuka app di perangkat kedua melihat "belum diatur"
-- padahal ia sudah mengisi semuanya, dan kartu Jatah Hari Ini berubah jadi CTA.
--
-- Bentuknya JSONB di `user_settings` (bukan tabel baru) karena:
--   · keduanya SATU baris per akun, sama seperti `masked`/`onboarding`;
--   · bentuk isinya masih berkembang, dan jsonb tidak butuh migrasi tiap field;
--   · `updatedAt` di dalam payload dipakai untuk last-write-wins, jadi tidak ada
--     kolom waktu kedua yang bisa berbeda cerita.
--
-- Idempotent: aman dijalankan berkali-kali.
-- ══════════════════════════════════════════════════════════════════════════════

alter table public.user_settings
  add column if not exists money jsonb,
  add column if not exists budgets jsonb;

comment on column public.user_settings.money is
  'Konfigurasi uang user (pemasukan bulanan, cicilan, gajian, periode, konteks) + updatedAt untuk last-write-wins';
comment on column public.user_settings.budgets is
  'Limit budget per kategori + updatedAt. `{ "updatedAt": 1690000000000, "items": [...] }`';
