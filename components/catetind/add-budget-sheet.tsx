'use client'

import { useEffect, useRef, useState } from 'react'
import {
  BudgetSheet,
  ChoicePills,
  RevealStep,
  RupiahField,
  SheetSubmit,
  useFocusOnOpen,
} from './budget-sheet'
import { cn } from '@/lib/utils'
import {
  BUDGET_ADD_COPY,
  BUDGET_CATEGORY_OPTIONS,
  BUDGET_PERIOD_OPTIONS,
  formatIDR,
  periodLimitWord,
  periodUnitWord,
  type BudgetItem,
  type BudgetPeriod,
  type BudgetScope,
} from '@/lib/data/budget'

/* ── 3F. Tambah Budget Baru — progressive disclosure 3 langkah ───────────────
   Step 1 kategori (langsung terlihat) → Step 2 nominal (auto-reveal setelah
   kategori dipilih) → Step 3 periode (auto-reveal setelah nominal terisi).
   Tombol simpan baru aktif kalau langkah wajib sudah lengkap, jadi tidak ada
   pesan error yang menghakimi.

   Periode TIDAK dimulai dari nol: sheet mewarisi tab yang sedang aktif
   (`initialPeriod`), jadi user yang sedang melihat tab Mingguan/Siklus Gajian
   tidak perlu memilih ulang — dan tidak diam-diam dibuatkan budget bulanan.
   ────────────────────────────────────────────────────────────────────────── */

export function AddBudgetSheet({
  open,
  onClose,
  scope,
  initialPeriod,
  onSave,
}: {
  open: boolean
  onClose: () => void
  /** konteks aktif halaman — budget baru otomatis masuk konteks ini */
  scope: BudgetScope
  /** periode tab yang sedang aktif di halaman — jadi nilai awal form */
  initialPeriod: BudgetPeriod
  onSave: (budget: Omit<BudgetItem, 'id' | 'spent'>) => void
}) {
  const [category, setCategory] = useState<{ label: string; icon: string } | null>(null)
  const [digits, setDigits] = useState('')
  const [period, setPeriod] = useState<BudgetPeriod>(initialPeriod)
  const amountRef = useRef<HTMLInputElement>(null)

  /* form selalu mulai bersih tiap kali dibuka, tapi periode ikut tab aktif */
  useEffect(() => {
    if (!open) return
    setCategory(null)
    setDigits('')
    setPeriod(initialPeriod)
  }, [open, initialPeriod])

  useFocusOnOpen(open && category !== null, amountRef)

  const amount = Number(digits || '0')
  const ready = category !== null && amount > 0
  const periodWord = periodLimitWord(period)

  function submit() {
    if (!category || amount <= 0) return
    onSave({ category: category.label, icon: category.icon, limit: amount, period, scope })
  }

  return (
    <BudgetSheet
      open={open}
      onClose={onClose}
      title={BUDGET_ADD_COPY.title}
      description={BUDGET_ADD_COPY.description}
      footer={
        <SheetSubmit onClick={submit} disabled={!ready} gate>
          {BUDGET_ADD_COPY.submit}
        </SheetSubmit>
      }
    >
      {/* ── STEP 1 — kategori ──────────────────────────────────────────── */}
      <div
        role="radiogroup"
        aria-label={BUDGET_ADD_COPY.categoryLabel}
        className="grid grid-cols-2 gap-2 sm:grid-cols-4"
      >
        {BUDGET_CATEGORY_OPTIONS.map((option) => {
          const active = category?.label === option.label
          return (
            <button
              key={option.label}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => setCategory(option)}
              className={cn(
                'flex items-center gap-2 rounded-2xl px-3 py-2.5 text-left text-[12.5px] font-semibold transition-all duration-200 active:scale-95',
                active
                  ? 'bg-forest text-mint ring-2 ring-forest'
                  : 'bg-cream text-ink/70 ring-1 ring-soil/14 hover:bg-cream hover:text-ink',
              )}
            >
              <span className="text-[16px] leading-none">{option.icon}</span>
              <span className="truncate">{option.label}</span>
            </button>
          )
        })}
      </div>

      {/* ── STEP 2 — nominal (auto-reveal) ─────────────────────────────── */}
      <RevealStep show={category !== null}>
        <div className="mt-5">
          <RupiahField
            label={BUDGET_ADD_COPY.amountLabel(category?.label ?? '', periodWord)}
            digits={digits}
            onDigitsChange={setDigits}
            placeholder="Rp 500.000"
            inputRef={amountRef}
            hint={BUDGET_ADD_COPY.amountHint}
          />
        </div>
      </RevealStep>

      {/* ── STEP 3 — periode (auto-reveal) ─────────────────────────────── */}
      <RevealStep show={amount > 0}>
        <div className="mt-5 pb-1">
          <p className="text-[13px] font-semibold text-ink">{BUDGET_ADD_COPY.periodTitle}</p>
          <ChoicePills
            className="mt-2.5"
            options={BUDGET_PERIOD_OPTIONS}
            value={period}
            onChange={setPeriod}
            ariaLabel={BUDGET_ADD_COPY.periodAria}
          />
          <p className="mt-3 text-[11px] leading-relaxed text-ink/40">
            {BUDGET_ADD_COPY.footer(formatIDR(amount), periodUnitWord(period))}
          </p>
        </div>
      </RevealStep>
    </BudgetSheet>
  )
}
