'use client'

import { motion } from 'framer-motion'
import { SinkingFundCard } from './sinking-fund-card'
import { NUDGE_COPY, SOCIAL_PROOF_COPY, type SinkingFundItem } from '@/lib/data/budget'

/* ── ZONA B — Celengan Impian (sinking funds) ────────────────────────────────
   Kartu tanaman yang tumbuh, nudge penyemangat kalau belum setor bulan ini,
   empty state, dan social proof. Semua elemen tambahan hanya muncul saat
   relevan — begitu ada setoran, kartu nudge hilang sendiri.
   ────────────────────────────────────────────────────────────────────────── */

export function BudgetZoneB({
  funds,
  masked,
  currentDay,
  onAddGoal,
  onContribute,
  onOpenFund,
}: {
  funds: SinkingFundItem[]
  masked: boolean
  currentDay: number
  onAddGoal: () => void
  onContribute: (fund: SinkingFundItem) => void
  onOpenFund: (fund: SinkingFundItem) => void
}) {
  /* 6. SOCIAL PROOF & NUDGE — nudge hanya bila belum ada setoran bulan ini
        dan bulan sudah berjalan (bukan di hari-hari pertama, biar tidak nagih) */
  const showNudge =
    funds.length > 0 && currentDay > 5 && funds.every((fund) => !fund.contributedThisMonth)

  return (
    <div className="space-y-4">
      {/* ── nudge lembut — "gapapa, mulai lagi kapan aja" ─────────────────── */}
      {showNudge && (
        <motion.section
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.42, ease: [0.22, 1, 0.36, 1] }}
          className="rounded-[1.5rem] bg-cream p-4 ring-1 ring-soil/5"
        >
          <div className="flex items-start gap-3">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-2xl bg-sage/70 text-[17px]">
              🌿
            </span>
            <div className="min-w-0">
              <p className="text-[12.5px] leading-relaxed text-ink/60">{NUDGE_COPY}</p>
              <button
                type="button"
                onClick={() => onContribute(funds[0])}
                className="mt-2.5 rounded-full bg-forest px-3.5 py-2 text-[12px] font-semibold text-mint transition-colors hover:bg-forest-soft active:scale-95"
              >
                Setor Sekarang
              </button>
            </div>
          </div>
        </motion.section>
      )}

      {/* ── 4A. DAFTAR CELENGAN / 5B. EMPTY STATE ─────────────────────────── */}
      {funds.length === 0 ? (
        <div className="rounded-[1.6rem] border border-dashed border-oat bg-cream/60 px-6 py-9 text-center">
          {/* TODO: add cute empty state illustration */}
          <span className="text-[28px]">🎬🌱</span>
          <p className="mx-auto mt-3 max-w-[19rem] text-[13px] leading-relaxed text-ink/60">
            Belum punya impian yang ditabung? Yuk mulai dari yang simpel — nabung buat nonton
            bioskop juga boleh!
          </p>
          <button
            type="button"
            onClick={onAddGoal}
            className="mt-4 rounded-full bg-forest px-4 py-2.5 text-[12.5px] font-semibold text-cream transition-colors hover:bg-forest-soft active:scale-95"
          >
            Tanam Celengan Pertama
          </button>
        </div>
      ) : (
        <div className="space-y-3.5">
          {funds.map((fund, index) => (
            <motion.div
              key={fund.id}
              layout
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.04 * index, ease: [0.22, 1, 0.36, 1] }}
            >
              <SinkingFundCard
                fund={fund}
                masked={masked}
                onOpen={onOpenFund}
                onContribute={onContribute}
              />
            </motion.div>
          ))}
        </div>
      )}

      {/* ── 4C. TANAM CELENGAN BARU ──────────────────────────────────────── */}
      <button
        type="button"
        onClick={onAddGoal}
        className="flex w-full items-center justify-center gap-2 rounded-[1.4rem] border-2 border-dashed border-oat bg-cream/45 px-4 py-4 text-[12.5px] font-semibold text-ink/45 transition-all hover:border-forest/25 hover:bg-cream hover:text-ink active:scale-[0.99]"
      >
        <span className="text-[15px] leading-none">+</span>
        Tambah Celengan Baru
      </button>

      {/* ── social proof (muted, di paling bawah) ─────────────────────────── */}
      <p className="px-1 text-center text-[11px] leading-relaxed text-ink/35">{SOCIAL_PROOF_COPY}</p>
    </div>
  )
}
