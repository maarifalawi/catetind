import { beforeEach, describe, expect, it, vi, type Mock } from 'vitest'

/* ── PENGAMBILAN SNAPSHOT (TANPA JALUR DATA CONTOH) ──────────────────────────
   Satu hal yang dikunci di sini: kalau backend tidak bisa dipakai, dashboard
   TIDAK mengarang angka. Ia mengembalikan `ok:false` supaya layar menampilkan
   pesan jujur — bukan total palsu yang terlihat seperti data nyata.
   ────────────────────────────────────────────────────────────────────────── */

vi.mock('@/lib/supabase/admin', () => ({ adminSupabase: vi.fn() }))

import { adminSupabase } from '@/lib/supabase/admin'
import { loadAdminSnapshot } from './server'

const mockAdminSupabase = adminSupabase as unknown as Mock

beforeEach(() => {
  mockAdminSupabase.mockReset()
})

describe('loadAdminSnapshot', () => {
  it('kunci peran server belum ada → error, BUKAN data contoh', async () => {
    mockAdminSupabase.mockReturnValue(null)
    const result = await loadAdminSnapshot(new Date('2026-11-01T10:00:00.000Z'))
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.error).toContain('SUPABASE_SERVICE_ROLE_KEY')
      expect(result).not.toHaveProperty('snapshot')
    }
  })

  it('kegagalan query → error yang menyebut tabelnya, bukan snapshot kosong', async () => {
    mockAdminSupabase.mockReturnValue({
      auth: {
        admin: {
          listUsers: async () => ({ data: { users: [] }, error: null }),
        },
      },
      from: () => ({
        select: () => ({
          range: async () => ({ data: null, error: { message: 'koneksi ditolak' } }),
        }),
      }),
    })

    const result = await loadAdminSnapshot(new Date('2026-11-01T10:00:00.000Z'))
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error).toContain('koneksi ditolak')
  })
})
