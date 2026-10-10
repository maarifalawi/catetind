'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { ArrowRight, CheckCircle2, Clock, RotateCw, XCircle } from 'lucide-react'
import { LogoWordmark } from './logo-wordmark'
import { PAY_DONE_COPY } from '@/lib/data/pricing'

/* ── SELESAI BAYAR (/checkout/selesai) ───────────────────────────────────────
   Halaman kembali dari halaman Snap Midtrans. Statusnya DIBACA dari database
   (`GET /api/subscription`), bukan disimpulkan dari `?status=` — jadi user tidak
   pernah dibilang "aktif" sebelum webhook Midtrans benar-benar mencatatnya.

   Karena webhook tiba kapan saja (biasanya dalam hitungan detik), halaman ini
   mencoba beberapa kali (±30 detik) sebelum bilang "belum tercatat". */

type PayState = 'checking' | 'active' | 'pending'

export function PaymentDoneScreen({ orderId, failed }: { orderId: string | null; failed: boolean }) {
  const [state, setState] = useState<PayState>('checking')
  const [attempts, setAttempts] = useState(0)

  const check = useCallback(async () => {
    try {
      const res = await fetch('/api/subscription', { cache: 'no-store' })
      if (!res.ok) {
        setState('pending')
        return
      }
      const data = (await res.json()) as { active?: boolean }
      setState(data?.active ? 'active' : 'pending')
    } catch {
      setState('pending')
    }
  }, [])

  useEffect(() => {
    void check()
  }, [check])

  useEffect(() => {
    if (state !== 'pending' || attempts >= 10) return
    const timer = setTimeout(() => {
      setAttempts((value) => value + 1)
      void check()
    }, 3000)
    return () => clearTimeout(timer)
  }, [state, attempts, check])

  const showFailed = failed && state === 'pending'
  const title =
    state === 'active'
      ? PAY_DONE_COPY.activeTitle
      : showFailed
        ? PAY_DONE_COPY.failedTitle
        : state === 'pending'
          ? PAY_DONE_COPY.pendingTitle
          : PAY_DONE_COPY.checkingTitle
  const body =
    state === 'active'
      ? PAY_DONE_COPY.activeBody
      : showFailed
        ? PAY_DONE_COPY.failedBody
        : state === 'pending'
          ? PAY_DONE_COPY.pendingBody
          : PAY_DONE_COPY.checkingBody

  const Icon = state === 'active' ? CheckCircle2 : showFailed ? XCircle : Clock
  const tone =
    state === 'active'
      ? 'bg-mint/25 text-forest ring-mint/50'
      : showFailed
        ? 'bg-plum/15 text-plum ring-plum/30'
        : 'bg-sage text-forest ring-soil/20'

  return (
    <main className="relative flex min-h-[100dvh] w-full items-center justify-center bg-canvas px-5 py-12 text-forest">
      <div className="w-full max-w-[520px] text-center">
        <LogoWordmark className="mx-auto h-6" />
        <span className={`mx-auto mt-8 flex size-16 items-center justify-center rounded-full ring-1 ${tone}`}>
          <Icon className="size-8" strokeWidth={2.4} aria-hidden />
        </span>
        <p className="mt-5 text-[11px] font-medium tracking-[0.16em] text-forest/40 uppercase">
          {PAY_DONE_COPY.eyebrow}
        </p>
        <h1 className="mt-2 font-display text-3xl font-semibold tracking-tight text-forest">{title}</h1>
        <p className="mt-3 text-[14px] leading-relaxed text-forest/60">{body}</p>

        {orderId && <p className="mt-4 text-[11.5px] tabular-nums text-forest/40">Order: {orderId}</p>}

        <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
          {state === 'active' ? (
            <Link
              href="/app"
              className="inline-flex h-12 items-center justify-center gap-2 rounded-full bg-forest px-6 text-[14px] font-medium text-cream"
            >
              {PAY_DONE_COPY.appCta}
              <ArrowRight className="size-4" strokeWidth={2.4} aria-hidden />
            </Link>
          ) : (
            <>
              <button
                type="button"
                onClick={() => void check()}
                className="inline-flex h-12 items-center justify-center gap-2 rounded-full bg-forest px-6 text-[14px] font-medium text-cream"
              >
                <RotateCw className="size-4" strokeWidth={2.4} aria-hidden />
                {PAY_DONE_COPY.retryLabel}
              </button>
              <Link
                href="/checkout"
                className="inline-flex h-12 items-center justify-center gap-2 rounded-full px-6 text-[14px] font-medium text-forest/70 ring-1 ring-soil/16"
              >
                {PAY_DONE_COPY.homeCta}
              </Link>
            </>
          )}
        </div>
      </div>
    </main>
  )
}
