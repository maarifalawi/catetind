'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { BadgeCheck, ShoppingBag, X } from 'lucide-react'
import {
  LP_PURCHASE_NOTIF as COPY,
  purchaseNotificationsFromPurchases,
  randomPurchasePackageName,
  seededPurchaseNotifications,
  type PurchaseNotification,
  type RecentPurchaseItem,
} from '@/lib/data/landing'
import { cn } from '@/lib/utils'

/* ── NOTIFIKASI PEMBELIAN (landing & checkout) ────────────────────────────────
   "@rinajkt baru saja beli Paket Waras".

   Yang membuatnya tidak terbaca seperti template:
     1. URUTAN ACAK PER SESI. Seed dibuat sekali per tab (sessionStorage) lalu
        dipakai mengocok 36 akun. Pengunjung jam 1 siang dan jam 4 sore mendapat
        urutan berbeda; setiap putaran selesai, urutannya diacak ulang.
     2. POSISI DIINGAT. Pindah landing -> checkout melanjutkan rotasi, bukan
        mengulang dari nama pertama.
     3. TIDAK ADA NAMA BERURUTAN SAMA. Pemilih melewati nama yang barusan tampil.
     4. JEDA TIDAK TETAP. 8-16 detik, sesekali 22-34 detik. Bukan metronom.
     5. PAKET IKUT ACAK. Waras 60%, Sultan 40% (Catet Aja tidak dipakai).
     5. DATA NYATA DIDAHULUKAN. Pembelian dari feed (< 30 menit) tampil lebih
        dulu; feed dicek ulang tiap 45 detik supaya pembelian baru ikut muncul.
     6. VARIASI VISUAL. Kota, warna avatar, paket, dan label waktu ikut berubah.

   Aksesibilitas: satu toast pada satu waktu, role="status", tidak merebut fokus,
   tombol tutup menghentikan rotasi, dan reduced-motion menghapus geseran. */

const SEED_KEY = 'catetind:purchase-toast-seed'
const CURSOR_KEY = 'catetind:purchase-toast-cursor'
const LAST_KEY = 'catetind:purchase-toast-last'
const SEEN_KEY = 'catetind:purchase-toast-seen'

function sessionGet(key: string): string | null {
  try {
    return window.sessionStorage.getItem(key)
  } catch {
    return null
  }
}

function sessionSet(key: string, value: string) {
  try {
    window.sessionStorage.setItem(key, value)
  } catch {
    /* mode privat / storage penuh: rotasi tetap jalan tanpa memori sesi */
  }
}

function readSeed(): number {
  const saved = Number(sessionGet(SEED_KEY))
  if (Number.isFinite(saved) && saved > 0) return saved
  const seed = Math.floor(Math.random() * 2_147_483_647) || 1
  sessionSet(SEED_KEY, String(seed))
  return seed
}

/** PRNG kecil: urutan stabil selama satu sesi, berbeda antar sesi */
function mulberry32(seed: number): () => number {
  let state = seed >>> 0
  return () => {
    state = (state + 0x6d2b79f5) >>> 0
    let t = Math.imul(state ^ (state >>> 15), 1 | state)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4_294_967_296
  }
}

function shuffled<T>(items: readonly T[], random: () => number): T[] {
  const out = [...items]
  for (let i = out.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1))
    ;[out[i], out[j]] = [out[j], out[i]]
  }
  return out
}

function between(min: number, max: number): number {
  return min + Math.floor(Math.random() * (max - min + 1))
}

function readSeen(): Set<string> {
  const raw = sessionGet(SEEN_KEY)
  if (!raw) return new Set()
  try {
    const list = JSON.parse(raw) as unknown
    return new Set(
      Array.isArray(list) ? list.filter((item): item is string => typeof item === 'string') : [],
    )
  } catch {
    return new Set()
  }
}

function rememberSeen(seen: Set<string>, key: string) {
  seen.add(key)
  sessionSet(SEEN_KEY, JSON.stringify([...seen].slice(-40)))
}

export function LandingPurchaseToasts() {
  const reduceMotion = useReducedMotion()
  const [current, setCurrent] = useState<PurchaseNotification | null>(null)
  const [dismissed, setDismissed] = useState(false)
  const [ready, setReady] = useState(false)

  const seedRef = useRef(1)
  const shownRef = useRef(0)
  const poolRef = useRef<PurchaseNotification[]>([])
  const liveRef = useRef<PurchaseNotification[]>([])
  const lastHandleRef = useRef<string | null>(null)
  const seenRef = useRef<Set<string>>(new Set())

  /* init: seed sesi + posisi terakhir (lintas halaman dalam tab yang sama) */
  useEffect(() => {
    seedRef.current = readSeed()
    poolRef.current = seededPurchaseNotifications()

    const cursor = Number(sessionGet(CURSOR_KEY))
    shownRef.current = Number.isFinite(cursor) && cursor >= 0 ? Math.floor(cursor) : 0
    lastHandleRef.current = sessionGet(LAST_KEY)
    seenRef.current = readSeen()
    setReady(true)
  }, [])

  const ingest = useCallback((items: RecentPurchaseItem[]) => {
    const now = Date.now()
    const fresh = items.filter((item) => {
      const at = typeof item.at === 'string' ? Date.parse(item.at) : Number.NaN
      return Number.isFinite(at) && now - at < COPY.freshMs
    })
    if (fresh.length === 0) return

    const unseen = purchaseNotificationsFromPurchases(fresh, now).filter(
      (item) => !seenRef.current.has(item.id),
    )
    if (unseen.length === 0) return

    for (const item of unseen) rememberSeen(seenRef.current, item.id)
    liveRef.current = [...unseen, ...liveRef.current]
  }, [])

  /* feed nyata dicek berkala: pembelian baru muncul tanpa reload */
  useEffect(() => {
    let alive = true

    const load = async () => {
      try {
        const res = await fetch('/api/pricing/recent-purchases', { cache: 'no-store' })
        if (!res.ok) return
        const body = (await res.json()) as { items?: unknown }
        if (!alive || !Array.isArray(body.items)) return
        ingest(body.items as RecentPurchaseItem[])
      } catch {
        /* offline / feed kosong: rotasi contoh tetap jalan */
      }
    }

    void load()
    const timer = window.setInterval(() => void load(), 45_000)

    return () => {
      alive = false
      window.clearInterval(timer)
    }
  }, [ingest])

  /* penjadwal: ambil dari antrean NYATA dulu, lalu dari pool acak */
  useEffect(() => {
    if (!ready || dismissed) return
    let cancelled = false
    let hideId = 0
    let nextId = 0

    const pick = (): PurchaseNotification | null => {
      const live = liveRef.current.shift()
      if (live) return live

      const pool = poolRef.current
      if (pool.length === 0) return null

      /* Satu putaran = satu urutan acak; putaran berikutnya diacak lagi.
         `shownRef` disimpan agar pindah halaman tidak mengulang dari awal. */
      for (let attempt = 0; attempt < pool.length; attempt += 1) {
        const shown = shownRef.current + attempt
        const cycle = Math.floor(shown / pool.length)
        const position = shown % pool.length
        const order = shuffled(pool, mulberry32(seedRef.current + cycle * 7919))
        const item = order[position]
        if (!item || item.handle === lastHandleRef.current) continue

        shownRef.current = shown + 1
        sessionSet(CURSOR_KEY, String(shownRef.current))

        return {
          ...item,
          packageName: randomPurchasePackageName(),
          time: COPY.fallbackTimes[Math.floor(Math.random() * COPY.fallbackTimes.length)],
        }
      }
      return null
    }

    const tick = () => {
      if (cancelled) return
      const item = pick()
      if (!item) {
        nextId = window.setTimeout(tick, 8_000)
        return
      }

      lastHandleRef.current = item.handle
      sessionSet(LAST_KEY, item.handle)
      setCurrent(item)
      hideId = window.setTimeout(() => setCurrent(null), COPY.visibleMs)

      const gap =
        Math.random() < COPY.longGapChance
          ? between(COPY.longGapMinMs, COPY.longGapMaxMs)
          : between(COPY.minGapMs, COPY.maxGapMs)
      nextId = window.setTimeout(tick, COPY.visibleMs + gap)
    }

    nextId = window.setTimeout(tick, between(COPY.firstDelayMinMs, COPY.firstDelayMaxMs))

    return () => {
      cancelled = true
      window.clearTimeout(hideId)
      window.clearTimeout(nextId)
    }
  }, [ready, dismissed])

  const close = () => {
    setDismissed(true)
    setCurrent(null)
  }


  return (
    <div className="pointer-events-none fixed inset-x-3 bottom-4 z-50 flex justify-center landing:inset-x-auto landing:bottom-6 landing:left-6 landing:justify-start">
      <AnimatePresence>
        {current && !dismissed ? (
          <motion.div
            key={`${current.id}-${shownRef.current}`}
            role="status"
            aria-live="polite"
            initial={reduceMotion ? false : { opacity: 0, y: 18, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 10, scale: 0.98 }}
            transition={{ type: 'spring', bounce: 0.22, duration: 0.55 }}
            className="pointer-events-auto relative flex w-full max-w-[360px] items-center gap-3 overflow-hidden rounded-2xl border border-soil/10 bg-canvas/95 p-3 pr-2.5 shadow-landing-pop backdrop-blur-xl"
          >
            <span
              className={cn(
                'relative flex size-11 shrink-0 items-center justify-center rounded-2xl text-forest shadow-landing-frame',
                current.tone,
              )}
            >
              <span className="text-[14px] font-semibold">{current.initial}</span>
              <span className="absolute -right-1 -bottom-1 flex size-[18px] items-center justify-center rounded-full bg-forest text-cream ring-2 ring-canvas">
                <BadgeCheck className="size-3" strokeWidth={2.8} aria-hidden />
              </span>
            </span>

            <span className="min-w-0 flex-1">
              <span className="flex items-center gap-1.5 text-[9.5px] leading-none font-medium tracking-[0.16em] text-forest-muted uppercase">
                <ShoppingBag className="size-3" strokeWidth={2.2} aria-hidden />
                {COPY.eyebrow}
              </span>
              <span className="mt-1.5 block truncate text-[12.5px] leading-[1.4] text-forest">
                <strong className="font-semibold">{current.handle}</strong>{' '}
                {COPY.prefix}{' '}
                <strong className="font-semibold">{current.packageName}</strong>
              </span>
              <span className="mt-1 block truncate text-[10.5px] leading-none text-forest-muted">
                {current.city ? `${current.city} · ` : ''}
                {current.time}
              </span>
            </span>

            <button
              type="button"
              onClick={close}
              aria-label={COPY.dismissAria}
              className="flex size-7 shrink-0 items-center justify-center rounded-full text-forest-muted transition-colors hover:bg-sage hover:text-forest focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-forest/30"
            >
              <X className="size-3.5" strokeWidth={2.4} aria-hidden />
            </button>

            {reduceMotion ? null : (
              <motion.span
                aria-hidden
                initial={{ scaleX: 1 }}
                animate={{ scaleX: 0 }}
                transition={{ duration: COPY.visibleMs / 1000, ease: 'linear' }}
                className="absolute inset-x-0 bottom-0 h-0.5 origin-left bg-mint"
              />
            )}
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  )
}

