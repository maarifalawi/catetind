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

/* ── TANGGAL: HANYA DIPERCAYA KALAU MASUK AKAL (dan disebut user) ─────────────
   Temuan pemilik produk: mengetik "Warteg 20k, catet" di AI Coach menghasilkan
   catatan bertanggal 29 Juni 2026 — tanggal yang TIDAK pernah disebut siapa pun
   dan tidak ada di HP user. Sumbernya model: prompt meminta field `date`, jadi
   model "mengarang" tanggal ISO supaya JSON-nya lengkap, dan
   `normalizeExtraction` dulu menerimanya apa adanya (`isIsoDate`).

   Akibatnya lebih parah dari sekadar label salah: catatan itu masuk Riwayat
   tetapi tidak pernah muncul di Dashboard (kartu "Transaksi Terakhir" hanya
   menampilkan jendela beberapa hari), sehingga user melihat dua cerita berbeda
   untuk uang yang sama.

   Aturan sekarang:
     · tanggal harus ISO yang benar-benar ada di kalender (2026-02-31 ditolak);
     · tidak boleh di MASA DEPAN (transaksi belum terjadi);
     · untuk teks yang DIKETIK/DIUCAPKAN, tanggal model hanya dipakai kalau
       user memang menyebut tanggal ("kemarin", "3 Okt", "03/10", …) — kalau
       tidak, hari inilah jawabannya. Untuk struk, tanggal memang tercetak di
       kertas, jadi yang dipakai hanya batas masuk akal (≤ 180 hari ke belakang). */
const MONTH_WORDS =
  /\b(januari|februari|maret|april|mei|juni|juli|agustus|september|oktober|november|desember|jan|feb|mar|apr|jun|jul|agu|ags|sep|okt|nov|des)\b/i
const RELATIVE_DAY_WORDS =
  /\b(hari ini|tadi|kemarin|kemaren|kemarinnya|lusa|minggu lalu|minggu kemarin|pekan lalu|bulan lalu|awal bulan|akhir bulan|tanggal)\b/i
/** tanggal numerik gaya Indonesia: 03/10, 3-10, 03.10 */
const NUMERIC_DATE = /\b\d{1,2}[/.-]\d{1,2}(?:[/.-]\d{2,4})?\b/

/** true = teks user benar-benar menyebut tanggal (jadi tanggal model boleh dipakai) */
export function textMentionsDate(text: string): boolean {
  if (!text) return false
  return (
    /\d{4}-\d{2}-\d{2}/.test(text) || MONTH_WORDS.test(text) || RELATIVE_DAY_WORDS.test(text) || NUMERIC_DATE.test(text)
  )
}

/** selisih hari (tanggal ISO) — positif = `later` lebih baru */
function daysBetween(earlier: string, later: string): number {
  const a = Date.parse(`${earlier}T00:00:00Z`)
  const b = Date.parse(`${later}T00:00:00Z`)
  if (!Number.isFinite(a) || !Number.isFinite(b)) return Number.NaN
  return Math.round((b - a) / 86_400_000)
}

/**
 * Tanggal usulan model yang layak dipercaya, atau `''` (pemanggil memakai `today`).
 * `maxDaysBack` = seberapa tua tanggal itu masih masuk akal untuk sumbernya.
 */
function trustedDate(value: string, today: string, maxDaysBack: number): string {
  if (!isIsoDate(value)) return ''
  const candidate = value.trim()
  const parsed = new Date(`${candidate}T00:00:00`)
  if (Number.isNaN(parsed.getTime())) return ''
  /* tolak tanggal mustahil (2026-02-31 → 3 Maret) */
  if (/^\d{4}-\d{2}-\d{2}$/.test(today)) {
    const year = parsed.getFullYear()
    const month = `${parsed.getMonth() + 1}`.padStart(2, '0')
    const day = `${parsed.getDate()}`.padStart(2, '0')
    if (`${year}-${month}-${day}` !== candidate) return ''
  }
  const age = daysBetween(candidate, today)
  if (!Number.isFinite(age)) return ''
  /* `age < 0` = tanggal di masa depan; `age > maxDaysBack` = terlalu tua */
  if (age < 0 || age > maxDaysBack) return ''
  return candidate
}

/** batas umur tanggal per sumber: struk boleh lebih tua daripada ucapan */
const MAX_DAYS_BACK = { receipt: 180, chat: 31, voice: 31 } as const

/**
 * Nominal dari model → integer rupiah (paket 101).
 *
 * Kenapa perlu, padahal prompt sudah minta `number`: model vision tetap sering
 * mengembalikan nominal dalam bentuk yang dibacanya dari struk —
 * `"Rp 200.000.000"`, `"200.000.000"`, `"200,000,000"`, bahkan `"87500,00"`.
 * Dulu `Number(raw.amount)` mengubah semua itu jadi `NaN` → 0, sehingga struk
 * yang TOTALNYA JELAS terbaca berakhir sebagai "nominal belum kebaca".
 *
 * Aturan pemisah (mengikuti cara struk Indonesia ditulis):
 *   · titik & koma dua-duanya ada → yang TERAKHIR adalah desimal;
 *   · hanya titik dan berpola ribuan (`200.000.000`) → titik = ribuan;
 *   · hanya koma dan berpola ribuan (`200,000,000`) → koma = ribuan;
 *   · selain pola itu → pemisah tunggal dianggap desimal, hasilnya dibulatkan.
 *
 * `0` = tidak ada nominal yang bisa dipercaya (pemanggil menandai `lowFields`).
 */
export function parseAmountValue(value: unknown): number {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? Math.max(0, Math.round(value)) : 0
  }
  if (typeof value !== 'string') return 0
  /* buang mata uang, spasi, dan label: "Rp 200.000,00" → "200.000,00" */
  const cleaned = value.replace(/[^\d.,-]/g, '')
  if (!cleaned || cleaned === '-') return 0
  if (cleaned.startsWith('-')) return 0

  const lastDot = cleaned.lastIndexOf('.')
  const lastComma = cleaned.lastIndexOf(',')
  /* pola ribuan: satu jenis pemisah, tiap kelompok tepat 3 digit ("200.000.000") */
  const thousands = /^\d{1,3}(?:([.,])\d{3})+$/.test(cleaned)

  let digits: string
  if (thousands) {
    digits = cleaned.replace(/[.,]/g, '')
  } else if (lastDot >= 0 && lastComma >= 0) {
    /* desimal = pemisah yang muncul TERAKHIR; sisanya ribuan */
    const decimalAt = Math.max(lastDot, lastComma)
    digits = cleaned.slice(0, decimalAt).replace(/[.,]/g, '') + '.' + cleaned.slice(decimalAt + 1)
  } else if (lastDot >= 0) {
    /* satu titik diikuti 1–2 digit = desimal; selain itu pemisahnya salah tulis */
    digits = /^\d+\.\d{1,2}$/.test(cleaned) ? cleaned : cleaned.replace(/\./g, '')
  } else if (lastComma >= 0) {
    digits = /^\d+,\d{1,2}$/.test(cleaned)
      ? `${cleaned.slice(0, lastComma)}.${cleaned.slice(lastComma + 1)}`
      : cleaned.replace(/,/g, '')
  } else {
    digits = cleaned
  }

  const parsed = Number(digits)
  return Number.isFinite(parsed) ? Math.max(0, Math.round(parsed)) : 0
}

/**
 * Cocokkan nilai teks model ke daftar kanon TANPA membedakan huruf besar-kecil.
 *
 * Model kadang menulis "belanja" / "bca" walau daftar di prompt berbunyi
 * "Belanja" / "BCA". Dulu kegagalan itu dibuang ke `''` + `Lainnya`, dan user
 * melihat "Pilih kategori…" padahal AI sudah menyebut kategori yang benar.
 * `''` tetap berarti "tidak ada nilai yang sah" (bukan tebakan).
 */
function matchCanonical(list: readonly string[], value: unknown): string {
  if (typeof value !== 'string') return ''
  const wanted = value.trim().toLowerCase()
  if (!wanted) return ''
  return list.find((item) => item.toLowerCase() === wanted) ?? ''
}

/** JSON model → `ExtractedTransaction` yang aman dipakai UI */
export function normalizeExtraction(
  source: ExtractedTransaction['source'],
  raw: RawExtraction,
  today: string = localISODate(),
  /**
   * teks/ucapan ASLI user (opsional, tapi sangat dianjurkan untuk chat & voice).
   * Dipakai hanya untuk memastikan tanggal yang disebut model memang ada di
   * kalimat user — tanpa itu, tanggal karangan model dipakai apa adanya.
   */
  text = '',
): ExtractedTransaction {
  const type = KNOWN_TYPES.includes(raw.type as TransactionType)
    ? (raw.type as TransactionType)
    : 'expense'

  const roundedAmount = parseAmountValue(raw.amount)
  const amount = roundedAmount > 0 ? roundedAmount : 0

  const category = matchCanonical(TRANSACTION_CATEGORY_OPTIONS, raw.category)
  const wallet =
    matchCanonical(TRANSACTION_WALLET_OPTIONS, raw.wallet) || TRANSACTION_FALLBACK_WALLET

  /* Tanggal: hanya dipakai kalau masuk akal — dan untuk teks yang diketik/
     diucapkan, hanya kalau user menyebutnya sendiri (lihat `trustedDate`). */
  const modelDate = isIsoDate(raw.date) ? trustedDate(String(raw.date), today, MAX_DAYS_BACK[source]) : ''
  const date =
    modelDate && (source === 'receipt' || textMentionsDate(text)) ? modelDate : today
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
