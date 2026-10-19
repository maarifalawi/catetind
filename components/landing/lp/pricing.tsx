import Link from 'next/link'
import { ArrowRight, Check, Minus, ShieldCheck, Star } from 'lucide-react'
import { LP_PRICING, formatIDR, lpPlanPrice, type LandingTier } from '@/lib/data/landing'
import { cn } from '@/lib/utils'
import { BatikBackdrop } from './batik-backdrop'
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
              className="mx-auto max-w-[920px] text-balance font-display text-[30px] leading-[1.18] font-medium tracking-[-0.035em] text-forest landing-tab:text-[40px] landing:text-[48px]"
            >
              {LP_PRICING.titleBefore}
              <span className="whitespace-nowrap font-semibold">
                {LP_PRICING.titleEmphasis}
              </span>
              {LP_PRICING.titleAfter}
            </h2>
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
    'group mt-6 flex h-12 w-full items-center justify-between gap-3 rounded-full pr-1.5 pl-5 text-[14px] font-medium leading-[1.5] transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 motion-reduce:transition-none',
    recommended
      ? 'bg-daisy text-forest hover:bg-daisy-light focus-visible:ring-daisy focus-visible:ring-offset-forest'
      : 'bg-forest text-cream hover:bg-forest-soft focus-visible:ring-forest focus-visible:ring-offset-canvas',
  )

  return (
    <article
      aria-labelledby={`plan-${tier.id}-name`}
      className={cn(
        'relative flex h-full flex-col rounded-[28px] p-6 pt-8 landing:p-8',
        recommended
          ? 'landing:z-10 bg-gradient-to-br from-evergreen-deep via-forest to-evergreen-deep text-cream ring-1 ring-white/15 shadow-landing-deep landing:scale-[1.025]'
          : 'bg-canvas text-forest ring-1 ring-soil/10 shadow-landing-soft',
      )}
    >
      {recommended ? (
        <>
          <span
            aria-hidden
            className="pointer-events-none absolute inset-0 overflow-hidden rounded-[inherit]"
          >
            <span className="absolute inset-0 bg-gradient-to-tr from-evergreen-deeper/85 via-transparent to-evergreen-light/10" />
            <span className="absolute -top-24 right-0 size-64 rounded-full bg-mint/15 blur-3xl" />
          </span>
          <BatikBackdrop id={`landing-batik-${tier.id}`} className="opacity-90" />
        </>
      ) : null}

      {recommended && tier.badge ? (
        <span className="absolute -top-3.5 left-1/2 z-20 inline-flex -translate-x-1/2 items-center gap-1.5 whitespace-nowrap rounded-full bg-daisy px-3.5 py-1.5 text-[11.5px] font-semibold leading-none text-forest shadow-sm ring-1 ring-black/5">
          <Star className="size-3.5 fill-forest" strokeWidth={1.8} aria-hidden />
          {tier.badge}
        </span>
      ) : null}

      <div className="relative z-10 flex h-full flex-1 flex-col">
        <span
          className={cn(
            'inline-flex w-fit items-center rounded-full px-2.5 py-1 text-[11.5px] leading-[1.5] font-medium',
            recommended
              ? 'bg-white/10 text-cream ring-1 ring-white/20 backdrop-blur-sm'
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
              recommended ? 'text-cream-muted' : 'text-forest-muted',
            )}
          >
            {LP_PRICING.priceUnit}
          </span>
        </p>

        <p
          className={cn(
            'mt-2 min-h-[44px] text-[13.5px] leading-[1.55]',
            recommended ? 'text-cream-muted' : 'text-forest-muted',
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
          <span
            className={cn(
              'flex size-9 shrink-0 items-center justify-center rounded-full transition-transform duration-200 group-hover:translate-x-0.5 motion-reduce:transition-none',
              recommended ? 'bg-forest text-cream' : 'bg-cream text-forest',
            )}
          >
            <ArrowRight className="size-4" strokeWidth={2.2} aria-hidden />
          </span>
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
              recommended ? 'text-cream-muted' : 'text-forest-muted',
            )}
          >
            {LP_PRICING.featuresLabel}
          </p>

          <ul className="mt-4 flex flex-1 flex-col gap-3">
            {tier.features.map((feature) => (
              <li key={feature.label} className="flex items-start gap-2.5">
                <span
                  aria-hidden
                  className={cn(
                    'mt-[1px] flex size-4 shrink-0 items-center justify-center rounded-full',
                    feature.included
                      ? recommended
                        ? 'bg-white/10 text-mint'
                        : 'bg-sage text-forest'
                      : recommended
                        ? 'bg-white/5 text-cream/35'
                        : 'bg-sage/60 text-forest-muted/50',
                  )}
                >
                  {feature.included ? (
                    <Check className="size-2.5" strokeWidth={3.2} />
                  ) : (
                    <Minus className="size-2.5" strokeWidth={2.6} />
                  )}
                </span>
                <span
                  className={cn(
                    'text-[13.5px] leading-[1.55]',
                    feature.included
                      ? recommended
                        ? 'text-cream/90'
                        : 'text-forest'
                      : recommended
                        ? 'text-cream-muted'
                        : 'text-forest-muted/60',
                  )}
                >
                  {feature.label}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </article>
  )
}

