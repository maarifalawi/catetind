import { describe, expect, it } from 'vitest'
import {
  assertLedgerInvariant,
  balanceOf,
  movesBetweenWallets,
  netEffect,
  walletDelta,
  type LedgerRow,
  type LedgerRowType,
} from './ledger'

/* ── Test ledger kas (paket 40) ──────────────────────────────────────────────
   Yang dijaga di sini bukan "fungsinya jalan", tapi "rumusnya tidak bisa
   berbohong": saldo selalu `opening + Σ baris`, pindah dana tidak menciptakan
   atau menghilangkan uang, dan koreksi saldo bertanda ikut apa adanya. */

function makeRow(
  id: string,
  walletId: string,
  type: LedgerRowType,
  amount: number,
  extra: Partial<LedgerRow> = {},
): LedgerRow {
  return { id, walletId, type, amount, dateISO: '2026-09-27', note: `baris ${id}`, ...extra }
}

describe('balanceOf — saldo = opening + Σ baris', () => {
  it('menambah untuk income dan mengurangi untuk expense', () => {
    const rows = [
      makeRow('a', 'bca', 'income', 500_000),
      makeRow('b', 'bca', 'expense', 125_000),
    ]
    expect(balanceOf(rows, 'bca', 1_000_000)).toBe(1_375_000)
    /* dompet lain tidak tersentuh sama sekali */
    expect(balanceOf(rows, 'gopay', 350_000)).toBe(350_000)
  })

  it('transfer seimbang: sumber berkurang, tujuan bertambah, total kas tetap', () => {
    const rows = [makeRow('t1', 'bca', 'transfer', 250_000, { counterWalletId: 'gopay' })]
    const bca = balanceOf(rows, 'bca', 1_450_000)
    const gopay = balanceOf(rows, 'gopay', 350_000)

    expect(bca).toBe(1_200_000)
    expect(gopay).toBe(600_000)
    expect(bca + gopay).toBe(1_450_000 + 350_000)
    /* efek bersih satu baris pindah dana = 0 → dasar aturan "Σ transfer bersih 0" */
    expect(netEffect(rows[0]!)).toBe(0)
  })

  it('settlement diperlakukan sama seperti transfer saat melunasi antar dompet', () => {
    const rows = [makeRow('s1', 'gopay', 'settlement', 100_000, { counterWalletId: 'bca' })]
    expect(walletDelta(rows[0]!, 'gopay')).toBe(-100_000)
    expect(walletDelta(rows[0]!, 'bca')).toBe(100_000)
    expect(movesBetweenWallets('settlement')).toBe(true)
  })

  it('balance_adjustment bertanda: negatif menurunkan, positif menaikkan', () => {
    const turun = [makeRow('k1', 'bca', 'balance_adjustment', -37_500)]
    const naik = [makeRow('k2', 'bca', 'balance_adjustment', 20_000)]

    expect(balanceOf(turun, 'bca', 1_450_000)).toBe(1_412_500)
    expect(balanceOf(naik, 'bca', 1_450_000)).toBe(1_470_000)
  })

  it('transfer satu sisi (setoran ke celengan) keluar dari kas tanpa mengkredit siapa pun', () => {
    const rows = [makeRow('c1', 'bca', 'transfer', 300_000)]
    expect(balanceOf(rows, 'bca', 1_450_000)).toBe(1_150_000)
    expect(balanceOf(rows, 'gopay', 350_000)).toBe(350_000)
    expect(netEffect(rows[0]!)).toBe(-300_000)
  })

  it('baris tanpa dompet tidak menggerakkan saldo mana pun', () => {
    const rows = [makeRow('x1', '', 'expense', 40_000)]
    expect(balanceOf(rows, 'bca', 1_450_000)).toBe(1_450_000)
    expect(balanceOf(rows, 'tunai', 50_000)).toBe(50_000)
  })
})

describe('assertLedgerInvariant', () => {
  const openings = { bca: 1_450_000, gopay: 350_000 }
  const healthy = [
    makeRow('a', 'bca', 'expense', 50_000),
    makeRow('b', 'bca', 'income', 200_000),
    makeRow('c', 'bca', 'transfer', 100_000, { counterWalletId: 'gopay' }),
    makeRow('d', 'bca', 'balance_adjustment', -25_000),
  ]

  it('lolos untuk ledger yang sehat — termasuk kesamaan Σ baris = Σ saldo − Σ opening', () => {
    const balances = {
      bca: balanceOf(healthy, 'bca', openings.bca),
      gopay: balanceOf(healthy, 'gopay', openings.gopay),
    }
    expect(() => assertLedgerInvariant(healthy, { openings, balances })).not.toThrow()
  })

  it('menolak id baris yang dipakai dua kali', () => {
    const rows = [makeRow('sama', 'bca', 'expense', 1_000), makeRow('sama', 'bca', 'expense', 2_000)]
    expect(() => assertLedgerInvariant(rows)).toThrow(/dipakai dua kali/)
  })

  it('menolak uang yang bukan integer rupiah', () => {
    const rows = [makeRow('a', 'bca', 'expense', 1_000.5)]
    expect(() => assertLedgerInvariant(rows)).toThrow(/rupiah bulat/)
  })

  it('menolak expense berarah tanpa nominal positif', () => {
    expect(() => assertLedgerInvariant([makeRow('a', 'bca', 'expense', 0)])).toThrow(/lebih dari nol/)
    expect(() => assertLedgerInvariant([makeRow('a', 'bca', 'income', -5_000)])).toThrow(
      /lebih dari nol/,
    )
  })

  it('menolak koreksi saldo tanpa selisih', () => {
    expect(() => assertLedgerInvariant([makeRow('a', 'bca', 'balance_adjustment', 0)])).toThrow(
      /tanpa selisih/,
    )
  })

  it('menolak pindah dana ke dompet yang sama atau tanpa lawan yang seimbang', () => {
    expect(() =>
      assertLedgerInvariant([makeRow('a', 'bca', 'transfer', 10_000, { counterWalletId: 'bca' })]),
    ).toThrow(/dompet yang sama/)

    expect(() =>
      assertLedgerInvariant([
        makeRow('a', 'bca', 'settlement', 10_000, { counterWalletId: 'gopay' }),
        makeRow('b', 'gopay', 'income', 10_000, { counterWalletId: 'bca' }),
      ]),
    ).toThrow()
  })

  it('menolak expense/income yang mengaku punya dompet lawan', () => {
    expect(() =>
      assertLedgerInvariant([makeRow('a', 'bca', 'expense', 10_000, { counterWalletId: 'gopay' })]),
    ).toThrow(/tidak boleh punya dompet lawan/)
  })

  it('menolak saat Σ saldo tidak sama dengan Σ opening + Σ baris', () => {
    const balances = { bca: 999, gopay: balanceOf(healthy, 'gopay', openings.gopay) }
    expect(() => assertLedgerInvariant(healthy, { openings, balances })).toThrow(/Σ baris/)
  })

  it('menolak saat satu saldo dompet melenceng walau totalnya kebetulan sama', () => {
    /* uang yang "dipindah" 1 rupiah antar dompet: totalnya tetap, tapi saldo
       per dompet tidak lagi sama dengan opening + Σ barisnya */
    const balances = {
      bca: balanceOf(healthy, 'bca', openings.bca) - 1,
      gopay: balanceOf(healthy, 'gopay', openings.gopay) + 1,
    }
    expect(() => assertLedgerInvariant(healthy, { openings, balances })).toThrow(
      /opening \+ Σ barisnya/,
    )
  })
})

/* ── Baris kas utang/piutang (paket 41) ─────────────────────────────────────
   `debt_payment` selalu keluar, `receivable_payment` selalu masuk, dan `change`
   BERTANDA — itu satu-satunya jenis di paket ini yang bisa mengalir dua arah,
   karena kembalian memang bisa datang maupun pergi. */

describe('baris debt_payment / receivable_payment / change', () => {
  it('debt_payment mengurangi saldo (uang benar-benar keluar dari dompet)', () => {
    const rows = [makeRow('d1', 'bca', 'debt_payment', 500_000)]
    expect(walletDelta(rows[0]!, 'bca')).toBe(-500_000)
    expect(balanceOf(rows, 'bca', 1_450_000)).toBe(950_000)
    expect(netEffect(rows[0]!)).toBe(-500_000)
  })

  it('receivable_payment menambah saldo (pelunasan piutang masuk ke dompet)', () => {
    const rows = [makeRow('r1', 'bca', 'receivable_payment', 150_000)]
    expect(walletDelta(rows[0]!, 'bca')).toBe(150_000)
    expect(balanceOf(rows, 'bca', 1_450_000)).toBe(1_600_000)
  })

  it('change bertanda: positif menaikkan, negatif menurunkan (kembalian dua arah)', () => {
    const masuk = [makeRow('c1', 'bca', 'change', 50_000)]
    const keluar = [makeRow('c2', 'bca', 'change', -50_000)]
    expect(balanceOf(masuk, 'bca', 1_450_000)).toBe(1_500_000)
    expect(balanceOf(keluar, 'bca', 1_450_000)).toBe(1_400_000)
  })

  it('pelunasan + kembalian tetap lolos invariant (Σ baris = Σ saldo − Σ opening)', () => {
    const openings = { bca: 1_450_000 }
    const rows = [
      makeRow('p1', 'bca', 'debt_payment', 50_000),
      makeRow('p2', 'bca', 'change', -50_000),
    ]
    const balances = { bca: balanceOf(rows, 'bca', openings.bca) }
    expect(() => assertLedgerInvariant(rows, { openings, balances })).not.toThrow()
    expect(balances.bca).toBe(1_450_000 - 100_000)
  })

  it('menolak baris kembalian tanpa selisih, dan dompet lawan pada baris satu sisi', () => {
    expect(() => assertLedgerInvariant([makeRow('c', 'bca', 'change', 0)])).toThrow(/kembalian/)
    expect(() =>
      assertLedgerInvariant([
        makeRow('d', 'bca', 'debt_payment', 10_000, { counterWalletId: 'gopay' }),
      ]),
    ).toThrow(/tidak boleh punya dompet lawan/)
    expect(() => assertLedgerInvariant([makeRow('r', 'bca', 'receivable_payment', -5_000)])).toThrow(
      /lebih dari nol/,
    )
  })
})

