'use client'

import { motion } from 'framer-motion'
import { Lightbulb, Plus } from 'lucide-react'
import { BudgetCategoryCard } from './budget-category-card'
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
                               dalam SATU permukaan (redesain 82 round 2)
   3. Daftar kategori        → bar progres + ghost pacing line (pacing ikut periode aktif)
   4. Banner Review Hari Ini → hanya kalau ada kategori over budget (membuka
                               panel review, prompt 19)
   5. Tambah budget / empty state

   Catatan: kartu "Jatah Hari Ini" / Dry Spell TIDAK lagi di sini. Jatah Harian
   adalah metrik super-hero GLOBAL (hasil kalkulasi pemasukan − cicilan −
   celengan − pengeluaran), jadi ia naik ke atas dua kolom sebagai kartu
   full-width (audit UX #3) — lihat daily-hud-summary.tsx.
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
  /* ringkasan agregat periode (redesain 82) — daftar & fungsi yang SAMA dengan
     kartu di bawah, jadi strip atas tidak mungkin beda angka dari kartunya */
  const totals = budgetTotals(budgets)
  const totalsTone =
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
          className="group relative w-full overflow-hidden rounded-[1.6rem] bg-gradient-to-br from-sage via-cream to-cream p-4 text-left ring-1 ring-hud-sage/40 shadow-[0_20px_44px_-24px_rgba(181,185,135,0.95)] transition-transform duration-300 active:scale-[0.99]"
        >
          {/* glow lembut — satu-satunya elemen "bersinar" di halaman */}
          <span
            aria-hidden
            className="pointer-events-none absolute -right-8 -top-10 size-28 rounded-full bg-mint/45 blur-2xl"
          />
          <div className="relative flex items-start gap-3">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-cream text-[19px] ring-1 ring-soil/8">
              🧹
            </span>
            <div className="min-w-0">
              <p className="text-[14.5px] font-medium tracking-tight text-forest">
                {BUDGET_ZONE_A_COPY.sweepTitle}
              </p>
              <p className="mt-1 text-[12px] leading-relaxed text-forest/60">
                {BUDGET_ZONE_A_COPY.sweepLead}{' '}
                <b className="font-semibold text-forest tabular-nums">
                  {maskNominal(sweepTotal, masked)}
                </b>{' '}
                {BUDGET_ZONE_A_COPY.sweepTail}
              </p>
              <span className="mt-2 inline-flex items-center gap-1 text-[12px] font-medium text-forest">
                {BUDGET_ZONE_A_COPY.sweepCta}
                <span aria-hidden className="transition-transform group-hover:translate-x-0.5">
                  →
                </span>
              </span>
            </div>
          </div>
        </motion.button>
      )}

      {/* ── Jatah Hari Ini / Dry Spell PINDAH ke atas dua kolom ──────────────
          Kartu itu metrik super-hero global (audit UX #3), jadi dirender
          full-width oleh budget-screen lewat <DailyHudSummary />. */}


      {/* ── 3C. KARTU KENDALI PERIODE — tab + ringkasan dalam SATU permukaan ─
          REDESAIN paket 82 (round 2) + penyederhanaan round 3. Dulu tab periode
          & strip ringkasan adalah DUA blok terpisah yang menumpuk sebelum
          daftar, jadi mata harus melewati dua kotak sebelum kartu pertama.
          Sekarang keduanya tinggal di satu kartu: segmented control di atas,
          ringkasan di bawahnya. Saat periode belum punya budget, hanya tab-nya
          yang tampil — kartu tetap ringkas, tanpa angka nol palsu.

          ROUND 3 (minimalisme) — tiga hal yang dipadatkan:
            · nominal terpakai & limit kini SATU baris (`Rp X / Rp Y`), jadi
              kalimat kaki "dari Rp Y" tidak perlu diulang lagi;
            · kaki kartu menampilkan RENTANG periode aktif (`window.rangeLabel`)
              sehingga tab Mingguan/Bulanan/Siklus Gajian masing-masing
              memperlihatkan jendelanya sendiri — bukan tiga tampilan yang
              tampak identik;
            · persen diwarnai status yang SAMA dengan bar-nya (`PACING_HEX`,
              satu makna satu warna) supaya "seberapa penuh" terbaca dalam
              sekali lirik, tanpa angka tambahan.

          Pil aktif digambar sebagai satu lapisan `motion.span` ber-`layoutId`,
          jadi saat periode berganti pilnya MELUNCUR (bukan berkedip). Label &
          urutannya tetap dari `PERIOD_TABS`, `role="tablist"` +
          `aria-selected` tetap utuh untuk pembaca layar. */}
      <div className="rounded-[1.6rem] bg-cream p-3 ring-1 ring-soil/10 sm:p-3.5">
        <div
          role="tablist"
          aria-label={BUDGET_ZONE_A_COPY.periodTabsAria}
          className="relative flex items-center gap-0.5 rounded-full bg-sage/45 p-1 ring-1 ring-inset ring-soil/[0.07]"
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
                    className="absolute inset-0 rounded-full bg-forest shadow-[0_10px_20px_-10px_rgba(0,0,0,0.9)]"
                    transition={{ type: 'spring', stiffness: 520, damping: 38 }}
                  />
                )}
                <span
                  className={cn(
                    'relative z-10',
                    active ? 'text-cream' : 'text-forest/45 hover:text-forest',
                  )}
                >
                  {tab.label}
                </span>
              </button>
            )
          })}
        </div>

        {budgets.length > 0 && (
          <div className="px-1 pt-3.5">
            {/* satu baris: label + `terpakai / limit`. Limit ikut di sini supaya
                tidak perlu baris kaki kedua (dulu "dari Rp …"). */}
            <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
              <span className="text-[11.5px] font-medium text-forest/50">
                {BUDGET_ZONE_A_COPY.summaryLead}
              </span>
              <span className="flex items-baseline gap-1.5 tabular-nums">
                {/* angka agregat 18px — cukup jadi fokus, tidak menyaingi hero */}
                <span className="text-[18px] font-semibold leading-none tracking-tight text-forest">
                  {maskNominal(totals.spent, masked)}
                </span>
                <span className="text-[11px] font-medium text-forest/35">
                  / {maskNominal(totals.limit, masked)}
                </span>
              </span>
            </div>

            <div
              role="progressbar"
              aria-label={BUDGET_ZONE_A_COPY.summaryAria(
                maskNominal(totals.spent, masked),
                maskNominal(totals.limit, masked),
                Math.round(totals.percent),
              )}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={Math.min(100, Math.round(totals.percent))}
              className="mt-2.5 h-1.5 w-full overflow-hidden rounded-full bg-soil/[0.07]"
            >
              <div
                className="h-full rounded-full transition-[width] duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none"
                style={{
                  width: `${Math.min(100, totals.percent)}%`,
                  backgroundColor: PACING_HEX[totalsTone],
                }}
              />
            </div>

            {/* kaki: persen berwarna status (kiri) · rentang periode aktif (kanan) */}
            <div className="mt-1.5 flex items-center justify-between gap-2 text-[10.5px] tabular-nums">
              <span className="font-medium" style={{ color: PACING_HEX[totalsTone] }}>
                {Math.round(totals.percent)}% {BUDGET_ZONE_A_COPY.summaryPctSuffix}
              </span>
              <span className="text-forest/40">{window.rangeLabel}</span>
            </div>
          </div>
        )}
      </div>

      {/* ── 3D. DAFTAR BUDGET KATEGORI / 5A empty state ────────────────────
          Satu daftar dipakai untuk SEMUA tab: `budgets` sudah disaring periode
          aktif oleh budget-screen (`budgetsForPeriod`), dan tiap kartu memakai
          `window` yang sama supaya garis pacing-nya ikut panjang periode. */}
      {budgets.length === 0 ? (
        /* 5A. EMPTY STATE BUDGET (termasuk periode yang belum punya budget) */
        <div className="flex flex-col items-center rounded-[1.75rem] border border-dashed border-oat bg-cream/60 px-6 py-10 text-center">
          {/* emoji jadi ilustrasi ringan di dalam lingkaran sage — lebih tenang
              daripada dua emoji telanjang (redesain paket 82) */}
          <span className="flex size-14 items-center justify-center rounded-full bg-sage/60 text-[26px] ring-1 ring-soil/8">
            ☕
          </span>
          <p className="mx-auto mt-4 max-w-[19rem] text-[13px] leading-relaxed text-forest/60">
            {BUDGET_ZONE_A_COPY.emptyBody}
          </p>
          <button
            type="button"
            onClick={onAddBudget}
            className="mt-5 rounded-full bg-forest px-5 py-2.5 text-[12.5px] font-medium text-cream transition-colors hover:bg-forest-soft active:scale-95"
          >
            {BUDGET_ZONE_A_COPY.emptyCta}
          </button>
        </div>
      ) : (
        <div className="space-y-2.5">
          {budgets.map((budget, index) => (
            <motion.div
              key={budget.id}
              layout
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.04 * index, ease: [0.22, 1, 0.36, 1] }}
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

      {/* ── 3E. OVER-BUDGET AI COACH CTA (hanya kalau ada yang lewat limit) ─
          PAKET 78: satu baris fakta + satu tombol. Kalimat tanya "Mau review
          bareng AI Coach?" tidak lagi dirender (masih ada di
          `BUDGET_ZONE_A_COPY.overQuestion`) — pemilik produk meminta bagian ini
          lebih lengang, dan tombolnya sudah menjelaskan sendiri apa yang terjadi
          kalau ditekan. */}
      {overBudget.length > 0 && (
        <div className="flex flex-col gap-3 rounded-[1.5rem] bg-hud-terracotta/[0.07] p-4 ring-1 ring-hud-terracotta/15 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-[12.5px] leading-relaxed text-forest/65">
            {BUDGET_ZONE_A_COPY.overLead(overBudget.length, overBudget[0].category)}
          </p>
          {/* CTA review (prompt 19): membuka panel "Review Pengeluaran Hari
              Ini" di halaman ini lewat handler budget-screen — bukan toast dan
              bukan lompat ke widget AI. */}
          <button
            type="button"
            onClick={onReviewCoach}
            className="shrink-0 rounded-full bg-hud-terracotta/12 px-4 py-2 text-[12px] font-medium text-hud-terracotta transition-colors hover:bg-hud-terracotta/20 active:scale-95"
          >
            {BUDGET_ZONE_A_COPY.overCta}
          </button>
        </div>
      )}

      {/* ── H5-2. SARAN KATEGORI DARI RIWAYAT (audit UI/UX) ─────────────────────
          Halaman ini dulu cuma punya satu kategori budget. Saran ini datang dari
          baris ledger NYATA (`suggestedBudgetCategory` di lib/data/budget.ts) —
          kategori pengeluaran tersering yang BELUM punya limit. Klik = buka sheet
          tambah budget dengan kategori itu sudah terpilih. */}
      {suggestion && onAddSuggested && (
        <div className="flex items-start gap-3 rounded-[1.5rem] bg-sage/50 p-4 ring-1 ring-forest/10">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-2xl bg-cream text-forest ring-1 ring-soil/12">
            <Lightbulb className="size-4" strokeWidth={2.2} aria-hidden />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-[10.5px] font-semibold uppercase tracking-[0.12em] text-forest/45">
              {BUDGET_SUGGEST_COPY.title}
            </p>
            <p className="mt-1 text-[12.5px] leading-relaxed text-forest/70">
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

      {/* ── 3F. TAMBAH BUDGET — H5-5 (audit UI/UX): card placeholder yang
          mengajak (ilustrasi kecil + copy), bukan text link bergaris putus-putus
          yang terlalu subtle. ──────────────────────────────────────────────── */}
      <button
        type="button"
        onClick={onAddBudget}
        className="group flex w-full items-center gap-3 rounded-[1.5rem] border border-dashed border-forest/20 bg-gradient-to-br from-sage/40 to-cream px-4 py-3.5 text-left transition-all hover:border-forest/35 hover:shadow-[0_18px_40px_-30px_rgba(0,0,0,0.5)] active:scale-[0.99]"
      >
        <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-cream text-forest ring-1 ring-soil/12 transition-transform duration-300 group-hover:scale-105">
          <Plus className="size-5" strokeWidth={2.6} aria-hidden />
        </span>
        <span className="min-w-0">
          <span className="block text-[13px] font-medium text-forest">
            {BUDGET_ADD_PLACEHOLDER.budgetTitle}
          </span>
          <span className="mt-0.5 block text-[11.5px] leading-relaxed text-forest/50">
            {BUDGET_ADD_PLACEHOLDER.budgetBody}
          </span>
        </span>
      </button>
    </div>
  )
}
