'use client'

import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Check, X } from 'lucide-react'
import { useBodyScrollLock } from '@/hooks/use-body-scroll-lock'
import {
  DEFAULT_SETTLEMENT_METHOD,
  JOINT_MONTH_LABEL,
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
import { ChoicePills } from './budget-sheet'
import { useSubscriptionGate } from './subscription-gate-provider'
import { SubscriptionLockNote } from './subscription-lock-note'
import { cn } from '@/lib/utils'

/* â”€â”€ Settlement Modal (Section 7) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
   Rekap bulanan + instruksi transfer + tombol "Tandai Sudah Settle".
   Sengaja dibuka dari Balance Scale ("Settle Sekarang") ATAU dari banner rekap
   bulanan â€” dua pintu ke satu layar yang sama.

   Stage 2 #1 & #2:
   â€¢ Blok rekap menampilkan NET per orang (`netPhrase`) â€” dulu isinya "patungan"
     lalu "Selisih" tanpa pernah menyebut siapa berhak menerima berapa.
   â€¢ Baris "Satu transfer" memberi nama pada nominalnya: satu transfer penuh
     memang menyelesaikan bulan ini (dulu user tidak tahu itu setengah selisih
     atau transfer penuh).
   â€¢ User memilih metode transfernya, dan pilihannya dibawa ke halaman supaya
     baris ledger `settlement {from, to, amount, method, month}` punya isi.

   Mobile: bottom sheet. Desktop: dialog tengah (translate dipakai sebagai
   properti terpisah supaya tidak bentrok dengan animasi y Framer Motion).
   Disclaimer di bawah penting: CatetInd CUMA mencatat, uangnya tetap dipindah
   manual â€” biar tidak ada salah paham "sudah transfer otomatis".
   â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */

const EASE: [number, number, number, number] = [0.22, 1, 0.36, 1]

export function JointSettlementModal({
  open,
  onClose,
  settlement,
  masked,
  onSettle,
  carryOverRecord = null,
  me,
  partner,
  walletOptions = [],
  cashWalletId = '',
  onCashWalletChange,
  onUndoSettle,
}: {
  open: boolean
  onClose: () => void
  settlement: SettlementState
  masked: boolean
  /**
   * user menekan "Tandai Sudah Settle" â€” halaman menulis penanda bulan dan, kalau
   * dompet dipilih, baris kas yang benar-benar memindahkan uang.
   */
  onSettle: (method: SettlementMethod, cashWalletId?: string) => void
  /** penanda bulan lalu yang masih menyisakan utang (null = tidak ada sisa) */
  carryOverRecord?: JointSettlementRecord | null
  me: JointPerson
  partner: JointPerson
  /**
   * Dompet PRIBADI milik pemilik sesi. Kalau dipilih, uangnya benar-benar pindah
   * (pengirim: keluar, penerima: masuk) dan muncul di Riwayat. Kosong = hanya
   * penanda kesepakatan, tanpa menggeser saldo.
   */
  walletOptions?: { id: string; label: string }[]
  cashWalletId?: string
  onCashWalletChange?: (walletId: string) => void
  /**
   * Batalkan settle bulan ini. Mencabut penanda bulan DAN baris kasnya (uangnya
   * dikembalikan lewat satu baris koreksi), jadi salah tekan tidak mengunci
   * sebulan angka.
   */
  onUndoSettle?: () => void
}) {
  useBodyScrollLock(open, true)
  /* menandai bulan "sudah settle" mengubah status data bersama â†’ ikut terkunci
     saat masa aktif habis (task 23). Rekap & instruksi transfernya tetap terbaca. */
  const { inputLocked } = useSubscriptionGate()
  /* metode transfer yang dipilih user â€” ikut tersimpan di baris ledger */
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
      /* haptic itu bonus â€” jangan sampai memblokir aksi utama */
    }
    toast.success(SETTLED_TOAST)
    /* metode transfer + dompet (kalau dipilih) ikut dikirim: halaman yang menulis
       penanda bulan dan baris kasnya, bukan modal ini */
    onSettle(method, cashWalletId || undefined)
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
              className="max-h-[92dvh] w-full max-w-md overflow-y-auto rounded-t-[2rem] bg-cream px-5 pb-7 pt-4 shadow-[0_-24px_60px_-24px_rgba(0,0,0,0.55)] sm:rounded-[2rem] sm:px-6 sm:shadow-[0_28px_70px_-24px_rgba(0,0,0,0.5)]"
              data-lenis-prevent
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-[12px] font-medium uppercase tracking-[0.16em] text-forest/40">
                    Rekap settlement
                  </p>
                  <h2 className="mt-0.5 font-display text-xl font-semibold tracking-tight text-forest">
                    Bulan {JOINT_MONTH_LABEL}
                  </h2>
                </div>
                <button
                  type="button"
                  onClick={onClose}
                  aria-label="Tutup"
                  className="flex size-9 shrink-0 items-center justify-center rounded-full bg-cream text-forest ring-1 ring-soil/12 transition-colors hover:bg-sage active:scale-95"
                >
                  <X className="size-4" strokeWidth={2.2} />
                </button>
              </div>

              {/* dua lapisan angka (audit #1â€“#3): seluruh catatan vs POSISI BERSIH
                  yang benar-benar menentukan transfer â€” supaya baris "Satu transfer"
                  di bawah bisa ditelusuri */}
              <div className="mt-3 space-y-2 rounded-[1.5rem] bg-cream px-4 py-3.5 ring-1 ring-soil/10">
                <p className="text-[11.5px] font-medium uppercase tracking-[0.14em] text-forest/35">
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
                <p className="text-[11.5px] font-medium uppercase tracking-[0.14em] text-forest">
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
                  <p className="rounded-2xl bg-cream/75 px-2.5 py-2 text-[11.5px] leading-relaxed text-forest/85">
                    {settlementCarryCopy(carryOverRecord, masked)}
                  </p>
                )}
                <p className="text-[11.5px] leading-relaxed text-forest/70">
                  Yang ditimbang {moneyLabel(settlement.weighedTotal, masked)}
                  {settlement.treatTotal > 0
                    ? ` Â· traktiran ${moneyLabel(settlement.treatTotal, masked)} tidak ditimbang`
                    : ''}
                </p>
                <div className="border-t border-soil/12 pt-2">
                  <RecapRow
                    label={SETTLE_ONE_TRANSFER_LABEL}
                    value={moneyLabel(difference, masked)}
                    strong
                  />
                  <p className="mt-1 text-[11.5px] leading-relaxed text-forest/85">
                    {SETTLE_ONE_TRANSFER_HINT}
                  </p>
                </div>
                <p className="text-[11.5px] leading-relaxed text-forest/85">
                  {SETTLEMENT_SCOPE_SHORT}
                </p>
              </div>

              {settled ? (
                <div className="mt-4 rounded-[1.5rem] bg-hud-sage/15 px-4 py-3.5 text-center ring-1 ring-hud-sage/35">
                  <p className="text-[14px] font-medium leading-relaxed text-forest">
                    Bulan ini sudah ditandai settle âœ… Scale-nya rata, gak ada yang perlu transfer.
                  </p>
                </div>
              ) : settlement.level === 'equal' ? (
                <div className="mt-4 rounded-[1.5rem] bg-hud-sage/15 px-4 py-3.5 text-center ring-1 ring-hud-sage/35">
                  <p className="text-[14px] font-medium leading-relaxed text-forest">
                    Kalian impas, gak ada yang perlu transfer bulan ini âš–ï¸âœ¨
                  </p>
                </div>
              ) : settlement.level === 'close' ? (
                /* audit #6: di bawah ambang A7 modal cuma jadi rekap, TANPA
                   ajakan transfer supaya tidak bertabrakan dengan copy di atas */
                <div className="mt-4 rounded-[1.5rem] bg-hud-sage/15 px-4 py-3.5 text-center ring-1 ring-hud-sage/35">
                  <p className="text-[14px] font-medium leading-relaxed text-forest">
                    Hampir impas! Posisi bersih kalian beda cuma {moneyLabel(difference, masked)}, gak
                    perlu settle ðŸ’š
                  </p>
                </div>
              ) : (
                <div className="mt-4 rounded-[1.5rem] bg-hud-amber/15 px-4 py-3.5 ring-1 ring-hud-amber/35">
                  <p className="text-[14px] leading-relaxed text-forest">
                    Biar impas, <b className="font-medium">{whoOwes.name}</b> perlu transfer{' '}
                    <b className="font-semibold tabular-nums text-hud-terracotta">
                      {moneyLabel(settlementAmount, masked)}
                    </b>{' '}
                    ke <b className="font-medium">{whoIsOwed.name}</b>, satu transfer, langsung lunas.
                  </p>
                </div>
              )}

              {/* metode transfer: pilihannya dibawa ke penanda settle supaya baris
                  ledger-nya punya isi `method` (Stage 2 #5) */}
              {shouldPromptSettlement(settlement) && (
                <div className="mt-3 rounded-2xl bg-cream px-3.5 py-3 ring-1 ring-soil/12">
                  <p className="text-[12px] font-medium uppercase tracking-[0.14em] text-forest/45">
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

              {/* dompet PRIBADI (opsional) â€” kalau dipilih, uangnya benar-benar
                  pindah dan barisnya muncul di Riwayat. Tanpa dompet, yang
                  tersimpan hanya kesepakatan bulan ini. */}
              {shouldPromptSettlement(settlement) &&
                onCashWalletChange &&
                walletOptions.length > 0 && (
                  <div className="mt-3 rounded-2xl bg-cream px-3.5 py-3 ring-1 ring-soil/12">
                    <p className="text-[12px] font-medium uppercase tracking-[0.14em] text-forest/45">
                      Dompet untuk transfer (opsional)
                    </p>
                    <ChoicePills
                      className="mt-2"
                      options={[{ id: '', label: 'Tanpa dompet' }, ...walletOptions]}
                      value={cashWalletId}
                      onChange={onCashWalletChange}
                      ariaLabel="Dompet untuk transfer"
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
                    'mt-3 inline-flex h-12 w-full items-center justify-center gap-2 rounded-2xl text-[15px] font-medium transition-colors',
                    inputLocked
                      ? 'cursor-not-allowed bg-ink/[0.07] text-forest/35'
                      : 'bg-forest text-mint shadow-[0_16px_32px_-20px_rgba(0,0,0,0.95)] hover:bg-forest-soft active:scale-[0.99]',
                  )}
                >
                  Tandai Sudah Settle
                  <Check className="size-4" strokeWidth={3} />
                </button>
              )}
              {inputLocked && <SubscriptionLockNote />}

              {/* bulan ini sudah ditandai settle â†’ satu-satunya aksi yang masuk
                  akal adalah membatalkannya (dan uangnya ikut kembali) */}
              {settled && onUndoSettle && (
                <button
                  type="button"
                  onClick={() => {
                    onUndoSettle()
                    onClose()
                  }}
                  className="mt-3 inline-flex h-11 w-full items-center justify-center rounded-2xl bg-cream text-[14px] font-medium text-forest/70 ring-1 ring-soil/12 transition-colors hover:bg-sage/60 hover:text-forest"
                >
                  Batalkan settle bulan ini
                </button>
              )}

              <button
                type="button"
                onClick={onClose}
                className="mt-2 inline-flex h-11 w-full items-center justify-center rounded-2xl bg-transparent text-[14px] font-medium text-forest/55 transition-colors hover:bg-soil/[0.1]"
              >
                Nanti aja
              </button>

              <p className="mt-3 text-center text-[12px] leading-relaxed text-forest/40">
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
      <span className="min-w-0 truncate text-[14px] text-forest/55">{label}</span>
      <span
        className={cn(
          'shrink-0 tabular-nums',
          strong ? 'text-[16px] font-medium text-forest' : 'text-[14px] font-medium text-forest',
        )}
      >
        {value}
      </span>
    </p>
  )
}
