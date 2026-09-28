-- ═══════════════════════════════════════════════════════════════════════════
-- CatetInd · 01 · SKEMA INTI UANG (paket 45 · audit Stage 7)
--
-- Aturan yang TIDAK BOLEH dilanggar di sini, sama dengan `lib/money/ledger.ts`:
--
--     saldo = opening + Σ baris ledger
--
-- Karena itu TIDAK ADA kolom `balance` di `wallets`. Satu-satunya angka saldo yang
-- ada di database adalah VIEW turunan `wallet_balances` — kalau ada yang mau
-- "memperbaiki" skema ini dengan menambah kolom saldo yang bisa ditulis langsung,
-- ia sedang menghidupkan lagi dua-angka-untuk-satu-dompet (temuan audit #8).
--
-- Migrasi ini IDEMPOTENT: aman dijalankan berkali-kali (`if not exists`,
-- `create or replace`, dan penjaga `duplicate_object` untuk enum).
-- ═══════════════════════════════════════════════════════════════════════════

-- ── 1. Tipe enum ────────────────────────────────────────────────────────────
-- Daftar `ledger_row_type` HARUS sama dengan `LedgerRowType` di
-- `lib/money/ledger.ts`; mapper `lib/supabase/mappers.ts` yang menjembatani dan
-- diuji (`lib/supabase/mappers.test.ts`).
do $$ begin
  create type public.ledger_row_type as enum (
    'expense', 'income', 'transfer', 'settlement', 'balance_adjustment',
    'debt_payment', 'receivable_payment', 'change', 'refund'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.wallet_kind as enum ('bank', 'ewallet', 'cash');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.wallet_context as enum ('pribadi', 'keluarga', 'bersama');
exception when duplicate_object then null; end $$;

-- ── 2. Profil ───────────────────────────────────────────────────────────────
-- `nickname` = nama panggilan (PRD 5933: dua field saja saat daftar). Tidak ada
-- telepon/alamat/tanggal lahir — bukan karena belum dikerjakan, tapi karena
-- memang tidak pernah diminta (zero data policy).
create table if not exists public.profiles (
  user_id    uuid primary key references auth.users (id) on delete cascade,
  nickname   text not null default 'Kamu',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ── 3. Dompet ───────────────────────────────────────────────────────────────
-- `opening` = saldo SEBELUM baris ledger apa pun (`WalletSeed.opening`).
-- Kunci primer GABUNGAN (user_id, id): id dompet buatan user (`w-1`) hanya unik
-- di dalam satu akun, jadi kunci global akan menabrakkan dompet dua user.
create table if not exists public.wallets (
  user_id    uuid not null default auth.uid() references auth.users (id) on delete cascade,
  id         text not null,
  name       text not null,
  holder     text not null default '',
  number     text not null default '',
  network    text not null default '',
  kind       public.wallet_kind not null default 'cash',
  type       text not null default 'Cash',
  context    public.wallet_context not null default 'pribadi',
  opening    bigint not null default 0 check (opening >= 0),
  art        text not null default 'kawung',
  color      text not null default '',
  face       text not null default '',
  band_class text not null default '',
  face_class text not null default '',
  glow_class text,
  sort_index integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, id)
);

-- ── 4. Baris ledger ────────────────────────────────────────────────────────
-- `client_tx_id` = KUNCI IDEMPOTENSI dari `lib/client-tx.ts`. Di klien penjaganya
-- di memory (`lib/money/store.ts`); di sini penjaganya constraint di database,
-- sehingga double-tap / retry jaringan di PERANGKAT LAIN pun tidak bisa
-- menggandakan catatan (unique per user).
-- `wallet_id` boleh NULL = baris belum terhubung ke dompet mana pun (cell
-- kosong `''` di domain dipetakan ke NULL oleh mapper).
create table if not exists public.ledger_rows (
  user_id           uuid not null default auth.uid() references auth.users (id) on delete cascade,
  id                text not null,
  wallet_id         text,
  type              public.ledger_row_type not null,
  amount            bigint not null,
  date              date not null default current_date,
  note              text not null default '',
  category          text,
  counter_wallet_id text,
  client_tx_id      text not null,
  joint_wallet_id   uuid,
  paid_by_user_id   uuid,
  ai_generated      boolean not null default false,
  time_label        text not null default '00:00',
  seq               bigint not null default 1,
  created_at        timestamptz not null default now(),
  primary key (user_id, id),
  unique (user_id, client_tx_id),
  -- FK gabungan: baris hanya boleh menunjuk dompet MILIK USER YANG SAMA. Ini
  -- menutup kelas bug "baris user A menempel di dompet user B" di lapis skema,
  -- bukan di lapis kode.
  foreign key (user_id, wallet_id) references public.wallets (user_id, id) on delete cascade,
  foreign key (user_id, counter_wallet_id) references public.wallets (user_id, id) on delete cascade,
  -- `balance_adjustment` & `change` memang BERTANDA (selisih); jenis lain > 0
  constraint ledger_rows_amount_rule check (
    case when type in ('balance_adjustment', 'change') then amount <> 0 else amount > 0 end
  )
);

-- ── 5. Turunan: efek per baris → saldo per dompet → total kas ───────────────
-- `ledger_row_effects` memindahkan rumus `walletDelta()` (`lib/money/ledger.ts`)
-- ke SQL supaya VIEW saldo tidak menebak-nebak.
-- `security_invoker = true` → RLS tabel dasar tetap berlaku saat view dibaca.
create or replace view public.ledger_row_effects
with (security_invoker = true) as
  select
    user_id,
    id as row_id,
    wallet_id,
    case type
      when 'income'             then amount
      when 'receivable_payment' then amount
      when 'balance_adjustment' then amount
      when 'change'             then amount
      when 'expense'            then -amount
      when 'transfer'           then -amount
      when 'settlement'         then -amount
      when 'debt_payment'       then -amount
      -- `refund` belum punya aturan arah di `lib/money/ledger.ts` (walletDelta
      -- tidak menanganinya) → 0 di sini juga, supaya server & klien tidak pernah
      -- menghitung angka yang berbeda.
      else 0
    end as delta
  from public.ledger_rows
  where wallet_id is not null
  union all
  -- sisi penerima: apa pun jenisnya, uangnya MASUK ke dompet lawan
  select user_id, id, counter_wallet_id, abs(amount)
  from public.ledger_rows
  where counter_wallet_id is not null;

create or replace view public.wallet_balances
with (security_invoker = true) as
  select
    w.user_id,
    w.id as wallet_id,
    w.name,
    w.opening,
    (w.opening + coalesce(sum(e.delta), 0))::bigint as balance
  from public.wallets w
  left join public.ledger_row_effects e
    on e.user_id = w.user_id and e.wallet_id = w.id
  group by w.user_id, w.id, w.name, w.opening;

create or replace view public.wallet_cash_total
with (security_invoker = true) as
  select user_id, coalesce(sum(balance), 0)::bigint as cash_total
  from public.wallet_balances
  group by user_id;

-- ── 6. Index ────────────────────────────────────────────────────────────────
-- Aturan paket 45: semua tabel ber-`user_id` wajib punya index di kolom itu
-- (tanpa ini setiap query RLS jadi sequential scan), dan ledger punya index
-- gabungan (user_id, date) karena Riwayat selalu menyaring & mengurutkan tanggal.
create index if not exists wallets_user_idx on public.wallets (user_id);
create index if not exists ledger_rows_user_date_idx on public.ledger_rows (user_id, date desc);
create index if not exists ledger_rows_user_wallet_idx on public.ledger_rows (user_id, wallet_id);
create index if not exists ledger_rows_client_tx_idx on public.ledger_rows (user_id, client_tx_id);
