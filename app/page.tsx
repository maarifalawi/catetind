import type { Metadata } from 'next'
import { LandingFaqLp } from '@/components/landing/lp/faq'
import { LandingFooterLp } from '@/components/landing/lp/footer'
import { LandingHeroLp } from '@/components/landing/lp/hero'
import { LandingMissionLp } from '@/components/landing/lp/mission'
import { LandingNavbarLp } from '@/components/landing/lp/navbar'
import { LandingPricingLp } from '@/components/landing/lp/pricing'
import { LandingPurchaseToasts } from '@/components/landing/lp/purchase-toasts'
import { LandingSectionDivider } from '@/components/landing/lp/section-divider'
import { LandingPainCalculator } from '@/components/landing/pain-calculator'
import {
  LANDING_META,
  LANDING_SECTION_MARKERS,
  LANDING_SOFTWARE_APP,
} from '@/lib/data/landing'

/* ── LANDING PUBLIK `/` ──────────────────────────────────────────────────────
   Landing baru (port Framer yang sekarang memakai Design System CatetInd:
   Earth Pastel + Inter). Section: navbar → hero → kalkulator uang gaib →
   mission → pricing → FAQ → footer. Semua copy + angka dibaca dari
   `lib/data/landing.ts`, `lib/data/pain-calculator.ts`
   / `lib/data/pricing.ts`; tidak ada string user-facing di JSX. Rute preview
   lama sekarang 301 ke sini. */

export const revalidate = 3600

export const metadata: Metadata = {
  title: LANDING_META.title,
  description: LANDING_META.description,
  alternates: { canonical: LANDING_META.ogUrl },
  openGraph: {
    type: 'website',
    locale: LANDING_META.ogLocale,
    siteName: LANDING_META.ogSiteName,
    title: LANDING_META.ogTitle,
    description: LANDING_META.ogDescription,
    url: LANDING_META.ogUrl,
    images: [
      {
        url: LANDING_META.ogImage,
        width: LANDING_META.ogImageWidth,
        height: LANDING_META.ogImageHeight,
        alt: LANDING_META.ogImageAlt,
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: LANDING_META.ogTitle,
    description: LANDING_META.ogDescription,
    images: [LANDING_META.ogImage],
  },
}

/* ── JSON-LD (structured data) ────────────────────────────────────────────────
   Satu blok `SoftwareApplication` untuk halaman `/` saja. Sumbernya
   `LANDING_SOFTWARE_APP` di `lib/data/landing.ts` (harga dibaca dari `PLANS`).

   Kenapa `<script>` dan bukan komponen React biasa: mesin pencari membaca
   JSON mentah dari `<script type="application/ld+json">`, dan React hanya
   mengizinkannya lewat `dangerouslySetInnerHTML`. Aman karena isinya objek
   konstanta dari repo — bukan input pengguna. `<` tetap di-escape menjadi
   `\u003c` supaya mustahil ada teks yang menutup tag lebih awal.

   TIDAK ADA `aggregateRating`: rating bintang hanya boleh dipasang kalau
   benar-benar ada ulasan pengguna yang tersimpan (lihat catatan di
   `lib/data/landing.ts`). */
const SOFTWARE_APP_JSON_LD = JSON.stringify(LANDING_SOFTWARE_APP).replace(/</g, '\\u003c')

export default function LandingPage() {
  return (
    <main id="top" className="w-full bg-canvas font-sans text-forest">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: SOFTWARE_APP_JSON_LD }}
      />
      <LandingNavbarLp />
      <LandingHeroLp />
      <LandingSectionDivider marker={LANDING_SECTION_MARKERS.calculator} />
      <LandingPainCalculator />
      <LandingSectionDivider marker={LANDING_SECTION_MARKERS.mission} />
      <LandingMissionLp />
      <LandingSectionDivider marker={LANDING_SECTION_MARKERS.pricing} />
      <LandingPricingLp />
      <LandingSectionDivider marker={LANDING_SECTION_MARKERS.faq} />
      <LandingFaqLp />
      {/* notifikasi pembelian bergiliran (kanan/kiri bawah) — hanya di landing */}
      <LandingPurchaseToasts />
      <LandingFooterLp />
    </main>
  )
}
