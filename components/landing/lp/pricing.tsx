import Link from 'next/link'
import { ArrowRight, Check, Minus, ShieldCheck, Star } from 'lucide-react'
import {
  LP_PRICING,
  formatIDR,
  lpPlanPrice,
  type LandingTier,
} from '@/lib/data/landing'
import { cn } from '@/lib/utils'
import { LandingReveal } from './reveal'

/* ── SECTION #pricing ────────────────────────────────────────────────────────
   Tiga kartu, satu periode: akses selamanya (sekali bayar). Struktur harga
   mengikuti psikologi "anchor + hero + premium":

     Catet Aja (109rb)  → pintu masuk, fitur AI dikunci
     Waras (129rb)      → kartu hero: +20rb untuk semua fitur AI
     Sultan (299rb)     → plafon harga, membuat Waras terasa murah

   ATURAN YANG MENGIKAT:
     · nominal TIDAK ditulis di JSX — `lpPlanPrice()` membaca `PLANS` dari
       `lib/data/pricing.ts`, jadi angka yang diiklankan = angka yang ditagih;
     · CTA selalu membawa `period=lifetime` lewat `LP_PRICING.checkoutHref`;
     · tidak ada "Garansi 30 hari" dan tidak ada catatan penutup di kartu;
     · Joint Wallet hanya muncul di Waras. Sultan memakai "Semua fitur Paket
       Waras", jadi tidak ada duplikasi fitur.

   Aksesibilitas: tiap kartu satu <article aria-labelledby>, daftar fitur <ul>,
   ikon dekoratif `aria-hidden`, dan CTA fokus terlihat. Ikon Lucide: Check,
   Minus, ArrowRight, Star, ShieldCheck. */

export function LandingPricingLp() {
  return (
    <section
      id="pricing"
      aria-labelledby="landing-pricing-title"
      className="w-full scroll-mt-24 bg-canvas px-5 py-20 landing-tab:px-10 landing:py-[120px]"
    >
      {/* alias anchor untuk footer "Harga" (#harga) — section tetap #pricing
          supaya tautan navbar lama tidak berubah. */}
      <div id="harga" className="mx-auto flex w-full max-w-[1200px] scroll-mt-24 flex-col gap-12">
        <div className="flex flex-col items-center gap-4 text-center">
          <LandingReveal y={40} delay={0.1} className="w-full">
            <h2
              id="landing-pricing-title"
              className="mx-auto max-w-[920px] text-balance font-display text-[30px] leading-[1.18] font-semibold tracking-[-0.035em] text-forest landing-tab:text-[40px] landing:text-[48px]"
            >
              {LP_PRICING.titleBefore}
              <span className="inline-block whitespace-nowrap rounded-full bg-[#e5eecb] px-3 py-1 align-baseline font-bold text-[#243629]">
                {LP_PRICING.titleEmphasis}
              </span>
              {LP_PRICING.titleAfter}
            </h2>
          </LandingReveal>

          <LandingReveal y={48} delay={0.2} className="w-full">
            <p className="mx-auto max-w-[720px] text-balance text-[15px] leading-[1.6] text-forest-muted landing:text-[16px]">
              {LP_PRICING.subheadline}
            </p>
          </LandingReveal>
        </div>

        <div className="grid grid-cols-1 items-stretch gap-6 pt-4 landing:grid-cols-3 landing:gap-5">
          {LP_PRICING.tiers.map((tier, index) => (
            <LandingReveal key={tier.id} y={32} delay={index * 0.1} className="h-full">
              <PricingCard tier={tier} />
            </LandingReveal>
          ))}
        </div>

        <div className="flex flex-col items-center gap-3 rounded-[20px] bg-sage/50 px-5 py-4 text-center ring-1 ring-soil/5 landing:flex-row landing:justify-center landing:px-6 landing:text-left">
          <ShieldCheck className="size-5 shrink-0 text-forest" strokeWidth={1.9} aria-hidden />
          <p className="max-w-[860px] text-[12.5px] leading-[1.6] text-forest-muted">
            {LP_PRICING.trustNote}
          </p>
        </div>
      </div>
    </section>
  )
}

function PricingCard({ tier }: { tier: LandingTier }) {
  const recommended = Boolean(tier.recommended)
  const price = lpPlanPrice(tier.id, 'lifetime')

  const ctaClass = cn(
    'group mt-6 inline-flex h-12 w-full items-center justify-between gap-3 rounded-full px-5 text-[14px] font-semibold leading-[1.5] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 motion-reduce:transition-none',
    recommended
      ? 'bg-[#e8d8a6] text-[#2d3a30] hover:bg-[#efe2b8] focus-visible:ring-[#d8c48c] focus-visible:ring-offset-[#45594e]'
      : 'bg-forest text-cream hover:bg-forest-soft focus-visible:ring-forest focus-visible:ring-offset-canvas',
  )

  return (
    <article
      aria-labelledby={`plan-${tier.id}-name`}
      className={cn(
        'relative flex h-full flex-col rounded-[28px] p-6 pt-8 landing:p-8',
        recommended
          ? 'landing:z-10 bg-[#45594e] text-cream ring-1 ring-white/10 shadow-[0_28px_64px_-40px_rgba(69,89,78,0.55)] landing:scale-[1.025]'
          : 'bg-canvas text-forest ring-1 ring-soil/10 shadow-landing-soft',
      )}
    >
      {recommended && tier.badge ? (
        <span className="absolute -top-3.5 left-1/2 inline-flex -translate-x-1/2 items-center gap-1.5 whitespace-nowrap rounded-full bg-[#efdfb3] px-3.5 py-1.5 text-[11.5px] font-semibold leading-none text-[#3b4a3e] shadow-sm ring-1 ring-black/5">
          <Star className="size-3.5 fill-[#3b4a3e]" strokeWidth={1.8} aria-hidden />
          {tier.badge}
        </span>
      ) : null}

      <span
        className={cn(
          'inline-flex w-fit items-center rounded-full px-2.5 py-1 text-[11.5px] leading-[1.5] font-medium',
          recommended
            ? 'bg-white/10 text-cream ring-1 ring-white/15'
            : 'bg-sage text-forest',
        )}
      >
        {LP_PRICING.priceBadge}
      </span>

      <h3
        id={`plan-${tier.id}-name`}
        className="mt-4 font-display text-[24px] leading-[1.2] font-semibold tracking-[-0.02em]"
      >
        {tier.name}
      </h3>

      <p className="mt-5 flex flex-wrap items-baseline gap-x-2 gap-y-1">
        <span className="font-display text-[38px] leading-[1.02] font-semibold tracking-[-0.045em] tabular-nums landing:text-[42px]">
          {formatIDR(price)}
        </span>
        <span
          className={cn(
            'text-[12.5px] leading-[1.5] font-medium landing:text-[13.5px]',
            recommended ? 'text-cream/60' : 'text-forest-muted',
          )}
        >
          {LP_PRICING.priceUnit}
        </span>
      </p>

      <p
        className={cn(
          'mt-2 min-h-[44px] text-[13.5px] leading-[1.55]',
          recommended ? 'text-cream/70' : 'text-forest-muted',
        )}
      >
        {tier.tagline}
      </p>

      <Link
        href={LP_PRICING.checkoutHref(tier.id, 'lifetime')}
        className={ctaClass}
        aria-label={`${tier.ctaLabel}, ${formatIDR(price)} sekali bayar, akses selamanya`}
      >
        <span>{tier.ctaLabel}</span>
        <ArrowRight
          className="size-4 shrink-0 transition-transform duration-200 group-hover:translate-x-0.5 motion-reduce:transition-none"
          aria-hidden
        />
      </Link>

      <div
        className={cn(
          'mt-7 flex flex-1 flex-col border-t pt-6',
          recommended ? 'border-white/15' : 'border-soil/10',
        )}
      >
        <p
          className={cn(
            'text-[11px] leading-[1.5] font-medium tracking-[0.16em] uppercase',
            recommended ? 'text-cream/50' : 'text-forest-muted',
          )}
        >
          {LP_PRICING.featuresLabel}
        </p>

        <ul className="mt-4 flex flex-1 flex-col gap-3">
          {tier.features.map((feature) => (
            <li key={feature.label} className="flex items-start gap-2.5">
              {feature.included ? (
                <Check
                  className={cn(
                    'mt-0.5 size-4 shrink-0',
                    recommended ? 'text-[#cbdcc8]' : 'text-forest',
                  )}
                  strokeWidth={2.4}
                  aria-hidden
                />
              ) : (
                <Minus
                  className={cn(
                    'mt-0.5 size-4 shrink-0',
                    recommended ? 'text-cream/35' : 'text-forest-muted/45',
                  )}
                  strokeWidth={2}
                  aria-hidden
                />
              )}
              <span
                className={cn(
                  'text-[13.5px] leading-[1.55]',
                  feature.included
                    ? recommended
                      ? 'text-cream/90'
                      : 'text-forest'
                    : recommended
                      ? 'text-cream/40'
                      : 'text-forest-muted/55',
                )}
              >
                {feature.label}
              </span>
            </li>
          ))}
        </ul>

      </div>
    </article>
  )
}

