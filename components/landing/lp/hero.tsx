import { LP_HERO } from '@/lib/data/landing'
import { LandingHeroCta } from './hero-cta'
import { LandingReveal } from './reveal'

/* ── HERO LANDING ────────────────────────────────────────────────────────────
   Port dari export Framer dengan Design System CatetInd (Earth Pastel + Inter):
   latar putih (`bg-canvas`), teks `forest`, aksen Sage/Mint/Daisy.
   CTA hero mempertahankan BENTUK export Framer (kotak panah putih + avatar
   ticker) tapi warnanya memakai palet brand Evergreen, bukan charcoal; lihat
   `hero-cta.tsx` untuk nilai-nilai yang diambil dari computed style.

   Susunan:
     section        bg-canvas, padding 0 20 (40 tablet+)
     blok teks      max-w 1200, item center, gap 48
     pill eyebrow   bg-canvas + ring halus, ikon 24
     h1             40/56/64px — "males" semibold + italic, tanpa latar highlight
     sub            16/18, max-w 540
     CTA dock       tombol brand + label publik 1.000+ + 5 avatar lokal, sejajar
     visual         1200×840 object-contain (mobile: layar ponsel)

   Animasi stagger tetap memakai `LandingReveal` (data framer/appear). */

export function LandingHeroLp() {
  return (
    <section
      id="hero"
      className="relative flex w-full flex-col items-center overflow-hidden bg-canvas px-5 landing-tab:px-10"
    >
      {/* aksen lembut Earth Pastel — glow dekoratif, bukan permukaan besar */}
      <div
        aria-hidden
        className="pointer-events-none absolute -top-40 left-1/2 z-0 size-[520px] -translate-x-1/2 rounded-full bg-mint/20 blur-[140px]"
      />


      {/* blok teks */}
      <div className="relative z-10 flex w-full max-w-[1200px] flex-col items-center gap-6 pt-[120px] pb-[60px] landing-tab:gap-12 landing:pt-[180px]">
        <LandingReveal y={48} delay={0} trigger="load" className="flex w-full flex-col items-center gap-4">
          <LandingReveal y={24} delay={0} trigger="load" className="inline-flex">
            <span className="inline-flex items-center gap-2 rounded-full bg-canvas py-0.5 pr-4 pl-0.5 ring-1 ring-soil/10">
              <span className="flex size-6 items-center justify-center rounded-full bg-sage">
                <svg
                  viewBox="0 0 24 24"
                  className="size-4 text-forest"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={1.5}
                  strokeLinecap="round"
                  aria-hidden
                >
                  <path d="M8.25 6h12M8.25 12h12M8.25 18h12" />
                  <circle cx="4.125" cy="6" r="1.125" fill="currentColor" stroke="none" />
                  <circle cx="4.125" cy="12" r="1.125" fill="currentColor" stroke="none" />
                  <circle cx="4.125" cy="18" r="1.125" fill="currentColor" stroke="none" />
                </svg>
              </span>
              <span className="text-[14px] leading-[1.5] text-forest">{LP_HERO.eyebrow}</span>
            </span>
          </LandingReveal>

          <LandingReveal y={48} delay={0.2} trigger="load" className="w-full">
            <h1 className="mx-auto max-w-[560px] text-balance text-center font-display text-[40px] leading-[1.12] font-medium tracking-[-0.03em] text-forest landing-tab:max-w-[820px] landing-tab:text-[56px] landing:max-w-[900px] landing:text-[64px]">
              {LP_HERO.headlineBefore}
              {/* jangkar visual: "males" lebih tebal + italic saja, TANPA
                  sapuan/latar highlight di belakangnya. */}
              <em className="font-semibold italic">{LP_HERO.headlineEmphasis}</em>
              {LP_HERO.headlineAfter}
            </h1>
          </LandingReveal>

          <LandingReveal y={72} delay={0.4} trigger="load" className="w-full">
            <p className="mx-auto max-w-[480px] text-balance text-center text-[16px] leading-[1.5] text-forest-muted landing:max-w-[540px]">
              {LP_HERO.subheadline}
            </p>
          </LandingReveal>
        </LandingReveal>

        {/* CTA + bukti sosial — SATU BARIS di semua layar, komposisinya persis
            export Framer: tombol brand + kotak panah putih di kiri, lalu lima
            avatar dan label di kanan. */}
        <LandingReveal y={80} delay={0.6} trigger="load" className="w-full">
          <LandingHeroCta />
        </LandingReveal>
      </div>

      {/* visual: desktop board / mobile layar ponsel.
          `<picture>` + `source media` dipakai supaya mobile TIDAK mengunduh
          GAMBARDEPAN.png (display:none tetap mengunduh gambar di <img> biasa). */}
      <LandingReveal
        y={128}
        delay={0.6}
        scale={0.9}
        trigger="load"
        className="relative z-10 flex min-h-[520px] w-full max-w-[1200px] items-center justify-center landing-tab:min-h-[840px]"
      >
        <picture>
          <source
            media="(min-width: 1200px)"
            type="image/webp"
            srcSet={LP_HERO.boardImageWebp}
          />
          <source media="(min-width: 1200px)" srcSet={LP_HERO.boardImage} />
          <source type="image/webp" srcSet={LP_HERO.phoneImageWebp} />
          <img
            src={LP_HERO.phoneImage}
            alt={LP_HERO.visualAlt}
            width={LP_HERO.phoneWidth}
            height={LP_HERO.phoneHeight}
            loading="eager"
            fetchPriority="high"
            decoding="async"
            className="mx-auto h-auto w-[333px] max-w-full object-contain landing:mx-0 landing:max-h-[840px] landing:w-full"
          />
        </picture>
      </LandingReveal>
    </section>
  )
}
