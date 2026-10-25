import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

/* ── PENJAGA KANVAS DOKUMEN (app/globals.css) ────────────────────────────────
   Kenapa CSS ikut diuji: satu-satunya bagian app ini yang masih diwarnai
   `--background` adalah `html`/`body`, dan itu sumber bug nyata.

   Semua permukaan app memakai token putih STATIS (`bg-canvas`, `bg-cream`,
   teks `forest`) — jadi tema gelap/"Ikuti Sistem" tidak mewarnai halaman
   sama sekali. Yang berubah hanya `--background` ⇒ HITAM. Latar dokumen itulah
   yang dipakai browser untuk area di luar halaman:
     • karet overscroll saat halaman ditarik ke bawah di HP ("pull-down"),
     • sisa ruang di bawah halaman yang isinya lebih pendek dari layar.
   Hasilnya: app putih, tapi begitu ditarik ke bawah muncul pita hitam polos
   (benchmark-nya Fundy: putih rata).

   Yang dikunci di sini:
     1. ada aturan yang mengunci latar kanvas `:root`/`:root.light`/`:root.dark`
        + `body` ke `bg-canvas` — jadi putih di SEMUA keadaan tema;
     2. aturan yang sama mengunci `color-scheme: light` (bukan `dark`), supaya
        perangkat bermode gelap tidak mengecat area luar dokumen dengan hitam
        walau latar kita sudah putih;
     3. `body` tidak lagi memetakan latarnya ke `bg-background` (yang hitam di
        tema gelap).

   Membaca berkas apa adanya (bukan menjalankan browser) memang disengaja:
   invariannya invarian stylesheet, dan tanpa penjaga ini bug yang sama bisa
   kembali lewat satu baris `@apply` saja tanpa ada test yang gagal. */

const CSS = readFileSync(new URL('./globals.css', import.meta.url), 'utf8')

/** komentar dibuang dulu supaya narasi di dalamnya tidak dibaca sebagai aturan */
const RULES = CSS.replace(/\/\*[\s\S]*?\*\//g, '')

/** aturan kanvas dokumen — dikenali dari selector `:root.dark` (tidak ada blok
 *  lain di berkas ini yang memakainya; blok `@media` memakai `:root:not(.light)`) */
const CANVAS_LOCK = RULES.match(/[^{}]*:root\.dark[^{}]*\{[^}]*\}/)?.[0] ?? ''

describe('kanvas dokumen — putih di semua keadaan tema', () => {
  it('mengunci latar `:root`, `:root.light`, `:root.dark`, dan `body` ke `bg-canvas`', () => {
    expect(CANVAS_LOCK).not.toBe('')
    for (const selector of [':root', ':root.light', ':root.dark', 'body']) {
      expect(CANVAS_LOCK).toContain(selector)
    }
    expect(CANVAS_LOCK).toContain('bg-canvas')
  })

  it('mengunci `color-scheme: light` — bukan `dark`', () => {
    expect(CANVAS_LOCK).toContain('color-scheme: light')
    expect(CANVAS_LOCK).not.toContain('color-scheme: dark')
  })

  it('`body` tidak lagi mengikuti `--background` (hitam di tema gelap)', () => {
    /* `bg-background` tidak boleh dipakai lagi di berkas ini sama sekali: di
       tema gelap token itu hitam, dan hanya `html`/`body` yang memakainya. */
    expect(RULES).not.toMatch(/@apply[^;\n]*\bbg-background\b/)
  })
})

/* ── PERFORMA MOBILE (paket 86) ───────────────────────────────────────────────
   Sisa biaya render yang bikin popup terasa "patah-patah" di HP: animasi HIAS di
   latar (ayunan tanaman, kilau, denyut) tetap berjalan selama overlay terbuka.
   Yang dikunci di sini: ketiga jalur kunci-overlay di repo ini benar-benar
   memicu jeda itu, jedanya dibatasi ke elemen dekoratif (bukan seluruh halaman),
   dan tidak menumbuk animasi panel/sheet (yang di-render lewat portal di luar
   `[data-catetind-page-root]`). */
describe('performa mobile — jeda animasi hias saat overlay terbuka', () => {
  const PAUSE =
    RULES.match(/[^{}]*\{[^}]*animation-play-state:\s*paused[^}]*\}/)?.[0] ?? ''

  it('ada aturan yang menjeda animasi (bukan meniadakannya)', () => {
    expect(PAUSE).not.toBe('')
  })

  it('dijeda lewat ketiga penanda kunci overlay yang dipakai app', () => {
    for (const attr of [
      "body[data-catetind-sheet-open='true']",
      "body[data-catetind-overlay-open='true']",
      'body[data-scroll-locked]',
    ]) {
      expect(PAUSE).toContain(attr)
    }
  })

  it('ruang lingkupnya konten halaman, bukan seluruh dokumen', () => {
    expect(PAUSE).toContain('[data-catetind-page-root]')
  })

  it('yang dijeda hanya animasi hias — bukan semua animasi', () => {
    expect(PAUSE).toContain('animate-ping')
    expect(PAUSE).toContain('plant-sway')
    expect(PAUSE).toContain('.progress-shimmer')
  })
})

/* ── TIPOGRAFI — FONT SISTEM APPLE (SAN FRANCISCO) ───────────────────────────
   Permintaan produk: ganti font app ke font yang dipakai Apple. SF Pro tidak
   boleh di-bundle sebagai webfont, jadi jalurnya FONT SISTEM: `-apple-system` +
   `BlinkMacSystemFont` di depan stack (San Francisco di macOS/iOS, font sistem
   native di platform lain).

   Penjaga ini mencegah perubahan yang tidak sengaja: webfont pihak ketiga
   (`var(--font-inter)` / pin `opsz` khusus Inter) tidak boleh kembali tanpa
   keputusan sadar, dan kedua slot font harus tetap menunjuk keluarga yang sama. */
describe('tipografi — font sistem Apple', () => {
  const sans = RULES.match(/--font-sans:\s*([^;]+);/)?.[1] ?? ''
  const display = RULES.match(/--font-display:\s*([^;]+);/)?.[1] ?? ''

  it('`--font-sans` & `--font-display` memakai stack -apple-system', () => {
    for (const stack of [sans, display]) {
      expect(stack).toContain('-apple-system')
      expect(stack).toContain('BlinkMacSystemFont')
    }
  })

  it('tidak ada lagi pin optik / variabel khusus Inter', () => {
    expect(RULES).not.toContain('var(--font-inter)')
    expect(RULES).not.toContain("font-variation-settings: 'opsz'")
  })

  /* Keluhan nyata setelah font diganti: "jarak antar karakter deket banget".
     Penyebabnya dua tuning Inter yang masih tertinggal — `letter-spacing`
     negatif global dan token `tracking-tight` -0.025em. Sekarang keduanya 0:
     body mewarisi `normal`, dan seluruh pemakaian `tracking-tight`/`tighter`
     ikut jadi 0 lewat token. */
  it('huruf tidak dipepetin: letter-spacing global & token tracking = 0', () => {
    const htmlRule = RULES.match(/html\s*\{[^}]*\}/)?.[0] ?? ''
    expect(htmlRule).toContain('letter-spacing: normal')
    expect(htmlRule).not.toMatch(/letter-spacing:\s*-/)

    expect(RULES).toMatch(/--tracking-tight:\s*0em/)
    expect(RULES).toMatch(/--tracking-tighter:\s*0em/)
  })
})

