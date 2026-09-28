'use client'

import { useMemo } from 'react'
import { TransferSheet } from './transfer-sheet'
import { usePrivacy } from './privacy-provider'
import { useTransferSubmit } from '@/hooks/use-transfer-submit'
import { useMoneyStore, walletAccounts } from '@/lib/money/store'
import type { WalletAccount } from '@/lib/wallets'

/* ── TransferFlow — SATU host untuk sheet Pindah Dana (paket 55) ──────────────
   Yang dipisah di sini adalah “alur” dari “pintunya”. Komponen ini memegang
   tiga hal yang tidak boleh berbeda antar pintu:

     1. daftar dompet — dibaca dari store yang sama dengan halaman Dompet
        (`walletAccounts`), jadi dompet yang baru ditambahkan user langsung bisa
        jadi tujuan tanpa daftar kedua;
     2. penulisan — lewat `useTransferSubmit()` (satu jalur ke `postTransfer`);
     3. penutupan sheet — HANYA kalau tulisannya benar-benar terjadi, supaya
        penolakan (mis. saldo asal berubah) tidak terasa seperti sukses.

   Pintu-pintunya sendiri tetap milik masing-masing halaman, karena tombolnya
   harus bergaya seperti tetangganya: popover kartu dompet (/wallet), tombol
   “Pindah Dana” di /wallet/[id], entri menu “Lainnya”, dan sidebar desktop.

   `source` = dompet asal yang sudah diketahui pintu itu. `null` (pintu menu
   “Lainnya”) berarti user memilih asalnya sendiri di langkah pertama sheet —
   bukan tebakan dompet konteks aktif, karena dompet tujuan WAJIB benar dan
   asal yang salah tebak membuat nominal mendarat di tempat yang keliru.
   ────────────────────────────────────────────────────────────────────────── */

export function TransferFlow({
  open,
  onOpenChange,
  source = null,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** dompet asal yang sudah diketahui pintu masuknya */
  source?: WalletAccount | null
}) {
  const snapshot = useMoneyStore()
  const { masked } = usePrivacy()
  const submit = useTransferSubmit(masked)
  const wallets = useMemo(() => walletAccounts(snapshot), [snapshot])

  return (
    <TransferSheet
      wallets={wallets}
      source={source}
      open={open}
      onClose={() => onOpenChange(false)}
      onTransfer={(fromWalletId, toWalletId, amount, note) => {
        if (submit(fromWalletId, toWalletId, amount, note)) onOpenChange(false)
      }}
    />
  )
}
