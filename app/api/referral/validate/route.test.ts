import { afterEach, describe, expect, it, vi, type Mock } from 'vitest'
import { NextRequest } from 'next/server'

/* Integritas kode teman diuji dengan MEM-BLOKIR modul REST-nya: yang diperiksa
   bukan jaringan, melainkan ATURAN endpoint-nya — kapan ia menolak, kapan ia
   mempersist relasi, dan kapan ia jujur mengaku belum terverifikasi. */

vi.mock('@/lib/supabase/rest', () => ({
  restConfigured: vi.fn(),
  restRpc: vi.fn(),
}))
vi.mock('@/lib/supabase/config', () => ({ supabaseAnonKey: () => 'anon-key-for-test' }))

import { POST } from './route'
import { restConfigured, restRpc } from '@/lib/supabase/rest'
import { REFERRAL_VALIDATE_COPY } from '@/lib/data/referral'

const configured = restConfigured as unknown as Mock
const rpc = restRpc as unknown as Mock

const GOOD_CODE = 'RINA-X7K'
const EMAIL = 'teman@catetind.dev'

function request(body: unknown): NextRequest {
  return new NextRequest('http://localhost/api/referral/validate', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })
}

afterEach(() => vi.clearAllMocks())

describe('POST /api/referral/validate', () => {
  it('menolak kode yang bentuknya tidak wajar tanpa menyentuh database', async () => {
    const res = await POST(request({ code: 'x' }))
    expect(res.status).toBe(422)
    expect((await res.json()).error).toBe(REFERRAL_VALIDATE_COPY.invalid)
    expect(configured).not.toHaveBeenCalled()
    expect(rpc).not.toHaveBeenCalled()
  })

  it('tanpa backend: tidak mengklaim kode terverifikasi (build demo tetap jalan)', async () => {
    configured.mockReturnValue(false)
    const res = await POST(request({ code: GOOD_CODE, email: EMAIL }))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.ok).toBe(true)
    expect(body.verified).toBe(false)
    expect(rpc).not.toHaveBeenCalled()
  })

  it('kode sah + email: relasi referral DIPERSIST ke database', async () => {
    configured.mockReturnValue(true)
    rpc.mockResolvedValueOnce({ ok: true, status: 200, data: 'referrer-uuid' })
    rpc.mockResolvedValueOnce({ ok: true, status: 200, data: true })

    const res = await POST(request({ code: GOOD_CODE, email: EMAIL }))
    expect(res.status).toBe(200)
    expect((await res.json()).verified).toBe(true)

    expect(rpc).toHaveBeenNthCalledWith(1, 'validate_referral_code', { p_code: GOOD_CODE }, 'anon-key-for-test')
    expect(rpc).toHaveBeenNthCalledWith(
      2,
      'record_referral',
      { p_code: GOOD_CODE, p_referred_email: EMAIL },
      'anon-key-for-test',
    )
  })

  it('kode tidak ada di database → 422 dan relasi TIDAK ditulis', async () => {
    configured.mockReturnValue(true)
    rpc.mockResolvedValueOnce({ ok: true, status: 200, data: null })

    const res = await POST(request({ code: GOOD_CODE, email: EMAIL }))
    expect(res.status).toBe(422)
    expect((await res.json()).error).toBe(REFERRAL_VALIDATE_COPY.invalid)
    expect(rpc).toHaveBeenCalledTimes(1)
  })

  it('kode sah tanpa email → tidak ada tulisan relasi (belum ada yang diundang)', async () => {
    configured.mockReturnValue(true)
    rpc.mockResolvedValueOnce({ ok: true, status: 200, data: 'referrer-uuid' })

    const res = await POST(request({ code: GOOD_CODE }))
    expect(res.status).toBe(200)
    expect(rpc).toHaveBeenCalledTimes(1)
  })

  it('backend tidak bisa dihubungi → 502 dengan pesan yang jujur', async () => {
    configured.mockReturnValue(true)
    rpc.mockResolvedValueOnce({ ok: false, status: 500, data: null, error: 'boom' })

    const res = await POST(request({ code: GOOD_CODE, email: EMAIL }))
    expect(res.status).toBe(502)
    expect((await res.json()).error).toBe(REFERRAL_VALIDATE_COPY.unavailable)
  })
})
