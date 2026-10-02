'use client'

import { memo, useMemo } from 'react'
import { ArrowDownLeft, ArrowUpRight, PiggyBank, Waves } from 'lucide-react'
import Link from 'next/link'
import { TransactionBottomSheet } from '@/components/dashboard/transaction-bottom-sheet'
import {
  HOME_MONEY_COPY,
  axisLabel,
  axisTicks,
  homeCashFlowSeries,
  homeMoneyRowFrom,
  monthShortFromISO,
  niceAxisMax,
  summarizeCashFlowSeries,
  type HomeCashFlowPoint,
} from '@/lib/data/home-money'
import { recordedTransactions, useMoneyStore } from '@/lib/money/store'
import { useTodayISO } from '@/lib/use-today-iso'
import { usePrivacy } from './privacy-provider'

/* ── ATURAN FINAL (paket 35): angka kartu ini TURUNAN, bukan konstanta ───────
   Dulu di sini ada `INCOME = 8_500_000` / `EXPENSE = 752_000` plus `SERIES` 5
   titik yang ditulis keras, dengan komentar "selaras dengan ringkasan di kartu
   Transaksi Terakhir". Nilainya memang SAMA saat seed — tapi hanya karena
   kebetulan seed-nya segitu. Begitu user mencatat pengeluaran, kartu sebelahnya
   bergerak sementara chart ini masih menulis "surplus Rp 7.748.000": dua angka
   berbeda untuk uang yang sama di satu layar.

   Sekarang kartu ini membaca himpunan baris yang SAMA dengan kartu "Transaksi
   Terakhir" — `HOME_MONEY_ROWS` (seed) + catatan sesi dari satu store uang
   (`lib/money/store.ts`, sejak paket 40; baris yang dihapus ikut tersaring) —
   dan menyebut periode yang SAMA
   (`HOME_MONEY_COPY.period`). Seri 5 pekan & sumbu-Y-nya diturunkan di
   `lib/data/home-money.ts` (`homeCashFlowSeries`, `niceAxisMax`), jadi tidak ada
   lagi satu pun nominal keras di komponen ini. */

/* ── geometri kanvas grafik (viewBox 0 0 320 132) ─────────────────────────── */
const W = 320
const H = 132
const PAD_L = 30 // ruang label sumbu-Y kiri
const PAD_R = 8
const TOP = 10
const BASE = 100
const GRID_Y = [TOP, (TOP + BASE) / 2, BASE]

/** kurva halus (Catmull-Rom → Bézier) — spline yang sama enaknya dengan versi
 *  lama, tapi sekarang dipakai untuk DUA garis sekaligus */
function smoothPath(pts: { x: number; y: number }[]) {
  let d = `M ${pts[0].x} ${pts[0].y}`
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] ?? pts[i]
    const p1 = pts[i]
    const p2 = pts[i + 1]
    const p3 = pts[i + 2] ?? p2
    const c1x = p1.x + (p2.x - p0.x) / 6
    const c1y = p1.y + (p2.y - p0.y) / 6
    const c2x = p2.x - (p3.x - p1.x) / 6
    const c2y = p2.y - (p3.y - p1.y) / 6
    d += ` C ${c1x.toFixed(2)} ${c1y.toFixed(2)} ${c2x.toFixed(2)} ${c2y.toFixed(2)} ${p2.x} ${p2.y}`
  }
  return d
}

/** semua yang dulu konstanta keras (X, INCOME_MAX, INCOME_AXIS, INCOME_PTS,
 *  INCOME_LINE, INCOME_AREA, INCOME_PEAK, …) kini satu turunan dari seri */
interface CashFlowGeometry {
  /** posisi x tiap titik data — label sumbu-X ditempel di sini */
  x: number[]
  incomeLine: string
  expenseLine: string
  incomeArea: string
  expenseArea: string
  incomePeak: { x: number; y: number }
  expensePeak: { x: number; y: number }
  /** tiga tick sumbu-Y kiri & kanan (diturunkan, bukan '8,5 jt'/'250 rb') */
  incomeTicks: number[]
  expenseTicks: number[]
}

/**
 * Geometri grafik diturunkan dari seri — tidak ada satu pun nominal maupun
 * koordinat keras di sini. Dipanggil sekali per perubahan seri (`useMemo` di
 * komponen), jadi chart ikut bergerak begitu user mencatat transaksi.
 *
 * SUMBU TUNGGAL (audit "Chart Scale Paradox"): dulu tiap seri punya sumbu-Y
 * sendiri (kiri pemasukan, kanan pengeluaran), sehingga pengeluaran Rp 40.000
 * tergambar SETINGGI pemasukan Rp 7.500.000 — dua angka beda 187× tampil sama.
 * Sekarang kedua seri berbagi satu batas (`niceAxisMax` dari nilai terbesar),
 * jadi tinggi garis benar-benar proporsional: nominal kecil tampak kecil.
 * Batas atasnya dibulatkan ke atas, bukan angka 8,5 jt / 250 rb yang ditulis
 * tangan.
 */
function buildGeometry(series: HomeCashFlowPoint[]): CashFlowGeometry {
  /* jarak antar pekan: aman walau serinya cuma satu titik (defensif) */
  const lastIndex = Math.max(series.length - 1, 1)
  const x = series.map((_, i) => PAD_L + (i * (W - PAD_L - PAD_R)) / lastIndex)

  /* ── SATU SKALA UNTUK DUA SERI (audit "Chart Scale Paradox") ───────────────
     `incomeMax`/`expenseMax` terpisah dulu membuat tiap seri "penuh" sendiri;
     sekarang keduanya dibagi batas yang SAMA. */
  const scaleMax = niceAxisMax(
    Math.max(...series.map((point) => point.income), ...series.map((point) => point.expense)),
  )
  /* seri yang masih nol (belum ada data) → garis rata di dasar, bukan NaN/Infinity */
  const incomeY = (v: number) => (scaleMax > 0 ? BASE - (v / scaleMax) * (BASE - TOP) : BASE)
  const expenseY = (v: number) => (scaleMax > 0 ? BASE - (v / scaleMax) * (BASE - TOP) : BASE)

  const incomePts = series.map((point, i) => ({ x: x[i], y: incomeY(point.income) }))
  const expensePts = series.map((point, i) => ({ x: x[i], y: expenseY(point.expense) }))
  const incomeLine = smoothPath(incomePts)
  const expenseLine = smoothPath(expensePts)

  return {
    x,
    incomeLine,
    expenseLine,
    incomeArea: `${incomeLine} L ${x[x.length - 1]} ${BASE} L ${x[0]} ${BASE} Z`,
    expenseArea: `${expenseLine} L ${x[x.length - 1]} ${BASE} L ${x[0]} ${BASE} Z`,
    /* titik puncak pemasukan (gajian) & pengeluaran tertinggi — penanda baca */
    incomePeak: incomePts.reduce((a, b) => (b.y < a.y ? b : a)),
    expensePeak: expensePts.reduce((a, b) => (b.y < a.y ? b : a)),
    /* SATU sumbu: kedua seri berbagi skala, jadi tick-nya sama */
    incomeTicks: axisTicks(scaleMax),
    expenseTicks: axisTicks(scaleMax),
  }
}

/** Dibungkus `memo` — kartu ini tidak menerima props, jadi tidak perlu ikut
 *  re-render saat HomeScreen mengubah state popup. Nominal maupun label
 *  sumbu-Y di sini ikut Global Eye lewat context privasi. */
export const CashFlowCard = memo(function CashFlowCard() {
  const { money, masked } = usePrivacy()
  /* Catatan sesi dari SATU store uang (`lib/money/store.ts`) — dibaca lewat
  /* Baris NYATA dari SATU store uang (`lib/money/store.ts`) — paket 58: kartu
     ini berhenti membaca `HOME_MONEY_ROWS` (seed demo) sebagai sumber angka.
     `recordedTransactions()` sudah membuang tombstone; baris hasil edit memakai
     nilai barunya. Karena `useSyncExternalStore`, HTML server tetap sama dengan
     render pertama client. */
  const snapshot = useMoneyStore()
  const today = useTodayISO()
  const rows = useMemo(() => recordedTransactions(snapshot).map(homeMoneyRowFrom), [snapshot])
  /* bulan NYATA dari jam perangkat; sebelum mount label jatuh ke kanon demo
     (hidrasi aman), lalu berganti begitu `useTodayISO()` terisi */
  const monthISO = today ? today.slice(0, 7) : undefined
  const monthShort = monthShortFromISO(monthISO)
  const series = useMemo(() => homeCashFlowSeries(rows, monthISO), [rows, monthISO])
  /* total dibaca dari SERI, bukan dari daftar baris — supaya jumlah pengeluaran
     di strip mustahil berbeda dari jumlah titik di grafik ini sendiri */
  const totals = useMemo(() => summarizeCashFlowSeries(series), [series])
  const geo = useMemo(() => buildGeometry(series), [series])
  /* belum ada uang yang bergerak di bulan ini ⇒ empty state jujur (58.1):
     grafik datar bisa disalahartikan "nol pengeluaran" — kalimat lebih baik */
  const empty = totals.income === 0 && totals.expense === 0

  const net = totals.net
  const saveRate = totals.income > 0 ? Math.round((net / totals.income) * 100) : 0
  const expenseShare =
    totals.income > 0 ? ((totals.expense / totals.income) * 100).toFixed(1).replace('.', ',') : '0'

  return (
    <div className="flex h-full flex-col rounded-[2rem] bg-cream p-6 ring-1 ring-soil/12">
      {/* header — konsisten dengan kartu lain */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <span className="flex size-8 items-center justify-center rounded-full bg-sage text-forest">
            <Waves className="size-4" strokeWidth={2.4} />
          </span>
          <div>
            <p className="text-sm font-semibold text-ink">{HOME_MONEY_COPY.chartTitle}</p>
            <p className="text-xs text-ink/45">{HOME_MONEY_COPY.chartSubtitle}</p>
          </div>
        </div>
        {/* badge surplus/defisit tidak masuk akal saat belum ada apa pun —
            disembunyikan di keadaan kosong (58.1) */}
        {!empty && (
          <span className="rounded-full bg-forest px-2.5 py-1 text-[11px] font-semibold text-mint tabular-nums">
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
          <p className="mt-3 text-sm font-semibold text-ink">{HOME_MONEY_COPY.chartEmptyTitle}</p>
          <p className="mt-1 text-xs leading-relaxed text-ink/50">{HOME_MONEY_COPY.chartEmptyBody}</p>
          <TransactionBottomSheet
            trigger={
              <button
                type="button"
                className="mt-4 rounded-full bg-forest px-5 py-2.5 text-[13px] font-semibold text-cream transition-colors hover:bg-forest-soft active:scale-[0.97]"
              >
                {HOME_MONEY_COPY.chartEmptyCta}
              </button>
            }
          />
          <Link
            href="/history"
            className="mt-2.5 text-[11.5px] font-semibold text-forest transition-colors hover:text-forest-soft"
          >
            {HOME_MONEY_COPY.historyLink}
          </Link>
        </div>
      ) : (
        <>
      {/* dua jumlah saling berhadapan — masuk ↙ kiri, keluar ↗ kanan */}
      <div className="mt-5 flex items-end justify-between gap-3">
        <div className="animate-[fade-pop_0.4s_ease_0.15s_backwards]">
          <p className="flex items-center gap-1.5 text-xs font-medium text-ink/50">
            <span className="flex size-4 items-center justify-center rounded-full bg-mint text-forest">
              <ArrowDownLeft className="size-2.5" strokeWidth={3} />
            </span>
            Pemasukan
          </p>
          <p className="mt-1 text-2xl font-semibold tracking-tight text-forest tabular-nums">
            {money(totals.income)}
          </p>
        </div>
        <div className="animate-[fade-pop_0.4s_ease_0.25s_backwards] text-right">
          <p className="flex items-center justify-end gap-1.5 text-xs font-medium text-ink/50">
            Pengeluaran
            <span className="flex size-4 items-center justify-center rounded-full bg-hud-terracotta/15 text-hud-terracotta">
              <ArrowUpRight className="size-2.5" strokeWidth={3} />
            </span>
          </p>
          <p className="mt-1 text-2xl font-semibold tracking-tight text-ink/80 tabular-nums">
            {money(totals.expense)}
          </p>
          <p className="mt-0.5 text-[11px] text-ink/40 tabular-nums">
            {expenseShare}% dari pemasukan
          </p>
        </div>
      </div>

      {/* legenda dua seri — warna garis dibaca tanpa harus menebak */}
      <div className="mt-4 flex items-center gap-4 text-[11px] font-medium text-ink/50">
        <span className="flex items-center gap-1.5">
          <span className="h-1.5 w-4 rounded-full bg-[#45594e]" aria-hidden />
          Pemasukan
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-1.5 w-4 rounded-full bg-hud-terracotta" aria-hidden />
          Pengeluaran
        </span>
        {/* periode yang disinggung chart ini — string yang SAMA dengan strip
            kartu "Transaksi Terakhir" (`HOME_MONEY_COPY.period`) + nama bulannya,
            jadi tidak ada lagi "bulan ini" vs "Minggu ini" untuk total yang sama */}
        <span className="ml-auto text-ink/35">
          {HOME_MONEY_COPY.period} — {monthShort}
        </span>
      </div>

      {/* ── grafik: dua spline + sumbu Y kembar + SUMBU X (tanggal) ──────────
          Sumbu X dulu hilang total, jadi user bisa lihat ada "gunung" merah
          tapi tidak tahu itu terjadi tanggal berapa. Label hari/tanggal tipis
          sekarang ditempel persis di bawah tiap titik data. Semua koordinat &
          nominal di dalamnya datang dari `geo` (turunan seri), bukan angka
          keras — lihat `buildGeometry`. */}
      <div
        className="relative mt-3 h-[116px] w-full"
        role="img"
        aria-label={`Grafik arus uang per pekan: pemasukan ${money(totals.income)}, pengeluaran ${money(totals.expense)}`}
      >
        <svg
          viewBox={`0 0 ${W} ${H}`}
          preserveAspectRatio="none"
          className="absolute inset-0 h-full w-full"
          aria-hidden
        >
          <defs>
            <linearGradient id="cf-income" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#91bb9e" stopOpacity="0.5" />
              <stop offset="1" stopColor="#91bb9e" stopOpacity="0" />
            </linearGradient>
            <linearGradient id="cf-expense" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#ffb885" stopOpacity="0.45" />
              <stop offset="1" stopColor="#ffb885" stopOpacity="0.05" />
            </linearGradient>
          </defs>

          {/* garis bantu horizontal (senada label sumbu kembar) */}
          {GRID_Y.map((y) => (
            <line
              key={y}
              x1={PAD_L}
              y1={y}
              x2={W - PAD_R}
              y2={y}
              stroke="#000000"
              strokeOpacity="0.08"
              strokeDasharray="3 4"
            />
          ))}

          {/* area isi tiap seri */}
          <path d={geo.expenseArea} fill="url(#cf-expense)" className="animate-[area-fade_0.8s_ease_0.6s_both]" />
          <path d={geo.incomeArea} fill="url(#cf-income)" className="animate-[area-fade_0.8s_ease_0.9s_both]" />

          {/* garis pengeluaran (terracotta) — digambar lebih dulu, mint di atasnya */}
          <path
            d={geo.expenseLine}
            fill="none"
            stroke="#b89191"
            strokeWidth="2"
            strokeLinecap="round"
            pathLength={1}
            strokeDasharray={1}
            className="animate-[line-draw_1.3s_ease-in-out_0.35s_both]"
          />

          {/* garis pemasukan (hijau tua, puncaknya = gajian) */}
          <path
            d={geo.incomeLine}
            fill="none"
            stroke="#45594e"
            strokeWidth="2.4"
            strokeLinecap="round"
            pathLength={1}
            strokeDasharray={1}
            className="animate-[line-draw_1.3s_ease-in-out_0.2s_both]"
          />

          {/* penanda titik: puncak pemasukan & pengeluaran tertinggi — koordinatnya
              dari seri yang sedang tampil, jadi ia pindah sendiri saat user mencatat */}
          <g className="animate-[fade-pop_0.4s_ease_1.4s_backwards]">
            <circle cx={geo.incomePeak.x} cy={geo.incomePeak.y} r="7" fill="none" stroke="#91bb9e" strokeOpacity="0.5" strokeWidth="1.5" />
            <circle cx={geo.incomePeak.x} cy={geo.incomePeak.y} r="3" fill="#45594e" />
          </g>
          <g className="animate-[fade-pop_0.4s_ease_1.55s_backwards]">
            <circle cx={geo.expensePeak.x} cy={geo.expensePeak.y} r="6" fill="none" stroke="#b89191" strokeOpacity="0.5" strokeWidth="1.5" />
            <circle cx={geo.expensePeak.x} cy={geo.expensePeak.y} r="3" fill="#b89191" />
          </g>

          {/* komet cahaya yang berjalan di garis pemasukan */}
          <path
            d={geo.incomeLine}
            fill="none"
            stroke="#91bb9e"
            strokeWidth="3.4"
            strokeLinecap="round"
            pathLength={1}
            strokeDasharray="0.055 0.945"
            className="animate-[comet-run_4.5s_linear_1.7s_infinite] [filter:drop-shadow(0_0_5px_rgba(145,187,158,0.95))]"
          />
        </svg>

        {/* satu sumbu-Y untuk DUA seri (audit "Chart Scale Paradox"): karena
            keduanya berbagi skala, labelnya cukup satu di kiri — sumbu kanan
            yang dulu kembar tidak lagi diperlukan (warna tiap garis sudah
            dibedakan legenda di atas). Angka seperti "8,5 jt" menyiratkan
            nominal, jadi saat mata privasi aktif ia disensor lewat `axisLabel()`
            — satu definisi `MASKED_AMOUNT` bersama `hide()`/`money()`. */}
        {geo.incomeTicks.map((tick, i) => (
          <span
            key={`axis-income-${GRID_Y[i]}`}
            className="pointer-events-none absolute left-0 -translate-y-1/2 text-[9px] font-medium tabular-nums text-[#45594e]"
            style={{ top: `${(GRID_Y[i] / H) * 100}%` }}
          >
            {axisLabel(tick, masked)}
          </span>
        ))}

        {/* SUMBU X — label tanggal tipis (muted) di bawah tiap titik data; label
            pekannya datang dari seri turunan, bukan daftar '1 Sep'/'8 Sep' manual */}
        {series.map((point, i) => (
          <span
            key={point.label}
            className="pointer-events-none absolute top-[86%] -translate-x-1/2 whitespace-nowrap text-[9.5px] font-medium tabular-nums text-ink/40"
            style={{ left: `${(geo.x[i] / W) * 100}%` }}
          >
            {point.label}
          </span>
        ))}
      </div>

      {/* strip insight — pola yang sama dengan kartu lain. Copy-nya dari
          `HOME_MONEY_COPY` dan angkanya dari seri di atas, jadi ia mustahil
          bilang "surplus Rp 7.748.000" sementara kartu sebelahnya lain. Tiga
          varian jujur: belum ada pemasukan · surplus · pengeluaran lebih besar
          dari pemasukan. */}
      <div className="mt-4 flex items-center justify-center gap-2 rounded-2xl bg-cream px-4 py-2.5 text-center text-xs leading-relaxed text-ink/55">
        <PiggyBank className="size-3.5 shrink-0 text-forest" strokeWidth={2.2} />
        <span>
          {totals.income <= 0 ? (
            HOME_MONEY_COPY.chartNoIncome
          ) : net >= 0 ? (
            <>
              <b className="font-semibold text-forest">
                {saveRate}% {HOME_MONEY_COPY.chartSavedLabel}
              </b>{' '}
              {HOME_MONEY_COPY.chartSavedTail}{' '}
              <b className="font-semibold text-ink">{money(net)}</b>
            </>
          ) : (
            <>
              <b className="font-semibold text-forest">
                {Math.abs(saveRate)}% {HOME_MONEY_COPY.chartSpentLabel}
              </b>{' '}
              {HOME_MONEY_COPY.chartOverspendTail}{' '}
              <b className="font-semibold text-hud-terracotta">{money(Math.abs(net))}</b>
            </>
          )}
        </span>
      </div>
        </>
      )}
    </div>
  )
})

