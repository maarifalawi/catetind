import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { aiConfigured, generateJSON, generateText, parseJsonLoose } from './provider'

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
