import type { MetadataRoute } from 'next'
import { SITE_ORIGIN } from '@/lib/site'

/**
 * robots.txt (PERBAIKAN AUDIT R3).
 *
 * Dua keputusan yang disengaja:
 *
 *   1. Halaman APP dilarang diindeks. Repo ini belum punya gerbang sesi di
 *      server (`middleware.ts` baru ditambahkan dan hanya aktif kalau Supabase
 *      dikonfigurasi), dan halaman seperti `/wallet` atau `/settings`
 *      menampilkan data keuangan — isinya tidak boleh masuk hasil pencarian.
 *   2. `/r/`, `/join/`, dan `/share/` dilarang karena isinya PER-USER (kode
 *      referral & kode undangan satu kali pakai). Halaman `/join/[code]` dan
 *      `/share/[id]` memang sudah `noindex` di metadata-nya; daftar ini
 *      menyamakan keduanya supaya tidak ada dua jawaban berbeda.
 *
 * `/install` & `/help` SENGAJA tidak dilarang: keduanya halaman publik yang
 * justru dicari orang, dan ada di `app/sitemap.ts`.
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
