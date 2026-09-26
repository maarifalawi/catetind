import type { Metadata } from 'next'
import { CheckoutScreen } from '@/components/catetind/checkout-screen'
import { PhoneStage } from '@/components/catetind/phone-stage'

/**
 * Checkout (/checkout) — inventaris #3, halaman PUBLIK.
 *
 * Aturan warna, frasa, dan angka dipenuhi dari satu tempat:
 *   • harga, paket, trust badge, dan seluruh copy → `lib/data/pricing.ts`
 *   • copy form registrasi + validasi email     → `lib/data/auth.ts`
 * Komponennya sendiri nol string copy (CONTEXT-WAJIB §4).
 *
 * `PhoneStage plain` — seperti onboarding: layar fokus tanpa watermark raksasa di
 * latar. TANPA ScreenShell/sidebar, dan `MobileBottomNav` + AI chat widget
 * menyembunyikan dirinya sendiri di prefix `/checkout` (lihat komentar di kedua
 * komponen itu) supaya tidak ada navigasi app yang mengganggu alur membayar.
 *
 * HARGA REAL-TIME (inventaris #3: "harga real-time, no-cache") — arah produksi:
 * halaman ini jadi dynamic lalu membaca `GET /api/price` dengan `cache: 'no-store'`
 * supaya angka Founding Member yang naik mengikuti pembelian terakhir:
 *
 *   export const dynamic = 'force-dynamic'
 *
 * Di repo demo baris itu sengaja BELUM dinyalakan: harganya masih mock & statis
 * (founding member = snapshot di `lib/data/pricing.ts`), jadi halaman bisa
 * diprerender tanpa risiko menampilkan harga basi. Yang penting kontraknya sudah
 * jelas: TIDAK ada harga yang ditulis di JSX halaman ini.
 */
export const metadata: Metadata = {
  title: 'Pembayaran — CatetInd',
  description:
    'Pilih paket, isi email & nama panggilan, bayar lewat QRIS/e-wallet/Virtual Account — langsung masuk onboarding tanpa langkah verifikasi yang menghadang.',
}

export default function CheckoutPage() {
  return (
    <PhoneStage plain>
      <CheckoutScreen />
    </PhoneStage>
  )
}
