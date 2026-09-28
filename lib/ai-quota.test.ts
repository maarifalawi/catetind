import { describe, expect, it } from 'vitest'
import {
  AI_QUOTA_RESET_DATE,
  AI_QUOTA_RESET_DAYS,
  AI_QUOTA_RESET_ISO,
  AI_QUOTA_TODAY_ISO,
  daysUntil,
  indonesianDateLabel,
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
