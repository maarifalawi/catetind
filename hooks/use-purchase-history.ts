'use client'

import { useCallback, useEffect, useState } from 'react'
import type { PurchaseHistoryItem } from '@/lib/subscription/purchases'

/* ── RIWAYAT PEMBAYARAN (klien) ──────────────────────────────────────────────
   Membaca `/api/billing/purchases` SETELAH mount (bukan saat render) supaya HTML
   server & render pertama klien identik — pola yang sama dengan
   `subscription-gate-provider` dan `useSessionUser`.

   Empat keadaan, semuanya jujur:
     · `loading`      → belum ada jawaban;
     · `ready`        → daftar apa adanya (boleh kosong = belum pernah bayar);
     · `unavailable`  → server pembayaran belum dikonfigurasi (tidak diklaim kosong);
     · `error`        → permintaan gagal (sesi/jaringan), user diminta muat ulang.

   Jangan pernah mengisi `items` dengan contoh di sini: komponen memakainya
   sebagai BUKTI pembayaran, bukan hiasan. */

export type PurchaseHistoryState =
  | { status: 'loading'; items: PurchaseHistoryItem[] }
  | { status: 'ready'; items: PurchaseHistoryItem[] }
  | { status: 'unavailable'; items: PurchaseHistoryItem[] }
  | { status: 'error'; items: PurchaseHistoryItem[] }

const LOADING: PurchaseHistoryState = { status: 'loading', items: [] }

interface PurchaseHistoryBody {
  ok?: boolean
  configured?: boolean
  purchases?: unknown
}

function isItemList(value: unknown): value is PurchaseHistoryItem[] {
  return (
    Array.isArray(value) &&
    value.every(
      (item) =>
        item !== null &&
        typeof item === 'object' &&
        typeof (item as { orderId?: unknown }).orderId === 'string' &&
        typeof (item as { label?: unknown }).label === 'string' &&
        typeof (item as { amount?: unknown }).amount === 'number',
    )
  )
}

export function usePurchaseHistory(): {
  state: PurchaseHistoryState
  reload: () => void
} {
  const [state, setState] = useState<PurchaseHistoryState>(LOADING)
  /** penanda permintaan terakhir — jawaban lama tidak boleh menimpa yang baru */
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    let active = true
    void fetch('/api/billing/purchases', { cache: 'no-store' })
      .then(async (res) => {
        const body = (await res.json().catch(() => null)) as PurchaseHistoryBody | null
        if (!active) return
        if (!res.ok || !body?.ok) {
          setState({ status: body?.configured === false ? 'unavailable' : 'error', items: [] })
          return
        }
        setState({
          status: 'ready',
          items: isItemList(body.purchases) ? body.purchases : [],
        })
      })
      .catch(() => {
        if (active) setState({ status: 'error', items: [] })
      })
    return () => {
      active = false
    }
  }, [attempt])

  const reload = useCallback(() => {
    setState(LOADING)
    setAttempt((value) => value + 1)
  }, [])

  return { state, reload }
}
