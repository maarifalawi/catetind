/* ── PROVIDER AI (DeepSeek) — SERVER-ONLY ────────────────────────────────────
   Satu-satunya tempat app berbicara dengan model AI. Route di baliknya
   (`/api/ai/text`, `/api/ai/ocr`, `/api/ai/categorize`) memakai wrapper ini
   supaya timeout, retry, dan normalisasi error hanya ditulis SEKALI.

   Kenapa `fetch` REST, bukan SDK: DeepSeek menyediakan endpoint yang KOMPATIBEL
   OPENAI (`POST /chat/completions`), dan kebutuhan kita cuma tiga bentuk
   panggilan (teks, gambar, JSON). REST cukup — jadi tidak ada dependency baru
   yang harus dirawat. Pola ini sama dengan implementasi Gemini sebelumnya;
   providernya saja yang berganti (permintaan pemilik produk).

   Fakta yang sudah DIVERIFIKASI lewat panggilan nyata ke project ini (smoke test):
     · `GET /models` → `deepseek-flash` (DeepSeek-V4.1-Flash) menerima
       `input_modalities: ["text","image"]` ⇒ SATU model bisa teks + vision;
       `deepseek-v4-pro` teks saja;
     · balasan berbentuk `choices[0].message.content` (ada juga `reasoning_content`
       — jejak berpikir model yang kita ABAIKAN, bukan jawaban);
     · `response_format: { type: "json_object" }` dan `reasoning_effort` diterima.

   Kunci `DEEPSEEK_API_KEY` adalah rahasia server: ia TIDAK PERNAH dibaca di kode
   klien dan tidak pernah muncul di variabel `NEXT_PUBLIC_*`. Semua panggilan
   keluar dari route handler (server), jadi browser tidak melihat kunci — dan
   tidak ada data user yang dikirim ke selain provider ini (PRD 2111). */

/**
 * Basis API bergaya OpenAI. Boleh ditimpa `DEEPSEEK_BASE_URL` (mis. ke proxy
 * sendiri); default `https://api.deepseek.com`.
 */
function apiBase(): string {
  const raw = (process.env.DEEPSEEK_BASE_URL ?? '').trim().replace(/\/+$/, '')
  return raw || 'https://api.deepseek.com'
}

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
  return (process.env.DEEPSEEK_API_KEY ?? '').trim().length > 0
}

/** model teks (default `deepseek-flash`, boleh ditimpa `DEEPSEEK_MODEL_TEXT`) */
export function textModel(): string {
  return (process.env.DEEPSEEK_MODEL_TEXT ?? '').trim() || 'deepseek-flash'
}

/**
 * Model vision (default = model teks). `deepseek-flash` satu-satunya model yang
 * menerima gambar (`input_modalities`), jadi ia yang dipakai bila tidak ditimpa
 * `DEEPSEEK_MODEL_VISION`.
 */
export function visionModel(): string {
  return (process.env.DEEPSEEK_MODEL_VISION ?? '').trim() || textModel()
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

/** potongan konten gaya OpenAI: teks biasa, atau gambar sebagai data URL */
type OpenAiPart = { type: 'text'; text: string } | { type: 'image_url'; image_url: { url: string } }

interface OpenAiMessage {
  role: 'system' | 'user' | 'assistant'
  content: string | OpenAiPart[]
}

interface OpenAiBody {
  model: string
  messages: OpenAiMessage[]
  temperature: number
  max_tokens: number
  /** mode JSON: provider memaksa balasan berupa objek JSON */
  response_format?: { type: 'json_object' }
  /**
   * `deepseek-flash` "berpikir" dulu sebelum menjawab, dan token berpikir ikut
   * dihitung ke `max_tokens`. Untuk tugas kita yang jawabannya pendek (ekstraksi,
   * klasifikasi, balasan coach) kita minta effort terendah supaya jawaban tidak
   * terpotong gara-gara jatah token habis dipakai berpikir.
   */
  reasoning_effort: 'low'
  stream: false
}

/** jawaban teks dari `choices[0].message.content` (satu-satunya jalur yang dipakai) */
function extractText(payload: unknown): string {
  const choices = (payload as { choices?: unknown[] })?.choices
  if (!Array.isArray(choices) || choices.length === 0) return ''
  const content = (choices[0] as { message?: { content?: unknown } })?.message?.content
  return typeof content === 'string' ? content.trim() : ''
}

/** pesan error provider (bentuk OpenAI: `{ error: { message } }`) */
function providerMessage(payload: unknown): string {
  const raw = (payload as { error?: { message?: unknown } })?.error?.message
  return raw === undefined || raw === null ? '' : String(raw)
}

/** respons error provider → kategori yang bisa diputuskan pemanggil */
function normalizeHttpError(status: number, payload: unknown): AiError {
  const apiMessage = providerMessage(payload)
  if (status === 429) {
    return { kind: 'rate-limit', status, message: apiMessage || 'Kuota penyedia AI sedang penuh.' }
  }
  if (status === 401 || status === 403) {
    return { kind: 'no-key', status, message: apiMessage || 'Kunci API provider ditolak.' }
  }
  return { kind: 'provider', status, message: apiMessage || `Permintaan ditolak provider (${status}).` }
}

/** satu panggilan HTTP; TIDAK retry (retry di `generate`) */
async function postOnce(body: OpenAiBody): Promise<AiResult<string>> {
  const apiKey = (process.env.DEEPSEEK_API_KEY ?? '').trim()
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)
  try {
    const res = await fetch(`${apiBase()}/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
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

/** ubah giliran percakapan app (`model`) jadi peran gaya OpenAI (`assistant`) */
function toMessages(turns: ChatTurn[]): OpenAiMessage[] {
  return turns.map((turn) => ({
    role: turn.role === 'model' ? 'assistant' : 'user',
    content: turn.text,
  }))
}

/** panggilan inti: bangun pesan, retry 1× saat timeout/error provider, normalisasi hasil */
async function generate(messages: OpenAiMessage[], opts: GenerateOptions): Promise<AiResult<string>> {
  if (!aiConfigured()) {
    return { ok: false, error: { kind: 'no-key', message: 'DEEPSEEK_API_KEY belum di-set di server.' } }
  }

  const body: OpenAiBody = {
    model: opts.model,
    messages: opts.system ? [{ role: 'system', content: opts.system }, ...messages] : messages,
    temperature: opts.temperature ?? 0.7,
    max_tokens: opts.maxOutputTokens,
    ...(opts.json ? { response_format: { type: 'json_object' as const } } : {}),
    reasoning_effort: 'low',
    stream: false,
  }

  let result = await postOnce(body)
  /* satu percobaan ulang HANYA untuk kegagalan sementara (timeout/provider 5xx).
     `rate-limit`/`no-key`/`empty` tidak diulang: mengulang tidak akan menolong. */
  if (!result.ok && (result.error.kind === 'timeout' || result.error.kind === 'provider')) {
    result = await postOnce(body)
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
  return generate(toMessages(input.turns), {
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
  const content: OpenAiPart[] = [
    { type: 'image_url', image_url: { url: `data:${input.image.mimeType};base64,${input.image.data}` } },
    { type: 'text', text: input.prompt },
  ]
  return generate([{ role: 'user', content }], {
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
  const raw = await generate(toMessages(input.turns), {
    system: input.system,
    model: textModel(),
    json: true,
    maxOutputTokens: input.maxOutputTokens ?? 700,
    temperature: input.temperature ?? 0.3,
  })
  if (!raw.ok) return raw
  const parsed = parseJsonLoose<T>(raw.value)
  if (parsed === undefined) {
    return { ok: false, error: { kind: 'parse', message: 'Balasan model bukan JSON yang bisa dibaca.' } }
  }
  return { ok: true, value: parsed }
}

/**
 * Parser JSON toleran: model kadang membungkus JSON dalam pagar markdown
 * (```json … ```) walau mode JSON sudah diminta. Ambil objek pertama.
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

