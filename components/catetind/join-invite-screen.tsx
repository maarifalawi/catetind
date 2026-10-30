'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { ArrowRight, Check, Copy, HeartHandshake, Loader2, Lock, ShieldCheck } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { buildLoginHref } from '@/lib/data/auth'
import { INITIAL_JOINT_WALLET } from '@/lib/data/joint'
import {
  ASK_AGAIN_COPY,
  INVALID_INVITE_COPY,
  JOIN_CLAIM_COPY,
  JOIN_COPY,
  JOIN_DEMO_COPY,
  JOIN_SUCCESS_COPY,
  askAgainLead,
  buildAskAgainMessage,
  buildJoinClaimHref,
  resolveRemoteInviteView,
  type InvalidInvite,
  type ResolvedInvite,
  type ValidInvite,
} from '@/lib/data/joint-invite'
import { consumeInvite, markInviteFromServer, resolveInvite } from '@/lib/invite-store'
import { refreshRemoteJoint } from '@/lib/money/joint-store'
import { browserUserId } from '@/lib/supabase/client'
import { hasSupabaseConfig } from '@/lib/supabase/config'
import {
  acceptInviteRemote,
  readJoinStateRemote,
  resolveInviteRemote,
} from '@/lib/supabase/invite-remote'
import { LogoWordmark } from './logo-wordmark'

/* -- Joint Wallet Invite Landing (/join/[code]) - inventaris #7 - PRD 900-932 --
   Sisi B dari KEY FLOW #2: orang yang membuka halaman ini BUKAN user kita, tapi
   pasangan/teman yang diminta mengelola uang bersama. Menolak terasa seperti
   menolak orangnya, jadi empat aturan mengikat layout ini:

     1. HANGAT & PERSONAL - nama pengundang tampil besar di atas headline,
        bukan "Anda diundang ke wallet".
     2. MANFAAT DALAM 1 KALIMAT -3 - bukan daftar fitur. PRD 877 (BIMA):
        momennya harus terasa seperti milestone hubungan, bukan administrasi.
     3. PRIVASI MENDAHULUI TOMBOL (2D.1) - kartu jaminan privasi ada di alur
        scroll SEBELUM CTA, bukan catatan kaki.
     4. TIDAK MEMAKSA - selalu ada "Nanti aja"; nol hitungan mundur, nol
        pengingat. Urgensi buatan dilarang PRD 4507.

   Yang sengaja TIDAK ditampilkan: angka/transaksi pengundang (PRD 921 & 2D.1 -
   data historis tidak boleh saling bocor).

   PAKET 100 - alur "gabung" yang benar-benar menulis data:
     - status undangan dibaca dari SERVER (prop `initialInvite`, dihitung
       `app/join/[code]/page.tsx`), bukan dari localStorage pengundang;
     - tombol tanpa sesi membawa `?next=/join/<kode>?terima=1`, jadi setelah
       masuk user kembali ke sini dan keanggotaan ditulis otomatis (PRD 917);
     - tombol dengan sesi memanggil RPC `catetind_accept_invite`, dan HASILNYA
       dibedakan: bergabung, sudah anggota, atau pemilik kode yang melihat
       pratinjau (kode tidak dibakar untuk dua keadaan terakhir);
     - kegagalan server ditampilkan apa adanya - tidak ada lagi layar "berhasil"
       padahal tidak ada baris keanggotaan yang ditulis.

   Halaman PUBLIK: `PhoneStage plain` di route, tanpa sidebar, dan
   `MobileBottomNav` + AI chat widget menyembunyikan diri di prefix `/join`.
   Semua copy di `lib/data/joint-invite.ts`.
   -------------------------------------------------------------------------- */

export function JoinInviteScreen({
  code,
  initialInvite,
  autoJoin = false,
}: {
  code: string
  /**
   * Status dari SERVER (dihitung `app/join/[code]/page.tsx`). Dipakai sebagai
   * nilai awal supaya render pertama identik dengan HTML server; setelah mount
   * layar ini membaca status terbaru dari server lagi.
   */
  initialInvite: ResolvedInvite
  /**
   * true = user baru KEMBALI DARI `/login` (`?terima=1`, lihat
   * `buildJoinClaimHref`). Hanya di keadaan inilah keanggotaan ditulis otomatis.
   */
  autoJoin?: boolean
}) {
  const [invite, setInvite] = useState<ResolvedInvite>(initialInvite)
  /** keanggotaan BENAR-BENAR tercatat - di server, atau jalur demo lokal */
  const [joined, setJoined] = useState(false)
  const [joinedWalletName, setJoinedWalletName] = useState<string | null>(null)
  const [signedIn, setSignedIn] = useState(false)
  const [claiming, setClaiming] = useState(false)
  /** pengundang membuka tautannya sendiri -> kode TIDAK boleh dibakar */
  const [preview, setPreview] = useState(false)
  /** backend Supabase ada di build ini? kalau tidak -> tombol demo lokal */
  const [remoteReady] = useState(hasSupabaseConfig)
  const alive = useRef(true)
  const inFlight = useRef(false)
  /**
   * "Gabung Dompet Ini" - satu jalur nyata, tiga hasil yang dibedakan:
   *
   *   1. `joined`/`member` -> keanggotaan ADA di `joint_members`;
   *   2. `creator`        -> yang menekan adalah PEMBUAT kode (pratinjau) dan
   *                          server sengaja tidak membakar kode untuk ini;
   *   3. gagal            -> alasan dari server ditampilkan apa adanya, lalu
   *                          status undangan dibaca ulang (bisa jadi sudah
   *                          dipakai / kedaluwarsa).
   *
   * Jalur lokal (build tanpa backend) tetap ada supaya kode demo repo bisa
   * ditelusuri sampai ujung - dan hanya berhasil kalau `consumeInvite` memang
   * mengembalikan record (sekali pakai tetap ditegakkan).
   */
  const claim = useCallback(async () => {
    if (inFlight.current) return
    inFlight.current = true
    setClaiming(true)
    try {
      const result = await acceptInviteRemote(code)
      if (!alive.current) return

      if (result.ok && result.outcome === 'creator') {
        setPreview(true)
        toast.info(JOIN_CLAIM_COPY.previewBadge, { description: JOIN_CLAIM_COPY.previewNote })
        return
      }

      if (result.ok) {
        const remote = await resolveInviteRemote(code)
        if (!alive.current) return
        if (remote) setInvite(resolveRemoteInviteView(remote))
        setJoinedWalletName(result.walletName)
        setJoined(true)
        /* store kantong bersama ikut disegarkan: /joint langsung memakai id
           dompet uuid dari server, bukan id kanon perangkat */
        void refreshRemoteJoint()
        return
      }

      if (!remoteReady) {
        const local = consumeInvite(code, 'anggota')
        if (local) {
          setInvite(resolveInvite(code))
          setJoined(true)
          return
        }
      }

      toast.error(JOIN_CLAIM_COPY.failedTitle, {
        description: result.error ?? 'Coba lagi sebentar ya.',
      })
      const remote = await resolveInviteRemote(code)
      if (alive.current) {
        setInvite(remote ? resolveRemoteInviteView(remote) : resolveInvite(code))
      }
    } finally {
      if (alive.current) setClaiming(false)
      inFlight.current = false
    }
  }, [code, remoteReady])
  /* Setelah mount: SERVER dulu (status + nama pengundang + masa berlaku), lalu
     store perangkat sebagai cadangan untuk kode demo. Setelah itu tanyakan
     hubungan pemanggil dengan dompet ini - tanpa membakar kode:
       - pembuat kode  -> mode pratinjau (kode tetap hidup untuk pasangannya);
       - sudah anggota -> layar sukses (refresh setelah gabung tidak lagi
                          menampilkan "Tautan ini sudah dipakai");
       - kembali dari login (`autoJoin`) -> tulis keanggotaan SEKALI. */
  useEffect(() => {
    alive.current = true
    void (async () => {
      const [userId, remote] = await Promise.all([browserUserId(), resolveInviteRemote(code)])
      if (!alive.current) return

      if (remote) {
        if (remote.status === 'used' || remote.status === 'expired') {
          markInviteFromServer(code, remote.status)
        }
        setInvite(resolveRemoteInviteView(remote))
      } else {
        setInvite(resolveInvite(code))
      }

      setSignedIn(Boolean(userId))
      if (!userId) return

      const state = await readJoinStateRemote(code)
      if (!alive.current) return

      /* urutan penting: PEMBUAT kode juga punya baris keanggotaan owner, jadi
         `isCreator` harus diperiksa lebih dulu daripada `isMember` */
      if (state?.isCreator) {
        setPreview(true)
        return
      }
      if (state?.isMember) {
        setJoinedWalletName(remote?.walletName ?? null)
        setJoined(true)
        return
      }
      if (autoJoin && remote?.status === 'valid') await claim()
    })()
    return () => {
      alive.current = false
    }
  }, [code, autoJoin, claim])

  if (joined) {
    return (
      <JoinedView
        walletName={joinedWalletName ?? invite.walletName ?? INITIAL_JOINT_WALLET.name}
        onRestart={() => setJoined(false)}
      />
    )
  }

  /* auto-join sedang berjalan: jangan tawarkan tombol yang bisa ditekan dua kali */
  if (claiming && autoJoin) return <ClaimingView />

  if (invite.status !== 'valid') return <InvalidInviteView invite={invite} />

  return (
    <ValidInviteView
      invite={invite}
      code={code}
      signedIn={signedIn}
      demo={!remoteReady}
      claiming={claiming}
      preview={preview}
      onClaim={claim}
    />
  )
}

/* CTA sticky - satu kelas untuk link maupun button supaya bentuknya tidak
   berbeda antar keadaan (belum masuk / sudah masuk / pratinjau pengundang). */
const CTA_CLASS =
  'group flex h-14 w-full items-center justify-between gap-3 rounded-full bg-forest pr-2 pl-6 text-cream shadow-[0_16px_34px_-18px_rgba(0,0,0,0.85)] transition-colors duration-200 hover:bg-forest-soft active:scale-[0.98] motion-reduce:transition-none'
const CTA_ICON_CLASS =
  'flex size-10 shrink-0 items-center justify-center rounded-full bg-cream text-forest transition-colors duration-200 group-hover:bg-mint'

/* STATE VALID: undangan yang masih bisa dipakai.
   Urutan visualnya = urutan psikologis: siapa yang mengundang -> apa yang
   didapat -> jaminan privasi -> baru tombol. CTA-nya sticky di zona ibu jari
   (CONTEXT-WAJIB 5.5), dan "Nanti aja" selalu tersedia di bawahnya. */
function ValidInviteView({
  invite,
  code,
  signedIn,
  demo,
  claiming,
  preview,
  onClaim,
}: {
  invite: ValidInvite
  code: string
  /** sesi Supabase ada di perangkat ini */
  signedIn: boolean
  /** build tanpa backend: tombol menjalankan simulasi lokal */
  demo: boolean
  /** RPC gabung sedang berjalan */
  claiming: boolean
  /** pengundang sedang memeriksa pratinjaunya sendiri */
  preview: boolean
  onClaim: () => void
}) {
  /* nama pengundang dari server; `null` = belum terbaca -> sebutan netral,
     bukan nama karangan ("Jon"). */
  const inviter = invite.inviterName
  const inviterLabel = inviter ?? 'Pasanganmu'
  const ctaHint = preview
    ? JOIN_CLAIM_COPY.previewNote
    : demo
      ? JOIN_DEMO_COPY.body
      : signedIn
        ? JOIN_CLAIM_COPY.signedInHint
        : JOIN_COPY.ctaJoinHint

  return (
    <>
      <div className="mx-auto w-full max-w-[480px] px-6 pt-10 pb-56 lg:max-w-[560px] lg:pt-16 lg:pb-52">
        {/* 1. header personal: pengundang dulu, baru aplikasinya */}
        <header>
          <LogoWordmark className="h-6" />
          <p className="mt-6 text-[12px] font-medium tracking-[0.16em] text-forest/40 uppercase">
            {JOIN_COPY.eyebrow}
          </p>

          <div className="mt-4 flex items-center gap-3.5">
            <span
              aria-hidden
              className="flex size-14 shrink-0 items-center justify-center rounded-2xl bg-hud-sage/25 text-forest ring-1 ring-hud-sage/50"
            >
              <ShieldCheck className="size-6" strokeWidth={2.2} />
            </span>
            <div className="min-w-0">
              <p className="font-display text-xl font-medium tracking-tight text-forest">{inviterLabel}</p>
              <p className="mt-0.5 text-[12.5px] leading-relaxed text-forest/50">
                {JOIN_COPY.walletLabel}:{' '}
                <b className="font-medium text-forest/70">{invite.walletName}</b>
              </p>
            </div>
          </div>

          <h1 className="mt-4 font-display text-3xl font-semibold tracking-tight text-forest lg:text-4xl">
            {JOIN_COPY.headline(inviter)}
          </h1>
          <p className="mt-2.5 text-[14px] leading-relaxed text-forest/55">{JOIN_COPY.subtitle}</p>
          <details className="mt-2">
            <summary className="w-fit cursor-pointer text-[13.5px] font-medium text-forest/65 underline decoration-dotted underline-offset-4 marker:content-none hover:text-forest">
              {JOIN_COPY.learnMore}
            </summary>
            <p className="mt-2 text-[13.5px] leading-relaxed text-forest/55">
              {JOIN_COPY.learnMoreLead}
            </p>
            <ul className="mt-2 space-y-1.5">
              {JOIN_COPY.learnMoreBullets.map((bullet) => (
                <li key={bullet} className="flex items-start gap-2 text-[13.5px] leading-relaxed text-forest/60">
                  <span aria-hidden className="mt-0.5 text-forest">
                    &#10003;
                  </span>
                  <span>{bullet}</span>
                </li>
              ))}
            </ul>
          </details>
        </header>
        {/* 2. tiga manfaat, bukan daftar fitur */}
        <section className="mt-6 rounded-[1.75rem] bg-cream p-5 ring-1 ring-soil/12">
          <h2 className="font-display text-[16px] font-medium tracking-tight text-forest">
            {JOIN_COPY.benefitsTitle}
          </h2>
          <ul className="mt-3.5 space-y-3.5">
            {JOIN_COPY.benefits.map((benefit) => (
              <li key={benefit.title} className="flex items-start gap-3">
                <span
                  aria-hidden
                  className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-sage text-base"
                >
                  {benefit.emoji}
                </span>
                <span className="min-w-0">
                  <span className="block text-[14px] font-medium text-forest">{benefit.title}</span>
                  <span className="mt-0.5 block text-[13px] leading-relaxed text-forest/55">
                    {benefit.desc}
                  </span>
                </span>
              </li>
            ))}
          </ul>
        </section>

        {/* 3. jaminan privasi 2D.1 - SEBELUM tombol, bukan catatan kaki */}
        <section className="mt-4 rounded-[1.75rem] bg-mint/25 p-5 ring-1 ring-forest/10">
          <div className="flex items-start gap-3">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-cream text-forest">
              <ShieldCheck className="size-4" strokeWidth={2.2} aria-hidden />
            </span>
            <div className="min-w-0">
              <h2 className="font-display text-[16px] font-medium tracking-tight text-forest">
                {JOIN_COPY.privacyTitle}
              </h2>
              <p className="mt-1 text-[13.5px] leading-relaxed text-forest/65">
                {JOIN_COPY.privacyBody}
              </p>
            </div>
          </div>

          <div className="mt-3.5 space-y-1.5 border-t border-forest/10 pt-3">
            <p className="flex items-start gap-2 text-[12.5px] leading-relaxed text-forest/60">
              <ShieldCheck
                className="mt-0.5 size-3.5 shrink-0 text-forest"
                strokeWidth={2.4}
                aria-hidden
              />
              <span>{JOIN_COPY.referralNote(inviterLabel)}</span>
            </p>
            {/* masa berlaku = informasi, bukan hitungan mundur: nol urgensi buatan */}
            <p className="flex items-start gap-2 text-[12px] leading-relaxed text-forest/45">
              <Lock className="mt-0.5 size-3 shrink-0" strokeWidth={2.4} aria-hidden />
              <span>{invite.validUntilLabel}</span>
            </p>
          </div>
        </section>

        {/* pratinjau pengundang: kode TIDAK dibakar oleh tombol di halaman ini */}
        {preview && (
          <section className="mt-4 rounded-[1.75rem] bg-hud-amber/20 p-5 ring-1 ring-hud-amber/50">
            <p className="text-[12px] font-medium tracking-[0.16em] text-forest/45 uppercase">
              {JOIN_CLAIM_COPY.previewBadge}
            </p>
            <p className="mt-1 text-[13px] leading-relaxed text-forest/60">{JOIN_CLAIM_COPY.previewNote}</p>
          </section>
        )}
      </div>
      {/* 4. CTA sticky di zona ibu jari */}
      <div className="fixed inset-x-0 bottom-0 z-40 bg-gradient-to-t from-canvas via-canvas/95 to-transparent pt-10 pb-[max(1rem,env(safe-area-inset-bottom))]">
        <div className="mx-auto w-full max-w-[480px] px-6 lg:max-w-[560px]">
          {preview ? (
            <Link href="/joint" className={CTA_CLASS}>
              <span className="text-[16.5px] font-medium tracking-[-0.01em]">
                {JOIN_CLAIM_COPY.previewCta}
              </span>
              <span className={CTA_ICON_CLASS}>
                <ArrowRight className="size-[18px]" strokeWidth={2.4} aria-hidden />
              </span>
            </Link>
          ) : signedIn || demo ? (
            <button
              type="button"
              onClick={onClaim}
              disabled={claiming}
              className={cn(CTA_CLASS, claiming && 'opacity-70')}
            >
              <span className="text-[16.5px] font-medium tracking-[-0.01em]">
                {claiming ? JOIN_CLAIM_COPY.connecting : JOIN_COPY.ctaJoin}
              </span>
              <span className={CTA_ICON_CLASS}>
                {claiming ? (
                  <Loader2
                    className="size-[18px] animate-spin motion-reduce:animate-none"
                    strokeWidth={2.4}
                    aria-hidden
                  />
                ) : (
                  <ArrowRight className="size-[18px]" strokeWidth={2.4} aria-hidden />
                )}
              </span>
            </button>
          ) : (
            /* belum masuk: kode undangan DIBawa ke /login lewat `next`, jadi
               setelah verifikasi user kembali ke sini dan auto-join berjalan */
            <Link href={buildLoginHref(buildJoinClaimHref(code))} className={CTA_CLASS}>
              <span className="text-[16.5px] font-medium tracking-[-0.01em]">{JOIN_COPY.ctaJoin}</span>
              <span className={CTA_ICON_CLASS}>
                <ArrowRight className="size-[18px]" strokeWidth={2.4} aria-hidden />
              </span>
            </Link>
          )}
          <p className="mt-2.5 text-center text-[12px] leading-relaxed text-forest/50">{ctaHint}</p>
          <Link
            href="/app"
            className="mt-1.5 block text-center text-[13px] font-medium text-forest/60 underline underline-offset-2 hover:text-forest"
          >
            {JOIN_COPY.ctaLater}
          </Link>
          <p className="mt-1 text-center text-[11.5px] leading-relaxed text-forest/35">
            {JOIN_COPY.ctaLaterHint}
          </p>
        </div>
      </div>
    </>
  )
}

/* STATE MENGHUBUNGKAN: sesaat setelah kembali dari /login (auto-join).
   Tanpa layar ini user melihat tombol undangan yang bisa ditekan lagi padahal
   permintaan gabung sedang berjalan. */
function ClaimingView() {
  return (
    <div className="mx-auto flex min-h-screen w-full max-w-[480px] flex-col px-6 pt-10 pb-16 lg:max-w-[560px] lg:pt-16">
      <header>
        <LogoWordmark className="h-6" />
      </header>

      <section className="my-auto text-center">
        <span className="mx-auto flex size-14 items-center justify-center rounded-full bg-mint text-forest ring-1 ring-forest/10">
          <Loader2
            className="size-6 animate-spin motion-reduce:animate-none"
            strokeWidth={2.2}
            aria-hidden
          />
        </span>
        <h1 className="mt-4 font-display text-2xl font-semibold tracking-tight text-forest">
          {JOIN_CLAIM_COPY.connecting}
        </h1>
        <p className="mt-2 text-[13.5px] leading-relaxed text-forest/55">
          {JOIN_CLAIM_COPY.connectingHint}
        </p>
      </section>
    </div>
  )
}

/* STATE NON-VALID: expired / used / unknown.
   Tiga status ini satu keluarga karena pekerjaannya sama: memberi jalan keluar,
   bukan 404 kaku. Yang bisa dilakukan user di sini cuma satu hal nyata - minta
   link baru - jadi itu yang kita fasilitasi (pesan siap-tempel), ditambah jalan
   keluar sopan "Nanti aja". */
function InvalidInviteView({ invite }: { invite: InvalidInvite }) {
  const copy = INVALID_INVITE_COPY[invite.status]
  const [copied, setCopied] = useState(false)

  async function handleCopyMessage() {
    try {
      await navigator.clipboard.writeText(buildAskAgainMessage(invite.inviterName))
      setCopied(true)
      toast.success(ASK_AGAIN_COPY.copiedLabel)
      /* micro-feedback 2 detik - pola sama dengan tombol salin di /referral */
      window.setTimeout(() => setCopied(false), 2000)
    } catch {
      toast.error('Gagal menyalin otomatis, salin manual dari kotak di atas ya.')
    }
  }
  return (
    <div className="mx-auto flex min-h-screen w-full max-w-[480px] flex-col px-6 pt-10 pb-16 lg:max-w-[560px] lg:pt-16">
      <header>
        <LogoWordmark className="h-6" />
        <p className="mt-6 text-[12px] font-medium tracking-[0.16em] text-forest/40 uppercase">
          {JOIN_COPY.eyebrow}
        </p>
      </header>

      {/* kenapa tautannya nggak bisa dipakai */}
      <section className="mt-5 rounded-[1.75rem] bg-cream p-5 ring-1 ring-soil/12">
        <span aria-hidden className="text-3xl">
          {copy.emoji}
        </span>
        <h1 className="mt-3 font-display text-2xl font-semibold tracking-tight text-forest lg:text-3xl">
          {copy.title}
        </h1>
        <p className="mt-2 text-[14px] leading-relaxed text-forest/60">{copy.body}</p>
      </section>

      {/* jalan keluar utama: pesan siap-tempel (aksi nyata, bukan tombol mati) */}
      <section className="mt-4 rounded-[1.75rem] bg-hud-amber/20 p-5 ring-1 ring-hud-amber/50">
        <h2 className="font-display text-[16px] font-medium tracking-tight text-forest">
          {askAgainLead(invite.inviterName)}
        </h2>
        <p className="mt-1 text-[13px] leading-relaxed text-forest/60">{ASK_AGAIN_COPY.hint}</p>

        <p className="mt-3 rounded-2xl bg-cream px-3.5 py-3 text-[13px] leading-relaxed text-forest/70 italic ring-1 ring-soil/8">
          &ldquo;{buildAskAgainMessage(invite.inviterName)}&rdquo;
        </p>

        <button
          type="button"
          onClick={handleCopyMessage}
          className={cn(
            'mt-3 flex h-12 w-full items-center justify-center gap-2 rounded-full text-[15px] font-medium transition-colors duration-200 motion-reduce:transition-none active:scale-[0.98]',
            copied
              ? 'bg-mint/40 text-forest ring-1 ring-forest/20'
              : 'bg-forest text-cream hover:bg-forest-soft',
          )}
        >
          {copied ? (
            <Check className="size-4" strokeWidth={3} aria-hidden />
          ) : (
            <Copy className="size-4" strokeWidth={2.4} aria-hidden />
          )}
          <span aria-live="polite">
            {copied ? ASK_AGAIN_COPY.copiedLabel : ASK_AGAIN_COPY.copyLabel}
          </span>
        </button>
      </section>

      {/* jalan keluar sopan */}
      <div className="mt-4">
        <Link
          href="/app"
          className="flex h-12 items-center justify-center rounded-full bg-cream text-[15px] font-medium text-forest ring-1 ring-soil/16 transition-colors duration-200 hover:bg-sage/60 motion-reduce:transition-none"
        >
          {JOIN_COPY.ctaLater}
        </Link>
        <p className="mt-2 text-center text-[11.5px] leading-relaxed text-forest/35">
          {JOIN_COPY.ctaLaterHint}
        </p>
      </div>
    </div>
  )
}

/* STATE SUKSES: setelah keanggotaan benar-benar tercatat.
   PRD 920 & AC4: dompet bersama mulai dari Rp0, dan data historis masing-masing
   user TIDAK terganggu. Karena itu layar ini cuma merayakan + menjelaskan
   permulaan yang bersih - nol angka milik pengundang. */
function JoinedView({ walletName, onRestart }: { walletName: string; onRestart: () => void }) {
  return (
    <div className="mx-auto flex min-h-screen w-full max-w-[480px] flex-col px-6 pt-10 pb-16 lg:max-w-[560px] lg:pt-16">
      <header>
        <LogoWordmark className="h-6" />
      </header>

      <section className="mt-8 rounded-[1.75rem] bg-mint/25 p-6 text-center ring-1 ring-forest/10">
        {/* dua lingkaran bertemu satu hati - visual keluarga yang sama dengan
            selebrasi 8C, tapi versi tenang: momennya milik user, bukan animasi
            yang menahan mereka. Karena itu diam, jadi `prefers-reduced-motion`
            otomatis aman. Ikon netral (bukan avatar orang tertentu) karena nama
            & wajah siapa pun di layar ini datang dari server, bukan konstanta. */}
        <div className="flex items-center justify-center gap-2.5">
          <span className="flex size-12 items-center justify-center rounded-full bg-cream text-forest ring-1 ring-hud-sage/50">
            <HeartHandshake className="size-5" strokeWidth={2.2} aria-hidden />
          </span>
          <span className="flex size-9 items-center justify-center rounded-full bg-mint text-forest">
            <HeartHandshake className="size-4" strokeWidth={2.2} aria-hidden />
          </span>
          <span className="flex size-12 items-center justify-center rounded-full bg-cream text-forest ring-1 ring-hud-amber/50">
            <HeartHandshake className="size-5" strokeWidth={2.2} aria-hidden />
          </span>
        </div>

        <h1 className="mt-4 font-display text-3xl font-semibold tracking-tight text-forest lg:text-4xl">
          {JOIN_SUCCESS_COPY.title(walletName)}
        </h1>
        <p className="mt-2.5 text-[14px] leading-relaxed text-forest/60">{JOIN_SUCCESS_COPY.body}</p>
      </section>

      <Link
        href="/joint"
        className="group mt-6 flex h-14 w-full items-center justify-between gap-3 rounded-full bg-forest pr-2 pl-6 text-cream shadow-[0_16px_34px_-18px_rgba(0,0,0,0.85)] transition-colors duration-200 hover:bg-forest-soft active:scale-[0.98] motion-reduce:transition-none"
      >
        <span className="text-[16.5px] font-medium tracking-[-0.01em]">
          {JOIN_SUCCESS_COPY.cta}
        </span>
        <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-cream text-forest transition-colors duration-200 group-hover:bg-mint">
          <ArrowRight className="size-[18px]" strokeWidth={2.4} aria-hidden />
        </span>
      </Link>

      {/* jujur: keanggotaan ditulis SERVER, bukan oleh tombol di perangkat ini */}
      <p className="mt-3 rounded-2xl bg-sage/60 px-3.5 py-3 text-[12.5px] leading-relaxed text-forest/60 ring-1 ring-soil/8">
        Kamu sudah tercatat sebagai anggota dompet ini. Buka halaman Dompet Bersama
        untuk mulai mencatat bareng.
      </p>

      <button
        type="button"
        onClick={onRestart}
        className="mt-4 text-center text-[12.5px] font-medium text-forest/45 underline underline-offset-2 transition-colors hover:text-forest"
      >
        {JOIN_SUCCESS_COPY.restart}
      </button>
    </div>
  )
}