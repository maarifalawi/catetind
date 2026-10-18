'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowRight, Check, Info, ShieldCheck, Tag } from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  CHECKOUT_COPY,
  CHECKOUT_STEPS,
  HERO_PLAN,
  PERIOD_LABEL,
  PLANS,
  PRICING_TRUST_BADGES,
  PREPAID_BADGE,
  REFERRAL_DISCOUNT_PCT,
  SEKALI_BAYAR_BADGE,
  applyReferralDiscount,
  buildCheckoutHref,
  buildPayHref,
  formatIDR,
  isValidReferralCode,
  offerPrice,
  type BillingPeriod,
  type PlanDefinition,
  type PlanId,
  type TrustBadge,
} from '@/lib/data/pricing'
import { RegistrationSheet, type RegistrationOutcome, type RegistrationResult } from './registration-sheet'
import { fetchSessionUser, registerAccount } from '@/lib/session-client'
import { buildVerifyHref } from '@/lib/data/auth'
import { WELCOME_PATH } from '@/lib/data/welcome'

/* ── Checkout (/checkout) — inventaris #3 · PRD 5887–5935 ─────────────────────
   Halaman pilih paket + daftar akun. Dua hal harus terasa sepanjang halaman:
   RINGAN (maksimal 3 langkah, 2 field, tanpa password) dan JUJUR (harga
   konsisten, tanpa auto-renew, tanpa countdown/social proof palsu).

   Tata letak (revisi desain): BINGKAI LANDING — navbar + footer landing
   dipasang route, kepala halaman memakai pill eyebrow + H1 display, lalu satu
   kolom kartu putih ber-hairline. Desain lama (panel batik dua kolom +
   PublicNavbar) sudah tidak dipakai. Semua isi lama tetap ada (langkah,
   pilihan paket, harga, trust badge, kode teman, ringkasan, tombol bayar).

   Halaman ini memilih paket + periode (monthly/lifetime), lalu registrasi
   (email + nama + kode teman) dan pembayaran di `/checkout/bayar`. Tidak ada
   harga yang ditulis di JSX: semua dari `lib/data/pricing.ts`.

   Yang TIDAK ada di sini, dan memang sengaja:
     • field password/telepon/alamat/gender/tanggal lahir
     • hitungan mundur harga palsu atau angka pembelian fiktif
     • daftar harga sendiri: semua angka dibaca dari `lib/data/pricing.ts`

   Kenapa satu sumber harga: PRD 4594–4606 menuntut satu harga per tier di mana
   pun. Monthly dan lifetime sama-sama berasal dari `PLANS`.
   ────────────────────────────────────────────────────────────────────────── */
type OfferId = PlanId

export function CheckoutScreen({
  initialPlanId,
  initialPeriod = 'monthly',
  initialReferralCode,
}: {
  /**
   * Pilihan awal dari query `/checkout?plan=…&period=…&kode=…`.
   *
   * Sebelum ini halaman selalu membuka paket hero, sehingga konteks user hilang
   * begitu ia keluar dari halaman ini (klik "Masuk", atau datang dari tautan
   * referral `/r/<kode>`): paket yang tadi dipilih harus dipilih ulang. Nilainya
   * dipercaya HANYA setelah dicocokkan dengan katalog kanon — query string tidak
   * boleh menentukan penawaran yang tidak dijual.
   */
  initialPlanId?: PlanId
  /** `monthly` (prabayar 30 hari) atau `lifetime` */
  initialPeriod?: BillingPeriod
  initialReferralCode?: string | null
} = {}) {
  /** paket terpilih — default paket hero (Waras), yaitu rekomendasi produk */
  const [offerId, setOfferId] = useState<OfferId>(() =>
    initialPlanId && PLANS.some((item) => item.id === initialPlanId) ? initialPlanId : HERO_PLAN.id,
  )
  /** periode terpilih — default prabayar 30 hari */
  const [period, setPeriod] = useState<BillingPeriod>(initialPeriod)
  /** kode teman: input mentah, kode yang sudah dipakai, dan status error */
  const [codeInput, setCodeInput] = useState(() => initialReferralCode?.toUpperCase() ?? '')
  const [appliedCode, setAppliedCode] = useState<string | null>(() => {
    const code = initialReferralCode?.trim().toUpperCase() ?? ''
    return code && isValidReferralCode(code) ? code : null
  })
  const [codeError, setCodeError] = useState(false)
  /** sheet registrasi (paket 64: pembayaran Midtrans di-bypass, jadi tidak ada
   *  sheet pembayaran yang dibuka dari sini) */
  const [registrationOpen, setRegistrationOpen] = useState(false)
  const router = useRouter()

  const plan: PlanDefinition = PLANS.find((item) => item.id === offerId) ?? HERO_PLAN

  const listPrice = offerPrice(plan, { period })
  const discount = appliedCode ? listPrice - applyReferralDiscount(listPrice) : 0
  const total = listPrice - discount
  const offerName = plan.name
  const features = plan.features
  const periodLabel = PERIOD_LABEL[period]
  const premiumBadge = period === 'monthly' ? PREPAID_BADGE : SEKALI_BAYAR_BADGE

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
    /* Halaman bayar tujuan dihitung DULU supaya ia ikut dibawa sebagai `next`:
       user yang baru memverifikasi email langsung mendarat di pembayaran (paket
       yang sedang dipilih) — bukan Dashboard — dan tautan di emailnya pun
       mengarah ke sana. */
    const payHref = buildPayHref(offerId, period, appliedCode)
    const outcome = await registerAccount({
      email: result.email,
      nickname: result.nickname,
      referralCode: appliedCode,
      next: payHref,
    })
    if (!outcome.ok) return { ok: false, error: outcome.error }

    /* navigasi di sini, bukan di sheet: satu tempat tahu ke mana user pergi.
       Auto-login langsung ke halaman BAYAR (paket yang sedang dipilih), supaya
       paketnya benar-benar dibeli — bukan dilewati. */
    router.push(outcome.next === 'verify' ? buildVerifyHref(result.email, payHref) : payHref)
    return { ok: true }
  }

  /**
   * CTA utama: kalau user SUDAH masuk, langsung ke halaman bayar (paket dan
   * kode teman yang sedang dipilih). Kalau belum, buka sheet registrasi —
   * `/api/payment/charge` memang butuh sesi (identitas dari cookie). */
  function handleStart() {
    void fetchSessionUser()
      .then((user) => {
        if (user) {
          router.push(buildPayHref(offerId, period, appliedCode))
          return
        }
        setRegistrationOpen(true)
      })
      .catch(() => setRegistrationOpen(true))
  }

  return (
    <>
      <section className="w-full bg-canvas px-5 pt-[120px] pb-20 landing-tab:px-10 landing-tab:pt-[160px] landing:pt-[180px] landing:pb-[120px]">
        <div className="mx-auto flex w-full max-w-[760px] flex-col items-center gap-8">
          {/* kepala halaman — resep yang sama dengan hero landing */}
          <header className="flex w-full flex-col items-center gap-4 text-center">
            <span className="inline-flex items-center gap-2 rounded-full bg-canvas py-0.5 pr-4 pl-0.5 ring-1 ring-soil/10">
              <span className="flex size-6 items-center justify-center rounded-full bg-sage">
                <ShieldCheck className="size-3.5 text-forest" aria-hidden />
              </span>
              <span className="text-[14px] leading-[1.5] text-forest">{CHECKOUT_COPY.eyebrow}</span>
            </span>
            <h1 className="max-w-[620px] text-balance font-display text-[40px] leading-[1.12] font-medium tracking-[-0.03em] text-forest landing-tab:text-[52px] landing:text-[60px]">
              {CHECKOUT_COPY.title}
            </h1>
            <p className="max-w-[520px] text-balance text-[16px] leading-[1.5] text-forest-muted">
              {CHECKOUT_COPY.subtitle}
            </p>
          </header>

          <div className="flex w-full min-w-0 flex-col">
            {/* ── 2. sisa prosesnya: 3 langkah (PRD 5887) ─────────────────────── */}
          <section className="mt-6 rounded-[1.75rem] bg-cream p-5 ring-1 ring-soil/12">
            <div className="flex items-baseline justify-between gap-2">
              <h2 className="font-display text-[15px] font-medium tracking-tight text-forest">
                {CHECKOUT_COPY.stepsTitle}
              </h2>
              <span className="rounded-full bg-sage px-2.5 py-0.5 text-[10.5px] font-medium text-forest/55">
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
                        'mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold tabular-nums',
                        active ? 'bg-forest text-mint' : 'bg-sage text-forest/70',
                      )}
                    >
                      {index + 1}
                    </span>
                    <span className="min-w-0">
                      <span
                        className={cn(
                          'block text-[13px] font-medium',
                          active ? 'text-forest' : 'text-forest/60',
                        )}
                      >
                        {step.label}
                      </span>
                      <span className="mt-0.5 block text-[11.5px] leading-relaxed text-forest/45">
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

          {/* ── 3. paket + harga ─────────────────────────────────── */}
          <section className="mt-4 rounded-[1.75rem] bg-cream p-5 ring-1 ring-soil/12">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h2 className="font-display text-[15px] font-medium tracking-tight text-forest">
                  {CHECKOUT_COPY.planSectionTitle}
                </h2>
                <p className="mt-1 text-[11.5px] leading-relaxed text-forest/45">
                  {CHECKOUT_COPY.planSectionNote}
                </p>
              </div>
              <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-sage text-forest">
                <Tag className="size-4" strokeWidth={2.2} aria-hidden />
              </span>
            </div>

            {/* Dua periode nyata: prabayar 30 hari (default) dan lifetime.
                Keduanya sekali bayar; tidak ada auto-debet. */}
            <div
              role="radiogroup"
              aria-label={CHECKOUT_COPY.periodTitle}
              className="mt-3.5 grid grid-cols-2 gap-2"
            >
              <button
                type="button"
                role="radio"
                aria-checked={period === 'monthly'}
                onClick={() => setPeriod('monthly')}
                className={cn(
                  'rounded-2xl px-3.5 py-2.5 text-left ring-1 transition-colors',
                  period === 'monthly'
                    ? 'bg-sage/70 ring-forest/35'
                    : 'bg-cream ring-soil/12 hover:bg-sage/40',
                )}
              >
                <span className="block text-[12.5px] font-medium text-forest">
                  {CHECKOUT_COPY.periodMonthlyLabel}
                </span>
                <span className="mt-0.5 block text-[10.5px] leading-relaxed text-forest/50">
                  {CHECKOUT_COPY.periodMonthlyNote}
                </span>
              </button>
              <button
                type="button"
                role="radio"
                aria-checked={period === 'lifetime'}
                onClick={() => setPeriod('lifetime')}
                className={cn(
                  'rounded-2xl px-3.5 py-2.5 text-left ring-1 transition-colors',
                  period === 'lifetime'
                    ? 'bg-sage/70 ring-forest/35'
                    : 'bg-cream ring-soil/12 hover:bg-sage/40',
                )}
              >
                <span className="block text-[12.5px] font-medium text-forest">
                  {CHECKOUT_COPY.periodLifetimeLabel}
                </span>
                <span className="mt-0.5 block text-[10.5px] leading-relaxed text-forest/50">
                  {CHECKOUT_COPY.periodLifetimeNote}
                </span>
              </button>
            </div>

            {/* tier paket — harga mengikuti periode terpilih */}
            <ul className="mt-3.5 space-y-2">
              {PLANS.map((item) => (
                <li key={item.id}>
                  <OfferOption
                    plan={item}
                    period={period}
                    active={item.id === offerId}
                    onSelect={() => setOfferId(item.id)}
                  />
                </li>
              ))}
            </ul>

            {/* harga — angka besar di font-display, harga coret kalau ada diskon */}
            <div className="mt-4 flex flex-wrap items-baseline gap-x-2 gap-y-1 rounded-2xl bg-sage/60 px-4 py-3.5 ring-1 ring-soil/8">
              <span className="font-display text-3xl font-medium tracking-tight tabular-nums text-forest">
                {formatIDR(total)}
              </span>
              <span className="text-[12px] font-medium text-forest/50">{periodLabel}</span>
              {discount > 0 && (
                <span className="text-[12.5px] font-medium tabular-nums text-forest/40 line-through">
                  {formatIDR(listPrice)}
                </span>
              )}
            </div>
            <p className="mt-1.5 text-[11.5px] leading-relaxed text-forest/45">
              {CHECKOUT_COPY.lockedNote}
            </p>

            {/* rincian yang didapat */}
            <h3 className="mt-5 text-[11px] font-medium tracking-[0.16em] text-forest/40 uppercase">
              {CHECKOUT_COPY.featuresTitle}
            </h3>
            <ul className="mt-1 flex flex-col">
              {features.map((feature) => (
                <li
                  key={feature}
                  className="flex items-start gap-2 border-t border-soil/12 py-2 text-[12.5px] leading-relaxed text-forest/70 first:border-t-0"
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
              <p className="min-w-0 self-center rounded-2xl bg-mint/25 px-3.5 py-2.5 text-[12.5px] leading-relaxed font-medium text-forest ring-1 ring-forest/10">
                {premiumBadge}
              </p>
            </div>

            {/* ketiga badge kepercayaan (PRD 4585–4587) — semuanya ditampilkan,
                tidak ada lagi yang disaring keluar seperti "tanpa auto-renew" */}
            <ul className="mt-3 space-y-2.5">
              {PRICING_TRUST_BADGES.map((badge) => (
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
              <h2 className="min-w-0 self-center font-display text-[15px] font-medium tracking-tight text-forest">
                {CHECKOUT_COPY.referralTitle}
              </h2>
            </div>

            <label className="mt-3.5 block" htmlFor="checkout-referral">
              <span className="text-[12.5px] font-medium text-forest">
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
                    'min-w-0 flex-1 rounded-2xl bg-cream px-4 py-3 text-[14px] font-medium tracking-wide text-forest outline-none ring-1 transition-shadow placeholder:font-medium placeholder:tracking-normal placeholder:text-forest/25 focus:ring-2 focus:ring-forest/35',
                    codeError ? 'ring-plum/50' : 'ring-soil/16',
                  )}
                />
                <button
                  type="button"
                  onClick={handleApplyCode}
                  className="shrink-0 rounded-2xl bg-forest px-4 text-[13px] font-medium text-mint transition-colors duration-200 hover:bg-forest-soft active:scale-[0.98] motion-reduce:transition-none"
                >
                  {CHECKOUT_COPY.referralApply}
                </button>
              </span>
            </label>

            {/* status kode diumumkan ke screen reader, bukan cuma dilihat */}
            <div id="checkout-referral-status" aria-live="polite">
              {appliedCode ? (
                <>
                  <span className="mt-2.5 inline-flex items-center gap-1.5 rounded-full bg-mint/30 px-2.5 py-1 text-[11px] font-medium text-forest">
                    <Check className="size-3" strokeWidth={3.4} aria-hidden />
                    {CHECKOUT_COPY.referralApplied} · {appliedCode}
                  </span>
                  <button
                    type="button"
                    onClick={handleClearCode}
                    className="ml-2 text-[11.5px] font-medium text-forest/55 underline underline-offset-2 hover:text-forest"
                  >
                    {CHECKOUT_COPY.referralClear}
                  </button>
                  <p className="mt-2 text-[11.5px] leading-relaxed text-forest/45">
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
            <h2 className="font-display text-[15px] font-medium tracking-tight text-forest">
              {CHECKOUT_COPY.summaryTitle}
            </h2>
            <dl className="mt-3 space-y-2.5 text-[12.5px]">
              <div className="flex items-start justify-between gap-3">
                <dt className="text-forest/50">{CHECKOUT_COPY.summaryPlan}</dt>
                <dd className="min-w-0 text-right font-medium text-forest">{offerName}</dd>
              </div>
              <div className="flex items-start justify-between gap-3">
                <dt className="text-forest/50">{CHECKOUT_COPY.summaryDuration}</dt>
                <dd className="font-medium text-forest">{periodLabel}</dd>
              </div>
              {discount > 0 && (
                <div className="flex items-start justify-between gap-3">
                  <dt className="text-forest/50">
                    {CHECKOUT_COPY.summaryDiscount} ({REFERRAL_DISCOUNT_PCT}%)
                  </dt>
                  <dd className="font-medium tabular-nums text-forest">− {formatIDR(discount)}</dd>
                </div>
              )}
              <div className="flex items-baseline justify-between gap-3 border-t border-soil/12 pt-2.5">
                <dt className="font-medium text-forest">{CHECKOUT_COPY.summaryTotal}</dt>
                <dd className="font-display text-lg font-medium tabular-nums text-forest">
                  {formatIDR(total)}
                </dd>
              </div>
            </dl>
          </section>

          {/* CTA — mengalir seperti CTA landing, satu bentuk untuk semua ukuran */}
          <CheckoutCta onStart={handleStart} className="mt-5" />
        </div>
      </div>
      </section>

      {/* ── Sheet registrasi (email + nama, tanpa password). Midtrans di-bypass
             sprint ini, jadi tidak ada sheet pembayaran setelah ini — lihat
             catatan alur di atas file. ────────────────────────────────────── */}
      <RegistrationSheet
        open={registrationOpen}
        onClose={() => setRegistrationOpen(false)}
        onContinue={handleRegistered}
        /* "Sudah punya akun? Masuk" harus mengembalikan user ke pilihan yang
           SAMA setelah ia masuk — lihat `buildCheckoutHref()`. */
        loginHref={buildCheckoutHref(offerId, period, appliedCode)}
      />
    </>
  )
}

/* ── baris pilihan paket (pilih-satu) ─────────────────────────────────────────
   Harga di baris ini adalah harga akses selamanya (`PLANS[].lifetime`) — angka
   yang sama dengan yang ditagih server, jadi yang dibandingkan user memang angka
   yang akan dia bayar. Sebelum paket 84 baris ini ikut berubah mengikuti periode
   bulanan/tahunan; pemilih periode itu sudah dihapus. */
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
  const price = period === 'monthly' ? plan.monthly : plan.lifetime
  const label = PERIOD_LABEL[period]

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
          <span className="truncate text-[13.5px] font-medium text-forest">{plan.name}</span>
          {plan.badge && (
            <span className="shrink-0 rounded-full bg-forest px-2 py-0.5 text-[9.5px] font-medium whitespace-nowrap text-mint">
              {plan.badge}
            </span>
          )}
        </span>
        <span className="mt-0.5 block truncate text-[11.5px] text-forest/50">{plan.subtitle}</span>
      </span>

      <span className="shrink-0 text-right">
        <span className="block font-display text-[15px] font-medium tabular-nums text-forest">
          {formatIDR(price)}
        </span>
        <span className="block text-[10.5px] font-medium text-forest/45">{label}</span>
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
        <b className="font-medium text-forest">{badge.label}</b>
        <span className="text-forest/55"> — {badge.note}</span>
      </span>
    </li>
  )
}

/* ── CTA primer checkout — SATU definisi, DUA tempat render ───────────────────
   Di MOBILE tombolnya bagian dari bar tetap di bawah viewport (zona ibu jari);
   di DESKTOP ia mengalir di ujung kolom kanan. Karena label & gaya tombolnya
   harus identik di kedua tempat, markup-nya hidup di sini sekali saja — kalau
   ditulis dua kali, cepat atau lambat salinannya berbeda. Ringkasan biaya sudah
   ada di kolom kanan, jadi tombol ini cukup satu pil + catatan kecil. */
function CheckoutCta({ onStart, className }: { onStart: () => void; className?: string }) {
  return (
    <div className={className}>
      <button
        type="button"
        onClick={onStart}
        className="group flex h-14 w-full items-center justify-between gap-3 rounded-full bg-forest pl-6 pr-2 text-cream shadow-[0_16px_34px_-18px_rgba(0,0,0,0.85)] transition-colors duration-200 hover:bg-forest-soft active:scale-[0.98] motion-reduce:transition-none"
      >
        <span className="text-[15.5px] font-medium tracking-[-0.01em]">{CHECKOUT_COPY.cta}</span>
        <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-cream text-forest transition-colors duration-200 group-hover:bg-mint">
          <ArrowRight className="size-[18px]" strokeWidth={2.4} aria-hidden />
        </span>
      </button>

      <p className="mt-2.5 text-center text-[11px] leading-relaxed text-forest/50">{CHECKOUT_COPY.ctaHint}</p>
      <Link
        href={WELCOME_PATH}
        className="mt-1.5 block text-center text-[11.5px] leading-relaxed text-forest/45"
      >
        <span className="font-medium text-forest/60 underline underline-offset-2">
          {CHECKOUT_COPY.escapeLabel}
        </span>{' '}
        · {CHECKOUT_COPY.escapeHint}
      </Link>
    </div>
  )
}
