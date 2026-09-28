'use client'

import { useCallback } from 'react'
import { toast } from 'sonner'
import { readOnline } from '@/lib/connection'
import { maskMoney, successCheerFor } from '@/lib/data/history'
import { OFFLINE_COPY } from '@/lib/data/offline'
import { recordDraftTransaction, type DraftTransactionInput } from '@/lib/transaction-bus'
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
   adapter tipis ke store (paket 40). */
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

      /* dibaca SEBELUM menulis: statusnya yang menentukan kalimat toast, dan
         menyimpan tidak mengubah status jaringan (paket 42) */
      const offline = !readOnline()
      const transaction = recordDraftTransaction(draft, fallbackWallet)
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
