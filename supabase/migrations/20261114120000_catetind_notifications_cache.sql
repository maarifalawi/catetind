-- CatetInd · 27 · CADANGAN LONCENG NOTIFIKASI DI TABEL PENGATURAN USER
--
-- Kenapa migrasi ini ada: tabel `public.notifications` adalah rumah utama daftar
-- lonceng, tetapi di project produksi tabel itu pernah belum termigrasi
-- (PostgREST `PGRST205`). Akibatnya lonceng hanya hidup di SATU perangkat:
-- notifikasi yang lahir di ponsel tidak pernah muncul di laptop, dan "Tandai
-- semua dibaca" tidak tersinkron.
--
-- Solusi: daftar item ikut dicerminkan ke `user_settings.notifications_cache`
-- (jsonb) sebagai CADANGAN OTOMATIS. Tabel pengaturan user sudah aktif di
-- produksi sejak paket 45, jadi sinkronisasi lintas perangkat tetap jalan walau
-- tabel notifikasi utama belum tersedia.
--
-- Kenapa kolom SENDIRI, bukan menumpang `push_state`: `lib/push/cron.ts`
-- menulis `push_state` sebagai objek UTUH (replace) setiap kali cron mengirim
-- pengingat, sehingga notifikasi yang menumpang di dalamnya akan terhapus.
-- Kolom jsonb terpisah membuat dua penulis itu tidak pernah saling menimpa.
--
-- Bentuk isi: `{ version: 1, items: AppNotification[], updatedAt: <epoch ms> }`.
-- Idempotent: aman dijalankan berkali-kali.

alter table public.user_settings
  add column if not exists notifications_cache jsonb;

comment on column public.user_settings.notifications_cache is
  'Cadangan daftar lonceng notifikasi (dipakai saat tabel public.notifications belum tersedia)';

-- Realtime: perubahan cadangan ini juga harus terlihat di perangkat lain.
do $$
begin
  begin
    alter publication supabase_realtime add table public.user_settings;
  exception when duplicate_object then null;
  end;
end $$;
