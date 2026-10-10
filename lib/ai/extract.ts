/* ── NORMALISASI HASIL EKSTRAKSI AI → `ExtractedTransaction` ─────────────────
   Model mengembalikan JSON bebas; app butuh bentuk yang SUDAH ada
   (`lib/transaction-ai.ts`) supaya penggantian mock → API tidak menyentuh UI
   sama sekali. Fungsi di sini menjepit setiap nilai ke nilai kanon app:
   kategori harus salah satu `TRANSACTION_CATEGORY_OPTIONS`, dompet salah satu
   `TRANSACTION_WALLET_OPTIONS`, nominal integer > 0, tanggal `YYYY-MM-DD`.
   Nilai yang tidak bisa dipercaya TIDAK dipakai apa adanya — ditandai
   `lowFields` supaya kartu konfirmasi meminta user memeriksanya (PRD A11).

   PAKET 79 — dompet di sini adalah TEBAKAN, bukan keputusan akhir: `wallet`
   yang keluar dari fungsi ini masih nama kanon (bisa saja tidak dimiliki user).
   Yang mengubahnya jadi dompet MILIK user — dan menyebutkan tebakan aslinya apa
   adanya — adalah `captureWalletChoice()` (`lib/money/store.ts`) di
   `hooks/use-transaction-capture.ts`. Pemisahan itu disengaja: fungsi ini murni
   (tidak tahu ledger user), sedangkan pencocokan dompet butuh snapshot nyata. */

import {
  TRANSACTION_CATEGORY_OPTIONS,
  TRANSACTION_FALLBACK_CATEGORY,
  TRANSACTION_FALLBACK_WALLET,
  TRANSACTION_WALLET_OPTIONS,
  localISODate,
} from '@/lib/data/history'
import {
  FALLBACK_CHAT_NAME,
  FALLBACK_RECEIPT_NOTE,
  FALLBACK_VOICE_NAME,
  LOW_CONFIDENCE_THRESHOLD,
  type ExtractedField,
  type ExtractedTransaction,
} from '@/lib/transaction-ai'
import type { TransactionType } from '@/lib/types'

/** tipe yang dikenal; di luar ini jatuh ke `expense` (default app) */
const KNOWN_TYPES: TransactionType[] = ['expense', 'income', 'saving', 'transfer']

/** bentuk mentah dari model (semua field boleh hilang / bertipe apa pun) */
export interface RawExtraction {
  name?: unknown
  amount?: unknown
  category?: unknown
  wallet?: unknown
  type?: unknown
  date?: unknown
  confidence?: unknown
}

/** keyakinan dijepit 0–0.95; tanpa nominal, keyakinan DIPAKSA < ambang A11 */
function clampConfidence(value: number, amount: number): number {
  let confidence = Number.isFinite(value) ? value : 0.5
  if (confidence < 0) confidence = 0
  if (confidence >= 1) confidence = 0.95
  confidence = Math.min(0.95, confidence)
  if (amount === 0) confidence = Math.min(confidence, 0.45)
  return Number(confidence.toFixed(2))
}

function isIsoDate(value: unknown): value is string {
  return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value.trim())
}

/** JSON model → `ExtractedTransaction` yang aman dipakai UI */
export function normalizeExtraction(
  source: ExtractedTransaction['source'],
  raw: RawExtraction,
  today: string = localISODate(),
): ExtractedTransaction {
  const type = KNOWN_TYPES.includes(raw.type as TransactionType)
    ? (raw.type as TransactionType)
    : 'expense'

  const roundedAmount = Math.round(Number(raw.amount))
  const amount = Number.isFinite(roundedAmount) && roundedAmount > 0 ? roundedAmount : 0

  const categoryValue = typeof raw.category === 'string' ? raw.category.trim() : ''
  const category = (TRANSACTION_CATEGORY_OPTIONS as readonly string[]).includes(categoryValue)
    ? categoryValue
    : ''

  const walletValue = typeof raw.wallet === 'string' ? raw.wallet.trim() : ''
  const wallet = (TRANSACTION_WALLET_OPTIONS as readonly string[]).includes(walletValue)
    ? walletValue
    : TRANSACTION_FALLBACK_WALLET

  const date = isIsoDate(raw.date) ? raw.date.trim() : today
  const name = typeof raw.name === 'string' ? raw.name.trim().slice(0, 80) : ''
  const confidence = clampConfidence(Number(raw.confidence), amount)

  const lowFields: ExtractedField[] = []
  if (amount === 0) lowFields.push('amount')
  if (!category) lowFields.push('category')
  if (!name) lowFields.push('name')
  /* tanggal thermal cepat luntur → hanya ditandai saat keyakinan memang rendah */
  if (confidence < LOW_CONFIDENCE_THRESHOLD && source === 'receipt') lowFields.push('date')

  return {
    source,
    type,
    name:
      name ||
      (source === 'receipt'
        ? FALLBACK_RECEIPT_NOTE
        : source === 'chat'
          ? FALLBACK_CHAT_NAME
          : FALLBACK_VOICE_NAME),
    amount,
    category: category || TRANSACTION_FALLBACK_CATEGORY,
    wallet,
    date,
    confidence,
    lowFields,
  }
}
