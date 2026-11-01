import { beforeEach, describe, expect, it, vi, type Mock } from 'vitest'

/* ── PENJAGA AKSES ADMIN DI SERVER ───────────────────────────────────────────
   Inilah satu-satunya tempat izin admin diberikan. Test ini memakai sesi
   PALSU: pengunjung tanpa sesi, sesi yang gagal diverifikasi, user biasa, dan
   pemilik. Yang dijaga: dashboard bisnis tidak pernah terbuka untuk tiga yang
   pertama — termasuk saat klien Supabase tidak tersedia.
   ────────────────────────────────────────────────────────────────────────── */

vi.mock('@/lib/supabase/server', () => ({ serverSupabase: vi.fn() }))

import { readAdminIdentity, requireAdminApi } from './guard'
import { serverSupabase } from '@/lib/supabase/server'
import { OWNER_EMAIL } from './access'

const mockServerSupabase = serverSupabase as unknown as Mock

function sessionFor(user: { id: string; email: string; nickname?: string } | null) {
  return {
    auth: {
      getUser: async () =>
        user
          ? {
              data: {
                user: {
                  id: user.id,
                  email: user.email,
                  user_metadata: user.nickname ? { nickname: user.nickname } : {},
                },
              },
              error: null,
            }
          : { data: { user: null }, error: { message: 'no session' } },
    },
  }
}

beforeEach(() => {
  mockServerSupabase.mockReset()
})

describe('readAdminIdentity', () => {
  it('menolak saat backend Supabase belum dikonfigurasi', async () => {
    mockServerSupabase.mockResolvedValue(null)
    const result = await readAdminIdentity()
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.decision).toBe('forbidden')
  })

  it('pengunjung tanpa sesi → unauthenticated', async () => {
    mockServerSupabase.mockResolvedValue(sessionFor(null))
    const result = await readAdminIdentity()
    expect(result).toEqual({
      ok: false,
      decision: 'unauthenticated',
      reason: expect.any(String),
    })
  })

  it('sesi yang verifikasinya melempar → unauthenticated (bukan 500)', async () => {
    mockServerSupabase.mockResolvedValue({
      auth: {
        getUser: async () => {
          throw new Error('jaringan mati')
        },
      },
    })
    const result = await readAdminIdentity()
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.decision).toBe('unauthenticated')
  })

  it('user biasa → forbidden', async () => {
    mockServerSupabase.mockResolvedValue(
      sessionFor({ id: 'u-1', email: 'user@catet.id', nickname: 'User' }),
    )
    const result = await readAdminIdentity()
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.decision).toBe('forbidden')
  })

  it('pemilik → admin, lengkap dengan identitasnya', async () => {
    mockServerSupabase.mockResolvedValue(
      sessionFor({ id: 'owner-1', email: OWNER_EMAIL, nickname: '  Pemilik  ' }),
    )
    const result = await readAdminIdentity()
    expect(result).toEqual({
      ok: true,
      user: { id: 'owner-1', email: OWNER_EMAIL, name: 'Pemilik' },
    })
  })
})

describe('requireAdminApi', () => {
  it('mengembalikan 401 untuk pengunjung tanpa sesi', async () => {
    mockServerSupabase.mockResolvedValue(sessionFor(null))
    const gate = await requireAdminApi()
    expect(gate.ok).toBe(false)
    if (!gate.ok) expect(gate.response.status).toBe(401)
  })

  it('mengembalikan 403 untuk user biasa', async () => {
    mockServerSupabase.mockResolvedValue(sessionFor({ id: 'u-1', email: 'user@catet.id' }))
    const gate = await requireAdminApi()
    expect(gate.ok).toBe(false)
    if (!gate.ok) expect(gate.response.status).toBe(403)
  })

  it('meloloskan pemilik', async () => {
    mockServerSupabase.mockResolvedValue(sessionFor({ id: 'owner-1', email: OWNER_EMAIL }))
    const gate = await requireAdminApi()
    expect(gate.ok).toBe(true)
    if (gate.ok) expect(gate.user.email).toBe(OWNER_EMAIL)
  })
})
