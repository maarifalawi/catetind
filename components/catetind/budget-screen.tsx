'use client'

import { useMemo, useState } from 'react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
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
import { SpendingReviewSheet } from './spending-review-sheet'
import { ContextSwitcher } from './context-switcher'
import { GlobalPrivacyToggle } from './global-privacy-toggle'
import { useMoneyContext } from './money-context-provider'
import { usePrivacy } from './privacy-provider'
import { cn } from '@/lib/utils'
import { openAICoachWithSeed } from '@/lib/ai-chat-bus'
import {
  CURRENT_DAY,
  FUND_DETAIL_COPY,
  INITIAL_BUDGETS,
  INITIAL_SINKING_FUNDS,
  MONTHLY_INCOME,
  SPENT_THIS_MONTH,
  SPENDING_REVIEW_COPY,
  TOTAL_INSTALLMENTS,
  budgetsForPeriod,
  computeDailyHud,
  formatIDR,
  periodFromTab,
  periodIncome,
  periodWindowForTab,
  plantStageFrom,
  sinkingObligationOf,
  totalSurplus,
  type BudgetItem,
  type PeriodTab,
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

/** jeda sebelum AI Coach dibuka = sepanjang animasi tutup bottom sheet
 *  (`SHEET_EASE` di budget-sheet.tsx, ±0,3 detik) — lihat handleContinueToCoach */
const COACH_HANDOFF_MS = 320

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
  const [periodTab, setPeriodTab] = useState<PeriodTab>('monthly')
  /** audit #5 — Jatah Hari Ini disematkan ke Dashboard (menggantikan "Sinkron") */
  const [hudPinned, setHudPinned] = useState(false)
  const [showAddBudget, setShowAddBudget] = useState(false)
  const [showAddGoal, setShowAddGoal] = useState(false)
  const [showSweepModal, setShowSweepModal] = useState(false)
  /** panel "Review Pengeluaran Hari Ini" — dibuka CTA over-budget & tombol Review */
  const [showReview, setShowReview] = useState(false)
  /** celengan yang sedang menerima setoran (null = sheet tertutup) */
  const [contributeTarget, setContributeTarget] = useState<SinkingFundItem | null>(null)
  /** navigasi proaktif: kartu celengan membuka halaman detail /budget/[id] */
  const router = useRouter()

  /* data halaman (mock lokal — nanti dari Supabase) */
  const [budgets, setBudgets] = useState<BudgetItem[]>(INITIAL_BUDGETS)
  const [funds, setFunds] = useState<SinkingFundItem[]>(INITIAL_SINKING_FUNDS)

  /** caption di bawah judul — posisinya sama dengan baris tanggal Dashboard,
   *  jadi user membaca "konteks + isi halaman" dari titik yang sama. */
  const scopeCaption =
    context === 'pribadi'
      ? 'Rencana uangmu sendiri'
      : context === 'keluarga'
        ? 'Rencana uang keluarga'
        : 'Rencana uang bersama'

  /* ── PERIODE AKTIF ─────────────────────────────────────────────────────
     Satu `window` dipakai bareng oleh kartu Jatah Hari Ini, daftar kategori,
     dan garis pacing — jadi tidak mungkin ada dua angka periode berbeda di
     layar yang sama. `payday` cuma nama tampil untuk model 'custom'. */
  const period = useMemo(() => periodWindowForTab(periodTab), [periodTab])

  /* ── DATA TURUNAN — semua ikut konteks (Pribadi / Keluarga) ───────────── */
  const visibleBudgets = useMemo(
    () => budgets.filter((budget) => budget.scope === context),
    [budgets, context],
  )
  const visibleFunds = useMemo(
    () => funds.filter((fund) => fund.scope === context),
    [funds, context],
  )
  /** SATU daftar budget, disaring periode aktif (bukan daftar terpisah) */
  const periodBudgets = useMemo(
    () => budgetsForPeriod(visibleBudgets, period),
    [visibleBudgets, period],
  )

  /* ── JATAH HARIAN — dihitung SETELAH cicilan & celengan (audit UX #2) ──
     Kalau kewajiban celengan bulan ini melebihi sisa uang, `hud.shortfall`
     bernilai true → kartu Jatah Hari Ini pindah ke nada terracotta dan jatah
     harian DITAHAN, bukan ditampilkan seolah aman dibelanjakan.

     Dua catatan periode:
     • kewajiban celengan dihitung dari SEMUA fund — kartu ini metrik GLOBAL
       (audit UX #3) dan disamakan dengan `DAILY_HUD` yang dipakai Home;
     • `window` membuat pembaginya panjang periode aktif, jadi tab Mingguan
       membagi sisa uang dengan sisa hari minggu itu, bukan sisa bulan. */
  const sinkingObligation = useMemo(() => sinkingObligationOf(funds), [funds])
  const hud = useMemo(
    () =>
      computeDailyHud({
        monthlyIncome: MONTHLY_INCOME,
        totalInstallments: TOTAL_INSTALLMENTS,
        sinkingObligation,
        spentThisMonth: SPENT_THIS_MONTH,
        window: period,
      }),
    [sinkingObligation, period],
  )

  /* ── PEMASUKAN DI PERIODE AKTIF (PRD 2B.3) ─────────────────────────────
     Tidak ada pemasukan di jendela → kartu Dry Spell (tanpa Rp 0/hari).
     Pemasukan masuk di tengah periode → catatan kecil di bawah jatah harian. */
  const income = useMemo(() => periodIncome(period), [period])

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
    /* yang disapu = sisa budget PERIODE yang sedang dilihat (persis yang
       ditampilkan kartu Sapu Bersih, bukan seluruh daftar konteks) */
    const swept = totalSurplus(periodBudgets)
    const sweptIds = new Set(
      periodBudgets.filter((budget) => budget.limit - budget.spent > 0).map((b) => b.id),
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

  /** Detail celengan: progres besar + riwayat setoran + tanaman yang tumbuh.
   *  Kartu Celengan Impian (badan kartu) sekarang BENAR-BENAR membuka halaman
   *  detail — route `app/budget/[id]/page.tsx`. Sebelumnya aksi ini cuma
   *  memunculkan toast "belum tersedia" (jalan buntu di dalam app, Fase 1
   *  ROADMAP).
   *
   *  Catatan: halaman detail membaca data dari `lib/data/budget.ts`, sedangkan
   *  celengan yang baru dibuat lewat <AddGoalSheet/> cuma hidup di state halaman
   *  ini (demo tanpa backend). Untuk celengan baru itu kita jelaskan apa adanya
   *  — bukan melempar user ke halaman 404. Begitu ada tabel `sinking_funds` +
   *  endpoint-nya, penjaga `known` di bawah boleh langsung dihapus. */
  function handleOpenFund(fund: SinkingFundItem) {
    const known = INITIAL_SINKING_FUNDS.some((item) => item.id === fund.id)
    if (!known) {
      toast(FUND_DETAIL_COPY.demoOnlyTitle, { description: FUND_DETAIL_COPY.demoOnlyHint })
      return
    }
    router.push(`/budget/${fund.id}`)
  }

  /** CTA "Review Pengeluaran Hari Ini" — dari banner over-budget (Zona A) maupun
   *  tombol `Review Pengeluaran →` di kartu kategori. Sejak prompt 19 keduanya
   *  membuka PANEL ringkasan hari ini, bukan toast "panel segera hadir". */
  function handleReviewCoach() {
    setShowReview(true)
  }

  /** Kaki panel: lanjut ngobrol sama Minca dengan pertanyaan sudah terisi.
   *  Panel ditutup DULU, baru AI Coach dibuka: dua overlay yang hidup bersamaan
   *  bikin glitch di mobile (bottom sheet z-[70] menutupi panel chat z-[60]
   *  selama animasi tutupnya), jadi kita beri jeda sepanjang animasi itu.
   *  Pertanyaannya dikirim lewat bus event — state percakapan tetap SATU, milik
   *  `ai-chat-widget.tsx` (lihat lib/ai-chat-bus.ts untuk alasannya). */
  function handleContinueToCoach() {
    setShowReview(false)
    window.setTimeout(
      () => openAICoachWithSeed(SPENDING_REVIEW_COPY.coachSeed),
      COACH_HANDOFF_MS,
    )
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
          window={period}
          income={income}
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
              <span
                className="rounded-full bg-cream px-2 py-0.5 text-[10.5px] font-bold text-ink/45 tabular-nums ring-1 ring-soil/12"
                aria-label={`Budget pada periode ${period.label}`}
              >
                {periodBudgets.length}
              </span>
            </div>
            <BudgetZoneA
              budgets={periodBudgets}
              masked={masked}
              window={period}
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
        initialPeriod={periodFromTab(periodTab)}
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
        budgets={periodBudgets}
        funds={funds}
        masked={masked}
        onConfirm={handleSweep}
      />
      {/* Panel review hari ini — dibuka dua CTA over-budget (prompt 19).
          Menerima `hud`/`period`/`income` yang SAMA dengan kartu di atasnya,
          jadi angka panel tidak mungkin beda dari layar ini. */}
      <SpendingReviewSheet
        open={showReview}
        onClose={() => setShowReview(false)}
        hud={hud}
        window={period}
        income={income}
        masked={masked}
        onContinueChat={handleContinueToCoach}
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

