import { NextRequest, NextResponse } from 'next/server'
import { aiCallerId } from '@/lib/ai/caller'
import { AI_ENGINE_ID } from '@/lib/ai/engine'
import {
  aiConfigured,
  aiUserMessage,
  generateFromImage,
  logAiFailure,
  parseJsonLoose,
} from '@/lib/ai/provider'
import { EXTRACTION_SYSTEM_PROMPT, EXTRACTION_EXAMPLES } from '@/lib/ai/prompts'
import { normalizeExtraction, type RawExtraction } from '@/lib/ai/extract'
import { allowAiCall } from '@/lib/ai/rate-limit'
import { requireCapability } from '@/lib/subscription/capability'

/* ── POST /api/ai/ocr — baca STRUK via vision (Domain 2A.2 Mode 2) ───────────
   Body: `{ image: string, mimeType?: string }` di mana `image` adalah base64
   (boleh berupa data URL `data:image/png;base64,…`). Sejak paket 87 `mimeType`
   hanya diterima demi kompatibilitas klien lama dan TIDAK dipakai: format
   gambar dibaca dari isi berkasnya (`sniffImageMime`) karena label kiriman
   browser sering keliru (HEIC yang sudah dikonversi, JPEG yang di-rename, …).
   Format di luar png/jpeg/webp/gif ditolak 422 dengan pesan yang jelas.

   Keluaran `ExtractedTransaction` SAMA dengan mock lama
   (`lib/transaction-ai.ts`), termasuk `confidence` & `lowFields` (PRD A11), jadi
   penggantian mock → API tidak menyentuh UI. Balasan:
     { ok:true, transaction, model }                             → 200
     { ok:false, reason, error }                                 → 400/413/422/429/503

   `model` = nama mesin versi PUBLIK (`AI_ENGINE_ID`, lihat `lib/ai/engine.ts`),
   dan `error` = pesan kanon app (`aiUserMessage()`) — bukan nama/pesan mentah
   penyedia, supaya balasan tidak jadi tempat menebak vendor di balik app.

   Privasi (PRD 2111): gambar dikirim ke provider DARI SERVER (kunci tidak bocor
   ke browser), dan identitasnya dibaca `aiCallerId()` (sesi bila ada, kalau tidak
   identitas anonim per-jaringan) — lihat `lib/ai/caller.ts`. */

export const dynamic = 'force-dynamic'

/** batas ukuran base64 (≈5 MB gambar) — menahan body raksasa sebelum ke provider */
const MAX_IMAGE_BASE64 = 7_000_000

/* ── FORMAT GAMBAR YANG BENAR-BENAR DIDUKUNG PENYEDIA (paket 87) ────────────
   Penyedia vision hanya menerima webp/png/jpeg/gif. Daftar lama ikut memuat
   `image/heic`/`image/heif`, dan format tak dikenal “ditebak” jadi
   `image/jpeg` — akibatnya foto iPhone (HEIC) dikirim dengan label palsu dan
   penyedia menolak dengan “You have uploaded an unsupported image”.

   Karena itu label dari klien TIDAK lagi dipercaya: format dibaca dari isi
   berkasnya (`sniffImageMime`), sama seperti cara penyedia menilainya. */
const ALLOWED_MIME = ['image/png', 'image/jpeg', 'image/webp', 'image/gif']

/** nama format untuk pesan 422 yang bisa dibaca user (bukan istilah mesin) */
const MIME_LABEL: Record<string, string> = {
  'image/png': 'PNG',
  'image/jpeg': 'JPG',
  'image/webp': 'WEBP',
  'image/gif': 'GIF',
  'image/heic': 'HEIC (khas iPhone)',
  'image/heif': 'HEIF (khas iPhone)',
  'image/avif': 'AVIF',
}

/**
 * Baca format ASLI gambar dari beberapa byte pertama base64.
 *
 * Kenapa perlu: `file.type` dari browser sering tidak akurat (foto iPhone bisa
 * berlabel `image/heic` padahal isinya sudah JPEG, dan sebaliknya), sementara
 * penyedia menilai ISI berkasnya. Empat format yang kita izinkan punya tanda
 * tangan tetap, jadi 64 karakter base64 pertama (48 byte) sudah cukup.
 *
 * `null` = bukan gambar yang bisa dipastikan (rusak, terpotong, atau format
 * lain seperti BMP/TIFF/SVG).
 */
function sniffImageMime(data: string): string | null {
  let head = ''
  try {
    /* `atob` ada di Node maupun Edge runtime — tidak perlu `Buffer` */
    head = atob(data.slice(0, 64))
  } catch {
    return null
  }
  if (head.length < 12) return null
  const ascii = (start: number, end: number) => head.slice(start, end)
  if (head.charCodeAt(0) === 0xff && head.charCodeAt(1) === 0xd8 && head.charCodeAt(2) === 0xff) {
    return 'image/jpeg'
  }
  if (ascii(0, 8) === '\x89PNG\r\n\x1a\n') return 'image/png'
  if (ascii(0, 6) === 'GIF87a' || ascii(0, 6) === 'GIF89a') return 'image/gif'
  if (ascii(0, 4) === 'RIFF' && ascii(8, 12) === 'WEBP') return 'image/webp'
  /* HEIC/HEIF/AVIF memakai wadah ISO-BMFF: kotak `ftyp` di byte 4–7 */
  if (ascii(4, 8) === 'ftyp') {
    const brand = ascii(8, 12)
    if (['heic', 'heix', 'hevc', 'hevx', 'heim', 'heis', 'mif1', 'msf1'].includes(brand)) {
      return 'image/heic'
    }
    if (brand === 'avif' || brand === 'avis') return 'image/avif'
  }
  return null
}

/** pesan penolakan yang menyebut masalahnya + jalan keluarnya */
function unsupportedImageMessage(mime: string | null): string {
  const label = mime ? MIME_LABEL[mime] : ''
  return label
    ? `Format ${label} belum bisa dibaca, simpan ulang sebagai JPG atau PNG, lalu coba lagi ya 🌿`
    : 'Fotonya belum bisa dibaca, pakai JPG, PNG, WEBP, atau GIF ya 🌿'
}

function splitDataUrl(value: string): { data: string; mimeType: string | null } {
  /* tanpa flag `s` (target TS repo < ES2018): cari penanda `;base64,` manual */
  const marker = ';base64,'
  const at = value.indexOf(marker)
  if (!value.startsWith('data:') || at === -1) return { data: value, mimeType: null }
  const mimeType = value.slice('data:'.length, at)
  return { data: value.slice(at + marker.length), mimeType: mimeType || null }
}

export async function POST(req: NextRequest) {
  /* KUNCI PER TIER (paket 84): scan struk hanya di paket Waras ke atas. */
  const gate = await requireCapability(req, 'ocr')
  if (!gate.ok) return gate.response

  const callerId = aiCallerId(req)

  if (!aiConfigured()) {
    return NextResponse.json(
      { ok: false, reason: 'no-key', error: 'Scan struk belum aktif di server ini.' },
      { status: 503 },
    )
  }

  if (!allowAiCall(callerId)) {
    return NextResponse.json(
      { ok: false, reason: 'rate-limit', error: 'Kebanyakan permintaan sekaligus, tunggu sebentar ya 🌿' },
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

  const { data } = splitDataUrl(body.image)
  /* salinan manual kadang membawa spasi/baris baru — jangan diteruskan ke provider */
  const base64 = data.replace(/\s+/g, '')
  if (base64.length > MAX_IMAGE_BASE64) {
    return NextResponse.json(
      { ok: false, reason: 'invalid', error: 'Fotonya kegedean, coba potret ulang atau kecilkan dulu ya 🌿' },
      { status: 413 },
    )
  }

  /* Format ditentukan dari ISI berkas, bukan dari `mimeType` kiriman klien:
     label bisa salah (HEIC yang sudah dikonversi browser, JPEG yang di-rename,
     dsb.) dan penyedia menilai isinya. Format yang tidak didukung ditolak DI
     SINI dengan pesan yang bisa ditindaklanjuti — tidak lagi diam-diam dikirim
     sebagai `image/jpeg` sampai provider membalas "unsupported image". */
  const mimeType = sniffImageMime(base64)
  if (!mimeType || !ALLOWED_MIME.includes(mimeType)) {
    return NextResponse.json(
      { ok: false, reason: 'invalid', error: unsupportedImageMessage(mimeType) },
      { status: 422 },
    )
  }

  const prompt = [
    'Baca struk pada gambar ini dan ubah jadi SATU objek JSON transaksi.',
    'Contoh yang benar:',
    ...EXTRACTION_EXAMPLES.map((line) => `- ${line}`),
    'Balas HANYA JSON.',
  ].join('\n')

  const result = await generateFromImage({
    system: EXTRACTION_SYSTEM_PROMPT,
    prompt,
    /* pakai base64 yang sudah dibersihkan — bukan `data` mentah yang mungkin
       masih membawa spasi/baris baru */
    image: { mimeType, data: base64 },
  })

  if (!result.ok) {
    /* pesan penyedia dicatat di LOG SERVER; yang keluar ke klien hanya copy app */
    logAiFailure(result.error)
    return NextResponse.json(
      { ok: false, reason: result.error.kind, error: aiUserMessage(result.error.kind) },
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
    model: AI_ENGINE_ID,
  })
}
