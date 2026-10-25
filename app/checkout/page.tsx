import type { Metadata } from 'next'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { CheckoutScreen } from '@/components/catetind/checkout-screen'
import { LandingNavbarLp } from '@/components/landing/lp/navbar'
import { LandingPurchaseToasts } from '@/components/landing/lp/purchase-toasts'
import { safeNextPath } from '@/lib/data/auth'
import type { PlanId } from '@/lib/data/pricing'
import { readCallerPlan } from '@/lib/subscription/plan'
import { reconcileCallerPurchases } from '@/lib/subscription/reconcile'
import { readSupabaseSession } from '@/lib/supabase/session-cookie'

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
  title: 'Pembayaran | CatetInd',
  description:
    'Pilih paket, isi email & nama panggilan, bayar lewat QRIS/e-wallet/Virtual Account, langsung masuk onboarding tanpa langkah verifikasi yang menghadang.',
}

export default async function CheckoutPage({
  searchParams,
}: {
  searchParams: Promise<{
    plan?: string | string[]
    kode?: string | string[]
    /** halaman app yang tadi dituju sebelum middleware melempar ke sini */
    lanjut?: string | string[]
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
  const lanjut = safeNextPath(first(params.lanjut))

  /* ── PEMULIHAN PEMBAYARAN SEBELUM HALAMAN DIRENDER (paket 99) ─────────────
     Masalah yang ditutup di sini: user sudah membayar, middleware tidak melihat
     paket aktif (webhook telat), lalu melemparnya ke `/checkout`. Sebelum
     halaman harga digambar, server mencocokkan order `pending` user ke Midtrans
     — persis yang dilakukan tombol “Cek lagi”. Kalau ternyata sudah lunas,
     aksesnya dipenuhi dan user LANGSUNG dikembalikan ke halaman yang tadi
     dituju (`?lanjut=`, dipasang middleware), bukan disuruh membeli lagi.

     Yang TIDAK dilakukan: redirect membabi buta untuk semua user yang sudah
     punya paket. Tanpa `lanjut`/pemenuhan baru, halaman checkout tetap boleh
     dibuka — di sinilah user yang ingin UPGRADE memilih paket yang lebih tinggi.
     Anonim juga tidak disentuh: tanpa sesi, `readSupabaseSession` = null. */
  const session = readSupabaseSession((await cookies()).toString())
  if (session) {
    let caller = await readCallerPlan(session.accessToken)
    let justFulfilled = false

    if (!caller.active) {
      const reconciled = await reconcileCallerPurchases(session.accessToken)
      justFulfilled = reconciled.fulfilled.length > 0
      if (justFulfilled) caller = await readCallerPlan(session.accessToken)
    }

    if (caller.active && (justFulfilled || lanjut)) {
      redirect(lanjut ?? '/app')
    }
  }

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
