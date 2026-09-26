import { formatIDR } from '../wallets'
import type { HistoryTransaction } from './history'

/* ── Modal Tambah Dompet & Sheet Pindah Saldo (paket 04) ─────────────────────
   Satu tempat untuk SEMUA kalimat yang dilihat user di dua alur baru halaman
   Dompet & Akun (aturan repo: tidak ada string copy yang ditulis di JSX).
   Nada kopya mengikuti PRD 2A.4 / CONTEXT §5: menemani, bukan menyalahkan —
   pesan gagal pun dibaca seperti teman yang mengingatkan, bukan alarm merah.
   ────────────────────────────────────────────────────────────────────────── */

/**
 * Tanggal "hari ini" versi mock — SENGAJA konstanta, bukan `new Date()`.
 * Pola repo (TODAY_ISO di lib/data/budget.ts): tanggal dipatok supaya HTML
 * hasil render server & client identik, dan demo tidak berubah-ubah mengikuti
 * jam mesin. Tanggalnya disamakan dengan data dompet di lib/data/wallet-detail.ts.
 */
export const WALLET_TODAY_ISO = '2026-09-27'

export const ADD_WALLET_SHEET_COPY = {
  title: 'Tambah Dompet',
  description: 'Dompet baru langsung ikut kehitung di Total Saldo.',
  previewLabel: 'Kartunya bakal kelihatan seperti ini',
  /** nama kartu saat field nama masih kosong (preview tidak boleh kosong) */
  previewFallbackName: 'Dompet Baru',
  kindLabel: 'Jenis akun',
  /** pemilih brand = "pilih logo bank dari daftar" (inventaris #o) */
  brandLabel: 'Pilih bank atau e-wallet',
  brandHint: 'Ketuk salah satu — namanya langsung terisi, masih bisa diubah.',
  brandNone: 'Lainnya',
  nameLabel: 'Nama akun',
  namePlaceholder: 'Contoh: BCA Tabungan, GoPay, Dompet Tunai',
  /** bantuan kontekstual DI DALAM form, bukan link keluar ke Help Center
   *  (PRD 194–200) — keraguan paling umum saat menambah dompet kedua */
  duplicateHint: 'Boleh buat lebih dari satu akun dari platform yang sama, kok.',
  numberLabel: '4 angka terakhir',
  numberPlaceholder: '0849',
  numberHint: 'Cuma buat pajangan di kartunya — nomor aslinya nggak perlu diketik.',
  balanceLabel: 'Saldo sekarang',
  balanceHint: 'Boleh dikosongin. Nanti bisa dirapikan lewat “Sesuaikan Saldo”.',
  /** label saldo di kartu pratinjau (kata yang sama dengan muka kartu /wallet) */
  previewBalanceLabel: 'Saldo',
  submit: 'Simpan Dompet 🌿',
  toastTitle: 'Dompet baru siap 🌿',
  toastDescription: (name: string) => `${name} langsung ikut kehitung di Total Saldo.`,
} as const

export const TRANSFER_SHEET_COPY = {
  title: 'Pindah Saldo',
  description: 'Dua saldo ikut menyesuaikan sekaligus — nggak ada yang dobel.',
  fromLabel: 'Dari dompet ini',
  toLabel: 'Ke dompet mana?',
  amountLabel: 'Mau pindah berapa?',
  /** chip isi-cepat: seluruh saldo dompet sumber */
  allAmount: 'Semua',
  /** label tanggal — user tidak memilih tanggal; pindah dana selalu "hari ini" */
  dateLabel: 'Tanggal',
  today: 'Hari ini',
  noteLabel: 'Catatan',
  notePlaceholder: 'Opsional — mis. “bagi uang jajan”',
  summaryLabel: 'Ringkasan',
  /**
   * Ringkasan sebelum disimpan: `Rp 250.000 dari BCA → GoPay`.
   * Nominalnya ikut tombol mata privasi global, jadi ringkasan ini tidak
   * membocorkan angka yang sedang disembunyikan user.
   */
  summary: (amountLabel: string, from: string, to: string) => `${amountLabel} dari ${from} → ${to}`,
  /** copy menolak dengan nada menemani (BUKAN pesan error merah) */
  overBalance: (sourceName: string, balance: number) =>
    `Saldo ${sourceName} tinggal ${formatIDR(balance)} — kecilin nominalnya dulu ya.`,
  /** jaring aman kalau dompetnya cuma satu (pindah dana butuh dua sisi) */
  needSecond: 'Pindah dana butuh minimal dua dompet. Tambah dompet baru dulu ya 🌱',
  submit: 'Pindah Saldo ⇄',
  toastTitle: 'Pindah dana beres 🌿',
  toastDescription: (amount: number, from: string, to: string) =>
    `${formatIDR(amount)} dari ${from} ke ${to} — dua saldo langsung ikut menyesuaikan.`,
} as const

/* ── CATATAN PINDAH DANA (hasil TransferSheet) ────────────────────────────────
   Pindah saldo bukan cuma mengubah dua angka: ia juga CATATAN. Bentuk catatannya
   memakai `HistoryTransaction` yang sama dengan halaman Riwayat, dengan
   `type: 'transfer'` — jadi chip "pindah dana" di Riwayat/`isMoneyMovement()`
   otomatis mengenalinya, dan tidak ada tipe data kedua yang bisa berbeda makna.

   Di repo demo ini belum ada backend bersama antar-halaman, jadi catatannya
   hidup di state /wallet selama sesi (dan ditampilkan di panel "Pindah Dana
   Terakhir"). Saat Supabase aktif, INSERT ke tabel `transactions` dengan kolom
   yang persis sama — termasuk `destination_wallet_id` (Asumsi A1) — lalu daftar
   di Riwayat tinggal membaca tabel itu. */

/** satu catatan pindah dana + dua nama dompetnya (untuk pajangan "BCA → GoPay") */
export interface WalletTransferRecord {
  /** catatan versi halaman Riwayat — bukan tipe data karangan baru */
  transaction: HistoryTransaction
  fromName: string
  toName: string
  /** catatan bebas dari user — hidup di record ini karena `HistoryTransaction`
   *  milik halaman Riwayat memang tidak punya kolomnya di V1 */
  note?: string
}

/** penanda di kartu dompet yang baru ditambahkan user di sesi ini */
export const WALLET_NEW_CARD_COPY = {
  badge: 'Baru',
  /** pembaca layar: kenapa kartu ini belum punya halaman detail (masih demo) */
  ariaLabel: 'Dompet baru — belum punya halaman detail',
} as const

export const WALLET_TRANSFER_LOG_COPY = {
  title: 'Pindah Dana Terakhir',
  /** jujur menyebut bentuk catatannya supaya tidak terasa "hilang" dari Riwayat */
  hint: 'Tercatat sebagai pindah dana (⇄) — bentuk catatan yang sama dengan baris di Riwayat.',
  count: (total: number) => `${total} catatan`,
  /** penanda teks di baris catatan — sama seperti di halaman Riwayat */
  movementChip: 'pindah dana',
  /** nama catatan di Riwayat (kolom `name`) */
  transferName: (toName: string) => `Pindah ke ${toName}`,
  /** kategori yang tersimpan — salah satu nilai `TRANSACTION_CATEGORY_OPTIONS` */
  transferCategory: 'Transfer',
} as const

/** id catatan transfer — mulai dari 900 supaya tidak pernah bentrok dengan mock */
export function nextTransferId(records: WalletTransferRecord[]): number {
  return records.reduce((max, record) => Math.max(max, record.transaction.id), 899) + 1
}

/**
 * Bangun catatan pindah dana siap pakai.
 *
 * `time` datang dari pemanggil (jam lokal saat user menekan simpan) — bukan
 * dihitung di sini, supaya fungsi ini tetap murni dan tanggalnya tetap patuh
 * pada WALLET_TODAY_ISO (tanggal mock, bukan tanggal mesin).
 */
export function buildTransferRecord({
  id,
  amount,
  fromName,
  toName,
  time,
  note,
}: {
  id: number
  amount: number
  fromName: string
  toName: string
  /** jam lokal `HH:MM` saat pindah dana disimpan */
  time: string
  note?: string
}): WalletTransferRecord {
  const trimmedNote = note?.trim()
  return {
    fromName,
    toName,
    ...(trimmedNote ? { note: trimmedNote } : {}),
    transaction: {
      id,
      name: WALLET_TRANSFER_LOG_COPY.transferName(toName),
      amount,
      type: 'transfer',
      category: WALLET_TRANSFER_LOG_COPY.transferCategory,
      /* dompet yang "memiliki" catatan ini = sisi KELUAR, sama seperti transfer
         di Riwayat yang selalu dikaitkan ke dompet sumbernya */
      wallet: fromName,
      date: WALLET_TODAY_ISO,
      time,
      /* diketik user, bukan hasil parsing AI — jadi tanpa badge ✨ */
      aiGenerated: false,
    },
  }
}
