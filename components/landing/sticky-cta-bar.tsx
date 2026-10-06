'use client'

import { useEffect, useState } from 'react'
import { ArrowRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import { RECOMMENDED_TIER, STICKY_CTA_COPY, formatIDR } from '@/lib/data/landing'
import { useLandingCta } from './landing-cta-provider'

/* ── STICKY CTA BAR ──────────────────────────────────────────────────────────
   Muncul HANYA setelah user melewati Section 5 (Pricing) — sebelum itu ia
   mengganggu, sesudah itu ia pintu cepat ke paket rekomendasi. Dipasang `fixed`
   di bawah tengah dengan pil ramping supaya tidak menutupi konten. */
export function StickyCtaBar() {
  const { openFor } = useLandingCta()
  const [show, setShow] = useState(false)

  useEffect(() => {
    const target = document.getElementById('pricing')
    if (!target) return
    let raf = 0
    const evaluate = () => {
      raf = 0
      /* muncul begitu bagian harga tergulir lewat seluruhnya */
      setShow(target.getBoundingClientRect().bottom < 80)
    }
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(evaluate)
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll)
    evaluate()
    return () => {
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
      if (raf) cancelAnimationFrame(raf)
    }
  }, [])

  return (
    <div
      aria-hidden={!show}
      className={cn(
        'pointer-events-none fixed inset-x-0 bottom-0 z-40 flex justify-center px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] transition-transform duration-300 ease-out motion-reduce:transition-none',
        show ? 'translate-y-0' : 'translate-y-[150%]',
      )}
    >
      <div
        className={cn(
          'flex w-full max-w-[640px] items-center gap-3 rounded-full bg-forest py-2.5 pr-2.5 pl-5 text-cream shadow-[0_22px_48px_-20px_rgba(0,0,0,0.55)]',
          show ? 'pointer-events-auto' : 'pointer-events-none',
        )}
      >
        <div className="min-w-0 flex-1">
          <p className="truncate text-[13px] font-medium">
            {RECOMMENDED_TIER.name}{' '}
            <span className="font-normal text-cream/60">· {STICKY_CTA_COPY.period}</span>
          </p>
          <p className="truncate text-[11.5px] text-cream/70 tabular-nums">
            {formatIDR(RECOMMENDED_TIER.price)} · sekali bayar
          </p>
        </div>
        <button
          type="button"
          tabIndex={show ? 0 : -1}
          onClick={() => openFor(RECOMMENDED_TIER.id)}
          aria-label={STICKY_CTA_COPY.ariaLabel}
          className="flex h-10 shrink-0 items-center gap-1.5 rounded-full bg-cream px-4 text-[13px] font-medium text-forest transition-colors duration-200 hover:bg-mint motion-reduce:transition-none"
        >
          {STICKY_CTA_COPY.ctaLabel}
          <ArrowRight className="size-4" strokeWidth={2.6} aria-hidden />
        </button>
      </div>
    </div>
  )
}
