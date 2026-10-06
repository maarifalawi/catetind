'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import {
  WEALTH_GAP_COPY,
  buildWealthGap,
  formatIDR,
  formatJuta,
  type WealthPoint,
} from '@/lib/data/landing'

/* ── SECTION 3 · WEALTH GAP VISUALIZER ──────────────────────────────────────
   Dua orang bergaji SAMA, beda kebiasaan menabung. Dua area yang menumpuk:
   "tanpa tracking" (5% savings, garis abu putus-putus, isi tipis) dan "dengan
   CatetInd" (15%, garis hijau tegas, isi lebih pekat). Keduanya mulai dari nol
   di usia 24 lalu bercabang.

   ANIMASI hanya saat terlihat: chart-nya sengaja baru DI-MOUNT ketika section
   masuk viewport (IntersectionObserver). Recharts 3.10 punya animasi masuk
   bawaan untuk `Area` yang membuka area dari KIRI ke KANAN lewat clip-path
   (`AreaRevealShape`) — jadi cukup `isAnimationActive` + mount-on-visible, tanpa
   CSS/JS animasi buatan sendiri. */
export function WealthGap() {
  const data = useMemo(() => buildWealthGap(), [])
  const [revealed, setRevealed] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setRevealed(true)
          observer.disconnect()
        }
      },
      { threshold: 0.35 },
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  const last = data[data.length - 1]

  return (
    <section
      id="wealth-gap"
      aria-labelledby="wealth-gap-title"
      className="scroll-mt-20 py-16 lg:py-24"
    >
      <div className="mx-auto w-full max-w-[1120px] px-5 sm:px-6 lg:px-8">
        <header className="mx-auto max-w-2xl text-center">
          <p className="text-[11px] font-medium tracking-[0.16em] text-forest uppercase">
            {WEALTH_GAP_COPY.eyebrow}
          </p>
          <h2
            id="wealth-gap-title"
            className="mt-2 font-display text-3xl font-medium tracking-tight text-forest lg:text-4xl"
          >
            {WEALTH_GAP_COPY.headline}
          </h2>
          <p className="mt-3 text-[14px] leading-relaxed text-forest/55">
            {WEALTH_GAP_COPY.subtitle}
          </p>
        </header>

        {/* legenda manual (bukan legenda bawaan) supaya gayanya ikut palet app */}
        <div className="mt-8 flex flex-wrap items-center justify-center gap-x-5 gap-y-2">
          <LegendSwatch color="#767676" dashed label={WEALTH_GAP_COPY.seriesWithout} />
          <LegendSwatch color="#45594e" label={WEALTH_GAP_COPY.seriesWith} />
        </div>

        <figure className="mt-4 rounded-[1.75rem] bg-cream p-4 ring-1 ring-soil/12 sm:p-6">
          <div ref={containerRef} className="h-[280px] w-full sm:h-[320px]">
            {revealed && (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data} margin={{ top: 8, right: 12, bottom: 4, left: 4 }}>
                  <defs>
                    <linearGradient id="wealth-gap-without" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#767676" stopOpacity={0.16} />
                      <stop offset="100%" stopColor="#767676" stopOpacity={0.02} />
                    </linearGradient>
                    <linearGradient id="wealth-gap-within" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#91bb9e" stopOpacity={0.55} />
                      <stop offset="100%" stopColor="#91bb9e" stopOpacity={0.06} />
                    </linearGradient>
                  </defs>

                  <CartesianGrid vertical={false} stroke="rgba(0,0,0,0.06)" />
                  <XAxis
                    dataKey="age"
                    tickLine={false}
                    axisLine={false}
                    tickMargin={8}
                    tick={{ fontSize: 11, fill: '#767676' }}
                    interval={2}
                  />
                  <YAxis
                    tickLine={false}
                    axisLine={false}
                    width={52}
                    tickMargin={6}
                    tickFormatter={formatJuta}
                    tick={{ fontSize: 11, fill: '#767676' }}
                  />
                  <Tooltip
                    cursor={{ stroke: 'rgba(0,0,0,0.15)', strokeWidth: 1 }}
                    content={<WealthTooltip />}
                    wrapperStyle={{ outline: 'none' }}
                  />
                  <Area
                    type="monotone"
                    dataKey="tanpa"
                    stroke="#767676"
                    strokeWidth={2}
                    strokeDasharray="5 5"
                    fill="url(#wealth-gap-without)"
                    dot={false}
                    animationDuration={1500}
                  />
                  <Area
                    type="monotone"
                    dataKey="dengan"
                    stroke="#45594e"
                    strokeWidth={2.6}
                    fill="url(#wealth-gap-within)"
                    dot={false}
                    animationDuration={1500}
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>

          <figcaption className="mt-4 flex items-center justify-between gap-3 text-[11px] font-medium text-forest/40">
            <span>Usia {data[0].age} tahun</span>
            <span className="tabular-nums">
              Gap di usia {last.age}: {formatIDR(last.dengan - last.tanpa)}
            </span>
          </figcaption>
        </figure>

        <p className="mx-auto mt-4 max-w-3xl text-center text-[11px] leading-relaxed text-forest/45">
          {WEALTH_GAP_COPY.footnote}
        </p>

        {/* grafik tidak terbaca pembaca layar — ringkasannya dikatakan sebagai teks */}
        <p className="sr-only">
          {WEALTH_GAP_COPY.chartLabel}. Di usia {last.age} tahun, proyeksi tanpa tracking{' '}
          {formatIDR(last.tanpa)} dan dengan CatetInd {formatIDR(last.dengan)}.
        </p>
      </div>
    </section>
  )
}

function LegendSwatch({
  color,
  label,
  dashed = false,
}: {
  color: string
  label: string
  dashed?: boolean
}) {
  return (
    <span className="flex items-center gap-2 text-[12.5px] font-medium text-forest/65">
      <span
        aria-hidden
        className="block h-0 w-6 border-t-2"
        style={{ borderColor: color, borderStyle: dashed ? 'dashed' : 'solid' }}
      />
      {label}
    </span>
  )
}

type TooltipProps = {
  active?: boolean
  payload?: Array<{ payload: WealthPoint }>
  label?: number
}

function WealthTooltip({ active, payload, label }: TooltipProps) {
  if (!active || !payload || payload.length === 0) return null
  const point = payload[0].payload
  return (
    <div className="rounded-2xl bg-ink px-3.5 py-2.5 text-cream shadow-[0_16px_34px_-16px_rgba(0,0,0,0.6)]">
      <p className="text-[10.5px] text-cream/60">Usia {label ?? point.age}</p>
      <p className="mt-1 text-[12.5px] font-medium tabular-nums">
        Dengan CatetInd: {formatIDR(point.dengan)}
      </p>
      <p className="text-[12px] tabular-nums text-cream/70">
        Tanpa tracking: {formatIDR(point.tanpa)}
      </p>
    </div>
  )
}

