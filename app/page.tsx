import type { Metadata } from 'next'
import { LandingNavbar } from '@/components/landing/landing-navbar'
import { Hero } from '@/components/landing/hero'
import { PainCalculator } from '@/components/landing/pain-calculator'
import { WealthGap } from '@/components/landing/wealth-gap'
import { SocialProof } from '@/components/landing/social-proof'
import { PricingSection } from '@/components/landing/pricing-section'
import { FaqSection } from '@/components/landing/faq-section'
import { LandingFooter } from '@/components/landing/landing-footer'
import { StickyCtaBar } from '@/components/landing/sticky-cta-bar'
import { LandingCtaProvider } from '@/components/landing/landing-cta-provider'
import { LANDING_META } from '@/lib/data/landing'

/**
 * LANDING PAGE PUBLIK — route root `/` (inventaris #1–#2).
 *
 * Sebelumnya root adalah Dashboard; sejak dashboard pindah ke `/app`, root jadi
 * halaman pemasaran. Struktur section (atas → bawah):
 *   1. Navbar (fixed, transparan → berlatar saat digulir)
 *   2. Hook emosional (nol CTA)
 *   3. Pain Calculator (interaktif, klien)
 *   4. Wealth Gap Visualizer (Recharts, animasi saat terlihat)
 *   5. Social proof (feed + testimoni)
 *   6. Pricing + CTA primer → membuka sheet pendaftaran
 *   7. FAQ accordion
 *   8. Footer · Sticky CTA bar (muncul setelah Section 5 terlewat)
 *
 * `revalidate` membuat halaman ini ISR-ready (SSR + cache berkala) — isinya
 * statis, jadi cukup di-revalidate sesekali. Seluruh copy & angka dibaca dari
 * `lib/data/landing.ts`; tidak ada string user-facing di JSX.
 */
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
    <main className="relative w-full bg-canvas text-forest">
      <LandingNavbar />
      {/* Provider CTA memegang state sheet pendaftaran + tier terpilih. Anaknya
          tetap Server Component (dioper sebagai `children`), jadi hanya shell
          kecil ini yang menjadi klien. */}
      <LandingCtaProvider>
        <Hero />
        <PainCalculator />
        <WealthGap />
        <SocialProof />
        <PricingSection />
        <FaqSection />
        <LandingFooter />
        <StickyCtaBar />
      </LandingCtaProvider>
    </main>
  )
}

