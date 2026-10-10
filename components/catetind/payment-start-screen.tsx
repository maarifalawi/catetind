'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowRight, BadgeCheck, Info, ShieldCheck, Tag } from 'lucide-react'
import { LogoWordmark } from './logo-wordmark'
import { PaymentInstructionCard, type ActiveInvoice } from './payment-instruction-card'
import {
  NO_AUTO_RENEW_BADGE,
  PAY_METHOD_COPY,
  PAY_METHOD_GROUPS,
  PAY_START_COPY,
  PERIOD_CHOICE_LABEL,
  applyReferralDiscount,
  formatIDR,
  offerPrice,
  type BillingPeriod,
  type PlanDefinition,
} from '@/lib/data/pricing'
import { PAY_METHODS, type PaymentMethodId } from '@/lib/payments/methods'
import { LOGIN_PATH } from '@/lib/data/auth'
import { fetchSessionUser } from '@/lib/session-client'

/* ── MULAI PEMBAYARAN (/checkout/bayar, paket 83) — DI DALAM APP ─────────────
   Pilih metode → tekan "Bayar sekarang" → `/api/payment/charge` membuat tagihan
   Core API, dan halaman INI menampilkan QRIS / nomor VA / tautan e-wallet /
   kode Mandiri Bill. Tidak ada redirect ke domain Midtrans.

   Dua hal yang sengaja TIDAK dilakukan halaman ini:
     · menagih tanpa sesi — `/api/payment/charge` memakai identitas dari cookie,
       jadi tamu diarahkan masuk dulu;
     · mempercayai nominal atau kode teman dari query string. Kode diperiksa ke
       database (`/api/referral/validate`), dan nominalnya dicocokkan server
       dengan harga kanon `lib/data/pricing.ts` (salah → 422). */

/** bentuk balasan `/api/payment/charge` yang dipakai halaman ini */
interface ChargeResponse {
  ok?: boolean
  orderId?: string
  method?: PaymentMethodId
  amount?: number
  state?: 'pending' | 'settled' | 'expired' | 'failed' | 'unknown'
  expiresAt?: string | null
  instructions?: ActiveInvoice['instructions']
  note?: string
  error?: string
}

export function PaymentStartScreen({
  plan,
  period,
  referralCode,
}: {
  plan: PlanDefinition
  period: BillingPeriod
  referralCode: string | null
}) {
  const router = useRouter()
  const [session, setSession] = useState<'checking' | 'guest' | 'ready'>('checking')
  /** kode yang BENAR-BENAR ada di database — bukan sekadar bentuknya wajar */
  const [verifiedCode, setVerifiedCode] = useState<string | null>(null)
  /** metode yang sedang dipilih user (dari katalog `lib/payments/methods.ts`) */
  const [method, setMethod] = useState<PaymentMethodId>('qris')
  const [paying, setPaying] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  /** tagihan aktif yang instruksinya sedang ditampilkan */
  const [invoice, setInvoice] = useState<ActiveInvoice | null>(null)

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
    setNotice(null)
    try {
      const res = await fetch('/api/payment/charge', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          purpose: 'subscribe',
          amount: total,
          planId: plan.id,
          period,
          method,
          itemName: `${plan.name} (${PERIOD_CHOICE_LABEL[period]})`,
        }),
      })
      if (res.status === 401) {
        setSession('guest')
        return
      }
      const data = (await res.json().catch(() => null)) as ChargeResponse | null
      if (!res.ok || !data?.ok || !data.orderId) {
        setError(data?.error ?? PAY_START_COPY.notConfigured)
        return
      }
      /* sudah dibayar tapi webhook belum mencatat → TIDAK bikin tagihan kedua;
         halaman konfirmasi yang menyelesaikan sisanya (mem-poll langganan). */
      if (data.state === 'settled') {
        setNotice(data.note ?? null)
        router.push(`/checkout/selesai?order_id=${encodeURIComponent(data.orderId)}`)
        return
      }
      setInvoice({
        orderId: data.orderId,
        method: data.method ?? method,
        amount: data.amount ?? total,
        expiresAt: data.expiresAt ?? null,
        instructions: data.instructions ?? null,
      })
    } catch {
      setError(PAY_START_COPY.notConfigured)
    } finally {
      setPaying(false)
    }
  }, [paying, total, plan, period, method, router])

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
            <p className="mt-2 text-[12.5px] leading-relaxed text-forest/60">
              {PAY_START_COPY.loginBody}
            </p>
            <Link
              href={LOGIN_PATH}
              className="mt-4 inline-flex h-11 items-center justify-center gap-2 rounded-full bg-forest px-5 text-[13.5px] font-medium text-cream"
            >
              {PAY_START_COPY.loginCta}
              <ArrowRight className="size-4" strokeWidth={2.4} aria-hidden />
            </Link>
          </section>
        ) : invoice ? (
          /* Tagihan sudah dibuat → instruksinya tampil di dalam app */
          <PaymentInstructionCard
            invoice={invoice}
            onSwitchMethod={() => {
              setInvoice(null)
              setError(null)
              setNotice(null)
            }}
            onNewInvoice={() => {
              setInvoice(null)
              void handlePay()
            }}
          />
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

            <section className="mt-4 rounded-[1.5rem] bg-cream p-5 ring-1 ring-soil/12">
              <h2 className="text-[11px] font-medium tracking-[0.16em] text-forest/40 uppercase">
                {PAY_START_COPY.methodLegend}
              </h2>

              {PAY_METHOD_GROUPS.map((group) => {
                const items = PAY_METHODS.filter((item) => item.channel === group.id)
                if (items.length === 0) return null
                return (
                  <div key={group.id} className="mt-4">
                    <p className="text-[11.5px] font-medium text-forest/50">{group.label}</p>
                    <ul role="radiogroup" aria-label={group.label} className="mt-2 space-y-2">
                      {items.map((item) => {
                        const copy = PAY_METHOD_COPY[item.id]
                        const active = item.id === method
                        return (
                          <li key={item.id}>
                            <button
                              type="button"
                              role="radio"
                              aria-checked={active}
                              onClick={() => setMethod(item.id)}
                              className={`flex w-full items-start gap-3 rounded-2xl px-3.5 py-3 text-left transition-colors duration-200 motion-reduce:transition-none ${
                                active
                                  ? 'bg-sage/70 ring-1 ring-forest/25'
                                  : 'bg-canvas/60 ring-1 ring-soil/12 hover:bg-canvas'
                              }`}
                            >
                              <span
                                className={`mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-full ring-1 ${
                                  active ? 'bg-forest ring-forest' : 'ring-soil/30'
                                }`}
                                aria-hidden
                              >
                                {active && <span className="size-1.5 rounded-full bg-cream" />}
                              </span>
                              <span className="min-w-0">
                                <span className="block text-[13.5px] font-medium text-forest">
                                  {copy.label}
                                </span>
                                <span className="mt-0.5 block text-[11.5px] leading-relaxed text-forest/50">
                                  {copy.hint}
                                </span>
                              </span>
                            </button>
                          </li>
                        )
                      })}
                    </ul>
                  </div>
                )
              })}

              <p className="mt-4 flex items-start gap-2 rounded-2xl bg-canvas/60 px-3.5 py-2.5 text-[11.5px] leading-relaxed text-forest/60 ring-1 ring-soil/12">
                <Info className="mt-0.5 size-3.5 shrink-0" strokeWidth={2.4} aria-hidden />
                {PAY_START_COPY.methodNote}
              </p>
            </section>

            {error && (
              <p
                className="mt-3 flex items-start gap-1.5 text-[12px] leading-relaxed text-plum"
                role="alert"
              >
                <Info className="mt-0.5 size-3.5 shrink-0" strokeWidth={2.4} aria-hidden />
                <span>
                  <strong className="font-medium">{PAY_START_COPY.failedTitle}.</strong> {error}
                </span>
              </p>
            )}

            {notice && (
              <p className="mt-3 text-[12px] leading-relaxed text-forest/70" role="status">
                {notice}
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

            <p className="mt-3 text-center text-[11.5px] text-forest/45">
              {PAY_START_COPY.changeMethodHint}
            </p>
          </>
        )}
      </div>
    </main>
  )
}
