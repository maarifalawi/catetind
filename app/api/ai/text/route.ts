import { NextRequest, NextResponse } from 'next/server'
import { aiCallerId } from '@/lib/ai/caller'
import { aiConfigured, generateText, textModel, type ChatTurn } from '@/lib/ai/provider'
import { COACH_SYSTEM_PROMPT } from '@/lib/ai/prompts'
import { allowAiCall } from '@/lib/ai/rate-limit'

/* ── POST /api/ai/text — balasan AI Coach (Domain 4B) ────────────────────────
   Identitas pemanggil dibaca `aiCallerId()` (lihat `lib/ai/caller.ts`): sesi
   Supabase kalau ada, kalau tidak identitas anonim per-jaringan. Body:
   `{ messages: [{ role: 'user' | 'ai', content: string }] }` — bentuk yang sudah
   dipakai widget, jadi UI tidak perlu diubah.

   Balasan:
     { ok:true, reply, model, ruleBased:false }                  → 200
     { ok:false, reason, error }                                 → 400/422/429/503

   `reason` dipakai UI untuk memutuskan fallback JUJUR (aturan lokal) saat provider
   tidak bisa dihubungi — bukan untuk mengarang balasan model. */

export const dynamic = 'force-dynamic'

/** konteks percakapan maksimum yang dikirim ke model (Domain 4B: sliding window 10) */
const MAX_TURNS = 10

interface IncomingMessage {
  role?: unknown
  content?: unknown
}

export async function POST(req: NextRequest) {
  const callerId = aiCallerId(req)

  if (!aiConfigured()) {
    return NextResponse.json(
      { ok: false, reason: 'no-key', error: 'AI belum tersambung di server ini.' },
      { status: 503 },
    )
  }

  if (!allowAiCall(callerId)) {
    return NextResponse.json(
      { ok: false, reason: 'rate-limit', error: 'Kebanyakan pesan sekaligus — tunggu sebentar ya 🌿' },
      { status: 429 },
    )
  }

  let body: { messages?: unknown; context?: unknown }
  try {
    body = (await req.json()) as { messages?: unknown; context?: unknown }
  } catch {
    return NextResponse.json(
      { ok: false, reason: 'invalid', error: 'Body permintaan harus JSON.' },
      { status: 400 },
    )
  }

  /* ── GROUNDING DATA NYATA (paket 65 · Tugas D) ───────────────────────────────
     Klien mengirim ringkasan angka yang BENAR-BENAR ada di data user (pemasukan/
     pengeluaran bulan ini, kategori teratas, sisa jatah harian, dompet, hutang,
     celengan). Angka itu disisipkan ke prompt sistem supaya model TIDAK
     mengarang jatah/saldo — kalau ringkasannya kosong, model diberi tahu tegas
     bahwa ia tidak punya angka dan harus bilang belum tahu, bukan menebak. */
  const contextText =
    typeof body.context === 'string' ? body.context.trim().slice(0, 2000) : ''
  const system = contextText
    ? `${COACH_SYSTEM_PROMPT}

## DATA USER (HANYA ini yang boleh kamu sebut sebagai angka)
${contextText}

ATURAN ANGKA: Jangan pernah menyebut nominal saldo, jatah harian, atau kategori
yang TIDAK ada di daftar DATA USER di atas — kalau tidak ada, katakan belum
tersedia. Jangan mengaku sudah mencatat/menjalankan aksi apa pun.`
    : `${COACH_SYSTEM_PROMPT}

## DATA USER
(kosong — kamu TIDAK punya angka user saat ini) Jangan menyebut nominal saldo
atau jatah harian apa pun. Kalau user menanyakan angka, katakan datanya belum
terkirim dan arahkan ke ringkasan di app. Jangan mengaku sudah mencatat apa pun.`

  const raw = Array.isArray(body.messages) ? body.messages : []
  const turns: ChatTurn[] = raw
    .map((entry) => {
      const message = entry as IncomingMessage
      const content = typeof message.content === 'string' ? message.content.trim() : ''
      const role: ChatTurn['role'] = message.role === 'ai' || message.role === 'model' ? 'model' : 'user'
      return { role, text: content }
    })
    .filter((turn) => turn.text.length > 0)
    .slice(-MAX_TURNS)

  /* yang terakhir WAJIB pesan user — model tidak menjawab pesannya sendiri */
  if (turns.length === 0 || turns[turns.length - 1]?.role !== 'user') {
    return NextResponse.json(
      { ok: false, reason: 'invalid', error: 'Tidak ada pesan user untuk dijawab.' },
      { status: 422 },
    )
  }

  const result = await generateText({ system, turns, maxOutputTokens: 700 })
  if (!result.ok) {
    return NextResponse.json(
      { ok: false, reason: result.error.kind, error: result.error.message },
      { status: result.error.kind === 'rate-limit' ? 429 : 503 },
    )
  }

  return NextResponse.json({ ok: true, reply: result.value, model: textModel(), ruleBased: false })
}
