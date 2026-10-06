'use client'

import { Check, Star, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  LANDING_TIERS,
  PRICING_COPY,
  PRICING_TRUST_BADGES,
  formatIDR,
  type LandingTier,
} from '@/lib/data/landing'
import { useLandingCta } from './landing-cta-provider'

/* ── SECTION 5 · PRICING + CTA PRIMER ───────────────────────────────────────
   Tiga kartu sekali-bayar. "Paket Waras" ditonjolkan (badge + ring hijau +
   sedikit menonjol di desktop). CTA tiap kartu membuka `LeadSheet` lewat
   `useLandingCta().openFor(tier.id)` — bukan tautan, karena pembelian dimulai
   dengan registrasi di dalam sheet. */
export function PricingSection() {
  const { openFor } = useLandingCta()

  return (
    <section
      id="pricing"
      aria-labelledby="pricing-title"
      className="scroll-mt-20 border-t border-soil/8 bg-sage/25 py-16 lg:py-24"
    >
      <div className="mx-auto w-full max-w-[1120px] px-5 sm:px-6 lg:px-8">
        <header className="mx-auto max-w-2xl text-center">
          <p className="text-[11px] font-medium tracking-[0.16em] text-forest uppercase">
            {PRICING_COPY.eyebrow}
          </p>
          <h2
            id="pricing-title"
            className="mt-2 font-display text-3xl font-medium tracking-tight text-forest lg:text-4xl"
          >
            {PRICING_COPY.title}
          </h2>
          <p className="mt-3 text-[14px] leading-relaxed text-forest/55">{PRICING_COPY.subtitle}</p>
        </header>

        <div className="mt-10 grid grid-cols-1 items-start gap-5 lg:grid-cols-3 lg:gap-6">
          {LANDING_TIERS.map((tier) => (
            <PricingCard key={tier.id} tier={tier} onSelect={() => openFor(tier.id)} />
          ))}
        </div>

        <ul className="mx-auto mt-8 flex max-w-3xl flex-col gap-2.5 sm:flex-row sm:flex-wrap sm:justify-center sm:gap-x-6 sm:gap-y-2">
          {PRICING_TRUST_BADGES.map((badge) => (
            <li
              key={badge.text}
              className="flex items-center gap-2 text-[12.5px] leading-relaxed text-forest/65"
            >
              <span aria-hidden className="text-base">
                {badge.emoji}
              </span>
              {badge.text}
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}

function PricingCard({ tier, onSelect }: { tier: LandingTier; onSelect: () => void }) {
  return (
    <div
      className={cn(
        'relative flex h-full flex-col rounded-[1.75rem] bg-cream p-6 ring-1 transition-shadow',
        tier.recommended
          ? 'ring-2 ring-forest shadow-[0_34px_70px_-40px_rgba(69,89,78,0.6)] lg:-mt-3'
          : 'ring-soil/12',
      )}
    >
      {tier.badge ? (
        <span className="absolute -top-3 left-6 inline-flex items-center gap-1 rounded-full bg-brand px-3 py-1 text-[11px] font-medium text-forest shadow-sm">
          <Star className="size-3" strokeWidth={2.6} aria-hidden />
          {tier.badge}
        </span>
      ) : null}

      <h3 className="font-display text-xl font-medium tracking-tight text-forest">{tier.name}</h3>
      <p className="mt-1 text-[12.5px] leading-relaxed text-forest/55">{tier.tagline}</p>

      <p className="mt-4 font-display text-4xl font-semibold tracking-tight tabular-nums text-forest">
        {formatIDR(tier.price)}
      </p>
      <p className="mt-1 text-[11.5px] font-medium text-forest">{tier.periodLabel}</p>

      <ul className="mt-5 flex flex-1 flex-col gap-2.5">
        {tier.features.map((feature) => (
          <li key={feature.label} className="flex items-start gap-2.5 text-[13px] leading-snug">
            {feature.included ? (
              <Check className="mt-0.5 size-4 shrink-0 text-forest" strokeWidth={2.8} aria-hidden />
            ) : (
              <X className="mt-0.5 size-4 shrink-0 text-forest/25" strokeWidth={2.8} aria-hidden />
            )}
            <span className={cn(feature.included ? 'text-forest/75' : 'text-forest/35 line-through')}>
              {feature.label}
            </span>
          </li>
        ))}
      </ul>

      <button
        type="button"
        onClick={onSelect}
        className={cn(
          'mt-6 flex h-12 w-full items-center justify-center rounded-full text-[14px] font-medium transition-all duration-200 active:scale-[0.99] motion-reduce:transition-none',
          tier.recommended
            ? 'bg-forest text-cream shadow-[0_16px_34px_-18px_rgba(69,89,78,0.9)] hover:bg-forest-soft'
            : 'border border-forest/30 bg-cream text-forest hover:bg-forest hover:text-cream',
        )}
      >
        {tier.ctaLabel}
      </button>
    </div>
  )
}
