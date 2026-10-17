import { describe, expect, it } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'
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
  LP_CONTACT,
  LP_FAQ,
  LP_FOOTER,
  LP_HERO,
  LP_MISSION,
  LP_PRICING,
  LP_SUPPORT_EMAIL,
  LP_WHATSAPP,
  buildContactMailto,
  buildContactWhatsApp,
  formatIDR,
  liveFeedFromPurchases,
  lpHref,
  lpPlanPrice,
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

/* ── LANDING LP · MILESTONE B (mission, pricing, FAQ) ────────────────────────
   Port dari export Framer hanya boleh memakai angka & fakta produk. Yang
   dikunci di sini: harga = `PLANS`, setiap gambar benar-benar ada di
   `public/`, tidak ada item FAQ kosong/id ganda, dan tidak ada sisa
   copy template Inggris (termasuk nama "Makro") yang lolos ke layar. */

describe('LP_PRICING — harga yang diiklankan = harga yang ditagih', () => {
  it('default mode = lifetime', () => {
    expect(LP_PRICING.defaultMode).toBe('lifetime')
    expect(LP_PRICING.modes.map((entry) => entry.id)).toEqual(['monthly', 'lifetime'])
    expect(LP_PRICING.periodLabels.monthly).toBe('per 30 hari')
    expect(LP_PRICING.periodLabels.lifetime).toBe('Sekali bayar, akses selamanya')
  })

  it('harga monthly landing = PLANS[].monthly', () => {
    for (const plan of PLANS) {
      expect(lpPlanPrice(plan.id, 'monthly')).toBe(plan.monthly)
    }
    expect(PLANS.map((plan) => plan.monthly)).toEqual([49_000, 79_000, 199_000])
  })

  it('harga lifetime landing = PLANS[].lifetime', () => {
    for (const plan of PLANS) {
      expect(lpPlanPrice(plan.id, 'lifetime')).toBe(plan.lifetime)
    }
    expect(PLANS.map((plan) => plan.lifetime)).toEqual([109_000, 129_000, 299_000])
  })

  it('tidak ada daftar harga kedua di LP_PRICING', () => {
    expect('subscription' in LP_PRICING).toBe(false)
    const planIds = PLANS.map((plan) => plan.id)
    for (const tier of LP_PRICING.tiers) expect(planIds).toContain(tier.id)
    expect(LP_PRICING.tiers).toHaveLength(PLANS.length)
  })

  it('CTA kartu membawa plan + period yang dibaca halaman checkout', () => {
    for (const tier of LP_PRICING.tiers) {
      expect(LP_PRICING.checkoutHref(tier.id, 'monthly')).toBe(
        `/checkout?period=monthly&plan=${tier.id}`,
      )
      expect(LP_PRICING.checkoutHref(tier.id, 'lifetime')).toBe(
        `/checkout?period=lifetime&plan=${tier.id}`,
      )
    }
  })

  it('badge & catatan menjelaskan prabayar tanpa auto-debet', () => {
    expect(LP_PRICING.badges.monthly).toContain('Prabayar 30 hari')
    expect(LP_PRICING.badges.monthly.toLowerCase()).toContain('tanpa auto-debet')
    expect(LP_PRICING.badges.lifetime).toContain('selamanya')
    expect(LP_PRICING.note.toLowerCase()).toContain('perpanjang manual')
    expect(JSON.stringify(LP_PRICING)).not.toContain('belum tersedia di checkout')
  })
})

describe('LP_MISSION — anchor & aset', () => {
  it('empat kartu memakai id anchor yang diminta navbar/footer', () => {
    expect(LP_MISSION.cards.map((card) => card.id)).toEqual([
      'card-1',
      'card-2',
      'card-3',
      'card-4',
    ])
  })

  it('setiap kartu punya copy desktop & mobile yang tidak kosong', () => {
    for (const card of LP_MISSION.cards) {
      expect(card.title.trim().length).toBeGreaterThan(8)
      expect(card.body.trim().length).toBeGreaterThan(8)
      expect(card.caption.trim().length).toBeGreaterThan(8)
      expect(card.mobile.title.trim().length).toBeGreaterThan(8)
      expect(card.mobile.body.trim().length).toBeGreaterThan(8)
      expect(card.mobile.eyebrow.trim().length).toBeGreaterThan(3)
    }
  })

  it('semua gambar mission ada di public dan punya dimensi asli', () => {
    const sources = LP_MISSION.cards.flatMap((card) => [card.image, card.mobile.image])
    for (const src of sources) {
      const file = path.join(
        process.cwd(),
        'public',
        decodeURIComponent(src.replace(/^\//, '')),
      )
      expect(fs.existsSync(file), `${src} tidak ada`).toBe(true)
    }

    /* width/height dari markup export dipakai supaya layout tidak melompat */
    for (const card of LP_MISSION.cards) {
      expect(card.imageWidth).toBeGreaterThan(0)
      expect(card.imageHeight).toBeGreaterThan(0)
      expect(card.mobile.imageWidth).toBeGreaterThan(0)
      expect(card.mobile.imageHeight).toBeGreaterThan(0)
    }
  })

  it('gambar hero yang dipakai halaman preview juga ada', () => {
    const sources = [
      LP_HERO.boardImage,
      LP_HERO.phoneImage,
      ...LP_HERO.avatars,
    ]
    for (const src of sources) {
      const file = path.join(process.cwd(), 'public', src.replace(/^\//, ''))
      expect(fs.existsSync(file), `${src} tidak ada`).toBe(true)
    }
  })
})

describe('LP_FAQ — kategori nyata, bukan tab kosong', () => {
  const categoryIds = LP_FAQ.categories.map((entry) => entry.id)

  it('empat kategori lokal, label Bahasa Indonesia (bukan template live)', () => {
    expect(categoryIds).toEqual(['umum', 'harga', 'fitur', 'privasi'])
    expect(LP_FAQ.categories.map((entry) => entry.label)).toEqual([
      'Umum',
      'Harga & paket',
      'Fitur & AI',
      'Privasi & keamanan',
    ])
    for (const template of [
      'General',
      'Forecasting',
      'Setup & integrations',
      'Security and privacy',
    ]) {
      expect(LP_FAQ.categories.map((entry) => entry.label)).not.toContain(template)
    }
  })

  it('setiap item punya kategori valid, pertanyaan & jawaban, id unik', () => {
    const ids = new Set<string>()
    for (const item of LP_FAQ.items) {
      expect(categoryIds).toContain(item.category)
      expect(item.id.trim().length).toBeGreaterThan(0)
      expect(item.question.trim().length).toBeGreaterThan(8)
      expect(item.answer.trim().length).toBeGreaterThan(20)
      expect(ids.has(item.id)).toBe(false)
      ids.add(item.id)
    }
  })

  it('setiap kategori minimal 2 item; satu id tidak muncul di dua kategori', () => {
    expect(LP_FAQ.items).toHaveLength(11)
    const seen = new Set<string>()
    for (const category of categoryIds) {
      const items = LP_FAQ.items.filter((item) => item.category === category)
      expect(items.length, `${category} kurang dari 2 item`).toBeGreaterThanOrEqual(2)
      for (const item of items) {
        expect(seen.has(item.id)).toBe(false)
        seen.add(item.id)
      }
    }
    expect(seen.size).toBe(LP_FAQ.items.length)
  })

  it('enam pertanyaan wajib dari export tetap ada', () => {
    const ids = new Set(LP_FAQ.items.map((item) => item.id))
    for (const id of [
      'buat-siapa',
      'beda-app-lain',
      'harus-paham-keuangan',
      'versi-gratis',
      'pwa',
      'bank-sync',
    ]) {
      expect(ids.has(id), `${id} hilang`).toBe(true)
    }
  })

  it('kartu kontak memakai WhatsApp resmi + email fallback', () => {
    expect(LP_FAQ.contact.href.startsWith(LP_WHATSAPP.href)).toBe(true)
    expect(LP_FAQ.contact.ctaLabel.toLowerCase()).toContain('whatsapp')
    expect(LP_FAQ.contact.emailHref).toBe(`mailto:${LP_SUPPORT_EMAIL}`)
    expect(LP_FAQ.contact.emailLabel).toContain(LP_SUPPORT_EMAIL)
  })
})

describe('LP_CONTACT — tiga field, WhatsApp utama + email fallback', () => {
  it('hanya tiga field: nama, kontak, pertanyaan — semuanya wajib', () => {
    expect(Object.keys(LP_CONTACT.form.fields)).toEqual(['name', 'contact', 'question'])
    for (const field of Object.values(LP_CONTACT.form.fields)) {
      expect(field.required).toBe(true)
      expect(field.label.trim().length).toBeGreaterThan(2)
      expect(field.placeholder.trim().length).toBeGreaterThan(2)
      expect(field.maxLength).toBeGreaterThan(0)
    }
    expect(LP_CONTACT.form.fields.question.type).toBe('textarea')
    expect(LP_CONTACT.form.fields.contact.type).toBe('text')
  })

  it('email resmi halo@, bukan support@ lama', () => {
    expect(LP_SUPPORT_EMAIL).toBe('halo@catetind.com')
    expect(LP_CONTACT.form.supportEmail).toBe(LP_SUPPORT_EMAIL)
    expect(LP_CONTACT.form.afterSubmitNote).toContain(LP_SUPPORT_EMAIL)
    expect(JSON.stringify(LP_CONTACT)).not.toContain(['support', 'catetind.com'].join('@'))
  })

  it('nomor WhatsApp memakai format internasional di href', () => {
    expect(LP_WHATSAPP.display).toBe('0817-7577-7778')
    expect(LP_WHATSAPP.e164).toBe('6281775777778')
    expect(LP_WHATSAPP.href).toBe('https://wa.me/6281775777778')
    expect(LP_WHATSAPP.href).not.toContain('wa.me/0817')
    expect(LP_WHATSAPP.prefill).toContain('Minca')
  })

  it('tiga kartu bantuan: WhatsApp, email, pusat bantuan', () => {
    expect(LP_CONTACT.helpCards.map((card) => card.icon)).toEqual([
      'whatsapp',
      'mail',
      'help',
    ])
    const hrefs = LP_CONTACT.helpCards.map((card) => card.href)
    expect(hrefs[0].startsWith(LP_WHATSAPP.href)).toBe(true)
    expect(hrefs[1]).toBe(`mailto:${LP_SUPPORT_EMAIL}`)
    expect(hrefs[2]).toBe('/help')
  })

  it('buildContactWhatsApp membawa nama, kontak, dan pertanyaan', () => {
    const href = buildContactWhatsApp({
      name: 'Rina',
      contact: '08123456789',
      question: 'Aman gak?',
    })
    expect(href.startsWith(`${LP_WHATSAPP.href}?text=`)).toBe(true)
    for (const value of ['Rina', '08123456789', 'Aman gak?']) {
      expect(href).toContain(encodeURIComponent(value))
    }
    expect(href).not.toContain(' ')
  })

  it('buildContactMailto membawa semua nilai ke halo@catetind.com', () => {
    const href = buildContactMailto({
      name: 'Rina',
      contact: '08123456789',
      question: 'Aman gak?',
    })
    expect(href.startsWith(`mailto:${LP_SUPPORT_EMAIL}?subject=`)).toBe(true)
    for (const value of ['Rina', '08123456789', 'Aman gak?']) {
      expect(href).toContain(encodeURIComponent(value))
    }
    expect(href).not.toContain(' ')
  })
})

describe('LP_HERO — social proof marquee', () => {
  it('lima avatar (duplikasi 2× dilakukan di komponen) + aria', () => {
    expect(LP_HERO.avatars).toHaveLength(5)
    expect(new Set(LP_HERO.avatars).size).toBe(5)
    expect(LP_HERO.socialProof).toBe('Join 2.000+ lainnya')
    expect(LP_HERO.avatarsAria.trim().length).toBeGreaterThan(4)
  })
})

describe('lpHref — anchor dari halaman lain', () => {
  it('hanya menambahkan basePath untuk tautan hash', () => {
    expect(lpHref('#mission', '/')).toBe('/#mission')
    expect(lpHref('#card-3', '/')).toBe('/#card-3')
    expect(lpHref('/login', '/')).toBe('/login')
    expect(lpHref('#mission')).toBe('#mission')
  })

  it('footer Kontak menuju /contact + WhatsApp/email resmi', () => {
    const company = LP_FOOTER.columns.find((column) => column.title === 'Perusahaan')
    expect(company?.links.find((link) => link.label === 'Kontak')?.href).toBe('/contact')
    expect(company?.links.some((link) => link.href === LP_WHATSAPP.href)).toBe(true)
    expect(company?.links.some((link) => link.href === `mailto:${LP_SUPPORT_EMAIL}`)).toBe(true)
  })

  it('footer Fitur memakai anchor stabil, bukan id kartu yang sticky', () => {
    const isi = LP_FOOTER.columns.find((column) => column.title === 'Isi')
    expect(isi?.links.map((link) => link.href)).toEqual(['#hero', '#fitur', '#pricing', '#faq'])
  })

  it('footer Legal menuju halaman legal yang benar-benar ada', () => {
    const legal = LP_FOOTER.columns.find((column) => column.title === 'Legal')
    expect(legal?.links.map((link) => link.href)).toEqual(['/terms', '/privacy', '/privacy'])
  })
})

describe('LP_* — tidak ada sisa copy template Inggris / nama Makro', () => {
  const serialized = JSON.stringify({
    mission: LP_MISSION,
    pricing: LP_PRICING,
    faq: LP_FAQ,
    contact: LP_CONTACT,
  })

  const forbidden = [
    'Makro',
    'Track your company progress',
    "Know what you've already",
    'Understand which accounts',
    'No more',
    'Try free',
    'Lifetime Basic',
    'Lifetime PRO',
    'Lifetime VIP',
    'Khusus Pasangan',
    /* klaim template kontak live yang tidak bisa dibuktikan repo */
    '100% Data Privat',
    'Zero Auto-Debit',
    /* label kategori template Makro */
    'Forecasting',
    'Setup & integrations',
    'Security and privacy',
    'General',
    /* sisa janji model lama yang tidak boleh muncul lagi */
    ['support', 'catetind.com'].join('@'),
    'belum tersedia di checkout',
    'Mode langganan belum tersedia',
  ]

  it.each(forbidden)('tidak mengandung "%s"', (phrase) => {
    expect(serialized).not.toContain(phrase)
  })
})
