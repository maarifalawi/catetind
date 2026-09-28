import { beforeEach, describe, expect, it } from 'vitest'
import { HISTORY_TRANSACTIONS } from '@/lib/data/history'
import {
  contextOfTransaction,
  hasUnknownContext,
  matchesContext,
  rowsForContext,
  tagTransactionsForContext,
  transactionsForContext,
  walletContextOf,
  walletNameContext,
} from './context-filter'
import { getMoneySnapshot, postExpense, postTransaction, removeRow, resetMoneyStore } from './store'

/* ── Test PENYARING KONTEKS UANG (paket 47) ─────────────────────────────────
   Yang dikunci di sini bukan cuma "filter jalan", tetapi dua aturan kanon paket
   ini:

     1. konteks menyaring DAFTAR (baris pribadi tidak bocor ke keluarga);
     2. baris yang konteksnya TIDAK bisa dipastikan (dompetnya belum ada di
        daftar dompet) TETAP tampil di SEMUA konteks — dengan penanda, bukan
        disembunyikan (kanon "jujur di setiap klaim", PRD 244).

   Dompet kanon mock:   bca + gopay = pribadi · tunai = keluarga
   (lihat WALLET_SEED di lib/wallets.ts) — jadi baris "Tunai" adalah cara
   termurah menguji bahwa penyaringnya benar-benar memisahkan konteks.
   ────────────────────────────────────────────────────────────────────────── */

const CONTEXTS = ['pribadi', 'keluarga', 'bersama'] as const

beforeEach(() => {
  resetMoneyStore()
})

describe('walletContextOf / walletNameContext', () => {
  it('membaca konteks dari DOMPET kanon, bukan dari nama barisnya', () => {
    const snapshot = getMoneySnapshot()
    expect(walletContextOf(snapshot, 'bca')).toBe('pribadi')
    expect(walletContextOf(snapshot, 'gopay')).toBe('pribadi')
    expect(walletContextOf(snapshot, 'tunai')).toBe('keluarga')
  })

  it('dompet yang tidak dikenal (termasuk id kosong) jatuh ke penanda unknown', () => {
    const snapshot = getMoneySnapshot()
    expect(walletContextOf(snapshot, '')).toBe('unknown')
    expect(walletContextOf(snapshot, 'ovo')).toBe('unknown')
    expect(walletNameContext(snapshot, 'OVO')).toBe('unknown')
    expect(walletNameContext(snapshot, '')).toBe('unknown')
  })

  it('nama dompet dipetakan tanpa peduli huruf besar/kecil (mock Riwayat menulis nama)', () => {
    const snapshot = getMoneySnapshot()
    expect(walletNameContext(snapshot, 'Tunai')).toBe('keluarga')
    expect(walletNameContext(snapshot, 'tunai')).toBe('keluarga')
    expect(walletNameContext(snapshot, ' gopay ')).toBe('pribadi')
  })

  it('matchesContext: penanda unknown lolos di SEMUA konteks', () => {
    expect(matchesContext('unknown', 'pribadi')).toBe(true)
    expect(matchesContext('unknown', 'keluarga')).toBe(true)
    expect(matchesContext('unknown', 'bersama')).toBe(true)
    expect(matchesContext('keluarga', 'pribadi')).toBe(false)
    expect(matchesContext('keluarga', 'keluarga')).toBe(true)
  })
})

describe('rowsForContext — menyaring daftar, bukan total', () => {
  it('baris dompet BCA (pribadi) tidak muncul saat konteks Keluarga/Bersama', () => {
    postExpense({ walletId: 'bca', amount: 20_000, note: 'Kopi kedua' })
    const snapshot = getMoneySnapshot()

    expect(rowsForContext(snapshot, 'pribadi')).toHaveLength(1)
    expect(rowsForContext(snapshot, 'keluarga')).toHaveLength(0)
    expect(rowsForContext(snapshot, 'bersama')).toHaveLength(0)
  })

  it('baris Tunai (keluarga) hanya muncul di konteks Keluarga', () => {
    postExpense({ walletId: 'tunai', amount: 15_000, note: 'Parkir' })
    const snapshot = getMoneySnapshot()

    expect(rowsForContext(snapshot, 'keluarga')).toHaveLength(1)
    expect(rowsForContext(snapshot, 'pribadi')).toHaveLength(0)
    expect(rowsForContext(snapshot, 'bersama')).toHaveLength(0)
  })

  it('baris tanpa dompet dikenal tetap dikembalikan di SEMUA konteks dengan penanda', () => {
    /* jalur nyata untuk ini: user mencatat pakai dompet yang belum ada di daftar
       dompet (mis. "OVO") → store menyimpan `walletId: ''` apa adanya */
    postTransaction({
      type: 'expense',
      name: 'Jajan pasar',
      amount: 25_000,
      category: 'Makanan',
      wallet: 'OVO',
      dateISO: '2026-09-27',
    })
    const snapshot = getMoneySnapshot()

    for (const ctx of CONTEXTS) {
      const rows = rowsForContext(snapshot, ctx)
      expect(rows).toHaveLength(1)
      expect(rows[0]?.context).toBe('unknown')
      expect(rows[0]?.unknownContext).toBe(true)
    }
    expect(hasUnknownContext(snapshot)).toBe(true)
  })

  it('tombstone tetap dihormati: baris yang dihapus user tidak lahir lagi di konteks mana pun', () => {
    const row = postExpense({ walletId: 'bca', amount: 20_000, note: 'Batal' })
    expect(row).not.toBeNull()
    removeRow(row!.id)

    const snapshot = getMoneySnapshot()
    for (const ctx of CONTEXTS) expect(rowsForContext(snapshot, ctx)).toHaveLength(0)
    expect(hasUnknownContext(snapshot)).toBe(false)
  })

  it('hasUnknownContext false kalau semua baris punya dompet yang dikenal', () => {
    postExpense({ walletId: 'bca', amount: 10_000, note: 'Teh' })
    postExpense({ walletId: 'tunai', amount: 5_000, note: 'Permen' })
    expect(hasUnknownContext(getMoneySnapshot())).toBe(false)
  })
})

describe('catatan pajangan (HistoryTransaction) ikut konteks', () => {
  /** satu baris mock minimal — bentuk `HistoryTransaction` yang sebenarnya */
  function mockTx(id: number, wallet: string) {
    return {
      id,
      name: 'Catatan mock',
      amount: 20_000,
      type: 'expense' as const,
      category: 'Makanan',
      wallet,
      date: '2026-09-27',
      time: '08:00',
      aiGenerated: true,
    }
  }

  it('baris sesi memakai konteks dompetnya, jadi ringkasan & daftar sejalan', () => {
    postExpense({ walletId: 'tunai', amount: 30_000, note: 'Belanja sayur' })
    const snapshot = getMoneySnapshot()

    const keluarga = transactionsForContext(snapshot, 'keluarga')
    expect(keluarga).toHaveLength(1)
    expect(keluarga[0]?.context).toBe('keluarga')
    expect(keluarga[0]?.unknownContext).toBe(false)
    expect(transactionsForContext(snapshot, 'pribadi')).toHaveLength(0)
  })

  it('mock Riwayat: baris BCA pribadi, baris Tunai keluarga, baris OVO ditandai belum berkonteks', () => {
    const snapshot = getMoneySnapshot()
    const tagged = tagTransactionsForContext(HISTORY_TRANSACTIONS, snapshot)

    /* penanda selalu sejalan dengan konteksnya — tidak ada baris yang salah tag */
    for (const tx of tagged) expect(tx.unknownContext).toBe(tx.context === 'unknown')

    const ovo = tagged.filter((tx) => tx.wallet === 'OVO')
    const tunai = tagged.filter((tx) => tx.wallet === 'Tunai')
    const bca = tagged.filter((tx) => tx.wallet === 'BCA')

    expect(ovo.length).toBeGreaterThan(0)
    expect(ovo.every((tx) => tx.unknownContext)).toBe(true)
    expect(tunai.length).toBeGreaterThan(0)
    expect(tunai.every((tx) => tx.context === 'keluarga')).toBe(true)
    expect(bca.length).toBeGreaterThan(0)
    expect(bca.every((tx) => tx.context === 'pribadi')).toBe(true)

    /* konsekuensinya: "bersama" masih melihat catatan yang tak berkonteks
       (tidak ada catatan user yang hilang), tapi tidak melihat baris pribadi */
    const bersama = tagged.filter((tx) => matchesContext(tx.context, 'bersama'))
    expect(bersama.length).toBe(ovo.length)
    expect(bersama.every((tx) => tx.wallet === 'OVO')).toBe(true)
  })

  it('contextOfTransaction mencari baris store dulu, baru nama dompetnya', () => {
    const row = postExpense({ walletId: 'gopay', amount: 12_000, note: 'Ojol' })
    const snapshot = getMoneySnapshot()

    /* id baris sesi = `row.seq`; nama dompetnya sengaja berbeda (Tunai) supaya
       terbukti yang dibaca adalah DOMPETNYA, bukan nama pajangannya */
    expect(contextOfTransaction(snapshot, mockTx(row!.seq, 'Tunai'))).toBe('pribadi')
    /* id yang tidak ada di store = baris mock → konteks dari namanya */
    expect(contextOfTransaction(snapshot, mockTx(999_999, 'Tunai'))).toBe('keluarga')
    expect(contextOfTransaction(snapshot, mockTx(999_999, 'OVO'))).toBe('unknown')
  })
})

