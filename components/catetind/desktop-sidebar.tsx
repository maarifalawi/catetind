'use client'

import Image from 'next/image'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
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
  PanelLeftClose,
  PanelLeftOpen,
  Download,
  ArrowLeftRight,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import { SUBSCRIPTION_LOCK_COPY } from '@/lib/data/renewal'
import { TRANSFER_DOOR_COPY } from '@/lib/data/add-wallet'
import { TransactionWebModal } from '@/components/dashboard/transaction-web-modal'
import { TransferFlow } from './transfer-flow'
import { useSubscriptionGate } from './subscription-gate-provider'
import { AiFuelCard } from './ai-fuel-card'
import { LogoWordmark } from './logo-wordmark'
import { NavTooltip } from './nav-tooltip'

/* ── CATATAN: ENTRI /family DIHAPUS — KEPUTUSAN SADAR (task 06) ───────────────
   Dulu grup `Aset & Bersama` punya satu entri menu menuju halaman bernama
   "Family Wallet". Entri itu masuk lewat skrip sekali-pakai
   (`temp-write-sidebar.js`, sudah dihapus) dan halamannya cuma markup mentah
   yang tidak ada di `inventaris_ui_definitif.md`. PRD 2C.2 menegaskan
   "Keluarga" adalah KONTEKS uang (Pribadi / Keluarga / Bersama), bukan halaman
   terpisah — hidup di `ContextSwitcher` + `MoneyContextProvider`, dan itu tetap
   apa adanya. Jangan menghidupkan lagi tautan ini tanpa keputusan produk:
   PRD 2A.6 melarang dua jalur navigasi paralel (pelajaran dari Fundy), dan
   modul keluarga yang nyata butuh inventaris baru dulu (PRD 758–807, 3303–3352).
   Alasan yang sama berlaku untuk route /more: menu "Lainnya" = Vaul bottom sheet
   di `MobileBottomNav`, jadi route-nya juga sudah dihapus. */
const sections = [
  {
    label: 'Menu Utama',
    items: [
      { href: '/', icon: Home, label: 'Dashboard' },
      { href: '/history', icon: PieChart, label: 'Riwayat & Insight' },
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
      { href: '/install', icon: Download, label: 'Panduan Install' },
    ],
  },
  {
    label: 'Sistem',
    items: [{ href: '/settings', icon: Settings, label: 'Pengaturan' }],
  },
]

const COLLAPSED_KEY = 'catet-sidebar-collapsed'

/** lebar sidebar (px) — dipakai `aside` DAN variabel CSS untuk kolom konten.
 *  Audit UX #10: expanded dinaikkan 264 → 280 supaya teks status AI di kartu
 *  "Bahan Bakar AI" (mis. "Voice 5 j 59 m sisa") punya ruang cukup dan tidak
 *  pernah terpotong. */
const SIDEBAR_WIDTH = { expanded: 280, collapsed: 76 } as const

/** nama variabel CSS tempat lebar sidebar dipublikasikan ke kolom konten */
const SIDEBAR_WIDTH_VAR = '--catet-sidebar-w'

/* ── CATATAN: "KONTEKS UANG" DIPINDAHKAN KELUAR DARI SIDEBAR ──────────────────
   Blok switcher Pribadi/Keluarga/Bersama (dulu `EnvironmentSwitch`, lengkap
   dengan label "Konteks Uang" di atasnya) DIHAPUS dari sidebar supaya kolom
   navigasi hanya berisi menu + aksi. State-nya sendiri tetap hidup di
   `MoneyContextProvider` (root layout), jadi switcher yang muncul di header
   mobile halaman Dashboard & Budget tetap berfungsi normal. */

export function DesktopSidebar() {
  const pathname = usePathname()
  const [addOpen, setAddOpen] = useState(false)
  /**
   * Alur “Pindah Dana” (paket 55) — entri sidebar ini membuka SHEET, bukan
   * halaman: `TransferFlow` yang sama dengan pintu lain (popover kartu dompet,
   * dompet detail, menu “Lainnya”). Dompet asalnya belum dipilih di sini, jadi
   * sheet membuka langkah 1 (pemilih dompet) — bukan menebak dompet konteks.
   */
  const [transferOpen, setTransferOpen] = useState(false)
  const [collapsed, setCollapsed] = useState(false)
  /* pintu masuk input utama di desktop (pasangan FAB mobile) — dikunci saat masa
     aktif habis. Navigasi & pembacaan data tidak tersentuh. */
  const { inputLocked } = useSubscriptionGate()

  // hidrasi preferensi collapse dari localStorage (setelah mount,
  // supaya server & client render identik dan tidak ada hydration mismatch)
  useEffect(() => {
    setCollapsed(localStorage.getItem(COLLAPSED_KEY) === '1')
  }, [])

  useEffect(() => {
    localStorage.setItem(COLLAPSED_KEY, collapsed ? '1' : '0')
    /* Publikasikan lebar sidebar ke CSS var: sidebar-nya `fixed` (keluar dari
       alur), jadi kolom konten yang menggeser dirinya sendiri (lihat
       screen-shell.tsx). Nilai dipasang di <html> supaya terbaca lintas pohon,
       dan transisi padding di kolom konten dibikin sama durasinya supaya
       buka/tutup sidebar tetap terasa satu gerakan. */
    const root = document.documentElement
    root.style.setProperty(
      SIDEBAR_WIDTH_VAR,
      `${collapsed ? SIDEBAR_WIDTH.collapsed : SIDEBAR_WIDTH.expanded}px`,
    )
    return () => {
      root.style.removeProperty(SIDEBAR_WIDTH_VAR)
    }
  }, [collapsed])

  // shortcut modern ala Linear: "[" untuk toggle sidebar
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== '[') return
      const target = e.target as HTMLElement | null
      if (target?.closest('input, textarea, select, [contenteditable]')) return
      setCollapsed((v) => !v)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])

  return (
    <aside
      className={cn(
        /* `fixed`, BUKAN `sticky`: saat drawer/modal terbuka, scroll-lock
           (react-remove-scroll lewat Vaul/Radix) menjadikan <body> sebagai
           scroll container (`overflow: hidden`). Elemen `sticky` lalu mengikat
           diri ke scroll container terdekat — yaitu <body> yang scrollTop-nya 0
           — sehingga sidebar tampak "geser ke atas" sejauh offset scroll
           halaman. Elemen `fixed` selalu mengikat ke viewport, jadi kebal.
           Konsekuensinya kolom konten digeser lewat var --catet-sidebar-w
           (dipublikasikan di effect atas, dibaca screen-shell.tsx). */
        'fixed inset-y-0 left-0 z-30 hidden flex-col border-r border-ink/[0.06] bg-cream px-4 py-5 transition-[width] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] lg:flex',
        collapsed ? 'w-[76px]' : 'w-[280px]',
      )}
    >
      {/* ── header: wordmark + toggle collapse ─────────────────────── */}
      <div
        className={cn(
          'flex items-center',
          collapsed ? 'flex-col gap-3' : 'justify-between',
        )}
      >
        <div
          className={cn(
            'overflow-hidden transition-all duration-300',
            collapsed ? 'w-0 opacity-0' : 'w-auto opacity-100',
          )}
        >
          <LogoWordmark className="h-6 pl-1" />
        </div>
        <button
          type="button"
          onClick={() => setCollapsed((v) => !v)}
          aria-expanded={!collapsed}
          aria-label={collapsed ? 'Buka sidebar' : 'Tutup sidebar'}
          title={collapsed ? 'Buka sidebar  [  ]' : 'Tutup sidebar  [  ]'}
          className="flex size-8 shrink-0 items-center justify-center rounded-full text-ink/40 ring-1 ring-ink/[0.08] transition-all duration-200 hover:bg-cream hover:text-ink active:scale-95"
        >
          {collapsed ? (
            <PanelLeftOpen className="size-4" strokeWidth={2} />
          ) : (
            <PanelLeftClose className="size-4" strokeWidth={2} />
          )}
        </button>
      </div>

      {/* ── quick action — buka laci input transaksi (Inventaris 97a) ──
          Saat masa aktif habis tombolnya jadi non-aktif + menjelaskan alasannya
          lewat toast (bukan tombol bisu), lihat task 23. */}
      <button
        type="button"
        onClick={() =>
          inputLocked ? toast(SUBSCRIPTION_LOCK_COPY.inputHint) : setAddOpen(true)
        }
        aria-disabled={inputLocked || undefined}
        aria-label={inputLocked ? SUBSCRIPTION_LOCK_COPY.addAria : undefined}
        title={inputLocked ? SUBSCRIPTION_LOCK_COPY.inputHint : undefined}
        className={cn(
          'group/item relative mt-6 flex items-center justify-center gap-2 rounded-full transition-all duration-300',
          inputLocked
            ? 'cursor-not-allowed bg-ink/[0.07] text-ink/35'
            : 'bg-forest text-cream hover:bg-forest-soft active:scale-[0.97]',
          collapsed ? 'mx-auto size-11' : 'w-full py-2.5 text-[13px] font-semibold',
        )}
      >
        <Plus
          className={cn('shrink-0', collapsed ? 'size-5' : 'size-4')}
          strokeWidth={2.5}
        />
        <span
          className={cn(
            'max-w-[140px] overflow-hidden whitespace-nowrap transition-all duration-300',
            collapsed ? 'max-w-0 opacity-0' : 'opacity-100',
          )}
        >
          Tambah Transaksi
        </span>
        {collapsed && <NavTooltip label="Tambah Transaksi" />}
      </button>

      {/* ── navigasi ───────────────────────────────────────────────── */}
      {/* min-h-0 WAJIB: di flex column, `min-height:auto` membuat daftar menu
          menolak menyusut — akibatnya kartu Bahan Bakar AI & baris profil di
          bawah tertindih/terpotong saat viewport pendek. Dengan min-h-0 daftar
          menu yang menyusut + menggulir sendiri, dan elemen bawah tetap utuh. */}
      <nav
        data-lenis-prevent
        className={cn(
          'sidebar-scroll -mx-1 mt-7 min-h-0 flex-1 space-y-6 px-1',
          collapsed ? 'overflow-visible' : 'overflow-y-auto overflow-x-hidden',
        )}
      >
        {sections.map((section) => (
          <div key={section.label}>
            {collapsed ? (
              <div className="mx-3 mb-2 h-px bg-ink/[0.07]" aria-hidden />
            ) : (
              <p className="px-3.5 pb-1.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-ink/30">
                {section.label}
              </p>
            )}
            <div className="flex flex-col gap-0.5">
              {section.items.map(({ href, icon: Icon, label }) => {
                const isActive = pathname === href
                return (
                  <Link
                    key={href}
                    href={href}
                    aria-current={isActive ? 'page' : undefined}
                    className={cn(
                      'group/item relative flex items-center text-[13px] transition-all duration-200',
                      collapsed
                        ? 'justify-center rounded-2xl px-0 py-2.5'
                        : 'gap-3 rounded-full px-3.5 py-2',
                      isActive
                        ? 'bg-forest/[0.07] font-semibold text-forest'
                        : 'font-medium text-ink/55 hover:bg-ink/[0.03] hover:text-ink',
                    )}
                  >
                    <Icon
                      className="size-[18px] shrink-0"
                      strokeWidth={isActive ? 2.2 : 1.8}
                    />
                    <span
                      className={cn(
                        'overflow-hidden whitespace-nowrap transition-all duration-300',
                        collapsed
                          ? 'max-w-0 opacity-0'
                          : 'max-w-[160px] opacity-100',
                      )}
                    >
                      {label}
                    </span>
                    {collapsed && <NavTooltip label={label} />}
                  </Link>
                )
              })}

              {/* ── PINDAH DANA (paket 55) ────────────────────────────────────
                  Satu-satunya entri di sidebar yang BUKAN tautan halaman: ia
                  membuka alur (sheet) yang sama dengan popover kartu dompet,
                  tombol di dompet detail, dan menu “Lainnya” di mobile. Dulu
                  aksi ini tidak punya pintu apa pun di desktop selain popover
                  kecil di dalam kartu — aksi yang tersembunyi di situasi yang
                  sama dengan “tidak ada fiturnya”. */}
              {section.label === 'Kelola Uang' && (
                <button
                  type="button"
                  onClick={() => setTransferOpen(true)}
                  title={TRANSFER_DOOR_COPY.menuHint}
                  className={cn(
                    'group/item relative flex w-full items-center text-[13px] font-medium text-ink/55 transition-all duration-200 hover:bg-ink/[0.03] hover:text-ink',
                    collapsed
                      ? 'justify-center rounded-2xl px-0 py-2.5'
                      : 'gap-3 rounded-full px-3.5 py-2',
                  )}
                >
                  <ArrowLeftRight className="size-[18px] shrink-0" strokeWidth={1.8} />
                  <span
                    className={cn(
                      'overflow-hidden whitespace-nowrap text-left transition-all duration-300',
                      collapsed ? 'max-w-0 opacity-0' : 'max-w-[160px] opacity-100',
                    )}
                  >
                    {TRANSFER_DOOR_COPY.menuLabel}
                  </span>
                  {collapsed && <NavTooltip label={TRANSFER_DOOR_COPY.menuLabel} />}
                </button>
              )}
            </div>
          </div>
        ))}

        {/* logout — bagian grup Sistem per inventaris */}
        <div>
          {collapsed && (
            <div className="mx-3 mb-2 h-px bg-ink/[0.07]" aria-hidden />
          )}
          {/* Keluar — dulu tombol MATI (tidak ada onClick). Route-nya sudah ada
              sejak lama (`/settings/logout` → panel konfirmasi keluar), jadi
              yang kurang cuma tautannya; sekarang ia jadi link seperti item
              navigasi lain di sidebar ini. */}
          <Link
            href="/settings/logout"
            className={cn(
              'group/item relative flex w-full items-center text-[13px] font-medium text-ink/55 transition-all duration-200 hover:bg-plum/15 hover:text-plum',
              collapsed
                ? 'justify-center rounded-2xl px-0 py-2.5'
                : 'gap-3 rounded-full px-3.5 py-2',
            )}
          >
            <LogOut className="size-[18px] shrink-0" strokeWidth={1.8} aria-hidden />
            <span
              className={cn(
                'overflow-hidden whitespace-nowrap transition-all duration-300',
                collapsed ? 'max-w-0 opacity-0' : 'max-w-[160px] opacity-100',
              )}
            >
              Keluar
            </span>
            {collapsed && <NavTooltip label="Keluar" />}
          </Link>
        </div>
      </nav>

        {/* ── BAHAN BAKAR AI ─────────────────────────────────────────────────
            Sisa kuota AI (token + voice) selalu terlihat di sidebar desktop;
            detail lengkapnya tetap di Settings → Billing (klik kartunya). */}
        <AiFuelCard collapsed={collapsed} />

      {/* ── profil user ────────────────────────────────────────────── */}
      <div
        className={cn(
          'mt-4 flex shrink-0 items-center border-t border-ink/[0.06] pt-4',
          collapsed ? 'justify-center' : 'gap-3 px-1.5',
        )}
      >
        <span
          className={cn(
            'relative shrink-0 overflow-hidden rounded-full ring-1 transition-shadow duration-200 hover:ring-2 hover:ring-forest/30',
            collapsed ? 'size-10' : 'size-9',
          )}
        >
          <Image
            src="/avatar-maarif.png"
            alt="Jon Snow"
            fill
            sizes="40px"
            className="object-cover"
          />
        </span>
        <div
          className={cn(
            'min-w-0 overflow-hidden transition-all duration-300',
            collapsed
              ? 'max-w-0 opacity-0'
              : 'max-w-[180px] flex-1 opacity-100',
          )}
        >
          <p className="truncate text-sm font-semibold text-ink">Jon Snow</p>
          <p className="truncate text-xs text-ink/45">jon@snow.com</p>
        </div>
      </div>

      {/* modal input transaksi versi WEB (inventaris 97a) — shell dialog yang
          membungkus engine yang sama dengan bottom sheet mobile */}
      <TransactionWebModal open={addOpen} onOpenChange={setAddOpen} />

      {/* alur pindah dana (paket 55) — sumber dompet asalnya dipilih di sheet */}
      <TransferFlow open={transferOpen} onOpenChange={setTransferOpen} />
    </aside>
  )
}

