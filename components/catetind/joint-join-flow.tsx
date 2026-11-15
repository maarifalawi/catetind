'use client'

import { useEffect, useId, useRef, useState, type FormEvent, type ReactNode } from 'react'
import { ArrowLeft, ArrowRight, HeartHandshake, KeyRound, Loader2, Plus } from 'lucide-react'
import { toast } from 'sonner'
import { JOIN_CODE_COPY } from '@/lib/data/joint-invite'
import { joinJointPocketByCode } from '@/lib/money/joint-store'
import { browserSupabase } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'

/* ── DUA PINTU KE DOMPET BERSAMA: BUAT ATAU GABUNG ───────────────────────────
   Halaman `/joint` dulu hanya menawarkan satu jalan: "Buat Dompet & Ajak
   Pasangan". Orang yang DIUNDANG (sisi B) karena itu tidak punya tempat
   memasukkan kode 6 karakter di dalam aplikasi — satu-satunya jalan adalah
   membuka tautan `/join/<kode>` dari chat. Kalau yang dikirim cuma kodenya,
   akun kedua buntu dan mengira fiturnya tidak ada.

   Dua komponen di bawah menutupnya tanpa jalur simulasi:

     · `JointEntryChoice` — pilihan peran (membuat / bergabung);
     · `JointJoinCodeForm` — input kode yang memanggil
       `joinJointPocketByCode()` → RPC `catetind_accept_invite` di server.
       Hasilnya dibedakan apa adanya: bergabung, sudah anggota, atau kode milik
       sendiri (tidak ada yang ditulis untuk kasus terakhir).

   Semua copy tinggal di `lib/data/joint-invite.ts` (`JOIN_CODE_COPY`).
   ────────────────────────────────────────────────────────────────────────── */

export function JointEntryChoice({
  onCreate,
  onJoin,
}: {
  /** lanjut ke form "Buat dompet baru" (nama dompet + kode undangan) */
  onCreate: () => void
  /** lanjut ke form "Gabung pakai kode" */
  onJoin: () => void
}) {
  return (
    <div className="mx-auto flex w-full max-w-[420px] flex-col py-6">
      <div className="text-center">
        <span
          aria-hidden
          className="inline-flex size-12 items-center justify-center rounded-2xl bg-mint/40 text-forest ring-1 ring-hud-sage/45"
        >
          <HeartHandshake className="size-5" strokeWidth={2.2} />
        </span>
        <p className="mt-3 text-[11px] font-medium uppercase tracking-[0.16em] text-forest-muted">
          {JOIN_CODE_COPY.choiceEyebrow}
        </p>
        <h1 className="mt-1 font-display text-[24px] font-semibold leading-tight tracking-tight text-forest">
          {JOIN_CODE_COPY.choiceTitle}
        </h1>
        <p className="mt-2 text-[13.5px] leading-relaxed text-forest-muted">
          {JOIN_CODE_COPY.choiceBody}
        </p>
      </div>

      <div className="mt-6 grid gap-3">
        <ChoiceCard
          icon={<Plus className="size-4" strokeWidth={2.4} />}
          title={JOIN_CODE_COPY.createTitle}
          body={JOIN_CODE_COPY.createBody}
          cta={JOIN_CODE_COPY.createCta}
          onClick={onCreate}
          tone="primary"
        />
        <ChoiceCard
          icon={<KeyRound className="size-4" strokeWidth={2.4} />}
          title={JOIN_CODE_COPY.joinTitle}
          body={JOIN_CODE_COPY.joinBody}
          cta={JOIN_CODE_COPY.joinCta}
          onClick={onJoin}
          tone="secondary"
        />
      </div>
    </div>
  )
}

/** satu kartu pilihan — seluruh kartu adalah tap target, bukan hanya teks CTA */
function ChoiceCard({
  icon,
  title,
  body,
  cta,
  onClick,
  tone,
}: {
  icon: ReactNode
  title: string
  body: string
  cta: string
  onClick: () => void
  tone: 'primary' | 'secondary'
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'group flex w-full flex-col rounded-[1.5rem] px-5 py-4 text-left ring-1 transition-colors duration-200 active:scale-[0.995]',
        tone === 'primary'
          ? 'bg-forest text-mint ring-forest/20 shadow-[0_18px_34px_-24px_rgba(0,0,0,0.9)]'
          : 'bg-cream text-forest ring-soil/16 hover:bg-sage/60',
      )}
    >
      <span className="flex items-center gap-2.5">
        <span
          className={cn(
            'flex size-8 items-center justify-center rounded-full',
            tone === 'primary' ? 'bg-cream/15 text-mint' : 'bg-mint/50 text-forest',
          )}
        >
          {icon}
        </span>
        <span className="text-[15.5px] font-semibold tracking-tight">{title}</span>
      </span>
      <span
        className={cn(
          'mt-2 text-[13px] leading-relaxed',
          tone === 'primary' ? 'text-mint' : 'text-forest-muted',
        )}
      >
        {body}
      </span>
      <span
        className={cn(
          'mt-3 inline-flex items-center gap-1.5 text-[13px] font-medium',
          tone === 'primary' ? 'text-mint' : 'text-forest-soft',
        )}
      >
        {cta}
        <ArrowRight
          className="size-3.5 transition-transform duration-200 group-hover:translate-x-0.5"
          strokeWidth={2.6}
          aria-hidden
        />
      </span>
    </button>
  )
}

/**
 * Form "Gabung pakai kode" — sisi B di dalam aplikasi.
 *
 * Yang benar-benar terjadi saat tombol ditekan: keanggotaan ditulis SERVER
 * (`joint_members`) lalu kantong dibaca ulang. Karena itu layar ini tidak punya
 * jalur "berhasil" buatan: setiap kegagalan menampilkan alasan dari server, dan
 * kode milik sendiri tidak pernah dianggap gabung.
 */
export function JointJoinCodeForm({
  onBack,
  onJoined,
}: {
  /** kembali ke pilihan "Buat / Gabung" */
  onBack: () => void
  /** keanggotaan SUDAH ditulis di server — halaman boleh menampilkan kantongnya */
  onJoined: () => void
}) {
  const [code, setCode] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  /** kode yang dimasukkan ternyata kode MILIK SENDIRI (bukan anggota baru) */
  const [ownCode, setOwnCode] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const inputId = useId()
  const errorId = `${inputId}-error`
  /**
   * Email akun yang SEDANG login.
   *
   * Satu browser hanya punya satu sesi Supabase: dua tab dengan dua akun
   * berbeda tidak didukung (`lib/account-scope.ts`). Saat kode yang dimasukkan
   * ternyata milik akun ini sendiri, menampilkan alamat emailnya membuat
   * penyebabnya langsung terlihat — bukan tuduhan "server salah".
   */
  const [signedInEmail, setSignedInEmail] = useState<string | null>(null)

  useEffect(() => {
    const client = browserSupabase()
    if (!client) return
    let alive = true
    void client.auth.getSession().then(({ data }) => {
      if (alive) setSignedInEmail(data.session?.user.email ?? null)
    })
    return () => {
      alive = false
    }
  }, [])

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (busy) return

    const normalized = code.trim().toUpperCase()
    if (normalized.length !== 6) {
      setOwnCode(false)
      setError(JOIN_CODE_COPY.lengthError)
      inputRef.current?.focus()
      return
    }

    setBusy(true)
    setError(null)
    setOwnCode(false)

    const result = await joinJointPocketByCode(normalized)
    setBusy(false)

    if (!result.ok) {
      setError(result.error ?? 'Undangan tidak bisa diproses. Coba lagi sebentar ya.')
      return
    }

    /* kode milik sendiri: tidak ada baris keanggotaan yang ditulis, jadi jangan
       tampilkan seolah berhasil gabung */
    if (result.outcome === 'creator') {
      setOwnCode(true)
      return
    }

    toast.success(
      result.outcome === 'member'
        ? JOIN_CODE_COPY.memberToast
        : JOIN_CODE_COPY.joinedToast(result.walletName ?? 'dompet bersama'),
    )
    setCode('')
    onJoined()
  }

  return (
    <div className="mx-auto flex w-full max-w-[420px] flex-col py-6">
      <button
        type="button"
        onClick={onBack}
        disabled={busy}
        className="inline-flex w-fit items-center gap-1.5 text-[12.5px] font-medium text-forest-muted transition-colors hover:text-forest disabled:opacity-50"
      >
        <ArrowLeft className="size-3.5" strokeWidth={2.4} aria-hidden />
        {JOIN_CODE_COPY.back}
      </button>

      <div className="mt-4 text-center">
        <span
          aria-hidden
          className="inline-flex size-12 items-center justify-center rounded-2xl bg-mint/40 text-forest ring-1 ring-hud-sage/45"
        >
          <KeyRound className="size-5" strokeWidth={2.2} />
        </span>
        <h1 className="mt-3 font-display text-[24px] font-semibold leading-tight tracking-tight text-forest">
          {JOIN_CODE_COPY.formTitle}
        </h1>
      </div>

      <form onSubmit={handleSubmit} className="mt-6" noValidate>
        <label
          htmlFor={inputId}
          className="block text-[12px] font-medium uppercase tracking-[0.12em] text-forest-muted"
        >
          {JOIN_CODE_COPY.inputLabel}
        </label>
        <input
          ref={inputRef}
          id={inputId}
          name="kode-undangan"
          value={code}
          onChange={(event) => {
            /* kode kanon: huruf besar & alfanumerik saja — spasi/typo dari
               tempel WhatsApp tidak membuat kodenya ditolak server */
            const next = event.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6)
            setCode(next)
            setError(null)
            setOwnCode(false)
          }}
          autoComplete="off"
          autoCapitalize="characters"
          spellCheck={false}
          inputMode="text"
          placeholder={JOIN_CODE_COPY.inputPlaceholder}
          aria-invalid={error ? true : undefined}
          aria-describedby={error || ownCode ? errorId : undefined}
          className={cn(
            'mt-2 w-full rounded-2xl bg-cream px-4 py-3.5 text-center font-mono text-[26px] font-medium tracking-[0.32em] text-forest outline-none ring-1 transition-shadow placeholder:text-[15px] placeholder:font-sans placeholder:tracking-normal placeholder:text-forest-muted',
            error || ownCode
              ? 'ring-2 ring-plum/45'
              : 'ring-soil/16 focus:ring-2 focus:ring-forest/35',
          )}
        />

        {(error || ownCode) && (
          <p
            id={errorId}
            role={error ? 'alert' : undefined}
            className="mt-2 rounded-2xl bg-plum/10 px-3.5 py-2.5 text-[12.5px] leading-relaxed text-plum ring-1 ring-plum/20"
          >
            {ownCode ? (
              <>
                <span className="block font-medium">{JOIN_CODE_COPY.ownCodeTitle}</span>
                {JOIN_CODE_COPY.ownCodeBody}
                {signedInEmail ? (
                  <span className="mt-1 block text-[11.5px] opacity-80">
                    {JOIN_CODE_COPY.ownCodeAccount(signedInEmail)}
                  </span>
                ) : null}
              </>
            ) : (
              error
            )}
          </p>
        )}

        <button
          type="submit"
          disabled={busy}
          className={cn(
            'mt-4 inline-flex h-12 w-full items-center justify-center gap-2 rounded-2xl text-[15px] font-medium transition-colors duration-200',
            busy
              ? 'cursor-wait bg-forest/70 text-mint'
              : 'bg-forest text-mint shadow-[0_16px_32px_-20px_rgba(0,0,0,0.95)] hover:bg-forest-soft active:scale-[0.99]',
          )}
        >
          {busy ? (
            <>
              <Loader2 className="size-4 animate-spin" strokeWidth={2.6} aria-hidden />
              {JOIN_CODE_COPY.submitting}
            </>
          ) : (
            <>
              {JOIN_CODE_COPY.submit}
              <ArrowRight className="size-4" strokeWidth={2.6} aria-hidden />
            </>
          )}
        </button>
      </form>
    </div>
  )
}

