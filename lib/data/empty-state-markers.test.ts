import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

/* ── PENJAGA EMPTY STATE (P1.3) ──────────────────────────────────────────────
   Setiap empty state yang tampil di layar wajib membawa kait
   `data-catetind-empty`. Tanpa kait itu, pemeriksaan browser harus menebak dari
   teks dan tidak bisa membedakan "kosong" dari "gagal memuat" — persis kesalahan
   yang pernah lolos di sesi sebelumnya. */

const MARKED = [
  'components/catetind/bills-screen.tsx',
  'components/catetind/history-screen.tsx',
  'components/catetind/wallet-detail-screen.tsx',
  'components/catetind/budget-zone-a.tsx',
  'components/catetind/budget-zone-b.tsx',
  'components/catetind/cash-flow-card.tsx',
  'components/catetind/recent-transactions-card.tsx',
  'components/catetind/cashflow-calendar-screen.tsx',
  'components/catetind/wealth-screen.tsx',
  'components/catetind/wealth-hutang.tsx',
  'components/catetind/wealth-investasi.tsx',
  'components/catetind/wealth-properti.tsx',
  'components/catetind/wealth-net-worth-bar.tsx',
  'components/catetind/goal-detail-screen.tsx',
  'components/catetind/my-goals-card.tsx',
  'components/catetind/weekly-recap-modal.tsx',
  'components/catetind/notification-bell.tsx',
  'components/catetind/category-search-results.tsx',
  'components/catetind/referral-screen.tsx',
  'components/catetind/joint-screen.tsx',
  'components/catetind/billing-panel.tsx',
]

describe('kait data-catetind-empty', () => {
  it.each(MARKED)('%s punya minimal satu kait', (file) => {
    expect(readFileSync(file, 'utf8')).toMatch(/data-catetind-empty/)
  })

  it('total kait mencakup seluruh permukaan kosong utama (≥ 24)', () => {
    const total = MARKED.reduce(
      (sum, file) =>
        sum + (readFileSync(file, 'utf8').match(/data-catetind-empty/g) ?? []).length,
      0,
    )
    expect(total).toBeGreaterThanOrEqual(24)
  })
})
