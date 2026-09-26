'use client'

import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { ArrowRight, Check, Copy, HeartHandshake, Share2 } from 'lucide-react'
import { toast } from 'sonner'
import { useBodyScrollLock } from '@/hooks/use-body-scroll-lock'
import {
  INVITE_CODE,
  INVITE_VALIDITY_COPY,
  JOINT_ME,
  JOINT_PARTNER,
  buildInviteShareText,
  type JointPerson,
} from '@/lib/data/joint'

/* ── Invite Partner Flow (Section 8) ─────────────────────────────────────────
   Tampil saat `partnerJoined === false`: seluruh halaman berubah jadi ajakan
   membangun dompet bersama.

   8A Hero invite → 8B modal kode undangan (share/copy + indikator menunggu)
   → 8C selebrasi saat pasangan bergabung (dua avatar menghampiri satu sama lain
   lalu hati meledak di tengah).

   Catatan integrasi: `/join/[code]` (halaman landing undangan) SUDAH ada di
   inventaris sebagai halaman terpisah — komponen ini yang menggambar sisinya
   dari dalam aplikasi.
   ────────────────────────────────────────────────────────────────────────── */

const EASE: [number, number, number, number] = [0.22, 1, 0.36, 1]

/** 8A — bagian hero saat dompet bersama belum punya pasangan */
export function JointInviteFlow({
  defaultWalletName,
  onCreated,
  onSimulatePartnerJoined,
  partner = JOINT_PARTNER,
}: {
  defaultWalletName: string
  /** CTA ditekan: nama dompet disimpan & modal kode undangan dibuka */
  onCreated: (walletName: string) => void
  /** mock: pasangan langsung gabung (dipakai untuk review desain) */
  onSimulatePartnerJoined: () => void
  partner?: JointPerson
}) {
  const [walletName, setWalletName] = useState(defaultWalletName)
  const ready = walletName.trim().length > 0

  return (
    <div className="flex flex-col items-center px-1 py-6 text-center">
      {/* TODO: cute couple illustration
          Sementara: panggung emoji dua orang + hati sebagai placeholder ilustrasi. */}
      <div className="relative flex h-[132px] w-full max-w-[280px] items-center justify-center">
        <span
          aria-hidden
          className="absolute left-[12%] top-1/2 -translate-y-1/2 text-[44px] animate-[plant-sway_5s_ease-in-out_infinite]"
        >
          🧑
        </span>
        <motion.span
          aria-hidden
          animate={{ scale: [1, 1.18, 1] }}
          transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
          className="text-[34px]"
        >
          💚
        </motion.span>
        <span
          aria-hidden
          className="absolute right-[12%] top-1/2 -translate-y-1/2 text-[44px] animate-[plant-sway_5s_ease-in-out_infinite]"
        >
          👩
        </span>
        <span
          aria-hidden
          className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-hud-sage/60 to-transparent"
        />
      </div>

      <h2 className="mt-5 font-display text-[22px] font-black leading-tight tracking-tight text-ink">
        Mulai Bangun Masa Depan Bareng 💚
      </h2>
      <p className="mt-2 max-w-[380px] text-[13px] leading-relaxed text-ink/55">
        Ajak pasanganmu gabung ke dompet bersama. Kelola pengeluaran bareng tanpa drama.
      </p>

      <label className="mt-6 block w-full max-w-[380px] text-left">
        <span className="text-[12.5px] font-semibold text-ink/70">Kasih nama dompet kalian</span>
        <input
          value={walletName}
          onChange={(event) => setWalletName(event.target.value)}
          placeholder="Dompet Kita 💚"
          className="mt-2 w-full rounded-2xl bg-cream px-4 py-3.5 text-[15px] font-semibold text-ink outline-none ring-1 ring-soil/16 transition-shadow placeholder:font-medium placeholder:text-ink/25 focus:ring-2 focus:ring-forest/35"
        />
      </label>

      <button
        type="button"
        onClick={() => ready && onCreated(walletName.trim())}
        disabled={!ready}
        className={
          ready
            ? 'mt-4 inline-flex h-12 w-full max-w-[380px] items-center justify-center gap-2 rounded-2xl bg-forest text-[14px] font-bold text-mint shadow-[0_16px_32px_-20px_rgba(69,89,78,0.95)] transition-colors hover:bg-forest-soft active:scale-[0.99]'
            : 'mt-4 inline-flex h-12 w-full max-w-[380px] cursor-not-allowed items-center justify-center gap-2 rounded-2xl bg-ink/[0.07] text-[14px] font-bold text-ink/35'
        }
      >
        Buat Dompet &amp; Ajak Pasangan
        <ArrowRight className="size-4" strokeWidth={2.6} />
      </button>

      {/* jalur demo — biar state 8B & 8C tetap bisa direview tanpa 2 akun asli */}
      <button
        type="button"
        onClick={onSimulatePartnerJoined}
        className="mt-4 inline-flex items-center gap-1.5 text-[11.5px] font-semibold text-ink/35 underline decoration-dotted underline-offset-4 transition-colors hover:text-ink/60"
      >
        <HeartHandshake className="size-3.5" strokeWidth={2.3} />
        Simulasi: {partner.name} sudah bergabung
      </button>
    </div>
  )
}

/** 8B — modal kode undangan: share, salin, lalu indikator "menunggu pasangan" */
export function JointInviteCodeModal({
  open,
  onClose,
  walletName,
  onSimulateJoin,
  me = JOINT_ME,
  partner = JOINT_PARTNER,
}: {
  open: boolean
  onClose: () => void
  walletName: string
  /** mock: pasangan bergabung (pemicu selebrasi 8C) */
  onSimulateJoin: () => void
  me?: JointPerson
  partner?: JointPerson
}) {
  const [waiting, setWaiting] = useState(false)
  useBodyScrollLock(open, true)

  useEffect(() => {
    if (!open) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [open, onClose])

  /** 8B: Web Share API dulu; kalau browser tidak punya → salin ke clipboard.
   *  Pengecekan pakai `typeof` (bukan `'share' in navigator`) supaya TypeScript
   *  tidak mempersempit tipe `navigator` menjadi `never` di cabang fallback. */
  async function handleShare() {
    const text = buildInviteShareText(me.name)
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
      /* user membatalkan dialog share — bukan error, cukup diamkan */
    }
  }

  async function handleCopyCode() {
    try {
      await navigator.clipboard.writeText(INVITE_CODE)
      toast.success('Kode tersalin!')
    } catch {
      toast.error('Gagal menyalin — catat kodenya manual ya')
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
              className="max-h-[92dvh] w-full max-w-md overflow-y-auto rounded-t-[2rem] bg-[#ffffff] px-5 pb-7 pt-5 shadow-[0_-24px_60px_-24px_rgba(69,89,78,0.55)] sm:rounded-[2rem] sm:px-6 sm:shadow-[0_28px_70px_-24px_rgba(69,89,78,0.5)]"
              data-lenis-prevent
            >
              <h2 className="font-display text-xl font-black tracking-tight text-ink">
                Bagikan kode ini 💌
              </h2>
              <p className="mt-1 text-[12.5px] leading-relaxed text-ink/55">
                {partner.name} tinggal masukin kodenya buat gabung ke{' '}
                <b className="font-semibold text-ink/75">{walletName}</b>.
              </p>
              {/* kode undangan — monospace, spasi antar huruf lebar */}
              <div className="mt-4 rounded-[1.5rem] border-2 border-dashed border-hud-sage/50 bg-cream px-4 py-5 text-center">
                <p className="font-mono text-[34px] font-black leading-none tracking-[0.3em] text-ink">
                  {INVITE_CODE}
                </p>
                <p className="mt-2.5 text-[11.5px] text-ink/45">{INVITE_VALIDITY_COPY}</p>
              </div>

              <button
                type="button"
                onClick={handleShare}
                className="mt-4 inline-flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-forest text-[14px] font-bold text-mint shadow-[0_16px_32px_-20px_rgba(69,89,78,0.95)] transition-colors hover:bg-forest-soft active:scale-[0.99]"
              >
                <Share2 className="size-4" strokeWidth={2.4} />
                Bagikan Link 📤
              </button>
              <button
                type="button"
                onClick={handleCopyCode}
                className="mt-2 inline-flex h-11 w-full items-center justify-center gap-2 rounded-2xl bg-cream text-[13.5px] font-semibold text-ink ring-1 ring-soil/16 transition-colors hover:bg-cream active:scale-[0.99]"
              >
                <Copy className="size-4" strokeWidth={2.4} />
                Salin Kode
              </button>

              {/* indikator menunggu — muncul setelah link dibagikan */}
              <AnimatePresence initial={false}>
                {waiting && (
                  <motion.div
                    key="waiting"
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.3, ease: EASE }}
                    className="overflow-hidden"
                  >
                    <div className="mt-4 flex flex-col items-center rounded-[1.5rem] bg-hud-sage/15 px-4 py-4 ring-1 ring-hud-sage/35">
                      <motion.span
                        aria-hidden
                        animate={{ scale: [1, 1.2, 1] }}
                        transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
                        className="text-[26px]"
                      >
                        💚
                      </motion.span>
                      <p className="mt-2 text-[12.5px] font-semibold text-[#000000]">
                        Menunggu pasanganmu bergabung...
                      </p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              <p className="mt-4 text-center text-[11px] leading-relaxed text-ink/40">
                Pasanganmu harus punya akun CatetInd. Kalau belum, mereka bisa daftar lewat link ini
                dan dapat diskon referral! 🎁
              </p>

              {/* jalur demo menuju selebrasi 8C */}
              <button
                type="button"
                onClick={onSimulateJoin}
                className="mx-auto mt-3 flex items-center gap-1.5 text-[11px] font-semibold text-ink/30 underline decoration-dotted underline-offset-4 transition-colors hover:text-ink/55"
              >
                <Check className="size-3.5" strokeWidth={2.4} />
                Simulasi: {partner.name} sudah bergabung
              </button>
            </motion.div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

/**
 * 8C — selebrasi "partner bergabung": dua avatar berjalan saling menghampiri,
 * hati meledak di tengah, lalu halaman berpindah ke dompet bersama.
 * Overlay ini sengaja singkat (±2,5 detik) — momen, bukan layar baru.
 */
export function JointJoinedCelebration({
  open,
  onStart,
  me = JOINT_ME,
  partner = JOINT_PARTNER,
}: {
  open: boolean
  /** lanjut ke tampilan dompet bersama (dipanggil otomatis setelah 2,5 detik) */
  onStart: () => void
  me?: JointPerson
  partner?: JointPerson
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
          className="fixed inset-0 z-[80] flex flex-col items-center justify-center bg-[#ffffff] px-6 text-center"
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
              💚
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
            className="mt-6 font-display text-[22px] font-black leading-tight tracking-tight text-ink"
          >
            {partner.name} sudah bergabung! 🎉💚
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.85, duration: 0.35 }}
            className="mt-2 text-[13px] leading-relaxed text-ink/55"
          >
            Dompet bersama kalian aktif. Saldo dimulai dari Rp 0.
          </motion.p>

          <motion.button
            type="button"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1, duration: 0.35 }}
            onClick={onStart}
            className="mt-6 inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-forest px-6 text-[14px] font-bold text-mint shadow-[0_16px_32px_-20px_rgba(69,89,78,0.95)] transition-colors hover:bg-forest-soft active:scale-[0.99]"
          >
            Mulai Catat Bareng
            <ArrowRight className="size-4" strokeWidth={2.6} />
          </motion.button>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
