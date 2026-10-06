'use client'

import { useEffect, useMemo, useState } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import {
  LIVE_FEED_COPY,
  LIVE_FEED_SEED,
  LIVE_FEED_VISIBLE,
  TESTIMONIALS,
  TESTIMONIALS_COPY,
  formatIDR,
} from '@/lib/data/landing'

/* ── SECTION 4 · SOCIAL PROOF ────────────────────────────────────────────────
   Part A: feed pembelian SEMENTARA (seeded). Komponen ini sengaja dibentuk
   sebagai satu blok yang kelak cukup diganti sumber datanya (satu query
   Supabase) — tata letak & animasinya tidak perlu ikut berubah.
   Part B: 5 testimoni — carousel geser-snap di mobile, grid di desktop. */
export function SocialProof() {
  return (
    <section
      aria-labelledby="social-proof-title"
      className="border-t border-soil/8 py-16 lg:py-24"
    >
      <div className="mx-auto w-full max-w-[1120px] px-5 sm:px-6 lg:px-8">
        <h2 id="social-proof-title" className="sr-only">
          Bukti sosial
        </h2>
        <div className="grid grid-cols-1 gap-10 lg:grid-cols-[minmax(0,360px)_minmax(0,1fr)] lg:gap-12">
          <LiveFeed />
          <Testimonials />
        </div>
      </div>
    </section>
  )
}

/* ── Part A · Live purchase feed ──────────────────────────────────────────── */
function LiveFeed() {
  const reduceMotion = useReducedMotion()
  /* jendela berputar: tampilkan LIVE_FEED_VISIBLE entri, geser satu tiap 3,2s
     supaya terasa "hidup" tanpa menambah data palsu */
  const [start, setStart] = useState(0)

  useEffect(() => {
    if (reduceMotion) return
    const timer = window.setInterval(() => {
      setStart((current) => (current + 1) % LIVE_FEED_SEED.length)
    }, 3200)
    return () => window.clearInterval(timer)
  }, [reduceMotion])

  const visible = useMemo(() => {
    const total = LIVE_FEED_SEED.length
    return Array.from({ length: LIVE_FEED_VISIBLE }, (_, index) => LIVE_FEED_SEED[(start + index) % total])
  }, [start])

  return (
    <div className="rounded-[1.75rem] bg-cream p-5 ring-1 ring-soil/12">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-[11px] font-medium tracking-[0.14em] text-forest uppercase">
            {LIVE_FEED_COPY.eyebrow}
          </p>
          <h3 className="mt-1 font-display text-lg font-medium tracking-tight text-forest">
            {LIVE_FEED_COPY.title}
          </h3>
        </div>
        <span className="flex items-center gap-1.5 rounded-full bg-plum/12 px-2.5 py-1 text-[10px] font-medium tracking-wider text-plum">
          <span className="relative flex size-1.5">
            {!reduceMotion && (
              <span className="absolute inline-flex size-full animate-ping rounded-full bg-plum opacity-70" />
            )}
            <span className="relative inline-flex size-1.5 rounded-full bg-plum" />
          </span>
          {LIVE_FEED_COPY.liveBadge}
        </span>
      </div>

      <ul aria-label={LIVE_FEED_COPY.ariaLive} className="mt-4 flex flex-col gap-2">
        <AnimatePresence mode="popLayout">
          {visible.map((entry, index) => (
            <motion.li
              key={entry.id}
              layout={!reduceMotion}
              aria-label={LIVE_FEED_COPY.entry(entry)}
              initial={reduceMotion ? false : { opacity: 0, x: -18 }}
              animate={{ opacity: 1, x: 0 }}
              exit={reduceMotion ? undefined : { opacity: 0, x: 18 }}
              transition={{ duration: 0.36, delay: reduceMotion ? 0 : index * 0.08 }}
              className="flex items-center gap-2 rounded-2xl bg-sage/40 px-3.5 py-2.5 text-[12.5px] leading-snug"
            >
              <span aria-hidden className="shrink-0">
                🌿
              </span>
              <span className="min-w-0 flex-1 truncate text-forest/70">
                <span className="font-medium text-forest">{entry.name}</span> dari {entry.city} ·
                bergabung di harga{' '}
                <span className="font-medium text-forest tabular-nums">
                  {formatIDR(entry.price)}
                </span>{' '}
                · {entry.time}
              </span>
            </motion.li>
          ))}
        </AnimatePresence>
      </ul>
    </div>
  )
}

/* ── Part B · Testimonials ────────────────────────────────────────────────── */
function Testimonials() {
  return (
    <div>
      <p className="text-[11px] font-medium tracking-[0.14em] text-forest uppercase">
        {TESTIMONIALS_COPY.eyebrow}
      </p>
      <h3 className="mt-1 font-display text-2xl font-medium tracking-tight text-forest lg:text-3xl">
        {TESTIMONIALS_COPY.title}
      </h3>

      {/* mobile: carousel geser-snap · desktop: grid */}
      <div className="hide-scrollbar mt-5 -mx-5 flex snap-x snap-mandatory gap-4 overflow-x-auto px-5 pb-2 sm:mx-0 sm:px-0 md:grid md:grid-cols-2 md:overflow-visible lg:grid-cols-3">
        {TESTIMONIALS.map((t) => (
          <article
            key={t.id}
            className="flex w-[85%] shrink-0 snap-center flex-col rounded-[1.5rem] bg-cream p-5 ring-1 ring-soil/12 md:w-auto md:shrink"
          >
            <div className="flex items-center gap-3">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-forest font-display text-base font-medium text-cream">
                {TESTIMONIALS_COPY.initial(t)}
              </span>
              <div className="min-w-0">
                <p className="truncate text-[13.5px] font-medium text-forest">{t.name}</p>
                <p className="truncate text-[11px] text-forest/45">{TESTIMONIALS_COPY.meta(t)}</p>
              </div>
            </div>
            <p className="mt-4 flex-1 text-[13px] leading-relaxed text-forest/75">“{t.quote}”</p>
          </article>
        ))}
      </div>
    </div>
  )
}
