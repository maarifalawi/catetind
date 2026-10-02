'use client'

import { useSyncExternalStore } from 'react'
import { readNudgeState, seedNudgeState, subscribeNudge, type NudgeState } from '@/lib/nudge-store'

/**
 * State nudge (banner Home + nudge harian) yang BERTAHAN lintas reload tanpa
 * flicker. Dibaca lewat `useSyncExternalStore` supaya HTML server dan render
 * pertama client memakai titik berangkat yang sama (`seedNudgeState`), lalu
 * nilainya pindah ke yang tersimpan di localStorage SAAT hidrasi — bukan sesudah
 * cat pertama lewat `useEffect` (pola lama itu yang bikin banner "pop-in").
 *
 * Lihat `lib/nudge-store.ts` untuk alasan `shownAtLoad` sengaja dibekukan.
 */
export function useNudgeState(): NudgeState {
  return useSyncExternalStore(subscribeNudge, readNudgeState, seedNudgeState)
}
