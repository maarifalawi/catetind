import type { Metadata } from 'next'
import { LegalShell } from '@/components/catetind/legal-shell'
import { LandingFooterLp } from '@/components/landing/lp/footer'
import { LandingNavbarLp } from '@/components/landing/lp/navbar'
import { TERMS_DOC } from '@/lib/legal/terms'
import { SITE_ORIGIN } from '@/lib/site'

/**
 * Syarat & Ketentuan (/terms) — inventaris #5, halaman PUBLIK.
 *
 * Isinya bukan teks di JSX: dokumennya ada di `lib/legal/terms.ts` sebagai
 * data, dan `LegalShell` (komponen yang sama dengan `/privacy`) yang
 * menyusunnya. Route ini sengaja tipis — hanya metadata + rangka halaman.
 * Itu juga sebabnya dokumen ini tidak bisa berbeda desain dari Kebijakan
 * Privasi: keduanya satu shell, satu bentuk data (`LegalDocument`).
 *
 * SEJAK REDESAIN: halaman memakai navbar + footer landing seperti `/contact`,
 * jadi pembaca dokumen bisa langsung pindah ke Beranda/Harga/FAQ. Anchor
 * navbar diarahkan ke `/#…` lewat `basePath="/"` supaya tidak ada tautan mati
 * di halaman ini. `MobileBottomNav` + widget AI Coach tetap menyembunyikan
 * diri di prefix `/terms` (FOCUS_ROUTES) — dokumen publik tidak boleh terasa
 * seperti layar app.
 *
 * Tanpa `generateMetadata` dinamis: tidak ada parameter dan tidak ada data per
 * user, jadi judul & deskripsi statis sudah cukup dan halaman bisa dirender
 * penuh di server (lebih ringan, tanpa hydration mismatch).
 */
export const metadata: Metadata = {
  title: 'Syarat & Ketentuan | CatetInd',
  description:
    'Aturan main CatetInd dalam bahasa manusia: batas AI Coach, langganan prabayar tanpa auto-renew, grace period 7 hari, kuota token AI, dan janji bahwa datamu tidak pernah dihapus.',
  alternates: { canonical: `${SITE_ORIGIN}/terms` },
}

export default function TermsPage() {
  return (
    <main id="top" className="w-full bg-canvas font-sans text-forest">
      <LandingNavbarLp basePath="/" />
      <LegalShell document={TERMS_DOC} kind="terms" />
      <LandingFooterLp basePath="/" />
    </main>
  )
}
