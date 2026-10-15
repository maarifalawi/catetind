'use client'

import {
  addWalletAccount,
  postExpense,
  postIncome,
  postTransfer,
} from './store'
import { addFund, contributeToFund } from './funds-store'
import { addDebt, addInvestment } from './wealth-store'
import { addBill } from './bills-store'
import { addJointMember, addJointTransaction } from './joint-store'
import { addPhysicalAsset } from './physical-store'
import { saveUserMoneySettings } from '@/lib/user-money-settings'
import { purgeStorageKeys } from '@/lib/account'
import { localISODate } from '@/lib/time'
import { clearMoneyState } from './idb'
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
   fungsi ini TIDAK PERNAH dipanggil — lihat `DemoSeedGate`.

   ── CERITA AKUN DEMO (isi seed di bawah) ─────────────────────────────────────
   Satu persona yang sengaja DIBUAT RELATABLE, bukan angka "sultan": anak 20-an
   first-jobber di kota besar, gaji Rp 7.300.000, di pertengahan bulan uangnya
   sudah kepotong fixed cost (kos, listrik, transfer orang tua) sehingga sisanya
   tipis. Yang ditulis ke store:

     · Dompet  : BCA 1.650.000 · GoPay 320.000 · ShopeePay 85.000 · Tunai 65.000
                 (Σ = Rp 2.120.000 — sisa uang yang benar-benar ada di tangan)
     · Uang    : pemasukan 7.300.000 (gaji pokok tanggal 1 + tunjangan yang
                 menyusul), pengeluaran 5.180.000 (6 kategori harian: kos+listrik,
                 makan/GoFood, transfer ortu, kopi & nongkrong, ojol/KRL,
                 self-reward Shopee)
     · Ekor daftar: dua baris NON-pengeluaran berjam paling malam di hari
                 berjalan — tunjangan masuk (uang masuk) & top up GoPay (pindah
                 dana) — supaya kartu "Transaksi Terakhir" tidak berbunyi lima
                 baris "-Rp" semua. Ditulis `seedRecentActivity`.
     · Gelombang: tagihan bulanan (kos · listrik · transfer ortu) dipasang pada
                 RASIO bulan yang sudah berjalan (`anchorDayISO`), bukan tanggal
                 tetap, supaya grafik "Arus Uang" bergelombang dari tanggal 1
                 sampai HARI INI — bukan satu puncak di awal lalu rata. Rincian
                 & alasannya ada di catatan "PENGELUARAN BULAN INI, DISEBAR
                 SAMPAI HARI INI" di `seedExpenses`.
     · Celengan: "Nabung Liburan ke Bali" (target 5.000.000, terkumpul 1.250.000
                 → 25% → tahap tanaman "Tunas")
     · Tagihan / kekayaan / kantong bersama / aset fisik: tetap diisi dari kanon
                 supaya halaman lain juga punya isi nyata.

   CATATAN JUJUR: nominal di atas dipilih supaya saldo dompet = `opening + Σ
   baris ledger` jatuh PERSIS di angka target. Karena itu `opening` tiap dompet
   BUKAN saldo awal yang "kelihatan" — ia hanya titik nol sebelum baris seed
   ditulis. Setoran celengan sengaja bertanggal BULAN SEBELUMNYA supaya tidak
   mengacaukan donut & "Transaksi Terakhir" bulan berjalan. Dua baris ekor
   (`seedRecentActivity`: tunjangan masuk & top up GoPay) juga sudah "dibayar" di
   `opening` — jadi angka target di atas, total 2.120.000, dan Σ pemasukan 7,3jt
   tidak bergeser sedikit pun oleh variasi itu. */

const SEED_MARKER_KEY = 'catet-ind-demo-seeded'

/* ── VERSI ISI DEMO + FRESH START (pure demo) ────────────────────────────────
   Penanda bukan lagi boolean: nilainya menyimpan VERSI persona. Naikkan
   `DEMO_SEED_VERSION` setiap isi seed berubah → perangkat yang masih memegang
   persona lama otomatis disiapkan ulang.

   Kenapa perlu "fresh start": data demo hidup di store yang SAMA dengan data
   user (IndexedDB perangkat ini). Kalau perangkat sudah berisi catatan lain
   (sisa percobaan sebelumnya), persona demo akan TERCAMPUR — persis yang bikin
   "demo" tampil sebagai akun orang lain (saldo, nama dompet, dan transaksi yang
   bukan milik cerita). Karena itu, saat versinya belum cocok, state perangkat
   dibuang DULU:
     1. hapus database IndexedDB (`clearMoneyState()`) + seluruh kunci
        localStorage ber-awalan `catet`;
     2. tulis penanda `…:cleared`, lalu MUAT ULANG halaman SEKALI.

   Reload itu bukan hiasan: ia satu-satunya cara memastikan state di MEMORY
   (modul store yang sudah hidup saat halaman dibuka) benar-benar lahir kosong —
   tanpa itu, hidrasi yang sedang berjalan bisa mengembalikan data lama tepat
   setelah dibersihkan. Setelah reload, penandanya `…:cleared` dan persona
   ditulis seperti biasa.

   Yang TIDAK disentuh: data di server (Supabase). Fresh start ini murni LOKAL. */
const DEMO_SEED_VERSION = '5'
const CLEARED_MARKER = `${DEMO_SEED_VERSION}:cleared`
/** penanda cadangan di sessionStorage — penjaga agar reload tidak bisa berulang */
const FRESH_START_FLAG = 'catet-demo-fresh-start'

let memoryMarker: string | null = null
/** true = pembersihan sedang berjalan (mencegah dua pembersihan sekaligus) */
let freshStarting = false

function readMarker(): string | null {
  if (typeof window === 'undefined') return memoryMarker
  try {
    const value = window.localStorage.getItem(SEED_MARKER_KEY)
    return value ?? memoryMarker
  } catch {
    /* mode privat / localStorage diblokir → penanda memory */
    return memoryMarker
  }
}

function writeMarker(value: string): void {
  memoryMarker = value
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(SEED_MARKER_KEY, value)
  } catch {
    /* biarkan penanda memory yang menjaga idempotensi */
  }
}

/** `true` = penanda benar-benar bisa disimpan & dibaca ulang (localStorage hidup) */
function markerPersistable(): boolean {
  if (typeof window === 'undefined') return false
  try {
    const probe = 'catet-demo-probe'
    window.localStorage.setItem(probe, '1')
    window.localStorage.removeItem(probe)
    return true
  } catch {
    return false
  }
}

/** `true` = fresh start sudah dijalankan di tab ini (sessionStorage) */
function freshStartedThisTab(): boolean {
  if (typeof window === 'undefined') return false
  try {
    return window.sessionStorage.getItem(FRESH_START_FLAG) === '1'
  } catch {
    return false
  }
}

function markFreshStarted(): void {
  if (typeof window === 'undefined') return
  try {
    window.sessionStorage.setItem(FRESH_START_FLAG, '1')
  } catch {
    /* sessionStorage diblokir — penanda localStorage yang jadi pegangan */
  }
}

/**
 * Buang seluruh state perangkat milik app ini (IndexedDB + kunci localStorage
 * `catet*`), lalu tulis ulang penanda `…:cleared`. Sengaja TIDAK menyentuh
 * sessionStorage: penanda cadangan di sana yang mencegah reload berulang.
 */
async function purgeDeviceStorage(): Promise<void> {
  await clearMoneyState()
  if (typeof window === 'undefined') return
  purgeStorageKeys(window.localStorage)
  /* penanda ditulis SETELAH penyapuan — kalau tidak, ia ikut terbuang */
  writeMarker(CLEARED_MARKER)
}

/** `true` = penanda demo sudah pernah ditulis di perangkat ini (versi apa pun) */
export function isDemoSeeded(): boolean {
  return readMarker() !== null
}

/** Cabut penanda (dipakai test & tombol "reset demo"); tidak menghapus data apa pun */
export function resetDemoSeedMarker(): void {
  memoryMarker = null
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
  const marker = readMarker()
  if (marker === DEMO_SEED_VERSION) return false

  /* ── FRESH START — hanya di BROWSER, dan hanya sekali per versi ─────────────
     Tiga syarat, semuanya penting supaya reload tidak bisa berulang tanpa akhir:
       · `markerPersistable()` — kalau penanda tidak bisa disimpan, reload
         berikutnya akan mengulang fresh start selamanya (mode privat/blokir);
       · belum `…:cleared` — jangan membersihkan dua kali;
       · belum pernah fresh start di tab ini — jaring pengaman kalau penanda
         localStorage gagal tersimpan.

     Di SSR/test (`window` tidak ada) blok ini dilewati: memang tidak ada state
     perangkat yang perlu dibersihkan, jadi persona langsung ditulis. */
  if (
    typeof window !== 'undefined' &&
    !freshStartedThisTab() &&
    marker !== CLEARED_MARKER &&
    markerPersistable()
  ) {
    if (freshStarting) return false
    freshStarting = true
    markFreshStarted()
    void purgeDeviceStorage().then(() => {
      freshStarting = false
      window.location.reload()
    })
    return false
  }

  /* tandai DULU (sebelum menulis) supaya pemanggilan ganda di tick yang sama
     tidak menggandakan apa pun; kalau ada penulisan yang gagal, user tetap bisa
     `resetDemoSeedMarker()` dan memulai lagi. */
  writeMarker(DEMO_SEED_VERSION)

  /* URUTAN PENTING: dompet → konfigurasi uang → PEMASUKAN → celengan → baru
     pengeluaran. Gaji harus mendarat di BCA sebelum dompet itu dipakai membayar
     (`postExpense` menolak pengeluaran yang melebihi saldo dompet hidup).

     `seedRecentActivity` sengaja PALING AKHIR: baris ditulis ke ledger dengan
     cara disisipkan di DEPAN (`appendRow`), jadi yang terakhir ditulis = yang
     paling atas di kartu "Transaksi Terakhir". Dua baris itu berjam paling malam
     di hari ini, jadi urutannya tetap "terbaru dulu", bukan ditempel di atas. */
  const wallets = seedWallets()
  seedMoneySettings()
  seedIncome(wallets.bcaId)
  seedFunds(wallets.bcaId)
  seedExpenses(wallets)
  seedRecentActivity(wallets)
  seedWealth()
  seedBills()
  seedJoint()
  seedPhysical()
  return true
}

/* ── UANG & TANGGAL CERITA ────────────────────────────────────────────────────
   Gaji persona demo datang dalam DUA baris — gaji pokok di tanggal 1 dan
   tunjangan yang menyusul — supaya daftar "Transaksi Terakhir" punya baris uang
   MASUK di hari berjalan (bukan cuma pengeluaran). Yang dibaca konfigurasi
   `monthlyIncome` tetap SATU angka: TOTALNYA (`DEMO_INCOME`), jadi jatah harian
   tidak berubah oleh pemecahan baris ini. */
const DEMO_SALARY = 7_000_000
const DEMO_ALLOWANCE = 300_000
const DEMO_INCOME = DEMO_SALARY + DEMO_ALLOWANCE

/** tanggal ISO `n` hari sebelum hari ini — DIJEPIT supaya tidak keluar bulan berjalan */
function daysAgoISO(n: number): string {
  const now = new Date()
  const day = now.getDate()
  return localISODate(new Date(now.getFullYear(), now.getMonth(), day - Math.min(n, day - 1)))
}

/** tanggal ISO di BULAN sebelumnya (jangkar setoran celengan lama) */
function previousMonthISO(): string {
  const now = new Date()
  return localISODate(new Date(now.getFullYear(), now.getMonth(), 1 - 10))
}

/** tanggal ISO `n` hari sesudah hari ini (tenggat celengan) */
function daysAheadISO(n: number): string {
  const now = new Date()
  return localISODate(new Date(now.getFullYear(), now.getMonth(), now.getDate() + n))
}

/** jumlah hari yang sudah berjalan di bulan ini (1..31) */
function elapsedDays(): number {
  return Math.max(1, new Date().getDate())
}

/** tanggal ISO untuk "hari ke-n bulan ini" — DIJEPIT ke rentang 1..hari ini */
function dayOfMonthISO(n: number): string {
  const now = new Date()
  const day = Math.min(Math.max(1, n), now.getDate())
  return localISODate(new Date(now.getFullYear(), now.getMonth(), day))
}

/**
 * Tanggal ISO di titik `ratio` dari bulan yang SUDAH berjalan: `0` = tanggal 1,
 * `1` = hari ini (dijepit `dayOfMonthISO`).
 *
 * Kenapa RASIO, bukan tanggal tetap: kartu "Arus Uang" menggambar SATU TITIK PER
 * HARI, jadi bentuk gelombangnya wajib ikut tanggal seed dijalankan. Tagihan
 * yang dipatok "tanggal 12" akan menumpuk SEMUA di tanggal 3 kalau demo dibuka
 * tanggal 3 (lewat penjepitan `dayOfMonthISO`) — dan gelombangnya balik jadi
 * "cuma di awal", persis keluhan yang ditutup seed versi 4. Dengan rasio, puncak
 * tagihan selalu jatuh di ~sepertiga / ~dua pertiga bulan berjalan, di tanggal
 * berapa pun demo itu dibuka.
 */
function anchorDayISO(ratio: number): string {
  return dayOfMonthISO(Math.round(elapsedDays() * ratio))
}

/**
 * Bagi `total` ke `slots` hari dengan VARIASI tetap, tapi jumlahnya PERSIS.
 *
 * Kenapa tidak rata: kartu "Arus Uang" menggambar SATU TITIK PER HARI, jadi
 * pembagian rata sempurna menghasilkan garis mendatar — sama tidak realistisnya
 * dengan garis berpaku (semua pengeluaran menumpuk di dua tanggal).
 *
 * Kenapa tidak membulatkan tiap hari sendiri-sendiri: sisa pembulatan membuat
 * Σ baris melenceng dari total kategori yang dipakai donut. Di sini tiap angka
 * dibulatkan ke `step` (biar nominalnya wajar dibaca), lalu sisanya disebar ke
 * hari-hari terbesar — tidak pernah ditumpuk ke satu hari.
 */
function spreadAmounts(total: number, slots: number, step = 500): number[] {
  if (slots <= 0 || total <= 0) return []
  /* bobot bersiklus 4 hari: 1 · 2,5 · 2 · 1,5 → hari "rame" & "hemat" bergantian */
  const weights = Array.from({ length: slots }, (_, i) => 1 + ((i * 3) % 4) * 0.5)
  const sumW = weights.reduce((sum, w) => sum + w, 0)
  const out = weights.map((w) => Math.floor((total * w) / sumW / step) * step)
  let rest = total - out.reduce((sum, value) => sum + value, 0)
  const order = out
    .map((value, index) => ({ value, index }))
    .sort((a, b) => b.value - a.value)
    .map((item) => item.index)
  let k = 0
  while (rest > 0 && order.length > 0) {
    const add = Math.min(step, rest)
    out[order[k % order.length]] += add
    rest -= add
    k += 1
  }
  return out
}

/* ── KATEGORI & NAMA CATATAN ──────────────────────────────────────────────────
   Kategori = kunci pengelompokan donut, jadi teksnya PERSIS sama untuk setiap
   baris di kategori itu (donut menghitung GROUP BY `category`). Nama catatan
   yang berulang diambil dari kolam di bawah supaya Riwayat terasa seperti
   catatan orang, bukan daftar template. */
const CAT_KOS = 'Kos, Listrik & WiFi'
const CAT_MAKAN = 'Makan Siang & GoFood'
const CAT_ORTU = 'Transfer Orang Tua'
const CAT_KOPI = 'Kopi & Nongkrong'
const CAT_TRANSPORT = 'Transport (Ojol & KRL)'
const CAT_REWARD = 'Self-Reward / Shopee'

const LUNCH_NOTES = [
  'Makan siang kantor',
  'Warteg Bahari',
  'Nasi Padang Sederhana',
  'GoFood Ayam Geprek',
  'Bakso Pak Kumis',
  'Mie Ayam Bangka',
  'Nasi Goreng Gila',
  'GoFood Nasi Uduk',
  'Sate Taichan',
  'Pecel Lele',
  'Makan siang (food court)',
  'GoFood Katsu',
] as const

const COFFEE_NOTES = [
  'Kopi Kenangan (kopi susu)',
  'Janji Jiwa (americano)',
  'Ngopi bareng anak kantor',
  'Es kopi susu gula aren',
  'Jajan risoles depan kantor',
  'Nongkrong (teh + gorengan)',
  'Kopi lokal (americano)',
  'Kopi Kenangan (kopi susu)',
] as const

const LUNCH_TIMES = ['12:10', '12:45', '13:05', '11:50'] as const
const COFFEE_TIMES = ['15:20', '16:05', '14:40', '17:10'] as const

interface SeededWallets {
  bcaId: string
  gopayId: string
  shopeepayId: string
}

/** satu baris pengeluaran seed (dikumpulkan dulu, disisipkan urut kronologis) */
interface SeedExpense {
  walletId: string
  note: string
  amount: number
  category: string
  /** tanggal lokal `YYYY-MM-DD` */
  dateISO: string
  /** jam lokal `HH:MM` */
  time: string
}

/* ── DOMPET: `opening` di bawah BUKAN saldo yang "kelihatan" ──────────────────
   Saldo yang dibaca halaman selalu `opening + Σ baris ledger` (lihat
   `lib/money/ledger.ts`). Karena seed di bawah menulis gaji 7,3jt masuk ke BCA
   dan pengeluaran dari dompet-dompet ini, `opening` di sini sengaja kecil — ia
   hanya titik nol supaya SALDO AKHIR jatuh persis di angka target cerita:

     BCA 1.650.000 · GoPay 320.000 · ShopeePay 85.000 · Tunai 65.000
     (Σ = Rp 2.120.000)

   Titik nolnya bergeser saat baris ekor masuk (paket 96): "Top up GoPay" di
   `seedRecentActivity` memindahkan Rp 200.000 dari BCA ke GoPay, jadi `opening`
   BCA naik 100.000 → 300.000 dan GoPay turun 950.000 → 750.000. Σ `opening`
   TIDAK berubah (tetap 1.250.000), dan SALDO AKHIR tiap dompet tetap angka
   target di atas — pindah dana netral untuk total uang, bukan uang baru. */
function seedWallets(): SeededWallets {
  const bca = addWalletAccount({
    name: 'BCA',
    type: 'Bank',
    number: '•••• 0849',
    opening: 300_000,
    context: 'pribadi',
  })
  const gopay = addWalletAccount({
    name: 'GoPay',
    type: 'E-Wallet',
    number: '•••• 7781',
    opening: 750_000,
    context: 'pribadi',
  })
  const shopeepay = addWalletAccount({
    name: 'ShopeePay',
    type: 'E-Wallet',
    number: '•••• 3390',
    opening: 135_000,
    context: 'pribadi',
  })
  addWalletAccount({ name: 'Tunai', type: 'Cash', opening: 65_000, context: 'pribadi' })
  return { bcaId: bca.id, gopayId: gopay.id, shopeepayId: shopeepay.id }
}

function seedMoneySettings(): void {
  /* Kartu "Jatah Hari Ini" menampilkan CTA "Atur pemasukanmu dulu" selama
     `monthlyIncome` belum diisi (`hasConfiguredIncome`) — jadi demo WAJIB
     mengonfigurasi ini supaya jatah harian benar-benar muncul. Cicilan 0
     (ceritanya tanpa paylater), jadi jatah = (gaji − pengeluaran) ÷ sisa hari. */
  saveUserMoneySettings({ monthlyIncome: DEMO_INCOME, totalInstallments: 0 })
}

function seedIncome(bcaId: string): void {
  /* Gaji masuk di AWAL bulan (bukan "beberapa hari lalu") supaya masuk bulan
     berjalan: kalau gajian jatuh di bulan sebelumnya, jendela bulan ini kosong
     dan kartu Jatah Hari Ini malah masuk keadaan Dry Spell.

     Nilainya GAJI POKOK saja (`DEMO_SALARY`): sisanya (`DEMO_ALLOWANCE`) masuk
     sebagai baris terpisah di `seedRecentActivity`, dan TOTAL keduanya tetap
     `DEMO_INCOME` — angka yang sama dengan `monthlyIncome`. */
  postIncome({
    walletId: bcaId,
    amount: DEMO_SALARY,
    note: 'Gajian Bulan Ini',
    category: 'Gaji',
    dateISO: dayOfMonthISO(1),
    time: '08:05',
  })
}

/**
 * Dua baris TERAKHIR di hari berjalan — variasi kartu "Transaksi Terakhir"
 * (paket 96).
 *
 * KENAPA ADA: seluruh pengeluaran seed jatuh dari tanggal 1 sampai HARI INI,
 * jadi daftar 7-hari-terakhir di Home (yang dipotong 5 baris) berisi pengeluaran
 * saja — user melihat lima baris "-Rp" berturut-turut, padahal uang masuk &
 * pindah dana adalah bagian normal hidup sehari-hari. Dua baris ini mengisi
 * ekornya: satu uang MASUK (mint, tanda `+`) dan satu pindah dana (netral,
 * tanda `⇄`), jadi kartunya bercampur apa adanya.
 *
 * ATURAN YANG DIPATUHI (bukan kebetulan):
 *   1. DITULIS PALING AKHIR — `appendRow` menyisipkan baris baru di DEPAN, jadi
 *      yang terakhir ditulis = yang paling atas di kartu;
 *   2. JAMNYA PALING MALAM (22:15 & 22:30) — lebih lambat dari jam seed
 *      termalam yang mungkin ada di hari ini (`Gojek ke stasiun (malam)` 22:10,
 *      self-reward Shopee 21:30), jadi urutan "terbaru dulu" tetap utuh walau
 *      seed dijalankan tanggal 1 (saat semua jangkar terjepit ke hari ini);
 *   3. ANGKA CERITA TIDAK BERGESER: tunjangan 300.000 adalah bagian dari
 *      `DEMO_INCOME` (gaji pokoknya dikurangi sebesar itu di `seedIncome`), dan
 *      pindah dana 200.000 netral untuk total saldo — keduanya sudah dilunasi di
 *      `opening` BCA/GoPay (lihat catatan di `seedWallets`). Σ pemasukan tetap
 *      7.300.000, Σ pengeluaran tetap 5.180.000, total dompet tetap 2.120.000.
 */
function seedRecentActivity({ bcaId, gopayId }: SeededWallets): void {
  const dateISO = daysAgoISO(0)

  /* pindah dana: netral untuk total uang, dan inilah "variasi" kedua di daftar */
  postTransfer({
    fromWalletId: bcaId,
    toWalletId: gopayId,
    amount: 200_000,
    note: 'Top up GoPay dari BCA',
    dateISO,
    time: '22:15',
  })

  /* uang masuk: baris terakhir yang ditulis → paling atas di kartu, dan satu-satunya
     baris ber-tanda `+` di daftar. Kategorinya 'Pemasukan Lain' supaya warnanya
     membaca keluarga kanon pemasukan (tile mint), bukan fallback "lain-lain". */
  postIncome({
    walletId: bcaId,
    amount: DEMO_ALLOWANCE,
    note: 'Tunjangan Transport & Makan',
    category: 'Pemasukan Lain',
    dateISO,
    time: '22:30',
  })
}

function seedExpenses({ bcaId, gopayId, shopeepayId }: SeededWallets): void {
  /* Dikumpulkan DULU, lalu disisipkan URUT KRONOLOGIS. Bukan soal gaya: daftar
     Riwayat & Transaksi Terakhir membaca `snapshot.rows` APA ADANYA (baris
     terbaru ditulis paling depan), jadi urutan penulisan = urutan yang dibaca
     user. Menyisipkan urut waktu membuat Riwayat berbunyi sebagai kronologi,
     bukan campuran kategori yang lompat-lompat tanggal. */
  const draft: SeedExpense[] = []
  /** catat satu baris pengeluaran — `time` supaya jam di Riwayat masuk akal */
  const spend = (
    walletId: string,
    note: string,
    amount: number,
    category: string,
    dateISO: string,
    time: string,
  ): void => {
    draft.push({ walletId, note, amount, category, dateISO, time })
  }

  const days = elapsedDays()

  /* ── PENGELUARAN BULAN INI, DISEBAR SAMPAI HARI INI ─────────────────────────
     Σ tiap kategori tetap PERSIS angka donut (2.150.000 · 1.350.000 ·
     1.000.000 · 420.000 · 210.000 · 50.000). Yang berubah hanya TANGGALNYA.

     Kenapa tidak boleh menumpuk di awal (paket seed versi 4): kartu "Arus Uang"
     menggambar SATU TITIK PER HARI di atas sumbu yang puncaknya ditentukan gaji
     (7,3jt). Saat semua tagihan besar jatuh di tanggal 1–4, sisa bulan cuma
     berisi Rp 60–180 rb/hari — 1–5 piksel di kanvas 10jt. Hasilnya satu puncak
     tinggi di ujung kiri lalu GARIS RATA sampai "hari ini", dan gelombangnya
     terbaca seperti "pengeluaran gue berhenti", bukan "sisa bulan belum jalan".

     Aturan barunya:
       1. tagihan besar dipasang lewat `anchorDayISO(ratio)` — rasio dari bulan
          yang SUDAH berjalan — jadi puncak gelombangnya selalu tersebar
          (tanggal 1 · ~⅓ · ~⅔ · ~⅞ bulan berjalan), bukan menumpuk di awal;
       2. kos dibayar DUA KALI (DP + pelunasan). Ini yang membuat gelombangnya
          benar-benar berjalan sampai "hari ini": Σ kos 1,8jt sekaligus di
          tanggal 1 akan selalu jadi puncak tunggal yang menenggelamkan sisa
          bulan, sedangkan dipecah dua, kurvanya naik-turun dua kali dengan
          tinggi yang sebanding. Nominal, kategori, dan saldo dompet TIDAK
          berubah sedikit pun (Σ tetap 2.150.000 untuk "Kos, Listrik & WiFi");
       3. makan & kopi disebar ke hari 1…hari ini (`spreadAmounts`) — lantai
          "hidup" kurva yang membuat tiap hari punya nilai, bukan nol;
       4. transport disebar MERATA dari hari ini mundur ke tanggal 1. */

  /* 1 · Kos, Listrik & WiFi = 2.150.000 */
  spend(bcaId, 'Kosan Bulan Ini (DP)', 1_100_000, CAT_KOS, anchorDayISO(0), '07:05')
  spend(bcaId, 'Alfamart (tisu, air galon, cemilan)', 47_000, CAT_KOS, anchorDayISO(0.3), '20:10')
  spend(bcaId, 'Token Listrik & WiFi Indihome', 303_000, CAT_KOS, anchorDayISO(0.35), '19:30')
  spend(bcaId, 'Kosan Bulan Ini (pelunasan)', 700_000, CAT_KOS, anchorDayISO(0.6), '19:10')

  /* 2 · Makan Siang & GoFood = 1.350.000 (28.500 tetap baris "Mie Gacoan" sendiri) */
  spend(bcaId, 'Mie Gacoan (makan siang bareng kantor)', 28_500, CAT_MAKAN, daysAgoISO(0), '12:40')
  spreadAmounts(1_350_000 - 28_500, days).forEach((amount, index) => {
    spend(
      bcaId,
      LUNCH_NOTES[index % LUNCH_NOTES.length],
      amount,
      CAT_MAKAN,
      dayOfMonthISO(index + 1),
      LUNCH_TIMES[index % LUNCH_TIMES.length],
    )
  })

  /* 3 · Transfer Orang Tua = 1.000.000 — pertengahan bulan (~85% bulan berjalan),
     bukan tanggal 4: satu-satunya tagihan besar yang bisa ditempatkan di paruh
     akhir, jadi ia yang menjaga gelombang tetap bergerak sampai hari ini. */
  spend(bcaId, 'Transfer Mamah', 1_000_000, CAT_ORTU, anchorDayISO(0.85), '20:45')

  /* 4 · Kopi & Nongkrong = 420.000 (oat latte & kado ultah tetap baris sendiri) */
  spend(gopayId, 'Kopi Kenangan Oat Latte', 32_000, CAT_KOPI, daysAgoISO(0), '09:15')
  spend(gopayId, 'Patungan kado ultah temen', 50_000, CAT_KOPI, daysAgoISO(2), '21:05')
  spreadAmounts(420_000 - 82_000, days).forEach((amount, index) => {
    spend(
      gopayId,
      COFFEE_NOTES[index % COFFEE_NOTES.length],
      amount,
      CAT_KOPI,
      dayOfMonthISO(index + 1),
      COFFEE_TIMES[index % COFFEE_TIMES.length],
    )
  })

  /* 5 · Transport (Ojol & KRL) = 210.000 — satu perjalanan tiap beberapa hari,
     disebar MERATA dari hari ini MUNDUR ke tanggal 1 (`ago` = rasio, bukan
     tanggal tetap): titik transport ikut mengisi hari-hari terakhir bulan
     berjalan, jadi ekor kurva tidak "kering" di ujung kanan. */
  const rides: readonly (readonly [string, number, string])[] = [
    ['Gojek ke Stasiun (hujan deras)', 19_000, '07:20'],
    ['KRL ke kantor (top up)', 40_000, '07:35'],
    ['Gojek pulang lembur', 32_000, '21:40'],
    ['Ojol ke stasiun', 18_000, '06:55'],
    ['KRL mingguan', 40_000, '07:30'],
    ['Gojek anter adik', 21_000, '16:15'],
    ['Ojek online (ke kampus)', 20_000, '18:20'],
    ['Gojek ke stasiun (malam)', 20_000, '22:10'],
  ]
  rides.forEach(([note, amount, time], index) => {
    const ago = Math.round((days - 1) * (index / (rides.length - 1)))
    spend(gopayId, note, amount, CAT_TRANSPORT, daysAgoISO(ago), time)
  })

  /* 6 · Self-Reward / Shopee = 50.000 — mendekati hari ini */
  spend(shopeepayId, 'Checkout Shopee (self-reward)', 50_000, CAT_REWARD, anchorDayISO(0.95), '21:30')

  /* baru ditulis ke ledger, urut kronologis (tanggal → jam) */
  draft
    .sort((a, b) => a.dateISO.localeCompare(b.dateISO) || a.time.localeCompare(b.time))
    .forEach((row) => postExpense(row))
}

function seedFunds(bcaId: string): void {
  const fund = addFund({
    name: 'Nabung Liburan ke Bali',
    target: 5_000_000,
    deadline: daysAheadISO(180),
    priority: 'tinggi',
    scope: 'pribadi',
  })
  /* Setoran sengaja bertanggal BULAN SEBELUMNYA: saldo celengan tetap
     "terkumpul 1.250.000" (25% → tahap tanaman "Tunas"), tapi baris kas-nya tidak
     ikut mengotori donut & "Transaksi Terakhir" bulan berjalan. */
  contributeToFund(fund.id, 1_250_000, bcaId, previousMonthISO())
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
