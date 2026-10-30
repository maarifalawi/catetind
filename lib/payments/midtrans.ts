import { createHash, timingSafeEqual } from 'node:crypto'
import {
  midtransChargeExtras,
  snapEnabledPayments,
  type PaymentMethodDefinition,
  type PaymentMethodId,
} from './methods'
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

/* Nilai yang dianggap "produksi". Dulu hanya `'1'`, sehingga hosting yang
   menulis `true` / `yes` / `on` diam-diam tetap memakai SANDBOX — dan tagihan
   produksi yang dikirim ke sandbox selalu ditolak provider (401). Penerimaan
   bentuk-bentuk itu menutup salah-set yang paling mudah terjadi. */
const PRODUCTION_FLAGS = new Set(['1', 'true', 'yes', 'on'])

/**
 * `true` = kredensial produksi (uang sungguhan). Default `false` (sandbox),
 * sama seperti `midtransCoreBase()` — kosong/tak dikenal SELALU sandbox supaya
 * salah konfigurasi tidak pernah menagih uang nyata tanpa sengaja.
 */
export function midtransIsProduction(): boolean {
  return PRODUCTION_FLAGS.has((process.env.MIDTRANS_IS_PRODUCTION ?? '').trim().toLowerCase())
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

/* ── SNAP API — JALUR PRODUKSI SEJAK 30 OKTOBER 2026 ─────────────────────────
   Merchant self-onboarded `M130180776` punya Snap aktif, tetapi Core API
   `/v2/charge` membalas `402 Payment channel is not activated` untuk semua
   kanal. Probe produksi membuktikan `POST /snap/v1/transactions` membalas
   `201 { token, redirect_url }` — jadi tagihan dibuat lewat Snap, dan user
   menyelesaikan pembayaran di halaman Midtrans (redirect_url) lalu kembali ke
   `/checkout/selesai` lewat `callbacks.finish`.

   Snap punya HOST SENDIRI (bukan `api.`): `app.midtrans.com` produksi,
   `app.sandbox.midtrans.com` sandbox. Kunci & auth-nya sama persis dengan Core
   API (Basic serverKey:). */

/** host Snap sesuai mode (sandbox default — aman untuk uji) */
export function midtransSnapBase(): string {
  return midtransIsProduction() ? 'https://app.midtrans.com' : 'https://app.sandbox.midtrans.com'
}

/** endpoint pembuatan token Snap */
export function midtransSnapEndpoint(): string {
  return `${midtransSnapBase()}/snap/v1/transactions`
}

/** header Authorization Basic: key ditulis apa adanya, diikuti satu titik dua */
export function midtransAuthHeader(serverKey = midtransServerKey()): string {
  return `Basic ${Buffer.from(`${serverKey}:`).toString('base64')}`
}

/**
 * Verifikasi tanda tangan notifikasi webhook Midtrans:
 *     sha512(order_id + status_code + gross_amount + serverKey)
 *
 * `serverKey` dibaca dari `MIDTRANS_SERVER_KEY` — jadi begitu env berisi kunci
 * PRODUCTION (`Mid-server-…` dari dashboard produksi), rumus yang sama langsung
 * memverifikasi notifikasi produksi. Tidak ada rumus khusus sandbox/produksi:
 * Midtrans memakai formula yang identik di kedua mode.
 *
 * `false` kalau kunci kosong — fail-closed: tanpa kunci, TIDAK ada notifikasi
 * yang dianggap sah.
 *
 * Perbandingan memakai `timingSafeEqual` (bukan `===`) supaya waktu eksekusi
 * tidak membocorkan berapa banyak karakter tanda tangan yang sudah cocok.
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
  const received = input.signature.trim().toLowerCase()
  if (received.length !== expected.length) return false
  return timingSafeEqual(Buffer.from(expected, 'utf8'), Buffer.from(received, 'utf8'))
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
 * Bikin tagihan lewat `POST /v2/charge`.
 *
 * ⚠️ TIDAK DIPAKAI LAGI oleh `/api/payment/charge` sejak 30 Oktober 2026:
 * merchant produksi membalas `402 Payment channel is not activated` untuk Core
 * API, jadi produksi memakai Snap (`createSnapCharge` di bawah). Fungsi ini
 * dipertahankan sebagai RUJUKAN bentuk body Core (dan tetap diuji) supaya kalau
 * Midtrans mengaktifkan Core untuk akun ini, jalurnya tidak perlu ditulis ulang.
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
 *
 * Pada Snap, transaksi baru lahir saat user membuka halaman pembayaran. Untuk
 * order yang tokennya belum pernah dibuka, endpoint ini membalas 404 — itu
 * BUKAN kegagalan yang perlu dilaporkan: tidak ada tagihan hidup yang tersisa.
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

/* ── SNAP: BUAT TOKEN TAGIHAN (satu-satunya jalur produksi) ───────────────── */

/** balasan `POST /snap/v1/transactions` — hanya field yang benar-benar dipakai */
interface RawSnapToken {
  token?: string
  redirect_url?: string
  status_code?: string
  status_message?: string
  error_messages?: string[]
}

/** hasil pembuatan tagihan Snap yang dipakai route & UI */
export interface SnapCharge {
  state: PaymentState
  method: PaymentMethodId
  /** token Snap (dicadangkan untuk `snap.js` kalau popup dipakai nanti) */
  token: string
  /** halaman pembayaran Midtrans — tujuan tombol utama di `/checkout/bayar` */
  redirectUrl: string
  /**
   * Batas waktu tagihan. Snap TIDAK mengembalikan `expiry_time` saat token
   * dibuat, jadi ini waktu yang kita MINTA (`expiry.duration`), bukan tebakan
   * dari provider — UI memakainya sebagai pengingat, bukan sebagai bukti.
   */
  expiresAt: string
}

/**
 * Bikin token pembayaran Snap. Hanya dipanggil saat `midtransConfigured()`
 * true; kalau tidak, hasilnya `not-configured` (route → 503).
 *
 * `enabled_payments` dipetakan dari metode pilihan user
 * (`snapEnabledPayments()`), jadi halaman Snap langsung terbuka pada metode itu.
 * `callbacks.finish` membawa user kembali ke `/checkout/selesai?order_id=…`
 * setelah membayar — halaman itu MEMBACA DATABASE, tidak mempercayai query.
 */
export async function createSnapCharge(
  intent: PaymentIntent,
  method: PaymentMethodDefinition,
): Promise<PaymentOutcome<SnapCharge>> {
  if (!midtransConfigured()) {
    return failure('not-configured', 503, 'Pembayaran belum aktif.')
  }

  try {
    const res = await callMidtrans(midtransSnapEndpoint(), {
      method: 'POST',
      /* Webhook MILIK KITA dititipkan per transaksi, sama seperti jalur Core:
         app tidak bergantung pada setelan dashboard dan otomatis benar di
         localhost maupun produksi. */
      headers: intent.notificationUrl ? { 'X-Override-Notification': intent.notificationUrl } : {},
      body: JSON.stringify({
        transaction_details: { order_id: intent.orderId, gross_amount: intent.amount },
        item_details: [
          { id: intent.planId ?? intent.purpose, price: intent.amount, quantity: 1, name: intent.itemName },
        ],
        customer_details: intent.customerEmail
          ? { first_name: intent.customerName ?? '', email: intent.customerEmail }
          : undefined,
        enabled_payments: snapEnabledPayments(method),
        ...(intent.finishUrl ? { callbacks: { finish: intent.finishUrl } } : {}),
        expiry: { unit: 'minutes', duration: CHARGE_EXPIRY_MINUTES },
      }),
    })

    const raw = (await res.json().catch(() => null)) as RawSnapToken | null
    const providerStatus = Number(raw?.status_code ?? res.status)
    const token = typeof raw?.token === 'string' ? raw.token : ''
    const redirectUrl = typeof raw?.redirect_url === 'string' ? raw.redirect_url : ''

    /* Token kosong = tidak ada halaman yang bisa dibuka user; perlakukan sama
       seperti penolakan provider, jangan mengembalikan `ok` tanpa tujuan. */
    if (!res.ok || providerStatus >= 400 || !token || !redirectUrl) {
      const providerMessage =
        (raw?.error_messages ?? []).filter(Boolean).join(', ') ||
        raw?.status_message ||
        `Provider pembayaran menolak (${res.status}).`
      return failure('provider', res.ok ? 502 : res.status, providerMessage)
    }

    return {
      ok: true,
      value: {
        /* token dibuat = belum dibayar; state sebenarnya datang dari webhook /
           `GET /v2/{order_id}/status` yang di-poll UI. */
        state: 'pending',
        method: method.id,
        token,
        redirectUrl,
        expiresAt: new Date(Date.now() + CHARGE_EXPIRY_MINUTES * 60_000).toISOString(),
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

