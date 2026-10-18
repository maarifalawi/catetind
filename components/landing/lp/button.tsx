import Link from 'next/link'
import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

/* ── TOMBOL LANDING (pill + lingkaran panah di KANAN) ───────────────────────
   Satu bentuk tombol untuk seluruh landing:
     • sm (navbar)  → tinggi 44, teks 14, ikon 36  (size "sm")
     • md (hero)    → tinggi 52, teks 16, ikon 44  (size "md")
   Panah SELALU di kanan dan selalu menunjuk ke kanan; radius pill penuh.
   Hover hanya menggeser panah 2px + mengangkat tombol 1px, dan dimatikan untuk
   `prefers-reduced-motion`. Tidak ada lagi kotak panah besar di kiri. */

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
    button: 'h-11 gap-2.5 rounded-full py-1 pr-1 pl-4',
    icon: 'size-9 rounded-full',
    arrow: 'size-4',
    label: 'text-[14px] leading-[1.5]',
  },
  md: {
    button: 'h-[52px] gap-4 rounded-full py-1 pr-1 pl-6',
    icon: 'size-11 rounded-full',
    arrow: 'size-[18px]',
    label: 'text-[16px] leading-[1.5]',
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
  onClick,
}: {
  href: string
  children: ReactNode
  tone?: Tone
  size?: Size
  className?: string
  onClick?: () => void
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
      <span className={sizeStyle.label}>{children}</span>
      <span
        className={cn(
          'flex shrink-0 items-center justify-center transition-transform duration-200 group-hover:translate-x-0.5 motion-reduce:transition-none',
          toneStyle.icon,
          sizeStyle.icon,
        )}
      >
        <ArrowMark className={sizeStyle.arrow} />
      </span>
    </>
  )

  /* Tautan eksternal (WhatsApp) wajib tab baru + noopener; mailto memakai <a>
     supaya aplikasi email terbuka tanpa router Next. */
  if (href.startsWith('http')) {
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className={classes}
        onClick={onClick}
      >
        {content}
      </a>
    )
  }
  if (href.startsWith('mailto:')) {
    return (
      <a href={href} className={classes} onClick={onClick}>
        {content}
      </a>
    )
  }

  return (
    <Link href={href} className={classes} onClick={onClick}>
      {content}
    </Link>
  )
}
