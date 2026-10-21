import type { Metadata } from 'next'
import { LandingNavbarLp } from '@/components/landing/lp/navbar'
import { PaymentDoneScreen } from '@/components/catetind/payment-done-screen'

/**
 * /checkout/selesai — halaman kembali dari Snap Midtrans (ALUR REDIRECT).
 *
 * `order_id` hanya dipakai sebagai keterangan + jejak audit; status langganan
 * TIDAK diambil dari query string, melainkan dari database (`/api/subscription`).
 * Dengan begitu halaman ini tidak pernah menjadi jalur "mengaku sudah bayar".
 *
 * Bingkai halaman: `LandingNavbarLp` + layar status yang mengisi sisa tinggi
 * layar. Footer landing SENGAJA TIDAK dipasang di sini (permintaan pemilik
 * produk): setelah pembayaran, satu-satunya hal yang perlu dibaca adalah status
 * dan tombol masuk — bukan menu pemasaran.
 */
export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Status pembayaran — CatetInd',
  robots: { index: false, follow: false },
}

export default async function CheckoutDonePage({
  searchParams,
}: {
  searchParams: Promise<{ order_id?: string | string[]; status?: string | string[] }>
}) {
  const params = await searchParams
  const rawOrder = params.order_id
  const rawStatus = params.status
  const orderId = (Array.isArray(rawOrder) ? rawOrder[0] : rawOrder)?.trim() || null
  const failed = (Array.isArray(rawStatus) ? rawStatus[0] : rawStatus) === 'error'

  /* Satu <main> per halaman; tanpa footer supaya penutupnya adalah aksi
     "Masuk ke dashboard", bukan navigasi marketing. */
  return (
    <main id="top" className="w-full bg-canvas font-sans text-forest">
      <LandingNavbarLp basePath="/" />
      <PaymentDoneScreen orderId={orderId} failed={failed} />
    </main>
  )
}
