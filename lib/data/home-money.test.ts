import { describe, expect, it } from 'vitest'
import {
  HOME_CASHFLOW_AXIS,
  HOME_MONEY_COPY,
  activeLedgerDays,
  buildFlowMap,
  cashFlowAxisRows,
  clampChangePct,
  distributionSegments,
  groupHomeMoneyRows,
  homeCashFlowSeries,
  homeMoneyGroupLabel,
  homeRowsInLastDays,
  incomeStatsFor,
  netFlowChangePct,
  shouldShowDailyNudge,
  FLOW_SPAN,
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

  it('satu titik PER HARI sampai tanggal terakhir bulan (Sep = 30 titik)', () => {
    const series = homeCashFlowSeries(rows, '2026-09')
    expect(series).toHaveLength(30)
    expect(series[0]?.label).toBe('1 Sep')
    expect(series[29]?.label).toBe('30 Sep')
  })

  it('31 hari di Oktober → label terakhir "31 Okt" (bukan berhenti di "29")', () => {
    const series = homeCashFlowSeries([], '2026-10')
    expect(series).toHaveLength(31)
    expect(series[30]?.label).toBe('31 Okt')
  })

  it('tiap baris jatuh ke TANGGALNYA sendiri, bukan ke pekan', () => {
    const series = homeCashFlowSeries(rows, '2026-09')
    expect(series[1]?.income).toBe(100_000) // 2 Sep
    expect(series[20]?.expense).toBe(40_000) // 21 Sep
  })

  it('baris di luar bulan itu tidak masuk seri "Bulan ini"', () => {
    const series = homeCashFlowSeries(rows, '2026-09')
    const total = series.reduce((sum, p) => sum + p.expense, 0)
    expect(total).toBe(40_000)
  })

  it('tanpa bulan (render server) tetap 31 titik, dan semua baris ikut dihitung', () => {
    const series = homeCashFlowSeries(rows)
    expect(series).toHaveLength(31)
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

/* ── PETA ALIRAN ARUS UANG (paket 67) ────────────────────────────────────────
   Visual kartu Arus Uang kini ALUVIUM: satu simpul masuk memecah jadi pita
   "keluar" dan pita "disimpan". Test ini mengunci INVARIAN geometrinya —
   bukan sekadar bentuknya — karena repo ini tidak punya test komponen dan
   tata letak persennya tak bisa dilihat di lingkungan ini:

     1. SATU skala: tinggi simpul ∝ nominal, jadi `income.size / expense.size`
        = `income / expense` (mustahil "masuk 8,5 jt" setinggi "keluar 750 rb");
     2. kolom kiri & kanan berjumlah SAMA (= nominal terbesar), sehingga
        keduanya adil dibandingkan;
     3. total PORT di tiap simpul = tinggi simpulnya (pita tidak meluber). */

describe('buildFlowMap — geometri peta aliran Arus Uang (paket 67)', () => {
  const INCOME = 8_500_000
  const EXPENSE = 750_000

  it('surplus: ada simpul "Sisa", tidak ada "Defisit"', () => {
    const map = buildFlowMap(INCOME, EXPENSE)
    expect(map.deficit).toBeNull()
    expect(map.saved).not.toBeNull()
  })

  it('satu skala untuk dua kolom: rasio tinggi = rasio nominal', () => {
    const map = buildFlowMap(INCOME, EXPENSE)
    expect(map.income.size / map.expense.size).toBeCloseTo(INCOME / EXPENSE, 6)
    expect(map.income.size).toBeLessThanOrEqual(FLOW_SPAN + 1e-9)
  })

  it('defisit: uang keluar melebihi uang masuk → muncul simpul "Defisit", tanpa "Sisa"', () => {
    const map = buildFlowMap(1_000_000, 1_600_000)
    expect(map.saved).toBeNull()
    expect(map.deficit).not.toBeNull()
    /* kolom kiri (masuk + defisit) tetap sama tinggi dengan kolom kanan (keluar) */
    expect(map.income.size + (map.deficit?.size ?? 0)).toBeCloseTo(map.expense.size, 6)
  })

  it('total PORT tiap simpul = tinggi simpulnya (pita tidak pernah meluber)', () => {
    const map = buildFlowMap(INCOME, EXPENSE)
    const inNode = (node: { top: number; size: number }, point: number) =>
      point >= node.top - 1e-9 && point < node.top + node.size

    const outOfIncome = map.ribbons
      .filter((r) => inNode(map.income, r.from.top))
      .reduce((sum, r) => sum + r.from.size, 0)
    expect(outOfIncome).toBeCloseTo(map.income.size, 6)

    const intoExpense = map.ribbons
      .filter((r) => inNode(map.expense, r.to.top))
      .reduce((sum, r) => sum + r.to.size, 0)
    expect(intoExpense).toBeCloseTo(map.expense.size, 6)
  })

  it('tanpa uang bergerak: tidak ada pita & semua simpul berukuran 0', () => {
    const map = buildFlowMap(0, 0)
    expect(map.ribbons).toEqual([])
    expect(map.income.size).toBe(0)
    expect(map.expense.size).toBe(0)
    expect(map.saved).toBeNull()
    expect(map.deficit).toBeNull()
  })

  it('hanya pemasukan: satu pita "disimpan", tanpa simpul Pengeluaran', () => {
    const map = buildFlowMap(1_000_000, 0)
    expect(map.expense.size).toBe(0)
    expect(map.ribbons).toHaveLength(1)
    expect(map.ribbons[0]?.tone).toBe('in')
    expect(map.saved?.size).toBeCloseTo(map.income.size, 6)
  })
})

/* ── PERSEN PERUBAHAN DIJINAKKAN (paket 74) ───────────────────────────────────
   Badge tren di popup "Ringkasan Saldo" & kartu Pemasukan dulu bisa menampilkan
   persen yang mustahil (mis. −3.514%) saat basis bulan lalunya sangat kecil.
   Test ini mengunci tiga hal: (1) ledakan dipotong ke ±100%, (2) tanda tetap
   dipertahankan (tren memang dua arah), (3) basis nol → `null` (badge
   disembunyikan, bukan persen karangan). */

describe('persen perubahan — dijepit & tahan basis nol (paket 74)', () => {
  it('arus bersih: ledakan basis kecil dipotong ke −100% (bukan −3.512%)', () => {
    const rows = [
      row({ id: 'lalu', date: '2026-08-10', amount: 17_000, type: 'income' }),
      row({ id: 'kini', date: '2026-09-10', amount: 580_000, type: 'expense' }),
    ]
    expect(netFlowChangePct(rows, TODAY)).toBe(-100)
  })

  it('arus bersih: lonjakan besar juga dipotong ke +100%', () => {
    const rows = [
      row({ id: 'lalu', date: '2026-08-10', amount: 10_000, type: 'income' }),
      row({ id: 'kini', date: '2026-09-10', amount: 10_000_000, type: 'income' }),
    ]
    expect(netFlowChangePct(rows, TODAY)).toBe(100)
  })

  it('arus bersih: bulan lalu tanpa arus → null (badge disembunyikan)', () => {
    const rows = [row({ id: 'kini', date: '2026-09-10', amount: 50_000, type: 'expense' })]
    expect(netFlowChangePct(rows, TODAY)).toBeNull()
  })

  it('incomeStatsFor: pembagi nol → null; pembagi kecil → dijepit', () => {
    const hanyaBulanIni = [
      row({ id: 'kini', date: '2026-09-05', amount: 1_000_000, type: 'income' }),
    ]
    expect(incomeStatsFor(hanyaBulanIni, TODAY).changePct).toBeNull()

    const duaBulan = [
      row({ id: 'lalu', date: '2026-08-05', amount: 100, type: 'income' }),
      row({ id: 'kini', date: '2026-09-05', amount: 1_000_000, type: 'income' }),
    ]
    expect(incomeStatsFor(duaBulan, TODAY).changePct).toBe(100)
  })

  it('clampChangePct: menjaga tanda, membulatkan, & menolak nilai non-finite', () => {
    expect(clampChangePct(27.4)).toBe(27)
    expect(clampChangePct(-3512)).toBe(-100)
    expect(clampChangePct(999)).toBe(100)
    expect(clampChangePct(Number.NaN)).toBe(0)
    expect(clampChangePct(Number.POSITIVE_INFINITY)).toBe(0)
  })
})

/* ── SIMETRI ARUS UANG (paket 76) ────────────────────────────────────────────
   Tiga angka kunci "Arus Uang" (Pemasukan · Pengeluaran · Sisa) wajib duduk di
   satu sumbu kanan yang sama. Yang bisa diuji tanpa DOM adalah KONTRAK-nya:
   urutan tetap, tanda defisit benar, dan template kolom BERSAMA. Komponen cuma
   memetakan hasil fungsi murni ini ke satu grid. */
describe('cashFlowAxisRows · simetri tiga angka kunci (paket 76)', () => {
  it('urutan kanon: Pemasukan → Pengeluaran → Sisa', () => {
    const rows = cashFlowAxisRows(7_500_000, 752_000)
    expect(rows.map((r) => r.key)).toEqual(['income', 'expense', 'net'])
  })

  it('nominal & label: Sisa = pemasukan − pengeluaran; label dari HOME_MONEY_COPY', () => {
    const [income, expense, net] = cashFlowAxisRows(7_500_000, 752_000)
    expect(income.amount).toBe(7_500_000)
    expect(expense.amount).toBe(752_000)
    expect(net.amount).toBe(6_748_000)
    expect(net.negative).toBe(false)
    expect([income, expense, net].map((r) => r.label)).toEqual([
      HOME_MONEY_COPY.chartIncomeLabel,
      HOME_MONEY_COPY.chartExpenseLabel,
      HOME_MONEY_COPY.chartNetLabel,
    ])
  })

  it('defisit: Sisa negatif & ditandai (bukan nilai absolut)', () => {
    const [, , net] = cashFlowAxisRows(500_000, 1_250_000)
    expect(net.amount).toBe(-750_000)
    expect(net.negative).toBe(true)
  })

  it('Sisa nol tidak dianggap negatif', () => {
    const [, , net] = cashFlowAxisRows(1_000_000, 1_000_000)
    expect(net.amount).toBe(0)
    expect(net.negative).toBe(false)
  })

  it('kontrak simetri: template grid bersama + kelas nominal tabular-tight', () => {
    /* template kolom SATU definisi — kalau ini berubah, sumbu kanan wajib
       ditinjau ulang (itulah kenapa ia dikunci di test) */
    expect(HOME_CASHFLOW_AXIS.gridClass).toBe('grid-cols-[minmax(0,1fr)_auto]')
    expect(HOME_CASHFLOW_AXIS.valueClass).toContain('tabular-nums')
    expect(HOME_CASHFLOW_AXIS.valueClass).toContain('tracking-tight')
  })
})
