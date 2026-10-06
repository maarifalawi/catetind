'use client'

import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  CATEGORY_PICKER_COPY,
  type CategoryGroup,
  type CategoryGroupId,
} from '@/lib/data/categories'
import { CATEGORY_TONE, SubChip } from './category-picker-parts'

/* --- LAYER 2 - accordion 9 grup (paket 69) ---------------------------------
   Inilah jawaban untuk "40+ kategori tapi jangan ada daftar 40 baris": yang
   ditawarkan lebih dulu cuma 9 GRUP besar, dan isinya baru terbuka saat ditap.
   Maksimal 2 ketukan dari buka pemilih sampai kategori terpilih. */

export function GroupAccordion({
  groups,
  expanded,
  onToggle,
  onPick,
}: {
  groups: readonly CategoryGroup[]
  expanded: CategoryGroupId | null
  onToggle: (id: CategoryGroupId | null) => void
  onPick: (name: string) => void
}) {
  /* `height: auto` dianimasikan supaya terasa "terbuka"; saat user meminta gerak
     minimal (`prefers-reduced-motion`), tinggi langsung tampil tanpa animasi. */
  const reduce = useReducedMotion()

  return (
    <ul className="flex flex-col gap-2">
      {groups.map((group) => {
        const open = expanded === group.id
        return (
          <li
            key={group.id}
            className={cn(
              'overflow-hidden rounded-2xl ring-1 ring-soil/10 transition-colors',
              open ? 'bg-cream' : 'bg-sage/40',
            )}
          >
            <button
              type="button"
              onClick={() => onToggle(open ? null : group.id)}
              aria-expanded={open}
              aria-controls={`cat-group-${group.id}`}
              aria-label={CATEGORY_PICKER_COPY.groupToggleLabel(group.name)}
              className="flex w-full items-center gap-3 px-3.5 py-3 text-left"
            >
              <span
                aria-hidden
                className={cn(
                  'flex size-9 shrink-0 items-center justify-center rounded-xl text-lg',
                  CATEGORY_TONE[group.tone].card,
                )}
              >
                {group.emoji}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[13px] font-medium text-forest">
                  {group.name}
                </span>
                <span className="mt-0.5 block text-[11px] text-forest/45">
                  {CATEGORY_PICKER_COPY.groupCount(group.items.length)}
                </span>
              </span>
              <motion.span
                aria-hidden
                animate={{ rotate: open ? 90 : 0 }}
                transition={{ duration: reduce ? 0 : 0.18 }}
                className="shrink-0 text-forest/40"
              >
                <ChevronRight className="size-4" />
              </motion.span>
            </button>

            <AnimatePresence initial={false}>
              {open && (
                <motion.div
                  key="body"
                  id={`cat-group-${group.id}`}
                  initial={reduce ? { opacity: 0 } : { height: 0, opacity: 0 }}
                  animate={reduce ? { opacity: 1 } : { height: 'auto', opacity: 1 }}
                  exit={reduce ? { opacity: 0 } : { height: 0, opacity: 0 }}
                  transition={{ duration: 0.22, ease: 'easeOut' }}
                  className="overflow-hidden"
                >
                  <div className="grid grid-cols-2 gap-2 px-3 pb-3 sm:grid-cols-3">
                    {group.items.map((item) => (
                      <SubChip key={item.id} item={item} tone={group.tone} onPick={onPick} />
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </li>
        )
      })}
    </ul>
  )
}