'use client'

import { ChevronDown, DollarSign } from 'lucide-react'
import { usePrivacy } from './privacy-provider'

const MONTHS = ['J', 'F', 'M', 'A', 'M', 'J', 'J', 'A', 'S', 'O', 'N', 'D']
const BARS = [34, 46, 38, 58, 50, 72, 64, 88, 60, 54, 80, 96]
const ACTIVE = 1 // February

export function IncomeCard() {
  const { hide } = usePrivacy()
  return (
    <div className="relative overflow-hidden rounded-[1.9rem] bg-gradient-to-br from-forest-soft via-forest to-[#0a2a1f] p-5 text-cream shadow-[0_24px_50px_-24px_rgba(16,58,42,0.55)]">
      <div
        className="pointer-events-none absolute -left-12 -bottom-12 h-36 w-36 rounded-full bg-mint/10 blur-2xl"
        aria-hidden
      />
      {/* edge light */}
      <div
        className="pointer-events-none absolute inset-0 rounded-[1.9rem] ring-1 ring-inset ring-white/10"
        style={{ boxShadow: 'inset 0 1px 0 rgba(244,248,239,0.18)' }}
        aria-hidden
      />

      {/* header */}
      <div className="relative flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="flex size-7 items-center justify-center rounded-full bg-mint text-forest shadow-[0_6px_16px_-4px_rgba(183,224,75,0.8)]">
            <DollarSign className="size-3.5" strokeWidth={2.5} />
          </span>
          <span className="text-sm font-medium text-cream/85">Income</span>
        </div>
        <button className="flex items-center gap-1 rounded-full bg-white/10 px-3 py-1 text-xs font-medium text-cream/85 transition-colors hover:bg-white/15">
          February
          <ChevronDown className="size-3.5" />
        </button>
      </div>

      {/* value */}
      <div className="relative mt-5 flex items-end justify-between">
        <div>
          <span className="text-3xl font-semibold tracking-tight tabular-nums">
            {hide('Rp 8.900.000')}
          </span>
          <span className="mt-1 block text-xs text-cream/50">
            Total income this month
          </span>
        </div>
        <div className="flex flex-col items-end gap-1">
          <span className="rounded-full bg-mint px-2 py-0.5 text-[11px] font-semibold text-forest">
            +27%
          </span>
          <span className="text-[10px] text-cream/45">vs last month</span>
        </div>
      </div>

      {/* monthly bar chart */}
      <div className="relative mt-7">
        <div className="flex h-24 items-end gap-1.5">
          {BARS.map((v, i) => {
            const active = i === ACTIVE
            return (
              <div key={i} className="group relative flex h-full flex-1 items-end">
                {active && (
                  <span className="absolute -top-1 left-1/2 -translate-x-1/2 -translate-y-full rounded-full bg-mint px-1.5 py-0.5 text-[9px] font-bold text-forest shadow-[0_6px_14px_-4px_rgba(183,224,75,0.8)]">
                    {hide('Rp 8,9jt')}
                  </span>
                )}
                <div
                  className={
                    active
                      ? 'w-full origin-bottom animate-[bar-grow_0.7s_cubic-bezier(0.22,1,0.36,1)_both] rounded-full bg-gradient-to-t from-mint/60 to-mint shadow-[0_0_18px_rgba(183,224,75,0.45)]'
                      : 'w-full origin-bottom animate-[bar-grow_0.7s_cubic-bezier(0.22,1,0.36,1)_both] rounded-full bg-white/10 transition-colors duration-300 group-hover:bg-white/25'
                  }
                  style={{ height: `${v}%`, animationDelay: `${120 + i * 45}ms` }}
                />
              </div>
            )
          })}
        </div>
        {/* month labels */}
        <div className="mt-2 flex gap-1.5">
          {MONTHS.map((m, i) => (
            <span
              key={i}
              className={
                i === ACTIVE
                  ? 'flex-1 text-center text-[9px] font-bold text-mint'
                  : 'flex-1 text-center text-[9px] text-cream/35'
              }
            >
              {m}
            </span>
          ))}
        </div>
      </div>
    </div>
  )
}
