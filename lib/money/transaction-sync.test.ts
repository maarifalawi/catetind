import { beforeEach, describe, expect, it } from 'vitest'
import { getMoneySnapshot, recordedTransactions, resetMoneyStore, walletBalance } from './store'
import { recordedTransactionsForContext } from './context-filter'
import { computeDailyHud, periodWindowForTab, spentInWindow, spentOn } from '@/lib/data/budget'
import { recordDraftTransaction } from '@/lib/transaction-bus'
import { localISODate } from '@/lib/data/history'

/* ── SINKRONISASI CATATAN (paket 74 · temuan audit Phase 1) ──────────────────
   Keluhan asli: mencatat transaksi (manual/AI) memunculkan toast sukses & saldo
   dompet ikut terpotong, TAPI catatannya tidak muncul di Riwayat dan "Jatah Hari
   Ini" tidak ikut turun.

   Kontrak yang dikunci di sini: SATU tulisan → TIGA efek, dibaca lewat fungsi
   yang BENAR-BENAR dipakai kartunya (bukan salinan rumus):
     · Riwayat / Home  → `recordedTransactionsForContext(snapshot, ctx)`
     · Jatah hari ini  → `spentOn` / `spentInWindow` → `computeDailyHud`
     · Saldo dompet    → `walletBalance(snapshot, id)`

   Jalur tulisnya juga jalur asli: `recordDraftTransaction()` — fungsi yang
   dipanggil shell input (`useTransactionSubmit`) saat user menekan "Catat". */

beforeEach(() => resetMoneyStore())

describe('catat pengeluaran → Riwayat + Jatah Hari Ini + saldo bergerak bersama (paket 74)', () => {
  it('satu tulis manual menyentuh daftar, jatah hari ini, dan saldo dompet', () => {
    const today = localISODate()
    const window = periodWindowForTab('monthly', today)

    const before = getMoneySnapshot()
    const rowsBefore = recordedTransactionsForContext(before, 'pribadi')
    const spentBefore = spentInWindow(rowsBefore, window)
    const spentTodayBefore = spentOn(rowsBefore, today)
    const balanceBefore = walletBalance(before, 'bca')

    recordDraftTransaction(
      { amount: 25_000, note: 'Kopi pagi', type: 'expense', category: 'Makanan' },
      'BCA',
    )

    const after = getMoneySnapshot()
    const rowsAfter = recordedTransactionsForContext(after, 'pribadi')

    /* 1) RIWAYAT — barisnya benar-benar masuk daftar, bukan cuma toast. */
    expect(rowsAfter.map((tx) => tx.name)).toContain('Kopi pagi')

    /* 2) JATAH HARI INI — input kartu (`spent`/`spentToday`) naik persis nominal. */
    expect(spentOn(rowsAfter, today)).toBe(spentTodayBefore + 25_000)
    expect(spentInWindow(rowsAfter, window)).toBe(spentBefore + 25_000)

    /* 3) SALDO — dompet sumber ikut terpotong. */
    expect(walletBalance(after, 'bca')).toBe(balanceBefore - 25_000)

    /* HUD yang dibaca kartu: sisa jatah hari ini turun, pemakaian naik. */
    const hudBefore = computeDailyHud({ spent: spentBefore, spentToday: spentTodayBefore, window })
    const hudAfter = computeDailyHud({
      spent: spentBefore + 25_000,
      spentToday: spentTodayBefore + 25_000,
      window,
    })
    expect(hudAfter.remainingToday).toBe(hudBefore.remainingToday - 25_000)
    expect(hudAfter.todayUsedPct).toBeGreaterThan(hudBefore.todayUsedPct)
  })

  it('catatan yang DITOLAK (saldo kurang) tidak bocor ke Riwayat maupun Jatah', () => {
    const today = localISODate()
    const window = periodWindowForTab('monthly', today)
    const balance = walletBalance(getMoneySnapshot(), 'tunai')

    const rowsBefore = recordedTransactionsForContext(getMoneySnapshot(), 'keluarga')
    const spentBefore = spentInWindow(rowsBefore, window)

    expect(() =>
      recordDraftTransaction(
        { amount: balance + 1, note: 'Kebesaran', type: 'expense', category: 'Makanan' },
        'Tunai',
      ),
    ).toThrow()

    const rowsAfter = recordedTransactionsForContext(getMoneySnapshot(), 'keluarga')
    expect(rowsAfter).toEqual(rowsBefore)
    expect(spentInWindow(rowsAfter, window)).toBe(spentBefore)
    expect(walletBalance(getMoneySnapshot(), 'tunai')).toBe(balance)
  })
})

/* ── NAMA CATATAN DARI KATEGORI (paket 86) ───────────────────────────────────
   Permintaan pemilik produk: Riwayat jangan berbunyi "Pengeluaran cepat" /
   "Pemasukan cepat" — user harus langsung tahu catatannya buat apa. Form tambah
   SUDAH mewajibkan kategori ("Makanan", "Gaji", "Bonus"), jadi kategorinyalah
   yang menjadi nama barisnya saat catatan dibiarkan kosong. */
describe('nama catatan kosong = KATEGORI pilihan user (paket 86)', () => {
  it('tanpa catatan: baris memakai kategori, bukan "Pengeluaran cepat"', () => {
    recordDraftTransaction(
      { amount: 22_000, note: '', type: 'expense', category: 'Makanan' },
      'BCA',
    )

    const rows = recordedTransactions(getMoneySnapshot())
    expect(rows[0]?.name).toBe('Makanan')
    expect(rows.map((row) => row.name)).not.toContain('Pengeluaran cepat')
  })

  it('catatan yang diketik user tetap menang atas kategori', () => {
    recordDraftTransaction(
      { amount: 22_000, note: 'Kopi pagi', type: 'expense', category: 'Makanan' },
      'BCA',
    )
    expect(recordedTransactions(getMoneySnapshot())[0]?.name).toBe('Kopi pagi')
  })

  it('tanpa kategori (jalur onboarding): sebutan netral per tipe, tanpa kata "cepat"', () => {
    recordDraftTransaction({ amount: 5_000, note: '', type: 'income' }, 'BCA')

    const name = recordedTransactions(getMoneySnapshot())[0]?.name ?? ''
    expect(name).toBe('Pemasukan')
    expect(name).not.toMatch(/cepat/i)
  })
})
