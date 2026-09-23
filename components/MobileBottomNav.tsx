'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Drawer } from 'vaul'
import {
  Home,
  Wallet,
  Plus,
  PieChart,
  LayoutGrid,
  Target,
  Receipt,
  CalendarDays,
  Briefcase,
  Users,
  Gift,
  CircleHelp,
  Settings,
  type LucideIcon,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { AddTransactionDrawer } from '@/components/dashboard/add-transaction-drawer'

type NavItem = { href: string; icon: LucideIcon; label: string }

const mainItems: NavItem[] = [
  { href: '/', icon: Home, label: 'Home' },
  { href: '/wallet', icon: Wallet, label: 'Wallet' },
  { href: '/insight', icon: PieChart, label: 'Insight' },
]

const menuGroups: { label: string; items: NavItem[] }[] = [
  {
    label: 'Kelola Uang',
    items: [
      { href: '/budget', icon: Target, label: 'Budget' },
      { href: '/bills', icon: Receipt, label: 'Tagihan' },
      { href: '/calendar', icon: CalendarDays, label: 'Kalender' },
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
    label: 'Ekstra & Sistem',
    items: [
      { href: '/referral', icon: Gift, label: 'Ajak Teman' },
      { href: '/help', icon: CircleHelp, label: 'Bantuan' },
      { href: '/settings', icon: Settings, label: 'Pengaturan' },
    ],
  },
]

const menuHrefs = menuGroups.flatMap((g) => g.items.map((i) => i.href))

function NavLink({ item, pathname }: { item: NavItem; pathname: string }) {
  const isActive =
    item.href === '/' ? pathname === '/' : pathname.startsWith(item.href)
  const Icon = item.icon
  return (
    <Link
      href={item.href}
      aria-label={item.label}
      aria-current={isActive ? 'page' : undefined}
      className="flex flex-1 items-center justify-center py-3"
    >
      <Icon
        className={cn(
          'size-[22px] transition-all duration-200',
          isActive ? 'text-forest' : 'text-slate-300 hover:text-slate-500',
        )}
        strokeWidth={1.8}
      />
    </Link>
  )
}

export function MobileBottomNav() {
  const pathname = usePathname()
  const [menuOpen, setMenuOpen] = useState(false)

  const menuActive = menuHrefs.some((href) => pathname.startsWith(href))

  return (
    <>
      <nav
        aria-label="Navigasi utama"
        className="fixed inset-x-8 bottom-5 z-50 mx-auto flex h-16 max-w-sm items-center rounded-full bg-white/95 px-4 shadow-[0_24px_50px_-16px_rgba(0,0,0,0.18)] ring-1 ring-black/5 backdrop-blur-xl lg:hidden"
        style={{ marginBottom: 'max(0rem, env(safe-area-inset-bottom))' }}
      >
        <NavLink item={mainItems[0]} pathname={pathname} />
        <NavLink item={mainItems[1]} pathname={pathname} />

        {/* FAB (+) Catat — trigger drawer input transaksi */}
        <div className="flex flex-1 items-center justify-center">
          <AddTransactionDrawer
            trigger={
              <button
                type="button"
                aria-label="Catat transaksi"
                className="-mt-8 flex size-14 items-center justify-center rounded-full bg-[radial-gradient(circle_at_30%_25%,#ffffff,#e4eaff_35%,#cdd6f7_60%,#f3d9e8_85%)] text-zinc-900 shadow-[0_0_28px_rgba(180,195,255,0.55),0_10px_24px_-8px_rgba(0,0,0,0.6)] ring-1 ring-white/60 transition-transform duration-150 hover:scale-105 active:scale-95"
              >
                <Plus className="size-6" strokeWidth={2.4} />
              </button>
            }
          />
        </div>

        <NavLink item={mainItems[2]} pathname={pathname} />

        {/* Lainnya — buka vaul bottom sheet menu sekunder */}
        <button
          type="button"
          onClick={() => setMenuOpen(true)}
          aria-label="Menu lainnya"
          className="flex flex-1 items-center justify-center py-3"
        >
          <LayoutGrid
            className={cn(
              'size-[22px] transition-all duration-200',
              menuActive ? 'text-forest' : 'text-slate-300 hover:text-slate-500',
            )}
            strokeWidth={1.8}
          />
        </button>
      </nav>

      {/* Laci menu sekunder — struktur sama dengan sidebar desktop */}
      <Drawer.Root open={menuOpen} onOpenChange={setMenuOpen}>
        <Drawer.Portal>
          <Drawer.Overlay className="fixed inset-0 z-50 bg-black/40" />
          <Drawer.Content
            aria-label="Menu lainnya"
            className="fixed inset-x-0 bottom-0 z-50 mx-auto flex max-h-[85vh] w-full max-w-md flex-col rounded-t-[2rem] bg-white shadow-2xl outline-none"
          >
            {/* drag handle khas Vaul */}
            <div className="mx-auto mt-3 h-1.5 w-10 shrink-0 rounded-full bg-slate-200" />

            <div className="overflow-y-auto px-6 pb-10 pt-4">
              <Drawer.Title className="text-center text-base font-bold tracking-tight text-slate-950">
                Lainnya
              </Drawer.Title>
              <Drawer.Description className="sr-only">
                Menu sekunder CatetInd
              </Drawer.Description>

              {menuGroups.map((group) => (
                <section key={group.label} className="mt-6">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                    {group.label}
                  </p>
                  <div className="mt-3 grid grid-cols-3 gap-2.5">
                    {group.items.map(({ href, icon: Icon, label }) => {
                      const isActive = pathname.startsWith(href)
                      return (
                        <Link
                          key={href}
                          href={href}
                          onClick={() => setMenuOpen(false)}
                          aria-current={isActive ? 'page' : undefined}
                          className={cn(
                            'flex flex-col items-center gap-2 rounded-2xl px-2 py-4 text-center transition-all duration-150 active:scale-95',
                            isActive
                              ? 'bg-[#fff100]/25 font-semibold text-slate-950'
                              : 'bg-black/[0.03] font-medium text-slate-600 hover:bg-black/[0.05]',
                          )}
                        >
                          <Icon className="size-6 text-slate-900" />
                          <span className="text-xs font-medium leading-tight">
                            {label}
                          </span>
                        </Link>
                      )
                    })}
                  </div>
                </section>
              ))}
            </div>
          </Drawer.Content>
        </Drawer.Portal>
      </Drawer.Root>
    </>
  )
}

