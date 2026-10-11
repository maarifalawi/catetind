'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { ArrowRight, CheckCircle2, Clock, RotateCw, XCircle } from 'lucide-react'
import { LogoWordmark } from './logo-wordmark'
import { PAY_DONE_COPY } from '@/lib/data/pricing'

/* SELESAI BAYAR (/checkout/selesai) -------------------------------------------
   Halaman setelah pembayaran. Statusnya DIBACA dari database
   (`GET /api/subscription`), bukan disimpulkan dari `?status=` - jadi user tidak
   pernah dibilang "aktif" sebelum webhook Midtrans benar-benar mencatatnya.
   Karena webhook tiba kapan saja (biasanya dalam hitungan detik), halaman ini
   mencoba beberapa kali (+-30 detik) sebelum bilang "belum tercatat".

   Tampilannya SATU kartu di tengah untuk semua ukuran layar - di desktop kartu
   itulah bingkainya (bukan teks melayang di halaman kosong). */

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
    <main className="relative flex min-h-[100dvh] w-full items-center justify-center bg-canvas px-5 py-12 text-forest lg:px-8">
      <div className="w-full max-w-[520px]">
        <LogoWordmark className="mx-auto h-6" />

        <section className="mt-6 rounded-[1.75rem] bg-cream px-6 py-8 text-center ring-1 ring-soil/12 lg:px-8 lg:py-10">
          <span
            className={`mx-auto flex size-14 items-center justify-center rounded-full ring-1 ${tone}`}
          >
            <Icon className="size-7" strokeWidth={2.4} aria-hidden />
          </span>
          <p className="mt-5 text-[11px] font-medium tracking-[0.16em] text-forest/40 uppercase">
            {PAY_DONE_COPY.eyebrow}
          </p>
          <h1 className="mt-1.5 font-display text-2xl font-semibold tracking-tight text-forest lg:text-[1.75rem]">
            {title}
          </h1>
          <p className="mx-auto mt-2 max-w-[38ch] text-[13px] leading-relaxed text-forest/55">
            {body}
          </p>

          {orderId && (
            <p className="mt-4 text-[10.5px] tabular-nums text-forest/35">
              {PAY_DONE_COPY.orderLabel} {orderId}
            </p>
          )}

          <div className="mt-7 flex flex-col items-center gap-2 lg:flex-row lg:justify-center">
            {state === 'active' ? (
              <Link
                href="/app"
                className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-full bg-forest px-6 text-[13.5px] font-medium text-cream lg:w-auto lg:min-w-[200px]"
              >
                {PAY_DONE_COPY.appCta}
                <ArrowRight className="size-4" strokeWidth={2.4} aria-hidden />
              </Link>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => void check()}
                  className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-full bg-forest px-6 text-[13.5px] font-medium text-cream lg:w-auto lg:min-w-[160px]"
                >
                  <RotateCw className="size-4" strokeWidth={2.4} aria-hidden />
                  {PAY_DONE_COPY.retryLabel}
                </button>
                <Link
                  href="/checkout"
                  className="inline-flex h-12 w-full items-center justify-center rounded-full px-6 text-[13.5px] font-medium text-forest/70 ring-1 ring-soil/16 lg:w-auto"
                >
                  {PAY_DONE_COPY.homeCta}
                </Link>
              </>
            )}
          </div>
        </section>
      </div>
    </main>
  )
}