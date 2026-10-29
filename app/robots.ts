import type { MetadataRoute } from 'next'
import { SITE_ORIGIN } from '@/lib/site'

/**
 * robots.txt — ATURAN YANG BERLAKU SEKARANG.
 *
 *   · `allow: '/'`  → seluruh halaman boleh DIBACA crawler.
 *   · `disallow: '/api/'` → satu-satunya yang ditutup. Endpoint JSON bukan
 *     halaman: crawler hanya akan membuang kuota di sana (dan `/api/payment/*`
 *     bahkan menolak GET). Tidak ada konten yang perlu diindeks di dalamnya.
 *
 * KENAPA HALAMAN YANG TIDAK BOLEH MUNCUL DI GOOGLE *TIDAK* DILARANG DI SINI:
 * `robots.txt` mencegah crawler MEMBACA halaman — termasuk membaca tag
 * `<meta name="robots" content="noindex">`. Halaman yang diblokir bisa tetap
 * muncul di hasil pencarian sebagai URL tanpa deskripsi ("terindeks karena
 * ditautkan") dan tag noindex-nya tidak akan pernah terlihat. Karena itu
 * pengecualian dilakukan di tingkat HALAMAN, bukan di robots.txt:
 *
 *   • `/login`, `/login/verify`      → `robots: { index: false, follow: true }`
 *   • `/registered`, `/palette`      → `robots: { index: false, follow: false }`
 *   • `/checkout/bayar`, `/checkout/selesai`, `/share/[id]`, `/join/[code]`
 *                                    → `noindex` di metadata masing-masing
 *   • `/app`, `/wallet`, `/settings`, `/help`, … → halaman app. Middleware
 *     (`middleware.ts`) menolak pemanggil anonim dengan 307 ke `/login`, jadi
 *     isi data keuangan tidak pernah dirender untuk crawler; tidak ada HTML
 *     berisi data pribadi yang bisa masuk indeks.
 *
 * Daftar halaman publik yang layak diindeks ada di `app/sitemap.ts`; tautan
 * sitemap di bawah ini yang memberi tahu Google di mana membacanya.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/api/'],
      },
    ],
    sitemap: `${SITE_ORIGIN}/sitemap.xml`,
    host: SITE_ORIGIN,
  }
}
