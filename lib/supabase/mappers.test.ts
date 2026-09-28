import { describe, expect, it } from 'vitest'
import {
  emptyIfNull,
  maskPrivateDescription,
  nullIfEmpty,
  toLedgerInsert,
  toLedgerRow,
  toLedgerType,
  toSplitColumns,
  toSplitSpec,
  toWalletDbRow,
  toWalletKind,
  toWalletSeed,
} from './mappers'
import { balanceOf, type LedgerRow } from '@/lib/money/ledger'

/* ── Test mapper row ↔ domain (paket 45) ────────────────────────────────────
   Database memakai `snake_case` dengan tipe kolom sendiri (`bigint` bisa datang
   sebagai string, `date` bisa NULL); app memakai camelCase dengan integer rupiah
   dan `''` = "tidak terhubung dompet". Setiap perbedaan itu punya satu tempat:
   file `mappers.ts`. Test ini mengunci tiap aturannya, karena satu kolom yang
   tertukar di aplikasi uang = saldo yang salah. */

const WALLET_ROW = {
  user_id: 'aaaaaaaa-1111-4111-8111-aaaaaaaaaaaa',
  id: 'bca',
  name: 'BCA',
  holder: 'Ayu',
  number: '**** 0849',
  network: 'DEBIT',
  kind: 'bank',
  type: 'Bank',
  context: 'pribadi',
  opening: 1450000,
  art: 'parang',
  color: 'bg-thistle',
  face: 'from-[#91bb9e]',
  band_class: 'from-sage',
  face_class: 'from-forest',
  glow_class: null,
  sort_index: 0,
}

describe('mapper dompet · baris database ↔ WalletSeed', () => {
  it('membaca kolom snake_case → domain camelCase', () => {
    const seed = toWalletSeed(WALLET_ROW)
    expect(seed).toMatchObject({
      id: 'bca',
      name: 'BCA',
      opening: 1450000,
      bandClass: 'from-sage',
      faceClass: 'from-forest',
      art: 'parang',
      kind: 'bank',
    })
    /* `glow_class` NULL → field opsional TIDAK dipasang (bukan string "null") */
    expect('glowClass' in seed).toBe(false)
  })

  it('`opening` dari PostgREST berupa string (bigint) tetap jadi integer rupiah', () => {
    expect(toWalletSeed({ ...WALLET_ROW, opening: '1450000' }).opening).toBe(1450000)
    expect(toWalletSeed({ ...WALLET_ROW, opening: 1450000.4 }).opening).toBe(1450000)
  })

  it('nilai enum/tipe yang tidak dikenal jatuh ke pilihan paling konservatif', () => {
    expect(toWalletKind('crypto')).toBe('cash')
    expect(toWalletKind('ewallet')).toBe('ewallet')
    expect(toWalletSeed({ ...WALLET_ROW, context: 'entah' }).context).toBe('pribadi')
    expect(toWalletSeed({ ...WALLET_ROW, art: undefined }).art).toBe('kawung')
  })

  it('arah balik: WalletSeed → payload insert, `user_id` TIDAK ikut (RLS default)', () => {
    const payload = toWalletDbRow(toWalletSeed(WALLET_ROW), 3)
    expect(payload).not.toHaveProperty('user_id')
    expect(payload.band_class).toBe('from-sage')
    expect(payload.sort_index).toBe(3)
    expect(toWalletDbRow(toWalletSeed(WALLET_ROW)).glow_class).toBeNull()
  })
})

describe('mapper ledger · baris ↔ LedgerRow', () => {
  const row = {
    user_id: 'aaaaaaaa-1111-4111-8111-aaaaaaaaaaaa',
    id: 'session-9001',
    wallet_id: null,
    type: 'expense',
    amount: '25000',
    date: '2026-09-27',
    note: 'Kopi',
    category: 'Makan',
    counter_wallet_id: null,
    client_tx_id: 'tx-a-1',
    ai_generated: false,
    time_label: '08:15',
    seq: '9001',
  }

  it('wallet_id NULL → `walletId` kosong (baris belum terhubung dompet)', () => {
    expect(toLedgerRow(row).walletId).toBe('')
    expect(emptyIfNull(null)).toBe('')
  })

  it('`amount` string & `date` tetap terbaca benar', () => {
    const parsed = toLedgerRow(row)
    expect(parsed.amount).toBe(25000)
    expect(parsed.dateISO).toBe('2026-09-27')
    expect(parsed.clientTxId).toBe('tx-a-1')
  })

  it('kolom yang tidak ada di domain TIDAK ikut terbawa ke LedgerRow', () => {
    const parsed = toLedgerRow(row)
    expect(parsed).not.toHaveProperty('user_id')
    expect(parsed).not.toHaveProperty('seq')
    expect(parsed).not.toHaveProperty('time_label')
  })

  it('jenis tak dikenal → expense (agar tidak pernah menambah uang karena salah baca)', () => {
    expect(toLedgerType('refund_tak_dikenal')).toBe('expense')
    expect(toLedgerType('income')).toBe('income')
  })

  it('`clientTxId` kosong tidak dibiarkan: dipakai `id` baris (kunci idempotensi wajib ada)', () => {
    const payload = toLedgerInsert({
      id: 'session-10',
      walletId: '',
      type: 'expense',
      amount: 1000,
      dateISO: '2026-09-27',
      note: '',
      seq: 10,
      time: '10:00',
    } as LedgerRow & { seq: number; time: string })
    expect(payload.client_tx_id).toBe('session-10')
    expect(payload.wallet_id).toBeNull()
    expect(nullIfEmpty('')).toBeNull()
    expect(nullIfEmpty('bca')).toBe('bca')
  })

  it('baris hasil mapper tetap sah menurut invariant ledger (opening + Σ baris)', () => {
    /* baris tanpa dompet (NULL) tidak menggerakkan saldo dompet mana pun */
    const unattached = toLedgerRow(row)
    expect(balanceOf([unattached], 'bca', 1_450_000)).toBe(1_450_000)

    /* begitu terhubung ke dompet, pengeluaran Rp 25.000 benar-benar mengurangi */
    const attached = toLedgerRow({ ...row, wallet_id: 'bca' })
    expect(attached.walletId).toBe('bca')
    expect(balanceOf([attached], 'bca', 1_450_000)).toBe(1_425_000)
  })
})

describe('mapper split dompet bersama · SplitSpec ⇄ kolom jsonb', () => {
  it('percentage → kolom percents, tanpa amounts', () => {
    const columns = toSplitColumns({ type: 'percentage', percents: { a: 60, b: 40 } })
    expect(columns).toEqual({
      split_type: 'percentage',
      split_percents: { a: 60, b: 40 },
      split_amounts: null,
    })
  })

  it('nominal → kolom amounts, tanpa percents', () => {
    expect(toSplitColumns({ type: 'nominal', amounts: { a: 25_000, b: 0 } })).toEqual({
      split_type: 'nominal',
      split_percents: null,
      split_amounts: { a: 25_000, b: 0 },
    })
  })

  it('single_payer menyimpan pembayarnya di `bearer_id`', () => {
    expect(toSplitColumns({ type: 'single_payer', payerId: 'a' })).toEqual({
      split_type: 'single_payer',
      split_percents: null,
      split_amounts: null,
    })
    expect(toSplitSpec({ split_type: 'single_payer', bearer_id: 'a' })).toEqual({
      type: 'single_payer',
      payerId: 'a',
    })
  })

  it('round-trip: kolom → SplitSpec kembali sama; kolom kosong = bagi rata', () => {
    const spec = { type: 'percentage' as const, percents: { a: 60, b: 40 } }
    expect(toSplitSpec(toSplitColumns(spec))).toEqual(spec)
    expect(toSplitSpec({})).toEqual({ type: 'equal' })
  })
})

describe('masking catatan privat · aturan yang sama dengan view di database', () => {
  it('pemilik melihat isi aslinya, orang lain melihat "Transaksi privat"', () => {
    const row = {
      is_private: true,
      private_for_user: 'a',
      user_id: 'a',
      description: 'Skincare rahasia',
    }
    expect(maskPrivateDescription(row, 'a')).toBe('Skincare rahasia')
    expect(maskPrivateDescription(row, 'b')).toBe('Transaksi privat')
  })

  it('baris publik tidak pernah disamarkan', () => {
    expect(maskPrivateDescription({ is_private: false, description: 'Groceries' }, 'b')).toBe(
      'Groceries',
    )
  })

  it('tanpa `private_for_user` (data lama) pemiliknya = pencatat', () => {
    const row = { is_private: true, user_id: 'a', description: 'Makan malam' }
    expect(maskPrivateDescription(row, 'a')).toBe('Makan malam')
    expect(maskPrivateDescription(row, 'b')).toBe('Transaksi privat')
  })
})


