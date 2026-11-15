/**
 * scripts/qa/cleanup.mjs — hapus SEMUA akun uji `@catetind.test` beserta datanya.
 *
 * Urutan:
 *   1. baris `purchases` pending milik akun uji (order Midtrans uji);
 *   2. dompet bersama milik akun uji (`joint_wallets` → cascade anggota,
 *      catatan, settlement, kode undangan);
 *   3. akun uji itu sendiri (cascade: wallets, ledger_rows, bills, goals,
 *      ai_usage, dst.).
 *
 * Pakai: node scripts/qa/cleanup.mjs
 */
import { deleteUserByEmail, listUsers, log, restService } from './harness.mjs'

const users = await listUsers()
const targets = users.filter((u) => (u?.email ?? '').toLowerCase().endsWith('@catetind.test'))
log(`Akun uji ditemukan: ${targets.length}`)

let purchases = 0
let jointWallets = 0
for (const user of targets) {
  const pending = await restService(`purchases?user_id=eq.${user.id}`, {
    method: 'DELETE',
    headers: { Prefer: 'return=representation' },
  })
  if (pending.ok && Array.isArray(pending.data)) purchases += pending.data.length

  const wallets = await restService(`joint_wallets?owner_id=eq.${user.id}&select=id`, { method: 'GET' })
  for (const wallet of Array.isArray(wallets.data) ? wallets.data : []) {
    const removed = await restService(`joint_wallets?id=eq.${wallet.id}`, {
      method: 'DELETE',
      headers: { Prefer: 'return=representation' },
    })
    if (removed.ok && Array.isArray(removed.data)) jointWallets += removed.data.length
  }
}
log(`Baris order pending dihapus: ${purchases} · dompet bersama dihapus: ${jointWallets}`)

let removed = 0
for (const user of targets) {
  const ok = await deleteUserByEmail(user.email)
  log(`  ${ok ? '✓' : '✗'} ${user.email}`)
  if (ok) removed += 1
}
const after = (await listUsers()).filter((u) => (u?.email ?? '').toLowerCase().endsWith('@catetind.test'))
log(`\nTerhapus ${removed}/${targets.length} · sisa akun uji: ${after.length}`)
if (after.length) process.exit(1)
