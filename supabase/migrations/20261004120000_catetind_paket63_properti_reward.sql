-- ══════════════════════════════════════════════════════════════════════════════
-- CatetInd · 06 · PROPERTI & REWARD REFERRAL (paket 63)
--
-- Dua tabel yang dibutuhkan paket 63:
--   · `physical_assets`  → tab "Properti & Aset Fisik" di /wealth (inventaris
--                          modal `u`, halaman #29). Aturan yang sama dengan
--                          `investments`/`debts`: TIDAK ada kolom nilai
--                          "turunan" yang bisa ditulis bebas — `current_value`
--                          memang nilai TERAKHIR yang diisi user (bukan saldo).
--   · `referral_rewards` → ledger reward referral. Karena pembayaran (Midtrans)
--                          belum aktif, tabel ini SENGAJA kosong; reward hanya
--                          masuk dari webhook pembayaran (idempoten per
--                          `referral_id`) — bukan dikarang di klien.
--
-- Idempotent: aman dijalankan berkali-kali.
-- ══════════════════════════════════════════════════════════════════════════════

-- ── 1. Aset fisik (properti) ──────────────────────────────────────────────────
do $$ begin
  create type public.physical_asset_category as enum
    ('rumah', 'tanah', 'kendaraan', 'logam_mulia', 'perhiasan', 'lainnya');
exception when duplicate_object then null; end $$;

create table if not exists public.physical_assets (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name           text not null,
  category       public.physical_asset_category not null default 'lainnya',
  -- harga beli & nilai sekarang dalam RUPIAH UTUH (integer), sama seperti kolom uang lain
  purchase_price bigint not null default 0 check (purchase_price >= 0),
  current_value  bigint not null default 0 check (current_value >= 0),
  acquired_at    date,
  note           text not null default '',
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

create index if not exists physical_assets_user_idx on public.physical_assets (user_id);

-- ── 2. Ledger reward referral ─────────────────────────────────────────────────
create table if not exists public.referral_rewards (
  id               uuid primary key default gen_random_uuid(),
  -- satu reward per relasi referral (idempotensi ditegakkan di skema)
  referral_id      uuid unique references public.referrals (id) on delete cascade,
  referrer_user_id uuid not null references auth.users (id) on delete cascade,
  reward_kind      text not null,
  reward_amount    integer not null default 0,
  created_at       timestamptz not null default now()
);

create index if not exists referral_rewards_referrer_idx on public.referral_rewards (referrer_user_id);

-- ── 3. RLS ────────────────────────────────────────────────────────────────────
alter table public.physical_assets enable row level security;
alter table public.referral_rewards enable row level security;

drop policy if exists physical_assets_owner_all on public.physical_assets;
create policy physical_assets_owner_all on public.physical_assets
  for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

/* Reward hanya BISA DIBACA pemiliknya; yang menulis adalah webhook pembayaran
   (kunci peran server) — klien tidak punya jalur tulis, jadi tidak bisa
   mengarang reward untuk dirinya sendiri. */
drop policy if exists referral_rewards_owner_select on public.referral_rewards;
create policy referral_rewards_owner_select on public.referral_rewards
  for select to authenticated using (referrer_user_id = auth.uid());
