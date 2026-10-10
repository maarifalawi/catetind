import { describe, expect, it } from 'vitest'
import {
  BUDGET_PAGE_COPY,
  DAILY_HUD,
  HUD_METER_SEGMENTS,
  INITIAL_SINKING_FUNDS,
  PACING_STATUS_LABEL,
  applyBudgetSave,
  computeDailyHud,
  earnedInWindow,
  hasIncomeInWindow,
  hudMeter,
  hudStatusFor,
  pacingOf,
  pacingStatusLabel,
  periodIncome,
  periodUsagePct,
  periodWindow,
  periodWindowForTab,
  removeBudget,
  restoreBudget,
  scopeCaptionFor,
  sinkingObligationOf,
  spentInWindow,
  spentOn,
  type BudgetItem,
  type PeriodWindow,
} from './budget'
import type { HistoryTransaction } from './history'

/* ── JATAH HARIAN = TURUNAN NYATA (paket 57 · audit AKAR D) ──────────────────
   Sebelum paket 57 kartu "Jatah Hari Ini" memakai default konstanta
   (`MONTHLY_INCOME` 7.500.000, `TOTAL_INSTALLMENTS` 800.000, `SPENT_THIS_MONTH`
   2.300.000) sebagai PEMASUKAN USER, dan cabang bulan kalender MENGABAIKAN
   argumen `spent` yang dikirim halaman — jadi pengeluaran yang baru dicatat tidak
   pernah menurunkan jatah.

   Test ini mengunci dua hal yang menentukan kejujuran angka itu:
     1. rumusnya benar-benar turunan (income/cicilan/pengeluaran menggerakkannya);
     2. uang keluar datang dari baris LEDGER (bukan dari konstanta seed), lengkap
        dengan definisi app-wide `summarizeTransactions` (setoran tabungan ikut
        keluar, transfer netral).

   Angka memakai jendela bulan kalender 28 Sep 2026 (penanggalan kalender, bukan
   patokan 27/30) supaya "sisa 3 hari" juga ikut teruji. */

const windowSeptember: PeriodWindow = periodWindow('monthly', '2026-09-28')

/** jatah harian dengan pemasukan & cicilan tertentu, `spent` dari ledger */
function hudWith({
  monthlyIncome,
  totalInstallments,
  spent = 0,
  spentToday = 0,
}: {
  monthlyIncome: number
  totalInstallments: number
  spent?: number
  spentToday?: number
}) {
  return computeDailyHud({
    monthlyIncome,
    totalInstallments,
    sinkingFunds: INITIAL_SINKING_FUNDS,
    spent,
    spentToday,
    window: windowSeptember,
  })
}

describe('computeDailyHud · turunan dari pemasukan, cicilan, dan uang keluar', () => {
  it('income naik 7,5jt -> 9jt: jatah harian NAIK', () => {
    const before = hudWith({ monthlyIncome: 7_500_000, totalInstallments: 800_000 })
    const after = hudWith({ monthlyIncome: 9_000_000, totalInstallments: 800_000 })

    /* 28 Sep 2026 = hari ke-28 dari 30 -> sisa 3 hari (termasuk hari ini) */
    expect(before.daysLeft).toBe(3)
    expect(before.availablePool).toBe(
      7_500_000 - 800_000 - sinkingObligationOf(INITIAL_SINKING_FUNDS),
    )
    expect(before.dailyBudget).toBe(1_033_333) // 3.100.000 / 3
    expect(after.dailyBudget).toBeGreaterThan(before.dailyBudget)
    expect(after.dailyBudget).toBe(1_533_333) // 4.600.000 / 3
  })

  it('cicilan naik 800rb -> 1,07jt (angka nyata store kekayaan): jatah harian TURUN', () => {
    const before = hudWith({ monthlyIncome: 7_500_000, totalInstallments: 800_000 })
    const after = hudWith({ monthlyIncome: 7_500_000, totalInstallments: 1_070_000 })

    expect(after.dailyBudget).toBeLessThan(before.dailyBudget)
    expect(after.dailyBudget).toBe(943_333) // 2.830.000 / 3
  })

  it('keduanya 0 tapi celengan butuh 3,6jt: jatah 0 (ditahan), tanpa angka minus', () => {
    const hud = hudWith({ monthlyIncome: 0, totalInstallments: 0 })
    expect(hud.availablePool).toBeLessThan(0)
    expect(hud.shortfall).toBe(true)
    expect(hud.dailyBudget).toBe(0)
  })

  it('income 0 & tanpa kewajiban: jatah 0 tanpa menyebut "ditahan"', () => {
    const hud = computeDailyHud({
      monthlyIncome: 0,
      totalInstallments: 0,
      spent: 0,
      window: windowSeptember,
    })
    expect(hud.shortfall).toBe(false)
    expect(hud.dailyBudget).toBe(0)
  })

  it('setiap Rp 50.000 pengeluaran ledger MENURUNKAN jatah harian (AC wajib paket 57)', () => {
    const before = hudWith({ monthlyIncome: 7_500_000, totalInstallments: 800_000, spent: 0 })
    const after = hudWith({ monthlyIncome: 7_500_000, totalInstallments: 800_000, spent: 50_000 })

    expect(after.remaining).toBe(before.remaining - 50_000)
    expect(after.dailyBudget).toBeLessThan(before.dailyBudget)
    expect(before.dailyBudget).toBe(1_033_333)
    expect(after.dailyBudget).toBe(1_016_666) // 3.050.000 / 3
  })

  it('Home (kartu bulan) & /budget tab Bulanan memakai jendela & argumen yang SAMA', () => {
    /* Home memakai periodWindowForTab('monthly', todayIso); /budget memakai
       periodWindowForTab(periodTab, todayIso) — untuk tab Bulanan keduanya
       identik, termasuk dayIndex/daysInPeriod. */
    expect(periodWindowForTab('monthly', '2026-09-28')).toEqual(
      periodWindow('monthly', '2026-09-28'),
    )
    const home = computeDailyHud({
      monthlyIncome: 7_500_000,
      totalInstallments: 800_000,
      sinkingFunds: INITIAL_SINKING_FUNDS,
      spent: 50_000,
      window: periodWindowForTab('monthly', '2026-09-28'),
    })
    expect(home.dailyBudget).toBe(
      hudWith({ monthlyIncome: 7_500_000, totalInstallments: 800_000, spent: 50_000 }).dailyBudget,
    )
    expect(home.daysLeft).toBe(3)
  })
})

/* ── "SISA JATAH HARI INI" (paket 66) ────────────────────────────────────────
   Kartu Home dulu menampilkan `dailyBudget` = rata-rata sisa periode ÷ hari
   tersisa. Akibatnya mencatat Rp 600.000 dengan sisa 3 hari cuma menurunkan
   angkanya Rp 200.000 (didilusi jumlah hari) — pemilik produk melaporkannya
   sebagai "jatah hari ini nggak sync / masih seed data".

   Turunan baru menjawab pertanyaan yang benar-benar dibaca di kartu ("hari ini
   aku masih boleh pakai berapa?") TANPA menghapus rumus lama: `dailyBudget`
   tetap ada (dipakai /budget + test sebelumnya), sedangkan `remainingToday`
   turun PENUH sebesar pengeluaran hari ini. */
describe('computeDailyHud · turunan "sisa jatah hari ini" (paket 66)', () => {
  it('tanpa `spentToday`, turunan hari-ini = `dailyBudget` (pemanggil lama utuh)', () => {
    const hud = hudWith({ monthlyIncome: 7_500_000, totalInstallments: 800_000, spent: 50_000 })
    expect(hud.remainingToday).toBe(hud.dailyBudget)
    expect(hud.todayAllowance).toBe(hud.dailyBudget)
    expect(hud.todayUsedPct).toBe(0)
  })

  it('Rp 600.000 hari ini menurunkan angka utama PENUH (bukan didilusi 3 hari)', () => {
    const before = hudWith({ monthlyIncome: 7_500_000, totalInstallments: 800_000 })
    /* 3.1jt / 3 hari */
    expect(before.todayAllowance).toBe(1_033_333)
    expect(before.remainingToday).toBe(1_033_333)

    const after = hudWith({
      monthlyIncome: 7_500_000,
      totalInstallments: 800_000,
      spent: 600_000,
      spentToday: 600_000,
    })
    /* rumus LAMA (rata-rata periode) cuma turun 200rb — itu keluhan aslinya */
    expect(after.dailyBudget).toBe(833_333)
    /* turunan baru turun penuh 600rb */
    expect(after.remainingToday).toBe(433_333)
    expect(after.todayAllowance).toBe(1_033_333)
  })

  it('bar "terpakai" mengukur JATAH HARI INI, bukan kolam periode', () => {
    const half = hudWith({
      monthlyIncome: 7_500_000,
      totalInstallments: 800_000,
      spent: 516_666,
      spentToday: 516_666,
    })
    /* 516.666 / 1.033.333 ≈ 0,5 — di rumus kolam periode angkanya cuma ~17%
       (516rb dari kolam 3,1jt), jadi pengeluarannya terasa "tidak bergerak" */
    expect(half.todayUsedPct).toBeGreaterThan(0.49)
    expect(half.todayUsedPct).toBeLessThan(0.51)
  })

  it('pengeluaran hari ini MELEBIHI jatah hari ini → 0 (bukan angka minus) & bar penuh', () => {
    const over = hudWith({
      monthlyIncome: 7_500_000,
      totalInstallments: 800_000,
      spent: 2_000_000,
      spentToday: 2_000_000,
    })
    expect(over.remainingToday).toBe(0)
    expect(over.todayUsedPct).toBe(1)
  })

  it('`spentToday` dijaga tidak melebihi `spent` (pengirim boleh kirim salah satu)', () => {
    const clamped = hudWith({
      monthlyIncome: 7_500_000,
      totalInstallments: 800_000,
      spent: 100_000,
      spentToday: 999_000,
    })
    expect(clamped.spentToday).toBe(100_000)
  })

  it('tanpa uang sama sekali: 0 & 0 (tanpa NaN), bukan pembagian nol', () => {
    const zero = computeDailyHud({
      monthlyIncome: 0,
      totalInstallments: 0,
      sinkingFunds: [],
      spent: 0,
      spentToday: 0,
      window: windowSeptember,
    })
    expect(zero.todayAllowance).toBe(0)
    expect(zero.remainingToday).toBe(0)
    expect(zero.todayUsedPct).toBe(0)
  })
})

describe('uang NYATA dari ledger di dalam jendela', () => {
  /** baris seperti yang lahir dari store uang (`toHistoryTransaction`) */
  const row = (
    date: string,
    amount: number,
    type: HistoryTransaction['type'],
  ): HistoryTransaction => ({
    id: Math.round(amount),
    name: 'Catatan',
    amount,
    type,
    category: 'Makanan',
    wallet: 'BCA',
    date,
    time: '12:00',
    aiGenerated: false,
  })

  const ledger: HistoryTransaction[] = [
    row('2026-09-28', 50_000, 'expense'), // hari ini — di dalam jendela
    row('2026-09-27', 25_000, 'expense'), // kemarin — di dalam jendela
    row('2026-09-26', 500_000, 'saving'), // setoran tabungan = uang keluar
    row('2026-09-26', 200_000, 'transfer'), // pindah dana = netral
    row('2026-09-25', 7_500_000, 'income'), // pemasukan nyata di jendela
    row('2026-08-31', 999_000, 'expense'), // di luar jendela — tidak dihitung
  ]

  it('spentInWindow memakai definisi app-wide (tabungan ikut keluar, transfer netral)', () => {
    expect(spentInWindow(ledger, windowSeptember)).toBe(50_000 + 25_000 + 500_000)
    expect(spentOn(ledger, '2026-09-28')).toBe(50_000)
    /* tanggalnya nyata, tapi di luar jendela -> tidak pernah ikut jatah periode ini */
    expect(spentOn(ledger, '2026-08-31')).toBe(999_000)
  })

  it('earnedInWindow hanya menghitung pemasukan di dalam jendela', () => {
    expect(earnedInWindow(ledger, windowSeptember)).toBe(7_500_000)
  })

  it('dry spell ikut KONFIGURASI user, bukan konstanta seed', () => {
    const empty: HistoryTransaction[] = []
    /* belum diatur: configured=false & hasIncome=false -> kartu CTA "atur pemasukan" */
    const notConfigured = periodIncome(windowSeptember, empty, 0)
    expect(notConfigured.configured).toBe(false)
    expect(notConfigured.hasIncome).toBe(false)
    expect(hasIncomeInWindow(windowSeptember, empty, 0)).toBe(false)

    /* sudah diatur: jendela bulan ini punya pemasukan sejak hari pertama */
    const configured = periodIncome(windowSeptember, empty, 9_000_000)
    expect(configured.configured).toBe(true)
    expect(configured.hasIncome).toBe(true)
    expect(configured.midPeriod).toBe(false)
    expect(configured.amount).toBe(9_000_000)

    /* catatan nyata di ledger tetap dibaca (tanggal terakhir yang masuk) */
    const logged = periodIncome(windowSeptember, ledger, 0)
    expect(logged.hasIncome).toBe(true)
    expect(logged.latestDateISO).toBe('2026-09-25')
  })

  it('jendela NON-bulanan memakai pemasukan nyata jendela itu (angka bulanan tidak disebar)', () => {
    const week = periodWindow('weekly', '2026-09-28')
    const income = periodIncome(week, ledger, 9_000_000)
    /* 9jt adalah angka BULANAN: ia tidak boleh muncul sebagai pemasukan minggu */
    expect(income.amount).toBe(0)
    expect(income.hasIncome).toBe(false)
    expect(income.configured).toBe(true)
  })
})

describe('kanon demo `DAILY_HUD` tidak bergeser (CONTEXT-WAJIB §10.1)', () => {
  it('konstanta kanon masih 800.000 sisa / 200.000 per hari / 4 hari', () => {
    /* dihitung dengan jangkar seed (27 Sep, 30 hari) — angka patokan demo, dan
       sejak paket 57 TIDAK dipakai layar; yang dipakai konfigurasi user. */
    expect(DAILY_HUD.remaining).toBe(800_000)
    expect(DAILY_HUD.daysLeft).toBe(4)
    expect(DAILY_HUD.dailyBudget).toBe(200_000)
  })
})

/* ── HAPUS BUDGET KATEGORI = BISA DIBATALKAN (paket 60 · 60.1) ───────────────
   Yang diuji bukan "tombolnya ada", melainkan janji yang diucapkan dialog hapus:
     · baris yang dicabut benar-benar hilang, dan baris lain TIDAK tersentuh;
     · Undo memulihkan baris ke POSISI & nilai aslinya (bukan menempel di bawah);
     · id yang sudah dipensiunkan tidak dipakai ulang oleh budget berikutnya;
     · Jatah Harian TIDAK berubah — limit budget bukan input `computeDailyHud()`.
   Semuanya fungsi murni yang dipanggil halaman, jadi tidak ada rumus salinan di
   komponen yang bisa berbeda dari yang diuji di sini. */

describe('removeBudget / restoreBudget — hapus budget yang bisa dibatalkan (60.1)', () => {
  const daftar: BudgetItem[] = [
    { id: 11, category: 'Makanan', icon: '🍜', limit: 1_500_000, spent: 1_180_000, period: 'monthly', scope: 'keluarga' },
    { id: 12, category: 'Transportasi', icon: '🚗', limit: 500_000, spent: 320_000, period: 'monthly', scope: 'pribadi' },
    { id: 13, category: 'Kopi', icon: '☕', limit: 300_000, spent: 285_000, period: 'monthly', scope: 'pribadi' },
    { id: 14, category: 'Belanja', icon: '🛍️', limit: 250_000, spent: 180_000, period: 'weekly', scope: 'pribadi' },
  ]

  it('id yang ada: barisnya tercabut dan yang lain tidak tersentuh', () => {
    const result = removeBudget(daftar, 13)

    expect(result.removed).not.toBeNull()
    expect(result.removed?.index).toBe(2)
    expect(result.removed?.item).toEqual(daftar[2])
    expect(result.budgets.map((budget) => budget.id)).toEqual([11, 12, 14])
    /* scope & periode lain tidak ikut tersaring (baris 14 mingguan, 11 keluarga) */
    expect(result.budgets.find((budget) => budget.id === 14)).toEqual(daftar[3])
    expect(result.budgets.find((budget) => budget.id === 11)).toEqual(daftar[0])
  })

  it('id yang TIDAK ada: tidak mengubah apa pun (bukan menghapus yang lain)', () => {
    const result = removeBudget(daftar, 999)

    expect(result.removed).toBeNull()
    /* identitas daftarnya pun sama — pemanggil boleh memakai hasilnya mentah-mentah */
    expect(result.budgets).toBe(daftar)
    expect(result.budgets).toHaveLength(daftar.length)
  })

  it('urutan baris yang tersisa tetap urutan aslinya', () => {
    const result = removeBudget(daftar, 11)
    expect(result.budgets.map((budget) => budget.category)).toEqual([
      'Transportasi',
      'Kopi',
      'Belanja',
    ])
  })

  it('Undo memulihkan nilai & POSISI aslinya, dan aman kalau ditekan dua kali', () => {
    const result = removeBudget(daftar, 12)
    const removal = result.removed!
    const restored = restoreBudget(result.budgets, removal)

    /* sama persis dengan daftar sebelum dihapus — termasuk spent & periodenya */
    expect(restored).toEqual(daftar)
    expect(restored[1].spent).toBe(320_000)
    /* tombol Undo yang tertekan dua kali tidak menggandakan baris */
    expect(restoreBudget(restored, removal)).toEqual(daftar)
  })

  it('id yang sudah dipensiunkan tidak dipakai ulang oleh budget berikutnya', () => {
    const result = removeBudget(daftar, 14)
    /* tanpa `takenIds`, id 14 akan lahir kembali untuk kategori baru: Undo yang
       masih hidup bisa memulihkan baris lama ke id yang sekarang milik orang lain */
    const tanpaPensiun = applyBudgetSave(result.budgets, {
      category: 'Hiburan',
      icon: '🎮',
      limit: 400_000,
      period: 'monthly',
      scope: 'pribadi',
    })
    expect(tanpaPensiun.id).toBe(14)

    const denganPensiun = applyBudgetSave(
      result.budgets,
      { category: 'Hiburan', icon: '🎮', limit: 400_000, period: 'monthly', scope: 'pribadi' },
      [14],
    )
    expect(denganPensiun.id).toBe(15)
    expect(denganPensiun.mode).toBe('create')
  })

  it('Jatah Harian TIDAK berubah setelah budget dihapus (limit bukan input HUD)', () => {
    /* `computeDailyHud()` hanya membaca pemasukan, cicilan, celengan, dan uang
       keluar ledger. Limit budget TIDAK ada di daftar itu — inilah bukti angka
       untuk kalimat "Saldo & Jatah Harian TIDAK berubah" di dialog hapus. */
    const sebelum = hudWith({ monthlyIncome: 7_500_000, totalInstallments: 800_000, spent: 50_000 })
    const dihapus = removeBudget(daftar, 11)
    /* limit + spent kategori yang dicabut: 1.500.000 / 1.180.000 — dua-duanya TIDAK
       masuk rumus, jadi tidak ada satu argumen pun yang berubah */
    expect(dihapus.budgets.some((budget) => budget.id === 11)).toBe(false)
    const sesudah = hudWith({ monthlyIncome: 7_500_000, totalInstallments: 800_000, spent: 50_000 })

    expect(sesudah).toEqual(sebelum)
    expect(sesudah.dailyBudget).toBe(sebelum.dailyBudget)
  })
})

/* ── "TERPAKAI" = PEMAKAIAN KOLAM PERIODE (audit Daily Budget Â· Symptom A) ──
   Bar kartu Jatah Hari Ini dulu `spentToday / hud.dailyBudget`, padahal
   `dailyBudget = remaining / daysLeft` dan `remaining` SUDAH dikurangi
   pengeluaran (termasuk hari ini) — pembilang ikut mengurangi penyebutnya
   sendiri, sehingga persentasenya melompat (mis. 88% di awal siklus padahal
   ruang periode masih penuh).

   `periodUsagePct(availablePool, spent)` sekarang mengukur bagian kolam periode
   yang benar-benar sudah terpakai: siklus baru (spent 0) = 0%, kolam habis =
   100%, dan tidak pernah keluar dari 0..1. */
describe('periodUsagePct · pemakaian kolam periode (audit Daily Budget)', () => {
  it('siklus baru (belum ada pengeluaran) = 0%, bukan persen yang melompat', () => {
    expect(periodUsagePct(3_100_000, 0)).toBe(0)
  })

  it('proporsional terhadap kolam: 1/10 terpakai = 10%', () => {
    expect(periodUsagePct(1_000_000, 100_000)).toBeCloseTo(0.1)
  })

  it('dijaga di 0..1 walau pengeluaran melebihi kolam', () => {
    expect(periodUsagePct(1_000_000, 2_500_000)).toBe(1)
    expect(periodUsagePct(1_000_000, -50_000)).toBe(0)
  })

  it('kolam 0 / shortfall = 0 (tidak ada yang bisa di-pace)', () => {
    expect(periodUsagePct(0, 500_000)).toBe(0)
    expect(periodUsagePct(-1, 500_000)).toBe(0)
  })
})

/* ── METER JATAH HARIAN (paket 76) ───────────────────────────────────────────
   Bar SEGMEN h-2 kartu "Jatah Hari Ini" (Dashboard `daily-hud-card` & /budget
   `daily-hud-summary`) digambar dari SATU fungsi murni. Test ini mengunci dua
   hal: (1) tiga status warna kanon PRD 2B.2 pada ambang yang benar, (2) jumlah
   segmen selalu jujur — 0 hanya saat benar-benar belum ada pemakaian, dan
   minimal 1 begitu ada (visual yang bohong = angka yang bohong). */
describe('hudStatusFor · ambang tiga status kanon (paket 76)', () => {
  it('di bawah 75% = onTrack, 75–99% = approaching, ≥100% = over', () => {
    expect(hudStatusFor(0)).toBe('onTrack')
    expect(hudStatusFor(0.749)).toBe('onTrack')
    expect(hudStatusFor(0.75)).toBe('approaching')
    expect(hudStatusFor(0.999)).toBe('approaching')
    expect(hudStatusFor(1)).toBe('over')
    expect(hudStatusFor(1.4)).toBe('over')
  })
})

describe('hudMeter · jumlah segmen jujur (paket 76)', () => {
  it('belum ada pemakaian → 0 dari segmen kanon', () => {
    const model = hudMeter(0)
    expect(model.filled).toBe(0)
    expect(model.total).toBe(HUD_METER_SEGMENTS)
    expect(model.status).toBe('onTrack')
  })

  it('pemakaian sekecil apa pun tetap 1 segmen (visual tak boleh bohong)', () => {
    expect(hudMeter(0.01).filled).toBe(1)
  })

  it('separuh jatah → separuh segmen', () => {
    expect(hudMeter(0.5).filled).toBe(Math.round(0.5 * HUD_METER_SEGMENTS))
  })

  it('lewat jatah (pct ≥ 1) → penuh & status over; nilai dijepit 0..1', () => {
    const over = hudMeter(1.8)
    expect(over.filled).toBe(HUD_METER_SEGMENTS)
    expect(over.usedPct).toBe(1)
    expect(over.status).toBe('over')
  })

  it('jumlah segmen bisa diatur & nilai non-finite dianggap 0', () => {
    expect(hudMeter(0.5, 4).filled).toBe(2)
    expect(hudMeter(Number.NaN).filled).toBe(0)
  })
})

/* ── PAKET 78 · COPY HALAMAN BUDGET = DATA, BUKAN JSX ────────────────────────
   Dua hal yang diperiksa di sini adalah dua hal yang paling gampang rusak
   diam-diam saat halaman dirapikan ulang:

     1. caption konteks `pribadi` HARUS null. Kalau kelak ada yang mengembalikan
        stringnya (atau menggantinya dengan string kosong), barisnya muncul lagi
        di layar — dan itu persis yang diminta dihapus pemilik produk;
     2. status pacing kartu kategori harus SATU kata-frasa dari peta kanon.
        `pacingOf().copy` tetap ada untuk panel review, tapi kartu tidak boleh
        memakai kalimat yang mengulang angka (paket 78: "rely on progress bars,
        clean typography, and whitespace"). */
describe('scopeCaptionFor · caption konteks halaman Budget (paket 78)', () => {
  it('pribadi TIDAK punya caption (barisnya juga tidak dirender)', () => {
    expect(scopeCaptionFor('pribadi')).toBeNull()
  })

  it('keluarga & bersama memakai kalimat dari lapis data', () => {
    expect(scopeCaptionFor('keluarga')).toBe(BUDGET_PAGE_COPY.scopeCaption.keluarga)
    expect(scopeCaptionFor('bersama')).toBe(BUDGET_PAGE_COPY.scopeCaption.bersama)
  })

  it('caption bukan string kosong — "tidak ada" harus berarti null', () => {
    expect(scopeCaptionFor('pribadi')).not.toBe('')
  })
})

describe('pacingStatusLabel · status tiga kata pengganti kalimat (paket 78)', () => {
  it('setiap nada kanon punya satu label pendek', () => {
    expect(pacingStatusLabel('sage')).toBe(PACING_STATUS_LABEL.sage)
    expect(pacingStatusLabel('amber')).toBe(PACING_STATUS_LABEL.amber)
    expect(pacingStatusLabel('terracotta')).toBe(PACING_STATUS_LABEL.terracotta)
  })

  it('labelnya pendek (≤ 3 kata) — bukan kalimat yang mengulang nominal', () => {
    for (const tone of ['sage', 'amber', 'terracotta'] as const) {
      const label = pacingStatusLabel(tone)
      expect(label.split(' ').length).toBeLessThanOrEqual(3)
      expect(label).not.toMatch(/Rp\s/)
    }
  })

  it('nada mengikuti ambang kanon yang sama dengan warna bar', () => {
    const budget: BudgetItem = {
      id: 1,
      category: 'Kopi',
      icon: '☕',
      limit: 100_000,
      spent: 99_000,
      period: 'monthly',
      scope: 'pribadi',
    }
    expect(pacingStatusLabel(pacingOf(budget).tone)).toBe('Mendekati limit')
  })
})

