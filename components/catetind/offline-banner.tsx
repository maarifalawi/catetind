'use client'

import { useEffect, useState } from 'react'
import { CloudOff, RefreshCw, X } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { OFFLINE_COPY } from '@/lib/data/offline'
import { readOnline, subscribeConnection, syncConnection } from '@/lib/connection'
import { flushPendingSync, pendingSyncCount, useMoneyStore } from '@/lib/money/store'

/* ── Banner Offline & Antrean Lokal (paket 42 · audit Stage 5 #3–#4) ─────────
   Tiga hal yang dulu tidak ada sama sekali di app ini, dan semuanya soal
   kepercayaan user:

     1. KETIKA OFFLINE — user diberi tahu (bukan dibiarkan mengira catatannya
        "terkirim"): "Offline — catatanmu aman di perangkat";
     2. BERAPA YANG MENUNGGU — angka antrean dibaca dari SUMBER yang sama dengan
        baris ledger (`pendingSyncCount(snapshot)`), bukan penghitung terpisah
        yang bisa melenceng dari daftar catatan;
     3. SAAT INTERNET BALIK — antreannya benar-benar diproses (`flushPendingSync`)
        dan hasilnya dikatakan lewat toast.

   BATAS JUJUR (ditulis di banner, bukan cuma di komentar kode): tanpa backend,
   "tersinkron" = "sudah tersimpan di IndexedDB perangkat ini". Tidak ada satu pun
   request jaringan yang dikirim dari sini. Di produksi, `flushPendingSync()`
   menjadi kiriman `POST /api/transactions` per baris antrean dengan
   `clientTxId` sebagai Idempotency-Key.

   `sticky top-0` seperti banner langganan, dengan z-index lebih tinggi supaya
   saat keduanya muncul user tetap melihat kabar offline-nya. Bisa ditutup (X) —
   tapi begitu kejadian berikutnya datang (offline lagi), ia muncul kembali. */

export function OfflineBanner() {
  /* angka antrean hidup di snapshot uang — satu sumber dengan baris ledger */
  const snapshot = useMoneyStore()
  /** status sebenarnya baru dibaca SETELAH mount: server & render pertama client
   *  sama-sama menganggap online, jadi tidak ada hydration mismatch */
  const [online, setOnline] = useState(true)
  const [mounted, setMounted] = useState(false)
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    setMounted(true)

    /**
     * Baca ulang status dari browser. `applyQueue` = true saat kita baru tahu
     * jaringan ADA (event `online` atau mount) — di situlah antrean dikirim.
     * Sejak paket 45 pengirimannya NYATA (ke Supabase), jadi hasilnya ditunggu:
     * pesan "N catatan terkirim" hanya muncul setelah server benar-benar menerima.
     */
    async function refresh(applyQueue: boolean) {
      syncConnection()
      const next = readOnline()
      setOnline(next)
      if (next && applyQueue) {
        const processed = await flushPendingSync()
        if (processed > 0) {
          toast.success(OFFLINE_COPY.syncedTitle, {
            description: OFFLINE_COPY.syncedBody(processed),
          })
        }
      }
      /* offline baru datang → banner yang pernah ditutup muncul lagi */
      if (!next) setDismissed(false)
    }

    void refresh(true)
    const unsubscribe = subscribeConnection(() => setOnline(readOnline()))
    const handleOnline = () => void refresh(true)
    const handleOffline = () => void refresh(false)

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    return () => {
      unsubscribe()
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  if (!mounted) return null

  const pending = pendingSyncCount(snapshot)
  /* tidak ada yang perlu dikatakan: online & antrean kosong */
  if (dismissed || (online && pending === 0)) return null

  return (
    <div
      role="status"
      aria-live="polite"
      className={cn(
        'sticky top-0 z-[46] w-full px-4 py-2.5 ring-1 ring-inset backdrop-blur-md',
        /* margin (bukan padding) supaya kotaknya benar-benar MULAI di kanan
           sidebar desktop — pola yang sama dengan `subscription-banner.tsx` */
        'transition-[margin-left] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none',
        'lg:ml-[var(--catet-sidebar-w,280px)]',
        online ? 'bg-sage/90 ring-soil/12' : 'bg-hud-amber/20 ring-hud-amber/35',
      )}
    >
      <div className="mx-auto flex max-w-5xl flex-wrap items-center gap-x-3 gap-y-1.5">
        <span
          className={cn(
            'flex size-8 shrink-0 items-center justify-center rounded-full',
            online ? 'bg-forest/10 text-forest' : 'bg-hud-amber/35 text-hud-terracotta',
          )}
        >
          {online ? (
            <RefreshCw className="size-4" strokeWidth={2.2} aria-hidden />
          ) : (
            <CloudOff className="size-4" strokeWidth={2.2} aria-hidden />
          )}
        </span>

        <div className="min-w-0 flex-1">
          <p className="text-[13px] font-semibold text-ink">
            {online ? OFFLINE_COPY.pendingTitle : OFFLINE_COPY.offlineTitle}
            {pending > 0 && (
              <span className="ml-2 rounded-full bg-cream/80 px-2 py-0.5 text-[10.5px] font-semibold tabular-nums text-ink/60">
                {OFFLINE_COPY.pendingBadge(pending)}
              </span>
            )}
          </p>
          <p className="mt-0.5 text-[11.5px] leading-relaxed text-ink/55">
            {online ? OFFLINE_COPY.pendingBody(pending) : OFFLINE_COPY.offlineBody(pending)}
          </p>
          {/* batas jujur — selalu ikut, supaya tidak ada klaim "terkirim ke server" */}
          <p className="mt-0.5 text-[10.5px] leading-relaxed text-ink/40">
            {OFFLINE_COPY.honestyNote}
          </p>
        </div>

        {/* tombol ini benar-benar bekerja (`flushPendingSync`) — bukan pajangan */}
        {online && pending > 0 && (
          <button
            type="button"
            onClick={() => {
              void (async () => {
                const processed = await flushPendingSync()
                if (processed > 0) {
                  toast.success(OFFLINE_COPY.syncedTitle, {
                    description: OFFLINE_COPY.syncedBody(processed),
                  })
                }
              })()
            }}
            className="shrink-0 rounded-full bg-forest px-4 py-2 text-xs font-semibold text-cream transition-colors hover:bg-forest-soft active:scale-95"
          >
            {OFFLINE_COPY.pendingCta}
          </button>
        )}

        <button
          type="button"
          aria-label={OFFLINE_COPY.dismissLabel}
          onClick={() => setDismissed(true)}
          className="flex size-8 shrink-0 items-center justify-center rounded-full text-ink/40 transition-colors hover:bg-soil/10 hover:text-ink"
        >
          <X className="size-3.5" strokeWidth={2.4} />
        </button>
      </div>
    </div>
  )
}
