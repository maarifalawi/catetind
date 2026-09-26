'use client'

import { useEffect, useRef, useState } from 'react'

/** aturan increment FOMO per tier (min = max → increment tetap) */
export type FomoRule = {
  /** nilai awal counter (base count) */
  base: number
  /** increment minimum, inklusif */
  min: number
  /** increment maximum, inklusif */
  max: number
}

/** angka bulat acak inklusif dua sisi — dipakai timer & increment FOMO */
export function randomInt(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

function seedCounts<Id extends string>(rules: Record<Id, FomoRule>) {
  const seeded: Partial<Record<Id, number>> = {}
  for (const id of Object.keys(rules) as Id[]) {
    seeded[id] = rules[id].base
  }
  return seeded
}

/**
 * Simulasi "live purchase feed" buat counter "X orang telah berlangganan".
 *
 * - Tiap 3–8 detik satu event beli masuk: SATU tier acak yang bertambah, dengan
 *   increment sesuai aturan tier itu (mis. tier 1 selalu +2, tier 2 +3..7).
 * - `active` = false (modal tertutup) → timer berhenti, tidak ada state update,
 *   jadi tidak ada kerja sia-sia saat modal tidak dilihat.
 * - Nilai awal SELALU deterministik (= base), jadi render server & klien sama
 *   dan tidak ada hydration mismatch; angka acak baru muncul setelah mount.
 * - `flashId` = tier yang baru bertambah, buat memicu animasi pop singkat.
 */
export function useFomoCounter<Id extends string>(
  rules: Record<Id, FomoRule>,
  active: boolean,
): { counts: Partial<Record<Id, number>>; flashId: Id | null } {
  const [counts, setCounts] = useState<Partial<Record<Id, number>>>(() => seedCounts(rules))
  const [flashId, setFlashId] = useState<Id | null>(null)

  /* rules dibaca dari ref supaya identity object baru dari parent tidak
     me-restart effect (timer tidak ke-reset tiap re-render) */
  const rulesRef = useRef(rules)
  rulesRef.current = rules

  useEffect(() => {
    if (!active) return

    let timer: ReturnType<typeof setTimeout>

    function tick() {
      const ids = Object.keys(rulesRef.current) as Id[]
      const id = ids[randomInt(0, ids.length - 1)]
      const rule = id ? rulesRef.current[id] : undefined

      if (id && rule) {
        const step = randomInt(rule.min, rule.max)
        setCounts((prev) => ({ ...prev, [id]: (prev[id] ?? rule.base) + step }))
        setFlashId(id)
      }

      timer = setTimeout(tick, randomInt(3_000, 8_000))
    }

    timer = setTimeout(tick, randomInt(3_000, 8_000))
    return () => clearTimeout(timer)
  }, [active])

  /* flash cuma sebentar — angka balik normal setelah ~0,6 detik */
  useEffect(() => {
    if (!flashId) return
    const timer = setTimeout(() => setFlashId(null), 600)
    return () => clearTimeout(timer)
  }, [flashId])

  return { counts, flashId }
}
