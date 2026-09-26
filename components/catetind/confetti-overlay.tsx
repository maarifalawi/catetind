'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'

/**
 * Confetti ringan untuk Milestone Celebration (inventaris #k).
 *
 * Kenapa bukan Lottie: repo ini TIDAK memakai Lottie (CONTEXT §2 — resolusinya
 * SVG + Framer Motion). Confetti 2.5 detik di inventaris digantikan 24 partikel
 * `div` yang dianimasikan Framer Motion: nol dependency baru, nol aset biner.
 *
 * Tiga hal yang dijamin di sini:
 *   1. DURASI kanon ~2.5 detik (`CONFETTI_DURATION_MS`, sama dengan durasi
 *      auto-dismiss overlay) lalu partikel DI-UNMOUNT — bukan animasi abadi yang
 *      terus membakar CPU di belakang overlay.
 *   2. `prefers-reduced-motion: reduce` → partikel tetap TAMPIL tapi DIAM
 *      (versi statis, tersebar di layar): user tetap dapat tanda "ini momen
 *      spesial" tanpa gerakan yang bisa mengganggu.
 *   3. Warna HANYA token palet (mint · brand · hud-sage · hud-amber · plum ·
 *      thistle) — tidak ada hex/rgb baru di sini.
 *
 * Komponen ini `absolute inset-0` + `pointer-events-none`: ia menempel pada
 * overlay induknya dan tidak pernah mencuri tap. Karena itu ia dipasang DI DALAM
 * kartu perayaan, bukan sebagai layer `fixed` sendiri.
 */

/** durasi total — inventaris #k: "Lottie confetti (2.5 detik)" */
export const CONFETTI_DURATION_MS = 2500

/** partikel berhenti sedikit lebih awal dari auto-dismiss → layar ber-"settle" */
const FALL_DURATION_S = 2.1

/** tone partikel — semuanya token palet */
const TONES = ['bg-mint', 'bg-brand', 'bg-hud-sage', 'bg-hud-amber', 'bg-plum', 'bg-thistle'] as const

interface ConfettiPiece {
  left: number
  delay: number
  fall: number
  drift: number
  rotate: number
  tone: string
  shape: string
  /** posisi vertikal versi statis (reduce-motion) supaya tidak menumpuk di atas */
  restY: number
}

/**
 * Posisi & ukuran partikel DIHITUNG dengan rumus deterministik, bukan
 * `Math.random()` — supaya HTML server & render pertama client identik (pola
 * yang sama dengan `BloomConfetti` di goal-detail-screen.tsx). Variasi tetap
 * terasa karena setiap partikel memakai pengali yang berbeda.
 */
const PIECES: ConfettiPiece[] = Array.from({ length: 24 }, (_, i) => ({
  left: (i * 37 + 6) % 94,
  delay: (i % 8) * 0.07,
  fall: 260 + ((i * 53) % 200),
  drift: ((i * 47) % 96) - 48,
  rotate: 180 + ((i * 61) % 360),
  tone: TONES[i % TONES.length],
  shape: i % 2 === 0 ? 'h-2.5 w-1.5 rounded-[2px]' : 'size-2 rounded-full',
  restY: 48 + ((i * 71) % 240),
}))

export function ConfettiOverlay({ className }: { className?: string }) {
  /* preferensi aksesibilitas dibaca SETELAH mount (pola goal-detail-screen.tsx
     & use-count-up.ts): render server & render pertama client identik dulu, baru
     versinya disesuaikan — jadi tidak pernah ada hydration mismatch. */
  const [still, setStill] = useState(false)
  /** true = sudah lewat durasi kanon, partikel berhenti & tidak dirender lagi */
  const [finished, setFinished] = useState(false)

  useEffect(() => {
    setStill(window.matchMedia('(prefers-reduced-motion: reduce)').matches)
  }, [])

  useEffect(() => {
    const timer = window.setTimeout(() => setFinished(true), CONFETTI_DURATION_MS)
    return () => window.clearTimeout(timer)
  }, [])

  if (finished) return null

  return (
    <div
      aria-hidden
      className={cn('pointer-events-none absolute inset-0 overflow-hidden', className)}
    >
      {PIECES.map((piece, index) => (
        <motion.span
          key={index}
          className={cn('absolute top-0 block', piece.shape, piece.tone)}
          style={{ left: `${piece.left}%` }}
          initial={
            still
              ? { opacity: 0.85, y: piece.restY, rotate: piece.rotate }
              : { opacity: 0, y: -24, scale: 0.6 }
          }
          animate={
            still
              ? { opacity: 0.85, y: piece.restY, rotate: piece.rotate }
              : {
                  opacity: [0, 1, 1, 0],
                  y: piece.fall,
                  x: piece.drift,
                  rotate: piece.rotate,
                  scale: 1,
                }
          }
          transition={
            still ? { duration: 0 } : { duration: FALL_DURATION_S, delay: piece.delay, ease: 'easeOut' }
          }
        />
      ))}
    </div>
  )
}
