'use client'

import { useEffect, useRef } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Check } from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  BUDGET_SPLITS,
  QUICK_WALLET_PICKS,
  digitsToDisplay,
  onlyDigits,
} from '@/lib/onboarding'
import { formatIDR } from '@/lib/wallets'
import { ONBOARD_CARD, OnboardLabel, OnboardingStepHeader } from './onboarding-ui'

/**
 * Step 2 — "Berapa Gajimu?" (pemasukan + dompet pertama).
 *
 * Keputusan desain (revisi):
 * - PEMASUKAN OPSIONAL. Tidak semua user sudah punya penghasilan per bulan
 *   (mahasiswa, baru mulai kerja, income tidak tetap) — jadi field ini boleh
 *   kosong dan TIDAK memblokir tombol Lanjut. Yang wajib hanya dompet pertama,
 *   karena transaksi pertama (Step 3) butuh tempat menempel.
 * - Badge "Opsional" + salinan yang jujur ("boleh dikosongkan") ditata di atas,
 *   jadi tidak ada kesan dipaksa mengisi angka rekaan.
 * - Alokasi 50/30/20 cuma PREVIEW read-only dan HANYA muncul kalau angkanya ada.
 *   Bar-nya dibuat hairline (3px) supaya sepuluh, bukan sepuluh warna.
 *
 * Format Rupiah memakai pola yang sama dengan Transaction Input Engine: string
 * DIGIT mentah sebagai sumber kebenaran, titik ribuan murni tampilan.
 */
export function OnboardingStepIncome({
  income,
  onIncomeChange,
  walletName,
  onWalletPick,
  walletBalance,
  onWalletBalanceChange,
  onSubmit,
}: {
  income: number | null
  onIncomeChange: (value: number | null) => void
  walletName: string
  onWalletPick: (name: string) => void
  walletBalance: number | null
  onWalletBalanceChange: (value: number | null) => void
  /** Enter di keyboard numerik = lanjut (hemat satu tap) */
  onSubmit: () => void
}) {
  const incomeRef = useRef<HTMLInputElement>(null)
  const balanceRef = useRef<HTMLInputElement>(null)

  /* 5B — auto-focus nominal begitu step masuk, supaya keyboard angka langsung
     muncul. Ditunda ~220ms supaya tidak berebut dengan animasi slide 200ms
     (kalau fokus dipaksa terlalu cepat, layout suka "nabrak" di tengah animasi). */
  useEffect(() => {
    const id = window.setTimeout(() => incomeRef.current?.focus(), 220)
    return () => window.clearTimeout(id)
  }, [])

  /* begitu dompet dipilih, fokus langsung pindah ke input saldo */
  useEffect(() => {
    if (!walletName) return
    const id = window.setTimeout(() => balanceRef.current?.focus(), 240)
    return () => window.clearTimeout(id)
  }, [walletName])

  const incomeDigits = income === null ? '' : String(income)
  const incomeDisplay = digitsToDisplay(incomeDigits)
  const balanceDigits = walletBalance === null ? '' : String(walletBalance)
  const balanceDisplay = digitsToDisplay(balanceDigits)

  /** Enter di keyboard numerik = "Lanjut" tanpa perlu tutup keyboard */
  function handleEnter(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key !== 'Enter') return
    event.preventDefault()
    onSubmit()
  }

  return (
    <div>
      <OnboardingStepHeader
        badge="Opsional"
        title="Berapa pemasukan bulananmu?"
        subtitle="Gak perlu persis, dan boleh dikosongkan kalau belum ada penghasilan tetap. Bisa diisi kapan aja nanti."
      />

      {/* ── nominal raksasa (center) ─────────────────────────────────────
          Prefix "Rp" dirender terpisah + spacer kembar di kanan supaya angka
          benar-benar center. Placeholder "5.000.000" tampil utuh saat kosong
          (Rp dari prefix + 5.000.000 dari placeholder) — sengaja TIDAK kosong
          supaya user punya jangkar angka. */}
      <div className="mt-9 flex w-full items-baseline justify-center gap-1.5">
        <span
          aria-hidden
          className="w-7 shrink-0 text-right text-lg font-medium text-ink/25"
        >
          Rp
        </span>
        <input
          ref={incomeRef}
          value={incomeDisplay}
          onChange={(event) => {
            const digits = onlyDigits(event.target.value)
            onIncomeChange(digits ? Number(digits) : null)
          }}
          onKeyDown={handleEnter}
          inputMode="numeric"
          pattern="[0-9]*"
          autoComplete="off"
          enterKeyHint="next"
          placeholder="5.000.000"
          aria-label="Pemasukan bulanan (opsional)"
          className={cn(
            'min-w-0 flex-1 bg-transparent text-center font-medium leading-none tracking-[-0.04em] text-ink tabular-nums outline-none placeholder:text-ink/[0.14]',
            incomeDisplay.length <= 7 ? 'text-[2.7rem]' : 'text-[2.15rem]',
          )}
        />
        <span aria-hidden className="w-7 shrink-0" />
      </div>
      <p className="mt-3 text-center text-[12.5px] leading-relaxed text-ink/40">
        Kosongkan aja kalau belum ada — nanti bisa diisi di Pengaturan.
      </p>

      {/* ── preview alokasi 50/30/20 (read-only, hanya kalau angkanya ada) ──
          Muncul begitu ada angka: user langsung lihat budget hariannya akan
          dihitung otomatis, tanpa perlu menyetel apa pun di step ini. Kalau
          field dikosongkan, seluruh seksi ini hilang — bukan pesan error. */}
      <AnimatePresence initial={false}>
        {income !== null && income > 0 && (
          <motion.section
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            transition={{ duration: 0.2, ease: [0.32, 0.72, 0, 1] }}
            className="mt-10"
          >
            <OnboardLabel>Saran alokasi</OnboardLabel>

            <div className={cn('mt-3 px-4 py-4 ring-1 ring-ink/[0.06]', ONBOARD_CARD)}>
              <div className="space-y-4">
                {BUDGET_SPLITS.map((split) => (
                  <div key={split.id}>
                    <div className="flex items-baseline justify-between gap-3">
                      <span className="text-[13.5px] font-medium tracking-[-0.01em] text-ink">
                        {split.label}{' '}
                        <span className="text-ink/35">
                          {Math.round(split.percent * 100)}%
                        </span>
                      </span>
                      <span className="shrink-0 text-[13.5px] font-semibold tabular-nums text-forest">
                        {formatIDR(Math.round(income * split.percent))}
                      </span>
                    </div>
                    <div className="mt-2 h-[3px] w-full overflow-hidden rounded-full bg-ink/[0.06]">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: split.percent * 100 + '%' }}
                        transition={{ duration: 0.35, ease: [0.32, 0.72, 0, 1] }}
                        className={cn('h-full rounded-full', split.bar)}
                      />
                    </div>
                  </div>
                ))}
              </div>

              <p className="mt-4 text-[11.5px] leading-relaxed text-ink/40">
                Saran awal aja — bisa diubah kapan aja di halaman Budget.
              </p>
            </div>
          </motion.section>
        )}
      </AnimatePresence>

      {/* ── dompet pertama (WAJIB — ini yang membuka Step 3) ───────────── */}
      <section className="mt-10">
        <OnboardLabel>Dompet pertama</OnboardLabel>
        <p className="mt-2 text-[13px] leading-relaxed text-ink/45">
          Pilih satu dulu biar transaksi pertamamu punya tempat menempel.
        </p>

        {/* ghost card 1 ketukan — gulir horizontal dengan snap; padding samping
            negatif supaya kartu bisa "keluar" dari kolom konten 480px */}
        <div
          data-lenis-prevent-horizontal
          className="hide-scrollbar -mx-6 mt-3 flex snap-x snap-mandatory gap-2.5 overflow-x-auto px-6 pb-2 pt-1"
        >
          {QUICK_WALLET_PICKS.map((pick) => {
            const active = pick.name === walletName
            return (
              <button
                key={pick.name}
                type="button"
                onClick={() => onWalletPick(pick.name)}
                aria-pressed={active}
                className={cn(
                  'relative flex min-w-[92px] shrink-0 snap-start flex-col items-center gap-2.5 rounded-[1.25rem] px-3 py-3.5 transition-all duration-200 active:scale-[0.97] motion-reduce:transition-none',
                  ONBOARD_CARD,
                  active
                    ? 'ring-[1.5px] ring-forest'
                    : 'ring-1 ring-ink/[0.06] hover:ring-ink/[0.12]',
                )}
              >
                <span
                  className={cn(
                    'flex size-10 items-center justify-center rounded-[0.9rem] text-[15px] font-semibold ring-1 ring-inset',
                    pick.tile,
                  )}
                >
                  {pick.name.charAt(0)}
                </span>
                <span
                  className={cn(
                    'text-[12px] font-medium tracking-[-0.01em]',
                    active ? 'text-ink' : 'text-ink/50',
                  )}
                >
                  {pick.name}
                </span>
                {active && (
                  <span className="absolute right-2 top-2 flex size-4 items-center justify-center rounded-full bg-forest text-cream">
                    <Check className="size-2.5" strokeWidth={3.2} />
                  </span>
                )}
              </button>
            )
          })}
        </div>

        {/* input saldo — baru muncul setelah dompet dipilih, lalu langsung
            difokuskan (lihat useEffect di atas) */}
        <AnimatePresence initial={false}>
          {walletName !== '' && (
            <motion.div
              key={walletName}
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2, ease: [0.32, 0.72, 0, 1] }}
              className="overflow-hidden"
            >
              <div className={cn('mt-3 px-4 py-4 ring-1 ring-ink/[0.06]', ONBOARD_CARD)}>
                <label
                  htmlFor="onboarding-wallet-balance"
                  className="block text-[12.5px] font-medium tracking-[-0.01em] text-ink/45"
                >
                  Saldo {walletName} sekarang
                </label>

                <div className="mt-2.5 flex w-full items-baseline gap-1.5">
                  <span
                    aria-hidden
                    className="w-7 shrink-0 text-right text-base font-medium text-ink/25"
                  >
                    Rp
                  </span>
                  <input
                    id="onboarding-wallet-balance"
                    ref={balanceRef}
                    value={balanceDisplay}
                    onChange={(event) => {
                      const digits = onlyDigits(event.target.value)
                      onWalletBalanceChange(digits ? Number(digits) : null)
                    }}
                    onKeyDown={handleEnter}
                    inputMode="numeric"
                    pattern="[0-9]*"
                    autoComplete="off"
                    enterKeyHint="next"
                    placeholder="1.000.000"
                    aria-label={'Saldo ' + walletName + ' kamu sekarang berapa?'}
                    className="min-w-0 flex-1 bg-transparent text-center text-[1.7rem] font-medium leading-none tracking-[-0.03em] text-ink tabular-nums outline-none placeholder:text-ink/[0.14]"
                  />
                  <span aria-hidden className="w-7 shrink-0" />
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <p className="mt-3 text-[12px] leading-relaxed text-ink/35">
          Saldo boleh 0 kalau dompetnya baru dibuat.
        </p>
      </section>
    </div>
  )
}
