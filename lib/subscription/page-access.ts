/* ── AKSES HALAMAN PER PAKET (satu sumber) ────────────────────────────────────
   Sebelum file ini, "halaman mana yang terbuka" hanya tersirat di dua tempat:
   `PLAN_CAPABILITIES` (fitur) dan early-return di `joint-screen.tsx`. Akibatnya
   halaman baru seperti `/settings/ai` tetap bisa dibuka paket yang tidak punya
   AI, dan tidak ada satu daftar yang bisa dibaca untuk menjawab "paket X boleh
   masuk halaman apa saja?".

   File ini menjawab pertanyaan itu secara eksplisit. Aturannya:

     • `capability: null` → halaman terbuka untuk SEMUA paket (termasuk user
       yang belum pernah membeli; pencatatan tetap dijaga `inputLocked`).
     • `capability: '...'` → halaman hanya terbuka bila paket memiliki kemampuan
       itu. Sumber kebenaran kemampuan tetap `PLAN_CAPABILITIES` di
       `lib/data/pricing.ts` — file ini TIDAK menyalin peta paket, hanya
       menunjuk kemampuan yang membuka halaman.
     • Rute yang tidak terdaftar = TIDAK dikunci. Halaman baru tidak boleh
       mendadak terkunci hanya karena lupa didaftarkan; kalau memang berbayar,
       tambahkan aturannya di sini.

   Halaman PUBLIK/pre-app tidak didaftarkan di sini: gerbangnya adalah
   `lib/public-routes.ts` (sesi), bukan paket. Jadi `/`, `/login`, `/checkout`,
   `/welcome`, `/join`, `/share`, `/bantuan`, dll. selalu bisa dibuka tanpa
   paket — dan memang harus begitu.

   Pemakaian:
     • `ScreenShell` → menahan render halaman berbayar sampai paket diperiksa;
       kalau tidak berhak, redirect ke halaman aman + `UpgradeGateProvider`
       membuka popup upgrade (halaman terkunci tidak pernah dirender).
     • `DesktopSidebar` & menu Pengaturan → klik tautan terkunci mencegah
       navigasi dan membuka popup yang sama.
     • Test `page-access.test.ts` → menjaga matriks tiga paket tidak bergeser.
   ────────────────────────────────────────────────────────────────────────── */

import {
  canUse,
  capabilityUnlockedBy,
  lockedBadgeText,
  type Capability,
  type PlanDefinition,
  type PlanId,
} from '@/lib/data/pricing'

export interface PageAccessRule {
  /** rute kanon (prefix); rute turunannya ikut aturan ini */
  path: string
  /** nama halaman untuk copy kartu lock */
  label: string
  /** `null` = semua paket boleh masuk */
  capability: Capability | null
}

/* Urutan di sini adalah urutan baca manusia (menu utama → kelola uang → aset →
   bantuan → pengaturan). Pencocokan rute TIDAK memakai urutan ini: ia memilih
   path TERPANJANG lebih dulu, supaya `/settings/ai` menang atas `/settings`. */
export const PAGE_ACCESS: PageAccessRule[] = [
  { path: '/app', label: 'Dashboard', capability: null },
  { path: '/app/onboarding', label: 'Onboarding', capability: null },
  { path: '/history', label: 'Riwayat & Insight', capability: null },
  { path: '/wallet', label: 'Dompet & Akun', capability: null },
  { path: '/budget', label: 'Budget & Target Nabung', capability: null },
  { path: '/bills', label: 'Tagihan Rutin', capability: null },
  { path: '/calendar', label: 'Kalender Cashflow', capability: null },
  { path: '/wealth', label: 'Kekayaan & Hutang', capability: null },
  { path: '/joint', label: 'Joint Wallet', capability: 'joint-wallet' },
  { path: '/referral', label: 'Ajak Teman', capability: null },
  { path: '/help', label: 'Pusat Bantuan', capability: null },
  { path: '/install', label: 'Panduan Install', capability: null },
  { path: '/settings/ai', label: 'AI Preferences', capability: 'ai-chat' },
  { path: '/settings', label: 'Pengaturan', capability: null },
]

/** rute paling spesifik lebih dulu — `/settings/ai` sebelum `/settings` */
const RULES_BY_SPECIFICITY = [...PAGE_ACCESS].sort((a, b) => b.path.length - a.path.length)

function normalizePath(pathname: string): string {
  const withoutQuery = pathname.split('?')[0]?.split('#')[0] ?? '/'
  const withoutTrailingSlash = withoutQuery.replace(/\/+$/, '')
  return withoutTrailingSlash === '' ? '/' : withoutTrailingSlash
}

/** aturan yang berlaku untuk pathname; `null` = rute tak terdaftar (terbuka) */
export function pageAccessRule(pathname: string): PageAccessRule | null {
  const path = normalizePath(pathname)
  return (
    RULES_BY_SPECIFICITY.find(
      (rule) => path === rule.path || path.startsWith(`${rule.path}/`),
    ) ?? null
  )
}

/** kemampuan yang membuka halaman ini; `null` = tidak terkunci */
export function pageLockCapability(pathname: string): Capability | null {
  return pageAccessRule(pathname)?.capability ?? null
}

/**
 * true = paket boleh membuka halaman ini.
 *
 * `planId = null` berarti belum punya paket (atau paket sudah tidak aktif).
 * Halaman tanpa kemampuan tetap terbuka — user tetap boleh membaca dan
 * mencatat secara manual; yang menahan penulisan adalah `inputLocked`.
 */
export function canAccessPage(planId: PlanId | null | undefined, pathname: string): boolean {
  const capability = pageLockCapability(pathname)
  return capability ? canUse(planId, capability) : true
}

/** semua halaman yang terbuka untuk paket ini */
export function pagesForPlan(planId: PlanId | null | undefined): PageAccessRule[] {
  return PAGE_ACCESS.filter((rule) => canAccessPage(planId, rule.path))
}

/** semua halaman yang terkunci untuk paket ini */
export function lockedPagesFor(planId: PlanId | null | undefined): PageAccessRule[] {
  return PAGE_ACCESS.filter((rule) => !canAccessPage(planId, rule.path))
}

/** paket terendah yang membuka halaman ini; `null` kalau halaman tidak terkunci */
export function pageUnlockPlan(pathname: string): PlanDefinition | null {
  const capability = pageLockCapability(pathname)
  return capability ? capabilityUnlockedBy(capability) : null
}

/** badge `🔒 … · buka di Paket …` untuk satu halaman; `null` kalau terbuka */
export function pageLockText(pathname: string): string | null {
  const capability = pageLockCapability(pathname)
  return capability ? lockedBadgeText(capability) : null
}

/* ── COPY POPUP UPGRADE UNTUK HALAMAN ───────────────────────────────────────
   Dipakai `UpgradeGateProvider` sebagai alasan spesifik di `UpgradeModal`.
   Nominal & target paket TIDAK ditulis di sini — modal mengambilnya dari
   `priceFor()` (sumber yang sama dengan yang ditagih server). */

export const PAGE_ACCESS_COPY = {
  title: (pageLabel: string, planName: string) => `Halaman ${pageLabel} khusus ${planName}`,
} as const
