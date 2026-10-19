#!/usr/bin/env node
/* ── CEK KESIAPAN BIMI (Gmail) ───────────────────────────────────────────────
   Setelah SVG di-deploy dan DNS diisi, jalankan:

       pnpm brand:check
       node scripts/brand/check-bimi-dns.mjs --domain=catetind.com

   Yang diperiksa (semua bagian yang menentukan logo muncul di Gmail):
     1. DMARC domain: harus p=quarantine/reject dan pct=100;
     2. record TXT default._bimi: v=BIMI1 + l=<svg> + a=<pem>;
     3. URL SVG: HTTP 200, image/svg+xml, ≤ 32 KB;
     4. URL sertifikat: HTTP 200 dan berisi PEM certificate.

   Skrip ini TIDAK mengubah DNS. Ia hanya membaca DNS publik + URL publik,
   jadi aman dijalankan kapan saja.
   ────────────────────────────────────────────────────────────────────────── */

import { resolveTxt } from 'node:dns/promises'

const domainArg = process.argv.find((arg) => arg.startsWith('--domain='))
const domain = (domainArg ? domainArg.split('=')[1] : 'catetind.com').trim().replace(/^\.+/, '')

const MAX_BYTES = 32 * 1024
const checks = []

function add(label, status, detail) {
  checks.push({ label, status, detail })
}

async function txt(name) {
  try {
    const rows = await resolveTxt(name)
    return rows.map((chunks) => chunks.join('')).join(' ')
  } catch {
    return null
  }
}

/* 1. DMARC */
const dmarc = await txt(`_dmarc.${domain}`)
if (!dmarc) {
  add('DMARC', 'fail', `TXT _dmarc.${domain} tidak ditemukan`)
} else {
  const policy = /\bp\s*=\s*(none|quarantine|reject)\b/i.exec(dmarc)?.[1]?.toLowerCase()
  const pct = Number(/\bpct\s*=\s*(\d+)/i.exec(dmarc)?.[1] ?? '100')
  if (!policy || policy === 'none') {
    add('DMARC', 'fail', `p=${policy ?? '?'} — BIMI butuh p=quarantine atau p=reject (pct=100)`)
  } else if (pct < 100) {
    add('DMARC', 'fail', `p=${policy} tapi pct=${pct} — BIMI butuh pct=100`)
  } else {
    add('DMARC', 'pass', `p=${policy}, pct=${pct}`)
  }
}

/* 2. Record BIMI */
const bimi = await txt(`default._bimi.${domain}`)
let logoSrc = null
let certSrc = null
if (!bimi) {
  add('BIMI record', 'fail', `TXT default._bimi.${domain} belum ada`)
} else {
  const version = /v\s*=\s*BIMI1/i.test(bimi)
  logoSrc = /\bl\s*=\s*([^;\s]+)/i.exec(bimi)?.[1] ?? null
  certSrc = /\ba\s*=\s*([^;\s]+)/i.exec(bimi)?.[1] ?? null
  if (!version) add('BIMI record', 'fail', `Record ada tapi bukan v=BIMI1: ${bimi}`)
  else if (!logoSrc) add('BIMI record', 'fail', 'Record tidak memuat l=<url svg>')
  else add('BIMI record', 'pass', logoSrc)
  if (!certSrc || certSrc === ';' || certSrc === '') {
    add('Evidence Document', 'fail', 'a= kosong — Gmail mensyaratkan VMC/CMC (self-asserted tidak cukup)')
  }
}

/* 3. URL SVG */
if (logoSrc) {
  try {
    const res = await fetch(logoSrc, { redirect: 'follow' })
    const body = await res.arrayBuffer()
    const type = res.headers.get('content-type') ?? ''
    if (!res.ok) add('URL SVG', 'fail', `HTTP ${res.status} — ${logoSrc}`)
    else if (!/svg/i.test(type)) add('URL SVG', 'warn', `HTTP 200 tapi content-type "${type}"`)
    else if (body.byteLength > MAX_BYTES) add('URL SVG', 'fail', `${(body.byteLength / 1024).toFixed(1)} KB > 32 KB`)
    else add('URL SVG', 'pass', `HTTP 200 · ${type} · ${(body.byteLength / 1024).toFixed(1)} KB`)
  } catch (error) {
    add('URL SVG', 'fail', `Tidak bisa diakses: ${error.message}`)
  }
}

/* 4. Sertifikat */
if (certSrc && certSrc !== ';' && certSrc !== '') {
  try {
    const res = await fetch(certSrc, { redirect: 'follow' })
    const body = await res.text()
    if (!res.ok) add('Sertifikat', 'fail', `HTTP ${res.status} — ${certSrc}`)
    else if (!/BEGIN CERTIFICATE/.test(body)) add('Sertifikat', 'fail', 'File tidak berisi PEM certificate')
    else add('Sertifikat', 'pass', certSrc)
  } catch (error) {
    add('Sertifikat', 'fail', `Tidak bisa diakses: ${error.message}`)
  }
}

console.log(`\nBIMI readiness — ${domain}`)
for (const { label, status, detail } of checks) {
  const icon = status === 'pass' ? '✓' : status === 'warn' ? '!' : '✗'
  console.log(`  ${icon} ${label}: ${detail}`)
}

const failed = checks.filter((c) => c.status === 'fail').length
if (failed > 0) {
  console.log(`\nHASIL: BELUM SIAP (${failed} penghalang). Lihat docs/EMAIL-TEMPLATES-DAN-AVATAR.md.`)
  process.exit(1)
}
console.log('\nHASIL: SIAP. Logo BIMI bisa mulai tampil setelah cache Gmail diperbarui (biasanya 24–48 jam).')
