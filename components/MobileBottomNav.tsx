'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Drawer } from 'vaul'
import { motion, useReducedMotion } from 'framer-motion'
import { toast } from 'sonner'
import { Plus, LayoutGrid, ArrowLeftRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useNavCompact } from '@/hooks/use-nav-compact'
import { SUBSCRIPTION_LOCK_COPY } from '@/lib/data/renewal'
import { TRANSFER_DOOR_COPY } from '@/lib/data/add-wallet'
import { MOBILE_NAV_COPY } from '@/lib/data/mobile-nav'
import {
  MOBILE_MENU_GROUPS,
  MOBILE_PRIMARY_ITEMS,
  NAV_HREFS,
  type NavItem,
} from '@/lib/navigation'
import { useSubscriptionGate } from '@/components/catetind/subscription-gate-provider'
import { TransactionBottomSheet } from '@/components/dashboard/transaction-bottom-sheet'
import { TransferFlow } from '@/components/catetind/transfer-flow'

/* Navigasi (tab bawah + laci "Lainnya") = SATU sumber di `lib/navigation.ts`,
   dibagi dengan sidebar desktop — dulu daftar ini ditulis dua kali dan label
   grupnya sudah melenceng antar platform (audit "Navigation Clunkiness"). */

/**
 * NAVIGASI BAWAH SELALU TAMPIL (PAKET 70).
 *
 * PRD 2A.5 menulis nav bawah "FIXED, STICKY, selalu visible". Sempat menyimpang
 * satu langkah (nav menyingkir saat menggulir ke bawah) atas permintaan pemilik
 * produk, tetapi permintaan TERBARU membalikkannya: "navigasi utama di-fix aja,
 * jangan di-hide, selalu stay". Jadi nav ini sekarang benar-benar FIXED dan
 * selalu terlihat — tidak ada lagi transform/inert yang menyembunyikannya.
 *
 * Perulangan auto-hide-nya TIDAK dibuang: hook murninya (`useNavAutoHide`)
 * sekarang dipakai HEADER Dashboard mobile (lihat `MobileStickyHeader`), karena
 * pemilik produk justru meminta perlakuan itu untuk header.
 */

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
 *   7. `/welcome` — halaman depan PUBLIK (inventaris #2): layar pertama sebelum
 *      punya akun. Navigasi app di sini akan menawarkan halaman yang datanya
 *      belum ada — CTA-nya sendiri sudah menuju daftar/masuk.
 *   8. `/` — LANDING PAGE publik (inventaris #1–#2): sejak dashboard pindah ke
 *      `/app`, root adalah halaman pemasaran. Pengunjung di sini belum punya
 *      akun, jadi navigasi app di sini salah tempat. Pencocokannya EXACT `/`
 *      (lihat `isFocusRoute` di bawah) supaya tidak menyerap `/app`, `/wallet`.
 *   9. `/registered` — halaman "Terima kasih" setelah registrasi dari landing:
 *      satu layar penutup alur, tanpa navigasi app.
 */
const FOCUS_ROUTES = [
  '/',
  '/registered',
  '/app/onboarding',
  '/welcome',
  '/checkout',
  '/login',
  '/join',
  '/share',
  '/privacy',
  '/terms',
]

function NavLink({
  item,
  pathname,
  compact,
}: {
  item: NavItem
  pathname: string
  /** nav sedang menyusut (digulir ke bawah) — py & ikon lebih kecil (paket 75) */
  compact: boolean
}) {
  const isActive =
    item.href === '/' || item.href === '/app'
      ? pathname === item.href
      : pathname.startsWith(item.href)
  const Icon = item.icon
  return (
    <Link
      href={item.href}
      aria-label={item.label}
      aria-current={isActive ? 'page' : undefined}
      className={cn(
        'flex flex-1 items-center justify-center',
        /* padding & transisi sama dengan kontainer nav supaya menyusut terasa
           satu gerakan, bukan dua elemen yang bergerak sendiri-sendiri */
        'transition-[padding] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none',
        compact ? 'py-2' : 'py-3',
      )}
    >
      <Icon
        className={cn(
          'transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none',
          compact ? 'size-[18px]' : 'size-[22px]',
          isActive ? 'text-forest' : 'text-forest/25 hover:text-forest/45',
        )}
        strokeWidth={1.8}
      />
    </Link>
  )
}

export function MobileBottomNav() {
  const pathname = usePathname()
  const [menuOpen, setMenuOpen] = useState(false)
  /**
   * Alur “Pindah Dana” (paket 55). Sebelum paket ini bottom nav tidak punya
   * pintu pindah dana sama sekali: satu-satunya jalan adalah popover di kartu
   * dompet /wallet — dan aksi yang hanya hidup di menu tersembunyi adalah aksi
   * yang tidak terlihat sebagai fitur (temuan uji pemakaian 28 Sep 2026).
   * Sheet-nya SATU komponen dengan pintu lain (`TransferFlow`), jadi tidak ada
   * alur transfer kedua; `source` sengaja `null` karena dari menu ini user belum
   * memilih dompet asalnya — langkah pertamanya memilih, bukan menebak.
   */
  const [transferOpen, setTransferOpen] = useState(false)
  /* masa aktif habis → FAB ini satu-satunya pintu input dari bottom nav, jadi
     ia yang dikunci. Membaca data, pindah halaman, & menu "Lainnya" tetap jalan. */
  const { inputLocked } = useSubscriptionGate()
  /* NAV DINAMIS (paket 75): menggulir ke bawah → nav memadat (py-2, ikon lebih
     kecil); menggulir ke atas → kembali penuh. Aturannya di
     `hooks/use-nav-compact.ts` (fungsi murni + test). `useReducedMotion` dipakai
     untuk mematikan animasi pegas FAB bagi user yang meminta gerak minimal. */
  const compact = useNavCompact()
  const reduceMotion = useReducedMotion()

  const menuActive = NAV_HREFS.some((href) => pathname.startsWith(href))
  /* Halaman Joint Wallet punya FAB-nya sendiri (form transaksi + split +
     privasi), jadi FAB bottom-nav disembunyikan di sana supaya tetap hanya ada
     SATU tombol tambah di layar. */
  const isJointPage = pathname.startsWith('/joint')

  /* Flow fokus (landing, onboarding & checkout) = tanpa navigasi bawah sama
     sekali: lihat catatan FOCUS_ROUTES di atas. `/` dicocokkan EXACT — kalau
     memakai `startsWith('/')`, SEMUA route akan ikut cocok dan nav tak pernah
     tampil. */
  const isFocusRoute = FOCUS_ROUTES.some((route) =>
    route === '/' ? pathname === '/' : pathname.startsWith(route),
  )

  /* Nav SELALU tampil (paket 70) + MENYUSUT saat digulir ke bawah (paket 75).
     Tidak ada lagi `useNavAutoHide` di sini — aturan auto-hide-nya dipakai
     header mobile (`MobileStickyHeader`); yang tersisa di bawah cuma perubahan
     KERAPATAN (`compact`), bukan menyembunyikan nav. */

  if (isFocusRoute) return null

  return (
    <>
      <nav
        aria-label={MOBILE_NAV_COPY.navAria}
        className={cn(
          'fixed inset-x-8 bottom-5 z-40 mx-auto flex max-w-sm items-center rounded-full bg-cream/95 shadow-[0_24px_50px_-16px_rgba(0,0,0,0.18)] ring-1 ring-soil/12 backdrop-blur-xl lg:hidden',
          /* tinggi + padding + easing halus, sejalan dengan penyusutan isinya */
          'transition-[height,padding] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none',
          compact ? 'h-14 px-3.5' : 'h-16 px-4',
        )}
        style={{ marginBottom: 'max(0rem, env(safe-area-inset-bottom))' }}
      >
        <NavLink item={MOBILE_PRIMARY_ITEMS[0]} pathname={pathname} compact={compact} />
        <NavLink item={MOBILE_PRIMARY_ITEMS[1]} pathname={pathname} compact={compact} />

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
              className="-mt-8 flex size-14 items-center justify-center rounded-full bg-soil/[0.09] text-forest/30 ring-1 ring-soil/12 transition-transform duration-150 active:scale-95"
            >
              <Plus className="size-6" strokeWidth={2.4} />
            </button>
          ) : (
            /* FAB "Catat" memakai WARNA BRAND (keluarga forest/sage), bukan lagi
               gradien pelangi — paket 75, permintaan pemilik produk. Aksennya
               dibuat lewat inset shadow (highlight atas + bayangan dalam bawah =
               tombol terasa timbul) plus glow luar; tap-nya memakai pegas framer
               `whileTap` supaya terasa kenyal. Saat `prefers-reduced-motion`,
               pegas dimatikan dan hanya glownya yang berubah. */
            <TransactionBottomSheet
              trigger={
                <motion.button
                  type="button"
                  aria-label={MOBILE_NAV_COPY.addAria}
                  whileTap={reduceMotion ? undefined : { scale: 0.9 }}
                  whileHover={reduceMotion ? undefined : { scale: 1.05 }}
                  transition={{ type: 'spring', stiffness: 460, damping: 17 }}
                  className="group -mt-8 flex size-14 items-center justify-center rounded-full bg-gradient-to-br from-forest-soft to-forest text-mint ring-1 ring-forest/30 shadow-[inset_0_1.5px_0_rgba(255,255,255,0.28),inset_0_-3px_8px_rgba(0,0,0,0.35),0_12px_28px_-10px_rgba(69,89,78,0.75)] transition-shadow duration-200 hover:shadow-[inset_0_1.5px_0_rgba(255,255,255,0.35),inset_0_-3px_8px_rgba(0,0,0,0.3),0_16px_34px_-10px_rgba(69,89,78,0.9)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-forest/40 focus-visible:ring-offset-2 focus-visible:ring-offset-cream"
                >
                  <Plus
                    className="size-6 transition-transform duration-200 group-active:scale-90"
                    strokeWidth={2.6}
                  />
                </motion.button>
              }
            />
          )}
        </div>

        <NavLink item={MOBILE_PRIMARY_ITEMS[2]} pathname={pathname} compact={compact} />

        {/* Lainnya — buka vaul bottom sheet menu sekunder */}
        <button
          type="button"
          onClick={() => setMenuOpen(true)}
          aria-label={MOBILE_NAV_COPY.moreAria}
          className={cn(
            'flex flex-1 items-center justify-center',
            'transition-[padding] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none',
            compact ? 'py-2' : 'py-3',
          )}
        >
          <LayoutGrid
            className={cn(
              'transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none',
              compact ? 'size-[18px]' : 'size-[22px]',
              menuActive ? 'text-forest' : 'text-forest/25 hover:text-forest/45',
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
              <Drawer.Title className="text-center text-base font-medium tracking-tight text-forest">
                Lainnya
              </Drawer.Title>
              <Drawer.Description className="sr-only">
                Menu sekunder CatetInd
              </Drawer.Description>

              {/* ── AKSI CEPAT: PINDAH DANA (paket 55) ──────────────────────
                  Bukan Link, karena ia membuka alur (sheet), bukan pindah
                  halaman — dan menutup laci ini lebih dulu supaya dua lapisan
                  sheet tidak bertumpuk di layar kecil. */}
              <section className="mt-6">
                <p className="text-[11px] font-medium uppercase tracking-wider text-forest/35">
                  {TRANSFER_DOOR_COPY.menuGroupLabel}
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setMenuOpen(false)
                    setTransferOpen(true)
                  }}
                  className="mt-3 flex w-full items-center gap-3 rounded-2xl bg-soil/[0.03] px-3.5 py-3.5 text-left transition-all duration-150 hover:bg-soil/[0.11] active:scale-[0.99]"
                >
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-sage text-forest">
                    <ArrowLeftRight className="size-[18px]" strokeWidth={2.2} aria-hidden />
                  </span>
                  <span className="min-w-0">
                    <span className="block text-[13px] font-medium text-forest">
                      {TRANSFER_DOOR_COPY.menuLabel}
                    </span>
                    <span className="mt-0.5 block text-[11px] text-forest/45">
                      {TRANSFER_DOOR_COPY.menuHint}
                    </span>
                  </span>
                </button>
              </section>

              {MOBILE_MENU_GROUPS.map((group) => (
                <section key={group.label} className="mt-6">
                  <p className="text-[11px] font-medium uppercase tracking-wider text-forest/35">
                    {group.label}
                  </p>
                  <div className="mt-3 grid grid-cols-3 gap-2.5">
                    {group.items.map(({ href, icon: Icon, label, hint }) => {
                      const isActive = pathname.startsWith(href)
                      return (
                        <Link
                          key={href}
                          href={href}
                          onClick={() => setMenuOpen(false)}
                          title={hint}
                          aria-current={isActive ? 'page' : undefined}
                          className={cn(
                            'flex flex-col items-center gap-1.5 rounded-2xl px-2 py-3.5 text-center transition-all duration-150 active:scale-95',
                            isActive
                              ? 'bg-[#ecd768]/25 font-medium text-forest'
                              : 'bg-soil/[0.03] font-medium text-forest/55 hover:bg-soil/[0.11]',
                          )}
                        >
                          <Icon className="size-6 text-forest" />
                          <span className="text-xs font-medium leading-tight">
                            {label}
                          </span>
                          {/* keterangan singkat (audit "Navigation Clunkiness"):
                              satu baris konteks supaya tiap tujuan jelas tanpa
                              perlu membukanya dulu */}
                          <span className="text-[10px] font-normal leading-snug text-forest/40">
                            {hint}
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

      {/* alur pindah dana dari menu “Lainnya” — asal BELUM dipilih, jadi sheet
          membuka langkah 1 (pemilih dompet asal) lebih dulu (paket 55) */}
      <TransferFlow open={transferOpen} onOpenChange={setTransferOpen} />
    </>
  )
}
