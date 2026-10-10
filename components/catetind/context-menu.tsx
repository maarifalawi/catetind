'use client'

import { useEffect, useRef, useState } from 'react'
import { Check, ChevronDown, User, Users, UsersRound, type LucideIcon } from 'lucide-react'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { cn } from '@/lib/utils'
import { CONTEXT_LABEL, CONTEXT_MENU_COPY } from '@/lib/data/money-context'
import type { MoneyContext } from '@/lib/types'

/* ── MENU KONTEKS UANG (paket 65 · Tugas E) ──────────────────────────────────
   Pengganti segmented control `ContextSwitcher` di Dashboard. Trigger-nya
   menampilkan konteks AKTIF (ikon + label PENUH + chevron) sehingga label
   panjang seperti "Keluarga"/"Bersama" TIDAK PERNAH terpotong — persis keluhan
   yang mau ditutup. Menu-nya dropdown yang duduk DI SAMPING kolom search,
   bisa dibuka dengan keyboard, ditutup dengan `Esc` / klik di luar, dan
   menandai pilihan aktif (`role="listbox"` + `aria-selected`).

   State-nya tetap `useMoneyContext()` yang sama (satu sumber kebenaran) —
   komponen ini cuma cara memilih, bukan state kedua.

   PAKET 75: menu ini jadi SATU-SATUNYA pemilih konteks di SELURUH halaman.
   Segmented control `ContextSwitcher` (yang MEMOTONG label panjang di lebar
   sempit) dicabut dari semua halaman dan diganti komponen ini, jadi desainnya
   seragam — dropdown label-penuh, di Dashboard maupun halaman lain. */

const OPTIONS: { id: MoneyContext; icon: LucideIcon }[] = [
  { id: 'pribadi', icon: User },
  { id: 'keluarga', icon: Users },
  { id: 'bersama', icon: UsersRound },
]

export function ContextMenu({
  value,
  onChange,
  className,
}: {
  value: MoneyContext
  onChange: (v: MoneyContext) => void
  className?: string
}) {
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)
  const reduce = useReducedMotion()
  const active = OPTIONS.find((option) => option.id === value) ?? OPTIONS[0]
  const ActiveIcon = active.icon

  useEffect(() => {
    if (!open) return
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false)
    }
    const onPointerDown = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false)
    }
    window.addEventListener('keydown', onKey)
    window.addEventListener('mousedown', onPointerDown)
    return () => {
      window.removeEventListener('keydown', onKey)
      window.removeEventListener('mousedown', onPointerDown)
    }
  }, [open])

  return (
    <div ref={rootRef} className={cn('relative', className)}>
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={CONTEXT_MENU_COPY.triggerAria}
        onClick={() => setOpen((v) => !v)}
        className="flex h-11 w-full items-center gap-2 rounded-full bg-cream px-3.5 text-[13px] font-medium text-forest ring-1 ring-soil/12 transition-colors hover:bg-sage/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-forest/25"
      >
        <ActiveIcon className="size-4 shrink-0" strokeWidth={2.2} aria-hidden />
        <span className="whitespace-nowrap">{CONTEXT_LABEL[value]}</span>
        <ChevronDown
          className={cn('ml-auto size-4 shrink-0 transition-transform', open && 'rotate-180')}
          aria-hidden
        />
      </button>

      <AnimatePresence>
        {open && (
          <motion.ul
            role="listbox"
            aria-label={CONTEXT_MENU_COPY.menuAria}
            initial={reduce ? false : { opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduce ? { opacity: 1 } : { opacity: 0, y: -4 }}
            transition={{ duration: reduce ? 0 : 0.15, ease: 'easeOut' }}
            className="absolute right-0 z-[60] mt-2 w-44 overflow-hidden rounded-2xl bg-cream p-1.5 shadow-[0_18px_40px_-20px_rgba(69,89,78,0.55)] ring-1 ring-soil/12"
          >
            {OPTIONS.map(({ id, icon: Icon }) => {
              const selected = id === value
              return (
                <li key={id} role="option" aria-selected={selected}>
                  <button
                    type="button"
                    onClick={() => {
                      onChange(id)
                      setOpen(false)
                    }}
                    className={cn(
                      /* `min-h-11` (44px) — paket 75: menu ini kini dipakai di
                         SEMUA halaman (bukan cuma Dashboard), jadi tiap opsi
                         wajib jadi target sentuh yang nyaman di mobile. */
                      'flex min-h-11 w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-[13px] font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-forest/25',
                      selected
                        ? 'bg-sage text-forest'
                        : 'text-forest/70 hover:bg-sage/50 hover:text-forest',
                    )}
                  >
                    <Icon className="size-4 shrink-0" strokeWidth={2.2} aria-hidden />
                    <span className="whitespace-nowrap">{CONTEXT_LABEL[id]}</span>
                    {selected && <Check className="ml-auto size-4" strokeWidth={2.6} aria-hidden />}
                  </button>
                </li>
              )
            })}
          </motion.ul>
        )}
      </AnimatePresence>
    </div>
  )
}
