import { describe, expect, it } from 'vitest'
import {
  AI_ADDON_DEFAULT_PACKAGE_ID,
  AI_ADDON_PACKAGES,
  AI_BASE_TOKENS_TOTAL,
  AI_GAUGE_BANNER_COPY,
  AI_SEED_USAGE_CALLS,
  AI_TOPUP_COPY,
  aiQuotaSnapshot,
  complementaryPct,
  monthKeyOf,
  planQuota,
} from './ai-quota'
import { PRIVACY_DOC } from './legal/privacy'
import { TERMS_DOC } from './legal/terms'

/* ── KUOTA DASAR TIDAK DI-REFILL (revisi produk) ───────────────────────────────
   Dulu UI menjanjikan "di-reset tanggal 1 tiap bulan" dan pembacaan server hanya
   mengambil baris BULAN BERJALAN — artinya sisa 50% bulan ini kembali 100% bulan
   depan. Pemilik produk memutuskan: kuota dasar hanya berlaku SEKALI di bulan
   pertama paket; setelah habis, user membeli token AI tambahan.

   Test ini mengunci dua hal yang bisa dijaga di lapis murni:
     1. kunci bulan untuk baris `ai_usage` tetap ditulis (jejak audit), dan
     2. aturan "sekali pakai, tanpa refill, token tambahan tidak hangus" tetap
        TERTULIS — sekarang di dokumen legal, bukan lagi di copy UI.

   Sejak revisi pemilik repo, kalimat aturan itu DICABUT dari layar (modal Top Up
   dan kartu Bahan Bakar AI) supaya tidak terbaca seperti dokumen jual. Karena
   itu penjaganya dipindah ke sini: yang diperiksa adalah `/terms` §7 dan
   `/privacy` §6b — dua halaman yang memang memuat janji tersebut. Kalau ada yang
   menghapusnya dari sana, test ini gagal, jadi aturan bisnisnya tidak bisa
   hilang diam-diam hanya karena UI-nya dirapikan. */

/** semua teks yang tampil di satu dokumen legal (judul, paragraf, butir) */
function legalText(doc: typeof TERMS_DOC): string {
  const parts: string[] = [doc.title, ...doc.intro]
  for (const section of doc.sections) {
    parts.push(section.title, ...(section.paragraphs ?? []), ...(section.bullets ?? []))
  }
  return parts.join(' ').toLowerCase()
}

describe('paket top up AI · tiga pilihan kanon (revisi 17 Nov 2026)', () => {
  it('nama, harga, dan deskripsi satu baris persis seperti keputusan produk', () => {
    expect(
      AI_ADDON_PACKAGES.map((pkg) => ({
        id: pkg.id,
        name: pkg.name,
        price: pkg.price,
        description: pkg.description,
      })),
    ).toEqual([
      { id: 'receh', name: 'Santai', price: 19_000, description: '~150x pakai · Cukup 1 bulan' },
      { id: 'sedang', name: 'Reguler', price: 34_000, description: '~350x pakai · Aman 3 bulan' },
      {
        id: 'gede',
        name: 'Full Tank',
        price: 39_000,
        description: '~800x pakai · Puas 6 bulan (cuma Rp 6rb/bln)',
      },
    ])
  })

  it('badge hanya di Full Tank + Full Tank jadi pilihan default', () => {
    expect(AI_ADDON_PACKAGES.filter((pkg) => pkg.best).map((pkg) => pkg.id)).toEqual(['gede'])
    expect(AI_ADDON_DEFAULT_PACKAGE_ID).toBe('gede')
    expect(AI_TOPUP_COPY.bestBadge).toBe('Paling Worth It')
  })

  it('token di balik layar tetap diberikan sesuai tingkatan', () => {
    expect(AI_ADDON_PACKAGES.map((pkg) => pkg.tokens)).toEqual([200_000, 400_000, 800_000])
  })

  it('CTA membawa nominal kartu terpilih & teks teknis lama tidak ada lagi', () => {
    expect(AI_TOPUP_COPY.payCta('Rp 39.000')).toBe('Isi Sekarang · Rp 39.000')
    expect(AI_TOPUP_COPY).not.toHaveProperty('onceLabel')
    expect(AI_TOPUP_COPY).not.toHaveProperty('trustNote')
    expect(AI_TOPUP_COPY).not.toHaveProperty('emptySelection')
    expect(JSON.stringify(AI_TOPUP_COPY)).not.toContain('Bayar Sekarang')
    expect(JSON.stringify(AI_TOPUP_COPY)).not.toContain('sekali bayar')
  })
})

describe('kuota dasar AI · tanpa refill otomatis', () => {
  it('monthKeyOf menulis bulan dua digit (kunci baris ai_usage)', () => {
    expect(monthKeyOf(new Date(2026, 0, 5))).toBe('2026-01')
    expect(monthKeyOf(new Date(2026, 9, 1))).toBe('2026-10')
  })

  it('/terms & /privacy tetap menyebut sekali pakai & token tambahan, bukan reset', () => {
    const terms = legalText(TERMS_DOC)
    const privacy = legalText(PRIVACY_DOC)

    /* aturan pokoknya ada di KEDUA dokumen */
    expect(terms).toContain('tidak diisi ulang otomatis')
    expect(terms).toContain('tidak hangus')
    expect(privacy).toContain('tidak diisi ulang otomatis')
    expect(privacy).toContain('tidak hangus')

    /* dan tidak satu pun menjanjikan tangki kembali penuh tiap tanggal 1 */
    expect(terms).not.toContain('di-reset tanggal 1')
    expect(privacy).not.toContain('di-reset tanggal 1')
  })
})

/* ── KUOTA PER PAKET (paket 84/85) ─────────────────────────────────────────────
   Tiga paket, tiga perilaku: tanpa AI (tanpa tangki), berkuota (tangki dasar),
   tanpa batas (tidak dibatasi). `null` = belum pernah beli → tidak ada AI. */

describe('planQuota() — kuota mengikuti PAKET', () => {
  it('Paket Catet Aja: tanpa AI sama sekali', () => {
    expect(planQuota('catet-aja')).toEqual({ aiEnabled: false, unlimited: false, monthlyTokens: 0 })
  })

  it('Paket Waras: AI berkuota dasar bulanan (angka kanon)', () => {
    expect(planQuota('waras')).toEqual({
      aiEnabled: true,
      unlimited: false,
      monthlyTokens: AI_BASE_TOKENS_TOTAL,
    })
  })

  it('Paket Sultan: AI tanpa batas', () => {
    expect(planQuota('sultan')).toEqual({
      aiEnabled: true,
      unlimited: true,
      monthlyTokens: AI_BASE_TOKENS_TOTAL,
    })
  })

  it('belum pernah beli / tak dikenal → tidak ada AI', () => {
    for (const value of [null, undefined]) {
      expect(planQuota(value)).toEqual({ aiEnabled: false, unlimited: false, monthlyTokens: 0 })
    }
  })
})

/* ── JUDUL BANNER KUOTA = ANGKA BAR YANG SAMA ────────────────────────────────
   Banner Home menampilkan bar pemakaian DAN judul "Kuota AI tinggal N%".
   `usedPercent()`/`remainingPercent()` dibulatkan terpisah sehingga bisa
   berjumlah 101, jadi judulnya diturunkan dari angka bar (`complementaryPct`).
   Test ini mengunci dua hal: judul memuat sisa persen yang melengkapi bar, dan
   tidak ada lagi teks pemakaian yang mengulang angka bar. */

describe('complementaryPct() + judul banner kuota AI', () => {
  it('sisa persen = 100 dikurangi angka terpakai yang digambar bar', () => {
    expect(complementaryPct(77)).toBe(23)
    expect(complementaryPct(0)).toBe(100)
    expect(complementaryPct(100)).toBe(0)
    /* pembulatan desimal diikuti bar, bukan dibulatkan ulang sendiri-sendiri */
    expect(complementaryPct(76.5)).toBe(23)
    expect(complementaryPct(23.5)).toBe(76)
  })

  it('nilai rusak / di luar 0–100 dijepit, tidak pernah negatif', () => {
    expect(complementaryPct(-5)).toBe(100)
    expect(complementaryPct(140)).toBe(0)
    expect(complementaryPct(Number.NaN)).toBe(100)
  })

  it('judul memakai angka sisa dari snapshot kuota NYATA', () => {
    const quota = aiQuotaSnapshot(AI_SEED_USAGE_CALLS)
    expect(quota.usedPct).toBe(77)
    expect(complementaryPct(quota.usedPct)).toBe(23)
    expect(AI_GAUGE_BANNER_COPY.title(complementaryPct(quota.usedPct))).toBe(
      'Kuota AI tinggal 23%',
    )
    /* angka bar tetap dibaca pembaca layar, tapi tidak diulang jadi kalimat */
    expect(AI_GAUGE_BANNER_COPY.usageBarLabel(quota.usedPct)).toBe('Kuota AI terpakai 77%')
    expect(AI_GAUGE_BANNER_COPY).not.toHaveProperty('usage')
  })
})
