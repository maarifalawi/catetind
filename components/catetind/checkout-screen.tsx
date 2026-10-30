'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowRight, Check, Info, ShieldCheck, Sparkles, Tag } from 'lucide-react'
import { cn } from '@/lib/utils'
import { BatikBackdrop } from '@/components/landing/lp/batik-backdrop'
import {
  CHECKOUT_COPY,
  HERO_PLAN,
  PLANS,
  PRICING_TRUST_BADGES,
  REFERRAL_DISCOUNT_PCT,
  applyReferralDiscount,
  buildCheckoutHref,
  buildPayHref,
  formatIDR,
  isValidReferralCode,
  offerPrice,
  type PlanDefinition,
  type PlanId,
} from '@/lib/data/pricing'
import { RegistrationSheet, type RegistrationOutcome, type RegistrationResult } from './registration-sheet'
import { fetchSessionUser, registerAccount } from '@/lib/session-client'
import { buildVerifyHref } from '@/lib/data/auth'

/* â”€â”€ Checkout (/checkout) â€” inventaris #3 Â· PRD 5887â€“5935 â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
   Halaman pilih paket + daftar akun. Dua hal harus terasa sepanjang halaman:
   RINGAN (maksimal 3 langkah, 2 field, tanpa password) dan JUJUR (harga
   konsisten, tanpa auto-renew, tanpa countdown/social proof palsu).

   Tata letak (revisi desain): BINGKAI LANDING dengan LEBAR HEADER â€” satu
   kolom `max-w-[1200px]` seperti navbar (tanpa footer landing), bukan kolom
   ponsel yang sempit. Di desktop isinya dua kolom: kartu paket di kiri dan
   ringkasan sticky di kanan; di layar kecil keduanya menumpuk.

   Teks dijaga sependek mungkin: judul + stepper label, kartu paket (nama,
   harga, 3 fitur teratas), lalu ringkasan. Kalimat penjelas hidup di
   `lib/data/pricing.ts`, bukan di JSX (CONTEXT-WAJIB Â§4) â€” dan yang tidak
   perlu dikatakan tidak ditampilkan sama sekali.

   Yang TIDAK ada di sini, dan memang sengaja:
     â€¢ field password/telepon/alamat/gender/tanggal lahir
     â€¢ hitungan mundur harga palsu atau angka pembelian fiktif
     â€¢ daftar harga sendiri: semua angka dibaca dari `lib/data/pricing.ts`

   Kenapa satu sumber harga: PRD 4594â€“4606 menuntut satu harga per tier di mana
   pun. Hanya ada SATU periode yang dijual â€” lifetime â€” dan angkanya berasal
   dari `PLANS` (harga `monthly` tinggal sebagai warisan baca, bukan tombol).
   â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
type OfferId = PlanId

export function CheckoutScreen({
  initialPlanId,
  initialReferralCode,
}: {
  /**
   * Pilihan awal dari query `/checkout?plan=â€¦&kode=â€¦`.
   *
   * Sebelum ini halaman selalu membuka paket hero, sehingga konteks user hilang
   * begitu ia keluar dari halaman ini (klik "Masuk", atau datang dari tautan
   * referral `/r/<kode>`): paket yang tadi dipilih harus dipilih ulang. Nilainya
   * dipercaya HANYA setelah dicocokkan dengan katalog kanon â€” query string tidak
   * boleh menentukan penawaran yang tidak dijual.
   */
  initialPlanId?: PlanId
  initialReferralCode?: string | null
} = {}) {
  /** paket terpilih â€” default paket hero (Waras), yaitu rekomendasi produk */
  const [offerId, setOfferId] = useState<OfferId>(() =>
    initialPlanId && PLANS.some((item) => item.id === initialPlanId) ? initialPlanId : HERO_PLAN.id,
  )
  /** kode teman: input mentah, kode yang sudah diverifikasi, dan status error */
  const [codeInput, setCodeInput] = useState(() => initialReferralCode?.trim().toUpperCase() ?? '')
  const [appliedCode, setAppliedCode] = useState<string | null>(null)
  const [codeError, setCodeError] = useState<string | null>(() => {
    const code = initialReferralCode?.trim() ?? ''
    return code && !isValidReferralCode(code) ? CHECKOUT_COPY.referralInvalid : null
  })
  const [checkingCode, setCheckingCode] = useState(false)
  /** penanda request terakhir: jawaban lama tidak boleh menimpa input terbaru */
  const verifyRequest = useRef(0)
  /** sheet registrasi (paket 64: pembayaran Midtrans di-bypass, jadi tidak ada
   *  sheet pembayaran yang dibuka dari sini) */
  const [registrationOpen, setRegistrationOpen] = useState(false)
  const router = useRouter()

  /* Kode dari URL (`/r/<kode>` â†’ `?kode=`) DIPERIKSA DULU ke database. Diskon
     tidak pernah tampil hanya karena bentuk kodenya wajar. */
  useEffect(() => {
    const candidate = initialReferralCode?.trim().toUpperCase() ?? ''
    if (!candidate || !isValidReferralCode(candidate)) return

    let active = true
    const requestId = ++verifyRequest.current
    setCheckingCode(true)
    setCodeError(null)

    fetch('/api/referral/validate', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ code: candidate }),
    })
      .then(async (res) => {
        const data = (await res.json().catch(() => null)) as {
          ok?: boolean
          verified?: boolean
          error?: string
        } | null
        if (!active || requestId !== verifyRequest.current) return
        if (res.ok && data?.ok && data.verified) {
          setAppliedCode(candidate)
          setCodeInput(candidate)
          setCodeError(null)
          return
        }
        setAppliedCode(null)
        setCodeError(
          res.status === 422
            ? (data?.error ?? CHECKOUT_COPY.referralInvalid)
            : CHECKOUT_COPY.referralUnavailable,
        )
      })
      .catch(() => {
        if (active && requestId === verifyRequest.current) {
          setAppliedCode(null)
          setCodeError(CHECKOUT_COPY.referralUnavailable)
        }
      })
      .finally(() => {
        if (active && requestId === verifyRequest.current) setCheckingCode(false)
      })

    return () => {
      active = false
    }
  }, [initialReferralCode])

  const plan: PlanDefinition = PLANS.find((item) => item.id === offerId) ?? HERO_PLAN

  /* Satu-satunya periode yang dijual: akses selamanya. Tidak ada state periode
     dan tidak ada toggle â€” jadi tidak mungkin checkout mengirim `monthly`. */
  const listPrice = offerPrice(plan, { period: 'lifetime' })
  const discount = appliedCode ? listPrice - applyReferralDiscount(listPrice) : 0
  const total = listPrice - discount
  const offerName = plan.name
  const periodShort = CHECKOUT_COPY.periodShortLifetime

  /**
   * Tombol "Pakai" TIDAK boleh percaya bentuk kode saja. Kode diperiksa ke
   * `/api/referral/validate`; diskon baru aktif kalau server menjawab
   * `verified: true`. Kode karangan berhenti di sini, bukan di halaman bayar.
   */
  async function handleApplyCode() {
    const trimmed = codeInput.trim().toUpperCase()
    if (!trimmed || checkingCode) return

    if (!isValidReferralCode(trimmed)) {
      setAppliedCode(null)
      setCodeError(CHECKOUT_COPY.referralInvalid)
      return
    }

    const requestId = ++verifyRequest.current
    setCheckingCode(true)
    setCodeError(null)
    try {
      const res = await fetch('/api/referral/validate', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ code: trimmed }),
      })
      const data = (await res.json().catch(() => null)) as {
        ok?: boolean
        verified?: boolean
        error?: string
      } | null
      if (requestId !== verifyRequest.current) return

      if (res.ok && data?.ok && data.verified) {
        setAppliedCode(trimmed)
        setCodeInput(trimmed)
        setCodeError(null)
        return
      }

      setAppliedCode(null)
      setCodeError(
        res.status === 422
          ? (data?.error ?? CHECKOUT_COPY.referralInvalid)
          : CHECKOUT_COPY.referralUnavailable,
      )
    } catch {
      if (requestId === verifyRequest.current) {
        setAppliedCode(null)
        setCodeError(CHECKOUT_COPY.referralUnavailable)
      }
    } finally {
      if (requestId === verifyRequest.current) setCheckingCode(false)
    }
  }

  function handleClearCode() {
    verifyRequest.current += 1
    setCheckingCode(false)
    setAppliedCode(null)
    setCodeInput('')
    setCodeError(null)
  }

  /**
   * Registrasi SUNGGUHAN (paket 64). Urutannya penting dan itulah inti
   * "integritas referral":
   *   1. `registerAccount` memvalidasi kode teman ke DATABASE lebih dulu; kalau
   *      kodenya tidak ada, akun TIDAK pernah dibuat dan error dikembalikan ke
   *      sheet (user masih bisa membetulkan kodenya);
   *   2. akun Supabase dibuat tanpa password (`signInWithOtp`);
   *   3. handoff: verifikasi email wajib â†’ `/login/verify`; auto-login â†’ Dashboard.
   * Sheet tetap terbuka saat gagal, jadi isian email/nama tidak hilang.
   */
  async function handleRegistered(result: RegistrationResult): Promise<RegistrationOutcome> {
    /* Halaman bayar tujuan dihitung DULU supaya ia ikut dibawa sebagai `next`:
       user yang baru memverifikasi email langsung mendarat di pembayaran (paket
       yang sedang dipilih) â€” bukan Dashboard â€” dan tautan di emailnya pun
       mengarah ke sana. */
    const payHref = buildPayHref(offerId, 'lifetime', appliedCode)
    const outcome = await registerAccount({
      email: result.email,
      nickname: result.nickname,
      referralCode: appliedCode,
      next: payHref,
    })
    if (!outcome.ok) return { ok: false, error: outcome.error }

    /* navigasi di sini, bukan di sheet: satu tempat tahu ke mana user pergi.
       Auto-login langsung ke halaman BAYAR (paket yang sedang dipilih), supaya
       paketnya benar-benar dibeli â€” bukan dilewati. */
    router.push(outcome.next === 'verify' ? buildVerifyHref(result.email, payHref) : payHref)
    return { ok: true }
  }

  /**
   * CTA utama: kalau user SUDAH masuk, langsung ke halaman bayar (paket dan
   * kode teman yang sedang dipilih). Kalau belum, buka sheet registrasi â€”
   * `/api/payment/charge` memang butuh sesi (identitas dari cookie).
   */
  function handleStart() {
    void fetchSessionUser()
      .then((user) => {
        if (user) {
          router.push(buildPayHref(offerId, 'lifetime', appliedCode))
          return
        }
        setRegistrationOpen(true)
      })
      .catch(() => setRegistrationOpen(true))
  }

  return (
    <>
      <section className="w-full bg-canvas px-5 pt-[116px] pb-20 landing-tab:px-10 landing-tab:pt-[148px] landing:pt-[160px] landing:pb-[120px]">
        <div className="mx-auto flex w-full max-w-[1200px] flex-col gap-8 landing:gap-10">
          {/* kepala halaman â€” judul saja; detail proses hidup di kartu paket */}
          <header className="flex w-full flex-col items-start gap-3.5">
            <span className="inline-flex items-center gap-2 rounded-full bg-canvas py-0.5 pr-4 pl-0.5 ring-1 ring-soil/10">
              <span className="flex size-6 items-center justify-center rounded-full bg-sage">
                <ShieldCheck className="size-3.5 text-forest" aria-hidden />
              </span>
              <span className="text-[15px] leading-[1.5] text-forest">{CHECKOUT_COPY.eyebrow}</span>
            </span>
            <h1 className="font-display text-[36px] leading-[1.08] font-semibold tracking-[-0.03em] text-forest landing-tab:text-[44px] landing:text-[52px]">
              {CHECKOUT_COPY.title}
            </h1>
          </header>

          <div className="grid w-full grid-cols-1 gap-6 landing:grid-cols-[minmax(0,1fr)_360px] landing:items-start landing:gap-8">
            {/* â”€â”€ KIRI: pilih paket â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
            <div className="min-w-0">
              {/* SATU periode: akses selamanya. Toggle bulanan/lifetime sudah
                  dihapus â€” paket 30 hari tidak dijual lagi. */}
              <div className="min-w-0">
                <h2 className="font-display text-[22px] font-semibold tracking-[-0.02em] text-forest">
                  {CHECKOUT_COPY.planSectionTitle}
                </h2>
                <p className="mt-1 text-[13.5px] leading-[1.5] text-forest/50">
                  {CHECKOUT_COPY.planSectionNote}
                </p>
              </div>

              {/* tiga kartu paket â€” memilih = klik kartu, bukan membaca tabel */}
              <ul
                role="radiogroup"
                aria-label={CHECKOUT_COPY.planSectionTitle}
                className="mt-7 grid grid-cols-1 items-stretch gap-4 pt-5 landing-tab:grid-cols-3 landing:gap-4"
              >
                {PLANS.map((item) => (
                  <li key={item.id} className="min-w-0">
                    <OfferOption
                      plan={item}
                      active={item.id === offerId}
                      onSelect={() => setOfferId(item.id)}
                    />
                  </li>
                ))}
              </ul>

              {/* trust badge sebagai chip: label saja, bukan dinding teks */}
              <ul className="mt-6 flex flex-wrap gap-2">
                {PRICING_TRUST_BADGES.map((badge) => (
                  <li
                    key={badge.id}
                    className="inline-flex items-center gap-1.5 rounded-full bg-cream px-3 py-1.5 text-[12.5px] font-medium text-forest/70 ring-1 ring-soil/10"
                  >
                    <Check className="size-3 shrink-0 text-forest/60" strokeWidth={3} aria-hidden />
                    {badge.label}
                  </li>
                ))}
              </ul>
            </div>

            {/* â”€â”€ KANAN: ringkasan sebelum bayar (sticky di desktop) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
            <aside className="min-w-0 landing:sticky landing:top-24 landing:self-start">
              <div className="rounded-[24px] bg-cream p-5 shadow-landing-hairline ring-1 ring-soil/12">
                <h2 className="font-display text-[16px] font-medium tracking-tight text-forest">
                  {CHECKOUT_COPY.summaryTitle}
                </h2>

                <dl className="mt-3 space-y-2 text-[13.5px]">
                  <div className="flex items-start justify-between gap-3">
                    <dt className="text-forest/50">{CHECKOUT_COPY.summaryPlan}</dt>
                    <dd className="min-w-0 text-right font-medium text-forest">{offerName}</dd>
                  </div>
                  <div className="flex items-start justify-between gap-3">
                    <dt className="text-forest/50">{CHECKOUT_COPY.summaryDuration}</dt>
                    <dd className="text-right font-medium text-forest">{periodShort}</dd>
                  </div>
                  {discount > 0 && (
                    <div className="flex items-start justify-between gap-3">
                      <dt className="text-forest/50">
                        {CHECKOUT_COPY.summaryDiscount} ({REFERRAL_DISCOUNT_PCT}%)
                      </dt>
                      <dd className="font-medium tabular-nums text-forest">âˆ’ {formatIDR(discount)}</dd>
                    </div>
                  )}
                </dl>

                {/* kode teman â€” opsional, satu baris input */}
                <div className="mt-4 border-t border-soil/12 pt-4">
                  <label
                    htmlFor="checkout-referral"
                    className="flex items-center gap-1.5 text-[12.5px] font-medium text-forest/60"
                  >
                    <Tag className="size-3.5" strokeWidth={2.2} aria-hidden />
                    {CHECKOUT_COPY.referralLabel}
                  </label>
                  <span className="mt-2 flex gap-2">
                    <input
                      id="checkout-referral"
                      value={codeInput}
                      onChange={(event) => {
                        setCodeInput(event.target.value)
                        /* input berubah = kode lama tidak lagi mewakili isi kotak */
                        verifyRequest.current += 1
                        setCheckingCode(false)
                        setAppliedCode(null)
                        setCodeError(null)
                      }}
                      onKeyDown={(event) => {
                        if (event.key !== 'Enter') return
                        event.preventDefault()
                        void handleApplyCode()
                      }}
                      placeholder={CHECKOUT_COPY.referralPlaceholder}
                      aria-describedby="checkout-referral-status"
                      aria-invalid={Boolean(codeError)}
                      className={cn(
                        'min-w-0 flex-1 rounded-xl bg-canvas px-3.5 py-2.5 text-[14px] font-medium tracking-wide text-forest outline-none ring-1 transition-shadow placeholder:font-medium placeholder:tracking-normal placeholder:text-forest/25 focus:ring-2 focus:ring-forest/35',
                        codeError ? 'ring-plum/50' : 'ring-soil/16',
                      )}
                    />
                    <button
                      type="button"
                      onClick={() => void handleApplyCode()}
                      disabled={checkingCode}
                      aria-busy={checkingCode}
                      className="shrink-0 rounded-xl bg-forest px-4 text-[13.5px] font-medium text-mint transition-colors duration-200 hover:bg-forest-soft active:scale-[0.98] disabled:cursor-wait disabled:opacity-60 motion-reduce:transition-none"
                    >
                      {checkingCode ? CHECKOUT_COPY.referralChecking : CHECKOUT_COPY.referralApply}
                    </button>
                  </span>

                  {/* status kode diumumkan ke screen reader, bukan cuma dilihat */}
                  <div id="checkout-referral-status" aria-live="polite">
                    {checkingCode ? (
                      <p className="mt-2.5 text-[12.5px] leading-relaxed text-forest/55">
                        {CHECKOUT_COPY.referralChecking}
                      </p>
                    ) : appliedCode ? (
                      <span className="mt-2.5 flex flex-wrap items-center gap-2">
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-mint/35 px-2.5 py-1 text-[12px] font-medium text-forest">
                          <Check className="size-3" strokeWidth={3.4} aria-hidden />
                          {CHECKOUT_COPY.referralApplied} Â· {appliedCode}
                        </span>
                        <button
                          type="button"
                          onClick={handleClearCode}
                          className="text-[12.5px] font-medium text-forest/55 underline underline-offset-2 hover:text-forest"
                        >
                          {CHECKOUT_COPY.referralClear}
                        </button>
                      </span>
                    ) : codeError ? (
                      <p className="mt-2.5 flex items-start gap-1.5 text-[12.5px] leading-relaxed text-plum">
                        <Info className="mt-0.5 size-3.5 shrink-0" strokeWidth={2.4} aria-hidden />
                        <span>{codeError}</span>
                      </p>
                    ) : null}
                  </div>
                </div>

                {/* total â€” satu angka besar, harga coret hanya kalau ada diskon */}
                <div className="mt-4 flex items-baseline justify-between gap-3 border-t border-soil/12 pt-4">
                  <span className="text-[13.5px] font-medium text-forest/60">
                    {CHECKOUT_COPY.summaryTotal}
                  </span>
                  <span className="flex flex-wrap items-baseline justify-end gap-x-2 gap-y-1">
                    {discount > 0 && (
                      <span className="text-[13px] font-medium tabular-nums text-forest/35 line-through">
                        {formatIDR(listPrice)}
                      </span>
                    )}
                    <span className="font-display text-[28px] leading-none font-semibold tracking-[-0.03em] tabular-nums text-forest">
                      {formatIDR(total)}
                    </span>
                  </span>
                </div>

                <CheckoutCta onStart={handleStart} className="mt-4" disabled={checkingCode} />
              </div>
            </aside>
          </div>
        </div>
      </section>

      {/* â”€â”€ Sheet registrasi (email + nama, tanpa password). Midtrans di-bypass
             sprint ini, jadi tidak ada sheet pembayaran setelah ini. â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      <RegistrationSheet
        open={registrationOpen}
        onClose={() => setRegistrationOpen(false)}
        onContinue={handleRegistered}
        /* "Sudah punya akun? Masuk" harus mengembalikan user ke pilihan yang
           SAMA setelah ia masuk â€” lihat `buildCheckoutHref()`. */
        loginHref={buildCheckoutHref(offerId, 'lifetime', appliedCode)}
      />
    </>
  )
}

/* â”€â”€ kartu pilihan paket (pilih-satu) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
   Kartu = tombol radio. Harga di kartu SELALU harga akses selamanya dan dibaca
   dari `PLANS` (angka yang sama dengan yang ditagih server), jadi yang
   dibandingkan user memang angka yang akan dia bayar.

   DESAIN (revisi): kartu terpilih memakai permukaan gradien Evergreen + CORAK
   BATIK (kawung & mega mendung) yang dipudarkan mask radial, badge "Sekali
   Bayar" kaca, radio putih, dan glow mint tipis. Kartu lain tetap putih
   ber-hairline supaya kontras pilihan jelas.

   SELURUH fitur tampil (revisi permintaan desain): tidak ada lagi ringkasan
   "+N fitur lain". User membandingkan isi paket secara utuh sebelum membayar,
   jadi tidak ada informasi yang disembunyikan di balik satu baris kecil. */
function OfferOption({
  plan,
  active,
  onSelect,
}: {
  plan: PlanDefinition
  active: boolean
  onSelect: () => void
}) {
  const price = plan.lifetime
  const unit = CHECKOUT_COPY.priceUnitLifetime

  return (
    <button
      type="button"
      role="radio"
      aria-checked={active}
      aria-labelledby={`checkout-plan-${plan.id}`}
      onClick={onSelect}
      className={cn(
        'group relative flex h-full w-full flex-col rounded-[30px] p-1 text-left transition-all duration-300 motion-reduce:transition-none',
        active
          ? 'z-10 bg-gradient-to-b from-evergreen-light/55 via-cream/15 to-transparent shadow-landing-deep landing:scale-[1.02]'
          : 'bg-soil/[0.06] hover:-translate-y-0.5 hover:bg-soil/[0.09]',
      )}
    >
      {plan.badge ? (
        <span className="absolute -top-4 left-1/2 z-30 inline-flex -translate-x-1/2 items-center gap-1.5 whitespace-nowrap rounded-full bg-daisy px-3.5 py-1.5 text-[12px] leading-none font-semibold text-evergreen-deep shadow-sm ring-1 ring-ink/5">
          <Sparkles className="size-3" strokeWidth={2.2} aria-hidden />
          {plan.badge}
        </span>
      ) : null}

      <span
        className={cn(
          'relative flex h-full flex-1 flex-col overflow-hidden rounded-[26px] p-5 pt-7 landing:p-6 landing:pt-8',
          active
            ? 'bg-forest text-cream ring-1 ring-cream/15'
            : 'bg-canvas text-forest ring-1 ring-soil/10',
        )}
      >
        {active ? (
          <>
            <span
              aria-hidden
              className="pointer-events-none absolute inset-0 bg-gradient-to-br from-evergreen-deep/75 via-forest/10 to-evergreen-deeper/85"
            />
            <BatikBackdrop id={`checkout-batik-${plan.id}`} className="opacity-90" />
            <span
              aria-hidden
              className="pointer-events-none absolute -top-24 left-1/2 size-64 -translate-x-1/2 rounded-full bg-mint/15 blur-3xl"
            />
          </>
        ) : null}

        <span className="relative z-10 flex flex-1 flex-col">
          <span className="flex items-start justify-between gap-3">
            <span
              className={cn(
                'inline-flex w-fit items-center rounded-full px-2.5 py-1 text-[11.5px] leading-[1.5] font-medium',
                active
                  ? 'bg-cream/10 text-cream ring-1 ring-cream/20 backdrop-blur-sm'
                  : 'bg-sage text-forest',
              )}
            >
              {CHECKOUT_COPY.priceBadge}
            </span>

            <span
              aria-hidden
              className={cn(
                'flex size-6 shrink-0 items-center justify-center rounded-full border transition-colors',
                active
                  ? 'border-cream bg-cream text-forest shadow-sm'
                  : 'border-soil/20 bg-canvas text-transparent group-hover:border-forest/40',
              )}
            >
              <Check className="size-3.5" strokeWidth={3.4} />
            </span>
          </span>

          <span
            id={`checkout-plan-${plan.id}`}
            className="mt-4 block font-display text-[22px] leading-[1.2] font-semibold tracking-[-0.02em] landing:text-[24px]"
          >
            {plan.name}
          </span>

          <span className="mt-3 flex flex-wrap items-baseline gap-x-1.5">
            <span className="font-display text-[32px] leading-[1.02] font-semibold tracking-[-0.045em] whitespace-nowrap tabular-nums landing:text-[36px]">
              {formatIDR(price)}
            </span>
            <span
              className={cn(
                'text-[13px] leading-[1.5] font-medium',
                active ? 'text-cream/65' : 'text-forest/50',
              )}
            >
              {unit}
            </span>
          </span>

          <span
            className={cn(
              'mt-2 block min-h-[40px] text-[13.5px] leading-[1.5]',
              active ? 'text-cream/75' : 'text-forest/60',
            )}
          >
            {plan.subtitle}
          </span>

          <span
            className={cn(
              'mt-5 flex flex-1 flex-col border-t pt-4',
              active ? 'border-cream/15' : 'border-soil/10',
            )}
          >
            <span
              className={cn(
                'text-[11px] leading-[1.5] font-medium tracking-[0.16em] uppercase',
                active ? 'text-cream/55' : 'text-forest/40',
              )}
            >
              {CHECKOUT_COPY.featuresTitle}
            </span>
            <span className="mt-3 flex flex-1 flex-col gap-2.5">
              {plan.features.map((feature) => (
                <span
                  key={feature}
                  className="flex items-start gap-2.5 text-[13px] leading-[1.45]"
                >
                  <span
                    aria-hidden
                    className={cn(
                      'mt-[1px] flex size-4 shrink-0 items-center justify-center rounded-full',
                      active ? 'bg-cream/10 text-mint' : 'bg-sage text-forest',
                    )}
                  >
                    <Check className="size-2.5" strokeWidth={3.2} />
                  </span>
                  <span className={active ? 'text-cream/90' : 'text-forest/80'}>{feature}</span>
                </span>
              ))}
            </span>
          </span>
        </span>
      </span>
    </button>
  )
}

/* â”€â”€ CTA primer checkout â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
   Satu definisi, satu tempat render (di dalam kartu ringkasan). Ringkasan
   biaya ada tepat di atasnya, jadi tombolnya cukup satu pil. */
function CheckoutCta({
  onStart,
  className,
  disabled = false,
}: {
  onStart: () => void
  className?: string
  /** true = kode teman masih diperiksa; jangan lanjut dengan harga yang belum final */
  disabled?: boolean
}) {
  return (
    <div className={className}>
      <button
        type="button"
        onClick={onStart}
        disabled={disabled}
        className="group flex h-14 w-full items-center justify-between gap-3 rounded-full bg-forest pr-2 pl-6 text-cream shadow-landing-cta transition-colors duration-200 hover:bg-forest-soft active:scale-[0.98] disabled:cursor-wait disabled:opacity-60 motion-reduce:transition-none"
      >
        <span className="text-[16.5px] font-medium tracking-[-0.01em]">{CHECKOUT_COPY.cta}</span>
        <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-cream text-forest transition-colors duration-200 group-hover:bg-mint">
          <ArrowRight className="size-[18px]" strokeWidth={2.4} aria-hidden />
        </span>
      </button>
    </div>
  )
}

