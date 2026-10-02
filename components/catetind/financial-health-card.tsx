'use client'

import { motion } from 'framer-motion'
import { Activity, Sparkles } from 'lucide-react'
import { TransactionBottomSheet } from '@/components/dashboard/transaction-bottom-sheet'
import {
  HEALTH_CARD_COPY,
  HEALTH_SCORE_THRESHOLD,
  healthCardState,
  healthScoreBand,
} from '@/lib/data/history'
import { cn } from '@/lib/utils'

/* ── Kalibrasi Profil AI → Skor Kewarasan Finansial (hero Riwayat & Insight) ─
   Tiga wujud, dipisah oleh DATA — bukan oleh konstanta:

   · `calibrating` — catatan belum mencapai ambang PRD 2A.5 (30). Yang diukur di
     sini adalah seberapa banyak data AI Coach punya untuk mengenali pola user,
     BUKAN kesehatan finansial (audit vanity-metric: menghitung jumlah catatan
     tidak boleh dijual sebagai "Kewarasan Finansial").
   · `no-income`   — catatan sudah cukup, tapi belum ada pemasukan sama sekali;
     tanpa pembagi, rasio pemasukan vs pengeluaran tidak bisa dihitung. Dulu
     keadaan ini ditutupi skor 72 karangan.
   · `ready`       — skor BENAR-BENAR dihitung dari catatan user
     (`financialHealthScore()`), lengkap dengan rasio yang jadi dasarnya.

   PAKET 59 · 59.1: `HEALTH_SCORE = 72` tidak ada lagi. Tidak ada satu pun angka
   di kartu ini yang tidak berasal dari catatan user — dan kalau angkanya belum
   bisa dihitung, yang muncul penjelasan, bukan angka contoh.

   Keadaan `empty` (0 catatan) SENGAJA tidak dirender di sini: halaman yang
   menggantinya dengan empty state jujur (`HISTORY_NO_DATA_COPY`) — kartu ini
   tidak "menyembunyikan diri" diam-diam, ia memang tidak punya apa pun untuk
   dikatakan saat belum ada satu catatan pun. */

const EASE: [number, number, number, number] = [0.22, 1, 0.36, 1]

/* geometri gauge: busur setengah lingkaran + pathLength=100 supaya progres
   cukup dihitung sekali (offset 100 → 100 − skor) */
const SIZE = 208
const STROKE = 17
const RADIUS = (SIZE - STROKE) / 2
const CENTER = SIZE / 2
const ARC = `M ${CENTER - RADIUS} ${CENTER} A ${RADIUS} ${RADIUS} 0 0 1 ${CENTER + RADIUS} ${CENTER}`
const TICKS = [0, 25, 50, 75, 100]

export function FinancialHealthCard({
  totalTransactions,
  score,
  savingsRate,
}: {
  /** jumlah transaksi NYATA user (`countHistoryTransactions`) */
  totalTransactions: number
  /** skor 0–100 hasil `financialHealthScore()`; `null` = belum bisa dihitung */
  score: number | null
  /** rasio sisih dalam persen — dipakai kalimat hasil supaya angkanya nyata */
  savingsRate: number | null
}) {
  const state = healthCardState({ totalTransactions, score })

  /* 0 catatan: halaman yang menampilkan empty state (lihat catatan di atas) */
  if (state === 'empty') return null

  const ready = state === 'ready'
  const title = ready ? HEALTH_CARD_COPY.readyTitle : HEALTH_CARD_COPY.calibratingTitle
  const subtitle = ready ? HEALTH_CARD_COPY.readySubtitle : HEALTH_CARD_COPY.calibratingSubtitle

  return (
    <section className="flex h-full flex-col rounded-[2rem] bg-cream p-5 shadow-[0_4px_24px_-4px_rgba(0,0,0,0.06)] ring-1 ring-soil/12 sm:p-6">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <span className="flex size-9 items-center justify-center rounded-full bg-sage text-forest">
            <Activity className="size-[18px]" strokeWidth={2.2} />
          </span>
          <div>
            <h2 className="font-display text-[15px] font-bold tracking-tight text-ink">{title}</h2>
            <p className="text-[11.5px] text-ink/45">{subtitle}</p>
          </div>
        </div>
        <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-cream px-2.5 py-1 text-[10.5px] font-semibold uppercase tracking-[0.1em] text-ink/45 ring-1 ring-soil/12">
          <Sparkles className="size-3 text-forest" strokeWidth={2.4} />
          {ready ? HEALTH_CARD_COPY.badgeAi : HEALTH_CARD_COPY.badgeCoach}
        </span>
      </div>

      {state === 'ready' && score !== null ? (
        <ScoreGauge score={score} rate={savingsRate ?? 0} />
      ) : state === 'no-income' ? (
        <NoIncomeBlock />
      ) : (
        <UnlockProgress total={totalTransactions} />
      )}
    </section>
  )
}

/** Varian A — gauge 0–100 dengan busur yang tumbuh saat halaman dibuka */
function ScoreGauge({ score, rate }: { score: number; rate: number }) {
  const band = healthScoreBand(score)
  const offset = Math.max(0, Math.min(100, 100 - score))

  return (
    <div className="mt-4 flex flex-1 flex-col items-center">
      <div className="relative w-full max-w-[280px]">
        <svg viewBox={`0 0 ${SIZE} ${CENTER + 6}`} className="w-full overflow-visible" aria-hidden>
          <defs>
            <linearGradient id="health-gauge-fill" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#91bb9e" />
              <stop offset="55%" stopColor="#52685c" />
              <stop offset="100%" stopColor="#45594e" />
            </linearGradient>
          </defs>

          {/* trek dasar */}
          <path
            d={ARC}
            fill="none"
            stroke="currentColor"
            className="text-sage"
            strokeWidth={STROKE}
            strokeLinecap="round"
            pathLength={100}
          />

          {/* busur nilai — tumbuh dari 0 ke skor */}
          <motion.path
            d={ARC}
            fill="none"
            stroke="url(#health-gauge-fill)"
            strokeWidth={STROKE}
            strokeLinecap="round"
            pathLength={100}
            strokeDasharray="100 100"
            initial={{ strokeDashoffset: 100 }}
            animate={{ strokeDashoffset: offset }}
            transition={{ duration: 1.15, ease: EASE, delay: 0.15 }}
          />

          {/* garis penanda 0 / 25 / 50 / 75 / 100 */}
          {TICKS.map((tick) => {
            const angle = Math.PI * (1 - tick / 100)
            const inner = RADIUS + STROKE / 2 + 3
            const outer = inner + 7
            return (
              <line
                key={tick}
                x1={CENTER + Math.cos(angle) * inner}
                y1={CENTER - Math.sin(angle) * inner}
                x2={CENTER + Math.cos(angle) * outer}
                y2={CENTER - Math.sin(angle) * outer}
                stroke="currentColor"
                className="text-ink/15"
                strokeWidth={2}
                strokeLinecap="round"
              />
            )
          })}
        </svg>

        {/* angka skor raksasa di tengah busur */}
        <div className="absolute inset-x-0 bottom-1 flex flex-col items-center">
          <span className="font-display text-[3.25rem] font-black leading-none tracking-tight text-forest tabular-nums">
            {score}
          </span>
          <span className="mt-0.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-ink/35">
            {HEALTH_CARD_COPY.outOf}
          </span>
        </div>
      </div>

      <span
        className={cn(
          'mt-3 inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[12px] font-semibold',
          band.chip,
        )}
      >
        <span className="size-1.5 rounded-full bg-current" />
        {band.label}
      </span>

      {/* kalimat hasil + dasar hitungannya: angkanya dari catatan user, bukan
          contoh — dan "apa yang diukur" ditulis supaya skornya tidak misterius */}
      <p className="mt-3 max-w-[26rem] text-center text-[13px] leading-relaxed text-ink/60">
        {HEALTH_CARD_COPY.verdict(rate)}
      </p>
      <p className="mt-1.5 max-w-[26rem] text-center text-[11px] leading-relaxed text-ink/40">
        {HEALTH_CARD_COPY.measured(rate)}
      </p>
    </div>
  )
}

/** Varian B — progres KALIBRASI PROFIL dengan bar berkilau (curiosity loop).
 *  Copy sengaja tidak menyebut "kewarasan/kesehatan finansial": yang diukur di
 *  sini cuma kecukupan data AI Coach, bukan rasio kesehatan keuangan. */
function UnlockProgress({ total }: { total: number }) {
  const goal = HEALTH_SCORE_THRESHOLD
  const done = Math.min(total, goal)
  const pct = Math.round((done / goal) * 100)
  const remaining = Math.max(goal - done, 0)

  return (
    <div className="mt-4 flex flex-1 flex-col justify-center">
      <p className="text-[13.5px] leading-relaxed text-ink/60">{HEALTH_CARD_COPY.learning}</p>

      {/* bar progres: gradien brand + kilau berjalan */}
      <div
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={goal}
        aria-valuenow={done}
        aria-label={HEALTH_CARD_COPY.progressA11y(done, goal)}
        className="relative mt-4 h-3 w-full overflow-hidden rounded-full bg-sage/45 ring-1 ring-inset ring-forest/5"
      >
        <motion.div
          className="relative h-full overflow-hidden rounded-full bg-gradient-to-r from-forest via-forest-soft to-mint"
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.95, ease: EASE, delay: 0.15 }}
        >
          {/* kilau shimmer — kelas di globals.css (hormat prefers-reduced-motion) */}
          <span aria-hidden className="progress-shimmer" />
        </motion.div>
      </div>

      <div className="mt-3 flex items-center justify-between gap-3">
        <span className="text-[11.5px] font-semibold tabular-nums text-ink/45">
          {HEALTH_CARD_COPY.progressLabel(done, goal)}
        </span>
        <span className="font-display text-[15px] font-black tabular-nums text-forest">
          {HEALTH_CARD_COPY.progressPercent(pct)}
        </span>
      </div>

      <p className="mt-2 text-[13px] font-medium leading-relaxed text-ink/70">
        {HEALTH_CARD_COPY.remaining(remaining)}
      </p>
    </div>
  )
}

/**
 * Varian C — catatan SUDAH cukup (≥ ambang) tapi belum ada pemasukan sama sekali.
 *
 * Tanpa pemasukan, "rasio pemasukan vs pengeluaran" tidak punya pembagi; yang
 * benar bukan angka 0 (itu menyiratkan penilaian buruk atas data yang bahkan
 * belum lengkap), melainkan kalimat yang menjelaskan kenapa skornya belum ada
 * dan apa yang membukanya. Dulu keadaan ini ditutupi `HEALTH_SCORE = 72`.
 */
function NoIncomeBlock() {
  return (
    <div className="mt-4 flex flex-1 flex-col justify-center gap-2 rounded-2xl bg-sage/35 px-4 py-5 ring-1 ring-forest/10">
      <p className="font-display text-[14px] font-bold tracking-tight text-ink">
        {HEALTH_CARD_COPY.noIncomeTitle}
      </p>
      <p className="text-[12.5px] leading-relaxed text-ink/65">{HEALTH_CARD_COPY.noIncomeBody}</p>
      <div className="mt-1 flex items-center gap-2">
        <TransactionBottomSheet
          defaultType="income"
          trigger={
            <button
              type="button"
              className="inline-flex h-10 items-center gap-1.5 rounded-full bg-forest px-4 text-[12.5px] font-semibold text-cream transition-colors hover:bg-forest-soft active:scale-[0.98]"
            >
              <Sparkles className="size-3.5" strokeWidth={2.4} aria-hidden />
              {HEALTH_CARD_COPY.noIncomeCta}
            </button>
          }
        />
      </div>
    </div>
  )
}
