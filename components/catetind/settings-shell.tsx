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
    href: '/settings',
    icon: User,
    title: 'Profil & Akun',
    desc: 'Nama, email, avatar, badge member',
  },
  {
    id: 'billing',
    href: '/settings/billing',
    icon: CreditCard,
    title: 'Langganan & Billing',
    desc: 'Status, renew, kuota AI Token',
  },
  {
    id: 'appearance',
    href: '/settings/appearance',
    icon: Palette,
    title: 'Tampilan & Tema',
    desc: 'Mode terang / gelap',
  },
  {
    id: 'categories',
    href: '/settings/categories',
    icon: Tag,
    title: 'Kustomisasi Kategori',
    desc: 'Kategori bawaan & custom',
  },
  {
    id: 'ai',
    href: '/settings/ai',
    icon: Bot,
    title: 'AI Preferences',
    desc: 'Auto-categorization, kepribadian Minca',
  },
  {
    id: 'notifications',
    href: '/settings/notifications',
    icon: Bell,
    title: 'Notifikasi',
    desc: 'Push reminder, laporan, tagihan',
  },
  {
    id: 'security',
    href: '/settings/security',
    icon: Lock,
    title: 'Keamanan & Privasi',
    desc: 'Kunci app, biometrik, hapus akun',
  },
  {
    id: 'data',
    href: '/settings/data',
    icon: Download,
    title: 'Export Data Saya',
    desc: 'Semua data dikirim via email',
  },
  {
    id: 'logout',
    href: '/settings/logout',
    icon: LogOut,
    title: 'Keluar',
    desc: 'Keluar dari akun',
    tone: 'danger',
  },
]

/** Section aktif dari URL: `/settings` → profil, `/settings/<id>` → id itu. */
export function settingsSectionFromPath(pathname: string): SettingsSectionId {
  const segment = pathname.split('/').filter(Boolean)[1]
  return SETTINGS_MENU.find((item) => item.id === segment)?.id ?? 'profile'
}

export function SettingsShell({ children }: { children: ReactNode }) {
  const pathname = usePathname()
  const activeId = settingsSectionFromPath(pathname)
  /** `/settings` = indeks: daftar menu di mobile, panel profil di desktop */
  const isIndex = activeId === 'profile'

  return (
    <ScreenShell>
      {/* ── HEADER — resep kanonik H1 yang sama dengan Dashboard & halaman lain */}
      <header className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-[13px] font-medium text-ink/45">Akun & Preferensi</p>
          <h1 className="mt-1 font-display text-3xl font-semibold tracking-tight text-ink lg:text-4xl">
            Pengaturan
          </h1>
          <p className="mt-2 max-w-2xl text-[13.5px] leading-relaxed text-ink/55 lg:mt-3 lg:text-sm">
            Atur akun, langganan, dan preferensi kamu — sidebar tetap di tempatnya, jadi kamu
            nggak pernah keluar dari aplikasi.
          </p>
        </div>
      </header>

      <div className="mt-5 grid grid-cols-1 gap-5 lg:mt-6 lg:grid-cols-12 lg:gap-6">
        {/* ── KIRI (3/12) — daftar menu, sticky ─────────────────────────────
            Mobile: cuma tampil di halaman indeks (sub-section punya tombol
            kembali). Desktop: selalu tampil menemani panel yang panjang. */}
        <aside className={cn('min-w-0 lg:col-span-3', !isIndex && 'hidden lg:block')}>
          <div className="lg:sticky lg:top-6">
            <p className="px-3 text-[10.5px] font-semibold tracking-[0.14em] text-ink/40 uppercase">
              Menu Pengaturan
            </p>
            <nav aria-label="Menu pengaturan" className="mt-2">
              <ul className="space-y-0.5">
                {SETTINGS_MENU.map((item) => {
                  const active = item.id === activeId
                  const danger = item.tone === 'danger'
                  const Icon = item.icon

                  return (
                    <li key={item.id}>
                      <Link
                        href={item.href}
                        aria-current={active ? 'page' : undefined}
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
                                  ? 'font-semibold text-ink'
                                  : 'font-medium text-ink/60',
                            )}
                          >
                            {item.title}
                          </span>
                          <span className="mt-0.5 block text-[11px] leading-snug text-ink/45">
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
              className="mb-4 inline-flex items-center gap-1 text-sm font-medium text-ink/50 transition-colors hover:text-ink lg:hidden"
            >
              <ChevronLeft className="size-4" strokeWidth={2.4} aria-hidden />
              Pengaturan
            </Link>
          )}
          {children}
        </div>
      </div>
    </ScreenShell>
  )
}

