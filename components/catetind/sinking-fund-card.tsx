'use client'

import { ChevronRight, Plus } from 'lucide-react'
import { cn } from '@/lib/utils'
import { PlantIllustration, type PlantStage as IllustrationStage } from './plant-illustration'
import {
  PLANT_STAGES,
  PLANT_STAGE_INDEX,
  formatDeadline,
  fundPercent,
  maskNominal,
  monthlyNeeded,
  priorityStyle,
  type SinkingFundItem,
} from '@/lib/data/budget'

/* ── Kartu Celengan Impian (Zona B) — metafora tanaman ───────────────────────
   Kartu tempat tanaman bertumbuh. Progres digambar sebagai TANAMAN (SVG statis
   seed → sprout → plant → flower) plus auto-kalkulasi "nabung Rp X/bulan biar
   tercapai tepat waktu" (rumus PRD 2C.3).

   Audit UX #1: progress bar generik DIHAPUS — PRD secara eksplisit menolak
   progress bar untuk goal. Tanaman adalah satu-satunya indikator visual,
   didampingi teks persentase. Tanaman di list view sengaja SVG statis (resolusi
   CANDRA, PRD Domain 3B): animasi berat hanya di halaman detail.

   Area kartu dibagi dua tombol supaya jelas: badan kartu = buka detail,
   tombol `Setor` = langsung menyetor tanpa meninggalkan halaman.
   ────────────────────────────────────────────────────────────────────────── */

export function SinkingFundCard({
  fund,
  masked,
  onOpen,
  onContribute,
}: {
  fund: SinkingFundItem
  masked: boolean
  onOpen: (fund: SinkingFundItem) => void
  onContribute: (fund: SinkingFundItem) => void
}) {
  const stage = PLANT_STAGES[fund.stage]
  const priority = priorityStyle(fund.priority)
  const percent = fundPercent(fund)
  const reached = percent >= 100
  const perMonth = monthlyNeeded(fund.target, fund.current, fund.deadline)

  return (
    <article
      className={cn(
        'group/card flex flex-col rounded-[1.6rem] bg-gradient-to-br from-cream via-cream to-sage/45 p-4 ring-1 shadow-[0_12px_28px_-24px_rgba(69,89,78,0.5)] transition-shadow duration-300 hover:shadow-[0_18px_34px_-22px_rgba(69,89,78,0.45)]',
        reached ? 'ring-mint/70' : 'ring-soil/5',
      )}
    >
      {/* badan kartu → halaman detail celengan */}
      <button
        type="button"
        onClick={() => onOpen(fund)}
        className="w-full text-left outline-none focus-visible:ring-2 focus-visible:ring-forest/30 rounded-2xl"
      >
        <div className="flex items-start justify-between gap-3">
          <span className="min-w-0">
            <span className="block truncate text-[15px] font-bold leading-tight tracking-tight text-ink">
              {fund.name}
            </span>
            <span className="mt-0.5 block text-[10.5px] font-semibold text-[#b5b987]">
              {stage.label}
            </span>
          </span>

          <span
            className={cn(
              'shrink-0 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide',
              priority.badge,
            )}
          >
            {priority.label}
          </span>
        </div>

        {/* nominal terkumpul / target */}
        <div className="mt-3.5 flex items-end justify-between gap-3">
          <p className="text-[19px] font-bold leading-none tracking-tight text-ink tabular-nums">
            {maskNominal(fund.current, masked)}
          </p>
          <p className="shrink-0 text-[11.5px] font-medium text-ink/45 tabular-nums">
            / {maskNominal(fund.target, masked)}
          </p>
        </div>

        {/* ── PROGRES = METAFORA TANAMAN, BUKAN PROGRESS BAR ──────────────────
            Audit UX #1: bar abu-abu/hijau konvensional dihapus. Tanaman (SVG
            statis, kanon PRD 2C.3) yang bertransformasi seed → sprout → plant →
            flower adalah SATU-SATUNYA indikator visual, didampingi persentase. */}
        <div className="mt-3 flex items-center gap-3 rounded-2xl bg-gradient-to-br from-sage/45 via-cream to-[#ebe4de] p-2.5 ring-1 ring-soil/[0.04]">
          <span className="flex h-14 w-14 shrink-0 items-end justify-center overflow-hidden">
            <PlantIllustration
              stage={PLANT_STAGE_INDEX[fund.stage] as IllustrationStage}
              className="w-12"
            />
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex items-baseline justify-between gap-2">
              <span className="text-[11.5px] font-semibold text-[#b5b987]">{stage.label}</span>
              <span className="shrink-0 text-[13px] font-bold text-ink tabular-nums">
                {Math.round(percent)}%
              </span>
            </div>
            <p className="mt-1 text-[11px] font-medium leading-snug text-ink/55">
              Nabung{' '}
              <b className="font-bold text-ink tabular-nums">{maskNominal(perMonth, masked)}</b>
              /bulan biar tercapai tepat waktu
            </p>
          </div>
        </div>

        <p className="mt-1.5 text-[10.5px] text-ink/35">
          Target: {formatDeadline(fund.deadline)}
        </p>
      </button>

      {/* footer — pintasan setor tanpa harus masuk detail */}
      <div className="mt-3.5 flex items-center justify-between gap-2 border-t border-soil/[0.06] pt-3">
        <span className="inline-flex items-center gap-1 text-[11px] font-medium text-ink/35 transition-colors group-hover/card:text-ink/55">
          Lihat detail
          <ChevronRight className="size-3" strokeWidth={2.4} />
        </span>
        <button
          type="button"
          onClick={() => onContribute(fund)}
          className="inline-flex items-center gap-1.5 rounded-full bg-forest px-3.5 py-2 text-[12px] font-semibold text-mint transition-colors hover:bg-forest-soft active:scale-95"
        >
          <Plus className="size-3.5" strokeWidth={3} />
          Setor
        </button>
      </div>
    </article>
  )
}
