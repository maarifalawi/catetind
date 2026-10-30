-- ══════════════════════════════════════════════════════════════════════════════
-- CatetInd · 11 · IDENTITAS DOMPET BERSAMA
--
-- Masalah yang ditutup: layar `/joint` menggambar dua orang KARANGAN (`Jon` dan
-- `Dany`) karena domain kantong bersama memakai id demo (`user_a`/`user_b`).
-- Setelah migrasi ini, halaman membaca anggota SUNGGUHAN (uuid) beserta nama
-- panggilan mereka, dan setiap orang melihat dirinya sebagai "Kamu".
--
-- `profiles` RLS-nya owner-only, jadi nama anggota lain TIDAK bisa dibaca lewat
-- REST biasa. Satu-satunya jalan adalah RPC di bawah: ia memeriksa keanggotaan
-- lebih dulu (lewat `catetind_is_joint_member`), baru mengembalikan nama. Yang
-- keluar hanya `user_id`, `nickname`, `role` untuk anggota kantong itu — bukan
-- profil orang lain secara umum.
--
-- Idempotent: aman dijalankan berkali-kali.
-- ══════════════════════════════════════════════════════════════════════════════

drop function if exists public.catetind_joint_roster(uuid);
create or replace function public.catetind_joint_roster(p_wallet uuid)
returns table (roster_user_id uuid, roster_nickname text, roster_role text)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
begin
  if uid is null then
    raise exception 'Sesi tidak ditemukan. Masuk dulu lewat /login ya.' using errcode = '28000';
  end if;

  /* Fail-closed: bukan anggota = tidak ada satu baris pun yang keluar. */
  if not public.catetind_is_joint_member(p_wallet, uid) then
    return;
  end if;

  return query
    select
      m.user_id,
      coalesce(nullif(trim(p.nickname), ''), 'Kamu') as roster_nickname,
      m.role
    from public.joint_members m
    left join public.profiles p on p.user_id = m.user_id
    where m.joint_wallet_id = p_wallet
    order by m.created_at asc;
end $$;

revoke all on function public.catetind_joint_roster(uuid) from public, anon;
grant execute on function public.catetind_joint_roster(uuid) to authenticated;

-- ── Realtime: anggota baru harus sampai ke perangkat PEMILIK ────────────────
/*
 * Tanpa ini, pemilik kantong tidak pernah tahu pasangannya bergabung sampai ia
 * me-refresh: dulu satu-satunya pemicu adalah tombol "Simulasi" di perangkatnya
 * sendiri (yang sekarang sudah dihapus). Publication-nya sudah ada dari migrasi
 * 04; di sini `joint_members` didaftarkan kalau belum.
 */
do $$
begin
  alter publication supabase_realtime add table public.joint_members;
exception when duplicate_object then null;
end $$;

alter table public.joint_members replica identity full;

-- ── Nama PENGUNDANG di halaman /join/<kode> ─────────────────────────────────
/*
 * `/join/[code]` dulu menulis "Jon mengajak kamu…" karena `resolveInviteFrom()`
 * memakai konstanta contoh. Nama yang benar hanya diketahui server, jadi RPC
 * status undangan ditambah satu kolom: `invite_inviter_name` (nickname pembuat
 * kode). Kolom keluaran berubah → fungsi harus DIJATUHKAN dulu (42P13).
 *
 * Yang tetap sama: fungsi ini boleh dipanggil TANPA login (pengunjung belum punya
 * akun) dan hanya mengembalikan status + nama dompet + nama pengundang. Tidak
 * ada daftar anggota, tidak ada isi dompet.
 */
drop function if exists public.catetind_resolve_invite(text);
create or replace function public.catetind_resolve_invite(p_code text)
returns table (
  invite_status text,
  invite_wallet_id uuid,
  invite_wallet_name text,
  invite_expires_at timestamptz,
  invite_member_count integer,
  invite_inviter_name text
)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  normalized text := upper(trim(coalesce(p_code, '')));
  found public.invite_codes%rowtype;
begin
  select * into found from public.invite_codes where code = normalized;
  if found.code is null then
    return query select 'not_found', null::uuid, null::text, null::timestamptz, 0, null::text;
    return;
  end if;

  return query
    select
      case when found.used_by is not null then 'used'
           when found.expires_at <= now() then 'expired'
           else 'valid' end,
      found.joint_wallet_id,
      (select w.name from public.joint_wallets w where w.id = found.joint_wallet_id),
      found.expires_at,
      (select count(*)::integer from public.joint_members m where m.joint_wallet_id = found.joint_wallet_id),
      (select nullif(trim(p.nickname), '') from public.profiles p where p.user_id = found.created_by);
end $$;

revoke all on function public.catetind_resolve_invite(text) from public;
grant execute on function public.catetind_resolve_invite(text) to authenticated, anon;
