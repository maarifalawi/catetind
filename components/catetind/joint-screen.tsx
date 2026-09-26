'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { toast } from 'sonner'
import { Heart, HeartHandshake, Pencil, Plus, ReceiptText, Scale } from 'lucide-react'
import { ScreenShell } from './screen-shell'
import { GlobalPrivacyToggle } from './global-privacy-toggle'
import { usePrivacy } from './privacy-provider'
import { JointBalanceScale } from './joint-balance-scale'
import { JointStatsRow } from './joint-stats-row'
import { JointTimeline } from './joint-timeline'
import { JointSplitSheet, type JointSplitDraft } from './joint-split-sheet'
import { JointSettlementModal } from './joint-settlement-modal'
import { JointAddSheet } from './joint-add-sheet'
import { JointInviteCodeModal, JointInviteFlow, JointJoinedCelebration } from './joint-invite-flow'
import {
  JointMonthlyRecapBanner,
  JointPushBanner,
  JointWeeklyRecapBanner,
} from './joint-recap-banners'
import { formatIDR } from '@/lib/wallets'
import {
  DEMO_FORCE_MONTHLY_RECAP,
  DEMO_FORCE_WEEKLY_RECAP,
  DEMO_JOINED_CELEBRATION,
  DEMO_PARTNER_JOINED,
  DEMO_REALTIME_MOCK,
  INITIAL_JOINT_TRANSACTIONS,
  INITIAL_JOINT_WALLET,
  JOINT_ME,
  JOINT_MONTH_LABEL,
  JOINT_PARTNER,
  JOINT_TODAY_ISO,
  PRIVATE_CATEGORY,
  PUSH_ALERT_THRESHOLD,
  REALTIME_ARRIVAL,
  REALTIME_ARRIVAL_DELAY,
  REALTIME_TYPING_DELAY,
  computeSettlement,
  jointDateLong,
  moneyLabel,
  recapBannerVisibility,
  type JointPerson,
  type JointTransaction,
  type JointWallet,
} from '@/lib/data/joint'
import { cn } from '@/lib/utils'

/* ── Joint Wallet (/app/joint) — PRD Domain 2D ───────────────────────────────
   "Multiplayer mode" CatetInd: satu dompet untuk dua orang. Halaman ini harus
   terasa seperti MILESTONE hubungan — hangat, intim, sedikit playful — bukan
   buku besar korporat. Dua visual tanda tangannya:

   1. Balance Scale Settlement Gauge (Section 3) — timbangan yang miring ke sisi
      yang nalangin lebih banyak, plus copy "siapa transfer berapa ke siapa".
   2. Together Timeline (Section 5) — catatan dua orang dijalin di satu garis
      waktu berselang-seling kiri/kanan, seperti buku harian bersama.

   DUA KOREKSI BESAR (audit fintech #1 & #4):
   • TIDAK ADA "saldo bersama". Ini shared ledger — uang tidak dikumpulkan di
     satu rekening, jadi hero-nya adalah TOTAL PENGELUARAN BERSAMA bulan ini
     (angka yang memang ada di catatan), bukan saldo fiktif.
   • Layout DESKTOP 2 KOLOM dan melebar penuh: kiri = ringkasan (timbangan,
     statistik pembayar, banner rekap), kanan = aktivitas (Cerita Kita).

   Aturan hitungnya ada di `lib/data/joint.ts` (paidBy vs weighedPaidBy) —
   jangan menghitung ulang nominal di komponen.

   Lapisan "trust"-nya: toggle privasi (🔒) yang menyembunyikan detail transaksi
   dari pasangan tanpa mengubah nominal yang ikut dihitung (audit #3). Semua
   state di halaman ini mock lokal — tinggal diganti langganan Supabase Realtime
   + tabel `wallets`/`transactions`.
   ────────────────────────────────────────────────────────────────────────── */

export function JointScreen() {
  /* ── 1. DATA & STATE (Section 1) ───────────────────────────────────────── */
  const me: JointPerson = JOINT_ME
  const partner: JointPerson = JOINT_PARTNER

  /* privasi nominal: state GLOBAL (PrivacyProvider) */
  const { masked: isMasked } = usePrivacy()
  const [wallet, setWallet] = useState<JointWallet>(INITIAL_JOINT_WALLET)
  const [nameDraft, setNameDraft] = useState(INITIAL_JOINT_WALLET.name)
  const [editingName, setEditingName] = useState(false)
  const [partnerJoined, setPartnerJoined] = useState(DEMO_PARTNER_JOINED)
  const [showInviteModal, setShowInviteModal] = useState(false)
  const [showCelebration, setShowCelebration] = useState(DEMO_JOINED_CELEBRATION)
  const [transactions, setTransactions] = useState<JointTransaction[]>(INITIAL_JOINT_TRANSACTIONS)
  /** settlement bulan ini sudah ditandai beres → timbangan dikunci rata */
  const [settled, setSettled] = useState(false)
  const [showSettlementModal, setShowSettlementModal] = useState(false)
  /** pembagian yang diganti user per transaksi (id → draft) */
  const [splitOverrides, setSplitOverrides] = useState<Record<string, JointSplitDraft>>({})
  /** transaksi yang sedang diatur pembagiannya ('new' = transaksi baru di form) */
  const [splitTarget, setSplitTarget] = useState<string | null>(null)
  const [showSplitSheet, setShowSplitSheet] = useState(false)
  /** pembagian untuk transaksi yang belum dicatat */
  const [draftSplit, setDraftSplit] = useState<JointSplitDraft | null>(null)
  const [showAddSheet, setShowAddSheet] = useState(false)
  const [pendingAmount, setPendingAmount] = useState(0)
  const [privateOn, setPrivateOn] = useState(false)
  /* mock Supabase Realtime (5C) */
  const [partnerTyping, setPartnerTyping] = useState(false)
  const [pushTx, setPushTx] = useState<JointTransaction | null>(null)
  /**
   * Banner rekap mana yang boleh tampil (Section 10 + audit #8).
   * Gate tanggal dihitung SETELAH MOUNT (null = belum siap → tidak render apa
   * pun) supaya HTML server & client identik, lalu `recapBannerVisibility()`
   * menerapkan hierarki bulanan > mingguan supaya dua banner raksasa tidak
   * pernah bertumpuk di satu layar.
   */
  const [recapWindow, setRecapWindow] = useState<{ monthly: boolean; weekly: boolean } | null>(null)
  useEffect(() => {
    setRecapWindow(
      recapBannerVisibility(new Date(), {
        forceMonthly: DEMO_FORCE_MONTHLY_RECAP,
        forceWeekly: DEMO_FORCE_WEEKLY_RECAP,
      }),
    )
  }, [])
  const showMonthlyRecap = recapWindow?.monthly ?? false
  const showWeeklyRecap = recapWindow?.weekly ?? false

  /** semua timer halaman dibersihkan saat unmount (pola yang sama dengan
   *  halaman Tagihan & Kekayaan) supaya tidak ada set-state di komponen mati */
  const timers = useRef<number[]>([])
  useEffect(() => {
    const pending = timers.current
    return () => pending.forEach((id) => window.clearTimeout(id))
  }, [])
  const later = useCallback((fn: () => void, ms: number) => {
    timers.current.push(window.setTimeout(fn, ms))
  }, [])
  /* ── DATA TURUNAN ──────────────────────────────────────────────────────── */
  /** pembagian pilihan user ditempelkan ke transaksinya supaya label di
   *  timeline & angka di Balance Scale selalu berasal dari data yang sama */
  const feed = useMemo<JointTransaction[]>(
    () =>
      transactions.map((tx) => {
        const override = splitOverrides[tx.id]
        if (!override) return tx
        return {
          ...tx,
          splitType: override.splitType,
          splits: override.splits,
          payerId: override.payerId,
        }
      }),
    [transactions, splitOverrides],
  )

  const settlement = useMemo(() => computeSettlement(feed, { settled }), [feed, settled])

  /* ── MOCK SUPABASE REALTIME (Section 5C) ────────────────────────────────
     Dua tahap: indikator "Dany sedang mencatat..." → transaksi partner masuk
     (slide-in dari kanan) + toast ringan. Semua di-unmount-safe lewat timers. */
  useEffect(() => {
    if (!DEMO_REALTIME_MOCK || !partnerJoined) return

    const typing = window.setTimeout(() => setPartnerTyping(true), REALTIME_TYPING_DELAY)
    const arrival = window.setTimeout(() => {
      setPartnerTyping(false)
      setTransactions((prev) =>
        prev.some((tx) => tx.id === REALTIME_ARRIVAL.id) ? prev : [REALTIME_ARRIVAL, ...prev],
      )
      toast(
        `${partner.avatar} ${partner.name} baru catat: ${REALTIME_ARRIVAL.description} ${formatIDR(
          REALTIME_ARRIVAL.amount,
        )} 🛒`,
      )
      /* badge "Baru" dilepas lagi setelah animasi slide-in selesai */
      const clearBadge = window.setTimeout(
        () =>
          setTransactions((prev) =>
            prev.map((tx) => (tx.id === REALTIME_ARRIVAL.id ? { ...tx, justArrived: false } : tx)),
          ),
        4200,
      )
      timers.current.push(clearBadge)
    }, REALTIME_ARRIVAL_DELAY)

    return () => {
      window.clearTimeout(typing)
      window.clearTimeout(arrival)
    }
  }, [partnerJoined, partner.avatar, partner.name])

  /* ── HANDLER ───────────────────────────────────────────────────────────── */

  const saveWalletName = useCallback(() => {
    const next = nameDraft.trim()
    setEditingName(false)
    if (!next || next === wallet.name) return
    setWallet((prev) => ({ ...prev, name: next }))
    toast.success('Nama dompet diperbarui 💚')
  }, [nameDraft, wallet.name])

  /** buka Split Bill Sheet untuk transaksi tertentu, atau untuk transaksi baru */
  const openSplitFor = useCallback((tx: JointTransaction) => {
    setSplitTarget(tx.id)
    setShowSplitSheet(true)
  }, [])

  const openSplitForNew = useCallback(() => {
    setSplitTarget('new')
    setShowSplitSheet(true)
  }, [])

  const handleSaveSplit = useCallback(
    (draft: JointSplitDraft) => {
      setShowSplitSheet(false)
      if (splitTarget === 'new') {
        setDraftSplit(draft)
        toast.success('Pembagian disiapkan ✓', {
          description: 'Berlaku saat transaksinya dicatat.',
        })
        return
      }
      if (!splitTarget) return
      setSplitOverrides((prev) => ({ ...prev, [splitTarget]: draft }))
      toast.success('Pembagian diperbarui ✓')
    },
    [splitTarget],
  )

  /** transaksi baru dari FAB: disisipkan ke timeline (dan ikut hitungan
   *  settlement + hero "Total Pengeluaran Bersama" — TIDAK ada saldo dompet
   *  yang dikurangi, karena dompet ini buku besar bersama, bukan rekening). */
  const handleAddTransaction = useCallback(
    (input: {
      description: string
      amount: number
      isPrivate: boolean
      split: JointSplitDraft | null
    }) => {
      const now = new Date()
      const time = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`
      const tx: JointTransaction = {
        id: `tx-${now.getTime()}`,
        userId: me.id,
        description: input.description,
        amount: input.amount,
        category: input.isPrivate ? PRIVATE_CATEGORY : 'Lainnya',
        date: JOINT_TODAY_ISO,
        time,
        splitType: input.split?.splitType ?? 'equal',
        splits: input.split?.splits,
        payerId: input.split?.payerId,
        isPrivate: input.isPrivate,
        privateForUser: input.isPrivate ? me.id : undefined,
      }

      setTransactions((prev) => [tx, ...prev])
      setDraftSplit(null)
      setPrivateOn(false)
      setPendingAmount(0)

      /* Section 11: pengeluaran bareng > Rp 500.000 memicu banner gaya push */
      if (!input.isPrivate && input.amount > PUSH_ALERT_THRESHOLD) setPushTx(tx)
    },
    [me.id],
  )

  const handleSettle = useCallback(() => setSettled(true), [])

  /** pasangan bergabung (mock 8C): selebrasi singkat → dompet bersama aktif */
  const handlePartnerJoined = useCallback(() => {
    setShowInviteModal(false)
    setShowCelebration(true)
  }, [])

  const finishCelebration = useCallback(() => {
    setShowCelebration(false)
    setPartnerJoined(true)
    later(() => toast.success('Dompet bersama kalian aktif 💚'), 400)
  }, [later])

  /* nilai awal Split Bill Sheet: pembagian transaksi terpilih / draft transaksi baru */
  const splitTargetTx =
    splitTarget && splitTarget !== 'new' ? feed.find((tx) => tx.id === splitTarget) : undefined
  const splitTotal = splitTarget === 'new' ? pendingAmount : (splitTargetTx?.amount ?? 0)
  const splitInitial: JointSplitDraft | undefined =
    splitTarget === 'new'
      ? (draftSplit ?? undefined)
      : splitTargetTx
        ? {
            splitType: splitTargetTx.splitType,
            splits: splitTargetTx.splits,
            payerId: splitTargetTx.payerId,
          }
        : undefined

  const isEmptyJoint = partnerJoined && feed.length === 0
  return (
    <ScreenShell>
      {/* FULL-WIDTH (audit #4): halaman ini dulu dikurung dalam satu kolom
          720px di tengah sehingga separuh layar desktop terbuang. Sekarang
          konten melebar penuh (offset sidebar ditangani ScreenShell) dan
          dipecah dua kolom di desktop — lihat grid di bawah. */}
      <div className="w-full">
        {!partnerJoined ? (
          /* ── SECTION 8: invite flow (halaman berubah total) ────────────── */
          <JointInviteFlow
            defaultWalletName={wallet.name}
            partner={partner}
            onCreated={(name) => {
              setWallet((prev) => ({ ...prev, name }))
              setShowInviteModal(true)
            }}
            onSimulatePartnerJoined={handlePartnerJoined}
          />
        ) : (
          <>
            {/* ── SECTION 2: header (nama dompet editable) + saldo ────────── */}
            <header className="sticky top-2 z-30 rounded-[1.5rem] bg-[#fbf6d9]/90 px-4 py-3.5 shadow-[0_18px_40px_-32px_rgba(69,89,78,0.65)] ring-1 ring-soil/[0.05] backdrop-blur-md">
              <div className="flex items-start justify-between gap-3">
                <div className="flex min-w-0 items-start gap-3">
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-hud-sage/60 via-cream to-hud-amber/40 text-forest ring-1 ring-forest/10">
                    <Heart className="size-[18px]" strokeWidth={2.2} />
                  </span>
                  <div className="min-w-0">
                    {editingName ? (
                      <input
                        autoFocus
                        value={nameDraft}
                        onChange={(event) => setNameDraft(event.target.value)}
                        onBlur={saveWalletName}
                        onKeyDown={(event) => {
                          if (event.key === 'Enter') saveWalletName()
                          if (event.key === 'Escape') {
                            setEditingName(false)
                            setNameDraft(wallet.name)
                          }
                        }}
                        aria-label="Nama dompet bersama"
                        className="w-full rounded-xl bg-cream px-2.5 py-1 font-display text-[19px] font-black tracking-tight text-ink outline-none ring-2 ring-forest/35 lg:text-[22px]"
                      />
                    ) : (
                      <button
                        type="button"
                        onClick={() => {
                          setNameDraft(wallet.name)
                          setEditingName(true)
                        }}
                        aria-label="Ubah nama dompet bersama"
                        className="group flex max-w-full items-center gap-1.5 text-left"
                      >
                        <h1 className="truncate font-display text-[19px] font-black tracking-tight text-ink lg:text-[22px]">
                          {wallet.name}
                        </h1>
                        <Pencil
                          aria-hidden
                          className="size-3.5 shrink-0 text-ink/25 transition-colors group-hover:text-ink/50"
                          strokeWidth={2.4}
                        />
                      </button>
                    )}

                    {/* indikator pasangan: dua avatar + hati di antaranya */}
                    <p className="mt-1 flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-[11px]">
                      <span aria-hidden>{me.avatar}</span>
                      <span aria-hidden className="text-[10px]">
                        💚
                      </span>
                      <span aria-hidden>{partner.avatar}</span>
                      <span className="font-semibold text-ink/60">
                        {me.name} &amp; {partner.name}
                      </span>
                      <span className="text-ink/40">
                        · Bersama sejak {jointDateLong(wallet.createdAt)}
                      </span>
                    </p>
                  </div>
                </div>

                <GlobalPrivacyToggle />
              </div>

              {/* HERO (audit fintech #1): dompet ini SHARED LEDGER — uang tidak
                  dikumpulkan di satu rekening, jadi "saldo bersama" itu angka
                  fiktif dan dihapus. Yang benar-benar bisa dipertanggungjawabkan
                  adalah TOTAL PENGELUARAN BERSAMA bulan ini. */}
              <div className="mt-3 border-t border-soil/[0.05] pt-3">
                <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[10.5px] font-bold uppercase tracking-[0.14em] text-ink/40">
                  <ReceiptText className="size-3.5 shrink-0" strokeWidth={2.4} />
                  Total Pengeluaran Bersama
                  <span className="rounded-full bg-hud-sage/20 px-2 py-0.5 text-[9.5px] font-bold tracking-wide text-[#503a3a] ring-1 ring-hud-sage/30">
                    {JOINT_MONTH_LABEL}
                  </span>
                </p>
                <p className="mt-1 font-display text-[28px] font-black leading-none tabular-nums tracking-tight text-ink">
                  {moneyLabel(settlement.totalSpent, isMasked)}
                </p>
                <p className="mt-1.5 text-[10.5px] leading-snug text-ink/45">
                  Catatan gabungan {me.name} &amp; {partner.name} — bukan saldo rekening bersama. Uang
                  tetap di dompet masing-masing, dihitung impas pas settle.
                </p>
              </div>
            </header>
            {/* ── SECTION 11: banner gaya push (pengeluaran > Rp 500.000) ── */}
            <JointPushBanner
              tx={pushTx}
              masked={isMasked}
              onDismiss={() => setPushTx(null)}
              onOpenSplit={openSplitFor}
            />

            {/* ── DUA KOLOM DI DESKTOP (audit #4) ────────────────────────────
                Mobile & tablet: tetap satu kolom dengan urutan alur cerita
                (timbangan → statistik → rekap → Cerita Kita).
                Desktop ≥ lg: grid 12 kolom — KIRI 5/12 = RINGKASAN (timbangan,
                statistik pembayar, banner rekap), KANAN 7/12 = AKTIVITAS (feed
                "Cerita Kita"). Tanpa container sempit di tengah layar. */}
            <div className="grid grid-cols-1 lg:grid-cols-12 lg:gap-6">
              {/* ── KIRI (5/12): ringkasan ─────────────────────────────────── */}
              <div className="lg:col-span-5">
                {/* ── SECTION 3: Balance Scale Settlement Gauge (hero visual) ── */}
                <section className="mt-4 rounded-[1.75rem] bg-[#fbf6d9] px-4 pb-4 pt-5 ring-1 ring-soil/[0.05] sm:px-6 lg:mt-6">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h2 className="flex items-center gap-2 font-display text-[15px] font-black tracking-tight text-ink">
                        <Scale className="size-4 text-hud-terracotta" strokeWidth={2.3} />
                        Timbangan Kita
                      </h2>
                      <p className="mt-0.5 text-[11.5px] text-ink/45">
                        Sisi yang turun = yang nalangin lebih banyak (patungan saja)
                      </p>
                    </div>
                    <span className="shrink-0 rounded-full bg-hud-sage/15 px-2.5 py-1 text-[10.5px] font-bold uppercase tracking-wide text-[#503a3a] ring-1 ring-hud-sage/30">
                      {JOINT_MONTH_LABEL.split(' ')[0]}
                    </span>
                  </div>

                  <div className="mt-3">
                    <JointBalanceScale
                      settlement={settlement}
                      masked={isMasked}
                      me={me}
                      partner={partner}
                      onSettle={() => setShowSettlementModal(true)}
                    />
                  </div>
                </section>

                {/* ── SECTION 4: stats row (tiap kartu bisa dibuka) ──────────── */}
                <section className="mt-4">
                  <JointStatsRow
                    settlement={settlement}
                    transactions={feed}
                    masked={isMasked}
                    me={me}
                    partner={partner}
                  />
                  {/* pembeda dua lapisan angka (audit #2 & #3): kartu = seluruh
                      catatan, panci timbangan = patungan saja */}
                  <p className="mt-2.5 text-[10.5px] leading-relaxed text-ink/40">
                    Kartu di atas = seluruh uang yang keluar dari kantong {me.name} &amp;{' '}
                    {partner.name} bulan ini (traktiran &amp; 🔒 privat ikut). Panci timbangan di
                    atasnya cuma menimbang yang patungan.
                  </p>
                </section>

                {/* ── SECTION 10: rekap (audit #8 — bulanan menang atas mingguan) ── */}
                <JointMonthlyRecapBanner
                  settlement={settlement}
                  masked={isMasked}
                  me={me}
                  partner={partner}
                  show={showMonthlyRecap}
                  onOpenSettlement={() => setShowSettlementModal(true)}
                />
                <JointWeeklyRecapBanner show={showWeeklyRecap} />
              </div>

              {/* ── KANAN (7/12): aktivitas ─────────────────────────────────── */}
              {/* ── SECTION 5: Together Timeline / SECTION 12: empty state ──── */}
              <section className="mt-6 lg:col-span-7 lg:mt-6">
                <div className="flex items-end justify-between gap-3">
                  <div>
                    <h2 className="flex items-center gap-2 font-display text-[15px] font-black tracking-tight text-ink">
                      <Heart className="size-4 text-hud-terracotta" strokeWidth={2.3} />
                      Cerita Kita
                    </h2>
                    <p className="mt-0.5 text-[11.5px] text-ink/45">
                      Jejak catatan kalian, terjalin dalam satu garis waktu
                    </p>
                  </div>
                  <span className="shrink-0 text-[10.5px] font-semibold text-ink/35">
                    {feed.length} catatan
                  </span>
                </div>

                {isEmptyJoint ? (
                  /* SECTION 12: pasangan sudah gabung tapi belum ada transaksi */
                  <div className="mt-4 rounded-[1.75rem] border-2 border-dashed border-hud-sage/45 bg-[#fbf6d9] px-6 py-10 text-center">
                    <span aria-hidden className="text-[30px]">
                      🌱
                    </span>
                    <h3 className="mt-3 font-display text-[17px] font-black tracking-tight text-ink">
                      Dompet bersama kalian masih kosong
                    </h3>
                    <p className="mt-1.5 text-[13px] leading-relaxed text-ink/55">
                      Siapa yang catat duluan? Ayo mulai! 💚
                    </p>
                    <div className="mt-5 flex flex-col gap-2.5 sm:flex-row sm:justify-center">
                      <button
                        type="button"
                        onClick={() => setShowAddSheet(true)}
                        className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-forest px-5 text-[13.5px] font-semibold text-mint transition-colors hover:bg-forest-soft active:scale-[0.99]"
                      >
                        Aku duluan! ✋
                      </button>
                      <button
                        type="button"
                        onClick={() => toast.info(`Notifikasi dikirim ke ${partner.name}! 📩`)}
                        className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-cream px-5 text-[13.5px] font-semibold text-ink ring-1 ring-soil/[0.08] transition-colors hover:bg-cream active:scale-[0.99]"
                      >
                        <HeartHandshake className="size-4" strokeWidth={2.3} />
                        Tantang {partner.name}! 💬
                      </button>
                    </div>
                  </div>
                ) : (
                  <JointTimeline
                    transactions={feed}
                    masked={isMasked}
                    me={me}
                    partner={partner}
                    partnerTyping={partnerTyping}
                    onOpenSplit={openSplitFor}
                  />
                )}
              </section>
            </div>
          </>
        )}
      </div>
      {/* ── SECTION 9: FAB (+) halaman ini — Catat transaksi bareng ────────
          Di mobile tombol ini MENGGANTIKAN FAB bottom-nav (nav menyembunyikan
          FAB-nya saat berada di /joint) supaya tetap hanya ada SATU tombol
          tambah, tapi isinya form khas dompet bersama. */}
      {partnerJoined && (
        <button
          type="button"
          onClick={() => setShowAddSheet(true)}
          aria-label="Catat transaksi bareng"
          className={cn(
            'fixed bottom-8 left-1/2 z-50 flex size-14 -translate-x-1/2 items-center justify-center rounded-full',
            'bg-forest text-mint shadow-[0_18px_36px_-14px_rgba(69,89,78,0.65)] ring-1 ring-forest/25',
            'transition-transform duration-150 hover:scale-105 active:scale-95',
            'lg:bottom-8 lg:left-auto lg:right-24 lg:h-12 lg:w-auto lg:translate-x-0 lg:gap-2 lg:px-5 lg:text-[13px] lg:font-bold',
          )}
        >
          <Plus className="size-6 lg:size-4" strokeWidth={2.4} />
          <span className="hidden lg:inline">Catat Bareng</span>
        </button>
      )}

      {/* ── Sheet & modal (mobile: bottom sheet · desktop: dialog) ───────── */}
      {/* 9 — form transaksi bareng: engine standar + field split & privasi */}
      <JointAddSheet
        open={showAddSheet}
        onClose={() => setShowAddSheet(false)}
        walletName={wallet.name}
        splitDraft={draftSplit}
        privateOn={privateOn}
        onAmountChange={setPendingAmount}
        onOpenSplit={openSplitForNew}
        onTogglePrivate={() => setPrivateOn((prev) => !prev)}
        onSubmitted={handleAddTransaction}
        me={me}
        partner={partner}
      />

      {/* 6 — Split Bill: satu instance per target (key) supaya formnya fresh */}
      <JointSplitSheet
        key={splitTarget ?? 'none'}
        open={showSplitSheet}
        onClose={() => setShowSplitSheet(false)}
        total={splitTotal}
        initial={splitInitial}
        onSave={handleSaveSplit}
        me={me}
        partner={partner}
      />

      {/* 7 — Settlement modal (dari Balance Scale atau banner rekap) */}
      <JointSettlementModal
        open={showSettlementModal}
        onClose={() => setShowSettlementModal(false)}
        settlement={settlement}
        masked={isMasked}
        onSettle={handleSettle}
        me={me}
        partner={partner}
      />

      {/* 8B — kode undangan & 8C — selebrasi pasangan bergabung */}
      <JointInviteCodeModal
        open={showInviteModal}
        onClose={() => setShowInviteModal(false)}
        walletName={wallet.name}
        onSimulateJoin={handlePartnerJoined}
        me={me}
        partner={partner}
      />
      <JointJoinedCelebration
        open={showCelebration}
        onStart={finishCelebration}
        me={me}
        partner={partner}
      />
    </ScreenShell>
  )
}

/** Toggle privasi halaman kini komponen baku GLOBAL (audit UX #7) — satu bentuk
 *  tombol mata yang sama di semua halaman. Lihat <GlobalPrivacyToggle />. */
