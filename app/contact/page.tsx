import type { Metadata } from 'next'
import { LandingContactLp } from '@/components/landing/lp/contact'
import { LandingFooterLp } from '@/components/landing/lp/footer'
import { LandingNavbarLp } from '@/components/landing/lp/navbar'
import { SITE_ORIGIN } from '@/lib/site'

/* ── /contact ────────────────────────────────────────────────────────────────
   Halaman publik (daftar di `PUBLIC_ROUTES` + `FOCUS_ROUTES`). Navbar dan
   footer memakai `basePath="/"`: anchor section (#mission, #pricing, #faq,
   #card-1..4) dibuka di landing utama, bukan menunjuk anchor mati di halaman
   ini. Route ini sengaja tipis — isi & copy ada di
   `components/landing/lp/contact*.tsx` dan `LP_CONTACT`. */

export const metadata: Metadata = {
  title: 'Kontak — CatetInd',
  description:
    'Tanya langsung ke tim CatetInd soal fitur, privasi, pembayaran, atau apa pun sebelum mulai nyatet. WhatsApp 0817-7577-7778 atau email halo@catetind.com.',
  alternates: { canonical: `${SITE_ORIGIN}/contact` },
}

export default function ContactPage() {
  return (
    <main className="w-full bg-canvas font-sans text-forest">
      <LandingNavbarLp basePath="/" />
      <LandingContactLp />
      <LandingFooterLp basePath="/" />
    </main>
  )
}
