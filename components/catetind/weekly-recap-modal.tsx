'use client'

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from 'react'
import {
  ArrowDownLeft,
  BarChart3,
  Calendar,
  Check,
  ChevronLeft,
  ChevronRight,
  Flame,
  Lightbulb,
  PiggyBank,
  Share2,
  Sprout,
  TrendingUp,
  X,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useBodyScrollLock } from '@/hooks/use-body-scroll-lock'
import { PlantIllustration, STAGE_NAMES, type PlantStage } from './plant-illustration'
import { WEEK_DATA, WEEK_PLANT, WEEK_PERIOD, WEEK_SEGMENTS, formatIDR } from '@/lib/weekly-recap'

/* tahap tanaman di slide 3 — level 8/8 = "Berbunga" (selaras WEEK_PLANT) */
const PLANT_STAGE: PlantStage = 4

type SlideDef = {
  id: string
  /** label PENDEK untuk chip tab — 4 chip harus muat penuh di mobile tanpa terpotong */
  label: string
  /** judul panjang slide (heading di body, bukan di chip) */
  title: string
  caption: string
  icon: ReactNode
}

const SLIDES: SlideDef[] = [
  {
    id: 'overview',
    label: 'Sekilas',
    title: 'Minggu Kamu Sekilas',
    caption: 'Angka utama 7 hari terakhir',
    icon: <Calendar className="size-3.5" />,
  },
  {
    id: 'expenses',
    label: 'Pengeluaran',
    title: 'Ke Mana Uangmu Pergi',
    caption: `Total ${formatIDR(WEEK_DATA.expense)} dari ${WEEK_SEGMENTS.length} kategori`,
    icon: <BarChart3 className="size-3.5" />,
  },
  {
    id: 'plant',
    label: 'Tanaman',
    title: 'Tanaman Kamu',
    caption: 'Tumbuh karena kamu konsisten mencatat',
    icon: <Sprout className="size-3.5" />,
  },
  {
    id: 'plan',
    label: 'Rencana',
    title: 'Rencana Minggu Depan',
    caption: 'Satu langkah kecil buat minggu depan',
    icon: <TrendingUp className="size-3.5" />,
  },
]

/* kategori pengeluaran terbesar — dipakai slide 2 & 4 (tidak di-hardcode) */
const TOP_SEGMENT = [...WEEK_SEGMENTS].sort((a, b) => b.pct - a.pct)[0] ?? WEEK_SEGMENTS[0]
/* jumlah pct seluruh segmen (dipakai untuk menghitung panjang busur donut) */
const TOTAL_PCT = WEEK_SEGMENTS.reduce((a, s) => a + s.pct, 0)

/* ───────────────────────── helper kecil (dipakai semua slide) ───────────────────────── */

/** label mikro bergaya dashboard modern (mis. "EXPENSES" di referensi desain) */
function MicroLabel({
  children,
  tone = 'dark',
  className,
}: {
  children: ReactNode
  tone?: 'dark' | 'light'
  className?: string
}) {
  return (
    <p
      className={cn(
        'text-[10px] font-semibold uppercase tracking-[0.16em]',
        tone === 'light' ? 'text-cream/55' : 'text-ink/40',
        className,
      )}
    >
      {children}
    </p>
  )
}

/** badge angka kecil (persentase / delta) */
function PctBadge({
  children,
  tone = 'mint',
  className,
}: {
  children: ReactNode
  tone?: 'mint' | 'sage'
  className?: string
}) {
  return (
    <span
      className={cn(
        'inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold tabular-nums',
        tone === 'mint' && 'bg-mint/25 text-forest',
        tone === 'sage' && 'bg-sage text-forest',
        className,
      )}
    >
      {children}
    </span>
  )
}

/** true kalau viewport < lg → sheet tampil sebagai bottom sheet (swipe-down aktif) */
function useIsBottomSheet() {
  const [isBottomSheet, setIsBottomSheet] = useState(false)

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 1023px)')
    const sync = () => setIsBottomSheet(mq.matches)
    sync()
    mq.addEventListener('change', sync)
    return () => mq.removeEventListener('change', sync)
  }, [])

  return isBottomSheet
}

/**
 * Swipe-down-untuk-menutup — khusus bottom sheet mobile.
 * - ditarik ke ATAS di-resist (dragY × 0.18) supaya sheet tidak terasa "lepas"
 * - dilepas > 96px ATAU velocity > 0.5px/ms → fling keluar dulu, baru onClose()
 * - hanya aktif di < lg (di desktop sheet-nya panel kanan, bukan bottom sheet)
 */
function useSheetDrag({ enabled, onClose }: { enabled: boolean; onClose: () => void }) {
  const [dragY, setDragY] = useState(0)
  const [dragging, setDragging] = useState(false)
  const [flinging, setFlinging] = useState(false)
  const startRef = useRef<{ y: number; t: number } | null>(null)
  const lastRef = useRef({ y: 0, t: 0 })
  const dragYRef = useRef(0)

  const setY = useCallback((v: number) => {
    dragYRef.current = v
    setDragY(v)
  }, [])

  const onPointerDown = useCallback(
    (e: ReactPointerEvent<HTMLElement>) => {
      if (!enabled || flinging) return
      if (e.pointerType === 'mouse' && e.button !== 0) return
      const t = performance.now()
      startRef.current = { y: e.clientY, t }
      lastRef.current = { y: e.clientY, t }
      setDragging(true)
      setY(0)
      e.currentTarget.setPointerCapture(e.pointerId)
    },
    [enabled, flinging, setY],
  )

  const onPointerMove = useCallback(
    (e: ReactPointerEvent<HTMLElement>) => {
      const start = startRef.current
      if (!start) return
      const dy = e.clientY - start.y
      setY(dy > 0 ? dy : dy * 0.18)
      lastRef.current = { y: e.clientY, t: performance.now() }
    },
    [setY],
  )

  const finish = useCallback(() => {
    const start = startRef.current
    if (!start) return
    const dy = dragYRef.current
    const duration = Math.max(performance.now() - start.t, 1)
    const velocity = (lastRef.current.y - start.y) / duration // px/ms, positif = ke bawah
    startRef.current = null
    setDragging(false)

    if (dy > 96 || velocity > 0.5) {
      /* biarkan sheet menyelesaikan gerak turunnya dulu, baru benar-benar ditutup
         supaya tidak ada "lompatan" posisi */
      setFlinging(true)
      window.setTimeout(() => {
        onClose()
        setFlinging(false)
        setY(0)
      }, 240)
      return
    }

    setY(0)
  }, [onClose, setY])

  return {
    dragY,
    dragging,
    flinging,
    handlers: {
      onPointerDown,
      onPointerMove,
      onPointerUp: finish,
      onPointerCancel: finish,
      onLostPointerCapture: finish,
    },
  }
}

/* ─────────────────────────── Slide 1 — Minggu Kamu Sekilas ─────────────────────────── */
function SlideOverview() {
  const savingPct = Math.round((WEEK_DATA.net / WEEK_DATA.income) * 100)
  const spentPct = Math.round((WEEK_DATA.expense / WEEK_DATA.income) * 100)
  const keptPct = Math.max(100 - spentPct, 0)
  const avgPerDay = Math.round(WEEK_DATA.expense / 7)

  return (
    <div className="space-y-4">
      {/* hero — angka utama minggu ini di atas kartu forest */}
      <section className="relative overflow-hidden rounded-[1.75rem] bg-gradient-to-br from-forest-soft via-forest to-[#1f2823] p-5 text-cream ring-1 ring-inset ring-cream/10 shadow-[0_20px_44px_-26px_rgba(69,89,78,0.8)]">
        <span
          aria-hidden
          className="pointer-events-none absolute -right-14 -top-16 size-44 rounded-full bg-mint/25 blur-3xl"
        />
        <span
          aria-hidden
          className="pointer-events-none absolute inset-x-6 top-0 h-px bg-gradient-to-r from-transparent via-cream/35 to-transparent"
        />

        <div className="relative">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-mint px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-forest">
            <Calendar className="size-3" strokeWidth={2.6} />
            Minggu ini
          </span>

          <MicroLabel tone="light" className="mt-4">
            Uang bersih (net)
          </MicroLabel>
          <div className="mt-1.5 flex flex-wrap items-baseline gap-x-3 gap-y-1.5">
            <p className="animate-[fade-pop_500ms_ease-out_both] text-[2.1rem] font-semibold leading-none tracking-tight tabular-nums text-mint">
              +{formatIDR(WEEK_DATA.net)}
            </p>
            <PctBadge className="bg-mint/20 text-mint">
              <TrendingUp className="size-3.5" strokeWidth={2.8} />
              {savingPct}% disisihkan
            </PctBadge>
          </div>

          <dl className="mt-5 grid grid-cols-2 gap-3">
            <div className="rounded-2xl bg-cream/[0.07] px-3.5 py-3 ring-1 ring-inset ring-cream/10">
              <dt className="flex items-center gap-1.5 text-[11px] text-cream/60">
                <span aria-hidden className="size-2 rounded-full bg-mint" />
                Pemasukan
              </dt>
              <dd className="mt-1 text-[15px] font-semibold tabular-nums">
                {formatIDR(WEEK_DATA.income)}
              </dd>
            </div>
            <div className="rounded-2xl bg-cream/[0.07] px-3.5 py-3 ring-1 ring-inset ring-cream/10">
              <dt className="flex items-center gap-1.5 text-[11px] text-cream/60">
                <span aria-hidden className="size-2 rounded-full bg-plum" />
                Pengeluaran
              </dt>
              <dd className="mt-1 text-[15px] font-semibold tabular-nums">
                {formatIDR(WEEK_DATA.expense)}
              </dd>
            </div>
          </dl>

          {/* split pemasukan: terpakai vs disisihkan */}
          <div className="mt-4">
            <div className="flex h-2.5 overflow-hidden rounded-full bg-cream/10">
              <span className="h-full bg-plum/80" style={{ width: `${spentPct}%` }} />
              <span className="h-full bg-mint" style={{ width: `${keptPct}%` }} />
            </div>
            <p className="mt-2 text-[11px] leading-relaxed text-cream/60">
              {spentPct}% pemasukan minggu ini terpakai — {keptPct}% sisanya masih aman.
            </p>
          </div>
        </div>
      </section>

      {/* dua tile ringkas */}
      <div className="grid grid-cols-2 gap-3">
        <section className="rounded-[1.75rem] bg-cream p-4 ring-1 ring-soil/12">
          <MicroLabel>Transaksi</MicroLabel>
          <p className="mt-1.5 text-3xl font-semibold leading-none tracking-tight tabular-nums text-ink">
            {WEEK_DATA.transactions}
          </p>
          <p className="mt-1.5 text-[11px] text-ink/45">catatan minggu ini</p>
        </section>
        <section className="rounded-[1.75rem] bg-mint/20 p-4 ring-1 ring-mint/30">
          <MicroLabel>Rata-rata/hari</MicroLabel>
          <p className="mt-1.5 text-lg font-semibold leading-tight tracking-tight tabular-nums text-forest">
            {formatIDR(avgPerDay)}
          </p>
          <p className="mt-1.5 text-[11px] text-forest/55">pengeluaran harian</p>
        </section>
      </div>

      {/* saving rate */}
      <section className="rounded-[1.75rem] bg-cream p-5 ring-1 ring-soil/12">
        <div className="flex items-start justify-between gap-3">
          <div>
            <MicroLabel>Saving rate</MicroLabel>
            <p className="mt-1 text-2xl font-semibold leading-none tracking-tight tabular-nums text-ink">
              {savingPct}%
            </p>
          </div>
          <PctBadge tone="sage">
            <Check className="size-3.5" strokeWidth={3} />
            sehat
          </PctBadge>
        </div>
        <div className="mt-3 h-2 overflow-hidden rounded-full bg-ink/10">
          <div
            className="h-full rounded-full bg-gradient-to-r from-forest to-mint transition-[width] duration-700 ease-out"
            style={{ width: `${savingPct}%` }}
          />
        </div>
        <p className="mt-2.5 text-[11px] leading-relaxed text-ink/50">
          Dari {formatIDR(WEEK_DATA.income)} pemasukan, {formatIDR(WEEK_DATA.net)} nggak
          kepakai minggu ini. Pertahankan ritmenya ya 🌿
        </p>
      </section>
    </div>
  )
}

/* ──────────────────────── Slide 2 — Ke Mana Uangmu Pergi (donut) ──────────────────────── */
function SlideExpenses() {
  const R = 35
  const STROKE = 10
  const C = 2 * Math.PI * R
  const GAP = 1.6 // jarak antar segmen (satuan viewBox)
  const avgPerDay = Math.round(WEEK_DATA.expense / 7)

  let running = 0
  const rings = WEEK_SEGMENTS.map((seg) => {
    const dashLen = C * (seg.pct / TOTAL_PCT)
    const start = running
    running += dashLen
    return { ...seg, dashLen, start }
  })

  return (
    <div className="space-y-4">
      {/* kartu gelap: donut + ringkasan (ala kartu "EXPENSES" di referensi desain) */}
      <section className="relative overflow-hidden rounded-[1.75rem] bg-gradient-to-b from-[#241a1a] to-[#161010] p-5 text-cream ring-1 ring-inset ring-cream/10 shadow-[0_20px_44px_-28px_rgba(36,26,26,0.85)]">
        <span
          aria-hidden
          className="pointer-events-none absolute -left-16 top-10 size-40 rounded-full bg-mint/10 blur-3xl"
        />
        <div className="relative">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-mint px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-forest">
            <BarChart3 className="size-3" strokeWidth={2.6} />
            Pengeluaran
          </span>
          <p className="mt-2.5 text-[11px] text-cream/50">dalam 7 hari terakhir</p>

          <div className="mt-4 flex items-center gap-5">
            {/* donut — SVG hanya untuk ring; teks tengah pakai overlay HTML supaya
                TIDAK ikut ter-rotate oleh -rotate-90 (pola balance-ring.tsx) */}
            <div className="relative aspect-square w-[132px] shrink-0">
              <svg viewBox="0 0 80 80" className="h-full w-full -rotate-90" aria-hidden>
                <circle
                  cx="40"
                  cy="40"
                  r={R}
                  fill="none"
                  stroke="rgba(251,246,217,0.10)"
                  strokeWidth={STROKE}
                />
                {rings.map((seg) => (
                  <circle
                    key={seg.label}
                    cx="40"
                    cy="40"
                    r={R}
                    fill="none"
                    stroke={seg.color}
                    strokeWidth={STROKE}
                    strokeLinecap="butt"
                    strokeDasharray={`${Math.max(seg.dashLen - GAP, 0.5).toFixed(2)} ${C.toFixed(2)}`}
                    strokeDashoffset={(-(seg.start + GAP / 2)).toFixed(2)}
                  />
                ))}
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center px-2 text-center">
                <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-cream/45">
                  Total
                </span>
                <span className="mt-1 text-[15px] font-semibold leading-none tabular-nums">
                  {formatIDR(WEEK_DATA.expense)}
                </span>
              </div>
            </div>

            <dl className="min-w-0 flex-1 space-y-3">
              <div>
                <dt className="text-[11px] text-cream/50">Pos terbesar</dt>
                <dd className="mt-1 flex items-center gap-1.5 text-[13px] font-semibold">
                  <span
                    aria-hidden
                    className="size-2 shrink-0 rounded-full"
                    style={{ backgroundColor: TOP_SEGMENT.color }}
                  />
                  {TOP_SEGMENT.label}
                  <span className="font-medium text-cream/45">· {TOP_SEGMENT.pct}%</span>
                </dd>
              </div>
              <div>
                <dt className="text-[11px] text-cream/50">Rata-rata per hari</dt>
                <dd className="mt-1 text-[13px] font-semibold tabular-nums">
                  {formatIDR(avgPerDay)}
                </dd>
              </div>
            </dl>
          </div>
        </div>
      </section>

      {/* rincian per kategori — bar berwarna + nominal (ala bar chart referensi) */}
      <section className="rounded-[1.75rem] bg-cream p-5 ring-1 ring-soil/12">
        <MicroLabel>Pengeluaran per kategori</MicroLabel>
        <ul className="mt-4 space-y-4">
          {WEEK_SEGMENTS.map((seg) => (
            <li key={seg.label}>
              <div className="flex items-center justify-between gap-3 text-xs">
                <span className="flex min-w-0 items-center gap-2">
                  <span
                    aria-hidden
                    className="size-2.5 shrink-0 rounded-full"
                    style={{ backgroundColor: seg.color }}
                  />
                  <span className="truncate font-medium text-ink/70">{seg.label}</span>
                </span>
                <span className="flex shrink-0 items-center gap-2">
                  <span className="font-semibold tabular-nums text-ink">
                    {formatIDR(seg.amount)}
                  </span>
                  <span className="w-8 text-right tabular-nums text-ink/40">{seg.pct}%</span>
                </span>
              </div>
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-ink/[0.07]">
                <div
                  className="h-full rounded-full transition-[width] duration-700 ease-out"
                  style={{
                    width: `${Math.round((seg.pct / TOP_SEGMENT.pct) * 100)}%`,
                    backgroundColor: seg.color,
                  }}
                />
              </div>
            </li>
          ))}
        </ul>
      </section>

      {/* highlight pos terbesar — ikon bertint warna kategori */}
      <section className="flex items-start gap-3 rounded-[1.75rem] bg-cream p-4 ring-1 ring-soil/12">
        <span
          aria-hidden
          className="flex size-9 shrink-0 items-center justify-center rounded-full"
          style={{ backgroundColor: `${TOP_SEGMENT.color}33` }}
        >
          <Flame className="size-4" strokeWidth={2.4} style={{ color: TOP_SEGMENT.color }} />
        </span>
        <p className="text-[13px] leading-relaxed text-ink/65">
          <b className="font-semibold text-ink">{TOP_SEGMENT.label}</b> jadi pos terbesar minggu
          ini — {TOP_SEGMENT.pct}% dari total pengeluaran ({formatIDR(TOP_SEGMENT.amount)}).
          Kategori ini yang paling worth dirapikan minggu depan.
        </p>
      </section>
    </div>
  )
}

/* ─────────────────────────── Slide 3 — Tanaman Kamu (habit loop) ─────────────────────────── */
function SlidePlant() {
  const levelPct = Math.round((WEEK_PLANT.level / WEEK_PLANT.maxLevel) * 100)
  const stages: PlantStage[] = [1, 2, 3, 4]

  return (
    <div className="space-y-4">
      {/* kartu tanaman + jalur tahap Benih → Berbunga */}
      <section className="relative overflow-hidden rounded-[1.75rem] bg-gradient-to-b from-sage/70 via-cream to-cream p-5 ring-1 ring-soil/8">
        <span
          aria-hidden
          className="pointer-events-none absolute bottom-16 left-1/2 h-20 w-44 -translate-x-1/2 rounded-full bg-mint/30 blur-2xl"
        />
        <div className="relative flex flex-col items-center">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-forest px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-mint">
            <Sprout className="size-3" strokeWidth={2.6} />
            Tahap {PLANT_STAGE} · {STAGE_NAMES[PLANT_STAGE]}
          </span>
          <PlantIllustration stage={PLANT_STAGE} className="mt-3 w-36" />
        </div>

        <div className="relative mt-5">
          <div
            aria-hidden
            className="absolute left-[12.5%] right-[12.5%] top-[5px] h-0.5 bg-ink/10"
          />
          <div className="relative flex items-start justify-between">
            {stages.map((s) => {
              const reached = s <= PLANT_STAGE
              const isCurrent = s === PLANT_STAGE
              return (
                <div key={s} className="flex w-1/4 flex-col items-center gap-1.5">
                  <span
                    className={cn(
                      'size-3 rounded-full ring-4 transition-colors',
                      isCurrent
                        ? 'bg-mint ring-mint/25'
                        : reached
                          ? 'bg-forest ring-transparent'
                          : 'bg-ink/15 ring-transparent',
                    )}
                  />
                  <span
                    className={cn(
                      'text-center text-[10px] font-medium leading-tight',
                      isCurrent ? 'text-forest' : 'text-ink/40',
                    )}
                  >
                    {STAGE_NAMES[s]}
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* progres level (streak tersembunyi — yang tampil cuma level & framing positif) */}
      <section className="rounded-[1.75rem] bg-cream p-5 ring-1 ring-soil/12">
        <div className="flex items-start justify-between gap-3">
          <div>
            <MicroLabel>Level tanaman</MicroLabel>
            <p className="mt-1 text-2xl font-semibold leading-none tracking-tight tabular-nums text-ink">
              {WEEK_PLANT.level}
              <span className="text-base font-medium text-ink/35">
                /{WEEK_PLANT.maxLevel}
              </span>
            </p>
          </div>
          <PctBadge tone="mint">
            <TrendingUp className="size-3.5" strokeWidth={2.8} />
            {levelPct}%
          </PctBadge>
        </div>
        <div className="mt-3 h-2 overflow-hidden rounded-full bg-ink/10">
          <div
            className="h-full rounded-full bg-gradient-to-r from-forest to-mint transition-[width] duration-700 ease-out"
            style={{ width: `${levelPct}%` }}
          />
        </div>
        <p className="mt-2.5 text-[11px] leading-relaxed text-ink/50">
          Level ini cerminan kebiasaan catat harianmu — bukan angka yang harus dikejar.
        </p>
      </section>

      {/* dua mini-card berwarna: kenaikan level & bonus HP */}
      <div className="grid grid-cols-2 gap-3">
        <section className="rounded-[1.75rem] bg-mint/20 p-4 ring-1 ring-mint/30">
          <MicroLabel>Minggu ini</MicroLabel>
          <p className="mt-1.5 text-3xl font-semibold leading-none tracking-tight tabular-nums text-forest">
            +{WEEK_PLANT.levelUpThisWeek}
          </p>
          <p className="mt-1.5 text-[11px] text-forest/60">level naik 🌱</p>
        </section>
        <section className="rounded-[1.75rem] bg-cream p-4 ring-1 ring-soil/12">
          <MicroLabel>Bonus HP</MicroLabel>
          <p className="mt-1.5 text-3xl font-semibold leading-none tracking-tight tabular-nums text-ink">
            +{WEEK_PLANT.hpGain}
          </p>
          <p className="mt-1.5 text-[11px] text-ink/45">karena review mingguan</p>
        </section>
      </div>
    </div>
  )
}

/* ──────────────────────── Slide 4 — Rencana Minggu Depan (action) ──────────────────────── */
function SlidePlan() {
  const savingPerWeek = Math.round(WEEK_DATA.expense * 0.1) // 10% dari pengeluaran
  const dailyCut = Math.round(savingPerWeek / 7 / 100) * 100 // dibulatkan ke ratusan rupiah
  const nextWeekExpense = WEEK_DATA.expense - savingPerWeek
  const savedPct = Math.round((savingPerWeek / WEEK_DATA.expense) * 100)

  /* perbandingan pengeluaran: minggu ini vs rencana minggu depan */
  const bars = [
    {
      id: 'now',
      label: 'Minggu ini',
      value: WEEK_DATA.expense,
      bar: 'from-plum/35 to-plum/45',
    },
    {
      id: 'next',
      label: 'Minggu depan',
      value: nextWeekExpense,
      bar: 'from-mint to-forest',
    },
  ]

  /* tiga langkah kecil yang bisa langsung dikerjakan */
  const steps = [
    {
      icon: Flame,
      text: `Kurangi ${TOP_SEGMENT.label} sekitar ${savedPct}%`,
      badge: `${savedPct}%`,
    },
    {
      icon: PiggyBank,
      text: 'Setor ke tabungan di awal minggu',
      badge: formatIDR(savingPerWeek),
    },
    {
      icon: Sprout,
      text: 'Catat transaksi tiap hari biar tanaman tumbuh',
      badge: '7 hari',
    },
  ]

  return (
    <div className="space-y-4">
      {/* insight utama minggu depan */}
      <section className="flex items-start gap-3 rounded-[1.75rem] bg-sage/60 p-4 ring-1 ring-soil/12">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-cream text-forest">
          <Lightbulb className="size-4" strokeWidth={2.2} />
        </span>
        <p className="text-[13px] leading-relaxed text-ink/70">
          Minggu depan coba kurangi kategori{' '}
          <b className="font-semibold text-forest">{TOP_SEGMENT.label}</b> sebesar {savedPct}%?
          Kamu masih punya cukup ruang buat tabungan.
        </p>
      </section>

      {/* bar perbandingan — nominal di atas bar, tumbuh dari bawah (keyframe bar-grow) */}
      <section className="rounded-[1.75rem] bg-cream p-5 ring-1 ring-soil/12">
        <div className="flex items-start justify-between gap-3">
          <MicroLabel className="pt-1">Pengeluaran: sekarang vs rencana</MicroLabel>
          <PctBadge tone="mint">
            <ArrowDownLeft className="size-3.5" strokeWidth={2.8} />
            {savedPct}%
          </PctBadge>
        </div>

        <div className="mt-5 flex h-36 items-end justify-center gap-6">
          {bars.map((b, i) => (
            <div key={b.id} className="flex w-24 flex-col items-center gap-2">
              <span className="whitespace-nowrap text-[11px] font-semibold tabular-nums text-ink/70">
                {formatIDR(b.value)}
              </span>
              <span
                className={cn(
                  'w-14 origin-bottom animate-[bar-grow_700ms_ease-out_both] rounded-xl bg-gradient-to-t',
                  b.bar,
                )}
                style={{
                  height: `${Math.max(Math.round((b.value / WEEK_DATA.expense) * 104), 16)}px`,
                  animationDelay: `${i * 90}ms`,
                }}
              />
              <span className="text-[10px] font-medium text-ink/45">{b.label}</span>
            </div>
          ))}
        </div>
      </section>

      {/* target tabungan minggu depan */}
      <section className="relative overflow-hidden rounded-[1.75rem] bg-mint/20 p-5 ring-1 ring-mint/30">
        <span
          aria-hidden
          className="pointer-events-none absolute -right-10 -top-12 size-32 rounded-full bg-mint/40 blur-2xl"
        />
        <div className="relative">
          <div className="flex items-start justify-between gap-3">
            <MicroLabel>Target tabungan minggu depan</MicroLabel>
            <PctBadge tone="sage">
              <PiggyBank className="size-3.5" strokeWidth={2.4} />
              10% lebih hemat
            </PctBadge>
          </div>
          <p className="mt-2 text-[1.75rem] font-semibold leading-none tracking-tight tabular-nums text-forest">
            {formatIDR(savingPerWeek)}
          </p>
          <p className="mt-2 text-[11px] leading-relaxed text-forest/60">
            Setara {formatIDR(dailyCut)}/hari — kamu masih punya ruang buat ini.
          </p>
        </div>
      </section>

      {/* tiga langkah kecil */}
      <section className="rounded-[1.75rem] bg-cream p-5 ring-1 ring-soil/12">
        <MicroLabel>Langkah kecil minggu depan</MicroLabel>
        <ul className="mt-4 space-y-3.5">
          {steps.map(({ icon: Icon, text, badge }) => (
            <li key={text} className="flex items-center gap-3">
              <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-sage text-forest">
                <Icon className="size-4" strokeWidth={2.2} />
              </span>
              <span className="min-w-0 flex-1 text-[13px] leading-snug text-ink/70">{text}</span>
              <PctBadge tone="sage" className="shrink-0">
                {badge}
              </PctBadge>
            </li>
          ))}
        </ul>
      </section>

      {/* aksi */}
      <div className="space-y-3 pt-1">
        <button
          type="button"
          className="flex w-full items-center justify-center gap-2 rounded-full bg-forest py-3 text-sm font-semibold text-cream transition-colors hover:bg-forest-soft active:scale-[0.98]"
        >
          <PiggyBank className="size-4" strokeWidth={2.2} />
          Set target minggu depan
        </button>

        <button
          type="button"
          className="flex w-full items-center justify-center gap-2 rounded-full bg-cream py-3 text-sm font-medium text-ink/60 ring-1 ring-soil/12 transition-colors hover:bg-sage/40 hover:text-ink active:scale-[0.98]"
        >
          <TrendingUp className="size-4" strokeWidth={2.2} />
          Lihat rencana tabungan cerdas
        </button>
      </div>

      <p className="text-center text-[11px] leading-relaxed text-ink/40">
        💡 Kurangi pengeluaran harian sekecil {formatIDR(dailyCut)}, tabung{' '}
        {formatIDR(savingPerWeek)}/minggu
      </p>
    </div>
  )
}

/* ───────────────────── Shell sheet — pola sama dengan OverviewPanel ───────────────────── */

/**
 * Popup "Rekap Mingguan" (inventaris modal g, Domain 3A Habit Loop 2).
 * Shell meniru OverviewPanel ("Your Balance Overview"):
 * mobile = bottom sheet menempel bawah (+ swipe-down untuk menutup),
 * desktop = panel kanan 440px.
 */
export function WeeklyRecapModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [slide, setSlide] = useState(0)

  useBodyScrollLock(open, true)

  useEffect(() => {
    if (open) setSlide(0)
  }, [open])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
      if (e.key === 'ArrowLeft') setSlide((s) => Math.max(0, s - 1))
      if (e.key === 'ArrowRight') setSlide((s) => Math.min(SLIDES.length - 1, s + 1))
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  const slides: Record<string, ReactNode> = {
    overview: <SlideOverview />,
    expenses: <SlideExpenses />,
    plant: <SlidePlant />,
    plan: <SlidePlan />,
  }

  return (
    <WeekRecapSheet
      open={open}
      onClose={onClose}
      slide={slide}
      setSlide={setSlide}
      slides={slides}
    />
  )
}

function WeekRecapSheet({
  open,
  onClose,
  slide,
  setSlide,
  slides,
}: {
  open: boolean
  onClose: () => void
  slide: number
  setSlide: (n: number) => void
  slides: Record<string, ReactNode>
}) {
  const closeRef = useRef<HTMLButtonElement>(null)
  const bodyRef = useRef<HTMLDivElement>(null)
  const tabsRef = useRef<(HTMLButtonElement | null)[]>([])
  const [entered, setEntered] = useState(false)
  const isBottomSheet = useIsBottomSheet()
  const { dragY, dragging, flinging, handlers } = useSheetDrag({
    enabled: isBottomSheet,
    onClose,
  })

  const prevDisabled = slide === 0
  const nextDisabled = slide === SLIDES.length - 1
  const current = SLIDES[slide] ?? SLIDES[0]

  /* fokus pindah ke tombol tutup begitu popup terbuka (pola OverviewPanel) */
  useEffect(() => {
    if (open) closeRef.current?.focus()
  }, [open])

  /* konten slide masuk dengan transisi halus */
  useEffect(() => {
    if (!open) {
      setEntered(false)
      return
    }
    setEntered(false)
    const raf = requestAnimationFrame(() => setEntered(true))
    return () => cancelAnimationFrame(raf)
  }, [open, slide])

  /* reset posisi scroll + jaga chip aktif tetap terlihat saat slide berganti */
  useEffect(() => {
    if (!open) return
    bodyRef.current?.scrollTo({ top: 0 })
    tabsRef.current[slide]?.scrollIntoView({ block: 'nearest', inline: 'nearest' })
  }, [open, slide])

  /* transform sheet ditulis inline hanya saat drag/fling — kalau tidak,
     biarkan class transition yang mengatur (buka & tutup normal) */
  const sheetStyle: CSSProperties = flinging
    ? { transform: 'translateY(100%)', transition: 'transform 240ms cubic-bezier(0.4,0,1,1)' }
    : dragging
      ? { transform: `translateY(${dragY}px)`, transition: 'none' }
      : {}

  return (
    <div
      className={cn('fixed inset-0 z-[70]', !open && 'pointer-events-none')}
      inert={!open}
      aria-hidden={!open}
    >
      {/* backdrop — ikut meredup saat sheet ditarik ke bawah */}
      <button
        type="button"
        aria-label="Tutup rekap mingguan"
        tabIndex={open ? 0 : -1}
        onClick={onClose}
        className={cn(
          'absolute inset-0 bg-ink/50',
          !dragging && 'transition-opacity duration-500 ease-out',
        )}
        style={{ opacity: open ? Math.max(1 - dragY / 300, 0.35) : 0 }}
      />

      {/* sheet: bottom sheet di mobile, panel kanan 440px di desktop */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Rekap mingguan"
        style={sheetStyle}
        className={cn(
          'absolute inset-x-0 bottom-0 top-8 flex flex-col rounded-t-[2.25rem] bg-cream px-5 pb-6 shadow-[0_-24px_60px_-24px_rgba(69,89,78,0.55)] ring-1 ring-soil/12 transition-[transform,opacity] duration-[650ms] ease-[cubic-bezier(0.22,1,0.36,1)] will-change-transform lg:inset-x-auto lg:inset-y-3 lg:right-3 lg:w-[440px] lg:rounded-[2rem] lg:shadow-[-24px_0_60px_-24px_rgba(69,89,78,0.55)]',
          open
            ? 'translate-y-0 opacity-100 lg:translate-x-0'
            : 'translate-y-full opacity-0 lg:translate-y-0 lg:translate-x-[calc(100%+12px)]',
        )}
      >
        {/* zona drag (mobile): handle + hint swipe-down */}
        <div
          {...handlers}
          style={{ touchAction: 'none' }}
          className="shrink-0 select-none pb-1 pt-3 lg:hidden"
        >
          <div className="mx-auto h-1.5 w-10 rounded-full bg-ink/15" aria-hidden />
          <p className="mt-1.5 text-center text-[10px] font-medium text-ink/30">
            Geser ke bawah untuk menutup
          </p>
        </div>
        {/* handle statis di desktop (panel kanan — tanpa swipe) */}
        <div
          className="mx-auto mt-3 hidden h-1.5 w-10 shrink-0 rounded-full bg-ink/15 lg:block"
          aria-hidden
        />

        {/* header */}
        <div className="mt-3 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="text-2xl font-semibold leading-tight tracking-tight text-ink">
              Rekap Mingguan
            </h2>
            {/* meta sebagai chip — bukan tiga baris teks bertingkat */}
            <div className="mt-2 flex flex-wrap items-center gap-1.5">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-cream px-2.5 py-1 text-[11px] font-medium text-ink/60 ring-1 ring-soil/12">
                <Calendar className="size-3.5 text-forest/55" strokeWidth={2.2} />
                {WEEK_PERIOD}
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-cream px-2.5 py-1 text-[11px] font-medium text-ink/60 ring-1 ring-soil/12">
                <BarChart3 className="size-3.5 text-forest/55" strokeWidth={2.2} />
                {WEEK_DATA.transactions} transaksi tercatat
              </span>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <button
              type="button"
              aria-label="Bagikan rekap"
              className="flex size-9 items-center justify-center rounded-full bg-cream text-ink ring-1 ring-soil/12 transition-colors hover:bg-sage"
            >
              <Share2 className="size-4" strokeWidth={2.2} />
            </button>
            <button
              ref={closeRef}
              type="button"
              onClick={onClose}
              aria-label="Tutup"
              className="flex size-9 items-center justify-center rounded-full bg-cream text-ink ring-1 ring-soil/12 transition-colors hover:bg-sage"
            >
              <X className="size-4" strokeWidth={2.2} />
            </button>
          </div>
        </div>

        {/* tab slide — label pendek, 4 chip muat sepenuhnya (tidak terpotong) */}
        <div
          role="tablist"
          aria-label="Bagian rekap mingguan"
          className="-mx-5 mt-4 flex shrink-0 gap-1.5 overflow-x-auto px-5 pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          data-lenis-prevent-horizontal
        >
          {SLIDES.map((s, i) => {
            const active = i === slide
            return (
              <button
                key={s.id}
                ref={(el) => {
                  tabsRef.current[i] = el
                }}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setSlide(i)}
                className={cn(
                  'flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full px-3.5 py-2 text-xs font-medium transition-colors duration-200',
                  active
                    ? 'bg-forest font-semibold text-mint'
                    : 'bg-cream text-ink/45 ring-1 ring-soil/12 hover:text-ink',
                )}
              >
                {s.icon}
                {s.label}
              </button>
            )
          })}
        </div>

        {/* progress slide — di alur normal (bukan absolute) supaya tidak menimpa tab;
            segmen slide aktif lebih panjang sebagai penanda posisi */}
        <div className="mt-2.5 flex shrink-0 gap-1" aria-hidden>
          {SLIDES.map((s, i) => (
            <span
              key={s.id}
              className={cn(
                'h-1 rounded-full transition-all duration-300',
                i === slide ? 'flex-[1.6]' : 'flex-1',
                i <= slide ? 'bg-mint' : 'bg-ink/10',
              )}
            />
          ))}
        </div>

        {/* body — hanya area ini yang scroll, header/tab/footer tetap diam */}
        <div
          ref={bodyRef}
          data-lenis-prevent
          className="mt-4 flex-1 overflow-y-auto overscroll-contain pr-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          <div
            key={current.id}
            className={cn(
              'pb-2 transition-all duration-700 ease-[cubic-bezier(0.22,1,0.36,1)]',
              entered ? 'translate-y-0 opacity-100' : 'translate-y-6 opacity-0',
            )}
          >
            {/* judul slide — menggantikan label panjang di chip tab */}
            <header className="mb-4">
              <h3 className="text-lg font-semibold tracking-tight text-ink">{current.title}</h3>
              <p className="mt-0.5 text-[11px] text-ink/45">{current.caption}</p>
            </header>

            {slides[current.id]}
          </div>
        </div>

        {/* footer — bukan sticky, tidak pakai backdrop-blur */}
        <div className="mt-3 flex shrink-0 items-center gap-3 border-t border-soil/12 pt-3 pb-[env(safe-area-inset-bottom)]">
          <button
            type="button"
            aria-label="Slide sebelumnya"
            disabled={prevDisabled}
            onClick={() => !prevDisabled && setSlide(slide - 1)}
            className={cn(
              'flex size-10 shrink-0 items-center justify-center rounded-full bg-cream text-ink ring-1 ring-soil/12 transition-colors hover:bg-sage',
              prevDisabled && 'opacity-30',
            )}
          >
            <ChevronLeft className="size-5" strokeWidth={2.4} />
          </button>

          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-full bg-mint py-3 text-sm font-semibold text-forest transition-colors hover:bg-mint/85 active:scale-[0.98]"
          >
            Selesai
          </button>

          <button
            type="button"
            aria-label="Slide berikutnya"
            disabled={nextDisabled}
            onClick={() => !nextDisabled && setSlide(slide + 1)}
            className={cn(
              'flex size-10 shrink-0 items-center justify-center rounded-full bg-cream text-ink ring-1 ring-soil/12 transition-colors hover:bg-sage',
              nextDisabled && 'opacity-30',
            )}
          >
            <ChevronRight className="size-5" strokeWidth={2.4} />
          </button>
        </div>
      </div>
    </div>
  )
}

