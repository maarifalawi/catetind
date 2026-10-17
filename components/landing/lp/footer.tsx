import Link from 'next/link'
import { LP_FOOTER, lpHref } from '@/lib/data/landing'
import { LogoWordmark } from '@/components/catetind/logo-wordmark'
import { LandingButton } from './button'
import { LandingMarkBadge } from './marks'

/* ── CTA + FOOTER LANDING ────────────────────────────────────────────────────
   1. KARTU CTA GELAP — section putih, kartu radius 36 dengan `bg-forest`,
      judul `text-cream`, tombol `bg-daisy text-forest`, lalu UI shot dengan
      perspektif + mask. Ditandai `data-nav-theme="dark"` supaya navbar ikut
      berubah gelap saat melewatinya.
   2. FOOTER — permukaan gelap `bg-forest`, teks `cream`, 4 kolom link +
      wordmark "Catet" yang sengaja terpotong tepi bawah. Nomor WhatsApp dan
      email ada di kolom Perusahaan (satu sumber: `LP_FOOTER`). */

const CTA_SHOT = '/landing/ecsvVHaKUpgixFh7HmsoZYYI.png'

const FOOTER_LINK_CLASS =
  'rounded-[2px] text-cream/60 underline-offset-4 transition-colors hover:text-cream hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cream/60 motion-reduce:transition-none'

export function LandingFooterLp({ basePath = '' }: { basePath?: string }) {
  return (
    <>
      <section
        data-nav-theme="dark"
        aria-labelledby="landing-cta-title"
        className="flex w-full justify-center bg-canvas px-4"
      >
        <div className="flex w-full flex-col items-center rounded-[36px] bg-gradient-to-b from-forest to-forest-soft px-5 pt-[80px] landing-tab:px-5 landing-tab:pt-[96px] landing:px-6 landing:pt-[120px]">
          <div className="flex w-full max-w-[1200px] flex-col items-center gap-10 landing:gap-[60px]">
            <div className="flex flex-col items-center">
              <LandingMarkBadge className="h-14 w-[58px] text-cream" />
              <h2
                id="landing-cta-title"
                className="mt-4 max-w-[720px] text-center font-display text-[40px] leading-[1.15] font-medium tracking-[-0.03em] text-cream landing-tab:text-[52px] landing:text-[64px]"
              >
                {LP_FOOTER.cta.title}
              </h2>
              <p className="mt-4 max-w-[540px] text-center text-[16px] leading-[1.5] text-cream/80 landing-tab:text-[18px]">
                {LP_FOOTER.cta.body}
              </p>
              <LandingButton href={LP_FOOTER.cta.href} tone="lime" size="md" className="mt-14">
                {LP_FOOTER.cta.button}
              </LandingButton>
            </div>

            {/* UI shot: gambar penuh + perspektif, dipudarkan ke bawah oleh mask */}
            <div
              className="flex h-[253px] w-full items-start justify-center overflow-hidden px-1 pt-1 landing-tab:h-[420px] landing-tab:px-3 landing-tab:pt-3 landing:h-[600px]"
              style={{
                maskImage: 'linear-gradient(#000 0%, transparent 100%)',
                WebkitMaskImage: 'linear-gradient(#000 0%, transparent 100%)',
              }}
            >
              <img
                src={CTA_SHOT}
                alt=""
                aria-hidden
                loading="lazy"
                className="w-full rounded-t-2xl shadow-[0_0_0_4px_rgba(255,255,255,0.25)] landing:shadow-[0_0_0_12px_rgba(255,255,255,0.25)]"
                style={{
                  transform: 'perspective(1200px) translateY(66px) rotateX(8deg)',
                  transformOrigin: 'center top',
                }}
              />
            </div>
          </div>
        </div>
      </section>

      <footer className="overflow-hidden bg-forest px-5 text-cream landing-tab:px-6 landing:px-10">
        <div className="mx-auto flex w-full max-w-[1200px] flex-col gap-9 pt-12 landing:flex-row landing:gap-12 landing:pt-[72px]">
          {/* kolom kiri — mark di atas, copyright di dasar (mobile: paling bawah) */}
          <div className="order-3 flex w-full flex-col justify-between gap-6 landing:order-1 landing:w-[384px] landing:flex-none">
            <LandingMarkBadge className="hidden h-14 w-[58px] text-cream landing:block" />
            <div className="flex w-full justify-center rounded-t-2xl bg-evergreen-deeper px-6 py-4">
              <p className="text-center text-[14px] leading-[1.5] text-cream/80">
                {LP_FOOTER.copyright}
              </p>
            </div>
          </div>

          {/* kolom kanan — link + wordmark (urutan dibalik di desktop) */}
          <div className="order-2 flex min-w-0 flex-1 flex-col gap-9 landing:gap-20">
            <div className="order-1 landing:order-2">
              <div className="flex items-center landing:h-[182px]">
                <LogoWordmark
                  tone="light"
                  className="h-[96px] w-auto opacity-25 landing:h-[182px]"
                />
              </div>
            </div>

            <div className="relative z-10 order-2 flex flex-wrap gap-x-12 gap-y-9 landing:order-1">
              {LP_FOOTER.columns.map((column) => (
                <div key={column.title} className="flex min-w-[144px] flex-1 flex-col gap-4">
                  <p className="text-[18px] leading-[1.5] text-cream/60">{column.title}</p>
                  <ul className="flex flex-col gap-2 text-[14px] leading-[1.5]">
                    {column.links.map((link) => (
                      <li key={`${column.title}-${link.label}`}>
                        {link.href.startsWith('http') ? (
                          <a
                            href={link.href}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={FOOTER_LINK_CLASS}
                          >
                            {link.label}
                          </a>
                        ) : link.href.startsWith('mailto:') ? (
                          <a href={link.href} className={FOOTER_LINK_CLASS}>
                            {link.label}
                          </a>
                        ) : (
                          <Link href={lpHref(link.href, basePath)} className={FOOTER_LINK_CLASS}>
                            {link.label}
                          </Link>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        </div>
      </footer>
    </>
  )
}

