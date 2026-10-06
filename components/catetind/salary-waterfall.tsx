'use client'

import { useState } from 'react'
import Link from 'next/link'
import { AnimatePresence, motion } from 'framer-motion'
import { cn } from '@/lib/utils'
import {
  MONTHLY_INCOME,
  buildWaterfall,
  burnTone,
  formatIDR,
  maskMoney,
  type Bill,
} from '@/lib/data/bills'

/* ── Waterfall Salary Drain (Section 4) ──────────────────────────────────────
   Gaji bulanan digambarkan sebagai SATU bar penuh selebar layar, lalu dimakan
   potongan demi potongan mulai dari tagihan terbesar (paling kiri & paling
   lebar) sampai sisanya tinggal "sisa untuk hidup".

   Lebar tiap segmen = nominal / pemasukan (Kos 1,5 juta → 20% bar). Segmen
   terkecil diberi lantai 8px supaya Spotify/Netflix tetap bisa disentuh; sisa
   bar memakai flex-grow sisa sehingga proporsinya tetap benar.

   Detail segmen (nama + nominal + %) kini TOOLTIP murni — hanya muncul saat
   segmen di-hover (desktop) / di-focus / di-tap (HP), jadi bar-nya tampil
   bersih dan label tidak pernah saling menumpuk (audit UX #6).

   Audit UX #2: angka "sisa" adalah PROYEKSI AWAL BULAN (gaji − seluruh tagihan
   rutin), BUKAN sisa uang riil hari ini. Labelnya karena itu diperjelas dan
   diberi tautan ke Jatah Harian di halaman Budget, supaya tidak bentrok dengan
   metrik Daily HUD.
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
  /** null = tidak ada chip terbuka → bar tampil bersih (audit UX #6) */
  const [activeId, setActiveId] = useState<string | null>(null)

  const waterfall = buildWaterfall(bills, monthlyIncome)
  if (waterfall.segments.length === 0) return null

  const active = activeId
    ? (waterfall.segments.find((segment) => segment.id === activeId) ?? null)
    : null
  const tone = burnTone(waterfall.burnPercentage)

  /* chip detail menempel di sisi yang masih punya ruang: segmen paling kiri
     rata kiri, paling kanan rata kanan, sisanya tengah */
  const activeIndex = active ? waterfall.segments.indexOf(active) : -1
  const chipAlign =
    activeIndex <= 0
      ? 'justify-start'
      : activeIndex === waterfall.segments.length - 1
        ? 'justify-end'
        : 'justify-center'

  return (
    <section
      aria-label="Waterfall gaji"
      className={cn(
        'mt-5 rounded-[1.75rem] bg-cream p-5 shadow-[0_4px_24px_-4px_rgba(0,0,0,0.06)] ring-1 ring-soil/12 sm:p-6',
        className,
      )}
    >
      <h2 className="font-display text-[15px] font-semibold tracking-tight text-forest">
        💸 Ke mana gaji kamu pergi?
      </h2>
      <p className="mt-1 text-[11.5px] leading-relaxed text-forest/45">
        Bar penuh = {maskMoney(monthlyIncome, masked)} gaji bulan ini — ditarik dari tagihan
        paling gede dulu (proyeksi awal bulan), biar penyedot terbesarnya langsung kelihatan.
      </p>

      {/* chip detail segmen aktif — HANYA saat hover / focus / tap (audit #6) */}
      <div className={cn('mt-4 flex h-7 items-center', active ? chipAlign : 'justify-start')}>
        <AnimatePresence mode="wait" initial={false}>
          {active ? (
            <motion.span
              key={active.id}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.16, ease: 'easeOut' }}
              className="inline-flex items-center gap-1.5 rounded-full bg-forest px-2.5 py-1 text-[11px] font-medium text-cream shadow-[0_10px_22px_-14px_rgba(69,89,78,0.85)]"
            >
              <span aria-hidden>{active.emoji}</span>
              <span>{active.name}</span>
              <span className="font-semibold tabular-nums">{maskMoney(active.amount, masked)}</span>
              <span className="font-medium tabular-nums text-cream/60">
                {percentLabel(active.percent)}
              </span>
            </motion.span>
          ) : (
            <motion.span
              key="hint"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.16, ease: 'easeOut' }}
              className="text-[11px] font-medium text-forest/35"
            >
              Arahkan / tap potongan warna buat lihat detail
            </motion.span>
          )}
        </AnimatePresence>
      </div>

      {/* bar gaji: segmen tagihan (terbesar di kiri) + proyeksi sisa gaji.
          onMouseLeave menutup tooltip supaya bar kembali bersih (audit #6). */}
      <div
        className="mt-2 flex h-5 w-full overflow-hidden rounded-full bg-cream ring-1 ring-inset ring-soil/12"
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
              activeId !== null && activeId !== segment.id && 'opacity-50',
            )}
            style={{ flexGrow: Math.max(segment.amount, 1), flexBasis: 0, minWidth: 8 }}
          />
        ))}
        {/* proyeksi sisa gaji — proporsinya mengikuti sisa gaji */}
        <span
          aria-hidden
          className="h-full bg-cream"
          style={{ flexGrow: Math.max(waterfall.remaining, 1), flexBasis: 0 }}
        />
      </div>

      {/* ringkasan kiri–kanan */}
      <div className="mt-3.5 flex flex-wrap items-center justify-between gap-x-3 gap-y-1.5 text-[11.5px] font-medium">
        <span className="tabular-nums text-forest/60">
          🔒 Sudah dijanjikan: {maskMoney(waterfall.total, masked)} ({waterfall.burnPercentage}%)
        </span>
        <span className="tabular-nums text-forest/70">
          📊 Proyeksi sisa gaji: {maskMoney(waterfall.remaining, masked)}
        </span>
      </div>

      {/* nada beban tetap: ringan / lumayan padat / tinggi (Section 4) */}
      <p
        className={cn(
          'mt-3.5 rounded-2xl px-3.5 py-2.5 text-[12px] font-medium leading-snug ring-1',
          tone.panelClass,
          tone.textClass,
        )}
      >
        {tone.copy}
      </p>

      {/* Audit UX #2 — cegah angka "proyeksi" dibaca sebagai sisa uang hari ini.
          Metrik sisa uang RIIL ada di Jatah Harian halaman Budget (satu angka
          dengan Daily HUD), jadi user tidak melihat dua "sisa" yang berbeda. */}
      <p className="mt-2 text-[10.5px] leading-relaxed text-forest/40">
        “Proyeksi sisa gaji” = gaji − seluruh tagihan rutin bulan ini, belum termasuk pengeluaran
        harian. Sisa uang riil kamu hari ini ada di{' '}
        <Link
          href="/budget"
          className="font-medium text-forest underline decoration-forest/30 underline-offset-2 hover:decoration-forest"
        >
          Jatah Harian (Budget &amp; Target)
        </Link>
        .
      </p>
    </section>
  )
}
