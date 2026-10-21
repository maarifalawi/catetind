import { createHash } from 'node:crypto'
import { midtransChargeExtras, type PaymentMethodDefinition, type PaymentMethodId } from './methods'
import type {
  ChargeDetails,
  PaymentInstructions,
  PaymentIntent,
  PaymentOutcome,
  PaymentState,
  PaymentUnavailableReason,
  TransactionDetails,
} from './types'

/* ── MIDTRANS CORE API (paket 83) — TAGIHAN DI DALAM APP ─────────────────────
   Sampai paket 82 pembayaran mengirim user ke halaman Snap Midtrans. Sejak paket
   83 instruksinya digambar di halaman kita sendiri, jadi yang dipakai di sini
   adalah Core API:

     POST /v2/charge             → bikin tagihan (QRIS/VA/e-wallet/Mandiri Bill)
     GET  /v2/{order_id}/status  → tanya status transaksi (dipakai polling UI)

   Kunci HANYA di server (`MIDTRANS_SERVER_KEY`), tidak pernah `NEXT_PUBLIC_`.
   Sandbox vs produksi dipilih lewat `MIDTRANS_IS_PRODUCTION` (default sandbox).
   Selama kuncinya kosong, tidak ada satu pun fungsi di file ini yang menagih —
   route di baliknya menjawab 503 apa adanya.

   Semua bentuk balasan yang dibaca di bawah (nama field, isi `actions`,
   `va_numbers`, `biller_code`) sudah diuji langsung ke sandbox Midtrans, bukan
   dikira-kira. */

/** umur tagihan (menit) — juga dipakai UI sebagai pengingat batas waktu */
export const CHARGE_EXPIRY_MINUTES = 60

export function midtransServerKey(): string {
  return (process.env.MIDTRANS_SERVER_KEY ?? '').trim()
}

/** `true` = kredensial ada → route boleh mencoba membuat tagihan */
export function midtransConfigured(): boolean {
  return midtransServerKey().length > 0
}

/**
 * `true` = kredensial produksi (uang sungguhan). Default `false` (sandbox),
 * sama seperti `midtransCoreBase()`.
 */
export function midtransIsProduction(): boolean {
  return (process.env.MIDTRANS_IS_PRODUCTION ?? '') === '1'
}

/** basis API sesuai mode (sandbox default — aman untuk uji) */
export function midtransCoreBase(): string {
  return midtransIsProduction()
    ? 'https://api.midtrans.com'
    : 'https://api.sandbox.midtrans.com'
}

/** endpoint tagihan Core API */
export function midtransChargeEndpoint(): string {
  return `${midtransCoreBase()}/v2/charge`
}

/** endpoint status satu transaksi (dipanggil SERVER — kunci tidak pernah ke browser) */
export function midtransStatusEndpoint(orderId: string): string {
  return `${midtransCoreBase()}/v2/${encodeURIComponent(orderId)}/status`
}

/**
 * Gambar QR satu transaksi QRIS. Dipakai saat instruksi harus dirender ULANG
 * dari status (order dipakai ulang ketika user menekan bayar lagi): `actions[]`
 * tidak ikut di balasan status, sementara URL ini bisa diturunkan dari
 * `transaction_id` — sudah diuji: HTTP 200 `image/png` dan URL-nya SAMA PERSIS
 * dengan `actions[generate-qr-code].url` dari `/v2/charge`.
 */
export function midtransQrImageUrl(transactionId: string): string {
  return `${midtransCoreBase()}/v2/qris/${encodeURIComponent(transactionId)}/qr-code`
}

/** header Authorization Basic: key ditulis apa adanya, diikuti satu titik dua */
export function midtransAuthHeader(serverKey = midtransServerKey()): string {
  return `Basic ${Buffer.from(`${serverKey}:`).toString('base64')}`
}

/**
 * Verifikasi tanda tangan notifikasi webhook Midtrans:
 *     sha512(order_id + status_code + gross_amount + serverKey)
 * `false` kalau kunci kosong — fail-closed: tanpa kunci, TIDAK ada notifikasi
 * yang dianggap sah. (Tidak diubah sejak paket 63; webhook bergantung padanya.)
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

/**
 * Terjemahkan `transaction_status` + `fraud_status` Midtrans jadi bahasa app.
 * `capture` baru dihitung sukses kalau fraud-nya `accept`; `challenge` masih
 * menunggu tinjauan (jangan pernah bilang sudah aktif).
 */
export function paymentStateFromTransaction(
  transactionStatus: string,
  fraudStatus?: string | null,
): PaymentState {
  switch (transactionStatus) {
    case 'settlement':
      return 'settled'
    case 'capture':
      return fraudStatus === 'accept' ? 'settled' : fraudStatus === 'challenge' ? 'pending' : 'failed'
    case 'pending':
    case 'authorize':
      return 'pending'
    case 'expire':
      return 'expired'
    case 'deny':
    case 'cancel':
    case 'failure':
    case 'refund':
    case 'partial_refund':
      return 'failed'
    default:
      return 'unknown'
  }
}

/**
 * Waktu kedaluwarsa Midtrans (`YYYY-MM-DD HH:mm:ss`, GMT+7 menurut dokumentasi)
 * → ISO yang bisa dihitung browser. Bentuk lain → `null` (jangan menebak waktu).
 */
export function midtransExpiryToIso(value: unknown): string | null {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(value)) return null
  const parsed = new Date(`${value.replace(' ', 'T')}+07:00`)
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString()
}

/** balasan mentah Midtrans — hanya field yang benar-benar dipakai */
export interface RawTransaction {
  status_code?: string
  status_message?: string
  transaction_status?: string
  fraud_status?: string
  payment_type?: string
  transaction_id?: string
  gross_amount?: string | number
  expiry_time?: string
  qr_string?: string
  va_numbers?: { bank?: string; va_number?: string }[]
  permata_va_number?: string
  biller_code?: string
  bill_key?: string
  actions?: { name?: string; method?: string; url?: string }[]
  error_messages?: string[]
}

function rawAmount(raw: RawTransaction): number {
  const amount = Math.round(Number(raw.gross_amount))
  return Number.isFinite(amount) ? amount : 0
}

function actionUrl(raw: RawTransaction, name: string): string | null {
  return raw.actions?.find((action) => action.name === name)?.url ?? null
}

/**
 * Instruksi bayar dari balasan `/v2/charge`. Bentuk balasan `/v2/{order_id}/status`
 * untuk keempat kanal ini identik, jadi satu fungsi cukup untuk dua-duanya.
 *
 * `null` = provider tidak memberi apa pun yang bisa digambar — pemanggil wajib
 * mengatakannya apa adanya (jangan menggambar QR/VA karangan).
 */
export function paymentInstructionsFromTransaction(
  raw: RawTransaction,
  method: PaymentMethodDefinition,
): PaymentInstructions | null {
  switch (method.channel) {
    case 'qris': {
      const url =
        actionUrl(raw, 'generate-qr-code') ??
        (raw.transaction_id ? midtransQrImageUrl(raw.transaction_id) : null)
      if (!url) return null
      return { channel: 'qris', qrImageUrl: url, qrString: raw.qr_string ?? null }
    }
    case 'va': {
      const vaNumber = raw.va_numbers?.[0]?.va_number ?? raw.permata_va_number ?? null
      if (!vaNumber) return null
      const bank = method.bank ?? raw.va_numbers?.[0]?.bank ?? ''
      return { channel: 'va', bank, vaNumber }
    }
    case 'ewallet': {
      /* e-wallet dikirim sebagai tautan: QR GoPay butuh `actions` yang TIDAK ikut
         di balasan status, jadi tautan ini yang bisa dipakai ulang dengan jujur. */
      const deeplink = actionUrl(raw, 'deeplink-redirect')
      return deeplink ? { channel: 'ewallet', deeplinkUrl: deeplink } : null
    }
    default: {
      if (!raw.biller_code || !raw.bill_key) return null
      return { channel: 'bill', billerCode: raw.biller_code, billKey: raw.bill_key }
    }
  }
}

/** `payment_type` Midtrans (+ bank VA) → metode di katalog kita; `null` = di luar katalog */
export function methodIdFromTransaction(
  paymentType: string | null | undefined,
  vaBank?: string | null,
  hasPermata?: boolean,
): PaymentMethodId | null {
  switch (paymentType) {
    case 'qris':
      return 'qris'
    case 'gopay':
      return 'gopay'
    case 'shopeepay':
      return 'shopeepay'
    case 'echannel':
      return 'mandiri-bill'
    case 'bank_transfer': {
      const bank = hasPermata ? 'permata' : (vaBank ?? '').toLowerCase()
      return `${bank}-va` as PaymentMethodId
    }
    default:
      return null
  }
}

function failure(
  reason: PaymentUnavailableReason,
  status: number,
  message: string,
): { ok: false; reason: PaymentUnavailableReason; status: number; message: string } {
  return { ok: false, reason, status, message }
}

/** pesan jujur dari provider: pakai `error_messages`, lalu `status_message` */
function providerMessage(raw: RawTransaction | null, httpStatus: number): string {
  const messages = (raw?.error_messages ?? []).filter(Boolean)
  if (messages.length > 0) return messages.join(', ')
  if (raw?.status_message) return raw.status_message
  return `Provider pembayaran menolak (${httpStatus}).`
}

/** satu jalur panggilan ke Midtrans, supaya kunci tidak pernah ditulis dua cara */
async function callMidtrans(path: string, init: RequestInit): Promise<Response> {
  return fetch(path, {
    ...init,
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      Authorization: midtransAuthHeader(),
      ...(init.headers ?? {}),
    },
    cache: 'no-store',
  })
}

/**
 * Bikin tagihan lewat `POST /v2/charge`. HANYA dipanggil saat
 * `midtransConfigured()` true; kalau tidak, hasilnya `not-configured` (route → 503).
 *
 * Nominal, `order_id`, dan rincian item datang dari route (hasil keputusan
 * server), sedangkan bagian khas metode disusun `lib/payments/methods.ts`.
 */
export async function createCoreCharge(
  intent: PaymentIntent,
  method: PaymentMethodDefinition,
): Promise<PaymentOutcome<ChargeDetails>> {
  if (!midtransConfigured()) {
    return failure('not-configured', 503, 'Pembayaran belum aktif.')
  }

  try {
    const res = await callMidtrans(midtransChargeEndpoint(), {
      method: 'POST',
      /* Webhook MILIK KITA dititipkan per transaksi — app tidak bergantung pada
         setelan dashboard Midtrans, dan otomatis benar di localhost maupun
         produksi (lihat §4.3 dokumen paket 83). */
      headers: intent.notificationUrl ? { 'X-Override-Notification': intent.notificationUrl } : {},
      body: JSON.stringify({
        transaction_details: { order_id: intent.orderId, gross_amount: intent.amount },
        item_details: [
          { id: intent.planId ?? intent.purpose, price: intent.amount, quantity: 1, name: intent.itemName },
        ],
        customer_details: intent.customerEmail
          ? { first_name: intent.customerName ?? '', email: intent.customerEmail }
          : undefined,
        custom_expiry: { expiry_duration: CHARGE_EXPIRY_MINUTES, unit: 'minute' },
        ...midtransChargeExtras(method, { callbackUrl: intent.finishUrl }),
      }),
    })

    const raw = (await res.json().catch(() => null)) as RawTransaction | null
    const providerStatus = Number(raw?.status_code ?? res.status)
    /* Midtrans bisa membalas HTTP 200 dengan `status_code` >= 400 (mis. 406 saat
       order ditagih ulang) — dua-duanya diperlakukan sebagai kegagalan. */
    if (!res.ok || !raw || providerStatus >= 400) {
      return failure('provider', res.ok ? 502 : res.status, providerMessage(raw, res.status))
    }

    const transactionStatus = String(raw.transaction_status ?? '')
    return {
      ok: true,
      value: {
        state: paymentStateFromTransaction(transactionStatus, raw.fraud_status ?? null),
        method: method.id,
        transactionStatus,
        fraudStatus: raw.fraud_status ?? null,
        transactionId: raw.transaction_id ?? null,
        amount: rawAmount(raw),
        expiresAt: midtransExpiryToIso(raw.expiry_time),
        instructions: paymentInstructionsFromTransaction(raw, method),
      },
    }
  } catch (error) {
    return failure(
      'provider',
      502,
      error instanceof Error ? error.message : 'Gagal menghubungi provider pembayaran.',
    )
  }
}

/**
 * Tanya status satu transaksi ke `GET /v2/{order_id}/status` (dipanggil SERVER;
 * kunci tidak pernah ke browser). `404` dibedakan: transaksi belum tercatat di
 * provider, bukan error — jadi UI bisa berkata jujur.
 *
 * `method` opsional; kalau dikirim, instruksinya ikut dirender ulang dari status
 * (dipakai saat order yang sama dipakai ulang).
 */
export async function fetchTransactionStatus(
  orderId: string,
  method?: PaymentMethodDefinition,
): Promise<PaymentOutcome<TransactionDetails>> {
  if (!midtransConfigured()) {
    return failure('not-configured', 503, 'Pembayaran belum aktif.')
  }

  try {
    const res = await callMidtrans(midtransStatusEndpoint(orderId), { method: 'GET' })
    const raw = (await res.json().catch(() => null)) as RawTransaction | null

    if (res.status === 404) {
      return failure('not-found', 404, 'Transaksi ini belum tercatat di provider pembayaran.')
    }
    if (!res.ok || !raw) {
      return failure('provider', res.ok ? 502 : res.status, providerMessage(raw, res.status))
    }

    const transactionStatus = String(raw.transaction_status ?? '')
    return {
      ok: true,
      value: {
        orderId,
        state: paymentStateFromTransaction(transactionStatus, raw.fraud_status ?? null),
        transactionStatus,
        fraudStatus: raw.fraud_status ?? null,
        paymentType: raw.payment_type ?? null,
        method: methodIdFromTransaction(
          raw.payment_type,
          raw.va_numbers?.[0]?.bank,
          Boolean(raw.permata_va_number),
        ),
        transactionId: raw.transaction_id ?? null,
        amount: rawAmount(raw),
        expiresAt: midtransExpiryToIso(raw.expiry_time),
        instructions: method ? paymentInstructionsFromTransaction(raw, method) : null,
      },
    }
  } catch (error) {
    return failure(
      'provider',
      502,
      error instanceof Error ? error.message : 'Gagal menghubungi provider pembayaran.',
    )
  }
}

/**
 * Batalkan tagihan yang belum dibayar (user ganti metode, atau tagihannya sudah
 * kedaluwarsa). Kegagalan di sini TIDAK fatal: tagihan yang tidak bisa dibatalkan
 * akan kedaluwarsa sendiri, dan notifikasinya tetap masuk ke webhook yang sama
 * (baris `purchases`-nya lalu ditandai `cancel` oleh RPC pemenuhan).
 */
export async function cancelTransaction(orderId: string): Promise<boolean> {
  if (!midtransConfigured()) return false
  try {
    const res = await callMidtrans(`${midtransCoreBase()}/v2/${encodeURIComponent(orderId)}/cancel`, {
      method: 'POST',
      body: JSON.stringify({}),
    })
    return res.ok
  } catch {
    return false
  }
}
