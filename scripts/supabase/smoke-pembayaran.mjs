/* ── SMOKE TEST PEMBAYARAN (jalankan MANUAL, bukan CI) ───────────────────────
   Membuktikan rantai pemenuhan Midtrans pada DB SUNGGUHAN:
     pending purchase → RPC fulfill (service_role) → langganan aktif → idempoten
   lalu MEMBERSIHKAN dirinya (hapus user uji + reset slot).

   ⚠️ Menulis ke project Supabase di `.env.local` (buat + hapus satu user uji).
   JANGAN dijalankan terhadap project produksi.
   Jalankan:  node scripts/supabase/smoke-pembayaran.mjs  */

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

const url = env.NEXT_PUBLIC_SUPABASE_URL
const anon = env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const service = env.SUPABASE_SERVICE_ROLE_KEY
if (!url || !anon || !service) {
  console.error('env kurang (URL/anon/service)')
  process.exit(1)
}

const admin = { apikey: service, Authorization: `Bearer ${service}`, 'Content-Type': 'application/json' }
const client = { apikey: anon, Authorization: `Bearer ${anon}`, 'Content-Type': 'application/json' }

async function call(label, res) {
  const text = await res.text()
  let body
  try {
    body = JSON.parse(text)
  } catch {
    body = text
  }
  console.log(`${label}: HTTP ${res.status} ${JSON.stringify(body).slice(0, 240)}`)
  return body
}

const email = `uji-pembayaran-${Date.now()}@catetind.test`
const created = await call(
  '1. buat user uji',
  await fetch(`${url}/auth/v1/admin/users`, {
    method: 'POST',
    headers: admin,
    body: JSON.stringify({ email, email_confirm: true }),
  }),
)
const userId = created?.id
if (!userId) process.exit(1)

const orderId = `uji-${Date.now()}`
await call(
  '2. baris pending',
  await fetch(`${url}/rest/v1/purchases`, {
    method: 'POST',
    headers: { ...admin, Prefer: 'return=minimal' },
    body: JSON.stringify({
      user_id: userId,
      order_id: orderId,
      status: 'pending',
      tier_name: 'waras',
      billing_period: 'annual',
    }),
  }),
)

await call(
  '3. fulfill #1 (settlement)',
  await fetch(`${url}/rest/v1/rpc/catetind_fulfill_purchase`, {
    method: 'POST',
    headers: admin,
    body: JSON.stringify({ p_order_id: orderId, p_status: 'settlement', p_amount: 129000, p_payment_method: 'qris', p_midtrans_tx_id: 'tx-uji' }),
  }),
)

await call(
  '4. langganan user',
  await fetch(`${url}/rest/v1/user_subscriptions?select=tier_name,is_lifetime,is_active,expires_at&user_id=eq.${userId}`, { headers: admin }),
)

await call(
  '5. fulfill #2 (idempoten)',
  await fetch(`${url}/rest/v1/rpc/catetind_fulfill_purchase`, {
    method: 'POST',
    headers: admin,
    body: JSON.stringify({ p_order_id: orderId, p_status: 'settlement', p_amount: 129000 }),
  }),
)

await call(
  '6. pricing_state dibaca anon (harga publik)',
  await fetch(`${url}/rest/v1/pricing_state?select=current_slot,current_price,current_tier&id=eq.1`, { headers: client }),
)

await call(
  '7. anon coba fulfill (HARUS ditolak)',
  await fetch(`${url}/rest/v1/rpc/catetind_fulfill_purchase`, {
    method: 'POST',
    headers: client,
    body: JSON.stringify({ p_order_id: orderId, p_status: 'settlement', p_amount: 129000 }),
  }),
)

await call(
  '8. hapus user uji',
  await fetch(`${url}/auth/v1/admin/users/${userId}`, { method: 'DELETE', headers: admin }),
)

await call(
  '9. reset slot (bersih)',
  await fetch(`${url}/rest/v1/pricing_state?id=eq.1`, {
    method: 'PATCH',
    headers: { ...admin, Prefer: 'return=minimal' },
    body: JSON.stringify({ current_slot: 0, last_purchase_at: null }),
  }),
)
