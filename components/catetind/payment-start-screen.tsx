'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowLeft, ArrowRight, BadgeCheck, Info, ShieldCheck, Tag } from 'lucide-react'
import { PaymentInstructionCard, type ActiveInvoice } from './payment-instruction-card'
import {
  PAY_METHOD_COPY,
  PAY_START_COPY,
  PERIOD_LABEL,
  SEKALI_BAYAR_BADGE,
  applyReferralDiscount,
  formatIDR,
  priceFor,
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

   Tata letak: ponsel satu kolom (judul → ringkasan → cara bayar); desktop dua
   kolom dengan ringkasan pembelian sticky di kiri dan area cara bayar di kanan.
   Kontainer memakai lebar & padding yang SAMA dengan header situs
   (`max-w-[1200px]`, `px-5` / `landing-tab:px-10`), jadi tepi kiri/kanan konten
   lurus dengan logo dan CTA. Bingkainya navbar landing TANPA footer.

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
  ownedPlanId,
  ownedIsLifetime,
  isUpgrade,
  referralCode,
}: {
  plan: PlanDefinition
  /** paket yang SUDAH dimiliki (dari server) — dasar hitung selisih upgrade */
  ownedPlanId: PlanId | null
  /** true = paket yang dimiliki adalah lifetime */
  ownedIsLifetime: boolean
  /** true = ini upgrade lifetime, bukan pembelian pertama (mengubah copy) */
  isUpgrade: boolean
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
  /** kartu instruksi — dipakai untuk membawa kartu ke layar setelah dibuat */
  const invoiceRef = useRef<HTMLDivElement>(null)

  /* Nominal memakai `priceFor()` dari PAKET YANG SUDAH DIMILIKI (dibaca server di
     `app/checkout/bayar/page.tsx`) — jadi angka yang user lihat di sini persis
     angka yang diverifikasi `/api/payment/charge`. Bukan angka kiriman klien. */
  const basePrice = priceFor(plan, { period: 'lifetime', ownedPlanId, ownedIsLifetime })
  const total = verifiedCode ? applyReferralDiscount(basePrice) : basePrice
  const discount = basePrice - total
  const premiumBadge = SEKALI_BAYAR_BADGE

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
    /* kode baru (atau kode dihapus) = diskon lama tidak berlaku sampai
       kode yang sekarang terbukti */
    setVerifiedCode(null)
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
  /* Setelah "Bayar sekarang", kartu metode (8 baris) diganti kartu instruksi yang
     jauh lebih pendek. Di ponsel posisi gulir lama bisa menyisakan kartu baru di
     luar layar, jadi bawa ke atas — tapi hanya kalau memang perlu, supaya desktop
     tidak ikut melompat. */
  useEffect(() => {
    if (!invoice) return
    const frame = window.requestAnimationFrame(() => {
      const el = invoiceRef.current
      if (!el) return
      const top = el.getBoundingClientRect().top
      if (top >= 96 && top <= window.innerHeight * 0.5) return
      const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
      el.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' })
    })
    return () => window.cancelAnimationFrame(frame)
  }, [invoice])


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
          purpose: isUpgrade ? 'upgrade' : 'subscribe',
          period: 'lifetime',
          amount: total,
          planId: plan.id,
          method,
          /* kode yang sudah diverifikasi — server MEMERIKSA ULANG ke database
             sebelum menerima nominal diskon. Tanpa kode, server menolak
             nominal diskon (bukan sekadar percaya angka dari klien). */
          code: verifiedCode,
          itemName: `${plan.name} (akses selamanya)`,
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
  }, [paying, total, plan, isUpgrade, method, router, verifiedCode])
  /* ringkasan pembelian - kolom KIRI di desktop (sticky), di atas cara bayar di ponsel */
  const summary = (
    <section className="rounded-[24px] bg-cream p-5 shadow-landing-hairline ring-1 ring-soil/12 landing:p-6">
      <p className="text-[11px] font-medium tracking-[0.16em] text-forest/40 uppercase">
        {PAY_START_COPY.planLabel}
      </p>

      <div className="mt-3 flex items-start gap-3">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-sage text-forest">
          <BadgeCheck className="size-4" strokeWidth={2.2} aria-hidden />
        </span>
        <div className="min-w-0">
          <p className="text-[14px] font-medium text-forest">{plan.name}</p>
          <p className="mt-0.5 text-[12px] leading-relaxed text-forest/50">
            {plan.subtitle} - {PERIOD_LABEL.lifetime}
          </p>
        </div>
      </div>

      {discount > 0 && (
        <dl className="mt-4 space-y-2 border-t border-soil/12 pt-4 text-[12.5px]">
          <div className="flex items-center justify-between gap-3">
            <dt className="flex items-center gap-1.5 text-forest/50">
              <Tag className="size-3.5" strokeWidth={2.4} aria-hidden />
              {PAY_START_COPY.discountLabel}
            </dt>
            <dd className="font-medium tabular-nums text-forest">- {formatIDR(discount)}</dd>
          </div>
        </dl>
      )}

      <div className="mt-4 flex items-baseline justify-between gap-3 rounded-2xl bg-canvas px-4 py-3 ring-1 ring-soil/10">
        <span className="text-[12.5px] font-medium text-forest/60">
          {PAY_START_COPY.totalLabel}
        </span>
        <span className="font-display text-[24px] leading-none font-semibold tracking-[-0.02em] tabular-nums text-forest">
          {formatIDR(total)}
        </span>
      </div>

      <p className="mt-3 text-[11.5px] leading-relaxed text-forest/50">{premiumBadge}</p>
    </section>
  )

  return (
    <section className="w-full bg-canvas px-5 pt-[116px] pb-20 text-forest landing-tab:px-10 landing-tab:pt-[148px] landing:pt-[160px] landing:pb-[120px]">
      <div className="mx-auto w-full max-w-[1200px]">
        {/* kepala halaman — lebar & padding sama dengan header situs */}
        <header className="flex w-full flex-col gap-4">
          <div className="flex items-center justify-between gap-3">
            <span className="inline-flex items-center gap-2 rounded-full bg-canvas py-0.5 pr-4 pl-0.5 ring-1 ring-soil/10">
              <span className="flex size-6 items-center justify-center rounded-full bg-sage">
                <ShieldCheck className="size-3.5 text-forest" aria-hidden />
              </span>
              <span className="text-[14px] leading-[1.5] text-forest">{PAY_START_COPY.eyebrow}</span>
            </span>

            <Link
              href={buildCheckoutHref(plan.id, 'lifetime', referralCode)}
              className="inline-flex h-10 shrink-0 items-center gap-1.5 rounded-full bg-cream px-3.5 text-[12.5px] font-medium text-forest ring-1 ring-soil/15 transition-colors duration-200 hover:bg-sage/60 motion-reduce:transition-none landing-tab:h-11 landing-tab:px-4 landing-tab:text-[13px]"
            >
              <ArrowLeft className="size-3.5" strokeWidth={2.4} aria-hidden />
              {PAY_START_COPY.backLabel}
            </Link>
          </div>

          <div className="max-w-[620px]">
            <h1 className="font-display text-[32px] leading-[1.08] font-semibold tracking-[-0.03em] text-forest landing-tab:text-[40px] landing:text-[44px]">
              {isUpgrade ? PAY_START_COPY.upgradeTitle : PAY_START_COPY.title}
            </h1>
            <p className="mt-2 text-[15px] leading-[1.55] text-forest-muted landing-tab:text-[16px]">
              {isUpgrade ? PAY_START_COPY.upgradeSubtitle : PAY_START_COPY.subtitle}
            </p>
          </div>
        </header>

        {/* desktop: ringkasan di kiri (sticky) + pembayaran di kanan; ponsel menumpuk */}
        <div className="mt-8 grid w-full grid-cols-1 gap-6 lg:mt-10 lg:grid-cols-[320px_minmax(0,1fr)] lg:items-start lg:gap-8">
          <aside className="min-w-0 lg:sticky lg:top-24">{summary}</aside>

          <div className="min-w-0">
            {session === 'guest' ? (
              <section className="rounded-[24px] bg-cream p-5 shadow-landing-hairline ring-1 ring-soil/12 landing:p-6">
                <h2 className="font-display text-[15px] font-medium tracking-tight text-forest">
                  {PAY_START_COPY.loginTitle}
                </h2>
                <p className="mt-1.5 text-[12.5px] leading-relaxed text-forest/55">
                  {PAY_START_COPY.loginBody}
                </p>
                <Link
                  href={buildLoginHref(buildPayHref(plan.id, 'lifetime', referralCode))}
                  className="mt-4 inline-flex h-11 items-center justify-center gap-2 rounded-full bg-forest px-5 text-[13px] font-medium text-cream landing-tab:min-w-[200px]"
                >
                  {PAY_START_COPY.loginCta}
                  <ArrowRight className="size-4" strokeWidth={2.4} aria-hidden />
                </Link>
              </section>
            ) : invoice ? (
              /* Tagihan sudah dibuat -> instruksinya tampil di dalam app */
              <div ref={invoiceRef} className="scroll-mt-24">
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
            ) : (
              <section className="rounded-[24px] bg-cream p-5 shadow-landing-hairline ring-1 ring-soil/12 landing:p-6">
                <h2 className="text-[11px] font-medium tracking-[0.16em] text-forest/40 uppercase">
                  {PAY_START_COPY.methodLegend}
                </h2>

                <div
                  role="radiogroup"
                  aria-label={PAY_START_COPY.methodLegend}
                  className="mt-4 grid gap-2 landing-tab:grid-cols-2"
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
                        className={`flex w-full items-center gap-2.5 rounded-2xl px-3.5 py-3 text-left transition-colors duration-200 motion-reduce:transition-none ${
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
                        <span className="hidden shrink-0 text-[11px] text-forest/40 landing:inline">
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
                  className="mt-5 inline-flex h-12 w-full items-center justify-center gap-2 rounded-full bg-forest px-6 text-[13.5px] font-medium text-cream transition-colors duration-200 hover:bg-forest-soft disabled:opacity-60 motion-reduce:transition-none landing-tab:w-auto landing-tab:min-w-[220px]"
                >
                  {paying ? PAY_START_COPY.payingLabel : PAY_START_COPY.payLabel}
                  {!paying && <ArrowRight className="size-4" strokeWidth={2.4} aria-hidden />}
                </button>
              </section>
            )}
          </div>
        </div>
      </div>
    </section>
  )
}