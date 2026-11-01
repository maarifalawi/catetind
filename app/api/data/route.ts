import { NextRequest, NextResponse } from 'next/server'
import { requireUser } from '@/lib/session'
import { adminSupabase } from '@/lib/supabase/admin'

/* ── JALUR DATA SERVER UNTUK SESI COOKIE (jembatan split-brain) ───────────────
   POST /api/data — satu pintu baca/tulis untuk tabel milik user, dipakai klien
   HANYA ketika klien Supabase di BROWSER tidak punya sesi (atau ditolak RLS).

   Kenapa perlu: `middleware.ts` menerima user karena cookie sesi sah, tetapi
   cookie itu belum tentu bisa dipakai klien browser (chunk hilang, cookie
   diblokir, token basi). Dulu kondisi itu membuat setiap tulis ditolak RLS dan
   barisnya hanya hidup di satu perangkat. Dengan route ini, "bisa membuka app"
   berarti "bisa membaca & menulis datanya".

   KEAMANAN (kunci ini mem-BYPASS RLS):
     · `requireUser(req)` baris pertama — tanpa sesi sah = 401;
     · tabel & operasi dari ALLOWLIST, tidak ada SQL bebas;
     · `user_id` SELALU dari sesi; setiap update/delete menambahkan filter
       `user_id` — body request tidak bisa menyentuh akun lain;
     · `match` hanya kolom sederhana (string/number);
     · ukuran payload dibatasi (avatar base64 ≤ 64 KB). */

const TABLES = new Set([
  'wallets',
  'ledger_rows',
  'bills',
  'goals',
  'goal_contributions',
  'user_settings',
  'profiles',
  /* VIEW turunan saldo — hanya dibaca (dijaga di bawah) */
  'wallet_balances',
  'goal_savings',
])

/** tabel yang TIDAK boleh ditulis lewat route ini */
const READ_ONLY = new Set(['wallet_balances', 'goal_savings'])

const MAX_BODY_BYTES = 96 * 1024

type MatchValue = string | number
type Match = Record<string, MatchValue>

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

/** `match` hanya kolom sederhana — bukan operator/filter PostgREST */
function readMatch(value: unknown): Match | null {
  if (!isPlainObject(value)) return null
  const out: Match = {}
  for (const [key, raw] of Object.entries(value)) {
    if (!/^[a-z_]{1,32}$/.test(key)) return null
    if (typeof raw === 'string' || typeof raw === 'number') out[key] = raw
    else return null
  }
  return Object.keys(out).length > 0 ? out : null
}

export async function POST(req: NextRequest) {
  const auth = requireUser(req)
  if (!auth.ok) return auth.response

  const client = adminSupabase()
  if (!client) {
    return NextResponse.json(
      { error: 'Jalur server belum tersedia (kunci peran server kosong).' },
      { status: 503 },
    )
  }

  let body: unknown
  try {
    const raw = await req.text()
    if (raw.length > MAX_BODY_BYTES) {
      return NextResponse.json({ error: 'Payload terlalu besar.' }, { status: 413 })
    }
    body = JSON.parse(raw)
  } catch {
    return NextResponse.json({ error: 'Body harus JSON.' }, { status: 400 })
  }
  if (!isPlainObject(body)) {
    return NextResponse.json({ error: 'Body harus objek JSON.' }, { status: 400 })
  }

  const table = String(body.table ?? '')
  if (!TABLES.has(table)) {
    return NextResponse.json({ error: `Tabel tidak diizinkan: ${table}` }, { status: 400 })
  }
  const op = String(body.op ?? '')
  const userId = auth.user.id
  if (READ_ONLY.has(table) && op !== 'select') {
    return NextResponse.json({ error: `${table} hanya bisa dibaca.` }, { status: 400 })
  }

  try {
    if (op === 'select') {
      const order = isPlainObject(body.order) ? body.order : null
      const filter = body.filter === undefined ? null : readMatch(body.filter)
      if (body.filter !== undefined && !filter) {
        return NextResponse.json({ error: 'filter tidak sah.' }, { status: 400 })
      }
      /* `user_settings` memakai `select('*')`: kolom baru (mis. `ai_prefs`,
         `notif_prefs`, `categories`) otomatis ikut terbaca — tidak ada
         allowlist kolom yang perlu dirawat setiap kali preferensi bertambah. */
      let query = client.from(table).select('*').eq('user_id', userId)
      if (filter) query = query.match(filter)
      if (order) {
        const column = String(order.column ?? '')
        if (!/^[a-z_]{1,32}$/.test(column)) {
          return NextResponse.json({ error: 'Kolom urutan tidak sah.' }, { status: 400 })
        }
        query = query.order(column, { ascending: order.ascending === true })
      }
      const { data, error } = await query.limit(5000)
      if (error) return NextResponse.json({ error: error.message }, { status: 502 })
      return NextResponse.json({ data: data ?? [] })
    }

    if (op === 'insert' || op === 'upsert') {
      const rows = Array.isArray(body.rows) ? body.rows : null
      if (!rows || rows.length === 0 || rows.length > 500) {
        return NextResponse.json({ error: 'rows wajib 1–500 baris.' }, { status: 400 })
      }
      const scoped = rows.map((row) => {
        if (!isPlainObject(row)) throw new Error('baris harus objek')
        /* `user_id` dari body SELALU ditimpa sesi — bukan dipercaya. */
        return { ...row, user_id: userId }
      })
      const onConflict = typeof body.onConflict === 'string' ? body.onConflict : undefined
      const { data, error } =
        op === 'upsert'
          ? await client.from(table).upsert(scoped, onConflict ? { onConflict } : undefined).select('*')
          : await client.from(table).insert(scoped).select('*')
      if (error) return NextResponse.json({ error: error.message }, { status: 502 })
      return NextResponse.json({ data: data ?? [] })
    }

    if (op === 'update') {
      const match = readMatch(body.match)
      const patch = isPlainObject(body.patch) ? body.patch : null
      if (!match || !patch || Object.keys(patch).length === 0) {
        return NextResponse.json({ error: 'update butuh match & patch.' }, { status: 400 })
      }
      const scopedPatch = { ...patch }
      delete scopedPatch.user_id
      const { data, error } = await client
        .from(table)
        .update(scopedPatch)
        .eq('user_id', userId)
        .match(match)
        .select('*')
      if (error) return NextResponse.json({ error: error.message }, { status: 502 })
      return NextResponse.json({ data: data ?? [] })
    }

    if (op === 'delete') {
      const match = readMatch(body.match)
      if (!match) {
        return NextResponse.json({ error: 'delete butuh match.' }, { status: 400 })
      }
      const { data, error } = await client
        .from(table)
        .delete()
        .eq('user_id', userId)
        .match(match)
        .select('*')
      if (error) return NextResponse.json({ error: error.message }, { status: 502 })
      return NextResponse.json({ data: data ?? [] })
    }

    return NextResponse.json({ error: `Operasi tidak dikenal: ${op}` }, { status: 400 })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'gagal'
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
