import { describe, expect, it } from 'vitest'
import { PLANS } from './pricing'
import {
  HERO_DEVICE,
  HERO_DEVICE_ARIA,
  HERO_DEVICE_FLOAT,
  HERO_DEVICE_MONTHLY_SUMMARY,
  HERO_DEVICE_SCREENSHOT,
  HERO_HUD,
  LIVE_FEED_SEED,
  LIVE_FEED_VISIBLE,
  formatIDR,
  liveFeedFromPurchases,
  relativeFeedTime,
} from './landing'

/* ── FEED PEMBELIAN NYATA (paket 85) ─────────────────────────────────────────
   Logika murni yang mengubah jawaban `/api/pricing/recent-purchases` menjadi
   baris feed. Yang dikunci: seed memakai harga KANON `PLANS`, waktu relatif
   dihitung dari waktu server, dan nilai yang tidak jelas TIDAK dikarang. */

const NOW = Date.parse('2026-10-11T12:00:00.000Z')

describe('relativeFeedTime()', () => {
  it('menerjemahkan jarak waktu ke label Indonesia', () => {
    expect(relativeFeedTime('2026-10-11T11:59:40.000Z', NOW)).toBe('baru saja')
    expect(relativeFeedTime('2026-10-11T11:55:00.000Z', NOW)).toBe('5 menit lalu')
    expect(relativeFeedTime('2026-10-11T09:00:00.000Z', NOW)).toBe('3 jam lalu')
    expect(relativeFeedTime('2026-10-09T12:00:00.000Z', NOW)).toBe('2 hari lalu')
  })

  it('tanggal tak terbaca → string kosong (bukan angka karangan)', () => {
    expect(relativeFeedTime('bukan-tanggal', NOW)).toBe('')
  })
})

describe('liveFeedFromPurchases()', () => {
  it('memetakan baris endpoint apa adanya', () => {
    const rows = liveFeedFromPurchases(
      [{ name: 'Rina', city: 'Jakarta', price: 129_000, at: '2026-10-11T11:55:00.000Z' }],
      NOW,
    )
    expect(rows).toHaveLength(1)
    expect(rows[0]).toMatchObject({
      name: 'Rina',
      city: 'Jakarta',
      price: 129_000,
      time: '5 menit lalu',
    })
  })

  it('nama/kota yang tidak jelas diberi nilai netral, bukan karangan', () => {
    const rows = liveFeedFromPurchases([{ price: 109_000 }], NOW)
    expect(rows[0].name).toBe('Seseorang')
    expect(rows[0].city).toBe('Indonesia')
    expect(rows[0].time).toBe('')
  })

  it('id tiap baris unik walau nama sama', () => {
    const rows = liveFeedFromPurchases(
      [{ name: 'Rina' }, { name: 'Rina' }],
      NOW,
    )
    expect(rows[0].id).not.toBe(rows[1].id)
  })

  it('daftar kosong → daftar kosong (bukan seed)', () => {
    expect(liveFeedFromPurchases([], NOW)).toEqual([])
  })
})

describe('LIVE_FEED_SEED — angka DIBACA dari PLANS', () => {
  it('setiap harga seed ada di daftar harga kanon', () => {
    const prices = PLANS.map((plan) => plan.lifetime)
    for (const entry of LIVE_FEED_SEED) {
      expect(prices).toContain(entry.price)
    }
    expect(LIVE_FEED_VISIBLE).toBeLessThanOrEqual(LIVE_FEED_SEED.length)
  })
})

/* ── ADEGAN HERO ─────────────────────────────────────────────────────────────
   Hero landing menggambar SATU layar app: kartu "Semua Dompet" di atas lima
   catatan hari ini, plus strip ringkasan periode. Angka-angka itu cermin persona
   demo, dan yang dikunci di sini bukan angkanya satu per satu — tapi bahwa
   hero ini mustahil bercerita dua versi:

     · saldo deck = JUMLAH daftar dompet (diturunkan, bukan diketik);
     · `net` = pemasukan − pengeluaran;
     · sisa bulan ini = total saldo (di persona demo, sisa gaji memang berakhir
       di dompet — kalau salah satu angka diubah sendiri, hero akan menampilkan
       dua kebenaran yang berbeda dan test ini yang menahannya);
     · kartu melayang memakai angka & label yang SAMA dengan layar. */

describe('HERO_DEVICE — satu cerita angka di seluruh hero', () => {
  it('saldo kartu agregat = jumlah dompet persona demo', () => {
    expect(HERO_DEVICE.walletDeck.total).toBe(2_120_000)
    expect(HERO_DEVICE.walletDeck.sub).toBe('4 dompet aktif')
  })

  it('sisa bulan ini = total saldo (sisa gaji berakhir di dompet)', () => {
    expect(HERO_DEVICE_MONTHLY_SUMMARY.net).toBe(HERO_DEVICE.walletDeck.total)
  })

  it('net ringkasan diturunkan dari pemasukan − pengeluaran', () => {
    expect(HERO_DEVICE_MONTHLY_SUMMARY.net).toBe(
      HERO_DEVICE_MONTHLY_SUMMARY.income - HERO_DEVICE_MONTHLY_SUMMARY.spending,
    )
  })

  it('label yang mengintip di tumpukan = dompet terdalam lebih dulu', () => {
    expect(HERO_DEVICE.walletDeck.peeking).toEqual(['Tunai', 'ShopeePay', 'GoPay'])
    expect(HERO_DEVICE.walletDeck.dots).toBe(5)
  })

  it('tiap baris catatan: nama, kategori, jam, dan nominal masuk akal', () => {
    const rows = HERO_DEVICE.txn.rows
    expect(rows.length).toBeGreaterThanOrEqual(5)
    for (const row of rows) {
      expect(row.title.length).toBeGreaterThan(2)
      expect(row.category.length).toBeGreaterThan(2)
      expect(row.time).toMatch(/^\d{2}:\d{2}$/)
      expect(row.amount).toBeGreaterThan(0)
    }
  })

  it('kartu melayang memakai angka layar, bukan angka kedua', () => {
    const float = (id: string) => HERO_DEVICE_FLOAT.find((card) => card.id === id)
    expect(float('jatah')?.value).toBe(HERO_HUD.amount)
    expect(float('masuk')?.value).toBe(`+${formatIDR(HERO_DEVICE_MONTHLY_SUMMARY.income)}`)
    expect(float('keluar')?.value).toBe(`-${formatIDR(HERO_DEVICE_MONTHLY_SUMMARY.spending)}`)
    expect(float('tanaman')?.value).toBe(HERO_HUD.plantLabel)
  })

  it('kalimat pembaca layar memuat angka yang sama dengan yang digambar', () => {
    expect(HERO_DEVICE_ARIA).toContain(formatIDR(HERO_DEVICE.walletDeck.total))
    expect(HERO_DEVICE_ARIA).toContain(HERO_DEVICE.walletDeck.sub)
  })

  it('layar default adalah replika UI live (bukan gambar)', () => {
    expect(HERO_DEVICE_SCREENSHOT).toBeNull()
  })
})
