'use client'

import { readBudgets } from '@/lib/budget-storage'
import { periodWindowForTab, spentForBudget } from '@/lib/data/budget'
import { localISODate } from '@/lib/time'
import { getMoneySnapshot, recordedTransactions } from './store'
import { notifyBudgetThreshold } from './notification-events'

/* ── PERINGATAN BUDGET DI LONCENG (80% & 100%) ────────────────────────────────
   Dipanggil SETELAH pengeluaran benar-benar tertulis. Ambangnya sengaja dua,
   seperti yang diminta produk:

     · 80%  → "hampir habis" (masih ada ruang, tapi perlu dilihat)
     · 100% → "terlampaui"

   Angkanya dihitung dengan helper yang SAMA dengan halaman /budget
   (`spentForBudget` + jendela periode), jadi notifikasi tidak pernah
   bertentangan dengan progres yang dibaca user. Satu kategori hanya punya satu
   item per ambang per bulan (`notifyBudgetThreshold` memakai id stabil). */

export function syncBudgetThresholds(): void {
  const budgets = readBudgets()
  if (budgets.length === 0) return
  const ledger = recordedTransactions(getMoneySnapshot())
  /* Tanggal NYATA perangkat — dulu di sini dipakai jangkar seed `TODAY_ISO`
     (2026-09-28), jadi pengeluaran hari ini jatuh di luar jendela periode dan
     ambang 80/100% TIDAK PERNAH tercapai walau kartu budget sudah 110%. */
  const today = localISODate()
  for (const budget of budgets) {
    if (!budget || !budget.category || budget.limit <= 0) continue
    const window = periodWindowForTab(budget.period, today)
    const spent = spentForBudget(budget, ledger, window)
    const percent = Math.round((spent / budget.limit) * 100)
    notifyBudgetThreshold(budget.category, percent)
  }
}
