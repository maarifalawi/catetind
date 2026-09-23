'use client'

import { useState } from 'react'
import { ChartPie, Flame } from 'lucide-react'
import { cn } from '@/lib/utils'

type Segment = {
  label: string
  amount: string
  pct: number
  color: string
}

/* slate gelap -> biru -> yellow-green (brand) -> hijau lembut */
const SEGMENTS: Segment[] = [
  { label: 'Makanan', amount: 'Rp 1.260.000', pct: 40, color: '#12281f' },
  { label: 'Transport', amount: 'Rp 819.000', pct: 26, color: '#3b82f6' },
  { label: 'Tagihan', amount: 'Rp 630.000', pct: 20, color: '#b7e04b' },
  { label: 'Belanja', amount: 'Rp 441.000', pct: 14, color: '#6fb052' },
]

const TOTAL = 'Rp 3.150.000'

/* posisi awal kumulatif tiap segmen — untuk tooltip */
const STARTS: number[] = []
{
  let acc = 0
  for (const seg of SEGMENTS) {
    STARTS.push(acc)
    acc += seg.pct
  }
}

export function ExpenseDistributionCard() {
  const [active, setActive] = useState<number | null>(null)
  const activeSeg = active === null ? null : SEGMENTS[active]

  return (
    <div className="flex flex-col rounded-[2rem] bg-white p-6 ring-1 ring-black/5">
      {/* header — konsisten dengan kartu lain */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <span className="flex size-8 items-center justify-center rounded-full bg-sage text-forest">
            <ChartPie className="size-4" strokeWidth={2.4} />
          </span>
          <div>
            <p className="text-sm font-semibold text-ink">Distribusi Pengeluaran</p>
            <p className="text-xs text-ink/45">Bulan ini</p>
          </div>
        </div>
        <span className="rounded-full bg-sage px-2.5 py-1 text-[11px] font-semibold text-forest tabular-nums">
          {TOTAL}
        </span>
      </div>

      {/* segmented horizontal bar + tooltip mengambang */}
      <div className="relative mt-10">
        {activeSeg !== null && active !== null && (
          <div
            key={activeSeg.label}
            className="pointer-events-none absolute bottom-[calc(100%+10px)] z-10 -translate-x-1/2 whitespace-nowrap rounded-full bg-ink px-3 py-1 text-[11px] font-semibold text-cream shadow-[0_10px_24px_-10px_rgba(18,40,31,0.6)] animate-[fade-pop_0.25s_ease_both]"
            style={{
              left: `clamp(64px, ${STARTS[active] + activeSeg.pct / 2}%, calc(100% - 64px))`,
            }}
          >
            {activeSeg.amount} · {activeSeg.pct}%
            <span className="absolute left-1/2 top-full size-2 -translate-x-1/2 -translate-y-1 rotate-45 rounded-[2px] bg-ink" />
          </div>
        )}

        {/* satu bar penuh, 4 segmen dengan celah tipis */}
        <div className="flex h-3 w-full gap-[3px]">
          {SEGMENTS.map((seg, i) => {
            const isActive = active === i
            const dimmed = active !== null && !isActive
            return (
              <button
                key={seg.label}
                type="button"
                aria-label={`${seg.label} ${seg.pct}% — ${seg.amount}`}
                onMouseEnter={() => setActive(i)}
                onMouseLeave={() => setActive(null)}
                onFocus={() => setActive(i)}
                onBlur={() => setActive(null)}
                onClick={() => setActive(isActive ? null : i)}
                className={cn(
                  'h-full cursor-pointer rounded-full outline-none transition-opacity duration-300 animate-[area-fade_0.6s_ease_backwards]',
                  dimmed ? 'opacity-30' : 'opacity-100',
                )}
                style={{
                  width: `${seg.pct}%`,
                  backgroundColor: seg.color,
                  animationDelay: `${120 + i * 90}ms`,
                }}
              />
            )
          })}
        </div>
      </div>

      {/* legend minimalis — dot kecil + nama kategori inline */}
      <div className="mt-5 flex flex-wrap items-center justify-center gap-x-4 gap-y-2">
        {SEGMENTS.map((seg, i) => {
          const isActive = active === i
          return (
            <button
              key={seg.label}
              type="button"
              aria-pressed={isActive}
              onMouseEnter={() => setActive(i)}
              onMouseLeave={() => setActive(null)}
              onFocus={() => setActive(i)}
              onBlur={() => setActive(null)}
              onClick={() => setActive(isActive ? null : i)}
              className={cn(
                'flex items-center gap-1.5 text-xs transition-colors duration-200',
                isActive
                  ? 'font-semibold text-ink'
                  : 'font-medium text-ink/55 hover:text-ink',
              )}
            >
              <span
                className="size-2 shrink-0 rounded-full transition-opacity duration-300"
                style={{
                  backgroundColor: seg.color,
                  opacity: active !== null && !isActive ? 0.35 : 1,
                }}
              />
              {seg.label}
              <span className="font-semibold text-ink/40 tabular-nums">
                {seg.pct}%
              </span>
            </button>
          )
        })}
      </div>

      {/* insight dinamis — mengikuti kategori aktif */}
      <div className="mt-5 flex items-center justify-center gap-2 rounded-2xl bg-cream px-4 py-2.5 text-center text-xs leading-relaxed text-ink/55">
        <Flame className="size-3.5 shrink-0 text-forest" strokeWidth={2.2} />
        {activeSeg === null ? (
          <span key="insight-total" className="animate-[fade-pop_0.3s_ease_both]">
            <b className="font-semibold text-ink">Makanan</b> jadi pos terbesar —
            40% dari total pengeluaran
          </span>
        ) : (
          <span key={activeSeg.label} className="animate-[fade-pop_0.3s_ease_both]">
            <b className="font-semibold text-ink">{activeSeg.label}</b> —{' '}
            {activeSeg.amount} ({activeSeg.pct}% dari total)
          </span>
        )}
      </div>
    </div>
  )
}

