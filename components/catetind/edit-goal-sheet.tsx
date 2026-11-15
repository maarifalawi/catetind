'use client'

import { useEffect, useState } from 'react'
import { BudgetSheet, RupiahField, SheetSubmit } from './budget-sheet'
import { FUND_EDIT_COPY, type SinkingFundItem } from '@/lib/data/budget'

/* ── UBAH CELENGAN (sesi 5) ──────────────────────────────────────────────────
   Sheet kecil untuk mengoreksi NAMA & TARGET celengan yang sudah ada. Tanpa
   ini, satu-satunya cara "mengubah" celengan adalah menghapusnya — dan itu ikut
   melepas progres yang sudah susah payah dikumpulkan.

   Isinya sengaja dua field saja:
     1. nama (identitas yang dibaca di /budget, Home, dan lembar ekspor);
     2. target (jarak yang masih dikejar — `current` TIDAK berubah).
   Submit memakai kit form bersama (`BudgetSheet`/`RupiahField`/`SheetSubmit`)
   supaya tempo, radius, dan perilaku keyboard-nya sama dengan sheet lain. */
export function EditGoalSheet({
  fund,
  open,
  onClose,
  onSave,
}: {
  /** celengan yang sedang dibuka; `null` = sheet tertutup */
  fund: SinkingFundItem | null
  open: boolean
  onClose: () => void
  onSave: (patch: { name: string; target: number }) => void
}) {
  const [name, setName] = useState('')
  const [digits, setDigits] = useState('')

  /* isi form dari celengan yang dibuka; tanpa reset ini nilai celengan
     sebelumnya bisa "menempel" ke celengan berikutnya */
  useEffect(() => {
    if (!open || !fund) return
    setName(fund.name)
    setDigits(String(fund.target))
  }, [open, fund])

  const target = Number(digits || '0')
  const ready = name.trim().length > 0 && target > 0

  return (
    <BudgetSheet
      open={open}
      onClose={onClose}
      title={FUND_EDIT_COPY.title}
      footer={
        <SheetSubmit
          onClick={() => {
            if (ready) onSave({ name: name.trim(), target })
          }}
          disabled={!ready}
          gate
          submitAttrs={{ 'data-catetind-fund-edit-submit': 'true' }}
        >
          {FUND_EDIT_COPY.submit}
        </SheetSubmit>
      }
    >
      <label className="block">
        <span className="text-[14px] font-medium leading-snug text-forest">
          {FUND_EDIT_COPY.nameLabel}
        </span>
        <input
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder={FUND_EDIT_COPY.namePlaceholder}
          data-catetind-fund-edit-name="true"
          className="mt-2 w-full rounded-2xl bg-cream px-4 py-3 text-[16px] font-medium text-forest outline-none ring-1 ring-soil/16 transition-shadow placeholder:font-medium placeholder:text-forest-muted focus:ring-2 focus:ring-forest/35"
        />
      </label>

      <RupiahField
        className="mt-4"
        label={FUND_EDIT_COPY.targetLabel}
        digits={digits}
        onDigitsChange={setDigits}
        placeholder="Rp 1.000.000"
      />
    </BudgetSheet>
  )
}
