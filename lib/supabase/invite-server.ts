import type { InviteStatus, RemoteInviteStatus } from './invite-remote'
import { supabaseAnonKey } from './config'
import { restConfigured, restRpc } from './rest'

/* ── STATUS UNDANGAN DI SERVER (paket 100) ───────────────────────────────────
   `/join/[code]` adalah halaman PUBLIK yang dibuka dari chat. Sebelum ini status
   undangannya dihitung `lib/invite-store.ts` — yaitu `localStorage` PERANGKAT
   PENGUNDANG. Di perangkat orang yang diundang store itu kosong, jadi kode yang
   benar-benar ada di tabel `invite_codes` tetap ditampilkan "Kodenya nggak
   ketemu" pada render pertama (dan judul/metadata-nya ikut salah).

   Fungsi ini memanggil RPC `catetind_resolve_invite` dari SERVER memakai kunci
   anon — bukan kebocoran: RPC itu `security definer`, sengaja dibuka untuk `anon`
   (halaman ini harus bisa dibaca sebelum user masuk), dan hanya mengembalikan
   status + nama dompet + nama panggilan pengundang. Isi dompet tidak pernah ikut.

   `null` = RPC/backend belum tersedia (migrasi belum jalan, env kosong, jaringan
   mati). Pemanggil lalu memakai jalur lokal seperti sebelumnya — bukan halaman
   kosong. */

interface ResolveInviteRow {
  invite_status?: InviteStatus
  invite_wallet_id?: string | null
  invite_wallet_name?: string | null
  invite_expires_at?: string | null
  invite_member_count?: number | null
  invite_inviter_name?: string | null
}

export async function resolveInviteStatusOnServer(
  code: string,
): Promise<RemoteInviteStatus | null> {
  const normalized = code.trim().toUpperCase()
  if (!restConfigured() || !normalized) return null

  try {
    /* kunci anon dipakai sebagai token DAN apikey: perannya `anon`, persis
       pemanggil yang belum masuk — bukan kunci rahasia mana pun. */
    const anon = supabaseAnonKey()
    const result = await restRpc<ResolveInviteRow[]>(
      'catetind_resolve_invite',
      { p_code: normalized },
      anon,
      anon,
    )
    if (!result.ok || !result.data) return null

    const row = (Array.isArray(result.data) ? result.data[0] : result.data) as
      | ResolveInviteRow
      | undefined
    if (!row?.invite_status) return null

    return {
      status: row.invite_status,
      jointWalletId: row.invite_wallet_id ?? null,
      walletName: row.invite_wallet_name ?? null,
      expiresAt: row.invite_expires_at ?? null,
      memberCount: row.invite_member_count ?? 0,
      inviterName: row.invite_inviter_name?.trim() || null,
    }
  } catch {
    return null
  }
}
