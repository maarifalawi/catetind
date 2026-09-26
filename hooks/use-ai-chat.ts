'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import {
  AI_CONTEXT_WINDOW,
  MOCK_APPRECIATION_REPLY,
  MOCK_FALLBACK_REPLY,
  MOCK_LIMIT_REPLY,
  MOCK_SPENDING_REVIEW_REPLY,
  PROACTIVE_WELCOME,
  type ChatMessage,
} from '@/lib/ai-chat'

let nextId = 0
const makeId = () => `msg-${++nextId}`

/**
 * Routing mock — meniru intent detection keyword sederhana dari Domain 4B
 * (zero API cost). Menentukan mock reply mana yang keluar per pesan user.
 */
function mockReply(userText: string): Omit<ChatMessage, 'id'> {
  const t = userText.toLowerCase()
  /* prompt 19 — seed dari panel "Review Pengeluaran Hari Ini" ("boros nggak nih
     hari ini?") dicek DULU: kalau jatuh ke pola 'budget', balasannya jadi demo
     Quick Action yang tidak nyambung dengan panel yang baru ditutup. */
  if (/(boros|pengeluaran hari ini|review pengeluaran)/.test(t)) return MOCK_SPENDING_REVIEW_REPLY
  if (/(budget|limit|kopi|atur ulang)/.test(t)) return MOCK_LIMIT_REPLY // demo Quick Action (D)
  if (/(ceritain|kondisi)/.test(t)) return MOCK_APPRECIATION_REPLY // demo Appreciation (E)
  return { role: 'ai', kind: 'coaching', content: MOCK_FALLBACK_REPLY }
}

/**
 * useAIChat — state & logic percakapan AI Coach.
 *
 * Sengaja dipisah dari UI supaya API asli tinggal "dicolok" di sini:
 * ganti isi mockReply/setTimeout di sendMessage dengan fetch ke endpoint,
 * tanpa mengubah ai-chat-widget sama sekali.
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

      // Simulasi "thinking" 1–1.5 detik sebelum AI membalas
      const delay = 1000 + Math.random() * 500
      replyTimer.current = setTimeout(() => {
        // TODO: Connect to DeepSeek V3 via /api/ai/text endpoint.
        // See domain4_prd.md section 4B for system prompt and context window management.
        append(mockReply(text))
        setIsTyping(false)
      }, delay)
    },
    [append, input, isTyping],
  )

  return { messages, isTyping, input, setInput, sendMessage, startConversation, appendMessage: append }
}
