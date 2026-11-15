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
  /** nama panggilan PEMBUAT kode — `null` = belum diketahui (jangan dikarang) */
  inviterName: string | null
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
          invite_inviter_name?: string | null
        }
      | undefined
    if (!row) return null
    return {
      status: row.invite_status,
      jointWalletId: row.invite_wallet_id,
      walletName: row.invite_wallet_name,
      expiresAt: row.invite_expires_at,
      memberCount: row.invite_member_count,
      inviterName: row.invite_inviter_name?.trim() || null,
    }
  } catch {
    return null
  }
}

/**
 * Kode undangan yang MASIH BERLAKU untuk satu dompet, dibaca dari server.
 *
 * Kenapa perlu: `catetind_create_invite` mencabut kode aktif sebelumnya setiap
 * kali dipanggil. Dulu modal selalu membuat kode LOKAL baru saat dibuka, lalu
 * mengirimkannya — artinya membuka modal dua kali mematikan kode yang sudah
 * dikirim ke pasangan. Dengan membaca kode aktif lebih dulu, kode yang sama
 * dipakai ulang (dan `H9FKJF` tetap hidup).
 *
 * RLS `invite_codes_creator_select` hanya mengizinkan PEMBUAT kode membacanya;
 * anggota lain akan mendapat `null` dan modal membuat kode baru — perilaku yang
 * benar: kode adalah otorisasi milik pembuatnya.
 */
export async function activeInviteRemote(
  jointWalletId: string,
): Promise<{ code: string; expiresAt: string } | null> {
  const client = browserSupabase()
  if (!client) return null
  try {
    const { data, error } = await client
      .from('invite_codes')
      .select('code,expires_at')
      .eq('joint_wallet_id', jointWalletId)
      .is('used_by', null)
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false })
      .limit(1)
    if (error || !data || data.length === 0) return null
    const row = data[0] as { code: string; expires_at: string }
    return { code: row.code, expiresAt: row.expires_at }
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
  /**
   * Apa yang TERJADI di server (paket 100 + migrasi multi-member):
   *   · `joined`  — baris keanggotaan baru ditulis; kode TIDAK dibakar, jadi
   *                 orang ketiga/keempat masih bisa memakai tautan yang sama;
   *   · `member`  — pemanggil sudah anggota dompet itu (idempoten);
   *   · `creator` — pemanggil adalah PEMBUAT kode (pratinjau pemiliknya sendiri);
   *   · `full`    — kantong sudah berisi batas maksimum anggota.
   * `null` = backend lama belum mengembalikan kolom ini / tidak ada backend.
   * Tanpa nilai ini layar tidak bisa membedakan "berhasil gabung" dari "sedang
   * memeriksa pratinjau sendiri" — dan dulu keduanya sama-sama tampil sukses.
   */
  outcome: 'joined' | 'member' | 'creator' | 'full' | null
  error?: string
}

/** terima undangan: menulis keanggotaan (idempoten; kode tidak dibakar) */
export async function acceptInviteRemote(code: string): Promise<AcceptInviteResult> {
  const client = browserSupabase()
  if (!client) {
    return { ok: false, jointWalletId: null, walletName: null, outcome: null }
  }
  try {
    const { data, error } = await client.rpc('catetind_accept_invite', {
      p_code: code.trim().toUpperCase(),
    })
    if (error) {
      return {
        ok: false,
        jointWalletId: null,
        walletName: null,
        outcome: null,
        error: inviteErrorMessage(`${error.code ?? ''} ${error.message ?? ''}`),
      }
    }
    const row = (Array.isArray(data) ? data[0] : data) as
      | { invite_wallet_id: string; invite_wallet_name: string; join_outcome?: string }
      | undefined
    const outcome =
      row?.join_outcome === 'joined' ||
      row?.join_outcome === 'member' ||
      row?.join_outcome === 'creator' ||
      row?.join_outcome === 'full'
        ? row.join_outcome
        : null
    return {
      ok: Boolean(row),
      jointWalletId: row?.invite_wallet_id ?? null,
      walletName: row?.invite_wallet_name ?? null,
      outcome,
    }
  } catch {
    return {
      ok: false,
      jointWalletId: null,
      walletName: null,
      outcome: null,
      error: 'Jaringan tidak bisa dihubungi.',
    }
  }
}

/**
 * Hubungan PEMANGGIL dengan dompet di balik satu kode — hanya dua boolean,
 * tanpa membakar kode:
 *   · `isCreator` — ia pembuat kode (pratinjau pemiliknya sendiri, jangan tawarkan "gabung");
 *   · `isMember`  — ia sudah anggota (buka tautan lagi setelah gabung tetap
 *                   menampilkan keadaan sukses, bukan "tautan sudah dipakai").
 *
 * `null` = RPC belum ada (migrasi belum jalan) / tidak ada sesi. Pemanggil
 * memperlakukan itu sebagai "belum tahu", bukan "bukan siapa-siapa".
 */
export async function readJoinStateRemote(
  code: string,
): Promise<{ isCreator: boolean; isMember: boolean } | null> {
  const client = browserSupabase()
  if (!client) return null
  try {
    const { data, error } = await client.rpc('catetind_join_state', {
      p_code: code.trim().toUpperCase(),
    })
    if (error) return null
    const row = (Array.isArray(data) ? data[0] : data) as
      | { join_is_creator?: boolean | null; join_is_member?: boolean | null }
      | undefined
    if (!row) return null
    return { isCreator: row.join_is_creator === true, isMember: row.join_is_member === true }
  } catch {
    return null
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
