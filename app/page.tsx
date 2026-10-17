import type { Metadata } from 'next'
import { LandingFaqLp } from '@/components/landing/lp/faq'
import { LandingFooterLp } from '@/components/landing/lp/footer'
import { LandingHeroLp } from '@/components/landing/lp/hero'
import { LandingMissionLp } from '@/components/landing/lp/mission'
import { LandingNavbarLp } from '@/components/landing/lp/navbar'
import { LandingPricingLp } from '@/components/landing/lp/pricing'
import { LANDING_META } from '@/lib/data/landing'

/* ── LANDING PUBLIK `/` ──────────────────────────────────────────────────────
   Landing baru (port Framer yang sekarang memakai Design System CatetInd:
   Earth Pastel + Inter). Section: navbar → hero → mission → pricing → FAQ →
   footer (footer sudah berisi CTA penutup). Semua copy + angka dibaca dari
   `lib/data/landing.ts` / `lib/data/pricing.ts`; tidak ada string user-facing
   di JSX. Rute preview lama sekarang 301 ke sini. */

export const revalidate = 3600

export const metadata: Metadata = {
  title: LANDING_META.title,
  description: LANDING_META.description,
  alternates: { canonical: LANDING_META.ogUrl },
  openGraph: {
    type: 'website',
    locale: 'id_ID',
    siteName: 'CatetInd',
    title: LANDING_META.ogTitle,
    description: LANDING_META.ogDescription,
    url: LANDING_META.ogUrl,
  },
  twitter: {
    card: 'summary_large_image',
    title: LANDING_META.ogTitle,
    description: LANDING_META.ogDescription,
  },
}

export default function LandingPage() {
  return (
    <main className="w-full bg-canvas font-sans text-forest">
      <LandingNavbarLp />
      <LandingHeroLp />
      <LandingMissionLp />
      <LandingPricingLp />
      <LandingFaqLp />
      <LandingFooterLp />
    </main>
  )
}
