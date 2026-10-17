import Link from 'next/link'
import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

/* ── TOMBOL LANDING (pill + kotak ikon panah) ────────────────────────────────
   Satu bentuk tombol dipakai tiga tempat di export Framer:
     • navbar  → putih, tinggi 44, teks 14px, radius 12  (size "sm", tone "light")
     • hero    → gelap, tinggi 60, teks 18px, radius 20  (size "md", tone "dark")
     • CTA     → lime,  tinggi 60, teks 18px, radius 20  (size "md", tone "lime")
   Strukturnya sama: kotak ikon panah di KIRI (Framer memakai panah kustom
   `M 0 7 L 18 7 M 18 7 L 11 0 M 18 7 L 11 14`), lalu label. Panah itu ditulis
   ulang sebagai path SVG di sini supaya bentuknya identik tapi tetap ringan.

   Hover di Framer mengubah variant (kotak ikon melebar). Di sini versinya
   dijaga sederhana — panah bergeser sedikit + tombol naik 1px — dan dimatikan
   untuk `prefers-reduced-motion`. */

type Tone = 'dark' | 'light' | 'lime' | 'darkLime'
type Size = 'sm' | 'md'

const TONE: Record<Tone, { button: string; icon: string }> = {
  dark: { button: 'bg-forest text-cream', icon: 'bg-canvas text-forest' },
  light: { button: 'bg-canvas text-forest', icon: 'bg-sage/60 text-forest' },
  lime: { button: 'bg-daisy text-forest', icon: 'bg-forest text-cream' },
  /* CTA di menu mobile: badan gelap + kotak ikon lime (variant "L Mobile" Framer) */
  darkLime: { button: 'bg-forest text-cream', icon: 'bg-daisy text-forest' },
}

const SIZE: Record<Size, { button: string; icon: string; arrow: string; label: string }> = {
  sm: {
    button: 'gap-4 rounded-[12px] p-0.5 pr-5',
    icon: 'size-8 rounded-[10px]',
    arrow: 'size-4',
    label: 'text-[14px] leading-[1.5]',
  },
  md: {
    button: 'gap-4 rounded-[20px] p-1 pr-6',
    icon: 'size-14 rounded-[16px]',
    arrow: 'size-6',
    label: 'text-[16px] leading-[1.5] md:text-[18px]',
  },
}

function ArrowMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      className={className}
    >
      <path d="M3 12h18M14 5l7 7-7 7" />
    </svg>
  )
}

export function LandingButton({
  href,
  children,
  tone = 'dark',
  size = 'md',
  className,
}: {
  href: string
  children: ReactNode
  tone?: Tone
  size?: Size
  className?: string
}) {
  const toneStyle = TONE[tone]
  const sizeStyle = SIZE[size]
  const classes = cn(
    'group inline-flex select-none items-center whitespace-nowrap font-normal transition-transform duration-200 hover:-translate-y-px motion-reduce:transition-none motion-reduce:hover:translate-y-0',
    toneStyle.button,
    sizeStyle.button,
    className,
  )
  const content = (
    <>
      <span
        className={cn(
          'flex shrink-0 items-center justify-center transition-transform duration-200 group-hover:translate-x-0.5 motion-reduce:transition-none',
          toneStyle.icon,
          sizeStyle.icon,
        )}
      >
        <ArrowMark className={sizeStyle.arrow} />
      </span>
      <span className={sizeStyle.label}>{children}</span>
    </>
  )

  /* Tautan eksternal (WhatsApp) wajib tab baru + noopener; mailto memakai <a>
     supaya aplikasi email terbuka tanpa router Next. */
  if (href.startsWith('http')) {
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" className={classes}>
        {content}
      </a>
    )
  }
  if (href.startsWith('mailto:')) {
    return (
      <a href={href} className={classes}>
        {content}
      </a>
    )
  }

  return (
    <Link href={href} className={classes}>
      {content}
    </Link>
  )
}
