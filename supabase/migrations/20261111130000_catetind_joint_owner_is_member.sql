-- ══════════════════════════════════════════════════════════════════════════════
-- CatetInd · 16 · PEMILIK DOMPET BERSAMA = ANGGOTA (perbaikan sinkronisasi)
--
-- Temuan pemilik produk (11 Nov 2026): "Halaman join ngga sync. Di akun pertama
-- tiba-tiba udah ada transaksi, di akun kedua kosong."
--
-- AKARNYA DI SINI. Semua policy tabel `joint_transactions` memakai
-- `public.catetind_is_joint_member(joint_wallet_id)`, dan fungsi itu hanya
-- memeriksa baris di `joint_members`. Pemilik dompet disimpan di
-- `joint_wallets.owner_id`; baris keanggotaannya hanya lahir kalau
-- `catetind_ensure_joint_pocket` dipanggil (migrasi join_claim) — dan dompet
-- yang dibuat lewat jalur lama / sebelum migrasi itu TIDAK punya baris tersebut.
--
-- Akibatnya, untuk dompet seperti itu:
--   · anggota undangan (punya baris `joint_members`) BISA membaca catatan;
--   · PEMILIK (hanya `owner_id`) TIDAK bisa membaca catatan mana pun.
-- RLS tidak melempar error — hasilnya himpunan kosong. Klien lalu menampilkan
-- "0 catatan" padahal barisnya ada di server dan pasangannya melihatnya. Persis
-- gejala dua screenshot: satu akun penuh, satu akun kosong.
--
-- Perbaikan:
--   1. `catetind_is_joint_member` menganggap PEMILIK sebagai anggota (sumber
--      kebenaran tunggal untuk policy transaksi, roster, dan kode undangan);
--   2. baris keanggotaan `role = 'owner'` untuk pemilik lama ditulis ulang
--      (backfill), supaya daftar anggota & nama di layar ikut lengkap;
--   3. policy tidak perlu diubah: semuanya sudah memanggil fungsi ini.
--
-- Idempotent: aman dijalankan berkali-kali.
-- ══════════════════════════════════════════════════════════════════════════════

-- ── 1. Keanggotaan: pemilik SELALU anggota dompetnya sendiri ────────────────
create or replace function public.catetind_is_joint_member(
  p_wallet uuid,
  p_user uuid default auth.uid()
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.joint_wallets w
    where w.id = p_wallet
      and w.owner_id = p_user
  ) or exists (
    select 1 from public.joint_members m
    where m.joint_wallet_id = p_wallet and m.user_id = p_user
  )
$$;

comment on function public.catetind_is_joint_member(uuid, uuid) is
  'Anggota dompet bersama = PEMILIK (joint_wallets.owner_id) ATAU baris joint_members. Dipakai semua policy joint_transactions/joint_members/invite_codes.';

revoke all on function public.catetind_is_joint_member(uuid, uuid) from public, anon;
grant execute on function public.catetind_is_joint_member(uuid, uuid) to authenticated;

-- ── 2. Backfill baris keanggotaan pemilik ──────────────────────────────────
/* Tanpa baris ini, roster (`catetind_joint_roster`) tidak memuat pemilik —
   layar akan menyebut dompet berisi 1 orang padahal pemiliknya ada. `on
   conflict do nothing` menjaga baris yang sudah ada (dan role lamanya) utuh. */
insert into public.joint_members (joint_wallet_id, user_id, role)
select w.id, w.owner_id, 'owner'
from public.joint_wallets w
where w.owner_id is not null
on conflict (joint_wallet_id, user_id) do nothing;

-- ── 3. Hitung ulang nama anggota (roster) — tidak perlu, RPC membaca tabel ──
/* `catetind_joint_roster` sudah membaca `joint_members` + `profiles`, jadi
   baris hasil backfill langsung muncul tanpa definisi ulang fungsi. */
