'use client'

import { track } from '@vercel/analytics'

/* ── EVENT ANALITIK AKSI KRITIKAL UANG (paket 43 · audit Stage 6 #4) ─────────
   Temuan audit: `package.json` cuma punya `@vercel/analytics`, dan NOL event
   dikirim dari aksi yang menyentuh uang (catat, koreksi saldo, settle, hapus).
   Akibatnya drift angka di produksi tidak bisa dideteksi: user melaporkan
   "saldo beda", kami tidak punya satu pun jejak tentang aksi apa yang terjadi.

   File ini menutup lubang itu sekaligus menjaga satu aturan yang TIDAK BOLEH
   dilanggar (CONTEXT-WAJIB §1 & PRD 3064–3504 — privasi-first):

     ⛔ PAYLOAD TIDAK PERNAH MEMUAT ANGKA UANG, NAMA CATATAN, NAMA DOMPET,
        ATAU IDENTITAS APA PUN YANG BISA DIKENALI.

   Yang dikirim hanya BENTUK aksinya: jenisnya, arahnya, apakah perangkat
   offline, mode pembagiannya. Itu cukup untuk mendeteksi drift ("keriuhan
   `balance_adjusted` naik 10x sementara `transaction_created` turun") tanpa
   mengirim satu rupiah pun.

   Karena janji ini mudah dilanggar tanpa sadar, penjaganya bukan cuma niat:
   `sanitizeEventPayload()` MEMBUANG kunci terlarang (`amount`, `nominal`,
   `note`, `saldo`, `wallet`, …) dan nilai string yang panjang (catatan user
   biasanya panjang; nilai di katalog ini selalu pendek & berasal dari daftar
   tetap). Penjaga itu diuji di `lib/analytics.test.ts`.

   🚧 Di produksi file ini tidak berubah: `track()` yang sudah ada memang
   mengirim ke Vercel Web Analytics. Yang berubah cuma siapa yang memanggil —
   store uang & store kuota AI, bukan komponen halaman, supaya tidak ada satu
   aksi uang pun yang lolos tanpa jejak karena lupa dipasang di UI. */

/** nama event — SENGAJA daftar tertutup (bukan string bebas) supaya tidak ada
 *  event baru yang lahir tanpa melewati penjaga payload di file ini */
export type MoneyEventName =
  | 'transaction_created'
  | 'transaction_deleted'
  | 'balance_adjusted'
  | 'settlement_recorded'
  | 'joint_split_changed'
  | 'ai_quota_low'

/** nilai yang boleh dikirim: primitif saja (objek bersarang ditolak library) */
export type EventPrimitive = string | number | boolean | null
export type MoneyEventPayload = Record<string, EventPrimitive>

export const MONEY_EVENT_NAMES: readonly MoneyEventName[] = [
  'transaction_created',
  'transaction_deleted',
  'balance_adjusted',
  'settlement_recorded',
  'joint_split_changed',
  'ai_quota_low',
] as const

/**
 * Kunci yang HARAM dikirim. Sengaja pola (bukan daftar kunci) supaya varian
 * penamaan baru (`amountLabel`, `note_text`, `walletName`, …) ikut tertangkap.
 * `balance`/`total`/`value` ada di daftar bukan karena angkanya selalu uang,
 * tapi karena di domain ini hampir selalu berarti saldo — dan salah kirim satu
 * kali saja sudah pelanggaran.
 */
const FORBIDDEN_KEY_PATTERN =
  /(amount|nominal|note|nama|name|catatan|saldo|balance|total|nilai|value|harga|price|wallet|dompet|debt|goal|target|email|user)/i

/**
 * Panjang maksimum nilai string. Nilai sah di katalog ini selalu pendek
 * (`'expense'`, `'cash'`, `'recap'`, …), sedangkan catatan user hampir selalu
 * lebih panjang — jadi batas ini menutup jalur "menyelundupkan catatan lewat
 * nilai, bukan lewat kunci".
 */
export const MAX_EVENT_VALUE_LENGTH = 24

/**
 * Katalog event: SATU tempat yang menjawab "event apa, kapan, isinya apa".
 * Dipakai laporan audit + diuji (`lib/analytics.test.ts`) supaya tidak ada kunci
 * terlarang yang lolos ke produksi.
 */
export const MONEY_EVENT_CATALOG: readonly {
  name: MoneyEventName
  /** kapan event ini benar-benar ditembak */
  when: string
  /** kunci payload yang BOLEH dikirim */
  payload: readonly string[]
  /** yang SENGAJA tidak pernah ikut — jawaban untuk pertanyaan auditor */
  never: readonly string[]
}[] = [
  {
    name: 'transaction_created',
    when: 'baris ledger baru benar-benar tertulis (panel input & AI capture) — bukan pengulangan idempotensi',
    payload: ['kind', 'offline', 'ai_generated', 'linked'],
    never: ['nominal', 'nama catatan', 'nama dompet', 'kategori', 'clientTxId'],
  },
  {
    name: 'transaction_deleted',
    when: 'tombol hapus di Riwayat / Home / detail dompet menulis tombstone',
    payload: ['kind'],
    never: ['nominal', 'nama catatan', 'id baris'],
  },
  {
    name: 'balance_adjusted',
    when: 'koreksi saldo (Smart Sync) benar-benar menulis baris `balance_adjustment`',
    payload: ['direction'],
    never: ['selisih', 'saldo lama', 'saldo baru', 'nama dompet'],
  },
  {
    name: 'settlement_recorded',
    when: 'settle dompet bersama tersimpan (`scope: joint`) atau pelunasan hutang/piutang menyentuh kas (`scope: debt`)',
    payload: ['scope', 'direction', 'has_change', 'method'],
    never: ['nominal transfer', 'nominal pelunasan', 'nama lawan transaksi'],
  },
  {
    name: 'joint_split_changed',
    when: 'pembagian transaksi bareng disimpan dari Split Bill sheet',
    payload: ['mode', 'me_percent', 'partner_percent'],
    never: ['nominal total', 'nominal per orang', 'nama transaksi'],
  },
  {
    name: 'ai_quota_low',
    when: 'setelah pemakaian AI dicatat dan sisa panggilan satu aktivitas ≤ 20% kuotanya (sekali per aktivitas per sesi)',
    payload: ['activity', 'remaining_calls', 'quota_calls', 'exhausted'],
    never: ['nominal', 'isi percakapan', 'teks struk', 'nama catatan'],
  },
] as const

export interface SanitizeResult {
  /** payload yang benar-benar boleh dikirim */
  clean: MoneyEventPayload
  /** kunci yang DIBUANG karena terlarang / nilainya terlalu panjang */
  dropped: string[]
}

/**
 * Saring payload sebelum dikirim. Fungsi murni supaya bisa diuji tanpa browser
 * dan tanpa mengirim apa pun.
 */
export function sanitizeEventPayload(payload: MoneyEventPayload): SanitizeResult {
  const clean: MoneyEventPayload = {}
  const dropped: string[] = []

  for (const [key, value] of Object.entries(payload)) {
    if (FORBIDDEN_KEY_PATTERN.test(key)) {
      dropped.push(key)
      continue
    }
    if (typeof value === 'string' && value.length > MAX_EVENT_VALUE_LENGTH) {
      dropped.push(key)
      continue
    }
    clean[key] = value
  }

  return { clean, dropped }
}

/**
 * SINK — jaring satu arah untuk TEST (dan review desain).
 *
 * Kenapa ada: `@vercel/analytics` menembak ke jaringan (`window.va`), jadi event
 * yang benar-benar terkirim TIDAK bisa diperiksa test. Dengan sink, test bisa
 * membuktikan "aksi ini menembak event ini", bukan cuma membaca kode dan
 * percaya. Pola yang sama dengan `setOnlineOverride()` di `lib/connection.ts`:
 * di produksi fungsi ini tidak dipanggil siapa pun.
 */
export type AnalyticsSink = (name: MoneyEventName, payload: MoneyEventPayload) => void

let sink: AnalyticsSink | null = null

export function setAnalyticsSink(next: AnalyticsSink | null): void {
  sink = next
}

/**
 * Kirim satu event aksi kritikal uang.
 *
 * Dua penjaga yang disengaja:
 *   1. DI LUAR BROWSER → tidak pernah memanggil `track()`. Library-nya
 *      MELEMPAR error di luar browser pada mode non-produksi, dan merender
 *      server (atau menjalankan test) tidak boleh pernah menggagalkan aksi uang.
 *   2. `try/catch` → analitik adalah bonus; mencatat uang yang gagal karena
 *      analitik adalah kegagalan yang jauh lebih mahal.
 */
export function trackMoneyEvent(name: MoneyEventName, payload: MoneyEventPayload = {}): void {
  const { clean, dropped } = sanitizeEventPayload(payload)

  if (dropped.length > 0 && process.env.NODE_ENV !== 'production') {
    /* bukan `throw`: payload kotor adalah bug pemanggil, dan bug itu tidak
       boleh membatalkan aksi user yang sedang menyimpan uangnya */
    console.warn(
      `[analytics] ${name}: ${dropped.length} kunci dibuang (uang/catatan tidak boleh dikirim): ${dropped.join(', ')}`,
    )
  }

  sink?.(name, clean)

  if (typeof window === 'undefined') return
  try {
    track(name, clean)
  } catch {
    /* diabaikan — lihat penjaga #2 */
  }
}
