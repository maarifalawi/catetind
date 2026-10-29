import type { Metadata } from 'next'
import { LandingNavbarLp } from '@/components/landing/lp/navbar'
import { VerifyEmailScreen } from '@/components/catetind/verify-email-screen'
import { safeNextPath } from '@/lib/data/auth'

/**
 * Cek Email (/login/verify) — inventaris #9, halaman PUBLIK/pre-app.
 *
 * Tujuan tautan di dalam email (produksi: `emailRedirectTo` Supabase) DAN
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
 * Bingkai halaman memakai `LandingNavbarLp` di dalam satu `<main id="top">`,
 * TANPA footer landing — halaman ini bagian dari alur masuk yang sengaja
 * berakhir di kartu konfirmasi (desain lama PhoneStage + PublicNavbar dilepas).
 */
export const metadata: Metadata = {
  title: 'Cek Email | CatetInd',
  description:
    'Tautan masuk sudah dikirim ke emailmu. Buka inbox, klik tautannya, dan kamu langsung masuk, tanpa password.',
  /* Langkah tengah alur masuk ("buka inbox-mu") — tidak ada yang perlu
     diindeks, dan isinya berbeda per query (`?email=`, `?status=`). Sama
     seperti `/login`: `noindex, follow`, dan TIDAK dilarang di robots.txt
     supaya tag ini benar-benar terbaca crawler. */
  robots: { index: false, follow: true },
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
    <main id="top" className="w-full bg-canvas font-sans text-forest">
      <LandingNavbarLp basePath="/" />
      <VerifyEmailScreen
        email={firstValue(params.email)}
        expired={status === 'expired' || errorParam.length > 0}
        code={firstValue(params.code) || undefined}
        next={safeNextPath(firstValue(params.next)) ?? undefined}
      />
    </main>
  )
}
