import { categoryGroupIdOf, type CategoryGroupId } from './categories'
import { MONEY_TONE } from './history'
import type { TransactionType } from '../types'

/* ── KUNCI VISUAL KATEGORI TRANSAKSI (paket 78) ──────────────────────────────
   Satu bahasa warna kategori untuk SEMUA daftar transaksi (Dashboard, Riwayat &
   Insight, Dompet Detail, Kalender). Sebelum paket 78 tabelnya cuma hidup di
   dalam `recent-transactions-card.tsx` (paket 68), jadi daftar di halaman
   Riwayat tampil polos tanpa warna kategori — dua halaman yang menampilkan
   transaksi yang SAMA membaca bahasa visual yang berbeda. Keluhan pemilik
   produk: "port warna kategori dari Dashboard ke Riwayat & Insight".

   File ini menyimpan bagian MURNI-nya saja (nama kategori → kunci keluarga
   warna) dan TIDAK memuat satu kelas CSS pun: kelas Tailwind-nya hidup di
   komponen (`components/catetind/transaction-category-visual.tsx`) supaya
   `lib/data/*` tetap murni tanpa komponen (aturan yang sudah berlaku sejak
   paket 68). Efeknya: aturan pemetaan bisa diuji tanpa DOM — termasuk kasus
   "kategori tak dikenal", yang harus jujur jatuh ke satu kunci fallback
   alih-alih menebak keluarga warna.

   URUTAN PEMETAAN (dari yang paling yakin):
     1. nama kanon Dashboard — "Makanan", "Transportasi", "Belanja",
        "Tagihan", "Gaji Utama" — plus sinonim seed lama ("Makanan & Minuman",
        "Transport", "Pemasukan"). Warna yang sudah dilihat user di Dashboard
        TIDAK boleh bergeser hanya karena tabelnya pindah rumah;
     2. nama subkategori katalog (`lib/data/categories.ts`): keluarga warnanya
        diambil dari GRUP katalognya (makan / transportasi / belanja / tagihan),
        jadi "Kopi & Minuman", "Ojek Online", atau "Kos & Sewa" ikut berwarna;
     3. sisanya → `lainnya` (sage). Sengaja BUKAN keluarga keenam karangan:
        kategori yang maknanya tidak jelas cukup ditandai "lain-lain", dan
        halaman tetap gampang dipindai.
   ───────────────────────────────────────────────────────────────────────── */

/**
 * keluarga warna kategori di semua daftar transaksi.
 * Hanya lima keluarga (persis tabel Dashboard paket 68) + satu fallback —
 * jadi tidak ada warna baru yang masuk palet.
 */
export type CategoryVisualKey =
  | 'makanan'
  | 'transportasi'
  | 'belanja'
  | 'tagihan'
  | 'gaji-utama'
  | 'lainnya'

/** urutan kanon (dipakai test; kelak bisa dipakai legenda kategori) */
export const CATEGORY_VISUAL_KEYS: readonly CategoryVisualKey[] = [
  'makanan',
  'transportasi',
  'belanja',
  'tagihan',
  'gaji-utama',
  'lainnya',
]

/** kategori yang belum/tidak bisa dipetakan SELALU jatuh ke kunci ini */
export const FALLBACK_CATEGORY_VISUAL_KEY: CategoryVisualKey = 'lainnya'

/** nama kategori (huruf kecil) → keluarga warna kanon (langkah 1 di atas) */
const NAME_VISUAL: Record<string, CategoryVisualKey> = {
  makanan: 'makanan',
  /* nama seed lama di kartu Dashboard */
  'makanan & minuman': 'makanan',
  transportasi: 'transportasi',
  transport: 'transportasi',
  belanja: 'belanja',
  tagihan: 'tagihan',
  'gaji utama': 'gaji-utama',
  /* slot ketiga baris transaksi (paket mapping DB → UI, lihat
     `resolveCategoryLabel`) tidak boleh kehilangan warnanya */
  pemasukan: 'gaji-utama',
  'pemasukan lain': 'gaji-utama',
}

/**
 * grup katalog → keluarga warna (langkah 2).
 *
 * Hanya grup yang maknanya tidak ambigu. Grup lain (hiburan, kesehatan,
 * pendidikan, keuangan, sosial) sengaja TIDAK dipetakan: tidak ada keluarga
 * warna yang benar-benar cocok di tabel Dashboard, dan menebak berarti
 * memindahkan warna kategori yang sudah dipakai user di tempat lain.
 */
const GROUP_VISUAL: Partial<Record<CategoryGroupId, CategoryVisualKey>> = {
  makan: 'makanan',
  transportasi: 'transportasi',
  belanja: 'belanja',
  tagihan: 'tagihan',
}

/**
 * nama kategori apa pun → kunci keluarga warna.
 *
 * Total: kategori kosong, kategori asing (data lama / kiriman backend), dan
 * kategori katalog yang belum punya keluarga warna sama-sama jatuh ke
 * `FALLBACK_CATEGORY_VISUAL_KEY` — tidak pernah `undefined`, jadi pemanggil
 * tidak perlu menulis fallback kedua di JSX.
 */
export function categoryVisualKey(category: string | null | undefined): CategoryVisualKey {
  const name = (category ?? '').trim()
  if (!name) return FALLBACK_CATEGORY_VISUAL_KEY

  const known = NAME_VISUAL[name.toLowerCase()]
  if (known) return known

  const group = categoryGroupIdOf(name)
  return (group && GROUP_VISUAL[group]) || FALLBACK_CATEGORY_VISUAL_KEY
}

/**
 * Warna nominal (teks) untuk satu tipe transaksi — SATU sumber, `MONEY_TONE`
 * di `lib/data/history.ts`.
 *
 * Kenapa ada di sini: sampai paket 77 nominal di kartu "Transaksi Terakhir"
 * Dashboard memakai tabel KEDUA (`ROW_TONE` di komponen) yang nilainya tidak
 * sama dengan `MONEY_TONE` (pengeluaran ditulis hijau pudar, padahal halaman
 * Riwayat memakai terracotta). Sejak paket 78 nominal di semua daftar
 * transaksi membaca satu peta ini.
 */
export function moneyToneFor(type: TransactionType) {
  return MONEY_TONE[type]
}
