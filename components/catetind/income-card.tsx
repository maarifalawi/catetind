'use client'

import { DollarSign } from 'lucide-react'
import { cn } from '@/lib/utils'
import { HOME_INCOME_COPY } from '@/lib/data/home'
import type { HomeIncomeStats } from '@/lib/data/home-money'
import { usePrivacy } from './privacy-provider'

export function IncomeCard({ stats }: { stats: HomeIncomeStats }) {
  const { money } = usePrivacy()
  /* skala bar dari nilai terbesar yang ADA — bukan konstanta */
  const max = Math.max(1, ...stats.series.map((point) => point.value))
  const hasIncome = stats.series.some((point) => point.value > 0)
  return (
    <div className="relative overflow-hidden rounded-[1.9rem] bg-gradient-to-br from-forest-soft via-forest to-[#1f2823] p-5 text-cream shadow-[0_24px_50px_-24px_rgba(69,89,78,0.55)]">
      <div
        className="pointer-events-none absolute -left-12 -bottom-12 h-36 w-36 rounded-full bg-mint/10 blur-2xl"
        aria-hidden
      />
      {/* edge light */}
      <div
        className="pointer-events-none absolute inset-0 rounded-[1.9rem] ring-1 ring-inset ring-cream/10"
        style={{ boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.18)' }}
        aria-hidden
      />

      {/* header */}
      <div className="relative flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="flex size-7 items-center justify-center rounded-full bg-mint text-forest shadow-[0_6px_16px_-4px_rgba(145,187,158,0.8)]">
            <DollarSign className="size-3.5" strokeWidth={2.5} />
          </span>
          <span className="text-sm font-medium text-cream/85">{HOME_INCOME_COPY.label}</span>
        </div>
        {/* Label bulan NYATA dari tanggal perangkat — bukan teks statis "Februari". */}
        <span className="flex items-center gap-1 rounded-full bg-cream/10 px-3 py-1 text-xs font-medium text-cream/85">
          {stats.monthLabel}
        </span>
      </div>

      {/* value */}
      <div className="relative mt-5 flex items-end justify-between">
        <div>
          <span className="text-3xl font-medium tracking-tight tabular-nums">
            {money(stats.thisMonth)}
          </span>
          <span className="mt-1 block text-xs text-cream/50">
            {HOME_INCOME_COPY.totalThisMonth}
          </span>
        </div>
        {/* persen HANYA saat bisa dihitung (bulan lalu ada pemasukan) */}
        {stats.changePct !== null && (
          <div className="flex flex-col items-end gap-1">
            <span
              className={cn(
                'rounded-full px-2 py-0.5 text-[11px] font-medium',
                stats.changePct >= 0 ? 'bg-mint text-forest' : 'bg-hud-terracotta text-cream',
              )}
            >
              {stats.changePct >= 0 ? '+' : ''}
              {stats.changePct}%
            </span>
            <span className="text-[10px] text-cream/45">{HOME_INCOME_COPY.vsLastMonth}</span>
          </div>
        )}
      </div>

      {/* monthly bar chart — dari seri bulan NYATA; saat belum ada pemasukan,
          yang muncul penjelasan jujur, bukan 12 bar contoh */}
      <div className="relative mt-7">
        {hasIncome ? (
          <>
            <div className="flex h-24 items-end gap-1.5">
              {stats.series.map((point, i) => (
                <div key={point.key} className="group relative flex h-full flex-1 items-end">
                  {point.active && (
                    <span className="absolute -top-1 left-1/2 -translate-x-1/2 -translate-y-full rounded-full bg-mint px-1.5 py-0.5 text-[9px] font-medium text-forest shadow-[0_6px_14px_-4px_rgba(145,187,158,0.8)]">
                      {money(point.value)}
                    </span>
                  )}
                  <div
                    className={
                      point.active
                        ? 'w-full origin-bottom animate-[bar-grow_0.7s_cubic-bezier(0.22,1,0.36,1)_both] rounded-full bg-gradient-to-t from-mint/60 to-mint shadow-[0_0_18px_rgba(145,187,158,0.45)]'
                        : 'w-full origin-bottom animate-[bar-grow_0.7s_cubic-bezier(0.22,1,0.36,1)_both] rounded-full bg-cream/10 transition-colors duration-300 group-hover:bg-cream/25'
                    }
                    style={{
                      height: `${Math.max(4, (point.value / max) * 100)}%`,
                      animationDelay: `${120 + i * 45}ms`,
                    }}
                  />
                </div>
              ))}
            </div>
            {/* month labels */}
            <div className="mt-2 flex gap-1.5">
              {stats.series.map((point) => (
                <span
                  key={point.key}
                  className={
                    point.active
                      ? 'flex-1 text-center text-[9px] font-medium text-mint'
                      : 'flex-1 text-center text-[9px] text-cream/35'
                  }
                >
                  {point.label}
                </span>
              ))}
            </div>
          </>
        ) : (
          <div className="rounded-2xl bg-cream/10 px-4 py-5 text-center">
            <p className="text-[13px] font-medium text-cream/85">{HOME_INCOME_COPY.emptyTitle}</p>
            <p className="mt-1 text-[11.5px] text-cream/50">{HOME_INCOME_COPY.emptyHint}</p>
          </div>
        )}
      </div>
    </div>
  )
}
