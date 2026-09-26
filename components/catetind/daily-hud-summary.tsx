'use client'

import { AlertTriangle, HandCoins, Pin, Sparkles } from 'lucide-react'
import { cn } from '@/lib/utils'
import { maskNominal, type BudgetHud } from '@/lib/data/budget'
import { TransactionBottomSheet } from '@/components/dashboard/transaction-bottom-sheet'

/* ── Jatah Hari Ini — KARTU SUPER-HERO (full-width, di atas dua kolom) ───────
   Audit UX #3: Jatah Harian adalah metrik GLOBAL (pemasukan − cicilan −
   celengan − pengeluaran), jadi tidak boleh dikurung di dalam kolom "Budget
   Kategori". Kartu ini membentang penuh SEBELUM halaman terbelah dua.

   Audit UX #2: angkanya dihitung SETELAH sinking fund. Kalau saldo tidak cukup
   memenuhi target celengan bulan ini, kartunya pindah ke nada terracotta dan
   jatah harian DITAHAN (bukan ditampilkan seolah aman dibelanjakan).

   Audit UX #5: tombol "Sinkron Dashboard" dihapus — app punya satu sumber
   kebenaran. Penggantinya tombol "Pin ke Dashboard". */

export function DailyHudSummary({
  hud,
  masked,
  hasIncomeThisMonth,
  pinned,
  onPin,
}: {
  hud: BudgetHud
  masked: boolean
  hasIncomeThisMonth: boolean
  /** true = kartu ini sudah disematkan ke Dashboard */
  pinned: boolean
  onPin: () => void
}) {
  return (
    <section aria-label="Jatah hari ini" className="w-full">
      {!hasIncomeThisMonth ? (
        /* ── 3B. DRY SPELL — menggantikan SELURUH HUD (tanpa Rp 0/hari) ──── */
        <div className="rounded-[1.6rem] bg-cream p-4 ring-1 ring-soil/5 shadow-[0_12px_28px_-24px_rgba(69,89,78,0.5)]">
          <div className="flex flex-col items-center rounded-[1.3rem] bg-cream px-6 py-7 text-center ring-1 ring-soil/[0.04]">
            <span className="text-[26px]">💼</span>
            <p className="mt-3 text-[14.5px] font-bold leading-snug text-ink">
              Belum ada pemasukan bulan ini.
            </p>
            <p className="mt-1 text-[13px] leading-relaxed text-ink/55">
              Yuk catat begitu masuk! 💪
            </p>
            {/* CTA nyata: buka Transaction Input Engine dengan tipe Pemasukan */}
            <TransactionBottomSheet
              defaultType="income"
              trigger={
                <button
                  type="button"
                  className="mt-4 rounded-full bg-forest px-4 py-2.5 text-[12.5px] font-semibold text-cream transition-colors hover:bg-forest-soft active:scale-95"
                >
                  + Catat Pemasukan
                </button>
              }
            />
          </div>
        </div>
      ) : hud.shortfall ? (
        /* ── SHORTFALL — saldo tidak cukup untuk celengan bulan ini ───────── */
        <div className="relative overflow-hidden rounded-[1.6rem] bg-gradient-to-br from-hud-terracotta/[0.14] via-cream to-hud-amber/[0.14] p-4 ring-1 ring-hud-terracotta/25 shadow-[0_14px_30px_-24px_rgba(184,145,145,0.85)]">
          <div className="flex items-center justify-between gap-3">
            <p className="text-[12.5px] font-semibold text-hud-terracotta">Jatah Hari Ini</p>
            <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-hud-terracotta/12 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-hud-terracotta ring-1 ring-hud-terracotta/20">
              <AlertTriangle className="size-3" strokeWidth={2.6} />
              Jatah ditahan
            </span>
          </div>

          <p className="mt-2 text-[32px] font-black leading-none tracking-tight text-hud-terracotta tabular-nums">
            {maskNominal(hud.dailyBudget, masked)}
          </p>
          <p className="mt-1.5 text-[12px] font-medium text-ink/55">
            sisa jatah harian ditahan bulan ini
          </p>

          {/* pesan AI — menahan tanpa menuduh (nada PRD) */}
          <div className="mt-3 flex items-start gap-2.5 rounded-2xl bg-cream/70 px-3.5 py-3 ring-1 ring-hud-terracotta/15">
            <Sparkles className="mt-0.5 size-4 shrink-0 text-hud-terracotta" strokeWidth={2.4} />
            <p className="text-[12px] font-medium leading-relaxed text-ink/70">
              ⚠️ Saldo tidak cukup untuk penuhi target celengan bulan ini. Jatah harianmu ditahan.
            </p>
          </div>

          {/* meta — kenapa ditahan: kurang sekian dari celengan bulan ini */}
          <p className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1.5 border-t border-hud-terracotta/15 pt-2.5 text-[11px] text-ink/55">
            <span>
              Kurang{' '}
              <b className="font-bold text-hud-terracotta tabular-nums">
                {maskNominal(Math.abs(hud.remaining), masked)}
              </b>
            </span>
            <span aria-hidden className="size-1 rounded-full bg-ink/20" />
            <span>
              Celengan bulan ini{' '}
              <b className="font-semibold text-ink tabular-nums">
                {maskNominal(hud.sinkingObligation, masked)}
              </b>
            </span>
            <span aria-hidden className="size-1 rounded-full bg-ink/20" />
            <span className="tabular-nums">{hud.daysLeft} hari lagi</span>
          </p>
        </div>
      ) : (
        /* ── 3A. DAILY HUD NORMAL — jatah aman SETELAH celengan ───────────── */
        <div className="rounded-[1.6rem] bg-cream p-4 ring-1 ring-soil/5 shadow-[0_12px_28px_-24px_rgba(69,89,78,0.5)]">
          <div className="flex items-center justify-between gap-3">
            <span className="inline-flex items-center gap-2 text-[12.5px] font-semibold text-ink/55">
              <span className="flex size-6 items-center justify-center rounded-full bg-sage text-forest">
                <HandCoins className="size-3.5" strokeWidth={2.4} />
              </span>
              Jatah Hari Ini
            </span>
            {/* Audit UX #5 — tombol "Sinkron Dashboard" diganti "Pin" */}
            <button
              type="button"
              onClick={onPin}
              aria-pressed={pinned}
              className={cn(
                'inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-semibold ring-1 transition-colors active:scale-95',
                pinned
                  ? 'bg-forest text-mint ring-forest/20 hover:bg-forest-soft'
                  : 'bg-cream text-ink/45 ring-soil/[0.04] hover:bg-sage hover:text-forest',
              )}
            >
              <Pin className="size-3" strokeWidth={2.4} />
              {pinned ? 'Terpin ke Dashboard' : 'Pin ke Dashboard'}
            </button>
          </div>

          <p className="mt-2 text-[32px] font-black leading-none tracking-tight text-ink tabular-nums">
            {maskNominal(hud.dailyBudget, masked)}
          </p>

          <p className="mt-2 text-[12px] font-medium text-ink/55">
            Sisa bulan:{' '}
            <b className="font-bold text-ink tabular-nums">
              {maskNominal(hud.remaining, masked)}
            </b>{' '}
            · {hud.daysLeft} hari lagi
          </p>

          {/* kenapa pool-nya lebih kecil — cicilan & celengan dipotong DULU */}
          <p className="mt-2 border-t border-soil/[0.06] pt-2 text-[10.5px] text-ink/35">
            Setelah dipotong cicilan {maskNominal(hud.installments, masked)} &amp; celengan{' '}
            {maskNominal(hud.sinkingObligation, masked)}
          </p>
        </div>
      )}
    </section>
  )
}
