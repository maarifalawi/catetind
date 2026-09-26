'use client'

import { useMemo, useState } from 'react'
import { Flame } from 'lucide-react'
import {
  HEATMAP_WEEKDAYS,
  buildHeatmapMatrix,
  buildSpendingHeatmap,
  formatDayLabel,
  maskMoney,
  type HeatmapDay,
} from '@/lib/data/history'
import { cn } from '@/lib/utils'

/* ── Heatmap "Kapan Kamu Sering Boros?" (matriks kalender 7 kolom) ───────────
   Audit data-viz: deret 30 kotak SATU BARIS tidak punya sumbu X & Y sehingga
   pola "akhir pekan vs hari kerja" tidak terbaca. Sekarang hari disusun jadi
   MATRIKS KALENDER 7 kolom (Sen–Min) × 4–5 baris ala contribution graph
   GitHub, jadi pola mingguan langsung terlihat.

   Angka hari ditulis di dalam sel sebagai jangkar waktu, dan nominalnya muncul
   sebagai BUBBLE melayang ber-caret tepat di atas sel yang sedang disentuh —
   bukan teks statis yang tidak jelas menunjuk ke kotak mana.

   Empat tingkat memakai SATU warna brand (forest) dengan opasitas bertingkat.
   Data dibangkitkan deterministik (seeded) di lib/data/history.ts → HTML server
   dan client identik. */

const DAYS = 30

const LEVEL_CLASS: Record<HeatmapDay['level'], string> = {
  0: 'bg-sage/45',
  1: 'bg-forest/20',
  2: 'bg-forest/45',
  3: 'bg-forest/80',
}

/** warna angka hari agar tetap kontras di tiap tingkat warna sel */
const LEVEL_TEXT_CLASS: Record<HeatmapDay['level'], string> = {
  0: 'text-ink/30',
  1: 'text-ink/45',
  2: 'text-ink/75',
  3: 'text-cream/90',
}

const LEGEND: { level: HeatmapDay['level']; label: string }[] = [
  { level: 0, label: 'Rp 0' },
  { level: 1, label: 'Sedikit' },
  { level: 2, label: 'Sedang' },
  { level: 3, label: 'Paling boros' },
]

/** bubble di tepi kiri/kanan digeser masuk supaya tidak terpotong tepi kartu */
function tooltipPlacement(col: number) {
  if (col === 0) return { bubble: 'left-0', caret: 'left-5' }
  if (col === HEATMAP_WEEKDAYS.length - 1) return { bubble: 'right-0', caret: 'right-5' }
  return { bubble: 'left-1/2 -translate-x-1/2', caret: 'left-1/2 -translate-x-1/2' }
}

export function SpendingHeatmap({ masked }: { masked: boolean }) {
  const days = useMemo(() => buildSpendingHeatmap(DAYS), [])
  const weeks = useMemo(() => buildHeatmapMatrix(days), [days])
  /* hari terboros dipilih sejak awal — sudah deterministik, jadi aman di SSR */
  const [activeDate, setActiveDate] = useState(() => {
    const peak = days.reduce((best, day) => (day.total > best.total ? day : best), days[0])
    return peak.date
  })

  const peak = useMemo(
    () => days.reduce((best, day) => (day.total > best.total ? day : best), days[0]),
    [days],
  )
  const totalSpend = days.reduce((sum, day) => sum + day.total, 0)
  const activeDays = days.filter((day) => day.total > 0).length

  return (
    <section className="rounded-[2rem] bg-cream p-5 shadow-[0_4px_24px_-4px_rgba(80,58,58,0.06)] ring-1 ring-soil/12 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <span className="flex size-9 items-center justify-center rounded-full bg-sage text-forest">
            <Flame className="size-[18px]" strokeWidth={2.2} />
          </span>
          <div>
            <h2 className="font-display text-[15px] font-bold tracking-tight text-ink">
              Kapan Kamu Sering Boros?
            </h2>
            <p className="text-[11.5px] text-ink/45">{activeDays} hari aktif</p>
          </div>
        </div>
        <span className="rounded-full bg-cream px-3 py-1.5 text-[11.5px] font-semibold text-ink/60 tabular-nums ring-1 ring-soil/12">
          {maskMoney(totalSpend, masked)} / {DAYS} hari
        </span>
      </div>

      {/* matriks kalender 7 kolom × 4–5 baris (Sen–Min). `pt-11` menyediakan
          ruang vertikal untuk bubble yang melayang di atas baris pertama. */}
      <div
        role="group"
        aria-label="Heatmap pengeluaran 30 hari terakhir, disusun per minggu"
        className="mt-4 overflow-visible pt-11"
      >
        {/* kepala kolom: nama hari supaya sumbu X terbaca */}
        <div className="grid grid-cols-7 gap-1.5">
          {HEATMAP_WEEKDAYS.map((label) => (
            <span
              key={label}
              className="pb-1 text-center text-[10px] font-semibold uppercase tracking-[0.08em] text-ink/35"
            >
              {label}
            </span>
          ))}
        </div>

        {/* baris = minggu; kolom = hari */}
        <div className="flex flex-col gap-1.5">
          {weeks.map((week, rowIdx) => (
            <div key={rowIdx} className="grid grid-cols-7 gap-1.5">
              {week.map((day, colIdx) => {
                if (!day) return <span key={`pad-${rowIdx}-${colIdx}`} aria-hidden />
                const isActive = day.date === activeDate
                const placement = tooltipPlacement(colIdx)
                const dayOfMonth = Number(day.date.slice(8, 10))

                return (
                  <div key={day.date} className="relative">
                    <button
                      type="button"
                      onClick={() => setActiveDate(day.date)}
                      onPointerEnter={() => setActiveDate(day.date)}
                      aria-label={`${formatDayLabel(day.date)}: ${maskMoney(day.total, masked)}`}
                      aria-pressed={isActive}
                      className={cn(
                        'flex aspect-square w-full items-center justify-center rounded-[7px] text-[10px] font-bold tabular-nums ring-1 ring-inset ring-soil/8 transition-[transform,box-shadow,opacity] duration-200 animate-[fade-pop_0.4s_ease_backwards] hover:-translate-y-0.5 hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-forest/40',
                        LEVEL_CLASS[day.level],
                        LEVEL_TEXT_CLASS[day.level],
                        isActive && 'ring-2 ring-inset ring-forest/70',
                      )}
                      style={{ animationDelay: `${(rowIdx * 7 + colIdx) * 12}ms` }}
                    >
                      {dayOfMonth}
                    </button>

                    {/* bubble nominal — menempel tepat di atas sel yang aktif */}
                    <span
                      role="tooltip"
                      className={cn(
                        'pointer-events-none absolute bottom-full z-20 mb-2 w-max max-w-[12rem] rounded-xl bg-ink px-2.5 py-1.5 text-center text-[10.5px] font-semibold leading-tight text-cream shadow-[0_12px_28px_-12px_rgba(69,89,78,0.7)] transition-opacity duration-150 motion-reduce:transition-none',
                        placement.bubble,
                        isActive ? 'opacity-100' : 'opacity-0',
                      )}
                    >
                      <span className="block whitespace-nowrap">{formatDayLabel(day.date)}</span>
                      <span className="block whitespace-nowrap text-[10px] font-medium text-cream/70">
                        {maskMoney(day.total, masked)}
                        {day.date === peak.date ? ' · terboros' : ''}
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
              })}
            </div>
          ))}
        </div>
      </div>

      {/* legenda skala warna */}
      <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-2 text-[11px] text-ink/45">
        <span className="font-medium">Skala</span>
        {LEGEND.map(({ level, label }) => (
          <span key={label} className="inline-flex items-center gap-1.5">
            <span
              aria-hidden
              className={cn(
                'size-3 rounded-[4px] ring-1 ring-inset ring-soil/12',
                LEVEL_CLASS[level],
              )}
            />
            {label}
          </span>
        ))}
      </div>
    </section>
  )
}
