'use client'

import { useEffect, useRef, type ReactNode } from 'react'
import { X, type LucideIcon } from 'lucide-react'
import { useBodyScrollLock } from '@/hooks/use-body-scroll-lock'
import { cn } from '@/lib/utils'

/* ── Dialog konfirmasi halaman Pengaturan ─────────────────────────────────────
   Shell-nya sama dengan TopUpModal: bottom sheet di mobile, panel ngambang di
   tengah di desktop. Overlay hanya DIGELAPKAN (tanpa `backdrop-blur`) supaya
   buka/tutupnya tidak drop frame — lihat catatan performa di app/globals.css.

   Dipakai untuk tiga keputusan berisiko: putus koneksi dompet bersama,
   berhenti langganan, dan hapus akun. Semuanya sengaja SATU klik dari panelnya
   masing-masing (tanpa labirin menu — anti dark pattern). */

export function ConfirmDialog({
  id,
  open,
  onClose,
  icon: Icon,
  title,
  body,
  actions,
  tone = 'default',
}: {
  /** prefiks id untuk aria-labelledby (`${id}-title`) */
  id: string
  open: boolean
  onClose: () => void
  icon: LucideIcon
  title: string
  body: ReactNode
  actions: ReactNode
  /** `danger` = ikon prem (keputusan destruktif) */
  tone?: 'default' | 'danger'
}) {
  const panelRef = useRef<HTMLDivElement>(null)
  useBodyScrollLock(open)

  /* ESC menutup dialog + fokus pindah ke panel (a11y), sama seperti modal lain */
  useEffect(() => {
    if (!open) return

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose()
    }

    window.addEventListener('keydown', onKeyDown)
    const raf = requestAnimationFrame(() => panelRef.current?.focus())
    return () => {
      window.removeEventListener('keydown', onKeyDown)
      cancelAnimationFrame(raf)
    }
  }, [open, onClose])

  return (
    <div
      className={cn('fixed inset-0 z-[85]', !open && 'pointer-events-none')}
      inert={!open}
      aria-hidden={!open}
    >
      <button
        type="button"
        aria-label="Tutup dialog"
        tabIndex={open ? 0 : -1}
        onClick={onClose}
        className={cn(
          'absolute inset-0 bg-ink/50 transition-opacity duration-300 ease-out',
          open ? 'opacity-100' : 'opacity-0',
        )}
      />

      <div
        className="pointer-events-none absolute inset-0 flex items-end justify-center lg:items-center lg:p-6"
        data-lenis-prevent
      >
        <div
          ref={panelRef}
          role="dialog"
          aria-modal="true"
          aria-labelledby={`${id}-title`}
          tabIndex={-1}
          className={cn(
            'pointer-events-auto flex max-h-[92vh] w-full flex-col overflow-y-auto rounded-t-[2rem] bg-cream shadow-[0_-24px_60px_-24px_rgba(69,89,78,0.55)] ring-1 ring-soil/12 outline-none transition-[transform,opacity] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] lg:max-w-md lg:rounded-[2rem] lg:shadow-[0_28px_70px_-24px_rgba(69,89,78,0.5)]',
            open
              ? 'translate-y-0 opacity-100 lg:scale-100'
              : 'translate-y-full opacity-0 lg:translate-y-4 lg:scale-95',
          )}
        >
          <div className="mx-auto mt-3 h-1.5 w-10 shrink-0 rounded-full bg-ink/15 lg:hidden" aria-hidden />

          <div className="p-5 sm:p-6">
            <div className="flex items-start gap-3">
              <span
                className={cn(
                  'flex size-10 shrink-0 items-center justify-center rounded-2xl',
                  tone === 'danger' ? 'bg-plum/20 text-plum' : 'bg-sage text-forest',
                )}
              >
                <Icon className="size-5" strokeWidth={2.2} aria-hidden />
              </span>
              <h2
                id={`${id}-title`}
                className="min-w-0 flex-1 pt-1.5 text-lg font-medium tracking-tight text-forest"
              >
                {title}
              </h2>
              <button
                type="button"
                onClick={onClose}
                aria-label="Tutup"
                className="flex size-9 shrink-0 items-center justify-center rounded-full bg-cream text-forest ring-1 ring-soil/12 transition-colors hover:bg-sage"
              >
                <X className="size-4" strokeWidth={2.2} />
              </button>
            </div>

            <div className="mt-3 text-[13.5px] leading-relaxed text-forest/60">{body}</div>
          </div>

          {/* aksi ditumpuk vertikal: tiap keputusan dapat barisnya sendiri, jadi
              tidak ada tombol kecil yang gampang salah pencet di mobile */}
          <div className="flex flex-col gap-2 border-t border-soil/12 p-5 sm:p-6">{actions}</div>
        </div>
      </div>
    </div>
  )
}

/** Tombol aksi di dalam dialog — tiga nada, lebar penuh supaya mudah dipencet. */
export function DialogButton({
  tone = 'primary',
  onClick,
  disabled,
  children,
}: {
  tone?: 'primary' | 'neutral' | 'danger'
  onClick: () => void
  disabled?: boolean
  children: ReactNode
}) {
  const TONES = {
    primary: 'bg-forest text-mint hover:bg-forest-soft',
    neutral: 'bg-cream text-forest ring-1 ring-soil/12 hover:bg-sage',
    danger: 'bg-plum/20 text-plum ring-1 ring-plum/30 hover:bg-plum/30',
  } as const

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'flex w-full items-center justify-center gap-2 rounded-2xl py-3 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-45',
        TONES[tone],
      )}
    >
      {children}
    </button>
  )
}
