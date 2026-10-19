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
  LANDING_DEFAULT_PERIOD,
  LANDING_SECTION_MARKERS,
  LIVE_FEED_SEED,
  LIVE_FEED_VISIBLE,
  LP_CONTACT,
  LP_FAQ,
  LP_FOOTER,
  LP_HERO,
  LP_LIVE_SUBSCRIBERS,
  LP_MISSION,
  LP_NAV,
  LP_PRICING,
  LP_PURCHASE_NOTIF,
  LP_SUPPORT_EMAIL,
  LP_WHATSAPP,
  buildContactMailto,
  buildContactWhatsApp,
  formatIDR,
  liveFeedFromPurchases,
  lpHref,
  lpPlanPrice,
  purchaseNotificationsFromPurchases,
  randomPurchasePackageName,
  relativeFeedTime,
  seededPurchaseNotifications,
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
  it('default mode = lifetime dan hanya lifetime yang dijual', () => {
    expect(LP_PRICING.defaultMode).toBe('lifetime')
    expect(LP_PRICING.modes.map((entry) => entry.id)).toEqual(['lifetime'])
    expect(LP_PRICING.savingsLabel).toBe('Paling hemat')
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

  it('CTA kartu membawa plan + period=lifetime yang dibaca halaman checkout', () => {
    for (const tier of LP_PRICING.tiers) {
      expect(LP_PRICING.checkoutHref(tier.id, 'lifetime')).toBe(
        `/checkout?period=lifetime&plan=${tier.id}`,
      )
    }
  })

  it('badge & catatan menjelaskan sekali bayar tanpa tagihan bulanan', () => {
    expect(LP_PRICING.badges.lifetime).toContain('selamanya')
    expect(LP_PRICING.note.toLowerCase()).toContain('tanpa tagihan bulanan')
    expect(JSON.stringify(LP_PRICING)).not.toContain('belum tersedia di checkout')
  })
})

describe('LP_PRICING — satuan & badge periode', () => {
  it('mode lifetime punya satuan yang tampil di samping nominal', () => {
    expect(LP_PRICING.priceUnits.lifetime).toContain('selamanya')
  })

  it('badge status singkat menegaskan sekali bayar', () => {
    expect(LP_PRICING.modeBadge.lifetime).toBe('Sekali Bayar')
  })
})

describe('LP_PRICING — copy & struktur kartu versi baru', () => {
  it('tidak ada janji "Garansi 30 hari" di section harga', () => {
    expect(JSON.stringify(LP_PRICING)).not.toMatch(/garansi 30 hari/i)
    expect('cardNote' in LP_PRICING).toBe(false)
  })

  it('tiga kartu: Catet Aja, Waras (hero), Sultan', () => {
    expect(LP_PRICING.tiers.map((tier) => tier.id)).toEqual(['catet-aja', 'waras', 'sultan'])
    expect(LP_PRICING.tiers.filter((tier) => tier.recommended)).toHaveLength(1)
    expect(LP_PRICING.tiers[1].recommended).toBe(true)
    expect(LP_PRICING.tiers[1].badge).toContain('94% User')
  })

  it('Sultan tidak menduplikasi Joint Wallet yang sudah ada di Waras', () => {
    const sultan = LP_PRICING.tiers.find((tier) => tier.id === 'sultan')
    expect(sultan?.features.some((feature) => /joint wallet/i.test(feature.label))).toBe(false)
    const waras = LP_PRICING.tiers.find((tier) => tier.id === 'waras')
    expect(waras?.features.some((feature) => /joint wallet/i.test(feature.label))).toBe(true)
  })

  it('baris trust menyebut Midtrans dan tanpa akses m-Banking', () => {
    expect(LP_PRICING.trustNote).toContain('Midtrans')
    expect(LP_PRICING.trustNote).toMatch(/m-Banking/i)
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

  it('setiap kartu punya copy dan anotasi yang tidak kosong', () => {
    for (const card of LP_MISSION.cards) {
      expect(card.title.trim().length).toBeGreaterThan(8)
      expect(card.body.trim().length).toBeGreaterThan(8)
      expect(card.caption.trim().length).toBeGreaterThan(8)
      expect(card.annotation.trim().length).toBeGreaterThan(3)
      expect('mobile' in card).toBe(false)
    }
  })

  it('semua gambar mission ada di public dan punya dimensi asli', () => {
    const sources = LP_MISSION.cards.map((card) => card.image)
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
    }
  })

  it('gambar hero yang dipakai halaman preview juga ada', () => {
    const sources = [LP_HERO.boardImage, LP_HERO.phoneImage]
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
    expect(hrefs[2]).toBe('/bantuan')
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

describe('LP_HERO — satu janji, CTA jujur, tanpa bukti sosial karangan', () => {
  it('headline menyapa yang males nyatet tanpa titik & tanpa latar highlight', () => {
    const headline = `${LP_HERO.headlineBefore}${LP_HERO.headlineEmphasis}${LP_HERO.headlineAfter}`
    expect(headline).toBe('Aplikasi keuangan buat lo yang males nyatet')
    expect(headline.endsWith('.')).toBe(false)
    expect(LP_HERO.headlineEmphasis).toBe('males')
    expect(LP_HERO.subheadline).toBe(
      'Cuma butuh 4 detik. Tinggal kirim voice note atau foto struk',
    )
  })

  it('CTA hero memakai label "Cobain" dan paket + periode default section harga', () => {
    expect(LP_HERO.ctaLabel).toBe('Cobain')
    expect(LP_HERO.ctaHref).toBe(
      `/checkout?period=${LP_PRICING.defaultMode}&plan=${LP_PRICING.tiers[1].id}`,
    )
    expect(LP_PRICING.defaultMode).toBe(LANDING_DEFAULT_PERIOD)
    expect(LP_NAV.ctaLabel).toBe('Pilih Paket')
  })

  it('tidak ada angka komunitas atau avatar stok yang tidak bisa dibuktikan', () => {
    expect('socialProof' in LP_HERO).toBe(false)
    expect('avatars' in LP_HERO).toBe(false)
  })
})

describe('lpHref — anchor dari halaman lain', () => {
  it('hanya menambahkan basePath untuk tautan hash', () => {
    expect(lpHref('#mission', '/')).toBe('/#mission')
    expect(lpHref('#card-3', '/')).toBe('/#card-3')
    expect(lpHref('/login', '/')).toBe('/login')
    expect(lpHref('#mission')).toBe('#mission')
  })

  it('footer Navigasi memakai anchor yang benar-benar ada', () => {
    const nav = LP_FOOTER.columns.find((column) => column.title === 'Navigasi')
    expect(nav?.links.map((link) => link.href)).toEqual([
      '#top',
      '#fitur',
      '#harga',
      '#faq',
      '/changelog',
    ])
  })

  it('footer Terhubung memuat Instagram, WhatsApp, dan email resmi', () => {
    const connected = LP_FOOTER.columns.find((column) => column.title === 'Terhubung')
    expect(connected?.links.some((link) => link.href === LP_WHATSAPP.href)).toBe(true)
    expect(connected?.links.some((link) => link.href === `mailto:${LP_SUPPORT_EMAIL}`)).toBe(true)
    expect(connected?.links.some((link) => link.href === 'https://instagram.com/catetind')).toBe(
      true,
    )
  })

  it('footer Legal menuju halaman legal yang benar-benar ada', () => {
    const legal = LP_FOOTER.columns.find((column) => column.title === 'Legal')

    expect(legal?.links.map((link) => link.href)).toEqual(['/terms', '/privacy', '/security'])
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

  it('copy landing bebas em-dash, "lu", dan "kamu"', () => {
    const copy = JSON.stringify({
      hero: LP_HERO,
      nav: LP_NAV,
      footer: LP_FOOTER,
      mission: LP_MISSION,
      pricing: LP_PRICING,
      faq: LP_FAQ,
      contact: LP_CONTACT,
    })
    expect(copy).not.toContain('—')
    expect(copy).not.toMatch(/\blu\b/i)
    expect(copy).not.toMatch(/\bkamu\b/i)
  })
})

/* ── PENANDA ANTAR-SECTION ──────────────────────────────────────────────────
   Nomor harus urut dan tidak boleh ada yang dobel; label dipakai garis pemisah
   di halaman, jadi cukup pendek dan tidak mengandung em-dash. */
describe('LANDING_SECTION_MARKERS', () => {
  it('memberi nomor urut dan label pendek untuk tiap batas section', () => {
    expect(Object.values(LANDING_SECTION_MARKERS)).toEqual([
      { index: '01', label: 'Kalkulator' },
      { index: '02', label: 'Misi' },
      { index: '03', label: 'Harga' },
      { index: '04', label: 'FAQ' },
    ])
  })
})

/* ── PENGHITUNG PENGGUNA LIVE & NOTIFIKASI PEMBELIAN ─────────────────────────
   Angka & nama di sini harus bisa ditelusuri:
     · `startCount` = seed migrasi (234), bukan angka bebas di JSX;
     · nama paket di notifikasi dibaca dari `PLANS`;
     · pembelian nyata dipetakan apa adanya, nominal asing tidak dipaksa masuk
       tier yang tidak cocok. */
describe('LP_LIVE_SUBSCRIBERS', () => {
  it('titik awal sama dengan seed migrasi (234)', () => {
    expect(LP_LIVE_SUBSCRIBERS.startCount).toBe(234)
  })

  it('avatar memakai lima file lokal AVA 1–AVA 5, bukan foto stok', () => {
    const sources = LP_LIVE_SUBSCRIBERS.avatarPool.map((avatar) => avatar.src)
    expect(sources).toEqual([
      '/AVA 1.png',
      '/AVA 2.png',
      '/AVA 3.png',
      '/AVA 4.png',
      '/AVA 5.png',
    ])

    for (const avatar of LP_LIVE_SUBSCRIBERS.avatarPool) {
      const file = path.join(
        process.cwd(),
        'public',
        decodeURIComponent(avatar.src.replace(/^\//, '')),
      )
      expect(fs.existsSync(file), `${avatar.src} tidak ada`).toBe(true)
      /* bingkai avatar kini outline gelap tipis di komponen — data tidak
         membawa warna halo lagi */
      expect('tone' in avatar).toBe(false)
    }
  })

  it('label publik memakai 1.000+, bukan seed database 234', () => {
    expect(LP_LIVE_SUBSCRIBERS.startCount).toBe(234)
    expect(LP_LIVE_SUBSCRIBERS.displayCount).toBe(1_000)
    expect(LP_LIVE_SUBSCRIBERS.displaySuffix).toBe('+')
  })
})

describe('notifikasi pembelian', () => {
  it('daftar contoh memakai nama paket kanon dari PLANS', () => {
    const canonical = new Set(PLANS.map((plan) => plan.name))
    const seeded = seededPurchaseNotifications()

    expect(seeded).toHaveLength(LP_PURCHASE_NOTIF.fallbackBuyers.length)
    for (const item of seeded) {
      expect(canonical.has(item.packageName)).toBe(true)
      expect(item.handle.startsWith('@')).toBe(true)
      expect(item.initial).toHaveLength(1)
      expect(item.city.trim().length).toBeGreaterThan(0)
      expect(item.tone.startsWith('bg-')).toBe(true)
    }
  })

  it('pool 600 unik: tidak ada handle ganda & kota beragam', () => {
    const buyers = LP_PURCHASE_NOTIF.fallbackBuyers
    const handles = buyers.map((buyer) => buyer.handle)
    const cities = new Set(buyers.map((buyer) => buyer.city))

    expect(handles.length).toBeGreaterThanOrEqual(500)
    expect(new Set(handles).size).toBe(handles.length)
    expect(cities.size).toBeGreaterThanOrEqual(30)
    for (const buyer of buyers) {
      expect(buyer.handle).toMatch(/^@[a-z0-9._]+$/)
      expect(buyer.city.trim().length).toBeGreaterThan(0)
      expect(buyer.tone.startsWith('bg-')).toBe(true)
    }
  })

  it('36 seed asli tetap di awal pool', () => {
    expect(LP_PURCHASE_NOTIF.fallbackBuyers[0]).toEqual({
      handle: '@rinajkt',
      city: 'Jakarta',
      tone: 'bg-mint',
    })
    expect(
      LP_PURCHASE_NOTIF.fallbackBuyers.some((buyer) => buyer.handle === '@zakif'),
    ).toBe(true)
  })

  it('tone dibagi rata (selisih maksimal 1)', () => {
    const counts = new Map<string, number>()
    for (const buyer of LP_PURCHASE_NOTIF.fallbackBuyers) {
      counts.set(buyer.tone, (counts.get(buyer.tone) ?? 0) + 1)
    }
    const values = [...counts.values()]
    expect(values).toHaveLength(4)
    expect(Math.max(...values) - Math.min(...values)).toBeLessThanOrEqual(1)
  })

  it('paket notifikasi hanya Waras 60% / Sultan 40% (tanpa Catet Aja)', () => {
    expect(randomPurchasePackageName(() => 0)).toBe('Paket Waras')
    expect(randomPurchasePackageName(() => 0.599)).toBe('Paket Waras')
    expect(randomPurchasePackageName(() => 0.6)).toBe('Paket Sultan')
    expect(randomPurchasePackageName(() => 0.999)).toBe('Paket Sultan')

    for (const roll of [0, 0.25, 0.59, 0.6, 0.8, 0.99]) {
      expect(randomPurchasePackageName(() => roll)).not.toBe('Paket Catet Aja')
    }
  })

  it('seed 600 memakai Waras 60% / Sultan 40%, tanpa Catet Aja', () => {
    const seeded = seededPurchaseNotifications()
    const waras = seeded.filter((item) => item.packageName === 'Paket Waras').length
    const sultan = seeded.filter((item) => item.packageName === 'Paket Sultan').length

    expect(waras).toBe(360)
    expect(sultan).toBe(240)
    expect(seeded.some((item) => item.packageName === 'Paket Catet Aja')).toBe(false)
  })

  it('pembelian Catet Aja tidak pernah masuk notifikasi', () => {
    const items = purchaseNotificationsFromPurchases(
      [{ name: 'Sinta', price: 109000, at: '2026-10-19T11:58:00Z' }],
      Date.parse('2026-10-19T12:00:00Z'),
    )
    expect(items).toEqual([])
  })

  it('pembelian nyata: harga tier cocok → nama paketnya; harga asing tidak dikarang', () => {
    const now = Date.parse('2026-10-19T12:00:00Z')
    const items = purchaseNotificationsFromPurchases(
      [
        { name: 'Rina', price: 129000, at: '2026-10-19T11:58:00Z' },
        { name: 'Budi', price: 555000, at: '2026-10-19T11:50:00Z' },
      ],
      now,
    )

    expect(items[0]).toMatchObject({
      handle: '@rina',
      packageName: 'Paket Waras',
      time: '2 menit lalu',
    })
    expect(items[1]).toMatchObject({
      handle: '@budi',
      packageName: 'paket CatetInd',
    })
  })

  it('nama kosong tidak menjadi handle palsu', () => {
    const [item] = purchaseNotificationsFromPurchases([{ name: '', price: 0, at: '' }], Date.now())
    expect(item.handle).toBe('@seseorang')
    expect(item.packageName).toBe('paket CatetInd')
    expect(item.time).toBe('baru aja')
  })
})
