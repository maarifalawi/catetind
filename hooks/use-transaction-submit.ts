'use client'

import { useCallback } from 'react'
import { toast } from 'sonner'
import { readOnline } from '@/lib/connection'
import {
  maskMoney,
  successCheerFor,
  TRANSACTION_INSUFFICIENT_FUNDS_COPY,
  TRANSACTION_NO_WALLET_COPY,
} from '@/lib/data/history'
import { OFFLINE_COPY } from '@/lib/data/offline'
import { recordDraftTransaction, type DraftTransactionInput } from '@/lib/transaction-bus'
import { getMoneySnapshot, walletFundsCheck } from '@/lib/money/store'
import type { HistoryTransaction } from '@/lib/data/history'

/* ── useTransactionSubmit — satu pintu "catat transaksi baru" (paket 33) ──────
   Dipakai dua shell yang sama-sama pintu input GLOBAL: `TransactionBottomSheet`
   (mobile, dipasang FAB + beberapa CTA) dan `TransactionWebModal` (desktop).
   Keduanya dulu menutup panel tanpa menyimpan payload sama sekali, padahal
   engine sudah menembak toast "kecatat" — jadi user diberi tahu sesuatu yang
   tidak terjadi.

   Urutannya sekarang sengaja begini, dan tidak boleh dibalik:
     1. TULIS catatannya ke bus sesi (`recordDraftTransaction`),
     2. baru TUTUP panelnya (anti-blocking: animasi tutup jalan di belakang),
     3. terakhir BARU ucapkan toast apresiasi — ditembak dari sini, bukan dari
        engine, karena hanya shell yang tahu penulisannya berhasil.

   Catatan: hook ini HANYA untuk mode TAMBAH. Mode edit punya jalurnya sendiri
   (`edit-transaction-sheet.tsx` → halaman yang memperbarui baris) dan toast
   "diperbarui" dari salinan masing-masing halaman.

   GUARD mode edit: engine mengisi `wallet`+`date` HANYA di mode edit (mode tambah
   tidak punya kedua field itu di formnya). Shell di sini tidak pernah mengirim
   keduanya, jadi kalau suatu hari ada yang salah pakai, catatan lama tidak akan
   "lahir ulang" jadi baris kedua — lebih baik tidak menyimpan apa pun daripada
   menggandakan data.

   PAKET 49 (form TAMBAH yang punya pemilih tanggal): form tambah `/calendar`
   memang membawa tanggal sendiri (backdating tanggal terkunci dari kalender),
   jadi penjaganya jadi EKSPLISIT lewat `options.backdated` — bukan dihapus.
   Pemanggil yang mengirim tanggal tanpa menyatakan opsi itu tetap ditolak,
   persis seperti sebelumnya.

   Dompet default & status sensor datang sebagai argumen (bukan diambil hook ini)
   supaya `hooks/` tidak perlu mengimpor provider dari `components/` — pemanggil
   yang tahu konteks uang aktif (`useMoneyContext()` + `defaultWalletNameFor()`
   dari store uang) dan status tombol mata (`usePrivacy().masked`) yang mengoper
   keduanya. Penulisannya sendiri lewat `lib/transaction-bus.ts`, yang kini cuma
   adapter tipis ke store (paket 40).

   Argumen pertama itu boleh `''` — artinya konteks/halaman ini belum punya
   dompet untuk catatan baru (paket 59). Dalam keadaan itu fungsi yang
   dikembalikan MENOLAK menulis dan memberi arahan, bukan menambal ke dompet
   lain; lihat pagar di dalam `submit` di bawah. */
export interface TransactionSubmitOptions {
  /**
   * Draft ini SAH membawa tanggalnya sendiri — backdating dari form tambah
   * `/calendar` (paket 49).
   *
   * Kenapa perlu dinyatakan: `date` (bersama `wallet`) adalah tanda draft dari
   * form EDIT, dan draft edit tidak boleh ditulis sebagai catatan baru. Form
   * tambah kalender punya pemilih tanggal, jadi ia menyatakannya di sini —
   * sementara shell FAB & modal web (yang formnya tanpa tanggal) tetap memakai
   * default `false` seperti sebelumnya.
   */
  backdated?: boolean
}

/**
 * Keputusan "draft ini ditulis atau tidak" — DIPISAH dari hook-nya supaya bisa
 * diuji murni tanpa DOM (`hooks/use-transaction-submit.test.ts`, paket 49).
 *
 * `false` = draft datang dari mode edit (membawa dompet + tanggal sekaligus)
 * dan pemanggilnya tidak menyatakan bahwa tanggal itu memang milik form tambah:
 * lebih baik tidak menyimpan apa pun daripada menggandakan baris lama.
 */
export function shouldWriteDraft(
  draft: DraftTransactionInput,
  options: TransactionSubmitOptions = {},
): boolean {
  if (draft.wallet && draft.date && !options.backdated) return false
  return true
}

export function useTransactionSubmit(
  fallbackWallet: string,
  masked = false,
  options: TransactionSubmitOptions = {},
) {
  /* `backdated` dibaca sebagai nilai primitif: pemanggil boleh mengirim objek
     literal tanpa membuat callback-nya lahir ulang tiap render */
  const { backdated = false } = options
  return useCallback(
    (draft: DraftTransactionInput, closePanel: () => void): HistoryTransaction | null => {
      if (!shouldWriteDraft(draft, { backdated })) {
        /* draft mode edit — jangan ditulis sebagai catatan baru */
        closePanel()
        return null
      }

      /* ── BELUM ADA DOMPET = TIDAK DITULIS (paket 59 · temuan audit #1) ────
         Konteks uang yang belum punya dompet sendiri dulu menempel ke 'Tunai'
         (dompet konteks Keluarga) sehingga catatan dari konteks "Bersama"
         memotong saldo Tunai tanpa user sadari. Sekarang penulisannya
         DITOLAK — dan panelnya SENGAJA tidak ditutup supaya nominal &
         catatan yang sudah diketik user tidak hilang; yang perlu ia lakukan
         (pindah konteks / tambah dompet) disebutkan di toast. */
      const walletName = (draft.wallet || fallbackWallet).trim()
      if (!walletName) {
        toast.error(TRANSACTION_NO_WALLET_COPY.title, {
          description: TRANSACTION_NO_WALLET_COPY.body,
        })
        return null
      }

      /* ── SALDO TIDAK BOLEH SUB-NOL (paket 74) ───────────────────────────────
         Pengeluaran yang melebihi saldo dompet HIDUP ditolak SEBELUM ditulis:
         tidak ada baris, saldo tidak bergerak, dan panelnya SENGAJA tidak ditutup
         supaya nominal/catatan yang sudah diketik tidak hilang — user cukup
         menurunkan nominalnya atau mengganti dompet. Penjaga yang sama juga hidup
         di store (`postTransaction`) sebagai pagar terakhir untuk jalur lain. */
      if (draft.type === 'expense') {
        const funds = walletFundsCheck(getMoneySnapshot(), walletName, draft.amount ?? 0)
        if (funds.known && !funds.sufficient) {
          toast.error(TRANSACTION_INSUFFICIENT_FUNDS_COPY.title, {
            description: TRANSACTION_INSUFFICIENT_FUNDS_COPY.body(walletName),
          })
          return null
        }
      }

      /* dibaca SEBELUM menulis: statusnya yang menentukan kalimat toast, dan
         menyimpan tidak mengubah status jaringan (paket 42) */
      const offline = !readOnline()
      const transaction = recordDraftTransaction(draft, walletName)
      closePanel()

      /* OFFLINE: jangan menembak pujian sukses yang sama seperti saat online.
         Catatannya memang tersimpan (di perangkat, dan masuk antrean), jadi
         yang dikatakan adalah itu — apa adanya. */
      if (offline) {
        toast(OFFLINE_COPY.savedOfflineTitle, { description: OFFLINE_COPY.savedOfflineBody })
        return transaction
      }

      /* nominal disensor DI SINI (titik toast dibuat) — toast hidup beberapa detik
         di atas kartu yang sudah disensor, jadi ia permukaan yang dibaca (§5.7) */
      toast.success(successCheerFor(transaction.type, maskMoney(transaction.amount, masked)))
      return transaction
    },
    [fallbackWallet, masked, backdated],
  )
}
