import { describe, expect, it } from 'vitest'

import { PAY_METHODS, PAY_METHOD_IDS, isPaymentMethodId, paymentMethod, midtransChargeExtras } from './methods'

/* ── Katalog metode (paket 83) ────────────────────────────────────────────────
   Yang dikunci di sini: daftar metode yang boleh ditagih, dan bentuk body
   `/v2/charge` per metode — bentuk yang sudah diuji ke sandbox. Kalau seseorang
   menambah metode yang belum pernah dicoba, test ini menahannya. */

describe('katalog metode bayar', () => {
  it('memuat delapan metode fase 1 tanpa duplikat', () => {
    expect(PAY_METHOD_IDS).toHaveLength(8)
    expect(new Set(PAY_METHOD_IDS).size).toBe(8)
    expect(PAY_METHOD_IDS).toEqual([
      'qris',
      'bca-va',
      'bri-va',
      'bni-va',
      'permata-va',
      'gopay',
      'shopeepay',
      'mandiri-bill',
    ])
  })

  it('menolak metode di luar katalog (termasuk yang cuma ada di Snap)', () => {
    expect(isPaymentMethodId('qris')).toBe(true)
    expect(isPaymentMethodId('ovo')).toBe(false)
    expect(isPaymentMethodId('dana')).toBe(false)
    expect(isPaymentMethodId('')).toBe(false)
    expect(isPaymentMethodId(null)).toBe(false)
    expect(paymentMethod('kartu-kredit')).toBeUndefined()
  })

  it('hanya GoPay yang instruksinya tidak bisa dirender ulang dari status', () => {
    const tidakBisa = PAY_METHODS.filter((method) => !method.reRenderable).map((method) => method.id)
    expect(tidakBisa).toEqual(['gopay'])
  })

  it('body QRIS', () => {
    expect(midtransChargeExtras(paymentMethod('qris')!)).toEqual({ payment_type: 'qris' })
  })

  it('body Virtual Account memakai bank masing-masing', () => {
    expect(midtransChargeExtras(paymentMethod('bca-va')!)).toEqual({
      payment_type: 'bank_transfer',
      bank_transfer: { bank: 'bca' },
    })
    expect(midtransChargeExtras(paymentMethod('permata-va')!)).toEqual({
      payment_type: 'bank_transfer',
      bank_transfer: { bank: 'permata' },
    })
  })

  it('body GoPay tanpa blok tambahan; ShopeePay memakai callback_url kalau ada', () => {
    expect(midtransChargeExtras(paymentMethod('gopay')!)).toEqual({ payment_type: 'gopay' })
    expect(midtransChargeExtras(paymentMethod('shopeepay')!)).toEqual({ payment_type: 'shopeepay' })
    expect(
      midtransChargeExtras(paymentMethod('shopeepay')!, { callbackUrl: 'https://catetind.com/x' }),
    ).toEqual({
      payment_type: 'shopeepay',
      shopeepay: { callback_url: 'https://catetind.com/x' },
    })
  })

  it('body Mandiri Bill memakai echannel + keterangan tagihan', () => {
    expect(midtransChargeExtras(paymentMethod('mandiri-bill')!)).toEqual({
      payment_type: 'echannel',
      echannel: { bill_info1: 'Pembayaran:', bill_info2: 'Langganan CatetInd' },
    })
  })
})
