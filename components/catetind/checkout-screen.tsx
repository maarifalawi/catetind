'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowRight, Check, Info, ShieldCheck, Tag } from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  BILLING_PERIOD_LABEL,
  CHECKOUT_COPY,
  CHECKOUT_STEPS,
  FOUNDING_MEMBER,
  HERO_PLAN,
  NO_AUTO_RENEW_BADGE,
  PERIOD_CHOICE_LABEL,
  PLANS,
  PRICING_TRUST_BADGES,
  REFERRAL_DISCOUNT_PCT,
  applyReferralDiscount,
  formatIDR,
  isValidReferralCode,
  monthlyPrice,
  periodNote,
  type BillingPeriod,
  type PlanDefinition,
  type PlanId,
  type TrustBadge,
} from '@/lib/data/pricing'
import { LogoWordmark } from './logo-wordmark'
import { RegistrationSheet, type RegistrationOutcome, type RegistrationResult } from './registration-sheet'
import { registerAccount } from '@/lib/session-client'
import { buildVerifyHref } from '@/lib/data/auth'

/* ── Checkout (/checkout) — inventaris #3 · PRD 5887–5935 ─────────────────────
   Halaman pilih paket + daftar akun. Dua hal harus terasa sepanjang halaman:
   RINGAN (maksimal 3 langkah, 2 field, tanpa password) dan JUJUR (harga
   konsisten, tanpa auto-renew, tanpa countdown/social proof palsu).

   PAKET 64 — ALUR AKTUAL (Midtrans di-bypass sprint ini):
     CTA "Daftar & mulai" → sheet registrasi (email + nama + kode teman
     divalidasi ke DATABASE) → akun Supabase dibuat tanpa password →
       · verifikasi email wajib  → `/login/verify` (langkah "buka emailmu")
       · auto-login (autoconfirm) → Dashboard
   `SnapPaymentSheet` sengaja TIDAK lagi dibuka dari sini: pembayaran Midtrans
   ditunda, dan halaman tidak boleh berpura-pura menagih. Komponennya masih ada
   untuk sprint berikutnya.

   Yang TIDAK ada di sini, dan memang sengaja:
   • field password/telepon/alamat/gender/tanggal lahir (PRD 5904–5905)
   • hitungan mundur "harga naik 5 menit lagi" atau angka pembelian fiktif
     (PRD 5174–5177) — halaman ini hanya menampilkan yang benar-benar diketahui
   • daftar harga sendiri: semua angka dibaca dari `lib/data/pricing.ts`

   Kenapa satu kontrol periode, bukan dua daftar SKU: PRD 4594–4606 menuntut satu
   harga per tier di mana pun. Harga bulanan di sini diturunkan dari harga kanon
   yang sama, dan pilihan "Seumur hidup" membawa paket Founding Member.
   ────────────────────────────────────────────────────────────────────────── */

/** paket yang bisa dipilih: 3 tier langganan + 1 paket seumur hidup */
type OfferId = PlanId | 'founding-member'

const PERIOD_CHOICES: BillingPeriod[] = ['monthly', 'annual', 'lifetime']

export function CheckoutScreen() {
  /** paket terpilih — default paket hero (Waras), yaitu rekomendasi produk */
  const [offerId, setOfferId] = useState<OfferId>(HERO_PLAN.id)
  const [period, setPeriod] = useState<BillingPeriod>('annual')
  /** kode teman: input mentah, kode yang sudah dipakai, dan status error */
  const [codeInput, setCodeInput] = useState('')
  const [appliedCode, setAppliedCode] = useState<string | null>(null)
  const [codeError, setCodeError] = useState(false)
  /** sheet registrasi (paket 64: pembayaran Midtrans di-bypass, jadi tidak ada
   *  sheet pembayaran yang dibuka dari sini) */
  const [registrationOpen, setRegistrationOpen] = useState(false)
  const router = useRouter()

  const isLifetime = offerId === 'founding-member'
  const plan = PLANS.find((item) => item.id === offerId)
  /** periode efektif: paket seumur hidup tidak punya pilihan bulanan/tahunan */
  const effectivePeriod: BillingPeriod = isLifetime ? 'lifetime' : period

  const listPrice = isLifetime
    ? FOUNDING_MEMBER.price
    : plan
      ? effectivePeriod === 'annual'
        ? plan.annual
        : monthlyPrice(plan)
      : 0

  const discount = appliedCode ? listPrice - applyReferralDiscount(listPrice) : 0
  const total = listPrice - discount

  const offerName = isLifetime ? FOUNDING_MEMBER.name : (plan?.name ?? HERO_PLAN.name)
  const features = isLifetime ? FOUNDING_MEMBER.features : (plan?.features ?? HERO_PLAN.features)
  const periodLabel = BILLING_PERIOD_LABEL[effectivePeriod]

  const periodNoteText = useMemo(
    () => (isLifetime ? periodNote('lifetime') : periodNote(effectivePeriod, plan)),
    [isLifetime, effectivePeriod, plan],
  )

  /** ganti periode; "Seumur hidup" sekaligus memindahkan paket ke Founding Member */
  function handlePeriod(next: BillingPeriod) {
    if (next === 'lifetime') {
      setOfferId('founding-member')
      setPeriod('lifetime')
      return
    }
    if (isLifetime) setOfferId(HERO_PLAN.id)
    setPeriod(next)
  }

  function handleApplyCode() {
    const trimmed = codeInput.trim()
    if (!trimmed) return
    if (isValidReferralCode(trimmed)) {
      setAppliedCode(trimmed.toUpperCase())
      setCodeError(false)
      return
    }
    setAppliedCode(null)
    setCodeError(true)
  }

  function handleClearCode() {
    setAppliedCode(null)
    setCodeInput('')
    setCodeError(false)
  }

  /**
   * Registrasi SUNGGUHAN (paket 64). Urutannya penting dan itulah inti
   * "integritas referral":
   *   1. `registerAccount` memvalidasi kode teman ke DATABASE lebih dulu; kalau
   *      kodenya tidak ada, akun TIDAK pernah dibuat dan error dikembalikan ke
   *      sheet (user masih bisa membetulkan kodenya);
   *   2. akun Supabase dibuat tanpa password (`signInWithOtp`);
   *   3. handoff: verifikasi email wajib → `/login/verify`; auto-login → Dashboard.
   * Sheet tetap terbuka saat gagal, jadi isian email/nama tidak hilang.
   */
  async function handleRegistered(result: RegistrationResult): Promise<RegistrationOutcome> {
    const outcome = await registerAccount({
      email: result.email,
      nickname: result.nickname,
      referralCode: appliedCode,
    })
    if (!outcome.ok) return { ok: false, error: outcome.error }

    /* navigasi di sini, bukan di sheet: satu tempat tahu ke mana user pergi */
    router.push(outcome.next === 'verify' ? buildVerifyHref(result.email) : '/')
    return { ok: true }
  }

  return (
    <>
      <div className="mx-auto w-full max-w-[480px] px-6 pt-8 pb-60 lg:max-w-[560px] lg:pt-12 lg:pb-48">
        {/* ── 1. header ──────────────────────────────────────────────────── */}
        <header>
          <LogoWordmark className="h-6" />
          <p className="mt-6 text-[11px] font-semibold tracking-[0.16em] text-ink/40 uppercase">
            {CHECKOUT_COPY.eyebrow}
          </p>
          <h1 className="mt-1.5 font-display text-3xl font-semibold tracking-tight text-ink lg:text-4xl">
            {CHECKOUT_COPY.title}
          </h1>
          <p className="mt-2.5 text-[13px] leading-relaxed text-ink/55">{CHECKOUT_COPY.subtitle}</p>
        </header>

        {/* ── 2. sisa prosesnya: 3 langkah (PRD 5887) ─────────────────────── */}
        <section className="mt-6 rounded-[1.75rem] bg-cream p-5 ring-1 ring-soil/12">
          <div className="flex items-baseline justify-between gap-2">
            <h2 className="font-display text-[15px] font-semibold tracking-tight text-ink">
              {CHECKOUT_COPY.stepsTitle}
            </h2>
            <span className="rounded-full bg-sage px-2.5 py-0.5 text-[10.5px] font-semibold text-ink/55">
              {CHECKOUT_COPY.stepsBadge}
            </span>
          </div>

          <ol className="mt-3.5 space-y-3">
            {CHECKOUT_STEPS.map((step, index) => {
              /* langkah 1 = yang sedang berjalan (user belum mengisi datanya) */
              const active = index === 0
              return (
                <li key={step.id} className="flex items-start gap-3">
                  <span
                    aria-hidden
                    className={cn(
                      'mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full text-[11px] font-bold tabular-nums',
                      active ? 'bg-forest text-mint' : 'bg-sage text-forest/70',
                    )}
                  >
                    {index + 1}
                  </span>
                  <span className="min-w-0">
                    <span
                      className={cn(
                        'block text-[13px] font-semibold',
                        active ? 'text-ink' : 'text-ink/60',
                      )}
                    >
                      {step.label}
                    </span>
                    <span className="mt-0.5 block text-[11.5px] leading-relaxed text-ink/45">
                      {step.hint}
                    </span>
                  </span>
                </li>
              )
            })}
          </ol>

        {/* paket 64: paragraf "tiga langkah tanpa verifikasi" DIHAPUS — langkah
            konfirmasi email sudah tertulis di daftar di atas, jadi tidak diulang */}
        </section>

        {/* ── 3. paket + periode + harga ─────────────────────────────────── */}
        <section className="mt-4 rounded-[1.75rem] bg-cream p-5 ring-1 ring-soil/12">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h2 className="font-display text-[15px] font-semibold tracking-tight text-ink">
                {CHECKOUT_COPY.planSectionTitle}
              </h2>
              <p className="mt-1 text-[11.5px] leading-relaxed text-ink/45">
                {CHECKOUT_COPY.planSectionNote}
              </p>
            </div>
            <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-sage text-forest">
              <Tag className="size-4" strokeWidth={2.2} aria-hidden />
            </span>
          </div>

          {/* periode — pilih-satu; angka penghematan dihitung, bukan diklaim */}
          <div
            role="radiogroup"
            aria-label={CHECKOUT_COPY.periodLegend}
            className="mt-4 flex flex-wrap gap-2"
          >
            {PERIOD_CHOICES.map((choice) => {
              const active = choice === effectivePeriod
              return (
                <button
                  key={choice}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  onClick={() => handlePeriod(choice)}
                  className={cn(
                    'rounded-full px-3.5 py-2 text-[12.5px] font-semibold transition-all duration-200 active:scale-95 motion-reduce:transition-none',
                    active
                      ? 'bg-forest text-mint shadow-[0_10px_22px_-14px_rgba(69,89,78,0.75)]'
                      : 'bg-cream text-ink/60 ring-1 ring-soil/14 hover:text-ink',
                  )}
                >
                  {PERIOD_CHOICE_LABEL[choice]}
                </button>
              )
            })}
          </div>

          {/* tier langganan — diganti catatan singkat saat paket seumur hidup dipilih */}
          {isLifetime ? (
            <>
              <p className="mt-3.5 rounded-2xl bg-sage/70 px-3.5 py-3 text-[11.5px] leading-relaxed text-ink/60 ring-1 ring-soil/8">
                {CHECKOUT_COPY.founderNote}
              </p>
              <p className="mt-2 text-[11px] leading-relaxed text-ink/45">
                {CHECKOUT_COPY.livePriceNote}
              </p>
            </>
          ) : (
            <ul className="mt-3.5 space-y-2">
              {PLANS.map((item) => (
                <li key={item.id}>
                  <OfferOption
                    plan={item}
                    period={effectivePeriod}
                    active={item.id === offerId}
                    onSelect={() => setOfferId(item.id)}
                  />
                </li>
              ))}
            </ul>
          )}

          {/* harga — angka besar di font-display, harga coret kalau ada diskon */}
          <div className="mt-4 flex flex-wrap items-baseline gap-x-2 gap-y-1 rounded-2xl bg-sage/60 px-4 py-3.5 ring-1 ring-soil/8">
            <span className="font-display text-3xl font-semibold tracking-tight tabular-nums text-ink">
              {formatIDR(total)}
            </span>
            <span className="text-[12px] font-medium text-ink/50">{periodLabel}</span>
            {discount > 0 && (
              <span className="text-[12.5px] font-medium tabular-nums text-ink/40 line-through">
                {formatIDR(listPrice)}
              </span>
            )}
          </div>
          <p className="mt-1.5 text-[11.5px] leading-relaxed text-ink/45">{periodNoteText}</p>

          {/* rincian yang didapat */}
          <h3 className="mt-5 text-[11px] font-semibold tracking-[0.16em] text-ink/40 uppercase">
            {CHECKOUT_COPY.featuresTitle}
          </h3>
          <ul className="mt-1 flex flex-col">
            {features.map((feature) => (
              <li
                key={feature}
                className="flex items-start gap-2 border-t border-soil/12 py-2 text-[12.5px] leading-relaxed text-ink/70 first:border-t-0"
              >
                <Check className="mt-0.5 size-3.5 shrink-0 text-forest/70" strokeWidth={3} aria-hidden />
                <span className="min-w-0">{feature}</span>
              </li>
            ))}
          </ul>
        </section>

        {/* ── 4. trust badge — selling point, bukan disclaimer (PRD 4509) ── */}
        <section className="mt-4 rounded-[1.75rem] bg-cream p-5 ring-1 ring-soil/12">
          <div className="flex items-start gap-3">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-sage text-forest">
              <ShieldCheck className="size-4" strokeWidth={2.2} aria-hidden />
            </span>
            <p className="min-w-0 self-center rounded-2xl bg-mint/25 px-3.5 py-2.5 text-[12.5px] leading-relaxed font-semibold text-forest ring-1 ring-forest/10">
              {NO_AUTO_RENEW_BADGE}
            </p>
          </div>

          {/* dua badge lain dari PRD 4586–4587 (yang pertama sudah jadi banner di atas) */}
          <ul className="mt-3 space-y-2.5">
            {PRICING_TRUST_BADGES.filter((badge) => badge.id !== 'no-auto-renew').map((badge) => (
              <TrustBadgeItem key={badge.id} badge={badge} />
            ))}
          </ul>
        </section>

        {/* ── 5. kode dari teman (opsional) — diskon dua arah Domain 7D ───── */}
        <section className="mt-4 rounded-[1.75rem] bg-cream p-5 ring-1 ring-soil/12">
          <div className="flex items-start gap-3">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-sage text-forest">
              <Tag className="size-4" strokeWidth={2.2} aria-hidden />
            </span>
            <h2 className="min-w-0 self-center font-display text-[15px] font-semibold tracking-tight text-ink">
              {CHECKOUT_COPY.referralTitle}
            </h2>
          </div>

          <label className="mt-3.5 block" htmlFor="checkout-referral">
            <span className="text-[12.5px] font-semibold text-ink">
              {CHECKOUT_COPY.referralLabel}
            </span>
            <span className="mt-2 flex gap-2">
              <input
                id="checkout-referral"
                value={codeInput}
                onChange={(event) => setCodeInput(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key !== 'Enter') return
                  event.preventDefault()
                  handleApplyCode()
                }}
                placeholder={CHECKOUT_COPY.referralPlaceholder}
                aria-describedby="checkout-referral-status"
                aria-invalid={codeError}
                className={cn(
                  'min-w-0 flex-1 rounded-2xl bg-cream px-4 py-3 text-[14px] font-semibold tracking-wide text-ink outline-none ring-1 transition-shadow placeholder:font-medium placeholder:tracking-normal placeholder:text-ink/25 focus:ring-2 focus:ring-forest/35',
                  codeError ? 'ring-plum/50' : 'ring-soil/16',
                )}
              />
              <button
                type="button"
                onClick={handleApplyCode}
                className="shrink-0 rounded-2xl bg-forest px-4 text-[13px] font-semibold text-mint transition-colors duration-200 hover:bg-forest-soft active:scale-[0.98] motion-reduce:transition-none"
              >
                {CHECKOUT_COPY.referralApply}
              </button>
            </span>
          </label>

          {/* status kode diumumkan ke screen reader, bukan cuma dilihat */}
          <div id="checkout-referral-status" aria-live="polite">
            {appliedCode ? (
              <>
                <span className="mt-2.5 inline-flex items-center gap-1.5 rounded-full bg-mint/30 px-2.5 py-1 text-[11px] font-semibold text-forest">
                  <Check className="size-3" strokeWidth={3.4} aria-hidden />
                  {CHECKOUT_COPY.referralApplied} · {appliedCode}
                </span>
                <button
                  type="button"
                  onClick={handleClearCode}
                  className="ml-2 text-[11.5px] font-semibold text-ink/55 underline underline-offset-2 hover:text-ink"
                >
                  {CHECKOUT_COPY.referralClear}
                </button>
                <p className="mt-2 text-[11.5px] leading-relaxed text-ink/45">
                  {CHECKOUT_COPY.referralAppliedNote}
                </p>
              </>
            ) : codeError ? (
              <p className="mt-2.5 flex items-start gap-1.5 text-[11.5px] leading-relaxed text-plum">
                <Info className="mt-0.5 size-3.5 shrink-0" strokeWidth={2.4} aria-hidden />
                <span>{CHECKOUT_COPY.referralInvalid}</span>
              </p>
            ) : null}
          </div>
        </section>

        {/* ── 6. ringkasan akhir sebelum bayar ───────────────────────────── */}
        <section className="mt-4 rounded-[1.75rem] bg-cream p-5 ring-1 ring-soil/12">
          <h2 className="font-display text-[15px] font-semibold tracking-tight text-ink">
            {CHECKOUT_COPY.summaryTitle}
          </h2>
          <dl className="mt-3 space-y-2.5 text-[12.5px]">
            <div className="flex items-start justify-between gap-3">
              <dt className="text-ink/50">{CHECKOUT_COPY.summaryPlan}</dt>
              <dd className="min-w-0 text-right font-semibold text-ink">{offerName}</dd>
            </div>
            <div className="flex items-start justify-between gap-3">
              <dt className="text-ink/50">{CHECKOUT_COPY.summaryPeriod}</dt>
              <dd className="font-semibold text-ink">{periodLabel}</dd>
            </div>
            {discount > 0 && (
              <div className="flex items-start justify-between gap-3">
                <dt className="text-ink/50">
                  {CHECKOUT_COPY.summaryDiscount} ({REFERRAL_DISCOUNT_PCT}%)
                </dt>
                <dd className="font-semibold tabular-nums text-forest">− {formatIDR(discount)}</dd>
              </div>
            )}
            <div className="flex items-baseline justify-between gap-3 border-t border-soil/12 pt-2.5">
              <dt className="font-semibold text-ink">{CHECKOUT_COPY.summaryTotal}</dt>
              <dd className="font-display text-lg font-semibold tabular-nums text-ink">
                {formatIDR(total)}
              </dd>
            </div>
          </dl>
        </section>

      </div>

      {/* ── CTA primer: pil dengan bulatan panah, selalu di zona ibu jari ── */}
      <div className="fixed inset-x-0 bottom-0 z-40 bg-gradient-to-t from-canvas via-canvas/95 to-transparent pb-[max(1rem,env(safe-area-inset-bottom))] pt-10">
        <div className="mx-auto w-full max-w-[480px] px-6 lg:max-w-[560px]">
          <button
            type="button"
            onClick={() => setRegistrationOpen(true)}
            className="group flex h-14 w-full items-center justify-between gap-3 rounded-full bg-forest pl-6 pr-2 text-cream shadow-[0_16px_34px_-18px_rgba(69,89,78,0.85)] transition-colors duration-200 hover:bg-forest-soft active:scale-[0.98] motion-reduce:transition-none"
          >
            <span className="text-[15.5px] font-medium tracking-[-0.01em]">{CHECKOUT_COPY.cta}</span>
            <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-cream text-forest transition-colors duration-200 group-hover:bg-mint">
              <ArrowRight className="size-[18px]" strokeWidth={2.4} aria-hidden />
            </span>
          </button>

          <p className="mt-2.5 text-center text-[11px] leading-relaxed text-ink/50">
            {CHECKOUT_COPY.ctaHint}
          </p>
          <Link href="/" className="mt-1.5 block text-center text-[11.5px] leading-relaxed text-ink/45">
            <span className="font-semibold text-ink/60 underline underline-offset-2">
              {CHECKOUT_COPY.escapeLabel}
            </span>{' '}
            · {CHECKOUT_COPY.escapeHint}
          </Link>
        </div>
      </div>

      {/* ── Sheet registrasi (email + nama, tanpa password). Midtrans di-bypass
             sprint ini, jadi tidak ada sheet pembayaran setelah ini — lihat
             catatan alur di atas file. ────────────────────────────────────── */}
      <RegistrationSheet
        open={registrationOpen}
        onClose={() => setRegistrationOpen(false)}
        onContinue={handleRegistered}
      />
    </>
  )
}

/* ── baris pilihan paket (pilih-satu) ─────────────────────────────────────────
   Harga di baris ini mengikuti periode yang sedang aktif, supaya angka yang
   dibandingkan user memang angka yang akan dia bayar. */
function OfferOption({
  plan,
  period,
  active,
  onSelect,
}: {
  plan: PlanDefinition
  period: BillingPeriod
  active: boolean
  onSelect: () => void
}) {
  const price = period === 'annual' ? plan.annual : monthlyPrice(plan)
  const label = BILLING_PERIOD_LABEL[period === 'annual' ? 'annual' : 'monthly']

  return (
    <button
      type="button"
      role="radio"
      aria-checked={active}
      onClick={onSelect}
      className={cn(
        'flex w-full items-center gap-3 rounded-2xl px-3.5 py-3 text-left ring-1 transition-colors duration-200',
        active ? 'bg-sage/70 ring-forest/35' : 'bg-cream ring-soil/12 hover:bg-sage/40',
      )}
    >
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-1.5">
          <span className="truncate text-[13.5px] font-semibold text-ink">{plan.name}</span>
          {plan.badge && (
            <span className="shrink-0 rounded-full bg-forest px-2 py-0.5 text-[9.5px] font-semibold whitespace-nowrap text-mint">
              {plan.badge}
            </span>
          )}
        </span>
        <span className="mt-0.5 block truncate text-[11.5px] text-ink/50">{plan.subtitle}</span>
      </span>

      <span className="shrink-0 text-right">
        <span className="block font-display text-[15px] font-semibold tabular-nums text-ink">
          {formatIDR(price)}
        </span>
        <span className="block text-[10.5px] font-medium text-ink/45">{label}</span>
      </span>

      <span
        aria-hidden
        className={cn(
          'flex size-4 shrink-0 items-center justify-center rounded-full border transition-colors',
          active ? 'border-forest bg-forest text-mint' : 'border-ink/20 bg-cream text-transparent',
        )}
      >
        <Check className="size-2.5" strokeWidth={3.6} />
      </span>
    </button>
  )
}

/* ── satu baris trust badge (PRD 4586–4587) ─────────────────────────────────── */
function TrustBadgeItem({ badge }: { badge: TrustBadge }) {
  return (
    <li className="flex items-start gap-2.5">
      <Check className="mt-0.5 size-3.5 shrink-0 text-forest/70" strokeWidth={3} aria-hidden />
      <span className="min-w-0 text-[12px] leading-relaxed">
        <b className="font-semibold text-ink">{badge.label}</b>
        <span className="text-ink/55"> — {badge.note}</span>
      </span>
    </li>
  )
}
