import { createHash } from 'node:crypto'
import type { PaymentIntent, PaymentToken, PaymentUnavailableReason } from './types'

/* ── MIDTRANS (paket 63) — RAIL YANG JUJUR BELUM AKTIF ───────────────────────
   Yang ADA di sini: cek konfigurasi, verifikasi tanda tangan webhook, dan satu
   panggilan Snap yang benar-benar siap. Yang TIDAK dilakukan: berpura-pura
   menagih. Selama `MIDTRANS_SERVER_KEY` kosong, `createSnapTransaction()` TIDAK
   pernah dipanggil — route di baliknya menjawab 503 apa adanya.

   Kunci HANYA di server (`MIDTRANS_SERVER_KEY`), tidak pernah `NEXT_PUBLIC_`.
   Sandbox vs produksi dipilih lewat `MIDTRANS_IS_PRODUCTION` (default sandbox). */

export function midtransServerKey(): string {
  return (process.env.MIDTRANS_SERVER_KEY ?? '').trim()
}

/** `true` = kredensial ada → route boleh mencoba membuat transaksi */
export function midtransConfigured(): boolean {
  return midtransServerKey().length > 0
}

/** endpoint Snap sesuai mode (sandbox default — aman untuk uji) */
export function midtransSnapEndpoint(): string {
  const production = (process.env.MIDTRANS_IS_PRODUCTION ?? '') === '1'
  return production
    ? 'https://app.midtrans.com/snap/v1/transactions'
    : 'https://app.sandbox.midtrans.com/snap/v1/transactions'
}

/**
 * Verifikasi tanda tangan notifikasi webhook Midtrans:
 *     sha512(order_id + status_code + gross_amount + serverKey)
 * `false` kalau kunci kosong — fail-closed: tanpa kunci, TIDAK ada notifikasi
 * yang dianggap sah.
 */
export function verifyMidtransSignature(input: {
  orderId: string
  statusCode: string
  grossAmount: string
  signature: string
}): boolean {
  const key = midtransServerKey()
  if (!key) return false
  const expected = createHash('sha512')
    .update(`${input.orderId}${input.statusCode}${input.grossAmount}${key}`)
    .digest('hex')
  return expected === input.signature
}

export type CreateResult =
  | { ok: true; value: PaymentToken }
  | { ok: false; reason: PaymentUnavailableReason; status: number; message: string }

/**
 * Buat transaksi Snap. HANYA dipanggil saat `midtransConfigured()` true; kalau
 * tidak, kembalikan alasan `not-configured` (route → 503).
 */
export async function createSnapTransaction(intent: PaymentIntent): Promise<CreateResult> {
  const key = midtransServerKey()
  if (!key) {
    return { ok: false, reason: 'not-configured', status: 503, message: 'Pembayaran belum aktif.' }
  }

  try {
    const res = await fetch(midtransSnapEndpoint(), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        Authorization: `Basic ${Buffer.from(`${key}:`).toString('base64')}`,
      },
      body: JSON.stringify({
        transaction_details: { order_id: intent.orderId, gross_amount: intent.amount },
        item_details: [{ id: intent.planId ?? intent.purpose, price: intent.amount, quantity: 1, name: intent.itemName }],
        customer_details: intent.customerEmail
          ? { first_name: intent.customerName ?? '', email: intent.customerEmail }
          : undefined,
        /* ALUR REDIRECT: Snap mengembalikan user ke halaman kita sendiri setelah
           selesai/gagal. Tanpa `callbacks`, user berhenti di halaman Snap. */
        callbacks: intent.finishUrl
          ? { finish: intent.finishUrl, error: intent.errorUrl ?? intent.finishUrl }
          : undefined,
      }),
      cache: 'no-store',
    })

    const payload = (await res.json().catch(() => null)) as
      | { token?: string; redirect_url?: string; error_messages?: string[] }
      | null

    if (!res.ok || !payload?.token) {
      return {
        ok: false,
        reason: 'provider',
        status: 502,
        message: payload?.error_messages?.join(', ') ?? `Provider pembayaran menolak (${res.status}).`,
      }
    }

    return { ok: true, value: { token: payload.token, redirectUrl: payload.redirect_url ?? '' } }
  } catch (error) {
    return {
      ok: false,
      reason: 'provider',
      status: 502,
      message: error instanceof Error ? error.message : 'Gagal menghubungi provider pembayaran.',
    }
  }
}
