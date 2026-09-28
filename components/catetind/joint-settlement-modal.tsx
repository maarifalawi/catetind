'use client'

import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Check, X } from 'lucide-react'
import { useBodyScrollLock } from '@/hooks/use-body-scroll-lock'
import {
  DEFAULT_SETTLEMENT_METHOD,
  JOINT_ME,
  JOINT_MONTH_LABEL,
  JOINT_PARTNER,
  NET_SECTION_TITLE,
  SETTLEMENT_DISCLAIMER,
  SETTLEMENT_METHODS,
  SETTLEMENT_SCOPE_SHORT,
  SETTLE_METHOD_LABEL,
  SETTLE_ONE_TRANSFER_HINT,
  SETTLE_ONE_TRANSFER_LABEL,
  SETTLED_TOAST,
  moneyLabel,
  netPhrase,
  settlementCarryCopy,
  shouldPromptSettlement,
  type JointPerson,
  type JointSettlementRecord,
  type SettlementMethod,
  type SettlementState,
} from '@/lib/data/joint'
import { toast } from 'sonner'
import { JointBalanceScale } from './joint-balance-scale'
import { ChoicePills } from './budget-sheet'
import { useSubscriptionGate } from './subscription-gate-provider'
import { SubscriptionLockNote } from './subscription-lock-note'
import { cn } from '@/lib/utils'

/* ── Settlement Modal (Section 7) ────────────────────────────────────────────
   Rekap bulanan + instruksi transfer + tombol "Tandai Sudah Settle ✓".
   Sengaja dibuka dari Balance Scale ("Settle Sekarang") ATAU dari banner rekap
   bulanan — dua pintu ke satu layar yang sama.

   Stage 2 #1 & #2:
   • Blok rekap menampilkan NET per orang (`netPhrase`) — dulu isinya "patungan"
     lalu "Selisih" tanpa pernah menyebut siapa berhak menerima berapa.
   • Baris "Satu transfer" memberi nama pada nominalnya: satu transfer penuh
     memang menyelesaikan bulan ini (dulu user tidak tahu itu setengah selisih
     atau transfer penuh).
   • User memilih metode transfernya, dan pilihannya dibawa ke halaman supaya
     baris ledger `settlement {from, to, amount, method, month}` punya isi.

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
  carryOverRecord = null,
  me = JOINT_ME,
  partner = JOINT_PARTNER,
}: {
  open: boolean
  onClose: () => void
  settlement: SettlementState
  masked: boolean
  /** user menekan "Tandai Sudah Settle ✓" — halaman menulis entri ledger-nya */
  onSettle: (method: SettlementMethod) => void
  /** penanda bulan lalu yang masih menyisakan utang (null = tidak ada sisa) */
  carryOverRecord?: JointSettlementRecord | null
  me?: JointPerson
  partner?: JointPerson
}) {
  useBodyScrollLock(open, true)
  /* menandai bulan "sudah settle" mengubah status data bersama → ikut terkunci
     saat masa aktif habis (task 23). Rekap & instruksi transfernya tetap terbaca. */
  const { inputLocked } = useSubscriptionGate()
  /* metode transfer yang dipilih user — ikut tersimpan di baris ledger */
  const [method, setMethod] = useState<SettlementMethod>(DEFAULT_SETTLEMENT_METHOD)

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
    if (inputLocked) return
    try {
      if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
        navigator.vibrate([30, 50, 30])
      }
    } catch {
      /* haptic itu bonus — jangan sampai memblokir aksi utama */
    }
    toast.success(SETTLED_TOAST)
    /* metode transfer ikut dikirim: halaman yang menulis baris ledger-nya
       (`settlement {from, to, amount, method, month}`), bukan modal ini */
    onSettle(method)
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
              className="max-h-[92dvh] w-full max-w-md overflow-y-auto rounded-t-[2rem] bg-[#ffffff] px-5 pb-7 pt-4 shadow-[0_-24px_60px_-24px_rgba(69,89,78,0.55)] sm:rounded-[2rem] sm:px-6 sm:shadow-[0_28px_70px_-24px_rgba(69,89,78,0.5)]"
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
                  className="flex size-9 shrink-0 items-center justify-center rounded-full bg-cream text-ink ring-1 ring-soil/12 transition-colors hover:bg-sage active:scale-95"
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
              {/* dua lapisan angka (audit #1–#3): seluruh catatan vs POSISI BERSIH
                  yang benar-benar menentukan transfer — supaya baris "Satu transfer"
                  di bawah bisa ditelusuri */}
              <div className="mt-3 space-y-2 rounded-[1.5rem] bg-cream px-4 py-3.5 ring-1 ring-soil/10">
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

              {/* Stage 2 #1 & #2: dulu blok ini menulis "patungan" lalu "Selisih"
                  tanpa pernah menyebut siapa berhak menerima berapa. Sekarang
                  nilainya NET per orang + artinya, lalu satu baris transfer yang
                  benar-benar menyelesaikan bulan ini. */}
              <div className="mt-3 space-y-2 rounded-[1.5rem] bg-hud-sage/12 px-4 py-3.5 ring-1 ring-hud-sage/25">
                <p className="text-[10.5px] font-bold uppercase tracking-[0.14em] text-[#000000]">
                  {NET_SECTION_TITLE}
                </p>
                <RecapRow
                  label={`${me.avatar} ${me.name}`}
                  value={netPhrase(settlement.myNet, masked)}
                />
                <RecapRow
                  label={`${partner.avatar} ${partner.name}`}
                  value={netPhrase(settlement.partnerNet, masked)}
                />
                {carryOverRecord && (
                  <p className="rounded-2xl bg-[#ffffff]/75 px-2.5 py-2 text-[10.5px] leading-relaxed text-[#000000]/85">
                    {settlementCarryCopy(carryOverRecord, masked)}
                  </p>
                )}
                <p className="text-[10.5px] leading-relaxed text-[#000000]/70">
                  Yang ditimbang {moneyLabel(settlement.weighedTotal, masked)}
                  {settlement.treatTotal > 0
                    ? ` · traktiran ${moneyLabel(settlement.treatTotal, masked)} tidak ditimbang`
                    : ''}
                </p>
                <div className="border-t border-soil/12 pt-2">
                  <RecapRow
                    label={SETTLE_ONE_TRANSFER_LABEL}
                    value={moneyLabel(difference, masked)}
                    strong
                  />
                  <p className="mt-1 text-[10.5px] leading-relaxed text-[#000000]/85">
                    {SETTLE_ONE_TRANSFER_HINT}
                  </p>
                </div>
                <p className="text-[10.5px] leading-relaxed text-[#000000]/85">
                  {SETTLEMENT_SCOPE_SHORT}
                </p>
              </div>

              {settled ? (
                <div className="mt-4 rounded-[1.5rem] bg-hud-sage/15 px-4 py-3.5 text-center ring-1 ring-hud-sage/35">
                  <p className="text-[13px] font-semibold leading-relaxed text-[#000000]">
                    Bulan ini sudah ditandai settle ✅ Scale-nya rata, gak ada yang perlu transfer.
                  </p>
                </div>
              ) : settlement.level === 'equal' ? (
                <div className="mt-4 rounded-[1.5rem] bg-hud-sage/15 px-4 py-3.5 text-center ring-1 ring-hud-sage/35">
                  <p className="text-[13px] font-semibold leading-relaxed text-[#000000]">
                    Kalian impas — gak ada yang perlu transfer bulan ini ⚖️✨
                  </p>
                </div>
              ) : settlement.level === 'close' ? (
                /* audit #6: di bawah ambang A7 modal cuma jadi rekap, TANPA
                   ajakan transfer supaya tidak bertabrakan dengan copy di atas */
                <div className="mt-4 rounded-[1.5rem] bg-hud-sage/15 px-4 py-3.5 text-center ring-1 ring-hud-sage/35">
                  <p className="text-[13px] font-semibold leading-relaxed text-[#000000]">
                    Hampir impas! Posisi bersih kalian beda cuma {moneyLabel(difference, masked)} — gak
                    perlu settle 💚
                  </p>
                </div>
              ) : (
                <div className="mt-4 rounded-[1.5rem] bg-hud-amber/15 px-4 py-3.5 ring-1 ring-hud-amber/35">
                  <p className="text-[13px] leading-relaxed text-ink">
                    Biar impas, <b className="font-bold">{whoOwes.name}</b> perlu transfer{' '}
                    <b className="font-bold tabular-nums text-hud-terracotta">
                      {moneyLabel(settlementAmount, masked)}
                    </b>{' '}
                    ke <b className="font-bold">{whoIsOwed.name}</b> — satu transfer, langsung lunas.
                  </p>
                </div>
              )}

              {/* metode transfer: pilihannya dibawa ke penanda settle supaya baris
                  ledger-nya punya isi `method` (Stage 2 #5) */}
              {shouldPromptSettlement(settlement) && (
                <div className="mt-3 rounded-2xl bg-cream px-3.5 py-3 ring-1 ring-soil/12">
                  <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-ink/45">
                    {SETTLE_METHOD_LABEL}
                  </p>
                  <ChoicePills
                    className="mt-2"
                    options={SETTLEMENT_METHODS.map((item) => ({ id: item, label: item }))}
                    value={method}
                    onChange={setMethod}
                    ariaLabel={SETTLE_METHOD_LABEL}
                  />
                </div>
              )}

              {shouldPromptSettlement(settlement) && (
                <button
                  type="button"
                  onClick={handleSettle}
                  disabled={inputLocked}
                  aria-disabled={inputLocked || undefined}
                  className={cn(
                    'mt-3 inline-flex h-12 w-full items-center justify-center gap-2 rounded-2xl text-[14px] font-bold transition-colors',
                    inputLocked
                      ? 'cursor-not-allowed bg-ink/[0.07] text-ink/35'
                      : 'bg-forest text-mint shadow-[0_16px_32px_-20px_rgba(69,89,78,0.95)] hover:bg-forest-soft active:scale-[0.99]',
                  )}
                >
                  Tandai Sudah Settle
                  <Check className="size-4" strokeWidth={3} />
                </button>
              )}
              {inputLocked && <SubscriptionLockNote />}

              <button
                type="button"
                onClick={onClose}
                className="mt-2 inline-flex h-11 w-full items-center justify-center rounded-2xl bg-transparent text-[13px] font-semibold text-ink/55 transition-colors hover:bg-soil/[0.1]"
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
