import { describe, expect, it } from 'vitest'
import {
  MAX_BATCH_SIZE,
  chunk,
  deliverPushes,
  pushPayload,
  safeInternalUrl,
  type OutboundPush,
} from './deliver'

/* ── PENGIRIMAN BERKELOMPOK & PEMBERSIHAN LANGGANAN MATI ─────────────────────
   Dua hal yang dikunci:

     1. kiriman TIDAK boleh berurutan (batas waktu fungsi serverless) dan TIDAK
        boleh menembak semuanya sekaligus (socket/memori habis) — kelompok kecil
        paralel, lalu tunggu seluruh kelompok selesai;
     2. endpoint yang dijawab 404/410 oleh layanan push dihapus dari database,
        sedangkan galat lain hanya dilaporkan (tidak menghapus langganan sah). */

function push(over: Partial<OutboundPush> = {}): OutboundPush {
  return {
    userId: 'u1',
    endpoint: 'https://push.example/1',
    kind: 'bills',
    title: 'Tagihan udah deket nih ⚡',
    body: 'Netflix jatuh tempo besok.',
    url: '/bills',
    tag: 'catetind-bills',
    ...over,
  }
}

describe('safeInternalUrl · notifikasi tidak boleh mengarah ke luar app', () => {
  it('menerima path internal', () => {
    expect(safeInternalUrl('/bills')).toBe('/bills')
    expect(safeInternalUrl('/history?tab=pekan')).toBe('/history?tab=pekan')
  })

  it('menolak URL absolut, protokol-relative, dan nilai bukan string', () => {
    expect(safeInternalUrl('https://jahat.example')).toBe('/')
    expect(safeInternalUrl('//jahat.example')).toBe('/')
    expect(safeInternalUrl(undefined)).toBe('/')
    expect(safeInternalUrl(42)).toBe('/')
  })
})

describe('pushPayload · bentuk yang dibaca public/sw.js', () => {
  it('membawa title, body, url, tag, dan kind', () => {
    const payload = JSON.parse(pushPayload(push())) as Record<string, unknown>
    expect(payload).toMatchObject({
      title: 'Tagihan udah deket nih ⚡',
      url: '/bills',
      tag: 'catetind-bills',
      kind: 'bills',
    })
  })

  it('memotong isi pesan yang kepanjangan (notifikasi bukan kanal bebas)', () => {
    const payload = JSON.parse(pushPayload(push({ body: 'x'.repeat(500) }))) as { body: string }
    expect(payload.body.length).toBeLessThanOrEqual(240)
  })
})

describe('chunk · ukuran kelompok', () => {
  it('memecah 25 item menjadi 10 · 10 · 5', () => {
    const sizes = chunk(Array.from({ length: 25 }, (_, i) => i), 10).map((batch) => batch.length)
    expect(sizes).toEqual([10, 10, 5])
  })

  it('membatasi ukuran kelompok maksimum', () => {
    expect(chunk(Array.from({ length: 60 }, (_, i) => i), 1000).map((b) => b.length)).toEqual([
      MAX_BATCH_SIZE,
      MAX_BATCH_SIZE,
      MAX_BATCH_SIZE - 15,
    ])
  })
})

describe('deliverPushes · paralel berkelompok', () => {
  it('menunggu SEMUA kelompok selesai dan tidak melewati batas paralel', async () => {
    const pushes = Array.from({ length: 25 }, (_, i) =>
      push({ userId: `u${i}`, endpoint: `https://push.example/${i}` }),
    )
    let active = 0
    let peak = 0
    const delivered: string[] = []

    const report = await deliverPushes(pushes, {
      batchSize: 10,
      send: async (item) => {
        active++
        peak = Math.max(peak, active)
        await new Promise((resolve) => setTimeout(resolve, 5))
        active--
        delivered.push(item.endpoint)
        return { ok: true }
      },
      drop: async () => {},
    })

    expect(delivered).toHaveLength(25)
    expect(peak).toBeLessThanOrEqual(10)
    expect(report.sent).toBe(25)
    expect(report.attempted).toBe(25)
    expect(report.sentUserIds).toHaveLength(25)
  })
})

describe('deliverPushes · langganan mati (404/410) dibersihkan', () => {
  it('410 dan 404 dihapus dari database, galat lain hanya dilaporkan', async () => {
    const dropped: string[] = []
    const report = await deliverPushes(
      [
        push({ endpoint: 'https://push.example/gone', userId: 'u-gone' }),
        push({ endpoint: 'https://push.example/notfound', userId: 'u-404' }),
        push({ endpoint: 'https://push.example/rusak', userId: 'u-500' }),
        push({ endpoint: 'https://push.example/ok', userId: 'u-ok' }),
      ],
      {
        batchSize: 4,
        send: async (item) => {
          if (item.endpoint.endsWith('/gone')) return { ok: false, statusCode: 410 }
          if (item.endpoint.endsWith('/notfound')) return { ok: false, statusCode: 404 }
          if (item.endpoint.endsWith('/rusak')) return { ok: false, statusCode: 500 }
          return { ok: true }
        },
        drop: async (item) => {
          dropped.push(item.endpoint)
        },
      },
    )

    expect(report.sent).toBe(1)
    expect(report.dropped).toBe(2)
    expect(report.failed).toBe(1)
    expect(dropped.sort()).toEqual([
      'https://push.example/gone',
      'https://push.example/notfound',
    ])
    expect(report.removedEndpoints.sort()).toEqual([
      'https://push.example/gone',
      'https://push.example/notfound',
    ])
    expect(report.failures).toEqual([
      { endpoint: 'https://push.example/rusak', statusCode: 500 },
    ])
  })

  it('pengirim yang melempar error tidak menghentikan kelompok lain', async () => {
    const report = await deliverPushes(
      [
        push({ endpoint: 'https://push.example/a', userId: 'a' }),
        push({ endpoint: 'https://push.example/b', userId: 'b' }),
      ],
      {
        batchSize: 2,
        send: async (item) => {
          if (item.endpoint.endsWith('/a')) throw new Error('jaringan putus')
          return { ok: true }
        },
        drop: async () => {},
      },
    )

    expect(report.attempted).toBe(2)
    expect(report.sent).toBe(1)
    expect(report.failed).toBe(1)
    expect(report.failures[0]).toEqual({ endpoint: 'https://push.example/a', statusCode: null })
  })
})
