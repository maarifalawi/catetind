'use client'

import Image from 'next/image'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'
import {
  Home,
  PieChart,
  Wallet,
  Target,
  Receipt,
  CalendarDays,
  Briefcase,
  Users,
  Gift,
  CircleHelp,
  Settings,
  LogOut,
  Plus,
  X,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { LogoWordmark } from './logo-wordmark'

const sections = [
  {
    label: 'Menu Utama',
    items: [
      { href: '/', icon: Home, label: 'Dashboard' },
      { href: '/insight', icon: PieChart, label: 'Riwayat & Insight' },
    ],
  },
  {
    label: 'Kelola Uang',
    items: [
      { href: '/wallet', icon: Wallet, label: 'Dompet & Akun' },
      { href: '/budget', icon: Target, label: 'Budget & Target Nabung' },
      { href: '/bills', icon: Receipt, label: 'Tagihan Rutin' },
      { href: '/calendar', icon: CalendarDays, label: 'Kalender Cashflow' },
    ],
  },
  {
    label: 'Aset & Bersama',
    items: [
      { href: '/wealth', icon: Briefcase, label: 'Kekayaan & Hutang' },
      { href: '/joint', icon: Users, label: 'Joint Wallet' },
    ],
  },
  {
    label: 'Ekstra & Dukungan',
    items: [
      { href: '/referral', icon: Gift, label: 'Ajak Teman' },
      { href: '/help', icon: CircleHelp, label: 'Pusat Bantuan' },
    ],
  },
  {
    label: 'Sistem',
    items: [{ href: '/settings', icon: Settings, label: 'Pengaturan' }],
  },
]

export function DesktopSidebar() {
  const pathname = usePathname()
  const [addOpen, setAddOpen] = useState(false)

  return (
    <aside className="sticky top-0 hidden h-screen w-[272px] shrink-0 flex-col border-r border-black/5 bg-white/70 px-5 py-6 backdrop-blur-xl lg:flex">
      <LogoWordmark />

      {/* quick action — opens the transaction input drawer (Inventaris 97a) */}
      <button
        type="button"
        onClick={() => setAddOpen(true)}
        className="mt-7 flex w-full items-center justify-center gap-2 rounded-xl bg-forest py-2.5 text-[13px] font-semibold text-cream transition-colors hover:bg-forest-soft active:scale-[0.98]"
      >
        <Plus className="size-4" strokeWidth={2.5} />
        Tambah Transaksi
      </button>

      <nav className="sidebar-scroll -mr-2 mt-8 flex-1 space-y-7 overflow-y-auto overflow-x-hidden pr-2">
        {sections.map((section) => (
          <div key={section.label}>
            <p className="px-3 pb-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-ink/30">
              {section.label}
            </p>
            <div className="flex flex-col gap-0.5">
              {section.items.map(({ href, icon: Icon, label }) => {
                const isActive = pathname === href
                return (
                  <Link
                    key={href}
                    href={href}
                    aria-current={isActive ? 'page' : undefined}
                    className={cn(
                      'relative flex items-center gap-3 whitespace-nowrap rounded-lg px-3 py-2 text-[13px] transition-colors',
                      isActive
                        ? 'bg-forest/[0.07] font-semibold text-forest'
                        : 'font-medium text-ink/50 hover:bg-black/[0.03] hover:text-ink',
                    )}
                  >
                    {/* indikator bar mint untuk item aktif */}
                    <span
                      aria-hidden
                      className={cn(
                        'absolute left-0 top-1/2 h-4 w-[3px] -translate-y-1/2 rounded-full bg-mint transition-opacity',
                        isActive ? 'opacity-100' : 'opacity-0',
                      )}
                    />
                    <Icon
                      className="size-[18px] shrink-0"
                      strokeWidth={isActive ? 2.2 : 1.8}
                    />
                    {label}
                  </Link>
                )
              })}
            </div>
          </div>
        ))}

        {/* logout — part of the Sistem group per inventory */}
        <button
          type="button"
          className="flex w-full items-center gap-3 whitespace-nowrap rounded-lg px-3 py-2 text-[13px] font-medium text-ink/50 transition-colors hover:bg-rose-50 hover:text-rose-600"
        >
          <LogOut className="size-[18px] shrink-0" strokeWidth={1.8} />
          Keluar
        </button>
      </nav>

      <div className="mt-4 flex items-center gap-3 rounded-xl bg-black/[0.02] p-3 ring-1 ring-black/[0.04]">
        <span className="relative size-9 shrink-0 overflow-hidden rounded-full ring-1 ring-black/5">
          <Image
            src="/avatar-maarif.png"
            alt="Jon Snow"
            fill
            sizes="36px"
            className="object-cover"
          />
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-ink">Jon Snow</p>
          <p className="truncate text-xs text-ink/45">jon@snow.com</p>
        </div>
      </div>

      {/* add-transaction modal shell — full input drawer (97a) plugs in here */}
      {addOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-5 backdrop-blur-sm"
          onClick={() => setAddOpen(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Tambah Transaksi"
            className="w-full max-w-md rounded-3xl bg-cream p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold tracking-tight text-ink">
                Tambah Transaksi
              </h2>
              <button
                type="button"
                aria-label="Tutup"
                onClick={() => setAddOpen(false)}
                className="flex size-9 items-center justify-center rounded-full bg-white text-ink ring-1 ring-black/5 transition-colors hover:bg-sage"
              >
                <X className="size-4" />
              </button>
            </div>
            <p className="mt-4 text-sm leading-relaxed text-ink/55">
              Laci input transaksi (Halaman 97a di Inventaris UI) akan tampil di
              sini.
            </p>
          </div>
        </div>
      )}
    </aside>
  )
}
