'use client'

import {
  addWalletAccount,
  postExpense,
  postIncome,
} from './store'
import { addFund, contributeToFund } from './funds-store'
import { addDebt, addInvestment } from './wealth-store'
import { addBill } from './bills-store'
import { addJointMember, addJointTransaction } from './joint-store'
import { addPhysicalAsset } from './physical-store'
import { INITIAL_BILLS } from '@/lib/data/bills'
import { INITIAL_PHYSICAL_ASSETS } from '@/lib/data/wealth'
import { JOINT_DEFAULT_CATEGORY, JOINT_ME } from '@/lib/data/joint'

/* ── BOOT DEMO — DATA CONTOH DITULIS LEWAT STORE (paket 65 · Tugas A) ─────────
   Sebelum paket ini, data contoh "akun demo" adalah KONSTANTA yang di-inject
   langsung ke state awal setiap store. Akibatnya data itu bukan data user:
   tidak persisten, tidak bisa diedit/dihapus, dan tidak konsisten antar halaman.

   Modul ini mengubahnya: data contoh AKUN DEMO benar-benar DITULIS lewat API tulis
   yang SAMA dengan data user (`addWalletAccount`, `postExpense`, `addFund`,
   `contributeToFund`, `addBill`, `addInvestment`, `addDebt`, `addJointTransaction`,
   `addPhysicalAsset`) — jadi ia hidup sebagai baris sungguhan: persisten di
   IndexedDB, bisa diedit/dihapus, dan muncul di SEMUA halaman karena memang baris
   nyata (satu sumber kebenaran, bukan daftar kedua).

   IDEMPOTEN: satu penanda di localStorage (`SEED_MARKER_KEY`) + penanda memory
   mencegah data menumpuk tiap reload. Di produksi (tanpa `NEXT_PUBLIC_DEMO=1`)
   fungsi ini TIDAK PERNAH dipanggil — lihat `DemoSeedGate`. */

const SEED_MARKER_KEY = 'catet-ind-demo-seeded'

let seededInMemory = false

function readMarker(): boolean {
  if (typeof window === 'undefined') return seededInMemory
  try {
    return window.localStorage.getItem(SEED_MARKER_KEY) === '1'
  } catch {
    /* mode privat / localStorage diblokir → penanda memory */
    return seededInMemory
  }
}

function writeMarker(): void {
  seededInMemory = true
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(SEED_MARKER_KEY, '1')
  } catch {
    /* biarkan penanda memory yang menjaga idempotensi */
  }
}

/** `true` = data demo sudah pernah ditulis di perangkat ini */
export function isDemoSeeded(): boolean {
  return readMarker()
}

/** Cabut penanda (dipakai test & tombol "reset demo"); tidak menghapus data apa pun */
export function resetDemoSeedMarker(): void {
  seededInMemory = false
  if (typeof window === 'undefined') return
  try {
    window.localStorage.removeItem(SEED_MARKER_KEY)
  } catch {
    /* tidak ada yang bisa dilakukan — penanda memory sudah kosong */
  }
}

/**
 * Tulis data contoh akun demo lewat API tulis store — SEKALI saja.
 * @returns `true` kalau baris benar-benar ditulis, `false` kalau sudah pernah.
 */
export function seedDemoDataOnce(): boolean {
  if (readMarker()) return false
  /* tandai DULU (sebelum menulis) supaya pemanggilan ganda di tick yang sama
     tidak menggandakan apa pun; kalau ada penulisan yang gagal, user tetap bisa
     `resetDemoSeedMarker()` dan memulai lagi. */
  writeMarker()

  const wallets = seedWallets()
  seedTransactions(wallets.bcaId, wallets.gopayId)
  seedFunds(wallets.bcaId)
  seedWealth()
  seedBills()
  seedJoint()
  seedPhysical()
  return true
}

interface SeededWallets {
  bcaId: string
  gopayId: string
}

function seedWallets(): SeededWallets {
  const bca = addWalletAccount({
    name: 'BCA',
    type: 'Bank',
    number: '•••• 0849',
    opening: 1_450_000,
    context: 'pribadi',
  })
  const gopay = addWalletAccount({
    name: 'GoPay',
    type: 'E-Wallet',
    opening: 350_000,
    context: 'pribadi',
  })
  addWalletAccount({ name: 'Tunai', type: 'Cash', opening: 50_000, context: 'pribadi' })
  return { bcaId: bca.id, gopayId: gopay.id }
}

function seedTransactions(bcaId: string, gopayId: string): void {
  postIncome({ walletId: bcaId, amount: 6_500_000, note: 'Gaji bulan ini', category: 'Gaji Utama' })
  if (gopayId) {
    postExpense({ walletId: gopayId, amount: 32_000, note: 'Kopi Kenangan Oat Latte', category: 'Makanan' })
  }
  postExpense({ walletId: bcaId, amount: 85_000, note: 'Belanja Indomaret Cilandak', category: 'Belanja' })
}

function seedFunds(bcaId: string): void {
  const fund = addFund({
    name: 'Dana Darurat',
    target: 5_000_000,
    deadline: '2026-12-31',
    priority: 'tinggi',
    scope: 'pribadi',
  })
  if (fund) contributeToFund(fund.id, 500_000, bcaId)
}

function seedWealth(): void {
  addInvestment({
    type: 'stock',
    name: 'Saham Perbankan',
    quantity: 10,
    price: 90_000,
    scope: 'pribadi',
  })
  addDebt({
    type: 'platform',
    direction: 'owed_by_me',
    provider: 'Kredivo',
    principal: 1_500_000,
    scope: 'pribadi',
  })
}

function seedBills(): void {
  for (const bill of INITIAL_BILLS.slice(0, 3)) {
    const { id: _id, ...rest } = bill
    addBill(rest)
  }
}

function seedJoint(): void {
  /* kantong bersama baru mulai tanpa anggota (state awal kosong) — daftarkan
     pemiliknya dulu supaya catatan contoh benar-benar sah sebagai catatan kantong */
  addJointMember(JOINT_ME.id)
  addJointTransaction({
    description: 'Makan bareng',
    amount: 120_000,
    paidByUserId: JOINT_ME.id,
    category: JOINT_DEFAULT_CATEGORY,
  })
}

function seedPhysical(): void {
  const first = INITIAL_PHYSICAL_ASSETS[0]
  if (!first) return
  addPhysicalAsset({
    name: first.name,
    category: first.category,
    purchasePrice: first.purchasePrice,
    currentValue: first.currentValue,
    acquiredAt: first.acquiredAt,
    note: first.note,
    scope: first.scope,
  })
}
