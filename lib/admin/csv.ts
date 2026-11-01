import { planById } from '@/lib/data/pricing'
import { paymentStatusGroup, planLabelOf } from './filters'
import { paymentMethodLabel } from './snapshot'
import type { AdminPaymentView, AdminUserRow } from './types'

/* ── EKSPOR CSV (pembukuan) ──────────────────────────────────────────────────
   Dua laporan yang dibutuhkan pemilik untuk pembukuan:

     1. Daftar user  → identitas + hitungan aktivitas + paket.
     2. Riwayat pembayaran → order, status, metode, nominal, paket.

   Aturan yang dipegang:
     · pemisah kolom koma, akhir baris CRLF (Excel & Google Sheets),
     · setiap sel dikutip bila perlu dan tanda kutip di-escape (""),
     · sel yang dimulai `=`, `+`, `-`, `@` diberi awalan `'` supaya tidak
       dieksekusi sebagai formula saat file dibuka (CSV injection),
     · TIDAK ADA isi catatan pribadi user di sini — sama seperti layarnya.
   ────────────────────────────────────────────────────────────────────────── */

/** satu sel CSV yang aman (kutip + anti-formula) */
export function csvCell(value: string | number | null | undefined): string {
  const raw = value === null || value === undefined ? '' : String(value)
  const guarded = /^[=+\-@]/.test(raw) ? `'${raw}` : raw
  return /[",\r\n]/.test(guarded) ? `"${guarded.replace(/"/g, '""')}"` : guarded
}

/** tabel string → teks CSV (CRLF) */
export function toCsv(rows: readonly (readonly (string | number | null | undefined)[])[]): string {
  return rows.map((row) => row.map(csvCell).join(',')).join('\r\n') + '\r\n'
}

const USER_HEADERS = [
  'user_id',
  'email',
  'nama',
  'terdaftar',
  'terakhir_aktif',
  'onboarding',
  'jumlah_dompet',
  'jumlah_transaksi',
  'paket',
  'periode',
  'mulai',
  'berakhir',
  'pemakaian_ai_bulan_ini',
  'token_bonus_ai',
] as const

function periodLabel(user: AdminUserRow): string {
  if (!user.plan.period) return ''
  if (user.plan.isLifetime) return 'selamanya'
  return '30 hari'
}

/** laporan Direktori User — HANYA hitungan, tanpa isi catatan pribadi */
export function usersCsv(users: readonly AdminUserRow[]): string {
  return toCsv([
    [...USER_HEADERS],
    ...users.map((user) => [
      user.id,
      user.email,
      user.name,
      user.createdAt ?? '',
      user.lastActiveAt ?? '',
      user.onboardingCompleted ? 'selesai' : 'belum',
      user.walletCount,
      user.transactionCount,
      planLabelOf(user.plan.planId),
      periodLabel(user),
      user.plan.startedAt ?? '',
      user.plan.expiresAt ?? '',
      user.aiCallsThisMonth,
      user.aiBonusTokens,
    ]),
  ])
}

const PAYMENT_HEADERS = [
  'order_id',
  'tanggal',
  'dibayar_pada',
  'email',
  'nama',
  'status',
  'kelompok_status',
  'metode',
  'tujuan',
  'paket',
  'periode',
  'nominal',
] as const

/** laporan riwayat pembayaran (uang masuk CatetInd) */
export function paymentsCsv(payments: readonly AdminPaymentView[]): string {
  return toCsv([
    [...PAYMENT_HEADERS],
    ...payments.map((payment) => [
      payment.orderId,
      payment.createdAt ?? '',
      payment.paidAt ?? '',
      payment.email,
      payment.name,
      payment.status,
      paymentStatusGroup(payment.status),
      paymentMethodLabel(payment.paymentMethod),
      payment.purpose ?? 'subscribe',
      planById(payment.planId)?.name ?? payment.tierName ?? '',
      payment.billingPeriod ?? '',
      payment.amount,
    ]),
  ])
}

/** nama file unduhan: `catetind-user-2026-11-01.csv` */
export function csvFileName(kind: 'user' | 'pembayaran', now = new Date()): string {
  const iso = `${now.getFullYear()}-${`${now.getMonth() + 1}`.padStart(2, '0')}-${`${now.getDate()}`.padStart(2, '0')}`
  return `catetind-${kind}-${iso}.csv`
}
