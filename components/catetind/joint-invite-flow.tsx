'use client'

import { useCallback, useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { ArrowLeft, ArrowRight, Check, Copy, HeartHandshake, RefreshCw, Share2, Wallet } from 'lucide-react'
import { toast } from 'sonner'
import { useBodyScrollLock } from '@/hooks/use-body-scroll-lock'
import { type JointPerson } from '@/lib/data/joint'
import {
  INVITE_CODE_COPY,
  JOIN_CODE_COPY,
  buildInviteShareText,
  type InviteRecord,
} from '@/lib/data/joint-invite'
import { activeInviteFor, adoptInviteFromServer, createInvite, resolveInvite } from '@/lib/invite-store'
import { refreshRemoteJoint } from '@/lib/money/joint-store'
import { activeInviteRemote, createInviteRemote } from '@/lib/supabase/invite-remote'
import { ensureJointPocketRemote } from '@/lib/supabase/joint-remote'

/* -- Invite Partner Flow (Section 8) -----------------------------------------
   Tampil saat `partnerJoined === false`: seluruh halaman berubah jadi ajakan
   membangun dompet bersama.

   8A Hero invite -> 8B modal kode undangan (share/copy + indikator menunggu)
   -> 8C selebrasi saat pasangan bergabung (dua avatar menghampiri satu sama lain
   lalu hati meledak di tengah).

   Catatan integrasi: `/join/[code]` (halaman landing undangan) SUDAH ada di
   inventaris sebagai halaman terpisah - komponen ini yang menggambar sisinya
   dari dalam aplikasi.
   -------------------------------------------------------------------------- */

const EASE: [number, number, number, number] = [0.22, 1, 0.36, 1]

/** 8A - bagian hero saat dompet bersama belum punya pasangan */
export function JointInviteFlow({
  defaultWalletName,
  onCreated,
  onBack,
}: {
  defaultWalletName: string
  /** CTA ditekan: nama dompet disimpan & modal kode undangan dibuka */
  onCreated: (walletName: string) => void
  /** kembali ke pilihan "Buat / Gabung" (opsional — dipakai `/joint`) */
  onBack?: () => void
}) {
  const [walletName, setWalletName] = useState(defaultWalletName)
  const ready = walletName.trim().length > 0

  return (
    <div className="flex flex-col items-center px-1 py-6 text-center">
      {onBack ? (
        <button
          type="button"
          onClick={onBack}
          className="mb-1 inline-flex w-fit items-center gap-1.5 self-start text-[12.5px] font-medium text-forest-muted transition-colors hover:text-forest"
        >
          <ArrowLeft className="size-3.5" strokeWidth={2.4} aria-hidden />
          {JOIN_CODE_COPY.back}
        </button>
      ) : null}

      {/* Ilustrasi: dua kartu dompet berhadapan dengan satu hati di tengah.
          Bukan lagi emoji placeholder - bentuknya vektor (lucide) sehingga
          ikut warna token, tajam di semua ukuran, dan tidak terlihat seperti
          coretan sementara. */}
      <div className="relative flex h-[132px] w-full max-w-[280px] items-center justify-center">
        <span
          aria-hidden
          className="absolute left-[12%] top-1/2 flex size-12 -translate-y-1/2 items-center justify-center rounded-2xl bg-cream text-forest ring-1 ring-hud-sage/50 float-sway"
        >
          <Wallet className="size-5" strokeWidth={2.2} />
        </span>
        <motion.span
          aria-hidden
          animate={{ scale: [1, 1.18, 1] }}
          transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
          className="flex size-11 items-center justify-center rounded-full bg-mint text-forest"
        >
          <HeartHandshake className="size-5" strokeWidth={2.2} />
        </motion.span>
        <span
          aria-hidden
          className="absolute right-[12%] top-1/2 flex size-12 -translate-y-1/2 items-center justify-center rounded-2xl bg-cream text-forest ring-1 ring-hud-amber/50 float-sway"
        >
          <Wallet className="size-5" strokeWidth={2.2} />
        </span>
        <span
          aria-hidden
          className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-hud-sage/60 to-transparent"
        />
      </div>

      <h2 className="mt-5 font-display text-[22px] font-semibold leading-tight tracking-tight text-forest">
        Mulai Bangun Masa Depan Bareng
      </h2>
      {/* SAPU BERSIH TEKS BASA-BASI (sesi 3): paragraf pengantar dihapus. */}

      <label className="mt-6 block w-full max-w-[380px] text-left">
        <span className="text-[13.5px] font-medium text-forest-soft">Kasih nama dompet kalian</span>
        <input
          value={walletName}
          onChange={(event) => setWalletName(event.target.value)}
          placeholder="Dompet Kita {'\u{1F49A}'}"
          className="mt-2 w-full rounded-2xl bg-cream px-4 py-3.5 text-[16px] font-medium text-forest outline-none ring-1 ring-soil/16 transition-shadow placeholder:font-medium placeholder:text-forest-muted focus:ring-2 focus:ring-forest/35"
        />
      </label>

      <button
        type="button"
        onClick={() => ready && onCreated(walletName.trim())}
        disabled={!ready}
        className={
          ready
            ? 'mt-4 inline-flex h-12 w-full max-w-[380px] items-center justify-center gap-2 rounded-2xl bg-forest text-[15px] font-medium text-mint shadow-[0_16px_32px_-20px_rgba(0,0,0,0.95)] transition-colors hover:bg-forest-soft active:scale-[0.99]'
            : 'mt-4 inline-flex h-12 w-full max-w-[380px] cursor-not-allowed items-center justify-center gap-2 rounded-2xl bg-ink/[0.07] text-[15px] font-medium text-forest-muted'
        }
      >
        Buat Dompet &amp; Ajak Pasangan
        <ArrowRight className="size-4" strokeWidth={2.6} />
      </button>

      {/* Tidak ada lagi jalur simulasi penggabungan di sini.
          Keanggotaan hanya bisa lahir dari server: pasangan membuka
          `/join/<kode>` di perangkatnya, menekan Gabung Dompet Ini, dan
          `catetind_accept_invite` menulis baris keanggotaan. Pemilik kantong
          menerimanya lewat langganan realtime (lib/money/joint-store.ts)
          dan baru saat itu wujud kantong aktif muncul. */}
    </div>
  )
}

/** 8B - modal kode undangan: share, salin, lalu indikator "menunggu pasangan" */
export function JointInviteCodeModal({
  open,
  onClose,
  walletId,
  walletName,
  me,
}: {
  open: boolean
  onClose: () => void
  /** dompet yang diundangkan - kode undangan selalu milik SATU dompet */
  walletId: string
  walletName: string
  /** peserta SUNGGUHAN (nama dari store), bukan identitas contoh */
  me: JointPerson
}) {
  const [waiting, setWaiting] = useState(false)
  /**
   * Kode undangan NYATA untuk dompet ini (paket 39).
   *
   * `null` sampai effect pertama selesai - sengaja: nilai awalnya tidak dibaca
   * saat render (localStorage hanya ada di browser), jadi HTML server & client
   * identik dulu. Begitu modal dibuka, kode yang masih berlaku dipakai ulang;
   * kalau tidak ada, satu kode baru dibuat. Kode ini benar-benar hidup 24 jam dan
   * benar-benar sekali pakai - bukan konstanta yang cuma dipajang.
   */
  const [invite, setInvite] = useState<InviteRecord | null>(null)
  /**
   * Kode ini SUDAH tercatat di tabel `invite_codes`? (paket 100)
   *
   * `null` = belum dicoba, `false` = server belum menjawab (tanpa sesi/backend).
   * Tanpa langkah ini kode hanya hidup di localStorage perangkat pengundang,
   * sehingga pasangan di perangkat lain selalu melihat "Kodenya nggak ketemu" -
   * inti fitur undangan tidak pernah berjalan.
   */
  const [serverSynced, setServerSynced] = useState<boolean | null>(null)
  useBodyScrollLock(open, true)

  /**
   * Kirim kode ke server setelah dompet server dipastikan ada (idempoten).
   *
   * `catetind_create_invite` MENCABUT kode aktif sebelumnya, jadi fungsi ini
   * hanya dipanggil untuk kode yang memang baru (atau saat pengiriman gagal lalu
   * diulang). Saat modal dibuka, kode yang sudah aktif di server dipakai ulang.
   */
  const syncInvite = useCallback(
    async (code: string) => {
      const pocket = await ensureJointPocketRemote(walletName)
      if (!pocket) {
        setServerSynced(false)
        return false
      }
      const created = await createInviteRemote(pocket.id, code)
      setServerSynced(Boolean(created))
      if (created) {
        adoptInviteFromServer(code, pocket.id, Date.parse(created.expiresAt))
        /* id dompet uuid dari server dipakai /joint & realtime setelah ini */
        void refreshRemoteJoint()
      }
      return Boolean(created)
    },
    [walletName],
  )

  useEffect(() => {
    if (!open) return
    setServerSynced(null)
    let cancelled = false

    void (async () => {
      /* 1. dompet di server dipastikan ada — RPC pembuatan kode menolak pemanggil
         yang belum punya baris `joint_wallets`/`joint_members` */
      const pocket = await ensureJointPocketRemote(walletName)
      if (cancelled) return
      if (!pocket) {
        setServerSynced(false)
        setInvite(activeInviteFor(walletId) ?? createInvite(walletId))
        return
      }

      /* 2. kode yang MASIH BERLAKU di server dipakai ulang. Membuat kode baru di
         sini akan mencabut kode yang sudah dikirim ke pasangan (mis. `H9FKJF`). */
      const active = await activeInviteRemote(pocket.id)
      if (cancelled) return
      if (active) {
        const adopted = adoptInviteFromServer(active.code, pocket.id, Date.parse(active.expiresAt))
        setInvite(adopted ?? activeInviteFor(walletId) ?? createInvite(walletId))
        setServerSynced(true)
        void refreshRemoteJoint()
        return
      }

      /* 3. belum ada kode aktif MILIK AKUN INI di server: buat kode BARU.
         JANGAN memakai ulang kode sisa localStorage di sini. Kode itu bisa
         milik akun lain di browser yang sama, dan `catetind_create_invite`
         versi lama memindahkan `created_by` ke akun pengirim — akibatnya
         pembuat aslinya ditolak dengan "Itu kode undanganmu sendiri". Kode
         yang benar-benar hidup sudah ditangani langkah 2 (dibaca dari server). */
      const local = createInvite(walletId)
      setInvite(local)
      const created = await createInviteRemote(pocket.id, local.code)
      if (cancelled) return
      setServerSynced(Boolean(created))
      if (created) {
        adoptInviteFromServer(local.code, pocket.id, Date.parse(created.expiresAt))
        void refreshRemoteJoint()
      }
    })()

    return () => {
      cancelled = true
    }
  }, [open, walletId, walletName])

  /* status dibaca ulang dari store: kode bisa sudah dipakai/kedaluwarsa setelah
     modal terbuka (mis. pasangan menekan "gabung" di tab lain) */
  const status = invite ? resolveInvite(invite.code).status : 'unknown'
  const usable = status === 'valid'
  /**
   * Kode boleh DIBAGIKAN hanya kalau benar-benar tercatat di `invite_codes`.
   *
   * Sebelum ini kode lokal tetap tampil + tombol Bagikan/Salin hidup walau
   * pengiriman ke server gagal — user membagikan tautan yang pasti dijawab
   * "Kodenya nggak ketemu" di perangkat pasangannya. Saklar ini menutupnya:
   * gagal kirim = tidak ada tombol bagikan, yang ada tombol coba lagi.
   */
  const shareable = Boolean(invite && usable && serverSynced === true)

  function refreshCode() {
    const next = createInvite(walletId)
    setInvite(next)
    setServerSynced(null)
    void syncInvite(next.code)
    toast.success(INVITE_CODE_COPY.refreshedToast)
  }

  /** kirim ULANG kode yang sama ke server setelah pengiriman pertama gagal */
  function retrySync() {
    if (!invite) return
    setServerSynced(null)
    void syncInvite(invite.code)
  }

  useEffect(() => {
    if (!open) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [open, onClose])

  /** 8B: Web Share API dulu; kalau browser tidak punya -> salin ke clipboard.
   *  Pengecekan pakai `typeof` (bukan `'share' in navigator`) supaya TypeScript
   *  tidak mempersempit tipe `navigator` menjadi `never` di cabang fallback. */
  async function handleShare() {
    if (!invite || !shareable) return
    const text = buildInviteShareText(me.name, invite.code, walletName)
    const canShare = typeof navigator !== 'undefined' && typeof navigator.share === 'function'
    try {
      if (canShare) {
        await navigator.share({ title: `Ajak pasangan ke ${walletName}`, text })
        setWaiting(true)
        return
      }
      await navigator.clipboard.writeText(text)
      toast.success('Link tersalin!')
      setWaiting(true)
    } catch {
      /* user membatalkan dialog share - bukan error, cukup diamkan */
    }
  }

  async function handleCopyCode() {
    if (!invite || !shareable) return
    try {
      await navigator.clipboard.writeText(invite.code)
      toast.success('Kode tersalin!')
    } catch {
      toast.error('Gagal menyalin, catat kodenya manual ya')
    }
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          key="invite-code"
          className="fixed inset-0 z-[70]"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          <button
            type="button"
            aria-label="Tutup kode undangan"
            onClick={onClose}
            className="absolute inset-0 cursor-default bg-ink/55"
          />
          <div className="absolute inset-x-0 bottom-0 flex justify-center sm:inset-x-4 sm:bottom-auto sm:top-1/2 sm:-translate-y-1/2">
            <motion.div
              role="dialog"
              aria-modal="true"
              aria-label="Kode undangan pasangan"
              initial={{ y: 64, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 64, opacity: 0 }}
              transition={{ duration: 0.34, ease: EASE }}
              className="max-h-[92dvh] w-full max-w-md overflow-y-auto rounded-t-[2rem] bg-cream px-5 pb-7 pt-5 shadow-[0_-24px_60px_-24px_rgba(0,0,0,0.55)] sm:rounded-[2rem] sm:px-6 sm:shadow-[0_28px_70px_-24px_rgba(0,0,0,0.5)]"
              data-lenis-prevent
            >
              <h2 className="font-display text-xl font-semibold tracking-tight text-forest">
                {INVITE_CODE_COPY.title}
              </h2>
              <p className="mt-1 text-[13px] text-forest-muted">{walletName}</p>
              {/* Kode undangan SUNGGUHAN milik dompet ini (paket 39) - bukan
                  konstanta global. Masa berlaku & sekali pakainya nyata, dan
                  baris di bawah hanya muncul saat statusnya memang `valid`. */}
              <div className="mt-4 rounded-[1.5rem] border-2 border-dashed border-hud-sage/50 bg-cream px-4 py-5 text-center">
                <p
                  className="font-mono text-[34px] font-medium leading-none tracking-[0.3em] text-forest"
                  aria-label={invite ? `Kode undangan ${invite.code.split('').join(' ')}` : undefined}
                >
                  {invite?.code ?? '\u2022\u2022\u2022\u2022\u2022\u2022'}
                </p>
                {!invite || !usable ? (
                  <p className="mt-2.5 text-[12.5px] text-forest-muted">{INVITE_CODE_COPY.invalidNote}</p>
                ) : serverSynced === false ? (
                  <button
                    type="button"
                    onClick={retrySync}
                    className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-sage/60 px-3 py-1.5 text-[12px] font-medium text-forest transition-colors hover:bg-sage"
                  >
                    <RefreshCw className="size-3" strokeWidth={2.4} aria-hidden />
                    {INVITE_CODE_COPY.syncRetry}
                  </button>
                ) : null}
              </div>

              <button
                type="button"
                onClick={handleShare}
                disabled={!shareable}
                className={
                  shareable
                    ? 'mt-4 inline-flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-forest text-[15px] font-medium text-mint shadow-[0_16px_32px_-20px_rgba(0,0,0,0.95)] transition-colors hover:bg-forest-soft active:scale-[0.99]'
                    : 'mt-4 inline-flex h-12 w-full cursor-not-allowed items-center justify-center gap-2 rounded-2xl bg-ink/[0.07] text-[15px] font-medium text-forest-muted'
                }
              >
                <Share2 className="size-4" strokeWidth={2.4} />
                Bagikan Link 
              </button>
              <button
                type="button"
                onClick={handleCopyCode}
                disabled={!shareable}
                className="mt-2 inline-flex h-11 w-full items-center justify-center gap-2 rounded-2xl bg-cream text-[14.5px] font-medium text-forest ring-1 ring-soil/16 transition-colors hover:bg-cream active:scale-[0.99] disabled:opacity-55"
              >
                <Copy className="size-4" strokeWidth={2.4} />
                Salin Kode
              </button>

              <button
                type="button"
                onClick={refreshCode}
                className="mt-3 inline-flex items-center gap-1.5 text-[12.5px] font-medium text-forest-muted transition-colors hover:text-forest"
              >
                <RefreshCw className="size-3.5" strokeWidth={2.4} aria-hidden />
                {INVITE_CODE_COPY.refresh}
              </button>
            </motion.div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

/**
 * 8C - selebrasi "partner bergabung": dua avatar berjalan saling menghampiri,
 * hati meledak di tengah, lalu halaman berpindah ke dompet bersama.
 * Overlay ini sengaja singkat (--2,5 detik) - momen, bukan layar baru.
 */
export function JointJoinedCelebration({
  open,
  onStart,
  me,
  partner,
}: {
  open: boolean
  /** lanjut ke tampilan dompet bersama (dipanggil otomatis setelah 2,5 detik) */
  onStart: () => void
  /** peserta SUNGGUHAN - wajib, supaya tidak ada nama contoh sebagai cadangan */
  me: JointPerson
  partner: JointPerson
}) {
  useEffect(() => {
    if (!open) return
    const timer = window.setTimeout(onStart, 2500)
    return () => window.clearTimeout(timer)
  }, [open, onStart])

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          key="joined-celebration"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          className="fixed inset-0 z-[80] flex flex-col items-center justify-center bg-cream px-6 text-center"
        >
          <div className="relative flex h-32 w-full max-w-[320px] items-center justify-center">
            <motion.span
              aria-hidden
              initial={{ x: -80, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ duration: 0.7, ease: EASE }}
              className="text-[52px]"
            >
              {me.avatar}
            </motion.span>
            <motion.span
              aria-hidden
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: [0, 1.3, 1], opacity: [0, 1, 1] }}
              transition={{ delay: 0.55, duration: 0.6, ease: EASE }}
              className="mx-3 text-[46px]"
            >
              {'\u{1F49A}'}
            </motion.span>
            <motion.span
              aria-hidden
              initial={{ x: 80, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ duration: 0.7, ease: EASE }}
              className="text-[52px]"
            >
              {partner.avatar}
            </motion.span>
          </div>

          <motion.h2
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.75, duration: 0.35 }}
            className="mt-6 font-display text-[22px] font-medium leading-tight tracking-tight text-forest"
          >
            {partner.name} sudah bergabung! {'\u{1F49A}'}
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.85, duration: 0.35 }}
            className="mt-2 text-[14px] leading-relaxed text-forest-muted"
          >
            Dompet bersama kalian aktif. Saldo dimulai dari Rp 0.
          </motion.p>

          <motion.button
            type="button"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1, duration: 0.35 }}
            onClick={onStart}
            className="mt-6 inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-forest px-6 text-[15px] font-medium text-mint shadow-[0_16px_32px_-20px_rgba(0,0,0,0.95)] transition-colors hover:bg-forest-soft active:scale-[0.99]"
          >
            Mulai Catat Bareng
            <ArrowRight className="size-4" strokeWidth={2.6} />
          </motion.button>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
