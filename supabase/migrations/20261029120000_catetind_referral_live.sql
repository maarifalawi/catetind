-- ══════════════════════════════════════════════════════════════════════════════
-- CatetInd · 10 · REFERRAL NYATA (klik + ringkasan milik sendiri)
--
-- Sebelum migrasi ini halaman `/referral` menampilkan KONSTANTA contoh di
-- `lib/data/referral.ts` (kode `RINA-X7K`, statistik teman karangan). Tabel
-- `referral_codes` sudah ada dan trigger sudah membuat kode per akun, tapi
-- TIDAK ADA satu pun jalur baca, jadi tidak ada angka nyata yang bisa dipakai.
--
-- Yang ditambahkan di sini:
--   · `referral_clicks` — jejak klik link `/r/<kode>`. Yang disimpan HANYA kode,
--     waktu, dan HASH user agent (bukan IP, bukan UA mentah).
--   · `record_referral_click()` — dipanggil halaman pengalih `/r/<kode>` TANPA
--     sesi (pengunjung belum punya akun). `security definer`, hanya menulis.
--   · `catetind_ensure_my_referral_code()` — memastikan akun yang sudah ada
--     (dibuat sebelum trigger dipasang) tetap punya kode. Idempoten.
--   · `catetind_referral_overview()` — SATU panggilan untuk seluruh halaman.
--
-- Idempotent: aman dijalankan berkali-kali.
-- ══════════════════════════════════════════════════════════════════════════════

-- ── 1. Jejak klik ────────────────────────────────────────────────────────────
create table if not exists public.referral_clicks (
  id               bigserial primary key,
  -- pengundang pemilik kode (diisi oleh RPC, bukan oleh klien)
  referrer_user_id uuid not null references auth.users (id) on delete cascade,
  code             text not null,
  at               timestamptz not null default now(),
  /*
   * Sidik jari perangkat: sha256(user agent). TIDAK ADA IP dan TIDAK ADA user
   * agent mentah. Tujuannya hanya membedakan "12 klik" dari "1 orang klik 12
   * kali", bukan mengidentifikasi siapa pun.
   */
  ua_hash          text
);

create index if not exists referral_clicks_referrer_idx
  on public.referral_clicks (referrer_user_id, at desc);

/* index untuk dedupe per jam: pencarian "klik yang sama dalam 1 jam terakhir"
   harus lewat index, bukan sequential scan */
create index if not exists referral_clicks_dedupe_idx
  on public.referral_clicks (code, ua_hash, at desc);

alter table public.referral_clicks enable row level security;

drop policy if exists referral_clicks_owner_select on public.referral_clicks;
create policy referral_clicks_owner_select on public.referral_clicks
  for select to authenticated using (referrer_user_id = auth.uid());

/* Sengaja TIDAK ada policy insert: satu-satunya jalur menulis adalah RPC di
   bawah, jadi klien tidak bisa mengarang jumlah klik untuk dirinya sendiri. */

-- ── 2. RPC: catat klik dari halaman pengalih ─────────────────────────────────
drop function if exists public.record_referral_click(text, text);
create or replace function public.record_referral_click(p_code text, p_ua_hash text default null)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_referrer uuid;
  v_code     text := upper(trim(coalesce(p_code, '')));
  v_ua       text := nullif(trim(coalesce(p_ua_hash, '')), '');
begin
  if length(v_code) < 4 then
    return false;
  end if;

  select user_id into v_referrer
  from public.referral_codes
  where upper(code) = v_code
  limit 1;

  if v_referrer is null then
    return false;
  end if;

  /*
   * SATU KLIK PER (kode, sidik jari perangkat) PER JAM.
   *
   * Tanpa ini, satu orang yang me-refresh halaman `/r/<kode>` sepuluh kali
   * menghasilkan sepuluh "klik" — angka yang bukan bukti apa pun. Yang dihitung
   * adalah kunjungan unik per jam; `false` = klik ini diabaikan (bukan error).
   *
   * `ua_hash IS NULL` (user agent tidak terkirim) TIDAK didedupe: tanpa sidik
   * jari tidak ada dasar untuk menyimpulkan "orang yang sama".
   */
  if v_ua is not null and exists (
    select 1 from public.referral_clicks
    where referrer_user_id = v_referrer
      and code = v_code
      and ua_hash = v_ua
      and at > now() - interval '1 hour'
  ) then
    return false;
  end if;

  insert into public.referral_clicks (referrer_user_id, code, ua_hash)
  values (v_referrer, v_code, v_ua);

  return true;
end $$;

revoke all on function public.record_referral_click(text, text) from public;
grant execute on function public.record_referral_click(text, text) to anon, authenticated;

-- ── 3. RPC: pastikan pemanggil punya kode ────────────────────────────────────
drop function if exists public.catetind_ensure_my_referral_code();
create or replace function public.catetind_ensure_my_referral_code()
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid     uuid := auth.uid();
  v_code    text;
  v_base    text;
  v_attempt int := 0;
begin
  if v_uid is null then
    return null;
  end if;

  select code into v_code from public.referral_codes where user_id = v_uid;
  if v_code is not null then
    return v_code;
  end if;

  v_base := upper(substr(
    regexp_replace(
      coalesce((select nickname from public.profiles where user_id = v_uid), ''),
      '[^A-Za-z0-9]', '', 'g'
    ), 1, 4
  ));
  if v_base is null or length(v_base) < 2 then
    v_base := 'CATET';
  end if;

  loop
    v_attempt := v_attempt + 1;
    v_code := v_base || '-' || upper(substr(md5(random()::text), 1, 3));
    begin
      insert into public.referral_codes (user_id, code) values (v_uid, v_code);
      return v_code;
    exception when unique_violation then
      if v_attempt >= 10 then
        return null;
      end if;
    end;
  end loop;
end $$;

revoke all on function public.catetind_ensure_my_referral_code() from public, anon;
grant execute on function public.catetind_ensure_my_referral_code() to authenticated;

-- ── 4. RPC: ringkasan halaman /referral ──────────────────────────────────────
/*
 * Bentuk keluaran (jsonb), SATU baris:
 *   { code, clicks, pending, converted, rewardTokens, friends: [
 *       { id, name, converted, joinedAt } ] }
 *
 * `name` DITURUNKAN dari local-part email yang diundang (`budi.santoso@…` →
 * `Budisanto`), bukan karangan, dan bukan kolom baru yang menyimpan nama orang
 * lain. Pemilik kode memang sudah berhak membaca email itu (policy
 * `referrals`), jadi yang dikembalikan di sini lebih sedikit daripada yang
 * sudah bisa ia baca. `id` = uuid relasi, bukan uuid akun teman.
 */
drop function if exists public.catetind_referral_overview();
create or replace function public.catetind_referral_overview()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_code text;
begin
  if v_uid is null then
    raise exception 'Sesi tidak ditemukan. Masuk dulu lewat /login ya.' using errcode = '28000';
  end if;

  select code into v_code from public.referral_codes where user_id = v_uid;

  return jsonb_build_object(
    'code', v_code,
    'clicks', (
      select count(*) from public.referral_clicks where referrer_user_id = v_uid
    ),
    'pending', (
      select count(*) from public.referrals
      where referrer_user_id = v_uid and referred_user_id is null
    ),
    'converted', (
      select count(*) from public.referrals
      where referrer_user_id = v_uid and referred_user_id is not null
    ),
    'rewardTokens', (
      select coalesce(sum(reward_amount), 0) from public.referral_rewards
      where referrer_user_id = v_uid and reward_kind = 'tokens'
    ),
    'friends', coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'id', r.id,
          'name', initcap(substr(
            regexp_replace(split_part(coalesce(r.referred_email, 'teman'), '@', 1),
                           '[^A-Za-z]', '', 'g'),
            1, 18
          )),
          'converted', r.referred_user_id is not null,
          'joinedAt', to_char(r.created_at at time zone 'UTC', 'YYYY-MM-DD')
        )
        order by r.created_at desc
      )
      from public.referrals r
      where r.referrer_user_id = v_uid
    ), '[]'::jsonb)
  );
end $$;

revoke all on function public.catetind_referral_overview() from public, anon;
grant execute on function public.catetind_referral_overview() to authenticated;

-- ── 5. Kode contoh di dokumentasi TIDAK boleh hidup di database ──────────────
/*
 * `RINA-X7K` dipakai sebagai contoh di PRD, komentar migrasi lama, dan
 * placeholder form checkout. Kalau kode itu benar-benar ada di `referral_codes`,
 * siapa pun yang mengetiknya di checkout mendapat diskon atas nama orang lain.
 * Kode yang kebetulan sama diputar ke kode acak baru (BUKAN dihapus: barisnya
 * milik akun, dan relasi `referrals` yang sudah ada tidak boleh ikut hilang).
 */
do $$
declare
  target record;
  fresh  text;
  tries  int;
begin
  for target in
    select user_id from public.referral_codes where upper(code) = 'RINA-X7K'
  loop
    tries := 0;
    loop
      tries := tries + 1;
      fresh := 'CATET-' || upper(substr(md5(random()::text), 1, 3));
      begin
        update public.referral_codes set code = fresh where user_id = target.user_id;
        exit;
      exception when unique_violation then
        if tries >= 10 then
          raise;
        end if;
      end;
    end loop;
  end loop;
end $$;

-- ── 6. Hapus akun: klik ikut dihitung & dibersihkan ──────────────────────────
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
    'referral_clicks',   (select count(*) from public.referral_clicks where referrer_user_id = uid),
    'joint_memberships', (select count(*) from public.joint_members where user_id = uid)
  ) into snapshot;

  delete from public.joint_members where user_id = uid;
  delete from public.joint_wallets where owner_id = uid;

  delete from auth.users where id = uid;

  return snapshot;
end $$;

revoke all on function public.catetind_delete_account_data() from public, anon;
grant execute on function public.catetind_delete_account_data() to authenticated;

