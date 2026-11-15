import { describe, expect, it } from 'vitest'
import type { Bill } from '@/lib/data/bills'
import { toBill, toBillDbRow } from '@/lib/supabase/domain-mappers'
import { mergeWithRemoteBills } from './bills-store'

/* ── KETAHANAN TAGIHAN SAAT REFRESH ───────────────────────────────────────────
   Bug yang dilaporkan: tagihan dibuat, halaman di-refresh, tagihan hilang.
   Dua jalur yang diuji di sini (tanpa jaringan):

     1. BARIS YANG SUDAH SAMPAI SERVER — `Bill → baris DB → Bill` harus kembali
        utuh, dan penggabungan dengan baris perangkat TIDAK boleh menggandakan
        atau membuang id domain lokalnya;
     2. BARIS YANG BELUM TERKIRIM — tetap bertahan sebagai antrean lokal, jadi
        refresh tidak pernah menghapus tagihan yang baru dibuat. */

const bill = (over: Partial<Bill> = {}): Bill => ({
  id: '7',
  emoji: '🏠',
  name: 'Kos',
  amount: 1_500_000,
  dueDate: 5,
  isRecurring: true,
  category: 'Rumah',
  walletId: 'bca',
  isPaidThisMonth: false,
  reminderDaysBefore: 3,
  scope: 'pribadi',
  ...over,
})

describe('tagihan bertahan setelah simpan + muat ulang', () => {
  it('baris server mempertahankan nama, nominal, jatuh tempo, dan id lokal', () => {
    const local = bill({ remoteId: 'uuid-bill-1' })
    const row = { ...toBillDbRow(local), id: 'uuid-bill-1' }
    const remote = toBill(row)

    const merged = mergeWithRemoteBills(
      [remote],
      { bills: [local], removedIds: [], hydrated: true },
      { version: 1, bills: [local], removedIds: [] },
    )

    expect(merged.bills).toHaveLength(1)
    expect(merged.bills[0]).toMatchObject({
      id: '7',
      name: 'Kos',
      amount: 1_500_000,
      dueDate: 5,
      emoji: '🏠',
      remoteId: 'uuid-bill-1',
    })
  })

  it('tagihan yang belum terkirim tidak hilang saat hidrasi', () => {
    const pending = bill({ id: '1000001', name: 'Langganan Baru', remoteId: undefined })
    const merged = mergeWithRemoteBills(
      [],
      { bills: [pending], removedIds: [], hydrated: true },
      { version: 1, bills: [pending], removedIds: [] },
    )
    expect(merged.bills.map((item) => item.id)).toContain('1000001')
    expect(merged.bills[0].name).toBe('Langganan Baru')
  })
})
