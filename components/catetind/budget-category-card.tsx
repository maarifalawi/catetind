'use client'

import { useState } from 'react'
import { Trash2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  BUDGET_CARD_ACTION_COPY,
  PACING_HEX,
  PACING_HINT_COPY,
  pacingOf,
  pacingPercent,
  periodLimitWord,
  ratioLabel,
  type BudgetItem,
  type PeriodWindow,
} from '@/lib/data/budget'

/* ── Satu baris budget kategori (Zona A) ─────────────────────────────────────
   Emoji + nama kategori, nominal terpakai/limit, bar progres berwarna kanon
   (sage → amber → terracotta), plus "ghost pacing line": garis tipis 2px di
   posisi pengeluaran ideal hari ini. Garis itu dihitung dari `window` (periode
   yang sedang aktif) — jadi di tab Mingguan ia bergerak relatif Senin–Minggu,
   bukan selalu bulan kalender. Kalau bar berwarna sudah melewati garis itu,
   artinya belanja lebih cepat dari pacing — ditampilkan sebagai informasi,
   bukan teguran (nada PRD: nurturing, bukan menghakimi).

   PAKET 60.1 — tombol HAPUS ditambahkan di baris atas kartu. Sebelumnya kartu
   ini hanya punya "ghost pacing line" (hint) dan CTA `Review Pengeluaran →`
   saat over budget: tidak ada satu pun jalan untuk mencabut target yang user
   pasang sendiri. Tombolnya ikon kecil dengan `aria-label` yang menyebut nama
   kategorinya (`BUDGET_CARD_ACTION_COPY.delete`) — keputusan & konfirmasinya
   milik halaman (`budget-screen`), karena di sanalah jendela Undo hidup.
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
  /* tooltip garis pacing: muncul saat hover (CSS) & saat di-tap (state) */
  const [hintOpen, setHintOpen] = useState(false)

  const { tone, percent, copy, fasterThanPacing } = pacingOf(budget, masked, window)
  const over = percent >= 100
  const pacing = pacingPercent(window)
  const fill = Math.min(100, percent)

  /* tooltip tidak boleh keluar tepi kartu — merapat ke sisi terdekat */
  const hintAnchor =
    pacing >= 70 ? 'right-0' : pacing <= 30 ? 'left-0' : 'left-1/2 -translate-x-1/2'

  return (
    <article className="rounded-[1.5rem] bg-cream p-4 ring-1 ring-soil/12 shadow-[0_12px_28px_-24px_rgba(69,89,78,0.5)] transition-shadow duration-300 hover:shadow-[0_18px_34px_-22px_rgba(69,89,78,0.45)]">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2.5">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-2xl bg-sage/70 text-[17px] ring-1 ring-soil/8">
            {budget.icon}
          </span>
          <span className="min-w-0">
            <span className="block truncate text-[14.5px] font-medium tracking-tight text-forest">
              {budget.category}
            </span>
            <span className="block text-[10.5px] font-medium text-forest/40">
              Budget {periodLimitWord(budget.period)}
            </span>
          </span>
        </div>

        <span className="flex shrink-0 items-center gap-1.5">
          <span className="text-right text-[12px] font-medium tabular-nums text-forest">
            {ratioLabel(budget.spent, budget.limit, masked)}
          </span>
          {/* hapus (paket 60.1) — ikon saja, tapi SELALU punya nama yang bisa
              dibaca pembaca layar & tooltip; keputusan ada di halaman */}
          {onDelete && (
            <button
              type="button"
              onClick={() => onDelete(budget)}
              aria-label={BUDGET_CARD_ACTION_COPY.delete(budget.category)}
              title={BUDGET_CARD_ACTION_COPY.delete(budget.category)}
              className="flex size-7 shrink-0 items-center justify-center rounded-xl text-forest/30 transition-colors hover:bg-plum/12 hover:text-plum focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-forest/25 active:scale-95"
            >
              <Trash2 className="size-3.5" strokeWidth={2.4} aria-hidden />
            </button>
          )}
        </span>
      </div>

      {/* ── bar progres + garis pacing ideal ─────────────────────────────── */}
      <div
        className="group/bar relative mt-3.5"
        onMouseLeave={() => setHintOpen(false)}
      >
        <div className="h-2 w-full overflow-hidden rounded-full bg-[#ebe4de]">
          <div
            className="h-full rounded-full transition-[width] duration-700 ease-[cubic-bezier(0.22,1,0.36,1)]"
            style={{ width: `${fill}%`, backgroundColor: PACING_HEX[tone] }}
          />
        </div>

        {/* ghost pacing line — 2px, nol tambahan ruang vertikal */}
        <button
          type="button"
          aria-label={fasterThanPacing ? PACING_HINT_COPY.faster : PACING_HINT_COPY.base}
          onClick={() => setHintOpen((prev) => !prev)}
          onFocus={() => setHintOpen(true)}
          onBlur={() => setHintOpen(false)}
          className="absolute -bottom-1.5 -top-1.5 w-0.5 -translate-x-1/2 cursor-help rounded-full bg-ink/15 transition-colors hover:bg-ink/20"
          style={{ left: `${pacing}%` }}
        />

        {/* tooltip mikro — hanya muncul saat hover/tap, tidak makan tempat */}
        <span
          role="tooltip"
          className={cn(
            'pointer-events-none absolute top-full z-10 mt-2 w-max max-w-[13rem] rounded-xl bg-ink px-2.5 py-1.5 text-[10.5px] font-medium leading-snug text-cream shadow-[0_12px_26px_-14px_rgba(69,89,78,0.7)] transition-opacity duration-200',
            hintAnchor,
            hintOpen ? 'opacity-100' : 'opacity-0 group-hover/bar:opacity-100',
          )}
        >
          {PACING_HINT_COPY.base}
        </span>
      </div>

      {/* ── copy status + CTA review saat over ───────────────────────────── */}
      <div className="mt-2.5 flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
        <p
          className={cn(
            'text-[11.5px] font-medium leading-snug',
            tone === 'sage' && 'text-[#b5b987]',
            tone === 'amber' && 'text-[#b89191]',
            tone === 'terracotta' && 'text-hud-terracotta',
          )}
        >
          {copy}
        </p>
        {over && (
          <button
            type="button"
            onClick={onReview}
            className="text-[11.5px] font-medium text-hud-terracotta underline decoration-hud-terracotta/40 decoration-dotted underline-offset-4 transition-colors hover:decoration-hud-terracotta"
          >
            Review Pengeluaran →
          </button>
        )}
      </div>
    </article>
  )
}
