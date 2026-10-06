/* ── SISTEM KATEGORI TRANSAKSI — 9 GRUP (paket 69) ────────────────────────────
   Masalah yang ditutup file ini: pemilih kategori di form catat transaksi dulu
   cuma `<select>` berisi 12 label kanon (`TRANSACTION_CATEGORY_OPTIONS`). 12 item
   masih bisa dibaca, tapi begitu daftarnya tumbuh ke 40+ subkategori (yang
   memang dibutuhkan orang untuk tahu uangnya habis ke mana), daftar datar jadi
   mustahil digulir. Solusinya bukan menghapus kategori, tapi MENYUSUNNYA:

     Layer 1  Quick Pick   → 6 kategori yang paling sering dipakai user (2 baris × 3)
     Layer 2  Semua Grup   → 9 grup besar, tap grup → subkategori terbuka
     Layer 3  Search       → fuzzy match real-time sebagai jaring pengaman terakhir

   ATURAN FILE (CONTEXT-WAJIB §2 · "data & logika murni, tanpa React"):
     · seluruh data & turunan murni (pencarian, quick pick) hidup di sini;
     · seluruh kalimat yang dibaca user ada di `CATEGORY_PICKER_COPY` — nol string
       user-facing ditulis di JSX komponen (kontrak §4);
     · komponen HANYA menyusun tampilan; urutan/skor/isi daftar ditentukan di sini
       supaya bisa diuji tanpa DOM (`lib/data/categories.test.ts`).

   🚧 Di produksi: `GET /api/categories` (tabel `categories` + RLS) mengembalikan
   bentuk yang sama; `quickPickCategories()` tinggal disuapi `recent`/`frequent`
   dari histori pemakaian user, bukan konstanta mock di bawah. Nama kategori
   TETAP label yang tersimpan di baris transaksi (bukan id), supaya Riwayat,
   donat distribusi, dan laporan AI membandingkan periode per nama yang sama. */

/** warna aksen grup — nama token palet kanon (docs/theme/PALETTE.md) */
export type CategoryTone = 'cantelope' | 'plum' | 'thistle' | 'daisy' | 'leaf' | 'forest'

export type CategoryGroupId =
  | 'makan'
  | 'transportasi'
  | 'belanja'
  | 'hiburan'
  | 'kesehatan'
  | 'tagihan'
  | 'pendidikan'
  | 'keuangan'
  | 'sosial'

/** satu subkategori yang benar-benar dipilih user (labelnya yang tersimpan) */
export interface SubCategory {
  /** slug stabil — dipakai sebagai React key & id a11y (bukan nilai tersimpan) */
  id: string
  /** label yang tersimpan di baris transaksi (mis. 'Kopi & Minuman') */
  name: string
  emoji: string
  /** contoh isi (mis. 'Kopi, boba, jus') — ikut dicari saat user mengetik */
  examples: string
}

export interface CategoryGroup {
  id: CategoryGroupId
  /** nama grup yang tampil di Layer 2 (mis. 'Makan & Minum') */
  name: string
  emoji: string
  tone: CategoryTone
  /** kata kunci grup — dipakai fuzzy search supaya "makan" tetap menemukan grupnya */
  keywords: string[]
  items: SubCategory[]
}

/** baris ringkas: [nama, emoji, contoh] — supaya daftar di bawah tetap terbaca */
type Row = [name: string, emoji: string, examples: string]

/**
 * slug dari label — sengaja bukan hash: dua label yang kebetulan sama tetap
 * mendapat id yang sama, dan itu memang benar untuk React key.
 */
export function slugify(label: string): string {
  return label
    .toLowerCase()
    .replace(/&/g, ' dan ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

function makeGroup(
  id: CategoryGroupId,
  name: string,
  emoji: string,
  tone: CategoryTone,
  keywords: string[],
  rows: Row[],
): CategoryGroup {
  return {
    id,
    name,
    emoji,
    tone,
    keywords,
    items: rows.map(([itemName, itemEmoji, examples]) => ({
      id: slugify(itemName),
      name: itemName,
      emoji: itemEmoji,
      examples,
    })),
  }
}

/* ── 9 GRUP PENGELUARAN ──────────────────────────────────────────────────────
   Warna aksen konsisten ke seluruh app (input modal → donat → laporan): peta
   token → kelas Tailwind-nya ada di komponen pemilih, bukan di sini, supaya file
   ini tetap murni data (nol kelas CSS). */
export const EXPENSE_GROUPS: CategoryGroup[] = [
  makeGroup('makan', 'Makan & Minum', '🍜', 'cantelope', ['makan', 'minum', 'lapar', 'kuliner'], [
    ['Makan di Luar', '🍽️', 'Warteg, restoran, warung'],
    ['Kopi & Minuman', '☕', 'Kopi, boba, jus'],
    ['Delivery Makanan', '📦', 'GoFood, ShopeeFood, GrabFood'],
    ['Belanja Dapur', '🛒', 'Beras, sayur, bumbu'],
    ['Jajan & Snack', '🍿', 'Indomaret, Alfamart, gorengan'],
  ]),
  makeGroup('transportasi', 'Transportasi', '🚗', 'thistle', ['transport', 'jalan', 'pergi', 'mobil', 'motor'], [
    ['Ojek Online', '🛵', 'Gojek, Grab, Maxim'],
    ['Bensin', '⛽', 'SPBU, Pertamina'],
    ['Parkir', '🅿️', 'Parkir mall, jalan'],
    ['Transportasi Umum', '🚇', 'KRL, MRT, Transjakarta, bus'],
    ['Tol', '🛣️', 'E-toll, jalan tol'],
    ['Servis Kendaraan', '🔧', 'Bengkel, ganti oli, ban'],
  ]),
  makeGroup('belanja', 'Belanja', '🛍️', 'plum', ['beli', 'shopping', 'barang'], [
    ['Fashion & Pakaian', '👕', 'Baju, sepatu, tas'],
    ['Elektronik & Gadget', '📱', 'HP, earbuds, charger'],
    ['Perawatan Rumah', '🏠', 'Furniture, alat kebersihan'],
    ['Hobi & Koleksi', '🎨', 'Alat lukis, figure, alat musik'],
    ['Belanja Online', '🛒', 'Shopee, Tokopedia, Lazada'],
    ['Aksesoris', '💍', 'Jam, perhiasan, dompet'],
  ]),
  makeGroup('hiburan', 'Hiburan & Gaya Hidup', '🎮', 'daisy', ['hiburan', 'fun', 'main', 'senang'], [
    ['Streaming', '📺', 'Netflix, Spotify, Disney+'],
    ['Game', '🎮', 'Top up, in-app purchase'],
    ['Bioskop', '🎬', 'CGV, XXI, Cinepolis'],
    ['Konser & Event', '🎵', 'Tiket konser, festival'],
    ['Olahraga', '🏋️', 'Gym, futsal, renang'],
    ['Traveling', '✈️', 'Hotel, tiket pesawat, wisata'],
  ]),
  makeGroup('kesehatan', 'Kesehatan & Kecantikan', '💆', 'leaf', ['sehat', 'cantik', 'dokter', 'obat'], [
    ['Obat & Apotek', '💊', 'Apotek, obat bebas'],
    ['Dokter & RS', '🏥', 'Konsultasi, rawat inap'],
    ['Skincare', '🧴', 'Moisturizer, sunscreen, toner'],
    ['Makeup', '💄', 'Kosmetik, alat makeup'],
    ['Salon & Barbershop', '✂️', 'Potong rambut, hair treatment'],
    ['Suplemen & Vitamin', '💪', 'Vitamin, protein shake'],
  ]),
  makeGroup('tagihan', 'Tagihan & Rumah', '🏠', 'forest', ['tagihan', 'bayar', 'rumah', 'bulanan', 'utilitas'], [
    ['Kos & Sewa', '🏠', 'Bayar kos, kontrakan'],
    ['Listrik', '⚡', 'PLN, token listrik'],
    ['Air', '💧', 'PDAM, galon'],
    ['Internet & Wi-Fi', '📶', 'IndiHome, Biznet, First Media'],
    ['Pulsa & Paket Data', '📡', 'Telkomsel, XL, Indosat'],
    ['Gas', '🔥', 'Gas LPG, Pertamax'],
  ]),
  makeGroup('pendidikan', 'Pendidikan & Pengembangan Diri', '📚', 'thistle', ['belajar', 'sekolah', 'kuliah', 'ilmu'], [
    ['Kursus & Les', '📖', 'Udemy, kursus online/offline'],
    ['Buku', '📚', 'Buku, e-book'],
    ['Alat Tulis & ATK', '✏️', 'Pulpen, buku catatan, printer'],
    ['Seminar & Workshop', '🎤', 'Tiket seminar, webinar'],
    ['Sekolah & Kampus', '🎓', 'SPP, UKT, biaya kuliah'],
  ]),
  makeGroup('keuangan', 'Keuangan & Transfer', '💸', 'leaf', ['uang', 'finansial', 'transfer', 'investasi'], [
    ['Transfer', '💸', 'Transfer antar rekening/orang'],
    ['Cicilan', '📋', 'Cicilan HP, motor, kartu kredit'],
    ['Investasi', '📈', 'Reksa dana, saham, kripto'],
    ['Tabungan', '🐷', 'Celengan, dana darurat'],
    ['Asuransi', '🛡️', 'BPJS, asuransi jiwa/kendaraan'],
    ['Pajak', '🧾', 'PPN, PPh'],
  ]),
  makeGroup('sosial', 'Sosial & Lain-lain', '🤝', 'plum', ['sosial', 'orang', 'bagi'], [
    ['Hadiah & Kado', '🎁', 'Kado ulang tahun, nikahan'],
    ['Donasi & Sedekah', '🤲', 'Zakat, infaq, donasi'],
    ['Arisan', '💰', 'Bayar arisan RT/kantor'],
    ['Keluarga', '👨‍👩‍👧', 'Kiriman ke ortu, jajan anak'],
    ['Hewan Peliharaan', '🐾', 'Makanan kucing/anjing, vet'],
    ['Lainnya', '📌', 'Yang nggak masuk kategori manapun'],
  ]),
]

/* ── KATEGORI PEMASUKAN (jauh lebih simpel — 7 item) ──────────────────────────
   Sengaja BUKAN grup: jumlahnya sedikit, jadi pemilihnya cukup satu daftar
   chips di dalam sheet yang sama (pemilih menyesuaikan `variant`). */
export const INCOME_CATEGORIES: SubCategory[] = (
  [
    ['Gaji', '💼', 'Gaji bulanan, THR, bonus'],
    ['Freelance / Proyek', '💻', 'Proyek lepas, komisi'],
    ['Bisnis / Jualan', '🏪', 'Omzet warung, toko online'],
    ['Hadiah / Kado Uang', '🎁', 'Angpao, kado uang'],
    ['Investasi / Dividen', '📈', 'Dividen, bunga, capital gain'],
    ['Transfer Masuk', '💸', 'Ditransfer orang lain'],
    ['Lainnya', '📌', 'Pemasukan di luar daftar'],
  ] as Row[]
).map(([name, emoji, examples]) => ({ id: slugify(name), name, emoji, examples }))

/* ── TURUNAN MURNI ─────────────────────────────────────────────────────────── */

/** subkategori + grup induknya — bentuk yang dipakai Layer 2 & Layer 3 */
export interface FlatCategory extends SubCategory {
  groupId: CategoryGroupId
  groupName: string
  groupEmoji: string
  tone: CategoryTone
}

/** seluruh subkategori pengeluaran, rata — urutannya persis urutan grup */
export const EXPENSE_CATEGORIES: FlatCategory[] = EXPENSE_GROUPS.flatMap((group) =>
  group.items.map((item) => ({
    ...item,
    groupId: group.id,
    groupName: group.name,
    groupEmoji: group.emoji,
    tone: group.tone,
  })),
)

/** semua nama kategori yang sah disimpan jalur manual (pengeluaran + pemasukan) */
export const KNOWN_CATEGORY_NAMES: string[] = [
  ...EXPENSE_CATEGORIES.map((item) => item.name),
  ...INCOME_CATEGORIES.map((item) => item.name),
]

/** kategori ini dikenali sistem? (dipakai `isCanonicalCategory` di history.ts) */
export function isKnownCategoryName(name: string): boolean {
  return KNOWN_CATEGORY_NAMES.includes(name.trim())
}

/** cari kategori pengeluaran dari namanya (untuk emoji & grup di Riwayat) */
export function expenseCategoryByName(name: string): FlatCategory | null {
  const key = name.trim().toLowerCase()
  return EXPENSE_CATEGORIES.find((item) => item.name.toLowerCase() === key) ?? null
}

/** id grup dari nama kategori — dipakai Riwayat untuk bucket filter kategori */
export function categoryGroupIdOf(name: string): CategoryGroupId | null {
  return expenseCategoryByName(name)?.groupId ?? null
}

/** jarak edit Levenshtein — dipakai memberi toleransi typo ("kofi" ≈ "kopi") */
function editDistance(a: string, b: string): number {
  if (a === b) return 0
  const m = a.length
  const n = b.length
  if (m === 0) return n
  if (n === 0) return m

  let prev: number[] = Array.from({ length: n + 1 }, (_, index) => index)
  for (let i = 1; i <= m; i += 1) {
    const curr: number[] = [i]
    for (let j = 1; j <= n; j += 1) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1
      curr[j] = Math.min(prev[j] + 1, curr[j - 1] + 1, prev[j - 1] + cost)
    }
    prev = curr
  }
  return prev[n]
}

/**
 * FUZZY MATCH (Layer 3) — sengaja toleran sama typo & singkatan orang. Urutan
 * jalurnya menentukan skor, dari yang paling yakin:
 *   1. sama persis                 → 1000;
 *   2. prefix                      → "kop" menemukan "Kopi & Minuman";
 *   3. substring                   → "minuman" menemukan "Kopi & Minuman";
 *   4. per-kata dengan jarak edit  → typo "kofi" tetap menemukan "Kopi";
 *   5. subsequence huruf berurutan → singkatan "kpn" → "Kopi & Minuman";
 *   6. -1                          → tidak cocok sama sekali.
 * Pencarian dilakukan ke nama kategori, nama grup, contoh, dan kata kunci grup,
 * supaya "gofood" (contoh) maupun "makan" (kata kunci grup) dua-duanya hidup.
 */
export function fuzzyScore(haystack: string, query: string): number {
  const toWords = (value: string) =>
    value
      .toLowerCase()
      .replace(/&/g, ' dan ')
      .replace(/[^a-z0-9]+/g, ' ')
      .trim()
  const text = toWords(haystack)
  const needle = toWords(query)
  if (!text || !needle) return -1

  const packed = text.replace(/ /g, '')
  const packedNeedle = needle.replace(/ /g, '')
  if (packed === packedNeedle) return 1000
  if (packed.startsWith(packedNeedle)) return 900 - packed.length
  const at = packed.indexOf(packedNeedle)
  if (at >= 0) return 700 - at * 4 - packed.length

  /* typo: bandingkan per kata; toleransi menyesuaikan panjang kata */
  const tolerance = packedNeedle.length <= 4 ? 1 : packedNeedle.length <= 8 ? 2 : 3
  let best = -1
  for (const word of text.split(' ')) {
    if (Math.abs(word.length - packedNeedle.length) > tolerance) continue
    const distance = editDistance(word, packedNeedle)
    if (distance <= tolerance) best = Math.max(best, 500 - distance * 60 - packed.length)
  }
  if (best >= 0) return best

  /* subsequence: huruf query muncul berurutan (singkatan user) */
  let cursor = 0
  for (const char of packedNeedle) {
    const found = packed.indexOf(char, cursor)
    if (found < 0) return -1
    cursor = found + 1
  }
  return 300 - packed.length
}


export interface CategorySearchHit {
  category: FlatCategory
  score: number
}

/**
 * Hasil pencarian Layer 3 — sudah terurut dari yang paling cocok, dan dedup
 * kalau satu kategori cocok lewat lebih dari satu jalur (nama + contoh).
 * `query` kosong DILARANG dipakai memanggil ini; pemanggil yang menentukan
 * kapan Layer 3 hidup (`query.trim().length > 0`).
 */
export function searchCategories(query: string, limit = 40): CategorySearchHit[] {
  const needle = query.trim()
  if (!needle) return []

  const hits: CategorySearchHit[] = []
  for (const category of EXPENSE_CATEGORIES) {
    const fields = [
      category.name,
      category.examples,
      category.groupName,
      ...EXPENSE_GROUPS.find((group) => group.id === category.groupId)!.keywords,
    ]
    let best = -1
    for (const field of fields) best = Math.max(best, fuzzyScore(field, needle))
    if (best >= 0) hits.push({ category, score: best })
  }

  return hits
    .sort((a, b) => b.score - a.score || a.category.name.localeCompare(b.category.name, 'id'))
    .slice(0, limit)
}

/* ── LAYER 1 · QUICK PICK ────────────────────────────────────────────────────
   Enam kategori pertama yang ditawarkan. Aturan produk: 4 kategori TERAKHIR
   dipakai + 2 PALING SERING dipakai bulan ini. Di demo ini dua daftar itu mock
   (di produksi datang dari histori user), tapi penggabungannya sudah MURNI:
   yang terakhir dipakai menang duluan, duplikat dibuang, hasilnya selalu 6. */
export const MOCK_RECENT_CATEGORY_NAMES = [
  'Kopi & Minuman',
  'Ojek Online',
  'Makan di Luar',
  'Delivery Makanan',
]

export const MOCK_FREQUENT_CATEGORY_NAMES = ['Belanja Dapur', 'Kos & Sewa']

/**
 * Gabungkan daftar "terakhir dipakai" & "paling sering" jadi tepat `count`
 * kategori Quick Pick. Kategori yang tidak dikenal (mis. sisa data lama)
 * dibuang diam-diam dari layar TAPI tidak pernah menggeser jumlah: kalau
 * kekurangan, daftar ditambal dari katalog supaya grid 3×2 tidak pernah bolong.
 */
export function quickPickCategories(
  recent: readonly string[] = MOCK_RECENT_CATEGORY_NAMES,
  frequent: readonly string[] = MOCK_FREQUENT_CATEGORY_NAMES,
  count = 6,
): FlatCategory[] {
  const picked: FlatCategory[] = []
  const seen = new Set<string>()
  for (const name of [...recent, ...frequent]) {
    const category = expenseCategoryByName(name)
    if (!category || seen.has(category.id)) continue
    seen.add(category.id)
    picked.push(category)
    if (picked.length === count) return picked
  }
  for (const category of EXPENSE_CATEGORIES) {
    if (seen.has(category.id)) continue
    seen.add(category.id)
    picked.push(category)
    if (picked.length === count) break
  }
  return picked
}

/* ── COPY PEMILIH KATEGORI (kontrak §4 — nol string user-facing di JSX) ─────── */
export const CATEGORY_PICKER_COPY = {
  /** label field di form + judul sheet */
  label: 'Kategori',
  sheetTitle: 'Pilih Kategori',
  /** opsi kosong pada trigger — bukan kategori, jadi tidak boleh tersimpan */
  placeholder: 'Pilih kategori…',

  /** Layer 1 */
  quickTitle: 'Sering dipakai',
  quickHint: 'Ketuk buat langsung pakai.',
  viewAll: 'Lihat Semua Kategori',

  /** Layer 2 */
  allTitle: 'Semua Kategori',
  allHint: (groups: number, items: number) => `${groups} grup · ${items} kategori`,
  /** subjudul per grup di Layer 2 — jumlah isinya disebut apa adanya */
  groupCount: (count: number) => `${count} kategori`,
  back: 'Kembali',

  /** Layer 3 */
  searchPlaceholder: 'Cari kategori…',
  searchLabel: 'Cari kategori',
  searchClear: 'Hapus pencarian',
  resultTitle: (count: number) => `${count} hasil`,
  /** satu hasil pun tetap disebut, bukan "1 hasil" yang terasa kaku di demo */
  resultEmpty: (query: string) => `Nggak ada kategori yang cocok sama “${query}”.`,
  resultEmptyHint: 'Coba kata lain — misal “kopi”, “bensin”, atau “kos”.',
  /** baris kecil di satu hasil: "Makan & Minum · Kopi, boba, jus" */
  resultMeta: (group: string, examples: string) => `${group} · ${examples}`,

  /** a11y */
  openLabel: 'Pilih kategori transaksi',
  closeLabel: 'Tutup pemilih kategori',
  groupToggleLabel: (name: string) => `Buka kategori ${name}`,

  /** pemilih pemasukan — jumlahnya sedikit, jadi langsung chips (tanpa Layer 2/3) */
  incomeTitle: 'Pilih Kategori Pemasukan',
  incomeHint: 'Pemasukan nggak perlu dipecah detail — tujuh pilihan ini sudah cukup.',
} as const

