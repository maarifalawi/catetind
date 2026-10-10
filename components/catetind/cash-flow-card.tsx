'use client'

import { memo, useEffect, useMemo, useState, type ReactNode } from 'react'
import { ArrowDownLeft, ArrowUpRight, Waves } from 'lucide-react'
import Link from 'next/link'
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis } from 'recharts'
import { TransactionBottomSheet } from '@/components/dashboard/transaction-bottom-sheet'
import { cn } from '@/lib/utils'
import {
  HOME_CASHFLOW_AXIS,
  HOME_CASHFLOW_COLORS,
  HOME_MONEY_COPY,
  cashFlowAxisRows,
  homeCashFlowSeries,
  monthShortFromISO,
  summarizeCashFlowSeries,
  type FlowAxisKey,
  type HomeCashFlowPoint,
} from '@/lib/data/home-money'
import { useMoneyStore } from '@/lib/money/store'
import { homeMoneyRowsForContext } from '@/lib/money/context-filter'
import { useTodayISO } from '@/lib/use-today-iso'
import { useMoneyContext } from './money-context-provider'
import { usePrivacy } from './privacy-provider'

/* ── ARUS UANG — garis minimalis (paket 68 · mandat desain) ──────────────────
   ATURAN ANGKA (paket 35, tidak berubah): angka kartu ini TURUNAN, bukan
   konstanta. Baris yang SAMA dengan kartu "Transaksi Terakhir"
   (`recordedTransactions()` dari satu store uang) dibaca lewat
   `homeCashFlowSeries()`, dan totalnya dibaca dari SERI itu sendiri
   (`summarizeCashFlowSeries()`) — jadi dua kartu mustahil bercerita beda, dan
   tidak ada satu pun nominal keras di komponen ini.

   BENTUK VISUAL (paket 68). Kartu ini sudah empat kali ganti bentuk; pelajaran
   yang sama tiap kali: ia harus JELAS di lebar apa pun dan tidak boleh jadi
   "grafik pasaran" yang berat. Riwayatnya: garis + area (terlalu generik) →
   kolom pasang-surut (masih terbaca batang) → peta aliran alluvial (paket 67,
   terasa berat) → **(sekarang) SATU grafik garis spline minimalis**:

     · TANPA `CartesianGrid`, tanpa garis sumbu, tanpa tick — hanya label
       tanggal yang pudar di bawah. Yang dibaca user cuma BENTUK arusnya.
     · Dua kurva `type="monotone"` (Pemasukan mint · Pengeluaran plum) dengan
       isian `linearGradient` yang MEMUDAR ke transparan — "subtle fading fill".
     · Tooltip minimalis: hanya tanggal + dua nominal (masuk/keluar).
     · Warna datang dari `HOME_CASHFLOW_COLORS` (lib/data) supaya penjaga palet
       tetap hijau & komponen bebas hex; nominal tooltip ikut Global Eye lewat
       `money()` dari context privasi (yang DIBACA disensor — §5.7).
     · Animasi gambar dihormati `prefers-reduced-motion` (pola
       `wallet-detail-trend.tsx`). */

/** titik tooltip — bentuknya persis `HomeCashFlowPoint` dari seri */
type TooltipPoint = HomeCashFlowPoint

/** Tooltip minimalis (tanggal + nominal). `money` = sensor privasi; dikirim
 *  sebagai prop supaya fungsi ini tetap murni & tidak menyeret context. */
function CashFlowTooltip({
  active,
  payload,
  money,
}: {
  active?: boolean
  payload?: { payload?: TooltipPoint }[]
  money: (value: number) => string
}) {
  const point = payload?.[0]?.payload
  if (!active || !point) return null
  return (
    <div className="rounded-2xl bg-ink px-3.5 py-2.5 text-cream shadow-[0_16px_34px_-16px_rgba(0,0,0,0.8)]">
      <p className="text-[10.5px] text-cream/60">{point.label}</p>
      <p className="mt-1 flex items-center gap-1.5 text-[12.5px] font-medium tabular-nums">
        <span
          aria-hidden
          className="size-1.5 shrink-0 rounded-full"
          style={{ backgroundColor: HOME_CASHFLOW_COLORS.income }}
        />
        {money(point.income)}
      </p>
      <p className="mt-0.5 flex items-center gap-1.5 text-[12.5px] font-medium tabular-nums">
        <span
          aria-hidden
          className="size-1.5 shrink-0 rounded-full"
          style={{ backgroundColor: HOME_CASHFLOW_COLORS.expense }}
        />
        {money(point.expense)}
      </p>
    </div>
  )
}

/* Wajah tiap baris sumbu (paket 76): swatch + ikon arah. Ikon & warna cuma
   penanda visual — TIDAK ada teks baru di sini, jadi aturan copy tak tersentuh. */
const AXIS_FACE: Record<FlowAxisKey, { swatch: string; icon: ReactNode }> = {
  income: {
    swatch: 'bg-mint/20 text-forest',
    icon: <ArrowDownLeft className="size-3.5" strokeWidth={2.6} aria-hidden />,
  },
  expense: {
    swatch: 'bg-hud-terracotta/15 text-hud-terracotta',
    icon: <ArrowUpRight className="size-3.5" strokeWidth={2.6} aria-hidden />,
  },
  /* "Sisa" bukan masuk/keluar — jadi tanpa ikon arah, cukup titik netral */
  net: {
    swatch: 'bg-forest text-mint',
    icon: <span className="size-1.5 rounded-full bg-current" />,
  },
}

/** Dibungkus `memo` — kartu ini tidak menerima props, jadi tidak perlu ikut
 *  re-render saat HomeScreen mengubah state popup. Nominal di sini ikut Global
 *  Eye lewat context privasi (`money()` sudah menyensor). */
export const CashFlowCard = memo(function CashFlowCard() {
  const { money } = usePrivacy()
  /* Baris NYATA dari SATU store uang (`lib/money/store.ts`) — paket 58: kartu
     ini berhenti membaca `HOME_MONEY_ROWS` (seed demo) sebagai sumber angka.
     `recordedTransactions()` sudah membuang tombstone; baris hasil edit memakai
     nilai barunya. Karena `useSyncExternalStore`, HTML server = render pertama. */
  const snapshot = useMoneyStore()
  const { context } = useMoneyContext()
  const today = useTodayISO()
  /* Baris dompet KONTEKS AKTIF — memilih Pribadi/Keluarga/Bersama mengubah
     kartu ini (dulu selalu seluruh dompet, jadi filter tak terasa). */
  const rows = useMemo(() => homeMoneyRowsForContext(snapshot, context), [snapshot, context])
  /* bulan NYATA dari jam perangkat; sebelum mount label jatuh ke kanon demo
     (hidrasi aman), lalu berganti begitu `useTodayISO()` terisi */
  const monthISO = today ? today.slice(0, 7) : undefined
  const monthShort = monthShortFromISO(monthISO)
  const series = useMemo(() => homeCashFlowSeries(rows, monthISO), [rows, monthISO])
  /* total dibaca dari SERI, bukan dari daftar baris — supaya angka kunci
     mustahil berbeda dari jumlah titik di grafiknya sendiri */
  const totals = useMemo(() => summarizeCashFlowSeries(series), [series])
  /* tiga baris sumbu (Pemasukan · Pengeluaran · Sisa) — urutan & tanda dikunci
     di `cashFlowAxisRows()` supaya komponen ini cuma menggambar (paket 76) */
  const axisRows = useMemo(
    () => cashFlowAxisRows(totals.income, totals.expense),
    [totals.income, totals.expense],
  )

  /* pref-reduced-motion: garisnya langsung muncul utuh, tanpa animasi menggambar */
  const [reduceMotion, setReduceMotion] = useState(false)
  useEffect(() => {
    setReduceMotion(window.matchMedia('(prefers-reduced-motion: reduce)').matches)
  }, [])

  /* belum ada uang yang bergerak di bulan ini ⇒ empty state jujur (58.1):
     grafik yang rata bisa disalahartikan "nol pengeluaran" — kalimat lebih baik */
  const empty = totals.income === 0 && totals.expense === 0
  const net = totals.net
  const saveRate = totals.income > 0 ? Math.round((net / totals.income) * 100) : 0

  return (
    <div className="flex h-full flex-col rounded-[2rem] bg-cream p-4 ring-1 ring-soil/12 sm:p-5 lg:p-6">
      {/* header — judul + periode + badge surplus/defisit. Badge disembunyikan di
          keadaan kosong (58.1) karena persen dari nol tidak berarti. */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <span className="flex size-8 items-center justify-center rounded-full bg-sage text-forest">
            <Waves className="size-4" strokeWidth={2.4} />
          </span>
          <div>
            <p className="text-sm font-medium text-forest">{HOME_MONEY_COPY.chartTitle}</p>
            <p className="text-xs text-forest/45">
              {HOME_MONEY_COPY.period} · {monthShort}
            </p>
          </div>
        </div>
        {!empty && (
          <span className="shrink-0 rounded-full bg-forest px-2.5 py-1 text-[11px] font-medium text-mint tabular-nums">
            {net < 0
              ? HOME_MONEY_COPY.chartBadgeDeficit(Math.abs(saveRate))
              : HOME_MONEY_COPY.chartBadgeSurplus(saveRate)}
          </span>
        )}
      </div>

      {empty ? (
        /* ── EMPTY STATE (58.1) — belum ada uang yang bergerak di bulan ini.
           Grafik datar gampang dibaca sebagai "nol pengeluaran", padahal artinya
           "belum ada catatan" — jadi kalimatnya yang dipakai, plus dua pintu
           nyata: panel input & halaman Riwayat. */
        <div className="mt-4 flex flex-1 flex-col items-center justify-center rounded-2xl border-2 border-dashed border-forest/15 bg-cream/50 px-6 py-8 text-center">
          <span className="flex size-12 items-center justify-center rounded-full bg-sage text-forest">
            <Waves className="size-5" strokeWidth={1.8} />
          </span>
          <p className="mt-3 text-sm font-medium text-forest">{HOME_MONEY_COPY.chartEmptyTitle}</p>
          <p className="mt-1 max-w-[26rem] text-xs leading-relaxed text-forest/50">
            {HOME_MONEY_COPY.chartEmptyBody}
          </p>
          <TransactionBottomSheet
            trigger={
              <button
                type="button"
                className="mt-4 rounded-full bg-forest px-5 py-2.5 text-[13px] font-medium text-cream transition-colors hover:bg-forest-soft active:scale-[0.97]"
              >
                {HOME_MONEY_COPY.chartEmptyCta}
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
          {/* ── TIGA ANGKA KUNCI — SIMETRI KOLOM (paket 76) ────────────────────
              Kesimpulan kartu, dibaca sebelum grafiknya. Ketiga baris memakai
              SATU grid dengan template kolom bersama (`HOME_CASHFLOW_AXIS`):
              label di kiri (tumbuh), nominal di kanan (auto). Karena ketiganya
              berbagi grid yang SAMA (bukan tiga grid terpisah), kolom nominal
              lebarnya = nominal terpanjang → "Rp 12.345.678" tak pernah
              menggeser label, dan ketiga nominal duduk di satu sumbu kanan yang
              sama. Angkanya `tabular-nums` + `tracking-tight` supaya lebarnya
              stabil saat nilainya berubah (tidak "melompat"). */}
          <div className={cn('mt-4 grid gap-y-1.5', HOME_CASHFLOW_AXIS.gridClass)}>
            {axisRows.map((row) => (
              /* `contents` = anak-anaknya ikut kolom grid induk, jadi label &
                 nominal tiap baris berbagi dua kolom bersama di atas */
              <div key={row.key} className="contents">
                <div className="flex min-w-0 items-center gap-2">
                  <span
                    className={cn(
                      'flex size-7 shrink-0 items-center justify-center rounded-xl',
                      AXIS_FACE[row.key].swatch,
                    )}
                  >
                    {AXIS_FACE[row.key].icon}
                  </span>
                  <span className="truncate text-[12.5px] font-medium text-forest/60">
                    {row.label}
                  </span>
                </div>
                <p
                  className={cn(
                    'self-center whitespace-nowrap text-right text-[15px] font-semibold',
                    HOME_CASHFLOW_AXIS.valueClass,
                    row.negative ? 'text-hud-terracotta' : 'text-forest',
                  )}
                >
                  {row.negative ? '-' : ''}
                  {money(Math.abs(row.amount))}
                </p>
              </div>
            ))}
          </div>


          {/* ── GRAFIK GARIS MINIMALIS ────────────────────────────────────────
              `min-h-[190px]` menjaga tinggi di mobile (kartu content-sized),
              `flex-1` membuatnya TUMBUH mengisi sel grid di desktop (bento:
              kartu ini `h-full`, jadi tidak ada ruang mati di bawah grafik). */}
          <figure className="mt-5 flex min-h-0 flex-1 flex-col">
            <div className="mt-1 min-h-[190px] w-full flex-1">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={series} margin={{ top: 8, right: 8, bottom: 0, left: 8 }}>
                  <defs>
                    <linearGradient id="home-cashflow-income" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={HOME_CASHFLOW_COLORS.income} stopOpacity={0.3} />
                      <stop offset="100%" stopColor={HOME_CASHFLOW_COLORS.income} stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="home-cashflow-expense" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={HOME_CASHFLOW_COLORS.expense} stopOpacity={0.24} />
                      <stop offset="100%" stopColor={HOME_CASHFLOW_COLORS.expense} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  {/* sumbu-X saja: tanpa garis sumbu & tanpa tick — hanya teks
                      tanggal yang pudar. Sumbu-Y sengaja TIDAK dirender supaya
                      skala tetap otomatis (area mulai dari 0) tanpa garis.

                      `interval="preserveStartEnd"` (paket 70): serinya kini satu
                      titik PER HARI (28–31 titik), jadi labelnya pasti rapat.
                      Mode ini menyuruh Recharts membuang label yang bertabrakan
                      TAPI selalu mempertahankan yang pertama & TERAKHIR — itulah
                      yang membuat ujung kanan sumbu selalu menyebut tanggal
                      terakhir bulan (mis. "31 Okt"), bukan berhenti di "29". */}
                  <XAxis
                    dataKey="label"
                    interval="preserveStartEnd"
                    tickLine={false}
                    axisLine={false}
                    tickMargin={10}
                    tick={{ fontSize: 10, fill: HOME_CASHFLOW_COLORS.axis }}
                  />
                  <Tooltip
                    cursor={{ stroke: HOME_CASHFLOW_COLORS.cursor, strokeWidth: 1 }}
                    content={<CashFlowTooltip money={money} />}
                    wrapperStyle={{ outline: 'none' }}
                  />
                  <Area
                    type="monotone"
                    dataKey="income"
                    stroke={HOME_CASHFLOW_COLORS.income}
                    strokeWidth={2.4}
                    fill="url(#home-cashflow-income)"
                    dot={false}
                    activeDot={{
                      r: 4,
                      fill: HOME_CASHFLOW_COLORS.income,
                      stroke: HOME_CASHFLOW_COLORS.dot,
                      strokeWidth: 2,
                    }}
                    isAnimationActive={!reduceMotion}
                    animationDuration={700}
                  />
                  <Area
                    type="monotone"
                    dataKey="expense"
                    stroke={HOME_CASHFLOW_COLORS.expense}
                    strokeWidth={2.4}
                    fill="url(#home-cashflow-expense)"
                    dot={false}
                    activeDot={{
                      r: 4,
                      fill: HOME_CASHFLOW_COLORS.expense,
                      stroke: HOME_CASHFLOW_COLORS.dot,
                      strokeWidth: 2,
                    }}
                    isAnimationActive={!reduceMotion}
                    animationDuration={700}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            {/* legenda inline (bukan legend Recharts): dua dot + label kanon */}
            <figcaption className="mt-2 flex items-center justify-center gap-5 text-[11px] font-medium text-forest/55">
              <span className="flex items-center gap-1.5">
                <span
                  aria-hidden
                  className="size-2 rounded-full"
                  style={{ backgroundColor: HOME_CASHFLOW_COLORS.income }}
                />
                {HOME_MONEY_COPY.chartIncomeLabel}
              </span>
              <span className="flex items-center gap-1.5">
                <span
                  aria-hidden
                  className="size-2 rounded-full"
                  style={{ backgroundColor: HOME_CASHFLOW_COLORS.expense }}
                />
                {HOME_MONEY_COPY.chartExpenseLabel}
              </span>
            </figcaption>

            {/* grafik tidak bisa dibaca pembaca layar — isinya dikatakan dalam teks */}
            <p className="sr-only">
              {HOME_MONEY_COPY.chartAria}. {HOME_MONEY_COPY.chartIncomeLabel}:{' '}
              {money(totals.income)}, {HOME_MONEY_COPY.chartExpenseLabel}: {money(totals.expense)},{' '}
              {HOME_MONEY_COPY.chartNetLabel}: {net < 0 ? '-' : ''}
              {money(Math.abs(net))}.
            </p>
          </figure>
        </>
      )}
    </div>
  )
})

