'use client'

import type { WalletSeed } from '@/lib/wallets'
import type { MoneyRow } from '@/lib/money/store'
import { browserSupabase } from './client'
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
       kunci idempotensi (`pushRowToServer`), jadi double-tap / retry / dua
       perangkat tidak bisa menggandakan catatan — penjaganya constraint
       `unique (user_id, client_tx_id)` di database, bukan cuma di memory;
     · baris yang lahir offline tetap tinggal di antrean lokal (`lib/money/idb.ts`
       sebagai cache) dan dikirim saat `flushRemoteQueue()`.

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

/** jumlah baris yang boleh ditarik sekali baca (sama dengan batas cache lokal) */
const REMOTE_ROW_LIMIT = 200

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
 * Baca seluruh state uang milik pemanggil. `null` = tidak ada sesi / backend mati
 * → store memakai jalur lokal (IndexedDB), bukan mengosongkan layar.
 */
export async function readRemoteMoney(): Promise<RemoteMoney | null> {
  const client = browserSupabase()
  if (!client) return null

  try {
    const { data: session } = await client.auth.getSession()
    if (!session.session?.access_token) return null

    const [walletsRes, rowsRes, balancesRes] = await Promise.all([
      client.from('wallets').select('*').order('sort_index', { ascending: true }),
      client
        .from('ledger_rows')
        .select('*')
        .order('date', { ascending: false })
        .order('seq', { ascending: false })
        .limit(REMOTE_ROW_LIMIT),
      client.from('wallet_balances').select('wallet_id,balance'),
    ])

    /* Satu tabel yang gagal dibaca = pembacaan ini tidak sah: lebih baik jatuh ke
       jalur lokal (data user tetap tampil) daripada menampilkan saldo yang bolong. */
    if (walletsRes.error || rowsRes.error) return null

    const wallets = ((walletsRes.data ?? []) as WalletDbRow[]).map(toWalletSeed)
    const walletNames = new Map(wallets.map((wallet) => [wallet.id, wallet.name]))
    const rows = ((rowsRes.data ?? []) as LedgerDbRow[]).map((row) => toMoneyRow(row, walletNames))
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

/** penanda hasil kirim: cukup untuk laporan antrean, bukan untuk UI */
export interface PushOutcome {
  /** baris yang benar-benar masuk (atau sudah ada) di server */
  synced: number
  /** baris yang gagal (jaringan/server) — tetap di antrean */
  failed: number
  /** true = tidak ada sesi/backend → semua baris tetap di antrean lokal */
  offline: boolean
}

/**
 * Kirim SATU baris ledger ke server.
 *
 * `23505` (duplicate key) BUKAN kegagalan: artinya kunci idempotensi ini sudah
 * pernah sampai (double-tap, retry, atau perangkat lain yang sedang syncing) —
 * baris dianggap sudah tersimpan, karena memang begitu keadaannya di database.
 */
export async function pushRowToServer(row: MoneyRow): Promise<boolean> {
  const client = browserSupabase()
  if (!client) return false
  try {
    const { error } = await client.from('ledger_rows').insert(toLedgerInsert(row))
    if (!error) return true
    return error.code === '23505'
  } catch {
    return false
  }
}

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
  if (!client) return false
  try {
    const { error } = await client.from('ledger_rows').update(toLedgerInsert(row)).eq('id', row.id)
    return !error
  } catch {
    return false
  }
}

/** Kirim banyak baris (dipakai `flushPendingSync`). Berurutan supaya laporan jujur. */
export async function flushRemoteQueue(rows: readonly MoneyRow[]): Promise<PushOutcome> {
  const client = browserSupabase()
  if (!client) return { synced: 0, failed: 0, offline: true }

  let synced = 0
  let failed = 0
  for (const row of rows) {
    if (await pushRowToServer(row)) synced += 1
    else failed += 1
  }
  return { synced, failed, offline: false }
}

/** Hapus baris di server (hapus lokal sudah ditangani tombstone store) */
export async function deleteRemoteRow(rowId: string): Promise<boolean> {
  const client = browserSupabase()
  if (!client) return false
  try {
    const { error } = await client.from('ledger_rows').delete().eq('id', rowId)
    return !error
  } catch {
    return false
  }
}

/** Simpan/perbarui dompet di server (opening ikut, karena saldo = opening + Σ baris) */
export async function pushWalletToServer(wallet: WalletSeed, sortIndex = 0): Promise<boolean> {
  const client = browserSupabase()
  if (!client) return false
  try {
    const { error } = await client
      .from('wallets')
      .upsert(toWalletDbRow(wallet, sortIndex), { onConflict: 'user_id,id' })
    return !error
  } catch {
    return false
  }
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
export async function deleteRemoteWallet(walletId: string): Promise<boolean> {
  if (!walletId || typeof window === 'undefined') return false
  try {
    const response = await fetch(`/api/wallets/${encodeURIComponent(walletId)}`, {
      method: 'DELETE',
      headers: { accept: 'application/json' },
      credentials: 'same-origin',
    })
    return response.ok
  } catch {
    return false
  }
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

