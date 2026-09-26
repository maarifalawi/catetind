'use client'

import { useEffect, useState } from 'react'
import { ChevronDown } from 'lucide-react'
import { BudgetSheet, SheetSubmit } from './budget-sheet'
import {
  maskNominal,
  surplusBudgets,
  totalSurplus,
  type BudgetItem,
  type SinkingFundItem,
} from '@/lib/data/budget'

/* ── 3G. Sapu Bersih — pindahkan sisa budget jadi tabungan impian ────────────
   Modal kecil: rincian sisa tiap kategori + satu dropdown tujuan celengan.
   Setelah dikonfirmasi, sisa tiap kategori dianggap terpakai (limitnya nol)
   dan saldo celengan tujuan bertambah — mock, diganti API nanti.
   ────────────────────────────────────────────────────────────────────────── */

export function SweepSheet({
  open,
  onClose,
  budgets,
  funds,
  masked,
  onConfirm,
}: {
  open: boolean
  onClose: () => void
  budgets: BudgetItem[]
  funds: SinkingFundItem[]
  masked: boolean
  onConfirm: (fundId: number) => void
}) {
  const [fundId, setFundId] = useState<number | null>(funds[0]?.id ?? null)

  useEffect(() => {
    if (!open) return
    setFundId(funds[0]?.id ?? null)
  }, [open, funds])

  const surplus = surplusBudgets(budgets)
  const total = totalSurplus(budgets)
  const target = funds.find((fund) => fund.id === fundId) ?? null

  return (
    <BudgetSheet
      open={open}
      onClose={onClose}
      title="Sapu Bersih Sisa Budget"
      description="Sisa budget bulan ini dipindah jadi tabungan impian."
      footer={
        <SheetSubmit
          disabled={!target || total <= 0}
          onClick={() => {
            if (!target) return
            onConfirm(target.id)
          }}
        >
          Sapu ke {target ? target.name : 'Celengan'} →
        </SheetSubmit>
      }
    >
      {/* rincian sisa per kategori */}
      <div className="overflow-hidden rounded-2xl bg-cream ring-1 ring-soil/[0.06]">
        {surplus.map((budget, index) => (
          <div
            key={budget.id}
            className={
              index === 0
                ? 'flex items-center justify-between gap-3 px-4 py-3'
                : 'flex items-center justify-between gap-3 border-t border-soil/[0.05] px-4 py-3'
            }
          >
            <span className="flex min-w-0 items-center gap-2.5">
              <span className="text-[16px] leading-none">{budget.icon}</span>
              <span className="truncate text-[13px] font-semibold text-ink">
                {budget.category}
              </span>
            </span>
            <span className="shrink-0 text-[13px] font-bold text-forest tabular-nums">
              + {maskNominal(budget.limit - budget.spent, masked)}
            </span>
          </div>
        ))}
      </div>

      {/* total yang akan disapu */}
      <div className="mt-3 flex items-center justify-between gap-3 rounded-2xl bg-sage/60 px-4 py-3">
        <span className="text-[12.5px] font-semibold text-ink/60">Total keseluruhan</span>
        <span className="text-[15px] font-black text-forest tabular-nums">
          {maskNominal(total, masked)}
        </span>
      </div>

      {/* tujuan celengan — dropdown, hemat ruang */}
      <div className="mt-5 pb-1">
        <p className="text-[13px] font-semibold text-ink">Sapu ke celengan mana?</p>
        <span className="relative mt-2 flex items-center gap-2 rounded-2xl bg-cream px-4 py-3 ring-1 ring-soil/[0.08] focus-within:ring-2 focus-within:ring-forest/35">
          <select
            value={fundId ?? ''}
            onChange={(event) => setFundId(Number(event.target.value))}
            aria-label="Pilih celengan tujuan"
            className="flex-1 appearance-none bg-transparent text-[13.5px] font-semibold text-ink outline-none"
          >
            {funds.map((fund) => (
              <option key={fund.id} value={fund.id}>
                {fund.name}
              </option>
            ))}
          </select>
          <ChevronDown className="size-4 shrink-0 text-ink/30" strokeWidth={2.4} />
        </span>
        <p className="mt-2 text-[11px] leading-relaxed text-ink/40">
          Sisa tiap kategori dianggap terpakai, jadi limitnya mulai dari nol lagi bulan depan.
        </p>
      </div>
    </BudgetSheet>
  )
}
