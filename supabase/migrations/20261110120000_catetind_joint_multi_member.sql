-- ══════════════════════════════════════════════════════════════════════════════
-- CatetInd · 14 · DOMPET BERSAMA UNTUK 3–4 ORANG + PEMASUKAN BERSAMA
--
-- Dua masalah yang ditutup, keduanya dilaporkan pemilik produk:
--
--   1. "Join wallet cuma bisa sama 1 orang" — kode undangan dibakar sekali pakai
--      (`used_by`), jadi orang ketiga & keempat tidak punya jalan masuk walau
--      tabel `joint_members` sudah mendukung banyak anggota (primary key
--      `(joint_wallet_id, user_id)`).
--   2. "Nambahin pemasukan malah tercatat pengeluaran" — tidak ada kolom `kind`
--      di `joint_transactions`, jadi jenis catatan yang dipilih user di form
--      hilang saat disimpan ke server.
--
-- Perubahan:
--   · kolom `kind` ('expense' | 'income') + view masker ikut membawanya;
--   · `catetind_accept_invite` TIDAK lagi membakar kode: keanggotaan idempoten,
--     kode tetap hidup sampai kedaluwarsa, dengan batas 8 anggota;
--   · `catetind_resolve_invite` melaporkan jumlah anggota & tetap 'valid'
--     selama belum kedaluwarsa.
--
-- Idempotent: aman dijalankan berkali-kali.
-- ══════════════════════════════════════════════════════════════════════════════

-- ── 1. Jenis catatan: pengeluaran atau pemasukan ────────────────────────────
alter table public.joint_transactions
  add column if not exists kind text not null default 'expense';

do $$
begin
  alter table public.joint_transactions
    add constraint joint_transactions_kind_check
    check (kind in ('expense', 'income'));
exception when duplicate_object then null;
end $$;


-- View masker WAJIB ikut membawa `kind`; tanpa ini baris pemasukan terbaca
-- sebagai pengeluaran begitu halaman di-refresh (bacaan awal lewat view ini).
create or replace view public.joint_transactions_public
with (security_invoker = true) as
  select
    t.id,
    t.joint_wallet_id,
    t.user_id,
    t.paid_by_user_id,
    case
      when t.is_private and coalesce(t.private_for_user, t.user_id) <> auth.uid()
        then 'Transaksi privat'
      else t.description
    end as description,
    case
      when t.is_private and coalesce(t.private_for_user, t.user_id) <> auth.uid()
        then 'privat'
      else t.category
    end as category,
    t.amount,
    t.date,
    t.time_label,
    t.split_type,
    t.split_percents,
    t.split_amounts,
    t.bearer_id,
    t.is_private,
    t.private_for_user,
    t.is_settlement,
    t.month_key,
    t.created_at,
    t.kind
  from public.joint_transactions t;

grant select on public.joint_transactions_public to authenticated;
revoke all on public.joint_transactions_public from anon;

-- ── 2. Terima undangan: banyak orang, satu kode, sampai kedaluwarsa ─────────
/*
 * Urutan pemeriksaan SENGAJA: pembuat → sudah anggota → kedaluwarsa → penuh.
 *
 *   · `creator` — pemilik kode membuka pratinjaunya: tidak menulis apa pun.
 *   · `member`  — sudah anggota: idempoten (kode tidak disentuh).
 *   · `full`    — kantong sudah berisi 8 orang.
 *   · `joined`  — menulis `joint_members`; kode TIDAK dibakar supaya orang
 *                 ketiga/keempat bisa memakai tautan yang sama.
 *
 * `used_by`/`used_at` hanya diisi sebagai JEJAK pemakaian terakhir — bukan
 * penanda kode mati. Kode mati karena kedaluwarsa (`expires_at`).
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
  member_count integer;
  pocket_name text;
  max_members constant integer := 8;
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

  if found.expires_at <= now() then
    raise exception 'Kode undangan sudah kedaluwarsa' using errcode = '22007';
  end if;

  select count(*)::integer into member_count
    from public.joint_members m
    where m.joint_wallet_id = found.joint_wallet_id;

  if member_count >= max_members then
    return query select found.joint_wallet_id, pocket_name, 'full'::text;
    return;
  end if;

  insert into public.joint_members (joint_wallet_id, user_id, role)
  values (found.joint_wallet_id, uid, 'member')
  on conflict (joint_wallet_id, user_id) do nothing;

  /* jejak pemakaian terakhir saja — kode TETAP HIDUP sampai kedaluwarsa */
  update public.invite_codes
    set used_by = uid, used_at = now()
    where code = found.code;

  return query select found.joint_wallet_id, pocket_name, 'joined'::text;
end $$;

revoke all on function public.catetind_accept_invite(text) from public, anon;
grant execute on function public.catetind_accept_invite(text) to authenticated;

comment on column public.joint_transactions.kind is
  'expense = belanja bersama (menimbulkan kewajiban), income = uang masuk ke kas bersama (tidak menimbulkan kewajiban)';

-- ── 3. Status tautan: 'valid' selama belum kedaluwarsa ──────────────────────
/*
 * Kolom keluaran SAMA dengan versi sebelumnya (migrasi joint_identity), jadi
 * `create or replace` sah. Perubahan perilaku hanya satu: kode yang `used_by`
 * terisi TIDAK lagi otomatis 'used' — selama belum kedaluwarsa ia masih bisa
 * dipakai anggota berikutnya.
 */
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
      case when found.expires_at <= now() then 'expired' else 'valid' end,
      found.joint_wallet_id,
      (select w.name from public.joint_wallets w where w.id = found.joint_wallet_id),
      found.expires_at,
      (select count(*)::integer from public.joint_members m where m.joint_wallet_id = found.joint_wallet_id),
      (select nullif(trim(p.nickname), '') from public.profiles p where p.user_id = found.created_by);
end $$;

revoke all on function public.catetind_resolve_invite(text) from public;
grant execute on function public.catetind_resolve_invite(text) to authenticated, anon;

