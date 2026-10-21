import { beforeEach, describe, expect, it, vi, type Mock } from 'vitest'

vi.mock('@/lib/payments/midtrans', () => ({
  midtransConfigured: vi.fn(),
  fetchTransactionStatus: vi.fn(),
}))
vi.mock('@/lib/supabase/config', () => ({
  hasSupabaseServiceRole: vi.fn(),
  supabaseServiceKey: vi.fn(),
}))
vi.mock('@/lib/supabase/rest', () => ({
  restConfigured: vi.fn(),
  restFetch: vi.fn(),
  restRpc: vi.fn(),
}))

import { fetchTransactionStatus, midtransConfigured } from '@/lib/payments/midtrans'
import type { TransactionDetails } from '@/lib/payments/types'
import { hasSupabaseServiceRole, supabaseServiceKey } from '@/lib/supabase/config'
import { restConfigured, restFetch, restRpc } from '@/lib/supabase/rest'
import { reconcileCallerPurchases, reconcileOrder } from './reconcile'

/* ── REKONSILIASI PEMBAYARAN (paket 99) ──────────────────────────────────────
   Yang dikunci di sini adalah aturan yang paling mahal kalau salah:

     · order yang BELUM lunas tidak pernah dipenuhi;
     · nominal yang beda tidak pernah dipenuhi (sama seperti webhook);
     · tanpa kunci peran server, TIDAK ada klaim “sudah aktif”;
     · pembacaan order memakai token PEMANGGIL (RLS), bukan kunci server;
     · pemenuhan memakai RPC yang sama dengan webhook, idempoten. */

const midtransOn = midtransConfigured as unknown as Mock
const status = fetchTransactionStatus as unknown as Mock
const serviceRole = hasSupabaseServiceRole as unknown as Mock
const serviceKey = supabaseServiceKey as unknown as Mock
const restOn = restConfigured as unknown as Mock
const readRest = restFetch as unknown as Mock
const rpc = restRpc as unknown as Mock

const ORDER = 'subscribe-a1b2c3d4-1750000000000'
const KEY = 'service-key-untuk-test-1234567890'

function provider(overrides: Partial<TransactionDetails> = {}): TransactionDetails {
  return {
    orderId: ORDER,
    state: 'settled',
    transactionStatus: 'settlement',
    fraudStatus: 'accept',
    paymentType: 'gopay',
    method: 'gopay',
    transactionId: 'tx-1',
    amount: 1,
    expiresAt: null,
    instructions: null,
    ...overrides,
  }
}

beforeEach(() => {
  vi.clearAllMocks()
  midtransOn.mockReturnValue(true)
  restOn.mockReturnValue(true)
  serviceRole.mockReturnValue(true)
  serviceKey.mockReturnValue(KEY)
  status.mockResolvedValue({ ok: true, value: provider() })
  readRest.mockResolvedValue({ ok: true, status: 200, data: [] })
  rpc.mockResolvedValue({ ok: true, status: 200, data: [] })
})

describe('reconcileOrder', () => {
  it('baris DB sudah settlement → tidak memanggil provider / RPC sama sekali', async () => {
    const outcome = await reconcileOrder({
      orderId: ORDER,
      expectedAmount: 1,
      purchaseStatus: 'settlement',
    })

    expect(outcome).toMatchObject({ alreadySettled: true, fulfilled: true, reason: 'already-settled' })
    expect(status).not.toHaveBeenCalled()
    expect(rpc).not.toHaveBeenCalled()
  })

  it('provider belum lunas → tidak memenuhi', async () => {
    const outcome = await reconcileOrder({
      orderId: ORDER,
      expectedAmount: 1,
      purchaseStatus: 'pending',
      provider: provider({ state: 'pending', transactionStatus: 'pending' }),
    })

    expect(outcome).toMatchObject({ settled: false, fulfilled: false, reason: 'pending' })
    expect(rpc).not.toHaveBeenCalled()
  })

  it('tagihan kedaluwarsa → reason expired DAN status terminal dicatat (tidak di-poll selamanya)', async () => {
    const outcome = await reconcileOrder({
      orderId: ORDER,
      expectedAmount: 1,
      provider: provider({ state: 'expired', transactionStatus: 'expire' }),
    })

    expect(outcome).toMatchObject({ settled: false, fulfilled: false, reason: 'expired' })
    expect(rpc).toHaveBeenCalledWith(
      'catetind_fulfill_purchase',
      expect.objectContaining({ p_order_id: ORDER, p_status: 'expire', p_amount: 0 }),
      KEY,
      KEY,
    )
  })

  it('nominal provider BEDA dari yang seharusnya → tidak dipenuhi', async () => {
    const outcome = await reconcileOrder({
      orderId: ORDER,
      expectedAmount: 129_000,
      provider: provider({ amount: 1 }),
    })

    expect(outcome).toMatchObject({ settled: true, fulfilled: false, reason: 'amount-mismatch' })
    expect(rpc).not.toHaveBeenCalled()
  })

  it('lunas + nominal cocok → RPC pemenuhan dipanggil dengan kunci peran server', async () => {
    const outcome = await reconcileOrder({
      orderId: ORDER,
      expectedAmount: 1,
      provider: provider(),
    })

    expect(outcome).toMatchObject({ settled: true, fulfilled: true, reason: 'fulfilled' })
    expect(rpc).toHaveBeenCalledTimes(1)
    expect(rpc).toHaveBeenCalledWith(
      'catetind_fulfill_purchase',
      {
        p_order_id: ORDER,
        p_status: 'settlement',
        p_amount: 1,
        p_payment_method: 'gopay',
        p_midtrans_tx_id: 'tx-1',
      },
      KEY,
      KEY,
    )
  })

  it('tanpa kunci peran server → TIDAK mengaku sudah dipenuhi', async () => {
    serviceRole.mockReturnValue(false)

    const outcome = await reconcileOrder({
      orderId: ORDER,
      expectedAmount: 1,
      provider: provider(),
    })

    expect(outcome).toMatchObject({ settled: true, fulfilled: false, reason: 'service-role-missing' })
    expect(rpc).not.toHaveBeenCalled()
  })

  it('RPC gagal → jujur “rpc-failed”, bukan fulfilled', async () => {
    rpc.mockResolvedValue({ ok: false, status: 500, data: null, error: 'db' })

    const outcome = await reconcileOrder({
      orderId: ORDER,
      expectedAmount: 1,
      provider: provider(),
    })

    expect(outcome).toMatchObject({ settled: true, fulfilled: false, reason: 'rpc-failed' })
  })

  it('nominal pembelian tidak diketahui (baris lama) → tidak menuduh mismatch', async () => {
    const outcome = await reconcileOrder({
      orderId: ORDER,
      expectedAmount: null,
      provider: provider({ amount: 129_000 }),
    })

    expect(outcome.reason).toBe('fulfilled')
  })
})

describe('reconcileCallerPurchases', () => {
  it('membaca order pending dengan TOKEN PEMANGGIL, lalu memenuhi yang lunas', async () => {
    readRest.mockResolvedValue({
      ok: true,
      status: 200,
      data: [{ order_id: ORDER, status: 'pending', expected_amount: 1 }],
    })
    status.mockResolvedValue({ ok: true, value: provider() })

    const result = await reconcileCallerPurchases('token-user', { orderId: ORDER })

    expect(result).toMatchObject({ ok: true, checked: 1, fulfilled: [ORDER] })
    const [path, options] = readRest.mock.calls[0] as [string, { accessToken: string }]
    expect(path).toContain('purchases?')
    expect(path).toContain('status=eq.pending')
    expect(path).toContain(`order_id=eq.${ORDER}`)
    expect(options.accessToken).toBe('token-user')
    expect(rpc).toHaveBeenCalledTimes(1)
  })

  it('tidak ada order pending → nol pemeriksaan, tidak menghubungi Midtrans', async () => {
    const result = await reconcileCallerPurchases('token-user')

    expect(result).toMatchObject({ ok: true, checked: 0, fulfilled: [] })
    expect(status).not.toHaveBeenCalled()
  })

  it('tanpa order_id: hanya pending dalam jendela 48 jam yang dicari', async () => {
    await reconcileCallerPurchases('token-user')

    const [path] = readRest.mock.calls[0] as [string]
    expect(path).toContain('created_at=gte.')
  })

  it('gagal membaca purchases → ok:false (bukan “tidak punya pembayaran”)', async () => {
    readRest.mockResolvedValue({ ok: false, status: 500, data: null, error: 'db' })

    const result = await reconcileCallerPurchases('token-user')

    expect(result).toMatchObject({ ok: false, checked: 0, reason: 'read-failed' })
  })

  it('Midtrans belum dikonfigurasi → tidak ada klaim apa pun', async () => {
    midtransOn.mockReturnValue(false)

    const result = await reconcileCallerPurchases('token-user')

    expect(result).toMatchObject({ ok: false, reason: 'not-configured' })
    expect(readRest).not.toHaveBeenCalled()
  })
})


