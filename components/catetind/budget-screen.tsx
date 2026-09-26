'use client'

import { useMemo, useState } from 'react'
import Image from 'next/image'
import { AnimatePresence, motion } from 'framer-motion'
import { AlignRight, PiggyBank, Target as TargetIcon } from 'lucide-react'
import { toast } from 'sonner'
import { ScreenShell } from './screen-shell'
import { LogoWordmark } from './logo-wordmark'
import { MetaChip } from './meta-chip'
import { BudgetZoneA } from './budget-zone-a'
import { BudgetZoneB } from './budget-zone-b'
import { DailyHudSummary } from './daily-hud-summary'
import { AddBudgetSheet } from './add-budget-sheet'
import { AddGoalSheet } from './add-goal-sheet'
import { ContributeSheet } from './contribute-sheet'
import { SweepSheet } from './sweep-sheet'
import { ContextSwitcher } from './context-switcher'
import { GlobalPrivacyToggle } from './global-privacy-toggle'
import { useMoneyContext } from './money-context-provider'
import { usePrivacy } from './privacy-provider'
import { cn } from '@/lib/utils'
import {
  CURRENT_DAY,
  DAYS_IN_MONTH,
  HAS_INCOME_THIS_MONTH,
  INITIAL_BUDGETS,
  INITIAL_SINKING_FUNDS,
  MONTHLY_INCOME,
  SPENT_THIS_MONTH,
  TOTAL_INSTALLMENTS,
  computeDailyHud,
  formatIDR,
  plantStageFrom,
  sinkingObligationOf,
  totalSurplus,
  type BudgetItem,
  type BudgetPeriod,
  type SinkingFundItem,
} from '@/lib/data/budget'

/* ── Budget & Target (/app/budget) ───────────────────────────────────────────
   Satu halaman, dua zona:

   Zona A — Budget Kategori : batas pengeluaran per kategori (Daily HUD,
            pacing, sapu bersih, AI Coach)
   Zona B — Celengan Impian : sinking fund dengan metafora tanaman

   Prinsip utamanya PROGRESSIVE DISCLOSURE — layar utama sengaja cuma memuat
   hal yang sedang relevan. Sisanya muncul lewat kondisi (dry spell, sapu
   bersih, nudge, over budget), mikro-UI (ghost pacing line), atau bottom sheet
   (tambah budget, tanam celengan, setor, sapu bersih).

   Layout: mobile satu kolom dengan tab zona (biar tidak jadi scroll panjang),
   desktop dua kolom (kiri Zona A, kanan Zona B) karena ruangnya cukup.
   ────────────────────────────────────────────────────────────────────────── */

type ZoneTab = 'budget' | 'goals'

export function BudgetScreen() {
  /* ── STATE ──────────────────────────────────────────────────────────── */
  /* privasi nominal: state GLOBAL (PrivacyProvider) — tombol mata di header
     halaman ini kini komponen baku <GlobalPrivacyToggle /> (audit UX #7). */
  const { masked } = usePrivacy()
  /* konteks Pribadi/Keluarga/Bersama: state GLOBAL (MoneyContextProvider).
     Sejak blok "Konteks Uang" dihapus dari Sidebar, pill-nya hanya tampil di
     header mobile halaman ini — nilainya tetap satu sumber dengan halaman lain. */
  const { context, setContext } = useMoneyContext()
  const [activeTab, setActiveTab] = useState<ZoneTab>('budget')
  const [periodTab, setPeriodTab] = useState<BudgetPeriod | 'payday'>('monthly')
  /** audit #5 — Jatah Hari Ini disematkan ke Dashboard (menggantikan "Sinkron") */
  const [hudPinned, setHudPinned] = useState(false)
  const [showAddBudget, setShowAddBudget] = useState(false)
  const [showAddGoal, setShowAddGoal] = useState(false)
  const [showSweepModal, setShowSweepModal] = useState(false)
  /** celengan yang sedang menerima setoran (null = sheet tertutup) */
  const [contributeTarget, setContributeTarget] = useState<SinkingFundItem | null>(null)

  /* data halaman (mock lokal — nanti dari Supabase) */
  const [budgets, setBudgets] = useState<BudgetItem[]>(INITIAL_BUDGETS)
  const [funds, setFunds] = useState<SinkingFundItem[]>(INITIAL_SINKING_FUNDS)
  const hasIncomeThisMonth = HAS_INCOME_THIS_MONTH

  /** caption di bawah judul — posisinya sama dengan baris tanggal Dashboard,
   *  jadi user membaca "konteks + isi halaman" dari titik yang sama. */
  const scopeCaption =
    context === 'pribadi'
      ? 'Rencana uangmu sendiri'
      : context === 'keluarga'
        ? 'Rencana uang keluarga'
        : 'Rencana uang bersama'

  /* ── DATA TURUNAN — semua ikut konteks (Pribadi / Keluarga) ───────────── */
  const visibleBudgets = useMemo(
    () => budgets.filter((budget) => budget.scope === context),
    [budgets, context],
  )
  const visibleFunds = useMemo(
    () => funds.filter((fund) => fund.scope === context),
    [funds, context],
  )

  /* ── JATAH HARIAN — dihitung SETELAH cicilan & celengan (audit UX #2) ──
     Kalau kewajiban celengan bulan ini melebihi sisa uang, `hud.shortfall`
     bernilai true → kartu Jatah Hari Ini pindah ke nada terracotta dan jatah
     harian DITAHAN, bukan ditampilkan seolah aman dibelanjakan. */
  const sinkingObligation = useMemo(() => sinkingObligationOf(visibleFunds), [visibleFunds])
  const hud = useMemo(
    () =>
      computeDailyHud({
        monthlyIncome: MONTHLY_INCOME,
        totalInstallments: TOTAL_INSTALLMENTS,
        sinkingObligation,
        spentThisMonth: SPENT_THIS_MONTH,
        currentDay: CURRENT_DAY,
        daysInMonth: DAYS_IN_MONTH,
      }),
    [sinkingObligation],
  )

  /* ── AKSI ────────────────────────────────────────────────────────────── */

  /** audit #5 — sematkan kartu Jatah Hari Ini ke Dashboard (bukan "sinkron") */
  function handlePinHud() {
    setHudPinned((prev) => !prev)
    if (!hudPinned) {
      toast.success('Kartu Jatah Hari Ini dipin ke Dashboard 📌', {
        description: 'Selalu kelihatan di halaman depan.',
      })
    }
  }

  /** 3F — budget baru masuk konteks yang sedang aktif */
  function handleSaveBudget(data: Omit<BudgetItem, 'id' | 'spent'>) {
    setBudgets((prev) => [
      ...prev,
      { ...data, id: prev.reduce((max, item) => Math.max(max, item.id), 0) + 1, spent: 0 },
    ])
    setShowAddBudget(false)
    toast.success(`Budget ${data.category} dibuat! 🌿`, {
      description: `${formatIDR(data.limit)} siap kamu jaga bersama.`,
    })
  }

  /** 4C — celengan baru selalu mulai dari benih 🌱 */
  function handleSaveGoal(
    data: Omit<SinkingFundItem, 'id' | 'current' | 'stage' | 'contributedThisMonth'>,
  ) {
    setFunds((prev) => [
      ...prev,
      {
        ...data,
        id: prev.reduce((max, item) => Math.max(max, item.id), 0) + 1,
        current: 0,
        stage: 'seed',
        contributedThisMonth: false,
      },
    ])
    setShowAddGoal(false)
    toast.success('Celengan baru ditanam! 🌱')
  }

  /** 4B — setoran: saldo celengan naik & tanamannya ikut tumbuh */
  function handleContribute(fundId: number, amount: number, walletId: string) {
    const fund = funds.find((item) => item.id === fundId)
    const walletName =
      walletId === 'bca' ? 'BCA' : walletId === 'gopay' ? 'GoPay' : 'Tunai'

    setFunds((prev) =>
      prev.map((item) =>
        item.id === fundId
          ? {
              ...item,
              current: item.current + amount,
              stage: plantStageFrom(item.current + amount, item.target),
              contributedThisMonth: true,
            }
          : item,
      ),
    )
    setContributeTarget(null)
    toast.success(`${formatIDR(amount)} disetor ke ${fund?.name ?? 'celengan'}! 🌱`, {
      description: `Dari ${walletName} — tanamannya makin subur.`,
    })
  }

  /** 3G — sapu sisa budget ke celengan pilihan */
  function handleSweep(fundId: number) {
    const target = funds.find((fund) => fund.id === fundId)
    /* yang disapu = sisa budget konteks yang sedang dilihat (sesuai kartu Sapu Bersih) */
    const swept = totalSurplus(visibleBudgets)
    const sweptIds = new Set(
      visibleBudgets.filter((budget) => budget.limit - budget.spent > 0).map((b) => b.id),
    )

    setFunds((prev) =>
      prev.map((fund) =>
        fund.id === fundId
          ? {
              ...fund,
              current: fund.current + swept,
              stage: plantStageFrom(fund.current + swept, fund.target),
              contributedThisMonth: true,
            }
          : fund,
      ),
    )
    /* sisa dianggap terpakai → limit mulai dari nol lagi bulan depan */
    setBudgets((prev) =>
      prev.map((budget) =>
        sweptIds.has(budget.id) ? { ...budget, spent: budget.limit } : budget,
      ),
    )
    setShowSweepModal(false)
    toast.success(`${formatIDR(swept)} disapu ke ${target?.name ?? 'celengan'}! 🧹🎉`)
  }

  /** Detail celengan: progress besar + riwayat setoran + animasi Lottie tanaman */
  function handleOpenFund(fund: SinkingFundItem) {
    // TODO: /app/budget/[id] — Sinking Fund Detail page. Demo masih satu halaman,
    // jadi pembukaan detail cukup diumumkan lewat toast.
    toast(`Buka detail ${fund.name}`, {
      description: 'Halaman detail celengan segera hadir.',
    })
  }

  /** CTA review bareng AI Coach (nada mendampingi, bukan menuduh) */
  function handleReviewCoach() {
    // TODO: Link to AI Coach panel
    toast('Aku temenin review ya 🤖', {
      description: 'Panel review pengeluaran hari ini segera hadir.',
    })
  }

  /** Tab zona kini HANYA untuk mobile (audit #4: di desktop kedua zona sudah
   *  tampil berdampingan, jadi tab = redundansi UX). Cukup ganti zona aktif. */
  function handleZoneTab(tab: ZoneTab) {
    setActiveTab(tab)
  }

  /* ── RENDER ──────────────────────────────────────────────────────────── */
  return (
    <ScreenShell>
      {/* ── HEADER Halaman — KERANGKA SAMA DENGAN DASHBOARD (HomeScreen) ──────
          Sebelumnya halaman ini memakai header `sticky` yang "bleed" ke tepi
          (-mx-5 … xl:-mx-14 + bg-cream/85 backdrop-blur-xl). Akibatnya titik
          awal konten, gaya judul, dan baris aksinya BEDA dari Dashboard.

          Sekarang kerangkanya disamakan 1:1 dengan HomeScreen:
            • mobile  : baris logo + cluster aksi (privasi/menu/avatar),
                        lalu baris switcher konteks + tab zona
            • desktop : caption kecil + judul + chip meta di kiri,
                        cluster aksi di kanan
          Jadi begitu pindah Dashboard ⇄ Budget & Target, posisi judul, chip,
          dan kartu pertama tidak lagi "melompat".
          Bonus: header tidak lagi menempel (sticky) dan tidak lagi memakai
          backdrop-blur selebar layar — sama seperti Dashboard. */}
      <header className="flex items-start justify-between lg:hidden">
        <LogoWordmark className="h-5" />
        <div className="flex items-center gap-2">
          {/* sensor layar global — versi kompak untuk header mobile */}
          <GlobalPrivacyToggle className="size-9" />
          <button
            type="button"
            className="flex size-9 items-center justify-center rounded-full bg-cream text-ink ring-1 ring-soil/12"
            aria-label="Menu"
          >
            <AlignRight className="size-4" />
          </button>
          <span className="relative size-9 overflow-hidden rounded-full ring-1 ring-soil/12">
            <Image
              src="/avatar-maarif.png"
              alt="Jon Snow"
              fill
              sizes="36px"
              className="object-cover"
            />
          </span>
        </div>
      </header>

      {/* switcher konteks + tab zona (khusus mobile) — Konteks Uang tidak lagi
          ada di Sidebar, jadi di mobile ia tetap muncul di sini mengikuti pola
          Dashboard. Di desktop tab zona disembunyikan karena kedua zona sudah
          tampil berdampingan. */}
      <div className="mt-4 flex flex-wrap items-center justify-center gap-2.5 lg:hidden">
        <ContextSwitcher value={context} onChange={setContext} className="max-w-[260px]" />
        <ZoneTabs value={activeTab} onChange={handleZoneTab} />
      </div>

      {/* ── baris judul — struktur & spasi identik dengan header Dashboard ─── */}
      <div className="mt-4 lg:mt-0 lg:flex lg:items-center lg:justify-between lg:gap-8">
        <div className="min-w-0">
          <p className="text-[13px] font-medium text-ink/45">{scopeCaption}</p>
          <h1 className="mt-1 font-display text-3xl font-semibold tracking-tight text-ink lg:text-4xl">
            Budget &amp; Target
          </h1>
          <div className="mt-2 flex flex-wrap items-center gap-2 lg:mt-3">
            <MetaChip icon={TargetIcon}>{visibleBudgets.length} kategori</MetaChip>
            <MetaChip icon={PiggyBank}>{visibleFunds.length} celengan</MetaChip>
          </div>
        </div>
        <div className="hidden items-center gap-3 lg:flex">
          <GlobalPrivacyToggle />
        </div>
      </div>

      {/* ── JATAH HARI INI — kartu super-hero full-width (audit #3) ──────────
          Membentang SEBELUM halaman terbelah dua kolom: metrik global tidak
          boleh dikurung di dalam kolom "Budget Kategori". */}
      <div className="mt-6 lg:mt-8">
        <DailyHudSummary
          hud={hud}
          masked={masked}
          hasIncomeThisMonth={hasIncomeThisMonth}
          pinned={hudPinned}
          onPin={handlePinHud}
        />
      </div>

      {/* ── KONTEN: mobile = satu zona per tab, desktop = dua kolom ───────── */}
      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={context}
          initial={{ opacity: 0, x: 14 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -14 }}
          transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
          className="mt-5 grid grid-cols-1 gap-5 pb-2 lg:mt-6 lg:grid-cols-12 lg:gap-6"
        >
          {/* ZONA A — Budget Kategori */}
          <section
            id="zone-budget"
            aria-label="Budget Kategori"
            className={cn(
              'scroll-mt-36 lg:col-span-6 lg:scroll-mt-40',
              activeTab !== 'budget' && 'hidden lg:block',
            )}
          >
            <div className="mb-3 hidden items-center justify-between gap-3 lg:flex">
              <h2 className="font-display text-[17px] font-bold tracking-tight text-ink">
                Budget Kategori
              </h2>
              <span className="rounded-full bg-cream px-2 py-0.5 text-[10.5px] font-bold text-ink/45 tabular-nums ring-1 ring-soil/12">
                {visibleBudgets.length}
              </span>
            </div>
            <BudgetZoneA
              budgets={visibleBudgets}
              masked={masked}
              currentDay={CURRENT_DAY}
              periodTab={periodTab}
              onPeriodChange={setPeriodTab}
              onAddBudget={() => setShowAddBudget(true)}
              onSweep={() => setShowSweepModal(true)}
              onReviewCoach={handleReviewCoach}
            />
          </section>

          {/* ZONA B — Celengan Impian */}
          <section
            id="zone-goals"
            aria-label="Celengan Impian"
            className={cn(
              'scroll-mt-36 lg:col-span-6 lg:scroll-mt-40',
              activeTab !== 'goals' && 'hidden lg:block',
            )}
          >
            <div className="mb-3 hidden items-center justify-between gap-3 lg:flex">
              <h2 className="font-display text-[17px] font-bold tracking-tight text-ink">
                Celengan Impian
              </h2>
              <span className="rounded-full bg-cream px-2 py-0.5 text-[10.5px] font-bold text-ink/45 tabular-nums ring-1 ring-soil/12">
                {visibleFunds.length}
              </span>
            </div>
            <BudgetZoneB
              funds={visibleFunds}
              masked={masked}
              currentDay={CURRENT_DAY}
              onAddGoal={() => setShowAddGoal(true)}
              onContribute={setContributeTarget}
              onOpenFund={handleOpenFund}
            />
          </section>
        </motion.div>
      </AnimatePresence>

      {/* ── BOTTOM SHEET (mobile) / DIALOG (desktop) ─────────────────────── */}
      <AddBudgetSheet
        open={showAddBudget}
        onClose={() => setShowAddBudget(false)}
        scope={context}
        onSave={handleSaveBudget}
      />
      <AddGoalSheet
        open={showAddGoal}
        onClose={() => setShowAddGoal(false)}
        scope={context}
        onSave={handleSaveGoal}
      />
      <ContributeSheet
        fund={contributeTarget}
        open={contributeTarget !== null}
        onClose={() => setContributeTarget(null)}
        onContribute={handleContribute}
        masked={masked}
      />
      <SweepSheet
        open={showSweepModal}
        onClose={() => setShowSweepModal(false)}
        budgets={visibleBudgets}
        funds={funds}
        masked={masked}
        onConfirm={handleSweep}
      />
    </ScreenShell>
  )
}

/* ── Catatan design system ───────────────────────────────────────────────────
   Toggle privasi & pill konteks TIDAK didefinisikan lokal di halaman ini.
   Keduanya kini komponen baku yang dipakai semua halaman:
   • privasi → <GlobalPrivacyToggle /> (audit UX #7)
   • konteks → <ContextSwitcher />  — dipakai di header MOBILE halaman ini dan
     <MoneyContextProvider> (root layout). Sejak "Konteks Uang" dihapus dari
     Sidebar, di desktop switcher-nya tidak lagi tampil; state-nya tetap hidup
     global sehingga halaman lain yang membutuhkannya tinggal memakainya.
   ────────────────────────────────────────────────────────────────────────── */

const ZONE_TABS: { id: ZoneTab; label: string }[] = [
  { id: 'budget', label: 'Budget Kategori' },
  { id: 'goals', label: 'Celengan Impian' },
]

/** Tab zona — HANYA dirender di mobile. Audit UX #4: di desktop tab DIHAPUS
 *  karena kedua zona sudah tampil berdampingan (tab = redundansi UX). */
function ZoneTabs({ value, onChange }: { value: ZoneTab; onChange: (value: ZoneTab) => void }) {
  return (
    <div
      role="tablist"
      aria-label="Zona halaman"
      className="flex items-center gap-1 rounded-full bg-cream/70 p-1 ring-1 ring-soil/12"
    >
      {ZONE_TABS.map((tab) => {
        const active = value === tab.id
        return (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(tab.id)}
            className="relative rounded-full px-3 py-1.5 text-[11.5px] font-semibold transition-colors duration-200 active:scale-95"
          >
            {active && (
              <motion.span
                aria-hidden
                layoutId="budget-zone-pill"
                className="absolute inset-0 rounded-full bg-forest"
                transition={{ type: 'spring', stiffness: 520, damping: 38 }}
              />
            )}
            <span className={cn('relative z-10', active ? 'text-mint' : 'text-ink/45 hover:text-ink')}>
              {tab.label}
            </span>
          </button>
        )
      })}
    </div>
  )
}

