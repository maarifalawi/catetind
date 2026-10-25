/* ── Bahasa visual Onboarding (inventaris #10) ────────────────────────────────
   Satu sumber untuk tipografi & permukaan step onboarding. Arah barunya MODERN
   CLEAN MINIMALIS — karakter huruf gaya Apple/SF Pro. Font SF Pro tidak pernah
   diunduh/di-bundle (lisensi Apple): app memakai FONT SISTEM perangkat, jadi
   perangkat Apple merender San Francisco dan platform lain memakai font sistem
   native-nya. Stack-nya satu untuk seluruh app di app/globals.css.

   1. FONT: heading, subjudul, dan label memakai `font-sans` (font sistem Apple —
      San Francisco di macOS/iOS; stack lengkapnya di app/globals.css).
      `font-display` memakai keluarga yang sama; onboarding tetap menulis
      `font-sans` eksplisit sebagai penanda resepnya. Bobot maksimum semibold +
      tracking negatif tipis memberi kesan headline iOS/macOS (bukan font-black
      berat).
   2. SATU heading besar per layar + satu subjudul. Tanpa emoji raksasa, tanpa
      badge bertumpuk, tanpa bar progres dobel.
   3. SATU warna aksen: forest (CTA & keadaan aktif). Sisanya skala `ink` dengan
      opasitas — supaya layar terasa tenang, bukan pelangi.

   Dipakai oleh: onboarding-flow, onboarding-step-* , onboarding-plant-ceremony. */

import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

/** heading utama step — semibold + tracking negatif (gaya headline iOS/Apple).
    Semibold = bobot maksimum app ini: tidak ada `font-bold` (700) maupun
    `font-black` (900) di mana pun. */
export const ONBOARD_TITLE =
  'font-sans text-[1.9rem] font-semibold leading-[1.1] tracking-normal text-forest sm:text-[2.1rem]'

/** subjudul pengantar — satu-dua kalimat, tanpa emoji */
export const ONBOARD_SUBTITLE =
  'mt-3 max-w-[40ch] text-[15px] leading-relaxed tracking-normal text-forest/50'

/** permukaan kartu standar onboarding: putih + radius besar.
    Ring sengaja TIDAK ikut di sini — setiap pemakaian menulis ringnya sendiri
    (`ring-1 ring-ink/[0.06]`, atau `ring-[1.5px] ring-forest` saat aktif) supaya
    tidak ada dua utility lebar-ring yang bentrok di satu elemen. */
export const ONBOARD_CARD = 'rounded-[1.35rem] bg-cream'

/** label kecil di atas sekelompok kontrol (uppercase, sengaja jauh dari ramai) */
export function OnboardLabel({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <p
      className={cn(
        'text-[11px] font-medium uppercase tracking-[0.16em] text-forest/35',
        className,
      )}
    >
      {children}
    </p>
  )
}

/**
 * Header tiap step.
 * `badge` dipakai untuk menandai isian yang OPSIONAL (mis. pemasukan bulanan)
 * supaya user tidak merasa dipaksa mengisi sesuatu yang belum dia punya.
 */
export function OnboardingStepHeader({
  title,
  subtitle,
  badge,
}: {
  title: string
  subtitle: string
  badge?: string
}) {
  return (
    <header>
      {badge && (
        <span className="mb-3.5 inline-flex items-center rounded-full bg-ink/[0.05] px-2.5 py-1 text-[10.5px] font-medium uppercase tracking-[0.12em] text-forest/40">
          {badge}
        </span>
      )}
      <h1 className={ONBOARD_TITLE}>{title}</h1>
      <p className={ONBOARD_SUBTITLE}>{subtitle}</p>
    </header>
  )
}
