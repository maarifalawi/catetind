'use client'

import { memo, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { ChartPie } from 'lucide-react'
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts'
import { cn } from '@/lib/utils'
import { TransactionBottomSheet } from '@/components/dashboard/transaction-bottom-sheet'
import {
  HOME_DISTRIBUTION_PALETTE,
  HOME_MONEY_COPY,
  distributionSegments,
} from '@/lib/data/home-money'
import { useMoneyStore } from '@/lib/money/store'
import { homeMoneyRowsForContext } from '@/lib/money/context-filter'
import { useTodayISO } from '@/lib/use-today-iso'
import { useMoneyContext } from './money-context-provider'
import { usePrivacy } from './privacy-provider'

/* ── Distribusi Pengeluaran — TURUNAN dari catatan NYATA user (paket 58) ─────
   Dulu kartu ini menulis sendiri `SEGMENTS` (Makanan 1.260.000 · Transport
   819.000 · Tagihan 630.000 · Belanja 441.000) + `TOTAL = 3_150_000`. Angka itu
   tidak berasal dari mana pun: setelah user mengosongkan seluruh datanya,
   kartunya tetap menampilkan empat segmen contoh (temuan AKAR A + #11 audit
   2026-09). Sejak paket 58 sumbernya SATU, sama dengan kartu-kartu uang Home
   lainnya: baris ledger NYATA dari `useMoneyStore()` yang diturunkan murni oleh
   `distributionSegments()` (`lib/data/home-money.ts`, teruji). Segmen = kategori
   PENGELUARAN user di bulan berjalan, diurutkan menurun, kategori ke-5+ digabung
   jujur ke `Lainnya`.

   ── BENTUK VISUAL (paket 68 · rev. "pie modern") ────────────────────────────
   Bentuk lamanya dua kali: satu batang bertumpuk + legend pil panjang, lalu
   daftar bar horizontal bulat. Permintaan pemilik produk sekarang: **pie/donut
   modern** yang bersih — pola kartu "Profit & Loss" di referensi desain. Jadi:

     · DONAT tipis (`innerRadius` 64%) dengan ujung potongan membulat
       (`cornerRadius`) + jeda antar segmen (`paddingAngle`) → bukan pie padat
       bawaan; tanpa garis tepi, cukup drop-shadow halus;
     · LUBANG TENGAH bicara: `distributionCenterLabel` ("Total") + nominal
       bulan ini; saat satu segmen disorot, ia berganti jadi label + porsi
       kategori itu (pola yang sama dengan `wealth-asset-donut`);
     · LEGEND di samping = daftar bersih `dot · nama · persen · nominal`;
       hover/fokus/ketuk menyorot segmen donatnya (dua arah), bukan "legend"
       pil yang ramai;
     · tooltip MINIMAL (nama + nominal + porsi) dan ikut tombol mata global;
     · animasi mengembang dihormati `prefers-reduced-motion`;
     · `flex-1` + `justify-center` membuat blok donat+legend MENGISI tinggi
       kartu (bento 50/50 dengan "Jatah Hari Ini") tanpa ruang mati.

   Paletnya tetap 4 warna kanon (olive · thistle · cantelope · plum — audit #3):
   warnanya dirotasi menurut URUTAN segmen, bukan menurut nama kategori, karena
   kategorinya datang dari catatan user sendiri. */

/* palet kanon SAMA dengan donut Rekap Mingguan (`lib/data/home-money.ts`) —
   satu konstanta, dua permukaan, jadi warna kategori tidak bisa berbeda */
const PALETTE = HOME_DISTRIBUTION_PALETTE

/** Dibungkus `memo` — kartu ini tidak menerima props, jadi tidak perlu ikut
 *  re-render saat HomeScreen mengubah state popup. Membaca context privasi
 *  global untuk menyensor nominal. */
export const ExpenseDistributionCard = memo(function ExpenseDistributionCard() {
  const { money } = usePrivacy()
  /* "hari ini" dari jam perangkat — `''` pada render pertama (hidrasi aman) */
  const today = useTodayISO()
  const snapshot = useMoneyStore()
  const { context } = useMoneyContext()
  /* segmen yang sedang disorot (hover/fokus/ketuk) — `-1` = tidak ada; dipakai
     donat & legend untuk menyorot berpasangan (pola `wealth-asset-donut`) */
  const [activeIndex, setActiveIndex] = useState(-1)
  /* pref-reduced-motion: donat langsung muncul utuh, tanpa animasi mengembang */
  const [reduceMotion, setReduceMotion] = useState(false)
  useEffect(() => {
    setReduceMotion(window.matchMedia('(prefers-reduced-motion: reduce)').matches)
  }, [])

  /* baris bulan berjalan: ledger NYATA, bukan `HOME_MONEY_ROWS` (seed demo sudah
     berhenti jadi sumber angka Home sejak paket 58). Sebelum mount (`today`
     masih '') seluruh baris dipakai apa adanya — server & render pertama client
     identik karena snapshot server memang kosong. */
  const segments = useMemo(() => {
    const rows = homeMoneyRowsForContext(snapshot, context)
    const inMonth = today
      ? rows.filter((row) => row.date.slice(0, 7) === today.slice(0, 7))
      : rows
    return distributionSegments(inMonth)
  }, [snapshot, context, today])

  const total = segments.reduce((sum, seg) => sum + seg.amount, 0)
  const active = activeIndex >= 0 ? (segments[activeIndex] ?? null) : null

  return (
    <div className="flex h-full flex-col rounded-[2rem] bg-cream p-4 ring-1 ring-soil/12 sm:p-5">
      {/* header — konsisten dengan kartu lain */}
      <div className="flex items-center gap-2.5">
        <span className="flex size-8 items-center justify-center rounded-full bg-sage text-forest">
          <ChartPie className="size-4" strokeWidth={2.4} />
        </span>
        <div>
          <p className="text-sm font-medium text-forest">{HOME_MONEY_COPY.distributionTitle}</p>
          <p className="text-xs text-forest/45">{HOME_MONEY_COPY.period}</p>
        </div>
      </div>

      {segments.length === 0 ? (
        /* ── EMPTY STATE (temuan #11) — dulu kartu ini tidak punya cabang ini,
              jadi saat data kosong ia tetap menggambar 4 segmen contoh. CTA-nya
              nyata: membuka panel input (pola kartu Transaksi Terakhir) dan
              tautan ke Riwayat yang memang menyimpan catatannya. */
        <div className="mx-2 mt-4 flex flex-1 flex-col items-center justify-center rounded-2xl border-2 border-dashed border-forest/15 bg-cream/50 px-6 py-8 text-center">
          <span className="flex size-12 items-center justify-center rounded-full bg-sage text-forest">
            <ChartPie className="size-5" strokeWidth={1.8} />
          </span>
          <p className="mt-3 text-sm font-medium text-forest">
            {HOME_MONEY_COPY.distributionEmptyTitle}
          </p>
          <p className="mt-1 text-xs leading-relaxed text-forest/50">
            {HOME_MONEY_COPY.distributionEmptyBody}
          </p>
          <TransactionBottomSheet
            trigger={
              <button
                type="button"
                className="mt-4 rounded-full bg-forest px-5 py-2.5 text-[13px] font-medium text-cream transition-colors hover:bg-forest-soft active:scale-[0.97]"
              >
                {HOME_MONEY_COPY.distributionEmptyCta}
              </button>
            }
          />
          <Link
            href="/history"
            className="mt-2.5 text-[11.5px] font-medium text-forest transition-colors hover:text-forest-soft"
          >
            {HOME_MONEY_COPY.historyLink}
          </Link>
        </div>
      ) : (
        <>
          <div className="mt-4 flex min-h-0 flex-1 flex-col items-center justify-center gap-5 sm:flex-row sm:gap-6">
            {/* ── DONAT MODERN ────────────────────────────────────────────────
                Ring tipis + ujung membulat + jeda antar segmen = bentuk "pie
                modern", bukan pie padat bawaan. Lubang tengahnya bicara: total
                bulan ini, atau kategori yang sedang disorot. */}
            <div className="relative mx-auto w-full max-w-[184px] shrink-0 sm:mx-0 sm:w-[44%] sm:max-w-[196px]">
              <div className="h-[168px] w-full [filter:drop-shadow(0_14px_22px_rgba(69,89,78,0.12))] sm:h-[188px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={segments}
                      dataKey="amount"
                      nameKey="label"
                      cx="50%"
                      cy="50%"
                      innerRadius="64%"
                      outerRadius="100%"
                      paddingAngle={3}
                      cornerRadius={8}
                      startAngle={90}
                      endAngle={-270}
                      stroke="none"
                      isAnimationActive={!reduceMotion}
                      animationDuration={700}
                      onMouseEnter={(_: unknown, index: number) => setActiveIndex(index)}
                      onClick={(_: unknown, index: number) => setActiveIndex(index)}
                      onMouseLeave={() => setActiveIndex(-1)}
                    >
                      {segments.map((seg, i) => (
                        <Cell
                          key={seg.label}
                          fill={PALETTE[i % PALETTE.length]}
                          opacity={activeIndex === -1 || activeIndex === i ? 1 : 0.4}
                          className="cursor-pointer outline-none transition-opacity duration-200"
                        />
                      ))}
                    </Pie>
                    <Tooltip
                      cursor={false}
                      content={<DistributionTooltip money={money} />}
                      wrapperStyle={{ outline: 'none' }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              {/* readout tengah — DEKORATIF (legend di samping sudah menyebut
                  semuanya lewat aria-label tombolnya), jadi `aria-hidden`. */}
              <div
                aria-hidden
                className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center px-4 text-center"
              >
                <span className="text-[9.5px] font-medium uppercase tracking-[0.16em] text-forest/40">
                  {active ? `${active.pct}%` : HOME_MONEY_COPY.distributionCenterLabel}
                </span>
                <span className="mt-1 max-w-full truncate text-[13px] font-semibold leading-tight tracking-tight text-forest tabular-nums">
                  {active ? active.label : money(total)}
                </span>
              </div>
            </div>

            {/* ── LEGEND · daftar bersih (dot · nama · persen · nominal) ───────
                Bukan legend pil yang ramai: satu baris per kategori, dan
                hover/fokus/ketuk menyorot segmen donatnya (dua arah). */}
            <ul className="w-full min-w-0 flex-1 space-y-0.5">
              {segments.map((seg, i) => {
                const highlighted = activeIndex === i
                return (
                  <li key={seg.label}>
                    <button
                      type="button"
                      aria-label={`${seg.label} ${seg.pct}% ${HOME_MONEY_COPY.distributionDetailTail}`}
                      onMouseEnter={() => setActiveIndex(i)}
                      onMouseLeave={() => setActiveIndex(-1)}
                      onFocus={() => setActiveIndex(i)}
                      onBlur={() => setActiveIndex(-1)}
                      onClick={() => setActiveIndex((prev) => (prev === i ? -1 : i))}
                      className={cn(
                        'flex w-full items-center gap-2.5 rounded-xl px-2 py-1.5 text-left outline-none transition-colors duration-200 focus-visible:ring-2 focus-visible:ring-forest/20',
                        highlighted ? 'bg-sage/45' : 'hover:bg-sage/25',
                      )}
                    >
                      <span
                        aria-hidden
                        className="size-2.5 shrink-0 rounded-full"
                        style={{ backgroundColor: PALETTE[i % PALETTE.length] }}
                      />
                      <span className="min-w-0 flex-1 truncate text-[12.5px] font-medium text-forest">
                        {seg.label}
                      </span>
                      <span className="shrink-0 text-[12px] font-medium text-forest tabular-nums">
                        {seg.pct}%
                      </span>
                      <span className="w-[92px] shrink-0 text-right text-[11.5px] text-forest/45 tabular-nums">
                        {money(seg.amount)}
                      </span>
                    </button>
                  </li>
                )
              })}
            </ul>
          </div>

          {/* total juga dibaca pembaca layar — readout tengah donat `aria-hidden` */}
          <p className="sr-only">
            {HOME_MONEY_COPY.distributionCenterLabel}: {money(total)}
          </p>
        </>
      )}

    </div>
  )
})

/* tooltip donat — nama kategori + nominal + porsi (ikut tombol mata global).
   Bentuk minimalis: tiga baris, tanpa bingkai berat — sama dengan tooltip
   grafik "Arus Uang" supaya dua kartu Home terasa satu bahasa visual. */
type TooltipPoint = { label: string; amount: number; pct: number }

function DistributionTooltip({
  active,
  payload,
  money,
}: {
  active?: boolean
  payload?: { payload?: TooltipPoint }[]
  money: (value: number) => string
}) {
  const seg = payload?.[0]?.payload
  if (!active || !seg) return null
  return (
    <div className="rounded-2xl bg-ink px-3.5 py-2.5 text-cream shadow-[0_16px_34px_-16px_rgba(0,0,0,0.8)]">
      <p className="text-[11.5px] font-medium">{seg.label}</p>
      <p className="mt-1 text-[12.5px] font-semibold tabular-nums">{money(seg.amount)}</p>
      <p className="text-[10.5px] text-cream/60 tabular-nums">
        {seg.pct}% {HOME_MONEY_COPY.distributionDetailTail}
      </p>
    </div>
  )
}
