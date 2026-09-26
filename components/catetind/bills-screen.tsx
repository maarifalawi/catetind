'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { Flame, Plus, Receipt, Wallet as WalletIcon } from 'lucide-react'
import { toast } from 'sonner'
import { ScreenShell } from './screen-shell'
import { LogoWordmark } from './logo-wordmark'
import { MetaChip } from './meta-chip'
import { GlobalPrivacyToggle } from './global-privacy-toggle'
import { usePrivacy } from './privacy-provider'
import { ShieldMeter } from './shield-meter'
import { SalaryWaterfall } from './salary-waterfall'
import { BillTimeline } from './bill-timeline'
import { BillCard, type StampState } from './bill-card'
import { BillNotifNudge } from './bill-notif-nudge'
import { AddBillSheet, type NewBill } from './add-bill-sheet'
import { cn } from '@/lib/utils'
import {
  BILL_FILTERS,
  CURRENT_DAY,
  INITIAL_BILLS,
  MONTHLY_INCOME,
  billFilterCounts,
  burnPercentage,
  filterBills,
  groupBills,
  maskMoney,
  totalMonthlyBills,
  type Bill,
  type BillFilter,
} from '@/lib/data/bills'

/* ── Tagihan Rutin (/app/bills) ──────────────────────────────────────────────
   Halaman ini SENGAJA bukan tabel daftar tagihan. Alurnya dibikin seperti
   checklist game:

   1. Tameng Proteksi  — tiap tagihan yang lunas menutup satu lajur perisai.
   2. Waterfall Gaji   — gaji "dimakan" potongan demi potongan, terbesar dulu.
   3. Timeline 7 hari  — tagihan terdekat; tap untuk lompat ke kartunya.
   4. Kartu tagihan    — geser kanan untuk cap LUNAS (haptic + stempel karet),
                         geser kiri untuk Edit / Hapus.

   Privasi memakai state GLOBAL (<GlobalPrivacyToggle /> + usePrivacy) supaya
   tombol mata di halaman ini menyensor nominal yang sama dengan halaman lain.
   (Sebelumnya halaman ini punya `isMasked` lokal yang tidak pernah berubah —
   toggle-nya nyata-nyata tidak menyensor apa pun.) "Hari ini" dipatok konstanta
   CURRENT_DAY supaya hasil render server & client identik.
   ────────────────────────────────────────────────────────────────────────── */

/** jeda sebelum kartu benar-benar pindah grup (stempel sempat terlihat dulu) */
const MOVE_DELAY = 600
/** jeda sampai stempel "fresh" menyusut jadi stempel samar milik kartu lunas */
const STAMP_SETTLE = 1600
/** cubic-bezier khas app: masuk cepat lalu settle lembut */
const EASE: [number, number, number, number] = [0.22, 1, 0.36, 1]

export function BillsScreen() {
  /* ── STATE ──────────────────────────────────────────────────────────────── */
  /* privasi nominal: state GLOBAL (PrivacyProvider) */
  const { masked } = usePrivacy()
  const [activeFilter, setActiveFilter] = useState<BillFilter>('semua')
  const [showAddBill, setShowAddBill] = useState(false)
  const [bills, setBills] = useState<Bill[]>(INITIAL_BILLS)
  /** tagihan yang stempel LUNAS-nya baru saja dicap (animasi + haptic) */
  const [stampId, setStampId] = useState<string | null>(null)
  /** kartu yang sedang disorot karena tanggalnya dipilih di timeline */
  const [highlightId, setHighlightId] = useState<string | null>(null)

  const currentDay = CURRENT_DAY
  const monthlyIncome = MONTHLY_INCOME

  /** semua timer halaman — dibersihkan saat unmount supaya tidak ada set state
   *  pada komponen yang sudah hilang */
  const timers = useRef<number[]>([])
  useEffect(() => {
    const pending = timers.current
    return () => pending.forEach((id) => window.clearTimeout(id))
  }, [])
  const later = (fn: () => void, ms: number) => {
    timers.current.push(window.setTimeout(fn, ms))
  }

  /* ── DATA TURUNAN ───────────────────────────────────────────────────────── */
  const counts = useMemo(() => billFilterCounts(bills, currentDay), [bills, currentDay])
  const visibleBills = useMemo(
    () => filterBills(bills, activeFilter, currentDay),
    [bills, activeFilter, currentDay],
  )
  const groups = useMemo(() => groupBills(visibleBills, currentDay), [visibleBills, currentDay])
  const totalAmount = useMemo(() => totalMonthlyBills(bills), [bills])
  const burn = useMemo(() => burnPercentage(bills, monthlyIncome), [bills, monthlyIncome])
  /** tagihan yang benar-benar ada di list "Aktif" (belum lunas) — dipakai
   *  timeline supaya kalender & daftar tidak kontradiksi (audit #3) */
  const activeBills = useMemo(() => bills.filter((bill) => !bill.isPaidThisMonth), [bills])

  /* ── AKSI ───────────────────────────────────────────────────────────────── */

  /**
   * 7C — cap LUNAS: stempel muncul di kartu, haptic tiga ketuk, toast, lalu
   * setelah 600ms kartunya pindah ke grup "Sudah Dibayar" (layoutId framer yang
   * menggeser) sehingga terasa seperti satu gerakan, bukan dua kejadian.
   */
  function handleMarkPaid(bill: Bill) {
    if (bill.isPaidThisMonth) return
    try {
      if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
        navigator.vibrate([30, 50, 30])
      }
    } catch {
      /* iOS Safari tanpa Vibration API — abaikan */
    }
    setStampId(bill.id)
    toast.success(`${bill.name} LUNAS! ✅`)

    later(() => {
      setBills((prev) =>
        prev.map((item) => (item.id === bill.id ? { ...item, isPaidThisMonth: true } : item)),
      )
    }, MOVE_DELAY)
    later(() => setStampId((current) => (current === bill.id ? null : current)), STAMP_SETTLE)
  }

  function handleEdit(bill: Bill) {
    // TODO: buka bottom sheet edit tagihan (pre-filled) — vaul sheet-nya menyusul
    toast.success(`Edit ${bill.name}`, { description: 'Sheet edit tagihan segera hadir.' })
  }

  function handleDelete(bill: Bill) {
    setBills((prev) => prev.filter((item) => item.id !== bill.id))
    toast('Tagihan dihapus', {
      description: `${bill.name} keluar dari daftar rutinmu. Tambahin lagi kapan aja ya 🌿`,
    })
  }

  /** 9D — tagihan baru masuk sebagai lajur kosong berikutnya di tameng */
  function handleSaveBill(data: NewBill) {
    const nextId = String(
      bills.reduce((max, bill) => Math.max(max, Number(bill.id) || 0), 0) + 1,
    )
    setBills((prev) => [...prev, { ...data, id: nextId, isPaidThisMonth: false }])
    setActiveFilter('semua')
    setShowAddBill(false)
    toast.success('Tagihan baru ditambahkan! 🔔')
  }

  /** 5 — tap tanggal di timeline: buka filternya, gulir ke kartu, sorot sebentar */
  function handlePickBill(bill: Bill) {
    setActiveFilter('semua')
    setHighlightId(bill.id)
    later(() => {
      const element = document.getElementById(`bill-card-${bill.id}`)
      if (!element) return
      const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
      try {
        element.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'center' })
      } catch {
        /* browser lawas tanpa scrollIntoView halus — kartunya tetap terlihat */
      }
    }, 80)
    later(() => setHighlightId((current) => (current === bill.id ? null : current)), 1800)
  }

  /** nomor urut global antar grup supaya animasi masuk kartu beruntun */
  let rowIndex = 0


  /* ── RENDER ─────────────────────────────────────────────────────────────── */
  return (
    <ScreenShell>
      {/* ── HEADER — kerangka sama dengan Dashboard/Budget (audit UX #1) ────
          Container `max-w-[640px]` + header sticky yang "bleed" ke tepi
          DIHAPUS: itu penyebab seluruh halaman terkurung jadi satu kolom
          sempit di tengah. Sekarang konten melebar penuh (full-width) dan
          dipecah 2 kolom di desktop. */}
      <header className="flex items-start justify-between lg:hidden">
        <LogoWordmark className="h-5" />
        <GlobalPrivacyToggle />
      </header>

      <div className="mt-4 lg:mt-0 lg:flex lg:items-end lg:justify-between lg:gap-8">
        <div className="min-w-0">
          <p className="hidden text-[13px] font-medium text-ink/45 lg:block">
            Pengeluaran tetap bulan ini
          </p>
          <h1 className="font-display text-3xl font-semibold tracking-tight text-ink lg:text-4xl">
            Tagihan Rutin
          </h1>
          <div className="mt-2 flex flex-wrap items-center gap-2 lg:mt-3">
            <MetaChip icon={Receipt}>{bills.length} tagihan</MetaChip>
            <MetaChip icon={WalletIcon}>{maskMoney(totalAmount, masked)}/bulan</MetaChip>
            <MetaChip icon={Flame}>{burn}% dari gaji</MetaChip>
          </div>
        </div>
        <div className="hidden shrink-0 lg:block">
          <GlobalPrivacyToggle />
        </div>
      </div>

        {bills.length === 0 ? (
          /* 10. EMPTY STATE — tameng kelabu 0/0 + ajakan mencatat tagihan pertama */
          <EmptyState masked={masked} onAdd={() => setShowAddBill(true)} />
        ) : (
          /* ── FULL-WIDTH 2 KOLOM (audit UX #1) ─────────────────────────────
             KIRI  (5/12) — insight & visual : tameng, waterfall gaji, timeline
             KANAN (7/12) — list actionable : filter, daftar tagihan, + tambah
             Di mobile tetap satu kolom (insight dulu, lalu list). */
          <div className="mt-5 grid grid-cols-1 gap-5 lg:mt-6 lg:grid-cols-12 lg:gap-6">
            <div className="flex flex-col gap-5 lg:col-span-5 lg:gap-6">
              {/* 3. TAMENG PROTEKSI */}
              <ShieldMeter bills={bills} masked={masked} currentDay={currentDay} className="mt-0" />

              {/* 8. NUDGE NOTIFIKASI — hanya saat izin belum pernah diminta */}
              <BillNotifNudge className="mt-0" />

              {/* 4. WATERFALL GAJI */}
              <SalaryWaterfall
                bills={bills}
                masked={masked}
                monthlyIncome={monthlyIncome}
                className="mt-0"
              />

              {/* 5. TIMELINE 7 HARI — hanya tagihan yang ada di list Aktif */}
              <BillTimeline
                bills={activeBills}
                currentDay={currentDay}
                onPick={handlePickBill}
                className="mt-0"
              />
            </div>

            <section aria-label="Daftar tagihan" className="flex flex-col lg:col-span-7">
              {/* kepala daftar: judul + tombol tambah ringkas (audit #7 —
                  tidak lagi membentang penuh seperti footer di dasar layar) */}
              <div className="flex items-center justify-between gap-3">
                <h2 className="font-display text-[17px] font-bold tracking-tight text-ink">
                  Daftar Tagihan
                </h2>
                <button
                  type="button"
                  onClick={() => setShowAddBill(true)}
                  className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full bg-forest px-3.5 text-[12px] font-semibold text-cream transition-colors hover:bg-forest-soft active:scale-[0.97]"
                >
                  <Plus className="size-4" strokeWidth={2.6} />
                  Tagihan
                </button>
              </div>

              {/* 6. FILTER PILLS — angkanya selalu dari semua tagihan */}
              <div
                role="group"
                aria-label="Filter tagihan"
                className="hide-scrollbar -mx-5 mt-3 flex gap-2 overflow-x-auto px-5 pb-1 sm:-mx-8 sm:px-8 lg:mx-0 lg:flex-wrap lg:px-0"
              >
                {BILL_FILTERS.map((pill) => {
                  const count = counts[pill.id]
                  const active = activeFilter === pill.id
                  const isLate = pill.id === 'telat'
                  const isPaidPill = pill.id === 'lunas'
                  return (
                    <button
                      key={pill.id}
                      type="button"
                      aria-pressed={active}
                      onClick={() => setActiveFilter(pill.id)}
                      className={cn(
                        'inline-flex shrink-0 items-center gap-1.5 rounded-full px-3.5 py-2 text-[12px] font-semibold transition-all duration-200 active:scale-95',
                        active
                          ? 'bg-forest text-mint shadow-[0_10px_22px_-14px_rgba(69,89,78,0.75)]'
                          : isLate && count > 0
                            ? 'bg-hud-terracotta/15 text-hud-terracotta ring-1 ring-inset ring-hud-terracotta/30'
                            : isPaidPill
                              ? 'bg-hud-sage/15 text-[#503a3a] ring-1 ring-inset ring-hud-sage/25'
                              : 'bg-cream text-ink/60 ring-1 ring-soil/[0.07] hover:bg-cream hover:text-ink',
                      )}
                    >
                      {/* titik berdenyut kalau memang ada yang telat */}
                      {isLate && count > 0 && !active && (
                        <span className="relative flex size-1.5">
                          <span className="absolute inline-flex size-full animate-ping rounded-full bg-hud-terracotta/70 motion-reduce:animate-none" />
                          <span className="relative inline-flex size-1.5 rounded-full bg-hud-terracotta" />
                        </span>
                      )}
                      {isPaidPill ? 'Lunas ✓' : pill.label}
                      <span
                        className={cn('tabular-nums', active ? 'text-mint/70' : 'text-ink/40')}
                      >
                        ({count})
                      </span>
                    </button>
                  )
                })}
              </div>

              {/* 7. DAFTAR TAGIHAN — dikelompokkan per status */}
              <div className="mt-3 flex flex-col gap-6 pb-1">
                {groups.length === 0 ? (
                  <p className="rounded-2xl bg-cream/70 px-4 py-6 text-center text-[12.5px] font-medium text-ink/45 ring-1 ring-soil/[0.04]">
                    Gak ada tagihan di filter ini. Coba “Semua” ya 🌿
                  </p>
                ) : (
                  groups.map((group) => (
                    <motion.section
                      key={group.meta.status}
                      layout
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.32, ease: EASE }}
                    >
                      {/* kepala grup — label inline (header halaman tidak lagi
                          sticky, jadi chip tidak perlu menempel ke viewport) */}
                      <div className="flex items-center gap-2">
                        <span
                          className={cn(
                            'inline-flex items-center gap-1.5 rounded-full bg-cream/95 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.14em] ring-1 ring-soil/[0.05]',
                            group.meta.labelClass,
                          )}
                        >
                          <span aria-hidden>{group.meta.icon}</span>
                          {group.meta.label}
                        </span>
                        <span
                          aria-hidden
                          className={cn('h-px flex-1 rounded-full opacity-40', group.meta.barClass)}
                        />
                        <span className="shrink-0 text-[10.5px] font-bold tabular-nums text-ink/35">
                          {group.items.length}
                        </span>
                      </div>

                      <motion.ul layout className="mt-2 flex flex-col gap-2">
                        {group.items.map((bill) => {
                          const delay = 60 + rowIndex++ * 45
                          const stamp: StampState =
                            stampId === bill.id
                              ? 'fresh'
                              : bill.isPaidThisMonth
                                ? 'settled'
                                : 'none'
                          return (
                            <BillCard
                              key={bill.id}
                              bill={bill}
                              masked={masked}
                              currentDay={currentDay}
                              stamp={stamp}
                              highlighted={highlightId === bill.id}
                              delay={delay}
                              onMarkPaid={handleMarkPaid}
                              onEdit={handleEdit}
                              onDelete={handleDelete}
                            />
                          )
                        })}
                      </motion.ul>
                    </motion.section>
                  ))
                )}
              </div>
            </section>
          </div>
        )}

      {/* bottom sheet (mobile) / dialog (desktop) */}
      <AddBillSheet
        open={showAddBill}
        onClose={() => setShowAddBill(false)}
        onSave={handleSaveBill}
      />
    </ScreenShell>
  )
}

/* ── komponen kecil halaman ini ───────────────────────────────────────────── */

/** 10. Empty state nurturing: belum ada tagihan rutin sama sekali */
function EmptyState({ masked, onAdd }: { masked: boolean; onAdd: () => void }) {
  return (
    <div className="mt-5">
      {/* tameng 0/0 — kelabu penuh, tanpa ringkasan uang */}
      <ShieldMeter bills={[]} masked={masked} currentDay={CURRENT_DAY} variant="compact" />

      <div className="mt-5 flex flex-col items-center rounded-[1.75rem] border-2 border-dashed border-forest/15 bg-cream/50 px-6 py-10 text-center">
        <h2 className="font-display text-[16px] font-bold tracking-tight text-ink">
          Belum ada tagihan rutin
        </h2>
        <p className="mt-1.5 max-w-sm text-[13px] leading-relaxed text-ink/55">
          Kos, Netflix, cicilan HP — catat biar jatah harian kamu lebih akurat 📋🌿
        </p>
        <button
          type="button"
          onClick={onAdd}
          className="mt-5 inline-flex h-11 items-center gap-2 rounded-2xl bg-forest px-5 text-[13.5px] font-semibold text-cream transition-colors hover:bg-forest-soft active:scale-[0.98]"
        >
          <Plus className="size-4" strokeWidth={2.6} />
          Tambah Tagihan Pertama
        </button>
      </div>
    </div>
  )
}

/* Toggle privasi halaman ini memakai komponen baku GLOBAL (audit UX #4):
   <GlobalPrivacyToggle /> — ikon bulat di mobile, pill berlabel "Sembunyikan" /
   "Tampilkan" di desktop. State sensor dibaca dari PrivacyProvider (usePrivacy)
   sehingga benar-benar menyensor seluruh halaman dan sinkron dengan halaman
   lain. */
