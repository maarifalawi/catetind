#!/usr/bin/env node
/* ── HAPUS SEMUA AKUN KECUALI PEMILIK (jalankan MANUAL, bukan CI) ────────────
   Membersihkan project dari akun uji/coba: setiap akun di `auth.users` dihapus
   lewat Admin API, KECUALI email yang dilindungi.

   Kenapa lewat Admin API dan bukan PostgREST biasa: `auth.users` tidak bisa
   dibaca/ditulis dengan kunci publishable (RLS-nya milik GoTrue). Yang boleh
   hanya kunci peran server (`SUPABASE_SERVICE_ROLE_KEY`) — kunci yang sama yang
   dipakai dashboard /admin untuk membaca snapshot bisnis.

   Yang ikut terhapus: SELURUH data milik user itu. Semua tabel domain memakai
   `references auth.users (id) on delete cascade` (lihat
   `supabase/migrations/20260927120000_catetind_core.sql` dst.), jadi profil,
   dompet, ledger, celengan, langganan, token AI, dan referralnya ikut bersih.
   ⚠️ TIDAK BISA DIBATALKAN.

   Perlindungan berlapis:
     · email pemilik selalu dilindungi (`shiimaify@gmail.com` + `OWNER_TEST_EMAIL`
       dari `.env.local` + `--keep=<email>` tambahan);
     · DRY-RUN adalah perilaku default — daftar akun dicetak lebih dulu;
     · penghapusan sungguhan hanya jalan kalau `--confirm` disebut;
     · ada jeda konfirmasi ketik nama project (mode `--confirm`).

   Jalankan:
     node scripts/supabase/purge-akun.mjs                  # lihat daftarnya saja
     node scripts/supabase/purge-akun.mjs --confirm        # hapus sungguhan
     node scripts/supabase/purge-akun.mjs --keep=a@b.com --confirm
   ────────────────────────────────────────────────────────────────────────── */

import { readFile } from 'node:fs/promises'
import { createInterface } from 'node:readline/promises'

/** email yang TIDAK PERNAH dihapus, apa pun argumennya */
const ALWAYS_KEEP = ['shiimaify@gmail.com']

const argv = process.argv.slice(2)
const confirm = argv.includes('--confirm')
const extraKeep = argv
  .filter((arg) => arg.startsWith('--keep='))
  .flatMap((arg) => arg.slice('--keep='.length).split(','))
  .map((email) => email.trim().toLowerCase())
  .filter(Boolean)

/** baca `.env.local` tanpa dependency tambahan (pola skrip supabase lain) */
async function readEnv() {
  const env = {}
  try {
    const text = await readFile('.env.local', 'utf8')
    for (const line of text.split(/\r?\n/)) {
      if (!line.includes('=') || line.trim().startsWith('#')) continue
      const i = line.indexOf('=')
      env[line.slice(0, i).trim()] = line.slice(i + 1).trim()
    }
  } catch {
    /* tanpa .env.local: pakai process.env saja */
  }
  return env
}

const env = await readEnv()
const url = process.env.NEXT_PUBLIC_SUPABASE_URL || env.NEXT_PUBLIC_SUPABASE_URL
const service = process.env.SUPABASE_SERVICE_ROLE_KEY || env.SUPABASE_SERVICE_ROLE_KEY

if (!url || !service) {
  console.error(
    'env kurang: butuh NEXT_PUBLIC_SUPABASE_URL & SUPABASE_SERVICE_ROLE_KEY (env atau .env.local)',
  )
  process.exit(1)
}

const keep = new Set(
  [...ALWAYS_KEEP, env.OWNER_TEST_EMAIL, ...extraKeep]
    .map((email) => (email ?? '').trim().toLowerCase())
    .filter(Boolean),
)

const admin = {
  apikey: service,
  Authorization: `Bearer ${service}`,
  'Content-Type': 'application/json',
}

/** semua akun dari Admin API Auth (berhalaman, 1000 per halaman) */
async function listUsers() {
  const perPage = 1000
  const all = []
  for (let page = 1; page <= 100; page += 1) {
    const res = await fetch(`${url}/auth/v1/admin/users?page=${page}&per_page=${perPage}`, {
      headers: admin,
    })
    if (!res.ok) throw new Error(`Admin API menolak daftar user (${res.status}): ${await res.text()}`)
    const body = await res.json()
    const list = Array.isArray(body) ? body : (body?.users ?? [])
    all.push(...list)
    if (list.length < perPage) break
  }
  return all
}

async function deleteUser(id) {
  const res = await fetch(`${url}/auth/v1/admin/users/${id}`, { method: 'DELETE', headers: admin })
  if (!res.ok && res.status !== 404) {
    throw new Error(`Gagal menghapus ${id} (${res.status}): ${await res.text()}`)
  }
}

console.log(`Project : ${url}`)
console.log(`Dilindungi: ${[...keep].join(', ')}`)
console.log(confirm ? 'MODE    : HAPUS SUNGGUHAN (--confirm)\n' : 'MODE    : DRY-RUN (tidak ada yang dihapus)\n')

const users = await listUsers()
const targets = users.filter((user) => !keep.has((user?.email ?? '').toLowerCase()))

console.log(`Total akun: ${users.length} · akan dihapus: ${targets.length} · disimpan: ${users.length - targets.length}`)
for (const user of users) {
  const email = (user.email ?? '(tanpa email)').toLowerCase()
  const state = keep.has(email) ? 'SIMPAN' : 'HAPUS '
  console.log(`  ${state} ${email} · dibuat ${user.created_at ?? '—'} · login terakhir ${user.last_sign_in_at ?? '—'}`)
}

if (!confirm) {
  console.log('\nTidak ada yang dihapus. Jalankan ulang dengan --confirm kalau daftar di atas sudah benar.')
  process.exit(0)
}

/* konfirmasi ketik: satu langkah sadar sebelum data hilang permanen */
const rl = createInterface({ input: process.stdin, output: process.stdout })
const answer = (await rl.question('\nKetik "HAPUS" untuk melanjutkan: ')).trim()
rl.close()
if (answer !== 'HAPUS') {
  console.log('Dibatalkan. Tidak ada yang dihapus.')
  process.exit(0)
}

let done = 0
for (const user of targets) {
  try {
    await deleteUser(user.id)
    done += 1
    console.log(`  ✓ ${user.email}`)
  } catch (error) {
    console.error(`  ✗ ${user.email}: ${error.message}`)
  }
}

console.log(`\nSelesai: ${done}/${targets.length} akun dihapus. ${keep.size} email dilindungi tetap ada.`)
