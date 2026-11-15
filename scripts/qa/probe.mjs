/**
 * scripts/qa/probe.mjs — probe HTTP cepat (tanpa browser) untuk memeriksa
 * keputusan middleware terhadap satu akun uji.
 *
 * Pakai: node scripts/qa/probe.mjs --route=/joint --plan=free
 */
import {
  createUser,
  grantTier,
  passwordSession,
  sessionCookieValue,
  COOKIE_NAME,
  deleteUserByEmail,
  rest,
  log,
} from './harness.mjs'

const BASE = (process.argv.find((a) => a.startsWith('--base=')) ?? '--base=http://localhost:3000').slice(7)
const ROUTE = (process.argv.find((a) => a.startsWith('--route=')) ?? '--route=/joint').slice(8)
const PLAN = (process.argv.find((a) => a.startsWith('--plan=')) ?? '--plan=free').slice(7)

const stamp = Date.now().toString(36)
const user = { email: `qa.probe.${stamp}@catetind.test`, password: `Qa!${stamp}Zz9`, name: 'Probe' }
const auth = await createUser(user)
if (PLAN !== 'free') await grantTier(auth.id, PLAN)
const session = await passwordSession(user)

const cookie = `${COOKIE_NAME}=${encodeURIComponent(sessionCookieValue(session))}`
const res = await fetch(`${BASE}${ROUTE}`, { redirect: 'manual', headers: { cookie } })
log(`route      : ${ROUTE}`)
log(`plan       : ${PLAN}`)
log(`status     : ${res.status}`)
log(`location   : ${res.headers.get('location') ?? '-'}`)
const subs = await rest(session.access_token, 'user_subscriptions?select=*')
log(`subscription rows: ${JSON.stringify(subs.data)}`)

await deleteUserByEmail(user.email)
