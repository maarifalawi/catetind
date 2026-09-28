import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  MAX_EVENT_VALUE_LENGTH,
  MONEY_EVENT_CATALOG,
  MONEY_EVENT_NAMES,
  sanitizeEventPayload,
  setAnalyticsSink,
  trackMoneyEvent,
  type MoneyEventName,
  type MoneyEventPayload,
} from './analytics'

/* ── Test jejarak analitik (paket 43 · audit Stage 6 #4) ──────────────────────
   Yang diuji BUKAN "event-nya terkirim ke Vercel" (itu urusan library-nya), tapi
   janji privasi yang harus tetap benar walau nanti ada yang menambah event baru:

     1. kunci payload yang menyentuh uang/catatan tidak pernah lolos;
     2. nilai string panjang (calon catatan user) ikut dibuang;
     3. katalog eventnya sendiri bersih — jadi event baru yang ditambahkan tanpa
        melewati aturan ini akan GAGAL di sini, bukan lolos ke produksi. */

/** kunci yang haram muncul di payload mana pun (cerminan `FORBIDDEN_KEY_PATTERN`) */
const FORBIDDEN_IN_PAYLOAD = /(amount|nominal|note|nama|name|catatan|saldo|balance|total|nilai|value|harga|price|wallet|dompet|email|user)/i

afterEach(() => {
  setAnalyticsSink(null)
  vi.restoreAllMocks()
})

describe('sanitizeEventPayload', () => {
  it('membuang kunci yang menyentuh uang, catatan, atau identitas dompet', () => {
    const { clean, dropped } = sanitizeEventPayload({
      kind: 'expense',
      amount: 85_000,
      nominalLabel: 'Rp 85.000',
      note: 'Kopi Kenangan',
      walletName: 'BCA',
      email: 'jon@snow.com',
    })

    expect(clean).toEqual({ kind: 'expense' })
    expect(dropped.sort()).toEqual(['amount', 'email', 'nominalLabel', 'note', 'walletName'].sort())
  })

  it('membuang nilai string yang panjang (jalur menyelundupkan catatan lewat nilai)', () => {
    const long = 'x'.repeat(MAX_EVENT_VALUE_LENGTH + 1)
    const { clean, dropped } = sanitizeEventPayload({ mode: long, kind: 'expense' })

    expect(clean).toEqual({ kind: 'expense' })
    expect(dropped).toEqual(['mode'])
  })

  it('menerima nilai primitif yang sah (string pendek, angka, boolean, null)', () => {
    const payload: MoneyEventPayload = {
      mode: 'percentage',
      me_percent: 60,
      offline: true,
      partner_percent: null,
    }
    expect(sanitizeEventPayload(payload).clean).toEqual(payload)
    expect(sanitizeEventPayload(payload).dropped).toEqual([])
  })
})

describe('MONEY_EVENT_CATALOG', () => {
  it('mendaftarkan tepat enam event kritikal yang diminta audit', () => {
    expect(MONEY_EVENT_CATALOG.map((entry) => entry.name).sort()).toEqual(
      [...MONEY_EVENT_NAMES].sort(),
    )
    expect(MONEY_EVENT_NAMES).toHaveLength(6)
  })

  it('tidak pernah mendeklarasikan kunci terlarang di daftar payload', () => {
    for (const entry of MONEY_EVENT_CATALOG) {
      for (const key of entry.payload) {
        expect(
          FORBIDDEN_IN_PAYLOAD.test(key),
          `kunci "${key}" di event ${entry.name} mengandung data uang/catatan`,
        ).toBe(false)
      }
    }
  })

  it('mencatat batas privasi tiap event (apa yang SENGAJA tidak ikut)', () => {
    for (const entry of MONEY_EVENT_CATALOG) {
      expect(entry.never.length).toBeGreaterThan(0)
      expect(entry.when.length).toBeGreaterThan(10)
    }
  })
})

describe('trackMoneyEvent', () => {
  it('menembak event yang sudah disaring ke sink (tanpa browser, tanpa jaringan)', () => {
    const seen: { name: MoneyEventName; payload: MoneyEventPayload }[] = []
    setAnalyticsSink((name, payload) => seen.push({ name, payload }))
    /* payload di bawah sengaja MEMUAT `amount`: penjaga harus membuangnya, dan
       peringatannya kami senyapkan supaya keluaran test bersih */
    vi.spyOn(console, 'warn').mockImplementation(() => {})

    trackMoneyEvent('transaction_created', { kind: 'expense', amount: 85_000, offline: false })

    expect(seen).toHaveLength(1)
    expect(seen[0].name).toBe('transaction_created')
    /* `amount` DIBUANG sebelum sampai ke sink — inilah buktinya, bukan cuma niat */
    expect(seen[0].payload).toEqual({ kind: 'expense', offline: false })
  })

  it('tidak melempar di luar browser (test/SSR) dan tetap mengirim ke sink', () => {
    const seen: string[] = []
    setAnalyticsSink((name) => seen.push(name))
    vi.spyOn(console, 'warn').mockImplementation(() => {})

    expect(() => trackMoneyEvent('balance_adjusted', { direction: 'down' })).not.toThrow()
    expect(seen).toEqual(['balance_adjusted'])
  })
})
