'use client'

import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Plus, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useBodyScrollLock } from '@/hooks/use-body-scroll-lock'
import {
  TransactionInputEngine,
  type TransactionTypeId,
} from './transaction-input-engine'

/**
 * Shell WEB dari Transaction Input Engine (inventaris 97a/b/c).
 *
 * Dipicu tombol "+ Tambah Transaksi" di DesktopSidebar. Shell-nya mengikuti
 * konvensi modal CatetInd lain (lihat top-up-modal.tsx): sheet nempel bawah di
 * layar kecil, panel ngambang di tengah begitu viewport >= lg. Isinya tetap
 * engine yang sama dengan versi mobile — bedanya layout="dialog" (tipografi
 * lebih lega + tombol OCR/Voice jadi pil berlabel karena ruangnya cukup).
 */
export function TransactionWebModal({
  open,
  onOpenChange,
  defaultType = 'expense',
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  defaultType?: TransactionTypeId
}) {
  const panelRef = useRef<HTMLDivElement>(null)

  /**
   * Overlay HARUS hidup di `document.body`, bukan di dalam `<aside>` sidebar.
   * Alasannya: sidebar memakai `position: sticky`, dan elemen sticky otomatis
   * membentuk stacking context sendiri. Akibatnya `z-[75]` di sini cuma berlaku
   * DI DALAM konteks sidebar, sehingga panel tertimbun kartu-kartu dashboard
   * (yang di-paint belakangan di root karena berada setelah sidebar dalam urutan
   * DOM). Portal mengeluarkan panel dari konteks itu — cara yang sama dipakai
   * Radix/Vaul lewat `Drawer.Portal` — jadi panel benar-benar berada di atas.
   *
   * `portalReady` menjaga SSR & render pertama client tetap identik (keduanya
   * tidak me-render apa pun), baru setelah mount overlay dipindah ke body.
   */
  const [portalReady, setPortalReady] = useState(false)

  useBodyScrollLock(open)

  useEffect(() => {
    setPortalReady(true)
  }, [])

  /* ESC menutup panel + fokus pindah ke dialog saat dibuka (a11y). Auto-focus
     ke field nominal sendiri tetap dipegang engine lewat prop `active`. */
  useEffect(() => {
    if (!open) return

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') onOpenChange(false)
    }

    window.addEventListener('keydown', onKeyDown)
    const raf = requestAnimationFrame(() => panelRef.current?.focus())
    return () => {
      window.removeEventListener('keydown', onKeyDown)
      cancelAnimationFrame(raf)
    }
  }, [open, onOpenChange])

  const close = () => onOpenChange(false)

  /* isi overlay dipisah jadi variabel supaya markup-nya tidak perlu di-indent
     ulang saat dipindahkan ke portal */
  const overlay = (
    <div
      className={cn('fixed inset-0 z-[75]', !open && 'pointer-events-none')}
      inert={!open}
      aria-hidden={!open}
    >
      {/* backdrop — HANYA digelapkan, sengaja TANPA `backdrop-blur`.
          Alasan performa: `backdrop-filter` seluas viewport memaksa browser
          menghitung ulang blur tiap frame selama overlay beranimasi, dan
          konten di belakangnya memang repaint terus-menerus (komet
          CashFlowCard, ayunan tanaman, titik `animate-ping`) — hasilnya frame
          drop berat: buka/tutup modal terasa patah-patah. Blur sengaja tidak
          dipakai lagi di overlay fullscreen (lihat catatan di globals.css);
          fokus mata dijaga lewat kegelapan /60. Animasi opacity tetap
          dipertahankan supaya fade-nya mulus. */}
      <button
        type="button"
        aria-label="Tutup tambah transaksi"
        tabIndex={open ? 0 : -1}
        onClick={close}
        className={cn(
          'absolute inset-0 bg-ink/60 transition-opacity duration-300 ease-out',
          open ? 'opacity-100' : 'opacity-0',
        )}
      />

      {/* wrapper: sheet nempel bawah di mobile, panel ngambang di tengah di web */}
      <div
        className="pointer-events-none absolute inset-0 flex items-end justify-center lg:items-center lg:p-6"
        data-lenis-prevent
      >
        <div
          ref={panelRef}
          role="dialog"
          aria-modal="true"
          aria-labelledby="transaction-web-title"
          aria-describedby="transaction-web-desc"
          tabIndex={-1}
          className={cn(
            'pointer-events-auto flex max-h-[92vh] w-full flex-col overflow-hidden rounded-t-[2rem] bg-[#ffffff] shadow-[0_-24px_60px_-24px_rgba(69,89,78,0.55)] ring-1 ring-soil/12 outline-none',
            'transition-[transform,opacity] duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] will-change-transform',
            'lg:max-w-lg lg:rounded-[2rem] lg:shadow-[0_28px_70px_-24px_rgba(69,89,78,0.5)]',
            open
              ? 'translate-y-0 opacity-100 lg:scale-100'
              : 'translate-y-full opacity-0 lg:translate-y-6 lg:scale-95',
          )}
        >
          {/* handle drag (visual, cuma bentuk sheet di layar kecil) */}
          <div
            className="mx-auto mt-3 h-1.5 w-10 shrink-0 rounded-full bg-ink/15 lg:hidden"
            aria-hidden
          />

          {/* header — tetap diam, tidak ikut scroll */}
          <div className="flex shrink-0 items-start gap-3 px-5 pt-5 sm:px-6">
            <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-forest text-mint">
              <Plus className="size-5" strokeWidth={2.4} />
            </span>
            <div className="min-w-0 flex-1">
              <h2
                id="transaction-web-title"
                className="text-xl font-semibold tracking-tight text-ink"
              >
                Tambah Transaksi
              </h2>
              <p
                id="transaction-web-desc"
                className="mt-0.5 text-[13px] leading-relaxed text-ink/55"
              >
                4 tap aja, kurang dari 10 detik ⚡
              </p>
            </div>
            <button
              type="button"
              aria-label="Tutup"
              onClick={close}
              className="flex size-9 shrink-0 items-center justify-center rounded-full bg-cream text-ink ring-1 ring-soil/12 transition-colors hover:bg-sage"
            >
              <X className="size-4" />
            </button>
          </div>

          {/* isi engine — satu-satunya sumber kebenaran form input transaksi */}
          <div className="overflow-y-auto px-5 pt-5 pb-6 sm:px-6">
            <TransactionInputEngine
              active={open}
              layout="dialog"
              defaultType={defaultType}
              onSubmitted={close}
            />
          </div>
        </div>
      </div>
    </div>
  )

  /* belum mount (SSR / paint pertama) → jangan render apa pun supaya markup
     server & client identik; setelah mount overlay hidup langsung di <body> */
  if (!portalReady) return null

  return createPortal(overlay, document.body)
}
