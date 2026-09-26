// ---------------------------------------------------------------------------
// Bus kecil: "buka AI Coach DARI LUAR widget" (prompt 19).
//
// Kenapa bus CustomEvent, bukan menaikkan state chat ke provider? State
// percakapan hidup di dalam `ai-chat-widget.tsx` (satu instance dipasang di root
// layout, lihat `useAIChat`). Yang dibutuhkan panel "Review Pengeluaran Hari
// Ini" cuma dua hal: buka panel chat-nya, lalu kirim SATU pertanyaan. Menambah
// provider berarti memindahkan seluruh state + UI chat ke konteks baru, dan itu
// membuka risiko dua state percakapan hidup berdampingan — persis yang dilarang
// prompt 19. Bus ini ~15 baris, nol duplikasi state, dan widget tetap pemilik
// tunggal percakapan.
//
// Kontraknya sederhana:
//   • pengirim  → `openAICoachWithSeed('Boros nggak nih hari ini?')`
//   • pemilik   → widget mendengarkan `AI_CHAT_SEED_EVENT`, membuka panel,
//                 menyemai sapaan proaktif (kalau history masih kosong), lalu
//                 mengirim pertanyaannya sebagai pesan user — persis seperti
//                 user mengetiknya sendiri.
// ---------------------------------------------------------------------------

export const AI_CHAT_SEED_EVENT = 'catetind:ai-chat-seed'

export interface AIChatSeedDetail {
  /** pertanyaan yang langsung terkirim sebagai pesan user */
  seed: string
}

/**
 * Buka AI Coach dengan pertanyaan yang sudah terisi.
 * Aman dipanggil kapan pun — saat SSR (belum ada `window`) fungsinya no-op.
 */
export function openAICoachWithSeed(seed: string): void {
  if (typeof window === 'undefined') return
  window.dispatchEvent(
    new CustomEvent<AIChatSeedDetail>(AI_CHAT_SEED_EVENT, { detail: { seed } }),
  )
}
