import { describe, expect, it } from 'vitest'
import { mergeWithRemote, pendingWalletOutbox, type MoneySnapshot, type MoneyRow } from './store'
import { WALLET_SEED, type WalletSeed } from '@/lib/wallets'

/* ── REKONSILIASI ANTAR-PERANGKAT (hapus harus benar-benar sampai) ───────────
   Masalah nyata: Perangkat A menghapus satu transaksi. Server tidak lagi punya
   barisnya, tetapi Perangkat B menyimpannya di IndexedDB — dan penggabungan lama
   menganggap SEMUA baris lokal "lebih baru", jadi baris yang sudah dihapus
   muncul lagi setiap refresh.

   Kontrak yang dikunci di sini:
     · `authoritative` → baris yang SUDAH tersinkron (`clientTxId` ada di
       `syncedIds`) tapi TIDAK ADA di server = dihapus di perangkat lain →
       DIBUANG dari snapshot (dan karenanya dari IndexedDB lewat `commit`);
     · baris yang masih menunggu kiriman (`clientTxId` belum tersinkron) TETAP
       dipertahankan — antrean offline tidak boleh hilang;
     · tanpa `authoritative`, perilaku lama (union) dipertahankan untuk jalur
       yang belum punya server (mode lokal). */

function row(id: string, clientTxId: string | undefined, seq: number, note = 'Belanja'): MoneyRow {
  return {
    id,
    walletId: 'bca',
    type: 'expense',
    amount: 25_000,
    dateISO: '2026-11-01',
    note,
    seq,
    time: '09:30',
    aiGenerated: false,
    walletName: 'BCA',
    ...(clientTxId ? { clientTxId } : {}),
  }
}

function snapshot(rows: MoneyRow[], syncedIds: string[], syncedWalletIds: string[] = []): MoneySnapshot {
  return {
    wallets: [],
    rows,
    removedIds: [],
    removedWalletIds: [],
    rowOverrides: {},
    syncedIds,
    syncedWalletIds,
    pendingWalletIds: [],
    hydrated: true,
  }
}

describe('mergeWithRemote · rekonsiliasi hapus lintas perangkat', () => {
  const remoteRow = row('session-9001', 'tx-a', 9001)
  const localSynced = row('session-9002', 'tx-b', 9002, 'Sudah dihapus di HP')
  const localPending = row('session-9003', 'tx-c', 9003, 'Belum sempat terkirim')

  it('authoritative: baris tersinkron yang hilang di server DIBUANG', () => {
    const current = snapshot([remoteRow, localSynced, localPending], ['tx-a', 'tx-b'])
    const merged = mergeWithRemote({ wallets: [], rows: [remoteRow] }, null, current, {
      authoritative: true,
    })
    const ids = merged.rows.map((item) => item.id)
    expect(ids).toHaveLength(2)
    expect(ids).toContain('session-9001')
    expect(ids).toContain('session-9003')
    expect(ids).not.toContain('session-9002')
  })

  it('authoritative: baris yang MASIH menunggu kiriman tetap dipertahankan', () => {
    const current = snapshot([remoteRow, localPending], ['tx-a'])
    const merged = mergeWithRemote({ wallets: [], rows: [remoteRow] }, null, current, {
      authoritative: true,
    })
    const ids = merged.rows.map((item) => item.id)
    expect(ids).toContain('session-9003')
    /* dan masih tercatat sebagai antrean (belum "synced") */
    expect(merged.syncedIds).not.toContain('tx-c')
  })

  it('tanpa authoritative: baris lokal tetap dipertahankan (mode tanpa server)', () => {
    const current = snapshot([remoteRow, localSynced], ['tx-a', 'tx-b'])
    const merged = mergeWithRemote({ wallets: [], rows: [remoteRow] }, null, current)
    expect(merged.rows.map((item) => item.id)).toContain('session-9002')
  })

  it('versi SERVER yang menang untuk baris yang sama (edit lintas perangkat)', () => {
    const edited = { ...remoteRow, note: 'Diedit di laptop' }
    const current = snapshot([row('session-9001', 'tx-a', 9001, 'Versi HP')], ['tx-a'])
    const merged = mergeWithRemote({ wallets: [], rows: [edited] }, null, current, {
      authoritative: true,
    })
    expect(merged.rows[0]?.note).toBe('Diedit di laptop')
    expect(merged.rows).toHaveLength(1)
  })

  it('baris tanpa clientTxId tidak bisa dibuktikan statusnya → tidak dibuang', () => {
    const legacy = row('session-8000', undefined, 8000, 'Baris lama')
    const current = snapshot([legacy], [])
    const merged = mergeWithRemote({ wallets: [], rows: [] }, null, current, {
      authoritative: true,
    })
    expect(merged.rows.map((item) => item.id)).toContain('session-8000')
  })
})

/* ── OUTBOX DOMPET (dompet offline tidak boleh hilang) ───────────────────────
   Sebelum ini rekonsiliasi menimpa daftar dompet dengan jawaban server. Dompet
   yang dibuat / di-rename saat offline (kiriman gagal) langsung lenyap dari
   layar sebelum sempat terkirim — itu kehilangan data, bukan "membersihkan".

   Kontrak sekarang:
     · dompet yang BELUM dikonfirmasi server (`syncedWalletIds`) = antrean →
       dipertahankan saat rekonsiliasi dan muncul di `pendingWalletOutbox()`
       (yang didorong `flushWalletOutbox()` pada hidrasi/realtime/online);
     · dompet yang SUDAH dikonfirmasi tetapi hilang dari jawaban server = dihapus
       di perangkat lain → dibuang dari sini;
     · tombstone menang: dompet yang sedang dihapus user tidak dihidupkan lagi. */

function walletSnapshot(
  wallets: WalletSeed[],
  options: { synced?: string[]; pending?: string[]; removed?: string[] } = {},
): MoneySnapshot {
  return {
    ...snapshot([], []),
    wallets,
    syncedWalletIds: options.synced ?? [],
    pendingWalletIds: options.pending ?? [],
    removedWalletIds: options.removed ?? [],
  }
}

describe('mergeWithRemote · outbox dompet', () => {
  const serverWallet: WalletSeed = { ...WALLET_SEED[0], id: 'w-server', name: 'BCA (server)' }
  const offlineWallet: WalletSeed = { ...WALLET_SEED[0], id: 'w-baru', name: 'Dompet Baru (offline)' }

  it('dompet yang belum dikonfirmasi server DIPERTAHANKAN dan tetap di antrean', () => {
    const current = walletSnapshot([serverWallet, offlineWallet], {
      synced: ['w-server'],
      pending: ['w-baru'],
    })
    const merged = mergeWithRemote({ wallets: [serverWallet], rows: [] }, null, current, {
      authoritative: true,
    })
    expect(merged.wallets.map((wallet) => wallet.id)).toEqual(['w-server', 'w-baru'])
    /* isi antrean = yang benar-benar akan dikirim `flushWalletOutbox()` */
    expect(pendingWalletOutbox(merged).map((wallet) => wallet.id)).toEqual(['w-baru'])
  })

  it('dompet yang dulu tersinkron tapi hilang di server DIBUANG (dihapus di perangkat lain)', () => {
    const deletedElsewhere: WalletSeed = { ...WALLET_SEED[0], id: 'w-hapus', name: 'Dihapus di HP' }
    const current = walletSnapshot([serverWallet, deletedElsewhere], {
      synced: ['w-server', 'w-hapus'],
    })
    const merged = mergeWithRemote({ wallets: [serverWallet], rows: [] }, null, current, {
      authoritative: true,
    })
    expect(merged.wallets.map((wallet) => wallet.id)).toEqual(['w-server'])
    expect(merged.syncedWalletIds).toEqual(['w-server'])
    expect(pendingWalletOutbox(merged)).toHaveLength(0)
  })

  it('kiriman yang gagal tidak mengeluarkan dompet dari antrean (dua ronde rekonsiliasi)', () => {
    const current = walletSnapshot([serverWallet, offlineWallet], {
      synced: ['w-server'],
      pending: ['w-baru'],
    })
    const first = mergeWithRemote({ wallets: [serverWallet], rows: [] }, null, current, {
      authoritative: true,
    })
    const second = mergeWithRemote({ wallets: [serverWallet], rows: [] }, null, first, {
      authoritative: true,
    })
    expect(pendingWalletOutbox(second).map((wallet) => wallet.id)).toEqual(['w-baru'])
  })

  it('RENAME offline dompet yang sudah ada di server memakai versi LOKAL', () => {
    const renamed: WalletSeed = { ...serverWallet, name: 'BCA (nama baru)' }
    const current = walletSnapshot([renamed], { synced: ['w-server'], pending: ['w-server'] })
    const merged = mergeWithRemote({ wallets: [serverWallet], rows: [] }, null, current, {
      authoritative: true,
    })
    expect(merged.wallets[0]?.name).toBe('BCA (nama baru)')
    expect(pendingWalletOutbox(merged).map((wallet) => wallet.id)).toEqual(['w-server'])
  })

  it('setelah kiriman dikonfirmasi (antrean kosong), versi SERVER yang menang', () => {
    const renamed: WalletSeed = { ...serverWallet, name: 'BCA (nama baru)' }
    const current = walletSnapshot([renamed], { synced: ['w-server'] })
    const merged = mergeWithRemote({ wallets: [serverWallet], rows: [] }, null, current, {
      authoritative: true,
    })
    expect(merged.wallets[0]?.name).toBe('BCA (server)')
    expect(pendingWalletOutbox(merged)).toHaveLength(0)
  })

  it('dompet yang sedang dihapus (tombstone) tidak dihidupkan lagi', () => {
    const current = walletSnapshot([offlineWallet], {
      pending: ['w-baru'],
      removed: ['w-baru'],
    })
    const merged = mergeWithRemote({ wallets: [], rows: [] }, null, current, { authoritative: true })
    expect(merged.wallets).toHaveLength(0)
    expect(pendingWalletOutbox(merged)).toHaveLength(0)
  })

  it('tanpa authoritative, jalur lama (daftar server apa adanya) dipertahankan', () => {
    const current = walletSnapshot([serverWallet, offlineWallet], {
      synced: ['w-server'],
      pending: ['w-baru'],
    })
    const merged = mergeWithRemote({ wallets: [serverWallet], rows: [] }, null, current)
    expect(merged.wallets.map((wallet) => wallet.id)).toEqual(['w-server'])
  })
})

