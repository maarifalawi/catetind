'use client'

import { motion } from 'framer-motion'
import { Lightbulb, Plus } from 'lucide-react'
import { BudgetCategoryCard } from './budget-category-card'
import { ProgressRing } from './progress-ring'
import { cn } from '@/lib/utils'
import {
  BUDGET_ADD_PLACEHOLDER,
  BUDGET_SUGGEST_COPY,
  BUDGET_ZONE_A_COPY,
  PACING_HEX,
  PERIOD_TABS,
  SWEEP_TRIGGER_DAY,
  budgetTotals,
  maskNominal,
  spentPercent,
  surplusBudgets,
  totalSurplus,
  type BudgetItem,
  type PeriodTab,
  type PeriodWindow,
} from '@/lib/data/budget'

/* ── ZONA A — Budget Kategori (spending limits) ──────────────────────────────
   Urutan & semua elemennya CONDITIONAL supaya layar tetap lengang:

   1. Kartu Sapu Bersih      → hanya 3 hari terakhir bulan (ritual bulanan) + ada sisa
   2. Kartu kendali periode  → tab Mingguan/Bulanan/Siklus Gajian + ringkasan agregat
   3. Daftar kategori        → bar progres + ghost pacing line (pacing ikut periode aktif)
   4. Banner over budget     → hanya kalau ada kategori lewat limit
   5. Saran kategori         → hanya kalau riwayat punya kategori yang belum dibatasi

   REDESAIN (paket 99 · permintaan pemilik produk) — "pakai warna yang memang
   dipakai, modern, clean, minimalist". Yang berubah:
     · SEMUA kategori kini satu daftar di dalam SATU kartu (hairline pemisah),
       bukan lima kartu terpisah yang membuat halaman terasa penuh;
     · warna dikurangi ke keluarga brand: forest (tinta/CTA), cream (permukaan),
       sage (chip/netral), mint (progres). Amber & plum hanya muncul saat
       statusnya memang mendekati/melewati limit;
     · gradien, glow, dan bayangan berwarna dihapus dari kartu-kartu Zona A.

   Catatan: kartu "Jatah Hari Ini" TIDAK di sini. Ia metrik super-hero GLOBAL
   (audit UX #3) dan dirender full-width oleh budget-screen lewat
   <DailyHudSummary />.
   ────────────────────────────────────────────────────────────────────────── */

export function BudgetZoneA({
  budgets,
  masked,
  window,
  periodTab,
  onPeriodChange,
  onAddBudget,
  onSweep,
  onReviewCoach,
  onDeleteBudget,
  suggestion,
  onAddSuggested,
}: {
  /** daftar yang SUDAH disaring untuk periode aktif (lihat `budgetsForPeriod`) */
  budgets: BudgetItem[]
  masked: boolean
  /** periode aktif — menentukan panjang pembagi pacing & rentang tanggal */
  window: PeriodWindow
  periodTab: PeriodTab
  onPeriodChange: (tab: PeriodTab) => void
  onAddBudget: () => void
  onSweep: () => void
  onReviewCoach: () => void
  /** hapus satu kategori (paket 60.1) — halaman yang memasang konfirmasi & Undo */
  onDeleteBudget: (budget: BudgetItem) => void
  /** H5-2 — saran kategori dari riwayat (null/tanpa saran = kartu tidak tampil) */
  suggestion?: { category: string; count: number } | null
  onAddSuggested?: (category: string) => void
}) {
  const surplus = surplusBudgets(budgets)
  const sweepTotal = totalSurplus(budgets)
  /* 3G: sapu-sapu = ritual akhir BULAN, jadi kartunya hanya di tab Bulanan +
     masih ada sisa budget. Di tab mingguan/siklus, "sapu" tidak punya arti. */
  const showSweep =
    window.period === 'monthly' && window.dayIndex >= SWEEP_TRIGGER_DAY && surplus.length > 0
  const overBudget = budgets.filter((b) => spentPercent(b) >= 100)
  /* ringkasan agregat periode — daftar & fungsi yang SAMA dengan kartu di
     bawah, jadi strip atas tidak mungkin beda angka dari kartunya */
  const totals = budgetTotals(budgets)
  /* warna ringkasan hanya berubah saat statusnya memang berubah */
  const totalsTone: 'sage' | 'amber' | 'terracotta' =
    totals.percent >= 100 ? 'terracotta' : totals.percent >= 75 ? 'amber' : 'sage'

  return (
    <div className="space-y-4">
      {/* ── 3G. AUTO-SWEEP END-OF-MONTH (paling atas Zona A) ─────────────── */}
      {showSweep && (
        <motion.button
          type="button"
          onClick={onSweep}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.42, ease: [0.22, 1, 0.36, 1] }}
          className="group w-full rounded-[1.5rem] bg-sage/45 p-4 text-left ring-1 ring-soil/8 transition-colors duration-300 hover:bg-sage/60 active:scale-[0.99]"
        >
          <div className="flex items-start gap-3">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-cream text-[18px] ring-1 ring-soil/8">
              🧹
            </span>
            <div className="min-w-0">
              <p className="text-[13.5px] font-medium tracking-tight text-forest">
                {BUDGET_ZONE_A_COPY.sweepTitle}
              </p>
              <p className="mt-1 text-[12px] leading-relaxed text-forest/55">
                {BUDGET_ZONE_A_COPY.sweepLead}{' '}
                <b className="font-semibold text-forest tabular-nums">
                  {maskNominal(sweepTotal, masked)}
                </b>{' '}
                {BUDGET_ZONE_A_COPY.sweepTail}
              </p>
              <span className="mt-1.5 inline-flex items-center gap-1 text-[12px] font-medium text-forest">
                {BUDGET_ZONE_A_COPY.sweepCta}
                <span aria-hidden className="transition-transform group-hover:translate-x-0.5">
                  →
                </span>
              </span>
            </div>
          </div>
        </motion.button>
      )}

      {/* ── SATU KARTU: periode + ringkasan + daftar + pintu tambah ──────── */}
      <section className="overflow-hidden rounded-[1.5rem] bg-cream ring-1 ring-soil/8 shadow-[0_22px_54px_-46px_rgba(0,0,0,0.55)]">
        <div className="p-4">
          <div
            role="tablist"
            aria-label={BUDGET_ZONE_A_COPY.periodTabsAria}
            className="flex items-center gap-0.5 rounded-full bg-sage/45 p-1"
          >
            {PERIOD_TABS.map((tab) => {
              const active = periodTab === tab.id
              return (
                <button
                  key={tab.id}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => onPeriodChange(tab.id)}
                  className="relative flex-1 rounded-full px-2.5 py-1.5 text-[11.5px] font-medium transition-colors duration-200 active:scale-95"
                >
                  {active && (
                    <motion.span
                      aria-hidden
                      layoutId="budget-period-pill"
                      className="absolute inset-0 rounded-full bg-forest"
                      transition={{ type: 'spring', stiffness: 520, damping: 38 }}
                    />
                  )}
                  <span
                    className={cn(
                      'relative z-10',
                      active ? 'text-cream' : 'text-forest/50 hover:text-forest',
                    )}
                  >
                    {tab.label}
                  </span>
                </button>
              )
            })}
          </div>

          {budgets.length > 0 && (
            <div className="mt-4 rounded-2xl bg-sage/25 p-3.5 ring-1 ring-soil/[0.04]">
              <div className="flex items-center gap-4">
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-forest/40">
                    {BUDGET_ZONE_A_COPY.summaryLead}
                  </p>
                  <p className="mt-1.5 flex items-baseline gap-1.5 tabular-nums">
                    <span className="text-[24px] font-semibold leading-none tracking-tight text-forest">
                      {maskNominal(totals.spent, masked)}
                    </span>
                    <span className="text-[11px] font-medium text-forest/35">
                      / {maskNominal(totals.limit, masked)}
                    </span>
                  </p>
                  <p className="mt-1.5 text-[10.5px] font-medium text-forest/40">
                    {window.rangeLabel}
                  </p>
                </div>
                <ProgressRing
                  percent={totals.percent}
                  size={62}
                  stroke={5}
                  color={PACING_HEX[totalsTone]}
                  ariaLabel={BUDGET_ZONE_A_COPY.summaryAria(
                    maskNominal(totals.spent, masked),
                    maskNominal(totals.limit, masked),
                    Math.round(totals.percent),
                  )}
                >
                  <span className="text-[13px] font-semibold tabular-nums text-forest">
                    {Math.round(totals.percent)}%
                  </span>
                </ProgressRing>
              </div>
            </div>
          )}
        </div>

        {budgets.length === 0 ? (
          <div className="border-t border-soil/8 px-5 py-9 text-center">
            <span className="mx-auto flex size-12 items-center justify-center rounded-full bg-sage/50 text-[22px]">
              ☕
            </span>
            <p className="mx-auto mt-3 max-w-[19rem] text-[12.5px] leading-relaxed text-forest/55">
              {BUDGET_ZONE_A_COPY.emptyBody}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-soil/8 border-t border-soil/8 px-4">
            {budgets.map((budget, index) => (
              <motion.div
                key={budget.id}
                layout
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.04 * index, ease: [0.22, 1, 0.36, 1] }}
                className="py-3.5"
              >
                <BudgetCategoryCard
                  budget={budget}
                  masked={masked}
                  window={window}
                  onReview={onReviewCoach}
                  onDelete={onDeleteBudget}
                />
              </motion.div>
            ))}
          </div>
        )}

        <div className="border-t border-soil/8 p-2">
          <button
            type="button"
            onClick={onAddBudget}
            className="group flex w-full items-center gap-3 rounded-xl px-2 py-2.5 text-left transition-colors hover:bg-sage/35 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-forest/25 active:scale-[0.99]"
          >
            <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-sage/50 text-forest transition-transform duration-300 group-hover:scale-105">
              <Plus className="size-4" strokeWidth={2.6} aria-hidden />
            </span>
            <span className="min-w-0">
              <span className="block text-[12.5px] font-medium text-forest">
                {BUDGET_ADD_PLACEHOLDER.budgetTitle}
              </span>
            </span>
          </button>
        </div>
      </section>


      {/* ── 3E. OVER-BUDGET (hanya kalau ada yang lewat limit) ──────────────
          Satu baris fakta + satu tombol. Warna plum dipakai tipis saja — ia
          satu-satunya sinyal "perlu perhatian" di Zona A. */}
      {overBudget.length > 0 && (
        <div className="flex flex-col gap-3 rounded-[1.5rem] bg-plum/[0.06] p-4 ring-1 ring-plum/15 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-[12.5px] leading-relaxed text-forest/65">
            {BUDGET_ZONE_A_COPY.overLead(overBudget.length, overBudget[0].category)}
          </p>
          <button
            type="button"
            onClick={onReviewCoach}
            className="shrink-0 self-start rounded-full bg-forest px-4 py-2 text-[12px] font-medium text-cream transition-colors hover:bg-forest-soft active:scale-95 sm:self-auto"
          >
            {BUDGET_ZONE_A_COPY.overCta}
          </button>
        </div>
      )}

      {/* ── H5-2. SARAN KATEGORI DARI RIWAYAT ────────────────────────────────
          Saran ini datang dari baris ledger NYATA (`suggestedBudgetCategory`):
          kategori pengeluaran tersering yang BELUM punya limit. Klik = buka
          sheet tambah budget dengan kategori itu sudah terpilih. */}
      {suggestion && onAddSuggested && (
        <div className="flex items-start gap-3 rounded-[1.5rem] bg-sage/40 p-4 ring-1 ring-soil/8">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-cream text-forest ring-1 ring-soil/8">
            <Lightbulb className="size-4" strokeWidth={2.2} aria-hidden />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-forest/40">
              {BUDGET_SUGGEST_COPY.title}
            </p>
            <p className="mt-1 text-[12.5px] leading-relaxed text-forest/65">
              {BUDGET_SUGGEST_COPY.body(suggestion.category)}
            </p>
            <button
              type="button"
              onClick={() => onAddSuggested(suggestion.category)}
              className="mt-2.5 inline-flex items-center gap-1.5 rounded-full bg-forest px-3.5 py-2 text-[12px] font-medium text-cream transition-colors hover:bg-forest-soft active:scale-95"
            >
              <Plus className="size-3.5" strokeWidth={2.8} aria-hidden />
              {BUDGET_SUGGEST_COPY.cta}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
