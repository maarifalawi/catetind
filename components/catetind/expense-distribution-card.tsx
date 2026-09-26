'use client'

import { memo, useState } from 'react'
import { ChartPie, Flame } from 'lucide-react'
import { cn } from '@/lib/utils'
import { usePrivacy } from './privacy-provider'

type Segment = {
  label: string
  amount: number
  pct: number
  color: string
}

/* Palet kategori — 4 warna dari palet kanon CatetInd dengan hue yang
   benar-benar berbeda, supaya segmen bar langsung terbaca tanpa user harus
   menyipitkan mata membedakan dua hijau yang mirip (audit #3):
   Olive · Thistle · Cantelope · Plum. Rujukan: docs/theme/PALETTE.md */
const SEGMENTS: Segment[] = [
  { label: 'Makanan', amount: 1_260_000, pct: 40, color: '#b5b987' }, // olive
  { label: 'Transport', amount: 819_000, pct: 26, color: '#91a0b8' }, // thistle
  { label: 'Tagihan', amount: 630_000, pct: 20, color: '#ffb885' }, // cantelope
  { label: 'Belanja', amount: 441_000, pct: 14, color: '#b89191' }, // plum
]

const TOTAL = 3_150_000

/* posisi awal kumulatif tiap segmen - untuk tooltip */
const STARTS: number[] = []
{
  let acc = 0
  for (const seg of SEGMENTS) {
    STARTS.push(acc)
    acc += seg.pct
  }
}

/** Dibungkus `memo` — kartu ini tidak menerima props, jadi tidak perlu ikut
 *  re-render saat HomeScreen mengubah state popup (lihat catatan di
 *  cash-flow-card.tsx). */
export const ExpenseDistributionCard = memo(function ExpenseDistributionCard() {
  const { money } = usePrivacy()
  const [active, setActive] = useState<number | null>(null)
  const activeSeg = active === null ? null : SEGMENTS[active]

  return (
                <div className="flex flex-col rounded-[2rem] bg-cream p-4 ring-1 ring-soil/12">
      {/* header - konsisten dengan kartu lain */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="flex size-7 items-center justify-center rounded-full bg-sage text-forest">
            <ChartPie className="size-3.5" strokeWidth={2.4} />
          </span>
          <div>
            <p className="text-sm font-semibold text-ink">Distribusi Pengeluaran</p>
            <p className="text-[10px] text-ink/45">Bulan ini</p>
          </div>
        </div>
        <span className="rounded-full bg-sage px-2 py-0.5 text-[10px] font-semibold text-forest tabular-nums">
          {money(TOTAL)}
        </span>
      </div>

      {/* segmented horizontal bar + tooltip mengambang */}
      <div className="relative mt-5">
        {activeSeg !== null && active !== null && (
          <div
            key={activeSeg.label}
            className="pointer-events-none absolute bottom-[calc(100%+10px)] z-10 -translate-x-1/2 whitespace-nowrap rounded-full bg-ink px-3 py-1 text-[11px] font-semibold text-cream shadow-[0_10px_24px_-10px_rgba(0,0,0,0.6)] animate-[fade-pop_0.25s_ease_both]"
            style={{
              left: `clamp(64px, ${STARTS[active] + activeSeg.pct / 2}%, calc(100% - 64px))`,
            }}
          >
            {money(activeSeg.amount)} - {activeSeg.pct}%
            <span className="absolute left-1/2 top-full size-2 -translate-x-1/2 -translate-y-1 rotate-45 rounded-[2px] bg-ink" />
          </div>
        )}

        

        {/* satu bar penuh, 4 segmen dengan celah tipis */}
        <div className="flex h-2.5 w-full gap-[3px]">
          {SEGMENTS.map((seg, i) => {
            const isActive = active === i
            const dimmed = active !== null && !isActive
            return (
              <button
                key={seg.label}
                type="button"
                aria-label={`${seg.label} ${seg.pct}% - ${seg.amount}`}
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

      {/* legend minimalis - dot kecil + nama kategori inline */}
      <div className="mt-3 flex flex-wrap items-center justify-center gap-x-3 gap-y-1.5 break-words">
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
                'flex items-center gap-1.5 text-[11px] transition-colors duration-200',
                isActive
                  ? 'font-semibold text-ink'
                  : 'font-medium text-ink/55 hover:text-ink',
              )}
            >
              <span
                className="size-1.5 shrink-0 rounded-full transition-opacity duration-300"
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

      {/* insight dinamis - mengikuti kategori aktif */}
      <div className="mt-2.5">
        <div className="flex items-center justify-center gap-1.5 rounded-xl bg-cream px-3 py-2 text-center text-[11px] leading-relaxed text-ink/55">
          <Flame className="size-3 shrink-0 text-forest" strokeWidth={2.2} />
          {activeSeg === null ? (
            <span key="insight-total" className="animate-[fade-pop_0.3s_ease_both]">
              <b className="font-semibold text-ink">Makanan</b> jadi pos terbesar -
              40% dari total pengeluaran
            </span>
          ) : (
            <span key={activeSeg.label} className="animate-[fade-pop_0.3s_ease_both]">
              <b className="font-semibold text-ink">{activeSeg.label}</b> -{' '}
              {money(activeSeg.amount)} ({activeSeg.pct}% dari total)
            </span>
          )}
        </div>
      </div>
    </div>
  )
})
