import { beforeEach, describe, expect, it } from 'vitest'
import {
  FUND_CONTRIBUTIONS,
  INITIAL_SINKING_FUNDS,
  computeDailyHud,
  fundPercent,
  heroFundOf,
  sinkingObligationOf,
  sortFundsByUrgency,
  type SinkingFundItem,
} from '@/lib/data/budget'
import {
  SWEEP_SOURCE_ID,
  addFund,
  contributeToFund,
  contributionsOf,
  deleteFund,
  fundById,
  getFundsSnapshot,
  liveFunds,
  mergeFundsState,
  purgeFundsStore,
  resetFundsStore,
  restoreFund,
  subscribeFundsStore,
  sweepIntoFund,
  useFundsStore,
  type PersistedFunds,
} from './funds-store'

/* ── SATU STORE CELENGAN (paket 46) ──────────────────────────────────────────
   Temuan uji pemakaian yang dijaga di sini: kartu "Tabungan Impian" di Dashboard
   tidak sinkron dengan halaman lain. Test di bawah mengunci janjinya:

     1. celengan yang ditanam lewat satu pintu (`addFund`) TERLIHAT oleh setiap
        pembaca store — kartu Home (`heroFundOf`/`sortFundsByUrgency`), /budget,
        dan /budget/<id> (`fundById` + `contributionsOf`);
     2. setoran lewat `contributeToFund` mengubah progres, tahap tanaman,
        kewajiban bulan ini, DAN riwayat setoran dalam satu tulisan;
     3. arti `reachedNow` (dasar perayaan milestone) benar di semua kasus tepi;
     4. `mergeFundsState` (hidrasi IndexedDB) tidak menghidupkan kembali data
        contoh setelah akun dihapus.

   Tidak ada komponen yang diuji di sini — halaman hanya menyusun tampilan dari
   selector yang sama, jadi janji "satu sumber" cukup dikunci di lapis data. */

beforeEach(() => {
  resetFundsStore()
})

describe('pintu tulis celengan', () => {
  it('addFund menambah celengan yang langsung terbaca halaman lain', () => {
    const before = getFundsSnapshot().funds.length
    const created = addFund({
      name: 'Liburan ke Bali',
      target: 8_000_000,
      deadline: '2027-03-01',
      priority: 'sedang',
      scope: 'pribadi',
    })

    const snapshot = getFundsSnapshot()
    expect(snapshot.funds).toHaveLength(before + 1)
    /* celengan baru selalu mulai dari benih & belum disetor (PRD 2C.3) */
    expect(created).toMatchObject({ current: 0, stage: 'seed', contributedThisMonth: false })

    /* tiga pembaca berbeda membaca angka yang SAMA */
    expect(fundById(snapshot, created.id)?.name).toBe('Liburan ke Bali') // /budget/<id>
    expect(snapshot.funds.map((fund) => fund.name)).toContain('Liburan ke Bali') // /budget
    expect(heroFundOf(snapshot.funds)).not.toBeNull() // kartu Tabungan Impian + widget tanaman
  })

  it('celengan yang belum ada di seed tetap bisa disetor & ditelusuri riwayatnya', () => {
    const created = addFund({
      name: 'Celengan Baru',
      target: 1_000_000,
      deadline: '2026-12-01',
      priority: 'rendah',
      scope: 'keluarga',
    })
    expect(fundById(getFundsSnapshot(), created.id)).not.toBeNull()

    const result = contributeToFund(created.id, 250_000, 'bca')
    expect(result?.fund.current).toBe(250_000)
    expect(contributionsOf(getFundsSnapshot(), created.id)).toHaveLength(1)
  })

  it('contributeToFund mengubah progres, tahap, status bulan ini, & riwayat sekaligus', () => {
    /* Coldplay: 1.800.000 dari 3.000.000 = 60% → tahap 'plant' */
    const target = INITIAL_SINKING_FUNDS[0]
    const historyBefore = contributionsOf(getFundsSnapshot(), target.id).length

    const result = contributeToFund(target.id, 300_000, 'gopay')

    expect(result).not.toBeNull()
    expect(result?.fund.current).toBe(target.current + 300_000)
    expect(result?.fund.contributedThisMonth).toBe(true)
    expect(result?.contribution).toMatchObject({
      fundId: target.id,
      amount: 300_000,
      walletId: 'gopay',
    })

    const stored = fundById(getFundsSnapshot(), target.id)
    expect(stored?.current).toBe(result?.fund.current)
    expect(stored?.stage).toBe(result?.fund.stage)
    expect(contributionsOf(getFundsSnapshot(), target.id)).toHaveLength(historyBefore + 1)
  })

  it('reachedNow hanya true kalau setoran INI yang melunasi target', () => {
    const created = addFund({
      name: 'Hampir Penuh',
      target: 100_000,
      deadline: '2026-10-30',
      priority: 'tinggi',
      scope: 'pribadi',
    })

    /* belum penuh → bukan perayaan */
    expect(contributeToFund(created.id, 60_000, 'bca')?.reachedNow).toBe(false)
    /* setoran yang melunasi target → perayaan, dan tahapnya 'bloom' */
    const done = contributeToFund(created.id, 40_000, 'bca')
    expect(done?.reachedNow).toBe(true)
    expect(done?.fund.stage).toBe('bloom')
    /* setoran setelah penuh bukan perayaan lagi (jangan mengulang momen) */
    expect(contributeToFund(created.id, 50_000, 'bca')?.reachedNow).toBe(false)
  })

  it('input tidak sah tidak menulis apa pun (bukan tulisan separuh)', () => {
    const before = getFundsSnapshot()
    expect(contributeToFund(999, 100_000, 'bca')).toBeNull() // celengan tidak ada
    expect(contributeToFund(before.funds[0].id, 0, 'bca')).toBeNull() // nominal 0
    expect(contributeToFund(before.funds[0].id, -50_000, 'bca')).toBeNull() // nominal negatif
    const after = getFundsSnapshot()
    expect(after.funds).toEqual(before.funds)
    expect(after.contributions).toEqual(before.contributions)
  })

  it('sweepIntoFund mencatat sumber "Sisa budget", bukan dompet', () => {
    const target = INITIAL_SINKING_FUNDS[2]
    const result = sweepIntoFund(target.id, 120_000)
    expect(result?.contribution.walletId).toBe(SWEEP_SOURCE_ID)
    expect(result?.fund.contributedThisMonth).toBe(true)
  })

  it('purgeFundsStore mengosongkan store tanpa menghidupkan celengan contoh', () => {
    expect(getFundsSnapshot().funds.length).toBeGreaterThan(0)
    const purged = purgeFundsStore()
    expect(purged.funds).toEqual([])
    expect(purged.contributions).toEqual([])
    expect(getFundsSnapshot().funds).toEqual([])
  })
})

describe('mergeFundsState (hidrasi IndexedDB)', () => {
  it('kunjungan pertama (belum ada state tersimpan) memakai daftar seed', () => {
    const merged = mergeFundsState(null)
    expect(merged.funds).toEqual(INITIAL_SINKING_FUNDS)
    expect(merged.contributions).toEqual(FUND_CONTRIBUTIONS)
    expect(merged.hydrated).toBe(true)
  })

  it('daftar tersimpan jadi dasar, celengan baru sebelum hidrasi tetap ikut', () => {
    const stored: SinkingFundItem = {
      id: 7,
      name: 'Sepeda Lipat',
      target: 4_000_000,
      current: 500_000,
      deadline: '2027-01-01',
      priority: 'sedang',
      stage: 'sprout',
      scope: 'pribadi',
      contributedThisMonth: false,
    }
    const persisted: PersistedFunds = {
      version: 1,
      funds: [stored],
      contributions: [{ id: 1, fundId: 7, date: '2026-09-01', amount: 500_000, walletId: 'bca' }],
    }
    /* celengan yang ditanam user SEBELUM hidrasi selesai (masih di memory) */
    addFund({
      name: 'Ditaman Sebelum Hidrasi',
      target: 1_000_000,
      deadline: '2026-12-01',
      priority: 'rendah',
      scope: 'keluarga',
    })

    const merged = mergeFundsState(persisted)
    expect(merged.funds).toHaveLength(2)
    expect(merged.funds[0]).toEqual(stored)
    expect(merged.funds[1].name).toBe('Ditaman Sebelum Hidrasi')
    /* tidak ada duplikat id, dan riwayat setoran tersimpan tetap ada */
    expect(new Set(merged.funds.map((fund) => fund.id)).size).toBe(2)
    expect(merged.contributions[0]).toMatchObject({ fundId: 7, amount: 500_000 })
  })

  it('versi bentuk data asing diperlakukan sebagai "belum ada" (tidak menebak)', () => {
    const merged = mergeFundsState({ version: 99, funds: [], contributions: [] })
    expect(merged.funds).toEqual(INITIAL_SINKING_FUNDS)
  })
  it('celengan yang lahir SEBELUM hidrasi tidak menimpa id data tersimpan', () => {
    /* ditanam sebelum store selesai membaca IndexedDB → id dari ruang tinggi */
    const created = addFund({
      name: 'Lahir Sebelum Hidrasi',
      target: 1_000_000,
      deadline: '2026-12-01',
      priority: 'rendah',
      scope: 'pribadi',
    })
    expect(created.id).toBeGreaterThanOrEqual(1_000_000)

    /* state tersimpan user memakai id kecil & berurutan — kalau id dihitung dari
       daftar seed, dua-duanya akan bertabrakan di angka 4 dan salah satunya hilang */
    const persisted: PersistedFunds = {
      version: 1,
      funds: [{ ...INITIAL_SINKING_FUNDS[0], id: 4, name: 'Celengan Tersimpan' }],
      contributions: [],
    }
    const merged = mergeFundsState(persisted)
    expect(merged.funds.map((fund) => fund.name).sort()).toEqual([
      'Celengan Tersimpan',
      'Lahir Sebelum Hidrasi',
    ])
    expect(new Set(merged.funds.map((fund) => fund.id)).size).toBe(merged.funds.length)
  })
  it('akun yang sudah dihapus tidak diisi ulang celengan contoh', () => {
    const merged = mergeFundsState({ version: 1, funds: [], contributions: [], purged: true })
    expect(merged.funds).toEqual([])
    expect(merged.contributions).toEqual([])
  })
})

describe('kontrak store untuk komponen (pembaca yang sama)', () => {
  it('subscribe memberi notifikasi setiap tulisan, dan berhenti setelah unsubscribe', () => {
    let calls = 0
    const unsubscribe = subscribeFundsStore(() => {
      calls += 1
    })
    addFund({
      name: 'Langganan',
      target: 500_000,
      deadline: '2026-11-01',
      priority: 'rendah',
      scope: 'pribadi',
    })
    expect(calls).toBeGreaterThan(0)
    const seen = calls
    unsubscribe()
    addFund({
      name: 'Setelah Lepas Langganan',
      target: 500_000,
      deadline: '2026-11-01',
      priority: 'rendah',
      scope: 'pribadi',
    })
    expect(calls).toBe(seen)
  })

  it('hook store & snapshot biasa adalah sumber yang sama (tanpa hydration mismatch)', () => {
    /* `useFundsStore` butuh React; yang dijaga di sini adalah janji bentuknya:
       snapshot server = daftar seed, dan snapshot biasa = state hidup. */
    expect(typeof useFundsStore).toBe('function')
    expect(getFundsSnapshot().funds.length).toBe(INITIAL_SINKING_FUNDS.length)
  })

  it('satu angka untuk kartu Home, /budget, & halaman detail', () => {
    const created = addFund({
      name: 'Satu Angka',
      target: 2_000_000,
      deadline: '2027-02-01',
      priority: 'kritis',
      scope: 'pribadi',
    })
    contributeToFund(created.id, 1_000_000, 'bca')

    const snapshot = getFundsSnapshot()
    const cardFund = snapshot.funds.find((fund) => fund.id === created.id)
    const pctFromCard = Math.round(fundPercent(cardFund!))
    const pctFromDetail = Math.round(
      (contributionsOf(snapshot, created.id).reduce((sum, row) => sum + row.amount, 0) /
        created.target) *
        100,
    )
    expect(pctFromCard).toBe(50)
    /* setoran yang tercatat di riwayat = kenaikan `current` (tidak ada dua angka) */
    expect(pctFromDetail).toBe(pctFromCard)
    /* urutan kartu Home tetap ditentukan aturan prioritas → progres */
    expect(sortFundsByUrgency(snapshot.funds)[0].priority).toBe('kritis')
  })

  it('kartu "Jatah Hari Ini" Home & /budget bergerak bersama (satu daftar celengan)', () => {
    /* Baseline: HUD yang dihitung dari daftar seed identik dengan angka kanon
       `DAILY_HUD` — jadi memindahkan hitungan ini ke store TIDAK mengubah demo. */
    const baseline = computeDailyHud({ sinkingFunds: getFundsSnapshot().funds })
    const canon = computeDailyHud({ sinkingFunds: INITIAL_SINKING_FUNDS })
    expect(baseline.dailyBudget).toBe(canon.dailyBudget)
    expect(baseline.remaining).toBe(canon.remaining)

    /* celengan baru = kewajiban bulanan baru → jatah harian ikut turun, di KEDUA
       halaman (Home membaca store yang sama, /budget memakai `sinkingFunds`) */
    addFund({
      name: 'Kewajiban Baru',
      target: 12_000_000,
      deadline: '2027-09-01',
      priority: 'sedang',
      scope: 'pribadi',
    })
    const afterAdd = computeDailyHud({ sinkingFunds: getFundsSnapshot().funds })
    expect(afterAdd.remaining).toBeLessThan(baseline.remaining)
    expect(afterAdd.dailyBudget).toBeLessThan(baseline.dailyBudget)
    /* Home (`daily-hud-card`) & /budget (`budget-screen`) memakai rumus + daftar
       yang sama, jadi tidak ada cabang yang bisa menghasilkan angka berbeda */
    expect(afterAdd.dailyBudget).toBe(
      computeDailyHud({ sinkingFunds: getFundsSnapshot().funds }).dailyBudget,
    )

    /* menyetor celengan itu melunasi kewajibannya → jatah harian pulih */
    const created = getFundsSnapshot().funds.at(-1)!
    contributeToFund(created.id, 1_000_000, 'bca')
    const afterContribute = computeDailyHud({ sinkingFunds: getFundsSnapshot().funds })
    expect(afterContribute.remaining).toBeGreaterThan(afterAdd.remaining)
  })
})

/* ── HAPUS CELENGAN = JATAH HARIAN NAIK, DAN ITU DIKATAKAN (paket 60 · 60.2) ──
   Temuan audit #4: celengan punya efek uang yang tidak diberitahukan —
   `sinkingObligationOf()` memotong kewajiban bulanannya dari kolam SEBELUM jatah
   harian dibagi. Test di bawah mengunci empat janji yang diucapkan dialog
   `FUND_DELETE_COPY`:

     · celengan hilang dari SEMUA pembaca tampilan (`liveFunds`, `fundById`) dan
       kartu Home (`heroFundOf`) ikut berganti wajah;
     · Jatah Harian NAIK — dengan angka sebelum/sesudahnya;
     · kalau kewajiban bulan ini SUDAH disetor, Jatah Harian TIDAK berubah
       (kalimat `noObligationNote` di dialog);
     · riwayat setoran tetap utuh: uangnya memang sudah keluar dari dompet. */

describe('deleteFund / restoreFund — hapus celengan (60.2)', () => {
  /** iPhone 16: kewajiban bulanan Rp 2.000.000 (target 18jt − 10jt / 4 bulan) */
  const kewajibanTerbesar = INITIAL_SINKING_FUNDS[2]

  it('menghapus celengan dengan kewajiban Rp 2jt: Jatah Harian NAIK 200rb → 700rb', () => {
    const sebelum = computeDailyHud({ sinkingFunds: liveFunds(getFundsSnapshot()) })
    expect(sinkingObligationOf([kewajibanTerbesar])).toBe(2_000_000)
    /* jatah harian kanon: 7,5jt − 800rb cicilan − 3,6jt celengan = 3,1jt;
       3,1jt − 2,3jt terpakai = 800rb dibagi 4 hari = 200rb */
    expect(sebelum.remaining).toBe(800_000)
    expect(sebelum.dailyBudget).toBe(200_000)

    const removed = deleteFund(kewajibanTerbesar.id)
    expect(removed?.name).toBe('iPhone 16')

    const sesudah = computeDailyHud({ sinkingFunds: liveFunds(getFundsSnapshot()) })
    /* kewajiban yang dilepas Rp 2jt → kolam 5,1jt; sisa 2,8jt dibagi 4 hari */
    expect(sesudah.sinkingObligation).toBe(sebelum.sinkingObligation - 2_000_000)
    expect(sesudah.remaining).toBe(2_800_000)
    expect(sesudah.dailyBudget).toBe(700_000)
  })

  it('kartu Home (heroFundOf) ikut berganti begitu celengan yang dihapus hilang dari daftar', () => {
    const hidup = () => liveFunds(getFundsSnapshot())
    const wajahAwal = heroFundOf(hidup())
    /* aturan kartu Home: prioritas 'kritis' lebih dulu → Dana Darurat */
    expect(wajahAwal?.name).toBe('Dana Darurat')

    deleteFund(wajahAwal!.id)
    expect(hidup().map((fund) => fund.id)).toEqual([1, 3])
    /* tanpa yang kritis, wajah kartunya jatuh ke progres tertinggi (Coldplay 60%) */
    expect(heroFundOf(hidup())?.name).toBe('Tiket Konser Coldplay')
  })

  it('kewajiban bulan ini SUDAH disetor → Jatah Harian tidak berubah', () => {
    contributeToFund(kewajibanTerbesar.id, 2_000_000, 'bca')
    const sebelum = computeDailyHud({ sinkingFunds: liveFunds(getFundsSnapshot()) })
    expect(sinkingObligationOf(liveFunds(getFundsSnapshot()))).toBe(1_600_000)

    deleteFund(kewajibanTerbesar.id)

    const sesudah = computeDailyHud({ sinkingFunds: liveFunds(getFundsSnapshot()) })
    /* kewajibannya sudah lunas, jadi tidak ada yang dilepas — dialog hapus
       memakai `noObligationNote` untuk keadaan ini, bukan menjanjikan kenaikan */
    expect(sesudah.dailyBudget).toBe(sebelum.dailyBudget)
    expect(sesudah.remaining).toBe(sebelum.remaining)
  })

  it('id tidak ada / sudah dihapus: tidak menulis apa pun, dan Undo hanya sekali jalan', () => {
    const before = getFundsSnapshot()
    expect(deleteFund(999)).toBeNull()

    const removed = deleteFund(2)
    expect(removed).not.toBeNull()
    /* hapus dua kali ditolak — bukan menghapus baris lain atau menulis tombstone ganda */
    expect(deleteFund(2)).toBeNull()
    expect(getFundsSnapshot().removedIds).toEqual([2])

    expect(restoreFund(2)?.name).toBe('Dana Darurat')
    expect(liveFunds(getFundsSnapshot())).toEqual(before.funds)
    /* Undo kedua ditolak dengan jujur (tombstone-nya sudah dicabut) */
    expect(restoreFund(2)).toBeNull()
  })

  it('riwayat setoran TIDAK dibuang meski celengannya dihapus (uangnya sudah keluar)', () => {
    const fundId = 2
    const historyBefore = contributionsOf(getFundsSnapshot(), fundId)
    expect(historyBefore).toHaveLength(3)

    deleteFund(fundId)

    const snapshot = getFundsSnapshot()
    /* baris celengan tetap tersimpan (bahan Undo) + riwayatnya utuh */
    expect(snapshot.funds.some((fund) => fund.id === fundId)).toBe(true)
    expect(contributionsOf(snapshot, fundId)).toEqual(historyBefore)
    /* yang berubah: dia tidak lagi dibaca layar mana pun */
    expect(fundById(snapshot, fundId)).toBeNull()
  })

  it('setoran ke celengan yang sudah dihapus ditolak (sheet basi tidak menulis uang)', () => {
    deleteFund(1)
    expect(contributeToFund(1, 100_000, 'bca')).toBeNull()
    expect(sweepIntoFund(1, 50_000)).toBeNull()
    expect(contributionsOf(getFundsSnapshot(), 1)).toHaveLength(4)
  })

  it('tombstone ikut tersimpan & dibaca ulang (refresh tidak menghidupkan celengan)', () => {
    const before = getFundsSnapshot()
    deleteFund(3)
    expect(getFundsSnapshot().removedIds).toEqual([3])

    /* hidrasi: state tersimpan memuat tombstone, memory punya daftarnya sendiri →
       penggabungan memakai gabungan keduanya, dan celengan itu tetap tidak hidup */
    const merged = mergeFundsState(
      { version: 1, funds: before.funds, contributions: before.contributions, removedIds: [3] },
      { ...getFundsSnapshot(), removedIds: [], hydrated: true },
    )
    expect(merged.removedIds).toEqual([3])
    expect(liveFunds(merged).map((fund) => fund.id)).toEqual([1, 2])
  })

  it('purgeFundsStore membuang tombstone sekaligus (purge saat Hapus Akun)', () => {
    deleteFund(1)
    const purged = purgeFundsStore()
    expect(purged.removedIds).toEqual([])
    expect(purged.funds).toEqual([])
    expect(liveFunds(getFundsSnapshot())).toEqual([])
  })
})
