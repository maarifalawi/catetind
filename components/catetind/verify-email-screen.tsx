'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import {
  ArrowRight,
  CircleHelp,
  Clock,
  LoaderCircle,
  Mail,
  MailCheck,
  RefreshCw,
  Sparkles,
  TriangleAlert,
} from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import {
  LOGIN_COPY,
  LOGIN_PATH,
  MAGIC_LINK_SENDER,
  RESEND_SECONDS,
  RESENT_NOTE_MS,
  SESSION_COPY,
  VERIFY_COPY,
  buildExpiredPreviewHref,
  resendCountdownLabel,
} from '@/lib/data/auth'
import { LogoWordmark } from './logo-wordmark'
import { completeMagicLink, sendLoginLink, verifyEmailOtp } from '@/lib/session-client'

/* ── Cek Email / Callback (/login/verify) — inventaris #9 · PRD 5931–5933 ─────
   Halaman ini adalah tempat user MENUNGGU, dan menunggu yang hampa adalah
   tempat orang menutup app. Karena itu isinya bukan sekadar "cek email":

     • alamat emailnya DITAMPILKAN (dari `?email=`) → user yakin tautannya ke
       alamat yang benar sebelum pindah tab;
     • langkah berikutnya ditulis sebagai urutan, bukan paragraf;
     • "Kirim ulang" ber-cooldown 60 detik dengan teks hitung mundur — rate-limit
       dijelaskan, bukan disamarkan sebagai tombol mati;
     • STATE KEDALUWARSA punya kartu sendiri + jalan keluar (jangan ada layar buntu);
     • tombol demo berlabel "demo" supaya alur bisa diklik sampai ujung tanpa
       berpura-pura ada sesi nyata.

   Halaman PUBLIK: `PhoneStage plain` di route, tanpa sidebar/nav/chat widget.
   Semua copy di `lib/data/auth.ts`.
   ────────────────────────────────────────────────────────────────────────── */

/** easing khas app: masuk cepat lalu settle lembut */
const EASE: [number, number, number, number] = [0.22, 1, 0.36, 1]

export function VerifyEmailScreen({
  email,
  expired,
  code,
}: {
  email: string
  expired: boolean
  /** `?code=` dari tautan email (PKCE) — ditukar jadi sesi saat halaman dibuka */
  code?: string
}) {
  const reduceMotion = useReducedMotion()
  const router = useRouter()

  /**
   * Permintaan sesi sedang berjalan — baik menukar `?code=` dari tautan email
   * maupun memverifikasi kode 6 angka yang diketik user.
   */
  const [signingIn, setSigningIn] = useState(false)
  /** kode 6 angka dari email (`{{ .Token }}`) */
  const [otp, setOtp] = useState('')
  /** true = tautan/kode sudah terbukti tidak berlaku lagi (state kedaluwarsa) */
  const [linkExpired, setLinkExpired] = useState(expired)

  /** hitung mundur kirim ulang — mulai dari penuh karena email barusan dikirim */
  const [secondsLeft, setSecondsLeft] = useState(RESEND_SECONDS)
  /** umpan balik setelah kirim ulang (di samping toast, biar terbaca screen reader) */
  const [resent, setResent] = useState(false)
  /** pengingat konfirmasi di atas harus hilang sendiri — bukan menumpuk selamanya */
  const resentTimerRef = useRef<number | null>(null)

  const trimmedEmail = email.trim()
  /** kalau `?email=` kosong (bookmark lama) jangan tampilkan alamat kosong */
  const displayEmail = trimmedEmail || VERIFY_COPY.emailFallback
  const canResend = secondsLeft === 0

  /**
   * Satu timer hidup pada satu waktu (timeout berantai, bukan interval): lebih
   * murah dan bebas timer nyangkut saat halaman ditinggalkan.
   */
  useEffect(() => {
    if (secondsLeft === 0) return
    const id = window.setTimeout(() => setSecondsLeft((current) => Math.max(0, current - 1)), 1000)
    return () => window.clearTimeout(id)
  }, [secondsLeft])

  /**
   * Tukar `?code=` dari tautan email jadi sesi begitu halaman dibuka. Ini jalur
   * yang menyelesaikan login tanpa user mengetik apa pun; kalau kodenya sudah
   * tidak berlaku, kartu "tautan kedaluwarsa" yang tampil (bukan layar buntu).
   */
  useEffect(() => {
    if (!code) return
    let alive = true
    setSigningIn(true)
    void (async () => {
      const result = await completeMagicLink(code)
      if (!alive) return
      setSigningIn(false)
      if (!result.ok) {
        setLinkExpired(true)
        toast.error(VERIFY_COPY.linkFailedTitle, { description: result.error })
        return
      }
      toast.success(SESSION_COPY.signInToast, { description: SESSION_COPY.signInToastDescription })
      router.push('/')
    })()
    return () => {
      alive = false
    }
  }, [code, router])

  /** masuk dengan kode 6 angka dari email — jalur kedua, untuk kode yang diketik */
  async function handleVerifyOtp() {
    if (signingIn) return
    setSigningIn(true)
    const result = await verifyEmailOtp(trimmedEmail, otp)
    setSigningIn(false)
    if (!result.ok) {
      toast.error(VERIFY_COPY.otpFailedTitle, { description: result.error })
      return
    }
    toast.success(SESSION_COPY.signInToast, { description: SESSION_COPY.signInToastDescription })
    router.push('/')
  }


  function handleResend() {
    if (!canResend) return
    setSecondsLeft(RESEND_SECONDS)
    setResent(true)
    /* Kirim ulang NYATA: `signInWithOtp` diulang, dan rate-limit aslinya dijaga
       Supabase (server). Timer hitung mundur di sini kenyamanan UI, bukan pengaman. */
    void sendLoginLink(trimmedEmail).then((result) => {
      if (result.ok) toast.success(VERIFY_COPY.resendSentNote)
      else toast.error(VERIFY_COPY.resendFailed, { description: result.error })
    })

    /* konfirmasi di halaman tampil sebentar saja: cukup untuk dibaca, tidak
       menetap sampai user bingung kenapa masih ada tulisan "baru dikirim" */
    if (resentTimerRef.current !== null) window.clearTimeout(resentTimerRef.current)
    resentTimerRef.current = window.setTimeout(() => setResent(false), RESENT_NOTE_MS)
  }

  useEffect(
    () => () => {
      if (resentTimerRef.current !== null) window.clearTimeout(resentTimerRef.current)
    },
    [],
  )

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-[480px] flex-col px-6 pt-10 pb-14 lg:max-w-[560px] lg:pt-16">
      {/* ── 1. header ─────────────────────────────────────────────────────── */}
      <header>
        <LogoWordmark className="h-6" />
        <p className="mt-6 text-[11px] font-semibold tracking-[0.16em] text-ink/40 uppercase">
          {VERIFY_COPY.eyebrow}
        </p>
        <h1 className="mt-1.5 font-display text-3xl font-semibold tracking-tight text-ink lg:text-4xl">
          {VERIFY_COPY.title}
        </h1>
      </header>

      {/* ── 2. kartu status: terkirim ATAU kedaluwarsa (dua-duanya punya jalan keluar) ── */}
      <AnimatePresence mode="wait" initial={false}>
        {linkExpired ? (
          <ExpiredCard
            key="expired"
            secondsLeft={secondsLeft}
            canResend={canResend}
            onResend={handleResend}
            reduceMotion={reduceMotion}
          />
        ) : (
          <SentCard
            key="sent"
            displayEmail={displayEmail}
            secondsLeft={secondsLeft}
            canResend={canResend}
            onResend={handleResend}
            reduceMotion={reduceMotion}
          />
        )}
      </AnimatePresence>

      {/* konfirmasi kirim ulang: teks di halaman, bukan toast saja — user yang
          menatap layar & screen reader sama-sama tahu apa yang baru terjadi */}
      <AnimatePresence initial={false}>
        {resent && (
          <motion.p
            key="resent"
            initial={reduceMotion ? false : { opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: reduceMotion ? 0 : 0.24, ease: EASE }}
            aria-live="polite"
            className="overflow-hidden text-center text-[11.5px] leading-relaxed text-forest"
          >
            {VERIFY_COPY.resendSentNote}
          </motion.p>
        )}
      </AnimatePresence>

      {/* ── 3. langkah berikutnya: user tahu harus ngapain setelah ini ─────── */}
      {!linkExpired && (
        <section className="mt-4 rounded-[1.75rem] bg-cream p-5 ring-1 ring-soil/12">
          <h2 className="font-display text-[15px] font-semibold tracking-tight text-ink">
            {VERIFY_COPY.stepsTitle}
          </h2>
          <ol className="mt-3.5 space-y-3">
            {VERIFY_COPY.steps.map((step, index) => (
              <li key={step} className="flex items-start gap-3">
                <span
                  aria-hidden
                  className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full bg-sage text-[11px] font-bold tabular-nums text-forest"
                >
                  {index + 1}
                </span>
                <p className="min-w-0 text-[12.5px] leading-relaxed text-ink/65">{step}</p>
              </li>
            ))}
          </ol>
        </section>
      )}

      {/* ── 4. masuk dengan KODE dari email (bukan tombol demo lagi) ────────── */}
      <section className="mt-4 rounded-[1.75rem] bg-sage/60 p-5 ring-1 ring-soil/12">
        <div className="flex items-start gap-3">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-cream text-forest">
            <Sparkles className="size-4" strokeWidth={2.2} aria-hidden />
          </span>
          <div className="min-w-0">
            <h2 className="font-display text-[15px] font-semibold tracking-tight text-ink">
              {VERIFY_COPY.otpTitle}
            </h2>
            <p className="mt-1 text-[12px] leading-relaxed text-ink/60">{VERIFY_COPY.otpHint}</p>
          </div>
        </div>

        <form
          className="mt-4"
          onSubmit={(event) => {
            event.preventDefault()
            void handleVerifyOtp()
          }}
        >
          <label htmlFor="otp" className="sr-only">
            {VERIFY_COPY.otpLabel}
          </label>
          <input
            id="otp"
            name="otp"
            value={otp}
            onChange={(event) => setOtp(event.target.value.replace(/\D/g, '').slice(0, 6))}
            inputMode="numeric"
            autoComplete="one-time-code"
            placeholder="000000"
            aria-label={VERIFY_COPY.otpLabel}
            className={cn(
              'h-12 w-full rounded-2xl bg-cream text-center font-mono text-[20px] tracking-[0.4em] text-ink ring-1 ring-soil/12',
              'placeholder:text-ink/25 focus-visible:ring-2 focus-visible:ring-forest focus-visible:outline-none',
            )}
          />

          <button
            type="submit"
            disabled={signingIn || otp.length < 6}
            className="group mt-3 flex h-12 w-full items-center justify-between gap-3 rounded-full bg-forest pr-1.5 pl-5 text-cream transition-colors duration-200 hover:bg-forest-soft active:scale-[0.98] motion-reduce:transition-none disabled:cursor-not-allowed disabled:opacity-60"
          >
            <span className="text-[14px] font-semibold">
              {signingIn ? SESSION_COPY.signingIn : VERIFY_COPY.otpSubmitLabel}
            </span>
            <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-cream text-forest transition-colors duration-200 group-hover:bg-mint">
              {signingIn ? (
                <LoaderCircle className="size-4 animate-spin" strokeWidth={2.4} aria-hidden />
              ) : (
                <ArrowRight className="size-4" strokeWidth={2.4} aria-hidden />
              )}
            </span>
          </button>
        </form>

        <p className="mt-3 text-[11px] leading-relaxed text-ink/45">{VERIFY_COPY.otpNote}</p>

        {/* pratinjau state kedaluwarsa supaya review tidak perlu menebak tampilannya */}
        {!linkExpired && trimmedEmail && (
          <div className="mt-3.5 border-t border-soil/12 pt-3">
            <Link
              href={buildExpiredPreviewHref(trimmedEmail)}
              className="text-[11.5px] font-semibold text-ink/60 underline underline-offset-2 hover:text-ink"
            >
              {VERIFY_COPY.expiredPreviewLabel}
            </Link>
            <p className="mt-1 text-[11px] leading-relaxed text-ink/45">
              {VERIFY_COPY.expiredPreviewHint}
            </p>
          </div>
        )}
      </section>

      {/* ── 5. kaki halaman: jalan keluar kecil ────────────────────────────── */}
      <footer className="mt-auto pt-8">
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
      </footer>
    </div>
  )
}

/**
 * Tombol "Kirim ulang" ber-hitung-mundur. Sengaja MENAMPILKAN sisa waktunya
 * (bukan tombol mati tanpa keterangan): rate-limit itu aturan kami, jadi kami
 * yang menjelaskannya — user tidak boleh menebak kenapa tombolnya diam.
 *
 * `expiredTone` = varian di atas kartu Cantelope; kontras dibalik (hitam solid
 * dengan teks cream) supaya tetap terbaca ≥ 4.5:1 di permukaan terang.
 */
function ResendButton({
  secondsLeft,
  canResend,
  onClick,
  expiredTone = false,
}: {
  secondsLeft: number
  canResend: boolean
  onClick: () => void
  expiredTone?: boolean
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!canResend}
      className={cn(
        'flex h-12 items-center justify-center gap-2 rounded-full text-[14px] font-semibold ring-1 transition-colors duration-200 motion-reduce:transition-none',
        canResend
          ? expiredTone
            ? 'bg-ink text-cream ring-transparent hover:bg-forest-soft'
            : 'bg-cream text-ink ring-soil/16 hover:bg-sage/60'
          : 'cursor-not-allowed bg-cream/70 text-ink/40 ring-soil/12',
      )}
    >
      {canResend ? (
        <RefreshCw className="size-4" strokeWidth={2.4} aria-hidden />
      ) : (
        <Clock className="size-4" strokeWidth={2.4} aria-hidden />
      )}
      {canResend ? VERIFY_COPY.resendLabel : resendCountdownLabel(secondsLeft)}
    </button>
  )
}



/**
 * Varian "tautan terkirim". Tujuan utamanya bukan memberi tahu ada email,
 * tapi memberi KEYAKINAN: alamatnya benar, pengirimnya jelas, tautannya sekali
 * pakai — lalu menyediakan dua aksi nyata (buka email / kirim ulang).
 */
function SentCard({
  displayEmail,
  secondsLeft,
  canResend,
  onResend,
  reduceMotion,
}: {
  displayEmail: string
  secondsLeft: number
  canResend: boolean
  onResend: () => void
  reduceMotion: boolean | null
}) {
  return (
    <motion.section
      initial={reduceMotion ? false : { opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={reduceMotion ? { opacity: 1 } : { opacity: 0, y: -6 }}
      transition={{ duration: reduceMotion ? 0 : 0.28, ease: EASE }}
      className="mt-6 rounded-[1.75rem] bg-cream p-5 ring-1 ring-soil/12"
    >
      <div className="flex items-start gap-3">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-sage text-forest">
          <MailCheck className="size-4" strokeWidth={2.2} aria-hidden />
        </span>
        <div className="min-w-0">
          <p className="text-[12.5px] leading-relaxed text-ink/55">{VERIFY_COPY.sentLead}</p>
          <p className="mt-0.5 font-display text-[15px] font-semibold break-all text-ink">
            {displayEmail}
          </p>
          <p className="mt-1 text-[11px] leading-relaxed text-ink/45">
            dari <span className="font-semibold text-ink/60">{MAGIC_LINK_SENDER}</span> ·{' '}
            {VERIFY_COPY.expireNote}
          </p>
        </div>
      </div>

      {/* pesan NETRAL — sengaja sama untuk email terdaftar maupun tidak, supaya
          halaman ini tidak bisa dipakai menebak keberadaan akun seseorang */}
      <p className="mt-3.5 rounded-2xl bg-sage/70 px-3.5 py-3 text-[11.5px] leading-relaxed text-ink/60 ring-1 ring-soil/8">
        {VERIFY_COPY.neutralNote}
      </p>

      <div className="mt-4 flex flex-col gap-2.5">
        {/* `mailto:` tanpa alamat = buka app email default di perangkat ini */}
        <a
          href="mailto:"
          className="flex h-12 items-center justify-center gap-2 rounded-full bg-forest text-[14px] font-semibold text-cream shadow-[0_14px_30px_-18px_rgba(69,89,78,0.85)] transition-colors duration-200 hover:bg-forest-soft active:scale-[0.98] motion-reduce:transition-none"
        >
          <Mail className="size-4" strokeWidth={2.4} aria-hidden />
          {VERIFY_COPY.openMailLabel}
        </a>
        <p className="text-center text-[11px] leading-relaxed text-ink/45">
          {VERIFY_COPY.openMailHint}
        </p>

        <ResendButton secondsLeft={secondsLeft} canResend={canResend} onClick={onResend} />

        <Link
          href={LOGIN_PATH}
          className="text-center text-[12px] font-semibold text-ink/55 underline underline-offset-2 hover:text-ink"
        >
          {VERIFY_COPY.changeEmailLabel}
        </Link>
      </div>
    </motion.section>
  )
}

/**
 * Varian "tautan kedaluwarsa / sudah dipakai". Nada kartunya sengaja
 * menenangkan (Cantelope, bukan merah — CONTEXT-WAJIB §5.3): yang dibutuhkan
 * user bukan teguran, tapi satu langkah pemulihan yang jelas.
 */
function ExpiredCard({
  secondsLeft,
  canResend,
  onResend,
  reduceMotion,
}: {
  secondsLeft: number
  canResend: boolean
  onResend: () => void
  reduceMotion: boolean | null
}) {
  return (
    <motion.section
      initial={reduceMotion ? false : { opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={reduceMotion ? { opacity: 1 } : { opacity: 0, y: -6 }}
      transition={{ duration: reduceMotion ? 0 : 0.28, ease: EASE }}
      className="mt-6 rounded-[1.75rem] bg-hud-amber/25 p-5 ring-1 ring-hud-amber/60"
    >
      <div className="flex items-start gap-3">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-cream text-ink/70">
          <TriangleAlert className="size-4" strokeWidth={2.2} aria-hidden />
        </span>
        <div className="min-w-0">
          <h2 className="font-display text-[15px] leading-snug font-semibold tracking-tight text-ink">
            {VERIFY_COPY.expiredTitle}
          </h2>
          <p className="mt-1 text-[12.5px] leading-relaxed text-ink/60">
            {VERIFY_COPY.expiredBody}
          </p>
        </div>
      </div>

      <div className="mt-4 flex flex-col gap-2.5">
        <ResendButton
          secondsLeft={secondsLeft}
          canResend={canResend}
          onClick={onResend}
          expiredTone
        />
        <Link
          href={LOGIN_PATH}
          className="text-center text-[12px] font-semibold text-ink/55 underline underline-offset-2 hover:text-ink"
        >
          {VERIFY_COPY.changeEmailLabel}
        </Link>
      </div>
    </motion.section>
  )
}

