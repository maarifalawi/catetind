-- ══════════════════════════════════════════════════════════════════════════════
-- CatetInd · 07 · REALTIME KEKAYAAN & ASET FISIK (paket 84)
--
-- Kenapa: halaman /wealth (portofolio investasi, hutang/piutang, riwayat
-- pembayaran, dan aset fisik/properti) baru melihat perubahan dari tab atau
-- perangkat LAIN setelah di-refresh — karena hanya `joint_transactions` yang
-- ada di publication realtime. Migrasi ini menambahkan tabel kekayaan + aset
-- fisik supaya klien menerima barisnya sendiri lewat Postgres Changes
-- (lihat `lib/supabase/realtime.ts` → `subscribeWealthChanges` /
-- `subscribePhysicalChanges`).
--
-- `replica identity full` supaya payload UPDATE/DELETE ikut membawa kolomnya
-- (tanpa ini klien hanya menerima primary key). RLS tetap berlaku: klien hanya
-- menerima baris yang lolos policy `user_id = auth.uid()`.
--
-- Idempotent: aman dijalankan berkali-kali.
-- ══════════════════════════════════════════════════════════════════════════════

alter table public.investments         replica identity full;
alter table public.debts               replica identity full;
alter table public.debt_payments       replica identity full;
alter table public.asset_transactions  replica identity full;
alter table public.physical_assets     replica identity full;

do $$
declare
  t text;
  targets text[] := array[
    'investments',
    'debts',
    'debt_payments',
    'asset_transactions',
    'physical_assets'
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
