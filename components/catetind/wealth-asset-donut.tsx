'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts'
import {
  allocationSlices,
  maskMoney,
  type AllocationSlice,
  type Investment,
} from '@/lib/data/wealth'

/* ── DONUT ALOKASI ASET (Section 5B) ────────────────────────────────────────
   Recharts `PieChart` dengan inner radius 62% — cukup tebal untuk terasa
   "mahal", cukup tipis untuk tidak terasa seperti pie chart bawaan:

   - `cornerRadius` + `paddingAngle` → ujung potongan membulat, ada jeda antar
     segmen (bukan donat murah yang menempel rapat).
   - drop shadow halus di wrapper chart, bukan garis tepi.
   - tengah donut bicara: default jumlah aset, dan BERGANTI jadi nama jenis +
     porsi saat satu segmen disorot/di-tap.
   - tooltip custom memakai palet app & ikut privasi (nominal dimask).

   DUA PEMANGKASAN PENTING (permintaan desain):
   1. Dengan SATU aset donut cuma menggambar lingkaran penuh berisi "1 ASET" —
      nol informasi di luar satu baris teks. Karena itu donut DISEMBUNYIKAN saat
      jumlah aset ≤ 1, dan daftar aset langsung tampil.
   2. Legenda di bawah donut ("● Saham · 100% · Rp 900.000") DIHAPUS: ia
      mengulang potongan yang sudah terlihat di donut dan baris aset di bawahnya.
      Donutnya yang jadi legenda; detail nominal per aset hidup di daftar aset.

   Warna segmen datang dari `ASSET_TYPE_META` (tangga sage + amber kanon),
   jadi tidak ada warna baru di halaman ini.
   ────────────────────────────────────────────────────────────────────────── */

export function WealthAssetDonut({
  investments,
  masked,
}: {
  investments: Investment[]
  masked: boolean
}) {
  const slices = allocationSlices(investments)
  const [activeIndex, setActiveIndex] = useState(-1)
  const active = activeIndex >= 0 ? slices[activeIndex] : null

  /* satu aset (atau nol) = tidak ada alokasi untuk dibandingkan; satu JENIS
     (mis. dua reksadana) juga menghasilkan lingkaran penuh yang sama
     tidak informatifnya — donut hanya tampil kalau ada ≥ 2 potongan */
  if (investments.length <= 1 || slices.length <= 1) return null

  return (
    <div className="rounded-[1.75rem] bg-cream p-5 shadow-[0_18px_44px_-30px_rgba(0,0,0,0.45)] ring-1 ring-soil/10 sm:p-6">
      <div className="flex items-baseline justify-between gap-3">
        <h3 className="font-display text-[13.5px] font-semibold tracking-tight text-forest">
          Alokasi Aset
        </h3>
        <span className="text-[10.5px] font-medium uppercase tracking-[0.16em] text-forest/35">
          {slices.length} jenis
        </span>
      </div>

      {/* dudukan chart + readout tengah */}
      <div className="relative mx-auto mt-3 w-full max-w-[280px]">
        <div className="h-[212px] w-full [filter:drop-shadow(0_14px_22px_rgba(0,0,0,0.12))] sm:h-[232px]">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={slices}
                dataKey="value"
                nameKey="label"
                cx="50%"
                cy="50%"
                innerRadius="62%"
                outerRadius="94%"
                paddingAngle={3}
                cornerRadius={9}
                startAngle={90}
                endAngle={-270}
                stroke="none"
                animationDuration={700}
                onMouseEnter={(_: unknown, index: number) => setActiveIndex(index)}
                onClick={(_: unknown, index: number) => setActiveIndex(index)}
                onMouseLeave={() => setActiveIndex(-1)}
              >
                {slices.map((slice) => (
                  <Cell
                    key={slice.type}
                    fill={slice.color}
                    opacity={activeIndex === -1 || active?.type === slice.type ? 1 : 0.45}
                    className="cursor-pointer outline-none transition-opacity duration-200"
                  />
                ))}
              </Pie>
              <Tooltip
                cursor={false}
                content={<DonutTooltip masked={masked} />}
                wrapperStyle={{ outline: 'none' }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* readout tengah: jumlah aset ⇄ jenis yang sedang disorot */}
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
          {active ? (
            <motion.span
              key={active.type}
              initial={{ opacity: 0, scale: 0.92 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
              className="flex flex-col items-center"
            >
              <span className="text-[15px] leading-none">{active.emoji}</span>
              <span className="mt-1 font-display text-[22px] font-semibold leading-none tracking-tight text-forest tabular-nums">
                {active.pct}%
              </span>
              <span className="mt-1 text-[10.5px] font-medium text-forest/45">{active.label}</span>
            </motion.span>
          ) : (
            <>
              <span className="font-display text-[26px] font-semibold leading-none tracking-tight text-forest tabular-nums">
                {investments.length}
              </span>
              <span className="mt-1 text-[10.5px] font-medium uppercase tracking-[0.16em] text-forest/40">
                aset
              </span>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

/* tooltip donut — nama jenis + nominal + porsi (ikut toggle privasi) */
type TooltipEntry = { payload?: AllocationSlice }

function DonutTooltip({
  active,
  payload,
  masked = false,
}: {
  active?: boolean
  payload?: TooltipEntry[]
  masked?: boolean
}) {
  const slice = payload?.[0]?.payload
  if (!active || !slice) return null
  return (
    <div className="rounded-2xl bg-ink px-3.5 py-2.5 text-cream shadow-[0_16px_34px_-16px_rgba(0,0,0,0.8)]">
      <p className="flex items-center gap-1.5 text-[11.5px] font-medium">
        <span aria-hidden>{slice.emoji}</span>
        {slice.label}
      </p>
      <p className="mt-1 text-[12.5px] font-semibold tabular-nums">
        {maskMoney(slice.value, masked)}
      </p>
      <p className="text-[10.5px] text-cream/60 tabular-nums">{slice.pct}% dari portofolio</p>
    </div>
  )
}

