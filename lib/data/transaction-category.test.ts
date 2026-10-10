import { describe, expect, it } from 'vitest'
import {
  CATEGORY_VISUAL_KEYS,
  FALLBACK_CATEGORY_VISUAL_KEY,
  categoryVisualKey,
  moneyToneFor,
} from './transaction-category'
import { MONEY_TONE } from './history'

/* ── SATU TABEL WARNA KATEGORI UNTUK SEMUA DAFTAR TRANSAKSI (paket 78) ───────
   Test ini mengunci tiga janji yang membuat warna kategori bisa dipakai di
   halaman mana pun tanpa rasa takut:

     1. nama kanon Dashboard TIDAK berubah warnanya (tabelnya pindah rumah, bukan
        diganti) — kalau ini gagal, user melihat warna berbeda untuk kategori
        yang sama di dua halaman;
     2. pemetaan TIDAK PERNAH `undefined`: kategori kosong, asing, atau katalog
        yang tidak punya keluarga warna selalu jatuh ke satu kunci fallback;
     3. nada nominal (`moneyToneFor`) cuma menunjuk ke `MONEY_TONE` — tidak ada
        tabel tone kedua yang bisa menyimpang. */

describe('categoryVisualKey · warna kanon Dashboard tidak bergeser', () => {
  it('lima nama kanon memetakan ke keluarganya sendiri', () => {
    expect(categoryVisualKey('Makanan')).toBe('makanan')
    expect(categoryVisualKey('Transportasi')).toBe('transportasi')
    expect(categoryVisualKey('Belanja')).toBe('belanja')
    expect(categoryVisualKey('Tagihan')).toBe('tagihan')
    expect(categoryVisualKey('Gaji Utama')).toBe('gaji-utama')
  })

  it('sinonim seed lama ikut memetakan ke keluarga yang sama', () => {
    expect(categoryVisualKey('Makanan & Minuman')).toBe('makanan')
    expect(categoryVisualKey('Transport')).toBe('transportasi')
    /* slot kategori yang dulu berisi nama TYPE (paket mapping DB → UI) tidak
       kehilangan warnanya */
    expect(categoryVisualKey('Pemasukan')).toBe('gaji-utama')
    expect(categoryVisualKey('Pemasukan Lain')).toBe('gaji-utama')
  })

  it('tidak peduli huruf besar/kecil dan spasi di tepi', () => {
    expect(categoryVisualKey('  MAKANAN  ')).toBe('makanan')
    expect(categoryVisualKey('gaji utama')).toBe('gaji-utama')
  })
})

describe('categoryVisualKey · subkategori katalog mewarisi grupnya', () => {
  it('empat grup dengan makna jelas memakai keluarga Dashboard', () => {
    expect(categoryVisualKey('Kopi & Minuman')).toBe('makanan')
    expect(categoryVisualKey('Belanja Dapur')).toBe('makanan')
    expect(categoryVisualKey('Ojek Online')).toBe('transportasi')
    expect(categoryVisualKey('Bensin')).toBe('transportasi')
    expect(categoryVisualKey('Belanja Online')).toBe('belanja')
    expect(categoryVisualKey('Kos & Sewa')).toBe('tagihan')
    expect(categoryVisualKey('Listrik')).toBe('tagihan')
  })

  it('grup tanpa keluarga warna yang jelas TIDAK ditebak → fallback', () => {
    expect(categoryVisualKey('Bioskop')).toBe(FALLBACK_CATEGORY_VISUAL_KEY)
    expect(categoryVisualKey('Obat & Apotek')).toBe(FALLBACK_CATEGORY_VISUAL_KEY)
    expect(categoryVisualKey('Kursus & Les')).toBe(FALLBACK_CATEGORY_VISUAL_KEY)
  })
})

describe('categoryVisualKey · fallback yang jujur, tidak pernah undefined', () => {
  it('kategori kosong / null / undefined jatuh ke kunci fallback', () => {
    expect(categoryVisualKey('')).toBe(FALLBACK_CATEGORY_VISUAL_KEY)
    expect(categoryVisualKey('   ')).toBe(FALLBACK_CATEGORY_VISUAL_KEY)
    expect(categoryVisualKey(null)).toBe(FALLBACK_CATEGORY_VISUAL_KEY)
    expect(categoryVisualKey(undefined)).toBe(FALLBACK_CATEGORY_VISUAL_KEY)
  })

  it('pindah dana & kategori karangan tetap fallback (bukan keluarga karangan)', () => {
    expect(categoryVisualKey('Transfer')).toBe(FALLBACK_CATEGORY_VISUAL_KEY)
    expect(categoryVisualKey('Tabungan')).toBe(FALLBACK_CATEGORY_VISUAL_KEY)
    expect(categoryVisualKey('Dana Darurat')).toBe(FALLBACK_CATEGORY_VISUAL_KEY)
    expect(categoryVisualKey('Kategori Karangan Orang')).toBe(FALLBACK_CATEGORY_VISUAL_KEY)
  })

  it('hasilnya SELALU salah satu kunci yang punya visual', () => {
    const samples = [
      'Makanan',
      'Kopi & Minuman',
      'Listrik',
      'Bioskop',
      '',
      'entah apa ini',
      'Gaji Utama',
    ]
    for (const sample of samples) {
      expect(CATEGORY_VISUAL_KEYS).toContain(categoryVisualKey(sample))
    }
  })
})

describe('moneyToneFor · nada nominal cuma menunjuk MONEY_TONE', () => {
  it('setiap tipe transaksi mengembalikan entri yang sama persis', () => {
    expect(moneyToneFor('income')).toBe(MONEY_TONE.income)
    expect(moneyToneFor('expense')).toBe(MONEY_TONE.expense)
    expect(moneyToneFor('saving')).toBe(MONEY_TONE.saving)
    expect(moneyToneFor('transfer')).toBe(MONEY_TONE.transfer)
  })

  it('uang keluar terracotta & pindah dana netral — bahasa warna kanon', () => {
    expect(moneyToneFor('expense').text).toBe('text-hud-terracotta')
    expect(moneyToneFor('saving').text).toBe(moneyToneFor('transfer').text)
  })
})
