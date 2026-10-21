'use client'

import { ChevronLeft, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import { maskMoney } from '@/lib/data/history'
import {
  CALENDAR_LOOK_CELL,
  CALENDAR_LOOK_WORD,
  CALENDAR_WEEKDAYS,
  calendarCellLook,
  type CalendarCell,
  type CalendarGrid,
  type PeriodMode,
  type PeriodSummary,
} from '@/lib/data/calendar'

/* ── 2B. Kalender Grid — navigasi, bukan tabel data ─────────────────────────
   Satu sel hanya membawa tiga hal: angka tanggal, tint status keuangan, dan
   satu titik kecil bila ada tagihan terjadwal. Tidak ada nominal, tidak ada
   chip, tidak ada legenda. Detail uang selalu dibuka lewat tap di panel hari
   (CashflowInspector).

   Warna sel tetap memakai `calendarCellLook()` dan token palet kanon yang
   sudah dipakai seluruh app (terracotta, forest, mint, ink, soil, cream) —
   tidak ada warna atau hex baru di sini.

   Hari terpilih memakai pola yang sama dengan kalender Tagihan: cincin
   `ring-forest/70` (atau `ring-cream/80` di sel gelap). Titik tagihan memakai
   `bg-current opacity-60`, persis titik di kalender Tagihan.
   ────────────────────────────────────────────────────────────────────────── */

export function CashflowCalendarGrid({
  grid,
  mode,
  label,
  summary,
  selectedDate,
  masked,
  onModeChange,
  onShift,
  onToday,
  onSelectDate,
}: {
  grid: CalendarGrid
  mode: PeriodMode
  /** label navigator, mis. `September 2026` */
  label: string
  summary: PeriodSummary
  selectedDate: string
  masked: boolean
  onModeChange: (mode: PeriodMode) => void
  /** geser periode ±1 bulan */
  onShift: (months: number) => void
  onToday: () => void
  onSelectDate: (iso: string) => void
}) {
  const modeOptions: { id: PeriodMode; label: string }[] = [
    { id: 'standard', label: 'Bulanan' },
    { id: 'payday', label: 'Siklus Gajian' },
  ]

  const netSign = summary.net > 0 ? '+' : summary.net < 0 ? '−' : ''

  return (
    <section className="rounded-[2rem] bg-cream p-5 shadow-[0_4px_24px_-4px_rgba(0,0,0,0.06)] ring-1 ring-soil/12 sm:p-6">
      {/* ── HEADER: satu baris informasi + satu baris kontrol ──────────────
          Baris 1: periode · net bulan ini · navigator ‹ ›.
          Baris 2: dua toggle mode (primer) + Hari Ini (sekunder/ghost).
          Tidak ada sub-teks rentang tanggal; nama periode sudah cukup. */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 flex-wrap items-baseline gap-x-1.5 gap-y-0.5">
          <h2 className="font-display text-[16px] font-semibold tracking-tight text-forest sm:text-[17px]">
            {label}
          </h2>
          <span aria-hidden className="text-[11.5px] font-medium text-forest/25">
            ·
          </span>
          <p className="text-[11.5px] font-medium text-forest/50">
            Net{' '}
            <span
              className={cn(
                'tabular-nums',
                summary.net < 0 ? 'text-hud-terracotta' : 'text-forest',
              )}
            >
              {netSign}
              {maskMoney(Math.abs(summary.net), masked)}
            </span>
          </p>
        </div>

        <div className="flex shrink-0 items-center gap-0.5">
          <button
            type="button"
            onClick={() => onShift(-1)}
            aria-label="Periode sebelumnya"
            className="flex size-8 items-center justify-center rounded-full text-forest/45 transition-colors hover:bg-sage/60 hover:text-forest active:scale-95"
          >
            <ChevronLeft className="size-4" strokeWidth={2.6} />
          </button>
          <button
            type="button"
            onClick={() => onShift(1)}
            aria-label="Periode berikutnya"
            className="flex size-8 items-center justify-center rounded-full text-forest/45 transition-colors hover:bg-sage/60 hover:text-forest active:scale-95"
          >
            <ChevronRight className="size-4" strokeWidth={2.6} />
          </button>
        </div>
      </div>

      <div className="mt-3 flex items-center justify-between gap-2">
        <div
          role="group"
          aria-label="Mode periode kalender"
          className="flex rounded-full bg-sage/50 p-0.5 ring-1 ring-inset ring-soil/10"
        >
          {modeOptions.map((option) => {
            const active = option.id === mode
            return (
              <button
                key={option.id}
                type="button"
                aria-pressed={active}
                onClick={() => onModeChange(option.id)}
                className={cn(
                  'rounded-full px-3 py-1 text-[11.5px] font-medium transition-colors duration-200 active:scale-95',
                  active ? 'bg-forest text-mint' : 'text-forest/50 hover:text-forest',
                )}
              >
                <span>{option.label}</span>
              </button>
            )
          })}
        </div>

        <button
          type="button"
          onClick={onToday}
          className="h-7 shrink-0 rounded-full px-3 text-[11.5px] font-medium text-forest/55 transition-colors hover:bg-sage/50 hover:text-forest active:scale-95"
        >
          Hari Ini
        </button>
      </div>

      {/* ── GRID: kepala kolom + 7×5–6 sel ─────────────────────────────── */}
      <div
        role="group"
        aria-label="Kalender cashflow, satu sel per tanggal"
        className="mt-4"
      >
        <div className="grid grid-cols-7 gap-1.5">
          {CALENDAR_WEEKDAYS.map((day, index) => (
            <span
              key={day}
              className={cn(
                'pb-1 text-center text-[10px] font-medium uppercase tracking-[0.08em]',
                index >= 5 ? 'text-forest/25' : 'text-forest/35',
              )}
            >
              {day}
            </span>
          ))}
        </div>

        <div className="mt-1.5 flex flex-col gap-1.5">
          {grid.weeks.map((week, rowIdx) => (
            <div key={rowIdx} className="grid grid-cols-7 gap-1.5">
              {week.map((cell, colIdx) => (
                <CalendarDayCell
                  key={cell.date}
                  cell={cell}
                  col={colIdx}
                  row={rowIdx}
                  selected={cell.date === selectedDate}
                  onSelect={onSelectDate}
                />
              ))}
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}


/* ── Satu sel tanggal ──────────────────────────────────────────────────────
   Isi sel = angka tanggal + tint + titik tagihan (opsional). Nominal sengaja
   TIDAK pernah dirender di sini; ia hanya hidup di panel detail hari. */
function CalendarDayCell({
  cell,
  col,
  row,
  selected,
  onSelect,
}: {
  cell: CalendarCell
  col: number
  row: number
  selected: boolean
  onSelect: (iso: string) => void
}) {
  if (!cell.inPeriod) return <span aria-hidden />

  const look = calendarCellLook(cell)
  const hasFixedBill = cell.entries.some((entry) => entry.type === 'fixed_bill')
  const darkFill = look === 'deficit' || look === 'surplus'
  const ariaLabel = `${cell.day} ${cell.monthShort} — ${CALENDAR_LOOK_WORD[look]}${
    hasFixedBill ? ', ada tagihan tetap' : ''
  }`

  return (
    <button
      type="button"
      onClick={() => onSelect(cell.date)}
      aria-pressed={selected}
      aria-label={ariaLabel}
      className={cn(
        'relative flex aspect-square w-full items-center justify-center rounded-[10px] text-[12px] font-semibold tabular-nums ring-1 ring-inset ring-soil/8 transition-[transform,background-color,box-shadow] duration-200 animate-[fade-pop_0.4s_ease_backwards] hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-forest/40 sm:aspect-auto sm:min-h-[56px] sm:text-[13px] lg:min-h-[68px]',
        CALENDAR_LOOK_CELL[look],
        selected
          ? darkFill
            ? 'ring-2 ring-inset ring-cream/80'
            : 'ring-2 ring-inset ring-forest/70'
          : cell.isToday && 'ring-2 ring-inset ring-forest/30',
      )}
      style={{ animationDelay: `${(row * 7 + col) * 10}ms` }}
    >
      {cell.day}
      {/* akhir pekan — overlay tipis, bukan warna kedua */}
      {cell.isWeekend && (
        <span
          aria-hidden
          className="pointer-events-none absolute inset-0 rounded-[10px] bg-forest/[0.06]"
        />
      )}
      {/* satu titik untuk tagihan terjadwal — pola titik kalender Tagihan */}
      {hasFixedBill && (
        <span
          aria-hidden
          className="pointer-events-none absolute bottom-1.5 left-1/2 size-1 -translate-x-1/2 rounded-full bg-current opacity-60"
        />
      )}
    </button>
  )
}

