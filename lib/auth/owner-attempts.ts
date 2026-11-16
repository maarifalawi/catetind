import type { NextRequest } from 'next/server'

/* ── PEMBATAS PERCOBAAN KODE OWNER (dipindah dari route) ─────────────────────
   Sebelumnya penghitung ini hidup di dalam `app/api/auth/owner/route.ts` dan
   diekspor sebagai `resetOwnerAttemptsForTest`. Ekspor tambahan di file `route`
   ilegal menurut validator Next (webpack): tipe route hanya boleh mengekspor
   handler + opsi segmen. Pindah ke modul ini membuat route bersih dan tetap
   bisa di-reset oleh tes. */

/** 10 percobaan per 10 menit per alamat IP — kode owner hanya 6 angka */
const ATTEMPT_LIMIT = 10
const ATTEMPT_WINDOW_MS = 10 * 60 * 1000
/** batas kasar supaya Map tidak tumbuh tanpa henti di proses yang hidup lama */
const ATTEMPT_KEYS_LIMIT = 500

const attempts = new Map<string, number[]>()

export function callerKey(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for') ?? ''
  const first = forwarded.split(',')[0]?.trim()
  return first || request.headers.get('x-real-ip')?.trim() || 'unknown'
}

/** catat percobaan; `false` = sudah lewat batas */
export function allowAttempt(key: string, now = Date.now()): boolean {
  const recent = (attempts.get(key) ?? []).filter((time) => now - time < ATTEMPT_WINDOW_MS)
  if (recent.length >= ATTEMPT_LIMIT) {
    attempts.set(key, recent)
    return false
  }
  recent.push(now)
  attempts.set(key, recent)
  if (attempts.size > ATTEMPT_KEYS_LIMIT) {
    attempts.forEach((times, entry) => {
      const fresh = times.filter((time) => now - time < ATTEMPT_WINDOW_MS)
      if (fresh.length === 0) attempts.delete(entry)
      else attempts.set(entry, fresh)
    })
  }
  return true
}

/** kosongkan penghitung percobaan (dipakai tes) */
export function resetOwnerAttempts(): void {
  attempts.clear()
}
