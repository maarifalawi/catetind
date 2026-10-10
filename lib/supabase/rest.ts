import { supabaseAnonKey, supabaseUrl } from './config'

/* ── REST BER-TOKEN UNTUK ROUTE HANDLER (paket 45) ───────────────────────────
   Route `app/api/**` memakai ini untuk membaca/menulis tabel dengan
   `Authorization: Bearer <access_token>` MILIK PEMANGGIL. Dua konsekuensi yang
   membuatnya layak dipakai:

     1. RLS ditegakkan server pada SETIAP query — route handler tidak perlu (dan
        tidak boleh) menyaring `user_id` sendiri. Kalau kode route salah, database
        tetap menolak.
     2. Token yang tidak sah/kedaluwarsa ditolak Auth → route meneruskan status
        aslinya (401/403), bukan "sepertinya berhasil".

   Implementasi sengaja `fetch` polos, bukan klien supabase-js: fungsi ini dipakai
   di server, dan tidak butuh realtime/storage/auth-refresh — kebutuhan yang
   membuat `@supabase/supabase-js` lebih berat. */

export interface RestResult<T> {
  ok: boolean
  /** status HTTP asli dari PostgREST (200/201/204/401/403/404/409/…) */
  status: number
  data: T | null
  /** pesan error PostgREST kalau ada (dipakai untuk log & keterangan ke user) */
  error?: string
}

/** jalur tabel → URL lengkap; `path` ditulis seperti `wallets?select=id` */
function restUrl(path: string): string {
  return `${supabaseUrl()}/rest/v1/${path.replace(/^\//, '')}`
}

export function restConfigured(): boolean {
  return supabaseUrl().length > 0 && supabaseAnonKey().length > 0
}

/**
 * Satu panggilan REST. Tidak pernah melempar: kegagalan jaringan dikembalikan
 * sebagai `{ ok:false, status:0 }` supaya pemanggil memutuskan sendiri
 * (route → 502, store → masukkan ke antrean offline).
 */
export async function restFetch<T>(
  path: string,
  {
    method = 'GET',
    accessToken,
    body,
    prefer = 'return=representation',
    headers = {},
    apiKey,
  }: {
    method?: string
    accessToken: string
    body?: unknown
    prefer?: string
    headers?: Record<string, string>
    /** override `apikey` (mis. kunci peran server di webhook); default anon */
    apiKey?: string
  } = { accessToken: '' },
): Promise<RestResult<T>> {
  if (!restConfigured()) {
    return { ok: false, status: 0, data: null, error: 'Supabase belum dikonfigurasi' }
  }

  try {
    const res = await fetch(restUrl(path), {
      method,
      headers: {
        apikey: apiKey ?? supabaseAnonKey(),
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        Prefer: prefer,
        ...headers,
      },
      body: body === undefined ? undefined : JSON.stringify(body),
      cache: 'no-store',
    })

    const text = await res.text()
    const parsed = text.length > 0 ? (JSON.parse(text) as unknown) : null
    if (!res.ok) {
      const message =
        parsed && typeof parsed === 'object' && 'message' in parsed
          ? String((parsed as { message: unknown }).message)
          : `Permintaan ditolak server (${res.status})`
      return { ok: false, status: res.status, data: null, error: message }
    }
    return { ok: true, status: res.status, data: (parsed as T) ?? null }
  } catch (error) {
    return {
      ok: false,
      status: 0,
      data: null,
      error: error instanceof Error ? error.message : 'Jaringan tidak bisa dihubungi',
    }
  }
}

/** panggil RPC (fungsi `security definer`) dengan token pemanggil */
export async function restRpc<T>(
  fn: string,
  args: Record<string, unknown>,
  accessToken: string,
  /** override `apikey` (mis. kunci peran server di webhook); default anon */
  apiKey?: string,
): Promise<RestResult<T>> {
  return restFetch<T>(`rpc/${fn}`, { method: 'POST', accessToken, body: args, apiKey })
}

/** true = kegagalan karena baris/bentuknya memang sudah ada (idempotensi) */
export function isDuplicate(result: RestResult<unknown>): boolean {
  return result.status === 409
}
