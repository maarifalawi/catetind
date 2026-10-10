'use client'

import { motion } from 'framer-motion'
import { SinkingFundCard } from './sinking-fund-card'
import {
  BUDGET_ZONE_B_COPY,
  NUDGE_COPY,
  SOCIAL_PROOF_COPY,
  fundsTotals,
  maskNominal,
  type SinkingFundItem,
} from '@/lib/data/budget'

/* ── ZONA B — Celengan Impian (sinking funds) ────────────────────────────────
   Kartu tanaman yang tumbuh, nudge penyemangat kalau belum setor bulan ini,
   empty state, dan social proof. Semua elemen tambahan hanya muncul saat
   relevan — begitu ada setoran, kartu nudge hilang sendiri.

   PAKET 78 (minimalisme): tidak ada lagi string user-facing di JSX — CTA nudge,
   empty state, dan tombol tambah memakai `BUDGET_ZONE_B_COPY`, sedangkan kalimat
   nudge & social proof dipendekkan di lapis data. Struktur kondisionalnya TIDAK
   berubah, jadi elemen yang hanya muncul sesekali (nudge, social proof) tetap
   punya logika yang sama. ─────────────────────────────────────────────────── */

export function BudgetZoneB({
  funds,
  masked,
  currentDay,
  onAddGoal,
  onContribute,
  onOpenFund,
  onDeleteGoal,
}: {
  funds: SinkingFundItem[]
  masked: boolean
  currentDay: number
  onAddGoal: () => void
  onContribute: (fund: SinkingFundItem) => void
  onOpenFund: (fund: SinkingFundItem) => void
  /** hapus celengan (paket 60.2) — halaman yang memasang konfirmasi + Undo */
  onDeleteGoal: (fund: SinkingFundItem) => void
}) {
  /* 6. SOCIAL PROOF & NUDGE — nudge hanya bila belum ada setoran bulan ini
        dan bulan sudah berjalan (bukan di hari-hari pertama, biar tidak nagih) */
  const showNudge =
    funds.length > 0 && currentDay > 5 && funds.every((fund) => !fund.contributedThisMonth)
  /* ringkasan agregat celengan (redesain 82) — menjumlah daftar yang SAMA
     dengan kartu di bawah, jadi strip atas & bar tiap tanaman tak bisa beda */
  const totals = fundsTotals(funds)

  return (
    <div className="space-y-4">
      {/* ── nudge lembut — "gapapa, mulai lagi kapan aja" ─────────────────── */}
      {showNudge && (
        <motion.section
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.42, ease: [0.22, 1, 0.36, 1] }}
          className="rounded-[1.5rem] bg-cream p-4 ring-1 ring-soil/12"
        >
          <div className="flex items-start gap-3">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-2xl bg-sage/70 text-[17px]">
              🌿
            </span>
            <div className="min-w-0">
              <p className="text-[12.5px] leading-relaxed text-forest/60">{NUDGE_COPY}</p>
              <button
                type="button"
                onClick={() => onContribute(funds[0])}
                className="mt-2.5 rounded-full bg-forest px-3.5 py-2 text-[12px] font-medium text-mint transition-colors hover:bg-forest-soft active:scale-95"
              >
                {BUDGET_ZONE_B_COPY.nudgeCta}
              </button>
            </div>
          </div>
        </motion.section>
      )}

      {/* ── 4. RINGKASAN AGREGAT (redesain paket 82) ───────────────────────
          Total terkumpul dari total target semua celengan di konteks ini —
          jawaban cepat "seberapa jauh impianku" sebelum membaca tiap tanaman.
          Warna isiannya MINT (keluarga "tumbuh"), bukan tiga warna status Jatah
          Harian: untuk celengan makin penuh = makin baik. */}
      {funds.length > 0 && (
        <div className="rounded-[1.4rem] bg-cream p-4 ring-1 ring-soil/10">
          <div className="flex items-end justify-between gap-3">
            <span className="text-[11.5px] font-medium text-forest/50">
              {BUDGET_ZONE_B_COPY.summaryLead}
            </span>
            {/* angka agregat 18px — sejajar bahasa visual ringkasan Zona A */}
            <span className="text-[18px] font-semibold leading-none tracking-tight text-forest tabular-nums">
              {maskNominal(totals.current, masked)}
            </span>
          </div>
          <div
            role="progressbar"
            aria-label={BUDGET_ZONE_B_COPY.summaryAria(
              maskNominal(totals.current, masked),
              maskNominal(totals.target, masked),
              Math.round(totals.percent),
            )}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.round(totals.percent)}
            className="mt-2.5 h-1.5 w-full overflow-hidden rounded-full bg-soil/[0.07]"
          >
            <div
              className="h-full rounded-full bg-mint transition-[width] duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none"
              style={{ width: `${totals.percent}%` }}
            />
          </div>
          <div className="mt-2 flex items-center justify-between gap-2 text-[10.5px] text-forest/40 tabular-nums">
            <span>
              {Math.round(totals.percent)}% {BUDGET_ZONE_B_COPY.summaryPctSuffix}
            </span>
            <span>{BUDGET_ZONE_B_COPY.summaryOf(maskNominal(totals.target, masked))}</span>
          </div>
        </div>
      )}

      {/* ── 4A. DAFTAR CELENGAN / 5B. EMPTY STATE ─────────────────────────── */}
      {funds.length === 0 ? (
        <div className="flex flex-col items-center rounded-[1.75rem] border border-dashed border-oat bg-cream/60 px-6 py-10 text-center">
          {/* emoji jadi ilustrasi ringan di dalam lingkaran sage (redesain 82) */}
          <span className="flex size-14 items-center justify-center rounded-full bg-sage/60 text-[26px] ring-1 ring-soil/8">
            🌱
          </span>
          <p className="mx-auto mt-4 max-w-[19rem] text-[13px] leading-relaxed text-forest/60">
            {BUDGET_ZONE_B_COPY.emptyBody}
          </p>
          <button
            type="button"
            onClick={onAddGoal}
            className="mt-5 rounded-full bg-forest px-5 py-2.5 text-[12.5px] font-medium text-cream transition-colors hover:bg-forest-soft active:scale-95"
          >
            {BUDGET_ZONE_B_COPY.emptyCta}
          </button>
        </div>
      ) : (
        <div className="space-y-2.5">
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
                onDelete={onDeleteGoal}
              />
            </motion.div>
          ))}
        </div>
      )}

      {/* ── 4C. TANAM CELENGAN BARU ──────────────────────────────────────── */}
      <button
        type="button"
        onClick={onAddGoal}
        className="flex w-full items-center justify-center gap-2 rounded-[1.4rem] border-2 border-dashed border-oat bg-cream/45 px-4 py-4 text-[12.5px] font-medium text-forest/45 transition-all hover:border-forest/25 hover:bg-cream hover:text-forest active:scale-[0.99]"
      >
        <span className="text-[15px] leading-none">+</span>
        {BUDGET_ZONE_B_COPY.addCta}
      </button>

      {/* ── social proof (muted, di paling bawah) ─────────────────────────── */}
      <p className="px-1 text-center text-[11px] leading-relaxed text-forest/35">{SOCIAL_PROOF_COPY}</p>
    </div>
  )
}
