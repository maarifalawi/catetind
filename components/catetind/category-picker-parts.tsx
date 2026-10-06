'use client'

import { Search, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  CATEGORY_PICKER_COPY,
  type CategoryTone,
  type FlatCategory,
  type SubCategory,
} from '@/lib/data/categories'

/* --- KULIT pemilih kategori (paket 69) -------------------------------------
   Dipisah dari `category-picker.tsx` supaya file utamanya tetap satu tanggung
   jawab: menyusun ALUR 3 layer (Quick Pick -> grup -> search). Isi file ini cuma
   presentasi - kartu Quick Pick, search bar, dan chip subkategori - nol logika
   data (pencarian & pengurutan tinggal di `lib/data/categories.ts`). */

/** tone -> kelas aksen. SATU-SATUNYA tempat kelas warna kategori ditulis, jadi
 *  warna tiap grup konsisten dari Quick Pick, accordion, sampai hasil search. */
export const CATEGORY_TONE: Record<CategoryTone, { card: string; chip: string; dot: string }> = {
  cantelope: {
    card: 'bg-cantelope/20 ring-cantelope/35',
    chip: 'bg-cantelope/25',
    dot: 'bg-cantelope',
  },
  plum: { card: 'bg-plum/15 ring-plum/35', chip: 'bg-plum/20', dot: 'bg-plum' },
  thistle: { card: 'bg-thistle/20 ring-thistle/35', chip: 'bg-thistle/25', dot: 'bg-thistle' },
  daisy: { card: 'bg-daisy/25 ring-daisy/45', chip: 'bg-daisy/30', dot: 'bg-daisy' },
  leaf: { card: 'bg-leaf/20 ring-leaf/35', chip: 'bg-leaf/25', dot: 'bg-leaf' },
  forest: { card: 'bg-forest/12 ring-forest/25', chip: 'bg-forest/12', dot: 'bg-forest' },
}

/** kartu Quick Pick (Layer 1) - emoji besar + nama, tinggi seragam untuk grid 3x2 */
export function QuickCard({
  item,
  active,
  onPick,
}: {
  item: FlatCategory
  active: boolean
  onPick: (name: string) => void
}) {
  return (
    <button
      type="button"
      onClick={() => onPick(item.name)}
      aria-label={item.name}
      aria-pressed={active}
      className={cn(
        'flex h-[84px] flex-col items-center justify-center gap-1.5 rounded-2xl px-2 text-center ring-1 transition-transform active:scale-[0.97]',
        CATEGORY_TONE[item.tone].card,
        active && 'ring-2 ring-forest',
      )}
    >
      <span aria-hidden className="text-xl leading-none">
        {item.emoji}
      </span>
      <span className="line-clamp-2 text-[11px] leading-tight font-medium text-forest">
        {item.name}
      </span>
    </button>
  )
}

/**
 * Search bar (Layer 1 & Layer 3) - SATU elemen yang tidak pernah di-unmount saat
 * layer berpindah, supaya fokus & posisi kursor user tidak hilang di tengah
 * mengetik. `type="search"` sesuai spec, tapi tombol clear-nya digambar sendiri
 * agar tampilannya seragam di semua browser.
 */
export function SearchField({
  value,
  onChange,
  className,
}: {
  value: string
  onChange: (value: string) => void
  className?: string
}) {
  return (
    <div className={cn('relative', className)} role="search">
      <Search
        className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-forest/35"
        aria-hidden
      />
      <input
        type="search"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={CATEGORY_PICKER_COPY.searchPlaceholder}
        aria-label={CATEGORY_PICKER_COPY.searchLabel}
        autoComplete="off"
        autoCorrect="off"
        spellCheck={false}
        enterKeyHint="search"
        inputMode="search"
        className="h-11 w-full rounded-2xl bg-soil/[0.09] pr-11 pl-10 text-[13px] font-medium text-forest outline-none ring-1 ring-transparent transition-all placeholder:text-forest/35 focus:bg-cream focus:ring-forest/15 [&::-webkit-search-cancel-button]:hidden"
      />
      {value.length > 0 && (
        <button
          type="button"
          onClick={() => onChange('')}
          aria-label={CATEGORY_PICKER_COPY.searchClear}
          className="absolute top-1/2 right-2.5 flex size-7 -translate-y-1/2 items-center justify-center rounded-full bg-soil/10 text-forest/60 transition-colors hover:bg-soil/15"
        >
          <X className="size-3.5" />
        </button>
      )}
    </div>
  )
}

/** chip satu subkategori - dipakai Layer 2 (di dalam accordion grup) */
export function SubChip({
  item,
  tone,
  onPick,
}: {
  item: SubCategory
  tone: CategoryTone
  onPick: (name: string) => void
}) {
  return (
    <button
      type="button"
      onClick={() => onPick(item.name)}
      aria-label={item.name}
      className={cn(
        'flex items-center gap-2 rounded-xl px-2.5 py-2 text-left ring-1 ring-soil/10 transition-transform hover:ring-forest/25 active:scale-[0.97]',
        CATEGORY_TONE[tone].chip,
      )}
    >
      <span aria-hidden className="text-base leading-none">
        {item.emoji}
      </span>
      <span className="min-w-0 flex-1 truncate text-[11.5px] font-medium text-forest">
        {item.name}
      </span>
    </button>
  )
}