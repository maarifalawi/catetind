'use client'

import type { WalletSeed } from '@/lib/wallets'
import type { MoneyRow } from '@/lib/money/store'
import { browserSupabase } from './client'
import { dataApi, dataApiOk } from './data-api'
import {
  toLedgerInsert,
  toLedgerRow,
  toWalletDbRow,
  toWalletSeed,
  type LedgerDbRow,
  type WalletDbRow,
} from './mappers'

/* ── JALUR UANG KE SERVER (paket 45) ─────────────────────────────────────────
   Ini yang menggantikan "tidak ada satu pun baris yang mengirim data keluar"
   (batas jujur paket 42). Sejak paket ini:

     · saat login, store uang MEMBACA `wallets` + `ledger_rows` + `wallet_balances`
       dari Supabase (fungsi `readRemoteMoney`);
     · setiap baris baru DIKIRIM ke `ledger_rows` dengan `client_tx_id` sebagai
       kunci idempotensi (`pushRowToServerResult`), jadi double-tap / retry / dua
       perangkat tidak bisa menggandakan catatan — penjaganya constraint
       `unique (user_id, client_tx_id)` di database, bukan cuma di memory;
     · baris yang lahir offline tetap tinggal di antrean lokal (`lib/money/idb.ts`
       sebagai cache) dan dikirim saat `flushPendingSync()` di store;
     · pembacaan menarik SELURUH baris (bertahap), bukan 200 terbaru — angka
       bulan berjalan tidak boleh bergantung pada jendela baca.

   Semua fungsi di sini mengembalikan `null`/hasil kosong KALAU tidak ada sesi
   atau backend belum dipasangkan — pemanggil (store) lalu tetap jalan lokal.
   Tidak ada `throw` ke UI: gagal kirim bukan alasan menghentikan user mencatat.

   Saldo TIDAK PERNAH ditulis dari sini. Yang dikirim hanya baris ledger; angka
   saldo datang dari view `wallet_balances` (turunan `opening + Σ baris`), dan
   `balances` dipakai untuk MEMBANDINGKAN hasil hitung server dengan hasil hitung
   klien — dua angka untuk satu dompet adalah alarm, bukan sesuatu yang dibiarkan. */

export interface RemoteMoney {
  wallets: WalletSeed[]
  /** terbaru dulu (pola yang sama dengan store) */
  rows: MoneyRow[]
  /** saldo menurut view server: `walletId → balance` */
  balances: Record<string, number>
}

/* ── BACA SEMUA BARIS, BUKAN 200 TERBARU (perbaikan "angka berubah setelah login")
   Dulu bacaan dibatasi `limit(200)`. Akibatnya angka bulan berjalan bergantung
   pada CARA pandang: cache perangkat bisa memuat baris lama yang tidak lagi
   masuk jendela 200, sementara login baru / klien bersih hanya melihat 200 baris
   terbaru — dua total untuk data yang sama. Sekarang seluruh baris dibaca
   bertahap (`range`), dengan batas keras supaya tab tidak pernah menggantung
   pada akun yang sudah bertahun-tahun mencatat. */
const REMOTE_PAGE_SIZE = 500
/** batas keras: 5000 baris ≈ beberapa tahun pencatatan harian */
const REMOTE_ROW_MAX = 5_000

function toMoneyRow(db: LedgerDbRow, walletNames: Map<string, string>): MoneyRow {
  const base = toLedgerRow(db)
  return {
    ...base,
    seq: Number(db.seq ?? 0),
    time: db.time_label ?? '00:00',
    aiGenerated: db.ai_generated === true,
    walletName: walletNames.get(base.walletId) ?? '',
  }
}

/**
 * Tarik SELURUH baris ledger pemanggil, bertahap.
 *
 * `null` = salah satu halaman gagal dibaca → pemanggil jatuh ke jalur lokal
 * (lebih baik data cache yang tampil daripada saldo yang bolong).
 *
 * Urutannya (`date` lalu `seq`, dua-duanya menurun) SAMA untuk setiap halaman —
 * tanpa urutan yang stabil, `range` bisa mengembalikan baris yang sama dua kali
 * dan melewatkan baris lain.
 */
async function readAllLedgerRows(
  client: NonNullable<ReturnType<typeof browserSupabase>>,
): Promise<LedgerDbRow[] | null> {
  const all: LedgerDbRow[] = []
  for (let from = 0; from < REMOTE_ROW_MAX; from += REMOTE_PAGE_SIZE) {
    const to = Math.min(from + REMOTE_PAGE_SIZE, REMOTE_ROW_MAX) - 1
    const { data, error } = await client
      .from('ledger_rows')
      .select('*')
      .order('date', { ascending: false })
      .order('seq', { ascending: false })
      .range(from, to)
    if (error) return null
    const page = (data ?? []) as LedgerDbRow[]
    all.push(...page)
    /* halaman terakhir: sisa kurang dari satu halaman penuh */
    if (page.length < REMOTE_PAGE_SIZE) break
  }
  return all
}

/**
 * Baca seluruh state uang milik pemanggil. `null` = tidak ada sesi / backend mati
 * → store memakai jalur lokal (IndexedDB), bukan mengosongkan layar.
 */
export async function readRemoteMoney(): Promise<RemoteMoney | null> {
  /* Jalur browser dulu (RLS + token user = paling ketat). Kalau klien tidak ada,
     tidak ada sesi, atau salah satu query ditolak, kita TIDAK langsung menyerah:
     jalur server memakai cookie sesi yang sama dengan middleware, jadi user yang
     bisa membuka app tetap bisa membaca datanya (lihat `app/api/data`). */
  const viaBrowser = await readRemoteMoneyViaBrowser()
  if (viaBrowser) return viaBrowser
  return readRemoteMoneyViaServer()
}

/** jalur server: hanya dipakai saat jalur browser tidak menghasilkan apa pun */
async function readRemoteMoneyViaServer(): Promise<RemoteMoney | null> {
  const wallets = await dataApi<WalletDbRow>({
    table: 'wallets',
    op: 'select',
    order: { column: 'sort_index', ascending: true },
  })
  if (!wallets) return null
  const rowPayloads = await dataApi<LedgerDbRow>({
    table: 'ledger_rows',
    op: 'select',
    order: { column: 'date', ascending: false },
  })
  if (!rowPayloads) return null
  const balancesRaw = await dataApi<{ wallet_id: string; balance: number | string }>({
    table: 'wallet_balances',
    op: 'select',
  })

  const walletSeeds = wallets.map((row) => toWalletSeed(row))
  const walletNames = new Map(walletSeeds.map((wallet) => [wallet.id, wallet.name]))
  const rows = rowPayloads.map((row) => toMoneyRow(row, walletNames))
  const balances = Object.fromEntries(
    (balancesRaw ?? []).map((row) => [row.wallet_id, Math.round(Number(row.balance))]),
  )
  return { wallets: walletSeeds, rows, balances }
}

async function readRemoteMoneyViaBrowser(): Promise<RemoteMoney | null> {
  const client = browserSupabase()
  if (!client) return null

  try {
    const { data: session } = await client.auth.getSession()
    if (!session.session?.access_token) return null

    const [walletsRes, rowsData, balancesRes] = await Promise.all([
      client.from('wallets').select('*').order('sort_index', { ascending: true }),
      readAllLedgerRows(client),
      client.from('wallet_balances').select('wallet_id,balance'),
    ])

    /* Satu tabel yang gagal dibaca = pembacaan ini tidak sah: lebih baik jatuh ke
       jalur lokal (data user tetap tampil) daripada menampilkan saldo yang bolong. */
    if (walletsRes.error || rowsData === null) return null

    const wallets = ((walletsRes.data ?? []) as WalletDbRow[]).map(toWalletSeed)
    const walletNames = new Map(wallets.map((wallet) => [wallet.id, wallet.name]))
    const rows = rowsData.map((row) => toMoneyRow(row, walletNames))
    const balances = Object.fromEntries(
      ((balancesRes.data ?? []) as { wallet_id: string; balance: number | string }[]).map((row) => [
        row.wallet_id,
        Math.round(Number(row.balance)),
      ]),
    )
    return { wallets, rows, balances }
  } catch {
    return null
  }
}

/**
 * Hasil kirim SATU baris — lebih rinci daripada boolean, karena tiga keadaan itu
 * punya tindakan yang BERBEDA di store:
 *
 *   · `synced`   → baris sah ada di server (baru masuk, atau sudah ada = retry
 *                  idempoten). Boleh ditandai tersinkron.
 *   · `offline`  → tidak ada sesi/backend. Baris tetap hidup di perangkat; store
 *                  mempertahankan perilaku lama ("tersimpan di perangkat ini").
 *   · `failed`   → ada sesi & percobaan benar-benar dilakukan, tapi server
 *                  menolak/gagal. Baris WAJIB kembali ke antrean supaya dicoba
 *                  lagi — jangan dicap tersinkron hanya karena perangkat online.
 *   · `conflict` → `23505` tetapi bukan baris ini: `id`-nya sudah dipakai baris
 *                  LAIN (id lokal `session-9001` bisa lahir ulang di perangkat
 *                  yang cache-nya baru dibersihkan). Store memberi id baru lalu
 *                  mengirim ulang, bukan menganggapnya sudah tersimpan.
 */
export type RowPushResult = 'synced' | 'offline' | 'failed' | 'conflict'

/**
 * Terjemahkan jawaban INSERT menjadi keputusan yang benar. Fungsi murni supaya
 * kasus `23505` (satu-satunya kode yang dulu disalahartikan) bisa diuji tanpa
 * jaringan.
 *
 * `23505` di tabel `ledger_rows` bisa berasal dari DUA constraint:
 *   · `unique (user_id, client_tx_id)` → baris ini SUDAH ada (idempoten, aman);
 *   · `primary key (user_id, id)`      → id ini dipakai baris lain (BUKAN baris
 *     ini) → baris baru belum tersimpan dan tidak boleh dianggap sukses.
 * Karena itu kita membaca baris yang menempati `id` itu dan membandingkan
 * kunci idempotensinya.
 */
export function classifyInsertOutcome(
  error: { code?: string } | null,
  existing: { client_tx_id?: string | null } | null,
  expectedClientTxId: string,
): Exclude<RowPushResult, 'offline'> {
  if (!error) return 'synced'
  if (error.code !== '23505') return 'failed'
  return (existing?.client_tx_id ?? '') === expectedClientTxId ? 'synced' : 'conflict'
}

/**
 * Kirim SATU baris ledger ke server, dengan hasil yang bisa dibedakan.
 *
 * `23505` (duplicate key) TIDAK otomatis dianggap sukses lagi — lihat
 * `classifyInsertOutcome`: idempotensi (`client_tx_id` sudah ada) = sukses,
 * tabrakan `id` = `conflict` (baris belum tersimpan).
 */
export async function pushRowToServerResult(row: MoneyRow): Promise<RowPushResult> {
  const viaBrowser = await pushRowViaBrowser(row)
  if (viaBrowser !== 'unavailable') return viaBrowser
  /* Tidak ada klien/sesi di browser (atau token basi) → jalur server. Ini yang
     membuat sesi-cookie yang sah TIDAK pernah "berhasil di layar tapi gagal di
     database". */
  return pushRowViaServer(row)
}

/** `'unavailable'` = klien/sesi browser tidak bisa dipakai, bukan kegagalan data */
async function pushRowViaBrowser(row: MoneyRow): Promise<RowPushResult | 'unavailable'> {
  const client = browserSupabase()
  if (!client) return 'unavailable'
  try {
    const { data: session } = await client.auth.getSession()
    if (!session.session?.access_token) return 'unavailable'

    const expected = row.clientTxId ?? row.id
    const { error } = await client.from('ledger_rows').insert(toLedgerInsert(row))
    if (!error) return 'synced'
    if (error.code !== '23505') return 'failed'
    const { data } = await client
      .from('ledger_rows')
      .select('client_tx_id')
      .eq('id', row.id)
      .maybeSingle()
    return classifyInsertOutcome(
      error,
      (data ?? null) as { client_tx_id?: string | null } | null,
      expected,
    )
  } catch {
    return 'failed'
  }
}

/** jalur server: idempoten lewat `client_tx_id`, konflik id dibedakan dari retry */
async function pushRowViaServer(row: MoneyRow): Promise<RowPushResult> {
  const inserted = await dataApi({
    table: 'ledger_rows',
    op: 'insert',
    rows: [toLedgerInsert(row) as unknown as Record<string, unknown>],
  })
  if (inserted) return 'synced'

  /* INSERT gagal: bisa karena duplikat (retry) atau karena jalur server memang
     tidak tersedia. Dua-duanya dibedakan — jangan sampai baris hilang. */
  const expected = row.clientTxId ?? row.id
  const sameKey = await dataApi<{ client_tx_id?: string | null }>({
    table: 'ledger_rows',
    op: 'select',
    filter: { client_tx_id: expected },
  })
  if (sameKey === null) return 'offline'
  if (sameKey.length > 0) return 'synced'

  const sameId = await dataApi<{ id: string }>({
    table: 'ledger_rows',
    op: 'select',
    filter: { id: row.id },
  })
  if (sameId && sameId.length > 0) return 'conflict'
  return 'failed'
}

/*
 * CATATAN: dulu ada `pushRowToServer()` (boolean) yang menganggap `23505`
 * sebagai sukses. Pembungkus itu dihapus supaya tidak ada jalur kedua yang
 * kehilangan informasi "id bentrok" — semua pemanggil memakai
 * `pushRowToServerResult()`.
 */

/**
 * Perbarui SATU baris ledger yang sudah ada di server (paket 48 — "edit"
 * benar-benar sampai ke database, bukan cuma di perangkat).
 *
 * Kenapa bukan `pushRowToServer`: fungsi itu INSERT, dan `ledger_rows` punya
 * `unique (user_id, client_tx_id)`. Baris yang diedit sudah ada di sana, jadi
 * insert-nya dijawab `23505` — kode yang justru diterjemahkan sebagai "sudah
 * tersimpan", padahal isinya masih versi lama. Karena itu edit memakai `update`
 * pada `id` barisnya (primary key `(user_id, id)`); policy RLS
 * `ledger_rows_owner_update` yang menjaga agar hanya pemiliknya yang bisa.
 *
 * `false` = tidak ada sesi/backend atau gagal — pemanggil sudah menulis
 * perubahannya secara lokal, dan saldo tetap dibaca dari rumus yang sama.
 * BATAS JUJUR: kalau gagal saat sedang online pun, versi server tetap yang
 * menang pada pembacaan berikutnya.
 */
export async function updateRemoteRow(row: MoneyRow): Promise<boolean> {
  const client = browserSupabase()
  if (client) {
    try {
      const { error } = await client.from('ledger_rows').update(toLedgerInsert(row)).eq('id', row.id)
      if (!error) return true
    } catch {
      /* jatuh ke jalur server di bawah */
    }
  }
  return dataApiOk({
    table: 'ledger_rows',
    op: 'update',
    match: { id: row.id },
    patch: toLedgerInsert(row) as unknown as Record<string, unknown>,
  })
}

/*
 * ANTREAN OFFLINE hidup di `lib/money/store.ts` (`flushPendingSync`), bukan di
 * sini: ia perlu hasil PER BARIS (`RowPushResult`) supaya bisa membedakan
 * "gagal → coba lagi" dari "id bentrok → beri id baru". Versi lama file ini
 * punya `flushRemoteQueue()` yang hanya menghitung synced/failed — tidak cukup
 * untuk keputusan itu, jadi ia dihapus, bukan dibiarkan sebagai jalur kedua.
 */

/** Hapus baris di server (hapus lokal sudah ditangani tombstone store) */
export async function deleteRemoteRow(rowId: string): Promise<boolean> {
  const client = browserSupabase()
  if (client) {
    try {
      const { error } = await client.from('ledger_rows').delete().eq('id', rowId)
      if (!error) return true
    } catch {
      /* jatuh ke jalur server */
    }
  }
  return dataApiOk({ table: 'ledger_rows', op: 'delete', match: { id: rowId } })
}

/** Simpan/perbarui dompet di server (opening ikut, karena saldo = opening + Σ baris) */
export async function pushWalletToServer(wallet: WalletSeed, sortIndex = 0): Promise<boolean> {
  const client = browserSupabase()
  if (client) {
    try {
      const { error } = await client
        .from('wallets')
        .upsert(toWalletDbRow(wallet, sortIndex), { onConflict: 'user_id,id' })
      if (!error) return true
    } catch {
      /* jatuh ke jalur server */
    }
  }
  return dataApiOk({
    table: 'wallets',
    op: 'upsert',
    rows: [toWalletDbRow(wallet, sortIndex) as unknown as Record<string, unknown>],
    onConflict: 'user_id,id',
  })
}

/**
 * Hapus dompet di server lewat ENDPOINT YANG SUDAH ADA (paket 62).
 *
 * Sampai paket 61 route `DELETE /api/wallets/:id` (`app/api/wallets/[id]/route.ts`
 * → `removeWallet()`) tidak punya satu pun pemanggil: user bisa menambah dompet
 * tapi tidak bisa membuangnya. Fungsi ini menutup lubang itu TANPA jalur server
 * kedua — ia memanggil route yang sama dengan yang diuji `app/api/wallets/route.test.ts`
 * (401 tanpa sesi, 404 untuk dompet bukan miliknya), jadi "store perangkat" dan
 * "database" bercerita sama.
 *
 * Kenapa `fetch` ke route sendiri, bukan langsung ke PostgREST seperti fungsi
 * lain di file ini: yang diminta paket 62 adalah memanggil endpoint yang sudah
 * ditulis & diuji itu, dan endpoint-nya sudah melakukan dua hal yang tidak perlu
 * diulang di klien — `requireUser()` (identitas dari cookie, bukan body) dan RLS
 * `user_id = auth.uid()` di database.
 *
 * `false` = di luar browser, tidak ada sesi, atau gagal. Hapus LOKAL sudah sah
 * dan tidak dibatalkan oleh kegagalan ini (bentuk lokalnya tombstone, jadi tidak
 * ada data user yang bergantung pada jawaban jaringan).
 */
/**
 * Hapus dompet di server.
 *
 * SEJAK `app/api/wallets/**` DIHAPUS (permukaan mati tanpa pemanggil, dan satu-
 * satunya tempat `WALLET_SEED` bisa bocor ke akun nyata), fungsi ini menulis
 * langsung ke PostgREST seperti fungsi lain di file ini. Dua lapis yang dulu
 * dijaga route tetap berlaku tanpa route: `requireUser()` digantikan sesi klien
 * (`browserSupabase()` hanya punya token pemanggil), dan RLS
 * `user_id = auth.uid()` tetap menolak baris milik akun lain di database.
 *
 * `false` = tidak ada sesi/backend atau gagal. Hapus LOKAL sudah sah dan tidak
 * dibatalkan oleh kegagalan ini (bentuk lokalnya tombstone).
 */
export async function deleteRemoteWallet(walletId: string): Promise<boolean> {
  if (!walletId) return false
  const client = browserSupabase()
  if (client) {
    try {
      const { error } = await client.from('wallets').delete().eq('id', walletId)
      if (!error) return true
    } catch {
      /* jatuh ke jalur server */
    }
  }
  return dataApiOk({ table: 'wallets', op: 'delete', match: { id: walletId } })
}

/** Net worth dari view server (kas + aset + piutang − utang), `null` kalau tidak ada sesi */
export async function remoteNetWorth(): Promise<{
  cash: number
  assets: number
  receivables: number
  debts: number
  netWorth: number
} | null> {
  const client = browserSupabase()
  if (!client) return null
  try {
    const { data, error } = await client
      .from('user_net_worth')
      .select('cash,assets,receivables,debts,net_worth')
      .maybeSingle()
    if (error || !data) return null
    return {
      cash: Math.round(Number(data.cash)),
      assets: Math.round(Number(data.assets)),
      receivables: Math.round(Number(data.receivables)),
      debts: Math.round(Number(data.debts)),
      netWorth: Math.round(Number(data.net_worth)),
    }
  } catch {
    return null
  }
}

