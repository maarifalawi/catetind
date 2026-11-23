import { describe, expect, it } from 'vitest'
import {
  DEFAULT_PAIN_RESULT_TAB,
  PAIN_CALCULATOR_COPY,
  PAIN_CALCULATOR_DEFAULTS,
  PAIN_REFERENCE_PRICES,
  PAIN_RESULT_TABS,
  PAIN_ROAST,
  clampLeak,
  clampLeakSlider,
  computeGaibResult,
  fiveYearEquivalent,
  formatCompactIDR,
  formatLeakInput,
  formatLeakTyping,
  investmentGainBadge,
  investmentGainEquivalent,
  painPercentage,
  parseLeakInput,
  resultAmountForTab,
  resultCaptionForTab,
  roastFor,
  yearlyEquivalent,
} from './pain-calculator'

describe('PAIN_CALCULATOR_DEFAULTS', () => {
  it('slider uang gaib berhenti di 5jt, leak awal 1,5jt, manual sampai 100jt', () => {
    expect(PAIN_CALCULATOR_DEFAULTS.leakMin).toBe(0)
    expect(PAIN_CALCULATOR_DEFAULTS.leakMax).toBe(5_000_000)
    expect(PAIN_CALCULATOR_DEFAULTS.defaultLeak).toBe(1_500_000)
    expect(PAIN_CALCULATOR_DEFAULTS.leakManualMax).toBe(100_000_000)
  })

  it('tidak lagi menyimpan batas slider gaji (slider gaji sudah dihapus)', () => {
    expect(PAIN_CALCULATOR_DEFAULTS).not.toHaveProperty('salary')
    expect(PAIN_CALCULATOR_DEFAULTS).not.toHaveProperty('salaryMax')
    expect(PAIN_CALCULATOR_COPY).not.toHaveProperty('salaryLabel')
  })
})

/* ── HARGA ACUAN ────────────────────────────────────────────────────────────
   Nilai ini adalah kontrak dengan riset pasar 2024–2026. Kalau harga resmi
   berubah, ubah konstanta + test ini + caption yang menyebut nominalnya. */
describe('PAIN_REFERENCE_PRICES', () => {
  it('memakai harga resmi: kopi 20rb, iPhone 15jt, BeAT 18,5jt, PS5 9,5jt', () => {
    expect(PAIN_REFERENCE_PRICES.coffeeCup).toBe(20_000)
    expect(PAIN_REFERENCE_PRICES.iphone16).toBe(15_000_000)
    expect(PAIN_REFERENCE_PRICES.hondaBeat).toBe(18_500_000)
    expect(PAIN_REFERENCE_PRICES.ps5Slim).toBe(9_500_000)
    expect(PAIN_REFERENCE_PRICES.tokyoTicket).toBe(9_000_000)
  })

  it('memakai harga aset: Pro Max 25jt, LCGC 140jt, rumah subsidi 185jt, MPV 270jt', () => {
    expect(PAIN_REFERENCE_PRICES.iphone16ProMax).toBe(25_000_000)
    expect(PAIN_REFERENCE_PRICES.lcgcAyla).toBe(140_000_000)
    expect(PAIN_REFERENCE_PRICES.rumahSubsidi).toBe(185_000_000)
    expect(PAIN_REFERENCE_PRICES.avanzaXpander).toBe(270_000_000)
  })
})

describe('clampLeak()', () => {
  it('menerima nominal manual di atas batas slider (5jt)', () => {
    expect(clampLeak(8_000_000)).toBe(8_000_000)
    expect(clampLeak(99_000_000)).toBe(99_000_000)
  })

  it('menjepit ke 0..batas manual 100jt', () => {
    expect(clampLeak(-1)).toBe(0)
    expect(clampLeak(200_000_000)).toBe(100_000_000)
    expect(clampLeak(1_500_000.6)).toBe(1_500_001)
  })

  it('nilai bukan angka → 0', () => {
    expect(clampLeak(Number.NaN)).toBe(0)
  })
})

describe('clampLeakSlider()', () => {
  it('slider mentok di 5jt walau nominal manual lebih besar', () => {
    expect(clampLeakSlider(3_000_000)).toBe(3_000_000)
    expect(clampLeakSlider(5_000_000)).toBe(5_000_000)
    expect(clampLeakSlider(8_000_000)).toBe(5_000_000)
    expect(clampLeakSlider(-500)).toBe(0)
  })
})

describe('formatLeakInput()', () => {
  it('mengelompokkan ribuan dengan titik', () => {
    expect(formatLeakInput(1_500_000)).toBe('1.500.000')
    expect(formatLeakInput(5_000_000)).toBe('5.000.000')
    expect(formatLeakInput(250_000)).toBe('250.000')
    expect(formatLeakInput(123)).toBe('123')
    expect(formatLeakInput(0)).toBe('0')
  })
})

describe('formatLeakTyping()', () => {
  it('memberi titik ribuan SELAMA mengetik angka', () => {
    expect(formatLeakTyping('7')).toBe('7')
    expect(formatLeakTyping('750')).toBe('750')
    expect(formatLeakTyping('7500')).toBe('7.500')
    expect(formatLeakTyping('75000')).toBe('75.000')
    expect(formatLeakTyping('7500000')).toBe('7.500.000')
  })

  it('titik yang sudah ada dikelompokkan ulang, bukan diduplikasi', () => {
    expect(formatLeakTyping('7.500')).toBe('7.500')
    expect(formatLeakTyping('1.500000')).toBe('1.500.000')
    expect(formatLeakTyping('1.500.000')).toBe('1.500.000')
  })

  it('singkatan & desimal koma dibiarkan utuh supaya bisa diselesaikan', () => {
    expect(formatLeakTyping('2jt')).toBe('2jt')
    expect(formatLeakTyping('1,5jt')).toBe('1,5jt')
    expect(formatLeakTyping('50rb')).toBe('50rb')
  })

  it('kosong / hanya titik → kosong, bukan "0"', () => {
    expect(formatLeakTyping('')).toBe('')
    expect(formatLeakTyping('.')).toBe('')
  })
})

describe('parseLeakInput()', () => {
  it('membaca angka bertitik sebagai ribuan', () => {
    expect(parseLeakInput('1.500.000')).toBe(1_500_000)
    expect(parseLeakInput('5000000')).toBe(5_000_000)
    expect(parseLeakInput('8.750.000')).toBe(8_750_000)
  })

  it('menerjemahkan singkatan jt/rb/k', () => {
    expect(parseLeakInput('2jt')).toBe(2_000_000)
    expect(parseLeakInput('1,5jt')).toBe(1_500_000)
    expect(parseLeakInput('50rb')).toBe(50_000)
    expect(parseLeakInput('12k')).toBe(12_000)
  })

  it('tanpa angka → null supaya field kosong tidak memaksa Rp 0', () => {
    expect(parseLeakInput('')).toBeNull()
    expect(parseLeakInput('   ')).toBeNull()
    expect(parseLeakInput('abc')).toBeNull()
    expect(parseLeakInput('.')).toBeNull()
  })
})

describe('formatCompactIDR()', () => {
  it('meringkas rupiah untuk caption slider', () => {
    expect(formatCompactIDR(0)).toBe('Rp 0')
    expect(formatCompactIDR(500_000)).toBe('Rp 500 rb')
    expect(formatCompactIDR(1_500_000)).toBe('Rp 1,5 jt')
    expect(formatCompactIDR(5_000_000)).toBe('Rp 5 jt')
    expect(formatCompactIDR(2_000_000_000)).toBe('Rp 2 M')
  })
})

/* ── LIVE ROAST ─────────────────────────────────────────────────────────────
   Ambang brief: <15% aman, 15–30% waspada, >30% darurat. Persentase mentah
   dipakai (bukan yang sudah dibulatkan) supaya 14,6% tidak salah dianggap 15%. */
describe('roastFor()', () => {
  it('di bawah 15% → aman', () => {
    expect(roastFor(0).tone).toBe('safe')
    expect(roastFor(14.99).tone).toBe('safe')
    expect(roastFor(14.99).message).toBe('Masih aman. Pelan-pelan aja.')
  })

  it('15% sampai 30% → waspada (batas atas inklusif)', () => {
    expect(roastFor(15).tone).toBe('warning')
    expect(roastFor(30).tone).toBe('warning')
    expect(roastFor(30).message).toBe('Bocor halus terdeteksi. Gaji kamu mulai menipis.')
  })

  it('di atas 30% → darurat', () => {
    expect(roastFor(30.01).tone).toBe('danger')
    expect(roastFor(70).message).toBe(
      'Gaji kamu hampir habis buat jajan kecil. Masih bisa dirapikan, kok.',
    )
  })

  it('nilai negatif / NaN tidak pernah melahirkan roast darurat', () => {
    expect(roastFor(-10).tone).toBe('safe')
    expect(roastFor(Number.NaN).tone).toBe('safe')
  })

  it('setiap tier punya emoji dan pesan', () => {
    for (const roast of Object.values(PAIN_ROAST)) {
      expect(roast.emoji.length).toBeGreaterThan(0)
      expect(roast.message.length).toBeGreaterThan(10)
    }
  })
})

describe('painPercentage()', () => {
  it('menghitung persentase mentah terhadap gaji', () => {
    expect(painPercentage(5_000_000, 1_500_000)).toBe(30)
    expect(painPercentage(10_000_000, 750_000)).toBe(7.5)
  })

  it('gaji nol / angka negatif tidak menghasilkan Infinity', () => {
    expect(painPercentage(0, 1_500_000)).toBe(0)
    expect(painPercentage(5_000_000, -100)).toBe(0)
  })
})

/* ── TIGA ANGKA OUTPUT ──────────────────────────────────────────────────────
   Slider gaji sudah dihapus; yang diuji cukup kebocorannya. Nominal default
   1,5jt/bulan (persentase dihitung terhadap gaji acuan 5jt → 30%).
     1 tahun  = 18jt
     5 tahun  = 90jt
     investasi = FV annuity 5%/tahun, 60 bulan ≈ 102jt (> 90jt)
   Rumus investasi dihitung ulang di test (bukan memanggil helper yang sama)
   supaya kesalahan faktor bunga tidak lolos. */
describe('computeGaibResult()', () => {
  it('menghitung 1 tahun, 5 tahun, dan future value annuity', () => {
    const result = computeGaibResult(1_500_000)
    const r = 0.05 / 12
    const n = 60
    const factor = ((1 + r) ** n - 1) / r

    expect(result.yearlyLoss).toBe(18_000_000)
    expect(result.fiveYearLoss).toBe(90_000_000)
    /* faktor FV anuitas 5% p.a. / 60 bulan harus tetap 68,006 */
    expect(factor).toBeCloseTo(68.006, 3)
    expect(result.investedValue).toBe(Math.round(1_500_000 * factor))
    expect(result.investedValue).toBe(102_009_124)
    expect(result.investmentGain).toBe(result.investedValue - 90_000_000)
    expect(result.percentageOfIncome).toBe(30)
  })

  it('nominal manual di atas slider (10jt) tetap dihitung penuh', () => {
    const result = computeGaibResult(10_000_000)
    expect(result.yearlyLoss).toBe(120_000_000)
    expect(result.fiveYearLoss).toBe(600_000_000)
  })

  /* ── AUDIT ANGKA 6 MILIAR ────────────────────────────────────────────────
     5 tahun = bocor/bulan × 60. Tidak boleh ada perkalian ganda: slider 5jt
     WAJIB 300jt, dan 6 miliar hanya lahir dari input manual maksimum 100jt. */
  it('5 tahun = bocor bulanan × 60, bukan perkalian ganda', () => {
    const limaJuta = computeGaibResult(5_000_000)
    expect(limaJuta.yearlyLoss).toBe(60_000_000)
    expect(limaJuta.fiveYearLoss).toBe(300_000_000)
    expect(limaJuta.fiveYearLoss).toBe(limaJuta.yearlyLoss * 5)

    const seratusJuta = computeGaibResult(100_000_000)
    expect(seratusJuta.yearlyLoss).toBe(1_200_000_000)
    expect(seratusJuta.fiveYearLoss).toBe(6_000_000_000)
    expect(seratusJuta.fiveYearLoss).toBe(seratusJuta.yearlyLoss * 5)
    expect(seratusJuta.fiveYearLoss).not.toBe(300_000_000_000)
  })

  it('6 miliar hanya mungkin dari input manual maksimum 100jt/bulan', () => {
    expect(PAIN_CALCULATOR_DEFAULTS.leakManualMax).toBe(100_000_000)
    expect(clampLeak(150_000_000)).toBe(100_000_000)
    expect(computeGaibResult(clampLeak(150_000_000)).fiveYearLoss).toBe(6_000_000_000)
    expect(computeGaibResult(PAIN_CALCULATOR_DEFAULTS.leakMax).fiveYearLoss).toBe(
      300_000_000,
    )
  })

  it('leak 0 → semua output nol tanpa pecahan', () => {
    const result = computeGaibResult(0)
    expect(result).toEqual({
      yearlyLoss: 0,
      fiveYearLoss: 0,
      investedValue: 0,
      investmentGain: 0,
      percentageOfIncome: 0,
    })
  })
})

/* ── PADANAN DUNIA NYATA ────────────────────────────────────────────────────
   Ambang dan teks dikunci sesuai riset pasar 2024–2026. Batas tier diuji dari
   dua sisi (tepat di ambang & satu rupiah di bawahnya) supaya tidak "bocor". */
describe('yearlyEquivalent()', () => {
  it('di bawah 3jt → cup kopi susu gula aren (Rp 20 rb), minimal 1 cup', () => {
    expect(yearlyEquivalent(2_400_000)).toBe('Setara 120 cup kopi susu gula aren')
    expect(yearlyEquivalent(2_999_999)).toBe('Setara 149 cup kopi susu gula aren')
    expect(yearlyEquivalent(20_000)).toBe('Setara 1 cup kopi susu gula aren')
    expect(yearlyEquivalent(1)).toBe('Setara 1 cup kopi susu gula aren')
  })

  it('3jt–7,999jt → tiket konser festival VIP atau sneakers idaman', () => {
    const expected = 'Setara 1 tiket konser festival VIP atau 1 pasang sneakers idaman'
    expect(yearlyEquivalent(3_000_000)).toBe(expected)
    expect(yearlyEquivalent(7_999_999)).toBe(expected)
  })

  it('8jt–14,999jt → PS5 Slim baru atau tiket PP Jakarta–Tokyo', () => {
    const expected =
      'Setara 1 unit PlayStation 5 Slim baru atau tiket pesawat PP Jakarta–Tokyo'
    expect(yearlyEquivalent(8_000_000)).toBe(expected)
    expect(yearlyEquivalent(14_999_999)).toBe(expected)
  })

  it('15jt–29,999jt → iPhone 16 (pembagi Rp 15 jt) dan/atau BeAT cash', () => {
    expect(yearlyEquivalent(15_000_000)).toBe('Setara 1 unit iPhone 16 baru')
    expect(yearlyEquivalent(18_000_000)).toBe('Setara 1 unit iPhone 16 baru')
    expect(yearlyEquivalent(18_500_000)).toBe(
      'Setara 1 unit iPhone 16 baru atau 1 unit motor Honda BeAT baru cash',
    )
    expect(yearlyEquivalent(29_999_999)).toBe(
      'Setara 1 unit iPhone 16 baru atau 1 unit motor Honda BeAT baru cash',
    )
  })

  it('30jt ke atas → iPhone 16 Pro Max dan/atau BeAT, dihitung per unit', () => {
    expect(yearlyEquivalent(30_000_000)).toBe(
      'Setara 1 unit iPhone 16 Pro Max atau 1 unit motor Honda BeAT baru cash',
    )
    expect(yearlyEquivalent(50_000_000)).toBe(
      'Setara 2 unit iPhone 16 Pro Max atau 2 unit motor Honda BeAT baru cash',
    )
    expect(yearlyEquivalent(60_000_000)).toBe(
      'Setara 2 unit iPhone 16 Pro Max atau 3 unit motor Honda BeAT baru cash',
    )
  })

  it('nol → copy zero-state, bukan "0 cup"', () => {
    expect(yearlyEquivalent(0)).toBe('Nol bocor. Pertahankan gaya hidup ini!')
  })
})

describe('fiveYearEquivalent()', () => {
  it('di bawah 10jt → solo trip Bali atau Labuan Bajo', () => {
    expect(fiveYearEquivalent(9_999_999)).toBe(
      'Setara solo trip liburan impian ke Bali atau Labuan Bajo',
    )
  })

  it('10jt–24,999jt → BeAT cash atau liburan seminggu ke Jepang', () => {
    const expected =
      'Setara 1 unit motor Honda BeAT baru cash atau liburan seminggu ke Jepang'
    expect(fiveYearEquivalent(10_000_000)).toBe(expected)
    expect(fiveYearEquivalent(24_999_999)).toBe(expected)
  })

  it('25jt–49,999jt → DP mobil baru atau laptop kerja spek pro', () => {
    const expected = 'Setara uang muka (DP) mobil baru atau 1 laptop kerja spek pro impian'
    expect(fiveYearEquivalent(25_000_000)).toBe(expected)
    expect(fiveYearEquivalent(49_999_999)).toBe(expected)
  })

  it('50jt–99,999jt → DP + biaya KPR rumah komersial atau modal resepsi', () => {
    const expected =
      'Setara uang muka (DP) dan biaya KPR rumah komersial pertama atau modal resepsi pernikahan idaman'
    expect(fiveYearEquivalent(50_000_000)).toBe(expected)
    expect(fiveYearEquivalent(90_000_000)).toBe(expected)
    expect(fiveYearEquivalent(99_999_999)).toBe(expected)
  })

  it('100jt–179,999jt → mobil LCGC cash atau modal bisnis serius', () => {
    const expected =
      'Setara 1 unit mobil baru cash (Daihatsu Ayla) tanpa cicilan atau modal bisnis serius'
    expect(fiveYearEquivalent(100_000_000)).toBe(expected)
    expect(fiveYearEquivalent(179_999_999)).toBe(expected)
  })

  it('180jt–299,999jt → rumah subsidi Jabodetabek cash, nominal dari konstanta', () => {
    const expected =
      'Setara 1 unit rumah subsidi Jabodetabek cash (Rp 185 juta) bebas utang KPR'
    expect(fiveYearEquivalent(180_000_000)).toBe(expected)
    expect(fiveYearEquivalent(299_999_999)).toBe(expected)
    expect(expected).toContain(`${PAIN_REFERENCE_PRICES.rumahSubsidi / 1_000_000} juta`)
  })

  it('300jt–499,999jt → mobil keluarga baru cash', () => {
    const expected = 'Setara 1 unit mobil keluarga baru (Avanza atau Xpander) cash'
    expect(fiveYearEquivalent(300_000_000)).toBe(expected)
    expect(fiveYearEquivalent(499_999_999)).toBe(expected)
  })

  it('500jt–999,999jt → SUV gagah cash atau renovasi rumah total', () => {
    const expected =
      'Setara 1 unit SUV gagah (Pajero Sport atau Fortuner) cash atau renovasi rumah total'
    expect(fiveYearEquivalent(500_000_000)).toBe(expected)
    expect(fiveYearEquivalent(999_999_999)).toBe(expected)
  })

  it('1M–2,499M → mobil listrik mewah atau apartemen di pusat kota', () => {
    const expected =
      'Setara 1 unit mobil listrik mewah (Ioniq 6 atau Mercedes-Benz) atau 1 unit apartemen di pusat kota'
    expect(fiveYearEquivalent(1_000_000_000)).toBe(expected)
    expect(fiveYearEquivalent(2_499_999_999)).toBe(expected)
  })

  it('2,5M–4,999M → rumah mewah kawasan elit atau pensiun dini', () => {
    const expected =
      'Setara rumah mewah di kawasan mandiri elit atau modal pensiun dini seumur hidup'
    expect(fiveYearEquivalent(2_500_000_000)).toBe(expected)
    expect(fiveYearEquivalent(4_999_999_999)).toBe(expected)
  })

  it('5M–9,999M → villa mewah Bali atau mobil sport idaman', () => {
    const expected = 'Setara villa mewah pribadi di Bali atau 1 unit mobil sport idaman'
    expect(fiveYearEquivalent(5_000_000_000)).toBe(expected)
    /* 6 miliar = input manual maksimum 100jt/bulan × 60 bulan */
    expect(fiveYearEquivalent(6_000_000_000)).toBe(expected)
    expect(fiveYearEquivalent(9_999_999_999)).toBe(expected)
  })

  it('10M ke atas → kebebasan finansial total sekeluarga seumur hidup', () => {
    const expected = 'Setara kebebasan finansial total sekeluarga seumur hidup'
    expect(fiveYearEquivalent(10_000_000_000)).toBe(expected)
    expect(fiveYearEquivalent(50_000_000_000)).toBe(expected)
  })

  it('nol → copy zero-state', () => {
    expect(fiveYearEquivalent(0)).toBe('Belum ada yang bocor. Jaga terus!')
  })
})

describe('investmentGainEquivalent()', () => {
  it('memilih barang termahal yang benar-benar tercapai, tanpa melebih-lebihkan', () => {
    expect(investmentGainEquivalent(2_000_000)).toBe('100 cup kopi susu gula aren')
    expect(investmentGainEquivalent(3_000_000)).toBe(
      '1 tiket konser festival VIP atau 1 pasang sneakers idaman',
    )
    expect(investmentGainEquivalent(9_000_000)).toBe('1 tiket pesawat PP Jakarta–Tokyo')
    expect(investmentGainEquivalent(9_500_000)).toBe('1 unit PlayStation 5 Slim baru')
    expect(investmentGainEquivalent(14_999_999)).toBe('1 unit PlayStation 5 Slim baru')
    expect(investmentGainEquivalent(15_000_000)).toBe('1 unit iPhone 16 baru')
    expect(investmentGainEquivalent(30_000_000)).toBe('2 unit iPhone 16 baru')
    expect(investmentGainEquivalent(0)).toBe('')
  })
})

describe('investmentGainBadge()', () => {
  it('menampilkan keuntungan Rupiah + padanan nyata tanpa menyentuh modal', () => {
    expect(investmentGainBadge(12_009_124)).toBe(
      '+Rp 12.009.124 dari compounding · setara 1 unit PlayStation 5 Slim baru, tanpa menyentuh modal tabungan pokok',
    )
    expect(investmentGainBadge(15_000_000)).toBe(
      '+Rp 15.000.000 dari compounding · setara 1 unit iPhone 16 baru, tanpa menyentuh modal tabungan pokok',
    )
    expect(investmentGainBadge(2_000_000)).toBe(
      '+Rp 2.000.000 dari compounding · setara 100 cup kopi susu gula aren, tanpa menyentuh modal tabungan pokok',
    )
  })

  it('gain nol → copy asumsi, bukan "+Rp 0"', () => {
    expect(investmentGainBadge(0)).toBe('Bunga majemuk 5% p.a. · 60 bulan')
  })
})

/* ── TAB HASIL ──────────────────────────────────────────────────────────────
   Satu angka besar ditukar lewat tab. Label, default, nominal, dan caption
   diuji supaya tombol yang aktif tidak pernah menampilkan angka tab lain. */
describe('PAIN_RESULT_TABS', () => {
  it('menampilkan tiga rentang sesuai urutan desain', () => {
    expect(PAIN_RESULT_TABS.map((tab) => tab.label)).toEqual([
      '1 Tahun',
      '5 Tahun',
      'Diinvestasikan',
    ])
  })

  it('default jatuh ke 5 tahun dan id-nya ada di daftar', () => {
    expect(DEFAULT_PAIN_RESULT_TAB).toBe('fiveYear')
    expect(PAIN_RESULT_TABS.some((tab) => tab.id === DEFAULT_PAIN_RESULT_TAB)).toBe(true)
  })
})

describe('resultAmountForTab()', () => {
  const result = computeGaibResult(1_500_000)

  it('memetakan tiap tab ke nominal yang benar', () => {
    expect(resultAmountForTab('yearly', result)).toBe(result.yearlyLoss)
    expect(resultAmountForTab('fiveYear', result)).toBe(result.fiveYearLoss)
    expect(resultAmountForTab('invested', result)).toBe(result.investedValue)
  })
})

describe('resultCaptionForTab()', () => {
  const result = computeGaibResult(1_500_000)

  it('1 tahun memakai padanan tahunan', () => {
    expect(resultCaptionForTab('yearly', result)).toBe(
      'Setara 1 unit iPhone 16 baru',
    )
  })

  it('5 tahun memakai padanan lima tahunan', () => {
    expect(resultCaptionForTab('fiveYear', result)).toBe(
      'Setara uang muka (DP) dan biaya KPR rumah komersial pertama atau modal resepsi pernikahan idaman',
    )
  })

  it('diinvestasikan memakai catatan asumsi, bukan padanan belanja', () => {
    expect(resultCaptionForTab('invested', result)).toBe(
      PAIN_CALCULATOR_COPY.results.investedNote,
    )
    expect(PAIN_CALCULATOR_COPY.results.investedNote).toContain('5%')
  })

  it('copy CTA mengikuti referensi desain', () => {
    expect(PAIN_CALCULATOR_COPY.cta).toBe('Mulai Catat Sekarang')
  })
})
