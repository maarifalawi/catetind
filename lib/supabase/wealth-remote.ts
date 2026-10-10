'use client'

import type { AssetTransaction, Debt, DebtPayment, Investment } from '@/lib/data/wealth'
import { browserSupabase } from './client'
import {
  toAssetTransaction,
  toAssetTransactionDbRow,
  toDebt,
  toDebtDbRow,
  toDebtPayment,
  toDebtPaymentDbRow,
  toInvestment,
  toInvestmentDbRow,
  toPriceTransactionDbRow,
  type AssetTransactionDbRow,
  type DebtDbRow,
  type DebtPaymentDbRow,
  type InvestmentDbRow,
} from './domain-mappers'

/* ── JALUR KEKAYAAN KE SERVER (paket 64 · Paket D) ───────────────────────────
   `/wealth` (investasi + hutang/piutang) dulu hanya hidup di perangkat. Sekarang,
   saat ada sesi Supabase, store MEMBACA `investments` + `asset_transactions`
   (harga pasar terakhir) + `debts` + view `debt_balances` (sisa) + `debt_payments`
   sebagai sumber, dan setiap penulisan dikirim ke sana.

   Semua fungsi TIDAK PERNAH `throw`: tanpa sesi/backend → `null`/`false`, dan
   store tetap jalan di jalur lokal. Id baris memakai uuid (`remoteId`), terpisah
   dari id domain lokal (`inv-6`, `debt-7`, `pay-8`). */

export interface RemoteWealth {
  investments: Investment[]
  debts: Debt[]
  payments: DebtPayment[]
  /** ledger beli/jual aset (riwayat per aset) — sumber NYATA, bukan konstanta mock */
  assetTransactions: AssetTransaction[]
}

/** harga pasar terakhir per aset (baris `kind='price'` terbaru menang) */
function latestPrices(rows: AssetTransactionDbRow[]): Map<string, { price: number; date: string }> {
  const map = new Map<string, { price: number; date: string }>()
  for (const row of rows) {
    if (!row?.investment_id || map.has(row.investment_id)) continue
    map.set(row.investment_id, { price: Number(row.price) || 0, date: row.date })
  }
  return map
}

/** baca seluruh kekayaan milik pemanggil; `null` = tanpa sesi/backend atau gagal */
export async function readRemoteWealth(): Promise<RemoteWealth | null> {
  const client = browserSupabase()
  if (!client) return null
  try {
    const { data: session } = await client.auth.getSession()
    if (!session.session?.access_token) return null

    const [invRes, priceRes, txRes, debtRes, balRes, payRes] = await Promise.all([
      client.from('investments').select('*').order('created_at', { ascending: true }).limit(200),
      client
        .from('asset_transactions')
        .select('*')
        .eq('kind', 'price')
        .order('date', { ascending: false })
        .order('created_at', { ascending: false })
        .limit(400),
      client
        .from('asset_transactions')
        .select('*')
        .in('kind', ['buy', 'sell'])
        .order('date', { ascending: false })
        .order('created_at', { ascending: false })
        .limit(400),
      client.from('debts').select('*').order('created_at', { ascending: true }).limit(200),
      client.from('debt_balances').select('debt_id,remaining'),
      client.from('debt_payments').select('*').order('paid_at', { ascending: false }).limit(400),
    ])

    /* satu tabel inti gagal dibaca = bacaan ini tidak sah → jalur lokal */
    if (invRes.error || debtRes.error) return null

    const priceByAsset = latestPrices((priceRes.data ?? []) as AssetTransactionDbRow[])
    const investments = ((invRes.data ?? []) as InvestmentDbRow[])
      .filter((row) => Boolean(row?.id))
      .map((row) => {
        const last = priceByAsset.get(row.id)
        return last ? toInvestment(row, { currentPrice: last.price, lastUpdate: last.date }) : toInvestment(row)
      })

    const remainingById = new Map(
      ((balRes.data ?? []) as { debt_id: string; remaining: number | string }[]).map((row) => [
        row.debt_id,
        Number(row.remaining) || 0,
      ]),
    )
    const debts = ((debtRes.data ?? []) as DebtDbRow[])
      .filter((row) => Boolean(row?.id))
      .map((row) => toDebt(row, remainingById.get(row.id) ?? 0))

    const payments = ((payRes.data ?? []) as DebtPaymentDbRow[])
      .filter((row) => Boolean(row?.id))
      .map((row) => toDebtPayment(row))

    const assetTransactions = ((txRes.data ?? []) as AssetTransactionDbRow[])
      .filter((row) => Boolean(row?.investment_id))
      .map((row) => toAssetTransaction(row))

    return { investments, debts, payments, assetTransactions }
  } catch {
    return null
  }
}

/* ── TULIS (fire-and-forget; store sudah menulis lokal lebih dulu) ─────────── */

async function upsert(table: string, body: Record<string, unknown>): Promise<boolean> {
  const client = browserSupabase()
  if (!client) return false
  try {
    const { error } = await client.from(table).upsert(body, { onConflict: 'id' })
    return !error || error.code === '23505'
  } catch {
    return false
  }
}

export async function pushInvestmentToServer(inv: Investment, remoteId: string): Promise<boolean> {
  return upsert('investments', { ...toInvestmentDbRow(inv, remoteId) })
}

/** kirim koreksi harga sebagai baris `asset_transactions` kind 'price' */
export async function pushPriceToServer(
  inv: Investment,
  remoteId: string,
  clientTxId: string,
  dateISO: string,
): Promise<boolean> {
  const client = browserSupabase()
  if (!client) return false
  try {
    const { error } = await client
      .from('asset_transactions')
      .insert({ ...toPriceTransactionDbRow({ ...inv, id: remoteId }, clientTxId, dateISO) })
    return !error || error.code === '23505'
  } catch {
    return false
  }
}

export async function pushAssetTransactionToServer(
  tx: AssetTransaction,
  investmentRemoteId: string,
  clientTxId: string,
): Promise<boolean> {
  const client = browserSupabase()
  if (!client) return false
  try {
    const { error } = await client
      .from('asset_transactions')
      .insert({ ...toAssetTransactionDbRow(tx, investmentRemoteId, clientTxId) })
    return !error || error.code === '23505'
  } catch {
    return false
  }
}

export async function deleteRemoteInvestment(remoteId: string): Promise<boolean> {
  const client = browserSupabase()
  if (!client) return false
  try {
    const { error } = await client.from('investments').delete().eq('id', remoteId)
    return !error
  } catch {
    return false
  }
}

export async function pushDebtToServer(debt: Debt, remoteId: string): Promise<boolean> {
  const client = browserSupabase()
  if (!client) return false
  try {
    const { error } = await client
      .from('debts')
      .upsert(toDebtDbRow(debt, remoteId), { onConflict: 'id' })
    return !error || error.code === '23505'
  } catch {
    return false
  }
}

export async function deleteRemoteDebt(remoteId: string): Promise<boolean> {
  const client = browserSupabase()
  if (!client) return false
  try {
    const { error } = await client.from('debts').delete().eq('id', remoteId)
    return !error
  } catch {
    return false
  }
}

export async function pushPaymentToServer(
  payment: DebtPayment,
  remoteId: string,
): Promise<boolean> {
  const client = browserSupabase()
  if (!client) return false
  try {
    const { error } = await client
      .from('debt_payments')
      .upsert(toDebtPaymentDbRow(payment, remoteId), { onConflict: 'id' })
    return !error || error.code === '23505'
  } catch {
    return false
  }
}

