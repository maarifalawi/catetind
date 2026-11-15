import { describe, expect, it } from 'vitest'
import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { FORBIDDEN_COPY, FORBIDDEN_COPY_SELF } from './forbidden-copy'

/* ── PENJAGA "OPERASI SAPU BERSIH TEKS" ───────────────────────────────────────
   Seluruh kalimat di `forbidden-copy.ts` DILARANG muncul lagi di layar. Test ini
   menyisir berkas sumber (app/components/lib) supaya kalimat lama tidak diam-diam
   kembali lewat salinan di komponen atau kamus teks. Berkas daftar itu sendiri dan
   berkas test dilewati; komentar dokumentasi TIDAK dikecualikan: komentar yang
   menyalin kalimat terlarang tetap dianggap utang teks. */

const FORBIDDEN = FORBIDDEN_COPY

function sourceFiles(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name)
    if (entry.isDirectory()) {
      sourceFiles(full, out)
      continue
    }
    if (!/\.(ts|tsx)$/.test(entry.name)) continue
    if (/\.test\.(ts|tsx)$/.test(entry.name)) continue
    if (entry.name === FORBIDDEN_COPY_SELF) continue
    out.push(full)
  }
  return out
}

describe('operasi sapu bersih teks', () => {
  it('daftar memuat seluruh 54 butir keputusan produk', () => {
    /* 54 butir, beberapa butir butuh lebih dari satu pola → daftar pasti > 54 */
    expect(FORBIDDEN.length).toBeGreaterThanOrEqual(54)
  })

  it('tidak ada satu pun kalimat terlarang yang tersisa di sumber app', () => {
    const roots = ['app', 'components', 'lib']
    const hits: string[] = []
    for (const root of roots) {
      for (const file of sourceFiles(root)) {
        const text = readFileSync(file, 'utf8')
        for (const phrase of FORBIDDEN) {
          if (text.includes(phrase)) hits.push(`${file}: ${phrase}`)
        }
      }
    }
    expect(hits).toEqual([])
  })
})

