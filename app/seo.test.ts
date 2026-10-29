import { describe, expect, it } from 'vitest'
import robots from './robots'
import sitemap from './sitemap'
import { SITE_ORIGIN } from '@/lib/site'

/* ── SEO TEKNIS: robots.txt & sitemap.xml ────────────────────────────────────
   Dua berkas ini menentukan halaman mana yang BOLEH dibaca crawler dan mana
   yang diberitahukan sebagai halaman publik. Kesalahan kecil di sini mahal:
   satu baris `Disallow: /login` membuat tag `noindex` di halaman masuk tidak
   pernah terbaca, dan satu URL `noindex` di sitemap membuat Google menerima
   dua instruksi yang bertentangan.

   Tipe `MetadataRoute` sengaja dibaca lewat bentuk sempit di bawah supaya
   assertion-nya langsung menyebut field yang diuji (allow/disallow/sitemap). */

type RobotsRule = {
  userAgent: string | string[]
  allow?: string | string[]
  disallow?: string | string[]
}

describe('robots()', () => {
  const config = robots() as unknown as {
    rules: RobotsRule[]
    sitemap: string
    host: string
  }
  const rule = config.rules[0]
  const disallow = rule.disallow as string[]

  it('satu aturan untuk semua crawler, bukan daftar bertingkat', () => {
    expect(config.rules).toHaveLength(1)
    expect(rule.userAgent).toBe('*')
  })

  it('semua halaman boleh dirayapi', () => {
    expect(rule.allow).toBe('/')
  })

  it('hanya /api yang ditutup', () => {
    expect(disallow).toEqual(['/api/'])
  })

  it('/login TIDAK dilarang — tag noindex-nya harus bisa dibaca Google', () => {
    expect(disallow.some((path) => path.startsWith('/login'))).toBe(false)
  })

  it('halaman app tidak dilarang (dijaga gerbang sesi, bukan robots.txt)', () => {
    for (const path of ['/app', '/wallet', '/budget', '/settings', '/share/', '/join/']) {
      expect(disallow).not.toContain(path)
    }
  })

  it('menautkan sitemap & host kanon', () => {
    expect(config.sitemap).toBe(`${SITE_ORIGIN}/sitemap.xml`)
    expect(config.host).toBe(SITE_ORIGIN)
  })
})

describe('sitemap()', () => {
  const entries = sitemap()
  const urls = entries.map((entry) => entry.url)

  it('hanya URL absolut di domain kanon', () => {
    for (const url of urls) {
      expect(url.startsWith(`${SITE_ORIGIN}/`)).toBe(true)
    }
  })

  it('tidak ada URL ganda', () => {
    expect(new Set(urls).size).toBe(urls.length)
  })

  it('beranda adalah entri prioritas tertinggi', () => {
    const home = entries.find((entry) => entry.url === SITE_ORIGIN || entry.url === `${SITE_ORIGIN}/`)
    expect(home).toBeDefined()
    expect(home?.priority).toBe(1)
  })

  it('halaman noindex TIDAK didaftar (sitemap vs metadata tidak boleh beda)', () => {
    const forbidden = [
      '/login',
      '/login/verify',
      '/registered',
      '/checkout/bayar',
      '/checkout/selesai',
      '/share/',
      '/join/',
    ]
    for (const path of forbidden) {
      expect(urls.some((url) => url.startsWith(`${SITE_ORIGIN}${path}`))).toBe(false)
    }
  })

  it('halaman app yang di balik sesi TIDAK didaftar', () => {
    const appPaths = [
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
    ]
    for (const path of appPaths) {
      expect(urls).not.toContain(`${SITE_ORIGIN}${path}`)
    }
  })

  it('setiap prioritas ada di rentang 0–1', () => {
    for (const entry of entries) {
      expect(entry.priority).toBeGreaterThan(0)
      expect(entry.priority).toBeLessThanOrEqual(1)
    }
  })
})
