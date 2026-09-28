'use client'

import { browserSupabase } from './client'

/* ── KODE UNDANGAN DOMPET BERSAMA DI SERVER (`invite_codes`) (paket 45) ──────
   Sebelum paket ini satu-satunya penyimpanan kode undangan adalah
   `localStorage` perangkat pembuatnya — artinya kode yang dibuat Jon TIDAK BISA
   dipakai Dany di perangkat lain, padahal itu inti fiturnya. Batas itu ditulis
   apa adanya di `lib/invite-store.ts`.

   Sekarang status undangan hidup di server dan ditegakkan oleh RPC
   `security definer`:
     · `catetind_create_invite` — hanya anggota dompet yang boleh membuat kode,
       dan kode lama otomatis kedaluwarsa (satu kode aktif per dompet);
     · `catetind_resolve_invite` — boleh dipanggil TANPA login (halaman
       `/join/[code]` menampilkan status sebelum user masuk), dan hanya
       mengembalikan status + nama dompet;
     · `catetind_accept_invite` — sekali pakai: kode yang sama ditolak untuk
       akun berikutnya (dibuktikan `curl` di laporan paket 45).

   Fungsi di file ini selalu mengembalikan bentuk yang sama dengan tipe di
   `lib/data/joint-invite.ts`, jadi pemanggil (layar /join & flow undangan) tidak
   perlu tahu dari mana datanya datang — hanya perlu tahu bahwa `null` berarti
   "jalur server tidak tersedia" dan pemanggil jatuh ke jalur lokal. */

export type InviteStatus = 'valid' | 'expired' | 'used' | 'not_found'

export interface RemoteInviteStatus {
  status: InviteStatus
  jointWalletId: string | null
  walletName: string | null
  expiresAt: string | null
  memberCount: number
}

/** terjemahan kode error Postgres → pesan Indonesia yang bisa dibaca user */
export function inviteErrorMessage(error: string): string {
  if (error.includes('23505') || error.includes('sudah dipakai')) return 'Kode undangan ini sudah dipakai.'
  if (error.includes('22007') || error.includes('kedaluwarsa')) return 'Kode undangan sudah kedaluwarsa.'
  if (error.includes('P0002') || error.includes('tidak ditemukan')) return 'Kode undangan tidak ditemukan.'
  if (error.includes('42501') || error.includes('permission')) return 'Kamu bukan anggota dompet ini.'
  if (error.includes('28000')) return 'Masuk dulu ya, baru bisa gabung.'
  return 'Undangan tidak bisa diproses. Coba lagi sebentar ya.'
}

export async function resolveInviteRemote(code: string): Promise<RemoteInviteStatus | null> {
  const client = browserSupabase()
  if (!client) return null
  try {
    const { data, error } = await client.rpc('catetind_resolve_invite', { p_code: code.trim().toUpperCase() })
    if (error) return null
    const row = (Array.isArray(data) ? data[0] : data) as
      | {
          invite_status: InviteStatus
          invite_wallet_id: string | null
          invite_wallet_name: string | null
          invite_expires_at: string | null
          invite_member_count: number
        }
      | undefined
    if (!row) return null
    return {
      status: row.invite_status,
      jointWalletId: row.invite_wallet_id,
      walletName: row.invite_wallet_name,
      expiresAt: row.invite_expires_at,
      memberCount: row.invite_member_count,
    }
  } catch {
    return null
  }
}

/** buat kode baru (satu kode aktif per dompet). `null` = jalur server tidak ada. */
export async function createInviteRemote(
  jointWalletId: string,
  code: string,
  ttlHours = 24,
): Promise<{ code: string; expiresAt: string } | null> {
  const client = browserSupabase()
  if (!client) return null
  try {
    const { data, error } = await client.rpc('catetind_create_invite', {
      p_joint_wallet: jointWalletId,
      p_code: code,
      p_ttl_hours: ttlHours,
    })
    if (error) return null
    const row = (Array.isArray(data) ? data[0] : data) as
      | { invite_code: string; invite_expires_at: string }
      | undefined
    return row ? { code: row.invite_code, expiresAt: row.invite_expires_at } : null
  } catch {
    return null
  }
}

export interface AcceptInviteResult {
  ok: boolean
  jointWalletId: string | null
  walletName: string | null
  error?: string
}

/** terima undangan: masuk keanggotaan + kode ditandai terpakai (satu transaksi) */
export async function acceptInviteRemote(code: string): Promise<AcceptInviteResult> {
  const client = browserSupabase()
  if (!client) return { ok: false, jointWalletId: null, walletName: null }
  try {
    const { data, error } = await client.rpc('catetind_accept_invite', {
      p_code: code.trim().toUpperCase(),
    })
    if (error) {
      return {
        ok: false,
        jointWalletId: null,
        walletName: null,
        error: inviteErrorMessage(`${error.code ?? ''} ${error.message ?? ''}`),
      }
    }
    const row = (Array.isArray(data) ? data[0] : data) as
      | { invite_wallet_id: string; invite_wallet_name: string }
      | undefined
    return {
      ok: Boolean(row),
      jointWalletId: row?.invite_wallet_id ?? null,
      walletName: row?.invite_wallet_name ?? null,
    }
  } catch {
    return { ok: false, jointWalletId: null, walletName: null, error: 'Jaringan tidak bisa dihubungi.' }
  }
}

/** daftar anggota satu dompet bersama (nama panggilan) — untuk layar /joint */
export async function jointMembersRemote(
  jointWalletId: string,
): Promise<{ userId: string; role: string }[] | null> {
  const client = browserSupabase()
  if (!client) return null
  try {
    const { data, error } = await client
      .from('joint_members')
      .select('user_id,role')
      .eq('joint_wallet_id', jointWalletId)
    if (error || !data) return null
    return (data as { user_id: string; role: string }[]).map((row) => ({
      userId: row.user_id,
      role: row.role,
    }))
  } catch {
    return null
  }
}
