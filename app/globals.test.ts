import { existsSync, readFileSync, statSync } from 'node:fs'
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

/* ── TIPOGRAFI — INTER DISPLAY YANG DIBUNDEL DI REPO ─────────────────────────
   Font app ini WAJIB datang dari berkas di repo (`app/fonts/…woff2`) lewat
   `next/font/local`, BUKAN `next/font/google`. Alasannya bukan selera: saat
   koneksi ke fonts.googleapis.com gagal, Next hanya memberi PERINGATAN lalu
   memakai fallback Arial ber-`size-adjust` (`@font-face "Inter Fallback"`) —
   build tetap sukses, tapi seluruh teks app berubah wajah: hurufnya terasa
   "asing" dan teks kecil tidak terbaca sejelas Inter. Itu persis keluhan yang
   muncul setelah font sistem dipakai, jadi jalur rapuh ini dijaga di sini.

   Yang juga dikunci: potongan "Display" (opsz 32) dan tracking Inter yang
   membuat teks tetap kompak tanpa dipepetin. */
describe('tipografi — Inter Display dari berkas lokal', () => {
  const LAYOUT = readFileSync(new URL('./layout.tsx', import.meta.url), 'utf8')
  const FONT_FILE = new URL('./fonts/inter-latin-variable.woff2', import.meta.url)

  it('layout memuat font lokal, bukan Google Fonts', () => {
    expect(LAYOUT).toContain("from 'next/font/local'")
    expect(LAYOUT).not.toContain("from 'next/font/google'")
    expect(LAYOUT).toContain("src: './fonts/inter-latin-variable.woff2'")
    expect(LAYOUT).toContain("variable: '--font-inter'")
  })

  it('berkas fontnya benar-benar ada di repo (bukan hasil unduhan saat build)', () => {
    expect(existsSync(FONT_FILE)).toBe(true)
    expect(statSync(FONT_FILE).size).toBeGreaterThan(20_000)
  })

  it('`--font-sans` & `--font-display` menunjuk `var(--font-inter)`', () => {
    const sans = RULES.match(/--font-sans:\s*([^;]+);/)?.[1] ?? ''
    const display = RULES.match(/--font-display:\s*([^;]+);/)?.[1] ?? ''
    for (const stack of [sans, display]) {
      expect(stack).toContain('var(--font-inter)')
    }
  })

  it('potongan Display dikunci (opsz 32) dan tracking Inter tidak dinolkan', () => {
    const htmlRule = RULES.match(/html\s*\{[^}]*\}/)?.[0] ?? ''
    expect(htmlRule).toContain("font-variation-settings: 'opsz' 32")
    expect(htmlRule).toContain('letter-spacing: -0.011em')
    /* `tracking-tight`/`tighter` TIDAK boleh dipetakan ke 0: itu yang membuat
       judul & nominal terasa longgar, bukan seperti Inter Display. */
    expect(RULES).not.toMatch(/--tracking-tight:\s*0em/)
    expect(RULES).not.toMatch(/--tracking-tighter:\s*0em/)
  })
})
