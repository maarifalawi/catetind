'use client'

import { useRef, useState } from 'react'
import { Check, ChevronDown, Wallet } from 'lucide-react'
import { cn } from '@/lib/utils'
import { TRANSACTION_INPUT_COPY, maskMoney } from '@/lib/data/history'
import {
  PICKER_LIST_GUTTER,
  PICKER_OPTION_ACTIVE,
  PICKER_OPTION_IDLE,
  PickerSheet,
} from './picker-sheet'

/* --- WalletPicker - pemilih "Sumber Dompet" (paket 69) ---------------------
   Dropdown kustom (bottom sheet di mobile, panel di desktop) yang isinya dompet
   NYATA dari ledger + saldonya - jadi user melihat uangnya keluar dari dompet
   mana, bukan menebak-nebak. Bukan <select> native, dan saldonya ikut tombol
   mata privasi global lewat prop `masked`.

   PAKET 78 - DUA PERBAIKAN DI SINI (keduanya keluhan pemilik produk):
   1. STROKE OPSI PERTAMA TERPOTONG. Sebabnya bukan di file ini, tapi di cangkang
      gulirnya (`picker-sheet.tsx`): area gulir tidak punya jarak atas, sedangkan
      `ring` digambar DI LUAR kotak elemen → tepi atas stroke opsi pertama
      terklip. Obatnya `PICKER_LIST_GUTTER` di bawah (4px ruang di dalam area
      gulir, horizontal dikompensasi margin negatif jadi posisi opsi tidak
      bergeser satu piksel pun) + `pt-1` pada badan gulir sheet. Berlaku untuk
      dua-opsi maupun satu-opsi, di 375px maupun desktop.
   2. STATUS TERPILIH TERLALU KERAS. Dulu opsi aktif `ring-2 ring-forest` — garis
      2px hijau tua mengelilingi kotak, bertabrakan dengan nada lembut sheet ini.
      Sekarang memakai bahasa "terpilih" bersama `PICKER_OPTION_ACTIVE`
      (`bg-mint/30` + `ring-1 ring-leaf/45` + bayangan halus) yang tinggal di
      cangkang pemilih supaya pemilih lain tidak menemukan bahasa kedua.

   Yang TIDAK berubah: `aria-pressed`, `aria-label` per opsi (nama dompet), baris
   saldo lewat `maskMoney(balance, masked)` (privasi!), dan empty state. */

export interface WalletPickerOption {
  /** id dompet di ledger - dipakai sebagai React key */
  id: string
  /** nama dompet yang TERSIMPAN di baris transaksi */
  label: string
  balance: number
  /**
   * Baris kecil PENGGANTI "Saldo …" (paket 81).
   *
   * Dipakai untuk dompet yang TIDAK ada di ledger hidup — nama dompet data lama
   * yang dibuka di sheet Edit, atau dompet yang baru dihapus user. Menuliskan
   * "Saldo Rp 0" untuk keadaan itu adalah angka yang tidak diketahui, jadi
   * pemilihnya mengatakan keadaan yang benar-benar bisa dipastikan
   * (`TRANSACTION_INPUT_COPY.walletNotOwned`).
   */
  hint?: string
}

const TRIGGER_CLASS =
  'flex w-full items-center justify-between gap-2 rounded-xl bg-soil/[0.09] px-3 py-2.5 text-left text-[12.5px] font-medium text-forest outline-none ring-1 ring-transparent transition-all hover:bg-soil/[0.12] focus-visible:bg-cream focus-visible:ring-forest/15'

export function WalletPicker({
  value,
  options,
  onChange,
  masked = false,
  invalid = false,
  describedBy,
}: {
  value: string
  options: WalletPickerOption[]
  onChange: (name: string) => void
  /** tombol mata global aktif -> saldo disensor */
  masked?: boolean
  invalid?: boolean
  describedBy?: string
}) {
  const [open, setOpen] = useState(false)
  const selected = options.find((option) => option.label === value) ?? null
  /**
   * Nilai yang sedang terpakai tapi TIDAK ada di daftar opsi (paket 81).
   *
   * Pemanggil yang benar selalu menyertakan nilai itu sebagai opsi, tapi kalau
   * suatu saat tidak: menampilkan "Pilih dompet…" padahal dompetnya sudah
   * terisi adalah kebohongan kecil yang bikin user mengira catatannya tak
   * punya dompet. Nama apa adanya lebih jujur.
   */
  const unresolved = selected ? '' : value.trim()
  /* tombol pemicu — dikirim ke `PickerSheet` supaya host overlay dicari dari
     ancestor TOMBOL INI (`closest`), bukan dari dialog pertama di dokumen
     (lihat catatan "PAKET 70" di picker-sheet.tsx). */
  const triggerRef = useRef<HTMLButtonElement>(null)

  function choose(name: string) {
    onChange(name)
    setOpen(false)
  }

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen(true)}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label={TRANSACTION_INPUT_COPY.walletOpenLabel}
        aria-describedby={describedBy}
        aria-invalid={invalid || undefined}
        className={cn(TRIGGER_CLASS, invalid && 'bg-cream ring-hud-amber/45')}
      >
        <span className="flex min-w-0 items-center gap-2">
          {selected ? (
            <>
              <span className="truncate">{selected.label}</span>
              <span className="shrink-0 text-[11.5px] text-forest/45">
                {selected.hint ?? maskMoney(selected.balance, masked)}
              </span>
            </>
          ) : unresolved ? (
            /* nilai terpakai yang tidak ada di opsi: nama apa adanya, tanpa angka
               saldo yang tidak kita ketahui (paket 81) */
            <span className="truncate">{unresolved}</span>
          ) : (
            <span className="truncate text-forest/40">
              {TRANSACTION_INPUT_COPY.walletPlaceholder}
            </span>
          )}
        </span>
        <ChevronDown className="size-4 shrink-0 text-forest/40" aria-hidden />
      </button>

      <PickerSheet
        open={open}
        anchor={triggerRef}
        onClose={() => setOpen(false)}
        title={TRANSACTION_INPUT_COPY.walletSheetTitle}
        closeLabel={TRANSACTION_INPUT_COPY.walletCloseLabel}
      >
        {options.length === 0 ? (
          <div className="mt-6 flex flex-col items-center px-6 text-center">
            <span className="flex size-12 items-center justify-center rounded-full bg-sage text-forest">
              <Wallet className="size-5" strokeWidth={1.8} aria-hidden />
            </span>
            <p className="mt-3 text-[13px] font-medium text-forest">
              {TRANSACTION_INPUT_COPY.walletEmptyTitle}
            </p>
            <p className="mt-1 text-[11.5px] leading-relaxed text-forest/50">
              {TRANSACTION_INPUT_COPY.walletEmptyBody}
            </p>
          </div>
        ) : (
          /* gutter daftar opsi (paket 78): `-mx-1 px-1 pt-1` — ruang 4px untuk
             stroke opsi pertama tanpa menggeser satu pun elemen */
          <ul className={cn('flex flex-col gap-1.5', PICKER_LIST_GUTTER)}>
            {options.map((option) => {
              const active = option.label === value
              return (
                <li key={option.id}>
                  <button
                    type="button"
                    onClick={() => choose(option.label)}
                    aria-label={option.label}
                    aria-pressed={active}
                    className={cn(
                      'flex w-full items-center gap-3 rounded-2xl px-3.5 py-3 text-left transition-[background,box-shadow] duration-200',
                      /* IDLE & ACTIVE masing-masing membawa `ring-1`-nya sendiri —
                         jangan digabung, kelas yang bertabrakan diselesaikan
                         urutan CSS Tailwind (lihat catatan di picker-sheet.tsx) */
                      active ? PICKER_OPTION_ACTIVE : PICKER_OPTION_IDLE,
                    )}
                  >
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[13px] font-medium text-forest">
                        {option.label}
                      </span>
                      <span className="mt-0.5 block text-[11px] text-forest/45">
                        {option.hint ??
                          TRANSACTION_INPUT_COPY.walletBalance(maskMoney(option.balance, masked))}
                      </span>
                    </span>
                    {active && (
                      <Check className="size-4 shrink-0 text-forest" strokeWidth={2.6} aria-hidden />
                    )}
                  </button>
                </li>
              )
            })}
          </ul>
        )}
      </PickerSheet>
    </>
  )
}