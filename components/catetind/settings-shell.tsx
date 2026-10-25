'use client'

import type { ReactNode } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  Bell,
  Bot,
  ChevronLeft,
  CreditCard,
  Download,
  Lock,
  LogOut,
  Palette,
  Tag,
  User,
  type LucideIcon,
} from 'lucide-react'
import { ScreenShell } from './screen-shell'
import { NavLockBadge } from './nav-lock-badge'
import { useSubscriptionGate } from './subscription-gate-provider'
import { pageLockText, pageUnlockPlan } from '@/lib/subscription/page-access'
import { cn } from '@/lib/utils'

/* ── Pengaturan (inventaris #15–#22) — MASTER-DETAIL DI DALAM APP SHELL ────────
   ATURAN MUTLAK: sidebar global TIDAK PERNAH hilang. Karena itu seluruh halaman
   pengaturan hidup di dalam `ScreenShell` (sidebar desktop + offset kolom
   konten), bukan di halaman full-screen terpisah.

   Struktur 2 kolom DI DALAM kolom konten:
       KIRI  3/12 → daftar menu pengaturan (sticky, mengikuti panel panjang)
       KANAN 9/12 → panel detail section aktif

   Kenapa rute BERSARANG (`/settings`, `/settings/billing`, …) dan bukan state
   lokal + hash? Supaya URL tetap berubah & bisa di-deep-link/share, TAPI layout
   ini (`app/settings/layout.tsx`) tidak pernah unmount saat pindah section:
   Next hanya menukar segmen halaman di kolom kanan. Efeknya persis seperti tab —
   tanpa reload, tanpa keluar dari aplikasi, dan sidebar tetap di tempatnya.

   Di mobile kolom kiri jadi halaman indeks: `/settings` menampilkan daftar menu
   saja, sedangkan sub-section menampilkan tombol kembali + panelnya. */

export type SettingsSectionId =
  | 'profile'
  | 'billing'
  | 'appearance'
  | 'categories'
  | 'ai'
  | 'notifications'
  | 'security'
  | 'data'
  | 'logout'

export type SettingsMenuItem = {
  id: SettingsSectionId
  href: string
  icon: LucideIcon
  title: string
  desc: string
  /** `danger` = Keluar (ikon + judul prem, mengikuti daftar lama) */
  tone?: 'danger'
}

/** Satu sumber daftar menu — urutan & copy sesuai inventaris #15–#22. */
export const SETTINGS_MENU: SettingsMenuItem[] = [
  {
    id: 'profile',
    href: '/settings/profile',
    icon: User,
    title: 'Profil & Akun',
    desc: 'Nama, email, gajian',
  },
  {
    id: 'billing',
    href: '/settings/billing',
    icon: CreditCard,
    title: 'Langganan',
    desc: 'Status & kuota AI',
  },
  {
    id: 'appearance',
    href: '/settings/appearance',
    icon: Palette,
    title: 'Tampilan',
    desc: 'Terang / gelap',
  },
  {
    id: 'categories',
    href: '/settings/categories',
    icon: Tag,
    title: 'Kategori',
    desc: 'Atur kategori',
  },
  {
    id: 'ai',
    href: '/settings/ai',
    icon: Bot,
    title: 'AI',
    desc: 'Auto-kategori & gaya Minca',
  },
  {
    id: 'notifications',
    href: '/settings/notifications',
    icon: Bell,
    title: 'Notifikasi',
    desc: 'Pengingat & laporan',
  },
  {
    id: 'security',
    href: '/settings/security',
    icon: Lock,
    title: 'Keamanan',
    desc: 'Kunci app & hapus akun',
  },
  {
    id: 'data',
    href: '/settings/data',
    icon: Download,
    title: 'Export Data',
    desc: 'Unduh semua data kamu',
  },
  /* H12-5 (audit UI/UX): entri Keluar DIHAPUS dari menu sidebar pengaturan —
     ia dipindah ke paling bawah HALAMAN (lihat SETTINGS_LOGOUT_ITEM di bawah). */
]

/** H12-5 (audit UI/UX): tombol Keluar dipindah ke paling bawah HALAMAN pengaturan,
 *  bukan lagi entri menu sidebar, dan bergaya merah/destructive. Rutenya tetap
 *  `/settings/logout` (halaman konfirmasi yang sudah ada). */
export const SETTINGS_LOGOUT_ITEM = {
  href: '/settings/logout',
  title: 'Keluar',
  desc: 'Akhiri sesi ini',
} as const

/** Section aktif dari URL: `/settings` → profil, `/settings/<id>` → id itu,
 *  dan `/settings/logout` → logout (rute konfirmasi yang bukan item menu). */
export function settingsSectionFromPath(pathname: string): SettingsSectionId {
  const clean = pathname.split('?')[0]?.split('#')[0]?.replace(/\/+$/, '') ?? ''
  const segment = clean.split('/').filter(Boolean)[1]
  if (segment === 'logout') return 'logout'
  return SETTINGS_MENU.find((item) => item.id === segment)?.id ?? 'profile'
}

export function SettingsShell({ children }: { children: ReactNode }) {
  const pathname = usePathname()
  const activeId = settingsSectionFromPath(pathname)
  /**
   * Indeks HANYA tepat di `/settings`: daftar menu di mobile, panel profil di
   * desktop. Section lain — termasuk `/settings/profile` — menampilkan panelnya
   * sendiri di mobile.
   *
   * PERBAIKAN MOBILE: dulu `isIndex = activeId === 'profile'`. Akibatnya
   *   · `/settings` (= href "Profil & Akun") menyembunyikan panel profil di
   *     mobile, dan tautannya cuma kembali ke daftar menu yang sama — menu itu
   *     terasa mati; dan
   *   · `/settings/logout` juga dianggap indeks, sehingga halaman konfirmasi
   *     keluar tidak pernah tampil di mobile.
   */
  const isIndex = pathname.replace(/\/+$/, '') === '/settings'
  /* Paket menentukan menu mana yang terkunci (mis. AI Preferences butuh
     `ai-chat`). Badge 🔒 hanya informatif; kliknya dicegat listener global
     `UpgradeGateProvider` — popup upgrade muncul, bukan pindah halaman. */
  const { lockedPageCapability } = useSubscriptionGate()

  return (
    <ScreenShell>
      {/* ── HEADER — resep kanonik H1 yang sama dengan Dashboard & halaman lain */}
      <header className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h1 className="mt-1 font-display text-3xl font-semibold tracking-tight text-forest lg:text-4xl">
            Pengaturan
          </h1>
        </div>
      </header>

      <div className="mt-5 grid grid-cols-1 gap-5 lg:mt-6 lg:grid-cols-12 lg:gap-6">
        {/* ── KIRI (3/12) — daftar menu, sticky ─────────────────────────────
            Mobile: cuma tampil di halaman indeks (sub-section punya tombol
            kembali). Desktop: selalu tampil menemani panel yang panjang. */}
        <aside className={cn('min-w-0 lg:col-span-3', !isIndex && 'hidden lg:block')}>
          <div className="lg:sticky lg:top-6">
            <p className="px-3 text-[10.5px] font-medium tracking-[0.14em] text-forest/40 uppercase">
              Menu Pengaturan
            </p>
            <nav aria-label="Menu pengaturan" className="mt-2">
              <ul className="space-y-0.5">
                {SETTINGS_MENU.map((item) => {
                  const active = item.id === activeId
                  const danger = item.tone === 'danger'
                  const Icon = item.icon
                  /* Menu tetap tampil walau terkunci: badge 🔒 + title menyebut
                     paket pembukanya, dan tautannya menuju kartu upgrade. */
                  const lockText = lockedPageCapability(item.href)
                    ? pageLockText(item.href)
                    : null
                  const unlockPlan = lockedPageCapability(item.href)
                    ? pageUnlockPlan(item.href)
                    : null

                  return (
                    <li key={item.id}>
                      <Link
                        href={item.href}
                        aria-current={active ? 'page' : undefined}
                        aria-label={lockText ? `${item.title}, ${lockText}` : undefined}
                        title={lockText ?? undefined}
                        className={cn(
                          'flex w-full items-start gap-3 border-l-[3px] py-2.5 pr-2 pl-3 transition-colors',
                          active
                            ? 'border-forest bg-sage/60'
                            : 'border-transparent hover:border-soil/15 hover:bg-sage/40',
                        )}
                      >
                        <span
                          className={cn(
                            'mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full',
                            danger
                              ? 'bg-plum/20 text-plum'
                              : active
                                ? 'bg-forest text-mint'
                                : 'bg-sage text-forest',
                          )}
                        >
                          <Icon className="size-4" strokeWidth={2.2} aria-hidden />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span
                            className={cn(
                              'block text-[13.5px] leading-snug',
                              danger
                                ? 'font-medium text-plum'
                                : active
                                  ? 'font-medium text-forest'
                                  : 'font-medium text-forest/60',
                            )}
                          >
                            {item.title}
                            {lockText && (
                              <NavLockBadge
                                planName={unlockPlan?.name}
                                className="ml-1.5 align-middle"
                              />
                            )}
                          </span>
                          <span className="mt-0.5 block text-[11px] leading-snug text-forest/45">
                            {item.desc}
                          </span>
                        </span>
                      </Link>
                    </li>
                  )
                })}
              </ul>
            </nav>
          </div>
        </aside>

        {/* ── KANAN (9/12) — detail section aktif ───────────────────────────── */}
        <div className={cn('min-w-0 lg:col-span-9', isIndex && 'hidden lg:block')}>
          {/* mobile: jalan pulang dari sub-section ke daftar menu */}
          {!isIndex && (
            <Link
              href="/settings"
              className="mb-4 inline-flex items-center gap-1 text-sm font-medium text-forest/50 transition-colors hover:text-forest lg:hidden"
            >
              <ChevronLeft className="size-4" strokeWidth={2.4} aria-hidden />
              Pengaturan
            </Link>
          )}
          {children}
        </div>
      </div>

      {/* H12-5 (audit UI/UX): Keluar ada di PALING BAWAH halaman pengaturan,
          dengan gaya destructive (plum), jauh dari menu biasa. */}
      {activeId !== 'logout' && (
        <div className="mt-8 border-t border-plum/20 pt-5">
          <Link
            href={SETTINGS_LOGOUT_ITEM.href}
            className="flex w-full items-center justify-center gap-2 rounded-2xl border border-plum/30 bg-plum/10 px-5 py-3.5 text-[13.5px] font-medium text-plum transition-colors hover:bg-plum/20 active:scale-[0.99]"
          >
            <LogOut className="size-4" strokeWidth={2.4} aria-hidden />
            {SETTINGS_LOGOUT_ITEM.title}, {SETTINGS_LOGOUT_ITEM.desc}
          </Link>
        </div>
      )}
    </ScreenShell>
  )
}

