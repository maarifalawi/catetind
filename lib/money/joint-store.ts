'use client'

import { useSyncExternalStore } from 'react'
import {
  DEMO_PARTNER_JOINED,
  DEFAULT_SETTLEMENT_METHOD,
  INITIAL_JOINT_TRANSACTIONS,
  INITIAL_JOINT_WALLET,
  JOINT_DEFAULT_CATEGORY,
  JOINT_DEFAULT_DESCRIPTION,
  JOINT_ME,
  JOINT_PARTNER,
  JOINT_TODAY_ISO,
  PRIVATE_CATEGORY,
  SETTLEMENT_METHODS,
  buildCarryOverEntry,
  pocketOf,
  previousMonthKey,
  readJointSettlementRecords,
  settlementEntriesFor,
  splitSpecOf,
  type JointSettlementRecord,
  type JointTransaction,
  type JointWallet,
  type SettlementMethod,
} from '@/lib/data/joint'
import { monthOf, type SplitSpec } from '@/lib/data/joint-ledger'
import { toJointTransaction, type JointTransactionDbRow } from '@/lib/supabase/mappers'
import { readRemoteJointWallet, type RemoteJointWallet } from '@/lib/supabase/joint-remote'
import { subscribeJointTransactions, type JointRealtimeHandle } from '@/lib/supabase/realtime'
import { JOINT_STATE_KEY, loadDeviceState, saveDeviceState } from './idb'

/* ── SATU STORE KANTONG BERSAMA (paket 52 · temuan F laporan 46) ─────────────
   Temuan audit 28 Sep 2026: `/joint` memegang SALINAN datanya sendiri.

     · `joint-screen.tsx:100-116` → `useState(INITIAL_JOINT_WALLET)` +
       `useState(INITIAL_JOINT_TRANSACTIONS)` — kantong & buku besar bersama
       hidup di HALAMAN;
     · semua handler halaman itu (`handleAddTransaction`, `handleSaveSplit`,
       `handleSettle`, `saveWalletName`) menulis ke state halaman itu saja;
     · penanda settle ditulis ke localStorage; "realtime" cuma timer mock;
     · langganan Postgres Changes memakai id KANON (`joint_1`) yang TIDAK ADA di
       tabel `joint_wallets` (primary key-nya uuid) — jadi sekalipun backend
       sudah dipasangkan, tidak ada satu baris pun yang bisa masuk.

   Akibat yang bisa dibuktikan user: menambah catatan bareng, mengubah pembagian,
   atau menandai settle lalu REFRESH → semuanya kembali ke seed; nama kantong
   yang diubah user hilang; dua tab tidak pernah melihat keadaan yang sama.

   Sekarang seluruh kantong bersama dibaca dari SATU state modul ini (resep yang
   sama dengan celengan paket 46, kekayaan paket 50, dan tagihan paket 51):

     · `wallet`       — id, nama (editable), tanggal dibuat;
     · `transactions` — buku besar bersama (catatan user + baris dari partner);
     · `settlements`  — penanda settle PER BULAN (`{'2026-09': record}`), bentuk
                        yang memang diminta mesin murni `settlementEntriesFor()`;
                        baris ledger-nya TIDAK disimpan di sini karena id-nya
                        turunan record (jadi tidak mungkin dobel setelah refresh);
     · `members`      — siapa saja yang ada di kantong (menentukan halaman
                        berwujud undangan atau kantong aktif);
     · `hydrated`     — false sampai IndexedDB selesai dibaca, supaya HTML server
                        & render pertama client identik (tanpa hydration mismatch).

   MESINNYA TIDAK DITULIS ULANG: `lib/data/joint-ledger.ts` (`SplitSpec`,
   `sharesOf`, `ledgerTotals`) dan `lib/data/joint.ts` (`computeSettlement`,
   `splitSpecOf`, `buildCarryOverEntry`) tetap satu-satunya rumus. Paket ini
   memindahkan PEMILIK STATE, bukan rumusnya.

   KANTONG BERSAMA BUKAN BAGIAN TOTAL SALDO: buku besar ini sengaja TIDAK
   menyentuh `lib/money/store.ts` (kas pribadi). Uang tidak dikumpulkan di satu
   rekening — tiap orang keluar dari kantongnya sendiri lalu dihitung impas saat
   settle. Invariant itu dikunci test (`joint-store.test.ts`).

   BATAS JUJUR — dibaca sebelum mengklaim apa pun:
     · state hidup di memory modul + IndexedDB (`lib/money/idb.ts`, key `joint`)
       → bertahan saat refresh, TIDAK ada sinkronisasi antar-perangkat di jalur
       ini;
     · realtime: kalau ADA sesi Supabase, dompetnya dibaca dari tabel
       `joint_wallets` lalu baris partner masuk lewat Postgres Changes (nyata).
       Kalau TIDAK ada sesi (kondisi demo repo ini), yang jalan tetap TIMER MOCK
       di `joint-screen.tsx` — hidup hanya saat `DEMO_REALTIME_MOCK`
       (`NEXT_PUBLIC_DEMO=1`), dan transaksinya masuk lewat pintu store yang sama
       (`applyJointRow`) sehingga tidak pernah menimpa baris yang sudah ada;
     · tulis ke server BELUM ada: di produksi tiap catatan jadi `insert` ke
       `joint_transactions` dengan `client_tx_id` sebagai kunci idempotensi
       (constraint `unique (joint_wallet_id, client_tx_id)` sudah ada), dan baris
       settle ditandai `is_settlement` + `month_key` supaya tidak berlipat dengan
       penanda bulan. Karena itu bentuk state di sini JSON polos siap HTTP. */


/** bentuk yang ditulis ke IndexedDB — JSON polos, siap HTTP */
export interface PersistedJoint {
  /** versi bentuk data; bentuk lama/asing diperlakukan sebagai "belum ada" */
  version?: number
  wallet?: JointWallet
  transactions?: JointTransaction[]
  /** penanda settle per bulan (`YYYY-MM` → record) */
  settlements?: Record<string, JointSettlementRecord>
  /** id anggota kantong ini */
  members?: string[]
  /**
   * TOMBSTONE id baris yang dihapus user (paket 61) — bentuk yang sama dengan
   * `removedIds` di `lib/money/store.ts`/`bills-store.ts`/`wealth-store.ts`.
   * Barisnya TIDAK dibuang supaya Undo mungkin, dan supaya catatan contoh tidak
   * "lahir lagi" saat seluruh daftar kosong dibaca ulang.
   */
  removedIds?: string[]
  /** true = akun ini sudah dihapus user → jangan isi ulang data contoh */
  purged?: boolean
}

export interface JointState {
  wallet: JointWallet
  transactions: JointTransaction[]
  settlements: Record<string, JointSettlementRecord>
  members: string[]
  /** id baris yang dihapus user (tombstone) */
  removedIds: string[]
}

export interface JointSnapshot extends JointState {
  /** false sampai hidrasi IndexedDB selesai (batas render server ↔ client) */
  hydrated: boolean
}

/** versi bentuk state di perangkat — naikkan kalau bentuknya berubah */
const JOINT_STATE_VERSION = 1

/**
 * Anggota awal kantong bersama.
 *
 * `DEMO_PARTNER_JOINED` adalah konstanta BUILD-TIME (`NEXT_PUBLIC_DEMO`), jadi
 * nilainya sama di server & client → boleh ikut snapshot SSR tanpa risiko
 * hydration mismatch. Di produksi saklarnya mati: kantong mulai dengan satu
 * anggota, dan halaman menampilkan alur "Ajak Pasangan" sampai pasangan benar
 * benar bergabung (`addJointMember`) atau anggotanya terbaca dari server.
 */
const JOINT_MEMBER_SEED: string[] = DEMO_PARTNER_JOINED
  ? [JOINT_ME.id, JOINT_PARTNER.id]
  : [JOINT_ME.id]

/** snapshot untuk render server & hidrasi — selalu data seed, tanpa IDB */
const SERVER_SNAPSHOT: JointSnapshot = Object.freeze({
  wallet: INITIAL_JOINT_WALLET,
  transactions: INITIAL_JOINT_TRANSACTIONS,
  settlements: {},
  members: JOINT_MEMBER_SEED,
  removedIds: [] as string[],
  hydrated: false,
})

/**
 * Snapshot kosong — keadaan setelah user MENGHAPUS AKUN-nya.
 *
 * Nama kantong ikut hilang (itu data user), tapi BENTUK dompetnya tetap ada
 * supaya alur "Ajak Pasangan" punya tempat menulis nama baru. `members` kosong →
 * halaman kembali ke wujud undangan, bukan kantong "aktif" tanpa anggota.
 */
const EMPTY_SNAPSHOT: JointSnapshot = Object.freeze({
  wallet: { ...INITIAL_JOINT_WALLET, name: '' },
  transactions: [],
  settlements: {},
  members: [],
  removedIds: [] as string[],
  hydrated: true,
})

let live: JointSnapshot = SERVER_SNAPSHOT
let accountPurged = false
let hydrateStarted = false
let hydratedOnce = false
const listeners = new Set<() => void>()

/** dompet bersama di SERVER (uuid) — `null` = tidak ada sesi / belum terbaca */
let remoteWalletId: string | null = null
/** id user sesi Supabase (dipakai masker catatan privat saat baris remote masuk) */
let remoteViewerId: string | null = null
/** channel realtime yang sedang hidup (dipakai `stopJointRealtime`) */
let realtime: JointRealtimeHandle | null = null

export function getJointSnapshot(): JointSnapshot {
  return live
}

/** dipakai React saat render server & hidrasi (lihat `useJointStore`) */
export function getServerJointSnapshot(): JointSnapshot {
  return SERVER_SNAPSHOT
}

/** dompet server yang sedang dilanggani — bukti "realtime nyata", bukan mock */
export function getJointRemoteWalletId(): string | null {
  return remoteWalletId
}

/**
 * Berlangganan perubahan kantong bersama. Hidrasi IndexedDB ditunda sampai ada
 * pelanggan PERTAMA (yaitu setelah hidrasi React) supaya HTML server tidak
 * pernah berbeda dari render pertama client — pola yang sama dengan
 * `subscribeMoneyStore`/`subscribeFundsStore`/`subscribeWealthStore`/
 * `subscribeBillsStore`.
 */
export function subscribeJointStore(listener: () => void): () => void {
  listeners.add(listener)
  void hydrateJointStore()
  return () => {
    listeners.delete(listener)
  }
}

function emit(): void {
  for (const listener of listeners) listener()
}

/** bendera `justArrived` itu pajangan (badge "Baru") — jangan ikut tersimpan */
function withoutArrivalBadge(tx: JointTransaction): JointTransaction {
  if (!tx.justArrived) return tx
  const { justArrived: _arrival, ...rest } = tx
  return rest
}

function persist(snapshot: JointState): void {
  saveDeviceState<PersistedJoint>(JOINT_STATE_KEY, {
    version: JOINT_STATE_VERSION,
    wallet: snapshot.wallet,
    transactions: snapshot.transactions.map(withoutArrivalBadge),
    settlements: snapshot.settlements,
    members: [...snapshot.members],
    removedIds: [...snapshot.removedIds],
    purged: accountPurged,
  })
}

function commit(next: JointSnapshot): void {
  live = next
  persist(next)
  emit()
}

/* ── ID BARIS BARU (anti tabrakan) ─────────────────────────────────────────
   Id catatan TIDAK dihitung dari panjang daftar (pola `max + 1` seperti store
   lain) karena daftar ini bisa berisi baris REMOTE ber-id uuid: nomornya tidak
   bisa dibandingkan, dan `max + 1`-nya bisa menabrak baris tersimpan user. Id di
   sini memakai stempel waktu + penghitung sesi, jadi:
     · tidak mungkin menabrak id seed ('1'…'8') maupun uuid server;
     · tetap unik walau dua catatan dibuat di milidetik yang sama. */
let seq = 0

function nextTransactionId(): string {
  seq += 1
  return `joint-${Date.now().toString(36)}-${seq.toString(36)}`
}

/** jam dinding saat catatan disimpan (`HH:MM`) — hanya dipakai di jalur TULIS */
function clockLabelOf(date: Date): string {
  const hours = String(date.getHours()).padStart(2, '0')
  const minutes = String(date.getMinutes()).padStart(2, '0')
  return `${hours}:${minutes}`
}

/* ── ATURAN HAPUS BARIS (paket 61.3) ─────────────────────────────────────────
   Tiga fungsi kecil di bawah adalah SATU-SATUNYA tempat yang tahu kapan sebuah
   baris kantong bersama boleh dihapus. Halaman memakai `jointDeleteState()`
   untuk memutuskan tombol & kalimatnya; pintu tulis memakai syarat yang sama —
   jadi mustahil UI menawarkan hapus pada baris yang akan ditolak store. */
function isRemovedJointRow(id: string): boolean {
  return live.removedIds.includes(id)
}

/** true = bulan yang memuat tanggal ini sudah ditandai settle */
function isMonthSettled(dateISO: string): boolean {
  return Boolean(live.settlements[monthOf(dateISO)])
}

/** tanggal perangkat `YYYY-MM-DD` — hanya dipakai di jalur TULIS (tidak dirender) */
function deviceDateISO(date: Date = new Date()): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}


/* ── HIDRASI & GABUNG STATE (murni → bisa diuji tanpa browser) ───────────── */

/**
 * Gabungkan state tersimpan dengan yang sudah ada di memory. Fungsi MURNI
 * (`current` bisa dioper dari test) supaya jalur hidrasi bisa diuji tanpa
 * browser/IndexedDB — persis pola `mergeMoneySnapshot`/`mergeFundsState`/
 * `mergeWealthState`/`mergeBillsState`.
 *
 * Aturan:
 *   · daftar TERSIMPAN jadi DASAR (itu yang benar-benar dimiliki user);
 *   · catatan/anggota yang lahir SEBELUM hidrasi selesai tetap ikut (dedupe per
 *     id) — kalau tidak, catatan yang ditulis di detik-detik pertama hilang;
 *   · data contoh hanya dipakai kalau memang belum ada state tersimpan, dan
 *     TIDAK PERNAH dihidupkan lagi setelah akun dihapus (`purged`);
 *   · bendera pajangan `justArrived` dibuang (badge "Baru" tidak boleh bertahan
 *     setelah refresh).
 */
export function mergeJointState(
  persisted: PersistedJoint | null,
  current: JointSnapshot = live,
): JointSnapshot {
  const purged = persisted?.purged === true
  const known = persisted?.version === JOINT_STATE_VERSION

  const storedRows = known ? (persisted?.transactions ?? []).filter((tx) => Boolean(tx?.id)) : []
  const base = storedRows.length > 0 ? storedRows : purged ? [] : INITIAL_JOINT_TRANSACTIONS
  const extras = current.transactions.filter(
    (tx) =>
      !INITIAL_JOINT_TRANSACTIONS.some((seed) => seed.id === tx.id) &&
      !base.some((row) => row.id === tx.id),
  )
  const transactions = [...base, ...extras].map(withoutArrivalBadge)

  const storedMembers = known ? (persisted?.members ?? []).filter((id) => Boolean(id)) : []
  const memberBase = storedMembers.length > 0 ? storedMembers : purged ? [] : JOINT_MEMBER_SEED
  /* anggota yang bergabung di SESI INI (mis. pasangan menerima undangan) tidak
     boleh hilang saat state tersimpan dibaca — yang ikut hanya yang BUKAN
     anggota seed, supaya kantong yang sudah dihapus tidak "lahir lagi" */
  const memberExtras = current.members.filter((id) => !JOINT_MEMBER_SEED.includes(id))
  const members = [...new Set([...memberBase, ...memberExtras])]

  const storedWallet = known ? persisted?.wallet : undefined
  const wallet =
    storedWallet && storedWallet.name.trim().length > 0
      ? storedWallet
      : purged
        ? EMPTY_SNAPSHOT.wallet
        : INITIAL_JOINT_WALLET

  /* TOMBSTONE digabung (union): hapus di perangkat ini bertahan, dan hapus yang
     sudah tersimpan tidak "hidup lagi" saat state dibaca ulang. Inilah yang
     menutup lubang "kantong baru kosong": setelah `createJointPocket()` menandai
     semua baris seed terhapus, daftar tersimpannya kosong — tanpa tombstone,
     hidrasi berikutnya akan menghidupkan kembali catatan contoh itu. */
  const storedRemoved = known ? (persisted?.removedIds ?? []).filter((id) => id) : []
  const removedIds = [...new Set([...storedRemoved, ...current.removedIds])]

  return {
    wallet,
    transactions,
    settlements: { ...(known ? (persisted?.settlements ?? {}) : {}), ...current.settlements },
    members,
    removedIds,
    hydrated: true,
  }
}

/**
 * Gabungkan penanda settle LEGACY (localStorage, lihat `lib/data/joint.ts`) ke
 * state store. Fungsi murni supaya migrasinya bisa diuji tanpa browser.
 *
 * STORE MENANG: penanda di penyimpanan baru ditulis setelah migrasi ini, jadi
 * kalau bulannya sama ia yang benar. `migrated` = berapa bulan yang benar-benar
 * DIPINDAHKAN — dipakai test & laporan sebagai bukti, bukan klaim.
 */
export function mergeLegacySettlements(
  stored: Record<string, JointSettlementRecord>,
  legacy: Record<string, JointSettlementRecord>,
): { settlements: Record<string, JointSettlementRecord>; migrated: number } {
  const months = Object.keys(legacy)
  if (months.length === 0) return { settlements: stored, migrated: 0 }
  const migrated = months.filter((month) => !stored[month]).length
  return { settlements: { ...legacy, ...stored }, migrated }
}


/**
 * Gabungkan baris dari SERVER dengan baris lokal. Fungsi murni (dipakai
 * `attachRemoteJoint` dan diuji langsung).
 *
 * Baris server jadi DASAR, dan baris SEED dibuang: begitu ada backend, data
 * contoh bukan lagi data user — menampilkannya di samping catatan asli berarti
 * angka bersama yang salah. Catatan yang lahir di perangkat ini (mis. ditulis
 * saat offline) tetap ikut selama id-nya belum ada di server.
 */
export function mergeJointRows(
  localRows: JointTransaction[],
  remoteRows: JointTransaction[],
): JointTransaction[] {
  const remoteIds = new Set(remoteRows.map((tx) => tx.id))
  const localExtras = localRows.filter(
    (tx) =>
      !remoteIds.has(tx.id) && !INITIAL_JOINT_TRANSACTIONS.some((seed) => seed.id === tx.id),
  )
  return [...remoteRows, ...localExtras].map(withoutArrivalBadge)
}

async function hydrateJointStore(): Promise<void> {
  if (hydrateStarted) return
  hydrateStarted = true

  const persisted = await loadDeviceState<PersistedJoint>(JOINT_STATE_KEY)
  accountPurged = persisted?.purged === true

  const merged = mergeJointState(persisted)
  /* MIGRASI SEKALI: penanda settle user lama (localStorage) dipindahkan ke store
     supaya status "bulan ini sudah settle" tidak hilang saat app diperbarui. */
  const legacy = mergeLegacySettlements(merged.settlements, readJointSettlementRecords())
  live = legacy.migrated > 0 ? { ...merged, settlements: legacy.settlements } : merged
  hydratedOnce = true
  if (legacy.migrated > 0) persist(live)
  emit()

  await attachRemoteJoint()
}

/**
 * Pasang dompet bersama dari SERVER ke store (dipakai `attachRemoteJoint()`).
 *
 * Dipisah dari pembacaan jaringan dengan sengaja: dengan begitu jalur "gabung ke
 * kantong yang sudah ada di server" bisa diuji TANPA sesi Supabase, dan
 * pembacaan yang gagal (atau tidak ada sesi) tidak mengubah state apa pun.
 *
 * Baris server jadi DASAR (`mergeJointRows`): begitu ada backend, catatan contoh
 * bukan lagi data user. Hasilnya juga disimpan ke perangkat sebagai cache supaya
 * refresh berikutnya tidak menunggu jaringan.
 */
export function applyRemoteJointWallet(remote: RemoteJointWallet): JointSnapshot {
  remoteWalletId = remote.wallet.id
  remoteViewerId = remote.viewerId
  live = {
    ...live,
    wallet: remote.wallet,
    members: remote.members.length > 0 ? remote.members : live.members,
    transactions: mergeJointRows(live.transactions, remote.rows),
    hydrated: true,
  }
  persist(live)
  emit()
  return live
}

/**
 * Sambungkan kantong ke SERVER — hanya kalau ada sesi Supabase.
 *
 * Urutannya penting: id dompet dibaca dari tabel `joint_wallets` DULU (bukan id
 * kanon seperti sebelumnya), baris yang sudah ada dibaca dari view masker, BARU
 * langganan realtime dibuka untuk id itu. Tanpa langkah pertama, langganannya
 * menunjuk dompet yang tidak ada — persis temuan laporan 45.
 */
async function attachRemoteJoint(): Promise<void> {
  const remote = await readRemoteJointWallet()
  if (!remote) return

  applyRemoteJointWallet(remote)

  stopJointRealtime()
  realtime = subscribeJointTransactions(remote.wallet.id, applyRemoteJointRow)
}

/** hentikan langganan realtime (idempoten — dipakai Hapus Akun & test) */
export function stopJointRealtime(): void {
  realtime?.stop()
  realtime = null
}

/**
 * Kantong yang boleh muncul sebagai pembayar / arah transfer.
 *
 * Buku besar ini DUA ORANG (`JOINT_MEMBERS` di `lib/data/joint.ts`), jadi yang
 * sah hanya id dua peserta itu — dan kalau kantongnya masih memakai identitas
 * demo, orangnya harus benar-benar sudah jadi anggota (pasangan yang belum
 * gabung tidak boleh jadi pembayar).
 *
 * Kantong yang datang dari SERVER memakai identitas server (uuid) sementara
 * halaman `/joint` menggambar dua identitas demo; di situ keanggotaan tidak bisa
 * dibandingkan, jadi pemeriksaan anggota dilewati — membandingkan id demo dengan
 * uuid selalu gagal dan itu bukan tanda data salah. Batas ini ditulis apa adanya
 * di laporan §8.
 */
function isAllowedPocket(snapshot: JointSnapshot, userId: string): boolean {
  if (userId !== JOINT_ME.id && userId !== JOINT_PARTNER.id) return false
  if (remoteWalletId) return true
  return snapshot.members.includes(userId)
}

/* ── API TULIS — SATU-SATUNYA JALUR MENULIS KANTONG BERSAMA ────────────────
   Komponen tidak boleh menyentuh `transactions`/`wallet`/`settlements` langsung:
   halaman, modal rekap, hasil ekspor, dan Hapus Akun membaca state yang sama,
   jadi setiap perubahan harus lewat pintu yang juga menyimpan ke perangkat.
   `null` = input tidak sah → TIDAK ada yang ditulis (bukan ditulis sebagian). */

export interface NewJointTransactionInput {
  description: string
  amount: number
  /** bentuk kanonik pembagian; kosong = bagi rata */
  split?: SplitSpec | null
  /** true = isi catatannya cuma terlihat pembuatnya (nominalnya tetap ditimbang) */
  isPrivate?: boolean
  /** kantong yang keluar uang — pemilih "Siapa yang nalangin?" */
  paidByUserId: string
  /** tanggal `YYYY-MM-DD`; default `JOINT_TODAY_ISO` (waktu mock yang dipatok repo) */
  dateISO?: string
  /** jam `HH:MM`; default jam dinding SAAT DISIMPAN (bukan saat render) */
  timeLabel?: string
  /** kategori; default `JOINT_DEFAULT_CATEGORY` (atau kategori privat) */
  category?: string
}

/**
 * Catat satu pengeluaran bareng.
 *
 * Yang membuat catatan ini benar bukan nominalnya, melainkan DUA hal yang harus
 * eksplisit: `paidByUserId` (kantong yang keluar uang — bukan siapa yang
 * mengetik) dan `split` (porsi tiap orang). Keduanya divalidasi di sini, jadi
 * tidak mungkin ada baris yang "kantongnya" bukan anggota kantong ini.
 */
export function addJointTransaction(input: NewJointTransactionInput): JointTransaction | null {
  const amount = Math.round(Number(input.amount))
  if (!Number.isFinite(amount) || amount <= 0) return null
  if (!isAllowedPocket(live, input.paidByUserId)) return null

  const isPrivate = input.isPrivate === true
  const tx: JointTransaction = {
    id: nextTransactionId(),
    userId: JOINT_ME.id,
    paidByUserId: input.paidByUserId,
    description: input.description.trim() || JOINT_DEFAULT_DESCRIPTION,
    amount,
    /* catatan privat TIDAK menampilkan kategorinya (kategori apa pun = bocoran
       isi); nominalnya tetap ikut dihitung — lihat `weighedPaidBy()` */
    category: isPrivate ? PRIVATE_CATEGORY : (input.category ?? JOINT_DEFAULT_CATEGORY),
    date: input.dateISO ?? JOINT_TODAY_ISO,
    time: input.timeLabel ?? clockLabelOf(new Date()),
    split: input.split ?? { type: 'equal' },
    ...(isPrivate ? { isPrivate: true, privateForUser: JOINT_ME.id } : {}),
  }

  commit({ ...live, transactions: [tx, ...live.transactions], hydrated: true })
  return tx
}

/**
 * Ubah pembagian satu catatan. Field lama (`splitType`/`splits`/`payerId`)
 * DIKOSONGKAN supaya tidak ada dua sumber kebenaran yang bisa bercerita beda —
 * persis yang dulu dipaksa halaman lewat `splitOverrides`.
 *
 * `null` = catatan tidak ada atau baris SETTLE (pembagiannya bukan urusan user:
 * ia jejak transfer yang sudah disepakati).
 */
export function updateSplit(id: string, split: SplitSpec): JointTransaction | null {
  const target = live.transactions.find((tx) => tx.id === id)
  if (!target || target.isSettlement || isRemovedJointRow(id)) return null

  const updated: JointTransaction = {
    ...target,
    split,
    splitType: undefined,
    splits: undefined,
    payerId: undefined,
  }
  commit({
    ...live,
    transactions: live.transactions.map((tx) => (tx.id === id ? updated : tx)),
    hydrated: true,
  })
  return updated
}

/**
 * Pindahkan catatan ke kantong orang lain ("Siapa yang nalangin?" yang salah).
 *
 * Ini pintu KOREKSI yang sebelumnya tidak ada: tanpa ini, catatan yang uangnya
 * keluar dari kantong pasangan tetap menempel di sisi pencatat, dan timbangan
 * settlement salah selamanya. Baris settle ditolak (arah transfernya bagian dari
 * record, bukan atribusi pajangan).
 */
export function setPaidBy(id: string, userId: string): JointTransaction | null {
  const target = live.transactions.find((tx) => tx.id === id)
  if (!target || target.isSettlement || isRemovedJointRow(id)) return null
  if (!isAllowedPocket(live, userId)) return null
  if (pocketOf(target) === userId) return target

  const updated: JointTransaction = { ...target, paidByUserId: userId }
  commit({
    ...live,
    transactions: live.transactions.map((tx) => (tx.id === id ? updated : tx)),
    hydrated: true,
  })
  return updated
}

/** Ganti nama kantong bersama (editable on tap, Section 2). `null` = nama kosong. */
export function renameJointWallet(name: string): JointWallet | null {
  const next = name.trim()
  if (!next) return null
  if (next === live.wallet.name) return live.wallet
  const wallet: JointWallet = { ...live.wallet, name: next }
  commit({ ...live, wallet, hydrated: true })
  return wallet
}

/**
 * HAPUS PER BARIS (paket 61.3) — pintu yang sebelumnya TIDAK ADA sama sekali
 * (store ini nol fungsi hapus, jadi catatan bareng yang salah hanya bisa
 * "dilawan" dengan mencatat ulang dan menutupi angka yang salah).
 *
 * Tiga syarat, dan alasannya masing-masing:
 *
 *   1. Barisnya harus CATATAN. Baris settle & baris pembuka bulan BUKAN catatan
 *      user — keduanya turunan penanda bulan (`settlementEntriesFor()`), jadi
 *      tidak punya id di daftar ini dan memang tidak bisa dihapus dari sini;
 *   2. Bulannya BELUM di-settle. Setelah "Tandai Sudah Settle", angka bulan itu
 *      sudah disepakati dua orang dan transfernya (mungkin) sudah terjadi;
 *      menghapus catatannya akan mengubah SALDO PATUNGAN PASANGAN secara
 *      retroaktif tanpa sepengetahuannya. Karena itu ditolak — dan UI menjelaskan
 *      alasannya (`JOINT_DELETE_COPY.lockedNote`), bukan menyembunyikan tombolnya;
 *   3. TOMBSTONE, bukan `filter()`: barisnya tetap disimpan supaya Undo benar-benar
 *      bisa mengembalikannya BESERTA angka timbangannya selama jendelanya hidup.
 *
 * `null` = tidak ada yang ditulis (id tidak ada / baris turunan / sudah terhapus
 * / bulannya sudah di-settle).
 */
export function deleteJointTransaction(id: string): JointTransaction | null {
  const target = live.transactions.find((tx) => tx.id === id)
  if (!target || target.isSettlement || target.isOpening) return null
  if (isRemovedJointRow(id)) return null
  if (isMonthSettled(target.date)) return null

  commit({ ...live, removedIds: [...live.removedIds, id], hydrated: true })
  return target
}

/**
 * Cabut tombstone satu baris (jalur Undo). `null` = gagal jujur: barisnya tidak
 * ada, atau memang tidak sedang terhapus (mis. Undo yang datang setelah jendela
 * 5 detiknya tutup).
 */
export function restoreJointTransaction(id: string): JointTransaction | null {
  if (!live.removedIds.includes(id)) return null
  commit({
    ...live,
    removedIds: live.removedIds.filter((rowId) => rowId !== id),
    hydrated: true,
  })
  return live.transactions.find((tx) => tx.id === id) ?? null
}

/**
 * BUAT KANTONG BARU: nama baru + BUKU BESAR YANG KOSONG (paket 61.3).
 *
 * Kenapa ini fungsi tersendiri, bukan `renameJointWallet()`: kantong yang baru
 * dibuat TIDAK BOLEH tampil berisi catatan contoh. Sebelum paket 61, alur "Buat
 * Dompet & Ajak Pasangan" hanya mengganti nama kantong seed (`INITIAL_JOINT_WALLET`),
 * sementara buku besarnya masih `INITIAL_JOINT_TRANSACTIONS` — jadi kantong yang
 * baru saja dibuat langsung berisi "Groceries Superindo" dan "Listrik PLN", dan
 * klaim "baru dibuat" tidak bisa dipercaya. Yang menandai barisnya terhapus
 * (bukan membuangnya) juga `settlements` dikosongkan: bulan yang sudah disettle
 * tidak berlaku lagi di kantong baru.
 *
 * `todayISO` bisa dioper supaya perilakunya bisa diuji tanpa jam mesin; di UI,
 * tanggalnya diisi hari ini — kantong yang baru dibuat tidak boleh menulis
 * "Bersama sejak 15 Juli 2026" (tanggal seed).
 */
export function createJointPocket(name: string, todayISO?: string): JointWallet | null {
  const next = name.trim()
  if (!next) return null

  const wallet: JointWallet = {
    ...live.wallet,
    name: next,
    createdAt: todayISO ?? deviceDateISO(),
    /* bendera "kantong ini benar-benar dibuat user" — halaman memakainya untuk
       membedakan keadaan 1 (belum ada kantong) dari keadaan 2 (menunggu
       pasangan), yang tanpa ini tampak sama karena nama seed sudah terisi */
    created: true,
  }
  /* seluruh baris yang ada sekarang ditandai terhapus: bukan dibuang, supaya
     (a) hidrasi berikutnya tidak menghidupkan catatan contoh, dan (b) datanya
     masih bisa dipulihkan kalau ternyata keputusan itu salah. */
  const removedIds = [
    ...new Set([...live.removedIds, ...live.transactions.map((tx) => tx.id)]),
  ]

  commit({ ...live, wallet, removedIds, settlements: {}, hydrated: true })
  return wallet
}

/**
 * Tandai satu bulan SUDAH settle — MENULIS penanda, bukan sekadar mengubah
 * tampilan.
 *
 * Yang disimpan hanya RECORD-nya (bulan, arah, nominal, metode, sisa). Baris
 * ledger-nya TIDAK disimpan di sini karena ia turunan murni:
 * `settlementEntriesFor()` membangunnya dari record, dan id-nya
 * (`settle-<bulan>-<dari>-<ke>`) selalu sama — jadi mustahil ada dua baris
 * settle untuk bulan yang sama walau store dibuka berkali-kali.
 *
 * `carryOver` = bagian utang yang TIDAK tertutup transfer ini. Alur sekarang
 * selalu mentransfer penuh, jadi nilainya 0 — tapi jalurnya tetap hidup &
 * teruji: sisa itu muncul sebagai PEMBUKA bulan berikutnya lewat
 * `buildCarryOverEntry()` (`carryOverEntryFor()` di bawah).
 *
 * `null` = record tidak sah (bulan bukan `YYYY-MM`, arahnya bukan anggota kantong
 * ini, atau dari == ke) → tidak ada yang ditulis.
 */
export function recordSettlement(record: JointSettlementRecord): JointSettlementRecord | null {
  const month = record.month.trim()
  if (!/^\d{4}-\d{2}$/.test(month)) return null
  if (!isAllowedPocket(live, record.from) || !isAllowedPocket(live, record.to)) return null
  if (record.from === record.to) return null

  const method: SettlementMethod = SETTLEMENT_METHODS.includes(record.method)
    ? record.method
    : DEFAULT_SETTLEMENT_METHOD
  const stored: JointSettlementRecord = {
    month,
    from: record.from,
    to: record.to,
    amount: Math.max(0, Math.round(record.amount)),
    method,
    carryOver: Math.max(0, Math.round(record.carryOver)),
  }

  commit({ ...live, settlements: { ...live.settlements, [month]: stored }, hydrated: true })
  return stored
}

/**
 * Catat bahwa seseorang benar-benar jadi anggota kantong ini (pasangan menerima
 * undangan). Sebelum paket 52 status ini cuma `useState(DEMO_PARTNER_JOINED)` —
 * jadi "pasangan sudah gabung" hilang setiap refresh.
 */
export function addJointMember(userId: string): JointSnapshot {
  if (!userId || live.members.includes(userId)) return live
  const next: JointSnapshot = { ...live, members: [...live.members, userId], hydrated: true }
  commit(next)
  return next
}

/**
 * Masukkan satu baris yang SUDAH berbentuk domain — dipakai jalur MOCK
 * (`DEMO_REALTIME_MOCK` di `/joint`) dan test. Ia masuk lewat pintu yang sama
 * dengan baris realtime, termasuk aturan anti-dobel-nya.
 *
 * `null` = TIDAK ADA yang ditulis: barisnya tidak sah, atau id-nya SUDAH ada.
 * Perbedaan itu penting — pemanggil jadi bisa memutuskan menembak toast tanpa
 * mengabarkan baris yang sama dua kali.
 */
export function applyJointRow(
  row: JointTransaction,
  { arrival = true }: { arrival?: boolean } = {},
): JointTransaction | null {
  if (!row?.id || !row.date) return null
  if (live.transactions.some((tx) => tx.id === row.id)) return null

  const stored: JointTransaction = arrival ? { ...row, justArrived: true } : row
  commit({ ...live, transactions: [stored, ...live.transactions], hydrated: true })
  return stored
}

/**
 * Baris yang datang dari SERVER (Postgres Changes ATAU bacaan awal REST) →
 * store. Bentuk database dipetakan lewat `toJointTransaction()` (satu jalur
 * untuk REST & realtime), lalu aturan dedupe-nya sama dengan `applyJointRow()`.
 *
 * `viewerId` = id user sesi (bukan selalu `JOINT_ME.id`): dialah yang menentukan
 * apakah ISI catatan privat ini boleh terlihat. Nominalnya selalu ikut — aturan
 * produk `PRIVATE_EXPENSE_POLICY = 'shared'`.
 */
export function applyRemoteJointRow(row: JointTransactionDbRow): JointTransaction | null {
  if (!row?.id) return null
  return applyJointRow(toJointTransaction(row, remoteViewerId ?? JOINT_ME.id))
}

/** Lepas badge "Baru" setelah animasi slide-in selesai (pajangan, bukan data) */
export function clearJointArrivalBadge(id: string): void {
  const target = live.transactions.find((tx) => tx.id === id)
  if (!target?.justArrived) return
  const cleared: JointTransaction = { ...target }
  delete cleared.justArrived
  commit({
    ...live,
    transactions: live.transactions.map((tx) => (tx.id === id ? cleared : tx)),
    hydrated: true,
  })
}


/* ── HAPUS AKUN, HOOK, & SELECTOR ────────────────────────────────────────── */

/**
 * Dipanggil `lib/account.ts` SETELAH IndexedDB dihapus. Tugasnya sama dengan
 * `purgeMoneyStore()`/`purgeFundsStore()`/`purgeWealthStore()`/
 * `purgeBillsStore()`: membuat state di memory benar-benar kosong dan
 * menandainya "purged", supaya refresh berikutnya tidak menghidupkan lagi
 * kantong contoh (Dompet Kita, catatan WiFi, …) seolah-olah itu milik user.
 * Langganan realtime ikut dilepas: tidak ada gunanya menahan channel untuk data
 * yang sudah dihapus.
 */
export function purgeJointStore(): JointSnapshot {
  stopJointRealtime()
  remoteWalletId = null
  remoteViewerId = null
  accountPurged = true
  live = EMPTY_SNAPSHOT
  persist(live)
  emit()
  return live
}

/** snapshot store kantong bersama untuk komponen client */
export function useJointStore(): JointSnapshot {
  return useSyncExternalStore(subscribeJointStore, getJointSnapshot, getServerJointSnapshot)
}

/** penanda settle satu bulan — `null` = bulan itu belum pernah disettle */
export function settlementRecordFor(
  snapshot: JointSnapshot,
  month: string,
): JointSettlementRecord | null {
  return snapshot.settlements[month] ?? null
}

/**
 * Penanda bulan LAIN yang masih menyisakan utang — sumber catatan "Sisa bulan
 * lalu dibawa" di modal rekap. (`settlements` menyimpan record-nya sendiri, jadi
 * `carryOver` di sini selalu diturunkan dari record bulan sebelumnya.)
 */
export function carryOverRecordFor(
  snapshot: JointSnapshot,
  month: string,
): JointSettlementRecord | null {
  const previous = snapshot.settlements[previousMonthKey(month)]
  return previous && previous.carryOver > 0 ? previous : null
}

/** baris pembuka bulan `month` dari sisa bulan sebelumnya (`null` = tidak ada sisa) */
export function carryOverEntryFor(
  snapshot: JointSnapshot,
  month: string,
): JointTransaction | null {
  const previous = snapshot.settlements[previousMonthKey(month)]
  return previous ? buildCarryOverEntry(previous, month) : null
}

/** baris ledger dari penanda settle (pembuka bulan + baris settle bulan ini) */
export function settlementEntriesOf(snapshot: JointSnapshot, month: string): JointTransaction[] {
  return settlementEntriesFor(snapshot.settlements, month)
}

/**
 * Kunci anti-dobel satu baris.
 *
 * Baris biasa = `id`-nya. Baris SETTLE/PEMBUKA memakai kunci SEMANTIK (jenis +
 * bulan + kantong + penerima), karena baris turunan penanda bulan ber-id
 * `settle-<bulan>-<dari>-<ke>` sementara baris yang datang dari server ber-id
 * uuid — dua-duanya menceritakan transfer yang SAMA, jadi tidak boleh muncul dua
 * kali di layar maupun di hitungan net.
 */
export function jointRowKey(tx: JointTransaction): string {
  if (!tx.isSettlement) return tx.id
  const spec = splitSpecOf(tx)
  const bearer = spec.type === 'single_payer' ? spec.payerId : ''
  const kind = tx.isOpening ? 'carry' : 'settle'
  return `${kind}-${monthOf(tx.date)}-${pocketOf(tx)}-${bearer}`
}

/**
 * Buku besar bersama yang DIPAJANG halaman: baris turunan penanda settle dulu,
 * lalu catatan — semuanya lewat `jointRowKey()` supaya tidak ada baris kembar.
 * Halaman tidak pernah menyusun daftar ini sendiri, jadi angka timbangan &
 * timeline selalu dibaca dari daftar yang sama.
 */
export function jointLedgerFeed(snapshot: JointSnapshot, month: string): JointTransaction[] {
  const out: JointTransaction[] = []
  const seen = new Set<string>()
  /* baris yang dihapus user tidak pernah masuk feed — timbangan, statistik, dan
     timeline membaca daftar yang SAMA, jadi satu penyaring cukup untuk
     ketiganya (paket 61.3) */
  const notes = snapshot.transactions.filter((tx) => !snapshot.removedIds.includes(tx.id))
  for (const tx of [...settlementEntriesOf(snapshot, month), ...notes]) {
    const key = jointRowKey(tx)
    if (seen.has(key)) continue
    seen.add(key)
    out.push(tx)
  }
  return out
}

/** catatan yang benar-benar "catatan" (bukan baris settle/pembuka & bukan tombstone) */
export function jointNotes(snapshot: JointSnapshot): JointTransaction[] {
  return snapshot.transactions.filter(
    (tx) => !tx.isSettlement && !snapshot.removedIds.includes(tx.id),
  )
}

/**
 * Boleh dihapus atau tidak (paket 61.3) — SATU tempat yang tahu aturannya.
 *
 * Dipakai UI untuk memutuskan tombol & kalimatnya, dan syaratnya identik dengan
 * yang diperiksa `deleteJointTransaction()`, jadi tombol tidak pernah menawarkan
 * sesuatu yang akan ditolak store. Tiga nilai, karena UI perlu membedakan
 * "kenapa tidak ada tombol":
 *
 *   · `allowed` — catatan di bulan yang belum disettle → tombol Hapus;
 *   · `locked`  — bulannya sudah disettle → tombolnya TIDAK dipajang, tapi
 *                 alasannya dituliskan (`JOINT_DELETE_COPY.lockedNote`), jadi
 *                 user tidak mengira fiturnya lupa dibuat;
 *   · `none`    — baris turunan (settle/pembuka) atau baris yang sudah terhapus.
 */
export type JointDeleteState = 'allowed' | 'locked' | 'none'

export function jointDeleteState(
  snapshot: JointSnapshot,
  tx: JointTransaction,
): JointDeleteState {
  if (tx.isSettlement || tx.isOpening) return 'none'
  if (snapshot.removedIds.includes(tx.id)) return 'none'
  return snapshot.settlements[monthOf(tx.date)] ? 'locked' : 'allowed'
}

/** true = kantong ini sudah punya pasangan (bukan lagi wujud undangan) */
export function jointPartnerJoined(snapshot: JointSnapshot): boolean {
  return snapshot.members.includes(JOINT_PARTNER.id)
}

/**
 * Kosongkan store ke kondisi seed (dipakai test supaya tiap kasus mulai bersih).
 * Tidak pernah dipanggil UI: di produksi "reset" tidak punya arti — yang ada cuma
 * `purgeJointStore()` saat user menghapus akunnya.
 */
export function resetJointStore(): void {
  stopJointRealtime()
  remoteWalletId = null
  remoteViewerId = null
  live = SERVER_SNAPSHOT
  accountPurged = false
  hydrateStarted = false
  hydratedOnce = false
  seq = 0
  emit()
}

