-- ══════════════════════════════════════════════════════════════════════════════
-- CatetInd · 12 · JOIN WALLET YANG BENAR-BENAR BEKERJA
--
-- Masalah yang ditutup (ditemukan saat menelusuri alur /join/[code]):
--
--   1. TIDAK ADA jalur yang membuat baris `joint_wallets` dari aplikasi.
--      `createJointPocket()` hanya menamai kantong di perangkat, jadi id-nya tetap
--      id kanon (`joint_1`). `catetind_create_invite` memeriksa keanggotaan, dan
--      karena dompet itu tidak ada (juga bukan uuid) kode undangan TIDAK PERNAH
--      sampai ke tabel `invite_codes` → partner di perangkat lain tidak bisa gabung.
--   2. `catetind_accept_invite` tidak bisa membedakan tiga keadaan yang berbeda:
--      (a) benar-benar bergabung, (b) SUDAH anggota, (c) PEMBUAT kode sedang
--      memeriksa pratinjaunya sendiri (tautan "Pratinjau halaman undangan" di
--      /joint). Untuk (c) fungsi lama tetap membakar kode sekali-pakai, sehingga
--      pengundang yang membuka pratinjaunya sendiri mematikan tautan yang akan
--      ia bagikan.
--   3. Setelah berhasil gabung, membuka ulang tautannya (refresh) selalu
--      menampilkan "Tautan ini sudah dipakai" — termasuk untuk anggota yang baru
--      saja bergabung. Tidak ada cara membaca "saya sudah anggota" tanpa
--      membakar kode.
--
-- Tiga RPC di bawah menutupnya. Semua idempoten & aman dijalankan berkali-kali.
-- ══════════════════════════════════════════════════════════════════════════════

-- ── 1. Kantong bersama di server (satu pemilik = satu kantong) ──────────────
/*
 * Dipanggil sebelum kode undangan dibuat. Dompet yang paling awal dibuat dipakai
 * ulang supaya hasilnya deterministik (model app ini: satu kantong per akun →
 * lapisan `wallets`), nama disesuaikan dengan yang diketik user, dan baris
 * keanggotaan PEMILIK (`role = 'owner'`) dipastikan ada — tanpa baris itu
 * `catetind_is_joint_member` berkata "bukan anggota" untuk pemiliknya sendiri.
 *
 * Kolom keluaran ber-prefiks `pocket_*` supaya tidak bertabrakan dengan nama
 * kolom tabel di dalam badan fungsi (kelas bug `42702`).
 */
drop function if exists public.catetind_ensure_joint_pocket(text);
create or replace function public.catetind_ensure_joint_pocket(p_name text default null)
returns table (pocket_id uuid, pocket_name text, pocket_created_at timestamptz)
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  wanted text := nullif(trim(coalesce(p_name, '')), '');
  pocket public.joint_wallets%rowtype;
begin
  if uid is null then
    raise exception 'Sesi tidak ditemukan. Masuk dulu lewat /login ya.' using errcode = '28000';
  end if;

  select w.* into pocket
    from public.joint_wallets w
    where w.owner_id = uid
    order by w.created_at asc
    limit 1;

  if pocket.id is null then
    insert into public.joint_wallets (name, owner_id)
    values (coalesce(wanted, 'Dompet Kita'), uid)
    returning * into pocket;
  elsif wanted is not null and pocket.name is distinct from wanted then
    update public.joint_wallets w
      set name = wanted
      where w.id = pocket.id
      returning * into pocket;
  end if;

  insert into public.joint_members (joint_wallet_id, user_id, role)
  values (pocket.id, uid, 'owner')
  on conflict (joint_wallet_id, user_id) do nothing;

  return query select pocket.id, pocket.name, pocket.created_at;
end $$;

revoke all on function public.catetind_ensure_joint_pocket(text) from public, anon;
grant execute on function public.catetind_ensure_joint_pocket(text) to authenticated;

-- ── 2. Hubungan pemanggil dengan dompet di balik satu kode (tanpa membakar) ──
/*
 * Hanya dua boolean: apakah ia PEMBUAT kode, apakah ia SUDAH anggota. Dipakai
 * halaman /join untuk memutuskan antara "tawarkan tombol gabung", "ini pratinjau
 * milikmu", dan "kamu sudah anggota" — tanpa efek samping apa pun.
 *
 * `false,false` untuk tamu/kode asing, bukan error: halaman ini publik dan tidak
 * boleh gagal hanya karena pengunjungnya belum masuk.
 */
drop function if exists public.catetind_join_state(text);
create or replace function public.catetind_join_state(p_code text)
returns table (join_is_creator boolean, join_is_member boolean)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  normalized text := upper(trim(coalesce(p_code, '')));
  found public.invite_codes%rowtype;
begin
  if uid is null then
    return query select false, false;
    return;
  end if;

  select * into found from public.invite_codes where code = normalized;
  if found.code is null then
    return query select false, false;
    return;
  end if;

  return query
    select
      found.created_by = uid,
      exists (
        select 1 from public.joint_members m
        where m.joint_wallet_id = found.joint_wallet_id and m.user_id = uid
      );
end $$;

revoke all on function public.catetind_join_state(text) from public, anon;
grant execute on function public.catetind_join_state(text) to authenticated;

-- ── 3. Terima undangan: idempoten & membedakan hasilnya ─────────────────────
/*
 * Urutannya SENGAJA: pembuat → sudah anggota → sekali-pakai → kedaluwarsa.
 *
 *   · `creator` — pemilik kode membuka pratinjaunya: TIDAK menulis apa pun,
 *     kode tetap hidup untuk pasangannya.
 *   · `member`  — sudah anggota: idempoten, kode juga TIDAK dibakar (kalau
 *     dibakar di sini, refresh halaman oleh anggota akan mematikan undangan
 *     yang belum tentu dipakai siapa pun).
 *   · `joined`  — satu-satunya cabang yang menulis `joint_members` dan menandai
 *     `used_by`/`used_at`; semuanya dalam satu transaksi.
 */
drop function if exists public.catetind_accept_invite(text);
create or replace function public.catetind_accept_invite(p_code text)
returns table (invite_wallet_id uuid, invite_wallet_name text, join_outcome text)
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  normalized text := upper(trim(coalesce(p_code, '')));
  found public.invite_codes%rowtype;
  already_member boolean;
  pocket_name text;
begin
  if uid is null then
    raise exception 'Sesi tidak ditemukan. Masuk dulu lewat /login ya.' using errcode = '28000';
  end if;

  select * into found from public.invite_codes i where i.code = normalized for update;
  if found.code is null then
    raise exception 'Kode undangan tidak ditemukan' using errcode = 'P0002';
  end if;

  pocket_name := (select w.name from public.joint_wallets w where w.id = found.joint_wallet_id);

  if found.created_by = uid then
    return query select found.joint_wallet_id, pocket_name, 'creator'::text;
    return;
  end if;

  select exists (
    select 1 from public.joint_members m
    where m.joint_wallet_id = found.joint_wallet_id and m.user_id = uid
  ) into already_member;

  if already_member then
    return query select found.joint_wallet_id, pocket_name, 'member'::text;
    return;
  end if;

  if found.used_by is not null then
    raise exception 'Kode undangan ini sudah dipakai' using errcode = '23505';
  end if;
  if found.expires_at <= now() then
    raise exception 'Kode undangan sudah kedaluwarsa' using errcode = '22007';
  end if;

  insert into public.joint_members (joint_wallet_id, user_id, role)
  values (found.joint_wallet_id, uid, 'member')
  on conflict (joint_wallet_id, user_id) do nothing;

  update public.invite_codes set used_by = uid, used_at = now() where code = found.code;

  return query select found.joint_wallet_id, pocket_name, 'joined'::text;
end $$;

revoke all on function public.catetind_accept_invite(text) from public, anon;
grant execute on function public.catetind_accept_invite(text) to authenticated;

