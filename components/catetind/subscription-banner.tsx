'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Lock, Sparkles } from 'lucide-react'
import { cn } from '@/lib/utils'
import { CHECKOUT_PATH, buildCheckoutHref, formatIDR } from '@/lib/data/pricing'
import { expiredBannerCopy, upgradeBannerCopy } from '@/lib/data/upgrade'
import { useSubscriptionGate } from './subscription-gate-provider'
import { UpgradeModal } from './upgrade-modal'

/* ── BANNER PAKET GLOBAL ─────────────────────────────────────────────────────
   Banner ini menampilkan keadaan yang NYATA:
     1. paket LAMA 30 hari sudah lewat tanggal → ajak lanjut ke lifetime;
     2. user punya paket tapi belum di tier tertinggi → ajakan upgrade;
     3. user terverifikasi belum punya paket → ajakan memilih paket.

   Tidak ada lagi ajakan memperpanjang 30 hari: paket bulanan sudah tidak
   dijual, jadi jalan keluarnya selalu akses selamanya.

   Nominal selalu dari `priceFor()`; tidak ada angka tulis tangan. Banner tidak
   muncul saat status paket belum bisa dipastikan (configured:false / tanpa
   Supabase) karena menuduh user belum bayar berdasarkan ketidaktahuan itu salah.

   Bisa ditutup (tombol X). State dismiss tidak disimpan; refresh memunculkannya
   lagi supaya user masih punya jalan ke perpanjangan/upgrade. */

export function SubscriptionBanner() {
  const { plan, planId, isLifetime, expired, inputLocked, onPublicRoute } = useSubscriptionGate()
  const [open, setOpen] = useState(false)
  const [dismissed, setDismissed] = useState(false)

  /* Tiga keadaan nyata: expired (ajak perpanjang), sudah beli (ajak upgrade),
     atau terverifikasi belum punya paket (ajak pilih paket). */
  const copy = expired
    ? expiredBannerCopy(plan?.name ?? 'paket')
    : planId
      ? upgradeBannerCopy(planId, formatIDR, isLifetime)
      : inputLocked
        ? upgradeBannerCopy(null, formatIDR)
        : null

  if (onPublicRoute || !copy || dismissed) return null

  const isUpgrade = Boolean(planId) && !expired

  return (
    <>
      <div
        role="status"
        aria-live="polite"
        className={cn(
          'sticky top-0 z-[45] w-full px-4 py-2.5 ring-1 ring-inset backdrop-blur-md',
          /* margin (bukan padding) dipakai supaya kotaknya benar-benar MULAI di
             kanan sidebar desktop — sidebar itu `fixed` z-30, jadi kotak yang
             melebar ke kirinya akan menutupi logo. Di mobile margin-nya 0. */
          'transition-[margin-left] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none',
          'lg:ml-[var(--catet-sidebar-w,280px)]',
          isUpgrade ? 'bg-sage/90 ring-soil/12' : 'bg-hud-amber/20 ring-hud-amber/35',
        )}
      >
        <div className="mx-auto flex max-w-5xl flex-wrap items-center gap-x-3 gap-y-1.5">
          <span
            className={cn(
              'flex size-8 shrink-0 items-center justify-center rounded-full',
              isUpgrade ? 'bg-forest/10 text-forest' : 'bg-hud-amber/35 text-hud-terracotta',
            )}
          >
            {isUpgrade ? (
              <Sparkles className="size-4" strokeWidth={2.2} aria-hidden />
            ) : (
              <Lock className="size-4" strokeWidth={2.2} aria-hidden />
            )}
          </span>

          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-medium tracking-[0.16em] text-forest/45 uppercase">
              {copy.eyebrow}
            </p>
            <p className="text-[13px] leading-snug font-medium text-forest">
              {copy.title}{' '}
              <span className="font-normal text-forest/70">{copy.body}</span>
            </p>
          </div>

          {isUpgrade ? (
            <button
              type="button"
              onClick={() => setOpen(true)}
              className="shrink-0 rounded-full bg-forest px-4 py-2 text-xs font-medium text-cream shadow-[0_12px_24px_-16px_rgba(0,0,0,0.9)] transition-colors hover:bg-forest-soft active:scale-95"
            >
              {copy.cta}
            </button>
          ) : (
            <Link
              href={expired ? buildCheckoutHref(planId ?? null, 'lifetime') : CHECKOUT_PATH}
              className="shrink-0 rounded-full bg-forest px-4 py-2 text-xs font-medium text-cream shadow-[0_12px_24px_-16px_rgba(0,0,0,0.9)] transition-colors hover:bg-forest-soft active:scale-95"
            >
              {copy.cta}
            </Link>
          )}

          <button
            type="button"
            aria-label="Tutup info paket"
            onClick={() => setDismissed(true)}
            className="flex size-7 shrink-0 items-center justify-center rounded-full text-forest/35 transition-colors hover:bg-soil/8 hover:text-forest"
          >
            <span aria-hidden className="text-[15px] leading-none">
              ×
            </span>
          </button>
        </div>
      </div>

      {isUpgrade && (
        <UpgradeModal open={open} onClose={() => setOpen(false)} />
      )}
    </>
  )
}
