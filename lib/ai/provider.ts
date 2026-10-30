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

/**
 * Seberapa keras model "berpikir" sebelum menulis jawaban.
 *
 * PAKET 101 — ini bukan setelan kosmetik: `deepseek-flash` berpikir dulu, dan
 * token berpikir IKUT dihitung ke `max_tokens`. Uji nyata pada repo ini
 * (struk TOKO ABANG, `max_tokens: 700`, `reasoning_effort: 'low'`):
 *
 *   · 'low'  → 520 dari 570 token habis dipakai berpikir, hanya ~50 tersisa
 *              untuk JSON; pada prompt yang lebih panjang jawabannya jadi
 *              KOSONG (`finish_reason: length`) → user melihat "Model AI belum
 *              mengirim jawaban", setelah menunggu ~25 detik;
 *   · 'none' → 0 token berpikir, jawaban benar, ~1,8 detik.
 *
 * Karena itu tugas DETERMINISTIK (ekstraksi struk/ucapan, saran kategori)
 * memakai 'none', sedangkan balasan coach tetap 'low' (reasoning membantu di
 * sana dan jatah tokennya lebih besar).
 */
export type ReasoningEffort = 'none' | 'low' | 'medium' | 'high'

interface OpenAiBody {
  model: string
  messages: OpenAiMessage[]
  temperature: number
  max_tokens: number
  /** mode JSON: provider memaksa balasan berupa objek JSON */
  response_format?: { type: 'json_object' }
  /** dihilangkan sepenuhnya kalau pemanggil tidak menentukan */
  reasoning_effort?: ReasoningEffort
  stream: false
}

/** jawaban teks dari `choices[0].message.content` (satu-satunya jalur yang dipakai) */
function extractText(payload: unknown): string {
  const choices = (payload as { choices?: unknown[] })?.choices
  if (!Array.isArray(choices) || choices.length === 0) return ''
  const content = (choices[0] as { message?: { content?: unknown } })?.message?.content
  return typeof content === 'string' ? content.trim() : ''
}

/**
 * Kenapa jawabannya kosong — untuk LOG SERVER, bukan untuk user (paket 101).
 *
 * Kegagalan "Model AI belum mengirim jawaban" yang dikeluhkan pemilik produk
 * ternyata bukan gangguan jaringan: `deepseek-flash` menghabiskan seluruh
 * `max_tokens` untuk token BERPIKIR, lalu tidak menyisakan satu token pun untuk
 * `content` (`finish_reason: 'length'`). Tanpa angka ini, operator hanya melihat
 * "Model tidak mengembalikan teks" dan tidak tahu harus menaikkan jatah token
 * atau mematikan reasoning.
 */
function emptyReason(payload: unknown): string {
  const choice = (payload as { choices?: { finish_reason?: unknown; message?: { reasoning_content?: unknown } }[] })
    ?.choices?.[0]
  const finish = typeof choice?.finish_reason === 'string' ? choice.finish_reason : 'tidak diketahui'
  const usage = (
    payload as {
      usage?: {
        completion_tokens?: number
        completion_tokens_details?: { reasoning_tokens?: number }
      }
    }
  )?.usage
  const reasoning = usage?.completion_tokens_details?.reasoning_tokens
  const trace = typeof choice?.message?.reasoning_content === 'string' && choice.message.reasoning_content.length > 0
  if (finish === 'length' || trace) {
    return `Model kehabisan jatah token untuk berpikir sebelum menulis jawaban (finish_reason=${finish}, reasoning_tokens=${reasoning ?? '?'}, completion_tokens=${usage?.completion_tokens ?? '?'}).`
  }
  return `Model tidak mengembalikan teks (finish_reason=${finish}).`
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

/* ── PESAN YANG BOLEH DILIHAT USER ───────────────────────────────────────────
   Route AI dulu meneruskan `error.message` penyedia APA ADANYA ke klien
   (`{ ok:false, reason, error }`). Dua masalahnya:
     1. Pesan penyedia itu sidik jari. Kalimat seperti "Insufficient Balance" atau
        "Rate limit reached" khas endpoint bergaya OpenAI, jadi ia bisa dipakai
        orang luar untuk menebak siapa penyedia di balik app.
     2. Isinya istilah internal berbahasa Inggris — tidak berguna bagi user.
   Karena itu balasan ke klien memakai pesan KANON di bawah (Bahasa Indonesia,
   tanpa nama penyedia), sementara kenyataan aslinya tetap dicatat di log SERVER
   lewat `logAiFailure()`. Operator tetap bisa mendiagnosis; user tetap dapat
   kalimat jujur tanpa bocoran. */
export function aiUserMessage(kind: AiErrorKind): string {
  switch (kind) {
    case 'no-key':
      return 'AI belum tersambung di server ini.'
    case 'timeout':
      return 'Model AI-nya lama menjawab, coba lagi sebentar ya 🌿'
    case 'rate-limit':
      return 'Model AI sedang penuh, tunggu sebentar, lalu coba lagi ya 🌿'
    case 'empty':
      return 'Model AI belum mengirim jawaban, coba lagi ya 🌿'
    case 'parse':
      return 'Jawaban model belum bisa dibaca, coba lagi ya 🌿'
    default:
      return 'Model AI belum bisa dihubungi, coba lagi sebentar ya 🌿'
  }
}

/**
 * Catat kegagalan penyedia di log server — SATU-SATUNYA tempat pesan aslinya
 * boleh muncul. Tanpa ini, penutupan kebocoran di atas berubah jadi kehilangan
 * informasi: operator tidak akan pernah tahu penyebab aslinya.
 */
export function logAiFailure(error: AiError): void {
  const status = error.status === undefined ? '' : ` (${error.status})`
  console.warn(`[ai] ${error.kind}${status}: ${error.message}`)
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
    if (!text) return { ok: false, error: { kind: 'empty', message: emptyReason(payload) } }
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
  /** default pemanggil yang menentukan; tanpa nilai = provider memakai bawaannya */
  reasoningEffort?: ReasoningEffort
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
    ...(opts.reasoningEffort ? { reasoning_effort: opts.reasoningEffort } : {}),
    stream: false,
  }

  let result = await postOnce(body)
  /* satu percobaan ulang HANYA untuk kegagalan sementara (timeout/provider 5xx).
     `empty` ikut dicoba ulang SEJAK paket 101: dulu jawaban kosong terjadi karena
     jatah token habis dipakai berpikir, dan satu percobaan baru (setelah
     `reasoning_effort` dimatikan) hampir selalu berhasil. `rate-limit`/`no-key`
     tidak diulang: mengulang tidak akan menolong. */
  if (
    !result.ok &&
    (result.error.kind === 'timeout' ||
      result.error.kind === 'provider' ||
      result.error.kind === 'empty')
  ) {
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
    /* coach tetap boleh berpikir — jawabannya kalimat panjang, jadi jatah token
       berpikir tidak memakan tempat jawaban (paket 101 menaikkan jatahnya) */
    reasoningEffort: 'low',
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
    /* 1500 (dulu 700): cukup untuk JSON + sisa token berpikir kalau penyedia
       mengabaikan `reasoning_effort: 'none'` (paket 101). */
    maxOutputTokens: input.maxOutputTokens ?? 1500,
    temperature: input.temperature ?? 0.3,
    /* struk = tugas DETERMINISTIK: berpikir tidak menambah akurasi, tapi
       memakan jatah token & menambah ~20 detik. Lihat catatan `ReasoningEffort`. */
    reasoningEffort: 'none',
  })
}

/** balasan JSON ter-parse; gagal parse = error `parse` (pemanggil jatuh ke fallback) */
export async function generateJSON<T>(input: {
  system: string
  turns: ChatTurn[]
  maxOutputTokens?: number
  temperature?: number
  /**
   * Default 'none' (tugas deterministik: ekstraksi & saran kategori). Pemanggil
   * yang butuh penalaran — mis. coach yang menjawab lewat envelope JSON — boleh
   * meminta 'low' DAN memberi jatah token yang cukup (paket 101).
   */
  reasoningEffort?: ReasoningEffort
}): Promise<AiResult<T>> {
  const raw = await generate(toMessages(input.turns), {
    system: input.system,
    model: textModel(),
    json: true,
    /* 1200 (dulu 700): jatah aman untuk JSON ekstraksi + sisa kalau penyedia
       tetap menyisipkan token berpikir (paket 101). */
    maxOutputTokens: input.maxOutputTokens ?? 1200,
    temperature: input.temperature ?? 0.3,
    reasoningEffort: input.reasoningEffort ?? 'none',
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

