import { describe, expect, it } from 'vitest'
import {
  buildMonthlyRecap,
  monthLabelOfKey,
  previousMonthKey,
  recapPuzzleStage,
} from './monthly-review'
import type { HistoryTransaction } from './history'

/* ── RECAP BULANAN DARI CATATAN NYATA ─────────────────────────────────────────
   Sebelumnya modal Monthly Review menampilkan 12 transaksi contoh Agustus 2026
   + target Rp 3.000.000 untuk SETIAP akun ("ngga ada gua ngisi pemasukan 7,5
   jt"). Test ini mengunci janji barunya:
     · label bulan datang dari KUNCI bulan yang direkap (bukan tanggal transaksi
       terbaru), jadi panel sabar tetap menyebut bulan yang benar;
     · target yang belum pernah disimpan TIDAK dikarang jadi "0" yang lolos;
     · tahap papan puzzle turunan dari jumlah hari aktif;
     · setoran celengan/transfer tidak dihitung sebagai pengeluaran. */

function tx(
  id: number,
  date: string,
  type: HistoryTransaction['type'],
  amount: number,
): HistoryTransaction {
  return {
    id,
    name: `Catatan ${id}`,
    amount,
    type,
    category: type === 'income' ? 'Gaji Utama' : 'Lainnya',
    wallet: 'BCA',
    date,
    time: '10:00',
    aiGenerated: false,
  }
}

describe('buildMonthlyRecap · sumbernya catatan nyata', () => {
  it('label bulan dari monthKey, bukan dari tanggal transaksi', () => {
    const recap = buildMonthlyRecap([], 0, '2026-10')
    expect(recap.monthLabel).toBe('Oktober 2026')
    expect(recap.transactionCount).toBe(0)
    expect(recap.savingsRate).toBeNull()
  })

  it('target yang belum pernah disimpan tidak dianggap tercapai', () => {
    const txs = [tx(1, '2026-10-02', 'income', 5_000_000)]
    const recap = buildMonthlyRecap(txs, 0, '2026-10')
    expect(recap.targetKnown).toBe(false)
    expect(recap.targetAchieved).toBe(false)
  })

  it('target tersimpan dibandingkan dengan uang yang benar-benar disisihkan', () => {
    const txs = [
      tx(1, '2026-10-01', 'income', 5_000_000),
      tx(2, '2026-10-02', 'expense', 3_000_000),
      tx(3, '2026-10-03', 'saving', 500_000),
      tx(4, '2026-10-04', 'transfer', 200_000),
    ]
    const recap = buildMonthlyRecap(txs, 1_500_000, '2026-10')
    expect(recap.targetKnown).toBe(true)
    expect(recap.totalExpense).toBe(3_000_000) // saving/transfer BUKAN belanja
    expect(recap.setAside).toBe(700_000)
    expect(recap.savedLastMonth).toBe(2_000_000)
    expect(recap.targetAchieved).toBe(true)
  })

  it('tahap papan puzzle bulanan dari jumlah hari aktif', () => {
    expect(recapPuzzleStage(0)).toBe(1)
    expect(recapPuzzleStage(6)).toBe(1)
    expect(recapPuzzleStage(7)).toBe(2)
    expect(recapPuzzleStage(14)).toBe(3)
    expect(recapPuzzleStage(21)).toBe(4)

    const days = Array.from({ length: 14 }, (_, index) =>
      tx(index + 1, `2026-10-${`${index + 1}`.padStart(2, '0')}`, 'expense', 10_000),
    )
    expect(buildMonthlyRecap(days, 0, '2026-10').puzzleStage).toBe(3)
  })
})

describe('bantuan bulan', () => {
  it('monthLabelOfKey menulis bulan Indonesia tanpa locale mesin', () => {
    expect(monthLabelOfKey('2026-10')).toBe('Oktober 2026')
    expect(monthLabelOfKey('')).toBe('')
  })

  it('previousMonthKey melewati batas tahun', () => {
    expect(previousMonthKey('2026-11')).toBe('2026-10')
    expect(previousMonthKey('2026-01')).toBe('2025-12')
  })
})
