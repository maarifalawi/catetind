-- ══════════════════════════════════════════════════════════════════════════════
-- CatetInd · 11 · PRABAYAR 30 HARI + EXPIRY (rilis landing)
--
-- Kenapa migrasi BARU: `20261011120000_*` sudah tercatat di
-- supabase_migrations.schema_migrations. Skrip `pnpm supabase:migrate`
-- melewati berkas yang versinya sudah tercatat, jadi perubahan perilaku HARUS
-- berbentuk berkas baru dengan timestamp lebih besar.
--
-- KEPUTUSAN PRODUK YANG DIJALANKAN DI SINI:
--   · `monthly`  = prabayar 30 hari. Sekali bayar via Midtrans, TIDAK ada
--                  auto-debet. Perpanjangan menumpuk:
--                  expires_at = greatest(now(), expires_at lama) + 30 hari.
--                  Tier boleh berubah (termasuk turun tier) — tanpa refund.
--   · `lifetime` = sekali bayar, akses selamanya. expires_at = NULL,
--                  is_lifetime = TRUE. Tidak bisa diturunkan ke monthly.
--   · Baris lama tanpa `billing_period` diperlakukan LIFETIME (backward
--     compatible): mereka sudah dibackfill menjadi akses selamanya di migrasi
--     20261011120000.
--   · Top-up token AI TETAP tidak menyentuh `user_subscriptions`.
--
-- Idempotent: `add column if not exists`, `drop function if exists`,
-- `create function`, dan `update ... where billing_period is null`.
-- ══════════════════════════════════════════════════════════════════════════════

-- ── 1. Periode langganan di `user_subscriptions` (dipakai billing panel) ─────
alter table public.user_subscriptions
  add column if not exists billing_period text;

comment on column public.user_subscriptions.billing_period is
  'monthly = prabayar 30 hari; lifetime = akses selamanya. NULL hanya pada baris lama yang belum dibackfill.';

comment on column public.user_subscriptions.expires_at is
  'Tanggal berakhir prabayar 30 hari. NULL untuk lifetime (bukan 2099).';

comment on column public.user_subscriptions.is_lifetime is
  'true = akses selamanya. false = prabayar 30 hari (akses ditentukan expires_at).';

-- Backfill aman: isi periode sesuai keadaan yang SUDAH tersimpan. Baris yang
-- `is_lifetime = true` → lifetime; sisanya → monthly.
update public.user_subscriptions
   set billing_period = case when is_lifetime then 'lifetime' else 'monthly' end,
       updated_at = now()
 where billing_period is null;

-- ── 2. Fungsi pemenuhan: dua periode nyata ───────────────────────────────────
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
  v_period   text;
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

  /* ── 2a. TOP-UP TOKEN AI: TIDAK menyentuh user_subscriptions ── */
  if v_purpose = 'topup' then
    insert into public.ai_addons (user_id, order_id, package_id, tokens)
    values (
      v_purchase.user_id,
      p_order_id,
      v_purchase.addon_package_id,
      greatest(coalesce(v_purchase.addon_tokens, 0), 0)
    )
    on conflict (order_id) do nothing;

    return query select v_purchase.slot_number, greatest(p_amount, 0), null::text, false;
    return;
  end if;

  /* ── 2b. PEMBELIAN / PERPANJANGAN PAKET ── */
  v_tier := coalesce(public.catetind_normalize_tier(v_purchase.tier_name), 'catet-aja');

  /* Baris lama tanpa nilai (sebelum kolom ini dipakai) = akses selamanya.
     Ini membuat backfill pembeli lama TIDAK berubah arti. */
  v_period := case
    when v_purchase.billing_period = 'monthly' then 'monthly'
    else 'lifetime'
  end;


  if v_period = 'monthly' then
    /* defensif: API sudah menolak monthly saat lifetime aktif, tetapi SQL tidak
       boleh menurunkan akses yang sudah dibayar. */
    insert into public.user_subscriptions
      (user_id, tier_name, billing_period, is_lifetime, started_at, expires_at, is_active, last_renewed_at, updated_at)
    values
      (v_purchase.user_id, v_tier, 'monthly', false, now(),
       now() + interval '30 days', true, now(), now())
    on conflict (user_id) do update
      set tier_name = case
            when public.user_subscriptions.is_lifetime
              then public.user_subscriptions.tier_name
            else excluded.tier_name
          end,
          billing_period = case
            when public.user_subscriptions.is_lifetime
              then 'lifetime'
            else 'monthly'
          end,
          is_lifetime = public.user_subscriptions.is_lifetime,
          /* masa aktif baru menumpuk dari sisa hari; yang sudah kedaluwarsa
             mulai dari sekarang. Lifetime tidak pernah diberi tanggal. */
          expires_at = case
            when public.user_subscriptions.is_lifetime
              then null
            else greatest(now(), coalesce(public.user_subscriptions.expires_at, now()))
                 + interval '30 days'
          end,
          is_active = true,
          last_renewed_at = now(),
          updated_at = now();

    return query select v_purchase.slot_number, greatest(p_amount, 0), v_tier, false;
    return;
  end if;


  /* lifetime: tier tertinggi menang, tetapi pembelian dari paket monthly
     memakai tier yang baru dibeli (boleh menurunkan tier monthly). */
  insert into public.user_subscriptions
    (user_id, tier_name, billing_period, is_lifetime, started_at, expires_at, is_active, last_renewed_at, updated_at)
  values
    (v_purchase.user_id, v_tier, 'lifetime', true, now(), null, true, now(), now())
  on conflict (user_id) do update
    set tier_name = case
          when public.user_subscriptions.is_lifetime
               and public.catetind_plan_rank(public.user_subscriptions.tier_name)
                   >= public.catetind_plan_rank(excluded.tier_name)
            then public.user_subscriptions.tier_name
          else excluded.tier_name
        end,
        billing_period  = 'lifetime',
        is_lifetime     = true,
        /* akses selamanya: TIDAK ADA masa aktif */
        expires_at      = null,
        is_active       = true,
        last_renewed_at = now(),
        updated_at      = now();

  return query select v_purchase.slot_number, greatest(p_amount, 0), v_tier, false;
end;
$$;

/* Jalur pemanggilan TERTUTUP untuk klien: hanya kunci peran server (webhook). */
revoke all on function public.catetind_fulfill_purchase(text, text, bigint, text, text)
  from public, anon, authenticated;
grant execute on function public.catetind_fulfill_purchase(text, text, bigint, text, text)
  to service_role;
