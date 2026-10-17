import type { Metadata } from 'next'
import { CheckoutScreen } from '@/components/catetind/checkout-screen'
import { asBillingPeriod, type PlanId } from '@/lib/data/pricing'
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
 * KATALOG: 3 tier `PLANS` × dua periode nyata — `monthly` (prabayar 30 hari)
 * dan `lifetime` (akses selamanya). Harga dibaca dari `lib/data/pricing.ts`;
 * pembayaran terjadi di `/checkout/bayar` setelah user punya sesi.
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
    period?: string | string[]
  }>
}) {
  /* Query dibaca di SERVER (pola `app/budget/page.tsx`): dipakai tautan
     referral `/r/<kode>` dan tombol "Masuk" di sheet registrasi supaya pilihan
     paket user tidak hilang saat ia keluar-masuk halaman ini.
     `period` default monthly — prabayar 30 hari adalah produk utama. */
  const params = await searchParams
  const first = (value: string | string[] | undefined) =>
    (Array.isArray(value) ? value[0] : value)?.trim() ?? ''
  const plan = first(params.plan)
  const kode = first(params.kode)
  const period = asBillingPeriod(first(params.period)) ?? 'monthly'

  return (
    <PhoneStage plain>
      <CheckoutScreen
        initialPlanId={plan ? (plan as PlanId) : undefined}
        initialPeriod={period}
        initialReferralCode={kode || null}
      />
    </PhoneStage>
  )
}
