'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { ArrowRight, BadgeCheck, Info, ShieldCheck, Tag } from 'lucide-react'
import { LogoWordmark } from './logo-wordmark'
import {
  NO_AUTO_RENEW_BADGE,
  PAY_START_COPY,
  PERIOD_CHOICE_LABEL,
  applyReferralDiscount,
  formatIDR,
  offerPrice,
  type BillingPeriod,
  type PlanDefinition,
} from '@/lib/data/pricing'
import { LOGIN_PATH } from '@/lib/data/auth'
import { fetchSessionUser } from '@/lib/session-client'

/* ── MULAI PEMBAYARAN (/checkout/bayar) — ALUR REDIRECT ──────────────────────
   Satu penawaran: paket + periode yang sudah dipilih di `/checkout` (3 tier ×
   bulanan/tahunan). Tombol "Bayar sekarang" meminta Snap token ke
   `/api/payment/create`, lalu mengganti halaman ke `redirectUrl` milik Midtrans.
   TIDAK ada `window.snap.pay` dan TIDAK ada client key di browser: halaman Snap
   yang mengurus metode bayar, dan webhook Midtrans yang mengaktifkan langganan.

   Dua hal yang sengaja TIDAK dilakukan halaman ini:
     · menagih tanpa sesi — `/api/payment/create` butuh sesi (identitas dari
       cookie), jadi tamu diarahkan masuk dulu;
     · mempercayai kode teman dari query string. Kode DIPERIKSA ke database
       (`/api/referral/validate`) sebelum diskonnya dipakai; kode karangan tidak
       memberi potongan apa pun. */

export function PaymentStartScreen({
  plan,
  period,
  referralCode,
}: {
  plan: PlanDefinition
  period: BillingPeriod
  referralCode: string | null
}) {
  const [session, setSession] = useState<'checking' | 'guest' | 'ready'>('checking')
  /** kode yang BENAR-BENAR ada di database — bukan sekadar bentuknya wajar */
  const [verifiedCode, setVerifiedCode] = useState<string | null>(null)
  const [paying, setPaying] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const basePrice = offerPrice(plan, period)
  const total = verifiedCode ? applyReferralDiscount(basePrice) : basePrice
  const discount = basePrice - total

  useEffect(() => {
    let active = true
    fetchSessionUser()
      .then((user) => {
        if (active) setSession(user ? 'ready' : 'guest')
      })
      .catch(() => {
        if (active) setSession('guest')
      })
    return () => {
      active = false
    }
  }, [])

  useEffect(() => {
    if (!referralCode) return
    let active = true
    fetch('/api/referral/validate', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ code: referralCode }),
    })
      .then((res) => (res.ok ? (res.json() as Promise<{ ok?: boolean; verified?: boolean }>) : null))
      .then((data) => {
        if (active && data?.ok && data.verified) setVerifiedCode(referralCode)
      })
      .catch(() => {
        /* kode tidak terbukti → tanpa diskon; itu jawaban yang jujur */
      })
    return () => {
      active = false
    }
  }, [referralCode])

  const handlePay = useCallback(async () => {
    if (paying) return
    setPaying(true)
    setError(null)
    try {
      const res = await fetch('/api/payment/create', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          purpose: 'subscribe',
          amount: total,
          planId: plan.id,
          period,
          itemName: `${plan.name} (${PERIOD_CHOICE_LABEL[period]})`,
        }),
      })
      if (res.status === 401) {
        setSession('guest')
        setPaying(false)
        return
      }
      const data = (await res.json().catch(() => null)) as
        | { ok?: boolean; redirectUrl?: string; error?: string }
        | null
      if (!res.ok || !data?.ok || !data.redirectUrl) {
        setError(data?.error ?? PAY_START_COPY.notConfigured)
        setPaying(false)
        return
      }
      window.location.assign(data.redirectUrl)
    } catch {
      setError(PAY_START_COPY.notConfigured)
      setPaying(false)
    }
  }, [paying, total, plan, period])

  return (
    <main className="relative flex min-h-[100dvh] w-full items-center justify-center bg-canvas px-5 py-12 text-forest">
      <div className="w-full max-w-[520px]">
        <LogoWordmark className="h-6" />
        <p className="mt-6 text-[11px] font-medium tracking-[0.16em] text-forest/40 uppercase">
          {PAY_START_COPY.eyebrow}
        </p>
        <h1 className="mt-1.5 font-display text-3xl font-semibold tracking-tight text-forest">
          {PAY_START_COPY.title}
        </h1>
        <p className="mt-2.5 text-[13px] leading-relaxed text-forest/55">{PAY_START_COPY.subtitle}</p>

        {session === 'guest' ? (
          <section className="mt-6 rounded-[1.5rem] bg-cream p-5 ring-1 ring-soil/12">
            <h2 className="font-display text-[15px] font-medium tracking-tight text-forest">
              {PAY_START_COPY.loginTitle}
            </h2>
            <p className="mt-2 text-[12.5px] leading-relaxed text-forest/60">{PAY_START_COPY.loginBody}</p>
            <Link
              href={LOGIN_PATH}
              className="mt-4 inline-flex h-11 items-center justify-center gap-2 rounded-full bg-forest px-5 text-[13.5px] font-medium text-cream"
            >
              {PAY_START_COPY.loginCta}
              <ArrowRight className="size-4" strokeWidth={2.4} aria-hidden />
            </Link>
          </section>
        ) : (
          <>
            <section className="mt-6 rounded-[1.5rem] bg-cream p-5 ring-1 ring-soil/12">
              <h2 className="text-[11px] font-medium tracking-[0.16em] text-forest/40 uppercase">
                {PAY_START_COPY.planLabel}
              </h2>
              <div className="mt-2 flex items-start gap-3">
                <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-sage text-forest">
                  <BadgeCheck className="size-4" strokeWidth={2.2} aria-hidden />
                </span>
                <div className="min-w-0">
                  <p className="text-[14px] font-medium text-forest">{plan.name}</p>
                  <p className="text-[12px] text-forest/50">
                    {plan.subtitle} · {PERIOD_CHOICE_LABEL[period]}
                  </p>
                </div>
              </div>

              <dl className="mt-4 space-y-2.5 border-t border-soil/12 pt-3.5 text-[12.5px]">
                {discount > 0 && (
                  <div className="flex items-center justify-between gap-3">
                    <dt className="flex items-center gap-1.5 text-forest/50">
                      <Tag className="size-3.5" strokeWidth={2.4} aria-hidden />
                      {PAY_START_COPY.discountLabel}
                    </dt>
                    <dd className="font-medium tabular-nums text-forest">− {formatIDR(discount)}</dd>
                  </div>
                )}
                <div className="flex items-baseline justify-between gap-3">
                  <dt className="font-medium text-forest">{PAY_START_COPY.totalLabel}</dt>
                  <dd className="font-display text-lg font-medium tabular-nums text-forest">
                    {formatIDR(total)}
                  </dd>
                </div>
              </dl>
            </section>

            <p className="mt-4 flex items-start gap-2 rounded-2xl bg-mint/25 px-3.5 py-2.5 text-[12px] leading-relaxed font-medium text-forest ring-1 ring-forest/10">
              <ShieldCheck className="mt-0.5 size-3.5 shrink-0" strokeWidth={2.4} aria-hidden />
              {NO_AUTO_RENEW_BADGE}
            </p>

            {error && (
              <p className="mt-3 flex items-start gap-1.5 text-[12px] leading-relaxed text-plum" role="alert">
                <Info className="mt-0.5 size-3.5 shrink-0" strokeWidth={2.4} aria-hidden />
                <span>
                  <strong className="font-medium">{PAY_START_COPY.failedTitle}.</strong> {error}
                </span>
              </p>
            )}

            <button
              type="button"
              onClick={() => void handlePay()}
              disabled={paying || session === 'checking'}
              className="mt-5 inline-flex h-12 w-full items-center justify-center gap-2 rounded-full bg-forest px-6 text-[14px] font-medium text-cream transition-colors duration-200 hover:bg-forest-soft disabled:opacity-60 motion-reduce:transition-none"
            >
              {paying ? PAY_START_COPY.payingLabel : PAY_START_COPY.payLabel}
              {!paying && <ArrowRight className="size-4" strokeWidth={2.4} aria-hidden />}
            </button>
          </>
        )}
      </div>
    </main>
  )
}
