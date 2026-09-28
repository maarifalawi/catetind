import { describe, expect, it } from 'vitest'
import {
  PRIVATE_EXPENSE_POLICY,
  allocateMoney,
  hiddenPrivateBurden,
  isHiddenFrom,
  isTreatShares,
  isValidSplit,
  ledgerTotals,
  monthOf,
  sharesOf,
  withinMonth,
  type LedgerMemberId,
  type LedgerTx,
} from './joint-ledger'

/* ── Test mesin akuntansi dompet bersama ─────────────────────────────────────
   Fokus: invariant uang (tidak ada rupiah hilang/muncul), porsi per mode split,
   dan NET per orang sebagai dasar transfer. */

const ME = 'user_a'
const PARTNER = 'user_b'
const MEMBERS = [ME, PARTNER]

function tx(partial: Partial<LedgerTx> & Pick<LedgerTx, 'amount' | 'split'>): LedgerTx {
  return {
    id: partial.id ?? 'tx',
    payerId: partial.payerId ?? ME,
    createdByUserId: partial.createdByUserId ?? partial.payerId ?? ME,
    amount: partial.amount,
    split: partial.split,
    date: partial.date ?? '2026-09-25',
    isPrivate: partial.isPrivate,
    privateForUser: partial.privateForUser,
  }
}

describe('allocateMoney', () => {
  it('tidak pernah kehilangan rupiah saat dibagi 50/50 dengan nominal ganjil', () => {
    const result = allocateMoney(285_001, [
      { id: ME, weight: 1 },
      { id: PARTNER, weight: 1 },
    ])
    expect(result[ME] + result[PARTNER]).toBe(285_001)
    expect(result[ME]).toBe(142_501)
    expect(result[PARTNER]).toBe(142_500)
  })

  it('memakai Largest Remainder supaya Σ === total (999 @33/67)', () => {
    const result = allocateMoney(999, [
      { id: 'a', weight: 33 },
      { id: 'b', weight: 67 },
    ])
    expect(result).toEqual({ a: 330, b: 669 })
    expect(result.a + result.b).toBe(999)
  })

  it('nominal 0 / daftar kosong → semua nol, tanpa error', () => {
    expect(allocateMoney(0, [{ id: ME, weight: 1 }])).toEqual({ [ME]: 0 })
    expect(allocateMoney(10_000, [])).toEqual({})
  })
})

describe('sharesOf', () => {
  it('equal: rupiah ekor ditanggung pihak yang menalangi', () => {
    const shares = sharesOf(tx({ amount: 285_001, split: { type: 'equal' } }), MEMBERS)
    expect(shares[ME]).toBe(142_501)
    expect(shares[PARTNER]).toBe(142_500)
    expect(shares[ME] + shares[PARTNER]).toBe(285_001)
  })

  it('percentage: 60/40 benar-benar dibaca sebagai persen, bukan rupiah', () => {
    const shares = sharesOf(
      tx({ amount: 350_000, split: { type: 'percentage', percents: { [ME]: 60, [PARTNER]: 40 } } }),
      MEMBERS,
    )
    expect(shares[ME]).toBe(210_000)
    expect(shares[PARTNER]).toBe(140_000)
  })

  it('nominal: dipakai apa adanya, selisih dibebankan ke pihak yang menalangi', () => {
    const exact = sharesOf(
      tx({ amount: 350_000, split: { type: 'nominal', amounts: { [ME]: 200_000, [PARTNER]: 150_000 } } }),
      MEMBERS,
    )
    expect(exact[ME] + exact[PARTNER]).toBe(350_000)

    const drifted = sharesOf(
      tx({ amount: 350_000, split: { type: 'nominal', amounts: { [ME]: 100_000, [PARTNER]: 150_000 } } }),
      MEMBERS,
    )
    expect(drifted[ME] + drifted[PARTNER]).toBe(350_000)
    expect(drifted[ME]).toBe(200_000)
  })

  it('single_payer: 100% ke penanggung, pihak lain 0', () => {
    const shares = sharesOf(
      tx({ amount: 380_000, split: { type: 'single_payer', payerId: ME } }),
      MEMBERS,
    )
    expect(shares[ME]).toBe(380_000)
    expect(shares[PARTNER]).toBe(0)
    expect(isTreatShares(shares)).toBe(true)
  })

  it('invariant: Σ porsi SELALU sama dengan nominal untuk semua mode', () => {
    const cases: LedgerTx[] = [
      tx({ amount: 1, split: { type: 'equal' } }),
      tx({ amount: 99_999, split: { type: 'equal' } }),
      tx({ amount: 123_457, split: { type: 'percentage', percents: { [ME]: 33, [PARTNER]: 67 } } }),
      tx({ amount: 7, split: { type: 'percentage', percents: { [ME]: 50, [PARTNER]: 50 } } }),
      tx({ amount: 12_345, split: { type: 'nominal', amounts: { [ME]: 5_000, [PARTNER]: 7_345 } } }),
      tx({ amount: 12_345, split: { type: 'single_payer', payerId: PARTNER } }),
    ]
    for (const item of cases) {
      const shares = sharesOf(item, MEMBERS)
      expect(shares[ME] + shares[PARTNER]).toBe(item.amount)
    }
  })
})

describe('isValidSplit', () => {
  it('menolak persentase yang tidak berjumlah 100 & id di luar daftar anggota', () => {
    expect(isValidSplit({ type: 'percentage', percents: { [ME]: 60, [PARTNER]: 40 } }, MEMBERS)).toBe(true)
    expect(isValidSplit({ type: 'percentage', percents: { [ME]: 60, [PARTNER]: 60 } }, MEMBERS)).toBe(false)
    expect(isValidSplit({ type: 'nominal', amounts: { [ME]: -1 } }, MEMBERS)).toBe(false)
    expect(isValidSplit({ type: 'single_payer', payerId: 'orang_lain' }, MEMBERS)).toBe(false)
  })
})

describe('ledgerTotals', () => {
  it('net = bayar − kewajiban, dan Σ net semua anggota selalu 0', () => {
    const txs: LedgerTx[] = [
      tx({ id: '1', amount: 100_000, split: { type: 'equal' } }),
      tx({
        id: '2',
        payerId: PARTNER,
        amount: 60_000,
        split: { type: 'percentage', percents: { [ME]: 70, [PARTNER]: 30 } },
      }),
      tx({ id: '3', payerId: PARTNER, amount: 25_000, split: { type: 'single_payer', payerId: ME } }),
    ]
    const totals = ledgerTotals(txs, MEMBERS)
    /* aku: bayar 100.000, kewajiban 50.000 + 42.000 + 25.000 = 117.000 */
    expect(totals.paid[ME]).toBe(100_000)
    expect(totals.owed[ME]).toBe(117_000)
    expect(totals.net[ME]).toBe(-17_000)
    expect(totals.net[ME] + totals.net[PARTNER]).toBe(0)
    expect(totals.owed[ME] + totals.owed[PARTNER]).toBe(185_000)
  })
})

describe('jendela waktu', () => {
  it('monthOf & withinMonth membaca string tanggal lokal apa adanya', () => {
    expect(monthOf('2026-09-25')).toBe('2026-09')
    expect(withinMonth('2026-09-01', '2026-09')).toBe(true)
    expect(withinMonth('2026-10-01', '2026-09')).toBe(false)
  })
})

/* ── KEBIJAKAN TRANSAKSI PRIVAT (paket 41) ──────────────────────────────────
   Satu konstanta harus bisa dibalik satu baris, jadi KEDUA nilainya diuji:
   `'shared'` (default) → nominal privat ikut kewajiban + ada pengungkapan;
   `'excluded'` → baris privat keluar total dan tidak ada yang perlu diungkapkan. */

describe('PRIVATE_EXPENSE_POLICY', () => {
  const privateTx = (viewerShareOwner: LedgerMemberId): LedgerTx =>
    tx({
      id: 'privat',
      payerId: PARTNER,
      createdByUserId: PARTNER,
      amount: 150_000,
      split: { type: 'equal' },
      isPrivate: true,
      privateForUser: viewerShareOwner,
    })

  it('default repo = shared (nominal privat tetap jadi kewajiban bersama)', () => {
    expect(PRIVATE_EXPENSE_POLICY).toBe('shared')
  })

  it("shared: porsi pasangan tetap dihitung, dan beban viewer diungkapkan", () => {
    const txs = [privateTx(PARTNER)]
    const totals = ledgerTotals(txs, MEMBERS, { privatePolicy: 'shared' })

    expect(totals.owed[ME]).toBe(75_000)
    expect(totals.net[ME]).toBe(-75_000)
    expect(totals.net[ME] + totals.net[PARTNER]).toBe(0)

    const burden = hiddenPrivateBurden(txs, ME, MEMBERS, { privatePolicy: 'shared' })
    expect(burden).toEqual({ amount: 75_000, count: 1 })
    /* pemiliknya sendiri tidak punya beban tersembunyi */
    expect(hiddenPrivateBurden(txs, PARTNER, MEMBERS, { privatePolicy: 'shared' })).toEqual({
      amount: 0,
      count: 0,
    })
  })

  it('excluded: baris privat keluar dari paid & owed — tidak ada utang maupun pengungkapan', () => {
    const txs = [privateTx(PARTNER)]
    const totals = ledgerTotals(txs, MEMBERS, { privatePolicy: 'excluded' })

    expect(totals.owed[ME]).toBe(0)
    expect(totals.owed[PARTNER]).toBe(0)
    expect(totals.paid[PARTNER]).toBe(0)
    expect(totals.net[ME]).toBe(0)
    expect(hiddenPrivateBurden(txs, ME, MEMBERS, { privatePolicy: 'excluded' })).toEqual({
      amount: 0,
      count: 0,
    })
  })

  it('catatan TIDAK privat tidak terpengaruh kebijakan apa pun', () => {
    const txs = [
      tx({ id: 'biasa', payerId: PARTNER, amount: 100_000, split: { type: 'equal' } }),
    ]
    for (const privatePolicy of ['shared', 'excluded'] as const) {
      expect(ledgerTotals(txs, MEMBERS, { privatePolicy }).owed[ME]).toBe(50_000)
    }
  })

  it('isHiddenFrom: hanya catatan privat milik orang lain yang disembunyikan', () => {
    expect(isHiddenFrom(privateTx(PARTNER), ME)).toBe(true)
    expect(isHiddenFrom(privateTx(ME), ME)).toBe(false)
    expect(
      isHiddenFrom(
        tx({ id: 'umum', payerId: PARTNER, amount: 10_000, split: { type: 'equal' } }),
        ME,
      ),
    ).toBe(false)
  })
})

