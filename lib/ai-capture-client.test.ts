import { afterEach, describe, expect, it, vi } from 'vitest'
import { readExtractedTransaction, requestTextTransaction } from './ai-capture-client'
import type { ExtractedTransaction } from './transaction-ai'

/* Test ini mengunci KONTRAK jembatan klien (paket 101): route dipanggil dengan
   teks/sumber yang benar, balasan yang bentuknya asing tidak pernah dipercaya,
   dan kegagalan provider TIDAK melempar — pemanggil harus bisa jatuh ke parser
   aturan lokal tanpa kehilangan apa pun. */

const TRANSACTION: ExtractedTransaction = {
  source: 'voice',
  type: 'expense',
  name: 'Beli kopi',
  amount: 25000,
  category: 'Makanan',
  wallet: 'Tunai',
  date: '2026-10-30',
  confidence: 0.8,
  lowFields: [],
}

function stubFetch(impl: (url: string, init?: RequestInit) => Promise<unknown>) {
  const mock = vi.fn(impl)
  vi.stubGlobal('fetch', mock)
  return mock
}

afterEach(() => {
  vi.unstubAllGlobals()
  vi.clearAllMocks()
})

describe('readExtractedTransaction', () => {
  it('mengambil objek transaction dari balasan route', () => {
    expect(readExtractedTransaction({ ok: true, transaction: TRANSACTION })).toEqual(TRANSACTION)
  })

  it('balasan tanpa transaction / bentuk asing → null (bukan tebakan)', () => {
    expect(readExtractedTransaction(null)).toBeNull()
    expect(readExtractedTransaction({ ok: true })).toBeNull()
    expect(readExtractedTransaction({ transaction: 'bukan objek' })).toBeNull()
    expect(readExtractedTransaction({ transaction: null })).toBeNull()
  })
})

describe('requestTextTransaction', () => {
  it('mengirim transkrip + sumber ke /api/parse-voice', async () => {
    const fetchMock = stubFetch(async () => ({
      ok: true,
      json: async () => ({ ok: true, transaction: TRANSACTION }),
    }))

    const result = await requestTextTransaction('beli kopi 25 ribu', 'voice')

    expect(result?.amount).toBe(25000)
    expect(fetchMock).toHaveBeenCalledTimes(1)
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit]
    expect(url).toBe('/api/parse-voice')
    expect(init.method).toBe('POST')
    expect(JSON.parse(String(init.body))).toEqual({
      transcript: 'beli kopi 25 ribu',
      source: 'voice',
    })
  })

  it('provider menolak (403) → null, supaya pemanggil memakai aturan lokal', async () => {
    stubFetch(async () => ({ ok: false, json: async () => ({ error: 'terkunci' }) }))
    expect(await requestTextTransaction('kopi 25rb', 'chat')).toBeNull()
  })

  it('jaringan mati → null (tidak melempar)', async () => {
    stubFetch(async () => {
      throw new Error('offline')
    })
    expect(await requestTextTransaction('kopi 25rb', 'voice')).toBeNull()
  })
})
