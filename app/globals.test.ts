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
