'use client'

import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import {
  ArrowRight,
  BellRing,
  CalendarDays,
  CalendarRange,
  ChevronRight,
  TrendingDown,
  X,
} from 'lucide-react'
import {
  JOINT_ME,
  JOINT_MONTH_LABEL,
  JOINT_PARTNER,
  JOINT_WEEKLY,
  SETTLEMENT_THRESHOLD,
  categoryEmoji,
  moneyLabel,
  netOf,
  netPhrase,
  shouldPromptSettlement,
  type JointPerson,
  type JointTransaction,
  type SettlementState,
} from '@/lib/data/joint'
import { JointBalanceScale } from './joint-balance-scale'
import { cn } from '@/lib/utils'

/* ── Banner Rekap & Notifikasi (Section 10 & 11) ─────────────────────────────
   Tiga banner, tiga peran:
   • Push-style (11): transaksi bareng > Rp 500.000 → banner amber di atas
     halaman, gaya "push notification" (ikon lonceng + label Push).
   • Rekap mingguan (10A): hanya hari Minggu (produksi) → bisa di-tap untuk
     melihat rincian kategori minggu ini.
   • Rekap bulanan (10B): hanya tanggal 28–31 (produksi) → lebih besar, memuat
     timbangan mini + CTA ke modal settlement.

   DUA ATURAN YANG WAJIB DIPEGANG DI SINI:
   1. HIERARKI (audit #8): tanggal + prioritas diputuskan SATU kali oleh
      `recapBannerVisibility()` di halaman, lalu dikirim sebagai prop `show`.
      Rekap bulanan menang; banner mingguan tidak pernah tampil bertumpuk.
   2. AMBANG SETTLE (kanon A7 + audit #6): tombol "Lihat Detail & Settle" hanya
      dirender kalau `shouldPromptSettlement()` true (selisih > Rp100.000).

   Gate harinya dihitung DI CLIENT (setelah mount) persis seperti
   `weekly-recap-banner.tsx`, supaya HTML server & client tidak pernah beda —
   sekarang gate itu hidup di halaman (`JointScreen`), bukan di tiap banner.
   ────────────────────────────────────────────────────────────────────────── */

const EASE: [number, number, number, number] = [0.22, 1, 0.36, 1]

/** rincian kategori minggu ini (mock, jumlahnya = JOINT_WEEKLY.total) */
const WEEKLY_BREAKDOWN = [
  { category: 'Makanan', amount: 345000 },
  { category: 'Tagihan', amount: 210000 },
  { category: 'Transportasi', amount: 88000 },
  { category: 'Belanja', amount: 85000 },
]

/** 11 — banner gaya push notification untuk pengeluaran bareng yang besar */
export function JointPushBanner({
  tx,
  masked,
  onDismiss,
  onOpenSplit,
}: {
  /** transaksi besar terakhir (null = tidak ada) */
  tx: JointTransaction | null
  masked: boolean
  onDismiss: () => void
  onOpenSplit: (tx: JointTransaction) => void
}) {
  const who = tx?.userId === JOINT_PARTNER.id ? JOINT_PARTNER : JOINT_ME

  return (
    <AnimatePresence initial={false}>
      {tx && (
        <motion.div
          key={tx.id}
          initial={{ opacity: 0, y: -14 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -14 }}
          transition={{ duration: 0.3, ease: EASE }}
          className="mt-3 flex items-start gap-3 rounded-[1.5rem] bg-[#ffffff] px-4 py-3.5 ring-1 ring-hud-amber/45 shadow-[0_20px_44px_-34px_rgba(255,184,133,0.95)]"
        >
          <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-hud-amber/25 text-[#b89191]">
            <BellRing className="size-4" strokeWidth={2.3} />
          </span>
          <div className="min-w-0 flex-1">
            <p className="flex items-center gap-1.5">
              <span className="rounded-full bg-hud-amber/25 px-1.5 py-0.5 text-[9px] font-medium uppercase tracking-wide text-[#b89191]">
                Push
              </span>
              <span className="text-[10.5px] font-medium text-forest/40">Pengeluaran besar</span>
            </p>
            <p className="mt-1 text-[13px] font-medium leading-snug text-forest">
              {who.avatar} {who.name} barusan catat {tx.description}{' '}
              <span className="tabular-nums">{moneyLabel(tx.amount, masked)}</span> — split-nya udah
              pas belum?
            </p>
            <button
              type="button"
              onClick={() => onOpenSplit(tx)}
              className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-forest/5 px-3 py-1.5 text-[11.5px] font-medium text-forest ring-1 ring-forest/15 transition-colors hover:bg-forest/10"
            >
              Atur pembagian
              <ArrowRight className="size-3.5" strokeWidth={2.6} />
            </button>
          </div>
          <button
            type="button"
            onClick={onDismiss}
            aria-label="Tutup notifikasi"
            className="flex size-7 shrink-0 items-center justify-center rounded-full text-forest/35 transition-colors hover:bg-soil/[0.11] hover:text-forest/60"
          >
            <X className="size-3.5" strokeWidth={2.4} />
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

/**
 * 10A — banner rekap mingguan. Hanya hari Minggu (produksi).
 * Keputusan tanggal + hierarki banner TIDAK lagi di dalam komponen ini: halaman
 * memanggil `recapBannerVisibility()` (audit #8) lalu menyerahkan hasilnya lewat
 * `show`, jadi tidak mungkin lagi banner bulanan & mingguan tampil bertumpuk.
 */
export function JointWeeklyRecapBanner({ show }: { show: boolean }) {
  const [open, setOpen] = useState(false)
  if (!show) return null

  /* siapa paling rajin mencatat minggu ini */
  const topRecorder =
    (JOINT_WEEKLY.counts[JOINT_PARTNER.id] ?? 0) > (JOINT_WEEKLY.counts[JOINT_ME.id] ?? 0)
      ? JOINT_PARTNER
      : JOINT_ME

  return (
    <div className="mt-3 overflow-hidden rounded-[1.5rem] bg-forest px-4 py-3.5 text-cream ring-1 ring-soil/12">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        aria-expanded={open}
        className="flex w-full items-center gap-3 text-left"
      >
        <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-mint/20 text-mint">
          <CalendarRange className="size-4" strokeWidth={2.3} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-[13.5px] font-medium leading-snug">
            📊 Minggu ini kalian kompak! Total bersama Rp{' '}
            {JOINT_WEEKLY.total.toLocaleString('id-ID')}
          </span>
          <span className="mt-0.5 block text-[11.5px] leading-relaxed text-cream/60">
            {JOINT_WEEKLY.trendPct < 0
              ? `Lebih hemat ${Math.abs(JOINT_WEEKLY.trendPct)}% dari minggu lalu`
              : `Naik ${JOINT_WEEKLY.trendPct}% dari minggu lalu`}{' '}
            · {topRecorder.name} paling rajin catat minggu ini! 🏆
          </span>
        </span>
        <ChevronRight
          aria-hidden
          className={cn(
            'size-4 shrink-0 text-mint transition-transform duration-200',
            open && 'rotate-90',
          )}
          strokeWidth={2.6}
        />
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            key="weekly-detail"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.28, ease: EASE }}
            className="overflow-hidden"
          >
            <ul className="mt-3 space-y-2 border-t border-cream/15 pt-3">
              {WEEKLY_BREAKDOWN.map((slice) => (
                <li key={slice.category} className="flex items-center justify-between gap-3">
                  <span className="text-[12px] text-cream/70">
                    {categoryEmoji(slice.category)} {slice.category}
                  </span>
                  <span className="text-[12px] font-semibold tabular-nums text-cream">
                    Rp {slice.amount.toLocaleString('id-ID')}
                  </span>
                </li>
              ))}
            </ul>
            <p className="mt-2.5 flex items-center gap-1.5 text-[11px] text-mint">
              <TrendingDown className="size-3.5" strokeWidth={2.6} />
              Tren turun = kabar baik. Pertahankan! 💚
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

/**
 * 10B — banner rekap bulanan. Produksi: tanggal 28–31 (keputusan tanggal ada di
 * `recapBannerVisibility()`, halaman mengirim hasilnya lewat `show`).
 * Lebih menonjol karena momennya: ajakan menutup bulan dengan settle.
 *
 * Audit #6 + kanon PRD A7: ajakan settle (tombol transfer cokelat) BARU muncul
 * kalau `shouldPromptSettlement()` true (selisih > Rp100.000). Selama statusnya
 * "Gak perlu settle" atau bulan sudah ditandai settle, banner turun nada jadi
 * hijau olive tanpa CTA — jangan pernah mendesak user men-transfer padahal
 * kalimat di atasnya bilang tidak perlu.
 */
export function JointMonthlyRecapBanner({
  settlement,
  masked,
  show,
  onOpenSettlement,
  me = JOINT_ME,
  partner = JOINT_PARTNER,
}: {
  settlement: SettlementState
  masked: boolean
  /** false = banner tidak boleh tampil (tanggal belum masuk / kalah prioritas) */
  show: boolean
  onOpenSettlement: () => void
  me?: JointPerson
  partner?: JointPerson
}) {
  if (!show) return null

  const promptSettle = shouldPromptSettlement(settlement)
  const monthName = JOINT_MONTH_LABEL.split(' ')[0]

  return (
    <div
      className={cn(
        'mt-3 rounded-[1.5rem] bg-[#ffffff] px-4 py-4 ring-1',
        promptSettle
          ? 'ring-hud-terracotta/25 shadow-[0_26px_52px_-40px_rgba(184,145,145,0.95)]'
          : 'ring-hud-sage/35 shadow-[0_26px_52px_-44px_rgba(69,89,78,0.6)]',
      )}
    >
      <p className="flex items-center justify-center gap-2 text-[13.5px] font-medium text-forest">
        <CalendarDays
          className={cn('size-4', promptSettle ? 'text-hud-terracotta' : 'text-forest')}
          strokeWidth={2.3}
        />
        📅 Rekap {monthName} hampir selesai!
      </p>

      <div className="mt-1 flex justify-center">
        <JointBalanceScale
          settlement={settlement}
          masked={masked}
          me={me}
          partner={partner}
          size="sm"
          showCopy={false}
        />
      </div>

      {settlement.settled ? (
        <p className="text-center text-[12.5px] leading-relaxed text-forest">
          Bulan ini sudah kamu tandai settle ✅ Scale-nya rata, mulai dari nol lagi bulan depan 💚
        </p>
      ) : settlement.level === 'equal' ? (
        <p className="text-center text-[12.5px] leading-relaxed text-forest">
          Total patungan {moneyLabel(settlement.weighedTotal, masked)} — kalian impas, kompak banget
          ⚖️✨
        </p>
      ) : settlement.level === 'close' ? (
        /* audit #6: selisih di bawah ambang A7 → nada hijau, TANPA tombol settle */
        <p className="text-center text-[12.5px] leading-relaxed text-forest">
          Hampir impas! Selisih yang ditimbang cuma{' '}
          <b className="font-medium">{moneyLabel(settlement.difference, masked)}</b> — di bawah Rp
          {SETTLEMENT_THRESHOLD.toLocaleString('id-ID')}, gak perlu settle 💚
        </p>
      ) : (
        <p className="text-center text-[12.5px] leading-relaxed text-forest/60">
          {/* Stage 2: banner ikut bicara NET — angka & arahnya sama dengan panci
              timbangan dan modal, jadi tidak ada lagi "yang ditimbang" vs
              "nalangin lebih banyak" yang terbaca sebagai dua tagihan berbeda */}
          {settlement.whoIsOwed.name}{' '}
          <b className="font-medium text-forest">
            {netPhrase(netOf(settlement, settlement.whoIsOwed.id), masked)}
          </b>{' '}
          · {settlement.whoOwes.name} yang transfer.
        </p>
      )}

      {promptSettle && (
        <button
          type="button"
          onClick={onOpenSettlement}
          className="mt-3 inline-flex h-11 w-full items-center justify-center gap-2 rounded-2xl bg-hud-terracotta text-[13.5px] font-medium text-[#ffffff] shadow-[0_16px_32px_-22px_rgba(184,145,145,0.95)] transition-colors hover:bg-hud-terracotta/90 active:scale-[0.99]"
        >
          Lihat Detail &amp; Settle
          <ArrowRight className="size-4" strokeWidth={2.6} />
        </button>
      )}
    </div>
  )
}
