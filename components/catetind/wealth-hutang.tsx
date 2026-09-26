'use client'

import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import {
  ArrowDownLeft,
  ArrowUpRight,
  Check,
  ChevronDown,
  Plus,
  ShieldCheck,
  Snowflake,
  Wallet,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { BudgetSheet, ChoicePills, RupiahField, SheetSubmit } from './budget-sheet'
import {
  ALL_SETTLED_COPY,
  ALL_SETTLED_TITLE,
  EMPTY_HUTANG_COPY,
  EMPTY_HUTANG_CTA,
  EMPTY_HUTANG_TITLE,
  EMPTY_PIUTANG_COPY,
  EMPTY_PIUTANG_CTA,
  EMPTY_PIUTANG_TITLE,
  PERSONAL_SECTION_COPY,
  SNOWBALL_EMPTY,
  SNOWBALL_HELP,
  SNOWBALL_TITLE,
  WALLET_SOURCE_OPTIONS,
  WEALTH_TODAY_ISO,
  activeDebtRemaining,
  activeReceivableTotal,
  allDebtsSettled,
  counterpartyLabel,
  debtPaid,
  debtPaidPct,
  debtPointsToMe,
  dtiBadge,
  dtiRatio,
  estimatedInterest,
  hudDeductionCopy,
  maskMoney,
  personalDebts,
  platformDebts,
  providerEmoji,
  snowballProgress,
  snowballRows,
  totalMonthInstallments,
  type Debt,
  type DebtView,
  type SnowballRow,
} from '@/lib/data/wealth'

/* ── TAB 3 — HUTANG / DEBT MANAGER (Section 7) ──────────────────────────────
   Halaman ini TIDAK menampilkan daftar hutang biasa. Dua ide besarnya:

   1. DEBT SNOWBALL TRACKER (7C) — hutang platform digambar sebagai gunung es
      yang dilumerkan: bar diurut dari sisa TERKECIL (metode bola salju), porsi
      terracotta = sisa, porsi sage = yang sudah lunas. Begitu satu hutang
      lunas, barnya meluncur ke sage penuh + confetti + menyusut dengan pegas.
      Ini yang membuat melunasi hutang terasa seperti menamatkan level game,
      bukan membayar tagihan.

   2. DTI yang jujur tapi tidak menghakimi (7B) — cicilan platform dibanding
      pemasukan bulanan, dengan tiga nada kanon (sage / amber / terracotta).
      Terracotta BUKAN merah: PRD 2E.2 sengaja memilih warna hangat + copy
      empatik supaya tidak memicu financial anxiety.

   Cicilan platform juga dinyatakan terang-terangan: uangnya sudah dipotong dari
   Jatah Harian (Domain 2B) — user tahu ke mana income pool pergi sebelum
   dana bagi-bagi harian.
   ────────────────────────────────────────────────────────────────────────── */

/** lebar area aksi "Catat Bayar" yang tersingkap (px) saat kartu digeser kanan */
const REVEAL_PAY = 116
/** ambang snap: geseran > 44px langsung membuka penuh */
const SNAP = 44

export function WealthHutang({
  debts,
  view,
  onChangeView,
  masked,
  monthlyIncome,
  celebrateId,
  onAddDebt,
  onSettleDebt,
  onPayDebt,
}: {
  debts: Debt[]
  view: DebtView
  onChangeView: (view: DebtView) => void
  masked: boolean
  /** pemasukan bulanan — pembagi rasio DTI (sinkron Daily HUD / Domain 2B) */
  monthlyIncome: number
  /** id hutang yang barnya baru saja lunas — memicu confetti + kolaps */
  celebrateId: string | null
  onAddDebt: () => void
  onSettleDebt: (debt: Debt) => void
  onPayDebt: (debt: Debt, amount: number) => void
}) {
  const [payTarget, setPayTarget] = useState<Debt | null>(null)

  const rows = snowballRows(debts)
  const progress = snowballProgress(debts)
  const installments = totalMonthInstallments(debts)
  const ratio = dtiRatio(installments, monthlyIncome)
  const badge = dtiBadge(ratio)
  const owed = activeDebtRemaining(debts)
  const receivable = activeReceivableTotal(debts)
  const mine = personalDebts(debts, 'owed_by_me')
  const theirs = personalDebts(debts, 'owed_to_me')
  const myPlatform = platformDebts(debts)
  const isEmpty =
    view === 'hutangku'
      ? myPlatform.length === 0 && mine.active.length === 0
      : theirs.active.length === 0
  const settled = allDebtsSettled(debts)

  return (
    <div>
      {/* ── 7A: segmented control Hutangku / Piutangku ─────────────────── */}
      <SegmentedControl value={view} onChange={onChangeView} />

      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={view}
          initial={{ opacity: 0, x: view === 'hutangku' ? -12 : 12 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: view === 'hutangku' ? 12 : -12 }}
          transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
        >
          {/* ── 7B: ringkasan + badge DTI ─────────────────────────────── */}
          <SummaryCard
            view={view}
            owed={owed}
            receivable={receivable}
            installments={installments}
            ratio={ratio}
            badgeLabel={badge.label}
            badgeCopy={badge.copy}
            badgePillClass={badge.pillClassName}
            activeCount={
              view === 'hutangku' ? myPlatform.length + mine.active.length : theirs.active.length
            }
            masked={masked}
          />

          {isEmpty ? (
            <EmptyDebtState
              view={view}
              allSettled={settled && view === 'hutangku'}
              onAdd={onAddDebt}
            />
          ) : (
            <div className="mt-5 grid gap-5 lg:gap-6 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] xl:items-start">
              {/* ── 7C: Debt Snowball Tracker (signature visual) ────────── */}
              {view === 'hutangku' && (
                <SnowballTracker
                  rows={rows}
                  progress={progress}
                  masked={masked}
                  celebrateId={celebrateId}
                />
              )}

              <div className="space-y-5 lg:space-y-6">
                {/* ── 7D: daftar hutang platform + Catat Bayar ─────────── */}
                {view === 'hutangku' && myPlatform.length > 0 && (
                  <section>
                    <SectionHeader
                      title="PLATFORM"
                      helper="Tap kartu untuk detail & estimasi bunga"
                    />
                    <ul className="space-y-2.5">
                      {myPlatform.map((debt, index) => (
                        <PlatformDebtCard
                          key={debt.id}
                          debt={debt}
                          masked={masked}
                          delay={0.03 * index}
                          onPay={() => setPayTarget(debt)}
                        />
                      ))}
                    </ul>
                  </section>
                )}

                {/* ── 7E: daftar hutang personal (selalu terpisah) ─────── */}
                <PersonalSection
                  title={view === 'hutangku' ? 'PERSONAL' : 'PIUTANG'}
                  active={view === 'hutangku' ? mine.active : theirs.active}
                  settled={view === 'hutangku' ? mine.settled : theirs.settled}
                  masked={masked}
                  onSettle={onSettleDebt}
                />

                {/* ── 7F: tombol tambah (dual form) ───────────────────── */}
                <button
                  type="button"
                  onClick={onAddDebt}
                  className="flex w-full items-center justify-center gap-2 rounded-[1.5rem] border-2 border-dashed border-forest/20 bg-cream/60 px-5 py-4 text-[13.5px] font-semibold text-ink/60 transition-colors hover:border-forest/35 hover:bg-cream hover:text-ink active:scale-[0.99]"
                >
                  <Plus className="size-4" strokeWidth={2.6} />
                  Tambah Utang/Piutang
                </button>
              </div>
            </div>
          )}
        </motion.div>
      </AnimatePresence>

      <PayDebtSheet
        debt={payTarget}
        masked={masked}
        onClose={() => setPayTarget(null)}
        onConfirm={(amount) => {
          // TODO: simpan juga tanggal & dompet sumber ke tabel debt_payments
          if (payTarget) onPayDebt(payTarget, amount)
          setPayTarget(null)
        }}
      />
    </div>
  )
}

/* ── 7A: segmented control ───────────────────────────────────────────────────
   Dua segmen, pill aktif meluncur 200ms (sage untuk Hutangku, amber untuk
   Piutangku) — pola yang sama dengan ScopeSwitcher di halaman Budget. */
function SegmentedControl({
  value,
  onChange,
}: {
  value: DebtView
  onChange: (value: DebtView) => void
}) {
  const index = value === 'hutangku' ? 0 : 1
  const options: { id: DebtView; label: string }[] = [
    { id: 'hutangku', label: 'Hutangku' },
    { id: 'piutangku', label: 'Piutangku' },
  ]

  return (
    <div
      role="tablist"
      aria-label="Jenis catatan hutang"
      className="relative flex items-center rounded-full bg-cream p-1 shadow-[0_12px_28px_-22px_rgba(69,89,78,0.6)] ring-1 ring-soil/12"
    >
      <motion.span
        aria-hidden
        initial={false}
        animate={{ x: `${index * 100}%` }}
        transition={{ type: 'tween', ease: 'easeOut', duration: 0.2 }}
        className={cn(
          'pointer-events-none absolute bottom-1 left-1 top-1 rounded-full ring-1',
          index === 0 ? 'bg-hud-sage/30 ring-hud-sage/40' : 'bg-hud-amber/25 ring-hud-amber/40',
        )}
        style={{ width: 'calc((100% - 0.5rem) / 2)' }}
      />
      {options.map((option) => {
        const active = value === option.id
        return (
          <button
            key={option.id}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(option.id)}
            className={cn(
              'relative z-10 flex-1 rounded-full px-4 py-2.5 text-[13px] font-bold transition-colors duration-200',
              active ? 'text-ink' : 'text-ink/45 hover:text-ink/70',
            )}
          >
            {option.label}
          </button>
        )
      })}
    </div>
  )
}


/* ── 7B: ringkasan hutang + badge DTI + jembatan ke Jatah Harian ──────────── */
function SummaryCard({
  view,
  owed,
  receivable,
  installments,
  ratio,
  badgeLabel,
  badgeCopy,
  badgePillClass,
  activeCount,
  masked,
}: {
  view: DebtView
  owed: number
  receivable: number
  installments: number
  ratio: number
  badgeLabel: string
  badgeCopy: string
  badgePillClass: string
  activeCount: number
  masked: boolean
}) {
  const piutang = view === 'piutangku'

  return (
    <section className="relative mt-4 overflow-hidden rounded-[1.75rem] bg-[#ffffff] p-5 shadow-[0_20px_46px_-30px_rgba(69,89,78,0.5)] ring-1 ring-soil/10 sm:p-6">
      <div
        aria-hidden
        className={cn(
          'pointer-events-none absolute -right-14 -top-16 size-48 rounded-full blur-3xl',
          piutang ? 'bg-hud-amber/20' : 'bg-hud-terracotta/15',
        )}
      />
      <div className="relative">
        <span className="text-[10.5px] font-bold uppercase tracking-[0.2em] text-ink/40">
          {piutang ? 'Total Piutang Aktif' : 'Total Hutang Aktif'}
        </span>
        <p className="mt-2 font-display text-[1.9rem] font-black leading-none tracking-tight text-ink tabular-nums sm:text-[2.2rem]">
          {maskMoney(piutang ? receivable : owed, masked)}
        </p>
        <p className="mt-2 text-[11.5px] text-ink/45">
          {activeCount} catatan aktif
          {piutang ? ' · duit kamu yang masih di orang lain' : ''}
        </p>

        {piutang ? (
          <p className="mt-4 rounded-2xl bg-hud-amber/12 px-3.5 py-3 text-[12px] leading-relaxed text-[#b89191] ring-1 ring-inset ring-hud-amber/25">
            Catat aja biar gak lupa, bukan buat ngejar-ngejar ya 😊
          </p>
        ) : (
          <>
            <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2">
              <span className="text-[12px] text-ink/55">
                Cicilan Bulan Ini
                <b className="ml-1.5 font-bold text-ink tabular-nums">
                  {maskMoney(installments, masked)}
                </b>
              </span>
              {/* badge DTI — 3 nada kanon, TANPA merah */}
              <span
                className={cn(
                  'inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[11.5px] font-bold ring-1 ring-inset',
                  badgePillClass,
                )}
              >
                DTI {ratio}% — {badgeLabel}
                {ratio <= 30 ? ' 💚' : ratio <= 40 ? ' 🌤️' : ' 🫂'}
              </span>
            </div>

            <p className="mt-2 text-[11.5px] leading-relaxed text-ink/50">{badgeCopy}</p>

            {/* jembatan ke Daily HUD (Domain 2B) */}
            <p className="mt-3 rounded-2xl bg-sage/50 px-3.5 py-3 text-[11.5px] leading-relaxed text-ink/65">
              {hudDeductionCopy(maskMoney(installments, masked))}
            </p>
          </>
        )}
      </div>
    </section>
  )
}

/** judul kelompok daftar (PLATFORM / PERSONAL / PIUTANG) */
function SectionHeader({ title, helper }: { title: string; helper?: string }) {
  return (
    <div className="mb-2.5 flex items-baseline justify-between gap-3">
      <h3 className="text-[11px] font-black uppercase tracking-[0.22em] text-ink/35">
        {title}
      </h3>
      {helper && <span className="text-[10.5px] text-ink/30">{helper}</span>}
    </div>
  )
}


/* ── 8B: empty state hutang / piutang + kartu perayaan semua lunas ────────── */
function EmptyDebtState({
  view,
  allSettled,
  onAdd,
}: {
  view: DebtView
  allSettled: boolean
  onAdd: () => void
}) {
  /* semua hutang lunas — perayaan khusus, bukan empty state biasa */
  if (allSettled) {
    return (
      <div className="mt-5 flex flex-col items-center overflow-hidden rounded-[1.75rem] bg-gradient-to-br from-sage via-[#ffffff] to-mint-soft/60 px-6 py-10 text-center ring-1 ring-hud-sage/40">
        <motion.span
          initial={{ scale: 0.7, opacity: 0, rotate: -8 }}
          animate={{ scale: 1, opacity: 1, rotate: 0 }}
          transition={{ type: 'spring', stiffness: 160, damping: 14 }}
          className="flex size-16 items-center justify-center rounded-full bg-cream/80 text-hud-sage shadow-[0_18px_36px_-20px_rgba(69,89,78,0.5)] ring-1 ring-hud-sage/30"
        >
          <ShieldCheck className="size-8" strokeWidth={2.2} />
        </motion.span>
        <h2 className="mt-4 font-display text-[17px] font-black tracking-tight text-ink">
          🎉 {ALL_SETTLED_TITLE}
        </h2>
        <p className="mt-1.5 max-w-sm text-[13px] leading-relaxed text-ink/60">
          {ALL_SETTLED_COPY}
        </p>
      </div>
    )
  }

  const piutang = view === 'piutangku'
  return (
    <div className="mt-5 flex flex-col items-center rounded-[1.75rem] border-2 border-dashed border-forest/15 bg-cream/50 px-6 py-10 text-center">
      <span aria-hidden className="text-[28px]">
        {piutang ? '📮' : '🕊️'}
      </span>
      <h2 className="mt-3 font-display text-[16px] font-bold tracking-tight text-ink">
        {piutang ? EMPTY_PIUTANG_TITLE : EMPTY_HUTANG_TITLE}
      </h2>
      <p className="mt-1.5 max-w-sm text-[13px] leading-relaxed text-ink/55">
        {piutang ? EMPTY_PIUTANG_COPY : EMPTY_HUTANG_COPY}
      </p>
      <button
        type="button"
        onClick={onAdd}
        className="mt-5 inline-flex h-11 items-center gap-2 rounded-2xl bg-forest px-5 text-[13.5px] font-semibold text-cream transition-colors hover:bg-forest-soft active:scale-[0.98]"
      >
        <Plus className="size-4" strokeWidth={2.6} />
        {piutang ? EMPTY_PIUTANG_CTA : EMPTY_HUTANG_CTA}
      </button>
    </div>
  )
}

/* ── 7C: DEBT SNOWBALL TRACKER — visual khas halaman ini ────────────────────
   Satu kartu berisi:
   - header progres keseluruhan ('Rp X / Rp Y lunas (Z%)') + bar linier tipis
   - satu bar per hutang platform, DIURUT dari sisa terkecil → terbesar
     (metode bola salju: habisi yang kecil dulu, menang cepat, baru yang besar)
   - label kiri provider + sisa, label kanan '% lunas'
   - baris terkecil diberi penanda "Mulai dari sini" — arah baca yang jelas
   - hutang yang baru lunas: bar jadi sage penuh + confetti + kolaps pegas
   ────────────────────────────────────────────────────────────────────────── */
function SnowballTracker({
  rows,
  progress,
  masked,
  celebrateId,
}: {
  rows: SnowballRow[]
  progress: { paid: number; principal: number; pct: number }
  masked: boolean
  celebrateId: string | null
}) {
  return (
    <section className="relative overflow-hidden rounded-[1.75rem] bg-[#ffffff] p-5 shadow-[0_20px_46px_-30px_rgba(69,89,78,0.5)] ring-1 ring-soil/10 sm:p-6">
      <div
        aria-hidden
        className="pointer-events-none absolute -left-16 -top-20 size-52 rounded-full bg-hud-terracotta/12 blur-3xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-20 -right-10 size-48 rounded-full bg-hud-sage/25 blur-3xl"
      />
      <div className="relative">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="flex items-center gap-1.5 font-display text-[14px] font-bold tracking-tight text-ink">
              <Snowflake className="size-4 text-hud-sage" strokeWidth={2.4} />
              {SNOWBALL_TITLE}
            </h3>
            <p className="mt-1 text-[11px] leading-relaxed text-ink/45">{SNOWBALL_HELP}</p>
          </div>
          <span className="shrink-0 rounded-full bg-hud-sage/25 px-2.5 py-1 text-[10.5px] font-bold text-[#503a3a] tabular-nums">
            {progress.pct}% lunas
          </span>
        </div>

        {/* progres keseluruhan */}
        <p className="mt-3 text-[12px] font-semibold text-ink/70 tabular-nums">
          Snowball Progress: {maskMoney(progress.paid, masked)}/{maskMoney(progress.principal, masked)}{' '}
          lunas
        </p>
        <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-cream ring-1 ring-inset ring-forest/10">
          <motion.span
            initial={false}
            animate={{ width: `${progress.pct}%` }}
            transition={{ type: 'spring', stiffness: 130, damping: 20 }}
            className="relative block h-full rounded-full bg-gradient-to-r from-hud-sage to-[#b5b987]"
          >
            <span aria-hidden className="progress-shimmer" />
          </motion.span>
        </div>

        {/* bar per hutang (urut sisa terkecil) */}
        {rows.length === 0 ? (
          <p className="mt-4 rounded-2xl bg-cream/70 px-3.5 py-3 text-[12px] leading-relaxed text-ink/55">
            {SNOWBALL_EMPTY}
          </p>
        ) : (
          <ul className="mt-4 space-y-3.5">
            {rows.map((row, index) => (
              <SnowballBar
                key={row.debt.id}
                row={row}
                masked={masked}
                first={index === 0}
                celebrate={celebrateId === row.debt.id}
              />
            ))}
          </ul>
        )}
      </div>
    </section>
  )
}


/* ── satu bar gunung es ─────────────────────────────────────────────────────
   Lebar track = ukuran pokok asli (relatif terhadap pokok terbesar), lebar isi
   = sisa hutang. Jadi sekali lihat: "yang ini besar banget, yang ini tinggal
   dikit" — sekaligus kelihatan mana yang paling cepat habis.

   Saat baru lunas: bar jadi sage penuh, confetti meletus, lalu bar MENYUSUT
   ke tinggi 0 dengan pegas — gunung esnya benar-benar "mencair" dan hilang
   dari daftar. */
function SnowballBar({
  row,
  masked,
  first,
  celebrate,
}: {
  row: SnowballRow
  masked: boolean
  first: boolean
  celebrate: boolean
}) {
  const { debt, emoji, provider, widthPct, remainingPct, paidPct } = row
  const done = paidPct >= 100
  const [collapsed, setCollapsed] = useState(false)

  useEffect(() => {
    if (!celebrate) return
    const timer = window.setTimeout(() => setCollapsed(true), 1600)
    return () => window.clearTimeout(timer)
  }, [celebrate])

  return (
    <motion.li
      initial={false}
      animate={collapsed ? { height: 0, opacity: 0 } : { height: 'auto', opacity: 1 }}
      transition={{ type: 'spring', stiffness: 140, damping: 20 }}
      className={cn('relative', collapsed && 'overflow-hidden')}
      style={{ marginBottom: collapsed ? 0 : undefined }}
    >
      {celebrate && <ConfettiBurst />}

      <div className="flex items-center justify-between gap-3">
        <span className="flex min-w-0 items-center gap-2">
          <span aria-hidden className="text-[14px]">
            {emoji}
          </span>
          <span className="min-w-0">
            <span className="block truncate text-[12.5px] font-bold text-ink">{provider}</span>
            <span className="block truncate text-[10.5px] text-ink/45 tabular-nums">
              {done ? 'Lunas! 🎉' : `${maskMoney(debt.remaining, masked)} sisa`}
            </span>
          </span>
        </span>
        <span className="flex shrink-0 items-center gap-2">
          {first && !done && (
            <span className="rounded-full bg-hud-amber/25 px-2 py-0.5 text-[9.5px] font-bold uppercase tracking-wide text-[#b89191]">
              Mulai dari sini
            </span>
          )}
          <span
            className={cn(
              'text-[11.5px] font-bold tabular-nums',
              done ? 'text-[#b5b987]' : 'text-ink/55',
            )}
          >
            {paidPct}% lunas
          </span>
        </span>
      </div>

      {/* bar: sage = porsi lunas, terracotta → amber = sisa yang harus dilumerkan */}
      <div className="mt-2" style={{ width: `${Math.max(widthPct, 22)}%` }}>
        <div className="relative h-3.5 w-full overflow-hidden rounded-full bg-hud-sage/40 ring-1 ring-inset ring-forest/5">
          <motion.span
            initial={false}
            animate={{ width: `${remainingPct}%` }}
            transition={{ type: 'spring', stiffness: 130, damping: 20 }}
            className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-hud-terracotta via-[#ffb885] to-hud-amber"
          >
            <span aria-hidden className="absolute inset-x-0 top-0 h-px bg-cream/35" />
          </motion.span>
          {done && (
            <motion.span
              initial={{ opacity: 0.9 }}
              animate={{ opacity: 1 }}
              className="absolute inset-0 rounded-full bg-gradient-to-r from-hud-sage to-[#b5b987]"
            />
          )}
        </div>
      </div>
    </motion.li>
  )
}

/* ── confetti kecil (tanpa dependensi baru) ─────────────────────────────────
   Dua belas keping kertas palet CatetInd yang meletus dari tengah bar lalu
   memudar ~0.9 detik. Dipakai dua tempat: bar snowball yang lunas dan kartu
   personal yang ditandai lunas (Section 7C & 7E). */
const CONFETTI_PIECES = [
  { x: -46, y: -30, r: -40, color: '#b5b987', delay: 0 },
  { x: -30, y: -46, r: 25, color: '#ffb885', delay: 0.02 },
  { x: -10, y: -52, r: -12, color: '#b89191', delay: 0.03 },
  { x: 12, y: -48, r: 40, color: '#91bb9e', delay: 0.01 },
  { x: 34, y: -38, r: -26, color: '#e6e4c0', delay: 0.04 },
  { x: 48, y: -18, r: 18, color: '#b5b987', delay: 0.02 },
  { x: 46, y: 8, r: -34, color: '#ffb885', delay: 0.05 },
  { x: 28, y: 26, r: 22, color: '#b89191', delay: 0.03 },
  { x: 6, y: 34, r: -18, color: '#b5b987', delay: 0.01 },
  { x: -18, y: 30, r: 36, color: '#91bb9e', delay: 0.04 },
  { x: -38, y: 16, r: -22, color: '#ffb885', delay: 0.02 },
  { x: -48, y: -6, r: 30, color: '#e6e4c0', delay: 0.05 },
]

function ConfettiBurst() {
  return (
    <span aria-hidden className="pointer-events-none absolute inset-0 z-20">
      {CONFETTI_PIECES.map((piece, index) => (
        <motion.span
          key={index}
          initial={{ x: 0, y: 0, opacity: 0, scale: 0.4, rotate: 0 }}
          animate={{
            x: piece.x,
            y: piece.y,
            opacity: [0, 1, 1, 0],
            scale: [0.4, 1, 1, 0.8],
            rotate: piece.r,
          }}
          transition={{ duration: 1, delay: piece.delay, ease: 'easeOut' }}
          className="absolute left-1/4 top-1/2 size-2 rounded-[2px]"
          style={{ backgroundColor: piece.color }}
        />
      ))}
    </span>
  )
}


/* ── 7D: kartu hutang platform ──────────────────────────────────────────────
   Geser KANAN → tombol sage "Catat Bayar" (aksi utama, seperti geser-kanan
   menandai lunas di halaman Tagihan). Tap → detail perhitungan otomatis:
   sisa pokok, sudah dibayar, estimasi total bunga, dan riwayat pembayaran. */
function PlatformDebtCard({
  debt,
  masked,
  delay,
  onPay,
}: {
  debt: Debt
  masked: boolean
  delay: number
  onPay: () => void
}) {
  const [expanded, setExpanded] = useState(false)
  const [dx, setDx] = useState(0)
  const [dragging, setDragging] = useState(false)
  const startX = useRef<number | null>(null)
  const moved = useRef(false)

  const paidPct = debtPaidPct(debt)
  const paid = debtPaid(debt)
  const interest = estimatedInterest(debt)
  const done = paidPct >= 100

  const onPointerDown = (event: React.PointerEvent<HTMLButtonElement>) => {
    startX.current = event.clientX
    moved.current = false
    event.currentTarget.setPointerCapture(event.pointerId)
  }

  const onPointerMove = (event: React.PointerEvent<HTMLButtonElement>) => {
    if (startX.current === null) return
    const distance = event.clientX - startX.current
    if (Math.abs(distance) > 6) {
      moved.current = true
      setDragging(true)
    }
    setDx(Math.max(0, Math.min(REVEAL_PAY, distance)))
  }

  const settle = () => {
    if (startX.current === null) return
    startX.current = null
    setDragging(false)
    setDx((value) => (value > SNAP ? REVEAL_PAY : 0))
  }

  const handleClick = () => {
    if (moved.current) {
      moved.current = false
      setDx(0)
      return
    }
    setExpanded((prev) => !prev)
  }

  return (
    <motion.li
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.34, delay, ease: [0.22, 1, 0.36, 1] }}
      className="relative"
    >
      {/* aksi di balik kartu (terungkap saat digeser kanan) */}
      <div className="absolute inset-y-0 left-0 flex overflow-hidden rounded-[1.35rem]">
        <button
          type="button"
          onClick={() => {
            setDx(0)
            onPay()
          }}
          className="flex w-[116px] flex-col items-center justify-center gap-1 bg-hud-sage text-[10.5px] font-bold text-[#503a3a] transition-colors hover:brightness-105"
        >
          <Wallet className="size-4" strokeWidth={2.4} />
          Catat Bayar
        </button>
      </div>

      <motion.button
        type="button"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={settle}
        onPointerCancel={settle}
        onClick={handleClick}
        aria-expanded={expanded}
        aria-label={`${debt.provider}, sisa ${maskMoney(debt.remaining, masked)}`}
        animate={{ x: dx }}
        transition={dragging ? { duration: 0 } : { type: 'spring', stiffness: 320, damping: 30 }}
        style={{ touchAction: 'pan-y' }}
        className="relative w-full cursor-pointer touch-pan-y rounded-[1.35rem] bg-cream px-3.5 py-3.5 text-left shadow-[0_10px_28px_-24px_rgba(69,89,78,0.6)] ring-1 ring-soil/10 outline-none focus-visible:ring-2 focus-visible:ring-forest/30"
      >
        <span className="flex items-center gap-3">
          <span
            aria-hidden
            className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-cream text-[17px] ring-1 ring-inset ring-soil/8"
          >
            {providerEmoji(debt.provider)}
          </span>
          <span className="min-w-0 flex-1">
            <span className="flex items-center gap-1.5">
              <span className="truncate text-[13.5px] font-bold text-ink">{debt.provider}</span>
              {done && (
                <span className="shrink-0 rounded-full bg-hud-sage/30 px-2 py-0.5 text-[9.5px] font-bold uppercase tracking-wide text-[#503a3a]">
                  Lunas
                </span>
              )}
            </span>
            <span className="mt-1 block truncate text-[10.5px] text-ink/45 tabular-nums">
              Bulan {debt.currentMonth}/{debt.tenor} · Cicilan{' '}
              {maskMoney(debt.monthlyInstallment ?? 0, masked)}/bln · Bunga{' '}
              {debt.interestRate ?? 0}%
            </span>
            <span className="mt-0.5 block truncate text-[10.5px] text-ink/40">
              Jatuh tempo tanggal {debt.dueDate}
            </span>
          </span>
          <span className="flex shrink-0 flex-col items-end">
            <span className="text-[13.5px] font-bold text-ink tabular-nums">
              {maskMoney(debt.remaining, masked)}
            </span>
            <span className="mt-0.5 text-[10.5px] text-ink/40 tabular-nums">
              dari {maskMoney(debt.principal, masked)}
            </span>
            <ChevronDown
              className={cn(
                'mt-1 size-3.5 text-ink/30 transition-transform duration-300',
                expanded && 'rotate-180',
              )}
              strokeWidth={2.4}
            />
          </span>
        </span>

        {/* progres pembayaran: terracotta (sisa) → sage (lunas) */}
        <span className="mt-3 flex h-2 w-full overflow-hidden rounded-full bg-hud-sage/40 ring-1 ring-inset ring-forest/5">
          <motion.span
            initial={false}
            animate={{ width: `${100 - paidPct}%` }}
            transition={{ type: 'spring', stiffness: 130, damping: 20 }}
            className="h-full rounded-full bg-gradient-to-r from-hud-terracotta to-hud-amber"
          />
        </span>
      </motion.button>


      {/* detail perhitungan otomatis (tap kartu) */}
      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            key="platform-detail"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.26, ease: [0.22, 1, 0.36, 1] }}
            className="overflow-hidden"
          >
            <div className="mt-2 rounded-[1.35rem] bg-cream/70 px-3.5 py-3.5 ring-1 ring-inset ring-soil/8">
              <dl className="space-y-2 text-[11.5px]">
                <div className="flex items-center justify-between gap-3">
                  <dt className="text-ink/50">Sisa pokok</dt>
                  <dd className="font-bold text-ink tabular-nums">
                    {maskMoney(debt.remaining, masked)}
                  </dd>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <dt className="text-ink/50">Sudah dibayar</dt>
                  <dd className="font-bold text-[#b5b987] tabular-nums">
                    {maskMoney(paid, masked)}
                  </dd>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <dt className="text-ink/50">Estimasi total bunga</dt>
                  <dd className="font-bold text-hud-terracotta tabular-nums">
                    {maskMoney(interest, masked)}
                  </dd>
                </div>
                {debt.notes && (
                  <div className="flex items-start justify-between gap-3">
                    <dt className="shrink-0 text-ink/50">Catatan</dt>
                    <dd className="text-right text-ink/70">{debt.notes}</dd>
                  </div>
                )}
              </dl>

              {/* riwayat pembayaran — TODO: ambil dari tabel debt_payments
                  (debt_id, amount, payment_date, wallet_id) lewat Supabase */}
              <p className="mt-3 text-[10px] leading-relaxed text-ink/35">
                Riwayat pembayaran akan tampil di sini setelah terhubung ke
                <span className="mx-1 font-semibold text-ink/50">debt_payments</span>.
              </p>

              <button
                type="button"
                onClick={onPay}
                className="mt-3 flex w-full items-center justify-center gap-2 rounded-2xl bg-forest py-3 text-[12.5px] font-semibold text-mint transition-colors hover:bg-forest-soft active:scale-[0.99]"
              >
                <Wallet className="size-3.5" strokeWidth={2.6} />
                Catat Bayar
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.li>
  )
}

/* ── 7D: sheet kecil "Catat Bayar" ──────────────────────────────────────────
   Nominal sudah terisi otomatis sebesar cicilan bulanan (user tinggal
   menyesuaikan kalau bayar lebih), plus tanggal & sumber dompet. Submit
   memicu bar snowball menyusut — jadi pembayaran bukan cuma catatan mati. */
function PayDebtSheet({
  debt,
  masked,
  onClose,
  onConfirm,
}: {
  debt: Debt | null
  masked: boolean
  onClose: () => void
  onConfirm: (amount: number, date: string, wallet: string) => void
}) {
  const [digits, setDigits] = useState('')
  const [date, setDate] = useState('')
  const [wallet, setWallet] = useState(WALLET_SOURCE_OPTIONS[0].id)

  useEffect(() => {
    if (!debt) return
    setDigits(String(debt.monthlyInstallment ?? debt.remaining))
    setDate(WEALTH_TODAY_ISO)
    setWallet(WALLET_SOURCE_OPTIONS[0].id)
  }, [debt])

  const amount = Number(digits || '0')
  const remaining = debt?.remaining ?? 0

  return (
    <BudgetSheet
      open={debt !== null}
      onClose={onClose}
      title={debt ? `Catat Bayar ${debt.provider}` : 'Catat Bayar'}
      description="Pembayaran langsung mengurangi sisa hutang di snowball tracker."
      footer={
        <SheetSubmit onClick={() => onConfirm(amount, date, wallet)} disabled={amount <= 0}>
          Simpan Pembayaran ✓
        </SheetSubmit>
      }
    >
      <RupiahField
        label="Nominal dibayar"
        digits={digits}
        onDigitsChange={setDigits}
        placeholder="Rp 550.000"
        size="lg"
      />

      {amount > 0 && (
        <p className="mt-3 rounded-2xl bg-sage/60 px-4 py-3 text-[12px] leading-relaxed text-ink/70">
          Sisa setelah pembayaran ini:{' '}
          <b className="font-bold text-forest tabular-nums">
            {maskMoney(Math.max(0, remaining - amount), masked)}
          </b>
          {amount >= remaining && ' — hutang ini langsung LUNAS! 🎉'}
        </p>
      )}

      <DateField value={date} onChange={setDate} label="Tanggal pembayaran" />

      <div className="mt-4">
        <span className="text-[13px] font-semibold leading-snug text-ink">Dompet sumber</span>
        <ChoicePills
          className="mt-2"
          ariaLabel="Dompet sumber pembayaran"
          options={WALLET_SOURCE_OPTIONS.map((option) => ({
            id: option.id,
            label: option.label,
          }))}
          value={wallet}
          onChange={setWallet}
        />
      </div>
    </BudgetSheet>
  )
}


/* ── 7E: kelompok hutang personal (dipisah dari platform) ───────────────────
   Copy-nya sengaja nurturing (PRD 2E.2): "Catat aja biar gak lupa, bukan buat
   ngejar-ngejar ya 😊". Hutang personal bukan produk kredit — jadi tidak ada
   bunga, tenor, atau badge menakutkan di sini, cuma arah, nama, nominal. */
function PersonalSection({
  title,
  active,
  settled,
  masked,
  onSettle,
}: {
  title: string
  active: Debt[]
  settled: Debt[]
  masked: boolean
  onSettle: (debt: Debt) => void
}) {
  const [burst, setBurst] = useState(false)
  const timer = useRef<number | null>(null)

  useEffect(
    () => () => {
      if (timer.current) window.clearTimeout(timer.current)
    },
    [],
  )

  /** confetti kecil 1.5 detik — dirayakan di level section supaya tetap
   *  terlihat walau kartunya langsung pindah ke grup "sudah lunas" */
  const celebrate = (debt: Debt) => {
    setBurst(true)
    if (timer.current) window.clearTimeout(timer.current)
    timer.current = window.setTimeout(() => setBurst(false), 1500)
    onSettle(debt)
  }

  return (
    <section className="relative">
      <SectionHeader title={title} />
      <p className="mb-2.5 text-[11px] leading-relaxed text-ink/40">{PERSONAL_SECTION_COPY}</p>

      {burst && <ConfettiBurst />}

      {active.length === 0 ? (
        <p className="rounded-2xl bg-cream/70 px-3.5 py-3 text-[11.5px] leading-relaxed text-ink/45">
          {title === 'PIUTANG' ? 'Belum ada piutang aktif 🌿' : 'Belum ada hutang personal aktif 🌿'}
        </p>
      ) : (
        <ul className="space-y-2.5">
          {active.map((debt, index) => (
            <PersonalDebtCard
              key={debt.id}
              debt={debt}
              masked={masked}
              settled={false}
              delay={0.03 * index}
              onSettle={() => celebrate(debt)}
            />
          ))}
        </ul>
      )}

      {/* yang sudah lunas diletakkan paling bawah, dibiarkan samar */}
      {settled.length > 0 && (
        <>
          <p className="mb-2 mt-4 text-[10.5px] font-bold uppercase tracking-[0.18em] text-ink/25">
            Sudah Lunas
          </p>
          <ul className="space-y-2 opacity-60">
            {settled.map((debt, index) => (
              <PersonalDebtCard
                key={debt.id}
                debt={debt}
                masked={masked}
                settled
                delay={0.03 * index}
                onSettle={() => undefined}
              />
            ))}
          </ul>
        </>
      )}
    </section>
  )
}

/* ── kartu hutang personal (dua arah) ───────────────────────────────────────
   Ikon panah menunjukkan arah uang: panah masuk (sage) = dia yang hutang ke
   aku, panah keluar (terracotta) = aku yang hutang. Kartu lunas dapat pita sage,
   nominal dicoret, dan stempel diagonal — pola yang sama dengan halaman
   Tagihan supaya "lunas" terasa sama di seluruh app. */
function PersonalDebtCard({
  debt,
  masked,
  settled,
  delay,
  onSettle,
}: {
  debt: Debt
  masked: boolean
  settled: boolean
  delay: number
  onSettle: () => void
}) {
  const incoming = debtPointsToMe(debt)

  return (
    <motion.li
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.34, delay, ease: [0.22, 1, 0.36, 1] }}
      className={cn(
        'relative flex items-center gap-3 overflow-hidden rounded-[1.35rem] bg-cream px-3.5 py-3.5 ring-1',
        settled ? 'ring-soil/8' : 'shadow-[0_10px_28px_-24px_rgba(69,89,78,0.6)] ring-soil/10',
      )}
    >
      {settled && <LunasStamp />}

      <span
        aria-hidden
        className={cn(
          'flex size-10 shrink-0 items-center justify-center rounded-2xl ring-1 ring-inset',
          incoming
            ? 'bg-hud-sage/25 text-[#503a3a] ring-hud-sage/30'
            : 'bg-hud-terracotta/12 text-[#b89191] ring-hud-terracotta/20',
        )}
      >
        {incoming ? (
          <ArrowDownLeft className="size-[18px]" strokeWidth={2.4} />
        ) : (
          <ArrowUpRight className="size-[18px]" strokeWidth={2.4} />
        )}
      </span>

      <span className="min-w-0 flex-1">
        <span
          className={cn(
            'block truncate text-[13px] font-semibold',
            settled ? 'text-ink/50 line-through' : 'text-ink',
          )}
        >
          {counterpartyLabel(debt)}
        </span>
        {debt.notes && (
          <span className={cn('mt-0.5 block truncate text-[11px]', settled ? 'text-ink/30' : 'text-ink/45')}>
            {debt.notes}
          </span>
        )}
      </span>

      <span className="flex shrink-0 flex-col items-end gap-1.5">
        <span
          className={cn(
            'text-[13.5px] font-bold tabular-nums',
            settled ? 'text-ink/40 line-through' : 'text-ink',
          )}
        >
          {maskMoney(settled ? debt.principal : debt.remaining, masked)}
        </span>
        {settled ? (
          <span className="rounded-full bg-hud-sage/30 px-2 py-0.5 text-[9.5px] font-bold uppercase tracking-wide text-[#503a3a]">
            Lunas
          </span>
        ) : (
          <button
            type="button"
            onClick={onSettle}
            className="inline-flex items-center gap-1 rounded-full bg-hud-sage px-2.5 py-1 text-[10.5px] font-bold text-[#503a3a] transition-colors hover:brightness-105 active:scale-95"
          >
            <Check className="size-3" strokeWidth={3} />
            Tandai Lunas
          </button>
        )}
      </span>
    </motion.li>
  )
}


/* ── atom lokal halaman ini ───────────────────────────────────────────────── */

/** stempel LUNAS diagonal ala halaman Tagihan (olive, tepi bertitik) */
function LunasStamp() {
  return (
    <span
      aria-hidden
      className="pointer-events-none absolute right-3 top-1/2 z-10 -translate-y-1/2 -rotate-12 select-none rounded-md border-2 border-hud-sage px-2 py-0.5 font-display text-[11px] font-black uppercase leading-tight tracking-[0.22em] text-hud-sage opacity-25 after:absolute after:inset-[2.5px] after:rounded-[3px] after:border after:border-dashed after:border-hud-sage/45"
    >
      LUNAS
    </span>
  )
}

/** field tanggal: label custom + input date native transparan di atasnya */
function DateField({
  value,
  onChange,
  label,
}: {
  value: string
  onChange: (value: string) => void
  label: string
}) {
  return (
    <div className="mt-4">
      <span className="text-[13px] font-semibold leading-snug text-ink">{label}</span>
      <span className="relative mt-2 flex items-center gap-2 rounded-2xl bg-cream px-4 py-3 ring-1 ring-soil/16 focus-within:ring-2 focus-within:ring-forest/35">
        <Wallet className="size-4 shrink-0 text-ink/30" strokeWidth={2.2} />
        <span className="flex-1 text-[14px] font-semibold tabular-nums text-ink">
          {formatSheetDate(value)}
        </span>
        <Check className="size-4 shrink-0 text-hud-sage" strokeWidth={3} />
        <input
          type="date"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          aria-label={label}
          className="absolute inset-0 size-full cursor-pointer rounded-2xl opacity-0"
        />
      </span>
    </div>
  )
}

/** `25 Sep 2026` — tanggal ringkas untuk field sheet */
function formatSheetDate(iso: string): string {
  if (!iso) return 'Pilih tanggal'
  const [year, month, day] = iso.split('-').map(Number)
  const months = [
    'Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun',
    'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des',
  ]
  return `${day} ${months[(month ?? 1) - 1]} ${year}`
}

