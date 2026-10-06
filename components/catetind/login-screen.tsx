'use client'

import { useEffect, useState, type FormEvent, type KeyboardEvent } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  ArrowRight,
  CircleHelp,
  KeyRound,
  LoaderCircle,
  Mail,
  MailCheck,
  RefreshCw,
} from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import {
  EMAIL_MAX_LENGTH,
  LOGIN_COPY,
  OTP_LENGTH,
  REGISTRATION_COPY,
  RESEND_SECONDS,
  SESSION_COPY,
  VERIFY_COPY,
  isValidEmail,
  isValidOtpCode,
  resendCountdownLabel,
} from '@/lib/data/auth'
import { sendLoginLink, verifyEmailOtp } from '@/lib/session-client'
import { BrandPanel } from './brand-panel'

/* ── Masuk (/login) — inventaris #8 · PRD 5931–5933 ──────────────────────────
   Magic link adalah "janji kepercayaan" produk ini: *kami tidak menyimpan
   passwordmu*. Halaman masuk karena itu harus terasa seperti UNDANGAN, bukan
   gerbang. Tiga aturan psikologis yang mengikat seluruh halaman (CONTEXT-WAJIB
   §5): (1) ZERO password — satu email, satu kode, selesai; (2) jangan mengungkap
   keberadaan akun; (3) jangan membuat user terjebak di layar buntu.

   ── REVISI DESAIN (panel 2 kolom + OTP jadi jalur utama) ────────────────────
   Tata letak mengikuti mock: kartu dua kolom — panel brand batik di kiri dan
   form di kanan. Panel kiri adalah komponen BERSAMA `BrandPanel` (dipakai juga
   oleh /checkout): gradien Evergreen + motif batik ala muka kartu dompet, TANPA
   logo dan tanpa teks lain selain tagline (permintaan desain).

   Mekanisme login kini DUA LANGKAH DI SATU HALAMAN:
     1. tulis email  → `signInWithOtp` mengirim kode 6 angka;
     2. ketik kode   → `verifyOtp` membuat sesi, lalu ke Dashboard.
   Sebelumnya langkah 2 hidup di `/login/verify` (user harus pindah halaman).
   Alasannya pindah jalur: magic link gampang DIMINTA tapi paling repot
   DISELESAIKAN (keluar app → cari email → klik → balik), sementara OTP diketik
   di halaman yang sama — nol perpindahan app. Itu yang paling gampang untuk
   user "males" yang jadi sasaran tagline. Magic link TETAP hidup lewat
   `/login/verify` (`?code=` + kartu OTP di sana) — nol tautan mati, nol dua
   jalur data (keduanya memakai `lib/session-client.ts` yang sama).

   Halaman ini PUBLIK/pre-app: `PhoneStage plain` di route, TANPA ScreenShell;
   `MobileBottomNav` + AI chat widget menyembunyikan diri di prefix `/login`.
   Satu-satunya navigasi di sini adalah `PublicNavbar` (navbar SITUS, dipasang
   di route) — jadi "Halaman depan" sudah punya pintunya lewat logo di sana dan
   tidak perlu diulang di dalam kartu.

   Semua copy ada di `lib/data/auth.ts` — komponen ini nol string user-facing.
   ────────────────────────────────────────────────────────────────────────── */

/** langkah masuk: tulis email → ketik kode 6 angka dari email */
type LoginStep = 'email' | 'code'

export function LoginScreen() {
  const router = useRouter()

  const [step, setStep] = useState<LoginStep>('email')
  const [email, setEmail] = useState('')
  /** error format email cuma muncul setelah user mencoba kirim — menemani, bukan menuduh */
  const [showError, setShowError] = useState(false)
  /** permintaan kode sedang berjalan (server Supabase mengirim email) */
  const [sending, setSending] = useState(false)
  /** kode 6 angka yang diketik user */
  const [otp, setOtp] = useState('')
  /** kode ditolak (format salah / server menolak) — dibersihkan begitu user mengetik lagi */
  const [codeError, setCodeError] = useState(false)
  /** verifikasi kode sedang berjalan */
  const [verifying, setVerifying] = useState(false)
  /** cooldown kirim ulang: 0 = tombol aktif, > 0 = hitung mundur */
  const [secondsLeft, setSecondsLeft] = useState(0)

  const emailValid = isValidEmail(email)
  const otpValid = isValidOtpCode(otp)
  const canResend = secondsLeft === 0
  const trimmedEmail = email.trim()

  /**
   * Cooldown kirim ulang: satu timeout berantai (bukan interval) — lebih murah
   * dan bebas timer nyangkut saat halaman ditinggalkan.
   */
  useEffect(() => {
    if (secondsLeft === 0) return
    const id = window.setTimeout(() => setSecondsLeft((value) => value - 1), 1000)
    return () => window.clearTimeout(id)
  }, [secondsLeft])

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (sending) return

    if (!emailValid) {
      setShowError(true)
      return
    }

    setShowError(false)
    setSending(true)
    /* NYATA: Supabase mengirim kode 6 angka (dan tautan) ke email ini. Kita
       TIDAK berpura-pura "mengirim" dengan timer — step hanya berubah setelah
       server benar-benar menjawab. */
    const result = await sendLoginLink(trimmedEmail)
    setSending(false)
    if (!result.ok) {
      toast.error(result.error)
      return
    }
    /* lanjut ke langkah kode DI HALAMAN INI — user tidak pindah app/route */
    setOtp('')
    setCodeError(false)
    setSecondsLeft(RESEND_SECONDS)
    setStep('code')
    toast.success(LOGIN_COPY.codeSentToast, { description: LOGIN_COPY.codeSentToastDescription })
  }

  /**
   * Tombol sengaja non-aktif sampai email valid, jadi Enter pada email yang
   * belum benar tidak akan men-submit form — di situ kita menampilkan alasannya,
   * bukan diam-diam tidak bereaksi.
   */
  function handleEnter(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key !== 'Enter' || emailValid) return
    event.preventDefault()
    setShowError(true)
  }

  async function handleVerify(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (verifying) return

    if (!otpValid) {
      setCodeError(true)
      return
    }

    setCodeError(false)
    setVerifying(true)
    const result = await verifyEmailOtp(trimmedEmail, otp)
    setVerifying(false)
    if (!result.ok) {
      setCodeError(true)
      toast.error(VERIFY_COPY.otpFailedTitle, { description: result.error })
      return
    }
    toast.success(SESSION_COPY.signInToast, { description: SESSION_COPY.signInToastDescription })
    router.push('/app')
  }

  /** hanya angka, maksimal `OTP_LENGTH` — paste "1 2 3-4 5 6" tetap diterima */
  function handleOtpChange(value: string) {
    setOtp(value.replace(/\D/g, '').slice(0, OTP_LENGTH))
    setCodeError(false)
  }

  function handleResend() {
    if (!canResend) return
    setSecondsLeft(RESEND_SECONDS)
    void sendLoginLink(trimmedEmail).then((result) => {
      if (result.ok) toast.success(LOGIN_COPY.resendSentNote)
      else toast.error(VERIFY_COPY.resendFailed, { description: result.error })
    })
  }

  /** kembali ke langkah email tanpa kehilangan alamat yang sudah diketik */
  function backToEmail() {
    setStep('email')
    setOtp('')
    setCodeError(false)
  }

  return (
    <div className="flex min-h-[calc(100dvh-4rem)] w-full items-center justify-center px-4 py-8 sm:px-6 lg:px-8 lg:py-12">
      {/* kartu dua kolom: panel brand (kiri) + form (kanan) — mengikuti mock,
          tapi permukaan/warnanya dari palet kanon kita, bukan gradien biru. */}
      <div className="grid w-full max-w-[1040px] overflow-hidden rounded-[1.5rem] bg-cream ring-1 ring-soil/10 shadow-[0_40px_90px_-55px_rgba(0,0,0,0.5)] lg:grid-cols-2 lg:rounded-[2rem]">
        {/* panel brand batik — komponen BERSAMA, dipakai /login DAN /checkout.
            Tagline jadi `h1` di sini karena halaman ini tidak punya judul lain. */}
        <BrandPanel as="h1" />

        {/* ── panel form ────────────────────────────────────────────────────── */}
        <div className="flex flex-col px-7 py-9 sm:px-10 lg:px-12 lg:py-12">
          <div className="mx-auto flex w-full max-w-[400px] flex-1 flex-col">
            <div className="flex flex-1 flex-col justify-center py-8 lg:py-6">
              {step === 'email' ? (
                /* ── LANGKAH 1 · email ─────────────────────────────────────── */
                <form onSubmit={handleSubmit} noValidate>
                  <h2 className="font-display text-[1.9rem] leading-tight font-medium tracking-[-0.02em] text-forest lg:text-[2.1rem]">
                    {LOGIN_COPY.title}
                  </h2>

                  <label className="mt-8 block" htmlFor="login-email">
                    <span className="flex items-center gap-1.5 text-[13.5px] leading-snug font-medium text-forest">
                      <Mail className="size-4 text-forest/40" strokeWidth={2.4} aria-hidden />
                      {LOGIN_COPY.emailLabel}
                    </span>
                    <input
                      id="login-email"
                      type="email"
                      name="email"
                      autoComplete="email"
                      inputMode="email"
                      maxLength={EMAIL_MAX_LENGTH}
                      autoFocus
                      value={email}
                      onChange={(event) => setEmail(event.target.value)}
                      onKeyDown={handleEnter}
                      placeholder={LOGIN_COPY.emailPlaceholder}
                      aria-invalid={showError && !emailValid}
                      aria-describedby="login-email-hint"
                      className={cn(
                        'mt-2.5 h-14 w-full rounded-2xl bg-sage/45 px-4 text-[16px] font-medium text-forest outline-none ring-1 transition-all placeholder:font-medium placeholder:text-forest/30 focus:bg-cream focus:ring-2 focus:ring-forest/30',
                        showError && !emailValid ? 'ring-plum/50' : 'ring-transparent',
                      )}
                    />
                    <span
                      id="login-email-hint"
                      aria-live="polite"
                      className={cn(
                        'mt-2 block text-[12.5px] leading-relaxed',
                        showError && !emailValid ? 'text-plum' : 'text-forest/45',
                      )}
                    >
                      {showError && !emailValid ? REGISTRATION_COPY.invalidEmail : null}
                    </span>
                  </label>

                  {/* aksi primer di zona ibu jari: pil penuh + bulatan panah */}
                  <button
                    type="submit"
                    disabled={!emailValid || sending}
                    className={cn(
                      'group mt-5 flex h-14 w-full items-center justify-between gap-3 rounded-full pr-2 pl-6 transition-colors duration-200 motion-reduce:transition-none',
                      emailValid && !sending
                        ? 'bg-forest text-cream shadow-[0_16px_34px_-18px_rgba(69,89,78,0.85)] hover:bg-forest-soft active:scale-[0.98]'
                        : 'cursor-not-allowed bg-sage text-forest/40',
                    )}
                  >
                    <span className="text-[16px] font-medium tracking-[-0.01em]">
                      {sending ? LOGIN_COPY.sendingLabel : LOGIN_COPY.submitLabel}
                    </span>
                    <span
                      className={cn(
                        'flex size-10 shrink-0 items-center justify-center rounded-full transition-colors duration-200',
                        emailValid && !sending ? 'bg-cream text-forest group-hover:bg-mint' : 'bg-cream/70 text-forest/30',
                      )}
                    >
                      {sending ? (
                        <LoaderCircle
                          className="size-[18px] animate-spin motion-reduce:animate-none"
                          strokeWidth={2.4}
                          aria-hidden
                        />
                      ) : (
                        <ArrowRight className="size-[18px]" strokeWidth={2.4} aria-hidden />
                      )}
                    </span>
                  </button>
                </form>
              ) : (
                /* ── LANGKAH 2 · kode 6 angka (jalur utama) ─────────────────── */
                <form onSubmit={handleVerify} noValidate>
                  <h2 className="font-display text-[1.9rem] leading-tight font-medium tracking-[-0.02em] text-forest lg:text-[2.1rem]">
                    {LOGIN_COPY.codeTitle}
                  </h2>

                  {/* email tujuan + jalan ganti email — user selalu tahu kodenya ke mana */}
                  <div className="mt-6 flex items-center justify-between gap-3 rounded-2xl bg-sage px-3.5 py-3 ring-1 ring-soil/8">
                    <span className="flex min-w-0 items-center gap-2">
                      <MailCheck className="size-4 shrink-0 text-forest" strokeWidth={2.4} aria-hidden />
                      <span className="min-w-0">
                        <span className="block text-[11px] leading-tight text-forest/45">{LOGIN_COPY.codeSentLead}</span>
                        <span className="block truncate text-[13.5px] font-medium text-forest">{trimmedEmail}</span>
                      </span>
                    </span>
                    <button
                      type="button"
                      onClick={backToEmail}
                      className="shrink-0 text-[12px] font-medium text-forest/60 underline underline-offset-2 transition-colors hover:text-forest motion-reduce:transition-none"
                    >
                      {LOGIN_COPY.changeEmailLabel}
                    </button>
                  </div>

                  <label className="mt-6 block" htmlFor="login-code">
                    <span className="flex items-center gap-1.5 text-[13.5px] leading-snug font-medium text-forest">
                      <KeyRound className="size-4 text-forest/40" strokeWidth={2.4} aria-hidden />
                      {LOGIN_COPY.codeLabel}
                    </span>
                    <input
                      id="login-code"
                      type="text"
                      name="one-time-code"
                      autoComplete="one-time-code"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      maxLength={OTP_LENGTH}
                      autoFocus
                      value={otp}
                      onChange={(event) => handleOtpChange(event.target.value)}
                      placeholder={LOGIN_COPY.codePlaceholder}
                      aria-invalid={codeError}
                      aria-describedby="login-code-hint"
                      className={cn(
                        'mt-2.5 h-16 w-full rounded-2xl bg-sage/45 text-center font-display text-[26px] font-medium tracking-[0.45em] text-forest outline-none ring-1 transition-all placeholder:font-medium placeholder:tracking-[0.3em] placeholder:text-forest/25 focus:bg-cream focus:ring-2 focus:ring-forest/30',
                        codeError ? 'ring-plum/50' : 'ring-transparent',
                      )}
                    />
                    <span
                      id="login-code-hint"
                      aria-live="polite"
                      className={cn(
                        'mt-2 block text-[12.5px] leading-relaxed',
                        codeError ? 'text-plum' : 'text-forest/45',
                      )}
                    >
                      {codeError ? LOGIN_COPY.invalidCode : null}
                    </span>
                  </label>

                  <button
                    type="submit"
                    disabled={!otpValid || verifying}
                    className={cn(
                      'group mt-5 flex h-14 w-full items-center justify-between gap-3 rounded-full pr-2 pl-6 transition-colors duration-200 motion-reduce:transition-none',
                      otpValid && !verifying
                        ? 'bg-forest text-cream shadow-[0_16px_34px_-18px_rgba(69,89,78,0.85)] hover:bg-forest-soft active:scale-[0.98]'
                        : 'cursor-not-allowed bg-sage text-forest/40',
                    )}
                  >
                    <span className="text-[16px] font-medium tracking-[-0.01em]">
                      {verifying ? LOGIN_COPY.verifyingLabel : LOGIN_COPY.codeSubmitLabel}
                    </span>
                    <span
                      className={cn(
                        'flex size-10 shrink-0 items-center justify-center rounded-full transition-colors duration-200',
                        otpValid && !verifying ? 'bg-cream text-forest group-hover:bg-mint' : 'bg-cream/70 text-forest/30',
                      )}
                    >
                      {verifying ? (
                        <LoaderCircle
                          className="size-[18px] animate-spin motion-reduce:animate-none"
                          strokeWidth={2.4}
                          aria-hidden
                        />
                      ) : (
                        <ArrowRight className="size-[18px]" strokeWidth={2.4} aria-hidden />
                      )}
                    </span>
                  </button>

                  {/* dua jalan keluar kecil: buka inbox, atau kirim ulang (dengan cooldown) */}
                  <div className="mt-4 flex items-center justify-center gap-3 text-[12.5px]">
                    <a
                      href="mailto:"
                      className="inline-flex items-center gap-1.5 font-medium text-forest transition-colors hover:underline motion-reduce:transition-none"
                    >
                      <Mail className="size-3.5" strokeWidth={2.4} aria-hidden />
                      {VERIFY_COPY.openMailLabel}
                    </a>
                    <span aria-hidden className="text-forest/20">
                      ·
                    </span>
                    <button
                      type="button"
                      disabled={!canResend}
                      onClick={handleResend}
                      className={cn(
                        'inline-flex items-center gap-1.5 font-medium transition-colors duration-200 motion-reduce:transition-none',
                        canResend ? 'text-forest hover:underline' : 'cursor-not-allowed text-forest/40',
                      )}
                    >
                      <RefreshCw className="size-3.5" strokeWidth={2.4} aria-hidden />
                      {canResend ? LOGIN_COPY.resendLabel : resendCountdownLabel(secondsLeft)}
                    </button>
                  </div>
                </form>
              )}
            </div>

            {/* daftar: tautan dua arah ke /checkout yang sudah ada */}
            <p className="mt-6 text-center text-[13px] text-forest/55">
              {LOGIN_COPY.registerLead}{' '}
              <Link
                href="/checkout"
                className="font-medium text-forest underline underline-offset-2 hover:text-forest"
              >
                {LOGIN_COPY.registerLink}
              </Link>
            </p>

            {/* jalan keluar kecil: bukan user yang disalahkan, tapi kami yang dibantu */}
            <p className="mt-3 flex items-start justify-center gap-1.5 text-center text-[12px] leading-relaxed text-forest/45">
              <CircleHelp className="mt-0.5 size-3.5 shrink-0" strokeWidth={2.4} aria-hidden />
              <span>
                {LOGIN_COPY.helpLead}{' '}
                <Link
                  href={LOGIN_COPY.helpHref}
                  className="font-medium text-forest/60 underline underline-offset-2 hover:text-forest"
                >
                  {LOGIN_COPY.helpLink}
                </Link>
              </span>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
