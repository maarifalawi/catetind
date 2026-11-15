-- ══════════════════════════════════════════════════════════════════════════════
-- CatetInd · 15 · HAPUS CATATAN BERSAMA LINTAS ANGGOTA + KODE TIDAK BISA DIKLAIM
--
-- Dua temuan nyata dari pemilik produk (10 Nov 2026):
--
--   1. "Hapus transaksi di akun pertama, di akun kedua masih ada."
--      Policy lama `joint_transactions_author_delete` (migrasi 03) hanya
--      mengizinkan PENULIS baris menghapus barisnya sendiri. Policy pengganti
--      `joint_transactions_member_delete` (migrasi flex_split_settle) memang
--      sudah mengizinkan semua anggota dompet, tetapi policy lama TIDAK PERNAH
--      dijatuhkan. Dua policy permissive di-OR oleh Postgres, jadi perilakunya
--      sudah benar — yang tersisa adalah aturan GANDA yang menyesatkan saat
--      diaudit (dan membuat orang mengira hapus lintas anggota dilarang).
--      Di sini policy lama dijatuhkan supaya hanya ada SATU aturan, dan aturan
--      itu yang dipakai klien (`lib/supabase/joint-remote.ts`).
--
--   2. "Kode yang gua buat di akun kedua dijawab 'Itu kode undanganmu sendiri'
--      waktu gua masukin di akun pertama."
--      `catetind_create_invite` versi lama memakai
--        on conflict (code) do update set created_by = excluded.created_by
--      sehingga 6 karakter yang SUDAH ADA bisa dipindahkan kepemilikannya ke
--      akun yang mengirimkannya — termasuk kalau kode itu milik anggota lain.
--      Pemilik aslinya lalu ditolak server sebagai "creator" saat memakai
--      kodenya sendiri. Sekarang kode milik akun lain DITOLAK (23505), tidak
--      pernah diambil alih.
--
-- Idempotent: aman dijalankan berkali-kali.
-- ══════════════════════════════════════════════════════════════════════════════

-- ── 1. Satu aturan hapus: anggota dompet boleh menghapus catatan di dompetnya ─
drop policy if exists joint_transactions_author_delete on public.joint_transactions;

drop policy if exists joint_transactions_member_delete on public.joint_transactions;
create policy joint_transactions_member_delete on public.joint_transactions
  for delete to authenticated
  using (public.catetind_is_joint_member(joint_wallet_id));

comment on policy joint_transactions_member_delete on public.joint_transactions is
  'Anggota dompet bersama boleh menghapus catatan di dompetnya (salah input / simpan dobel). Baris kas pribadi tetap diatur policy ledger_rows.';

-- ── 2. Kode undangan tidak bisa diambil alih akun lain ───────────────────────
create or replace function public.catetind_create_invite(
  p_joint_wallet uuid,
  p_code text,
  p_ttl_hours integer default 24
)
returns table (invite_code text, invite_expires_at timestamptz)
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  normalized text := upper(trim(coalesce(p_code, '')));
  expires timestamptz := now() + make_interval(hours => greatest(1, coalesce(p_ttl_hours, 24)));
  other_owner uuid;
begin
  if uid is null then
    raise exception 'Sesi tidak ditemukan. Masuk dulu lewat /login ya.' using errcode = '28000';
  end if;
  if length(normalized) < 4 then
    raise exception 'Kode undangan terlalu pendek' using errcode = '22023';
  end if;
  if not public.catetind_is_joint_member(p_joint_wallet, uid) then
    raise exception 'Kamu bukan anggota dompet bersama itu' using errcode = '42501';
  end if;

  /* Kode yang sudah dimiliki akun LAIN tidak boleh didaur ulang oleh akun ini.
     Dulu `on conflict` menimpa `created_by`, sehingga kode milik pasangan
     berpindah tangan dan pembuat aslinya kena jawaban "Itu kode undanganmu
     sendiri". Sekarang ditolak apa adanya. */
  select ic.created_by into other_owner
    from public.invite_codes ic
    where ic.code = normalized;

  if other_owner is not null and other_owner <> uid then
    raise exception 'Kode undangan itu milik akun lain. Buat kode baru ya.' using errcode = '23505';
  end if;

  /* Satu dompet = satu kode aktif. Kode yang SEDANG dipakai ulang tidak ikut
     dicabut (`ic.code <> normalized`). */
  update public.invite_codes ic
    set expires_at = now()
    where ic.joint_wallet_id = p_joint_wallet
      and ic.used_by is null
      and ic.expires_at > now()
      and ic.code <> normalized;

  insert into public.invite_codes (code, joint_wallet_id, created_by, expires_at)
  values (normalized, p_joint_wallet, uid, expires)
  on conflict (code) do update
    set joint_wallet_id = excluded.joint_wallet_id,
        expires_at      = excluded.expires_at,
        used_by         = null,
        used_at         = null;

  return query select normalized, expires;
end $$;

revoke all on function public.catetind_create_invite(uuid, text, integer) from public, anon;
grant execute on function public.catetind_create_invite(uuid, text, integer) to authenticated;
