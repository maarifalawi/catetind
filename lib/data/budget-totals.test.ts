import { describe, expect, it } from 'vitest'
import {
  budgetTotals,
  fundsTotals,
  type BudgetItem,
  type SinkingFundItem,
} from './budget'

/* ── TOTAL AGREGAT (redesain paket 82) ──────────────────────────────────────
   Strip ringkasan di atas daftar membaca dua fungsi murni ini. Test mengunci
   dua hal yang menentukan kejujuran ringkasan:
     1. totalnya benar-benar jumlah daftar yang ditampilkan di bawahnya;
     2. tepi kasus (kosong / limit-target nol / over) tidak pernah menghasilkan
        `NaN` atau lebar bar negatif. */

function budget(over: Partial<BudgetItem>): BudgetItem {
  return {
    id: 1,
    category: 'Kopi',
    icon: '☕',
    limit: 300_000,
    spent: 0,
    period: 'monthly',
    scope: 'pribadi',
    ...over,
  }
}

function fund(over: Partial<SinkingFundItem>): SinkingFundItem {
  return {
    id: 1,
    name: 'Liburan',
    target: 10_000_000,
    current: 0,
    deadline: '2027-01-01',
    priority: 'sedang',
    stage: 'seed',
    scope: 'pribadi',
    contributedThisMonth: false,
    ...over,
  }
}

describe('budgetTotals', () => {
  it('menjumlah limit & terpakai lalu menghitung persennya', () => {
    const totals = budgetTotals([
      budget({ limit: 300_000, spent: 150_000 }),
      budget({ id: 2, limit: 200_000, spent: 50_000 }),
    ])
    expect(totals).toEqual({ limit: 500_000, spent: 200_000, percent: 40 })
  })

  it('persen BOLEH lebih dari 100 saat totalnya over budget', () => {
    expect(budgetTotals([budget({ limit: 100_000, spent: 250_000 })]).percent).toBe(250)
  })

  it('daftar kosong atau limit nol → persen 0, bukan NaN', () => {
    expect(budgetTotals([]).percent).toBe(0)
    expect(budgetTotals([budget({ limit: 0, spent: 50_000 })])).toEqual({
      limit: 0,
      spent: 50_000,
      percent: 0,
    })
  })

  it('nilai negatif (data tak sah) dijepit ke 0', () => {
    const totals = budgetTotals([budget({ limit: -100, spent: -50 })])
    expect(totals.limit).toBe(0)
    expect(totals.spent).toBe(0)
  })
})

describe('fundsTotals', () => {
  it('menjumlah terkumpul & target lalu menghitung persennya', () => {
    const totals = fundsTotals([
      fund({ target: 4_000_000, current: 1_000_000 }),
      fund({ id: 2, target: 6_000_000, current: 2_000_000 }),
    ])
    expect(totals).toEqual({ current: 3_000_000, target: 10_000_000, percent: 30 })
  })

  it('persen dijepit 100 — celengan tidak punya makna "over target"', () => {
    expect(fundsTotals([fund({ target: 100, current: 250 })]).percent).toBe(100)
  })

  it('target nol atau daftar kosong → persen 0', () => {
    expect(fundsTotals([fund({ target: 0, current: 500 })]).percent).toBe(0)
    expect(fundsTotals([]).percent).toBe(0)
  })
})
