import { afterEach, describe, expect, it, vi, type Mock } from 'vitest'
import { NextRequest } from 'next/server'

/* Sejak paket 70 route AI memakai `aiCallerId()` (sesi Supabase bila ada, kalau
   tidak identitas anonim per-jaringan) — bukan lagi `requireUser()`, karena
   Dashboard CatetInd memang bisa dipakai tanpa login.

   PAKET 86: yang di-mock hanya panggilan providernya (`importOriginal` +
   override), supaya `aiUserMessage()`/`logAiFailure()` yang ASLI ikut diuji —
   dan `visionModel` sengaja TIDAK ada lagi di mock: field `model` berhenti
   memakai nama model penyedia (kini `AI_ENGINE_ID`). */

vi.mock('@/lib/ai/caller', () => ({ aiCallerId: vi.fn(() => 'anon:local') }))
vi.mock('@/lib/ai/provider', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/ai/provider')>()
  return { ...actual, aiConfigured: vi.fn(), generateFromImage: vi.fn() }
})
vi.mock('@/lib/ai/rate-limit', () => ({ allowAiCall: vi.fn() }))

import { POST } from './route'
import { AI_ENGINE_ID } from '@/lib/ai/engine'
import { aiConfigured, aiUserMessage, generateFromImage } from '@/lib/ai/provider'
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
    /* nama mesin versi publik + tidak ada nama vendor di balasan (paket 86) */
    expect(body.model).toBe(AI_ENGINE_ID)
    expect(JSON.stringify(body).toLowerCase()).not.toContain('deepseek')
  })

  it('503 saat provider gagal - pesan kanon app, bukan pesan mentah penyedia', async () => {
    ready()
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    genImage.mockResolvedValueOnce({
      ok: false,
      error: { kind: 'provider', status: 500, message: 'deepseek upstream: Insufficient Balance' },
    })
    const res = await POST(request({ image: 'aGVsbG8=' }))
    expect(res.status).toBe(503)
    const body = await res.json()
    expect(body.reason).toBe('provider')
    expect(body.error).toBe(aiUserMessage('provider'))
    expect(JSON.stringify(body).toLowerCase()).not.toContain('deepseek')
    /* diagnosis tidak hilang - pesan aslinya masuk log server */
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('Insufficient Balance'))
    warn.mockRestore()
  })
})
