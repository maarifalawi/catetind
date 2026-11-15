'use client'

import { Plus } from 'lucide-react'
import { cn } from '@/lib/utils'
import { amountSign, maskMoney } from '@/lib/data/history'
import {
  CALENDAR_DAY_COPY,
  longDateLabel,
  type CalendarCell,
  type CalendarEntry,
  type CalendarEntryType,
} from '@/lib/data/calendar'
import type { TransactionType } from '@/lib/types'
import { categoryVisualFor, moneyRowVisualFor } from './transaction-category-visual'

/* ── 3. Panel Detail Tanggal (kolom kanan) ───────────────────────────────────
   Panel yang mengikuti tanggal terpilih. Susunannya sengaja rata dan fokus:

     ● HARI INI · Selasa, 20 Oktober 2026
       −Rp 1.400.000 keluar · 4 catatan
     [ + Tambah Catatan di Tgl 20 ]
     ── Transaksi ─────────────────────────

   Yang TIDAK ada lagi di sini: banner peringatan belanja di atas rata-rata,
   catatan penjelas tagihan, emoji empty-state, dan rincian jenis uang. Kalau
   sebuah hari memang boros, tint sel di kalender yang mengatakannya; panel ini
   hanya menampilkan fakta hari itu.

   Baris transaksi memakai tabel visual yang SAMA dengan Riwayat & Dashboard
   (`transaction-category-visual`): tile ikon keluarga kategori, latar baris
   soft, satu chip kategori, dan nada nominal `MONEY_TONE`. Tidak ada pola baru.
   ────────────────────────────────────────────────────────────────────────── */

/** micro-badge relatif di kepala panel tanggal. */
function relativeBadge(cell: CalendarCell) {
  if (cell.isToday) return { text: 'Hari Ini', tone: 'today' as const }
  if (cell.daysFromToday > 0) {
    return {
      text: cell.daysFromToday === 1 ? 'Besok' : `${cell.daysFromToday} hari lagi`,
      tone: 'ahead' as const,
    }
  }
  return {
    text: cell.daysFromToday === -1 ? 'Kemarin' : `${Math.abs(cell.daysFromToday)} hari lalu`,
    tone: 'behind' as const,
  }
}

/** jenis entri kalender → tipe transaksi app (untuk nada nominal bersama) */
function calendarTransactionType(type: CalendarEntryType): TransactionType {
  if (type === 'income') return 'income'
  if (type === 'money_movement') return 'transfer'
  return 'expense'
}

export function CashflowInspector({
  cell,
  masked,
  onAddNote,
}: {
  cell: CalendarCell | null
  masked: boolean
  /** buka `AddCalendarNoteSheet` untuk tanggal yang sedang dipilih */
  onAddNote: () => void
}) {
  if (!cell) {
    return (
      <aside className="rounded-2xl bg-cream p-4 ring-1 ring-soil/12 lg:sticky lg:top-8">
        <h2 className="font-display text-[16px] font-medium tracking-tight text-forest">
          {CALENDAR_DAY_COPY.pickTitle}
        </h2>
      </aside>
    )
  }

  const relative = relativeBadge(cell)
  const isEmptyDay = cell.entries.length === 0
  const countLabel = CALENDAR_DAY_COPY.countLabel(cell.entries.length)

  return (
    <aside
      data-catetind-tanggal-detail="kalender"
      className="flex flex-col rounded-2xl bg-cream p-4 shadow-[0_4px_24px_-4px_rgba(0,0,0,0.06)] ring-1 ring-soil/12 sm:p-5 lg:sticky lg:top-8"
    >
      {/* ── 3A. TANGGAL TERPILIH — hierarki jelas, tidak bertumpuk ────────
          Baris 1: label relatif (Hari ini / Kemarin / 3 hari lagi).
          Baris 2: tanggal lengkap, ukuran lebih besar.
          Baris 3: grid dua kolom "Masuk" & "Keluar" + jumlah catatan.
          Di ponsel pun tidak ada teks yang berdesakan dalam satu baris. */}
      <div className="flex flex-col gap-1">
        <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-forest-muted">
          {relative.text}
        </span>
        <h2 className="text-[17px] font-semibold leading-snug tracking-tight text-forest">
          {longDateLabel(cell.date)}
        </h2>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2">
        <div className="rounded-xl bg-sage/30 px-3 py-2">
          <p className="text-[11px] font-medium text-forest-muted">Masuk</p>
          <p className="mt-0.5 truncate text-[14px] font-semibold tabular-nums text-forest">
            {cell.income > 0 ? `+${maskMoney(cell.income, masked)}` : '—'}
          </p>
        </div>
        <div className="rounded-xl bg-sage/30 px-3 py-2">
          <p className="text-[11px] font-medium text-forest-muted">Keluar</p>
          <p className="mt-0.5 truncate text-[14px] font-semibold tabular-nums text-forest-soft">
            {cell.totalSpend > 0 ? `−${maskMoney(cell.totalSpend, masked)}` : '—'}
          </p>
        </div>
      </div>
      <p className="mt-2 text-[12px] font-medium text-forest-muted">{countLabel}</p>

      {/* ── 3B. ZERO-FRICTION BACKDATING ─────────────────────────────────
          Tombol penuh, gaya CTA yang sama dengan halaman Tagihan. */}
      <button
        type="button"
        onClick={onAddNote}
        className="mt-3 inline-flex h-10 w-full items-center justify-center gap-2 rounded-full bg-forest px-4 text-[13.5px] font-medium text-cream transition-colors hover:bg-forest-soft active:scale-[0.99]"
      >
        <Plus className="size-4" strokeWidth={2.8} aria-hidden />
        {CALENDAR_DAY_COPY.addNote(cell.day)}
      </button>

      {/* ── 3C. DAFTAR CATATAN HARI ITU ─────────────────────────────────── */}
      <section className="mt-5 border-t border-soil/12 pt-4">
        <div className="flex items-center gap-2">
          <h3 className="shrink-0 text-[12px] font-semibold uppercase tracking-[0.12em] text-forest-muted">
            {CALENDAR_DAY_COPY.listTitle(cell.isFuture)}
          </h3>
          <span aria-hidden className="h-px flex-1 bg-soil/10" />
        </div>

        {isEmptyDay ? (
          <p className="py-6 text-center text-[13px] leading-relaxed text-forest-muted">
            {cell.isFuture
              ? CALENDAR_DAY_COPY.emptyFuture.title
              : CALENDAR_DAY_COPY.emptyPast.title}
          </p>
        ) : (
          <ul
            data-lenis-prevent
            className="mt-3 flex max-h-[21rem] flex-col gap-1.5 overflow-y-auto pr-0.5"
          >
            {cell.entries.map((entry) => (
              <CashflowEntryRow key={entry.id} entry={entry} masked={masked} />
            ))}
          </ul>
        )}
      </section>
    </aside>
  )
}

/* ── Satu baris catatan — visual yang sama dengan Riwayat & Dashboard ──────
   Tile ikon + latar baris + chip kategori + nada nominal semuanya berasal dari
   `transaction-category-visual`, jadi transaksi yang sama tidak mungkin tampil
   dengan warna berbeda di dua halaman. Satu chip kategori per baris; dompet &
   jam tetap teks sekunder yang redup. */
function CashflowEntryRow({ entry, masked }: { entry: CalendarEntry; masked: boolean }) {
  const visual = categoryVisualFor(entry.category)
  const type = calendarTransactionType(entry.type)
  const tone = moneyRowVisualFor(type)
  /* nama baris boleh sama dengan kategorinya (catatan tanpa judul) — chip
     kategori tidak perlu mengulang kata yang sudah jadi judul */
  const categoryShownAsTitle =
    entry.name.trim().toLowerCase() === entry.category.trim().toLowerCase()

  return (
    <li className="relative select-none overflow-hidden rounded-xl">
      <div className={cn('group flex items-center rounded-xl', visual.row)}>
        <div className="flex min-w-0 flex-1 items-center gap-3 py-3.5 pl-1 pr-3 text-left">
          <span
            aria-hidden
            className={cn(
              'flex size-9 shrink-0 items-center justify-center rounded-xl transition-transform duration-300 group-hover:scale-105',
              visual.tile,
            )}
          >
            <visual.icon className="size-4" strokeWidth={2.2} />
          </span>

          <span className="min-w-0 flex-1">
            <span className="line-clamp-2 text-[14.5px] font-medium text-forest">
              {entry.name}
            </span>
            <span className="mt-0.5 flex min-w-0 items-center gap-1.5 text-[12.5px] text-forest-muted">
              {entry.wallet && <span className="min-w-0 truncate">{entry.wallet} ·</span>}
              {entry.time && <span className="shrink-0">{entry.time}</span>}
              {!categoryShownAsTitle && (
                <span
                  className={cn(
                    'min-w-0 truncate rounded-full px-1.5 py-0.5 text-[11px] font-medium',
                    visual.chip,
                  )}
                >
                  {entry.category}
                </span>
              )}
            </span>
          </span>

          <span className={cn('shrink-0 text-[14.5px] font-medium tabular-nums', tone.text)}>
            {amountSign(type)}
            {maskMoney(entry.amount, masked)}
          </span>
        </div>
      </div>
    </li>
  )
}

