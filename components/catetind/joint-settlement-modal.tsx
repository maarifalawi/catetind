'use client'

import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Check, X } from 'lucide-react'
import { useBodyScrollLock } from '@/hooks/use-body-scroll-lock'
import {
  DEFAULT_SETTLEMENT_METHOD,
  JOINT_SETTLE_ALL_LABEL,
  JOINT_SETTLE_REMAINDER_LABEL,
  JOINT_SETTLE_REMAINDER_TOAST,
  SETTLEMENT_METHODS,
  SETTLED_TOAST,
  jointDateLabel,
  moneyLabel,
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

/* ── Settlement Modal (Section 7) ────────────────────────────────────────────
   SATU layar, SATU angka: berapa yang perlu ditransfer, ke siapa, lewat mana.
   Versi sebelumnya menumpuk delapan baris penjelasan (dua blok rekap, jargon
   "posisi bersih", "yang ditimbang/traktiran", dan paragraf disclaimer) —
   user harus membaca semuanya untuk menemukan satu angka yang ia cari.

   Yang DIPERTAHANKAN hanya yang dibutuhkan untuk bertindak:
     • nominal transfer (satu transfer penuh menyelesaikan bulan itu),
     • arah transfer (siapa → siapa),
     • metode (BCA/GoPay/Cash) — pilihannya ikut tersimpan di penanda settle,
     • satu baris kecil bahwa uangnya dipindah manual.

   Mobile: bottom sheet. Desktop: dialog tengah (translate dipakai sebagai
   properti terpisah supaya tidak bentrok dengan animasi y Framer Motion).
   ────────────────────────────────────────────────────────────────────────── */

const EASE: [number, number, number, number] = [0.22, 1, 0.36, 1]

export function JointSettlementModal({
  open,
  onClose,
  settlement,
  masked,
  onSettle,
  carryOverRecord = null,
  settledRecord = null,
  today,
  people,
  monthLabel,
  onUndoSettle,
  memberAccess = false,
}: {
  open: boolean
  onClose: () => void
  settlement: SettlementState
  masked: boolean
  /**
   * user menekan "Tandai Sudah Settle" — halaman menulis penanda bulan.
   *
   * TIDAK ada pilihan dompet pribadi di sini (permintaan pemilik produk,
   * 11 Nov 2026): kantong bersama murni buku besar, jadi settle hanya mencatat
   * KESEPAKATAN dan tidak menggeser saldo dompet mana pun. Kalau uangnya
   * benar-benar dipindah, user mencatatnya sendiri di dompetnya (atau lewat
   * alur Pindah Dana) — bukan diam-diam dari layar patungan.
   */
  onSettle: (method: SettlementMethod) => void
  /** penanda bulan lalu yang masih menyisakan utang (null = tidak ada sisa) */
  carryOverRecord?: JointSettlementRecord | null
  /** penanda bulan ini (null = belum settle) — sumber tanggal & metode settle */
  settledRecord?: JointSettlementRecord | null
  /** tanggal perangkat (`YYYY-MM-DD`) untuk label "Hari ini" */
  today?: string
  /** seluruh anggota kantong (2 orang atau lebih), pemilik sesi di urutan pertama */
  people: JointPerson[]
  /** label bulan yang sedang dilihat ("November 2026") */
  monthLabel: string
  /**
   * Batalkan settle bulan ini. Mencabut penanda bulan DAN baris kasnya (uangnya
   * dikembalikan lewat satu baris koreksi), jadi salah tekan tidak mengunci
   * sebulan angka.
   */
  onUndoSettle?: () => void
  /**
   * true = pemanggil adalah ANGGOTA AKTIF dompet bersama. Anggota yang diundang
   * (termasuk akun gratis) tidak boleh terkena kunci input paket: aturan
   * produknya cukup PEMBUAT dompet yang berlangganan.
   */
  memberAccess?: boolean
}) {
  useBodyScrollLock(open, true)
  /* Pemilik sesi selalu di urutan pertama (`jointMemberList`). Blok metode &
     CTA hanya butuh "ada berapa orang", bukan angka yang dihitung ulang. */
  const multi = people.length > 2
  /* menandai bulan "sudah settle" mengubah status data bersama → ikut terkunci
     saat masa aktif habis (task 23). Rekap & instruksi transfernya tetap terbaca.
     ANGGOTA AKTIF dikecualikan: mereka tidak perlu langganan sendiri. */
  const { inputLocked: planInputLocked } = useSubscriptionGate()
  const inputLocked = planInputLocked && !memberAccess
  /* metode transfer yang dipilih user — ikut tersimpan di penanda settle */
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

  /* metode yang sudah tercatat dipakai lagi saat modal dibuka untuk bulan yang
     sudah settle — supaya barisnya tidak "berubah metode" di mata user */
  useEffect(() => {
    if (!open || !settledRecord) return
    setMethod(settledRecord.method)
  }, [open, settledRecord])

  const { whoOwes, whoIsOwed, settlementAmount, difference, settled } = settlement
  /**
   * Tampilan "Sudah settle" hanya untuk bulan yang BENAR-BENAR impas. Kalau ada
   * catatan baru setelah settle, `level` kembali 'settle' dan modal harus
   * menawarkan pelunasan SISANYA (bukan mengklaim selesai).
   */
  const settledOnly = settled && settlement.level !== 'settle'

  /** `Hari ini · 21:05 · BCA` — dari penanda yang benar-benar tersimpan */
  const settledMoment = settledRecord?.settledAt
    ? [jointDateLabel(settledRecord.settledAt, today), settledRecord.settledTime, settledRecord.method]
        .filter(Boolean)
        .join(' · ')
    : settledRecord?.method

  function handleSettle() {
    if (inputLocked) return
    try {
      if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
        navigator.vibrate([30, 50, 30])
      }
    } catch {
      /* haptic itu bonus — jangan sampai memblokir aksi utama */
    }
    toast.success(settled ? JOINT_SETTLE_REMAINDER_TOAST : SETTLED_TOAST)
    /* metode transfer ikut dikirim: halaman yang menulis penanda bulan, bukan
       modal ini. Tidak ada dompet pribadi yang ikut — settle hanya kesepakatan. */
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
              aria-label={`Rekap settlement ${monthLabel}`}
              initial={{ y: 64, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 64, opacity: 0 }}
              transition={{ duration: 0.34, ease: EASE }}
              className="max-h-[92dvh] w-full max-w-md overflow-y-auto rounded-t-[2rem] bg-cream px-5 pb-7 pt-4 shadow-[0_-24px_60px_-24px_rgba(0,0,0,0.55)] sm:rounded-[2rem] sm:px-6 sm:shadow-[0_28px_70px_-24px_rgba(0,0,0,0.5)]"
              data-lenis-prevent
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-forest-muted">
                    Rekap
                  </p>
                  <h2 className="mt-0.5 font-display text-lg font-semibold tracking-tight text-forest">
                    {monthLabel}
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

              {/* ── SATU ANGKA: berapa & ke siapa ───────────────────────────
                  Semua blok rekap versi lama (total catatan, net per orang,
                  "yang ditimbang/traktiran", jargon panci) DIHAPUS. Yang
                  tersisa: nominal transfer, arah, dan (untuk grup) daftar
                  transfernya — angka yang benar-benar dipakai user. */}
              {settledOnly ? (
                <div className="mt-7 text-center">
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-hud-sage/20 px-3 py-1 text-[11.5px] font-medium text-forest ring-1 ring-hud-sage/35">
                    <Check className="size-3.5" strokeWidth={3} aria-hidden /> Sudah settle
                  </span>
                  {/* Nominal sengaja TIDAK diulang di sini: angka besar di modal
                      adalah "yang perlu ditransfer", dan setelah settle bisa ada
                      lebih dari satu transfer (settle awal + sisa). Detailnya
                      sudah ada di Cerita Kita, satu baris per transfer. */}
                  {settledMoment && (
                    <p className="mt-3 text-[12.5px] text-forest-muted">{settledMoment}</p>
                  )}
                  {settledRecord?.pendingSync && (
                    <p className="mt-1 text-[11.5px] text-forest-muted">
                      Belum tersinkron ke pasangan.
                    </p>
                  )}
                </div>
              ) : settlement.level === 'equal' || settlement.level === 'close' ? (
                <div className="mt-7 text-center">
                  <p className="font-display text-[22px] font-semibold tracking-tight text-forest">
                    {settlement.level === 'equal' ? 'Impas' : 'Hampir impas'}
                  </p>
                  <p className="mt-1 text-[13px] text-forest-muted">
                    {settlement.level === 'equal'
                      ? 'Gak ada yang perlu transfer bulan ini.'
                      : `Beda cuma ${moneyLabel(difference, masked)}.`}
                  </p>
                </div>
              ) : multi ? (
                <ul className="mt-6 space-y-2">
                  {settlement.transfers.map((row) => (
                    <li
                      key={`${row.from.id}-${row.to.id}`}
                      className="flex items-center gap-2 rounded-2xl bg-sage/45 px-3.5 py-2.5 text-[13.5px] text-forest"
                    >
                      <span className="font-medium">{row.from.name}</span>
                      <span aria-hidden className="text-forest-muted">
                        →
                      </span>
                      <span className="font-medium">{row.to.name}</span>
                      <span className="ml-auto shrink-0 font-semibold tabular-nums text-hud-terracotta">
                        {moneyLabel(row.amount, masked)}
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="mt-7 text-center">
                  <p className="font-display text-[34px] font-semibold leading-none tracking-tight text-forest tabular-nums">
                    {moneyLabel(settlementAmount, masked)}
                  </p>
                  <p className="mt-2.5 flex items-center justify-center gap-1.5 text-[13px] font-medium text-forest">
                    <span>{whoOwes.name}</span>
                    <span aria-hidden className="text-forest-muted">
                      →
                    </span>
                    <span>{whoIsOwed.name}</span>
                  </p>
                </div>
              )}

              {/* ringkasan bayar: SATU baris angka, tanpa judul blok */}
              {!settled && settlement.level === 'settle' && settlement.totalSpent > 0 && (
                <p className="mt-4 text-center text-[11.5px] leading-relaxed text-forest-muted tabular-nums">
                  {settlement.members
                    .map((row) => `${row.person.name} ${moneyLabel(row.paid, masked)}`)
                    .join(' · ')}
                </p>
              )}

              {carryOverRecord && !settledOnly && (
                <p className="mt-3 rounded-2xl bg-cream px-3 py-2 text-center text-[11.5px] leading-relaxed text-forest-soft ring-1 ring-soil/10">
                  {settlementCarryCopy(carryOverRecord, masked)}
                </p>
              )}

              {/* metode transfer: pilihannya dibawa ke penanda settle */}
              {shouldPromptSettlement(settlement) && (
                <ChoicePills
                  className="mt-5 justify-center"
                  options={SETTLEMENT_METHODS.map((item) => ({ id: item, label: item }))}
                  value={method}
                  onChange={setMethod}
                  ariaLabel="Metode transfer"
                />
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
                      ? 'cursor-not-allowed bg-ink/[0.07] text-forest-muted'
                      : 'bg-forest text-mint shadow-[0_16px_32px_-20px_rgba(0,0,0,0.95)] hover:bg-forest-soft active:scale-[0.99]',
                  )}
                >
                  {multi
                    ? JOINT_SETTLE_ALL_LABEL
                    : settled
                      ? JOINT_SETTLE_REMAINDER_LABEL
                      : 'Tandai Sudah Settle'}
                  <Check className="size-4" strokeWidth={3} />
                </button>
              )}
              {inputLocked && <SubscriptionLockNote />}

              {/* bulan ini sudah ditandai settle → satu-satunya aksi yang masuk
                  akal adalah membatalkannya (dan uangnya ikut kembali) */}
              {settledOnly && onUndoSettle && (
                <button
                  type="button"
                  onClick={() => {
                    onUndoSettle()
                    onClose()
                  }}
                  className="mt-3 inline-flex h-11 w-full items-center justify-center rounded-2xl bg-cream text-[14px] font-medium text-forest-soft ring-1 ring-soil/12 transition-colors hover:bg-sage/60 hover:text-forest"
                >
                  Batalkan settle
                </button>
              )}

              <button
                type="button"
                onClick={onClose}
                className="mt-2 inline-flex h-11 w-full items-center justify-center rounded-2xl bg-transparent text-[14px] font-medium text-forest-muted transition-colors hover:bg-soil/[0.1]"
              >
                Nanti aja
              </button>
            </motion.div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
