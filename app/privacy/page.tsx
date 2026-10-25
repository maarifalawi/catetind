import type { Metadata } from 'next'
import { LegalShell } from '@/components/catetind/legal-shell'
import { LandingFooterLp } from '@/components/landing/lp/footer'
import { LandingNavbarLp } from '@/components/landing/lp/navbar'
import { PRIVACY_DOC } from '@/lib/legal/privacy'
import { SITE_ORIGIN } from '@/lib/site'

/**
 * Kebijakan Privasi (/privacy) — inventaris #4, halaman PUBLIK.
 *
 * Isinya bukan teks di JSX: dokumennya ada di `lib/legal/privacy.ts` sebagai
 * data, dan `LegalShell` (dipakai juga oleh `/terms`) yang menyusunnya. Route
 * ini tipis — metadata + rangka halaman landing.
 *
 * SEJAK REDESAIN: halaman memakai navbar + footer landing seperti `/contact`,
 * jadi pembaca dokumen bisa langsung pindah ke Beranda/Harga/FAQ. Anchor
 * navbar diarahkan ke `/#…` lewat `basePath="/"` supaya tidak ada tautan mati
 * di halaman ini. `MobileBottomNav` dan widget AI Coach tetap menyembunyikan
 * diri di prefix `/privacy` (FOCUS_ROUTES) — orang boleh membaca dokumen ini
 * sebelum punya akun, jadi tidak ada navigasi app yang menabraknya.
 *
 * Tanpa `generateMetadata` dinamis: tidak ada parameter, tidak ada data per
 * user. Judul & deskripsi statis sudah cukup, dan halaman jadi bisa dirender
 * penuh di server (lebih ringan, tanpa hydration mismatch).
 */
export const metadata: Metadata = {
  title: 'Kebijakan Privasi | CatetInd',
  description:
    'Data apa yang CatetInd simpan, siapa yang boleh melihatnya (tidak ada admin yang bisa), bagaimana bantuan bekerja tanpa akses data, dan cara kamu mengekspor atau menghapus semuanya.',
  alternates: { canonical: `${SITE_ORIGIN}/privacy` },
}

export default function PrivacyPage() {
  return (
    <main id="top" className="w-full bg-canvas font-sans text-forest">
      <LandingNavbarLp basePath="/" />
      <LegalShell document={PRIVACY_DOC} kind="privacy" />
      <LandingFooterLp basePath="/" />
    </main>
  )
}
