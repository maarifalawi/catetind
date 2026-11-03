'use client'

import type { ReactNode } from 'react'
import { Info } from 'lucide-react'
import { cn } from '@/lib/utils'

/* ── PERANGKAT TAMPILAN DASHBOARD ADMIN (versi ringkas) ──────────────────────
   Aturan tampilan yang dipegang di sini — satu tempat, bukan di tiap halaman:

     · ANGKA DULU. Kotak = judul 1–4 kata + angka/baris. Tidak ada paragraf
       penjelasan; konteks yang benar-benar perlu hidup di `note` (ikon ⓘ).
     · SATU ANGKA, SATU TEMPAT. Tidak ada nilai yang diulang jadi pill di
       beberapa kotak — pill hanya untuk STATUS (lunas, tanpa paket, …).
     · ANGKA RATA. Semua nominal & hitungan memakai `tabular-nums`, jadi kolom
       angka tidak "bergoyang" antar baris.
     · TANPA SHADOW. Pemisah = garis rambut (`ring-soil/[0.08]`,
       `divide-soil/[0.06]`). Warna = arti, bukan hiasan: forest netral,
       mint uang masuk, plum perlu dicek.

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

/** tombol ikon di top bar (satu bentuk untuk semua aksi alat) */
export const ADMIN_TOOL_BUTTON =
  'inline-flex size-8 shrink-0 items-center justify-center rounded-full text-forest/60 ring-1 ring-soil/[0.08] transition-colors hover:bg-sage/60 hover:text-forest disabled:cursor-not-allowed disabled:opacity-40'

/** tombol teks kecil (aksi baris/tabel) */
export const ADMIN_SMALL_BUTTON =
  'inline-flex items-center gap-1.5 rounded-full bg-cream px-2.5 py-1.5 text-[11px] font-semibold text-forest ring-1 ring-soil/[0.08] transition-colors hover:bg-sage/60 disabled:cursor-not-allowed disabled:text-forest/35'

/** tombol utama kecil (aksi yang mengubah data) */
export const ADMIN_PRIMARY_BUTTON =
  'inline-flex items-center justify-center gap-1.5 rounded-xl bg-forest px-3 py-2 text-[12px] font-semibold text-cream transition-colors hover:bg-forest-soft disabled:cursor-not-allowed disabled:bg-ink/[0.07] disabled:text-forest/35'

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
        'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10.5px] font-semibold ring-1 ring-inset',
        PILL_TONES[tone],
        className,
      )}
    >
      {children}
    </span>
  )
}

/**
 * Konteks singkat di balik judul kotak — pengganti `description` yang dulu
 * memakan 2–4 baris di setiap kartu. Teks panjangnya hidup di tooltip, jadi
 * layar tetap "satu pandang" tanpa kehilangan artinya.
 */
export function AdminNote({ children }: { children: ReactNode }) {
  const text = typeof children === 'string' ? children : undefined
  return (
    <span
      className="inline-flex shrink-0 align-middle text-forest/25 transition-colors hover:text-forest/50"
      title={text}
      aria-label={text}
      role="img"
    >
      <Info className="size-3.5" aria-hidden strokeWidth={1.8} />
    </span>
  )
}

export function AdminSection({
  title,
  note,
  action,
  children,
  className,
}: {
  /** kosong = panel polos (tanpa judul) */
  title?: string
  /** konteks 1 kalimat → tampil sebagai ⓘ, bukan paragraf */
  note?: string
  action?: ReactNode
  children: ReactNode
  className?: string
}) {
  const hasHeader = Boolean(title) || Boolean(action)
  return (
    <section className={cn('rounded-2xl bg-cream p-4 ring-1 ring-soil/[0.08]', className)}>
      {hasHeader && (
        <div className="flex items-start justify-between gap-3">
          {title && (
            <h2 className="flex min-w-0 items-center gap-1.5 text-[13px] font-semibold tracking-tight text-forest">
              {title}
              {note && <AdminNote>{note}</AdminNote>}
            </h2>
          )}
          {action}
        </div>
      )}
      <div className={hasHeader ? 'mt-3' : undefined}>{children}</div>
    </section>
  )
}

/** daftar baris tanpa kotak per item — pemisah cukup garis rambut */
export function AdminList({ children, className }: { children: ReactNode; className?: string }) {
  return <ul className={cn('divide-y divide-soil/[0.06]', className)}>{children}</ul>
}

/** satu baris daftar: satu label di kiri, satu fakta di kanan */
export function AdminListRow({
  left,
  right,
  meta,
  className,
}: {
  left: ReactNode
  right?: ReactNode
  /** baris kedua yang lebih kecil (tanggal/keadaan) — maksimal satu */
  meta?: ReactNode
  className?: string
}) {
  return (
    <li className={cn('flex items-center justify-between gap-3 py-2', className)}>
      <div className="min-w-0">
        <p className="truncate text-[12.5px] font-medium text-forest">{left}</p>
        {meta && <p className="mt-0.5 truncate text-[11px] tabular-nums text-forest/45">{meta}</p>}
      </div>
      {right && (
        <div className="shrink-0 text-right text-[12px] font-semibold tabular-nums text-forest">
          {right}
        </div>
      )}
    </li>
  )
}

/**
 * Satu angka ringkas: label kecil di atas, nilai besar, satu keterangan pendek.
 * Tidak punya latar sendiri — kelompoknya yang memberi permukaan (panel),
 * supaya layar tidak penuh kotak-kotak kecil.
 */
export function AdminStat({
  label,
  value,
  hint,
  className,
}: {
  label: string
  value: string
  hint?: string
  className?: string
}) {
  return (
    <div className={cn('min-w-0', className)}>
      <p className="text-[10.5px] font-medium uppercase tracking-[0.12em] text-forest/40">
        {label}
      </p>
      <p className="mt-1 text-[22px] font-semibold leading-none tracking-tight tabular-nums text-forest">
        {value}
      </p>
      {hint && <p className="mt-1.5 truncate text-[11px] tabular-nums text-forest/45">{hint}</p>}
    </div>
  )
}

/** bar tipis (bukan donut) — membandingkan porsi dalam satu garis pandang */
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
      className="h-1 w-full overflow-hidden rounded-full bg-ink/[0.06]"
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
    <p className="rounded-xl bg-sage/40 px-3 py-4 text-center text-[11.5px] text-forest/45">
      {children}
    </p>
  )
}

/** satu keterangan kecil di bawah isi kotak (bukan kalimat penjelas) */
export function AdminMeta({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <p className={cn('text-[11px] leading-snug tabular-nums text-forest/45', className)}>
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

/**
 * "baru saja" · "12 mnt lalu" · "3 jam lalu" · "5 hr lalu" — dipakai di top bar
 * supaya kesegaran snapshot terbaca tanpa kalimat "Snapshot dibuat …".
 * Nama bulan tetap muncul untuk data yang lebih tua dari 30 hari.
 */
export function formatRelative(iso: string | null | undefined, nowMs = Date.now()): string {
  if (!iso) return '—'
  const time = Date.parse(iso)
  if (!Number.isFinite(time)) return '—'
  const minutes = Math.round((nowMs - time) / 60_000)
  if (minutes < 1) return 'baru saja'
  if (minutes < 60) return `${minutes} mnt lalu`
  const hours = Math.round(minutes / 60)
  if (hours < 24) return `${hours} jam lalu`
  const days = Math.round(hours / 24)
  if (days < 30) return `${days} hr lalu`
  return formatDate(iso)
}

/** 0 → "habis hari ini" · 3 → "3 hari lagi" · -2 → "lewat 2 hari" */
export function daysLabel(days: number): string {
  if (days === 0) return 'habis hari ini'
  return days > 0 ? `${days} hari lagi` : `lewat ${Math.abs(days)} hari`
}
