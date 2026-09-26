'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import {
  ArrowRight,
  CircleHelp,
  Clock,
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
  VERIFY_COPY,
  buildExpiredPreviewHref,
  buildMockMagicLink,
  resendCountdownLabel,
} from '@/lib/data/auth'
import { LogoWordmark } from './logo-wordmark'

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

export function VerifyEmailScreen({ email, expired }: { email: string; expired: boolean }) {
  const reduceMotion = useReducedMotion()

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
  /** tautan demo hanya masuk akal kalau kita tahu alamat tujuannya */
  const demoLink = trimmedEmail ? buildMockMagicLink(trimmedEmail) : null

  /**
   * Satu timer hidup pada satu waktu (timeout berantai, bukan interval): lebih
   * murah dan bebas timer nyangkut saat halaman ditinggalkan.
   */
  useEffect(() => {
    if (secondsLeft === 0) return
    const id = window.setTimeout(() => setSecondsLeft((current) => Math.max(0, current - 1)), 1000)
    return () => window.clearTimeout(id)
  }, [secondsLeft])

  function handleResend() {
    if (!canResend) return
    setSecondsLeft(RESEND_SECONDS)
    setResent(true)
    /* MOCK — kirim ulang disimulasikan di klien. Di produksi panggilan
       `signInWithOtp` diulang dan rate-limit aslinya dijaga Supabase (server),
       jadi timer di sini kenyamanan UI, bukan pengaman. */
    toast.success(VERIFY_COPY.resendSentNote)

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
        {expired ? (
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
      {!expired && (
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

      {/* ── 4. kartu demo: alur bisa diklik sampai ujung, tapi berlabel jujur ── */}
      <section className="mt-4 rounded-[1.75rem] bg-sage/60 p-5 ring-1 ring-soil/12">
        <div className="flex items-start gap-3">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-cream text-forest">
            <Sparkles className="size-4" strokeWidth={2.2} aria-hidden />
          </span>
          <div className="min-w-0">
            <h2 className="font-display text-[15px] font-semibold tracking-tight text-ink">
              {VERIFY_COPY.demoTitle}
            </h2>
            <p className="mt-1 text-[12px] leading-relaxed text-ink/60">
              {VERIFY_COPY.demoHint}
            </p>
          </div>
        </div>

        <Link
          href="/"
          className="group mt-4 flex h-12 items-center justify-between gap-3 rounded-full bg-forest pr-1.5 pl-5 text-cream transition-colors duration-200 hover:bg-forest-soft active:scale-[0.98] motion-reduce:transition-none"
        >
          <span className="text-[14px] font-semibold">{VERIFY_COPY.demoLabel}</span>
          <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-cream text-forest transition-colors duration-200 group-hover:bg-mint">
            <ArrowRight className="size-4" strokeWidth={2.4} aria-hidden />
          </span>
        </Link>

        {/* tautan yang "ada di email" — ditampilkan supaya bisa diaudit, bukan buat diklik */}
        {demoLink && (
          <p className="mt-3.5 rounded-2xl bg-cream px-3.5 py-3 ring-1 ring-soil/8">
            <span className="block text-[11px] font-semibold text-ink/55">
              {VERIFY_COPY.demoLinkLabel}
            </span>
            <span className="mt-1 block font-mono text-[11px] leading-relaxed break-all text-ink/50">
              {demoLink}
            </span>
          </p>
        )}

        {/* pratinjau state kedaluwarsa supaya review tidak perlu menebak tampilannya */}
        {!expired && trimmedEmail && (
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

