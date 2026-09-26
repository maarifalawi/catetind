import type { Metadata } from 'next'
import Link from 'next/link'
import {
  Bell,
  ChevronRight,
  CreditCard,
  Download,
  Lock,
  LogOut,
  Palette,
  Sparkles,
  Tags,
  User,
  type LucideIcon,
} from 'lucide-react'
import { PhoneStage } from '@/components/catetind/phone-stage'
import { cn } from '@/lib/utils'

export const metadata: Metadata = {
  title: 'Pengaturan — CatetInd',
}

type Item = {
  href: string
  icon: LucideIcon
  label: string
  desc: string
  ready: boolean
}

/* sub-halaman per inventaris #15 — Notifikasi siap, sisanya placeholder "Segera" */
const ITEMS: Item[] = [
  { href: '/settings/profile', icon: User, label: 'Profil & Akun', desc: 'Nama, email, avatar, badge member', ready: false },
  { href: '/settings/billing', icon: CreditCard, label: 'Langganan & Billing', desc: 'Status, renew, kuota AI Token', ready: true },
  { href: '/settings/appearance', icon: Palette, label: 'Tampilan & Tema', desc: 'Mode terang / gelap', ready: false },
  { href: '/settings/categories', icon: Tags, label: 'Kustomisasi Kategori', desc: 'Kategori bawaan & custom', ready: false },
  { href: '/settings/ai', icon: Sparkles, label: 'AI Preferences', desc: 'Auto-categorization, bahasa AI', ready: false },
  { href: '/settings/notifications', icon: Bell, label: 'Notifikasi', desc: 'Push reminder, laporan, tagihan', ready: true },
  { href: '/settings/security', icon: Lock, label: 'Keamanan / PIN Lock', desc: 'Kunci app & biometrik', ready: false },
]

export default function SettingsPage() {
  return (
    <PhoneStage>
      <main className="min-h-screen px-5 pb-32 pt-6 sm:px-8 lg:px-10 lg:pt-8">
        <div className="mx-auto w-full max-w-2xl">
          <h1 className="font-display text-3xl font-semibold tracking-tight text-ink lg:text-4xl">
            Pengaturan
          </h1>
          <p className="mt-1 text-sm text-ink/50">
            Atur akun, langganan, dan preferensi kamu.
          </p>

          <ul className="mt-6 space-y-2.5">
            {ITEMS.map(({ href, icon: Icon, label, desc, ready }) => (
              <li key={href}>
                <Link
                  href={ready ? href : '#'}
                  aria-disabled={!ready}
                  tabIndex={ready ? 0 : -1}
                  className={cn(
                    'group flex items-center gap-3.5 rounded-2xl bg-white px-4 py-3.5 ring-1 ring-black/5 transition-colors',
                    ready
                      ? 'hover:bg-sage/40'
                      : 'pointer-events-none opacity-55',
                  )}
                >
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-sage text-forest">
                    <Icon className="size-4" strokeWidth={2.2} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-semibold text-ink">
                      {label}
                    </span>
                    <span className="mt-0.5 block truncate text-xs text-ink/45">
                      {desc}
                    </span>
                  </span>
                  {ready ? (
                    <ChevronRight className="size-4 shrink-0 text-ink/30 transition-transform group-hover:translate-x-0.5" />
                  ) : (
                    <span className="shrink-0 rounded-full bg-black/[0.05] px-2 py-0.5 text-[10px] font-semibold text-ink/40">
                      Segera
                    </span>
                  )}
                </Link>
              </li>
            ))}
          </ul>

                                                  {/* Export data + logout (Domain 4C, inventaris #15) */}
          <div className="mt-6 space-y-2.5">
            <button
              type="button"
              className="glass-button group relative flex w-full items-center gap-3.5 rounded-2xl bg-white/85 px-4 py-3.5 text-left ring-1 ring-black/5 backdrop-blur-xl backdrop-saturate-150 border border-white/40 transition-all duration-200 hover:bg-white/95 hover:shadow-md"
            >
              <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-sage text-forest">
                <Download className="size-4" strokeWidth={2.2} />
              </span>
              <span className="flex-1">
                <span className="block text-sm font-semibold text-ink">
                  Export Data Saya
                </span>
                <span className="mt-0.5 block text-xs text-ink/50">
                  Semua data dikirim via email — bukan dibagikan ke siapa-siapa
                </span>
              </span>
            </button>

            <button
              type="button"
              className="glass-button group relative flex w-full items-center gap-3.5 rounded-2xl bg-white/85 px-4 py-3.5 text-left ring-1 ring-black/5 backdrop-blur-xl backdrop-saturate-150 border border-white/40 transition-all duration-200 hover:bg-white/95 hover:shadow-md"
            >
              <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-rose-100 text-rose-500">
                <LogOut className="size-4" strokeWidth={2.2} />
              </span>
              <span className="flex-1">
                <span className="block text-sm font-semibold text-rose-600">
                  Keluar
                </span>
                <span className="mt-0.5 block text-xs text-ink/50">
                  Keluar dari akun Anda
                </span>
              </span>
            </button>
          </div>
        </div>
      </main>
    </PhoneStage>
  )
}
