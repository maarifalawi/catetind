'use client'

import { useId, useState, type ReactNode } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { ChevronDown, Info, type LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

/* ── InfoNote — progresif disclosure untuk teks penjelas ──────────────────────
   Audit "Clean UI": layar-layar penting (error, 404, install, privasi) dulu
   membuang paragraf penjelas teknis ke mata user dalam keadaan default — terasa
   seperti manual, bukan dashboard. Pola yang sudah ada di repo (accordion
   `<Reveal>` di `help-center-screen.tsx` & `budget-sheet.tsx`) kini dijadikan
   SATU primitif supaya aturannya seragam:

     · default COLLAPSED — yang tampil hanya judul + SATU baris ringkas;
     · dibuka dengan satu tap, `aria-expanded` + `aria-controls` untuk a11y;
     · tinggi 0 → auto memakai framer-motion yang sudah jadi dependensi.

   Tidak ada warna/komponen baru: permukaan, hairline, dan radius memakai token
   kanon yang sama dengan kartu lain (`bg-sage`, `ring-soil/12`, `rounded-2xl`). */

/** cubic-bezier khas app: masuk cepat lalu settle lembut (sama dengan help-center) */
const EASE: [number, number, number, number] = [0.22, 1, 0.36, 1]

type InfoNoteTone = 'default' | 'calm' | 'warn'

const TONE_STYLE: Record<InfoNoteTone, { wrap: string; icon: string }> = {
  default: { wrap: 'bg-cream ring-soil/12', icon: 'text-forest/45' },
  calm: { wrap: 'bg-sage/60 ring-forest/10', icon: 'text-forest' },
  warn: { wrap: 'bg-hud-amber/20 ring-hud-amber/35', icon: 'text-hud-terracotta' },
}

export function InfoNote({
  icon: Icon = Info,
  title,
  summary,
  label = 'Selengkapnya',
  tone = 'calm',
  bare = false,
  compact = false,
  className,
  children,
}: {
  icon?: LucideIcon
  /** baris tebal yang selalu terlihat — tulis ≤ 6 kata kalau bisa */
  title?: string
  /** satu baris ringkas yang selalu terlihat (opsional) */
  summary?: string
  /** label tombol buka; ganti sesuai konteks ("Kenapa aman?", "Baca detail") */
  label?: string
  tone?: InfoNoteTone
  /** true = tanpa kartu (untuk disisipkan di dalam baris/kartu yang sudah ada) */
  bare?: boolean
  /** true = tipografi lebih kecil (untuk disisipkan di banner/chip) */
  compact?: boolean
  className?: string
  /** isi yang disembunyikan sampai user minta */
  children: ReactNode
}) {
  const [open, setOpen] = useState(false)
  const panelId = useId()

  return (
    <div
      className={cn(
        !bare && 'rounded-2xl px-4 py-3 ring-1',
        !bare && TONE_STYLE[tone].wrap,
        className,
      )}
    >
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-controls={panelId}
        className="group/note flex w-full items-start gap-2.5 text-left"
      >
        <Icon
          className={cn('mt-0.5 size-4 shrink-0', TONE_STYLE[tone].icon)}
          strokeWidth={2.2}
          aria-hidden
        />
        <span className="min-w-0 flex-1">
          {title && (
            <span className={cn('block font-medium text-forest', compact ? 'text-[12px]' : 'text-[13px]')}>
              {title}
            </span>
          )}
          {summary && (
            <span
              className={cn(
                'block text-forest/55',
                compact ? 'text-[11px] leading-snug' : 'text-[12px] leading-relaxed',
                title && 'mt-0.5',
              )}
            >
              {summary}
            </span>
          )}
          <span
            className={cn(
              'mt-1 inline-flex items-center gap-1 font-medium text-forest/70 transition-colors group-hover/note:text-forest',
              compact ? 'text-[11px]' : 'text-[11.5px]',
            )}
          >
            {label}
            <ChevronDown
              aria-hidden
              strokeWidth={2.4}
              className={cn('size-3.5 transition-transform duration-300', open && 'rotate-180')}
            />
          </span>
        </span>
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            key="info-note-body"
            id={panelId}
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.28, ease: EASE }}
            className="overflow-hidden"
          >
            <div className="pt-1 pl-[26px]">
              <div
                className={cn(
                  'border-t border-soil/10 pt-2.5 leading-relaxed text-forest/55',
                  compact ? 'text-[11.5px]' : 'text-[12px]',
                )}
              >
                {children}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
