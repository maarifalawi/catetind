import type { Metadata } from 'next'
import { LegalShell } from '@/components/catetind/legal-shell'
import { PhoneStage } from '@/components/catetind/phone-stage'
import { TERMS_DOC } from '@/lib/legal/terms'

/**
 * Syarat & Ketentuan (/terms) — inventaris #5, halaman PUBLIK.
 *
 * Isinya bukan teks di JSX: dokumennya ada di `lib/legal/terms.ts` sebagai
 * data, dan `LegalShell` (komponen yang sama dengan `/privacy`) yang
 * menyusunnya. Route ini sengaja tipis — hanya metadata + bingkai. Itu juga
 * sebabnya dokumen ini tidak bisa berbeda desain dari Kebijakan Privasi:
 * keduanya satu shell, satu bentuk data (`LegalDocument`).
 *
 * `PhoneStage plain` — seperti `/login`, `/checkout`, `/privacy`, dan
 * `/share/[id]`: layar fokus tanpa watermark raksasa di latar, karena pada
 * dokumen panjang teks harus jadi satu-satunya yang dibaca mata. Tanpa
 * sidebar, dan `MobileBottomNav` + widget AI Coach menyembunyikan diri di
 * prefix `/terms` — orang boleh membaca syarat ini sebelum punya akun.
 *
 * Tanpa `generateMetadata` dinamis: tidak ada parameter dan tidak ada data per
 * user, jadi judul & deskripsi statis sudah cukup dan halaman bisa dirender
 * penuh di server (lebih ringan, tanpa hydration mismatch).
 */
export const metadata: Metadata = {
  title: 'Syarat & Ketentuan — CatetInd',
  description:
    'Aturan main CatetInd dalam bahasa manusia: batas AI Coach, langganan prabayar tanpa auto-renew, grace period 7 hari, kuota token AI, dan janji bahwa datamu tidak pernah dihapus.',
}

export default function TermsPage() {
  return (
    <PhoneStage plain>
      <LegalShell document={TERMS_DOC} />
    </PhoneStage>
  )
}
