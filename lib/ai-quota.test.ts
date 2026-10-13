import { describe, expect, it } from 'vitest'
import {
  AI_BASE_TOKENS_TOTAL,
  aiQuotaResetInfo,
  daysUntil,
  indonesianDateLabel,
  monthKeyOf,
  planQuota,
} from './ai-quota'

/* ── Test tanggal reset kuota AI (audit fintech Stage 2 #6 → paket 86) ────────
   Sebelumnya label tanggal ('1 Oktober 2026') dan sisa hari (4) adalah DUA
   konstanta MOCK terpisah yang dipatok ke string tetap — di produksi keduanya
   tidak pernah bergerak. Sekarang keduanya turunan dari SATU fungsi murni
   `aiQuotaResetInfo(now)`; test ini mengunci kontraknya dengan tanggal yang
   disuntik sendiri (tanpa menyentuh jam mesin). */

describe('tanggal reset kuota AI · tanggal NYATA (paket 86)', () => {
  it('label tanggal & sisa hari diturunkan dari satu sumber (27 Sep → 1 Okt)', () => {
    const info = aiQuotaResetInfo(new Date(2026, 8, 27))
    expect(info.iso).toBe('2026-10-01')
    expect(info.label).toBe(indonesianDateLabel(info.iso))
    expect(info.label).toBe('1 Oktober 2026')
    expect(info.daysUntil).toBe(4)
    expect(info.monthKey).toBe('2026-09')
  })

  it('akhir Desember melewati batas tahun dengan benar', () => {
    const info = aiQuotaResetInfo(new Date(2026, 11, 31))
    expect(info.iso).toBe('2027-01-01')
    expect(info.label).toBe('1 Januari 2027')
    expect(info.daysUntil).toBe(1)
    expect(info.monthKey).toBe('2026-12')
  })

  it('monthKeyOf menulis bulan dua digit (kunci baris ai_usage)', () => {
    expect(monthKeyOf(new Date(2026, 0, 5))).toBe('2026-01')
    expect(monthKeyOf(new Date(2026, 9, 1))).toBe('2026-10')
  })

  it('daysUntil membulatkan hari & menolak nilai negatif', () => {
    expect(daysUntil('2026-09-27', '2026-10-01')).toBe(4)
    expect(daysUntil('2026-09-30', '2026-10-01')).toBe(1)
    /* tanggal reset yang sudah lewat tidak boleh tampil sebagai sisa negatif */
    expect(daysUntil('2026-10-02', '2026-10-01')).toBe(0)
  })

  it('indonesianDateLabel menulis bulan Indonesia tanpa locale mesin', () => {
    expect(indonesianDateLabel('2026-01-05')).toBe('5 Januari 2026')
    expect(indonesianDateLabel('2026-12-31')).toBe('31 Desember 2026')
  })
})

/* ── KUOTA PER PAKET (paket 84/85) ─────────────────────────────────────────────
   Tiga paket, tiga perilaku: tanpa AI (tanpa tangki), berkuota (tangki dasar),
   tanpa batas (tidak dibatasi). `null` = belum pernah beli → tidak ada AI. */

describe('planQuota() — kuota mengikuti PAKET', () => {
  it('Paket Catet Aja: tanpa AI sama sekali', () => {
    expect(planQuota('catet-aja')).toEqual({ aiEnabled: false, unlimited: false, monthlyTokens: 0 })
  })

  it('Paket Waras: AI berkuota dasar bulanan (angka kanon)', () => {
    expect(planQuota('waras')).toEqual({
      aiEnabled: true,
      unlimited: false,
      monthlyTokens: AI_BASE_TOKENS_TOTAL,
    })
  })

  it('Paket Sultan: AI tanpa batas', () => {
    expect(planQuota('sultan')).toEqual({
      aiEnabled: true,
      unlimited: true,
      monthlyTokens: AI_BASE_TOKENS_TOTAL,
    })
  })

  it('belum pernah beli / tak dikenal → tidak ada AI', () => {
    for (const value of [null, undefined]) {
      expect(planQuota(value)).toEqual({ aiEnabled: false, unlimited: false, monthlyTokens: 0 })
    }
  })
})
