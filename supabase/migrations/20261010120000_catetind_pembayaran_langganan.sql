-- ══════════════════════════════════════════════════════════════════════════════
-- CatetInd · 08 · PEMBAYARAN & LANGGANAN (Midtrans → langganan aktif)
--
-- Selama ini rail pembayaran (`lib/payments/*`, `/api/payment/*`) jujur bilang
-- "belum aktif": tidak ada tabel langganan, jadi webhook pun tidak punya tempat
-- menulis. Migrasi ini menambahkannya — SATU produk (Founding Member, sekali
-- bayar seumur hidup) dengan harga TETAP.
--
-- Kenapa harga TETAP, bukan naik per slot seperti sketsa PRD 4114–4288:
-- janji produk di `lib/data/pricing.ts` adalah "1 harga transparan — tidak ada
-- promo yang bikin bingung". `current_price` ada supaya `/api/price` bisa
-- membacanya real-time, tapi TIDAK pernah bergerak karena penjualan (nilainya
-- ditulis hanya dari sini, 129000).
--
-- Kenapa `purchases` menyimpan baris `pending` sejak route create: webhook
-- Midtrans tidak membawa sesi user (`order_id` hanya memuat 8 huruf pertama id
-- user), jadi satu-satunya cara memetakan notifikasi → pemilik adalah baris yang
-- sudah ditulis lebih dulu. Baris itu ditulis ATAS NAMA user (RLS), bukan oleh
-- kunci peran server.
--
-- Fungsi pemenuhan (`catetind_fulfill_purchase`) adalah `security definer` dan
-- HANYA `service_role` yang boleh memanggilnya — klien tidak punya jalur untuk
-- mengaktifkan langganan sendiri. Pemenuhan idempoten by `order_id`.
--
-- Idempotent: aman dijalankan berkali-kali.
-- ══════════════════════════════════════════════════════════════════════════════

-- ── 1. Harga (singleton, `id = 1`) ───────────────────────────────────────────
create table if not exists public.pricing_state (
  id               integer primary key default 1 check (id = 1),
  -- jumlah yang sudah dibeli (dipakai `/api/price` → `slotSold`/`slotsLeft`)
  current_slot     integer not null default 0,
  -- harga produk TUNGGAL, tetap. Tidak pernah diubah oleh pembelian.
  current_price    integer not null default 129000,
  current_tier     text not null default 'founding_member',
  last_purchase_at timestamptz,
  updated_at       timestamptz not null default now()
);

insert into public.pricing_state (id, current_slot, current_price, current_tier)
values (1, 0, 129000, 'founding_member')
on conflict (id) do nothing;

-- ── 2. Pembelian ─────────────────────────────────────────────────────────────
create table if not exists public.purchases (
  id                      uuid primary key default gen_random_uuid(),
  user_id                 uuid not null default auth.uid() references auth.users (id) on delete cascade,
  -- `order_id` Midtrans — kunci idempotensi pemenuhan
  order_id                text unique not null,
  tier_name               text not null default 'founding_member',
  slot_number             integer,
  -- nominal yang BENAR-BENAR dibayar (dari webhook), bukan tebakan klien
  price_paid              bigint not null default 0 check (price_paid >= 0),
  payment_method          text,
  midtrans_transaction_id text,
  -- 'pending' | 'settlement' | 'capture' | 'expire' | 'cancel' | 'deny' | 'refund'
  status                  text not null default 'pending',
  paid_at                 timestamptz,
  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now()
);

create index if not exists purchases_user_idx   on public.purchases (user_id);
create index if not exists purchases_status_idx on public.purchases (status);

-- ── 3. Langganan aktif ───────────────────────────────────────────────────────
create table if not exists public.user_subscriptions (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid unique not null references auth.users (id) on delete cascade,
  tier_name    text not null default 'founding_member',
  -- produk tunggal ini lifetime: tidak ada `expires_at`
  is_lifetime  boolean not null default true,
  started_at   timestamptz not null default now(),
  expires_at   timestamptz,
  is_active    boolean not null default true,
  last_renewed_at timestamptz,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

-- ── 4. RLS ───────────────────────────────────────────────────────────────────
alter table public.pricing_state      enable row level security;
alter table public.purchases          enable row level security;
alter table public.user_subscriptions enable row level security;

/* Harga = informasi publik (bukan data user). Satu baris, dibaca anon/authenticated.
   TIDAK ada policy tulis: yang mengubah `current_slot` hanya fungsi pemenuhan. */
drop policy if exists pricing_state_public_read on public.pricing_state;
create policy pricing_state_public_read on public.pricing_state
  for select to anon, authenticated using (true);

/* Pembelian: user hanya melihat miliknya, dan hanya boleh MENYISIPKAN baris
   `pending` atas namanya sendiri. Tidak ada policy UPDATE/DELETE — status &
   nominal ditentukan webhook, bukan klien. */
drop policy if exists purchases_owner_select on public.purchases;
create policy purchases_owner_select on public.purchases
  for select to authenticated using (user_id = auth.uid());

drop policy if exists purchases_owner_insert_pending on public.purchases;
create policy purchases_owner_insert_pending on public.purchases
  for insert to authenticated
  with check (user_id = auth.uid() and status = 'pending');

/* Langganan: user hanya bisa MEMBACA miliknya. Yang menulis hanya fungsi
   pemenuhan (kunci peran server) — klien tidak bisa mengaktifkan dirinya. */
drop policy if exists user_subscriptions_owner_select on public.user_subscriptions;
create policy user_subscriptions_owner_select on public.user_subscriptions
  for select to authenticated using (user_id = auth.uid());

-- ── 5. Pemenuhan pembayaran (idempoten, hanya service_role) ──────────────────
drop function if exists public.catetind_fulfill_purchase(text, text, bigint, text, text);

create function public.catetind_fulfill_purchase(
  p_order_id          text,
  p_status            text,
  p_amount            bigint default 0,
  p_payment_method    text default null,
  p_midtrans_tx_id    text default null
)
returns table (
  claimed_slot       integer,
  claimed_price      bigint,
  claimed_tier       text,
  already_processed  boolean
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_purchase public.purchases;
  v_slot     integer;
  v_price    integer;
begin
  -- kunci global: dua notifikasi paralel tidak boleh mengklaim slot yang sama
  perform pg_advisory_xact_lock(918273645);

  select * into v_purchase from public.purchases where order_id = p_order_id for update;
  if v_purchase.id is null then
    raise exception 'order tidak ditemukan: %', p_order_id using errcode = 'P0002';
  end if;

  -- idempoten: notifikasi yang terkirim dua kali tidak menambah langganan/slot dua kali
  if v_purchase.status = 'settlement' then
    return query
      select v_purchase.slot_number, v_purchase.price_paid, v_purchase.tier_name, true;
    return;
  end if;

  -- belum sukses (pending/deny/cancel/expire/refund): catat statusnya, jangan aktifkan
  if p_status not in ('settlement', 'capture') then
    update public.purchases
       set status = p_status, updated_at = now()
     where id = v_purchase.id;
    return query select null::integer, null::bigint, null::text, false;
    return;
  end if;

  -- pembayaran SAH: klaim slot berikutnya, catat nominal yang benar-benar dibayar
  select current_slot + 1, current_price
    into v_slot, v_price
    from public.pricing_state
   where id = 1;

  update public.purchases
     set status                  = 'settlement',
         slot_number             = v_slot,
         price_paid              = greatest(p_amount, 0),
         payment_method          = coalesce(p_payment_method, payment_method),
         midtrans_transaction_id = coalesce(p_midtrans_tx_id, midtrans_transaction_id),
         paid_at                 = now(),
         updated_at              = now()
   where id = v_purchase.id;

  -- harga TETAP: yang bergerak hanya jumlah terjual + waktu pembelian terakhir
  update public.pricing_state
     set current_slot     = v_slot,
         last_purchase_at = now(),
         updated_at       = now()
   where id = 1;

  insert into public.user_subscriptions
    (user_id, tier_name, is_lifetime, started_at, is_active, last_renewed_at, updated_at)
  values
    (v_purchase.user_id, 'founding_member', true, now(), true, now(), now())
  on conflict (user_id) do update
    set tier_name      = excluded.tier_name,
        is_lifetime    = true,
        is_active      = true,
        last_renewed_at = now(),
        updated_at     = now();

  return query select v_slot, greatest(p_amount, 0), 'founding_member'::text, false;
end;
$$;

/* Jalur pemanggilan TERTUTUP untuk klien: hanya kunci peran server (webhook).
   `revoke ... from public` mencabut izin EXECUTE bawaan Postgres, lalu diberikan
   ulang hanya ke `service_role`. Tanpa ini, siapa pun bisa mengaktifkan
   langganan dirinya sendiri tanpa membayar. */
revoke all on function public.catetind_fulfill_purchase(text, text, bigint, text, text)
  from public, anon, authenticated;
grant execute on function public.catetind_fulfill_purchase(text, text, bigint, text, text)
  to service_role;

