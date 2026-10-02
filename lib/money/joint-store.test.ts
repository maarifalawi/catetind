import { beforeEach, describe, expect, it } from 'vitest'
import {
  INITIAL_JOINT_TRANSACTIONS,
  JOINT_ME,
  JOINT_MONTH_KEY,
  JOINT_PARTNER,
  JOINT_TODAY_ISO,
  computeSettlement,
  pocketOf,
  splitSpecOf,
  type JointSettlementRecord,
  type JointTransaction,
} from '@/lib/data/joint'
import { JOINT_STATE_KEY, loadDeviceState } from './idb'
import { cashTotal, getMoneySnapshot, resetMoneyStore } from './store'
import {
  addJointMember,
  addJointTransaction,
  applyJointRow,
  applyRemoteJointRow,
  applyRemoteJointWallet,
  carryOverEntryFor,
  carryOverRecordFor,
  clearJointArrivalBadge,
  createJointPocket,
  deleteJointTransaction,
  getJointRemoteWalletId,
  getJointSnapshot,
  jointDeleteState,
  jointLedgerFeed,
  jointNotes,
  jointPartnerJoined,
  jointRowKey,
  mergeJointRows,
  mergeJointState,
  mergeLegacySettlements,
  purgeJointStore,
  recordSettlement,
  renameJointWallet,
  resetJointStore,
  restoreJointTransaction,
  setPaidBy,
  settlementRecordFor,
  updateSplit,
  useJointStore,
  type PersistedJoint,
} from './joint-store'

/* ── Test SATU STORE KANTONG BERSAMA (paket 52 · temuan F laporan 46) ────────
   Empat janji yang dikunci di sini, karena empat-empatnya pernah gagal:

     1. SATU SUMBER & BERTAHAN — catatan bersama, pembagian, nama kantong, dan
        penanda settle yang diubah user tetap ada setelah `mergeJointState()`
        (simulasi refresh);
     2. ANTI-DOBEL — baris (realtime/mock) yang sama datang dua kali tidak
        digandakan, dan baris settle turunan penanda bulan tidak muncul dua kali;
     3. SETTLE MENYELESAIKAN — `recordSettlement()` mengunci timbangan (net 0)
        tanpa membuat "Total Pengeluaran Bersama" membengkak, dan sisa yang belum
        tertutup benar-benar menyeberang ke bulan berikutnya;
     4. TIDAK MENYENTUH KAS PRIBADI — kantong bersama tidak mengubah `cashTotal()`.

   Tidak ada komponen yang diuji: halaman hanya menyusun tampilan dari selector
   yang sama, jadi janji "satu sumber" cukup dikunci di lapis data. */

/** state bersih sebelum tiap kasus — seed kanon, tanpa sisa kasus sebelumnya */
beforeEach(() => {
  resetMoneyStore()
  resetJointStore()
})

let rowSeq = 0

/** catatan bersama untuk kasus uji (angka seed tidak pernah diubah) */
function newRow(over: Partial<JointTransaction> = {}): JointTransaction {
  rowSeq += 1
  return {
    id: `uji-${rowSeq}`,
    userId: JOINT_ME.id,
    paidByUserId: JOINT_ME.id,
    description: 'Groceries bareng',
    amount: 300_000,
    category: 'Makanan',
    date: JOINT_TODAY_ISO,
    time: '19:30',
    split: { type: 'percentage', percents: { [JOINT_ME.id]: 60, [JOINT_PARTNER.id]: 40 } },
    ...over,
  }
}

/** penanda settle untuk kasus uji (bulan default = bulan berjalan mock) */
function newRecord(over: Partial<JointSettlementRecord> = {}): JointSettlementRecord {
  return {
    month: JOINT_MONTH_KEY,
    from: JOINT_PARTNER.id,
    to: JOINT_ME.id,
    amount: 150_000,
    method: 'BCA',
    carryOver: 0,
    ...over,
  }
}

/**
 * Pasangan dianggap SUDAH bergabung untuk kasus uji yang membutuhkannya.
 *
 * Di lingkungan test `NEXT_PUBLIC_DEMO` mati, jadi kantong mulai dengan SATU
 * anggota (`JOINT_MEMBER_SEED`) — persis perilaku produksi. Karena pembayar &
 * arah settle harus anggota kantong, kasus uji yang melibatkan partner mencatat
 * keanggotaannya lebih dulu, bukan mengakali validasinya.
 */
function withPartner(): void {
  addJointMember(JOINT_PARTNER.id)
}

describe('satu pintu tulis: catatan, pembagian, kantong, nama', () => {
  it('addJointTransaction menambah catatan yang ikut ke timbangan & net tetap nol', () => {
    const before = computeSettlement(jointLedgerFeed(getJointSnapshot(), JOINT_MONTH_KEY))
    const created = addJointTransaction({
      description: 'Makan bareng',
      amount: 300_000,
      paidByUserId: JOINT_ME.id,
      split: { type: 'percentage', percents: { [JOINT_ME.id]: 60, [JOINT_PARTNER.id]: 40 } },
    })

    expect(created?.amount).toBe(300_000)
    expect(created?.paidByUserId).toBe(JOINT_ME.id)
    expect(created?.date).toBe(JOINT_TODAY_ISO)
    expect(getJointSnapshot().transactions[0]?.id).toBe(created?.id)

    const after = computeSettlement(jointLedgerFeed(getJointSnapshot(), JOINT_MONTH_KEY))
    expect(after.totalSpent).toBe(before.totalSpent + 300_000)
    expect(after.myNet).toBeGreaterThan(before.myNet)
    /* uang tidak pernah hilang/muncul: Σ net selalu 0 */
    expect(Math.round(after.myNet + after.partnerNet)).toBe(0)
  })

  it('menolak input yang tidak masuk akal — dan tidak menulis apa pun', () => {
    const before = getJointSnapshot().transactions.length

    expect(addJointTransaction({ description: 'Nol', amount: 0, paidByUserId: JOINT_ME.id })).toBeNull()
    expect(
      addJointTransaction({ description: 'Negatif', amount: -50_000, paidByUserId: JOINT_ME.id }),
    ).toBeNull()
    /* kantong yang bukan anggota kantong ini tidak boleh jadi pembayar */
    expect(
      addJointTransaction({ description: 'Orang asing', amount: 10_000, paidByUserId: 'user_x' }),
    ).toBeNull()

    expect(getJointSnapshot().transactions).toHaveLength(before)
  })

  it('updateSplit menulis pembagian ke catatannya & mengosongkan field lama', () => {
    const legacyRow = newRow({
      id: 'lama-1',
      split: undefined,
      splitType: 'percentage',
      splits: { [JOINT_ME.id]: 50, [JOINT_PARTNER.id]: 50 },
    })
    /* catatan yang masih memakai bentuk LAMA (jalur migrasi data) */
    applyJointRow(legacyRow, { arrival: false })

    const updated = updateSplit('lama-1', {
      type: 'nominal',
      amounts: { [JOINT_ME.id]: 100_000, [JOINT_PARTNER.id]: 20_000 },
    })

    expect(splitSpecOf(updated!)).toEqual({
      type: 'nominal',
      amounts: { [JOINT_ME.id]: 100_000, [JOINT_PARTNER.id]: 20_000 },
    })
    expect(updated?.splitType).toBeUndefined()
    expect(updated?.splits).toBeUndefined()
    /* catatan yang tidak ada tidak bisa diubah */
    expect(updateSplit('tidak-ada', { type: 'equal' })).toBeNull()
  })

  it('setPaidBy memindahkan kantong yang menalangi (koreksi atribusi)', () => {
    withPartner()
    const created = addJointTransaction({
      description: 'Bensin',
      amount: 80_000,
      paidByUserId: JOINT_ME.id,
    })!

    const moved = setPaidBy(created.id, JOINT_PARTNER.id)
    expect(moved?.paidByUserId).toBe(JOINT_PARTNER.id)
    /* angka timbangan ikut berpindah — itu tujuan koreksinya */
    const settlement = computeSettlement(jointLedgerFeed(getJointSnapshot(), JOINT_MONTH_KEY))
    expect(settlement.partnerTotalSpent).toBeGreaterThan(0)

    expect(setPaidBy('tidak-ada', JOINT_PARTNER.id)).toBeNull()
    expect(setPaidBy(created.id, 'user_x')).toBeNull()
  })

  it('renameJointWallet menyimpan nama & menolak nama kosong', () => {
    expect(renameJointWallet('  Kantong Kita  ')?.name).toBe('Kantong Kita')
    expect(getJointSnapshot().wallet.name).toBe('Kantong Kita')
    expect(renameJointWallet('   ')).toBeNull()
    expect(getJointSnapshot().wallet.name).toBe('Kantong Kita')
  })

  it('addJointMember mencatat pasangan yang benar-benar bergabung', () => {
    const joined = addJointMember(JOINT_PARTNER.id)
    expect(joined.members).toContain(JOINT_PARTNER.id)
    expect(jointPartnerJoined(joined)).toBe(true)
  })
})

describe('bertahan setelah refresh (IndexedDB key `joint`)', () => {
  it('catatan, pembagian, nama kantong, & anggota ditulis ke perangkat & dibaca kembali', async () => {
    const created = addJointTransaction({
      description: 'Liburan',
      amount: 300_000,
      paidByUserId: JOINT_ME.id,
    })!
    updateSplit(created.id, {
      type: 'percentage',
      percents: { [JOINT_ME.id]: 60, [JOINT_PARTNER.id]: 40 },
    })
    renameJointWallet('Dompet Kita Banget')
    addJointMember(JOINT_PARTNER.id)

    const persisted = await loadDeviceState<PersistedJoint>(JOINT_STATE_KEY)

    expect(JOINT_STATE_KEY).toBe('joint')
    expect(persisted?.version).toBe(1)
    expect(persisted?.purged).toBe(false)
    expect(persisted?.wallet?.name).toBe('Dompet Kita Banget')
    expect(persisted?.members).toContain(JOINT_PARTNER.id)
    const storedRow = persisted?.transactions?.find((tx) => tx.id === created.id)
    expect(storedRow?.amount).toBe(300_000)
    expect(splitSpecOf(storedRow!)).toEqual({
      type: 'percentage',
      percents: { [JOINT_ME.id]: 60, [JOINT_PARTNER.id]: 40 },
    })

    /* SIMULASI REFRESH: state tersimpan jadi dasar & perubahan user tetap ada */
    const afterRefresh = mergeJointState(persisted)
    expect(afterRefresh.hydrated).toBe(true)
    expect(afterRefresh.wallet.name).toBe('Dompet Kita Banget')
    expect(afterRefresh.transactions.find((tx) => tx.id === created.id)?.amount).toBe(300_000)
    expect(jointPartnerJoined(afterRefresh)).toBe(true)
  })

  it('badge "Baru" (justArrived) TIDAK ikut tersimpan — pajangan, bukan data', async () => {
    applyJointRow(newRow({ id: 'rt-uji', justArrived: true }))

    const persisted = await loadDeviceState<PersistedJoint>(JOINT_STATE_KEY)
    const storedRow = persisted?.transactions?.find((tx) => tx.id === 'rt-uji')

    expect(storedRow).toBeDefined()
    expect(storedRow?.justArrived).toBeUndefined()
    expect(mergeJointState(persisted).transactions.find((tx) => tx.id === 'rt-uji')?.justArrived)
      .toBeUndefined()
  })

  it('kunjungan pertama memakai catatan seed kanon & TIDAK menghidupkannya setelah Hapus Akun', () => {
    const first = mergeJointState(null)
    expect(first.hydrated).toBe(true)
    expect(first.transactions).toHaveLength(INITIAL_JOINT_TRANSACTIONS.length)

    /* state yang ditulis alur hapus akun: kosong + penanda `purged` */
    const afterPurge = mergeJointState({
      version: 1,
      transactions: [],
      settlements: {},
      members: [],
      purged: true,
    })
    expect(afterPurge.transactions).toEqual([])
    expect(afterPurge.members).toEqual([])
    expect(jointPartnerJoined(afterPurge)).toBe(false)
    expect(jointNotes(afterPurge)).toEqual([])
  })

  it('state tersimpan jadi DASAR — data contoh tidak muncul di sampingnya', () => {
    const merged = mergeJointState({
      version: 1,
      transactions: [newRow({ id: 'simpan-1', description: 'WiFi rumah' })],
      members: [JOINT_ME.id],
      settlements: {},
    })

    expect(merged.transactions.map((tx) => tx.id)).toEqual(['simpan-1'])
    expect(merged.members).toEqual([JOINT_ME.id])
    expect(jointPartnerJoined(merged)).toBe(false)
  })
})

describe('migrasi penanda settle lama (localStorage → store)', () => {
  it('memindahkan bulan lama, store menang untuk bulan yang sama', () => {
    const stored = { [JOINT_MONTH_KEY]: newRecord({ amount: 90_000 }) }
    const legacy = {
      [JOINT_MONTH_KEY]: newRecord({ amount: 10_000 }),
      '2026-08': newRecord({ month: '2026-08', amount: 55_000 }),
    }

    const merged = mergeLegacySettlements(stored, legacy)

    expect(merged.migrated).toBe(1)
    expect(merged.settlements[JOINT_MONTH_KEY]?.amount).toBe(90_000)
    expect(merged.settlements['2026-08']?.amount).toBe(55_000)
  })

  it('tanpa penanda lama tidak ada yang berubah', () => {
    const stored = { [JOINT_MONTH_KEY]: newRecord() }
    const merged = mergeLegacySettlements(stored, {})
    expect(merged.migrated).toBe(0)
    expect(merged.settlements).toEqual(stored)
  })
})


describe('settle mengunci timbangan & sisa menyeberang bulan', () => {
  it('recordSettlement mengunci net jadi nol TANPA membengkakkan pengeluaran bersama', () => {
    withPartner()
    const before = computeSettlement(jointLedgerFeed(getJointSnapshot(), JOINT_MONTH_KEY))
    const stored = recordSettlement(
      newRecord({
        from: before.whoOwes.id,
        to: before.whoIsOwed.id,
        amount: before.settlementAmount,
      }),
    )

    expect(stored).not.toBeNull()
    expect(settlementRecordFor(getJointSnapshot(), JOINT_MONTH_KEY)).toEqual(stored)

    const feed = jointLedgerFeed(getJointSnapshot(), JOINT_MONTH_KEY)
    const selected = computeSettlement(feed, { settled: true })

    expect(selected.myNet).toBe(0)
    expect(selected.partnerNet).toBe(0)
    expect(selected.settled).toBe(true)
    expect(selected.level).toBe('equal')
    /* baris settle bukan pengeluaran: total & porsi tidak ikut naik */
    expect(selected.totalSpent).toBe(before.totalSpent)
    expect(selected.myPct).toBe(before.myPct)
    /* dan barisnya bisa ditelusuri di timeline */
    expect(feed.find((tx) => tx.id.startsWith('settle-'))?.isSettlement).toBe(true)
  })

  it('menolak record yang arahnya bukan anggota kantong ini', () => {
    expect(recordSettlement(newRecord({ from: 'user_x' }))).toBeNull()
    expect(recordSettlement(newRecord({ from: JOINT_ME.id, to: JOINT_ME.id }))).toBeNull()
    expect(recordSettlement(newRecord({ month: 'September' }))).toBeNull()
    expect(settlementRecordFor(getJointSnapshot(), JOINT_MONTH_KEY)).toBeNull()
  })

  it('sisa yang belum tertutup muncul sebagai PEMBUKA bulan berikutnya', () => {
    withPartner()
    const stored = recordSettlement(
      newRecord({ month: '2026-09', amount: 250_000, carryOver: 50_000 }),
    )!
    const snapshot = getJointSnapshot()

    const carry = carryOverEntryFor(snapshot, '2026-10')
    expect(carry?.isOpening).toBe(true)
    expect(carry?.amount).toBe(50_000)
    expect(carry?.date.startsWith('2026-10')).toBe(true)
    expect(pocketOf(carry!)).toBe(stored.to)

    expect(carryOverRecordFor(snapshot, '2026-10')).toEqual(stored)
    /* bulan tanpa sisa tidak memunculkan apa pun */
    expect(carryOverEntryFor(snapshot, '2026-11')).toBeNull()
    /* dan sisa itu benar-benar menyeberang: ia ikut dihitung di bulan baru */
    const october = computeSettlement(jointLedgerFeed(snapshot, '2026-10'), { month: '2026-10' })
    expect(october.settlementAmount).toBe(50_000)
  })
})

describe('anti-dobel: baris realtime & baris settle turunan', () => {
  it('baris yang sama datang dua kali tidak digandakan (dedupe by id)', () => {
    const row = newRow({ id: 'rt-1', description: 'Listrik PLN', amount: 450_000 })
    const before = getJointSnapshot().transactions.length

    const first = applyJointRow(row)
    const second = applyJointRow(row)

    expect(first?.justArrived).toBe(true)
    /* `null` = TIDAK ada yang ditulis — bukan error, tapi "sudah ada" */
    expect(second).toBeNull()
    expect(getJointSnapshot().transactions).toHaveLength(before + 1)
    expect(getJointSnapshot().transactions.filter((tx) => tx.id === 'rt-1')).toHaveLength(1)

    /* badge "Baru" dilepas tanpa menyentuh baris lain */
    clearJointArrivalBadge('rt-1')
    expect(getJointSnapshot().transactions.find((tx) => tx.id === 'rt-1')?.justArrived)
      .toBeUndefined()
    expect(() => clearJointArrivalBadge('rt-1')).not.toThrow()
  })
})


describe('anti-dobel lanjutan: baris server, privasi, & kunci semantik settle', () => {
  it('baris dari SERVER dipetakan lewat jalur yang sama (termasuk split)', () => {
    const created = applyRemoteJointRow({
      id: '11111111-1111-1111-1111-111111111111',
      joint_wallet_id: '22222222-2222-2222-2222-222222222222',
      user_id: JOINT_PARTNER.id,
      paid_by_user_id: JOINT_PARTNER.id,
      description: 'Listrik PLN',
      amount: 450_000,
      category: 'Tagihan',
      date: JOINT_TODAY_ISO,
      time_label: '21:07',
      split_type: 'percentage',
      split_percents: { [JOINT_ME.id]: 60, [JOINT_PARTNER.id]: 40 },
      is_private: false,
      is_settlement: false,
    })

    expect(created?.id).toBe('11111111-1111-1111-1111-111111111111')
    expect(created?.paidByUserId).toBe(JOINT_PARTNER.id)
    expect(created?.split).toEqual({
      type: 'percentage',
      percents: { [JOINT_ME.id]: 60, [JOINT_PARTNER.id]: 40 },
    })
    /* baris yang sama tidak diterima dua kali */
    expect(applyRemoteJointRow({ id: '11111111-1111-1111-1111-111111111111', amount: 450_000 })).toBeNull()
  })

  it('catatan privat milik partner: ISI disamarkan, NOMINALnya tetap ada', () => {
    const created = applyRemoteJointRow({
      id: 'p-1',
      user_id: JOINT_PARTNER.id,
      paid_by_user_id: JOINT_PARTNER.id,
      description: 'Kado rahasia',
      amount: 500_000,
      category: 'Belanja',
      date: JOINT_TODAY_ISO,
      time_label: '10:00',
      split_type: 'equal',
      is_private: true,
      private_for_user: JOINT_PARTNER.id,
    })

    expect(created?.description).not.toBe('Kado rahasia')
    expect(created?.amount).toBe(500_000)
    expect(created?.isPrivate).toBe(true)
  })

  it('baris settle dari server tidak berlipat dengan penanda bulan (kunci semantik)', () => {
    withPartner()
    const record = recordSettlement(
      newRecord({ month: '2026-09', from: JOINT_PARTNER.id, to: JOINT_ME.id, amount: 200_000 }),
    )!
    /* baris settle versi server: id uuid, tapi ceritanya SAMA */
    applyJointRow(
      newRow({
        id: '33333333-3333-3333-3333-333333333333',
        userId: record.from,
        paidByUserId: record.from,
        amount: 200_000,
        date: '2026-09-25',
        isSettlement: true,
        split: { type: 'single_payer', payerId: record.to },
      }),
      { arrival: false },
    )

    const feed = jointLedgerFeed(getJointSnapshot(), '2026-09')
    const settleRows = feed.filter((tx) => tx.isSettlement)
    expect(settleRows).toHaveLength(1)
    /* penanda bulan yang MENANG, bukan baris uuid yang datang belakangan */
    expect(settleRows[0]?.id).toBe(`settle-2026-09-${record.from}-${record.to}`)
    const serverRow = getJointSnapshot().transactions.find((tx) => tx.isSettlement)!
    expect(jointRowKey(serverRow)).toBe(jointRowKey(settleRows[0]!))
  })

  it('mergeJointRows: baris seed dibuang saat kantong sudah punya baris server', () => {
    const merged = mergeJointRows(INITIAL_JOINT_TRANSACTIONS, [
      newRow({ id: 'server-1', description: 'Makan dari server' }),
    ])

    expect(merged.map((tx) => tx.id)).toEqual(['server-1'])
  })
})

describe('kantong dari SERVER (uuid): baris server & identitas', () => {
  const uuidA = '11111111-1111-1111-1111-111111111111'
  const uuidB = '22222222-2222-2222-2222-222222222222'

  it('baris server jadi dasar (seed dibuang) & catatan tetap bisa ditulis', () => {
    const snapshot = applyRemoteJointWallet({
      wallet: { id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', name: 'Kantong Server', createdAt: '2026-09-01' },
      viewerId: uuidA,
      members: [uuidA, uuidB],
      rows: [newRow({ id: 'server-1', description: 'Makan dari server' })],
    })

    expect(getJointRemoteWalletId()).toBe('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa')
    expect(snapshot.wallet.name).toBe('Kantong Server')
    expect(snapshot.transactions.map((tx) => tx.id)).toEqual(['server-1'])
    expect(snapshot.members).toEqual([uuidA, uuidB])

    /* identitas server tidak memblokir pencatatan dua peserta demo */
    expect(
      addJointTransaction({ description: 'Baru', amount: 20_000, paidByUserId: JOINT_ME.id }),
    ).not.toBeNull()
    expect(recordSettlement(newRecord({ amount: 10_000 }))).not.toBeNull()
    expect(settlementRecordFor(getJointSnapshot(), JOINT_MONTH_KEY)).not.toBeNull()
  })

  it('catatan privat milik partner server disamarkan, milik sendiri tampil apa adanya', () => {
    applyRemoteJointWallet({
      wallet: { id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', name: 'Kantong Server', createdAt: '2026-09-01' },
      viewerId: uuidA,
      members: [uuidA, uuidB],
      rows: [],
    })

    const mine = applyRemoteJointRow({
      id: 'p-mine',
      user_id: uuidA,
      paid_by_user_id: uuidA,
      description: 'Kado buat Dany',
      amount: 100_000,
      date: JOINT_TODAY_ISO,
      time_label: '12:00',
      is_private: true,
      private_for_user: uuidA,
    })
    const theirs = applyRemoteJointRow({
      id: 'p-theirs',
      user_id: uuidB,
      paid_by_user_id: uuidB,
      description: 'Kado rahasia',
      amount: 200_000,
      date: JOINT_TODAY_ISO,
      time_label: '13:00',
      is_private: true,
      private_for_user: uuidB,
    })

    expect(mine?.description).toBe('Kado buat Dany')
    expect(theirs?.description).not.toBe('Kado rahasia')
    expect(theirs?.amount).toBe(200_000)
  })
})

describe('Hapus Akun & invariant kas pribadi', () => {
  it('purgeJointStore mengosongkan store & menandai `purged` di perangkat', async () => {
    addJointTransaction({ description: 'Kopi', amount: 25_000, paidByUserId: JOINT_ME.id })
    renameJointWallet('Kantong Test')

    const emptied = purgeJointStore()

    expect(emptied.transactions).toEqual([])
    expect(emptied.members).toEqual([])
    expect(jointPartnerJoined(emptied)).toBe(false)

    const persisted = await loadDeviceState<PersistedJoint>(JOINT_STATE_KEY)
    expect(persisted?.purged).toBe(true)
    expect(persisted?.transactions).toEqual([])
  })

  it('kantong bersama TIDAK mengubah cashTotal() — kas pribadi utuh', () => {
    withPartner()
    const before = cashTotal(getMoneySnapshot())
    const rowsBefore = getMoneySnapshot().rows.length

    addJointTransaction({ description: 'Nonton', amount: 300_000, paidByUserId: JOINT_PARTNER.id })
    recordSettlement(newRecord({ amount: 120_000 }))
    applyJointRow(newRow({ id: 'rt-kas', amount: 450_000 }))

    /* tiga tulisan di atas BENAR-BENAR terjadi (bukan ditolak validasi) */
    expect(getJointSnapshot().transactions.length)
      .toBe(INITIAL_JOINT_TRANSACTIONS.length + 2)
    expect(settlementRecordFor(getJointSnapshot(), JOINT_MONTH_KEY)).not.toBeNull()

    expect(cashTotal(getMoneySnapshot())).toBe(before)
    expect(getMoneySnapshot().rows).toHaveLength(rowsBefore)
  })

  it('hook store & snapshot biasa adalah sumber yang sama (tanpa hydration mismatch)', () => {
    expect(typeof useJointStore).toBe('function')
    /* snapshot hidup berisi data seed pada kunjungan pertama — sama dengan yang
       dirender server, jadi render pertama client tidak berbeda */
    expect(getJointSnapshot().transactions).toHaveLength(INITIAL_JOINT_TRANSACTIONS.length)
  })
})

/* ── HAPUS PER BARIS + KANTONG BARU YANG BENAR-BENAR KOSONG (paket 61.3) ─────
   Store ini sebelumnya NOL fungsi hapus: catatan bareng yang salah hanya bisa
   "dilawan" dengan mencatat ulang dan menutupi angka yang salah. Test di bawah
   mengunci aturan yang dipilih — hanya CATATAN, hanya bulan yang BELUM disettle
   — plus janji bahwa kantong yang baru dibuat benar-benar kosong (kalau tidak,
   klaim "baru dibuat" tidak bisa dipercaya). */

describe('hapus satu baris & kantong baru kosong (paket 61.3)', () => {
  it('deleteJointTransaction mengubah TIMBANGAN & posisi bersih, bukan cuma daftarnya', () => {
    withPartner()
    const tx = addJointTransaction({
      description: 'Nonton bareng',
      amount: 400_000,
      paidByUserId: JOINT_ME.id,
    })!
    const before = computeSettlement(jointLedgerFeed(getJointSnapshot(), JOINT_MONTH_KEY))
    const notesBefore = jointNotes(getJointSnapshot()).length

    expect(deleteJointTransaction(tx.id)?.id).toBe(tx.id)

    const after = computeSettlement(jointLedgerFeed(getJointSnapshot(), JOINT_MONTH_KEY))
    expect(jointNotes(getJointSnapshot())).toHaveLength(notesBefore - 1)
    /* pengeluaran bersama turun tepat sebesar nominalnya… */
    expect(after.totalSpent).toBe(before.totalSpent - 400_000)
    /* …dan porsi patungan Jon (50%) hilang dari posisi bersihnya */
    expect(Math.round(after.myNet)).toBe(Math.round(before.myNet) - 200_000)
    /* uang tidak pernah hilang/muncul: Σ net selalu 0 */
    expect(Math.round(after.myNet + after.partnerNet)).toBe(0)
  })

  it('bulan yang sudah ditandai settle DIKUNCI — hapus ditolak & tidak ada yang ditulis', () => {
    withPartner()
    const tx = addJointTransaction({
      description: 'Nonton bareng',
      amount: 300_000,
      paidByUserId: JOINT_PARTNER.id,
    })!
    expect(recordSettlement(newRecord())).not.toBeNull()

    const notesBefore = jointNotes(getJointSnapshot()).length
    expect(deleteJointTransaction(tx.id)).toBeNull()

    expect(jointNotes(getJointSnapshot())).toHaveLength(notesBefore)
    expect(jointDeleteState(getJointSnapshot(), tx)).toBe('locked')
    /* sebelum disettle, baris yang sama memang boleh dihapus */
    expect(jointNotes(getJointSnapshot()).every((row) => row.id !== tx.id)).toBe(false)
  })

  it('baris turunan (settle/pembuka bulan) tidak bisa dihapus dari pintu ini', () => {
    withPartner()
    expect(recordSettlement(newRecord())).not.toBeNull()

    const entries = jointLedgerFeed(getJointSnapshot(), JOINT_MONTH_KEY).filter(
      (tx) => tx.isSettlement,
    )
    expect(entries.length).toBeGreaterThan(0)

    expect(deleteJointTransaction(entries[0]!.id)).toBeNull()
    expect(jointDeleteState(getJointSnapshot(), entries[0]!)).toBe('none')
    expect(
      jointLedgerFeed(getJointSnapshot(), JOINT_MONTH_KEY).some(
        (tx) => tx.id === entries[0]!.id,
      ),
    ).toBe(true)
  })

  it('Undo mengembalikan baris BESERTA angka timbangannya (bukan cuma tampilannya)', () => {
    withPartner()
    const tx = addJointTransaction({
      description: 'Tiket kereta',
      amount: 600_000,
      paidByUserId: JOINT_ME.id,
    })!
    const before = computeSettlement(jointLedgerFeed(getJointSnapshot(), JOINT_MONTH_KEY))

    expect(deleteJointTransaction(tx.id)).not.toBeNull()
    expect(restoreJointTransaction(tx.id)?.id).toBe(tx.id)

    const after = computeSettlement(jointLedgerFeed(getJointSnapshot(), JOINT_MONTH_KEY))
    expect(after.totalSpent).toBe(before.totalSpent)
    expect(Math.round(after.myNet)).toBe(Math.round(before.myNet))

    /* Undo yang tidak sah gagal jujur, dan hapus dua kali tidak menulis dua kali */
    expect(restoreJointTransaction(tx.id)).toBeNull()
    expect(deleteJointTransaction(tx.id)).not.toBeNull()
    expect(deleteJointTransaction(tx.id)).toBeNull()
  })

  it('tombstone bertahan setelah state dibaca ulang & tidak menghidupkan catatan contoh', () => {
    const removed = INITIAL_JOINT_TRANSACTIONS[0]!
    expect(deleteJointTransaction(removed.id)).not.toBeNull()

    const merged = mergeJointState({
      version: 1,
      wallet: { ...getJointSnapshot().wallet },
      transactions: [],
      settlements: {},
      members: [JOINT_ME.id, JOINT_PARTNER.id],
      removedIds: getJointSnapshot().removedIds,
    })

    /* barisnya tetap TERSIMPAN (tombstone, bukan hapus fisik)… */
    expect(merged.transactions.some((tx) => tx.id === removed.id)).toBe(true)
    /* …tapi tidak pernah kembali ke daftar yang dibaca user */
    expect(jointNotes(merged).some((tx) => tx.id === removed.id)).toBe(false)
  })

  it('createJointPocket: kantong baru KOSONG, bertahan setelah refresh, tanggalnya hari ini', () => {
    const wallet = createJointPocket('Dompet Kita Berdua', '2026-09-29')

    expect(wallet).toMatchObject({
      name: 'Dompet Kita Berdua',
      createdAt: '2026-09-29',
      created: true,
    })
    expect(jointNotes(getJointSnapshot())).toHaveLength(0)
    expect(jointLedgerFeed(getJointSnapshot(), JOINT_MONTH_KEY)).toHaveLength(0)
    expect(createJointPocket('   ')).toBeNull()

    /* setelah refresh: nama bertahan DAN buku besarnya tetap kosong — catatan
       contoh tidak boleh lahir lagi (inilah yang dulu terjadi) */
    const merged = mergeJointState({
      version: 1,
      wallet: { ...wallet! },
      transactions: [],
      settlements: {},
      members: [JOINT_ME.id],
      removedIds: getJointSnapshot().removedIds,
    })
    expect(merged.wallet.name).toBe('Dompet Kita Berdua')
    expect(jointNotes(merged)).toHaveLength(0)
  })

  it('kantong baru tidak membawa penanda settle lama & tetap TIDAK menyentuh kas pribadi', () => {
    withPartner()
    const cashBefore = cashTotal(getMoneySnapshot())
    const rowsBefore = getMoneySnapshot().rows.length

    /* tiga tulisan khas kantong bersama, lalu kantongnya diganti */
    addJointTransaction({
      description: 'Nonton',
      amount: 300_000,
      paidByUserId: JOINT_PARTNER.id,
    })
    expect(recordSettlement(newRecord())).not.toBeNull()
    expect(createJointPocket('Kantong Baru')).not.toBeNull()

    /* penanda bulan yang disepakati di kantong LAMA tidak berlaku di kantong baru */
    expect(settlementRecordFor(getJointSnapshot(), JOINT_MONTH_KEY)).toBeNull()
    /* dan INVARIANT paket 61.3: kas pribadi tidak pernah tersentuh */
    expect(cashTotal(getMoneySnapshot())).toBe(cashBefore)
    expect(getMoneySnapshot().rows).toHaveLength(rowsBefore)
  })
})

