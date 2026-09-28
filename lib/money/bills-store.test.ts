import { beforeEach, describe, expect, it } from 'vitest'
import { BILL_PAYMENT_CATEGORY, BILL_UNPAID_REVERSAL_NOTE, INITIAL_BILLS, type Bill } from '@/lib/data/bills'
import { buildHelpExportPayload } from '@/lib/data/help'
import { BILLS_STATE_KEY, loadDeviceState } from './idb'
import { buildMoneyExport, collectExportSources, moneyExportJson } from './export'
import {
  addBill,
  billById,
  billsForContext,
  deleteBill,
  editBill,
  getBillsSnapshot,
  liveBills,
  markBillPaid,
  mergeBillsState,
  purgeBillsStore,
  resetBillsStore,
  restoreBill,
  subscribeBillsStore,
  unmarkBillPaid,
  unpaidBills,
  useBillsStore,
  type PersistedBills,
} from './bills-store'
import { cashTotal, getMoneySnapshot, recordedTransactions, resetMoneyStore, walletBalance } from './store'

/* ── Test SATU STORE TAGIHAN (paket 51 · temuan E laporan 46) ────────────────
   Dua janji yang dikunci di sini, karena dua-duanya pernah gagal:

     1. daftar tagihan BERTAHAN & LINTAS PEMBACA — tagihan yang ditambah/diubah/
        dihapus terlihat oleh selector halaman, file ekspor (`/settings/data` &
        `/help`), dan tidak kembali ke data contoh setelah akun dihapus;
     2. "LUNAS" MENGGERAKKAN UANG — `markBillPaid()` menulis baris kas (kategori
        `Tagihan`) DAN menandai statusnya dalam satu pemanggilan; kalau store
        menolak (dompet asing / saldo kurang), TIDAK ada satu pun bagian yang
        ditulis. `unmarkBillPaid()` membalikkan barisnya juga, bukan cuma
        stempelnya.

   Tidak ada komponen yang diuji: halaman hanya menyusun tampilan dari selector
   yang sama, jadi janji "satu sumber" cukup dikunci di lapis data. */

/** tagihan contoh untuk kasus uji — angka demo seed tidak pernah diubah */
function newBill(over: Partial<Omit<Bill, 'id'>> = {}): Omit<Bill, 'id'> {
  return {
    emoji: '🧾',
    name: 'Langganan Baru',
    amount: 120_000,
    dueDate: 12,
    isRecurring: true,
    category: BILL_PAYMENT_CATEGORY,
    walletId: 'bca',
    isPaidThisMonth: false,
    reminderDaysBefore: 1,
    scope: 'pribadi',
    ...over,
  }
}

beforeEach(() => {
  resetMoneyStore()
  resetBillsStore()
})

describe('pintu tulis tagihan (satu sumber untuk semua pembaca)', () => {
  it('addBill menambah tagihan yang langsung terbaca selector halaman', () => {
    const before = liveBills(getBillsSnapshot()).length
    const created = addBill(newBill({ name: 'Gym Bulanan', amount: 250_000, scope: 'keluarga' }))

    const snapshot = getBillsSnapshot()
    expect(liveBills(snapshot)).toHaveLength(before + 1)
    /* empat pembaca berbeda membaca baris yang SAMA */
    expect(billById(snapshot, created.id)?.name).toBe('Gym Bulanan') // kartu & sheet edit
    expect(unpaidBills(snapshot).map((bill) => bill.id)).toContain(created.id) // list Aktif
    expect(billsForContext(snapshot, 'keluarga').map((bill) => bill.id)).toContain(created.id)
    expect(billsForContext(snapshot, 'pribadi').map((bill) => bill.id)).not.toContain(created.id)
    /* tagihan baru selalu mulai dari "belum dibayar bulan ini" */
    expect(created.isPaidThisMonth).toBe(false)
    expect(created.paidRowId).toBeUndefined()
  })

  it('editBill mengoreksi field yang salah tanpa menyentuh status lunas / jejak uangnya', () => {
    const paid = markBillPaid('5', 'BCA')!
    expect(paid.bill.isPaidThisMonth).toBe(true)

    const updated = editBill('5', { name: 'Kredivo (cicilan HP)', amount: 360_000 })

    expect(updated?.name).toBe('Kredivo (cicilan HP)')
    expect(updated?.amount).toBe(360_000)
    /* status & id baris kasnya tidak boleh ikut berubah karena edit nominal */
    expect(updated?.isPaidThisMonth).toBe(true)
    expect(updated?.paidRowId).toBe(paid.row.id)
    expect(billById(getBillsSnapshot(), '5')?.name).toBe('Kredivo (cicilan HP)')
    /* nominal baris kas yang SUDAH tertulis tidak ikut berubah — uangnya sudah keluar */
    expect(recordedTransactions(getMoneySnapshot())[0].amount).toBe(350_000)

    /* dipaksa dari luar (data lama / bug pemanggil): jejak uangnya tetap tidak
       boleh ikut ditambal — kalau boleh, satu form bisa mencabut stempel LUNAS
       tanpa membalikkan baris kasnya */
    const forced = editBill('5', {
      isPaidThisMonth: false,
      paidRowId: undefined,
    } as unknown as Partial<Bill>)
    expect(forced?.isPaidThisMonth).toBe(true)
    expect(forced?.paidRowId).toBe(paid.row.id)
  })

  it('edit/hapus tagihan yang tidak ada ditolak tanpa menulis apa pun', () => {
    expect(editBill('tidak-ada', { name: 'X' })).toBeNull()
    expect(deleteBill('tidak-ada')).toBeNull()
    expect(restoreBill('tidak-ada')).toBeNull()
    expect(editBill('5', { name: 'Langganan Baru' })?.name).toBe('Langganan Baru')

    deleteBill('5')
    /* yang sedang dihapus tidak bisa diedit, dan hapus kedua ditolak */
    expect(editBill('5', { name: 'X' })).toBeNull()
    expect(deleteBill('5')).toBeNull()
  })
})

describe('hapus = tombstone + Undo mengembalikan statusnya', () => {
  it('restoreBill mengembalikan tagihan BESERTA status "lunas bulan ini"-nya', () => {
    const paid = markBillPaid('5', 'BCA')!

    expect(deleteBill('5')?.name).toBe('Kredivo')
    expect(billById(getBillsSnapshot(), '5')).toBeNull()
    expect(liveBills(getBillsSnapshot()).some((bill) => bill.id === '5')).toBe(false)

    const restored = restoreBill('5')

    expect(restored?.isPaidThisMonth).toBe(true)
    expect(restored?.paidRowId).toBe(paid.row.id)
    expect(billById(getBillsSnapshot(), '5')?.isPaidThisMonth).toBe(true)
  })

  it('hapus tagihan TIDAK menghapus baris kas pembayarannya', () => {
    markBillPaid('5', 'BCA')
    deleteBill('5')

    /* uangnya memang sudah keluar — jejaknya tetap ada di Riwayat */
    expect(recordedTransactions(getMoneySnapshot())).toHaveLength(1)
    expect(walletBalance(getMoneySnapshot(), 'bca')).toBe(1_100_000)
  })
})

describe('"Lunas" yang benar-benar menggerakkan uang', () => {
  it('markBillPaid menulis SATU baris expense kategori Tagihan & menurunkan saldo dompet', () => {
    const cashBefore = cashTotal(getMoneySnapshot())

    const result = markBillPaid('5', 'BCA')!

    /* (a) barisnya nyata: kategori Tagihan, catatan = nama tagihan, dompet BCA */
    const rows = recordedTransactions(getMoneySnapshot())
    expect(rows).toHaveLength(1)
    expect(rows[0]).toMatchObject({
      name: 'Kredivo',
      category: BILL_PAYMENT_CATEGORY,
      /* row ledger menyimpan `walletName`, bentuk riwayat memakai `wallet` */
      wallet: 'BCA',
      amount: 350_000,
    })
    expect(result.row.walletName).toBe('BCA')
    /* (b) saldo dompet turun & itu dibaca dari ledger, bukan diklaim */
    expect(walletBalance(getMoneySnapshot(), 'bca')).toBe(1_450_000 - 350_000)
    expect(result.walletBalanceAfter).toBe(1_100_000)
    expect(cashTotal(getMoneySnapshot())).toBe(cashBefore - 350_000)
    /* (c) statusnya berubah DI PEMANGGILAN YANG SAMA, dengan jejak barisnya */
    expect(result.bill.isPaidThisMonth).toBe(true)
    expect(result.bill.paidRowId).toBe(result.row.id)
    expect(billById(getBillsSnapshot(), '5')?.isPaidThisMonth).toBe(true)
  })

  it('nominal boleh dikoreksi (tagihan fleksibel) & yang tercatat nominal itu', () => {
    const result = markBillPaid('4', 'BCA', 500_000)!

    expect(result.amount).toBe(500_000)
    expect(recordedTransactions(getMoneySnapshot())[0].amount).toBe(500_000)
    expect(walletBalance(getMoneySnapshot(), 'bca')).toBe(1_450_000 - 500_000)
  })

  it('double-tap tidak membayar dua kali', () => {
    expect(markBillPaid('5', 'BCA')).not.toBeNull()
    /* submit ulang / tap kedua: ditolak, TANPA baris kedua */
    expect(markBillPaid('5', 'BCA')).toBeNull()

    expect(getMoneySnapshot().rows).toHaveLength(1)
    expect(walletBalance(getMoneySnapshot(), 'bca')).toBe(1_100_000)
  })

  it('ditolak (dompet asing / saldo kurang / nominal 0 / tagihan tidak ada) → TIDAK ada yang ditulis', () => {
    const billsBefore = liveBills(getBillsSnapshot())
    const rowsBefore = getMoneySnapshot().rows.length

    /* 'OVO' ada di daftar pilihan tagihan tapi TIDAK ada di ledger → tidak ada
       dompet yang bisa didebit, jadi permintaannya ditolak */
    expect(markBillPaid('5', 'OVO', 350_000)).toBeNull()
    /* Tunai hanya berisi Rp 50.000 — uang tidak boleh keluar lebih dari isinya */
    expect(markBillPaid('5', 'Tunai', 350_000)).toBeNull()
    expect(markBillPaid('5', 'BCA', 0)).toBeNull()
    expect(markBillPaid('tidak-ada', 'BCA', 100_000)).toBeNull()
    /* tagihan seed '1' (Kos) sudah lunas bulan ini → tidak boleh dibayar lagi */
    expect(markBillPaid('1', 'BCA', 1_500_000)).toBeNull()

    expect(liveBills(getBillsSnapshot())).toEqual(billsBefore)
    expect(getMoneySnapshot().rows).toHaveLength(rowsBefore)
    expect(walletBalance(getMoneySnapshot(), 'bca')).toBe(1_450_000)
    expect(walletBalance(getMoneySnapshot(), 'tunai')).toBe(50_000)
  })

  it('unmarkBillPaid mencabut barisnya (tombstone) & mengembalikan uangnya', () => {
    const result = markBillPaid('5', 'BCA')!

    const undone = unmarkBillPaid('5')!

    /* (1) baris pembayarannya dicabut dari SEMUA pembaca kas (Riwayat, Home,
       /wallet): tombstone-nya dipasang, barisnya tetap tersimpan sebagai jejak */
    expect(undone.row?.id).toBe(result.row.id)
    expect(undone.bill.isPaidThisMonth).toBe(false)
    expect(undone.bill.paidRowId).toBeUndefined()
    expect(getMoneySnapshot().removedIds).toContain(result.row.id)
    expect(recordedTransactions(getMoneySnapshot()).some((row) => row.name === 'Kredivo')).toBe(false)

    /* (2) saldonya BENAR-BENAR pulih. `removeRow()` saja tidak mengembalikan uang
       (kanon store uang: "yang dihapus barisnya, bukan uangnya"), jadi
       pengembaliannya ditulis sebagai baris koreksi berlabel agar Riwayat bisa
       menjelaskan kenapa saldonya naik kembali. */
    expect(undone.reversal?.note).toBe(BILL_UNPAID_REVERSAL_NOTE('Kredivo'))
    expect(undone.reversal?.category).toBe(BILL_PAYMENT_CATEGORY)
    expect(walletBalance(getMoneySnapshot(), 'bca')).toBe(1_450_000)
    expect(recordedTransactions(getMoneySnapshot()).map((row) => row.name)).toEqual([
      'Batal bayar Kredivo',
    ])

    /* membatalkan dua kali ditolak — uangnya tidak pernah kembali dua kali */
    expect(unmarkBillPaid('5')).toBeNull()
    expect(walletBalance(getMoneySnapshot(), 'bca')).toBe(1_450_000)
  })

  it('tagihan seed yang "Lunas" tanpa baris kas hanya kehilangan stempelnya', () => {
    const undone = unmarkBillPaid('1')!

    expect(undone.row).toBeNull()
    expect(undone.reversal).toBeNull()
    expect(undone.bill.isPaidThisMonth).toBe(false)
    expect(getMoneySnapshot().rows).toHaveLength(0)
  })
})

describe('bertahan setelah refresh (IndexedDB key `bills`)', () => {
  it('tambah/edit/hapus/lunas ditulis ke perangkat & dibaca kembali oleh mergeBillsState', async () => {
    const created = addBill(newBill({ name: 'Langganan Baru' }))
    editBill(created.id, newBill({ name: 'Langganan Baru (naik)', amount: 150_000 }))
    deleteBill('2')
    markBillPaid('5', 'BCA')

    const persisted = await loadDeviceState<PersistedBills>(BILLS_STATE_KEY)

    expect(BILLS_STATE_KEY).toBe('bills')
    expect(persisted?.version).toBe(1)
    expect(persisted?.purged).toBe(false)
    expect(persisted?.bills?.find((bill) => bill.id === created.id)?.name).toBe('Langganan Baru (naik)')
    expect(persisted?.bills?.find((bill) => bill.id === '5')?.isPaidThisMonth).toBe(true)
    expect(persisted?.removedIds).toEqual(['2'])

    /* SIMULASI REFRESH: state yang tersimpan jadi dasar, perubahan user tetap ada */
    const afterRefresh = mergeBillsState(persisted)
    expect(afterRefresh.hydrated).toBe(true)
    expect(afterRefresh.removedIds).toEqual(['2'])
    expect(billById(afterRefresh, created.id)?.amount).toBe(150_000)
    expect(billById(afterRefresh, '2')).toBeNull()
    expect(billById(afterRefresh, '5')?.isPaidThisMonth).toBe(true)
  })

  it('kunjungan pertama memakai daftar seed kanon & tidak menghidupkan contoh setelah Hapus Akun', () => {
    const first = mergeBillsState(null)
    expect(first.hydrated).toBe(true)
    expect(first.bills).toHaveLength(INITIAL_BILLS.length)

    /* state yang ditulis alur hapus akun: daftar kosong + penanda `purged` */
    const afterPurge = mergeBillsState({ version: 1, bills: [], removedIds: [], purged: true })
    expect(afterPurge.bills).toEqual([])
    expect(afterPurge.removedIds).toEqual([])
  })

  it('state tersimpan jadi DASAR — data contoh tidak muncul lagi di sampingnya', () => {
    const merged = mergeBillsState({
      version: 1,
      bills: [{ ...INITIAL_BILLS[0], id: 'kos-lama', name: 'Kos Lama' }],
      removedIds: ['3'],
    })

    expect(merged.bills.map((bill) => bill.id)).toEqual(['kos-lama'])
    expect(liveBills(merged).map((bill) => bill.id)).toEqual(['kos-lama'])
  })

  it('tagihan yang lahir SEBELUM hidrasi tetap ikut & id-nya tidak menabrak id tersimpan', () => {
    const created = addBill(newBill({ name: 'Lahir Sebelum Hidrasi' }))
    /* ruang id tinggi (≥ 1.000.000): mustahil menabrak id kecil milik data user */
    expect(Number(created.id)).toBeGreaterThanOrEqual(1_000_000)

    const merged = mergeBillsState({
      version: 1,
      bills: [{ ...INITIAL_BILLS[0], id: '7', name: 'Tagihan Tersimpan' }],
      removedIds: [],
    })

    expect(merged.bills.map((bill) => bill.name).sort()).toEqual([
      'Lahir Sebelum Hidrasi',
      'Tagihan Tersimpan',
    ])
    expect(new Set(merged.bills.map((bill) => bill.id)).size).toBe(merged.bills.length)
  })

  it('purgeBillsStore mengosongkan store & menandai `purged` di perangkat', async () => {
    addBill(newBill())
    expect(purgeBillsStore().bills).toEqual([])
    expect(liveBills(getBillsSnapshot())).toEqual([])

    const persisted = await loadDeviceState<PersistedBills>(BILLS_STATE_KEY)
    expect(persisted?.purged).toBe(true)
    expect(persisted?.bills).toEqual([])
  })
})

describe('ekspor & kontrak store untuk komponen', () => {
  it('file ekspor /settings/data memuat tagihan dari store, bukan konstanta', () => {
    const created = addBill(newBill({ name: 'Gym Bulanan', amount: 250_000 }))
    markBillPaid('5', 'BCA')
    deleteBill('2')

    const file = moneyExportJson(null, '2026-09-27T10:15:00.000Z').file

    /* bentuk file berubah karena ada bagian baru → versi skemanya naik (v2) */
    expect(file.schemaVersion).toBe(2)
    expect(file.counts.bills).toBe(liveBills(getBillsSnapshot()).length)
    expect(file.bills.some((bill) => bill.id === created.id)).toBe(true)
    expect(file.bills.find((bill) => bill.id === '5')?.isPaidThisMonth).toBe(true)
    /* tagihan yang sudah dihapus user tidak ikut (daftarnya sama dengan halaman) */
    expect(file.bills.some((bill) => bill.id === '2')).toBe(false)
    expect(file.counts.ledgerRows).toBe(1)
    expect(file.limits.join(' ')).toMatch(/store tagihan/i)
  })

  it('payload Pusat Bantuan memakai daftar yang dioper (default-nya tetap seed = murni)', () => {
    const created = addBill(newBill({ name: 'Gym Bulanan' }))
    const now = new Date('2026-09-27T10:15:00Z')

    const withStore = buildHelpExportPayload(now, liveBills(getBillsSnapshot()))
    const withSeed = buildHelpExportPayload(now)

    expect(withStore.data.bills.some((bill) => bill.id === created.id)).toBe(true)
    expect(withSeed.data.bills).toHaveLength(INITIAL_BILLS.length)
  })

  it('subscribe memberi notifikasi setiap tulisan, dan berhenti setelah unsubscribe', () => {
    let calls = 0
    const unsubscribe = subscribeBillsStore(() => {
      calls += 1
    })
    addBill(newBill({ name: 'Langganan' }))
    expect(calls).toBeGreaterThan(0)
    const seen = calls
    unsubscribe()
    addBill(newBill({ name: 'Setelah Lepas Langganan' }))
    expect(calls).toBe(seen)
  })

  it('hook store & snapshot biasa adalah sumber yang sama (tanpa hydration mismatch)', () => {
    /* `useBillsStore` butuh React; yang dijaga di sini adalah janji bentuknya:
       snapshot server = daftar seed (tanpa IDB), snapshot biasa = state hidup. */
    expect(typeof useBillsStore).toBe('function')
    expect(getBillsSnapshot().bills).toHaveLength(INITIAL_BILLS.length)
  })
})
