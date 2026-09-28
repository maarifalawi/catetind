'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { ArrowRight, Check, Copy, Lock, ShieldCheck, Sparkles } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { INITIAL_JOINT_WALLET, JOINT_ME, JOINT_PARTNER } from '@/lib/data/joint'
import {
  ASK_AGAIN_COPY,
  DEMO_INVITE_STATES,
  INVALID_INVITE_COPY,
  JOIN_COPY,
  JOIN_DEMO_COPY,
  JOIN_SUCCESS_COPY,
  askAgainLead,
  buildAskAgainMessage,
  buildJoinHref,
  type InvalidInvite,
  type InviteStatus,
  type ResolvedInvite,
  type ValidInvite,
} from '@/lib/data/joint-invite'
import { consumeInvite, markInviteFromServer, resolveInvite } from '@/lib/invite-store'
import { acceptInviteRemote, resolveInviteRemote } from '@/lib/supabase/invite-remote'
import { LogoWordmark } from './logo-wordmark'

/* ── Joint Wallet Invite Landing (/join/[code]) — inventaris #7 · PRD 900–932 ──
   Sisi B dari KEY FLOW #2: orang yang membuka halaman ini BUKAN user kita, tapi
   pasangan/teman yang diminta mengelola uang bersama. Menolak terasa seperti
   menolak orangnya, jadi empat aturan mengikat layout ini:

     1. HANGAT & PERSONAL — nama pengundang tampil besar di atas headline,
        bukan "Anda diundang ke wallet".
     2. MANFAAT DALAM 1 KALIMAT ×3 — bukan daftar fitur. PRD 877 (BIMA):
        momennya harus terasa seperti milestone hubungan, bukan administrasi.
     3. PRIVASI MENDAHULUI TOMBOL (2D.1) — kartu jaminan privasi ada di alur
        scroll SEBELUM CTA, bukan catatan kaki.
     4. TIDAK MEMAKSA — selalu ada "Nanti aja"; nol hitungan mundur, nol
        pengingat. Urgensi buatan dilarang PRD 4507.

   Yang sengaja TIDAK ditampilkan: angka/transaksi pengundang (PRD 921 & 2D.1 —
   data historis tidak boleh saling bocor).

   Halaman PUBLIK: `PhoneStage plain` di route, tanpa sidebar, dan
   `MobileBottomNav` + AI chat widget menyembunyikan diri di prefix `/join`.
   Semua copy di `lib/data/joint-invite.ts`.
   ────────────────────────────────────────────────────────────────────────── */

export function JoinInviteScreen({
  code,
  initialInvite,
}: {
  code: string
  /**
   * Status dari SERVER (dihitung `app/join/[code]/page.tsx`). Dipakai sebagai
   * nilai awal supaya render pertama di browser identik dengan HTML server —
   * setelah mount, layar ini membaca store perangkat dan memperbaruinya.
   */
  initialInvite: ResolvedInvite
}) {
  const [invite, setInvite] = useState<ResolvedInvite>(initialInvite)
  /** state sukses setelah "gabung" disimulasikan (produksi: auto-join via server) */
  const [joined, setJoined] = useState(false)

  /* Setelah mount: baca status dari SERVER dulu (paket 45) — kalau kodenya sudah
     dipakai/dikedaluwarsakan di perangkat lain, fakta itu dicatat lokal supaya
     `resolveInvite()` (satu-satunya penyusun copy /join) mengembalikan state yang
     benar. Setelah itu baca store perangkat seperti semula, jadi kode demo repo
     tetap bisa direview. */
  useEffect(() => {
    let alive = true
    void (async () => {
      const remote = await resolveInviteRemote(code)
      if (alive && remote && (remote.status === 'used' || remote.status === 'expired')) {
        markInviteFromServer(code, remote.status)
      }
      if (alive) setInvite(resolveInvite(code))
    })()
    return () => {
      alive = false
    }
  }, [code])

  /**
   * "Gabung Dompet Ini". Dua jalur, satu hasil:
   *
   *   1. SERVER (paket 45) — kalau ada sesi & kode ini hidup di database:
   *      `catetind_accept_invite` memasukkan user ke `joint_members` dan menandai
   *      kode TERPAKAI dalam satu transaksi. Kode yang sama ditolak untuk akun
   *      berikutnya (sekali pakai ditegakkan server, bukan di perangkat ini).
   *   2. LOKAL — kode contoh repo (`lib/invite-store.ts`) ditandai terpakai di
   *      perangkat, jadi sekali-pakai-nya tetap bisa dibuktikan dengan membuka
   *      ulang tautan ini.
   */
  async function handleSimulateJoined() {
    const remote = await acceptInviteRemote(code)
    if (!remote.ok) consumeInvite(code, JOINT_PARTNER.id)
    setInvite(resolveInvite(code))
    setJoined(true)
  }


  if (joined) {
    return (
      <JoinedView
        walletName={invite.walletName ?? INITIAL_JOINT_WALLET.name}
        onRestart={() => setJoined(false)}
      />
    )
  }

  if (invite.status !== 'valid') return <InvalidInviteView invite={invite} />

  /** produksi: server menandai invite terpakai + auto-join, baru layar ini tampil */
  return <ValidInviteView invite={invite} onSimulateJoined={handleSimulateJoined} />
}

/* ── STATE VALID: undangan yang masih bisa dipakai ────────────────────────────
   Urutan visualnya = urutan psikologis: siapa yang mengundang → apa yang
   didapat → jaminan privasi → baru tombol. CTA-nya sticky di zona ibu jari
   (CONTEXT-WAJIB §5.5), dan "Nanti aja" selalu tersedia di bawahnya. */
function ValidInviteView({
  invite,
  onSimulateJoined,
}: {
  invite: ValidInvite
  /** demo: lompati langkah masuk supaya state sukses bisa direview */
  onSimulateJoined: () => void
}) {
  const inviter = invite.inviterName

  return (
    <>
      <div className="mx-auto w-full max-w-[480px] px-6 pt-10 pb-56 lg:max-w-[560px] lg:pt-16 lg:pb-52">
        {/* ── 1. header personal: pengundang dulu, baru aplikasinya ────────── */}
        <header>
          <LogoWordmark className="h-6" />
          <p className="mt-6 text-[11px] font-semibold tracking-[0.16em] text-ink/40 uppercase">
            {JOIN_COPY.eyebrow}
          </p>

          <div className="mt-4 flex items-center gap-3.5">
            <span
              aria-hidden
              className="flex size-14 shrink-0 items-center justify-center rounded-2xl bg-hud-sage/25 text-3xl ring-1 ring-hud-sage/50"
            >
              {JOINT_ME.avatar}
            </span>
            <div className="min-w-0">
              <p className="font-display text-xl font-semibold tracking-tight text-ink">{inviter}</p>
              <p className="mt-0.5 text-[11.5px] leading-relaxed text-ink/50">
                {JOIN_COPY.walletLabel}:{' '}
                <b className="font-semibold text-ink/70">{invite.walletName}</b>
              </p>
            </div>
          </div>

          <h1 className="mt-4 font-display text-3xl font-semibold tracking-tight text-ink lg:text-4xl">
            {JOIN_COPY.headline(inviter)}
          </h1>
          <p className="mt-2.5 text-[13px] leading-relaxed text-ink/55">{JOIN_COPY.subtitle}</p>
        </header>

        {/* ── 2. tiga manfaat, bukan daftar fitur ──────────────────────────── */}
        <section className="mt-6 rounded-[1.75rem] bg-cream p-5 ring-1 ring-soil/12">
          <h2 className="font-display text-[15px] font-semibold tracking-tight text-ink">
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
                  <span className="block text-[13px] font-semibold text-ink">{benefit.title}</span>
                  <span className="mt-0.5 block text-[12px] leading-relaxed text-ink/55">
                    {benefit.desc}
                  </span>
                </span>
              </li>
            ))}
          </ul>
        </section>

        {/* ── 3. jaminan privasi 2D.1 — SEBELUM tombol, bukan catatan kaki ─── */}
        <section className="mt-4 rounded-[1.75rem] bg-mint/25 p-5 ring-1 ring-forest/10">
          <div className="flex items-start gap-3">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-cream text-forest">
              <ShieldCheck className="size-4" strokeWidth={2.2} aria-hidden />
            </span>
            <div className="min-w-0">
              <h2 className="font-display text-[15px] font-semibold tracking-tight text-ink">
                {JOIN_COPY.privacyTitle}
              </h2>
              <p className="mt-1 text-[12.5px] leading-relaxed text-ink/65">
                {JOIN_COPY.privacyBody}
              </p>
            </div>
          </div>

          <div className="mt-3.5 space-y-1.5 border-t border-forest/10 pt-3">
            <p className="flex items-start gap-2 text-[11.5px] leading-relaxed text-ink/60">
              <Sparkles
                className="mt-0.5 size-3.5 shrink-0 text-forest"
                strokeWidth={2.4}
                aria-hidden
              />
              <span>{JOIN_COPY.referralNote(inviter)}</span>
            </p>
            {/* masa berlaku = informasi, bukan hitungan mundur: nol urgensi buatan */}
            <p className="flex items-start gap-2 text-[11px] leading-relaxed text-ink/45">
              <Lock className="mt-0.5 size-3 shrink-0" strokeWidth={2.4} aria-hidden />
              <span>{invite.validUntilLabel}</span>
            </p>
          </div>
        </section>

        <DemoFooter activeStatus={invite.status} onSimulateJoined={onSimulateJoined} />
      </div>

      {/* ── 4. CTA sticky di zona ibu jari ────────────────────────────────────
          Tujuan `/login` (bukan tombol mati): di produksi user masuk dulu lewat
          magic link lalu AUTO-JOIN dikerjakan server. Menaruh syarat bayar atau
          verifikasi di depan pintu ini dilarang oleh prompt halaman ini. */}
      <div className="fixed inset-x-0 bottom-0 z-40 bg-gradient-to-t from-canvas via-canvas/95 to-transparent pt-10 pb-[max(1rem,env(safe-area-inset-bottom))]">
        <div className="mx-auto w-full max-w-[480px] px-6 lg:max-w-[560px]">
          <Link
            href="/login"
            className="group flex h-14 w-full items-center justify-between gap-3 rounded-full bg-forest pr-2 pl-6 text-cream shadow-[0_16px_34px_-18px_rgba(69,89,78,0.85)] transition-colors duration-200 hover:bg-forest-soft active:scale-[0.98] motion-reduce:transition-none"
          >
            <span className="text-[15.5px] font-medium tracking-[-0.01em]">{JOIN_COPY.ctaJoin}</span>
            <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-cream text-forest transition-colors duration-200 group-hover:bg-mint">
              <ArrowRight className="size-[18px]" strokeWidth={2.4} aria-hidden />
            </span>
          </Link>
          <p className="mt-2.5 text-center text-[11px] leading-relaxed text-ink/50">
            {JOIN_COPY.ctaJoinHint}
          </p>
          <Link
            href="/"
            className="mt-1.5 block text-center text-[12px] font-semibold text-ink/60 underline underline-offset-2 hover:text-ink"
          >
            {JOIN_COPY.ctaLater}
          </Link>
          <p className="mt-1 text-center text-[10.5px] leading-relaxed text-ink/35">
            {JOIN_COPY.ctaLaterHint}
          </p>
        </div>
      </div>
    </>
  )
}

/* ── STATE NON-VALID: expired / used / unknown ────────────────────────────────
   Tiga status ini satu keluarga karena pekerjaannya sama: memberi jalan keluar,
   bukan 404 kaku. Yang bisa dilakukan user di sini cuma satu hal nyata — minta
   link baru — jadi itu yang kita fasilitasi (pesan siap-tempel), ditambah jalan
   keluar sopan "Nanti aja". */
function InvalidInviteView({ invite }: { invite: InvalidInvite }) {
  const copy = INVALID_INVITE_COPY[invite.status]
  const [copied, setCopied] = useState(false)

  async function handleCopyMessage() {
    try {
      await navigator.clipboard.writeText(buildAskAgainMessage(invite.inviterName))
      setCopied(true)
      toast.success(ASK_AGAIN_COPY.copiedLabel)
      /* micro-feedback 2 detik — pola sama dengan tombol salin di /referral */
      window.setTimeout(() => setCopied(false), 2000)
    } catch {
      toast.error('Gagal menyalin otomatis — salin manual dari kotak di atas ya.')
    }
  }

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-[480px] flex-col px-6 pt-10 pb-16 lg:max-w-[560px] lg:pt-16">
      <header>
        <LogoWordmark className="h-6" />
        <p className="mt-6 text-[11px] font-semibold tracking-[0.16em] text-ink/40 uppercase">
          {JOIN_COPY.eyebrow}
        </p>
      </header>

      {/* ── kenapa tautannya nggak bisa dipakai ─────────────────────────────── */}
      <section className="mt-5 rounded-[1.75rem] bg-cream p-5 ring-1 ring-soil/12">
        <span aria-hidden className="text-3xl">
          {copy.emoji}
        </span>
        <h1 className="mt-3 font-display text-2xl font-semibold tracking-tight text-ink lg:text-3xl">
          {copy.title}
        </h1>
        <p className="mt-2 text-[13px] leading-relaxed text-ink/60">{copy.body}</p>
      </section>

      {/* ── jalan keluar utama: pesan siap-tempel (aksi nyata, bukan tombol mati) ── */}
      <section className="mt-4 rounded-[1.75rem] bg-hud-amber/20 p-5 ring-1 ring-hud-amber/50">
        <h2 className="font-display text-[15px] font-semibold tracking-tight text-ink">
          {askAgainLead(invite.inviterName)}
        </h2>
        <p className="mt-1 text-[12px] leading-relaxed text-ink/60">{ASK_AGAIN_COPY.hint}</p>

        <p className="mt-3 rounded-2xl bg-cream px-3.5 py-3 text-[12px] leading-relaxed text-ink/70 italic ring-1 ring-soil/8">
          “{buildAskAgainMessage(invite.inviterName)}”
        </p>

        <button
          type="button"
          onClick={handleCopyMessage}
          className={cn(
            'mt-3 flex h-12 w-full items-center justify-center gap-2 rounded-full text-[14px] font-semibold transition-colors duration-200 motion-reduce:transition-none active:scale-[0.98]',
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

      {/* ── jalan keluar sopan ──────────────────────────────────────────────── */}
      <div className="mt-4">
        <Link
          href="/"
          className="flex h-12 items-center justify-center rounded-full bg-cream text-[14px] font-semibold text-ink ring-1 ring-soil/16 transition-colors duration-200 hover:bg-sage/60 motion-reduce:transition-none"
        >
          {JOIN_COPY.ctaLater}
        </Link>
        <p className="mt-2 text-center text-[10.5px] leading-relaxed text-ink/35">
          {JOIN_COPY.ctaLaterHint}
        </p>
      </div>

      <DemoFooter activeStatus={invite.status} />
    </div>
  )
}

/* ── STATE SUKSES: setelah "gabung" disimulasikan ─────────────────────────────
   PRD 920 & AC4: dompet bersama mulai dari Rp0, dan data historis masing-masing
   user TIDAK terganggu. Karena itu layar ini cuma merayakan + menjelaskan
   permulaan yang bersih — nol angka milik pengundang. */
function JoinedView({ walletName, onRestart }: { walletName: string; onRestart: () => void }) {
  return (
    <div className="mx-auto flex min-h-screen w-full max-w-[480px] flex-col px-6 pt-10 pb-16 lg:max-w-[560px] lg:pt-16">
      <header>
        <LogoWordmark className="h-6" />
      </header>

      <section className="mt-8 rounded-[1.75rem] bg-mint/25 p-6 text-center ring-1 ring-forest/10">
        {/* dua avatar bertemu satu hati — visual keluarga yang sama dengan
            selebrasi 8C, tapi versi tenang: momennya milik user, bukan animasi
            yang menahan mereka. Karena itu diam, jadi `prefers-reduced-motion`
            otomatis aman. */}
        <div className="flex items-center justify-center gap-2.5">
          <span aria-hidden className="text-[40px]">
            {JOINT_ME.avatar}
          </span>
          <span aria-hidden className="text-[30px]">
            💚
          </span>
          <span aria-hidden className="text-[40px]">
            {JOINT_PARTNER.avatar}
          </span>
        </div>

        <h1 className="mt-4 font-display text-3xl font-semibold tracking-tight text-ink lg:text-4xl">
          {JOIN_SUCCESS_COPY.title(walletName)}
        </h1>
        <p className="mt-2.5 text-[13px] leading-relaxed text-ink/60">{JOIN_SUCCESS_COPY.body}</p>
      </section>

      <Link
        href="/joint"
        className="group mt-6 flex h-14 w-full items-center justify-between gap-3 rounded-full bg-forest pr-2 pl-6 text-cream shadow-[0_16px_34px_-18px_rgba(69,89,78,0.85)] transition-colors duration-200 hover:bg-forest-soft active:scale-[0.98] motion-reduce:transition-none"
      >
        <span className="text-[15.5px] font-medium tracking-[-0.01em]">
          {JOIN_SUCCESS_COPY.cta}
        </span>
        <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-cream text-forest transition-colors duration-200 group-hover:bg-mint">
          <ArrowRight className="size-[18px]" strokeWidth={2.4} aria-hidden />
        </span>
      </Link>

      {/* jujur soal demo: di produksi langkah ini hasil auto-join dari server */}
      <p className="mt-3 rounded-2xl bg-sage/60 px-3.5 py-3 text-[11.5px] leading-relaxed text-ink/60 ring-1 ring-soil/8">
        {JOIN_DEMO_COPY.body}
      </p>

      <button
        type="button"
        onClick={onRestart}
        className="mt-4 text-center text-[11.5px] font-semibold text-ink/45 underline underline-offset-2 transition-colors hover:text-ink"
      >
        {JOIN_SUCCESS_COPY.restart}
      </button>
    </div>
  )
}

/* ── KAKI DEMO ────────────────────────────────────────────────────────────────
   Dua hal yang cuma boleh ada di build demo, dan harus terlihat sebagai demo:
     1. tombol lompati langkah masuk → supaya alur bisa ditelusuri sampai ujung;
     2. tautan antar state (valid / kedaluwarsa / terpakai / kode asing) → supaya
        desainer bisa memeriksa semua tampilan tanpa menebak URL.
   Keduanya memakai permukaan pucat & teks sekunder supaya tidak pernah terasa
   seperti aksi produk. */
function DemoFooter({
  activeStatus,
  onSimulateJoined,
}: {
  activeStatus: InviteStatus
  /** hanya dikirim dari state valid — di state non-valid tidak ada yang bisa digabung */
  onSimulateJoined?: () => void
}) {
  return (
    <section className="mt-6 rounded-[1.75rem] bg-sage/50 p-5 ring-1 ring-soil/10">
      <div className="flex items-start gap-3">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-cream text-ink/60">
          <Sparkles className="size-4" strokeWidth={2.2} aria-hidden />
        </span>
        <div className="min-w-0">
          <h2 className="font-display text-[14px] font-semibold tracking-tight text-ink">
            {JOIN_DEMO_COPY.title}
          </h2>
          <p className="mt-1 text-[11.5px] leading-relaxed text-ink/55">{JOIN_DEMO_COPY.body}</p>
        </div>
      </div>

      {onSimulateJoined && (
        <div className="mt-3.5 border-t border-soil/12 pt-3.5">
          <button
            type="button"
            onClick={onSimulateJoined}
            className="flex h-11 w-full items-center justify-center gap-2 rounded-full bg-cream text-[13px] font-semibold text-ink ring-1 ring-soil/16 transition-colors duration-200 hover:bg-sage/70 motion-reduce:transition-none"
          >
            <Check className="size-4" strokeWidth={2.6} aria-hidden />
            {JOIN_DEMO_COPY.joinLabel}
          </button>
          <p className="mt-1.5 text-center text-[10.5px] leading-relaxed text-ink/40">
            {JOIN_DEMO_COPY.joinHint}
          </p>
        </div>
      )}

      <div className="mt-3.5 border-t border-soil/12 pt-3.5">
        <p className="text-[10.5px] font-semibold tracking-[0.14em] text-ink/40 uppercase">
          {JOIN_DEMO_COPY.statesLabel}
        </p>
        <ul className="mt-2 flex flex-wrap gap-2">
          {DEMO_INVITE_STATES.map((state) => {
            const active = state.status === activeStatus
            return (
              <li key={state.code}>
                <Link
                  href={buildJoinHref(state.code)}
                  aria-current={active ? 'page' : undefined}
                  className={cn(
                    'inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[11.5px] font-semibold transition-colors duration-200 motion-reduce:transition-none',
                    active
                      ? 'bg-forest text-mint'
                      : 'bg-cream text-ink/60 ring-1 ring-soil/14 hover:text-ink',
                  )}
                >
                  {state.label}
                  <span className="font-mono text-[10px] tracking-wider opacity-70">
                    {state.code}
                  </span>
                </Link>
              </li>
            )
          })}
        </ul>
      </div>
    </section>
  )
}

