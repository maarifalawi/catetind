import { describe, expect, it } from 'vitest'
import { csvCell, csvFileName, paymentsCsv, toCsv, usersCsv } from './csv'
import type { AdminPaymentView, AdminUserRow } from './types'

/* ── EKSPOR CSV ──────────────────────────────────────────────────────────────
   File CSV dibuka di Excel/Sheets. Dua hal yang wajib benar:
     1. escaping (koma, kutip, baris baru) supaya kolom tidak bergeser;
     2. sel yang dimulai '=' / '+' / '-' / '@' tidak dieksekusi sebagai formula.
   Sekaligus menjaga janji privasi: laporan user hanya berisi HITUNGAN.
   ────────────────────────────────────────────────────────────────────────── */

function user(overrides: Partial<AdminUserRow> = {}): AdminUserRow {
  return {
    id: 'u-1',
    email: 'rina@catet.id',
    name: 'Rina Putri',
    createdAt: '2026-10-01T00:00:00.000Z',
    lastActiveAt: '2026-10-31T00:00:00.000Z',
    onboardingCompleted: true,
    walletCount: 2,
    transactionCount: 10,
    aiCallsThisMonth: 3,
    aiBonusTokens: 0,
    hasBills: true,
    hasGoals: false,
    hasJointWallet: false,
    hasWealth: false,
    hasAiCapture: true,
    referralInvites: 1,
    plan: {
      tier: 'waras',
      planId: 'waras',
      period: 'lifetime',
      isLifetime: true,
      isActive: true,
      active: true,
      startedAt: '2026-10-02T00:00:00.000Z',
      expiresAt: null,
    },
    ...overrides,
  }
}

describe('csvCell / toCsv', () => {
  it('mengutip sel yang memuat koma, kutip, atau baris baru', () => {
    expect(csvCell('a,b')).toBe('"a,b"')
    expect(csvCell('kata "kutip"')).toBe('"kata ""kutip"""')
    expect(csvCell('baris\nbaru')).toBe('"baris\nbaru"')
    expect(csvCell('aman')).toBe('aman')
    expect(csvCell(null)).toBe('')
  })

  it('menetralkan sel yang bisa dieksekusi sebagai formula', () => {
    for (const value of ['=SUM(A1:A9)', '+1+1', '-2+3', '@import']) {
      expect(csvCell(value)).toBe(`'${value}`)
    }
  })

  it('memakai CRLF di akhir setiap baris', () => {
    expect(toCsv([['a', 'b'], ['c', 'd']])).toBe('a,b\r\nc,d\r\n')
  })
})

describe('usersCsv', () => {
  it('memuat header laporan & nilai paket yang berlaku', () => {
    const csv = usersCsv([user()])
    const [header, row] = csv.split('\r\n')
    expect(header).toContain('email')
    expect(header).toContain('jumlah_dompet')
    expect(header).toContain('pemakaian_ai_bulan_ini')
    expect(row).toContain('rina@catet.id')
    expect(row).toContain('Paket Waras')
    expect(row).toContain('selamanya')
  })

  it('TIDAK pernah memuat isi catatan pribadi user', () => {
    const csv = usersCsv([user()]).toLowerCase()
    for (const forbidden of ['description', 'catatan', 'nominal', 'saldo', 'balance']) {
      expect(csv.includes(forbidden), forbidden).toBe(false)
    }
  })

  it('menandai onboarding yang belum selesai secara eksplisit', () => {
    const csv = usersCsv([user({ onboardingCompleted: false })])
    expect(csv).toContain('belum')
  })
})

describe('paymentsCsv', () => {
  const payment: AdminPaymentView = {
    orderId: 'order-1',
    userId: 'u-1',
    status: 'settlement',
    amount: 129_000,
    paymentMethod: 'qris',
    purpose: 'subscribe',
    tierName: 'waras',
    billingPeriod: 'lifetime',
    createdAt: '2026-10-01T00:00:00.000Z',
    paidAt: '2026-10-01T00:05:00.000Z',
    email: 'rina@catet.id',
    name: 'Rina Putri',
    planId: 'waras',
    statusGroup: 'paid',
    methodLabel: 'QRIS',
  }

  it('memuat kolom pembukuan yang dibutuhkan', () => {
    const csv = paymentsCsv([payment])
    const [header, row] = csv.split('\r\n')
    expect(header).toContain('order_id')
    expect(header).toContain('kelompok_status')
    expect(header).toContain('nominal')
    expect(row).toContain('order-1')
    expect(row).toContain('paid')
    expect(row).toContain('129000')
    expect(row).toContain('Paket Waras')
  })
})

describe('csvFileName', () => {
  it('memakai tanggal lokal & jenis laporan', () => {
    expect(csvFileName('user', new Date('2026-11-01T10:00:00'))).toBe('catetind-user-2026-11-01.csv')
    expect(csvFileName('pembayaran', new Date('2026-11-01T10:00:00'))).toBe(
      'catetind-pembayaran-2026-11-01.csv',
    )
  })
})
