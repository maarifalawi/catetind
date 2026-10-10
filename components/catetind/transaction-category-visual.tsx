import {
  ArrowDownLeft,
  ArrowLeftRight,
  ArrowUpRight,
  Banknote,
  Car,
  Coffee,
  ReceiptText,
  ShoppingBag,
  Zap,
  type LucideIcon,
} from 'lucide-react'
import { categoryVisualKey, moneyToneFor, type CategoryVisualKey } from '@/lib/data/transaction-category'
import type { TransactionType } from '@/lib/types'

/* ── TABEL VISUAL KATEGORI TRANSAKSI (paket 78) ──────────────────────────────
   Ini RUMAH BARU tabel yang sejak paket 68 tinggal di dalam
   `recent-transactions-card.tsx`. Alasan ia pindah: halaman Riwayat & Insight
   (`history-transaction-row.tsx`) juga menampilkan transaksi yang sama, dan
   sebelum paket 78 daftar di sana polos — dua halaman, satu data, dua bahasa
   visual. Sekarang keduanya mengimpor tabel ini, jadi warna kategori kategori
   tidak mungkin berbeda antar-daftar (Dashboard, Riwayat & Insight, Dompet
   Detail, dan kalender yang memakai baris yang sama).

   KENAPA KELASNYA DI KOMPONEN, BUKAN DI `lib/data/*`: pemetaan kategori → kunci
   keluarga warna sudah murni dan teruji di `lib/data/transaction-category.ts`,
   sedangkan ikon + kelas Tailwind adalah presentasi. Memisahkannya begini
   membuat `lib/data/*` tetap murni (aturan repo) TANPA kehilangan satu pun
   warna: kuncinya sama, kelasnya satu tabel.

   Nol warna baru: seluruh kelas di bawah meminjam palet kanon
   (`cantelope`/`thistle`/`plum`/`daisy`/`mint`/`sage`) yang sudah dipakai
   Dashboard sejak paket 68, dengan opasitas rendah supaya teks `text-forest`
   tetap kontras — penjaga palet (`scripts/theme/audit-palette.mjs`) tetap hijau.
   ───────────────────────────────────────────────────────────────────────── */

export interface CategoryVisual {
  /** ikon lucide keluarga kategori (bukan emoji, supaya seragam di semua daftar) */
  icon: LucideIcon
  /** tile ikon: gradient + drop shadow warna per keluarga (makin kuat saat hover) */
  tile: string
  /** latar baris SOFT keluarga yang sama — inilah yang membuat daftar mudah dipindai */
  row: string
  /** chip kecil di baris meta/notes (kategori + jam) — tint keluarga yang sama */
  chip: string
}

/**
 * Keluarga warna kanon → visualnya. Isinya dipindahkan APA ADANYA dari
 * Dashboard (paket 68) supaya warna yang sudah dilihat user tidak berubah;
 * yang baru hanya `chip` (paket 78) untuk baris meta/notes.
 */
export const CATEGORY_VISUAL: Record<CategoryVisualKey, CategoryVisual> = {
  makanan: {
    icon: Coffee,
    tile: 'bg-gradient-to-br from-cantelope/25 to-cantelope/10 text-cantelope shadow-[0_8px_16px_-8px_rgba(255,184,133,0.45)] group-hover:shadow-[0_14px_24px_-8px_rgba(255,184,133,0.6)]',
    row: 'bg-cantelope/[0.10] hover:bg-cantelope/[0.16]',
    chip: 'bg-cantelope/[0.16] text-forest/70',
  },
  transportasi: {
    icon: Car,
    tile: 'bg-gradient-to-br from-thistle/20 to-thistle/10 text-thistle shadow-[0_8px_16px_-8px_rgba(145,160,184,0.4)] group-hover:shadow-[0_14px_24px_-8px_rgba(145,160,184,0.55)]',
    row: 'bg-thistle/[0.10] hover:bg-thistle/[0.16]',
    chip: 'bg-thistle/[0.16] text-forest/70',
  },
  belanja: {
    icon: ShoppingBag,
    tile: 'bg-gradient-to-br from-plum/20 to-plum/10 text-plum shadow-[0_8px_16px_-8px_rgba(184,145,145,0.4)] group-hover:shadow-[0_14px_24px_-8px_rgba(184,145,145,0.55)]',
    row: 'bg-plum/[0.09] hover:bg-plum/[0.15]',
    chip: 'bg-plum/[0.14] text-forest/70',
  },
  tagihan: {
    icon: Zap,
    tile: 'bg-gradient-to-br from-daisy/25 to-daisy/10 text-forest shadow-[0_8px_16px_-8px_rgba(255,184,133,0.45)] group-hover:shadow-[0_14px_24px_-8px_rgba(255,184,133,0.6)]',
    row: 'bg-daisy/[0.13] hover:bg-daisy/[0.20]',
    chip: 'bg-daisy/[0.20] text-forest/70',
  },
  'gaji-utama': {
    icon: Banknote,
    tile: 'bg-gradient-to-br from-mint/80 to-mint/25 text-forest shadow-[0_8px_16px_-8px_rgba(145,187,158,0.55)] group-hover:shadow-[0_14px_24px_-8px_rgba(145,187,158,0.7)]',
    row: 'bg-mint/[0.14] hover:bg-mint/[0.20]',
    chip: 'bg-mint/[0.30] text-forest/70',
  },
  lainnya: {
    icon: ReceiptText,
    tile: 'bg-sage text-forest',
    row: 'bg-sage/60 hover:bg-sage/80',
    chip: 'bg-sage/70 text-forest/60',
  },
}

/** visual untuk kategori apa pun — kuncinya ditentukan `categoryVisualKey()` */
export function categoryVisualFor(category: string | null | undefined): CategoryVisual {
  return CATEGORY_VISUAL[categoryVisualKey(category)]
}

/**
 * Nada nominal + badge arah per TIPE transaksi.
 *
 * `text`-nya TIDAK ditulis di sini: ia menunjuk `MONEY_TONE` (`lib/data/history`)
 * lewat `moneyToneFor()`, jadi cuma ada SATU definisi warna nominal di app ini.
 * Sebelum paket 78 kartu Dashboard punya tabel kedua (`ROW_TONE`) yang menulis
 * pengeluaran sebagai hijau pudar — sekarang nominal pengeluaran terracotta di
 * SEMUA daftar, sesuai bahasa warna uang kanon.
 *
 * `badge` = lingkaran glyph arah di sudut tile (masuk ↙ mint, keluar ↗ plum,
 * pindah dana ⇄ tinta netral — net worth tidak berubah).
 */
export const MONEY_ROW_VISUAL: Record<
  TransactionType,
  { text: string; badge: string; icon: LucideIcon }
> = {
  income: { text: moneyToneFor('income').text, badge: 'bg-mint text-forest', icon: ArrowDownLeft },
  expense: { text: moneyToneFor('expense').text, badge: 'bg-plum text-cream', icon: ArrowUpRight },
  saving: { text: moneyToneFor('saving').text, badge: 'bg-ink/30 text-cream', icon: ArrowLeftRight },
  transfer: {
    text: moneyToneFor('transfer').text,
    badge: 'bg-ink/30 text-cream',
    icon: ArrowLeftRight,
  },
}

/** visual nominal/badge satu tipe — total, tidak pernah `undefined` */
export function moneyRowVisualFor(type: TransactionType) {
  return MONEY_ROW_VISUAL[type]
}
