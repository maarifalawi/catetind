// ---------------------------------------------------------------------------
// ADAPTER TIPIS ke satu store uang (paket 40).
//
// Dulu file ini adalah BUS + penyimpanan sesi sendiri: ia menyimpan daftar
// `recorded` di memory modulnya, menyiarkan CustomEvent "transaction-recorded",
// dan halaman-halaman menyalin isinya ke state masing-masing. Tiga akibatnya
// (temuan audit #7):
//   • hapus catatan tidak pernah sampai ke halaman lain — `removedIds` hidup per
//     halaman, jadi baris yang dihapus "lahir lagi" begitu halamannya di-mount
//     ulang;
//   • catatan hanya jadi daftar pajangan: ia tidak pernah menyentuh saldo
//     dompet mana pun;
//   • ada DUA jalur tulis (bus ini + `setWallets` lokal di halaman Dompet),
//     jadi saldo bisa berbeda antar halaman.
//
// Sekarang bus ini TIDAK menyimpan apa pun. Semua tulis-menulis uang lewat
// `lib/money/store.ts` (baris ledger + saldo), dan setiap halaman membaca store
// yang sama. Nama fungsi di bawah dipertahankan supaya shell input & AI capture
// tidak perlu tahu soal ledger — itu satu-satunya alasan file ini masih ada.
//
// 🚧 Di produksi dua fungsi ini jadi `POST /api/transactions` (satu request per
// catatan, `clientTxId` jadi header idempotency), dan file ini dihapus.
// ---------------------------------------------------------------------------

import {
  TRANSACTION_DEFAULT_NAME,
  TRANSACTION_FALLBACK_CATEGORY,
  localISODate,
  type HistoryTransaction,
} from './data/history'
import { postTransaction, toHistoryTransaction } from './money/store'
import type { TransactionType } from './types'

/** yang dikirim pemanggil — id, jam, dan badge ✨ ditentukan di store */
export interface NewTransactionInput {
  name: string
  /** selalu angka positif — arah uang ditentukan `type` (pola `HistoryTransaction`) */
  amount: number
  type: TransactionType
  category: string
  wallet: string
  /** tanggal lokal `YYYY-MM-DD` */
  date: string
  /**
   * Kunci idempotensi dari panel input (paket 42). Kosong = store yang membuat
   * satu; dipakai untuk menolak catatan kembar saat user menekan "Catat" dua kali.
   */
  clientTxId?: string
}

/**
 * Draft dari panel input manual (bentuknya `TransactionDraft` milik engine).
 *
 * Ditulis ulang di sini sebagai tipe sendiri supaya `lib/` tidak perlu mengimpor
 * dari `components/` (arah impor repo ini selalu komponen → lib).
 */
export interface DraftTransactionInput {
  amount: number
  note: string
  type: TransactionType
  category?: string
  wallet?: string
  date?: string
  /** kunci idempotensi dari engine input (paket 42) */
  clientTxId?: string
}

/**
 * Catat transaksi baru. Barisnya masuk ledger store SEKALIGUS — kalau dompetnya
 * dikenal, saldo dompet itu ikut bergerak; kalau namanya belum ada di ledger
 * (mis. `OVO` sebelum dompetnya ditambahkan), barisnya tetap tercatat apa adanya
 * tapi tidak menggerakkan saldo mana pun (lihat `postTransaction`).
 *
 * PAKET 54: fungsi ini TIDAK LAGI mencatat pemakaian kuota `categorize`.
 *
 * Dulu setiap catatan baru dihitung sebagai satu panggilan kategorisasi AI —
 * padahal AI tidak pernah dipanggil di jalur manual: kategorinya cuma nilai
 * `type.suggested` yang ditulis di klien. Meter yang menagih jatah AI untuk
 * pekerjaan yang tidak terjadi adalah klaim palsu, jadi angkanya dipindahkan ke
 * tempat yang benar-benar memakai AI: `useTransactionCapture.confirmCapture()`
 * (jalur struk/ucapan, dan hanya saat saklarnya menyala).
 */
export function recordTransaction(input: NewTransactionInput): HistoryTransaction {
  const row = postTransaction({
    name: input.name,
    amount: input.amount,
    type: input.type,
    category: input.category,
    wallet: input.wallet,
    dateISO: input.date || localISODate(),
    /* namanya dirapikan AI (chat) ⇒ dapat badge ✨ di Riwayat, sama seperti
       catatan mock hasil parsing AI yang lain */
    aiGenerated: true,
    /* kunci idempotensi diteruskan apa adanya: store yang memutuskan baris ini
       baris BARU atau pengulangan dari aksi yang sama (paket 42) */
    clientTxId: input.clientTxId,
  })

  /* penulisan ditolak (nominal tidak sah) → jangan mengaku kecatat */
  if (!row) throw new Error('Catatan tidak tersimpan: nominalnya tidak sah.')

  return toHistoryTransaction(row)
}

/**
 * Catat draft dari PANEL INPUT MANUAL (paket 33) — satu pintu untuk semua shell
 * (`TransactionBottomSheet`, `TransactionWebModal`), supaya default-nya tidak
 * ditulis dua kali.
 *
 * Default yang dipakai cuma untuk field yang memang belum ada di form tambah:
 *   • nama    → catatan user, atau sebutan netral per tipe (`TRANSACTION_DEFAULT_NAME`)
 *   • kategori→ PILIHAN USER yang dibawa engine (paket 54), atau kategori tetap
 *               tipe untuk Tabungan/Transfer (`manualCategoryChoice()` di
 *               `lib/data/history.ts`). `TRANSACTION_FALLBACK_CATEGORY` di bawah
 *               cuma jaring pengaman terakhir untuk pemanggil lain yang tidak
 *               membawa kategori sama sekali — form tambah tertahan sampai user
 *               memilih, jadi ia tidak pernah jadi default yang dikirim diam-diam
 *   • dompet  → dompet kanon pertama di konteks uang aktif (`defaultWalletNameFor`),
 *               fallback `'Tunai'`
 *   • tanggal → hari ini (`localISODate()`); form tambah tidak punya pemilih tanggal
 */
export function recordDraftTransaction(
  draft: DraftTransactionInput,
  fallbackWallet: string,
): HistoryTransaction {
  return recordTransaction({
    name: draft.note.trim() || TRANSACTION_DEFAULT_NAME[draft.type],
    amount: draft.amount,
    type: draft.type,
    category: draft.category || TRANSACTION_FALLBACK_CATEGORY,
    wallet: draft.wallet || fallbackWallet,
    date: draft.date || localISODate(),
    clientTxId: draft.clientTxId,
  })
}
