'use client'

import { memo, useEffect, useState } from 'react'
import { CalendarClock, Fuel, PiggyBank, X } from 'lucide-react'
import { cn } from '@/lib/utils'

/* ── mock kondisi — nanti dari backend (Domain 5A, 2C.3, 4B) ── */
const DEMO = {
  renewalDaysLeft: 3, // banner 7 & 3 hari sebelum expired (Domain 5A)
  aiUsagePct: 78, // AI Usage Fuel Gauge — muncul saat usage >70%
  sinkingFundPending: true, // tanggal >5 & belum kontribusi (Domain 2C.3)
}

const KEY = 'catet-home-banners-dismissed'

type DismissedMap = Record<string, string> // bannerId → tanggal dismiss

/** shell banner kompak — ikon, copy, CTA opsional, tombol dismiss */
function BannerShell({
  icon,
  tone,
  title,
  body,
  cta,
  onDismiss,
  dismissLabel,
}: {
  icon: React.ReactNode
  tone: 'amber' | 'white'
  title: React.ReactNode
  body?: React.ReactNode
  cta?: React.ReactNode
  onDismiss: () => void
  dismissLabel: string
}) {
  return (
    <div
      role="status"
      className={cn(
        'flex items-center gap-3 rounded-2xl px-4 py-3 ring-1',
        tone === 'amber' && 'bg-hud-amber/10 ring-hud-amber/25',
        tone === 'white' && 'bg-white ring-black/5',
      )}
    >
      {icon}
      <div className="min-w-0 flex-1">
        <p className="truncate text-[13px] font-semibold text-ink">{title}</p>
        {body && <p className="mt-0.5 text-xs leading-relaxed text-ink/55">{body}</p>}
      </div>
      {cta}
      <button
        type="button"
        aria-label={dismissLabel}
        onClick={onDismiss}
        className="flex size-7 shrink-0 items-center justify-center rounded-full text-ink/35 transition-colors hover:bg-black/5 hover:text-ink"
      >
        <X className="size-3.5" strokeWidth={2.4} />
      </button>
    </div>
  )
}

/**
 * Stack banner conditional di Home — priority: Renewal > AI Fuel Gauge > Sinking Fund.
 * Dismiss per-banner tersimpan di localStorage dan muncul lagi keesokan harinya.
 */
/** Dibungkus `memo` — tidak menerima props, jadi tidak perlu ikut re-render
 *  saat HomeScreen mengubah state popup (lihat catatan di cash-flow-card.tsx).
 *  State dismiss lokalnya tetap jalan normal. */
export const HomeBanners = memo(function HomeBanners() {
  /* hydrate dismiss dari localStorage (setelah mount — anti hydration mismatch) */
  const [mounted, setMounted] = useState(false)
  const [dismissed, setDismissed] = useState<DismissedMap>({})

  useEffect(() => {
    try {
      setDismissed(JSON.parse(localStorage.getItem(KEY) ?? '{}'))
    } catch {
      setDismissed({})
    }
    setMounted(true)
  }, [])

  if (!mounted) return null

  const today = new Date()
  const todayISO = today.toISOString().slice(0, 10)

  const isDismissed = (id: string) => dismissed[id] === todayISO
  const dismiss = (id: string) => {
    const next = { ...dismissed, [id]: todayISO }
    setDismissed(next)
    localStorage.setItem(KEY, JSON.stringify(next))
  }

  const showRenewal = DEMO.renewalDaysLeft > 0 && DEMO.renewalDaysLeft <= 7
  const showAiGauge = DEMO.aiUsagePct > 70
  const showFundNudge = DEMO.sinkingFundPending && today.getDate() > 5

  return (
    <>
      {/* 1 — RENEWAL BANNER (7/3 hari sebelum expired, Domain 5A) */}
      {showRenewal && !isDismissed('renewal') && (
        <BannerShell
          tone="amber"
          dismissLabel="Tutup pengingat perpanjangan"
          onDismiss={() => dismiss('renewal')}
          icon={
            <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-hud-amber/20 text-hud-terracotta">
              <CalendarClock className="size-4.5" strokeWidth={2.2} />
            </span>
          }
          title={`Masa aktifmu tersisa ${DEMO.renewalDaysLeft} hari lagi`}
          body="Tanpa auto-renew — data kamu aman kok. Perpanjang kapan pun kamu siap. 💚"
          cta={
            <button
              type="button"
              className="shrink-0 rounded-full bg-forest px-4 py-2 text-xs font-semibold text-cream transition-colors hover:bg-forest-soft active:scale-95"
            >
              Perpanjang
            </button>
          }
        />
      )}

      {/* 2 — AI USAGE FUEL GAUGE (muncul saat >70% usage) */}
      {showAiGauge && !isDismissed('ai-gauge') && (
        <BannerShell
          tone="white"
          dismissLabel="Tutup info kuota AI"
          onDismiss={() => dismiss('ai-gauge')}
          icon={
            <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-sage text-forest">
              <Fuel className="size-4.5" strokeWidth={2.2} />
            </span>
          }
          title="Kuota AI-mu menyusut"
          body={
            <span className="flex items-center gap-2">
              <span className="h-1.5 w-24 overflow-hidden rounded-full bg-black/[0.06]">
                <span
                  className="block h-full rounded-full bg-hud-amber"
                  style={{ width: `${DEMO.aiUsagePct}%` }}
                />
              </span>
              <span className="tabular-nums">{DEMO.aiUsagePct}% terpakai</span>
            </span>
          }
          cta={
            <button
              type="button"
              className="shrink-0 rounded-full px-2 py-1 text-xs font-semibold text-forest transition-colors hover:bg-sage/60"
            >
              Beli Add-On →
            </button>
          }
        />
      )}

      {/* 3 — SINKING FUND NUDGE (tanggal >5, belum kontribusi) */}
      {showFundNudge && !isDismissed('fund-nudge') && (
        <BannerShell
          tone="white"
          dismissLabel="Tutup pengingat nabung"
          onDismiss={() => dismiss('fund-nudge')}
          icon={
            <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-mint/25 text-forest">
              <PiggyBank className="size-4.5" strokeWidth={2.2} />
            </span>
          }
          title="Dana Darurat belum dikasih jatah bulan ini"
          body="Udah lewat tanggal 5 — yuk sisihkan sedikit. Tanamanmu senang kalau kamu konsisten 🌱"
          cta={
            <button
              type="button"
              className="shrink-0 rounded-full bg-sage px-4 py-2 text-xs font-semibold text-forest transition-colors hover:bg-mint/40 active:scale-95"
            >
              Setor
            </button>
          }
        />
      )}
    </>
  )
})

