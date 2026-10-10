import { afterEach, describe, expect, it, vi, type Mock } from 'vitest'
import { NextRequest } from 'next/server'

/* Sejak paket 70 route AI memakai `aiCallerId()` (sesi Supabase bila ada, kalau
   tidak identitas anonim per-jaringan) — bukan lagi `requireUser()`, karena
   Dashboard CatetInd memang bisa dipakai tanpa login. */

vi.mock('@/lib/ai/caller', () => ({ aiCallerId: vi.fn(() => 'anon:local') }))
vi.mock('@/lib/ai/provider', () => ({
  aiConfigured: vi.fn(),
  generateFromImage: vi.fn(),
  visionModel: () => 'deepseek-flash',
  /* parser asli cukup diwakili JSON.parse untuk pengujian jalur route */
  parseJsonLoose: (text: string) => JSON.parse(text),
}))
vi.mock('@/lib/ai/rate-limit', () => ({ allowAiCall: vi.fn() }))

import { POST } from './route'
import { aiConfigured, generateFromImage } from '@/lib/ai/provider'
import { allowAiCall } from '@/lib/ai/rate-limit'

const configured = aiConfigured as unknown as Mock
const genImage = generateFromImage as unknown as Mock
const allow = allowAiCall as unknown as Mock

function request(body: unknown): NextRequest {
  return new NextRequest('http://localhost/api/ai/ocr', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })
}

function ready(): void {
  configured.mockReturnValue(true)
  allow.mockReturnValue(true)
}

afterEach(() => vi.clearAllMocks())

describe('POST /api/ai/ocr', () => {
  it('tanpa sesi TETAP diproses (tidak 401)', async () => {
    ready()
    const res = await POST(request({}))
    expect(res.status).toBe(422) // lanjut ke validasi body, bukan ditolak sesi
  })

  it('422 kalau gambar tidak ada', async () => {
    ready()
    const res = await POST(request({}))
    expect(res.status).toBe(422)
  })

  it('413 kalau gambar kegedean', async () => {
    ready()
    const res = await POST(request({ image: 'a'.repeat(7_000_001) }))
    expect(res.status).toBe(413)
    expect(genImage).not.toHaveBeenCalled()
  })

  it('200 mengembalikan ExtractedTransaction yang sah', async () => {
    ready()
    genImage.mockResolvedValueOnce({
      ok: true,
      value: JSON.stringify({
        name: 'Belanja Indomaret',
        amount: 87500,
        category: 'Belanja',
        wallet: 'Tunai',
        type: 'expense',
        date: '2026-10-03',
        confidence: 0.86,
      }),
    })
    const res = await POST(request({ image: 'aGVsbG8=' }))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.transaction.source).toBe('receipt')
    expect(body.transaction.amount).toBe(87500)
    expect(body.transaction.category).toBe('Belanja')
    expect(typeof body.transaction.confidence).toBe('number')
    expect(Array.isArray(body.transaction.lowFields)).toBe(true)
  })

  it('503 saat provider gagal', async () => {
    ready()
    genImage.mockResolvedValueOnce({ ok: false, error: { kind: 'provider', message: 'boom' } })
    const res = await POST(request({ image: 'aGVsbG8=' }))
    expect(res.status).toBe(503)
    expect((await res.json()).reason).toBe('provider')
  })
})
