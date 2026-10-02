import { describe, expect, it } from 'vitest'
import {
  HEALTH_SCORE_THRESHOLD,
  INSIGHT_MIN_CATEGORY_TX,
  INSIGHT_MIN_SAVINGS_TX,
  TRANSACTION_CATEGORY_OPTIONS,
  TRANSACTION_FALLBACK_CATEGORY,
  TRANSACTION_FIXED_CATEGORY,
  buildHistoryInsights,
  countHistoryTransactions,
  financialHealthScore,
  healthCardState,
  manualCategoryChoice,
  savingsRatePct,
  spendingSpike7d,
  type HistoryTransaction,
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

/* ── Test KALIBRASI & INSIGHT DARI DATA NYATA (paket 59 · audit #7 & #9) ──────
   Yang dikunci di sini adalah keluhan audit 28 Sep 2026: kartu hero Riwayat
   menampilkan `TOTAL_TRANSACTIONS = 24` dan `HEALTH_SCORE = 72` — dua angka yang
   tetap tampil walau user sudah menghapus seluruh catatannya. Sekarang:

     · jumlah transaksi = baris sesi + baris seed yang masih hidup;
     · skor HANYA ada kalau benar-benar bisa dihitung dari rasio pemasukan vs
       pengeluaran user (`null` = belum bisa dihitung, bukan 0 dan bukan 72);
     · insight hanya muncul kalau angkanya lahir dari catatan — kalau tidak bisa
       dihitung, kartunya tidak ada. */

/** catatan uji: nominal positif + arah lewat `type` (bentuk `HistoryTransaction`) */
function tx(
  type: TransactionType,
  amount: number,
  date: string,
  category = TRANSACTION_FALLBACK_CATEGORY,
): HistoryTransaction {
  return {
    id: 1,
    name: 'Catatan uji',
    amount,
    type,
    category,
    wallet: 'BCA',
    date,
    time: '08:00',
    aiGenerated: false,
  }
}

/** n catatan pengeluaran kecil di satu tanggal — untuk menguji ambang data */
function expenses(count: number, date = '2026-09-20'): HistoryTransaction[] {
  return Array.from({ length: count }, (_, index) => tx('expense', 10_000 + index, date))
}

describe('jumlah transaksi NYATA user (59.1)', () => {
  it('menjumlahkan baris sesi + baris seed yang masih hidup', () => {
    expect(countHistoryTransactions({ session: 3, seedAlive: 16 })).toBe(19)
    expect(countHistoryTransactions({ session: 0, seedAlive: 0 })).toBe(0)
  })

  it('nilai tidak masuk akal (negatif / NaN) dihitung sebagai 0, bukan angka negatif', () => {
    expect(countHistoryTransactions({ session: -5, seedAlive: Number.NaN })).toBe(0)
    expect(countHistoryTransactions({ session: 2.7, seedAlive: 1 })).toBe(3)
  })
})

describe('skor kewarasan: hanya saat datanya cukup & bisa dihitung', () => {
  it('di bawah ambang PRD (30) skornya BELUM ada — bukan 0, bukan 72', () => {
    const txs = [tx('income', 7_500_000, '2026-09-24', 'Gaji Utama'), ...expenses(20)]
    expect(txs.length).toBe(21)
    expect(financialHealthScore(txs)).toBeNull()
  })

  it('0 catatan tidak bisa dihitung sama sekali', () => {
    expect(financialHealthScore([])).toBeNull()
    expect(savingsRatePct([])).toBeNull()
  })

  it('data cukup tapi belum ada pemasukan → tetap null (rasio tanpa pembagi)', () => {
    const txs = expenses(HEALTH_SCORE_THRESHOLD)
    expect(savingsRatePct(txs)).toBeNull()
    expect(financialHealthScore(txs)).toBeNull()
  })

  it('data cukup + ada pemasukan → skor dari rasio nyata (bukan konstanta)', () => {
    /* pemasukan 10.000.000; pengeluaran = 6.000.000 + Σ(10.000…10.027) = 6.280.378
       → rasio sisih round((10.000.000 − 6.280.378) / 10.000.000 × 100) = 37%
       → skor = 37 / 50 × 100 = 74 (skala: menyisihkan 50% = 100, PRD 2A.5) */
    const txs = [
      tx('income', 10_000_000, '2026-09-24', 'Gaji Utama'),
      tx('expense', 6_000_000, '2026-09-25', 'Tagihan'),
      ...expenses(28),
    ]
    expect(txs.length).toBe(HEALTH_SCORE_THRESHOLD)
    expect(savingsRatePct(txs)).toBe(37)
    expect(financialHealthScore(txs)).toBe(74)
  })

  it('pindah dana antar dompet tidak menaikkan skor (net worth tidak berubah)', () => {
    const base = [tx('income', 10_000_000, '2026-09-24', 'Gaji Utama'), ...expenses(29)]
    const withTransfer = [...base, tx('transfer', 5_000_000, '2026-09-25', 'Transfer')]
    expect(savingsRatePct(withTransfer)).toBe(savingsRatePct(base))
  })
})

describe('keadaan kartu hero (59.1) — dipisah DATA, bukan konstanta', () => {
  it('0 catatan = empty (halaman menampilkan empty state jujur)', () => {
    expect(healthCardState({ totalTransactions: 0, score: null })).toBe('empty')
  })

  it('24 catatan = kalibrasi (data belum cukup untuk metrik apa pun)', () => {
    expect(healthCardState({ totalTransactions: 24, score: null })).toBe('calibrating')
  })

  it('30 catatan tanpa pemasukan = no-income — bukan skor 72', () => {
    expect(healthCardState({ totalTransactions: 30, score: null })).toBe('no-income')
  })

  it('skor yang benar-benar terhitung = ready', () => {
    expect(healthCardState({ totalTransactions: 30, score: 80 })).toBe('ready')
  })
})

describe('insight AI dari catatan user (59.1)', () => {
  it('tanpa catatan: TIDAK ada satu insight pun (bukan angka contoh)', () => {
    expect(buildHistoryInsights([], '2026-09-28')).toEqual([])
  })

  it('tanpa jendela pembanding, spike mingguan tidak dikarang', () => {
    const txs = [tx('expense', 50_000, '2026-09-27', 'Makanan')]
    expect(spendingSpike7d(txs, '2026-09-28')).toBeNull()
  })

  it('spike memakai persen yang DIHITUNG dari dua jendela nyata', () => {
    const txs = [
      /* jendela sebelumnya (16 Sep): Kopi 4 × 25.000 = 100.000 */
      ...expenses(4, '2026-09-16').map((item) => ({ ...item, category: 'Kopi', amount: 25_000 })),
      /* hari ini & sekitarnya (26 Sep): Kopi 4 × 50.000 = 200.000 → naik 100% */
      ...expenses(4, '2026-09-26').map((item) => ({ ...item, category: 'Kopi', amount: 50_000 })),
    ]
    expect(spendingSpike7d(txs, '2026-09-28')).toEqual({ category: 'Kopi', pct: 100 })
  })

  it('insight bulanan memakai rasio & kategori NYATA, bukan 22% / Makanan', () => {
    const txs = [
      tx('income', 4_000_000, '2026-09-10', 'Gaji Utama'),
      tx('expense', 1_200_000, '2026-09-12', 'Tagihan'),
      tx('expense', 300_000, '2026-09-13', 'Hiburan'),
      ...expenses(INSIGHT_MIN_SAVINGS_TX, '2026-09-14'),
    ]
    const insights = buildHistoryInsights(txs, '2026-09-28')
    const savings = insights.find((item) => item.id === 'savings-rate')
    const category = insights.find((item) => item.id === 'category-trend')

    /* rasio nyata: (4.000.000 − 1.600.000) / 4.000.000 = 60% */
    expect(savings?.copy).toContain('60%')
    expect(savings?.copy).not.toContain('22%')
    /* kategori terbesar nyata = Tagihan (1,2 jt dari 1,6 jt = 75%) */
    expect(category?.copy).toContain('Tagihan')
    expect(category?.copy).toContain('75%')
    expect(category?.copy).not.toContain('Makanan')
  })

  it('tiap insight punya jalan keluar (bukan dead-end) & tidak ada angka karangan', () => {
    const txs = [
      tx('income', 4_000_000, '2026-09-10', 'Gaji Utama'),
      ...expenses(INSIGHT_MIN_CATEGORY_TX + 3, '2026-09-14'),
    ]
    const insights = buildHistoryInsights(txs, '2026-09-28')
    expect(insights.length).toBeGreaterThan(0)
    for (const insight of insights) {
      expect(insight.actions.length).toBeGreaterThan(0)
      for (const action of insight.actions) {
        /* rutenya harus menunjuk halaman yang benar-benar ada di app */
        expect(action.href.startsWith('/')).toBe(true)
        expect(action.label.length).toBeGreaterThan(3)
      }
    }
    /* tanpa jendela minggu sebelumnya, kartu spike memang tidak muncul */
    expect(insights.map((item) => item.id)).not.toContain('spending-spike')
  })

  it('ambang bulanan dihormati: catatan tipis tidak menghasilkan klaim bulanan', () => {
    const txs = expenses(INSIGHT_MIN_CATEGORY_TX - 1, '2026-09-14')
    expect(buildHistoryInsights(txs, '2026-09-28')).toEqual([])
    /* 10 catatan (>= ambang kategori) tapi tanpa pemasukan → cuma trend kategori */
    const more = expenses(INSIGHT_MIN_SAVINGS_TX, '2026-09-14')
    expect(buildHistoryInsights(more, '2026-09-28').map((item) => item.id)).toEqual([
      'category-trend',
    ])
  })
})
