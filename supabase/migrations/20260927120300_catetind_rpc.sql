-- ═══════════════════════════════════════════════════════════════════════════
-- CatetInd · 04 · RPC, TRIGGER, REALTIME (paket 45)
--
-- Tiga hal yang TIDAK boleh dikerjakan klien walau RLS aktif:
--   1. keanggotaan dompet bersama (otorisasi, bukan data pribadi);
--   2. menghapus akun (harus benar-benar menghapus `auth.users`, bukan cuma baris);
--   3. broadcast push lintas-user (lewat token internal, bukan sesi user).
-- Semuanya `security definer` + `set search_path`, dijaga di dalam fungsinya.
-- ═══════════════════════════════════════════════════════════════════════════

-- ── 1. Profil & pengaturan otomatis untuk user baru ────────────────────────
create or replace function public.catetind_handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (user_id, nickname)
  values (
    new.id,
    coalesce(
      nullif(new.raw_user_meta_data ->> 'nickname', ''),
      nullif(split_part(coalesce(new.email, ''), '@', 1), ''),
      'Kamu'
    )
  )
  on conflict (user_id) do nothing;

  insert into public.user_settings (user_id)
  values (new.id)
  on conflict (user_id) do nothing;

  -- Dompet contoh SENGAJA tidak dibuat di sini: dompet pertama lahir dari
  -- onboarding (dengan saldo yang user ketik sendiri) atau dari migrasi data
  -- lokal sekali jalan (`lib/supabase/local-migration.ts`). Menyuntik saldo
  -- karangan ke akun baru adalah persis hal yang dilarang paket 45.
  return new;
end $$;

drop trigger if exists catetind_on_auth_user_created on auth.users;
create trigger catetind_on_auth_user_created
  after insert on auth.users
  for each row execute function public.catetind_handle_new_user();

/* Fungsi trigger SENGAJA dibiarkan punya hak default (PUBLIC) — dan itu aman,
   bukan kelalaian:
     · isinya hanya berjalan sebagai TRIGGER `after insert on auth.users`;
     · dipanggil langsung lewat REST ia SELALU gagal (tipe kembaliannya
       `trigger`, dan Postgres menolak `trigger functions can only be called as
       triggers` — dibuktikan `curl` di laporan paket 45);
     · mencabut haknya berisiko MEMATIKAN pendaftaran user, karena trigger
       dijalankan dengan hak role yang mem-INSERT ke `auth.users` (GoTrue), bukan
       selalu `postgres`.
   Jadi yang dijaga di sini bukan haknya, melainkan kenyataan bahwa fungsi ini
   tidak punya jalur pemanggilan dari luar. */

-- ── 2. Hapus akun (Stage 6 → nyata) ────────────────────────────────────────
-- Mengembalikan jumlah baris yang dihapus per tabel, supaya UI/laporan bisa
-- menyebut angka yang benar-benar terjadi — bukan "berhasil" tanpa bukti.
drop function if exists public.catetind_delete_account_data();
create or replace function public.catetind_delete_account_data()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  snapshot jsonb;
begin
  if uid is null then
    raise exception 'Sesi tidak ditemukan. Masuk dulu lewat /login ya.'
      using errcode = '28000';
  end if;

  select jsonb_build_object(
    'wallets',           (select count(*) from public.wallets where user_id = uid),
    'ledger_rows',       (select count(*) from public.ledger_rows where user_id = uid),
    'debts',             (select count(*) from public.debts where user_id = uid),
    'debt_payments',     (select count(*) from public.debt_payments where user_id = uid),
    'investments',       (select count(*) from public.investments where user_id = uid),
    'asset_transactions',(select count(*) from public.asset_transactions where user_id = uid),
    'goals',             (select count(*) from public.goals where user_id = uid),
    'goal_contributions',(select count(*) from public.goal_contributions where user_id = uid),
    'bills',             (select count(*) from public.bills where user_id = uid),
    'push_subscriptions',(select count(*) from public.push_subscriptions where user_id = uid),
    'ai_usage',          (select count(*) from public.ai_usage where user_id = uid),
    'joint_memberships', (select count(*) from public.joint_members where user_id = uid)
  ) into snapshot;

  -- Dompet bersama yang DIMILIKI user ini ikut dihapus (anggota & transaksinya
  -- lewat cascade). Keanggotaan di dompet milik orang lain dicabut, tapi dompet
  -- & data pasangannya TIDAK ikut terhapus — menghapus akun sendiri tidak boleh
  -- menghapus data orang lain.
  delete from public.joint_members where user_id = uid;
  delete from public.joint_wallets where owner_id = uid;

  -- Sisanya cascade dari `auth.users` (semua FK `on delete cascade`).
  delete from auth.users where id = uid;

  return snapshot;
end $$;

revoke all on function public.catetind_delete_account_data() from anon;
grant execute on function public.catetind_delete_account_data() to authenticated;

-- ── 3. Undangan dompet bersama ─────────────────────────────────────────────
-- Satu kode aktif per dompet: kode lama yang belum dipakai langsung
-- "dikedaluwarsakan sekarang" saat kode baru dibuat, sama seperti aturan
-- `createInvite()` di `lib/invite-store.ts`.
--
-- Nama kolom keluaran sengaja DIBERI PREFIKS (`invite_code`, `invite_expires_at`):
-- dengan `RETURNS TABLE`, PL/pgSQL membuat variabel untuk tiap kolom keluaran, dan
-- nama yang sama dengan kolom tabel membuat setiap referensi jadi ambigu
-- (`42702 column reference is ambiguous`). Awalan ini menghapus kelas bug itu.
-- `drop function if exists` sebelum setiap RPC: `create or replace` TIDAK bisa
-- mengubah daftar kolom keluaran / nama argumen (42P13), padahal itu justru
-- perbaikan yang dibutuhkan. RPC di bawah tidak dipakai policy mana pun, jadi
-- menjatuhkannya aman; `catetind_is_joint_member` TIDAK dijatuhkan karena policy
-- bergantung padanya (cukup `create or replace`).
drop function if exists public.catetind_create_invite(uuid, text, integer);
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

  -- Semua referensi kolom di statement ini WAJIB ber-kualifikasi `ic.`: nama OUT
  -- parameter fungsi ini juga `expires_at`/`code`, dan tanpa kualifikasi Postgres
  -- menolaknya sebagai "column reference is ambiguous" (42702).
  update public.invite_codes ic
    set expires_at = now()
    where ic.joint_wallet_id = p_joint_wallet
      and ic.used_by is null
      and ic.expires_at > now();

  insert into public.invite_codes (code, joint_wallet_id, created_by, expires_at)
  values (normalized, p_joint_wallet, uid, expires)
  on conflict (code) do update
    set joint_wallet_id = excluded.joint_wallet_id,
        created_by      = excluded.created_by,
        expires_at      = excluded.expires_at,
        used_by         = null,
        used_at         = null;


  return query select normalized, expires;
end $$;

-- Status undangan — hanya field yang AMAN (tanpa daftar anggota/kode lain).
-- Nama kolom keluaran ber-prefiks `invite_*` dengan alasan yang sama seperti
-- `catetind_create_invite` (menghindari `42702` karena bertabrakan dengan nama
-- kolom tabel di dalam badan fungsi).
drop function if exists public.catetind_resolve_invite(text);
create or replace function public.catetind_resolve_invite(p_code text)
returns table (
  invite_status text,
  invite_wallet_id uuid,
  invite_wallet_name text,
  invite_expires_at timestamptz,
  invite_member_count integer
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
    return query select 'not_found', null::uuid, null::text, null::timestamptz, 0;
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
      (select count(*)::integer from public.joint_members m where m.joint_wallet_id = found.joint_wallet_id);
end $$;

-- Terima undangan: insert keanggotaan + tandai kode terpakai, satu transaksi.
drop function if exists public.catetind_accept_invite(text);
create or replace function public.catetind_accept_invite(p_code text)
returns table (invite_wallet_id uuid, invite_wallet_name text)
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  normalized text := upper(trim(coalesce(p_code, '')));
  found public.invite_codes%rowtype;
begin
  if uid is null then
    raise exception 'Sesi tidak ditemukan. Masuk dulu lewat /login ya.' using errcode = '28000';
  end if;

  select * into found from public.invite_codes i
    where i.code = normalized for update;

  if found.code is null then
    raise exception 'Kode undangan tidak ditemukan' using errcode = 'P0002';
  end if;
  if found.used_by is not null then
    raise exception 'Kode undangan ini sudah dipakai' using errcode = '23505';
  end if;
  if found.expires_at <= now() then
    raise exception 'Kode undangan sudah kedaluwarsa' using errcode = '22007';
  end if;

  insert into public.joint_members (joint_wallet_id, user_id, role)
  values (found.joint_wallet_id, uid, case when found.created_by = uid then 'owner' else 'member' end)
  on conflict (joint_wallet_id, user_id) do nothing;

  update public.invite_codes set used_by = uid, used_at = now() where code = found.code;

  return query
    select found.joint_wallet_id,
           (select w.name from public.joint_wallets w where w.id = found.joint_wallet_id);
end $$;

-- SECURITY DEFINER + hak eksekusi: Postgres memberi EXECUTE ke PUBLIC secara
-- default, jadi `revoke ... from anon` SAJA tidak cukup — PUBLIC tetap membuat
-- fungsi ini bisa dipanggil tanpa sesi. Karena itu dicabut dari KEDUANYA, lalu
-- diberikan hanya ke `authenticated`. `catetind_resolve_invite` sengaja tetap
-- bisa dipanggil `anon`: halaman /join/[code] menampilkan status undangan
-- SEBELUM user masuk (kodenya sendiri yang jadi otorisasinya), dan fungsinya
-- hanya mengembalikan status + nama dompet — bukan isi dompetnya.
revoke all on function public.catetind_delete_account_data() from public, anon;
revoke all on function public.catetind_create_invite(uuid, text, integer) from public, anon;
revoke all on function public.catetind_accept_invite(text) from public, anon;
revoke all on function public.catetind_resolve_invite(text) from public;
grant execute on function public.catetind_delete_account_data() to authenticated;
grant execute on function public.catetind_create_invite(uuid, text, integer) to authenticated;
grant execute on function public.catetind_accept_invite(text) to authenticated;
grant execute on function public.catetind_resolve_invite(text) to authenticated, anon;


-- ── 4. Push internal (server-to-server) ────────────────────────────────────
-- Broadcast lintas-user TIDAK boleh lewat sesi user (itu vektor phishing massal
-- yang ditutup paket 39). Token internalnya hidup sebagai SETTING DATABASE
-- (`alter database postgres set app.catetind_internal_push_token = '…'`), bukan
-- di repo — jadi tidak ada rahasia yang bisa ikut ter-commit.
-- Kosong / tidak di-set = jalur ini MATI (fail-closed), bukan terbuka.
drop function if exists public.catetind_push_targets(text);
create or replace function public.catetind_push_targets(p_token text)
returns table (endpoint text, user_id uuid, subscription jsonb)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  expected text := coalesce(current_setting('app.catetind_internal_push_token', true), '');
begin
  if length(expected) < 16 then
    return;
  end if;
  if p_token is null or p_token <> expected then
    return;
  end if;
  return query select s.endpoint, s.user_id, s.subscription from public.push_subscriptions s;
end $$;

revoke all on function public.catetind_push_targets(text) from public, anon;
grant execute on function public.catetind_push_targets(text) to authenticated;

/* ⚠️ URUTAN ITU PENTING, dan pernah salah di paket ini: `drop function` +
   `create or replace` MENGEMBALIKAN hak akses ke default Postgres (EXECUTE untuk
   PUBLIC), jadi revoke/grant WAJIB berada SETELAH definisi fungsinya. Kalau
   diletakkan sebelum (seperti versi pertama migrasi ini), haknya hidup lagi saat
   fungsi dibuat ulang — hasilnya RPC yang seharusnya tertutup bisa dipanggil
   tanpa sesi. Ketahuan lewat `scripts/supabase/verify-rls.mjs`. */

-- ── 4b. Meter pemakaian AI (naik-tambah atomik) ────────────────────────────
-- Klien TIDAK boleh "baca lalu tulis" pemakaian AI: dua tab yang chat bersamaan
-- akan saling menimpa dan user kehilangan jatahnya. Karena itu penambahannya
-- dilakukan satu statement di sini (`calls_used = calls_used + n`).
-- Nama kolom keluaran ber-prefiks `out_*` supaya tidak bertabrakan dengan nama
-- kolom di dalam badan fungsi (`42702`).
drop function if exists public.catetind_record_ai_usage(text, text, integer, integer);
create or replace function public.catetind_record_ai_usage(
  p_month_key text,
  p_activity text,
  p_calls integer default 1,
  p_addon_tokens integer default 0
)
returns table (out_calls_used integer, out_addon_tokens_remaining integer)
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  steps integer := greatest(0, coalesce(p_calls, 1));
  addon integer := greatest(0, coalesce(p_addon_tokens, 0));
begin
  if uid is null then
    raise exception 'Sesi tidak ditemukan. Masuk dulu lewat /login ya.' using errcode = '28000';
  end if;

  /* SATU statement untuk dua kebutuhan sekaligus:
       · pemakaian aktivitas (p_calls)
       · pembelian token add-on (p_addon_tokens, aktivitas `addon`)
     Keduanya naik-tambah di database, jadi dua tab yang bersamaan tidak saling
     menimpa — dan pembelian add-on tidak perlu baris terpisah di klien. */
  insert into public.ai_usage as usage (user_id, month_key, activity, calls_used, addon_tokens_remaining, purchased_tokens)
  values (uid, p_month_key, p_activity, steps, addon, addon)
  on conflict (user_id, month_key, activity) do update
    set calls_used             = usage.calls_used + steps,
        addon_tokens_remaining = usage.addon_tokens_remaining + addon,
        purchased_tokens       = usage.purchased_tokens + addon,
        updated_at             = now();

  return query
    select usage.calls_used, usage.addon_tokens_remaining
    from public.ai_usage usage
    where usage.user_id = uid and usage.month_key = p_month_key and usage.activity = p_activity;
end $$;


revoke all on function public.catetind_record_ai_usage(text, text, integer, integer) from public, anon;
grant execute on function public.catetind_record_ai_usage(text, text, integer, integer) to authenticated;

-- ── 5. Realtime untuk transaksi dompet bersama ─────────────────────────────
-- `replica identity full` supaya payload DELETE/UPDATE ikut membawa kolomnya
-- (tanpa ini klien realtime hanya menerima primary key).
alter table public.joint_transactions replica identity full;

do $$ begin
  alter publication supabase_realtime add table public.joint_transactions;
exception
  when duplicate_object then null;   -- sudah pernah ditambahkan
  when undefined_object then null;   -- publication belum ada di instance ini
end $$;


