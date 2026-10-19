import Link from 'next/link'
import { LP_HERO } from '@/lib/data/landing'
import { LandingLiveSubscribers } from './live-subscribers'

/* ── CTA HERO — BENTUK EXPORT FRAMER, WARNA PALET BRAND ──────────────────────
   Struktur mengikuti computed style elemen `.framer-wrtsz5`:
     • badan tombol   h 68 (mobile 48), radius 20 (16), padding 4px 24px 4px 4px,
                      gap 16
     • kotak ikon     56×56 (40×40), radius 16 (12), bg putih, panah 24 (18)
     • label          Inter 18/27 (14), putih, weight 400
     • social proof   5 avatar 36px (28–32) + gap 4, label 14 (12–13) di bawahnya

   REVISI WARNA: badan tombol tidak lagi charcoal `graphite` (di luar palet),
   melainkan Evergreen `forest` + teks `cream`, jadi CTA menyatu dengan warna
   kanon Earth Pastel yang dipakai section lain.

   Susunannya SATU BARIS di semua layar: tombol di kiri, avatar + label di
   kanan. Di mobile blok social mengambil sisa lebar dan avatar yang tidak muat
   dipotong halus dengan fade — sama seperti ticker export. */

function ArrowMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      className={className}
    >
      <path d="M3 12h18M14 5l7 7-7 7" />
    </svg>
  )
}

export function LandingHeroCta() {
  return (
    <div
      id="hero-cta"
      className="mx-auto flex w-full items-center justify-center gap-4 landing-tab:w-fit"
    >
      <Link
        href={LP_HERO.ctaHref}
        className="group inline-flex h-12 shrink-0 items-center gap-2.5 rounded-[16px] bg-forest p-1 pr-4 text-cream transition-transform duration-200 hover:-translate-y-px motion-reduce:transition-none motion-reduce:hover:translate-y-0 landing-tab:h-[68px] landing-tab:gap-4 landing-tab:rounded-[20px] landing-tab:pr-6"
      >
        <span className="flex size-10 shrink-0 items-center justify-center rounded-[12px] bg-canvas text-forest transition-transform duration-200 group-hover:translate-x-0.5 motion-reduce:transition-none landing-tab:size-14 landing-tab:rounded-[16px]">
          <ArrowMark className="size-[18px] landing-tab:size-6" />
        </span>
        <span className="text-[13px] leading-none font-normal max-[380px]:text-[12px] landing-tab:text-[18px]">
          {LP_HERO.ctaLabel}
        </span>
      </Link>

      <div className="min-w-0 flex-1 landing-tab:flex-none">
        <LandingLiveSubscribers />
      </div>
    </div>
  )
}
