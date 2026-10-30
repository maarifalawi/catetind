'use client'

import Link from 'next/link'
import { Check, type LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

/* ── PANEL DAFTAR BERSAMA (paket 95 · permintaan pemilik produk) ──────────────
   Semua tombol yang "mengeluarkan list" di app ini (pemilih konteks uang, menu
   kartu dompet, menu "…" hutang/piutang, dst.) memakai SATU panel ini supaya
   wajahnya konsisten — bukan lagi deretan teks polos:

     · permukaan kaca: `bg-cream/95` + `backdrop-blur-xl` + ring halus + bayangan
       lembut (terang, lega, dan tetap terbaca di atas kartu di belakangnya);
     · tiap opsi = IKON di tile + JUDUL + SUB-BARISAN pembantu, jadi user tahu
       apa yang ia pilih tanpa menebak dari satu kata;
     · target sentuh `min-h-12` (48px) — aman di mobile;
     · opsi aktif ditandai latar sage + centang (bukan cuma warna teks).

   Komponen ini murni presentasional (tanpa state) supaya tiap pemakainya tetap
   memegang kebenaran statusnya sendiri. */

/** nada baris: normal, aksen brand, atau aksi merusak (hapus) */
export type MenuOptionTone = 'default' | 'accent' | 'danger'

export function MenuPanel({
  label,
  role = 'listbox',
  className,
  children,
}: {
  /** judul kecil di kepala panel (mis. "Pilih konteks"); `undefined` = tanpa kepala */
  label?: string
  /** `listbox` (pilih-satu) atau `menu` (daftar aksi) — a11y */
  role?: 'listbox' | 'menu'
  className?: string
  children: React.ReactNode
}) {
  return (
    <div
      className={cn(
        'w-64 overflow-hidden rounded-[1.4rem] bg-cream/95 p-1.5 shadow-[0_28px_60px_-22px_rgba(0,0,0,0.55)] ring-1 ring-soil/12 backdrop-blur-xl',
        className,
      )}
    >
      {label && (
        <p
          aria-hidden
          className="px-2.5 pb-1.5 pt-1 text-[11px] font-medium uppercase tracking-[0.16em] text-forest/40"
        >
          {label}
        </p>
      )}
      <ul role={role} aria-label={label} className="flex flex-col gap-0.5">
        {children}
      </ul>
    </div>
  )
}

export function MenuOption({
  icon: Icon,
  label,
  helper,
  selected = false,
  tone = 'default',
  role = 'option',
  onClick,
  href,
}: {
  icon: LucideIcon
  label: string
  /** keterangan satu baris di bawah judul (mis. "Pindahkan dana antar dompet") */
  helper?: string
  selected?: boolean
  tone?: MenuOptionTone
  role?: 'option' | 'menuitem'
  onClick?: () => void
  /** kalau diisi, baris jadi tautan (mis. pintasan ke halaman lain) */
  href?: string
}) {
  const danger = tone === 'danger'
  const body = (
    <>
      <span
        className={cn(
          'flex size-9 shrink-0 items-center justify-center rounded-xl ring-1 ring-inset',
          danger
            ? 'bg-plum/15 text-plum ring-plum/20'
            : selected || tone === 'accent'
              ? 'bg-forest text-mint ring-forest/20'
              : 'bg-sage text-forest ring-forest/10',
        )}
      >
        <Icon className="size-4" strokeWidth={2.2} aria-hidden />
      </span>
      <span className="min-w-0 flex-1 text-left">
        <span
          className={cn(
            'block truncate text-[14px] font-medium leading-tight',
            danger ? 'text-plum' : 'text-forest',
          )}
        >
          {label}
        </span>
        {helper && (
          <span className="mt-0.5 block truncate text-[12px] leading-snug text-forest/45">
            {helper}
          </span>
        )}
      </span>
      {selected && <Check className="ml-1 size-4 shrink-0 text-forest" strokeWidth={2.6} aria-hidden />}
    </>
  )

  const cls = cn(
    'flex min-h-12 w-full items-center gap-2.5 rounded-2xl px-2.5 py-2 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-forest/25',
    selected ? 'bg-sage/70' : danger ? 'hover:bg-plum/10' : 'hover:bg-sage/50',
  )

  return (
    <li role="none">
      {href ? (
        <Link
          href={href}
          role={role}
          aria-selected={role === 'option' ? selected : undefined}
          className={cls}
          onClick={onClick}
        >
          {body}
        </Link>
      ) : (
        <button
          type="button"
          role={role}
          aria-selected={role === 'option' ? selected : undefined}
          onClick={onClick}
          className={cls}
        >
          {body}
        </button>
      )}
    </li>
  )
}
