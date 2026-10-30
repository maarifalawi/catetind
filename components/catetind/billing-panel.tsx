'use client'

import { useState } from 'react'
import Link from 'next/link'
import {
  CalendarClock,
  Check,
  CreditCard,
  Crown,
  MessageCircle,
  Mic,
  ReceiptText,
  RefreshCw,
  ScanLine,
  ShieldCheck,
  Sparkles,
  Tags,
  TriangleAlert,
  Zap,
  type LucideIcon,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  BILLING_COPY,
  LIFETIME_LABEL,
  PLANS,
  buildCheckoutHref,
  formatIDR,
  priceFor,
} from '@/lib/data/pricing'
import { useSubscriptionGate } from './subscription-gate-provider'
import { useAiQuotaReset } from '@/hooks/use-ai-quota-reset'
/* Semua angka kuota AI datang dari sini — bagian tampilan tidak menyimpan
   satu pun kuota/harga add-on (aturan yang sama dengan `lib/data/pricing.ts`). */
import {
  AI_ADDON_PACKAGES,
  AI_FUEL_COPY,
  AI_PLAN_LOCKED_COPY,
  AI_QUOTA_EXHAUSTED_COPY,
  AI_QUOTA_RESET_FALLBACK,
  AI_RESET_RULE_COPY,
  AI_UNLIMITED_BADGE,
  AI_UNLIMITED_NOTE,
  formatTokens,
  planQuota,
  remainingPercent,
  type AiQuotaActivityId,
} from '@/lib/ai-quota'
import { useAiQuota } from '@/hooks/use-ai-quota'
import { TopUpModal } from './top-up-modal'

/* ── Mock data halaman Langganan & Billing (inventaris #18) ────────────────────
   Harga paket dibaca dari `lib/data/pricing.ts`, angka kuota AI dari
   `lib/ai-quota.ts` — file ini tidak menyimpan nominal milik orang lain. */

/* ── Data halaman Langganan & Billing (inventaris #18) ────────────────────────
   Harga paket dibaca dari `lib/data/pricing.ts`, angka kuota AI dari
   `lib/ai-quota.ts` — file ini tidak menyimpan nominal milik orang lain.

   PAKET 84: tidak ada lagi masa aktif, tanggal berakhir, grace period, status
   "expired", perpanjangan, atau tombol berhenti berlangganan — semuanya mustahil
   untuk paket akses selamanya (sekali bayar). Yang tersisa: paket yang dimiliki,
   FITUR apa yang terbuka karenanya, dan ajakan upgrade untuk fitur yang masih
   terkunci. */

/** satu baris riwayat pembayaran (mock) */
type BillingHistoryItem = {
  id: string
  date: string
  label: string
  amount: number
}

/* paket add-on yang dibeli di riwayat (mock) — dicari dari daftar kanon supaya
   nominal kwitansi selalu sama dengan harga di modal top-up */
const SEDANG_PACKAGE = AI_ADDON_PACKAGES.find((pkg) => pkg.id === 'sedang') ?? AI_ADDON_PACKAGES[0]

/* riwayat pembayaran (mock) — semuanya LUNAS. Nominal DITURUNKAN dari tabel harga
   kanon (`PLANS[].lifetime`), jadi kwitansi dan harga jual tidak pernah beda
   cerita. Produksi: dibaca dari tabel `purchases` lewat endpoint pembayaran. */
const BILLING_HISTORY: BillingHistoryItem[] = [
  {
    id: 'inv-2026-08',
    date: '12 Agustus 2026',
    label: `${PLANS[1].name} - Akses Selamanya`,
    amount: PLANS[1].lifetime,
  },
  {
    id: 'inv-2026-07',
    date: '5 Juli 2026',
    label: `Top Up AI Token - ${SEDANG_PACKAGE.name}`,
    amount: SEDANG_PACKAGE.price,
  },
  {
    id: 'inv-2026-01',
    date: '1 Januari 2026',
    label: `${PLANS[0].name} - Akses Selamanya`,
    amount: PLANS[0].lifetime,
  },
]


/* Ikon per aktivitas kuota — label & angkanya datang dari `lib/ai-quota.ts`;
   di sini cuma ikonnya, karena ikon adalah lapis tampilan (React), bukan data. */
const ACTIVITY_ICON: Record<AiQuotaActivityId, LucideIcon> = {
  categorize: Tags,
  chat: MessageCircle,
  ocr: ScanLine,
  voice: Mic,
  appreciation: Sparkles,
  recap: CalendarClock,
}

/** warna bar SISA: makin tipis makin hangat (mint → olive → cantelope). Tidak ada
    merah — "hampir habis" bukan bahasa yang dipakai app ini (kanon 2B.2 + 5C). */
function barTone(remainingPct: number) {
  if (remainingPct <= 15) return 'bg-hud-amber'
  if (remainingPct <= 35) return 'bg-hud-sage'
  return 'bg-mint'
}

export function BillingPanel() {
  const [topUpOpen, setTopUpOpen] = useState(false)

  /* Band "Top Up AI Token" hanya relevan untuk paket BERKUOTA (paket 85):
     Paket Sultan tidak dibatasi (tidak ada kuota yang perlu ditambah) dan
     Paket Catet Aja tidak punya AI sama sekali. Kalau paket belum diketahui,
     band tetap tampil (jangan menyembunyikan karena ketidaktahuan). */
  const { planId, planKnown } = useSubscriptionGate()
  const planLimits = planQuota(planId)
  const showAddonBand = !planKnown || (planLimits.aiEnabled && !planLimits.unlimited)

  return (
    <>
      <div className="grid gap-4 lg:grid-cols-[1.05fr_1fr]">
        <CurrentPlanCard />
        <FuelGaugeCard />
      </div>

      {/* band CTA — pola kartu "Enterprise plans" referensi: label + copy + CTA besar.
          Disembunyikan untuk paket tanpa kuota AI / tanpa batas (paket 85). */}
      {showAddonBand && (
        <section className="mt-4 rounded-[1.75rem] bg-gradient-to-br from-forest to-forest-soft p-5 ring-1 ring-soil/12 sm:p-6">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-cream/10 px-2.5 py-1 text-[12px] font-medium text-cream/80">
          <Zap className="size-3.5 text-mint" strokeWidth={2.4} />
          {AI_FUEL_COPY.addonBandBadge}
        </span>

        <div className="mt-4 lg:flex lg:items-center lg:justify-between lg:gap-6">
          <p className="text-[14px] leading-relaxed break-words text-cream/65 lg:max-w-md">
            <b className="font-medium text-cream">{AI_FUEL_COPY.addonBandTitle}</b>
          </p>

          <button
            type="button"
            onClick={() => setTopUpOpen(true)}
            className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl bg-mint px-6 py-3.5 text-sm font-medium text-forest transition-colors hover:bg-cream active:scale-[0.99] lg:mt-0 lg:w-auto lg:shrink-0"
          >
            <Zap className="size-4" strokeWidth={2.4} />
            {AI_FUEL_COPY.addonBandCta}
          </button>
        </div>
        </section>
      )}

      <BillingHistorySection />

      <TopUpModal open={topUpOpen} onClose={() => setTopUpOpen(false)} />
    </>
  )
}

/* ── kartu 1: paket aktif + perpanjang/upgrade ─────────────────────────────── */
function formatExpiry(iso: string): string {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return iso
  return new Intl.DateTimeFormat('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(date)
}

function CurrentPlanCard() {
  /* Paket dibaca dari gerbang global (`/api/subscription`) — SATU sumber, sama
     dengan yang dipakai kunci fitur di seluruh app. Kalau paketnya belum bisa
     dibaca, kartu ini jujur berkata "belum ada paket"; tidak ada paket karangan. */
  const { plan, planId, expiresAt, isLifetime, billingPeriod, expired } = useSubscriptionGate()
  const monthly = billingPeriod !== 'lifetime'
  const higherLifetime = PLANS.filter(
    (item) =>
      priceFor(item, {
        period: 'lifetime',
        ownedPlanId: planId,
        ownedIsLifetime: isLifetime,
      }) > 0,
  )

  const body = !plan
    ? BILLING_COPY.noPlanBody
    : expired
      ? BILLING_COPY.expiredBody
      : monthly
        ? BILLING_COPY.activeMonthlyBody
        : BILLING_COPY.activeLifetimeBody

  return (
    <section className="flex flex-col rounded-[1.75rem] bg-cream p-5 ring-1 ring-soil/12 sm:p-6">
      <div className="flex items-start gap-3">
        <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-forest text-mint">
          <Crown className="size-5" strokeWidth={2.2} />
        </span>
        <div className="min-w-0 flex-1">
          <PlanPill />
          <h2 className="mt-2 text-xl font-medium tracking-tight text-forest">
            {plan ? plan.name : BILLING_COPY.noPlan}
          </h2>
          <p className="mt-1 text-[14px] leading-relaxed break-words text-forest/55">{body}</p>
        </div>
      </div>

      <dl className="mt-5 grid grid-cols-2 gap-2.5">
        <div className="rounded-2xl bg-cream px-3.5 py-3 ring-1 ring-soil/8">
          <dt className="flex items-center gap-1.5 text-[12px] text-forest/45">
            <CalendarClock className="size-3.5" strokeWidth={2.2} />
            {monthly ? BILLING_COPY.expiresLabel : BILLING_COPY.durationLabel}
          </dt>
          <dd className="mt-1 text-[14px] font-medium leading-snug text-forest">
            {monthly
              ? plan
                ? expiresAt
                  ? formatExpiry(expiresAt)
                  : BILLING_COPY.monthlyPeriod
                : '-'
              : plan
                ? LIFETIME_LABEL
                : '-'}
          </dd>
        </div>
        <div className="rounded-2xl bg-cream px-3.5 py-3 ring-1 ring-soil/8">
          <dt className="flex items-center gap-1.5 text-[12px] text-forest/45">
            <CreditCard className="size-3.5" strokeWidth={2.2} />
            {BILLING_COPY.priceLabel}
          </dt>
          <dd className="mt-1 text-[14px] font-medium leading-snug text-forest tabular-nums">
            {plan
              ? formatIDR(monthly ? plan.monthly : plan.lifetime)
              : '-'}
          </dd>
        </div>
      </dl>

      <div className="mt-auto flex flex-col gap-2 pt-5">
        {/* Tidak ada tombol perpanjang: paket 30 hari sudah tidak dijual.
            Pelanggan lama diarahkan ke lifetime (selisih/harga penuh dari server). */}
        {planId && (monthly || higherLifetime.length > 0) && (
          <Link
            href={buildCheckoutHref(planId, 'lifetime')}
            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-forest py-3.5 text-sm font-medium text-mint transition-colors hover:bg-forest-soft active:scale-[0.99]"
          >
            <RefreshCw className="size-4" strokeWidth={2.4} />
            {monthly ? BILLING_COPY.legacyUpgradeLabel : BILLING_COPY.upgradeLifetimeLabel}
          </Link>
        )}

        {!planId && (
          <Link
            href={buildCheckoutHref(null, 'lifetime')}
            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-forest py-3.5 text-sm font-medium text-mint transition-colors hover:bg-forest-soft active:scale-[0.99]"
          >
            {BILLING_COPY.choosePlanLabel}
          </Link>
        )}

        <p className="mt-1 text-center text-[12px] leading-relaxed text-forest/45">
          {plan && !monthly ? BILLING_COPY.noRenewNote : BILLING_COPY.readOnlyNote}
        </p>
      </div>
    </section>
  )
}

/** pill status paket — jujur untuk tiga keadaan: aktif, expired, belum diketahui. */
function PlanPill() {
  const { plan, planKnown, expired, isLifetime } = useSubscriptionGate()

  if (!plan) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-hud-amber/30 px-2.5 py-1 text-[12px] font-medium text-forest/70">
        <TriangleAlert className="size-3.5" strokeWidth={2.4} aria-hidden />
        {planKnown ? BILLING_COPY.noPlan : BILLING_COPY.statusUnknown}
      </span>
    )
  }

  if (expired) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-hud-amber/30 px-2.5 py-1 text-[12px] font-medium text-forest">
        <TriangleAlert className="size-3.5" strokeWidth={2.4} aria-hidden />
        {BILLING_COPY.statusExpired}
      </span>
    )
  }

  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-mint/30 px-2.5 py-1 text-[12px] font-medium text-forest">
      <ShieldCheck className="size-3.5" strokeWidth={2.4} aria-hidden />
      {isLifetime ? BILLING_COPY.statusActiveLifetime : BILLING_COPY.statusActiveMonthly}
    </span>
  )
}


/* ── kartu 2: AI Token fuel gauge (inventaris #18) ─────────────────────────────
   Semua angka datang dari `lib/ai-quota.ts` — kartu ini tidak menyimpan satu pun
   kuota, jadi ia, kartu sidebar, banner Home, dan dokumen /terms sepakat.

   Struktur mengikuti contoh PRD 4915–4933 (bar + pemisahan base quota vs token
   tambahan + rincian per aktivitas + tanggal reset), tapi DIPUTAR ke framing
   SISA: isian bar = kuota yang masih tersisa, tanpa kata habis/limit & tanpa
   warna merah. Dua kolam TIDAK digabung jadi satu persen — kuota dasar (yang
   di-reset tanggal 1) adalah angka utama; token add-on punya barisnya sendiri.
   Sejak prompt 24, baris token add-on itu IKUT hidup: ia membaca pembelian dari
   modal Top Up, dan sejak paket 42 ia juga membaca LIMPAHAN pemakaian lewat satu
   snapshot kuota (`useAiQuota()` di `lib/ai-usage-store.ts`) — jadi banner kuota
   di Home dan angka di kartu ini tidak mungkin beda cerita. */
function FuelGaugeCard() {
  /* Satu snapshot kuota HIDUP (paket 42): angka di kartu ini turun setiap kali
     user memakai AI/voice/OCR dan naik saat top up — sama persis dengan kartu
     sidebar, banner Home, dan header AI Coach (`lib/ai-usage-store.ts`). */
  const quota = useAiQuota()
  /* tanggal reset NYATA (paket 86) — dibaca setelah mount lewat hook; sebelum
     terbaca kita sebut keadaannya apa adanya, bukan tanggal mock. */
  const reset = useAiQuotaReset()
  const baseLeftPct = quota.remainingPct
  const addon = quota.addon
  /* Batas kuota ikut PAKET (paket 84): paket tanpa AI tidak punya tangki sama
     sekali, dan Paket Sultan tidak dibatasi. */
  const { planId, planKnown } = useSubscriptionGate()
  const pq = planQuota(planId)

  /* Kartu jujur untuk paket tanpa AI: tidak ada tangki, tidak ada top up —
     yang ada penjelasan + jalan ke halaman paket. */
  if (planKnown && !pq.aiEnabled) {
    return (
      <section className="flex flex-col rounded-[1.75rem] bg-cream p-5 ring-1 ring-soil/12 sm:p-6">
        <h2 className="text-xl font-medium tracking-tight text-forest">
          {AI_PLAN_LOCKED_COPY.cardTitle}
        </h2>
        <p className="mt-2 text-[14px] leading-relaxed text-forest/55">
          {AI_PLAN_LOCKED_COPY.body}
        </p>
      </section>
    )
  }

  return (
    <section className="flex flex-col rounded-[1.75rem] bg-cream p-5 ring-1 ring-soil/12 sm:p-6">
      <div className="flex items-baseline justify-between gap-2">
        <h2 className="text-xl font-medium tracking-tight text-forest">
          {AI_FUEL_COPY.cardTitle}
        </h2>
        <span className="text-sm font-medium text-forest/45 tabular-nums">
          {pq.unlimited
            ? AI_UNLIMITED_BADGE
            : `${quota.remainingPct}% ${AI_FUEL_COPY.remainingLabel}`}
        </span>
      </div>
      {pq.unlimited && (
        <p className="mt-2 text-[13.5px] leading-relaxed text-forest/55">{AI_UNLIMITED_NOTE}</p>
      )}

      {/* bar sisa KUOTA DASAR — nada hangat (mint → olive → cantelope), bukan alarm */}
      <div
        role="progressbar"
        aria-label={
          quota.exhausted ? AI_QUOTA_EXHAUSTED_COPY.progressLabel : 'Sisa kuota dasar AI bulan ini'
        }
        aria-valuenow={quota.remainingPct}
        aria-valuemin={0}
        aria-valuemax={100}
        className="mt-2.5 h-2.5 w-full overflow-hidden rounded-full bg-ink/[0.07]"
      >
        <span
          className={cn(
            'block h-full rounded-full transition-[width] duration-700 ease-out',
            barTone(baseLeftPct),
          )}
          style={{ width: `${Math.max(2, baseLeftPct)}%` }}
        />
      </div>

      {/* pemisahan kolam — "base quota vs add-on" yang diminta inventaris #18 */}
      <dl className="mt-3 grid grid-cols-2 gap-2.5">
        <div className="rounded-2xl bg-cream px-3.5 py-3 ring-1 ring-soil/8">
          <dt className="flex items-center gap-1.5 text-[12px] text-forest/45">
            <span className="size-2 shrink-0 rounded-full bg-forest" aria-hidden />
            {AI_FUEL_COPY.baseLabel}
          </dt>
          <dd className="mt-1 text-[14px] font-medium tabular-nums text-forest">
            {formatTokens(quota.baseTokensRemaining)} sisa
          </dd>
          <p className="mt-0.5 text-[12px] text-forest/45 tabular-nums">
            {AI_FUEL_COPY.recordsLeft(quota.recordsLeft)}
          </p>
        </div>
        <div className="rounded-2xl bg-cream px-3.5 py-3 ring-1 ring-soil/8">
          <dt className="flex items-center gap-1.5 text-[12px] text-forest/45">
            <span className="size-2 shrink-0 rounded-full bg-hud-sage" aria-hidden />
            {AI_FUEL_COPY.addonLabel}
          </dt>
          <dd className="mt-1 text-[14px] font-medium tabular-nums text-forest">
            {formatTokens(addon.tokensRemaining)} sisa
          </dd>
          <p className="mt-0.5 text-[12px] text-forest/45 tabular-nums">
            {AI_FUEL_COPY.recordsLeft(addon.recordsLeft)}
          </p>
        </div>
      </dl>

      {/* rincian per aktivitas — angka turunan tabel kanon PRD 4778–4786 */}
      <p className="mt-4 text-[11px] font-medium tracking-[0.16em] text-forest/40 uppercase">
        {AI_FUEL_COPY.detailLabel}
      </p>
      <ul className="mt-3 space-y-3.5">
        {quota.rows.map((row) => {
          const Icon = ACTIVITY_ICON[row.id]
          /* Math.max(0, …): baris yang pemakaiannya sudah melewati jatah
             aktivitas (tokennya diambil dari add-on) tidak boleh menghasilkan
             lebar bar negatif */
          const leftPct = Math.max(0, remainingPercent(row.callsUsed, row.calls))

          return (
            <li key={row.id}>
              <div className="flex items-baseline gap-3">
                <span className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-sage/20 text-forest">
                  <Icon className="size-3.5" strokeWidth={2.2} />
                </span>
                <span className="min-w-0 flex-1 text-[14px]">{row.label}</span>
                <span className="shrink-0 text-[13px] font-medium text-forest/35 tabular-nums">
                  {AI_FUEL_COPY.callsRemaining(row.callsRemaining, row.calls)}
                </span>
              </div>

              <div
                role="progressbar"
                aria-label={`${row.label} sisa`}
                aria-valuenow={row.callsRemaining}
                aria-valuemin={0}
                aria-valuemax={row.calls}
                className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-ink/[0.07]"
              >
                <span
                  className={cn(
                    'block h-full rounded-full transition-[width] duration-700 ease-out',
                    barTone(leftPct),
                  )}
                  style={{ width: `${leftPct}%` }}
                />
              </div>
            </li>
          )
        })}
      </ul>

      {/* STATE KUOTA HABIS (paket 42): dijelaskan apa adanya — apa yang berhenti
          (voice & scan struk) dan apa yang TETAP jalan (catat manual), plus dua
          jalan keluarnya. Tombol yang mati tanpa penjelasan = teka-teki. */}
      {quota.exhausted && (
        <p className="mt-4 rounded-2xl bg-hud-amber/15 px-3.5 py-3 text-[13px] leading-relaxed text-forest/70 ring-1 ring-hud-amber/30">
          {AI_QUOTA_EXHAUSTED_COPY.body}
        </p>
      )}

      {/* tanggal reset + aturannya (kanon PRD 4800–4802) */}
      <p className="mt-4 flex flex-wrap items-center gap-1.5 text-[13px] font-medium text-forest/55">
        <CalendarClock className="size-3.5 shrink-0" strokeWidth={2.2} aria-hidden />
        {AI_FUEL_COPY.resetLabel}:
        <span className="tabular-nums">{reset?.label ?? AI_QUOTA_RESET_FALLBACK}</span>
      </p>
      <p className="mt-1.5 text-[12px] leading-relaxed text-forest/40">{AI_RESET_RULE_COPY}</p>
    </section>
  )
}


/* ── section: riwayat pembayaran ─────────────────────────────────────────────── */
function BillingHistorySection() {
  return (
    <section className="mt-4 rounded-[1.75rem] bg-cream p-5 ring-1 ring-soil/12 sm:p-6">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-xl font-medium tracking-tight text-forest">{BILLING_COPY.historyTitle}</h2>
          <p className="mt-1 text-[14px] leading-relaxed text-forest/55">
            {BILLING_COPY.historyBody}
          </p>
        </div>
        <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-sage text-forest">
          <ReceiptText className="size-4" strokeWidth={2.2} />
        </span>
      </div>

      <ul className="mt-4 divide-y divide-soil/12 border-t border-soil/12">
        {BILLING_HISTORY.map((item) => (
          <li key={item.id} className="flex items-center gap-3 py-3.5">
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[14px] font-medium text-forest">{item.label}</span>
              <span className="mt-0.5 block text-[12px] text-forest/45">{item.date}</span>
            </span>
            <span className="shrink-0 text-right">
              <span className="block text-[14px] font-medium text-forest tabular-nums">
                {formatIDR(item.amount)}
              </span>
              <span className="mt-1 inline-flex items-center gap-1 rounded-full bg-mint/30 px-2 py-0.5 text-[11px] font-medium text-forest">
                <Check className="size-2.5" strokeWidth={3.6} />
                {BILLING_COPY.paidLabel}
              </span>
            </span>
          </li>
        ))}
      </ul>
    </section>
  )
}
