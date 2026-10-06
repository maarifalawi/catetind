'use client'

import { useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { Sparkles } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useBodyScrollLock } from '@/hooks/use-body-scroll-lock'
import { PlantIllustration, STAGE_NAMES, type PlantStage } from './plant-illustration'
import { ConfettiOverlay, CONFETTI_DURATION_MS } from './confetti-overlay'
import { CELEBRATION_COPY, triggerMilestoneHaptic, type Milestone } from '@/lib/data/milestones'

/* ── Milestone Celebration (inventaris #k · PRD 1819–1823, 2024–2033) ────────
   Overlay PENUH ini adalah puncak loop kebiasaan: satu momen untuk merasa
   dihargai. Isinya sengaja cuma empat hal — tanaman versi terbaru, judul
   milestone, SATU kalimat personal, dan tombol "Lanjut".

   Pagar yang dipegang di sini:
   - TIDAK ada poin, badge generik, papan peringkat, atau angka streak besar.
     Satu-satunya "angka" adalah hari aktif di dalam kalimat apresiasi — sama
     seperti contoh kanon PRD 2062.
   - TIDAK ada copy menghukum: kalimat "streak-mu putus" dilarang muncul ke sini.
     Semua kalimat datang dari template di `lib/data/milestones.ts` (nol API).
   - Overlay TIDAK memblokir aplikasi sampai animasi selesai: tombol "Lanjut"
     bisa langsung ditekan, Escape & tap backdrop juga menutup, dan overlay
     auto-dismiss setelah ~2.5 detik (durasi confetti kanon).
   - Haptic dijalankan HANYA lewat `triggerMilestoneHaptic()` yang menyaring
     dukungan browser — iOS Safari PWA tidak punya Vibration API (PRD 566).
   - Tap target utama ada di zona ibu jari: di mobile kartunya menempel BAWAH
     layar (`justify-end`), di desktop baru di tengah (PRD 2141–2145).
   ─────────────────────────────────────────────────────────────────────────── */

/** cubic-bezier khas app: masuk cepat lalu settle lembut */
const EASE: [number, number, number, number] = [0.22, 1, 0.36, 1]

export function MilestoneCelebration({
  open,
  milestone,
  onClose,
}: {
  open: boolean
  /** perayaan yang sedang dirayakan — `null` = belum ada yang layak */
  milestone: Milestone | null
  onClose: () => void
}) {
  const continueRef = useRef<HTMLButtonElement>(null)
  const [reduceMotion, setReduceMotion] = useState(false)

  /* `onClose` disimpan di ref supaya timer auto-dismiss tidak di-reset tiap kali
     parent render ulang (HomeScreen menutup beberapa overlay lain di waktu yang
     sama, jadi identitas callback-nya bisa berubah). */
  const closeRef = useRef(onClose)
  useEffect(() => {
    closeRef.current = onClose
  }, [onClose])

  /* overlay ini menutup seluruh viewport → kunci scroll di semua ukuran layar */
  useBodyScrollLock(open)

  useEffect(() => {
    setReduceMotion(window.matchMedia('(prefers-reduced-motion: reduce)').matches)
  }, [])

  useEffect(() => {
    if (!open) return

    /* aksi primer langsung siap: overlay tidak menahan user sampai animasi selesai */
    continueRef.current?.focus()
    /* getaran itu bonus — `triggerMilestoneHaptic` memastikan tidak error di
       perangkat yang tidak mendukungnya (mis. iOS Safari PWA) */
    triggerMilestoneHaptic()

    const timer = window.setTimeout(() => closeRef.current(), CONFETTI_DURATION_MS)
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') closeRef.current()
    }
    window.addEventListener('keydown', onKey)

    return () => {
      window.clearTimeout(timer)
      window.removeEventListener('keydown', onKey)
    }
  }, [open, milestone?.id])

  if (!open || !milestone) return null

  const stage = milestone.plantStage as PlantStage

  return (
    <div className="fixed inset-0 z-[80] flex flex-col justify-end overflow-hidden p-4 sm:items-center sm:justify-center sm:p-6">
      {/* backdrop — tombol, jadi tap di mana saja juga menutup perayaan */}
      <button
        type="button"
        aria-label={CELEBRATION_COPY.closeBackdropLabel}
        onClick={onClose}
        className="absolute inset-0 cursor-default bg-ink/60"
      />

      {/* confetti penuh layar — berhenti sendiri setelah ~2.5 detik */}
      <ConfettiOverlay />

      <motion.div
        role="dialog"
        aria-modal="true"
        aria-label={CELEBRATION_COPY.dialogLabel}
        initial={reduceMotion ? { opacity: 1 } : { opacity: 0, y: 24, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={reduceMotion ? { duration: 0 } : { duration: 0.5, ease: EASE }}
        className={cn(
          'relative z-20 w-full max-w-sm rounded-[2rem] bg-cream px-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-5 text-center shadow-[0_28px_70px_-24px_rgba(0,0,0,0.45)] ring-1 ring-soil/12',
        )}
      >
        {/* tanaman versi terbaru + glow mint lembut di belakangnya */}
        <div className="relative flex justify-center rounded-2xl bg-gradient-to-b from-sage/60 to-cream pb-1 pt-4 ring-1 ring-soil/8">
          <span
            aria-hidden
            className="pointer-events-none absolute bottom-6 h-20 w-40 rounded-full bg-mint/25 blur-2xl"
          />
          <PlantIllustration stage={stage} className="relative w-36" />
        </div>

        {/* tahap tanaman sebagai baris teks kecil — bukan badge generik */}
        <p className="mt-4 text-[10.5px] font-medium uppercase tracking-[0.14em] text-forest/40">
          {CELEBRATION_COPY.stageCaption(STAGE_NAMES[stage])}
        </p>

        <h2 className="mt-1.5 font-display text-2xl font-medium leading-tight tracking-tight text-forest">
          {milestone.title}
        </h2>

        {/* SATU pesan personal — template dari lib/data/milestones.ts, nol API */}
        <p className="mx-auto mt-2.5 max-w-[34ch] text-[14px] leading-relaxed text-forest/65">
          {milestone.message}
        </p>

        <button
          ref={continueRef}
          type="button"
          onClick={onClose}
          className="mt-5 flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-b from-forest-soft to-forest text-[14px] font-medium text-cream shadow-[0_14px_28px_-14px_rgba(69,89,78,0.85)] transition-all hover:brightness-[1.08] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-forest/40 active:scale-[0.99] motion-reduce:transition-none"
        >
          {CELEBRATION_COPY.continueLabel}
          <Sparkles className="size-4" strokeWidth={2.4} aria-hidden />
        </button>

        <p className="mt-3 text-[10.5px] leading-relaxed text-forest/40">{CELEBRATION_COPY.footnote}</p>
      </motion.div>
    </div>
  )
}
