'use client'

import { useSyncExternalStore } from 'react'
import {
  WALLET_POOL,
  WALLET_SEED,
  filterWalletsByContext,
  toHomeWallet,
  toWalletAccount,
  walletAccountsTotal,
  walletCardRecipe,
  walletKindOf,
  walletNetworkOf,
  type Wallet,
  type WalletAccount,
  type WalletSeed,
} from '@/lib/wallets'
import {
  HISTORY_TRANSACTIONS,
  TRANSACTION_FALLBACK_CATEGORY,
  TRANSACTION_FALLBACK_WALLET,
  TRANSACTION_WALLET_OPTIONS,
  localISODate,
  type HistoryTransaction,
} from '@/lib/data/history'
import { HOME_MONEY_ROWS, type HomeMoneyRow } from '@/lib/data/home-money'
import { WALLET_DETAIL_TRANSACTIONS, WALLET_SYNC_ADJUSTMENT_COPY } from '@/lib/data/wallet-detail'
import {
  TRANSFER_SHEET_COPY,
  WALLET_TRANSFER_LOG_COPY,
  type WalletTransferRecord,
} from '@/lib/data/add-wallet'
import {
  DEBT_CASH_CATEGORY,
  planDebtSettlement,
  settlementNote,
  type CashDirection,
  type SettlementPlan,
} from '@/lib/data/wealth-cash'
import type { MoneyContext, TransactionType } from '@/lib/types'
import { newClientTxId } from '@/lib/client-tx'
import { trackMoneyEvent } from '@/lib/analytics'
import { readOnline } from '@/lib/connection'
import { loadMoneyState, saveMoneyState } from './idb'
import {
  deleteRemoteRow,
  deleteRemoteWallet,
  flushRemoteQueue,
  pushRowToServer,
  pushWalletToServer,
  readRemoteMoney,
  updateRemoteRow,
  type RemoteMoney,
} from '@/lib/supabase/money-remote'
import { migrateLocalDataToServer } from '@/lib/supabase/local-migration'
import { browserUserId } from '@/lib/supabase/client'

import {
  assertLedgerInvariant,
  balanceOf,
  movesBetweenWallets,
  type LedgerRow,
  type LedgerRowType,
} from './ledger'

/* ── SATU STORE UANG (paket 40) ──────────────────────────────────────────────
   Semua halaman yang menampilkan uang — Home, `/wallet`, `/wallet/[id]`,
   Kekayaan & Hutang, sampai `app/api/wallets` (lewat dompet kanon yang sama) —
   membaca dari SINI. Tidak ada store kedua, tidak ada saldo yang disimpan di
   komponen.

   Isi state:
     · `wallets`    — dompet kanon (`WalletSeed`) + saldo pembukanya;
     · `rows`       — baris ledger yang benar-benar menggerakkan saldo
                      (`lib/money/ledger.ts`), termasuk baris yang sudah dihapus
                      (disaring lewat `removedIds`);
     · `removedIds` — TOMBSTONE: id baris yang dihapus user, termasuk baris mock
                      yang hidup di konstanta `lib/data/*`. Inilah yang membuat
                      "hapus" benar-benar hapus: tanpa tombstone, baris mock lahir
                      lagi setiap halaman di-mount ulang (temuan audit #7).

   Saldo TIDAK PERNAH disimpan — selalu `opening + Σ baris` (`balanceOf`), jadi
   mustahil ada dua angka untuk satu dompet.

   State-nya hidup di memory modul dan ditulis ke IndexedDB (`lib/money/idb.ts`)
   supaya bertahan saat refresh. Itu batas jujurnya: TIDAK ada sinkronisasi
   antar-perangkat maupun ke server.

   DUA TAMBAHAN PAKET 42 (anti double-catatan & offline):

     1. `clientTxId` = KUNCI IDEMPOTENSI. Setiap baris membawa kunci dari aksi
        yang melahirkannya; kalau kunci yang sama datang lagi (double-tap, Enter
        lalu tap, submit ulang), store mengembalikan baris yang SUDAH ada dan
        tidak menulis baris kedua. Penjaganya dua lapis: di sini (`appendRow`)
        dan di invariant ledger (`clientTxId` tidak boleh kembar).
     2. `syncedIds` = ANTREAN LOKAL. Baris yang lahir saat perangkat OFFLINE tidak
        langsung masuk daftar ini, sehingga app bisa jujur berkata "N catatan
        belum tersinkron" (`pendingSyncCount`). Begitu jaringan kembali,
        `flushPendingSync()` memproses antreannya.
        BATAS JUJUR, dan ini penting: tanpa backend, "tersinkron" HANYA berarti
        "sudah tersimpan di IndexedDB perangkat ini" — bukan "sudah sampai ke
        server". Tidak ada satu pun baris di file ini yang mengirim data keluar.

   🚧 Produksi: `wallets` & `rows` datang dari Supabase (`GET /api/wallets`,
   `GET /api/transactions`), penulisannya `POST/PATCH/DELETE /api/transactions`,
   dan IndexedDB cuma jadi cache offline. `clientTxId` jadi header
   `Idempotency-Key`, `syncedIds` digantikan kolom `synced_at` di server, dan
   `flushPendingSync()` jadi `POST /api/transactions/sync` untuk tiap baris
   antrean. Fungsi-fungsi di bawah itulah yang berubah isi, bukan halaman-
   halamannya. */

/** baris ledger + metadata pajangan (jam, badge ✨, nama dompet) */
export interface MoneyRow extends LedgerRow {
  /** nomor urut naik — dipakai sebagai `HistoryTransaction.id` (angka) */
  seq: number
  /** jam lokal `HH:MM` untuk subjudul baris */
  time: string
  /** nama dirapikan AI → badge ✨ di Riwayat */
  aiGenerated: boolean
  /** nama dompet apa adanya (denormalisasi untuk pajangan; `walletId` tetap kunci) */
  walletName: string
}

export interface MoneySnapshot {
  wallets: readonly WalletSeed[]
  /** terbaru dulu — pola yang sama dengan bus transaksi lama */
  rows: readonly MoneyRow[]
  /** tombstone: id baris (string) yang dihapus user */
  removedIds: readonly string[]
  /**
   * TOMBSTONE DOMPET (paket 62) — id dompet yang dihapus user dari app.
   *
   * Kenapa tombstone dan bukan hapus fisik: `commit()` memanggil penjaga
   * invariant (`assertSnapshot` → `assertLedgerInvariant`) yang membandingkan
   * `Σ efek baris` dengan `Σ saldo − Σ opening`. Membuang dompet dari daftar
   * `wallets` tanpa membuang baris-barisnya membuat invariant GAGAL, dan
   * penulisannya DITOLAK — jadi "hard delete dompet" tidak mungkin tanpa
   * memutus janji `saldo = opening + Σ baris` (AUDIT-UANG §4.3).
   *
   * Yang di-tombstone hanya TAMPILANNYA: dompet hilang dari daftar kartu,
   * picker dompet, Total Saldo, dan Net Worth. Barisnya TIDAK ikut dibuang —
   * saldo dompet lain tidak bergerak, dan riwayat uang tetap bisa ditelusuri
   * (kanon §4.5: yang dihapus dompetnya, bukan uangnya). Undo = mencabut id dari
   * daftar ini (`restoreWalletAccount`).
   *
   * Konsekuensi yang dihitung & disengaja: Total Saldo turun sebesar saldo
   * dompet itu, dan `opening` + `Σ baris` dompet itu tetap ada di state supaya
   * penjaga invariant tetap seimbang.
   */
  removedWalletIds: readonly string[]
  /**
   * OVERRIDE EDIT baris MOCK (paket 48), kunci = `tombstoneKey(id)`.
   *
   * Baris yang lahir dari store (`session-9001`) diedit DI BARISNYA sendiri —
   * jadi saldonya ikut bergerak dan tidak ada salinan yang bisa melenceng.
   * Baris MOCK hidup di konstanta `lib/data/*` yang tidak boleh disunting, maka
   * hasil editnya disimpan di sini: satu peta kecil yang diterapkan
   * `applyRowOverride()` di SEMUA daftar yang menampilkan baris itu (Riwayat,
   * Home, `/wallet/[id]`, grafik arus uang).
   */
  rowOverrides: Readonly<Record<string, RowPatch>>
  /**
   * kunci idempotensi baris yang sudah "tersinkron" = sudah tersimpan di
   * IndexedDB perangkat ini. Baris dengan `clientTxId` di luar daftar ini adalah
   * ANTREAN LOKAL (lihat `pendingSyncCount`). Daftarnya dipangkas setiap commit
   * supaya tidak tumbuh tanpa batas.
   */
  syncedIds: readonly string[]
  /** true setelah state dari IndexedDB selesai dibaca */
  hydrated: boolean
}

/**
 * Perubahan yang boleh ditulis user lewat sheet Edit (paket 48).
 *
 * Nama fieldnya sengaja SAMA dengan bentuk baris yang dilihat user
 * (`HistoryTransaction`/`HomeMoneyRow`): satu patch, dipakai untuk dua jenis
 * baris — baris ledger (diterjemahkan ke `LedgerRow`) dan baris mock (di-override
 * saat dipajang).
 */
export interface RowPatch {
  /** catatan/nama baris — di baris ledger jadi `note` */
  name?: string
  /** nominal pajangan SELALU positif; arah uang dibaca dari `type` */
  amount?: number
  type?: TransactionType
  category?: string
  /** NAMA dompet yang ditampilkan (di baris ledger diturunkan jadi `walletId`) */
  wallet?: string
  /**
   * id dompet ledger — untuk pemanggil non-UI/test.
   *
   * `''` = sengaja "belum terhubung ke dompet" (persis kondisi baris yang dicatat
   * dengan dompet yang belum ada di ledger — lihat `postTransaction`). Id yang
   * TIDAK dikenal ledger ditolak seluruh patch-nya: baris yang menunjuk dompet
   * asing tidak menggerakkan saldo mana pun dan itu klaim palsu.
   */
  walletId?: string
  /** tanggal lokal `YYYY-MM-DD` */
  dateISO?: string
  /** nama dirapikan AI (badge ✨) — dicabut saat user menyentuh namanya */
  aiGenerated?: boolean
}

/** jenis transaksi app yang boleh dipilih di sheet Edit */
const EDITABLE_TYPES: readonly TransactionType[] = ['expense', 'income', 'transfer', 'saving']

/* ── STATE & LANGGANAN ─────────────────────────────────────────────────────── */

/*
 * STATE AWAL SELALU KOSONG (paket 65 · Tugas A).
 *
 * Dulu daftar dompet contoh (`WALLET_SEED`) di-`inject` LANGSUNG sebagai state
 * awal ke setiap store saat mode demo/test — akibatnya data contoh bukan "data
 * user": tidak persisten, tidak bisa diedit/dihapus, dan tidak konsisten antar
 * halaman. Sekarang state awal SELALU kosong (di produksi MAUPUN saat demo).
 *
 * Data contoh untuk AKUN DEMO ditulis lewat API tulis yang sama dengan data user
 * oleh `seedDemoDataOnce()` (`lib/money/demo-bootstrap.ts`) — jadi ia benar-benar
 * baris sungguhan: persisten di IndexedDB, bisa diedit/dihapus, dan muncul di
 * semua halaman. `SEED_*` di bawah tinggal jadi BAHAN test (reset) & bahan
 * bootstrap demo, BUKAN lagi "state awal milik user".
 *
 * `SERVER_SNAPSHOT` (dipakai render server & hidrasi) ikut kosong supaya HTML
 * server = render pertama client DAN akun baru benar-benar tidak melihat dompet
 * contoh yang bukan miliknya (temuan "8 dompet / Rp 3.600.000").
 */
const SERVER_SNAPSHOT: MoneySnapshot = Object.freeze({
  wallets: [] as readonly WalletSeed[],
  rows: [],
  removedIds: [],
  removedWalletIds: [],
  rowOverrides: {},
  syncedIds: [],
  hydrated: false,
})

/**
 * Snapshot seed — BAHAN test (`resetMoneyStore()`) & bahan bootstrap demo.
 * Bukan state awal runtime: hanya test yang menuliskan ini ke state hidup, supaya
 * ratusan test yang mengunci angka seed tetap hijau tanpa data contoh bocor ke
 * produksi.
 */
const SEED_SNAPSHOT: MoneySnapshot = Object.freeze({
  wallets: WALLET_SEED,
  rows: [],
  removedIds: [],
  removedWalletIds: [],
  rowOverrides: {},
  syncedIds: [],
  hydrated: false,
})

let live: MoneySnapshot = SERVER_SNAPSHOT
let hydrated = false
let hydrateStarted = false
const listeners = new Set<() => void>()

/**
 * SNAPSHOT KOSONG (paket 43) — keadaan setelah user MENGHAPUS AKUN-nya.
 *
 * Bedanya dengan "belum pernah punya data" penting: kalau state kosong diperlakukan
 * seperti kunjungan pertama, `mergeMoneySnapshot()` akan mengisi ulang dompet
 * KANON (`WALLET_SEED`) dan user melihat "datanya kembali" padahal ia baru saja
 * meminta semuanya dihapus. Itu pelanggaran janji privasi paling kasar yang bisa
 * dilakukan aplikasi keuangan.
 */
const EMPTY_SNAPSHOT: MoneySnapshot = Object.freeze({
  wallets: [],
  rows: [],
  removedIds: [],
  removedWalletIds: [],
  rowOverrides: {},
  syncedIds: [],
  hydrated: true,
})

/**
 * true = akun di perangkat ini sudah dihapus, jadi daftar dompet yang kosong itu
 * SENGAJA kosong. Ikut ditulis ke IndexedDB supaya tetap benar setelah refresh.
 */
let accountPurged = false

/** id baris ledger — mulai 9.001 supaya mustahil bertabrakan dengan id mock (1–900) */
let nextSeq = 9001
/** urutan dompet buatan user (`w-1`, `w-2`, …) */
let nextWalletSeq = 1
/** posisi kandidat di `WALLET_POOL` untuk tombol "Tambah Dompet" deck Home */
let poolIndex = 0

export function getMoneySnapshot(): MoneySnapshot {
  return live
}

/** dipakai React saat render server & hidrasi (lihat `useMoneyStore`) */
export function getServerMoneySnapshot(): MoneySnapshot {
  return SERVER_SNAPSHOT
}

export function subscribeMoneyStore(listener: () => void): () => void {
  listeners.add(listener)
  /* hidrasi ditunda sampai ada yang benar-benar berlangganan (yaitu SETELAH
     hidrasi React) supaya HTML server tidak pernah berbeda dari render pertama
     client. Dipanggil di sini, bukan di tingkat modul, karena IndexedDB hanya
     ada di browser. */
  void hydrateMoneyStore()
  return () => {
    listeners.delete(listener)
  }
}

function emit(): void {
  for (const listener of listeners) listener()
}

function commit(next: MoneySnapshot): void {
  /* diperiksa SEBELUM dipasang: kalau ledger tidak seimbang, state yang sudah
     benar tidak ikut rusak — dan tidak ada satu pun halaman yang sempat
     membaca baris yang salah */
  assertSnapshot(next)
  live = next
  saveMoneyState({
    wallets: next.wallets,
    rows: next.rows,
    removedIds: next.removedIds,
    /* tombstone dompet ikut ditulis (paket 62): tanpa ini, dompet yang baru
       dihapus muncul lagi setelah refresh */
    removedWalletIds: next.removedWalletIds,
    /* hasil edit baris mock ikut ditulis: tanpa ini, edit di Riwayat hilang
       begitu halaman di-refresh (temuan B laporan 46) */
    rowOverrides: next.rowOverrides,
    syncedIds: next.syncedIds,
    /* penanda "akun ini sudah dihapus" ikut ditulis: tanpa itu, refresh setelah
       hapus akun akan menghidupkan lagi dompet contoh (lihat `EMPTY_SNAPSHOT`) */
    purged: accountPurged,
  })
  emit()
}

function openingsOf(wallets: readonly WalletSeed[]): Record<string, number> {
  return Object.fromEntries(wallets.map((wallet) => [wallet.id, wallet.opening]))
}

/** saldo semua dompet menurut ledger — satu-satunya cara saldo dihitung */
export function balancesOf(snapshot: MoneySnapshot = live): Record<string, number> {
  return Object.fromEntries(
    snapshot.wallets.map((wallet) => [wallet.id, balanceOf(snapshot.rows, wallet.id, wallet.opening)]),
  )
}

/** penjaga integritas: dijalankan setiap kali state hendak berubah, bukan cuma di test */
function assertSnapshot(snapshot: MoneySnapshot): void {
  assertLedgerInvariant(snapshot.rows, {
    openings: openingsOf(snapshot.wallets),
    balances: balancesOf(snapshot),
  })
}

/* ── HIDRASI DARI INDEXEDDB ────────────────────────────────────────────────── */

/** bentuk yang ditulis ke IndexedDB (`lib/money/idb.ts`) — JSON polos, siap HTTP */
export interface PersistedMoney {
  wallets?: WalletSeed[]
  rows?: MoneyRow[]
  removedIds?: string[]
  /**
   * tombstone DOMPET (paket 62) — id dompet yang dihapus user. Disimpan
   * bersamaan dengan snapshot supaya dompet yang sudah dihapus TIDAK muncul
   * kembali setelah refresh (pola yang sama dengan `removedIds`, dan alasan yang
   * sama: `mergeMoneySnapshot()` akan menghidupkan dompet dari daftar tersimpan
   * kalau tombstone-nya tidak ikut ditulis).
   */
  removedWalletIds?: string[]
  /**
   * hasil edit baris MOCK (paket 48) — bentuknya JSON polos, jadi siap dikirim
   * HTTP kalau nanti server menyimpan border override ini:
   *
   * ```json
   * { "rowOverrides": { "session-2": { "amount": 45000 }, "seed-2": { "amount": 9000000 } } }
   * ```
   *
   * Kuncinya = `tombstoneKey(id)` (id angka Riwayat `2` ⇒ `session-2`), persis
   * pola `removedIds`. Di produksi field ini TIDAK ada: edit baris asli jadi
   * `PATCH /api/transactions/:id`, dan baris mock tidak ikut pindah ke server.
   */
  rowOverrides?: Record<string, RowPatch>
  syncedIds?: string[]
  /**
   * true = akun ini datanya sudah DIHAPUS user di perangkat ini (paket 43).
   * Efeknya satu, dan penting: daftar dompet yang kosong dipercaya APA ADANYA
   * — jangan diisi ulang dengan dompet kanon demo (`WALLET_SEED`).
   *
   * Di produksi field ini tidak ada: setelah user menghapus akun, `GET /api/wallets`
   * mengembalikan array kosong karena barisnya memang sudah dihapus di database.
   */
  purged?: boolean
}

function nextWalletId(existing: readonly WalletSeed[]): string {
  let id = `w-${nextWalletSeq}`
  while (existing.some((wallet) => wallet.id === id)) {
    nextWalletSeq += 1
    id = `w-${nextWalletSeq}`
  }
  nextWalletSeq += 1
  return id
}

/**
 * Gabungkan state tersimpan dengan yang sudah ada di memory. Bentuk fungsi murni
 * (`current` bisa dioper dari test) supaya jalur hidrasi ini bisa diuji tanpa
 * browser/IndexedDB — di runtime, `current` adalah state hidup sekarang.
 *
 * Aturan: daftar tersimpan jadi DASAR (itu yang benar-benar dimiliki user),
 * lalu baris/dompet yang lahir di sesi ini sebelum hidrasi selesai tetap ikut
 * (di-dedupe per id). Tombstone digabung (union), karena sekali dihapus, tetap
 * terhapus — dan `rowOverrides` (hasil edit baris mock, paket 48) ikut digabung
 * dengan cara yang sama supaya edit tidak hilang saat halaman di-refresh.
 */
export function mergeMoneySnapshot(
  persisted: PersistedMoney | null,
  current: MoneySnapshot = live,
): MoneySnapshot {
  const storedWallets = (persisted?.wallets ?? []).filter((wallet) => wallet?.id)
  /* daftar dasar = HANYA yang tersimpan. Kunjungan pertama = KOSONG (paket 65):
     dompet contoh tidak lagi "lahir" di sini — akun baru benar-benar mulai dari
     nol, dan akun demo diisi lewat `seedDemoDataOnce()` yang menulis baris sungguhan. */
  const purged = persisted?.purged === true
  const base = storedWallets
  /* dompet yang ditambahkan user SEBELUM hidrasi selesai tetap ikut (dedupe by id).
     KHUSUS akun yang sudah dihapus: dompet KANON tidak boleh ikut masuk kembali —
     kalau tidak, dompet contoh itu "lahir lagi" persis di kasus yang mau dicegah. */
  const extras = purged
    ? current.wallets.filter((wallet) => !WALLET_SEED.some((seed) => seed.id === wallet.id))
    : current.wallets.filter((wallet) => !base.some((w) => w.id === wallet.id))
  const wallets = [...base, ...extras]

  const storedRows = (persisted?.rows ?? []).filter((row) => row?.id)
  const rows = current.rows.concat(
    storedRows.filter((row) => !current.rows.some((r) => r.id === row.id)),
  )

  const removedIds = Array.from(new Set([...current.removedIds, ...(persisted?.removedIds ?? [])]))
  /* tombstone DOMPET di-union dengan cara yang sama (paket 62): sekali dihapus,
     tetap terhapus — termasuk kalau tombstone-nya datang dari sesi sebelumnya */
  const removedWalletIds = Array.from(
    new Set([...current.removedWalletIds, ...(persisted?.removedWalletIds ?? [])]),
  )
  /* hasil edit baris mock juga di-union, dan yang MENANG kalau kuncinya sama
     adalah state di memory (`current`): itu tulisan paling baru di sesi ini —
     perangkat ini satu-satunya penulisnya. Tanpa baris ini, edit di Riwayat
     hilang begitu halaman di-refresh (temuan B laporan 46). */
  const rowOverrides = { ...(persisted?.rowOverrides ?? {}), ...current.rowOverrides }
  /* antrean lokal juga di-union: baris yang sudah ditandai tersimpan tetap
     tersimpan, dan yang belum tetap menunggu (pola yang sama dengan tombstone) */
  const syncedIds = Array.from(new Set([...current.syncedIds, ...(persisted?.syncedIds ?? [])]))

  /* nomor urut & id dompet harus lanjut dari yang tersimpan, bukan mulai ulang */
  nextSeq = Math.max(9001, ...rows.map((row) => row.seq + 1).filter(Number.isFinite))
  for (const wallet of wallets) {
    const match = /^w-(\d+)$/.exec(wallet.id)
    if (match) nextWalletSeq = Math.max(nextWalletSeq, Number(match[1]) + 1)
  }

  return { wallets, rows, removedIds, removedWalletIds, rowOverrides, syncedIds, hydrated: true }
}

/**
 * Gabungkan state SERVER (sumber utama saat login) dengan antrean lokal.
 *
 * Fungsi murni supaya bisa diuji tanpa jaringan (`lib/money/store.test.ts`):
 *
 *   · `wallets`  → MILIK SERVER, apa adanya. Dompet kanon (`WALLET_SEED`) TIDAK
 *     diisi ulang kalau server kosong: user yang benar-benar baru melihat keadaan
 *     kosong + jalan ke onboarding, bukan saldo contoh yang bukan miliknya.
 *   · `rows`     → baris server + baris lokal yang BELUM ada di server (antrean
 *     offline). Yang sudah ada di server dipakai versi server (itu yang sah).
 *   · `syncedIds`→ kunci idempotensi baris yang diketahui server + yang sudah
 *     ditandai tersimpan sebelumnya. Di sinilah antrean offline jadi bisa dihitung
 *     (`pendingSyncCount`) tanpa penghitung kedua.
 *   · `removedIds` → gabungan tombstone. Hapus di server itu DELETE sungguhan,
 *     tapi tombstone lokal tetap dibutuhkan untuk baris MOCK (yang hidup di
 *     konstanta `lib/data/*`, bukan di database).
 *   · `rowOverrides` → gabungan override baris mock (paket 48). Server tidak
 *     menyimpannya — edit baris ASLI sudah ikut di barisnya sendiri —
 *     jadi yang tersimpan di perangkat ini tetap yang sah untuk baris pajangan.
 */
export function mergeWithRemote(
  remote: Pick<RemoteMoney, 'wallets' | 'rows'>,
  persisted: PersistedMoney | null,
  current: MoneySnapshot = live,
): MoneySnapshot {
  const remoteIds = new Set(remote.rows.map((row) => row.id))
  const pendingLocal = (persisted?.rows ?? []).filter((row) => row?.id && !remoteIds.has(row.id))
  const pendingCurrent = current.rows.filter((row) => row?.id && !remoteIds.has(row.id))

  const rows = [...remote.rows]
  for (const row of [...pendingLocal, ...pendingCurrent]) {
    if (!rows.some((existing) => existing.id === row.id)) rows.push(row)
  }
  /* terbaru dulu: server sudah terurut, antrean lokal menempel sesuai `seq` */
  rows.sort((a, b) => b.seq - a.seq)

  const syncedIds = Array.from(
    new Set([
      ...remote.rows.map((row) => row.clientTxId).filter((id): id is string => Boolean(id)),
      ...current.syncedIds,
      ...(persisted?.syncedIds ?? []),
    ]),
  )

  /* nomor urut lanjut dari yang tertinggi (server + antrean) supaya id baris baru
     (`session-<seq>`) tidak menabrak baris yang sudah ada di database */
  nextSeq = Math.max(9001, ...rows.map((row) => row.seq + 1).filter(Number.isFinite))
  for (const wallet of remote.wallets) {
    const match = /^w-(\d+)$/.exec(wallet.id)
    if (match) nextWalletSeq = Math.max(nextWalletSeq, Number(match[1]) + 1)
  }

  return {
    wallets: [...remote.wallets],
    rows,
    removedIds: Array.from(new Set([...current.removedIds, ...(persisted?.removedIds ?? [])])),
    /* tombstone DOMPET juga di-union (paket 62). Server tidak menyimpannya
       (di produksi barisnya memang sudah dihapus di database, jadi daftar
       dompet dari server sudah tidak memuatnya); yang disimpan di perangkat ini
       tetap yang sah supaya dompet yang baru dihapus tidak "lahir lagi" saat
       hidrasi berikutnya. */
    removedWalletIds: Array.from(
      new Set([...current.removedWalletIds, ...(persisted?.removedWalletIds ?? [])]),
    ),
    /* override baris mock tidak punya kolom di server: yang sah adalah gabungan
       lokal (memory menang — tulisan terbaru di sesi ini) */
    rowOverrides: { ...(persisted?.rowOverrides ?? {}), ...current.rowOverrides },
    syncedIds: prunedSyncedIds(rows, syncedIds),
    hydrated: true,
  }
}

/**
 * Baca state tersimpan SEKALI per sesi halaman. Tidak pernah melempar: kalau
 * IndexedDB diblokir (mode privat), `loadMoneyState()` mengembalikan `null` dan
 * app tetap jalan dengan data seed.
 *
 * URUTANNYA PENTING (paket 45): kalau ada sesi Supabase, SERVER yang jadi sumber
 * data — bukan IndexedDB. Urutannya:
 *
 *   1. baca cache lokal (IndexedDB) — ini juga bahan migrasi sekali jalan;
 *   2. coba baca server. Kalau server menjawab:
 *        a. migrasikan data lokal SEKALI (`local-migration.ts`, idempotent lewat
 *           `client_tx_id`) kalau akun ini masih kosong di server;
 *        b. pakai daftar dompet & baris DARI SERVER (perangkat kedua melihat data
 *           yang sama dengan perangkat pertama);
 *        c. baris lokal yang belum sampai ke server tetap ikut sebagai antrean;
 *   3. kalau server tidak bisa dihubungi / tidak ada sesi → jalur lokal seperti
 *      sebelum paket ini (app tetap jalan penuh, cuma tanpa sinkronisasi).
 */
export async function hydrateMoneyStore(): Promise<void> {
  if (hydrated || hydrateStarted || typeof window === 'undefined') return
  hydrateStarted = true
  const persisted = await loadMoneyState<PersistedMoney>()
  hydrated = true
  /* akun yang sudah dihapus tetap dihapus setelah refresh: penandanya dibaca
     SEBELUM merge, dan ikut ke setiap penulisan berikutnya (`commit`) */
  accountPurged = persisted?.purged === true

  if (!accountPurged) {
    const remote = await readRemoteMoney()
    if (remote) {
      const userId = await browserUserId()
      if (userId) {
        const local = mergeMoneySnapshot(persisted)
        const migration = await migrateLocalDataToServer({
          userId,
          wallets: [...local.wallets],
          rows: local.rows,
        })
        /* migrasi mengisi server → bacaan pertama sudah basi; ambil yang baru */
        const fresh = migration.ran ? await readRemoteMoney() : null
        const authoritative = fresh ?? remote
        live = mergeWithRemote(authoritative, persisted)
        assertRemoteAggreement(authoritative)
        commit(live)
        return
      }
    }
  }

  live = mergeMoneySnapshot(persisted)
  assertSnapshot(live)
  emit()
}

/**
 * Bandingkan saldo hasil hitung SERVER (view `wallet_balances`) dengan hasil
 * hitung klien (`opening + Σ baris`, rumus yang sama di `lib/money/ledger.ts`).
 *
 * Kalau keduanya berbeda, salah satu sisi sedang salah — dan itu jenis kesalahan
 * yang paling mahal di aplikasi uang (dua angka untuk satu dompet, temuan audit
 * #8). Karena itu perbedaannya DILAPORKAN, bukan dibiarkan: yang tampil tetap
 * angka klien (sumber yang sama dengan seluruh halaman), tapi peringatannya
 * muncul di console supaya tidak terkubur.
 */
function assertRemoteAggreement(remote: RemoteMoney): void {
  if (Object.keys(remote.balances).length === 0) return
  const derived = Object.fromEntries(
    remote.wallets.map((wallet) => [wallet.id, balanceOf(remote.rows, wallet.id, wallet.opening)]),
  )
  for (const [walletId, serverValue] of Object.entries(remote.balances)) {
    if (!(walletId in derived)) continue
    if (derived[walletId] !== serverValue) {
      console.warn(
        `[CatetInd] saldo ${walletId} berbeda antara server (${serverValue}) dan klien (${derived[walletId]}). ` +
          'Rumusnya sama (opening + Σ baris) — periksa baris yang belum tersinkron.',
      )
    }
  }
}


/* ── HAPUS AKUN: KOSONGKAN STORE (paket 43 · audit Stage 6 #2) ───────────────
   Dipanggil `lib/account.ts` SETELAH IndexedDB dihapus. Tugasnya cuma satu:
   membuat state di memory benar-benar kosong dan menandainya "purged", supaya
   refresh berikutnya tidak mengembalikan dompet contoh.

   Fungsi ini TIDAK menghapus data di server — karena di demo ini tidak ada
   server yang menyimpannya (batas yang ditulis apa adanya di `lib/data/account.ts`). */

/** kosongkan store karena akunnya dihapus; snapshot kosongnya jadi state hidup */
export function purgeMoneyStore(): MoneySnapshot {
  accountPurged = true
  nextSeq = 9001
  nextWalletSeq = 1
  poolIndex = 0
  live = EMPTY_SNAPSHOT
  assertSnapshot(live)
  saveMoneyState({
    wallets: [],
    rows: [],
    removedIds: [],
    /* tombstone dompet juga dibuang: akun yang dihapus tidak menyisakan satu
       pun jejak dompet (paket 62) */
    removedWalletIds: [],
    /* hasil edit baris mock ikut dibuang: setelah akunnya dihapus, tidak boleh
       ada satu pun jejak "data contoh" yang hidup kembali di perangkat ini */
    rowOverrides: {},
    syncedIds: [],
    purged: true,
  })
  emit()
  return live
}

/**
 * true = akun ini tidak punya data uang yang TAMPIL sama sekali.
 *
 * Dua pemicunya dihitung dari keadaan yang benar-benar dilihat user:
 *
 *   1. akun baru saja dihapus (`purgeDeviceData()` → `purgeMoneyStore()`), DAN
 *   2. user mengosongkan datanya sendiri — menghapus semua dompet dan/atau semua
 *      catatannya.
 *
 * Sebelum paket 62 syaratnya `wallets.length === 0 && rows.length === 0`, dan
 * itu terlalu ketat: tombstone (hapus catatan paket 59, hapus dompet paket 62)
 * TIDAK membuang barisnya dari state — jadi setelah user menghapus seluruh
 * isinya, kedua angka itu tetap > 0 dan notice kosong-akun tidak pernah muncul
 * (temuan audit #3). Yang dipakai sekarang: dompet HIDUP (`liveWalletSeeds`) dan
 * catatan yang masih tampil (`removedIds` sudah disaring) — persis yang dilihat
 * user, bukan yang tersimpan di belakang layar.
 *
 * Dipakai Home untuk menampilkan keadaan kosong yang jujur + jalan ke onboarding,
 * bukan kartu-kartu berisi angka contoh seolah-olah itu milik user.
 */
export function isAccountEmpty(snapshot: MoneySnapshot = live): boolean {
  return liveWalletSeeds(snapshot).length === 0 && recordedTransactions(snapshot).length === 0
}

/* ── HOOK ──────────────────────────────────────────────────────────────────── */

/**
 * Snapshot store untuk komponen client.
 *
 * `useSyncExternalStore` dipakai karena ia punya `getServerSnapshot`: HTML hasil
 * render server memakai seed yang sama dengan render pertama client (tanpa
 * hydration mismatch), lalu otomatis pindah ke state hidup begitu IndexedDB &
 * penulisan user mengubahnya.
 */
export function useMoneyStore(): MoneySnapshot {
  return useSyncExternalStore(subscribeMoneyStore, getMoneySnapshot, getServerMoneySnapshot)
}

/* ── SELECTOR (semua saldo lewat sini) ─────────────────────────────────────── */

/**
 * Apakah baris ini sudah dihapus user (tombstone)?
 *
 * Kuncinya diseragamkan lewat `tombstoneKey()` supaya satu baris yang sama —
 * yang dipanggil Home dengan `session-9001` dan Riwayat dengan `9001` — selalu
 * dijawab sama di semua halaman.
 */
export function isRowRemoved(snapshot: MoneySnapshot, id: string | number): boolean {
  return snapshot.removedIds.includes(tombstoneKey(id))
}

/**
 * Patch hasil edit satu baris (paket 48), atau `null` kalau barisnya belum
 * pernah diedit. Kuncinya diseragamkan lewat `tombstoneKey()` — sama seperti
 * tombstone, jadi Riwayat (`2`) dan daftar lain (`session-2`) menunjuk patch
 * yang sama.
 */
export function rowOverrideOf(snapshot: MoneySnapshot, id: string | number): RowPatch | null {
  return snapshot.rowOverrides[tombstoneKey(id)] ?? null
}

/**
 * Terapkan hasil edit ke baris yang SEDANG DIPAJANG — SATU-SATUNYA cara override
 * sampai ke layar.
 *
 * Dipakai semua daftar yang menampilkan baris mock: Riwayat
 * (`HISTORY_TRANSACTIONS`), Home (`HOME_MONEY_ROWS` + strip ringkasan), grafik
 * "Arus Uang", dan `/wallet/[id]` (`WALLET_DETAIL_TRANSACTIONS`). Karena
 * penerapannya satu fungsi, mustahil ada halaman yang menampilkan angka lama
 * setelah diedit di halaman lain — persis bug yang ditutup paket ini.
 *
 * Generic + hanya menimpa field yang MEMANG dimiliki barisnya: `HistoryTransaction`
 * punya `wallet`, baris Home tidak; jadi satu fungsi cukup untuk kedua bentuk.
 */
export function applyRowOverride<T extends { id: string | number }>(
  snapshot: MoneySnapshot,
  row: T,
): T {
  const patch = rowOverrideOf(snapshot, row.id)
  if (!patch) return row

  const next: Record<string, unknown> = { ...row }
  const write = (key: string, value: unknown) => {
    if (value === undefined) return
    if (!(key in next)) return
    next[key] = value
  }
  write('name', patch.name)
  write('amount', patch.amount)
  write('type', patch.type)
  write('category', patch.category)
  write('wallet', patch.wallet)
  /* bentuk pajangan menyimpan tanggal sebagai `date` (HistoryTransaction & baris
     Home) — patch memakai nama ledger (`dateISO`) supaya satu patch bisa dipakai
     dua-duanya */
  write('date', patch.dateISO)
  write('aiGenerated', patch.aiGenerated)

  return next as T
}

/** saldo satu dompet — `opening + Σ baris`, tidak pernah angka tersimpan */
export function walletBalance(snapshot: MoneySnapshot, walletId: string): number {
  const wallet = snapshot.wallets.find((item) => item.id === walletId)
  if (!wallet) return 0
  return balanceOf(snapshot.rows, walletId, wallet.opening)
}

/* ── TOMBSTONE DOMPET (paket 62) ─────────────────────────────────────────────
   Dompet yang dihapus user TIDAK dibuang dari `snapshot.wallets`: penjaga
   invariant di `commit()` menghitung `Σ saldo − Σ opening` dari daftar itu, dan
   membuangnya membuat penjumlahan tidak seimbang (lihat catatan di
   `MoneySnapshot.removedWalletIds`). Yang dibuang hanya VISIBILITASNYA.

   Aturan satu arah yang berlaku di seluruh file ini:
     · yang MENULIS uang / MEMILIH dompet → hanya dompet HIDUP
       (`liveWalletSeeds`): mustahil mencatat atau memindahkan uang ke dompet yang
       sudah dihapus user;
     · yang MENGHITUNG saldo & invariant → SEMUA dompet (`balancesOf`,
       `openingsOf`, `walletBalance`), supaya `Σ baris = Σ saldo − Σ opening` tetap
       benar dan saldo dompet LAIN tidak bergerak;
     · yang MENAMPILKAN riwayat lama → nama dompet terhapus tetap diselesaikan
       (`walletNameAnyOf`), supaya rujukan di Riwayat & log pindah dana tidak jadi
       yatim. */

/** true = dompet ini sudah dihapus user (tombstone) */
export function isWalletRemoved(snapshot: MoneySnapshot, walletId: string): boolean {
  return snapshot.removedWalletIds.includes(walletId)
}

/** dompet yang masih hidup — SATU-SATUNYA daftar untuk tampilan & pilihan dompet */
export function liveWalletSeeds(snapshot: MoneySnapshot): WalletSeed[] {
  return snapshot.wallets.filter((wallet) => !snapshot.removedWalletIds.includes(wallet.id))
}

/** dompet yang sudah dihapus — dipakai file ekspor & laporan, bukan layar */
export function removedWalletSeeds(snapshot: MoneySnapshot): WalletSeed[] {
  return snapshot.wallets.filter((wallet) => snapshot.removedWalletIds.includes(wallet.id))
}

/**
 * Jumlah catatan yang MENYENTUH satu dompet — dompet sebagai pemilik baris
 * (`walletId`) MAUPUN sebagai dompet lawan pindah dana (`counterWalletId`).
 *
 * Satu definisi, dipakai dialog konfirmasi hapus dompet ("N catatan menyentuh
 * dompet ini") supaya angka yang dibaca user di dialog tidak mungkin berbeda
 * dengan jumlah baris yang benar-benar ada. Baris yang sudah dihapus user
 * (tombstone) tidak dihitung — ia memang sudah tidak tampil di daftar mana pun.
 */
export function walletRecordCount(snapshot: MoneySnapshot, walletId: string): number {
  if (!walletId) return 0
  return snapshot.rows.filter(
    (row) =>
      !isRowRemoved(snapshot, row.id) &&
      (row.walletId === walletId || row.counterWalletId === walletId),
  ).length
}

/** dompet dalam bentuk kartu halaman Dompet & Akun (dompet terhapus tidak ikut) */
export function walletAccounts(snapshot: MoneySnapshot): WalletAccount[] {
  return liveWalletSeeds(snapshot).map((wallet) =>
    toWalletAccount(wallet, walletBalance(snapshot, wallet.id)),
  )
}

/**
 * Konteks uang untuk turunan kas (PRD Domain 2C.2).
 *
 * `'all'` sengaja ikut: konteks uang MENYARING daftar/arus, sedangkan **Total
 * Saldo selalu seluruh dompet** (paket 44). Satu tipe untuk kedua pemakaian itu
 * supaya tidak ada lagi dua daftar konteks yang beda isi.
 */
export type WalletContextFilter = MoneyContext | 'all'

/** dompet dalam bentuk kartu deck Home (disaring per konteks uang) */
export function homeWallets(snapshot: MoneySnapshot, ctx: WalletContextFilter): Wallet[] {
  return filterWalletsByContext(liveWalletSeeds(snapshot), ctx).map((wallet) =>
    toHomeWallet(wallet, walletBalance(snapshot, wallet.id)),
  )
}

/**
 * Kartu halaman `/wallet/[id]`. `null` = dompet tidak ada ATAU sudah dihapus
 * user (paket 62) — dua keadaan itu sengaja dijawab sama supaya halaman detail
 * tidak pernah merender dompet yang sudah tidak ada di daftar mana pun.
 */
export function walletAccountOf(snapshot: MoneySnapshot, walletId: string): WalletAccount | null {
  const wallet = liveWalletSeeds(snapshot).find((item) => item.id === walletId)
  if (!wallet) return null
  return toWalletAccount(wallet, walletBalance(snapshot, wallet.id))
}

/**
 * Dompet HIDUP dari id-nya. `null` untuk dompet yang sudah dihapus, dan itu
 * penting: semua pintu tulis uang memakai fungsi ini sebagai penjaga, jadi
 * mustahil ada catatan atau koreksi saldo yang mendarat di dompet yang sudah
 * dibuang user dari daftarnya.
 *
 * Butuh dompet apa adanya — termasuk yang sudah dihapus (mis. untuk file
 * ekspor)? Pakai `removedWalletSeeds()` + `snapshot.wallets`.
 */
export function walletSeedOf(snapshot: MoneySnapshot, walletId: string): WalletSeed | null {
  return liveWalletSeeds(snapshot).find((wallet) => wallet.id === walletId) ?? null
}

/**
 * TOTAL SALDO — jumlah saldo **SELURUH dompet**, TIDAK terpengaruh konteks uang.
 *
 * Ini SATU-SATUNYA definisi "Total Saldo" di app (paket 44). Sebelumnya Home
 * menjumlahkan dompet yang sudah tersaring konteks (`homeWallets(snapshot, ctx)`)
 * sehingga di konteks "pribadi" angkanya Rp 1.800.000 (BCA + GoPay), sementara
 * `/wallet` dan Kekayaan menampilkan Rp 1.850.000 (+ Tunai) — labelnya sama-sama
 * "Total Saldo", jadi user membacanya sebagai salah hitung.
 *
 * Aturan yang sekarang berlaku: **konteks uang menyaring DAFTAR & ARUS, bukan
 * total.** Kalau daftarnya lebih pendek, yang tampil bukan total yang mengecil,
 * melainkan baris keterangan `Dompet {konteks}: Rp X` (`cashTotalByContext`) di
 * bawah total itu — lihat Home (`components/catetind/home-screen.tsx`).
 */
export function cashTotal(snapshot: MoneySnapshot): number {
  return walletAccountsTotal(walletAccounts(snapshot))
}

/**
 * Saldo dompet pada SATU konteks uang saja (turunan dari definisi yang sama).
 *
 * Dipakai untuk baris keterangan yang menemani `cashTotal`: ia menjawab "kenapa
 * daftar dompetku lebih pendek?" tanpa mengubah arti Total Saldo. Untuk `'all'`
 * hasilnya identik dengan `cashTotal` — dan jumlah seluruh konteks SELALU sama
 * dengan total semua dompet (dikunci `lib/money/store.test.ts`).
 */
export function cashTotalByContext(
  snapshot: MoneySnapshot,
  ctx: WalletContextFilter,
): number {
  return homeWallets(snapshot, ctx).reduce((sum, wallet) => sum + wallet.balance, 0)
}

/**
 * Pilihan dompet untuk sheet yang benar-benar menggerakkan uang (Catat Bayar,
 * Terima piutang, koreksi saldo). Sebelum paket 41 daftarnya adalah konstanta
 * mock `WALLET_SOURCE_OPTIONS` berisi `OVO` yang TIDAK ADA di ledger — memilih
 * dompet itu berarti baris kasnya tidak menyentuh saldo mana pun, dan user
 * mengira hutangnya lunas tanpa uang keluar. Sekarang daftarnya datang dari
 * ledger, termasuk dompet yang baru ditambahkan user.
 */
export function walletOptionsFor(
  snapshot: MoneySnapshot,
): { id: string; label: string; balance: number }[] {
  /* hanya dompet HIDUP (paket 62): dompet yang sudah dihapus user tidak boleh
     muncul lagi sebagai pilihan di sheet mana pun — memilihnya berarti menulis
     uang ke dompet yang tidak ada di daftarnya */
  const options: { id: string; label: string; balance: number }[] = []
  /* PAKET 81 — SATU NAMA = SATU BARIS. User boleh punya dua dompet bernama sama
     (`addWalletAccount()` tidak melarangnya), dan pencocokan dompet di app ini
     memang BY-NAME (`walletIdOfName()` memakai yang pertama). Tanpa dedupe,
     daftar ini melahirkan DUA baris berlabel identik di setiap pemilih — di
     kartu konfirmasi AI itu sampai jadi galat React "Encountered two children
     with the same key, `OVO`", dan di sheet lain jadi dua baris yang tidak bisa
     dibedakan user padahal barisnya mendarat di dompet yang SAMA. Yang pertama
     menang, persis dompet yang menerima catatannya. */
  const seen = new Set<string>()
  for (const wallet of liveWalletSeeds(snapshot)) {
    const key = wallet.name.trim().toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    options.push({
      id: wallet.id,
      label: wallet.name,
      balance: walletBalance(snapshot, wallet.id),
    })
  }
  return options
}

/** nama dompet dari id — dipakai menyimpan riwayat pembayaran (`walletName`) */
export function walletNameOfId(snapshot: MoneySnapshot, walletId: string): string {
  return walletNameOf(snapshot, walletId)
}

/** id dompet dari namanya (nama dipakai form & mock; id dipakai ledger) */
export function walletIdOfName(snapshot: MoneySnapshot, name: string): string {
  const key = name.trim().toLowerCase()
  /* dompet terhapus tidak dicari: nama dompet yang sudah dibuang user tidak boleh
     "hidup lagi" hanya karena form masih memuat namanya */
  return liveWalletSeeds(snapshot).find((wallet) => wallet.name.toLowerCase() === key)?.id ?? ''
}

/**
 * Cek apakah pengeluaran sebesar `amount` masih tertutup saldo dompet bernama
 * `walletName` — MURNI terhadap snapshot yang diberikan.
 *
 * Dipakai DUA tempat sekaligus, dan itu memang tujuannya:
 *   1. PRE-CHECK UI (`useTransactionSubmit` & jalur AI) supaya user menerima toast
 *      "Saldo tidak mencukupi" SEBELUM ada yang ditulis, dan panelnya tetap terbuka;
 *   2. PENJAGA pintu tulis (`postTransaction`/`postExpense`) sebagai pagar terakhir,
 *      supaya lubang saldo sub-nol tidak bisa kembali lewat jalur baru mana pun.
 *
 * `known: false` = dompetnya belum ada di ledger (mis. 'OVO' sebelum ditambahkan):
 * barisnya tetap tercatat apa adanya dan TIDAK menyentuh saldo mana pun, jadi tidak
 * ada yang perlu dijaga. Penolakan HANYA berlaku untuk dompet HIDUP yang saldonya
 * benar-benar akan terpotong.
 */
export function walletFundsCheck(
  snapshot: MoneySnapshot,
  walletName: string,
  amount: number,
): { known: boolean; sufficient: boolean; balance: number } {
  const walletId = walletIdOfName(snapshot, walletName)
  if (!walletId) return { known: false, sufficient: true, balance: 0 }
  const balance = walletBalance(snapshot, walletId)
  return { known: true, sufficient: Math.round(amount) <= balance, balance }
}

/* ── API TULIS — SATU-SATUNYA JALUR MENULIS UANG ─────────────────────────────
   Semua pintu di app (panel input manual, Scan struk/Voice, koreksi saldo di
   `/wallet` & `/wallet/[id]`, pindah dana, tambah dompet) lewat fungsi-fungsi
   ini. Tidak ada halaman yang boleh menyentuh `wallets`/`rows` langsung. */

/** nama dompet dari id — untuk menulis/menyimpan nama dompet HIDUP */
function walletNameOf(snapshot: MoneySnapshot, walletId: string): string {
  return liveWalletSeeds(snapshot).find((wallet) => wallet.id === walletId)?.name ?? ''
}

/**
 * Nama dompet dari id — TERMASUK dompet yang sudah dihapus user.
 *
 * Dipakai HANYA untuk memajang rujukan lama (log pindah dana: "Pindah ke GoPay").
 * Baris pindah dana menyimpan `counterWalletId`, dan kalau dompet lawannya sudah
 * dihapus, lookup "dompet hidup" akan mengembalikan string kosong — lognya jadi
 * berbunyi "Pindah ke " (rujukan yatim). Riwayat uang yang sudah terjadi tidak
 * boleh kehilangan namanya hanya karena dompetnya dibuang dari daftar.
 */
function walletNameAnyOf(snapshot: MoneySnapshot, walletId: string): string {
  return snapshot.wallets.find((wallet) => wallet.id === walletId)?.name ?? ''
}

/** jam lokal `HH:MM` saat baris dibuat */
function clockLabel(): string {
  const now = new Date()
  return `${`${now.getHours()}`.padStart(2, '0')}:${`${now.getMinutes()}`.padStart(2, '0')}`
}

/** nominal selalu integer rupiah & tidak nol; `null` = tolak (jangan tulis apa pun) */
function normalizeAmount(value: number): number | null {
  if (!Number.isFinite(value)) return null
  const rounded = Math.round(value)
  return rounded !== 0 ? rounded : null
}

interface RowInput {
  walletId: string
  walletName: string
  type: LedgerRowType
  /** sudah integer & bertanda benar (lihat `normalizeAmount`) */
  amount: number
  note: string
  category?: string
  counterWalletId?: string
  dateISO?: string
  time?: string
  aiGenerated?: boolean
  /** kunci idempotensi dari pemanggil; kosong = dibuat di sini (lihat `appendRow`) */
  clientTxId?: string
}

/** baris yang sudah ditulis dengan kunci idempotensi ini (kalau ada) */
export function rowForClientTxId(
  snapshot: MoneySnapshot,
  clientTxId: string,
): MoneyRow | undefined {
  return snapshot.rows.find((row) => row.clientTxId === clientTxId)
}

/**
 * Daftar "tersinkron" dipangkas ke kunci yang masih dipakai baris yang ada,
 * supaya state yang ditulis ke IndexedDB tidak tumbuh tanpa batas (barisnya
 * sendiri sudah dibatasi 200 terakhir — lihat `lib/money/idb.ts`).
 */
function prunedSyncedIds(rows: readonly MoneyRow[], syncedIds: readonly string[]): string[] {
  const live = new Set(rows.map((row) => row.clientTxId).filter((id): id is string => Boolean(id)))
  return syncedIds.filter((id) => live.has(id))
}

/* ── JEJAK ANALITIK AKSI KRITIKAL (paket 43 · audit Stage 6 #4) ──────────────
   Event ditembak DARI SINI — satu-satunya pintu tulis uang — bukan dari
   komponen halaman. Alasannya: tiap aksi uang (catat, koreksi saldo, settle,
   hapus) WAJIB meninggalkan jejak, dan satu-satunya cara menjamin itu adalah
   menempelkannya pada fungsi yang benar-benar mengubah state.
   Isi payload tidak pernah memuat nominal/nama catatan (`lib/analytics.ts`
   menyaringnya lagi sebelum dikirim). */

/** jenis baris ledger → label jenis untuk analitik (bukan nominal, bukan nama) */
function eventKindOf(type: LedgerRowType): string {
  return type
}

/**
 * Tembak `transaction_created` HANYA untuk baris yang benar-benar baru.
 *
 * `appendRow` mengembalikan baris LAMA saat `clientTxId` yang sama datang lagi
 * (double-tap, Enter lalu tap) — kalau kita menembak di situ juga, satu aksi
 * user akan terhitung dua kali dan justru merusak gunanya analitik. Karena itu
 * pembandingnya "baris ini sudah ada sebelum penulisan?".
 */
function trackCreatedRow(row: MoneyRow | null, beforeRows: readonly MoneyRow[]): void {
  if (!row) return
  if (beforeRows.some((existing) => existing.id === row.id)) return
  trackMoneyEvent('transaction_created', {
    kind: eventKindOf(row.type),
    offline: !readOnline(),
    ai_generated: row.aiGenerated,
    linked: row.walletId !== '',
  })
}

/**
 * Tulis satu baris dan SATU-SATUNYA pintu masuk baris baru.
 *
 * ANTI DOUBLE-CATATAN (paket 42): kalau `clientTxId`-nya sudah pernah ditulis,
 * baris kedua TIDAK dibuat dan baris lama yang dikembalikan (semantik
 * idempotency key: retry mengembalikan resource yang sama, bukan salinan baru).
 * Ini yang membuat double-tap / Enter-lalu-tap / retry jaringan tidak pernah
 * menghasilkan dua catatan.
 *
 * OFFLINE (paket 42): baris yang lahir saat perangkat offline tidak masuk
 * `syncedIds`, jadi ia tampil sebagai antrean (`pendingSyncCount`) sampai
 * `flushPendingSync()` memprosesnya.
 */
function appendRow(input: RowInput): MoneyRow {
  if (input.clientTxId) {
    const existing = rowForClientTxId(live, input.clientTxId)
    if (existing) return existing
  }

  const clientTxId = input.clientTxId ?? newClientTxId()
  const row: MoneyRow = {
    id: `session-${nextSeq}`,
    walletId: input.walletId,
    type: input.type,
    amount: input.amount,
    dateISO: input.dateISO || localISODate(),
    note: input.note,
    ...(input.category ? { category: input.category } : {}),
    ...(input.counterWalletId ? { counterWalletId: input.counterWalletId } : {}),
    clientTxId,
    seq: nextSeq,
    time: input.time || clockLabel(),
    aiGenerated: input.aiGenerated ?? false,
    walletName: input.walletName,
  }
  nextSeq += 1
  const rows = [row, ...live.rows]
  /* online → baris ini langsung tersimpan (IndexedDB ditulis oleh `commit`);
     offline → biarkan menunggu di antrean supaya banner bisa jujur menghitungnya */
  const syncedIds = readOnline()
    ? prunedSyncedIds(rows, [...live.syncedIds, clientTxId])
    : prunedSyncedIds(rows, live.syncedIds)
  commit({ ...live, rows, syncedIds })
  /* KIRIM KE SERVER (paket 45). Sengaja `void`: pencatatan tidak boleh menunggu
     jaringan — kalau gagal (offline/backend mati), barisnya sudah ada di state
     lokal + IndexedDB dan kuncinya TIDAK ada di `syncedIds`, jadi ia tetap
     terhitung sebagai antrean (`pendingSyncCount`) dan dikirim ulang oleh
     `flushPendingSync()`. Idempotensinya dijamin `unique (user_id, client_tx_id)`
     di database, bukan oleh penjadwalan di sini. */
  void pushRowToServer(row)
  return row
}


/* ── ANTREAN LOKAL (baris yang lahir OFFLINE) ────────────────────────────────
   Bacanya dari SNAPSHOT, bukan dari daftar terpisah: baris & antreannya hidup
   di satu state, jadi tidak mungkin ada catatan yang tampil di Riwayat tapi
   tidak dihitung antreannya (atau sebaliknya). */

/** baris yang belum "tersinkron" (offline) — antrean yang ditampilkan banner */
export function pendingSyncRows(snapshot: MoneySnapshot = live): MoneyRow[] {
  return snapshot.rows.filter(
    (row) => row.clientTxId !== undefined && !snapshot.syncedIds.includes(row.clientTxId),
  )
}

/** jumlah catatan yang belum tersinkron — angka di banner offline */
export function pendingSyncCount(snapshot: MoneySnapshot = live): number {
  return pendingSyncRows(snapshot).length
}

/**
 * Proses antrean lokal. Mengembalikan jumlah baris yang diproses.
 *
 * BATAS JUJUR: "diproses" di repo demo ini = ditandai sudah tersimpan di
 * IndexedDB (lihat doc `MoneySnapshot.syncedIds`). Tidak ada request jaringan
 * yang dikirim — kalau nanti backend-nya ada, di sinilah `POST /api/transactions`
 * per baris antrean dijalankan (dengan `clientTxId` sebagai Idempotency-Key).
 */
/**
 * Proses antrean lokal — DAN (sejak paket 45) benar-benar mengirim ke server.
 *
 * Perilaku:
 *   · ada sesi & jaringan → tiap baris antrean dikirim (`ledger_rows`, idempotent
 *     lewat `client_tx_id`); yang benar-benar diterima server ditandai tersinkron;
 *   · tidak ada sesi/backend → perilaku paket 42 dipertahankan: baris ditandai
 *     "tersimpan di perangkat ini" (IndexedDB) supaya user tidak terjebak dengan
 *     banner yang tidak bisa dibereskan;
 *   · gagal kirim (jaringan putus di tengah) → baris ITU tetap di antrean.
 *
 * Mengembalikan jumlah baris yang keluar dari antrean, supaya banner bisa berkata
 * jujur ("2 catatan terkirim" / "1 masih menunggu").
 */
export async function flushPendingSync(): Promise<number> {
  const pending = pendingSyncRows()
  if (pending.length === 0) return 0

  const outcome = await flushRemoteQueue(pending)
  const processed = outcome.offline ? pending : pending.slice(0, outcome.synced)
  const keys = processed.map((row) => row.clientTxId).filter((id): id is string => Boolean(id))
  if (keys.length === 0) return 0

  commit({ ...live, syncedIds: prunedSyncedIds(live.rows, [...live.syncedIds, ...keys]) })
  return keys.length
}


export interface ExpenseInput {
  walletId: string
  amount: number
  note: string
  category?: string
  dateISO?: string
  clientTxId?: string
}

/** pengeluaran: uang keluar dari dompet */
export function postExpense(input: ExpenseInput): MoneyRow | null {
  const amount = normalizeAmount(input.amount)
  if (!amount || amount < 0) return null
  /* dompet harus BENAR-BENAR ada & belum dihapus user (paket 62). Sebelumnya
     fungsi ini tidak memeriksa apa pun, jadi baris bisa ditulis ke dompet yang
     sudah dibuang dari daftar — uang yang tidak terlihat di halaman mana pun. */
  const wallet = walletSeedOf(live, input.walletId)
  if (!wallet) return null
  /* SALDO TIDAK BOLEH SUB-NOL (paket 74): pengeluaran lebih besar dari saldo
     dompet HIDUP ditolak tanpa menulis satu baris pun — jalur tulis yang sama
     dengan `postTransfer`/`postDebtSettlement`. Sebelum ini pintu pengeluaran
     tidak memeriksa saldo sama sekali, jadi saldo dompet bisa jadi minus. */
  if (amount > walletBalance(live, input.walletId)) return null
  const before = live.rows
  const row = appendRow({
    walletId: input.walletId,
    walletName: wallet.name,
    type: 'expense',
    amount,
    note: input.note,
    category: input.category,
    dateISO: input.dateISO,
    clientTxId: input.clientTxId,
  })
  trackCreatedRow(row, before)
  return row
}

/** pemasukan: uang masuk ke dompet */
export function postIncome(input: ExpenseInput): MoneyRow | null {
  const amount = normalizeAmount(input.amount)
  if (!amount || amount < 0) return null
  const wallet = walletSeedOf(live, input.walletId)
  if (!wallet) return null
  const before = live.rows
  const row = appendRow({
    walletId: input.walletId,
    walletName: wallet.name,
    type: 'income',
    amount,
    note: input.note,
    category: input.category,
    dateISO: input.dateISO,
    clientTxId: input.clientTxId,
  })
  trackCreatedRow(row, before)
  return row
}

export interface TransferInput {
  fromWalletId: string
  /** kosong = uang keluar dari kas (mis. setoran celengan yang belum jadi dompet) */
  toWalletId?: string
  amount: number
  note: string
  dateISO?: string
}

/**
 * Pindah dana. Satu baris ledger menggerakkan DUA dompet sekaligus (keluar dari
 * sumber, masuk ke tujuan) — bukan dua baris yang bisa saling melenceng, dan
 * bukan perubahan saldo yang tidak meninggalkan catatan.
 */
export function postTransfer(input: TransferInput): MoneyRow | null {
  const amount = normalizeAmount(input.amount)
  if (!amount || amount < 0) return null
  /* kedua dompet harus HIDUP (paket 62): dompet yang sudah dihapus user tidak
     boleh jadi sumber atau tujuan pindah dana — uangnya akan mendarat di dompet
     yang tidak muncul di halaman mana pun */
  const liveIds = new Set(liveWalletSeeds(live).map((wallet) => wallet.id))
  if (!liveIds.has(input.fromWalletId)) return null
  if (input.toWalletId && !liveIds.has(input.toWalletId)) return null
  if (input.toWalletId === input.fromWalletId) return null
  if (amount > walletBalance(live, input.fromWalletId)) return null

  const destination = input.toWalletId ? walletNameOf(live, input.toWalletId) : ''
  const before = live.rows
  const row = appendRow({
    walletId: input.fromWalletId,
    walletName: walletNameOf(live, input.fromWalletId),
    type: 'transfer',
    amount,
    /* catatan user dipakai apa adanya; kalau kosong, namanya sama dengan yang
       dilihat user di Riwayat ("Pindah ke GoPay") — bukan string kosong */
    note: input.note.trim() || WALLET_TRANSFER_LOG_COPY.transferName(destination),
    /* Kategori kanon 'Transfer' (paket 55) — sebelumnya 'Pindah Dana', label
       karangan yang TIDAK ada di `TRANSACTION_CATEGORY_OPTIONS`, sehingga baris
       pindah dana mustahil terjaring filter kategori apa pun di Riwayat. */
    category: WALLET_TRANSFER_LOG_COPY.transferCategory,
    counterWalletId: input.toWalletId,
    dateISO: input.dateISO,
  })
  trackCreatedRow(row, before)
  return row
}

export interface BalanceAdjustmentInput {
  walletId: string
  /** saldo ASLI yang dibaca user di aplikasi bank/e-wallet-nya */
  newBalance: number
  dateISO?: string
  /**
   * Nama baris koreksi (opsional). Default-nya copy "tak tercatat" milik Smart
   * Sync; dipakai pembatalan pembayaran tagihan (paket 51) supaya barisnya
   * menjelaskan dirinya sendiri ("Batal bayar Kredivo") — bukan seolah-olah ada
   * pemasukan yang tidak pernah dicatat.
   */
  note?: string
  /** kategori baris koreksi (opsional) — default kategori Smart Sync */
  category?: string
}

/**
 * Koreksi saldo (Smart Sync) — SATU baris `balance_adjustment` bertanda, dengan
 * nama yang sama seperti yang dijanjikan modal ("Pengeluaran/Pemasukan Tak
 * Tercatat akan ditambahkan otomatis ke catatanmu"). Sengaja SATU baris: kalau
 * ditulis dua baris (koreksi + pengeluaran), saldonya terpotong dua kali dan
 * seluruh ledger tidak lagi seimbang.
 *
 * SATU-SATUNYA jalur mengembalikan uang tanpa menulis ulang riwayat: dipakai
 * juga saat pembatalan pembayaran tagihan (paket 51) — `removeRow()` hanya
 * menyembunyikan barisnya dan TIDAK mengembalikan saldo (kanon paket 46:
 * "yang dihapus barisnya, bukan uangnya"), jadi pengembaliannya ditulis di sini.
 */
export function postBalanceAdjustment(input: BalanceAdjustmentInput): MoneyRow | null {
  const target = Math.round(input.newBalance)
  if (!Number.isFinite(target) || target < 0) return null
  const wallet = walletSeedOf(live, input.walletId)
  if (!wallet) return null

  const diff = target - walletBalance(live, input.walletId)
  if (diff === 0) return null

  const row = appendRow({
    walletId: input.walletId,
    walletName: wallet.name,
    type: 'balance_adjustment',
    amount: diff,
    note:
      input.note ??
      (diff < 0
        ? WALLET_SYNC_ADJUSTMENT_COPY.untrackedExpense
        : WALLET_SYNC_ADJUSTMENT_COPY.untrackedIncome),
    category: input.category ?? WALLET_SYNC_ADJUSTMENT_COPY.adjustmentCategory,
    dateISO: input.dateISO,
    aiGenerated: true,
  })
  /* arah koreksinya saja — selisih rupiahnya TIDAK dikirim (privasi) */
  trackMoneyEvent('balance_adjusted', { direction: diff < 0 ? 'down' : 'up' })
  return row
}

export interface RecordTransactionInput {
  name: string
  /** selalu positif — arah uang dibaca dari `type` */
  amount: number
  type: TransactionType
  category: string
  /** nama dompet pilihan user/form (`BCA`, `GoPay`, `OVO`, `Tunai`, …) */
  wallet: string
  dateISO: string
  aiGenerated?: boolean
  /**
   * Kunci idempotensi aksi tulis (paket 42). Diisi panel input supaya
   * double-tap/Enter-lalu-tap tidak menghasilkan dua catatan; kosong = store
   * membuat satu sendiri (semua baris tetap punya kunci untuk antrean offline).
   */
  clientTxId?: string
}

/** jenis transaksi app (`TransactionType`) → jenis baris ledger */
function ledgerTypeOf(type: TransactionType): LedgerRowType {
  if (type === 'income') return 'income'
  if (type === 'expense') return 'expense'
  /* 'transfer' & 'saving' = uang pindah, bukan masuk/keluar kas: `saving`
     dicatat sebagai transfer SATU SISI karena celengan belum jadi dompet di
     ledger (begitu jadi dompet, tinggal isi `counterWalletId`). */
  return 'transfer'
}

/**
 * Pintu catat transaksi dari shell input & AI capture (`lib/transaction-bus.ts`
 * cuma jadi adapter tipis ke sini).
 *
 * Dompet yang namanya belum ada di ledger (mis. `OVO` sebelum dompetnya
 * ditambahkan) tetap DICATAT apa adanya dengan `walletId: ''` — tampil di
 * Riwayat dengan nama dompet yang dipilih user, tapi tidak menggerakkan saldo
 * dompet mana pun. Menebak dompet terdekat justru memindahkan uang user ke
 * dompet yang salah; itu lebih buruk daripada jujur "belum terhubung".
 *
 * ── PAGAR PINDAH DANA (paket 55) ──────────────────────────────────────────────
 * `type: 'transfer'` DITOLAK di sini: `null`, tanpa satu baris pun yang ditulis.
 *
 * Alasannya bukan gaya penulisan kode, tapi bug yang benar-benar terjadi: pintu
 * ini tidak punya DOMPET TUJUAN (input-nya cuma nama dompet asal), jadi baris
 * `transfer` yang lahir dari sini selalu SATU SISI — uangnya keluar dari dompet,
 * hilang, dan tidak mendarat di mana pun. Ledger memang membolehkan transfer
 * satu sisi untuk setoran celengan (`saving`), tapi bukan untuk pindah dompet.
 *
 * Pindah dana punya SATU pintu yang benar: `postTransfer()` — di sana nomor
 * dompet asal & tujuan, saldo sumber, dan nama tujuannya semua diperiksa
 * sekaligus. Karena itu pagar ini hidup di sini (bukan di komponen): apa pun
 * jalur yang mencoba mencatat transfer lewat fungsi umum ini akan ditolak, jadi
 * lubang "transfer ngambang" tidak bisa kembali lewat shell baru mana pun.
 *
 * ── PAGAR "BELUM ADA DOMPET" (paket 59 · temuan audit #1) ─────────────────────
 * `wallet` KOSONG DITOLAK di sini: `null`, tanpa satu baris pun ditulis.
 *
 * Dulu keadaan itu tidak pernah sampai ke sini karena `defaultWalletNameFor()`
 * menambalkan dompet 'Tunai' (konteks Keluarga) pada konteks yang tidak punya
 * dompet — catatan dari konteks "Bersama" memotong saldo Tunai tanpa user
 * sadari. Pagar ini hidup di store, bukan cuma di komponen, supaya lubang yang
 * sama tidak bisa kembali lewat jalur tulis mana pun (FAB, modal web, kalender,
 * AI capture). Yang dikatakan ke user saat ditolak ada di
 * `TRANSACTION_NO_WALLET_COPY` (`lib/data/history.ts`).
 *
 * ── PAGAR SALDO SUB-NOL (paket 74) ───────────────────────────────────────────
 * Pengeluaran yang melebihi saldo dompet HIDUP ditolak di sini: `null`, tanpa
 * satu baris pun. Ini jalur yang dipakai form manual (FAB/modal web/kalender) dan
 * AI capture (struk/ucapan/chat), jadi pagarnya berlaku untuk semuanya — termasuk
 * pelunasan tagihan yang menulis lewat `postExpense`. Pemeriksaannya MURNI lewat
 * `walletFundsCheck()` supaya UI bisa menampilkan alasannya lebih dulu; penolakan
 * di sini adalah pagar terakhir.
 *
 * Nama dompet yang TIDAK dikenal ledger tetap dicatat apa adanya dengan
 * `walletId: ''` (tidak menyentuh saldo mana pun, jadi tidak dijepit) —
 * penolakan "dompet kosong" di atas tetap KHUSUS dompet kosong.
 */
export function postTransaction(input: RecordTransactionInput): MoneyRow | null {
  /* transfer TIDAK bisa ditulis dari sini — lihat penjelasan di atas */
  if (input.type === 'transfer') return null
  const amount = normalizeAmount(input.amount)
  if (!amount || amount < 0) return null
  const walletName = input.wallet.trim()
  if (!walletName) return null
  const walletId = walletIdOfName(live, walletName)
  /* SALDO TIDAK BOLEH SUB-NOL — hanya untuk PENGELUARAN dari dompet yang dikenal
     ledger (dompet tak dikenal menulis `walletId: ''` dan tidak memotong saldo). */
  if (input.type === 'expense' && walletId) {
    const funds = walletFundsCheck(live, walletName, amount)
    if (funds.known && !funds.sufficient) return null
  }

  const before = live.rows
  const row = appendRow({
    walletId,
    walletName,
    type: ledgerTypeOf(input.type),
    amount,
    note: input.name,
    category: input.category || TRANSACTION_FALLBACK_CATEGORY,
    dateISO: input.dateISO,
    aiGenerated: input.aiGenerated ?? true,
    clientTxId: input.clientTxId,
  })
  trackCreatedRow(row, before)
  return row
}

/* ── UTANG/PIUTANG MENYENTUH KAS (paket 41) ──────────────────────────────────
   Sebelum paket ini, "Catat Bayar" hanya mengurangi angka di kartu hutang:
   dompet tidak bergerak, tapi Net Worth naik sebesar pelunasannya. Dua fungsi di
   bawah menutup lubang itu lewat jalur yang SAMA dengan seluruh uang lain di
   app (`appendRow` → `commit` → penjaga invariant), jadi mustahil ada pelunasan
   yang tidak meninggalkan baris kas. */

export interface DebtSettlementInput {
  /** id catatan hutang/piutang di domain Kekayaan (bukan dompet) */
  debtId: string
  /** `out` = kita membayar hutang, `in` = kita menerima pelunasan piutang */
  direction: CashDirection
  /** dompet yang benar-benar menyentuh uang (sumber saat `out`, tujuan saat `in`) */
  walletId: string
  /** sisa kewajiban/hak yang tercatat di catatannya */
  owedAmount: number
  /** nominal yang benar-benar diserahkan/diterima user (boleh lebih → kembalian) */
  paidAmount: number
  /** nama platform/teman untuk nama baris & kalimat kembalian */
  counterparty: string
  dateISO?: string
  clientTxId?: string
}

export interface DebtSettlementResult {
  debtId: string
  plan: SettlementPlan
  /** baris yang benar-benar ditulis: [pelunasan] atau [pelunasan, kembalian] */
  rows: MoneyRow[]
  /** nama dompet yang dipakai — disimpan di riwayat pembayaran (bukan cuma id) */
  walletName: string
  walletId: string
  /** saldo dompet SETELAH semua baris ditulis (dibaca dari ledger, bukan dihitung di UI) */
  walletBalanceAfter: number
}

/**
 * Satu pintu untuk pelunasan hutang & penerimaan piutang. `null` = ditolak
 * (nominal tidak sah, dompet tidak ada, atau saldo dompet tidak cukup) dan
 * TIDAK ada satu pun baris yang ditulis — UI menampilkan alasannya ke user.
 *
 * Catatan kembalian: selisih lebih-bayar ditulis sebagai baris `change`, dan
 * PEMBALIK kewajibannya hidup di `plan.changeRecord` (dipakai halaman Kekayaan
 * untuk membuat catatan baru) supaya Net Worth tidak melompat — lihat
 * `lib/data/wealth-cash.ts`.
 */
export function postDebtSettlement(input: DebtSettlementInput): DebtSettlementResult | null {
  const plan = planDebtSettlement({
    direction: input.direction,
    owedAmount: input.owedAmount,
    paidAmount: input.paidAmount,
    counterparty: input.counterparty,
  })
  if (!plan) return null

  const wallet = walletSeedOf(live, input.walletId)
  if (!wallet) return null
  /* membayar tidak boleh melebihi uang yang benar-benar ada di dompet itu */
  if (input.direction === 'out' && plan.cashMoved > walletBalance(live, input.walletId)) return null

  const rows = plan.rows.map((draft) => {
    const isChange = draft.type === 'change'
    return appendRow({
      walletId: wallet.id,
      walletName: wallet.name,
      type: draft.type,
      amount: draft.amount,
      note: isChange ? plan.changeNote : settlementNote(input.direction, input.counterparty),
      category: DEBT_CASH_CATEGORY[draft.type as keyof typeof DEBT_CASH_CATEGORY],
      dateISO: input.dateISO,
      /* dua baris dari satu aksi tetap satu kunci idempotensi: yang kedua
         dibedakan sufiksnya supaya double-tap tidak menggandakan keduanya */
      clientTxId: isChange && input.clientTxId ? `${input.clientTxId}-change` : input.clientTxId,
    })
  })

  /* JEJAK: pelunasan menyentuh kas — yang dikirim cuma scope/arah/ada kembalian,
     bukan nominal pelunasannya */
  trackMoneyEvent('settlement_recorded', {
    scope: 'debt',
    direction: input.direction,
    has_change: plan.changeAmount > 0,
  })

  return {
    debtId: input.debtId,
    plan,
    rows,
    walletId: wallet.id,
    walletName: wallet.name,
    walletBalanceAfter: walletBalance(live, wallet.id),
  }
}

/* ── HAPUS (BENAR-BENAR HAPUS) ─────────────────────────────────────────────── */

/**
 * Kunci tombstone yang SERAGAM untuk satu baris yang sama di halaman berbeda.
 *
 * Tiga halaman memanggil baris yang sama dengan bentuk id yang berbeda:
 *   · `/history`            → `9001` (angka, `HistoryTransaction.id`)
 *   · Home ("Transaksi Terakhir") → `session-9001` (id baris ringkasan Home)
 *   · `/wallet/[id]`        → `9001` (angka juga)
 * Id baris ledger `9001+` selalu milik catatan user (mock lama berid 1–900),
 * jadi keduanya disamakan jadi `session-9001`. Tanpa penyamaan ini, hapus di
 * Home tidak akan terlihat di Riwayat — persis temuan audit #7.
 *
 * Baris MOCK memakai id layarnya masing-masing (`1`…`16` di Riwayat, `101`… di
 * halaman dompet, `seed-1` di Home). Id-id itu hidup di konstanta halaman yang
 * berbeda dan tidak pernah tampil di dua halaman sekaligus, jadi tombstone-nya
 * cukup apa adanya.
 */
function tombstoneKey(id: string | number): string {
  const value = String(id)
  return /^\d+$/.test(value) ? `session-${value}` : value
}

/**
 * Tandai baris terhapus. Barisnya TIDAK dibuang dari state — tombstone-nya yang
 * membuat ia hilang dari SEMUA halaman, termasuk baris mock yang hidup di
 * konstanta `lib/data/*` (itu sebabnya dulu catatan yang dihapus "lahir lagi"
 * setiap halaman di-mount ulang — temuan audit #7).
 */
export function removeRow(id: string | number): void {
  const key = tombstoneKey(id)
  if (live.removedIds.includes(key)) return
  const row = live.rows.find((candidate) => candidate.id === key)
  commit({ ...live, removedIds: [...live.removedIds, key] })
  /* HAPUS DI SERVER (paket 45) kalau barisnya memang ada di database. Baris MOCK
     (yang hidup di konstanta `lib/data/*`) tidak punya baris di server, jadi
     tombstone lokal sudah cukup untuk baris itu. */
  if (row) void deleteRemoteRow(row.id)

  /* JEJAK: hapus catatan adalah aksi kritikal (uang bisa "hilang" dari laporan);
     jenisnya diambil dari baris ledger kalau ada — `'unknown'` untuk baris mock
     yang hidup di konstanta halaman. Nominal & nama catatan tidak ikut. */
  trackMoneyEvent('transaction_deleted', { kind: row ? eventKindOf(row.type) : 'unknown' })
}

/** kebalikan `removeRow` — dipakai tombol Undo di Riwayat & Home */
export function restoreRow(id: string | number): void {
  const key = tombstoneKey(id)
  if (!live.removedIds.includes(key)) return
  commit({ ...live, removedIds: live.removedIds.filter((item) => item !== key) })
}

/* ── HAPUS & PULIHKAN MASSAL (paket 59 · item 59.2) ───────────────────────────
   Tombol "Hapus semua riwayat" butuh satu pintu tulis, bukan perulangan
   `removeRow()` dari komponen:

     • Loop = N `commit()` (N tulis IndexedDB + N siaran ke seluruh halaman) dan
       N kesempatan state setengah jadi terbaca render di tengah proses;
     • tombstonesnya juga harus ditulis SEKALI supaya angka "N catatan dihapus"
       di dialog = jumlah baris yang benar-benar berubah.

   Yang dikembalikan adalah jumlah baris yang BARU ditombstone (id yang sudah
   terhapus tidak dihitung dua kali) — idempoten: memanggilnya dua kali dengan
   daftar yang sama tidak menambah tombstone kedua.

   Aturan uangnya tidak berubah sedikit pun: tombstone hanya menyembunyikan
   baris, saldo tetap `opening + Σ baris` (kanon §4.5). Pindah dana yang dihapus
   lewat jalur ini juga TIDAK mengembalikan uangnya — pembatalan pindah dana
   tetap cuma lewat `cancelTransferRow()` satu per satu (paket 55), dan itu
   disebutkan apa adanya di copy konfirmasinya. */
export function removeRows(ids: readonly (string | number)[]): number {
  const keys = [...new Set(ids.map((id) => tombstoneKey(id)))].filter(
    (key) => !live.removedIds.includes(key),
  )
  if (keys.length === 0) return 0

  commit({ ...live, removedIds: [...live.removedIds, ...keys] })

  /* baris yang memang ada di server ikut dihapus di sana — baris MOCK (yang
     hidup di konstanta `lib/data/*`) tidak punya baris di server, jadi
     tombstone lokal sudah cukup, persis pola `removeRow()` */
  for (const key of keys) {
    const row = live.rows.find((candidate) => candidate.id === key)
    if (row) void deleteRemoteRow(row.id)
  }

  /* JEJAK: satu event untuk satu aksi user. `kind: 'batch'` menandai hapus
     massal — jenis per barisnya sengaja tidak dikirim supaya satu aksi tidak
     jadi N event; nominal & nama catatan tetap tidak pernah ikut. */
  trackMoneyEvent('transaction_deleted', { kind: 'batch' })
  return keys.length
}

/** kebalikan `removeRows` — satu commit juga, dipakai tombol Undo hapus-semua */
export function restoreRows(ids: readonly (string | number)[]): number {
  const keys = new Set(ids.map((id) => tombstoneKey(id)))
  const next = live.removedIds.filter((key) => !keys.has(key))
  const restored = live.removedIds.length - next.length
  if (restored === 0) return 0
  commit({ ...live, removedIds: next })
  return restored
}

/* ── HAPUS DOMPET (paket 62) ──────────────────────────────────────────────────
   Sebelum paket ini, `DELETE /api/wallets/:id` SUDAH ada di server
   (`app/api/wallets/[id]/route.ts`) tapi tidak punya satu pun pemanggil di UI:
   user bisa menambah dompet, mengoreksi saldonya, memindahkan dananya — tapi
   tidak bisa membuangnya. Dompet contoh yang tidak relevan menumpuk selamanya.

   Bentuk "hapus"-nya TOMBSTONE, bukan hapus fisik, dan itu bukan pilihan gaya:
   `commit()` memanggil penjaga invariant yang menghitung `Σ saldo − Σ opening`
   dari `snapshot.wallets`. Membuang dompet (beserta `opening`-nya) sementara
   barisnya tetap ada membuat penjumlahan itu tidak seimbang, dan penulisannya
   DITOLAK. Jadi dompet tetap ada di state; yang hilang adalah visibilitasnya di
   daftar kartu, picker dompet, Total Saldo, dan Net Worth — sementara barisnya
   TIDAK ikut dibuang supaya saldo dompet lain tidak bergerak dan riwayat uang
   tetap bisa ditelusuri (kanon §4.5: yang dihapus dompetnya, bukan uangnya).

   `rowCount` adalah bagian dari janji ke user (dialog menyebut berapa catatan
   yang menyentuh dompet ini) — angka itu datang dari `walletRecordCount()`, satu
   definisi, bukan hitungan kedua di komponen. */

/**
 * Bukti satu aksi hapus dompet — dipakai copy dialog, toast, dan Undo.
 *
 * Sengaja menyimpan `balance` (saldo saat dihapus) dan `rowCount` (jumlah catatan
 * yang menyentuh dompet itu) supaya laporan & toast bisa menyebut ANGKA, bukan
 * kalimat umum.
 */
export interface WalletRemoval {
  walletId: string
  name: string
  /** konteks uang dompet — dipakai jejak analitik (bukan nama/nominalnya) */
  context: WalletSeed['context']
  /** saldo dompet saat dihapus (`opening + Σ baris`) */
  balance: number
  /** jumlah catatan yang menyentuh dompet ini saat dihapus */
  rowCount: number
}

/**
 * Hapus dompet dari daftar user — SATU-SATUNYA pintu hapus dompet di app.
 *
 * `null` = tidak ada yang dihapus (id kosong, dompet tidak dikenal, atau sudah
 * dihapus sebelumnya). Urutan kerjanya:
 *
 *   1. TOMBSTONE lokal (`removedWalletIds`) → dompet hilang dari semua daftar,
 *      picker, Total Saldo, dan Net Worth dalam satu commit;
 *   2. panggil endpoint yang SUDAH ADA di server (`DELETE /api/wallets/:id`,
 *      lewat `deleteRemoteWallet`) supaya store perangkat & database bercerita
 *      sama — `void` (tidak ditunggu) karena hapus lokal sudah sah, dan tanpa
 *      sesi/backend panggilan itu mengembalikan `false` tanpa efek apa pun;
 *   3. JEJAK analitik (`wallet_deleted`) — hanya konteks & ada-tidaknya catatan,
 *      tanpa nama dompet maupun nominal.
 *
 * Yang TIDAK dilakukan: menghapus baris ledger dompet ini. Barisnya tetap
 * dihitung di saldo & tetap tampil di Riwayat (uang yang sudah keluar tidak
 * kembali — kanon §4.5), dan justru itulah yang menjaga invariant ledger tetap
 * seimbang.
 */
export function removeWalletAccount(id: string): WalletRemoval | null {
  const key = id.trim()
  if (!key) return null
  const wallet = live.wallets.find((item) => item.id === key)
  if (!wallet || live.removedWalletIds.includes(key)) return null

  const removal: WalletRemoval = {
    walletId: wallet.id,
    name: wallet.name,
    context: wallet.context,
    balance: walletBalance(live, wallet.id),
    rowCount: walletRecordCount(live, wallet.id),
  }

  commit({ ...live, removedWalletIds: [...live.removedWalletIds, key] })

  /* hapus di server lewat endpoint yang sudah ada (paket 62 · temuan audit #2) */
  void deleteRemoteWallet(wallet.id)

  /* JEJAK: konteks + ada/tidaknya catatan. Nama dompet & nominal TIDAK ikut
     (penyaring `lib/analytics.ts` membuangnya lagi sebagai penjaga kedua). */
  trackMoneyEvent('wallet_deleted', {
    scope: removal.context,
    had_rows: removal.rowCount > 0,
  })

  return removal
}

/**
 * Undo hapus dompet: cabut tombstone-nya. `false` = tidak ada yang dipulihkan
 * (dompetnya memang tidak sedang dihapus) — pemanggil memakai itu untuk berkata
 * jujur kalau jendela Undo sudah lewat.
 *
 * Dompet yang dihidupkan kembali dikirim ulang ke server (`pushWalletToServer`)
 * supaya perangkat kedua melihatnya lagi. BATAS JUJUR yang ditulis apa adanya di
 * laporan: baris ledger yang sudah ter-cascade di sisi database TIDAK bisa
 * dihidupkan kembali lewat jalur ini (`ledger_rows` punya FK `on delete cascade`
 * ke `wallets`) — di perangkat ini barisnya tidak pernah dibuang, jadi angka yang
 * dilihat user tetap konsisten.
 */
export function restoreWalletAccount(removal: WalletRemoval): boolean {
  if (!live.removedWalletIds.includes(removal.walletId)) return false
  commit({
    ...live,
    removedWalletIds: live.removedWalletIds.filter((id) => id !== removal.walletId),
  })
  const wallet = live.wallets.find((item) => item.id === removal.walletId)
  if (wallet) void pushWalletToServer(wallet, live.wallets.indexOf(wallet))
  return true
}

/* ── BATALKAN PINDAH DANA (paket 55) ──────────────────────────────────────────
   Pindah dana yang salah dibatalkan dari jalur hapus yang sama dengan catatan
   lain (Riwayat / Home / dompet detail). Satu perbedaan penting: baris
   `transfer` menggerakkan DUA dompet, jadi “hapus” saja tidak cukup —
   tombstone menyembunyikan catatannya, tapi uangnya tetap ada di dompet tujuan
   dan hilang dari dompet asal.

   Kenapa bukan `removeRow` yang otomatis mengembalikan uang untuk SEMUA jenis
   baris: kanon paket 46/49/51 sudah menetapkan “yang dihapus barisnya, bukan
   uangnya” (uang yang benar-benar keluar untuk belanja tidak bisa dibatalkan
   dengan menghapus catatannya), dan `postBalanceAdjustment` adalah
   satu-satunya jalur sah untuk mengembalikan uang tanpa mengubah riwayat. Jadi
   yang dilakukan di sini adalah gabungan keduanya, KHUSUS untuk pindah dana:

     1. baris `transfer`-nya di-THOMBSTONE (hilang dari semua daftar, server
        ikut menghapusnya) — persis seperti hapus catatan biasa;
     2. DUA baris `balance_adjustment` bertanda ditulis oleh store: +nominal ke
        dompet asal, −nominal ke dompet tujuan. Mesin ledger tidak disentuh
        sama sekali (`walletDelta`/invariant tetap apa adanya) — yang berubah
        hanya baris-baris yang ditulis, dan Σ pengaruhnya nol sehingga kas total
        tidak bergerak.

   Hasilnya bisa dibuktikan angkanya: BCA 1.200.000 & GoPay 600.000 setelah
   transfer Rp 250.000 → kembali 1.450.000 & 350.000, dengan dua baris koreksi
   bernama jelas di Riwayat (“Batal pindah ke GoPay” / “Batal terima dari BCA”).
   ────────────────────────────────────────────────────────────────────────── */

export interface TransferCancellation {
  /** id baris `transfer` yang dibatalkan (sudah bertombstone) */
  rowId: string
  amount: number
  fromWalletId: string
  fromName: string
  toWalletId: string
  toName: string
  /** id dua baris koreksi yang mengembalikan uangnya — dipakai Undo */
  reversalIds: string[]
}

/**
 * Batalkan satu baris pindah dana. `null` = barisnya bukan pindah dana yang
 * bisa dibatalkan, ATAU uangnya sudah terpakai di dompet tujuan.
 *
 * Pemanggil yang mendapat `null` tetap menghapus barisnya seperti biasa
 * (`removeRow`) — jadi catatan mock bertipe `transfer` (yang memang tidak
 * menggerakkan saldo apa pun) dan baris non-transfer tetap terhapus normal.
 *
 * Penolakan saat saldo tujuan < nominal: membalikkan uang yang sudah dipakai
 * akan membuat saldo dompet itu MINUS, dan dompet Indonesia tidak bisa minus —
 * itu klaim palsu tentang uang user. Yang benar: katakan sisa saldonya, minta
 * user merapikan dulu, dan TIDAK menulis apa pun (barisnya belum dihapus).
 */
export function cancelTransferRow(id: string | number): TransferCancellation | null {
  const key = tombstoneKey(id)
  const row = live.rows.find((candidate) => candidate.id === key)
  if (!row) return null
  if (row.type !== 'transfer' || !row.counterWalletId) return null
  if (isRowRemoved(live, row.id)) return null

  const amount = Math.abs(row.amount)
  const toWalletId = row.counterWalletId
  if (amount <= 0) return null
  /* uang pindahnya harus masih ADA di dompet tujuan (lihat catatan di atas) */
  if (walletBalance(live, toWalletId) < amount) return null

  const fromName = row.walletName || walletNameOf(live, row.walletId)
  const toName = walletNameOf(live, toWalletId)
  const dateISO = row.dateISO

  /* 1) hapus catatannya — jalur tombstone yang sama dengan hapus biasa */
  removeRow(row.id)

  /* 2) kembalikan uangnya ke DUA dompet, lewat dua baris koreksi bertanda yang
        namanya menjelaskan diri sendiri (bukan perubahan saldo tanpa jejak) */
  const backIn = appendRow({
    walletId: row.walletId,
    walletName: fromName,
    type: 'balance_adjustment',
    amount,
    note: TRANSFER_SHEET_COPY.cancelNoteIn(toName),
    category: WALLET_SYNC_ADJUSTMENT_COPY.adjustmentCategory,
    dateISO,
  })
  const backOut = appendRow({
    walletId: toWalletId,
    walletName: toName,
    type: 'balance_adjustment',
    amount: -amount,
    note: TRANSFER_SHEET_COPY.cancelNoteOut(fromName),
    category: WALLET_SYNC_ADJUSTMENT_COPY.adjustmentCategory,
    dateISO,
  })

  return {
    rowId: row.id,
    amount,
    fromWalletId: row.walletId,
    fromName,
    toWalletId,
    toName,
    reversalIds: [backIn.id, backOut.id],
  }
}

/**
 * Undo pembatalan pindah dana: baris pindah dananya dihidupkan kembali, dan uang
 * di DUA dompet dikembalikan ke keadaan sebelum dibatalkan.
 *
 * Kenapa ada baris KOREKSI BARU di sini, bukan sekadar “cabut tombstone-nya”:
 * kanon paket 46/49/51 — *yang dihapus barisnya, bukan uangnya*. Baris yang
 * di-tombstone TETAP dihitung di saldo, jadi mencabut tombstone dua baris
 * koreksi pembatalan tidak mengembalikan uangnya; yang terjadi justru catatan
 * pindah dananya muncul lagi sementara saldonya masih seperti setelah
 * dibatalkan. Karena itu Undo ditulis sebagai PEMBALIKAN ULANG: baris pindah
 * dananya dihidupkan, lalu dua baris koreksi baru mengembalikan efeknya
 * (−nominal di dompet asal, +nominal di dompet tujuan).
 *
 * Konsekuensinya jujur dan disengaja: Riwayat menampilkan CERITA LENGKAPNYA
 * (“Batal pindah ke GoPay” → “Pindah ke GoPay dipulihkan”), bukan menghapus
 * jejak. Ini yang membuat janji di dialog konfirmasi hapus (“masih bisa
 * dibalikin lewat Undo selama 8 detik”) tetap benar untuk baris pindah dana.
 */
export function undoTransferCancellation(cancellation: TransferCancellation): void {
  /* 1) catatan pindah dananya kembali ke semua daftar */
  restoreRow(cancellation.rowId)

  /* 2) uangnya dikembalikan ke dua sisi dengan pasangan koreksi baru */
  appendRow({
    walletId: cancellation.fromWalletId,
    walletName: cancellation.fromName,
    type: 'balance_adjustment',
    amount: -cancellation.amount,
    note: TRANSFER_SHEET_COPY.cancelRestoreNote(cancellation.toName),
    category: WALLET_SYNC_ADJUSTMENT_COPY.adjustmentCategory,
  })
  appendRow({
    walletId: cancellation.toWalletId,
    walletName: cancellation.toName,
    type: 'balance_adjustment',
    amount: cancellation.amount,
    note: TRANSFER_SHEET_COPY.cancelRestoreIn(cancellation.fromName),
    category: WALLET_SYNC_ADJUSTMENT_COPY.adjustmentCategory,
  })
}

/* ── EDIT (BENAR-BENAR EDIT) · paket 48 · temuan B laporan 46 ────────────────
   Sebelum paket ini, "Edit" di Riwayat hidup di `useState` halaman
   (`editedTxs`): nilainya terlihat di halaman yang mengeditnya, sementara Home,
   `/wallet/[id]`, dan grafik arus uang tetap menampilkan angka lama — lalu
   hilang sama sekali setelah refresh. Satu tindakan, dua cerita (PRD 244).

   Sekarang edit menempuh jalur yang SAMA dengan hapus (`removeRow`) dan catat
   (`appendRow`): satu pintu tulis, satu state, satu sumber kebenaran.

     · Baris STORE (`session-*`) → barisnya benar-benar DIPERBARUI. Saldo tidak
       perlu dihitung ulang: store selalu menurunkan saldo dari
       `opening + Σ baris` (`balancesOf`), jadi memindahkan `walletId` pun
       otomatis benar. `commit()` tetap memanggil penjaga invariant sebelum
       state dipasang, dan server menerima `PATCH`-nya (`updateRemoteRow`).
     · Baris MOCK (konstanta `lib/data/*`) → patch disimpan di `rowOverrides` dan
       diterapkan saat dipajang (`applyRowOverride`). Konstanta demo TIDAK
       disunting: itu data contoh repo, bukan milik user.
     · `null` = input tidak sah ATAU barisnya sudah dihapus → TIDAK ada apa pun
       yang ditulis, dan halaman pemanggil tidak boleh berbunyi "tersimpan". */

/**
 * Satu baris MOCK yang boleh diedit — tiga konstanta `lib/data/*` yang
 * benar-benar tampil di daftar transaksi. Id-nya hidup di ruang yang
 * berbeda-beda (`2` di Riwayat, `seed-2` di Home, `101` di halaman dompet),
 * jadi pencariannya memakai kunci tombstone yang sama.
 */
type MockTransactionRow = HistoryTransaction | HomeMoneyRow

function mockRowByKey(key: string): MockTransactionRow | null {
  return (
    HISTORY_TRANSACTIONS.find((tx) => tombstoneKey(tx.id) === key) ??
    HOME_MONEY_ROWS.find((row) => tombstoneKey(row.id) === key) ??
    Object.values(WALLET_DETAIL_TRANSACTIONS)
      .flat()
      .find((tx) => tombstoneKey(tx.id) === key) ??
    null
  )
}

/**
 * Bersihkan & tolak patch sebelum ada satu byte pun yang ditulis.
 *
 * Yang DITOLAK (kontrak paket ini): nominal ≤ 0 / bukan angka, tipe asing, id
 * dompet yang tidak dikenal ledger, dan tanggal yang bukan `YYYY-MM-DD`.
 * Field yang dikosongkan (`name: '  '`, `category: ''`) sengaja DILEWATI, bukan
 * ditulis: mengosongkan nama catatan bukan perbaikan data — barisnya akan tampil
 * sebagai catatan tanpa nama di SEMUA daftar.
 */
function normalizeRowPatch(patch: RowPatch): RowPatch | null {
  const next: RowPatch = {}

  if (patch.amount !== undefined) {
    const amount = normalizeAmount(patch.amount)
    if (amount === null || amount < 0) return null
    next.amount = amount
  }

  if (patch.type !== undefined) {
    if (!EDITABLE_TYPES.includes(patch.type)) return null
    next.type = patch.type
  }

  if (patch.walletId !== undefined) {
    const walletId = patch.walletId.trim()
    /* `''` sah = "belum terhubung ke dompet" (keadaan baris yang dicatat dengan
       dompet yang belum ada di ledger). Id ASING ditolak: baris itu tidak akan
       menggerakkan saldo mana pun, dan itu klaim palsu. */
    if (walletId !== '' && !live.wallets.some((wallet) => wallet.id === walletId)) return null
    next.walletId = walletId
  }

  if (patch.wallet !== undefined) {
    const wallet = patch.wallet.trim()
    if (wallet) next.wallet = wallet
  }

  if (patch.name !== undefined) {
    const name = patch.name.trim()
    if (name) next.name = name
  }

  if (patch.category !== undefined) {
    const category = patch.category.trim()
    if (category) next.category = category
  }

  if (patch.dateISO !== undefined) {
    const dateISO = patch.dateISO.trim()
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateISO)) return null
    next.dateISO = dateISO
  }

  if (patch.aiGenerated !== undefined) next.aiGenerated = patch.aiGenerated

  return next
}

/**
 * Dompet untuk baris store setelah diedit: `{ walletId, walletName }`.
 *
 * Aturannya satu: **nama dompet yang belum ada di ledger membuat barisnya
 * "belum terhubung" (`walletId: ''`), bukan menebak dompet terdekat** — persis
 * yang dilakukan `postTransaction` saat user mencatat catatan baru dengan dompet
 * yang belum ditambahkan (mis. memilih `OVO` padahal OVO belum jadi dompet).
 * Menebak dompet terdekat justru memindahkan uang user ke dompet yang salah;
 * lebih baik jujur "belum terhubung".
 */
function walletForRowAfterEdit(
  row: MoneyRow,
  patch: RowPatch,
): { walletId: string; walletName: string } {
  if (patch.walletId !== undefined) {
    return {
      walletId: patch.walletId,
      walletName:
        patch.walletId === ''
          ? (patch.wallet ?? row.walletName)
          : walletNameOf(live, patch.walletId),
    }
  }
  if (patch.wallet === undefined) return { walletId: row.walletId, walletName: row.walletName }

  const walletId = walletIdOfName(live, patch.wallet)
  return { walletId, walletName: walletId === '' ? patch.wallet : walletNameOf(live, walletId) }
}

/**
 * Terapkan patch ke baris LEDGER yang ada (bukan baris pajangan).
 *
 * Dua hal yang sengaja dijaga:
 *   1. **Jenis baris tidak ikut berubah kalau user tidak mengubah tipe.**
 *      Baris `balance_adjustment` (koreksi saldo) & `change` (kembalian)
 *      nominalnya BERTANDA, sementara sheet menampilkannya sebagai
 *      pengeluaran/pemasukan biasa. Kalau user cuma mengubah nominalnya, jenis
 *      aslinya dipertahankan (tandanya ikut); kalau tipe memang diganti, jenis
 *      barunya datang dari `ledgerTypeOf()`.
 *   2. **Dompet lawan dilepas saat jenisnya berhenti jadi pindah dana.**
 *      Ledger menolak `expense` yang ber-`counterWalletId` (invarian), dan kalau
 *      dibiarkan dompet tujuan tetap menerima uang dari baris yang sudah bukan
 *      transfer lagi.
 */
function editLedgerRow(row: MoneyRow, patch: RowPatch): MoneyRow | null {
  const wallet = walletForRowAfterEdit(row, patch)
  const sameType = patch.type === undefined || patch.type === displayTypeOf(row)
  const type = sameType ? row.type : ledgerTypeOf(patch.type as TransactionType)

  if (movesBetweenWallets(type) && row.counterWalletId && row.counterWalletId === wallet.walletId) {
    /* sumber = dompet lawan: uangnya jadi tidak pindah ke mana-mana dan invariant
       ledger menolaknya. Patch ini DITOLAK di sini, bukan ditulis setengah jalan. */
    return null
  }

  const amount = patch.amount ?? displayAmountOf(row)
  const nextRow: MoneyRow = {
    ...row,
    walletId: wallet.walletId,
    walletName: wallet.walletName,
    type,
    /* baris yang jenisnya TETAP dan memang bertanda (koreksi saldo/kembalian)
       menyimpan nominalnya dengan tanda aslinya */
    amount: sameType && row.amount < 0 ? -amount : amount,
    note: patch.name ?? row.note,
    dateISO: patch.dateISO ?? row.dateISO,
    aiGenerated: patch.aiGenerated ?? row.aiGenerated,
    ...(patch.category !== undefined ? { category: patch.category } : {}),
  }
  if (!movesBetweenWallets(type)) delete nextRow.counterWalletId

  const rows = live.rows.map((candidate) => (candidate.id === row.id ? nextRow : candidate))
  commit({ ...live, rows })
  /* PATCH DI SERVER (paket 48): `pushRowToServer` TIDAK bisa dipakai untuk edit —
     barisnya sudah ada dan `client_tx_id`-nya unique, jadi jawabannya 23505 yang
     diterjemahkan sebagai "sudah tersimpan" padahal isinya masih lama. */
  void updateRemoteRow(nextRow)
  return nextRow
}

/**
 * SIMPAN HASIL EDIT — satu-satunya pintu edit di app (dipakai Riwayat &
 * `/wallet/[id]`; tidak ada lagi `editedTxs` di state halaman).
 *
 * Mengembalikan `null` kalau TIDAK ada yang ditulis (input tidak sah, baris
 * tidak dikenal, atau barisnya sudah dihapus) — pemanggil memakai itu untuk
 * memutuskan apakah boleh berbunyi "tersimpan".
 */
export function editRow(
  id: string | number,
  patch: RowPatch,
): MoneyRow | HistoryTransaction | HomeMoneyRow | null {
  const key = tombstoneKey(id)
  /* HAPUS MENANG ATAS EDIT: baris yang sudah dihapus tidak dihidupkan kembali
     oleh edit — kalau tidak, tombol Undo kehilangan artinya. */
  if (live.removedIds.includes(key)) return null

  const normalized = normalizeRowPatch(patch)
  if (!normalized) return null

  const row = live.rows.find((candidate) => candidate.id === key)
  if (row) return editLedgerRow(row, normalized)

  const mock = mockRowByKey(key)
  /* baris tak dikenal → tidak ada yang ditulis (`null`), supaya halaman tidak
     mengklaim tersimpan untuk sesuatu yang tidak terjadi */
  if (!mock) return null

  /* Baris mock hanya punya NAMA dompet (tidak ada barisnya di ledger), jadi
     `walletId` diterjemahkan ke namanya. `walletId: ''` = tanpa perubahan dompet. */
  const storedPatch: RowPatch = { ...normalized }
  delete storedPatch.walletId
  if (normalized.walletId !== undefined && normalized.wallet === undefined) {
    const name = walletNameOf(live, normalized.walletId)
    if (name) storedPatch.wallet = name
    else delete storedPatch.wallet
  }
  /* patch lama DIGABUNG: edit kedua hanya mengubah field yang benar-benar
     dikirim user, sisanya tetap seperti hasil edit sebelumnya */
  const rowOverrides: Record<string, RowPatch> = {
    ...live.rowOverrides,
    [key]: { ...live.rowOverrides[key], ...storedPatch },
  }
  const next: MoneySnapshot = { ...live, rowOverrides }
  commit(next)
  return applyRowOverride(next, mock)
}

/* ── DOMPET BARU ───────────────────────────────────────────────────────────── */

export interface NewWalletInput {
  name: string
  type: WalletAccount['type']
  number?: string
  /** saldo pembuka yang diketik user (0 kalau dikosongkan) */
  opening: number
  /**
   * Konteks uang dompet baru (paket 47) — opsional, default 'pribadi' (perilaku
   * lama). Halaman `/wallet` mengirim konteks yang sedang aktif supaya dompet
   * yang ditambah saat konteks "Keluarga" benar-benar muncul di daftar keluarga;
   * tanpa ini, empty state per konteks jadi jalan buntu (tambah dompet tapi
   * daftarnya tetap kosong). Dompet tetap satu-satunya pemilik fakta konteksnya —
   * baris catatan TIDAK menyimpan konteks sendiri.
   */
  context?: MoneyContext
}

/**
 * Resep warna dompet baru — TIDAK PERNAH dari user. Resepnya berputar dari
 * palet kanon (`walletCardRecipe`), jadi mustahil ada kartu dengan gradien di
 * luar sistem warna app. Band/muka versi deck Home diambil dari keluarga
 * Evergreen yang sama (lihat docs/theme/PALETTE.md).
 */
function walletRecipeFor(index: number): Pick<
  WalletSeed,
  'bandClass' | 'faceClass' | 'glowClass' | 'color' | 'face' | 'art'
> {
  const recipe = walletCardRecipe(index)
  return {
    bandClass: 'from-[#e6e4c0] via-[#ffffff] to-[#e6e4c0]',
    faceClass: 'from-[#52685c] via-[#45594e] to-[#161c19]',
    glowClass: 'bg-forest/25',
    color: recipe.color,
    face: recipe.face,
    art: recipe.art,
  }
}

/** dompet baru dari form "Tambah Dompet" (`/wallet`) */
export function addWalletAccount(input: NewWalletInput): WalletSeed {
  const opening = Math.max(0, Math.round(input.opening) || 0)
  const record: WalletSeed = {
    id: nextWalletId(live.wallets),
    name: input.name.trim() || 'Dompet Baru',
    holder: live.wallets[0]?.holder ?? 'Jon Snow',
    number: input.number?.trim() ?? '',
    network: walletNetworkOf(input.type),
    opening,
    kind: walletKindOf(input.type),
    type: input.type,
    context: input.context ?? 'pribadi',
    ...walletRecipeFor(live.wallets.length),
  }
  commit({ ...live, wallets: [...live.wallets, record] })
  /* dompet baru langsung naik ke server supaya perangkat kedua melihatnya
     (baris-barisnya sudah dikirim oleh `appendRow`/`flushPendingSync`) */
  void pushWalletToServer(record, live.wallets.length - 1)
  return record
}

/** tombol "Tambah Dompet" di deck Home: ambil kandidat berikutnya dari pool demo */
export function addPoolWallet(): string | null {
  const candidate = WALLET_POOL[poolIndex % WALLET_POOL.length]
  if (!candidate) return null
  poolIndex += 1
  const recipe = walletCardRecipe(live.wallets.length)
  const record: WalletSeed = {
    id: nextWalletId(live.wallets),
    name: candidate.name,
    holder: candidate.holder,
    number: candidate.number,
    network: candidate.network,
    opening: candidate.balance,
    kind: candidate.kind,
    type: candidate.kind === 'bank' ? 'Bank' : candidate.kind === 'ewallet' ? 'E-Wallet' : 'Cash',
    context: candidate.context,
    /* muka kartu `/wallet` dari resep kanon, sedangkan band + muka versi deck
       mengikuti kandidatnya — kartunya terasa satu dompet yang sama di dua
       halaman, dan tetap di dalam palet */
    color: recipe.color,
    face: recipe.face,
    bandClass: candidate.bandClass,
    faceClass: candidate.faceClass,
    glowClass: candidate.glowClass,
    art: candidate.art,
  }
  commit({ ...live, wallets: [...live.wallets, record] })
  void pushWalletToServer(record, live.wallets.length - 1)
  return record.id
}

/* ── TAMPILAN BARIS LEDGER ─────────────────────────────────────────────────── */

/** jenis ledger → jenis yang dipahami daftar transaksi app */
export function displayTypeOf(row: LedgerRow): TransactionType {
  if (row.type === 'income' || row.type === 'receivable_payment') return 'income'
  if (row.type === 'expense' || row.type === 'debt_payment') return 'expense'
  /* dua jenis bertanda: arah uang dibaca dari tanda nominalnya */
  if (row.type === 'balance_adjustment' || row.type === 'change') {
    return row.amount < 0 ? 'expense' : 'income'
  }
  return 'transfer'
}

/** nominal pajangan SELALU positif — arah uang dibaca dari `displayTypeOf` */
export function displayAmountOf(row: LedgerRow): number {
  return Math.abs(row.amount)
}

/** baris ledger → bentuk yang dipakai semua daftar transaksi (`HistoryTransaction`) */
export function toHistoryTransaction(row: MoneyRow): HistoryTransaction {
  return {
    id: row.seq,
    name: row.note,
    amount: displayAmountOf(row),
    type: displayTypeOf(row),
    category: row.category ?? TRANSACTION_FALLBACK_CATEGORY,
    wallet: row.walletName || TRANSACTION_FALLBACK_WALLET,
    date: row.dateISO,
    time: row.time,
    aiGenerated: row.aiGenerated,
  }
}

/**
 * Catatan sesi untuk daftar transaksi (Riwayat, Home, dompet detail).
 *
 * URUTANNYA DITULIS DI SINI, SATU KALI (paket 48):
 *   hapus (tombstone) MENANG atas edit (`rowOverrides`), dan edit MENANG atas
 *   baris aslinya. Baris store sendiri sudah diperbarui di barisnya, jadi
 *   override-nya memang tidak ada — tapi penerapannya tetap di sini supaya
 *   urutan itu hidup di satu tempat, bukan di tiap halaman yang bisa lupa.
 */
export function recordedTransactions(snapshot: MoneySnapshot): HistoryTransaction[] {
  return snapshot.rows
    .filter((row) => !isRowRemoved(snapshot, row.id))
    .map((row) => applyRowOverride(snapshot, toHistoryTransaction(row)))
}

/**
 * Log "Pindah Dana Terakhir" untuk halaman Dompet & Akun — TURUNAN dari baris
 * ledger `transfer` yang punya dompet lawan, bukan daftar kedua yang hidup di
 * state halaman (dulu begitu: `transfers` lokal, jadi log-nya hilang saat
 * refresh dan tidak pernah muncul di Riwayat).
 */
export function transferLogOf(snapshot: MoneySnapshot): WalletTransferRecord[] {
  return snapshot.rows
    .filter((row) => row.type === 'transfer' && row.counterWalletId)
    .filter((row) => !isRowRemoved(snapshot, row.id))
    .map((row) => {
      const transaction = toHistoryTransaction(row)
      const note = row.note === transaction.name ? undefined : row.note
      return {
        transaction,
        fromName: row.walletName,
        /* nama dompet lawan dibaca TERMASUK dompet yang sudah dihapus (paket 62):
           kalau lookup "dompet hidup" yang dipakai, log pindah dana ke dompet yang
           sudah dibuang user akan berbunyi "Pindah ke " — rujukan yatim */
        toName: walletNameAnyOf(snapshot, row.counterWalletId ?? ''),
        ...(note ? { note } : {}),
      }
    })
}

/**
 * Sisi MASUK dari baris pindah dana untuk satu dompet (paket 55).
 *
 * `toHistoryTransaction()` menyimpan dompet ASAL di kolom `wallet`, jadi baris
 * pindah dana hanya muncul di halaman dompet asalnya. Padahal pindah dana
 * menggerakkan DUA dompet: saldo dompet tujuan juga berubah, dan user berhak
 * melihat di halaman dompet itu dari mana uangnya datang.
 *
 * Fungsi ini melengkapinya TANPA tipe data baru — bentuknya tetap
 * `HistoryTransaction` yang sama, cuma dibaca dari sisi penerima, dan
 * `applyRowOverride()` tetap berlaku supaya hasil edit di Riwayat ikut terbaca
 * di sini. Namanya sengaja barisnya sendiri (“Pindah ke GoPay” di halaman GoPay
 * memang berarti uang MASUK ke GoPay).
 */
export function incomingTransfersFor(
  snapshot: MoneySnapshot,
  walletId: string,
): HistoryTransaction[] {
  return snapshot.rows
    .filter((row) => row.type === 'transfer' && row.counterWalletId === walletId)
    .filter((row) => !isRowRemoved(snapshot, row.id))
    .map((row) => applyRowOverride(snapshot, toHistoryTransaction(row)))
}

/**
 * Catatan yang MENEMPEL di satu dompet — SATU-SATUNYA cara halaman dompet
 * mengumpulkan barisnya (paket 59 · item 59.3).
 *
 * Identitasnya `row.walletId === walletId`, BUKAN nama dompet. Sebelumnya
 * `/wallet/[id]` mencocokkan baris sesi lewat `tx.wallet === wallet.name`;
 * karena nama boleh sama (dan user memang bisa menambah "BCA" kedua), catatan
 * satu dompet bisa muncul di dompet lain — dan `applyRowOverride` di halaman itu
 * membuat hasilnya terlihat seperti data yang sah.
 *
 * Baris lama yang `walletId`-nya kosong (dompetnya belum ada di ledger) SENGAJA
 * tidak masuk ke dompet mana pun: menebak dompet terdekat sama dengan
 * memindahkan uang user ke tempat yang tidak ia pilih — lebih jujur tampil di
 * Riwayat dengan penanda "Belum berkonteks".
 */
export function walletTransactionsOf(
  snapshot: MoneySnapshot,
  walletId: string,
): HistoryTransaction[] {
  if (!walletId) return []
  return snapshot.rows
    .filter((row) => row.walletId === walletId)
    .filter((row) => !isRowRemoved(snapshot, row.id))
    .map((row) => applyRowOverride(snapshot, toHistoryTransaction(row)))
}

/**
 * Dompet default untuk catatan baru: dompet PERTAMA di konteks uang aktif yang
 * namanya memang bisa dipilih user (`TRANSACTION_WALLET_OPTIONS`).
 *
 * `''` = konteks ini BELUM punya dompetnya sendiri, dan itu jawaban yang sah.
 * Sampai paket 58 fungsi ini jatuh ke `TRANSACTION_FALLBACK_WALLET` ('Tunai')
 * — dompet yang konteksnya **Keluarga**. Akibatnya catatan yang dibuat sambil
 * switcher di posisi "Bersama" memotong saldo Tunai tanpa user sadari: dompet
 * yang tidak ia pilih dan tidak ia lihat di konteks itu (temuan audit #1 paket
 * 59). Konteks tanpa dompet TIDAK boleh diam-diam menempel ke dompet lain, jadi
 * pemanggil yang menerima `''` menolak menulis + memberi arahan
 * (`TRANSACTION_NO_WALLET_COPY`), bukan menebak.
 */
export function defaultWalletNameFor(ctx: MoneyContext): string {
  const names = filterWalletsByContext(liveWalletSeeds(live), ctx).map((wallet) => wallet.name)
  return (
    names.find((name) => (TRANSACTION_WALLET_OPTIONS as readonly string[]).includes(name)) ?? ''
  )
}

/**
 * Dompet untuk kartu konfirmasi AI (paket 79) — MURNI terhadap snapshot.
 *
 * Akar temuan "Belum berkonteks": kartu konfirmasi AI menawarkan daftar dompet
 * STATIS (`TRANSACTION_WALLET_OPTIONS`: BCA/GoPay/OVO/Tunai) dan menulis nama itu
 * apa adanya. Begitu nama tebakan AI tidak ada di ledger user (`walletIdOfName`
 * → `''`), barisnya lahir tanpa dompet: ia tampil di SEMUA konteks dengan badge
 * **"Belum berkonteks"** dan tidak memotong saldo mana pun. AI yang memilih
 * dompet yang tidak dimiliki user bukan kesalahan user — jadi kartu harus
 * menawarkan DOMPET MILIK USER, bukan daftar kanon.
 *
 * Tiga nilai yang dikembalikan, dan semuanya dipakai UI supaya tidak ada
 * keputusan yang disembunyikan:
 *   · `options`      → nama dompet hidup yang boleh dipilih (konteks aktif dulu)
 *   · `value`        → yang benar-benar dipakai: tebakan AI KALAU dompetnya
 *                      memang dimiliki user (walau konteksnya lain — itu dompet
 *                      MILIKNYA, tampil di kartu, dan memang itu yang ia sebut),
 *                      kalau tidak dompet kanon pertama di konteks aktif;
 *                      `''` = konteks ini belum punya dompet sendiri
 *   · `unknownGuess` → nama tebakan AI yang tidak ada, supaya kartu bisa
 *                      mengatakannya apa adanya ("tebakan AI: OVO, jadi aku isi
 *                      Tunai") dan user bisa menggantinya
 *
 * `''` SENGAJA tidak diganti dompet konteks lain (paket 59 · temuan audit #1):
 * catatan yang ditulis sambil switcher di "Bersama" lalu memotong saldo dompet
 * Keluarga adalah uang user yang bergerak tanpa ia pilih. Dalam keadaan itu kartu
 * konfirmasi menawarkan SEMUA dompet milik user supaya ia bisa memilih sendiri,
 * dan jalur tulisnya menahan simpan sampai dompetnya dipilih.
 *
 * Nama dompet yang sama dipakai lebih dari satu kali (user boleh punya dua "BCA"):
 * pilihan di daftar di-dedupe, dan karena pencocokan dompet di app ini memang
 * by-name, barisnya mengikuti dompet pertama dengan nama itu — persis seperti
 * perilaku form lain, bukan aturan baru.
 */
export interface CaptureWalletChoice {
  value: string
  options: string[]
  unknownGuess: string
  /**
   * true = dompet yang dipakai ada di konteks LAIN daripada konteks aktif.
   *
   * Contoh nyata: switcher di "Bersama", user mengetik "airminum 5k" — AI menebak
   * `Tunai`, dan dompet itu memang MILIK user (Keluarga). Catatannya sah, tapi
   * konteksnya bukan yang sedang dibuka, jadi kartu konfirmasi mengatakannya
   * (`AI_CAPTURE_COPY.walletOtherContextNote`) alih-alih membiarkan user
   * menemukannya sendiri di Riwayat.
   */
  outsideContext: boolean
  /**
   * true = dompet yang dipakai TIDAK disebut user sendiri, melainkan dompet
   * konteks uang yang sedang aktif (paket 81).
   *
   * Ini jawaban untuk pertanyaan "kalau menambah transaksi, defaultnya pakai
   * dompet yang mana?" — dan jawabannya dinyatakan di kartu, bukan disimpan di
   * kepala user: urutannya tebakan user sendiri (kalau dompetnya memang miliknya)
   * → dompet kanon pertama di konteks aktif → dompet pertama di konteks itu.
   * `false` = user menyebut dompetnya sendiri; `true` = app yang mengisi.
   */
  fromContext: boolean
}

export function captureWalletChoice(
  snapshot: MoneySnapshot,
  ctx: MoneyContext,
  guessed: string,
): CaptureWalletChoice {
  const { inContext, options } = captureWalletNames(snapshot, ctx)

  const guess = guessed.trim()
  const match = options.find((name) => name.toLowerCase() === guess.toLowerCase())

  /* urutan pilihan default mengikuti jalur manual: dompet kanon pertama di
     konteks aktif (`defaultWalletNameFor`), baru dompet apa pun di konteks itu */
  const canonical = inContext.find((name) =>
    (TRANSACTION_WALLET_OPTIONS as readonly string[]).includes(name),
  )

  const value = match ?? canonical ?? inContext[0] ?? ''

  return {
    value,
    options,
    unknownGuess: guess && !match ? guess : '',
    outsideContext: value !== '' && !inContext.includes(value),
    /* dompet diisi APP (bukan user): hanya mungkin kalau tebakannya tidak
       menemukan dompet milik user — lihat catatan `fromContext` di atas */
    fromContext: value !== '' && !match,
  }
}

/**
 * Nama dompet kartu konfirmasi AI, dalam URUTAN yang dipakai kartu itu:
 * konteks uang aktif lebih dulu, baru dompet konteks lain (pindah konteks tetap
 * sah — sama seperti sheet Pindah Dana). Nama kembar dibuang karena pencocokan
 * dompet di app ini by-name: dua dompet bernama sama = satu tujuan baris.
 *
 * Satu tempat saja, supaya pilihan NAMA (`captureWalletChoice`) dan pilihan
 * lengkap dengan saldo (`captureWalletOptionsFor`) tidak pernah berbeda urutan.
 */
function captureWalletNames(
  snapshot: MoneySnapshot,
  ctx: MoneyContext,
): { inContext: string[]; options: string[] } {
  const wallets = liveWalletSeeds(snapshot)
  const inContext = filterWalletsByContext(wallets, ctx).map((wallet) => wallet.name)
  const otherContexts = wallets
    .filter((wallet) => wallet.context !== ctx)
    .map((wallet) => wallet.name)
  return { inContext, options: [...new Set([...inContext, ...otherContexts])] }
}

/**
 * Pilihan dompet kartu konfirmasi AI dalam bentuk yang dimakan PEMILIH DOMPET
 * (paket 81): `{ id, label, balance }` dengan `id` yang DIJAMIN unik, urut
 * konteks aktif lebih dulu.
 *
 * Kenapa ada, padahal `captureWalletChoice` sudah mengembalikan daftar nama:
 * kartu konfirmasi memakai `<select>` bawaan dengan `key={nama}` — begitu user
 * punya dua dompet bernama sama (`addWalletAccount()` mengizinkannya), React
 * melempar galat "two children with the same key, `OVO`" dan pemilihnya bisa
 * kehilangan baris. Pemilih kustom repo ini memakai `id` sebagai kunci, jadi
 * kunci yang unik harus datang dari SATU tempat: di sini — bukan disaring lagi
 * di dalam JSX.
 */
export function captureWalletOptionsFor(
  snapshot: MoneySnapshot,
  ctx: MoneyContext,
): { id: string; label: string; balance: number }[] {
  const byName = new Map(
    walletOptionsFor(snapshot).map((option) => [option.label.trim().toLowerCase(), option]),
  )
  return captureWalletNames(snapshot, ctx)
    .options.map((name) => byName.get(name.trim().toLowerCase()))
    .filter((option): option is { id: string; label: string; balance: number } => Boolean(option))
}

/**
 * Kosongkan store ke kondisi seed (dipakai test supaya tiap kasus mulai bersih).
 * Tidak pernah dipanggil UI: di produksi "reset" tidak punya arti.
 */
export function resetMoneyStore(): void {
  live = SEED_SNAPSHOT
  hydrated = false
  hydrateStarted = false
  accountPurged = false
  nextSeq = 9001
  nextWalletSeq = 1
  poolIndex = 0
  emit()
}
