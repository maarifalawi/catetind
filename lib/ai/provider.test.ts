import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  aiConfigured,
  aiUserMessage,
  generateFromImage,
  generateJSON,
  generateText,
  logAiFailure,
  parseJsonLoose,
  type AiErrorKind,
} from './provider'

/* Provider diuji dengan `fetch` di-mock: yang diperiksa adalah PEMETAAN error,
   retry, dan pengambilan teks — bukan jaringan sungguhan. */

const ORIGINAL_ENV = { ...process.env }

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status })
}

describe('lib/ai/provider', () => {
  beforeEach(() => {
    process.env.DEEPSEEK_API_KEY = 'test-key'
  })
  afterEach(() => {
    vi.restoreAllMocks()
    process.env = { ...ORIGINAL_ENV }
  })

  it('aiConfigured() false tanpa kunci', () => {
    delete process.env.DEEPSEEK_API_KEY
    expect(aiConfigured()).toBe(false)
  })

  it('generateText mengembalikan teks dari choices[0].message.content', async () => {
    global.fetch = vi.fn(async () =>
      jsonResponse({ choices: [{ message: { content: 'Halo' } }] }),
    )
    const res = await generateText({ system: 's', turns: [{ role: 'user', text: 'hi' }] })
    expect(res.ok).toBe(true)
    if (res.ok) expect(res.value).toBe('Halo')
  })

  it('tanpa kunci → error no-key, TANPA memanggil jaringan', async () => {
    delete process.env.DEEPSEEK_API_KEY
    global.fetch = vi.fn()
    const res = await generateText({ system: 's', turns: [{ role: 'user', text: 'hi' }] })
    expect(res.ok).toBe(false)
    if (!res.ok) expect(res.error.kind).toBe('no-key')
    expect(global.fetch).not.toHaveBeenCalled()
  })

  it('HTTP 429 → rate-limit (TIDAK retry)', async () => {
    const fetchMock = vi.fn(async () => jsonResponse({ error: { code: 429, message: 'quota' } }, 429))
    global.fetch = fetchMock
    const res = await generateText({ system: 's', turns: [{ role: 'user', text: 'hi' }] })
    expect(res.ok).toBe(false)
    if (!res.ok) expect(res.error.kind).toBe('rate-limit')
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('HTTP 401 → no-key', async () => {
    global.fetch = vi.fn(async () => jsonResponse({ error: { message: 'API key not valid' } }, 401))
    const res = await generateText({ system: 's', turns: [{ role: 'user', text: 'hi' }] })
    expect(res.ok).toBe(false)
    if (!res.ok) expect(res.error.kind).toBe('no-key')
  })

  it('HTTP 500 → provider, dicoba 2× (1 retry)', async () => {
    const fetchMock = vi.fn(async () => jsonResponse({ error: { message: 'boom' } }, 500))
    global.fetch = fetchMock
    const res = await generateText({ system: 's', turns: [{ role: 'user', text: 'hi' }] })
    expect(res.ok).toBe(false)
    if (!res.ok) expect(res.error.kind).toBe('provider')
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  it('abort/timeout → timeout, dicoba 2×', async () => {
    const fetchMock = vi.fn(async () => {
      const error = new Error('aborted')
      error.name = 'AbortError'
      throw error
    })
    global.fetch = fetchMock
    const res = await generateText({ system: 's', turns: [{ role: 'user', text: 'hi' }] })
    expect(res.ok).toBe(false)
    if (!res.ok) expect(res.error.kind).toBe('timeout')
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  it('generateJSON mem-parse balasan JSON', async () => {
    global.fetch = vi.fn(async () =>
      jsonResponse({ choices: [{ message: { content: '{"category":"Makanan"}' } }] }),
    )
    const res = await generateJSON<{ category: string }>({
      system: 's',
      turns: [{ role: 'user', text: 'kopi' }],
    })
    expect(res.ok).toBe(true)
    if (res.ok) expect(res.value.category).toBe('Makanan')
  })

  it('generateJSON: balasan bukan JSON → error parse', async () => {
    global.fetch = vi.fn(async () =>
      jsonResponse({ choices: [{ message: { content: 'maaf saya tidak bisa' } }] }),
    )
    const res = await generateJSON({ system: 's', turns: [{ role: 'user', text: 'kopi' }] })
    expect(res.ok).toBe(false)
    if (!res.ok) expect(res.error.kind).toBe('parse')
  })

  it('permintaan ke DeepSeek: endpoint, Bearer, dan pesan bergaya OpenAI', async () => {
    const fetchMock = vi.fn(async () => jsonResponse({ choices: [{ message: { content: 'ok' } }] }))
    global.fetch = fetchMock
    await generateText({
      system: 's',
      turns: [
        { role: 'model', text: 'sebelumnya' },
        { role: 'user', text: 'hi' },
      ],
    })
    const call = fetchMock.mock.calls[0] as unknown as [string, RequestInit]
    expect(call[0]).toBe('https://api.deepseek.com/chat/completions')
    expect((call[1].headers as Record<string, string>).Authorization).toBe('Bearer test-key')
    const body = JSON.parse(String(call[1].body)) as {
      model: string
      messages: { role: string; content: string }[]
    }
    expect(body.model).toBe('deepseek-flash')
    expect(body.messages[0]).toEqual({ role: 'system', content: 's' })
    /* peran `model` milik app diterjemahkan jadi `assistant` */
    expect(body.messages[1]).toEqual({ role: 'assistant', content: 'sebelumnya' })
    expect(body.messages[2]).toEqual({ role: 'user', content: 'hi' })
  })

  it('modelDeepseek bisa ditimpa lewat env', async () => {
    process.env.DEEPSEEK_MODEL_TEXT = 'deepseek-v4-pro'
    process.env.DEEPSEEK_BASE_URL = 'https://proxy.example/v1/'
    const fetchMock = vi.fn(async () => jsonResponse({ choices: [{ message: { content: 'ok' } }] }))
    global.fetch = fetchMock
    await generateText({ system: 's', turns: [{ role: 'user', text: 'hi' }] })
    const call = fetchMock.mock.calls[0] as unknown as [string, RequestInit]
    expect(call[0]).toBe('https://proxy.example/v1/chat/completions')
    expect((JSON.parse(String(call[1].body)) as { model: string }).model).toBe('deepseek-v4-pro')
  })
})
describe('reasoning & jatah token (paket 101)', () => {
  /* Temuan uji pakai: scan struk menjawab "Model AI belum mengirim jawaban"
     setelah ~25 detik. Sebabnya token BERPIKIR memakan seluruh `max_tokens`
     (700), sehingga `content` kosong. Test ini mengunci setelan yang mencegahnya
     kembali: ekstraksi = reasoning mati + jatah cukup, coach = reasoning hidup. */

  beforeEach(() => {
    process.env.DEEPSEEK_API_KEY = 'test-key'
    delete process.env.DEEPSEEK_MODEL_VISION
  })
  afterEach(() => {
    vi.restoreAllMocks()
    process.env = { ...ORIGINAL_ENV }
  })

  function bodyOf(fetchMock: ReturnType<typeof vi.fn>, index = 0) {
    const call = fetchMock.mock.calls[index] as unknown as [string, RequestInit]
    return JSON.parse(String(call[1].body)) as {
      reasoning_effort?: string
      max_tokens?: number
      messages: { role: string; content: unknown }[]
    }
  }

  it('OCR struk: reasoning dimatikan & jatah token cukup untuk JSON', async () => {
    const fetchMock = vi.fn(async () => jsonResponse({ choices: [{ message: { content: '{"amount":1}' } }] }))
    global.fetch = fetchMock

    await generateFromImage({
      system: 's',
      prompt: 'p',
      image: { mimeType: 'image/jpeg', data: 'abc' },
    })

    const body = bodyOf(fetchMock)
    expect(body.reasoning_effort).toBe('none')
    expect(body.max_tokens).toBeGreaterThanOrEqual(1500)
    const content = body.messages.at(-1)?.content as { type: string; image_url?: { url: string } }[]
    expect(content[0]?.image_url?.url).toBe('data:image/jpeg;base64,abc')
  })

  it('ekstraksi teks (parse ucapan/kategori): reasoning juga dimatikan', async () => {
    const fetchMock = vi.fn(async () =>
      jsonResponse({ choices: [{ message: { content: '{"category":"Makanan"}' } }] }),
    )
    global.fetch = fetchMock

    await generateJSON({ system: 's', turns: [{ role: 'user', text: 'kopi' }] })

    const body = bodyOf(fetchMock)
    expect(body.reasoning_effort).toBe('none')
    expect(body.max_tokens).toBeGreaterThanOrEqual(1200)
  })

  it('coach tetap boleh berpikir: reasoning hidup + jatah token lega', async () => {
    const fetchMock = vi.fn(async () => jsonResponse({ choices: [{ message: { content: 'Halo' } }] }))
    global.fetch = fetchMock

    await generateText({ system: 's', turns: [{ role: 'user', text: 'hi' }] })

    const body = bodyOf(fetchMock)
    expect(body.reasoning_effort).toBe('low')
    expect(body.max_tokens).toBeGreaterThanOrEqual(800)
  })

  it('pemanggil boleh meminta reasoning untuk envelope JSON coach', async () => {
    const fetchMock = vi.fn(async () => jsonResponse({ choices: [{ message: { content: '{"reply":"ok"}' } }] }))
    global.fetch = fetchMock

    await generateJSON({
      system: 's',
      turns: [{ role: 'user', text: 'hi' }],
      maxOutputTokens: 1600,
      reasoningEffort: 'low',
    })

    expect(bodyOf(fetchMock).reasoning_effort).toBe('low')
  })

  it('jawaban kosong karena kehabisan token: sebabnya TERTULIS di log & dicoba ulang', async () => {
    const fetchMock = vi.fn(async () =>
      jsonResponse({
        choices: [
          { finish_reason: 'length', message: { content: '', reasoning_content: 'mikir panjang…' } },
        ],
        usage: { completion_tokens: 700, completion_tokens_details: { reasoning_tokens: 690 } },
      }),
    )
    global.fetch = fetchMock

    const res = await generateJSON({ system: 's', turns: [{ role: 'user', text: 'x' }] })

    expect(res.ok).toBe(false)
    if (!res.ok) {
      expect(res.error.kind).toBe('empty')
      /* angka ini yang membuat operator tahu harus menaikkan jatah / mematikan reasoning */
      expect(res.error.message).toContain('reasoning_tokens=690')
      expect(res.error.message).toContain('finish_reason=length')
    }
    /* satu percobaan ulang (paket 101) — bukan dua kegagalan yang tak terjelaskan */
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })
})



describe('parseJsonLoose', () => {
  it('melepas pagar markdown', () => {
    expect(parseJsonLoose('```json\n{"a":1}\n```')).toEqual({ a: 1 })
  })
  it('mengambil objek pertama dari teks berlebih', () => {
    expect(parseJsonLoose('ini hasilnya: {"a":2} semoga membantu')).toEqual({ a: 2 })
  })
  it('undefined untuk sampah', () => {
    expect(parseJsonLoose('tidak ada json di sini')).toBeUndefined()
  })
})

describe('aiUserMessage & logAiFailure (paket 86)', () => {
  /* Pesan penyedia tidak lagi diteruskan ke klien (lihat catatan di provider.ts).
     Dua sisi dari keputusan itu dikunci di sini: yang keluar ke klien harus
     kalimat kanon tanpa nama vendor, dan kenyataan aslinya tetap tercatat di log
     server — kalau tidak, penutupan kebocoran ini berubah jadi kehilangan
     informasi bagi operator. */

  const KINDS: AiErrorKind[] = ['no-key', 'timeout', 'rate-limit', 'provider', 'empty', 'parse']

  it('setiap jenis kegagalan punya pesan kanon yang tidak menyebut penyedia', () => {
    for (const kind of KINDS) {
      const message = aiUserMessage(kind)
      expect(message.trim().length).toBeGreaterThan(0)
      expect(message.toLowerCase()).not.toContain('deepseek')
      expect(message.toLowerCase()).not.toContain('api key')
    }
  })

  it('pesannya berbeda per jenis (bukan satu kalimat untuk semua kegagalan)', () => {
    const unique = new Set(KINDS.map((kind) => aiUserMessage(kind)))
    expect(unique.size).toBe(KINDS.length)
  })

  it('logAiFailure mencatat kenyataan aslinya ke log server', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    logAiFailure({ kind: 'provider', status: 500, message: 'Insufficient Balance' })
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('Insufficient Balance'))
    warn.mockRestore()
  })
})
