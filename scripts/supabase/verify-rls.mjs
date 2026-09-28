#!/usr/bin/env node
/* ── BUKTI RLS TANPA LOGIN (paket 45) ────────────────────────────────────────
   Memeriksa janji paling dasar dari paket ini: kunci publishable yang ada di
   klien TIDAK membuka apa pun tanpa sesi.

       node scripts/supabase/verify-rls.mjs

   Skrip ini hanya butuh kunci PUBLISHABLE (dibaca dari env atau `.env.local`),
   jadi bisa dijalankan siapa pun tanpa rahasia project — dan sengaja TIDAK
   memakai kunci peran server: kalau hasilnya "aman" karena kunci rahasia, itu
   bukan bukti apa-apa.

   Keluar dengan kode 1 kalau ada tabel yang mengembalikan baris/200 tanpa sesi
   (kecuali tabel/kolom yang memang publik), jadi bisa dipakai sebagai gerbang
   di CI. */

import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..')

async function env(name) {
  if (process.env[name]) return process.env[name]
  try {
    const raw = await readFile(path.join(ROOT, '.env.local'), 'utf8')
    const line = raw.split(/\r?\n/).find((row) => row.startsWith(`${name}=`))
    return line ? line.slice(name.length + 1).trim() : ''
  } catch {
    return ''
  }
}

/** tabel yang HARUS mengembalikan 0 baris / menolak tanpa sesi */
const PROTECTED = [
  'wallets',
  'ledger_rows',
  'debts',
  'debt_payments',
  'investments',
  'asset_transactions',
  'goals',
  'goal_contributions',
  'bills',
  'ai_usage',
  'user_settings',
  'push_subscriptions',
  'joint_wallets',
  'joint_members',
  'joint_transactions',
  'invite_codes',
  'wallet_balances',
  'user_net_worth',
  'joint_transactions_public',
  'goal_savings',
  'debt_balances',
]

/** RPC yang harus DITOLAK tanpa sesi (kecuali `resolve_invite` yang memang publik).
 *  Argumennya diisi supaya PostgREST benar-benar memanggil fungsinya — tanpa itu
 *  ia menjawab `PGRST202` ("function tidak ketemu") dan pemeriksaannya jadi palsu.
 *
 *  `catetind_handle_new_user` ikut diperiksa di sini bukan karena haknya dicabut,
 *  melainkan untuk membuktikan fungsi itu TIDAK punya jalur pemanggilan dari luar
 *  (tipe kembaliannya `trigger` → Postgres menolaknya). */
const PROTECTED_RPC = [
  { fn: 'catetind_delete_account_data', args: {} },
  { fn: 'catetind_create_invite', args: { p_joint_wallet: '00000000-0000-4000-8000-000000000000', p_code: 'TIDAKAKSES', p_ttl_hours: 1 } },
  { fn: 'catetind_accept_invite', args: { p_code: 'TIDAKAKSES' } },
  { fn: 'catetind_push_targets', args: { p_token: 'token-palsu-tanpa-sesi' } },
  { fn: 'catetind_record_ai_usage', args: { p_month_key: '2026-09', p_activity: 'chat', p_calls: 1 } },
  { fn: 'catetind_handle_new_user', args: {}, /** harus gagal apa pun yang terjadi */ expectsFailureOnly: true },
]

async function main() {
  const url = await env('NEXT_PUBLIC_SUPABASE_URL')
  const key = await env('NEXT_PUBLIC_SUPABASE_ANON_KEY')
  if (!url || !key) {
    console.error('NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY belum di-set.')
    process.exit(1)
  }

  let failures = 0
  console.log(`Project: ${url}\n`)

  for (const table of PROTECTED) {
    const res = await fetch(`${url}/rest/v1/${table}?select=*&limit=1`, {
      headers: { apikey: key, Authorization: `Bearer ${key}` },
    })
    const body = await res.text()
    let rows = null
    try {
      rows = body ? JSON.parse(body) : null
    } catch {
      rows = null
    }
    const empty = res.ok && Array.isArray(rows) && rows.length === 0
    const denied = res.status === 401 || res.status === 403
    const ok = empty || denied
    if (!ok) failures += 1
    console.log(
      `${ok ? 'OK  ' : 'BOCOR'} ${table.padEnd(28)} HTTP ${res.status} · ${body.slice(0, 90) || '(kosong)'}`,
    )
  }

  for (const { fn, args, expectsFailureOnly } of PROTECTED_RPC) {
    const res = await fetch(`${url}/rest/v1/rpc/${fn}`, {
      method: 'POST',
      headers: { apikey: key, Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(args),
    })
    const body = await res.text()
    /* "aman" = ditolak karena izin (401/403) ATAU (untuk fungsi trigger) ditolak
       karena tidak punya jalur pemanggilan sama sekali (`!res.ok`). */
    const denied = res.status === 401 || res.status === 403
    const ok = expectsFailureOnly ? !res.ok : denied
    if (!ok) failures += 1
    console.log(
      `${ok ? 'OK  ' : 'BOCOR'} rpc/${fn.padEnd(24)} HTTP ${res.status} · ${body.slice(0, 90) || '(kosong)'}`,
    )
  }

  /* `catetind_resolve_invite` memang boleh tanpa login (halaman /join menampilkan
     status undangan sebelum user masuk) — jadi yang diperiksa di sini bukan
     "ditolak", tapi "tidak membocorkan apa pun": kode tak dikenal → not_found. */
  const resolve = await fetch(`${url}/rest/v1/rpc/catetind_resolve_invite`, {
    method: 'POST',
    headers: { apikey: key, Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ p_code: 'TIDAKADAKODEINI' }),
  })
  const resolved = await resolve.json().catch(() => null)
  const resolveOk = resolve.status === 200 && resolved?.[0]?.invite_status === 'not_found'
  if (!resolveOk) failures += 1
  console.log(
    `${resolveOk ? 'OK  ' : 'BOCOR'} rpc/catetind_resolve_invite   HTTP ${resolve.status} · ${JSON.stringify(resolved)?.slice(0, 90)}`,
  )

  console.log(`\n${failures === 0 ? 'Aman' : `${failures} masalah`}: ${failures === 0 ? 'tidak ada data yang bisa dibaca tanpa sesi.' : 'ada yang perlu diperiksa.'}`)
  process.exit(failures === 0 ? 0 : 1)
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
