import { beforeEach, describe, expect, it } from 'vitest'
import {
  cashTotal,
  getMoneySnapshot,
  isRowRemoved,
  mergeMoneySnapshot,
  postBalanceAdjustment,
  postExpense,
  recordedTransactions,
  removeRow,
  resetMoneyStore,
  walletBalance,
  type MoneyRow,
} from './store'
import { computeDailyHud } from '@/lib/data/budget'
import { sharesOf, type LedgerTx } from '@/lib/data/joint-ledger'
import {
  INITIAL_FILTERS,
  filterHistoryTransactions,
  manualCategoryChoice,
} from '@/lib/data/history'
import { recordDraftTransaction } from '@/lib/transaction-bus'
import type { TransactionType } from '@/lib/types'
import {
  INITIAL_DEBTS,
  INITIAL_INVESTMENTS,
  activeDebtRemaining,
  activeReceivableTotal,
  netWorthParts,
  totalPortfolioValue,
} from '@/lib/data/wealth'
import { HISTORY_TODAY_ISO, localISODate } from '@/lib/data/history'

/* ── SMOKE TEST ALUR UANG (paket 43 · audit Stage 6 #5) ──────────────────────
   Empat skenario yang diminta audit, dijalankan pada LAPIS YANG BENAR-BENAR
   MEMUTUSKAN hasilnya: store uang (`lib/money/*`) dan mesin ledger bersama
   (`lib/data/joint-ledger.ts`). Di repo ini tidak ada DOM/Playwright, dan
   menambah dependency butuh izin eksplisit — jadi yang diperkuat adalah test
   unit di titik keputusan uang, bukan test yang mengklik tombol lalu berharap.

   Kenapa ini bukan "test palsu": setiap skenario menegaskan angka yang MUNCUL di
   halaman (saldo dompet, Net Worth, daftar catatan, HUD) lewat fungsi yang sama
   dengan yang dibaca halaman-halaman itu — bukan lewat salinan rumus.
   Langkah manual yang tidak bisa dijalankan lingkungan ini (browser 375/1440 px)
   tertulis sebagai checklist di laporan paket ini. */

const ME = 'user_a'
const PARTNER = 'user_b'
const MEMBERS = [ME, PARTNER]

function jointTx(partial: Partial<LedgerTx> & Pick<LedgerTx, 'amount' | 'split'>): LedgerTx {
  return {
    id: partial.id ?? 'smoke-tx',
    payerId: partial.payerId ?? ME,
    createdByUserId: partial.createdByUserId ?? partial.payerId ?? ME,
    amount: partial.amount,
    split: partial.split,
    date: partial.date ?? HISTORY_TODAY_ISO,
  }
}

/** Net Worth dari sumber yang sama dengan halaman Kekayaan (cash = store) */
function netWorthNow() {
  return netWorthParts({
    cash: cashTotal(getMoneySnapshot()),
    investments: totalPortfolioValue(INITIAL_INVESTMENTS),
    receivables: activeReceivableTotal(INITIAL_DEBTS),
    debts: activeDebtRemaining(INITIAL_DEBTS),
  }).netWorth
}

beforeEach(() => {
  resetMoneyStore()
})

describe('Skenario A — catat pengeluaran: saldo & HUD ikut berubah', () => {
  it('saldo dompet, total kas, daftar catatan, dan jatah harian bergerak bersama', () => {
    const bcaBefore = walletBalance(getMoneySnapshot(), 'bca')
    const cashBefore = cashTotal(getMoneySnapshot())

    const row = postExpense({ walletId: 'bca', amount: 85_000, note: 'Makan siang' })
    expect(row).not.toBeNull()

    const snapshot = getMoneySnapshot()
    expect(walletBalance(snapshot, 'bca')).toBe(bcaBefore - 85_000)
    expect(cashTotal(snapshot)).toBe(cashBefore - 85_000)

    /* daftar yang dibaca Home ("Transaksi Terakhir"), /history, & /wallet/[id] */
    const listed = recordedTransactions(snapshot)
    expect(listed.map((tx) => tx.name)).toContain('Makan siang')

    /* HUD: kartu di Home memakai `DAILY_HUD` (konstanta pacing mock), jadi yang
       dibuktikan di sini adalah INPUT-nya — `computeDailyHud` benar-benar turun
       ketika pengeluaran hari ini dibaca dari store, bukan dari konstanta.

       Tanggal pembanding = `localISODate()` (tanggal yang dipakai store saat
       menulis baris), BUKAN `HISTORY_TODAY_ISO`. Sejak audit 46: konstanta demo
       itu dipatok '2026-09-27', sedangkan mesin yang menjalankan test bisa
       berada di tanggal lain — membandingkan dengan konstanta membuat test ini
       gagal bukan karena uangnya salah, tapi karena kalender mesinnya beda
       (terbukti: dengan TZ yang membuat tanggal lokal = 27 Sep, test-nya hijau).
       Yang ingin dijaga test ini adalah "baris yang baru dicatat muncul di daftar
       hari ini", dan itu tetap terjaga lewat tanggal yang sama-sama dihasilkan
       store. */
    const spentToday = listed
      .filter((tx) => tx.type === 'expense' && tx.date === localISODate())
      .reduce((sum, tx) => sum + tx.amount, 0)
    expect(spentToday).toBe(85_000)

    const withoutSpend = computeDailyHud({ spent: 0 })
    const withSpend = computeDailyHud({ spent: spentToday })
    expect(withSpend.remaining).toBe(withoutSpend.remaining - 85_000)
    expect(withSpend.dailyBudget).toBeLessThan(withoutSpend.dailyBudget)
  })
})

describe('Skenario B — split joint 60/40: nominal transfer benar', () => {
  it('membebankan 60% ke aku & 40% ke pasangan, tanpa rupiah hilang', () => {
    const shares = sharesOf(
      jointTx({
        amount: 250_000,
        split: { type: 'percentage', percents: { [ME]: 60, [PARTNER]: 40 } },
      }),
      MEMBERS,
    )

    expect(shares[ME]).toBe(150_000)
    expect(shares[PARTNER]).toBe(100_000)
    expect(shares[ME] + shares[PARTNER]).toBe(250_000)
  })

  it('karena AKU yang menalangi, yang harus ditransfer pasangan = porsinya', () => {
    const shares = sharesOf(
      jointTx({
        amount: 250_000,
        payerId: ME,
        split: { type: 'percentage', percents: { [ME]: 60, [PARTNER]: 40 } },
      }),
      MEMBERS,
    )

    /* posisi bersih per orang: yang dibayar − porsinya (dasar transfer di /joint) */
    const myNet = 250_000 - shares[ME]
    const partnerNet = 0 - shares[PARTNER]

    expect(myNet).toBe(100_000)
    expect(partnerNet).toBe(-100_000)
    expect(myNet + partnerNet).toBe(0)
  })
})

describe('Skenario C — koreksi saldo: Net Worth ikut', () => {
  it('menaikkan saldo dompet & Net Worth dengan selisih yang sama', () => {
    const before = netWorthNow()

    const row = postBalanceAdjustment({ walletId: 'gopay', newBalance: 500_000 })
    expect(row).not.toBeNull()

    /* 350.000 → 500.000 = pemasukan tak tercatat 150.000 */
    expect(walletBalance(getMoneySnapshot(), 'gopay')).toBe(500_000)
    expect(netWorthNow()).toBe(before + 150_000)
  })

  it('koreksi ke bawah menurunkan Net Worth, bukan menaikkannya', () => {
    const before = netWorthNow()

    postBalanceAdjustment({ walletId: 'bca', newBalance: 1_300_000 })

    expect(netWorthNow()).toBe(before - 150_000)
    expect(recordedTransactions(getMoneySnapshot())).toHaveLength(1)
  })
})

describe('Skenario D — hapus catatan: bertahan lintas halaman & lintas refresh', () => {
  it('baris hilang dari SEMUA daftar halaman dan tetap hilang setelah state dibaca ulang', () => {
    const row = postExpense({ walletId: 'bca', amount: 30_000, note: 'Kopi' }) as MoneyRow
    expect(recordedTransactions(getMoneySnapshot())).toHaveLength(1)

    removeRow(row.id)

    /* Home, /history, dan /wallet/[id] membaca daftar yang sama */
    expect(recordedTransactions(getMoneySnapshot())).toHaveLength(0)
    expect(isRowRemoved(getMoneySnapshot(), row.id)).toBe(true)

    /* SIMULASI REFRESH/PINDAH HALAMAN: state dibaca ulang dari penyimpanan yang
       sama seperti saat hidrasi IndexedDB — tombstone-nya bertahan, jadi barisnya
       tidak "lahir lagi" (temuan audit #7 versi lama). */
    const snapshot = getMoneySnapshot()
    const afterReload = mergeMoneySnapshot({
      wallets: [...snapshot.wallets],
      rows: [...snapshot.rows],
      removedIds: [...snapshot.removedIds],
      syncedIds: [...snapshot.syncedIds],
    })

    expect(isRowRemoved(afterReload, row.id)).toBe(true)
    expect(recordedTransactions(afterReload)).toHaveLength(0)
  })
})

/* ── Skenario E — KATEGORI CATATAN MANUAL = PILIHAN USER (paket 54) ───────────
   Keluhannya: "Kategori di form tambah transaksi jangan otomatis — diinput
   manual saja oleh user." Dulu engine mengirim `type.suggested` (Pengeluaran →
   Makanan, Pemasukan → Gaji Utama, Tabungan → Dana Darurat, Transfer →
   Transfer), jadi Riwayat penuh kategori yang tidak pernah dipilih siapa pun.

   Yang dibuktikan di sini bukan sekadar "fungsi mengembalikan nilai X", tapi
   BARIS YANG BENAR-BENAR TERSIMPAN: dua baris pertama (`manualCategoryChoice()`
   + `recordDraftTransaction()`) adalah jalur yang sama dengan yang dijalankan
   engine saat user menekan "Catat", dan baris hasilnya dibaca dengan fungsi yang
   sama dengan halaman Riwayat (`recordedTransactions`, `filterHistoryTransactions`). */

describe('Skenario E — kategori manual = pilihan user, bukan tebakan tipe', () => {
  /** jalur tulis engine saat "Catat": putuskan kategori → tulis draft */
  function recordManual(type: TransactionType, picked: string) {
    const decision = manualCategoryChoice({ editing: false, type, picked })
    if (decision.category === null) return null // engine menahan submit di sini
    return recordDraftTransaction(
      {
        amount: 25_000,
        note: 'Beli kopi',
        type,
        category: decision.category,
        clientTxId: `tx-${type}-${picked || 'kosong'}`,
      },
      'BCA',
    )
  }

  it('pengeluaran & pemasukan menyimpan kategori yang DIPILIH user', () => {
    const expense = recordManual('expense', 'Makanan')
    const income = recordManual('income', 'Gaji Utama')

    expect(expense?.category).toBe('Makanan')
    expect(income?.category).toBe('Gaji Utama')

    /* yang dibaca halaman Riwayat/Home: baris yang sama, kategori yang sama */
    const listed = recordedTransactions(getMoneySnapshot())
    expect(listed.map((tx) => tx.category)).toEqual(
      expect.arrayContaining(['Makanan', 'Gaji Utama']),
    )
  })

  it('tabungan pakai kategori TETAP tipenya; transfer DITOLAK dari jalur ini (paket 55)', () => {
    /* form tidak menanyakan kategori di tipe ini — dan yang tersimpan bukan
       kategori karangan, tapi label aturannya */
    expect(recordManual('saving', '')?.category).toBe('Tabungan')

    /* PAKET 55: jalur catatan manual tidak lagi bisa menulis `transfer`. Chip-nya
       sudah tidak ditawarkan form (butuh dompet tujuan), dan store menolaknya
       sebagai pagar terakhir (`postTransaction` → `null`, tanpa satu baris pun).
       Dulu barisnya lahir SATU SISI: uangnya keluar dari dompet dan tidak
       mendarat di mana pun — bug "transfer ngambang" yang ditutup paket ini. */
    expect(() => recordManual('transfer', '')).toThrow()
    expect(recordedTransactions(getMoneySnapshot()).map((tx) => tx.category)).toEqual(['Tabungan'])
  })

  it('belum memilih kategori → TIDAK ada yang ditulis (tidak ada "Lainnya" diam-diam)', () => {
    expect(recordManual('expense', '')).toBeNull()
    expect(recordedTransactions(getMoneySnapshot())).toHaveLength(0)
  })

  it('kategori di luar daftar kanon tidak bisa tersimpan dari jalur manual', () => {
    /* 'Proyek' / 'Antar Dompet': semuanya berhenti di keputusan — tidak ada baris
       yang mustahil difilter di Riwayat */
    expect(recordManual('expense', 'Proyek')).toBeNull()
    /* dan `transfer` (paket 55) berhenti lebih awal lagi: store menolak tipenya,
       jadi tidak ada baris yang ditulis sama sekali dari jalur ini */
    expect(() => recordManual('transfer', 'Antar Dompet')).toThrow()
    expect(recordedTransactions(getMoneySnapshot())).toHaveLength(0)
  })

  it('Riwayat menemukan barisnya lewat filter kategori', () => {
    recordManual('expense', 'Makanan')
    recordManual('saving', '')

    const rows = recordedTransactions(getMoneySnapshot())
    const today = localISODate()

    const makanan = filterHistoryTransactions(
      rows,
      { ...INITIAL_FILTERS, category: 'makanan' },
      '',
      today,
    )
    expect(makanan.map((tx) => tx.name)).toEqual(['Beli kopi'])

    /* 'Tabungan' bukan kategori berpill sendiri → masuk bucket "Lainnya", dan
       itulah yang membuatnya tetap bisa ditemukan (bukan hilang tanpa filter) */
    const lainnya = filterHistoryTransactions(
      rows,
      { ...INITIAL_FILTERS, category: 'lainnya' },
      '',
      today,
    )
    expect(lainnya.map((tx) => tx.category)).toContain('Tabungan')
  })
})
