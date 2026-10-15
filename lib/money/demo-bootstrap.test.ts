import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { isDemoSeeded, resetDemoSeedMarker, seedDemoDataOnce } from './demo-bootstrap'
import {
  cashTotal,
  getMoneySnapshot,
  getServerMoneySnapshot,
  purgeMoneyStore,
  recordedTransactions,
  resetMoneyStore,
  walletBalance,
} from './store'
import { summarizeTransactions } from '@/lib/data/history'
import {
  HOME_RECENT_MAX_ROWS,
  capHomeRecentRows,
  homeMoneyRowFrom,
  homeRowsInLastDays,
  type HomeMoneyRow,
} from '@/lib/data/home-money'
import { localISODate } from '@/lib/time'
import { fundPercentRounded, plantStageFrom } from '@/lib/data/budget'
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

  /* Penanda demo sekarang menyimpan VERSI (`2`), bukan boolean. Perangkat yang
     masih memegang persona lama (atau belum pernah di-seed) akan melewati
     "fresh start" — di browser itu = bersihkan state lokal + reload sekali; di
     test/SSR (tanpa `window`) langsung ditulis. Yang dikunci di sini: setelah
     persona ada, seed ulang TIDAK jalan (idempoten lewat versi). */
  it('penanda versi: isDemoSeeded() true setelah seed, seed ulang tidak jalan', () => {
    expect(isDemoSeeded()).toBe(false)

    expect(seedDemoDataOnce()).toBe(true)
    expect(isDemoSeeded()).toBe(true)
    expect(seedDemoDataOnce()).toBe(false)
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

/* ── CERITA AKUN DEMO (data Gen Z) ──────────────────────────────────────────
   Mengunci ANGKA PERSIS persona demo supaya "cermin" di landing/dashboard tidak
   diam-diam bergeser saat seed diubah. Yang dibuktikan: saldo tiap dompet jatuh
   di angka cerita, total pemasukan/pengeluaran persis, dan celengan Bali ada di
   25% (tahap "Tunas", bukan "Benih" — ambangnya memang ≥25%). */
describe('cerita akun demo · anak 20-an, gaji 7,3jt', () => {
  /* Mulai dari state KOSONG — persis kunjungan pertama browser di mode demo.
     `resetMoneyStore()` di beforeEach luar mengisi dompet KANON (bca/gopay/tunai);
     kalau dibiarkan, setoran celengan (ditulis berdasarkan NAMA dompet) mendarat
     di dompet kanon yang bernama sama dan angka per-dompet jadi salah. */
  beforeEach(() => {
    purgeMoneyStore()
  })

  it('saldo tiap dompet persis & totalnya Rp 2.120.000', () => {
    seedDemoDataOnce()
    const money = getMoneySnapshot()
    const balanceOf = (name: string) => {
      const wallet = money.wallets.find((item) => item.name === name)
      expect(wallet, `dompet ${name} tidak ada`).toBeTruthy()
      return walletBalance(money, wallet!.id)
    }

    expect(balanceOf('BCA')).toBe(1_650_000)
    expect(balanceOf('GoPay')).toBe(320_000)
    expect(balanceOf('ShopeePay')).toBe(85_000)
    expect(balanceOf('Tunai')).toBe(65_000)
    expect(cashTotal(money)).toBe(2_120_000)
  })

  it('pemasukan 7.300.000 · pengeluaran 5.180.000 · sisa 2.120.000', () => {
    seedDemoDataOnce()
    const summary = summarizeTransactions(recordedTransactions(getMoneySnapshot()))

    expect(summary.income).toBe(7_300_000)
    expect(summary.expense).toBe(5_180_000)
    expect(summary.net).toBe(2_120_000)
  })

  it('celengan "Nabung Liburan ke Bali" 25% → tahap Tunas', () => {
    seedDemoDataOnce()
    const fund = getFundsSnapshot().funds.find((item) => item.name === 'Nabung Liburan ke Bali')
    expect(fund).toBeTruthy()

    expect(fund!.target).toBe(5_000_000)
    expect(fund!.current).toBe(1_250_000)
    expect(fundPercentRounded(fund!)).toBe(25)
    /* 25% = ambang "Tunas" (24% akan jatuh ke "Benih") */
    expect(plantStageFrom(fund!.current, fund!.target)).toBe('sprout')
    expect(fund!.stage).toBe('sprout')
  })

  /* Kartu "Arus Uang" menggambar SATU TITIK PER HARI. Sebelum ini semua
     pengeluaran menumpuk di 2–3 tanggal, jadi grafiknya tampak seperti paku —
     lonjakan, lalu nol sepanjang bulan. Yang dikunci di sini: tanggalnya
     BENAR-BENAR tersebar, puncak hariannya wajar, dan jam tiap baris tidak
     seragam (jam seragam = ciri paling telanjang data karangan). */
  it('pengeluaran tersebar per hari & jamnya bervariasi', () => {
    seedDemoDataOnce()
    const rows = recordedTransactions(getMoneySnapshot()).filter((row) => row.type === 'expense')

    const perDay = new Map<string, number>()
    for (const row of rows) perDay.set(row.date, (perDay.get(row.date) ?? 0) + row.amount)

    const days = new Date().getDate()
    expect(perDay.size).toBeGreaterThanOrEqual(Math.min(days, 10))

    const total = [...perDay.values()].reduce((sum, value) => sum + value, 0)
    const biggest = Math.max(...perDay.values())
    if (days >= 10) expect(biggest / total).toBeLessThan(0.6)

    expect(new Set(rows.map((row) => row.time)).size).toBeGreaterThan(5)
  })
})

/* ── GELOMBANG "ARUS UANG" SAMPAI HARI INI (seed versi 4) ────────────────────
   Kartu "Arus Uang" menggambar SATU TITIK PER HARI di atas sumbu yang puncaknya
   ditentukan gaji (7,3jt di tanggal 1). Versi seed sebelumnya menumpuk tagihan
   besar (kos 1,8jt · listrik · transfer ortu) di tanggal 1–4, jadi kurvanya satu
   puncak di ujung kiri lalu GARIS RATA sampai tanggal akhir — terbaca seperti
   "pengeluaran berhenti", bukan "gelombang". Yang dikunci di sini: puncak
   tagihan tersebar sepanjang bulan yang SUDAH berjalan, puncak terakhirnya
   mendekati hari ini, dan setiap hari 1…hari ini benar-benar punya nilai.

   Tanggalnya DIPATOK (`vi.setSystemTime`) supaya hasilnya deterministik: tanpa
   itu, test ini berubah artinya setiap hari dan gagal sendiri tiap tanggal 1–5
   (saat seluruh bulan belum jalan). */
describe('gelombang "arus uang" sampai hari ini (seed 4)', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2026, 9, 15, 10, 0, 0)) // 15 Oktober 2026
    purgeMoneyStore()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  /** pengeluaran bulan berjalan per tanggal (kunci = tanggal 1…31) */
  function expensePerDay(): Map<number, number> {
    const perDay = new Map<number, number>()
    for (const row of recordedTransactions(getMoneySnapshot())) {
      if (row.type !== 'expense') continue
      const day = Number(row.date.slice(8, 10))
      perDay.set(day, (perDay.get(day) ?? 0) + row.amount)
    }
    return perDay
  }

  it('puncak pengeluaran tersebar: tanggal 1 · pertengahan · dekat hari ini', () => {
    seedDemoDataOnce()
    const perDay = expensePerDay()
    const total = [...perDay.values()].reduce((sum, value) => sum + value, 0)

    /* "puncak" = hari yang menelan ≥ 10% pengeluaran bulan (≈ setengah juta) —
       ambang ini yang membuatnya KELIHATAN di kanvas 10jt, bukan sekadar
       "ada baris di tanggal itu" */
    const peaks = [...perDay.entries()]
      .filter(([, amount]) => amount >= total * 0.1)
      .map(([day]) => day)
      .sort((a, b) => a - b)

    expect(peaks.length).toBeGreaterThanOrEqual(3)
    /* puncak terakhir mendekati HARI INI (bukan tanggal 3–4) */
    expect(Math.max(...peaks)).toBeGreaterThanOrEqual(12)
    /* …dan puncaknya tidak menumpuk: maksimum satu di sepertiga pertama */
    expect(peaks.filter((day) => day <= 5).length).toBeLessThanOrEqual(1)
  })

  it('setiap hari 1…hari ini punya pengeluaran; sisa bulan tetap nol (jujur)', () => {
    seedDemoDataOnce()
    const days = [...expensePerDay().keys()].sort((a, b) => a - b)

    expect(days[0]).toBe(1)
    expect(days[days.length - 1]).toBe(15)
    expect(days).toHaveLength(15)
  })

  it('dibuka tanggal 3 pun tidak menumpuk: tiap hari berjalan tetap kebagian', () => {
    vi.setSystemTime(new Date(2026, 9, 3, 10, 0, 0))
    purgeMoneyStore()
    seedDemoDataOnce()
    const perDay = expensePerDay()

    /* penjepitan tanggal (1..hari ini) TIDAK boleh menggabungkan semua tagihan
       besar di tanggal 1 — itulah kenapa anchor-nya rasio, bukan tanggal tetap */
    expect([...perDay.keys()].sort((a, b) => a - b)).toEqual([1, 2, 3])
    expect(perDay.get(1) ?? 0).toBeLessThan(2_000_000)
  })
})

/* ── VARIASI KARTU "TRANSAKSI TERAKHIR" (paket 96) ───────────────────────────
   Kartu Home menampilkan 7 hari kalender terakhir lalu memotongnya ke 5 baris
   (`homeRowsInLastDays()` → `capHomeRecentRows()`). Yang dikunci di sini: daftar
   itu BUKAN lima baris pengeluaran — ada uang MASUK & pindah dana di dalamnya,
   dan baris paling atas memang bukan pengeluaran. Barisnya dibangun dengan
   pipeline yang SAMA dengan komponennya (`recordedTransactions()` →
   `homeMoneyRowFrom()`), jadi tidak ada rumus kedua yang bisa melenceng. */
describe('"Transaksi Terakhir" bercampur, bukan pengeluaran saja (seed 5)', () => {
  beforeEach(() => {
    purgeMoneyStore()
  })

  /** baris yang benar-benar digambar kartu Home saat ini */
  function visibleRows(): HomeMoneyRow[] {
    const rows = recordedTransactions(getMoneySnapshot()).map(homeMoneyRowFrom)
    return capHomeRecentRows(homeRowsInLastDays(rows, localISODate()))
  }

  it('5 baris teratas memuat uang masuk, pindah dana, DAN pengeluaran', () => {
    seedDemoDataOnce()
    const visible = visibleRows()

    expect(visible).toHaveLength(HOME_RECENT_MAX_ROWS)
    const types = visible.map((row) => row.type)
    expect(types).toContain('income')
    expect(types).toContain('transfer')
    expect(types).toContain('expense')
    /* baris paling atas yang dilihat user BUKAN pengeluaran */
    expect(visible[0].type).not.toBe('expense')
  })

  it('urutan "terbaru dulu" tetap utuh (jam baris ekor paling malam)', () => {
    seedDemoDataOnce()
    const visible = visibleRows()

    const key = (row: HomeMoneyRow) => `${row.date} ${row.time}`
    const desc = [...visible].sort((a, b) => (key(a) < key(b) ? 1 : -1))
    expect(visible.map(key)).toEqual(desc.map(key))
  })

  it('variasi itu tidak menggeser angka cerita', () => {
    seedDemoDataOnce()
    const summary = summarizeTransactions(recordedTransactions(getMoneySnapshot()))

    /* tunjangan = bagian dari gaji pokok, pindah dana netral → total tetap sama */
    expect(summary.income).toBe(7_300_000)
    expect(summary.expense).toBe(5_180_000)
    expect(cashTotal(getMoneySnapshot())).toBe(2_120_000)
  })
})
