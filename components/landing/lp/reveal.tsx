'use client'

import { motion, useReducedMotion } from 'framer-motion'
import type { ReactNode } from 'react'

/* ── REVEAL LANDING (meniru "appear animation" Framer) ───────────────────────
   Export Framer menyimpan animasi masuk di `script[type="framer/appear"]`.
   Nilainya (dibaca dari `docs/landing/framer-spec.json` + data appear):

     elemen          initial                    transition
     ─────────────   ────────────────────────   ─────────────────────────────
     nav              opacity .001, y -80        spring bounce .2, duration 1
     heading (h1)     opacity .001, y 48, skewY 1
     pill eyebrow     opacity .001, y 24
     sub-judul        opacity .001, y 48, delay .2
     CTA              opacity .001, y 72, delay .4
     social proof     opacity .001, y 96, delay .6
     mockup           opacity .001, y 128, scale .9, delay .6

   Semuanya `once` (tidak diulang saat digulir balik) dan dimatikan untuk
   pengguna dengan `prefers-reduced-motion`. Komponen ini SATU-SATUNYA tempat
   angka itu hidup, jadi section berikutnya tinggal memanggil `<LandingReveal
   y={…} delay={…}>` dan tidak menulis ulang konfigurasi animasi. */

export type LandingRevealProps = {
  children: ReactNode
  className?: string
  /** jarak geser vertikal awal (px) — samakan dengan nilai Framer */
  y?: number
  /** jeda mulai (detik) */
  delay?: number
  /** skala awal (mockup hero memakai 0.9) */
  scale?: number
  /** skewY awal (heading hero memakai 1deg) */
  skewY?: number
  /**
   * `load`  → animasi jalan begitu halaman tampil (hero & navbar; di export
   *           Framer semua elemen hero memakai appear-on-load);
   * `view`  → animasi jalan saat elemen masuk viewport (section di bawah lipatan).
   * Default `view` karena mayoritas section memakai itu.
   */
  trigger?: 'load' | 'view'
}

/** transisi spring Framer: `type: spring, bounce: 0.2, duration: 1` */
export const LANDING_SPRING = { type: 'spring', bounce: 0.2, duration: 1 } as const

export function LandingReveal({
  children,
  className,
  y = 24,
  delay = 0,
  scale = 1,
  skewY = 0,
  trigger = 'view',
}: LandingRevealProps) {
  const reduceMotion = useReducedMotion()

  if (reduceMotion) {
    return <div className={className}>{children}</div>
  }

  const hidden = { opacity: 0, y, scale, skewY }
  const shown = { opacity: 1, y: 0, scale: 1, skewY: 0 }
  const transition = { ...LANDING_SPRING, delay }

  if (trigger === 'load') {
    return (
      <motion.div className={className} initial={hidden} animate={shown} transition={transition}>
        {children}
      </motion.div>
    )
  }

  return (
    <motion.div
      className={className}
      initial={hidden}
      whileInView={shown}
      viewport={{ once: true, amount: 0.15 }}
      transition={transition}
    >
      {children}
    </motion.div>
  )
}
