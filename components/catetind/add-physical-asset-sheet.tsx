'use client'

import { useEffect, useRef, useState } from 'react'
import { BudgetSheet, ChoicePills, DateField, RupiahField, SheetSubmit, useFocusOnOpen } from './budget-sheet'
import type { BudgetScope } from '@/lib/data/budget'
import {
  PHYSICAL_ASSET_CATEGORY_OPTIONS,
  PHYSICAL_TAB_COPY,
  type PhysicalAsset,
  type PhysicalAssetCategory,
} from '@/lib/data/wealth'

/* ── MODAL `u` · TAMBAH / EDIT ASET FISIK (inventaris) — paket 63 ────────────
   Form sesuai inventaris: Nama aset, Kategori, Harga beli, Nilai sekarang.
   Memakai primitif sheet yang SUDAH ada (`BudgetSheet`, `RupiahField`,
   `ChoicePills`, `SheetSubmit`) supaya tidak ada gaya form baru. Satu komponen
   untuk Tambah & Edit; `editing` mengisi nilai awal. Semua teks dari
   `PHYSICAL_TAB_COPY.form` — nol string di JSX. */

export interface PhysicalSaveInput {
  name: string
  category: PhysicalAssetCategory
  purchasePrice: number
  currentValue: number
  acquiredAt?: string
  note?: string
  scope: BudgetScope
}

export function AddPhysicalAssetSheet({
  open,
  onClose,
  scope,
  editing,
  onSave,
}: {
  open: boolean
  onClose: () => void
  scope: BudgetScope
  /** aset yang sedang diedit; `null` = mode Tambah */
  editing: PhysicalAsset | null
  onSave: (input: PhysicalSaveInput) => void
}) {
  const [name, setName] = useState('')
  const [category, setCategory] = useState<PhysicalAssetCategory>('rumah')
  const [purchaseDigits, setPurchaseDigits] = useState('')
  const [valueDigits, setValueDigits] = useState('')
  const [acquiredAt, setAcquiredAt] = useState('')
  const [note, setNote] = useState('')
  const [error, setError] = useState<string | null>(null)
  const nameRef = useRef<HTMLInputElement>(null)

  /* form selalu mulai dari data yang benar tiap kali dibuka */
  useEffect(() => {
    if (!open) return
    setName(editing?.name ?? '')
    setCategory(editing?.category ?? 'rumah')
    setPurchaseDigits(editing ? String(editing.purchasePrice || '') : '')
    setValueDigits(editing ? String(editing.currentValue || '') : '')
    setAcquiredAt(editing?.acquiredAt ?? '')
    setNote(editing?.note ?? '')
    setError(null)
  }, [open, editing])

  useFocusOnOpen(open, nameRef)

  const currentValue = Number(valueDigits || '0')
  const purchasePrice = Number(purchaseDigits || '0')

  function submit() {
    if (!name.trim()) {
      setError(PHYSICAL_TAB_COPY.form.needName)
      return
    }
    if (currentValue <= 0) {
      setError(PHYSICAL_TAB_COPY.form.needValue)
      return
    }
    onSave({
      name: name.trim(),
      category,
      purchasePrice,
      currentValue,
      acquiredAt: acquiredAt || undefined,
      note: note.trim() || undefined,
      scope,
    })
    onClose()
  }

  return (
    <BudgetSheet
      open={open}
      onClose={onClose}
      title={editing ? PHYSICAL_TAB_COPY.form.editTitle : PHYSICAL_TAB_COPY.form.addTitle}
      footer={
        <SheetSubmit gate onClick={submit}>
          {PHYSICAL_TAB_COPY.form.save}
        </SheetSubmit>
      }
    >
      <div className="space-y-4">
        <label className="block">
          <span className="mb-1 block text-[11px] font-medium uppercase tracking-wide text-forest/45">
            {PHYSICAL_TAB_COPY.form.name}
          </span>
          <input
            ref={nameRef}
            value={name}
            onChange={(event) => {
              setName(event.target.value)
              setError(null)
            }}
            placeholder={PHYSICAL_TAB_COPY.form.namePlaceholder}
            className="w-full rounded-xl bg-soil/[0.09] px-3.5 py-2.5 text-[14px] font-medium text-forest outline-none ring-1 ring-transparent transition-all focus:bg-cream focus:ring-forest/15"
          />
        </label>

        <div>
          <span className="mb-1 block text-[11px] font-medium uppercase tracking-wide text-forest/45">
            {PHYSICAL_TAB_COPY.form.category}
          </span>
          <ChoicePills
            options={PHYSICAL_ASSET_CATEGORY_OPTIONS}
            value={category}
            onChange={setCategory}
            ariaLabel={PHYSICAL_TAB_COPY.form.category}
          />
        </div>

        <RupiahField
          label={PHYSICAL_TAB_COPY.form.purchasePrice}
          digits={purchaseDigits}
          onDigitsChange={setPurchaseDigits}
          placeholder="Rp 0"
        />
        <RupiahField
          label={PHYSICAL_TAB_COPY.form.currentValue}
          digits={valueDigits}
          onDigitsChange={(digits) => {
            setValueDigits(digits)
            setError(null)
          }}
          placeholder="Rp 0"
        />

        <DateField
          label={PHYSICAL_TAB_COPY.form.acquiredAt}
          value={acquiredAt}
          onChange={setAcquiredAt}
        />

        <label className="block">
          <span className="mb-1 block text-[11px] font-medium uppercase tracking-wide text-forest/45">
            {PHYSICAL_TAB_COPY.form.note}
          </span>
          <textarea
            value={note}
            onChange={(event) => setNote(event.target.value)}
            rows={2}
            className="w-full resize-none rounded-xl bg-soil/[0.09] px-3.5 py-2.5 text-[13px] text-forest outline-none ring-1 ring-transparent focus:bg-cream focus:ring-forest/15"
          />
        </label>

        {error && (
          <p role="alert" className="text-[12px] font-medium text-hud-terracotta">
            {error}
          </p>
        )}
      </div>
    </BudgetSheet>
  )
}
