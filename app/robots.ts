import type { MetadataRoute } from 'next'
import { SITE_ORIGIN } from '@/lib/site'

/**
 * robots.txt (PERBAIKAN AUDIT R3).
 *
 * Dua keputusan yang disengaja:
 *
 *   1. Halaman APP dilarang diindeks. Gerbang sesi (`middleware.ts`) memaksa
 *      login untuk `/app`, `/wallet`, `/settings`, `/help`, `/install`, dst.,
 *      dan halaman seperti `/wallet` menampilkan data keuangan — isinya tidak
 *      boleh masuk hasil pencarian.
 *   2. `/r/`, `/join/`, dan `/share/` dilarang karena isinya PER-USER (kode
 *      referral & kode undangan satu kali pakai). Halaman `/join/[code]` dan
 *      `/share/[id]` memang sudah `noindex` di metadata-nya; daftar ini
 *      menyamakan keduanya supaya tidak ada dua jawaban berbeda.
 *
 * `/bantuan` SENGAJA tidak dilarang: ia halaman PUBLIK (tanpa sidebar app)
 * dan ada di `app/sitemap.ts`. `/help` (Pusat Bantuan di dalam app) justru
 * masuk daftar larangan di bawah karena butuh login.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: [
          '/app',
          '/wallet',
          '/history',
          '/budget',
          '/bills',
          '/calendar',
          '/wealth',
          '/joint',
          '/referral',
          '/settings',
          '/help',
          '/install',
          '/registered',
          '/r/',
          '/join/',
          '/share/',
          '/api/',
        ],
      },
    ],
    sitemap: `${SITE_ORIGIN}/sitemap.xml`,
    host: SITE_ORIGIN,
  }
}
