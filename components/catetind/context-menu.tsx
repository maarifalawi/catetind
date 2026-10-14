'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { ChevronDown, User, Users, UsersRound, type LucideIcon } from 'lucide-react'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { cn } from '@/lib/utils'
import { CONTEXT_LABEL, CONTEXT_MENU_COPY, CONTEXT_MENU_HELPER } from '@/lib/data/money-context'
import type { MoneyContext } from '@/lib/types'
import { useMoneyContext } from './money-context-provider'
import { MenuOption, MenuPanel } from './menu-panel'

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
  const { availableContexts: available } = useMoneyContext()
  /* PAKET 87 — hanya konteks yang tersedia (pilihan user ∪ konteks berisi dompet).
     Urutan tetap dari `OPTIONS` (Pribadi → Keluarga → Bersama). */
  const options = useMemo(
    () => OPTIONS.filter((option) => available.includes(option.id)),
    [available],
  )

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

  /* ≤1 konteks tersedia = tidak ada yang bisa dipilih → jangan gambar kontrol yang
     tidak mengontrol apa pun (aturan paket 60.3). Semua hook di atas sudah jalan,
     jadi early-return ini aman. */
  if (options.length < 2) return null

  const active = options.find((option) => option.id === value) ?? options[0]
  const ActiveIcon = active.icon

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
          <motion.div
            initial={reduce ? false : { opacity: 0, y: -6, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={reduce ? { opacity: 1 } : { opacity: 0, y: -6, scale: 0.97 }}
            transition={{ duration: reduce ? 0 : 0.16, ease: 'easeOut' }}
            className="absolute right-0 z-[60] mt-2 origin-top-right"
          >
            {/* PAKET 95: panel daftar memakai komponen bersama `MenuPanel` —
                ikon di tile + judul + keterangan baris kedua + centang pilihan
                aktif, bukan daftar teks polos. */}
            <MenuPanel label={CONTEXT_MENU_COPY.menuAria} className="w-60">
              {options.map(({ id, icon: Icon }) => (
                <MenuOption
                  key={id}
                  icon={Icon}
                  label={CONTEXT_LABEL[id]}
                  helper={CONTEXT_MENU_HELPER[id]}
                  selected={id === value}
                  onClick={() => {
                    onChange(id)
                    setOpen(false)
                  }}
                />
              ))}
            </MenuPanel>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
