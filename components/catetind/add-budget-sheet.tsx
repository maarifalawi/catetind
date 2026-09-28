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
  BUDGET_EDIT_COPY,
  BUDGET_PERIOD_OPTIONS,
  budgetSheetMode,
  categoryOptionOf,
  findBudgetByCategory,
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

   PAKET 28 — satu kategori satu limit. Mode sheet TIDAK dipilih user, tapi
   DISIMPULKAN dari kategori yang sedang terpilih (`budgetSheetMode`):
     • kategori belum punya limit → "Tambah Budget Baru" (baris baru),
     • kategori sudah punya limit → "Atur Ulang Limit" (angka lama terisi,
       simpan = MENGUBAH baris itu).
   Karena kesimpulannya mengikuti pilihan kategori, jalur pintas dari insight
   (`/budget?add=Kopi`) DAN tombol "+ Tambah Budget Baru" di halaman Budget
   dua-duanya aman: tidak ada lagi jalan yang bisa membuat baris kategori ganda.
   ────────────────────────────────────────────────────────────────────────── */

/** angka limit yang SUDAH ada untuk kategori ini (`''` kalau belum ada) — dipakai
 *  untuk mengisi field di render pertama, sebelum effect apa pun jalan */
function presetDigits(rawCategory: string | undefined | null, budgets: BudgetItem[]): string {
  const option = categoryOptionOf(rawCategory)
  const existing = option ? findBudgetByCategory(budgets, option.label) : undefined
  return existing ? String(existing.limit) : ''
}

/** periode baris yang sudah ada (kalau ada) — form tidak menebak periode baru */
function presetPeriod(
  rawCategory: string | undefined | null,
  budgets: BudgetItem[],
  fallback: BudgetPeriod,
): BudgetPeriod {
  const option = categoryOptionOf(rawCategory)
  const existing = option ? findBudgetByCategory(budgets, option.label) : undefined
  return existing?.period ?? fallback
}

export function AddBudgetSheet({
  open,
  onClose,
  scope,
  initialPeriod,
  initialCategory,
  existingBudgets = [],
  onSave,
}: {
  open: boolean
  onClose: () => void
  /** konteks aktif halaman — budget baru otomatis masuk konteks ini */
  scope: BudgetScope
  /** periode tab yang sedang aktif di halaman — jadi nilai awal form */
  initialPeriod: BudgetPeriod
  /** label kategori yang sudah terpilih saat sheet dibuka (mis. dari insight
   *  "Atur Limit Kopi" di /history). Opsional: /budget sendiri tetap membuka
   *  sheet tanpa pilihan, jadi alurnya tidak berubah. Label yang tidak ada di
   *  `BUDGET_CATEGORY_OPTIONS` diabaikan — bukan dilempar sebagai error. */
  initialCategory?: string
  /** limit yang sudah ada di konteks ini (di /budget: `visibleBudgets`). Dari
   *  daftar inilah sheet tahu kategori mana yang harus di-UBAH, bukan ditambah */
  existingBudgets?: BudgetItem[]
  onSave: (budget: Omit<BudgetItem, 'id' | 'spent'>) => void
}) {
  /* Kalau sheet dibuka LANGSUNG dari tautan insight (mis. /budget?add=Kopi),
     kategori sudah terisi sejak render PERTAMA - supaya HTML server pun sudah
     menampilkan Step 2 (nominal), tanpa kedipan Step 1 yang masih kosong.
     Kategori yang sudah punya limit juga langsung terisi angka lamanya. */
  const [category, setCategory] = useState<{ label: string; icon: string } | null>(() =>
    open ? categoryOptionOf(initialCategory) : null,
  )
  const [digits, setDigits] = useState(() =>
    open ? presetDigits(initialCategory, existingBudgets) : '',
  )
  const [period, setPeriod] = useState<BudgetPeriod>(() =>
    open ? presetPeriod(initialCategory, existingBudgets, initialPeriod) : initialPeriod,
  )
  const amountRef = useRef<HTMLInputElement>(null)

  /* form selalu mulai bersih tiap kali dibuka, tapi periode ikut tab aktif.
     `initialCategory` (kalau ada) memangkas Step 1: user langsung di Step 2
     (nominal) — jalur pintas dari insight "kamu boros di Kopi, atur limitnya".
     Kalau kategorinya SUDAH punya limit, angka lamanya ikut terisi: form kosong
     untuk kategori yang sudah ada = user mengisi ulang dari nol tanpa tahu
     berapa limit lamanya. */
  useEffect(() => {
    if (!open) return
    setCategory(categoryOptionOf(initialCategory))
    setDigits(presetDigits(initialCategory, existingBudgets))
    setPeriod(presetPeriod(initialCategory, existingBudgets, initialPeriod))
  }, [open, initialPeriod, initialCategory, existingBudgets])

  useFocusOnOpen(open && category !== null, amountRef)

  /* Mode disimpulkan di sini — satu-satunya tempat keputusan itu diambil, dan
     sumbernya daftar yang sama dengan yang dibaca kartu kategori. */
  const { existing } = budgetSheetMode(existingBudgets, category?.label)
  const amount = Number(digits || '0')
  const ready = category !== null && amount > 0
  const periodWord = periodLimitWord(period)

  /** ganti kategori: mode ikut kategori baru, dan angkanya menyesuaikan —
   *  kategori yang sudah punya limit → isi limit lamanya; kategori baru →
   *  field dikosongkan (angka milik kategori lain di form ini = jebakan). */
  function pickCategory(option: { label: string; icon: string }) {
    const target = findBudgetByCategory(existingBudgets, option.label)
    setCategory(option)
    setDigits(target ? String(target.limit) : '')
    setPeriod(target?.period ?? initialPeriod)
  }

  function submit() {
    if (!category || amount <= 0) return
    /* Satu jalur saja: halaman yang memutuskan baris ini ditambah atau diubah
       (`applyBudgetSave` di lib/data/budget.ts memakai kategori + konteks
       sebagai kuncinya). Sheet cukup memastikan mode yang DITAMPILKAN sesuai
       dengan kategori yang dipilih — itulah yang bikin jalur pintas dari
       insight tidak bisa melahirkan baris kategori kedua. */
    onSave({ category: category.label, icon: category.icon, limit: amount, period, scope })
  }

  return (
    <BudgetSheet
      open={open}
      onClose={onClose}
      title={existing ? BUDGET_EDIT_COPY.title : BUDGET_ADD_COPY.title}
      description={existing ? BUDGET_EDIT_COPY.description : BUDGET_ADD_COPY.description}
      footer={
        <SheetSubmit onClick={submit} disabled={!ready} gate>
          {existing ? BUDGET_EDIT_COPY.submit : BUDGET_ADD_COPY.submit}
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
              onClick={() => pickCategory(option)}
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
            hint={existing ? BUDGET_EDIT_COPY.hint : BUDGET_ADD_COPY.amountHint}
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
