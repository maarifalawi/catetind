'use client'

import { useCallback } from 'react'
import { toast } from 'sonner'
import { maskMoney } from '@/lib/data/history'
import { TRANSFER_SHEET_COPY } from '@/lib/data/add-wallet'
import { getMoneySnapshot, postTransfer, walletAccountOf, walletNameOfId } from '@/lib/money/store'

/* ── useTransferSubmit — SATU pintu tulis pindah dana (paket 55) ──────────────
   Semua pintu masuk “Pindah Dana” (popover kartu dompet, tombol di halaman
   dompet detail, entri menu “Lainnya”, sidebar desktop) menutup dengan fungsi
   ini. Alasannya sama dengan `useTransactionSubmit` (paket 33): kalau tiap pintu
   memanggil `postTransfer()` sendiri-sendiri, cepat atau lambat ada satu pintu
   yang lupa mengurus penolakan atau lupa menyensor nominal di toast — dan user
   membaca dua cerita berbeda untuk satu aksi yang sama.

   Tiga janji yang dipegang fungsi ini:
     1. MENULIS lewat `postTransfer()` — satu baris ledger dua sisi. Tidak ada
        jalur kedua yang bisa menulis baris `transfer` satu sisi.
     2. PENOLAKAN DIKATAKAN. `postTransfer` mengembalikan `null` kalau nominal
        tidak sah, dompetnya tidak ada, dompet asal = tujuan, atau saldo asal
        kurang. Yang paling mungkin terjadi di sini adalah yang terakhir (saldo
        berubah dari halaman lain setelah sheet dibuka), jadi kalimatnya memakai
        copy “sisa saldo” yang sama dengan sheet.
     3. TOAST MENYEBUT DUA DOMPET, nominalnya ikut tombol mata privasi global
        (§5.7). Status sensornya dioper pemanggil — `hooks/` tidak mengimpor
        provider dari `components/`.

   @returns true kalau barisnya benar-benar tertulis (sheet boleh ditutup).
*/
export function useTransferSubmit(masked = false) {
  return useCallback(
    (fromWalletId: string, toWalletId: string, amount: number, note = ''): boolean => {
      /* dibaca SEBELUM menulis: saldonya dipakai untuk kalimat penolakan */
      const before = getMoneySnapshot()
      const row = postTransfer({ fromWalletId, toWalletId, amount, note })

      if (!row) {
        const source = walletAccountOf(before, fromWalletId)
        toast.error(
          source && amount > source.balance
            ? TRANSFER_SHEET_COPY.overBalance(source.name, source.balance)
            : TRANSFER_SHEET_COPY.failed,
        )
        return false
      }

      toast.success(TRANSFER_SHEET_COPY.toastTitle, {
        description: TRANSFER_SHEET_COPY.toastDescription(
          maskMoney(amount, masked),
          walletNameOfId(before, fromWalletId),
          walletNameOfId(before, toWalletId),
        ),
      })
      return true
    },
    [masked],
  )
}
