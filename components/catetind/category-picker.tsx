'use client'

import { useMemo, useRef, useState } from 'react'
import { ChevronDown, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  CATEGORY_PICKER_COPY,
  EXPENSE_CATEGORIES,
  EXPENSE_GROUPS,
  INCOME_CATEGORIES,
  expenseCategoryByName,
  quickPickCategories,
  searchCategories,
  type CategoryGroupId,
} from '@/lib/data/categories'
import { PickerSheet } from './picker-sheet'
import { QuickCard, SearchField } from './category-picker-parts'
import { GroupAccordion } from './category-group-accordion'
import { IncomeGrid, SearchResults } from './category-search-results'

/* --- CategoryPicker - pemilih kategori 3 LAYER (paket 69) ------------------
   FILOSOFI. 52 subkategori tidak boleh jadi daftar gulir 52 baris. Tiga lapis:

     LAYER 1 - QUICK PICK   -> grid 3x2 dari 6 kategori yang paling sering
                               dipakai. ~80% user selesai di sini (2 detik).
     LAYER 2 - SEMUA GRUP   -> 9 grup besar; tap grup -> subkategorinya terbuka.
                               Maksimal 2 ketukan sampai kategori terpilih.
     LAYER 3 - FUZZY SEARCH -> ketik apa saja -> daftar rata hasil pencarian;
                               jaring pengaman terakhir (typo "kofi" tetap ketemu).

   ATURAN YANG DIPATUHI DI SINI:
     - BUKAN <select> native: ini UI kustom (bottom sheet mobile, panel di web);
     - nol string user-facing di JSX: semuanya dari CATEGORY_PICKER_COPY;
     - nol warna new-hex: aksen dari token palet kanon (CATEGORY_TONE);
     - prefers-reduced-motion dihormati (animasi grup & sheet);
     - search bar SELALU elemen yang sama (tidak di-unmount) supaya fokus user
       tidak hilang di tengah mengetik. */

/** gaya trigger - senada dengan kontrol form engine (`EDIT_CONTROL_CLASS`) */
const TRIGGER_CLASS =
  'flex w-full items-center justify-between gap-2 rounded-xl bg-soil/[0.09] px-3 py-2.5 text-left text-[12.5px] font-medium text-forest outline-none ring-1 ring-transparent transition-all hover:bg-soil/[0.12] focus-visible:bg-cream focus-visible:ring-forest/15'

export function CategoryPicker({
  value,
  onChange,
  variant = 'expense',
  invalid = false,
  describedBy,
  ariaLabel,
}: {
  /** nama kategori terpilih; "" = belum memilih */
  value: string
  onChange: (name: string) => void
  variant?: 'expense' | 'income'
  /** tampilkan penanda "belum dipilih" (ring kuning) */
  invalid?: boolean
  describedBy?: string
  ariaLabel?: string
}) {
  const [open, setOpen] = useState(false)
  const [view, setView] = useState<'quick' | 'all'>('quick')
  const [query, setQuery] = useState('')
  const [expanded, setExpanded] = useState<CategoryGroupId | null>(null)
  /* tombol pemicu — dikirim ke `PickerSheet` supaya host overlay dicari dari
     ancestor TOMBOL INI (`closest`), bukan dari dialog pertama di dokumen. */
  const triggerRef = useRef<HTMLButtonElement>(null)

  const isIncome = variant === 'income'
  const searching = query.trim().length > 0

  /* Quick Pick dihitung SEKALI per mount: daftarnya tidak boleh berubah saat
     user sedang mengetuk (memindahkan 6 tombol di bawah jari = salah ketuk). */
  const quick = useMemo(() => quickPickCategories(), [])
  const hits = useMemo(() => (searching ? searchCategories(query) : []), [query, searching])

  const selected = isIncome
    ? (INCOME_CATEGORIES.find((item) => item.name === value) ?? null)
    : expenseCategoryByName(value)

  function reset() {
    setView('quick')
    setQuery('')
    setExpanded(null)
  }

  function closePicker() {
    setOpen(false)
    reset()
  }

  function choose(name: string) {
    onChange(name)
    closePicker()
  }

  const onDeeperLayer = searching || view === 'all'

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen(true)}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label={ariaLabel ?? CATEGORY_PICKER_COPY.openLabel}
        aria-describedby={describedBy}
        aria-invalid={invalid || undefined}
        className={cn(TRIGGER_CLASS, invalid && 'bg-cream ring-hud-amber/45')}
      >
        <span className="flex min-w-0 items-center gap-2">
          {selected ? (
            <>
              <span aria-hidden className="text-base leading-none">
                {selected.emoji}
              </span>
              <span className="truncate">{selected.name}</span>
            </>
          ) : (
            <span className="truncate text-forest/40">{CATEGORY_PICKER_COPY.placeholder}</span>
          )}
        </span>
        <ChevronDown className="size-4 shrink-0 text-forest/40" aria-hidden />
      </button>

      <PickerSheet
        open={open}
        anchor={triggerRef}
        onClose={closePicker}
        title={isIncome ? CATEGORY_PICKER_COPY.incomeTitle : CATEGORY_PICKER_COPY.sheetTitle}
        subtitle={
          searching
            ? CATEGORY_PICKER_COPY.resultTitle(hits.length)
            : view === 'all'
              ? CATEGORY_PICKER_COPY.allHint(EXPENSE_GROUPS.length, EXPENSE_CATEGORIES.length)
              : CATEGORY_PICKER_COPY.quickHint
        }
        onBack={onDeeperLayer ? reset : undefined}
        backLabel={CATEGORY_PICKER_COPY.back}
        closeLabel={CATEGORY_PICKER_COPY.closeLabel}
      >
        {isIncome ? (
          <IncomeGrid value={value} onPick={choose} />
        ) : (
          <>
            {/* LAYER 1 - QUICK PICK */}
            {!searching && view === 'quick' && (
              <section aria-label={CATEGORY_PICKER_COPY.quickTitle}>
                <p className="px-0.5 pb-2 text-[11px] font-medium tracking-[0.06em] text-forest/45 uppercase">
                  {CATEGORY_PICKER_COPY.quickTitle}
                </p>
                <div className="grid grid-cols-3 gap-2">
                  {quick.map((item) => (
                    <QuickCard
                      key={item.id}
                      item={item}
                      active={item.name === value}
                      onPick={choose}
                    />
                  ))}
                </div>
              </section>
            )}

            <SearchField
              className={cn(!searching && view === 'quick' && 'mt-3')}
              value={query}
              onChange={setQuery}
            />

            {/* LAYER 1 -> LAYER 2 */}
            {!searching && view === 'quick' && (
              <button
                type="button"
                onClick={() => setView('all')}
                className="mt-2.5 flex w-full items-center justify-between gap-2 rounded-2xl bg-sage/60 px-3.5 py-3 text-[12.5px] font-medium text-forest ring-1 ring-soil/10 transition-colors hover:bg-sage"
              >
                {CATEGORY_PICKER_COPY.viewAll}
                <ChevronRight className="size-4 text-forest/45" aria-hidden />
              </button>
            )}

            {/* LAYER 2 - SEMUA GRUP */}
            {!searching && view === 'all' && (
              <GroupAccordion
                groups={EXPENSE_GROUPS}
                expanded={expanded}
                onToggle={setExpanded}
                onPick={choose}
              />
            )}

            {/* LAYER 3 - FUZZY SEARCH */}
            {searching && <SearchResults hits={hits} query={query} onPick={choose} />}
          </>
        )}
      </PickerSheet>
    </>
  )
}