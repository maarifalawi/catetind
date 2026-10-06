'use client'

import { useRef, useState, type KeyboardEvent } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Info, Lock, Mail, Tag, UserRound } from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  EMAIL_MAX_LENGTH,
  NICKNAME_MAX_LENGTH,
  REGISTRATION_COPY,
  isValidEmail,
  isValidNickname,
} from '@/lib/data/auth'
import { LEAD_SHEET_COPY, LANDING_LOGIN_HREF, REGISTERED_PATH, formatIDR, type LandingTier } from '@/lib/data/landing'
import { registerAccount } from '@/lib/session-client'
import { BudgetSheet, SheetSubmit, useFocusOnOpen } from '@/components/catetind/budget-sheet'

/* ── SHEET PENDAFTARAN DARI LANDING (lead capture) ───────────────────────────
   Muncul saat user menekan CTA di kartu harga atau sticky bar. Menampilkan tier
   terpilih di kepala sheet, lalu DUA field wajib (email + nama panggilan) dan
   SATU opsional (kode referral). Alurnya memakai infrastruktur yang SUDAH ada:

     • bentuk kode referral & validasi field diperiksa lokal (cepat);
     • KEBERADAAN kode diperiksa server (`/api/referral/validate`) DI DALAM
       `registerAccount` sebelum akun difinalkan — bukan dikarang di klien;
     • akun dibuat lewat Supabase Auth (`signInWithOtp`, zero password).

   Tombol dikunci selama menunggu supaya tidak ada dua pendaftaran beruntun, dan
   error backend tampil INLINE (bukan toast) supaya sheet tetap terbuka & isian
   user tidak hilang. Sukses → redirect ke `/registered?email=…`. */
export function LeadSheet({
  open,
  tier,
  onClose,
}: {
  open: boolean
  tier: LandingTier | null
  onClose: () => void
}) {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [nickname, setNickname] = useState('')
  const [referral, setReferral] = useState('')
  const [showErrors, setShowErrors] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const emailRef = useRef<HTMLInputElement>(null)

  useFocusOnOpen(open, emailRef)

  const emailValid = isValidEmail(email)
  const nicknameValid = isValidNickname(nickname)
  const canContinue = emailValid && nicknameValid

  async function handleSubmit() {
    if (submitting) return
    setShowErrors(true)
    setFormError(null)
    if (!canContinue) return
    setSubmitting(true)
    const outcome = await registerAccount({
      email: email.trim(),
      nickname: nickname.trim(),
      referralCode: referral.trim() || null,
    })
    setSubmitting(false)
    if (!outcome.ok) {
      setFormError(outcome.error)
      return
    }
    router.push(`${REGISTERED_PATH}?email=${encodeURIComponent(email.trim())}`)
  }

  function handleEnter(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'Enter') {
      event.preventDefault()
      void handleSubmit()
    }
  }

  return (
    <BudgetSheet
      open={open}
      onClose={onClose}
      title={LEAD_SHEET_COPY.title}
      description={LEAD_SHEET_COPY.description}
      footer={
        <>
          <SheetSubmit onClick={() => void handleSubmit()} disabled={submitting}>
            {submitting ? LEAD_SHEET_COPY.submitting : LEAD_SHEET_COPY.submit}
          </SheetSubmit>
          {formError ? (
            <p className="mt-2.5 flex items-start justify-center gap-1.5 text-center text-[11.5px] leading-relaxed text-plum">
              <Info className="mt-0.5 size-3.5 shrink-0" strokeWidth={2.4} aria-hidden />
              <span>{formError}</span>
            </p>
          ) : null}
          <p className="mt-3 text-center text-[11.5px] leading-relaxed text-forest/55">
            {REGISTRATION_COPY.hasAccountLead}{' '}
            <Link
              href={LANDING_LOGIN_HREF}
              onClick={onClose}
              className="font-medium text-forest underline underline-offset-2 hover:text-forest"
            >
              {REGISTRATION_COPY.hasAccountLink}
            </Link>
          </p>
          <p className="mt-2.5 flex items-start justify-center gap-1.5 text-center text-[11px] leading-relaxed text-forest/45">
            <Lock className="mt-0.5 size-3 shrink-0" strokeWidth={2.4} aria-hidden />
            <span>{REGISTRATION_COPY.noPasswordNote}</span>
          </p>
        </>
      }
    >
      <form
        className="pb-1"
        onSubmit={(event) => {
          event.preventDefault()
          void handleSubmit()
        }}
      >
        {/* ── tier terpilih ── */}
        {tier ? (
          <div className="mb-5 rounded-2xl bg-gradient-to-br from-forest-soft via-forest to-[#1f2823] px-4 py-3.5 text-cream">
            <p className="text-[10.5px] font-medium tracking-[0.14em] text-cream/60 uppercase">
              {LEAD_SHEET_COPY.selectedLabel}
            </p>
            <div className="mt-1 flex items-baseline justify-between gap-3">
              <span className="font-display text-[15px] font-medium">{tier.name}</span>
              <span className="font-display text-[15px] font-medium tabular-nums">
                {formatIDR(tier.price)}
              </span>
            </div>
            <p className="mt-0.5 text-[11px] text-cream/60">{tier.periodLabel}</p>
          </div>
        ) : null}

        {/* ── email ── */}
        <label className="block" htmlFor="lead-email">
          <span className="flex items-center gap-1.5 text-[13px] leading-snug font-medium text-forest">
            <Mail className="size-3.5 text-forest/40" strokeWidth={2.4} aria-hidden />
            {REGISTRATION_COPY.emailLabel}
          </span>
          <input
            ref={emailRef}
            id="lead-email"
            type="email"
            name="email"
            autoComplete="email"
            inputMode="email"
            maxLength={EMAIL_MAX_LENGTH}
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            onKeyDown={handleEnter}
            placeholder={REGISTRATION_COPY.emailPlaceholder}
            aria-invalid={showErrors && !emailValid}
            aria-describedby="lead-email-hint"
            className={cn(
              'mt-2.5 w-full rounded-2xl bg-sage/45 px-4 py-3.5 text-[15px] font-medium text-forest outline-none ring-1 transition-all placeholder:font-medium placeholder:text-forest/30 focus:bg-cream focus:ring-2 focus:ring-forest/30',
              showErrors && !emailValid ? 'ring-plum/50' : 'ring-transparent',
            )}
          />
          <span id="lead-email-hint" className="mt-1.5 block text-[11px] leading-relaxed text-forest/45">
            {showErrors && !emailValid
              ? REGISTRATION_COPY.invalidEmail
              : REGISTRATION_COPY.emailHint}
          </span>
        </label>

        {/* ── nama panggilan ── */}
        <label className="mt-4 block" htmlFor="lead-nickname">
          <span className="flex items-center gap-1.5 text-[13px] leading-snug font-medium text-forest">
            <UserRound className="size-3.5 text-forest/40" strokeWidth={2.4} aria-hidden />
            {REGISTRATION_COPY.nameLabel}
          </span>
          <input
            id="lead-nickname"
            type="text"
            name="nickname"
            autoComplete="nickname"
            maxLength={NICKNAME_MAX_LENGTH}
            value={nickname}
            onChange={(event) => setNickname(event.target.value)}
            onKeyDown={handleEnter}
            placeholder={REGISTRATION_COPY.namePlaceholder}
            aria-invalid={showErrors && !nicknameValid}
            aria-describedby="lead-nickname-hint"
            className={cn(
              'mt-2.5 w-full rounded-2xl bg-sage/45 px-4 py-3.5 text-[15px] font-medium text-forest outline-none ring-1 transition-all placeholder:font-medium placeholder:text-forest/30 focus:bg-cream focus:ring-2 focus:ring-forest/30',
              showErrors && !nicknameValid ? 'ring-plum/50' : 'ring-transparent',
            )}
          />
          <span
            id="lead-nickname-hint"
            className="mt-1.5 block text-[11px] leading-relaxed text-forest/45"
          >
            {showErrors && !nicknameValid
              ? REGISTRATION_COPY.invalidNickname
              : REGISTRATION_COPY.nameHint}
          </span>
        </label>

        {/* ── kode referral (opsional) ── */}
        <label className="mt-4 block" htmlFor="lead-referral">
          <span className="flex items-center gap-1.5 text-[13px] leading-snug font-medium text-forest">
            <Tag className="size-3.5 text-forest/40" strokeWidth={2.4} aria-hidden />
            {LEAD_SHEET_COPY.referralLabel}
          </span>
          <input
            id="lead-referral"
            type="text"
            name="referral"
            autoComplete="off"
            autoCapitalize="characters"
            maxLength={16}
            value={referral}
            onChange={(event) => setReferral(event.target.value)}
            onKeyDown={handleEnter}
            placeholder={LEAD_SHEET_COPY.referralPlaceholder}
            className="mt-2.5 w-full rounded-2xl bg-sage/45 px-4 py-3.5 text-[15px] font-medium text-forest uppercase outline-none ring-1 ring-transparent transition-all placeholder:font-medium placeholder:normal-case placeholder:text-forest/30 focus:bg-cream focus:ring-2 focus:ring-forest/30"
          />
          <span className="mt-1.5 block text-[11px] leading-relaxed text-forest/45">
            {LEAD_SHEET_COPY.referralHint}
          </span>
        </label>

        {/* ── catatan langkah berikutnya ── */}
        <p className="mt-5 flex items-start gap-2 rounded-2xl bg-sage/70 px-3.5 py-3 text-[11.5px] leading-relaxed text-forest/60 ring-1 ring-soil/8">
          <Mail className="mt-0.5 size-3.5 shrink-0 text-forest" strokeWidth={2.4} aria-hidden />
          <span>{LEAD_SHEET_COPY.emailNextNote}</span>
        </p>
      </form>
    </BudgetSheet>
  )
}

