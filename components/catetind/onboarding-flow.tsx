'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  AnimatePresence,
  motion,
  useReducedMotion,
  type Variants,
} from 'framer-motion'
import { ArrowRight, Check } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import {
  EXIT_WARNING,
  LIFE_SITUATIONS,
  POST_ONBOARDING_ROUTE,
  saveOnboardingResult,
  type DashboardPeriod,
  type OnboardingModule,
} from '@/lib/onboarding'
import { OnboardingStepSituation } from './onboarding-step-situation'
import { OnboardingStepIncome } from './onboarding-step-income'
import { OnboardingStepFirstTransaction } from './onboarding-step-first-transaction'
import type { TransactionTypeId } from '@/components/dashboard/transaction-input-engine'
import { addWalletAccount, getMoneySnapshot, walletIdOfName } from '@/lib/money/store'
import { recordTransaction } from '@/lib/transaction-bus'
import {
  TRANSACTION_DEFAULT_NAME,
  TRANSACTION_FALLBACK_CATEGORY,
  localISODate,
} from '@/lib/data/history'
import { AI_CAPTURE_COPY } from '@/lib/ai-chat'

/**
 * Onboarding Flow (/app/onboarding) — inventaris #10, PRD Domain 6 Section 5.
 *
 * Karakter yang dijaga (versi redesign "modern clean minimalis"):
 * - 3 langkah: langkah 1 (situasi) & langkah 3 (transaksi pertama) WAJIB supaya
 *   dashboard punya data sejak hari pertama; PEMASUKAN di langkah 2 OPSIONAL,
 *   karena tidak semua user punya penghasilan tetap per bulan.
 * - Chrome seminim mungkin: tanpa sidebar/nav, tanpa tulisan "Langkah x dari 3",
 *   tanpa bar progres dobel. Penanda progres cuma deret titik di atas konten.
 * - Satu CTA bentuk pil (label kiri + tombol panah bulat kanan) — bahasa visual
 *   yang sama dengan referensi mobile fintech, tetap warna brand (forest).
 * - Tiap step slide horizontal + fade 200ms (AnimatePresence).
 */

const TOTAL_STEPS = 3

/** cubic-bezier khas app: masuk cepat lalu settle lembut */
const EASE: [number, number, number, number] = [0.32, 0.72, 0, 1]

export function OnboardingFlow() {
  const router = useRouter()
  const reduced = useReducedMotion()

  /* ── STATE ────────────────────────────────────────────────────────── */
  const [currentStep, setCurrentStep] = useState(1)
  /** arah animasi: 1 = maju (masuk dari kanan), -1 = kembali (dari kiri) */
  const [direction, setDirection] = useState(1)
  const [selectedSituations, setSelectedSituations] = useState<string[]>([])
  const [dashboardPeriod, setDashboardPeriod] =
    useState<DashboardPeriod>('calendar')
  /* default 25 = tanggal gajian paling umum, jadi user boleh lanjut tanpa
     mengisi apa-apa saat memilih "Siklus Gajian" */
  const [paydayDate, setPaydayDate] = useState(25)
  const [monthlyIncome, setMonthlyIncome] = useState<number | null>(null)
  const [walletName, setWalletName] = useState('')
  const [walletBalance, setWalletBalance] = useState<number | null>(null)
  const [firstTransactionDone, setFirstTransactionDone] = useState(false)
  const [reminderEnabled, setReminderEnabled] = useState(false)
  /* isian mini input transaksi — tinggal di flow supaya CTA bawah bisa tahu
     kapan tombol "Catat Pertama" boleh aktif */
  const [txType, setTxType] = useState<TransactionTypeId>('expense')
  const [txDigits, setTxDigits] = useState('')
  const [txNote, setTxNote] = useState('')

  /**
   * Modul hasil gating (Domain 2B.5/2C.5/2D.7) DITURUNKAN dari kartu situasi
   * yang dipilih — bukan state terpisah, supaya tidak pernah ada dua sumber
   * kebenaran yang bisa berbeda.
   */
  const selectedModules = useMemo<OnboardingModule[]>(() => {
    return LIFE_SITUATIONS.filter(
      (item) => item.module && selectedSituations.includes(item.id),
    ).map((item) => item.module as OnboardingModule)
  }, [selectedSituations])

  /* ── SYARAT TOMBOL LANJUT ─────────────────────────────────────────── */
  const canContinueStep1 = selectedSituations.length > 0
  /* Pemasukan TIDAK ikut jadi syarat (opsional). Yang wajib cuma dompet +
     saldo awalnya, karena transaksi pertama butuh tempat menempel; saldo boleh
     0 (rekening baru dibuat) — yang penting field-nya terisi. */
  const canContinueStep2 = walletName !== '' && walletBalance !== null
  const txAmount = txDigits === '' ? 0 : Number(txDigits)
  const canSubmitTransaction = txAmount > 0

  /* ── 5D: cegah keluar tidak sengaja ─────────────────────────────────
     Dua lapis: (1) beforeunload untuk refresh / tutup tab / ketik URL lain,
     (2) sentinel history + popstate untuk tombol Back browser/HP — kalau user
     pilih tinggal, entri history-nya dikembalikan jadi isian tetap utuh.
     Guard dilonggarkan begitu transaksi pertama tersimpan (data wajib lengkap).
     Catatan: App Router belum punya API navigation guard resmi, jadi lapis (2)
     memakai History API langsung. */
  useEffect(() => {
    if (firstTransactionDone) return

    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault()
      event.returnValue = ''
    }
    window.addEventListener('beforeunload', onBeforeUnload)

    const trap = { catetindOnboarding: true }
    window.history.pushState(trap, '', window.location.href)

    const onPopState = () => {
      if (window.confirm(EXIT_WARNING)) {
        window.location.assign(POST_ONBOARDING_ROUTE)
        return
      }
      window.history.pushState(trap, '', window.location.href)
    }
    window.addEventListener('popstate', onPopState)

    return () => {
      window.removeEventListener('beforeunload', onBeforeUnload)
      window.removeEventListener('popstate', onPopState)
    }
  }, [firstTransactionDone])

  /* ── NAVIGASI ─────────────────────────────────────────────────────── */
  function goToStep(next: number) {
    setDirection(next > currentStep ? 1 : -1)
    setCurrentStep(next)
    /* step baru selalu mulai dari atas; keyboard yang masih terbuka ikut
       tertutup karena input step lama ter-unmount */
    window.scrollTo(0, 0)
  }

  function handleToggleSituation(id: string) {
    setSelectedSituations((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id],
    )
  }

  function handleWalletPick(name: string) {
    setWalletName(name)
    /* ganti dompet = saldo lama tidak relevan lagi */
    setWalletBalance(null)
  }

  /** 4B — simpan transaksi pertama: tulis LEDGER, lalu haptic + toast + upacara. */
  function handleFirstTransaction() {
    if (!canSubmitTransaction) {
      toast('Isi nominalnya dulu ya 🌿')
      return
    }
    if (firstTransactionDone) return
    /* ── CATAT KE LEDGER (paket 65 · Tugas B) ────────────────────────────────
       Dulu langkah ini cuma menampilkan toast "berhasil" TANPA menulis satu baris
       pun — klaim tanpa jejak. Sekarang ia menulis lewat pintu yang sama dengan
       app (`recordTransaction` → `postTransaction`), dan dompet dari langkah 2
       dibuat lewat `addWalletAccount()` supaya saldo awalnya benar-benar ada.
       Kalau penulisan gagal, user diberi tahu apa adanya (bukan toast sukses). */
    let recorded = false
    try {
      const snapshot = getMoneySnapshot()
      if (!walletIdOfName(snapshot, walletName)) {
        addWalletAccount({
          name: walletName,
          type: 'Cash',
          opening: walletBalance ?? 0,
          context: 'pribadi',
        })
      }
      recordTransaction({
        name: txNote.trim() || TRANSACTION_DEFAULT_NAME[txType],
        amount: txAmount,
        type: txType,
        category: TRANSACTION_FALLBACK_CATEGORY,
        wallet: walletName,
        date: localISODate(),
      })
      recorded = true
    } catch {
      recorded = false
    }
    if (!recorded) {
      toast.error(AI_CAPTURE_COPY.saveFailed)
      return
    }
    setFirstTransactionDone(true)
    try {
      /* haptic itu bonus, bukan syarat (iOS Safari tidak punya Vibration API) */
      if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
        navigator.vibrate([30, 50, 30])
      }
    } catch {
      /* diabaikan dengan sengaja */
    }
    toast.success('Sip, catatan pertamamu berhasil! 🌿')
    window.scrollTo(0, 0)
  }

  /** Simpan hasil onboarding → masuk dashboard (toast sambutan muncul di sana) */
  function handleEnterDashboard() {
    saveOnboardingResult({
      situations: selectedSituations,
      modules: selectedModules,
      dashboardPeriod,
      paydayDate: dashboardPeriod === 'cycle' ? paydayDate : null,
      /* 0 = user memilih melewati (pemasukan opsional, tidak dipaksa) */
      monthlyIncome: monthlyIncome ?? 0,
      wallet: { name: walletName, balance: walletBalance ?? 0 },
      firstTransaction: {
        type: txType,
        amount: txAmount,
        description: txNote.trim() || 'Pengeluaran pertama (onboarding)',
      },
      reminderEnabled,
      completedAt: new Date().toISOString(),
    })
    /* replace: tombol Back tidak memutar ulang flow yang sudah selesai */
    router.replace(POST_ONBOARDING_ROUTE)
  }


  /* ── ANIMASI STEP: slide horizontal + fade 200ms ───────────────────── */
  const stepDuration = reduced ? 0 : 0.2
  const variants: Variants = {
    enter: (dir: number) => ({
      opacity: 0,
      x: dir >= 0 ? 48 : -48,
      transition: { duration: stepDuration, ease: EASE },
    }),
    center: {
      opacity: 1,
      x: 0,
      transition: { duration: stepDuration, ease: EASE },
    },
    exit: (dir: number) => ({
      opacity: 0,
      x: dir >= 0 ? -48 : 48,
      transition: { duration: reduced ? 0 : 0.16, ease: EASE },
    }),
  }

  /* ── CTA: satu pil sticky untuk semua step ──────────────────────────
     Label & ikon sengaja dipisah supaya emoji di copy (🌿) tetap tampil apa
     adanya, sedangkan panah/centang memakai ikon lucide di dalam bulatan. */
  const cta: {
    label: string
    disabled: boolean
    onClick: () => void
    icon: 'arrow' | 'check'
  } =
    currentStep === 1
      ? {
          label: 'Lanjut',
          disabled: !canContinueStep1,
          onClick: () => goToStep(2),
          icon: 'arrow',
        }
      : currentStep === 2
        ? {
            label: 'Lanjut',
            disabled: !canContinueStep2,
            onClick: () => goToStep(3),
            icon: 'arrow',
          }
        : firstTransactionDone
          ? {
              label: 'Masuk ke Dashboard 🌿',
              disabled: false,
              onClick: handleEnterDashboard,
              icon: 'arrow',
            }
          : {
              label: 'Catat Pertama',
              disabled: !canSubmitTransaction,
              onClick: handleFirstTransaction,
              icon: 'check',
            }

  return (
    <>
      <div className="mx-auto w-full max-w-[480px] px-6 pb-40 pt-7">
        {/* ── header minimal: deret titik progres + "Kembali" ─────────────
            Titik aktif memanjang (bukan tulisan "Langkah 1 dari 3") supaya
            chrome yang dibaca mata cuma satu. Step 1 tanpa tombol Kembali. */}
        <div className="flex min-h-9 items-center justify-between gap-3">
          <div
            role="progressbar"
            aria-label="Progres setup"
            aria-valuemin={1}
            aria-valuemax={TOTAL_STEPS}
            aria-valuenow={currentStep}
            className="flex items-center gap-1.5"
          >
            {Array.from({ length: TOTAL_STEPS }, (_, index) => index + 1).map(
              (step) => (
                <span
                  key={step}
                  className={cn(
                    'h-1.5 rounded-full transition-all duration-300',
                    step === currentStep ? 'w-6 bg-ink/80' : 'w-1.5 bg-ink/15',
                  )}
                />
              ),
            )}
          </div>

          {currentStep > 1 && (
            <button
              type="button"
              onClick={() => goToStep(currentStep - 1)}
              className="-mr-2 rounded-full px-3 py-1.5 text-[13px] font-medium tracking-[-0.01em] text-forest/40 transition-colors hover:bg-ink/[0.04] hover:text-forest"
            >
              Kembali
            </button>
          )}
        </div>

        {/* ── isi step: slide horizontal + fade (AnimatePresence) ────────── */}
        <AnimatePresence mode="wait" custom={direction} initial={false}>
          <motion.div
            key={currentStep}
            custom={direction}
            variants={variants}
            initial="enter"
            animate="center"
            exit="exit"
            className="mt-9"
          >
            {currentStep === 1 && (
              <OnboardingStepSituation
                selectedIds={selectedSituations}
                onToggleSituation={handleToggleSituation}
                period={dashboardPeriod}
                onPeriodChange={setDashboardPeriod}
                paydayDate={paydayDate}
                onPaydayChange={setPaydayDate}
              />
            )}

            {currentStep === 2 && (
              <OnboardingStepIncome
                income={monthlyIncome}
                onIncomeChange={setMonthlyIncome}
                walletName={walletName}
                onWalletPick={handleWalletPick}
                walletBalance={walletBalance}
                onWalletBalanceChange={setWalletBalance}
                onSubmit={() => canContinueStep2 && goToStep(3)}
              />
            )}
            {currentStep === 3 && (
              <OnboardingStepFirstTransaction
                type={txType}
                onTypeChange={setTxType}
                amountDigits={txDigits}
                onAmountChange={setTxDigits}
                note={txNote}
                onNoteChange={setTxNote}
                onSubmit={handleFirstTransaction}
                done={firstTransactionDone}
                onReminderChange={setReminderEnabled}
              />
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* ── CTA sticky: pil dengan bulatan ikon (label kiri, aksi kanan) ── */}
      <div className="fixed inset-x-0 bottom-0 z-40 bg-gradient-to-t from-cream via-cream/95 to-transparent pb-[max(1rem,env(safe-area-inset-bottom))] pt-12">
        <div className="mx-auto w-full max-w-[480px] px-6">
          <button
            type="button"
            onClick={cta.onClick}
            disabled={cta.disabled}
            className={cn(
              'group flex h-14 w-full items-center justify-between gap-3 rounded-full pl-6 pr-2 transition-all duration-200',
              cta.disabled
                ? 'cursor-not-allowed bg-ink/[0.06] text-forest/35'
                : 'bg-forest text-cream shadow-[0_16px_34px_-18px_rgba(69,89,78,0.85)] hover:bg-forest-soft active:scale-[0.98]',
            )}
          >
            <span className="text-[15.5px] font-medium tracking-[-0.01em]">
              {cta.label}
            </span>
            <span
              className={cn(
                'flex size-10 shrink-0 items-center justify-center rounded-full transition-colors duration-200',
                cta.disabled
                  ? 'bg-cream text-forest/25'
                  : 'bg-cream text-forest group-hover:bg-mint',
              )}
            >
              {cta.icon === 'arrow' ? (
                <ArrowRight className="size-[18px]" strokeWidth={2.4} />
              ) : (
                <Check className="size-[18px]" strokeWidth={2.8} />
              )}
            </span>
          </button>
        </div>
      </div>
    </>
  )
}

