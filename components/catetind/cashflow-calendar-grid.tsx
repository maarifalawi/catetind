'use client'

import { CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import { maskMoney } from '@/lib/data/history'
import {
  CALENDAR_LEGEND,
  CALENDAR_LOOK_CELL,
  CALENDAR_LOOK_WORD,
  CALENDAR_WEEKDAYS,
  calendarCellLook,
  shortDateLabel,
  type CalendarCell,
  type CalendarGrid,
  type PeriodMode,
  type PeriodSummary,
} from '@/lib/data/calendar'

/* ── 2B. Kalender Grid (Bersih / Minimalis) ──────────────────────────────────
   Redesign penuh. Grid ini sekarang memakai bahasa visual yang sama dengan
   heatmap "Kapan Kamu Sering Boros?" di halaman Riwayat:

     • SATU sel = satu angka tanggal di atas satu latar polos. Tidak ada emoji
       bertumpuk, glow beranimasi, titik biru, chip "×N", angka bulan, atau
       nominal kecil di dalam sel — semua detail itu pindah ke panel kanan
       (CashflowInspector) dan ke bubble saat sel disentuh.
     • Warna dibagi rata sebagai "muka" sel (`calendarCellLook`):

         terracotta   → BOROS (belanja variabel melonjak di atas ambang)
         forest       → surplus (uang masuk menutup pengeluaran hari itu)
         mint         → nol jajan (tidak ada belanja variabel sama sekali)
         forest tipis → ada belanja variabel di bawah ambang
         ink          → netral: tagihan terjadwal atau belum ada catatan
         krem         → belum ada aktivitas (hari mendatang tanpa agenda)

     • Tap satu tanggal → BUBBLE kecil melayang tepat di atas sel (persis
       pola komponen heatmap): tanggal + nominal harinya. Jadi tap selalu
       punya umpan balik instan tanpa perlu menggulir layar.

   ATURAN YANG TETAP DIPEGANG: warna terracotta hanya lahir dari
   `cell.variableSpend` (lihat `calendarTone`), jadi tanggal yang isinya kos
   1,5 juta tidak pernah dihukum merah hanya karena nominalnya besar.
   ────────────────────────────────────────────────────────────────────────── */

/** bubble di tepi kiri/kanan digeser masuk supaya tidak terpotong tepi kartu */
function bubblePlacement(col: number) {
  if (col === 0) return { bubble: 'left-0', caret: 'left-5' }
  if (col === CALENDAR_WEEKDAYS.length - 1) return { bubble: 'right-0', caret: 'right-5' }
  return { bubble: 'left-1/2 -translate-x-1/2', caret: 'left-1/2 -translate-x-1/2' }
}

/** satu baris nominal untuk bubble: pemasukan > pengeluaran > ramalan > kosong */
function cellSummary(cell: CalendarCell, masked: boolean) {
  if (cell.income > 0) {
    return { text: `+${maskMoney(cell.income, masked)}`, className: 'text-mint' }
  }
  if (cell.totalSpend > 0) {
    return { text: `−${maskMoney(cell.totalSpend, masked)}`, className: 'text-cream/75' }
  }
  const forecast = cell.forecast
    .filter((entry) => entry.type !== 'income')
    .reduce((sum, entry) => sum + entry.amount, 0)
  if (forecast > 0) {
    return { text: `${maskMoney(forecast, masked)} · ramalan`, className: 'text-cream/60' }
  }
  return { text: 'Belum ada catatan', className: 'text-cream/60' }
}


export function CashflowCalendarGrid({
  grid,
  mode,
  paydayDate,
  label,
  rangeLabel,
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
  paydayDate: number
  /** label navigator, mis. `September 2026` */
  label: string
  /** rentang tanggal grid, mis. `25 Agustus – 24 September 2026` */
  rangeLabel: string
  summary: PeriodSummary
  selectedDate: string
  masked: boolean
  onModeChange: (mode: PeriodMode) => void
  /** geser periode ±1 bulan */
  onShift: (months: number) => void
  onToday: () => void
  onSelectDate: (iso: string) => void
}) {
  const modeOptions: { id: PeriodMode; label: string; short: string }[] = [
    { id: 'standard', label: 'Bulan Standar', short: 'Bulanan' },
    { id: 'payday', label: `Siklus Gajian (Tgl ${paydayDate})`, short: 'Siklus Gajian' },
  ]

  return (
    <section className="rounded-[2rem] bg-white p-5 shadow-[0_4px_24px_-4px_rgba(18,40,31,0.06)] ring-1 ring-black/5 sm:p-6">
      {/* ── 2A. HEADER: judul periode + navigator ────────────────────────────
          Cukup dua baris tenang — bukan tiga baris chip seperti versi lama.
          Baris 1 menyebut periode apa yang sedang dibaca (rentang tanggal dan
          net periode duduk sebagai subjudul, bukan chip terpisah), baris 2
          berisi dua kontrol yang memang sering dipakai: mode periode & kembali
          ke hari ini. */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2.5">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-sage text-forest">
            <CalendarDays className="size-[18px]" strokeWidth={2.2} />
          </span>
          <div className="min-w-0">
            <h2 className="font-display text-[15px] font-bold tracking-tight text-ink">{label}</h2>
            <p className="mt-0.5 text-[11.5px] leading-snug text-ink/45">
              {rangeLabel}
              {summary.net !== 0 && (
                <>
                  {' · net '}
                  <span className="tabular-nums">
                    {summary.net > 0 ? '+' : '−'}
                    {maskMoney(Math.abs(summary.net), masked)}
                  </span>
                </>
              )}
            </p>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-0.5">
          <button
            type="button"
            onClick={() => onShift(-1)}
            aria-label="Periode sebelumnya"
            className="flex size-8 items-center justify-center rounded-full text-ink/45 transition-colors hover:bg-cream hover:text-ink active:scale-95"
          >
            <ChevronLeft className="size-4" strokeWidth={2.6} />
          </button>
          <button
            type="button"
            onClick={() => onShift(1)}
            aria-label="Periode berikutnya"
            className="flex size-8 items-center justify-center rounded-full text-ink/45 transition-colors hover:bg-cream hover:text-ink active:scale-95"
          >
            <ChevronRight className="size-4" strokeWidth={2.6} />
          </button>
        </div>
      </div>

      <div className="mt-3 flex items-center justify-between gap-2">
        <div
          role="group"
          aria-label="Mode periode kalender"
          className="flex rounded-full bg-cream p-0.5 ring-1 ring-inset ring-black/[0.05]"
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
                  'rounded-full px-3 py-1 text-[11.5px] font-semibold transition-colors duration-200 active:scale-95',
                  active ? 'bg-forest text-mint' : 'text-ink/50 hover:text-ink',
                )}
              >
                <span className="sm:hidden">{option.short}</span>
                <span className="hidden sm:inline">{option.label}</span>
              </button>
            )
          })}
        </div>

        <button
          type="button"
          onClick={onToday}
          className="h-7 shrink-0 rounded-full px-2.5 text-[11.5px] font-semibold text-forest transition-colors hover:bg-cream active:scale-95"
        >
          Hari Ini
        </button>
      </div>

      {/* ── PANEL GRID: kepala kolom + 7×5–6 sel ─────────────────────────────
          `pt-11` menyediakan ruang vertikal untuk bubble yang melayang di atas
          baris pertama — pola yang sama dengan heatmap Riwayat. */}
      <div
        role="group"
        aria-label="Kalender cashflow, satu sel per tanggal"
        className="mt-4 overflow-visible pt-11"
      >
        <div className="grid grid-cols-7 gap-1.5">
          {CALENDAR_WEEKDAYS.map((day, index) => (
            <span
              key={day}
              className={cn(
                'pb-1 text-center text-[10px] font-semibold uppercase tracking-[0.08em]',
                index >= 5 ? 'text-ink/25' : 'text-ink/35',
              )}
            >
              {day}
            </span>
          ))}
        </div>

        <div className="flex flex-col gap-1.5">
          {grid.weeks.map((week, rowIdx) => (
            <div key={rowIdx} className="grid grid-cols-7 gap-1.5">
              {week.map((cell, colIdx) => (
                <CalendarDayCell
                  key={cell.date}
                  cell={cell}
                  col={colIdx}
                  row={rowIdx}
                  selected={cell.date === selectedDate}
                  masked={masked}
                  onSelect={onSelectDate}
                />
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* ── legenda makna warna: lima muka sel, label sependek mungkin ─────── */}
      <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-2 text-[11px] text-ink/45">
        <span className="font-medium">Keterangan</span>
        {CALENDAR_LEGEND.map((item) => (
          <span key={item.id} className="inline-flex items-center gap-1.5">
            <span
              aria-hidden
              className={cn(
                'size-3 rounded-[4px] ring-1 ring-inset ring-black/[0.06]',
                CALENDAR_LOOK_CELL[item.id],
              )}
            />
            {item.label}
          </span>
        ))}
      </div>
    </section>
  )
}

/* ── Satu sel tanggal ────────────────────────────────────────────────────────
   Satu tombol, satu angka. Semua penanda lama (emoji, nominal, chip rentetan,
   corak diagonal) dihapus — informasinya tetap tersedia lewat aria-label,
   bubble saat tanggal dipilih, dan panel detail. Sel di luar periode dibiarkan
   benar-benar kosong (tanpa angka) supaya grid tidak terbaca seperti kalender
   rusak. */
function CalendarDayCell({
  cell,
  col,
  row,
  selected,
  masked,
  onSelect,
}: {
  cell: CalendarCell
  col: number
  row: number
  selected: boolean
  masked: boolean
  onSelect: (iso: string) => void
}) {
  if (!cell.inPeriod) return <span aria-hidden />

  const look = calendarCellLook(cell)
  /* latar gelap (boros/surplus) butuh cincin pemilih berwarna terang supaya
     tanggal yang sedang dipilih tetap kelihatan */
  const darkFill = look === 'deficit' || look === 'surplus'
  const placement = bubblePlacement(col)
  const summary = cellSummary(cell, masked)
  const ariaLabel = `${cell.day} ${cell.monthShort} — ${CALENDAR_LOOK_WORD[look]}${
    cell.income > 0
      ? `, pemasukan ${maskMoney(cell.income, masked)}`
      : cell.totalSpend > 0
        ? `, pengeluaran ${maskMoney(cell.totalSpend, masked)}`
        : ''
  }`

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => onSelect(cell.date)}
        aria-pressed={selected}
        aria-label={ariaLabel}
        title={ariaLabel}
        className={cn(
          'relative flex aspect-square w-full items-center justify-center rounded-[10px] text-[11.5px] font-semibold tabular-nums ring-1 ring-inset ring-black/[0.04] transition-[transform,background-color,box-shadow] duration-200 animate-[fade-pop_0.4s_ease_backwards] hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-forest/40 sm:aspect-auto sm:min-h-[56px] sm:text-[12.5px] lg:min-h-[68px]',
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
        {/* titik "hari ini" — memakai `bg-current` supaya kontras di semua muka sel */}
        {cell.isToday && (
          <span
            aria-hidden
            className="absolute bottom-1.5 left-1/2 size-1 -translate-x-1/2 rounded-full bg-current opacity-60"
          />
        )}
      </button>

      {/* bubble nominal — menempel tepat di atas sel yang sedang dipilih */}
      <span
        role="tooltip"
        className={cn(
          'pointer-events-none absolute bottom-full z-20 mb-2 w-max max-w-[11rem] rounded-xl bg-ink px-2.5 py-1.5 text-center text-[10.5px] font-semibold leading-tight text-cream shadow-[0_12px_28px_-12px_rgba(16,58,42,0.7)] transition-opacity duration-150 motion-reduce:transition-none',
          placement.bubble,
          selected ? 'opacity-100' : 'opacity-0',
        )}
      >
        <span className="block whitespace-nowrap">{shortDateLabel(cell.date)}</span>
        <span className={cn('block whitespace-nowrap text-[10px] font-medium', summary.className)}>
          {summary.text}
        </span>
        {/* caret mengarah ke sel di bawahnya */}
        <span
          aria-hidden
          className={cn(
            'absolute top-full size-0 border-[5px] border-transparent border-t-ink',
            placement.caret,
          )}
        />
      </span>
    </div>
  )
}


