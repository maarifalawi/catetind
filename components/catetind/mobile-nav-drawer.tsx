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
import { TransferFlow } from './transfer-flow'
import { TransactionWebModal } from '@/components/dashboard/transaction-web-modal'

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
  /**
   * Pindah Dana dari DALAM drawer. Sheet-nya di-host DI SINI (bukan di dalam
   * `DesktopSidebar`), karena drawer ditutup sebelum sheet dibuka — kalau
   * sheet hidup di dalam drawer, ia ikut ter-unmount dan pop-up langsung
   * hilang. `requestTransfer` menutup drawer lebih dulu, lalu membuka sheet
   * setelah drawer benar-benar lepas.
   */
  transferOpen: boolean
  setTransferOpen: (open: boolean) => void
  requestTransfer: () => void
  /** modal Catat dari dalam drawer — host-nya juga di luar drawer (alasan sama) */
  addOpen: boolean
  setAddOpen: (open: boolean) => void
  requestAdd: () => void
}

const MobileNavContext = createContext<MobileNavValue | null>(null)

export function MobileNavProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false)
  const [transferOpen, setTransferOpen] = useState(false)
  const [addOpen, setAddOpen] = useState(false)
  const toggle = useCallback(() => setOpen((current) => !current), [])
  const requestTransfer = useCallback(() => {
    setOpen(false)
    /* satu tick: drawer mulai menutup (vaul melepas overlay & scroll lock),
       baru sheet Pindah Dana dirender. Mengetuk input di sheet tidak lagi
       "bocor" ke overlay drawer yang menutupi layar. */
    window.setTimeout(() => setTransferOpen(true), 180)
  }, [])
  const requestAdd = useCallback(() => {
    setOpen(false)
    window.setTimeout(() => setAddOpen(true), 180)
  }, [])
  const value = useMemo<MobileNavValue>(
    () => ({
      open,
      setOpen,
      toggle,
      transferOpen,
      setTransferOpen,
      requestTransfer,
      addOpen,
      setAddOpen,
      requestAdd,
    }),
    [open, toggle, transferOpen, requestTransfer, addOpen, requestAdd],
  )
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
  const { open, setOpen, transferOpen, setTransferOpen, addOpen, setAddOpen } = useMobileNav()
  const pathname = usePathname()

  /* menavigasi lewat drawer harus menutupnya — kalau tidak, drawer tetap terbuka
     di atas halaman tujuan (dan posisi scroll halaman baru terkunci) */
  useEffect(() => {
    setOpen(false)
  }, [pathname, setOpen])

  return (
    <>
      <Drawer.Root open={open} onOpenChange={setOpen} direction="left">
      <Drawer.Portal>
        <Drawer.Overlay className="fixed inset-0 z-[80] bg-ink/60 lg:hidden" />
        <Drawer.Content
          aria-label={HOME_HEADER_COPY.menuAria}
          className="fixed inset-y-0 left-0 z-[80] flex w-[300px] max-w-[85vw] flex-col overflow-hidden rounded-r-[2rem] bg-cream shadow-[24px_0_60px_-30px_rgba(0,0,0,0.55)] outline-none lg:hidden"
        >
          <Drawer.Title className="sr-only">{HOME_HEADER_COPY.menuAria}</Drawer.Title>
          <div data-lenis-prevent className="h-full min-h-0 overflow-y-auto overscroll-contain">
            <DesktopSidebar variant="drawer" />
          </div>
        </Drawer.Content>
      </Drawer.Portal>
      </Drawer.Root>

      {/* Sheet Pindah Dana di-host di luar Drawer.Root: drawer sudah ditutup
          lebih dulu (lihat `requestTransfer`), jadi tidak ada dua lapisan
          modal yang saling menutup di layar kecil. */}
      <TransferFlow open={transferOpen} onOpenChange={setTransferOpen} />
      <TransactionWebModal open={addOpen} onOpenChange={setAddOpen} />
    </>
  )
}
