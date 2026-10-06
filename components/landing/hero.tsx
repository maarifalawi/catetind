import { ChevronDown } from 'lucide-react'
import { PlantIllustration } from '@/components/catetind/plant-illustration'
import { HERO_COPY, HERO_HUD } from '@/lib/data/landing'

/* ── SECTION 1 · HOOK (above the fold) ──────────────────────────────────────
   Nol CTA, nol harga, nol daftar fitur — satu tujuan saja: bikin pengunjung
   berhenti dan bertanya ke dirinya sendiri. Visualnya mockup HUD jatah harian
   + tanaman kecil (ILUSTRASI antarmuka, jadi `aria-hidden`; isinya diringkas di
   teks `sr-only`). Penanda gulir di bawah membuat rasa penasaran menuju
   Section 2. */
export function Hero() {
  return (
    <section
      aria-labelledby="landing-hero-title"
      className="relative isolate overflow-hidden pt-28 pb-10 sm:pt-32 lg:pt-36 lg:pb-16"
    >
      {/* cahaya lembut di latar — tetap di palet kanon (hijau + kuning pop) */}
      <div
        aria-hidden
        className="pointer-events-none absolute -top-32 -right-24 size-[420px] rounded-full bg-mint/25 blur-[130px]"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute top-1/2 -left-28 size-[340px] rounded-full bg-brand/15 blur-[130px]"
      />

      <div className="relative mx-auto grid w-full max-w-[1120px] grid-cols-1 items-center gap-10 px-5 sm:px-6 lg:grid-cols-2 lg:gap-12 lg:px-8">
        {/* ── teks hook ── */}
        <div>
          <h1
            id="landing-hero-title"
            className="font-display text-[2.15rem] leading-[1.1] font-medium tracking-tight text-forest sm:text-[2.9rem] lg:text-[3.4rem]"
          >
            {HERO_COPY.headline}
          </h1>
          <p className="mt-5 max-w-xl text-base leading-relaxed text-forest/60 sm:text-lg">
            {HERO_COPY.subheadline}
          </p>
        </div>

        {/* ── ilustrasi mockup app (HUD jatah harian + tanaman) ── */}
        <div className="relative mx-auto w-full max-w-[380px]">
          <div aria-hidden className="relative">
            <div className="rounded-[2rem] bg-cream p-4 shadow-[0_40px_80px_-40px_rgba(69,89,78,0.5)] ring-1 ring-soil/12">
              <div className="rounded-[1.5rem] bg-gradient-to-br from-forest-soft via-forest to-[#1f2823] p-4 text-cream">
                <p className="text-[10.5px] font-medium tracking-[0.16em] text-cream/60 uppercase">
                  {HERO_HUD.eyebrow}
                </p>
                <p className="mt-1 font-display text-3xl font-medium tracking-tight tabular-nums">
                  {HERO_HUD.amount}
                </p>
                <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-cream/15">
                  <div
                    className="h-full rounded-full bg-mint"
                    style={{ width: `${Math.round(HERO_HUD.progress * 100)}%` }}
                  />
                </div>
                <p className="mt-2 text-[12px] font-medium text-mint">{HERO_HUD.note}</p>
              </div>

              <div className="mt-3 flex items-center gap-3 rounded-[1.5rem] bg-sage/55 px-4 py-3 ring-1 ring-soil/8">
                <span className="w-11 shrink-0">
                  <PlantIllustration stage={2} />
                </span>
                <p className="text-[12.5px] leading-snug font-medium text-forest/70">
                  {HERO_HUD.plantLabel}
                </p>
              </div>
            </div>
          </div>
          <p className="sr-only">
            Ilustrasi aplikasi CatetInd menampilkan jatah harian {HERO_HUD.amount} dan tanaman
            yang tumbuh.
          </p>
        </div>
      </div>

      {/* ── penanda gulir — bikin penasaran ke Section 2 ── */}
      <div className="relative mt-12 flex justify-center lg:mt-14">
        <a
          href="#pain-calculator"
          aria-label={HERO_COPY.scrollAria}
          className="group flex flex-col items-center gap-2 rounded-2xl px-4 py-2 text-center"
        >
          <span className="text-[12.5px] font-medium text-forest/55 transition-colors group-hover:text-forest/80">
            {HERO_COPY.scrollHint}
          </span>
          <ChevronDown
            className="size-5 text-forest motion-safe:animate-bounce"
            strokeWidth={2.4}
            aria-hidden
          />
        </a>
      </div>
    </section>
  )
}
