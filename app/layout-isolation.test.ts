import { existsSync, readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

/* ── PAGAR PEMISAHAN CANGKANG APP (paket 108) ────────────────────────────────
   Landing (`/`) hanya boleh memakai `app/layout.tsx`. Kalau ada yang menaruh
   kembali satu impor `@/components/catetind/*` (atau `Toaster`, provider,
   navigasi, AI chat) di layout akar, seluruh app — termasuk @supabase — ikut
   terunduh oleh pengunjung anonim dan request `/api/session` + `/api/data`
   yang 401 muncul lagi.

   Tes ini mengunci keadaan itu: layout akar harus tetap kerangka dokumen, dan
   cangkang app harus hidup di `app/(app)/layout.tsx`. */
describe('pemisahan cangkang aplikasi dari layout akar', () => {
  const ROOT = readFileSync(new URL('./layout.tsx', import.meta.url), 'utf8')
  const APP = readFileSync(new URL('./(app)/layout.tsx', import.meta.url), 'utf8')
  const PUBLIC = readFileSync(new URL('./(public)/layout.tsx', import.meta.url), 'utf8')

  /* Yang diperiksa adalah BARIS IMPOR, bukan seluruh berkas: komentar sengaja
     menyebut nama komponen app (untuk menjelaskan kenapa ia tidak boleh di
     sini), dan itu tidak menambah satu byte pun ke bundel. */
  const importsOf = (source: string) =>
    source
      .split('\n')
      .filter((line) => /^\s*\} from '/.test(line) || /^\s*import\b/.test(line))
      .join('\n')

  it('layout akar tidak mengimpor satu pun komponen catetind / Toaster', () => {
    const imports = importsOf(ROOT)
    expect(imports).not.toMatch(/@\/components\/catetind\//)
    expect(imports).not.toMatch(/@\/components\/MobileBottomNav/)
    expect(imports).not.toMatch(/@\/components\/ui\/toaster/)
    expect(imports).not.toMatch(/SmoothScrollProvider|ServiceWorkerRegistration|AccountScope/)
  })

  it('layout akar tetap memasang kerangka dokumen + font + analytics', () => {
    expect(ROOT).toContain('<html lang="id"')
    expect(ROOT).toContain("from 'next/font/local'")
    expect(ROOT).toContain('@vercel/analytics/next')
    expect(ROOT).toContain('{children}')
  })

  it('layout akar tidak membaca cookie/sesi (harus bisa jadi halaman statis)', () => {
    const imports = importsOf(ROOT)
    expect(imports).not.toMatch(/next\/headers/)
    expect(ROOT).not.toMatch(/\bcookies\(|\bheaders\(/)
    expect(imports).not.toMatch(/createServerClient|supabase/)
  })

  it('cangkang app dipasang di grup (app), bukan di akar', () => {
    for (const marker of [
      'AccountScope',
      'MoneyContextProvider',
      'PrivacyProvider',
      'SubscriptionGateProvider',
      'UpgradeGateProvider',
      'AppLockProvider',
      'OnboardingGate',
      'MobileBottomNav',
      'AIChatWidget',
      'SettingsSync',
      'SmoothScrollProvider',
      'data-catetind-page-root',
    ]) {
      expect(APP, `${marker} hilang dari app/(app)/layout.tsx`).toContain(marker)
    }
    /* urutan provider mengikat: induk harus lebih dulu */
    const order = ['AccountScope', 'MoneyContextProvider', 'PrivacyProvider', 'SubscriptionGateProvider', 'UpgradeGateProvider', 'AppLockProvider', 'OnboardingGate']
    const positions = order.map((name) => APP.indexOf(`<${name}`))
    expect(positions.every((position) => position > 0)).toBe(true)
    expect([...positions].sort((a, b) => a - b)).toEqual(positions)
  })

  it('layout publik hanya memasang Toaster, tanpa provider app', () => {
    expect(PUBLIC).toContain('Toaster')
    const imports = importsOf(PUBLIC)
    expect(imports).not.toMatch(/AccountScope|SubscriptionGateProvider|AIChatWidget|MobileBottomNav/)
  })

  it('folder rute app benar-benar berada di grup (app)', () => {
    const moved = ['wallet', 'bills', 'budget', 'joint', 'settings', 'admin', 'app']
    for (const dir of moved) {
      const path = new URL(`./(app)/${dir}`, import.meta.url)
      expect(existsSync(path), `app/(app)/${dir} tidak ada`).toBe(true)
    }
    /* dan tidak boleh tersisa di akar `app/` */
    for (const dir of moved) {
      expect(existsSync(new URL(`./${dir}`, import.meta.url)), `app/${dir} masih ada`).toBe(false)
    }
  })
})
