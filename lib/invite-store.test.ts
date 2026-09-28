import { beforeEach, describe, expect, it } from 'vitest'
import { DEMO_VALID_CODE, INVITE_TTL_MS } from './data/joint-invite'
import { INITIAL_JOINT_WALLET, JOINT_PARTNER } from './data/joint'
import {
  activeInviteFor,
  consumeInvite,
  createInvite,
  inviteRecords,
  resetInviteStore,
  resolveInvite,
} from './invite-store'

/* ── Test store undangan (paket 39) ──────────────────────────────────────────
   `lib/data/joint-invite.test.ts` menguji LOGIKA murninya; file ini menguji
   STORE-nya: aturan "satu kode aktif per dompet", kemungkinan membuka kode yang
   baru dibuat lewat /join, dan sekali pakai yang BERTAHAN — termasuk untuk kode
   seed demo, karena tautan review di kaki /join pun harus jujur.

   Catatan lingkungan: di Vitest tidak ada `window`, jadi `lib/invite-store.ts`
   jatuh ke cache memori modul (`globalThis`). Itu memang desainnya: bacaan aman
   untuk SSR, dan `resetInviteStore()` membuat tiap test mulai bersih. */

const WALLET_A = INITIAL_JOINT_WALLET.id
const WALLET_B = 'joint_2'
/* Waktu ikut jam mesin — bukan konstanta — karena SEED demo di
   `lib/data/joint-invite.ts` juga dibuat relatif terhadap `Date.now()`. Test yang
   butuh "lewat 24 jam" cukup menambah `INVITE_TTL_MS` ke nilai ini. */
const NOW = Date.now()

beforeEach(() => {
  resetInviteStore()
})

describe('createInvite · satu kode aktif per dompet', () => {
  it('dua dompet berbeda → dua kode berbeda yang keduanya bisa dibuka', () => {
    const a = createInvite(WALLET_A, NOW)
    const b = createInvite(WALLET_B, NOW)

    expect(a.code).not.toBe(b.code)
    expect(resolveInvite(a.code, NOW).status).toBe('valid')
    expect(resolveInvite(b.code, NOW).status).toBe('valid')
  })

  it('membuat kode baru mencabut kode lama dompet itu (bukan menumpuk)', () => {
    const first = createInvite(WALLET_A, NOW)
    const second = createInvite(WALLET_A, NOW + 1000)

    expect(resolveInvite(first.code, NOW + 2000).status).toBe('expired')
    expect(resolveInvite(second.code, NOW + 2000).status).toBe('valid')
    expect(activeInviteFor(WALLET_A, NOW + 2000)?.code).toBe(second.code)
  })

  it('kode dompet lain tidak dianggap aktif untuk dompet ini', () => {
    createInvite(WALLET_B, NOW)
    expect(activeInviteFor(WALLET_A, NOW)).toBeNull()
  })
})

describe('consumeInvite · sekali pakai bertahan', () => {
  it('kode yang sudah dipakai tidak bisa dibuka lagi (status used)', () => {
    const invite = createInvite(WALLET_A, NOW)
    expect(consumeInvite(invite.code, JOINT_PARTNER.id, NOW)?.usedBy).toBe(JOINT_PARTNER.id)
    expect(resolveInvite(invite.code, NOW).status).toBe('used')
    expect(consumeInvite(invite.code, 'user_lain', NOW)).toBeNull()
  })

  it('kode kedaluwarsa ditolak tanpa menandai apa pun', () => {
    const invite = createInvite(WALLET_A, NOW)
    expect(consumeInvite(invite.code, JOINT_PARTNER.id, NOW + INVITE_TTL_MS)).toBeNull()
    expect(resolveInvite(invite.code, NOW + INVITE_TTL_MS).status).toBe('expired')
  })

  it('kode seed demo yang dipakai berubah jadi used dan tidak balik valid lagi', () => {
    expect(resolveInvite(DEMO_VALID_CODE, NOW).status).toBe('valid')

    const consumed = consumeInvite(DEMO_VALID_CODE, JOINT_PARTNER.id, NOW)
    expect(consumed?.code).toBe(DEMO_VALID_CODE)
    /* record tersimpan menang atas seed yang di-generate ulang → tetap `used` */
    expect(resolveInvite(DEMO_VALID_CODE, NOW + 60_000).status).toBe('used')
    expect(inviteRecords().filter((record) => record.code === DEMO_VALID_CODE)).toHaveLength(1)
  })

  it('kode asing tetap ditolak & tidak muncul di store', () => {
    expect(consumeInvite('ZZZZZZ', JOINT_PARTNER.id, NOW)).toBeNull()
    expect(resolveInvite('ZZZZZZ', NOW).status).toBe('unknown')
  })
})
