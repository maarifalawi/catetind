import { fetchTransactionStatus, midtransConfigured } from '@/lib/payments/midtrans'
import type { TransactionDetails } from '@/lib/payments/types'
import { hasSupabaseServiceRole, supabaseServiceKey } from '@/lib/supabase/config'
import { restConfigured, restFetch, restRpc } from '@/lib/supabase/rest'
import { isAmountMismatch } from './fulfillment'

/* ── REKONSILIASI PEMBAYARAN (paket 99) ──────────────────────────────────────
   SATU masalah yang diperbaiki file ini:

     user sudah membayar (Midtrans: `settlement`), tetapi `purchases.status`
     masih `pending` karena webhook tidak sampai — di localhost Midtrans memang
     tidak bisa menghubungi `http://localhost:3000/api/payment/webhook`, dan di
     produksi pun satu notifikasi bisa gagal terkirim. Akibatnya middleware
     menganggap user belum punya paket dan melemparnya ke `/checkout`, padahal
     uangnya sudah masuk. Tombol “Cek lagi” di `/checkout/selesai` tidak bisa
     menolong karena ia hanya membaca ulang DATABASE yang sama.

   Yang dilakukan sekarang: server bertanya ke MIDTRANS (`GET /v2/{order}/status`)
   untuk order milik pemanggil yang masih `pending`, lalu — kalau provider bilang
   lunas dan nominalnya cocok — memenuhi order itu lewat RPC yang SAMA dengan
   webhook (`catetind_fulfill_purchase`, kunci peran server). Jadi:

     · tidak ada jalur aktivasi kedua: RPC-nya idempoten & sudah dipakai webhook;
     · tidak ada klien yang bisa mengaktifkan dirinya: route memakai token user
       untuk MEMBACA order (RLS), lalu kunci server hanya untuk memenuhi order
       yang benar-benar sudah dibayar di provider;
     · nominal tetap dicocokkan (`expected_amount` vs `gross_amount`), sama
       seperti webhook — pembayaran yang nominalnya beda TIDAK dipenuhi;
     · kegagalan provider tidak pernah dianggap “belum bayar”; hasilnya
       dilaporkan apa adanya supaya UI bisa berkata jujur.

   Fungsi di sini TIDAK PERNAH melempar. Pemanggilnya route handler. */

/** status baris `purchases` yang berarti uang sudah diterima */
const SETTLED_STATUSES = new Set(['settlement', 'capture'])

/**
 * Jendela pencarian order `pending` saat pemanggil TIDAK menyebut order id.
 * Tagihan Midtrans kedaluwarsa dalam 60 menit; 48 jam sudah jauh lebih longgar
 * dari yang mungkin masih bisa dibayar, tetapi tetap membatasi jumlah request
 * provider pada riwayat lama.
 */
const RECONCILE_WINDOW_HOURS = 48

export interface PendingPurchaseRow {
  order_id?: string | null
  status?: string | null
  tier_name?: string | null
  billing_period?: string | null
  expected_amount?: number | string | null
  purpose?: string | null
  created_at?: string | null
}

/** alasan satu order tidak/belum dipenuhi — dibaca UI & log, bukan ditebak */
export type ReconcileReason =
  | 'fulfilled'
  | 'already-settled'
  | 'pending'
  | 'expired'
  | 'failed'
  | 'amount-mismatch'
  | 'not-configured'
  | 'service-role-missing'
  | 'provider-error'
  | 'rpc-failed'

export interface ReconcileOrderOutcome {
  orderId: string
  /** provider menyatakan uang sudah diterima */
  settled: boolean
  /** baris pembelian sudah dipenuhi (atau memang sudah dari awal) */
  fulfilled: boolean
  /** baris DB sudah `settlement` sebelum pemeriksaan ini */
  alreadySettled: boolean
  reason: ReconcileReason
}

export interface ReconcileCallerResult {
  ok: boolean
  /** jumlah order yang diperiksa (0 = tidak ada yang perlu dicocokkan) */
  checked: number
  /** order yang BARU dipenuhi pada pemanggilan ini */
  fulfilled: string[]
  outcomes: ReconcileOrderOutcome[]
  reason?: string
}

function expectedAmountOf(value: PendingPurchaseRow['expected_amount']): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : null
  }
  return null
}

/**
 * Cocokkan SATU order ke provider lalu penuhi kalau sudah lunas.
 *
 * `provider` boleh dioper kalau pemanggil sudah mengambil statusnya (route
 * `/api/payment/status` memang sudah melakukannya) supaya tidak ada dua request
 * Midtrans untuk order yang sama.
 */
export async function reconcileOrder({
  orderId,
  expectedAmount,
  purchaseStatus,
  provider,
}: {
  orderId: string
  /** nominal yang seharusnya ditagih (`purchases.expected_amount`) */
  expectedAmount?: number | null
  /** status baris `purchases` saat dibaca klien */
  purchaseStatus?: string | null
  /** hasil `fetchTransactionStatus()` yang sudah ada */
  provider?: TransactionDetails
}): Promise<ReconcileOrderOutcome> {
  const base: ReconcileOrderOutcome = {
    orderId,
    settled: false,
    fulfilled: false,
    alreadySettled: false,
    reason: 'pending',
  }

  if (purchaseStatus && SETTLED_STATUSES.has(purchaseStatus)) {
    return { ...base, settled: true, fulfilled: true, alreadySettled: true, reason: 'already-settled' }
  }

  if (!midtransConfigured()) return { ...base, reason: 'not-configured' }

  let detail = provider
  if (!detail) {
    const result = await fetchTransactionStatus(orderId)
    if (!result.ok) return { ...base, reason: 'provider-error' }
    detail = result.value
  }

  if (detail.state !== 'settled') {
    const reason: ReconcileReason =
      detail.state === 'expired' ? 'expired' : detail.state === 'failed' ? 'failed' : 'pending'

    /* Status TERMINAL (kedaluwarsa/ditolak/dibatalkan) dicatat lewat RPC yang
       sama dengan webhook — cabang non-settlement-nya hanya memperbarui status
       baris. Tanpa ini, baris `pending` yang sudah mati akan diperiksa ke
       Midtrans lagi pada setiap kunjungan/polling, selamanya. */
    if (
      (reason === 'expired' || reason === 'failed') &&
      hasSupabaseServiceRole() &&
      restConfigured()
    ) {
      const serviceKey = supabaseServiceKey()
      await restRpc(
        'catetind_fulfill_purchase',
        {
          p_order_id: orderId,
          p_status: detail.transactionStatus || (reason === 'expired' ? 'expire' : 'failure'),
          p_amount: 0,
          p_payment_method: detail.paymentType ?? null,
          p_midtrans_tx_id: detail.transactionId ?? null,
        },
        serviceKey,
        serviceKey,
      )
    }

    return { ...base, reason }
  }

  const settledBase: ReconcileOrderOutcome = { ...base, settled: true }

  /* Nominal: aturan yang SAMA dengan webhook. Nominal yang tidak bisa dibaca
     tidak dianggap mismatch (Midtrans tidak selalu mengirim gross_amount di
     balasan status), tetapi nominal yang JELAS beda tidak pernah dipenuhi. */
  if (isAmountMismatch(expectedAmount ?? null, detail.amount ?? Number.NaN)) {
    return { ...settledBase, reason: 'amount-mismatch' }
  }

  /* Pemenuhan menulis ke `user_subscriptions` & `ai_addons`; hanya kunci peran
     server yang boleh memanggil RPC-nya (lihat migrasi 20261011120000). */
  if (!hasSupabaseServiceRole() || !restConfigured()) {
    return { ...settledBase, reason: 'service-role-missing' }
  }

  const serviceKey = supabaseServiceKey()
  const result = await restRpc(
    'catetind_fulfill_purchase',
    {
      p_order_id: orderId,
      p_status: 'settlement',
      p_amount: Number.isFinite(detail.amount) ? Math.round(detail.amount as number) : 0,
      p_payment_method: detail.paymentType ?? null,
      p_midtrans_tx_id: detail.transactionId ?? null,
    },
    serviceKey,
    serviceKey,
  )

  if (!result.ok) return { ...settledBase, reason: 'rpc-failed' }
  return { ...settledBase, fulfilled: true, reason: 'fulfilled' }
}

/**
 * Cocokkan SEMUA pembelian `pending` milik pemanggil (maksimal `limit` yang
 * terbaru) ke Midtrans.
 *
 * `orderId` dioper kalau UI tahu order mana yang sedang ditunggu (halaman
 * `/checkout/selesai?order_id=…`); tanpa itu, semua pending terbaru diperiksa —
 * itulah yang dibutuhkan user yang membayar lalu langsung login lagi.
 *
 * Membaca `purchases` memakai TOKEN PEMANGGIL, jadi RLS `user_id = auth.uid()`
 * yang menentukan baris mana yang terlihat. Tidak ada `user_id` dari body.
 */
export async function reconcileCallerPurchases(
  token: string,
  { orderId, limit = 8 }: { orderId?: string | null; limit?: number } = {},
): Promise<ReconcileCallerResult> {
  const empty: ReconcileCallerResult = { ok: false, checked: 0, fulfilled: [], outcomes: [] }

  if (!restConfigured()) return { ...empty, reason: 'not-configured' }
  if (!midtransConfigured()) return { ...empty, reason: 'not-configured' }

  const query = new URLSearchParams({
    select: 'order_id,status,tier_name,billing_period,expected_amount,purpose,created_at',
    status: 'eq.pending',
    order: 'created_at.desc',
    limit: String(Math.min(Math.max(limit, 1), 20)),
  })
  if (orderId) {
    query.set('order_id', `eq.${orderId}`)
  } else {
    query.set(
      'created_at',
      `gte.${new Date(Date.now() - RECONCILE_WINDOW_HOURS * 60 * 60 * 1000).toISOString()}`,
    )
  }

  const found = await restFetch<PendingPurchaseRow[]>(`purchases?${query.toString()}`, {
    accessToken: token,
  })
  if (!found.ok) return { ...empty, reason: 'read-failed' }

  const rows = Array.isArray(found.data) ? found.data : []
  const outcomes: ReconcileOrderOutcome[] = []

  for (const row of rows) {
    const id = typeof row.order_id === 'string' ? row.order_id : ''
    if (!id) continue
    outcomes.push(
      await reconcileOrder({
        orderId: id,
        expectedAmount: expectedAmountOf(row.expected_amount),
        purchaseStatus: row.status ?? null,
      }),
    )
  }

  return {
    ok: true,
    checked: outcomes.length,
    fulfilled: outcomes
      .filter((outcome) => outcome.reason === 'fulfilled')
      .map((outcome) => outcome.orderId),
    outcomes,
  }
}


