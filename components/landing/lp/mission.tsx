import {
  BarChart3,
  CheckCircle2,
  Heart,
  ScanLine,
} from 'lucide-react'
import { LP_MISSION, type LpMissionCard } from '@/lib/data/landing'
import { cn } from '@/lib/utils'
import { LandingReveal } from './reveal'

/* ── SECTION #mission (About) ────────────────────────────────────────────────
   Angka layout dari export (diukur lewat `inspect.mjs` di 1440/1024/390):

     section        padding 0 40 (desktop), 0 24 (mobile)
     blok heading   min-height 100vh, sticky top 0, isi center, gap 48
                    h2 36/45 (-.03em) desktop, 32 tablet, 28 mobile
     divider        1px `g-mint/10`, max-width 900
     benefit tile   48×48 ikon radius 8 (#45594e), gap 16, judul 18, detail 14
     kartu          100vh sticky (desktop), panel 1200×720 radius 24 padding 8
                    copy 592×704 radius 12 padding 48, judul 56/67.2
     mobile         kartu statis, visual di atas (rasio natural, object-contain)
                    dalam bingkai gradient, eyebrow + nomor urut, judul 26px

   GAMBAR (Milestone C): gambar kartu TIDAK dipotong. Desktop menaruh gambar di
   separuh kartu (sesuai `imageSide`) dengan `object-contain`; mobile memakai
   `w-full h-auto object-contain` tanpa tinggi paksa. `width`/`height` dari
   markup export dipasang supaya ruang gambar sudah dipesan sebelum dimuat.

   Dua varian copy per kartu (desktop & mobile) ada di `lib/data/landing.ts`.
   Di sini teksnya diganti lewat span responsif di dalam SATU <h3>/<p>, bukan
   dua elemen berbeda, supaya tidak ada heading ganda di DOM. */

const BENEFIT_ICON = {
  time: BarChart3,
  ai: ScanLine,
  aware: Heart,
} as const

export function LandingMissionLp() {
  return (
    <section
      id="mission"
      aria-labelledby="landing-mission-title"
      className="relative w-full scroll-mt-24 overflow-clip bg-canvas px-6 landing-tab:px-10"
    >
      <div className="mx-auto flex w-full max-w-[1200px] flex-col gap-8 pt-8 landing-tab:gap-12 landing-tab:pt-[60px]">
        {/* blok heading menempel di layar desktop; kartu-kartu bergulir di atasnya */}
        <div className="relative z-0 flex flex-col items-center gap-6 pt-10 landing-tab:sticky landing-tab:top-0 landing-tab:min-h-screen landing-tab:justify-center landing-tab:gap-12 landing-tab:pt-0">
          <LandingReveal y={24} className="w-full">
            <h2
              id="landing-mission-title"
              className="mx-auto max-w-[720px] text-left font-display text-[28px] leading-[1.25] font-medium tracking-[-0.03em] text-forest landing-tab:text-center landing-tab:text-[32px] landing:text-[36px]"
            >
              {LP_MISSION.heading}
            </h2>
          </LandingReveal>

          <div aria-hidden className="h-px w-full max-w-[900px] bg-soil/10" />

          <ul className="flex w-full max-w-[900px] flex-col gap-5 landing-tab:flex-row landing-tab:items-center landing-tab:justify-between landing-tab:gap-5">
            {LP_MISSION.benefits.map((benefit, index) => {
              const Icon = BENEFIT_ICON[benefit.icon]
              return (
                <li key={benefit.title} className="w-full landing-tab:w-auto landing-tab:flex-1">
                  <LandingReveal y={24} delay={index * 0.2} className="flex items-center gap-4">
                    <span className="flex size-12 shrink-0 items-center justify-center rounded-[8px] bg-forest text-cream">
                      <Icon className="size-6" strokeWidth={1.75} aria-hidden />
                    </span>
                    <span className="flex min-w-0 flex-col">
                      <span className="text-[16px] leading-[1.5] font-medium text-forest landing-tab:text-[18px]">
                        {benefit.title}
                      </span>
                      <span className="text-[14px] leading-[1.5] text-forest/50">
                        {benefit.detail}
                      </span>
                    </span>
                  </LandingReveal>
                </li>
              )
            })}
          </ul>
        </div>

        <div id="fitur" className="relative z-10 flex scroll-mt-24 flex-col gap-4 landing-tab:gap-0">
          {LP_MISSION.cards.map((card) => (
            <MissionCard key={card.id} card={card} />
          ))}
        </div>
      </div>
    </section>
  )
}


function MissionCard({ card }: { card: LpMissionCard }) {
  return (
    <article
      id={card.id}
      aria-labelledby={`${card.id}-title`}
      className="relative flex scroll-mt-24 flex-col landing-tab:sticky landing-tab:top-0 landing-tab:z-10 landing-tab:h-screen landing-tab:items-center landing-tab:justify-center landing-tab:py-16"
    >
      <div className="flex w-full flex-col gap-2 rounded-[22px] bg-canvas p-1.5 shadow-[0_24px_60px_-36px_rgba(69,89,78,0.35)] ring-1 ring-soil/10 landing-tab:h-[720px] landing-tab:max-h-[calc(100vh-160px)] landing-tab:flex-row landing-tab:items-stretch landing-tab:gap-2 landing-tab:rounded-[26px] landing-tab:bg-gradient-to-b landing-tab:from-sage landing-tab:to-sage/70 landing-tab:p-2">
        {/* mobile: foto langsung di dalam kartu, tanpa wrapper/padding tambahan */}
        <img
          src={card.mobile.image}
          alt=""
          width={card.mobile.imageWidth}
          height={card.mobile.imageHeight}
          loading="lazy"
          className="h-auto w-full rounded-[14px] object-contain landing-tab:hidden"
        />

        {/* desktop: gambar menempati separuh kartu, utuh (bukan full-bleed).
            Bingkai gambar tidak dipaksa setinggi panel supaya tidak menyisakan
            blok latar kosong besar di atas/bawah visual. */}
        <div
          className={cn(
            'hidden min-h-0 self-center overflow-hidden rounded-[16px] shadow-[0_24px_48px_-32px_rgba(69,89,78,0.45)] landing-tab:flex landing-tab:h-full landing-tab:w-1/2 landing-tab:items-center landing-tab:justify-center',
            card.imageSide === 'left' ? 'landing-tab:order-1' : 'landing-tab:order-2',
          )}
        >
          <img
            src={card.image}
            alt=""
            width={card.imageWidth}
            height={card.imageHeight}
            loading="lazy"
            className="h-auto max-h-full w-auto max-w-full object-contain"
          />
        </div>

        <div
          className={cn(
            'relative z-10 flex flex-col justify-between gap-3 border-t border-soil/10 bg-canvas p-4 pt-3 landing-tab:w-1/2 landing-tab:gap-9 landing-tab:rounded-[12px] landing-tab:border-t-0 landing-tab:p-12 landing-tab:ring-1 landing-tab:ring-soil/10',
            card.imageSide === 'left' && 'landing-tab:order-2',
          )}
        >
          <div className="flex flex-col gap-2.5 landing-tab:gap-6">
            <LandingReveal y={48}>
              <h3
                id={`${card.id}-title`}
                className="max-w-[455px] font-display text-[26px] leading-[1.18] font-medium tracking-[-0.03em] text-forest landing-tab:text-[48px] landing-tab:leading-[1.2] landing:text-[56px]"
              >
                {/* satu heading, dua copy: yang tampil hanya sesuai breakpoint */}
                <span className="landing-tab:hidden">{card.mobile.title}</span>
                <span className="hidden landing-tab:inline">{card.title}</span>
              </h3>
            </LandingReveal>

            {/* y=24, bukan 72 seperti export: elemen 42px yang digeser 72px
                jatuh di luar clip kartu mobile, sehingga IntersectionObserver
                tidak pernah menganggapnya terlihat dan teksnya tetap opacity 0. */}
            <LandingReveal y={24} delay={0.2}>
              <p className="max-w-[440px] text-[14px] leading-[1.6] text-forest/60">
                <span className="landing-tab:hidden">{card.mobile.body}</span>
                <span className="hidden landing-tab:inline">{card.body}</span>
              </p>
            </LandingReveal>
          </div>

          <div className="hidden items-start gap-2 landing-tab:flex">
            <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-forest/40" aria-hidden />
            <p className="text-[14px] leading-[1.5] text-forest/60">{card.caption}</p>
          </div>
        </div>

      </div>
    </article>
  )
}
