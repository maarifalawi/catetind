'use client'

import { useEffect, useState } from 'react'
import { Sparkles, Sprout, X } from 'lucide-react'
import { TransactionWebModal } from '@/components/dashboard/transaction-web-modal'
import { DEMO_MODE } from '@/lib/demo'
import { cn } from '@/lib/utils'

/* ── Slot Nudge Kontekstual (Habit Loop, PRD Domain 3A) ───────────────────────
   Satu slot KECIL yang sifatnya conditional: tempat AI ngobrol singkat dengan
   user. Sifatnya bukan banner promosi — ia cuma muncul kalau memang ada yang
   perlu diingatkan, dan boleh ditutup untuk hari itu.

   Pembagian peran (supaya tidak ada CTA dobel — pelajaran dari audit #1):
   · WeeklyRecapBanner  → rekap akhir pekan (Jumat–Minggu)
   · HomeBanners        → renewal, kuota AI, sinking fund nudge
   · DailyNudge (ini)   → "hari ini belum ada catatan" — satu-satunya nudge yang
     menyentuh kebiasaan harian, CTA-nya membuka modal input yang SAMA dengan
     tombol utama di sidebar (Single Entry Point). */

/** paksa tampil untuk kebutuhan review desain — perilaku produksi (default):
 *  nudge hanya muncul sore hari & hanya kalau hari ini belum dicatat.
 *  Saklarnya ikut `NEXT_PUBLIC_DEMO` (paket 42). */
const DEMO_FORCE_SHOW = DEMO_MODE

/** batas jam: sebelum ini, "belum catat" masih wajar (orang baru bangun) */
const HOUR_THRESHOLD = 15

const STORAGE_KEY = 'catet-ind-nudge-dismissed'

/** mock — nanti dari query transaksi hari ini */
const HAS_RECORD_TODAY = false

export function DailyNudge() {
  const [ready, setReady] = useState(false)
  const [dismissedOn, setDismissedOn] = useState<string | null>(null)
  const [addOpen, setAddOpen] = useState(false)

  /* semua gate dihitung di client setelah mount → server & client render identik */
  useEffect(() => {
    try {
      setDismissedOn(localStorage.getItem(STORAGE_KEY))
    } catch {
      /* localStorage diblokir — nudge tetap boleh tampil */
    }
    setReady(true)
  }, [])

  if (!ready) return null

  const today = new Date()
  const todayISO = today.toISOString().slice(0, 10)
  if (dismissedOn === todayISO) return null

  /* kondisi nudge: sore hari & hari ini belum ada catatan */
  const show = DEMO_FORCE_SHOW || (today.getHours() >= HOUR_THRESHOLD && !HAS_RECORD_TODAY)
  if (!show) return null

  const dismiss = () => {
    setDismissedOn(todayISO)
    try {
      localStorage.setItem(STORAGE_KEY, todayISO)
    } catch {
      /* diabaikan */
    }
  }

  return (
    <>
      <section
        aria-label="Catatan dari AI Coach"
        className={cn(
          'flex items-start gap-3 rounded-[2rem] bg-gradient-to-br from-sage/80 via-cream to-cream p-4 ring-1 ring-forest/10',
        )}
      >
        <span className="relative flex size-9 shrink-0 items-center justify-center rounded-full bg-cream text-forest ring-1 ring-soil/12">
          <Sprout className="size-4" strokeWidth={2.4} aria-hidden />
          <Sparkles
            className="absolute -right-0.5 -top-0.5 size-3 text-mint"
            strokeWidth={2.6}
            aria-hidden
          />
        </span>

        <div className="min-w-0 flex-1">
          <p className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-forest/60">
            AI Coach
          </p>
          <p className="mt-1 text-[13.5px] font-semibold leading-snug text-ink">
            Hari ini belum ada catatan nih 🌿
          </p>
          <p className="mt-1 text-[12.5px] leading-snug text-ink/55">
            Kopi atau ongkos tadi udah dicatat belum? Sekali catat, tanamanmu
            tetap segar dan Jatah Harian tetap akurat.
          </p>
          <button
            type="button"
            onClick={() => setAddOpen(true)}
            className="mt-2.5 inline-flex items-center gap-1.5 rounded-full bg-forest px-3.5 py-1.5 text-[12px] font-semibold text-cream transition-colors hover:bg-forest-soft active:scale-[0.97]"
          >
            Catat sekarang
          </button>
        </div>

        <button
          type="button"
          onClick={dismiss}
          aria-label="Tutup pengingat hari ini"
          className="flex size-7 shrink-0 items-center justify-center rounded-full text-ink/35 transition-colors hover:bg-soil/8 hover:text-ink"
        >
          <X className="size-3.5" strokeWidth={2.4} aria-hidden />
        </button>
      </section>

      {/* modal input yang sama dengan tombol utama di sidebar — Single Entry Point */}
      <TransactionWebModal open={addOpen} onOpenChange={setAddOpen} />
    </>
  )
}
