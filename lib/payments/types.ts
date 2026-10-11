/* ── TIPE PEMBAYARAN (paket 83) — CORE API, BUKAN HALAMAN SNAP ────────────────
   Sejak paket 83 pembayaran ditagih dari halaman MILIK SENDIRI
   (`/checkout/bayar`) lewat Midtrans Core API, jadi bentuk datanya berubah dari
   "token Snap" menjadi "instruksi bayar" yang bisa digambar di dalam app:
   QRIS, nomor Virtual Account, tautan e-wallet, atau kode Mandiri Bill.

   Yang tetap sama seperti paket 63: tidak ada satu pun angka uang di file ini —
   nominal ditentukan route dari satu sumber harga (`lib/data/pricing.ts`), dan
   yang masuk ke sini hanya hasil yang sudah diputuskan server. */

import type { PaymentMethodId } from './methods'

export type PaymentPurpose = 'subscribe' | 'topup' | 'upgrade'

/** niat pembayaran yang dikirim route ke provider */
export interface PaymentIntent {
  purpose: PaymentPurpose
  /** id pesanan unik (`order_id` Midtrans) — dipakai webhook untuk rekonsiliasi */
  orderId: string
  /** total dalam rupiah utuh (integer) */
  amount: number
  /** nama item yang tampil di rincian transaksi provider */
  itemName: string
  planId?: string
  /**
   * paket yang SUDAH dimiliki user saat `purpose: 'upgrade'` — hanya untuk
   * jejak audit di provider; nominalnya tetap dihitung server dari
   * `lib/data/pricing.ts`. Sebelum paket 84 kolom ini bernama `period`.
   */
  ownedPlanId?: string
  customerName?: string
  customerEmail?: string
  /**
   * URL webhook MILIK KITA untuk transaksi ini. Dititipkan lewat header
   * `X-Override-Notification` di `/v2/charge`, jadi app TIDAK bergantung pada
   * setelan dashboard Midtrans dan otomatis benar di localhost maupun produksi.
   */
  notificationUrl?: string
  /** URL kembali dari halaman e-wallet (ShopeePay `callback_url`) */
  finishUrl?: string
}

/**
 * Status pembayaran versi app — satu bahasa untuk DB, Midtrans, dan UI.
 * Diturunkan dari `transaction_status` + `fraud_status` Midtrans
 * (`paymentStateFromTransaction()` di `lib/payments/midtrans.ts`).
 */
export type PaymentState = 'pending' | 'settled' | 'failed' | 'expired' | 'unknown'

/** QRIS: URL gambar QR (boleh langsung dipasang di `<img>`) + isi QR apa adanya */
export interface PaymentInstructionsQris {
  channel: 'qris'
  qrImageUrl: string
  /** `qr_string` dari provider; `null` kalau provider tidak mengirimkannya */
  qrString: string | null
}

/** Virtual Account (BCA/BRI/BNI/Permata) */
export interface PaymentInstructionsVa {
  channel: 'va'
  bank: string
  vaNumber: string
}

/** e-wallet (GoPay/ShopeePay) — tautan yang membuka aplikasinya */
export interface PaymentInstructionsEwallet {
  channel: 'ewallet'
  deeplinkUrl: string
}

/** Mandiri Bill Payment — `biller_code` + `bill_key` */
export interface PaymentInstructionsBill {
  channel: 'bill'
  billerCode: string
  billKey: string
}

export type PaymentInstructions =
  | PaymentInstructionsQris
  | PaymentInstructionsVa
  | PaymentInstructionsEwallet
  | PaymentInstructionsBill

/** hasil `/v2/charge` yang sudah diterjemahkan untuk UI */
export interface ChargeDetails {
  state: PaymentState
  method: PaymentMethodId
  transactionStatus: string
  fraudStatus: string | null
  transactionId: string | null
  amount: number
  /** waktu kedaluwarsa dari provider; `null` = provider tidak menyebutkan */
  expiresAt: string | null
  /** `null` = provider tidak memberi instruksi yang bisa digambar (jujur, bukan karangan) */
  instructions: PaymentInstructions | null
}

/** hasil `GET /v2/{order_id}/status` yang sudah diterjemahkan */
export interface TransactionDetails {
  orderId: string
  state: PaymentState
  transactionStatus: string
  fraudStatus: string | null
  paymentType: string | null
  /** metode di katalog kita hasil pemetaan `payment_type`; `null` = di luar katalog */
  method: PaymentMethodId | null
  transactionId: string | null
  amount: number
  expiresAt: string | null
  /** instruksi yang masih bisa dirender ulang dari status (kalau ada) */
  instructions: PaymentInstructions | null
}

/** alasan pembayaran tidak tersedia — dipakai route untuk memilih status HTTP */
export type PaymentUnavailableReason = 'not-configured' | 'invalid' | 'provider' | 'not-found'

/** hasil panggilan provider: sukses membawa nilai, gagal membawa status HTTP + pesan jujur */
export type PaymentOutcome<T> =
  | { ok: true; value: T }
  | { ok: false; reason: PaymentUnavailableReason; status: number; message: string }
