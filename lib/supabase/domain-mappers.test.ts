import { describe, expect, it } from 'vitest'
import { plantStageFrom } from '@/lib/data/budget'
import type { Bill } from '@/lib/data/bills'
import {
  dateOfDay,
  dayOfDate,
  numericIdFromUuid,
  toBill,
  toBillDbRow,
  toDebt,
  toDebtDbRow,
  toDebtPayment,
  toDebtPaymentDbRow,
  toFundContribution,
  toGoalContributionDbRow,
  toGoalDbRow,
  toInvestment,
  toInvestmentDbRow,
  toSinkingFund,
  type DebtDbRow,
  type GoalContributionDbRow,
  type GoalDbRow,
  type InvestmentDbRow,
} from './domain-mappers'
import { isUuid, randomUuid } from './uuid'

/* ── Test mapper domain paket 64 · Paket D ───────────────────────────────────
   Membuktikan pemetaan baris Supabase ⇄ bentuk domain dua arah bekerja, dan
   aturan "kolom yang tidak ada di skema diambil dari overlay / default jujur"
   benar-benar berlaku. */

const UUID = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee'
const UUID_NUM = parseInt('aaaaaaaabbbb', 16)

describe('helper mapper', () => {
  it('numericIdFromUuid stabil & tidak bertabrakan dengan id kecil', () => {
    expect(numericIdFromUuid(UUID)).toBe(numericIdFromUuid(UUID))
    expect(numericIdFromUuid(UUID)).toBe(UUID_NUM)
    expect(numericIdFromUuid(UUID)).toBeGreaterThanOrEqual(1_000_000)
  })

  it('dayOfDate / dateOfDay bolak-balik', () => {
    expect(dayOfDate('2026-10-15')).toBe(15)
    expect(dayOfDate(null)).toBeUndefined()
    expect(dateOfDay(15, new Date('2026-10-01T00:00:00Z'))?.endsWith('-15')).toBe(true)
    expect(dateOfDay(undefined)).toBeNull()
  })

  it('randomUuid menghasilkan uuid, isUuid mengenalinya', () => {
    const a = randomUuid()
    expect(isUuid(a)).toBe(true)
    expect(randomUuid()).not.toBe(a)
    expect(isUuid('inv-6')).toBe(false)
  })
})

describe('investasi', () => {
  const row: InvestmentDbRow = {
    id: 'inv-uuid',
    name: 'Bank BCA',
    asset_class: 'stock',
    units: 10,
    avg_price: 9_000,
  }

  it('baris investments + harga pasar → Investment', () => {
    const inv = toInvestment(row, { currentPrice: 9_500 })
    expect(inv).toMatchObject({
      id: 'inv-uuid',
      type: 'stock',
      symbol: 'BANK B',
      quantity: 10,
      avgBuyPrice: 9_000,
      currentPrice: 9_500,
      totalInvested: 90_000,
      currentValue: 95_000,
      scope: 'pribadi',
    })
  })

  it('tanpa harga pasar → harga rata-rata dipakai (bukan dikarang)', () => {
    expect(toInvestment(row).currentPrice).toBe(9_000)
  })

  it('Investment → payload investments', () => {
    const inv = toInvestment(row, { currentPrice: 9_500 })
    expect(toInvestmentDbRow(inv, 'uuid-x')).toMatchObject({
      id: 'uuid-x',
      name: 'Bank BCA',
      asset_class: 'stock',
      units: 10,
      avg_price: 9_000,
    })
  })
})

describe('utang/piutang', () => {
  const debtRow: DebtDbRow = {
    id: 'debt-uuid',
    direction: 'owed_by_me',
    type: 'platform',
    counterparty: 'Kredivo',
    principal: 3_000_000,
    monthly_installment: 500_000,
    due_date: '2026-10-15',
    status: 'active',
  }

  it('baris debts + sisa dari view → Debt', () => {
    const debt = toDebt(debtRow, 2_000_000, { scope: 'bersama' })
    expect(debt).toMatchObject({
      id: 'debt-uuid',
      type: 'platform',
      direction: 'owed_by_me',
      counterparty: 'Kredivo',
      principal: 3_000_000,
      remaining: 2_000_000,
      status: 'active',
      monthlyInstallment: 500_000,
      dueDate: 15,
      scope: 'bersama',
    })
  })

  it('Debt → payload debts', () => {
    const debt = toDebt(debtRow, 2_000_000, { scope: 'bersama' })
    expect(toDebtDbRow(debt, 'uuid-d')).toMatchObject({
      id: 'uuid-d',
      direction: 'owed_by_me',
      type: 'platform',
      principal: 3_000_000,
      monthly_installment: 500_000,
      status: 'active',
    })
  })

  it('pembayaran: baris debt_payments ⇄ DebtPayment', () => {
    const payment = toDebtPayment(
      {
        id: 'pay-uuid',
        debt_id: 'debt-uuid',
        amount: 500_000,
        paid_at: '2026-09-27',
        wallet_id: 'bca',
        kind: 'debt',
        cash_moved: 500_000,
        change_amount: 0,
      },
      'BCA',
    )
    expect(payment).toMatchObject({
      id: 'pay-uuid',
      debtId: 'debt-uuid',
      amount: 500_000,
      paidAtISO: '2026-09-27',
      walletName: 'BCA',
      walletId: 'bca',
      kind: 'debt',
    })
    expect(toDebtPaymentDbRow(payment, 'uuid-p')).toMatchObject({
      id: 'uuid-p',
      debt_id: 'debt-uuid',
      amount: 500_000,
      paid_at: '2026-09-27',
      kind: 'debt',
    })
  })
})

describe('tagihan', () => {
  const row = {
    id: 'bill-uuid',
    name: 'Kos',
    amount: 1_500_000,
    due_day: 5,
    category: 'Rumah',
    wallet_id: 'bca',
    remind_days: 3,
  }
  const local: Partial<Bill> = { emoji: '🏠', scope: 'keluarga', isPaidThisMonth: true }

  it('baris bills + overlay lokal → Bill', () => {
    expect(toBill(row, local)).toMatchObject({
      id: 'bill-uuid',
      emoji: '🏠',
      name: 'Kos',
      amount: 1_500_000,
      dueDate: 5,
      category: 'Rumah',
      walletId: 'bca',
      isPaidThisMonth: true,
      reminderDaysBefore: 3,
      scope: 'keluarga',
    })
  })

  it('tanpa overlay → default jujur (emoji kosong, belum dibayar)', () => {
    expect(toBill(row)).toMatchObject({ emoji: '', isPaidThisMonth: false, scope: 'pribadi' })
  })

  it('Bill → payload bills (active memetakan isRecurring)', () => {
    const bill = toBill(row, local)
    expect(toBillDbRow(bill)).toMatchObject({
      id: 'bill-uuid',
      name: 'Kos',
      amount: 1_500_000,
      due_day: 5,
      category: 'Rumah',
      wallet_id: 'bca',
      active: true,
      remind_days: 3,
    })
  })
})

describe('celengan', () => {
  const goalRow: GoalDbRow = {
    id: UUID,
    name: 'Dana Darurat',
    target: 10_000_000,
    due_date: '2026-12-31',
  }

  it('baris goals + terkumpul → SinkingFundItem (id numerik dari uuid)', () => {
    const fund = toSinkingFund(goalRow, 4_000_000)
    expect(fund).toMatchObject({
      id: UUID_NUM,
      name: 'Dana Darurat',
      target: 10_000_000,
      current: 4_000_000,
      deadline: '2026-12-31',
      priority: 'sedang',
      scope: 'pribadi',
      contributedThisMonth: false,
      remoteId: UUID,
    })
    expect(fund.stage).toBe(plantStageFrom(4_000_000, 10_000_000))
  })

  it('SinkingFundItem → payload goals', () => {
    const fund = toSinkingFund(goalRow, 4_000_000)
    expect(toGoalDbRow(fund, 'uuid-g')).toMatchObject({
      id: 'uuid-g',
      name: 'Dana Darurat',
      target: 10_000_000,
      due_date: '2026-12-31',
      status: 'active',
    })
  })

  it('setoran: baris goal_contributions → FundContribution & sebaliknya', () => {
    const cRow: GoalContributionDbRow = {
      id: '11111111-1111-1111-1111-111111111111',
      goal_id: UUID,
      amount: 500_000,
      contributed_at: '2026-09-01',
      wallet_id: 'bca',
    }
    const c = toFundContribution(cRow)
    expect(c).toMatchObject({
      id: parseInt('111111111111', 16),
      fundId: UUID_NUM,
      date: '2026-09-01',
      amount: 500_000,
      walletId: 'bca',
      remoteId: '11111111-1111-1111-1111-111111111111',
    })
    expect(toGoalContributionDbRow(c, UUID, 'uuid-c')).toMatchObject({
      id: 'uuid-c',
      goal_id: UUID,
      amount: 500_000,
      contributed_at: '2026-09-01',
    })
  })
})

