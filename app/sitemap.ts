import type { MetadataRoute } from 'next'
import { SITE_ORIGIN } from '@/lib/site'

/**
 * Sitemap (PERBAIKAN AUDIT R3) — halaman `/` sudah lama punya `canonical` +
 * Open Graph lengkap, tapi tidak ada peta apa pun yang memberi tahu mesin
 * pencari halaman mana yang memang untuk publik.
 *
 * ISI SENGAJA PENDEK. Yang masuk HANYA halaman publik yang layak diindeks:
 *   • halaman app TIDAK dimasukkan — isinya data pribadi user dan tidak punya
 *     `noindex` sendiri (`/wallet`, `/settings`, …);
 *   • halaman yang sudah `robots: noindex` di metadata-nya TIDAK dimasukkan
 *     (`/registered`, `/checkout/bayar`, `/checkout/selesai`, `/join/[code]`,
 *     `/share/[id]`) — sitemap dan metadata tidak boleh saling bertentangan;
 *   • route dinamis (`/share/[id]`, `/join/[code]`) juga tidak bisa didaftar
 *     karena isinya per-user.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: `${SITE_ORIGIN}/`, changeFrequency: 'monthly', priority: 1 },
    { url: `${SITE_ORIGIN}/welcome`, changeFrequency: 'monthly', priority: 0.9 },
    { url: `${SITE_ORIGIN}/checkout`, changeFrequency: 'monthly', priority: 0.9 },
    { url: `${SITE_ORIGIN}/install`, changeFrequency: 'monthly', priority: 0.7 },
    { url: `${SITE_ORIGIN}/help`, changeFrequency: 'monthly', priority: 0.6 },
    { url: `${SITE_ORIGIN}/privacy`, changeFrequency: 'yearly', priority: 0.4 },
    { url: `${SITE_ORIGIN}/terms`, changeFrequency: 'yearly', priority: 0.4 },
  ]
}
