'use client'

import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Bell } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { NOTIF_NUDGE_COPY, NOTIF_NUDGE_KEY } from '@/lib/data/bills'

/* ── Nudge aktivasi notifikasi ───────────────────────────────────────────────
   Muncul HANYA saat izin notifikasi belum pernah diminta (`default`) — jadi
   banner ini tidak pernah muncul untuk user yang sudah bilang ya, dan tidak
   pernah memaksa yang sudah memblokir (mereka dapat penjelasan singkat saja).

   'Nanti aja' disimpan permanen di localStorage: sekali ditolak, banner ini
   tidak balik lagi di sesi/bulan berikutnya.

   REDESAIN: banner dipadatkan jadi SATU baris (ikon + teks + tombol inline);
   kalimat penjelas kedua dicabut supaya tidak memakan tinggi daftar.

   Izin dibaca SETELAH mount (`permission` mulai 'loading') supaya HTML server
   dan client identik — `Notification.permission` tidak ada saat SSR.
   ────────────────────────────────────────────────────────────────────────── */

type Permission = 'loading' | 'default' | 'granted' | 'denied' | 'unsupported'

const EASE: [number, number, number, number] = [0.22, 1, 0.36, 1]

export function BillNotifNudge({ className }: { className?: string }) {
  const [permission, setPermission] = useState<Permission>('loading')
  /** true = jangan tampilkan (aman sampai preferensi localStorage terbaca) */
  const [dismissed, setDismissed] = useState(true)

  useEffect(() => {
    try {
      setDismissed(localStorage.getItem(NOTIF_NUDGE_KEY) === '1')
    } catch {
      setDismissed(false)
    }

    if (typeof window === 'undefined' || !('Notification' in window)) {
      setPermission('unsupported')
      return
    }
    setPermission(Notification.permission as Permission)
  }, [])

  /** 'Aktifkan' — minta izin; kalau ditolak, jangan diganggu lagi */
  async function activate() {
    if (typeof window === 'undefined' || !('Notification' in window)) return
    try {
      const result = await Notification.requestPermission()
      setPermission(result as Permission)
      if (result === 'granted') {
        toast.success('Notifikasi tagihan aktif! 🔔', {
          description: 'Kamu bakal diingatkan sebelum jatuh tempo.',
        })
      } else if (result === 'denied') {
        try {
          localStorage.setItem(NOTIF_NUDGE_KEY, '1')
        } catch {
          /* storage diblokir — cukup sembunyikan banner sesi ini */
        }
        setDismissed(true)
      }
    } catch {
      /* browser tanpa Notification API — tidak ada yang bisa dilakukan */
    }
  }

  /** 'Nanti' — ditolak permanen (localStorage) */
  function dismiss() {
    try {
      localStorage.setItem(NOTIF_NUDGE_KEY, '1')
    } catch {
      /* storage diblokir — minimal banner hilang untuk sesi ini */
    }
    setDismissed(true)
  }

  const visible = !dismissed && (permission === 'default' || permission === 'denied')

  return (
    <AnimatePresence initial={false}>
      {visible && (
        <motion.section
          key="bill-notif-nudge"
          aria-label="Aktivasi notifikasi tagihan"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.28, ease: EASE }}
          className={cn(
            'flex items-center gap-3 rounded-2xl bg-hud-amber/12 px-3.5 py-2.5 ring-1 ring-inset ring-hud-amber/25',
            className,
          )}
        >
          <span aria-hidden className="shrink-0 text-[15px] leading-none">
            🔔
          </span>
          <p className="min-w-0 flex-1 text-[12px] font-medium leading-snug text-forest">
            {NOTIF_NUDGE_COPY}
          </p>

          {permission === 'default' ? (
            <>
              <button
                type="button"
                onClick={activate}
                className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-forest px-3 py-1.5 text-[11.5px] font-medium text-mint transition-colors hover:bg-forest-soft active:scale-[0.97]"
              >
                <Bell className="size-3.5" strokeWidth={2.4} aria-hidden />
                Aktifkan
              </button>
              <button
                type="button"
                onClick={dismiss}
                className="shrink-0 text-[11.5px] font-medium text-forest/45 transition-colors hover:text-forest/75"
              >
                Nanti
              </button>
            </>
          ) : (
            <span className="shrink-0 text-[11px] font-medium text-forest/50">
              Diblokir di browser
            </span>
          )}
        </motion.section>
      )}
    </AnimatePresence>
  )
}
