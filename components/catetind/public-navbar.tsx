'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { PUBLIC_NAV } from '@/lib/data/public-nav'
import { LogoWordmark } from './logo-wordmark'

/* ── NAVBAR PUBLIK — "di luar sistem" ────────────────────────────────────────
   Ini navbar SITUS, bukan navigasi APP. Halaman publik/pre-app sengaja tidak
   memakai sidebar desktop & bottom-nav mobile (menawarkan menu berisi data
   keuangan ke pengunjung yang belum punya akun = membingungkan). Yang dipakai
   sebagai gantinya adalah bar ini: logo + tujuan ringkas + pintu masuk akun —
   SATU komponen, dipakai semua halaman publik supaya navigasinya konsisten.

   Sumber isi ada di `lib/data/public-nav.ts` (komponen ini nol string). */
export function PublicNavbar() {
  const pathname = usePathname()

  return (
    <header className="sticky top-0 z-50 border-b border-soil/10 bg-canvas/85 backdrop-blur-md">
      <div className="mx-auto flex h-16 w-full max-w-[1120px] items-center justify-between gap-3 px-5 sm:px-6 lg:px-8">
        {/* logo → halaman depan publik */}
        <Link
          href={PUBLIC_NAV.homeHref}
          aria-label={`CatetInd — ${PUBLIC_NAV.homeLabel}`}
          className="flex shrink-0 items-center"
        >
          <LogoWordmark className="h-5 lg:h-6" />
        </Link>

        <nav aria-label="Navigasi situs" className="flex items-center gap-1 sm:gap-1.5">
          {/* tujuan ringkas — disembunyikan di layar kecil supaya navbar tetap lega */}
          {PUBLIC_NAV.links.map((link) => {
            const active = pathname === link.href || pathname.startsWith(`${link.href}/`)
            return (
              <Link
                key={link.href}
                href={link.href}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'hidden rounded-full px-3.5 py-2 text-[13px] font-medium transition-colors duration-200 motion-reduce:transition-none md:inline-flex',
                  active ? 'bg-sage text-forest' : 'text-forest/60 hover:bg-sage/60 hover:text-forest',
                )}
              >
                {link.label}
              </Link>
            )
          })}

          <Link
            href={PUBLIC_NAV.loginHref}
            aria-current={pathname === PUBLIC_NAV.loginHref ? 'page' : undefined}
            className="rounded-full px-3 py-2 text-[13px] font-medium text-forest/70 transition-colors duration-200 hover:text-forest motion-reduce:transition-none"
          >
            {PUBLIC_NAV.loginLabel}
          </Link>
          <Link
            href={PUBLIC_NAV.ctaHref}
            className="rounded-full bg-forest px-4 py-2 text-[13px] font-medium text-cream shadow-[0_12px_26px_-16px_rgba(69,89,78,0.9)] transition-colors duration-200 hover:bg-forest-soft active:scale-[0.98] motion-reduce:transition-none"
          >
            {PUBLIC_NAV.ctaLabel}
          </Link>
        </nav>
      </div>
    </header>
  )
}
