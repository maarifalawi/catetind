'use client'

import Link from 'next/link'
import { ArrowRight, Lock } from 'lucide-react'
import { cn } from '@/lib/utils'
import { LOCKED_FEATURE_COPY, formatIDR, lockedBadgeText, type Capability } from '@/lib/data/pricing'
import { capabilityUpgradeOffer } from '@/lib/data/upgrade'
import { useSubscriptionGate } from './subscription-gate-provider'

/* ── CATATAN FITUR TERKUNCI (paket 84) ───────────────────────────────────────
   Satu komponen untuk SEMUA fitur berbayar yang belum terbuka di paket user:
   badge 🔒 + kemampuan yang terkunci + nama paket yang membukanya + CTA yang
   menyebut SELISIHNYA.

   Kenapa satu komponen, bukan empat salinan: nominalnya harus mustahil berbeda
   antar layar. Di sini ia dibaca dari `capabilityUpgradeOffer()` → `priceFor()`,
   sumber yang sama dengan yang dipakai server saat menagih.

   Komponen ini TIDAK dirender saat paket user belum diketahui (`planKnown`
   false, mis. build demo tanpa Supabase): menampilkan "fitur ini terkunci"
   untuk paket yang tidak kita ketahui isinya adalah menuduh user.
   */

export function LockedFeatureNote({
  capability,
  className,
  compact = false,
}: {
  capability: Capability
  className?: string
  /** versi ringkas: satu baris, tanpa kartu — untuk dipasang di dalam panel */
  compact?: boolean
}) {
  const { planId, planKnown, isLifetime } = useSubscriptionGate()
  if (!planKnown) return null

  const offer = capabilityUpgradeOffer(capability, planId, isLifetime)

  if (compact) {
    return (
      <p
        className={cn('flex items-center gap-1.5 text-[12px] leading-relaxed text-forest/55', className)}
      >
        <Lock className="size-3 shrink-0" strokeWidth={2.6} aria-hidden />
        <span>{lockedBadgeText(capability)}</span>
        <Link href={offer.href} className="font-medium text-forest underline underline-offset-2">
          {LOCKED_FEATURE_COPY.ctaLabel}
        </Link>
      </p>
    )
  }

  return (
    <div
      className={cn(
        'rounded-2xl bg-sage/40 p-4 ring-1 ring-soil/12',
        className,
      )}
      role="status"
    >
      <p className="flex items-center gap-1.5 text-[13.5px] font-medium text-forest">
        <Lock className="size-3.5 shrink-0" strokeWidth={2.6} aria-hidden />
        {lockedBadgeText(capability)}
      </p>
      <Link
        href={offer.href}
        className="group mt-3 flex h-10 w-full items-center justify-between gap-2 rounded-full bg-forest pl-4 pr-1 text-cream transition-colors hover:bg-forest-soft"
      >
        <span className="text-[13.5px] font-medium">
          {LOCKED_FEATURE_COPY.ctaLabel}, {formatIDR(offer.amount)}
        </span>
        <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-cream text-forest">
          <ArrowRight className="size-3.5" strokeWidth={2.4} aria-hidden />
        </span>
      </Link>
    </div>
  )
}
