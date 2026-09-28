// ---------------------------------------------------------------------------
// Ekstraksi transaksi dari struk (OCR) & ucapan (voice) — Domain 2A.2 Mode 2 & 3.
//
// Yang ada di sini adalah MESIN MOCK, bukan model AI. Tujuannya satu: dua pintu
// masuk (chat AI Coach & Transaction Input Engine) memakai SUMBER YANG SAMA,
// jadi tidak ada dua logika OCR yang bisa saling menyimpang — persis yang
// dilarang prompt 20.
//
// Arah produksi (TIDAK dipanggil di repo demo ini):
//   • struk → `POST /api/ocr` → GPT-4o-mini (vision). System prompt + aturan
//     output JSON-nya ada di PRD 414–451. Hasil nyatanya mengisi bentuk
//     `ExtractedTransaction` yang sama, termasuk `confidence` (PRD A11).
//   • ucapan → Web Speech API (STT di browser, PRD A3) → `POST /api/parse-voice`
//     → DeepSeek V3. Contoh utterance yang wajib dikenali ada di PRD 462–470.
// Karena bentuk keluarannya sudah disamakan, penggantian mock → API tidak
// menyentuh UI sama sekali.
//
// Nama & angka yang "dihasilkan AI" di sini DETERMINISTIK: diturunkan dari nama
// file/transkrip lewat hash, bukan Math.random(). Bukan soal hydration (fungsi
// ini hanya jalan setelah user berbuat sesuatu), tapi supaya hasilnya bisa
// diulang & dibahas: file yang sama = cerita yang sama.
// ---------------------------------------------------------------------------

import { localISODate } from './data/history'
import type { TransactionType } from './types'

/** ambang keyakinan OCR (PRD A11): di bawah ini AI wajib mengaku belum yakin */
export const LOW_CONFIDENCE_THRESHOLD = 0.5

/** field hasil ekstraksi yang bisa ditandai "perlu dicek user" (PRD A11) */
export type ExtractedField = 'name' | 'amount' | 'date' | 'category' | 'wallet'

/** hasil ekstraksi "AI" — satu bentuk untuk struk maupun ucapan */
export interface ExtractedTransaction {
  source: 'receipt' | 'voice'
  type: TransactionType
  /** `ai_generated_name` — deskripsi manusiawi 3–6 kata (PRD 444/498) */
  name: string
  amount: number
  category: string
  wallet: string
  /** tanggal lokal `YYYY-MM-DD` */
  date: string
  /** keyakinan 0.0–1.0 — menyalakan treatment A11 di kartu konfirmasi */
  confidence: number
  /** field yang keyakinannya rendah ⇒ ditandai amber + copy jujur */
  lowFields: ExtractedField[]
}

/* ── STRUK (OCR) ─────────────────────────────────────────────────────────────
   Nilai kanon untuk demo. `MOCK_RECEIPT_AMOUNT` sengaja dipakai DUA tempat:
   engine input manual (perilakunya tidak boleh berubah — selalu struk 87.500)
   dan sampel pertama tabel OCR chat, jadi keduanya bercerita soal struk yang
   sama, bukan dua angka karangan yang berbeda. */

export const MOCK_RECEIPT_AMOUNT = 87500

/** lama "baca struk" sebelum hasilnya muncul — dipakai engine & chat */
export const MOCK_RECEIPT_READ_MS = 2200

/**
 * Sampel hasil OCR (di produksi diganti balasan GPT-4o-mini). Nama file
 * menentukan sampel mana yang keluar, sehingga mencoba beberapa gambar memang
 * memberi cerita berbeda — bukan struk yang sama terus.
 */
const RECEIPT_SAMPLES: { name: string; amount: number; category: string }[] = [
  { name: 'Belanja Indomaret Cilandak', amount: MOCK_RECEIPT_AMOUNT, category: 'Belanja' },
  { name: 'Makan Siang Warteg Bahari', amount: 27000, category: 'Makanan' },
  { name: 'Belanja Alfamart Kemang', amount: 127500, category: 'Belanja' },
  { name: 'Kopi Kenangan Oat Latte', amount: 32000, category: 'Makanan' },
  { name: 'Belanja Bulanan Superindo', amount: 232500, category: 'Belanja' },
]

/** struk kertas hampir selalu tunai — tetap bisa dikoreksi user di kartu konfirmasi */
export const RECEIPT_DEFAULT_WALLET = 'Tunai'

/** dipakai kalau nama file struk tidak menyisakan apa pun yang bisa dibaca */
export const FALLBACK_RECEIPT_NOTE = 'Belanja dari struk'

/**
 * Nama catatan dari nama file struk. DIPAKAI ENGINE & CHAT supaya keduanya
 * menulis nama dengan cara yang sama (prompt 20 minta bagian bersama ini
 * diekstrak ke `lib/`, bukan disalin dua kali). Logikanya sengaja identik
 * dengan versi lama di engine: buang ekstensi, potong 24 karakter.
 */
export function receiptNoteFromFileName(fileName: string): string {
  const raw = fileName.replace(/\.[^.]+$/, '').slice(0, 24)
  return raw ? `Struk ${raw}` : FALLBACK_RECEIPT_NOTE
}

/** hash FNV-1a 32-bit → pecahan 0.0–1.0; sumber "kepribadian" hasil mock */
function seedFromName(name: string): number {
  let hash = 2166136261
  for (let i = 0; i < name.length; i += 1) {
    hash ^= name.charCodeAt(i)
    hash = Math.imul(hash, 16777619)
  }
  return (hash >>> 0) / 4294967295
}

/** turunan kedua dari seed yang sama supaya sampel & keyakinan tidak sejalan terus */
function jitter(seed: number): number {
  return (seed * 7919) % 1
}

/**
 * Hasil "OCR" mock: merchant, total, kategori, dan — yang penting untuk A11 —
 * `confidence`, diturunkan dari nama file. Struk yang keyakinannya rendah juga
 * menandai lebih banyak field: keyakinan turun ⇔ makin banyak yang perlu
 * dicek, bukan dua sinyal yang bisa saling bertentangan.
 */
export function mockReceiptScan(
  fileName: string,
  today: string = localISODate(),
): ExtractedTransaction {
  const seed = seedFromName(fileName)
  const sample = RECEIPT_SAMPLES[Math.floor(seed * RECEIPT_SAMPLES.length)] ?? RECEIPT_SAMPLES[0]
  const confidence = Number((0.38 + 0.58 * jitter(seed)).toFixed(2))

  const lowFields: ExtractedField[] =
    confidence < LOW_CONFIDENCE_THRESHOLD
      ? ['date', 'amount'] // struk pudar: tanggal & total paling sering salah baca
      : confidence < 0.7
        ? ['date'] // tanggal di struk thermal cepat mengelupas, nominal masih kebaca
        : []

  return {
    source: 'receipt',
    type: 'expense',
    name: sample.name,
    amount: sample.amount,
    category: sample.category,
    wallet: RECEIPT_DEFAULT_WALLET,
    date: today,
    confidence,
    lowFields,
  }
}

/* ── UCAPAN (VOICE) ──────────────────────────────────────────────────────────
   Berbeda dari struk, input di sini NYATA: teksnya datang dari Web Speech API,
   jadi user bisa bilang apa pun. Parser ini benar-benar membaca kalimatnya
   (nominal, tipe, kategori, dompet) supaya angka di kartu konfirmasi bukan
   karangan — dan kalau nominalnya tidak ketemu, keyakinannya rendah sehingga
   field itu ditandai "perlu dicek" (A11) alih-alih menebak diam-diam. */

/** satuan nominal Indonesia (PRD 483): "25 ribu", "1.5jt" */
const AMOUNT_UNITS: { pattern: RegExp; factor: number }[] = [
  { pattern: /(\d+(?:[.,]\d+)?)\s*(?:jt|juta)\b/, factor: 1_000_000 },
  { pattern: /(\d+(?:[.,]\d+)?)\s*(?:rb|ribu|k)\b/, factor: 1_000 },
]

/** nominal utuh dari kata slang — tidak ada angkanya, jadi dipetakan langsung */
const AMOUNT_SLANG: { pattern: RegExp; value: number }[] = [
  { pattern: /\bsejuta\b/, value: 1_000_000 },
  { pattern: /\bgopek\b/, value: 500_000 },
  { pattern: /\bgocap\b/, value: 50_000 },
  { pattern: /\bceban\b/, value: 10_000 },
]

/** kata kunci tipe transaksi (PRD 484–488); urutan = prioritas.
 *
 *  PAKET 55: `transfer` tetap DIDENGAR di sini — AI tidak boleh pura-pura tidak
 *  mendengar kata "transfer"/"pindah dana" (itu membuat hasil bacanya meleset).
 *  Yang berubah adalah apa yang boleh DILAKUKAN dengan hasilnya: jalur capture
 *  (chat/voice) hanya bisa mencatat satu sisi, jadi kartu konfirmasi menahan
 *  simpan & mengarahkan user ke alur “Pindah Dana” yang menanyakan dompet tujuan
 *  (`AI_CAPTURE_COPY.needTransferFlow`), dan store menolaknya sebagai jaring
 *  terakhir (`postTransaction` → `null` untuk `type: 'transfer'`). */
const TYPE_KEYWORDS: { type: TransactionType; pattern: RegExp }[] = [
  { type: 'saving', pattern: /\b(nabung|menabung|sisihkan|simpan|tabung|celengan)\b/ },
  { type: 'transfer', pattern: /\b(transfer|tf|kirim|pindahin|pindah\s?dana)\b/ },
  {
    type: 'income',
    pattern: /\b(gaji|gajian|bonus|thr|honor|terima|dapet|dapat|dibayar|pendapatan)\b/,
  },
]

/** kata kunci kategori — hasilnya memakai label kanon `TRANSACTION_CATEGORY_OPTIONS` */
const CATEGORY_KEYWORDS: { category: string; pattern: RegExp }[] = [
  {
    category: 'Makanan',
    pattern:
      /\b(kopi|boba|makan|makanan|sarapan|nasi|geprek|warteg|ayam|bakso|mie|kafe|cafe|jajan|cemilan|lunch|dinner)\b/,
  },
  {
    category: 'Transportasi',
    pattern:
      /\b(grab|gojek|ojek|ojol|bensin|pertalite|pertamax|parkir|tol|krl|mrt|lrt|transjakarta|taksi|kereta)\b/,
  },
  {
    category: 'Belanja',
    pattern:
      /\b(indomaret|alfamart|alfamidi|superindo|belanja|supermarket|tokped|tokopedia|shopee|lazada|baju|sepatu|skincare)\b/,
  },
  {
    category: 'Tagihan',
    pattern:
      /\b(kos|kost|kontrakan|listrik|air|pdam|wifi|internet|kuota|pulsa|tagihan|iuran|bpjs|asuransi|langganan)\b/,
  },
  {
    category: 'Hiburan',
    pattern: /\b(nonton|bioskop|film|netflix|spotify|game|steam|konser|karaoke)\b/,
  },
  { category: 'Kesehatan', pattern: /\b(obat|apotek|dokter|klinik|vitamin|gym|olahraga)\b/ },
  { category: 'Pendidikan', pattern: /\b(buku|kursus|kelas|kuliah|spp|udemy|seminar)\b/ },
]

/** alias dompet sehari-hari → label kanon `TRANSACTION_WALLET_OPTIONS` */
const WALLET_ALIASES: { pattern: RegExp; wallet: string }[] = [
  { pattern: /\bbca\b/, wallet: 'BCA' },
  { pattern: /\b(gopay|go\s?pay|gopai)\b/, wallet: 'GoPay' },
  { pattern: /\bovo\b/, wallet: 'OVO' },
  { pattern: /\b(tunai|cash|uang\s?cash)\b/, wallet: 'Tunai' },
]

/** angka mentah dari kalimat: "25 ribu" → 25000; "25.000" → 25000 (PRD 483) */
function parseSpokenAmount(text: string): number | null {
  for (const { pattern, factor } of AMOUNT_UNITS) {
    const match = pattern.exec(text)
    if (!match) continue
    const value = Number(match[1].replace(',', '.')) * factor
    if (Number.isFinite(value) && value > 0) return Math.round(value)
  }

  for (const { pattern, value } of AMOUNT_SLANG) {
    if (pattern.test(text)) return value
  }

  // "25.000" / "25 000" — pemisah ribuan gaya Indonesia
  const grouped = /(\d{1,3}(?:[.\s]\d{3})+)/.exec(text)
  if (grouped) {
    const value = Number(grouped[1].replace(/\D/g, ''))
    if (value > 0) return value
  }

  // angka polos ≥ 4 digit ("25000"); di bawah itu terlalu mudah salah tangkap
  const bare = /(\d{4,})/.exec(text)
  return bare ? Number(bare[1]) : null
}

/** buang bagian nominal supaya namanya bukan "beli kopi 25 ribu 25000" */
function stripAmount(text: string): string {
  return text
    .replace(/(?:rp\.?\s*)?\d[\d.,]*\s*(?:jt|juta|rb|ribu|k\b)?/gi, ' ')
    .replace(/\b(?:sejuta|gopek|gocap|ceban|ribu|juta|rupiah)\b/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

/** nama catatan dari ucapan: maksimal 6 kata, huruf awal dibesarkan (PRD 498) */
function spokenName(text: string): string {
  const words = stripAmount(text).split(' ').filter(Boolean).slice(0, 6)
  if (words.length < 2) return ''
  const sentence = words.join(' ')
  return sentence.charAt(0).toUpperCase() + sentence.slice(1)
}

/** dipakai kalau nama catatan dari ucapan tidak bisa dirangkai jadi kalimat */
export const FALLBACK_VOICE_NAME = 'Catatan dari suara'

/**
 * Hasil "parse" ucapan: nominal, tipe, kategori, dompet, dan nama catatan dibaca
 * dari transkrip Web Speech API. Keyakinan tinggi hanya kalau nominalnya
 * benar-benar kedengeran — tanpa nominal, `lowFields` memuat `amount` supaya
 * user ditunjukkan bagian mana yang wajib diisi (A11).
 */
export function parseSpokenTransaction(
  transcript: string,
  today: string = localISODate(),
): ExtractedTransaction {
  const text = transcript.toLowerCase()

  const amount = parseSpokenAmount(text)
  const matchedType = TYPE_KEYWORDS.find((entry) => entry.pattern.test(text))
  const type: TransactionType = matchedType?.type ?? 'expense'

  const matchedCategory = CATEGORY_KEYWORDS.find((entry) => entry.pattern.test(text))
  const category =
    matchedCategory?.category ??
    (type === 'income'
      ? 'Gaji Utama'
      : type === 'saving'
        ? /\bdana darurat\b/.test(text)
          ? 'Dana Darurat'
          : 'Tabungan'
        : type === 'transfer'
          ? 'Transfer'
          : 'Lainnya')

  const matchedWallet = WALLET_ALIASES.find((entry) => entry.pattern.test(text))
  const wallet = matchedWallet?.wallet ?? RECEIPT_DEFAULT_WALLET

  const name = spokenName(transcript)
  const lowFields: ExtractedField[] = []
  if (amount === null) lowFields.push('amount')
  if (!matchedCategory && type === 'expense') lowFields.push('category')
  if (!name) lowFields.push('name')

  /*
   * Bobot keyakinan sederhana: tiap bagian yang benar-benar terbaca menambah
   * keyakinan, tapi tidak pernah sampai 1 — AI yang mengaku 100% yakin dari satu
   * kalimat pendek justru yang bikin user malas memeriksa (A11 minta sebaliknya).
   * Tanpa nominal, keyakinannya DIPAKSA di bawah ambang A11: jumlah uang adalah
   * inti catatannya, jadi kalau itu tidak kedengeran, AI memang tidak boleh
   * merasa yakin — apa pun yang terbaca di bagian lain.
   */
  const confidence = Number(
    Math.min(
      amount === null ? 0.45 : 0.95,
      0.35 +
        (amount !== null ? 0.4 : 0) +
        (matchedCategory ? 0.15 : 0) +
        (matchedWallet ? 0.05 : 0),
    ).toFixed(2),
  )

  return {
    source: 'voice',
    type,
    name: name || FALLBACK_VOICE_NAME,
    amount: amount ?? 0,
    category,
    wallet,
    date: today,
    confidence,
    lowFields,
  }
}

/* ── BENTUK FORM KONFIRMASI ──────────────────────────────────────────────────
   PRD 409/518: SEMUA field hasil AI bisa diedit user. `TransactionDraftForm`
   memegang nilai yang sedang diedit (nominal sebagai digit mentah — pola yang
   sama dengan `RupiahField` & engine), jadi kartu konfirmasi di chat memakai
   primitif input yang sudah ada, bukan input rupiah versi baru. */

export interface TransactionDraftForm {
  source: ExtractedTransaction['source']
  type: TransactionType
  name: string
  /** digit mentah tanpa pemisah — satu-satunya sumber kebenaran nominal */
  amountDigits: string
  category: string
  wallet: string
  /** tanggal lokal `YYYY-MM-DD` */
  date: string
  confidence: number
  lowFields: ExtractedField[]
  /** transkrip mentah hasil STT — jejak jujur apa yang benar-benar didengar */
  transcript?: string
}

/** hasil ekstraksi "AI" → isi awal form konfirmasi yang bisa dikoreksi user */
export function draftFormFrom(
  extracted: ExtractedTransaction,
  transcript?: string,
): TransactionDraftForm {
  return {
    source: extracted.source,
    type: extracted.type,
    name: extracted.name,
    amountDigits: extracted.amount > 0 ? String(extracted.amount) : '',
    category: extracted.category,
    wallet: extracted.wallet,
    date: extracted.date,
    confidence: extracted.confidence,
    lowFields: [...extracted.lowFields],
    transcript,
  }
}
