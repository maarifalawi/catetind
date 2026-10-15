import { afterEach, describe, expect, it, vi, type Mock } from 'vitest'
import { NextRequest, NextResponse } from 'next/server'

/* Route AI diuji dengan identitas pemanggil, provider, dan pembatas laju
   DI-MOCK: yang diperiksa adalah ATURAN endpoint — kapan menolak, kapan jujur
   berkata belum tersambung. Sejak paket 70 identitas dibaca `aiCallerId()`
   (sesi Supabase bila ada, kalau tidak identitas anonim per-jaringan), jadi
   endpoint ini tetap jalan di Dashboard yang memang bisa dipakai tanpa login.

   PAKET 86 (nama mesin publik & kebocoran vendor): yang di-mock HANYA panggilan
   providernya (`importOriginal` + override), supaya `aiUserMessage()` dan
   `logAiFailure()` yang ASLI ikut diuji. Kalau keduanya ikut di-mock, test ini
   cuma menguji tiruannya sendiri.

   `textModel` sengaja TIDAK lagi ada di mock: route berhenti bergantung pada
   nama model penyedia (field `model` kini `AI_ENGINE_ID`). Kalau suatu saat ada
   yang memakainya lagi, test di file ini gagal — bukan bocor diam-diam. */

vi.mock('@/lib/ai/caller', () => ({ aiCallerId: vi.fn(() => 'anon:local') }))
vi.mock('@/lib/ai/provider', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/ai/provider')>()
  return { ...actual, aiConfigured: vi.fn(), generateText: vi.fn(), generateJSON: vi.fn() }
})
vi.mock('@/lib/ai/rate-limit', () => ({ allowAiCall: vi.fn() }))
/* Kunci fitur per tier DI-MOCK di sini: aturan keputusannya diuji tersendiri
   (`lib/subscription/capability.test.ts`); yang diperiksa di file ini adalah
   bahwa route BENAR-BENAR memanggil guard itu sebelum menyentuh provider. */
vi.mock('@/lib/subscription/capability', () => ({ requireCapability: vi.fn() }))

import { POST } from './route'
import { AI_ENGINE_ID } from '@/lib/ai/engine'
import { aiConfigured, aiUserMessage, generateJSON, generateText } from '@/lib/ai/provider'
import { allowAiCall } from '@/lib/ai/rate-limit'
import { requireCapability } from '@/lib/subscription/capability'

const configured = aiConfigured as unknown as Mock
const genText = generateText as unknown as Mock
const genJson = generateJSON as unknown as Mock
const allow = allowAiCall as unknown as Mock
const gate = requireCapability as unknown as Mock

function request(body: unknown): NextRequest {
  return new NextRequest('http://localhost/api/ai/text', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })
}

/** provider & pembatas laju siap → fokus ke aturan body/balasan */
function ready(): void {
  gate.mockResolvedValue({ ok: true, planId: null })
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
    /* `logAiFailure()` yang asli menulis ke console.warn — dibungkam di sini
       supaya keluaran test bersih (yang diuji perilakunya, bukan suara lognya;
       isi lognya sendiri dikunci di `lib/ai/provider.test.ts`). */
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    genJson.mockResolvedValueOnce({ ok: false, error: { kind: 'rate-limit', message: 'penuh' } })
    genText.mockResolvedValueOnce({ ok: false, error: { kind: 'rate-limit', message: 'penuh' } })
    const res = await POST(request({ messages: [{ role: 'user', content: 'hai' }] }))
    expect(res.status).toBe(429)
    expect((await res.json()).reason).toBe('rate-limit')
    warn.mockRestore()
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

describe('POST /api/ai/text - kunci fitur per tier (paket 84)', () => {
  it('403 dari guard: provider TIDAK dipanggil sama sekali', async () => {
    ready()
    gate.mockResolvedValue({
      ok: false,
      response: NextResponse.json({ ok: false, reason: 'plan-locked' }, { status: 403 }),
    })
    const res = await POST(request({ messages: [{ role: 'user', content: 'hai' }] }))
    expect(res.status).toBe(403)
    expect((await res.json()).reason).toBe('plan-locked')
    expect(genJson).not.toHaveBeenCalled()
    expect(genText).not.toHaveBeenCalled()
  })
})

describe('POST /api/ai/text - nama mesin publik & kebocoran vendor (paket 86)', () => {
  /* Yang dijaga di sini bukan kerapian, melainkan dua kebocoran yang sudah
     terbukti: (1) field `model` dulu diisi nama MODEL penyedia, (2) pesan gagal
     penyedia diteruskan apa adanya — dua-duanya bisa dibaca siapa pun dari tab
     Network. Nama penyedia di test ini sengaja dipakai sebagai contoh pesan
     PALSU dari provider untuk membuktikan ia tidak pernah ikut keluar. */

  it('200: model = AI_ENGINE_ID, dan balasan tidak memuat nama vendor', async () => {
    ready()
    answers('Semangat ya!')
    const res = await POST(request({ messages: [{ role: 'user', content: 'hai' }] }))
    const body = await res.json()
    expect(body.model).toBe(AI_ENGINE_ID)
    expect(JSON.stringify(body).toLowerCase()).not.toContain('deepseek')
  })

  it('tolakan di luar konteks juga memakai nama mesin publik', async () => {
    ready()
    const res = await POST(
      request({ messages: [{ role: 'user', content: 'buatkan script python buat scraping' }] }),
    )
    const body = await res.json()
    expect(body.blocked).toBe('scope')
    expect(body.model).toBe(AI_ENGINE_ID)
  })

  it('gagal provider: klien dapat pesan kanon, pesan asli hanya ke log server', async () => {
    ready()
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const upstream = {
      ok: false,
      error: { kind: 'provider', status: 500, message: 'deepseek upstream: Insufficient Balance' },
    }
    genJson.mockResolvedValueOnce(upstream)
    genText.mockResolvedValueOnce(upstream)
    const res = await POST(request({ messages: [{ role: 'user', content: 'hai' }] }))
    expect(res.status).toBe(503)
    const body = await res.json()
    expect(body.reason).toBe('provider')
    expect(body.error).toBe(aiUserMessage('provider'))
    expect(JSON.stringify(body).toLowerCase()).not.toContain('deepseek')
    expect(JSON.stringify(body)).not.toContain('Insufficient Balance')
    /* diagnosis TIDAK hilang - pesan aslinya tercatat di log server */
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('Insufficient Balance'))
    warn.mockRestore()
  })

  it('rate-limit: 429 dengan pesan kanon, bukan kalimat penyedia', async () => {
    ready()
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const limited = {
      ok: false,
      error: { kind: 'rate-limit', message: 'Rate limit reached for deepseek' },
    }
    genJson.mockResolvedValueOnce(limited)
    genText.mockResolvedValueOnce(limited)
    const res = await POST(request({ messages: [{ role: 'user', content: 'hai' }] }))
    expect(res.status).toBe(429)
    const body = await res.json()
    expect(body.reason).toBe('rate-limit')
    expect(body.error).toBe(aiUserMessage('rate-limit'))
    expect(JSON.stringify(body).toLowerCase()).not.toContain('deepseek')
    warn.mockRestore()
  })
})