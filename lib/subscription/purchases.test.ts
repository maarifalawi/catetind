import { describe, expect, it } from 'vitest'
import {
  purchaseHistoryFromRows,
  purchaseLabelOf,
  purchaseStatusOf,
} from './purchases'

/* ── RIWAYAT PEMBAYARAN: TIDAK ADA BARIS KARANGAN ────────────────────────────
   Yang dikunci di sini adalah aturan yang membuat panel Billing jujur:
     · status mentah Midtrans diterjemahkan apa adanya (bukan "semua Lunas");
     · label memakai paket/add-on yang BENAR-BENAR dibeli;
     · nominal memakai yang sudah dibayar, atau yang ditagih selama pending;
     · baris rusak tidak pernah tampil sebagai kwitansi. */

describe('purchaseStatusOf()', () => {
  it('settlement & capture = lunas; sisanya dibedakan, bukan disamakan', () => {
    expect(purchaseStatusOf('settlement')).toBe('paid')
    expect(purchaseStatusOf('capture')).toBe('paid')
    expect(purchaseStatusOf('pending')).toBe('pending')
    expect(purchaseStatusOf('refund')).toBe('refunded')
    expect(purchaseStatusOf('expire')).toBe('failed')
    expect(purchaseStatusOf('cancel')).toBe('failed')
    expect(purchaseStatusOf('deny')).toBe('failed')
    /* nilai tak dikenal / kosong tidak boleh mengaku lunas */
    expect(purchaseStatusOf(null)).toBe('pending')
    expect(purchaseStatusOf('apa-ini')).toBe('pending')
  })
})

describe('purchaseLabelOf()', () => {
  it('paket lifetime memakai nama paket dari tabel harga kanon', () => {
    expect(
      purchaseLabelOf({ purpose: 'subscribe', tier_name: 'waras', billing_period: 'lifetime' }),
    ).toBe('Paket Waras - Akses selamanya')
  })

  it('pembelian lama 30 hari tidak diberi label "akses selamanya"', () => {
    expect(
      purchaseLabelOf({ purpose: 'renew', tier_name: 'catet-aja', billing_period: 'monthly' }),
    ).toBe('Paket Catet Aja - Paket lama 30 hari')
  })

  it('tier lama tetap dipetakan (monthly → catet-aja), bukan "undefined"', () => {
    expect(purchaseLabelOf({ purpose: 'subscribe', tier_name: 'monthly' })).toBe(
      'Paket Catet Aja - Akses selamanya',
    )
    expect(purchaseLabelOf({ purpose: 'subscribe', tier_name: null })).toBe(
      'Paket CatetInd - Akses selamanya',
    )
  })

  it('top up token memakai nama add-on yang benar-benar dibeli', () => {
    expect(purchaseLabelOf({ purpose: 'topup', addon_package_id: 'sedang' })).toBe(
      'Top Up AI Token - Reguler',
    )
    /* add-on tak dikenal tidak boleh menampilkan "undefined" */
    expect(purchaseLabelOf({ purpose: 'topup', addon_package_id: 'hilang' })).toBe(
      'Top Up AI Token - Token AI',
    )
  })
})

describe('purchaseHistoryFromRows()', () => {
  it('nominal = yang sudah dibayar; tagihan pending memakai nominal yang ditagih', () => {
    const items = purchaseHistoryFromRows([
      { order_id: 'A', status: 'settlement', price_paid: 2, expected_amount: 2 },
      { order_id: 'B', status: 'pending', price_paid: 0, expected_amount: 29_000 },
    ])
    expect(items.map((item) => item.amount)).toEqual([2, 29_000])
    expect(items.map((item) => item.status)).toEqual(['paid', 'pending'])
  })

  it('baris tanpa order_id dilewati — tidak ada kwitansi tanpa identitas', () => {
    const items = purchaseHistoryFromRows([
      { status: 'settlement', price_paid: 1000 },
      null,
      'bukan baris',
      { order_id: 'C', status: 'settlement', price_paid: 5000 },
    ])
    expect(items).toHaveLength(1)
    expect(items[0].orderId).toBe('C')
  })
})
