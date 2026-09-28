'use client'

import { useEffect, useRef, useState } from 'react'
import { Check, LoaderCircle, Lock, TriangleAlert, Trophy, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useBodyScrollLock } from '@/hooks/use-body-scroll-lock'
import { randomInt, useFomoCounter, type FomoRule } from '@/hooks/use-fomo-counter'
import {
  ANNUAL_PLANS,
  formatIDR,
  type AnnualPlan,
  type AnnualPlanId,
} from '@/lib/data/pricing'
import { PaymentLogoRow } from './payment-method-logos'
import { DEMO_MODE } from '@/lib/demo'

/* ── modal paket tahunan (Annual Subscription) ─────────────────────────────────
   Conversion booster yang dipakai di sini:
   1) scarcity  — sisa slot early bird turun sendiri (15–45 detik sekali)
   2) FOMO      — counter "orang telah berlangganan" naik tiap 3–8 detik
   3) anchoring — harga tahunan dipecah jadi "per bulan" biar terasa murah
   4) decoy     — 3 tier, tier tengah sengaja paling dominan (hero)
   5) pro-rate  — user paket bawah lihat "cukup bayar selisih"

   DAFTAR HARGA & FITUR TIDAK LAGI DI FILE INI — semuanya dibaca dari
   `lib/data/pricing.ts` (satu sumber harga, PRD 4594–4606). Modal ini hanya
   menyusun tampilannya. */

const FOMO_RULES = Object.fromEntries(
  ANNUAL_PLANS.map((plan) => [plan.id, plan.fomo]),
) as Record<AnnualPlanId, FomoRule>

const HERO_PLAN = ANNUAL_PLANS.find((plan) => plan.hero) ?? ANNUAL_PLANS[0]
const CATET_AJA_PLAN = ANNUAL_PLANS.find((plan) => plan.id === 'catet-aja')

/* paksa tampil buat review desain — perilaku produksi: baris selisih HANYA
   muncul kalau paket aktif user memang 'Paket Catet Aja'. Saklarnya sekarang
   ikut `NEXT_PUBLIC_DEMO` (paket 42), bukan `true` keras yang ikut ter-ship. */
const DEMO_SHOW_UPGRADE_DIFF = DEMO_MODE

/** kuota early bird: sisa slot mulai 124 dari total 5.000 */
const EARLY_BIRD_TOTAL = 5_000
const EARLY_BIRD_START = 124

/** pemisah ribuan gaya Indonesia: 2450 → "2.450" */
const formatCount = (n: number) => n.toLocaleString('id-ID')

export function AnnualPlanModal({
  open,
  onClose,
  currentPlanName,
}: {
  open: boolean
  onClose: () => void
  /** nama paket aktif dari halaman billing — dasar hitung selisih upgrade */
  currentPlanName: string
}) {
  /** paket tahunan yang dipilih user — null = tombol Bayar Sekarang disabled */
  const [selectedPlan, setSelectedPlan] = useState<AnnualPlanId | null>(null)
  const [paying, setPaying] = useState(false)
  /** sisa slot early bird — mulai 124, turun 1 tiap 15–45 detik */
  const [slots, setSlots] = useState(EARLY_BIRD_START)
  const panelRef = useRef<HTMLDivElement>(null)
  const payTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useBodyScrollLock(open)

  /* FOMO live: cuma jalan selama modal terbuka */
  const { counts, flashId } = useFomoCounter(FOMO_RULES, open)

  const selected = ANNUAL_PLANS.find((plan) => plan.id === selectedPlan) ?? null
  const isCatetAjaPlan = currentPlanName === CATET_AJA_PLAN?.name
  const showUpgradeDiff = isCatetAjaPlan || DEMO_SHOW_UPGRADE_DIFF

  // TODO: Calculate real pro-rated upgrade price from Supabase subscription data
  /* angka di bawah mock: harga hero - harga paket user sekarang */
  const upgradeDiff = CATET_AJA_PLAN ? HERO_PLAN.price - CATET_AJA_PLAN.price : 0

  const claimedSlots = Math.max(EARLY_BIRD_TOTAL - slots, 0)
  const claimedPct = Math.round((claimedSlots / EARLY_BIRD_TOTAL) * 100)

  /* SCARCITY: sisa slot turun 1 tiap 15–45 detik selama modal terbuka */
  useEffect(() => {
    if (!open) return

    let timer: ReturnType<typeof setTimeout>

    function scheduleNext() {
      timer = setTimeout(() => {
        setSlots((prev) => Math.max(prev - 1, 0))
        scheduleNext()
      }, randomInt(15_000, 45_000))
    }

    scheduleNext()
    return () => clearTimeout(timer)
  }, [open])

  /* ESC menutup panel + fokus pindah ke dialog saat dibuka (a11y) */
  useEffect(() => {
    if (!open) return

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose()
    }

    window.addEventListener('keydown', onKeyDown)
    const raf = requestAnimationFrame(() => panelRef.current?.focus())
    return () => {
      window.removeEventListener('keydown', onKeyDown)
      cancelAnimationFrame(raf)
    }
  }, [open, onClose])

  /* ditutup di tengah proses → batalkan timer mock & kembalikan tombol normal */
  useEffect(() => {
    if (open) return
    if (payTimer.current) {
      clearTimeout(payTimer.current)
      payTimer.current = null
    }
    setPaying(false)
  }, [open])

  useEffect(
    () => () => {
      if (payTimer.current) clearTimeout(payTimer.current)
    },
    [],
  )

  function handlePay() {
    if (!selectedPlan || paying) return

    // TODO: Integrate Midtrans Snap API
    // Alur produksi: POST /api/payment/subscribe → snap token → window.snap.pay()
    // → webhook Midtrans set masa aktif 365 hari + tier plan user.
    setPaying(true)

    /* MOCK: timer ini yang nanti digantikan Midtrans Snap */
    payTimer.current = setTimeout(() => {
      payTimer.current = null
      setPaying(false)
      onClose()
    }, 1600)
  }

  return (
    <div
      className={cn('fixed inset-0 z-[80]', !open && 'pointer-events-none')}
      inert={!open}
      aria-hidden={!open}
    >
      {/* backdrop */}
      <button
        type="button"
        aria-label="Tutup paket tahunan"
        tabIndex={open ? 0 : -1}
        onClick={onClose}
        className={cn(
          'absolute inset-0 bg-ink/50 transition-opacity duration-500 ease-out',
          open ? 'opacity-100' : 'opacity-0',
        )}
      />

      {/* wrapper: sheet bawah di mobile, dialog lebar di desktop (3 kolom) */}
      <div
        className="pointer-events-none absolute inset-0 flex items-end justify-center lg:items-center lg:p-6"
        data-lenis-prevent
      >
        <div
          ref={panelRef}
          role="dialog"
          aria-modal="true"
          aria-labelledby="annual-title"
          aria-describedby="annual-desc"
          tabIndex={-1}
          className={cn(
            'pointer-events-auto flex max-h-[92vh] w-full flex-col overflow-hidden rounded-t-[2rem] bg-cream shadow-[0_-24px_60px_-24px_rgba(69,89,78,0.55)] ring-1 ring-soil/12 outline-none transition-[transform,opacity] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] will-change-transform lg:max-w-4xl lg:rounded-[2rem] lg:shadow-[0_28px_70px_-24px_rgba(69,89,78,0.5)]',
            open
              ? 'translate-y-0 opacity-100 lg:scale-100'
              : 'translate-y-full opacity-0 lg:translate-y-6 lg:scale-95',
          )}
        >
          {/* handle drag (visual) */}
          <div className="mx-auto mt-3 h-1.5 w-10 shrink-0 rounded-full bg-ink/15" aria-hidden />

          {/* A. scarcity banner — elemen paling atas modal */}
          <div className="mx-5 mt-4 shrink-0 rounded-2xl bg-hud-amber/15 px-3.5 py-3 ring-1 ring-hud-amber/40 sm:mx-6">
            <div className="flex items-start gap-2.5">
              <span className="flex size-8 shrink-0 items-center justify-center rounded-xl bg-hud-amber/25 text-hud-terracotta">
                <TriangleAlert className="size-4" strokeWidth={2.4} />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-[12px] leading-snug font-semibold text-ink">
                  Harga Early Bird ditutup setelah 5.000 user pertama.{' '}
                  <span
                    key={slots}
                    className="inline-block animate-[count-pop_0.5s_ease-out] font-semibold whitespace-nowrap text-hud-terracotta tabular-nums"
                  >
                    Sisa slot: {slots}
                  </span>
                </p>
                <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-ink/[0.08]">
                  <span
                    className="block h-full rounded-full bg-hud-terracotta transition-[width] duration-700 ease-out"
                    style={{ width: `${claimedPct}%` }}
                  />
                </div>
                <p className="mt-1 text-[10px] text-ink/45">
                  {formatCount(claimedSlots)} dari {formatCount(EARLY_BIRD_TOTAL)} slot sudah terisi
                </p>
              </div>
            </div>
          </div>

          {/* header */}
          <div className="flex shrink-0 items-start gap-3 px-5 pt-4 sm:px-6">
            <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-mint text-forest">
              <Trophy className="size-5" strokeWidth={2.2} />
            </span>
            <div className="min-w-0 flex-1">
              <h2 id="annual-title" className="text-xl font-semibold tracking-tight text-ink">
                Paket Tahunan
              </h2>
              <p
                id="annual-desc"
                className="mt-0.5 text-[13px] leading-relaxed break-words text-ink/55"
              >
                Aktif 365 hari sekali bayar — pilih yang paling pas buat kamu.
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Tutup"
              className="flex size-9 shrink-0 items-center justify-center rounded-full bg-cream text-ink ring-1 ring-soil/12 transition-colors hover:bg-sage"
            >
              <X className="size-4" strokeWidth={2.2} />
            </button>
          </div>

          {/* B. 3 paket tahunan — side-by-side di desktop, stacked di mobile */}
          <div
            data-lenis-prevent
            className="flex-1 overflow-y-auto overscroll-contain px-5 pt-9 pb-2 sm:px-6 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          >
            <div
              role="radiogroup"
              aria-label="Pilih paket tahunan"
              className="grid gap-3 lg:grid-cols-3"
            >
              {ANNUAL_PLANS.map((plan) => (
                <PlanCard
                  key={plan.id}
                  plan={plan}
                  active={plan.id === selectedPlan}
                  onSelect={() => setSelectedPlan(plan.id)}
                  count={counts[plan.id] ?? plan.fomo.base}
                  flashing={flashId === plan.id}
                  showUpgradeDiff={showUpgradeDiff}
                  upgradeDiff={upgradeDiff}
                />
              ))}
            </div>
          </div>

          {/* E. payment trust + CTA */}
          <div className="shrink-0 border-t border-soil/12 px-5 pt-4 pb-[calc(1.25rem+env(safe-area-inset-bottom))] sm:px-6 lg:pb-5">
            <div className="flex items-center justify-between gap-3 text-[13px]">
              <span className="min-w-0 truncate text-ink/55">
                {selected ? selected.name : 'Belum ada paket dipilih'}
              </span>
              <span
                className={cn(
                  'shrink-0 font-semibold tabular-nums',
                  selected ? 'text-ink' : 'text-ink/35',
                )}
              >
                {selected ? `${formatIDR(selected.price)}/tahun` : '—'}
              </span>
            </div>

            <p className="mt-3 text-[10px] font-semibold tracking-[0.16em] text-ink/40 uppercase">
              Metode pembayaran
            </p>
            <PaymentLogoRow className="mt-1.5" />

            <button
              type="button"
              onClick={handlePay}
              disabled={!selectedPlan || paying}
              className={cn(
                'mt-3.5 flex w-full items-center justify-center gap-2 rounded-2xl py-3.5 text-sm font-semibold transition-colors',
                selectedPlan && !paying
                  ? 'bg-forest text-mint hover:bg-forest-soft active:scale-[0.99]'
                  : 'cursor-not-allowed bg-ink/[0.07] text-ink/35',
              )}
            >
              {paying ? (
                <>
                  <LoaderCircle className="size-4 animate-spin" strokeWidth={2.4} />
                  Memproses…
                </>
              ) : (
                'Bayar Sekarang'
              )}
            </button>

            <p className="mt-3 flex items-start justify-center gap-1.5 text-[11px] leading-relaxed text-ink/45">
              <Lock className="mt-0.5 size-3 shrink-0" strokeWidth={2.4} />
              <span>
                Bayar sekali. Tanpa perpanjangan otomatis. Bisa upgrade kapan aja dengan bayar
                selisih.
              </span>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

/* ── kartu paket tahunan ─────────────────────────────────────────────────────── */
function PlanCard({
  plan,
  active,
  onSelect,
  count,
  flashing,
  showUpgradeDiff,
  upgradeDiff,
}: {
  plan: AnnualPlan
  active: boolean
  onSelect: () => void
  count: number
  flashing: boolean
  showUpgradeDiff: boolean
  upgradeDiff: number
}) {
  const onAccent = Boolean(plan.hero)
  const borderTone = onAccent ? 'border-forest/15' : 'border-soil/12'
  const mutedTone = onAccent ? 'text-forest/65' : 'text-ink/50'
  const bodyTone = onAccent ? 'text-forest' : 'text-ink'

  return (
    <button
      type="button"
      role="radio"
      aria-checked={active}
      onClick={onSelect}
      className={cn(
        'relative flex flex-col rounded-2xl p-4 text-left transition-all duration-200',
        /* tier hero: accent color fill + border tebal + glow biar paling dominan */
        onAccent
          ? 'bg-mint ring-[3px] ring-forest shadow-[0_0_0_4px_rgba(145,187,158,0.45),0_24px_50px_-24px_rgba(69,89,78,0.55)]'
          : 'bg-cream ring-1 ring-soil/12 hover:ring-forest/25',
        active && !onAccent && 'ring-2 ring-forest',
      )}
    >
      {/* badge hero — mengapung di atas kartu */}
      {plan.badge && (
        <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-forest px-3 py-1 text-[10px] font-semibold whitespace-nowrap text-mint">
          {plan.badge}
        </span>
      )}

      <span className="flex items-start justify-between gap-2">
        <span className="min-w-0">
          <span className={cn('block text-[15px] font-semibold tracking-tight', bodyTone)}>
            {plan.name}
          </span>
          <span className={cn('mt-0.5 block text-[11px] leading-relaxed break-words', mutedTone)}>
            {plan.subtitle}
          </span>
        </span>
        <span
          className={cn(
            'mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-full border transition-colors',
            active
              ? 'border-forest bg-forest text-mint'
              : onAccent
                ? 'border-forest/40 bg-cream/60 text-transparent'
                : 'border-ink/20 bg-cream text-transparent',
          )}
          aria-hidden
        >
          <Check className="size-2.5" strokeWidth={3.6} />
        </span>
      </span>

      <span className="mt-3 flex items-baseline gap-1">
        <span className={cn('text-2xl font-semibold tracking-tight tabular-nums', bodyTone)}>
          {formatIDR(plan.price)}
        </span>
        <span className={cn('text-[11px] font-medium', mutedTone)}>/tahun</span>
      </span>

      {plan.anchor && (
        <span className={cn('mt-1 block text-[10px] leading-relaxed', mutedTone)}>
          {plan.anchor}
        </span>
      )}

      {/* fitur — divider tipis per baris, mengikuti pola list di referensi */}
      <span className="mt-3 flex flex-col">
        {plan.features.map((feature) => {
          const isGift = feature.startsWith('🎁')
          return (
            <span
              key={feature}
              className={cn(
                'flex items-start gap-2 border-t py-2 text-[11px] leading-relaxed',
                borderTone,
                bodyTone,
                isGift && 'mt-1 rounded-xl bg-forest/10 px-2 font-semibold',
              )}
            >
              {!isGift && (
                <Check
                  className={cn(
                    'mt-0.5 size-3.5 shrink-0',
                    onAccent ? 'text-forest' : 'text-forest/70',
                  )}
                  strokeWidth={3}
                />
              )}
              <span className="min-w-0">{feature}</span>
            </span>
          )
        })}
      </span>

      {/* D. mock selisih upgrade — relevan kalau user lagi di Paket Catet Aja */}
      {plan.hero && showUpgradeDiff && upgradeDiff > 0 && (
        <span className="mt-2.5 block rounded-xl bg-forest px-2.5 py-2 text-[10px] leading-relaxed font-semibold text-mint">
          (Upgrade sekarang cukup bayar selisih: {formatIDR(upgradeDiff)})
        </span>
      )}

      {/* C. FOMO counter — naik tiap 3–8 detik dengan pop singkat */}
      <span
        className={cn(
          'mt-auto flex flex-wrap items-center gap-1 border-t pt-2.5 text-[10px] font-medium',
          borderTone,
          mutedTone,
        )}
      >
        <span aria-hidden>🔥</span>
        <span
          key={count}
          className={cn(
            'font-semibold tabular-nums',
            bodyTone,
            flashing && 'animate-[count-pop_0.5s_ease-out]',
          )}
        >
          {formatCount(count)}
        </span>
        <span>orang telah berlangganan</span>
      </span>
    </button>
  )
}
