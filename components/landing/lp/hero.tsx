import { LP_HERO } from '@/lib/data/landing'
import { LandingButton } from './button'
import { LandingReveal } from './reveal'

/* ── HERO LANDING ────────────────────────────────────────────────────────────
   Port dari export Framer, tapi IDENTITAS VISUALNYA sekarang Design System
   CatetInd (Earth Pastel + Inter): latar putih (`bg-canvas`), teks `forest`,
   aksen Sage/Mint/Daisy. Paritas piksel Framer sudah ditinggalkan.

   Susunan:
     section        bg-canvas, padding 0 20 (40 tablet+)
     blok teks      max-w 1200, item center, gap 48
     pill eyebrow   bg-canvas + ring halus, ikon 24
     h1             40/56/64px — Inter tidak perlu 88px agar 3 baris rapi
     sub            16/18, max-w 540
     CTA            tombol gelap + marquee avatar
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
            <h1 className="mx-auto max-w-[460px] text-center font-display text-[40px] leading-[1.12] font-medium tracking-[-0.03em] text-forest landing-tab:max-w-[620px] landing-tab:text-[56px] landing:max-w-[720px] landing:text-[64px]">
              {LP_HERO.headlineBefore}
              <em className="italic">{LP_HERO.headlineEmphasis}</em>
              {LP_HERO.headlineAfter}
            </h1>
          </LandingReveal>

          <LandingReveal y={72} delay={0.4} trigger="load" className="w-full">
            <p className="mx-auto max-w-[480px] text-balance text-center text-[16px] leading-[1.5] text-forest/60 landing-tab:text-[18px] landing:max-w-[540px]">
              {LP_HERO.subheadline}
            </p>
          </LandingReveal>
        </LandingReveal>

        {/* CTA + social proof */}
        <LandingReveal y={96} delay={0.6} trigger="load" className="w-full">
          <div className="flex flex-col items-center justify-center gap-4 sm:flex-row sm:gap-6">
            <LandingButton href={LP_HERO.ctaHref} tone="dark" size="md">
              {LP_HERO.ctaLabel}
            </LandingButton>

            <AvatarMarquee />
          </div>
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
          <source media="(min-width: 1200px)" srcSet={LP_HERO.boardImage} />
          <img
            src={LP_HERO.phoneImage}
            alt={LP_HERO.visualAlt}
            loading="eager"
            fetchPriority="high"
            className="mx-auto w-[333px] max-w-full object-contain landing:mx-0 landing:max-h-[840px] landing:w-full"
          />
        </picture>
      </LandingReveal>
    </section>
  )
}


/* ── MARQUEE AVATAR ──────────────────────────────────────────────────────────
   Lima avatar diduplikasi 2× lalu digeser kanan→kiri 20 detik linear. Mask
   kiri/kanan membuat avatar “masuk/keluar” tanpa garis potong; hover & fokus
   menghentikan animasi, dan `motion-reduce:animate-none` mematikan gerak untuk
   yang meminta gerak minimal. Teks social proof tetap statis & terbaca SR. */
function AvatarMarquee() {
  const avatars = [...LP_HERO.avatars, ...LP_HERO.avatars]

  return (
    <div className="group flex flex-col items-center gap-1 sm:items-start">
      <div
        tabIndex={0}
        role="group"
        aria-label={LP_HERO.avatarsAria}
        className="landing-marquee-mask w-[180px] overflow-hidden rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-forest/40"
      >
        <ul
          aria-hidden
          className="flex w-max animate-landing-marquee items-center motion-reduce:animate-none group-hover:[animation-play-state:paused] group-focus-within:[animation-play-state:paused]"
        >
          {avatars.map((src, index) => (
            <li key={`${src}-${index}`} className="pr-2">
              <img
                src={src}
                alt=""
                width={35}
                height={35}
                loading="eager"
                className="size-[35px] rounded-full border-2 border-canvas object-cover"
              />
            </li>
          ))}
        </ul>
      </div>
      <p className="text-[14px] leading-[1.5] text-forest/40">{LP_HERO.socialProof}</p>
    </div>
  )
}
