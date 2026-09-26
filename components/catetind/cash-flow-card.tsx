'use client'

import { memo } from 'react'
import { ArrowDownLeft, ArrowUpRight, PiggyBank, Waves } from 'lucide-react'
import { usePrivacy } from './privacy-provider'

/* data bulan ini — selaras dengan ringkasan di kartu Transaksi Terakhir */
const INCOME = 8_500_000
const EXPENSE = 752_000

type Point = { label: string; income: number; expense: number }

/* 5 titik = 5 pekan dalam sebulan. Jumlah `expense` = EXPENSE dan puncak
   `income` = INCOME, jadi kartu ini betul-betul membandingkan DUA metrik
   cashflow. (Sebelumnya hanya ada SATU garis lintasan padahal judulnya
   "Pemasukan vs Pengeluaran" — secara analitik itu grafik saldo harian /
   net balance, bukan perbandingan. Lihat audit #2.) */
const SERIES: Point[] = [
  { label: '1 Sep', income: 0, expense: 168_000 },
  { label: '8 Sep', income: 8_500_000, expense: 214_000 },
  { label: '15 Sep', income: 0, expense: 186_000 },
  { label: '22 Sep', income: 0, expense: 96_000 },
  { label: '29 Sep', income: 0, expense: 88_000 },
]

/* ── geometri kanvas grafik (viewBox 0 0 320 132) ─────────────────────────── */
const W = 320
const H = 132
const PAD_L = 30 // ruang label sumbu-Y kiri
const PAD_R = 8
const TOP = 10
const BASE = 100
const GRID_Y = [TOP, (TOP + BASE) / 2, BASE]

/* SUMBU KEMBAR: skala pemasukan & pengeluaran beda jauh (Rp 8,5 jt vs Rp 752 rb),
   jadi tiap seri punya sumbu-Y sendiri — kiri (pemasukan), kanan (pengeluaran).
   Tanpa ini garis pengeluaran cuma jadi garis rata di dasar chart sehingga
   perbandingannya tidak terbaca. */
const INCOME_MAX = 8_500_000
const EXPENSE_MAX = 250_000
const INCOME_AXIS = ['8,5 jt', '4,25 jt', '0']
const EXPENSE_AXIS = ['250 rb', '125 rb', '0']

const X = SERIES.map((_, i) => PAD_L + (i * (W - PAD_L - PAD_R)) / (SERIES.length - 1))
const incomeY = (v: number) => BASE - (v / INCOME_MAX) * (BASE - TOP)
const expenseY = (v: number) => BASE - (v / EXPENSE_MAX) * (BASE - TOP)

const INCOME_PTS = SERIES.map((d, i) => ({ x: X[i], y: incomeY(d.income) }))
const EXPENSE_PTS = SERIES.map((d, i) => ({ x: X[i], y: expenseY(d.expense) }))

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

const INCOME_LINE = smoothPath(INCOME_PTS)
const EXPENSE_LINE = smoothPath(EXPENSE_PTS)
const INCOME_AREA = `${INCOME_LINE} L ${X[X.length - 1]} ${BASE} L ${X[0]} ${BASE} Z`
const EXPENSE_AREA = `${EXPENSE_LINE} L ${X[X.length - 1]} ${BASE} L ${X[0]} ${BASE} Z`

/* titik puncak pemasukan (gajian) & pengeluaran tertinggi — penanda baca */
const INCOME_PEAK = INCOME_PTS.reduce((a, b) => (b.y < a.y ? b : a))
const EXPENSE_PEAK = EXPENSE_PTS.reduce((a, b) => (b.y < a.y ? b : a))

/** Dibungkus `memo` — kartu ini tidak menerima props, jadi tidak perlu ikut
 *  re-render saat HomeScreen mengubah state popup. Nominal di sini ikut
 *  Global Eye lewat context privasi. */
export const CashFlowCard = memo(function CashFlowCard() {
  const { money } = usePrivacy()
  const net = INCOME - EXPENSE
  const saveRate = Math.round((net / INCOME) * 100)
  const expenseShare = ((EXPENSE / INCOME) * 100).toFixed(1).replace('.', ',')

  return (
    <div className="flex h-full flex-col rounded-[2rem] bg-cream p-6 ring-1 ring-soil/12">
      {/* header — konsisten dengan kartu lain */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <span className="flex size-8 items-center justify-center rounded-full bg-sage text-forest">
            <Waves className="size-4" strokeWidth={2.4} />
          </span>
          <div>
            <p className="text-sm font-semibold text-ink">Arus Uang</p>
            <p className="text-xs text-ink/45">Pemasukan vs pengeluaran, per pekan</p>
          </div>
        </div>
        <span className="rounded-full bg-forest px-2.5 py-1 text-[11px] font-semibold text-mint tabular-nums">
          Surplus {saveRate}%
        </span>
      </div>

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
            {money(INCOME)}
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
            {money(EXPENSE)}
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
        <span className="ml-auto text-ink/35">per pekan · Sep</span>
      </div>

      {/* ── grafik: dua spline + sumbu Y kembar + SUMBU X (tanggal) ──────────
          Sumbu X dulu hilang total, jadi user bisa lihat ada "gunung" merah
          tapi tidak tahu itu terjadi tanggal berapa. Label hari/tanggal tipis
          sekarang ditempel persis di bawah tiap titik data. */}
      <div
        className="relative mt-3 h-[116px] w-full"
        role="img"
        aria-label={`Grafik arus uang per pekan: pemasukan ${money(INCOME)}, pengeluaran ${money(EXPENSE)}`}
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
          <path d={EXPENSE_AREA} fill="url(#cf-expense)" className="animate-[area-fade_0.8s_ease_0.6s_both]" />
          <path d={INCOME_AREA} fill="url(#cf-income)" className="animate-[area-fade_0.8s_ease_0.9s_both]" />

          {/* garis pengeluaran (terracotta) — digambar lebih dulu, mint di atasnya */}
          <path
            d={EXPENSE_LINE}
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
            d={INCOME_LINE}
            fill="none"
            stroke="#45594e"
            strokeWidth="2.4"
            strokeLinecap="round"
            pathLength={1}
            strokeDasharray={1}
            className="animate-[line-draw_1.3s_ease-in-out_0.2s_both]"
          />

          {/* penanda titik: puncak pemasukan & pengeluaran tertinggi */}
          <g className="animate-[fade-pop_0.4s_ease_1.4s_backwards]">
            <circle cx={INCOME_PEAK.x} cy={INCOME_PEAK.y} r="7" fill="none" stroke="#91bb9e" strokeOpacity="0.5" strokeWidth="1.5" />
            <circle cx={INCOME_PEAK.x} cy={INCOME_PEAK.y} r="3" fill="#45594e" />
          </g>
          <g className="animate-[fade-pop_0.4s_ease_1.55s_backwards]">
            <circle cx={EXPENSE_PEAK.x} cy={EXPENSE_PEAK.y} r="6" fill="none" stroke="#b89191" strokeOpacity="0.5" strokeWidth="1.5" />
            <circle cx={EXPENSE_PEAK.x} cy={EXPENSE_PEAK.y} r="3" fill="#b89191" />
          </g>

          {/* komet cahaya yang berjalan di garis pemasukan */}
          <path
            d={INCOME_LINE}
            fill="none"
            stroke="#91bb9e"
            strokeWidth="3.4"
            strokeLinecap="round"
            pathLength={1}
            strokeDasharray="0.055 0.945"
            className="animate-[comet-run_4.5s_linear_1.7s_infinite] [filter:drop-shadow(0_0_5px_rgba(145,187,158,0.95))]"
          />
        </svg>

        {/* label sumbu-Y KIRI (skala pemasukan) */}
        {GRID_Y.map((y, i) => (
          <span
            key={`axis-income-${y}`}
            className="pointer-events-none absolute left-0 -translate-y-1/2 text-[9px] font-medium tabular-nums text-[#45594e]"
            style={{ top: `${(y / H) * 100}%` }}
          >
            {INCOME_AXIS[i]}
          </span>
        ))}

        {/* label sumbu-Y KANAN (skala pengeluaran) */}
        {GRID_Y.map((y, i) => (
          <span
            key={`axis-expense-${y}`}
            className="pointer-events-none absolute right-0 -translate-y-1/2 text-[9px] font-medium tabular-nums text-hud-terracotta/80"
            style={{ top: `${(y / H) * 100}%` }}
          >
            {EXPENSE_AXIS[i]}
          </span>
        ))}

        {/* SUMBU X — label tanggal tipis (muted) di bawah tiap titik data */}
        {SERIES.map((d, i) => (
          <span
            key={d.label}
            className="pointer-events-none absolute top-[86%] -translate-x-1/2 whitespace-nowrap text-[9.5px] font-medium tabular-nums text-ink/40"
            style={{ left: `${(X[i] / W) * 100}%` }}
          >
            {d.label}
          </span>
        ))}
      </div>

      {/* strip insight — pola yang sama dengan kartu lain */}
      <div className="mt-4 flex items-center justify-center gap-2 rounded-2xl bg-cream px-4 py-2.5 text-center text-xs leading-relaxed text-ink/55">
        <PiggyBank className="size-3.5 shrink-0 text-forest" strokeWidth={2.2} />
        <span>
          <b className="font-semibold text-forest">{saveRate}% pemasukan</b> berhasil
          disimpan — surplus <b className="font-semibold text-ink">{money(net)}</b>
        </span>
      </div>
    </div>
  )
})

