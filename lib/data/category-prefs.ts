/* ── KATEGORI: DAFTAR & PREFERENSI (paket 62) ─────────────────────────────────
   Panel "Kustomisasi Kategori" di Pengaturan menyimpan DUA hal di localStorage
   `catet-category-prefs`:

     1. `hidden` — id kategori BAWAAN yang disembunyikan dari daftar pilihan;
     2. `custom` — kategori buatan user (emoji + nama).

   Sebelum paket 62 seluruh kalimat panel ini hidup di dalam JSX komponen, dan
   hapus kategori kustom terjadi SEKETIKA — tanpa konfirmasi, tanpa Undo — padahal
   itu aksi merusak yang menghapus sesuatu milik user. Dua hal itu diperbaiki di
   sini sekaligus:
     · SEMUA copy pindah ke lapis data (kontrak `CONTEXT-WAJIB` §4: copy
       user-facing wajib konstanta bernama di `lib/data/*`, bukan literal di JSX);
     · hapus/pulihkan jadi fungsi MURNI (`removeCategory`/`restoreCategory`)
       sehingga perilakunya bisa diuji tanpa React — termasuk "kembali ke urutan
       semula" yang gampang sekali salah kalau ditulis sebagai `filter` di
       komponen.

   ⚠️ BATAS YANG DITULIS APA ADANYA DI UI (`storageNote`): daftar ini tersimpan di
   perangkat ini dan BELUM tersambung ke pemilih kategori di form catat transaksi
   (form itu memakai `TRANSACTION_CATEGORY_OPTIONS`). Menyambungkannya butuh
   kategori sebagai data user di backend — di luar lingkup paket ini, jadi yang
   dipilih adalah mengatakannya, bukan membiarkan panel menjanjikan sesuatu yang
   tidak terjadi.

   🚧 Di produksi: `GET/PATCH /api/categories` (tabel `categories` + RLS), dan
   `hidden` jadi kolom `is_hidden` — fungsi murni di file ini tetap dipakai apa
   adanya sebagai logika layarnya. */

/** satu kategori (bawaan maupun kustom) — bentuknya sama supaya bisa satu daftar */
export interface CategoryItem {
  id: string
  emoji: string
  name: string
}

/** bentuk yang disimpan di localStorage `catet-category-prefs` */
export interface CategoryPrefs {
  /** id kategori BAWAAN yang disembunyikan user */
  hidden: string[]
  /** kategori buatan user, urutannya apa adanya (kustom terbaru di bawah) */
  custom: CategoryItem[]
}

/** key penyimpanan preferensi kategori (satu-satunya nama key di app) */
export const CATEGORY_PREFS_STORAGE_KEY = 'catet-category-prefs'

/**
 * Kategori BAWAAN — TIDAK BISA DIHAPUS, hanya bisa disembunyikan.
 *
 * Alasannya bukan teknis: laporan, insight, dan heatmap membandingkan periode
 * per kategori, jadi kategori bawaannya harus tetap ada di data walau user tidak
 * suka namanya. Yang ditawarkan ke user adalah MENYEMBUNYIKAN — dan itu sekarang
 * dijelaskan di layar (`CATEGORY_PREFS_COPY.defaultExplain`), bukan dibiarkan
 * sebagai tombol hapus yang tidak ada.
 */
export const DEFAULT_CATEGORIES: CategoryItem[] = [
  { id: 'makanan', emoji: '🍜', name: 'Makanan' },
  { id: 'transportasi', emoji: '🛵', name: 'Transportasi' },
  { id: 'hiburan', emoji: '🎬', name: 'Hiburan' },
  { id: 'belanja', emoji: '🧺', name: 'Belanja' },
  { id: 'tagihan', emoji: '🧾', name: 'Tagihan' },
  { id: 'kesehatan', emoji: '💊', name: 'Kesehatan' },
  { id: 'pendidikan', emoji: '📚', name: 'Pendidikan' },
  { id: 'lainnya', emoji: '🏷️', name: 'Lainnya' },
]

/** kategori kustom awal (perilaku lama dipertahankan: dua contoh siap dihapus) */
export const INITIAL_CUSTOM: CategoryItem[] = [
  { id: 'custom-1', emoji: '🎮', name: 'Top Up Game' },
  { id: 'custom-2', emoji: '☕', name: 'Kopi Harian' },
]

/** preset emoji picker inline — sengaja pendek supaya formnya tetap ringkas */
export const EMOJI_PRESETS = [
  '🍜',
  '🛵',
  '🧺',
  '🎬',
  '🧾',
  '💊',
  '📚',
  '🎮',
  '☕',
  '🎁',
  '🏠',
  '🐾',
  '✈️',
  '💅',
]


/** true = kategori ini boleh dihapus user (bawaan tidak boleh — lihat alasannya) */
export function isRemovableCategory(id: string): boolean {
  return !DEFAULT_CATEGORIES.some((item) => item.id === id)
}

/** bukti satu aksi hapus kategori: itemnya + posisinya, supaya Undo bisa pas */
export interface RemovedCategory {
  item: CategoryItem
  /** posisi item di daftar kustom saat dihapus (0-based) */
  index: number
}

/**
 * Hapus satu kategori kustom — MURNI, tanpa localStorage, tanpa React.
 *
 * `removed: null` = tidak ada yang dihapus (id-nya tidak ada / kategori bawaan),
 * dan prefs-nya dikembalikan APA ADANYA sehingga pemanggil tidak perlu tahu
 * bedanya "tidak ada" dan "gagal".
 */
export function removeCategory(
  prefs: CategoryPrefs,
  id: string,
): { prefs: CategoryPrefs; removed: RemovedCategory | null } {
  if (!isRemovableCategory(id)) return { prefs, removed: null }
  const index = prefs.custom.findIndex((item) => item.id === id)
  if (index < 0) return { prefs, removed: null }
  const item = prefs.custom[index]
  return {
    prefs: { ...prefs, custom: prefs.custom.filter((entry) => entry.id !== id) },
    removed: { item, index },
  }
}

/**
 * Undo hapus kategori: masukkan kembali DI POSISI SEMULA.
 *
 * Kalau id-nya sudah ada lagi (mis. Undo ditekan dua kali), daftarnya
 * dikembalikan apa adanya — idempoten, jadi tombol Undo yang ditekan berulang
 * tidak pernah menggandakan kategori.
 */
export function restoreCategory(prefs: CategoryPrefs, removed: RemovedCategory): CategoryPrefs {
  if (prefs.custom.some((item) => item.id === removed.item.id)) return prefs
  const custom = [...prefs.custom]
  const at = Math.min(Math.max(removed.index, 0), custom.length)
  custom.splice(at, 0, removed.item)
  return { ...prefs, custom }
}


/* ── COPY PANEL KATEGORI ────────────────────────────────────────────────────── */

export const CATEGORY_PREFS_COPY = {
  eyebrow: 'Kategori',
  title: 'Kustomisasi Kategori',
  /**
   * Kalimat ini dulunya berbunyi "Atur kategori apa saja yang muncul saat kamu
   * mencatat transaksi" — janji yang TIDAK benar: pemilih kategori di form masih
   * memakai daftar baku app. Diganti dengan kalimat yang benar + catatan batasnya
   * di bawah (`storageNote`), sesuai kanon "jujur di setiap klaim" (PRD 244).
   */
  desc: 'Simpan kategori tambahanmu di perangkat ini, dan sembunyikan kategori bawaan yang nggak kamu pakai.',

  /** ── 1. kategori bawaan ── */
  defaultTitle: 'Kategori Bawaan',
  /** penjelasan SINGKAT — tombolnya ada, jadi kenapa tidak ada tombol hapus */
  defaultDesc:
    'Cuma bisa disembunyikan — nggak bisa dihapus, biar laporan lintas bulan tetap konsisten.',
  /**
   * Penjelasan PANJANG (paket 62 · temuan audit #10): sebelum ini alasan "kenapa
   * tidak bisa dihapus" tidak pernah muncul di layar, sehingga toggle-nya terasa
   * seperti keterbatasan yang disembunyikan.
   */
  defaultExplain: (count: number) =>
    `Kenapa ${count} kategori ini nggak bisa dihapus: laporan, insight, dan peta kebiasaanmu membandingkan bulan ke bulan per kategori. Kalau salah satunya dihapus, perbandingannya kehilangan kolomnya dan angka bulan lalu ikut berubah. Kalau memang nggak kamu pakai, sembunyikan saja — catatannya tetap terbaca.`,
  visibleLabel: 'Tampil',
  hiddenLabel: 'Disembunyikan',
  toggleA11y: (name: string) => `Tampilkan kategori ${name}`,
  hideToast: 'Disembunyikan dari daftar pilihan',
  showToast: 'Muncul lagi di daftar pilihan',

  /** ── 2. kategori kustom ── */
  customTitle: 'Kategori Kustom',
  customDesc: 'Bikin, ubah, hapus sesuka kamu — tidak ada yang dikunci.',
  customEmpty: 'Belum ada kategori custom. Bikin satu di bawah 👇',
  customEmptyHint: 'Contoh: 🐾 Kucing, 💅 Perawatan, 🎁 Hadiah.',
  addCta: 'Tambah Kategori Baru',
  addFormTitle: 'Kategori Baru',
  editFormTitle: 'Edit Kategori',
  emojiLabel: 'Pilih emoji kategori',
  nameLabel: 'Nama kategori',
  namePlaceholder: 'Contoh: Kopi Harian',
  save: 'Simpan',
  cancel: 'Batal',
  /** validasi: kategori tanpa nama tidak bisa disimpan (jangan tulis setengah) */
  nameRequired: 'Nama kategorinya diisi dulu ya 🌿',
  addedToast: (emoji: string, name: string) => `${emoji} ${name} ditambahkan!`,
  updatedToast: 'Kategori diperbarui ✅',

  /** hapus: aksi merusak, jadi ada konfirmasi + Undo (paket 62) */
  deleteA11y: (name: string) => `Hapus kategori ${name}`,
  deleteOverlay: 'Batal hapus kategori',
  deleteTitle: (name: string) => `Hapus kategori “${name}”?`,
  /**
   * Dampaknya dikatakan apa adanya: kategori ini hidup di perangkat INI, dan
   * catatan lama yang memakai namanya TIDAK ikut berubah — uang yang sudah
   * tercatat bukan urusan kategorinya.
   */
  deleteBody: (name: string) =>
    `“${name}” keluar dari daftar kategori kustommu di perangkat ini. Catatan yang sudah kamu simpan tidak ikut berubah.`,
  deleteSafety: (seconds: number) =>
    `Masih bisa dibatalkan lewat tombol Undo selama ${seconds} detik setelah kamu menekannya.`,
  deleteConfirm: 'Hapus',
  deleteToast: (emoji: string, name: string) => `${emoji} ${name} dihapus`,
  deleteToastDescription: 'Kategori kustom bisa dibikin lagi kapan aja.',
  undo: 'Undo',
  undoExpired: 'Jendela Undo-nya sudah lewat — kategorinya bisa dibikin lagi kapan aja 🌿',
  undoneToast: 'Kategori dikembalikan 🌿',
  undoneDescription: 'Kategorinya balik ke posisi semula.',

  /** batas yang ditulis apa adanya, bukan disembunyikan (lihat catatan file) */
  storageNote:
    'Catatan: daftar ini tersimpan di perangkat ini. Pemilih kategori di form catat transaksi masih memakai daftar baku app (Makanan, Transportasi, …) sampai kategori jadi data user di backend.',
} as const
