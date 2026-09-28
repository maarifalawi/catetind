/* ── MAPPER BARIS DATABASE ↔ BENTUK DOMAIN (paket 45) ────────────────────────
   Database memakai `snake_case` (`opening`, `client_tx_id`, `paid_by_user_id`)
   sementara seluruh app memakai camelCase (`opening`, `clientTxId`, `paidByUserId`).
   Selisih nama itu terlihat sepele sampai ada satu kolom yang tertukar — dan
   kolom yang tertukar di aplikasi uang artinya saldo yang salah.

   Karena itu pemetaannya dikumpulkan di SATU file murni (tanpa React, tanpa
   jaringan) dan diuji dua arah (`lib/supabase/mappers.test.ts`):
   `toLedgerRow` / `toLedgerInsert` dan seterusnya. Fungsi di sini juga yang
   menyembunyikan aturan-aturan yang tidak boleh hilang di jalan:

     · `wallet_id` NULL di database = `''` di domain ("belum terhubung dompet");
     · `date` (`2026-09-27`) → `dateISO`, dan `time_label` → `time`;
     · kolom anonim (mis. `user_id`) TIDAK dipetakan ke domain — identitas tidak
       pernah dibawa bolak-balik lewat payload klien. */

import type { LedgerRow, LedgerRowType } from '@/lib/money/ledger'
import type { WalletKind, WalletSeed } from '@/lib/wallets'
import type { SplitSpec } from '@/lib/data/joint-ledger'
import { JOINT_DEFAULT_CATEGORY, type JointTransaction } from '@/lib/data/joint'

/** baris `wallets` apa adanya dari PostgREST */
export interface WalletDbRow {
  user_id?: string
  id: string
  name: string
  holder?: string | null
  number?: string | null
  network?: string | null
  kind?: string | null
  type?: string | null
  context?: string | null
  opening: number | string
  art?: string | null
  color?: string | null
  face?: string | null
  band_class?: string | null
  face_class?: string | null
  glow_class?: string | null
  sort_index?: number | null
}

/** baris `ledger_rows` apa adanya dari PostgREST */
export interface LedgerDbRow {
  user_id?: string
  id: string
  wallet_id?: string | null
  type: string
  amount: number | string
  date?: string | null
  note?: string | null
  category?: string | null
  counter_wallet_id?: string | null
  client_tx_id: string
  ai_generated?: boolean | null
  time_label?: string | null
  seq?: number | string | null
  created_at?: string | null
}

const WALLET_KINDS: WalletKind[] = ['bank', 'ewallet', 'cash']
const WALLET_CONTEXTS = ['pribadi', 'keluarga', 'bersama'] as const

/** angka dari PostgREST bisa datang sebagai string (kolom bigint) → selalu integer */
function amountOf(value: number | string | null | undefined): number {
  const parsed = typeof value === 'string' ? Number(value) : (value ?? 0)
  return Number.isFinite(parsed) ? Math.round(parsed) : 0
}

/** `''` ⇄ NULL: kolom opsional di database, string kosong di domain */
export function nullIfEmpty(value: string | undefined | null): string | null {
  return value && value.length > 0 ? value : null
}

/** NULL ⇄ `''` (arah sebaliknya) */
export function emptyIfNull(value: string | null | undefined): string {
  return value ?? ''
}

export function toWalletKind(value: string | null | undefined): WalletKind {
  return WALLET_KINDS.includes(value as WalletKind) ? (value as WalletKind) : 'cash'
}

/**
 * Baris `wallets` → `WalletSeed` (bentuk yang dipakai store & seluruh halaman).
 *
 * `opening` dikonversi ke integer rupiah: saldo adalah uang, dan uang di app ini
 * selalu integer (aturan Stage 4). `type`/`context` yang tidak dikenal jatuh ke
 * nilai paling konservatif, bukan diteruskan apa adanya ke UI.
 */
export function toWalletSeed(row: WalletDbRow): WalletSeed {
  const context = WALLET_CONTEXTS.includes(row.context as (typeof WALLET_CONTEXTS)[number])
    ? (row.context as (typeof WALLET_CONTEXTS)[number])
    : 'pribadi'
  return {
    id: row.id,
    name: row.name,
    holder: row.holder ?? '',
    number: row.number ?? '',
    network: row.network ?? '',
    opening: amountOf(row.opening),
    kind: toWalletKind(row.kind),
    type: (row.type as WalletSeed['type']) ?? 'Cash',
    context,
    art: (row.art as WalletSeed['art']) ?? 'kawung',
    color: row.color ?? '',
    face: row.face ?? '',
    bandClass: row.band_class ?? '',
    faceClass: row.face_class ?? '',
    ...(row.glow_class ? { glowClass: row.glow_class } : {}),
  }
}

/** `WalletSeed` → payload insert/update `wallets` (tanpa `user_id`: RLS default) */
export function toWalletDbRow(wallet: WalletSeed, sortIndex = 0): WalletDbRow {
  return {
    id: wallet.id,
    name: wallet.name,
    holder: wallet.holder,
    number: wallet.number,
    network: wallet.network,
    kind: wallet.kind,
    type: wallet.type,
    context: wallet.context,
    opening: wallet.opening,
    art: wallet.art,
    color: wallet.color,
    face: wallet.face,
    band_class: wallet.bandClass,
    face_class: wallet.faceClass,
    glow_class: wallet.glowClass ?? null,
    sort_index: sortIndex,
  }
}

/** daftar jenis baris ledger — HARUS sama dengan `LedgerRowType` di `lib/money/ledger.ts`.
 *  Enum di database punya satu nilai tambahan (`refund`) yang belum punya arti di
 *  klien: `walletDelta()` tidak menanganinya, jadi memetakannya di sini hanya akan
 *  membuat baris "tak dikenal" lolos ke perhitungan saldo. */
const LEDGER_TYPES: LedgerRowType[] = [
  'expense',
  'income',
  'transfer',
  'settlement',
  'balance_adjustment',
  'debt_payment',
  'receivable_payment',
  'change',
]

/**
 * Jenis baris tak dikenal TIDAK diteruskan: ia jatuh ke `expense` (arah paling
 * konservatif) supaya baris asing tidak pernah "menambah" uang karena salah baca.
 */
export function toLedgerType(value: string | null | undefined): LedgerRowType {
  return LEDGER_TYPES.includes(value as LedgerRowType) ? (value as LedgerRowType) : 'expense'
}

/**
 * Baris `ledger_rows` → `LedgerRow` (bentuk yang dipakai `lib/money/ledger.ts`).
 * Metadata pajangan (`seq`, `time`, `aiGenerated`, nama dompet) TIDAK ada di sini:
 * itu urusan `lib/money/store.ts` yang menyusun `MoneyRow`.
 */
export function toLedgerRow(row: LedgerDbRow): LedgerRow {
  return {
    id: row.id,
    walletId: emptyIfNull(row.wallet_id),
    type: toLedgerType(row.type),
    amount: amountOf(row.amount),
    dateISO: row.date ?? '',
    note: row.note ?? '',
    ...(row.category ? { category: row.category } : {}),
    ...(row.counter_wallet_id ? { counterWalletId: row.counter_wallet_id } : {}),
    clientTxId: row.client_tx_id,
  }
}

/** `LedgerRow` (+ metadata pajangan) → payload `ledger_rows` untuk di-insert */
export function toLedgerInsert(
  row: LedgerRow & { seq: number; time: string; aiGenerated?: boolean },
): LedgerDbRow {
  return {
    id: row.id,
    wallet_id: nullIfEmpty(row.walletId),
    type: row.type,
    amount: row.amount,
    date: row.dateISO || null,
    note: row.note,
    category: row.category ?? null,
    counter_wallet_id: nullIfEmpty(row.counterWalletId),
    client_tx_id: row.clientTxId ?? row.id,
    ai_generated: row.aiGenerated ?? false,
    time_label: row.time,
    seq: row.seq,
  }
}

/* ── DOMPET BERSAMA ────────────────────────────────────────────────────────── */

/** `SplitSpec` (domain) → kolom `split_type` + jsonb-nya. Satu rumus, dua kolom. */
export function toSplitColumns(split: SplitSpec): {
  split_type: SplitSpec['type']
  split_percents: Record<string, number> | null
  split_amounts: Record<string, number> | null
} {
  switch (split.type) {
    case 'percentage':
      return { split_type: 'percentage', split_percents: split.percents, split_amounts: null }
    case 'nominal':
      return { split_type: 'nominal', split_percents: null, split_amounts: split.amounts }
    case 'single_payer':
      return { split_type: 'single_payer', split_percents: null, split_amounts: null }
    default:
      return { split_type: 'equal', split_percents: null, split_amounts: null }
  }
}

/** Kolom jsonb + `single_payer` → kembali `SplitSpec` (dipakai saat membaca) */
export function toSplitSpec(row: {
  split_type?: string | null
  split_percents?: Record<string, number> | null
  split_amounts?: Record<string, number> | null
  bearer_id?: string | null
}): SplitSpec {
  switch (row.split_type) {
    case 'percentage':
      return { type: 'percentage', percents: row.split_percents ?? {} }
    case 'nominal':
      return { type: 'nominal', amounts: row.split_amounts ?? {} }
    case 'single_payer':
      return { type: 'single_payer', payerId: row.bearer_id ?? '' }
    default:
      return { type: 'equal' }
  }
}

/* ── BARIS TRANSAKSI DOMPET BERSAMA (paket 52) ─────────────────────────────
   Satu baris `joint_transactions` (tabelnya) / `joint_transactions_public`
   (view masker-nya) → `JointTransaction` yang dipakai halaman `/joint`.
   Dua jalur masuk yang harus berakhir di bentuk yang SAMA:
     · bacaan awal (`lib/supabase/joint-remote.ts`, REST lewat klien browser);
     · baris yang datang sendiri lewat Postgres Changes (`lib/supabase/realtime.ts`,
       payload-nya juga berisi kolom-kolom ini karena `replica identity full`).
   Karena itu pemetaannya ditulis SEKALI di sini, bukan di dua tempat. */

/** baris `joint_transactions` / `joint_transactions_public` apa adanya */
export interface JointTransactionDbRow {
  id: string
  joint_wallet_id?: string | null
  /** siapa yang MENGETIK catatannya (izin & privasi) */
  user_id?: string | null
  /** kantong yang KELUAR uang — dipakai timbangan settlement */
  paid_by_user_id?: string | null
  description?: string | null
  amount: number | string
  category?: string | null
  date?: string | null
  time_label?: string | null
  split_type?: string | null
  split_percents?: Record<string, number> | null
  split_amounts?: Record<string, number> | null
  bearer_id?: string | null
  is_private?: boolean | null
  private_for_user?: string | null
  is_settlement?: boolean | null
  month_key?: string | null
  client_tx_id?: string | null
}

/**
 * Baris bersama → `JointTransaction`.
 *
 * `viewerId` dipakai HANYA untuk satu keputusan: apakah ISI catatan privat ini
 * boleh terlihat (`maskPrivateDescription`). Nominalnya selalu ikut — aturan
 * produk `PRIVATE_EXPENSE_POLICY = 'shared'` di `lib/data/joint-ledger.ts`:
 * pasangan menanggung sebagiannya, jadi angkanya tidak disembunyikan (yang
 * disembunyikan hanya isi catatannya).
 */
export function toJointTransaction(
  row: JointTransactionDbRow,
  viewerId: string,
): JointTransaction {
  const author = row.user_id ?? viewerId
  const pocket = row.paid_by_user_id ?? author
  return {
    id: row.id,
    userId: author,
    paidByUserId: pocket,
    description: maskPrivateDescription(row, viewerId),
    amount: amountOf(row.amount),
    category: row.category ?? JOINT_DEFAULT_CATEGORY,
    date: row.date ?? '',
    time: row.time_label ?? '00:00',
    /* bentuk kanonik: satu `SplitSpec` dari kolom-kolom split — jalur migrasi
       data lama hidup di `toSplitSpec()`, bukan di komponen */
    split: toSplitSpec(row),
    ...(row.is_private
      ? { isPrivate: true, privateForUser: row.private_for_user ?? author }
      : {}),
    /* baris settle/pembuka bulan: transfer penyelesaian, bukan pengeluaran */
    ...(row.is_settlement ? { isSettlement: true } : {}),
  }
}


/* ── MASKING UNTUK DATA YANG DITAMPILKAN ───────────────────────────────────── */

/**
 * Aturan yang SAMA dengan view `joint_transactions_public` di database:
 * catatan privat yang bukan milik viewer tampil sebagai "Transaksi privat",
 * dan nominalnya TETAP ada (dipakai menghitung kewajiban bersama).
 *
 * Kenapa diulang di klien: view-nya yang menjaga data di server, tapi daftar
 * yang sudah telanjur ter-render tetap harus disamarkan kalau keadaan berubah
 * (mis. partner baru mengubah privasi). Dua lapis, satu aturan.
 */
export function maskPrivateDescription(
  row: { is_private?: boolean | null; private_for_user?: string | null; user_id?: string | null; description?: string | null },
  viewerId: string,
  copy = 'Transaksi privat',
): string {
  if (!row.is_private) return row.description ?? ''
  const owner = row.private_for_user ?? row.user_id ?? ''
  return owner === viewerId ? (row.description ?? '') : copy
}

