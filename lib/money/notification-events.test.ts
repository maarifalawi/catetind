import { beforeEach, describe, expect, it } from 'vitest'
import { localISODate } from '@/lib/time'
import { recordTransaction } from '@/lib/transaction-bus'
import { resetMoneyStore } from './store'
import { resetBillsStore, markBillPaid } from './bills-store'
import { resetFundsStore, contributeToFund } from './funds-store'
import {
  clearNotifications,
  getNotificationsSnapshot,
  markAllNotificationsRead,
  resetNotificationsStore,
  unreadNotificationCount,
} from './notification-store'

/* ── LONCENG HIDUP: SEMUA AKTIVITAS MENINGGALKAN ITEM ─────────────────────────
   Lonceng dulu cuma pintu ke halaman pengaturan. Test ini mengunci empat
   sumber yang diminta produk — kas, tagihan, celengan, dan aktivitas Dompet
   Bersama (diuji terpisah di `joint-contribution.test.ts`) — plus dua aksi
   daftar: "tandai semua dibaca" dan "bersihkan". */

function kinds() {
  return getNotificationsSnapshot().items.map((item) => item.kind)
}

beforeEach(() => {
  resetNotificationsStore()
  resetMoneyStore()
  resetBillsStore()
  resetFundsStore()
})

describe('notifikasi dari aktivitas akun', () => {
  it('mencatat pengeluaran menambah item "expense"', () => {
    recordTransaction({
      name: 'Kopi',
      amount: 25_000,
      type: 'expense',
      category: 'Makanan',
      wallet: 'BCA',
      date: localISODate(),
    })
    expect(kinds()).toContain('expense')
    const item = getNotificationsSnapshot().items[0]
    expect(item.href).toBe('/history')
    expect(item.read).toBe(false)
  })

  it('membayar tagihan menambah item "bill-paid"', () => {
    const paid = markBillPaid('5', 'BCA')
    expect(paid).not.toBeNull()
    expect(kinds()).toContain('bill-paid')
  })

  it('setoran celengan menambah item "fund"', () => {
    const result = contributeToFund(1, 100_000, 'bca', localISODate())
    expect(result).not.toBeNull()
    expect(kinds()).toContain('fund')
  })

  it('tandai semua dibaca & bersihkan mengubah daftar', () => {
    recordTransaction({
      name: 'Gaji',
      amount: 5_000_000,
      type: 'income',
      category: 'Gaji',
      wallet: 'BCA',
      date: localISODate(),
    })
    expect(unreadNotificationCount()).toBeGreaterThan(0)
    markAllNotificationsRead()
    expect(unreadNotificationCount()).toBe(0)
    clearNotifications()
    expect(getNotificationsSnapshot().items).toHaveLength(0)
  })
})
