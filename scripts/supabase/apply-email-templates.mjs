#!/usr/bin/env node
/* ── TERAPKAN TEMPLATE EMAIL AUTH SUPABASE ───────────────────────────────────
   Template email Supabase TIDAK hidup di repo ini — isinya tersimpan di
   konfigurasi project (Auth → Emails). Supaya desainnya tidak "hilang" saat
   ada yang menyalin ulang dari dashboard, sumber kebenarannya ada di:

       supabase/email-templates/magic-link.html    → email masuk (OTP/magic link)
       supabase/email-templates/confirmation.html  → email verifikasi akun baru

   Skrip ini mendorong kedua berkas itu ke project lewat Management API:

       SUPABASE_ACCESS_TOKEN=sbp_xxx node scripts/supabase/apply-email-templates.mjs

   `--dry-run` mencetak payload tanpa mengirim apa pun.

   Token dibaca dari ENV (sama seperti apply-migrations.mjs), tidak pernah dari
   berkas. Skrip ini TIDAK menyentuh SMTP, site_url, atau kunci rahasia apa pun;
   ia hanya menulis lima field: subjek + isi Magic Link, subjek + isi
   Confirmation, dan masa berlaku OTP (10 menit — sama dengan copy di email).
   ────────────────────────────────────────────────────────────────────────── */

import { readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..')
const TEMPLATES_DIR = path.join(ROOT, 'supabase', 'email-templates')

/** Subjek yang dipakai BOTH alur — kode OTP adalah bintangnya, bukan tautan. */
const SUBJECT = '{{ .Token }} — Kode masuk CatetInd lo 🌿'

/** Copy email menjanjikan 10 menit; konfigurasi Supabase harus ikut sama. */
const OTP_EXP_SECONDS = 600

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

async function readTemplate(file) {
  return readFile(path.join(TEMPLATES_DIR, file), 'utf8')
}

async function main() {
  const dryRun = process.argv.includes('--dry-run')
  const token = process.env.SUPABASE_ACCESS_TOKEN
  if (!token && !dryRun) {
    console.error('SUPABASE_ACCESS_TOKEN belum di-set. Ambil dari dashboard Supabase → Account → Access Tokens.')
    process.exit(1)
  }

  const ref = await resolveProjectRef()
  if (!ref) {
    console.error('Project ref tidak bisa ditentukan. Set SUPABASE_PROJECT_REF atau NEXT_PUBLIC_SUPABASE_URL.')
    process.exit(1)
  }

  const [magicLink, confirmation] = await Promise.all([
    readTemplate('magic-link.html'),
    readTemplate('confirmation.html'),
  ])

  const payload = {
    mailer_subjects_magic_link: SUBJECT,
    mailer_templates_magic_link_content: magicLink,
    mailer_subjects_confirmation: SUBJECT,
    mailer_templates_confirmation_content: confirmation,
    mailer_otp_exp: OTP_EXP_SECONDS,
  }

  console.log(`Project: ${ref}`)
  console.log(`Subjek : ${SUBJECT}`)
  console.log(`Masa berlaku OTP: ${OTP_EXP_SECONDS} detik`)
  console.log(`Template: magic-link ${magicLink.length} char · confirmation ${confirmation.length} char`)

  if (dryRun) {
    console.log('DRY RUN — tidak ada yang dikirim ke Supabase.')
    return
  }

  const res = await fetch(`https://api.supabase.com/v1/projects/${ref}/config/auth`, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  })

  if (!res.ok) {
    console.error(`✗ Management API menolak (${res.status}): ${await res.text()}`)
    process.exit(1)
  }

  /* Baca balik supaya terbukti yang tersimpan memang versi ini, bukan cache UI. */
  const saved = await res.json().catch(() => null)
  const savedSubject = saved?.mailer_subjects_magic_link
  const savedLength = saved?.mailer_templates_magic_link_content?.length
  if (savedSubject !== undefined && savedSubject !== SUBJECT) {
    console.error(`✗ Subjek tersimpan tidak cocok: ${savedSubject}`)
    process.exit(1)
  }
  console.log(`✓ Template email diterapkan${savedLength ? ` (${savedLength} char terbaca balik)` : ''}.`)
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
