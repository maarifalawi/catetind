import { describe, expect, it } from 'vitest'
import { ADMIN_COLUMNS, ADMIN_TABLES } from './columns'

/* ── PAGAR PRIVASI: KOLOM YANG DIBACA ────────────────────────────────────────
   Kalau ada yang menambahkan `note`, `description`, `amount`, `category`, atau
   `balance` ke SELECT transaksi/dompet, dashboard admin berubah menjadi alat
   mengintip catatan pribadi. Test ini mengunci janji privasi di tingkat query —
   bukan hanya di tingkat komentar.
   ────────────────────────────────────────────────────────────────────────── */

const PRIVATE_WORDS = ['description', 'note', 'notes', 'category', 'amount', 'balance']

describe('ADMIN_COLUMNS', () => {
  it('ledger_rows hanya dibaca untuk menghitung, tanpa isi transaksi', () => {
    const columns = ADMIN_COLUMNS.ledgerRows.toLowerCase()
    expect(columns).toContain('user_id')
    expect(columns).toContain('ai_generated')
    for (const word of PRIVATE_WORDS) {
      expect(columns.includes(word), word).toBe(false)
    }
  })

  it('dompet hanya dibaca id pemiliknya (tanpa saldo/nama dompet)', () => {
    expect(ADMIN_COLUMNS.wallets).toBe('user_id')
    expect(ADMIN_COLUMNS.bills).toBe('user_id')
    expect(ADMIN_COLUMNS.goals).toBe('user_id')
    expect(ADMIN_COLUMNS.jointMembers).toBe('user_id')
    expect(ADMIN_COLUMNS.debts).toBe('user_id')
    expect(ADMIN_COLUMNS.investments).toBe('user_id')
    expect(ADMIN_COLUMNS.physicalAssets).toBe('user_id')
  })

  it('pembelian membaca nominal & status yang memang dibutuhkan pembukuan', () => {
    const columns = ADMIN_COLUMNS.purchases
    expect(columns).toContain('price_paid')
    expect(columns).toContain('status')
    expect(columns).toContain('payment_method')
  })

  it('hanya membaca tabel yang terdaftar (tidak ada tabel "iseng")', () => {
    expect(ADMIN_TABLES).toContain('user_subscriptions')
    expect(ADMIN_TABLES).toContain('purchases')
    expect(ADMIN_TABLES).toContain('ledger_rows')
    expect(ADMIN_TABLES).not.toContain('push_subscriptions')
  })
})
