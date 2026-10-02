'use client'

import { useRef, useState, type KeyboardEvent } from 'react'
import Link from 'next/link'
import { Info, Lock, Mail, UserRound } from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  EMAIL_MAX_LENGTH,
  NICKNAME_MAX_LENGTH,
  REGISTRATION_COPY,
  isValidEmail,
  isValidNickname,
} from '@/lib/data/auth'
import { BudgetSheet, SheetSubmit, useFocusOnOpen } from './budget-sheet'

/* ── Sheet registrasi checkout (inventaris: "Registration / Identifikasi") ─────
   PRD 5890–5905: langkah 1 checkout cuma minta DUA field — email + nama
   panggilan. ZERO password, telepon, alamat, gender, tanggal lahir. Verifikasi
   email TIDAK memblokir: user lanjut ke pembayaran, tautan masuk (magic link)
   dikirim ke emailnya dan bisa diklik kapan aja (PRD 5931–5933).

   Kenapa cuma 2 field: tiap field tambahan di halaman uang = satu alasan lagi
   buat kabur. Yang benar-benar dibutuhkan app di detik ini cuma "akun ini milik
   siapa" — sisanya bisa dilengkapi di Pengaturan nanti.

   Catatan: tautan "Sudah punya akun? Masuk" → `/login` dipasang di sini oleh
   prompt 09, setelah route `/login` benar-benar ada — prompt 08 sengaja
   menundanya karena dilarang menautkan route yang belum ada.
   ────────────────────────────────────────────────────────────────────────── */

export interface RegistrationResult {
  email: string
  nickname: string
}

/** hasil satu percobaan registrasi: `ok:false` membawa pesan untuk error state */
export type RegistrationOutcome = { ok: true } | { ok: false; error: string }

export function RegistrationSheet({
  open,
  onClose,
  onContinue,
}: {
  open: boolean
  onClose: () => void
  /**
   * Dipanggil setelah kedua field valid. ASYNC sejak paket 64: validasi kode
   * teman menyentuh backend, lalu Supabase mendaftarkan akunnya. Sheet menahan
   * tombol selama menunggu supaya tidak ada dua pendaftaran beruntun, dan
   * menampilkan error state apa adanya kalau backend menolak.
   */
  onContinue: (result: RegistrationResult) => Promise<RegistrationOutcome>
}) {
  const [email, setEmail] = useState('')
  const [nickname, setNickname] = useState('')
  /** error validasi lokal cuma muncul setelah user mencoba lanjut */
  const [showErrors, setShowErrors] = useState(false)
  /** permintaan registrasi sedang berjalan (tombol dikunci) */
  const [submitting, setSubmitting] = useState(false)
  /** error dari backend (kode teman tidak ada, jaringan, dsb.) */
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
    const outcome = await onContinue({ email: email.trim(), nickname: nickname.trim() })
    setSubmitting(false)
    /* sukses → orkestrator menavigasi (sheet ikut unmount). Gagal → tampilkan
       sebabnya DI SINI dan jangan menutup sheet: isian user tidak boleh hilang. */
    if (!outcome.ok) setFormError(outcome.error)
  }

  /** Enter = lanjut, biar form ini bisa diselesaikan tanpa angkat jempol ke tombol */
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
      title={REGISTRATION_COPY.title}
      description={REGISTRATION_COPY.description}
      footer={
        <>
          <SheetSubmit onClick={() => void handleSubmit()} disabled={submitting}>
            {submitting ? REGISTRATION_COPY.submittingLabel : REGISTRATION_COPY.submitLabel}
          </SheetSubmit>
          {/* error backend tampil DI SINI (bukan toast) supaya tetap terlihat
              sambil user membetulkan kode temannya */}
          {formError ? (
            <p className="mt-2.5 flex items-start justify-center gap-1.5 text-center text-[11.5px] leading-relaxed text-plum">
              <Info className="mt-0.5 size-3.5 shrink-0" strokeWidth={2.4} aria-hidden />
              <span>{formError}</span>
            </p>
          ) : null}
          {/* tautan dua arah: dari daftar bisa langsung ke /login (prompt 09) —
              drawer-nya ditutup dulu supaya tidak tersisa terbuka saat kembali */}
          <p className="mt-3 text-center text-[11.5px] leading-relaxed text-ink/55">
            {REGISTRATION_COPY.hasAccountLead}{' '}
            <Link
              href="/login"
              onClick={onClose}
              className="font-semibold text-ink underline underline-offset-2 hover:text-forest"
            >
              {REGISTRATION_COPY.hasAccountLink}
            </Link>
          </p>
          <p className="mt-2.5 flex items-start justify-center gap-1.5 text-center text-[11px] leading-relaxed text-ink/45">
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
          handleSubmit()
        }}
      >
        {/* ── email ─────────────────────────────────────────────────────── */}
        <label className="block" htmlFor="checkout-email">
          <span className="flex items-center gap-1.5 text-[13px] font-semibold leading-snug text-ink">
            <Mail className="size-3.5 text-ink/40" strokeWidth={2.4} aria-hidden />
            {REGISTRATION_COPY.emailLabel}
          </span>
          <input
            ref={emailRef}
            id="checkout-email"
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
            aria-describedby="checkout-email-hint"
            className={cn(
              'mt-2 w-full rounded-2xl bg-cream px-4 py-3 text-[15px] font-semibold text-ink outline-none ring-1 transition-shadow placeholder:font-medium placeholder:text-ink/25 focus:ring-2 focus:ring-forest/35',
              showErrors && !emailValid ? 'ring-plum/50' : 'ring-soil/16',
            )}
          />
          <span
            id="checkout-email-hint"
            className="mt-1.5 block text-[11px] leading-relaxed text-ink/45"
          >
            {showErrors && !emailValid
              ? REGISTRATION_COPY.invalidEmail
              : REGISTRATION_COPY.emailHint}
          </span>
        </label>
        {/* ── nama panggilan ────────────────────────────────────────────── */}
        <label className="mt-4 block" htmlFor="checkout-nickname">
          <span className="flex items-center gap-1.5 text-[13px] font-semibold leading-snug text-ink">
            <UserRound className="size-3.5 text-ink/40" strokeWidth={2.4} aria-hidden />
            {REGISTRATION_COPY.nameLabel}
          </span>
          <input
            id="checkout-nickname"
            type="text"
            name="nickname"
            autoComplete="nickname"
            maxLength={NICKNAME_MAX_LENGTH}
            value={nickname}
            onChange={(event) => setNickname(event.target.value)}
            onKeyDown={handleEnter}
            placeholder={REGISTRATION_COPY.namePlaceholder}
            aria-invalid={showErrors && !nicknameValid}
            aria-describedby="checkout-nickname-hint"
            className={cn(
              'mt-2 w-full rounded-2xl bg-cream px-4 py-3 text-[15px] font-semibold text-ink outline-none ring-1 transition-shadow placeholder:font-medium placeholder:text-ink/25 focus:ring-2 focus:ring-forest/35',
              showErrors && !nicknameValid ? 'ring-plum/50' : 'ring-soil/16',
            )}
          />
          <span
            id="checkout-nickname-hint"
            className="mt-1.5 block text-[11px] leading-relaxed text-ink/45"
          >
            {showErrors && !nicknameValid
              ? REGISTRATION_COPY.invalidNickname
              : REGISTRATION_COPY.nameHint}
          </span>
        </label>

        {/* ── catatan jujur: paragraf demo DIHAPUS (paket 64) ───────────────────────────────────── */}
        <p className="mt-5 flex items-start gap-2 rounded-2xl bg-sage/70 px-3.5 py-3 text-[11.5px] leading-relaxed text-ink/60 ring-1 ring-soil/8">
          <Mail className="mt-0.5 size-3.5 shrink-0 text-forest" strokeWidth={2.4} aria-hidden />
          <span>{REGISTRATION_COPY.emailNextNote}</span>
        </p>
      </form>
    </BudgetSheet>
  )
}
