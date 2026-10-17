'use client'

import Link from 'next/link'
import { motion, useReducedMotion } from 'framer-motion'
import { useCallback, useEffect, useRef, useState } from 'react'
import { LP_NAV, LP_NAV_LINKS, lpHref } from '@/lib/data/landing'
import { cn } from '@/lib/utils'
import { LandingButton } from './button'
import { LogoWordmark } from '@/components/catetind/logo-wordmark'
import { LANDING_SPRING } from './reveal'

/* ── NAVBAR LANDING LP ───────────────────────────────────────────────────────
   Perilaku yang disalin dari export Framer:
     • di puncak halaman  → bar transparan, konten menyatu dengan hero;
     • setelah digulir    → bar menjadi pill PUTIH mengambang (radius 24,
                            shadow lembut, turun 12px dari tepi atas);
     • di atas section gelap (`[data-nav-theme="dark"]`, mis. kartu CTA)
                          → pill berubah gelap dan teksnya putih;
     • < 1200px           → link tengah diganti tombol menu.

   KEPUTUSAN LAYERING (Milestone C): header dan panel menu TIDAK pernah
   bertumpuk. Header tetap satu-satunya permukaan dengan logo + tombol tutup;
   panel dimulai 8px DI BAWAH header (`top-[76px]` = 12 margin + 56 tinggi + 8
   jarak), jadi tidak ada dua logo / dua tombol close. Backdrop satu lapis
   (`fixed inset-0`) duduk di bawah panel dan menutup menu saat diklik.

   Fokus: saat menu dibuka fokus pindah ke tautan pertama, Tab berputar di
   dalam panel (tidak bocor ke konten di belakang backdrop), Escape menutup dan
   mengembalikan fokus ke tombol menu. Gulir body dikunci selama menu terbuka.

   `basePath` dipakai halaman /contact: anchor section diarahkan ke `/#…`
   supaya tidak mati. Di landing prop tidak diberikan, jadi href tetap
   `#mission` seperti sebelumnya. */

const NAV_BAND_Y = 40

export function LandingNavbarLp({ basePath = '' }: { basePath?: string }) {
  const [scrolled, setScrolled] = useState(false)
  const [onDark, setOnDark] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const reduceMotion = useReducedMotion()

  const menuButtonRef = useRef<HTMLButtonElement>(null)
  const headerRef = useRef<HTMLElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)
  const firstLinkRef = useRef<HTMLAnchorElement>(null)

  const sync = useCallback(() => {
    setScrolled(window.scrollY > 24)
    const darkSections = document.querySelectorAll<HTMLElement>('[data-nav-theme="dark"]')
    let dark = false
    darkSections.forEach((section) => {
      const rect = section.getBoundingClientRect()
      if (rect.top <= NAV_BAND_Y && rect.bottom >= NAV_BAND_Y) dark = true
    })
    setOnDark(dark)
  }, [])

  useEffect(() => {
    sync()
    window.addEventListener('scroll', sync, { passive: true })
    window.addEventListener('resize', sync)
    return () => {
      window.removeEventListener('scroll', sync)
      window.removeEventListener('resize', sync)
    }
  }, [sync])

  /* Kalau layar melebar sampai desktop, panel mobile tidak boleh tertinggal
     terbuka tanpa tombol penutup yang terlihat. */
  useEffect(() => {
    if (!menuOpen) return
    const onResize = () => {
      if (window.innerWidth >= 1200) setMenuOpen(false)
    }
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [menuOpen])

  /* kunci gulir + fokus awal + Escape + jebakan Tab selama menu terbuka */
  useEffect(() => {
    if (!menuOpen) return

    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    const focusFrame = window.requestAnimationFrame(() => firstLinkRef.current?.focus())

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        setMenuOpen(false)
        menuButtonRef.current?.focus()
        return
      }
      if (event.key !== 'Tab') return

      const panel = panelRef.current
      if (!panel) return

      /* Trap mencakup header (logo + tombol tutup) DAN panel, bukan panel saja:
         tombol tutup harus tetap bisa dijangkau Tab, bukan hanya Escape. */
      const nodes = [
        ...(headerRef.current
          ? headerRef.current.querySelectorAll<HTMLElement>('a[href], button:not([disabled])')
          : []),
        ...panel.querySelectorAll<HTMLElement>('a[href], button:not([disabled])'),
      ].filter((node) => {
        const style = getComputedStyle(node)
        return (
          style.display !== 'none' &&
          style.visibility !== 'hidden' &&
          node.getClientRects().length > 0
        )
      })

      if (nodes.length === 0) return

      const first = nodes[0]
      const last = nodes[nodes.length - 1]
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }

    window.addEventListener('keydown', onKeyDown)
    return () => {
      document.body.style.overflow = previousOverflow
      window.cancelAnimationFrame(focusFrame)
      window.removeEventListener('keydown', onKeyDown)
    }
  }, [menuOpen])

  /* Saat menu terbuka pill selalu terang; state gelap hanya berlaku di halaman */
  const dark = onDark && !menuOpen
  const floating = scrolled || menuOpen

  return (
    <>
      <header ref={headerRef} className="fixed inset-x-0 top-0 z-50 w-full px-5 landing:px-8">
        <motion.div
          initial={reduceMotion ? false : { opacity: 0, y: -80 }}
          animate={{ opacity: 1, y: 0 }}
          transition={LANDING_SPRING}
          className={cn(
            'mx-auto flex h-14 w-full max-w-[1160px] items-center px-3 transition-[background-color,box-shadow,margin,color] duration-300 motion-reduce:transition-none landing:px-7',
            floating
              ? 'mt-3 rounded-[24px] shadow-[0_10px_30px_rgba(0,0,0,0.10)]'
              : 'mt-0 rounded-none shadow-none',
            menuOpen
              ? 'bg-canvas'
              : dark
                ? 'bg-forest/95 text-cream'
                : scrolled
                  ? 'bg-canvas/95 text-forest'
                  : 'bg-transparent text-forest',
          )}
        >
          {/* kiri: logo — lebar kolom tetap 150px di desktop supaya link benar-benar center */}
          <div className="flex h-14 w-[92px] shrink-0 items-center landing:w-[150px]">
            <Link
              href={lpHref(LP_NAV.homeHref, basePath)}
              aria-label={LP_NAV.homeAria}
              className={cn(
                'rounded-[4px] transition-colors focus-visible:outline-none focus-visible:ring-2',
                dark
                  ? 'text-cream focus-visible:ring-cream/70'
                  : 'text-forest focus-visible:ring-forest/40',
              )}
            >
              <LogoWordmark
                tone={dark ? 'light' : 'dark'}
                className="h-5 landing:h-6"
              />
            </Link>
          </div>

          {/* tengah: link (hanya ≥1200px, sama dengan breakpoint desktop Framer) */}
          <nav
            aria-label={LP_NAV.navAria}
            className="hidden flex-1 items-center justify-center gap-10 landing:flex"
          >
            {LP_NAV_LINKS.map((item) => (
              <Link
                key={item.label}
                href={lpHref(item.href, basePath)}
                className={cn(
                  'rounded-[4px] whitespace-nowrap text-[14px] leading-[1.5] transition-colors focus-visible:outline-none focus-visible:ring-2',
                  dark
                    ? 'text-cream/80 hover:text-cream focus-visible:ring-cream/70'
                    : 'text-forest/60 hover:text-forest focus-visible:ring-forest/40',
                )}
              >
                {item.label}
              </Link>
            ))}
          </nav>

          {/* kanan: CTA (desktop) / tombol menu (tablet & mobile) */}
          <div className="flex h-14 flex-1 items-center justify-end landing:w-[150px] landing:flex-none">
            <LandingButton
              href={LP_NAV.ctaHref}
              tone="light"
              size="sm"
              className="hidden landing:inline-flex"
            >
              {LP_NAV.ctaLabel}
            </LandingButton>

            <button
              ref={menuButtonRef}
              type="button"
              aria-label={menuOpen ? LP_NAV.menuCloseAria : LP_NAV.menuAria}
              aria-expanded={menuOpen}
              aria-controls="landing-nav-menu"
              data-landing-menu
              onClick={() => setMenuOpen((value) => !value)}
              className={cn(
                'flex size-10 items-center justify-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 landing:hidden',
                dark
                  ? 'text-cream focus-visible:ring-cream/70'
                  : 'text-forest focus-visible:ring-forest/40',
              )}
            >
              <MenuIcon open={menuOpen} />
            </button>
          </div>
        </motion.div>
      </header>

      {/* panel menu mobile — satu surface tambahan, dimulai DI BAWAH header */}
      {menuOpen && (
        <>
          <button
            type="button"
            aria-label={LP_NAV.menuCloseAria}
            tabIndex={-1}
            onClick={() => setMenuOpen(false)}
            className="fixed inset-0 z-30 cursor-default bg-forest/25"
          />
          <motion.div
            ref={panelRef}
            id="landing-nav-menu"
            role="dialog"
            aria-label={LP_NAV.menuNavAria}
            initial={reduceMotion ? false : { opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={reduceMotion ? { duration: 0 } : { duration: 0.2, ease: 'easeOut' }}
            className="fixed inset-x-0 top-[76px] z-40 px-5 landing:px-10"
          >
            <div className="mx-auto flex w-full max-w-[1200px] flex-col rounded-[24px] bg-canvas px-5 pb-8 pt-5 shadow-[0_18px_50px_rgba(0,0,0,0.16)]">
              <nav
                aria-label={LP_NAV.menuNavAria}
                className="flex flex-col items-center gap-6"
              >
                {LP_NAV_LINKS.map((item, index) => (
                  <Link
                    key={item.label}
                    ref={index === 0 ? firstLinkRef : undefined}
                    href={lpHref(item.href, basePath)}
                    onClick={() => setMenuOpen(false)}
                    className="rounded-[4px] text-[15px] leading-[1.5] text-forest/60 transition-colors hover:text-forest focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-forest/40"
                  >
                    {item.label}
                  </Link>
                ))}
              </nav>

              <div className="mt-6 flex justify-center">
                <LandingButton href={LP_NAV.ctaHref} tone="darkLime" size="md">
                  {LP_NAV.ctaLabel}
                </LandingButton>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </>
  )
}

function MenuIcon({ open }: { open: boolean }) {
  if (open) {
    return (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.6}
        strokeLinecap="round"
        className="size-5"
        aria-hidden
      >
        <path d="M5 5l14 14M19 5L5 19" />
      </svg>
    )
  }
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinecap="round"
      className="size-6"
      aria-hidden
    >
      <path d="M3 9h18M3 15h18" />
    </svg>
  )
}
