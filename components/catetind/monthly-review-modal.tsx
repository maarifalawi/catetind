'use client'

import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import {
  ArrowDownRight,
  ArrowUpRight,
  BarChart3,
  Calendar,
  Check,
  ChevronLeft,
  Clock,
  Minus,
  PiggyBank,
  Plus,
  ReceiptText,
  RotateCcw,
  Sprout,
  Target,
  X,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useBodyScrollLock } from '@/hooks/use-body-scroll-lock'
import { useIsBottomSheet, useSheetDrag } from '@/hooks/use-sheet-drag'
import { RupiahField } from './budget-sheet'
import { PlantIllustration, STAGE_NAMES } from './plant-illustration'
import { usePrivacy } from './privacy-provider'
import { useSubscriptionGate } from './subscription-gate-provider'
import { SubscriptionLockNote } from './subscription-lock-note'
import {
  MONTHLY_RECAP,
  MONTHLY_REVIEW_COPY as COPY,
  TARGET_MAX,
  TARGET_MIN,
  TARGET_STEP_LARGE,
  TARGET_STEP_SMALL,
  TARGET_TRANSACTION_THRESHOLD,
  canShowRecap,
  clampTarget,
  fundNameOf,
  fundSuggestions,
  prefillTarget,
  recapReadiness,
  shortIDR,
  stepTarget,
  type MonthlyRecap,
  type PrefillTarget,
  type SavedMonthlyTarget,
} from '@/lib/data/monthly-review'

/* ── Monthly Review & Target Setup (inventaris #i · PRD 1878–1918) ───────────
   Modal penuh dua panel — "ritual" bulanan: user berhenti sejenak, melihat recap
   bulan lalu, lalu MEMUTUSKAN satu angka kecil untuk bulan ini.

   Tiga pagar yang menentukan baik/buruknya modal ini:

   1. TIDAK MENGARANG ANGKA. Kalau ambang data minimum (PRD 574–582) belum
      lewat, panel 1 menampilkan kartu sabar + progress, bukan savings rate dari
      pembagian data tipis. Gerbangnya ada di `canShowRecap()` — bukan di sini.
   2. TIDAK MENUNTUT. "Skip, nanti aja" menutup tanpa modal kedua & tanpa toast
      menyindir. Buka ulang manual tersedia dari kartu Target di Home.
   3. CEPAT. Panel 2 selesai < 20 detik: angka sudah terisi, tombol ± untuk
      menggeser, chip celengan untuk quick-pick. CTA-nya di zona ibu jari.

   Shell-nya (backdrop, drag-down mobile, panel kanan 440px di desktop) SENGAJA
   sama dengan Rekap Mingguan — satu bahasa visual untuk "modal penuh", dan
   gesturnya dipakai bersama supaya perilakunya mustahil berbeda. */

type PanelId = 'recap' | 'target'

const PANELS: { id: PanelId; label: string; icon: ReactNode }[] = [
  { id: 'recap', label: COPY.tabRecap, icon: <BarChart3 className="size-3.5" /> },
  { id: 'target', label: COPY.tabTarget, icon: <Target className="size-3.5" /> },
]

/* Celengan + nominal saran dihitung SEKALI di tingkat modul: datanya mock statis,
   dan angkanya datang dari `monthlyNeeded()` di lib/data/budget.ts — bukan
   hitungan ulang di sini. Jadi saran di modal & di /budget tidak bisa berbeda. */
const FUNDS = fundSuggestions()

export function MonthlyReviewModal({
  open,
  monthKey,
  saved,
  recap = MONTHLY_RECAP,
  onClose,
  onSave,
}: {
  open: boolean
  /** kunci bulan berjalan `YYYY-MM` — dasar pre-fill & penanda "sudah dibuka" */
  monthKey: string
  /** target terakhir yang disimpan user (null = belum pernah) */
  saved: SavedMonthlyTarget | null
  /** recap bulan lalu (default: mock dari lib/data/monthly-review.ts) */
  recap?: MonthlyRecap
  /** tutup modal — apa pun alasannya, bulan ini tidak ditagih lagi */
  onClose: () => void
  /** simpan target bulan ini (localStorage diurus hook, bukan modal) */
  onSave: (target: { amount: number; fundId: number | null }) => void
}) {
  const { money } = usePrivacy()
  const router = useRouter()
  /* menyimpan "target bulan ini" = menulis rencana keuangan baru → ikut terkunci
     saat masa aktif habis (task 23). Recap-nya tetap bisa dibaca. */
  const { inputLocked } = useSubscriptionGate()

  const [panel, setPanel] = useState<PanelId>('recap')
  /** angka awal hasil pre-fill — disimpan supaya chip "balik ke angka awal" tahu
   *  harus kembali ke mana, dan supaya asal angkanya bisa dijelaskan ke user */
  const [prefill, setPrefill] = useState<PrefillTarget>(() =>
    prefillTarget(recap, saved, monthKey),
  )
  /** digit mentah (tanpa pemisah) — satu-satunya sumber kebenaran nominal target */
  const [digits, setDigits] = useState(() => String(prefillTarget(recap, saved, monthKey).amount))
  const [fundId, setFundId] = useState<number | null>(null)
  const [entered, setEntered] = useState(false)

  const closeRef = useRef<HTMLButtonElement>(null)
  const bodyRef = useRef<HTMLDivElement>(null)

  useBodyScrollLock(open, true)

  /* Setiap dibuka: mulai dari panel 1 + angka pre-filled yang segar. Perhitungan
     ditaruh di effect (bukan saat render) supaya pembacaan localStorage tidak
     pernah ikut ke HTML server → tidak ada hydration mismatch. */
  useEffect(() => {
    if (!open) return
    const next = prefillTarget(recap, saved, monthKey)
    setPanel('recap')
    setPrefill(next)
    setDigits(String(next.amount))
    setFundId(next.fundId)
  }, [open, monthKey, recap, saved])

  /* Escape menutup — sama seperti sheet lain; tombol tutup langsung difokuskan */
  useEffect(() => {
    if (!open) return
    closeRef.current?.focus()
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  /* konten panel masuk halus (gerak dijinakkan lewat `motion-reduce:*` di kelas) */
  useEffect(() => {
    if (!open) {
      setEntered(false)
      return
    }
    setEntered(false)
    const raf = requestAnimationFrame(() => setEntered(true))
    return () => cancelAnimationFrame(raf)
  }, [open, panel])

  /* panel berganti → scroll balik ke atas */
  useEffect(() => {
    if (open) bodyRef.current?.scrollTo({ top: 0 })
  }, [open, panel])

  const amount = Number(digits || '0')
  const outOfRange = amount < TARGET_MIN || amount > TARGET_MAX

  /** kalimat asal-angka: user berhak tahu angka itu datang dari mana */
  const provenanceHint =
    prefill.source === 'saved-this-month'
      ? COPY.targetHintSavedThisMonth(money(prefill.amount))
      : prefill.source === 'saved-last-month'
        ? COPY.targetHintSaved(money(prefill.amount))
        : prefill.source === 'last-month-actual'
          ? COPY.targetHintActual(money(prefill.amount))
          : COPY.targetHintStarter

  function handleStep(delta: number) {
    setDigits((prev) => String(stepTarget(Number(prev || '0'), delta)))
  }

  function handleReset() {
    setDigits(String(prefill.amount))
  }

  /**
   * "Let's go! 🌿" — target disimpan lewat hook (localStorage bukan urusan modal).
   * Toast-nya menyebut angka + celengan yang dipilih, plus jalan pintas SETOR ke
   * /budget: modal ini sengaja TIDAK meniru logika setoran yang sudah ada di sana.
   */
  function handleSubmit() {
    /* kunci ganda — tombolnya sudah `disabled`, tapi guard tetap di sini supaya
       tidak ada jalur pemanggilan lain yang bisa menembusnya */
    if (inputLocked) return
    const finalAmount = clampTarget(amount)
    const fundName = fundNameOf(fundId)
    onSave({ amount: finalAmount, fundId })
    toast.success(COPY.savedToastTitle, {
      description: fundName
        ? COPY.savedToastFundBody(money(finalAmount), fundName)
        : COPY.savedToastBody(money(finalAmount)),
      action: fundName
        ? { label: COPY.savedToastAction, onClick: () => router.push('/budget') }
        : undefined,
    })
  }

  const isBottomSheet = useIsBottomSheet()
  const { dragY, dragging, flinging, handlers } = useSheetDrag({ enabled: isBottomSheet, onClose })

  /* transform ditulis inline hanya saat drag/fling — kalau tidak, biarkan class
     transition yang mengatur buka & tutup normal */
  const sheetStyle: CSSProperties = flinging
    ? { transform: 'translateY(100%)', transition: 'transform 240ms cubic-bezier(0.4,0,1,1)' }
    : dragging
      ? { transform: `translateY(${dragY}px)`, transition: 'none' }
      : {}

  const current = PANELS.find((item) => item.id === panel) ?? PANELS[0]
  const isLastPanel = panel === 'target'

  return (
    <div
      className={cn('fixed inset-0 z-[70]', !open && 'pointer-events-none')}
      inert={!open}
      aria-hidden={!open}
    >
      {/* backdrop — ikut meredup saat panel ditarik ke bawah */}
      <button
        type="button"
        aria-label={COPY.close}
        tabIndex={open ? 0 : -1}
        onClick={onClose}
        className={cn(
          'absolute inset-0 bg-ink/50',
          !dragging && 'transition-opacity duration-500 ease-out motion-reduce:transition-none',
        )}
        style={{ opacity: open ? Math.max(1 - dragY / 300, 0.35) : 0 }}
      />

      {/* panel: bottom sheet di mobile, panel kanan 440px di desktop */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label={COPY.dialogLabel}
        style={sheetStyle}
        className={cn(
          'absolute inset-x-0 bottom-0 top-8 flex flex-col rounded-t-[2.25rem] bg-cream px-5 pb-6 shadow-[0_-24px_60px_-24px_rgba(69,89,78,0.55)] ring-1 ring-soil/12 transition-[transform,opacity] duration-[650ms] ease-[cubic-bezier(0.22,1,0.36,1)] will-change-transform motion-reduce:transition-none lg:inset-x-auto lg:inset-y-3 lg:right-3 lg:w-[440px] lg:rounded-[2rem] lg:shadow-[-24px_0_60px_-24px_rgba(69,89,78,0.55)]',
          open
            ? 'translate-y-0 opacity-100 lg:translate-x-0'
            : 'translate-y-full opacity-0 lg:translate-y-0 lg:translate-x-[calc(100%+12px)]',
        )}
      >
        {/* zona drag (mobile): handle + hint swipe-down */}
        <div
          {...handlers}
          style={{ touchAction: 'none' }}
          className="shrink-0 select-none pb-1 pt-3 lg:hidden"
        >
          <div className="mx-auto h-1.5 w-10 rounded-full bg-ink/15" aria-hidden />
          <p className="mt-1.5 text-center text-[10px] font-medium text-ink/30">
            {COPY.swipeHint}
          </p>
        </div>
        {/* handle statis di desktop (panel kanan — tanpa swipe) */}
        <div
          className="mx-auto mt-3 hidden h-1.5 w-10 shrink-0 rounded-full bg-ink/15 lg:block"
          aria-hidden
        />

        {/* kepala modal — sapaan hangat, bukan instruksi */}
        <div className="mt-3 flex shrink-0 items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-ink/40">
              {COPY.eyebrow}
            </p>
            <h2 className="mt-1 text-2xl font-semibold leading-tight tracking-tight text-ink">
              {COPY.title}
            </h2>
            <p className="mt-1.5 text-[12px] leading-relaxed text-ink/50">{COPY.subtitle}</p>
          </div>
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            aria-label={COPY.close}
            className="flex size-9 shrink-0 items-center justify-center rounded-full bg-cream text-ink ring-1 ring-soil/12 transition-colors hover:bg-sage"
          >
            <X className="size-4" strokeWidth={2.2} />
          </button>
        </div>

        {/* tab dua panel — jalan pintas ke bagian yang user butuhkan */}
        <div role="tablist" aria-label={COPY.dialogLabel} className="mt-4 flex shrink-0 gap-1.5">
          {PANELS.map((item) => {
            const active = item.id === panel
            return (
              <button
                key={item.id}
                type="button"
                role="tab"
                id={`monthly-review-tab-${item.id}`}
                aria-selected={active}
                aria-controls={`monthly-review-panel-${item.id}`}
                onClick={() => setPanel(item.id)}
                className={cn(
                  'flex min-w-0 flex-1 items-center justify-center gap-1.5 rounded-full px-3 py-2 text-[11.5px] font-medium transition-colors duration-200',
                  active
                    ? 'bg-forest font-semibold text-mint'
                    : 'bg-cream text-ink/45 ring-1 ring-soil/12 hover:text-ink',
                )}
              >
                {item.icon}
                <span className="truncate">{item.label}</span>
              </button>
            )
          })}
        </div>

        {/* progress dua panel — segmen aktif lebih panjang sebagai penanda posisi */}
        <div className="mt-2.5 flex shrink-0 gap-1" aria-hidden>
          {PANELS.map((item) => (
            <span
              key={item.id}
              className={cn(
                'h-1 rounded-full transition-all duration-300',
                item.id === panel ? 'flex-[1.6] bg-mint' : 'flex-1 bg-ink/10',
              )}
            />
          ))}
        </div>

        {/* isi panel — hanya area ini yang scroll; kepala & CTA tetap diam */}
        <div
          ref={bodyRef}
          data-lenis-prevent
          className="mt-4 flex-1 overflow-y-auto overscroll-contain pr-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          <div
            key={current.id}
            id={`monthly-review-panel-${current.id}`}
            role="tabpanel"
            aria-labelledby={`monthly-review-tab-${current.id}`}
            className={cn(
              'pb-2 transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none',
              entered ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0',
            )}
          >
            {panel === 'recap' ? (
              <RecapPanel recap={recap} />
            ) : (
              <TargetPanel
                digits={digits}
                onDigitsChange={setDigits}
                amount={amount}
                outOfRange={outOfRange}
                provenanceHint={provenanceHint}
                fundId={fundId}
                onFundChange={setFundId}
                onStep={handleStep}
                onReset={handleReset}
              />
            )}
          </div>
        </div>

        {/* footer — aksi utama di ZONA IBU JARI (PRD 2141–2145): "Skip" sengaja
            kecil di kiri supaya tidak terasa seperti pilihan yang salah, CTA-nya
            lebar di kanan. Tidak ada dialog kedua & tidak ada toast menyindir. */}
        <div className="mt-3 flex shrink-0 items-center gap-2 border-t border-soil/12 pt-3 pb-[env(safe-area-inset-bottom)]">
          <button
            type="button"
            onClick={onClose}
            aria-label={COPY.skipA11y}
            className="shrink-0 rounded-full px-3 py-3 text-[12px] font-semibold text-ink/45 transition-colors hover:text-ink/70"
          >
            {COPY.skip}
          </button>
          {isLastPanel && (
            <button
              type="button"
              aria-label={COPY.back}
              onClick={() => setPanel('recap')}
              className="flex size-10 shrink-0 items-center justify-center rounded-full bg-cream text-ink ring-1 ring-soil/12 transition-colors hover:bg-sage"
            >
              <ChevronLeft className="size-5" strokeWidth={2.4} />
            </button>
          )}
          <button
            type="button"
            onClick={isLastPanel ? handleSubmit : () => setPanel('target')}
            disabled={isLastPanel && inputLocked}
            aria-disabled={isLastPanel && inputLocked ? true : undefined}
            className={cn(
              'flex-1 rounded-full py-3.5 text-sm font-semibold transition-colors',
              isLastPanel && inputLocked
                ? 'cursor-not-allowed bg-ink/[0.07] text-ink/35'
                : 'bg-forest text-mint hover:bg-forest-soft active:scale-[0.98]',
            )}
          >
            {isLastPanel ? COPY.submit : COPY.next}
          </button>
        </div>
        {/* masa aktif habis → tombol simpan panel target mati, alasannya dijelaskan
            (task 23). Panel rekap & pindah panel tetap bisa dibuka. */}
        {isLastPanel && inputLocked && (
          <SubscriptionLockNote className="mt-2 shrink-0" />
        )}
      </div>
    </div>
  )
}

/* ── potongan kecil yang dipakai kedua panel ───────────────────────────────── */

/** label mikro bergaya dashboard (mis. "PEMASUKAN") */
function MicroLabel({ children }: { children: ReactNode }) {
  return (
    <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-ink/40">{children}</p>
  )
}

/** chip meta kecil (bulan, jumlah transaksi) */
function MetaTag({ icon, children }: { icon: ReactNode; children: ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-cream px-2.5 py-1 text-[11px] font-medium text-ink/60 ring-1 ring-soil/12">
      {icon}
      {children}
    </span>
  )
}

/** warna lingkaran ikon per jenis angka — hijau = masuk, amber = keluar,
 *  mint = yang disisihkan (bahasa warna uang yang sama dengan halaman lain) */
const TILE_TONE = {
  income: 'bg-sage text-forest',
  expense: 'bg-hud-amber/20 text-hud-terracotta',
  saved: 'bg-mint/25 text-forest',
} as const

function StatTile({
  label,
  value,
  hint,
  icon,
  tone,
  className,
}: {
  label: string
  value: string
  hint?: ReactNode
  icon: ReactNode
  tone: keyof typeof TILE_TONE
  className?: string
}) {
  return (
    <div className={cn('rounded-2xl bg-cream p-3.5 ring-1 ring-soil/12', className)}>
      <div className="flex items-center gap-2">
        <span
          className={cn('flex size-7 items-center justify-center rounded-full', TILE_TONE[tone])}
        >
          {icon}
        </span>
        <span className="text-[11px] font-medium text-ink/50">{label}</span>
      </div>
      <p className="mt-2 text-[17px] font-semibold tabular-nums text-ink">{value}</p>
      {hint && <p className="mt-1 text-[11px] leading-relaxed text-ink/45">{hint}</p>}
    </div>
  )
}

/* ── PANEL 1 — RECAP BULAN LALU ───────────────────────────────────────────────
   Dua wajah yang sengaja saling eksklusif:
   • data cukup  → angka recap + status target + snapshot tanaman
   • data tipis  → KARTU SABAR saja (tanpa satu pun nominal/klaim). Ini pagar
     prinsip #2: lebih baik bilang "aku masih belajar" daripada menyodorkan
     angka meyakinkan yang tidak berdasar. */

function RecapPanel({ recap }: { recap: MonthlyRecap }) {
  const { money } = usePrivacy()
  const ready = canShowRecap(recap)
  const readiness = recapReadiness(recap)
  const progressPct = Math.min(
    100,
    Math.round((recap.transactionCount / TARGET_TRANSACTION_THRESHOLD) * 100),
  )
  const targetPct =
    recap.target > 0 ? Math.min(100, Math.round((recap.savedLastMonth / recap.target) * 100)) : 0

  return (
    <div className="space-y-3.5">
      <header className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-lg font-semibold tracking-tight text-ink">
          {COPY.recapTitle(recap.monthLabel)}
        </h3>
        <div className="flex flex-wrap items-center gap-1.5">
          <MetaTag icon={<Calendar className="size-3.5 text-forest/55" strokeWidth={2.2} />}>
            {recap.monthLabel}
          </MetaTag>
          <MetaTag icon={<ReceiptText className="size-3.5 text-forest/55" strokeWidth={2.2} />}>
            {COPY.metaTransactions(recap.transactionCount)}
          </MetaTag>
        </div>
      </header>

      {ready ? (
        <>
          {/* tiga angka inti — semua nominal ikut tombol mata global */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <StatTile
              tone="income"
              label={COPY.incomeLabel}
              value={money(recap.totalIncome)}
              icon={<ArrowUpRight className="size-3.5" strokeWidth={2.6} />}
            />
            <StatTile
              tone="expense"
              label={COPY.expenseLabel}
              value={money(recap.totalExpense)}
              icon={<ArrowDownRight className="size-3.5" strokeWidth={2.6} />}
            />
            <StatTile
              tone="saved"
              className="col-span-2 sm:col-span-1"
              label={COPY.savedLabel}
              value={money(recap.savedLastMonth)}
              hint={
                <span className="inline-flex items-center gap-1 rounded-full bg-mint/25 px-2 py-0.5 text-[10.5px] font-semibold text-forest">
                  <Check className="size-3" strokeWidth={3} />
                  {COPY.savingsRateLabel(recap.savingsRate ?? 0)}
                </span>
              }
              icon={<PiggyBank className="size-3.5" strokeWidth={2.4} />}
            />
          </div>

          {/* arti angkanya dijelaskan, tidak dibiarkan misterius */}
          <p className="px-1 text-[11px] leading-relaxed text-ink/45">
            {COPY.savingsRateCaption}
            {recap.setAside > 0 && ` ${COPY.setAsideNote(money(recap.setAside))}`}
          </p>

          {/* status target bulan lalu — ✅ atau ⏳, dua-duanya tanpa menyalahkan */}
          <div className="rounded-2xl bg-cream p-4 ring-1 ring-soil/12">
            <MicroLabel>{COPY.targetTitle}</MicroLabel>
            <div className="mt-2 flex items-start gap-2.5">
              <span
                className={cn(
                  'flex size-7 shrink-0 items-center justify-center rounded-full',
                  recap.targetAchieved ? 'bg-mint/25 text-forest' : 'bg-sage text-forest',
                )}
              >
                {recap.targetAchieved ? (
                  <Check className="size-3.5" strokeWidth={3} />
                ) : (
                  <Clock className="size-3.5" strokeWidth={2.4} />
                )}
              </span>
              <div className="min-w-0">
                <p className="text-[13px] font-semibold leading-snug text-ink">
                  {recap.targetAchieved
                    ? COPY.targetAchieved(money(recap.target))
                    : COPY.targetMissed(money(recap.target), targetPct)}
                </p>
                <p className="mt-1 text-[11px] leading-relaxed text-ink/45">
                  {recap.targetAchieved ? COPY.targetAchievedCaption : COPY.targetMissedCaption}
                </p>
              </div>
            </div>
          </div>

          {/* snapshot tanaman — tanpa angka level/streak (kanon Domain 3B) */}
          <div className="flex items-center gap-4 rounded-2xl bg-cream p-4 ring-1 ring-soil/12">
            <div className="w-16 shrink-0">
              <PlantIllustration stage={recap.plantStage} />
            </div>
            <div className="min-w-0">
              <MicroLabel>{COPY.plantTitle}</MicroLabel>
              <p className="mt-1 text-[12.5px] leading-relaxed text-ink/60">
                {COPY.plantCaption(STAGE_NAMES[recap.plantStage])}
              </p>
            </div>
          </div>
        </>
      ) : (
        /* kartu sabar — tidak ada satu nominal/klaim pun di dalamnya */
        <div className="rounded-2xl bg-hud-amber/10 p-4 ring-1 ring-hud-amber/25">
          <div className="flex items-start gap-3">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-hud-amber/20 text-hud-terracotta">
              <BarChart3 className="size-4" strokeWidth={2.2} />
            </span>
            <div className="min-w-0">
              <p className="text-[13px] font-semibold text-ink">{COPY.patientTitle}</p>
              <p className="mt-1 text-[12px] leading-relaxed text-ink/60">{COPY.patientBody}</p>
            </div>
          </div>

          {/* progress unlock — engagement yang jujur: menambah catatan, bukan menebak */}
          <div className="mt-3.5">
            <div className="flex items-center justify-between gap-2 text-[11px] font-medium text-ink/55">
              <span className="tabular-nums">{readiness.progressLabel}</span>
              <span className="tabular-nums">{progressPct}%</span>
            </div>
            <div
              className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-soil/8"
              role="progressbar"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={progressPct}
              aria-label={readiness.progressLabel}
            >
              <div
                className="h-full rounded-full bg-hud-amber transition-[width] duration-500 motion-reduce:transition-none"
                style={{ width: `${progressPct}%` }}
              />
            </div>
            {readiness.reasonLabel && (
              <p className="mt-2 text-[11px] leading-relaxed text-ink/50">
                {readiness.reasonLabel}
              </p>
            )}
          </div>

          <p className="mt-3 text-[11.5px] font-semibold text-forest">{COPY.patientSkipHint}</p>
        </div>
      )}
    </div>
  )
}

/* ── PANEL 2 — SET TARGET BULAN INI ───────────────────────────────────────────
   Tujuannya satu: user selesai < 20 detik. Karena itu angkanya SUDAH terisi
   (beserta alasan asal angkanya), penggeser ± untuk fine-tune, dan chip celengan
   untuk quick-pick kontribusi. Tidak ada langkah wajib kedua, tidak ada
   verifikasi, tidak ada tombol yang menyembunyikan pilihan keluar. */

function TargetPanel({
  digits,
  onDigitsChange,
  amount,
  outOfRange,
  provenanceHint,
  fundId,
  onFundChange,
  onStep,
  onReset,
}: {
  digits: string
  onDigitsChange: (digits: string) => void
  amount: number
  outOfRange: boolean
  provenanceHint: string
  fundId: number | null
  onFundChange: (id: number | null) => void
  onStep: (delta: number) => void
  onReset: () => void
}) {
  const { money } = usePrivacy()
  const steps = [-TARGET_STEP_LARGE, -TARGET_STEP_SMALL, TARGET_STEP_SMALL, TARGET_STEP_LARGE]

  return (
    <div className="space-y-4">
      {/* pertanyaan PERSIS dari inventaris #i — dengan angka yang sudah terisi
          CATATAN PRIVASI: nominal di field ini adalah INPUT user sendiri (yang
          sedang ia putuskan), bukan angka yang dibaca dari data — sama seperti
          field nominal di ContributeSheet, jadi tidak disensor. Semua angka yang
          datang dari data (recap panel 1, saran celengan, asal angka di hint,
          target tersimpan di kartu Home & toast) tetap lewat `money()`. */}
      <div>
        <RupiahField
          label={COPY.targetQuestion}
          digits={digits}
          onDigitsChange={onDigitsChange}
          placeholder={COPY.targetPlaceholder}
          size="lg"
          hint={provenanceHint}
        />
        <p className="mt-1.5 text-[11px] leading-relaxed text-ink/45">{COPY.targetQuestionHint}</p>
        {/* pembaca layar menerima nominalnya sebagai kalimat utuh (angka di input
            terbaca satu-satu digit, jadi tidak berguna) */}
        <p className="sr-only" aria-live="polite">
          {COPY.targetA11y(money(amount))}
        </p>
      </div>

      {/* penggeser cepat — fine-tune tanpa mengetik ulang dari awal */}
      <div className="flex flex-wrap items-center gap-2">
        {steps.map((delta) => (
          <button
            key={delta}
            type="button"
            onClick={() => onStep(delta)}
            aria-label={delta < 0 ? COPY.stepDown : COPY.stepUp}
            className="flex items-center gap-1 rounded-full bg-cream px-3 py-2 text-[11.5px] font-semibold text-ink ring-1 ring-soil/14 transition-all hover:bg-sage/50 active:scale-95"
          >
            {delta < 0 ? (
              <Minus className="size-3.5" strokeWidth={2.6} />
            ) : (
              <Plus className="size-3.5" strokeWidth={2.6} />
            )}
            <span className="tabular-nums">{shortIDR(Math.abs(delta))}</span>
          </button>
        ))}
        <button
          type="button"
          onClick={onReset}
          className="flex items-center gap-1 rounded-full px-3 py-2 text-[11.5px] font-semibold text-ink/50 transition-colors hover:text-ink"
        >
          <RotateCcw className="size-3.5" strokeWidth={2.4} />
          {COPY.stepReset}
        </button>
      </div>

      {/* keluar dari rentang wajar → dikatakan, bukan dibiarkan lolos diam-diam */}
      {outOfRange && (
        <p className="text-[11px] font-medium text-hud-terracotta">
          {COPY.limitHint(shortIDR(TARGET_MIN), shortIDR(TARGET_MAX))}
        </p>
      )}

      {/* quick-pick celengan — satu ketukan memilih, saran nominal dari
          `monthlyNeeded()`. Disembunyikan seluruhnya kalau tidak ada celengan
          yang masih bisa ditambah (jangan menyisakan bagian kosong). */}
      {FUNDS.length > 0 && (
        <section className="rounded-2xl bg-cream p-4 ring-1 ring-soil/12">
          <p className="text-[13px] font-semibold text-ink">{COPY.fundTitle}</p>
          <p className="mt-0.5 text-[11px] leading-relaxed text-ink/45">{COPY.fundCaption}</p>

          <div role="radiogroup" aria-label={COPY.fundTitle} className="mt-3 space-y-2">
            {FUNDS.map(({ fund, monthly, percent }) => {
              const active = fundId === fund.id
              return (
                <button
                  key={fund.id}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  onClick={() => onFundChange(active ? null : fund.id)}
                  className={cn(
                    'flex w-full items-center justify-between gap-3 rounded-2xl px-3.5 py-3 text-left transition-colors',
                    active
                      ? 'bg-forest'
                      : 'bg-cream ring-1 ring-soil/14 hover:bg-sage/40',
                  )}
                >
                  <span className="min-w-0">
                    <span
                      className={cn(
                        'block truncate text-[13px] font-semibold',
                        active ? 'text-mint' : 'text-ink',
                      )}
                    >
                      {fund.name}
                    </span>
                    <span
                      className={cn(
                        'mt-0.5 block text-[11px] tabular-nums',
                        active ? 'text-mint/70' : 'text-ink/45',
                      )}
                    >
                      {COPY.fundProgress(percent)}
                    </span>
                  </span>
                  <span
                    className={cn(
                      'shrink-0 rounded-full px-3 py-1.5 text-[11.5px] font-semibold tabular-nums',
                      active ? 'bg-mint text-forest' : 'bg-sage text-forest',
                    )}
                  >
                    {COPY.fundPerMonth(money(monthly))}
                  </span>
                </button>
              )
            })}

            {/* "tidak ada" adalah keputusan yang sah, bukan kegagalan */}
            <button
              type="button"
              role="radio"
              aria-checked={fundId === null}
              onClick={() => onFundChange(null)}
              className={cn(
                'flex w-full items-center gap-2.5 rounded-2xl px-3.5 py-2.5 text-left text-[12.5px] font-medium transition-colors',
                fundId === null
                  ? 'bg-sage/70 text-forest'
                  : 'bg-cream text-ink/50 ring-1 ring-soil/14 hover:text-ink',
              )}
            >
              <Sprout className="size-4 shrink-0" strokeWidth={2.2} />
              {COPY.fundNone}
            </button>
          </div>

          {/* jujur soal batas: modal ini memutuskan, setorannya di /budget */}
          <p className="mt-3 text-[11px] leading-relaxed text-ink/45">{COPY.fundSetorHint}</p>
        </section>
      )}
    </div>
  )
}

