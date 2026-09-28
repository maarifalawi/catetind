import { describe, expect, it } from 'vitest'
import {
  TRANSACTION_CATEGORY_OPTIONS,
  TRANSACTION_FALLBACK_CATEGORY,
  TRANSACTION_FIXED_CATEGORY,
  manualCategoryChoice,
} from './history'
import type { TransactionType } from '../types'

/* ── Test ATURAN KATEGORI JALUR MANUAL (paket 54 · uji pemakaian 28 Sep 2026) ──
   Yang dikunci di sini adalah keluhan pemilik produk:

     "Kategori di form tambah transaksi jangan otomatis — diinput manual saja
      oleh user."

   Dulu engine mengirim `type.suggested` (Pengeluaran→Makanan, Pemasukan→Gaji
   Utama, Tabungan→Dana Darurat, Transfer→Transfer) sehingga Riwayat penuh
   kategori yang tidak pernah dipilih siapa pun, sementara badge di panel
   mengaku-ngaku itu keputusan AI. Fungsi murni `manualCategoryChoice()` di
   `lib/data/history.ts` sekarang satu-satunya penentu nilai yang boleh
   tersimpan, dan engine memakainya apa adanya (bukan salinan aturannya). */

const ALL_TYPES: TransactionType[] = ['expense', 'income', 'saving', 'transfer']

describe('kategori form TAMBAH = pilihan user (bukan tebakan)', () => {
  it('pengeluaran: kategori yang tersimpan persis yang dipilih user', () => {
    expect(manualCategoryChoice({ editing: false, type: 'expense', picked: 'Makanan' })).toEqual({
      category: 'Makanan',
      needsChoice: false,
    })
    expect(
      manualCategoryChoice({ editing: false, type: 'expense', picked: 'Belanja' }).category,
    ).toBe('Belanja')
  })

  it('pemasukan: kategori yang tersimpan persis yang dipilih user', () => {
    expect(
      manualCategoryChoice({ editing: false, type: 'income', picked: 'Gaji Utama' }).category,
    ).toBe('Gaji Utama')
  })

  it('belum memilih = form TERTAHAN (bukan "Lainnya" diam-diam)', () => {
    const blocked = manualCategoryChoice({ editing: false, type: 'expense', picked: '' })
    expect(blocked).toEqual({ category: null, needsChoice: true })
    /* inilah keluhan yang ditutup: 'Lainnya' dulu tersimpan tanpa user memilih */
    expect(blocked.category).not.toBe(TRANSACTION_FALLBACK_CATEGORY)
  })

  it('tabungan & transfer memakai kategori TETAP yang memang bukan tebakan', () => {
    /* nilainya boleh apa pun yang diketik user — tipe ini tidak menanyakannya,
       dan yang tersimpan tetap label aturannya (bukan kategori karangan) */
    expect(manualCategoryChoice({ editing: false, type: 'saving', picked: '' })).toEqual({
      category: 'Tabungan',
      needsChoice: false,
    })
    expect(
      manualCategoryChoice({ editing: false, type: 'saving', picked: 'Dana Darurat' }).category,
    ).toBe('Tabungan')
    expect(
      manualCategoryChoice({ editing: false, type: 'transfer', picked: '' }).category,
    ).toBe('Transfer')
  })

  it('keempat tipe selalu menghasilkan kategori kanon — atau ditahan', () => {
    for (const type of ALL_TYPES) {
      const decided = manualCategoryChoice({ editing: false, type, picked: 'Makanan' })
      expect(decided.needsChoice).toBe(false)
      expect(TRANSACTION_CATEGORY_OPTIONS).toContain(decided.category as string)
    }
  })

  it('kategori di luar daftar kanon TIDAK BISA tersimpan dari jalur manual', () => {
    /* kasus nyata: kategori 'Proyek' dari halaman Dompet Detail — sah sebagai
       nilai lama, tapi tidak boleh jadi nilai baru dari form tambah (barisnya
       tidak akan terjaring filter kategori mana pun di Riwayat) */
    const decided = manualCategoryChoice({ editing: false, type: 'expense', picked: 'Proyek' })
    expect(decided.category).toBeNull()
    expect(decided.needsChoice).toBe(true)
  })
})

describe('mode EDIT: koreksi user dikirim, data lama tidak berubah diam-diam', () => {
  it('koreksi user menang', () => {
    expect(
      manualCategoryChoice({
        editing: true,
        type: 'expense',
        picked: 'Transportasi',
        currentCategory: 'Makanan',
      }).category,
    ).toBe('Transportasi')
  })

  it('tidak menyentuh kategori = nilai lamanya tetap dikirim apa adanya', () => {
    /* termasuk nilai yang TIDAK ada di daftar kanon: membuka form edit tidak
       boleh menulis ulang data user */
    expect(
      manualCategoryChoice({
        editing: true,
        type: 'expense',
        picked: '',
        currentCategory: 'Proyek',
      }),
    ).toEqual({ category: 'Proyek', needsChoice: false })
  })
})

describe('kategori tetap: tipe yang memang tidak bertanya ke user', () => {
  it('hanya tabungan & transfer yang punya kategori tetap, dan alasannya ada', () => {
    expect(Object.keys(TRANSACTION_FIXED_CATEGORY).sort()).toEqual(['saving', 'transfer'])
    for (const type of ALL_TYPES) {
      const fixed = TRANSACTION_FIXED_CATEGORY[type]
      if (fixed) {
        /* nilainya wajib kanon — komentar form menyebutnya apa adanya */
        expect(TRANSACTION_CATEGORY_OPTIONS).toContain(fixed.category)
        expect(fixed.reason.length).toBeGreaterThan(20)
      }
    }
  })
})
