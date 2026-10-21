import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createHash } from 'node:crypto'

import {
  cancelTransaction,
  createCoreCharge,
  fetchTransactionStatus,
  methodIdFromTransaction,
  midtransAuthHeader,
  midtransChargeEndpoint,
  midtransCoreBase,
  midtransExpiryToIso,
  midtransIsProduction,
  midtransQrImageUrl,
  midtransStatusEndpoint,
  paymentInstructionsFromTransaction,
  paymentStateFromTransaction,
  verifyMidtransSignature,
} from './midtrans'
import { paymentMethod } from './methods'

/* ── Midtrans Core API (paket 83) ─────────────────────────────────────────────
   Semua bentuk balasan di test ini DISALIN dari balasan sandbox sungguhan
   (QRIS, VA BCA/BRI/BNI/Permata, GoPay, ShopeePay, Mandiri Bill) — termasuk
   balasan `status_code 406` saat order ditagih ulang. Yang dikunci: pemetaan
   status, penerjemahan instruksi, dan bahwa panggilan provider TIDAK PERNAH
   terjadi saat kredensial kosong (fail-closed, bukan pura-pura bisa). */

const KEY = 'Mid-server-uji'

const originalFetch = global.fetch
const fetchMock = vi.fn()

beforeEach(() => {
  process.env.MIDTRANS_SERVER_KEY = KEY
  delete process.env.MIDTRANS_IS_PRODUCTION
  fetchMock.mockReset()
  global.fetch = fetchMock as unknown as typeof fetch
})

afterEach(() => {
  delete process.env.MIDTRANS_SERVER_KEY
  delete process.env.MIDTRANS_IS_PRODUCTION
  global.fetch = originalFetch
})

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  })
}

function lastCall(): { url: string; init: RequestInit } {
  const [url, init] = fetchMock.mock.calls[fetchMock.mock.calls.length - 1] as [string, RequestInit]
  return { url, init }
}

describe('endpoint & kredensial', () => {
  it('default sandbox, produksi hanya saat MIDTRANS_IS_PRODUCTION=1', () => {
    expect(midtransIsProduction()).toBe(false)
    expect(midtransCoreBase()).toBe('https://api.sandbox.midtrans.com')
    process.env.MIDTRANS_IS_PRODUCTION = '1'
    expect(midtransIsProduction()).toBe(true)
    expect(midtransCoreBase()).toBe('https://api.midtrans.com')
  })

  it('endpoint charge/status/QR disusun dari basis yang sama', () => {
    expect(midtransChargeEndpoint()).toBe('https://api.sandbox.midtrans.com/v2/charge')
    expect(midtransStatusEndpoint('subscribe-a-1')).toBe(
      'https://api.sandbox.midtrans.com/v2/subscribe-a-1/status',
    )
    expect(midtransQrImageUrl('tx-uuid')).toBe(
      'https://api.sandbox.midtrans.com/v2/qris/tx-uuid/qr-code',
    )
  })

  it('Authorization Basic = base64(key + ":") — key ditulis apa adanya', () => {
    expect(midtransAuthHeader()).toBe(`Basic ${Buffer.from(`${KEY}:`).toString('base64')}`)
  })

  it('order_id yang mengandung karakter aneh tetap di-encode di URL', () => {
    expect(midtransStatusEndpoint('a/b c')).toBe('https://api.sandbox.midtrans.com/v2/a%2Fb%20c/status')
  })
})

describe('verifikasi tanda tangan webhook (tidak berubah sejak paket 63)', () => {
  it('sha512(order_id + status_code + gross_amount + serverKey) yang cocok = true', () => {
    const signature = createHash('sha512').update(`order-1` + `200` + `109000.00` + KEY).digest('hex')
    expect(
      verifyMidtransSignature({
        orderId: 'order-1',
        statusCode: '200',
        grossAmount: '109000.00',
        signature,
      }),
    ).toBe(true)
  })

  it('tanda tangan salah = false', () => {
    expect(
      verifyMidtransSignature({
        orderId: 'order-1',
        statusCode: '200',
        grossAmount: '109000.00',
        signature: 'palsu',
      }),
    ).toBe(false)
  })

  it('tanpa kunci = false (fail-closed)', () => {
    delete process.env.MIDTRANS_SERVER_KEY
    expect(
      verifyMidtransSignature({ orderId: 'o', statusCode: '200', grossAmount: '1', signature: 'x' }),
    ).toBe(false)
  })
})

describe('pemetaan status Midtrans → bahasa app', () => {
  it('settlement = settled', () => {
    expect(paymentStateFromTransaction('settlement', null)).toBe('settled')
  })

  it('capture hanya settled saat fraud accept; challenge masih pending, deny gagal', () => {
    expect(paymentStateFromTransaction('capture', 'accept')).toBe('settled')
    expect(paymentStateFromTransaction('capture', 'challenge')).toBe('pending')
    expect(paymentStateFromTransaction('capture', 'deny')).toBe('failed')
  })

  it('expire = expired; cancel/deny/failure/refund = failed', () => {
    expect(paymentStateFromTransaction('expire', null)).toBe('expired')
    for (const status of ['cancel', 'deny', 'failure', 'refund', 'partial_refund']) {
      expect(paymentStateFromTransaction(status, null)).toBe('failed')
    }
  })

  it('pending/authorize = pending; status tak dikenal = unknown', () => {
    expect(paymentStateFromTransaction('pending', null)).toBe('pending')
    expect(paymentStateFromTransaction('authorize', null)).toBe('pending')
    expect(paymentStateFromTransaction('entah-apa', null)).toBe('unknown')
  })

  it('waktu kedaluwarsa Midtrans (GMT+7) → ISO, bentuk asing → null', () => {
    expect(midtransExpiryToIso('2026-10-11 04:15:45')).toBe('2026-10-10T21:15:45.000Z')
    expect(midtransExpiryToIso('bukan-tanggal')).toBeNull()
    expect(midtransExpiryToIso(undefined)).toBeNull()
  })

  it('payment_type Midtrans → metode di katalog kita', () => {
    expect(methodIdFromTransaction('qris', null, false)).toBe('qris')
    expect(methodIdFromTransaction('gopay', null, false)).toBe('gopay')
    expect(methodIdFromTransaction('shopeepay', null, false)).toBe('shopeepay')
    expect(methodIdFromTransaction('echannel', null, false)).toBe('mandiri-bill')
    expect(methodIdFromTransaction('bank_transfer', 'bca', false)).toBe('bca-va')
    expect(methodIdFromTransaction('bank_transfer', null, true)).toBe('permata-va')
    expect(methodIdFromTransaction('credit_card', null, false)).toBeNull()
  })
})

/* Balasan di bawah disalin apa adanya dari sandbox Midtrans. */
const RAW_QRIS = {
  status_code: '201',
  status_message: 'Qris transaction is created',
  transaction_status: 'pending',
  payment_type: 'qris',
  transaction_id: 'tx-qr-1',
  gross_amount: '109000.00',
  expiry_time: '2026-10-11 04:15:45',
  qr_string: '00020101021226610014COM.GO-JEK.WWW',
  actions: [
    { name: 'generate-qr-code', method: 'GET', url: 'https://api.sandbox.midtrans.com/v2/qris/tx-qr-1/qr-code' },
    { name: 'generate-qr-code-v2', method: 'GET', url: 'https://merchants-app.sbx.midtrans.com/v4/qris/gopay/A1/qr-code' },
  ],
}

describe('terjemahan instruksi bayar', () => {
  it('QRIS: gambar + isi QR dari actions/qr_string', () => {
    expect(paymentInstructionsFromTransaction(RAW_QRIS, paymentMethod('qris')!)).toEqual({
      channel: 'qris',
      qrImageUrl: 'https://api.sandbox.midtrans.com/v2/qris/tx-qr-1/qr-code',
      qrString: '00020101021226610014COM.GO-JEK.WWW',
    })
  })

  it('QRIS tanpa actions (balasan status): URL diturunkan dari transaction_id', () => {
    expect(
      paymentInstructionsFromTransaction({ ...RAW_QRIS, actions: [] }, paymentMethod('qris')!),
    ).toEqual({
      channel: 'qris',
      qrImageUrl: midtransQrImageUrl('tx-qr-1'),
      qrString: '00020101021226610014COM.GO-JEK.WWW',
    })
  })

  it('QRIS tanpa transaction_id & tanpa actions → null (tidak menggambar QR karangan)', () => {
    expect(
      paymentInstructionsFromTransaction(
        { ...RAW_QRIS, actions: [], transaction_id: undefined },
        paymentMethod('qris')!,
      ),
    ).toBeNull()
  })

  it('Virtual Account dari va_numbers', () => {
    const raw = {
      transaction_status: 'pending',
      payment_type: 'bank_transfer',
      va_numbers: [{ bank: 'bca', va_number: '80776140975980277315570' }],
    }
    expect(paymentInstructionsFromTransaction(raw, paymentMethod('bca-va')!)).toEqual({
      channel: 'va',
      bank: 'bca',
      vaNumber: '80776140975980277315570',
    })
  })

  it('Permata memakai permata_va_number', () => {
    const raw = {
      transaction_status: 'pending',
      payment_type: 'bank_transfer',
      permata_va_number: '8070050414674224',
    }
    expect(paymentInstructionsFromTransaction(raw, paymentMethod('permata-va')!)).toEqual({
      channel: 'va',
      bank: 'permata',
      vaNumber: '8070050414674224',
    })
  })

  it('tanpa nomor VA → null', () => {
    expect(
      paymentInstructionsFromTransaction({ payment_type: 'bank_transfer' }, paymentMethod('bri-va')!),
    ).toBeNull()
  })

  it('e-wallet memakai tautan deeplink provider', () => {
    const raw = {
      payment_type: 'gopay',
      actions: [
        { name: 'deeplink-redirect', url: 'https://simulator.sandbox.midtrans.com/v2/deeplink/detail?tref=A1' },
      ],
    }
    expect(paymentInstructionsFromTransaction(raw, paymentMethod('gopay')!)).toEqual({
      channel: 'ewallet',
      deeplinkUrl: 'https://simulator.sandbox.midtrans.com/v2/deeplink/detail?tref=A1',
    })
  })

  it('GoPay tanpa actions (persis balasan status) → null, bukan tautan karangan', () => {
    expect(
      paymentInstructionsFromTransaction({ payment_type: 'gopay' }, paymentMethod('gopay')!),
    ).toBeNull()
  })

  it('Mandiri Bill dari biller_code + bill_key', () => {
    const raw = { payment_type: 'echannel', biller_code: '70012', bill_key: '694800549643' }
    expect(paymentInstructionsFromTransaction(raw, paymentMethod('mandiri-bill')!)).toEqual({
      channel: 'bill',
      billerCode: '70012',
      billKey: '694800549643',
    })
    expect(
      paymentInstructionsFromTransaction(
        { payment_type: 'echannel', biller_code: '70012' },
        paymentMethod('mandiri-bill')!,
      ),
    ).toBeNull()
  })
})

describe('createCoreCharge', () => {
  const intent = {
    purpose: 'subscribe' as const,
    orderId: 'subscribe-abc-1',
    amount: 109_000,
    itemName: 'CatetInd Waras — Tahunan',
    planId: 'waras',
    period: 'annual',
  }

  it('tanpa kunci: not-configured 503 dan TIDAK memanggil provider', async () => {
    delete process.env.MIDTRANS_SERVER_KEY
    const result = await createCoreCharge(intent, paymentMethod('qris')!)
    expect(result).toEqual({
      ok: false,
      reason: 'not-configured',
      status: 503,
      message: 'Pembayaran belum aktif.',
    })
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('QRIS: /v2/charge dipanggil dengan nominal server + instruksi diterjemahkan', async () => {
    fetchMock.mockResolvedValue(jsonResponse(RAW_QRIS))
    const result = await createCoreCharge(
      { ...intent, notificationUrl: 'https://catetind.com/api/payment/webhook' },
      paymentMethod('qris')!,
    )

    const { url, init } = lastCall()
    expect(url).toBe('https://api.sandbox.midtrans.com/v2/charge')
    expect(init.method).toBe('POST')
    const headers = init.headers as Record<string, string>
    expect(headers.Authorization).toBe(midtransAuthHeader())
    expect(headers['X-Override-Notification']).toBe('https://catetind.com/api/payment/webhook')

    const body = JSON.parse(String(init.body)) as Record<string, unknown>
    expect(body.transaction_details).toEqual({ order_id: 'subscribe-abc-1', gross_amount: 109_000 })
    expect(body.payment_type).toBe('qris')
    expect(body.custom_expiry).toEqual({ expiry_duration: 60, unit: 'minute' })

    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.value.state).toBe('pending')
    expect(result.value.amount).toBe(109_000)
    expect(result.value.expiresAt).toBe('2026-10-10T21:15:45.000Z')
    expect(result.value.instructions).toMatchObject({ channel: 'qris' })
  })

  it('tanpa notificationUrl: header override tidak ikut dikirim', async () => {
    fetchMock.mockResolvedValue(jsonResponse(RAW_QRIS))
    await createCoreCharge(intent, paymentMethod('qris')!)
    expect((lastCall().init.headers as Record<string, string>)['X-Override-Notification']).toBeUndefined()
  })

  it('body VA memakai bank yang dipilih user', async () => {
    fetchMock.mockResolvedValue(
      jsonResponse({
        status_code: '201',
        transaction_status: 'pending',
        payment_type: 'bank_transfer',
        permata_va_number: '8070050414674224',
      }),
    )
    const result = await createCoreCharge(intent, paymentMethod('permata-va')!)
    const body = JSON.parse(String(lastCall().init.body)) as Record<string, unknown>
    expect(body.bank_transfer).toEqual({ bank: 'permata' })
    expect(result.ok && result.value.instructions).toMatchObject({ channel: 'va', bank: 'permata' })
  })

  it('HTTP 200 dengan status_code 406 (order ditagih ulang) = gagal jujur, bukan sukses', async () => {
    fetchMock.mockResolvedValue(
      jsonResponse({
        status_code: '406',
        status_message:
          'The request could not be completed due to a conflict with the current state of the target resource, please try again',
      }),
    )
    const result = await createCoreCharge(intent, paymentMethod('qris')!)
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.reason).toBe('provider')
    expect(result.message).toContain('conflict')
  })

  it('provider menolak (401) → status provider diteruskan, pesannya apa adanya', async () => {
    fetchMock.mockResolvedValue(
      jsonResponse({ error_messages: ['Access denied due to unauthorized transaction'] }, 401),
    )
    const result = await createCoreCharge(intent, paymentMethod('gopay')!)
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.status).toBe(401)
    expect(result.message).toContain('Access denied')
  })

  it('jaringan mati → provider 502 (bukan lemparan ke UI)', async () => {
    fetchMock.mockRejectedValue(new Error('getaddrinfo ENOTFOUND'))
    const result = await createCoreCharge(intent, paymentMethod('qris')!)
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.status).toBe(502)
  })
})

describe('fetchTransactionStatus', () => {
  it('404 = transaksi belum tercatat di provider (bukan error)', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ status_code: '404', status_message: 'Transaction not found' }, 404))
    const result = await fetchTransactionStatus('subscribe-abc-1')
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.reason).toBe('not-found')
    expect(result.status).toBe(404)
  })

  it('sukses: status, metode, dan instruksi ikut diterjemahkan', async () => {
    fetchMock.mockResolvedValue(
      jsonResponse({
        status_code: '200',
        transaction_status: 'settlement',
        fraud_status: 'accept',
        payment_type: 'bank_transfer',
        transaction_id: 'tx-va-1',
        gross_amount: '109000.00',
        va_numbers: [{ bank: 'bca', va_number: '80776140975980277315570' }],
      }),
    )
    const result = await fetchTransactionStatus('subscribe-abc-1', paymentMethod('bca-va')!)
    expect(lastCall().url).toBe('https://api.sandbox.midtrans.com/v2/subscribe-abc-1/status')
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.value.state).toBe('settled')
    expect(result.value.method).toBe('bca-va')
    expect(result.value.transactionId).toBe('tx-va-1')
    expect(result.value.instructions).toMatchObject({ channel: 'va', bank: 'bca' })
  })

  it('tanpa `method`: statusnya tetap terbaca, instruksi tidak digambar', async () => {
    fetchMock.mockResolvedValue(
      jsonResponse({ status_code: '200', transaction_status: 'pending', payment_type: 'gopay', gross_amount: '6000.00' }),
    )
    const result = await fetchTransactionStatus('subscribe-abc-1')
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.value.state).toBe('pending')
    expect(result.value.method).toBe('gopay')
    expect(result.value.instructions).toBeNull()
  })

  it('tanpa kunci: 503 not-configured dan tidak memanggil provider', async () => {
    delete process.env.MIDTRANS_SERVER_KEY
    const result = await fetchTransactionStatus('subscribe-abc-1')
    expect(result).toEqual({ ok: false, reason: 'not-configured', status: 503, message: 'Pembayaran belum aktif.' })
    expect(fetchMock).not.toHaveBeenCalled()
  })
})

describe('cancelTransaction', () => {
  it('true saat provider menerima pembatalan', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ status_code: '200', transaction_status: 'cancel' }))
    expect(await cancelTransaction('subscribe-abc-1')).toBe(true)
    expect(lastCall().url).toBe('https://api.sandbox.midtrans.com/v2/subscribe-abc-1/cancel')
  })

  it('false saat gagal — pemanggil tidak boleh menganggap tagihan sudah mati', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ status_code: '412', status_message: 'Transaction cannot be canceled' }, 412))
    expect(await cancelTransaction('subscribe-abc-1')).toBe(false)
  })

  it('tanpa kunci: false tanpa memanggil provider', async () => {
    delete process.env.MIDTRANS_SERVER_KEY
    expect(await cancelTransaction('subscribe-abc-1')).toBe(false)
    expect(fetchMock).not.toHaveBeenCalled()
  })
})
