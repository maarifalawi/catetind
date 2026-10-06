import Link from 'next/link'
import { LogoWordmark } from '@/components/catetind/logo-wordmark'
import { FOOTER_COPY } from '@/lib/data/landing'

/* ── FOOTER LANDING ──────────────────────────────────────────────────────────
   Logo + tautan legal + kontak + hak cipta. Server Component murni (tanpa
   state), jadi tidak menambah JS ke bundle halaman. */
export function LandingFooter() {
  return (
    <footer className="border-t border-soil/10 bg-canvas">
      <div className="mx-auto w-full max-w-[1120px] px-5 py-10 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <LogoWordmark className="h-6" />
            <p className="mt-3 max-w-xs text-[12.5px] leading-relaxed text-forest/50">
              {FOOTER_COPY.tagline}
            </p>
          </div>

          <nav
            aria-label="Tautan footer"
            className="flex flex-col items-start gap-2 text-[12.5px] sm:items-end"
          >
            {FOOTER_COPY.links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="text-forest/60 transition-colors hover:text-forest motion-reduce:transition-none"
              >
                {link.label}
              </Link>
            ))}
            <a
              href={`mailto:${FOOTER_COPY.contact}`}
              className="text-forest/60 transition-colors hover:text-forest motion-reduce:transition-none"
            >
              {FOOTER_COPY.contactLabel} · {FOOTER_COPY.contact}
            </a>
          </nav>
        </div>

        <div className="mt-8 flex flex-col gap-1.5 border-t border-soil/8 pt-5 text-[11.5px] text-forest/40 sm:flex-row sm:items-center sm:justify-between">
          <p>{FOOTER_COPY.legal}</p>
          <p>{FOOTER_COPY.madeIn}</p>
        </div>
      </div>
    </footer>
  )
}
