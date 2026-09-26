'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { LineChart, Plus } from 'lucide-react'
import { toast } from 'sonner'
import { ScreenShell } from './screen-shell'
import { GlobalPrivacyToggle } from './global-privacy-toggle'
import { usePrivacy } from './privacy-provider'
import { WealthNetWorthBar } from './wealth-net-worth-bar'
import { WealthInvestasi } from './wealth-investasi'
import { WealthHutang } from './wealth-hutang'
import { AddInvestmentSheet, type NewInvestmentTx } from './add-investment-sheet'
import { AddDebtSheet, type NewDebtInput } from './add-debt-sheet'
import { cn } from '@/lib/utils'
import {
  EMPTY_INVESTASI_COPY,
  EMPTY_INVESTASI_CTA,
  EMPTY_INVESTASI_TITLE,
  INITIAL_DEBTS,
  INITIAL_INVESTMENTS,
  MONTHLY_INCOME,
  WEALTH_NOW_ISO,
  activeDebtRemaining,
  liquidCashTotal,
  totalPortfolioValue,
  type Debt,
  type DebtView,
  type Investment,
  type WealthTab,
} from '@/lib/data/wealth'

/* ── Kekayaan & Hutang (/app/wealth) — PRD Domain 2E ────────────────────────
   Halaman SIGNATURE CatetInd: satu layar yang menunjukkan gambaran finansial
   lengkap — investasi, properti (V1: placeholder), dan hutang.

   Yang membedakannya dari aplikasi pencatat keuangan biasa bukan jumlah fitur,
   tapi DUA visual:

   1. Tug-of-War Net Worth Bar (Section 3) — Aset vs Hutang dalam satu bar yang
      saling tarik, jadi user tahu "siapa yang menang" dalam sekejap, tanpa
      membaca satu angka pun. Definisi Aset di sini FINAL (audit fintech #1):
      KAS LIKUID (saldo dompet: BCA, GoPay, Tunai) + ASET INVESTASI.
   2. Debt Snowball Tracker (Section 7C) — daftar hutang platform yang diurut
      dari yang paling kecil supaya pelunasan terasa seperti menamatkan level
      game (bar mencair + confetti), bukan sekadar membayar tagihan.

   Catatan integrasi Daily HUD: cicilan platform (`totalMonthInstallments`)
   dipotong dari income pool SEBELUM jatah harian dibagi (Domain 2B). Karena itu
   nilainya ditulis terang-terangan di kartu ringkasan Tab 3.

   Waktu: "sekarang" memakai WEALTH_NOW_ISO (konstan) — sama seperti halaman
   Tagihan & Riwayat — supaya render server & client identik.
   ────────────────────────────────────────────────────────────────────────── */

/** jeda sebelum hutang yang lunas resmi pindah status (barnya sempat mencair) */
const SETTLE_DELAY = 2200

export function WealthScreen() {
  /* ── STATE ──────────────────────────────────────────────────────────────── */
  /* privasi nominal: state GLOBAL (PrivacyProvider) */
  const { masked: isMasked } = usePrivacy()
  const [activeTab, setActiveTab] = useState<WealthTab>('investasi')
  const [debtView, setDebtView] = useState<DebtView>('hutangku')
  const [showAddInvestment, setShowAddInvestment] = useState(false)
  const [showAddDebt, setShowAddDebt] = useState(false)
  const [expandedAssetId, setExpandedAssetId] = useState<string | null>(null)
  const [investments, setInvestments] = useState<Investment[]>(INITIAL_INVESTMENTS)
  const [debts, setDebts] = useState<Debt[]>(INITIAL_DEBTS)
  /** hutang platform yang barnya baru lunas — memicu confetti + kolaps */
  const [celebrateId, setCelebrateId] = useState<string | null>(null)
  const monthlyIncome = MONTHLY_INCOME

  /** semua timer halaman — dibersihkan saat unmount (pola yang sama dengan
   *  halaman Tagihan) supaya tidak ada set-state pada komponen yang hilang */
  const timers = useRef<number[]>([])
  useEffect(() => {
    const pending = timers.current
    return () => pending.forEach((id) => window.clearTimeout(id))
  }, [])
  const later = (fn: () => void, ms: number) => {
    timers.current.push(window.setTimeout(fn, ms))
  }

  /* ── DATA TURUNAN ───────────────────────────────────────────────────────── */
  /** aset investasi saja (saham/reksadana/emas/crypto) — untuk kartu Tab 1 */
  const totalInvestments = useMemo(() => totalPortfolioValue(investments), [investments])
  /**
   * KAS LIKUID — saldo seluruh dompet (BCA, GoPay, Tunai) dari SATU sumber:
   * `INITIAL_WALLET_ACCOUNTS` di lib/wallets.ts, yang sama dengan halaman
   * Dompet & Akun. Audit fintech #1: kas WAJIB ikut jadi sisi ASET pada
   * Net Worth — kalau tidak, uang Rp 1 M di rekening tanpa saham akan
   * ditampilkan sebagai Net Worth nol.
   */
  const cash = useMemo(() => liquidCashTotal(), [])
  const totalDebt = useMemo(() => activeDebtRemaining(debts), [debts])

  /* ── AKSI ───────────────────────────────────────────────────────────────── */

  /** transaksi investasi baru dicatat sebagai posisi baru (mock).
   *  TODO: kirim ke tabel investment_transactions lalu hitung ulang
   *  avg_buy_price (weighted average) & quantity per aset di server. */
  const handleSaveInvestment = useCallback((tx: NewInvestmentTx) => {
    const cost = tx.quantity * tx.price + tx.fees
    const entry: Investment = {
      id: `inv-${Date.now()}`,
      type: tx.assetType,
      name: tx.name,
      symbol: tx.name.slice(0, 6).toUpperCase(),
      quantity: tx.quantity,
      avgBuyPrice: tx.price,
      currentPrice: tx.price,
      totalInvested: cost,
      currentValue: tx.quantity * tx.price,
      lastUpdate: WEALTH_NOW_ISO,
    }
    setInvestments((prev) => [entry, ...prev])
    setShowAddInvestment(false)
    toast.success('Investasi dicatat! 📈', {
      description: `${tx.side === 'buy' ? 'Beli' : 'Jual'} ${tx.name} tersimpan.`,
    })
  }, [])

  /** fallback protocol 2E.1 poin 4: user memaksa perbarui harga SATU aset */
  const handleUpdatePrice = useCallback((asset: Investment) => {
    setInvestments((prev) =>
      prev.map((item) =>
        item.id === asset.id
          ? {
              ...item,
              isStale: false,
              lastUpdate: WEALTH_NOW_ISO,
              currentPrice: item.avgBuyPrice,
              currentValue: item.quantity * item.avgBuyPrice,
            }
          : item,
      ),
    )
    toast.info('Harga diperbarui! ✅', {
      description: `${asset.name} sekarang memakai harga terbaru.`,
    })
  }, [])

  const handleEditAsset = useCallback((asset: Investment) => {
    // TODO: buka sheet edit kuantitas/harga aset ini
    toast.success(`Edit ${asset.name}`, { description: 'Form edit aset segera hadir.' })
  }, [])

  const handleDeleteAsset = useCallback((asset: Investment) => {
    setInvestments((prev) => prev.filter((item) => item.id !== asset.id))
    setExpandedAssetId((prev) => (prev === asset.id ? null : prev))
    toast.success(`${asset.name} dihapus`, { description: 'Aset dikeluarkan dari portofolio.' })
  }, [])

  /** personal: tandai lunas → confetti + pindah ke grup "Sudah Lunas" */
  const handleSettleDebt = useCallback((debt: Debt) => {
    setDebts((prev) =>
      prev.map((item) =>
        item.id === debt.id ? { ...item, remaining: 0, status: 'settled' as const } : item,
      ),
    )
    const name = debt.counterparty ?? 'teman'
    toast.success(
      debt.direction === 'owed_to_me'
        ? `Piutang dari ${name} lunas! 🎉`
        : `Hutang ke ${name} lunas! 🎉`,
    )
  }, [])

  /** platform: catat pembayaran → sisa berkurang, bar snowball menyusut.
   *  Kalau habis, status baru dipindah SETELAH animasi mencair selesai supaya
   *  barnya sempat terlihat berubah sage penuh + confetti dulu. */
  const handlePayDebt = useCallback((debt: Debt, amount: number) => {
    const remaining = Math.max(0, debt.remaining - amount)
    setDebts((prev) =>
      prev.map((item) =>
        item.id === debt.id
          ? {
              ...item,
              remaining,
              currentMonth: Math.min((item.currentMonth ?? 1) + 1, item.tenor ?? 99),
            }
          : item,
      ),
    )
    toast.success(`Pembayaran ${debt.provider} dicatat! 💪`, {
      description: remaining > 0 ? 'Bar snowball-mu langsung menyusut.' : 'Hutang ini lunas! 🎉',
    })

    if (remaining === 0) {
      setCelebrateId(debt.id)
      later(() => {
        setDebts((prev) =>
          prev.map((item) =>
            item.id === debt.id ? { ...item, status: 'settled' as const } : item,
          ),
        )
        setCelebrateId(null)
      }, SETTLE_DELAY)
    }
  }, [])

  const handleSaveDebt = useCallback((input: NewDebtInput) => {
    setDebts((prev) => [{ id: `debt-${Date.now()}`, status: 'active', ...input }, ...prev])
    setShowAddDebt(false)
    setDebtView(input.direction === 'owed_to_me' ? 'piutangku' : 'hutangku')
    toast.success('Dicatat! 📝', {
      description:
        input.type === 'platform'
          ? `Cicilan ${input.provider} ikut dipotong dari Jatah Harian.`
          : 'Catatan utang/piutang tersimpan.',
    })
  }, [])


  /* ── RENDER ─────────────────────────────────────────────────────────────── */
  return (
    <ScreenShell>
      {/* kolom konten: ~760px di layar biasa, melebar di desktop lebar supaya
          donut & daftar aset bisa berdampingan (bukan ponsel yang direntangkan) */}
      <div className="mx-auto w-full max-w-[760px] xl:max-w-[1060px]">
        {/* ── SECTION 2: header halaman (sticky) + toggle privasi ────────── */}
        <header className="sticky top-2 z-30 mb-5 flex items-center justify-between gap-3 rounded-[1.5rem] bg-[#FFFDF7]/90 px-4 py-3 shadow-[0_18px_40px_-32px_rgba(16,58,42,0.65)] ring-1 ring-black/[0.05] backdrop-blur-md">
          <div className="flex min-w-0 items-center gap-3">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-sage via-cream to-mint-soft text-forest shadow-[0_12px_26px_-16px_rgba(16,58,42,0.7)] ring-1 ring-forest/10">
              <LineChart className="size-[18px]" strokeWidth={2.1} />
            </span>
            <div className="min-w-0">
              <h1 className="truncate font-display text-[19px] font-black tracking-tight text-ink lg:text-[22px]">
                Kekayaan &amp; Hutang
              </h1>
              <p className="truncate text-[11px] text-ink/45">
                Aset, investasi, dan hutang — satu layar, apa adanya
              </p>
            </div>
          </div>
          <GlobalPrivacyToggle />
        </header>

        {/* ── SECTION 3: Tug-of-War Net Worth Bar (hero visual) ───────────
            `assets` = kas likuid + investasi (dijumlahkan DI DALAM komponen) */}
        <WealthNetWorthBar
          cash={cash}
          investments={totalInvestments}
          debts={totalDebt}
          masked={isMasked}
        />

        {/* ── SECTION 4: tab Investasi / Properti / Hutang ──────────────── */}
        <WealthTabs active={activeTab} onChange={setActiveTab} />

        <AnimatePresence mode="wait" initial={false}>
          {activeTab === 'investasi' && (
            <motion.div
              key="tab-investasi"
              initial={{ opacity: 0, x: -16 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 16 }}
              transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
              className="mt-5"
            >
              {investments.length === 0 ? (
                <EmptyInvestasi onAdd={() => setShowAddInvestment(true)} />
              ) : (
                <WealthInvestasi
                  investments={investments}
                  masked={isMasked}
                  expandedAssetId={expandedAssetId}
                  onToggleExpand={(id) =>
                    setExpandedAssetId((prev) => (prev === id ? null : id))
                  }
                  onAdd={() => setShowAddInvestment(true)}
                  onUpdatePrice={handleUpdatePrice}
                  onEdit={handleEditAsset}
                  onDelete={handleDeleteAsset}
                />
              )}
            </motion.div>
          )}

          {activeTab === 'properti' && (
            <motion.div
              key="tab-properti"
              initial={{ opacity: 0, x: -16 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 16 }}
              transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
              className="mt-5"
            >
              {/* ── SECTION 6: properti = V1 placeholder (PRD Decision A12) ── */}
              <div className="flex flex-col items-center rounded-[1.75rem] border-2 border-dashed border-hud-amber/35 bg-[#FFFDF7] px-6 py-14 text-center">
                <span aria-hidden className="text-[34px]">
                  🏠
                </span>
                <h2 className="mt-3 font-display text-[17px] font-black tracking-tight text-ink">
                  Properti &amp; Aset Fisik
                </h2>
                <span className="mt-2.5 rounded-full bg-hud-amber/25 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.14em] text-[#8a5a1f] ring-1 ring-inset ring-hud-amber/40">
                  Segera Hadir
                </span>
                <p className="mt-3 max-w-sm text-[13px] leading-relaxed text-ink/55">
                  Rumah, kendaraan, perhiasan — coming soon di update berikutnya 🌿
                </p>
              </div>
            </motion.div>
          )}

          {activeTab === 'hutang' && (
            <motion.div
              key="tab-hutang"
              initial={{ opacity: 0, x: -16 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 16 }}
              transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
              className="mt-5"
            >
              <WealthHutang
                debts={debts}
                view={debtView}
                onChangeView={setDebtView}
                masked={isMasked}
                monthlyIncome={monthlyIncome}
                celebrateId={celebrateId}
                onAddDebt={() => setShowAddDebt(true)}
                onSettleDebt={handleSettleDebt}
                onPayDebt={handlePayDebt}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ── Sheet: tambah investasi (5E) & tambah utang/piutang (7F) ─────── */}
      <AddInvestmentSheet
        open={showAddInvestment}
        onClose={() => setShowAddInvestment(false)}
        onSave={handleSaveInvestment}
      />
      <AddDebtSheet
        open={showAddDebt}
        onClose={() => setShowAddDebt(false)}
        onSave={handleSaveDebt}
        defaultView={debtView}
      />
    </ScreenShell>
  )
}


/* ── sub-komponen halaman ini ─────────────────────────────────────────────── */

const TAB_OPTIONS: { id: WealthTab; label: string; emoji: string; badge?: string }[] = [
  { id: 'investasi', label: 'Investasi', emoji: '📈' },
  { id: 'properti', label: 'Properti', emoji: '🏠', badge: 'Segera' },
  { id: 'hutang', label: 'Hutang', emoji: '💳' },
]

/** Tab halaman — pill aktif meluncur (layoutId) & bisa digulir di layar sempit */
function WealthTabs({
  active,
  onChange,
}: {
  active: WealthTab
  onChange: (tab: WealthTab) => void
}) {
  return (
    <div
      role="tablist"
      aria-label="Bagian kekayaan"
      className="hide-scrollbar -mx-1 mt-5 flex gap-2 overflow-x-auto px-1 py-1 lg:mt-6"
    >
      {TAB_OPTIONS.map((tab) => {
        const isActive = tab.id === active
        return (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={isActive}
            onClick={() => onChange(tab.id)}
            className={cn(
              'relative flex shrink-0 items-center gap-2 rounded-full px-4 py-2.5 text-[13px] font-bold transition-colors duration-200',
              isActive ? 'text-mint' : 'bg-white text-ink/55 ring-1 ring-black/[0.06] hover:text-ink',
            )}
          >
            {isActive && (
              <motion.span
                layoutId="wealth-tab-pill"
                transition={{ type: 'spring', stiffness: 340, damping: 32 }}
                className="absolute inset-0 rounded-full bg-forest shadow-[0_14px_30px_-18px_rgba(16,58,42,0.9)]"
              />
            )}
            <span className="relative z-10 flex items-center gap-1.5">
              <span aria-hidden>{tab.emoji}</span>
              {tab.label}
              {tab.badge && (
                <span
                  className={cn(
                    'rounded-full px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide',
                    isActive
                      ? 'bg-mint/25 text-mint'
                      : 'bg-hud-amber/25 text-[#8a5a1f]',
                  )}
                >
                  {tab.badge}
                </span>
              )}
            </span>
          </button>
        )
      })}
    </div>
  )
}

/** 8A — empty state investasi: nurturing, langsung kasih jalan keluar */
function EmptyInvestasi({ onAdd }: { onAdd: () => void }) {
  return (
    <div className="flex flex-col items-center rounded-[1.75rem] border-2 border-dashed border-forest/15 bg-cream/50 px-6 py-12 text-center">
      <span aria-hidden className="text-[30px]">
        🌱
      </span>
      <h2 className="mt-3 font-display text-[16px] font-bold tracking-tight text-ink">
        {EMPTY_INVESTASI_TITLE}
      </h2>
      <p className="mt-1.5 max-w-sm text-[13px] leading-relaxed text-ink/55">
        {EMPTY_INVESTASI_COPY}
      </p>
      <button
        type="button"
        onClick={onAdd}
        className="mt-5 inline-flex h-11 items-center gap-2 rounded-2xl bg-forest px-5 text-[13.5px] font-semibold text-cream transition-colors hover:bg-forest-soft active:scale-[0.98]"
      >
        <Plus className="size-4" strokeWidth={2.6} />
        {EMPTY_INVESTASI_CTA}
      </button>
    </div>
  )
}

/** Toggle privasi halaman kini komponen baku GLOBAL (audit UX #7) — satu bentuk
 *  tombol mata yang sama di semua halaman. Lihat <GlobalPrivacyToggle />. */

