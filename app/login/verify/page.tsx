import type { Metadata } from 'next'
import { PhoneStage } from '@/components/catetind/phone-stage'
import { VerifyEmailScreen } from '@/components/catetind/verify-email-screen'

/**
 * Cek Email (/login/verify) — inventaris #9, halaman PUBLIK/pre-app.
 *
 * Ini tujuan tautan di dalam email (produksi: `emailRedirectTo` Supabase) DAN
 * halaman yang dituju setelah user menekan "Kirim Magic Link". Dua query dibaca
 * di SINI (server), bukan di komponen klien:
 *
 *   • `?email=`  → alamat yang ditampilkan di kartu konfirmasi
 *   • `?status=expired` → varian state kedaluwarsa (pratinjau review)
 *
 * Dibaca via prop server karena di Next 16 `searchParams` adalah Promise; cara ini
 * menghindari `useSearchParams()` + Suspense boundary di komponen klien dan menjaga
 * halaman tetap bisa dirender tanpa hydration mismatch.
 *
 * `PhoneStage plain` sama seperti /login & /checkout: layar fokus, tanpa
 * sidebar/nav/chat widget.
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
  searchParams: Promise<{ email?: string | string[]; status?: string | string[] }>
}) {
  const params = await searchParams

  return (
    <PhoneStage plain>
      <VerifyEmailScreen
        email={firstValue(params.email)}
        expired={firstValue(params.status) === 'expired'}
      />
    </PhoneStage>
  )
}
