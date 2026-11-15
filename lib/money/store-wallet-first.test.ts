import { beforeEach, describe, expect, it, vi } from 'vitest'

/* ── DOMPET DIKIRIM LEBIH DULU, BARU TRANSAKSINYA ────────────────────────────
   Yang dikunci di sini adalah URUTAN, bukan sekadar "dua-duanya terpanggil":

     · baris ledger menunjuk `wallet_id`; kalau dompet induknya belum ada di
       database, INSERT-nya ditolak foreign key dan catatan pertama user
       (onboarding: dompet + catatan lahir dalam satu ketukan) tertahan di
       antrean sebagai "1 catatan masih menunggu";
     · jadi `pushRowToServerResult` TIDAK BOLEH dipanggil sebelum
       `pushWalletToServer` untuk dompet yang sama selesai dengan hasil `true`;
     · satu dompet hanya dikirim SEKALI walau dua jalur meminta bersamaan;
     · kalau dompet gagal dikirim, baris tetap di antrean (tidak dikirim lalu
       ditolak berulang kali).

   Mock dipakai supaya urutannya bisa dikunci deterministik (tanpa jaringan);
   `hasSupabaseConfig` dinyalakan karena build tanpa backend memang sengaja
   melewati gerbang dompet (perilaku offline paket 42). */

const remote = vi.hoisted(() => ({
  calls: [] as string[],
  /** jika diisi, kiriman dompet DITAHAN sampai test memanggil `release()` */
  gate: null as null | { promise: Promise<void>; release: () => void },
  walletResult: true,
}))

vi.mock('@/lib/supabase/config', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/supabase/config')>()
  return { ...actual, hasSupabaseConfig: () => true }
})

vi.mock('@/lib/supabase/money-remote', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/supabase/money-remote')>()
  return {
    ...actual,
    pushWalletToServer: vi.fn(async (wallet: { id: string }) => {
      remote.calls.push(`wallet:${wallet.id}`)
      if (remote.gate) await remote.gate.promise
      remote.calls.push(`wallet-done:${wallet.id}`)
      return remote.walletResult
    }),
    pushRowToServerResult: vi.fn(async () => {
      remote.calls.push('row')
      return 'synced' as const
    }),
    deleteRemoteWallet: vi.fn(async () => true),
    readRemoteMoney: vi.fn(async () => null),
  }
})

import {
  addWalletAccount,
  ensureWalletOnServer,
  flushMoneyQueues,
  flushPendingSync,
  flushWalletOutbox,
  getMoneySnapshot,
  pendingSyncCount,
  postTransaction,
  resetMoneyStore,
} from './store'

function makeWallet(name = 'Dompet Uji') {
  /* saldo awal cukup: `postTransaction` menolak pengeluaran yang melebihi saldo
     dompet (pagar sub-nol paket 74) */
  const wallet = addWalletAccount({ name, type: 'Cash', opening: 50_000, context: 'pribadi' })
  if (!wallet) throw new Error('dompet uji gagal dibuat')
  return wallet
}

function recordFirstTransaction(walletName: string) {
  const row = postTransaction({
    name: 'Kopi pertama',
    amount: 18_000,
    type: 'expense',
    category: 'Makanan',
    wallet: walletName,
    dateISO: '2026-11-10',
  })
  if (!row) throw new Error('transaksi uji gagal dibuat')
  return row
}

/** beri kesempatan seluruh promise mikro selesai */
async function settle(times = 6): Promise<void> {
  for (let index = 0; index < times; index += 1) await Promise.resolve()
}

beforeEach(() => {
  remote.calls.length = 0
  remote.gate = null
  remote.walletResult = true
  resetMoneyStore()
  vi.clearAllMocks()
})

/** tahan kiriman dompet sampai `release()` dipanggil */
function holdWalletPush() {
  let release!: () => void
  const promise = new Promise<void>((resolve) => {
    release = resolve
  })
  remote.gate = { promise, release }
  return release
}

describe('urutan simpan: dompet dulu, transaksi kemudian', () => {
  it('transaksi TIDAK dikirim selama dompetnya belum dikonfirmasi server', async () => {
    const release = holdWalletPush()
    const wallet = makeWallet()
    recordFirstTransaction(wallet.name)

    /* dompet sedang dikirim (gate belum dibuka) → belum ada baris yang boleh naik */
    await settle()
    expect(remote.calls).toContain(`wallet:${wallet.id}`)
    expect(remote.calls).not.toContain('row')

    /* server mengonfirmasi dompet → barulah barisnya dikirim */
    release()
    await settle(12)

    expect(remote.calls).toContain('row')
    const walletDone = remote.calls.indexOf(`wallet-done:${wallet.id}`)
    const rowSent = remote.calls.indexOf('row')
    expect(walletDone).toBeGreaterThanOrEqual(0)
    expect(rowSent).toBeGreaterThan(walletDone)
    expect(pendingSyncCount()).toBe(0)
  })

  it('satu dompet hanya dikirim SEKALI walau dua jalur menunggunya', async () => {
    const release = holdWalletPush()
    const wallet = makeWallet()
    recordFirstTransaction(wallet.name)
    void ensureWalletOnServer(wallet.id)
    void ensureWalletOnServer(wallet.id)
    await settle()
    release()
    await settle(12)

    const walletPushes = remote.calls.filter((call) => call === `wallet:${wallet.id}`)
    expect(walletPushes).toHaveLength(1)
  })

  it('dompet gagal dikirim → baris TETAP di antrean, tidak dikirim ke server', async () => {
    remote.walletResult = false
    const wallet = makeWallet()
    recordFirstTransaction(wallet.name)
    await settle(12)

    expect(remote.calls).not.toContain('row')
    expect(pendingSyncCount()).toBe(1)
    expect(getMoneySnapshot().rows).toHaveLength(1)
  })

  it('antrean diproses ulang setelah dompet berhasil dikirim', async () => {
    remote.walletResult = false
    const wallet = makeWallet()
    recordFirstTransaction(wallet.name)
    await settle(12)
    expect(pendingSyncCount()).toBe(1)

    /* jaringan/server pulih → flush mengirim dompet dulu, lalu barisnya */
    remote.walletResult = true
    const processed = await flushPendingSync()
    await settle(4)

    expect(processed).toBe(1)
    expect(pendingSyncCount()).toBe(0)
    const walletDone = remote.calls.lastIndexOf(`wallet-done:${wallet.id}`)
    const rowSent = remote.calls.lastIndexOf('row')
    expect(rowSent).toBeGreaterThan(walletDone)
  })

  it('dompet yang sudah dikonfirmasi tidak dikirim ulang', async () => {
    const wallet = makeWallet()
    await flushWalletOutbox()
    const before = remote.calls.filter((call) => call === `wallet:${wallet.id}`).length

    recordFirstTransaction(wallet.name)
    await settle(12)

    const after = remote.calls.filter((call) => call === `wallet:${wallet.id}`).length
    expect(after).toBe(before)
    expect(remote.calls).toContain('row')
  })
})

/* ── BUG-1: ANTREAN TIDAK BOLEH MENGGANTUNG TANPA JADWAL ─────────────────────
   Temuan sesi 1: transaksi pertama onboarding tampil di Dashboard (cache
   perangkat) dan dompetnya ada di tabel `wallets`, tetapi `ledger_rows` tetap
   kosong. Akarnya bukan urutannya (itu sudah dijaga test di atas), melainkan
   TIDAK ADA YANG MENGULANG kiriman setelah dompet gagal dikonfirmasi sesaat.

   Kontrak baru yang dikunci di sini: satu pintu `flushMoneyQueues()` yang
   mengirim dompet dulu lalu baris, bisa dipanggil kapan pun (Dashboard selesai
   memuat / onboarding selesai / penjadwal otomatis), dan idempoten. */
describe('antrean pulih: dompet gagal → baris tetap menunggu → flush membereskan', () => {
  it('flushMoneyQueues mengirim dompet yang gagal, lalu barisnya', async () => {
    remote.walletResult = false
    const wallet = makeWallet()
    recordFirstTransaction(wallet.name)
    await settle(12)

    expect(remote.calls).not.toContain('row')
    expect(pendingSyncCount()).toBe(1)

    /* server pulih → satu pintu yang sama membereskan keduanya, berurutan */
    remote.walletResult = true
    const result = await flushMoneyQueues()
    await settle(6)

    expect(result.rows).toBe(1)
    expect(pendingSyncCount()).toBe(0)
    const walletDone = remote.calls.lastIndexOf(`wallet-done:${wallet.id}`)
    const rowSent = remote.calls.lastIndexOf('row')
    expect(rowSent).toBeGreaterThan(walletDone)
  })

  it('flushMoneyQueues tidak menggandakan baris walau dipanggil berulang', async () => {
    const wallet = makeWallet()
    recordFirstTransaction(wallet.name)
    await settle(12)
    expect(pendingSyncCount()).toBe(0)

    const first = await flushMoneyQueues()
    const second = await flushMoneyQueues()

    expect(first.rows).toBe(0)
    expect(second.rows).toBe(0)
    expect(getMoneySnapshot().rows).toHaveLength(1)
  })
})
