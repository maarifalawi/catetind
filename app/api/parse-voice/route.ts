import { NextRequest, NextResponse } from 'next/server'
import { aiCallerId } from '@/lib/ai/caller'
import { aiConfigured, generateJSON, textModel } from '@/lib/ai/provider'
import { EXTRACTION_SYSTEM_PROMPT, EXTRACTION_EXAMPLES } from '@/lib/ai/prompts'
import { normalizeExtraction, type RawExtraction } from '@/lib/ai/extract'
import { allowAiCall } from '@/lib/ai/rate-limit'

/* ── POST /api/parse-voice — transkrip ucapan → transaksi (Mode 3) ───────────
   Body: `{ transcript: string, today?: 'YYYY-MM-DD' }`. Teks datang dari Web
   Speech API di browser (STT tetap di perangkat, PRD A3 — zero server cost untuk
   transkripsi); yang dipanggil ke provider hanya PARSING teksnya.

   Keluaran `ExtractedTransaction` sama dengan `parseSpokenTransaction()` lama,
   jadi kartu konfirmasi di chat tidak berubah. Balasan:
     { ok:true, transaction, model } → 200 · { ok:false, reason, error } → 400/422/429/503 */

export const dynamic = 'force-dynamic'

/** batas panjang transkrip yang masuk akal untuk satu ucapan */
const MAX_TRANSCRIPT = 500

export async function POST(req: NextRequest) {
  const callerId = aiCallerId(req)

  if (!aiConfigured()) {
    return NextResponse.json(
      { ok: false, reason: 'no-key', error: 'Input suara belum aktif di server ini.' },
      { status: 503 },
    )
  }

  if (!allowAiCall(callerId)) {
    return NextResponse.json(
      { ok: false, reason: 'rate-limit', error: 'Kebanyakan permintaan sekaligus — tunggu sebentar ya 🌿' },
      { status: 429 },
    )
  }

  let body: { transcript?: unknown; today?: unknown }
  try {
    body = (await req.json()) as { transcript?: unknown; today?: unknown }
  } catch {
    return NextResponse.json(
      { ok: false, reason: 'invalid', error: 'Body permintaan harus JSON.' },
      { status: 400 },
    )
  }

  const transcript = typeof body.transcript === 'string' ? body.transcript.trim() : ''
  if (!transcript || transcript.length > MAX_TRANSCRIPT) {
    return NextResponse.json(
      { ok: false, reason: 'invalid', error: 'Transkrip kosong atau terlalu panjang.' },
      { status: 422 },
    )
  }

  const today =
    typeof body.today === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(body.today.trim())
      ? body.today.trim()
      : undefined

  const prompt = [
    'Ubah ucapan berikut jadi SATU objek JSON transaksi.',
    'Contoh yang benar:',
    ...EXTRACTION_EXAMPLES.map((line) => `- ${line}`),
    `Ucapan user: "${transcript}"`,
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
    transaction: normalizeExtraction('voice', result.value, today),
    model: textModel(),
  })
}
