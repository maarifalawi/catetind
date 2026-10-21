'use client'

import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { CalendarDays } from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  TIMELINE_DAYS,
  TODAY_ISO,
  billsOnDay,
  getBillStatus,
  maskMoney,
  upcomingDays,
  type Bill,
} from '@/lib/data/bills'
import { CALENDAR_WEEKDAYS, shortDateLabel } from '@/lib/data/calendar'
import { formatDayLabel } from '@/lib/data/history'

/* ── Kalender tagihan 14 hari ke depan ───────────────────────────────────────
   Memakai BAHASA VISUAL kalender Cashflow (`cashflow-calendar-grid.tsx`):
     · kartu putih radius 2rem + hairline, header ikon + judul + rentang tanggal;
     · kepala kolom Sen–Min, angka kecil uppercase;
     · satu sel = satu angka tanggal dengan `rounded-[10px]`, ring-inset tipis,
       akhir pekan diberi overlay hijau sangat tipis;
     · hari ini ditandai ring hijau, hari yang dipilih ring lebih tegas;
     · tap tanggal → bubble gelap kecil DI ATAS sel (bukan panel di bawah),
       berisi NAMA + NOMINAL tagihan saja.

   Isi sel: angka tanggal + satu titik kecil bila ada tagihan. Warna muka sel
   memakai tint yang sama dengan baris daftar (Daisy = ada tagihan, Plum =
   telat), jadi kalender & daftar tidak punya dua bahasa warna.

   14 hari = dua minggu, jadi grid-nya dua baris penuh (ditambah padding di awal
   supaya kolomnya benar-benar hari Senin–Minggu, seperti kalender Cashflow).
   Tanggal dihitung dari tanggal PERANGKAT (`todayIso`, paket 57). */

/** Senin = 0 … Minggu = 6 — urutan yang sama dengan `CALENDAR_WEEKDAYS` */
function mondayIndex(iso: string): number {
  const [year, month, day] = iso.split('-').map(Number)
  return (new Date(year, (month ?? 1) - 1, day ?? 1).getDay() + 6) % 7
}

/** bubble di tepi kiri/kanan digeser masuk supaya tidak terpotong tepi kartu */
function bubblePlacement(col: number) {
  if (col === 0) return { bubble: 'left-0', caret: 'left-5' }
  if (col === 6) return { bubble: 'right-0', caret: 'right-5' }
  return { bubble: 'left-1/2 -translate-x-1/2', caret: 'left-1/2 -translate-x-1/2' }
}

export function BillTimeline({
  bills,
  currentDay,
  todayIso = TODAY_ISO,
  masked = false,
  onPick,
  className,
}: {
  bills: Bill[]
  currentDay: number
  /** tanggal "hari ini" milik user (`useTodayISO()` di halaman) */
  todayIso?: string
  /** ikut tombol mata global — nominal di bubble tidak boleh bocor */
  masked?: boolean
  /** membawa user ke kartu tagihan yang diketuk di bubble */
  onPick: (bill: Bill) => void
  /** override margin luar (dipakai saat kartu disusun dalam grid 2 kolom) */
  className?: string
}) {
  const days = upcomingDays(TIMELINE_DAYS, todayIso)
  /* sabuk pengaman: apa pun yang dioper pemanggil, tagihan lunas tetap disaring */
  const activeBills = bills.filter((bill) => !bill.isPaidThisMonth)
  /** iso hari yang bubble-nya terbuka (null = tidak ada) */
  const [openDay, setOpenDay] = useState<string | null>(null)
  const calendarRef = useRef<HTMLElement | null>(null)

  /* bubble ditutup oleh klik di luar kalender atau tombol Escape */
  useEffect(() => {
    if (!openDay) return
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpenDay(null)
    }
    const onPointer = (event: PointerEvent) => {
      const target = event.target
      if (calendarRef.current && target instanceof Node && !calendarRef.current.contains(target)) {
        setOpenDay(null)
      }
    }
    document.addEventListener('keydown', onKey)
    document.addEventListener('pointerdown', onPointer)
    return () => {
      document.removeEventListener('keydown', onKey)
      document.removeEventListener('pointerdown', onPointer)
    }
  }, [openDay])

  /* padding awal supaya tanggal pertama duduk di kolom hari yang benar */
  const leading = mondayIndex(todayIso)
  const slots: (ReturnType<typeof upcomingDays>[number] | null)[] = [
    ...Array.from({ length: leading }, () => null),
    ...days,
  ]
  while (slots.length % 7 !== 0) slots.push(null)
  const weeks = Array.from({ length: slots.length / 7 }, (_, index) =>
    slots.slice(index * 7, index * 7 + 7),
  )

  return (
    <section
      ref={calendarRef}
      aria-label={`Tagihan ${TIMELINE_DAYS} hari ke depan`}
      className={cn(
        'rounded-[2rem] bg-cream p-5 shadow-[0_4px_24px_-4px_rgba(0,0,0,0.06)] ring-1 ring-soil/12 sm:p-6',
        className,
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2.5">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-sage text-forest">
            <CalendarDays className="size-[18px]" strokeWidth={2.2} aria-hidden />
          </span>
          <div className="min-w-0">
            <h2 className="font-display text-[15px] font-semibold tracking-tight text-forest">
              Tagihan {TIMELINE_DAYS} hari ke depan
            </h2>
            <p className="mt-0.5 text-[11.5px] font-medium leading-snug tabular-nums text-forest-muted">
              {shortDateLabel(days[0].iso)} – {shortDateLabel(days[days.length - 1].iso)}
            </p>
          </div>
        </div>
      </div>

      {/* `pt-11` = ruang untuk bubble yang melayang di atas baris pertama */}
      <div className="mt-4 overflow-visible pt-11">
        <div className="grid grid-cols-7 gap-1.5">
          {CALENDAR_WEEKDAYS.map((weekday, index) => (
            <span
              key={weekday}
              className={cn(
                'pb-1 text-center text-[10px] font-medium uppercase tracking-[0.08em]',
                index >= 5 ? 'text-forest/25' : 'text-forest/35',
              )}
            >
              {weekday}
            </span>
          ))}
        </div>

        <div className="flex flex-col gap-1.5">
          {weeks.map((week, rowIdx) => (
            <div key={rowIdx} className="grid grid-cols-7 gap-1.5">
              {week.map((day, colIdx) => {
                if (!day) return <span key={`blank-${rowIdx}-${colIdx}`} aria-hidden />
                const dayBills = billsOnDay(activeBills, day.day)
                const hasBills = dayBills.length > 0
                const hasOverdue = dayBills.some(
                  (bill) => getBillStatus(bill, currentDay) === 'overdue',
                )
                const open = openDay === day.iso
                const placement = bubblePlacement(colIdx)
                const weekend = mondayIndex(day.iso) >= 5
                const ariaLabel = hasBills
                  ? `${formatDayLabel(day.iso)} — ${dayBills.length} tagihan jatuh tempo`
                  : formatDayLabel(day.iso)

                return (
                  <div key={day.iso} className="relative">
                    <button
                      type="button"
                      aria-label={ariaLabel}
                      aria-haspopup={hasBills ? 'dialog' : undefined}
                      aria-expanded={hasBills ? open : undefined}
                      onClick={() => {
                        if (!hasBills) {
                          setOpenDay(null)
                          return
                        }
                        setOpenDay(open ? null : day.iso)
                      }}
                      className={cn(
                        'relative flex aspect-square w-full items-center justify-center rounded-[10px] text-[11.5px] font-semibold tabular-nums ring-1 ring-inset ring-soil/8 transition-[background-color,box-shadow,transform] duration-200 hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-forest/40 motion-reduce:transition-none motion-reduce:hover:translate-y-0 sm:min-h-[56px] sm:text-[12.5px]',
                        hasBills
                          ? hasOverdue
                            ? 'bg-plum/[0.09] text-forest'
                            : 'bg-daisy/[0.13] text-forest'
                          : 'bg-cream text-forest/40',
                        day.isToday && 'ring-2 ring-inset ring-forest/30',
                        open && 'ring-2 ring-inset ring-forest/70',
                      )}
                    >
                      {day.day}
                      {/* akhir pekan — overlay tipis, bukan warna kedua */}
                      {weekend && (
                        <span
                          aria-hidden
                          className="pointer-events-none absolute inset-0 rounded-[10px] bg-forest/[0.06]"
                        />
                      )}
                      {/* satu titik kecil bila ada tagihan, seperti dot hari ini
                          di kalender Cashflow */}
                      {hasBills && (
                        <span
                          aria-hidden
                          className="pointer-events-none absolute bottom-1.5 left-1/2 size-1 -translate-x-1/2 rounded-full bg-current opacity-60"
                        />
                      )}
                    </button>

                    {/* bubble = NAMA + NOMINAL saja, tepat di atas tanggalnya */}
                    <AnimatePresence>
                      {open && hasBills && (
                        <div
                          className={cn(
                            'absolute bottom-full z-20 mb-2 w-max max-w-[11rem]',
                            placement.bubble,
                          )}
                        >
                          <motion.div
                            initial={{ opacity: 0, y: 4, scale: 0.96 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: 4, scale: 0.96 }}
                            transition={{ duration: 0.16, ease: 'easeOut' }}
                            role="dialog"
                            aria-label={`Tagihan ${formatDayLabel(day.iso)}`}
                            className="relative rounded-xl bg-ink px-2.5 py-1.5 text-left text-cream shadow-[0_12px_28px_-12px_rgba(0,0,0,0.7)]"
                          >
                            {dayBills.map((bill) => (
                              <button
                                key={bill.id}
                                type="button"
                                onClick={() => {
                                  setOpenDay(null)
                                  onPick(bill)
                                }}
                                className="flex w-full items-center justify-between gap-3 rounded-lg px-1 py-0.5 text-left transition-colors hover:bg-cream/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cream/40"
                              >
                                <span className="min-w-0 max-w-[7.5rem] truncate text-[11px] font-medium leading-tight">
                                  {bill.name}
                                </span>
                                <span className="shrink-0 text-[11px] font-semibold leading-tight tabular-nums">
                                  {bill.amount > 0 ? maskMoney(bill.amount, masked) : 'Fleksibel'}
                                </span>
                              </button>
                            ))}
                            <span
                              aria-hidden
                              className={cn(
                                'absolute top-full size-0 border-[5px] border-transparent border-t-ink',
                                placement.caret,
                              )}
                            />
                          </motion.div>
                        </div>
                      )}
                    </AnimatePresence>
                  </div>
                )
              })}
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
