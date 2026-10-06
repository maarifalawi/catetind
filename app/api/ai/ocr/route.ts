import { NextRequest, NextResponse } from 'next/server'
import { aiCallerId } from '@/lib/ai/caller'
import { aiConfigured, generateFromImage, parseJsonLoose, visionModel } from '@/lib/ai/provider'
import { EXTRACTION_SYSTEM_PROMPT, EXTRACTION_EXAMPLES } from '@/lib/ai/prompts'
import { normalizeExtraction, type RawExtraction } from '@/lib/ai/extract'
import { allowAiCall } from '@/lib/ai/rate-limit'

/* ── POST /api/ai/ocr — baca STRUK via vision (Domain 2A.2 Mode 2) ───────────
   Body: `{ image: string, mimeType?: string }` di mana `image` adalah base64
   (boleh berupa data URL `data:image/png;base64,…`) dan `mimeType` opsional
   (diturunkan dari data URL bila ada).

   Keluaran `ExtractedTransaction` SAMA dengan mock lama
   (`lib/transaction-ai.ts`), termasuk `confidence` & `lowFields` (PRD A11), jadi
   penggantian mock → API tidak menyentuh UI. Balasan:
     { ok:true, transaction, model }                             → 200
     { ok:false, reason, error }                                 → 400/413/422/429/503

   Privasi (PRD 2111): gambar dikirim ke provider DARI SERVER (kunci tidak bocor
   ke browser), dan identitasnya dibaca `aiCallerId()` (sesi bila ada, kalau tidak
   identitas anonim per-jaringan) — lihat `lib/ai/caller.ts`. */

export const dynamic = 'force-dynamic'

/** batas ukuran base64 (≈5 MB gambar) — menahan body raksasa sebelum ke provider */
const MAX_IMAGE_BASE64 = 7_000_000

const ALLOWED_MIME = ['image/png', 'image/jpeg', 'image/webp', 'image/heic', 'image/heif']

function splitDataUrl(value: string): { data: string; mimeType: string | null } {
  /* tanpa flag `s` (target TS repo < ES2018): cari penanda `;base64,` manual */
  const marker = ';base64,'
  const at = value.indexOf(marker)
  if (!value.startsWith('data:') || at === -1) return { data: value, mimeType: null }
  const mimeType = value.slice('data:'.length, at)
  return { data: value.slice(at + marker.length), mimeType: mimeType || null }
}

export async function POST(req: NextRequest) {
  const callerId = aiCallerId(req)

  if (!aiConfigured()) {
    return NextResponse.json(
      { ok: false, reason: 'no-key', error: 'Scan struk belum aktif di server ini.' },
      { status: 503 },
    )
  }

  if (!allowAiCall(callerId)) {
    return NextResponse.json(
      { ok: false, reason: 'rate-limit', error: 'Kebanyakan permintaan sekaligus — tunggu sebentar ya 🌿' },
      { status: 429 },
    )
  }

  let body: { image?: unknown; mimeType?: unknown }
  try {
    body = (await req.json()) as { image?: unknown; mimeType?: unknown }
  } catch {
    return NextResponse.json(
      { ok: false, reason: 'invalid', error: 'Body permintaan harus JSON.' },
      { status: 400 },
    )
  }

  if (typeof body.image !== 'string' || body.image.length === 0) {
    return NextResponse.json(
      { ok: false, reason: 'invalid', error: 'Gambar struk tidak ditemukan di permintaan.' },
      { status: 422 },
    )
  }

  const { data, mimeType: dataUrlMime } = splitDataUrl(body.image)
  if (data.length > MAX_IMAGE_BASE64) {
    return NextResponse.json(
      { ok: false, reason: 'invalid', error: 'Fotonya kegedean — coba potret ulang atau kecilkan dulu ya 🌿' },
      { status: 413 },
    )
  }

  const declaredMime = typeof body.mimeType === 'string' ? body.mimeType : ''
  const mimeType = ALLOWED_MIME.includes(declaredMime)
    ? declaredMime
    : ALLOWED_MIME.includes(dataUrlMime ?? '')
      ? (dataUrlMime as string)
      : 'image/jpeg'

  const prompt = [
    'Baca struk pada gambar ini dan ubah jadi SATU objek JSON transaksi.',
    'Contoh yang benar:',
    ...EXTRACTION_EXAMPLES.map((line) => `- ${line}`),
    'Balas HANYA JSON.',
  ].join('\n')

  const result = await generateFromImage({
    system: EXTRACTION_SYSTEM_PROMPT,
    prompt,
    image: { mimeType, data },
  })

  if (!result.ok) {
    return NextResponse.json(
      { ok: false, reason: result.error.kind, error: result.error.message },
      { status: result.error.kind === 'rate-limit' ? 429 : 503 },
    )
  }

  const raw = parseJsonLoose<RawExtraction>(result.value)
  if (!raw) {
    return NextResponse.json(
      { ok: false, reason: 'parse', error: 'Hasil baca struk tidak bisa dibaca.' },
      { status: 502 },
    )
  }

  return NextResponse.json({
    ok: true,
    transaction: normalizeExtraction('receipt', raw),
    model: visionModel(),
  })
}
