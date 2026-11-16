import type { Metadata } from 'next'
import { LandingChangelogLp } from '@/components/landing/lp/changelog'
import { LandingFooterLp } from '@/components/landing/lp/footer'
import { LandingNavbarLp } from '@/components/landing/lp/navbar'
import { CHANGELOG_META } from '@/lib/data/changelog'
import { SITE_ORIGIN } from '@/lib/site'

/**
 * Changelog (/changelog) — halaman PUBLIK.
 *
 * Sumber struktur: export Framer `LP CATETIND_files/BAGIAN CHANGELOG/index.html`
 * (route `/changelog` template). Isinya sudah diadaptasi ke fitur CatetInd —
 * lihat `lib/data/changelog.ts`. Route ini tipis: metadata + navbar landing +
 * komponen changelog + footer landing.
 *
 * Halaman ini masuk `PUBLIC_ROUTES`: changelog harus bisa dibaca sebelum orang
 * punya akun, sama seperti `/terms` dan `/privacy`.
 */
export const metadata: Metadata = {
  title: 'Changelog | CatetInd',
  description: CHANGELOG_META.description,
  alternates: { canonical: `${SITE_ORIGIN}/changelog` },
}

export default function ChangelogPage() {
  return (
    <main id="top" className="w-full bg-canvas font-sans text-forest">
      <LandingNavbarLp basePath="/" />
      <LandingChangelogLp />
      <LandingFooterLp basePath="/" />
    </main>
  )
}
