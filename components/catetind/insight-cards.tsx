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

/* ── AI Insight Cards (Riwayat & Insight) ────────────────────────────────────
   Deret horizontal yang bisa di-snap. HANYA insight yang ambang datanya sudah
   terpenuhi yang dirender — kanon PRD Domain 2A.5 ("jangan pernah kasih false
   insight"): kalau datanya belum cukup, lebih baik tidak muncul sama sekali
   daripada mengklaim sesuatu yang belum benar.

   Ambang tiap kartu diukur dari TOTAL transaksi yang sudah dicatat user
   (mock 24 transaksi → ketiganya lolos):
   - Spending Spike  : >= 5 transaksi (baseline 1 minggu)
   - Savings Rate    : >= 10 transaksi + minimal 1 pemasukan
   - Category Trend  : >= 7 transaksi

   COPY masih narasi AI mock (angka 40% / 22% / 45% menyusul dari backend). */

const EASE: [number, number, number, number] = [0.22, 1, 0.36, 1]

type Tone = 'alert' | 'good' | 'neutral'

const TONES: Record<Tone, { tile: string; eyebrow: string }> = {
  alert: { tile: 'bg-hud-amber/20 text-hud-terracotta', eyebrow: 'text-hud-terracotta' },
  good: { tile: 'bg-mint/30 text-forest', eyebrow: 'text-forest' },
  neutral: { tile: 'bg-sage/70 text-forest', eyebrow: 'text-forest/70' },
}

interface InsightAction {
  label: string
  /** kalau diisi, tombol jadi navigasi ke fitur internal (cross-sell) */
  href?: string
}

interface InsightCard {
  id: string
  icon: LucideIcon
  eyebrow: string
  copy: string
  tone: Tone
  /** tombol aksi di dalam kartu (opsional) — insight tanpa CTA = dead-end,
   *  jadi kartu pujian (Savings Rate) wajib punya jalan keluar ke fitur lain */
  actions?: InsightAction[]
  /** ambang total transaksi supaya kartu boleh tampil */
  threshold: number
  /** perlu minimal satu transaksi pemasukan (khusus Savings Rate) */
  needsIncome?: boolean
}

const INSIGHT_CARDS: InsightCard[] = [
  {
    id: 'spending-spike',
    icon: Coffee,
    eyebrow: 'Spending Spike',
    copy: 'Pengeluaran Kopi minggu ini naik 40% dari minggu lalu ☕',
    tone: 'alert',
    actions: [{ label: 'Atur Limit Kopi' }],
    threshold: 5,
  },
  {
    id: 'savings-rate',
    icon: PiggyBank,
    eyebrow: 'Savings Rate',
    copy: 'Kamu berhasil sisihkan 22% dari pemasukan bulan ini! 🌿',
    tone: 'good',
    /* CTA nyata: pujian tanpa tindak lanjut adalah dead-end — arahkan ke
       fitur internal yang paling relevan (retensi + cross-sell). */
    actions: [
      { label: 'Alokasikan ke Sinking Fund', href: '/budget' },
      { label: 'Simpan di Reksadana', href: '/wealth' },
    ],
    threshold: 10,
    needsIncome: true,
  },
  {
    id: 'category-trend',
    icon: TrendingUp,
    eyebrow: 'Category Trend',
    copy: 'Kategori terbesar bulan ini: Makanan (45% dari total pengeluaran)',
    tone: 'neutral',
    threshold: 7,
  },
]

export function InsightCards({
  totalTransactions,
  hasIncome,
  onAction,
}: {
  /** jumlah transaksi user (dipakai sebagai gate ambang data) */
  totalTransactions: number
  /** true kalau sudah ada minimal 1 transaksi pemasukan */
  hasIncome: boolean
  /** aksi tombol kecil di kartu (mis. "Atur Limit Kopi") */
  onAction?: (cardId: string, label: string) => void
}) {
  const visible = INSIGHT_CARDS.filter(
    (card) => totalTransactions >= card.threshold && (!card.needsIncome || hasIncome),
  )

  const header = (
    <div className="flex items-center justify-between gap-3">
      <div className="flex items-center gap-2.5">
        <span className="flex size-9 items-center justify-center rounded-full bg-sage text-forest">
          <Sparkles className="size-[18px]" strokeWidth={2.2} />
        </span>
        <div>
          <h2 className="font-display text-[15px] font-bold tracking-tight text-ink">Insight AI</h2>
          <p className="text-[11.5px] text-ink/45">
            {visible.length > 0 ? `${visible.length} temuan` : 'Menunggu data'}
          </p>
        </div>
      </div>
    </div>
  )

  /* belum ada satu pun insight yang lolos ambang → kartu nurturing, bukan klaim */
  if (visible.length === 0) {
    return (
      <section className="flex h-full flex-col justify-center rounded-[2rem] bg-cream p-5 shadow-[0_4px_24px_-4px_rgba(80,58,58,0.06)] ring-1 ring-soil/5 sm:p-6">
        {header}
        <p className="mt-3 text-[13px] leading-relaxed text-ink/60">
          Aku masih belajar polamu. Terus catat ya 📊
        </p>
      </section>
    )
  }

  return (
    <section className="flex h-full flex-col rounded-[2rem] bg-cream p-5 shadow-[0_4px_24px_-4px_rgba(80,58,58,0.06)] ring-1 ring-soil/5 sm:p-6">
      {header}

      {/* deret horizontal: snap per kartu, scrollbar disembunyikan */}
      <div className="hide-scrollbar -mx-5 mt-3 flex snap-x snap-mandatory gap-3 overflow-x-auto px-5 pb-1 sm:-mx-6 sm:px-6">
        {visible.map((card, i) => (
          <InsightCardItem key={card.id} card={card} delay={0.08 * i} onAction={onAction} />
        ))}
      </div>
    </section>
  )
}

function InsightCardItem({
  card,
  delay,
  onAction,
}: {
  card: InsightCard
  delay: number
  onAction?: (cardId: string, label: string) => void
}) {
  const tone = TONES[card.tone]
  const Icon = card.icon

  return (
    <motion.article
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, delay, ease: EASE }}
      className="flex min-w-[260px] max-w-[320px] shrink-0 snap-start flex-col gap-3 rounded-[1.6rem] bg-cream/70 p-4 ring-1 ring-soil/[0.05] sm:min-w-[280px]"
    >
      <div className="flex items-center gap-2.5">
        <span
          className={cn('flex size-8 shrink-0 items-center justify-center rounded-full', tone.tile)}
        >
          <Icon className="size-4" strokeWidth={2.3} />
        </span>
        <span className={cn('text-[10.5px] font-bold uppercase tracking-[0.14em]', tone.eyebrow)}>
          {card.eyebrow}
        </span>
      </div>

      <p className="text-[13px] font-medium leading-relaxed text-ink/75">{card.copy}</p>

      {card.actions && card.actions.length > 0 && (
        <div className="mt-auto flex flex-wrap items-center gap-2">
          {card.actions.map((action, i) =>
            action.href ? (
              <Link
                key={action.label}
                href={action.href}
                className={cn(
                  'inline-flex w-fit items-center gap-1 rounded-full px-3 py-1.5 text-[11.5px] font-semibold transition-colors active:scale-[0.97]',
                  i === 0
                    ? 'bg-forest text-cream hover:bg-forest-soft'
                    : 'bg-cream text-forest ring-1 ring-inset ring-forest/20 hover:bg-sage/60',
                )}
              >
                {action.label}
                <ArrowUpRight className="size-3" strokeWidth={2.6} aria-hidden />
              </Link>
            ) : (
              <button
                key={action.label}
                type="button"
                onClick={() => onAction?.(card.id, action.label)}
                className="inline-flex w-fit items-center gap-1 rounded-full bg-forest px-3 py-1.5 text-[11.5px] font-semibold text-cream transition-colors hover:bg-forest-soft active:scale-[0.97]"
              >
                {action.label}
              </button>
            ),
          )}
        </div>
      )}
    </motion.article>
  )
}
