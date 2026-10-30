/**
 * scripts/landing/make-og-image.mjs
 * â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
 * Menghasilkan `public/og-image.png` â€” gambar pratinjau tautan 1200Ã—630 yang
 * dipakai `og:image` & `twitter:image` (lihat `LANDING_META` di
 * `lib/data/landing.ts`).
 *
 * KENAPA DIGENERATE, BUKAN GAMBAR TANGAN:
 *   Â· ukurannya HARUS tepat 1200Ã—630 â€” itu rasio kartu besar WhatsApp/X/Facebook.
 *     Gambar "kira-kira" bikin pratinjau terpotong atau berbingkai putih;
 *   Â· teksnya memakai Inter (font yang SAMA dengan app, `next/font/local`), jadi
 *     kartu pratinjau tidak terlihat seperti produk lain;
 *   Â· kalau judul landing berubah, cukup jalankan ulang skrip ini.
 *
 * CARA KERJA: `sharp` tidak dipakai (di mesin ini ia tidak bisa merender teks
 * tanpa fontconfig), jadi HTML-nya digambar oleh Chromium yang SUDAH terpasang
 * (Edge/Chrome) lewat `playwright-core` â€” pola yang sama dengan
 * `make-hero-webp.mjs` dan `shoot.mjs`. Berkas font dibaca dari repo lalu
 * ditanam sebagai data URI, sehingga tidak ada request jaringan sama sekali
 * (skrip tetap jalan tanpa dev server).
 *
 * Pakai:
 *   node scripts/landing/make-og-image.mjs     â†’ public/og-image.png
 *   npm run og-image
 * â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { chromium } from 'playwright-core'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..')
const OUT = path.join(root, 'public', 'og-image.png')
const FONT = path.join(root, 'app', 'fonts', 'inter-latin-variable.woff2')

/** ukuran kanon kartu pratinjau â€” jangan diubah tanpa mengubah LANDING_META */
const SIZE = { width: 1200, height: 630 }

const fontBase64 = fs.readFileSync(FONT).toString('base64')

/* Palet Earth Pastel (sumber: app/globals.css): forest, cream, mint, sage. */
const html = `<!doctype html>
<html lang="id">
<head>
<meta charset="utf-8">
<style>
  @font-face {
    font-family: 'Inter';
    src: url(data:font/woff2;base64,${fontBase64}) format('woff2');
    font-weight: 100 900;
    font-style: normal;
    font-display: block;
  }
  * { margin: 0; padding: 0; box-sizing: border-box; }
  html, body { width: ${SIZE.width}px; height: ${SIZE.height}px; }
  body {
    font-family: 'Inter', sans-serif;
    font-variation-settings: 'opsz' 32;
    color: #fbf6d9;
    -webkit-font-smoothing: antialiased;
  }
  .frame {
    position: relative;
    width: ${SIZE.width}px;
    height: ${SIZE.height}px;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    padding: 64px 72px 58px;
    overflow: hidden;
    background:
      radial-gradient(880px 520px at 84% 6%, rgba(145, 187, 158, 0.34), rgba(145, 187, 158, 0) 64%),
      radial-gradient(620px 460px at 6% 100%, rgba(0, 0, 0, 0.34), rgba(0, 0, 0, 0) 70%),
      linear-gradient(135deg, #52685c 0%, #45594e 52%, #1f2823 100%);
  }
  .top { display: flex; align-items: center; justify-content: space-between; }
  .brand { display: flex; align-items: center; gap: 14px; font-size: 30px; font-weight: 600; letter-spacing: -0.02em; }
  .mark { width: 16px; height: 16px; border-radius: 999px; background: #91bb9e; box-shadow: 0 0 0 6px rgba(145, 187, 158, 0.18); }
  .pill {
    font-size: 17px;
    font-weight: 500;
    color: #fbf6d9;
    padding: 9px 18px;
    border-radius: 999px;
    background: rgba(0, 0, 0, 0.20);
    border: 1px solid rgba(145, 187, 158, 0.35);
  }
  .headline {
    font-size: 76px;
    line-height: 1.06;
    font-weight: 600;
    letter-spacing: -0.035em;
    max-width: 900px;
  }
  .headline em { font-style: italic; color: #dbe4c7; }
  .sub {
    margin-top: 22px;
    font-size: 25px;
    line-height: 1.45;
    font-weight: 400;
    color: rgba(251, 246, 217, 0.80);
    max-width: 760px;
  }
  .chips { display: flex; align-items: center; gap: 12px; }
  .chip {
    font-size: 18px;
    font-weight: 500;
    color: #dbe4c7;
    padding: 10px 18px;
    border-radius: 999px;
    background: rgba(251, 246, 217, 0.10);
    border: 1px solid rgba(145, 187, 158, 0.32);
  }
  .domain { margin-left: auto; font-size: 18px; font-weight: 500; color: rgba(251, 246, 217, 0.62); }
</style>
</head>
<body>
  <div class="frame">
    <div class="top">
      <div class="brand"><span class="mark"></span>CatetInd</div>
      <div class="pill">Aplikasi catet keuangan</div>
    </div>

    <div>
      <div class="headline">Catet keuangan 4 detik.<br><em>Tanpa ribet.</em></div>
      <div class="sub">Voice note atau foto struk, langsung kecatat.<br>Biar tau duit ke mana, bukan cuma numpang lewat.</div>
    </div>

    <div class="chips">
      <span class="chip">Voice note</span>
      <span class="chip">Scan struk</span>
      <span class="chip">Jatah harian</span>
      <span class="chip">AI Coach</span>
      <span class="domain">catetind.com</span>
    </div>
  </div>
</body>
</html>`

const edge = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe'
const channel = fs.existsSync(edge) ? 'msedge' : 'chrome'

const browser = await chromium.launch({ channel, headless: true })
try {
  const page = await browser.newPage({ viewport: SIZE, deviceScaleFactor: 1 })
  await page.setContent(html, { waitUntil: 'load' })
  /* tunggu font benar-benar siap â€” tanpa ini Chromium bisa memotret teks dengan
     font fallback walau `font-display: block` sudah dipasang */
  await page.evaluate(() => document.fonts.ready)
  await page.screenshot({ path: OUT, type: 'png' })

  const kb = Math.round(fs.statSync(OUT).size / 1024)
  console.log(`âœ“ public/og-image.png (${SIZE.width}Ã—${SIZE.height}, ${kb} KB)`)
} finally {
  await browser.close()
}
