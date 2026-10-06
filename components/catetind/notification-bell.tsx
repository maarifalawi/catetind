'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { Bell, BellOff, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import { HOME_HEADER_COPY, HOME_NOTIFICATION_COPY } from '@/lib/data/home'

/* ── LONCENG NOTIFIKASI + PANEL (paket 64) ────────────────────────────────────
   Dulu lonceng di header desktop cuma `Link` ke /settings/notifications, dan di
   header mobile tidak ada sama sekali. Sekarang satu komponen dipakai di kedua
   tempat: menyapa user dengan panel ringan dulu, baru menawarkan halaman
   pengaturan lewat satu CTA di ujung panel.

   Keadaan kosong dibuat "selesai", bukan buntu: ikon BellOff, satu judul, satu
   penjelasan, dan jalan ke pengaturan. Panel menempel pada tombolnya (`absolute`)
   supaya terasa satu kesatuan — bukan dialog yang menghijack seluruh layar.
   Lebarnya `min(20rem, 100vw - 2rem)` supaya tetap muat di layar sempit.
   ────────────────────────────────────────────────────────────────────────── */

export function NotificationBell({ className }: { className?: string }) {
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)
  const reduceMotion = useReducedMotion()

  /* tutup saat klik di luar atau menekan Escape — pola dropdown yang bisa
     diharapkan; dibersihkan saat panel tertutup supaya tidak ada listener diam */
  useEffect(() => {
    if (!open) return
    function onPointerDown(event: PointerEvent) {
      const target = event.target as Node | null
      if (rootRef.current && target && !rootRef.current.contains(target)) setOpen(false)
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') setOpen(false)
    }
    document.addEventListener('pointerdown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('pointerdown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [open])

  return (
    <div ref={rootRef} className={cn('relative', className)}>
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        aria-label={HOME_HEADER_COPY.notificationsLabel}
        aria-expanded={open}
        aria-haspopup="dialog"
        /* UKURAN = TOMBOL TETANGGA (rapi-ukuran paket 70). Dulu loncengnya MATI
           di `size-11` (44px) sementara tombol mata & menu `size-9` (36px) — di
           header mobile lonceng tampak "besar sendiri" dan barisnya jadi tidak
           simetris. Sekarang ia 36px di mobile (sama persis dengan tetangganya)
           dan tetap 44px mulai `lg:` supaya sejajar dengan avatar desktop. */
        className="relative flex size-9 shrink-0 items-center justify-center rounded-full bg-cream text-forest ring-1 ring-soil/12 transition-colors hover:bg-sage active:scale-95 lg:size-11"
      >
        <Bell className="size-4" aria-hidden />
        {/* dot kecil = penanda "ada yang baru" (mock: belum ada, jadi statis) */}
        <span aria-hidden className="absolute right-3 top-3 size-2 rounded-full bg-mint ring-2 ring-cream" />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            role="dialog"
            aria-label={HOME_NOTIFICATION_COPY.title}
            initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: -6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: -6, scale: 0.98 }}
            transition={{ duration: reduceMotion ? 0 : 0.18, ease: [0.22, 1, 0.36, 1] }}
            /* MOBILE: panel dilebarkan sepanjang layar (`fixed inset-x-4`) supaya
               tidak terpotong di layar sempit — lonceng bukan elemen paling kanan,
               jadi panel yang hanya `absolute right-0` akan meluber keluar tepi.
               DESKTOP: kembali menjadi dropdown yang menempel di lonceng. */
            className="fixed inset-x-4 top-16 z-50 rounded-3xl bg-cream p-4 ring-1 ring-soil/12 shadow-[0_24px_60px_-28px_rgba(69,89,78,0.55)] lg:absolute lg:inset-x-auto lg:right-0 lg:top-[calc(100%+0.5rem)] lg:w-[20rem]"
          >
            <p className="font-display text-[14px] font-medium tracking-tight text-forest">
              {HOME_NOTIFICATION_COPY.title}
            </p>

            <div className="mt-3 flex flex-col items-center rounded-2xl bg-sage/50 px-4 py-6 text-center ring-1 ring-soil/8">
              <span className="flex size-11 items-center justify-center rounded-full bg-cream text-forest/70 ring-1 ring-soil/12">
                <BellOff className="size-5" strokeWidth={2} aria-hidden />
              </span>
              <p className="mt-3 text-[13px] font-medium text-forest">
                {HOME_NOTIFICATION_COPY.emptyTitle}
              </p>
              <p className="mt-1 text-[11.5px] leading-relaxed text-forest/55">
                {HOME_NOTIFICATION_COPY.emptyBody}
              </p>
            </div>

            <Link
              href={HOME_NOTIFICATION_COPY.settingsHref}
              onClick={() => setOpen(false)}
              className="mt-3 flex items-center justify-between rounded-2xl bg-forest px-4 py-2.5 text-[12.5px] font-medium text-cream transition-colors hover:bg-forest-soft active:scale-[0.99]"
            >
              {HOME_NOTIFICATION_COPY.settingsLink}
              <ChevronRight className="size-4" strokeWidth={2.6} aria-hidden />
            </Link>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
