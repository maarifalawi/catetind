import { beforeEach, describe, expect, it } from 'vitest'
import { resetDemoSeedMarker, seedDemoDataOnce } from './demo-bootstrap'
import {
  cashTotal,
  getMoneySnapshot,
  getServerMoneySnapshot,
  resetMoneyStore,
} from './store'
import { getFundsSnapshot, getServerFundsSnapshot, resetFundsStore } from './funds-store'
import { getServerWealthSnapshot, getWealthSnapshot, resetWealthStore } from './wealth-store'
import { getBillsSnapshot, getServerBillsSnapshot, resetBillsStore } from './bills-store'
import { getJointSnapshot, resetJointStore } from './joint-store'
import { getPhysicalSnapshot, getServerPhysicalSnapshot, resetPhysicalStore } from './physical-store'

/* ── Test BOOT DEMO = DATA REAL LEWAT STORE (paket 65 · Tugas A) ─────────────
   Yang dibuktikan: data contoh akun demo benar-benar DITULIS lewat API tulis
   store (jadi persisten & editable), bukan konstanta yang di-inject ke state
   awal; dan pemanggilan ganda TIDAK menggandakan. */

beforeEach(() => {
  resetMoneyStore()
  resetFundsStore()
  resetWealthStore()
  resetBillsStore()
  resetJointStore()
  resetPhysicalStore()
  resetDemoSeedMarker()
})

describe('seedDemoDataOnce', () => {
  it('menulis data contoh lewat API tulis store (bukan konstanta state awal)', () => {
    expect(seedDemoDataOnce()).toBe(true)

    const money = getMoneySnapshot()
    expect(money.wallets.length).toBeGreaterThan(0)
    /* baris ledger NYATA (dompet bergerak) — bukan mock yang tidak menyentuh saldo */
    expect(money.rows.length).toBeGreaterThan(0)
    expect(cashTotal(money)).toBeGreaterThan(0)

    expect(getFundsSnapshot().funds.length).toBeGreaterThan(0)
    expect(getWealthSnapshot().investments.length).toBeGreaterThan(0)
    expect(getWealthSnapshot().debts.length).toBeGreaterThan(0)
    expect(getBillsSnapshot().bills.length).toBeGreaterThan(0)
    expect(getJointSnapshot().transactions.length).toBeGreaterThan(0)
    expect(getPhysicalSnapshot().assets.length).toBeGreaterThan(0)
  })

  it('IDEMPOTEN: dipanggil dua kali tidak menggandakan apa pun', () => {
    seedDemoDataOnce()
    const wallets = getMoneySnapshot().wallets.length
    const rows = getMoneySnapshot().rows.length
    const funds = getFundsSnapshot().funds.length

    expect(seedDemoDataOnce()).toBe(false)

    expect(getMoneySnapshot().wallets.length).toBe(wallets)
    expect(getMoneySnapshot().rows.length).toBe(rows)
    expect(getFundsSnapshot().funds.length).toBe(funds)
  })

  it('setelah penanda dicabut, seed bisa jalan lagi dari state bersih', () => {
    seedDemoDataOnce()
    resetDemoSeedMarker()
    expect(seedDemoDataOnce()).toBe(true)
  })

  it('akun bersih: snapshot state awal (server) benar-benar kosong — seed tidak di-inject', () => {
    /* state awal yang dibaca render pertama = snapshot server; TIDAK ada satu pun
       baris contoh di sana (produksi & demo sama-sama kosong sampai user/seed mengisi) */
    expect(getServerMoneySnapshot().wallets).toHaveLength(0)
    expect(cashTotal(getServerMoneySnapshot())).toBe(0)
    expect(getServerFundsSnapshot().funds).toHaveLength(0)
    expect(getServerWealthSnapshot().investments).toHaveLength(0)
    expect(getServerBillsSnapshot().bills).toHaveLength(0)
    expect(getServerPhysicalSnapshot().assets).toHaveLength(0)
  })
})
