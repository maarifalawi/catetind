#!/usr/bin/env node
/* ── GRANT AKSES PAKET KE SATU EMAIL (jalankan MANUAL, bukan CI) ─────────────
   Memberi satu akun akses paket premium TANPA lewat pembayaran Midtrans —
   dipakai untuk akun internal/pemilik atau pemberian akses manual.

   Kenapa ini perlu skrip khusus: `user_subscriptions` (satu-satunya sumber
   "user ini premium atau bukan", lihat `lib/subscription/plan.ts`) TIDAK punya
   policy INSERT/UPDATE untuk klien — RLS-nya read-only milik sendiri, dan yang
   menulis hanya `service_role` (lewat RPC pemenuhan webhook). Jadi grant manual
   memang wajib memakai kunci peran server.

   ⚠️ Menulis ke project Supabase di `.env.local`. Uji dulu di sandbox kalau ragu.
   Jalankan:  node scripts/supabase/grant-akses.mjs <email> [tier]
              (tier: catet-aja | waras | sultan · default: sultan)

   Idempotent: aman dijalankan berkali-kali. Upsert per `user_id`:
     · `tier_name`     → paket yang diberikan,
     · `is_lifetime`   → true (akses selamanya, model sejak paket 84/85),
     · `expires_at`    → null (tidak ada masa aktif),
     · `is_active`     → true.
   `started_at` sengaja TIDAK ditulis ulang supaya tanggal pembelian/aktivasi
   pertama baris lama tidak hilang.
   ────────────────────────────────────────────────────────────────────────── */

import { readFile } from 'node:fs/promises'

/** paket yang sah — HARUS sama dengan `PlanId` di `lib/data/pricing.ts`. */
const TIERS = ['catet-aja', 'waras', 'sultan']

const email = (process.argv[2] ?? '').trim().toLowerCase()
const tier = (process.argv[3] ?? 'sultan').trim().toLowerCase()

if (!email.includes('@')) {
  console.error('Pakai: node scripts/supabase/grant-akses.mjs <email> [tier]')
  console.error('Contoh: node scripts/supabase/grant-akses.mjs user@contoh.com sultan')
  process.exit(1)
}
if (!TIERS.includes(tier)) {
  console.error(`Tier tidak dikenal: "${tier}". Pilih salah satu: ${TIERS.join(' | ')}`)
  process.exit(1)
}

const env = Object.fromEntries(
  (await readFile('.env.local', 'utf8'))
    .split(/\r?\n/)
    .filter((line) => line.includes('=') && !line.trim().startsWith('#'))
    .map((line) => {
      const i = line.indexOf('=')
      return [line.slice(0, i).trim(), line.slice(i + 1).trim()]
    }),
)

const url = env.NEXT_PUBLIC_SUPABASE_URL
const service = env.SUPABASE_SERVICE_ROLE_KEY
if (!url || !service) {
  console.error('env kurang: butuh NEXT_PUBLIC_SUPABASE_URL & SUPABASE_SERVICE_ROLE_KEY di .env.local')
  process.exit(1)
}

const admin = { apikey: service, Authorization: `Bearer ${service}`, 'Content-Type': 'application/json' }

/** cari user-id dari email lewat Admin API Auth (PostgREST tidak bisa baca `auth.users`) */
async function findUserIdByEmail(target) {
  const perPage = 1000
  for (let page = 1; page <= 50; page += 1) {
    const res = await fetch(`${url}/auth/v1/admin/users?page=${page}&per_page=${perPage}`, {
      headers: admin,
    })
    if (!res.ok) throw new Error(`Admin API menolak daftar user (${res.status}): ${await res.text()}`)
    const users = await res.json()
    const list = Array.isArray(users) ? users : (users?.users ?? [])
    const hit = list.find((u) => (u?.email ?? '').toLowerCase() === target)
    if (hit?.id) return hit.id
    if (list.length < perPage) return null
  }
  return null
}

const userId = await findUserIdByEmail(email)
if (!userId) {
  console.error(`✗ Akun "${email}" belum terdaftar di Supabase Auth.`)
  console.error('  Suruh dia masuk/daftar dulu (kode email), lalu jalankan skrip ini lagi.')
  process.exit(1)
}

/* upsert per `user_id` (kolomnya UNIQUE) — merge-duplicates = "update kolom yang
   dikirim kalau barisnya sudah ada". `started_at` TIDAK dikirim → tidak menimpa. */
const nowIso = new Date().toISOString()
const upsert = await fetch(`${url}/rest/v1/user_subscriptions?on_conflict=user_id`, {
  method: 'POST',
  headers: {
    ...admin,
    Prefer: 'resolution=merge-duplicates,return=representation',
  },
  body: JSON.stringify({
    user_id: userId,
    tier_name: tier,
    is_lifetime: true,
    expires_at: null,
    is_active: true,
    last_renewed_at: nowIso,
    updated_at: nowIso,
  }),
})

if (!upsert.ok) {
  console.error(`✗ Gagal menulis langganan (${upsert.status}): ${await upsert.text()}`)
  process.exit(1)
}

const rows = await upsert.json().catch(() => null)
const row = Array.isArray(rows) ? rows[0] : rows
console.log(`✓ Akses "${tier}" aktif untuk ${email}`)
console.log(`  user_id      : ${userId}`)
console.log(`  tier_name    : ${row?.tier_name ?? tier}`)
console.log(`  is_lifetime   : ${row?.is_lifetime ?? true}`)
console.log(`  expires_at   : ${row?.expires_at ?? 'null'}`)
console.log(`  is_active    : ${row?.is_active ?? true}`)
console.log('\nMinta user logout–login (atau buka ulang app) supaya `/api/subscription` membaca paket barunya.')
