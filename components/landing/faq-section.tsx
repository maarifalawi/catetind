'use client'

import { useState } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'
import { FAQ_COPY, FAQ_ITEMS } from '@/lib/data/landing'

/* ── SECTION 6 · FAQ (accordion) ─────────────────────────────────────────────
   Tujuh bantahan yang paling sering muncul. Satu item terbuka pertama supaya
   section ini langsung terlihat "bisa dibuka", bukan deretan judul mati. */
export function FaqSection() {
  const reduceMotion = useReducedMotion()
  const [openId, setOpenId] = useState<string | null>(FAQ_ITEMS[0]?.id ?? null)

  return (
    <section
      aria-labelledby="faq-title"
      className="border-t border-soil/8 bg-sage/25 py-16 lg:py-24"
    >
      <div className="mx-auto w-full max-w-[820px] px-5 sm:px-6 lg:px-8">
        <header className="text-center">
          <p className="text-[11px] font-medium tracking-[0.16em] text-forest uppercase">
            {FAQ_COPY.eyebrow}
          </p>
          <h2
            id="faq-title"
            className="mt-2 font-display text-3xl font-medium tracking-tight text-forest lg:text-4xl"
          >
            {FAQ_COPY.title}
          </h2>
        </header>

        <div className="mt-8 flex flex-col gap-3">
          {FAQ_ITEMS.map((item) => {
            const open = openId === item.id
            return (
              <div
                key={item.id}
                className="overflow-hidden rounded-2xl bg-cream ring-1 ring-soil/12"
              >
                <button
                  type="button"
                  aria-expanded={open}
                  aria-label={FAQ_COPY.toggle(open, item.question)}
                  onClick={() => setOpenId(open ? null : item.id)}
                  className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left transition-colors hover:bg-sage/40 motion-reduce:transition-none"
                >
                  <span className="text-[14px] leading-snug font-medium text-forest">
                    {item.question}
                  </span>
                  <ChevronDown
                    className={cn(
                      'size-5 shrink-0 text-forest/40 transition-transform duration-200 motion-reduce:transition-none',
                      open && 'rotate-180',
                    )}
                    strokeWidth={2.4}
                    aria-hidden
                  />
                </button>
                <AnimatePresence initial={false}>
                  {open && (
                    <motion.div
                      key="content"
                      initial={reduceMotion ? false : { height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={reduceMotion ? undefined : { height: 0, opacity: 0 }}
                      transition={{ duration: 0.28, ease: 'easeInOut' }}
                      className="overflow-hidden"
                    >
                      <p className="px-5 pb-4 text-[13px] leading-relaxed text-forest/65">
                        {item.answer}
                      </p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
