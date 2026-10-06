/* ── PEMBATAS LAJU PANGGILAN AI (per-instance) ───────────────────────────────
   Provider AI (paket gratis) membatasi beberapa permintaan per menit, dan satu
   instance app melayani banyak user. Pembatas ini mencegah satu user memborong
   jatah itu — murni pelindung, bukan penagih kuota (kuota user sudah dicatat di
   `ai_usage` lewat `recordAiUsage`).

   BATAS JUJUR: hitungannya hidup di memory PROSES ini saja, jadi di banyak
   instance (mis. serverless) batas sebenarnya lebih longgar. Sama seperti rate
   limit push (`app/api/push/store.ts`) — batas ini ditulis apa adanya, bukan
   diklaim sempurna. */

const WINDOW_MS = 60_000
const DEFAULT_MAX_PER_MINUTE = 10
/** batas jumlah entri supaya memory tidak tumbuh tanpa batas di proses panjang */
const MAX_KEYS = 5_000

const hits = new Map<string, number[]>()

/** `true` = panggilan boleh jalan; mencatat waktu panggilan saat mengizinkan */
export function allowAiCall(userId: string, maxPerMinute = DEFAULT_MAX_PER_MINUTE): boolean {
  const now = Date.now()
  const recent = (hits.get(userId) ?? []).filter((at) => now - at < WINDOW_MS)
  if (recent.length >= maxPerMinute) {
    hits.set(userId, recent)
    return false
  }
  recent.push(now)
  hits.set(userId, recent)
  /* buang entri paling tua kalau peta kebesaran (jarang, tapi proses bisa hidup lama) */
  if (hits.size > MAX_KEYS) {
    const oldest = hits.keys().next().value
    if (oldest !== undefined) hits.delete(oldest)
  }
  return true
}

/** test memakai ini supaya tiap kasus mulai bersih */
export function resetAiRateLimit(): void {
  hits.clear()
}
