import Link from 'next/link'
import { Leaf } from 'lucide-react'
import { LP_FOOTER, lpHref } from '@/lib/data/landing'
import { cn } from '@/lib/utils'

/* ── FOOTER LANDING ──────────────────────────────────────────────────────────
   Penutup halaman versi ringan: satu panel besar bertinta sage → putih, sudut
   sangat lembut, dan tiga kolom tautan yang tenang. Warna gelap lama
   (`#1e2c22`) dihapus — footer ini memakai palet kanon yang sama dengan kartu
   landing (canvas/sage/mint/forest), jadi tidak terasa seperti blok terpisah
   yang ditempel di bawah halaman.

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
   terang lewat ring forest. Footer ini TIDAK lagi `data-nav-theme="dark"`,
   karena permukaannya terang — navbar tidak perlu berubah warna di atasnya.
   ────────────────────────────────────────────────────────────────────────── */

const FOCUS_RING =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-forest/30 focus-visible:ring-offset-2 focus-visible:ring-offset-canvas'

const LINK_CLASS = `-mx-2 inline-flex min-h-11 items-center rounded-xl px-2 py-1 text-[13.5px] leading-[1.5] text-forest-muted transition-colors duration-200 hover:bg-cream/80 hover:text-forest motion-reduce:transition-none ${FOCUS_RING}`

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
    <footer className="w-full bg-canvas px-4 pt-14 pb-6 landing-tab:px-8 landing-tab:pt-20 landing:px-10 landing:pb-8">
      <div className="mx-auto w-full max-w-[1200px]">
        <div className="relative overflow-hidden rounded-[30px] bg-gradient-to-br from-mint-soft/45 via-sage/30 to-cream px-6 py-9 ring-1 ring-soil/[0.06] shadow-landing-soft landing-tab:px-10 landing-tab:py-12 landing:rounded-[36px] landing:px-14">
          {/* aksen lembut — dekorasi saja, tidak menutupi teks */}
          <div
            aria-hidden
            className="pointer-events-none absolute -top-24 right-0 size-64 rounded-full bg-mint/15 blur-3xl"
          />
          <div
            aria-hidden
            className="pointer-events-none absolute -bottom-28 left-1/4 size-56 rounded-full bg-cantelope/10 blur-3xl"
          />

          <div className="relative grid grid-cols-1 gap-10 landing-tab:grid-cols-[minmax(0,1fr)_auto] landing-tab:gap-14">
            {/* brand & disclaimer */}
            <div className="max-w-[44ch]">
              <Link
                href={homeHref}
                aria-label={LP_FOOTER.brand.homeLabel}
                className={`inline-flex min-h-11 items-center gap-2.5 rounded-full text-[18px] leading-none font-semibold tracking-[-0.02em] text-forest ${FOCUS_RING}`}
              >
                <span className="flex size-8 items-center justify-center rounded-full bg-forest text-cream">
                  <Leaf className="size-4" strokeWidth={2} aria-hidden />
                </span>
                {LP_FOOTER.brand.name}
              </Link>

              <p className="mt-4 max-w-[36ch] text-[13.5px] leading-[1.7] text-forest-muted">
                {LP_FOOTER.brand.tagline}
              </p>

              <p className="mt-4 max-w-[46ch] text-[11px] leading-[1.7] text-forest-muted">
                {LP_FOOTER.brand.disclaimer}
              </p>

              <p className="mt-5 inline-flex items-center gap-2 rounded-full bg-cream/70 px-3 py-1.5 text-[11px] font-medium text-forest-muted ring-1 ring-soil/[0.05]">
                <span className="size-1.5 rounded-full bg-mint" aria-hidden />
                {LP_FOOTER.madeIn}
              </p>
            </div>

            {/* tiga kolom menu — judul kecil, tautan lapang */}
            <div className="grid grid-cols-2 gap-x-8 gap-y-7 landing-tab:grid-cols-3 landing:gap-x-12">
              {LP_FOOTER.columns.map((column, index) => (
                <nav
                  key={column.title}
                  aria-labelledby={`footer-column-${index}`}
                  className={cn(
                    'min-w-0',
                    /* Legal memakai lebar penuh di mobile, lalu tautannya dibagi
                       dua kolom — jadi tidak ada sel kosong di sebelah kanan. */
                    index === 2 && 'col-span-2 landing-tab:col-span-1',
                  )}
                >
                  <h2
                    id={`footer-column-${index}`}
                    className="text-[10.5px] leading-[1.5] font-medium tracking-[0.18em] text-forest-muted uppercase"
                  >
                    {column.title}
                  </h2>
                  <ul
                    className={cn(
                      'mt-2',
                      index === 2
                        ? 'grid grid-cols-2 gap-x-4 landing-tab:grid-cols-1'
                        : 'flex flex-col',
                    )}
                  >
                    {column.links.map((link) => (
                      <li key={`${column.title}-${link.label}`}>
                        <FooterLink link={link} basePath={basePath} />
                      </li>
                    ))}
                  </ul>
                </nav>
              ))}
            </div>
          </div>

          {/* bottom bar — satu garis tipis, tanpa kotak tambahan */}
          <div className="relative mt-9 border-t border-soil/[0.07] pt-5">
            <p className="text-[11.5px] leading-[1.6] text-forest-muted">
              {LP_FOOTER.copyright}
            </p>
          </div>
        </div>
      </div>
    </footer>
  )
}

