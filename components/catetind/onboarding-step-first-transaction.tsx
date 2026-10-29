'use client'

import { useEffect, useRef, type KeyboardEvent } from 'react'
import {
  PiggyBank,
  TrendingDown,
  TrendingUp,
  type LucideIcon,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { digitsToDisplay, onlyDigits } from '@/lib/onboarding'
import { OnboardingStepHeader } from './onboarding-ui'
import { OnboardingPlantCeremony } from './onboarding-plant-ceremony'
import type { TransactionTypeId } from '@/components/dashboard/transaction-input-engine'

/**
 * Step 3 — "Catat Transaksi Pertamamu!" (mini input + upacara tanaman).
 *
 * Versi RINGKAS dari Transaction Input Engine, di-embed inline (bukan Vaul
 * bottom sheet) karena alurnya sudah full-screen: tipe, nominal, catatan, lalu
 * satu tombol di CTA bawah. Setelah tersimpan, form diganti Upacara Tanaman (4C).
 *
 * Redesign: pemilih tipe jadi SEGMENTED CONTROL satu baris (ikon + label kecil)
 * dengan satu warna aktif (forest) — warna status per tipe (plum/cantelope/
 * olive) sengaja tidak dipakai di sini supaya layar onboarding tetap tenang.
 */

/**
 * Tipe transaksi pertama — id, urutan, ikon, dan label sama dengan engine.
 *
 * PAKET 54: field `suggested` DIHAPUS dari sini bersama baris "· tebakan AI"
 * di bawah nominal. Dua alasan:
 *   1. kategorinya memang TIDAK PERNAH disimpan — `OnboardingResult.firstTransaction`
 *      cuma membawa tipe, nominal, dan deskripsi, jadi label itu mengaku-ngaku
 *      sesuatu yang tidak ada di data user (bukan sekadar tebakan: karangan);
 *   2. tebakan kategori di jalur manual sudah dicabut dari engine, dan form ini
 *      adalah versi ringkas dari engine yang sama — perilakunya tidak boleh
 *      berbeda cerita.
 * Kategori catatan pertama bisa dipilih user kapan saja lewat mode edit di
 * Riwayat (`EDIT_TRANSACTION_COPY`) setelah catatannya benar-benar tercatat.
 *
 * PAKET 55: chip `Transfer` juga DIHAPUS dari sini, sejalan dengan engine (satu
 * alur, satu sumber tipe). Pindah dana butuh dompet tujuan; form tiga ketukan
 * ini tidak punya tempat untuk menanyakannya, jadi menawarkannya di sini cuma
 * membuat user memilih aksi yang tidak bisa diselesaikan (dan saldo dompetnya
 * akan berbeda dari cerita di onboarding).
 */
const TX_TYPES: {
  id: TransactionTypeId
  label: string
  icon: LucideIcon
}[] = [
  { id: 'expense', label: 'Keluar', icon: TrendingDown },
  { id: 'income', label: 'Masuk', icon: TrendingUp },
  { id: 'saving', label: 'Tabungan', icon: PiggyBank },
]

export function OnboardingStepFirstTransaction({
  type,
  onTypeChange,
  amountDigits,
  onAmountChange,
  note,
  onNoteChange,
  onSubmit,
  done,
  onReminderChange,
}: {
  type: TransactionTypeId
  onTypeChange: (type: TransactionTypeId) => void
  amountDigits: string
  onAmountChange: (digits: string) => void
  note: string
  onNoteChange: (value: string) => void
  /** Enter / "done" di keyboard numerik = simpan */
  onSubmit: () => void
  /** true setelah transaksi pertama tersimpan → form diganti upacara tanaman */
  done: boolean
  /** naik ke flow supaya pilihan izin notifikasi ikut tersimpan */
  onReminderChange: (enabled: boolean) => void
}) {
  const amountRef = useRef<HTMLInputElement>(null)

  /* 5B — auto-focus nominal biar keyboard angka langsung muncul. Ditunda 220ms
     supaya tidak berebut dengan animasi slide step (200ms). */
  useEffect(() => {
    if (done) return
    const id = window.setTimeout(() => amountRef.current?.focus(), 220)
    return () => window.clearTimeout(id)
  }, [done])

  const display = digitsToDisplay(amountDigits)

  function handleAmountKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key !== 'Enter') return
    event.preventDefault()
    onSubmit()
  }

  /* Setelah transaksi tersimpan, seluruh step berganti jadi upacara tanaman */
  if (done) {
    return <OnboardingPlantCeremony onReminderChange={onReminderChange} />
  }

  return (
    <div>
      <OnboardingStepHeader
        title="Catat transaksi pertamamu"
        subtitle="Bisa yang tadi pagi, kemarin, atau kapan aja. Cukup beberapa ketuk."
      />

      {/* ── pemilih tipe (segmented, satu warna aktif) ─────────────────── */}
      <div
        role="radiogroup"
        aria-label="Tipe transaksi"
        className="mt-8 flex rounded-[1.15rem] bg-ink/[0.05] p-1"
      >
        {TX_TYPES.map((item) => {
          const active = item.id === type
          const Icon = item.icon
          return (
            <button
              key={item.id}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => onTypeChange(item.id)}
              className={cn(
                'flex flex-1 flex-col items-center gap-1 rounded-[0.9rem] py-2 transition-all duration-200',
                active
                  ? 'bg-cream text-forest shadow-[0_1px_3px_rgba(0,0,0,0.12)]'
                  : 'text-forest/45 hover:text-forest/70',
              )}
            >
              <Icon className="size-[17px]" strokeWidth={2} />
              <span className="text-[11px] font-medium tracking-[-0.01em] whitespace-nowrap">
                {item.label}
              </span>
            </button>
          )
        })}
      </div>

      {/* ── nominal raksasa (center) ───────────────────────────────────── */}
      <div className="mt-7 flex w-full items-baseline justify-center gap-1.5">
        <span
          aria-hidden
          className="w-7 shrink-0 text-right text-lg font-medium text-forest/25"
        >
          Rp
        </span>
        <input
          ref={amountRef}
          value={display}
          onChange={(event) => onAmountChange(onlyDigits(event.target.value))}
          onKeyDown={handleAmountKeyDown}
          inputMode="numeric"
          pattern="[0-9]*"
          autoComplete="off"
          enterKeyHint="done"
          placeholder="0"
          aria-label="Nominal transaksi pertama"
          className={cn(
            'min-w-0 flex-1 bg-transparent text-center font-medium leading-none tracking-[-0.04em] text-forest tabular-nums outline-none placeholder:text-forest/[0.14]',
            display.length <= 7 ? 'text-[2.7rem]' : 'text-[2.15rem]',
          )}
        />
        <span aria-hidden className="w-7 shrink-0" />
      </div>

      {/* ── catatan (opsional) ─────────────────────────────────────────── */}
      <input
        value={note}
        onChange={(event) => onNoteChange(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === 'Enter') {
            event.preventDefault()
            onSubmit()
          }
        }}
        placeholder="Contoh: Kopi Kenangan pagi tadi"
        aria-label="Catatan transaksi (opsional)"
        className="mt-8 h-14 w-full rounded-[1.35rem] bg-cream px-4 text-[14px] font-medium tracking-[-0.01em] text-forest outline-none ring-1 ring-ink/[0.06] transition-all placeholder:text-forest/30 focus:ring-forest/25"
      />
    </div>
  )
}
