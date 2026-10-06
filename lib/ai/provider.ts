/* ── PROVIDER AI (Gemini) — SERVER-ONLY ──────────────────────────────────────
   Satu-satunya tempat app berbicara dengan model AI. Route di baliknya
   (`/api/ai/text`, `/api/ai/ocr`, `/api/parse-voice`) memakai wrapper ini supaya
   timeout, retry, dan normalisasi error hanya ditulis SEKALI.

   Kenapa `fetch` REST, bukan SDK `@google/genai`: repo ini tidak punya
   dependency provider, dan kebutuhan kita cuma tiga bentuk panggilan
   (teks, gambar, JSON). REST `generateContent` cukup — jadi tidak ada
   dependency baru yang harus dirawat (keputusan Fase 0, Q4).

   Kunci `GEMINI_API_KEY` adalah rahasia server: ia TIDAK PERNAH dibaca di kode
   klien dan tidak pernah muncul di variabel `NEXT_PUBLIC_*`. Semua panggilan
   keluar dari route handler (server), jadi browser tidak melihat kunci — dan
   tidak ada data user yang dikirim ke selain provider ini (PRD 2111).

   Bentuk balasan sudah DIVERIFIKASI lewat panggilan nyata ke model
   `gemini-2.5-flash` (smoke test Fase 0): `candidates[0].content.parts[].text`,
   error berbentuk `{ error: { code, status, message } }`, dan
   `thinkingConfig.thinkingBudget = 0` diterima untuk model `flash` (mempercepat
   & menghemat token untuk tugas ekstraksi singkat). */

const API_BASE = 'https://generativelanguage.googleapis.com/v1beta/models'

/** batas waktu satu panggilan ke provider (di bawah timeout route default) */
const REQUEST_TIMEOUT_MS = 25_000

export type AiErrorKind = 'no-key' | 'timeout' | 'rate-limit' | 'provider' | 'empty' | 'parse'

export interface AiError {
  kind: AiErrorKind
  /** status HTTP dari provider, kalau ada */
  status?: number
  /** pesan provider apa adanya (dipakai untuk log, bukan ditampilkan mentah ke user) */
  message: string
}

export type AiResult<T> = { ok: true; value: T } | { ok: false; error: AiError }

/** `true` = kunci provider tersedia (dipakai route untuk memutuskan fallback jujur) */
export function aiConfigured(): boolean {
  return (process.env.GEMINI_API_KEY ?? '').trim().length > 0
}

/** model teks (default `gemini-2.5-flash`, boleh ditimpa `GEMINI_MODEL_TEXT`) */
export function textModel(): string {
  return (process.env.GEMINI_MODEL_TEXT ?? '').trim() || 'gemini-2.5-flash'
}

/** model vision (default `gemini-2.5-flash`, boleh ditimpa `GEMINI_MODEL_VISION`) */
export function visionModel(): string {
  return (process.env.GEMINI_MODEL_VISION ?? '').trim() || 'gemini-2.5-flash'
}

export interface ChatTurn {
  role: 'user' | 'model'
  text: string
}

interface InlineImage {
  mimeType: string
  /** base64 tanpa prefix `data:` */
  data: string
}

interface GeminiPart {
  text?: string
  inlineData?: InlineImage
}

interface GeminiBody {
  systemInstruction?: { parts: { text: string }[] }
  contents: { role: 'user' | 'model'; parts: GeminiPart[] }[]
  generationConfig: {
    temperature: number
    maxOutputTokens: number
    responseMimeType?: string
    thinkingConfig?: { thinkingBudget: number }
  }
}

/** teks gabungan dari `candidates[0]` (satu-satunya peran yang kita pakai) */
function extractText(payload: unknown): string {
  const candidates = (payload as { candidates?: unknown[] })?.candidates
  if (!Array.isArray(candidates) || candidates.length === 0) return ''
  const parts = (candidates[0] as { content?: { parts?: unknown[] } })?.content?.parts
  if (!Array.isArray(parts)) return ''
  return parts
    .map((part) => (typeof (part as { text?: unknown })?.text === 'string' ? (part as { text: string }).text : ''))
    .join('')
    .trim()
}

/** respons error provider → kategori yang bisa diputuskan pemanggil */
function normalizeHttpError(status: number, payload: unknown): AiError {
  const rawMessage = (payload as { error?: { message?: unknown } })?.error?.message
  const apiMessage = rawMessage === undefined ? '' : String(rawMessage)
  if (status === 429) {
    return { kind: 'rate-limit', status, message: apiMessage || 'Kuota penyedia AI sedang penuh.' }
  }
  if (status === 401 || status === 403) {
    return { kind: 'no-key', status, message: apiMessage || 'Kunci API provider ditolak.' }
  }
  return { kind: 'provider', status, message: apiMessage || `Permintaan ditolak provider (${status}).` }
}

/** satu panggilan HTTP; TIDAK retry (retry di `generate`) */
async function postOnce(model: string, body: GeminiBody): Promise<AiResult<string>> {
  const apiKey = (process.env.GEMINI_API_KEY ?? '').trim()
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)
  try {
    const res = await fetch(`${API_BASE}/${encodeURIComponent(model)}:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: controller.signal,
      cache: 'no-store',
    })
    const payload = await res.json().catch(() => null)
    if (!res.ok) return { ok: false, error: normalizeHttpError(res.status, payload) }
    const text = extractText(payload)
    if (!text) return { ok: false, error: { kind: 'empty', message: 'Model tidak mengembalikan teks.' } }
    return { ok: true, value: text }
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      return { ok: false, error: { kind: 'timeout', message: 'Provider AI tidak menjawab tepat waktu.' } }
    }
    return {
      ok: false,
      error: {
        kind: 'provider',
        message: error instanceof Error ? error.message : 'Gagal menghubungi provider AI.',
      },
    }
  } finally {
    clearTimeout(timer)
  }
}

interface GenerateOptions {
  system?: string
  model: string
  json?: boolean
  maxOutputTokens: number
  temperature?: number
}

/** panggilan inti: bangun body, retry 1× saat timeout/error provider, normalisasi hasil */
async function generate(contents: GeminiBody['contents'], opts: GenerateOptions): Promise<AiResult<string>> {
  if (!aiConfigured()) {
    return { ok: false, error: { kind: 'no-key', message: 'GEMINI_API_KEY belum di-set di server.' } }
  }

  const body: GeminiBody = {
    ...(opts.system ? { systemInstruction: { parts: [{ text: opts.system }] } } : {}),
    contents,
    generationConfig: {
      temperature: opts.temperature ?? 0.7,
      maxOutputTokens: opts.maxOutputTokens,
      ...(opts.json ? { responseMimeType: 'application/json' } : {}),
      /* model `flash` mendukung thinkingBudget 0 → jawaban singkat lebih cepat &
         tidak kehabisan token buat "berpikir". Model lain (mis. pro) tidak
         menerima 0, jadi konfigurasi ini hanya dipasang untuk flash. */
      ...(opts.model.includes('flash') ? { thinkingConfig: { thinkingBudget: 0 } } : {}),
    },
  }

  let result = await postOnce(opts.model, body)
  /* satu percobaan ulang HANYA untuk kegagalan sementara (timeout/provider 5xx).
     `rate-limit`/`no-key`/`empty` tidak diulang: mengulang tidak akan menolong. */
  if (!result.ok && (result.error.kind === 'timeout' || result.error.kind === 'provider')) {
    result = await postOnce(opts.model, body)
  }
  return result
}

/** balasan teks bebas (chat/coaching) */
export async function generateText(input: {
  system: string
  turns: ChatTurn[]
  maxOutputTokens?: number
  temperature?: number
}): Promise<AiResult<string>> {
  const contents: GeminiBody['contents'] = input.turns.map((turn) => ({
    role: turn.role,
    parts: [{ text: turn.text }],
  }))
  return generate(contents, {
    system: input.system,
    model: textModel(),
    maxOutputTokens: input.maxOutputTokens ?? 800,
    temperature: input.temperature ?? 0.7,
  })
}

/** balasan dari GAMBAR (vision) — dipakai OCR struk */
export async function generateFromImage(input: {
  system: string
  prompt: string
  image: InlineImage
  maxOutputTokens?: number
  temperature?: number
}): Promise<AiResult<string>> {
  return generate([{ role: 'user', parts: [{ inlineData: input.image }, { text: input.prompt }] }], {
    system: input.system,
    model: visionModel(),
    maxOutputTokens: input.maxOutputTokens ?? 700,
    temperature: input.temperature ?? 0.3,
  })
}

/** balasan JSON ter-parse; gagal parse = error `parse` (pemanggil jatuh ke fallback) */
export async function generateJSON<T>(input: {
  system: string
  turns: ChatTurn[]
  maxOutputTokens?: number
  temperature?: number
}): Promise<AiResult<T>> {
  const raw = await generate(
    input.turns.map((turn) => ({ role: turn.role, parts: [{ text: turn.text }] })),
    {
      system: input.system,
      model: textModel(),
      json: true,
      maxOutputTokens: input.maxOutputTokens ?? 700,
      temperature: input.temperature ?? 0.3,
    },
  )
  if (!raw.ok) return raw
  const parsed = parseJsonLoose<T>(raw.value)
  if (parsed === undefined) {
    return { ok: false, error: { kind: 'parse', message: 'Balasan model bukan JSON yang bisa dibaca.' } }
  }
  return { ok: true, value: parsed }
}

/**
 * Parser JSON toleran: model kadang membungkus JSON dalam pagar markdown
 * (```json … ```) walau `responseMimeType` sudah JSON. Ambil objek pertama.
 */
export function parseJsonLoose<T>(text: string): T | undefined {
  const cleaned = text
    .replace(/^\s*```(?:json)?/i, '')
    .replace(/```\s*$/i, '')
    .trim()
  try {
    return JSON.parse(cleaned) as T
  } catch {
    const start = cleaned.indexOf('{')
    const end = cleaned.lastIndexOf('}')
    if (start === -1 || end === -1 || end <= start) return undefined
    try {
      return JSON.parse(cleaned.slice(start, end + 1)) as T
    } catch {
      return undefined
    }
  }
}

