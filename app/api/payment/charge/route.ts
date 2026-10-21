import { NextRequest, NextResponse } from 'next/server'
import { requireUser } from '@/lib/session'
import { paymentMethod } from '@/lib/payments/methods'
import {
  cancelTransaction,
  createCoreCharge,
  fetchTransactionStatus,
  midtransConfigured,
} from '@/lib/payments/midtrans'
import type { PaymentInstructions, PaymentPurpose, PaymentState } from '@/lib/payments/types'
import {
  PLANS,
  applyReferralDiscount,
  asBillingPeriod,
  isValidOfferAmount,
  isValidReferralCode,
  priceFor,
  rankOf,
  type BillingPeriod,
  type PlanId,
} from '@/lib/data/pricing'
/* Harga add-on token AI hidup di `lib/ai-quota.ts` (satu sumber, bukan salinan).
   Route MEMBACA dari sana — harga dari klien hanya dipakai untuk DICEK. */
import { AI_ADDON_PACKAGES, planQuota } from '@/lib/ai-quota'
import { readCallerPlan } from '@/lib/subscription/plan'
import { restFetch, restRpc } from '@/lib/supabase/rest'

/* ── POST /api/payment/charge (paket 83) — TAGIHAN DI HALAMAN SENDIRI ────────
   Ganti rail Snap (`/api/payment/create`, DIHAPUS di paket ini). Sekarang server
   yang membuat tagihan Core API lalu mengembalikan INSTRUKSI BAYAR-nya ke UI
   (QRIS / nomor VA / tautan e-wallet / kode Mandiri Bill) — user tidak pernah
   pindah domain.

   Yang TIDAK berubah: baris pertama `requireUser()` (identitas dari sesi cookie),
   guard harga kanon dari `lib/data/pricing.ts` (nominal dari klien tidak
   dipercaya → 422), dan baris `purchases` `pending` yang SUDAH ditulis atas nama
   user sebelum provider dipanggil — itulah satu-satunya cara webhook (yang tidak
   membawa sesi) memetakan notifikasi ke pemiliknya.

   Idempotensi (DIUJI ke sandbox, bukan diasumsikan): `/v2/charge` dengan
   `order_id` yang sama membalas `status_code 406` — jadi order yang masih
   `pending` tidak boleh ditagih ulang. Karena itu:
     · instruksinya masih bisa dirender ulang (QRIS/VA/ShopeePay/Mandiri) →
       order yang SAMA dipakai ulang, tanpa memanggil `/v2/charge` lagi;
     · sudah dibayar tapi webhook belum mencatat → dilaporkan apa adanya
       (`state:'settled'`), TIDAK ada tagihan kedua (mencegah bayar dua kali);
     · sisanya (tagihan kedaluwarsa, ganti metode, GoPay yang instruksinya tidak
       ikut di balasan status) → tagihan lama dibatalkan, lalu dibuat baru. */

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const PURPOSES: PaymentPurpose[] = ['subscribe', 'topup', 'upgrade', 'renew']

interface PendingRow {
  order_id?: string
  /** nominal yang benar-benar ditagih saat order dibuat */
  expected_amount?: unknown
  /** kode teman yang dipakai saat order dibuat (null = tanpa kode) */
  referral_code?: unknown
}

interface ChargeBody {
  purpose?: unknown
  period?: unknown
  amount?: unknown
  planId?: unknown
  /** id paket add-on token AI (hanya untuk `purpose: 'topup'`) */
  packageId?: unknown
  itemName?: unknown
  method?: unknown
  /** kode teman opsional — WAJIB diverifikasi server sebelum diskon dipakai */
  code?: unknown
}

/**
 * order `pending` terakhir milik PEMANGGIL untuk paket + periode yang sama
 * (RLS yang menyaring). Periode tetap jadi kunci query supaya tagihan lama yang
 * masih hidup tidak dipakai ulang untuk pembelian dengan periode berbeda.
 *
 * `expected_amount` & `referral_code` ikut dibaca: tagihan lama hanya boleh
 * dipakai ulang kalau NOMINAL dan KODE-nya sama. Kalau user menambahkan kode
 * teman setelah tagihan penuh dibuat, tagihan lama harus dibatalkan — bukan
 * ditagih ulang dengan angka berbeda.
 */
async function findPendingOrder(
  token: string,
  {
    planId,
    purpose,
    period,
  }: { planId?: string | null; purpose: PaymentPurpose; period: BillingPeriod | null },
): Promise<PendingRow | null> {
  const query = new URLSearchParams({
    select: 'order_id,expected_amount,referral_code',
    status: 'eq.pending',
    purpose: `eq.${purpose}`,
    order: 'created_at.desc',
    limit: '1',
  })
  if (planId) query.set('tier_name', `eq.${planId}`)
  if (period) query.set('billing_period', `eq.${period}`)
  const res = await restFetch<PendingRow[]>(`purchases?${query.toString()}`, { accessToken: token })
  if (!res.ok || !Array.isArray(res.data)) return null
  return res.data[0] ?? null
}

/**
 * Validasi kode teman ke DATABASE — bukan hanya bentuknya.
 *
 * `validate_referral_code` mengembalikan `user_id` pemilik kode (atau NULL).
 * Diskon 10% hanya boleh dipakai kalau hasilnya ada dan BUKAN akun pemanggil
 * sendiri; tanpa bukti ini, nominal diskon ditolak.
 */
async function resolveReferralCode(
  rawCode: unknown,
  token: string,
  buyerId: string,
): Promise<{ ok: true; code: string | null } | { ok: false; response: NextResponse }> {
  if (rawCode === undefined || rawCode === null || String(rawCode).trim() === '') {
    return { ok: true, code: null }
  }

  const code = String(rawCode).trim().toUpperCase()
  if (!isValidReferralCode(code)) {
    return {
      ok: false,
      response: NextResponse.json(
        { ok: false, reason: 'invalid', error: 'Kode teman tidak valid.' },
        { status: 422 },
      ),
    }
  }

  const found = await restRpc<string | null>('validate_referral_code', { p_code: code }, token)
  if (!found.ok) {
    return {
      ok: false,
      response: NextResponse.json(
        {
          ok: false,
          reason: 'provider',
          error: 'Kode teman belum bisa diperiksa. Coba lagi sebentar ya.',
        },
        { status: 502 },
      ),
    }
  }
  if (!found.data) {
    return {
      ok: false,
      response: NextResponse.json(
        { ok: false, reason: 'invalid', error: 'Kode teman tidak ditemukan.' },
        { status: 422 },
      ),
    }
  }
  if (found.data === buyerId) {
    return {
      ok: false,
      response: NextResponse.json(
        {
          ok: false,
          reason: 'invalid',
          error: 'Kode teman tidak bisa dipakai untuk akun sendiri.',
        },
        { status: 422 },
      ),
    }
  }

  return { ok: true, code }
}

/**
 * Catat relasi pengundang → pembeli. Dipanggil SEBELUM tagihan dibuat supaya
 * webhook punya relasi saat pembayaran lunas. Relasi ini belum memberi reward;
 * reward baru diberikan webhook setelah settlement.
 */
async function recordReferral(
  code: string,
  email: string,
  token: string,
): Promise<NextResponse | null> {
  const recorded = await restRpc<boolean>(
    'record_referral',
    { p_code: code, p_referred_email: email },
    token,
  )
  if (!recorded.ok) {
    return NextResponse.json(
      {
        ok: false,
        reason: 'provider',
        error: 'Kode teman belum bisa dicatat. Coba lagi sebentar ya.',
      },
      { status: 502 },
    )
  }
  if (recorded.data === false) {
    return NextResponse.json(
      {
        ok: false,
        reason: 'invalid',
        error: 'Kode teman ini tidak bisa dipakai untuk akunmu.',
      },
      { status: 422 },
    )
  }
  return null
}

export async function POST(req: NextRequest) {
  const auth = requireUser(req)
  if (!auth.ok) return auth.response

  if (!midtransConfigured()) {
    return NextResponse.json(
      { ok: false, reason: 'not-configured', error: 'Pembayaran belum aktif — menunggu Midtrans.' },
      { status: 503 },
    )
  }

  let body: ChargeBody
  try {
    body = (await req.json()) as ChargeBody
  } catch {
    return NextResponse.json(
      { ok: false, reason: 'invalid', error: 'Body permintaan harus JSON.' },
      { status: 400 },
    )
  }

  const purpose = PURPOSES.includes(body.purpose as PaymentPurpose)
    ? (body.purpose as PaymentPurpose)
    : null
  const amount = Math.round(Number(body.amount))
  if (!purpose || !Number.isFinite(amount) || amount <= 0) {
    return NextResponse.json(
      { ok: false, reason: 'invalid', error: 'Tujuan atau nominal pembayaran tidak sah.' },
      { status: 422 },
    )
  }

  /* Periode wajib untuk pembelian paket. Hanya `lifetime` yang dijual: body
     tanpa `period` diperlakukan sebagai lifetime, sedangkan `monthly` (dan nilai
     lain) ditolak 422 — tidak diubah diam-diam menjadi lifetime. */
  let period: BillingPeriod | null = 'lifetime'
  if (purpose === 'topup') {
    period = null
  } else if (body.period !== undefined && body.period !== null && body.period !== '') {
    const parsed = asBillingPeriod(String(body.period))
    if (!parsed) {
      return NextResponse.json(
        {
          ok: false,
          reason: 'invalid',
          error: 'Periode pembayaran tidak dikenal. Paket CatetInd sekarang sekali bayar untuk akses selamanya.',
        },
        { status: 422 },
      )
    }
    period = parsed
  }

  const method = paymentMethod(body.method)
  if (!method) {
    return NextResponse.json(
      { ok: false, reason: 'invalid', error: 'Metode pembayaran tidak dikenal.' },
      { status: 422 },
    )
  }

  /* Kode teman diverifikasi KE DATABASE lebih dulu. `referralCode` hanya berisi
     kode yang benar-benar ada dan bukan milik akun pemanggil sendiri. */
  const referral = await resolveReferralCode(body.code, auth.token, auth.user.id)
  if (!referral.ok) return referral.response
  const referralCode = referral.code

  /* ── Nominal TIDAK dipercaya dari klien ────────────────────────────────────
     Sejak paket 84 harga ditentukan PAKET dan paket yang sudah dimiliki user
     (dibaca dari `user_subscriptions`, bukan dari body):

       · 'subscribe' (belum punya paket) → harga penuh paket target
       · 'upgrade'   (sudah punya paket) → SELISIH dari `priceFor()`

     Target yang lebih rendah/sama ditolak 403 — downgrade tidak ditawarkan dan
     tidak ada refund, jadi menerimanya berarti menagih user untuk akses yang
     lebih sedikit. */
  /* expected_amount = nominal yang BENAR-BENAR ditagih (termasuk diskon teman
     bila kode sah). Webhook membandingkannya dengan `gross_amount` Midtrans;
     kalau yang disimpan harga penuh, pembayaran diskon akan ditandai mismatch
     dan paket tidak pernah diaktifkan. */
  let expectedAmount = 0
  let addonPackageId: string | null = null
  let addonTokens = 0
  let addonName: string | null = null

  /* ── Top up token AI: server MEMBACA harga dari lib/ai-quota.ts ──
     Token AI hanya dijual untuk paket yang BERKUOTA (Paket Waras): Paket Catet
     Aja tidak punya AI sama sekali, dan Paket Sultan tidak dibatasi — menjual
     token ke paket tanpa batas = jebakan (tidak ada kuota yang perlu ditambah). */
  if (purpose === 'topup') {
    const pkg = AI_ADDON_PACKAGES.find((item) => item.id === String(body.packageId))
    if (!pkg) {
      return NextResponse.json(
        { ok: false, reason: 'invalid', error: 'Paket token AI tidak dikenal.' },
        { status: 422 },
      )
    }
    /* top up BUKAN pembelian tier: planId tidak boleh dititipkan */
    if (body.planId !== undefined && body.planId !== null && String(body.planId) !== '') {
      return NextResponse.json(
        { ok: false, reason: 'invalid', error: 'Top up token tidak memakai paket langganan.' },
        { status: 422 },
      )
    }
    /* hanya paket berkuota yang boleh menambah token (kalau paketnya terbaca) */
    const topupCaller = await readCallerPlan(auth.token)
    if (topupCaller.configured) {
      const quota = planQuota(topupCaller.active ? topupCaller.planId : null)
      if (!quota.aiEnabled || quota.unlimited) {
        return NextResponse.json(
          {
            ok: false,
            reason: 'plan-not-eligible',
            error: 'Top up token AI berlaku untuk paket yang punya kuota AI (Paket Waras).',
          },
          { status: 403 },
        )
      }
    }
    if (
      amount !== pkg.price &&
      !(referralCode !== null && amount === applyReferralDiscount(pkg.price))
    ) {
      return NextResponse.json(
        { ok: false, reason: 'invalid', error: 'Nominal tidak sesuai harga paket token.' },
        { status: 422 },
      )
    }
    expectedAmount = amount
    addonPackageId = pkg.id
    addonTokens = pkg.tokens
    addonName = pkg.name
  }

  const plan = PLANS.find((item) => item.id === String(body.planId))
  let ownedPlanId: PlanId | null = null
  let ownedIsLifetime = false

  const isPlanPurpose = purpose === 'subscribe' || purpose === 'upgrade' || purpose === 'renew'
  if (isPlanPurpose) {
    if (!plan || !period) {
      return NextResponse.json(
        { ok: false, reason: 'invalid', error: 'Paket atau periode tidak dikenal.' },
        { status: 422 },
      )
    }

    const caller = await readCallerPlan(auth.token)
    /* Paket tetap dibaca walau masa aktifnya sudah habis: user berhak
       memperpanjang paket yang sama dan membeli lifetime dari tier itu. */
    ownedPlanId = caller.planId
    ownedIsLifetime = caller.isLifetime

    /* Perpanjangan 30 hari sudah tidak dijual. Pesannya eksplisit supaya user
       lama tahu jalan keluarnya, bukan sekadar "periode tidak dikenal". */
    if (purpose === 'renew') {
      return NextResponse.json(
        {
          ok: false,
          reason: 'invalid',
          error: 'Perpanjangan bulanan sudah tidak tersedia. CatetInd sekarang sekali bayar untuk akses selamanya.',
        },
        { status: 422 },
      )
    }

    if (purpose === 'upgrade' && !ownedPlanId) {
      return NextResponse.json(
        {
          ok: false,
          reason: 'not-owned',
          error: 'Upgrade cuma untuk user yang sudah punya paket. Beli paketnya dulu ya.',
        },
        { status: 403 },
      )
    }
    if (ownedIsLifetime && rankOf(ownedPlanId) >= plan.rank) {
      return NextResponse.json(
        {
          ok: false,
          reason: 'not-needed',
          error: 'Paket lifetime ini (atau yang lebih tinggi) sudah kamu miliki.',
        },
        { status: 403 },
      )
    }

    const context = { period, ownedPlanId, ownedIsLifetime }
    const expected = priceFor(plan, context)
    if (
      expected <= 0 ||
      !isValidOfferAmount(plan, amount, context, { referral: referralCode !== null })
    ) {
      return NextResponse.json(
        { ok: false, reason: 'invalid', error: 'Nominal tidak sesuai harga produk.' },
        { status: 422 },
      )
    }
    /* yang ditagih = yang dikirim klien (sudah lolos guard di atas), bukan
       harga penuh — kalau tidak, webhook menandainya amount_mismatch. */
    expectedAmount = amount
  }

  /* Kode sah + nominal sah: catat relasinya SEKARANG supaya webhook punya
     pengundang saat pembayaran lunas. Idempoten per email; pembeli yang sudah
     terhubung ke pengundang lain ditolak (first referrer wins). */
  if (referralCode) {
    const referralError = await recordReferral(referralCode, auth.user.email, auth.token)
    if (referralError) return referralError
  }

  /* URL webhook + halaman selesai diambil dari `Origin` request: tidak ada domain
     yang di-hardcode, jadi benar baik di localhost maupun produksi. Kalau header
     itu tidak dikirim (mis. sebagian klien/proxy), pakai origin URL request —
     lebih baik daripada `undefined`, yang membuat Midtrans memakai setelan
     dashboard dan bisa menunjuk host lain. */
  const origin = req.headers.get('origin') ?? new URL(req.url).origin

  const itemName =
    typeof body.itemName === 'string' && body.itemName
      ? body.itemName
      : plan
        ? `${plan.name} (akses selamanya)`
        : addonName
          ? `${addonName} — token AI`
          : 'CatetInd'

  /* ── 1. Pakai ulang order yang masih pending (kalau memang bisa & cocok) ── */
  if (plan) {
    const existing = await findPendingOrder(auth.token, { planId: plan.id, purpose, period })
    const existingOrderId = existing?.order_id ?? null
    if (existingOrderId) {
      const existingCode =
        typeof existing?.referral_code === 'string'
          ? existing.referral_code.trim().toUpperCase()
          : null
      /* Nominal & kode harus SAMA. Tagihan penuh tidak boleh dipakai ulang
         untuk pembelian diskon (dan sebaliknya). */
      const sameOffer =
        Number(existing?.expected_amount) === amount && existingCode === referralCode

      if (!sameOffer) {
        /* Tagihan lama mungkin SUDAH dibayar tapi webhook belum mencatat.
           Jangan pernah membuat tagihan kedua untuk niat yang sama: kalau
           statusnya settled, laporkan apa adanya. */
        const previous = await fetchTransactionStatus(existingOrderId, method)
        if (previous.ok && previous.value.state === 'settled') {
          const paid = Number(existing?.expected_amount)
          return NextResponse.json({
            ok: true,
            orderId: existingOrderId,
            method: previous.value.method ?? method.id,
            amount: Number.isFinite(paid) ? paid : amount,
            state: 'settled' satisfies PaymentState,
            expiresAt: previous.value.expiresAt,
            instructions: null,
            note: 'Pembayaran sebelumnya sudah diterima provider — langganan sedang diaktifkan.',
          })
        }
        /* tagihan lama tidak mewakili niat pembayaran yang sekarang */
        await cancelTransaction(existingOrderId)
      } else {
        const status = await fetchTransactionStatus(existingOrderId, method)
        if (status.ok) {
          const detail = status.value
          /* sudah dibayar tapi webhook belum mencatat → jangan bikin tagihan kedua */
          if (detail.state === 'settled') {
            return NextResponse.json({
              ok: true,
              orderId: existingOrderId,
              method: detail.method ?? method.id,
              amount,
              state: 'settled' satisfies PaymentState,
              expiresAt: detail.expiresAt,
              instructions: null,
              note: 'Pembayaran sudah diterima provider — langganan sedang diaktifkan.',
            })
          }
          /* masih pending, metode sama, dan instruksinya bisa dirender ulang */
          if (
            detail.state === 'pending' &&
            detail.method === method.id &&
            method.reRenderable &&
            detail.instructions
          ) {
            return NextResponse.json({
              ok: true,
              orderId: existingOrderId,
              method: method.id,
              amount,
              state: 'pending' satisfies PaymentState,
              expiresAt: detail.expiresAt,
              instructions: detail.instructions satisfies PaymentInstructions,
              reused: true,
            })
          }
        }
        /* tagihan lama tidak dipakai lagi: dibatalkan supaya tidak ada dua tagihan
           hidup untuk satu niat pembayaran (gagal membatalkan tidak fatal — tagihan
           yang tidak bisa dibatalkan akan kedaluwarsa sendiri). */
        await cancelTransaction(existingOrderId)
      }
    }
  }

  /* ── 2. Bikin tagihan baru ─────────────────────────────────────────────── */
  const orderId = `${purpose}-${auth.user.id.slice(0, 8)}-${Date.now()}`

  /* Baris `pending` ditulis ATAS NAMA user (RLS) SEBELUM provider dipanggil.
     Kalau penulisan ini gagal, tagihan TIDAK dibuat: uang yang masuk tanpa baris
     pembelian berarti langganan tidak punya jalur untuk dipenuhi webhook. */
  const inserted = await restFetch('purchases', {
    method: 'POST',
    accessToken: auth.token,
    prefer: 'return=minimal',
    body: {
      order_id: orderId,
      status: 'pending',
      tier_name: plan?.id ?? null,
      billing_period: period,
      /* dipakai webhook: niat pembayaran (subscribe/upgrade/topup) + nominal
         yang BENAR-BENAR ditagih + jumlah token (top-up) + kode teman */
      purpose,
      expected_amount: expectedAmount,
      referral_code: referralCode,
      addon_package_id: addonPackageId,
      addon_tokens: addonTokens,
    },
  })
  if (!inserted.ok) {
    return NextResponse.json(
      {
        ok: false,
        reason: inserted.status === 0 ? 'not-configured' : 'provider',
        error: 'Tagihan tidak bisa dicatat, jadi pembayaran belum dibuat.',
      },
      { status: inserted.status === 0 ? 503 : 502 },
    )
  }

  const charge = await createCoreCharge(
    {
      purpose,
      orderId,
      amount,
      itemName,
      planId: plan?.id,
      ownedPlanId: ownedPlanId ?? undefined,
      customerEmail: auth.user.email,
      customerName: auth.user.name,
      notificationUrl: origin ? `${origin}/api/payment/webhook` : undefined,
      finishUrl: origin
        ? `${origin}/checkout/selesai?order_id=${encodeURIComponent(orderId)}`
        : undefined,
    },
    method,
  )

  if (!charge.ok) {
    return NextResponse.json(
      { ok: false, reason: charge.reason, error: charge.message },
      { status: charge.status },
    )
  }

  return NextResponse.json({
    ok: true,
    orderId,
    method: method.id,
    amount,
    state: charge.value.state,
    expiresAt: charge.value.expiresAt,
    instructions: charge.value.instructions,
  })
}
