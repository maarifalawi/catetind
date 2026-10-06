'use client'

import { usePathname } from 'next/navigation'
import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'
import { useNavAutoHide } from '@/hooks/use-nav-auto-hide'

/* ── MobileStickyHeader — bar atas Dashboard yang mengikuti gulir (PAKET 70) ──
   Permintaan pemilik produk: "header muncul kalau di-scroll ke atas, sembunyi
   kalau di-scroll ke bawah — layaknya navigasi utama". Aturan keputusannya TIDAK
   ditulis ulang di sini: ia memakai hook yang sama dengan nav bawah dulu
   (`useNavAutoHide` → `nextNavAutoHide`, fungsi murni + test di
   `hooks/use-nav-auto-hide.test.ts`). Karena nav bawah sekarang permanen
   (paket 70), hook itu pindah pemakai — satu aturan, satu tempat.

   TIGA HAL YANG SENGAJA DIPAKU:

   1. `sticky top-0` + margin negatif. Header ini anak dari kolom konten
      `ScreenShell` yang punya `px-5 pt-6 sm:px-8`; margin negatif
      (`-mx-5 -mt-6 sm:-mx-8`) membuatnya menempel PENUH ke tepi atas viewport
      waktu halaman digulir, tanpa celah padding di atasnya. Paddingnya
      dikembalikan di kelas yang sama supaya isi header tetap rapi.

   2. LATAR + `backdrop-blur`. Begitu sticky, konten yang lewat di belakangnya
      harus tetap terbaca sebagai "bar" — bukan teks yang saling menumpuk.

   3. `prefers-reduced-motion` dihormati: transisinya `none`. Saat reduced
      motion, header hanya muncul/hilang tanpa gerakan — bukan lompatan.

   Hanya dirender di bawah `lg` (`lg:hidden`): di desktop sudah ada sidebar tetap,
   jadi tidak ada gunanya bar yang naik-turun. */

export function MobileStickyHeader({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  const pathname = usePathname()
  /* `pathname` = kunci reset: tiap pindah halaman header dipaksa tampil lagi,
     bukan mewarisi kondisi "tersembunyi" dari halaman sebelumnya. */
  const hidden = useNavAutoHide(pathname)

  return (
    <header
      /* elemen yang digeser ke luar layar tetap bisa dicapai Tab/Screen Reader
         kalau dibiarkan hidup — `inert` menutup dua-duanya sekaligus */
      inert={hidden}
      className={cn(
        'sticky top-0 z-40 -mx-5 -mt-6 flex items-center justify-between gap-3 px-5 py-3 sm:-mx-8 sm:px-8',
        'bg-canvas/90 backdrop-blur-md lg:hidden',
        'transition-transform duration-300 ease-out motion-reduce:transition-none',
        hidden ? '-translate-y-[calc(100%+1.5rem)]' : 'translate-y-0',
        className,
      )}
    >
      {children}
    </header>
  )
}
