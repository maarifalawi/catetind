'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { AnimatePresence, motion } from 'framer-motion'
import { ArrowLeft, CalendarClock, PiggyBank, Plus, Sprout, Target, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { ScreenShell } from './screen-shell'
import { GlobalPrivacyToggle } from './global-privacy-toggle'
import { usePrivacy } from './privacy-provider'
import { ContributeSheet } from './contribute-sheet'
import { ConfirmDialog } from './confirm-dialog'
import { MilestoneCelebration } from './milestone-celebration'
import { PlantIllustration, type PlantStage as IllustrationStage } from './plant-illustration'
import { cn } from '@/lib/utils'
import { MILESTONE_TARGET_STATE } from '@/lib/data/milestones'
import { UNDO_WINDOW_MS } from '@/lib/data/history'
import { useMilestoneCelebration } from '@/hooks/use-milestone-celebration'
import {
  FALLBACK_WALLET_NAME,
  FUND_ACHIEVED_COPY,
  FUND_CARD_ACTION_COPY,
  FUND_DELETE_COPY,
  FUND_DELETE_TOAST,
  FUND_DETAIL_COPY,
  FUND_EXAMPLE_AMOUNT,
  FUND_HISTORY_COPY,
  FUND_LATE_COPY,
  FUND_NEAR_COPY,
  FUND_NEAR_THRESHOLD,
  FUND_PLAN_COPY,
  FUND_PROJECTION_COPY,
  PLANT_STAGES,
  PLANT_STAGE_INDEX,
  formatDeadline,
  fundLateInfo,
  fundPercent,
  fundRemaining,
  maskNominal,
  monthlyNeeded,
  monthsUntil,
  priorityStyle,
  projectedCompletion,
  sinkingObligationOf,
  walletSourceById,
  walletSourceName,
  type FundContribution,
  type SinkingFundItem,
} from '@/lib/data/budget'
import {
  contributeToFund,
  contributionsOf,
  deleteFund,
  fundById,
  restoreFund,
  useFundsStore,
} from '@/lib/money/funds-store'

/* ── Celengan Detail (/budget/[id]) — inventaris #25 ──────────────────────────
   Halaman ini SENGAJA bukan halaman administrasi: PRD 2C.3 menulisnya sebagai
   momen emosional (US-SANDWICH-02, baris 811–812). Pertanyaan yang dijawabnya:
   "target yang lagi aku kejar ini gimana kabarnya — dan apa yang bikin aku
   tetap semangat?"

   Isinya, dari atas ke bawah:
     1. HEADER — kembali ke /budget, nama celengan, setoran terakhir, dan tombol
        mata privasi GLOBAL (satu-satunya kontrol privasi app).
     2. HERO — tanaman (metafora kanon PRD 2C.3, bukan progress bar generik),
        persentase besar `font-display`, bar progres, dan BADGE COPY tahap
        ("Baru ditanam" … "TERCAPAI! 🎉").
     3. NUDGE TELAT — muncul sekali, boleh ditutup, copy PRD 861 yang tidak
        menghakimi; hanya muncul kalau memang jeda ≥ 2 minggu.
     4. DUA KARTU ANGKA — "Rencana Nabung" (auto-kalkulasi PRD 2C.3) dan
        "Perkiraan Penuh" (proyeksi dari rata-rata setoran terakhir; asumsinya
        dikatakan di kartu itu sendiri, bukan disembunyikan).
     5. RIWAYAT SETORAN — tanggal, nominal, dompet sumber + empty state nurturing.
     6. CTA "Setor" STICKY DI BAWAH (zona ibu jari, PRD 2141–2145) memakai
        <ContributeSheet/> yang sama dengan halaman induk, jadi setoran di sini
        benar-benar menambah progres + riwayat.

   Kenapa tanpa Lottie: PRD 3B menyebut Lottie untuk detail view, tapi resolusi
   yang dipakai repo ini (CONTEXT §2) adalah SVG + CSS/Framer Motion — tidak ada
   dependency animasi baru. Animasi yang tetap ada: sway tanaman (SVG + keyframes
   yang sudah dipakai homescreen), bar progres yang tumbuh, dan confetti ringan
   saat 100% — semuanya hormat `prefers-reduced-motion`.

   Tidak ada angka yang dihitung di komponen: persentase dari `fundPercent()`,
   rencana bulanan dari `monthlyNeeded()`, proyeksi dari `projectedCompletion()`. */

/** cubic-bezier khas app: masuk cepat lalu settle lembut */
const EASE: [number, number, number, number] = [0.22, 1, 0.36, 1]

/** partikel confetti — posisi/rotasi DITULIS TETAP (bukan Math.random) supaya
 *  HTML server & render pertama client identik. Warna hanya token palet. */
const CONFETTI_PIECES: {
  tone: string
  fall: number
  drift: number
  rotate: number
  delay: number
}[] = [
  { tone: 'size-2 bg-mint', fall: 150, drift: -26, rotate: 260, delay: 0 },
  { tone: 'size-2.5 bg-brand', fall: 190, drift: 18, rotate: -300, delay: 0.12 },
  { tone: 'size-1.5 bg-hud-sage', fall: 130, drift: 30, rotate: 200, delay: 0.24 },
  { tone: 'size-2 bg-hud-amber', fall: 210, drift: -14, rotate: 340, delay: 0.34 },
  { tone: 'size-1.5 bg-plum', fall: 170, drift: 22, rotate: -220, delay: 0.46 },
  { tone: 'size-2 bg-thistle', fall: 200, drift: -30, rotate: 280, delay: 0.58 },
  { tone: 'size-1.5 bg-mint', fall: 140, drift: 12, rotate: -180, delay: 0.7 },
  { tone: 'size-2 bg-brand', fall: 185, drift: -18, rotate: 320, delay: 0.82 },
]

export function GoalDetailScreen({ fundId }: { fundId: number }) {
  /* privasi = state GLOBAL app; satu klik menyensor SEMUA nominal halaman ini
     (hero, rencana bulanan, proyeksi, sampai riwayat) */
  const { masked } = usePrivacy()
  /** `prefers-reduced-motion` dibaca SETELAH mount (pola wallet-detail-trend.tsx
   *  & use-count-up.ts): render server & render pertama client identik dulu,
   *  baru animasinya disesuaikan — jadi tidak pernah ada hydration mismatch. */
  const [reduceMotion, setReduceMotion] = useState(false)
  useEffect(() => {
    setReduceMotion(window.matchMedia('(prefers-reduced-motion: reduce)').matches)
  }, [])

  /* ── DATA: SATU STORE CELENGAN (paket 46) ─────────────────────────────────
     Halaman ini TIDAK lagi menyimpan `fund` & `history` di `useState` sendiri.
     Dulu cara itu membuat setoran di sini tidak terlihat di /budget & Home —
     padahal ketiganya sedang membicarakan celengan yang sama. Sekarang sumbernya
     `useFundsStore()` (`lib/money/funds-store.ts`): progres, riwayat setoran, dan
     tahap tanaman semuanya turunan dari state yang sama dengan halaman lain.

     `hydrated` dipakai untuk membedakan dua hal yang gampang tertukar:

       · belum selesai membaca IndexedDB → tampil "Menyiapkan celenganmu…";
       · sudah selesai tapi id-nya tetap tidak ada → keadaan "belum ada" + CTA
         kembali (bukan 404), karena celengan buatan user hanya ada di perangkat
         ini dan server tidak bisa mengetahui keberadaannya.

     Di produksi ini satu `insert` ke `sinking_fund_contributions` + satu
     `update` `sinking_funds.current`, lalu `stage` direcompute server (PRD 3B:
     HP/pertumbuhan dihitung server-side). */
  const snapshot = useFundsStore()
  const fund = fundById(snapshot, fundId)
  const history = useMemo(() => contributionsOf(snapshot, fundId), [snapshot, fundId])
  const [contributeOpen, setContributeOpen] = useState(false)
  /** nudge telat boleh ditutup, dan TIDAK muncul lagi di sesi ini
   *  (prompt: "sekali saja, tidak mengulang") */
  const [lateDismissed, setLateDismissed] = useState(false)

  /* ── HAPUS CELENGAN DARI HALAMAN DETAIL (paket 60.2) ─────────────────────
     Sebelum paket ini halaman detail hanya bisa Setor + menampilkan riwayat:
     tidak ada satu pun jalan mencabut target. Tombolnya sekarang ada di bar aksi
     bawah (zona ibu jari), dan konsekuensinya menyentuh uang — kewajiban
     bulanannya berhenti dipotong dari kolam, jadi Jatah Harian NAIK.

     Karena itu urutannya: konfirmasi dulu (dengan nominal kewajiban yang
     dilepas), lalu `deleteFund()` (tombstone di store), lalu toast yang membawa
     Undo, baru navigasi kembali ke /budget. Toast-nya hidup di luar halaman
     (sonner), jadi Undo tetap bisa ditekan setelah kita meninggalkan halaman ini. */
  const router = useRouter()
  const [deleteOpen, setDeleteOpen] = useState(false)
  const undoRef = useRef<number | null>(null)
  const timers = useRef<number[]>([])
  useEffect(() => {
    const pending = timers.current
    return () => pending.forEach((id) => window.clearTimeout(id))
  }, [])

  /* Perayaan "target tercapai" (inventaris #k): `auto: false` artinya TIDAK
     diperiksa saat halaman dibuka — momennya milik setoran yang barusan
     melunasi target, bukan kedatangan user ke halaman ini.
     Hook dipanggil SEBELUM cabang render di bawah: jumlah hook tidak boleh
     berubah antar render (aturan React), jadi ia tidak boleh ada di dalam `if`. */
  const celebration = useMilestoneCelebration(MILESTONE_TARGET_STATE, { auto: false })

  if (!fund) {
    /* id ini masih ada di URL, tapi celengannya sudah dicabut user (tombstone).
       Dibedakan dari "belum pernah ada" supaya halaman tidak berbohong dengan
       "Celengan tidak ditemukan" sesaat setelah user menghapusnya sendiri. */
    const removed = snapshot.removedIds.includes(fundId)
    return <FundUnavailable ready={snapshot.hydrated} removed={removed} />
  }

  /** hapus sesungguhnya: satu tulisan ke store, lalu toast + navigasi.
   *  Celengannya dibaca ULANG dari store di sini (bukan dari variabel render)
   *  supaya yang dihapus pasti celengan yang masih ada saat tombolnya ditekan. */
  function handleConfirmDelete() {
    const target = fundById(snapshot, fundId)
    setDeleteOpen(false)
    if (!target) return

    const removed = deleteFund(target.id)
    if (!removed) return

    undoRef.current = removed.id
    toast(FUND_DELETE_TOAST.title(removed.name), {
      description: FUND_DELETE_TOAST.description,
      action: { label: FUND_DELETE_TOAST.undo, onClick: () => undoDelete(removed.id) },
      /* lama toast = lama hak undo; keduanya dari satu konstanta */
      duration: UNDO_WINDOW_MS,
    })
    timers.current.push(
      window.setTimeout(() => {
        if (undoRef.current === removed.id) undoRef.current = null
      }, UNDO_WINDOW_MS),
    )
    /* kembali ke daftar: halaman ini sudah tidak punya celengan untuk ditampilkan */
    router.push('/budget')
  }

  /** Undo: cabut tombstone-nya — target, progres, dan posisinya balik apa adanya */
  function undoDelete(fundIdToRestore: number) {
    if (undoRef.current !== fundIdToRestore) {
      toast(FUND_DELETE_TOAST.expired)
      return
    }
    undoRef.current = null
    if (!restoreFund(fundIdToRestore)) {
      toast(FUND_DELETE_TOAST.expired)
      return
    }
    toast.success(FUND_DELETE_TOAST.undoneTitle, {
      description: FUND_DELETE_TOAST.undoneDescription,
    })
  }

  /* ── DATA TURUNAN ──────────────────────────────────────────────────────── */
  const percent = fundPercent(fund)
  const reached = percent >= 100
  const stage = PLANT_STAGES[fund.stage]
  const priority = priorityStyle(fund.priority)
  const perMonth = monthlyNeeded(fund.target, fund.current, fund.deadline)
  const remaining = fundRemaining(fund)
  const monthsLeft = monthsUntil(fund.deadline)
  const projection = useMemo(() => projectedCompletion(fund, history), [fund, history])
  const late = useMemo(() => fundLateInfo(fund, history), [fund, history])
  /** PRD 2C.4 baris 857 — "dikit lagi" hanya kalau sisanya benar-benar tipis */
  const nearTarget = !reached && remaining > 0 && remaining <= FUND_NEAR_THRESHOLD
  const showLateNudge = late.late && !lateDismissed && !reached

  const money = (value: number) => maskNominal(value, masked)

  /** kalimat proyeksi: kabar baik dulu, jujur kalau memang lewat target.
   *  Tanpa proyeksi ada dua sebab — sudah penuh, atau belum ada setoran. */
  const projectionLine = projection
    ? projection.dateISO < fund.deadline
      ? FUND_PROJECTION_COPY.ahead(
          formatDeadline(projection.dateISO),
          formatDeadline(fund.deadline),
        )
      : projection.dateISO === fund.deadline
        ? FUND_PROJECTION_COPY.onTime(
            formatDeadline(projection.dateISO),
            formatDeadline(fund.deadline),
          )
        : FUND_PROJECTION_COPY.behind(
            formatDeadline(projection.dateISO),
            formatDeadline(fund.deadline),
          )
    : reached
      ? FUND_PROJECTION_COPY.done
      : FUND_PROJECTION_COPY.unknown

  /* ── AKSI ──────────────────────────────────────────────────────────────── */

  /** setoran: satu tulisan ke STORE — progres, tahap tanaman, riwayat, dan
   *  kewajiban bulan ini berubah SEKALIGUS, dan halaman lain (Home, /budget)
   *  membaca perubahan yang sama tanpa refresh. `reachedNow` dari store = target
   *  benar-benar dilunasi setoran INI, jadi perayaannya berdasar perhitungan,
   *  bukan tebakan. */
  function handleContribute(fundId: number, amount: number, walletId: string) {
    const result = contributeToFund(fundId, amount, walletId)
    /* celengannya keburu dihapus (store menolak) → katakan apa adanya, jangan
       biarkan user merasa setorannya masuk padahal tidak ada yang ditulis */
    if (!result) {
      setContributeOpen(false)
      toast(FUND_DELETE_COPY.goneNote)
      return
    }

    setContributeOpen(false) // tutup seketika; animasi keluar jalan di background
    setLateDismissed(true) // nudge lama tidak relevan lagi setelah setor

    if (result.reachedNow) celebration.replay()
    toast.success(FUND_DETAIL_COPY.setToastTitle(maskNominal(amount, masked), result.fund.name), {
      description: FUND_DETAIL_COPY.setToastHint(walletSourceName(walletId)),
    })
  }

  /* ── RENDER ────────────────────────────────────────────────────────────── */
  return (
    <ScreenShell>
      <div className="w-full">
        {/* ── HEADER: kembali + identitas celengan + toggle privasi GLOBAL ─── */}
        <header className="sticky top-2 z-30 flex items-center justify-between gap-3 rounded-[1.5rem] bg-cream/90 px-3 py-3 shadow-[0_18px_40px_-32px_rgba(69,89,78,0.65)] ring-1 ring-soil/10 backdrop-blur-md sm:px-4">
          <div className="flex min-w-0 items-center gap-3">
            <Link
              href="/budget"
              aria-label={FUND_DETAIL_COPY.back}
              className="flex size-10 shrink-0 items-center justify-center gap-2 rounded-2xl bg-cream text-ink ring-1 ring-soil/12 transition-colors hover:bg-sage/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-forest/25 lg:h-11 lg:w-auto lg:px-3.5"
            >
              <ArrowLeft className="size-[18px] shrink-0" strokeWidth={2.4} aria-hidden />
              <span className="hidden text-[12.5px] font-semibold lg:inline">
                {FUND_DETAIL_COPY.backLabel}
              </span>
            </Link>
            <div className="min-w-0">
              <h1 className="truncate font-display text-[19px] font-black tracking-tight text-ink lg:text-[22px]">
                {fund.name}
              </h1>
              {/* di header ukuran kompak: tanggal setoran terakhir saja */}
              <p className="truncate text-[11px] text-ink/45">
                {late.lastDateISO
                  ? FUND_HISTORY_COPY.latest(formatDeadline(late.lastDateISO))
                  : FUND_HISTORY_COPY.never}
              </p>
            </div>
          </div>
          <GlobalPrivacyToggle />
        </header>

        {/* ── HERO: tanaman + persentase besar + bar progres + badge tahap ──── */}
        <section
          aria-label={`${fund.name} — ${stage.label}`}
          className={cn(
            'relative mt-5 overflow-hidden rounded-[2rem] bg-gradient-to-b from-sage/60 via-cream to-cream p-5 shadow-[0_18px_40px_-34px_rgba(69,89,78,0.55)] ring-1 ring-soil/12',
            reached && 'ring-mint/70',
          )}
        >
          {/* confetti hanya di state tercapai; versi statis saat reduce-motion */}
          {reached && <BloomConfetti still={Boolean(reduceMotion)} />}

          <div className="relative z-10 flex flex-col items-center gap-4 sm:flex-row sm:items-end">
            {/* tanaman — metafora progres (SVG statis + sway CSS, tanpa Lottie) */}
            <span className="flex h-32 w-32 shrink-0 items-end justify-center sm:h-36 sm:w-36">
              <PlantIllustration
                stage={PLANT_STAGE_INDEX[fund.stage] as IllustrationStage}
                className="w-28 sm:w-32"
              />
            </span>

            <div className="w-full min-w-0 flex-1">
              <div className="flex flex-wrap items-center justify-center gap-2 sm:justify-start">
                {/* badge tahap — copy kanon PRD 2C.3 (baris 838–844) */}
                <span className="inline-flex items-center gap-1.5 rounded-full bg-forest px-2.5 py-1 text-[10.5px] font-bold uppercase tracking-wide text-mint">
                  <span aria-hidden className="text-[12px] leading-none">
                    {stage.icon}
                  </span>
                  {stage.label}
                </span>
                <span
                  aria-label={FUND_DETAIL_COPY.priorityA11y(priority.label)}
                  className={cn(
                    'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10.5px] font-bold uppercase tracking-wide',
                    priority.badge,
                  )}
                >
                  <span aria-hidden className={cn('size-1.5 rounded-full', priority.dot)} />
                  {priority.label}
                </span>
              </div>

              {/* persentase besar — metrik utama halaman ini */}
              <div className="mt-3 flex items-baseline justify-center gap-2 sm:justify-start">
                <span className="font-display text-5xl font-black leading-none tabular-nums text-ink">
                  {Math.round(percent)}
                </span>
                <span className="font-display text-xl font-bold text-ink/40">%</span>
              </div>

              {/* bar progres — indikator kedua, melengkapi tanaman (bukan pengganti) */}
              <div
                role="progressbar"
                aria-label={FUND_DETAIL_COPY.heroLabel}
                aria-valuenow={Math.round(percent)}
                aria-valuemin={0}
                aria-valuemax={100}
                className="mt-3 h-3 w-full overflow-hidden rounded-full bg-sage/70 ring-1 ring-inset ring-soil/8"
              >
                <motion.span
                  className="block h-full rounded-full bg-gradient-to-r from-forest to-leaf"
                  initial={{ width: 0 }}
                  animate={{ width: `${percent}%` }}
                  transition={reduceMotion ? { duration: 0 } : { duration: 0.7, ease: EASE }}
                />
              </div>

              {/* nominal terkumpul / target / deadline */}
              <dl className="mt-3.5 flex flex-wrap items-end gap-x-4 gap-y-2">
                <div>
                  <dt className="text-[10px] font-semibold uppercase tracking-[0.12em] text-ink/45">
                    {FUND_DETAIL_COPY.heroLabel}
                  </dt>
                  <dd className="font-display text-[19px] font-black tabular-nums text-ink">
                    {money(fund.current)}
                  </dd>
                </div>
                <div>
                  <dt className="text-[10px] font-semibold uppercase tracking-[0.12em] text-ink/45">
                    {FUND_DETAIL_COPY.targetLabel}
                  </dt>
                  <dd className="text-[13.5px] font-bold tabular-nums text-ink/70">
                    {money(fund.target)}
                  </dd>
                </div>
                <div>
                  <dt className="text-[10px] font-semibold uppercase tracking-[0.12em] text-ink/45">
                    {FUND_DETAIL_COPY.deadlineLabel}
                  </dt>
                  <dd className="flex items-center gap-1.5 text-[13.5px] font-bold text-ink/70">
                    <CalendarClock className="size-3.5 text-forest" strokeWidth={2.4} aria-hidden />
                    {formatDeadline(fund.deadline)}
                  </dd>
                </div>
              </dl>

              {reached ? (
                /* perayaan PRD 2C.4 baris 859 — `role="status"` supaya pembaca
                   layar ikut mendengar kabar baiknya (partikel confetti dekoratif) */
                <p
                  role="status"
                  className="mt-3 rounded-2xl bg-mint-soft/70 px-3.5 py-3 text-[12.5px] font-medium leading-relaxed text-forest ring-1 ring-forest/10"
                >
                  {FUND_ACHIEVED_COPY.body(fund.name)}
                </p>
              ) : (
                <p className="mt-3 text-[11px] leading-relaxed text-ink/40">
                  {FUND_DETAIL_COPY.heroHint}
                </p>
              )}
            </div>
          </div>

          {/* PRD 2C.4 baris 857 — "dikit lagi" saat sisa ≤ Rp 500.000 */}
          <AnimatePresence initial={false}>
            {nearTarget && (
              <motion.p
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={reduceMotion ? { duration: 0 } : { duration: 0.4, ease: EASE }}
                className="relative z-10 mt-4 flex items-start gap-2 rounded-2xl bg-mint-soft/70 px-3.5 py-3 text-[12.5px] font-medium leading-relaxed text-forest ring-1 ring-forest/10"
              >
                <Sprout className="mt-0.5 size-4 shrink-0" strokeWidth={2.4} aria-hidden />
                {FUND_NEAR_COPY(money(remaining))}
              </motion.p>
            )}
          </AnimatePresence>
        </section>

        {/* ── NUDGE TELAT — muncul sekali, copy PRD 861 (tidak menghakimi) ───── */}
        <AnimatePresence initial={false}>
          {showLateNudge && (
            <motion.section
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={reduceMotion ? { duration: 0 } : { duration: 0.42, ease: EASE }}
              className="mt-4 rounded-[1.5rem] bg-cream p-4 ring-1 ring-soil/12"
            >
              <div className="flex items-start gap-3">
                <span className="flex size-9 shrink-0 items-center justify-center rounded-2xl bg-sage/70 text-[17px]">
                  🌿
                </span>
                <div className="min-w-0 flex-1">
                  <p className="font-display text-[13.5px] font-bold tracking-tight text-ink">
                    {FUND_LATE_COPY.title}
                  </p>
                  <p className="mt-1 text-[12.5px] leading-relaxed text-ink/60">
                    {FUND_LATE_COPY.body(fund.name, late.weeks)}
                  </p>
                  <div className="mt-2.5 flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setContributeOpen(true)}
                      className="rounded-full bg-forest px-3.5 py-2 text-[12px] font-semibold text-mint transition-colors hover:bg-forest-soft active:scale-95"
                    >
                      {FUND_LATE_COPY.cta}
                    </button>
                    <button
                      type="button"
                      onClick={() => setLateDismissed(true)}
                      className="rounded-full px-3 py-2 text-[12px] font-semibold text-ink/45 transition-colors hover:bg-sage/60 hover:text-ink"
                    >
                      {FUND_LATE_COPY.dismiss}
                    </button>
                  </div>
                </div>
              </div>
            </motion.section>
          )}
        </AnimatePresence>

        {/* ── KARTU ANGKA: rencana nabung + perkiraan penuh ─────────────────── */}
        <div className="mt-5 grid grid-cols-1 gap-4 xl:grid-cols-2 xl:gap-5">
          {/* ── auto-kalkulasi PRD 2C.3: (target − terkumpul) / bulan tersisa ── */}
          <section
            aria-label={reached ? FUND_PLAN_COPY.done : FUND_PLAN_COPY.full(money(perMonth))}
            className="rounded-[1.75rem] bg-cream p-5 shadow-[0_18px_40px_-34px_rgba(69,89,78,0.55)] ring-1 ring-soil/10"
          >
            <div className="flex items-center gap-2">
              <span className="flex size-7 items-center justify-center rounded-xl bg-gradient-to-br from-sage via-cream to-mint-soft text-forest ring-1 ring-forest/10">
                <Target className="size-3.5" strokeWidth={2.6} aria-hidden />
              </span>
              <h2 className="font-display text-[16px] font-bold tracking-tight text-ink">
                {FUND_DETAIL_COPY.planTitle}
              </h2>
            </div>

            {/* dua potong kalimat supaya nominalnya bisa ditonjolkan; pembaca
                layar tetap mendengar satu kalimat utuh (inline berurutan) */}
            {reached ? (
              /* `monthlyNeeded()` = 0 saat sudah penuh → jangan tampil "Rp 0/bulan" */
              <p className="mt-3 text-[13px] leading-relaxed text-ink/60">
                {FUND_PLAN_COPY.done}
              </p>
            ) : (
              <>
                <p className="mt-3 text-[13px] leading-relaxed text-ink/60">
                  {FUND_PLAN_COPY.lead}{' '}
                  <b className="font-display text-[17px] font-black tabular-nums text-ink">
                    {money(perMonth)}
                  </b>
                  <span>{FUND_PLAN_COPY.tail}</span>
                </p>
                <p className="mt-2 text-[11px] text-ink/40">
                  {FUND_PLAN_COPY.monthsLeft(monthsLeft)}
                </p>
              </>
            )}
          </section>

          {/* ── proyeksi tanggal penuh (asumsi rata-rata setoran, dikatakan) ── */}
          <section
            aria-label={FUND_DETAIL_COPY.projectionTitle}
            className="rounded-[1.75rem] bg-cream p-5 shadow-[0_18px_40px_-34px_rgba(69,89,78,0.55)] ring-1 ring-soil/10"
          >
            <div className="flex items-center gap-2">
              <span className="flex size-7 items-center justify-center rounded-xl bg-gradient-to-br from-sage via-cream to-mint-soft text-forest ring-1 ring-forest/10">
                <CalendarClock className="size-3.5" strokeWidth={2.6} aria-hidden />
              </span>
              <h2 className="font-display text-[16px] font-bold tracking-tight text-ink">
                {FUND_DETAIL_COPY.projectionTitle}
              </h2>
            </div>

            {projection ? (
              <>
                {/* tanggal besar = jawaban, kalimat di bawah = alasannya */}
                <p className="mt-3 font-display text-[22px] font-black tracking-tight tabular-nums text-ink">
                  {formatDeadline(projection.dateISO)}
                </p>
                <p className="mt-1.5 text-[12.5px] leading-relaxed text-ink/60">{projectionLine}</p>
                <p className="mt-2 text-[11px] leading-relaxed text-ink/40">
                  {FUND_PROJECTION_COPY.assumption(
                    projection.sampleCount,
                    money(projection.avgMonthly),
                  )}
                </p>
              </>
            ) : (
              <p className="mt-3 text-[12.5px] leading-relaxed text-ink/60">
                {projectionLine}
              </p>
            )}
          </section>
        </div>

        {/* ── RIWAYAT SETORAN — tanggal, nominal, dompet sumber ─────────────── */}
        <section className="mt-5">
          <div className="flex flex-wrap items-center gap-2">
            <span className="flex size-7 items-center justify-center rounded-xl bg-gradient-to-br from-sage via-cream to-mint-soft text-forest ring-1 ring-forest/10">
              <PiggyBank className="size-3.5" strokeWidth={2.5} aria-hidden />
            </span>
            <h2 className="font-display text-[17px] font-bold tracking-tight text-ink">
              {FUND_HISTORY_COPY.title}
            </h2>
            <span className="rounded-full bg-sage px-2 py-0.5 text-[10.5px] font-bold tabular-nums text-forest ring-1 ring-forest/10">
              {FUND_HISTORY_COPY.count(history.length)}
            </span>
          </div>

          {history.length === 0 ? (
            <EmptyContributions masked={masked} onContribute={() => setContributeOpen(true)} />
          ) : (
            <ul className="mt-2 divide-y divide-soil/10 rounded-[1.75rem] bg-cream px-4 py-1.5 shadow-[0_18px_40px_-34px_rgba(69,89,78,0.55)] ring-1 ring-soil/10">
              {history.map((item, index) => (
                <ContributionRow key={item.id} item={item} masked={masked} index={index} />
              ))}
            </ul>
          )}
        </section>

        {/* ── CTA SETOR — STICKY DI ZONA IBU JARI (PRD 2141–2145) ─────────────
            Aksi primer halaman ini duduk di BAWAH, bukan di header: ibu jari
            menjangkau dasar layar, header adalah hard-reach area.
            `bottom-[5.5rem]` = tepat di atas bottom nav (nav = bottom-5 + 16 ≈
            84px); di desktop nav hilang jadi bar turun ke dasar kolom, dan
            `lg:max-w-lg` menjaga tidak menabrak FAB AI Coach di kanan bawah. */}
        <div className="sticky bottom-[5.5rem] z-30 mt-6 lg:bottom-5">
          <div className="rounded-[1.5rem] bg-cream/95 p-2.5 shadow-[0_24px_50px_-20px_rgba(0,0,0,0.28)] ring-1 ring-soil/12 backdrop-blur-md lg:max-w-lg">
            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:items-center">
              {reached ? (
                <>
                  {/* target sudah penuh → aksi primer berpindah ke target baru */}
                  <Link
                    href="/budget"
                    className="inline-flex h-12 w-full flex-1 items-center justify-center gap-2 rounded-[1.1rem] bg-gradient-to-b from-forest-soft to-forest text-[14px] font-semibold text-cream shadow-[0_14px_28px_-14px_rgba(69,89,78,0.85)] transition-all hover:brightness-[1.08] active:scale-[0.99] sm:w-auto"
                  >
                    <Plus className="size-4" strokeWidth={2.6} aria-hidden />
                    {FUND_ACHIEVED_COPY.cta}
                  </Link>
                  <button
                    type="button"
                    onClick={() => setContributeOpen(true)}
                    className="inline-flex h-12 w-full flex-1 items-center justify-center gap-2 rounded-[1.1rem] bg-cream text-[14px] font-semibold text-ink ring-1 ring-soil/12 transition-colors hover:bg-sage/60 active:scale-[0.99] sm:w-auto"
                  >
                    <PiggyBank className="size-4 text-forest" strokeWidth={2.4} aria-hidden />
                    {FUND_DETAIL_COPY.setCta}
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  onClick={() => setContributeOpen(true)}
                  title={FUND_DETAIL_COPY.setHint}
                  className="inline-flex h-12 w-full flex-1 items-center justify-center gap-2 rounded-[1.1rem] bg-gradient-to-b from-forest-soft to-forest text-[14px] font-semibold text-cream shadow-[0_14px_28px_-14px_rgba(69,89,78,0.85)] transition-all hover:brightness-[1.08] active:scale-[0.99] sm:w-auto"
                >
                  <PiggyBank className="size-4" strokeWidth={2.4} aria-hidden />
                  {FUND_DETAIL_COPY.setCta}
                </button>
              )}
            </div>
            <p className="mt-2 px-1 pb-0.5 text-[10.5px] leading-snug text-ink/45">
              {reached ? FUND_ACHIEVED_COPY.hint : FUND_DETAIL_COPY.setHint}
            </p>
            {/* hapus celengan (paket 60.2) — ikut di bar bawah (zona ibu jari),
                bukan disembunyikan di header. Warna plum = kanon aksi merusak
                repo ini (`ConfirmDialog` memakai nada yang sama). */}
            <button
              type="button"
              onClick={() => setDeleteOpen(true)}
              title={FUND_CARD_ACTION_COPY.deleteHint}
              className="mt-2 flex w-full items-center justify-center gap-1.5 rounded-[1.1rem] px-3 py-2 text-[11.5px] font-semibold text-plum/75 transition-colors hover:bg-plum/12 hover:text-plum focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-plum/30 active:scale-[0.99]"
            >
              <Trash2 className="size-3.5" strokeWidth={2.4} aria-hidden />
              {FUND_CARD_ACTION_COPY.deleteLabel}
            </button>
          </div>
        </div>
      </div>

      {/* ── SHEET SETOR — komponen yang SAMA dengan halaman induk ─────────────
          `fund` yang dikirim dibaca dari STORE (`useFundsStore`), bukan salinan
          state lokal: begitu ada setoran (dari halaman ini atau halaman lain),
          sheet-nya selalu menampilkan progres terbaru. */}
      <ContributeSheet
        fund={fund}
        open={contributeOpen}
        onClose={() => setContributeOpen(false)}
        onContribute={handleContribute}
        masked={masked}
      />
      {/* perayaan "target tercapai" (inventaris #k) — dipasang di halaman ini,
          bukan di Home, karena momennya milik setoran tadi. Auto-dismiss ~2.5
          detik, bisa langsung ditutup, dan penanda seen-nya ditulis oleh
          `celebration.dismiss()` supaya tidak berulang. */}
      <MilestoneCelebration
        open={celebration.open}
        milestone={celebration.milestone}
        onClose={celebration.dismiss}
      />

      {/* ── KONFIRMASI HAPUS CELENGAN (paket 60.2) ────────────────────────────
          Sebelum user menekan Hapus, tiga fakta terbaca: targetnya dilepas,
          uang yang sudah disetor TIDAK kembali, dan dampaknya ke Jatah Hari Ini
          (nominal kewajiban yang dilepas — dihitung dengan rumus yang sama
          dengan pemotongan kolam, `sinkingObligationOf()`). */}
      <AnimatePresence>
        {deleteOpen && (
          <ConfirmDialog
            titleId="hapus-celengan-judul"
            overlayLabel={FUND_DELETE_COPY.overlay}
            title={FUND_DELETE_COPY.title}
            body={FUND_DELETE_COPY.body(fund.name)}
            note={fundDeleteNote(fund, masked)}
            safety={FUND_DELETE_COPY.safety(UNDO_WINDOW_MS / 1000)}
            cancelLabel={FUND_DELETE_COPY.cancel}
            confirmLabel={FUND_DELETE_COPY.confirm}
            onCancel={() => setDeleteOpen(false)}
            onConfirm={handleConfirmDelete}
          />
        )}
      </AnimatePresence>
    </ScreenShell>
  )
}

/**
 * Kalimat efek uang untuk dialog hapus celengan.
 *
 * Nominal kewajiban yang dilepas dihitung dengan `sinkingObligationOf([fund])`
 * — rumus yang SAMA dengan yang memotong kolam Jatah Hari Ini — jadi angka di
 * dialog tidak mungkin berbeda dari yang benar-benar terjadi. Kalau
 * kewajibannya nol (sudah disetor bulan ini / target sudah penuh), dialog TIDAK
 * menjanjikan kenaikan; ia memakai `noObligationNote`.
 *
 * Salinan kecil ini hidup juga di `budget-screen.tsx` (dialog hapus dari kartu);
 * dua-duanya menerima `masked` supaya nominalnya ikut tersensor seperti seluruh
 * teks lain di repo ini. */
function fundDeleteNote(fund: SinkingFundItem, masked: boolean): string {
  const obligation = sinkingObligationOf([fund])
  if (obligation <= 0) {
    return `${FUND_DELETE_COPY.cashNote} ${FUND_DELETE_COPY.noObligationNote}`
  }
  return `${FUND_DELETE_COPY.cashNote} ${FUND_DELETE_COPY.obligationNote(
    maskNominal(obligation, masked),
  )}`
}

/* ── komponen kecil halaman ini ───────────────────────────────────────────── */

/**
 * Confetti sederhana di state 100% — 8 partikel Framer Motion (tanpa canvas,
 * tanpa library baru). Saat `prefers-reduced-motion` aktif partikel tetap
 * TAMPIL tapi tanpa gerakan (`still`): user tetap dapat tanda "selesai",
 * hanya tanpa animasi yang bisa mengganggu.
 */
function BloomConfetti({ still }: { still: boolean }) {
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-x-0 top-0 z-0 flex justify-center gap-3 overflow-hidden"
    >
      {CONFETTI_PIECES.map((piece, index) => (
        <motion.span
          key={index}
          className={cn('block rounded-full', piece.tone)}
          initial={still ? { opacity: 0.85 } : { opacity: 0, y: -12, scale: 0.5 }}
          animate={
            still
              ? { opacity: 0.85 }
              : {
                  opacity: [0, 1, 1, 0],
                  y: piece.fall,
                  x: piece.drift,
                  rotate: piece.rotate,
                  scale: 1,
                }
          }
          transition={still ? { duration: 0 } : { duration: 2.6, delay: piece.delay, ease: 'easeOut' }}
        />
      ))}
    </div>
  )
}

/**
 * Satu baris riwayat setoran: tanggal, dompet sumber, dan nominal.
 * Nominal memakai `+` (uang yang MASUK ke celengan) dan warna hijau uang-masuk
 * (`text-forest`) — konsisten dengan bahasa warna transaksi di halaman lain.
 */
function ContributionRow({
  item,
  masked,
  index,
}: {
  item: FundContribution
  masked: boolean
  /** nomor baris → animasi masuk berurutan (stagger) */
  index: number
}) {
  const source = walletSourceById(item.walletId)

  return (
    <motion.li
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: Math.min(index, 6) * 0.04, ease: EASE }}
      className="flex items-center gap-3 py-3"
    >
      <span
        aria-hidden
        className={cn(
          'flex size-9 shrink-0 items-center justify-center rounded-2xl text-[12px] font-black ring-1 ring-inset',
          source?.tile ?? 'bg-sage text-ink/60 ring-soil/10',
        )}
      >
        {source?.name.charAt(0) ?? '·'}
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-[13px] font-semibold tabular-nums text-ink">
          {formatDeadline(item.date)}
        </p>
        <p className="flex items-center gap-1.5 text-[11px] text-ink/45">
          <span aria-hidden className={cn('size-1.5 rounded-full', source?.dot ?? 'bg-ink/20')} />
          {FUND_HISTORY_COPY.walletLead} {source?.name ?? FALLBACK_WALLET_NAME}
        </p>
      </div>
      <p className="shrink-0 font-display text-[13.5px] font-bold tabular-nums text-forest">
        + {maskNominal(item.amount, masked)}
      </p>
    </motion.li>
  )
}

/**
 * Empty state riwayat: celengan baru (mis. yang langsung dibuat dari
 * "Tambah Celengan Baru" di /budget) belum punya setoran sama sekali.
 * Nadanya menyemangati + tetap memberi CTA, bukan gambar kosong.
 */
function EmptyContributions({
  masked,
  onContribute,
}: {
  masked: boolean
  onContribute: () => void
}) {
  return (
    <div className="mt-4 flex flex-col items-center rounded-[1.75rem] border-2 border-dashed border-forest/15 bg-cream/50 px-6 py-9 text-center">
      <div
        className="flex size-16 items-center justify-center rounded-2xl border-2 border-dashed border-forest/20 bg-cream/60"
        aria-hidden
      >
        <PiggyBank className="size-7 text-forest/45" strokeWidth={1.8} />
      </div>
      <p className="mt-4 max-w-xs text-[13.5px] font-medium leading-relaxed text-ink">
        {FUND_HISTORY_COPY.emptyTitle}
      </p>
      <p className="mt-1.5 max-w-xs text-[11.5px] leading-relaxed text-ink/45">
        {FUND_HISTORY_COPY.emptyBody}
      </p>
      <p className="mt-1 max-w-xs text-[11px] leading-relaxed text-ink/35">
        {FUND_HISTORY_COPY.emptyHint(maskNominal(FUND_EXAMPLE_AMOUNT, masked))}
      </p>
      <button
        type="button"
        onClick={onContribute}
        className="mt-5 inline-flex h-11 items-center gap-2 rounded-2xl bg-forest px-5 text-[13.5px] font-semibold text-cream transition-colors hover:bg-forest-soft active:scale-[0.98]"
      >
        <Plus className="size-4" strokeWidth={2.6} aria-hidden />
        {FUND_DETAIL_COPY.setCta}
      </button>
    </div>
  )
}

/**
 * Keadaan "id ini belum ada di perangkat ini" untuk /budget/<id> (paket 46).
 *
 * Kenapa bukan halaman 404: celengan user hidup di STORE perangkat
 * (`lib/money/funds-store.ts`), dan server tidak punya cara mengetahuinya. Kalau
 * route-nya 404, celengan yang baru ditanam user akan jadi jalan buntu persis di
 * tautan yang app-nya sendiri buat.
 *
 * Dua wajah, dan bedanya penting:
 *   · `ready: false` → store perangkat belum selesai dibaca (IndexedDB). Ini
 *     keadaan SEMENTARA; menampilkan "tidak ditemukan" di sini akan berbohong.
 *   · `ready: true`  → sudah dibaca dan id-nya memang tidak ada. Kopinya jujur
 *     (celengan mungkin ada di perangkat lain) + CTA kembali ke daftar.
 *
 * PAKET 60.2 menambah wajah KETIGA (`removed`): celengannya ada di data tapi
 * sudah dicabut user (tombstone). Halaman ini bisa saja masih terbuka sesaat
 * setelah penghapusan — dan kalau itu ditampilkan sebagai "tidak ditemukan",
 * user yang baru menghapusnya sendiri akan mengira tombolnya rusak. Kalimatnya
 * justru menunjuk jalan kembali: Undo di notifikasi bawah.
 */
function FundUnavailable({ ready, removed = false }: { ready: boolean; removed?: boolean }) {
  return (
    <ScreenShell>
      <div className="flex min-h-[60vh] flex-col items-center justify-center px-4 text-center">
        <span
          aria-hidden
          className="flex size-14 items-center justify-center rounded-2xl border-2 border-dashed border-forest/20 bg-cream/60"
        >
          <PiggyBank className="size-6 text-forest/45" strokeWidth={1.8} />
        </span>

        <h1 className="mt-4 font-display text-[19px] font-black tracking-tight text-ink">
          {!ready
            ? FUND_DETAIL_COPY.loadingLabel
            : removed
              ? FUND_DELETE_COPY.removedTitle
              : FUND_DETAIL_COPY.notFoundTitle}
        </h1>
        {ready && (
          <p className="mt-2 max-w-sm text-[12.5px] leading-relaxed text-ink/55">
            {removed ? FUND_DELETE_COPY.removedBody : FUND_DETAIL_COPY.notFoundBody}
          </p>
        )}

        <Link
          href="/budget"
          className="mt-5 inline-flex h-11 items-center gap-2 rounded-2xl bg-forest px-5 text-[13.5px] font-semibold text-cream transition-colors hover:bg-forest-soft active:scale-[0.98]"
        >
          <ArrowLeft className="size-4" strokeWidth={2.6} aria-hidden />
          {FUND_DETAIL_COPY.notFoundCta}
        </Link>
      </div>
    </ScreenShell>
  )
}


