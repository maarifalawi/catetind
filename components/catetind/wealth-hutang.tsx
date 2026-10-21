'use client'

import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import {
  ArrowDownLeft,
  ArrowRight,
  ArrowUpRight,
  Check,
  ChevronDown,
  HandCoins,
  MoreVertical,
  Pencil,
  Plus,
  Receipt,
  ShieldCheck,
  Snowflake,
  Trash2,
  Wallet,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { MenuOption, MenuPanel } from './menu-panel'
import { BudgetSheet, ChoicePills, RupiahField, SheetSubmit, DateField as SheetDateField } from './budget-sheet'
import {
  ALL_SETTLED_COPY,
  HUTANG_ZERO_LINE,
  PIUTANG_ZERO_LINE,
  ALL_SETTLED_TITLE,
  EMPTY_HUTANG_COPY,
  EMPTY_HUTANG_CTA,
  EMPTY_HUTANG_TITLE,
  EMPTY_PIUTANG_COPY,
  EMPTY_PIUTANG_CTA,
  EMPTY_PIUTANG_TITLE,
  PAYMENT_HISTORY_EMPTY,
  PAYMENT_HISTORY_EMPTY_HINT,
  PAYMENT_HISTORY_TITLE,
  PERSONAL_EMPTY_LINE,
  SNOWBALL_PROGRESS_ARIA,
  SNOWBALL_TITLE,
  DTI_UNKNOWN_COPY,
  DEBT_STATUS_COPY,
  WEALTH_ROW_ACTION,
  WEALTH_TODAY_ISO,
  allDebtsSettled,
  counterpartyLabel,
  debtName,
  debtPointsToMe,
  dtiBadge,
  dtiRatio,
  formatShortDate,
  maskMoney,
  paymentCountLabel,
  paymentsOfDebt,
  personalDebts,
  platformDebts,
  snowballProgress,
  snowballRows,
  totalMonthInstallments,
  type Debt,
  type DebtPayment,
  type DebtView,
  type SnowballRow,
} from '@/lib/data/wealth'
import { CONTEXT_EMPTY_COPY, CONTEXT_LABEL } from '@/lib/data/money-context'
import { useTodayISO } from '@/lib/use-today-iso'
import {
  DEBT_CASH_COPY,
  cashDirectionOf,
  defaultCashAmount,
  planDebtSettlement,
  settlementCounterparty,
  type CashDirection,
} from '@/lib/data/wealth-cash'

/* ── TAB 3 — HUTANG / DEBT MANAGER (Section 7) ──────────────────────────────
   Halaman ini TIDAK menampilkan daftar hutang biasa. Dua ide besarnya:

   1. DEBT SNOWBALL TRACKER (7C) — hutang platform digambar sebagai gunung es
      yang dilumerkan: bar diurut dari sisa TERKECIL (metode bola salju), porsi
      terracotta = sisa, porsi sage = yang sudah lunas. Begitu satu hutang
      lunas, barnya meluncur ke sage penuh + confetti + menyusut dengan pegas.
      Ini yang membuat melunasi hutang terasa seperti menamatkan level game,
      bukan membayar tagihan.

      Sejak redesain ini, baris snowball JUGA daftar hutangnya: provider,
      konteks, sisa, jatuh tempo, pil "Catat Bayar", dan menu "…" hidup di satu
      baris. Section PLATFORM kedua yang mengulang data yang sama sudah dihapus,
      begitu pula badge "Mulai dari sini", label "% lunas" per baris, dan
      subtitle onboarding "Lunasi dari yang terkecil dulu."

   2. DTI yang jujur tapi tidak menghakimi (7B) — cicilan platform dibanding
      pemasukan bulanan, dengan tiga nada kanon (sage / amber / terracotta).
      Terracotta BUKAN merah: PRD 2E.2 sengaja memilih warna hangat + copy
      empatik supaya tidak memicu financial anxiety. Badge DTI adalah sinyal
      utama; "Cicilan …/bln" menempel sebagai sub-label redup.

   Cicilan platform juga dinyatakan terang-terangan: uangnya sudah dipotong dari
   Jatah Harian (Domain 2B) — user tahu ke mana income pool pergi sebelum
   dana bagi-bagi harian.

   Sejak paket 17, tiap baris hutang platform memuat RIWAYAT PEMBAYARAN
   (`debt_payments`) saat dibuka: tanggal + dompet sumber tiap pembayaran. Dulu
   tempatnya hanya paragraf janji "akan tampil di sini" — sekarang setiap baris
   adalah pembayaran nyata, termasuk yang baru dicatat lewat "Catat Bayar".

   Sejak paket 41, "Catat Bayar" dan "Diterima" BENAR-BENAR menggerakkan kas:
   dompet yang dipilih didebit/dikredit lewat `lib/money/store.ts`
   (`postDebtSettlement`), jadi pelunasan tidak lagi menaikkan Net Worth tanpa
   uang keluar (temuan audit #1). Pilihan dompetnya datang dari ledger yang asli
   (`walletOptions`), bukan daftar mock — dulu daftar itu memuat "OVO" yang tidak
   ada di ledger, sehingga memilihnya berarti hutang "lunas" tanpa uang pindah.

   Sejak paket 61 setiap kartu PERSONAL punya BARIS AKSI yang selalu terlihat
   (`DebtActionRow`): aksi uang, Edit, dan Hapus — bukan lagi aksi yang harus
   ditebak lewat gestur atau dibuka dengan expand. Yang menulis ke store tetap
   halaman (`wealth-screen.tsx`), termasuk dialog konfirmasi & jendela Undo.
   ────────────────────────────────────────────────────────────────────────── */

export function WealthHutang({
  debts,
  payments,
  view,
  onChangeView,
  masked,
  monthlyIncome,
  celebrateId,
  walletOptions,
  onAddDebt,
  onPayDebt,
  onEditDebt,
  onDeleteDebt,
  emptyContextLine,
}: {
  debts: Debt[]
  /** ledger pembayaran hutang (`debt_payments`) — riwayat per hutang diturunkan dari sini */
  payments: DebtPayment[]
  view: DebtView
  onChangeView: (view: DebtView) => void
  masked: boolean
  /** pemasukan bulanan — pembagi rasio DTI (sinkron Daily HUD / Domain 2B) */
  monthlyIncome: number
  /** id hutang yang barnya baru saja lunas — memicu confetti + kolaps */
  celebrateId: string | null
  /** dompet dari ledger (BCA, GoPay, Tunai, dompet buatan user) + saldonya */
  walletOptions: { id: string; label: string; balance: number }[]
  onAddDebt: () => void
  /**
   * Aksi uang: `amount` = nominal yang diserahkan/diterima, `walletId` = dompet
   * yang benar-benar tersentuh. Mengembalikan `true` kalau baris ledger berhasil
   * ditulis — kalau `false` (saldo kurang / nominal tidak sah) sheet TETAP terbuka
   * supaya user bisa membetulkan, bukan ditutup seolah berhasil.
   */
  onPayDebt: (debt: Debt, amount: number, date: string, walletId: string) => boolean
  /**
   * Buka sheet EDIT untuk catatan ini (paket 61). Dulu `editDebt()` ada di store
   * tanpa satu pun tombol, jadi salah ketik = angka salah selamanya.
   */
  onEditDebt: (debt: Debt) => void
  /**
   * Minta konfirmasi hapus catatan ini (paket 61). Halaman yang memegang dialog
   * & jendela Undo — komponen ini tidak menghapus apa pun sendiri.
   */
  onDeleteDebt: (debt: Debt) => void
  /**
   * Judul empty state khusus konteks uang (paket 47) — diteruskan halaman
   * Kekayaan HANYA kalau daftar kosong karena penyaring konteks, bukan karena
   * user memang belum punya catatan hutang/piutang.
   */
  emptyContextLine?: string
}) {
  const [payTarget, setPayTarget] = useState<Debt | null>(null)

  /* Hutang yang BARU lunas tetap digambar selama perayaannya berjalan (paket 50):
     pelunasan langsung tersimpan di store, jadi tanpa `keepId` bar-nya hilang
     sebelum animasi "mencair" + confetti terlihat (lihat `snowballRows`). */
  const rows = snowballRows(debts, celebrateId)
  const progress = snowballProgress(debts)
  const installments = totalMonthInstallments(debts)
  const ratio = dtiRatio(installments, monthlyIncome)
  /**
   * true = pemasukan bulanan user sudah diatur (paket 57).
   *
   * Kalau belum, `dtiRatio()` bernilai 0 — dan menampilkan "DTI 0% — Sehat"
   * adalah klaim aman tanpa dasar. Kartunya berpindah ke label "Belum bisa
   * dihitung" + satu kalimat jalan keluar (`DTI_UNKNOWN_COPY`).
   */
  const dtiKnown = monthlyIncome > 0
  const badge = dtiBadge(ratio)
  const badgeLabel = dtiKnown ? badge.label : DTI_UNKNOWN_COPY.label
  const badgeCopy = dtiKnown ? badge.copy : DTI_UNKNOWN_COPY.copy
  const badgePillClass = dtiKnown ? badge.pillClassName : 'bg-sage/40 text-forest/60 ring-soil/12'
  const mine = personalDebts(debts, 'owed_by_me')
  const theirs = personalDebts(debts, 'owed_to_me')
  const myPlatform = platformDebts(debts)
  /**
   * true = ada bar snowball yang sedang mencair untuk hutang yang sudah lunas.
   * Keadaan itu SENGAJA dihitung sebagai "belum kosong": kartu perayaan
   * "Semua hutangmu LUNAS!" baru muncul setelah animasinya selesai (halaman
   * melepas `celebrateId` setelah SETTLE_DELAY) — persis ritme lama, waktu
   * statusnya masih ditahan di halaman.
   */
  const melting =
    celebrateId !== null &&
    rows.some((row) => row.debt.id === celebrateId && row.debt.status === 'settled')
  const isEmpty =
    (view === 'hutangku'
      ? myPlatform.length === 0 && mine.active.length === 0
      : theirs.active.length === 0) && !melting
  const settled = allDebtsSettled(debts)


  return (
    <div className="flex flex-col gap-5">
      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={view}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
          className="flex flex-col gap-5"
        >
          {/* Baris metrik: DTI adalah badge UTAMA (satu-satunya sinyal status),
              cicilan bulanan jadi sub-label redup di sampingnya. Dulu keduanya
              berbagi satu baris tanpa hierarki — mata tidak tahu mana yang
              harus dibaca dulu. Tanpa total: totalnya sudah jadi fokus di
              kepala kartu panel (wealth-screen). */}
          <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1.5">
            <span
              title={badgeCopy}
              className={cn(
                'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10.5px] font-medium ring-1 ring-inset',
                badgePillClass,
              )}
            >
              {dtiKnown ? `DTI ${ratio}% · ${badgeLabel}` : badgeLabel}
            </span>
            <span className="text-[11px] font-medium text-forest/45 tabular-nums">
              Cicilan {maskMoney(installments, masked)}/bln
            </span>
          </div>

          {isEmpty ? (
            <EmptyDebtState
              view={view}
              allSettled={settled && view === 'hutangku'}
              onAdd={onAddDebt}
              contextLine={emptyContextLine}
            />
          ) : (
            <div className="flex flex-col gap-5">
              {/* ── 7C + 7D: Debt Snowball Tracker = daftar hutang platform ──
                  Satu kartu, satu baris per hutang. Aksi "Catat Bayar" dan
                  menu "…" menempel di barisnya sendiri (pola halaman Tagihan),
                  jadi section PLATFORM yang dulu mengulang provider, sisa, dan
                  jatuh tempo yang sama sudah tidak ada. Kartu hanya muncul
                  kalau memang ada hutang platform. */}
              {view === 'hutangku' && rows.length > 0 && (
                <SnowballTracker
                  rows={rows}
                  progress={progress}
                  payments={payments}
                  masked={masked}
                  celebrateId={celebrateId}
                  onPay={setPayTarget}
                  onEdit={onEditDebt}
                  onDelete={onDeleteDebt}
                />
              )}

              {/* ── 7E: daftar hutang personal (selalu terpisah) ─────── */}
              <PersonalSection
                title={view === 'hutangku' ? 'PERSONAL' : 'PIUTANG'}
                active={view === 'hutangku' ? mine.active : theirs.active}
                settled={view === 'hutangku' ? mine.settled : theirs.settled}
                masked={masked}
                celebrateId={celebrateId}
                onCash={setPayTarget}
                onAdd={onAddDebt}
                onEdit={onEditDebt}
                onDelete={onDeleteDebt}
              />
            </div>
          )}
        </motion.div>
      </AnimatePresence>

      <DebtCashSheet
        debt={payTarget}
        masked={masked}
        walletOptions={walletOptions}
        onClose={() => setPayTarget(null)}
        onConfirm={(amount, date, wallet) => {
          /* uang benar-benar bergerak di sini: store menulis baris ledger
             (`debt_payment`/`receivable_payment` + `change` bila lebih bayar).
             Kalau ditolak (saldo kurang / nominal tidak sah) sheet tetap terbuka
             — user harus melihat kenapa, bukan dibiarkan mengira sudah tercatat. */
          if (!payTarget) return false
          const ok = onPayDebt(payTarget, amount, date, wallet)
          if (ok) setPayTarget(null)
          return ok
        }}
      />
    </div>
  )
}

/* SegmentedControl DIHAPUS — toggle Hutang/Piutang kini hidup di kepala kartu
   panel (`PanelToggle` di wealth-screen) supaya kartu Kekayaan | Hutang simetris. */
/* SummaryCard DIHAPUS — total & DTI dulu diulang di sini; sekarang totalnya di
   kepala kartu panel dan DTI jadi baris mikro di `WealthHutang`. */

/** judul kelompok daftar (PERSONAL / PIUTANG) */
function SectionHeader({ title }: { title: string }) {
  return (
    <h3 className="mb-2.5 text-[11px] font-semibold uppercase tracking-[0.22em] text-forest/35">
      {title}
    </h3>
  )
}


/* ── 8B: empty state hutang / piutang + kartu perayaan semua lunas ────────── */
function EmptyDebtState({
  view,
  allSettled,
  onAdd,
  contextLine,
}: {
  view: DebtView
  allSettled: boolean
  onAdd: () => void
  /**
   * Judul khusus konteks (paket 47) — diisi HANYA kalau user punya hutang/piutang
   * tapi tidak satu pun di konteks aktif, supaya tab kosong tetap punya
   * penjelasan ("Belum ada hutang di konteks Bersama").
   */
  contextLine?: string
}) {
  /* semua hutang lunas — perayaan khusus, bukan empty state biasa */
  if (allSettled) {
    return (
      <div className="mt-5 flex flex-col items-center overflow-hidden rounded-[1.75rem] bg-gradient-to-br from-sage via-cream to-mint-soft/60 px-6 py-10 text-center ring-1 ring-hud-sage/40">
        <motion.span
          initial={{ scale: 0.7, opacity: 0, rotate: -8 }}
          animate={{ scale: 1, opacity: 1, rotate: 0 }}
          transition={{ type: 'spring', stiffness: 160, damping: 14 }}
          className="flex size-16 items-center justify-center rounded-full bg-cream/80 text-hud-sage shadow-[0_18px_36px_-20px_rgba(0,0,0,0.5)] ring-1 ring-hud-sage/30"
        >
          <ShieldCheck className="size-8" strokeWidth={2.2} />
        </motion.span>
        <h2 className="mt-4 font-display text-[17px] font-semibold tracking-tight text-forest">
          🎉 {ALL_SETTLED_TITLE}
        </h2>
        <p className="mt-1.5 max-w-sm text-[13px] leading-relaxed text-forest/60">
          {ALL_SETTLED_COPY}
        </p>
      </div>
    )
  }

  const piutang = view === 'piutangku'

  /* H8-4 (audit UI/UX): kalau memang belum ada catatan sama sekali, section
     ini cukup SATU baris positif + "Tambah" sebagai text link — jangan
     sisakan kotak besar kosong. Kasus "konteks aktif kosong" tetap pakai
     kartu penjelasan di bawah karena ia butuh menjelaskan sebabnya. */
  if (!contextLine) {
    return (
      <div className="mt-4 flex flex-wrap items-center justify-between gap-2 rounded-2xl bg-mint/15 px-4 py-3 ring-1 ring-forest/10">
        <p className="text-[13px] font-medium text-forest">
          {piutang ? PIUTANG_ZERO_LINE : HUTANG_ZERO_LINE}
        </p>
        <button
          type="button"
          onClick={onAdd}
          className="text-[12.5px] font-medium text-forest underline decoration-dotted underline-offset-4 transition-colors hover:decoration-forest"
        >
          {piutang ? EMPTY_PIUTANG_CTA : EMPTY_HUTANG_CTA}
        </button>
      </div>
    )
  }

  return (
    <div className="mt-5 flex flex-col items-center rounded-[1.75rem] border-2 border-dashed border-forest/15 bg-cream/50 px-6 py-10 text-center">
      <span aria-hidden className="text-[28px]">
        {piutang ? '📮' : '🕊️'}
      </span>
      <h2 className="mt-3 font-display text-[16px] font-semibold tracking-tight text-forest">
        {contextLine ?? (piutang ? EMPTY_PIUTANG_TITLE : EMPTY_HUTANG_TITLE)}
      </h2>
      {/* empty state per konteks: judul + satu tombol saja. Paragraf penjelas
          "apa itu konteks" dihapus — konteksnya sudah aktif di kepala halaman. */}
      {!contextLine && (
        <p className="mt-1.5 max-w-sm text-[13px] leading-relaxed text-forest/55">
          {piutang ? EMPTY_PIUTANG_COPY : EMPTY_HUTANG_COPY}
        </p>
      )}
      <button
        type="button"
        onClick={onAdd}
        className="mt-5 inline-flex h-11 items-center gap-2 rounded-2xl bg-forest px-5 text-[13.5px] font-medium text-cream transition-colors hover:bg-forest-soft active:scale-[0.98]"
      >
        <Plus className="size-4" strokeWidth={2.6} />
        {contextLine
          ? CONTEXT_EMPTY_COPY.debts.cta
          : piutang
            ? EMPTY_PIUTANG_CTA
            : EMPTY_HUTANG_CTA}
      </button>
    </div>
  )
}

/* ── 7C: DEBT SNOWBALL TRACKER — sekaligus DAFTAR hutang platform ───────────
   Satu kartu berisi:
   - header progres keseluruhan: bar tipis dengan nominal DIBAYAR di ujung kiri
     dan TOTAL POKOK di ujung kanan (tanpa label teks "lunas" — panjang bar
     sudah menyatakan progresnya)
   - satu baris per hutang platform, DIURUT dari sisa terkecil → terbesar
     (metode bola salju: habisi yang kecil dulu, menang cepat, baru yang besar)
   - tiap baris membawa aksinya sendiri: "Catat Bayar" (pil kanan) + menu "…"
     berisi Edit/Hapus, persis pola halaman Tagihan
   - hutang yang baru lunas: bar jadi sage penuh + confetti + kolaps pegas
   ────────────────────────────────────────────────────────────────────────── */
function SnowballTracker({
  rows,
  progress,
  payments,
  masked,
  celebrateId,
  onPay,
  onEdit,
  onDelete,
}: {
  rows: SnowballRow[]
  progress: { paid: number; principal: number; pct: number }
  /** ledger pembayaran — riwayat tiap hutang diturunkan dari daftar yang sama */
  payments: DebtPayment[]
  masked: boolean
  celebrateId: string | null
  onPay: (debt: Debt) => void
  onEdit: (debt: Debt) => void
  onDelete: (debt: Debt) => void
}) {
  return (
    <section className="relative rounded-[1.75rem] bg-cream p-5 shadow-[0_20px_46px_-30px_rgba(0,0,0,0.5)] ring-1 ring-soil/10 sm:p-6">
      {/* dekorasi diklip di pembungkus SENDIRI: section-nya tidak boleh
          `overflow-hidden`, karena menu "…" pada baris terakhir harus bisa
          keluar dari kartu (kalau tidak, dropdown-nya terpotong). */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 overflow-hidden rounded-[1.75rem]"
      >
        <div className="absolute -left-16 -top-20 size-52 rounded-full bg-hud-terracotta/12 blur-3xl" />
        <div className="absolute -bottom-20 -right-10 size-48 rounded-full bg-hud-sage/25 blur-3xl" />
      </div>
      <div className="relative">
        <h3 className="flex items-center gap-1.5 font-display text-[14px] font-semibold tracking-tight text-forest">
          <Snowflake className="size-4 text-hud-sage" strokeWidth={2.4} />
          {SNOWBALL_TITLE}
        </h3>

        {/* progres keseluruhan — bar tipis, nominal di kedua ujungnya.
            Tidak ada teks "Snowball Progress: … lunas": bar + dua nominal ini
            mengucapkan hal yang sama tanpa satu kalimat pun. */}
        <div className="mt-4">
          <div className="flex items-baseline justify-between gap-3 text-[10.5px] font-medium text-forest/45 tabular-nums">
            <span>{maskMoney(progress.paid, masked)}</span>
            <span>{maskMoney(progress.principal, masked)}</span>
          </div>
          <div
            role="progressbar"
            aria-label={SNOWBALL_PROGRESS_ARIA}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={progress.pct}
            className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-soil/[0.09]"
          >
            <motion.span
              initial={false}
              animate={{ width: `${progress.pct}%` }}
              transition={{ type: 'spring', stiffness: 130, damping: 20 }}
              className="relative block h-full rounded-full bg-hud-sage"
            >
              <span aria-hidden className="progress-shimmer" />
            </motion.span>
          </div>
        </div>

        {/* baris per hutang (urut sisa terkecil) + aksinya masing-masing */}
        <ul className="mt-4 space-y-3.5">
          {rows.map((row) => (
            <SnowballBar
              key={row.debt.id}
              row={row}
              payments={paymentsOfDebt(payments, row.debt.id)}
              masked={masked}
              celebrate={celebrateId === row.debt.id}
              onPay={() => onPay(row.debt)}
              onEdit={() => onEdit(row.debt)}
              onDelete={() => onDelete(row.debt)}
            />
          ))}
        </ul>
      </div>
    </section>
  )
}


/* ── satu baris hutang platform (bar gunung es + aksi + riwayat) ─────────────
   Lebar track = ukuran pokok asli (relatif terhadap pokok terbesar), lebar isi
   = sisa hutang. Jadi sekali lihat: "yang ini besar banget, yang ini tinggal
   dikit" — sekaligus kelihatan mana yang paling cepat habis.

   Baris ini JUGA entri daftar hutangnya (section PLATFORM terpisah sudah
   dihapus): provider, konteks, sisa, jatuh tempo, dan "Catat Bayar" hidup di
   satu tempat. Tap pada identitas → riwayat pembayaran (data ledger yang tidak
   tampil di mana pun lagi).

   Saat baru lunas: bar jadi sage penuh, confetti meletus, lalu bar MENYUSUT
   ke tinggi 0 dengan pegas — gunung esnya benar-benar "mencair" dan hilang
   dari daftar. */
function SnowballBar({
  row,
  payments,
  masked,
  celebrate,
  onPay,
  onEdit,
  onDelete,
}: {
  row: SnowballRow
  payments: DebtPayment[]
  masked: boolean
  celebrate: boolean
  onPay: () => void
  onEdit: () => void
  onDelete: () => void
}) {
  const { debt, emoji, provider, widthPct, remainingPct, paidPct } = row
  const done = paidPct >= 100
  const [collapsed, setCollapsed] = useState(false)
  const [expanded, setExpanded] = useState(false)

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

      <div className="flex items-start gap-2">
        {/* identitas + progres: satu tombol yang membuka riwayat pembayaran */}
        <button
          type="button"
          onClick={() => setExpanded((prev) => !prev)}
          aria-expanded={expanded}
          aria-label={`${provider}, sisa ${maskMoney(debt.remaining, masked)}`}
          className="min-w-0 flex-1 rounded-2xl text-left outline-none focus-visible:ring-2 focus-visible:ring-forest/30"
        >
          <span className="flex items-center gap-2">
            <span aria-hidden className="text-[14px]">
              {emoji}
            </span>
            <span className="truncate text-[12.5px] font-medium text-forest">{provider}</span>
            {done && (
              <span className="shrink-0 rounded-full bg-hud-sage/30 px-2 py-0.5 text-[9.5px] font-medium uppercase tracking-wide text-forest">
                {DEBT_STATUS_COPY.settled}
              </span>
            )}
            <ChevronDown
              aria-hidden
              className={cn(
                'size-3.5 shrink-0 text-forest/25 transition-transform duration-300',
                expanded && 'rotate-180',
              )}
              strokeWidth={2.4}
            />
          </span>
          <span className="mt-0.5 block text-[10.5px] leading-snug text-forest/45 tabular-nums">
            {done ? DEBT_STATUS_COPY.settled : `${maskMoney(debt.remaining, masked)} sisa`}
            {/* konteks uang ikut di baris kedua (bukan chip di baris nama) supaya
                nama platform tetap utuh walau pil "Bayar" ada di kanan */}
            <span className="text-forest/35"> · {CONTEXT_LABEL[debt.scope]}</span>
            {/* label jatuh tempo HANYA dirender kalau tanggalnya ada — label
                kosong ("Jatuh tempo tanggal" tanpa angka) lebih buruk daripada
                tidak ada label sama sekali */}
            {debt.dueDate ? ` · Jatuh tempo tanggal ${debt.dueDate}` : ''}
          </span>
        </button>

        {/* aksi selalu terlihat: pil "Bayar →" (bentuk yang SAMA dengan aksi di
            halaman Tagihan) + menu "…" berisi Edit/Hapus. Labelnya pendek
            (`payShort`) supaya nama platform tidak terpotong; `aria-label`
            tetap menyebut aksi panjang + nama platform.
            Badge "Mulai dari sini" dihapus — urutan barisnya sendiri sudah
            menyatakan dari mana mulai. */}
        <div className="flex shrink-0 items-center gap-1 self-center">
          {!done && (
            <button
              type="button"
              onClick={onPay}
              aria-label={`${DEBT_CASH_COPY.actionLabel.pay} ${provider}`}
              title={DEBT_CASH_COPY.actionLabel.pay}
              className="inline-flex h-8 items-center gap-1 whitespace-nowrap rounded-full bg-forest pl-3 pr-2 text-cream transition-colors hover:bg-forest-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-forest/30 active:scale-95"
            >
              <span className="text-[10px] font-semibold leading-none">
                {DEBT_CASH_COPY.actionLabel.payShort}
              </span>
              <ArrowRight className="size-3.5" strokeWidth={2.6} aria-hidden />
            </button>
          )}
          <DebtRowMenu name={debtName(debt)} onEdit={onEdit} onDelete={onDelete} compact />
        </div>
      </div>

      {/* bar: sage = porsi lunas, terracotta → amber = sisa yang harus dilumerkan */}
      <div className="mt-2" style={{ width: `${Math.max(widthPct, 22)}%` }}>
        <div className="relative h-3.5 w-full overflow-hidden rounded-full bg-hud-sage/40 ring-1 ring-inset ring-forest/5">
          <motion.span
            initial={false}
            animate={{ width: `${remainingPct}%` }}
            transition={{ type: 'spring', stiffness: 130, damping: 20 }}
            className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-hud-terracotta via-hud-amber to-hud-amber"
          >
            <span aria-hidden className="absolute inset-x-0 top-0 h-px bg-cream/35" />
          </motion.span>
          {done && (
            <motion.span
              initial={{ opacity: 0.9 }}
              animate={{ opacity: 1 }}
              className="absolute inset-0 rounded-full bg-gradient-to-r from-hud-sage to-hud-sage"
            />
          )}
        </div>
      </div>

      {/* riwayat pembayaran — satu-satunya data hutang ini yang tidak tampil
          di baris (tanggal + dompet sumber tiap pembayaran) */}
      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            key="platform-history"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.26, ease: [0.22, 1, 0.36, 1] }}
            className="overflow-hidden"
          >
            <div className="mt-2 rounded-2xl bg-cream px-3.5 py-3 ring-1 ring-inset ring-soil/8">
              <p className="flex items-center justify-between gap-2 text-[10px] font-medium uppercase tracking-[0.14em] text-forest/40">
                <span className="flex items-center gap-1.5">
                  <Receipt className="size-3.5" strokeWidth={2.6} />
                  {PAYMENT_HISTORY_TITLE}
                </span>
                {payments.length > 0 && (
                  <span className="font-medium normal-case tracking-normal text-forest/35">
                    {paymentCountLabel(payments.length)}
                  </span>
                )}
              </p>

              {payments.length === 0 ? (
                <div className="mt-2">
                  <p className="text-[11px] font-medium leading-relaxed text-forest/55">
                    {PAYMENT_HISTORY_EMPTY}
                  </p>
                  <p className="mt-1 text-[10.5px] leading-relaxed text-forest/40">
                    {PAYMENT_HISTORY_EMPTY_HINT}
                  </p>
                </div>
              ) : (
                <ul className="mt-2 space-y-1.5">
                  {payments.map((payment) => (
                    <li key={payment.id} className="flex items-center gap-2 text-[11px]">
                      <span className="shrink-0 text-forest/55 tabular-nums">
                        {formatShortDate(payment.paidAtISO)}
                      </span>
                      <span className="min-w-0 flex-1 truncate text-forest/40">
                        · {payment.kind === 'receivable' ? `${DEBT_CASH_COPY.receivableTag} · ` : ''}
                        {payment.walletName}
                        {payment.changeAmount ? (
                          <span className="ml-1 text-hud-terracotta">
                            {DEBT_CASH_COPY.changeRecorded(maskMoney(payment.changeAmount, masked))}
                          </span>
                        ) : null}
                      </span>
                      <span className="shrink-0 font-medium text-forest/75 tabular-nums">
                        {maskMoney(payment.amount, masked)}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
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


/* ── MENU "…" KARTU HUTANG — satu bentuk untuk platform & personal ──────────
   Edit/Hapus tidak boleh mendominasi kartu (H8-3), jadi keduanya hidup di balik
   satu menu. Dipakai dua tempat:
     · baris snowball platform → varian `compact` (size-8, tanpa ring) supaya
       sejajar dengan pil "Catat Bayar";
     · baris aksi personal → size-10 dengan ring, sejajar tombol aksi uang.
   Komponen ini MURNI tampilan; halaman yang memutuskan aksinya. */
function DebtRowMenu({
  name,
  onEdit,
  onDelete,
  compact = false,
}: {
  /** nama catatan — dipakai di `aria-label` supaya tombol ikonnya tidak ambigu */
  name: string
  onEdit: () => void
  onDelete: () => void
  /** true = varian ringkas untuk baris padat */
  compact?: boolean
}) {
  const [actionsOpen, setActionsOpen] = useState(false)

  return (
    <div className="relative shrink-0">
      <button
        type="button"
        onClick={() => setActionsOpen((prev) => !prev)}
        aria-label={WEALTH_ROW_ACTION.menuAria(name)}
        aria-haspopup="menu"
        aria-expanded={actionsOpen}
        title={WEALTH_ROW_ACTION.menuAria(name)}
        className={cn(
          'inline-flex items-center justify-center text-forest/45 transition-colors hover:bg-soil/[0.06] hover:text-forest active:scale-95',
          compact ? 'size-8 rounded-full' : 'size-10 rounded-2xl ring-1 ring-inset ring-soil/10',
        )}
      >
        <MoreVertical className="size-4" strokeWidth={2.4} aria-hidden />
      </button>
      {actionsOpen && (
        <div className="absolute right-0 top-full z-20 mt-1">
          {/* PAKET 95 — menu "…" memakai panel daftar bersama (ikon + judul +
              sub-barisan), sama seperti pemilih konteks & menu kartu dompet. */}
          <MenuPanel role="menu" label={WEALTH_ROW_ACTION.menuAria(name)} className="w-52">
            <MenuOption
              icon={Pencil}
              label={WEALTH_ROW_ACTION.edit}
              role="menuitem"
              onClick={() => {
                setActionsOpen(false)
                onEdit()
              }}
            />
            <MenuOption
              icon={Trash2}
              label={WEALTH_ROW_ACTION.remove}
              role="menuitem"
              tone="danger"
              onClick={() => {
                setActionsOpen(false)
                onDelete()
              }}
            />
          </MenuPanel>
        </div>
      )}
    </div>
  )
}

/* ── BARIS AKSI KARTU HUTANG PERSONAL — SELALU TERLIHAT (paket 61.1) ─────────
   Kartu personal tetap memakai baris aksi selebar kartu karena isinya bukan
   tabel: aksi uang ("Diterima"/"Catat Bayar") adalah alasan kartu itu ada, dan
   baris hutang platform kini membawa pil aksinya sendiri di dalam baris snowball.

   Catatan yang sudah lunas tidak menawarkan aksi uang (tidak ada yang perlu
   dibayar) — gantinya stempel LUNAS — tapi Edit & Hapus tetap ada lewat menu
   "…". Komponen ini MURNI tampilan: halaman (`wealth-screen.tsx`) yang
   memutuskan apa yang terjadi — begitu juga dialog konfirmasi & jendela Undo. */
function DebtActionRow({
  name,
  payLabel,
  settled = false,
  onPay,
  onEdit,
  onDelete,
}: {
  /** nama catatan — dipakai di `aria-label` supaya tombol ikonnya tidak ambigu */
  name: string
  /** label aksi uang; kosong = kartu ini tidak punya aksi uang */
  payLabel?: string
  /** true = catatan sudah lunas → stempel, bukan tombol bayar */
  settled?: boolean
  onPay?: () => void
  onEdit: () => void
  onDelete: () => void
}) {
  const pay = payLabel !== undefined && onPay !== undefined

  return (
    <div className="mt-3 flex w-full items-stretch gap-2">
      {pay ? (
        <button
          type="button"
          onClick={onPay}
          className="inline-flex h-10 min-w-0 flex-1 items-center justify-center gap-1.5 rounded-2xl bg-hud-sage px-3 text-[12px] font-medium text-forest transition-colors hover:brightness-105 active:scale-[0.98]"
        >
          <Wallet className="size-3.5 shrink-0" strokeWidth={2.6} />
          <span className="truncate">{payLabel}</span>
        </button>
      ) : (
        settled && (
          <span className="inline-flex h-10 min-w-0 flex-1 items-center justify-center gap-1.5 rounded-2xl bg-hud-sage/30 text-[11px] font-medium uppercase tracking-wide text-forest">
            <Check className="size-3.5 shrink-0" strokeWidth={3} />
            {DEBT_STATUS_COPY.settled}
          </span>
        )
      )}

      {/* Edit & Hapus di balik satu menu "…" supaya aksi merusak tidak
          mendominasi kartu (H8-3). */}
      <DebtRowMenu name={name} onEdit={onEdit} onDelete={onDelete} />
    </div>
  )
}

/* ── 7D: sheet kecil "Catat Bayar" ──────────────────────────────────────────
   Nominal sudah terisi otomatis sebesar cicilan bulanan (user tinggal
   menyesuaikan kalau bayar lebih), plus tanggal & sumber dompet. Submit
   memicu bar snowball menyusut — jadi pembayaran bukan cuma catatan mati. */
/* ── 7D: sheet "Catat Bayar" / "Terima" (satu sheet, dua arah) ───────────────
   Nominal sudah terisi otomatis (cicilan bulanan untuk platform, seluruh sisa
   untuk personal/piutang), plus tanggal & dompet. Yang membedakan dari versi
   lama (paket 17): submit di sini BENAR-BENAR menggerakkan kas lewat store, dan
   pratinjaunya memakai perencana yang SAMA dengan yang akan ditulis
   (`planDebtSettlement`) sehingga angka di layar tidak mungkin beda dari baris
   ledger yang lahir. Kembalian lebih-bayar pun terlihat SEBELUM disimpan. */
function DebtCashSheet({
  debt,
  masked,
  walletOptions,
  onClose,
  onConfirm,
}: {
  debt: Debt | null
  masked: boolean
  /** dompet dari ledger + saldonya — supaya user tahu uangnya cukup atau tidak */
  walletOptions: { id: string; label: string; balance: number }[]
  onClose: () => void
  /** `true` = baris kas berhasil ditulis dan sheet boleh ditutup */
  onConfirm: (amount: number, date: string, wallet: string) => boolean
}) {
  const [digits, setDigits] = useState('')
  const [date, setDate] = useState('')
  const [wallet, setWallet] = useState('')
  const [error, setError] = useState('')

  const direction: CashDirection = debt ? cashDirectionOf(debt) : 'out'
  const copy = direction === 'out' ? DEBT_CASH_COPY.pay : DEBT_CASH_COPY.receive
  const name = debt ? settlementCounterparty(debt) : ''
  const firstWallet = walletOptions[0]?.id ?? ''
  /* tanggal perangkat: field tanggal di sheet ini dibuka di HARI INI milik user
     (paket 57). Diisi setelah mount supaya render server & client identik. */
  const todayValue = useTodayISO()
  const today = todayValue || WEALTH_TODAY_ISO

  useEffect(() => {
    if (!debt) return
    setDigits(String(defaultCashAmount(debt)))
    /* default tanggal = HARI INI milik user (paket 57); jangkar seed
       `WEALTH_TODAY_ISO` tinggal sebagai fallback sebelum tanggal perangkat
       terbaca setelah mount */
    setDate(today || WEALTH_TODAY_ISO)
    setWallet(firstWallet)
    setError('')
  }, [debt, firstWallet, today])

  const amount = debt ? Number(digits || '0') : 0
  const plan = debt
    ? planDebtSettlement({
        direction,
        owedAmount: debt.remaining,
        paidAmount: amount,
        counterparty: name,
      })
    : null
  const selected = walletOptions.find((option) => option.id === wallet)
  /* membayar tidak boleh melebihi uang yang benar-benar ada di dompet terpilih */
  const notEnough =
    direction === 'out' && plan !== null && selected !== undefined
      ? plan.cashMoved > selected.balance
      : false
  const submitDisabled = plan === null || walletOptions.length === 0 || notEnough

  const submit = () => {
    if (walletOptions.length === 0) {
      setError(DEBT_CASH_COPY.noWallet)
      return
    }
    if (!plan) {
      setError(DEBT_CASH_COPY.invalid)
      return
    }
    if (!onConfirm(amount, date, wallet)) {
      setError(DEBT_CASH_COPY.insufficient(selected?.label ?? ''))
      return
    }
    setError('')
  }

  return (
    <BudgetSheet
      open={debt !== null}
      onClose={onClose}
      title={debt ? copy.title(name) : DEBT_CASH_COPY.pay.title('')}
      footer={
        <SheetSubmit onClick={submit} disabled={submitDisabled} gate>
          {copy.submit}
        </SheetSubmit>
      }
    >
      <RupiahField
        label={copy.amountLabel}
        digits={digits}
        onDigitsChange={setDigits}
        placeholder="Rp 550.000"
        size="lg"
      />

      {plan && (
        <div className="mt-3 space-y-2">
          <p className="rounded-2xl bg-sage/60 px-4 py-3 text-[12px] leading-relaxed text-forest/70">
            {DEBT_CASH_COPY.remainingLine(
              maskMoney(Math.max(0, plan.remaining), masked),
              plan.settled,
            )}
          </p>
          {/* kas-nya benar-benar bergerak — sebutkan nominal & dompetnya */}
          <p className="text-[11.5px] leading-relaxed text-forest/50">
            {direction === 'out'
              ? DEBT_CASH_COPY.cashOutLine(maskMoney(plan.cashMoved, masked), selected?.label ?? '')
              : DEBT_CASH_COPY.cashInLine(maskMoney(plan.cashMoved, masked), selected?.label ?? '')}
          </p>
          {/* lebih bayar: JELASKAN sebelum disimpan, jangan biarkan user kaget */}
          {plan.changeAmount > 0 && (
            <p className="rounded-2xl bg-hud-amber/15 px-4 py-3 text-[11.5px] leading-relaxed text-hud-terracotta ring-1 ring-inset ring-hud-amber/30">
              {direction === 'in'
                ? DEBT_CASH_COPY.changeReturned(maskMoney(plan.changeAmount, masked), name)
                : DEBT_CASH_COPY.changePending(maskMoney(plan.changeAmount, masked), name)}
            </p>
          )}
        </div>
      )}

      <DateField value={date} onChange={setDate} label={DEBT_CASH_COPY.dateLabel} />

      <div className="mt-4">
        <span className="text-[13px] font-medium leading-snug text-forest">{copy.walletLabel}</span>
        {walletOptions.length === 0 ? (
          <p className="mt-2 rounded-2xl bg-hud-amber/15 px-4 py-3 text-[11.5px] leading-relaxed text-hud-terracotta">
            {DEBT_CASH_COPY.noWallet}
          </p>
        ) : (
          <>
            <ChoicePills
              className="mt-2"
              ariaLabel={copy.walletLabel}
              options={walletOptions.map((option) => ({ id: option.id, label: option.label }))}
              value={wallet}
              onChange={setWallet}
            />
            {selected && (
              <p className="mt-2 text-[11px] text-forest/45 tabular-nums">
                {DEBT_CASH_COPY.walletBalance(maskMoney(selected.balance, masked))}
              </p>
            )}
          </>
        )}
        {/* saldo tidak cukup / nominal tidak sah: tampil DI SINI, bukan sebagai
            toast yang hilang — user harus bisa membetulkan tanpa menebak.
            Dua sumber: pesan dari percobaan simpan yang ditolak store (`error`)
            dan pemeriksaan lokal atas saldo dompet terpilih (`notEnough`), yang
            sudah menghalangi tombol simpan sejak awal. */}
        {(error || (notEnough && walletOptions.length > 0)) && (
          <p className="mt-2 rounded-2xl bg-hud-terracotta/12 px-4 py-3 text-[11.5px] leading-relaxed text-hud-terracotta ring-1 ring-inset ring-hud-terracotta/25">
            {error || DEBT_CASH_COPY.insufficient(selected?.label ?? '')}
          </p>
        )}
      </div>
    </BudgetSheet>
  )
}


/* ── 7E: kelompok hutang personal (dipisah dari platform) ───────────────────
   Nada nurturing tetap ada di mana yang perlu (empty state satu baris), tapi
   paragraf pembuka yang selalu tampil sudah dihapus: hutang personal bukan
   produk kredit — tidak ada bunga, tenor, atau badge menakutkan di sini, cuma
   arah, nama, nominal. */
function PersonalSection({
  title,
  active,
  settled,
  masked,
  celebrateId,
  onCash,
  onAdd,
  onEdit,
  onDelete,
}: {
  title: string
  active: Debt[]
  settled: Debt[]
  masked: boolean
  /** id catatan yang baru saja lunas lewat aksi uang (memicu confetti section) */
  celebrateId: string | null
  onCash: (debt: Debt) => void
  /** tombol "+" di empty state — satu-satunya jalan keluar dari daftar kosong */
  onAdd: () => void
  /** pintu edit & hapus (paket 61) — diteruskan apa adanya ke tiap kartu */
  onEdit: (debt: Debt) => void
  onDelete: (debt: Debt) => void
}) {
  const [burst, setBurst] = useState(false)
  const timer = useRef<number | null>(null)
  const shown = useRef<string | null>(null)

  useEffect(
    () => () => {
      if (timer.current) window.clearTimeout(timer.current)
    },
    [],
  )

  /**
   * Confetti kecil 1.5 detik — dirayakan di level SECTION supaya tetap terlihat
   * walau kartunya langsung pindah ke grup "Sudah Lunas".
   *
   * Sejak paket 41 perayaan dipicu dari `celebrateId` (bukan langsung dari klik):
   * "Tandai Lunas" yang dulu hanya mengubah status tanpa menyentuh kas sudah
   * tidak ada — sekarang statusnya berubah SETELAH baris kas benar-benar ditulis.
   */
  useEffect(() => {
    if (!celebrateId || shown.current === celebrateId) return
    shown.current = celebrateId
    setBurst(true)
    if (timer.current) window.clearTimeout(timer.current)
    timer.current = window.setTimeout(() => setBurst(false), 1500)
  }, [celebrateId])

  return (
    <section className="relative">
      <SectionHeader title={title} />

      {burst && <ConfettiBurst />}

      {/* empty state BAKU app: ikon kecil + satu baris + satu tombol aksi.
          Paragraf nurturing yang dulu menetap di atas daftar sudah dihapus —
          user yang paham tidak perlu membacanya lagi, user baru cukup membaca
          satu baris ini. Disusun vertikal (bukan sebaris) supaya kalimatnya
          tidak terpotong/terlipat di layar 320–390 px. */}
      {active.length === 0 ? (
        <div className="flex flex-col items-center rounded-2xl bg-cream/70 px-4 py-5 text-center ring-1 ring-inset ring-soil/8">
          <span
            aria-hidden
            className="flex size-9 shrink-0 items-center justify-center rounded-2xl bg-sage/60 text-forest"
          >
            <HandCoins className="size-4" strokeWidth={2.2} />
          </span>
          <p className="mt-2 text-[11.5px] font-medium leading-snug text-forest/55">
            {title === 'PIUTANG' ? PERSONAL_EMPTY_LINE.piutang : PERSONAL_EMPTY_LINE.hutang}
          </p>
          <button
            type="button"
            onClick={onAdd}
            className="mt-3 inline-flex h-8 shrink-0 items-center gap-1 whitespace-nowrap rounded-full bg-forest pl-2.5 pr-3 text-[10.5px] font-semibold text-cream transition-colors hover:bg-forest-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-forest/30 active:scale-95"
          >
            <Plus className="size-3" strokeWidth={3} aria-hidden />
            {title === 'PIUTANG' ? EMPTY_PIUTANG_CTA : EMPTY_HUTANG_CTA}
          </button>
        </div>
      ) : (
        <ul className="space-y-2.5">
          {active.map((debt, index) => (
            <PersonalDebtCard
              key={debt.id}
              debt={debt}
              masked={masked}
              settled={false}
              delay={0.03 * index}
              onCash={() => onCash(debt)}
              onEdit={() => onEdit(debt)}
              onDelete={() => onDelete(debt)}
            />
          ))}
        </ul>
      )}

      {/* yang sudah lunas diletakkan paling bawah, dibiarkan samar */}
      {settled.length > 0 && (
        <>
          <p className="mb-2 mt-4 text-[10.5px] font-medium uppercase tracking-[0.18em] text-forest/25">
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
                onCash={() => undefined}
                onEdit={() => onEdit(debt)}
                onDelete={() => onDelete(debt)}
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
  onCash,
  onEdit,
  onDelete,
}: {
  debt: Debt
  masked: boolean
  settled: boolean
  delay: number
  /** buka sheet uang (bayar hutang / terima piutang) — debit/kredit kas asli */
  onCash: () => void
  /** buka sheet edit (paket 61) */
  onEdit: () => void
  /** minta konfirmasi hapus (paket 61) */
  onDelete: () => void
}) {
  const incoming = debtPointsToMe(debt)

  return (
    <motion.li
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.34, delay, ease: [0.22, 1, 0.36, 1] }}
      className={cn(
        'relative flex flex-wrap items-center gap-3 overflow-hidden rounded-[1.35rem] bg-cream px-3.5 py-3.5 ring-1',
        settled ? 'ring-soil/8' : 'shadow-[0_10px_28px_-24px_rgba(0,0,0,0.6)] ring-soil/10',
      )}
    >
      {settled && <LunasStamp />}

      <span
        aria-hidden
        className={cn(
          'flex size-10 shrink-0 items-center justify-center rounded-2xl ring-1 ring-inset',
          incoming
            ? 'bg-hud-sage/25 text-forest ring-hud-sage/30'
            : 'bg-hud-terracotta/12 text-hud-terracotta ring-hud-terracotta/20',
        )}
      >
        {incoming ? (
          <ArrowDownLeft className="size-[18px]" strokeWidth={2.4} />
        ) : (
          <ArrowUpRight className="size-[18px]" strokeWidth={2.4} />
        )}
      </span>

      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-1.5">
          <span
            className={cn(
              'truncate text-[13px] font-medium',
              settled ? 'text-forest/50 line-through' : 'text-forest',
            )}
          >
            {counterpartyLabel(debt)}
          </span>
          {/* badge konteks uang hutang/piutang personal (paket 47) */}
          <span className="shrink-0 rounded-full bg-sage/70 px-1.5 py-0.5 text-[9.5px] font-medium uppercase tracking-wide text-forest ring-1 ring-inset ring-forest/10">
            {CONTEXT_LABEL[debt.scope]}
          </span>
        </span>
        {debt.notes && (
          <span className={cn('mt-0.5 block truncate text-[11px]', settled ? 'text-forest/30' : 'text-forest/45')}>
            {debt.notes}
          </span>
        )}
      </span>

      <span className="flex shrink-0 flex-col items-end">
        <span
          className={cn(
            'text-[13.5px] font-semibold tabular-nums',
            settled ? 'text-forest/40 line-through' : 'text-forest',
          )}
        >
          {maskMoney(settled ? debt.principal : debt.remaining, masked)}
        </span>
      </span>

      {/* AKSI LANGSUNG TERLIHAT (paket 61.1) — baris yang SAMA dengan kartu
          hutang platform: aksi uang + edit + hapus. Label uangnya ikut arah
          (piutang = uang MASUK ke dompet, hutang personal = uang KELUAR).
          Catatan yang sudah lunas tidak menawarkan aksi uang sama sekali —
          cuma stempel LUNAS — tapi Edit/Hapus tetap terjangkau di sini. */}
      <DebtActionRow
        name={debtName(debt)}
        payLabel={
          settled
            ? undefined
            : debt.direction === 'owed_to_me'
              ? DEBT_CASH_COPY.actionLabel.receive
              : DEBT_CASH_COPY.actionLabel.pay
        }
        settled={settled}
        onPay={settled ? undefined : onCash}
        onEdit={onEdit}
        onDelete={onDelete}
      />
    </motion.li>
  )
}


/* ── atom lokal halaman ini ───────────────────────────────────────────────── */

/** stempel LUNAS diagonal ala halaman Tagihan (olive, tepi bertitik) */
function LunasStamp() {
  return (
    <span
      aria-hidden
      className="pointer-events-none absolute right-3 top-1/2 z-10 -translate-y-1/2 -rotate-12 select-none rounded-md border-2 border-hud-sage px-2 py-0.5 font-display text-[11px] font-medium uppercase leading-tight tracking-[0.22em] text-hud-sage opacity-25 after:absolute after:inset-[2.5px] after:rounded-[3px] after:border after:border-dashed after:border-hud-sage/45"
    >
      LUNAS
    </span>
  )
}

/** field tanggal: seluruh area bisa dipencet (pemilih native via `showPicker`) */
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
    <SheetDateField
      label={label}
      value={value}
      onChange={onChange}
      ariaLabel={label}
      icon={<Wallet className="size-4" strokeWidth={2.2} />}
      className="mt-4"
    />
  )
}

/* `formatSheetDate` DIHAPUS — format tanggal kini milik `DateField` bersama
   (`formatDateLabel` di budget-sheet.tsx), satu bentuk untuk semua sheet. */

