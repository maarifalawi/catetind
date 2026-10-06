'use client'

import { useEffect, useState } from 'react'
import { CalendarDays, Lock } from 'lucide-react'
import { BudgetSheet } from './budget-sheet'
import {
  TransactionInputEngine,
  type TransactionDraft,
} from '@/components/dashboard/transaction-input-engine'
import { CALENDAR_NOTE_TYPES, longDateLabel, shortDateLabel } from '@/lib/data/calendar'

/* ── Modal "Tambah Catatan di Tgl X" (2B Zero-Friction Backdating) ────────────
   Masalah yang diselesaikan: user men-tap tanggal 15 di kalender, lalu ditanya
   lagi "tanggal berapa?" — itu friksi yang bikin orang malas backdating.

   Solusinya: modal ini MEMBAWA tanggal terpilih dari kalender. Field tanggal
   langsung terisi dan TERKUNCI (chip 🔒), jadi alurnya cuma: ketik nominal →
   Catat → selesai. Kalau memang perlu, user boleh membukanya lewat "Ubah
   tanggal" — tapi jalur defaultnya nol langkah tambahan.

   Shell-nya memakai `BudgetSheet` (bottom sheet di mobile, dialog di desktop)
   dan isi formnya `TransactionInputEngine` — SATU sumber kebenaran form
   transaksi di seluruh app, bukan form baru yang perilakunya bisa menyimpang.

   PAKET 49 — sheet ini juga menetapkan DUA hal yang bukan urusan tampilan:

     • TIPE yang ditawarkan cuma pemasukan & pengeluaran (`CALENDAR_NOTE_TYPES`).
       "Pindah dana" tidak ada di sini selama alur pindah dana (dua sisi ledger)
       belum dibangun: catatan sepihak yang mengaku pindah dana akan membuat
       saldo dompet berbeda dari cerita yang dibaca user.
     • TOAST & TUTUP PANEL bukan milik sheet ini. Yang menulis catatannya adalah
       `useTransactionSubmit()` di halaman Kalender (satu pintu yang sama dengan
       FAB & modal web), dan hook itulah yang menutup panel lalu mengucapkan
       toast SETELAH tulisannya berhasil. Dulu sheet ini menutup dirinya sendiri
       dan halaman menembak "Catatan … tersimpan" untuk daftar yang cuma hidup di
       layar kalender.
   ────────────────────────────────────────────────────────────────────────── */

/**
 * Draft yang dikirim sheet: draft engine + tanggal yang dibawa kalender.
 *
 * `date` di sini WAJIB (di `TransactionDraft` ia opsional) karena panel ini
 * memang selalu mencatat di tanggal tertentu — itulah gunanya backdating.
 * `clientTxId` dari engine diteruskan apa adanya supaya double-tap tetap ditolak
 * store, dan `wallet` dibiarkan kosong: dompet diisi pemanggil lewat
 * `useTransactionSubmit(fallbackWallet)`, pola yang sama dengan dua shell input
 * lain (FAB & modal web) — jadi tidak ada dompet yang di-hardcode di halaman.
 */
export type CalendarNoteInput = TransactionDraft & {
  /** tanggal catatan `YYYY-MM-DD` */
  date: string
}

export function AddCalendarNoteSheet({
  open,
  onClose,
  date,
  walletName,
  onSubmit,
}: {
  open: boolean
  onClose: () => void
  /** tanggal terpilih di Macro Heatmap (`YYYY-MM-DD`) */
  date: string
  /** dompet tujuan catatan (dari konteks uang aktif) — ditampilkan apa adanya */
  walletName: string
  /**
   * Diteruskan ke `useTransactionSubmit()` pemanggil: TULIS → TUTUP → toast.
   * Sheet ini sengaja tidak menutup dirinya sendiri dan tidak menembak toast:
   * hanya penulisnya yang tahu tulisannya benar-benar terjadi (paket 49).
   */
  onSubmit: (input: CalendarNoteInput) => void
}) {
  const [unlocked, setUnlocked] = useState(false)
  const [dateValue, setDateValue] = useState(date)

  /* setiap kali dibuka: tanggal ikut tanggal terpilih, dan TERKUNCI lagi */
  useEffect(() => {
    if (!open) return
    setUnlocked(false)
    setDateValue(date)
  }, [open, date])

  return (
    <BudgetSheet
      open={open}
      onClose={onClose}
      title={`Catatan ${shortDateLabel(dateValue)}`}
      description={`Catat pengeluaran atau pemasukan di ${longDateLabel(dateValue)}.`}
    >
      {/* ── field tanggal: terisi otomatis & terkunci ────────────────────── */}
      <div className="rounded-2xl bg-cream px-4 py-3 ring-1 ring-soil/12">
        <div className="flex items-center justify-between gap-3">
          <span className="flex items-center gap-2 text-[12.5px] font-medium text-forest">
            <CalendarDays className="size-4 shrink-0 text-forest" strokeWidth={2.3} />
            Tanggal catatan
          </span>

          {unlocked ? (
            <input
              type="date"
              value={dateValue}
              onChange={(event) => setDateValue(event.target.value)}
              aria-label="Tanggal catatan"
              className="rounded-xl bg-ink/[0.04] px-2.5 py-1.5 text-[12.5px] font-medium tabular-nums text-forest outline-none ring-1 ring-transparent transition-all focus:bg-cream focus:ring-forest/25"
            />
          ) : (
            <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-sage px-2.5 py-1 text-[11.5px] font-medium text-forest">
              <Lock className="size-3 shrink-0" strokeWidth={2.8} />
              {shortDateLabel(dateValue)}
            </span>
          )}
        </div>

        <p className="mt-1.5 text-[11px] leading-relaxed text-forest/45">
          {unlocked
            ? 'Tanggal dibuka — pastikan sudah benar sebelum mencatat.'
            : 'Tanggal terkunci dari kalender, jadi kamu bisa langsung mencatat tanpa memilih tanggal lagi.'}
        </p>

        {!unlocked && (
          <button
            type="button"
            onClick={() => setUnlocked(true)}
            className="mt-1.5 text-[11.5px] font-medium text-forest underline decoration-dotted underline-offset-4 transition-colors hover:text-forest-soft"
          >
            Ubah tanggal
          </button>
        )}
      </div>

      {/* ── form transaksi (engine bersama) ──────────────────────────────── */}
      <div className="mt-4">
        <TransactionInputEngine
          active={open}
          layout="dialog"
          /* dompet tujuan DITAMPILKAN, bukan disimpan diam-diam: sheet ini tidak
             punya pemilih dompet (form tambah engine memang tanpa dompet), jadi
             user berhak tahu catatannya masuk ke dompet mana. Chip-nya memakai
             `sourceLabel` engine yang sama dengan halaman Joint Wallet. */
          sourceLabel={walletName}
          /* hanya pemasukan & pengeluaran — lihat CALENDAR_NOTE_TYPES */
          types={CALENDAR_NOTE_TYPES}
          onSubmitted={(payload) => {
            /* tanggal dari sheet (terkunci atau hasil "Ubah tanggal") digabung
               ke draft; engine sendiri tidak punya field tanggal di mode tambah */
            onSubmit({ ...payload, date: dateValue })
          }}
        />
      </div>
    </BudgetSheet>
  )
}
