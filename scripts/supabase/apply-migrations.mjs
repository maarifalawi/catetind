#!/usr/bin/env node
/* ── TERAPKAN MIGRASI SUPABASE (paket 45) ────────────────────────────────────
   Jalur resmi Supabase adalah `supabase link` + `supabase db push` — keduanya
   butuh PASSWORD DATABASE. Skrip ini ada untuk jalur kedua yang hanya butuh
   Personal Access Token (Management API, peran `postgres`):

       SUPABASE_ACCESS_TOKEN=sbp_xxx node scripts/supabase/apply-migrations.mjs

   Kenapa perlu: CI/jalur otomatis (dan mesin yang cuma punya kunci publishable)
   tidak boleh menyimpan password database. Token akses dibaca dari ENV, tidak
   pernah dari berkas — dan skrip ini TIDAK PERNAH menyentuh kunci rahasia peran
   server (kunci yang mem-BYPASS RLS).

   Setelah semua berkas di `supabase/migrations/*.sql` selesai dijalankan, versi
   migrasinya dicatat di `supabase_migrations.schema_migrations` (tabel yang sama
   dengan yang dipakai Supabase CLI), jadi `supabase db push` berikutnya tahu
   migrasi mana yang sudah masuk.

   Aman dijalankan ulang: semua migrasi repo ini idempotent (`if not exists` /
   `create or replace` / policy di-drop dulu). Versi yang sudah tercatat akan
   DILEWATI kecuali dipaksa `--force`.
   ────────────────────────────────────────────────────────────────────────── */

import { readFile, readdir } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..')
const MIGRATIONS_DIR = path.join(ROOT, 'supabase', 'migrations')

/** URL project dibaca dari env atau `.env.local` (kunci publishable, bukan rahasia) */
async function resolveProjectRef() {
  const fromEnv = process.env.SUPABASE_PROJECT_REF
  if (fromEnv) return fromEnv
  const fromUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  if (fromUrl) return new URL(fromUrl).hostname.split('.')[0]
  try {
    const env = await readFile(path.join(ROOT, '.env.local'), 'utf8')
    const line = env.split(/\r?\n/).find((row) => row.startsWith('NEXT_PUBLIC_SUPABASE_URL='))
    if (line) return new URL(line.split('=')[1].trim()).hostname.split('.')[0]
  } catch {
    /* .env.local tidak ada → pesan di bawah yang menjelaskan */
  }
  return null
}

/** `20260927120000_catetind_core.sql` → `{ version: '20260927120000', name: 'catetind_core' }` */
function parseMigrationFile(file) {
  const match = /^(\d{14})_(.+)\.sql$/.exec(file)
  if (!match) return null
  return { version: match[1], name: match[2], file }
}

async function runSql(ref, token, sql) {
  const res = await fetch(`https://api.supabase.com/v1/projects/${ref}/database/query`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query: sql }),
  })
  if (!res.ok) {
    throw new Error(`Management API menolak SQL (${res.status}): ${await res.text()}`)
  }
  return res.json().catch(() => null)
}

/* TABEL RIWAYAT dibuat di sini (bukan di berkas migrasi) supaya ia tidak ikut
   terhitung sebagai migrasi aplikasi. Bentuk kolomnya sama dengan Supabase CLI. */
const HISTORY_DDL = `
create schema if not exists supabase_migrations;
create table if not exists supabase_migrations.schema_migrations (
  version text primary key,
  name text,
  statements text[],
  created_at timestamptz not null default now()
);
`

async function main() {
  const token = process.env.SUPABASE_ACCESS_TOKEN
  if (!token) {
    console.error('SUPABASE_ACCESS_TOKEN belum di-set. Ambil dari dashboard Supabase → Account → Access Tokens.')
    process.exit(1)
  }

  const ref = await resolveProjectRef()
  if (!ref) {
    console.error('Project ref tidak bisa ditentukan. Set SUPABASE_PROJECT_REF atau NEXT_PUBLIC_SUPABASE_URL.')
    process.exit(1)
  }

  const force = process.argv.includes('--force')
  const files = (await readdir(MIGRATIONS_DIR)).filter((file) => file.endsWith('.sql')).sort()
  const migrations = files.map(parseMigrationFile).filter(Boolean)
  if (migrations.length === 0) {
    console.error('Tidak ada berkas migrasi di supabase/migrations.')
    process.exit(1)
  }

  console.log(`Project: ${ref} · ${migrations.length} berkas migrasi`)
  await runSql(ref, token, HISTORY_DDL)
  const applied = await runSql(ref, token, 'select version from supabase_migrations.schema_migrations')
  const done = new Set((applied ?? []).map((row) => row.version))

  for (const migration of migrations) {
    if (done.has(migration.version) && !force) {
      console.log(`= ${migration.file} (sudah tercatat, dilewati)`)
      continue
    }
    const sql = await readFile(path.join(MIGRATIONS_DIR, migration.file), 'utf8')
    try {
      await runSql(ref, token, sql)
    } catch (error) {
      console.error(`✗ ${migration.file}\n${error.message}`)
      process.exit(1)
    }
    await runSql(
      ref,
      token,
      `insert into supabase_migrations.schema_migrations (version, name, statements)
       values ('${migration.version}', '${migration.name}', array[]::text[])
       on conflict (version) do update set name = excluded.name, created_at = now()`,
    )
    console.log(`✓ ${migration.file}`)
  }

  const tables = await runSql(
    ref,
    token,
    `select table_name from information_schema.tables
      where table_schema = 'public' order by table_name`,
  )
  const policies = await runSql(
    ref,
    token,
    `select count(*)::int as total from pg_policies where schemaname = 'public'`,
  )

  /* WAJIB: PostgREST menyimpan cache skema per instance. Tanpa reload, perubahan
     BENTUK fungsi (nama argumen / kolom keluaran) masih dilayani versi lama —
     gejalanya menyesatkan (`42702 column reference is ambiguous` padahal SQL-nya
     sudah benar). Satu perintah NOTIFY ini yang membuat REST langsung sinkron. */
  await runSql(ref, token, `notify pgrst, 'reload schema'`)

  console.log(`\nTabel di public: ${(tables ?? []).map((row) => row.table_name).join(', ')}`)
  console.log(`Policy RLS di public: ${policies?.[0]?.total ?? 0}`)
  console.log('Cache skema PostgREST dimuat ulang (notify pgrst, reload schema).')
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
