import Image from 'next/image'
import { cn } from '@/lib/utils'

/**
 * Wordmark resmi CatetInd — memakai aset `public/LOGO CATETIND.png`
 * (1779×490, artwork hitam di atas kanvas transparan, rasio ±3.63:1).
 *
 * `className` mengatur TINGGI logo (mis. `h-5`, `h-6`); lebarnya otomatis
 * mengikuti rasio aset lewat `w-auto`, jadi jangan pasang `w-*` kecuali
 * memang ingin mendistorsi logo.
 *
 * `tone="light"` untuk permukaan gelap (kartu dompet forest, panel gelap):
 * artwork hitam dibalik jadi putih lewat filter CSS.
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
      src="/LOGO%20CATETIND.png"
      alt="CatetInd"
      width={1779}
      height={490}
      priority
      className={cn(
        'w-auto select-none',
        tone === 'light' && 'brightness-0 invert',
        className,
      )}
    />
  )
}
