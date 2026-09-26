'use client'

import { useEffect, useState } from 'react'
import { CalendarDays, Lock } from 'lucide-react'
import { BudgetSheet } from './budget-sheet'
import {
  TransactionInputEngine,
  type TransactionTypeId,
} from '@/components/dashboard/transaction-input-engine'
import { longDateLabel, shortDateLabel } from '@/lib/data/calendar'

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
   ────────────────────────────────────────────────────────────────────────── */

export interface CalendarNoteInput {
  amount: number
  note: string
  type: TransactionTypeId
  /** tanggal catatan — default: tanggal terpilih di kalender */
  date: string
}

export function AddCalendarNoteSheet({
  open,
  onClose,
  date,
  onSave,
}: {
  open: boolean
  onClose: () => void
  /** tanggal terpilih di Macro Heatmap (`YYYY-MM-DD`) */
  date: string
  onSave: (input: CalendarNoteInput) => void
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
          <span className="flex items-center gap-2 text-[12.5px] font-semibold text-ink">
            <CalendarDays className="size-4 shrink-0 text-forest" strokeWidth={2.3} />
            Tanggal catatan
          </span>

          {unlocked ? (
            <input
              type="date"
              value={dateValue}
              onChange={(event) => setDateValue(event.target.value)}
              aria-label="Tanggal catatan"
              className="rounded-xl bg-ink/[0.04] px-2.5 py-1.5 text-[12.5px] font-semibold tabular-nums text-ink outline-none ring-1 ring-transparent transition-all focus:bg-cream focus:ring-forest/25"
            />
          ) : (
            <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-sage px-2.5 py-1 text-[11.5px] font-semibold text-forest">
              <Lock className="size-3 shrink-0" strokeWidth={2.8} />
              {shortDateLabel(dateValue)}
            </span>
          )}
        </div>

        <p className="mt-1.5 text-[11px] leading-relaxed text-ink/45">
          {unlocked
            ? 'Tanggal dibuka — pastikan sudah benar sebelum mencatat.'
            : 'Tanggal terkunci dari kalender, jadi kamu bisa langsung mencatat tanpa memilih tanggal lagi.'}
        </p>

        {!unlocked && (
          <button
            type="button"
            onClick={() => setUnlocked(true)}
            className="mt-1.5 text-[11.5px] font-semibold text-forest underline decoration-dotted underline-offset-4 transition-colors hover:text-forest-soft"
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
          onSubmitted={(payload) => {
            onSave({
              amount: payload.amount,
              note: payload.note,
              type: payload.type,
              date: dateValue,
            })
            onClose()
          }}
        />
      </div>
    </BudgetSheet>
  )
}
