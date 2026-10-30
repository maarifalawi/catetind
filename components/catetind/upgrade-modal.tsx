'use client'

import Link from 'next/link'
import { ArrowRight, Check, Lock, Sparkles } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useBodyScrollLock } from '@/hooks/use-body-scroll-lock'
import {
  CAPABILITY_LABEL,
  CHECKOUT_PATH,
  UPGRADE_COPY,
  buildUpgradeHref,
  formatIDR,
  lockedCapabilitiesFor,
  priceFor,
  type PlanDefinition,
  type PlanId,
} from '@/lib/data/pricing'
import { nextTier, upgradeHighlights, upgradeTargets } from '@/lib/data/upgrade'
import { useSubscriptionGate } from './subscription-gate-provider'

/* ── MODAL UPGRADE ───────────────────────────────────────────────────────────
   Menampilkan target tier yang lebih tinggi. Nominal SELALU dari `priceFor()`:
     · lifetime → lifetime lebih rendah: selisih;
     · paket lama → lifetime: harga penuh lifetime (tanpa prorate);
     · belum punya paket: harga penuh target.
   Tidak ada tombol palsu: semua CTA menuju halaman bayar dengan
   `period=lifetime` (satu-satunya periode yang dijual). Tidak ada perpanjangan
   bulanan di mana pun — pelanggan lama diarahkan ke lifetime. */

function fill(template: string, values: Record<string, string>): string {
  return Object.entries(values).reduce(
    (text, [key, value]) => text.replace(`{${key}}`, value),
    template,
  )
}

export function UpgradeModal({
  open,
  onClose,
  reason,
}: {
  open: boolean
  onClose: () => void
  /** alasan spesifik (mis. halaman yang sedang dicoba dibuka) */
  reason?: string | null
}) {
  const { plan, planId, isLifetime } = useSubscriptionGate()
  useBodyScrollLock(open)

  if (!open) return null

  const targets = upgradeTargets(planId)
  const hero = nextTier(planId)
  const heroFeatures = hero ? upgradeHighlights(planId, hero, 10) : []
  const stillLocked = hero
    ? lockedCapabilitiesFor(hero.id).map((capability) => CAPABILITY_LABEL[capability])
    : []

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={UPGRADE_COPY.title}
      className="fixed inset-0 z-[90] flex items-end justify-center bg-ink/40 backdrop-blur-sm sm:items-center sm:p-6"
    >
      {/* area luar = tombol tutup yang jujur (bukan kotak mati) */}
      <button
        type="button"
        aria-label={UPGRADE_COPY.closeLabel}
        onClick={onClose}
        className="absolute inset-0 cursor-default"
      />

      <div
        className={cn(
          'relative w-full max-w-[520px] rounded-t-[1.75rem] bg-canvas p-5 ring-1 ring-soil/12 sm:rounded-[1.75rem]',
          'max-h-[88dvh] overflow-y-auto',
        )}
      >
        <h2 className="font-display text-xl font-semibold tracking-tight text-forest">
          {plan ? UPGRADE_COPY.title : UPGRADE_COPY.noPurchaseTitle}
        </h2>
        {/* Catatan kecil hanya muncul saat user belum punya paket aktif. Untuk
            user yang sudah punya paket, panel cukup menampilkan judul + daftar
            fitur — tanpa paragraf pengantar yang mengulang informasi. */}
        {!plan && (
          <p className="mt-2 text-[14px] leading-relaxed text-forest/60">
            {UPGRADE_COPY.noPurchaseBody}
          </p>
        )}

        {reason && (
          <p className="mt-3 flex items-start gap-2 rounded-2xl bg-hud-amber/20 px-3.5 py-2.5 text-[13px] font-medium leading-relaxed text-forest ring-1 ring-hud-amber/30">
            <Lock className="mt-0.5 size-3.5 shrink-0" strokeWidth={2.4} aria-hidden />
            {reason}
          </p>
        )}

        {plan && (
          <p className="mt-3 flex items-center gap-2 rounded-2xl bg-sage/50 px-3.5 py-2.5 text-[13px] text-forest ring-1 ring-soil/10">
            <Sparkles className="size-3.5 shrink-0" strokeWidth={2.4} aria-hidden />
            Paketmu sekarang: <b className="font-medium">{plan.name}</b>
          </p>
        )}

        {/* ── NILAI YANG DIDAPAT, BUKAN CUMA HARGA (paket 100) ──────────────
            Dulu modal ini hanya menampilkan baris paket + nominal. User yang
            merasa "cukup" tidak punya alasan untuk menekan tombol. Sekarang
            daftar kemampuan yang BARU terbuka diturunkan dari matriks
            `PLAN_CAPABILITIES` — bukan copy kedua. */}
        {plan && hero && heroFeatures.length > 0 && (
          <section className="mt-4 rounded-2xl bg-cream p-4 ring-1 ring-soil/12">
            <p className="text-[13.5px] font-medium text-forest">
              Yang kamu dapat di {hero.name}
            </p>
            <ul className="mt-2 grid gap-1.5">
              {heroFeatures.map((feature) => (
                <li
                  key={feature}
                  className="flex items-start gap-2 text-[13px] leading-relaxed text-forest/70"
                >
                  <Check
                    className="mt-0.5 size-3.5 shrink-0 text-forest"
                    strokeWidth={2.8}
                    aria-hidden
                  />
                  {feature}
                </li>
              ))}
            </ul>
            {stillLocked.length > 0 && (
              <p className="mt-2.5 flex items-start gap-1.5 border-t border-soil/10 pt-2.5 text-[12px] leading-relaxed text-forest/50">
                <Lock className="mt-0.5 size-3 shrink-0" strokeWidth={2.6} aria-hidden />
                Masih terkunci setelah upgrade ini: {stillLocked.join(', ')}.
              </p>
            )}
          </section>
        )}

        {!plan && (
          <Link
            href={CHECKOUT_PATH}
            className="mt-5 flex h-13 w-full items-center justify-between gap-3 rounded-full bg-forest px-6 text-cream transition-colors hover:bg-forest-soft"
          >
            <span className="text-[15.5px] font-medium">{UPGRADE_COPY.ctaLabel}</span>
            <ArrowRight className="size-4" strokeWidth={2.4} aria-hidden />
          </Link>
        )}

        {plan && hero === null && (
          <div className="mt-5 rounded-2xl bg-sage/40 p-4 ring-1 ring-soil/10">
            <p className="text-[14px] font-medium text-forest">{UPGRADE_COPY.topTierTitle}</p>
            <p className="mt-1 text-[13px] leading-relaxed text-forest/60">
              {UPGRADE_COPY.topTierBody}
            </p>
          </div>
        )}

        {plan && targets.length > 0 && (
          <ul className="mt-5 flex flex-col gap-2.5">
            {targets.map((target) => (
              <UpgradeTargetRow
                key={target.id}
                target={target}
                ownedPlanId={planId}
                ownedIsLifetime={isLifetime}
              />
            ))}
          </ul>
        )}

        <button
          type="button"
          onClick={onClose}
          className="mt-4 w-full rounded-full px-4 py-2.5 text-[14px] font-medium text-forest/55 transition-colors hover:bg-sage/50"
        >
          {UPGRADE_COPY.laterLabel}
        </button>
      </div>
    </div>
  )
}

/** satu baris target upgrade: nama, selisih dari `priceFor()`, dan CTA sungguhan */
function UpgradeTargetRow({
  target,
  ownedPlanId,
  ownedIsLifetime,
}: {
  target: PlanDefinition
  ownedPlanId: PlanId | null
  ownedIsLifetime: boolean
}) {
  const diff = priceFor(target, { period: 'lifetime', ownedPlanId, ownedIsLifetime })
  return (
    <li className="rounded-2xl bg-cream p-4 ring-1 ring-soil/12">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="flex items-center gap-1.5 text-[14.5px] font-medium text-forest">
            {target.name}
            {target.badge && (
              <span className="shrink-0 rounded-full bg-forest px-2 py-0.5 text-[10.5px] font-medium text-mint">
                {target.badge}
              </span>
            )}
          </p>
          <p className="mt-0.5 text-[12.5px] text-forest/55">{target.subtitle}</p>
        </div>
        <div className="shrink-0 text-right">
          <p className="font-display text-[16px] font-medium tabular-nums text-forest">
            {formatIDR(diff)}
          </p>
          <p className="text-[11.5px] text-forest/45">{UPGRADE_COPY.diffLabel}</p>
        </div>
      </div>

      <p className="mt-2 text-[12px] leading-relaxed text-forest/50">
        {fill(UPGRADE_COPY.diffNote, {
          target: target.name,
          full: formatIDR(target.lifetime),
          amount: formatIDR(diff),
        })}
      </p>

      <Link
        href={buildUpgradeHref(target.id, ownedPlanId, 'lifetime')}
        className="group mt-3 flex h-11 w-full items-center justify-between gap-2 rounded-full bg-forest pl-5 pr-1.5 text-cream transition-colors hover:bg-forest-soft"
      >
        <span className="flex items-center gap-1.5 text-[14px] font-medium">
          <Lock className="size-3.5" strokeWidth={2.6} aria-hidden />
          {fill(UPGRADE_COPY.cta, { amount: formatIDR(diff) })}
        </span>
        <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-cream text-forest">
          <ArrowRight className="size-4" strokeWidth={2.4} aria-hidden />
        </span>
      </Link>
    </li>
  )
}
