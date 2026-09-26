'use client'

import { AnimatePresence, motion } from 'framer-motion'
import { Check } from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  LIFE_SITUATIONS,
  PERIOD_OPTIONS,
  clampPayday,
  type DashboardPeriod,
} from '@/lib/onboarding'
import { ONBOARD_CARD, OnboardLabel, OnboardingStepHeader } from './onboarding-ui'

/**
 * Step 1 — "Siapa Kamu?" (module gating + periode dashboard).
 *
 * Dua keputusan tetap digabung dalam satu layar (total onboarding 3 langkah, di
 * bawah 60 detik), tapi bentuknya dirombak jadi minimalis:
 * 1. situasi hidup (MULTI-select, minimal 1) → menentukan modul mana yang nyala
 *    (freelancer_budgeting / sandwich_generation / joint_wallet). Kartu 2x2
 *    ber-emoji besar + badge centang diganti BARIS rapi (emoji mungil di tile
 *    krem, label + keterangan, centang di kanan) — lebih tenang dibaca dan
 *    tingginya tetap 60px+ jadi nyaman disentuh.
 * 2. siklus dashboard → SEGMENTED CONTROL dua pilihan (bukan dua kartu besar
 *    ber-emoji). Keterangan pilihan aktif tampil sebagai satu baris redup.
 */
export function OnboardingStepSituation({
  selectedIds,
  onToggleSituation,
  period,
  onPeriodChange,
  paydayDate,
  onPaydayChange,
}: {
  selectedIds: string[]
  onToggleSituation: (id: string) => void
  period: DashboardPeriod
  onPeriodChange: (period: DashboardPeriod) => void
  paydayDate: number
  onPaydayChange: (day: number) => void
}) {
  /* modul yang menyala dari pilihan user — dipakai sebagai umpan balik kecil,
     jadi user tahu pilihannya "melakukan sesuatu" (bukan sekadar formalitas) */
  const activeModules = LIFE_SITUATIONS.filter(
    (item) => item.module && selectedIds.includes(item.id),
  )
  const activePeriod = PERIOD_OPTIONS.find((option) => option.id === period)

  return (
    <div>
      <OnboardingStepHeader
        title="Halo, kenalan dulu yuk."
        subtitle="Pilih yang paling menggambarkan situasimu sekarang. Bisa lebih dari satu."
      />

      {/* ── 1. situasi hidup (baris toggle) ────────────────────────────── */}
      <section className="mt-9">
        <OnboardLabel>Situasi kamu</OnboardLabel>

        <div role="group" aria-label="Situasi hidup" className="mt-3 space-y-2.5">
          {LIFE_SITUATIONS.map((item) => {
            const active = selectedIds.includes(item.id)
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onToggleSituation(item.id)}
                aria-pressed={active}
                className={cn(
                  'flex w-full items-center gap-3.5 px-4 py-3.5 text-left transition-all duration-200 active:scale-[0.99] motion-reduce:transition-none',
                  ONBOARD_CARD,
                  active
                    ? 'ring-[1.5px] ring-forest'
                    : 'ring-1 ring-ink/[0.06] hover:ring-ink/[0.12]',
                )}
              >
                <span
                  aria-hidden
                  className="flex size-10 shrink-0 items-center justify-center rounded-[0.9rem] bg-cream text-[17px]"
                >
                  {item.emoji}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[15px] font-medium leading-snug tracking-[-0.01em] text-ink">
                    {item.label}
                  </span>
                  <span className="mt-0.5 block text-[12.5px] leading-snug text-ink/45">
                    {item.subtitle}
                  </span>
                </span>
                <span
                  className={cn(
                    'flex size-5 shrink-0 items-center justify-center rounded-full transition-colors duration-200',
                    active ? 'bg-forest text-cream' : 'ring-[1.5px] ring-ink/15',
                  )}
                >
                  {active && <Check className="size-3" strokeWidth={3.2} />}
                </span>
              </button>
            )
          })}
        </div>

        {/* chip "Modul yang nyala" diganti satu baris redup — informasinya tetap
            ada (pilihan user berpengaruh), tapi tanpa tumpukan pill berwarna */}
        <AnimatePresence initial={false}>
          {activeModules.length > 0 && (
            <motion.p
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              className="mt-3 pl-1 text-[12px] font-medium text-forest/70"
            >
              Modul aktif: {activeModules.map((item) => item.moduleLabel).join(' · ')}
            </motion.p>
          )}
        </AnimatePresence>
      </section>

      {/* ── 2. periode dashboard (segmented control) ───────────────────── */}
      <section className="mt-9">
        <OnboardLabel>Siklus keuangan</OnboardLabel>

        <div
          role="radiogroup"
          aria-label="Periode dashboard"
          className="mt-3 flex rounded-full bg-ink/[0.05] p-1"
        >
          {PERIOD_OPTIONS.map((option) => {
            const active = option.id === period
            return (
              <button
                key={option.id}
                type="button"
                role="radio"
                aria-checked={active}
                onClick={() => onPeriodChange(option.id)}
                className={cn(
                  'flex-1 rounded-full py-2.5 text-[13px] font-medium tracking-[-0.01em] transition-all duration-200',
                  active
                    ? 'bg-white text-ink shadow-[0_1px_3px_rgba(18,40,31,0.12)]'
                    : 'text-ink/45 hover:text-ink/70',
                )}
              >
                {option.label}
              </button>
            )
          })}
        </div>
        <p className="mt-3 pl-1 text-[12.5px] leading-relaxed text-ink/45">
          {activePeriod?.helper}
        </p>

        {/* tanggal gajian hanya muncul saat "Siklus Gajian" dipilih, tinggi
            dianimasikan supaya transisi tidak bikin halaman melompat */}
        <AnimatePresence initial={false}>
          {period === 'cycle' && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2, ease: [0.32, 0.72, 0, 1] }}
              className="overflow-hidden"
            >
              <label
                className={cn(
                  'mt-3 flex items-center justify-between gap-3 px-4 py-3.5 ring-1 ring-ink/[0.06]',
                  ONBOARD_CARD,
                )}
              >
                <span className="text-[14px] font-medium tracking-[-0.01em] text-ink">
                  Tanggal gajian
                </span>
                <input
                  type="number"
                  min={1}
                  max={31}
                  inputMode="numeric"
                  value={paydayDate}
                  onChange={(event) => onPaydayChange(clampPayday(event.target.value))}
                  aria-label="Tanggal gajian (1 sampai 31)"
                  className="w-16 rounded-xl bg-ink/[0.04] py-1.5 text-center text-[15px] font-semibold tabular-nums text-ink outline-none ring-1 ring-transparent transition-all focus:bg-white focus:ring-forest/25"
                />
              </label>
            </motion.div>
          )}
        </AnimatePresence>
      </section>
    </div>
  )
}
