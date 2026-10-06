'use client'

import type { ComponentProps, ReactNode } from 'react'
import type { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

/* ── Primitif UI halaman Pengaturan (inventaris #15–#22) ───────────────────────
   Semua section di layout master-detail memakai bahan yang SAMA dengan kartu
   Dashboard: permukaan putih (`bg-cream`) + hairline `ring-soil/12`, radius
   `rounded-[1.75rem]`, dan resep judul yang sudah dipakai halaman lain.
   Tidak ada warna baru di sini — nada status (aman / mendekati batas / lewat
   batas) memakai token kanon `mint`, `hud-amber`, `plum`, `sage`.

   File ini sengaja HANYA berisi bahan presentasional (tanpa state domain),
   supaya panel-panel di `settings-panel-*.tsx` tinggal menyusun isinya. */

/** Kepala satu detail panel: eyebrow kecil + judul + penjelasan satu baris. */
export function SettingsPanel({
  eyebrow,
  title,
  desc,
  children,
}: {
  eyebrow: string
  title: string
  desc?: string
  children: ReactNode
}) {
  return (
    <section className="flex w-full min-w-0 flex-col gap-4">
      <header className="min-w-0">
        <p className="text-[10.5px] font-medium tracking-[0.16em] text-forest/40 uppercase">
          {eyebrow}
        </p>
        <h2 className="mt-1.5 font-display text-xl font-medium tracking-tight text-forest sm:text-2xl">
          {title}
        </h2>
        {desc && (
          <p className="mt-1.5 max-w-2xl text-[13px] leading-relaxed text-forest/55">{desc}</p>
        )}
      </header>
      {children}
    </section>
  )
}

/** Kartu section — permukaan + hairline yang sama dengan kartu Dashboard. */
export function SettingsCard({
  title,
  desc,
  action,
  tone = 'default',
  className,
  children,
}: {
  title?: string
  desc?: string
  action?: ReactNode
  /** `danger` = kartu Zona Berbahaya (ring prem, bukan merah alarm) */
  tone?: 'default' | 'danger'
  className?: string
  children?: ReactNode
}) {
  return (
    <section
      className={cn(
        'rounded-[1.75rem] bg-cream p-5 ring-1 sm:p-6',
        tone === 'danger' ? 'ring-plum/30' : 'ring-soil/12',
        className,
      )}
    >
      {(title || action) && (
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            {title && (
              <h3
                className={cn(
                  'text-[15px] font-medium',
                  tone === 'danger' ? 'text-plum' : 'text-forest',
                )}
              >
                {title}
              </h3>
            )}
            {desc && <p className="mt-1 text-[12.5px] leading-relaxed text-forest/55">{desc}</p>}
          </div>
          {action}
        </div>
      )}
      {children}
    </section>
  )
}

/** Baris label + helper dengan slot kontrol di kanan (tombol / input / pill). */
export function SettingsRow({
  label,
  helper,
  className,
  children,
}: {
  label: string
  helper?: string
  className?: string
  children?: ReactNode
}) {
  return (
    <div className={cn('flex items-center gap-4 py-3.5 first:pt-0 last:pb-0', className)}>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-forest">{label}</p>
        {helper && <p className="mt-0.5 text-xs leading-relaxed text-forest/50">{helper}</p>}
      </div>
      {children}
    </div>
  )
}

/** Pill status. Nadanya HANYA dari token kanon (mint / amber / prem / sage). */
export function TonePill({
  tone = 'neutral',
  icon: Icon,
  className,
  children,
}: {
  tone?: 'positive' | 'warning' | 'danger' | 'neutral'
  icon?: LucideIcon
  className?: string
  children: ReactNode
}) {
  const TONES = {
    positive: 'bg-mint/30 text-forest',
    warning: 'bg-hud-amber/30 text-forest/70',
    danger: 'bg-plum/20 text-plum',
    neutral: 'bg-sage text-forest/60',
  } as const

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium',
        TONES[tone],
        className,
      )}
    >
      {Icon && <Icon className="size-3.5" strokeWidth={2.4} aria-hidden />}
      {children}
    </span>
  )
}

/** Switch — ukuran, warna, dan durasi identik dengan NotificationSettings. */
export function Toggle({
  checked,
  onToggle,
  label,
  disabled,
}: {
  checked: boolean
  onToggle: () => void
  label: string
  disabled?: boolean
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={onToggle}
      className={cn(
        'relative h-7 w-12 shrink-0 rounded-full transition-colors duration-200 disabled:cursor-not-allowed disabled:opacity-45',
        checked ? 'bg-forest' : 'bg-soil/[0.12]',
      )}
    >
      <span
        className={cn(
          'absolute top-0.5 left-0.5 size-6 rounded-full bg-cream shadow-sm transition-transform duration-200',
          checked && 'translate-x-5',
        )}
      />
    </button>
  )
}

/** Baris toggle lengkap: label + helper di kiri, switch di kanan. */
export function ToggleRow({
  label,
  helper,
  checked,
  onToggle,
  disabled,
}: {
  label: string
  helper?: string
  checked: boolean
  onToggle: () => void
  disabled?: boolean
}) {
  return (
    <div className="flex items-center gap-4 py-3.5 first:pt-0 last:pb-0">
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-forest">{label}</p>
        {helper && <p className="mt-0.5 text-xs leading-relaxed text-forest/50">{helper}</p>}
      </div>
      <Toggle checked={checked} onToggle={onToggle} label={label} disabled={disabled} />
    </div>
  )
}

/** Segmented control (radiogroup) — pill sage/cream, satu resep untuk semua panel. */
export function Segmented<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string
  value: T
  options: { id: T; label: string; emoji?: string }[]
  onChange: (id: T) => void
}) {
  return (
    <div
      role="radiogroup"
      aria-label={label}
      className="flex w-full flex-wrap gap-1 rounded-[1.25rem] bg-sage p-1 ring-1 ring-soil/10 sm:inline-flex sm:w-auto sm:rounded-full"
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
              'inline-flex flex-1 items-center justify-center gap-1.5 rounded-[0.9rem] px-3.5 py-2 text-[12.5px] font-medium transition-colors sm:flex-none sm:rounded-full',
              active ? 'bg-cream text-forest shadow-sm' : 'text-forest/55 hover:text-forest',
            )}
          >
            {option.emoji && <span aria-hidden>{option.emoji}</span>}
            {option.label}
          </button>
        )
      })}
    </div>
  )
}

/** Input teks/angka pengaturan — radius & hairline sama dengan input onboarding. */
export function SettingsInput({ className, ...props }: ComponentProps<'input'>) {
  return (
    <input
      {...props}
      className={cn(
        'w-full rounded-2xl bg-cream px-4 py-3 text-sm text-forest ring-1 ring-soil/12 outline-none transition-shadow placeholder:text-forest/30 focus:ring-2 focus:ring-forest/30 disabled:cursor-not-allowed disabled:bg-sage/40 disabled:text-forest/45',
        className,
      )}
    />
  )
}

/** Baris form: label kecil + kontrol + catatan helper di bawahnya. */
export function SettingsField({
  label,
  note,
  htmlFor,
  children,
}: {
  label: string
  note?: string
  htmlFor?: string
  children: ReactNode
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label
        htmlFor={htmlFor}
        className="text-[11px] font-medium tracking-[0.08em] text-forest/45 uppercase"
      >
        {label}
      </label>
      {children}
      {note && <p className="text-[11.5px] leading-relaxed text-forest/45">{note}</p>}
    </div>
  )
}



