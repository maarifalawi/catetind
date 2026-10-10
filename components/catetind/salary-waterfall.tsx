'use client'

import { useState } from 'react'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import {
  MONTHLY_INCOME,
  buildWaterfall,
  burnTone,
  formatIDR,
  maskMoney,
  type Bill,
} from '@/lib/data/bills'

/* ── Waterfall Salary Drain ──────────────────────────────────────────────────
   Gaji bulanan = SATU bar penuh; tiap tagihan "memakan" porsinya (terbesar di
   kiri & terlebar), sisanya = proyeksi sisa gaji.

   REDESAIN (padat & minimalis): intro dua baris, teks petunjuk, panel "nada
   beban", dan catatan kaki panjang DICABUT — semuanya teks yang tidak perlu
   dibaca berulang. Yang tersisa: judul kecil, persentase, bar, lalu satu baris
   ringkas (tagihan · sisa) yang berganti jadi detail potongan begitu segmennya
   di-hover / focus / tap. Tautan ke Jatah Harian tetap ada supaya angka "sisa"
   tidak dibaca sebagai sisa uang hari ini (audit UX #2).
   ────────────────────────────────────────────────────────────────────────── */

/** 20.0% → '20%' — satu desimal hanya kalau memang perlu (0.7%) */
function percentLabel(percent: number): string {
  const rounded = Number(percent.toFixed(1))
  return `${rounded}%`
}

export function SalaryWaterfall({
  bills,
  masked,
  monthlyIncome = MONTHLY_INCOME,
  className,
}: {
  bills: Bill[]
  masked: boolean
  monthlyIncome?: number
  /** override margin luar (dipakai saat kartu disusun dalam grid 2 kolom) */
  className?: string
}) {
  /** null = tidak ada segmen aktif → bar tampil bersih (audit UX #6) */
  const [activeId, setActiveId] = useState<string | null>(null)

  const waterfall = buildWaterfall(bills, monthlyIncome)
  if (waterfall.segments.length === 0) return null

  const active = activeId
    ? (waterfall.segments.find((segment) => segment.id === activeId) ?? null)
    : null
  const tone = burnTone(waterfall.burnPercentage)

  return (
    <section
      aria-label="Waterfall gaji"
      className={cn('rounded-3xl bg-cream p-4 ring-1 ring-soil/10', className)}
    >
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="text-[11px] font-medium uppercase tracking-[0.16em] text-forest/40">
          Gaji terpakai
        </h2>
        <span className={cn('text-[13px] font-semibold tabular-nums', tone.textClass)}>
          {waterfall.burnPercentage}%
        </span>
      </div>

      {/* bar gaji: segmen tagihan (terbesar di kiri) + proyeksi sisa gaji.
          onMouseLeave menutup detail supaya bar kembali bersih. */}
      <div
        className="mt-3 flex h-3 w-full overflow-hidden rounded-full bg-sage"
        onMouseLeave={() => setActiveId(null)}
      >
        {waterfall.segments.map((segment) => (
          <button
            key={segment.id}
            type="button"
            onMouseEnter={() => setActiveId(segment.id)}
            onFocus={() => setActiveId(segment.id)}
            onBlur={() => setActiveId((current) => (current === segment.id ? null : current))}
            onClick={() => setActiveId(segment.id)}
            aria-label={`${segment.name} ${formatIDR(segment.amount)} — ${percentLabel(segment.percent)} dari pemasukan bulanan`}
            className={cn(
              'h-full transition-opacity duration-200 first:rounded-l-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-forest/40',
              segment.barClass,
              activeId !== null && activeId !== segment.id && 'opacity-40',
            )}
            style={{ flexGrow: Math.max(segment.amount, 1), flexBasis: 0, minWidth: 6 }}
          />
        ))}
        <span
          aria-hidden
          className="h-full bg-cream"
          style={{ flexGrow: Math.max(waterfall.remaining, 1), flexBasis: 0 }}
        />
      </div>

      {/* satu baris: detail potongan aktif ATAU ringkasan tagihan · sisa */}
      <div className="mt-2.5 flex items-center justify-between gap-3">
        {active ? (
          <span className="truncate text-[11px] font-medium text-forest">
            {active.emoji} {active.name} · {maskMoney(active.amount, masked)} (
            {percentLabel(active.percent)})
          </span>
        ) : (
          <span className="flex items-center gap-1.5 text-[11px] font-medium tabular-nums text-forest/45">
            <span>Tagihan {maskMoney(waterfall.total, masked)}</span>
            <span aria-hidden>·</span>
            <span>Sisa {maskMoney(waterfall.remaining, masked)}</span>
          </span>
        )}
        <Link
          href="/budget"
          className="shrink-0 text-[11px] font-medium text-forest/40 underline decoration-forest/20 underline-offset-2 transition-colors hover:text-forest/70"
        >
          Jatah harian
        </Link>
      </div>
    </section>
  )
}
