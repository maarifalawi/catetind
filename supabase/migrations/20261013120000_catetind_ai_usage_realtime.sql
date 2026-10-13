-- ── METER PEMAKAIAN AI SECARA REALTIME (paket 86) ────────────────────────────
-- Sebelum ini angka pemakaian AI hanya dibaca SEKALI per pemuatan halaman
-- (`hydrateAiUsage()` di lib/ai-usage-store.ts). Akibatnya kuota tidak bergerak
-- kalau user memakai AI di tab/perangkat LAIN sampai halaman di-refresh —
-- "meter" yang tidak pernah naik di layar lain bukan meter.
--
-- Migrasi ini memasukkan `ai_usage` (pemakaian per bulan) dan `ai_addons`
-- (saldo token yang dibeli) ke publication realtime, supaya klien bisa
-- berlangganan Postgres Changes lewat `subscribeAiUsageChanges()`
-- (lib/supabase/realtime.ts) — jalur yang SAMA dengan tabel kekayaan (migrasi
-- 20261009120000). Yang dikirim ke klien cuma SINYAL "ada yang berubah"; angka
-- barunya dibaca ulang lewat REST (RLS tetap menyaring user_id = auth.uid()).
--
-- `replica identity full` supaya payload UPDATE/DELETE ikut membawa kolomnya
-- (tanpa ini klien realtime hanya menerima primary key, dan perbandingan baris
-- per baris tidak mungkin).
alter table public.ai_usage replica identity full;
alter table public.ai_addons replica identity full;

do $$ begin
  alter publication supabase_realtime add table public.ai_usage;
exception
  when duplicate_object then null;   -- sudah pernah ditambahkan
  when undefined_object then null;   -- publication belum ada di instance ini
end $$;

do $$ begin
  alter publication supabase_realtime add table public.ai_addons;
exception
  when duplicate_object then null;
  when undefined_object then null;
end $$;
