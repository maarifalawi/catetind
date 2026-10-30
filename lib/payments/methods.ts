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

   ── DUA DAFTAR, BUKAN SATU (audit pra-rilis 30 Oktober 2026) ────────────────
   `PAY_METHOD_CATALOG` adalah bentuk TEKNIS semua kanal yang pernah diuji.
   `PAY_METHODS` adalah kanal yang AKTIF di merchant PRODUKSI dan itulah
   satu-satunya daftar yang boleh dilihat user serta diterima route.

   ── PINDAH KE SNAP API (30 Oktober 2026, lanjutan audit yang sama) ──────────
   Core API `/v2/charge` membalas `402 Payment channel is not activated` untuk
   SEMUA kanal di merchant self-onboarded `M130180776`, sementara Snap API
   (`POST https://app.midtrans.com/snap/v1/transactions`) membalas **201** dan
   mengaktifkan kanal yang sudah dinyalakan di dashboard — termasuk `other_qris`,
   `gopay`, `bni_va`, `bri_va`, `echannel`, `permata_va`. Karena itu tagihan
   sekarang dibuat lewat Snap (`createSnapCharge`), dan setiap metode memetakan
   dirinya ke `enabled_payments` Snap lewat `snapEnabledPayments()` di bawah.

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

/**
 * Bentuk teknis SEMUA kanal yang sudah diuji di sandbox. Katalog ini TIDAK
 * otomatis berarti bisa dipakai di produksi — lihat
 * `VERIFIED_ACTIVE_METHOD_IDS` di bawah.
 */
export const PAY_METHOD_CATALOG: PaymentMethodDefinition[] = [
  { id: 'qris', channel: 'qris', midtransType: 'qris', bank: null, reRenderable: true },
  { id: 'bca-va', channel: 'va', midtransType: 'bank_transfer', bank: 'bca', reRenderable: true },
  { id: 'bri-va', channel: 'va', midtransType: 'bank_transfer', bank: 'bri', reRenderable: true },
  { id: 'bni-va', channel: 'va', midtransType: 'bank_transfer', bank: 'bni', reRenderable: true },
  { id: 'permata-va', channel: 'va', midtransType: 'bank_transfer', bank: 'permata', reRenderable: true },
  { id: 'gopay', channel: 'ewallet', midtransType: 'gopay', bank: null, reRenderable: false },
  { id: 'shopeepay', channel: 'ewallet', midtransType: 'shopeepay', bank: null, reRenderable: true },
  { id: 'mandiri-bill', channel: 'bill', midtransType: 'echannel', bank: null, reRenderable: true },
]

/**
 * Kanal yang AKTIF di merchant PRODUKSI `M130180776`.
 *
 * Sumber kebenaran: Dashboard Midtrans Production → **Payment Methods → Active
 * payment methods** (dikonfirmasi pemilik akun, 30 Oktober 2026):
 *   GoPay Dynamic QRIS (`other_qris`) · GoPay · BNI VA · BRI VA
 *   · Mandiri (`echannel`) · Permata VA · CIMB Niaga VA (`cimb_va`).
 *
 * Di katalog kita ada enam yang beririsan (`cimb_va` belum punya metode di
 * aplikasi ini, jadi belum dijual). `bca-va` dan `shopeepay` SENGAJA tidak
 * ada di daftar ini karena kanalnya tidak aktif di akun tersebut.
 *
 * ATURAN MENGUBAH DAFTAR INI — satu-satunya aturan:
 *   ubah HANYA setelah Dashboard Midtrans menunjukkan kanal itu aktif DAN
 *   `POST https://app.midtrans.com/snap/v1/transactions` dengan
 *   `enabled_payments` kanal tersebut membalas `201`.
 *
 * Catatan penting dari probe 30 Oktober 2026: pembuatan token Snap membalas
 * `201` bahkan untuk kanal yang TIDAK aktif (`bca_va` diuji → 201), karena
 * transaksi baru lahir saat user membuka halaman Snap. Jadi 201 membuktikan
 * Snap API-nya terbuka, sedangkan AKTIF/TIDAKNYA kanal tetap ditentukan
 * dashboard — karena itu daftar di bawah mengikuti dashboard, bukan tebakan.
 */
export const VERIFIED_ACTIVE_METHOD_IDS: PaymentMethodId[] = [
  'qris',
  'gopay',
  'bni-va',
  'bri-va',
  'mandiri-bill',
  'permata-va',
]

/**
 * Kanal yang boleh DILIHAT user dan DITERIMA route. Satu daftar untuk dua sisi:
 * UI menggambar dari sini, `/api/payment/charge` menolak metode di luar sini.
 * Urutannya mengikuti `VERIFIED_ACTIVE_METHOD_IDS` (bukan urutan katalog):
 * daftar aktif itulah yang sengaja disusun untuk tampilan — QRIS dulu, lalu
 * e-wallet, lalu Virtual Account/Bill.
 */
export const PAY_METHODS: PaymentMethodDefinition[] = VERIFIED_ACTIVE_METHOD_IDS.map((id) =>
  PAY_METHOD_CATALOG.find((method) => method.id === id),
).filter((method): method is PaymentMethodDefinition => Boolean(method))

export const PAY_METHOD_IDS: PaymentMethodId[] = PAY_METHODS.map((method) => method.id)

/** `false` = belum ada satu pun kanal aktif → halaman bayar harus berkata jujur */
export const PAYMENT_METHODS_AVAILABLE = PAY_METHODS.length > 0

/** id dikenal katalog (bentuk teknisnya ada), belum tentu aktif di produksi */
export function isPaymentMethodId(value: unknown): value is PaymentMethodId {
  return (
    typeof value === 'string' &&
    PAY_METHOD_CATALOG.some((method) => method.id === (value as PaymentMethodId))
  )
}

/**
 * Definisi satu metode DARI KATALOG; `undefined` = metode di luar katalog
 * (route → 422). Bentuk body `/v2/charge` tetap bisa disusun untuk kanal yang
 * belum aktif — itulah yang membuat unit test & probe bisa memeriksa semuanya.
 */
export function paymentMethod(id: unknown): PaymentMethodDefinition | undefined {
  return isPaymentMethodId(id) ? PAY_METHOD_CATALOG.find((method) => method.id === id) : undefined
}

/** `true` = kanal ini boleh ditagih SEKARANG (lolos probe produksi) */
export function isPaymentMethodActive(id: unknown): id is PaymentMethodId {
  return typeof id === 'string' && (PAY_METHOD_IDS as string[]).includes(id)
}

/**
 * `enabled_payments` Snap per metode katalog — supaya halaman Snap langsung
 * terbuka pada metode yang dipilih user, bukan daftar semua kanal.
 *
 * QRIS sengaja memuat dua kode: `other_qris` (GoPay Dynamic QRIS — QR yang bisa
 * dipindai aplikasi bank/e-wallet apa pun) dan `gopay` (QR GoPay di aplikasi
 * GoPay). Keduanya kanal yang sama-sama aktif di merchant ini, jadi user tetap
 * bisa memindai dari aplikasi mana pun.
 */
export function snapEnabledPayments(method: PaymentMethodDefinition): string[] {
  switch (method.id) {
    case 'qris':
      return ['other_qris', 'gopay']
    case 'gopay':
      return ['gopay']
    case 'bni-va':
      return ['bni_va']
    case 'bri-va':
      return ['bri_va']
    case 'permata-va':
      return ['permata_va']
    case 'mandiri-bill':
      return ['echannel']
    /* dua kanal di bawah belum aktif di merchant produksi, tetapi bentuk
       payload-nya tetap didefinisikan supaya mengaktifkannya cukup satu baris
       di `VERIFIED_ACTIVE_METHOD_IDS` — bukan tambal kode di banyak tempat. */
    case 'bca-va':
      return ['bca_va']
    case 'shopeepay':
      return ['shopeepay']
  }
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
