'use client'

import { Check, Search } from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  CATEGORY_PICKER_COPY,
  INCOME_CATEGORIES,
  type CategorySearchHit,
} from '@/lib/data/categories'
import { CATEGORY_TONE } from './category-picker-parts'
import { PICKER_OPTION_ACTIVE } from './picker-sheet'

/* --- LAYER 3 - hasil pencarian + pemilih pemasukan (paket 69) --------------
   Dua "daftar rata" pemilih kategori:

     1. `SearchResults` - hasil fuzzy search. SENGAJA tidak dikelompokkan: hasil
        di balik accordion tertutup sama saja dengan tidak ditemukan. Barisnya
        menyebut grup asal + contoh isinya supaya user tahu kategorinya di mana.
     2. `IncomeGrid` - tujuh kategori pemasukan, jadi langsung chips 2 kolom:
        tidak butuh grup, tidak butuh pencarian, tidak butuh "lihat semua". */

export function SearchResults({
  hits,
  query,
  onPick,
}: {
  hits: CategorySearchHit[]
  query: string
  onPick: (name: string) => void
}) {
  if (hits.length === 0) {
    return (
      <div data-catetind-empty className="mt-6 flex flex-col items-center px-6 text-center">
        <p className="mt-3 text-[14px] font-medium text-forest">
          {CATEGORY_PICKER_COPY.resultEmpty(query.trim())}
        </p>
        <p className="mt-1 text-[12.5px] leading-relaxed text-forest-muted">
          {CATEGORY_PICKER_COPY.resultEmptyHint}
        </p>
      </div>
    )
  }

  return (
    <ul className="mt-3 flex flex-col gap-1.5">
      {hits.map(({ category }) => (
        <li key={category.id}>
          <button
            type="button"
            onClick={() => onPick(category.name)}
            aria-label={category.name}
            className="flex w-full items-center gap-3 rounded-2xl bg-cream px-3 py-2.5 text-left ring-1 ring-soil/10 transition-colors hover:bg-sage/40"
          >
            <span
              aria-hidden
              className={cn(
                'flex size-9 shrink-0 items-center justify-center rounded-xl text-lg',
                CATEGORY_TONE[category.tone].card,
              )}
            >
              {category.emoji}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[14px] font-medium text-forest">
                {category.name}
              </span>
              <span className="mt-0.5 block truncate text-[12px] text-forest-muted">
                {CATEGORY_PICKER_COPY.resultMeta(category.groupName, category.examples)}
              </span>
            </span>
          </button>
        </li>
      ))}
    </ul>
  )
}

export function IncomeGrid({
  value,
  onPick,
}: {
  value: string
  onPick: (name: string) => void
}) {
  return (
    <>
      <p className="mb-3 flex items-start gap-1.5 rounded-2xl bg-mint-soft/50 px-3.5 py-2.5 text-[12.5px] leading-relaxed text-forest-soft ring-1 ring-leaf/25">
        {CATEGORY_PICKER_COPY.incomeHint}
      </p>
      <ul className="grid grid-cols-2 gap-2">
        {INCOME_CATEGORIES.map((item) => (
          <li key={item.id}>
            <button
              type="button"
              onClick={() => onPick(item.name)}
              aria-label={item.name}
              aria-pressed={item.name === value}
              className={cn(
                'flex w-full items-center gap-2.5 rounded-2xl px-3 py-3 text-left ring-1 transition-transform active:scale-[0.97]',
                /* status terpilih = bahasa bersama pemilih (paket 78); cabangnya
                   saling meniadakan supaya tidak ada bg/ring yang bertabrakan */
                item.name === value ? PICKER_OPTION_ACTIVE : 'bg-sage/50 ring-soil/10',
              )}
            >
              <span aria-hidden className="text-lg leading-none">
                {item.emoji}
              </span>
              <span className="min-w-0 flex-1 truncate text-[13.5px] font-medium text-forest">
                {item.name}
              </span>
              {item.name === value && (
                <Check className="size-3.5 shrink-0 text-forest" strokeWidth={2.6} aria-hidden />
              )}
            </button>
          </li>
        ))}
      </ul>
    </>
  )
}