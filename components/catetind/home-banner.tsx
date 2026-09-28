'use client'

import { memo, useEffect, useState } from 'react'
import Link from 'next/link'
import { CalendarClock, Fuel, PiggyBank, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  renewalBannerCopy,
  shouldShowRenewalBanner,
  type RenewalState,
} from '@/lib/data/renewal'
import { SINKING_NUDGE_COPY } from '@/lib/data/budget'
import { AI_GAUGE_BANNER_COPY, AI_QUOTA_EXHAUSTED_COPY } from '@/lib/ai-quota'
import { useAiQuota } from '@/hooks/use-ai-quota'
import { DEMO_MODE } from '@/lib/demo'
import { TopUpModal } from './top-up-modal'

/* ── mock kondisi — nanti dari backend (Domain 5A, 2C.3, 4B) ──
   Catatan: kondisi RENEWAL tidak lagi hidup di sini. Ia dibaca dari
   `lib/data/renewal.ts` (satu sumber dengan modal Renewal), supaya banner &
   modalnya tidak pernah beda cerita soal sisa hari.
   Sama untuk pemakaian AI: angkanya dibaca dari `lib/ai-quota.ts`, bukan
   di-mock ulang di sini — soft-nudge ini menilai angka yang sama dengan yang
   tampil di kartu sidebar, halaman Billing, dan dokumen /terms. */
const DEMO = {
  /* tanggal >5 & belum kontribusi (Domain 2C.3). Saklarnya ikut
     `NEXT_PUBLIC_DEMO` (paket 42): di produksi nudge ini hanya boleh muncul
     kalau kondisinya BENAR-BENAR terjadi, bukan selalu. */
  sinkingFundPending: DEMO_MODE,
}

/** ambang soft-nudge ala PRD 4770/4894: muncul hanya saat pemakaian >70% */
const SOFT_NUDGE_USAGE_PCT = 70

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
        tone === 'white' && 'bg-cream ring-soil/12',
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
        className="flex size-7 shrink-0 items-center justify-center rounded-full text-ink/35 transition-colors hover:bg-soil/8 hover:text-ink"
      >
        <X className="size-3.5" strokeWidth={2.4} />
      </button>
    </div>
  )
}

/**
 * Stack banner conditional di Home — priority: Renewal > AI Fuel Gauge > Sinking Fund.
 * Dismiss per-banner tersimpan di localStorage dan muncul lagi keesokan harinya.
 *
 * Banner RENEWAL menerima datanya dari luar (`renewalState`) dan CTA-nya membuka
 * modal Renewal (`onOpenRenewal`) — jadi ia benar-benar berfungsi, bukan pajangan,
 * dan modalnya bisa ditinjau ulang kapan saja tanpa menghapus localStorage.
 *
 * Banner KUOTA AI (prompt 24) sekarang juga berfungsi penuh: CTA-nya membuka
 * `TopUpModal` yang sudah ada (bukan modal kedua), dan setelah "pembayaran" mock
 * masuk, token add-on bertambah di sesi ini sehingga banner-nya berhenti sendiri.
 * Nudge yang tetap menagih beli SESUDAH user beli = dark pattern, dan repo ini
 * menolaknya (PRD 4507–4509/4594: tanpa auto-renew, transparan, tanpa dorongan
 * berulang).
 */
/** Dibungkus `memo` — props-nya primitif/stabil (state dari hook, callback
 *  `useCallback`), jadi tidak perlu ikut re-render saat HomeScreen mengubah state
 *  popup lain (lihat catatan di cash-flow-card.tsx).
 *  State dismiss lokalnya tetap jalan normal. */
export const HomeBanners = memo(function HomeBanners({
  renewalState,
  renewalHandled,
  onOpenRenewal,
}: {
  /** kondisi langganan (mock) dari `useRenewalReminder` */
  renewalState: RenewalState
  /** true = siklus ini sudah diperpanjang → banner renewal berhenti sendiri */
  renewalHandled: boolean
  /** buka modal Renewal (One-Tap Renew) */
  onOpenRenewal: () => void
}) {
  /* hydrate dismiss dari localStorage (setelah mount — anti hydration mismatch) */
  const [mounted, setMounted] = useState(false)
  const [dismissed, setDismissed] = useState<DismissedMap>({})
  /** modal Top Up AI — dibuka CTA banner kuota (reuse komponen yang sama
   *  dengan /settings/billing; harga & token tetap dari `lib/ai-quota.ts`) */
  const [topUpOpen, setTopUpOpen] = useState(false)
  /** snapshot kuota AI hidup (paket 42): angka yang sama dengan kartu sidebar,
   *  Fuel Gauge Billing, dan header AI Coach — dan angka itu TURUN saat dipakai */
  const quota = useAiQuota()

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

  const showRenewal = !renewalHandled && shouldShowRenewalBanner(renewalState)
  const renewalCopy = renewalBannerCopy(renewalState)
  /* soft-nudge kuota: pemakaian kuota dasar >70% DAN user belum menambah token
     di sesi ini — begitu sudah beli, ajakannya selesai (lihat catatan komponen).
     Saat kuota benar-benar habis, banner tetap muncul (persen sisa 0) tapi
     kalimatnya berganti jadi penjelasan + jalan keluar, bukan ajakan halus. */
  const showAiGauge =
    quota.usedPct > SOFT_NUDGE_USAGE_PCT && quota.addon.purchasedTokens === 0
  const showFundNudge = DEMO.sinkingFundPending && today.getDate() > 5

  return (
    <>
      {/* 1 — RENEWAL BANNER (H-7/H-3/H-1 sebelum expired, Domain 5A & task 14) */}
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
          title={renewalCopy.title}
          body={renewalCopy.body}
          cta={
            <button
              type="button"
              onClick={onOpenRenewal}
              className="shrink-0 rounded-full bg-forest px-4 py-2 text-xs font-semibold text-cream transition-colors hover:bg-forest-soft active:scale-95"
            >
              {renewalCopy.cta}
            </button>
          }
        />
      )}

      {/* 2 — AI USAGE FUEL GAUGE (muncul saat >70% usage, berhenti setelah top up) */}
      {showAiGauge && !isDismissed('ai-gauge') && (
        <BannerShell
          tone="white"
          dismissLabel={AI_GAUGE_BANNER_COPY.dismissLabel}
          onDismiss={() => dismiss('ai-gauge')}
          icon={
            <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-sage text-forest">
              <Fuel className="size-4.5" strokeWidth={2.2} />
            </span>
          }
          title={quota.exhausted ? AI_QUOTA_EXHAUSTED_COPY.bannerTitle : AI_GAUGE_BANNER_COPY.title}
          body={
            quota.exhausted ? (
              <span>{AI_QUOTA_EXHAUSTED_COPY.body}</span>
            ) : (
              <span className="flex items-center gap-2">
                <span className="h-1.5 w-24 overflow-hidden rounded-full bg-soil/[0.09]">
                  <span
                    className="block h-full rounded-full bg-hud-amber"
                    style={{ width: `${quota.usedPct}%` }}
                  />
                </span>
                <span className="tabular-nums">
                  {AI_GAUGE_BANNER_COPY.usage(quota.usedPct, quota.remainingPct)}
                </span>
              </span>
            )
          }
          cta={
            <button
              type="button"
              onClick={() => setTopUpOpen(true)}
              className="shrink-0 rounded-full px-2 py-1 text-xs font-semibold text-forest transition-colors hover:bg-sage/60"
            >
              {AI_GAUGE_BANNER_COPY.cta}
            </button>
          }
        />
      )}

      {/* 3 — SINKING FUND NUDGE (tanggal >5, belum kontribusi).
          CTA-nya TAUTAN, bukan tombol diam: setoran dikerjakan di kartu Celengan
          Impian (/budget) karena di sanalah daftar dana & sheet setornya hidup —
          Home tidak boleh menyimpan salinan state dana yang bisa beda cerita. */}
      {showFundNudge && !isDismissed('fund-nudge') && (
        <BannerShell
          tone="white"
          dismissLabel={SINKING_NUDGE_COPY.dismissLabel}
          onDismiss={() => dismiss('fund-nudge')}
          icon={
            <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-mint/25 text-forest">
              <PiggyBank className="size-4.5" strokeWidth={2.2} />
            </span>
          }
          title={SINKING_NUDGE_COPY.title}
          body={SINKING_NUDGE_COPY.body}
          cta={
            <Link
              href={SINKING_NUDGE_COPY.ctaHref}
              className="shrink-0 rounded-full bg-sage px-4 py-2 text-xs font-semibold text-forest transition-colors hover:bg-mint/40 active:scale-95"
            >
              {SINKING_NUDGE_COPY.cta}
            </Link>
          }
        />
      )}

      {/* modal Top Up AI (prompt 24) — satu komponen untuk Home & Billing, jadi
          harga, token, dan aturan reset tidak punya salinan kedua di repo ini */}
      <TopUpModal open={topUpOpen} onClose={() => setTopUpOpen(false)} />
    </>
  )
})

