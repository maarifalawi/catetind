/**
 * scripts/qa/harness.mjs — perkakas uji tempur nyata (Chromium × Supabase × reload).
 *
 * Semua akun yang dipakai adalah AKUN UJI SEMENTARA lewat Admin API, dan dihapus
 * lagi lewat `deleteUserByEmail` (cascade menghapus seluruh baris domain).
 */
import fs from 'node:fs'
import path from 'node:path'
import { readFile } from 'node:fs/promises'

const env = Object.fromEntries(
  (await readFile('.env.local', 'utf8'))
    .split(/\r?\n/)
    .filter((line) => line.includes('=') && !line.trim().startsWith('#'))
    .map((line) => {
      const i = line.indexOf('=')
      return [line.slice(0, i).trim(), line.slice(i + 1).trim()]
    }),
)

export const SUPABASE_URL = env.NEXT_PUBLIC_SUPABASE_URL
const SERVICE_KEY = env.SUPABASE_SERVICE_ROLE_KEY
const ANON_KEY = env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const REF = new URL(SUPABASE_URL).hostname.split('.')[0]
export const COOKIE_NAME = `sb-${REF}-auth-token`

export const results = []
export const log = (...args) => console.log(...args)
export function record(area, name, ok, detail = '') {
  results.push({ area, name, ok, detail })
  log(`${ok ? 'PASS' : 'FAIL'}  [${area}] ${name}${detail ? ` — ${detail}` : ''}`)
}

const adminHeaders = {
  apikey: SERVICE_KEY,
  Authorization: `Bearer ${SERVICE_KEY}`,
  'Content-Type': 'application/json',
}

export async function createUser(user) {
  const res = await fetch(`${SUPABASE_URL}/auth/v1/admin/users`, {
    method: 'POST',
    headers: adminHeaders,
    body: JSON.stringify({
      email: user.email,
      password: user.password,
      email_confirm: true,
      user_metadata: { nickname: user.name },
    }),
  })
  const body = await res.json().catch(() => null)
  if (!res.ok) throw new Error(`create user ${user.email}: ${res.status} ${JSON.stringify(body)}`)
  return body
}

export async function listUsers() {
  const res = await fetch(`${SUPABASE_URL}/auth/v1/admin/users?per_page=200`, {
    headers: adminHeaders,
  })
  const body = await res.json()
  return Array.isArray(body) ? body : (body?.users ?? [])
}

export async function deleteUserByEmail(email) {
  const hit = (await listUsers()).find((u) => (u?.email ?? '').toLowerCase() === email.toLowerCase())
  if (!hit) return false
  const res = await fetch(`${SUPABASE_URL}/auth/v1/admin/users/${hit.id}`, {
    method: 'DELETE',
    headers: adminHeaders,
  })
  return res.ok || res.status === 404
}

export async function grantTier(userId, tier) {
  const now = new Date().toISOString()
  const res = await fetch(`${SUPABASE_URL}/rest/v1/user_subscriptions?on_conflict=user_id`, {
    method: 'POST',
    headers: { ...adminHeaders, Prefer: 'resolution=merge-duplicates,return=representation' },
    body: JSON.stringify({
      user_id: userId,
      tier_name: tier,
      is_lifetime: true,
      expires_at: null,
      is_active: true,
      last_renewed_at: now,
      updated_at: now,
    }),
  })
  if (!res.ok) throw new Error(`grant ${tier}: ${res.status} ${await res.text()}`)
  return res.json()
}

export async function passwordSession(user) {
  const res = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
    method: 'POST',
    headers: { apikey: ANON_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: user.email, password: user.password }),
  })
  const body = await res.json()
  if (!res.ok) throw new Error(`password login ${user.email}: ${res.status} ${JSON.stringify(body)}`)
  return body
}

const b64url = (s) => Buffer.from(s, 'utf8').toString('base64url')

/** nilai cookie PERSIS seperti tulisan @supabase/ssr (`base64-` + base64url JSON) */
export function sessionCookieValue(session) {
  const json = JSON.stringify({
    access_token: session.access_token,
    refresh_token: session.refresh_token,
    token_type: 'bearer',
    expires_at: session.expires_at,
    expires_in: session.expires_in,
    user: {
      id: session.user.id,
      email: session.user.email,
      user_metadata: session.user.user_metadata ?? {},
    },
  })
  return `base64-${b64url(json)}`
}

/** PostgREST dengan token MILIK user (RLS aktif — bukan kunci server) */
export async function rest(token, query, init = {}) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${query}`, {
    ...init,
    headers: {
      apikey: ANON_KEY,
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...(init.headers ?? {}),
    },
  })
  const text = await res.text()
  let json = null
  try {
    json = text ? JSON.parse(text) : null
  } catch {
    json = text
  }
  /* Kegagalan REST TIDAK BOLEH tampil sebagai "0 baris". Sesi 1 sempat
     melaporkan transaksi pertama "tidak masuk database" hanya karena query uji
     meminta kolom yang tidak ada (`kind`) dan PostgREST menjawab 400 — data
     yang dibaca `null` diterjemahkan pemanggil sebagai daftar kosong. Sekarang
     kegagalannya kelihatan di log, dengan query-nya sekali. */
  if (!res.ok) {
    console.warn(`  ⚠ REST ${res.status} ${query} :: ${String(text).slice(0, 240)}`)
  }
  return { ok: res.ok, status: res.status, data: json }
}

/** PostgREST dengan kunci PERAN SERVER — HANYA untuk bersih-bersih data uji. */
export async function restService(query, init = {}) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${query}`, {
    ...init,
    headers: {
      apikey: SERVICE_KEY,
      Authorization: `Bearer ${SERVICE_KEY}`,
      'Content-Type': 'application/json',
      ...(init.headers ?? {}),
    },
  })
  const text = await res.text()
  let json = null
  try {
    json = text ? JSON.parse(text) : null
  } catch {
    json = text
  }
  if (!res.ok) console.warn(`  ⚠ admin REST ${res.status} ${query} :: ${String(text).slice(0, 200)}`)
  return { ok: res.ok, status: res.status, data: json }
}

/** Session Supabase dari magic-link ADMIN (generateLink → verify). */
export async function sessionFromMagicLink(email) {
  const linkRes = await fetch(`${SUPABASE_URL}/auth/v1/admin/generate_link`, {
    method: 'POST',
    headers: adminHeaders,
    body: JSON.stringify({ type: 'magiclink', email }),
  })
  const link = await linkRes.json().catch(() => null)
  if (!linkRes.ok) throw new Error(`generate_link ${email}: ${linkRes.status} ${JSON.stringify(link)}`)
  const tokenHash = link?.hashed_token ?? link?.properties?.hashed_token
  if (!tokenHash) throw new Error(`generate_link tanpa hashed_token: ${JSON.stringify(link).slice(0, 200)}`)
  const verifyRes = await fetch(`${SUPABASE_URL}/auth/v1/verify`, {
    method: 'POST',
    headers: { apikey: ANON_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({ type: 'magiclink', token_hash: tokenHash }),
  })
  const session = await verifyRes.json().catch(() => null)
  if (!verifyRes.ok) throw new Error(`verify magiclink ${email}: ${verifyRes.status} ${JSON.stringify(session)}`)
  return session
}

export function chromiumPath() {
  const root = path.join(process.env.LOCALAPPDATA ?? '', 'ms-playwright')
  const dirs = fs
    .readdirSync(root)
    .filter((d) => /^chromium-\d+$/.test(d))
    .sort()
  for (const d of dirs.reverse()) {
    for (const sub of ['chrome-win64', 'chrome-win']) {
      const exe = path.join(root, d, sub, 'chrome.exe')
      if (fs.existsSync(exe)) return exe
    }
    const nested = path.join(root, d, 'chrome-win64', 'chrome.exe')
    if (fs.existsSync(nested)) return nested
  }
  throw new Error('Chromium Playwright tidak ditemukan di ms-playwright')
}

/** daftar kalimat terlarang — satu sumber: lib/data/forbidden-copy.ts */
export async function forbiddenPhrases() {
  const text = await readFile('lib/data/forbidden-copy.ts', 'utf8')
  return [...text.matchAll(/^\s*'((?:[^'\\]|\\.)*)',\s*$/gm)].map((m) => m[1].replace(/\\'/g, "'"))
}
