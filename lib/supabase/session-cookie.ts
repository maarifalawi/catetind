/* ── SESI SUPABASE DARI COOKIE (paket 45 · menggantikan cookie mock paket 39) ──
   Paket 39 menulis cookie bernama `catet-ind-session` berisi id user apa adanya
   (`v1.<base64url(id)>`) — bisa dipalsukan dari DevTools, dan `lib/session.ts`
   menuliskan batas itu apa adanya.

   Sekarang cookie-nya milik Supabase: `@supabase/ssr` menyimpannya sebagai
   `sb-<ref>-auth-token` (+ `.0`, `.1`, … kalau sesinya panjang), httpOnly, berisi
   sesi Auth yang ditandatangani server. Isinya JSON:

     { access_token, refresh_token, expires_at, expires_in, token_type, user }

   dan nilainya dibungkus `base64-` + base64url (`cookieEncoding: 'base64url'`
   adalah default `createBrowserClient`/`createServerClient` — lihat
   `node_modules/@supabase/ssr/dist/main/cookies.js`).

   ⚠️ BATAS JUJUR, dan ini yang harus dibaca sebelum mengubah file ini:
   pembacaan di sini TIDAK memverifikasi tanda tangan JWT — mustahil tanpa kunci
   rahasia project, dan kunci itu memang tidak boleh ada di klien. Verifikasi
   terjadi di tempat datanya: SETIAP query memakai `Authorization: Bearer
   <access_token>` yang sama ke PostgREST/Auth, dan di sana tanda tangannya
   diperiksa. Cookie palsu = token palsu = `401` dari server, jadi menulis
   `auth.uid()` palsu tidak membuka satu baris pun (dibuktikan `curl` di laporan
   paket 45). Karena itu `userId` di sini boleh dipakai untuk identitas/LABEL,
   tapi TIDAK PERNAH sebagai dasar izin akses data. */

import { supabaseAuthStorageKey } from './config'

/** nama cookie dasar (chunk pertama). Satu sumber, dipakai guard & test. */
export function sessionCookieName(): string {
  return supabaseAuthStorageKey()
}

/**
 * Sesi yang dibaca dari cookie. `userId` untuk label/analitik,
 * `accessToken` untuk SEMUA akses data (yang diverifikasi server).
 */
export interface SupabaseSession {
  userId: string
  email: string
  /** nama panggilan dari `user_metadata.nickname` (dipakai copy sapaan) */
  name: string
  accessToken: string
  refreshToken: string
  /** epoch DETIK (format Supabase), `0` kalau tidak ada */
  expiresAt: number
}

/** bentuk minimum `user` di dalam sesi Supabase yang benar-benar dipakai app */
interface SessionUserPayload {
  id?: string
  email?: string
  user_metadata?: { nickname?: string; full_name?: string } | null
}

interface SessionPayload {
  access_token?: string
  refresh_token?: string
  expires_at?: number
  user?: SessionUserPayload
}

/**
 * `cookie` header → daftar `{ name, value }`. Ditulis sendiri (bukan `document.cookie`)
 * karena file ini jalan di SERVER; parsing-nya sengaja bodoh tapi aman: nilai
 * cookie Supabase adalah base64url, tidak pernah berisi `;`.
 */
export function parseCookieHeader(
  header: string | null | undefined,
): { name: string; value: string }[] {
  if (!header) return []
  return header
    .split(';')
    .map((part) => part.trim())
    .filter((part) => part.length > 0)
    .map((part) => {
      const index = part.indexOf('=')
      if (index < 0) return { name: part, value: '' }
      const name = part.slice(0, index).trim()
      const raw = part.slice(index + 1)
      /* `%xx` bisa muncul karena @supabase/ssr meng-encode nilai panjang */
      try {
        return { name, value: decodeURIComponent(raw) }
      } catch {
        return { name, value: raw }
      }
    })
}

/** base64url → UTF-8 (tanpa dependency; `atob` ada di Node ≥16 & browser) */
function fromBase64Url(value: string): string | null {
  try {
    const normalized = value.replace(/-/g, '+').replace(/_/g, '/')
    const padded = normalized + '='.repeat((4 - (normalized.length % 4)) % 4)
    const binary = atob(padded)
    const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0))
    return new TextDecoder().decode(bytes)
  } catch {
    return null
  }
}

/** potongan nilai cookie (utuh atau ber-chunk) → string JSON sesi, atau `null` */
export function decodeSessionCookieValue(chunks: readonly string[]): string | null {
  const joined = chunks.join('')
  if (!joined) return null
  if (!joined.startsWith('base64-')) return joined
  const decoded = fromBase64Url(joined.slice('base64-'.length))
  if (!decoded) return null
  try {
    JSON.parse(decoded)
    return decoded
  } catch {
    /* chunk tercampur dari dua penulisan berbeda → perlakukan sebagai tidak ada */
    return null
  }
}

/**
 * Ambil sesi dari header cookie. `null` kalau cookie tidak ada, bentuknya asing,
 * JSON-nya rusak, atau tokennya sudah lewat kedaluwarsa (ditolak di sini supaya
 * route tidak mengirim query yang pasti ditolak server).
 */
export function readSupabaseSession(
  cookieHeader: string | null | undefined,
  { now = Date.now() }: { now?: number } = {},
): SupabaseSession | null {
  const name = sessionCookieName()
  const chunkOrder = (cookieName: string) =>
    cookieName === name ? -1 : Number(cookieName.split('.').pop())
  const chunked = parseCookieHeader(cookieHeader)
    .filter((cookie) => cookie.name === name || cookie.name.startsWith(`${name}.`))
    .sort((a, b) => chunkOrder(a.name) - chunkOrder(b.name))
    .map((cookie) => cookie.value)

  const payload = decodeSessionCookieValue(chunked)
  if (!payload) return null

  let parsed: SessionPayload
  try {
    parsed = JSON.parse(payload) as SessionPayload
  } catch {
    return null
  }

  const accessToken = parsed.access_token ?? ''
  const userId = parsed.user?.id ?? ''
  if (!accessToken || !userId) return null

  const expiresAt = Number(parsed.expires_at ?? 0)
  /* `expires_at` = epoch DETIK. Toleransi 30 detik supaya request yang sedang
     berjalan tidak mati di tengah jalan karena token lewat kedaluwarsa sesaat lagi. */
  if (expiresAt > 0 && expiresAt * 1000 + 30_000 <= now) return null

  return {
    userId,
    email: parsed.user?.email ?? '',
    name:
      parsed.user?.user_metadata?.nickname ?? parsed.user?.user_metadata?.full_name ?? 'Kamu',
    accessToken,
    refreshToken: parsed.refresh_token ?? '',
    expiresAt,
  }
}

/**
 * Membentuk nilai cookie sesi PERSIS seperti tulisan `@supabase/ssr`
 * (`base64-` + base64url(JSON)). Dipakai TEST untuk membuktikan bahwa pembacaan
 * di atas menerima bentuk yang benar-benar ditulis perpustakaan itu — bukan
 * bentuk karangan sendiri yang kebetulan cocok dengan pembacanya.
 */
export function encodeSessionCookieValue(session: SupabaseSession): string {
  const json = JSON.stringify({
    access_token: session.accessToken,
    refresh_token: session.refreshToken,
    token_type: 'bearer',
    expires_at: session.expiresAt,
    expires_in: Math.max(0, session.expiresAt - Math.floor(Date.now() / 1000)),
    user: {
      id: session.userId,
      email: session.email,
      user_metadata: { nickname: session.name },
    },
  })
  return `base64-${Buffer.from(json, 'utf8').toString('base64url')}`
}

