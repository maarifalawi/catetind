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
  onSkip,
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
  /**
   * Lewati langkah ini → langsung selesai onboarding.
   *
   * Kenapa harus ada: tidak semua orang yang baru daftar sudah punya
   * pengeluaran untuk dicatat (mis. baru bikin akun, uangnya masih di rekening
   * orang tua, atau memang sedang tidak ada transaksi hari ini). Memaksa satu
   * catatan karangan demi lolos setup = data palsu di akun user sejak menit
   * pertama — dan Dashboard yang menganggapnya nyata.
   */
  onSkip: () => void
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
        badge="Bisa dilewati"
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
                  : 'text-forest-muted hover:text-forest-soft',
              )}
            >
              <Icon className="size-[17px]" strokeWidth={2} />
              <span className="text-[12px] font-medium tracking-[-0.01em] whitespace-nowrap">
                {item.label}
              </span>
            </button>
          )
        })}
      </div>

      {/* ── nominal raksasa (center) ─────────────────────────────────────
          Prefix "Rp" dirender terpisah + spacer kembar di kanan supaya angka
          benar-benar center. Placeholder "0" tampil utuh saat kosong (Rp dari
          prefix + 0 dari placeholder) — sengaja TIDAK kosong supaya user punya
          jangkar angka. Cangkang garis putus-putus menandai bahwa ini TEMPAT
          MENGISI, bukan angka yang sudah terisi (keluhan "placeholder terbaca
          seperti teks biasa"). */}
      <div className="mt-7 flex w-full items-baseline justify-center gap-1.5 rounded-2xl border-2 border-dashed border-oat px-3 py-2 transition-colors focus-within:border-mint">
        <span
          aria-hidden
          className="w-7 shrink-0 text-right text-lg font-medium text-forest-muted"
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
            'min-w-0 flex-1 bg-transparent text-center font-medium leading-none tracking-[-0.04em] text-forest tabular-nums outline-none',
            display.length <= 7 ? 'text-[2.7rem]' : 'text-[2.15rem]',
          )}
        />
        <span aria-hidden className="w-7 shrink-0" />
      </div>

      {/* ── catatan (opsional) ─────────────────────────────────────────── */}
      <label className="mt-8 block" htmlFor="onboarding-first-note">
        {/* Label kecil di atas field: placeholder saja tidak cukup untuk
            membedakan "tempat menulis" dari tulisan yang sudah terisi. */}
        <span className="text-[12px] font-medium tracking-[0.16em] text-forest-muted uppercase">
          Keterangan (opsional)
        </span>
        <input
          id="onboarding-first-note"
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
          /* Placeholder sengaja dibuat LEBIH LEMBUT dari teks yang diketik
             (miring + warna pudar + bobot normal) supaya tidak terbaca sebagai
             isian jadi — ia contoh, bukan keterangan transaksi. */
          className="mt-2 h-14 w-full rounded-[1.35rem] bg-cream px-4 text-[15px] font-medium tracking-[-0.01em] text-forest outline-none ring-1 ring-ink/[0.06] transition-all placeholder:font-normal placeholder:text-forest-muted/75 focus:ring-forest/25"
        />
      </label>

      {/* jalan keluar yang jujur: tidak semua orang punya transaksi hari ini */}
      <button
        type="button"
        onClick={onSkip}
        className="mx-auto mt-5 block rounded-full px-3 py-1.5 text-[14px] font-medium text-forest-muted transition-colors hover:bg-ink/[0.04] hover:text-forest"
      >
        Lewati dulu, catat nanti
      </button>
    </div>
  )
}
