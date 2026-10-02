-- ══════════════════════════════════════════════════════════════════════════════
-- CatetInd · 05 · REFERRAL (paket 64 · Domain 7D)
--
-- Integritas kode teman: sebelum sebuah registrasi dianggap sah, backend HARUS
-- memeriksa ke DATABASE apakah kodenya benar-benar ada. Karena itu:
--
--   · `referral_codes` — satu kode unik per user (dibuat otomatis oleh trigger
--     saat `auth.users` lahir, sama polanya dengan `catetind_handle_new_user`).
--   · `referrals`      — relasi pengundang → yang diundang, ditulis lewat RPC
--     `security definer` (klien TIDAK PUNYA policy insert di sini; fail-closed).
--
-- Kedua tabel RLS-nya aktif. Yang boleh dibaca lewat REST hanya baris milik
-- sendiri; MENULIS hanya lewat fungsi di bawah. Migrasi ini idempotent.
-- ══════════════════════════════════════════════════════════════════════════════

-- ── 1. Skema ────────────────────────────────────────────────────────────────
create table if not exists public.referral_codes (
  user_id    uuid primary key references auth.users (id) on delete cascade,
  -- kode publik user (mis. `RINA-X7K`) — huruf besar, unik lintas akun
  code       text not null unique,
  created_at timestamptz not null default now()
);

create table if not exists public.referrals (
  id               uuid primary key default gen_random_uuid(),
  -- pengundang (pemilik kode)
  referrer_user_id uuid not null references auth.users (id) on delete cascade,
  -- kode apa adanya yang dipakai saat mendaftar (audit trail)
  code             text not null,
  -- email yang diundang: disimpan lebih dulu karena akun baru belum tentu
  -- terkonfirmasi (mailer_autoconfirm: false) saat relasinya dicatat
  referred_email   text,
  -- diisi begitu user yang diundang benar-benar punya akun
  referred_user_id uuid references auth.users (id) on delete set null,
  created_at       timestamptz not null default now(),
  unique (referred_email)
);

create index if not exists referrals_referrer_idx on public.referrals (referrer_user_id);

-- ── 2. RLS: baca milik sendiri, tulis HANYA lewat RPC ────────────────────────
alter table public.referral_codes enable row level security;
alter table public.referrals enable row level security;

drop policy if exists referral_codes_owner_select on public.referral_codes;
create policy referral_codes_owner_select on public.referral_codes
  for select to authenticated using (user_id = auth.uid());

drop policy if exists referrals_party_select on public.referrals;
create policy referrals_party_select on public.referrals
  for select to authenticated
  using (referrer_user_id = auth.uid() or referred_user_id = auth.uid());

/* Sengaja TIDAK ada policy insert/update/delete: satu-satunya jalan menulis
   adalah RPC `security definer` di bawah, sehingga klien tidak bisa mengarang
   relasi referral atau memberi dirinya diskon. */

-- ── 3. RPC: validasi & pencatatan relasi ────────────────────────────────────
/* `validate_referral_code` mengembalikan user_id pengundang (atau NULL kalau
   kodenya tidak ada). Dipanggil endpoint `/api/referral/validate` SEBELUM akun
   baru difinalkan — kalau NULL, registrasi ditolak dengan error state. */
create or replace function public.validate_referral_code(p_code text)
returns uuid
language sql
security definer
set search_path = public
as $$
  select user_id
  from public.referral_codes
  where upper(code) = upper(trim(coalesce(p_code, '')))
  limit 1;
$$;

/* `record_referral` menulis relasi pengundang → email yang diundang.
   Idempotent: satu email hanya tercatat sekali (`on conflict do nothing`).
   Mengembalikan `true` kalau kodenya sah (walau relasinya sudah ada). */
create or replace function public.record_referral(p_code text, p_referred_email text)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_referrer uuid;
  v_email    text;
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

  insert into public.referrals (referrer_user_id, code, referred_email)
  values (v_referrer, upper(trim(p_code)), v_email)
  on conflict (referred_email) do nothing;

  return true;
end $$;

-- ── 4. Kode otomatis untuk tiap user baru ───────────────────────────────────
/* Dipasang pada `auth.users` (bukan `profiles`) supaya kode sudah ada begitu
   akun lahir, terlepas dari urutan trigger profil. Bentuknya `NAMA-XXX` dengan
   3 huruf acak; tabrakan diulang beberapa kali sebelum menyerah. */
create or replace function public.catetind_ensure_referral_code()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  base      text;
  candidate text;
  attempts  int := 0;
begin
  base := upper(substr(regexp_replace(coalesce(new.raw_user_meta_data ->> 'nickname', ''), '[^A-Za-z0-9]', '', 'g'), 1, 4));
  if base is null or length(base) < 2 then
    base := 'CATET';
  end if;

  loop
    candidate := base || '-' || upper(substr(md5(random()::text), 1, 3));
    begin
      insert into public.referral_codes (user_id, code) values (new.id, candidate);
      return new;
    exception when unique_violation then
      attempts := attempts + 1;
      if attempts >= 8 then
        raise;
      end if;
    end;
  end loop;
end $$;

drop trigger if exists catetind_on_auth_user_referral_code on auth.users;
create trigger catetind_on_auth_user_referral_code
  after insert on auth.users
  for each row execute function public.catetind_ensure_referral_code();

-- ── 5. Hak eksekusi ─────────────────────────────────────────────────────────
/* `anon` memang perlu: validasi kode terjadi SEBELUM user punya sesi — itulah
   inti "integritas referral". Fungsi trigger tidak butuh grant (dijalankan
   sebagai trigger, pola sama dengan `catetind_handle_new_user`). */
grant execute on function public.validate_referral_code(text) to anon, authenticated;
grant execute on function public.record_referral(text, text) to anon, authenticated;

