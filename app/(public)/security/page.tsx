import type { Metadata } from 'next'
import { LegalShell } from '@/components/catetind/legal-shell'
import { LandingFooterLp } from '@/components/landing/lp/footer'
import { LandingNavbarLp } from '@/components/landing/lp/navbar'
import { SECURITY_DOC } from '@/lib/legal/security'
import { SITE_ORIGIN } from '@/lib/site'

/**
 * Keamanan Data (/security) — halaman PUBLIK.
 *
 * Footer landing menautkan kolom Legal ke sini. Isinya bukan teks di JSX:
 * dokumennya ada di `lib/legal/security.ts` dan `LegalShell` (shell yang sama
 * dengan `/privacy` & `/terms`) menyusunnya. Rute ini tipis — metadata + rangka
 * halaman landing — sehingga tidak ada desain legal ketiga yang berbeda.
 *
 * Route terdaftar di `PUBLIC_ROUTES` supaya middleware tidak meminta sesi:
 * orang boleh membaca komitmen keamanan sebelum punya akun.
 */
export const metadata: Metadata = {
  title: 'Keamanan Data | CatetInd',
  description:
    'Cara CatetInd menjaga catatan keuanganmu: tanpa akses rekening bank, data dipisahkan per akun, tidak ada panel admin, dan kamu bisa mengekspor atau menghapus data sendiri.',
  alternates: { canonical: `${SITE_ORIGIN}/security` },
}

export default function SecurityPage() {
  return (
    <main id="top" className="w-full bg-canvas font-sans text-forest">
      <LandingNavbarLp basePath="/" />
      <LegalShell document={SECURITY_DOC} kind="security" />
      <LandingFooterLp basePath="/" />
    </main>
  )
}
