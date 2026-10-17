'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowLeft, ArrowRight, BadgeCheck, Info, ShieldCheck, Tag } from 'lucide-react'
import { LogoWordmark } from './logo-wordmark'
import { PaymentInstructionCard, type ActiveInvoice } from './payment-instruction-card'
import {
  PAY_METHOD_COPY,
  PAY_START_COPY,
  PERIOD_LABEL,
  PREPAID_BADGE,
  SEKALI_BAYAR_BADGE,
  applyReferralDiscount,
  formatIDR,
  priceFor,
  type BillingPeriod,
  type PlanDefinition,
  type PlanId,
} from '@/lib/data/pricing'
import { PAY_METHODS, type PaymentMethodId } from '@/lib/payments/methods'
import { buildLoginHref } from '@/lib/data/auth'
import { buildCheckoutHref, buildPayHref } from '@/lib/data/pricing'
import { fetchSessionUser } from '@/lib/session-client'

/* MULAI PEMBAYARAN (/checkout/bayar, paket 83) - DI DALAM APP ------------------
   Pilih metode lalu tekan "Bayar sekarang": `/api/payment/charge` membuat tagihan
   Core API, dan halaman INI menampilkan QRIS / nomor VA / tautan e-wallet / kode
   Mandiri Bill. Tidak ada redirect ke domain Midtrans.

   Tata letak: ponsel satu kolom; desktop melebar (`max-w-[1080px]`) dengan
   ringkasan pembelian sticky di kiri dan area cara bayar di kanan - sejajar
   dengan lebar halaman `/checkout`, jadi alurnya terasa satu halaman.

   Dua hal yang sengaja TIDAK dilakukan halaman ini:
     . menagih tanpa sesi - `/api/payment/charge` memakai identitas dari cookie,
       jadi tamu diarahkan masuk dulu;
     . mempercayai nominal atau kode teman dari query string. Kode diperiksa ke
       database (`/api/referral/validate`), dan nominalnya dicocokkan server
       dengan harga kanon `lib/data/pricing.ts` (salah -> 422). */

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
  ownedPlanId,
  ownedIsLifetime,
  isUpgrade,
  isRenewal,
  referralCode,
}: {
  plan: PlanDefinition
  /** `monthly` (prabayar 30 hari) atau `lifetime` */
  period: BillingPeriod
  /** paket yang SUDAH dimiliki (dari server) — dasar hitung selisih upgrade */
  ownedPlanId: PlanId | null
  /** true = paket yang dimiliki adalah lifetime */
  ownedIsLifetime: boolean
  /** true = ini upgrade lifetime, bukan pembelian pertama (mengubah copy) */
  isUpgrade: boolean
  /** true = memperpanjang / pindah tier monthly yang sudah dimiliki */
  isRenewal: boolean
  referralCode: string | null
}) {
  const router = useRouter()
  const [session, setSession] = useState<'checking' | 'guest' | 'ready'>('checking')
  /** kode yang BENAR-BENAR ada di database - bukan sekadar bentuknya wajar */
  const [verifiedCode, setVerifiedCode] = useState<string | null>(null)
  /** metode yang sedang dipilih user (dari katalog `lib/payments/methods.ts`) */
  const [method, setMethod] = useState<PaymentMethodId>('qris')
  const [paying, setPaying] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  /** tagihan aktif yang instruksinya sedang ditampilkan */
  const [invoice, setInvoice] = useState<ActiveInvoice | null>(null)

  /* Nominal memakai `priceFor()` dari PAKET YANG SUDAH DIMILIKI (dibaca server di
     `app/checkout/bayar/page.tsx`) — jadi angka yang user lihat di sini persis
     angka yang diverifikasi `/api/payment/charge`. Bukan angka kiriman klien. */
  const basePrice = priceFor(plan, { period, ownedPlanId, ownedIsLifetime })
  const total = verifiedCode ? applyReferralDiscount(basePrice) : basePrice
  const discount = basePrice - total
  const premiumBadge = period === 'monthly' ? PREPAID_BADGE : SEKALI_BAYAR_BADGE

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
        /* kode tidak terbukti - tanpa diskon; itu jawaban yang jujur */
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
          purpose: isUpgrade ? 'upgrade' : isRenewal ? 'renew' : 'subscribe',
          period,
          amount: total,
          planId: plan.id,
          method,
          itemName: `${plan.name} (${period === 'monthly' ? 'Langganan 30 hari' : 'akses selamanya'})`,
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
      /* sudah dibayar tapi webhook belum mencatat -> TIDAK bikin tagihan kedua;
         halaman konfirmasi yang menyelesaikan sisanya (mem-poll status paket). */
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
  }, [paying, total, plan, isUpgrade, isRenewal, period, method, router])
  /* ringkasan pembelian - kolom KIRI di desktop (sticky), di atas cara bayar di ponsel */
  const summary = (
    <section className="rounded-[1.5rem] bg-cream p-5 ring-1 ring-soil/12 lg:rounded-[1.75rem] lg:p-6">
      <div className="flex items-start gap-3">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-sage text-forest">
          <BadgeCheck className="size-4" strokeWidth={2.2} aria-hidden />
        </span>
        <div className="min-w-0">
          <p className="text-[14px] font-medium text-forest">{plan.name}</p>
          <p className="text-[12px] text-forest/50">
            {plan.subtitle} - {PERIOD_LABEL[period]}
          </p>
        </div>
      </div>

      <dl className="mt-4 space-y-2 border-t border-soil/12 pt-3.5 text-[12.5px]">
        {discount > 0 && (
          <div className="flex items-center justify-between gap-3">
            <dt className="flex items-center gap-1.5 text-forest/50">
              <Tag className="size-3.5" strokeWidth={2.4} aria-hidden />
              {PAY_START_COPY.discountLabel}
            </dt>
            <dd className="font-medium tabular-nums text-forest">- {formatIDR(discount)}</dd>
          </div>
        )}
        <div className="flex items-baseline justify-between gap-3">
          <dt className="text-forest/50">{PAY_START_COPY.totalLabel}</dt>
          <dd className="font-display text-[22px] font-semibold tabular-nums text-forest">
            {formatIDR(total)}
          </dd>
        </div>
      </dl>

      <p className="mt-4 flex items-start gap-2 text-[11.5px] leading-relaxed text-forest/50">
        <ShieldCheck className="mt-0.5 size-3.5 shrink-0" strokeWidth={2.4} aria-hidden />
        {premiumBadge}
      </p>
    </section>
  )

  return (
    <div className="relative w-full px-5 pt-6 pb-24 text-forest sm:px-6 lg:px-8 lg:pt-10 lg:pb-16">
      <div className="mx-auto w-full max-w-[1080px]">
        <div className="flex items-center justify-between gap-4">
          <LogoWordmark className="h-6" />
          <Link
            href={buildCheckoutHref(plan.id, period)}
            className="inline-flex items-center gap-1.5 text-[12px] font-medium text-forest/50 transition-colors duration-200 hover:text-forest motion-reduce:transition-none"
          >
            <ArrowLeft className="size-3.5" strokeWidth={2.4} aria-hidden />
            {PAY_START_COPY.backLabel}
          </Link>
        </div>

        <div className="mt-6 lg:mt-10 lg:flex lg:items-start lg:gap-10">
          <div className="lg:sticky lg:top-10 lg:w-[340px] lg:shrink-0">{summary}</div>

          <div className="mt-5 min-w-0 lg:mt-0 lg:flex-1">
            <p className="text-[11px] font-medium tracking-[0.16em] text-forest/40 uppercase">
              {PAY_START_COPY.eyebrow}
            </p>
            <h1 className="mt-1.5 font-display text-2xl font-semibold tracking-tight text-forest lg:text-[1.9rem]">
              {isUpgrade
                ? PAY_START_COPY.upgradeTitle
                : isRenewal
                  ? PAY_START_COPY.renewTitle
                  : PAY_START_COPY.title}
            </h1>
            <p className="mt-1 text-[12.5px] text-forest/50">
              {isUpgrade
                ? PAY_START_COPY.upgradeSubtitle
                : isRenewal
                  ? PAY_START_COPY.renewSubtitle
                  : PAY_START_COPY.subtitle}
            </p>

            {session === 'guest' ? (
              <section className="mt-5 rounded-[1.5rem] bg-cream p-5 ring-1 ring-soil/12 lg:rounded-[1.75rem] lg:p-6">
                <h2 className="font-display text-[15px] font-medium tracking-tight text-forest">
                  {PAY_START_COPY.loginTitle}
                </h2>
                <p className="mt-1.5 text-[12.5px] leading-relaxed text-forest/55">
                  {PAY_START_COPY.loginBody}
                </p>
                <Link
                  href={buildLoginHref(buildPayHref(plan.id, period, referralCode))}
                  className="mt-4 inline-flex h-11 items-center justify-center gap-2 rounded-full bg-forest px-5 text-[13px] font-medium text-cream lg:min-w-[200px]"
                >
                  {PAY_START_COPY.loginCta}
                  <ArrowRight className="size-4" strokeWidth={2.4} aria-hidden />
                </Link>
              </section>
            ) : invoice ? (
              /* Tagihan sudah dibuat -> instruksinya tampil di dalam app */
              <div className="mt-5">
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
              </div>
            ) : (              <section className="mt-5 rounded-[1.5rem] bg-cream p-5 ring-1 ring-soil/12 lg:rounded-[1.75rem] lg:p-6">
                <h2 className="text-[11px] font-medium tracking-[0.16em] text-forest/40 uppercase">
                  {PAY_START_COPY.methodLegend}
                </h2>

                <div
                  role="radiogroup"
                  aria-label={PAY_START_COPY.methodLegend}
                  className="mt-4 grid gap-1.5 lg:grid-cols-2 lg:gap-2"
                >
                  {PAY_METHODS.map((item) => {
                    const copy = PAY_METHOD_COPY[item.id]
                    const active = item.id === method
                    return (
                      <button
                        key={item.id}
                        type="button"
                        role="radio"
                        aria-checked={active}
                        onClick={() => setMethod(item.id)}
                        className={`flex w-full items-center gap-2.5 rounded-xl px-3.5 py-2.5 text-left transition-colors duration-200 motion-reduce:transition-none ${
                          active
                            ? 'bg-sage/70 ring-1 ring-forest/25'
                            : 'bg-canvas/60 ring-1 ring-soil/12 hover:bg-canvas'
                        }`}
                      >
                        <span
                          className={`flex size-4 shrink-0 items-center justify-center rounded-full ring-1 ${
                            active ? 'bg-forest ring-forest' : 'ring-soil/30'
                          }`}
                          aria-hidden
                        >
                          {active && <span className="size-1.5 rounded-full bg-cream" />}
                        </span>
                        <span className="min-w-0 flex-1 truncate text-[13px] font-medium text-forest">
                          {copy.label}
                        </span>
                        <span className="hidden shrink-0 text-[11px] text-forest/40 sm:inline">
                          {copy.hint}
                        </span>
                      </button>
                    )
                  })}
                </div>

                {error && (
                  <p
                    className="mt-4 flex items-start gap-1.5 text-[12px] leading-relaxed text-plum"
                    role="alert"
                  >
                    <Info className="mt-0.5 size-3.5 shrink-0" strokeWidth={2.4} aria-hidden />
                    <span>
                      <strong className="font-medium">{PAY_START_COPY.failedTitle}.</strong> {error}
                    </span>
                  </p>
                )}

                {notice && (
                  <p className="mt-4 text-[12px] leading-relaxed text-forest/70" role="status">
                    {notice}
                  </p>
                )}

                <button
                  type="button"
                  onClick={() => void handlePay()}
                  disabled={paying || session === 'checking'}
                  className="mt-5 inline-flex h-12 w-full items-center justify-center gap-2 rounded-full bg-forest px-6 text-[13.5px] font-medium text-cream transition-colors duration-200 hover:bg-forest-soft disabled:opacity-60 motion-reduce:transition-none lg:w-auto lg:min-w-[220px]"
                >
                  {paying ? PAY_START_COPY.payingLabel : PAY_START_COPY.payLabel}
                  {!paying && <ArrowRight className="size-4" strokeWidth={2.4} aria-hidden />}
                </button>
              </section>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}