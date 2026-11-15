/**
 * scripts/qa/probe-dataapi.mjs — uji langsung `/api/data` (jalur server yang
 * dipakai store saat klien browser tidak punya sesi) untuk wallets + ledger_rows.
 */
import {
  COOKIE_NAME,
  createUser,
  grantTier,
  passwordSession,
  sessionCookieValue,
  deleteUserByEmail,
  log,
} from './harness.mjs'

const BASE = 'http://localhost:3000'
const stamp = Date.now().toString(36)
const user = { email: `qa.probe.${stamp}@catetind.test`, password: `Qa!${stamp}Zz9`, name: 'Probe' }
const auth = await createUser(user)
await grantTier(auth.id, 'waras')
const session = await passwordSession(user)
const cookie = `${COOKIE_NAME}=${encodeURIComponent(sessionCookieValue(session))}`

async function dataApi(body) {
  const res = await fetch(`${BASE}/api/data`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', cookie },
    body: JSON.stringify(body),
  })
  const text = await res.text()
  log(`${body.table}/${body.op} → ${res.status} ${text.slice(0, 300)}`)
  return { status: res.status, text }
}

const walletId = `w-${stamp}-probe`
await dataApi({
  table: 'wallets',
  op: 'upsert',
  onConflict: 'user_id,id',
  rows: [{ id: walletId, name: `Probe ${stamp}`, opening: 100000, kind: 'bank', context: 'pribadi' }],
})

await dataApi({
  table: 'ledger_rows',
  op: 'insert',
  rows: [
    {
      id: `session-9001-${stamp}`,
      wallet_id: walletId,
      type: 'expense',
      amount: 50000,
      date: '2026-11-14',
      note: 'Uji jalur server',
      category: 'Makan di Luar',
      client_tx_id: `tx-${stamp}`,
      ai_generated: false,
      time_label: '10:00',
      seq: 9001,
    },
  ],
})

await deleteUserByEmail(user.email)
