'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { Bell, Check, ChevronRight, Trash2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { HOME_HEADER_COPY } from '@/lib/data/home'
import {
  clearNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  unreadNotificationCount,
  useNotifications,
} from '@/lib/money/notification-store'

/* ── LONCENG NOTIFIKASI + PANEL (hidup) ───────────────────────────────────────
   Sumber item: `lib/money/notification-store.ts` — diisi otomatis oleh lapisan
   data (kas, tagihan, celengan, dompet bersama, budget). Komponen ini hanya
   menyajikan: lencana jumlah belum dibaca, daftar rapi, "Tandai semua dibaca",
   "Bersihkan", dan tautan ke halaman terkait saat item diketuk.

   Panel menempel pada tombolnya di desktop dan melebar di mobile supaya tidak
   terpotong. Tidak ada item hiasan: saat kosong, cukup satu ikon + satu
   kalimat + satu jalan ke pengaturan. */

/** "baru saja" / "12 mnt lalu" / "3 j lalu" / "2 h lalu" */
function relativeTime(iso: string): string {
  const then = new Date(iso).getTime()
  if (!Number.isFinite(then)) return ''
  const minutes = Math.max(0, Math.round((Date.now() - then) / 60000))
  if (minutes < 1) return 'baru saja'
  if (minutes < 60) return `${minutes} mnt lalu`
  const hours = Math.round(minutes / 60)
  if (hours < 24) return `${hours} j lalu`
  return `${Math.round(hours / 24)} h lalu`
}

export function NotificationBell({ className }: { className?: string }) {
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)
  const reduceMotion = useReducedMotion()
  const notifications = useNotifications()
  const unread = unreadNotificationCount(notifications)
  const items = notifications.items

  /* tutup saat klik di luar atau menekan Escape */
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
        className="relative flex size-9 shrink-0 items-center justify-center rounded-full bg-cream text-forest ring-1 ring-soil/12 transition-colors hover:bg-sage active:scale-95 lg:size-11"
      >
        <Bell className="size-4" aria-hidden />
        {unread > 0 && (
          <span
            aria-label={`${unread} belum dibaca`}
            className="absolute -right-0.5 -top-0.5 flex min-w-[17px] items-center justify-center rounded-full bg-hud-terracotta px-1 text-[10px] font-semibold leading-[17px] text-cream ring-2 ring-cream"
          >
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            role="dialog"
            aria-label="Notifikasi"
            initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: -6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: -6, scale: 0.98 }}
            transition={{ duration: reduceMotion ? 0 : 0.18, ease: [0.22, 1, 0.36, 1] }}
            className="fixed inset-x-4 top-16 z-50 flex max-h-[70dvh] flex-col overflow-hidden rounded-2xl bg-cream ring-1 ring-soil/12 shadow-[0_24px_60px_-28px_rgba(0,0,0,0.55)] lg:absolute lg:inset-x-auto lg:right-0 lg:top-[calc(100%+0.5rem)] lg:w-[22rem]"
          >
            <div className="flex items-center justify-between gap-2 border-b border-soil/10 px-4 py-3">
              <p className="text-[14px] font-semibold tracking-tight text-forest">Notifikasi</p>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={markAllNotificationsRead}
                  disabled={unread === 0}
                  title="Tandai semua dibaca"
                  aria-label="Tandai semua dibaca"
                  className="flex size-8 items-center justify-center rounded-full text-forest-muted transition-colors hover:bg-sage hover:text-forest disabled:opacity-40"
                >
                  <Check className="size-4" strokeWidth={2.4} aria-hidden />
                </button>
                <button
                  type="button"
                  onClick={clearNotifications}
                  disabled={items.length === 0}
                  title="Bersihkan"
                  aria-label="Bersihkan notifikasi"
                  className="flex size-8 items-center justify-center rounded-full text-forest-muted transition-colors hover:bg-plum/15 hover:text-plum disabled:opacity-40"
                >
                  <Trash2 className="size-4" strokeWidth={2.2} aria-hidden />
                </button>
              </div>
            </div>

            {items.length === 0 ? (
              <div data-catetind-empty className="flex flex-col items-center px-6 py-8 text-center">
                <p className="mt-2 text-[13px] text-forest-muted">Belum ada notifikasi.</p>
              </div>
            ) : (
              <ul className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
                {items.map((item) => (
                  <li key={item.id}>
                    <Link
                      href={item.href}
                      onClick={() => {
                        markNotificationRead(item.id)
                        setOpen(false)
                      }}
                      className={cn(
                        'flex items-start gap-2.5 px-4 py-3 transition-colors hover:bg-sage/40',
                        !item.read && 'bg-sage/25',
                      )}
                    >
                      <span
                        aria-hidden
                        className={cn(
                          'mt-1.5 size-1.5 shrink-0 rounded-full',
                          item.read ? 'bg-soil/20' : 'bg-hud-terracotta',
                        )}
                      />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[13px] font-medium text-forest">
                          {item.title}
                        </span>
                        {item.body && (
                          <span className="mt-0.5 block truncate text-[12px] text-forest-muted">
                            {item.body}
                          </span>
                        )}
                      </span>
                      <span className="shrink-0 text-[10.5px] tabular-nums text-forest-muted">
                        {relativeTime(item.createdAt)}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}

            <Link
              href="/settings/notifications"
              onClick={() => setOpen(false)}
              className="flex shrink-0 items-center justify-between border-t border-soil/10 px-4 py-2.5 text-[12.5px] font-medium text-forest transition-colors hover:bg-sage/50"
            >
              Pengaturan notifikasi
              <ChevronRight className="size-3.5" strokeWidth={2.6} aria-hidden />
            </Link>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
