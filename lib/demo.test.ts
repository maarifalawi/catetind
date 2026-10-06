import { describe, expect, it, vi } from 'vitest'
import { DEMO_MODE, SHOWS_SAMPLE_DATA } from './demo'
import {
  DEMO_FORCE_MONTHLY_RECAP,
  DEMO_FORCE_WEEKLY_RECAP,
  DEMO_JOINED_CELEBRATION,
  DEMO_PARTNER_JOINED,
  DEMO_REALTIME_MOCK,
} from './data/joint'
import { DEMO_DAY_OVERRIDE, DEMO_THIN_DATA } from './data/monthly-review'

/* ── Test env-gate saklar demo (paket 42 · audit Stage 5 #5) ─────────────────
   Temuan auditnya: `DEMO_PARTNER_JOINED` / `DEMO_FORCE_WEEKLY_RECAP` /
   `DEMO_FORCE_MONTHLY_RECAP` = `true` KERAS. Kalau di-ship, SETIAP user melihat
   rekap bulanan setiap hari, rekap mingguan di hari Selasa, dan "transaksi baru
   dari partner" yang tidak pernah ia undang — di rilis pertama.

   Kontraknya sekarang satu pintu: `NEXT_PUBLIC_DEMO`.

     · dijalankan TANPA env  → semua saklar perilaku `false` (perilaku produksi)
     · dijalankan dengan `NEXT_PUBLIC_DEMO=1` → semua `true` (review desain)

   Test ini bisa dijalankan di dua mode itu, jadi bukan cuma membuktikan
   "sekarang false", tapi juga membuktikan SAKLARNYA benar-benar bisa dinyalakan
   lewat env — kalau tidak, kolom "review desain" di atas cuma klaim. */

describe('saklar demo · satu gerbang NEXT_PUBLIC_DEMO', () => {
  it('nilai saklar selalu mengikuti env, di kedua mode', () => {
    const expected = process.env.NEXT_PUBLIC_DEMO === '1'
    expect(DEMO_MODE).toBe(expected)

    /* perilaku yang dulu dipaksa tampil keras di produksi */
    expect(DEMO_PARTNER_JOINED).toBe(expected)
    expect(DEMO_FORCE_WEEKLY_RECAP).toBe(expected)
    expect(DEMO_FORCE_MONTHLY_RECAP).toBe(expected)
    expect(DEMO_REALTIME_MOCK).toBe(expected)

    /* jendela trigger recap bulanan: `null` = tanggal sistem apa adanya */
    expect(DEMO_DAY_OVERRIDE).toBe(expected ? 2 : null)

    /* dua saklar yang MEMANG selalu mati (dinyalakan manual saat ditinjau) */
    expect(DEMO_JOINED_CELEBRATION).toBe(false)
    expect(DEMO_THIN_DATA).toBe(false)
  })

  /* ── paket 64 · Paket D: gerbang seed data contoh ─────────────────────────
     `SHOWS_SAMPLE_DATA` adalah SATU pintu yang memutuskan apakah data contoh
     (dompet/kekayaan/celengan/tagihan/joint) boleh tampil sebagai isi awal.
     Sejak "data real, tanpa seed": gerbangnya HANYA menyala di TEST (banyak
     test mengunci angka seed) atau saat `NEXT_PUBLIC_DEMO=1` (versi demo yang
     ditinjau). `pnpm dev` & produksi tanpa env = KOSONG. Kalau gerbangnya
     salah, user pertama melihat data orang lain sebagai miliknya. */
  it('SHOWS_SAMPLE_DATA: produksi tanpa env = tanpa data contoh', async () => {
    vi.resetModules()
    vi.stubEnv('NODE_ENV', 'production')
    const prod = await import('./demo')
    expect(prod.SHOWS_SAMPLE_DATA).toBe(false)

    vi.resetModules()
    vi.stubEnv('NODE_ENV', 'test')
    const dev = await import('./demo')
    expect(dev.SHOWS_SAMPLE_DATA).toBe(true)

    /* kembalikan env supaya test lain tidak terpengaruh */
    vi.unstubAllEnvs()
    vi.resetModules()
    expect(SHOWS_SAMPLE_DATA).toBe(process.env.NODE_ENV !== 'production')
  })
})
