'use client'

import { motion } from 'framer-motion'
import { Activity, Sparkles } from 'lucide-react'
import { HEALTH_SCORE_THRESHOLD } from '@/lib/data/history'
import { cn } from '@/lib/utils'

/* ── Kalibrasi Profil AI → Skor Kewarasan Finansial (hero Riwayat & Insight) ─
   Dua varian, dipisah ambang data PRD Domain 2A.5:

   - totalTransactions < 30  → kartu "KALIBRASI PROFIL AI". Ini metrik jujur:
     yang diukur adalah seberapa banyak data AI Coach punya untuk mengenali pola
     user — BUKAN kesehatan finansial. (Audit vanity-metric: menghitung jumlah
     klik/catatan tidak boleh dijual sebagai "Kewarasan Finansial".)
   - totalTransactions >= 30 → GAUGE 0–100. Baru di stage ini skor benar-benar
     mengukur rasio kesehatan keuangan (pemasukan vs pengeluaran/hutang), jadi
     label "Skor Kewarasan Finansial" baru dipakai di sini.

   Varian kalibrasi inilah yang tampil pada data mock sekarang (24 transaksi).
   Naikkan TOTAL_TRANSACTIONS di lib/data/history.ts ke >= 30 untuk lihat gauge. */

const EASE: [number, number, number, number] = [0.22, 1, 0.36, 1]

/* geometri gauge: busur setengah lingkaran + pathLength=100 supaya progres
   cukup dihitung sekali (offset 100 → 100 − skor) */
const SIZE = 208
const STROKE = 17
const RADIUS = (SIZE - STROKE) / 2
const CENTER = SIZE / 2
const ARC = `M ${CENTER - RADIUS} ${CENTER} A ${RADIUS} ${RADIUS} 0 0 1 ${CENTER + RADIUS} ${CENTER}`
const TICKS = [0, 25, 50, 75, 100]

/** band status skor — pakai palet status Daily HUD (bukan merah, kanon 2B.2) */
function scoreBand(score: number) {
  if (score >= 80) return { label: 'Sangat Sehat', chip: 'bg-mint text-forest' }
  if (score >= 60) return { label: 'Cukup Sehat', chip: 'bg-hud-sage/35 text-forest' }
  if (score >= 40) return { label: 'Perlu Perhatian', chip: 'bg-hud-amber/25 text-hud-terracotta' }
  return { label: 'Hati-hati', chip: 'bg-hud-terracotta/20 text-hud-terracotta' }
}

export function FinancialHealthCard({
  totalTransactions,
  score,
}: {
  totalTransactions: number
  /** skor 0–100 (mock HEALTH_SCORE) */
  score: number
}) {
  const unlocked = totalTransactions >= HEALTH_SCORE_THRESHOLD

  /* label dinamis: sebelum data cukup, yang dijual adalah KALIBRASI PROFIL
     (akurasi AI Coach) — bukan skor kesehatan finansial yang belum dihitung */
  const title = unlocked ? 'Skor Kewarasan Finansial' : 'Kalibrasi Profil AI'
  const subtitle = unlocked ? 'Diperbarui tiap akhir pekan' : 'AI Coach sedang menyelaraskan polamu'

  return (
    <section className="flex h-full flex-col rounded-[2rem] bg-white p-5 shadow-[0_4px_24px_-4px_rgba(18,40,31,0.06)] ring-1 ring-black/5 sm:p-6">
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
        <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-cream px-2.5 py-1 text-[10.5px] font-semibold uppercase tracking-[0.1em] text-ink/45 ring-1 ring-black/5">
          <Sparkles className="size-3 text-forest" strokeWidth={2.4} />
          {unlocked ? 'AI' : 'AI Coach'}
        </span>
      </div>

      {unlocked ? <ScoreGauge score={score} /> : <UnlockProgress total={totalTransactions} />}
    </section>
  )
}

/** Varian A — gauge 0–100 dengan busur yang tumbuh saat halaman dibuka */
function ScoreGauge({ score }: { score: number }) {
  const band = scoreBand(score)
  const offset = Math.max(0, Math.min(100, 100 - score))

  return (
    <div className="mt-4 flex flex-1 flex-col items-center">
      <div className="relative w-full max-w-[280px]">
        <svg viewBox={`0 0 ${SIZE} ${CENTER + 6}`} className="w-full overflow-visible" aria-hidden>
          <defs>
            <linearGradient id="health-gauge-fill" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#b7e04b" />
              <stop offset="55%" stopColor="#17543c" />
              <stop offset="100%" stopColor="#103a2a" />
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
            dari 100
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

      <p className="mt-3 max-w-[26rem] text-center text-[13px] leading-relaxed text-ink/60">
        Keuanganmu cukup sehat! Coba kurangi jajan kopi 10% biar makin oke.
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
      <p className="text-[13.5px] leading-relaxed text-ink/60">AI sedang mempelajari polamu...</p>

      {/* bar progres: gradien brand + kilau berjalan */}
      <div
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={goal}
        aria-valuenow={done}
        aria-label={`Kalibrasi profil AI: ${done} dari ${goal} transaksi terkumpul`}
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
          {done}/{goal} transaksi
        </span>
        <span className="font-display text-[15px] font-black tabular-nums text-forest">
          Kalibrasi {pct}%
        </span>
      </div>

      <p className="mt-2 text-[13px] font-medium leading-relaxed text-ink/70">
        {remaining} transaksi lagi buat kalibrasi profilmu
      </p>
    </div>
  )
}
