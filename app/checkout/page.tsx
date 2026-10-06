import type { Metadata } from 'next'
import { CheckoutScreen } from '@/components/catetind/checkout-screen'
import { PhoneStage } from '@/components/catetind/phone-stage'
import { staticPriceState } from '@/lib/data/pricing'

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
 * HARGA REAL-TIME (inventaris #3: "harga real-time, no-cache") — halaman ini
 * DINAMIS (`force-dynamic`) dan memuat harga Founding Member dari satu sumber:
 *
 *   • SSR memakai `staticPriceState()` supaya first paint TIDAK kosong (tidak ada
 *     halaman yang berkedip "Rp 0" sambil menunggu jaringan);
 *   • setelah mount, `CheckoutScreen` memanggil `GET /api/price` dengan
 *     `cache: 'no-store'` dan menggantinya dengan angka terbaru bila tersedia.
 *
 * Selama tabel `pricing_state` belum ada (pembayaran/Midtrans belum aktif),
 * `/api/price` menjawab `isDynamic: false` — dan UI mengatakannya apa adanya.
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
      <CheckoutScreen initialPrice={staticPriceState()} />
    </PhoneStage>
  )
}
