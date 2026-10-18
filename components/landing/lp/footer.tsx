import Link from 'next/link'
import { LP_FOOTER, lpHref } from '@/lib/data/landing'

/* ── FOOTER LANDING ──────────────────────────────────────────────────────────
   Permukaan hijau tua (`#1e2c22` → `#243629`) dengan teks putih dan tiga kolom
   menu. Footer ini sengaja TANPA logo/wordmark: hanya nama brand sebagai teks,
   supaya penutup halaman terasa tenang dan tidak mengulang brand mark navbar.

   Struktur semantic: <footer> → <nav aria-labelledby> → <ul> → <li>.

   Tautan:
     · anchor murni (`#…`) memakai <a> supaya Lenis menanganinya sebagai scroll;
     · rute internal memakai <Link>;
     · WhatsApp/Instagram membuka tab baru + `rel="noopener noreferrer"` dan
       diberi keterangan pembaca layar;
     · mailto memakai <a> agar aplikasi email terbuka tanpa router.

   `basePath` dipakai halaman legal/kontak/changelog: anchor section diarahkan
   ke `/#…` supaya tidak mati. `#top` sengaja TIDAK diberi basePath — setiap
   halaman yang memakai footer ini punya `<main id="top">` sendiri, jadi tombol
   "Ke atas" selalu menggulir halaman yang sedang dibaca.

   Target sentuh: semua tautan `min-h-11` (44px). Fokus terlihat di permukaan
   gelap lewat ring emerald. `data-nav-theme="dark"` membuat navbar ikut gelap
   saat melewati footer. */

const FOCUS_RING =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300/60 focus-visible:ring-offset-2 focus-visible:ring-offset-[#1e2c22]'

const LINK_CLASS = `inline-flex min-h-11 items-center rounded-[6px] py-1 text-[14px] leading-[1.5] text-white/80 transition-colors hover:text-emerald-300 ${FOCUS_RING}`

function FooterLink({
  link,
  basePath,
}: {
  link: { label: string; href: string }
  basePath: string
}) {
  const external = link.href.startsWith('http')
  const mail = link.href.startsWith('mailto:')
  const href = link.href === '#top' ? '#top' : lpHref(link.href, basePath)

  if (external) {
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" className={LINK_CLASS}>
        {link.label}
        <span className="sr-only"> ({LP_FOOTER.externalHint})</span>
      </a>
    )
  }

  if (mail) {
    return (
      <a href={href} className={LINK_CLASS}>
        {link.label}
      </a>
    )
  }

  /* anchor murni (termasuk #top) → <a>, bukan router Next */
  if (href.startsWith('#')) {
    return (
      <a href={href} className={LINK_CLASS}>
        {link.label}
      </a>
    )
  }

  return (
    <Link href={href} className={LINK_CLASS}>
      {link.label}
    </Link>
  )
}

export function LandingFooterLp({ basePath = '' }: { basePath?: string }) {
  const homeHref = lpHref('#hero', basePath)

  return (
    <footer
      data-nav-theme="dark"
      className="relative w-full overflow-hidden bg-[#1e2c22] bg-[radial-gradient(120%_90%_at_50%_0%,#243629_0%,#1e2c22_58%,#18251d_100%)] text-white"
    >
      <div className="mx-auto w-full max-w-[1200px] px-5 pt-16 landing-tab:px-10 landing-tab:pt-20 landing:pt-24">
        {/* ── GRID: brand + tiga kolom menu ─────────────────────────────────── */}
        <div className="grid grid-cols-1 gap-10 landing-tab:grid-cols-3 landing-tab:gap-x-10 landing-tab:gap-y-12 landing:grid-cols-[minmax(0,1.55fr)_minmax(0,0.85fr)_minmax(0,1.1fr)_minmax(0,0.9fr)] landing:gap-12">
          {/* brand & disclaimer — tanpa logo/wordmark */}
          <div className="landing-tab:col-span-3 landing:col-span-1">
            <Link
              href={homeHref}
              aria-label={LP_FOOTER.brand.homeLabel}
              className={`inline-flex min-h-11 items-center rounded-[8px] text-[19px] leading-none font-semibold tracking-[-0.02em] text-white ${FOCUS_RING}`}
            >
              {LP_FOOTER.brand.name}
            </Link>

            <p className="mt-5 max-w-[36ch] text-[14px] leading-[1.65] text-emerald-100/60">
              {LP_FOOTER.brand.tagline}
            </p>

            <p className="mt-5 max-w-[44ch] text-[11.5px] leading-[1.6] text-emerald-100/55">
              {LP_FOOTER.brand.disclaimer}
            </p>
          </div>

          {/* tiga kolom menu */}
          {LP_FOOTER.columns.map((column, index) => (
            <nav
              key={column.title}
              aria-labelledby={`footer-column-${index}`}
              className="min-w-0"
            >
              <h2
                id={`footer-column-${index}`}
                className="text-[11px] leading-[1.5] font-medium tracking-[0.18em] text-emerald-100/55 uppercase"
              >
                {column.title}
              </h2>
              <ul className="mt-3 flex flex-col">
                {column.links.map((link) => (
                  <li key={`${column.title}-${link.label}`}>
                    <FooterLink link={link} basePath={basePath} />
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>

        {/* ── BOTTOM BAR ────────────────────────────────────────────────────── */}
        <div className="mt-14 border-t border-white/10 landing:mt-20">
          <div className="flex flex-col gap-4 py-6">
            <p className="mx-auto text-center text-[12.5px] leading-[1.6] text-emerald-100/70">
              {LP_FOOTER.copyright}
            </p>
          </div>
        </div>
      </div>
    </footer>
  )
}

