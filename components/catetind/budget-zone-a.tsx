'use client'

import { motion } from 'framer-motion'
import { BudgetCategoryCard } from './budget-category-card'
import { cn } from '@/lib/utils'
import {
  SWEEP_TRIGGER_DAY,
  maskNominal,
  spentPercent,
  surplusBudgets,
  totalSurplus,
  type BudgetItem,
  type BudgetPeriod,
} from '@/lib/data/budget'

/* ── ZONA A — Budget Kategori (spending limits) ──────────────────────────────
   Urutan & semua elemennya CONDITIONAL supaya layar tetap lengang:

   1. Kartu Sapu Bersih      → hanya 3 hari terakhir bulan + ada sisa budget
   2. Pill periode           → Mingguan / Bulanan / Siklus Gajian (placeholder)
   3. Daftar kategori        → bar progres + ghost pacing line
   4. Banner AI Coach        → hanya kalau ada kategori over budget
   5. Tambah budget / empty state

   Catatan: kartu "Jatah Hari Ini" / Dry Spell TIDAK lagi di sini. Jatah Harian
   adalah metrik super-hero GLOBAL (hasil kalkulasi pemasukan − cicilan −
   celengan − pengeluaran), jadi ia naik ke atas dua kolom sebagai kartu
   full-width (audit UX #3) — lihat daily-hud-summary.tsx.
   ────────────────────────────────────────────────────────────────────────── */

const PERIOD_TABS: { id: BudgetPeriod | 'payday'; label: string }[] = [
  { id: 'weekly', label: 'Mingguan' },
  { id: 'monthly', label: 'Bulanan' },
  { id: 'payday', label: 'Siklus Gajian' },
]

export function BudgetZoneA({
  budgets,
  masked,
  currentDay,
  periodTab,
  onPeriodChange,
  onAddBudget,
  onSweep,
  onReviewCoach,
}: {
  budgets: BudgetItem[]
  masked: boolean
  currentDay: number
  periodTab: BudgetPeriod | 'payday'
  onPeriodChange: (tab: BudgetPeriod | 'payday') => void
  onAddBudget: () => void
  onSweep: () => void
  onReviewCoach: () => void
}) {
  const surplus = surplusBudgets(budgets)
  const sweepTotal = totalSurplus(budgets)
  /* 3G: hanya di 3 hari terakhir bulan + masih ada sisa budget */
  const showSweep = currentDay >= SWEEP_TRIGGER_DAY && surplus.length > 0
  const overBudget = budgets.filter((b) => spentPercent(b) >= 100)

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
          className="group relative w-full overflow-hidden rounded-[1.6rem] bg-gradient-to-br from-sage via-cream to-white p-4 text-left ring-1 ring-hud-sage/40 shadow-[0_20px_44px_-24px_rgba(163,177,138,0.95)] transition-transform duration-300 active:scale-[0.99]"
        >
          {/* glow lembut — satu-satunya elemen "bersinar" di halaman */}
          <span
            aria-hidden
            className="pointer-events-none absolute -right-8 -top-10 size-28 rounded-full bg-mint/45 blur-2xl"
          />
          <div className="relative flex items-start gap-3">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-white text-[19px] ring-1 ring-black/[0.04]">
              🧹
            </span>
            <div className="min-w-0">
              <p className="text-[14.5px] font-bold tracking-tight text-forest">
                Sapu Bersih Sisa Budget!
              </p>
              <p className="mt-1 text-[12px] leading-relaxed text-ink/60">
                Bulan ini kamu hemat{' '}
                <b className="font-bold text-ink tabular-nums">
                  {maskNominal(sweepTotal, masked)}
                </b>{' '}
                dari budget! Mau disapu masuk ke celengan?
              </p>
              <span className="mt-2 inline-flex items-center gap-1 text-[12px] font-bold text-forest">
                Sapu ke Celengan
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


      {/* ── 3C. PERIOD TABS (filter masa depan — minimalis dulu) ─────────── */}
      <div role="tablist" aria-label="Periode budget" className="flex items-center gap-2 px-0.5">
        {PERIOD_TABS.map((tab) => {
          const active = periodTab === tab.id
          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => onPeriodChange(tab.id)}
              className={cn(
                'rounded-full px-3 py-1.5 text-[11.5px] font-semibold transition-all duration-200 active:scale-95',
                active
                  ? 'bg-white text-forest ring-1 ring-forest/20 shadow-[0_8px_18px_-14px_rgba(16,58,42,0.7)]'
                  : 'text-ink/40 hover:text-ink/70',
              )}
            >
              {tab.label}
            </button>
          )
        })}
      </div>

      {/* ── 3D. DAFTAR BUDGET KATEGORI / 3C placeholder / 5A empty ───────── */}
      {periodTab !== 'monthly' ? (
        <div className="rounded-[1.4rem] border border-dashed border-slate-200 bg-white/50 px-5 py-9 text-center">
          <p className="text-[13px] font-bold text-ink/50">Segera hadir</p>
          <p className="mx-auto mt-1.5 max-w-[16rem] text-[11.5px] leading-relaxed text-ink/35">
            Filter periode {PERIOD_TABS.find((t) => t.id === periodTab)?.label.toLowerCase()}{' '}
            sedang disiapkan. Sementara daftarnya masih bulanan ya 🌿
          </p>
        </div>
      ) : budgets.length === 0 ? (
        /* 5A. EMPTY STATE BUDGET */
        <div className="rounded-[1.6rem] border border-dashed border-slate-200 bg-white/60 px-6 py-9 text-center">
          {/* TODO: add cute empty state illustration */}
          <span className="text-[28px]">☕🌱</span>
          <p className="mx-auto mt-3 max-w-[19rem] text-[13px] leading-relaxed text-ink/60">
            Belum ada budget? Santai, mulai dari yang kecil aja. Coba atur limit Kopi dulu!
          </p>
          <button
            type="button"
            onClick={onAddBudget}
            className="mt-4 rounded-full bg-forest px-4 py-2.5 text-[12.5px] font-semibold text-cream transition-colors hover:bg-forest-soft active:scale-95"
          >
            Buat Budget Pertama
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {budgets.map((budget, index) => (
            <motion.div
              key={budget.id}
              layout
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.04 * index, ease: [0.22, 1, 0.36, 1] }}
            >
              <BudgetCategoryCard budget={budget} masked={masked} onReview={onReviewCoach} />
            </motion.div>
          ))}
        </div>
      )}

      {/* ── 3E. OVER-BUDGET AI COACH CTA (hanya kalau ada yang lewat limit) ─ */}
      {overBudget.length > 0 && (
        <div className="flex flex-col gap-3 rounded-[1.5rem] bg-hud-terracotta/[0.07] p-4 ring-1 ring-hud-terracotta/15 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-[12.5px] leading-relaxed text-ink/65">
            {overBudget.length > 1
              ? `Ada ${overBudget.length} kategori yang overbudget.`
              : `Kategori ${overBudget[0].category} overbudget.`}{' '}
            Mau review bareng AI Coach? 🤖
          </p>
          {/* TODO: Link to AI Coach panel */}
          <button
            type="button"
            onClick={onReviewCoach}
            className="shrink-0 rounded-full bg-hud-terracotta/12 px-4 py-2 text-[12px] font-bold text-hud-terracotta transition-colors hover:bg-hud-terracotta/20 active:scale-95"
          >
            Review Pengeluaran Hari Ini
          </button>
        </div>
      )}

      {/* ── 3F. TAMBAH BUDGET (dashed — nol bobot visual sampai dibutuhkan) ─ */}
      <button
        type="button"
        onClick={onAddBudget}
        className="flex w-full items-center justify-center gap-2 rounded-[1.4rem] border-2 border-dashed border-slate-200 bg-white/45 px-4 py-4 text-[12.5px] font-semibold text-ink/45 transition-all hover:border-forest/25 hover:bg-white hover:text-ink active:scale-[0.99]"
      >
        <span className="text-[15px] leading-none">+</span>
        Tambah Budget Baru
      </button>
    </div>
  )
}
