import { describe, expect, it } from 'vitest'
import {
  WEEKLY_RECAP_DAYS,
  WEEK_PERIOD,
  weeklyPlantStage,
  weeklyRecapFrom,
  weekPeriodLabel,
} from './weekly-recap'
import { HOME_DISTRIBUTION_PALETTE, type HomeMoneyRow } from './data/home-money'

/* ── RENTANG PEKAN REKAP = TURUNAN DARI "HARI INI" (audit Temporal Desync) ──
   Dulu labelnya literal `'22–28 Sep 2024'`, jadi rekap yang dibuka 2 Oktober
   tetap menyebut pekan September (dan tahun 2024). `weekPeriodLabel()` sekarang
   menghitung pekan Senin–Minggu dari tanggal perangkat lewat
   `periodWindow('weekly')` — sumber tanggal yang sama dengan tab Mingguan
   /budget. Test ini mengunci bahwa batas pekannya BERGERAK. */
describe('weekPeriodLabel · batas pekan dinamis (audit Temporal Desync)', () => {
  it('Kamis 2 Okt 2026 → pekan 28 Sep – 4 Okt (bukan 22–28 Sep)', () => {
    /* 2026-10-02 jatuh Kamis; pekan Senin–Minggu-nya mulai 28 Sep */
    expect(weekPeriodLabel('2026-10-02')).toBe('28 Sep – 4 Okt')
  })

  it('Minggu 27 Sep 2026 → pekan yang sama (21–27 Sep) dengan jangkar seed', () => {
    expect(weekPeriodLabel('2026-09-27')).toBe('21–27 Sep')
    expect(WEEK_PERIOD).toBe('21–27 Sep')
  })

  it('dua tanggal di pekan yang sama menghasilkan label yang identik', () => {
    expect(weekPeriodLabel('2026-10-01')).toBe(weekPeriodLabel('2026-10-04'))
  })
})

/* ── ANGKA REKAP = TURUNAN LEDGER, BUKAN `WEEK_DATA` ────────────────────────
   Dulu `WEEK_DATA`/`WEEK_SEGMENTS`/`WEEK_PLANT` adalah konstanta (9 transaksi ·
   8,5 jt masuk · 1,24 jt keluar · 5 kategori contoh) yang tampil apa pun isi
   ledger user. Test ini mengunci bahwa `weeklyRecapFrom()` benar-benar membaca
   baris yang dikirim: nominal, jumlah, kategori, hari aktif, dan tahap tanaman
   semuanya bergerak bersama catatan user — dan baris di luar pekan / pindah
   dana tidak dihitung sebagai pengeluaran. */

/** pekan 2 Okt 2026 = 28 Sep – 4 Okt */
const TODAY = '2026-10-02'

function row(over: Partial<HomeMoneyRow> & Pick<HomeMoneyRow, 'date' | 'amount' | 'type'>): HomeMoneyRow {
  return {
    id: `r-${over.date}-${over.amount}-${over.type}`,
    name: 'Baris',
    category: 'Makanan',
    time: '08:00',
    ...over,
  }
}

describe('weeklyRecapFrom · seluruh angka dari ledger NYATA', () => {
  it('pekan kosong → semua nol, tanpa kategori, dan ditandai `empty`', () => {
    const recap = weeklyRecapFrom([], TODAY)
    expect(recap.empty).toBe(true)
    expect(recap.transactions).toBe(0)
    expect(recap.income).toBe(0)
    expect(recap.expense).toBe(0)
    expect(recap.net).toBe(0)
    expect(recap.segments).toEqual([])
    expect(recap.top).toBeNull()
    expect(recap.activeDays).toBe(0)
    expect(recap.periodLabel).toBe('28 Sep – 4 Okt')
  })

  it('menghitung pemasukan/pengeluaran/jumlah + saving rate dari baris pekan', () => {
    const recap = weeklyRecapFrom(
      [
        row({ date: '2026-10-01', amount: 5_000_000, type: 'income', category: 'Pemasukan' }),
        row({ date: '2026-10-01', amount: 500_000, type: 'expense', category: 'Makanan' }),
        row({ date: '2026-10-02', amount: 100_000, type: 'expense', category: 'Transport' }),
      ],
      TODAY,
    )
    expect(recap.transactions).toBe(3)
    expect(recap.income).toBe(5_000_000)
    expect(recap.expense).toBe(600_000)
    expect(recap.net).toBe(4_400_000)
    expect(recap.spentPct).toBe(12)
    expect(recap.keptPct).toBe(88)
    expect(recap.savingPct).toBe(88)
    expect(recap.empty).toBe(false)
  })

  it('baris DI LUAR pekan tidak ikut (batas pekan dinamis dihormati)', () => {
    const recap = weeklyRecapFrom(
      [
        row({ date: '2026-09-21', amount: 999_000, type: 'expense' }), // pekan sebelumnya
        row({ date: '2026-10-05', amount: 888_000, type: 'expense' }), // pekan berikutnya
        row({ date: '2026-10-02', amount: 40_000, type: 'expense' }),
      ],
      TODAY,
    )
    expect(recap.expense).toBe(40_000)
    expect(recap.transactions).toBe(1)
  })

  it('pindah dana & setoran tabungan NETRAL (sama dengan kartu Home)', () => {
    const recap = weeklyRecapFrom(
      [
        row({ date: '2026-10-02', amount: 300_000, type: 'income' }),
        row({ date: '2026-10-02', amount: 250_000, type: 'transfer' }),
        row({ date: '2026-10-02', amount: 100_000, type: 'saving' }),
      ],
      TODAY,
    )
    expect(recap.income).toBe(300_000)
    expect(recap.expense).toBe(0) // transfer & saving tidak dihitung keluar
    expect(recap.segments).toEqual([])
  })

  it('kategori: urut menurun, berwarna palet kanon, >4 digabung "Lainnya"', () => {
    const recap = weeklyRecapFrom(
      [
        row({ date: '2026-10-02', amount: 500_000, type: 'expense', category: 'A' }),
        row({ date: '2026-10-02', amount: 400_000, type: 'expense', category: 'B' }),
        row({ date: '2026-10-02', amount: 300_000, type: 'expense', category: 'C' }),
        row({ date: '2026-10-02', amount: 200_000, type: 'expense', category: 'D' }),
        row({ date: '2026-10-02', amount: 100_000, type: 'expense', category: 'E' }),
      ],
      TODAY,
    )
    expect(recap.segments.map((s) => s.label)).toEqual(['A', 'B', 'C', 'D', 'Lainnya'])
    expect(recap.segments[4].amount).toBe(100_000)
    expect(recap.top?.label).toBe('A')
    expect(recap.segments[0].color).toBe(HOME_DISTRIBUTION_PALETTE[0])
    expect(recap.segments[1].color).toBe(HOME_DISTRIBUTION_PALETTE[1])
    /* Σ kategori = total pengeluaran (definisi expense-only yang sama) */
    expect(recap.segments.reduce((sum, s) => sum + s.amount, 0)).toBe(recap.expense)
  })

  it('hari aktif & tahap tanaman dari konsistensi pekan (bukan angka contoh)', () => {
    const recap = weeklyRecapFrom(
      [
        row({ date: '2026-09-28', amount: 10_000, type: 'expense' }),
        row({ date: '2026-09-28', amount: 20_000, type: 'expense' }), // tanggal sama
        row({ date: '2026-10-01', amount: 30_000, type: 'expense' }),
        row({ date: '2026-10-03', amount: 40_000, type: 'expense' }),
        row({ date: '2026-10-04', amount: 50_000, type: 'expense' }),
      ],
      TODAY,
    )
    expect(recap.activeDays).toBe(4) // 28 Sep, 1, 3, 4 Okt (duplikat dihitung sekali)
    expect(recap.plantStage).toBe(3) // 4 hari → Tanaman Muda
  })

  it('rata-rata/hari = pengeluaran ÷ 7', () => {
    const recap = weeklyRecapFrom(
      [row({ date: '2026-10-02', amount: 700_000, type: 'expense' })],
      TODAY,
    )
    expect(recap.avgPerDay).toBe(700_000 / WEEKLY_RECAP_DAYS)
  })
})

describe('weeklyPlantStage · pemetaan hari aktif → tahap', () => {
  it('0–1 hari Benih · 2–3 Tunas · 4–5 Muda · 6–7 Berbunga', () => {
    expect(weeklyPlantStage(0)).toBe(1)
    expect(weeklyPlantStage(1)).toBe(1)
    expect(weeklyPlantStage(3)).toBe(2)
    expect(weeklyPlantStage(5)).toBe(3)
    expect(weeklyPlantStage(6)).toBe(4)
    expect(weeklyPlantStage(7)).toBe(4)
  })
})
