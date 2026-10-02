import { beforeEach, describe, expect, it } from 'vitest'
import {
  addWalletAccount,
  applyRowOverride,
  cancelTransferRow,
  cashTotal,
  cashTotalByContext,
  defaultWalletNameFor,
  displayTypeOf,
  editRow,
  flushPendingSync,
  getMoneySnapshot,
  homeWallets,
  incomingTransfersFor,
  isRowRemoved,
  mergeMoneySnapshot,
  pendingSyncCount,
  pendingSyncRows,
  postBalanceAdjustment,
  postDebtSettlement,
  postExpense,
  postIncome,
  postTransaction,
  postTransfer,
  purgeMoneyStore,
  recordedTransactions,
  removeRow,
  removeRows,
  resetMoneyStore,
  restoreRow,
  restoreRows,
  rowForClientTxId,
  rowOverrideOf,
  transferLogOf,
  undoTransferCancellation,
  useMoneyStore,
  walletAccounts,
  walletAccountOf,
  walletBalance,
  walletNameOfId,
  walletOptionsFor,
  walletTransactionsOf,
  type MoneyRow,
  type MoneySnapshot,
} from './store'
import { assertLedgerInvariant, balanceOf, netEffect } from './ledger'
import { setOnlineOverride } from '@/lib/connection'
import { WALLET_SEED } from '@/lib/wallets'
import { HISTORY_TRANSACTIONS, type HistoryTransaction } from '@/lib/data/history'
import {
  HOME_MONEY_ROWS,
  homeMoneyRowFrom,
  summarizeHomeMoney,
  type HomeMoneyRow,
} from '@/lib/data/home-money'
import {
  INITIAL_DEBTS,
  INITIAL_INVESTMENTS,
  activeDebtRemaining,
  activeReceivableTotal,
  netWorthParts,
  totalPortfolioValue,
} from '@/lib/data/wealth'
import { applySettlement, cashDirectionOf, planDebtSettlement } from '@/lib/data/wealth-cash'
import {
  addDebt,
  getWealthSnapshot,
  paymentsOf,
  resetWealthStore,
  settleDebt,
} from './wealth-store'
import { moneyExportJson } from './export'

/* ── Test SATU STORE UANG (paket 40) ─────────────────────────────────────────
   Angka patokan yang dikunci di sini adalah angka KANON paket ini:

     BCA Rp 1.450.000 + GoPay Rp 350.000 + Tunai Rp 50.000 = Rp 1.850.000

   Angka itulah yang sekarang dibaca Home, `/wallet`, `/wallet/[id]`, Kekayaan,
   dan `app/api/wallets` — bukan lagi Rp 4.309.573 milik daftar dompet kedua yang
   dulu membuat Net Worth satu user berbeda Rp 2.459.573. */

const CANON_CASH = 1_850_000

/**
 * Σ saldo seluruh konteks uang (`pribadi + keluarga + bersama`).
 *
 * Ini BUKAN implementasi kedua dari Total Saldo — ia justru bentuk invariant
 * paket 44: jumlah ketiga konteks HARUS sama dengan `cashTotal()` yang dipakai
 * Home, `/wallet`, dan Kekayaan. Kalau suatu hari dua angka itu berbeda, satu
 * konteks pasti "menelan" dompet yang tidak boleh dilupakan.
 */
function totalAcrossContexts(snapshot: MoneySnapshot): number {
  return (['pribadi', 'keluarga', 'bersama'] as const).reduce(
    (sum, ctx) => sum + cashTotalByContext(snapshot, ctx),
    0,
  )
}

beforeEach(() => {
  resetMoneyStore()
  /* status koneksi netral di setiap kasus — test offline menyalakannya sendiri
     lewat `setOnlineOverride(false)` (paket 42) */
  setOnlineOverride(null)
})

describe('store seed', () => {
  it('total saldo kanon = Rp 1.850.000 dan saldo tiap dompet = saldo pembukanya', () => {
    const snapshot = getMoneySnapshot()
    expect(cashTotal(snapshot)).toBe(CANON_CASH)
    expect(walletBalance(snapshot, 'bca')).toBe(1_450_000)
    expect(walletBalance(snapshot, 'gopay')).toBe(350_000)
    expect(walletBalance(snapshot, 'tunai')).toBe(50_000)
    expect(walletAccounts(snapshot)).toHaveLength(WALLET_SEED.length)
  })

  it('hook store memakai snapshot server yang sama dengan seed (tanpa hydration mismatch)', () => {
    /* `useMoneyStore` butuh React; yang dijaga di sini adalah janji bentuknya:
       ada hook untuk komponen, dan snapshot biasa untuk pemakaian non-React. */
    expect(typeof useMoneyStore).toBe('function')
    expect(getMoneySnapshot().rows).toHaveLength(0)
  })
})

describe('saldo mengikuti baris ledger', () => {
  it('mencatat pengeluaran menurunkan saldo dompet & total kas', () => {
    const row = postExpense({ walletId: 'bca', amount: 85_000, note: 'Kopi', category: 'Makanan' })
    expect(row).not.toBeNull()

    const snapshot = getMoneySnapshot()
    expect(walletBalance(snapshot, 'bca')).toBe(1_450_000 - 85_000)
    expect(walletBalance(snapshot, 'gopay')).toBe(350_000)
    expect(cashTotal(snapshot)).toBe(CANON_CASH - 85_000)

    const [first] = recordedTransactions(snapshot)
    expect(first).toMatchObject({
      name: 'Kopi',
      amount: 85_000,
      type: 'expense',
      wallet: 'BCA',
      category: 'Makanan',
    })
  })

  it('menolak nominal tidak sah tanpa menulis apa pun', () => {
    expect(postExpense({ walletId: 'bca', amount: 0, note: 'Nol' })).toBeNull()
    expect(postExpense({ walletId: 'bca', amount: Number.NaN, note: 'NaN' })).toBeNull()
    expect(postIncome({ walletId: 'bca', amount: -1_000, note: 'Minus' })).toBeNull()
    expect(getMoneySnapshot().rows).toHaveLength(0)
  })
})

describe('pindah dana & koreksi saldo', () => {
  it('pindah dana menggerakkan dua saldo dan total kas tidak berubah', () => {
    const row = postTransfer({ fromWalletId: 'bca', toWalletId: 'gopay', amount: 100_000, note: '' })

    expect(row?.type).toBe('transfer')
    const snapshot = getMoneySnapshot()
    expect(walletBalance(snapshot, 'bca')).toBe(1_350_000)
    expect(walletBalance(snapshot, 'gopay')).toBe(450_000)
    expect(cashTotal(snapshot)).toBe(CANON_CASH)

    const [log] = transferLogOf(snapshot)
    expect(log).toMatchObject({ fromName: 'BCA', toName: 'GoPay' })
    expect(log?.transaction).toMatchObject({ type: 'transfer', wallet: 'BCA' })
    /* catatan kosong diberi nama yang sama seperti di Riwayat, bukan string kosong */
    expect(log?.transaction.name).toBe('Pindah ke GoPay')
  })

  it('menolak pindah dana melebihi saldo sumber', () => {
    expect(
      postTransfer({ fromWalletId: 'gopay', toWalletId: 'bca', amount: 350_001, note: '' }),
    ).toBeNull()
    expect(getMoneySnapshot().rows).toHaveLength(0)
  })

  it('menolak pindah dana ke dompet yang sama (uangnya tidak pindah ke mana-mana)', () => {
    expect(
      postTransfer({ fromWalletId: 'bca', toWalletId: 'bca', amount: 100_000, note: '' }),
    ).toBeNull()
    /* dan yang lebih penting: TIDAK ada baris yang ditulis, jadi tidak ada saldo
       yang bergerak sedikit pun */
    expect(getMoneySnapshot().rows).toHaveLength(0)
    expect(walletBalance(getMoneySnapshot(), 'bca')).toBe(1_450_000)
  })

  it('menulis kategori kanon “Transfer” supaya barisnya terjaring filter Riwayat', () => {
    const row = postTransfer({
      fromWalletId: 'bca',
      toWalletId: 'gopay',
      amount: 250_000,
      note: '',
    })
    expect(row?.category).toBe('Transfer')
    /* nama baris = yang dibaca user di Riwayat, bukan string kosong */
    expect(row?.note).toBe('Pindah ke GoPay')
  })

  it('sisi MASUK pindah dana terbaca di halaman dompet tujuan', () => {
    postTransfer({ fromWalletId: 'bca', toWalletId: 'gopay', amount: 250_000, note: '' })
    const snapshot = getMoneySnapshot()

    /* dompet asal tidak menerima apa-apa, dompet tujuan punya satu baris masuk */
    expect(incomingTransfersFor(snapshot, 'bca')).toHaveLength(0)
    const [into] = incomingTransfersFor(snapshot, 'gopay')
    expect(into).toMatchObject({
      name: 'Pindah ke GoPay',
      type: 'transfer',
      wallet: 'BCA',
      amount: 250_000,
    })

    /* membatalkannya dari halaman dompet tujuan menunjuk baris yang SAMA —
       kedua saldo tetap kembali seperti sebelum pindah */
    expect(cancelTransferRow(into!.id)).not.toBeNull()
    const after = getMoneySnapshot()
    expect(walletBalance(after, 'bca')).toBe(1_450_000)
    expect(walletBalance(after, 'gopay')).toBe(350_000)
  })
})

describe('pagar pindah dana di jalur catatan umum (paket 55)', () => {
  it('menolak `type: transfer` di postTransaction tanpa menulis satu baris pun', () => {
    /* inilah bug “transfer ngambang” yang ditutup paket 55: jalur ini tidak punya
       dompet tujuan, jadi baris yang lahir dari sini selalu SATU SISI */
    const rejected = postTransaction({
      name: 'Pindah ke GoPay',
      amount: 100_000,
      type: 'transfer',
      category: 'Transfer',
      wallet: 'BCA',
      dateISO: '2026-09-27',
    })

    expect(rejected).toBeNull()
    expect(getMoneySnapshot().rows).toHaveLength(0)
    expect(cashTotal(getMoneySnapshot())).toBe(CANON_CASH)
  })

  it('setoran celengan (`saving`) tetap boleh — satu sisi itu memang aturannya', () => {
    const row = postTransaction({
      name: 'Setor Dana Darurat',
      amount: 100_000,
      type: 'saving',
      category: 'Tabungan',
      wallet: 'BCA',
      dateISO: '2026-09-27',
    })

    expect(row?.type).toBe('transfer')
    /* sengaja TANPA dompet lawan: uangnya keluar kas ke celengan yang belum jadi
       dompet di ledger. Yang dilarang paket 55 adalah transfer DOMPET satu sisi. */
    expect(row?.counterWalletId).toBeUndefined()
    expect(walletBalance(getMoneySnapshot(), 'bca')).toBe(1_350_000)
    expect(cashTotal(getMoneySnapshot())).toBe(CANON_CASH - 100_000)
  })
})

describe('koreksi saldo (Smart Sync) — satu baris, nama yang sama dengan janji modal', () => {
  it('koreksi saldo menulis satu baris balance_adjustment bernama sama seperti janji modal', () => {
    const row = postBalanceAdjustment({ walletId: 'bca', newBalance: 1_400_000 })

    expect(row?.type).toBe('balance_adjustment')
    /* saldo sistem 1.450.000 → saldo asli 1.400.000: selisihnya -50.000 */
    expect(row?.amount).toBe(-50_000)
    expect(row?.note).toBe('Pengeluaran Tak Tercatat')

    const snapshot = getMoneySnapshot()
    expect(walletBalance(snapshot, 'bca')).toBe(1_400_000)
    expect(cashTotal(snapshot)).toBe(CANON_CASH - 50_000)

    /* catatan tak tercatat BENAR-BENAR muncul di Riwayat (dulu cuma toast) */
    const [first] = recordedTransactions(snapshot)
    expect(first).toMatchObject({ name: 'Pengeluaran Tak Tercatat', amount: 50_000, type: 'expense' })
  })

  it('selisih positif jadi pemasukan tak tercatat', () => {
    const row = postBalanceAdjustment({ walletId: 'tunai', newBalance: 75_000 })
    expect(row?.amount).toBe(25_000)
    expect(row?.note).toBe('Pemasukan Tak Tercatat')
    expect(displayTypeOf(row!)).toBe('income')
    expect(recordedTransactions(getMoneySnapshot())[0]).toMatchObject({
      name: 'Pemasukan Tak Tercatat',
      type: 'income',
      amount: 25_000,
    })
  })

  it('tidak menulis baris saat saldo sudah sama (tidak ada koreksi palsu)', () => {
    expect(postBalanceAdjustment({ walletId: 'bca', newBalance: 1_450_000 })).toBeNull()
    expect(getMoneySnapshot().rows).toHaveLength(0)
  })

  it('koreksi ikut terbaca di total kas alias sisi aset Net Worth', () => {
    postBalanceAdjustment({ walletId: 'gopay', newBalance: 300_000 })
    expect(cashTotal(getMoneySnapshot())).toBe(CANON_CASH - 50_000)
  })
})

describe('membatalkan pindah dana yang salah (paket 55)', () => {
  it('mengembalikan KEDUA saldo & menulis jejaknya, tanpa mengubah kas total', () => {
    postTransfer({ fromWalletId: 'bca', toWalletId: 'gopay', amount: 250_000, note: '' })
    const afterTransfer = getMoneySnapshot()
    /* rantaian bukti angka: 1.450.000/350.000 → 1.200.000/600.000 */
    expect(walletBalance(afterTransfer, 'bca')).toBe(1_200_000)
    expect(walletBalance(afterTransfer, 'gopay')).toBe(600_000)
    expect(cashTotal(afterTransfer)).toBe(CANON_CASH)

    const transferRowId = afterTransfer.rows[0]!.id
    const cancellation = cancelTransferRow(transferRowId)

    expect(cancellation).not.toBeNull()
    const afterCancel = getMoneySnapshot()
    /* kedua saldo kembali seperti SEBELUM transfer — bukan cuma satu sisi */
    expect(walletBalance(afterCancel, 'bca')).toBe(1_450_000)
    expect(walletBalance(afterCancel, 'gopay')).toBe(350_000)
    expect(cashTotal(afterCancel)).toBe(CANON_CASH)

    /* catatan pindah dananya hilang dari semua daftar, dan yang tersisa adalah
       dua jejak pengembalian yang namanya menjelaskan dirinya sendiri */
    expect(recordedTransactions(afterCancel).map((tx) => tx.name)).toEqual([
      'Batal terima dari BCA',
      'Batal pindah ke GoPay',
    ])
    expect(afterCancel.rows.filter((row) => row.type === 'balance_adjustment')).toHaveLength(2)
  })

  it('menolak membatalkan kalau uang pindahnya sudah terpakai di dompet tujuan', () => {
    const transfer = postTransfer({
      fromWalletId: 'bca',
      toWalletId: 'gopay',
      amount: 250_000,
      note: '',
    }) as MoneyRow

    /* uang di GoPay sudah dibelanjakan → saldonya tinggal 100.000 */
    postExpense({ walletId: 'gopay', amount: 500_000, note: 'Belanja' })

    expect(cancelTransferRow(transfer.id)).toBeNull()
    /* tidak ada yang dihapus & tidak ada koreksi yang ditulis */
    expect(recordedTransactions(getMoneySnapshot())).toHaveLength(2)
    expect(isRowRemoved(getMoneySnapshot(), transfer.id)).toBe(false)
  })

  it('bukan baris pindah dana → `null` (pemanggil memakai hapus biasa)', () => {
    const expense = postExpense({ walletId: 'bca', amount: 20_000, note: 'Kopi' }) as MoneyRow
    expect(cancelTransferRow(expense.id)).toBeNull()
    expect(isRowRemoved(getMoneySnapshot(), expense.id)).toBe(false)
  })

  it('Undo pembatalan memulihkan catatan DAN uangnya di dua dompet', () => {
    const transfer = postTransfer({
      fromWalletId: 'bca',
      toWalletId: 'gopay',
      amount: 250_000,
      note: '',
    }) as MoneyRow
    const cancellation = cancelTransferRow(transfer.id)!
    expect(walletBalance(getMoneySnapshot(), 'gopay')).toBe(350_000)

    undoTransferCancellation(cancellation)

    const restored = getMoneySnapshot()
    /* saldonya kembali ke keadaan SETELAH transfer (bukan cuma catatannya yang
       kembali) — kanon “hapus baris ≠ uang kembali” membuat Undo harus menulis
       pasangan koreksi baru, bukan mencabut tombstone */
    expect(walletBalance(restored, 'bca')).toBe(1_200_000)
    expect(walletBalance(restored, 'gopay')).toBe(600_000)
    expect(cashTotal(restored)).toBe(CANON_CASH)
    /* ceritanya lengkap di Riwayat: pindah dana → batal → dipulihkan */
    expect(recordedTransactions(restored).map((tx) => tx.name)).toEqual([
      'Terima dari BCA dipulihkan',
      'Pindah ke GoPay dipulihkan',
      'Batal terima dari BCA',
      'Batal pindah ke GoPay',
      'Pindah ke GoPay',
    ])
  })

  it('invariant ledger tetap lulus setelah seluruh kasus di atas', () => {
    const transfer = postTransfer({
      fromWalletId: 'bca',
      toWalletId: 'gopay',
      amount: 150_000,
      note: 'Uji invariant',
    }) as MoneyRow
    postTransaction({
      name: 'Setoran celengan',
      amount: 50_000,
      type: 'saving',
      category: 'Tabungan',
      wallet: 'BCA',
      dateISO: '2026-09-27',
    })
    cancelTransferRow(transfer.id)
    postExpense({ walletId: 'tunai', amount: 10_000, note: 'Parkir' })

    const snapshot = getMoneySnapshot()
    /* penjaga yang sama dengan yang dipakai store: Σ baris = Σ saldo − Σ opening
       dan saldo tiap dompet = opening + Σ barisnya */
    expect(() =>
      assertLedgerInvariant(snapshot.rows, {
        openings: Object.fromEntries(WALLET_SEED.map((wallet) => [wallet.id, wallet.opening])),
        balances: Object.fromEntries(
          WALLET_SEED.map((wallet) => [wallet.id, walletBalance(snapshot, wallet.id)]),
        ),
      }),
    ).not.toThrow()
    /* Σ pengaruh baris pindah dana DUA SISI = 0, termasuk setelah dibatalkan
       (baris `saving` sengaja satu sisi, jadi tidak ikut dijumlahkan di sini) */
    const twoSided = snapshot.rows.filter((row) => row.type === 'transfer' && row.counterWalletId)
    expect(twoSided).toHaveLength(1)
    expect(twoSided.reduce((sum, row) => sum + netEffect(row), 0)).toBe(0)
  })
})

describe('hapus bertahan (tombstone lintas halaman)', () => {
  it('baris sesi yang dihapus hilang dari daftar dan tetap hilang saat dibaca ulang', () => {
    const row = postExpense({ walletId: 'bca', amount: 20_000, note: 'Kopi kedua' }) as MoneyRow
    expect(recordedTransactions(getMoneySnapshot())).toHaveLength(1)

    removeRow(row.id)
    expect(recordedTransactions(getMoneySnapshot())).toHaveLength(0)
    expect(isRowRemoved(getMoneySnapshot(), row.id)).toBe(true)

    /* "pindah halaman lalu kembali": semua halaman membaca snapshot yang sama,
       jadi barisnya mustahil lahir lagi (dulu tiap halaman punya `removedIds`
       sendiri — temuan audit #7). */
    expect(recordedTransactions(getMoneySnapshot())).toHaveLength(0)
    /* yang dihapus barisnya, bukan uangnya: saldonya tetap seperti setelah dicatat */
    expect(walletBalance(getMoneySnapshot(), 'bca')).toBe(1_430_000)
  })

  it('tombstone juga berlaku untuk baris mock (id angka & id string layar lain)', () => {
    removeRow(5)
    removeRow('seed-2')
    const snapshot = getMoneySnapshot()
    expect(isRowRemoved(snapshot, 5)).toBe(true)
    expect(isRowRemoved(snapshot, '5')).toBe(true)
    expect(isRowRemoved(snapshot, 'seed-2')).toBe(true)
    expect(isRowRemoved(snapshot, 7)).toBe(false)
  })

  it('satu baris sesi dikenali sama dari Home (`session-9001`) maupun Riwayat (`9001`)', () => {
    const row = postExpense({ walletId: 'bca', amount: 15_000, note: 'Kopi ketiga' }) as MoneyRow
    /* Home memakai id ringkasannya (`session-9001`), Riwayat & halaman dompet
       memakai `HistoryTransaction.id` (angka) — keduanya harus menunjuk baris
       yang sama, kalau tidak hapus di Home tidak terlihat di Riwayat. */
    expect(row.id).toBe(`session-${row.seq}`)

    removeRow(`session-${row.seq}`)
    expect(isRowRemoved(getMoneySnapshot(), row.seq)).toBe(true)
    expect(recordedTransactions(getMoneySnapshot())).toHaveLength(0)

    restoreRow(`session-${row.seq}`)
    expect(isRowRemoved(getMoneySnapshot(), row.seq)).toBe(false)
    expect(recordedTransactions(getMoneySnapshot())).toHaveLength(1)
  })

  it('Undo mengembalikan baris tanpa membuat tulisan kedua', () => {
    const row = postExpense({ walletId: 'bca', amount: 30_000, note: 'Batal dihapus' }) as MoneyRow
    removeRow(row.id)
    expect(recordedTransactions(getMoneySnapshot())).toHaveLength(0)

    restoreRow(row.id)
    const after = recordedTransactions(getMoneySnapshot())
    expect(after).toHaveLength(1)
    expect(after[0]?.id).toBe(row.seq)
    /* saldo tidak berubah dua kali karena Undo cuma mencabut tombstone */
    expect(walletBalance(getMoneySnapshot(), 'bca')).toBe(1_420_000)
  })
})

describe('jalur tulis dari panel input & AI capture', () => {
  it('expense/income/transfer/saving jadi baris ledger yang benar', () => {
    postTransaction({
      name: 'Gaji',
      amount: 5_000_000,
      type: 'income',
      category: 'Pemasukan',
      wallet: 'BCA',
      dateISO: '2026-09-27',
    })
    expect(walletBalance(getMoneySnapshot(), 'bca')).toBe(1_450_000 + 5_000_000)

    postTransaction({
      name: 'Setoran celengan',
      amount: 200_000,
      type: 'saving',
      category: 'Dana Darurat',
      wallet: 'BCA',
      dateISO: '2026-09-27',
    })
    /* 'saving' = uang pindah keluar kas (transfer satu sisi), bukan pengeluaran */
    expect(getMoneySnapshot().rows[0]?.type).toBe('transfer')
    expect(cashTotal(getMoneySnapshot())).toBe(CANON_CASH + 5_000_000 - 200_000)
  })

  it('dompet yang belum ada di ledger tetap tercatat, tapi tidak menggerakkan saldo', () => {
    postTransaction({
      name: 'Top up',
      amount: 50_000,
      type: 'expense',
      category: 'Lainnya',
      wallet: 'OVO',
      dateISO: '2026-09-27',
    })

    const snapshot = getMoneySnapshot()
    expect(cashTotal(snapshot)).toBe(CANON_CASH)
    expect(recordedTransactions(snapshot)[0]).toMatchObject({ wallet: 'OVO', amount: 50_000 })
  })

  it('dompet default ikut konteks uang yang aktif', () => {
    expect(defaultWalletNameFor('pribadi')).toBe('BCA')
    expect(defaultWalletNameFor('keluarga')).toBe('Tunai')
    /* PAKET 59 · 59.4 — `''`, BUKAN 'Tunai'. Sebelumnya konteks `bersama` yang
       belum punya dompet kanon jatuh ke 'Tunai' (dompet konteks KELUARGA), jadi
       catatan yang dibuat sambil switcher di posisi "Bersama" memotong saldo
       Tunai tanpa user sadari (temuan audit #1). Konteks tanpa dompet sekarang
       menjawab jujur: tidak ada dompet, dan penulisannya ditolak dengan arahan. */
    expect(defaultWalletNameFor('bersama')).toBe('')
  })
})

describe('satu angka di empat titik', () => {
  it('Total Saldo Home, hero /wallet, kartu dompet, dan kas likuid Kekayaan sama', () => {
    const snapshot = getMoneySnapshot()
    const homeTotal = homeWallets(snapshot, 'all').reduce((sum, wallet) => sum + wallet.balance, 0)
    const walletHero = cashTotal(snapshot)
    const wealthCash = cashTotal(snapshot)
    const bcaCard = homeWallets(snapshot, 'all').find((wallet) => wallet.id === 'bca')?.balance
    const bcaDetail = walletAccountOf(snapshot, 'bca')?.balance

    /* ketiga titik agregat membaca angka yang SAMA (dulu 4.309.573 vs 1.850.000) */
    expect(homeTotal).toBe(CANON_CASH)
    expect(walletHero).toBe(homeTotal)
    expect(wealthCash).toBe(homeTotal)
    /* halaman detail dompet juga tidak boleh berbeda dari kartunya di Home */
    expect(bcaDetail).toBe(bcaCard)
    expect(bcaDetail).toBe(1_450_000)
  })

  it('koreksi saldo di /wallet ikut terlihat di Kekayaan, Home, dan halaman detail', () => {
    postBalanceAdjustment({ walletId: 'gopay', newBalance: 400_000 })
    const snapshot = getMoneySnapshot()

    const homeTotal = homeWallets(snapshot, 'all').reduce((sum, wallet) => sum + wallet.balance, 0)
    expect(homeTotal).toBe(CANON_CASH + 50_000)
    expect(cashTotal(snapshot)).toBe(homeTotal)
    expect(walletAccountOf(snapshot, 'gopay')?.balance).toBe(400_000)
    /* dan catatannya benar-benar ada untuk dibaca Riwayat */
    expect(recordedTransactions(snapshot)[0]?.name).toBe('Pemasukan Tak Tercatat')
  })
})

describe('Total Saldo per konteks uang (paket 44)', () => {
  /* Temuan uji pemakaian: Home menjumlahkan dompet yang TERSARING konteks
     (Rp 1.800.000 di konteks "pribadi") sementara `/wallet` & Kekayaan
     menjumlahkan semuanya (Rp 1.850.000) — dua "Total Saldo" untuk satu user.
     Aturan paket ini: Total Saldo = SELURUH dompet, dan saldo konteks tampil
     sebagai baris terpisah (`cashTotalByContext`). */

  it('angka 3 konteks: pribadi 1.800.000 · keluarga 50.000 · bersama 0', () => {
    const snapshot = getMoneySnapshot()
    expect(cashTotalByContext(snapshot, 'pribadi')).toBe(1_800_000) // BCA + GoPay
    expect(cashTotalByContext(snapshot, 'keluarga')).toBe(50_000) // Tunai
    expect(cashTotalByContext(snapshot, 'bersama')).toBe(0) // belum punya dompet
  })

  it('invariant: Σ per-konteks = total SEMUA dompet (BCA + GoPay + Tunai)', () => {
    const snapshot = getMoneySnapshot()
    const perContext = (['pribadi', 'keluarga', 'bersama'] as const).reduce(
      (sum, ctx) => sum + cashTotalByContext(snapshot, ctx),
      0,
    )

    expect(perContext).toBe(cashTotal(snapshot))
    expect(perContext).toBe(CANON_CASH)
    /* `'all'` harus identik dengan definisi Total Saldo, bukan angka kedua */
    expect(cashTotalByContext(snapshot, 'all')).toBe(cashTotal(snapshot))
  })

  it('konteks menyaring DAFTAR, bukan total: `cashTotal` sama untuk konteks apa pun', () => {
    const snapshot = getMoneySnapshot()

    /* daftarnya memang beda panjang — inilah yang membuat baris keterangan
       "Dompet Pribadi: Rp X" di Home perlu ada */
    expect(homeWallets(snapshot, 'pribadi').map((wallet) => wallet.id)).toEqual(['bca', 'gopay'])
    expect(homeWallets(snapshot, 'all')).toHaveLength(3)

    /* ...tapi Total Saldo tidak ikut mengecil (inilah temuan yang ditutup) */
    expect(totalAcrossContexts(snapshot)).toBe(CANON_CASH)
  })

  it('dompet baru & koreksi saldo mengalir ke konteksnya tanpa memecah invariant', () => {
    const record = addWalletAccount({ name: 'OVO', type: 'E-Wallet', opening: 25_000 })
    /* store menandai dompet baru sebagai `pribadi` (dompet chat harian) */
    postBalanceAdjustment({ walletId: 'gopay', newBalance: 400_000 })
    const snapshot = getMoneySnapshot()

    expect(cashTotalByContext(snapshot, 'pribadi')).toBe(1_800_000 + 50_000 + 25_000)
    expect(cashTotalByContext(snapshot, 'keluarga')).toBe(50_000)
    expect(totalAcrossContexts(snapshot)).toBe(cashTotal(snapshot))
    expect(cashTotal(snapshot)).toBe(CANON_CASH + 50_000 + 25_000)
    expect(record.context).toBe('pribadi')
  })
})

describe('hidrasi IndexedDB (gabungan state tersimpan)', () => {
  const storedRow = (seq: number, amount: number): MoneyRow => ({
    id: `session-${seq}`,
    walletId: 'bca',
    type: 'expense',
    amount,
    dateISO: '2026-09-26',
    note: `Catatan ${seq}`,
    seq,
    time: '08:00',
    aiGenerated: false,
    walletName: 'BCA',
  })

  it('kunjungan pertama (tanpa state tersimpan) tetap memakai dompet kanon, tanpa duplikat', () => {
    const merged = mergeMoneySnapshot(null, getMoneySnapshot())
    expect(merged.wallets).toHaveLength(WALLET_SEED.length)
    expect(merged.rows).toHaveLength(0)
    expect(merged.hydrated).toBe(true)
  })

  it('baris tersimpan + tombstone ikut kembali, dan baris sesi ini tidak hilang', () => {
    const fresh = postExpense({ walletId: 'tunai', amount: 10_000, note: 'Baru di sesi ini' })!
    const merged = mergeMoneySnapshot(
      { wallets: [...WALLET_SEED], rows: [storedRow(9500, 25_000)], removedIds: ['session-5'] },
      getMoneySnapshot(),
    )

    /* baris sesi ini (session-9001) dan baris tersimpan (session-9500) hidup bersama */
    expect(merged.rows.map((row) => row.id).sort()).toEqual(['session-9001', 'session-9500'])
    expect(merged.removedIds).toEqual(['session-5'])
    expect(merged.wallets).toHaveLength(WALLET_SEED.length)
    expect(fresh.id).toBe('session-9001')
  })

  it('dompet buatan user yang tersimpan tetap ada setelah refresh', () => {
    const record = addWalletAccount({ name: 'Kas Kecil', type: 'Cash', opening: 25_000 })
    const merged = mergeMoneySnapshot(
      { wallets: [WALLET_SEED[0]!, record], rows: [], removedIds: [] },
      getMoneySnapshot(),
    )
    expect(merged.wallets.map((wallet) => wallet.id)).toContain(record.id)
    /* tidak ada dompet yang dobel walau ia ada di state tersimpan DAN di memory */
    expect(merged.wallets.filter((wallet) => wallet.id === record.id)).toHaveLength(1)
  })
})

describe('dompet baru masuk store yang sama', () => {
  it('dompet baru menambah total kas dan punya saldonya sendiri', () => {
    const record = addWalletAccount({ name: 'Kas Kecil', type: 'Cash', opening: 25_000 })
    const snapshot = getMoneySnapshot()

    expect(walletAccounts(snapshot)).toHaveLength(WALLET_SEED.length + 1)
    expect(walletBalance(snapshot, record.id)).toBe(25_000)
    expect(cashTotal(snapshot)).toBe(CANON_CASH + 25_000)
    /* bentuk kartu Home-nya juga tersedia, jadi deck Home & `/wallet` membaca
       dompet yang sama (dulu dua daftar terpisah) */
    expect(homeWallets(snapshot, 'all').map((wallet) => wallet.id)).toContain(record.id)
  })
})

/* ── Pelunasan utang/piutang MENGGERAKKAN KAS (paket 41) ─────────────────────
   Angka patokan yang dikunci: Kredivo sisa Rp 2.500.000 dibayar Rp 500.000 dari
   BCA → saldo BCA Rp 1.450.000 − Rp 500.000 = Rp 950.000, dan Net Worth TIDAK
   berubah (kas turun Rp 500.000, hutang turun Rp 500.000). Sebelum paket ini
   kasnya tidak tersentuh sama sekali sehingga Net Worth naik Rp 500.000. */

describe('bayar hutang = debit dompet', () => {
  it('Rp 500.000 dari BCA: saldo BCA turun, kas turun, baris debt_payment tercatat', () => {
    const result = postDebtSettlement({
      debtId: '1',
      direction: 'out',
      walletId: 'bca',
      owedAmount: 2_500_000,
      paidAmount: 500_000,
      counterparty: 'Kredivo',
      dateISO: '2026-09-27',
    })

    expect(result).not.toBeNull()
    expect(result?.rows).toHaveLength(1)
    expect(result?.plan.remaining).toBe(2_000_000)
    expect(result?.walletName).toBe('BCA')
    expect(result?.walletBalanceAfter).toBe(1_450_000 - 500_000)

    const snapshot = getMoneySnapshot()
    expect(walletBalance(snapshot, 'bca')).toBe(950_000)
    expect(walletBalance(snapshot, 'gopay')).toBe(350_000)
    expect(cashTotal(snapshot)).toBe(CANON_CASH - 500_000)

    const [first] = recordedTransactions(snapshot)
    expect(first).toMatchObject({
      name: 'Bayar Kredivo',
      amount: 500_000,
      type: 'expense',
      wallet: 'BCA',
      category: 'Tagihan',
      date: '2026-09-27',
    })
  })

  it('Net Worth tidak berubah: kas turun sebesar hutang yang lunas', () => {
    const before = netWorthParts({
      cash: cashTotal(getMoneySnapshot()),
      investments: totalPortfolioValue(INITIAL_INVESTMENTS),
      receivables: activeReceivableTotal(INITIAL_DEBTS),
      debts: activeDebtRemaining(INITIAL_DEBTS),
    })

    const result = postDebtSettlement({
      debtId: '1',
      direction: 'out',
      walletId: 'bca',
      owedAmount: 2_500_000,
      paidAmount: 500_000,
      counterparty: 'Kredivo',
    })!

    const debtsAfter = INITIAL_DEBTS.map((debt) =>
      debt.id === '1' ? applySettlement(debt, result.plan) : debt,
    )
    const after = netWorthParts({
      cash: cashTotal(getMoneySnapshot()),
      investments: totalPortfolioValue(INITIAL_INVESTMENTS),
      receivables: activeReceivableTotal(debtsAfter),
      debts: activeDebtRemaining(debtsAfter),
    })

    expect(before.netWorth).toBe(14_699_330)
    expect(before.cash).toBe(1_850_000)
    expect(after.cash).toBe(1_350_000)
    expect(after.netWorth).toBe(before.netWorth)
  })

  it('menolak pembayaran yang melebihi saldo dompet — tanpa menulis apa pun', () => {
    const rows = getMoneySnapshot().rows.length
    const rejected = postDebtSettlement({
      debtId: '1',
      direction: 'out',
      walletId: 'tunai',
      owedAmount: 2_500_000,
      paidAmount: 500_000,
      counterparty: 'Kredivo',
    })

    expect(rejected).toBeNull()
    const snapshot = getMoneySnapshot()
    expect(snapshot.rows).toHaveLength(rows)
    expect(walletBalance(snapshot, 'tunai')).toBe(50_000)
    expect(cashTotal(snapshot)).toBe(CANON_CASH)
  })

  it('menolak dompet yang tidak ada di ledger & nominal tidak sah', () => {
    expect(
      postDebtSettlement({
        debtId: '1',
        direction: 'out',
        walletId: 'ovo' /* dompet mock lama yang TIDAK ada di ledger */,
        owedAmount: 100_000,
        paidAmount: 100_000,
        counterparty: 'Kredivo',
      }),
    ).toBeNull()
    expect(
      postDebtSettlement({
        debtId: '1',
        direction: 'out',
        walletId: 'bca',
        owedAmount: 100_000,
        paidAmount: 0,
        counterparty: 'Kredivo',
      }),
    ).toBeNull()
    expect(getMoneySnapshot().rows).toHaveLength(0)
  })
})


describe('pelunasan piutang = kredit dompet', () => {
  it('piutang Rp 50.000 diterima ke BCA: kas naik Rp 50.000', () => {
    const result = postDebtSettlement({
      debtId: '4',
      direction: 'in',
      walletId: 'bca',
      owedAmount: 50_000,
      paidAmount: 50_000,
      counterparty: 'Rina',
      dateISO: '2026-09-27',
    })!

    expect(result.plan.settled).toBe(true)
    expect(result.rows).toHaveLength(1)
    expect(walletBalance(getMoneySnapshot(), 'bca')).toBe(1_500_000)
    expect(cashTotal(getMoneySnapshot())).toBe(CANON_CASH + 50_000)

    const [first] = recordedTransactions(getMoneySnapshot())
    expect(first).toMatchObject({ name: 'Terima dari Rina', amount: 50_000, type: 'income' })
  })

  it('lebih bayar Rp 100.000 untuk piutang Rp 50.000: dua baris & kembalian di catatan', () => {
    const result = postDebtSettlement({
      debtId: '4',
      direction: 'in',
      walletId: 'bca',
      owedAmount: 50_000,
      paidAmount: 100_000,
      counterparty: 'Rina',
      dateISO: '2026-09-27',
    })!

    /* 1. piutangnya lunas, 2. sisanya jadi baris `change` yang menyebut siapa
       yang harus mengembalikan */
    expect(result.plan.rows).toEqual([
      { type: 'receivable_payment', amount: 50_000 },
      { type: 'change', amount: 50_000 },
    ])
    expect(result.rows.map((row) => row.type)).toEqual(['receivable_payment', 'change'])
    expect(result.rows[1]?.note).toContain('harus kamu kembalikan ke Rina')
    expect(result.plan.changeRecord).toMatchObject({ direction: 'owed_by_me', amount: 50_000 })

    /* uang yang benar-benar masuk = Rp 100.000 (sesuai yang diserahkan Rina) */
    expect(walletBalance(getMoneySnapshot(), 'bca')).toBe(1_550_000)
    expect(cashTotal(getMoneySnapshot())).toBe(CANON_CASH + 100_000)
  })
})

describe('invariant & pilihan dompet', () => {
  it('Σ baris = Σ saldo − Σ opening setelah bayar hutang, terima piutang, & kembalian', () => {
    postDebtSettlement({
      debtId: '1',
      direction: 'out',
      walletId: 'bca',
      owedAmount: 2_500_000,
      paidAmount: 500_000,
      counterparty: 'Kredivo',
    })
    postDebtSettlement({
      debtId: '4',
      direction: 'in',
      walletId: 'gopay',
      owedAmount: 50_000,
      paidAmount: 100_000,
      counterparty: 'Rina',
    })

    const snapshot = getMoneySnapshot()
    const openings = Object.fromEntries(
      snapshot.wallets.map((wallet) => [wallet.id, wallet.opening]),
    )
    const balances = Object.fromEntries(
      snapshot.wallets.map((wallet) => [wallet.id, walletBalance(snapshot, wallet.id)]),
    )
    /* Σ efek semua baris dihitung dari sisi kas, bukan dari angka yang disimpan */
    const rowsTotal = snapshot.rows.reduce(
      (sum, row) => sum + balanceOf([row], row.walletId, 0),
      0,
    )
    const openingsTotal = Object.values(openings).reduce((sum, value) => sum + value, 0)
    const balancesTotal = Object.values(balances).reduce((sum, value) => sum + value, 0)

    expect(() => assertLedgerInvariant(snapshot.rows, { openings, balances })).not.toThrow()
    expect(rowsTotal).toBe(balancesTotal - openingsTotal)
  })

  it('pilihan dompet datang dari ledger + saldonya (bukan daftar mock berisi dompet hantu)', () => {
    const options = walletOptionsFor(getMoneySnapshot())
    expect(options.map((option) => option.id)).toEqual(WALLET_SEED.map((wallet) => wallet.id))
    expect(options.map((option) => option.balance)).toEqual([1_450_000, 350_000, 50_000])
    expect(walletNameOfId(getMoneySnapshot(), 'gopay')).toBe('GoPay')
    expect(walletNameOfId(getMoneySnapshot(), 'ovo')).toBe('')
  })

  it('rencana yang dipakai sheet = rencana yang ditulis store (satu perencana)', () => {
    const preview = planDebtSettlement({
      direction: 'out',
      owedAmount: 2_500_000,
      paidAmount: 550_000,
      counterparty: 'Kredivo',
    })!
    const result = postDebtSettlement({
      debtId: '1',
      direction: 'out',
      walletId: 'bca',
      owedAmount: 2_500_000,
      paidAmount: 550_000,
      counterparty: 'Kredivo',
    })!

    expect(result.plan).toEqual(preview)
    expect(result.plan.rows).toEqual(preview.rows)
  })
})


describe('jenis baris baru di daftar transaksi', () => {
  it('pelunasan hutang tampil sebagai pengeluaran, pelunasan piutang sebagai pemasukan', () => {
    expect(
      displayTypeOf({ id: 'd', walletId: 'bca', type: 'debt_payment', amount: 500_000, dateISO: '2026-09-27', note: 'Bayar Kredivo' }),
    ).toBe('expense')
    expect(
      displayTypeOf({ id: 'r', walletId: 'bca', type: 'receivable_payment', amount: 150_000, dateISO: '2026-09-27', note: 'Terima dari Rina' }),
    ).toBe('income')
  })

  it('kembalian bertanda dibaca dari tanda nominalnya', () => {
    expect(
      displayTypeOf({ id: 'c1', walletId: 'bca', type: 'change', amount: 50_000, dateISO: '2026-09-27', note: 'Kembalian' }),
    ).toBe('income')
    expect(
      displayTypeOf({ id: 'c2', walletId: 'bca', type: 'change', amount: -50_000, dateISO: '2026-09-27', note: 'Kembalian' }),
    ).toBe('expense')
  })
})


/* ── Test anti double-catatan & antrean offline (paket 42) ───────────────────
   Dua temuan audit Stage 5 yang dikunci di sini:
     1. `handleSubmit` dulu tidak punya kunci apa pun, jadi double-tap / Enter
        lalu tap menghasilkan DUA catatan identik (dan saldo bergerak dua kali);
     2. tidak ada satu pun jejak "catatan lahir offline" — app tidak bisa jujur
        berkata berapa catatan yang belum diproses.

   Angka patokan yang dipakai sama dengan test lain di file ini: kas kanon
   Rp 1.850.000 (BCA 1.450.000 + GoPay 350.000 + Tunai 50.000). */

describe('idempotensi aksi tulis (paket 42)', () => {
  const draft = {
    name: 'Kopi',
    amount: 25_000,
    type: 'expense' as const,
    category: 'Makanan',
    wallet: 'BCA',
    dateISO: '2026-09-27',
  }

  it('DUA submit beruntun dengan kunci yang sama = SATU catatan', () => {
    const first = postTransaction({ ...draft, clientTxId: 'tx-dobel' })
    const second = postTransaction({ ...draft, clientTxId: 'tx-dobel' })

    expect(getMoneySnapshot().rows).toHaveLength(1)
    /* yang dikembalikan adalah baris PERTAMA (semantik idempotency key) */
    expect(second?.id).toBe(first?.id)
    /* dan saldonya hanya bergerak sekali — inti temuan audit #1 */
    expect(walletBalance(getMoneySnapshot(), 'bca')).toBe(1_450_000 - 25_000)
    expect(cashTotal(getMoneySnapshot())).toBe(CANON_CASH - 25_000)
  })

  it('kunci berbeda tetap jadi dua catatan (yang sah tidak ikut diblokir)', () => {
    postTransaction({ ...draft, clientTxId: 'tx-a' })
    postTransaction({ ...draft, clientTxId: 'tx-b' })
    expect(getMoneySnapshot().rows).toHaveLength(2)
    expect(walletBalance(getMoneySnapshot(), 'bca')).toBe(1_450_000 - 50_000)
  })

  it('baris kembar ditolak juga di lapis ledger, bukan cuma di store', () => {
    const row: MoneyRow = {
      id: 'session-1',
      walletId: 'bca',
      type: 'expense',
      amount: 1_000,
      dateISO: '2026-09-27',
      note: 'Kopi',
      clientTxId: 'kunci-sama',
      seq: 9001,
      time: '08:00',
      aiGenerated: false,
      walletName: 'BCA',
    }
    /* salinan baris yang sama dengan id berbeda = persis "dua catatan identik" */
    expect(() => assertLedgerInvariant([row, { ...row, id: 'session-2' }])).toThrow(/idempotensi/)
  })

  it('setiap baris membawa kunci walau pemanggil tidak mengirimnya', () => {
    /* penting untuk antrean offline: tanpa kunci, baris yang lahir offline tidak
       bisa dilacak untuk ditandai selesai */
    const row = postTransaction(draft)
    expect(row?.clientTxId).toBeTruthy()
    expect(rowForClientTxId(getMoneySnapshot(), row?.clientTxId ?? '')).toBeDefined()
  })
})

describe('antrean offline (paket 42)', () => {
  const draft = {
    name: 'Kopi susu',
    amount: 18_000,
    type: 'expense' as const,
    category: 'Makanan',
    wallet: 'BCA',
    dateISO: '2026-09-27',
  }

  it('catatan yang lahir OFFLINE masuk antrean, lalu diproses saat online', async () => {
    setOnlineOverride(false)
    postTransaction({ ...draft, clientTxId: 'offline-1' })
    postTransaction({ ...draft, clientTxId: 'offline-2' })

    /* catatannya TETAP ada (tersimpan lokal) & saldonya tetap benar ... */
    expect(recordedTransactions(getMoneySnapshot())).toHaveLength(2)
    expect(walletBalance(getMoneySnapshot(), 'bca')).toBe(1_450_000 - 36_000)
    /* ... tapi ditandai belum diproses — inilah angka yang dibaca banner */
    expect(pendingSyncCount()).toBe(2)
    expect(pendingSyncRows().map((row) => row.clientTxId)).toEqual(['offline-2', 'offline-1'])

    setOnlineOverride(true)
    /* paket 45: `flushPendingSync()` mengembalikan Promise karena ia benar-benar
       mengirim ke server (di test env tanpa Supabase, jalur "tersimpan di
       perangkat" yang dipakai — perilaku paket 42 dipertahankan apa adanya) */
    expect(await flushPendingSync()).toBe(2)
    expect(pendingSyncCount()).toBe(0)
    /* memproses ulang tidak menggandakan catatan */
    expect(await flushPendingSync()).toBe(0)
    expect(getMoneySnapshot().rows).toHaveLength(2)
  })

  it('catatan yang lahir ONLINE tidak pernah masuk antrean', () => {
    postTransaction({ ...draft, clientTxId: 'online-1' })
    expect(pendingSyncCount()).toBe(0)
  })

  it('antrean bertahan saat state dibaca ulang (refresh) — belum tersinkron tetap menunggu', () => {
    setOnlineOverride(false)
    postTransaction({ ...draft, clientTxId: 'offline-refresh' })

    const snapshot = getMoneySnapshot()
    /* simulasi hidrasi: yang tersimpan dibaca lagi, memory sesi ini kosong */
    const merged = mergeMoneySnapshot(
      {
        wallets: [...snapshot.wallets],
        rows: [...snapshot.rows],
        removedIds: [],
        syncedIds: [...snapshot.syncedIds],
      },
      { wallets: WALLET_SEED, rows: [], removedIds: [], removedWalletIds: [], rowOverrides: {}, syncedIds: [], hydrated: false },
    )

    expect(pendingSyncCount(merged)).toBe(1)
  })
})


/* ── Test EDIT LINTAS HALAMAN (paket 48 · temuan B laporan 46) ───────────────
   Yang dibuktikan di sini bukan "formnya tersimpan", tapi janji yang lebih
   mahal: SATU tindakan edit terlihat SAMA di semua tempat yang menampilkan
   baris itu — Riwayat, Home ("Transaksi Terakhir" + strip "Bulan ini"), grafik
   "Arus Uang", dan `/wallet/[id]` — dan tetap begitu setelah refresh.

   Caranya: halaman-halaman itu membaca store yang sama (`recordedTransactions`
   untuk baris store, `applyRowOverride` untuk baris mock), jadi yang diuji di
   sini adalah fungsi yang benar-benar mereka panggil — bukan salinan rumus. */

/** jumlah efek seluruh baris ledger — sisi kiri invariant "Σ baris = Σ saldo − Σ opening" */
function rowsTotal(rows: readonly MoneyRow[]): number {
  return rows.reduce((sum, row) => sum + netEffect(row), 0)
}

/** Σ opening seluruh dompet di snapshot */
function openingsTotal(snapshot: MoneySnapshot): number {
  return snapshot.wallets.reduce((sum, wallet) => sum + wallet.opening, 0)
}

describe('edit catatan = satu pintu tulis lintas halaman (paket 48)', () => {
  it('edit baris store menggerakkan saldo (nominal & dompet) tanpa merusak invariant', () => {
    const row = postExpense({ walletId: 'bca', amount: 50_000, note: 'Kopi' }) as MoneyRow
    expect(cashTotal(getMoneySnapshot())).toBe(CANON_CASH - 50_000)

    /* 1) nominal 50.000 → 20.000, dompet tetap */
    const edited = editRow(row.id, { amount: 20_000 }) as MoneyRow
    expect(edited).toMatchObject({ amount: 20_000, walletId: 'bca' })
    expect(walletBalance(getMoneySnapshot(), 'bca')).toBe(1_450_000 - 20_000)

    /* 2) pindah dompet BCA → GoPay: uangnya IKUT pindah, total kas tidak berubah.
       Riwayat memanggil baris ini dengan id angkanya (`seq`), Home dengan
       `session-<seq>` — keduanya harus menunjuk baris yang sama. */
    expect(editRow(row.seq, { wallet: 'GoPay' })).not.toBeNull()
    const snapshot = getMoneySnapshot()
    expect(walletBalance(snapshot, 'bca')).toBe(1_450_000)
    expect(walletBalance(snapshot, 'gopay')).toBe(350_000 - 20_000)
    expect(cashTotal(snapshot)).toBe(CANON_CASH - 20_000)

    /* barisnya DIPERBARUI, bukan ditambah: satu baris, satu catatan, nilai baru */
    expect(snapshot.rows).toHaveLength(1)
    expect(recordedTransactions(snapshot)[0]).toMatchObject({
      name: 'Kopi',
      amount: 20_000,
      wallet: 'GoPay',
      type: 'expense',
    })

    /* invariant yang sama dengan `assertSnapshot()`: Σ baris = Σ saldo − Σ opening */
    const openings = Object.fromEntries(snapshot.wallets.map((wallet) => [wallet.id, wallet.opening]))
    const balances = Object.fromEntries(
      snapshot.wallets.map((wallet) => [wallet.id, walletBalance(snapshot, wallet.id)]),
    )
    const balancesTotal = Object.values(balances).reduce((sum, value) => sum + value, 0)
    expect(rowsTotal(snapshot.rows)).toBe(balancesTotal - openingsTotal(snapshot))
    expect(() => assertLedgerInvariant(snapshot.rows, { openings, balances })).not.toThrow()
  })

  it('edit nominal baris MOCK tidak menggerakkan saldo, tapi tampil baru di Home & Riwayat', () => {
    const historyRow = HISTORY_TRANSACTIONS[1] as HistoryTransaction
    const homeRow = HOME_MONEY_ROWS.find((row) => row.id === 'seed-2') as HomeMoneyRow

    /* Riwayat: baris mock berid `2` → kunci `session-2` */
    expect(editRow(historyRow.id, { amount: 45_000 })).not.toBeNull()
    /* Home: baris seed (id `seed-2`) → kunci `seed-2` */
    expect(editRow(homeRow.id, { amount: 9_000_000 })).not.toBeNull()

    const snapshot = getMoneySnapshot()
    /* tidak ada baris ledger baru & tidak ada rupiah yang bergerak */
    expect(snapshot.rows).toHaveLength(0)
    expect(cashTotal(snapshot)).toBe(CANON_CASH)
    /* konstanta demo TIDAK disunting — yang berubah cuma pajangannya.
       Nominal barisnya sendiri 7.500.000 sejak paket 57: dulu 8.500.000,
       disatukan ke kanon demo `MONTHLY_INCOME` supaya tidak ada dua angka gaji
       (temuan AKAR C audit 2026-09) — lihat `HOME_MONEY_GROUPS`. */
    expect(HISTORY_TRANSACTIONS[1]?.amount).toBe(32_000)
    expect(homeRow.amount).toBe(7_500_000)
    /* yang dibaca Riwayat / Home / grafik arus uang: override yang sama */
    expect(applyRowOverride(snapshot, historyRow).amount).toBe(45_000)
    expect(applyRowOverride(snapshot, homeRow).amount).toBe(9_000_000)
  })

  it('edit bertahan setelah refresh (mergeMoneySnapshot) untuk baris store & baris mock', () => {
    const row = postExpense({ walletId: 'bca', amount: 50_000, note: 'Kopi' }) as MoneyRow
    /* Home memakai `session-<seq>`, Riwayat memakai angka — dua bentuk, satu baris */
    editRow(`session-${row.seq}`, { amount: 18_000, wallet: 'Tunai' })
    editRow(row.seq, { name: 'Kopi susu' })
    editRow(2, { amount: 45_000 })

    const snapshot = getMoneySnapshot()
    /* SIMULASI REFRESH: yang tersimpan di perangkat dibaca ulang, memory sesi kosong */
    const merged = mergeMoneySnapshot(
      {
        wallets: [...snapshot.wallets],
        rows: [...snapshot.rows],
        removedIds: [...snapshot.removedIds],
        rowOverrides: { ...snapshot.rowOverrides },
        syncedIds: [...snapshot.syncedIds],
      },
      {
        wallets: WALLET_SEED,
        rows: [],
        removedIds: [],
        removedWalletIds: [],
        rowOverrides: {},
        syncedIds: [],
        hydrated: false,
      },
    )

    expect(recordedTransactions(merged)[0]).toMatchObject({
      name: 'Kopi susu',
      amount: 18_000,
      wallet: 'Tunai',
    })
    expect(walletBalance(merged, 'tunai')).toBe(50_000 - 18_000)
    expect(rowOverrideOf(merged, 2)).toMatchObject({ amount: 45_000 })
    expect(applyRowOverride(merged, HISTORY_TRANSACTIONS[1] as HistoryTransaction).amount).toBe(45_000)
  })

  it('purgeMoneyStore() membuang override (akun yang dihapus tidak menghidupkan data contoh)', () => {
    editRow(2, { amount: 45_000 })
    expect(rowOverrideOf(getMoneySnapshot(), 2)).not.toBeNull()

    purgeMoneyStore()
    const snapshot = getMoneySnapshot()
    expect(snapshot.rowOverrides).toEqual({})
    expect(rowOverrideOf(snapshot, 2)).toBeNull()
    expect(applyRowOverride(snapshot, HISTORY_TRANSACTIONS[1] as HistoryTransaction).amount).toBe(32_000)
    expect(snapshot.wallets).toHaveLength(0)
  })

  it('edit baris yang sudah dihapus TIDAK menghidupkannya kembali', () => {
    const row = postExpense({ walletId: 'bca', amount: 25_000, note: 'Kopi' }) as MoneyRow
    removeRow(row.id)

    expect(editRow(row.id, { amount: 30_000 })).toBeNull()
    expect(isRowRemoved(getMoneySnapshot(), row.id)).toBe(true)
    expect(recordedTransactions(getMoneySnapshot())).toHaveLength(0)
    /* nominalnya juga tidak berubah diam-diam di belakang layar */
    expect(getMoneySnapshot().rows[0]?.amount).toBe(25_000)

    /* baris mock yang sudah dihapus pun tidak bisa di-edit */
    removeRow(2)
    expect(editRow(2, { amount: 45_000 })).toBeNull()
    expect(rowOverrideOf(getMoneySnapshot(), 2)).toBeNull()
  })

  it('menolak input tidak sah tanpa menulis apa pun (baris store maupun mock)', () => {
    const row = postExpense({ walletId: 'bca', amount: 25_000, note: 'Kopi' }) as MoneyRow

    expect(editRow(row.id, { amount: 0 })).toBeNull()
    expect(editRow(row.id, { amount: -5_000 })).toBeNull()
    expect(editRow(row.id, { amount: Number.NaN })).toBeNull()
    expect(editRow(row.id, { type: 'gaji' as never })).toBeNull()
    /* id dompet yang tidak ada di ledger = baris yang tidak menggerakkan saldo */
    expect(editRow(row.id, { walletId: 'ovo' })).toBeNull()
    expect(editRow(row.id, { dateISO: '27-09-2026' })).toBeNull()
    /* baris mock divalidasi dengan aturan yang sama */
    expect(editRow(2, { amount: 0 })).toBeNull()
    expect(editRow(2, { walletId: 'ovo' })).toBeNull()
    expect(rowOverrideOf(getMoneySnapshot(), 2)).toBeNull()
    /* id yang bukan baris mana pun: tidak ada yang ditulis */
    expect(editRow(999_999, { amount: 1_000 })).toBeNull()

    /* nominal, dompet, & nama barisnya tetap seperti semula */
    expect(recordedTransactions(getMoneySnapshot())[0]).toMatchObject({
      name: 'Kopi',
      amount: 25_000,
      wallet: 'BCA',
    })
  })

  it('jenis baris ledger dipertahankan saat nominalnya diedit (koreksi saldo tetap koreksi)', () => {
    const adjustment = postBalanceAdjustment({ walletId: 'bca', newBalance: 1_400_000 }) as MoneyRow
    expect(adjustment.type).toBe('balance_adjustment')
    expect(adjustment.amount).toBe(-50_000)

    /* sheet menampilkan "pengeluaran 50.000"; user mengubahnya jadi 20.000 */
    expect(editRow(adjustment.id, { amount: 20_000 })).not.toBeNull()
    const row = getMoneySnapshot().rows[0] as MoneyRow
    expect(row.type).toBe('balance_adjustment')
    expect(row.amount).toBe(-20_000)
    expect(walletBalance(getMoneySnapshot(), 'bca')).toBe(1_430_000)
  })

  it('ganti jenis baris transfer melepas dompet lawannya; dompet lawan tidak boleh jadi sumber', () => {
    const transfer = postTransfer({
      fromWalletId: 'bca',
      toWalletId: 'gopay',
      amount: 100_000,
      note: '',
    }) as MoneyRow
    expect(transfer.counterWalletId).toBe('gopay')

    /* sumber = dompet lawan → uangnya tidak pindah ke mana-mana: patch ditolak */
    expect(editRow(transfer.id, { wallet: 'GoPay' })).toBeNull()

    /* jenisnya diganti jadi pengeluaran biasa → dompet lawan dilepas supaya
       ledger tetap sah (GoPay tidak lagi menerima uang dari baris yang bukan
       transfer) */
    expect(editRow(transfer.id, { type: 'expense', amount: 90_000 })).not.toBeNull()
    const snapshot = getMoneySnapshot()
    const row = snapshot.rows[0] as MoneyRow
    expect(row.type).toBe('expense')
    expect(row.counterWalletId).toBeUndefined()
    expect(walletBalance(snapshot, 'bca')).toBe(1_450_000 - 90_000)
    expect(walletBalance(snapshot, 'gopay')).toBe(350_000)
  })

  it('dompet yang belum ada di ledger: barisnya "belum terhubung" (sama seperti saat dicatat)', () => {
    const row = postExpense({ walletId: 'bca', amount: 25_000, note: 'Kopi' }) as MoneyRow

    /* user memilih OVO di sheet padahal OVO belum jadi dompet: baris keluar dari
       BCA dan TIDAK menambah dompet mana pun — persis perilaku `postTransaction`
       untuk dompet yang belum terhubung */
    expect(editRow(row.id, { wallet: 'OVO' })).not.toBeNull()
    const snapshot = getMoneySnapshot()
    expect(snapshot.rows[0]?.walletId).toBe('')
    expect(snapshot.rows[0]?.walletName).toBe('OVO')
    expect(walletBalance(snapshot, 'bca')).toBe(1_450_000)
    expect(cashTotal(snapshot)).toBe(CANON_CASH)
    expect(recordedTransactions(snapshot)[0]).toMatchObject({ wallet: 'OVO', amount: 25_000 })
  })

  it('satu edit terbaca sama di Riwayat, Home, dan /wallet/[id] (arus uang ikut bergerak)', () => {
    /* Baris Home & strip "Bulan ini" dibangun persis seperti di
       `recent-transactions-card.tsx`/`cash-flow-card.tsx` SEJAK PAKET 58: satu
       sumber, baris LEDGER NYATA (`recordedTransactions()`) — konstanta seed
       `HOME_MONEY_ROWS` sudah berhenti menjadi sumber angka kartu Home (temuan
       AKAR A audit 2026-09), jadi ia tidak lagi ikut menyusun angka "before". */
    const homeRowsOf = (snapshot: MoneySnapshot) =>
      recordedTransactions(snapshot).map(homeMoneyRowFrom)
    const before = summarizeHomeMoney(homeRowsOf(getMoneySnapshot()))

    const row = postExpense({ walletId: 'bca', amount: 50_000, note: 'Kopi' }) as MoneyRow
    expect(editRow(row.seq, { amount: 20_000, wallet: 'GoPay' })).not.toBeNull()
    const snapshot = getMoneySnapshot()

    /* (a) Riwayat */
    const history = recordedTransactions(snapshot)
    expect(history).toHaveLength(1)
    expect(history[0]).toMatchObject({ name: 'Kopi', amount: 20_000, wallet: 'GoPay' })

    /* (b) Home: daftar "Transaksi Terakhir" + strip periode bergerak sebesar nilai BARU */
    const after = summarizeHomeMoney(homeRowsOf(snapshot))
    expect(after.expense).toBe(before.expense + 20_000)
    expect(after.count).toBe(before.count + 1)

    /* (c) /wallet/[id]: barisnya IKUT PINDAH dompet — hilang dari BCA, muncul di GoPay */
    expect(history.filter((tx) => tx.wallet === 'BCA')).toHaveLength(0)
    expect(history.filter((tx) => tx.wallet === 'GoPay')).toHaveLength(1)
    expect(walletBalance(snapshot, 'gopay')).toBe(350_000 - 20_000)
  })
})

/* ── SATU STORE KEKAYAAN ↔ SATU LEDGER KAS (paket 50 · temuan D laporan 46) ───
   Rantai bukti yang diminta paket ini, diukur dari halaman-halaman NYATA:
   catat hutang di `/wealth` → angka Net Worth (bar Tug-of-War) berubah **dan**
   file ekspor memuatnya; lunasi dari BCA → saldo BCA di `/wallet` turun, baris
   muncul di Riwayat, sisa hutang turun, dan Net Worth tidak melompat. */

function netWorthOfStores(): number {
  const wealth = getWealthSnapshot()
  return netWorthParts({
    cash: cashTotal(getMoneySnapshot()),
    investments: totalPortfolioValue(wealth.investments),
    receivables: activeReceivableTotal(wealth.debts),
    debts: activeDebtRemaining(wealth.debts),
  }).netWorth
}

describe('kekayaan & kas membaca keadaan yang sama', () => {
  beforeEach(() => {
    resetWealthStore()
  })

  it('tambah hutang Rp 1.000.000: Net Worth halaman turun & file ekspor memuatnya', () => {
    const before = netWorthOfStores()
    const created = addDebt({
      type: 'personal',
      direction: 'owed_by_me',
      counterparty: 'Dita',
      principal: 1_000_000,
      scope: 'pribadi',
    })

    expect(created).not.toBeNull()
    expect(activeDebtRemaining(getWealthSnapshot().debts)).toBe(
      activeDebtRemaining(INITIAL_DEBTS) + 1_000_000,
    )
    expect(netWorthOfStores()).toBe(before - 1_000_000)

    /* file ekspor yang benar-benar diunduh memuat catatan itu */
    const { file } = moneyExportJson(null, '2026-09-27T10:15:00.000Z')
    expect(file.debts.payable.some((debt) => debt.id === created!.id)).toBe(true)
    expect(file.counts.debts).toBe(
      INITIAL_DEBTS.filter((debt) => cashDirectionOf(debt) === 'out').length + 1,
    )
  })

  it('settleDebt Rp 500.000 dari BCA: saldo turun, baris di Riwayat, sisa hutang turun', () => {
    const netWorthBefore = netWorthOfStores()

    const result = settleDebt({ debtId: '1', walletId: 'bca', paidAmount: 500_000, dateISO: '2026-09-27' })

    expect(result).not.toBeNull()
    /* /wallet — saldo dibaca dari ledger yang sama */
    expect(walletBalance(getMoneySnapshot(), 'bca')).toBe(1_450_000 - 500_000)
    /* /history — baris kas nyata, bukan cuma angka di kartu hutang */
    expect(recordedTransactions(getMoneySnapshot())[0]).toMatchObject({
      name: 'Bayar Kredivo',
      amount: 500_000,
      wallet: 'BCA',
    })
    /* /wealth — sisa hutang & riwayat pembayarannya */
    expect(activeDebtRemaining(getWealthSnapshot().debts)).toBe(activeDebtRemaining(INITIAL_DEBTS) - 500_000)
    expect(paymentsOf(getWealthSnapshot(), '1').some((row) => row.id === result!.payment.id)).toBe(true)
    /* Net Worth TIDAK naik hanya karena melunasi (aturan laporan 41) */
    expect(netWorthOfStores()).toBe(netWorthBefore)
  })
})

/* ── Test HAPUS SEMUA RIWAYAT (paket 59 · item 59.2) ──────────────────────────
   Tombol "Hapus semua" di Riwayat memakai SATU pintu tulis (`removeRows`) — bukan
   perulangan `removeRow()` dari komponen. Yang dikunci di sini: tombstone untuk
   baris sesi DAN baris mock dalam satu panggilan, idempoten, SALDO TIDAK
   BERUBAH (kanon §4.5 — uang yang sudah keluar tidak kembali), Undo massal
   memulihkan semuanya, dan "hapus semua" benar-benar menyisakan nol catatan.

   Catatan: setiap `commit()` di store menjalankan `assertLedgerInvariant()`, jadi
   kasus-kasus di bawah sekaligus membuktikan ledger tetap seimbang setelah hapus
   massal (kalau tidak, penulisannya akan ditolak dan test ini gagal). */

describe('hapus massal riwayat (59.2)', () => {
  it('menulis tombstone baris sesi + baris mock dalam SATU panggilan', () => {
    const row = postExpense({ walletId: 'bca', amount: 25_000, note: 'Kopi' }) as MoneyRow
    const ids = [1, 2, row.seq]

    expect(removeRows(ids)).toBe(3)
    const snapshot = getMoneySnapshot()
    for (const id of ids) expect(isRowRemoved(snapshot, id)).toBe(true)
    /* daftar pajangan (Riwayat & Home) kosong, tapi barisnya TIDAK dibuang dari
       state — tombstone-nya yang menyembunyikan (aturan hapus repo) */
    expect(recordedTransactions(snapshot)).toHaveLength(0)
    expect(snapshot.rows).toHaveLength(1)
  })

  it('idempoten: daftar yang sama dua kali tidak menambah tombstone', () => {
    expect(removeRows([1, 2, 3])).toBe(3)
    expect(removeRows([1, 2, 3])).toBe(0)
    expect(removeRows([])).toBe(0)
    expect(getMoneySnapshot().removedIds).toHaveLength(3)
  })

  it('SALDO TIDAK BERUBAH setelah seluruh riwayat dihapus', () => {
    const balanceBefore = walletBalance(getMoneySnapshot(), 'bca')
    postExpense({ walletId: 'bca', amount: 85_000, note: 'Kopi' })
    const afterSpend = walletBalance(getMoneySnapshot(), 'bca')
    expect(afterSpend).toBe(balanceBefore - 85_000)

    const ids = [1, 2, ...getMoneySnapshot().rows.map((row) => row.seq)]
    expect(removeRows(ids)).toBe(ids.length)

    /* uang yang sudah keluar tetap keluar: saldo TIDAK naik kembali walau
       catatannya hilang dari Riwayat */
    expect(walletBalance(getMoneySnapshot(), 'bca')).toBe(afterSpend)
    expect(cashTotal(getMoneySnapshot())).toBe(CANON_CASH - 85_000)
  })

  it('Undo massal (`restoreRows`) memulihkan semua baris yang tadi hilang', () => {
    const row = postExpense({ walletId: 'bca', amount: 25_000, note: 'Kopi' }) as MoneyRow
    const ids = [1, 2, row.seq]
    removeRows(ids)
    expect(recordedTransactions(getMoneySnapshot())).toHaveLength(0)

    expect(restoreRows(ids)).toBe(3)
    const snapshot = getMoneySnapshot()
    expect(snapshot.removedIds).toHaveLength(0)
    expect(recordedTransactions(snapshot)).toHaveLength(1)
    expect(walletBalance(snapshot, 'bca')).toBe(1_450_000 - 25_000)
    /* memulihkan daftar yang sudah pulih = tidak ada yang berubah */
    expect(restoreRows(ids)).toBe(0)
  })

  it('baris MOCK dan baris SESI sama-sama hilang → hitungan transaksi nyata = 0', () => {
    const row = postExpense({ walletId: 'bca', amount: 25_000, note: 'Kopi' }) as MoneyRow
    const ids = [...HISTORY_TRANSACTIONS.map((tx) => tx.id), row.seq]
    const removed = removeRows(ids)

    const snapshot = getMoneySnapshot()
    expect(removed).toBe(ids.length)
    expect(HISTORY_TRANSACTIONS.filter((tx) => !isRowRemoved(snapshot, tx.id))).toHaveLength(0)
    expect(recordedTransactions(snapshot)).toHaveLength(0)
    /* baris mock yang sudah dihapus tidak bisa dihidupkan lagi oleh edit */
    expect(editRow(1, { amount: 99_000 })).toBeNull()
  })
})

/* ── Test KONTEKS TANPA DOMPET = TOLAK, JANGAN MENEMPEL (paket 59 · 59.4) ─────
   Bug yang ditutup (temuan audit #1): catatan yang dibuat sambil switcher di
   posisi "Bersama" — konteks yang belum punya dompet — menempel ke dompet
   'Tunai' milik konteks Keluarga, sehingga saldo Tunai berkurang tanpa user
   memilihnya. Sekarang `wallet` kosong ditolak di pintu tulis (satu baris pun
   tidak lahir), sementara nama dompet yang belum ada di ledger tetap dicatat apa
   adanya TANPA menggerakkan saldo siapa pun (jalur "belum terhubung"). */

describe('konteks tanpa dompet tidak memotong dompet lain (59.4)', () => {
  const draft = {
    name: 'Kopi',
    amount: 25_000,
    type: 'expense' as const,
    category: 'Makanan',
    dateISO: '2026-09-27',
  }

  it('dompet kosong DITOLAK: nol baris, nol tombstone, nol perubahan saldo', () => {
    const before = getMoneySnapshot()
    expect(defaultWalletNameFor('bersama')).toBe('')
    expect(postTransaction({ ...draft, wallet: '' })).toBeNull()
    expect(postTransaction({ ...draft, wallet: '   ' })).toBeNull()

    const after = getMoneySnapshot()
    expect(after.rows).toHaveLength(0)
    expect(after.removedIds).toHaveLength(0)
    expect(cashTotal(after)).toBe(cashTotal(before))
  })

  it('saldo Tunai tetap utuh setelah percobaan mencatat tanpa dompet', () => {
    /* inilah angka yang dulu bocor: satu catatan Rp 25.000 dari konteks
       "Bersama" memotong Tunai (Rp 50.000 → Rp 25.000) tanpa user melihatnya */
    postTransaction({ ...draft, wallet: '' })
    expect(walletBalance(getMoneySnapshot(), 'tunai')).toBe(50_000)
  })

  it('dompet yang belum ada di ledger tetap DICATAT apa adanya, saldo tidak bergerak', () => {
    const row = postTransaction({ ...draft, wallet: 'OVO' })
    expect(row).not.toBeNull()

    const snapshot = getMoneySnapshot()
    expect(recordedTransactions(snapshot)[0]).toMatchObject({ wallet: 'OVO', amount: 25_000 })
    expect(walletBalance(snapshot, 'bca')).toBe(1_450_000)
    expect(walletBalance(snapshot, 'gopay')).toBe(350_000)
    expect(walletBalance(snapshot, 'tunai')).toBe(50_000)
  })

  it('dompet yang benar-benar dipilih user bergerak — dan HANYA dompet itu', () => {
    const chosen = addWalletAccount({ name: 'Kas Bersama', type: 'Cash', opening: 100_000 })
    expect(postTransaction({ ...draft, wallet: chosen.name })).not.toBeNull()

    const snapshot = getMoneySnapshot()
    expect(walletBalance(snapshot, chosen.id)).toBe(100_000 - 25_000)
    expect(walletBalance(snapshot, 'tunai')).toBe(50_000)
    expect(walletBalance(snapshot, 'bca')).toBe(1_450_000)
  })
})

