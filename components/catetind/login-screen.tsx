'use client'

import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowRight, CircleHelp, LoaderCircle, Lock, Mail, ShieldCheck } from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  EMAIL_MAX_LENGTH,
  LOGIN_COPY,
  REGISTRATION_COPY,
  SEND_SIMULATION_MS,
  buildVerifyHref,
  isValidEmail,
} from '@/lib/data/auth'
import { LogoWordmark } from './logo-wordmark'

/* ── Masuk (/login) — inventaris #8 · PRD 5931–5933 ──────────────────────────
   Magic link adalah "janji kepercayaan" produk ini: *kami tidak menyimpan
   passwordmu*. Karena itu halaman masuk harus terasa seperti UNDANGAN, bukan
   gerbang. Tiga keputusan yang lahir dari situ:

     1. SATU FIELD. Nol password, nol konfirmasi password, nol OTP manual —
        langsung dari PRD 5933 (CANDRA) & inventaris #8. Tiap field tambahan di
        halaman masuk = satu alasan lagi buat kabur.
     2. TOMBOL NON-AKTIF SAMPAI VALID, tapi tidak ada jempol yang bingung:
        Enter tetap memicu pengiriman, dan kalau formatnya belum benar alasannya
        ditampilkan dari percobaan user (bukan dari ketikan pertama).
     3. LOADING DI TOMBOL, bukan spinner satu layar. Halaman tetap terbaca
        sambil menunggu, dan user tidak kehilangan konteks.

   Halaman ini PUBLIK/pre-app: `PhoneStage plain` di route, TANPA ScreenShell,
   dan `MobileBottomNav` + AI chat widget menyembunyikan dirinya di prefix
   `/login` (lihat komentar di kedua komponen itu) supaya tidak ada navigasi app
   yang menabrak alur masuk.

   Semua copy ada di `lib/data/auth.ts` — komponen ini nol string user-facing.
   ────────────────────────────────────────────────────────────────────────── */

export function LoginScreen() {
  const router = useRouter()

  const [email, setEmail] = useState('')
  /** error format cuma muncul setelah user mencoba kirim — bahasa repo: menemani, bukan menuduh */
  const [showError, setShowError] = useState(false)
  /** state loading tombol — di produksi berakhir setelah response Supabase */
  const [sending, setSending] = useState(false)
  /** pegangan timer simulasi, supaya tidak ada setState setelah unmount */
  const timerRef = useRef<number | null>(null)

  const emailValid = isValidEmail(email)

  useEffect(
    () => () => {
      if (timerRef.current !== null) window.clearTimeout(timerRef.current)
    },
    [],
  )

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (sending) return

    const trimmed = email.trim()
    if (!isValidEmail(trimmed)) {
      setShowError(true)
      return
    }

    setShowError(false)
    setSending(true)

    /* MOCK — bukan jaringan sungguhan, cuma timer. Arah produksi:
       await supabase.auth.signInWithOtp({ email: trimmed,
         options: { emailRedirectTo: `${location.origin}/login/verify` } })
       Navigasi baru dilakukan setelah request itu selesai (sukses maupun gagal). */
    timerRef.current = window.setTimeout(() => {
      router.push(buildVerifyHref(trimmed))
    }, SEND_SIMULATION_MS)
  }

  /**
   * Tombol sengaja non-aktif sampai email valid (permintaan prompt halaman ini),
   * jadi Enter pada email yang belum benar tidak akan men-submit form — di situ
   * kita menampilkan alasannya, bukan diam-diam tidak bereaksi.
   */
  function handleEnter(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key !== 'Enter' || emailValid) return
    event.preventDefault()
    setShowError(true)
  }

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-[480px] flex-col px-6 pt-10 pb-14 lg:max-w-[560px] lg:pt-16">
      {/* ── 1. header: undangan, bukan gerbang ─────────────────────────────── */}
      <header>
        <LogoWordmark className="h-6" />
        <p className="mt-6 text-[11px] font-semibold tracking-[0.16em] text-ink/40 uppercase">
          {LOGIN_COPY.eyebrow}
        </p>
        <h1 className="mt-1.5 font-display text-3xl font-semibold tracking-tight text-ink lg:text-4xl">
          {LOGIN_COPY.title}
        </h1>
        <p className="mt-2.5 text-[13px] leading-relaxed text-ink/55">{LOGIN_COPY.subtitle}</p>
      </header>

      {/* ── 2. form: satu field, satu tombol ──────────────────────────────── */}
      <form
        className="mt-6 rounded-[1.75rem] bg-cream p-5 ring-1 ring-soil/12"
        onSubmit={handleSubmit}
        noValidate
      >
        <label className="block" htmlFor="login-email">
          <span className="flex items-center gap-1.5 text-[13px] font-semibold leading-snug text-ink">
            <Mail className="size-3.5 text-ink/40" strokeWidth={2.4} aria-hidden />
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
              'mt-2 w-full rounded-2xl bg-cream px-4 py-3.5 text-[15px] font-semibold text-ink outline-none ring-1 transition-shadow placeholder:font-medium placeholder:text-ink/25 focus:ring-2 focus:ring-forest/35',
              showError && !emailValid ? 'ring-plum/50' : 'ring-soil/16',
            )}
          />
          {/* error & hint berbagi satu baris supaya tinggi kartu tidak melompat */}
          <span
            id="login-email-hint"
            aria-live="polite"
            className={cn(
              'mt-1.5 block text-[11px] leading-relaxed',
              showError && !emailValid ? 'text-plum' : 'text-ink/45',
            )}
          >
            {showError && !emailValid ? REGISTRATION_COPY.invalidEmail : LOGIN_COPY.emailHint}
          </span>
        </label>
        {/* aksi primer di zona ibu jari: pil penuh dengan bulatan panah di ujung kanan */}
        <button
          type="submit"
          disabled={!emailValid || sending}
          className={cn(
            'group mt-4 flex h-14 w-full items-center justify-between gap-3 rounded-full pr-2 pl-6 transition-colors duration-200 motion-reduce:transition-none',
            emailValid && !sending
              ? 'bg-forest text-cream shadow-[0_16px_34px_-18px_rgba(69,89,78,0.85)] hover:bg-forest-soft active:scale-[0.98]'
              : 'cursor-not-allowed bg-sage text-ink/40',
          )}
        >
          <span className="text-[15.5px] font-medium tracking-[-0.01em]">
            {sending ? LOGIN_COPY.sendingLabel : LOGIN_COPY.submitLabel}
          </span>
          <span
            className={cn(
              'flex size-10 shrink-0 items-center justify-center rounded-full transition-colors duration-200',
              emailValid && !sending
                ? 'bg-cream text-forest group-hover:bg-mint'
                : 'bg-cream/70 text-ink/30',
            )}
          >
            {sending ? (
              /* loading DI TOMBOL — bukan spinner layar penuh; halaman tetap terbaca */
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

        {/* ── janji kepercayaan: inti halaman ini ─────────────────────────── */}
        <p className="mt-4 flex items-start gap-2 rounded-2xl bg-sage/70 px-3.5 py-3 text-[11.5px] leading-relaxed text-ink/60 ring-1 ring-soil/8">
          <ShieldCheck className="mt-0.5 size-3.5 shrink-0 text-forest" strokeWidth={2.4} aria-hidden />
          <span>{LOGIN_COPY.trustNote}</span>
        </p>
      </form>

      {/* ── 3. daftar: tautan dua arah ke /checkout yang sudah ada ────────── */}
      <p className="mt-5 text-center text-[12.5px] text-ink/55">
        {LOGIN_COPY.registerLead}{' '}
        <Link
          href="/checkout"
          className="font-semibold text-ink underline underline-offset-2 hover:text-forest"
        >
          {LOGIN_COPY.registerLink}
        </Link>
      </p>

      {/* ── 4. kaki halaman: jalan keluar kecil + jujur soal demo ──────────── */}
      <footer className="mt-auto pt-10">
        <p className="flex items-start justify-center gap-1.5 text-center text-[11.5px] leading-relaxed text-ink/50">
          <CircleHelp className="mt-0.5 size-3.5 shrink-0" strokeWidth={2.4} aria-hidden />
          <span>
            {LOGIN_COPY.helpLead}{' '}
            <Link
              href={LOGIN_COPY.helpHref}
              className="font-semibold text-ink/70 underline underline-offset-2 hover:text-forest"
            >
              {LOGIN_COPY.helpLink}
            </Link>
          </span>
        </p>
        <p className="mt-3 flex items-start justify-center gap-1.5 text-center text-[11px] leading-relaxed text-ink/40">
          <Lock className="mt-0.5 size-3 shrink-0" strokeWidth={2.4} aria-hidden />
          <span>{LOGIN_COPY.mockNote}</span>
        </p>
      </footer>
    </div>
  )
}
