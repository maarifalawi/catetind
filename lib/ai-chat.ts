// ---------------------------------------------------------------------------
// AI Coach CatetInd — kontrak data & konten mock (Domain 4B, DeepSeek V3).
// Semua copy AI Coach dikumpulkan di sini supaya hook (use-ai-chat) dan widget
// (ai-chat-widget) pakai satu sumber kebenaran — nanti tinggal diganti respons
// asli dari /api/ai/text tanpa menyentuh UI.
// ---------------------------------------------------------------------------

/** Siapa pengirim pesan */
export type ChatRole = 'user' | 'ai'

/**
 * Jenis pesan AI (Domain 3C):
 * - 'coaching'     → jawaban/coaching biasa
 * - 'appreciation' → pujian acak setelah user mencatat transaksi;
 *                    dapat treatment visual beda (highlight sage + sparkle)
 */
export type AIMessageKind = 'coaching' | 'appreciation'

/** Tombol aksi inline di dalam bubble AI (Quick Actions, Domain 4B) */
export interface ChatAction {
  label: string
  // TODO: Connect to budget creation API — arahkan ke flow "+ Budget Baru" (Domain 2B)
}

export interface ChatMessage {
  id: string
  role: ChatRole
  kind: AIMessageKind
  content: string
  action?: ChatAction
}

/** Domain 4B — sliding window: maks 10 pesan terakhir sebagai context window */
export const AI_CONTEXT_WINDOW = 10

/** Sisa kuota AI bulan ini (mock) — dirender sebagai Fuel Gauge di header panel */
export const AI_QUOTA_REMAINING = 67

/** C. Sapaan proaktif saat panel pertama dibuka — refer ke kondisi finansial user, bukan "Hello!" generik */
export const PROACTIVE_WELCOME: Omit<ChatMessage, 'id'> = {
  role: 'ai',
  kind: 'coaching',
  content:
    "Halo Jon! Sisa jatah kamu hari ini Rp 150.000 — masih aman nih. Btw, pengeluaran 'Kopi' minggu ini naik 35% dari minggu lalu. Mau aku bantu atur ulang limit jajan? ☕",
}

/** C. Quick-suggestion chips di bawah sapaan — tap = kirim sebagai pesan user */
export const QUICK_REPLIES = [
  'Analisis pengeluaran minggu ini',
  'Tips hemat bulan ini',
  'Bantu atur ulang budget',
  'Ceritain kondisi keuangan gue',
] as const

/** G. Balasan generik selama API asli belum disambungkan */
export const MOCK_FALLBACK_REPLY =
  'Fitur AI Coach sedang dalam pengembangan. Nanti aku bisa bantu analisis keuanganmu secara real-time! 🌿'

/** D. Demo Quick Action — dipicu chip "Bantu atur ulang budget" */
export const MOCK_LIMIT_REPLY: Omit<ChatMessage, 'id'> = {
  role: 'ai',
  kind: 'coaching',
  content:
    'Pengeluaran kopi kamu Rp 350.000 bulan ini. Mau aku buatin limit khusus buat kategori Kopi?',
  action: { label: 'Buat Limit Kopi Rp 200.000/bulan' },
}

/** E. Demo pesan Appreciation — di production dipicu event "transaksi tercatat" */
export const MOCK_APPRECIATION_REPLY: Omit<ChatMessage, 'id'> = {
  role: 'ai',
  kind: 'appreciation',
  content:
    'Makasih udah mau cerita, Jon! Ngomongin duit itu nggak gampang — dan kamu udah ambil langkah paling penting 💚',
}
