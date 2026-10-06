/* ── MAPPER DOMAIN PAKET D (paket 64) ────────────────────────────────────────
   Empat store perangkat (kekayaan, celengan, tagihan, kantong bersama)
   dipindahkan ke Supabase. Database memakai `snake_case` + kolom yang LEBIH
   SEDIKIT daripada bentuk domain (mis. tabel `investments` tidak punya kolom
   `symbol`/`current_price`/`scope`), jadi pemetaannya dikumpulkan di SATU file
   murni (tanpa React, tanpa jaringan) dan diuji dua arah
   (`lib/supabase/domain-mappers.test.ts`).

   ATURAN JUJUR (ditulis apa adanya, bukan disembunyikan):
     · Kolom yang memang TIDAK ada di skema kanon (`scope`, `emoji`, `notes`,
       `symbol`, `is_paid_this_month`) TIDAK dikarang di server. Saat membaca,
       nilai itu diambil dari `overlay` (baris lokal perangkat yang sudah punya
       nilainya) atau jatuh ke default yang paling konservatif.
     · Nilai TURUNAN (currentValue = units × harga pasar terakhir, remaining =
       principal − Σ cicilan) dihitung di sini dari data yang ada, bukan disimpan
       sebagai kolom — sama seperti aturan skema ("tidak ada kolom saldo bebas").
     · `id` domain untuk celengan numerik diambil dari uuid lewat
       `numericIdFromUuid()` (STABIL antar perangkat), sisanya memakai uuid apa
       adanya. */

import { plantStageFrom } from '@/lib/data/budget'
import type { BudgetScope, FundContribution, SinkingFundItem } from '@/lib/data/budget'
import type { Bill } from '@/lib/data/bills'
import type {
  AssetType,
  Debt,
  DebtDirection,
  DebtPayment,
  DebtStatus,
  DebtType,
  Investment,
} from '@/lib/data/wealth'

/* ── HELPER ───────────────────────────────────────────────────────────────── */

/** angka dari PostgREST bisa datang sebagai string (bigint/numeric) → integer */
function intOf(value: number | string | null | undefined): number {
  const parsed = typeof value === 'string' ? Number(value) : (value ?? 0)
  return Number.isFinite(parsed) ? Math.round(parsed) : 0
}

/** angka pecahan (units numeric(20,6)) → number, tanpa pembulatan */
function floatOf(value: number | string | null | undefined): number {
  const parsed = typeof value === 'string' ? Number(value) : (value ?? 0)
  return Number.isFinite(parsed) ? parsed : 0
}

/** `''` ⇄ NULL: kolom opsional di database, string kosong di domain */
export function nullIfEmpty(value: string | undefined | null): string | null {
  return value && value.length > 0 ? value : null
}

/** tanggal `YYYY-MM-DD` → nomor hari (1–31); `undefined` = tidak ada */
export function dayOfDate(value: string | null | undefined): number | undefined {
  if (!value) return undefined
  const day = Number(value.slice(8, 10))
  return Number.isFinite(day) && day >= 1 && day <= 31 ? day : undefined
}

/** nomor hari (1–31) → tanggal pada bulan berjalan; `null` = tanpa jatuh tempo */
export function dateOfDay(day: number | undefined, today: Date = new Date()): string | null {
  if (!day || day < 1 || day > 31) return null
  const month = String(today.getMonth() + 1).padStart(2, '0')
  return `${today.getFullYear()}-${month}-${String(day).padStart(2, '0')}`
}

/**
 * Id numerik STABIL dari uuid (dipakai celengan/setoran yang domain-nya
 * `number`). Mengambil 12 heks pertama (48 bit < 2^53) supaya:
 *   · tidak pernah bertabrakan dengan id seed/pre-hidrasi yang kecil (1…1e6+n);
 *   · sama di SEMUA perangkat (deterministik) — jadi baris yang sama selalu
 *     punya id domain yang sama tanpa perlu tabel pemetaan di server.
 */
export function numericIdFromUuid(uuid: string): number {
  const hex = uuid.replace(/[^0-9a-fA-F]/g, '').slice(0, 12)
  const parsed = parseInt(hex, 16)
  return Number.isFinite(parsed) ? parsed : 0
}

/* ── 1. INVESTASI (`investments` + `asset_transactions`) ──────────────────── */

export const ASSET_TYPES: AssetType[] = ['mutual_fund', 'stock', 'crypto', 'gold']

export interface InvestmentDbRow {
  id: string
  user_id?: string
  name: string
  asset_class?: string | null
  platform?: string | null
  units: number | string
  avg_price: number | string
  created_at?: string | null
  updated_at?: string | null
}

export interface AssetTransactionDbRow {
  id?: string
  user_id?: string
  investment_id: string
  kind: 'buy' | 'sell' | 'price'
  units: number | string
  price: number | string
  amount: number | string
  date: string
  note?: string
  client_tx_id: string
}

/** `asset_class` tak dikenal jatuh ke 'mutual_fund' (paling umum), bukan ditebak liar */
export function toAssetType(value: string | null | undefined): AssetType {
  return ASSET_TYPES.includes(value as AssetType) ? (value as AssetType) : 'mutual_fund'
}

/**
 * Baris `investments` → `Investment`.
 *
 * `currentPrice`/`lastUpdate` dioper oleh pemanggil (`opts`) karena datang dari
 * baris `asset_transactions` kind 'price' terakhir / view `investment_values`,
 * bukan dari tabel `investments`. `symbol` diturunkan dari nama (sama seperti
 * saat store membuat aset baru), dan `scope` dari overlay lokal.
 */
export function toInvestment(
  row: InvestmentDbRow,
  opts: { currentPrice?: number; lastUpdate?: string; scope?: BudgetScope } = {},
): Investment {
  const name = row.name ?? ''
  const quantity = floatOf(row.units)
  const avgBuyPrice = intOf(row.avg_price)
  const currentPrice = Number.isFinite(opts.currentPrice) ? Number(opts.currentPrice) : avgBuyPrice
  return {
    id: row.id,
    type: toAssetType(row.asset_class),
    name,
    symbol: name.slice(0, 6).toUpperCase(),
    quantity,
    avgBuyPrice,
    currentPrice,
    totalInvested: Math.round(quantity * avgBuyPrice),
    currentValue: Math.round(quantity * currentPrice),
    lastUpdate: opts.lastUpdate ?? row.updated_at ?? row.created_at ?? '',
    scope: opts.scope ?? 'pribadi',
  }
}

/** `Investment` → payload `investments` (tanpa `user_id`: RLS default auth.uid()) */
export function toInvestmentDbRow(inv: Investment, id = inv.id): InvestmentDbRow {
  return {
    id,
    name: inv.name,
    asset_class: inv.type,
    platform: null,
    units: inv.quantity,
    avg_price: Math.round(inv.avgBuyPrice),
  }
}

/** baris harga (`asset_transactions` kind 'price') — sumber `investment_values` */
export function toPriceTransactionDbRow(
  inv: Investment,
  clientTxId: string,
  dateISO: string,
): AssetTransactionDbRow {
  return {
    investment_id: inv.id,
    kind: 'price',
    units: inv.quantity,
    price: Math.round(inv.currentPrice),
    amount: Math.round(inv.quantity * inv.currentPrice),
    date: dateISO,
    note: 'Koreksi harga manual',
    client_tx_id: clientTxId,
  }
}

/* ── 2. UTANG/PIUTANG (`debts` + `debt_payments`) ─────────────────────────── */

export interface DebtDbRow {
  id: string
  user_id?: string
  direction: string
  type?: string | null
  counterparty?: string | null
  provider?: string | null
  principal: number | string
  monthly_installment?: number | string | null
  tenor?: number | string | null
  interest?: number | string | null
  due_date?: string | null
  status?: string | null
}

export interface DebtPaymentDbRow {
  id: string
  user_id?: string
  debt_id: string
  amount: number | string
  paid_at: string
  wallet_id?: string | null
  kind?: string | null
  cash_moved?: number | string | null
  change_amount?: number | string | null
  client_tx_id?: string | null
}

export function toDebtDirection(value: string | null | undefined): DebtDirection {
  return value === 'owed_to_me' ? 'owed_to_me' : 'owed_by_me'
}

export function toDebtType(value: string | null | undefined): DebtType {
  return value === 'platform' ? 'platform' : 'personal'
}

export function toDebtStatus(value: string | null | undefined): DebtStatus {
  return value === 'settled' ? 'settled' : 'active'
}

/**
 * Baris `debts` (+ sisa dari view `debt_balances`) → `Debt`.
 * `notes`/`currentMonth`/`scope` tidak ada di skema → diisi dari overlay lokal.
 */
export function toDebt(
  row: DebtDbRow,
  remaining: number,
  overlay: { notes?: string; currentMonth?: number; scope?: BudgetScope } = {},
): Debt {
  const principal = intOf(row.principal)
  const monthlyInstallment = intOf(row.monthly_installment)
  const tenor = row.tenor === null || row.tenor === undefined ? undefined : intOf(row.tenor)
  const interestRate =
    row.interest === null || row.interest === undefined ? undefined : Number(row.interest)
  const dueDate = dayOfDate(row.due_date)
  return {
    id: row.id,
    type: toDebtType(row.type),
    ...(row.provider ? { provider: row.provider } : {}),
    direction: toDebtDirection(row.direction),
    ...(row.counterparty ? { counterparty: row.counterparty } : {}),
    principal,
    remaining: Number.isFinite(remaining) ? Math.round(remaining) : principal,
    ...(overlay.notes ? { notes: overlay.notes } : {}),
    status: toDebtStatus(row.status),
    ...(tenor !== undefined ? { tenor } : {}),
    ...(overlay.currentMonth !== undefined ? { currentMonth: overlay.currentMonth } : {}),
    ...(monthlyInstallment > 0 ? { monthlyInstallment } : {}),
    ...(interestRate !== undefined ? { interestRate } : {}),
    ...(dueDate !== undefined ? { dueDate } : {}),
    scope: overlay.scope ?? 'pribadi',
  }
}

/** `Debt` → payload `debts` (id eksplisit supaya baris lokal & server sama id) */
export function toDebtDbRow(debt: Debt, id = debt.id): DebtDbRow {
  return {
    id,
    direction: debt.direction ?? 'owed_by_me',
    type: debt.type,
    counterparty: debt.counterparty ?? '',
    provider: nullIfEmpty(debt.provider),
    principal: Math.max(0, Math.round(debt.principal)),
    monthly_installment: Math.max(0, Math.round(debt.monthlyInstallment ?? 0)),
    tenor: debt.tenor ?? null,
    interest: debt.interestRate ?? null,
    due_date: dateOfDay(debt.dueDate),
    status: debt.status,
  }
}

/** Baris `debt_payments` → `DebtPayment` (`walletName` diambil dari overlay lokal) */
export function toDebtPayment(row: DebtPaymentDbRow, walletName = ''): DebtPayment {
  const cashMoved = intOf(row.cash_moved)
  const changeAmount = intOf(row.change_amount)
  return {
    id: row.id,
    debtId: row.debt_id,
    amount: intOf(row.amount),
    paidAtISO: row.paid_at,
    walletName,
    walletId: row.wallet_id ?? '',
    kind: row.kind === 'receivable' ? 'receivable' : 'debt',
    ...(cashMoved > 0 ? { cashMoved } : {}),
    ...(changeAmount > 0 ? { changeAmount } : {}),
  }
}

/** `DebtPayment` → payload `debt_payments` (id eksplisit + kunci idempotensi) */
export function toDebtPaymentDbRow(p: DebtPayment, id = p.id): DebtPaymentDbRow {
  return {
    id,
    debt_id: p.debtId,
    amount: Math.round(p.amount),
    paid_at: p.paidAtISO.slice(0, 10),
    wallet_id: nullIfEmpty(p.walletId),
    kind: p.kind,
    cash_moved: Math.round(p.cashMoved ?? p.amount),
    change_amount: Math.round(p.changeAmount ?? 0),
    client_tx_id: id,
  }
}

/* ── 3. TAGIHAN (`bills`) ─────────────────────────────────────────────────── */

export interface BillDbRow {
  id: string
  user_id?: string
  name: string
  amount: number | string
  due_day?: number | string | null
  category?: string | null
  wallet_id?: string | null
  active?: boolean | null
  remind_days?: number | string | null
}

/**
 * Baris `bills` → `Bill`.
 *
 * Kolom `emoji` & `is_paid_this_month` TIDAK ada di tabel `bills` (status bayar
 * diturunkan dari baris ledger, bukan disimpan). Karena itu keduanya diambil
 * dari `local` (baris perangkat yang sudah punya nilainya) atau default jujur:
 * emoji `''` dan belum dibayar bulan ini.
 */
export function toBill(row: BillDbRow, local?: Partial<Bill>): Bill {
  return {
    id: row.id,
    emoji: local?.emoji ?? '',
    name: row.name ?? '',
    amount: intOf(row.amount),
    dueDate:
      row.due_day === null || row.due_day === undefined
        ? (local?.dueDate ?? 1)
        : intOf(row.due_day),
    isRecurring: local?.isRecurring ?? true,
    category: row.category ?? local?.category ?? 'Lainnya',
    walletId: row.wallet_id ?? local?.walletId ?? '',
    isPaidThisMonth: local?.isPaidThisMonth ?? false,
    reminderDaysBefore:
      row.remind_days === null || row.remind_days === undefined
        ? (local?.reminderDaysBefore ?? 0)
        : intOf(row.remind_days),
    scope: local?.scope ?? 'pribadi',
    ...(local?.paidRowId ? { paidRowId: local.paidRowId } : {}),
    ...(local?.endAfterMonths !== undefined ? { endAfterMonths: local.endAfterMonths } : {}),
    ...(local?.currentMonth !== undefined ? { currentMonth: local.currentMonth } : {}),
  }
}

/** `Bill` → payload `bills` (`active` memetakan `isRecurring`) */
export function toBillDbRow(bill: Bill): BillDbRow {
  return {
    id: bill.id,
    name: bill.name,
    amount: Math.max(0, Math.round(bill.amount)),
    due_day: bill.dueDate >= 1 && bill.dueDate <= 31 ? bill.dueDate : null,
    category: nullIfEmpty(bill.category),
    wallet_id: nullIfEmpty(bill.walletId),
    active: bill.isRecurring,
    remind_days: Math.max(0, Math.round(bill.reminderDaysBefore)),
  }
}

/* ── 4. CELENGAN (`goals` + `goal_contributions`) ─────────────────────────── */

export interface GoalDbRow {
  id: string
  user_id?: string
  name: string
  target: number | string
  due_date?: string | null
  emoji?: string | null
  category?: string | null
  status?: string | null
}

export interface GoalContributionDbRow {
  id: string
  user_id?: string
  goal_id: string
  amount: number | string
  contributed_at: string
  wallet_id?: string | null
  client_tx_id?: string | null
}

/**
 * Baris `goals` (+ terkumpul dari view `goal_savings`) → `SinkingFundItem`.
 * `priority`/`scope`/`contributedThisMonth` tidak ada di skema → overlay lokal.
 */
export function toSinkingFund(
  row: GoalDbRow,
  saved: number,
  local?: Partial<SinkingFundItem>,
): SinkingFundItem {
  const target = intOf(row.target)
  const current = intOf(saved)
  return {
    id: numericIdFromUuid(row.id),
    name: row.name ?? '',
    target,
    current,
    deadline: row.due_date ?? local?.deadline ?? '',
    priority: local?.priority ?? 'sedang',
    stage: plantStageFrom(current, target),
    scope: local?.scope ?? 'pribadi',
    contributedThisMonth: local?.contributedThisMonth ?? false,
    remoteId: row.id,
  }
}

/** `SinkingFundItem` → payload `goals` (target > 0 dijamin skema) */
export function toGoalDbRow(fund: SinkingFundItem, id: string): GoalDbRow {
  return {
    id,
    name: fund.name,
    target: Math.max(1, Math.round(fund.target)),
    due_date: nullIfEmpty(fund.deadline),
    emoji: null,
    category: null,
    status: 'active',
  }
}

export function toFundContribution(row: GoalContributionDbRow): FundContribution {
  return {
    id: numericIdFromUuid(row.id),
    fundId: numericIdFromUuid(row.goal_id),
    date: row.contributed_at,
    amount: intOf(row.amount),
    walletId: row.wallet_id ?? '',
    remoteId: row.id,
  }
}

/** `FundContribution` → payload `goal_contributions` (butuh uuid goal induknya) */
export function toGoalContributionDbRow(
  c: FundContribution,
  goalRemoteId: string,
  id: string,
): GoalContributionDbRow {
  return {
    id,
    goal_id: goalRemoteId,
    amount: Math.round(c.amount),
    contributed_at: c.date,
    wallet_id: nullIfEmpty(c.walletId),
    client_tx_id: id,
  }
}



