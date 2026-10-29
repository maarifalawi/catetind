import {
  BarChart3,
  Heart,
  ScanLine,
} from 'lucide-react'
import { LP_MISSION, type LpMissionCard } from '@/lib/data/landing'
import { cn } from '@/lib/utils'
import { LandingReveal } from './reveal'

/* ── SECTION #mission ────────────────────────────────────────────────────────
   EMPAT kartu (card-1..card-4), statis — bukan 4 × 100vh sticky seperti versi
   lama. Tidak ada sticky/h-screen, jadi tidak mungkin terpotong di layar
   720-800px. Tipografi: judul 24 mobile / 36 desktop, body 16, satu copy untuk
   semua breakpoint (tidak ada duplikasi mobile/desktop).

   GAMBAR: visual tampil PENUH di separuh kartu — tanpa panel latar, tanpa
   padding, tanpa frame tambahan. `h-auto w-full` menjaga rasio aslinya; jangan
   diganti ke `object-cover`/tinggi paksa karena screenshot app-nya terpotong.

   BADGE: anotasi ("Voice & scan", "AI Coach", …) duduk di pojok blok judul,
   bukan menempel di atas gambar — supaya mata membaca konteks dan visualnya
   sebagai satu kesatuan. Caption centang lama sudah dihapus (permintaan
   pemilik produk): judul + satu kalimat penjelas sudah cukup.

   TINGKAT JUDUL (SEO): judul tiap kartu adalah <h2>, bukan <h3>. Satu-satunya
   <h1> halaman ini ada di hero, dan empat fitur utama (voice note, scan struk,
   jatah harian, AI Coach) masing-masing jadi satu <h2> — mesin pencari membaca
   satu topik per blok, bukan satu daftar panjang tanpa judul. Jangan
   diturunkan lagi ke <h3>: itu membuat fitur-fitur utama tidak terbaca sebagai
   bagian dari struktur halaman. Gaya visualnya tetap sama (ukuran diatur
   kelas, bukan oleh tag).

   Aturan data tetap: semua string di `lib/data/landing.ts`. */

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
      className="w-full scroll-mt-24 bg-canvas px-5 py-16 landing-tab:px-10 landing:py-24"
    >
      <div className="mx-auto flex w-full max-w-[1200px] flex-col gap-10 landing-tab:gap-12">
        <div className="flex flex-col items-start gap-6 landing-tab:items-center landing-tab:gap-8">
          <LandingReveal y={24} className="w-full">
            <h2
              id="landing-mission-title"
              className="mx-auto max-w-[860px] text-balance font-display text-[24px] leading-[1.25] font-medium tracking-[-0.03em] text-forest landing-tab:text-center landing-tab:text-[36px] landing:text-[40px]"
            >
              {LP_MISSION.heading}
            </h2>
          </LandingReveal>

          <div aria-hidden className="h-px w-full max-w-[900px] bg-soil/10" />

          <ul className="grid w-full max-w-[900px] grid-cols-1 gap-4 landing-tab:grid-cols-3 landing-tab:gap-6">
            {LP_MISSION.benefits.map((benefit, index) => {
              const Icon = BENEFIT_ICON[benefit.icon]
              return (
                <li key={benefit.title}>
                  <LandingReveal y={24} delay={index * 0.15} className="flex items-center gap-3">
                    <span className="flex size-10 shrink-0 items-center justify-center rounded-[10px] bg-forest text-cream">
                      <Icon className="size-5" strokeWidth={1.75} aria-hidden />
                    </span>
                    <span className="flex min-w-0 flex-col">
                      <span className="text-[16px] leading-[1.5] font-medium text-forest">
                        {benefit.title}
                      </span>
                      <span className="text-[14px] leading-[1.5] text-forest-muted">
                        {benefit.detail}
                      </span>
                    </span>
                  </LandingReveal>
                </li>
              )
            })}
          </ul>
        </div>

        <div id="fitur" className="flex scroll-mt-24 flex-col gap-5 landing-tab:gap-6">
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
      className="group grid scroll-mt-24 overflow-hidden rounded-[28px] bg-canvas ring-1 ring-soil/10 landing-tab:grid-cols-2"
    >
      {/* gambar PENUH: tanpa panel latar dan tanpa padding. Pembatasnya bukan
          ring di atas gambar (ring ganda di sudut membuat stroke terlihat
          menipis), melainkan SATU garis rambut di tepi tempat gambar bertemu
          kolom teks — horizontal di mobile, vertikal di desktop. */}
      <div
        className={cn(
          'relative flex items-center border-b border-soil/10 bg-canvas landing-tab:border-b-0',
          card.imageSide === 'left'
            ? 'landing-tab:order-1 landing-tab:border-r'
            : 'landing-tab:order-2 landing-tab:border-l',
        )}
      >
        <img
          src={card.image}
          alt=""
          width={card.imageWidth}
          height={card.imageHeight}
          loading="lazy"
          decoding="async"
          className="block h-auto w-full transition-transform duration-500 ease-out group-hover:scale-[1.01] motion-reduce:transition-none"
        />
      </div>

      <div
        className={cn(
          'flex flex-col justify-center gap-3 p-6 landing-tab:p-12',
          card.imageSide === 'left' ? 'landing-tab:order-2' : 'landing-tab:order-1',
        )}
      >
        <div className="flex flex-col items-start gap-2.5">
          {/* badge DI ATAS judul besar — penanda konteks, bukan hiasan */}
          <span className="rounded-full bg-sage/70 px-2.5 py-1 text-[11px] leading-[1.5] font-medium text-forest ring-1 ring-inset ring-forest/8">
            {card.annotation}
          </span>
          <h2
            id={`${card.id}-title`}
            className="min-w-0 max-w-[24ch] font-display text-[24px] leading-[1.18] font-medium tracking-[-0.02em] text-forest landing-tab:text-[34px]"
          >
            {card.title}
          </h2>
        </div>
        <p className="max-w-[420px] text-[15px] leading-[1.65] text-forest-muted landing-tab:text-[16px]">
          {card.body}
        </p>
      </div>
    </article>
  )
}
