'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { AnimatePresence, motion } from 'framer-motion'
import { PiggyBank, Target as TargetIcon } from 'lucide-react'
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
import { ConfirmDialog } from './confirm-dialog'
import { ContextSwitcher } from './context-switcher'
import { GlobalPrivacyToggle } from './global-privacy-toggle'
import { useMoneyContext } from './money-context-provider'
import { usePrivacy } from './privacy-provider'
import { cn } from '@/lib/utils'
import { openAICoachWithSeed } from '@/lib/ai-chat-bus'
import { UNDO_WINDOW_MS } from '@/lib/data/history'
import {
  BUDGET_DELETE_COPY,
  BUDGET_DELETE_TOAST,
  BUDGET_SAVE_TOAST,
  CURRENT_DAY,
  FUND_CREATE_TOAST,
  FUND_DELETE_COPY,
  FUND_DELETE_TOAST,
  FUND_DETAIL_COPY,
  FUND_SWEEP_TOAST,
  TODAY_ISO,
  INITIAL_BUDGETS,
  SPENDING_REVIEW_COPY,
  applyBudgetSave,
  budgetsForPeriod,
  computeDailyHud,
  earnedInWindow,
  maskNominal,
  periodFromTab,
  periodIncome,
  periodLimitWord,
  periodWindowForTab,
  removeBudget,
  restoreBudget,
  sinkingObligationOf,
  spentInWindow,
  totalSurplus,
  walletSourceName,
  type BudgetItem,
  type PeriodTab,
  type SinkingFundItem,
} from '@/lib/data/budget'
import {
  addFund,
  contributeToFund,
  deleteFund,
  restoreFund,
  sweepIntoFund,
  useLiveFunds,
} from '@/lib/money/funds-store'
import { recordedTransactions, useMoneyStore } from '@/lib/money/store'
import { useUserMoneySettings } from '@/lib/user-money-settings'
import { dayOfMonth } from '@/lib/time'
import { useTodayISO } from '@/lib/use-today-iso'

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

export function BudgetScreen({
  initialAddCategory,
  initialPlantGoal = false,
}: {
  initialAddCategory?: string
  /** `?tanam=1` dari Home (tombol `+` di kartu Tabungan Impian, paket 29):
   *  halaman membuka Zona Celengan + sheet "Tanam Celengan Baru" sejak render
   *  pertama, jadi satu tap dari Home langsung mendarat di formnya. */
  initialPlantGoal?: boolean
}) {
  /* ── STATE ──────────────────────────────────────────────────────────── */
  /* privasi nominal: state GLOBAL (PrivacyProvider) — tombol mata di header
     halaman ini kini komponen baku <GlobalPrivacyToggle /> (audit UX #7). */
  const { masked, money } = usePrivacy()
  /* catatan: semua `money(...)` di bawah = nominal + sensor dalam satu langkah,
     diambil dari PrivacyProvider (definisi aturan sensor cuma di satu tempat) —
     toast ikut disensor karena ia pajangan yang tinggal di layar (§5.7). */
  /* konteks Pribadi/Keluarga/Bersama: state GLOBAL (MoneyContextProvider).
     Sejak blok "Konteks Uang" dihapus dari Sidebar, pill-nya hanya tampil di
     header mobile halaman ini — nilainya tetap satu sumber dengan halaman lain. */
  const { context, setContext } = useMoneyContext()
  const [activeTab, setActiveTab] = useState<ZoneTab>(initialPlantGoal ? 'goals' : 'budget')
  const [periodTab, setPeriodTab] = useState<PeriodTab>('monthly')
  /* audit #5 — tombol "Pin ke Dashboard" DIHAPUS di paket 60.3: ia hanya
     membalik state halaman ini sementara `DailyHudCard` di Home tidak menerima
     prop apa pun. Tidak ada lagi `hudPinned`/`handlePinHud` di sini. */
  const [showAddBudget, setShowAddBudget] = useState(initialAddCategory !== undefined)
  /* Jalur pintas dari insight /history (`/budget?add=Kopi`): sheet tambah budget
     TERBUKA SEJAK RENDER PERTAMA dengan kategori itu terpilih, jadi user cuma
     perlu isi nominalnya. Kategorinya dipakai SEKALI — begitu sheet ditutup, ia
     dilepas supaya tombol "+ Tambah Budget Baru" kembali membuka form dari Step 1.
     URL-nya sendiri dibiarkan apa adanya: refresh = niat yang sama, dan tidak ada
     navigasi router yang bisa mem-mount ulang komponen ini tepat saat sheet-nya
     baru terbuka. */
  const [prefilledCategory, setPrefilledCategory] = useState<string | undefined>(initialAddCategory)
  const [showAddGoal, setShowAddGoal] = useState(initialPlantGoal)
  const [showSweepModal, setShowSweepModal] = useState(false)
  /** panel "Review Pengeluaran Hari Ini" — dibuka CTA over-budget & tombol Review */
  const [showReview, setShowReview] = useState(false)
  /** celengan yang sedang menerima setoran (null = sheet tertutup) */
  const [contributeTarget, setContributeTarget] = useState<SinkingFundItem | null>(null)
  /* ── HAPUS = KONFIRMASI + UNDO (paket 60) ────────────────────────────────
     Dua aksi merusak yang baru punya pintu di paket ini: mencabut budget
     kategori (60.1) dan mencabut celengan (60.2). Keduanya tidak langsung
     jalan — `pending*` menahan niatnya sampai user menekan Hapus di dialog,
     dan sesudahnya masih ada jendela Undo (`UNDO_WINDOW_MS`) seperti hapus
     tagihan (pola `bills-screen.tsx`).

     Jejak Undo disimpan di `useRef` (bukan state): yang menentukan "Undo masih
     berlaku?" adalah umurnya, bukan apa yang tampil di layar. */
  const [pendingBudgetDelete, setPendingBudgetDelete] = useState<BudgetItem | null>(null)
  const [pendingFundDelete, setPendingFundDelete] = useState<SinkingFundItem | null>(null)
  const budgetUndoRef = useRef<{ item: BudgetItem; index: number } | null>(null)
  const fundUndoRef = useRef<number | null>(null)
  /** id budget yang sudah "dipensiunkan" — supaya `applyBudgetSave()` tidak
   *  memakai ulang id baris yang baru dicabut (paket 60.1) */
  const retiredBudgetIds = useRef<number[]>([])
  /** semua timer halaman — dibersihkan saat unmount supaya tidak ada set state
   *  pada komponen yang sudah hilang (pola `bills-screen.tsx`) */
  const timers = useRef<number[]>([])
  useEffect(() => {
    const pending = timers.current
    return () => pending.forEach((id) => window.clearTimeout(id))
  }, [])
  const later = (fn: () => void, ms: number) => {
    timers.current.push(window.setTimeout(fn, ms))
  }
  /** navigasi proaktif: kartu celengan membuka halaman detail /budget/[id] */
  const router = useRouter()


  /* data halaman (mock lokal — nanti dari Supabase) */
  const [budgets, setBudgets] = useState<BudgetItem[]>(INITIAL_BUDGETS)
  /* celengan = SATU STORE untuk seluruh app (paket 46), disaring TOMBSTONE
     (paket 60.2). Dulu halaman ini punya `useState(INITIAL_SINKING_FUNDS)`
     sendiri, sehingga celengan yang ditanam di sini tidak pernah muncul di
     kartu "Tabungan Impian" Home dan setoran di /budget/<id> tidak terlihat di
     sini. Sekarang tiga tempat itu membaca state yang sama
     (`lib/money/funds-store.ts`), dan celengan yang DIHAPUS user tidak lagi ikut
     kehitung sebagai kewajiban di Jatah Hari Ini. */
  const funds = useLiveFunds()

  /* ── JANGKAR TANGGAL + KONFIGURASI UANG USER (paket 57) ───────────────────
     `today` = tanggal perangkat, diisi setelah mount (`''` pada render pertama
     → hidrasi aman). Sebelumnya halaman ini memakai jangkar yang dipatok
     (`TODAY_ISO`/`CURRENT_DAY`), jadi "Sisa 4 hari" dan label periode bisa
     bercerita soal tanggal yang bukan hari ini. */
  const today = useTodayISO()
  const todayIso = today || TODAY_ISO
  /* pemasukan bulanan + total cicilan = milik USER (diisi di onboarding atau
     Pengaturan → Profil & Akun), bukan konstanta demo. */
  const settings = useUserMoneySettings()
  /* baris ledger NYATA — satu-satunya sumber uang keluar periode ini */
  const snapshot = useMoneyStore()
  const ledger = useMemo(() => recordedTransactions(snapshot), [snapshot])
  /** hari ke berapa hari ini (status "telat" celengan & sapu bersih) */
  const currentDay = today ? dayOfMonth(today, CURRENT_DAY) : CURRENT_DAY

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
  const period = useMemo(() => periodWindowForTab(periodTab, todayIso), [periodTab, todayIso])

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

     Tiga catatan periode (prompt 26 & 27):
     • kewajiban celengan dihitung dari SEMUA fund — kartu ini metrik GLOBAL
       (audit UX #3) dan disamakan dengan `DAILY_HUD` yang dipakai Home.
       Sejak paket 27 daftar `funds` itu DIKIRIM APA ADANYA (`sinkingFunds`),
       bukan diubah jadi satu angka bulanan dulu: jatah harian memotong
       kewajiban periode ini (prorata per window, satu rumus dengan cicilan),
       dan begitu user menambah celengan baru, angkanya ikut berubah;
     • `window` bukan cuma panjang pembagi: kolam uangnya (pemasukan, uang
       keluar, cicilan) ikut window lewat `periodPool()` — jadi tab Mingguan
       memakai pemasukan & pengeluaran MINGGU itu, dan tab Siklus Gajian
       memakai rentang 25-an, bukan bulan kalender;
     • tab Bulanan tetap memakai konstanta kanon (lewat `periodPool()`), jadi
       angkanya tidak berubah dari sebelumnya dan sama dengan kartu Home.

     Angka panel Review & kartu kategori membaca `hud` dan `window` yang sama
     (lihat `spendingReview()`), jadi satu layar tidak mungkin punya dua cerita. */
  const spent = useMemo(() => spentInWindow(ledger, period), [ledger, period])
  const earned = useMemo(() => earnedInWindow(ledger, period), [ledger, period])
  const hud = useMemo(
    () =>
      computeDailyHud({
        monthlyIncome: settings.monthlyIncome,
        totalInstallments: settings.totalInstallments,
        sinkingFunds: funds,
        spent,
        earned,
        window: period,
      }),
    [settings.monthlyIncome, settings.totalInstallments, funds, spent, earned, period],
  )

  /* ── PEMASUKAN DI PERIODE AKTIF (PRD 2B.3) ─────────────────────────────
     Tidak ada pemasukan di jendela → kartu Dry Spell (tanpa Rp 0/hari).
     Pemasukan masuk di tengah periode → catatan kecil di bawah jatah harian. */
  /* PAKET 57 - dua keadaan yang dibedakan kartu:
       - `!income.configured` -> CTA "atur pemasukan" (angka belum bisa dihitung);
       - `!income.hasIncome`  -> Dry Spell (sudah diatur, belum ada catatan masuk).
     Sumbernya konfigurasi user + baris ledger NYATA, bukan `HISTORY_TRANSACTIONS`. */
  const income = useMemo(
    () => periodIncome(period, ledger, settings.monthlyIncome),
    [period, ledger, settings.monthlyIncome],
  )

  /* ── AKSI ────────────────────────────────────────────────────────────── */

  /**
   * Hapus budget kategori (paket 60.1) — tiga langkah, urutannya disengaja:
   *   1. `handleDeleteBudget` hanya MENAHAN niatnya (dialog konfirmasi);
   *   2. `confirmBudgetDelete` mencabut barisnya lewat `removeBudget()` dan
   *      mencatat posisi aslinya untuk Undo, lalu memberi tahu dengan jujur bahwa
   *      saldo & Jatah Harian TIDAK berubah;
   *   3. `undoBudgetDelete` mengembalikannya ke posisi semula — kalau jendelanya
   *      sudah lewat, user diberi tahu apa adanya (bukan diam-diam gagal).
   */
  function handleDeleteBudget(budget: BudgetItem) {
    setPendingBudgetDelete(budget)
  }

  function confirmBudgetDelete() {
    if (!pendingBudgetDelete) return
    const target = pendingBudgetDelete
    const result = removeBudget(budgets, target.id)
    setPendingBudgetDelete(null)
    /* tidak ada baris yang cocok (mis. state berubah di tab lain) → tidak ada
       yang berubah, jadi tidak ada toast "berhasil" */
    if (!result.removed) return

    setBudgets(result.budgets)
    budgetUndoRef.current = result.removed
    /* id-nya dipensiunkan: budget berikutnya tidak boleh mewarisi id baris ini
       selama jendela Undo masih hidup */
    retiredBudgetIds.current = [...retiredBudgetIds.current, target.id]

    toast(BUDGET_DELETE_TOAST.title(target.category), {
      description: BUDGET_DELETE_TOAST.description,
      action: { label: BUDGET_DELETE_TOAST.undo, onClick: () => undoBudgetDelete(target.id) },
      /* lama toast = lama hak undo; keduanya dibaca dari satu konstanta */
      duration: UNDO_WINDOW_MS,
    })
    later(() => {
      if (budgetUndoRef.current?.item.id === target.id) budgetUndoRef.current = null
    }, UNDO_WINDOW_MS)
  }

  function undoBudgetDelete(budgetId: number) {
    const removal = budgetUndoRef.current
    if (!removal || removal.item.id !== budgetId) {
      toast(BUDGET_DELETE_TOAST.expired)
      return
    }
    budgetUndoRef.current = null
    setBudgets((prev) => restoreBudget(prev, removal))
    /* id-nya dipakai lagi oleh baris ini → dilepas dari daftar pensiun supaya
       tidak ada id yang "hangus" tanpa alasan */
    retiredBudgetIds.current = retiredBudgetIds.current.filter((id) => id !== budgetId)
    toast.success(BUDGET_DELETE_TOAST.undoneTitle, {
      description: BUDGET_DELETE_TOAST.undoneDescription,
    })
  }

  /**
   * Hapus celengan (paket 60.2) — pola yang sama dengan hapus budget, tapi
   * konsekuensinya menyentuh UANG: kewajiban bulanannya berhenti dipotong dari
   * kolam, jadi Jatah Harian naik. Karena itu dialognya memakai kalimat dari
   * `FUND_DELETE_COPY` (yang menyebut nominal kewajiban yang dilepas) dan
   * toast-nya menegaskan bahwa uang yang sudah disetor tetap tercatat.
   */
  function handleDeleteFund(fund: SinkingFundItem) {
    setPendingFundDelete(fund)
  }

  function confirmFundDelete() {
    if (!pendingFundDelete) return
    const target = pendingFundDelete
    const removed = deleteFund(target.id)
    setPendingFundDelete(null)
    if (!removed) return

    fundUndoRef.current = target.id
    toast(FUND_DELETE_TOAST.title(target.name), {
      description: FUND_DELETE_TOAST.description,
      action: { label: FUND_DELETE_TOAST.undo, onClick: () => undoFundDelete(target.id) },
      duration: UNDO_WINDOW_MS,
    })
    later(() => {
      if (fundUndoRef.current === target.id) fundUndoRef.current = null
    }, UNDO_WINDOW_MS)
  }

  function undoFundDelete(fundId: number) {
    if (fundUndoRef.current !== fundId) {
      toast(FUND_DELETE_TOAST.expired)
      return
    }
    fundUndoRef.current = null
    if (!restoreFund(fundId)) {
      toast(FUND_DELETE_TOAST.expired)
      return
    }
    toast.success(FUND_DELETE_TOAST.undoneTitle, {
      description: FUND_DELETE_TOAST.undoneDescription,
    })
  }

  /** 3F — simpan budget. Satu jalur untuk tambah & atur ulang limit: keputusan
   *  "baris baru atau baris yang sama" ada di `applyBudgetSave()` (paket 28),
   *  yang memakai kategori + konteks uang sebagai kunci. Jadi mustahil ada dua
   *  baris untuk satu kategori, dari jalan mana pun — dan toast-nya mengikuti
   *  mode yang BENAR-BENAR terjadi, bukan yang ditebak komponen. */
  function handleSaveBudget(data: Omit<BudgetItem, 'id' | 'spent'>) {
    /* id baris yang sudah dipensiunkan ikut dikirim: tanpa itu, budget baru bisa
       memakai ulang id baris yang baru dicabut (paket 60.1) */
    const result = applyBudgetSave(budgets, data, retiredBudgetIds.current)
    setBudgets(result.budgets)
    handleCloseAddBudget()

    if (result.mode === 'edit') {
      toast.success(BUDGET_SAVE_TOAST.updated(data.category), {
        description: BUDGET_SAVE_TOAST.updatedBody(money(data.limit)),
      })
      return
    }
    toast.success(BUDGET_SAVE_TOAST.created(data.category), {
      description: BUDGET_SAVE_TOAST.createdBody(money(data.limit)),
    })
  }

  /** tutup sheet tambah budget — sekaligus melepas kategori yang datang dari URL
   *  (dipakai sekali), jadi form berikutnya kembali mulai dari Step 1 */
  function handleCloseAddBudget() {
    setShowAddBudget(false)
    setPrefilledCategory(undefined)
  }

  /** 4C — celengan baru selalu mulai dari benih 🌱 (ditulis lewat store, jadi
   *  ia langsung muncul juga di Home & bisa dibuka halaman detailnya) */
  function handleSaveGoal(
    data: Omit<SinkingFundItem, 'id' | 'current' | 'stage' | 'contributedThisMonth'>,
  ) {
    addFund({
      name: data.name,
      target: data.target,
      deadline: data.deadline,
      priority: data.priority,
      scope: data.scope,
    })
    setShowAddGoal(false)
    toast.success(FUND_CREATE_TOAST.title, { description: FUND_CREATE_TOAST.body(data.name) })
  }

  /** 4B — setoran: saldo celengan naik, tanaman tumbuh, & riwayat setoran
   *  bertambah SEKALIGUS (satu tulisan di store, jadi halaman detail yang
   *  membaca setoran yang sama tidak mungkin bercerita beda) */
  function handleContribute(fundId: number, amount: number, walletId: string) {
    const result = contributeToFund(fundId, amount, walletId)
    /* store menolak (celengan sudah dihapus / nominal tidak sah) → tutup sheet &
       katakan apa adanya; jangan tinggalkan user menebak kenapa tidak terjadi apa-apa */
    if (!result) {
      setContributeTarget(null)
      toast(FUND_DELETE_COPY.goneNote)
      return
    }
    setContributeTarget(null)
    toast.success(FUND_DETAIL_COPY.setToastTitle(money(amount), result.fund.name), {
      description: FUND_DETAIL_COPY.setToastHint(walletSourceName(walletId)),
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

    /* satu tulisan ke store: progres + baris riwayat "Sisa budget" (Sapu Bersih
       bukan dompet, jadi sumbernya punya nama sendiri — lihat CONTRIBUTION_SOURCES) */
    const sweptRow = sweepIntoFund(fundId, swept)
    /* celengan tujuannya keburu dihapus → TIDAK ada yang berpindah, jadi limit
       kategori juga tidak boleh dianggap terpakai (dulu baris di bawah tetap
       jalan dan toast "berhasil" muncul padahal store menolak) */
    if (!sweptRow) {
      setShowSweepModal(false)
      toast(FUND_DELETE_COPY.goneNote)
      return
    }
    /* sisa dianggap terpakai → limit mulai dari nol lagi bulan depan */
    setBudgets((prev) =>
      prev.map((budget) =>
        sweptIds.has(budget.id) ? { ...budget, spent: budget.limit } : budget,
      ),
    )
    setShowSweepModal(false)
    toast.success(FUND_SWEEP_TOAST.title(money(swept), target?.name ?? 'celengan'), {
      description: FUND_SWEEP_TOAST.body,
    })
  }

  /** Detail celengan: progres besar + riwayat setoran + tanaman yang tumbuh.
   *  Kartu Celengan Impian (badan kartu) BENAR-BENAR membuka halaman detail —
   *  route `app/budget/[id]/page.tsx`. Sebelumnya aksi ini cuma memunculkan
   *  toast "belum tersedia" (jalan buntu di dalam app, Fase 1 ROADMAP).
   *
   *  Penjaga "celengan baru cuma ada di halaman ini" DIHAPUS di paket 46:
   *  celengan sekarang hidup di store yang sama dengan halaman detailnya
   *  (`lib/money/funds-store.ts`), jadi SEMUA celengan di daftar ini — termasuk
   *  yang baru ditanam — punya halaman yang benar-benar bisa dibuka. */
  function handleOpenFund(fund: SinkingFundItem) {
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
          {/* Tombol "Menu" DIHAPUS di sini juga (paket 29) — satu keputusan untuk
              Home & Budget sekaligus, supaya dua header mobile berperilaku sama.
              Navigasi sekunder cuma punya SATU sumber kebenaran: bottom-nav
              "Lainnya" (kanon 2A.6). Tombol ini dulu tidak membuka apa pun. */}
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

      {/* switcher konteks (mobile) + tab zona — Konteks Uang tidak lagi ada di
          Sidebar, jadi di mobile ia tetap muncul di sini mengikuti pola
          Dashboard. Di desktop tab zona disembunyikan karena kedua zona sudah
          tampil berdampingan, sementara switcher konteksnya PINDAH ke baris judul
          di bawah (audit 46) — di desktop switcher-nya dulu tidak ada sama sekali
          sehingga konteks terkunci di "Pribadi". */}
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
          {/* audit 46: switcher konteks untuk DESKTOP. Dulu ia hanya hidup di
              header mobile, sementara blok "Konteks Uang" sudah dihapus dari
              Sidebar → user desktop tidak punya cara berpindah ke Keluarga /
              Bersama, jadi Budget & Dashboard tampak "cuma Pribadi". */}
          <ContextSwitcher value={context} onChange={setContext} className="w-[280px]" />
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
              onDeleteBudget={handleDeleteBudget}
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
              currentDay={currentDay}
              onAddGoal={() => setShowAddGoal(true)}
              onContribute={setContributeTarget}
              onOpenFund={handleOpenFund}
              onDeleteGoal={handleDeleteFund}
            />
          </section>
        </motion.div>
      </AnimatePresence>

      {/* ── BOTTOM SHEET (mobile) / DIALOG (desktop) ─────────────────────── */}
      <AddBudgetSheet
        open={showAddBudget}
        onClose={handleCloseAddBudget}
        scope={context}
        initialPeriod={periodFromTab(periodTab)}
        initialCategory={prefilledCategory}
        /* daftar yang SAMA dengan yang dibaca kartu kategori (tersaring konteks):
           dari sini sheet tahu kategori mana yang sudah punya limit → mode
           "Atur Ulang Limit", jadi baris ganda tidak mungkin lahir (paket 28) */
        existingBudgets={visibleBudgets}
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
        txs={ledger}
        todayISO={todayIso}
        onContinueChat={handleContinueToCoach}
      />

      {/* ── KONFIRMASI HAPUS (paket 60) ──────────────────────────────────────
          Dua dialog, dua kalimat jujur yang berbeda — dan keduanya memakai
          `<ConfirmDialog/>` yang sama dengan hapus tagihan/transaksi (satu
          wujud dialog untuk semua aksi merusak, `CONTEXT-WAJIB` §2). */}

      {/* hapus BUDGET: limit bukan uang → `note` menegaskan saldo & Jatah
          Harian TIDAK berubah (60.1) */}
      <AnimatePresence>
        {pendingBudgetDelete && (
          <ConfirmDialog
            titleId="hapus-budget-judul"
            overlayLabel={BUDGET_DELETE_COPY.overlay}
            title={BUDGET_DELETE_COPY.title}
            body={BUDGET_DELETE_COPY.body(
              pendingBudgetDelete.category,
              periodLimitWord(pendingBudgetDelete.period),
            )}
            note={BUDGET_DELETE_COPY.note}
            safety={BUDGET_DELETE_COPY.safety(UNDO_WINDOW_MS / 1000)}
            cancelLabel={BUDGET_DELETE_COPY.cancel}
            confirmLabel={BUDGET_DELETE_COPY.confirm}
            onCancel={() => setPendingBudgetDelete(null)}
            onConfirm={confirmBudgetDelete}
          />
        )}
      </AnimatePresence>

      {/* hapus CELENGAN: efeknya menyentuh uang → nominal kewajiban yang dilepas
          disebut lebih dulu (60.2 · temuan audit #4) */}
      <AnimatePresence>
        {pendingFundDelete && (
          <ConfirmDialog
            titleId="hapus-celengan-judul"
            overlayLabel={FUND_DELETE_COPY.overlay}
            title={FUND_DELETE_COPY.title}
            body={FUND_DELETE_COPY.body(pendingFundDelete.name)}
            note={fundDeleteNote(pendingFundDelete, masked)}
            safety={FUND_DELETE_COPY.safety(UNDO_WINDOW_MS / 1000)}
            cancelLabel={FUND_DELETE_COPY.cancel}
            confirmLabel={FUND_DELETE_COPY.confirm}
            onCancel={() => setPendingFundDelete(null)}
            onConfirm={confirmFundDelete}
          />
        )}
      </AnimatePresence>
    </ScreenShell>
  )
}

/**
 * Kalimat efek uang untuk dialog hapus celengan.
 *
 * Nominalnya dihitung dengan `sinkingObligationOf([fund])` — rumus yang SAMA
 * dengan yang memotong kolam Jatah Hari Ini — jadi angka yang dijanjikan dialog
 * tidak mungkin berbeda dari yang benar-benar terjadi. Kalau kewajibannya nol
 * (sudah disetor bulan ini / target penuh), dialog TIDAK menjanjikan kenaikan;
 * ia memakai `noObligationNote` yang mengatakan jatah hariannya tetap.
 */
function fundDeleteNote(fund: SinkingFundItem, masked: boolean): string {
  const obligation = sinkingObligationOf([fund])
  if (obligation <= 0) {
    return `${FUND_DELETE_COPY.cashNote} ${FUND_DELETE_COPY.noObligationNote}`
  }
  return `${FUND_DELETE_COPY.cashNote} ${FUND_DELETE_COPY.obligationNote(
    maskNominal(obligation, masked),
  )}`
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

