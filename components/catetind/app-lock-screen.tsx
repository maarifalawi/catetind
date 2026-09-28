'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Delete, Fingerprint, KeyRound, LoaderCircle, Lock } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { LOCK_SCREEN_COPY, PIN_LENGTH } from '@/lib/data/app-lock'
import { LOGIN_PATH, SESSION_COPY } from '@/lib/data/auth'
import { ConfirmDialog, DialogButton } from './settings-dialog'
import { useAppLock } from './app-lock-provider'

/* ── LAYAR KUNCI PERANGKAT (paket 39) ────────────────────────────────────────
   Layar ini MENGGANTIKAN seluruh halaman app saat PIN aktif & belum dibuka
   (`AppLockProvider`), jadi tidak ada nominal yang bisa dilihat lewat app
   switcher, refresh, atau HP yang dipinjam orang lain.

   Urutan visualnya sengaja: judul di atas, keypad di BAWAH (zona ibu jari —
   CONTEXT-WAJIB §5.5). Verifikasi berjalan otomatis begitu 6 angka masuk, jadi
   total aksi = 6 tap.

   Tiga jalan keluar selalu tersedia supaya tidak ada layar buntu:
     • PIN (jalur normal),
     • sensor perangkat (kalau sudah dinyalakan & perangkatnya mendukung),
     • "Lupa PIN" → sesi diakhiri + masuk ulang lewat tautan email.
   ────────────────────────────────────────────────────────────────────────── */

const KEYPAD = ['1', '2', '3', '4', '5', '6', '7', '8', '9'] as const

export function AppLockScreen() {
  const {
    unlock,
    attemptsLeftCount,
    lockoutCountdown,
    biometricAvailable,
    biometricEnabled,
    unlockWithBiometric,
    forgotPin,
  } = useAppLock()
  const router = useRouter()

  const [pin, setPin] = useState('')
  const [failed, setFailed] = useState(false)
  const [busy, setBusy] = useState(false)
  const [biometricBusy, setBiometricBusy] = useState(false)
  const [forgotOpen, setForgotOpen] = useState(false)
  const [forgotBusy, setForgotBusy] = useState(false)

  const locked = lockoutCountdown !== null

  /* verifikasi otomatis saat angka terakhir masuk — tanpa tombol "Masuk" */
  useEffect(() => {
    if (pin.length !== PIN_LENGTH || locked) return
    let alive = true
    setBusy(true)
    unlock(pin).then((ok) => {
      if (!alive) return
      setBusy(false)
      if (!ok) {
        setPin('')
        setFailed(true)
      }
    })
    return () => {
      alive = false
    }
  }, [pin, locked, unlock])

  function press(digit: string) {
    if (busy || locked) return
    setFailed(false)
    setPin((current) => (current.length >= PIN_LENGTH ? current : current + digit))
  }

  function backspace() {
    if (busy || locked) return
    setFailed(false)
    setPin((current) => current.slice(0, -1))
  }

  async function handleBiometric() {
    if (biometricBusy || busy) return
    setBiometricBusy(true)
    const ok = await unlockWithBiometric()
    setBiometricBusy(false)
    if (!ok) setFailed(true)
  }

  /**
   * "Lupa PIN" — akhiri sesi & buang PIN perangkat.
   *
   * Urutan yang dipakai: `router.replace('/login')` DULU, baru sesi & PIN-nya
   * dibuang. Alasannya (`/login` termasuk route publik): begitu gerbangnya
   * dilepas, yang langsung terlihat adalah halaman masuk — bukan dashboard yang
   * sempat berkedip. Verifikasi email ulang jadi syarat masuk lagi, jadi ini
   * bukan pintu belakang: yang lupa PIN tetap harus membuktikan dirinya.
   */
  async function handleForgot() {
    if (forgotBusy) return
    setForgotBusy(true)
    router.replace(LOGIN_PATH)
    await forgotPin()
    setForgotBusy(false)
    setForgotOpen(false)
    toast.success(SESSION_COPY.signedOutToast, {
      description: LOCK_SCREEN_COPY.forgotBody,
    })
  }

  const filled = Math.min(pin.length, PIN_LENGTH)


  return (
    <div className="fixed inset-0 z-[95] flex flex-col overflow-y-auto bg-canvas px-6 py-8">
      <div className="mx-auto flex w-full max-w-[420px] flex-1 flex-col">
        {/* ── header: judul jelas, bukan teka-teki ─────────────────────────── */}
        <header className="text-center">
          <span className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-forest text-mint">
            <Lock className="size-5" strokeWidth={2.2} aria-hidden />
          </span>
          <p className="mt-4 text-[11px] font-semibold tracking-[0.16em] text-ink/40 uppercase">
            {LOCK_SCREEN_COPY.eyebrow}
          </p>
          <h1 className="mt-1.5 font-display text-2xl font-semibold tracking-tight text-ink">
            {LOCK_SCREEN_COPY.title}
          </h1>
          <p className="mt-1.5 text-[12.5px] leading-relaxed text-ink/55">
            {LOCK_SCREEN_COPY.subtitle(PIN_LENGTH)}
          </p>
        </header>

        {/* ── titik PIN + pesan status (live region untuk pembaca layar) ───── */}
        <div className="mt-8 flex flex-col items-center">
          <div
            className="flex gap-3"
            role="img"
            aria-label={LOCK_SCREEN_COPY.progressAria(filled, PIN_LENGTH)}
          >
            {Array.from({ length: PIN_LENGTH }).map((_, index) => (
              <span
                key={index}
                className={cn(
                  'size-3.5 rounded-full transition-colors duration-150 motion-reduce:transition-none',
                  index < filled ? 'bg-forest' : 'bg-soil/15',
                )}
              />
            ))}
          </div>

          <p
            aria-live="polite"
            className="mt-4 min-h-[3rem] text-center text-[12px] leading-relaxed"
          >
            {locked ? (
              <span className="font-semibold text-ink/70">
                {LOCK_SCREEN_COPY.lockoutTitle}{' '}
                <span className="tabular-nums">{lockoutCountdown}</span>
                <span className="mt-1 block font-normal text-ink/55">
                  {LOCK_SCREEN_COPY.lockoutBody(lockoutCountdown ?? '')}
                </span>
              </span>
            ) : failed ? (
              <span className="text-plum">{LOCK_SCREEN_COPY.wrongPin(attemptsLeftCount)}</span>
            ) : (
              <span className="text-ink/40">{LOCK_SCREEN_COPY.deviceOnlyNote}</span>
            )}
          </p>
        </div>

        <div className="flex-1" />


        {/* ── zona ibu jari: sensor (kalau ada) + keypad + lupa PIN ────────── */}
        <div className="flex flex-col gap-3">
          {biometricAvailable && biometricEnabled && (
            <div>
              <button
                type="button"
                onClick={handleBiometric}
                disabled={locked || biometricBusy}
                className={cn(
                  'flex h-12 w-full items-center justify-center gap-2 rounded-2xl text-[13.5px] font-semibold transition-colors duration-200 motion-reduce:transition-none',
                  locked || biometricBusy
                    ? 'cursor-not-allowed bg-cream text-ink/35 ring-1 ring-soil/12'
                    : 'bg-sage text-forest hover:bg-mint/40',
                )}
              >
                {biometricBusy ? (
                  <LoaderCircle className="size-4 animate-spin" strokeWidth={2.4} aria-hidden />
                ) : (
                  <Fingerprint className="size-4" strokeWidth={2.4} aria-hidden />
                )}
                {biometricBusy ? LOCK_SCREEN_COPY.biometricPending : LOCK_SCREEN_COPY.biometricCta}
              </button>
              <p className="mt-1.5 text-center text-[10.5px] leading-relaxed text-ink/40">
                {LOCK_SCREEN_COPY.biometricNote}
              </p>
            </div>
          )}

          <div
            role="group"
            aria-label={LOCK_SCREEN_COPY.keypadAria}
            className="grid grid-cols-3 gap-2.5"
          >
            {KEYPAD.map((digit) => (
              <button
                key={digit}
                type="button"
                onClick={() => press(digit)}
                disabled={busy || locked}
                className="h-14 rounded-2xl bg-cream font-display text-xl font-semibold tabular-nums text-ink ring-1 ring-soil/12 transition-colors duration-150 hover:bg-sage/60 focus-visible:ring-2 focus-visible:ring-forest/40 focus-visible:outline-none disabled:opacity-45 motion-reduce:transition-none"
              >
                {digit}
              </button>
            ))}
            {/* sel kiri bawah sengaja kosong: tidak ada aksi yang bisa disalahketuk */}
            <span aria-hidden className="h-14" />
            <button
              type="button"
              onClick={() => press('0')}
              disabled={busy || locked}
              className="h-14 rounded-2xl bg-cream font-display text-xl font-semibold tabular-nums text-ink ring-1 ring-soil/12 transition-colors duration-150 hover:bg-sage/60 focus-visible:ring-2 focus-visible:ring-forest/40 focus-visible:outline-none disabled:opacity-45 motion-reduce:transition-none"
            >
              0
            </button>
            <button
              type="button"
              onClick={backspace}
              disabled={busy || locked || pin.length === 0}
              aria-label={LOCK_SCREEN_COPY.backspaceAria}
              className="flex h-14 items-center justify-center rounded-2xl bg-sage/60 text-ink/70 ring-1 ring-soil/12 transition-colors duration-150 hover:bg-sage focus-visible:ring-2 focus-visible:ring-forest/40 focus-visible:outline-none disabled:opacity-40 motion-reduce:transition-none"
            >
              <Delete className="size-5" strokeWidth={2.2} aria-hidden />
            </button>
          </div>

          <button
            type="button"
            onClick={() => setForgotOpen(true)}
            className="mx-auto mt-1 inline-flex items-center gap-1.5 text-[12px] font-semibold text-ink/55 underline underline-offset-4 transition-colors hover:text-ink"
          >
            <KeyRound className="size-3.5" strokeWidth={2.4} aria-hidden />
            {LOCK_SCREEN_COPY.forgotLink}
          </button>
        </div>
      </div>

      {/* dialog "Lupa PIN": menjelaskan konsekuensinya sebelum menekan apa pun */}
      <ConfirmDialog
        id="lock-forgot"
        open={forgotOpen}
        onClose={() => setForgotOpen(false)}
        icon={KeyRound}
        tone="danger"
        title={LOCK_SCREEN_COPY.forgotTitle}
        body={LOCK_SCREEN_COPY.forgotBody}
        actions={
          <>
            <DialogButton tone="danger" disabled={forgotBusy} onClick={handleForgot}>
              {forgotBusy ? 'Mengakhiri sesi…' : LOCK_SCREEN_COPY.forgotCta}
            </DialogButton>
            <DialogButton tone="neutral" onClick={() => setForgotOpen(false)}>
              {LOCK_SCREEN_COPY.forgotCancel}
            </DialogButton>
          </>
        }
      />
    </div>
  )
}
