import type { Metadata } from 'next'
import { PaletteScreen } from '@/components/catetind/palette-screen'
import { PhoneStage } from '@/components/catetind/phone-stage'

/* ── /palette — halaman REVIEW DESAIN (bukan fitur user) ──────────────────────
   Tipis sesuai konvensi repo: `metadata` + bungkus screen di `PhoneStage`.
   Isinya ada di `components/catetind/palette-screen.tsx` dan datanya di
   `lib/data/palette.ts`. */

export const metadata: Metadata = {
  title: 'Palet Warna — CatetInd',
  description:
    'Referensi visual palet kanon "Earth Pastel": sepuluh warna, alias semantik, nilai turunan, dan maknanya — untuk review desain.',
  /* halaman internal: jangan diindeks mesin pencari */
  robots: { index: false, follow: false },
}

export default function PalettePage() {
  return (
    <PhoneStage>
      <PaletteScreen />
    </PhoneStage>
  )
}
