-- ═══════════════════════════════════════════════════════════════════════════
-- CatetInd · 02 · TABEL DOMAIN (utang, aset, celengan, tagihan, kuota AI,
-- push, dompet bersama). (paket 45)
--
-- Aturan yang sama seperti migrasi 01: TIDAK ADA kolom saldo/sisa yang bisa
-- ditulis bebas. Sisa utang & nilai celengan DITURUNKAN dari barisnya:
--
--     sisa utang      = principal − Σ debt_payments.amount
--     nilai celengan  = Σ goal_contributions.amount
--
-- (`remaining` di `debts` sengaja disimpan sebagai `principal` saja — lihat catatan
-- di tabelnya. Pergerakan KAS tetap lewat `ledger_rows` sesuai Stage 4B.)
-- ═══════════════════════════════════════════════════════════════════════════

do $$ begin
  create type public.debt_direction as enum ('owed_by_me', 'owed_to_me');
exception when duplicate_object then null; end $$;

-- ── 1. Utang & piutang ──────────────────────────────────────────────────────
-- `principal` = pokok pinjaman. Sisa TIDAK disimpan: ia `principal − Σ cicilan`
-- (view `debt_balances` di bawah), karena kolom sisa yang bisa ditulis langsung
-- adalah cara paling gampang membuat "utangku lunas di satu halaman, masih ada di
-- halaman lain".
create table if not exists public.debts (
  id                  uuid primary key default gen_random_uuid(),
  user_id             uuid not null default auth.uid() references auth.users (id) on delete cascade,
  direction           public.debt_direction not null,
  type                text not null default 'other',
  counterparty        text not null default '',
  provider            text,
  principal           bigint not null check (principal >= 0),
  monthly_installment bigint not null default 0 check (monthly_installment >= 0),
  tenor               integer,
  interest            numeric(6, 3),
  due_date            date,
  status              text not null default 'active',
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

create table if not exists public.debt_payments (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null default auth.uid() references auth.users (id) on delete cascade,
  debt_id       uuid not null references public.debts (id) on delete cascade,
  amount        bigint not null check (amount > 0),
  paid_at       date not null default current_date,
  wallet_id     text,
  kind          text not null default 'installment',
  cash_moved    bigint not null default 0,
  change_amount bigint not null default 0,
  client_tx_id  text not null,
  created_at    timestamptz not null default now(),
  unique (user_id, client_tx_id),
  foreign key (user_id, wallet_id) references public.wallets (user_id, id) on delete set null
);

create or replace view public.debt_balances
with (security_invoker = true) as
  select
    d.user_id,
    d.id as debt_id,
    d.direction,
    d.principal,
    (d.principal - coalesce(sum(p.amount), 0))::bigint as remaining,
    d.status
  from public.debts d
  left join public.debt_payments p on p.debt_id = d.id and p.user_id = d.user_id
  group by d.user_id, d.id, d.direction, d.principal, d.status;

-- ── 2. Aset & riwayat transaksinya ──────────────────────────────────────────
-- `avg_price` = harga rata-rata per unit; NILAI aset = units × harga pasar
-- terakhir dari `asset_transactions` (kind 'price'), bukan angka yang disimpan.
create table if not exists public.investments (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name        text not null,
  asset_class text not null default 'lainnya',
  platform    text,
  units       numeric(20, 6) not null default 0,
  avg_price   bigint not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create table if not exists public.asset_transactions (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null default auth.uid() references auth.users (id) on delete cascade,
  investment_id uuid not null references public.investments (id) on delete cascade,
  kind          text not null check (kind in ('buy', 'sell', 'price')),
  units         numeric(20, 6) not null default 0,
  price         bigint not null default 0,
  amount        bigint not null default 0,
  date          date not null default current_date,
  note          text not null default '',
  client_tx_id  text not null,
  created_at    timestamptz not null default now(),
  unique (user_id, client_tx_id)
);

create or replace view public.investment_values
with (security_invoker = true) as
  select
    i.user_id,
    i.id as investment_id,
    i.name,
    i.asset_class,
    i.units,
    (i.units * coalesce(
      (select t.price from public.asset_transactions t
        where t.investment_id = i.id and t.kind = 'price'
        order by t.date desc, t.created_at desc limit 1),
      i.avg_price
    ))::bigint as value
  from public.investments i;

-- ── 3. Celengan (sinking fund) ──────────────────────────────────────────────
-- Sama seperti dompet: target & setoran disimpan, "sudah terkumpul" DITURUNKAN.
create table if not exists public.goals (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name          text not null,
  target        bigint not null check (target > 0),
  due_date      date,
  emoji         text,
  category      text,
  status        text not null default 'active',
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create table if not exists public.goal_contributions (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null default auth.uid() references auth.users (id) on delete cascade,
  goal_id        uuid not null references public.goals (id) on delete cascade,
  amount         bigint not null check (amount > 0),
  contributed_at date not null default current_date,
  wallet_id      text,
  client_tx_id   text not null,
  created_at     timestamptz not null default now(),
  unique (user_id, client_tx_id),
  foreign key (user_id, wallet_id) references public.wallets (user_id, id) on delete set null
);

create or replace view public.goal_savings
with (security_invoker = true) as
  select
    g.user_id,
    g.id as goal_id,
    g.name,
    g.target,
    coalesce(sum(c.amount), 0)::bigint as saved
  from public.goals g
  left join public.goal_contributions c on c.goal_id = g.id and c.user_id = g.user_id
  group by g.user_id, g.id, g.name, g.target;

-- ── 4. Tagihan rutin ────────────────────────────────────────────────────────
create table if not exists public.bills (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name        text not null,
  amount      bigint not null check (amount >= 0),
  due_day     integer check (due_day between 1 and 31),
  category    text,
  wallet_id   text,
  active      boolean not null default true,
  remind_days integer not null default 3,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  foreign key (user_id, wallet_id) references public.wallets (user_id, id) on delete set null
);

-- ── 5. Kuota AI (meter pemakaian) ───────────────────────────────────────────
-- Kunci (user_id, month_key, activity): bulan berganti = baris baru, jadi tidak
-- ada "reset" yang perlu dipercaya dari klien.
create table if not exists public.ai_usage (
  user_id                uuid not null default auth.uid() references auth.users (id) on delete cascade,
  month_key              text not null,
  activity               text not null,
  calls_used             integer not null default 0 check (calls_used >= 0),
  addon_tokens_remaining integer not null default 0 check (addon_tokens_remaining >= 0),
  purchased_tokens       integer not null default 0 check (purchased_tokens >= 0),
  updated_at             timestamptz not null default now(),
  primary key (user_id, month_key, activity)
);

-- ── 6. Pengaturan user (onboarding, target bulanan, privasi) ────────────────
create table if not exists public.user_settings (
  user_id         uuid primary key default auth.uid() references auth.users (id) on delete cascade,
  masked          boolean not null default false,
  onboarding      jsonb,
  monthly_targets jsonb,
  privacy         jsonb not null default '{}'::jsonb,
  updated_at      timestamptz not null default now()
);

-- ── 7. Push subscription ────────────────────────────────────────────────────
-- `endpoint` = kunci primer (satu endpoint per browser/perangkat). RLS
-- `user_id = auth.uid()` membuat endpoint orang lain tidak terbaca — dan
-- pengiriman "ke semua orang" hanya lewat RPC internal (migrasi 04).
create table if not exists public.push_subscriptions (
  endpoint     text primary key,
  user_id      uuid not null default auth.uid() references auth.users (id) on delete cascade,
  subscription jsonb not null,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

-- ── 8. Index domain ────────────────────────────────────────────────────────
create index if not exists debts_user_idx on public.debts (user_id);
create index if not exists debt_payments_user_idx on public.debt_payments (user_id);
create index if not exists debt_payments_debt_idx on public.debt_payments (debt_id);
create index if not exists investments_user_idx on public.investments (user_id);
create index if not exists asset_transactions_user_idx on public.asset_transactions (user_id);
create index if not exists asset_transactions_investment_idx on public.asset_transactions (investment_id);
create index if not exists goals_user_idx on public.goals (user_id);
create index if not exists goal_contributions_user_idx on public.goal_contributions (user_id);
create index if not exists bills_user_idx on public.bills (user_id);
create index if not exists push_subscriptions_user_idx on public.push_subscriptions (user_id);
create index if not exists ai_usage_user_idx on public.ai_usage (user_id);

-- ── 9. Dompet bersama (joint wallet) ───────────────────────────────────────
-- Dua identitas yang SENGAJA dipisah (Stage 1 #4):
--   `user_id`         = siapa yang MENGETIK catatannya (dipakai izin & privasi)
--   `paid_by_user_id` = siapa yang KANTONGNYA keluar uang (dipakai timbangan)
create table if not exists public.joint_wallets (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  owner_id   uuid not null default auth.uid() references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

create table if not exists public.joint_members (
  joint_wallet_id uuid not null references public.joint_wallets (id) on delete cascade,
  user_id         uuid not null references auth.users (id) on delete cascade,
  role            text not null default 'member',
  joined_at       timestamptz not null default now(),
  primary key (joint_wallet_id, user_id)
);

create table if not exists public.joint_transactions (
  id                uuid primary key default gen_random_uuid(),
  joint_wallet_id   uuid not null references public.joint_wallets (id) on delete cascade,
  user_id           uuid not null default auth.uid() references auth.users (id) on delete cascade,
  paid_by_user_id   uuid not null default auth.uid() references auth.users (id) on delete cascade,
  description       text not null default '',
  amount            bigint not null check (amount >= 0),
  category          text,
  date              date not null default current_date,
  time_label        text not null default '00:00',
  split_type        text not null default 'equal' check (split_type in ('equal', 'percentage', 'nominal', 'single_payer')),
  split_percents    jsonb,
  split_amounts     jsonb,
  bearer_id         uuid,
  is_private        boolean not null default false,
  private_for_user  uuid,
  is_settlement     boolean not null default false,
  month_key         text not null,
  client_tx_id      text not null,
  created_at        timestamptz not null default now(),
  unique (joint_wallet_id, client_tx_id)
);

create index if not exists joint_wallets_owner_idx on public.joint_wallets (owner_id);
create index if not exists joint_members_user_idx on public.joint_members (user_id);
create index if not exists joint_transactions_wallet_idx on public.joint_members (joint_wallet_id, user_id);
create index if not exists joint_transactions_wallet_date_idx
  on public.joint_transactions (joint_wallet_id, date desc);

-- ── 10. Kode undangan dompet bersama ───────────────────────────────────────
-- Status invite adalah OTORISASI, jadi ia hidup di server (dulu di localStorage
-- perangkat — kode yang dibuat satu orang tidak bisa dipakai orang lain di
-- perangkat lain). `used_by` + `expires_at` ditegakkan RPC di migrasi 04.
create table if not exists public.invite_codes (
  code            text primary key,
  joint_wallet_id uuid not null references public.joint_wallets (id) on delete cascade,
  created_by      uuid not null default auth.uid() references auth.users (id) on delete cascade,
  created_at      timestamptz not null default now(),
  expires_at      timestamptz not null,
  used_by         uuid references auth.users (id) on delete set null,
  used_at         timestamptz
);

create index if not exists invite_codes_wallet_idx on public.invite_codes (joint_wallet_id);
create index if not exists invite_codes_created_by_idx on public.invite_codes (created_by);

-- View publik transaksi bersama: isi catatan privat disamarkan untuk SEMUA orang
-- kecuali pemiliknya. Nominal sengaja TETAP terlihat karena memang dipakai
-- menghitung kewajiban bersama (`PRIVATE_EXPENSE_POLICY = 'shared'` di
-- `lib/data/joint-ledger.ts`) — batas ini ditulis apa adanya di laporan paket 45,
-- bukan diklaim sebagai "zero-access".
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
    t.created_at
  from public.joint_transactions t;

-- ── 11. Net worth turunan (kas + aset + piutang − utang) ───────────────────
create or replace view public.user_net_worth
with (security_invoker = true) as
  select
    u.user_id,
    coalesce(c.cash_total, 0)::bigint as cash,
    coalesce(i.asset_value, 0)::bigint as assets,
    coalesce(r.receivable, 0)::bigint as receivables,
    coalesce(d.debt, 0)::bigint as debts,
    (coalesce(c.cash_total, 0) + coalesce(i.asset_value, 0) + coalesce(r.receivable, 0)
      - coalesce(d.debt, 0))::bigint as net_worth
  from (
    select user_id from public.wallets
    union select user_id from public.debts
    union select user_id from public.investments
  ) u
  left join public.wallet_cash_total c on c.user_id = u.user_id
  left join (
    select user_id, sum(value) as asset_value
    from public.investment_values group by user_id
  ) i on i.user_id = u.user_id
  left join (
    select user_id, sum(greatest(remaining, 0)) as receivable
    from public.debt_balances where direction = 'owed_to_me' group by user_id
  ) r on r.user_id = u.user_id
  left join (
    select user_id, sum(greatest(remaining, 0)) as debt
    from public.debt_balances where direction = 'owed_by_me' group by user_id
  ) d on d.user_id = u.user_id;
