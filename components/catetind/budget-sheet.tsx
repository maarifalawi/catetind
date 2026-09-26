'use client'

import { useEffect, useRef, useState, type ChangeEvent, type ReactNode, type RefObject } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Drawer } from 'vaul'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'

/* ── Shell + atom form bersama untuk semua bottom sheet halaman Budget ───────
   Semua modal di /app/budget memakai satu shell ini supaya tempo buka/tutup,
   radius, dan ritme spasinya identik:

   - Mobile: Vaul bottom sheet (drag handle + sheet nempel bawah).
   - Desktop (lg): panel yang sama berubah jadi dialog di tengah layar.
     Posisinya diatur lewat utility `translate` (properti CSS terpisah dari
     `transform` yang dipakai Vaul untuk menganimasikan geser-naik), jadi
     keduanya tidak saling menimpa.

   Form-nya sendiri memakai progressive disclosure: tiap langkah dibungkus
   <RevealStep> sehingga muncul mengembang halus setelah langkah sebelumnya
   selesai — layar tetap terasa lega meskipun fiturnya banyak.
   ────────────────────────────────────────────────────────────────────────── */

/** cubic-bezier khas app: masuk cepat lalu settle lembut */
export const SHEET_EASE: [number, number, number, number] = [0.22, 1, 0.36, 1]

export function BudgetSheet({
  open,
  onClose,
  title,
  description,
  children,
  footer,
}: {
  open: boolean
  onClose: () => void
  title: string
  description?: string
  children: ReactNode
  /** area aksi tetap di bawah sheet — tidak ikut scroll */
  footer?: ReactNode
}) {
  return (
    <Drawer.Root
      open={open}
      onOpenChange={(next) => {
        if (!next) onClose()
      }}
      autoFocus={false}
    >
      <Drawer.Portal>
        <Drawer.Overlay
          data-catetind-overlay="true"
          className="fixed inset-0 z-[70] bg-ink/60"
        />

        <Drawer.Content
          data-catetind-sheet="true"
          aria-label={title}
          className={cn(
            /* mobile — bottom sheet */
            'fixed inset-x-0 bottom-0 z-[70] mx-auto flex max-h-[92dvh] w-full max-w-md flex-col overflow-hidden rounded-t-[2rem] bg-[#FFFDF9] shadow-[0_-24px_60px_-24px_rgba(16,58,42,0.55)] outline-none',
            /* desktop — dialog tengah (translate = properti terpisah dari transform Vaul) */
            'lg:inset-x-auto lg:bottom-auto lg:top-1/2 lg:left-1/2 lg:max-h-[86dvh] lg:max-w-lg lg:-translate-x-1/2 lg:-translate-y-1/2 lg:rounded-[2rem] lg:shadow-[0_28px_70px_-24px_rgba(16,58,42,0.5)]',
          )}
        >
          {/* drag handle khas Vaul — di desktop panel mengambang, jadi tak perlu */}
          <div className="mx-auto mt-3 h-1.5 w-10 shrink-0 rounded-full bg-ink/10 lg:hidden" />
          {/* glow mint tipis di bibir atas sheet */}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-x-0 top-0 h-24 rounded-t-[2rem] bg-gradient-to-b from-mint/[0.18] to-transparent"
          />

          <div className="relative flex shrink-0 items-start justify-between gap-3 px-5 pt-4 lg:px-6">
            <div className="min-w-0">
              <Drawer.Title className="font-display text-xl font-bold leading-tight tracking-tight text-ink">
                {title}
              </Drawer.Title>
              {description ? (
                <Drawer.Description className="mt-1 text-[13px] leading-relaxed text-ink/55">
                  {description}
                </Drawer.Description>
              ) : (
                <Drawer.Description className="sr-only">{title}</Drawer.Description>
              )}
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Tutup"
              className="flex size-9 shrink-0 items-center justify-center rounded-full bg-white text-ink ring-1 ring-black/5 transition-colors hover:bg-sage active:scale-95"
            >
              <X className="size-4" strokeWidth={2.2} />
            </button>
          </div>

          <div
            data-lenis-prevent
            className="flex-1 overflow-y-auto overscroll-contain px-5 pt-4 lg:px-6"
          >
            {children}
          </div>

          {footer && (
            <div className="shrink-0 border-t border-black/[0.06] bg-white/70 px-5 pt-4 pb-[max(1.25rem,env(safe-area-inset-bottom))] lg:px-6 lg:pb-5">
              {footer}
            </div>
          )}
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  )
}

/**
 * Satu langkah form yang muncul mengembang SETELAH langkah sebelumnya selesai
 * (progressive disclosure). Tinggi `auto` dianimasikan supaya tidak ada lompatan
 * layout saat step baru masuk.
 *
 * `overflow-hidden` hanya dipasang SAAT beranimasi: kalau dibiarkan, ring fokus
 * (2px di luar kotak) input di dalamnya akan terpotong di tepi wrapper.
 */
export function RevealStep({
  show,
  children,
  className,
}: {
  show: boolean
  children: ReactNode
  className?: string
}) {
  const [clipped, setClipped] = useState(false)

  return (
    <AnimatePresence initial={false}>
      {show && (
        <motion.div
          key="reveal"
          initial={{ opacity: 0, y: -6, height: 0 }}
          animate={{ opacity: 1, y: 0, height: 'auto' }}
          exit={{ opacity: 0, y: -6, height: 0 }}
          transition={{ duration: 0.28, ease: SHEET_EASE }}
          onAnimationStart={() => setClipped(true)}
          onAnimationComplete={() => setClipped(false)}
          className={cn(clipped ? 'overflow-hidden' : 'overflow-visible', className)}
        >
          {children}
        </motion.div>
      )}
    </AnimatePresence>
  )
}

/**
 * Input nominal Rupiah: satu state `digits` (angka mentah) → tampilan otomatis
 * berformat `1.500.000`. `inputMode="numeric"` memunculkan keypad angka di HP.
 */
export function RupiahField({
  label,
  digits,
  onDigitsChange,
  placeholder = 'Rp 15.000.000',
  hint,
  size = 'md',
  inputRef,
  className,
}: {
  label?: string
  /** digit mentah tanpa pemisah — satu-satunya sumber kebenaran nilai */
  digits: string
  onDigitsChange: (digits: string) => void
  placeholder?: string
  hint?: ReactNode
  size?: 'md' | 'lg'
  inputRef?: RefObject<HTMLInputElement | null>
  className?: string
}) {
  const entered = Number(digits || '0')
  const display = digits ? entered.toLocaleString('id-ID') : ''

  function handleChange(event: ChangeEvent<HTMLInputElement>) {
    // buang semua non-digit, batasi 12 digit (maks Rp 999.999.999.999)
    onDigitsChange(event.target.value.replace(/\D/g, '').slice(0, 12))
  }

  return (
    <label className={cn('block', className)}>
      {label && <span className="text-[13px] font-semibold leading-snug text-ink">{label}</span>}
      <span
        className={cn(
          'mt-2 flex items-center gap-2 rounded-2xl bg-white px-4 ring-1 ring-black/[0.08] transition-shadow focus-within:ring-2 focus-within:ring-forest/35',
          size === 'lg' ? 'py-3.5' : 'py-3',
        )}
      >
        <span
          className={cn('shrink-0 font-semibold text-ink/35', size === 'lg' ? 'text-lg' : 'text-sm')}
        >
          Rp
        </span>
        <input
          ref={inputRef}
          value={display}
          onChange={handleChange}
          inputMode="numeric"
          autoComplete="off"
          placeholder={placeholder.replace(/^Rp\s*/, '')}
          className={cn(
            'min-w-0 flex-1 bg-transparent font-semibold tabular-nums text-ink outline-none placeholder:font-medium placeholder:text-ink/25',
            size === 'lg' ? 'text-xl' : 'text-[15px]',
          )}
        />
      </span>
      {hint && (
        <span className="mt-1.5 block text-[11px] leading-relaxed text-ink/45">{hint}</span>
      )}
    </label>
  )
}

/** Deret pill pilih-satu (periode budget, prioritas, reminder) — mikro, hemat ruang */
export function ChoicePills<T extends string>({
  options,
  value,
  onChange,
  ariaLabel,
  className,
}: {
  options: { id: T; label: string }[]
  value: T
  onChange: (value: T) => void
  ariaLabel: string
  className?: string
}) {
  return (
    <div
      role="radiogroup"
      aria-label={ariaLabel}
      className={cn('flex flex-wrap gap-2', className)}
    >
      {options.map((option) => {
        const active = option.id === value
        return (
          <button
            key={option.id}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(option.id)}
            className={cn(
              'rounded-full px-3.5 py-2 text-[12.5px] font-semibold transition-all duration-200 active:scale-95',
              active
                ? 'bg-forest text-mint shadow-[0_10px_22px_-14px_rgba(16,58,42,0.75)]'
                : 'bg-white text-ink/60 ring-1 ring-black/[0.07] hover:bg-cream hover:text-ink',
            )}
          >
            {option.label}
          </button>
        )
      })}
    </div>
  )
}

/** Fokus satu input setelah sheet selesai beranimasi buka (keyboard HP tidak "nabrak") */
export function useFocusOnOpen(
  open: boolean,
  ref: RefObject<HTMLInputElement | null>,
  delay = 220,
) {
  const timer = useRef<number | null>(null)
  useEffect(() => {
    if (!open) return
    timer.current = window.setTimeout(() => ref.current?.focus(), delay)
    return () => {
      if (timer.current) window.clearTimeout(timer.current)
    }
  }, [open, ref, delay])
}

/** Tombol aksi utama sheet — satu gaya untuk semua alur supaya konsisten */
export function SheetSubmit({
  children,
  onClick,
  disabled,
  className,
}: {
  children: ReactNode
  onClick: () => void
  disabled?: boolean
  className?: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'flex w-full items-center justify-center gap-2 rounded-2xl py-3.5 text-sm font-semibold transition-all',
        disabled
          ? 'cursor-not-allowed bg-ink/[0.07] text-ink/35'
          : 'bg-forest text-mint hover:bg-forest-soft active:scale-[0.99]',
        className,
      )}
    >
      {children}
    </button>
  )
}