-- ══════════════════════════════════════════════════════════════════════════════
-- CatetInd · 09 · PEMENUHAN LANGGANAN BERPERIODE (3 tier × bulanan/tahunan)
--
-- Migrasi 08 mengaktifkan langganan SEUMUR HIDUP untuk satu produk. Keputusan
-- produk berubah: yang dijual adalah 3 tier langganan (`PLANS`), masing-masing
-- dua periode — bulanan 30 hari, tahunan 365 hari. Paket "seumur hidup"
-- (Founding Member) tidak dijual.
--
-- Yang berubah di sini:
--   · `purchases.billing_period` ditambahkan;
--   · fungsi pemenuhan membaca PAKET (`tier_name`) + PERIODE (`billing_period`)
--     dari baris `purchases` yang sudah ditulis route create — jadi webhook tetap
--     hanya perlu `order_id`;
--   · perpanjangan MENUMPUK: masa aktif baru dihitung dari `expires_at` yang ada
--     (atau dari sekarang kalau sudah kedaluwarsa), bukan menimpanya.
--
-- `pricing_state` SENGAJA tidak disentuh lagi: ia dulu melacak slot Founding
-- Member yang kini tidak dijual, dan mengarang "slot terjual" dari pembelian tier
-- akan menyesatkan. `/api/price` tetap melayani snapshot statis untuk
-- kompatibilitas (halaman checkout tidak lagi memakainya).
--
-- Idempotent: aman dijalankan berkali-kali.
-- ══════════════════════════════════════════════════════════════════════════════

alter table public.purchases
  add column if not exists billing_period text;

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
  v_days     integer;
  v_tier     text;
begin
  /* kunci global: dua notifikasi paralel tidak boleh memenuhi order yang sama */
  perform pg_advisory_xact_lock(918273645);

  select * into v_purchase from public.purchases where order_id = p_order_id for update;
  if v_purchase.id is null then
    raise exception 'order tidak ditemukan: %', p_order_id using errcode = 'P0002';
  end if;

  /* idempoten: notifikasi yang terkirim dua kali tidak menambah masa aktif dua kali */
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

  v_tier := coalesce(v_purchase.tier_name, 'waras');
  /* 365 hari = tahunan; apa pun selain itu (termasuk NULL) = bulanan */
  v_days := case when v_purchase.billing_period = 'annual' then 365 else 30 end;

  update public.purchases
     set status                  = 'settlement',
         price_paid              = greatest(p_amount, 0),
         payment_method          = coalesce(p_payment_method, payment_method),
         midtrans_transaction_id = coalesce(p_midtrans_tx_id, midtrans_transaction_id),
         paid_at                 = now(),
         updated_at              = now()
   where id = v_purchase.id;

  insert into public.user_subscriptions
    (user_id, tier_name, is_lifetime, started_at, expires_at, is_active, last_renewed_at, updated_at)
  values
    (v_purchase.user_id, v_tier, false, now(),
     now() + (v_days || ' days')::interval, true, now(), now())
  on conflict (user_id) do update
    set tier_name      = excluded.tier_name,
        is_lifetime    = false,
        is_active      = true,
        /* perpanjangan menumpuk dari sisa masa aktif; yang sudah kedaluwarsa
           mulai dari sekarang */
        expires_at     = greatest(coalesce(public.user_subscriptions.expires_at, now()), now())
                         + (v_days || ' days')::interval,
        last_renewed_at = now(),
        updated_at     = now();

  return query select v_purchase.slot_number, greatest(p_amount, 0), v_tier, false;
end;
$$;

/* Jalur pemanggilan TERTUTUP untuk klien: hanya kunci peran server (webhook). */
revoke all on function public.catetind_fulfill_purchase(text, text, bigint, text, text)
  from public, anon, authenticated;
grant execute on function public.catetind_fulfill_purchase(text, text, bigint, text, text)
  to service_role;
