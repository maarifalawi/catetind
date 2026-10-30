import { describe, expect, it } from 'vitest'

import {
  PAY_METHOD_CATALOG,
  PAY_METHOD_IDS,
  PAY_METHODS,
  PAYMENT_METHODS_AVAILABLE,
  VERIFIED_ACTIVE_METHOD_IDS,
  isPaymentMethodActive,
  isPaymentMethodId,
  midtransChargeExtras,
  paymentMethod,
  snapEnabledPayments,
} from './methods'

/* ── Katalog metode (paket 83 · Snap 30 Okt 2026) ─────────────────────────────
   Yang dikunci di sini: (a) daftar bentuk teknis tiap metode, (b) aturan bahwa
   yang DITAWARKAN ke user hanya kanal yang aktif di merchant produksi, dan
   (c) pemetaan metode → `enabled_payments` Snap.

   Sumber daftar aktif: Dashboard Midtrans Production → Payment Methods
   (GoPay Dynamic QRIS, GoPay, BNI VA, BRI VA, Mandiri, Permata VA aktif;
   BCA VA & ShopeePay TIDAK). Core `/v2/charge` membalas `402` untuk semuanya,
   jadi produksi memakai Snap — lihat `createSnapCharge` di `midtrans.ts`. */

describe('katalog metode bayar', () => {
  it('katalog teknis memuat delapan metode fase 1 tanpa duplikat', () => {
    expect(PAY_METHOD_CATALOG).toHaveLength(8)
    expect(new Set(PAY_METHOD_CATALOG.map((method) => method.id)).size).toBe(8)
    expect(PAY_METHOD_CATALOG.map((method) => method.id)).toEqual([
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

  it('yang ditawarkan ke user HANYA kanal yang aktif di merchant produksi', () => {
    expect(VERIFIED_ACTIVE_METHOD_IDS).toEqual([
      'qris',
      'gopay',
      'bni-va',
      'bri-va',
      'mandiri-bill',
      'permata-va',
    ])
    expect(PAY_METHODS.map((method) => method.id)).toEqual(VERIFIED_ACTIVE_METHOD_IDS)
    expect(PAY_METHOD_IDS).toEqual(VERIFIED_ACTIVE_METHOD_IDS)
    expect(PAYMENT_METHODS_AVAILABLE).toBe(true)
    /* BCA VA & ShopeePay ada di katalog teknis tetapi TIDAK ditawarkan. */
    expect(PAY_METHOD_IDS).not.toContain('bca-va')
    expect(PAY_METHOD_IDS).not.toContain('shopeepay')
  })

  it('kanal yang belum aktif tetap punya bentuk teknis tapi DITOLAK route', () => {
    expect(paymentMethod('bca-va')).toBeDefined()
    expect(isPaymentMethodId('bca-va')).toBe(true)
    expect(isPaymentMethodActive('bca-va')).toBe(false)
    expect(isPaymentMethodActive('shopeepay')).toBe(false)
    expect(isPaymentMethodActive('qris')).toBe(true)
    expect(isPaymentMethodActive('')).toBe(false)
    expect(isPaymentMethodActive(null)).toBe(false)
  })

  it('enabled_payments Snap per metode (QRIS = other_qris + gopay)', () => {
    expect(snapEnabledPayments(paymentMethod('qris')!)).toEqual(['other_qris', 'gopay'])
    expect(snapEnabledPayments(paymentMethod('gopay')!)).toEqual(['gopay'])
    expect(snapEnabledPayments(paymentMethod('bni-va')!)).toEqual(['bni_va'])
    expect(snapEnabledPayments(paymentMethod('bri-va')!)).toEqual(['bri_va'])
    expect(snapEnabledPayments(paymentMethod('permata-va')!)).toEqual(['permata_va'])
    expect(snapEnabledPayments(paymentMethod('mandiri-bill')!)).toEqual(['echannel'])
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
    const tidakBisa = PAY_METHOD_CATALOG.filter((method) => !method.reRenderable).map(
      (method) => method.id,
    )
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
