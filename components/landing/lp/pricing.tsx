'use client'

import Link from 'next/link'
import { useRef, useState, type KeyboardEvent } from 'react'
import { ArrowRight, Check, Plus, Sparkles } from 'lucide-react'
import {
  LP_PRICING,
  formatIDR,
  lpPlanPrice,
  type LandingTier,
  type LpPricingMode,
} from '@/lib/data/landing'
import { cn } from '@/lib/utils'
import { LandingButton } from './button'
import { LandingReveal } from './reveal'

/* ── SECTION #pricing ────────────────────────────────────────────────────────
   DUA PERIODE NYATA (bukan display-only lagi):
     · monthly  → prabayar 30 hari, harga dari `PLANS[].monthly` (49/79/199)
     · lifetime → sekali bayar, harga dari `PLANS[].lifetime` (109/129/299)

   Default = monthly. CTA kartu selalu menuju checkout dengan `period` yang
   sedang dipilih, jadi angka yang diiklankan = angka yang ditagih. Nominal
   tidak pernah ditulis di JSX — `lpPlanPrice()` membaca satu sumber.

   Toggle dioperasikan mouse & keyboard (ArrowLeft/ArrowRight), tiap tombol
   punya `aria-pressed` + focus ring. Tiga kartu sejajar & sama tinggi mulai
   1200; kartu rekomendasi memakai surface forest, kartu lain putih bersih.
   Tidak ada stagger `mt` — posisi harga, CTA, dan fitur selalu sejajar. */

export function LandingPricingLp() {
  const [mode, setMode] = useState<LpPricingMode>(LP_PRICING.defaultMode)
  const monthlyRef = useRef<HTMLButtonElement>(null)
  const lifetimeRef = useRef<HTMLButtonElement>(null)

  const onToggleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return
    event.preventDefault()
    const next: LpPricingMode = mode === 'monthly' ? 'lifetime' : 'monthly'
    setMode(next)
    if (next === 'monthly') monthlyRef.current?.focus()
    else lifetimeRef.current?.focus()
  }

  return (
    <section
      id="pricing"
      aria-labelledby="landing-pricing-title"
      className="w-full scroll-mt-24 bg-canvas px-6 py-20 landing-tab:px-10 landing:py-[120px]"
    >
      <div className="mx-auto flex w-full max-w-[1200px] flex-col gap-12">
        <div className="flex flex-col items-center gap-4">
          <LandingReveal y={24} className="inline-flex">
            <span className="inline-flex items-center gap-2 rounded-full bg-sage py-0.5 pr-4 pl-0.5">
              <span className="flex size-6 items-center justify-center rounded-full bg-canvas">
                <Sparkles className="size-3.5 text-forest" aria-hidden />
              </span>
              <span className="text-[14px] leading-[1.5] text-forest">{LP_PRICING.eyebrow}</span>
            </span>
          </LandingReveal>

          <LandingReveal y={48} delay={0.2} className="w-full">
            <h2
              id="landing-pricing-title"
              className="mx-auto max-w-full text-center font-display text-[36px] leading-[1.15] font-medium tracking-[-0.03em] text-forest landing-tab:max-w-[520px] landing-tab:text-[48px] landing:max-w-[720px] landing:text-[56px]"
            >
              {LP_PRICING.titleBefore}
              <mark className="box-decoration-clone whitespace-nowrap rounded-[16px] bg-daisy px-3 pb-1 text-forest landing:px-4">
                {LP_PRICING.titleEmphasis}
              </mark>
            </h2>
          </LandingReveal>

          <LandingReveal y={72} delay={0.4} className="w-full">
            <p className="mx-auto max-w-[540px] text-center text-[16px] leading-[1.5] text-forest/60 landing-tab:text-[18px]">
              {LP_PRICING.subtitle}
            </p>
          </LandingReveal>
        </div>

        {/* toggle dua periode */}
        <div className="flex flex-col items-center gap-3">
          <div
            role="group"
            aria-label={LP_PRICING.toggleAria}
            onKeyDown={onToggleKeyDown}
            className="inline-flex items-center gap-1 rounded-full bg-sage p-1 ring-1 ring-soil/5"
          >
            <button
              ref={monthlyRef}
              type="button"
              aria-pressed={mode === 'monthly'}
              data-landing-mode="monthly"
              onClick={() => setMode('monthly')}
              className={cn(
                'rounded-full px-5 py-2.5 text-[13px] font-medium leading-[1.5] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-forest/40',
                mode === 'monthly'
                  ? 'bg-canvas text-forest shadow-[0_2px_10px_rgba(0,0,0,0.06)]'
                  : 'text-forest/60 hover:text-forest',
              )}
            >
              {LP_PRICING.modes[0].label}
            </button>
            <button
              ref={lifetimeRef}
              type="button"
              aria-pressed={mode === 'lifetime'}
              data-landing-mode="lifetime"
              onClick={() => setMode('lifetime')}
              className={cn(
                'rounded-full px-5 py-2.5 text-[13px] font-medium leading-[1.5] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-forest/40',
                mode === 'lifetime'
                  ? 'bg-canvas text-forest shadow-[0_2px_10px_rgba(0,0,0,0.06)]'
                  : 'text-forest/60 hover:text-forest',
              )}
            >
              {LP_PRICING.modes[1].label}
            </button>
          </div>

          <p role="note" className="mx-auto max-w-[540px] text-center text-[13px] leading-[1.5] text-forest/50">
            {mode === 'monthly' ? LP_PRICING.modes[0].note : LP_PRICING.modes[1].note}
          </p>
        </div>

        <div
          data-landing-badge={mode}
          className="grid grid-cols-1 items-stretch gap-4 landing:grid-cols-3"
        >
          {LP_PRICING.tiers.map((tier) => (
            <PricingCard key={tier.id} tier={tier} mode={mode} />
          ))}
        </div>

        <PartnerStrip />

        <p className="text-center text-[12.5px] leading-[1.5] text-forest/50">{LP_PRICING.note}</p>
      </div>
    </section>
  )
}

function PricingCard({
  tier,
  mode,
}: {
  tier: LandingTier
  mode: LpPricingMode
}) {
  const recommended = Boolean(tier.recommended)
  const price = lpPlanPrice(tier.id, mode)
  const periodLabel = LP_PRICING.periodLabels[mode]

  const ctaClass = cn(
    'group mt-6 flex h-12 w-full items-center justify-between gap-3 rounded-[14px] px-5 text-[14px] font-medium leading-[1.5] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 motion-reduce:transition-none',
    recommended
      ? 'bg-daisy text-forest hover:bg-daisy-light focus-visible:ring-daisy focus-visible:ring-offset-forest'
      : 'bg-forest text-cream hover:bg-forest-soft focus-visible:ring-forest focus-visible:ring-offset-canvas',
  )

  return (
    <article
      className={cn(
        'relative flex h-full flex-col overflow-hidden rounded-[28px] p-6 landing:p-8',
        recommended
          ? 'bg-forest text-cream shadow-[0_30px_70px_-30px_rgba(69,89,78,0.65)]'
          : 'bg-canvas text-forest ring-1 ring-soil/10',
      )}
    >
      {recommended ? (
        <span
          aria-hidden
          className="pointer-events-none absolute -right-16 -top-24 size-56 rounded-full bg-daisy/10 blur-2xl"
        />
      ) : null}

      <div className="relative flex flex-col gap-3">
        <div className="flex items-start justify-between gap-3">
          <h3 className="font-display text-[26px] leading-[1.2] font-medium tracking-[-0.02em]">
            {tier.name}
          </h3>
          {recommended && tier.badge ? (
            <span className="inline-flex shrink-0 items-center rounded-full bg-daisy px-3 py-1 text-[11px] leading-[1.5] font-medium text-forest">
              {tier.badge}
            </span>
          ) : null}
        </div>
        <p
          className={cn(
            'min-h-[42px] text-[14px] leading-[1.5]',
            recommended ? 'text-cream/70' : 'text-forest/60',
          )}
        >
          {tier.tagline}
        </p>
      </div>

      <div
        className={cn(
          'relative mt-7 border-t pt-6',
          recommended ? 'border-cream/15' : 'border-soil/10',
        )}
      >
        <p
          data-landing-price={tier.id}
          className="font-display text-[44px] leading-[1.05] font-medium tracking-[-0.04em] tabular-nums landing:text-[48px]"
        >
          {formatIDR(price)}
        </p>
        <p
          className={cn(
            'mt-2 text-[13px] leading-[1.5]',
            recommended ? 'text-cream/60' : 'text-forest/50',
          )}
        >
          {periodLabel}
        </p>
      </div>

      <Link href={LP_PRICING.checkoutHref(tier.id, mode)} className={ctaClass}>
        <span>{tier.ctaLabel}</span>
        <ArrowRight
          className="size-4 shrink-0 transition-transform duration-200 group-hover:translate-x-0.5 motion-reduce:transition-none"
          aria-hidden
        />
      </Link>

      <div
        className={cn(
          'mt-7 flex flex-1 flex-col gap-4 border-t pt-6',
          recommended ? 'border-cream/15' : 'border-soil/10',
        )}
      >
        <p
          className={cn(
            'text-[11px] leading-[1.5] font-medium uppercase tracking-[0.14em]',
            recommended ? 'text-cream/50' : 'text-forest/40',
          )}
        >
          {LP_PRICING.featuresLabel}
        </p>

        <ul className="flex flex-1 flex-col gap-3">
          {tier.features.map((feature) => (
            <li key={feature.label} className="flex items-start gap-2.5">
              {feature.included ? (
                <Check
                  className={cn(
                    'mt-0.5 size-4 shrink-0',
                    recommended ? 'text-daisy' : 'text-forest',
                  )}
                  strokeWidth={2.25}
                  aria-hidden
                />
              ) : (
                <Plus
                  className={cn(
                    'mt-0.5 size-4 shrink-0',
                    recommended ? 'text-cream/25' : 'text-forest/25',
                  )}
                  aria-hidden
                />
              )}
              <span
                className={cn(
                  'text-[14px] leading-[1.5]',
                  feature.included
                    ? recommended
                      ? 'text-cream/90'
                      : 'text-forest'
                    : recommended
                      ? 'text-cream/45'
                      : 'text-forest/50',
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

function PartnerStrip() {
  return (
    <div className="flex flex-col gap-6 rounded-[24px] bg-sage/50 px-6 py-8 ring-1 ring-soil/10 landing:flex-row landing:items-center landing:justify-between landing:px-9">
      <div className="flex flex-col gap-3">
        <span className="text-[11px] leading-[1.5] font-medium uppercase tracking-[0.14em] text-forest/50">
          {LP_PRICING.partner.eyebrow}
        </span>
        <h3 className="max-w-[560px] font-display text-[24px] leading-[1.25] font-medium tracking-[-0.02em] text-forest landing:text-[30px]">
          {LP_PRICING.partner.title}
        </h3>
        <p className="max-w-[560px] text-[14px] leading-[1.5] text-forest/60">
          {LP_PRICING.partner.body}
        </p>
      </div>
      <LandingButton href={LP_PRICING.partner.href} tone="dark" size="md" className="shrink-0">
        {LP_PRICING.partner.ctaLabel}
      </LandingButton>
    </div>
  )
}

