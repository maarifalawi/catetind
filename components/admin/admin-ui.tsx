'use client'

import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

/* ── PERANGKAT TAMPILAN DASHBOARD ADMIN ──────────────────────────────────────
   Semua warna diambil dari token palet resmi (`app/globals.css`): cream, sage,
   forest, mint, daisy, plum, cantelope, thistle. Tidak ada hex/rgb literal dan
   tidak ada kelas bawaan Tailwind (audit `pnpm theme:audit`).
   ────────────────────────────────────────────────────────────────────────── */

export type AdminTone = 'forest' | 'mint' | 'daisy' | 'plum' | 'cantelope' | 'thistle'

const PILL_TONES: Record<AdminTone, string> = {
  forest: 'bg-forest/10 text-forest ring-forest/15',
  mint: 'bg-mint/25 text-forest ring-mint/40',
  daisy: 'bg-daisy/30 text-daisy-deep ring-daisy/40',
  plum: 'bg-plum/20 text-plum-deep ring-plum/30',
  cantelope: 'bg-cantelope/25 text-cantelope-deep ring-cantelope/40',
  thistle: 'bg-thistle/20 text-thistle-deep ring-thistle/30',
}

const BAR_TONES: Record<AdminTone, string> = {
  forest: 'bg-forest',
  mint: 'bg-mint',
  daisy: 'bg-daisy',
  plum: 'bg-plum',
  cantelope: 'bg-cantelope',
  thistle: 'bg-thistle',
}

export function AdminPill({
  children,
  tone = 'forest',
  className,
}: {
  children: ReactNode
  tone?: AdminTone
  className?: string
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold ring-1 ring-inset',
        PILL_TONES[tone],
        className,
      )}
    >
      {children}
    </span>
  )
}

export function AdminSection({
  title,
  description,
  action,
  children,
  className,
}: {
  title: string
  description?: string
  action?: ReactNode
  children: ReactNode
  className?: string
}) {
  return (
    <section
      className={cn(
        'rounded-[1.4rem] bg-cream p-4 ring-1 ring-soil/10 sm:p-5',
        'shadow-[0_18px_40px_-32px_rgba(0,0,0,0.35)]',
        className,
      )}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-[15px] font-semibold text-forest">{title}</h2>
          {description && (
            <p className="mt-1 max-w-2xl text-[12px] leading-relaxed text-forest/55">
              {description}
            </p>
          )}
        </div>
        {action}
      </div>
      <div className="mt-4">{children}</div>
    </section>
  )
}

export function AdminStat({
  label,
  value,
  hint,
  tone = 'forest',
}: {
  label: string
  value: string
  hint?: string
  tone?: AdminTone
}) {
  return (
    <div className="rounded-2xl bg-sage/50 p-3 ring-1 ring-soil/[0.06]">
      <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-forest/50">{label}</p>
      <p className="mt-1 text-[20px] font-semibold leading-tight text-forest">{value}</p>
      {hint && (
        <p className="mt-1 flex items-center gap-1.5 text-[11px] leading-snug text-forest/55">
          <span className={cn('size-1.5 shrink-0 rounded-full', BAR_TONES[tone])} aria-hidden />
          {hint}
        </p>
      )}
    </div>
  )
}

export function AdminBar({
  percent,
  tone = 'forest',
  label,
}: {
  /** 0–100 */
  percent: number
  tone?: AdminTone
  label?: string
}) {
  const safe = Math.max(0, Math.min(100, Number.isFinite(percent) ? percent : 0))
  return (
    <div
      className="h-2 w-full overflow-hidden rounded-full bg-ink/[0.07]"
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(safe)}
      aria-label={label}
    >
      <div
        className={cn('h-full rounded-full transition-[width] duration-500', BAR_TONES[tone])}
        style={{ width: `${safe}%` }}
      />
    </div>
  )
}

export function AdminEmpty({ children }: { children: ReactNode }) {
  return (
    <p className="rounded-2xl bg-sage/40 px-4 py-6 text-center text-[12px] leading-relaxed text-forest/55">
      {children}
    </p>
  )
}

/* ── FORMAT (id-ID) ───────────────────────────────────────────────────────── */

export function formatNumber(value: number): string {
  return Math.max(0, Math.round(value)).toLocaleString('id-ID')
}

export function formatPercent(value: number): string {
  return `${value.toLocaleString('id-ID', { maximumFractionDigits: 1 })}%`
}

export function formatDate(iso: string | null | undefined): string {
  if (!iso) return '—'
  const time = Date.parse(iso)
  if (!Number.isFinite(time)) return '—'
  return new Intl.DateTimeFormat('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(new Date(time))
}

export function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return '—'
  const time = Date.parse(iso)
  if (!Number.isFinite(time)) return '—'
  return new Intl.DateTimeFormat('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(time))
}

/** 0 → "habis hari ini" · 3 → "3 hari lagi" · -2 → "lewat 2 hari" */
export function daysLabel(days: number): string {
  if (days === 0) return 'habis hari ini'
  return days > 0 ? `${days} hari lagi` : `lewat ${Math.abs(days)} hari`
}
