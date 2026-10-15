import { describe, expect, it } from 'vitest'
import { AI_ENGINE_ID, AI_ENGINE_NAME } from './engine'

/* ── NAMA MESIN YANG DILIHAT PUBLIK (paket 86) ────────────────────────────────
   Berkas ini menjaga SATU aturan yang mahal kalau dilanggar: nama yang dilihat
   user & yang keluar di balasan API harus milik PRODUK SENDIRI, bukan merek
   model pihak lain. Dua kebocoran yang sudah terbukti di repo ini:
     · nama penyedia tertulis di copy UI yang ikut ke bundel klien;
     · field `model` di balasan route AI memakai nama model penyedia.

   Daftar di bawah bukan daftar hitam lengkap — ia jagaAN terhadap kebiasaan
   lama, termasuk kebiasaan "menumpang" nama model terkenal yang modelnya TIDAK
   dipakai app ini. Itu klaim palsu ke pembeli yang membayar, sekaligus tabrakan
   merek: pembeli yang sadar berhak menuntut refund, dan pemilik mereknya bisa
   mengirim somasi. Identitas pemroses data yang sebenarnya tetap disebut di
   `lib/legal/privacy.ts` (hak tahu user, UU PDP) — yang dijaga di sini hanya
   nama merek di UI dan di response API. */

/** merek model/penyedia pihak ketiga yang tidak boleh muncul di nama publik */
const VENDOR_BRANDS = [
  'deepseek',
  'openai',
  'gpt',
  'chatgpt',
  'anthropic',
  'claude',
  'opus',
  'sonnet',
  'haiku',
  'gemini',
  'google',
  'llama',
  'mistral',
  'qwen',
  'grok',
  'xai',
  'kimi',
]

describe('lib/ai/engine', () => {
  it('nama & ID mesin terisi', () => {
    expect(AI_ENGINE_NAME.trim().length).toBeGreaterThan(0)
    expect(AI_ENGINE_ID.trim().length).toBeGreaterThan(0)
  })

  it('ID berbentuk slug mesin (huruf kecil, angka, tanda hubung)', () => {
    expect(AI_ENGINE_ID).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/)
  })

  it('nama & ID tidak memakai merek model pihak lain', () => {
    const haystack = `${AI_ENGINE_NAME} ${AI_ENGINE_ID}`.toLowerCase()
    for (const brand of VENDOR_BRANDS) expect(haystack).not.toContain(brand)
  })
})
