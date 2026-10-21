'use client'

import { Trash2 } from 'lucide-react'
import { ProgressRing } from './progress-ring'
import {
  BUDGET_CARD_ACTION_COPY,
  PACING_HEX,
  PACING_HINT_COPY,
  pacingOf,
  pacingPercent,
  pacingStatusLabel,
  ratioLabel,
  type BudgetItem,
  type PeriodWindow,
} from '@/lib/data/budget'

/* ── Satu baris budget kategori (Zona A) ─────────────────────────────────────
   REDESAIN (paket 100) — bentuknya berubah, bukan cuma warnanya:

     ikon 40px · nama + terpakai/limit + status · CINCIN 46px · hapus

   Cincin menggantikan bar 4px + pil persen. Isinya:
     · busur = persen terpakai (warna status dari `PACING_HEX`);
     · TICK kecil di tepi = posisi pacing IDEAL hari ini (dulu garis abu-abu di
       atas bar). Jadi informasi pacing tidak hilang, tapi tidak lagi memakan
       satu baris sendiri.

   Warna status cuma dipakai di busur, titik kecil, dan cincin — teks tetap
   forest supaya terbaca. Tombol hapus netral dan (di desktop) baru muncul saat
   baris di-hover, sehingga daftar terlihat tenang.
   ────────────────────────────────────────────────────────────────────────── */

export function BudgetCategoryCard({
  budget,
  masked,
  window,
  onReview,
  onDelete,
}: {
  budget: BudgetItem
  masked: boolean
  /** periode aktif — menentukan posisi garis pacing ideal */
  window: PeriodWindow
  /** CTA sekunder `Review Pengeluaran →` — aktif saat kategori over budget */
  onReview?: () => void
  /** hapus kategori ini (buka konfirmasi di halaman pemilik state) */
  onDelete?: (budget: BudgetItem) => void
}) {
  const { tone, percent, fasterThanPacing } = pacingOf(budget, masked, window)
  const over = percent >= 100
  const pacing = pacingPercent(window)
  const pacingHint = fasterThanPacing ? PACING_HINT_COPY.faster : PACING_HINT_COPY.base

  return (
    <article className="group/row">
      <div className="flex items-center gap-3">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-sage/45 text-[18px]">
          {budget.icon}
        </span>

        <div className="min-w-0 flex-1">
          <p className="truncate text-[14px] font-semibold leading-tight tracking-tight text-forest">
            {budget.category}
          </p>
          <p className="mt-1 truncate text-[11.5px] font-medium tabular-nums text-forest/45">
            {ratioLabel(budget.spent, budget.limit, masked)}
          </p>
          {/* Baris ini hanya muncul saat kategori lewat limit: satu tombol
              "Review" dengan titik warna status. Label "Masih lega / Mendekati
              limit / Lewat limit" tidak lagi dicetak di kartu — statusnya
              sudah terbaca dari busur cincin (warna + tick pacing). */}
          {over && (
            <div className="mt-1.5 flex items-center gap-1.5 text-[10px] font-medium text-forest/40">
              <span
                aria-hidden
                className="size-1.5 shrink-0 rounded-full"
                style={{ backgroundColor: PACING_HEX[tone] }}
              />
              <span className="sr-only">{pacingStatusLabel(tone)}</span>
              <button
                type="button"
                onClick={onReview}
                className="underline decoration-forest/20 decoration-dotted underline-offset-2 transition-colors hover:text-forest hover:decoration-forest/50"
              >
                Review →
              </button>
            </div>
          )}
        </div>

        <ProgressRing
          percent={percent}
          size={46}
          stroke={4.5}
          color={PACING_HEX[tone]}
          tickPct={pacing}
          title={pacingHint}
          className="cursor-help"
        >
          <span className="text-[10.5px] font-semibold tabular-nums text-forest">
            {Math.round(percent)}%
          </span>
        </ProgressRing>

        {onDelete && (
          <button
            type="button"
            onClick={() => onDelete(budget)}
            aria-label={BUDGET_CARD_ACTION_COPY.delete(budget.category)}
            title={BUDGET_CARD_ACTION_COPY.delete(budget.category)}
            className="flex size-7 shrink-0 items-center justify-center rounded-lg text-forest/25 transition-all hover:bg-plum/10 hover:text-plum focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-forest/25 active:scale-95 lg:opacity-0 lg:group-hover/row:opacity-100 lg:focus-visible:opacity-100"
          >
            <Trash2 className="size-3.5" strokeWidth={2.4} aria-hidden />
          </button>
        )}
      </div>
    </article>
  )
}
