/**
 * scripts/qa/visual-audit.mjs — BAGIAN 1 (visual, zero-fluff, redesign, publik).
 *
 * Bukti yang dicetak:
 *   1. Sapuan halaman (HP 390×844 & Desktop 1280×800): halaman terbuka, 0 teks
 *      terlarang di DOM, 0 SVG hiasan di dalam judul kartu / kondisi kosong,
 *      0 gulir horizontal. Corak batik pada kartu dompet/hero DIKECUALIKAN
 *      secara resmi lewat penanda `data-catetind-batik`, dan justru diperiksa:
 *      setiap `[data-catetind-kartu-dompet]` harus punya lapisan batik serta
 *      tidak boleh mencetak nomor rekening masking.
 *   2. Enam komponen redesign: Jatah Hari Ini, Tagihan compact, Kalender (kartu
 *      tanggal), Pusat Bantuan (cari/topik/akordeon), Install (tab + 3 langkah),
 *      Undangan Dompet Bersama.
 *   3. Halaman publik: Kalkulator Uang Gaib, saklar 30 Hari/Selamanya di 3 kartu,
 *      tautan checkout (plan+period), Kebijakan Privasi & Syarat (aturan kuota AI).
 *
 * Pakai: node scripts/qa/visual-audit.mjs [--base=http://localhost:3000]
 */
import fs from 'node:fs'
import path from 'node:path'
import { chromium } from 'playwright-core'
import {
  COOKIE_NAME,
  chromiumPath,
  createUser,
  deleteUserByEmail,
  forbiddenPhrases,
  grantTier,
  log,
  passwordSession,
  record,
  rest,
  results,
  sessionCookieValue,
} from './harness.mjs'

const BASE = (process.argv.find((a) => a.startsWith('--base=')) ?? '--base=http://localhost:3000').slice(7)
const SHOTS = path.resolve('qa-shots')
fs.mkdirSync(SHOTS, { recursive: true })
const FORBIDDEN = await forbiddenPhrases()

const stamp = Date.now().toString(36)
const USER = { email: `qa.visual.${stamp}@catetind.test`, password: `Qa!${stamp}Vs1`, name: 'Uji Visual' }
const auth = await createUser(USER)
await grantTier(auth.id, 'waras')
const session = await passwordSession(USER)

const VIEWPORTS = [
  { label: 'HP', width: 390, height: 844 },
  { label: 'Desktop', width: 1280, height: 800 },
]
const PAGES = ['/app', '/wallet', '/bills', '/calendar', '/budget', '/history', '/wealth', '/help', '/install']

const browser = await chromium.launch({ executablePath: chromiumPath(), headless: true })

/** onboarding nyata: akun uji harus melewati gerbang ini sebelum halaman app bisa dibuka */
async function completeOnboarding() {
  const context = await contextFor({ width: 390, height: 844 })
  const page = await context.newPage()
  await page.goto(`${BASE}/app/onboarding`, { waitUntil: 'domcontentloaded' })
  await page.waitForTimeout(800)
  await page.getByRole('group', { name: 'Situasi hidup' }).getByRole('button').first().click()
  await page.getByRole('button', { name: /^Lanjut/ }).click()
  await page.locator('button[aria-pressed]').first().click()
  await page.getByLabel(/^Saldo /).fill('1500000')
  await page.getByRole('button', { name: /^Lanjut/ }).click()
  await page.locator('input[aria-label="Nominal transaksi pertama"]:visible').first().fill('25000')
  await page.getByRole('button', { name: /Catat Pertama/ }).click()
  await page.waitForTimeout(1600)
  await page.getByRole('button', { name: /Masuk ke Dashboard/ }).click()
  await page.waitForURL('**/app', { timeout: 30_000 })
  const done = new URL(page.url()).pathname === '/app'
  record('persiapan', 'onboarding akun uji selesai', done, page.url())
  await context.close()
}
await completeOnboarding()

/** prasyarat halaman Tagihan: dua baris nyata di server (bukan angka contoh) */
async function seedBills() {
  const res = await rest(session.access_token, 'bills', {
    method: 'POST',
    headers: { Prefer: 'return=representation' },
    body: JSON.stringify([
      { name: 'Listrik Kos', amount: 300_000, due_day: 31, category: 'Tagihan', active: true },
      { name: 'Cicilan HP', amount: 500_000, due_day: 25, category: 'Tagihan', active: true },
    ]),
  })
  record('persiapan', 'dua tagihan uji tersimpan di server', res.ok, `HTTP ${res.status}`)
}
await seedBills()

/** prasyarat kartu Jatah Hari Ini: gaji & tanggal gajian nyata di server */
async function seedMoney() {
  const res = await rest(session.access_token, 'user_settings?on_conflict=user_id', {
    method: 'POST',
    headers: { Prefer: 'resolution=merge-duplicates,return=representation' },
    body: JSON.stringify({
      money: {
        version: 1,
        monthlyIncome: 8_000_000,
        totalInstallments: 0,
        paydayDate: 25,
        dashboardPeriod: 'cycle',
        enabledContexts: ['pribadi'],
        updatedAt: Date.now() + 60_000,
        purged: false,
      },
      updated_at: new Date().toISOString(),
    }),
  })
  record('persiapan', 'gaji & tanggal gajian uji tersimpan di server', res.ok, `HTTP ${res.status}`)
}
await seedMoney()

async function contextFor(viewport) {
  const context = await browser.newContext({ viewport, locale: 'id-ID', timezoneId: 'Asia/Jakarta' })
  await context.addCookies([
    { name: COOKIE_NAME, value: sessionCookieValue(session), url: BASE, httpOnly: false, sameSite: 'Lax' },
  ])
  return context
}

/** analisis DOM: teks terlarang, SVG hiasan, gulir horizontal */
async function analyze(page) {
  return page.evaluate((forbidden) => {
    const text = document.body.innerText || ''
    const hits = forbidden.filter((phrase) => text.includes(phrase))

    const decorative = Array.from(
      document.querySelectorAll(
        'h1 svg, h2 svg, h3 svg, h4 svg, [data-catetind-empty] svg, [data-catetind-kartu-judul] svg, [data-catetind-dekor]',
      ),
    )
      /* PENGECUALIAN RESMI — CORAK BATIK. Komponen kartu dompet/hero menandai
         SVG motifnya dengan `data-catetind-batik` (batik-cloth.tsx,
         wallet-card-face.tsx, wallet-card-stack.tsx, wealth-net-worth-bar.tsx).
         Motif itu dekorasi yang SENGAJA (keputusan produk: "ada corak batiknya,
         bener-bener batik yang keliatan"), bukan hiasan liar di judul/empty
         state — jadi tidak dihitung sebagai pelanggaran. */
      .filter((svg) => !svg.closest('[data-catetind-batik]') && !svg.hasAttribute('data-catetind-batik'))
      .map((svg) => ({
        tag: svg.tagName.toLowerCase(),
        near: (svg.closest('h1,h2,h3,h4,[data-catetind-empty],[data-catetind-kartu-judul]')?.textContent ?? '')
          .trim()
          .slice(0, 60),
      }))

    /* Kartu dompet: setiap kartu WAJIB punya lapisan corak batik, dan
       permukaannya tidak boleh mencetak kode/nomor rekening masking. */
    const walletCards = Array.from(document.querySelectorAll('[data-catetind-kartu-dompet]'))
    const cardsWithBatik = walletCards.filter((card) => card.querySelector('[data-catetind-batik]'))
    /* Nomor rekening masking SELALU berbentuk `•••• 1234` (empat titik + 4
       angka, lihat `maskedAccountNumber`). Nominal tersensor memakai 7 titik
       tanpa angka, jadi sengaja TIDAK ikut tertangkap pola ini. */
    const cardsWithMasked = walletCards.filter((card) =>
      /(?<!\u2022)\u2022{4}\s+\d{3,4}(?!\d)/.test(card.innerText || ''),
    )
    const maskedSample = (cardsWithMasked[0]?.innerText || '').replace(/\s+/g, ' ').trim().slice(0, 160)

    return {
      hits,
      decorative,
      walletCards: walletCards.length,
      cardsWithBatik: cardsWithBatik.length,
      cardsWithMasked: cardsWithMasked.length,
      maskedSample,
      overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
    }
  }, FORBIDDEN)
}

async function open(page, route) {
  const res = await page.goto(`${BASE}${route}`, { waitUntil: 'domcontentloaded' })
  await page.waitForTimeout(900)
  return res
}

/* ── 1. SAPUAN HALAMAN (dua viewport) ───────────────────────────────────────── */
for (const viewport of VIEWPORTS) {
  const context = await contextFor({ width: viewport.width, height: viewport.height })
  const page = await context.newPage()
  const consoleErrors = []
  const failedRequests = []
  page.on('response', (response) => {
    const url = response.url()
    /* `/ _vercel/insights/script.js` hanya ada di hosting Vercel; di server lokal
       404 dan tidak ada hubungannya dengan aplikasi. */
    if (response.status() >= 400 && !url.includes('/_vercel/')) failedRequests.push(`${response.status()} ${url}`)
  })
  page.on('console', (msg) => {
    /* 404 `_vercel/insights` hanya ada di hosting Vercel; kegagalan nyata sudah
       dicatat lewat `failedRequests` di bawah. */
    if (msg.type() === 'error' && !/Failed to load resource.*404/i.test(msg.text())) {
      consoleErrors.push(msg.text())
    }
  })

  for (const route of PAGES) {
    const key = `${viewport.label}${route}`
    let status = 0
    try {
      const res = await open(page, route)
      status = res?.status() ?? 0
    } catch (error) {
      record('sapuan', `${key} terbuka`, false, String(error).slice(0, 120))
      continue
    }
    const pathname = new URL(page.url()).pathname
    record('sapuan', `${key} terbuka`, status < 400 && pathname === route, `status ${status} → ${pathname}`)

    const dom = await analyze(page)
    record('sapuan', `${key} 0 teks terlarang`, dom.hits.length === 0, dom.hits.slice(0, 2).join(' | '))
    record(
      'sapuan',
      `${key} 0 SVG hiasan di judul/empty state`,
      dom.decorative.length === 0,
      dom.decorative.slice(0, 2).map((d) => `${d.tag} «${d.near}»`).join(' | '),
    )
    record('sapuan', `${key} tanpa gulir horizontal`, dom.overflow <= 2, `overflow ${dom.overflow}px`)

    /* Corak batik wajib tampil di SEMUA kartu dompet (kartu ke-1, ke-2, …;
       bank/e-wallet/tunai) dan permukaannya bersih dari kode/nomor masking. */
    if (route === '/app' || route === '/wallet') {
      record(
        'batik',
        `${key} semua kartu dompet bercorak batik`,
        dom.walletCards === 0 || dom.cardsWithBatik === dom.walletCards,
        `${dom.cardsWithBatik}/${dom.walletCards} kartu`,
      )
      record(
        'batik',
        `${key} kartu dompet tanpa nomor/kode`,
        dom.cardsWithMasked === 0,
        dom.cardsWithMasked ? `${dom.cardsWithMasked} kartu: «${dom.maskedSample}»` : 'bersih',
      )
    }

    await page.screenshot({ path: path.join(SHOTS, `visual-${viewport.width}${route.replace(/\//g, '_')}.png`) })
  }
  record(
    'sapuan',
    `${viewport.label} tanpa permintaan gagal`,
    failedRequests.length === 0,
    failedRequests.slice(0, 3).join(' | '),
  )
  record('sapuan', `${viewport.label} tanpa error konsol`, consoleErrors.length === 0, consoleErrors.slice(0, 2).join(' | '))
  await context.close()
}

/* ── 2. ENAM KOMPONEN REDESIGN (HP) ────────────────────────────────────────── */
const mobile = await contextFor({ width: 390, height: 844 })
const page = await mobile.newPage()

/* 2d. DETAIL DOMPET (HP) — kartu hero memakai resep yang sama: bercorak batik
   dan bersih dari nomor rekening masking. */
await open(page, '/wallet')
const firstWalletHref = await page
  .locator('a[href^="/wallet/"]')
  .first()
  .getAttribute('href')
  .catch(() => null)
if (firstWalletHref) {
  await open(page, firstWalletHref)
  const detail = await page.evaluate(() => {
    const card = document.querySelector('[data-catetind-kartu-dompet]')
    return {
      hasCard: Boolean(card),
      hasBatik: Boolean(card?.querySelector('[data-catetind-batik]')),
      masked: /(?<!\u2022)\u2022{4}\s+\d{3,4}(?!\d)/.test(card?.innerText || ''),
    }
  })
  record(
    'batik',
    'detail dompet: kartu hero bercorak batik',
    detail.hasCard && detail.hasBatik,
    detail.hasCard ? (detail.hasBatik ? 'ada' : 'tidak ada lapisan batik') : 'kartu tidak ditemukan',
  )
  record(
    'batik',
    'detail dompet: kartu hero tanpa nomor/kode',
    detail.hasCard && !detail.masked,
    detail.masked ? 'mencetak nomor' : 'bersih',
  )
}


/* 2a. Jatah Hari Ini */
await open(page, '/app')
const jatah = page.locator('[data-catetind-jatah="hari-ini"]').first()
const jatahVisible = await jatah.isVisible().catch(() => false)
record('redesign', 'kartu Jatah Hari Ini tampil', jatahVisible, jatahVisible ? '' : 'kartu tidak ditemukan')

if (jatahVisible) {
  const shape = await jatah.evaluate((el) => {
    const numbers = Array.from(el.querySelectorAll('p,span,div'))
      .filter((node) => /\d/.test(node.textContent ?? ''))
      .filter((node) => !node.closest('[aria-hidden="true"]') && !node.closest('.sr-only'))
      .map((node) => {
        const style = getComputedStyle(node)
        return {
          size: parseFloat(style.fontSize),
          visible: style.visibility !== 'hidden' && style.display !== 'none' && node.getClientRects().length > 0,
          text: (node.textContent ?? '').trim(),
        }
      })
      .filter((row) => row.visible && row.size >= 30 && row.text.length > 0)
    return {
      /* Nilai unik dari angka besar (lapisan masked memakai titik, bukan angka:
         tidak dihitung sebagai angka kedua). */
      bigNumbers: new Set(
        numbers.flatMap((row) => (row.text.match(/\d[\d.,]*/g) ?? []).map((v) => v.replace(/[.,]/g, ''))),
      ).size,
      biggest: numbers[0]?.text ?? '',
      progressbars: el.querySelectorAll('[role="progressbar"]').length,
      text: (el.innerText || '').replace(/\s+/g, ' ').trim(),
    }
  })
  record('redesign', 'Jatah: tepat 1 angka besar', shape.bigNumbers === 1, `${shape.bigNumbers} · «${shape.biggest}»`)
  record('redesign', 'Jatah: tepat 1 bilah progres', shape.progressbars === 1, `${shape.progressbars} progressbar`)
  record('redesign', 'Jatah: info ringkas (≤ 20 kata)', shape.text.split(/\s+/).filter(Boolean).length <= 20, shape.text.slice(0, 90))
}

/* 2b. Tagihan compact */
await open(page, '/bills')
const ringkasan = page.locator('[data-catetind-ringkasan="tagihan"]').first()
const ringkasanBox = await ringkasan.boundingBox().catch(() => null)
const hasBills = Boolean(ringkasanBox)
record(
  'redesign',
  'Tagihan: kartu ringkasan tipis tampil',
  hasBills,
  hasBills ? `${Math.round(ringkasanBox.height)}px` : 'belum ada tagihan di akun uji (empty state)',
)
record(
  'redesign',
  'Tagihan: ringkasan tidak mubazir (≤ 220px)',
  !hasBills || ringkasanBox.height <= 220,
  hasBills ? `${Math.round(ringkasanBox.height)}px` : 'dilewati: empty state',
)

const pills = page.locator('[data-catetind-pil]')
const pillCount = await pills.count()
const pillLabels = pillCount ? await pills.allInnerTexts() : []
const pillJoined = pillLabels.join('|')
record(
  'redesign',
  'Tagihan: pil Semua/Belum Bayar/Lunas',
  !hasBills || (pillCount >= 3 && pillJoined.includes('Semua') && pillJoined.includes('Belum Bayar') && pillJoined.includes('Lunas')),
  pillLabels.length ? pillLabels.join(' · ') : 'dilewati: empty state',
)
const pillTops = await pills.evaluateAll((nodes) => nodes.map((node) => Math.round(node.getBoundingClientRect().top)))
record(
  'redesign',
  'Tagihan: pil filter sejajar satu baris',
  !hasBills || (pillTops.length >= 3 && new Set(pillTops).size === 1),
  pillTops.length ? pillTops.join(',') : 'dilewati: empty state',
)

const rowMetrics = await page.evaluate(() => {
  const rows = Array.from(document.querySelectorAll('main li')).filter(
    (node) => node.getBoundingClientRect().height > 40,
  )
  const rects = rows.map((node) => node.getBoundingClientRect())
  const gaps = rects.slice(1, 4).map((rect, index) => Math.round(rect.top - rects[index].bottom))
  return { count: rects.length, heights: rects.slice(0, 3).map((rect) => Math.round(rect.height)), gaps }
})
record(
  'redesign',
  'Tagihan: baris rapat (tinggi ≤ 140px)',
  rowMetrics.count === 0 || rowMetrics.heights.every((h) => h <= 140),
  JSON.stringify(rowMetrics),
)
record(
  'redesign',
  'Tagihan: tanpa celah mubazir (≤ 20px)',
  rowMetrics.gaps.every((gap) => gap <= 20),
  JSON.stringify(rowMetrics.gaps),
)

/* 2c. Kalender: kartu detail tanggal */
await open(page, '/calendar')
const dayCells = page.locator('main button[aria-label]')
const dayCount = await dayCells.count()
let dateCard = null
for (let i = 0; i < Math.min(dayCount, 40); i += 1) {
  const cell = dayCells.nth(i)
  const label = (await cell.evaluate((node) => node.getAttribute('aria-label')).catch(() => '')) ?? ''
  if (!/^\d{1,2}\b/.test(label.trim())) continue
  await cell.click({ timeout: 1500 }).catch(() => {})
  await page.waitForTimeout(400)
  const candidate = page.locator('[data-catetind-tanggal-detail]').first()
  if (await candidate.isVisible().catch(() => false)) {
    dateCard = candidate
    break
  }
}
record('redesign', 'Kalender: kartu detail tanggal terbuka', Boolean(dateCard), dateCard ? '' : 'tidak ada kartu detail')
if (dateCard) {
  const layout = await dateCard.evaluate((el) => {
    const children = Array.from(el.children).map((node) => node.getBoundingClientRect())
    let overlaps = 0
    for (let i = 1; i < children.length; i += 1) {
      if (children[i].top < children[i - 1].bottom - 1) overlaps += 1
    }
    const gaps = children.slice(1).map((rect, i) => Math.round(rect.top - children[i].bottom))
    return { overlaps, minGap: gaps.length ? Math.min(...gaps) : 0, height: Math.round(el.getBoundingClientRect().height) }
  })
  record('redesign', 'Kalender: tidak bertumpuk', layout.overlaps === 0, JSON.stringify(layout))
  record('redesign', 'Kalender: jarak antar bagian ≥ 4px', layout.minGap >= 4, `${layout.minGap}px`)
  const addNote = page.getByRole('button', { name: /Tambah Catatan di Tgl/i }).first()
  record('redesign', 'Kalender: tombol tambah catatan di tanggal', await addNote.isVisible().catch(() => false), '')
}

/* 2d. Pusat Bantuan: cari, topik, akordeon */
await open(page, '/help')
const helpInput = page.locator('main input').first()
const inputVisible = await helpInput.isVisible().catch(() => false)
record('redesign', 'Bantuan: kolom pencarian tampil', inputVisible, '')
if (inputVisible) {
  const before = (await page.locator('main').innerText()).length
  await helpInput.fill('dompet')
  await page.waitForTimeout(700)
  const afterText = await page.locator('main').innerText()
  record(
    'redesign',
    'Bantuan: pencarian menyaring daftar',
    afterText.toLowerCase().includes('dompet') && afterText.length !== before,
    `${before} → ${afterText.length} karakter`,
  )
  await helpInput.fill('')
  await page.waitForTimeout(400)
}
const topicChips = page.locator('[role="group"] button:visible')
const chipCount = await topicChips.count()
record('redesign', 'Bantuan: pil topik tersedia', chipCount > 0, `${chipCount} chip`)
if (chipCount > 0) {
  await topicChips.first().click()
  await page.waitForTimeout(500)
  record('redesign', 'Bantuan: klik topik mengubah konten', (await page.locator('main h2').count()) > 0, '')
}
const accordions = page.locator('button[aria-expanded]:visible')
const accCount = await accordions.count()
record('redesign', 'Bantuan: baris tanya-jawab lipat', accCount > 0, `${accCount} akordeon`)
if (accCount > 0) {
  const first = accordions.first()
  const stateBefore = await first.getAttribute('aria-expanded')
  await first.click()
  await page.waitForTimeout(400)
  const stateAfter = await first.getAttribute('aria-expanded')
  record('redesign', 'Bantuan: akordeon buka-tutup', stateBefore !== stateAfter, `${stateBefore} → ${stateAfter}`)
}

/* 2e. Install: dua tab + 3 langkah */
await open(page, '/install')
const tabs = page.getByRole('tab')
const tabCount = await tabs.count()
record('redesign', 'Install: pemilih tab Android & iPhone', tabCount === 2, `${tabCount} tab`)
if (tabCount === 2) {
  await tabs.nth(1).click()
  await page.waitForTimeout(300)
  const selected = await tabs.nth(1).getAttribute('aria-selected')
  record('redesign', 'Install: klik tab kedua berfungsi', selected === 'true', `aria-selected=${selected}`)
}
const stepNumbers = await page.evaluate(() => {
  const lane = document.querySelector('[data-catetind-langkah]')
  if (!lane) return 0
  const nodes = Array.from(lane.querySelectorAll('span'))
  return nodes.filter((node) => /^[123]$/.test((node.textContent ?? '').trim())).length
})
record('redesign', 'Install: tepat 3 langkah bernomor', stepNumbers === 3, `${stepNumbers} nomor`)

/* 2f. Undangan Dompet Bersama */
await open(page, '/joint')
/* jaring pengaman: kalau composer global sempat terbuka, tutup dulu */
await page.keyboard.press('Escape').catch(() => {})
await page.waitForTimeout(400)
const createBtn = page.locator('button:visible').filter({ hasText: 'Buat Dompet' }).first()
const startVisible = await createBtn.isVisible().catch(() => false)
record(
  'redesign',
  'Undangan: layar awal dompet bersama tampil',
  startVisible,
  startVisible ? '' : (await page.locator('main').innerText().catch(() => '')).slice(0, 100),
)
if (startVisible) {
  await createBtn.click()
  await page.waitForTimeout(700)
  const nameInput = page.getByPlaceholder(/Dompet Kita/i).first()
  const nameVisible = await nameInput.isVisible().catch(() => false)
  record('redesign', 'Undangan: form nama dompet terbuka', nameVisible, '')
  if (nameVisible) {
    await nameInput.fill('Kas Liburan')
    await page.getByRole('button', { name: /Buat Dompet & Ajak Pasangan/i }).click().catch(() => {})
    await page.waitForTimeout(2000)
  }
  const dialogs = page.locator('[role="dialog"]:visible')
  const dialogCount = await dialogs.count()
  let inviteText = ''
  for (let i = 0; i < dialogCount; i += 1) {
    const text = (await dialogs.nth(i).innerText().catch(() => '')) || ''
    if (/kode|undang|salin|bagikan|copy/i.test(text)) {
      inviteText = text
      break
    }
  }
  const codeMatch = inviteText.match(/\b[A-Z0-9]{6}\b/)
  record('redesign', 'Undangan: modal kode undangan terbuka', inviteText.length > 0, inviteText.slice(0, 80))
  if (inviteText) {
    record('redesign', 'Undangan: kode 6 karakter tegas', Boolean(codeMatch), codeMatch?.[0] ?? '')
    record('redesign', 'Undangan: tombol salin/bagikan ada', /salin|bagikan|copy/i.test(inviteText), '')
    record('redesign', 'Undangan: satu tombol aksi utama', (inviteText.match(/salin|bagikan|copy/gi) ?? []).length <= 3, '')
  }
}

/* ── 3. HALAMAN PUBLIK ─────────────────────────────────────────────────────── */
const publicPage = await mobile.newPage()

await publicPage.goto(`${BASE}/`, { waitUntil: 'domcontentloaded' })
await publicPage.waitForTimeout(1500)
const ranges = publicPage.locator('input[type="range"]')
const rangeCount = await ranges.count()
record('publik', 'Landing: Kalkulator Uang Gaib punya slider', rangeCount >= 2, `${rangeCount} slider`)
if (rangeCount >= 1) {
  for (const index of [0, 1]) {
    const slider = ranges.nth(index)
    if (!(await slider.isVisible().catch(() => false))) continue
    await slider.evaluate((node) => {
      const input = node
      const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')?.set
      setter?.call(input, input.max || '5000000')
      input.dispatchEvent(new Event('input', { bubbles: true }))
      input.dispatchEvent(new Event('change', { bubbles: true }))
    })
  }
  await publicPage.waitForTimeout(600)
  const landingText = await publicPage.locator('body').innerText()
  const bad = landingText.match(/NaN|undefined|Infinity/g) ?? []
  record('publik', 'Landing: hitungan bebas NaN/undefined', bad.length === 0, bad.slice(0, 3).join(','))
}

const cards = publicPage.locator('[data-catetind-paket]')
const cardCount = await cards.count()
record('publik', 'Landing: 3 kartu paket (Catet Aja/Waras/Sultan)', cardCount === 3, `${cardCount} kartu`)

const periods = publicPage.locator('[data-catetind-periode]')
const periodCount = await periods.count()
record('publik', 'Landing: saklar 30 Hari & Akses Selamanya', periodCount === 2, `${periodCount} tombol`)

async function hrefsForPeriod(period) {
  await publicPage.locator(`[data-catetind-periode="${period}"]`).click()
  await publicPage.waitForTimeout(400)
  return publicPage.$$eval('[data-catetind-paket] a[href*="/checkout"]', (nodes) =>
    nodes.map((node) => node.getAttribute('href') ?? ''),
  )
}

if (cardCount === 3 && periodCount === 2) {
  const monthly = await hrefsForPeriod('monthly')
  const lifetime = await hrefsForPeriod('lifetime')
  record(
    'publik',
    'Landing: tautan checkout 30 Hari membawa period=monthly',
    monthly.length === 3 && monthly.every((href) => href.includes('period=monthly')),
    monthly.join(' | '),
  )
  record(
    'publik',
    'Landing: tautan checkout Selamanya membawa period=lifetime',
    lifetime.length === 3 && lifetime.every((href) => href.includes('period=lifetime')),
    lifetime.join(' | '),
  )
  record(
    'publik',
    'Landing: ketiga paket ikut saklar (plan tepat)',
    ['catet-aja', 'waras', 'sultan'].every((plan) => monthly.some((href) => href.includes(`plan=${plan}`))),
    monthly.join(' | '),
  )
}

for (const route of ['/privacy', '/terms']) {
  const res = await publicPage.goto(`${BASE}${route}`, { waitUntil: 'domcontentloaded' })
  await publicPage.waitForTimeout(600)
  const text = (await publicPage.locator('body').innerText()).replace(/\s+/g, ' ')
  record('publik', `${route} terbuka tanpa error`, (res?.status() ?? 0) < 400, `status ${res?.status()}`)
  record(
    'publik',
    `${route} menulis kuota AI sekali pakai`,
    /tidak diisi ulang otomatis|tidak di-refill|SEKALI di bulan pertama/i.test(text),
    '',
  )
}

/* ── 4. ZERO-FLUFF: modal & empty state ────────────────────────────────────── */
await open(page, '/app')
const openComposer = page
  .getByRole('button', { name: /Catat|Tambah catatan|Catat sekarang/i })
  .first()
if (await openComposer.isVisible().catch(() => false)) {
  await openComposer.click()
  await page.waitForTimeout(800)
  const dialogAudit = await page.evaluate(() => {
    const dialogs = Array.from(document.querySelectorAll('[role="dialog"]'))
    const long = []
    for (const dialog of dialogs) {
      for (const node of Array.from(dialog.querySelectorAll('p'))) {
        if (node.closest('[role="alert"]')) continue
        if (node.closest('.sr-only')) continue
        const words = (node.textContent ?? '').trim().split(/\s+/).filter(Boolean)
        if (words.length > 12) long.push(words.join(' ').slice(0, 90))
      }
    }
    return { dialogs: dialogs.length, long }
  })
  record('zero-fluff', 'modal catat: tanpa paragraf pengantar panjang', dialogAudit.long.length === 0, dialogAudit.long.slice(0, 2).join(' | '))
  await page.keyboard.press('Escape').catch(() => {})
} else {
  record('zero-fluff', 'modal catat: pemicu ditemukan', false, 'tombol catat tidak terlihat')
}

await open(page, '/referral')
const emptyStates = await page.evaluate(() => {
  const nodes = Array.from(document.querySelectorAll('main p, main h2, main h3')).filter((node) =>
    /^(Belum|belum) /.test((node.textContent ?? '').trim()),
  )
  return nodes.slice(0, 4).map((node) => {
    const words = (node.textContent ?? '').trim().split(/\s+/).filter(Boolean).length
    const box = node.closest('section, article, div')
    return {
      text: (node.textContent ?? '').trim().slice(0, 60),
      words,
      buttons: box?.querySelectorAll('button, a[role="button"]').length ?? 0,
    }
  })
})
record(
  'zero-fluff',
  'empty state: maksimal 1 kalimat pendek + 1 aksi',
  emptyStates.every((row) => row.words <= 8 && row.buttons <= 2),
  JSON.stringify(emptyStates),
)

/* ── 4b. KAIT EMPTY STATE (P1.3) ────────────────────────────────────────────
   Pemeriksaan heuristik di atas tidak bisa membedakan "belum ada data" dari
   "gagal memuat". Sejak P1.3 setiap empty state membawa `data-catetind-empty`,
   jadi sekarang yang diperiksa adalah kaitnya sendiri: ada di layar kosong,
   kalimatnya pendek, dan tidak ada SVG hiasan di dalamnya. */
for (const route of ['/app', '/referral', '/wealth']) {
  await open(page, route)
  if (route === '/referral') await page.waitForTimeout(1500)
  const markers = await page.evaluate(() => {
    const nodes = Array.from(document.querySelectorAll('[data-catetind-empty]')).filter((node) => {
      const rect = node.getBoundingClientRect()
      return rect.width > 0 && rect.height > 0
    })
    return nodes.map((node) => ({
      words: (node.textContent ?? '').trim().split(/\s+/).filter(Boolean).length,
      svg: node.querySelectorAll('svg').length,
      text: (node.textContent ?? '').trim().slice(0, 70),
    }))
  })
  record('zero-fluff', `${route}: empty state berkait data-catetind-empty`, markers.length > 0, `${markers.length} kait`)
  record(
    'zero-fluff',
    `${route}: empty state tanpa SVG hiasan`,
    markers.every((row) => row.svg === 0),
    markers.map((row) => `${row.svg} svg`).join(' · ') || 'tidak ada kait',
  )
  record(
    'zero-fluff',
    `${route}: empty state ≤ 24 kata (satu-dua kalimat)`,
    markers.every((row) => row.words <= 24),
    markers.map((row) => `${row.words} kata`).join(' · ') || 'tidak ada kait',
  )
}

await open(page, '/app')
const composer = page
  .getByRole('button', { name: /Catat|Tambah catatan|Catat sekarang/i })
  .first()
if (await composer.isVisible().catch(() => false)) {
  await composer.click()
  await page.waitForTimeout(700)
  const fluff = await page.evaluate(() => {
    const dialogs = Array.from(document.querySelectorAll('[role="dialog"]'))
    const notes = []
    for (const dialog of dialogs) {
      for (const node of Array.from(dialog.querySelectorAll('p, span'))) {
        const text = (node.textContent ?? '').trim()
        if (!text) continue
        if (/^(Catatan|Petunjuk|Tips|Info)\s*:/i.test(text)) notes.push(text.slice(0, 70))
      }
    }
    return notes
  })
  record('zero-fluff', 'sheet catat bebas catatan kaki "Catatan:/Petunjuk:"', fluff.length === 0, fluff.slice(0, 2).join(' | '))
  await page.keyboard.press('Escape').catch(() => {})
}

/* ── 4c. DECK DASHBOARD · BATIK DI SEMUA KARTU & SEMUA JENIS ────────────────
   Sesi 3 pernah mencabut motif batik dari muka kartu, dan gejala yang paling
   sering lolos adalah "batik cuma muncul di kartu pertama". Karena itu deck
   diuji dengan TIGA dompet nyata (bank, e-wallet, tunai): kartu agregat +
   tiga kartu dompet harus semuanya punya lapisan `data-catetind-batik`, dan
   tidak satu pun boleh mencetak nomor rekening masking.

   Seed dilakukan DI SINI (setelah pemeriksaan empty state) supaya keadaan
   "belum ada dompet" yang diperiksa bagian sebelumnya tidak berubah. */
const deckWallets = [
  {
    id: 'qa-deck-bank',
    name: 'Bank Uji',
    holder: 'Uji Visual',
    number: '\u2022\u2022\u2022\u2022 1234',
    network: 'DEBIT',
    kind: 'bank',
    type: 'Bank',
    context: 'pribadi',
    opening: 1_200_000,
    art: 'kawung',
    color: 'bg-mint/25',
    face: 'bg-gradient-to-br from-forest-soft via-forest to-evergreen-deeper',
    band_class: 'from-mint via-cream to-mint',
    face_class: 'from-forest-soft via-forest to-evergreen-deeper',
    glow_class: 'bg-mint/25',
    sort_index: 10,
  },
  {
    id: 'qa-deck-ewallet',
    name: 'Dompet Digital',
    holder: 'Uji Visual',
    number: '\u2022\u2022\u2022\u2022 5678',
    network: 'E-WALLET',
    kind: 'ewallet',
    type: 'E-Wallet',
    context: 'pribadi',
    opening: 350_000,
    art: 'mendung',
    color: 'bg-thistle/25',
    face: 'bg-gradient-to-br from-thistle via-thistle-deep to-evergreen-deeper',
    band_class: 'from-thistle-light via-cream to-thistle-light',
    face_class: 'from-thistle via-thistle-deep to-evergreen-deeper',
    glow_class: 'bg-thistle/25',
    sort_index: 11,
  },
  {
    id: 'qa-deck-tunai',
    name: 'Tunai Uji',
    holder: 'Uji Visual',
    number: '',
    network: 'CASH',
    kind: 'cash',
    type: 'Cash',
    context: 'pribadi',
    opening: 75_000,
    art: 'parang',
    color: 'bg-daisy/25',
    face: 'bg-gradient-to-br from-brand via-daisy-deep to-soil',
    band_class: 'from-daisy-light via-cream to-daisy-light',
    face_class: 'from-brand via-daisy-deep to-soil',
    glow_class: 'bg-daisy/25',
    sort_index: 12,
  },
]
const seededWallets = await rest(session.access_token, 'wallets', {
  method: 'POST',
  headers: { Prefer: 'return=representation' },
  body: JSON.stringify(deckWallets),
})
record(
  'batik',
  'persiapan: tiga dompet uji (bank/e-wallet/tunai) tersimpan',
  seededWallets.ok,
  `HTTP ${seededWallets.status}`,
)

await open(page, '/app')
await page.locator('[data-catetind-kartu-dompet]').first().waitFor({ timeout: 10_000 }).catch(() => {})
/* beri waktu engine pegas deck menyelesaikan animasi masuk, supaya tangkapan
   layar menunjukkan tumpukan yang sudah settle (bukan kartu yang masih naik) */
await page.waitForTimeout(2600)
const deck = await page.evaluate(() => {
  const cards = Array.from(document.querySelectorAll('[data-catetind-kartu-dompet]'))
  return {
    count: cards.length,
    withBatik: cards.filter((card) => card.querySelector('[data-catetind-batik]')).length,
    masked: cards.filter((card) => /(?<!\u2022)\u2022{4}\s+\d{3,4}(?!\d)/.test(card.innerText || '')).length,
    ids: cards.map((card) => card.getAttribute('data-wallet-id')).join(','),
  }
})
record(
  'batik',
  'deck Dashboard: kartu agregat + 3 dompet dirender',
  deck.count >= 4,
  `${deck.count} kartu · ${deck.ids}`,
)
record(
  'batik',
  'deck Dashboard: SEMUA kartu bercorak batik (bukan hanya kartu depan)',
  deck.count >= 4 && deck.withBatik === deck.count,
  `${deck.withBatik}/${deck.count} kartu`,
)
record(
  'batik',
  'deck Dashboard: kartu tanpa nomor/kode',
  deck.masked === 0,
  deck.masked ? `${deck.masked} kartu mencetak nomor` : 'bersih',
)
await page.screenshot({ path: path.join(SHOTS, 'batik-deck-dashboard.png') })

/* Halaman daftar Dompet & Akun memakai <WalletFace/> yang sama — kartu ke-1,
   ke-2, … di grid harus ikut bercorak dan tetap tanpa nomor. */
await open(page, '/wallet')
await page.locator('[data-catetind-kartu-dompet]').first().waitFor({ timeout: 10_000 }).catch(() => {})
await page.waitForTimeout(900)
const walletList = await page.evaluate(() => {
  const cards = Array.from(document.querySelectorAll('[data-catetind-kartu-dompet]'))
  return {
    count: cards.length,
    withBatik: cards.filter((card) => card.querySelector('[data-catetind-batik]')).length,
    masked: cards.filter((card) => /(?<!\u2022)\u2022{4}\s+\d{3,4}(?!\d)/.test(card.innerText || '')).length,
  }
})
record(
  'batik',
  'daftar /wallet: SEMUA kartu bercorak batik',
  walletList.count > 0 && walletList.withBatik === walletList.count,
  `${walletList.withBatik}/${walletList.count} kartu`,
)
record(
  'batik',
  'daftar /wallet: kartu tanpa nomor/kode',
  walletList.masked === 0,
  walletList.masked ? `${walletList.masked} kartu mencetak nomor` : 'bersih',
)
await page.screenshot({ path: path.join(SHOTS, 'batik-wallet-list.png') })
await page.locator('[data-catetind-kartu-dompet]').first().scrollIntoViewIfNeeded().catch(() => {})
await page.waitForTimeout(500)
await page.screenshot({ path: path.join(SHOTS, 'batik-wallet-cards.png') })

await mobile.close()

/* ── 5. RINGKASAN ──────────────────────────────────────────────────────────── */
await browser.close()
await deleteUserByEmail(USER.email)

const failed = results.filter((row) => !row.ok)
log(`\nRingkasan visual-audit: ${results.length - failed.length}/${results.length} lulus · ${failed.length} gagal`)
fs.writeFileSync('qa-visual-report.json', JSON.stringify(results, null, 2))
if (failed.length) {
  log('\nGagal:')
  for (const row of failed) log(`  ✗ [${row.area}] ${row.name} — ${row.detail}`)
  process.exit(1)
}




