import { describe, expect, it } from 'vitest'
import {
  DEFAULT_PAIN_RESULT_TAB,
  PAIN_CALCULATOR_COPY,
  PAIN_CALCULATOR_DEFAULTS,
  PAIN_RESULT_TABS,
  PAIN_ROAST,
  clampLeak,
  clampSalary,
  computeGaibResult,
  fiveYearEquivalent,
  investmentGainBadge,
  painPercentage,
  resultAmountForTab,
  resultCaptionForTab,
  roastFor,
  yearlyEquivalent,
} from './pain-calculator'

describe('PAIN_CALCULATOR_DEFAULTS', () => {
  it('memakai gaji awal 5jt, rentang 2jt–30jt, dan leak awal 1,5jt', () => {
    expect(PAIN_CALCULATOR_DEFAULTS.salary).toBe(5_000_000)
    expect(PAIN_CALCULATOR_DEFAULTS.salaryMin).toBe(2_000_000)
    expect(PAIN_CALCULATOR_DEFAULTS.salaryMax).toBe(30_000_000)
    expect(PAIN_CALCULATOR_DEFAULTS.defaultLeak).toBe(1_500_000)
  })
})

describe('clampSalary()', () => {
  it('menjepit slider ke rentang 2jt–30jt', () => {
    expect(clampSalary(1_000_000)).toBe(2_000_000)
    expect(clampSalary(99_000_000)).toBe(30_000_000)
    expect(clampSalary(5_250_000.4)).toBe(5_250_000)
  })

  it('nilai bukan angka → default Rp5.000.000', () => {
    expect(clampSalary(Number.NaN)).toBe(5_000_000)
    expect(clampSalary(Number.POSITIVE_INFINITY)).toBe(5_000_000)
  })
})

describe('clampLeak()', () => {
  it('menjepit kebocoran ke 0..30jt', () => {
    expect(clampLeak(-1)).toBe(0)
    expect(clampLeak(31_000_000)).toBe(30_000_000)
    expect(clampLeak(1_500_000.6)).toBe(1_500_001)
  })

  it('nilai bukan angka → 0', () => {
    expect(clampLeak(Number.NaN)).toBe(0)
  })
})

/* ── LIVE ROAST ─────────────────────────────────────────────────────────────
   Ambang brief: <15% aman, 15–30% waspada, >30% darurat. Persentase mentah
   dipakai (bukan yang sudah dibulatkan) supaya 14,6% tidak salah dianggap 15%. */
describe('roastFor()', () => {
  it('di bawah 15% → aman', () => {
    expect(roastFor(0).tone).toBe('safe')
    expect(roastFor(14.99).tone).toBe('safe')
    expect(roastFor(14.99).message).toBe('Masih aman, tapi jangan lengah!')
  })

  it('15% sampai 30% → waspada (batas atas inklusif)', () => {
    expect(roastFor(15).tone).toBe('warning')
    expect(roastFor(30).tone).toBe('warning')
    expect(roastFor(30).message).toBe('Bocor halus terdeteksi! Gaji lo mulai terancam.')
  })

  it('di atas 30% → darurat', () => {
    expect(roastFor(30.01).tone).toBe('danger')
    expect(roastFor(70).message).toBe(
      'DARURAT! Gaji lo cuma numpang lewat buat foya-foya gaib.',
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
   Default brief: gaji 5jt, leak 1,5jt (30%).
     1 tahun  = 18jt
     5 tahun  = 90jt
     investasi = FV annuity 5%/tahun, 60 bulan ≈ 102jt (> 90jt)
   Rumus investasi dihitung ulang di test (bukan memanggil helper yang sama)
   supaya kesalahan faktor bunga tidak lolos. */
describe('computeGaibResult()', () => {
  it('menghitung 1 tahun, 5 tahun, dan future value annuity', () => {
    const result = computeGaibResult(5_000_000, 1_500_000)
    const r = 0.05 / 12
    const n = 60
    const factor = ((1 + r) ** n - 1) / r

    expect(result.yearlyLoss).toBe(18_000_000)
    expect(result.fiveYearLoss).toBe(90_000_000)
    expect(result.investedValue).toBe(Math.round(1_500_000 * factor))
    expect(result.investedValue).toBeGreaterThan(100_000_000)
    expect(result.investmentGain).toBe(result.investedValue - 90_000_000)
    expect(result.percentageOfIncome).toBe(30)
  })

  it('leak 0 → semua output nol tanpa pecahan', () => {
    const result = computeGaibResult(5_000_000, 0)
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
   Badge harus berubah mengikuti skala, bukan menampilkan kalimat yang sama
   terus. Angka 18jt/tahun sengaja memberi "1 unit iPhone 16 baru" — contoh
   konkret dari brief. */
describe('yearlyEquivalent()', () => {
  it('18jt/tahun → setara 1 unit iPhone 16 baru', () => {
    expect(yearlyEquivalent(18_000_000)).toBe('Setara 1 unit iPhone 16 baru')
  })

  it('24jt/tahun → 2 unit iPhone', () => {
    expect(yearlyEquivalent(24_000_000)).toBe('Setara 2 unit iPhone 16 baru')
  })

  it('di bawah harga iPhone → dihitung dalam cup kopi kekinian', () => {
    expect(yearlyEquivalent(6_000_000)).toBe('Setara 600 cup kopi kekinian')
    expect(yearlyEquivalent(500_000)).toBe('Setara 50 cup kopi kekinian')
  })

  it('nol → copy zero-state, bukan "0 cup"', () => {
    expect(yearlyEquivalent(0)).toBe('Nol bocor. Pertahankan gaya hidup ini!')
  })
})

describe('fiveYearEquivalent()', () => {
  it('90jt → DP rumah pertama atau modal resepsi impian', () => {
    expect(fiveYearEquivalent(90_000_000)).toBe(
      'Setara DP rumah pertama atau modal resepsi impian',
    )
  })

  it('tangga padanan naik mengikuti nominal', () => {
    expect(fiveYearEquivalent(5_000_000)).toBe('Setara liburan keluarga 1 minggu')
    expect(fiveYearEquivalent(15_000_000)).toBe('Setara modal usaha kecil')
    expect(fiveYearEquivalent(30_000_000)).toBe('Setara DP mobil pertama')
    expect(fiveYearEquivalent(150_000_000)).toBe(
      'Setara DP rumah pertama atau modal usaha',
    )
    expect(fiveYearEquivalent(400_000_000)).toBe('Setara 1 unit rumah subsidi, cash')
  })

  it('nol → copy zero-state', () => {
    expect(fiveYearEquivalent(0)).toBe('Belum ada yang bocor. Jaga terus!')
  })
})

describe('investmentGainBadge()', () => {
  it('menampilkan keuntungan dalam Rupiah saat ada gain', () => {
    expect(investmentGainBadge(12_000_000)).toBe('+Rp 12.000.000 dari compounding')
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
  const result = computeGaibResult(5_000_000, 1_500_000)

  it('memetakan tiap tab ke nominal yang benar', () => {
    expect(resultAmountForTab('yearly', result)).toBe(result.yearlyLoss)
    expect(resultAmountForTab('fiveYear', result)).toBe(result.fiveYearLoss)
    expect(resultAmountForTab('invested', result)).toBe(result.investedValue)
  })
})

describe('resultCaptionForTab()', () => {
  const result = computeGaibResult(5_000_000, 1_500_000)

  it('1 tahun memakai padanan tahunan', () => {
    expect(resultCaptionForTab('yearly', result)).toBe(
      'Setara 1 unit iPhone 16 baru',
    )
  })

  it('5 tahun memakai padanan lima tahunan', () => {
    expect(resultCaptionForTab('fiveYear', result)).toBe(
      'Setara DP rumah pertama atau modal resepsi impian',
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
