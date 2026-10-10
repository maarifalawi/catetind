'use client'

import { useEffect, useState } from 'react'
import { Area, AreaChart, ResponsiveContainer, Tooltip, YAxis } from 'recharts'
import { maskMoney } from '@/lib/data/history'
import {
  WALLET_PERIOD_COPY,
  WALLET_TREND_COLORS,
  type WalletTrendPoint,
} from '@/lib/data/wallet-detail'
import { cn } from '@/lib/utils'

/* ── Mini Trend "Arah Saldo" (inventaris #13: chart mini trend) ───────────────
   Sparkline saldo harian selama jendela 30 hari. Tiga keputusan yang penting
   dibaca sebelum mengubah:

   1. TANPA sumbu & tanpa grid. Yang diperlukan user cuma bentuk garisnya
      ("naik atau turun?"), bukan tabel. Tanggal pertama & terakhir ditulis
      sebagai caption di bawah grafik supaya rentangnya tetap eksplisit.
   2. Tooltip IKUT tombol mata global. Nominal saldo adalah data paling sensitif
      di app ini; kalau grafiknya bocor lewat tooltip, seluruh gunanya sensor
      layar hilang.
   3. Domain Y dinaikkan sedikit di atas/bawah data (`dataMin - 25000`), bukan
      mulai dari 0 — mulai dari nol membuat garis saldo Rp 1–3 juta terlihat
      rata seperti kabel mati, sehingga "arah" yang seharusnya dibaca justru
      tidak kelihatan. */

export function WalletDetailTrend({
  points,
  masked,
  className,
}: {
  points: WalletTrendPoint[]
  masked: boolean
  className?: string
}) {
  /* pref-reduced-motion: garisnya langsung muncul utuh, tanpa animasi gambar */
  const [reduceMotion, setReduceMotion] = useState(false)
  useEffect(() => {
    setReduceMotion(window.matchMedia('(prefers-reduced-motion: reduce)').matches)
  }, [])

  /* satu titik bukan garis — lebih jujur tidak menampilkan apa pun */
  if (points.length < 2) return null

  const first = points[0]
  const last = points[points.length - 1]

  return (
    <figure className={cn('mt-4', className)}>
      <div className="flex items-baseline justify-between gap-3">
        <figcaption className="text-[11px] font-medium uppercase tracking-[0.14em] text-forest/45">
          {WALLET_PERIOD_COPY.trendTitle}
        </figcaption>
        <span className="text-[10.5px] text-forest/35">{WALLET_PERIOD_COPY.trendHint}</span>
      </div>

      <div className="mt-1.5 h-[116px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={points} margin={{ top: 6, right: 4, bottom: 0, left: 4 }}>
            <defs>
              <linearGradient id="wallet-trend-fill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={WALLET_TREND_COLORS.fill} stopOpacity={0.42} />
                <stop offset="100%" stopColor={WALLET_TREND_COLORS.fill} stopOpacity={0.02} />
              </linearGradient>
            </defs>
            {/* sumbu disembunyikan tapi tetap mengatur skala supaya bentuk
                garisnya terbaca (lihat catatan 3 di atas) */}
            <YAxis
              hide
              domain={[
                (dataMin: number) => Math.max(0, dataMin - 25000),
                (dataMax: number) => dataMax + 25000,
              ]}
            />
            <Tooltip
              cursor={false}
              content={<TrendTooltip masked={masked} />}
              wrapperStyle={{ outline: 'none' }}
            />
            <Area
              type="monotone"
              dataKey="balance"
              stroke={WALLET_TREND_COLORS.stroke}
              strokeWidth={2.4}
              fill="url(#wallet-trend-fill)"
              dot={false}
              activeDot={{
                r: 4.5,
                fill: WALLET_TREND_COLORS.stroke,
                stroke: '#ffffff',
                strokeWidth: 2,
              }}
              isAnimationActive={!reduceMotion}
              animationDuration={700}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* rentang yang benar-benar digambar */}
      <div className="mt-1.5 flex items-center justify-between gap-3 text-[10.5px] font-medium text-forest/40">
        <span className="tabular-nums">{first.label}</span>
        <span className="tabular-nums">{last.label}</span>
      </div>

      {/* grafik tidak bisa dibaca pembaca layar — isinya dikatakan dalam teks */}
      <p className="sr-only">
        {WALLET_PERIOD_COPY.trendA11y(
          first.label,
          maskMoney(first.balance, masked),
          last.label,
          maskMoney(last.balance, masked),
        )}
      </p>
    </figure>
  )
}

/** tooltip bubble — ikut mode privasi (nominal jadi titik sensor saat disensor) */
type TooltipEntry = { payload?: WalletTrendPoint }

function TrendTooltip({
  active,
  payload,
  masked = false,
}: {
  active?: boolean
  payload?: TooltipEntry[]
  masked?: boolean
}) {
  const point = payload?.[0]?.payload
  if (!active || !point) return null
  return (
    <div className="rounded-2xl bg-ink px-3.5 py-2.5 text-cream shadow-[0_16px_34px_-16px_rgba(69,89,78,0.8)]">
      <p className="text-[10.5px] text-cream/60">{point.label}</p>
      <p className="mt-0.5 text-[12.5px] font-semibold tabular-nums">
        {maskMoney(point.balance, masked)}
      </p>
    </div>
  )
}
