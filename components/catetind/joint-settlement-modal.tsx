'use client'

import { useEffect } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Check, X } from 'lucide-react'
import { useBodyScrollLock } from '@/hooks/use-body-scroll-lock'
import {
  JOINT_ME,
  JOINT_MONTH_LABEL,
  JOINT_PARTNER,
  SETTLEMENT_DISCLAIMER,
  SETTLEMENT_SCOPE_SHORT,
  SETTLED_TOAST,
  moneyLabel,
  shouldPromptSettlement,
  type JointPerson,
  type SettlementState,
} from '@/lib/data/joint'
import { toast } from 'sonner'
import { JointBalanceScale } from './joint-balance-scale'
import { cn } from '@/lib/utils'

/* ── Settlement Modal (Section 7) ────────────────────────────────────────────
   Rekap bulanan + instruksi transfer + tombol "Tandai Sudah Settle ✓".
   Sengaja dibuka dari Balance Scale ("Settle Sekarang") ATAU dari banner rekap
   bulanan — dua pintu ke satu layar yang sama.

   Mobile: bottom sheet. Desktop: dialog tengah (translate dipakai sebagai
   properti terpisah supaya tidak bentrok dengan animasi y Framer Motion).
   Disclaimer di bawah penting: CatetInd CUMA mencatat, uangnya tetap dipindah
   manual — biar tidak ada salah paham "sudah transfer otomatis".
   ────────────────────────────────────────────────────────────────────────── */

const EASE: [number, number, number, number] = [0.22, 1, 0.36, 1]

export function JointSettlementModal({
  open,
  onClose,
  settlement,
  masked,
  onSettle,
  me = JOINT_ME,
  partner = JOINT_PARTNER,
}: {
  open: boolean
  onClose: () => void
  settlement: SettlementState
  masked: boolean
  /** user menekan "Tandai Sudah Settle ✓" — scale di halaman kembali rata */
  onSettle: () => void
  me?: JointPerson
  partner?: JointPerson
}) {
  useBodyScrollLock(open, true)

  /* Escape menutup modal (pola yang sama dengan detail transaksi) */
  useEffect(() => {
    if (!open) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [open, onClose])

  const { whoOwes, whoIsOwed, settlementAmount, difference, settled } = settlement

  function handleSettle() {
    try {
      if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
        navigator.vibrate([30, 50, 30])
      }
    } catch {
      /* haptic itu bonus — jangan sampai memblokir aksi utama */
    }
    toast.success(SETTLED_TOAST)
    onSettle()
    onClose()
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          key="joint-settlement"
          className="fixed inset-0 z-[70]"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          <button
            type="button"
            aria-label="Tutup rekap settlement"
            onClick={onClose}
            className="absolute inset-0 cursor-default bg-ink/55"
          />
          <div className="absolute inset-x-0 bottom-0 flex justify-center sm:inset-x-4 sm:bottom-auto sm:top-1/2 sm:-translate-y-1/2">
            <motion.div
              role="dialog"
              aria-modal="true"
              aria-label={`Rekap settlement ${JOINT_MONTH_LABEL}`}
              initial={{ y: 64, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 64, opacity: 0 }}
              transition={{ duration: 0.34, ease: EASE }}
              className="max-h-[92dvh] w-full max-w-md overflow-y-auto rounded-t-[2rem] bg-[#fbf6d9] px-5 pb-7 pt-4 shadow-[0_-24px_60px_-24px_rgba(69,89,78,0.55)] sm:rounded-[2rem] sm:px-6 sm:shadow-[0_28px_70px_-24px_rgba(69,89,78,0.5)]"
              data-lenis-prevent
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-ink/40">
                    Rekap settlement
                  </p>
                  <h2 className="mt-0.5 font-display text-xl font-black tracking-tight text-ink">
                    Bulan {JOINT_MONTH_LABEL}
                  </h2>
                </div>
                <button
                  type="button"
                  onClick={onClose}
                  aria-label="Tutup"
                  className="flex size-9 shrink-0 items-center justify-center rounded-full bg-cream text-ink ring-1 ring-soil/5 transition-colors hover:bg-sage active:scale-95"
                >
                  <X className="size-4" strokeWidth={2.2} />
                </button>
              </div>

              {/* versi mungil timbangan — pengingat visual kondisi bulan ini */}
              <div className="mt-2 flex justify-center">
                <JointBalanceScale
                  settlement={settlement}
                  masked={masked}
                  me={me}
                  partner={partner}
                  size="sm"
                  showCopy={false}
                />
              </div>
              {/* dua lapisan angka (audit #1–#3): seluruh catatan vs yang benar-
                  benar ditimbang — supaya "Selisih" di bawah bisa ditelusuri */}
              <div className="mt-3 space-y-2 rounded-[1.5rem] bg-cream px-4 py-3.5 ring-1 ring-soil/[0.05]">
                <p className="text-[10.5px] font-bold uppercase tracking-[0.14em] text-ink/35">
                  Semua catatan bulan ini
                </p>
                <RecapRow
                  label={`${me.avatar} ${me.name} bayar`}
                  value={moneyLabel(settlement.myTotalSpent, masked)}
                />
                <RecapRow
                  label={`${partner.avatar} ${partner.name} bayar`}
                  value={moneyLabel(settlement.partnerTotalSpent, masked)}
                />
                <RecapRow
                  label="Total pengeluaran bersama"
                  value={moneyLabel(settlement.totalSpent, masked)}
                />
              </div>

              <div className="mt-3 space-y-2 rounded-[1.5rem] bg-hud-sage/12 px-4 py-3.5 ring-1 ring-hud-sage/25">
                <p className="text-[10.5px] font-bold uppercase tracking-[0.14em] text-[#503a3a]">
                  Yang ditimbang (patungan)
                </p>
                <RecapRow
                  label={`${me.avatar} ${me.name} patungan`}
                  value={moneyLabel(settlement.myWeighedSpent, masked)}
                />
                <RecapRow
                  label={`${partner.avatar} ${partner.name} patungan`}
                  value={moneyLabel(settlement.partnerWeighedSpent, masked)}
                />
                {settlement.treatTotal > 0 && (
                  <RecapRow
                    label="Traktiran (tidak ditimbang)"
                    value={moneyLabel(settlement.treatTotal, masked)}
                  />
                )}
                <div className="border-t border-soil/[0.06] pt-2">
                  <RecapRow label="Selisih" value={moneyLabel(difference, masked)} strong />
                </div>
                <p className="text-[10.5px] leading-relaxed text-[#503a3a]/85">
                  {SETTLEMENT_SCOPE_SHORT}
                </p>
              </div>

              {settled ? (
                <div className="mt-4 rounded-[1.5rem] bg-hud-sage/15 px-4 py-3.5 text-center ring-1 ring-hud-sage/35">
                  <p className="text-[13px] font-semibold leading-relaxed text-[#503a3a]">
                    Bulan ini sudah ditandai settle ✅ Scale-nya rata, gak ada yang perlu transfer.
                  </p>
                </div>
              ) : settlement.level === 'equal' ? (
                <div className="mt-4 rounded-[1.5rem] bg-hud-sage/15 px-4 py-3.5 text-center ring-1 ring-hud-sage/35">
                  <p className="text-[13px] font-semibold leading-relaxed text-[#503a3a]">
                    Kalian impas — gak ada yang perlu transfer bulan ini ⚖️✨
                  </p>
                </div>
              ) : settlement.level === 'close' ? (
                /* audit #6: di bawah ambang A7 modal cuma jadi rekap, TANPA
                   ajakan transfer supaya tidak bertabrakan dengan copy di atas */
                <div className="mt-4 rounded-[1.5rem] bg-hud-sage/15 px-4 py-3.5 text-center ring-1 ring-hud-sage/35">
                  <p className="text-[13px] font-semibold leading-relaxed text-[#503a3a]">
                    Hampir impas! Selisihnya cuma {moneyLabel(difference, masked)} — gak perlu
                    settle 💚
                  </p>
                </div>
              ) : (
                <div className="mt-4 rounded-[1.5rem] bg-hud-amber/15 px-4 py-3.5 ring-1 ring-hud-amber/35">
                  <p className="text-[13px] leading-relaxed text-ink">
                    Biar impas, <b className="font-bold">{whoOwes.name}</b> perlu transfer{' '}
                    <b className="font-bold tabular-nums text-hud-terracotta">
                      {moneyLabel(settlementAmount, masked)}
                    </b>{' '}
                    ke <b className="font-bold">{whoIsOwed.name}</b>.
                  </p>
                </div>
              )}

              {shouldPromptSettlement(settlement) && (
                <button
                  type="button"
                  onClick={handleSettle}
                  className="mt-3 inline-flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-forest text-[14px] font-bold text-mint shadow-[0_16px_32px_-20px_rgba(69,89,78,0.95)] transition-colors hover:bg-forest-soft active:scale-[0.99]"
                >
                  Tandai Sudah Settle
                  <Check className="size-4" strokeWidth={3} />
                </button>
              )}

              <button
                type="button"
                onClick={onClose}
                className="mt-2 inline-flex h-11 w-full items-center justify-center rounded-2xl bg-transparent text-[13px] font-semibold text-ink/55 transition-colors hover:bg-soil/[0.04]"
              >
                Nanti aja
              </button>

              <p className="mt-3 text-center text-[11px] leading-relaxed text-ink/40">
                {SETTLEMENT_DISCLAIMER}
              </p>
            </motion.div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

/** satu baris rekap (label kiri, nominal kanan) */
function RecapRow({
  label,
  value,
  strong = false,
}: {
  label: string
  value: string
  strong?: boolean
}) {
  return (
    <p className="flex items-center justify-between gap-3">
      <span className="min-w-0 truncate text-[13px] text-ink/55">{label}</span>
      <span
        className={cn(
          'shrink-0 tabular-nums',
          strong ? 'text-[15px] font-black text-ink' : 'text-[13px] font-semibold text-ink',
        )}
      >
        {value}
      </span>
    </p>
  )
}
