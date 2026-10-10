import { describe, expect, it } from 'vitest'
import { computeDailyHud, periodIncome, periodWindow } from './budget'
import type { HistoryTransaction } from './history'

/* ── PEMASUKAN REAL MENANG (redesain 82 · round 3) ──────────────────────────
   Sebelum ini jendela BULAN KALENDER selalu memakai angka konfigurasi user,
   sehingga catatan pemasukan yang BENAR-BENAR masuk di bulan itu diabaikan —
   kartu "Jatah Hari Ini" menampilkan angka statis yang tidak sync dengan ledger
   (keluhan: "kok ngga real time, jangan ada seed data").

   Test ini mengunci janji barunya:
     1. baris ledger NYATA dipakai lebih dulu;
     2. angka konfigurasi hanya jadi cadangan saat belum ada catatan masuk;
     3. "belum diatur" tidak lagi muncul saat uangnya sudah tercatat. */

const window = periodWindow('monthly', '2026-10-10')

const row = (
  date: string,
  amount: number,
  type: HistoryTransaction['type'],
): HistoryTransaction => ({
  id: Math.round(amount),
  name: 'Catatan',
  amount,
  type,
  category: 'Gaji Utama',
  wallet: 'BCA',
  date,
  time: '12:00',
  aiGenerated: false,
})

describe('computeDailyHud — sumber pemasukan jendela bulanan', () => {
  it('pemasukan ledger NYATA menang atas angka konfigurasi yang lebih besar', () => {
    const hud = computeDailyHud({
      monthlyIncome: 75_000_000, // angka statis (mis. warisan onboarding)
      totalInstallments: 0,
      spent: 0,
      earned: 6_500_000, // uang yang benar-benar masuk bulan ini
      window,
    })
    expect(hud.availablePool).toBe(6_500_000)
  })

  it('tanpa catatan pemasukan → jatuh ke angka konfigurasi (bukan nol)', () => {
    const hud = computeDailyHud({
      monthlyIncome: 9_000_000,
      totalInstallments: 0,
      spent: 0,
      earned: 0,
      window,
    })
    expect(hud.availablePool).toBe(9_000_000)
  })

  it('uang keluar ledger tetap menurunkan sisa — jatah harian ikut bergerak', () => {
    const before = computeDailyHud({ monthlyIncome: 9_000_000, earned: 0, spent: 0, window })
    const after = computeDailyHud({
      monthlyIncome: 9_000_000,
      earned: 0,
      spent: 1_500_000,
      window,
    })
    expect(after.remaining).toBe(before.remaining - 1_500_000)
    expect(after.dailyBudget).toBeLessThan(before.dailyBudget)
  })
})

describe('periodIncome — pemasukan nyata menentukan keadaan "belum diatur"', () => {
  it('sudah ada catatan pemasukan (walau konfigurasi 0) → BUKAN "belum diatur"', () => {
    const ledger = [row('2026-10-03', 6_500_000, 'income')]
    const income = periodIncome(window, ledger, 0)
    expect(income.configured).toBe(true)
    expect(income.hasIncome).toBe(true)
    expect(income.amount).toBe(6_500_000)
  })

  it('tanpa catatan & tanpa konfigurasi → tetap "belum diatur"', () => {
    const income = periodIncome(window, [], 0)
    expect(income.configured).toBe(false)
    expect(income.hasIncome).toBe(false)
  })
})
