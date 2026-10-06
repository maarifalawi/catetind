'use client'

import { useMemo, useSyncExternalStore } from 'react'
import {
  FUND_CONTRIBUTIONS,
  INITIAL_SINKING_FUNDS,
  TODAY_ISO,
  fundContributions,
  plantStageFrom,
  type BudgetScope,
  type FundContribution,
  type GoalPriority,
  type SinkingFundItem,
} from '@/lib/data/budget'
import { FUNDS_STATE_KEY, loadDeviceState, saveDeviceState } from './idb'
import { getMoneySnapshot, postTransaction, walletNameOfId } from './store'
import {
  deleteRemoteFund,
  pushContributionToServer,
  pushFundToServer,
  readRemoteFunds,
  type RemoteFunds,
} from '@/lib/supabase/funds-remote'
import { randomUuid } from '@/lib/supabase/uuid'

/* ── SATU STORE CELENGAN (paket 46) ─────────────────────────────────────────
   Temuan uji pemakaian: "Tabungan Impian" di Dashboard tidak sinkron dengan
   halaman lain. Sebelum paket ini ada TIGA sumber angka untuk celengan yang
   sama, dan ketiganya hidup sendiri-sendiri:

     1. kartu "Tabungan Impian" + widget Tanamanmu di Home → `heroFundOf()` /
        `sortFundsByUrgency()` yang membaca `INITIAL_SINKING_FUNDS` (konstanta);
     2. halaman /budget → `useState(INITIAL_SINKING_FUNDS)` milik BudgetScreen;
     3. halaman /budget/<id> → `fund` + `history` di `useState` GoalDetailScreen.

   Akibatnya: celengan yang ditanam di /budget tidak muncul di Home, setoran di
   halaman detail tidak mengubah apa pun di /budget maupun Home, dan
   "Terkumpul" bisa berbeda antar layar. Itu persis pola yang dilarang kanon
   "jujur di setiap klaim" (PRD 244).

   Sekarang ketiganya membaca SATU state modul ini — pola yang sama dengan
   `lib/money/store.ts` (dompet + baris ledger):

     · `funds`         — daftar celengan (target, terkumpul, tahap tanaman,
                         konteks uang, status setor bulan ini);
     · `contributions` — riwayat setoran, sumber yang sama dengan baris
                         "Riwayat Setoran" di /budget/<id>;
     · `hydrated`      — false sampai IndexedDB selesai dibaca, supaya HTML
                         server & render pertama client identik (tidak ada
                         hydration mismatch).

   PAKET 60 menambah satu bagian state: `removedIds` — TOMBSTONE celengan yang
   dihapus user. Barisnya SENGAJA tidak dibuang (pola `deleteBill()`), karena
   Undo harus memulihkan target & progresnya apa adanya dan riwayat setoran yang
   menunjuk `fundId`-nya tidak boleh jadi yatim. Semua pembaca tampilan karena itu
   memakai `liveFunds()`/`useLiveFunds()`, bukan `snapshot.funds` mentah.

   BATAS JUJUR (sama dengan store uang): state-nya hidup di memory modul dan
   ditulis ke IndexedDB (`lib/money/idb.ts`, key `funds`) supaya bertahan saat
   refresh. TIDAK ada sinkronisasi antar-perangkat. Di produksi tiap penulisan
   jadi `insert` ke `sinking_funds` / `sinking_fund_contributions` (tabelnya
   sudah ada + RLS), lalu halaman membacanya dari server — karena itu bentuk
   state di sini sengaja JSON polos yang siap dikirim HTTP. */

/** bentuk yang ditulis ke IndexedDB — JSON polos, siap HTTP */
export interface PersistedFunds {
  /** versi bentuk data; bentuk lama/asing diperlakukan sebagai "belum ada" */
  version?: number
  funds?: SinkingFundItem[]
  contributions?: FundContribution[]
  /**
   * TOMBSTONE celengan yang dihapus user (paket 60) — pola yang persis sama
   * dengan `removedIds` di `lib/money/bills-store.ts` & `wealth-store.ts`.
   *
   * Barisnya TIDAK dibuang dari `funds` karena tiga hal bergantung padanya:
   *   · Undo hapus (jendela 5 detik) harus memulihkan target, progres, dan
   *     posisinya seperti semula;
   *   · riwayat setoran (`contributions`) menunjuk `fundId` yang sama — kalau
   *     barisnya dibuang, riwayat uang yang sudah keluar jadi yatim;
   *   · halaman /budget/<id> yang masih terbuka harus tahu bedanya "dihapus"
   *     dan "belum pernah ada", bukan menampilkan celengan hantu.
   */
  removedIds?: number[]
  /** true = akun ini sudah dihapus user → jangan isi ulang celengan contoh */
  purged?: boolean
}

export interface FundsState {
  funds: SinkingFundItem[]
  contributions: FundContribution[]
  /** id celengan yang dihapus user (tombstone) — lihat `PersistedFunds.removedIds` */
  removedIds: number[]
}

export interface FundsSnapshot extends FundsState {
  /** false sampai hidrasi IndexedDB selesai (batas render server ↔ client) */
  hydrated: boolean
}

/** versi bentuk state di perangkat — naikkan kalau bentuknya berubah */
const FUNDS_STATE_VERSION = 1

/* ── STATE AWAL SELALU KOSONG (paket 65 · Tugas A) ────────────────────────────
   Celengan & riwayat setoran CONTOH TIDAK LAGI di-inject sebagai state awal.
   Akun demo diisi lewat `seedDemoDataOnce()` yang menulis baris sungguhan.
   `SEED_*` di bawah tinggal jadi BAHAN test & bahan bootstrap demo. */
const SEED_FUNDS: SinkingFundItem[] = INITIAL_SINKING_FUNDS
const SEED_CONTRIBUTIONS: FundContribution[] = FUND_CONTRIBUTIONS

/** snapshot untuk render server & hidrasi — SELALU KOSONG sampai user mengisi */
const SERVER_SNAPSHOT: FundsSnapshot = Object.freeze({
  funds: [] as SinkingFundItem[],
  contributions: [] as FundContribution[],
  removedIds: [] as number[],
  hydrated: false,
})

/** snapshot seed — BAHAN test (`resetFundsStore()`), bukan state awal runtime */
const SEED_SNAPSHOT: FundsSnapshot = Object.freeze({
  funds: SEED_FUNDS,
  contributions: SEED_CONTRIBUTIONS,
  removedIds: [] as number[],
  hydrated: false,
})

/** snapshot kosong — keadaan setelah user MENGHAPUS AKUN-nya (pola store uang) */
const EMPTY_SNAPSHOT: FundsSnapshot = Object.freeze({
  funds: [],
  contributions: [],
  /* tombstone ikut dikosongkan: inilah "purge dari IndexedDB" milik alur Hapus
     Akun — baris celengan yang sudah dihapus user baru-benar-benar dibuang dari
     perangkat saat itu, bersama seluruh state lain (`lib/account.ts`) */
  removedIds: [],
  hydrated: true,
})

let live: FundsSnapshot = SERVER_SNAPSHOT
let accountPurged = false
let hydrateStarted = false
const listeners = new Set<() => void>()

export function getFundsSnapshot(): FundsSnapshot {
  return live
}

export function getServerFundsSnapshot(): FundsSnapshot {
  return SERVER_SNAPSHOT
}

/**
 * Berlangganan perubahan state celengan. Hidrasi IndexedDB ditunda sampai ada
 * pelanggan PERTAMA (yaitu setelah hidrasi React) supaya HTML server tidak
 * pernah berbeda dari render pertama client — pola yang sama dengan
 * `subscribeMoneyStore`.
 */
export function subscribeFundsStore(listener: () => void): () => void {
  listeners.add(listener)
  void hydrateFundsStore()
  return () => {
    listeners.delete(listener)
  }
}

function emit(): void {
  for (const listener of listeners) listener()
}

function persist(snapshot: FundsState): void {
  saveDeviceState<PersistedFunds>(FUNDS_STATE_KEY, {
    version: FUNDS_STATE_VERSION,
    funds: snapshot.funds,
    contributions: snapshot.contributions,
    /* tombstone ikut disimpan: tanpa itu, celengan yang dihapus user hidup lagi
       setelah refresh (`mergeFundsState` membaca daftar tersimpan apa adanya) */
    removedIds: snapshot.removedIds,
    purged: accountPurged,
  })
}

function commit(next: FundsSnapshot): void {
  /* penjaga bentuk: `removedIds` SELALU ada di state hidup. Sebelum paket 60
     satu jalur tulis (`contributeToFund`) membangun snapshot-nya sendiri tanpa
     menyebar `live` — dengan penjaga ini, jalur seperti itu tidak bisa lagi
     membuat `removedIds` menghilang jadi `undefined`. */
  live = { ...next, removedIds: next.removedIds ?? [] }
  persist(live)
  emit()
}

/** id berikutnya untuk satu daftar ber-`id` number (celengan & setoran) */
function nextId(rows: readonly { id: number }[]): number {
  return rows.reduce((max, row) => (row.id > max ? row.id : max), 0) + 1
}

/* ── ID SEBELUM HIDRASI (anti tabrakan) ──────────────────────────────────────
   Penulisan bisa terjadi SEBELUM IndexedDB selesai dibaca (store ini hidup di
   memory sejak render pertama). Kalau id-nya dihitung dari daftar seed — yang
   saat itu isinya masih `INITIAL_SINKING_FUNDS` (id 1–3) — celengan baru bisa
   dapat id yang SUDAH dipakai celengan tersimpan user, dan saat hidrasi
   `mergeFundsState` harus memilih salah satu: data user hilang.

   Karena itu celengan & setoran yang lahir sebelum hidrasi memakai ruang id
   TINGGI (≥ 1.000.000). Id tersimpan selalu kecil & berurutan, jadi tabrakan
   menjadi mustahil tanpa perlu menebak isi IndexedDB. Setelah hidrasi, id
   kembali berurutan dari daftar yang sudah tergabung. */
const PRE_HYDRATION_ID_BASE = 1_000_000
let nextPreHydrationId = PRE_HYDRATION_ID_BASE
let hydratedOnce = false

function nextFundId(): number {
  if (!hydratedOnce) return nextPreHydrationId++
  return nextId(live.funds)
}

function nextContributionId(): number {
  if (!hydratedOnce) return nextPreHydrationId++
  return nextId(live.contributions)
}

/**
 * Gabungkan state tersimpan dengan yang sudah ada di memory. Fungsi murni
 * (`current` bisa dioper dari test) supaya jalur hidrasi bisa diuji tanpa
 * browser/IndexedDB — persis pola `mergeMoneySnapshot`.
 *
 * Aturan: daftar tersimpan jadi DASAR (itu yang benar-benar dimiliki user),
 * celengan yang ditanam SEBELUM hidrasi selesai tetap ikut (dedupe per id), dan
 * riwayat setoran digabung per id juga — sekali tercatat, tetap tercatat.
 */
export function mergeFundsState(
  persisted: PersistedFunds | null,
  current: FundsSnapshot = live,
): FundsSnapshot {
  const purged = persisted?.purged === true
  const known = persisted?.version === FUNDS_STATE_VERSION
  const storedFunds = known ? (persisted?.funds ?? []).filter((fund) => fund?.id) : []
  /* daftar dasar = HANYA yang tersimpan (kunjungan pertama = KOSONG, paket 65) */
  const base = storedFunds
  /* Yang ikut dari MEMORY hanyalah celengan yang lahir di sesi ini — atau, untuk
     KUNJUNGAN PERTAMA, celengan seed yang sedang hidup di state test. Tanpa
     penyaring "bukan seed" (saat bukan kunjungan pertama), celengan contoh akan
     muncul kembali di akun yang sudah dihapus, dan daftar tersimpan user bisa
     tercampur data contoh. */
  const firstVisit = !purged && storedFunds.length === 0
  const extras = current.funds.filter(
    (fund) =>
      (firstVisit || !SEED_FUNDS.some((seed) => seed.id === fund.id)) &&
      !base.some((knownFund) => knownFund.id === fund.id),
  )
  const funds = [...base, ...extras]

  const storedContributions = known ? (persisted?.contributions ?? []).filter((row) => row?.id) : []
  /* kunjungan pertama → riwayat setoran seed, sama seperti daftar celengan di atas */
  const baseContributions = storedContributions
  const firstVisitContrib = !purged && storedContributions.length === 0
  /* aturan yang sama untuk riwayat setoran: sekali tercatat, tetap tercatat */
  const extraContributions = current.contributions.filter(
    (row) =>
      (firstVisitContrib || !SEED_CONTRIBUTIONS.some((seed) => seed.id === row.id)) &&
      !baseContributions.some((knownRow) => knownRow.id === row.id),
  )
  const contributions = [...baseContributions, ...extraContributions]

  /* TOMBSTONE digabung, bukan dipilih salah satu: hapus di satu sesi dan hapus
     di sesi/perangkat lain sama-sama harus tetap terhapus (persis aturan
     `mergeBillsState`). Daftar kosong juga artinya "tidak ada yang dihapus". */
  const removedIds = Array.from(
    new Set([...current.removedIds, ...(known ? (persisted?.removedIds ?? []).filter((id) => id) : [])]),
  )

  return { funds, contributions, removedIds, hydrated: true }
}

/* ── GABUNG SERVER + PERANGKAT (paket 64 · Paket D) ──────────────────────────
   Saat ada sesi Supabase, SERVER yang jadi sumber celengan & riwayat setoran.
   Fungsi murni ini (bisa diuji tanpa jaringan) menggabungkannya dengan antrean
   lokal: baris server jadi DASAR, baris lokal yang belum terkirim tetap ikut
   (antrean offline), dan `priority`/`scope` (tak ada di server) dipertahankan
   dari versi lokal. */
export function mergeWithRemoteFunds(
  remote: RemoteFunds,
  current: FundsSnapshot = live,
  persisted: PersistedFunds | null = null,
): FundsSnapshot {
  const localById = new Map<number, SinkingFundItem>()
  const localByRemote = new Map<string, SinkingFundItem>()
  for (const row of [...(persisted?.funds ?? []), ...current.funds]) {
    if (row?.id === undefined) continue
    if (!localById.has(row.id)) localById.set(row.id, row)
    if (row.remoteId && !localByRemote.has(row.remoteId)) localByRemote.set(row.remoteId, row)
  }

  const base = remote.funds.map((row) => {
    const local =
      (row.remoteId ? localByRemote.get(row.remoteId) : undefined) ?? localById.get(row.id)
    if (!local) return row
    return {
      ...row,
      id: local.id,
      priority: local.priority,
      scope: local.scope,
      deadline: local.deadline || row.deadline,
      remoteId: row.remoteId,
    }
  })

  const remoteIds = new Set(remote.funds.map((row) => row.remoteId ?? ''))
  const baseIds = new Set(base.map((row) => row.id))
  const extras = [...localById.values()].filter(
    (row) =>
      !SEED_FUNDS.some((seed) => seed.id === row.id) &&
      !baseIds.has(row.id) &&
      !(row.remoteId && remoteIds.has(row.remoteId)),
  )
  const seenFund = new Set<number>()
  const funds: SinkingFundItem[] = []
  for (const row of [...base, ...extras]) {
    if (seenFund.has(row.id)) continue
    seenFund.add(row.id)
    funds.push(row)
  }

  const remoteContribIds = new Set(remote.contributions.map((row) => row.id))
  const extraContribs = current.contributions.filter(
    (row) => !remoteContribIds.has(row.id) && !SEED_CONTRIBUTIONS.some((seed) => seed.id === row.id),
  )
  const seenContrib = new Set<number>()
  const contributions: FundContribution[] = []
  for (const row of [...remote.contributions, ...extraContribs]) {
    if (seenContrib.has(row.id)) continue
    seenContrib.add(row.id)
    contributions.push(row)
  }

  const removedIds = Array.from(new Set([...current.removedIds, ...(persisted?.removedIds ?? [])]))
  return { funds, contributions, removedIds, hydrated: true }
}

/** pastikan satu celengan ada di server (buat uuid kalau belum punya `remoteId`) */
async function ensureFundOnServer(fundId: number): Promise<boolean> {
  const fund = live.funds.find((row) => row.id === fundId)
  if (!fund) return false
  const remoteId = fund.remoteId ?? randomUuid()
  if (!(await pushFundToServer(fund, remoteId))) return false
  if (fund.remoteId !== remoteId) {
    live = {
      ...live,
      funds: live.funds.map((row) => (row.id === fundId ? { ...row, remoteId } : row)),
    }
    persist(live)
    emit()
  }
  return true
}

/** pastikan satu setoran ada di server (butuh uuid celengan induknya lebih dulu) */
async function ensureContributionOnServer(contributionId: number): Promise<boolean> {
  const contribution = live.contributions.find((row) => row.id === contributionId)
  if (!contribution) return false
  const goal = live.funds.find((row) => row.id === contribution.fundId)
  if (!goal?.remoteId) return false
  const remoteId = contribution.remoteId ?? randomUuid()
  if (!(await pushContributionToServer(contribution, goal.remoteId, remoteId))) return false
  if (contribution.remoteId !== remoteId) {
    live = {
      ...live,
      contributions: live.contributions.map((row) =>
        row.id === contributionId ? { ...row, remoteId } : row,
      ),
    }
    persist(live)
    emit()
  }
  return true
}

async function hydrateFundsStore(): Promise<void> {
  if (hydrateStarted) return
  hydrateStarted = true

  const persisted = await loadDeviceState<PersistedFunds>(FUNDS_STATE_KEY)
  accountPurged = persisted?.purged === true
  live = mergeFundsState(persisted)
  hydratedOnce = true
  emit()

  if (accountPurged) return
  /* SERVER jadi sumber saat ada sesi; `null` = tanpa sesi → tetap jalur lokal */
  const remote = await readRemoteFunds()
  if (!remote) return
  live = mergeWithRemoteFunds(remote, live, persisted)
  persist(live)
  emit()
  for (const fund of live.funds) if (!fund.remoteId) await ensureFundOnServer(fund.id)
  for (const row of live.contributions) if (!row.remoteId) await ensureContributionOnServer(row.id)
}

/* ── API TULIS — satu-satunya jalur menulis celengan ─────────────────────────
   Komponen tidak boleh menyentuh `funds`/`contributions` langsung: Home,
   /budget, dan /budget/<id> membaca state yang sama, jadi perubahan harus lewat
   pintu yang juga menulis riwayat setoran + menyimpan ke perangkat. */

export interface NewFundInput {
  name: string
  target: number
  /** tanggal lokal `YYYY-MM-DD` */
  deadline: string
  priority: GoalPriority
  scope: BudgetScope
}

/** tanam celengan baru — selalu mulai dari nol & tahap benih (PRD 2C.3) */
export function addFund(input: NewFundInput): SinkingFundItem {
  const fund: SinkingFundItem = {
    id: nextFundId(),
    name: input.name,
    target: input.target,
    current: 0,
    deadline: input.deadline,
    priority: input.priority,
    stage: 'seed',
    scope: input.scope,
    contributedThisMonth: false,
  }
  commit({ ...live, funds: [...live.funds, fund], hydrated: true })
  void ensureFundOnServer(fund.id)
  return fund
}

export interface ContributionResult {
  /** celengan setelah setoran (angka yang harus tampil di layar) */
  fund: SinkingFundItem
  contribution: FundContribution
  /** true kalau setoran INI yang melunasi target — dasar perayaan milestone */
  reachedNow: boolean
}

/**
 * Setor ke celengan: menambah `current`, menumbuhkan tahap tanaman, menandai
 * kewajiban bulan ini lunas, DAN mencatat satu baris riwayat — semuanya dalam
 * satu tulisan. `null` = input tidak sah (celengan tidak ada / nominal ≤ 0),
 * dan itu berarti TIDAK ada yang ditulis (bukan ditulis sebagian).
 */
export function contributeToFund(
  fundId: number,
  amount: number,
  walletId: string,
  dateISO: string = TODAY_ISO,
): ContributionResult | null {
  const target = live.funds.find((fund) => fund.id === fundId)
  const rounded = Math.round(Number(amount))
  /* celengan yang sudah dihapus user (tombstone) TIDAK boleh menerima setoran:
     sheet yang masih terbuka setelah penghapusan akan menulis uang ke celengan
     yang sudah tidak ada di layar mana pun. */
  if (!target || live.removedIds.includes(fundId) || !Number.isFinite(rounded) || rounded <= 0)
    return null

  const fund: SinkingFundItem = {
    ...target,
    current: target.current + rounded,
    stage: plantStageFrom(target.current + rounded, target.target),
    contributedThisMonth: true,
  }
  const contribution: FundContribution = {
    id: nextContributionId(),
    fundId,
    date: dateISO,
    amount: rounded,
    walletId,
  }

  commit({
    ...live,
    funds: live.funds.map((item) => (item.id === fundId ? fund : item)),
    contributions: [contribution, ...live.contributions],
    hydrated: true,
  })
  /* ── REKAM KE LEDGER (paket 65 · Tugas B) ────────────────────────────────
     Setoran celengan MENGGERAKKAN uang (keluar dari dompet). Karena itu ia WAJIB
     menulis baris ledger lewat pintu yang sama dengan catatan manual. Dulu ini
     ditulis di UI (`budget-screen.tsx`), jadi setoran dari pintu LAIN
     (`goal-detail-screen.tsx`, modal review, sapu bersih) TIDAK pernah tercatat.
     Sekarang ditulis DI SINI supaya SETIAP pemanggil `contributeToFund()` ikut
     tercatat — satu pintu, tidak ada yang terlupa.

     `clientTxId` = id setoran ⇒ idempoten: pemanggilan ganda tidak menulis dua
     baris. Kalau `walletId` BUKAN dompet nyata (mis. sumber "Sisa budget" pada
     Sapu Bersih — uang yang tidak pernah ada di dompet), name-nya kosong dan
     TIDAK ada baris kas yang dikarang: sapu bersih memang tidak menyentuh kas. */
  const walletName = walletNameOfId(getMoneySnapshot(), walletId)
  if (walletName) {
    postTransaction({
      name: `Setor ${fund.name}`,
      amount: rounded,
      type: 'saving',
      category: 'Tabungan',
      wallet: walletName,
      dateISO,
      clientTxId: `fund-contribution-${contribution.id}`,
    })
  }
  /* celengan dulu (butuh uuid), baru setoran yang menunjuk uuid itu */
  void ensureFundOnServer(fund.id).then(() => ensureContributionOnServer(contribution.id))

  return {
    fund,
    contribution,
    reachedNow: target.current < target.target && fund.current >= target.target,
  }
}

/** id sumber setoran "Sisa budget" (Sapu Bersih) — bukan dompet */
export const SWEEP_SOURCE_ID = 'sweep'

/**
 * Sapu sisa budget (3G) → celengan. Uangnya datang dari sisa limit kategori,
 * bukan dari satu dompet, jadi baris riwayatnya memakai sumber `'sweep'`
 * (`CONTRIBUTION_SOURCES` di lib/data/budget.ts) — bukan dompet palsu.
 */
export function sweepIntoFund(
  fundId: number,
  amount: number,
  dateISO: string = TODAY_ISO,
): ContributionResult | null {
  return contributeToFund(fundId, amount, SWEEP_SOURCE_ID, dateISO)
}

/* ── HAPUS CELENGAN = TOMBSTONE + EFEK UANG YANG DIKATAKAN (paket 60 · 60.2) ─
   Pola `deleteBill()` (`lib/money/bills-store.ts`): barisnya TIDAK dibuang, cuma
   ditandai. Alasannya di sini lebih kuat daripada di tagihan:

     1. UNDO harus memulihkan target, progres, tahap tanaman, dan POSISI barisnya
        — kalau barisnya dibuang, Undo cuma bisa menanam celengan kosong baru;
     2. riwayat setoran (`contributions`) menunjuk `fundId` ini. Uangnya memang
        sudah keluar dari dompet, jadi catatannya TIDAK boleh ikut terhapus
        (aturan hapus repo: yang hilang barisnya, bukan uangnya);
     3. menyimpan barisnya membuat /budget/<id> bisa bilang "celengan ini sudah
        dihapus" alih-alih menampilkan layar "tidak ditemukan".

   EFEK UANG yang wajib diketahui user: `sinkingObligationOf()` memotong
   kewajiban bulanan celengan dari kolam SEBELUM jatah harian dibagi, jadi
   menghapus celengan MENAIKKAN Jatah Harian. Store ini tidak menulis kalimatnya
   (copy ada di `FUND_DELETE_COPY`), tapi ia yang membuat efek itu terjadi: daftar
   yang dibaca `computeDailyHud()` sudah tidak memuat celengan ini. */

/** hapus satu celengan (tombstone). `null` = celengan tidak ada / sudah dihapus,
 *  dan itu berarti TIDAK ada yang ditulis (bukan tulisan separuh). */
export function deleteFund(fundId: number): SinkingFundItem | null {
  const fund = live.funds.find((row) => row.id === fundId)
  if (!fund || live.removedIds.includes(fundId)) return null
  commit({ ...live, removedIds: [...live.removedIds, fundId], hydrated: true })
  if (fund.remoteId) void deleteRemoteFund(fund.remoteId)
  return fund
}

/** Undo hapus: cabut tombstone-nya — target, progres, dan posisi barisnya balik
 *  apa adanya karena barisnya tidak pernah dibuang. `null` = tidak ada tombstone
 *  untuk id itu (mis. Undo ditekan dua kali / jendelanya sudah lewat). */
export function restoreFund(fundId: number): SinkingFundItem | null {
  if (!live.removedIds.includes(fundId)) return null
  const fund = live.funds.find((row) => row.id === fundId) ?? null
  commit({ ...live, removedIds: live.removedIds.filter((id) => id !== fundId), hydrated: true })
  if (fund) void ensureFundOnServer(fundId)
  return fund
}

/* ── HAPUS AKUN: KOSONGKAN STORE ─────────────────────────────────────────────
   Dipanggil `lib/account.ts` SETELAH IndexedDB dihapus. Tugasnya sama dengan
   `purgeMoneyStore()`: membuat state di memory benar-benar kosong dan
   menandainya "purged", supaya refresh berikutnya tidak menghidupkan lagi
   celengan contoh seolah-olah itu milik user. */
export function purgeFundsStore(): FundsSnapshot {
  accountPurged = true
  live = EMPTY_SNAPSHOT
  persist(live)
  emit()
  return live
}

/* ── HOOK & SELECTOR ───────────────────────────────────────────────────────── */

/** snapshot store celengan untuk komponen client */
export function useFundsStore(): FundsSnapshot {
  return useSyncExternalStore(subscribeFundsStore, getFundsSnapshot, getServerFundsSnapshot)
}

/**
 * Celengan yang masih HIDUP: daftar penuh dikurangi tombstone (paket 60).
 *
 * Semua pembaca tampilan & angka uang memakai ini — bukan `snapshot.funds`
 * langsung. Kalau satu komponen saja masih membaca daftar mentah, celengan yang
 * dihapus user akan tetap ikut dihitung di `sinkingObligationOf()` (jatah harian
 * tetap terpotong) padahal kartunya sudah hilang: dua cerita di satu layar.
 */
export function liveFunds(snapshot: FundsSnapshot): SinkingFundItem[] {
  if (snapshot.removedIds.length === 0) return snapshot.funds
  return snapshot.funds.filter((fund) => !snapshot.removedIds.includes(fund.id))
}

/** daftar celengan hidup untuk komponen — satu hook supaya pemanggilnya tidak
 *  lupa menyaring tombstone (identitasnya stabil per snapshot) */
export function useLiveFunds(): SinkingFundItem[] {
  const snapshot = useFundsStore()
  return useMemo(() => liveFunds(snapshot), [snapshot])
}

/** satu celengan dari id — `null` = belum ada ATAU sudah dihapus user (tombstone),
 *  sehingga halaman detail tidak pernah menampilkan celengan hantu */
export function fundById(snapshot: FundsSnapshot, fundId: number): SinkingFundItem | null {
  if (snapshot.removedIds.includes(fundId)) return null
  return snapshot.funds.find((fund) => fund.id === fundId) ?? null
}

/** riwayat setoran satu celengan, terbaru dulu (urutan tampil di halaman detail) */
export function contributionsOf(snapshot: FundsSnapshot, fundId: number): FundContribution[] {
  return fundContributions(fundId, snapshot.contributions)
}

/**
 * Kosongkan store ke kondisi seed (dipakai test supaya tiap kasus mulai bersih).
 * Tidak pernah dipanggil UI: di produksi "reset" tidak punya arti — yang ada
 * cuma `purgeFundsStore()` saat user menghapus akunnya.
 */
export function resetFundsStore(): void {
  live = SEED_SNAPSHOT
  accountPurged = false
  hydrateStarted = false
  hydratedOnce = false
  nextPreHydrationId = PRE_HYDRATION_ID_BASE
  emit()
}
