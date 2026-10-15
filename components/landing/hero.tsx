import { ChevronDown } from 'lucide-react'
import { HERO_COPY, HERO_DEVICE_ARIA } from '@/lib/data/landing'
import { HeroDevice } from './hero-device'

/* ── SECTION 1 · HOOK (above the fold) ──────────────────────────────────────
   Nol CTA, nol harga, nol daftar fitur — satu tujuan saja: bikin pengunjung
   berhenti dan bertanya ke dirinya sendiri. Visualnya ADEGAN "ponsel di
   tangan": layar Home CatetInd di dalam bingkai iPhone yang digenggam, dengan
   kartu-kartu kaca melayang di sekitarnya (`hero-device.tsx`) — jadi
   pengunjung melihat barang yang akan ia pakai, bukan ilustrasi yang perlu
   dijelaskan. Adegan itu ILUSTRASI antarmuka, jadi isinya `aria-hidden` dan
   diringkas sekali di `HERO_DEVICE_ARIA`. Penanda gulir di bawah membuat rasa
   penasaran menuju Section 2. */
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

        {/* ── adegan "ponsel di tangan" — layar Home app + kartu melayang ── */}
        <HeroDevice />
      </div>

      <p className="sr-only">{HERO_DEVICE_ARIA}</p>

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
