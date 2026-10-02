'use client'

import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import Link from 'next/link'
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
/* gestur panel penuh (swipe-down mobile + deteksi bottom sheet) kini SATU sumber
   di `hooks/use-sheet-drag.ts` — dipakai bersama Monthly Review (inventaris #i) */
import { useIsBottomSheet, useSheetDrag } from '@/hooks/use-sheet-drag'
import { PlantIllustration, STAGE_NAMES } from './plant-illustration'
import { ShareProgressPanel } from './share-progress-panel'
import { usePrivacy } from './privacy-provider'
import {
  WEEKLY_RECAP_COPY,
  WEEKLY_RECAP_CTA_COPY,
  WEEKLY_RECAP_DAYS,
  formatIDR,
  type WeeklyRecap,
} from '@/lib/weekly-recap'
import { useWeeklyRecap } from '@/lib/use-weekly-recap'
import { ACTIVE_SHARE_CARD_ID, getShareCard } from '@/lib/data/share'
import { maskMoney } from '@/lib/data/history'

/* Seluruh angka slide (termasuk tahap tanaman) kini datang dari `WeeklyRecap`
   yang diturunkan `useWeeklyRecap()` — tidak ada lagi `WEEK_DATA`, `WEEK_PLANT`,
   `WEEK_SEGMENTS`, `PLANT_STAGE`, `TOP_SEGMENT`, atau `TOTAL_PCT` di tingkat
   modul. Itu justru akar masalahnya: konstanta modul TIDAK BISA membaca ledger
   user, jadi rekap selalu menampilkan angka contoh. */

/**
 * Kartu publik yang dibagikan dari rekap (PRD 6614–6615: tombol Share di recap).
 * Kartunya diambil sekali di tingkat modul: isinya implisit tetap, jadi tidak
 * perlu dihitung ulang setiap render sheet.
 */
const SHARE_CARD = getShareCard(ACTIVE_SHARE_CARD_ID)

type SlideDef = {
  id: string
  /** label PENDEK untuk chip tab — 4 chip harus muat penuh di mobile tanpa terpotong */
  label: string
  /** judul panjang slide (heading di body, bukan di chip) */
  title: string
  /**
   * caption = FUNGSI, bukan string beku.
   *
   * `SLIDES` hidup di tingkat modul, jadi ia tidak bisa membaca tombol mata
   * global MAUPUN ledger kalau isinya dibekukan sebagai string — caption slide
   * "Pengeluaran" memuat nominal, dan dulu justru itu yang bocor. Dengan bentuk
   * fungsi `(masked, recap)`, caption dihitung saat render dari rekap NYATA
   * (`current.caption(masked, recap)`) sehingga ikut tersensor tanpa
   * memindahkan angka recap ke JSX.
   */
  caption: (masked: boolean, recap: WeeklyRecap) => string
  icon: ReactNode
}

const SLIDES: SlideDef[] = [
  {
    id: 'overview',
    label: 'Sekilas',
    title: 'Minggu Kamu Sekilas',
    caption: () => 'Angka utama 7 hari terakhir',
    icon: <Calendar className="size-3.5" />,
  },
  {
    id: 'expenses',
    label: 'Pengeluaran',
    title: 'Ke Mana Uangmu Pergi',
    caption: (masked, recap) =>
      `Total ${maskMoney(recap.expense, masked)} dari ${recap.segments.length} kategori`,
    icon: <BarChart3 className="size-3.5" />,
  },
  {
    id: 'plant',
    label: 'Tanaman',
    title: 'Tanaman Kamu',
    caption: () => 'Tumbuh karena kamu konsisten mencatat',
    icon: <Sprout className="size-3.5" />,
  },
  {
    id: 'plan',
    label: 'Rencana',
    title: 'Rencana Minggu Depan',
    caption: () => 'Satu langkah kecil buat minggu depan',
    icon: <TrendingUp className="size-3.5" />,
  },
]

/* kategori pengeluaran terbesar & total pct TIDAK LAGI konstanta modul: keduanya
   turunan per-render dari `recap.segments` (ledger user), bukan daftar contoh. */

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

/* ─────────────────────────── Slide 1 — Minggu Kamu Sekilas ─────────────────────────── */
function SlideOverview({ recap }: { recap: WeeklyRecap }) {
  /* nominal ikut tombol mata global: `money()` = formatIDR + sensor satu langkah,
     `hide()` untuk label yang sudah berbentuk string (tanda + / − dipertahankan) */
  const { money, hide } = usePrivacy()
  /* SEMUA angka di bawah datang dari rekap NYATA (`recap`) — nol nominal keras */
  const { income, expense, net, avgPerDay, spentPct, keptPct, savingPct } = recap
  const hasIncome = income > 0
  const netSign = net < 0 ? '-' : '+'
  const spentBarPct = Math.min(spentPct, 100)
  const savedAmount = Math.max(net, 0)

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
              {hide(`${netSign}${formatIDR(Math.abs(net))}`)}
            </p>
            <PctBadge className="bg-mint/20 text-mint">
              <TrendingUp className="size-3.5" strokeWidth={2.8} />
              {keptPct}% disisihkan
            </PctBadge>
          </div>

          <dl className="mt-5 grid grid-cols-2 gap-3">
            <div className="rounded-2xl bg-cream/[0.07] px-3.5 py-3 ring-1 ring-inset ring-cream/10">
              <dt className="flex items-center gap-1.5 text-[11px] text-cream/60">
                <span aria-hidden className="size-2 rounded-full bg-mint" />
                Pemasukan
              </dt>
              <dd className="mt-1 text-[15px] font-semibold tabular-nums">
                {money(income)}
              </dd>
            </div>
            <div className="rounded-2xl bg-cream/[0.07] px-3.5 py-3 ring-1 ring-inset ring-cream/10">
              <dt className="flex items-center gap-1.5 text-[11px] text-cream/60">
                <span aria-hidden className="size-2 rounded-full bg-plum" />
                Pengeluaran
              </dt>
              <dd className="mt-1 text-[15px] font-semibold tabular-nums">
                {money(expense)}
              </dd>
            </div>
          </dl>

          {/* split pemasukan: terpakai vs disisihkan. Tanpa pemasukan bar ini
              tidak bisa dihitung (0/0) — jadi DIGANTI kalimat jujur, bukan
              digambar "0% terpakai / 100% aman" yang menyesatkan. */}
          <div className="mt-4">
            {hasIncome ? (
              <>
                <div className="flex h-2.5 overflow-hidden rounded-full bg-cream/10">
                  <span className="h-full bg-plum/80" style={{ width: `${spentBarPct}%` }} />
                  <span className="h-full bg-mint" style={{ width: `${keptPct}%` }} />
                </div>
                <p className="mt-2 text-[11px] leading-relaxed text-cream/60">
                  {spentPct}% pemasukan minggu ini terpakai — {keptPct}% sisanya masih aman.
                </p>
              </>
            ) : (
              <p className="text-[11px] leading-relaxed text-cream/60">
                {WEEKLY_RECAP_COPY.noIncome}
              </p>
            )}
          </div>
        </div>
      </section>

      {/* dua tile ringkas */}
      <div className="grid grid-cols-2 gap-3">
        <section className="rounded-[1.75rem] bg-cream p-4 ring-1 ring-soil/12">
          <MicroLabel>Transaksi</MicroLabel>
          <p className="mt-1.5 text-3xl font-semibold leading-none tracking-tight tabular-nums text-ink">
            {recap.transactions}
          </p>
          <p className="mt-1.5 text-[11px] text-ink/45">catatan minggu ini</p>
        </section>
        <section className="rounded-[1.75rem] bg-mint/20 p-4 ring-1 ring-mint/30">
          <MicroLabel>Rata-rata/hari</MicroLabel>
          <p className="mt-1.5 text-lg font-semibold leading-tight tracking-tight tabular-nums text-forest">
            {money(avgPerDay)}
          </p>
          <p className="mt-1.5 text-[11px] text-forest/55">pengeluaran harian</p>
        </section>
      </div>

      {/* saving rate — angka & badge JUJUR: saat pengeluaran melebihi pemasukan,
          saving ratenya negatif dan badge TIDAK bilang "sehat" */}
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
            {savingPct >= 0 ? WEEKLY_RECAP_COPY.savingHealthy : WEEKLY_RECAP_COPY.savingNegative}
          </PctBadge>
        </div>
        <div className="mt-3 h-2 overflow-hidden rounded-full bg-ink/10">
          <div
            className="h-full rounded-full bg-gradient-to-r from-forest to-mint transition-[width] duration-700 ease-out"
            style={{ width: `${Math.max(savingPct, 0)}%` }}
          />
        </div>
        <p className="mt-2.5 text-[11px] leading-relaxed text-ink/50">
          {savingPct >= 0 ? (
            <>
              Dari {money(income)} pemasukan, {money(savedAmount)} nggak kepakai
              minggu ini. Pertahankan ritmenya ya 🌿
            </>
          ) : (
            <>Pengeluaran minggu ini {money(Math.abs(net))} lebih besar dari pemasukan.</>
          )}
        </p>
      </section>
    </div>
  )
}

/* ──────────────────────── Slide 2 — Ke Mana Uangmu Pergi (donut) ──────────────────────── */
function SlideExpenses({ recap }: { recap: WeeklyRecap }) {
  /* semua nominal slide ini (donut, rata-rata, per kategori, highlight) lewat `money()` */
  const { money } = usePrivacy()
  const R = 35
  const STROKE = 10
  const C = 2 * Math.PI * R
  const GAP = 1.6 // jarak antar segmen (satuan viewBox)
  /* kategori & total dari LEDGER (`recap.segments`), bukan daftar contoh */
  const { expense, avgPerDay } = recap
  const segments = recap.segments
  const top = segments[0]
  const totalPct = segments.reduce((sum, seg) => sum + seg.pct, 0)

  let running = 0
  const rings = segments.map((seg) => {
    const dashLen = totalPct > 0 ? C * (seg.pct / totalPct) : 0
    const start = running
    running += dashLen
    return { ...seg, dashLen, start }
  })

  /* catatan ada tapi belum ada PENGELUARAN (mis. pekan isinya pemasukan saja):
     donut 0-kategori tidak digambar — diganti kalimat jujur supaya tidak terlihat
     seperti grafik kosong yang rusak */
  if (!top) {
    return (
      <div className="space-y-4">
        <section className="rounded-[1.75rem] bg-cream p-5 text-[13px] leading-relaxed text-ink/60 ring-1 ring-soil/12">
          {WEEKLY_RECAP_COPY.expensesEmpty}
        </section>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* kartu gelap: donut + ringkasan (ala kartu "EXPENSES" di referensi desain) */}
      <section className="relative overflow-hidden rounded-[1.75rem] bg-gradient-to-b from-[#000000] to-[#000000] p-5 text-cream ring-1 ring-inset ring-cream/10 shadow-[0_20px_44px_-28px_rgba(0,0,0,0.85)]">
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
                  stroke="rgba(255,255,255,0.10)"
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
                  {money(expense)}
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
                    style={{ backgroundColor: top.color }}
                  />
                  {top.label}
                  <span className="font-medium text-cream/45">· {top.pct}%</span>
                </dd>
              </div>
              <div>
                <dt className="text-[11px] text-cream/50">Rata-rata per hari</dt>
                <dd className="mt-1 text-[13px] font-semibold tabular-nums">
                  {money(avgPerDay)}
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
          {segments.map((seg) => (
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
                    {money(seg.amount)}
                  </span>
                  <span className="w-8 text-right tabular-nums text-ink/40">{seg.pct}%</span>
                </span>
              </div>
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-ink/[0.07]">
                <div
                  className="h-full rounded-full transition-[width] duration-700 ease-out"
                  style={{
                    width: `${top.pct > 0 ? Math.round((seg.pct / top.pct) * 100) : 0}%`,
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
          style={{ backgroundColor: `${top.color}33` }}
        >
          <Flame className="size-4" strokeWidth={2.4} style={{ color: top.color }} />
        </span>
        <p className="text-[13px] leading-relaxed text-ink/65">
          <b className="font-semibold text-ink">{top.label}</b> jadi pos terbesar minggu
          ini — {top.pct}% dari total pengeluaran ({money(top.amount)}).
          Kategori ini yang paling worth dirapikan minggu depan.
        </p>
      </section>
    </div>
  )
}

/* ─────────────────────────── Slide 3 — Tanaman Kamu (habit loop) ─────────────────────────── */
function SlidePlant({ recap }: { recap: WeeklyRecap }) {
  /* tahap, hari aktif, & jumlah catatan semuanya turunan dari LEDGER pekan ini */
  const stage = recap.plantStage
  const levelPct = Math.round((recap.activeDays / WEEKLY_RECAP_DAYS) * 100)
  const stages: (1 | 2 | 3 | 4)[] = [1, 2, 3, 4]

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
            Tahap {stage} · {STAGE_NAMES[stage]}
          </span>
          <PlantIllustration stage={stage} className="mt-3 w-36" />
        </div>

        <div className="relative mt-5">
          <div
            aria-hidden
            className="absolute left-[12.5%] right-[12.5%] top-[5px] h-0.5 bg-ink/10"
          />
          <div className="relative flex items-start justify-between">
            {stages.map((s) => {
              const reached = s <= stage
              const isCurrent = s === stage
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
            <MicroLabel>Hari aktif minggu ini</MicroLabel>
            <p className="mt-1 text-2xl font-semibold leading-none tracking-tight tabular-nums text-ink">
              {recap.activeDays}
              <span className="text-base font-medium text-ink/35">
                /{WEEKLY_RECAP_DAYS}
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
          Tanaman ini tumbuh dari kebiasaan mencatat minggu ini — bukan angka yang harus dikejar.
        </p>
      </section>

      {/* dua mini-card: angka NYATA dari ledger pekan ini (sebelumnya
          `levelUpThisWeek` & `hpGain` adalah konstanta tanpa sumber) */}
      <div className="grid grid-cols-2 gap-3">
        <section className="rounded-[1.75rem] bg-mint/20 p-4 ring-1 ring-mint/30">
          <MicroLabel>Catatan minggu ini</MicroLabel>
          <p className="mt-1.5 text-3xl font-semibold leading-none tracking-tight tabular-nums text-forest">
            {recap.transactions}
          </p>
          <p className="mt-1.5 text-[11px] text-forest/60">transaksi tercatat 🌱</p>
        </section>
        <section className="rounded-[1.75rem] bg-cream p-4 ring-1 ring-soil/12">
          <MicroLabel>Hari aktif</MicroLabel>
          <p className="mt-1.5 text-3xl font-semibold leading-none tracking-tight tabular-nums text-ink">
            {recap.activeDays}
          </p>
          <p className="mt-1.5 text-[11px] text-ink/45">hari kamu mencatat</p>
        </section>
      </div>
    </div>
  )
}

/* ──────────────────────── Slide 4 — Rencana Minggu Depan (action) ──────────────────────── */
function SlidePlan({
  recap,
  onSetTarget,
  onClose,
}: {
  /** seluruh angka pengeluaran & pos terbesar dari LEDGER pekan ini */
  recap: WeeklyRecap
  /** Aksi CTA "Atur target nabung" — WAJIB, sejalan dengan prop luar di
   *  `WeeklyRecapModal`. Dua halaman yang membuka rekap ini (Home & `/history`)
   *  sama-sama memasang hook targetnya sendiri, jadi tidak ada lagi jalur
   *  "prop tidak dikirim" seperti dulu (yang jatuh ke tautan /budget). */
  onSetTarget: () => void
  /** dipakai tautan /budget supaya recap tertutup dulu, bukan menutupi halaman */
  onClose: () => void
}) {
  /* nominal rencana (target tabungan, potongan harian, label bar) ikut tombol mata */
  const { money } = usePrivacy()
  /* dasar rencana = pengeluaran NYATA pekan ini; targetnya 10% lebih hemat.
     `barBase` dijaga ≥ 1 supaya tidak ada pembagian nol saat pekan tanpa
     pengeluaran (bar tetap 0 dan teksnya memakai salinan jujur). */
  const expense = recap.expense
  const top = recap.top
  const savingPerWeek = Math.round(expense * 0.1)
  const dailyCut = Math.round(savingPerWeek / 7 / 100) * 100 // dibulatkan ke ratusan rupiah
  const nextWeekExpense = expense - savingPerWeek
  const barBase = Math.max(expense, 1)
  const savedPct = Math.round((savingPerWeek / barBase) * 100)

  /* perbandingan pengeluaran: minggu ini vs rencana minggu depan */
  const bars = [
    {
      id: 'now',
      label: 'Minggu ini',
      value: expense,
      bar: 'from-plum/35 to-plum/45',
    },
    {
      id: 'next',
      label: 'Minggu depan',
      value: nextWeekExpense,
      bar: 'from-mint to-forest',
    },
  ]

  /* tiga langkah kecil yang bisa langsung dikerjakan. Langkah kategori hanya
     muncul kalau memang ADA pos pengeluaran — tidak mengarang kategori. */
  const steps = [
    ...(top
      ? [
          {
            icon: Flame,
            text: `Kurangi ${top.label} sekitar ${savedPct}%`,
            badge: `${savedPct}%`,
          },
        ]
      : []),
    {
      icon: PiggyBank,
      text: 'Setor ke tabungan di awal minggu',
      badge: money(savingPerWeek),
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
          {top ? (
            <>
              Minggu depan coba kurangi kategori{' '}
              <b className="font-semibold text-forest">{top.label}</b> sebesar {savedPct}%?
              Kamu masih punya cukup ruang buat tabungan.
            </>
          ) : (
            WEEKLY_RECAP_COPY.planNoCategory
          )}
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
                {money(b.value)}
              </span>
              <span
                className={cn(
                  'w-14 origin-bottom animate-[bar-grow_700ms_ease-out_both] rounded-xl bg-gradient-to-t',
                  b.bar,
                )}
                style={{
                  height: `${Math.max(Math.round((b.value / barBase) * 104), 16)}px`,
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
            {money(savingPerWeek)}
          </p>
          <p className="mt-2 text-[11px] leading-relaxed text-forest/60">
            Setara {money(dailyCut)}/hari — kamu masih punya ruang buat ini.
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

      {/* aksi — dua-duanya punya tujuan nyata (sebelumnya dua tombol mati,
          padahal PRD 2141–2145 meminta CTA recap duduk di zona ibu jari).
          `onSetTarget` kini WAJIB karena labelnya "Atur target nabung": yang
          terbuka harus benar-benar alur target. Dulu prop ini opsional dan
          ketiadaannya (kasus /history) jatuh ke tautan /budget — label
          menjanjikan modal, yang datang halaman lain (paket 32). Sekarang tidak
          ada lagi jalan itu: /history memasang hook targetnya sendiri. */}
      <div className="space-y-3 pt-1">
        <button
          type="button"
          onClick={onSetTarget}
          className="flex w-full items-center justify-center gap-2 rounded-full bg-forest py-3 text-sm font-semibold text-cream transition-colors hover:bg-forest-soft active:scale-[0.98]"
        >
          <PiggyBank className="size-4" strokeWidth={2.2} />
          {WEEKLY_RECAP_CTA_COPY.setTarget}
        </button>

        <Link
          href="/budget"
          onClick={onClose}
          className="flex w-full items-center justify-center gap-2 rounded-full bg-cream py-3 text-sm font-medium text-ink/60 ring-1 ring-soil/12 transition-colors hover:bg-sage/40 hover:text-ink active:scale-[0.98]"
        >
          <TrendingUp className="size-4" strokeWidth={2.2} />
          {WEEKLY_RECAP_CTA_COPY.planLink}
        </Link>
      </div>

      <p className="text-center text-[11px] leading-relaxed text-ink/40">
        💡 Kurangi pengeluaran harian sekecil {money(dailyCut)}, tabung{' '}
        {money(savingPerWeek)}/minggu
      </p>
    </div>
  )
}

/* ───────────────────── Shell sheet — pola sama dengan OverviewPanel ───────────────────── */

/**
 * Popup "Rekap Mingguan" (inventaris modal g, Domain 3A Habit Loop 2).
 * Shell meniru OverviewPanel ("Your Balance Overview") untuk GESTURnya:
 * mobile = bottom sheet menempel bawah (+ swipe-down untuk menutup).
 * Desktop = MODAL TENGAH (audit "Weekly Recap Layout") — dulu panel kanan
 * 440px yang terasa sesak; lihat `WeekRecapSheet` untuk geometrinya.
 */
export function WeeklyRecapModal({
  open,
  onClose,
  onSetTarget,
}: {
  open: boolean
  onClose: () => void
  /**
   * Aksi CTA "Atur target nabung" di slide Rencana Minggu Depan. WAJIB.
   *
   * Modal ini hidup di dua halaman (Home & /history), dan dua-duanya kini punya
   * alur target yang sama (`useMonthlyReview` + `MonthlyReviewModal`): pemanggil
   * yang menutup recap lalu membuka modal targetnya, sehingga (a) labelnya tidak
   * pernah menjanjikan modal yang tidak muncul, dan (b) tidak ada dua overlay
   * bertumpuk di layar yang sama.
   */
  onSetTarget: () => void
}) {
  const [slide, setSlide] = useState(0)
  /** panel "Bagikan kartu pencapaian" — dibuka dari tombol Share di kepala sheet */
  const [shareOpen, setShareOpen] = useState(false)

  useBodyScrollLock(open, true)

  useEffect(() => {
    /* dibuka lagi selalu dari slide pertama & panel bagikan tertutup */
    if (open) setSlide(0)
    else setShareOpen(false)
  }, [open])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        /* panel bagikan ditutup lebih dulu: Escape jangan langsung membuang rekap */
        if (shareOpen) setShareOpen(false)
        else onClose()
        return
      }
      /* selama panel bagikan terbuka, panah kiri/kanan jangan memindah slide —
         fokus user sedang di panel, bukan di carousel */
      if (shareOpen) return
      if (e.key === 'ArrowLeft') setSlide((s) => Math.max(0, s - 1))
      if (e.key === 'ArrowRight') setSlide((s) => Math.min(SLIDES.length - 1, s + 1))
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose, shareOpen])

  /* SATU turunan dari ledger nyata untuk seluruh slide + kepala sheet */
  const recap = useWeeklyRecap()

  const slides: Record<string, ReactNode> = {
    overview: <SlideOverview recap={recap} />,
    expenses: <SlideExpenses recap={recap} />,
    plant: <SlidePlant recap={recap} />,
    plan: <SlidePlan recap={recap} onSetTarget={onSetTarget} onClose={onClose} />,
  }

  return (
    <WeekRecapSheet
      open={open}
      onClose={onClose}
      slide={slide}
      setSlide={setSlide}
      slides={slides}
      recap={recap}
      shareOpen={shareOpen}
      onToggleShare={() => setShareOpen((prev) => !prev)}
    />
  )
}

function WeekRecapSheet({
  open,
  onClose,
  slide,
  setSlide,
  slides,
  recap,
  shareOpen,
  onToggleShare,
}: {
  open: boolean
  onClose: () => void
  slide: number
  setSlide: (n: number) => void
  slides: Record<string, ReactNode>
  /** rekap NYATA (ledger pekan ini) — dipakai kepala sheet & caption slide */
  recap: WeeklyRecap
  shareOpen: boolean
  onToggleShare: () => void
}) {
  /* caption slide memuat nominal (mis. "Total Rp 1.240.000 dari 5 kategori"),
     jadi ia harus dihitung dengan status tombol mata yang sebenarnya */
  const { masked } = usePrivacy()
  /* rentang pekan & jumlah transaksi TURUNAN dari ledger + tanggal perangkat
     (audit Temporal Desync) — bukan literal maupun konstanta demo */
  const periodLabel = recap.periodLabel
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

      {/* sheet: bottom sheet di mobile, MODAL TENGAH di desktop ────────────────
          Audit "Weekly Recap Layout": panel ini dulu menjuntai di kanan (440px)
          dan terasa sesak/timpang dari grid Dashboard. Sekarang ia modal yang
          berpusat di kolom tengah dengan lebar lega — tetap satu bahasa visual
          "modal penuh", tapi seimbang dengan konten di belakangnya. */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Rekap mingguan"
        style={sheetStyle}
        className={cn(
          'absolute inset-x-0 bottom-0 top-8 flex flex-col rounded-t-[2.25rem] bg-cream px-5 pb-6 shadow-[0_-24px_60px_-24px_rgba(69,89,78,0.55)] ring-1 ring-soil/12 transition-[transform,opacity] duration-[650ms] ease-[cubic-bezier(0.22,1,0.36,1)] will-change-transform lg:inset-y-6 lg:left-1/2 lg:right-auto lg:w-[min(640px,calc(100vw_-_6rem))] lg:-translate-x-1/2 lg:rounded-[2rem] lg:shadow-[0_40px_90px_-40px_rgba(69,89,78,0.6)]',
          open
            ? 'translate-y-0 opacity-100'
            : 'translate-y-full opacity-0 lg:translate-y-3 lg:scale-[0.98]',
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
                {periodLabel}
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-cream px-2.5 py-1 text-[11px] font-medium text-ink/60 ring-1 ring-soil/12">
                <BarChart3 className="size-3.5 text-forest/55" strokeWidth={2.2} />
                {recap.transactions} transaksi tercatat
              </span>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {/* Tombol Share dulu yatim (ikon tanpa handler). Sekarang ia membuka
                panel bagikan: tautan `/share/<id>` + Web Share API/clipboard —
                PRD 6614–6615 minta tombol ini ada di dalam rekap. */}
            <button
              type="button"
              onClick={onToggleShare}
              aria-label="Bagikan kartu pencapaian"
              aria-expanded={shareOpen}
              aria-controls="recap-share-panel"
              className={cn(
                'flex size-9 items-center justify-center rounded-full transition-colors',
                shareOpen
                  ? 'bg-forest text-mint'
                  : 'bg-cream text-ink ring-1 ring-soil/12 hover:bg-sage',
              )}
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

        {/* panel bagikan — DI LUAR area scroll: user bisa membuka rekap di slide
            mana pun, lalu langsung membagikan kartunya. Isinya sengaja tidak
            menggambar ulang kartu; pratinjau sebenarnya ada di `/share/<id>`. */}
        {shareOpen && SHARE_CARD !== 'unknown' && (
          <div id="recap-share-panel" className="shrink-0">
            <ShareProgressPanel
              card={SHARE_CARD}
              className="mt-3 animate-[row-in_240ms_ease-out] motion-reduce:animate-none"
            />
          </div>
        )}

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
            key={recap.empty ? 'empty' : current.id}
            className={cn(
              'pb-2 transition-all duration-700 ease-[cubic-bezier(0.22,1,0.36,1)]',
              entered ? 'translate-y-0 opacity-100' : 'translate-y-6 opacity-0',
            )}
          >
            {recap.empty ? (
              /* EMPTY STATE — pekan tanpa catatan: slide TIDAK menggambar Rp 0 /
                 donut kosong (itu terbaca seperti grafik rusak). Satu panel jujur
                 + satu tindakan. */
              <div className="flex flex-col items-center rounded-[1.75rem] border-2 border-dashed border-forest/15 bg-cream px-6 py-10 text-center">
                <span className="flex size-12 items-center justify-center rounded-full bg-sage text-forest">
                  <Sprout className="size-6" strokeWidth={1.8} />
                </span>
                <p className="mt-4 text-base font-semibold text-ink">{WEEKLY_RECAP_COPY.emptyTitle}</p>
                <p className="mt-1.5 max-w-sm text-[13px] leading-relaxed text-ink/55">
                  {WEEKLY_RECAP_COPY.emptyBody}
                </p>
              </div>
            ) : (
              <>
                {/* judul slide — menggantikan label panjang di chip tab */}
                <header className="mb-4">
                  <h3 className="text-lg font-semibold tracking-tight text-ink">{current.title}</h3>
                  <p className="mt-0.5 text-[11px] text-ink/45">{current.caption(masked, recap)}</p>
                </header>

                {slides[current.id]}
              </>
            )}
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

