'use client'

import { User, Users, UsersRound, type LucideIcon } from 'lucide-react'
import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'
import type { MoneyContext } from '@/lib/types'

/** konteks keuangan — Scope data seluruh app (PRD Domain 2C.2).
 *  Tipe kanon diambil dari lib/types.ts supaya provider global, sidebar, dan
 *  halaman yang ikut konteks memakai definisi yang sama persis. */
export type { MoneyContext }

const OPTIONS: { id: MoneyContext; label: string; icon: LucideIcon }[] = [
  { id: 'pribadi', label: 'Pribadi', icon: User },
  { id: 'keluarga', label: 'Keluarga', icon: Users },
  { id: 'bersama', label: 'Bersama', icon: UsersRound },
]

/**
 * Context Switcher — segmented control Pribadi / Keluarga / Bersama.
 * Komponen definitif di inventaris (Domain 2C.2), dipasang sticky di header.
 *
 * PRD Domain 2C.2 AC4: Animasi Framer Motion — slide transition 200ms
 * saat beralih konteks.
 */
export function ContextSwitcher({
  value,
  onChange,
  className,
}: {
  value: MoneyContext
  onChange: (v: MoneyContext) => void
  className?: string
}) {
  const activeIndex = Math.max(0, OPTIONS.findIndex((o) => o.id === value))

  return (
    <div
      role="tablist"
      aria-label="Konteks keuangan"
      className={cn(
        'relative grid w-full max-w-[320px] grid-cols-3 items-stretch rounded-full bg-cream p-1 ring-1 ring-soil/12 shadow-[0_10px_24px_-18px_rgba(69,89,78,0.55)]',
        className,
      )}
    >
      {/* active-pill sliding background — Framer Motion 200ms (AC4).
          Lebarnya = 1/3 kolom grid yang SAMA RATA, jadi tiap tab (ikon + label)
          benar-benar simetris walau panjang teksnya beda-beda; pill digambar di
          belakang tombol (tombol `z-10`) supaya tidak tenggelam. */}
      <motion.div
        aria-hidden
        className="pointer-events-none absolute bottom-1 left-1 top-1 rounded-full bg-sage ring-1 ring-forest/10"
        initial={false}
        animate={{
          x: `${activeIndex * 100}%`,
        }}
        transition={{
          type: 'tween',
          ease: 'easeOut',
          duration: 0.25,
        }}
        style={{ width: `calc((100% - 0.5rem) / ${OPTIONS.length})` }}
      />

      {OPTIONS.map(({ id, label, icon: Icon }) => {
        const active = value === id
        return (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(id)}
            className={cn(
              'relative z-10 flex items-center justify-center gap-1.5 whitespace-nowrap rounded-full px-2 py-2 text-xs font-medium text-forest/50 transition-colors duration-250 active:scale-95',
              active ? 'text-forest' : 'hover:text-forest',
            )}
          >
            <Icon className="size-4 shrink-0" strokeWidth={2.2} />
            <span className="whitespace-nowrap">{label}</span>
          </button>
        )
      })}
    </div>
  )
}
