'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { recordAiUsage } from '@/lib/ai-usage-store'
import { claimsRecordedAction, detectOutOfScope } from '@/lib/ai/coach-guard'
import { buildCoachContext, buildWelcomeText, collectCoachSummary } from '@/lib/ai/coach-context'
import {
  AI_CONTEXT_WINDOW,
  AI_NOT_CONNECTED_REPLY,
  AI_NO_RECORD_REPLY,
  AI_OUT_OF_SCOPE_REPLY,
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
 * PAKET 63: balasan utama sekarang datang dari MODEL (`POST /api/ai/text`,
 * Gemini, server-side). Fungsi ini jadi JARING AMAN: dipakai saat provider tak
 * bisa dihubungi (tanpa kunci / kuota penyedia penuh / jaringan mati). Karena itu
 * ia hanya menjawab pertanyaan yang jawabannya ada di data lokal, dan setiap
 * jawabannya membawa penanda `ruleBased: true` — widget mencetak label
 * "belum pakai model" dari penanda itu, jadi user tahu ini bukan balasan model.
 *
 * Pertanyaan yang TIDAK bisa dijawab dari data lokal jatuh ke
 * `AI_NOT_CONNECTED_REPLY`: jujur soal keadaan hari ini + tombol "Hubungkan AI".
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
 * PAKET 63: balasan datang dari MODEL nyata lewat `POST /api/ai/text` (kunci
 * provider HANYA di server). Kalau provider tak bisa dihubungi, otomatis jatuh ke
 * `aiReply()` berbasis aturan lokal dengan label `ruleBased: true`.
 *
 * PAKET 80: dua pagar di depan model, keduanya dari aturan yang sama
 * (`lib/ai/coach-guard.ts`) supaya perilakunya tidak bisa berbeda dari pagar
 * server:
 *   · pesan di luar konteks keuangan → DITOLAK (`AI_OUT_OF_SCOPE_REPLY`), tanpa
 *     memanggil model;
 *   · balasan yang mengklaim sudah mencatat/menulis data → diganti
 *     `AI_NO_RECORD_REPLY`, karena model tidak punya kemampuan menulis.
 *
 * Memory: widget-nya di-mount di root layout (tidak unmount saat navigasi),
 * jadi history bertahan selama sesi dan reset saat full page refresh.
 * Sliding window: hanya 10 pesan terakhir yang disimpan (Domain 4B).
 */
export function useAIChat() {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [isTyping, setIsTyping] = useState(false)
  const [input, setInput] = useState('')
  /**
   * `null` = belum tahu · `true` = model menjawab · `false` = server tak punya
   * kunci AI. Dipakai widget untuk menampilkan banner "belum tersambung" HANYA
   * saat memang belum tersambung (bukan selalu, seperti sebelum paket 63).
   */
  const [modelConnected, setModelConnected] = useState<boolean | null>(null)
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
    setMessages((prev) => {
      if (prev.length > 0) return prev
      /* sapaan memakai angka NYATA dari data store (sisa jatah harian, saldo,
         kategori terbesar) — bukan template "Rp 150.000" (paket 65). Kalau
         ringkasan tidak bisa dibaca, jatuh ke sapaan netral tanpa angka. */
      let welcome: Omit<ChatMessage, 'id'> = PROACTIVE_WELCOME
      try {
        welcome = {
          role: 'ai',
          kind: 'coaching',
          ruleBased: true,
          content: buildWelcomeText(collectCoachSummary()),
        }
      } catch {
        welcome = PROACTIVE_WELCOME
      }
      return [{ ...welcome, id: makeId() }]
    })
  }, [])

  /**
   * Minta balasan MODEL (`POST /api/ai/text`). Kalau provider tak bisa
   * dihubungi / kuota penyedia penuh / kunci belum ada, JATUH ke balasan berbasis
   * aturan lokal — yang tetap membawa label `ruleBased` supaya user tahu ini bukan
   * model. Tidak pernah mengarang balasan yang seolah datang dari model.
   */
  const requestModelReply = useCallback(
    async (history: ChatMessage[], userText: string) => {
      try {
        /* Grounding data nyata (paket 65): kirim ringkasan angka user supaya model
           tidak mengarang jatah/saldo. Kalau ringkasan gagal dibaca, kirim string
           kosong — server tetap melarang model menyebut angka apa pun. */
        let context = ''
        try {
          context = buildCoachContext(collectCoachSummary())
        } catch {
          context = ''
        }
        const res = await fetch('/api/ai/text', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            messages: history.map((m) => ({
              role: m.role === 'user' ? 'user' : 'ai',
              content: m.content,
            })),
            context,
          }),
        })
        if (res.ok) {
          const data = (await res.json()) as { reply?: unknown; blocked?: unknown }
          /* ── PAGAR SERVER (paket 80) ─────────────────────────────────────────
             `blocked` datang dari `/api/ai/text`: `'scope'` = pertanyaan di luar
             konteks keuangan, `'claim'` = balasan model mengklaim sudah menulis
             data (padahal tidak ada baris yang tertulis). Dua-duanya diganti copy
             kanon app ini — kalimat modelnya TIDAK pernah ditampilkan. */
          if (data.blocked === 'scope') {
            setModelConnected(true)
            append(AI_OUT_OF_SCOPE_REPLY)
            return
          }
          if (data.blocked === 'claim') {
            setModelConnected(true)
            append(AI_NO_RECORD_REPLY)
            return
          }
          const reply = typeof data.reply === 'string' ? data.reply.trim() : ''
          if (reply) {
            setModelConnected(true)
            /* jaring kedua di sisi klien: kalau pagar server belum menangkapnya
               (mis. server versi lama), klaim "sudah aku catat" tetap tidak tampil */
            append(
              claimsRecordedAction(reply)
                ? AI_NO_RECORD_REPLY
                : { role: 'ai', kind: 'coaching', content: reply, ruleBased: false },
            )
            return
          }
        } else {
          const data = (await res.json().catch(() => null)) as { reason?: unknown } | null
          if (data?.reason === 'no-key') setModelConnected(false)
        }
      } catch {
        /* jaringan mati → diputuskan di bawah: balasan aturan lokal */
      }
      append(aiReply(userText))
    },
    [append],
  )

  const sendMessage = useCallback(
    (raw?: string) => {
      const text = (raw ?? input).trim()
      if (!text || isTyping) return

      /* ── GERBANG KONTEKS (paket 80) ──────────────────────────────────────────
         Pesan yang jelas di luar keuangan pribadi user DITOLAK di sini — TANPA
         memanggil model, jadi penolakannya sama setiap kali dan kuota AI user
         tidak terbakar untuk pertanyaan yang memang tidak akan dijawab
         (`recordAiUsage` hanya dipanggil untuk pesan yang benar-benar dikirim ke
         model). Aturan yang sama dipakai route server sebagai pagar terakhir. */
      if (detectOutOfScope(text)) {
        setMessages((prev) =>
          [
            ...prev,
            { id: makeId(), role: 'user' as const, kind: 'coaching' as const, content: text },
            { ...AI_OUT_OF_SCOPE_REPLY, id: makeId() },
          ].slice(-AI_CONTEXT_WINDOW),
        )
        setInput('')
        return
      }

      const history = [
        ...messages,
        { id: makeId(), role: 'user' as const, kind: 'coaching' as const, content: text },
      ].slice(-AI_CONTEXT_WINDOW)
      setMessages(history)
      setInput('')
      setIsTyping(true)
      /* METERING AI (paket 42): satu pesan = satu panggilan chat. Dihitung di
         sini — titik user benar-benar mengirim — jadi lokasinya sama walau
         balasannya sekarang datang dari model, bukan mock. */
      recordAiUsage('chat')

      /* jeda pendek supaya indikator "mengetik" terasa alami (bukan memalsukan
         kerja): panggilan model yang sesungguhnya dikirim setelahnya. */
      const delay = 350 + Math.random() * 250
      replyTimer.current = setTimeout(() => {
        void requestModelReply(history, text).finally(() => setIsTyping(false))
      }, delay)
    },
    [input, isTyping, messages, requestModelReply],
  )

  return {
    messages,
    isTyping,
    input,
    setInput,
    sendMessage,
    startConversation,
    appendMessage: append,
    modelConnected,
  }
}
