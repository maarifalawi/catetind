import { AI_ADDON_PACKAGES } from '@/lib/ai-quota'
import { BILLING_COPY, planById } from '@/lib/data/pricing'
import { restConfigured, restFetch } from '@/lib/supabase/rest'
import { normalizeTier } from './plan'

/* ── RIWAYAT PEMBAYARAN PEMANGGIL (satu sumber, tanpa data contoh) ────────────
   Panel Pengaturan → Langganan dulu memajang TIGA baris kwitansi karangan
   (Paket Waras Rp 2, Top Up AI Rp 29.000, Paket Catet Aja Rp 1) yang sama untuk
   semua akun — termasuk akun yang baru dibuat dan belum pernah membayar
   sepeser pun. Untuk aplikasi uang, itu bukan "data contoh": itu bukti
   pembayaran palsu di layar user.

   Sekarang riwayat dibaca dari tabel `purchases` MILIK PEMANGGIL (RLS
   `user_id = auth.uid()` menyaring di database). Akibat yang harus diterima dan
   dinyatakan apa adanya di UI:
     · akun baru → daftar KOSONG (memang belum ada pembayaran);
     · backend belum dikonfigurasi → `configured:false` (tidak diklaim kosong);
     · query gagal → `ok:false` (bukan berarti "belum pernah bayar").

   Yang ditampilkan hanya yang benar-benar tercatat: nominal yang dibayar
   (`price_paid`, atau `expected_amount` selama masih pending), label paket dari
   `tier_name`/`addon_package_id`, dan status asli dari Midtrans.
   ────────────────────────────────────────────────────────────────────────── */

const PURCHASE_COLUMNS =
  'order_id,status,price_paid,expected_amount,payment_method,purpose,tier_name,billing_period,addon_package_id,created_at,paid_at'

/** status yang dipakai UI — turunan dari status mentah Midtrans/PostgREST */
export type PurchaseStatus = 'paid' | 'pending' | 'failed' | 'refunded'

export interface PurchaseHistoryItem {
  /** `order_id` Midtrans — sekaligus kunci unik baris di UI */
  orderId: string
  /** kapan pembayaran selesai (ISO); `null` selama belum lunas */
  paidAt: string | null
  /** kapan tagihan dibuat (ISO) — dasar urutan & tanggal yang ditampilkan */
  createdAt: string | null
  /** label siap-render, mis. "Paket Waras - Akses selamanya" */
  label: string
  /** nominal rupiah utuh */
  amount: number
  status: PurchaseStatus
  /** `payment_type` Midtrans mentah (qris, gopay, …) → label di UI */
  method: string | null
}

export interface PurchaseHistoryResult {
  /** backend Supabase terkonfigurasi? kalau false, jawabannya "tidak tahu" */
  configured: boolean
  /** false = query gagal; `items` kosong TIDAK berarti "belum pernah bayar" */
  ok: boolean
  items: PurchaseHistoryItem[]
}

interface PurchaseRow {
  order_id?: unknown
  status?: unknown
  price_paid?: unknown
  expected_amount?: unknown
  payment_method?: unknown
  purpose?: unknown
  tier_name?: unknown
  billing_period?: unknown
  addon_package_id?: unknown
  created_at?: unknown
  paid_at?: unknown
}

function text(value: unknown): string | null {
  return typeof value === 'string' && value.trim().length > 0 ? value : null
}

/** nominal yang benar-benar relevan: yang sudah dibayar, atau yang ditagih */
function amountOf(row: PurchaseRow): number {
  const paid = Math.round(Number(row.price_paid) || 0)
  if (paid > 0) return paid
  const expected = Math.round(Number(row.expected_amount) || 0)
  return expected > 0 ? expected : 0
}

/**
 * status mentah → tiga keadaan yang bisa dijelaskan ke user.
 *
 * `capture` ikut LUNAS karena Midtrans memakai status itu untuk kartu kredit
 * yang sudah terbayar (fraud `challenge` masih berstatus `pending` di sini),
 * dan `refund` sengaja dipisah supaya tidak terbaca sebagai pembelian sah.
 */
export function purchaseStatusOf(raw: unknown): PurchaseStatus {
  switch (text(raw)) {
    case 'settlement':
    case 'capture':
      return 'paid'
    case 'refund':
    case 'partial_refund':
      return 'refunded'
    case 'expire':
    case 'cancel':
    case 'deny':
    case 'failure':
      return 'failed'
    default:
      return 'pending'
  }
}

/** label baris: paket (dari `tier_name`) atau top up token (dari add-on id) */
export function purchaseLabelOf(row: PurchaseRow): string {
  if (text(row.purpose) === 'topup') {
    const addon = AI_ADDON_PACKAGES.find((pkg) => pkg.id === text(row.addon_package_id))
    return `Top Up AI Token - ${addon?.name ?? 'Token AI'}`
  }
  const planId = normalizeTier(text(row.tier_name))
  const name = (planId ? planById(planId)?.name : null) ?? 'Paket CatetInd'
  const period =
    text(row.billing_period) === 'monthly'
      ? BILLING_COPY.monthlyPeriod
      : BILLING_COPY.lifetimePeriod
  return `${name} - ${period}`
}

/** baris mentah → bentuk UI; baris rusak (tanpa order_id) dilewati */
export function purchaseHistoryFromRows(rows: readonly unknown[]): PurchaseHistoryItem[] {
  const items: PurchaseHistoryItem[] = []
  for (const raw of rows) {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) continue
    const row = raw as PurchaseRow
    const orderId = text(row.order_id)
    if (!orderId) continue
    items.push({
      orderId,
      paidAt: text(row.paid_at),
      createdAt: text(row.created_at),
      label: purchaseLabelOf(row),
      amount: amountOf(row),
      status: purchaseStatusOf(row.status),
      method: text(row.payment_method),
    })
  }
  return items
}

/** riwayat pembayaran akun pemanggil, terbaru dulu */
export async function readCallerPurchases(token: string): Promise<PurchaseHistoryResult> {
  if (!restConfigured()) return { configured: false, ok: false, items: [] }

  const res = await restFetch<PurchaseRow[]>(
    `purchases?select=${PURCHASE_COLUMNS}&order=created_at.desc&limit=50`,
    { accessToken: token },
  )
  if (!res.ok || !Array.isArray(res.data)) {
    return { configured: true, ok: false, items: [] }
  }
  return { configured: true, ok: true, items: purchaseHistoryFromRows(res.data) }
}
