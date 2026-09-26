/* ── Kuota AI (mock) — satu sumber angka untuk widget "Bahan Bakar AI" ────────
   Dipakai kartu di sidebar desktop (components/catetind/ai-fuel-card.tsx).

   Framing selalu SISA ("tanki bensin"), bukan hitungan limit: tidak ada kata
   habis/limit dan tidak ada warna merah — kanon PRD Domain 2B.2 & 5C.
   Angka di bawah masih mock; begitu endpoint usage asli siap, cukup ganti nilai
   di file ini (komponennya cuma membaca turunan dari sini). */

export const AI_PLAN_NAME = 'CatetInd+'
/** hari menuju reset kuota dasar bulanan (base quota) — add-on tidak hangus */
export const AI_QUOTA_RESET_DAYS = 12

/** estimasi 1 transaksi hasil AI (parse teks/struk + auto-kategori) ≈ 400 token */
export const AI_TOKENS_PER_RECORD = 400

/** meter token: angka kasar ala "5 jt token" (bukan angka rupiah) */
export const AI_TOKEN_METER = { used: 11_900, limit: 5_000_000 } as const
/** meter voice note (detik) — 6 jam per bulan */
export const AI_VOICE_METER = { usedSeconds: 13, limitSeconds: 6 * 60 * 60 } as const

/** 11 900 → "11,9 rb" · 4 988 100 → "4,99 jt" · 950 → "950" */
export function compactNumber(value: number): string {
  const trim = (n: number) => n.toLocaleString('id-ID', { maximumFractionDigits: n < 10 ? 2 : 1 })
  if (value >= 1_000_000) return `${trim(value / 1_000_000)} jt`
  if (value >= 1_000) return `${trim(value / 1_000)} rb`
  return `${Math.round(value)}`
}

/** persentase TERPAKAI dengan satu desimal (11 900 / 5 jt → 0,2) */
export function usedPercent(used: number, limit: number): number {
  if (limit <= 0) return 0
  return Math.round((used / limit) * 1000) / 10
}

/** persentase SISA kuota (0–100, satu desimal) — angka yang selalu ditonjolkan */
export function remainingPercent(used: number, limit: number): number {
  return Math.round((100 - usedPercent(used, limit)) * 10) / 10
}

/** sisa token diterjemahkan ke nilai yang user rasakan, bukan angka teknis */
export function estimateRecords(remainingTokens: number): number {
  return Math.max(0, Math.floor(remainingTokens / AI_TOKENS_PER_RECORD))
}

/** 13 → "13 dtk" · 21 540 → "5 j 59 m" · 7200 → "2 j" */
export function formatDuration(totalSeconds: number): string {
  const s = Math.max(0, Math.round(totalSeconds))
  const hours = Math.floor(s / 3600)
  const minutes = Math.floor((s % 3600) / 60)
  if (hours) return minutes ? `${hours} j ${minutes} m` : `${hours} j`
  if (minutes) return `${minutes} m`
  return `${s} dtk`
}
