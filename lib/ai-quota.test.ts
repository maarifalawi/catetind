import { describe, expect, it } from 'vitest'
import {
  AI_BASE_TOKENS_TOTAL,
  AI_QUOTA_RESET_DATE,
  AI_QUOTA_RESET_DAYS,
  AI_QUOTA_RESET_ISO,
  AI_QUOTA_TODAY_ISO,
  daysUntil,
  indonesianDateLabel,
  planQuota,
} from './ai-quota'

/* ── Test satu turunan tanggal reset kuota AI (audit fintech Stage 2 #6) ──────
   Sebelumnya label tanggal ('1 Oktober 2026') dan sisa hari (4) adalah DUA
   konstanta mock terpisah yang harus diubah bersamaan — satu lupa = kartu
   bahan bakar AI bilang "reset 4 hari lagi" padahal tanggalnya sudah lewat.
   Test ini mengunci kontraknya: dua nilai itu turunan dari satu tanggal kanon. */

describe('tanggal reset kuota AI · satu tanggal kanon', () => {
  it('label tanggal & sisa hari diturunkan dari tanggal yang sama', () => {
    expect(AI_QUOTA_RESET_ISO).toBe('2026-10-01')
    expect(AI_QUOTA_RESET_DATE).toBe(indonesianDateLabel(AI_QUOTA_RESET_ISO))
    expect(AI_QUOTA_RESET_DATE).toBe('1 Oktober 2026')
    expect(AI_QUOTA_RESET_DAYS).toBe(daysUntil(AI_QUOTA_TODAY_ISO, AI_QUOTA_RESET_ISO))
    expect(AI_QUOTA_RESET_DAYS).toBe(4)
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
