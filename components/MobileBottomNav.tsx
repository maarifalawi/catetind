'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Drawer } from 'vaul'
import { toast } from 'sonner'
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
  Download,
  type LucideIcon,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { SUBSCRIPTION_LOCK_COPY } from '@/lib/data/renewal'
import { useSubscriptionGate } from '@/components/catetind/subscription-gate-provider'
import { TransactionBottomSheet } from '@/components/dashboard/transaction-bottom-sheet'

type NavItem = { href: string; icon: LucideIcon; label: string }

const mainItems: NavItem[] = [
  { href: '/', icon: Home, label: 'Home' },
  { href: '/wallet', icon: Wallet, label: 'Wallet' },
  { href: '/history', icon: PieChart, label: 'Insight' },
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
      { href: '/install', icon: Download, label: 'Panduan Install' },
      { href: '/settings', icon: Settings, label: 'Pengaturan' },
    ],
  },
]

const menuHrefs = menuGroups.flatMap((g) => g.items.map((i) => i.href))

/**
 * Halaman yang tampil TANPA navigasi app sama sekali (bottom nav + FAB):
 *   1. `/app/onboarding` — flow full-screen 3 langkah: user fokus menyelesaikan
 *      setup dan tidak bisa "kabur" sebelum data wajib terisi (inventaris #10).
 *   2. `/checkout` — halaman PUBLIK pembelian (inventaris #3): tanpa bottom nav
 *      & FAB, supaya tidak ada jalan bercabang di tengah alur membayar.
 *   3. `/login` (+ `/login/verify`) — pintu masuk PUBLIK (inventaris #8/#9):
 *      user belum tentu punya akun, jadi tidak ada gunanya menawari navigasi app
 *      yang isinya data keuangan. Tautan keluar sudah tersedia di halamannya.
 *   4. `/join/[code]` — undangan dompet bersama (inventaris #7): yang membuka
 *      biasanya BELUM punya akun (pasangan/teman), jadi navigasi app di sini
 *      cuma bikin bingung. CTA-nya sendiri sudah sticky di zona ibu jari.
 *   5. `/share/[id]` — kartu pencapaian yang dibuka dari tautan share
 *      (inventaris #16): pengunjungnya bisa siapa saja dan belum tentu punya
 *      akun. Navigasi app di atas kartu orang lain malah mengganggu — halaman
 *      ini harus terasa seperti satu kartu, bukan seperti dashboard.
 *   6. `/privacy` & `/terms` — dokumen legal PUBLIK (inventaris #4/#5): dibaca
 *      orang yang ingin tahu datanya aman sebelum daftar. Bottom nav + FAB di
 *      sini bukan cuma mengganggu bacaan panjang, tapi juga menyiratkan user
 *      sudah punya data di dalam app.
 */
const FOCUS_ROUTES = [
  '/app/onboarding',
  '/checkout',
  '/login',
  '/join',
  '/share',
  '/privacy',
  '/terms',
]

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
          isActive ? 'text-forest' : 'text-ink/25 hover:text-ink/45',
        )}
        strokeWidth={1.8}
      />
    </Link>
  )
}

export function MobileBottomNav() {
  const pathname = usePathname()
  const [menuOpen, setMenuOpen] = useState(false)
  /* masa aktif habis → FAB ini satu-satunya pintu input dari bottom nav, jadi
     ia yang dikunci. Membaca data, pindah halaman, & menu "Lainnya" tetap jalan. */
  const { inputLocked } = useSubscriptionGate()

  const menuActive = menuHrefs.some((href) => pathname.startsWith(href))
  /* Halaman Joint Wallet punya FAB-nya sendiri (form transaksi + split +
     privasi), jadi FAB bottom-nav disembunyikan di sana supaya tetap hanya ada
     SATU tombol tambah di layar. */
  const isJointPage = pathname.startsWith('/joint')

  /* Flow fokus (onboarding & checkout) = tanpa navigasi bawah sama sekali:
     lihat catatan FOCUS_ROUTES di atas. */
  if (FOCUS_ROUTES.some((route) => pathname.startsWith(route))) return null

  return (
    <>
      <nav
        aria-label="Navigasi utama"
        className="fixed inset-x-8 bottom-5 z-40 mx-auto flex h-16 max-w-sm items-center rounded-full bg-cream/95 px-4 shadow-[0_24px_50px_-16px_rgba(0,0,0,0.18)] ring-1 ring-soil/12 backdrop-blur-xl lg:hidden"
        style={{ marginBottom: 'max(0rem, env(safe-area-inset-bottom))' }}
      >
        <NavLink item={mainItems[0]} pathname={pathname} />
        <NavLink item={mainItems[1]} pathname={pathname} />

        {/* FAB (+) Catat — langsung membuka Transaction Input Engine.
            Di /joint slot ini dikosongkan: halaman Joint punya FAB sendiri. */}
        <div className="flex flex-1 items-center justify-center">
          {isJointPage ? (
            <span aria-hidden className="size-14" />
          ) : inputLocked ? (
            /* Masa aktif habis → FAB dikunci (task 23). Sengaja TIDAK memakai
               atribut `disabled`: tombol mati yang bisu membuat user mengira
               appnya rusak. Dengan `aria-disabled` + toast, alasannya langsung
               terbaca ("Perpanjang dulu buat catat yang baru 🌿"). */
            <button
              type="button"
              aria-disabled="true"
              aria-label={SUBSCRIPTION_LOCK_COPY.fabAria}
              onClick={() => toast(SUBSCRIPTION_LOCK_COPY.inputHint)}
              className="-mt-8 flex size-14 items-center justify-center rounded-full bg-soil/[0.09] text-ink/30 ring-1 ring-soil/12 transition-transform duration-150 active:scale-95"
            >
              <Plus className="size-6" strokeWidth={2.4} />
            </button>
          ) : (
            <TransactionBottomSheet
              trigger={
                <button
                  type="button"
                  aria-label="Catat transaksi"
                  className="-mt-8 flex size-14 items-center justify-center rounded-full bg-[radial-gradient(circle_at_30%_25%,#ffffff,#ecd768_35%,#ffb885_60%,#b89191_85%)] text-ink shadow-[0_0_28px_rgba(236,215,104,0.55),0_10px_24px_-8px_rgba(0,0,0,0.6)] ring-1 ring-cream/60 transition-transform duration-150 hover:scale-105 active:scale-95"
                >
                  <Plus className="size-6" strokeWidth={2.4} />
                </button>
              }
            />
          )}
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
              menuActive ? 'text-forest' : 'text-ink/25 hover:text-ink/45',
            )}
            strokeWidth={1.8}
          />
        </button>
      </nav>

      {/* Laci menu sekunder — struktur sama dengan sidebar desktop */}
      <Drawer.Root open={menuOpen} onOpenChange={setMenuOpen}>
        <Drawer.Portal>
          <Drawer.Overlay className="fixed inset-0 z-[70] bg-soil/40" />
          <Drawer.Content
            aria-label="Menu lainnya"
            className="fixed inset-x-0 bottom-0 z-[70] mx-auto flex max-h-[85vh] w-full max-w-md flex-col rounded-t-[2rem] bg-cream shadow-2xl outline-none"
          >
            {/* drag handle khas Vaul */}
            <div className="mx-auto mt-3 h-1.5 w-10 shrink-0 rounded-full bg-oat" />

            <div className="overflow-y-auto px-6 pb-10 pt-4" data-lenis-prevent>
              <Drawer.Title className="text-center text-base font-bold tracking-tight text-ink">
                Lainnya
              </Drawer.Title>
              <Drawer.Description className="sr-only">
                Menu sekunder CatetInd
              </Drawer.Description>

              {menuGroups.map((group) => (
                <section key={group.label} className="mt-6">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-ink/35">
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
                              ? 'bg-[#ecd768]/25 font-semibold text-ink'
                              : 'bg-soil/[0.03] font-medium text-ink/55 hover:bg-soil/[0.11]',
                          )}
                        >
                          <Icon className="size-6 text-ink" />
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
