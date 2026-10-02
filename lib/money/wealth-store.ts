'use client'

import { useSyncExternalStore } from 'react'
import type { BudgetScope } from '@/lib/data/budget'
import {
  INITIAL_DEBTS,
  INITIAL_DEBT_PAYMENTS,
  INITIAL_INVESTMENTS,
  WEALTH_NOW_ISO,
  WEALTH_TODAY_ISO,
  paymentsOfDebt,
  type AssetType,
  type Debt,
  type DebtDirection,
  type DebtPayment,
  type DebtType,
  type Investment,
} from '@/lib/data/wealth'
import {
  applySettlement,
  cashDirectionOf,
  changeDebtFrom,
  planDebtSettlement,
  settlementCounterparty,
} from '@/lib/data/wealth-cash'
import { WEALTH_STATE_KEY, loadDeviceState, saveDeviceState } from './idb'
import { getMoneySnapshot, postDebtSettlement, rowForClientTxId, type DebtSettlementResult } from './store'

/* ── SATU STORE KEKAYAAN (paket 50 · temuan D laporan 46) ────────────────────
   Temuan audit 28 Sep 2026: `/wealth` memegang SALINAN datanya sendiri.

     · `wealth-screen.tsx:95-98` → `useState(INITIAL_INVESTMENTS)`,
       `useState(INITIAL_DEBTS)`, `useState(INITIAL_DEBT_PAYMENTS)`;
     · semua handler di halaman itu (`handleSaveInvestment`, `handleUpdatePrice`,
       `handleSaveAssetEdit`, `handleDeleteAsset`, `handlePayDebt`,
       `handleSaveDebt`) menulis ke state halaman itu saja;
     · `lib/money/export.ts` & `lib/data/help.ts` membaca KONSTANTA seed.

   Akibat yang bisa dibuktikan user: hutang yang ditambahkan, pelunasan, dan
   harga aset yang diperbarui **hilang total setelah refresh** dan **tidak
   pernah muncul di file ekspor** — padahal ekspor itu janji portabilitas data
   (PRD 244 "jujur di setiap klaim").

   Sekarang seluruh kekayaan dibaca dari SATU state modul ini (pola yang sama
   dengan `lib/money/store.ts` untuk uang & `lib/money/funds-store.ts` untuk
   celengan):

     · `investments` — portofolio aset (saham/reksadana/emas/crypto);
     · `debts`       — hutang & piutang, termasuk catatan kembalian;
     · `payments`    — riwayat `debt_payments` (sumber "Sudah dibayar" di kartu);
     · `hydrated`    — false sampai IndexedDB selesai dibaca, supaya HTML server
                       & render pertama client identik (tanpa hydration mismatch).

   SALDO DOMPET SENGAJA **TIDAK** ADA DI SINI: kas tetap milik
   `lib/money/store.ts`, dan pelunasan hutang/piutang ditulis ke ledger lewat
   `postDebtSettlement()` (satu-satunya debit/kredit kas pelunasan, paket 41).
   Karena itu `settleDebt()` di bawah MEMBUNGKUS fungsi itu, bukan menyalinnya:
   dua akibat (kas bergerak + catatan hutang berubah) lahir dari satu tindakan,
   dan Net Worth tidak mungkin naik hanya karena melunasi (aturan laporan 41).

   BATAS JUJUR (sama dengan dua store lain): state hidup di memory modul dan
   ditulis ke IndexedDB (`lib/money/idb.ts`, key `wealth`, database
   `catetind-money` yang sama) supaya bertahan saat refresh. TIDAK ada
   sinkronisasi antar-perangkat. Di produksi tiap penulisan jadi `insert`/
   `update` ke tabel `investments`/`debts`/`debt_payments` (tabelnya sudah ada +
   RLS), lalu halaman membacanya dari server — karena itu bentuk state di sini
   sengaja JSON polos yang siap dikirim HTTP. */

/** bentuk yang ditulis ke IndexedDB — JSON polos, siap HTTP */
export interface PersistedWealth {
  /** versi bentuk data; bentuk lama/asing diperlakukan sebagai "belum ada" */
  version?: number
  investments?: Investment[]
  debts?: Debt[]
  payments?: DebtPayment[]
  /**
   * TOMBSTONE baris yang dihapus user (paket 61) — bentuknya SAMA dengan
   * `removedIds` di `lib/money/store.ts` & `lib/money/bills-store.ts`, dengan
   * satu tambahan penting: kuncinya WAJIB ber-prefix jenis (`debt:1` / `inv:1`)
   * karena id di dua daftar kekayaan bisa berimpit — lihat `keyOf()` di
   * `wealth-store.ts`.
   */
  removedIds?: string[]
  /** true = akun ini sudah dihapus user → jangan isi ulang data contoh */
  purged?: boolean
}

export interface WealthState {
  investments: Investment[]
  debts: Debt[]
  payments: DebtPayment[]
  /** id yang dihapus user (tombstone) — lihat `PersistedWealth.removedIds` */
  removedIds: string[]
}

export interface WealthSnapshot extends WealthState {
  /** false sampai hidrasi IndexedDB selesai (batas render server ↔ client) */
  hydrated: boolean
}

/** versi bentuk state di perangkat — naikkan kalau bentuknya berubah */
const WEALTH_STATE_VERSION = 1

/** snapshot untuk render server & hidrasi — selalu data seed, tanpa IDB */
const SERVER_SNAPSHOT: WealthSnapshot = Object.freeze({
  investments: INITIAL_INVESTMENTS,
  debts: INITIAL_DEBTS,
  payments: INITIAL_DEBT_PAYMENTS,
  removedIds: [] as string[],
  hydrated: false,
})

/** snapshot kosong — keadaan setelah user MENGHAPUS AKUN-nya (pola store uang) */
const EMPTY_SNAPSHOT: WealthSnapshot = Object.freeze({
  investments: [],
  debts: [],
  payments: [],
  removedIds: [] as string[],
  hydrated: true,
})

let live: WealthSnapshot = SERVER_SNAPSHOT
let accountPurged = false
let hydrateStarted = false
let hydratedOnce = false
const listeners = new Set<() => void>()

export function getWealthSnapshot(): WealthSnapshot {
  return live
}

/** dipakai React saat render server & hidrasi (lihat `useWealthStore`) */
export function getServerWealthSnapshot(): WealthSnapshot {
  return SERVER_SNAPSHOT
}

/**
 * Berlangganan perubahan state kekayaan. Hidrasi IndexedDB ditunda sampai ada
 * pelanggan PERTAMA (yaitu setelah hidrasi React) supaya HTML server tidak
 * pernah berbeda dari render pertama client — pola yang sama dengan
 * `subscribeMoneyStore`/`subscribeFundsStore`.
 */
export function subscribeWealthStore(listener: () => void): () => void {
  listeners.add(listener)
  void hydrateWealthStore()
  return () => {
    listeners.delete(listener)
  }
}

function emit(): void {
  for (const listener of listeners) listener()
}

function persist(snapshot: WealthState): void {
  saveDeviceState<PersistedWealth>(WEALTH_STATE_KEY, {
    version: WEALTH_STATE_VERSION,
    investments: snapshot.investments,
    debts: snapshot.debts,
    payments: snapshot.payments,
    removedIds: [...snapshot.removedIds],
    purged: accountPurged,
  })
}

function commit(next: WealthSnapshot): void {
  live = next
  persist(next)
  emit()
}

/* ── TOMBSTONE (paket 61) ────────────────────────────────────────────────────
   Satu tempat yang tahu arti "baris ini dihapus user", dipakai dua sisi:
   pintu tulis (menolak mengedit/melunasi baris yang sudah dihapus) dan
   selector (menyembunyikannya dari layar). Tanpa ini, "terhapus" akan punya
   dua definisi — dan yang kedua selalu lebih longgar dari yang pertama. */

/**
 * Kunci tombstone satu baris — WAJIB ber-prefix jenis.
 *
 * Alasannya bukan kerapian: id di dua daftar kekayaan BISA BERIMPIT. Data seed
 * memakai id '1'…'5' untuk investasi DAN hutang sekaligus, jadi tombstone
 * ber-id telanjang menyembunyikan baris yang salah: menghapus hutang '1' ikut
 * menghilangkan saham '1' dari portofolio — dan angka Net Worth langsung
 * berbeda dari kenyataan (tertangkap test paket 61 sebelum dirilis).
 */
function keyOf(kind: 'debt' | 'inv', id: string): string {
  return `${kind}:${id}`
}

function isRemoved(kind: 'debt' | 'inv', id: string): boolean {
  return live.removedIds.includes(keyOf(kind, id))
}

/** tandai satu baris terhapus (barisnya TETAP disimpan supaya Undo mungkin) */
function tombstone(key: string): void {
  if (live.removedIds.includes(key)) return
  commit({ ...live, removedIds: [...live.removedIds, key], hydrated: true })
}

/** cabut tombstone; `false` = kunci itu memang tidak sedang terhapus */
function untombstone(key: string): boolean {
  if (!live.removedIds.includes(key)) return false
  commit({
    ...live,
    removedIds: live.removedIds.filter((rowKey) => rowKey !== key),
    hydrated: true,
  })
  return true
}

/* ── ID SEBELUM HIDRASI (anti tabrakan) ──────────────────────────────────────
   Penulisan bisa terjadi SEBELUM IndexedDB selesai dibaca (store ini hidup di
   memory sejak render pertama). Kalau id-nya dihitung dari daftar seed — yang
   saat itu masih `INITIAL_DEBTS`/`INITIAL_INVESTMENTS` (id '1'…'5') — catatan
   baru bisa dapat id yang SUDAH dipakai data tersimpan user, dan saat hidrasi
   `mergeWealthState` harus memilih salah satu: data user hilang.

   Karena itu catatan yang lahir sebelum hidrasi memakai ruang nomor TINGGI
   (≥ 1.000.000) dengan awalan yang sudah dipakai halaman ini
   (`inv-`/`debt-`/`pay-`). Nomor data tersimpan selalu kecil & berurutan, jadi
   tabrakan menjadi mustahil tanpa perlu menebak isi IndexedDB. Setelah hidrasi,
   nomor kembali berurutan dari SELURUH daftar yang sudah tergabung — satu
   penomoran bersama untuk tiga daftar, supaya nomor yang sama tidak lahir dua
   kali di daftar berbeda. */
const PRE_HYDRATION_ID_BASE = 1_000_000
let nextPreHydrationId = PRE_HYDRATION_ID_BASE

/** nomor di ujung id (`inv-6` → 6); id tanpa angka dianggap paling awal */
function idSeqOf(id: string): number {
  const match = /(\d+)$/.exec(id)
  return match ? Number(match[1]) : 0
}

function nextSeq(): number {
  if (!hydratedOnce) return nextPreHydrationId++
  const ids = [
    ...live.investments.map((asset) => asset.id),
    ...live.debts.map((debt) => debt.id),
    ...live.payments.map((payment) => payment.id),
  ]
  return ids.reduce((max, id) => Math.max(max, idSeqOf(id)), 0) + 1
}

/** id catatan baru: `inv-12`, `debt-13`, `pay-14` (satu penomoran bersama) */
function idOf(prefix: 'inv' | 'debt' | 'pay', seq: number): string {
  return `${prefix}-${seq}`
}

/**
 * Gabungkan state tersimpan dengan yang sudah ada di memory. Fungsi murni
 * (`current` bisa dioper dari test) supaya jalur hidrasi bisa diuji tanpa
 * browser/IndexedDB — persis pola `mergeFundsState`/`mergeMoneySnapshot`.
 *
 * Aturan: daftar tersimpan jadi DASAR (itu yang benar-benar dimiliki user),
 * catatan yang dibuat SEBELUM hidrasi selesai tetap ikut (dedupe per id), dan
 * riwayat pembayaran digabung per id juga — sekali tercatat, tetap tercatat.
 */
export function mergeWealthState(
  persisted: PersistedWealth | null,
  current: WealthSnapshot = live,
): WealthSnapshot {
  const purged = persisted?.purged === true
  const known = persisted?.version === WEALTH_STATE_VERSION

  /** daftar dasar = tersimpan, data seed untuk kunjungan pertama, atau KOSONG
   *  kalau akun ini sudah dihapus user */
  const baseOf = <T extends { id: string }>(stored: T[] | undefined, seed: T[]): T[] =>
    stored !== undefined && stored.length > 0 ? stored : purged ? [] : seed

  /** Yang ikut dari MEMORY hanyalah catatan yang lahir di sesi ini — yaitu yang
   *  BUKAN data seed (saat hidrasi, memory masih berisi `SERVER_SNAPSHOT`) dan
   *  belum ada di daftar dasar. Tanpa penyaring "bukan seed", data contoh akan
   *  muncul kembali di akun yang sudah dihapus. */
  const extrasOf = <T extends { id: string }>(currentRows: T[], seed: T[], base: T[]): T[] =>
    currentRows.filter(
      (row) =>
        !seed.some((seedRow) => seedRow.id === row.id) && !base.some((baseRow) => baseRow.id === row.id),
    )

  const storedInvestments = known ? (persisted?.investments ?? []).filter((row) => row?.id) : []
  const baseInvestments = baseOf(storedInvestments, INITIAL_INVESTMENTS)
  const investments = [
    ...baseInvestments,
    ...extrasOf(current.investments, INITIAL_INVESTMENTS, baseInvestments),
  ]

  const storedDebts = known ? (persisted?.debts ?? []).filter((row) => row?.id) : []
  const baseDebts = baseOf(storedDebts, INITIAL_DEBTS)
  const debts = [...baseDebts, ...extrasOf(current.debts, INITIAL_DEBTS, baseDebts)]

  const storedPayments = known ? (persisted?.payments ?? []).filter((row) => row?.id) : []
  const basePayments = baseOf(storedPayments, INITIAL_DEBT_PAYMENTS)
  const payments = [
    ...basePayments,
    ...extrasOf(current.payments, INITIAL_DEBT_PAYMENTS, basePayments),
  ]

  /* TOMBSTONE digabung (union), bukan diambil dari satu sisi: hapus yang
     terjadi di PERANGKAT INI harus bertahan, dan hapus yang sudah tersimpan
     tidak boleh "hidup lagi" saat state dibaca ulang. Di-`Set` supaya satu id
     tidak pernah punya dua tombstone. */
  const storedRemoved = known ? (persisted?.removedIds ?? []).filter((id) => id) : []
  const removedIds = [...new Set([...storedRemoved, ...current.removedIds])]

  return { investments, debts, payments, removedIds, hydrated: true }
}

async function hydrateWealthStore(): Promise<void> {
  if (hydrateStarted) return
  hydrateStarted = true

  const persisted = await loadDeviceState<PersistedWealth>(WEALTH_STATE_KEY)
  accountPurged = persisted?.purged === true
  live = mergeWealthState(persisted)
  hydratedOnce = true
  emit()
}

/* ── API TULIS — SATU-SATUNYA JALUR MENULIS KEKAYAAN ─────────────────────────
   Komponen tidak boleh menyentuh `investments`/`debts`/`payments` langsung:
   `/wealth`, ekspor data, Pusat Bantuan, dan Tug-of-War Net Worth membaca state
   yang sama, jadi setiap perubahan harus lewat pintu yang juga menyimpan ke
   perangkat. `null` = input tidak sah → TIDAK ada yang ditulis. */

export interface NewInvestmentInput {
  type: AssetType
  name: string
  quantity: number
  /** harga per unit saat transaksi ini terjadi (bukan harga hari ini) */
  price: number
  /** biaya transaksi — ikut jadi modal (`totalInvested`), default 0 */
  fees?: number
  /** konteks uang yang sedang aktif (paket 47) */
  scope: BudgetScope
  /** stempel "Terakhir diperbarui"; default `WEALTH_NOW_ISO` (waktu dipatok repo) */
  stampISO?: string
}

/** catat posisi aset baru dari satu transaksi beli/jual */
export function addInvestment(input: NewInvestmentInput): Investment | null {
  const quantity = Number(input.quantity)
  const price = Number(input.price)
  const fees = Number(input.fees ?? 0)
  const name = input.name.trim()
  if (!name) return null
  if (!Number.isFinite(quantity) || !Number.isFinite(price) || !Number.isFinite(fees)) return null
  if (quantity <= 0 || price <= 0 || fees < 0) return null

  const asset: Investment = {
    id: idOf('inv', nextSeq()),
    type: input.type,
    name,
    /* ticker pendek dari nama (produksi: diisi user / datang dari broker) */
    symbol: name.slice(0, 6).toUpperCase(),
    quantity,
    avgBuyPrice: price,
    currentPrice: price,
    totalInvested: quantity * price + fees,
    currentValue: quantity * price,
    lastUpdate: input.stampISO ?? WEALTH_NOW_ISO,
    scope: input.scope,
  }
  commit({ ...live, investments: [asset, ...live.investments], hydrated: true })
  return asset
}

/**
 * Koreksi harga pasar SATU aset ("Update Manual", PRD 2E.1 poin 4).
 *
 * Ini satu-satunya jalur yang menyentuh `currentPrice`: stempel "Terakhir
 * diperbarui" harus selalu berasal dari tindakan nyata user, bukan dari
 * hitungan di layar (itu janji transparansi halaman ini). `null` = aset tidak
 * ada atau harga tidak sah → tidak ada yang ditulis.
 */
export function updateInvestmentPrice(id: string, price: number): Investment | null {
  const target = live.investments.find((asset) => asset.id === id)
  const next = Number(price)
  if (!target || isRemoved('inv', id) || !Number.isFinite(next) || next <= 0) return null

  const updated: Investment = {
    ...target,
    isStale: false,
    lastUpdate: WEALTH_NOW_ISO,
    currentPrice: next,
    currentValue: target.quantity * next,
  }
  commit({
    ...live,
    investments: live.investments.map((asset) => (asset.id === id ? updated : asset)),
    hydrated: true,
  })
  return updated
}

/** koreksi posisi aset (bentuknya sama dengan `InvestmentEditDraft` di sheet) */
export interface InvestmentEdit {
  type: AssetType
  name: string
  /** kode pasar/ticker: BBCA, BTC, RDPU, GOLD */
  symbol: string
  quantity: number
  /** harga rata-rata beli per unit — penentu modal (`totalInvested`) */
  avgBuyPrice: number
}

/**
 * Betulkan identitas, jumlah, dan harga rata-rata beli sebuah aset.
 * Harga PASAR tidak disentuh di sini — jalurnya `updateInvestmentPrice`
 * ("Update Manual"), supaya satu stempel waktu hanya punya satu pemilik.
 */
export function editInvestment(id: string, patch: InvestmentEdit): Investment | null {
  const target = live.investments.find((asset) => asset.id === id)
  /* baris yang sudah dihapus TIDAK bisa diedit: kalau boleh, user bisa
     membetulkan catatan yang tidak lagi ada di layar, dan angka Net Worth
     berubah dari balik tombstone. */
  if (!target || isRemoved('inv', id)) return null
  const name = patch.name.trim()
  const quantity = Number(patch.quantity)
  const avgBuyPrice = Number(patch.avgBuyPrice)
  if (!name || !Number.isFinite(quantity) || !Number.isFinite(avgBuyPrice)) return null
  if (quantity <= 0 || avgBuyPrice <= 0) return null

  const updated: Investment = {
    ...target,
    type: patch.type,
    name,
    symbol: patch.symbol.trim().toUpperCase() || name.slice(0, 6).toUpperCase(),
    quantity,
    avgBuyPrice,
    totalInvested: quantity * avgBuyPrice,
    currentValue: quantity * target.currentPrice,
  }
  commit({
    ...live,
    investments: live.investments.map((asset) => (asset.id === id ? updated : asset)),
    hydrated: true,
  })
  return updated
}

/**
 * Keluarkan satu aset dari portofolio user (paket 61).
 *
 * Sejak paket 61 ini TOMBSTONE, bukan `filter()`: barisnya tetap disimpan di
 * state perangkat (dan di IndexedDB) selama jendela Undo hidup, sehingga
 * "Hapus" di halaman Kekayaan bisa benar-benar dibatalkan — bukan cuma
 * dijanjikan. Efek yang sama seperti `deleteBill()` di
 * `lib/money/bills-store.ts`.
 *
 * `false` = id-nya tidak ada ATAU sudah terhapus → tidak ada yang ditulis.
 */
export function deleteInvestment(id: string): boolean {
  if (!live.investments.some((asset) => asset.id === id) || isRemoved('inv', id)) return false
  tombstone(keyOf('inv', id))
  return true
}

/**
 * Cabut tombstone satu aset (jalur Undo). `null` = tidak ada yang dikembalikan:
 * asetnya memang tidak ada, atau tidak sedang dalam keadaan terhapus (mis. Undo
 * yang datang setelah jendelanya tutup) — dua-duanya harus gagal dengan jujur,
 * bukan diam-diam "berhasil".
 */
export function restoreInvestment(id: string): Investment | null {
  if (!live.investments.some((asset) => asset.id === id)) return null
  if (!untombstone(keyOf('inv', id))) return null
  return live.investments.find((asset) => asset.id === id) ?? null
}

/* ── HUTANG & PIUTANG ────────────────────────────────────────────────────────
   Satu catatan untuk dua arah: `owed_by_me` (hutangku) & `owed_to_me`
   (piutangku). Yang membedakan hanya arah uangnya, dan itu ditentukan
   `cashDirectionOf()` — bukan ditulis ulang di sini. */

/** bentuk yang dikirim sheet Tambah Utang/Piutang (sama dengan `NewDebtInput`
 *  di `add-debt-sheet.tsx`, ditambah konteks uang yang sedang aktif) */
export interface NewDebtRecord {
  type: DebtType
  direction?: DebtDirection
  counterparty?: string
  provider?: string
  principal: number
  /** sisa awal; default = pokok (catatan baru belum pernah dibayar) */
  remaining?: number
  notes?: string
  /* — khusus platform — */
  tenor?: number
  currentMonth?: number
  monthlyInstallment?: number
  interestRate?: number
  dueDate?: number
  /** konteks uang yang sedang aktif (paket 47) */
  scope: BudgetScope
}

/** catat hutang/piutang baru; `null` = pokok tidak sah (tidak ada yang ditulis) */
export function addDebt(input: NewDebtRecord): Debt | null {
  const principal = Number(input.principal)
  const remaining = Number(input.remaining ?? input.principal)
  if (!Number.isFinite(principal) || principal <= 0) return null
  if (!Number.isFinite(remaining) || remaining < 0) return null

  const debt: Debt = {
    id: idOf('debt', nextSeq()),
    type: input.type,
    direction: input.direction,
    counterparty: input.counterparty,
    provider: input.provider,
    principal,
    remaining,
    notes: input.notes,
    status: 'active',
    tenor: input.tenor,
    currentMonth: input.currentMonth,
    monthlyInstallment: input.monthlyInstallment,
    interestRate: input.interestRate,
    dueDate: input.dueDate,
    scope: input.scope,
  }
  commit({ ...live, debts: [debt, ...live.debts], hydrated: true })
  return debt
}

/** perubahan yang boleh ditulis ke satu catatan hutang/piutang (id TIDAK boleh) */
export type DebtPatch = Partial<Omit<Debt, 'id'>>

/**
 * Betulkan satu catatan hutang/piutang (nama, pokok, catatan, tenor, konteks…).
 *
 * `remaining` ikut boleh dibetulkan karena catatan ini diisi MANUAL: kalau user
 * salah mengetik sisa hutangnya, cara yang jujur adalah membetulkannya — bukan
 * menyuruhnya membuat catatan baru. Pelunasan tetap lewat `settleDebt()` supaya
 * selalu ada baris kasnya. `null` = id tidak ada atau nilainya tidak sah.
 */
export function editDebt(id: string, patch: DebtPatch): Debt | null {
  const target = live.debts.find((debt) => debt.id === id)
  /* sama seperti `editInvestment`: catatan yang sudah dihapus tidak bisa
     dibetulkan dari balik tombstone */
  if (!target || isRemoved('debt', id)) return null
  const principal = patch.principal ?? target.principal
  const remaining = patch.remaining ?? target.remaining
  if (!Number.isFinite(principal) || principal <= 0) return null
  if (!Number.isFinite(remaining) || remaining < 0) return null

  const updated: Debt = {
    ...target,
    ...patch,
    id: target.id,
    principal,
    remaining,
    /* status diturunkan dari sisa — satu tempat, bukan diketik dua kali */
    status:
      patch.status ?? (remaining === 0 ? 'settled' : target.status === 'settled' ? 'active' : target.status),
  }
  commit({
    ...live,
    debts: live.debts.map((debt) => (debt.id === id ? updated : debt)),
    hydrated: true,
  })
  return updated
}

/**
 * Hapus satu catatan hutang/piutang (paket 61: TOMBSTONE + Undo).
 *
 * Baris kasnya (`/history`) SENGAJA tidak dihapus — dan sejak paket 61 itu
 * berlaku dua kali lipat: uang yang sudah berpindah tangan itu fakta, jadi
 * baris `debt_payment`/`receivable_payment`-nya tidak ikut hilang walau
 * catatannya dihapus. Yang disembunyikan hanyalah catatannya sendiri (dan
 * riwayat pembayaran yang menempel padanya, lewat `paymentsOf()`) — supaya
 * Undo bisa mengembalikan keduanya utuh.
 *
 * `false` = id tidak ada atau sudah terhapus (tidak ada yang ditulis).
 */
export function deleteDebt(id: string): boolean {
  if (!live.debts.some((debt) => debt.id === id) || isRemoved('debt', id)) return false
  tombstone(keyOf('debt', id))
  return true
}

/** cabut tombstone satu catatan hutang/piutang (jalur Undo); `null` = gagal jujur */
export function restoreDebt(id: string): Debt | null {
  if (!live.debts.some((debt) => debt.id === id)) return null
  if (!untombstone(keyOf('debt', id))) return null
  return live.debts.find((debt) => debt.id === id) ?? null
}

/* ── PELUNASAN HUTANG/PIUTANG: KAS + CATATAN DALAM SATU TULISAN ──────────────
   Sejak paket 41 "Catat Bayar" MENGGERAKKAN KAS. Fungsi di bawah adalah
   penggabungan lengkapnya: baris kas (`postDebtSettlement`), sisa & status
   catatan (`applySettlement`), riwayat `debt_payments`, dan catatan kembalian.
   Sebelum paket 50 rangkaian itu hidup di dalam halaman `/wealth` — artinya
   pelunasan tidak pernah tersimpan di luar halaman itu. */

export interface SettleDebtInput {
  /** id catatan hutang/piutang di domain Kekayaan */
  debtId: string
  /** dompet yang benar-benar menyentuh uang (sumber saat bayar, tujuan saat terima) */
  walletId: string
  /** nominal yang benar-benar diserahkan/diterima user (boleh lebih → kembalian) */
  paidAmount: number
  /** tanggal lokal `YYYY-MM-DD` — form hanya bertanya tanggal, bukan jam */
  dateISO?: string
  /** kunci idempotensi dari pemanggil (opsional; default dihitung dari aksinya) */
  clientTxId?: string
}

export interface SettleDebtResult {
  /** catatan hutang SETELAH pelunasan (sisa & status sudah final) */
  debt: Debt
  /** baris `debt_payments` yang ikut tercatat */
  payment: DebtPayment
  /** hasil jalur KAS: baris ledger + saldo dompet setelahnya */
  settlement: DebtSettlementResult
  /** catatan kembalian dari lebih-bayar (`null` kalau uangnya pas) */
  changeDebt: Debt | null
}

/**
 * Satu pintu untuk "Catat Bayar" (hutang) & "Diterima" (piutang). Urutannya
 * penting dan sengaja:
 *
 *   1. permintaan & nominalnya diperiksa dulu (`planDebtSettlement`, fungsi
 *      murni): tidak sah / sudah lunas → berhenti tanpa menulis apa pun;
 *   2. baris KAS ditulis lewat `postDebtSettlement()` (`lib/money/store.ts`),
 *      jalur yang sama dengan semua uang lain di app (penjaga invariant);
 *   3. baru catatan hutangnya berubah: sisa, status, progres tenor, riwayat
 *      `debt_payments`, dan catatan kembalian kalau ada lebih bayar.
 *
 * `null` = ditolak (catatan tidak ada, nominal tidak sah, dompet asing, saldo
 * dompet kurang, atau aksi ini sudah pernah tercatat) → TIDAK ada satu pun
 * bagian yang ditulis. Karena pelunasan selalu meninggalkan baris kas, Net Worth
 * tidak pernah naik hanya karena user melunasi hutangnya (aturan laporan 41).
 */
export function settleDebt(input: SettleDebtInput): SettleDebtResult | null {
  const debt = live.debts.find((row) => row.id === input.debtId)
  if (!debt || isRemoved('debt', input.debtId)) return null

  const direction = cashDirectionOf(debt)
  const counterparty = settlementCounterparty(debt)
  const dateISO = input.dateISO || WEALTH_TODAY_ISO

  /* Permintaannya sah? Nominal tidak sah / catatan sudah lunas → berhenti di sini,
     sebelum satu pun bagian ditulis. Perencana ini fungsi MURNI, jadi memanggilnya
     untuk memeriksa tidak mengubah apa pun. */
  if (
    !planDebtSettlement({
      direction,
      owedAmount: debt.remaining,
      paidAmount: input.paidAmount,
      counterparty,
    })
  ) {
    return null
  }

  /* KUNCI IDEMPOTENSI — dibentuk dari AKSINYA (catatan, arah, tanggal, dan
     nominal yang diserahkan), bukan dari keadaan yang sedang berubah. Tanpa ini,
     submit ulang / double-tap menulis pembayaran kedua: sisi kasnya idempoten
     (baris lama yang dikembalikan) sementara catatan hutangnya berkurang DUA
     KALI untuk satu pembayaran — klaim palsu yang dilarang kanon "jujur di
     setiap klaim" (PRD 244). Pembayaran lain (nominal/tanggal berbeda) tetap
     bisa dicatat: kuncinya berbeda. */
  const clientTxId =
    input.clientTxId ?? `debt-${debt.id}-${direction}-${dateISO}-${Math.round(Number(input.paidAmount))}`
  /* Kalau aksinya sudah pernah ditulis, berhenti di sini. */
  if (rowForClientTxId(getMoneySnapshot(), clientTxId)) return null

  const settlement = postDebtSettlement({
    debtId: debt.id,
    direction,
    walletId: input.walletId,
    owedAmount: debt.remaining,
    paidAmount: input.paidAmount,
    counterparty,
    dateISO,
    clientTxId,
  })
  if (!settlement) return null

  /* satu nomor untuk satu commit: catatan kembalian & baris riwayat tidak boleh
     lahir dari nomor yang sama di dua daftar */
  const seq = nextSeq()

  /* Catatan kembalian (lebih bayar) lahir sebagai catatan personal baru dengan
     arah DIBALIK dan konteks yang diwarisi dari hutangnya — lihat
     `lib/data/wealth-cash.ts`. Tanpa catatan ini, kelebihan bayar menaikkan
     Net Worth tanpa dasar. */
  const changeDebt = changeDebtFrom(settlement.plan, idOf('debt', seq), debt.scope)

  const updated: Debt = {
    ...applySettlement(debt, settlement.plan),
    /* progres tenor ikut naik untuk hutang platform (di produksi: kolom
       `current_month`), dibatasi `tenor` supaya tidak pernah melewatinya */
    ...(debt.type === 'platform'
      ? { currentMonth: Math.min((debt.currentMonth ?? 1) + 1, debt.tenor ?? 99) }
      : {}),
  }

  const payment: DebtPayment = {
    id: idOf('pay', seq),
    debtId: debt.id,
    /* `amount` = nominal yang benar-benar menghapus kewajiban; uang yang
       berpindah tangan (`cashMoved`) ikut disimpan supaya kembaliannya tidak
       hilang dari riwayat */
    amount: settlement.plan.settledAmount,
    paidAtISO: dateISO,
    walletName: settlement.walletName,
    walletId: settlement.walletId,
    kind: direction === 'in' ? 'receivable' : 'debt',
    cashMoved: settlement.plan.cashMoved,
    ...(settlement.plan.changeAmount > 0 ? { changeAmount: settlement.plan.changeAmount } : {}),
  }

  const debts = live.debts.map((row) => (row.id === debt.id ? updated : row))
  commit({
    ...live,
    debts: changeDebt ? [changeDebt, ...debts] : debts,
    payments: [payment, ...live.payments],
    hydrated: true,
  })

  return { debt: updated, payment, settlement, changeDebt }
}

/* ── HAPUS AKUN, HOOK, & SELECTOR ────────────────────────────────────────────
   Dipanggil `lib/account.ts` SETELAH IndexedDB dihapus. Tugasnya sama dengan
   `purgeMoneyStore()`/`purgeFundsStore()`: membuat state di memory benar-benar
   kosong dan menandainya "purged", supaya refresh berikutnya tidak menghidupkan
   lagi data contoh (hutang Kredivo, saham BBCA, …) seolah-olah milik user. */
export function purgeWealthStore(): WealthSnapshot {
  accountPurged = true
  live = EMPTY_SNAPSHOT
  persist(live)
  emit()
  return live
}

/** snapshot store kekayaan untuk komponen client */
export function useWealthStore(): WealthSnapshot {
  return useSyncExternalStore(subscribeWealthStore, getWealthSnapshot, getServerWealthSnapshot)
}

/* ── SELECTOR — SEMUA PEMBACA LEWAT SINI (paket 61) ──────────────────────────
   Empat pembaca daftar kekayaan (`/wealth`, ekspor `/settings/data`, Pusat
   Bantuan, dan Net Worth) tidak boleh menyaring tombstone sendiri-sendiri: satu
   tempat lupa menyaring = satu angka yang berbeda dari tempat lain. Karena itu
   daftar "yang benar-benar dimiliki user" disediakan di sini, dengan nama yang
   sama seperti `liveBills()` di `lib/money/bills-store.ts`. */

/** aset yang benar-benar dimiliki user (yang dihapus disaring tombstone) */
export function liveInvestments(snapshot: WealthSnapshot): Investment[] {
  return snapshot.investments.filter(
    (asset) => !snapshot.removedIds.includes(keyOf('inv', asset.id)),
  )
}

/** hutang/piutang yang benar-benar dimiliki user (yang dihapus disaring tombstone) */
export function liveDebts(snapshot: WealthSnapshot): Debt[] {
  return snapshot.debts.filter((debt) => !snapshot.removedIds.includes(keyOf('debt', debt.id)))
}

/** satu aset dari id — `null` = belum ada ATAU sudah dihapus user */
export function investmentById(snapshot: WealthSnapshot, id: string): Investment | null {
  if (snapshot.removedIds.includes(keyOf('inv', id))) return null
  return snapshot.investments.find((asset) => asset.id === id) ?? null
}

/** satu catatan hutang/piutang dari id — `null` = belum ada ATAU sudah dihapus user */
export function debtById(snapshot: WealthSnapshot, id: string): Debt | null {
  if (snapshot.removedIds.includes(keyOf('debt', id))) return null
  return snapshot.debts.find((debt) => debt.id === id) ?? null
}

/** riwayat pembayaran satu hutang, terbaru dulu (aturan urut di `lib/data/wealth.ts`) */
export function paymentsOf(snapshot: WealthSnapshot, debtId: string): DebtPayment[] {
  /* catatan yang dihapus tidak punya riwayat di layar (kontrak lama paket 50:
     riwayat ikut hilang bersama catatannya) — tapi barisnya tetap DISIMPAN,
     jadi Undo mengembalikan catatan + riwayatnya utuh. */
  if (snapshot.removedIds.includes(keyOf('debt', debtId))) return []
  return paymentsOfDebt([...snapshot.payments], debtId)
}

/**
 * Kosongkan store ke kondisi seed (dipakai test supaya tiap kasus mulai bersih).
 * Tidak pernah dipanggil UI: di produksi "reset" tidak punya arti — yang ada
 * cuma `purgeWealthStore()` saat user menghapus akunnya.
 */
export function resetWealthStore(): void {
  live = SERVER_SNAPSHOT
  accountPurged = false
  hydrateStarted = false
  hydratedOnce = false
  nextPreHydrationId = PRE_HYDRATION_ID_BASE
  emit()
}
