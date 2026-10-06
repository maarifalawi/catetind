'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import { LogoWordmark } from '@/components/catetind/logo-wordmark'
import { LANDING_NAV } from '@/lib/data/landing'

/* ── NAVBAR LANDING (fixed) ──────────────────────────────────────────────────
   Transparan saat halaman di puncak (biar hero terasa satu lembar), lalu
   mendapat latar lembut + hairline setelah digulir. `fixed` (bukan `sticky`)
   supaya hero benar-benar tergambar di BELAKANG bar — sesuai "transparent on
   top". Isi navbar minim: logo (kiri) + tombol "Masuk" gaya ghost (kanan). */
export function LandingNavbar() {
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <header
      className={cn(
        'fixed inset-x-0 top-0 z-50 transition-colors duration-300 motion-reduce:transition-none',
        scrolled
          ? 'border-b border-soil/10 bg-canvas/85 backdrop-blur-md'
          : 'border-b border-transparent bg-transparent',
      )}
    >
      <div className="mx-auto flex h-16 w-full max-w-[1120px] items-center justify-between gap-3 px-5 sm:px-6 lg:px-8">
        <Link
          href={LANDING_NAV.homeHref}
          aria-label={LANDING_NAV.homeLabel}
          className="flex shrink-0 items-center"
        >
          <LogoWordmark className="h-5 lg:h-6" />
        </Link>

        <Link
          href={LANDING_NAV.loginHref}
          className="rounded-full border border-soil/20 px-4 py-2 text-[13px] font-medium text-forest/80 transition-colors duration-200 hover:border-forest/40 hover:bg-sage/50 hover:text-forest motion-reduce:transition-none"
        >
          {LANDING_NAV.loginLabel}
        </Link>
      </div>
    </header>
  )
}
