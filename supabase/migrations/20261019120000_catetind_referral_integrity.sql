-- ══════════════════════════════════════════════════════════════════════════════
-- CatetInd · REFERRAL INTEGRITY (diskon teman + reward pengundang)
--
-- Migrasi ini menutup dua lubang yang membuat kode teman belum utuh:
--
--   1. `purchases.referral_code` — kode yang DIVERIFIKASI server saat charge.
--      Tanpa kolom ini, bukti "pembelian ini memakai kode X" hilang setelah
--      nominal divalidasi, sehingga webhook tidak bisa mengaitkan reward.
--
--   2. `referrals.referred_user_id` — selama ini hanya `referred_email` yang
--      ditulis, padahal webhook mencari relasi lewat `referred_user_id`.
--      Akibatnya reward pengundang TIDAK PERNAH cair. RPC di bawah mengisi
--      kolom itu begitu akunnya ada, dan trigger `auth.users` melengkapinya
--      untuk akun yang lahir setelah relasi dicatat.
--
-- Aturan yang dikunci:
--   · satu email hanya boleh terhubung ke SATU pengundang (first referrer wins);
--   · akun tidak boleh memakai kodenya sendiri;
--   · relasi boleh dicatat sebelum akun ada (email), lalu dilengkapi user id.
--
-- Idempotent: `add column if not exists`, `create or replace function`,
-- `drop trigger if exists`, dan backfill yang hanya menyentuh baris NULL.
-- ══════════════════════════════════════════════════════════════════════════════

-- ── 1. Bukti kode teman pada pembelian ──────────────────────────────────────
alter table public.purchases
  add column if not exists referral_code text;

comment on column public.purchases.referral_code is
  'Kode teman yang sudah diverifikasi server saat charge (NULL = tanpa kode). Dipakai audit & rekonsiliasi reward.';

comment on column public.purchases.expected_amount is
  'Nominal yang BENAR-BENAR ditagih (setelah diskon teman bila ada). Dibandingkan dengan gross_amount webhook; bukan harga penuh sebelum diskon.';

create index if not exists purchases_referral_code_idx
  on public.purchases (referral_code);

-- ── 2. record_referral: lengkapi user id + tolak self/different referrer ────
create or replace function public.record_referral(p_code text, p_referred_email text)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_referrer uuid;
  v_referred uuid;
  v_email    text;
  v_existing uuid;
begin
  v_email := lower(trim(coalesce(p_referred_email, '')));
  if v_email = '' then
    return false;
  end if;

  select user_id into v_referrer
  from public.referral_codes
  where upper(code) = upper(trim(coalesce(p_code, '')))
  limit 1;

  if v_referrer is null then
    return false;
  end if;

  /* Akun yang diundang mungkin sudah ada (user lama) atau belum (baru daftar). */
  select id into v_referred
  from auth.users
  where lower(email) = v_email
  limit 1;

  /* Jangan biarkan akun mengajak dirinya sendiri. */
  if v_referred is not null and v_referred = v_referrer then
    return false;
  end if;

  insert into public.referrals (referrer_user_id, code, referred_email, referred_user_id)
  values (v_referrer, upper(trim(p_code)), v_email, v_referred)
  on conflict (referred_email) do nothing;

  /* First referrer wins: kode lain untuk email yang sudah terhubung ditolak. */
  select referrer_user_id into v_existing
  from public.referrals
  where referred_email = v_email
  limit 1;

  if v_existing is distinct from v_referrer then
    return false;
  end if;

  /* Relasi lama yang dicatat sebelum akun lahir: lengkapi sekarang. */
  update public.referrals
     set referred_user_id = coalesce(referred_user_id, v_referred)
   where referred_email = v_email
     and referred_user_id is null
     and v_referred is not null;

  return true;
end $$;

grant execute on function public.record_referral(text, text) to anon, authenticated;

-- ── 3. Trigger: akun baru / email berubah → lengkapi referred_user_id ──────
create or replace function public.catetind_link_referral_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.email is null then
    return new;
  end if;

  update public.referrals
     set referred_user_id = new.id
   where lower(referred_email) = lower(new.email)
     and referred_user_id is null
     and referrer_user_id <> new.id;

  return new;
end $$;

drop trigger if exists catetind_on_auth_user_link_referral on auth.users;
create trigger catetind_on_auth_user_link_referral
  after insert or update of email on auth.users
  for each row execute function public.catetind_link_referral_user();

-- ── 4. Backfill relasi lama yang emailnya sudah punya akun ──────────────────
update public.referrals r
   set referred_user_id = u.id
  from auth.users u
 where r.referred_user_id is null
   and r.referred_email is not null
   and lower(r.referred_email) = lower(u.email)
   and r.referrer_user_id <> u.id;
