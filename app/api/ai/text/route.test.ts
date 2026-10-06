import { afterEach, describe, expect, it, vi, type Mock } from 'vitest'
import { NextRequest } from 'next/server'

/* Route AI diuji dengan identitas pemanggil, provider, dan pembatas laju
   DI-MOCK: yang diperiksa adalah ATURAN endpoint — kapan menolak, kapan jujur
   berkata belum tersambung. Sejak paket 70 identitas dibaca `aiCallerId()`
   (sesi Supabase bila ada, kalau tidak identitas anonim per-jaringan), jadi
   endpoint ini tetap jalan di Dashboard yang memang bisa dipakai tanpa login. */

vi.mock('@/lib/ai/caller', () => ({ aiCallerId: vi.fn(() => 'anon:local') }))
vi.mock('@/lib/ai/provider', () => ({
  aiConfigured: vi.fn(),
  generateText: vi.fn(),
  textModel: () => 'gemini-2.5-flash',
}))
vi.mock('@/lib/ai/rate-limit', () => ({ allowAiCall: vi.fn() }))

import { POST } from './route'
import { aiConfigured, generateText } from '@/lib/ai/provider'
import { allowAiCall } from '@/lib/ai/rate-limit'

const configured = aiConfigured as unknown as Mock
const genText = generateText as unknown as Mock
const allow = allowAiCall as unknown as Mock

function request(body: unknown): NextRequest {
  return new NextRequest('http://localhost/api/ai/text', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })
}

/** provider & pembatas laju siap → fokus ke aturan body/balasan */
function ready(): void {
  configured.mockReturnValue(true)
  allow.mockReturnValue(true)
}

afterEach(() => vi.clearAllMocks())

describe('POST /api/ai/text', () => {
  it('tanpa sesi TETAP dijawab (tidak 401) — Dashboard bisa dipakai tanpa login', async () => {
    ready()
    genText.mockResolvedValueOnce({ ok: true, value: 'Halo!' })
    const res = await POST(request({ messages: [{ role: 'user', content: 'hi' }] }))
    expect(res.status).toBe(200)
    expect((await res.json()).reply).toBe('Halo!')
  })

  it('503 saat kunci AI belum ada (reason no-key)', async () => {
    ready()
    configured.mockReturnValue(false)
    const res = await POST(request({ messages: [{ role: 'user', content: 'hi' }] }))
    expect(res.status).toBe(503)
    expect((await res.json()).reason).toBe('no-key')
  })

  it('429 saat laju terlampaui', async () => {
    ready()
    allow.mockReturnValue(false)
    const res = await POST(request({ messages: [{ role: 'user', content: 'hi' }] }))
    expect(res.status).toBe(429)
    expect(genText).not.toHaveBeenCalled()
  })

  it('422 kalau pesan terakhir bukan dari user', async () => {
    ready()
    const res = await POST(request({ messages: [{ role: 'ai', content: 'hai' }] }))
    expect(res.status).toBe(422)
  })

  it('200 saat model menjawab (ruleBased false)', async () => {
    ready()
    genText.mockResolvedValueOnce({ ok: true, value: 'Semangat ya!' })
    const res = await POST(request({ messages: [{ role: 'user', content: 'hai' }] }))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.reply).toBe('Semangat ya!')
    expect(body.ruleBased).toBe(false)
  })

  it('provider rate-limit → 429 reason rate-limit (UI jatuh ke aturan lokal)', async () => {
    ready()
    genText.mockResolvedValueOnce({ ok: false, error: { kind: 'rate-limit', message: 'penuh' } })
    const res = await POST(request({ messages: [{ role: 'user', content: 'hai' }] }))
    expect(res.status).toBe(429)
    expect((await res.json()).reason).toBe('rate-limit')
  })
})
