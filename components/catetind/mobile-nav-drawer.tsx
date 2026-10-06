'use client'

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { usePathname } from 'next/navigation'
import { Drawer } from 'vaul'
import { Menu } from 'lucide-react'
import { cn } from '@/lib/utils'
import { HOME_HEADER_COPY } from '@/lib/data/home'
import { DesktopSidebar } from './desktop-sidebar'

/* ── DRAWER NAVIGASI MOBILE (paket 64) ────────────────────────────────────────
   Header Dashboard dapat tombol hamburger, dan tombol itu membuka KONTEN sidebar
   desktop yang sama sebagai drawer geser dari kiri.

   Kenapa lewat provider, bukan state di satu komponen: tombolnya hidup di dalam
   header Dashboard (anak dari `ScreenShell`), sementara overlay drawer-nya harus
   menutupi SELURUH layar — jadi ia di-render oleh `ScreenShell` sendiri. Satu
   nilai `open` di provider ini yang menjembatani keduanya, sehingga tidak ada
   dua state yang bisa berbeda cerita (pola yang sama dengan MoneyContextProvider).

   Isi drawer = `<DesktopSidebar variant="drawer" />`: satu sumber navigasi
   (`lib/navigation.ts`) & satu markup, jadi tidak ada menu mobile kedua yang bisa
   melenceng dari desktop.
   ────────────────────────────────────────────────────────────────────────── */

interface MobileNavValue {
  open: boolean
  setOpen: (open: boolean) => void
  toggle: () => void
}

const MobileNavContext = createContext<MobileNavValue | null>(null)

export function MobileNavProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false)
  const toggle = useCallback(() => setOpen((current) => !current), [])
  const value = useMemo<MobileNavValue>(() => ({ open, setOpen, toggle }), [open, toggle])
  return <MobileNavContext.Provider value={value}>{children}</MobileNavContext.Provider>
}

/** dipakai tombol hamburger; melempar kalau dipakai di luar provider (bug nyata,
 *  bukan fallback senyap) */
export function useMobileNav(): MobileNavValue {
  const context = useContext(MobileNavContext)
  if (!context) throw new Error('useMobileNav harus dipakai di dalam MobileNavProvider')
  return context
}

/** tombol hamburger header mobile — membuka drawer konten sidebar */
export function MobileNavButton({ className }: { className?: string }) {
  const { setOpen } = useMobileNav()
  return (
    <button
      type="button"
      onClick={() => setOpen(true)}
      aria-label={HOME_HEADER_COPY.menuAria}
      className={cn(
        'flex size-9 shrink-0 items-center justify-center rounded-full bg-cream text-forest ring-1 ring-soil/12 transition-colors hover:bg-sage active:scale-95',
        className,
      )}
    >
      <Menu className="size-[18px]" strokeWidth={2.2} aria-hidden />
    </button>
  )
}

/** panel drawer yang menampilkan konten sidebar sebagai menu mobile */
export function MobileNavDrawer() {
  const { open, setOpen } = useMobileNav()
  const pathname = usePathname()

  /* menavigasi lewat drawer harus menutupnya — kalau tidak, drawer tetap terbuka
     di atas halaman tujuan (dan posisi scroll halaman baru terkunci) */
  useEffect(() => {
    setOpen(false)
  }, [pathname, setOpen])

  return (
    <Drawer.Root open={open} onOpenChange={setOpen} direction="left">
      <Drawer.Portal>
        <Drawer.Overlay className="fixed inset-0 z-[80] bg-ink/60 lg:hidden" />
        <Drawer.Content
          aria-label={HOME_HEADER_COPY.menuAria}
          className="fixed inset-y-0 left-0 z-[80] flex w-[300px] max-w-[85vw] flex-col overflow-hidden rounded-r-[2rem] bg-cream shadow-[24px_0_60px_-30px_rgba(69,89,78,0.55)] outline-none lg:hidden"
        >
          <Drawer.Title className="sr-only">{HOME_HEADER_COPY.menuAria}</Drawer.Title>
          <div data-lenis-prevent className="h-full min-h-0 overflow-y-auto overscroll-contain">
            <DesktopSidebar variant="drawer" />
          </div>
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  )
}
