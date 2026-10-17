/**
 * scripts/landing/shoot.mjs
 * ─────────────────────────────────────────────────────────────────────────────
 * Screenshot halaman untuk QA visual (landing asli di Framer vs hasil port).
 *
 * Memakai browser yang SUDAH terpasang di mesin (Edge/Chrome) lewat
 * `playwright-core` — tidak mengunduh Chromium (~150 MB). Ini penting karena
 * script ini alat kerja, bukan dependency runtime.
 *
 * Pakai:
 *   node scripts/landing/shoot.mjs <url> <nama-dasar> [fullPage] [opsi]
 *
 * Contoh:
 *   node scripts/landing/shoot.mjs https://reserved-calls-942581.framer.app live
 *   node scripts/landing/shoot.mjs http://localhost:3000/ port
 *   node scripts/landing/shoot.mjs http://localhost:3000/ harga --clip='#pricing'
 *
 * OPSI (semua opsional):
 *   --only=desktop|tablet|mobile   hanya satu viewport
 *   --scroll=0,1400,bottom         screenshot tambahan di posisi scroll tsb
 *   --click=<selector>             klik dulu sebelum screenshot (mis. buka menu)
 *   --wait=<ms>                    jeda sebelum screenshot (default 4000)
 *   --clip=<selector>              potret HANYA elemen itu (paling aman & kecil)
 *   --maxHeight=<px>               batas tinggi satu gambar (default 3000). Kalau
 *                                  fullPage lebih tinggi dari ini, hasilnya
 *                                  OTOMATIS dipecah jadi beberapa bagian
 *                                  `-part1`, `-part2`, … supaya tidak ada file
 *                                  raksasa yang gagal dibaca alat lain.
 *   --format=png|jpeg|webp         default png
 *   --quality=<1-100>              kualitas jpeg/webp (default 82)
 *
 * Hasil: docs/landing/shots/<nama>-<viewport>.<ext>
 *
 * CATATAN PENTING (biar tidak salah baca lagi):
 *   Landing ini tingginya >11.000px. Screenshot `fullPage` utuh = 1440×11425,
 *   dan gambar setinggi itu DITOLAK oleh pembaca gambar (dianggap "unsupported
 *   image") walau ukuran filenya cuma <1 MB. Karena itu:
 *     · untuk melihat satu bagian → pakai `--clip=<selector>`
 *     · untuk melihat seluruh halaman → biarkan `--maxHeight` memecahnya
 * ─────────────────────────────────────────────────────────────────────────────
 */
import fs from 'node:fs'
import path from 'node:path'
import { chromium } from 'playwright-core'

const url = process.argv[2]
const base = process.argv[3] ?? 'shot'
const fullPage = process.argv.includes('fullPage')
const scrollArg = process.argv.find((a) => a.startsWith('--scroll='))
const scrolls = scrollArg
  ? scrollArg.slice('--scroll='.length).split(',').map((s) => s.trim()).filter(Boolean)
  : []
const onlyArg = process.argv.find((a) => a.startsWith('--only='))
const only = onlyArg ? onlyArg.slice('--only='.length) : null
const clickArg = process.argv.find((a) => a.startsWith('--click='))
const clickSelector = clickArg ? clickArg.slice('--click='.length) : null
/* Jeda sebelum screenshot. Default 4 dtk cukup untuk mayoritas section, tapi
   hero (hydration + reveal berurutan) bisa baru selesai >4 dtk di mesin lambat;
   pakai `--wait=8000` untuk screenshot "final" yang tidak mid-animation. */
const waitArg = process.argv.find((a) => a.startsWith('--wait='))
const waitMs = waitArg ? Number(waitArg.slice('--wait='.length)) : 4000
/* `--clip` memotret satu elemen saja. Ini cara paling aman untuk QA per-section:
   hasilnya kecil, tidak kena batas tinggi, dan tidak perlu scroll manual. */
const clipArg = process.argv.find((a) => a.startsWith('--clip='))
const clipSelector = clipArg ? clipArg.slice('--clip='.length) : null
/* Batas tinggi satu gambar. Di atas ini pembaca gambar menolak file-nya
   (gejalanya "You have uploaded an unsupported image"), jadi fullPage dipecah. */
const maxHeightArg = process.argv.find((a) => a.startsWith('--maxHeight='))
const maxHeight = maxHeightArg ? Number(maxHeightArg.slice('--maxHeight='.length)) : 3000
const formatArg = process.argv.find((a) => a.startsWith('--format='))
const format = (formatArg ? formatArg.slice('--format='.length) : 'png').toLowerCase()
const qualityArg = process.argv.find((a) => a.startsWith('--quality='))
const quality = qualityArg ? Number(qualityArg.slice('--quality='.length)) : 82
const ext = format === 'jpeg' || format === 'jpg' ? 'jpg' : format === 'webp' ? 'webp' : 'png'

/* Lapor ukuran file + peringatan kalau masih terlalu besar untuk dibaca alat
   lain. Sengaja dicetak tiap kali supaya kesalahan yang sama tidak terulang. */
function report(file, width, height) {
  const bytes = fs.statSync(file).size
  const mb = (bytes / 1024 / 1024).toFixed(2)
  const tooBig = width > 2000 || height > 4000 || bytes > 4 * 1024 * 1024
  console.log(`  ${file} (${width}×${height}, ${mb} MB)${tooBig ? '  ⚠ TERLALU BESAR' : ''}`)
}

async function capture(page, fileBase, opts = {}) {
  const file = path.join(OUT_DIR, `${fileBase}.${ext}`)
  await page.screenshot({
    path: file,
    ...(ext === 'png' ? {} : { quality }),
    ...opts,
  })
  return file
}

/* Gambar `loading="lazy"` di bawah lipatan BELUM dimuat kalau halaman tidak
   pernah di-scroll; di screenshot fullPage hasilnya kotak abu-abu kosong.
   Jadi susuri halaman dulu (pelan, biar observer-nya sempat jalan), lalu
   kembali ke atas sebelum memotret. */
async function warmLazyContent(page) {
  await page.evaluate(async () => {
    const step = Math.round(window.innerHeight * 0.8)
    const max = Math.max(document.body.scrollHeight, document.documentElement.scrollHeight)
    for (let y = 0; y < max; y += step) {
      window.scrollTo(0, y)
      await new Promise((resolve) => setTimeout(resolve, 120))
    }
    window.scrollTo(0, 0)
    await new Promise((resolve) => setTimeout(resolve, 250))
  })
  await page.waitForTimeout(700)
}

if (!url) {
  console.error('URL wajib diisi')
  process.exit(1)
}

const OUT_DIR = path.join(process.cwd(), 'docs', 'landing', 'shots')
fs.mkdirSync(OUT_DIR, { recursive: true })

const VIEWPORTS = [
  { name: 'desktop', width: 1440, height: 1000 },
  { name: 'tablet', width: 1024, height: 1000 },
  { name: 'mobile', width: 390, height: 844 },
]

const channel = fs.existsSync('C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe')
  ? 'msedge'
  : 'chrome'

const browser = await chromium.launch({ channel, headless: true })

for (const vp of VIEWPORTS) {
  if (only && vp.name !== only) continue
  const context = await browser.newContext({
    viewport: { width: vp.width, height: vp.height },
    deviceScaleFactor: 1,
    locale: 'id-ID',
  })
  const page = await context.newPage()
  await page.goto(url, { waitUntil: 'load', timeout: 90_000 })
  await page.waitForTimeout(waitMs)
  await page.evaluate(() => window.scrollTo(0, 0))
  await page.waitForTimeout(600)

  if (clickSelector) {
    await page.locator(clickSelector).first().click()
    await page.waitForTimeout(1200)
  }

  const fileBase = `${base}-${vp.name}`
  /* ── Mode 1: potret satu elemen (`--clip`) ──────────────────────────────── */
  if (clipSelector) {
    await warmLazyContent(page)
    const target = page.locator(clipSelector).first()
    await target.scrollIntoViewIfNeeded()
    await page.waitForTimeout(800)
    const box = await target.boundingBox()
    const file = await capture(page, `${fileBase}-clip`, { fullPage: true, clip: box })
    report(file, Math.round(box.width), Math.round(box.height))
  } else if (fullPage) {
    /* ── Mode 2: seluruh halaman, dipecah kalau kepanjangan ───────────────── */
    await warmLazyContent(page)
    const docHeight = await page.evaluate(() =>
      Math.max(document.body.scrollHeight, document.documentElement.scrollHeight),
    )
    if (docHeight <= maxHeight) {
      const file = await capture(page, fileBase, { fullPage: true })
      report(file, vp.width, docHeight)
    } else {
      const parts = Math.ceil(docHeight / maxHeight)
      console.log(
        `  tinggi halaman ${docHeight}px > batas ${maxHeight}px → dipecah ${parts} bagian`,
      )
      for (let i = 0; i < parts; i++) {
        const y = i * maxHeight
        const h = Math.min(maxHeight, docHeight - y)
        /* `clip` memotong tepat di koordinat dokumen, jadi tiap bagian nyambung
           tanpa celah dan tanpa ikut tinggi viewport. */
        const file = await capture(page, `${fileBase}-part${i + 1}`, {
          fullPage: true,
          clip: { x: 0, y, width: vp.width, height: h },
        })
        report(file, vp.width, h)
      }
    }
  } else {
    /* ── Mode 3: satu layar viewport (default lama) ────────────────────────── */
    const file = await capture(page, fileBase)
    report(file, vp.width, vp.height)
  }

  for (const pos of scrolls) {
    const y =
      pos === 'bottom'
        ? await page.evaluate(() =>
            Math.max(document.body.scrollHeight, document.documentElement.scrollHeight),
          )
        : pos.startsWith('bottom-')
          ? await page.evaluate(
              (offset) =>
                Math.max(document.body.scrollHeight, document.documentElement.scrollHeight) -
                offset,
              Number(pos.slice('bottom-'.length)),
            )
          : Number(pos)
    await page.evaluate((yy) => window.scrollTo(0, yy), y)
    await page.waitForTimeout(1500)
    const shot = await capture(page, `${base}-${vp.name}-${pos}`)
    report(shot, vp.width, vp.height)
  }

  /* Tangkap juga error runtime supaya ketahuan kalau ada animasi/asset gagal. */
  const logs = []
  page.on('console', (msg) => {
    if (msg.type() === 'error') logs.push(msg.text())
  })
  if (logs.length) console.log(`  console error: ${logs.length}`)
  await context.close()
}

await browser.close()
