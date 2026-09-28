import { describe, expect, it } from 'vitest'
import {
  applySettlement,
  cashDirectionOf,
  changeDebtFrom,
  defaultCashAmount,
  planDebtSettlement,
  settlementCounterparty,
  settlementNetWorthEffect,
  settlementNote,
  type SettlementPlan,
} from './wealth-cash'
import { INITIAL_DEBTS, activeDebtRemaining, netWorthParts, type Debt } from './wealth'

/* ── Test "utang/piutang menyentuh kas" (paket 41) ──────────────────────────
   Yang dijaga di sini BUKAN "fungsinya jalan", tapi janji yang bikin Net Worth
   bisa dipercaya:

     1. Pelunasan selalu punya baris kas (tidak ada hutang lunas tanpa uang
        keluar — temuan audit #1);
     2. Uang yang benar-benar berpindah tangan === Σ nominal barisnya (tidak ada
        rupiah yang lahir/hilang di tengah jalan);
     3. Kembalian tercatat UTUH: piutang Rp 50.000 dibayar Rp 100.000 → catatan
        lunas + baris `change` + catatan lawan yang baru;
     4. Efeknya ke Net Worth SELALU nol, apa pun bentuk pelunasannya. */

const plan = (input: {
  direction: 'out' | 'in'
  owedAmount: number
  paidAmount: number
}): SettlementPlan => {
  const result = planDebtSettlement({ ...input, counterparty: 'Andi' })
  if (!result) throw new Error('planDebtSettlement seharusnya mengembalikan rencana')
  return result
}

/** Σ efek baris terhadap kas user — dibaca dengan aturan `lib/money/ledger.ts` */
function cashEffect(row: { type: string; amount: number }): number {
  switch (row.type) {
    case 'income':
    case 'receivable_payment':
      return row.amount
    case 'expense':
    case 'debt_payment':
      return -row.amount
    default:
      return row.amount /* `change` bertanda */
  }
}

describe('planDebtSettlement · bayar hutang (kas keluar)', () => {
  it('pelunasan penuh: satu baris debt_payment, sisa nol, tanpa kembalian', () => {
    const p = plan({ direction: 'out', owedAmount: 500_000, paidAmount: 500_000 })
    expect(p.rows).toEqual([{ type: 'debt_payment', amount: 500_000 }])
    expect(p.settledAmount).toBe(500_000)
    expect(p.cashMoved).toBe(500_000)
    expect(p.remaining).toBe(0)
    expect(p.settled).toBe(true)
    expect(p.changeAmount).toBe(0)
    expect(p.changeDirection).toBe('none')
    expect(p.changeRecord).toBeNull()
    /* uang yang berpindah === Σ baris */
    expect(p.rows.reduce((sum, row) => sum + cashEffect(row), 0)).toBe(-500_000)
  })

  it('bayar sebagian: catatannya tetap aktif dengan sisa yang benar', () => {
    const p = plan({ direction: 'out', owedAmount: 500_000, paidAmount: 200_000 })
    expect(p.settledAmount).toBe(200_000)
    expect(p.remaining).toBe(300_000)
    expect(p.settled).toBe(false)

    const debt = INITIAL_DEBTS.find((item) => item.provider === 'Kredivo')!
    const after = applySettlement(debt as Debt, p)
    expect(after.remaining).toBe(300_000)
    expect(after.status).toBe('active')
  })

  it('lebih bayar: kelebihan jadi baris change KELUAR + piutang kembalian', () => {
    const p = plan({ direction: 'out', owedAmount: 50_000, paidAmount: 100_000 })
    expect(p.rows).toEqual([
      { type: 'debt_payment', amount: 50_000 },
      { type: 'change', amount: -50_000 },
    ])
    expect(p.cashMoved).toBe(100_000)
    expect(p.changeDirection).toBe('out')
    expect(p.changeRecord).toMatchObject({
      direction: 'owed_to_me',
      amount: 50_000,
      counterparty: 'Andi',
    })
    /* kas benar-benar keluar 100.000 — sesuai uang yang diserahkan user */
    expect(p.rows.reduce((sum, row) => sum + cashEffect(row), 0)).toBe(-100_000)
    expect(p.changeNote).toContain('harus kamu terima')
  })
})

describe('planDebtSettlement · piutang (kas masuk)', () => {
  it('kasus wajib: piutang Rp 50.000 dibayar Rp 100.000 → lunas + kas +Rp 50.000', () => {
    const p = plan({ direction: 'in', owedAmount: 50_000, paidAmount: 100_000 })

    /* 1. piutangnya LUNAS lewat baris pelunasan sebesar kewajibannya */
    expect(p.rows[0]).toEqual({ type: 'receivable_payment', amount: 50_000 })
    expect(p.settledAmount).toBe(50_000)
    expect(p.remaining).toBe(0)
    expect(p.settled).toBe(true)

    /* 2. kembaliannya tercatat sebagai kas MASUK (uangnya memang ada di tangan kita) */
    expect(p.rows[1]).toEqual({ type: 'change', amount: 50_000 })
    expect(p.cashMoved).toBe(100_000)
    expect(p.rows.reduce((sum, row) => sum + cashEffect(row), 0)).toBe(100_000)

    /* 3. …tapi bukan milik kita: lahir catatan hutang kembalian */
    expect(p.changeRecord).toMatchObject({ direction: 'owed_by_me', amount: 50_000 })
    expect(p.changeNote).toContain('harus kamu kembalikan')
  })

  it('diterima pas: hanya satu baris receivable_payment', () => {
    const p = plan({ direction: 'in', owedAmount: 150_000, paidAmount: 150_000 })
    expect(p.rows).toEqual([{ type: 'receivable_payment', amount: 150_000 }])
    expect(p.changeRecord).toBeNull()
  })

  it('diterima sebagian: sisa piutang ikut turun, bukan dianggap lunas', () => {
    const p = plan({ direction: 'in', owedAmount: 150_000, paidAmount: 100_000 })
    expect(p.remaining).toBe(50_000)
    expect(p.settled).toBe(false)
  })

  it('menolak permintaan yang tidak masuk akal — tidak ada baris yang lahir', () => {
    expect(
      planDebtSettlement({ direction: 'in', owedAmount: 0, paidAmount: 10_000, counterparty: 'X' }),
    ).toBeNull()
    expect(
      planDebtSettlement({ direction: 'out', owedAmount: 50_000, paidAmount: 0, counterparty: 'X' }),
    ).toBeNull()
    expect(
      planDebtSettlement({
        direction: 'out',
        owedAmount: 50_000,
        paidAmount: Number.NaN,
        counterparty: 'X',
      }),
    ).toBeNull()
  })
})

describe('Net Worth tidak pernah berubah karena pelunasan', () => {
  const cases: {
    label: string
    direction: 'out' | 'in'
    owedAmount: number
    paidAmount: number
  }[] = [
    { label: 'bayar penuh', direction: 'out', owedAmount: 500_000, paidAmount: 500_000 },
    { label: 'bayar sebagian', direction: 'out', owedAmount: 500_000, paidAmount: 200_000 },
    { label: 'bayar lebih', direction: 'out', owedAmount: 50_000, paidAmount: 100_000 },
    { label: 'terima penuh', direction: 'in', owedAmount: 150_000, paidAmount: 150_000 },
    { label: 'terima sebagian', direction: 'in', owedAmount: 150_000, paidAmount: 75_000 },
    { label: 'terima lebih', direction: 'in', owedAmount: 50_000, paidAmount: 100_000 },
  ]

  for (const item of cases) {
    it(`${item.label}: efek Net Worth = 0`, () => {
      const p = plan(item)
      expect(settlementNetWorthEffect(item.direction, p)).toBe(0)
    })
  }

  it('bayar utang Rp 500.000 dari BCA: kas turun, hutang turun, Net Worth tetap', () => {
    /* angka nyata halaman Kekayaan: kas Rp 1.850.000 · investasi Rp 16.149.330
       · piutang Rp 150.000 · hutang Rp 3.450.000 */
    const before = netWorthParts({
      cash: 1_850_000,
      investments: 16_149_330,
      receivables: 150_000,
      debts: 3_450_000,
    })
    const p = plan({ direction: 'out', owedAmount: 500_000, paidAmount: 500_000 })
    const after = netWorthParts({
      cash: 1_850_000 - p.cashMoved,
      investments: 16_149_330,
      receivables: 150_000,
      debts: 3_450_000 - p.settledAmount,
    })

    expect(before.netWorth).toBe(14_699_330)
    expect(before.cash).toBe(1_850_000)
    expect(after.cash).toBe(1_350_000)
    expect(after.netWorth).toBe(before.netWorth)
  })

  it('terima piutang Rp 50.000: nilai pindah piutang → kas, aset & Net Worth tetap', () => {
    const base = { cash: 1_450_000, investments: 0, receivables: 150_000, debts: 0 }
    const p = plan({ direction: 'in', owedAmount: 50_000, paidAmount: 50_000 })
    const before = netWorthParts(base)
    const after = netWorthParts({
      ...base,
      cash: base.cash + p.cashMoved,
      receivables: base.receivables - p.settledAmount,
    })

    expect(before.cash).toBe(1_450_000)
    expect(after.cash).toBe(1_500_000)
    expect(after.receivables).toBe(100_000)
    expect(after.assets).toBe(before.assets)
    expect(after.netWorth).toBe(before.netWorth)
  })
})


describe('kembalian jadi catatan lawannya', () => {
  it('uang lebih yang DITERIMA → hutang baru sebesar kembaliannya', () => {
    const p = plan({ direction: 'in', owedAmount: 50_000, paidAmount: 100_000 })
    const record = changeDebtFrom(p, 'debt-change-1', 'pribadi')
    expect(record).toMatchObject({
      id: 'debt-change-1',
      type: 'personal',
      direction: 'owed_by_me',
      counterparty: 'Andi',
      principal: 50_000,
      remaining: 50_000,
      status: 'active',
    })
    expect(record?.notes).toBe('Kembalian dari pelunasan piutang Andi')
  })

  it('catatan kembalian MEWARISI konteks uang hutang yang dilunasi (paket 47)', () => {
    const p = plan({ direction: 'out', owedAmount: 50_000, paidAmount: 100_000 })
    expect(changeDebtFrom(p, 'debt-change-ctx', 'bersama')?.scope).toBe('bersama')
    expect(changeDebtFrom(p, 'debt-change-ctx', 'keluarga')?.scope).toBe('keluarga')
  })

  it('uang lebih yang DISERAHKAN → piutang baru sebesar kembaliannya', () => {
    const p = plan({ direction: 'out', owedAmount: 50_000, paidAmount: 100_000 })
    const record = changeDebtFrom(p, 'debt-change-2', 'pribadi')
    expect(record?.direction).toBe('owed_to_me')
    expect(record?.notes).toBe('Kembalian dari pembayaran ke Andi')
  })

  it('bayaran pas tidak melahirkan catatan kembalian', () => {
    const p = plan({ direction: 'out', owedAmount: 500_000, paidAmount: 500_000 })
    expect(changeDebtFrom(p, 'debt-change-3', 'pribadi')).toBeNull()
  })
})

describe('pembantu sheet & riwayat', () => {
  it('arah kas dibaca dari arah catatannya', () => {
    const hutang = INITIAL_DEBTS.find((debt) => debt.direction === 'owed_by_me')!
    const piutang = INITIAL_DEBTS.find(
      (debt) => debt.direction === 'owed_to_me' && debt.status === 'active',
    )!
    expect(cashDirectionOf(hutang)).toBe('out')
    expect(cashDirectionOf(piutang)).toBe('in')
  })

  it('nominal default: cicilan platform bulan ini, atau seluruh sisa catatannya', () => {
    const kredivo = INITIAL_DEBTS.find((debt) => debt.provider === 'Kredivo')!
    const andi = INITIAL_DEBTS.find((debt) => debt.counterparty === 'Andi')!
    const rina = INITIAL_DEBTS.find((debt) => debt.counterparty === 'Rina')!
    expect(defaultCashAmount(kredivo)).toBe(550_000)
    expect(defaultCashAmount(andi)).toBe(200_000)
    expect(defaultCashAmount(rina)).toBe(150_000)
  })

  it('nama & catatan baris menyebut pihaknya, bukan "undefined"', () => {
    const kredivo = INITIAL_DEBTS.find((debt) => debt.provider === 'Kredivo')!
    expect(settlementCounterparty(kredivo)).toBe('Kredivo')
    expect(settlementNote('out', 'Kredivo')).toBe('Bayar Kredivo')
    expect(settlementNote('in', 'Rina')).toBe('Terima dari Rina')
  })

  it('jumlah hutang aktif ikut turun setelah pelunasan diterapkan', () => {
    const kredivo = INITIAL_DEBTS.find((debt) => debt.provider === 'Kredivo')!
    const p = plan({ direction: 'out', owedAmount: kredivo.remaining, paidAmount: 500_000 })
    const updated = INITIAL_DEBTS.map((debt) =>
      debt.id === kredivo.id ? applySettlement(debt, p) : debt,
    )
    expect(activeDebtRemaining(updated)).toBe(activeDebtRemaining(INITIAL_DEBTS) - 500_000)
  })
})

