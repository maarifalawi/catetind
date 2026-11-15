-- CatetInd · 13 · PERBAIKAN `catetind_joint_roster` (nama pasangan tidak pernah muncul)
--
-- Temuan saat menguji alur Join Wallet antar-akun:
--
--   select * from public.catetind_joint_roster('<wallet>');
--   ERROR: 42703: column m.created_at does not exist
--
-- Tabel `joint_members` TIDAK punya kolom `created_at`; kolomnya `joined_at`
-- (migrasi `20260927120100_catetind_domains.sql`). Fungsi ini dipanggil
-- `lib/supabase/joint-remote.ts` → `readMemberNames()`, yang gagal-sunyi
-- (mengembalikan `{}`). Akibat yang dilihat user: di dompet bersama, nama
-- pasangan SELALU tampil "Pasangan" walau profilnya sudah diisi — di kedua
-- perangkat.
--
-- Dua perbaikan di fungsi yang sama:
--
--   1. urutan memakai `m.joined_at` (kolom yang benar);
--   2. nama KOSONG dikembalikan `null`, bukan 'Kamu'. Dulu `coalesce(..., 'Kamu')`
--      membuat pasangan tanpa nickname tampil sebagai "Kamu" — dua orang di
--      layar yang sama-sama bernama "Kamu". Pemetaan "Kamu"/"Pasangan" adalah
--      keputusan tampilan dan tinggal di klien (`readMemberNames`), karena hanya
--      klien yang tahu siapa pemilik sesi.
--
-- Idempotent: `create or replace` pada signature yang sama (hak akses/ACL
-- fungsi dipertahankan).

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
      nullif(trim(p.nickname), '') as roster_nickname,
      m.role
    from public.joint_members m
    left join public.profiles p on p.user_id = m.user_id
    where m.joint_wallet_id = p_wallet
    order by m.joined_at asc;
end $$;

revoke all on function public.catetind_joint_roster(uuid) from public, anon;
grant execute on function public.catetind_joint_roster(uuid) to authenticated;
