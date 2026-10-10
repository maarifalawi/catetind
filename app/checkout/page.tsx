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
 * KATALOG: 3 tier langganan (`PLANS`) × periode bulanan/tahunan. Paket "seumur
 * hidup" (Founding Member) TIDAK dijual, jadi halaman ini tidak lagi menampilkan
 * harga real-time — angkanya statis dari `lib/data/pricing.ts`, dan pembayaran
 * terjadi di `/checkout/bayar` (setelah user punya sesi).
 *
 * Yang penting: TIDAK ada harga yang ditulis di JSX halaman ini.
 */
export const dynamic = 'force-dynamic'

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
