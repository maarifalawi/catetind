import { NextRequest, NextResponse } from 'next/server'
import { aiCallerId } from '@/lib/ai/caller'
import { aiConfigured, generateJSON, textModel } from '@/lib/ai/provider'
import { EXTRACTION_SYSTEM_PROMPT, EXTRACTION_EXAMPLES } from '@/lib/ai/prompts'
import { normalizeExtraction, type RawExtraction } from '@/lib/ai/extract'
import { allowAiCall } from '@/lib/ai/rate-limit'

/* ── POST /api/parse-voice — teks → transaksi (Mode 3 + ketikan chat) ────────
   Body: `{ transcript: string, today?: 'YYYY-MM-DD', source?: 'voice'|'chat' }`.
   Teks datang dari DUA tempat yang sama-sama teks biasa:
     · `'voice'` — hasil Web Speech API (STT tetap di perangkat, PRD A3, zero
       server cost untuk transkripsi); yang dipanggil ke provider hanya PARSING.
     · `'chat'`  — kalimat transaksi yang user KETIK di AI Coach (paket 79).
   Keduanya memakai prompt & normalisasi yang sama supaya hasilnya mustahil
   berbeda; yang membedakan cuma `source` di `ExtractedTransaction` (dipakai
   kartu konfirmasi untuk memilih kalimat yang benar: "didengar" vs "dibaca")
   dan kata "Ucapan"/"Tulisan" di prompt. Nama route dipertahankan supaya klien
   yang sudah ada tidak putus — perannya memang sudah lebih luas dari namanya.

   Keluaran `ExtractedTransaction` sama dengan `parseSpokenTransaction()` lama,
   jadi kartu konfirmasi di chat tidak berubah. Balasan:
     { ok:true, transaction, model } → 200 · { ok:false, reason, error } → 400/422/429/503 */

export const dynamic = 'force-dynamic'

/** batas panjang teks yang masuk akal untuk satu ucapan / satu kalimat ketikan */
const MAX_TRANSCRIPT = 500

/** sumber yang boleh diminta klien; selain ini jatuh ke `'voice'` (perilaku lama) */
function readSource(value: unknown): 'voice' | 'chat' {
  return value === 'chat' ? 'chat' : 'voice'
}

export async function POST(req: NextRequest) {
  const callerId = aiCallerId(req)

  if (!aiConfigured()) {
    return NextResponse.json(
      { ok: false, reason: 'no-key', error: 'Pemrosesan AI belum aktif di server ini.' },
      { status: 503 },
    )
  }

  if (!allowAiCall(callerId)) {
    return NextResponse.json(
      { ok: false, reason: 'rate-limit', error: 'Kebanyakan permintaan sekaligus — tunggu sebentar ya 🌿' },
      { status: 429 },
    )
  }

  let body: { transcript?: unknown; today?: unknown; source?: unknown }
  try {
    body = (await req.json()) as { transcript?: unknown; today?: unknown; source?: unknown }
  } catch {
    return NextResponse.json(
      { ok: false, reason: 'invalid', error: 'Body permintaan harus JSON.' },
      { status: 400 },
    )
  }

  const transcript = typeof body.transcript === 'string' ? body.transcript.trim() : ''
  if (!transcript || transcript.length > MAX_TRANSCRIPT) {
    return NextResponse.json(
      { ok: false, reason: 'invalid', error: 'Teksnya kosong atau terlalu panjang.' },
      { status: 422 },
    )
  }

  const source = readSource(body.source)

  const today =
    typeof body.today === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(body.today.trim())
      ? body.today.trim()
      : undefined

  const prompt = [
    'Ubah kalimat berikut jadi SATU objek JSON transaksi.',
    'Contoh yang benar:',
    ...EXTRACTION_EXAMPLES.map((line) => `- ${line}`),
    /* kata "Ucapan"/"Tulisan" mengikuti sumbernya — model yang diberi tahu dari
       mana teksnya datang menebak lebih sedikit (dan tidak mengarang "suara") */
    `${source === 'chat' ? 'Tulisan user' : 'Ucapan user'}: "${transcript}"`,
    'Balas HANYA JSON.',
  ].join('\n')

  const result = await generateJSON<RawExtraction>({
    system: EXTRACTION_SYSTEM_PROMPT,
    turns: [{ role: 'user', text: prompt }],
    maxOutputTokens: 400,
  })

  if (!result.ok) {
    return NextResponse.json(
      { ok: false, reason: result.error.kind, error: result.error.message },
      { status: result.error.kind === 'rate-limit' ? 429 : 503 },
    )
  }

  return NextResponse.json({
    ok: true,
    transaction: normalizeExtraction(source, result.value, today),
    model: textModel(),
  })
}
