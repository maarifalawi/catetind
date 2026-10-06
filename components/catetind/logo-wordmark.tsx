import Image from 'next/image'
import { cn } from '@/lib/utils'

/**
 * Wordmark resmi CatetInd — memakai aset `public/Dashboard.png`
 * (890×245, artwork di atas kanvas transparan, rasio ±3.63:1).
 *
 * PAKET 70: asetnya diganti dari `LOGO CATETIND.png` ke `Dashboard.png` atas
 * permintaan pemilik produk. `width`/`height` di bawah WAJIB ikut ukuran aset
 * barunya supaya `next/image` tahu rasio intrinsiknya (repo ini memakai
 * `images.unoptimized: true`, jadi angka ini yang menentukan ukuran kotak
 * sebelum gambar selesai dimuat — salah angka = layout shift).
 *
 * `className` mengatur TINGGI logo (mis. `h-5`, `h-6`); lebarnya otomatis
 * mengikuti rasio aset lewat `w-auto`, jadi jangan pasang `w-*` kecuali
 * memang ingin mendistorsi logo.
 *
 * `tone="light"` untuk permukaan gelap (kartu dompet forest, panel gelap):
 * artwork dibalik jadi putih lewat filter CSS.
 *
 * Catatan: `next.config.mjs` memakai `images.unoptimized: true`, jadi `src`
 * dipakai apa adanya — makanya spasi di nama file di-encode (`%20`).
 */
export function LogoWordmark({
  className,
  tone = 'dark',
}: {
  className?: string
  tone?: 'dark' | 'light'
}) {
  return (
    <Image
      src="/Dashboard.png"
      alt="CatetInd"
      width={890}
      height={245}
      priority
      className={cn(
        'w-auto select-none',
        tone === 'light' && 'brightness-0 invert',
        className,
      )}
    />
  )
}
