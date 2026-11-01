-- CatetInd · 11 · REALTIME SEMUA MODUL KEUANGAN + FOTO PROFIL
--
-- Kenapa: store uang/tagihan/celengan/pengaturan hanya membaca server SEKALI per
-- pemuatan halaman. Baris yang ditulis di perangkat/tab LAIN karena itu tidak
-- muncul sampai halaman dimuat ulang — terbaca user sebagai "transaksinya tidak
-- ada di perangkat saya", padahal barisnya ada di database.
--
-- Kode klien (`lib/money/store.ts`, `lib/money/bills-store.ts`,
-- `lib/money/funds-store.ts`, `components/catetind/settings-sync.tsx`) sekarang
-- berlangganan Postgres Changes untuk tabel-tabel di bawah. Migrasi inilah yang
-- membuat event-nya benar-benar DIKIRIM: tabel yang tidak ada di publication
-- `supabase_realtime` tidak mengirim apa pun, sebaik apa pun kode kliennya.
--
-- `replica identity full` supaya payload UPDATE/DELETE ikut membawa kolomnya
-- (tanpa ini klien hanya menerima primary key). RLS tetap yang menentukan baris
-- mana yang sampai (policy `user_id = auth.uid()` dari migrasi 03).
--
-- `profiles.avatar_url` menyimpan FOTO PROFIL hasil kompresi klien (data URL
-- ≤ 20 KB). Sengaja TIDAK dimasukkan ke `user_metadata`: metadata ikut ke dalam
-- JWT & cookie sesi, dan cookie > 4096 byte membuat request ditolak 431.
--
-- Idempotent: aman dijalankan berkali-kali.

alter table public.profiles add column if not exists avatar_url text;

/* preferensi kategori (custom + yang disembunyikan) = data akun, bukan perangkat */
alter table public.user_settings add column if not exists categories jsonb;

alter table public.wallets             replica identity full;
alter table public.ledger_rows         replica identity full;
alter table public.bills               replica identity full;
alter table public.goals               replica identity full;
alter table public.goal_contributions  replica identity full;
alter table public.user_settings       replica identity full;
alter table public.profiles            replica identity full;

do $$
declare
  t text;
  targets text[] := array[
    'wallets',
    'ledger_rows',
    'bills',
    'goals',
    'goal_contributions',
    'user_settings',
    'profiles'
  ];
begin
  foreach t in array targets loop
    begin
      execute format('alter publication supabase_realtime add table public.%I', t);
    exception
      when duplicate_object then null;   -- sudah pernah ditambahkan
      when undefined_object then null;   -- publication belum ada di instance ini
    end;
  end loop;
end $$;
