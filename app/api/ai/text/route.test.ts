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
  generateJSON: vi.fn(),
  textModel: () => 'deepseek-flash',
}))
vi.mock('@/lib/ai/rate-limit', () => ({ allowAiCall: vi.fn() }))

import { POST } from './route'
import { aiConfigured, generateJSON, generateText } from '@/lib/ai/provider'
import { allowAiCall } from '@/lib/ai/rate-limit'

const configured = aiConfigured as unknown as Mock
const genText = generateText as unknown as Mock
const genJson = generateJSON as unknown as Mock
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

/** model menjawab lewat envelope JSON (bentuk resmi sejak paket 80) */
function answers(reply: string): void {
  genJson.mockResolvedValueOnce({ ok: true, value: { inScope: true, reply } })
}

afterEach(() => vi.clearAllMocks())

describe('POST /api/ai/text', () => {
  it('tanpa sesi TETAP dijawab (tidak 401) — Dashboard bisa dipakai tanpa login', async () => {
    ready()
    answers('Halo!')
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
    expect(genJson).not.toHaveBeenCalled()
  })

  it('422 kalau pesan terakhir bukan dari user', async () => {
    ready()
    const res = await POST(request({ messages: [{ role: 'ai', content: 'hai' }] }))
    expect(res.status).toBe(422)
  })

  it('200 saat model menjawab (blocked null, ruleBased false)', async () => {
    ready()
    answers('Semangat ya!')
    const res = await POST(request({ messages: [{ role: 'user', content: 'hai' }] }))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.reply).toBe('Semangat ya!')
    expect(body.ruleBased).toBe(false)
    expect(body.blocked).toBeNull()
  })

  it('provider rate-limit → 429 reason rate-limit (UI jatuh ke aturan lokal)', async () => {
    ready()
    genJson.mockResolvedValueOnce({ ok: false, error: { kind: 'rate-limit', message: 'penuh' } })
    genText.mockResolvedValueOnce({ ok: false, error: { kind: 'rate-limit', message: 'penuh' } })
    const res = await POST(request({ messages: [{ role: 'user', content: 'hai' }] }))
    expect(res.status).toBe(429)
    expect((await res.json()).reason).toBe('rate-limit')
  })
})

describe('POST /api/ai/text — pagar di luar konteks & klaim (paket 80)', () => {
  it('pertanyaan di luar konteks DITOLAK tanpa memanggil provider', async () => {
    ready()
    const res = await POST(
      request({ messages: [{ role: 'user', content: 'buatkan script python buat scraping' }] }),
    )
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.blocked).toBe('scope')
    expect(body.reply).toBe('')
    expect(genJson).not.toHaveBeenCalled()
    expect(genText).not.toHaveBeenCalled()
  })

  it('model bilang inScope false → tolakan, tanpa kalimat model', async () => {
    ready()
    genJson.mockResolvedValueOnce({ ok: true, value: { inScope: false, reply: 'Ini jawabannya…' } })
    const res = await POST(request({ messages: [{ role: 'user', content: 'gimana caranya bikin kue?' }] }))
    const body = await res.json()
    expect(body.blocked).toBe('scope')
    expect(body.reply).toBe('')
  })

  it('balasan yang mengklaim sudah mencatat → blocked claim (temuan "makn gacoan 30k")', async () => {
    ready()
    answers('Oke, "Makan Gacoan Rp 30.000" sudah tercatat sebagai pengeluaranmu ya.')
    const res = await POST(request({ messages: [{ role: 'user', content: 'makn gacoan 30k' }] }))
    const body = await res.json()
    expect(body.blocked).toBe('claim')
    expect(body.reply).toBe('')
  })

  it('envelope tak terbaca → jaring aman bentuk lama tetap menjawab', async () => {
    ready()
    genJson.mockResolvedValueOnce({ ok: false, error: { kind: 'parse', message: 'bukan JSON' } })
    genText.mockResolvedValueOnce({ ok: true, value: 'Sisa jatah harianmu Rp 95.000.' })
    const res = await POST(request({ messages: [{ role: 'user', content: 'berapa sisa jatahku?' }] }))
    const body = await res.json()
    expect(body.reply).toBe('Sisa jatah harianmu Rp 95.000.')
    expect(body.blocked).toBeNull()
  })

  it('pagar klaim juga berlaku di jalur jaring aman', async () => {
    ready()
    genJson.mockResolvedValueOnce({ ok: false, error: { kind: 'parse', message: 'bukan JSON' } })
    genText.mockResolvedValueOnce({ ok: true, value: 'Sip, sudah aku catat ya 🌿' })
    const res = await POST(request({ messages: [{ role: 'user', content: 'makan 30k' }] }))
    const body = await res.json()
    expect(body.blocked).toBe('claim')
    expect(body.reply).toBe('')
  })

  it('pesan keuangan biasa TIDAK ditolak (jatah/uang tetap dilayani)', async () => {
    ready()
    answers('Jatah harianmu masih aman kok.')
    const res = await POST(request({ messages: [{ role: 'user', content: 'harga bitcoin hari ini?' }] }))
    expect((await res.json()).blocked).toBeNull()
  })
})
