'use client'

import { memo, useEffect, useMemo, useState, type ReactNode } from 'react'
import { ArrowDownLeft, ArrowUpRight, TrendingDown, TrendingUp, Waves } from 'lucide-react'
import Link from 'next/link'
import {
  Area,
  AreaChart,
  CartesianGrid,
  ReferenceDot,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { TransactionBottomSheet } from '@/components/dashboard/transaction-bottom-sheet'
import { cn } from '@/lib/utils'
import {
  HOME_CASHFLOW_AXIS,
  HOME_CASHFLOW_COLORS,
  HOME_MONEY_COPY,
  axisLabel,
  axisTicks,
  cashFlowAxisRows,
  cashFlowSeriesPeak,
  homeCashFlowSeries,
  monthShortFromISO,
  niceAxisMax,
  summarizeCashFlowSeries,
  todayCashFlowPoint,
  todayMarkerLabel,
  type FlowAxisKey,
  type HomeCashFlowPoint,
} from '@/lib/data/home-money'
import { useMoneyStore } from '@/lib/money/store'
import { homeMoneyRowsForContext } from '@/lib/money/context-filter'
import { useTodayISO } from '@/lib/use-today-iso'
import { useMoneyContext } from './money-context-provider'
import { usePrivacy } from './privacy-provider'

/* ── ARUS UANG — bento chart modern (paket 91 · mandat desain) ───────────────
   ATURAN ANGKA (paket 35, tidak berubah): angka kartu ini TURUNAN, bukan
   konstanta. Baris yang SAMA dengan kartu "Transaksi Terakhir"
   (`recordedTransactions()` dari satu store uang) dibaca lewat
   `homeCashFlowSeries()`, dan totalnya dibaca dari SERI itu sendiri
   (`summarizeCashFlowSeries()`) — jadi dua kartu mustahil bercerita beda, dan
   tidak ada satu pun nominal keras di komponen ini.

   BENTUK VISUAL (paket 91–93). Paket 90 sempat menukar kurva jadi batang (kelas &
   geometrinya masih tersimpan sebagai bentuk cadangan di `HOME_CASHFLOW_BAR`),
   lalu pemilik produk menilai GARIS lebih baik — "tapi di-improve lagi, dibuat
   lebih modern minimalist". Kurvanya karena itu kembali, dan kali ini yang
   ditambah SEMUANYA adalah isyarat yang membuatnya terbaca seperti GRAFIK
   sungguhan, bukan sekadar dua garis:

     · SUMBU-Y DI KANAN + GRID HORIZONTAL. Tiga label rupiah pendek
       (`10 jt` · `5 jt` · `0`) dari `axisLabel()` — ikut tombol mata global
       (sumbu = permukaan BACA, §5.7) — plus garis bantu horizontal paling pudar
       dari `CartesianGrid`. Skalanya bulat (`niceAxisMax` atas puncak harian
       dari `cashFlowSeriesPeak`), jadi kurva tak pernah menyentuh tepi kanvas
       walau nominalnya berubah setelah user mencatat.
     · PENANDA "HARI INI" yang jujur: garis putus-putus tipis (`todayMarkerLabel`
       untuk posisi) PLUS dua titik padat di nilai hari ini (`todayCashFlowPoint`
       — titik yang SAMA, jadi mustahil jatuh di tanggal berbeda). Serinya selalu
       sepanjang bulan PENUH, jadi tanpa penanda ini ekor rata di ujung kanan
       terbaca seperti "pengeluaran berhenti", padahal itu sisa bulan belum jalan.
     · TOOLTIP RAPI: tanggal, baris berlabel "Masuk"/"Keluar" dengan dot warna,
       lalu baris "Sisa" (net) yang dipisah garis rambut. Semua nominal lewat
       `money()` dari context privasi.
     · SATU HUE PER SERI (paket 93). Aturan warnanya satu: BASE (ton dalam) untuk
       GARIS + semua titik & ikon, SOFT (ton terang) untuk ISIAN area & latar
       chip. Jadi garis, titik hari, dot legenda, dot tooltip, dan chip angka
       kunci MUSTAHIL beda warna lagi — tabelnya `HOME_CASHFLOW_COLORS`
       (lib/data), jadi komponen tetap bebas hex.
     · GAYA GARIS DUA LAPIS + TITIK HARI (paket 92–93). Tiap kurva digambar DUA
       kali: lapisan "halo" (stroke 8 · opasitas ~0.17 · `fill="none"`) di
       belakang, lalu kurva utama stroke 2.6 berujung bulat. Di atasnya, tiap
       HARI YANG PUNYA NILAI dapat titik kecil (`dayDot`) — tekstur "data" yang
       membuat kurvanya terbaca hidup; hari bernilai nol sengaja dilewati agar
       tidak ada titik yang berpura-pura jadi data.
     · Gradien area 3 stop (0.45 / 0.36 → 0) supaya areanya terasa berisi, bukan
       dicuci.
     · Sumbu-X tetap TIGA tanggal (awal · tengah · akhir) supaya tidak padat.

   Yang TIDAK berubah: dua kurva `type="monotone"` (H2-4), warna dari
   `HOME_CASHFLOW_COLORS` (lib/data) supaya penjaga palet tetap hijau & komponen
   bebas hex, dan animasi gambar yang dihormati `prefers-reduced-motion` (pola
   `wallet-detail-trend.tsx`). */

/** titik tooltip — bentuknya persis `HomeCashFlowPoint` dari seri */
type TooltipPoint = HomeCashFlowPoint

/** props yang diberikan Recharts ke render-fungsi `dot` (cuma yang dipakai) */
type DayDotProps = { cx?: number; cy?: number; value?: number }

/**
 * Titik kecil di SETIAP HARI yang punya nilai (paket 93) — memberi tekstur
 * "data" pada kurvanya sehingga garisnya tidak lagi sekadar dua pita. Hari
 * bernilai NOL dilewati (`null`): titik di garis dasar akan terbaca seperti ada
 * catatan padahal tidak ada. Warnanya = warna GARIS serinya, jadi titik dan
 * kurva selalu satu hue (aturan "satu hue per seri", lihat `HOME_CASHFLOW_COLORS`).
 */
function dayDot(color: string) {
  return function DayDot({ cx, cy, value }: DayDotProps) {
    if (!value || cx == null || cy == null) return null
    return <circle cx={cx} cy={cy} r={2.3} fill={color} />
  }
}

/** dua titik hari — dibuat SEKALI di module scope, bukan tiap render */
const INCOME_DAY_DOT = dayDot(HOME_CASHFLOW_COLORS.income)
const EXPENSE_DAY_DOT = dayDot(HOME_CASHFLOW_COLORS.expense)

/** satu baris tooltip: dot warna + label kanon + nominal (rata kanan, tabular) */
function TooltipRow({ dot, label, value }: { dot: string; label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="flex items-center gap-1.5 text-[12px] font-medium text-cream/70">
        {/* `ring-cream` = garis tipis terang: ton BASE (warna GARIS serinya)
            tetap terbaca di atas kartu tooltip yang berlatar ink */}
        <span
          aria-hidden
          className="size-2 shrink-0 rounded-full ring-1 ring-cream/35"
          style={{ backgroundColor: dot }}
        />
        {label}
      </span>
      <span className="text-[13.5px] font-medium tabular-nums">{value}</span>
    </div>
  )
}

/** Tooltip rapi (tanggal → Masuk · Keluar → Sisa). `money` = sensor privasi;
 *  dikirim sebagai prop supaya fungsi ini tetap murni & tidak menyeret context. */
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
  const net = point.income - point.expense
  return (
    <div className="min-w-[10.5rem] rounded-2xl bg-ink px-3.5 py-3 text-cream shadow-[0_18px_40px_-16px_rgba(0,0,0,0.85)] ring-1 ring-cream/10">
      <p className="text-[11.5px] font-medium tracking-wide text-cream/55">{point.label}</p>
      <div className="mt-2 space-y-1">
        {/* dot = ton BASE, sama persis dengan warna GARIS-nya (aturan satu hue
            per seri); ring terangnya yang menjaga dot tetap terbaca di kartu ink */}
        <TooltipRow
          dot={HOME_CASHFLOW_COLORS.income}
          label={HOME_MONEY_COPY.chartTooltipIncome}
          value={money(point.income)}
        />
        <TooltipRow
          dot={HOME_CASHFLOW_COLORS.expense}
          label={HOME_MONEY_COPY.chartTooltipExpense}
          value={money(point.expense)}
        />
      </div>
      <div className="mt-2 flex items-center justify-between gap-4 border-t border-cream/10 pt-2">
        <span className="text-[11.5px] font-medium text-cream/55">
          {HOME_MONEY_COPY.chartNetLabel}
        </span>
        <span className="text-[13.5px] font-semibold tabular-nums">
          {net < 0 ? '-' : ''}
          {money(Math.abs(net))}
        </span>
      </div>
    </div>
  )
}

/* Wajah tiap baris sumbu (paket 76; warna diselaraskan di paket 93): swatch +
   ikon arah. Latar chip memakai ton SOFT milik serinya (= warna ISIAN areanya),
   dan glyph-nya memakai tinta gelap yang sama di ketiga baris — jadi chip tidak
   memperkenalkan hue ketiga. Ikon & warna cuma penanda visual, TIDAK ada teks
   baru di sini, jadi aturan copy tak tersentuh. */
const AXIS_FACE: Record<FlowAxisKey, { swatch: string; icon: ReactNode }> = {
  income: {
    /* SOFT hijau (mint) — pasangan chip dari GARIS evergreen */
    swatch: 'bg-mint/25 text-forest',
    icon: <ArrowDownLeft className="size-3.5" strokeWidth={2.6} aria-hidden />,
  },
  expense: {
    /* SOFT melon (cantelope — sama nilainya dengan `hud-amber`) — pasangan chip
       dari GARIS cantelope-mid. */
    swatch: 'bg-cantelope/25 text-forest',
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
  const { money, masked } = usePrivacy()
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

  /* pref-reduced-motion: kurvanya langsung muncul utuh, tanpa animasi menggambar */
  const [reduceMotion, setReduceMotion] = useState(false)
  useEffect(() => {
    setReduceMotion(window.matchMedia('(prefers-reduced-motion: reduce)').matches)
  }, [])

  /* TIGA label sumbu-X saja (awal · tengah · akhir) — turunannya dari seri, jadi
     tidak ada satu pun tanggal yang ditulis di komponen ini. `Set` membuang
     duplikat kalau serinya sangat pendek. */
  const xTicks = useMemo(() => {
    const mid = series[Math.floor((series.length - 1) / 2)]
    const labels = [series[0]?.label, mid?.label, series[series.length - 1]?.label]
    return [...new Set(labels.filter((label): label is string => Boolean(label)))]
  }, [series])

  /* SKALA SUMBU-Y: batas BULAT (`niceAxisMax`) atas puncak harian seri, dengan
     tiga tick (puncak · tengah · nol). Keduanya turunan murni; labelnya menyebut
     nominal user, jadi ia disensor saat tombol mata aktif (`axisLabel` dipakai
     di `tickFormatter` sumbu-Y). */
  const yMax = useMemo(() => niceAxisMax(cashFlowSeriesPeak(series)), [series])
  const yTicks = useMemo(() => axisTicks(yMax), [yMax])

  /* titik & label "Hari ini" (garis putus-putus + dua titik padat di nilainya) —
     keduanya `null` saat hari ini belum terbaca (render server) atau tanggalnya
     di luar bulan yang digambar, jadi seri kanon demo tidak pernah ditandai
     "hari ini". Dua turunan ini sepakat karena `todayMarkerLabel` = `.label`
     dari `todayCashFlowPoint`. */
  const todayPoint = useMemo(() => todayCashFlowPoint(today, series), [today, series])
  const todayLabel = useMemo(() => todayMarkerLabel(today, series), [today, series])

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
          /* H2-5 (audit UI/UX): badge surplus/defisit dibuat LEBIH BESAR &
             eye-catching — ikon arah + latar mint/terracotta lembut yang menonjol
             dari kartu, bukan pil forest kecil yang mudah kelewat. */
          <span
            className={cn(
              'inline-flex shrink-0 items-center gap-1 rounded-full px-3 py-1.5 text-[13.5px] font-semibold tabular-nums ring-1',
              net < 0
                ? 'bg-hud-terracotta/15 text-hud-terracotta ring-hud-terracotta/25'
                : 'bg-mint/35 text-forest ring-forest/20',
            )}
          >
            {net < 0 ? (
              <TrendingDown className="size-3.5" strokeWidth={2.6} aria-hidden />
            ) : (
              <TrendingUp className="size-3.5" strokeWidth={2.6} aria-hidden />
            )}
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
                className="mt-4 rounded-full bg-forest px-5 py-2.5 text-[14px] font-medium text-cream transition-colors hover:bg-forest-soft active:scale-[0.97]"
              >
                {HOME_MONEY_COPY.chartEmptyCta}
              </button>
            }
          />
          <Link
            href="/history"
            className="mt-2.5 text-[12.5px] font-medium text-forest transition-colors hover:text-forest-soft"
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
                  <span className="truncate text-[13.5px] font-medium text-forest/60">
                    {row.label}
                  </span>
                </div>
                <p
                  className={cn(
                    'self-center whitespace-nowrap text-right text-[16px] font-semibold',
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

          {/* ── GRAFIK ARUS UANG — 3.0 (paket 91) ──────────────────────────────
              `min-h-[190px]` menjaga tinggi di mobile (kartu content-sized),
              `flex-1` membuatnya TUMBUH mengisi sel grid di desktop (bento:
              kartu ini `h-full`, jadi tidak ada ruang mati di bawah grafik). */}
          <figure className="mt-5 flex min-h-0 flex-1 flex-col">
            <div className="mt-1 min-h-[190px] w-full flex-1">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={series} margin={{ top: 12, right: 2, bottom: 0, left: 2 }}>
                  <defs>
                    {/* gradien area 3 stop, memakai ton SOFT (isian) serinya —
                        turun landai supaya areanya terasa berisi, bukan dicuci */}
                    <linearGradient id="home-cashflow-income" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={HOME_CASHFLOW_COLORS.incomeSoft} stopOpacity={0.45} />
                      <stop offset="45%" stopColor={HOME_CASHFLOW_COLORS.incomeSoft} stopOpacity={0.17} />
                      <stop offset="100%" stopColor={HOME_CASHFLOW_COLORS.incomeSoft} stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="home-cashflow-expense" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={HOME_CASHFLOW_COLORS.expenseSoft} stopOpacity={0.36} />
                      <stop offset="45%" stopColor={HOME_CASHFLOW_COLORS.expenseSoft} stopOpacity={0.13} />
                      <stop offset="100%" stopColor={HOME_CASHFLOW_COLORS.expenseSoft} stopOpacity={0} />
                    </linearGradient>
                  </defs>

                  {/* grid: HANYA garis horizontal (paling pudar dari semua garis) —
                      ia cuma memberi isyarat skala, bukan membingkai grafik. */}
                  <CartesianGrid
                    vertical={false}
                    stroke={HOME_CASHFLOW_COLORS.grid}
                    strokeDasharray="3 6"
                  />

                  {/* sumbu-X: TIGA label (awal · tengah · akhir) + garis dasar rambut */}
                  <XAxis
                    dataKey="label"
                    ticks={xTicks}
                    tickLine={false}
                    axisLine={{ stroke: HOME_CASHFLOW_COLORS.baseline }}
                    tickMargin={10}
                    tick={{ fontSize: 10, fill: HOME_CASHFLOW_COLORS.axis }}
                  />
                  {/* sumbu-Y di KANAN: tiga label rupiah pendek, senyap & tanpa garis.
                      Domain dipatok [0, yMax] BULAT supaya puncak kurva tidak pernah
                      menyentuh tepi kanvas; labelnya lewat `axisLabel()` → ikut
                      tombol mata global (sumbu = permukaan baca, §5.7). */}
                  <YAxis
                    orientation="right"
                    width={50}
                    domain={[0, yMax > 0 ? yMax : 1]}
                    ticks={yMax > 0 ? yTicks : [0]}
                    tickLine={false}
                    axisLine={false}
                    tickMargin={6}
                    tick={{ fontSize: 9.5, fill: HOME_CASHFLOW_COLORS.axis }}
                    tickFormatter={(value: number) => axisLabel(value, masked)}
                  />

                  <Tooltip
                    cursor={{
                      stroke: HOME_CASHFLOW_COLORS.cursor,
                      strokeWidth: 1,
                      strokeDasharray: '3 4',
                    }}
                    content={<CashFlowTooltip money={money} />}
                    wrapperStyle={{ outline: 'none' }}
                  />
                  {/* penanda "Hari ini" — garis putus-putus tipis di posisi tanggalnya,
                      hanya saat tanggal itu benar-benar ada di bulan yang digambar,
                      jadi sisa bulan yang belum jalan tidak terbaca seperti
                      "pengeluaran berhenti" */}
                  {todayLabel && (
                    <ReferenceLine
                      x={todayLabel}
                      stroke={HOME_CASHFLOW_COLORS.cursor}
                      strokeDasharray="3 4"
                      label={{
                        value: HOME_MONEY_COPY.chartTodayLabel,
                        position: 'insideTopLeft',
                        fill: HOME_CASHFLOW_COLORS.axis,
                        fontSize: 9,
                      }}
                    />
                  )}
                  {/* ── LAPISAN 1 · HALO (paket 92) ─────────────────────────────────
                      Salinan kurva yang SAMA dengan stroke lebar & opasitas rendah,
                      digambar di BELAKANG: memberi "bloom" halus di sekitar garis
                      sehingga kurvanya terasa hidup tanpa menambah elemen baru.
                      `fill="none"` + dot/activeDot mati — lapisan ini murni cahaya,
                      bukan area dan bukan titik. */}
                  <Area
                    type="monotone"
                    dataKey="expense"
                    stroke={HOME_CASHFLOW_COLORS.expense}
                    strokeWidth={8}
                    strokeOpacity={0.18}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    fill="none"
                    dot={false}
                    activeDot={false}
                    isAnimationActive={!reduceMotion}
                    animationDuration={900}
                  />
                  <Area
                    type="monotone"
                    dataKey="income"
                    stroke={HOME_CASHFLOW_COLORS.income}
                    strokeWidth={8}
                    strokeOpacity={0.16}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    fill="none"
                    dot={false}
                    activeDot={false}
                    isAnimationActive={!reduceMotion}
                    animationDuration={900}
                    animationBegin={80}
                  />

                  {/* ── LAPISAN 2 · KURVA UTAMA (paket 92–93) ──────────────────────
                      PENGELUARAN digambar lebih dulu supaya Pemasukan tetap terbaca
                      di atasnya, dan menyusul 80 ms kemudian (ritme halus). Stroke
                      memakai ton BASE (bukan isiannya) supaya tegas di atas putih
                      maupun di atas areanya; titik aktifnya berhalo putih. `dot`
                      menaruh titik kecil di tiap HARI YANG PUNYA NILAI. */}
                  <Area
                    type="monotone"
                    dataKey="expense"
                    stroke={HOME_CASHFLOW_COLORS.expense}
                    strokeWidth={2.6}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    fill="url(#home-cashflow-expense)"
                    dot={EXPENSE_DAY_DOT}
                    activeDot={{
                      r: 4.5,
                      fill: HOME_CASHFLOW_COLORS.expense,
                      stroke: HOME_CASHFLOW_COLORS.dot,
                      strokeWidth: 2,
                    }}
                    isAnimationActive={!reduceMotion}
                    animationDuration={900}
                  />
                  <Area
                    type="monotone"
                    dataKey="income"
                    stroke={HOME_CASHFLOW_COLORS.income}
                    strokeWidth={2.6}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    fill="url(#home-cashflow-income)"
                    dot={INCOME_DAY_DOT}
                    activeDot={{
                      r: 4.5,
                      fill: HOME_CASHFLOW_COLORS.income,
                      stroke: HOME_CASHFLOW_COLORS.dot,
                      strokeWidth: 2,
                    }}
                    isAnimationActive={!reduceMotion}
                    animationDuration={900}
                    animationBegin={80}
                  />
                  {/* dua titik padat di NILAI hari ini — penanda "posisi sekarang"
                      yang di ATAS kurva. Cuma digambar kalau nilainya memang ada
                      (hari bernilai nol tidak ditaruh titik di garis dasar). */}
                  {todayLabel && todayPoint && todayPoint.expense > 0 && (
                    <ReferenceDot
                      x={todayLabel}
                      y={todayPoint.expense}
                      r={3.5}
                      fill={HOME_CASHFLOW_COLORS.expense}
                      stroke={HOME_CASHFLOW_COLORS.dot}
                      strokeWidth={2}
                    />
                  )}
                  {todayLabel && todayPoint && todayPoint.income > 0 && (
                    <ReferenceDot
                      x={todayLabel}
                      y={todayPoint.income}
                      r={3.5}
                      fill={HOME_CASHFLOW_COLORS.income}
                      stroke={HOME_CASHFLOW_COLORS.dot}
                      strokeWidth={2}
                    />
                  )}
                </AreaChart>
              </ResponsiveContainer>
            </div>

            {/* legenda inline (bukan legend Recharts): dua dot + label kanon.
                Dotnya memakai ton BASE — SAMA PERSIS dengan warna garisnya, jadi
                legenda tidak bisa "beda warna" dari kurva yang ditunjuknya
                (aturan satu hue per seri, paket 93). */}
            <figcaption className="mt-2 flex items-center justify-center gap-5 text-[11.5px] font-medium text-forest/55">
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

