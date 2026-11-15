#!/usr/bin/env node
/* ── TERAPKAN SATU/BEBERAPA BERKAS SQL KE SUPABASE (Management API) ───────────
   `apply-migrations.mjs` menjalankan SELURUH folder migrasi. Skrip ini dipakai
   ketika hanya satu berkas yang perlu diterapkan (mis. memperbaiki tabel yang
   tertinggal di produksi) tanpa menyentuh migrasi lain.

       SUPABASE_ACCESS_TOKEN=sbp_xxx node scripts/supabase/apply-sql.mjs \
         supabase/migrations/20261111160000_catetind_notifications.sql

   Token dibaca dari ENV dan tidak pernah ditulis ke berkas. Setelah SQL selesai,
   cache skema PostgREST dimuat ulang (`notify pgrst, 'reload schema'`) supaya
   REST langsung mengenal tabel/kolom baru.
   ────────────────────────────────────────────────────────────────────────── */

import { readFile } from 'node:fs/promises'
import path from 'node:path'

async function resolveProjectRef() {
  if (process.env.SUPABASE_PROJECT_REF) return process.env.SUPABASE_PROJECT_REF
  if (process.env.NEXT_PUBLIC_SUPABASE_URL) {
    return new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).hostname.split('.')[0]
  }
  const env = await readFile('.env.local', 'utf8')
  const line = env.split(/\r?\n/).find((row) => row.startsWith('NEXT_PUBLIC_SUPABASE_URL='))
  if (!line) return null
  return new URL(line.split('=')[1].trim()).hostname.split('.')[0]
}

async function runSql(ref, token, sql) {
  const res = await fetch(`https://api.supabase.com/v1/projects/${ref}/database/query`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query: sql }),
  })
  const text = await res.text()
  if (!res.ok) throw new Error(`Management API menolak SQL (${res.status}): ${text}`)
  return text
}

async function main() {
  const token = process.env.SUPABASE_ACCESS_TOKEN
  if (!token) {
    console.error('SUPABASE_ACCESS_TOKEN belum di-set (jangan simpan token di berkas repo).')
    process.exit(1)
  }
  const ref = await resolveProjectRef()
  if (!ref) {
    console.error('Project ref tidak bisa ditentukan. Set SUPABASE_PROJECT_REF.')
    process.exit(1)
  }
  const files = process.argv.slice(2).filter((arg) => !arg.startsWith('--'))
  if (files.length === 0) {
    console.error('Sebutkan minimal satu berkas .sql.')
    process.exit(1)
  }

  for (const file of files) {
    const sql = await readFile(path.resolve(file), 'utf8')
    await runSql(ref, token, sql)
    console.log(`✓ ${file}`)
  }

  await runSql(ref, token, `notify pgrst, 'reload schema'`)
  console.log(`Cache skema PostgREST dimuat ulang (project ${ref}).`)
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
