-- CatetInd · 11 · PENANDA SETTLE DOMPET BERSAMA DISIMPAN DI SERVER
--
-- MASALAH YANG DITUTUP
-- `recordSettlement()` (`lib/money/joint-store.ts`) dulu hanya menulis penanda
-- "bulan ini sudah settle" ke IndexedDB PERANGKAT yang menekan tombolnya.
-- Akibat yang dilaporkan pemilik produk (11 Nov 2026):
--   · akun pasangan tetap melihat "Belum Impas / Settle Sekarang" untuk bulan
--     yang SUDAH disettle, seolah tiap akun harus menekan tombolnya sendiri;
--   · baris timeline settle hanya muncul di satu akun, bertanggal karangan
--     ("1 <bulan> · 20:30") karena tanggalnya diambil dari konstanta mock.
--
-- settle adalah KESEPAKATAN DUA ORANG, jadi tempatnya di database — bukan di
-- perangkat salah satu pihak. Satu baris per (dompet, bulan) supaya menekan
-- tombol dua kali tidak pernah membuat dua penanda.
--
-- BENTUKNYA SENGAJA BUKAN `joint_transactions`
--   · settle bukan pengeluaran/pemasukan kas bersama;
--   · `method` & `carry_over` tidak punya kolom di sana;
--   · baris settle di `joint_transactions` akan ikut aturan privasi/pembagian
--     yang tidak berlaku untuk sebuah transfer penyelesaian.
--
-- RLS: hanya ANGGOTA dompet yang boleh membaca/menulis (fungsi
-- `catetind_is_joint_member` dari migrasi 03). Tabel juga masuk publication
-- `supabase_realtime`, sehingga akun pasangan menerima perubahannya tanpa
-- memuat ulang halaman.
--
-- Idempotent: aman dijalankan berkali-kali.

create table if not exists public.joint_settlements (
  id                 uuid primary key default gen_random_uuid(),
  joint_wallet_id    uuid not null references public.joint_wallets (id) on delete cascade,
  -- bulan yang diselesaikan (`YYYY-MM`) — satu penanda per bulan
  month_key          text not null check (month_key ~ '^\d{4}-\d{2}$'),
  -- pihak yang mentransfer (yang tadi menalangi kurang) & yang menerima
  from_user_id       uuid not null references auth.users (id) on delete cascade,
  to_user_id         uuid not null references auth.users (id) on delete cascade,
  -- nominal yang benar-benar ditransfer (Rupiah bulat)
  amount             bigint not null default 0 check (amount >= 0),
  -- metode transfer yang dipilih user: 'BCA' | 'GoPay' | 'Cash'
  method             text not null default 'BCA',
  -- sisa yang belum tertutup transfer ini (0 pada settle penuh)
  carry_over         bigint not null default 0 check (carry_over >= 0),
  -- KAPAN settle-nya terjadi — dipakai baris timeline di SEMUA perangkat
  settled_at         timestamptz not null default now(),
  created_by_user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),
  constraint joint_settlements_distinct_sides check (from_user_id <> to_user_id),
  constraint joint_settlements_one_per_month unique (joint_wallet_id, month_key)
);

create index if not exists joint_settlements_wallet_idx
  on public.joint_settlements (joint_wallet_id);

-- ── RLS: anggota dompet saja ────────────────────────────────────────────────
alter table public.joint_settlements enable row level security;

drop policy if exists joint_settlements_member_select on public.joint_settlements;
create policy joint_settlements_member_select on public.joint_settlements
  for select to authenticated
  using (public.catetind_is_joint_member(joint_wallet_id));

/* Penulis harus anggota, kedua pihak (pengirim & penerima) harus anggota, dan
   pencatatnya adalah pemanggil sendiri. Tanpa dua pemeriksaan terakhir, satu
   anggota bisa "menyelesaikan" bulan dengan arah yang menguntungkan dirinya
   ke orang di luar dompet. */
drop policy if exists joint_settlements_member_insert on public.joint_settlements;
create policy joint_settlements_member_insert on public.joint_settlements
  for insert to authenticated
  with check (
    public.catetind_is_joint_member(joint_wallet_id)
    and public.catetind_is_joint_member(joint_wallet_id, from_user_id)
    and public.catetind_is_joint_member(joint_wallet_id, to_user_id)
    and created_by_user_id = auth.uid()
  );

/* Upsert (`onConflict: joint_wallet_id,month_key`) butuh policy UPDATE. Pemilik
   baris asli tidak dikunci: siapa pun anggota boleh membetulkan arah/nominal
   kesepakatan — `created_by_user_id` tetap mencatat siapa yang pertama. */
drop policy if exists joint_settlements_member_update on public.joint_settlements;
create policy joint_settlements_member_update on public.joint_settlements
  for update to authenticated
  using (public.catetind_is_joint_member(joint_wallet_id))
  with check (
    public.catetind_is_joint_member(joint_wallet_id)
    and public.catetind_is_joint_member(joint_wallet_id, from_user_id)
    and public.catetind_is_joint_member(joint_wallet_id, to_user_id)
  );

/* "Batalkan settle" = baris ini dihapus, dan pasangan harus ikut melihatnya. */
drop policy if exists joint_settlements_member_delete on public.joint_settlements;
create policy joint_settlements_member_delete on public.joint_settlements
  for delete to authenticated
  using (public.catetind_is_joint_member(joint_wallet_id));

-- ── GRANT: hanya authenticated (anon tidak punya urusan di sini) ────────────
grant select, insert, update, delete on public.joint_settlements to authenticated;
revoke all on public.joint_settlements from anon;

-- ── REALTIME: perubahan settle harus sampai ke perangkat pasangan ───────────
alter table public.joint_settlements replica identity full;
do $$
begin
  begin
    alter publication supabase_realtime add table public.joint_settlements;
  exception
    when duplicate_object then null;   -- sudah pernah ditambahkan
    when undefined_object then null;   -- publication belum ada di instance ini
  end;
end $$;
