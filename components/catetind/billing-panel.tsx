'use client'

import { useState } from 'react'
import {
  CalendarClock,
  Check,
  CreditCard,
  Crown,
  Hourglass,
  MessageCircle,
  Mic,
  ReceiptText,
  RefreshCw,
  ScanLine,
  ShieldCheck,
  Sparkles,
  Tags,
  TriangleAlert,
  Wallet,
  XCircle,
  Zap,
  type LucideIcon,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import { CATET_AJA_PLAN, HERO_PLAN, formatIDR } from '@/lib/data/pricing'
/* Semua angka kuota AI datang dari sini — bagian tampilan tidak menyimpan
   satu pun kuota/harga add-on (aturan yang sama dengan `lib/data/pricing.ts`). */
import {
  AI_ADDON_PACKAGES,
  AI_FUEL_COPY,
  AI_QUOTA_EXHAUSTED_COPY,
  AI_QUOTA_RESET_DATE,
  AI_RESET_RULE_COPY,
  formatTokens,
  remainingPercent,
  type AiQuotaActivityId,
} from '@/lib/ai-quota'
import { useAiQuota } from '@/hooks/use-ai-quota'
import { AnnualPlanModal } from './annual-plan-modal'
import { ConfirmDialog, DialogButton } from './settings-dialog'
import { PAYMENT_METHODS } from './payment-method-logos'
import { TopUpModal } from './top-up-modal'

/* ── Mock data halaman Langganan & Billing (inventaris #18) ────────────────────
   Harga paket dibaca dari `lib/data/pricing.ts`, angka kuota AI dari
   `lib/ai-quota.ts` — file ini tidak menyimpan nominal milik orang lain. */

type CurrentPlan = {
  name: string
  price: string
  period: string
  activeUntil: string
  paymentMethod: string
}

/* Angka & nama paket aktif DIBACA dari `lib/data/pricing.ts` — halaman yang
   menjual (checkout) dan halaman yang menagih (di sini) tidak boleh punya dua
   daftar harga (PRD 4594–4606). Langganan mock-nya periode TAHUNAN, sama seperti
   baris "Paket Waras - Annual" di riwayat pembayaran di bawah.

   name sengaja di-type `string` (bukan literal) supaya perbandingan paket aktif
   di modal tahunan (pro-rated upgrade) tetap valid secara tipe. */
const CURRENT_PLAN: CurrentPlan = {
  name: HERO_PLAN.name,
  price: formatIDR(HERO_PLAN.annual),
  period: '/ tahun',
  activeUntil: '21 Oktober 2026',
  paymentMethod: 'GoPay •••• 4821',
}

/* STATUS LANGGANAN — satu sumber untuk pill status di kartu paket aktif.
   Tiga kondisi di inventaris #18: aktif (mint), grace period (amber, masa
   tenggang 7 hari), dan expired (prem). Warnanya mengikuti kanon Domain 2B.2:
   tidak ada merah alarm — "lewat batas" = prem, "mendekati batas" = amber. */
export type SubscriptionStatusId = 'aktif' | 'grace' | 'expired'

const STATUS_META: Record<
  SubscriptionStatusId,
  { label: string; pill: string; icon: LucideIcon }
> = {
  aktif: { label: 'Aktif', pill: 'bg-mint/30 text-forest', icon: ShieldCheck },
  grace: {
    label: 'Grace Period (7 hari tersisa)',
    pill: 'bg-hud-amber/30 text-ink/70',
    icon: Hourglass,
  },
  expired: { label: 'Expired', pill: 'bg-plum/20 text-plum', icon: TriangleAlert },
}

/** status aktif sekarang (mock) — ganti ke 'grace'/'expired' saat mereview UI */
const SUBSCRIPTION_STATUS: SubscriptionStatusId = 'aktif'

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

/* paket add-on yang dibeli di riwayat (mock) — dicari dari daftar kanon supaya
   nominal kwitansi selalu sama dengan harga di modal top-up */
const SEDANG_PACKAGE =
  AI_ADDON_PACKAGES.find((pkg) => pkg.id === 'sedang') ?? AI_ADDON_PACKAGES[0]

/* riwayat pembayaran (mock) — semuanya LUNAS. Nominal langganan DITURUNKAN dari
   tabel harga kanon, jadi kwitansi dan harga jual tidak pernah beda cerita. */
const BILLING_HISTORY: BillingHistoryItem[] = [
  {
    id: 'inv-2026-08',
    date: '12 Agustus 2026',
    label: `${HERO_PLAN.name} - Annual`,
    amount: HERO_PLAN.annual,
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
    label: `${CATET_AJA_PLAN.name} - Annual`,
    amount: CATET_AJA_PLAN.annual,
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
  /**
   * Modal PAKET TAHUNAN — dibuka dari tombol "Perpanjang" di kartu paket aktif.
   *
   * Peran dibagi dua supaya tidak ada dua alur yang saling menabrakan:
   *   · modal ini (`annual-plan-modal`)  = memilih paket & periode (termasuk
   *     UPGRADE dengan bayar selisih) — "saya mau paket yang mana";
   *   · modal Renewal (`renewal-modal`, task 14) = MEMPERPANJANG masa aktif yang
   *     mau habis di H-1, muncul sendiri di Home, biasanya satu tap — "saya mau
   *     lanjut pakai yang sekarang".
   * Keduanya membaca `lib/data/pricing.ts` yang sama, jadi satu harga di mana pun.
   */
  const [annualOpen, setAnnualOpen] = useState(false)

  return (
    <>
      <div className="grid gap-4 lg:grid-cols-[1.05fr_1fr]">
        {/* kolom kiri: paket aktif lalu metode pembayaran (urutan sesuai brief) */}
        <div className="flex flex-col gap-4">
          <CurrentPlanCard onUpgrade={() => setAnnualOpen(true)} />
          <PaymentMethodCard />
        </div>
        <FuelGaugeCard />
      </div>

      {/* band CTA — pola kartu "Enterprise plans" referensi: label + copy + CTA besar */}
      <section className="mt-4 rounded-[1.75rem] bg-gradient-to-br from-forest to-forest-soft p-5 ring-1 ring-soil/12 sm:p-6">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-cream/10 px-2.5 py-1 text-[11px] font-medium text-cream/80">
          <Zap className="size-3.5 text-mint" strokeWidth={2.4} />
          {AI_FUEL_COPY.addonBandBadge}
        </span>

        <div className="mt-4 lg:flex lg:items-center lg:justify-between lg:gap-6">
          <p className="text-[13px] leading-relaxed break-words text-cream/65 lg:max-w-md">
            <b className="font-semibold text-cream">{AI_FUEL_COPY.addonBandTitle}</b>
          </p>

          <button
            type="button"
            onClick={() => setTopUpOpen(true)}
            className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl bg-mint px-6 py-3.5 text-sm font-semibold text-forest transition-colors hover:bg-cream active:scale-[0.99] lg:mt-0 lg:w-auto lg:shrink-0"
          >
            <Zap className="size-4" strokeWidth={2.4} />
            {AI_FUEL_COPY.addonBandCta}
          </button>
        </div>
      </section>

      <BillingHistorySection />

      {/* jalur berhenti berlangganan — selalu terlihat, satu klik dari sini */}
      <CancelSubscriptionCard />

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
    <section className="flex flex-col rounded-[1.75rem] bg-cream p-5 ring-1 ring-soil/12 sm:p-6">
      <div className="flex items-start gap-3">
        <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-forest text-mint">
          <Crown className="size-5" strokeWidth={2.2} />
        </span>
        <div className="min-w-0 flex-1">
          <StatusPill status={SUBSCRIPTION_STATUS} />
          <h2 className="mt-2 text-xl font-semibold tracking-tight text-ink">
            {CURRENT_PLAN.name}
          </h2>
          <p className="mt-1 text-[13px] leading-relaxed break-words text-ink/55">
            Paket aktif. Terima kasih udah support CatetInd! 🌿
          </p>
        </div>
      </div>

      <dl className="mt-5 grid grid-cols-2 gap-2.5">
        <div className="rounded-2xl bg-cream px-3.5 py-3 ring-1 ring-soil/8">
          <dt className="flex items-center gap-1.5 text-[11px] text-ink/45">
            <CalendarClock className="size-3.5" strokeWidth={2.2} />
            Aktif sampai
          </dt>
          <dd className="mt-1 text-[13px] font-semibold leading-snug text-ink">
            {CURRENT_PLAN.activeUntil}
          </dd>
        </div>
        <div className="rounded-2xl bg-cream px-3.5 py-3 ring-1 ring-soil/8">
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
        {/* Tombol ini membuka modal paket tahunan (pilih paket/periode = upgrade),
            BUKAN modal Renewal yang muncul sendiri di Home saat H-1. Lihat catatan
            pembagian peran di `BillingPanel`. */}
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

/** pill status langganan — ikon + nada mengikuti STATUS_META */
function StatusPill({ status }: { status: SubscriptionStatusId }) {
  const meta = STATUS_META[status]
  const Icon = meta.icon

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold',
        meta.pill,
      )}
    >
      <Icon className="size-3.5" strokeWidth={2.4} aria-hidden />
      {meta.label}
    </span>
  )
}

/* ── kartu: berhenti berlangganan (anti dark pattern, Domain 5A) ───────────────
   Satu tautan jelas di bawah halaman — bukan tombol abu-abu kecil di halaman
   tersembunyi, bukan alur "hubungi CS dulu". Copy-nya hangat dan jujur: data
   tetap aman & bisa di-export kapan aja, tanpa guilt-trip. */
function CancelSubscriptionCard() {
  const [open, setOpen] = useState(false)

  function handleCancel() {
    setOpen(false)
    /* TODO: POST /api/subscription/cancel → Midtrans stop recurring.
       Demo ini belum punya billing server, jadi cukup diumumkan lewat toast. */
    toast('Langganan dihentikan. Terima kasih udah bareng kami 💚', {
      description: 'Aktif sampai akhir periode berjalan. Bisa lanjut lagi kapan aja.',
    })
  }

  return (
    <>
      <section className="mt-4 rounded-[1.75rem] bg-cream p-5 ring-1 ring-soil/12 sm:p-6">
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-ink/55 underline decoration-soil/25 underline-offset-4 transition-colors hover:text-plum hover:decoration-plum/40"
        >
          <XCircle className="size-4" strokeWidth={2.2} aria-hidden />
          Berhenti Berlangganan
        </button>
        <p className="mt-2 text-[11.5px] leading-relaxed text-ink/45">
          Tanpa jebakan, tanpa telepon ke retention agent. Satu klik, kelar.
        </p>
      </section>

      <ConfirmDialog
        id="cancel-subscription"
        open={open}
        onClose={() => setOpen(false)}
        icon={XCircle}
        tone="danger"
        title="Berhenti berlangganan?"
        body="Mau istirahat langganan? Nggak masalah. Data keuanganmu tetap aman dan bisa di-export kapan aja. Kami tunggu kamu balik! 💚"
        actions={
          <>
            <DialogButton tone="danger" onClick={handleCancel}>
              Ya, Berhenti
            </DialogButton>
            <DialogButton tone="neutral" onClick={() => setOpen(false)}>
              Batal
            </DialogButton>
          </>
        }
      />
    </>
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
  const baseLeftPct = quota.remainingPct
  const addon = quota.addon

  return (
    <section className="flex flex-col rounded-[1.75rem] bg-cream p-5 ring-1 ring-soil/12 sm:p-6">
      <div className="flex items-baseline justify-between gap-2">
        <h2 className="text-xl font-semibold tracking-tight text-ink">
          {AI_FUEL_COPY.cardTitle}
        </h2>
        <span className="text-sm font-semibold text-ink/45 tabular-nums">
          {quota.remainingPct}% {AI_FUEL_COPY.remainingLabel}
        </span>
      </div>

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
          <dt className="flex items-center gap-1.5 text-[11px] text-ink/45">
            <span className="size-2 shrink-0 rounded-full bg-forest" aria-hidden />
            {AI_FUEL_COPY.baseLabel}
          </dt>
          <dd className="mt-1 text-[13px] font-semibold tabular-nums text-ink">
            {formatTokens(quota.baseTokensRemaining)} sisa
          </dd>
          <p className="mt-0.5 text-[11px] text-ink/45 tabular-nums">
            {AI_FUEL_COPY.recordsLeft(quota.recordsLeft)}
          </p>
        </div>
        <div className="rounded-2xl bg-cream px-3.5 py-3 ring-1 ring-soil/8">
          <dt className="flex items-center gap-1.5 text-[11px] text-ink/45">
            <span className="size-2 shrink-0 rounded-full bg-hud-sage" aria-hidden />
            {AI_FUEL_COPY.addonLabel}
          </dt>
          <dd className="mt-1 text-[13px] font-semibold tabular-nums text-ink">
            {formatTokens(addon.tokensRemaining)} sisa
          </dd>
          <p className="mt-0.5 text-[11px] text-ink/45 tabular-nums">
            {AI_FUEL_COPY.recordsLeft(addon.recordsLeft)}
          </p>
        </div>
      </dl>

      {/* rincian per aktivitas — angka turunan tabel kanon PRD 4778–4786 */}
      <p className="mt-4 text-[10px] font-semibold tracking-[0.16em] text-ink/40 uppercase">
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
                <span className="min-w-0 flex-1 text-[13px]">{row.label}</span>
                <span className="shrink-0 text-[12px] font-medium text-ink/35 tabular-nums">
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
        <p className="mt-4 rounded-2xl bg-hud-amber/15 px-3.5 py-3 text-[12px] leading-relaxed text-ink/70 ring-1 ring-hud-amber/30">
          {AI_QUOTA_EXHAUSTED_COPY.body}
        </p>
      )}

      {/* tanggal reset + aturannya (kanon PRD 4800–4802) */}
      <p className="mt-4 flex flex-wrap items-center gap-1.5 text-[12px] font-medium text-ink/55">
        <CalendarClock className="size-3.5 shrink-0" strokeWidth={2.2} aria-hidden />
        {AI_FUEL_COPY.resetLabel}:
        <span className="tabular-nums">{AI_QUOTA_RESET_DATE}</span>
      </p>
      <p className="mt-1.5 text-[11px] leading-relaxed text-ink/40">{AI_RESET_RULE_COPY}</p>
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
    <section className="flex items-center gap-3.5 rounded-[1.75rem] bg-cream p-5 ring-1 ring-soil/12 sm:px-6">
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
      {/* Tombol "Ubah" DIHAPUS (paket 29). Alasannya apa adanya: mengganti metode
          pembayaran tersimpan butuh manajemen token di sisi Midtrans
          (POST /api/payment/methods → hapus/daftarkan ulang token), dan
          integrasi Midtrans memang SENGAJA belum dikerjakan di repo demo ini
          (lihat ROADMAP-HALAMAN §3/§5). Tombol yang tetap dipasang sambil
          menunggu API = kontrol mati; jadi lebih jujur kontrolnya tidak ada,
          dan kartunya cukup menjelaskan metode mana yang akan dipakai. */}
    </section>
  )
}

/* ── section: riwayat pembayaran ─────────────────────────────────────────────── */
function BillingHistorySection() {
  return (
    <section className="mt-4 rounded-[1.75rem] bg-cream p-5 ring-1 ring-soil/12 sm:p-6">
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

      <ul className="mt-4 divide-y divide-soil/12 border-t border-soil/12">
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
