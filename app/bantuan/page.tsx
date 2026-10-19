import type { Metadata } from 'next'
import { LandingFooterLp } from '@/components/landing/lp/footer'
import { LandingPublicHelp } from '@/components/landing/lp/help-center'
import { LandingNavbarLp } from '@/components/landing/lp/navbar'
import { PUBLIC_HELP_COPY, PUBLIC_HELP_PATH } from '@/lib/data/help'
import { SITE_ORIGIN } from '@/lib/site'

/* ── /bantuan — PUSAT BANTUAN PUBLIK (pre-app) ────────────────────────────────
   Halaman ini BUKAN halaman app: tanpa `ScreenShell`, tanpa sidebar, tanpa
   bottom-nav (lihat `FOCUS_ROUTES` di `components/MobileBottomNav.tsx`), dan
   tanpa satu pun data keuangan. Tujuannya satu: pengunjung yang belum masuk
   (termasuk yang menekan "Emailmu nggak ketemu? Kabarin kami di Pusat
   Bantuan" di `/login`) tetap bisa mencari jawaban & menghubungi kami TANPA
   dibawa masuk ke dashboard.

   Pusat Bantuan versi app tetap di `/help` dan WAJIB login — `/help` tidak
   pernah masuk `PUBLIC_ROUTES`. Halaman ini juga terdaftar di
   `PUBLIC_ROUTES` supaya ketiga gerbang global (sesi, langganan, kunci PIN)
   melewatinya.

   Navbar & footer memakai `basePath="/"`: anchor section (#faq, #pricing, …)
   dibuka di landing utama, bukan menunjuk anchor mati di halaman ini. */

export const metadata: Metadata = {
  title: 'Pusat Bantuan — CatetInd',
  description: PUBLIC_HELP_COPY.description,
  alternates: { canonical: `${SITE_ORIGIN}${PUBLIC_HELP_PATH}` },
}

export default function PublicHelpPage() {
  return (
    <main id="top" className="w-full bg-canvas font-sans text-forest">
      <LandingNavbarLp basePath="/" />
      <LandingPublicHelp />
      <LandingFooterLp basePath="/" />
    </main>
  )
}
