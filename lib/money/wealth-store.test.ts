import { beforeEach, describe, expect, it } from 'vitest'
import {
  INITIAL_ASSET_TRANSACTIONS,
  INITIAL_DEBTS,
  INITIAL_DEBT_PAYMENTS,
  INITIAL_INVESTMENTS,
  activeDebtRemaining,
  activeReceivableTotal,
  assetHistory,
  netWorthParts,
  totalPortfolioValue,
} from '@/lib/data/wealth'
import { cashTotal, getMoneySnapshot, recordedTransactions, resetMoneyStore, walletBalance } from './store'
import { WEALTH_STATE_KEY, loadDeviceState } from './idb'
import { buildMoneyExport, collectExportSources } from './export'
import {
  addDebt,
  addInvestment,
  debtById,
  deleteDebt,
  deleteInvestment,
  editDebt,
  editInvestment,
  getWealthSnapshot,
  investmentById,
  liveDebts,
  liveInvestments,
  liveAssetTransactions,
  mergeWealthState,
  paymentsOf,
  purgeWealthStore,
  resetWealthStore,
  restoreDebt,
  restoreInvestment,
  settleDebt,
  subscribeWealthStore,
  updateInvestmentPrice,
  useWealthStore,
  type PersistedWealth,
} from './wealth-store'

/* ── Test SATU STORE KEKAYAAN (paket 50 · temuan D laporan 46) ───────────────
   Temuan uji pemakaian yang dijaga di sini: hutang/piutang & portofolio di
   `/wealth` hidup di state halaman, sehingga (a) hilang setelah refresh dan
   (b) tidak pernah ikut file ekspor. Test di bawah mengunci janji store-nya:

     1. setiap tulisan (hutang, aset, pelunasan) TERLIHAT oleh pembaca lain:
        Net Worth (`netWorthParts`), riwayat pembayaran, ledger kas, dan
        `collectExportSources()`;
     2. `settleDebt` menggerakkan kas lewat jalur SATU ledger (paket 41) dan
        Net Worth tidak berubah hanya karena melunasi;
     3. `purgeWealthStore` (Hapus Akun) mengosongkan store & tidak menghidupkan
        kembali data contoh setelah state dibaca ulang;
     4. hidrasi IndexedDB menjadikan state tersimpan sebagai DASAR, sementara
        catatan yang lahir sebelum hidrasi tidak hilang maupun terduplikasi.

   Tidak ada komponen yang diuji: halaman hanya menyusun tampilan dari selector
   yang sama, jadi janji "satu sumber" cukup dikunci di lapis data. */

const CANON_CASH = 1_850_000

/** Net Worth yang dihitung dari KEDUA store (uang + kekayaan) — rumusnya tetap
 *  milik `netWorthParts()`, jadi test ini tidak mendefinisikan ulang apa pun.
 *
 *  Paket 61: daftarnya dibaca lewat `liveDebts()`/`liveInvestments()` — persis
 *  yang dipakai halaman & file ekspor — supaya Net Worth di sini tidak pernah
 *  menghitung catatan yang sudah dihapus user. */
function netWorthOfStores(): number {
  const wealth = getWealthSnapshot()
  return netWorthParts({
    cash: cashTotal(getMoneySnapshot()),
    investments: totalPortfolioValue(liveInvestments(wealth)),
    receivables: activeReceivableTotal(liveDebts(wealth)),
    debts: activeDebtRemaining(liveDebts(wealth)),
  }).netWorth
}

beforeEach(() => {
  resetMoneyStore()
  resetWealthStore()
})

describe('pintu tulis & selector kekayaan', () => {
  it('addDebt menambah catatan yang langsung terbaca pembaca lain & menurunkan Net Worth', () => {
    const before = netWorthOfStores()
    const created = addDebt({
      type: 'personal',
      direction: 'owed_by_me',
      counterparty: 'Dita',
      principal: 1_000_000,
      scope: 'pribadi',
    })

    expect(created).not.toBeNull()
    /* selector membaca catatan yang SAMA (halaman detail/URL pakai ini) */
    expect(debtById(getWealthSnapshot(), created!.id)?.counterparty).toBe('Dita')
    expect(activeDebtRemaining(getWealthSnapshot().debts)).toBe(
      activeDebtRemaining(INITIAL_DEBTS) + 1_000_000,
    )
    expect(before - netWorthOfStores()).toBe(1_000_000)
  })

  it('addInvestment menambah aset: total portofolio & Net Worth ikut naik', () => {
    const before = totalPortfolioValue(getWealthSnapshot().investments)
    const netWorthBefore = netWorthOfStores()

    const asset = addInvestment({
      type: 'stock',
      name: 'Bank Mandiri',
      quantity: 10,
      price: 500_000,
      fees: 1_000,
      scope: 'keluarga',
    })

    expect(asset).not.toBeNull()
    /* modal = jumlah × harga + biaya; nilai pasar mulai dari harga transaksi */
    expect(asset).toMatchObject({ totalInvested: 5_001_000, currentValue: 5_000_000, scope: 'keluarga' })
    expect(investmentById(getWealthSnapshot(), asset!.id)?.name).toBe('Bank Mandiri')
    expect(totalPortfolioValue(getWealthSnapshot().investments)).toBe(before + 5_000_000)
    expect(netWorthOfStores()).toBe(netWorthBefore + 5_000_000)
  })

  it('updateInvestmentPrice mengubah nilai aset & mencabut penanda harga basi', () => {
    const target = getWealthSnapshot().investments.find((item) => item.symbol === 'BTC')!
    const before = totalPortfolioValue(getWealthSnapshot().investments)

    const updated = updateInvestmentPrice(target.id, 1_000_000_000)

    expect(updated?.currentPrice).toBe(1_000_000_000)
    expect(updated?.currentValue).toBe(target.quantity * 1_000_000_000)
    expect(updated?.isStale).toBe(false)
    const delta = target.quantity * 1_000_000_000 - target.currentValue
    expect(totalPortfolioValue(getWealthSnapshot().investments)).toBe(before + delta)
  })

  it('editDebt & editInvestment hanya menyentuh catatan yang diminta', () => {
    const debt = editDebt('1', { remaining: 1_000_000 })
    expect(debt).toMatchObject({ id: '1', remaining: 1_000_000, status: 'active' })
    /* status diturunkan dari sisa: sisa 0 = lunas */
    expect(editDebt('3', { remaining: 0 })?.status).toBe('settled')

    const asset = editInvestment('2', {
      type: 'stock',
      name: 'Bank BCA',
      symbol: 'bbca',
      quantity: 10,
      avgBuyPrice: 9_000,
    })
    expect(asset).toMatchObject({ symbol: 'BBCA', quantity: 10, totalInvested: 90_000 })
    /* harga PASAR tidak disentuh koreksi posisi */
    expect(asset?.currentPrice).toBe(INITIAL_INVESTMENTS[1].currentPrice)
  })

  it('hapus benar-benar hapus: catatan & riwayat pembayarannya ikut hilang', () => {
    const paymentsBefore = paymentsOf(getWealthSnapshot(), '2').length
    expect(paymentsBefore).toBeGreaterThan(0)

    expect(deleteDebt('2')).toBe(true)
    expect(debtById(getWealthSnapshot(), '2')).toBeNull()
    expect(paymentsOf(getWealthSnapshot(), '2')).toHaveLength(0)
    expect(deleteDebt('tidak-ada')).toBe(false)

    expect(deleteInvestment('1')).toBe(true)
    expect(investmentById(getWealthSnapshot(), '1')).toBeNull()
    expect(deleteInvestment('1')).toBe(false)
  })

  it('input tidak sah tidak menulis apa pun', () => {
    const before = getWealthSnapshot()
    expect(addDebt({ type: 'personal', principal: 0, scope: 'pribadi' })).toBeNull()
    expect(addInvestment({ type: 'stock', name: '  ', quantity: 1, price: 1_000, scope: 'pribadi' })).toBeNull()
    expect(addInvestment({ type: 'stock', name: 'X', quantity: 0, price: 1_000, scope: 'pribadi' })).toBeNull()
    expect(updateInvestmentPrice('tidak-ada', 1_000)).toBeNull()
    expect(updateInvestmentPrice('1', 0)).toBeNull()
    expect(editDebt('tidak-ada', { remaining: 1 })).toBeNull()
    expect(editInvestment('1', {
      type: 'stock',
      name: '',
      symbol: 'X',
      quantity: 1,
      avgBuyPrice: 1,
    })).toBeNull()

    expect(getWealthSnapshot()).toBe(before)
  })

  it('useWealthStore & getWealthSnapshot adalah sumber yang sama (tanpa hydration mismatch)', () => {
    expect(typeof useWealthStore).toBe('function')
    expect(getWealthSnapshot().debts.length).toBe(INITIAL_DEBTS.length)
    expect(getWealthSnapshot().investments.length).toBe(INITIAL_INVESTMENTS.length)
    expect(getWealthSnapshot().payments.length).toBe(INITIAL_DEBT_PAYMENTS.length)
  })

  it('pelanggan diberi tahu setiap tulisan & berhenti setelah dilepas', () => {
    let calls = 0
    const unsubscribe = subscribeWealthStore(() => {
      calls += 1
    })
    addDebt({ type: 'personal', direction: 'owed_by_me', counterparty: 'Teman', principal: 50_000, scope: 'pribadi' })
    expect(calls).toBeGreaterThan(0)
    const seen = calls
    unsubscribe()
    addDebt({ type: 'personal', direction: 'owed_by_me', counterparty: 'Teman 2', principal: 60_000, scope: 'pribadi' })
    expect(calls).toBe(seen)
  })
})

/* ── PELUNASAN: SATU TULISAN, DUA AKIBAT (kas + catatan) ──────────────────── */

describe('settleDebt = kas bergerak + catatan hutang berubah', () => {
  it('Rp 500.000 dari BCA: saldo turun, baris muncul di Riwayat, sisa hutang turun', () => {
    const netWorthBefore = netWorthOfStores()
    const paymentsBefore = getWealthSnapshot().payments.length

    const result = settleDebt({ debtId: '1', walletId: 'bca', paidAmount: 500_000, dateISO: '2026-09-27' })

    expect(result).not.toBeNull()
    expect(result?.debt.remaining).toBe(2_000_000)
    /* progres tenor hutang platform ikut naik (produksi: kolom `current_month`) */
    expect(result?.debt.currentMonth).toBe(3)

    /* (a) KAS: dibaca dari ledger yang sama dengan halaman Dompet & Home */
    const snapshot = getMoneySnapshot()
    expect(walletBalance(snapshot, 'bca')).toBe(1_450_000 - 500_000)
    expect(walletBalance(snapshot, 'gopay')).toBe(350_000)
    expect(cashTotal(snapshot)).toBe(CANON_CASH - 500_000)

    /* (b) RIWAYAT: baris kasnya benar-benar ada, dengan nama & kategori kanon */
    const [first] = recordedTransactions(snapshot)
    expect(first).toMatchObject({
      name: 'Bayar Kredivo',
      amount: 500_000,
      wallet: 'BCA',
      category: 'Tagihan',
      date: '2026-09-27',
    })

    /* (c) CATATAN: satu baris pembayaran baru, sisa keseluruhan turun */
    expect(getWealthSnapshot().payments).toHaveLength(paymentsBefore + 1)
    expect(result?.payment).toMatchObject({ debtId: '1', amount: 500_000, walletId: 'bca', kind: 'debt' })
    expect(activeDebtRemaining(getWealthSnapshot().debts)).toBe(activeDebtRemaining(INITIAL_DEBTS) - 500_000)

    /* (d) ATURAN LAPORAN 41: melunasi tidak mengubah Net Worth */
    expect(netWorthOfStores()).toBe(netWorthBefore)
  })

  it('menerima piutang = kas MASUK & piutang berkurang', () => {
    const netWorthBefore = netWorthOfStores()

    const result = settleDebt({ debtId: '4', walletId: 'bca', paidAmount: 150_000, dateISO: '2026-09-27' })

    expect(result?.payment.kind).toBe('receivable')
    expect(result?.debt.status).toBe('settled')
    expect(cashTotal(getMoneySnapshot())).toBe(CANON_CASH + 150_000)
    expect(recordedTransactions(getMoneySnapshot())[0]).toMatchObject({ name: 'Terima dari Rina' })
    expect(activeReceivableTotal(getWealthSnapshot().debts)).toBe(0)
    /* uang berpindah bentuk (piutang → kas), totalnya tidak bertambah */
    expect(netWorthOfStores()).toBe(netWorthBefore)
  })

  it('lebih bayar: kembalian jadi catatan baru & Net Worth tetap tidak melompat', () => {
    const netWorthBefore = netWorthOfStores()

    /* hutang Andi tinggal Rp 200.000, tapi user menyerahkan Rp 250.000 */
    const result = settleDebt({ debtId: '3', walletId: 'gopay', paidAmount: 250_000, dateISO: '2026-09-27' })

    expect(result?.settlement.plan.changeAmount).toBe(50_000)
    /* Selisih itu dipegang lawan → jadi PIUTANG kita, konteksnya mewarisi hutangnya */
    expect(result?.changeDebt).toMatchObject({
      direction: 'owed_to_me',
      counterparty: 'Andi',
      remaining: 50_000,
      scope: 'bersama',
    })
    expect(debtById(getWealthSnapshot(), result!.changeDebt!.id)).not.toBeNull()
    expect(netWorthOfStores()).toBe(netWorthBefore)
  })

  it('ditolak (saldo kurang / dompet asing) → TIDAK ada yang ditulis', () => {
    const debtsBefore = getWealthSnapshot().debts
    const rowsBefore = getMoneySnapshot().rows.length

    expect(settleDebt({ debtId: '1', walletId: 'tunai', paidAmount: 500_000 })).toBeNull()
    expect(
      settleDebt({ debtId: '1', walletId: 'ovo' /* dompet yang tidak ada di ledger */, paidAmount: 100_000 }),
    ).toBeNull()
    expect(settleDebt({ debtId: 'tidak-ada', walletId: 'bca', paidAmount: 100_000 })).toBeNull()
    expect(settleDebt({ debtId: '1', walletId: 'bca', paidAmount: 0 })).toBeNull()

    expect(getWealthSnapshot().debts).toBe(debtsBefore)
    expect(getMoneySnapshot().rows).toHaveLength(rowsBefore)
    expect(walletBalance(getMoneySnapshot(), 'tunai')).toBe(50_000)
  })

  it('aksi yang sama dua kali tidak menyelesaikan hutang dua kali (kunci idempotensi)', () => {
    const request = { debtId: '1', walletId: 'bca', paidAmount: 500_000, dateISO: '2026-09-27' }

    expect(settleDebt(request)).not.toBeNull()
    /* double-tap / submit ulang: ditolak, TANPA tulisan kedua */
    expect(settleDebt(request)).toBeNull()

    expect(activeDebtRemaining(getWealthSnapshot().debts)).toBe(activeDebtRemaining(INITIAL_DEBTS) - 500_000)
    expect(walletBalance(getMoneySnapshot(), 'bca')).toBe(950_000)
    expect(getMoneySnapshot().rows).toHaveLength(1)
    expect(getWealthSnapshot().payments).toHaveLength(INITIAL_DEBT_PAYMENTS.length + 1)
  })

  it('pembayaran berikutnya (nominal berbeda) tetap bisa dicatat', () => {
    expect(settleDebt({ debtId: '1', walletId: 'bca', paidAmount: 500_000, dateISO: '2026-09-27' })).not.toBeNull()
    expect(settleDebt({ debtId: '1', walletId: 'bca', paidAmount: 300_000, dateISO: '2026-09-27' })).not.toBeNull()

    expect(activeDebtRemaining(getWealthSnapshot().debts)).toBe(activeDebtRemaining(INITIAL_DEBTS) - 800_000)
    expect(walletBalance(getMoneySnapshot(), 'bca')).toBe(1_450_000 - 800_000)
  })
})

/* ── EKSPOR: file yang benar-benar memuat catatan user ─────────────────────── */

describe('ekspor membaca store kekayaan', () => {
  const EXPORTED_AT = '2026-09-27T10:15:00.000Z'

  it('hutang & investasi yang baru dicatat ikut masuk file ekspor', () => {
    const countsBefore = buildMoneyExport(collectExportSources(), EXPORTED_AT).counts

    const debt = addDebt({
      type: 'personal',
      direction: 'owed_by_me',
      counterparty: 'Dita',
      principal: 1_000_000,
      scope: 'pribadi',
    })!
    const asset = addInvestment({
      type: 'gold',
      name: 'Emas Digital',
      quantity: 1,
      price: 1_200_000,
      scope: 'pribadi',
    })!

    const file = buildMoneyExport(collectExportSources(), EXPORTED_AT)

    expect(file.counts.debts).toBe(countsBefore.debts + 1)
    expect(file.counts.investments).toBe(countsBefore.investments + 1)
    expect(file.debts.payable.some((row) => row.id === debt.id)).toBe(true)
    expect(file.investments.some((row) => row.id === asset.id)).toBe(true)
    /* batas jujurnya juga menyebut bahwa kekayaan dibaca dari store perangkat */
    expect(file.limits.join(' ')).toMatch(/store kekayaan/i)
  })

  it('pelunasan yang ditulis di /wealth ikut ke ekspor (baris kas + riwayat bayar)', () => {
    const result = settleDebt({ debtId: '2', walletId: 'gopay', paidAmount: 250_000, dateISO: '2026-09-27' })!
    const file = buildMoneyExport(collectExportSources(), EXPORTED_AT)

    expect(file.ledgerRows.some((row) => row.id === result.settlement.rows[0].id)).toBe(true)
    expect(file.debtPayments.some((row) => row.id === result.payment.id)).toBe(true)
    expect(file.debts.payable.find((row) => row.id === '2')?.remaining).toBe(500_000)
  })
})

/* ── HIDRASI & HAPUS AKUN ─────────────────────────────────────────────────── */

describe('hidrasi IndexedDB & Hapus Akun', () => {
  it('kunjungan pertama memakai data seed kanon', () => {
    const first = mergeWealthState(null)

    expect(first.hydrated).toBe(true)
    expect(first.debts).toHaveLength(INITIAL_DEBTS.length)
    expect(first.investments).toHaveLength(INITIAL_INVESTMENTS.length)
    expect(first.payments).toHaveLength(INITIAL_DEBT_PAYMENTS.length)
  })

  it('state tersimpan jadi DASAR — data contoh tidak muncul lagi', () => {
    const stored = { ...INITIAL_DEBTS[0], id: 'dita-1', counterparty: 'Dita', remaining: 300_000 }

    const merged = mergeWealthState({ version: 1, debts: [stored], investments: [], payments: [] })

    expect(merged.debts.map((debt) => debt.id)).toEqual(['dita-1'])
    expect(merged.debts.some((debt) => debt.id === '1')).toBe(false)
  })

  it('catatan yang lahir SEBELUM hidrasi tetap ikut & tidak terduplikasi', () => {
    const created = addDebt({
      type: 'personal',
      direction: 'owed_by_me',
      counterparty: 'Dita',
      principal: 900_000,
      scope: 'pribadi',
    })!

    /* skenario: tulis → tersimpan → dibaca lagi saat hidrasi */
    const merged = mergeWealthState({ version: 1, debts: [created], investments: [], payments: [] })

    expect(merged.debts.filter((debt) => debt.id === created.id)).toHaveLength(1)
    /* ruang id sebelum hidrasi ≥ 1.000.000 → tidak bisa menabrak id data tersimpan */
    expect(Number(created.id.split('-')[1])).toBeGreaterThanOrEqual(1_000_000)
  })

  it('purgeWealthStore mengosongkan store & tidak menghidupkan data contoh setelah refresh', () => {
    expect(purgeWealthStore().debts).toEqual([])
    expect(getWealthSnapshot().investments).toEqual([])
    expect(getWealthSnapshot().payments).toEqual([])

    /* state yang ditulis alur hapus akun: daftar kosong + penanda `purged` */
    const afterRefresh = mergeWealthState({
      version: 1,
      debts: [],
      investments: [],
      payments: [],
      purged: true,
    })

    expect(afterRefresh.debts).toEqual([])
    expect(afterRefresh.investments).toEqual([])
    expect(afterRefresh.payments).toEqual([])
  })

  it('BUKTI BENTUK STATE perangkat: satu record JSON `wealth` berisi tiga daftar', async () => {
    const created = addDebt({
      type: 'personal',
      direction: 'owed_by_me',
      counterparty: 'Dita',
      principal: 1_000_000,
      scope: 'pribadi',
    })!
    const paid = settleDebt({ debtId: '1', walletId: 'bca', paidAmount: 500_000, dateISO: '2026-09-27' })!

    const persisted = await loadDeviceState<PersistedWealth>(WEALTH_STATE_KEY)

    expect(WEALTH_STATE_KEY).toBe('wealth')
    expect(persisted?.version).toBe(1)
    expect(persisted?.purged).toBe(false)
    expect(persisted?.investments).toHaveLength(INITIAL_INVESTMENTS.length)
    expect(persisted?.debts?.some((debt) => debt.id === created.id)).toBe(true)
    expect(persisted?.payments?.some((row) => row.id === paid.payment.id)).toBe(true)
  })
})

/* ── HAPUS = TOMBSTONE + UNDO, & EDIT YANG PUNYA PINTU (paket 61) ────────────
   Sebelum paket 61 `deleteDebt()`/`deleteInvestment()` membuang barisnya
   (`filter()`), jadi dua hal tidak mungkin: (a) Undo yang benar-benar
   mengembalikan catatan beserta riwayatnya, dan (b) hapus yang BERTAHAN saat
   SELURUH daftar kosong — karena `baseOf()` lalu memakai `INITIAL_DEBTS`
   sebagai dasar, sehingga hutang contoh yang sudah dihapus user bisa "lahir
   lagi" setelah refresh. Test di bawah mengunci janji barunya: yang dihapus
   DISEMBUNYIKAN (bukan dibuang), angka Net Worth-nya benar, dan uang yang sudah
   keluar TIDAK kembali. */

describe('hapus = tombstone + undo (paket 61)', () => {
  it('editDebt membetulkan pokok & sisa TANPA menyentuh kas maupun riwayatnya', () => {
    /* bayar dulu supaya ada riwayat pembayaran + kas yang benar-benar bergerak */
    const paid = settleDebt({
      debtId: '2',
      walletId: 'bca',
      paidAmount: 250_000,
      dateISO: '2026-09-27',
    })!
    const cashAfterPay = cashTotal(getMoneySnapshot())
    const paymentsAfterPay = paymentsOf(getWealthSnapshot(), '2').length
    expect(paymentsAfterPay).toBeGreaterThan(0)

    /* user salah mengetik pokoknya → dibetulkan dari pintu edit */
    const edited = editDebt('2', {
      principal: 1_800_000,
      remaining: 1_800_000 - paid.payment.amount,
    })

    expect(edited).toMatchObject({ id: '2', principal: 1_800_000, status: 'active' })
    expect(edited?.remaining).toBe(1_800_000 - 250_000)
    /* yang berubah cuma ANGKANYA: kas & riwayat pembayaran tidak ikut bergerak */
    expect(cashTotal(getMoneySnapshot())).toBe(cashAfterPay)
    expect(paymentsOf(getWealthSnapshot(), '2')).toHaveLength(paymentsAfterPay)
  })

  it('editDebt menurunkan status dari sisa & menolak nilai yang tidak sah', () => {
    expect(editDebt('3', { remaining: 0 })?.status).toBe('settled')
    expect(editDebt('3', { remaining: 120_000 })?.status).toBe('active')
    expect(editDebt('3', { remaining: -1 })).toBeNull()
    expect(editDebt('3', { principal: 0 })).toBeNull()
    expect(editDebt('tidak-ada', { remaining: 1_000 })).toBeNull()
  })

  it('deleteDebt menyembunyikan catatannya, TAPI baris kas & saldo dompet tetap', () => {
    const paid = settleDebt({
      debtId: '1',
      walletId: 'bca',
      paidAmount: 500_000,
      dateISO: '2026-09-27',
    })!
    const cashAfterPay = cashTotal(getMoneySnapshot())
    const netWorthAfterPay = netWorthOfStores()
    const remaining = paid.debt.remaining

    expect(deleteDebt('1')).toBe(true)

    /* daftar: hilang dari yang dibaca layar (dan file ekspor) */
    expect(liveDebts(getWealthSnapshot()).some((debt) => debt.id === '1')).toBe(false)
    expect(debtById(getWealthSnapshot(), '1')).toBeNull()
    /* uang: saldo dompet TIDAK kembali dan baris pelunasannya masih di Riwayat */
    expect(cashTotal(getMoneySnapshot())).toBe(cashAfterPay)
    expect(recordedTransactions(getMoneySnapshot())).toHaveLength(1)
    /* angka: hutang yang hilang membuat Net Worth NAIK sebesar sisanya */
    expect(netWorthOfStores()).toBe(netWorthAfterPay + remaining)
    /* riwayatnya tidak lagi tampil, tapi barisnya TETAP disimpan untuk Undo */
    expect(paymentsOf(getWealthSnapshot(), '1')).toHaveLength(0)
    expect(getWealthSnapshot().payments.some((row) => row.debtId === '1')).toBe(true)
  })

  it('restoreDebt mengembalikan catatan + riwayat + Net Worth seperti semula', () => {
    settleDebt({ debtId: '2', walletId: 'bca', paidAmount: 250_000, dateISO: '2026-09-27' })
    const paymentsBefore = paymentsOf(getWealthSnapshot(), '2').length
    const netWorthBefore = netWorthOfStores()

    expect(deleteDebt('2')).toBe(true)
    const restored = restoreDebt('2')

    expect(restored?.id).toBe('2')
    expect(debtById(getWealthSnapshot(), '2')).not.toBeNull()
    expect(paymentsOf(getWealthSnapshot(), '2')).toHaveLength(paymentsBefore)
    expect(netWorthOfStores()).toBe(netWorthBefore)
  })

  it('Undo yang tidak sah gagal dengan jujur — bukan diam-diam "berhasil"', () => {
    expect(restoreDebt('tidak-ada')).toBeNull()
    /* belum dihapus → tidak ada tombstone yang bisa dicabut */
    expect(restoreDebt('1')).toBeNull()
    expect(deleteDebt('1')).toBe(true)
    /* hapus dua kali: yang kedua TIDAK menulis apa pun */
    expect(deleteDebt('1')).toBe(false)
    expect(restoreDebt('1')).not.toBeNull()
    expect(restoreInvestment('1')).toBeNull()
  })

  it('tombstone bertahan setelah state dibaca ulang & hapus SEMUA hutang tidak menghidupkan seed', () => {
    for (const debt of getWealthSnapshot().debts) expect(deleteDebt(debt.id)).toBe(true)
    expect(liveDebts(getWealthSnapshot())).toHaveLength(0)

    const merged = mergeWealthState({
      version: 1,
      debts: [],
      investments: [],
      payments: [],
      removedIds: getWealthSnapshot().removedIds,
    })

    /* barisnya masih tersimpan (tombstone, bukan hapus fisik)… */
    expect(merged.debts.length).toBeGreaterThan(0)
    /* …tapi TIDAK ada yang kembali ke daftar yang dibaca user */
    expect(liveDebts(merged)).toHaveLength(0)
  })

  it('deleteInvestment + restoreInvestment: nilai portofolio & Net Worth kembali utuh', () => {
    const portfolioBefore = totalPortfolioValue(liveInvestments(getWealthSnapshot()))
    const netWorthBefore = netWorthOfStores()

    expect(deleteInvestment('2')).toBe(true)
    expect(liveInvestments(getWealthSnapshot()).some((asset) => asset.id === '2')).toBe(false)
    expect(netWorthOfStores()).toBe(netWorthBefore - INITIAL_INVESTMENTS[1].currentValue)

    /* aset yang sudah dihapus tidak bisa dibetulkan dari balik tombstone */
    expect(
      editInvestment('2', { type: 'stock', name: 'X', symbol: 'X', quantity: 1, avgBuyPrice: 1 }),
    ).toBeNull()
    expect(updateInvestmentPrice('2', 1_000_000)).toBeNull()

    expect(restoreInvestment('2')).not.toBeNull()
    expect(totalPortfolioValue(liveInvestments(getWealthSnapshot()))).toBe(portfolioBefore)
    expect(netWorthOfStores()).toBe(netWorthBefore)
  })

  it('catatan yang sudah dihapus tidak bisa dilunasi (tidak ada baris kas baru)', () => {
    const rowsBefore = getMoneySnapshot().rows.length
    expect(deleteDebt('4')).toBe(true)

    expect(
      settleDebt({ debtId: '4', walletId: 'bca', paidAmount: 150_000, dateISO: '2026-09-27' }),
    ).toBeNull()
    expect(getMoneySnapshot().rows).toHaveLength(rowsBefore)
    expect(cashTotal(getMoneySnapshot())).toBe(CANON_CASH)
  })
})

/* ── LEDGER RIWAYAT ASET — DATA NYATA, BUKAN SEED (paket 84) ──────────────────
   Halaman `/wealth` dulu mengisi "Riwayat beli/jual" dari konstanta MOCK
   `INITIAL_ASSET_TRANSACTIONS`. Sekarang ledger itu hidup di store: barisnya
   lahir dari transaksi yang benar-benar dicatat user, dan riwayat per aset
   diturunkan dari daftar yang sama (`assetHistory`). */
describe('ledger riwayat aset (bukan data seed)', () => {
  it('addInvestment mencatat baris ledger dengan arah & tanggal yang dipilih user', () => {
    const created = addInvestment({
      type: 'stock',
      name: 'Bukalapak',
      quantity: 100,
      price: 250,
      scope: 'pribadi',
      side: 'sell',
      dateISO: '2026-09-01',
    })
    expect(created).not.toBeNull()

    const ledger = liveAssetTransactions(getWealthSnapshot())
    const rows = assetHistory(ledger, created!.id)
    expect(rows).toHaveLength(1)
    expect(rows[0]).toMatchObject({ side: 'sell', date: '2026-09-01', quantity: 100, price: 250 })
  })

  it('riwayat ikut hilang saat aset dihapus (tombstone), dan balik saat di-Undo', () => {
    expect(deleteInvestment('2')).toBe(true)
    expect(liveAssetTransactions(getWealthSnapshot()).some((tx) => tx.assetId === '2')).toBe(false)

    expect(restoreInvestment('2')).not.toBeNull()
    expect(liveAssetTransactions(getWealthSnapshot()).some((tx) => tx.assetId === '2')).toBe(true)
  })

  it('mergeWealthState membawa ledger dari state tersimpan (sekali tercatat, tetap tercatat)', () => {
    const tx = { id: 'tx-99', assetId: '1', date: '2026-09-20', side: 'buy' as const, quantity: 1, price: 1_000 }
    const merged = mergeWealthState({
      version: 1,
      investments: [INITIAL_INVESTMENTS[0]],
      debts: [],
      payments: [],
      assetTransactions: [...INITIAL_ASSET_TRANSACTIONS, tx],
      removedIds: [],
    })
    expect(merged.assetTransactions.some((row) => row.id === 'tx-99')).toBe(true)
  })
})
