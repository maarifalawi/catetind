// ---------------------------------------------------------------------------
// Bus + penyimpanan SESI untuk transaksi yang baru dicatat dari AI Coach.
//
// Kenapa perlu: halaman Riwayat (/history) memegang daftarnya sendiri (mock,
// state lokal) sementara widget AI Coach hidup di root layout — dua tempat yang
// terpisah total. Tanpa backend, satu-satunya cara "transaksi muncul di
// Riwayat" adalah: (1) simpan catatannya di memory modul ini supaya tetap ada
// saat halaman lain dibuka, dan (2) beri tahu halaman yang sedang ter-mount
// lewat CustomEvent — pola yang sama dengan `lib/ai-chat-bus.ts`.
//
// Semua berhenti saat halaman di-refresh, sama seperti riwayat percakapan
// (`useAIChat`). Itu batas yang jujur untuk repo demo; produksinya baris
// `recordTransaction` jadi `POST /api/transactions` dan halaman Riwayat membaca
// dari server, sehingga bus ini tidak dibutuhkan lagi.
// ---------------------------------------------------------------------------

import { localISODate, type HistoryTransaction } from './data/history'
import type { TransactionType } from './types'

export const TRANSACTION_RECORDED_EVENT = 'catetind:transaction-recorded'

/** yang dikirim pemanggil — id, jam, dan badge ✨ ditentukan di sini */
export interface NewTransactionInput {
  name: string
  /** selalu angka positif — arah uang ditentukan `type` (pola `HistoryTransaction`) */
  amount: number
  type: TransactionType
  category: string
  wallet: string
  /** tanggal lokal `YYYY-MM-DD` */
  date: string
}

const recorded: HistoryTransaction[] = []

/* id mulai dari 9.001: jauh dari id mock (1–16) supaya mustahil bertabrakan,
   dan tetap terbaca sebagai "bukan data seed" saat dibahas di demo. */
let nextId = 9001

function localTime(): string {
  const now = new Date()
  return `${`${now.getHours()}`.padStart(2, '0')}:${`${now.getMinutes()}`.padStart(2, '0')}`
}

/**
 * Catat transaksi baru untuk sesi ini, lalu beri tahu seluruh halaman yang
 * mendengarkan (`/history`) supaya barisnya muncul tanpa reload.
 */
export function recordTransaction(input: NewTransactionInput): HistoryTransaction {
  const transaction: HistoryTransaction = {
    id: nextId,
    name: input.name,
    amount: input.amount,
    type: input.type,
    category: input.category,
    wallet: input.wallet,
    date: input.date || localISODate(),
    time: localTime(),
    /* namanya dirapikan AI (chat) ⇒ dapat badge ✨ di Riwayat, sama seperti
       catatan mock hasil parsing AI yang lain */
    aiGenerated: true,
  }
  nextId += 1
  recorded.unshift(transaction)

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(TRANSACTION_RECORDED_EVENT, { detail: transaction }))
  }

  return transaction
}

/**
 * Semua catatan sesi ini (terbaru dulu). Dipanggil SETELAH mount oleh halaman
 * Riwayat — pola repo untuk state yang hanya hidup di client (lihat
 * `lib/data/renewal.ts`), supaya HTML server dan render pertama client identik.
 */
export function readRecordedTransactions(): HistoryTransaction[] {
  return [...recorded]
}

/** dengarkan catatan baru; kembalikan fungsi pembatalan langganan */
export function subscribeRecordedTransactions(
  listener: (transaction: HistoryTransaction) => void,
): () => void {
  function handle(event: Event) {
    const detail = (event as CustomEvent<HistoryTransaction>).detail
    if (detail) listener(detail)
  }

  window.addEventListener(TRANSACTION_RECORDED_EVENT, handle)
  return () => window.removeEventListener(TRANSACTION_RECORDED_EVENT, handle)
}
