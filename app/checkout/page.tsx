import type { Metadata } from 'next'
import { CheckoutScreen } from '@/components/catetind/checkout-screen'
import { LandingNavbarLp } from '@/components/landing/lp/navbar'
import { LandingPurchaseToasts } from '@/components/landing/lp/purchase-toasts'
import type { PlanId } from '@/lib/data/pricing'

/**
 * Checkout (/checkout) — inventaris #3, halaman PUBLIK.
 *
 * Bingkai halaman memakai `LandingNavbarLp` di dalam satu `<main id="top">`,
 * TANPA footer landing — halaman daftar/checkout sengaja berakhir di kartu
 * paket & ringkasan, bukan di menu pemasaran. Desain lama (PhoneStage + panel
 * batik dua kolom) sudah tidak dipakai lagi di sini.
 *
 * Aturan warna, frasa, dan angka dipenuhi dari satu tempat:
 *   • harga, paket, trust badge, dan seluruh copy → `lib/data/pricing.ts`
 *   • copy form registrasi + validasi email     → `lib/data/auth.ts`
 * Komponennya sendiri nol string copy (CONTEXT-WAJIB §4).
 *
 * TANPA ScreenShell/sidebar, dan `MobileBottomNav` + AI chat widget
 * menyembunyikan dirinya sendiri di prefix `/checkout` supaya tidak ada
 * navigasi app yang mengganggu alur membayar.
 *
 * KATALOG: 3 tier `PLANS`, SATU periode yang dijual — `lifetime` (akses
 * selamanya, sekali bayar). Harga dibaca dari `lib/data/pricing.ts`; pembayaran
 * terjadi di `/checkout/bayar` setelah user punya sesi.
 *
 * Yang penting: TIDAK ada harga yang ditulis di JSX halaman ini.
 */
export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Pembayaran — CatetInd',
  description:
    'Pilih paket, isi email & nama panggilan, bayar lewat QRIS/e-wallet/Virtual Account — langsung masuk onboarding tanpa langkah verifikasi yang menghadang.',
}

export default async function CheckoutPage({
  searchParams,
}: {
  searchParams: Promise<{
    plan?: string | string[]
    kode?: string | string[]
  }>
}) {
  /* Query dibaca di SERVER (pola `app/budget/page.tsx`): dipakai tautan
     referral `/r/<kode>` dan tombol "Masuk" di sheet registrasi supaya pilihan
     paket user tidak hilang saat ia keluar-masuk halaman ini.
     Periode tidak lagi dibaca: katalog hanya menjual akses selamanya. */
  const params = await searchParams
  const first = (value: string | string[] | undefined) =>
    (Array.isArray(value) ? value[0] : value)?.trim() ?? ''
  const plan = first(params.plan)
  const kode = first(params.kode)

  return (
    <main id="top" className="w-full bg-canvas font-sans text-forest">
      <LandingNavbarLp basePath="/" />
      <CheckoutScreen
        initialPlanId={plan ? (plan as PlanId) : undefined}
        initialReferralCode={kode || null}
      />
      {/* social proof pembelian juga tampil di checkout (tanpa menutupi ringkasan) */}
      <LandingPurchaseToasts />
    </main>
  )
}
