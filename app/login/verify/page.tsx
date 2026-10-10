import type { Metadata } from 'next'
import { PhoneStage } from '@/components/catetind/phone-stage'
import { PublicNavbar } from '@/components/catetind/public-navbar'
import { VerifyEmailScreen } from '@/components/catetind/verify-email-screen'
import { safeNextPath } from '@/lib/data/auth'

/**
 * Cek Email (/login/verify) — inventaris #9, halaman PUBLIK/pre-app.
 *
 * Ini tujuan tautan di dalam email (produksi: `emailRedirectTo` Supabase) DAN
 * halaman yang dituju setelah user menekan "Kirim Magic Link". Dua query dibaca
 * di SINI (server), bukan di komponen klien:
 *
 *   • `?email=`  → alamat yang ditampilkan di kartu konfirmasi
 *   • `?status=expired` → varian state kedaluwarsa (pratinjau review)
 *   • `?next=`   → halaman tujuan setelah sesi jadi (mis. `/checkout/bayar?…`);
 *     disaring `safeNextPath` supaya tidak bisa dipakai open-redirect
 *
 * Dibaca via prop server karena di Next 16 `searchParams` adalah Promise; cara ini
 * menghindari `useSearchParams()` + Suspense boundary di komponen klien dan menjaga
 * halaman tetap bisa dirender tanpa hydration mismatch.
 *
 * `PhoneStage plain` sama seperti /login & /checkout: layar fokus, tanpa
 * sidebar/bottom-nav app. Satu-satunya navigasi di sini adalah `PublicNavbar` —
 * navbar SITUS (di luar sistem app), dipakai supaya konsisten dengan /login.
 */
export const metadata: Metadata = {
  title: 'Cek Email — CatetInd',
  description:
    'Tautan masuk sudah dikirim ke emailmu. Buka inbox, klik tautannya, dan kamu langsung masuk — tanpa password.',
}

/** query bisa datang sebagai string[] (`?email=a&email=b`) — ambil yang pertama */
function firstValue(value: string | string[] | undefined): string {
  if (Array.isArray(value)) return value[0] ?? ''
  return value ?? ''
}

export default async function VerifyEmailPage({
  searchParams,
}: {
  searchParams: Promise<{
    email?: string | string[]
    status?: string | string[]
    code?: string | string[]
    error?: string | string[]
    next?: string | string[]
  }>
}) {
  const params = await searchParams
  /* Supabase mengirim `?error=…` (mis. tautan kedaluwarsa) atau `?code=…` (PKCE) */
  const status = firstValue(params.status)
  const errorParam = firstValue(params.error)

  return (
    <PhoneStage plain>
      {/* navbar SITUS (di luar sistem app) — konsisten dengan /login */}
      <PublicNavbar />
      <VerifyEmailScreen
        email={firstValue(params.email)}
        expired={status === 'expired' || errorParam.length > 0}
        code={firstValue(params.code) || undefined}
        next={safeNextPath(firstValue(params.next)) ?? undefined}
      />
    </PhoneStage>
  )
}
