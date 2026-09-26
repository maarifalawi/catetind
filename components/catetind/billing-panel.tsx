'use client'

import { useState } from 'react'
import {
  CalendarClock,
  Check,
  CreditCard,
  Crown,
  MessageCircle,
  ReceiptText,
  RefreshCw,
  ScanLine,
  ShieldCheck,
  Sparkles,
  Tags,
  Wallet,
  Zap,
  type LucideIcon,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { formatIDR } from '@/lib/weekly-recap'
import { AnnualPlanModal } from './annual-plan-modal'
import { PAYMENT_METHODS } from './payment-method-logos'
import { TopUpModal } from './top-up-modal'

/* ── Mock data halaman Langganan & Billing (inventaris #18) ────────────────────
   Satu tempat angka biar kartu plan & fuel gauge tidak pernah beda cerita. */

type CurrentPlan = {
  name: string
  price: string
  period: string
  activeUntil: string
  paymentMethod: string
}

/* name sengaja di-type `string` (bukan literal) supaya perbandingan paket aktif
   di modal tahunan (pro-rated upgrade) tetap valid secara tipe */
const CURRENT_PLAN: CurrentPlan = {
  name: 'Paket Waras',
  price: 'Rp 49.000',
  period: '/ bulan',
  activeUntil: '21 Oktober 2026',
  paymentMethod: 'GoPay •••• 4821',
}

/* e-wallet tersimpan (mock) — logo memakai PaymentMethodId yang sama dengan
   baris logo di modal tahunan biar konsisten */
const SAVED_PAYMENT = {
  logo: 'gopay',
  label: 'GoPay - 0812****899',
} as const

type BillingHistoryItem = {
  id: string
  date: string
  label: string
  amount: number
}

/* riwayat pembayaran (mock) — semuanya LUNAS */
const BILLING_HISTORY: BillingHistoryItem[] = [
  { id: 'inv-2026-08', date: '12 Agustus 2026', label: 'Paket Waras - Annual', amount: 109_000 },
  {
    id: 'inv-2026-07',
    date: '5 Juli 2026',
    label: 'Top Up AI Token - Paket Nongkrong',
    amount: 29_000,
  },
  { id: 'inv-2026-01', date: '1 Januari 2026', label: 'Paket Catet Aja - Annual', amount: 49_000 },
]

type FuelMeter = {
  id: string
  label: string
  icon: LucideIcon
  used: number
  limit: number
}

/* 3 meter utama AI Token. Framing selalu "kamu sudah pakai X dari Y" —
   TIDAK ada kata habis/limit & TIDAK ada warna merah (kanon Domain 2B.2 + 5C). */
const FUEL_METERS: FuelMeter[] = [
  {
    id: 'chat',
    label: 'Chat AI Coach',
    icon: MessageCircle,
    used: 145,
    limit: 150,
  },
  {
    id: 'ocr',
    label: 'Scan Struk OCR',
    icon: ScanLine,
    used: 58,
    limit: 60,
  },
  {
    id: 'category',
    label: 'Auto-Kategori',
    icon: Tags,
    used: 400,
    limit: 500,
  },
]

/** warna bar naik lembut (leaf → olive → cantelope). Bukan alarm, cuma gradasi hangat. */
function barTone(pct: number) {
  if (pct >= 90) return 'bg-hud-amber'
  if (pct >= 75) return 'bg-hud-sage'
  return 'bg-mint'
}

export function BillingPanel() {
  const [topUpOpen, setTopUpOpen] = useState(false)
  /** modal paket tahunan — dibuka dari tombol Perpanjang di kartu paket aktif */
  const [annualOpen, setAnnualOpen] = useState(false)

  /* rata-rata 3 meter — angka turunan, bukan hardcode, biar konsisten */
  const avgPct = Math.round(
    FUEL_METERS.reduce((sum, meter) => sum + (meter.used / meter.limit) * 100, 0) /
      FUEL_METERS.length,
  )

  return (
    <>
      <div className="grid gap-4 lg:grid-cols-[1.05fr_1fr]">
        {/* kolom kiri: paket aktif lalu metode pembayaran (urutan sesuai brief) */}
        <div className="flex flex-col gap-4">
          <CurrentPlanCard onUpgrade={() => setAnnualOpen(true)} />
          <PaymentMethodCard />
        </div>
        <FuelGaugeCard avgPct={avgPct} />
      </div>

      {/* band CTA — pola kartu "Enterprise plans" referensi: label + copy + CTA besar */}
      <section className="mt-4 rounded-[1.75rem] bg-gradient-to-br from-forest to-forest-soft p-5 ring-1 ring-soil/5 sm:p-6">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-cream/10 px-2.5 py-1 text-[11px] font-medium text-cream/80">
          <Zap className="size-3.5 text-mint" strokeWidth={2.4} />
          AI Token Add-on
        </span>

        <div className="mt-4 lg:flex lg:items-center lg:justify-between lg:gap-6">
          <p className="text-[13px] leading-relaxed break-words text-cream/65 lg:max-w-md">
            <b className="font-semibold text-cream">
              Wah, AI Coach kamu udah kerja keras bulan ini!
            </b>
          </p>

          <button
            type="button"
            onClick={() => setTopUpOpen(true)}
            className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl bg-mint px-6 py-3.5 text-sm font-semibold text-forest transition-colors hover:bg-cream active:scale-[0.99] lg:mt-0 lg:w-auto lg:shrink-0"
          >
            <Zap className="size-4" strokeWidth={2.4} />
            Beli Kuota Tambahan
          </button>
        </div>
      </section>

      <BillingHistorySection />

      <TopUpModal open={topUpOpen} onClose={() => setTopUpOpen(false)} />
      <AnnualPlanModal
        open={annualOpen}
        onClose={() => setAnnualOpen(false)}
        currentPlanName={CURRENT_PLAN.name}
      />
    </>
  )
}

/* ── kartu 1: paket aktif + perpanjang ───────────────────────────────────────── */
function CurrentPlanCard({ onUpgrade }: { onUpgrade: () => void }) {
  return (
    <section className="flex flex-col rounded-[1.75rem] bg-cream p-5 ring-1 ring-soil/5 sm:p-6">
      <div className="flex items-start gap-3">
        <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-forest text-mint">
          <Crown className="size-5" strokeWidth={2.2} />
        </span>
        <div className="min-w-0 flex-1">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-mint/30 px-2.5 py-1 text-[11px] font-semibold text-forest">
            <ShieldCheck className="size-3.5" strokeWidth={2.4} />
            Aktif
          </span>
          <h2 className="mt-2 text-xl font-semibold tracking-tight text-ink">
            {CURRENT_PLAN.name}
          </h2>
          <p className="mt-1 text-[13px] leading-relaxed break-words text-ink/55">
            Paket aktif. Terima kasih udah support CatetInd! 🌿
          </p>
        </div>
      </div>

      <dl className="mt-5 grid grid-cols-2 gap-2.5">
        <div className="rounded-2xl bg-cream px-3.5 py-3 ring-1 ring-soil/[0.04]">
          <dt className="flex items-center gap-1.5 text-[11px] text-ink/45">
            <CalendarClock className="size-3.5" strokeWidth={2.2} />
            Aktif sampai
          </dt>
          <dd className="mt-1 text-[13px] font-semibold leading-snug text-ink">
            {CURRENT_PLAN.activeUntil}
          </dd>
        </div>
        <div className="rounded-2xl bg-cream px-3.5 py-3 ring-1 ring-soil/[0.04]">
          <dt className="flex items-center gap-1.5 text-[11px] text-ink/45">
            <CreditCard className="size-3.5" strokeWidth={2.2} />
            Metode tersimpan
          </dt>
          <dd className="mt-1 text-[13px] font-semibold leading-snug text-ink">
            {CURRENT_PLAN.paymentMethod}
          </dd>
        </div>
      </dl>

      <div className="mt-auto pt-5">
        <button
          type="button"
          onClick={onUpgrade}
          className="flex w-full items-center justify-center gap-2 rounded-2xl bg-forest py-3.5 text-sm font-semibold text-mint transition-colors hover:bg-forest-soft active:scale-[0.99]"
        >
          <RefreshCw className="size-4" strokeWidth={2.4} />
          Perpanjang
        </button>
        <p className="mt-3 text-center text-[11px] leading-relaxed text-ink/45">
          {CURRENT_PLAN.price} {CURRENT_PLAN.period} · CatetInd nggak pernah nagih otomatis, kamu
          yang pegang kendali.
        </p>
      </div>
    </section>
  )
}

/* ── kartu 2: AI Token fuel gauge ────────────────────────────────────────────── */
function FuelGaugeCard({ avgPct }: { avgPct: number }) {
  return (
    <section className="flex flex-col rounded-[1.75rem] bg-cream p-5 ring-1 ring-soil/5 sm:p-6">
      <div className="flex items-baseline justify-between gap-2">
        <h2 className="text-xl font-semibold tracking-tight text-ink">Bahan Bakar AI</h2>
        <span className="text-sm font-semibold text-ink/45 tabular-nums">{avgPct}% terpakai</span>
      </div>

      <ul className="mt-3.5 space-y-4">
        {FUEL_METERS.map(({ id, label, icon: Icon, used, limit }) => {
          const pct = Math.round((used / limit) * 100)

          return (
            <li key={id}>
              <div className="flex items-baseline gap-3">
                <span className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-sage/20 text-forest">
                  <Icon className="size-3.5" strokeWidth={2.2} />
                </span>
                <span className="min-w-0 flex-1">{label}</span>
                <span className="text-sm font-medium text-ink/35 tabular-nums">
                  {used}/{limit}
                </span>
              </div>

              <div
                role="progressbar"
                aria-label={`${label} terpakai`}
                aria-valuenow={used}
                aria-valuemin={0}
                aria-valuemax={limit}
                className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-ink/[0.07]"
              >
                <span
                  className={cn(
                    'block h-full rounded-full transition-[width] duration-700 ease-out',
                    barTone(pct),
                  )}
                  style={{ width: `${pct}%` }}
                />
              </div>
            </li>
          )
        })}
      </ul>

      <p className="mt-4 text-[11px] text-ink/40">
        Kuota dasar di-reset tiap tanggal 1 · token add-on kepakai sampai habis.
      </p>
    </section>
  )
}

/* ── kartu: metode pembayaran tersimpan ──────────────────────────────────────── */
function PaymentMethodCard() {
  // TODO: Load saved payment token from Midtrans API
  // (GET /api/payment/methods → { provider, masked_pan, saved_token_id })
  const savedMethod = PAYMENT_METHODS.find((method) => method.id === SAVED_PAYMENT.logo)
  const SavedIcon = savedMethod?.icon ?? Wallet

  return (
    <section className="flex items-center gap-3.5 rounded-[1.75rem] bg-cream p-5 ring-1 ring-soil/5 sm:px-6">
      <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-sage text-forest">
        <SavedIcon className="size-5" strokeWidth={2.2} />
      </span>
      <div className="min-w-0 flex-1">
        <h2 className="text-[10px] font-semibold tracking-[0.16em] text-ink/40 uppercase">
          Metode Pembayaran
        </h2>
        <p className="mt-1 truncate text-sm font-semibold text-ink">{SAVED_PAYMENT.label}</p>
        <p className="mt-0.5 text-[11px] text-ink/45">Dipakai buat perpanjang satu tap</p>
      </div>
      <button
        type="button"
        className="shrink-0 rounded-full px-3 py-1.5 text-[12px] font-semibold text-forest ring-1 ring-forest/20 transition-colors hover:bg-sage"
      >
        Ubah
      </button>
    </section>
  )
}

/* ── section: riwayat pembayaran ─────────────────────────────────────────────── */
function BillingHistorySection() {
  return (
    <section className="mt-4 rounded-[1.75rem] bg-cream p-5 ring-1 ring-soil/5 sm:p-6">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-xl font-semibold tracking-tight text-ink">Riwayat Pembayaran</h2>
          <p className="mt-1 text-[13px] leading-relaxed text-ink/55">
            Semua transaksi kamu tercatat rapi di sini.
          </p>
        </div>
        <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-sage text-forest">
          <ReceiptText className="size-4" strokeWidth={2.2} />
        </span>
      </div>

      <ul className="mt-4 divide-y divide-soil/[0.06] border-t border-soil/[0.06]">
        {BILLING_HISTORY.map((item) => (
          <li key={item.id} className="flex items-center gap-3 py-3.5">
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[13px] font-semibold text-ink">{item.label}</span>
              <span className="mt-0.5 block text-[11px] text-ink/45">{item.date}</span>
            </span>
            <span className="shrink-0 text-right">
              <span className="block text-[13px] font-semibold text-ink tabular-nums">
                {formatIDR(item.amount)}
              </span>
              <span className="mt-1 inline-flex items-center gap-1 rounded-full bg-mint/30 px-2 py-0.5 text-[10px] font-semibold text-forest">
                <Check className="size-2.5" strokeWidth={3.6} />
                Lunas
              </span>
            </span>
          </li>
        ))}
      </ul>
    </section>
  )
}
