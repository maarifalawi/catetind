/* ── Bahasa visual Onboarding (inventaris #10) ────────────────────────────────
   Satu sumber untuk tipografi & permukaan step onboarding. Arah barunya MODERN
   CLEAN MINIMALIS — karakter huruf gaya Apple/SF Pro. Catatan: font SF Pro
   sendiri sudah TIDAK dipakai lagi (lisensi Apple + hanya jalan di perangkat
   Apple); sistem dua font yang berlaku sekarang ada di app/globals.css.

   1. FONT: heading, subjudul, dan label memakai `font-sans` (Inter variable yang
      sudah dimuat di layout sebagai --font-sans), BUKAN font-display. Inter
      adalah padanan terdekat SF Pro yang tersedia di next/font, jadi tidak ada
      dependensi font baru. Bobot maksimum semibold + tracking negatif tipis
      memberi kesan headline iOS/macOS (bukan font-black berat).
   2. SATU heading besar per layar + satu subjudul. Tanpa emoji raksasa, tanpa
      badge bertumpuk, tanpa bar progres dobel.
   3. SATU warna aksen: forest (CTA & keadaan aktif). Sisanya skala `ink` dengan
      opasitas — supaya layar terasa tenang, bukan pelangi.

   Dipakai oleh: onboarding-flow, onboarding-step-* , onboarding-plant-ceremony. */

import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

/** heading utama step — semibold + tracking negatif (gaya headline iOS/Apple) */
export const ONBOARD_TITLE =
  'font-sans text-[1.9rem] font-semibold leading-[1.1] tracking-[-0.035em] text-ink sm:text-[2.1rem]'

/** subjudul pengantar — satu-dua kalimat, tanpa emoji */
export const ONBOARD_SUBTITLE =
  'mt-3 max-w-[40ch] text-[15px] leading-relaxed tracking-[-0.01em] text-ink/50'

/** permukaan kartu standar onboarding: putih + radius besar.
    Ring sengaja TIDAK ikut di sini — setiap pemakaian menulis ringnya sendiri
    (`ring-1 ring-ink/[0.06]`, atau `ring-[1.5px] ring-forest` saat aktif) supaya
    tidak ada dua utility lebar-ring yang bentrok di satu elemen. */
export const ONBOARD_CARD = 'rounded-[1.35rem] bg-white'

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
        'text-[11px] font-semibold uppercase tracking-[0.16em] text-ink/35',
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
        <span className="mb-3.5 inline-flex items-center rounded-full bg-ink/[0.05] px-2.5 py-1 text-[10.5px] font-semibold uppercase tracking-[0.12em] text-ink/40">
          {badge}
        </span>
      )}
      <h1 className={ONBOARD_TITLE}>{title}</h1>
      <p className={ONBOARD_SUBTITLE}>{subtitle}</p>
    </header>
  )
}
