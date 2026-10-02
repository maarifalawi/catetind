import { beforeEach, describe, expect, it } from 'vitest'
import { APP_STORAGE_PREFIX, deleteAccount, purgeDeviceData, purgeStorageKeys, type StorageLike } from './account'
import { DELETE_ACCOUNT_KEYWORD, matchesDeleteKeyword } from './data/account'
import { getMoneySnapshot, isAccountEmpty, mergeMoneySnapshot, postExpense, removeWalletAccount, resetMoneyStore, type PersistedMoney } from './money/store'
import { loadMoneyState } from './money/idb'
import { getWealthSnapshot, mergeWealthState, resetWealthStore } from './money/wealth-store'
import { getBillsSnapshot, liveBills, mergeBillsState, resetBillsStore } from './money/bills-store'
import {
  addJointTransaction,
  getJointSnapshot,
  jointNotes,
  jointPartnerJoined,
  mergeJointState,
  resetJointStore,
} from './money/joint-store'
import { INITIAL_JOINT_TRANSACTIONS, JOINT_ME } from './data/joint'
import { INITIAL_BILLS } from './data/bills'
import { INITIAL_DEBTS, INITIAL_DEBT_PAYMENTS, INITIAL_INVESTMENTS } from './data/wealth'
import { resetAiUsageStore } from './ai-usage-store'
import { WALLET_SEED } from './wallets'

/* ── Test alur HAPUS AKUN (paket 43 · audit Stage 6 #2) ───────────────────────
   Aturan yang dijaga di sini: setelah alur hapus akun, TIDAK ada penanda lokal
   yang tertinggal, dan store uang benar-benar kosong — termasuk setelah state
   itu dibaca ulang (`mergeMoneySnapshot`), karena di situlah dulu data bisa
   "lahir lagi". */

/** penyimpanan palsu: cukup untuk membuktikan penyaring awalan bekerja */
function fakeStorage(entries: Record<string, string>): StorageLike & { has(key: string): boolean } {
  const map = new Map(Object.entries(entries))
  return {
    get length() {
      return map.size
    },
    key: (index) => [...map.keys()][index] ?? null,
    removeItem: (key) => {
      map.delete(key)
    },
    has: (key) => map.has(key),
  }
}

beforeEach(() => {
  resetMoneyStore()
  resetWealthStore()
  resetBillsStore()
  resetJointStore()
  resetAiUsageStore()
})

describe('matchesDeleteKeyword', () => {
  it('menerima kata kunci resmi walau kapital & spasinya berbeda', () => {
    expect(matchesDeleteKeyword(DELETE_ACCOUNT_KEYWORD)).toBe(true)
    expect(matchesDeleteKeyword('  hapus   akun ')).toBe(true)
  })

  it('menolak apa pun yang bukan kata kuncinya (termasuk email lama)', () => {
    expect(matchesDeleteKeyword('')).toBe(false)
    expect(matchesDeleteKeyword('hapus')).toBe(false)
    expect(matchesDeleteKeyword('jon@snow.com')).toBe(false)
  })
})

describe('purgeStorageKeys', () => {
  it('menghapus SEMUA penanda app (awalan `catet`) dan menyisakan milik orang lain', () => {
    const storage = fakeStorage({
      'catet-onboarding': '{"x":1}',
      'catet-ind-app-lock': '{"hash":"…"}',
      'catetind-money-pending': '1',
      'other-app-token': 'keep-me',
    })

    const removed = purgeStorageKeys(storage)

    expect(removed.sort()).toEqual(
      ['catet-onboarding', 'catet-ind-app-lock', 'catetind-money-pending'].sort(),
    )
    expect(storage.has('other-app-token')).toBe(true)
    expect(storage.length).toBe(1)
  })

  it('idempoten: pembersihan kedua tidak menemukan apa pun dan tidak melempar', () => {
    const storage = fakeStorage({ 'catet-theme': 'light' })
    expect(purgeStorageKeys(storage)).toEqual(['catet-theme'])
    expect(purgeStorageKeys(storage)).toEqual([])
  })

  it('memakai satu awalan kanon supaya daftar kunci tidak perlu dirawat manual', () => {
    expect(APP_STORAGE_PREFIX).toBe('catet')
  })
})

describe('purgeDeviceData', () => {
  it('mengosongkan store uang & melaporkan jumlah baris yang ikut hilang', async () => {
    postExpense({ walletId: 'bca', amount: 50_000, note: 'Kopi' })
    expect(getMoneySnapshot().rows).toHaveLength(1)

    const report = await purgeDeviceData()

    expect(report.walletsCleared).toBe(WALLET_SEED.length)
    expect(report.ledgerRowsCleared).toBe(1)
    expect(getMoneySnapshot().wallets).toHaveLength(0)
    expect(getMoneySnapshot().rows).toHaveLength(0)
    /* kekayaan ikut dilaporkan & ikut hilang (paket 50) */
    expect(report.debtsCleared).toBe(INITIAL_DEBTS.length)
    expect(report.investmentsCleared).toBe(INITIAL_INVESTMENTS.length)
    expect(report.debtPaymentsCleared).toBe(INITIAL_DEBT_PAYMENTS.length)
    expect(getWealthSnapshot().debts).toHaveLength(0)
    expect(getWealthSnapshot().investments).toHaveLength(0)
    expect(getWealthSnapshot().payments).toHaveLength(0)
    /* tagihan rutin ikut dilaporkan & ikut hilang (paket 51) */
    expect(report.billsCleared).toBe(INITIAL_BILLS.length)
    expect(liveBills(getBillsSnapshot())).toHaveLength(0)
    /* kantong bersama ikut dilaporkan & ikut hilang (paket 52) */
    expect(report.jointRowsCleared).toBe(INITIAL_JOINT_TRANSACTIONS.length)
    expect(getJointSnapshot().transactions).toHaveLength(0)
    expect(getJointSnapshot().members).toHaveLength(0)
    /* tanpa `window` (lingkungan test) tidak ada penyimpanan untuk dibersihkan —
       dan itu dikatakan apa adanya, bukan diklaim berhasil */
    expect(report.localStorageKeys).toEqual([])
    expect(report.sessionStorageKeys).toEqual([])
    expect(report.indexedDbCleared).toBe(false)
  })

  it('REGRESI PRIVASI: dompet contoh tidak pernah muncul kembali setelah dihapus', () => {
    /* state yang ditulis alur hapus: penanda `purged` + daftar kosong */
    const afterPurge = mergeMoneySnapshot({
      wallets: [],
      rows: [],
      removedIds: [],
      removedWalletIds: [],
      syncedIds: [],
      purged: true,
    })

    expect(afterPurge.wallets).toHaveLength(0)
    expect(afterPurge.rows).toHaveLength(0)
    expect(afterPurge.removedWalletIds).toHaveLength(0)
  })

  it('Hapus Akun juga membuang tombstone DOMPET yang dihapus user (paket 62)', async () => {
    /* user menghapus satu dompet lebih dulu — tombstone-nya hidup di state & IndexedDB */
    const removal = removeWalletAccount('tunai')
    expect(removal).not.toBeNull()
    expect(getMoneySnapshot().removedWalletIds).toEqual(['tunai'])

    const report = await purgeDeviceData()

    /* dompet terhapus bukan "data yang harus dipertahankan": setelah akunnya
       dihapus, tidak boleh ada satu pun jejak dompet di perangkat ini */
    expect(getMoneySnapshot().removedWalletIds).toEqual([])
    expect(getMoneySnapshot().wallets).toHaveLength(0)
    /* dompet yang di-tombstone tetap ikut terhitung sebagai dompet yang dibersihkan
       (ia memang ada di state perangkat sampai Hapus Akun dijalankan) */
    expect(report.walletsCleared).toBe(WALLET_SEED.length)
  })

  it('state setelah Hapus Akun dianggap KOSONG oleh `isAccountEmpty` (paket 62)', async () => {
    postExpense({ walletId: 'bca', amount: 5_000, note: 'Air' })

    await purgeDeviceData()

    /* temuan audit #3: syarat lama (`wallets == 0 && rows == 0`) tidak lagi cocok
       sejak tombstone tidak membuang barisnya dari state */
    expect(isAccountEmpty(getMoneySnapshot())).toBe(true)
  })

  it('REGRESI PRIVASI (paket 50): hutang & aset contoh tidak hidup lagi setelah Hapus Akun', () => {
    const afterPurge = mergeWealthState({
      version: 1,
      debts: [],
      investments: [],
      payments: [],
      purged: true,
    })

    expect(afterPurge.debts).toHaveLength(0)
    expect(afterPurge.investments).toHaveLength(0)
    expect(afterPurge.payments).toHaveLength(0)
  })

  it('REGRESI PRIVASI (paket 51): tagihan contoh tidak hidup lagi setelah Hapus Akun', () => {
    const afterPurge = mergeBillsState({ version: 1, bills: [], removedIds: [], purged: true })

    expect(afterPurge.bills).toHaveLength(0)
    expect(liveBills(afterPurge)).toHaveLength(0)
  })

  it('REGRESI PRIVASI (paket 52): kantong bersama & anggotanya hilang setelah Hapus Akun', () => {
    /* state yang ditulis alur hapus: kosong + penanda `purged` */
    const afterPurge = mergeJointState({
      version: 1,
      transactions: [],
      settlements: {},
      members: [],
      purged: true,
    })

    expect(afterPurge.transactions).toHaveLength(0)
    expect(afterPurge.members).toHaveLength(0)
    expect(jointPartnerJoined(afterPurge)).toBe(false)
    expect(jointNotes(afterPurge)).toHaveLength(0)
  })

  it('catatan kantong bersama yang ditulis user ikut dilaporkan saat dihapus', async () => {
    addJointTransaction({ description: 'Kopi bareng', amount: 30_000, paidByUserId: JOINT_ME.id })

    const report = await purgeDeviceData()

    expect(report.jointRowsCleared).toBe(INITIAL_JOINT_TRANSACTIONS.length + 1)
    expect(jointNotes(getJointSnapshot())).toHaveLength(0)
  })

  it('tanpa penanda `purged`, kunjungan pertama tetap memakai dompet kanon (perilaku lama tidak berubah)', () => {
    const firstVisit = mergeMoneySnapshot(null)
    expect(firstVisit.wallets.length).toBeGreaterThan(0)
  })

  it('BUKTI ISI PENYIMPANAN setelah hapus: kosong + satu penanda `purged`', async () => {
    postExpense({ walletId: 'bca', amount: 50_000, note: 'Kopi' })
    postExpense({ walletId: 'gopay', amount: 20_000, note: 'Parkir' })

    await purgeDeviceData()

    /* `loadMoneyState()` mengembalikan state terakhir yang ditulis ke penyimpanan
       (di browser: record IndexedDB). Di lingkungan test, jalur itu memakai
       jaring memory — jalur yang SAMA yang dipakai app saat IndexedDB diblokir. */
    const persisted = await loadMoneyState<PersistedMoney>()

    expect(persisted).toEqual({
      wallets: [],
      rows: [],
      removedIds: [],
      /* tombstone dompet juga kosong (paket 62): hapus akun berarti tidak ada satu
         pun jejak dompet di perangkat ini — termasuk dompet yang dihapus user */
      removedWalletIds: [],
      /* hasil edit baris mock ikut kosong (paket 48) — hapus akun berarti tidak
         ada satu pun jejak data di perangkat ini */
      rowOverrides: {},
      syncedIds: [],
      purged: true,
    })
  })
})

describe('deleteAccount', () => {
  it('menjalankan pembersihan lalu melaporkan status akhir sesi apa adanya', async () => {
    const { report, sessionEnded } = await deleteAccount()

    expect(report.ledgerRowsCleared).toBe(0)
    expect(getMoneySnapshot().wallets).toHaveLength(0)
    /* di luar browser tidak ada endpoint /api/session → `false` adalah jawaban
       yang jujur (dan UI memakai nilai itu untuk memberi tahu user) */
    expect(sessionEnded).toBe(false)
  })
})
