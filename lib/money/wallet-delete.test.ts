import { beforeEach, describe, expect, it } from 'vitest'
import {
  balancesOf,
  cashTotal,
  getMoneySnapshot,
  homeWallets,
  isAccountEmpty,
  isWalletRemoved,
  liveWalletSeeds,
  mergeMoneySnapshot,
  mergeWithRemote,
  postBalanceAdjustment,
  postExpense,
  postIncome,
  postTransfer,
  purgeMoneyStore,
  recordedTransactions,
  removeWalletAccount,
  removedWalletSeeds,
  resetMoneyStore,
  restoreWalletAccount,
  transferLogOf,
  walletAccountOf,
  walletBalance,
  walletIdOfName,
  walletNameOfId,
  walletOptionsFor,
  walletRecordCount,
  type MoneySnapshot,
} from './store'
import { assertLedgerInvariant } from './ledger'
import { setAnalyticsSink, type MoneyEventName, type MoneyEventPayload } from '@/lib/analytics'
import { WALLET_SEED } from '@/lib/wallets'

/* ── Test HAPUS DOMPET (paket 62 · temuan audit #2) ──────────────────────────
   Sampai paket 61 `DELETE /api/wallets/:id` sudah ADA di server tapi tidak punya
   satu pun pemanggil: user bisa menambah dompet, mengoreksi saldonya, memindahkan
   dananya — tapi tidak bisa membuangnya. Yang diuji di sini bukan "ada tombolnya",
   melainkan janji-janji yang gampang rusak:

     1. hapus dompet TIDAK boleh merusak invariant ledger (`Σ baris = Σ saldo −
        Σ opening`) — penjaganya menolak tulisan yang membuang dompet tanpa
        menangani barisnya, jadi bentuk "hapus"-nya tombstone;
     2. saldo dompet LAIN tidak boleh bergerak sedikit pun;
     3. uang yang sudah keluar TIDAK kembali dan catatannya tetap ada di Riwayat
        (kanon §4.5: yang dihapus dompetnya, bukan pengeluarannya);
     4. rujukan lama (log pindah dana) tidak boleh jadi yatim;
     5. tidak ada tulisan baru yang boleh mendarat di dompet yang sudah dihapus;
     6. tombstone bertahan setelah refresh/hidrasi, dan Undo benar-benar
        mengembalikan (bukan cuma menjanjikan). */

/** invariant lengkap dari snapshot hidup — bentuk yang sama dengan `assertSnapshot` */
function assertStillBalanced(snapshot: MoneySnapshot) {
  assertLedgerInvariant(snapshot.rows, {
    openings: Object.fromEntries(snapshot.wallets.map((wallet) => [wallet.id, wallet.opening])),
    balances: balancesOf(snapshot),
  })
}

beforeEach(() => {
  resetMoneyStore()
  setAnalyticsSink(null)
})

describe('hapus dompet = tombstone, invariant tetap seimbang', () => {
  it('dompet tanpa riwayat: hilang dari daftar/picker, Total Saldo turun sebesar saldonya', () => {
    const before = getMoneySnapshot()
    expect(cashTotal(before)).toBe(1_850_000)

    const removal = removeWalletAccount('tunai')

    expect(removal).not.toBeNull()
    expect(removal).toMatchObject({
      walletId: 'tunai',
      name: 'Tunai',
      balance: 50_000,
      rowCount: 0,
    })

    const after = getMoneySnapshot()
    /* (a) tampilannya benar-benar hilang… */
    expect(liveWalletSeeds(after).map((wallet) => wallet.id)).toEqual(['bca', 'gopay'])
    expect(homeWallets(after, 'all').map((wallet) => wallet.id)).toEqual(['bca', 'gopay'])
    expect(walletOptionsFor(after).map((option) => option.id)).toEqual(['bca', 'gopay'])
    expect(walletAccountOf(after, 'tunai')).toBeNull()
    expect(walletNameOfId(after, 'tunai')).toBe('')
    expect(walletIdOfName(after, 'Tunai')).toBe('')
    /* (b) …tapi datanya TIDAK dibuang: saldo dompet lain, ledger, & invariant utuh */
    expect(cashTotal(after)).toBe(1_800_000)
    expect(walletBalance(after, 'bca')).toBe(1_450_000)
    expect(walletBalance(after, 'gopay')).toBe(350_000)
    /* `walletBalance` dompet yang dihapus tetap bisa dibaca — dipakai laporan &
       file ekspor, dan itu yang membuat selisih total bisa dipertanggungjawabkan */
    expect(walletBalance(after, 'tunai')).toBe(50_000)
    expect(removedWalletSeeds(after).map((wallet) => wallet.id)).toEqual(['tunai'])
    expect(isWalletRemoved(after, 'tunai')).toBe(true)
    assertStillBalanced(after)
  })

  it('Undo mengembalikan dompet persis ke daftar & Total Saldo semula', () => {
    const removal = removeWalletAccount('tunai')!
    expect(cashTotal(getMoneySnapshot())).toBe(1_800_000)

    expect(restoreWalletAccount(removal)).toBe(true)

    const restored = getMoneySnapshot()
    expect(cashTotal(restored)).toBe(1_850_000)
    expect(liveWalletSeeds(restored).map((wallet) => wallet.id)).toEqual(['bca', 'gopay', 'tunai'])
    expect(walletAccountOf(restored, 'tunai')?.balance).toBe(50_000)
    assertStillBalanced(restored)
  })

  it('Undo yang tidak sah gagal dengan jujur (bukan diam-diam "berhasil")', () => {
    const removal = removeWalletAccount('tunai')!
    expect(restoreWalletAccount(removal)).toBe(true)
    /* dompetnya sudah hidup lagi → Undo kedua tidak boleh mengubah apa pun */
    expect(restoreWalletAccount(removal)).toBe(false)
    /* hapus dua kali juga ditolak */
    removeWalletAccount('tunai')
    expect(removeWalletAccount('tunai')).toBeNull()
    /* id yang tidak dikenal & id kosong ditolak tanpa menulis */
    expect(removeWalletAccount('dompet-hantu')).toBeNull()
    expect(removeWalletAccount('   ')).toBeNull()
  })

  it('dompet BERISI catatan: saldo dompet lain tidak bergerak & catatannya tetap di Riwayat', () => {
    postExpense({ walletId: 'tunai', amount: 20_000, note: 'Parkir' })
    expect(walletRecordCount(getMoneySnapshot(), 'tunai')).toBe(1)

    const removal = removeWalletAccount('tunai')!

    const after = getMoneySnapshot()
    expect(removal.rowCount).toBe(1)
    expect(removal.balance).toBe(30_000)
    /* saldo dompet lain TIDAK berubah (uang yang keluar dari Tunai bukan urusan BCA) */
    expect(walletBalance(after, 'bca')).toBe(1_450_000)
    expect(walletBalance(after, 'gopay')).toBe(350_000)
    /* Total Saldo turun sebesar saldo Tunai SAAT dihapus (Rp 30.000), bukan Rp 50.000:
       pengeluaran Rp 20.000 yang sudah tercatat tetap terhitung sebagai sudah keluar */
    expect(cashTotal(after)).toBe(1_800_000)
    /* catatannya TIDAK ikut hilang — kanon §4.5: yang dihapus dompetnya, bukan uangnya */
    const rows = recordedTransactions(after)
    expect(rows).toHaveLength(1)
    expect(rows[0]).toMatchObject({ name: 'Parkir', wallet: 'Tunai', amount: 20_000 })
    assertStillBalanced(after)

    /* Undo juga mengembalikan status "ada catatannya" */
    expect(restoreWalletAccount(removal)).toBe(true)
    expect(walletRecordCount(getMoneySnapshot(), 'tunai')).toBe(1)
  })
})

describe('rujukan dompet yang dihapus tidak jadi yatim', () => {
  it('log pindah dana tetap menyebut nama dompet lawan yang sudah dihapus', () => {
    postTransfer({ fromWalletId: 'bca', toWalletId: 'gopay', amount: 250_000, note: '' })
    const bcaAfterTransfer = walletBalance(getMoneySnapshot(), 'bca')
    expect(bcaAfterTransfer).toBe(1_450_000 - 250_000)

    removeWalletAccount('gopay')

    const after = getMoneySnapshot()
    /* dompet sumber tidak ikut kehilangan uangnya karena dompet tujuan dihapus */
    expect(walletBalance(after, 'bca')).toBe(bcaAfterTransfer)
    const log = transferLogOf(after)
    expect(log).toHaveLength(1)
    expect(log[0].fromName).toBe('BCA')
    /* inilah rujukan yang akan kosong ("Pindah ke ") kalau lookup-nya salah */
    expect(log[0].toName).toBe('GoPay')
    assertStillBalanced(after)
  })
})

describe('pagar tulis: tidak ada uang baru di dompet yang sudah dihapus', () => {
  it('catat pengeluaran/pemasukan/koreksi/pindah dana ke dompet terhapus DITOLAK', () => {
    removeWalletAccount('gopay')
    const rowsBefore = getMoneySnapshot().rows.length

    expect(postExpense({ walletId: 'gopay', amount: 10_000, note: 'Kopi' })).toBeNull()
    expect(postIncome({ walletId: 'gopay', amount: 10_000, note: 'Bonus' })).toBeNull()
    expect(postBalanceAdjustment({ walletId: 'gopay', newBalance: 500_000 })).toBeNull()
    expect(
      postTransfer({ fromWalletId: 'bca', toWalletId: 'gopay', amount: 10_000, note: '' }),
    ).toBeNull()
    expect(
      postTransfer({ fromWalletId: 'gopay', toWalletId: 'bca', amount: 10_000, note: '' }),
    ).toBeNull()

    const after = getMoneySnapshot()
    expect(after.rows).toHaveLength(rowsBefore)
    expect(walletBalance(after, 'gopay')).toBe(350_000)
    expect(cashTotal(after)).toBe(1_500_000)
    assertStillBalanced(after)
  })
})

describe('tombstone bertahan setelah refresh & hidrasi dari server', () => {
  it('mergeMoneySnapshot (refresh) tidak menghidupkan dompet yang sudah dihapus', () => {
    postExpense({ walletId: 'tunai', amount: 5_000, note: 'Air' })
    removeWalletAccount('tunai')
    const live = getMoneySnapshot()
    const persisted = {
      wallets: [...live.wallets],
      rows: [...live.rows],
      removedIds: [...live.removedIds],
      removedWalletIds: [...live.removedWalletIds],
      syncedIds: [],
    }

    /* memory sesi kosong = keadaan setelah refresh */
    const merged = mergeMoneySnapshot(persisted, {
      wallets: WALLET_SEED,
      rows: [],
      removedIds: [],
      removedWalletIds: [],
      rowOverrides: {},
      syncedIds: [],
      hydrated: false,
    })

    expect(isWalletRemoved(merged, 'tunai')).toBe(true)
    expect(liveWalletSeeds(merged).map((wallet) => wallet.id)).toEqual(['bca', 'gopay'])
    expect(walletBalance(merged, 'tunai')).toBe(45_000)
  })

  it('hidrasi dari SERVER tetap menghormati tombstone perangkat ini', () => {
    const current = { ...getMoneySnapshot(), removedWalletIds: ['gopay'] }
    const merged = mergeWithRemote({ wallets: [...WALLET_SEED], rows: [] }, null, current)

    expect(merged.removedWalletIds).toEqual(['gopay'])
    expect(isWalletRemoved(merged, 'gopay')).toBe(true)
  })

  it('hapus akun membersihkan tombstone dompet juga', () => {
    removeWalletAccount('tunai')
    const purged = purgeMoneyStore()

    expect(purged.removedWalletIds).toEqual([])
    expect(purged.wallets).toHaveLength(0)
  })
})

describe('isAccountEmpty menghitung yang TAMPIL, bukan yang tersimpan (temuan audit #3)', () => {
  it('semua dompet dihapus & tidak ada catatan → akun dianggap kosong', () => {
    expect(isAccountEmpty(getMoneySnapshot())).toBe(false)

    WALLET_SEED.forEach((wallet) => removeWalletAccount(wallet.id))

    const after = getMoneySnapshot()
    /* tombstone TIDAK membuang barisnya dari state… */
    expect(after.wallets).toHaveLength(WALLET_SEED.length)
    /* …tapi yang dilihat user memang kosong, jadi notice kosong-akun harus muncul */
    expect(isAccountEmpty(after)).toBe(true)
  })

  it('masih ada catatan yang tampil → belum dianggap kosong', () => {
    postExpense({ walletId: 'bca', amount: 5_000, note: 'Air' })
    WALLET_SEED.forEach((wallet) => removeWalletAccount(wallet.id))

    /* catatannya tetap tampil di Riwayat (keputusan paket 62), jadi akunnya belum kosong */
    expect(isAccountEmpty(getMoneySnapshot())).toBe(false)
  })
})

describe('jejak analitik hapus dompet', () => {
  it('menembak `wallet_deleted` tanpa nama dompet & tanpa nominal', () => {
    postExpense({ walletId: 'tunai', amount: 5_000, note: 'Air' })
    /* sink dipasang SETELAH pencatatan: yang diperiksa di sini hanya event hapus
       dompet, bukan `transaction_created` dari pencatatannya */
    const seen: { name: MoneyEventName; payload: MoneyEventPayload }[] = []
    setAnalyticsSink((name, payload) => seen.push({ name, payload }))

    removeWalletAccount('tunai')

    expect(seen).toHaveLength(1)
    expect(seen[0].name).toBe('wallet_deleted')
    /* hanya konteks & ada-tidaknya catatan — nama dompet & nominalnya tidak ikut */
    expect(seen[0].payload).toEqual({ scope: 'keluarga', had_rows: true })
  })
})

