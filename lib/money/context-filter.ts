import type { HistoryTransaction } from '@/lib/data/history'
import type { MoneyContext } from '@/lib/types'
import { isRowRemoved, toHistoryTransaction, type MoneyRow, type MoneySnapshot } from './store'

/* ── PENYARING KONTEKS UANG — SATU IMPLEMENTASI (paket 47) ───────────────────
   Konteks uang (Pribadi/Keluarga/Bersama — PRD Domain 2C.2) sudah jadi SATU
   state global sejak audit UX #6, tapi sebelum paket 47 hanya empat berkas yang
   benar-benar membacanya (Home, Budget, dua shell input). Halaman lain
   menampilkan semua konteks sekaligus, sehingga memilih "Keluarga" tidak
   mengubah apa pun di `/wallet`, `/history`, `/calendar`, `/bills`, `/wealth`.

   Modul ini menutupnya di lapis paling dasar — fungsi murni, tanpa React:

     · `walletContextOf()`   — konteks SATU dompet kanon. Ini satu-satunya
                               pemilik fakta konteks (`WalletSeed.context`);
                               baris catatan TIDAK menyimpan kolom `context`
                               kedua (dua sumber fakta = dua kebenaran).
     · `walletNameContext()` — konteks dari NAMA dompet, untuk baris pajangan
                               yang cuma punya nama (mock Riwayat, kalender).
     · `matchesContext()`    — satu keputusan saring yang dipakai semua daftar.
     · `rowsForContext()`    — baris ledger yang lolos konteks aktif.
     · `hasUnknownContext()` — apakah ada baris yang konteksnya TIDAK bisa
                               dipastikan.

   DUA ATURAN KANON yang dikunci di sini (jangan dilanggar halaman mana pun):

   1. Konteks menyaring DAFTAR & ARUS, bukan TOTAL. "Total Saldo"/"Net Worth"
      tetap seluruh dompet (lihat lib/money/store.ts:557-573).
   2. Baris yang konteksnya TIDAK bisa dipastikan — catatan dengan dompet yang
      belum ada di daftar dompet (mis. user mencatat pakai "OVO" sebelum
      dompetnya ditambahkan) — TIDAK BOLEH hilang saat konteks aktif. Baris itu
      selalu dikembalikan di SEMUA konteks dengan penanda `unknownContext`, dan
      UI menampilkannya sebagai "Belum berkonteks" — jujur, bukan disembunyikan.
      Menyembunyikan catatan user demi kerapian filter adalah cara tercepat
      kehilangan kepercayaan (kanon "jujur di setiap klaim", PRD 244).
   ────────────────────────────────────────────────────────────────────────── */

/**
 * Konteks satu baris pajangan.
 *
 * `'unknown'` BUKAN konteks keempat — ia penanda "tidak bisa dipastikan", dan
 * penyaring memperlakukannya sebagai lolos-di-mana-mana (aturan kanon #2).
 * Tipe ini sengaja dipisah dari `MoneyContext` supaya nilai yang tak diketahui
 * tidak pernah bisa tertukar dengan konteks yang sah.
 */
export type RowContext = MoneyContext | 'unknown'

/** baris ledger + konteksnya (turunan dari dompet baris itu) */
export interface ContextRow extends MoneyRow {
  context: RowContext
  /** true = dompet baris ini tak dikenal → tetap tampil di SEMUA konteks */
  unknownContext: boolean
}

/** baris pajangan (`HistoryTransaction`) + konteksnya */
export interface ContextTransaction extends HistoryTransaction {
  context: RowContext
  unknownContext: boolean
}

/** konteks dompet KANON (`WalletSeed.context`) — `'unknown'` kalau dompetnya
 *  belum ada di daftar dompet (baris lama / nama dompet yang belum ditambah) */
export function walletContextOf(snapshot: MoneySnapshot, walletId: string): RowContext {
  if (!walletId) return 'unknown'
  const wallet = snapshot.wallets.find((item) => item.id === walletId)
  return wallet ? wallet.context : 'unknown'
}

/**
 * Konteks dari NAMA dompet — dipakai baris pajangan yang hanya menyimpan nama
 * (mock `HISTORY_TRANSACTIONS`, entri kalender). Pencocokan tanpa peduli
 * huruf besar/kecil & spasi pinggir, dan `id` dompet juga diterima karena mock
 * lama menyimpan nama yang kebetulan sama dengan id (`tunai`/`Tunai`).
 */
export function walletNameContext(snapshot: MoneySnapshot, walletName: string): RowContext {
  const wanted = walletName?.trim().toLowerCase()
  if (!wanted) return 'unknown'
  const wallet = snapshot.wallets.find(
    (item) => item.name.trim().toLowerCase() === wanted || item.id.toLowerCase() === wanted,
  )
  return wallet ? wallet.context : 'unknown'
}

/**
 * SATU keputusan saring untuk semua daftar: baris dengan konteks tak dikenal
 * selalu lolos (aturan kanon #2), sisanya harus sama persis dengan konteks aktif.
 */
export function matchesContext(rowContext: RowContext, ctx: MoneyContext): boolean {
  return rowContext === 'unknown' || rowContext === ctx
}

/** tag satu baris ledger dengan konteks dompetnya */
export function contextRowOf(snapshot: MoneySnapshot, row: MoneyRow): ContextRow {
  const context = walletContextOf(snapshot, row.walletId)
  return { ...row, context, unknownContext: context === 'unknown' }
}

/**
 * Baris ledger yang LOLOS konteks aktif — urutan & isinya tetap seperti di
 * store (terbaru dulu), tombstone tetap dihormati supaya baris yang dihapus user
 * tidak lahir lagi di halaman lain.
 */
export function rowsForContext(snapshot: MoneySnapshot, ctx: MoneyContext): ContextRow[] {
  return snapshot.rows
    .filter((row) => !isRowRemoved(snapshot, row.id))
    .map((row) => contextRowOf(snapshot, row))
    .filter((row) => matchesContext(row.context, ctx))
}

/** true kalau ada baris (yang masih hidup) dengan dompet tak dikenal */
export function hasUnknownContext(snapshot: MoneySnapshot): boolean {
  return snapshot.rows.some(
    (row) =>
      !isRowRemoved(snapshot, row.id) && walletContextOf(snapshot, row.walletId) === 'unknown',
  )
}

/**
 * Konteks satu catatan pajangan. Baris SESI (dari store) dikenali lewat `id`
 * (= `row.seq`) sehingga konteksnya dibaca dari DOMPETNYA; baris mock lama yang
 * hanya punya nama dompet jatuh ke `walletNameContext()`.
 */
export function contextOfTransaction(
  snapshot: MoneySnapshot,
  tx: HistoryTransaction,
): RowContext {
  const row = snapshot.rows.find((item) => item.seq === tx.id)
  if (row) return walletContextOf(snapshot, row.walletId)
  return walletNameContext(snapshot, tx.wallet)
}

/** tag daftar catatan pajangan dengan konteksnya (tanpa menyaring) */
export function tagTransactionsForContext(
  transactions: readonly HistoryTransaction[],
  snapshot: MoneySnapshot,
): ContextTransaction[] {
  return transactions.map((tx) => {
    const context = contextOfTransaction(snapshot, tx)
    return { ...tx, context, unknownContext: context === 'unknown' }
  })
}

/** catatan sesi dari store yang lolos konteks aktif (siap dipakai daftar) */
export function transactionsForContext(
  snapshot: MoneySnapshot,
  ctx: MoneyContext,
): ContextTransaction[] {
  return rowsForContext(snapshot, ctx).map((row) => {
    const tx = toHistoryTransaction(row)
    return { ...tx, context: row.context, unknownContext: row.unknownContext }
  })
}
