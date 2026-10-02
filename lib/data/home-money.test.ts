import { describe, expect, it } from 'vitest'
import {
  activeLedgerDays,
  distributionSegments,
  groupHomeMoneyRows,
  homeCashFlowSeries,
  homeMoneyGroupLabel,
  homeRowsInLastDays,
  shouldShowDailyNudge,
  type HomeMoneyRow,
} from './home-money'
import type { HistoryTransaction } from './history'

/* ── TURUNAN KARTU UANG HOME (paket 58) ──────────────────────────────────────
   Paket 58 memindahkan SUMBER angka kartu Home dari konstanta `HOME_MONEY_ROWS`
   ke baris ledger NYATA (`useMoneyStore()`). Semua perhitungannya hidup sebagai
   fungsi MURNI di `lib/data/home-money.ts` supaya bisa diuji tanpa React &
   tanpa browser — pola yang sama dengan test `lib/data/*` lainnya.

   AC yang dikunci di sini:
     · 58.1  — kartu tidak lagi membaca konstanta demo (terbukti dari input
               fungsi: yang diuji cuma baris NYATA milik user);
     · 58.2  — catat 1 pengeluaran Makanan Rp 30.000 → distribusi = Makanan
               30.000 (100%), bukan 3.150.000 contoh;
     · 58.3  — `activeDays` = jumlah TANGGAL unik di ledger bulan berjalan;
     · 58.6  — daftar Transaksi Terakhir dibatasi 7 hari kalender terakhir. */

/** "hari ini" uji — sama dengan tanggal audit (28 Sep 2026) supaya bukti laporan
 *  bisa direproduksi apa adanya; fungsi-fungsinya sendiri bebas tanggal. */
const TODAY = '2026-09-28'

function row(
  partial: Partial<HomeMoneyRow> & Pick<HomeMoneyRow, 'id' | 'date' | 'amount' | 'type'>,
): HomeMoneyRow {
  return {
    name: 'Catatan',
    category: 'Makanan',
    time: '12:00',
    ...partial,
  }
}

function tx(partial: Partial<HistoryTransaction> & Pick<HistoryTransaction, 'id' | 'date'>): HistoryTransaction {
  return {
    name: 'Catatan',
    amount: 10_000,
    type: 'expense',
    category: 'Makanan',
    wallet: 'BCA',
    time: '12:00',
    aiGenerated: false,
    ...partial,
  }
}

describe('homeRowsInLastDays — daftar Home dibatasi 7 hari kalender (58.6)', () => {
  const rows = [
    row({ id: 'a', date: '2026-09-28', amount: 1_000, type: 'expense' }),
    row({ id: 'b', date: '2026-09-22', amount: 2_000, type: 'expense' }),
    row({ id: 'c', date: '2026-09-21', amount: 3_000, type: 'expense' }),
    row({ id: 'd', date: '2026-10-01', amount: 4_000, type: 'expense' }),
  ]

  it('hari ini & 6 hari sebelumnya ikut, yang lebih tua / di masa depan tidak', () => {
    const kept = homeRowsInLastDays(rows, TODAY)
    expect(kept.map((r) => r.id)).toEqual(['a', 'b'])
  })

  it('sebelum "hari ini" diketahui (render server) baris tidak disaring — hidrasi aman', () => {
    expect(homeRowsInLastDays(rows, '').map((r) => r.id)).toEqual(['a', 'b', 'c', 'd'])
  })

  it('batasnya bisa diperlebar/dipersempit lewat argumen `days`', () => {
    expect(homeRowsInLastDays(rows, TODAY, 1).map((r) => r.id)).toEqual(['a'])
  })
})

describe('groupHomeMoneyRows — label grup dari tanggal NYATA (bukan teks seed)', () => {
  const rows = [
    row({ id: 'today-1', date: TODAY, amount: 25_000, type: 'expense' }),
    row({ id: 'today-2', date: TODAY, amount: 90_000, type: 'income' }),
    row({ id: 'yesterday', date: '2026-09-27', amount: 42_000, type: 'expense' }),
    row({ id: 'older', date: '2026-09-21', amount: 350_000, type: 'expense' }),
  ]

  it('label "Hari ini" / "Kemarin" / "21 Sep" & hanya grup hari ini yang live', () => {
    const groups = groupHomeMoneyRows(rows, TODAY)
    expect(groups.map((g) => g.label)).toEqual(['Hari ini', 'Kemarin', '21 Sep'])
    expect(groups.map((g) => g.live === true)).toEqual([true, false, false])
    expect(groups[0]?.rows.map((r) => r.id)).toEqual(['today-1', 'today-2'])
  })

  it('urutannya tanggal terbaru dulu', () => {
    const groups = groupHomeMoneyRows(rows, TODAY)
    expect(groups.map((g) => g.rows[0]?.date)).toEqual([TODAY, '2026-09-27', '2026-09-21'])
  })

  it('tanpa baris → tanpa grup (empty state yang dirender kartu, bukan grup kosong)', () => {
    expect(groupHomeMoneyRows([], TODAY)).toEqual([])
  })

  it('label cadangan sebelum "hari ini" diketahui tetap menyebut tanggalnya', () => {
    expect(homeMoneyGroupLabel(TODAY, '')).toBe('28 Sep')
  })
})

describe('distributionSegments — turunan dari pengeluaran NYATA (58.2)', () => {
  it('catat 1 pengeluaran Makanan Rp 30.000 → Makanan 30.000 (100%)', () => {
    const segs = distributionSegments([
      row({ id: 's-1', date: TODAY, amount: 30_000, type: 'expense', category: 'Makanan' }),
    ])
    expect(segs).toEqual([{ label: 'Makanan', amount: 30_000, pct: 100 }])
  })

  it('pemasukan, tabungan, & pindah dana NETRAL — tidak menjadi segmen', () => {
    const segs = distributionSegments([
      row({ id: 's-1', date: TODAY, amount: 5_000_000, type: 'income', category: 'Gaji Utama' }),
      row({ id: 's-2', date: TODAY, amount: 100_000, type: 'saving', category: 'Tabungan' }),
      row({ id: 's-3', date: TODAY, amount: 250_000, type: 'transfer', category: 'Lainnya' }),
      row({ id: 's-4', date: TODAY, amount: 120_000, type: 'expense', category: 'Makanan' }),
      row({ id: 's-5', date: TODAY, amount: 80_000, type: 'expense', category: 'Transport' }),
    ])
    expect(segs).toEqual([
      { label: 'Makanan', amount: 120_000, pct: 60 },
      { label: 'Transport', amount: 80_000, pct: 40 },
    ])
  })

  it('kategori di atas 4 digabung jujur ke "Lainnya" (bar tetap bisa dibaca)', () => {
    const segs = distributionSegments([
      row({ id: 's-1', date: TODAY, amount: 500_000, type: 'expense', category: 'A' }),
      row({ id: 's-2', date: TODAY, amount: 400_000, type: 'expense', category: 'B' }),
      row({ id: 's-3', date: TODAY, amount: 300_000, type: 'expense', category: 'C' }),
      row({ id: 's-4', date: TODAY, amount: 200_000, type: 'expense', category: 'D' }),
      row({ id: 's-5', date: TODAY, amount: 100_000, type: 'expense', category: 'E' }),
      row({ id: 's-6', date: TODAY, amount: 50_000, type: 'expense', category: 'F' }),
    ])
    expect(segs.map((s) => s.label)).toEqual(['A', 'B', 'C', 'D', 'Lainnya'])
    expect(segs[4]).toEqual({ label: 'Lainnya', amount: 150_000, pct: 10 })
  })

  it('tanpa pengeluaran → kosong (kartu merender empty state, bukan segmen contoh)', () => {
    expect(distributionSegments([])).toEqual([])
    expect(distributionSegments([row({ id: 's-1', date: TODAY, amount: 0, type: 'expense' })])).toEqual([])
  })
})

describe('activeLedgerDays — hari aktif tanaman dari LEDGER, bukan angka 21 (58.3)', () => {
  it('menghitung TANGGAL unik bulan berjalan (dua catatan sehari = 1 hari)', () => {
    const days = activeLedgerDays(
      [
        tx({ id: 1, date: '2026-09-28' }),
        tx({ id: 2, date: '2026-09-28' }),
        tx({ id: 3, date: '2026-09-01' }),
        tx({ id: 4, date: '2026-08-31' }),
      ],
      TODAY,
    )
    expect(days).toBe(2)
  })

  it('ledger kosong → 0 (tanpa mock 21 hari)', () => {
    expect(activeLedgerDays([], TODAY)).toBe(0)
  })

  it('sebelum "hari ini" diketahui, semua tanggal dihitung — hidrasi aman', () => {
    const days = activeLedgerDays(
      [tx({ id: 1, date: '2026-09-28' }), tx({ id: 2, date: '2026-08-31' })],
      '',
    )
    expect(days).toBe(2)
  })
})

describe('homeCashFlowSeries — seri pekan mengikuti bulan NYATA (58.1)', () => {
  const rows = [
    row({ id: 'w1', date: '2026-09-02', amount: 100_000, type: 'income' }),
    row({ id: 'w2', date: '2026-09-21', amount: 40_000, type: 'expense' }),
    row({ id: 'w3', date: '2026-08-30', amount: 900_000, type: 'expense' }),
  ]

  it('membagi baris ke pekan 1-5 & memberi label bulan yang diminta', () => {
    const series = homeCashFlowSeries(rows, '2026-09')
    expect(series.map((p) => p.label)).toEqual([
      '1 Sep',
      '8 Sep',
      '15 Sep',
      '22 Sep',
      '29 Sep',
    ])
    expect(series[0]?.income).toBe(100_000)
    expect(series[2]?.expense).toBe(40_000)
  })

  it('baris di luar bulan itu tidak masuk seri "Bulan ini"', () => {
    const series = homeCashFlowSeries(rows, '2026-09')
    const total = series.reduce((sum, p) => sum + p.expense, 0)
    expect(total).toBe(40_000)
  })

  it('tanpa bulan (pemakaian lama) semua baris tetap dibucket seperti sebelumnya', () => {
    const series = homeCashFlowSeries(rows)
    const total = series.reduce((sum, p) => sum + p.expense, 0)
    expect(total).toBe(940_000)
  })
})

describe('shouldShowDailyNudge — pemicu nudge dari data NYATA (58.4)', () => {
  it('tanpa catatan hari ini & sudah sore → muncul', () => {
    expect(shouldShowDailyNudge({ hour: 15, hasRecordToday: false, accountEmpty: false })).toBe(true)
  })

  it('sudah ada catatan hari ini → TIDAK muncul (dulu selalu muncul karena konstanta)', () => {
    expect(shouldShowDailyNudge({ hour: 20, hasRecordToday: true, accountEmpty: false })).toBe(false)
  })

  it('sebelum sore / jam belum diketahui / akun kosong → tidak muncul', () => {
    expect(shouldShowDailyNudge({ hour: 9, hasRecordToday: false, accountEmpty: false })).toBe(false)
    expect(shouldShowDailyNudge({ hour: null, hasRecordToday: false, accountEmpty: false })).toBe(false)
    expect(shouldShowDailyNudge({ hour: 20, hasRecordToday: false, accountEmpty: true })).toBe(false)
  })

  it('mode demo memaksa tampil — kecuali akunnya kosong', () => {
    expect(
      shouldShowDailyNudge({ hour: 9, hasRecordToday: true, accountEmpty: false, forceShow: true }),
    ).toBe(true)
    expect(
      shouldShowDailyNudge({ hour: 9, hasRecordToday: false, accountEmpty: true, forceShow: true }),
    ).toBe(false)
  })
})
