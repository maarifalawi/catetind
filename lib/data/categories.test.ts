import { describe, expect, it } from 'vitest'
import {
  CATEGORY_PICKER_COPY,
  EXPENSE_CATEGORIES,
  EXPENSE_GROUPS,
  INCOME_CATEGORIES,
  KNOWN_CATEGORY_NAMES,
  categoryGroupIdOf,
  expenseCategoryByName,
  fuzzyScore,
  isKnownCategoryName,
  quickPickCategories,
  searchCategories,
  slugify,
} from './categories'

/* ── Test sistem kategori 3 layer (paket 69) ───────────────────────────────────
   Yang dijaga di sini adalah janji UX-nya, bukan "ada berapa kategori":

     1. katalognya memang 9 grup & setiap subkategori punya nama unik — kalau ada
        nama kembar, nilai yang tersimpan di baris transaksi jadi ambigu;
     2. Quick Pick SELALU berisi 6 item (grid 3×2 tidak pernah bolong) dan
        menghormati urutan "terakhir dipakai dulu";
     3. fuzzy search benar-benar toleran: "kop" → "Kopi & Minuman", dan typo
        "kofi" tetap ketemu (inilah jaring pengaman Layer 3);
     4. nama kategori yang boleh tersimpan (`isKnownCategoryName`) menyala untuk
        subkategori & kategori pemasukan, dan MATI untuk karangan seperti 'Proyek'. */

describe('katalog kategori', () => {
  it('punya 9 grup pengeluaran + 7 kategori pemasukan', () => {
    expect(EXPENSE_GROUPS).toHaveLength(9)
    expect(INCOME_CATEGORIES).toHaveLength(7)
  })

  it('tidak ada subkategori bernama kembar (nilai tersimpan harus tunggal)', () => {
    const names = EXPENSE_CATEGORIES.map((item) => item.name)
    expect(new Set(names).size).toBe(names.length)
  })

  it('setiap grup punya minimal satu subkategori & warna tone', () => {
    for (const group of EXPENSE_GROUPS) {
      expect(group.items.length).toBeGreaterThan(0)
      expect(group.tone.length).toBeGreaterThan(0)
      expect(group.emoji.length).toBeGreaterThan(0)
    }
  })

  it('slugify merapikan label jadi id yang aman', () => {
    expect(slugify('Kopi & Minuman')).toBe('kopi-dan-minuman')
    expect(slugify('  Kos / Sewa ')).toBe('kos-sewa')
  })
})

describe('lookup kategori', () => {
  it('mencari subkategori berdasarkan nama (untuk emoji & grup di Riwayat)', () => {
    const kopi = expenseCategoryByName('Kopi & Minuman')
    expect(kopi?.emoji).toBe('☕')
    expect(kopi?.groupId).toBe('makan')
    expect(expenseCategoryByName('Kategori Karangan')).toBeNull()
  })

  it('id grup menurunkan bucket filter Riwayat', () => {
    expect(categoryGroupIdOf('Ojek Online')).toBe('transportasi')
    expect(categoryGroupIdOf('Kos & Sewa')).toBe('tagihan')
    expect(categoryGroupIdOf('Bukan Kategori')).toBeNull()
  })

  it('nama yang boleh tersimpan: subkategori + pemasukan, bukan karangan', () => {
    expect(isKnownCategoryName('Kopi & Minuman')).toBe(true)
    expect(isKnownCategoryName('Freelance / Proyek')).toBe(true)
    expect(isKnownCategoryName('Proyek')).toBe(false)
    expect(KNOWN_CATEGORY_NAMES).toContain('Makan di Luar')
  })
})

describe('Layer 1 · Quick Pick', () => {
  it('selalu berisi 6 kategori walau input lebih pendek', () => {
    expect(quickPickCategories(['Kopi & Minuman'], [])).toHaveLength(6)
  })

  it('mendahulukan yang terakhir dipakai, lalu paling sering, tanpa duplikat', () => {
    const picks = quickPickCategories(['Kopi & Minuman', 'Gaji'], ['Kopi & Minuman', 'Bensin'])
    expect(picks.map((item) => item.name)).toEqual([
      'Kopi & Minuman', // terakhir dipakai
      'Bensin', // paling sering (setelah 'Gaji' dibuang: itu kategori PEMASUKAN)
      'Makan di Luar', // sisa ditambal dari katalog, urutan grup
      'Delivery Makanan',
      'Belanja Dapur',
      'Jajan & Snack',
    ])
  })

  it('nama tak dikenal dibuang tanpa menggeser jumlah', () => {
    const picks = quickPickCategories(['Proyek'], [])
    expect(picks).toHaveLength(6)
    expect(picks.map((item) => item.name)).not.toContain('Proyek')
  })
})

describe('Layer 3 · fuzzy search', () => {
  it('cocok persis & prefix dapat skor tertinggi', () => {
    expect(fuzzyScore('Kopi & Minuman', 'kopi')).toBeGreaterThan(0)
    expect(fuzzyScore('Kopi & Minuman', 'minuman')).toBeGreaterThan(0)
    expect(fuzzyScore('Kopi & Minuman', 'xyz')).toBe(-1)
  })

  it('typo ringan masih ketemu lewat subsequence', () => {
    expect(fuzzyScore('Kopi & Minuman', 'kofi')).toBeGreaterThan(0)
  })

  it('"kop" menemukan "Kopi & Minuman" sebagai hasil teratas', () => {
    const hits = searchCategories('kop')
    expect(hits[0].category.name).toBe('Kopi & Minuman')
  })

  it('mencari lewat contoh ("gofood") dan kata kunci grup ("makan")', () => {
    const gofood = searchCategories('gofood').map((hit) => hit.category.name)
    expect(gofood).toContain('Delivery Makanan')
    const makan = searchCategories('makan').map((hit) => hit.category.name)
    expect(makan).toContain('Makan di Luar')
  })

  it('query kosong tidak mengembalikan apa-apa (Layer 3 tidak hidup)', () => {
    expect(searchCategories('   ')).toEqual([])
  })
})

describe('copy pemilih kategori', () => {
  it('menyebut jumlah hasil apa adanya & punya fallback pencarian', () => {
    expect(CATEGORY_PICKER_COPY.resultTitle(3)).toContain('3')
    expect(CATEGORY_PICKER_COPY.resultEmpty('zzz')).toContain('zzz')
    expect(CATEGORY_PICKER_COPY.allHint(9, EXPENSE_CATEGORIES.length)).toContain('9')
  })
})
