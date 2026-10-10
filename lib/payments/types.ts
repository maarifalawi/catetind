/* ── TIPE PEMBAYARAN (paket 63) — RAIL, BUKAN MESIN ──────────────────────────
   Pembayaran (Midtrans) BELUM aktif; sprint ini menyiapkan SEAM-nya supaya saat
   kredensialnya tiba, yang berubah cuma isi `lib/payments/midtrans.ts` — bukan
   kontrak route. Karena itu tak ada satu pun angka uang di sini: nominal
   ditentukan route dari satu sumber harga (`lib/data/pricing.ts`). */

export type PaymentPurpose = 'subscribe' | 'topup' | 'renew' | 'upgrade'

/** niat pembayaran yang dikirim route ke provider */
export interface PaymentIntent {
  purpose: PaymentPurpose
  /** id pesanan unik (`order_id` Midtrans) — dipakai webhook untuk rekonsiliasi */
  orderId: string
  /** total dalam rupiah utuh (integer) */
  amount: number
  /** nama item yang tampil di halaman pembayaran provider */
  itemName: string
  planId?: string
  period?: string
  customerName?: string
  customerEmail?: string
  /** URL kembali setelah user selesai/gagal di halaman Snap (ALUR REDIRECT) */
  finishUrl?: string
  errorUrl?: string
}

/** token Snap + URL halaman pembayaran (dibuka `window.snap.pay` / redirect) */
export interface PaymentToken {
  token: string
  redirectUrl: string
}

/** alasan pembayaran tidak tersedia — dipakai route untuk memilih status HTTP */
export type PaymentUnavailableReason = 'not-configured' | 'invalid' | 'provider'
