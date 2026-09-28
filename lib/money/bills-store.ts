'use client'

import { useSyncExternalStore } from 'react'
import type { BudgetScope } from '@/lib/data/budget'
import { BILL_PAYMENT_CATEGORY, BILL_UNPAID_REVERSAL_NOTE, INITIAL_BILLS, TODAY_ISO, type Bill } from '@/lib/data/bills'
import { scopedItems } from '@/lib/data/money-context'
import { BILLS_STATE_KEY, loadDeviceState, saveDeviceState } from './idb'
import {
  getMoneySnapshot,
  postBalanceAdjustment,
  postExpense,
  removeRow,
  walletBalance,
  walletIdOfName,
  type MoneyRow,
} from './store'

/* ── SATU STORE TAGIHAN (paket 51 · temuan E laporan 46) ─────────────────────
   Dua masalah dengan satu akar, persis yang dilaporkan audit 28 Sep 2026:

     1. DAFTAR TAGIHAN HIDUP DI HALAMAN — `bills-screen.tsx:71` memegang
        `useState(INITIAL_BILLS)`, jadi tagihan yang ditambah/diubah/dihapus
        hilang setelah refresh dan tidak pernah muncul di file ekspor
        (`lib/data/help.ts` membaca konstanta `INITIAL_BILLS`).
     2. "LUNAS" TIDAK MENGGERAKKAN UANG — `handleMarkPaid()` cuma
        `setBills(prev.map(... isPaidThisMonth: true))` + toast "LUNAS". Tidak
        ada satu baris pun di ledger kas, jadi saldo dompet tetap utuh padahal
        layarnya berkata sudah dibayar. Itu temuan yang SAMA dengan audit #1
        paket 41 ("melunasi tanpa uang keluar") dan dilarang kanon "jujur di
        setiap klaim" (PRD 244).

   Sekarang seluruh tagihan dibaca dari SATU state modul ini (resep yang sama
   dengan `lib/money/funds-store.ts` paket 46 & `lib/money/wealth-store.ts`
   paket 50):

     · `bills`      — daftar tagihan, TERMASUK baris yang sedang di-tombstone
                      (lihat `removedIds`): bentuknya sengaja menyimpan barisnya
                      supaya Undo mengembalikan tagihan BESERTA statusnya;
     · `removedIds` — TOMBSTONE id tagihan yang dihapus user. Hapus yang cuma
                      `filter` membuat Undo mustahil (status "lunas bulan ini"
                      ikut terbuang) dan membuat "hapus" tak bisa dibedakan dari
                      "belum pernah ada";
     · `hydrated`   — false sampai IndexedDB selesai dibaca, supaya HTML server &
                      render pertama client identik (tanpa hydration mismatch).

   SALDO DOMPET SENGAJA **TIDAK** ADA DI SINI: kas tetap milik
   `lib/money/store.ts`, dan pembayaran tagihan ditulis lewat `postExpense()`
   (satu-satunya jalur pengeluaran kas). Karena itu `markBillPaid()` di bawah
   MEMBUNGKUS fungsi itu, bukan menyalinnya — dua akibat (kas keluar + status
   lunas) lahir dari satu tindakan, dan tidak mungkin ada stempel LUNAS tanpa
   baris kasnya. Kalau store menolak (dompet tidak dikenal / saldo kurang),
   hasilnya `null` dan TIDAK ada satu pun bagian yang ditulis — bukan ditulis
   sebagian lalu diklaim berhasil.

   BATAS JUJUR:
     · state hidup di memory modul + IndexedDB (`lib/money/idb.ts`, key `bills`,
       database `catetind-money` yang sama) → bertahan saat refresh, TIDAK ada
       sinkronisasi antar-perangkat;
     · tagihan CONTOH yang sudah berstatus "Lunas" di seed tidak punya baris
       ledger (barisnya tidak pernah ada di ledger mock); `paidRowId` hanya diisi
       pembayaran yang benar-benar dilakukan user lewat `markBillPaid()`. Karena
       itu `unmarkBillPaid()` pada tagihan seed hanya mencabut stempelnya, dan
       hasilnya menyebut `row: null` — bukan pura-pura menghapus baris yang tidak
       ada;
     · 🚧 Di produksi tiap penulisan jadi `insert`/`update`/`delete` ke tabel
       `bills` (tabelnya sudah ada + RLS) dan halaman membacanya dari server —
       karena itu bentuk state di sini sengaja JSON polos yang siap dikirim HTTP. */

/** bentuk yang ditulis ke IndexedDB — JSON polos, siap HTTP */
export interface PersistedBills {
  /** versi bentuk data; bentuk lama/asing diperlakukan sebagai "belum ada" */
  version?: number
  /** SEMUA baris, termasuk yang sedang di-tombstone (Undo masih bisa memakainya) */
  bills?: Bill[]
  /** id tagihan yang dihapus user (tombstone) */
  removedIds?: string[]
  /** true = akun ini sudah dihapus user → jangan isi ulang tagihan contoh */
  purged?: boolean
}

export interface BillsState {
  bills: Bill[]
  removedIds: string[]
}

export interface BillsSnapshot extends BillsState {
  /** false sampai hidrasi IndexedDB selesai (batas render server ↔ client) */
  hydrated: boolean
}

/** versi bentuk state di perangkat — naikkan kalau bentuknya berubah */
const BILLS_STATE_VERSION = 1

/** snapshot untuk render server & hidrasi — selalu data seed, tanpa IDB */
const SERVER_SNAPSHOT: BillsSnapshot = Object.freeze({
  bills: INITIAL_BILLS,
  removedIds: [],
  hydrated: false,
})

/** snapshot kosong — keadaan setelah user MENGHAPUS AKUN-nya (pola store lain) */
const EMPTY_SNAPSHOT: BillsSnapshot = Object.freeze({
  bills: [],
  removedIds: [],
  hydrated: true,
})

let live: BillsSnapshot = SERVER_SNAPSHOT
let accountPurged = false
let hydrateStarted = false
const listeners = new Set<() => void>()

export function getBillsSnapshot(): BillsSnapshot {
  return live
}

export function getServerBillsSnapshot(): BillsSnapshot {
  return SERVER_SNAPSHOT
}

/**
 * Berlangganan perubahan state tagihan. Hidrasi IndexedDB ditunda sampai ada
 * pelanggan PERTAMA (yaitu setelah hidrasi React) supaya HTML server tidak
 * pernah berbeda dari render pertama client — pola yang sama dengan
 * `subscribeMoneyStore`/`subscribeFundsStore`/`subscribeWealthStore`.
 */
export function subscribeBillsStore(listener: () => void): () => void {
  listeners.add(listener)
  void hydrateBillsStore()
  return () => {
    listeners.delete(listener)
  }
}

function emit(): void {
  for (const listener of listeners) listener()
}

function persist(snapshot: BillsState): void {
  saveDeviceState<PersistedBills>(BILLS_STATE_KEY, {
    version: BILLS_STATE_VERSION,
    bills: snapshot.bills,
    removedIds: [...snapshot.removedIds],
    purged: accountPurged,
  })
}

function commit(next: BillsSnapshot): void {
  live = next
  persist(next)
  emit()
}


/* ── ID SEBELUM HIDRASI (anti tabrakan) ──────────────────────────────────────
   Penulisan bisa terjadi SEBELUM IndexedDB selesai dibaca (store ini hidup di
   memory sejak render pertama). Kalau id-nya dihitung dari daftar seed — yang
   saat itu isinya masih `INITIAL_BILLS` (id '1'–'6') — tagihan baru bisa dapat
   id yang SUDAH dipakai tagihan tersimpan user, dan saat hidrasi
   `mergeBillsState` harus memilih salah satu: data user hilang.

   Karena itu tagihan yang lahir sebelum hidrasi memakai ruang id TINGGI
   (≥ 1.000.000). Id tersimpan selalu kecil & berurutan, jadi tabrakan menjadi
   mustahil tanpa perlu menebak isi IndexedDB. Setelah hidrasi, id kembali
   berurutan dari daftar yang sudah tergabung. */
const PRE_HYDRATION_ID_BASE = 1_000_000
let nextPreHydrationId = PRE_HYDRATION_ID_BASE
let hydratedOnce = false

function nextBillId(): string {
  if (!hydratedOnce) return String(nextPreHydrationId++)
  const highest = live.bills.reduce((max, bill) => {
    const numeric = Number(bill.id)
    return Number.isFinite(numeric) && numeric > max ? numeric : max
  }, 0)
  return String(highest + 1)
}

/**
 * Gabungkan state tersimpan dengan yang sudah ada di memory. Fungsi murni
 * (`current` bisa dioper dari test) supaya jalur hidrasi bisa diuji tanpa
 * browser/IndexedDB — persis pola `mergeMoneySnapshot`/`mergeFundsState`.
 *
 * Aturan: daftar tersimpan jadi DASAR (itu yang benar-benar dimiliki user),
 * tagihan yang dibuat SEBELUM hidrasi selesai tetap ikut (dedupe per id), dan
 * tombstone digabung: tagihan yang dihapus sebelum hidrasi tidak boleh "lahir
 * lagi" setelah state tersimpan dibaca.
 */
export function mergeBillsState(
  persisted: PersistedBills | null,
  current: BillsSnapshot = live,
): BillsSnapshot {
  const purged = persisted?.purged === true
  const known = persisted?.version === BILLS_STATE_VERSION
  const storedBills = known ? (persisted?.bills ?? []).filter((bill) => bill?.id) : []
  /* daftar dasar = yang tersimpan, tagihan kanon untuk kunjungan pertama, atau
     KOSONG kalau akun ini sudah dihapus user */
  const base = storedBills.length > 0 ? storedBills : purged ? [] : INITIAL_BILLS
  /* Yang ikut dari MEMORY hanyalah tagihan yang lahir di sesi ini — yaitu yang
     BUKAN tagihan seed (saat hidrasi, memory masih berisi `SERVER_SNAPSHOT`) dan
     belum ada di daftar dasar. Tanpa penyaring "bukan seed", tagihan contoh akan
     muncul kembali di akun yang sudah dihapus, dan daftar tersimpan user bisa
     tercampur data contoh. */
  const extras = current.bills.filter(
    (bill) =>
      !INITIAL_BILLS.some((seed) => seed.id === bill.id) &&
      !base.some((knownBill) => knownBill.id === bill.id),
  )
  const bills = [...base, ...extras]

  const storedRemoved = known ? (persisted?.removedIds ?? []).filter((id) => id) : []
  const removedIds = [...new Set([...storedRemoved, ...current.removedIds])]

  return { bills, removedIds, hydrated: true }
}

async function hydrateBillsStore(): Promise<void> {
  if (hydrateStarted) return
  hydrateStarted = true

  const persisted = await loadDeviceState<PersistedBills>(BILLS_STATE_KEY)
  accountPurged = persisted?.purged === true
  live = mergeBillsState(persisted)
  hydratedOnce = true
  emit()
}

/* ── API TULIS — satu-satunya jalur menulis tagihan ──────────────────────────
   Komponen tidak boleh menyentuh `bills`/`removedIds` langsung: halaman Tagihan,
   alat ekspor, dan Hapus Akun membaca state yang sama, jadi perubahan harus
   lewat pintu yang juga menyimpan ke perangkat. */

/** bentuk tagihan baru: `id` milik store (halaman menempelkan `scope` aktif) */
export type NewBillInput = Omit<Bill, 'id'>

/** tambah tagihan baru — selalu mulai dari "belum dibayar bulan ini" */
export function addBill(input: NewBillInput): Bill {
  /* `paidRowId` sengaja TIDAK diterima dari luar: jejak uang hanya boleh lahir
     dari `markBillPaid()`, supaya mustahil ada tagihan yang mengaku punya baris
     kas padahal tidak ada (atau sebaliknya). */
  const { paidRowId: _paidRowId, ...fields } = input
  const bill: Bill = { ...fields, id: nextBillId() }
  commit({ ...live, bills: [...live.bills, bill], hydrated: true })
  return bill
}

/**
 * Ubah satu tagihan. `null` = tagihan tidak ada / sedang dihapus, dan itu berarti
 * TIDAK ada yang berubah — halaman pemanggil tidak boleh berbunyi "tersimpan".
 *
 * `id` tidak bisa ikut diubah (kunci barisnya), dan `patch` sengaja hanya
 * sebagian: yang tidak dikoreksi user tetap seperti semula.
 *
 * `isPaidThisMonth` & `paidRowId` DIPERTAHANKAN apa pun isi patch-nya: dua field
 * itu milik `markBillPaid()`/`unmarkBillPaid()` (jejak uang). Kalau boleh ikut
 * ditambal dari form edit, satu field form bisa mencabut stempel LUNAS tanpa
 * membalikkan baris kasnya — persis "dua cerita" yang ditutup paket ini.
 */
export function editBill(
  id: string,
  patch: Partial<Omit<Bill, 'id' | 'isPaidThisMonth' | 'paidRowId'>>,
): Bill | null {
  const target = live.bills.find((bill) => bill.id === id)
  if (!target || live.removedIds.includes(id)) return null
  const bill: Bill = { ...target, ...patch, id }
  /* dikembalikan ke nilai lama SETELAH spread: kalau tidak, `paidRowId: undefined`
     dari form akan menghapus jejak baris kasnya (dan `isPaidThisMonth: false`
     akan mencabut stempelnya tanpa mengembalikan uang). */
  bill.isPaidThisMonth = target.isPaidThisMonth
  if (target.paidRowId === undefined) delete bill.paidRowId
  else bill.paidRowId = target.paidRowId

  commit({
    ...live,
    bills: live.bills.map((item) => (item.id === id ? bill : item)),
    hydrated: true,
  })
  return bill
}

/**
 * Hapus tagihan = TOMBSTONE, bukan `filter`. Barisnya tetap disimpan di state
 * (beserta status lunas & `paidRowId`-nya) supaya Undo benar-benar
 * mengembalikan tagihan seperti semula.
 *
 * Hapus tagihan TIDAK menyentuh ledger: kalau uangnya memang sudah keluar,
 * catatan pembayarannya tetap ada di Riwayat — menghapus tagihan bukan alasan
 * menghapus jejak uang yang benar-benar berpindah.
 */
export function deleteBill(id: string): Bill | null {
  const bill = live.bills.find((row) => row.id === id)
  if (!bill || live.removedIds.includes(id)) return null
  commit({ ...live, removedIds: [...live.removedIds, id], hydrated: true })
  return bill
}

/** Undo hapus: cabut tombstone-nya. Status "lunas bulan ini" ikut kembali apa
 *  adanya karena barisnya tidak pernah dibuang. `null` = tidak ada yang dihapus. */
export function restoreBill(id: string): Bill | null {
  if (!live.removedIds.includes(id)) return null
  const bill = live.bills.find((row) => row.id === id) ?? null
  commit({ ...live, removedIds: live.removedIds.filter((rowId) => rowId !== id), hydrated: true })
  return bill
}

/* ── BAYAR TAGIHAN = UANGNYA BENAR-BENAR KELUAR (paket 51) ───────────────────
   Dua fungsi di bawah menutup lubang temuan E: stempel LUNAS dan baris kas tidak
   boleh lagi jadi dua cerita. Urutannya sengaja:
     (1) validasi dulu (tagihan ada, belum lunas, dompet dikenal, saldo cukup);
     (2) baris kas ditulis lewat `postExpense()` — jalur yang SAMA dengan seluruh
         pengeluaran lain di app (`appendRow` → `commit` → penjaga invariant);
     (3) baru tagihannya ditandai lunas + `paidRowId` disimpan.
   Kalau langkah (1) atau (2) gagal, hasilnya `null` dan TIDAK ada satu pun bagian
   yang ditulis — bukan ditulis sebagian. */

export interface BillPaymentResult {
  /** tagihan setelah dibayar (`isPaidThisMonth: true`, `paidRowId` terisi) */
  bill: Bill
  /** baris kas yang BENAR-BENAR ditulis — bukti bahwa saldo dompetnya bergerak */
  row: MoneyRow
  amount: number
  walletId: string
  walletName: string
  /** saldo dompet setelah barisnya ditulis (dibaca dari ledger, bukan dihitung di UI) */
  walletBalanceAfter: number
}

/**
 * "Tandai Lunas" yang menggerakkan uang: menulis SATU baris pengeluaran
 * (kategori `Tagihan`, catatan = nama tagihan) lewat `postExpense()` **dan**
 * menandai `isPaidThisMonth` — dua-duanya dalam satu pemanggilan.
 *
 * `null` = DITOLAK dan tidak ada satu pun bagian yang ditulis:
 *   · tagihannya tidak ada / sedang dihapus,
 *   · tagihan sudah lunas bulan ini (double-tap tidak boleh membayar dua kali),
 *   · dompet yang dipilih tidak ada di ledger (`walletIdOfName` → ''),
 *   · nominalnya bukan angka rupiah > 0, atau
 *   · saldo dompet itu TIDAK cukup (uang tidak boleh keluar lebih dari isinya).
 */
export function markBillPaid(
  id: string,
  walletName: string,
  amount?: number,
  dateISO: string = TODAY_ISO,
): BillPaymentResult | null {
  const bill = billById(live, id)
  if (!bill || bill.isPaidThisMonth) return null

  const walletId = walletIdOfName(getMoneySnapshot(), walletName)
  if (!walletId) return null

  const rounded = Math.round(Number(amount ?? bill.amount))
  if (!Number.isFinite(rounded) || rounded <= 0) return null
  if (walletBalance(getMoneySnapshot(), walletId) < rounded) return null

  const row = postExpense({
    walletId,
    amount: rounded,
    note: bill.name,
    category: BILL_PAYMENT_CATEGORY,
    dateISO,
  })
  if (!row) return null

  const updated: Bill = { ...bill, isPaidThisMonth: true, paidRowId: row.id }
  commit({
    ...live,
    bills: live.bills.map((item) => (item.id === id ? updated : item)),
    hydrated: true,
  })

  return {
    bill: updated,
    row,
    amount: rounded,
    walletId,
    walletName: row.walletName,
    walletBalanceAfter: walletBalance(getMoneySnapshot(), walletId),
  }
}

export interface BillUnpaidResult {
  /** tagihan setelah stempelnya dicabut */
  bill: Bill
  /** baris kas pembayaran yang dicabut (tombstone); `null` = tagihannya cuma
   *  punya stempel contoh (dibayar sebelum ada store ini) sehingga tidak ada
   *  baris untuk dibalikkan */
  row: MoneyRow | null
  /** baris koreksi yang MENGEMBALIKAN uangnya ke dompet; `null` = tidak ada
   *  pengembalian (tidak ada baris pembayaran yang perlu dibalikkan) */
  reversal: MoneyRow | null
}

/**
 * Salah tekan → cabut stempel LUNAS **dan kembalikan uangnya**. Dua langkah,
 * karena satu langkah tidak cukup:
 *
 *   1. `removeRow(paidRowId)` — baris pembayarannya hilang dari SEMUA pembaca
 *      (Riwayat, Home, `/wallet`, `/wallet/[id]`). Ini yang diminta paket 51:
 *      membalikkan barisnya, bukan cuma stempelnya.
 *   2. Koreksi saldo (`postBalanceAdjustment`) — `removeRow` HANYA menyembunyikan
 *      barisnya dan TIDAK mengembalikan saldo (kanon store uang: "yang dihapus
 *      barisnya, bukan uangnya" — `lib/money/store.test.ts`). Kalau langkah ini
 *      dilewati, saldo dompet user tetap berkurang untuk pembayaran yang ia
 *      batalkan, dan tidak ada baris yang bisa menjelaskannya. Baris koreksinya
 *      memakai nama sendiri ("Batal bayar <tagihan>"), bukan copy koreksi bawaan,
 *      supaya Riwayat bisa menjelaskan kenapa saldonya naik kembali.
 *
 * `null` = tagihannya tidak ada atau memang belum ditandai lunas (membatalkan dua
 * kali ditolak, jadi uangnya tidak pernah dikembalikan dua kali).
 */
export function unmarkBillPaid(id: string): BillUnpaidResult | null {
  const bill = billById(live, id)
  if (!bill || !bill.isPaidThisMonth) return null

  const row = bill.paidRowId
    ? (getMoneySnapshot().rows.find((item) => item.id === bill.paidRowId) ?? null)
    : null

  let reversal: MoneyRow | null = null
  if (row) {
    removeRow(row.id)
    reversal = postBalanceAdjustment({
      walletId: row.walletId,
      /* saldo setelah pembayaran + nominal yang dibatalkan = saldo sebelum bayar */
      newBalance: walletBalance(getMoneySnapshot(), row.walletId) + row.amount,
      dateISO: TODAY_ISO,
      note: BILL_UNPAID_REVERSAL_NOTE(bill.name),
      category: BILL_PAYMENT_CATEGORY,
    })
  }

  const updated: Bill = { ...bill, isPaidThisMonth: false }
  delete updated.paidRowId
  commit({
    ...live,
    bills: live.bills.map((item) => (item.id === id ? updated : item)),
    hydrated: true,
  })

  return { bill: updated, row, reversal }
}

/* ── HAPUS AKUN: KOSONGKAN STORE ─────────────────────────────────────────────
   Dipanggil `lib/account.ts` SETELAH IndexedDB dihapus. Tugasnya sama dengan
   `purgeMoneyStore()`/`purgeFundsStore()`/`purgeWealthStore()`: membuat state di
   memory benar-benar kosong dan menandainya "purged", supaya refresh berikutnya
   tidak menghidupkan lagi tagihan contoh (Kos, Netflix, cicilan HP, …) seolah
   itu milik user. */
export function purgeBillsStore(): BillsSnapshot {
  accountPurged = true
  live = EMPTY_SNAPSHOT
  persist(live)
  emit()
  return live
}

/* ── HOOK & SELECTOR ───────────────────────────────────────────────────────── */

/** snapshot store tagihan untuk komponen client */
export function useBillsStore(): BillsSnapshot {
  return useSyncExternalStore(subscribeBillsStore, getBillsSnapshot, getServerBillsSnapshot)
}

/**
 * Tagihan yang BENAR-BENAR ada (bukan tombstone). Semua pembaca halaman memakai
 * ini, jadi "hapus" terlihat serentak di daftar, tameng, waterfall, timeline, dan
 * ekspor — tanpa satu pun dari mereka perlu tahu soal tombstone.
 */
export function liveBills(snapshot: BillsSnapshot): Bill[] {
  return snapshot.bills.filter((bill) => !snapshot.removedIds.includes(bill.id))
}

/** satu tagihan dari id — `null` = belum ada / sedang dihapus (mis. id URL asing) */
export function billById(snapshot: BillsSnapshot, id: string): Bill | null {
  if (snapshot.removedIds.includes(id)) return null
  return snapshot.bills.find((bill) => bill.id === id) ?? null
}

/** tagihan yang belum dibayar bulan ini (dasar list "Aktif" & timeline) */
export function unpaidBills(snapshot: BillsSnapshot): Bill[] {
  return liveBills(snapshot).filter((bill) => !bill.isPaidThisMonth)
}

/**
 * Tagihan pada SATU konteks uang (paket 47) — memakai penyaring kanon
 * `scopedItems()` supaya tidak ada logika penyaring kedua. Ringkasan (tameng,
 * waterfall) sengaja TIDAK disaring: konteks menyaring daftar, bukan total.
 */
export function billsForContext(snapshot: BillsSnapshot, scope: BudgetScope): Bill[] {
  return scopedItems(liveBills(snapshot), scope)
}

/**
 * Kosongkan store ke kondisi seed (dipakai test supaya tiap kasus mulai bersih).
 * Tidak pernah dipanggil UI: di produksi "reset" tidak punya arti — yang ada
 * cuma `purgeBillsStore()` saat user menghapus akunnya.
 */
export function resetBillsStore(): void {
  live = SERVER_SNAPSHOT
  accountPurged = false
  hydrateStarted = false
  hydratedOnce = false
  nextPreHydrationId = PRE_HYDRATION_ID_BASE
  emit()
}
