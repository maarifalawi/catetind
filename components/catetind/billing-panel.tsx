'use client'

import { useState } from 'react'
import Link from 'next/link'
import {
  CalendarClock, Check, CreditCard, MessageCircle, Mic, ReceiptText, RefreshCw, ScanLine, ShieldCheck, Tags, TriangleAlert, Zap, type LucideIcon } from 'lucide-react'
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
/* Semua angka kuota AI datang dari sini — bagian tampilan tidak menyimpan
   satu pun kuota/harga add-on (aturan yang sama dengan `lib/data/pricing.ts`). */
import {
  AI_FUEL_COPY,
  AI_PLAN_LOCKED_COPY,
  AI_QUOTA_EXHAUSTED_COPY,
  AI_UNLIMITED_BADGE,
  formatTokens,
  planQuota,
  remainingPercent,
  type AiQuotaActivityId,
} from '@/lib/ai-quota'
import { useAiQuota } from '@/hooks/use-ai-quota'
import { usePurchaseHistory } from '@/hooks/use-purchase-history'
import type { PurchaseStatus } from '@/lib/subscription/purchases'
import { TopUpModal } from './top-up-modal'

/* ── Data halaman Langganan & Billing (inventaris #18) ────────────────────────
   TIDAK ADA data contoh di file ini. Semua yang tampil dibaca dari sumbernya:
     · paket & harga         → `lib/data/pricing.ts` (yang sama dengan yang ditagih)
     · kuota & add-on AI     → `lib/ai-quota.ts`
     · riwayat pembayaran    → tabel `purchases` akun ini lewat
                               `/api/billing/purchases` (`usePurchaseHistory`)

   Sebelumnya di sini ada tiga baris kwitansi karangan yang sama untuk SEMUA akun
   — akun baru pun langsung melihat "Paket Waras Rp 129.000", "Top Up AI Rp 29.000",
   dan "Paket Catet Aja Rp 99.000" seolah-olah sudah membayar. Untuk aplikasi uang itu
   klaim palsu, bukan sekadar hiasan: riwayat pembayaran dipakai user untuk
   memastikan uangnya benar-benar tercatat.

   PAKET 84: tidak ada lagi masa aktif, tanggal berakhir, grace period, status
   "expired", perpanjangan, atau tombol berhenti berlangganan — semuanya mustahil
   untuk paket akses selamanya (sekali bayar). Yang tersisa: paket yang dimiliki,
   FITUR apa yang terbuka karenanya, dan ajakan upgrade untuk fitur terkunci. */


/* Ikon per aktivitas kuota — label & angkanya datang dari `lib/ai-quota.ts`;
   di sini cuma ikonnya, karena ikon adalah lapis tampilan (React), bukan data. */
const ACTIVITY_ICON: Record<AiQuotaActivityId, LucideIcon> = {
  categorize: Tags,
  chat: MessageCircle,
  ocr: ScanLine,
  voice: Mic,
  appreciation: MessageCircle,
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
        <span className="inline-flex items-center gap-1.5 rounded-full bg-cream/10 px-2.5 py-1 text-[12px] font-medium text-cream">
          <Zap className="size-3.5 text-mint" strokeWidth={2.4} />
          {AI_FUEL_COPY.addonBandBadge}
        </span>

        <div className="mt-4 lg:flex lg:items-center lg:justify-between lg:gap-6">
          <p className="text-[14px] leading-relaxed break-words text-cream lg:max-w-md">
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

  /* Baris penjelasan di bawah nama paket. Untuk paket LIFETIME sengaja `null`
     (tidak dirender): kalimat "Akses selamanya. Sekali bayar, tanpa tagihan
     berkala" dihapus atas permintaan pemilik repo, dan dua kartu tepat di
     bawahnya (Durasi = "Selamanya", Harga sekali bayar) sudah menyatakan hal yang
     sama tanpa perlu diulang sebagai kalimat. */
  const body = !plan
    ? BILLING_COPY.noPlanBody
    : expired
      ? BILLING_COPY.expiredBody
      : monthly
        ? BILLING_COPY.activeMonthlyBody
        : null

  return (
    <section className="flex flex-col rounded-[1.75rem] bg-cream p-5 ring-1 ring-soil/12 sm:p-6">
      <div className="flex items-start gap-3">
        <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-forest text-mint">
          </span>
        <div className="min-w-0 flex-1">
          <PlanPill />
          <h2 className="mt-2 text-xl font-medium tracking-tight text-forest">
            {plan ? plan.name : BILLING_COPY.noPlan}
          </h2>
          {body && (
            <p className="mt-1 text-[14px] leading-relaxed break-words text-forest-muted">{body}</p>
          )}
        </div>
      </div>

      <dl className="mt-5 grid grid-cols-2 gap-2.5">
        <div className="rounded-2xl bg-cream px-3.5 py-3 ring-1 ring-soil/8">
          <dt className="flex items-center gap-1.5 text-[12px] text-forest-muted">
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
          <dt className="flex items-center gap-1.5 text-[12px] text-forest-muted">
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

        {/* Catatan kaki: untuk paket LIFETIME tidak ada (kalimat "Lifetime tidak
            perlu diperpanjang." dihapus atas permintaan pemilik repo — durasi
            "Selamanya" di kartu atas sudah menyatakannya). Untuk paket yang sudah
            berakhir, `readOnlyNote` TETAP tampil karena ia menjelaskan sebab
            penambahan data ditahan. */}
        {!(plan && !monthly) && (
          <p className="mt-1 text-center text-[12px] leading-relaxed text-forest-muted">
            {BILLING_COPY.readOnlyNote}
          </p>
        )}
      </div>
    </section>
  )
}

/** pill status paket — jujur untuk tiga keadaan: aktif, expired, belum diketahui. */
function PlanPill() {
  const { plan, planKnown, expired, isLifetime } = useSubscriptionGate()

  if (!plan) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-hud-amber/30 px-2.5 py-1 text-[12px] font-medium text-forest-soft">
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
   tambahan + rincian per aktivitas), tapi DIPUTAR ke framing SISA: isian bar =
   kuota yang masih tersisa, tanpa kata habis/limit & tanpa warna merah. Dua
   kolam TIDAK digabung jadi satu persen — kuota dasar (berlaku SEKALI di bulan
   pertama paket, tanpa refill otomatis) adalah angka utama; token add-on punya
   barisnya sendiri.
   Sejak prompt 24, baris token add-on itu IKUT hidup: ia membaca pembelian dari
   modal Top Up, dan sejak paket 42 ia juga membaca LIMPAHAN pemakaian lewat satu
   snapshot kuota (`useAiQuota()` di `lib/ai-usage-store.ts`) — jadi banner kuota
   di Home dan angka di kartu ini tidak mungkin beda cerita. */
function FuelGaugeCard() {
  /* Satu snapshot kuota HIDUP (paket 42): angka di kartu ini turun setiap kali
     user memakai AI/voice/OCR dan naik saat top up — sama persis dengan kartu
     sidebar, banner Home, dan header AI Coach (`lib/ai-usage-store.ts`). */
  const quota = useAiQuota()
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
        <p className="mt-2 text-[14px] leading-relaxed text-forest-muted">
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
        <span className="text-sm font-medium text-forest-muted tabular-nums">
          {pq.unlimited
            ? AI_UNLIMITED_BADGE
            : `${quota.remainingPct}% ${AI_FUEL_COPY.remainingLabel}`}
        </span>
      </div>
      {/* Catatan revisi: paragraf "Tanpa batas kuota. Fair-use berlaku…"
          (AI_UNLIMITED_NOTE) DIMINTA DIHAPUS dari kartu ini. Badge
          "Tanpa batas" di kanan judul sudah menyatakan hal yang sama tanpa
          mengulang janji fair-use di setiap layar. */}

      {/* bar sisa KUOTA DASAR — nada hangat (mint → olive → cantelope), bukan alarm.
          Paket tanpa batas tidak punya bar: tidak ada yang bisa menyusut. */}
      {!pq.unlimited && (
        <>
          <div
            role="progressbar"
            aria-label={
              quota.exhausted
                ? AI_QUOTA_EXHAUSTED_COPY.progressLabel
                : 'Sisa kuota dasar AI bulan ini'
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
        </>
      )}

      {/* pemisahan kolam — "base quota vs add-on" yang diminta inventaris #18.
          PAKET TANPA BATAS (paket 104) tidak punya kolam yang bisa dihitung:
          menampilkan "sisa token" di bawah "Tanpa batas" adalah dua cerita di satu
          kartu, persis keluhan pemilik produk soal kartu sidebar. */}
      {!pq.unlimited && (
        <dl className="mt-3 grid grid-cols-2 gap-2.5">
        <div className="rounded-2xl bg-cream px-3.5 py-3 ring-1 ring-soil/8">
          <dt className="flex items-center gap-1.5 text-[12px] text-forest-muted">
            <span className="size-2 shrink-0 rounded-full bg-forest" aria-hidden />
            {AI_FUEL_COPY.baseLabel}
          </dt>
          <dd className="mt-1 text-[14px] font-medium tabular-nums text-forest">
            {formatTokens(quota.baseTokensRemaining)} sisa
          </dd>
          <p className="mt-0.5 text-[12px] text-forest-muted tabular-nums">
            {AI_FUEL_COPY.recordsLeft(quota.recordsLeft)}
          </p>
        </div>
        <div className="rounded-2xl bg-cream px-3.5 py-3 ring-1 ring-soil/8">
          <dt className="flex items-center gap-1.5 text-[12px] text-forest-muted">
            <span className="size-2 shrink-0 rounded-full bg-hud-sage" aria-hidden />
            {AI_FUEL_COPY.addonLabel}
          </dt>
          <dd className="mt-1 text-[14px] font-medium tabular-nums text-forest">
            {formatTokens(addon.tokensRemaining)} sisa
          </dd>
          <p className="mt-0.5 text-[12px] text-forest-muted tabular-nums">
            {AI_FUEL_COPY.recordsLeft(addon.recordsLeft)}
          </p>
        </div>
        </dl>
      )}

      {/* rincian per aktivitas — angka turunan tabel kanon PRD 4778–4786 */}
      {!pq.unlimited && (
        <>
          <p className="mt-4 text-[11px] font-medium tracking-[0.16em] text-forest-muted uppercase">
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
                    <span className="shrink-0 text-[13px] font-medium text-forest-muted tabular-nums">
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
            <p className="mt-4 rounded-2xl bg-hud-amber/15 px-3.5 py-3 text-[13px] leading-relaxed text-forest-soft ring-1 ring-hud-amber/30">
              {AI_QUOTA_EXHAUSTED_COPY.body}
            </p>
          )}
        </>
      )}
    </section>
  )
}


/* ── section: riwayat pembayaran (nyata, per akun) ─────────────────────────────
   Sumbernya `/api/billing/purchases` → tabel `purchases` milik akun ini. Tidak
   ada lagi daftar contoh: kalau akun belum pernah membayar, kartunya KOSONG dan
   mengatakannya — bukan diisi kwitansi karangan supaya "kelihatan penuh". */

/** tampilan tiap status pembayaran (label dari `BILLING_COPY`, warna di sini) */
const PURCHASE_STATUS_VIEW: Record<
  PurchaseStatus,
  { label: string; className: string; icon: boolean }
> = {
  paid: { label: BILLING_COPY.paidLabel, className: 'bg-mint/30 text-forest', icon: true },
  pending: {
    label: BILLING_COPY.historyStatusPending,
    className: 'bg-hud-amber/25 text-forest-soft',
    icon: false,
  },
  failed: {
    label: BILLING_COPY.historyStatusFailed,
    className: 'bg-sage/40 text-forest-muted',
    icon: false,
  },
  refunded: {
    label: BILLING_COPY.historyStatusRefunded,
    className: 'bg-sage/60 text-forest',
    icon: false,
  },
}

/** tanggal yang ditampilkan: kapan LUNAS kalau ada, kalau belum kapan dibuat */
function formatPurchaseDate(paidAt: string | null, createdAt: string | null): string {
  const iso = paidAt ?? createdAt
  if (!iso) return ''
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return ''
  return new Intl.DateTimeFormat('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(date)
}

/** satu keadaan kosong/gagal — judul, satu kalimat, jalan keluar opsional */
function HistoryNotice({
  title,
  body,
  onRetry,
}: {
  title: string
  /** keterangan tambahan — opsional; empty state cukup satu kalimat + aksi */
  body?: string
  onRetry?: () => void
}) {
  return (
    <div className="mt-4 rounded-2xl bg-sage/25 px-4 py-3.5 ring-1 ring-soil/8">
      <p className="text-[14px] font-medium text-forest">{title}</p>
      {body && <p className="mt-1 text-[12.5px] leading-relaxed text-forest-muted">{body}</p>}
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-forest px-3.5 py-1.5 text-[12.5px] font-medium text-cream transition-colors hover:bg-forest-soft active:scale-95"
        >
          <RefreshCw className="size-3.5" strokeWidth={2.4} aria-hidden />
          Coba lagi
        </button>
      )}
    </div>
  )
}

function BillingHistorySection() {
  const { state, reload } = usePurchaseHistory()

  return (
    <section className="mt-4 rounded-[1.75rem] bg-cream p-5 ring-1 ring-soil/12 sm:p-6">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-xl font-medium tracking-tight text-forest">{BILLING_COPY.historyTitle}</h2>
        </div>
        <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-sage text-forest">
          <ReceiptText className="size-4" strokeWidth={2.2} />
        </span>
      </div>

      {state.status === 'loading' && (
        <p className="mt-4 text-[13px] text-forest-muted" role="status">
          {BILLING_COPY.historyLoading}
        </p>
      )}

      {state.status === 'unavailable' && (
        <HistoryNotice
          title={BILLING_COPY.historyUnavailableTitle}
          body={BILLING_COPY.historyUnavailableBody}
        />
      )}

      {state.status === 'error' && (
        <HistoryNotice
          title={BILLING_COPY.historyFailedTitle}
          body={BILLING_COPY.historyFailedBody}
          onRetry={reload}
        />
      )}

      {state.status === 'ready' && state.items.length === 0 && (
        <div data-catetind-empty>
          <HistoryNotice title={BILLING_COPY.historyEmptyTitle} />
        </div>
      )}

      {state.status === 'ready' && state.items.length > 0 && (
        <ul className="mt-4 divide-y divide-soil/12 border-t border-soil/12">
          {state.items.map((item) => {
            const view = PURCHASE_STATUS_VIEW[item.status]
            const date = formatPurchaseDate(item.paidAt, item.createdAt)
            return (
              <li key={item.orderId} className="flex items-center gap-3 py-3.5">
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[14px] font-medium text-forest">
                    {item.label}
                  </span>
                  {date && (
                    <span className="mt-0.5 block text-[12px] text-forest-muted">{date}</span>
                  )}
                </span>
                <span className="shrink-0 text-right">
                  <span className="block text-[14px] font-medium text-forest tabular-nums">
                    {item.amount > 0 ? formatIDR(item.amount) : '—'}
                  </span>
                  <span
                    className={cn(
                      'mt-1 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium',
                      view.className,
                    )}
                  >
                    {view.icon && <Check className="size-2.5" strokeWidth={3.6} />}
                    {view.label}
                  </span>
                </span>
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}
