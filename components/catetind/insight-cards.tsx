'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
import {
  ArrowUpRight,
  Coffee,
  PiggyBank,
  Sparkles,
  TrendingUp,
  type LucideIcon,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { INSIGHT_CARD_COPY, type HistoryInsight } from '@/lib/data/history'

/* ── AI Insight Cards (Riwayat & Insight) ────────────────────────────────────
   Deret horizontal yang bisa di-snap. HANYA insight yang angkanya BENAR-BENAR
   bisa dihitung dari catatan user yang dirender (kanon PRD 2A.5 — "jangan
   pernah kasih false insight").

   PAKET 59 · 59.1 — pergeseran tanggung jawabnya penting:

     · komponen ini TIDAK LAGI menyimpan kalimat insight, angka keras
       ("naik 40%", "22%", "45%"), maupun ambangnya. Semua itu pindah ke
       `buildHistoryInsights()` + `INSIGHT_*` di `lib/data/history.ts`;
     · yang tersisa di sini murni tampilan: ikon per jenis insight, warna tone,
       dan tata letaknya;
     · karena angka di `copy` datang dari data user, tidak ada lagi kartu yang
       bisa berbohong walau datanya berubah — kalau tidak bisa dihitung, kartunya
       tidak ada (dan panelnya menampilkan kalimat nurturing dari data). */

const EASE: [number, number, number, number] = [0.22, 1, 0.36, 1]

type Tone = 'alert' | 'good' | 'neutral'

const TONES: Record<Tone, { tile: string; eyebrow: string }> = {
  alert: { tile: 'bg-hud-amber/20 text-hud-terracotta', eyebrow: 'text-hud-terracotta' },
  good: { tile: 'bg-mint/30 text-forest', eyebrow: 'text-forest' },
  neutral: { tile: 'bg-sage/70 text-forest', eyebrow: 'text-forest/70' },
}

/** ikon per jenis insight — bagian dari penyajian, jadi tinggal di sini */
const INSIGHT_ICONS: Record<HistoryInsight['id'], LucideIcon> = {
  'spending-spike': Coffee,
  'savings-rate': PiggyBank,
  'category-trend': TrendingUp,
}

export function InsightCards({ insights }: { insights: HistoryInsight[] }) {
  const header = (
    <div className="flex items-center gap-2.5">
      <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-sage text-forest">
        <Sparkles className="size-[18px]" strokeWidth={2.2} />
      </span>
      <div className="min-w-0">
        <h2 className="font-display text-[15px] font-semibold tracking-tight text-forest">
          {INSIGHT_CARD_COPY.title}
        </h2>
        <p className="text-[11.5px] text-forest/45">
          {insights.length > 0
            ? INSIGHT_CARD_COPY.found(insights.length)
            : INSIGHT_CARD_COPY.waiting}
        </p>
      </div>
    </div>
  )

  /* belum ada satu pun insight yang lolos ambang → kartu nurturing, bukan klaim.
     Tanpa `justify-center` (dulu isinya mengambang di tengah kartu tinggi dan
     menyisakan celah kosong di atas-bawah) — sekarang menempel di atas. */
  if (insights.length === 0) {
    return (
      <section className="flex h-full flex-col rounded-[2rem] bg-cream p-5 shadow-[0_4px_24px_-4px_rgba(0,0,0,0.06)] ring-1 ring-soil/12 sm:p-6">
        {header}
        <p className="mt-3 text-[13px] leading-relaxed text-forest/60">{INSIGHT_CARD_COPY.learning}</p>
      </section>
    )
  }

  return (
    <section className="flex h-full flex-col rounded-[2rem] bg-cream p-5 shadow-[0_4px_24px_-4px_rgba(0,0,0,0.06)] ring-1 ring-soil/12 sm:p-6">
      {header}

      {/* daftar VERTIKAL padat — satu insight satu blok. Dulu deret gulir
          horizontal: dengan 1–3 insight, sisanya jadi ruang kosong di kanan. */}
      <div className="mt-4 flex flex-1 flex-col gap-2.5">
        {insights.map((card, i) => (
          <InsightCardItem key={card.id} card={card} delay={0.06 * i} />
        ))}
      </div>
    </section>
  )
}

function InsightCardItem({
  card,
  delay,
}: {
  card: HistoryInsight
  delay: number
}) {
  const tone = TONES[card.tone]
  const Icon = INSIGHT_ICONS[card.id]

  return (
    <motion.article
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay, ease: EASE }}
      className="flex flex-col gap-2 rounded-[1.4rem] bg-cream/70 p-3.5 ring-1 ring-soil/10"
    >
      {/* baris kepala: ikon + eyebrow + aksi (kalau ada) dalam satu baris padat */}
      <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1.5">
        <span
          className={cn('flex size-7 shrink-0 items-center justify-center rounded-full', tone.tile)}
        >
          <Icon className="size-[15px]" strokeWidth={2.3} />
        </span>
        <span
          className={cn(
            'min-w-0 flex-1 truncate text-[10.5px] font-medium uppercase tracking-[0.14em]',
            tone.eyebrow,
          )}
        >
          {card.eyebrow}
        </span>
        {/* tiap aksi WAJIB punya tujuan (Link) — cabang tombol callback yang
            bisa jatuh ke toast "segera tersedia" sudah dicabut (prompt 24) */}
        {card.actions.map((action, i) => (
          <Link
            key={action.label}
            href={action.href}
            className={cn(
              'inline-flex w-fit shrink-0 items-center gap-1 rounded-full px-3 py-1.5 text-[11.5px] font-medium transition-colors active:scale-[0.97]',
              i === 0
                ? 'bg-forest text-cream hover:bg-forest-soft'
                : 'bg-cream text-forest ring-1 ring-inset ring-forest/20 hover:bg-sage/60',
            )}
          >
            {action.label}
            <ArrowUpRight className="size-3" strokeWidth={2.6} aria-hidden />
          </Link>
        ))}
      </div>

      <p className="text-[13px] font-medium leading-relaxed text-forest/75">{card.copy}</p>
    </motion.article>
  )
}
