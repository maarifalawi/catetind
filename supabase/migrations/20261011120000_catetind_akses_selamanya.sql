-- ══════════════════════════════════════════════════════════════════════════════
-- CatetInd · 10 · AKSES SELAMANYA + VERIFIKASI NOMINAL WEBHOOK (paket 85)
--
-- KENAPA MIGRASI BARU, BUKAN MENYUNTING YANG LAMA:
-- `20261010120000_*` dan `20261010130000_*` SUDAH TERCATAT di
-- `supabase_migrations.schema_migrations` (sudah pernah dijalankan). Skrip
-- `pnpm supabase:migrate` melewati berkas yang versinya sudah tercatat, jadi
-- menyunting berkas lama TIDAK BEREFEK di lingkungan yang sudah migrasi.
-- Perbaikan harus berbentuk berkas BARU dengan timestamp lebih besar; skrip
-- menjalankan berkas urut nama (`sort()`), jadi berkas ini dijalankan terakhir.
--
-- ══ BUG YANG DIPERBAIKI DI SINI (bug produksi, bukan kosmetik) ══
-- Fungsi pemenuhan lama (`20261010130000_*`) menghitung masa aktif:
--
--     v_days := case when v_purchase.billing_period = 'annual' then 365 else 30 end;
--     ... is_lifetime = FALSE, expires_at = now() + (v_days || ' days')::interval
--
-- Karena `/api/payment/charge` (paket 84) sekarang menulis
-- `billing_period = 'lifetime'`, maka `v_days` jatuh ke `else 30` → SETIAP
-- pembeli 109k/129k/299k mendapat `expires_at = now() + 30 hari` dan
-- `is_lifetime = false`. Artinya janji "akses selamanya" dilanggar oleh
-- database. Mulai sekarang pembelian baru menghasilkan `is_lifetime = true`,
-- `expires_at = NULL`, dan TIDAK ada penambahan hari.
--
-- ══ KEPUTUSAN BISNIS YANG DIJALANKAN DI SINI (jawaban §7.1 paket 85) ══
-- Pembeli LAMA yang masih punya masa aktif (`is_lifetime = false`,
-- `expires_at` bertanggal) DIJADIKAN AKSES SELAMANYA (goodwill sekali jalan):
-- lihat blok BACKFILL di bagian bawah. Ini juga sekaligus membetulkan pembelian
-- `lifetime` yang sempat dirugikan bug +30 hari di atas (jawaban §7.7).
--
-- Idempotent: aman dijalankan berkali-kali (`if not exists`, `create or
-- replace`, `drop ... if exists`).
-- ══════════════════════════════════════════════════════════════════════════════

-- ── 1. Kolom baru di `purchases` (dipakai TUGAS 2: verifikasi nominal) ───────
-- `expected_amount` = nominal yang SEHARUSNYA ditagih (dihitung server dari
-- `lib/data/pricing.ts`), bukan tebakan klien. Webhook membandingkan
-- `gross_amount` notifikasi dengan kolom ini SEBELUM memenuhi.
alter table public.purchases
  add column if not exists expected_amount integer;

-- `purpose` = niat pembayaran: 'subscribe' | 'upgrade' | 'topup'.
alter table public.purchases
  add column if not exists purpose text;

-- Kolom khusus top-up token AI (purpose = 'topup'): paket add-on & jumlah token
-- yang BENAR-BENAR dibeli. Nominalnya dibaca dari `lib/ai-quota.ts` saat charge,
-- lalu dipindahkan ke `ai_addons` oleh fungsi pemenuhan.
alter table public.purchases
  add column if not exists addon_package_id text;
alter table public.purchases
  add column if not exists addon_tokens integer;

-- ── 2. Bersihkan sisa model lama yang kini YATIM ─────────────────────────────
-- Default `tier_name = 'founding_member'` dihapus supaya database tidak pernah
-- MENGARANG tier untuk baris baru. Nilai `tier_name` sekarang SELALU ditulis
-- route/charge dari `PlanId` ('catet-aja' | 'waras' | 'sultan').
alter table public.purchases           alter column tier_name drop default;
alter table public.user_subscriptions  alter column tier_name drop default;

-- `pricing_state` melacak slot & harga bergerak untuk produk Founding Member
-- yang tidak dijual lagi. Sejak paket 84 `GET /api/price` DIHAPUS, jadi tabel
-- ini tidak punya pembaca maupun penulis: menyimpannya = menyimpan pintu yang
-- mengaku jalan. Dihapus (dengan alasan ini).
drop table if exists public.pricing_state;

-- ── 3. Kolom `expires_at` & `is_lifetime` SENGAJA TIDAK DIHAPUS ──────────────
-- Masih ada pembeli lama (lihat blok BACKFILL). Untuk paket baru keduanya
-- bernilai `NULL` / `true`. Komentar ini menjadi pengingat di skema.
comment on column public.user_subscriptions.is_lifetime is
  'true = akses selamanya (paket baru & backfill paket 85). false hanya tersisa untuk baris lama yang belum dibackfill.';
comment on column public.user_subscriptions.expires_at is
  'NULL untuk akses selamanya. Diisi hanya oleh model langganan lama (sudah tidak dipakai).';

-- ── 4. Ledger token add-on (TUGAS 3.4: token dibeli tercatat di server) ──────
-- Token add-on yang dibeli BERLAKU SELAMANYA (tidak hangus saat bulan berganti),
-- jadi ia TIDAK disimpan di `ai_usage` (yang kuncinya per BULAN). Satu baris per
-- `order_id` → idempoten: notifikasi ganda tidak menambah token dua kali.
create table if not exists public.ai_addons (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null default auth.uid() references auth.users (id) on delete cascade,
  order_id   text unique not null,
  package_id text,
  tokens     integer not null default 0 check (tokens >= 0),
  created_at timestamptz not null default now()
);

create index if not exists ai_addons_user_idx on public.ai_addons (user_id);

alter table public.ai_addons enable row level security;

/* Pemilik boleh MEMBACA saldo tokennya; MENULIS hanya lewat webhook (kunci peran
   server mem-BYPASS RLS). Klien tidak punya policy insert → tidak bisa mengarang
   token untuk dirinya sendiri. */
drop policy if exists ai_addons_owner_select on public.ai_addons;
create policy ai_addons_owner_select on public.ai_addons
  for select to authenticated using (user_id = auth.uid());

-- ── 5. `referral_rewards.order_id` (TUGAS 6: reward idempoten per order_id) ──
-- Satu reward per pembelian yang memicu. `unique(referral_id)` tetap ada sebagai
-- jaring kedua (satu relasi referral = satu reward).
alter table public.referral_rewards
  add column if not exists order_id text;

create unique index if not exists referral_rewards_order_idx
  on public.referral_rewards (order_id)
  where order_id is not null;

-- ── 6. Helper rank & pemetaan tier ───────────────────────────────────────────
/* `catetind_normalize_tier` memetakan tier LAMA → id paket baru.
   ⚠️ ATURAN INI HARUS SAMA PERSIS dengan `LEGACY_TIER_MAP` di
   `lib/subscription/plan.ts` (dua implementasi, satu aturan). Mengubah salah
   satu WAJIB mengubah yang lain:
     · founding_member / lifetime → sultan
     · yearly / annual            → waras
     · monthly                    → catet-aja */
create or replace function public.catetind_normalize_tier(p_tier text)
returns text
language sql
immutable
as $$
  select case lower(coalesce(p_tier, ''))
    when 'sultan'          then 'sultan'
    when 'waras'           then 'waras'
    when 'catet-aja'       then 'catet-aja'
    when 'founding_member' then 'sultan'
    when 'lifetime'        then 'sultan'
    when 'yearly'          then 'waras'
    when 'annual'          then 'waras'
    when 'monthly'         then 'catet-aja'
    else null
  end;
$$;

/* `catetind_plan_rank` — 3 = sultan, 2 = waras, 1 = catet-aja, 0 = tak dikenal.
   ⚠️ ANGKA INI HARUS SINKRON dengan `rank` di `PLANS` (`lib/data/pricing.ts`).
   Dipakai untuk memastikan upgrade TIDAK PERNAH MENURUNKAN tier. */
create or replace function public.catetind_plan_rank(p_tier text)
returns integer
language sql
immutable
as $$
  select case public.catetind_normalize_tier(p_tier)
    when 'sultan'    then 3
    when 'waras'     then 2
    when 'catet-aja' then 1
    else 0
  end;
$$;

-- ── 7. Fungsi pemenuhan: AKSES SELAMANYA + cabang top-up token ───────────────
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
  v_purpose  text;
  v_tier     text;
begin
  /* kunci global: dua notifikasi paralel tidak boleh memenuhi order yang sama */
  perform pg_advisory_xact_lock(918273645);

  select * into v_purchase from public.purchases where order_id = p_order_id for update;
  if v_purchase.id is null then
    raise exception 'order tidak ditemukan: %', p_order_id using errcode = 'P0002';
  end if;

  /* idempoten: notifikasi yang terkirim dua kali tidak menambah apa pun dua kali */
  if v_purchase.status = 'settlement' then
    return query
      select v_purchase.slot_number, v_purchase.price_paid, v_purchase.tier_name, true;
    return;
  end if;

  /* belum sukses (pending/deny/cancel/expire/refund): catat statusnya, jangan aktifkan */
  if p_status not in ('settlement', 'capture') then
    update public.purchases
       set status = p_status, updated_at = now()
     where id = v_purchase.id;
    return query select null::integer, null::bigint, null::text, false;
    return;
  end if;

  /* nominal yang BENAR-BENAR dibayar (dari webhook) — dicatat apa adanya */
  update public.purchases
     set status                  = 'settlement',
         price_paid              = greatest(p_amount, 0),
         payment_method          = coalesce(p_payment_method, payment_method),
         midtrans_transaction_id = coalesce(p_midtrans_tx_id, midtrans_transaction_id),
         paid_at                 = now(),
         updated_at              = now()
   where id = v_purchase.id;

  /* niat pembayaran: baris lama (sebelum kolom `purpose` ada) diperlakukan
     sebagai pembelian paket — top-up belum pernah dijual waktu itu. */
  v_purpose := coalesce(v_purchase.purpose, 'subscribe');

  /* ── 7a. TOP-UP TOKEN AI: TIDAK menyentuh user_subscriptions ── */
  if v_purpose = 'topup' then
    insert into public.ai_addons (user_id, order_id, package_id, tokens)
    values (
      v_purchase.user_id,
      p_order_id,
      v_purchase.addon_package_id,
      greatest(coalesce(v_purchase.addon_tokens, 0), 0)
    )
    on conflict (order_id) do nothing;

    /* tier TIDAK berubah (top-up bukan pembelian paket) */
    return query select v_purchase.slot_number, greatest(p_amount, 0), null::text, false;
    return;
  end if;

  /* ── 7b. PEMBELIAN / UPGRADE PAKET: AKSES SELAMANYA ── */
  /* tier kiriman baris pembelian diterjemahkan lewat peta LAMA → BARU.
     Kalau tak dikenal (mis. NULL), jatuh ke paket TERENDAH — jangan pernah
     memberi akses yang belum dibayar. */
  v_tier := coalesce(public.catetind_normalize_tier(v_purchase.tier_name), 'catet-aja');

  insert into public.user_subscriptions
    (user_id, tier_name, is_lifetime, started_at, expires_at, is_active, last_renewed_at, updated_at)
  values
    (v_purchase.user_id, v_tier, TRUE, now(), NULL, true, now(), now())
  on conflict (user_id) do update
    set tier_name       = case
          /* naik tier HANYA bila rank target lebih tinggi; TIDAK PERNAH menurunkan */
          when public.catetind_plan_rank(public.user_subscriptions.tier_name)
               >= public.catetind_plan_rank(excluded.tier_name)
            then public.user_subscriptions.tier_name
          else excluded.tier_name
        end,
        is_lifetime     = true,
        /* akses selamanya: TIDAK ADA masa aktif, TIDAK ADA penambahan hari */
        expires_at      = null,
        is_active       = true,
        last_renewed_at = now(),
        updated_at      = now();

  return query select v_purchase.slot_number, greatest(p_amount, 0), v_tier, false;
end;
$$;

/* Jalur pemanggilan TERTUTUP untuk klien: hanya kunci peran server (webhook).
   `revoke ... from public` mencabut izin EXECUTE bawaan Postgres. Tanpa ini,
   siapa pun bisa mengaktifkan langganan dirinya sendiri tanpa membayar. */
revoke all on function public.catetind_fulfill_purchase(text, text, bigint, text, text)
  from public, anon, authenticated;
grant execute on function public.catetind_fulfill_purchase(text, text, bigint, text, text)
  to service_role;

-- ── 8. BACKFILL: pembeli lama dijadikan akses selamanya (jawaban §7.1 & §7.7) ─
-- Predikat SENGAJA SEMPIT: hanya baris `user_subscriptions` yang masih
-- `is_lifetime = false` DAN `expires_at` terisi. Baris yang sudah
-- `is_lifetime = true` (pembeli seumur hidup lama) TIDAK disentuh sama sekali.
--
-- Alasannya (keputusan bisnis, bukan teknis): janji produk sejak paket 84 adalah
-- "sekali bayar, akses selamanya". Membiarkan pembeli lama kehilangan akses saat
-- `expires_at` lewat akan melanggar janji itu, dan sebagian baris ini justru
-- lahir dari bug +30 hari di fungsi pemenuhan lama. Goodwill sekali jalan ini
-- memberi mereka akses yang sama dengan pembeli baru.
update public.user_subscriptions
   set is_lifetime = true,
       expires_at  = null,
       updated_at  = now()
 where is_lifetime = false
   and expires_at is not null;
