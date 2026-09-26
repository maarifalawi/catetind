import type { Metadata } from 'next'
import { LegalShell } from '@/components/catetind/legal-shell'
import { PhoneStage } from '@/components/catetind/phone-stage'
import { PRIVACY_DOC } from '@/lib/legal/privacy'

/**
 * Kebijakan Privasi (/privacy) — inventaris #4, halaman PUBLIK.
 *
 * Isinya bukan teks di JSX: dokumennya ada di `lib/legal/privacy.ts` sebagai
 * data, dan `LegalShell` (dipakai juga oleh `/terms` di prompt 13) yang
 * menyusunnya. Route ini sengaja tipis — hanya metadata + bingkai.
 *
 * `PhoneStage plain` — seperti `/login`, `/checkout`, dan `/share/[id]`: layar
 * fokus tanpa watermark raksasa di latar (dokumen panjang: teks harus jadi
 * satu-satunya yang dibaca mata), TANPA sidebar. `MobileBottomNav` dan widget
 * AI Coach menyembunyikan diri di prefix `/privacy` — orang boleh membaca
 * dokumen ini sebelum punya akun, jadi tidak ada navigasi app yang menabraknya.
 *
 * Tanpa `generateMetadata` dinamis: tidak ada parameter, tidak ada data per
 * user. Judul & deskripsi statis sudah cukup, dan halaman jadi bisa dirender
 * penuh di server (lebih ringan, tanpa hydration mismatch).
 */
export const metadata: Metadata = {
  title: 'Kebijakan Privasi — CatetInd',
  description:
    'Data apa yang CatetInd simpan, siapa yang boleh melihatnya (tidak ada admin yang bisa), bagaimana bantuan bekerja tanpa akses data, dan cara kamu mengekspor atau menghapus semuanya.',
}

export default function PrivacyPage() {
  return (
    <PhoneStage plain>
      <LegalShell document={PRIVACY_DOC} />
    </PhoneStage>
  )
}
