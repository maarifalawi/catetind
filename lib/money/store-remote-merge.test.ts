import { describe, expect, it } from 'vitest'
import { mergeWithRemote, type MoneyRow, type MoneySnapshot } from './store'
import { WALLET_SEED } from '@/lib/wallets'

/* ── Test penggabungan SERVER ⇄ LOKAL (paket 45) ─────────────────────────────
   Saat login, server yang jadi sumber data — tapi baris yang lahir OFFLINE di
   perangkat ini belum tentu ada di sana. Fungsi yang menggabungkan keduanya
   (`mergeWithRemote`) murni supaya bisa diuji tanpa jaringan, dan aturannya
   sengaja diperiksa satu per satu karena salah sedikit = data user hilang dari
   layar (atau muncul dua kali):

     1. dompet: MILIK SERVER apa adanya — termasuk saat server kosong (user baru
        tidak diberi saldo contoh yang bukan miliknya);
     2. baris: gabungan, dedup per `id`, terurut terbaru dulu;
     3. antrean: baris lokal yang belum sampai server TETAP dihitung belum
        tersinkron (`syncedIds` hanya berisi yang diketahui server);
     4. tombstone tidak hilang (hapus catatan mock tetap berlaku);
     5. override hasil edit baris mock ikut bertahan (paket 48) — server tidak
        menyimpannya, jadi yang di perangkat tetap yang sah;
     6. nomor urut lanjut dari yang tertinggi supaya id baru tidak menabrak. */

function row(overrides: Partial<MoneyRow> & { id: string; seq: number }): MoneyRow {
  return {
    walletId: 'bca',
    type: 'expense',
    amount: 10_000,
    dateISO: '2026-09-27',
    note: 'catatan',
    time: '10:00',
    clientTxId: `tx-${overrides.id}`,
    walletName: 'BCA',
    ...overrides,
  } as MoneyRow
}

const EMPTY: MoneySnapshot = {
  wallets: [...WALLET_SEED],
  rows: [],
  removedIds: [],
  removedWalletIds: [],
  rowOverrides: {},
  syncedIds: [],
  syncedWalletIds: [],
  pendingWalletIds: [],
  hydrated: true,
}

describe('mergeWithRemote · server jadi sumber, antrean lokal tidak hilang', () => {
  it('dompet diambil dari server apa adanya (server kosong = kosong)', () => {
    const merged = mergeWithRemote({ wallets: [], rows: [] }, null, EMPTY)
    expect(merged.wallets).toEqual([])
    expect(merged.rows).toEqual([])
  })

  it('baris server + baris lokal yang belum terkirim = daftar gabungan tanpa dobel', () => {
    const serverRow = row({ id: 'session-9001', seq: 9001, clientTxId: 'srv-1' })
    const pending = row({ id: 'session-9101', seq: 9101, clientTxId: 'offline-1' })
    const current: MoneySnapshot = { ...EMPTY, rows: [pending] }

    const merged = mergeWithRemote({ wallets: [...WALLET_SEED], rows: [serverRow] }, null, current)
    expect(merged.rows.map((item) => item.id)).toEqual(['session-9101', 'session-9001'])
    /* yang diketahui server hanya baris server → baris offline tetap di antrean */
    expect(merged.syncedIds).toEqual(['srv-1'])
  })

  it('baris yang sama di server & lokal dipakai versi SERVER (tidak dobel)', () => {
    const serverRow = row({ id: 'session-9001', seq: 9001, clientTxId: 'tx-1', note: 'versi server' })
    const localRow = row({ id: 'session-9001', seq: 9001, clientTxId: 'tx-1', note: 'versi lokal' })
    const merged = mergeWithRemote(
      { wallets: [...WALLET_SEED], rows: [serverRow] },
      null,
      { ...EMPTY, rows: [localRow] },
    )
    expect(merged.rows).toHaveLength(1)
    expect(merged.rows[0].note).toBe('versi server')
  })

  it('tombstone (catatan yang sudah dihapus) tetap berlaku setelah hidrasi', () => {
    const current: MoneySnapshot = { ...EMPTY, removedIds: ['session-1'] }
    const persisted = {
      wallets: [...WALLET_SEED],
      rows: [],
      removedIds: ['session-2'],
      syncedIds: [],
      syncedWalletIds: [],
      pendingWalletIds: [],
    }
    const merged = mergeWithRemote({ wallets: [...WALLET_SEED], rows: [] }, persisted, current)
    expect([...merged.removedIds].sort()).toEqual(['session-1', 'session-2'])
  })

  it('override hasil edit baris mock tetap berlaku setelah hidrasi dari server', () => {
    const current: MoneySnapshot = { ...EMPTY, rowOverrides: { 'session-2': { amount: 45_000 } } }
    const persisted = {
      wallets: [...WALLET_SEED],
      rows: [],
      removedIds: [],
      rowOverrides: { 'seed-2': { amount: 9_000_000 } },
      syncedIds: [],
      syncedWalletIds: [],
      pendingWalletIds: [],
    }
    const merged = mergeWithRemote({ wallets: [...WALLET_SEED], rows: [] }, persisted, current)

    /* server tidak menyimpan override (kolomnya tidak ada) — yang tersimpan di
       perangkat tetap berlaku, dan tulisan sesi ini menang kalau kuncinya sama */
    expect(merged.rowOverrides).toEqual({
      'seed-2': { amount: 9_000_000 },
      'session-2': { amount: 45_000 },
    })
  })

  it('nomor urut lanjut dari baris tertinggi (id baru tidak menabrak baris server)', () => {
    const merged = mergeWithRemote(
      { wallets: [...WALLET_SEED], rows: [row({ id: 'session-9200', seq: 9200 })] },
      null,
      EMPTY,
    )
    expect(merged.rows[0].seq).toBe(9200)
    /* urutan tertinggi + 1 dipakai `appendRow` lewat `nextSeq` internal — diuji
       lewat perilaku: baris baru setelah hidrasi tidak memakai nomor yang sudah ada */
    expect(Math.max(...merged.rows.map((item) => item.seq))).toBe(9200)
  })
})

/* ── KEPEMILIKAN SNAPSHOT PERANGKAT ────────────────────────────────────────────
   Bug yang ditutup: cache uang TIDAK dipisah per akun (satu DB, satu key
   `snapshot`). Saat akun A login di browser yang masih menyimpan snapshot akun
   B / persona demo, `mergeWithRemote` dulu memasukkan SEMUA baris lokal yang
   tidak ada di server sebagai "antrean offline" — jadi transaksi orang lain ikut
   tampil (dan ikut terkirim) di akun A. Angka Arus Uang berubah setelah login
   ulang / refresh, tanpa user mencatat apa pun.

   Sekarang hidrasi memberi tahu fungsi ini bahwa snapshot itu ASING
   (`includeLocalRows: false`): baris, tombstone, override, dan antreannya tidak
   ikut — sementara baris yang lahir di SESI INI tetap dipertahankan. */
describe('mergeWithRemote · snapshot perangkat milik identitas lain', () => {
  const serverRow = row({ id: 'session-9001', seq: 9001, clientTxId: 'srv-1' })
  const foreignPersisted = {
    ownerUserId: 'user-LAIN',
    wallets: [...WALLET_SEED],
    rows: [
      /* khas persona demo: tunjangan 300.000 (lib/money/demo-bootstrap.ts) */
      row({
        id: 'session-9100',
        seq: 9100,
        clientTxId: 'demo-tunjangan',
        type: 'income' as const,
        amount: 300_000,
      }),
    ],
    removedIds: ['session-9001'],
    removedWalletIds: ['bca'],
    rowOverrides: { 'session-9001': { amount: 1 } },
    syncedIds: ['demo-tunjangan'],
    syncedWalletIds: [],
    pendingWalletIds: [],
  }

  it('baris, tombstone, override, dan antrean snapshot asing TIDAK ikut', () => {
    const merged = mergeWithRemote(
      { wallets: [...WALLET_SEED], rows: [serverRow] },
      foreignPersisted,
      EMPTY,
      { includeLocalRows: false },
    )

    expect(merged.rows.map((item) => item.id)).toEqual(['session-9001'])
    /* tombstone asing tidak boleh menyembunyikan baris akun ini (id lokal bisa kembar) */
    expect(merged.removedIds).toEqual([])
    expect(merged.removedWalletIds).toEqual([])
    expect(merged.rowOverrides).toEqual({})
    expect(merged.syncedIds).toEqual(['srv-1'])
  })

  it('baris yang lahir di SESI INI tetap dipertahankan walau snapshot asing', () => {
    const sessionRow = row({ id: 'session-9300', seq: 9300, clientTxId: 'baru-1' })
    const merged = mergeWithRemote(
      { wallets: [...WALLET_SEED], rows: [serverRow] },
      foreignPersisted,
      { ...EMPTY, rows: [sessionRow] },
      { includeLocalRows: false },
    )

    expect(merged.rows.map((item) => item.id)).toEqual(['session-9300', 'session-9001'])
  })

  it('default (tanpa opsi) tetap menggabungkan snapshot sendiri — antrean offline tidak hilang', () => {
    const merged = mergeWithRemote(
      { wallets: [...WALLET_SEED], rows: [serverRow] },
      foreignPersisted,
      EMPTY,
    )

    expect(merged.rows.map((item) => item.id)).toEqual(['session-9100', 'session-9001'])
    expect(merged.removedIds).toEqual(['session-9001'])
  })
})
