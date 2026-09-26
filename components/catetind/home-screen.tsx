'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Image from 'next/image'
import { AlignRight, Bell, Receipt, Search, User, Wallet as WalletIcon } from 'lucide-react'
import { ScreenShell } from './screen-shell'
import { LogoWordmark } from './logo-wordmark'
import { MetaChip } from './meta-chip'
import { WalletCardStack } from './wallet-card-stack'
import { CashFlowCard } from './cash-flow-card'
import { DailyHudCard } from './daily-hud-card'
import { DailyNudge } from './daily-nudge'
import { GlobalPrivacyToggle } from './global-privacy-toggle'
import { PlantWidget } from './plant-widget'
import { ContextSwitcher } from './context-switcher'
import { useMoneyContext } from './money-context-provider'
import { WeeklyRecapBanner } from './weekly-recap-banner'
import { WeeklyRecapModal } from './weekly-recap-modal'
import { HomeBanners } from './home-banner'
import { ExpenseDistributionCard } from './expense-distribution-card'
import { MyGoalsCard } from './my-goals-card'
import { RecentTransactionsCard } from './recent-transactions-card'
import { OverviewPanel } from './overview-panel'
import { getWalletsByContext, INITIAL_WALLETS, type DeckSelection, type Wallet } from '@/lib/wallets'
import { getTransactionsByContext } from '@/lib/data/transactions'
import type { Transaction } from '@/lib/types'

export function HomeScreen() {
  const [overviewOpen, setOverviewOpen] = useState(false)
  /* Kartu mana yang dipencet di deck dompet — panel "Your Balance Overview"
     mengikuti pilihan ini (kartu A → saldo A, kartu B → saldo B). Nilai awal =
     kartu "Semua Dompet", jadi totalnya = total seluruh dompet bawaan. */
  const [overviewSelection, setOverviewSelection] = useState<DeckSelection>(() => ({
    type: 'all',
    total: INITIAL_WALLETS.reduce((sum, w) => sum + w.balance, 0),
  }))
  /* konteks uang (Pribadi/Keluarga/Bersama) kini GLOBAL (audit UX #6) — satu
     sumber kebenaran yang sama dengan switcher di Sidebar, bukan state lokal. */
  const { context: moneyCtx, setContext } = useMoneyContext()
  const [recapOpen, setRecapOpen] = useState(false)
  const [now, setNow] = useState<Date | null>(null)

  useEffect(() => {
    setNow(new Date())
  }, [])

  const wallets = useMemo(() => getWalletsByContext(moneyCtx) as Wallet[], [moneyCtx])
  const transactions = useMemo(
    () => getTransactionsByContext(moneyCtx) as Transaction[],
    [moneyCtx],
  )

  const hour = now?.getHours() ?? 12
  const sapaan = !now ? 'Selamat datang' : hour < 11 ? 'Selamat pagi' : hour < 15 ? 'Selamat siang' : hour < 19 ? 'Selamat sore' : 'Selamat malam'
  const tanggal = now ? new Intl.DateTimeFormat('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).format(now) : ' '
  /* label konteks dengan huruf kapital di awal: "pribadi" → "Pribadi" */
  const contextLabel = moneyCtx.charAt(0).toUpperCase() + moneyCtx.slice(1)

  /* CATATAN PERFORMA — efek "background zoom-out" (scale + opacity ke seluruh
     dashboard) SENGAJA DIHAPUS. Alasannya: begitu seluruh halaman di-scale atau
     di-opacity, Chromium tidak bisa memakai ulang hasil render kartu-kartu
     ber-`backdrop-blur` di dalamnya (deck dompet), sehingga SELURUH halaman
     di-raster ulang tiap frame selama 500ms — persis yang bikin animasi
     buka/tutup Overview & Rekap terasa patah-patah. Fokus user sekarang dijaga
     oleh lapisan gelap milik panel itu sendiri (bg-ink/50 di overview-panel.tsx
     & weekly-recap-modal.tsx), yang biayanya jauh lebih murah. */

  /* Handler stabil (useCallback): dipakai sebagai props kartu yang sudah
     dibungkus `memo`, supaya klik popup tidak memicu re-render dashboard.
     Bonus: effect di OverviewPanel/WeeklyRecapModal yang bergantung pada
     `onClose` juga tidak ikut jalan ulang tiap render. */
  const handleDeckOpen = useCallback((selection: DeckSelection) => {
    setOverviewSelection(selection)
    setOverviewOpen(true)
  }, [])
  const closeOverview = useCallback(() => setOverviewOpen(false), [])
  const openRecap = useCallback(() => setRecapOpen(true), [])
  const closeRecap = useCallback(() => setRecapOpen(false), [])

  return (
    <ScreenShell>
      <div>
        <header className="flex items-start justify-between lg:hidden">
          <LogoWordmark className="h-5" />
          <div className="flex items-center gap-2">
            {/* sensor layar global — versi kompak untuk header mobile */}
            <GlobalPrivacyToggle className="size-9" />
            <button className="flex size-9 items-center justify-center rounded-full bg-cream text-ink ring-1 ring-soil/5" aria-label="Menu">
              <AlignRight className="size-4" />
            </button>
            <span className="relative size-9 overflow-hidden rounded-full ring-1 ring-soil/5">
              <Image src="/avatar-maarif.png" alt="Jon Snow" fill sizes="36px" className="object-cover" />
            </span>
          </div>
        </header>
        {/* switcher konteks (mobile) — state GLOBAL (audit UX #6): di desktop
            switcher-nya ada di Sidebar, jadi baris ini cukup `lg:hidden`.
            Sengaja TIDAK sticky: saat halaman di-scroll ia ikut naik (tidak
            menutupi konten). */}
        <div className="mt-4 flex justify-center lg:hidden">
          <ContextSwitcher value={moneyCtx} onChange={setContext} />
        </div>
        <div className="mt-4 lg:mt-0 lg:flex lg:items-center lg:justify-between lg:gap-8">
          <div className="min-w-0">
            {/* tanggal & sapaan khusus desktop — di mobile blok ini dihilangkan
                supaya user langsung sampai ke kartu dompet */}
            <p className="hidden text-[13px] font-medium text-ink/45 lg:block">{tanggal}</p>
            <h1 className="mt-1 hidden font-display text-3xl font-semibold tracking-tight text-ink lg:block lg:text-4xl">
              {sapaan}, Jon 🌿
            </h1>
            {/* meta ringkas sebagai chip — menggantikan baris teks "Konteks: …"
                yang dulu bertumpuk jadi banyak tingkat, terutama di mobile */}
            <div className="flex flex-wrap items-center gap-2 lg:mt-3">
              <MetaChip icon={WalletIcon}>{wallets.length} dompet</MetaChip>
              <MetaChip icon={Receipt}>{transactions.length} transaksi</MetaChip>
              <MetaChip icon={User} tone="scope" className="hidden lg:inline-flex">
                {contextLabel}
              </MetaChip>
            </div>
          </div>
          <div className="hidden items-center gap-3 lg:flex">
            <label className="flex h-11 w-48 items-center gap-2.5 rounded-full bg-cream px-4 ring-1 ring-soil/5 transition-shadow focus-within:ring-2 focus-within:ring-forest/30 xl:w-64">
              <Search className="size-4 shrink-0 text-ink/40" />
              <input type="search" placeholder="Cari transaksi..." className="w-full bg-transparent text-sm text-ink outline-none placeholder:text-ink/35" />
            </label>
            {/* Global Eye — sensor SEMUA nominal di layar (KRL/kafe friendly) */}
            <GlobalPrivacyToggle />
            <button className="relative flex size-11 shrink-0 items-center justify-center rounded-full bg-cream text-ink ring-1 ring-soil/5 transition-colors hover:bg-sage" aria-label="Notifications">
              <Bell className="size-4" />
              <span className="absolute right-3 top-3 size-2 rounded-full bg-mint ring-2 ring-cream" />
            </button>
            <span className="relative size-11 shrink-0 overflow-hidden rounded-full ring-1 ring-soil/5">
              <Image src="/avatar-maarif.png" alt="Jon Snow" fill sizes="44px" className="object-cover" />
            </span>
          </div>
        </div>
        {/* banner conditional: masa aktif / kuota AI / sinking fund (HomeBanners)
            + rekap mingguan akhir pekan (WeeklyRecapBanner). Dua-duanya hanya
            muncul saat kondisinya terpenuhi, jadi tinggi halaman ikut menyesuaikan. */}
        <div className="mt-4 space-y-2.5 lg:mt-5">
          <HomeBanners />
          <WeeklyRecapBanner onOpen={openRecap} />
        </div>

        {/* ── baris 1 ────────────────────────────────────────────────────────
            Hierarki visual baru: kartu dompet DIPERKECIL (7 → 5 kolom) karena
            saldo dompet sifatnya pasif, sementara kolom Jatah Hari Ini dapat
            7 kolom (dulu 5) — plus slot Nudge AI di bawahnya. Jatah Harian
            adalah alasan user membuka app 3x sehari, jadi ia yang dominan. */}
        <div className="mt-6 grid grid-cols-1 gap-5 lg:mt-8 lg:grid-cols-12 lg:gap-6">
          <div className="lg:col-span-5">
            <div className="flex h-full flex-col justify-center rounded-[2rem] bg-cream p-4 ring-1 ring-soil/5 sm:p-5">
              <WalletCardStack onOpen={handleDeckOpen} />
            </div>
          </div>
          <div className="flex flex-col gap-5 lg:col-span-7">
            <DailyHudCard />
            <DailyNudge />
          </div>
        </div>

        {/* ── baris 2: tanaman (metafora pertumbuhan) + arus uang dua seri ──── */}
        <div className="mt-5 grid grid-cols-1 gap-5 lg:mt-6 lg:grid-cols-12 lg:gap-6">
          <div className="h-full lg:col-span-5">
            <PlantWidget />
          </div>
          <div className="h-full lg:col-span-7">
            <CashFlowCard />
          </div>
        </div>

        {/* ── baris 3: transaksi terakhir + distribusi & tabungan impian ────── */}
        <div className="mt-5 grid grid-cols-1 gap-5 lg:mt-6 lg:grid-cols-12 lg:gap-6">
          <div className="h-full lg:col-span-7">
            <RecentTransactionsCard />
          </div>
          <div className="flex flex-col gap-5 lg:col-span-5">
            <ExpenseDistributionCard />
            <MyGoalsCard />
          </div>
        </div>
      </div>
      <OverviewPanel
        open={overviewOpen}
        onClose={closeOverview}
        selection={overviewSelection}
      />
      <WeeklyRecapModal open={recapOpen} onClose={closeRecap} />
    </ScreenShell>
  )
}
