/* ── KATALOG METODE BAYAR (paket 83) — SATU DAFTAR TEKNIS ────────────────────
   Ini bukan teks UI: ini daftar metode yang BENAR-BENAR dipanggil ke Midtrans
   Core API, dipakai dua sisi sekaligus —

     • server  → `/api/payment/charge` memvalidasi pilihan user & menyusun body
                 `/v2/charge` dari sini (metode di luar daftar = 422);
     • klien   → halaman `/checkout/bayar` menggambar pilihan dari daftar yang
                 SAMA, jadi tidak mungkin UI menawarkan metode yang route tolak.

   Semua metode di sini sudah diuji nyata di sandbox (paket 83): balasan
   `/v2/charge` masing-masing membawa `actions`/`va_numbers`/`biller_code` yang
   dipakai `lib/payments/midtrans.ts` untuk menyusun instruksi bayar.

   `reRenderable` — hasil uji empiris `GET /v2/{order_id}/status`:
     · `true`  → instruksinya masih bisa dirender ulang dari status (VA, ShopeePay,
                 Mandiri Bill) → order boleh DIPAKAI ULANG saat user menekan bayar lagi;
     · `false` → status tidak membawa instruksinya (GoPay: `actions` kosong), jadi
                 ordernya dibatalkan lalu dibuat baru — jujur, bukan QR/VA karangan.
   QRIS ditandai `true` karena gambar QR-nya bisa diturunkan dari `transaction_id`
   (`/v2/qris/{transaction_id}/qr-code`, sudah diuji 200 `image/png`). */

export type PaymentMethodId =
  | 'qris'
  | 'bca-va'
  | 'bri-va'
  | 'bni-va'
  | 'permata-va'
  | 'gopay'
  | 'shopeepay'
  | 'mandiri-bill'

/** kelompok tampilan (kartu pilihan di /checkout/bayar) */
export type PaymentChannel = 'qris' | 'va' | 'ewallet' | 'bill'

export interface PaymentMethodDefinition {
  id: PaymentMethodId
  channel: PaymentChannel
  /** `payment_type` Midtrans Core API */
  midtransType: 'qris' | 'bank_transfer' | 'gopay' | 'shopeepay' | 'echannel'
  /** kode bank untuk Virtual Account; `null` untuk metode lain */
  bank: 'bca' | 'bri' | 'bni' | 'permata' | null
  /** true = instruksinya bisa dirender ulang dari `GET /v2/{order_id}/status` */
  reRenderable: boolean
}

export const PAY_METHODS: PaymentMethodDefinition[] = [
  { id: 'qris', channel: 'qris', midtransType: 'qris', bank: null, reRenderable: true },
  { id: 'bca-va', channel: 'va', midtransType: 'bank_transfer', bank: 'bca', reRenderable: true },
  { id: 'bri-va', channel: 'va', midtransType: 'bank_transfer', bank: 'bri', reRenderable: true },
  { id: 'bni-va', channel: 'va', midtransType: 'bank_transfer', bank: 'bni', reRenderable: true },
  { id: 'permata-va', channel: 'va', midtransType: 'bank_transfer', bank: 'permata', reRenderable: true },
  { id: 'gopay', channel: 'ewallet', midtransType: 'gopay', bank: null, reRenderable: false },
  { id: 'shopeepay', channel: 'ewallet', midtransType: 'shopeepay', bank: null, reRenderable: true },
  { id: 'mandiri-bill', channel: 'bill', midtransType: 'echannel', bank: null, reRenderable: true },
]

export const PAY_METHOD_IDS: PaymentMethodId[] = PAY_METHODS.map((method) => method.id)

export function isPaymentMethodId(value: unknown): value is PaymentMethodId {
  return typeof value === 'string' && (PAY_METHOD_IDS as string[]).includes(value)
}

/** definisi satu metode; `undefined` = metode di luar katalog (route → 422) */
export function paymentMethod(id: unknown): PaymentMethodDefinition | undefined {
  return isPaymentMethodId(id) ? PAY_METHODS.find((method) => method.id === id) : undefined
}

/**
 * Bagian body `/v2/charge` yang khas per metode (nama + bentuknya persis seperti
 * dokumentasi Midtrans yang sudah diuji di sandbox). Nominal, `order_id`, dan
 * rincian item TIDAK di sini — itu ditentukan route dari `lib/data/pricing.ts`.
 */
export function midtransChargeExtras(
  method: PaymentMethodDefinition,
  { callbackUrl }: { callbackUrl?: string | null } = {},
): Record<string, unknown> {
  switch (method.channel) {
    case 'qris':
      return { payment_type: 'qris' }
    case 'va':
      return { payment_type: 'bank_transfer', bank_transfer: { bank: method.bank } }
    case 'ewallet':
      /* ShopeePay menerima `callback_url` (dipakai halaman kembalinya sendiri);
         GoPay tidak menerima blok itu. */
      return method.id === 'shopeepay'
        ? { payment_type: 'shopeepay', ...(callbackUrl ? { shopeepay: { callback_url: callbackUrl } } : {}) }
        : { payment_type: 'gopay' }
    default:
      return {
        payment_type: 'echannel',
        echannel: { bill_info1: 'Pembayaran:', bill_info2: 'Langganan CatetInd' },
      }
  }
}
