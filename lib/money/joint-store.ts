'use client'

import { useSyncExternalStore } from 'react'
import {
  DEMO_PARTNER_JOINED,
  DEFAULT_SETTLEMENT_METHOD,
  INITIAL_JOINT_TRANSACTIONS,
  INITIAL_JOINT_WALLET,
  JOINT_DEFAULT_CATEGORY,
  JOINT_DEFAULT_DESCRIPTION,
  JOINT_DEFAULT_INCOME_DESCRIPTION,
  JOINT_ME,
  JOINT_PARTNER,
  PRIVATE_CATEGORY,
  SETTLEMENT_CATEGORY,
  SETTLEMENT_METHODS,
  SETTLE_ENTRY_LABEL,
  buildCarryOverEntry,
  monthLabelOf,
  pocketOf,
  previousMonthKey,
  readJointSettlementRecords,
  settlementEntriesFor,
  splitSpecOf,
  type JointPerson,
  type JointSettlementRecord,
  type JointTransaction,
  type JointWallet,
  type SettlementMethod,
} from '@/lib/data/joint'
import { monthOf, withinMonth, isValidSplit, type SplitSpec } from '@/lib/data/joint-ledger'
import { toJointTransaction, type JointTransactionDbRow } from '@/lib/supabase/mappers'
import { readRemoteJointWallet, readRemoteJointAccess, pushJointTransactionToServer, updateJointTransactionOnServer, deleteRemoteJointTransaction, deleteRemoteJointMembership, deleteRemoteJointWallet, removeRemoteJointMember, updateRemoteJointWalletName, pushJointSettlement, deleteRemoteJointSettlement, type RemoteJointWallet } from '@/lib/supabase/joint-remote'
import { acceptInviteRemote } from '@/lib/supabase/invite-remote'
import { subscribeJointTransactions, subscribeTables, type WealthRealtimeHandle, type JointRealtimeHandle } from '@/lib/supabase/realtime'
import { JOINT_STATE_KEY, accountStateKey, loadDeviceState, resolveDeviceOwner, saveDeviceState } from './idb'
import { browserUserId } from '@/lib/supabase/client'
import { isUuid, randomUuid } from '@/lib/supabase/uuid'
import { postBalanceAdjustment, postExpense, postIncome, postJointCashIn, postJointCashOut, removeRow, walletBalance, getMoneySnapshot } from './store'
import { notifyJointEntry, notifyJointSettle } from './notification-events'

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
  /** PEMILIK dompet menurut server (null = belum terbaca / jalur lokal) */
  ownerId?: string | null
  /**
   * id user pemanggil (uuid Supabase) — dipakai memutuskan siapa "Kamu" di buku
   * besar ini. Disimpan supaya setelah refresh layar tidak perlu menebak.
   */
  viewerId?: string | null
  /** nama panggilan anggota (`user_id` → nama). Kosong = sebutan netral. */
  memberNames?: Record<string, string>
  /**
   * TOMBSTONE id baris yang dihapus user (paket 61) — bentuk yang sama dengan
   * `removedIds` di `lib/money/store.ts`/`bills-store.ts`/`wealth-store.ts`.
   * Barisnya TIDAK dibuang supaya Undo mungkin, dan supaya catatan contoh tidak
   * "lahir lagi" saat seluruh daftar kosong dibaca ulang.
   */
  removedIds?: string[]
  /**
   * Bulan yang settle-nya DIBATALKAN tapi penghapusan di server belum berhasil
   * (offline). Selama bulan ada di sini, penanda dari server tidak boleh
   * dihidupkan lagi di perangkat ini — kalau tidak, "Batalkan settle" akan
   * membatalkan dirinya sendiri pada bacaan berikutnya.
   */
  settleTombstones?: string[]
  /** true = akun ini sudah dihapus user → jangan isi ulang data contoh */
  purged?: boolean
}

export interface JointState {
  wallet: JointWallet
  transactions: JointTransaction[]
  settlements: Record<string, JointSettlementRecord>
  /**
   * Anggota kantong (uuid Supabase). Di produksi isinya datang dari
   * `joint_members` + pemilik; di mode demo/test berisi dua id contoh.
   */
  members: string[]
  /**
   * PEMILIK dompet menurut server. Hanya pemilik yang boleh menghapus dompet
   * atau mengeluarkan anggota; `null` = jalur lokal / belum terbaca.
   */
  ownerId: string | null
  /** id user pemanggil — `null` = belum diketahui (belum ada sesi) */
  viewerId: string | null
  /** nama panggilan anggota; yang tidak ada di peta memakai sebutan netral */
  memberNames: Record<string, string>
  /** id baris yang dihapus user (tombstone) */
  removedIds: string[]
  /** bulan yang pembatalan settle-nya belum terkirim ke server */
  settleTombstones: string[]
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
/**
 * Dompet bersama KOSONG (tanpa nama) — state awal di produksi & wujud setelah
 * Hapus Akun. Alur "Ajak Pasangan" punya tempat menulis nama baru di atasnya.
 */
const EMPTY_JOINT_WALLET: JointWallet = { ...INITIAL_JOINT_WALLET, name: '' }

/*
 * STATE AWAL SELALU KOSONG (paket 65 · Tugas A).
 *
 * `SEED_JOINT_*` tinggal jadi BAHAN test (`resetJointStore()`) & bahan bootstrap
 * demo — BUKAN lagi isi awal store. Akun nyata (produksi) mulai dari kantong
 * kosong; akun demo diisi lewat `seedDemoDataOnce()`.
 */
const SEED_JOINT_WALLET: JointWallet = INITIAL_JOINT_WALLET
const SEED_JOINT_TRANSACTIONS: JointTransaction[] = INITIAL_JOINT_TRANSACTIONS
const SEED_JOINT_MEMBERS: string[] = DEMO_PARTNER_JOINED
  ? [JOINT_ME.id, JOINT_PARTNER.id]
  : [JOINT_ME.id]

/* ── PENAMPILAN DUA PESERTA (bukan identitas) ────────────────────────────────
   `JOINT_ME`/`JOINT_PARTNER` di `lib/data/joint.ts` adalah identitas CONTOH
   (`user_a` bernama "Jon"). Yang dibawa ke produksi hanya bagian TAMPILANNYA
   (avatar & kelas warna); `id` dan `name` selalu diganti data sungguhan oleh
   `jointParticipants()`. Dengan pemisahan ini, tidak ada jalur produksi yang
   bisa memunculkan nama "Jon"/"Dany" lagi. */
const ME_PERSONA: JointPerson = {
  ...JOINT_ME,
  id: '',
  name: 'Kamu',
}
const PARTNER_PERSONA: JointPerson = {
  ...JOINT_PARTNER,
  id: '',
  name: 'Pasangan',
}

/** snapshot untuk render server & hidrasi — SELALU KOSONG sampai user mengisi */
const SERVER_SNAPSHOT: JointSnapshot = Object.freeze({
  wallet: EMPTY_JOINT_WALLET,
  transactions: [] as JointTransaction[],
  settlements: {},
  members: [] as string[],
  ownerId: null,
  viewerId: null,
  memberNames: {},
  removedIds: [] as string[],
  settleTombstones: [] as string[],
  hydrated: false,
})

/** snapshot seed — BAHAN test (`resetJointStore()`), bukan state awal runtime */
const SEED_SNAPSHOT: JointSnapshot = Object.freeze({
  wallet: SEED_JOINT_WALLET,
  transactions: SEED_JOINT_TRANSACTIONS,
  settlements: {},
  members: SEED_JOINT_MEMBERS,
  ownerId: JOINT_ME.id,
  viewerId: JOINT_ME.id,
  memberNames: { [JOINT_ME.id]: JOINT_ME.name, [JOINT_PARTNER.id]: JOINT_PARTNER.name },
  removedIds: [] as string[],
  settleTombstones: [] as string[],
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
  wallet: EMPTY_JOINT_WALLET,
  transactions: [],
  settlements: {},
  members: [],
  ownerId: null,
  viewerId: null,
  memberNames: {},
  removedIds: [] as string[],
  settleTombstones: [] as string[],
  hydrated: true,
})

let live: JointSnapshot = SERVER_SNAPSHOT
let accountPurged = false
let hydrateStarted = false
/** akun pemilik cache perangkat ini — cache kantong bersama DIPISAH per akun */
let deviceOwnerUserId: string | null | undefined = undefined
let hydratedOnce = false
const listeners = new Set<() => void>()

/** dompet bersama di SERVER (uuid) — `null` = tidak ada sesi / belum terbaca */
let remoteWalletId: string | null = null
/** id user sesi Supabase (dipakai masker catatan privat saat baris remote masuk) */
let remoteViewerId: string | null = null
/** channel realtime yang sedang hidup (dipakai `stopJointRealtime`) */
let realtime: JointRealtimeHandle | null = null
/**
 * Langganan khusus KEANGGOTAAN: tanpa ini, pemilik kantong tidak pernah tahu
 * pasangannya bergabung sampai ia me-refresh. Dulu satu-satunya pemicu adalah
 * tombol "Simulasi" di perangkatnya sendiri — tombol itu sudah dihapus, jadi
 * sekarang keanggotaan datang dari server dan sampai lewat channel ini.
 */
let membersRealtime: WealthRealtimeHandle | null = null
/**
 * Langganan tabel INDUK `joint_wallets`. Tanpa ini, perangkat anggota tidak
 * pernah menerima sinyal bahwa dompetnya dihapus / namanya diubah; layar
 * anggota bisa tetap menampilkan dompet hantu sampai aplikasi ditutup.
 */
let walletRealtime: WealthRealtimeHandle | null = null
/**
 * Langganan tabel `joint_settlements` — penanda settle per bulan. Tanpa ini,
 * akun yang tidak menekan tombol baru tahu statusnya setelah memuat ulang
 * halaman, padahal settle adalah kesepakatan DUA orang.
 */
let settlementsRealtime: WealthRealtimeHandle | null = null
/**
 * true = dompet yang tadinya terpasang sudah TIDAK ADA di server (dihapus
 * pemilik, atau kita dikeluarkan). Halaman memakainya untuk memberi tahu user
 * sekali; state perangkat sendiri sudah dibersihkan oleh `clearJointAfterLoss`.
 */
let remoteJointLost = false
/**
 * true = percobaan baca terakhir GAGAL padahal dompet server sudah pernah
 * terpasang (jadi kita tahu barisnya seharusnya ada di sana).
 *
 * Kenapa perlu: layar punya empty state yang berkata "Dompet bersama kalian
 * masih kosong". Kalau bacaan jaringan gagal, kalimat itu jadi KLAIM PALSU —
 * persis yang dilaporkan pemilik produk (akun kedua menampilkan 0 catatan
 * padahal server berisi 3). Dengan penanda ini, layar bisa bilang "gagal
 * nyegerin dari server, coba lagi" alih-alih mengaku dompetnya kosong.
 */
let remoteReadFailed = false

export function getJointSnapshot(): JointSnapshot {
  return live
}

/** true = data yang tampil mungkin tertinggal karena bacaan server terakhir gagal */
export function jointRemoteReadFailed(): boolean {
  return remoteReadFailed
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
  saveDeviceState<PersistedJoint>(accountStateKey(JOINT_STATE_KEY, deviceOwnerUserId), {
    version: JOINT_STATE_VERSION,
    wallet: snapshot.wallet,
    transactions: snapshot.transactions.map(withoutArrivalBadge),
    settlements: snapshot.settlements,
    members: [...snapshot.members],
    ownerId: snapshot.ownerId,
    viewerId: snapshot.viewerId,
    memberNames: { ...snapshot.memberNames },
    removedIds: [...snapshot.removedIds],
    settleTombstones: [...snapshot.settleTombstones],
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
  /* daftar dasar = HANYA yang tersimpan (kunjungan pertama = KOSONG, paket 65) */
  const base = storedRows
  const firstVisit = !purged && storedRows.length === 0
  const extras = current.transactions.filter(
    (tx) =>
      (firstVisit || !SEED_JOINT_TRANSACTIONS.some((seed) => seed.id === tx.id)) &&
      !base.some((row) => row.id === tx.id),
  )
  const transactions = [...base, ...extras].map(withoutArrivalBadge)

  const storedMembers = known ? (persisted?.members ?? []).filter((id) => Boolean(id)) : []
  const memberBase = storedMembers
  /* anggota yang bergabung di SESI INI (mis. pasangan menerima undangan) tidak
     boleh hilang saat state tersimpan dibaca — yang ikut hanya yang BUKAN
     anggota seed (kecuali kunjungan pertama: state hidup test berisi seed),
     supaya kantong yang sudah dihapus tidak "lahir lagi" */
  const memberFirstVisit = !purged && storedMembers.length === 0
  const memberExtras = current.members.filter(
    (id) => memberFirstVisit || !SEED_JOINT_MEMBERS.includes(id),
  )
  const members = [...new Set([...memberBase, ...memberExtras])]

  const storedWallet = known ? persisted?.wallet : undefined
  const wallet =
    storedWallet && storedWallet.name.trim().length > 0
      ? storedWallet
      : purged
        ? EMPTY_JOINT_WALLET
        : current.wallet

  /* TOMBSTONE digabung (union): hapus di perangkat ini bertahan, dan hapus yang
     sudah tersimpan tidak "hidup lagi" saat state dibaca ulang. Inilah yang
     menutup lubang "kantong baru kosong": setelah `createJointPocket()` menandai
     semua baris seed terhapus, daftar tersimpannya kosong — tanpa tombstone,
     hidrasi berikutnya akan menghidupkan kembali catatan contoh itu. */
  const storedRemoved = known ? (persisted?.removedIds ?? []).filter((id) => id) : []
  const removedIds = [...new Set([...storedRemoved, ...current.removedIds])]
  /* Tombstone settle dibaca dengan aturan yang sama supaya pembatalan yang
     belum terkirim tidak "hidup lagi" setelah refresh. */
  const storedSettleTombstones = known
    ? (persisted?.settleTombstones ?? []).filter((month) => /^\d{4}-\d{2}$/.test(month))
    : []
  const settleTombstones = [
    ...new Set([...storedSettleTombstones, ...current.settleTombstones]),
  ]

  return {
    wallet,
    transactions,
    settlements: { ...(known ? (persisted?.settlements ?? {}) : {}), ...current.settlements },
    members,
    ownerId: current.ownerId ?? (known ? (persisted?.ownerId ?? null) : null),
    /* pemilik sesi & nama anggota ikut tersimpan: tanpa ini, setelah refresh
       layar kembali menebak siapa "Kamu" (dan dulu menebaknya dengan nama
       karangan "Jon") */
    viewerId: current.viewerId ?? persisted?.viewerId ?? null,
    memberNames: { ...(persisted?.memberNames ?? {}), ...current.memberNames },
    removedIds,
    settleTombstones,
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
 * Gabungkan penanda settle SERVER dengan yang ada di perangkat. Fungsi MURNI
 * (diuji langsung) — dipakai `applyRemoteJointWallet()`.
 *
 * Aturan:
 *   · penanda server adalah KESEPAKATAN BERSAMA → jadi dasar;
 *   · record lokal yang masih `pendingSync` (ditulis saat offline) MENANG, supaya
 *     tombol yang sudah ditekan tidak "batal sendiri" saat hidrasi;
 *   · bulan di `tombstones` (pembatalan belum terkirim) tidak dihidupkan lagi;
 *   · record lokal yang SUDAH tersinkron lalu hilang dari server berarti
 *     pasangan membatalkannya → ikut hilang di sini.
 */
export function mergeJointSettlements(
  local: Record<string, JointSettlementRecord>,
  remote: Record<string, JointSettlementRecord>,
  { tombstones = [] }: { tombstones?: readonly string[] } = {},
): Record<string, JointSettlementRecord> {
  const out: Record<string, JointSettlementRecord> = {}
  for (const [month, record] of Object.entries(remote)) {
    if (tombstones.includes(month)) continue
    out[month] = record
  }
  for (const [month, record] of Object.entries(local)) {
    if (tombstones.includes(month)) continue
    if (record.pendingSync) out[month] = record
  }
  return out
}

/**
 * Penanda settle LAMA (dibuat sebelum 11 Nov 2026) belum punya `settledAt` dan
 * belum pernah dikirim ke server — dulu ia hanya hidup di IndexedDB perangkat.
 *
 * Kalau dibiarkan, `mergeJointSettlements()` akan membuangnya begitu server
 * terbaca (karena "tidak ada di server = dibatalkan pasangan"), sehingga user
 * yang bulan ini SUDAH settle tiba-tiba melihat "Belum Impas" setelah update.
 * Fungsi ini menandainya `pendingSync` supaya `retryPendingJointRows()`
 * mengunggahnya sekali, lalu mengisi waktu yang tidak pernah dicatat itu dengan
 * saat migrasi berjalan (bukan tanggal karangan "1 <bulan>").
 */
export function upgradeLegacySettlements(
  records: Record<string, JointSettlementRecord>,
  stamp: { date: string; time: string },
): { settlements: Record<string, JointSettlementRecord>; upgraded: number } {
  let upgraded = 0
  const settlements: Record<string, JointSettlementRecord> = {}
  for (const [month, record] of Object.entries(records)) {
    if (record.settledAt) {
      settlements[month] = record
      continue
    }
    upgraded += 1
    settlements[month] = {
      ...record,
      settledAt: stamp.date,
      settledTime: record.settledTime ?? stamp.time,
      pendingSync: true,
    }
  }
  return { settlements, upgraded }
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
      !remoteIds.has(tx.id) &&
      /* baris lokal yang SUDAH terkirim ke server membawa `remoteId`; barisnya
         akan datang lagi lewat REST/realtime dengan id server. Tanpa pemeriksaan
         ini, satu catatan tampil DUA KALI setelah refresh (dan totalnya dobel). */
      !(tx.remoteId && remoteIds.has(tx.remoteId)) &&
      !INITIAL_JOINT_TRANSACTIONS.some((seed) => seed.id === tx.id),
  )
  /* Baris server tidak tahu `cashRowId` (baris kas pribadi hanya ada di
     perangkat pemilik sesi). Kalau baris lokal yang sama sudah punya tautannya,
     tautan itu dibawa ke baris server — supaya hapus catatan setelah refresh
     tetap mencabut baris kasnya. */
  const cashByRemoteId = new Map(
    localRows
      .filter((tx) => tx.remoteId && tx.cashRowId)
      .map((tx) => [tx.remoteId as string, tx.cashRowId as string]),
  )
  const remote = remoteRows.map((row) => {
    const cashRowId = cashByRemoteId.get(row.id)
    return cashRowId ? { ...row, cashRowId } : row
  })
  return [...remote, ...localExtras].map(withoutArrivalBadge)
}

async function hydrateJointStore(): Promise<void> {
  if (hydrateStarted) return
  hydrateStarted = true

  const userId = await resolveDeviceOwner(JOINT_STATE_KEY, (await browserUserId()) ?? null)
  deviceOwnerUserId = userId
  const persisted = await loadDeviceState<PersistedJoint>(accountStateKey(JOINT_STATE_KEY, userId))
  accountPurged = persisted?.purged === true

  const merged = mergeJointState(persisted)
  /* MIGRASI SEKALI: penanda settle user lama (localStorage) dipindahkan ke store
     supaya status "bulan ini sudah settle" tidak hilang saat app diperbarui. */
  const legacy = mergeLegacySettlements(merged.settlements, readJointSettlementRecords())
  const baseSettlements = legacy.migrated > 0 ? legacy.settlements : merged.settlements
  /* Penanda lama belum punya waktu & belum pernah terkirim ke server: tandai
     `pendingSync` supaya diunggah, bukan dibuang saat bacaan server pertama. */
  const upgraded = upgradeLegacySettlements(baseSettlements, {
    date: deviceDateISO(),
    time: clockLabelOf(new Date()),
  })
  live = { ...merged, settlements: upgraded.settlements }
  hydratedOnce = true
  if (legacy.migrated > 0 || upgraded.upgraded > 0) persist(live)
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
  const members = remote.members.length > 0 ? remote.members : live.members
  /* Nama anggota: SERVER yang menentukan, tapi nama yang sudah terbaca tetap
     dipakai selama orangnya masih anggota (RPC nama bisa gagal sementara tanpa
     membuat nama yang sudah sah hilang). Nama milik orang yang sudah keluar
     dibuang, supaya tidak menempel ke kantong lain. */
  const memberNames: Record<string, string> = {}
  for (const id of members) {
    const name = remote.memberNames[id] ?? live.memberNames[id]
    if (name) memberNames[id] = name
  }
  live = {
    ...live,
    wallet: remote.wallet,
    members,
    ownerId: remote.ownerId ?? live.ownerId,
    viewerId: remote.viewerId,
    memberNames,
    transactions: mergeJointRows(live.transactions, remote.rows),
    /* Penanda settle ikut dibaca dari server: inilah yang membuat akun
       pasangan melihat "sudah settle" tanpa menekan tombolnya sendiri.
       `null` = tabelnya gagal dibaca → penanda perangkat dipertahankan. */
    settlements: remote.settlements
      ? mergeJointSettlements(live.settlements, remote.settlements, {
          tombstones: live.settleTombstones,
        })
      : live.settlements,
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
  if (!remote) {
    /* Tabelnya kosong BUKAN berarti "tidak ada sesi": bisa jadi dompet memang
       sudah dihapus pemilik / kita sudah dikeluarkan. Bedakan lewat RPC status
       akses; `null` (backend tak terbaca) TIDAK menghapus data perangkat. */
    const cleared = await clearJointIfRemoteGone()
    /* Dompet server pernah terbaca tapi sekarang tak bisa dibaca & tak ada
       kepastian "sudah hilang" → tandai agar layar tidak mengklaim kosong. */
    if (!cleared && remoteWalletId) remoteReadFailed = true
    return
  }

  remoteReadFailed = false
  applyRemoteJointWallet(remote)
  subscribeRemoteJointChannels(remote.wallet.id)
}

/**
 * Pasang seluruh channel realtime untuk satu dompet: transaksi (insert/update/
 * delete), keanggotaan, dan tabel INDUK dompet. Dipisah supaya perpindahan
 * dompet (mis. dompet lama dihapus, lalu akun ini anggota dompet lain) ikut
 * memindahkan langganannya — bukan menempel di dompet yang sudah tidak ada.
 */
function subscribeRemoteJointChannels(walletId: string): void {
  stopJointRealtime()
  realtime = subscribeJointTransactions(
    walletId,
    applyRemoteJointRow,
    applyRemoteJointDelete,
    applyRemoteJointUpdate,
  )
  /* Perubahan keanggotaan (anggota lain gabung/keluar) & perubahan/penghapusan
     tabel INDUK dompet → baca ulang kantong dari server. */
  membersRealtime = subscribeTables(`joint-members-${walletId}`, ['joint_members'], () => {
    void refreshRemoteJoint()
  })
  walletRealtime = subscribeTables(`joint-wallet-${walletId}`, ['joint_wallets'], () => {
    void refreshRemoteJoint()
  })
  /* Penanda settle (tabel `joint_settlements`) → setengah dari cerita
     "sudah settle" hidup di sini. Tanpa langganan ini, akun pasangan baru tahu
     setelah halaman dimuat ulang. */
  settlementsRealtime = subscribeTables(
    `joint-settlements-${walletId}`,
    ['joint_settlements'],
    () => {
      void refreshRemoteJoint()
    },
  )
}

/**
 * Bersihkan dompet di perangkat ketika SERVER memastikan dompetnya sudah tidak
 * ada (dihapus pemilik) atau keanggotaan kita sudah dilepas.
 *
 * Seluruh catatan ditandai tombstone (bukan dibuang) supaya Undo/audit masih
 * mungkin dan catatan contoh tidak "lahir lagi" saat daftar kosong dibaca ulang.
 * Setelah ini layar kembali ke dua pilihan (buat / gabung) tanpa dompet hantu.
 */
export function clearJointAfterLoss(): void {
  const viewerId = live.viewerId ?? remoteViewerId
  const removedIds = [
    ...new Set([...live.removedIds, ...live.transactions.map((tx) => tx.id)]),
  ]
  stopJointRealtime()
  remoteWalletId = null
  remoteViewerId = null
  remoteJointLost = true
  remoteReadFailed = false
  live = { ...EMPTY_SNAPSHOT, viewerId, removedIds }
  persist(live)
  emit()
}

/** true SEKALI setelah dompet di server hilang; halaman memakainya untuk toast */
export function consumeJointPocketRemoved(): boolean {
  const lost = remoteJointLost
  remoteJointLost = false
  return lost
}

/** periksa apakah dompet yang terpasang masih ada & kita masih anggotanya */
async function clearJointIfRemoteGone(): Promise<boolean> {
  const walletId = remoteWalletId
  if (!walletId) return false
  const access = await readRemoteJointAccess(walletId)
  if (access !== 'none') return false
  clearJointAfterLoss()
  return true
}

/**
 * Baca ulang kantong dari server lalu pasang ke store. Dipakai langganan
 * keanggotaan/dompet dan tombol "coba lagi"; `false` = tidak ada yang berubah
 * (tanpa sesi/server, atau backend tidak bisa menjawab).
 *
 * `true` juga dikembalikan saat dompet ternyata SUDAH DIHAPUS: state perangkat
 * ikut dibersihkan, jadi pemanggil tahu layar berubah.
 */
export async function refreshRemoteJoint(): Promise<boolean> {
  const remote = await readRemoteJointWallet()
  if (!remote) {
    const cleared = await clearJointIfRemoteGone()
    if (!cleared && remoteWalletId) remoteReadFailed = true
    return cleared
  }
  remoteReadFailed = false
  const previousWalletId = remoteWalletId
  applyRemoteJointWallet(remote)
  /* Dompet berpindah (dompet lama dihapus / akun ini anggota dompet lain):
     channel transaksi harus ikut pindah, kalau tidak baris baru dari dompet
     yang sedang tampil tidak pernah sampai. */
  if (previousWalletId !== remote.wallet.id) subscribeRemoteJointChannels(remote.wallet.id)
  return true
}

/* ── GABUNG KE KANTONG YANG SUDAH ADA (sisi B) ───────────────────────────────
   Jalur ini yang dulu tidak ada di dalam aplikasi. Orang yang diundang hanya
   bisa gabung kalau ia membuka tautan `/join/<kode>` dari chat; kalau yang
   dikirim cuma KODE 6 karakter, halaman `/joint` miliknya tidak punya tempat
   memasukkan apa pun — dan fiturnya terbaca sebagai "tidak ada".

   Yang ditulis di sini BUKAN state perangkat: `catetind_accept_invite`
   (migrasi `20261030120000_catetind_join_claim.sql`) menambah baris
   `joint_members` dan menandai kode terpakai dalam satu transaksi. Setelah itu
   kantong dibaca ULANG dari server (`attachRemoteJoint`) supaya uuid dompet,
   nama anggota, catatan yang sudah ada, dan langganan realtime langsung
   terpasang — bukan menampilkan kantong lokal kosong yang terlihat seperti
   data hilang.

   Hasilnya dibedakan apa adanya:
     · `joined`  — keanggotaan baru ditulis;
     · `member`  — sudah anggota (idempoten, kode tidak dibakar);
     · `creator` — kode miliknya sendiri: TIDAK ada yang ditulis, jadi UI tidak
                   boleh mengaku "berhasil gabung";
     · `ok:false` — server menolak / tanpa sesi, dengan alasannya.
   ─────────────────────────────────────────────────────────────────────────── */
export type JoinJointOutcome = 'joined' | 'member' | 'creator' | 'full'

export interface JoinJointResult {
  ok: boolean
  outcome: JoinJointOutcome | null
  /** nama dompet dari server (null = belum terbaca) */
  walletName: string | null
  error?: string
}

/** panjang kode undangan kanon (6 karakter, lihat `INVITE_CODE_LENGTH`) */
const JOIN_CODE_PATTERN = /^[A-Z0-9]{6}$/

export async function joinJointPocketByCode(code: string): Promise<JoinJointResult> {
  const normalized = code.trim().toUpperCase()
  if (!JOIN_CODE_PATTERN.test(normalized)) {
    return { ok: false, outcome: null, walletName: null, error: 'Kode undangan harus 6 karakter.' }
  }

  const accepted = await acceptInviteRemote(normalized)
  if (!accepted.ok) {
    return {
      ok: false,
      outcome: null,
      walletName: null,
      error: accepted.error ?? 'Undangan tidak bisa diproses. Coba lagi sebentar ya.',
    }
  }

  if (accepted.outcome === 'creator') {
    return { ok: true, outcome: 'creator', walletName: accepted.walletName }
  }

  /* Kantong sudah penuh: TIDAK ada keanggotaan yang ditulis. Ini dikatakan apa
     adanya (bukan "berhasil gabung") supaya user tidak menunggu data yang tidak
     akan pernah muncul. */
  if (accepted.outcome === 'full') {
    return {
      ok: false,
      outcome: 'full',
      walletName: accepted.walletName,
      error: 'Dompet ini sudah penuh (maksimal 8 orang).',
    }
  }

  await attachRemoteJoint()
  /* RPC lama (sebelum migrasi join_claim) tidak mengembalikan `join_outcome`;
     keanggotaan yang terbaca dari server dipakai sebagai bukti, bukan tebakan. */
  const outcome: JoinJointOutcome =
    accepted.outcome ?? (jointPartnerJoined(live) ? 'joined' : 'member')

  return {
    ok: true,
    outcome,
    walletName: accepted.walletName ?? live.wallet.name ?? null,
  }
}

/** hentikan langganan realtime (idempoten — dipakai Hapus Akun & test) */
export function stopJointRealtime(): void {
  realtime?.stop()
  realtime = null
  membersRealtime?.stop()
  membersRealtime = null
  walletRealtime?.stop()
  walletRealtime = null
  settlementsRealtime?.stop()
  settlementsRealtime = null
}

/**
 * Kantong yang boleh muncul sebagai pembayar / arah transfer.
 *
 * Buku besar ini DUA ORANG: yang sah adalah anggota kantong ini (`members`) dan
 * pemilik sesi. Di perangkat yang BELUM punya sesi (mode demo/test), id contoh
 * (`user_a`/`user_b`) tetap diterima supaya data seed masih bisa dipakai —
 * tapi begitu `viewerId` diketahui (produksi), id contoh TIDAK lagi sah sebagai
 * peserta baru: `user_b` berarti "pasangan yang tidak pernah bergabung".
 */
function isAllowedPocket(snapshot: JointSnapshot, userId: string): boolean {
  if (!userId) return false
  const viewerId = snapshot.viewerId
  const partnerId = viewerId ? (snapshot.members.find((id) => id !== viewerId) ?? null) : null
  if (viewerId) {
    if (userId === viewerId) return true
    if (partnerId && userId === partnerId) return true
    return snapshot.members.includes(userId)
  }
  if (remoteWalletId) return snapshot.members.includes(userId)
  return userId === JOINT_ME.id || userId === JOINT_PARTNER.id || snapshot.members.includes(userId)
}


/* ── API TULIS — SATU-SATUNYA JALUR MENULIS KANTONG BERSAMA ────────────────
   Komponen tidak boleh menyentuh `transactions`/`wallet`/`settlements` langsung:
   halaman, modal rekap, hasil ekspor, dan Hapus Akun membaca state yang sama,
   jadi setiap perubahan harus lewat pintu yang juga menyimpan ke perangkat.
   `null` = input tidak sah → TIDAK ada yang ditulis (bukan ditulis sebagian). */

/** roster yang dipakai MEMVALIDASI bentuk split: anggota dompet + id demo lama
 *  (`user_a`/`user_b`) yang masih muncul di data seed. Id di luar itu TIDAK
 *  boleh dipakai sebagai peserta — porsi tidak bisa dibebankan ke orang yang
 *  bukan anggota dompet. */
function splitRosterFor(snapshot: JointSnapshot, split: SplitSpec, payerId: string): string[] {
  const members = snapshot.members.length > 0 ? snapshot.members : [payerId]
  const ids = new Set<string>(members)
  ids.add(payerId)
  const legacy = new Set([JOINT_ME.id, JOINT_PARTNER.id])
  const add = (id: string | undefined) => {
    if (!id) return
    if (members.includes(id) || legacy.has(id)) ids.add(id)
  }
  if (split.type === 'percentage') {
    for (const id of Object.keys(split.percents)) add(id)
  } else if (split.type === 'nominal') {
    for (const id of Object.keys(split.amounts)) add(id)
  } else if (split.type === 'single_payer') {
    add(split.payerId)
  }
  /* peserta mode Bagi Rata SENGAJA tidak ditambahkan: mereka wajib anggota sah
     dompet ini (kalau tidak, porsi bisa dibebankan ke orang yang tidak ada). */
  return [...ids]
}

export interface NewJointTransactionInput {
  description: string
  amount: number
  /**
   * Jenis catatan. `expense` (bawaan) mengurangi/menambah kewajiban seperti
   * biasa; `income` adalah uang yang MASUK ke kas bersama (tidak menimbulkan
   * kewajiban, hanya menambah talangan penyetornya). Dulu pilihan "Pemasukan"
   * dari form dibuang di sini sehingga selalu tercatat sebagai pengeluaran.
   */
  kind?: 'expense' | 'income'
  /** bentuk kanonik pembagian; kosong = bagi rata */
  split?: SplitSpec | null
  /** true = isi catatannya cuma terlihat pembuatnya (nominalnya tetap ditimbang) */
  isPrivate?: boolean
  /** kantong yang keluar uang — pemilih "Siapa yang nalangin?" */
  paidByUserId: string
  /** tanggal `YYYY-MM-DD`; default HARI INI di perangkat (bukan jangkar seed) */
  dateISO?: string
  /** jam `HH:MM`; default jam dinding SAAT DISIMPAN (bukan saat render) */
  timeLabel?: string
  /** kategori; default `JOINT_DEFAULT_CATEGORY` (atau kategori privat) */
  category?: string
  /**
   * Dompet PRIBADI yang benar-benar mengeluarkan uang (opsional).
   *
   * Kalau diisi DAN yang menalangi adalah pemilik sesi, store juga menulis satu
   * baris kas (`postExpense`, idempoten lewat `clientTxId = joint-<id>`). Kalau
   * kosong, catatan ini murni buku besar patungan dan tidak menggeser saldo
   * siapa pun — dan itu yang dikatakan UI.
   */
  cashWalletId?: string
}

/**
 * Catat satu pengeluaran bareng.
 *
 * Yang membuat catatan ini benar bukan nominalnya, melainkan DUA hal yang harus
 * eksplisit: `paidByUserId` (kantong yang keluar uang — bukan siapa yang
 * mengetik) dan `split` (porsi tiap orang). Keduanya divalidasi di sini, jadi
 * tidak mungkin ada baris yang "kantongnya" bukan anggota kantong ini.
 */
/**
 * Kirim SATU catatan kantong bersama ke server (paket 64 · Paket D). `false`
 * kalau tidak ada sesi/dompet server (perilaku lama: lokal saja). Baris yang
 * berhasil disimpan mencatat `remoteId`-nya supaya tidak terkirim dua kali.
 */
async function syncJointRow(row: JointTransaction): Promise<boolean> {
  if (!remoteWalletId || !remoteViewerId) return false
  const remoteId = row.remoteId ?? randomUuid()
  const pocketId = row.paidByUserId && isUuid(row.paidByUserId) ? row.paidByUserId : remoteViewerId
  /* Baris yang SUDAH punya id server di-UPDATE; kalau barisnya sudah tidak ada
     (mis. Undo setelah hapus), jatuh ke INSERT dengan id yang sama. Tanpa
     cabang update ini, perubahan pembagian/kantong pembayar tidak pernah sampai
     ke perangkat lain (hanya di perangkat pengubah). */
  let ok = row.remoteId
    ? await updateJointTransactionOnServer(row, row.remoteId)
    : false
  if (!ok) {
    ok = await pushJointTransactionToServer(row, {
      walletId: remoteWalletId,
      viewerId: remoteViewerId,
      pocketId,
      remoteId,
    })
  }
  if (!ok) return false
  if (row.remoteId !== remoteId || row.pendingSync) {
    live = {
      ...live,
      transactions: live.transactions.map((tx) =>
        tx.id === row.id ? { ...tx, remoteId, pendingSync: undefined } : tx,
      ),
    }
    persist(live)
    emit()
  }
  return true
}

/**
 * Tandai satu baris yang GAGAL sampai ke server (`pendingSync`).
 *
 * Baris tetap tampil (offline-first), tapi tidak lagi menyamar sebagai catatan
 * yang sudah dilihat pasangan — timeline memberi chip "Belum tersinkron" dan
 * store mencoba mengirimnya lagi (`retryPendingJointRows`).
 */
function markJointRowPending(id: string): void {
  const target = live.transactions.find((tx) => tx.id === id)
  if (!target || target.pendingSync) return
  live = {
    ...live,
    transactions: live.transactions.map((tx) => (tx.id === id ? { ...tx, pendingSync: true } : tx)),
  }
  persist(live)
  emit()
}

/**
 * Kirim ulang SEMUA baris yang masih menunggu server.
 *
 * Dipanggil saat halaman `/joint` dibuka, saat tab kembali terlihat, saat
 * jaringan kembali online, dan sekali setelah catatan baru gagal dikirim.
 * `true` = tidak ada yang tertinggal (atau memang tidak ada yang perlu
 * dikirim); `false` = masih ada yang gagal, layar boleh menyarankan coba lagi.
 *
 * Dompet server belum terbaca (mis. catatan dibuat sebelum hidrasi selesai) →
 * baca ulang dompetnya dulu, baru kirim. Tanpa langkah ini, baris yang lahir
 * pada detik-detik awal tetap lokal selamanya walau server sehat — persis
 * keadaan yang membuat dua akun berbeda isi.
 */
export async function retryPendingJointRows(): Promise<boolean> {
  let pending = live.transactions.filter((tx) => tx.pendingSync && !live.removedIds.includes(tx.id))
  const pendingSettlements = Object.values(live.settlements).filter((record) => record.pendingSync)
  const pendingSettlementsUndo = [...live.settleTombstones]
  if (pending.length === 0 && pendingSettlements.length === 0 && pendingSettlementsUndo.length === 0) {
    return true
  }

  if (!remoteWalletId || !remoteViewerId) {
    const attached = await refreshRemoteJoint()
    if (!attached || !remoteWalletId || !remoteViewerId) return false
    pending = live.transactions.filter((tx) => tx.pendingSync && !live.removedIds.includes(tx.id))
  }

  let allOk = true

  /* PENANDA SETTLE: yang belum terkirim dikirim, yang pembatalannya belum
     terkirim dihapus. Dijalankan SEBELUM baris biasa karena status "sudah
     settle" itulah yang paling terlihat pasangan. */
  if (remoteWalletId && remoteViewerId) {
    const walletId = remoteWalletId
    const viewerId = remoteViewerId
    for (const record of pendingSettlements) {
      const ok = await pushJointSettlement(record, { walletId, viewerId })
      if (ok) clearSettlementPending(record.month)
      else allOk = false
    }
    for (const month of pendingSettlementsUndo) {
      const ok = await deleteRemoteJointSettlement(walletId, month)
      if (ok) clearSettlementTombstone(month)
      else allOk = false
    }
  }

  for (const tx of pending) {
    const ok = await syncJointRow(tx)
    if (!ok) allOk = false
  }
  return allOk
}

/** penanda settle sudah sampai server → lepas label `pendingSync` */
function clearSettlementPending(month: string): void {
  const target = live.settlements[month]
  if (!target?.pendingSync) return
  const next: JointSettlementRecord = { ...target }
  delete next.pendingSync
  live = { ...live, settlements: { ...live.settlements, [month]: next } }
  persist(live)
  emit()
}

/** pembatalan settle sudah sampai server → tombstone tidak diperlukan lagi */
function clearSettlementTombstone(month: string): void {
  if (!live.settleTombstones.includes(month)) return
  live = {
    ...live,
    settleTombstones: live.settleTombstones.filter((item) => item !== month),
  }
  persist(live)
  emit()
}

/**
 * Kirim SATU baris ke server & tandai pending kalau gagal — dipakai SEMUA jalur
 * tulis (tambah, ubah pembagian, pindah kantong, undo hapus).
 *
 * Tanpa penanda ini, catatan yang cuma ada di perangkat pengirim terlihat
 * identik dengan catatan yang sudah dilihat pasangan: akar keluhan "di akun
 * pertama ada transaksi, di akun kedua kosong".
 */
function syncJointRowTracked(row: JointTransaction): void {
  void syncJointRow(row).then(async (ok) => {
    if (ok) return
    /* Tanpa sesi sama sekali, catatan memang hidup lokal (mode tanpa login) —
       bukan kegagalan sinkronisasi yang perlu ditakuti user. */
    const hasSession = Boolean(await browserUserId())
    if (hasSession) markJointRowPending(row.id)
  })
}

export function addJointTransaction(input: NewJointTransactionInput): JointTransaction | null {
  const amount = Math.round(Number(input.amount))
  if (!Number.isFinite(amount) || amount <= 0) return null
  if (!isAllowedPocket(live, input.paidByUserId)) return null

  const isPrivate = input.isPrivate === true
  const kind: 'expense' | 'income' = input.kind === 'income' ? 'income' : 'expense'
  /* Porsi divalidasi SEBELUM ditulis: nominal mode "Nominal Custom" wajib pas
     dengan nominal transaksi, dan peserta mode Bagi Rata wajib anggota sah.
     Tanpa ini, pembagian 3–4 orang bisa tersimpan sebagai angka yang mustahil
     dan perangkat anggota lain menampilkan total yang berbeda. */
  const requestedSplit: SplitSpec = input.split ?? { type: 'equal' }
  const roster = splitRosterFor(live, requestedSplit, input.paidByUserId)
  if (kind === 'expense' && !isValidSplit(requestedSplit, roster, amount)) return null
  const tx: JointTransaction = {
    id: nextTransactionId(),
    /* pembuat catatan = PEMILIK SESI (uuid), bukan id contoh. Dulu nilainya
       selalu `JOINT_ME.id` ('user_a'), sehingga baris buatan akun sungguhan
       mengaku ditulis orang yang tidak ada — dan aturan privasi/izin jadi
       menebak. */
    userId: live.viewerId ?? JOINT_ME.id,
    paidByUserId: input.paidByUserId,
    description:
      input.description.trim() ||
      (kind === 'income' ? JOINT_DEFAULT_INCOME_DESCRIPTION : JOINT_DEFAULT_DESCRIPTION),
    amount,
    /* catatan privat TIDAK menampilkan kategorinya (kategori apa pun = bocoran
       isi); nominalnya tetap ikut dihitung — lihat `weighedPaidBy()` */
    category: isPrivate ? PRIVATE_CATEGORY : (input.category ?? JOINT_DEFAULT_CATEGORY),
    /* TANGGAL HARI INI (perangkat), bukan jangkar seed. Sebelumnya catatan yang
       baru dibuat diberi tanggal contoh 2026-09-25, jadi ia tidak pernah masuk
       bulan berjalan dan "Total Pengeluaran Bersama" tetap Rp 0. */
    date: input.dateISO ?? deviceDateISO(),
    time: input.timeLabel ?? clockLabelOf(new Date()),
    split: kind === 'income' ? { type: 'equal' } : requestedSplit,
    ...(kind === 'income' ? { kind } : {}),
    /* PEMILIK catatan privat = pembuat sesi yang SUNGGUHAN. Dulu field ini diisi
       id contoh (`JOINT_ME.id` = 'user_a'), sehingga catatan privat akun nyata
       tersembunyi dari pembuatnya sendiri dan hanya bisa dibaca... tidak siapa
       pun. Kalau sesi belum terbaca, biarkan kosong: pemetaan server memakai
       `user_id` sebagai pemiliknya (coalesce di view). */
    ...(isPrivate
      ? { isPrivate: true, ...(live.viewerId ? { privateForUser: live.viewerId } : {}) }
      : {}),
  }

  /* ── SUNTIKAN KAS (opsional) ─────────────────────────────────────────────
     Uang yang benar-benar keluar dari dompet user hanya ditulis kalau:
       · user MEMILIH dompet (`cashWalletId`), DAN
       · yang menalangi memang dirinya (`pocketIdOf(...) === viewerId`).
     Kondisi kedua penting: kalau pasangan yang menalangi, mendebit dompet user
     berarti mencatat uang keluar yang tidak pernah keluar dari kantongnya.

     PEMASUKAN bersama arahnya KEBALIK: uang MASUK ke dompet pribadi penyetor.
     Jalur ini dulu memakai `postExpense` untuk kedua jenis, sehingga pemasukan
     bersama malah MENGURANGI saldo dompet pribadi — bug yang dilaporkan
     pemilik produk. Sekarang `kind === 'income'` memakai `postIncome`.
     `clientTxId = joint-<id>` membuat penulisan ini idempoten terhadap
     double-tap. */
  const viewerId = live.viewerId
  const cashWalletId = input.cashWalletId?.trim() ?? ''
  let cashRowId: string | undefined
  if (cashWalletId && viewerId && pocketIdOf(live, input.paidByUserId) === viewerId) {
    const cashInput = {
      walletId: cashWalletId,
      amount,
      note: tx.description,
      category: tx.category,
      dateISO: tx.date,
      time: tx.time,
      clientTxId: `joint-${tx.id}`,
    }
    const row = kind === 'income' ? postIncome(cashInput) : postExpense(cashInput)
    /* dompet tidak dikenal / saldo kurang → tidak ada baris kas; catatan bareng
       tetap disimpan, dan UI tidak mengklaim uangnya berpindah */
    if (row) cashRowId = row.id
  }
  if (cashRowId) tx.cashRowId = cashRowId

  commit({ ...live, transactions: [tx, ...live.transactions], hydrated: true })
  syncJointRowTracked(tx)
  /* LONCENG: aktivitas baru di Dompet Bersama (semua anggota melihatnya) */
  notifyJointEntry('', tx.description)
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
  /* bentuk & total porsi divalidasi dengan aturan mesin ledger — pembagian yang
     tidak menjumlah ke nominal transaksi TIDAK boleh tersimpan */
  const roster = splitRosterFor(live, split, pocketOf(target))
  if (target.kind !== 'income' && !isValidSplit(split, roster, target.amount)) return null

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
  syncJointRowTracked(updated)
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

  /* Kalau kantong pembayar berpindah MENJAUH dari pemilik sesi, baris kas yang
     tadinya mencatat uang keluar dari dompetnya harus dicabut: uang itu tidak
     pernah keluar dari kantongnya. Kalau berpindah MENJADI pemilik sesi, kas
     tidak bisa dikarang (dompetnya tidak diketahui) — UI yang menawarkan
     "Catat dari dompet" lewat form tambah. */
  const viewerId = live.viewerId
  let updated: JointTransaction = { ...target, paidByUserId: userId }
  if (target.cashRowId && viewerId && userId !== viewerId) {
    removeRow(target.cashRowId)
    updated = { ...updated }
    delete updated.cashRowId
  }

  commit({
    ...live,
    transactions: live.transactions.map((tx) => (tx.id === id ? updated : tx)),
    hydrated: true,
  })
  syncJointRowTracked(updated)
  return updated
}

/** Ganti nama kantong bersama (editable on tap, Section 2). `null` = nama kosong. */
export function renameJointWallet(name: string): JointWallet | null {
  const next = name.trim()
  if (!next) return null
  if (next === live.wallet.name) return live.wallet
  const wallet: JointWallet = { ...live.wallet, name: next }
  commit({ ...live, wallet, hydrated: true })
  /* Nama juga ditulis ke SERVER kalau dompetnya sudah ada di sana — dulu nama
     hanya berubah di perangkat ini, jadi anggota lain (dan dirinya setelah
     membuka perangkat lain) tetap melihat nama lama. */
  if (remoteWalletId) void updateRemoteJointWalletName(remoteWalletId, next)
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
/**
 * Baris yang boleh dihapus, atau alasan penolakannya.
 *
 * Satu tempat yang dipakai jalur hapus SINKRON (demo/test) dan jalur hapus yang
 * MENUNGGU server (`deleteJointTransactionEverywhere`), supaya tombol yang
 * ditawarkan UI tidak pernah ditolak dengan alasan yang berbeda.
 */
function jointDeleteCandidate(
  id: string,
): { target: JointTransaction } | { reason: 'missing' | 'locked' } {
  const target = live.transactions.find((tx) => tx.id === id)
  /* Baris TURUNAN penanda bulan (settle/carry) bukan catatan user — ia lahir
     dari record, jadi tidak bisa dihapus dari sini. Baris pelunasan per pasangan
     yang benar-benar tersimpan (id `joint-…`) BOLEH dihapus: kalau transfernya
     batal, angkanya harus bisa dikoreksi. */
  const derivedSettlement =
    Boolean(target?.isSettlement) &&
    (Boolean(target?.isOpening) ||
      Boolean(target?.id.startsWith('settle-')) ||
      Boolean(target?.id.startsWith('carry-')))
  if (!target || derivedSettlement) return { reason: 'missing' }
  if (isRemovedJointRow(id)) return { reason: 'missing' }
  if (isMonthSettled(target.date)) return { reason: 'locked' }
  return { target }
}

/**
 * Id baris di SERVER.
 *
 * Baris yang lahir di perangkat ini membawa `remoteId` setelah terkirim. Baris
 * hasil BACAAN server TIDAK membawa `remoteId` — id-nya sendiri sudah uuid
 * server (`toJointTransaction()` memakai `row.id`). Versi lama hanya mengirim
 * DELETE kalau `remoteId` ada, sehingga catatan yang dibuka dari server tidak
 * pernah terhapus di sana: hilang di perangkat ini, tetap ada di perangkat
 * pasangan. Itulah akar keluhan "transaksi yang gua hapus masih ada di akun
 * kedua".
 */
function jointRemoteIdOf(target: JointTransaction): string | null {
  if (target.remoteId) return isUuid(target.remoteId) ? target.remoteId : null
  return isUuid(target.id) ? target.id : null
}

/**
 * Tombstone lokal: baris disembunyikan & dihitung ulang timbangannya, dan baris
 * kas yang lahir bersama catatan itu ikut dicabut (sama seperti hapus catatan di
 * Riwayat) — uang yang tidak lagi punya cerita tidak boleh tetap tercatat.
 */
function tombstoneJointRow(target: JointTransaction): JointTransaction {
  if (target.cashRowId) removeRow(target.cashRowId)

  const updated: JointTransaction = { ...target }
  delete updated.cashRowId

  commit({
    ...live,
    transactions: live.transactions.map((tx) => (tx.id === target.id ? updated : tx)),
    removedIds: [...live.removedIds, target.id],
    hydrated: true,
  })
  return target
}

export function deleteJointTransaction(id: string): JointTransaction | null {
  const candidate = jointDeleteCandidate(id)
  if ('reason' in candidate) return null

  const target = candidate.target
  const removed = tombstoneJointRow(target)
  const remoteId = jointRemoteIdOf(target)
  if (remoteId) void deleteRemoteJointTransaction(remoteId)
  return removed
}

export interface JointDeleteOutcome {
  /** baris sudah tidak tampil lagi di perangkat ini */
  removed: boolean
  /** false = server BELUM menerima; baris sengaja TIDAK dihapus lokal */
  serverOk: boolean
  /** `locked` = bulannya sudah settle, `missing` = baris tidak ada/turunan */
  reason?: 'missing' | 'locked'
}

/**
 * HAPUS SATU BARIS SAMPAI KE SERVER (sinkron antar-akun).
 *
 * `deleteJointTransaction()` cukup untuk perangkat ini, tetapi ia menembak
 * server tanpa menunggu jawaban (`void`). Kalau server menolak — RLS, jaringan
 * putus, kode lama yang tidak mengirim DELETE sama sekali — barisnya hanya
 * hilang di sini sementara anggota lain tetap melihatnya. Fungsi ini menunggu
 * jawaban server DULU, baru menulis tombstone:
 *
 *   · server menerima  → baris hilang di SEMUA perangkat (realtime DELETE);
 *   · server menolak   → TIDAK ada yang dihapus di layar ini, dan pemanggil
 *                        memberi tahu apa adanya (`serverOk: false`).
 *
 * Baris yang belum pernah terkirim (tanpa id server) tetap dihapus lokal:
 * tidak ada yang perlu disinkronkan.
 */
export async function deleteJointTransactionEverywhere(id: string): Promise<JointDeleteOutcome> {
  const candidate = jointDeleteCandidate(id)
  if ('reason' in candidate) {
    return { removed: false, serverOk: true, reason: candidate.reason }
  }

  const target = candidate.target
  const remoteId = jointRemoteIdOf(target)
  if (remoteId) {
    const serverOk = await deleteRemoteJointTransaction(remoteId)
    if (!serverOk) return { removed: false, serverOk: false }
  }

  tombstoneJointRow(target)
  return { removed: true, serverOk: true }
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
  const tx = live.transactions.find((row) => row.id === id) ?? null
  if (tx) void syncJointRow(tx)
  return tx
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

  commit({
    ...live,
    wallet,
    removedIds,
    settlements: {},
    settleTombstones: [],
    hydrated: true,
  })
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
  const amount = Math.max(0, Math.round(record.amount))

  /* ── UANGNYA BENAR-BENAR PINDAH (kalau dompet dipilih) ────────────────────
     Pemilik sesi hanya mencatat satu sisi, yaitu sisinya sendiri:
       · dia PENGIRIM  → uang keluar dari dompetnya (`postJointCashOut`),
       · dia PENERIMA  → uang masuk ke dompetnya (`postJointCashIn`).
     Keduanya sengaja bukan `expense`/`income`: settle patungan bukan konsumsi
     dan bukan pemasukan, jadi Arus Uang & Budget tidak boleh bergerak. Kalau
     dompet tidak dipilih, penanda settle tetap disimpan (kesepakatan dua orang
     itu fakta) tapi tidak ada saldo yang dikarang. */
  const viewerId = live.viewerId
  const cashWalletId = record.cashWalletId?.trim() ?? ''
  const mine = viewerId
    ? pocketIdOf(live, record.from) === viewerId
      ? 'out'
      : pocketIdOf(live, record.to) === viewerId
        ? 'in'
        : null
    : null
  let cashRowId: string | undefined
  if (cashWalletId && mine && amount > 0) {
    const input = {
      walletId: cashWalletId,
      amount,
      note: `Settle ${month}`,
      category: 'Settle',
      clientTxId: `joint-settle-${month}`,
    }
    const row = mine === 'out' ? postJointCashOut(input) : postJointCashIn(input)
    if (row) cashRowId = row.id
  }

  const stored: JointSettlementRecord = {
    month,
    from: record.from,
    to: record.to,
    amount,
    method,
    carryOver: Math.max(0, Math.round(record.carryOver)),
    /* KAPAN settle-nya terjadi — dibaca baris timeline. Tanpa ini, tanggal &
       jamnya jatuh ke konstanta mock ("1 <bulan> · 20:30") dan user yang baru
       menekan tombol hari ini melihat tanggal yang salah. */
    settledAt: record.settledAt?.trim() || deviceDateISO(),
    settledTime: record.settledTime?.trim() || clockLabelOf(new Date()),
    ...(cashWalletId ? { cashWalletId } : {}),
    ...(cashRowId ? { cashRowId } : {}),
  }

  commit({
    ...live,
    settlements: { ...live.settlements, [month]: stored },
    /* settle baru = pembatalan lama untuk bulan itu tidak berlaku lagi */
    settleTombstones: live.settleTombstones.filter((item) => item !== month),
    hydrated: true,
  })
  syncSettlementTracked(stored)
  notifyJointSettle(monthLabelOf(month))
  return stored
}

/**
 * Kirim penanda settle ke server (`joint_settlements`).
 *
 * Inilah yang membuat akun PASANGAN ikut melihat "Sudah settle" — sebelumnya
 * penanda hanya hidup di perangkat penekan tombol, jadi pasangan terus diminta
 * "Settle Sekarang" untuk bulan yang sama. Gagal kirim (offline) bukan alasan
 * menghapus penandanya: record ditandai `pendingSync` dan dikirim ulang oleh
 * `retryPendingJointRows()`.
 */
function syncSettlementTracked(record: JointSettlementRecord): void {
  const walletId = remoteWalletId
  const viewerId = remoteViewerId ?? live.viewerId
  if (!walletId || !viewerId || !isUuid(walletId)) return
  void pushJointSettlement(record, { walletId, viewerId }).then(async (ok) => {
    if (ok) return
    const hasSession = Boolean(await browserUserId())
    if (hasSession) markSettlementPending(record.month)
  })
}

/** penanda lokal yang belum sampai ke server (chip "Belum tersinkron") */
function markSettlementPending(month: string): void {
  const target = live.settlements[month]
  if (!target || target.pendingSync) return
  live = {
    ...live,
    settlements: { ...live.settlements, [month]: { ...target, pendingSync: true } },
  }
  persist(live)
  emit()
}

/** bulan yang pembatalan settle-nya belum sampai ke server */
function markSettlementUndoPending(month: string): void {
  if (live.settleTombstones.includes(month)) return
  live = { ...live, settleTombstones: [...live.settleTombstones, month] }
  persist(live)
  emit()
}

/* ── PELUNASAN PER PASANGAN (grup 3–4 orang) ─────────────────────────────────
   `recordSettlement()` di atas menandai SATU transfer untuk SATU bulan. Itu
   cukup untuk dompet dua orang, tetapi grup 3–4 orang bisa punya B→A dan C→A
   sekaligus: menandai B→A tidak boleh ikut menutup utang C.

   Karena itu pelunasan per pasangan ditulis sebagai BARIS ledger tersendiri:
     · `paid_by_user_id`    = PEMBAYAR (B),
     · porsi 100% ke PENERIMA (`split = single_payer(A)`),
     · `is_settlement`      = true (tidak menambah "Total Pengeluaran").
   Mesin net lalu menaikkan net B tepat sebesar transfer dan menurunkan net A
   sebesar itu — C & D sama sekali tidak tersentuh. Baris ini juga yang dikirim
   ke server (`settle_to_user_id`), jadi perangkat anggota lain melihat
   pelunasannya lewat REST/realtime, bukan hanya di perangkat penekan tombol.
   ────────────────────────────────────────────────────────────────────────── */

export interface JointSettleTransferInput {
  /** bulan yang sedang diselesaikan (`YYYY-MM`) */
  month: string
  /** anggota yang mentransfer */
  from: string
  /** anggota yang menerima — 100% manfaat ke dia */
  to: string
  amount: number
  method?: SettlementMethod
  /** dompet pribadi opsional: pengirim keluar, penerima masuk */
  cashWalletId?: string
  dateISO?: string
  timeLabel?: string
}

export function settleJointTransfer(input: JointSettleTransferInput): JointTransaction | null {
  const month = input.month.trim()
  if (!/^\d{4}-\d{2}$/.test(month)) return null
  if (!isAllowedPocket(live, input.from) || !isAllowedPocket(live, input.to)) return null
  if (input.from === input.to) return null
  const amount = Math.round(input.amount)
  if (!Number.isFinite(amount) || amount <= 0) return null

  const method: SettlementMethod = SETTLEMENT_METHODS.includes(
    input.method ?? DEFAULT_SETTLEMENT_METHOD,
  )
    ? (input.method ?? DEFAULT_SETTLEMENT_METHOD)
    : DEFAULT_SETTLEMENT_METHOD

  /* Uangnya benar-benar pindah kalau dompet pribadi dipilih — dan hanya untuk
     SISI pemilik sesi (sama seperti `recordSettlement`). */
  const viewerId = live.viewerId
  const cashWalletId = input.cashWalletId?.trim() ?? ''
  const mine = viewerId
    ? pocketIdOf(live, input.from) === viewerId
      ? 'out'
      : pocketIdOf(live, input.to) === viewerId
        ? 'in'
        : null
    : null
  let cashRowId: string | undefined
  if (cashWalletId && mine) {
    const cashInput = {
      walletId: cashWalletId,
      amount,
      note: `${SETTLE_ENTRY_LABEL} ${month}`,
      category: SETTLEMENT_CATEGORY,
      /* kunci per pasangan: dua pasangan di bulan yang sama tidak saling
         menimpa, dan menekan tombol dua kali tidak menulis dua baris kas */
      clientTxId: `joint-settle-${month}-${input.from}-${input.to}`,
    }
    const row = mine === 'out' ? postJointCashOut(cashInput) : postJointCashIn(cashInput)
    if (row) cashRowId = row.id
  }

  const tx: JointTransaction = {
    id: nextTransactionId(),
    userId: live.viewerId ?? JOINT_ME.id,
    paidByUserId: input.from,
    description: `${SETTLE_ENTRY_LABEL} ${monthLabelOf(month)}`,
    amount,
    category: SETTLEMENT_CATEGORY,
    date: input.dateISO ?? deviceDateISO(),
    time: input.timeLabel ?? clockLabelOf(new Date()),
    /* porsi 100% ke PENERIMA — inilah yang membuat utang C & D tidak berubah */
    split: { type: 'single_payer', payerId: input.to },
    isSettlement: true,
    /* BULAN yang diselesaikan: dipakai kunci anti-dobel & `month_key` di server.
       Tanpa ini, pelunasan sisa bulan lama tercatat sebagai milik bulan berjalan
       (tanggal transfernya hari ini) dan bulan yang diselesaikan tidak pernah
       tertutup. */
    settlementMonth: month,
    settlementMethod: method,
    ...(cashRowId ? { cashRowId } : {}),
  }

  commit({ ...live, transactions: [tx, ...live.transactions], hydrated: true })
  syncJointRowTracked(tx)
  notifyJointSettle(monthLabelOf(month))
  return tx
}

/**
 * BATALKAN SETTLE satu bulan — mencabut penanda bulan DAN baris kasnya, lalu
 * menghapus penandanya di SERVER supaya perangkat pasangan ikut kembali
 * "Belum Impas".
 *
 * Tanpa ini, "Settle Sekarang" yang salah tekan tidak bisa dibatalkan sama
 * sekali: penandanya mengunci timbangan sebulan, dan baris kasnya (kalau ada)
 * tetap memotong saldo dompet untuk transfer yang tidak pernah terjadi.
 *
 * `null` = tidak ada penanda untuk bulan itu.
 */
export function undoSettlement(month: string): JointSettlementRecord | null {
  const record = live.settlements[month]
  if (!record) return null
  if (record.cashRowId) {
    const row = getMoneySnapshot().rows.find((item) => item.id === record.cashRowId)
    removeRow(record.cashRowId)
    /* hapus baris saja TIDAK mengembalikan uang (aturan yang sama dengan hapus
       catatan lain). Membatalkan settle berarti "transfer ini tidak pernah
       terjadi", jadi uangnya dikembalikan lewat SATU baris koreksi bernama jelas
       — pola `unmarkBillPaid()`. */
    if (row && record.cashWalletId) {
      postBalanceAdjustment({
        walletId: record.cashWalletId,
        newBalance: walletBalance(getMoneySnapshot(), record.cashWalletId) + row.amount,
        note: `Batal settle ${month}`,
        category: 'Settle',
      })
    }
  }
  const settlements = { ...live.settlements }
  delete settlements[month]
  commit({
    ...live,
    settlements,
    /* tombstone baru dipasang kalau penghapusan di server GAGAL — kalau
       berhasil, tidak ada yang perlu ditahan */
    hydrated: true,
  })
  const walletId = remoteWalletId
  if (walletId && isUuid(walletId)) {
    void deleteRemoteJointSettlement(walletId, month).then(async (ok) => {
      if (ok) return
      const hasSession = Boolean(await browserUserId())
      if (hasSession) markSettlementUndoPending(month)
    })
  }
  return record
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
 * PEMILIK mengeluarkan satu anggota (`catetind_remove_joint_member`).
 *
 * Keanggotaan dihapus di SERVER lebih dulu; kalau server menolak (bukan
 * pemilik / tanpa sesi), store TIDAK berpura-pura berhasil — `removed:false`.
 * Baris catatan milik anggota itu tetap ada (riwayat tidak boleh hilang); nama
 * panggilannya dilepas dari peta sehingga timeline memakai sebutan netral,
 * bukan nama karangan.
 */
export async function removeJointMember(
  userId: string,
): Promise<{ removed: boolean; serverOk: boolean }> {
  const walletId = remoteWalletId
  if (!walletId || !isUuid(walletId) || !userId) return { removed: false, serverOk: false }
  if (live.viewerId && userId === live.viewerId) return { removed: false, serverOk: false }

  const serverOk = await removeRemoteJointMember(walletId, userId)
  if (!serverOk) return { removed: false, serverOk: false }

  const memberNames = { ...live.memberNames }
  delete memberNames[userId]
  commit({
    ...live,
    members: live.members.filter((id) => id !== userId),
    memberNames,
    hydrated: true,
  })
  /* roster di server adalah sumber akhir: baca ulang supaya perangkat ini
     menampilkan daftar yang sama dengan perangkat lain */
  void refreshRemoteJoint()
  return { removed: true, serverOk: true }
}

/**
 * KELUAR dari kantong bersama — aksi nyata, bukan lagi state halaman.
 *
 * Urutannya: hapus keanggotaan MILIK SENDIRI di server (RLS mengizinkan
 * `user_id = auth.uid()`), lalu kosongkan kantong di perangkat: seluruh catatan
 * ditandai terhapus (bukan dibuang, supaya Undo/audit masih mungkin), penanda
 * settle dikosongkan, dan nama anggota dilepas. Dompet & catatan pasangan tidak
 * disentuh.
 *
 * `serverOk` = keanggotaan di server benar-benar terhapus. `false` berarti tidak
 * ada sesi/backend ATAU penolakan server — UI mengatakannya apa adanya, bukan
 * mengklaim "sudah putus" untuk sesuatu yang masih ada di database.
 */
export async function leaveJointPocket(): Promise<{ left: boolean; serverOk: boolean }> {
  const walletId = remoteWalletId ?? live.wallet.id
  const viewerId = live.viewerId ?? remoteViewerId
  let serverOk = false
  if (walletId && viewerId) {
    serverOk = await deleteRemoteJointMembership(walletId, viewerId)
  }

  const removedIds = [
    ...new Set([...live.removedIds, ...live.transactions.map((tx) => tx.id)]),
  ]
  commit({
    ...EMPTY_SNAPSHOT,
    viewerId,
    removedIds,
  })
  stopJointRealtime()
  remoteWalletId = null
  return { left: true, serverOk }
}

/**
 * HAPUS DOMPET BERSAMA (permintaan pemilik produk: "gua mau ada button untuk
 * ngehapus dompet bersama ini").
 *
 * Bedanya dengan `leaveJointPocket()`:
 *   · `leaveJointPocket()` = KELUAR — keanggotaan sendiri dilepas, dompet &
 *     catatan anggota lain tetap ada di server;
 *   · `deleteJointPocket()` = HAPUS — baris `joint_wallets` dihapus, dan karena
 *     foreign key-nya `on delete cascade`, seluruh `joint_members` &
 *     `joint_transactions` ikut terhapus. RLS `joint_wallets_owner_delete`
 *     membatasi ini hanya untuk PEMILIK dompet.
 *
 * Kalau yang menekan bukan pemilik (atau tidak ada sesi), `serverOk` = false dan
 * UI mengatakannya apa adanya. State perangkat tetap dibersihkan supaya layar
 * tidak menyisakan dompet yang sudah ditinggalkan — catatan lama ditandai
 * tombstone (bukan dibuang) seperti jalur hapus lainnya.
 */
export async function deleteJointPocket(): Promise<{ deleted: boolean; serverOk: boolean }> {
  const walletId = remoteWalletId ?? live.wallet.id
  const viewerId = live.viewerId ?? remoteViewerId
  stopJointRealtime()

  let serverOk = false
  if (walletId && viewerId && isUuid(walletId)) {
    serverOk = await deleteRemoteJointWallet(walletId)
  }

  const removedIds = [
    ...new Set([...live.removedIds, ...live.transactions.map((tx) => tx.id)]),
  ]
  remoteWalletId = null
  remoteViewerId = null
  commit({ ...EMPTY_SNAPSHOT, viewerId, removedIds, hydrated: true })
  return { deleted: true, serverOk }
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
  /* dedupe DUA arah: id baris itu sendiri, DAN id server milik baris lokal yang
     sudah terkirim (`remoteId`). Tanpa pemeriksaan kedua, catatan yang kita
     tulis sendiri datang lagi lewat realtime dengan id uuid dan tampil dobel. */
  if (
    live.transactions.some(
      (tx) => !live.removedIds.includes(tx.id) && (tx.id === row.id || tx.remoteId === row.id),
    )
  ) {
    return null
  }

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

/**
 * Baris DIHAPUS di perangkat lain (atau seluruh dompet dihapus → cascade).
 *
 * Tombstone lokal ditulis supaya:
 *   · baris langsung hilang dari layar & dari timbangan di perangkat ini;
 *   · bacaan REST berikutnya tidak menghidupkannya lagi;
 *   · baris kas pribadi yang lahir bersama catatan itu (kalau ada di perangkat
 *     ini) ikut dicabut — aturan yang sama dengan hapus manual.
 */
export function applyRemoteJointDelete(remoteId: string): boolean {
  if (!remoteId) return false
  const target = live.transactions.find((tx) => tx.id === remoteId || tx.remoteId === remoteId)
  if (!target) {
    if (live.removedIds.includes(remoteId)) return false
    commit({ ...live, removedIds: [...live.removedIds, remoteId], hydrated: true })
    return true
  }
  if (live.removedIds.includes(target.id)) return false
  if (target.cashRowId) removeRow(target.cashRowId)
  const updated: JointTransaction = { ...target }
  delete updated.cashRowId
  commit({
    ...live,
    transactions: live.transactions.map((tx) => (tx.id === target.id ? updated : tx)),
    removedIds: [...live.removedIds, target.id],
    hydrated: true,
  })
  return true
}

/**
 * Baris DIUBAH di perangkat lain (pembagian, kantong pembayar, jenis catatan).
 *
 * Id LOKAL dipertahankan supaya tombstone, tautan baris kas, dan badge "Baru"
 * tidak hilang; isinya diganti dengan hasil pemetaan server — jadi angka di
 * semua perangkat membaca pembagian yang sama.
 */
export function applyRemoteJointUpdate(row: JointTransactionDbRow): JointTransaction | null {
  if (!row?.id) return null
  const remote = toJointTransaction(row, remoteViewerId ?? JOINT_ME.id)
  const index = live.transactions.findIndex((tx) => tx.id === row.id || tx.remoteId === row.id)
  if (index < 0) return applyJointRow(remote, { arrival: false })
  const existing = live.transactions[index]
  if (live.removedIds.includes(existing.id)) return null
  const merged: JointTransaction = {
    ...remote,
    id: existing.id,
    ...(existing.remoteId ? { remoteId: existing.remoteId } : { remoteId: row.id }),
    ...(existing.cashRowId ? { cashRowId: existing.cashRowId } : {}),
    ...(existing.justArrived ? { justArrived: true } : {}),
  }
  commit({
    ...live,
    transactions: live.transactions.map((tx, txIndex) => (txIndex === index ? merged : tx)),
    hydrated: true,
  })
  return merged
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
  remoteReadFailed = false
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

/** baris ledger dari penanda settle (pembuka bulan + baris settle bulan ini).
 *
 *  Nama penerima dibaca dari roster SUNGGUHAN (`memberNames`), bukan dari
 *  konstanta demo — dulu baris ini menulis "transfer ke Jon" di akun nyata.
 *  Kalau penerimanya adalah pemilik sesi, namanya tidak diulang: arah transfer
 *  sudah terbaca dari baris itu sendiri.
 */
export function settlementEntriesOf(snapshot: JointSnapshot, month: string): JointTransaction[] {
  const identity = jointIdentityMap(snapshot)
  const nameOf = (userId: string): string | undefined => {
    const id = identity[userId] ?? userId
    if (id === snapshot.viewerId) return undefined
    return snapshot.memberNames[id]
  }
  return settlementEntriesFor(snapshot.settlements, month, { nameOf }).map((tx) =>
    withRealIdentity(tx, identity),
  )
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
  /* nominal ikut jadi kunci: satu pasangan bisa melunasi dua kali dalam bulan
     yang sama (cicilan), dan keduanya bukan baris yang sama. */
  const month = tx.settlementMonth ?? monthOf(tx.date)
  return `${kind}-${month}-${pocketOf(tx)}-${bearer}-${Math.round(tx.amount)}`
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
  const identity = jointIdentityMap(snapshot)
  /* baris yang dihapus user tidak pernah masuk feed — timbangan, statistik, dan
     timeline membaca daftar yang SAMA, jadi satu penyaring cukup untuk
     ketiganya (paket 61.3). Sejak halaman punya navigator bulan, catatan juga
     disaring ke BULAN yang sedang dilihat: angka hero dan isi daftar harus
     bercerita tentang bulan yang sama. */
  const notes = snapshot.transactions
    .filter(
      (tx) =>
        !snapshot.removedIds.includes(tx.id) && withinMonth(tx.date, month),
    )
    .map((tx) => withRealIdentity(tx, identity))
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
  const identity = jointIdentityMap(snapshot)
  return snapshot.transactions
    .filter((tx) => !tx.isSettlement && !snapshot.removedIds.includes(tx.id))
    .map((tx) => withRealIdentity(tx, identity))
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
  const derivedSettlement =
    Boolean(tx.isSettlement) &&
    (Boolean(tx.isOpening) || tx.id.startsWith('settle-') || tx.id.startsWith('carry-'))
  if (derivedSettlement) return 'none'
  if (snapshot.removedIds.includes(tx.id)) return 'none'
  return snapshot.settlements[monthOf(tx.date)] ? 'locked' : 'allowed'
}

/**
 * Id peserta yang BERLAKU untuk satu nilai tersimpan.
 *
 * Baris lama menyimpan `user_a`/`user_b`; setelah identitas server diketahui,
 * `user_a` = pemilik sesi dan `user_b` = anggota lain. Semua pembanding
 * identitas memakai fungsi ini supaya tidak ada dua aturan pemetaan.
 */
function pocketIdOf(snapshot: JointSnapshot, userId: string): string {
  return jointIdentityMap(snapshot)[userId] ?? userId
}

/**
 * Peta identitas LAMA → identitas SUNGGUHAN (uuid) untuk satu kantong.
 *
 * Sebelum paket ini picker "Siapa yang nalangin?" menulis id demo
 * (`user_a`/`user_b`) karena `JOINT_ME.id` dipakai sebagai default. Baris lama
 * itu masih ada di perangkat & di server. Membiarkannya berarti timbangan
 * menghitung dua peserta yang tidak ada, jadi `user_a` dipetakan ke pemilik sesi
 * (dialah yang selalu jadi "Aku" di perangkat ini) dan `user_b` ke anggota
 * lainnya. Kalau tidak ada anggota lain, `user_b` TIDAK dipetakan: baris yang
 * mengaku milik orang yang tidak ada memang tidak bisa dipercaya.
 */
export function jointIdentityMap(snapshot: JointSnapshot): Record<string, string> {
  const map: Record<string, string> = {}
  const viewerId = snapshot.viewerId
  if (!viewerId) return map
  const partnerId = snapshot.members.find((id) => id !== viewerId) ?? null
  if (viewerId !== JOINT_ME.id) map[JOINT_ME.id] = viewerId
  if (partnerId && partnerId !== JOINT_PARTNER.id) map[JOINT_PARTNER.id] = partnerId
  return map
}

/** satu baris dengan identitas lama sudah dipetakan ke identitas sungguhan */
function withRealIdentity(tx: JointTransaction, map: Record<string, string>): JointTransaction {
  const pocket = pocketOf(tx)
  const mapped = map[pocket]
  const spec = tx.split ? mapSplitIds(splitSpecOf(tx), map) : undefined
  const bearer = tx.payerId ? (map[tx.payerId] ?? tx.payerId) : undefined
  if (!mapped && !spec && bearer === tx.payerId) return tx
  return {
    ...tx,
    ...(mapped ? { paidByUserId: mapped, userId: map[tx.userId] ?? tx.userId } : {}),
    ...(spec ? { split: spec } : {}),
    ...(bearer ? { payerId: bearer } : {}),
  }
}

/** peta id di dalam satu `SplitSpec` (persen/nominal/payer) */
function mapSplitIds(spec: SplitSpec, map: Record<string, string>): SplitSpec {
  if (spec.type === 'equal') return spec
  if (spec.type === 'single_payer') {
    return { ...spec, payerId: map[spec.payerId] ?? spec.payerId }
  }
  const remap = (source: Record<string, number>): Record<string, number> => {
    const next: Record<string, number> = {}
    for (const [id, value] of Object.entries(source)) {
      const target = map[id] ?? id
      next[target] = (next[target] ?? 0) + value
    }
    return next
  }
  return spec.type === 'percentage'
    ? { ...spec, percents: remap(spec.percents) }
    : { ...spec, amounts: remap(spec.amounts) }
}

/**
 * DAFTAR ANGGOTA KANTONG (2 orang atau lebih).
 *
 * Kantong ini dulu dianggap selalu dua orang, jadi halaman hanya punya `me` dan
 * `partner`. Undangan sekarang boleh dipakai orang ketiga & keempat, jadi seluruh
 * tampilan (pemilih "Siapa yang nalangin?", kartu settle, timeline) membaca satu
 * daftar ini: pemilik sesi SELALU di urutan pertama dengan sebutan "Kamu", lalu
 * anggota lain dengan nama panggilannya (atau sebutan netral kalau belum terbaca).
 *
 * Warna/avatar dipakai bergiliran dari dua persona supaya tidak ada warna baru
 * di luar palet; nama & id selalu data sungguhan.
 */
const MEMBER_AVATARS = ['🧑', '👩', '🧑‍🦰', '👨‍🦱', '👩‍🦳', '🧔', '👱', '🧕'] as const

export function jointMemberList(snapshot: JointSnapshot): JointPerson[] {
  const viewerId = snapshot.viewerId ?? snapshot.members[0] ?? JOINT_ME.id
  const ids = snapshot.members.length > 0 ? snapshot.members : [viewerId]
  const ordered = [viewerId, ...ids.filter((id) => id !== viewerId)]

  return ordered.map((id, index) => {
    if (index === 0) {
      return { ...ME_PERSONA, id, name: snapshot.memberNames[id] ?? 'Kamu' }
    }
    const base = index % 2 === 1 ? PARTNER_PERSONA : ME_PERSONA
    return {
      ...base,
      id,
      name: snapshot.memberNames[id] ?? (index === 1 ? 'Pasangan' : `Anggota ${index + 1}`),
      avatar: MEMBER_AVATARS[index % MEMBER_AVATARS.length],
    }
  })
}

/**
 * Dua peserta pertama kantong ini menurut data SUNGGUHAN: `me` = pemilik sesi
 * (nama "Kamu"), `partner` = anggota lain pertama (nama panggilannya, atau
 * "Pasangan" kalau belum terbaca).
 *
 * `partner` = `null` kalau belum ada anggota lain → halaman menampilkan alur
 * undangan. Kalau anggotanya lebih dari dua, daftar LENGKAPnya ada di
 * `jointMemberList()`; fungsi ini dipertahankan karena banyak tempat hanya butuh
 * "aku & satu orang lain" (mis. ringkasan judul).
 */
export function jointParticipants(snapshot: JointSnapshot): {
  me: JointPerson
  partner: JointPerson | null
} {
  const [me, partner] = jointMemberList(snapshot)
  return { me, partner: partner ?? null }
}

/**
 * true = kantong ini sudah punya pasangan (bukan lagi wujud undangan).
 *
 * Dasarnya data SUNGGUHAN: ada anggota lain selain pemilik sesi. Fungsi ini
 * tidak lagi membandingkan dengan id contoh, jadi hasilnya sama di perangkat
 * mana pun selama keanggotaannya sama, dan tidak bisa "menyala" oleh tombol
 * simulasi di perangkat sendiri.
 */
export function jointPartnerJoined(snapshot: JointSnapshot): boolean {
  return jointParticipants(snapshot).partner !== null
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
  remoteReadFailed = false
  live = SEED_SNAPSHOT
  accountPurged = false
  hydrateStarted = false
  hydratedOnce = false
  seq = 0
  emit()
}

