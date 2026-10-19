#!/usr/bin/env node
/* ── VALIDATOR SVG UNTUK BIMI (Gmail) ────────────────────────────────────────
   Avatar brand di Gmail hanya muncul lewat BIMI, dan BIMI punya aturan SVG yang
   ketat. Skrip ini memeriksa file sebelum diunggah ke `public/brand/`:

       node scripts/brand/validate-bimi-svg.mjs
       node scripts/brand/validate-bimi-svg.mjs path/ke/logo.svg

   Default: `public/brand/bimi-logo.svg`.

   Yang diperiksa (sumber: profil SVG P/S BIMI Group + praktik validator):
     • ukuran file ≤ 32 KB;
     • root <svg> dengan namespace SVG;
     • SVG Tiny 1.2 (`version="1.2"` + `baseProfile="tiny"`);
     • viewBox persegi (rasio 1:1) — Gmail memotongnya jadi lingkaran;
     • TIDAK ada <text>/<tspan>/<foreignObject>/<script>/<image>/animasi;
     • TIDAK ada referensi eksternal (http, //, url(http), @import);
     • TIDAK ada raster/base64 di dalam SVG;
     • TIDAK ada <!ENTITY> (XXE).

   Skrip ini TIDAK mengubah file. Kalau ada yang gagal, perbaiki di editor
   vektor (outline semua teks, jadikan kanvas persegi, ekspor ulang).
   ────────────────────────────────────────────────────────────────────────── */

import { readFile } from 'node:fs/promises'
import path from 'node:path'

const DEFAULT_FILE = path.join('public', 'brand', 'bimi-logo.svg')
const file = process.argv[2] ?? DEFAULT_FILE

const MAX_BYTES = 32 * 1024
const errors = []
const warnings = []
const oks = []

function fail(message) {
  errors.push(message)
}
function warn(message) {
  warnings.push(message)
}
function ok(message) {
  oks.push(message)
}

let src = ''
try {
  src = await readFile(file, 'utf8')
} catch {
  console.error(`✗ File tidak ditemukan: ${file}`)
  console.error('  Taruh SVG-nya di public/brand/bimi-logo.svg lalu jalankan ulang.')
  process.exit(1)
}

const bytes = Buffer.byteLength(src, 'utf8')
if (bytes > MAX_BYTES) {
  fail(`Ukuran ${(bytes / 1024).toFixed(1)} KB melebihi batas 32 KB.`)
} else {
  ok(`Ukuran ${(bytes / 1024).toFixed(1)} KB (≤ 32 KB).`)
}

if (!/<svg[\s>]/i.test(src)) fail('Tidak ada elemen root <svg>.')
else ok('Root <svg> ditemukan.')

if (!/xmlns\s*=\s*["']http:\/\/www\.w3\.org\/2000\/svg["']/i.test(src)) {
  fail('Namespace SVG hilang: xmlns="http://www.w3.org/2000/svg".')
} else {
  ok('Namespace SVG benar.')
}

const isTiny12 = /version\s*=\s*["']1\.2["']/i.test(src) && /baseProfile\s*=\s*["']tiny["']/i.test(src)
if (!isTiny12) {
  fail('Wajib SVG Tiny 1.2: tambahkan version="1.2" dan baseProfile="tiny" pada <svg>.')
} else {
  ok('Profil SVG Tiny 1.2.')
}

const viewBox = /viewBox\s*=\s*["']([^"']+)["']/i.exec(src)
if (!viewBox) {
  fail('viewBox tidak ada. Kanvas wajib persegi, mis. viewBox="0 0 512 512".')
} else {
  const parts = viewBox[1].trim().split(/[\s,]+/).map(Number)
  if (parts.length !== 4 || parts.some((n) => !Number.isFinite(n))) {
    fail(`viewBox tidak valid: "${viewBox[1]}".`)
  } else {
    const [, , w, h] = parts
    if (Math.abs(w - h) > 0.01) {
      fail(`viewBox tidak persegi (${w}×${h}). BIMI wajib rasio 1:1.`)
    } else {
      ok(`viewBox persegi ${w}×${h}.`)
    }
  }
}

/* Tag yang dilarang/berisiko di BIMI SVG. `<style>` hanya warning karena
   sebagian validator menerimanya, tetapi presentation attribute lebih aman. */
const forbiddenTags = [
  'text',
  'tspan',
  'textPath',
  'foreignObject',
  'script',
  'image',
  'animate',
  'animateTransform',
  'animateMotion',
  'set',
  'font',
  'font-face',
  'glyph',
  'missing-glyph',
]
for (const tag of forbiddenTags) {
  if (new RegExp(`<\\s*${tag}[\\s>/]`, 'i').test(src)) {
    fail(`Elemen <${tag}> tidak diizinkan — outline semua teks / buang elemen ini.`)
  }
}
if (/<\s*style[\s>]/i.test(src)) {
  warn('Ada <style>. Sebagian validator BIMI menolaknya; pindahkan gaya ke atribut elemen.')
}
if (/\bfont-family\s*=|\bfont-size\s*=/i.test(src)) {
  warn('Ada atribut font-family/font-size — biasanya tanda masih ada teks yang belum di-outline.')
}
if (/<\s*(filter|mask)[\s>]/i.test(src)) {
  warn('Ada <filter>/<mask>; tidak semua renderer BIMI mendukung. Sebaiknya dibuang.')
}

/* Referensi eksternal + raster tertanam. */
if (/(?:href|xlink:href)\s*=\s*["'](?!#)(?:https?:)?\/\//i.test(src)) {
  fail('Ada href/xlink:href ke URL eksternal. BIMI hanya boleh referensi internal (#id).')
} else {
  ok('Tidak ada tautan eksternal.')
}
if (/url\(\s*["']?(?:https?:)?\/\//i.test(src)) {
  fail('Ada url(...) eksternal. Semua aset harus jadi path di dalam file.')
}
if (/@import/i.test(src)) fail('Ada @import CSS di dalam SVG.')
if (/data:image\//i.test(src)) {
  fail('Ada gambar raster/base64 tertanam. BIMI wajib vektor murni.')
} else {
  ok('Tidak ada raster tertanam.')
}
if (/<!ENTITY/i.test(src)) fail('Ada <!ENTITY> — tidak diizinkan dan berisiko (XXE).')

console.log(`\nBIMI SVG check — ${file}`)
for (const line of oks) console.log(`  ✓ ${line}`)
for (const line of warnings) console.log(`  ! ${line}`)
for (const line of errors) console.log(`  ✗ ${line}`)

if (errors.length > 0) {
  console.log(`\nHASIL: GAGAL (${errors.length} error, ${warnings.length} warning).`)
  process.exit(1)
}
console.log(`\nHASIL: LOLOS${warnings.length ? ` (${warnings.length} warning)` : ''}.`)
console.log('Langkah berikutnya: CMC/VMC + record default._bimi (lihat docs/EMAIL-TEMPLATES-DAN-AVATAR.md).')
