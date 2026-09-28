'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { recordAiUsage } from '@/lib/ai-usage-store'
import {
  AI_CONTEXT_WINDOW,
  AI_NOT_CONNECTED_REPLY,
  MOCK_APPRECIATION_REPLY,
  MOCK_LIMIT_REPLY,
  MOCK_SPENDING_REVIEW_REPLY,
  PROACTIVE_WELCOME,
  type ChatMessage,
} from '@/lib/ai-chat'

let nextId = 0
const makeId = () => `msg-${++nextId}`

/**
 * Routing berbasis ATURAN LOKAL — meniru intent detection keyword sederhana dari
 * Domain 4B (zero API cost), TANPA memanggil model.
 *
 * KEPUTUSAN PAKET 44 (§AI, opsi b): model LLM belum disambungkan karena app ini
 * belum punya API key provider, dan kunci itu tidak boleh dikarang di repo demo
 * (`§AI` opsi a menuntut key disimpan server-side di `.env.local` oleh pemilik
 * produk). Karena itu fungsi ini SENGAJA hanya menjawab pertanyaan yang
 * jawabannya ada di data lokal, dan setiap jawabannya membawa penanda
 * `ruleBased: true` — widget mencetak label "belum pakai model" dari penanda itu.
 *
 * Pertanyaan yang TIDAK bisa dijawab dari data lokal jatuh ke
 * `AI_NOT_CONNECTED_REPLY`: jujur soal keadaan hari ini + tombol "Hubungkan AI".
 *
 * Kalau nanti provider disambungkan, ganti isi `aiReply()` dengan
 * `fetch('/api/ai/text')` — bentuk pesannya sudah sama.
 */
function aiReply(userText: string): Omit<ChatMessage, 'id'> {
  const t = userText.toLowerCase()
  /* prompt 19 — seed dari panel "Review Pengeluaran Hari Ini" ("boros nggak nih
     hari ini?") dicek DULU: kalau jatuh ke pola 'budget', balasannya jadi demo
     Quick Action yang tidak nyambung dengan panel yang baru ditutup. */
  if (/(boros|pengeluaran hari ini|review pengeluaran)/.test(t)) return MOCK_SPENDING_REVIEW_REPLY
  if (/(budget|limit|kopi|atur ulang)/.test(t)) return MOCK_LIMIT_REPLY // demo Quick Action (D)
  if (/(ceritain|kondisi)/.test(t)) return MOCK_APPRECIATION_REPLY // demo Appreciation (E)
  return AI_NOT_CONNECTED_REPLY
}

/**
 * useAIChat — state & logic percakapan AI Coach.
 *
 * Sengaja dipisah dari UI supaya provider asli tinggal "dicolok" di sini:
 * ganti isi `aiReply()` (dan timer 1–1.5 detiknya) dengan `fetch('/api/ai/text')`,
 * tanpa mengubah ai-chat-widget sama sekali.
 *
 * PAKET 44: balasan yang keluar dari sini masih berbasis ATURAN LOKAL (belum ada
 * model — lihat catatan di `aiReply`), dan penandanya (`ruleBased`) ikut sampai
 * ke UI supaya label "belum pakai model" tidak bisa lupa dipasang.
 *
 * Memory: widget-nya di-mount di root layout (tidak unmount saat navigasi),
 * jadi history bertahan selama sesi dan reset saat full page refresh.
 * Sliding window: hanya 10 pesan terakhir yang disimpan (Domain 4B).
 */
export function useAIChat() {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [isTyping, setIsTyping] = useState(false)
  const [input, setInput] = useState('')
  const replyTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // bersihkan timer kalau komponen unmount di tengah "thinking"
  useEffect(
    () => () => {
      if (replyTimer.current) clearTimeout(replyTimer.current)
    },
    [],
  )

  const append = useCallback((msg: Omit<ChatMessage, 'id'>) => {
    setMessages((prev) =>
      [...prev, { ...msg, id: makeId() }].slice(-AI_CONTEXT_WINDOW),
    )
  }, [])

  /** Dipanggil saat panel dibuka — seed sapaan proaktif hanya kalau history masih kosong */
  const startConversation = useCallback(() => {
    setMessages((prev) =>
      prev.length > 0 ? prev : [{ ...PROACTIVE_WELCOME, id: makeId() }],
    )
  }, [])

  const sendMessage = useCallback(
    (raw?: string) => {
      const text = (raw ?? input).trim()
      if (!text || isTyping) return

      append({ role: 'user', kind: 'coaching', content: text })
      setInput('')
      setIsTyping(true)
      /* METERING AI (paket 42): satu pesan = satu panggilan chat. Dihitung di
         sini (titik user benar-benar mengirim), bukan di mock reply — kalau
         nanti diganti `POST /api/ai/text`, tempatnya tetap sama. */
      recordAiUsage('chat')

      // Simulasi "thinking" 1–1.5 detik sebelum balasan aturan lokal keluar.
      // Saat provider LLM disambungkan (paket lanjutan, butuh API key di server):
      // ganti `append(aiReply(text))` dengan `POST /api/ai/text`, dan pakai
      // `AI_CAPTURE_COPY.saveFailed` sebagai state gagal yang sudah ada.
      const delay = 1000 + Math.random() * 500
      replyTimer.current = setTimeout(() => {
        append(aiReply(text))
        setIsTyping(false)
      }, delay)
    },
    [append, input, isTyping],
  )

  return { messages, isTyping, input, setInput, sendMessage, startConversation, appendMessage: append }
}
