import { afterEach, describe, expect, it, vi } from 'vitest'
import { dayOfMonth, localISODate, todayISO } from './time'
import { shiftISODate } from './data/history'

/* ── SATU "HARI INI" UNTUK SELURUH APP (paket 57) ────────────────────────────
   Yang diuji di sini bukan cuma format tanggal, tapi JANJI-nya: nilai yang
   dipakai sebagai jangkar UI harus (a) formatnya `YYYY-MM-DD`, (b) mengikuti jam
   perangkat, (c) tidak meleset di pergantian bulan/tahun/akhir bulan, dan
   (d) STABIL dalam satu render — pemanggil tidak boleh menerima dua nilai
   berbeda saat yang sama (itu yang bikin "hari ini" vs "kemarin" bertabrakan di
   daftar transaksi).

   `useTodayISO()` sendiri tidak diuji di sini: ia hook React, dan vitest repo ini
   berjalan di environment node tanpa DOM (lihat vitest.config.mts). Perilakunya
   diverifikasi lewat `pnpm build` + pola yang sudah dipakai halaman lain
   (`localISODate()` setelah mount). */

/** bikin Date di zona waktu LOKAL mesin test (bukan UTC) — sama dengan produksi */
function local(y: number, m: number, d: number, h = 12, min = 0) {
  return new Date(y, m - 1, d, h, min, 0, 0)
}

describe('lib/time · localISODate & todayISO', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  it('memformat tanggal lokal sebagai YYYY-MM-DD (nol di depan, bukan UTC)', () => {
    expect(localISODate(local(2026, 9, 5))).toBe('2026-09-05')
    expect(localISODate(local(2026, 12, 31, 23, 59))).toBe('2026-12-31')
    /* 1 Januari dini hari: tanggalnya TIDAK boleh bergeser jadi 31 Des (itu yang
       terjadi kalau UTC dipakai di mesin dengan zona +7) */
    expect(localISODate(local(2027, 1, 1, 0, 30))).toBe('2027-01-01')
  })

  it('todayISO() = tanggal hari ini menurut jam perangkat (bukan nilai yang dipatok)', () => {
    vi.useFakeTimers()
    vi.setSystemTime(local(2026, 9, 28, 10, 30))
    expect(todayISO()).toBe('2026-09-28')
    expect(todayISO()).toBe(localISODate())
  })

  it('nilainya stabil dalam satu render: dua panggilan = satu tanggal', () => {
    vi.useFakeTimers()
    vi.setSystemTime(local(2026, 9, 30, 23, 59))
    const first = todayISO()
    const second = todayISO()
    expect(second).toBe(first)
    expect(first).toBe('2026-09-30')
  })

  it('pergantian bulan: 30 Sep + 1 hari = 1 Okt (dan jangkar ikut)', () => {
    expect(shiftISODate('2026-09-30', 1)).toBe('2026-10-01')
    vi.useFakeTimers()
    /* 1 Oktober 2026 → jangkar perangkat sudah pindah bulan */
    vi.setSystemTime(local(2026, 10, 1, 8, 0))
    expect(todayISO()).toBe('2026-10-01')
    expect(todayISO().slice(0, 7)).toBe('2026-10')
  })

  it('bulan 31 hari: 31 Jan → 1 Feb (2026 bukan kabisat)', () => {
    expect(localISODate(local(2026, 1, 31))).toBe('2026-01-31')
    expect(shiftISODate('2026-01-31', 1)).toBe('2026-02-01')
    expect(shiftISODate('2026-01-31', -1)).toBe('2026-01-30')
    /* 28 Feb + 1 hari = 1 Mar */
    expect(shiftISODate('2026-02-28', 1)).toBe('2026-03-01')
  })

  it('pergantian tahun: 31 Des → 1 Jan tahun berikutnya', () => {
    expect(shiftISODate('2026-12-31', 1)).toBe('2027-01-01')
    expect(shiftISODate('2027-01-01', -1)).toBe('2026-12-31')
    vi.useFakeTimers()
    vi.setSystemTime(local(2026, 12, 31, 23, 59))
    expect(todayISO()).toBe('2026-12-31')
  })

  it('selalu ISO `YYYY-MM-DD` (bisa dibandingkan sebagai string)', () => {
    vi.useFakeTimers()
    vi.setSystemTime(local(2026, 3, 7, 6, 15))
    const iso = todayISO()
    expect(iso).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    /* perbandingan string = perbandingan tanggal (dipakai seluruh filter repo) */
    expect(iso >= '2026-03-01' && iso <= '2026-03-31').toBe(true)
  })

  it('dayOfMonth membaca tanggal dari ISO dan tidak pernah mengembalikan NaN', () => {
    expect(dayOfMonth('2026-09-28')).toBe(28)
    expect(dayOfMonth('2026-09-05')).toBe(5)
    /* tanggal rusak / kosong → fallback, bukan NaN yang menyebar ke status tagihan */
    expect(dayOfMonth('')).toBe(1)
    expect(dayOfMonth('2026-09-xx')).toBe(1)
    expect(dayOfMonth('', 25)).toBe(25)
  })
})
