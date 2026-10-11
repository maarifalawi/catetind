import { describe, expect, it } from 'vitest'
import { AI_BASE_TOKENS_TOTAL } from '../ai-quota'
import { REFERRAL_REWARD_TOKENS, getReferrerReward, referralRewardFor } from './referral'

/* ── REWARD REFERRAL (paket 85 · TUGAS 6) ────────────────────────────────────
   Bentuk reward SATU: "1 bulan Token AI" = kuota dasar bulanan kanon. Diberikan
   untuk pembelian paket APA PUN, dan TIDAK untuk top-up token (top-up bukan
   pembelian paket). Angka tokennya tidak ditulis tangan di sini. */

describe('reward referral — satu bentuk, token kanon', () => {
  it('angka token = kuota dasar bulanan kanon (bukan angka tulis tangan)', () => {
    expect(REFERRAL_REWARD_TOKENS).toBe(AI_BASE_TOKENS_TOTAL)
  })

  it('pembelian paket (subscribe / upgrade / baris lama) memberi token', () => {
    expect(referralRewardFor('subscribe')).toEqual({
      kind: 'tokens',
      amount: REFERRAL_REWARD_TOKENS,
    })
    expect(referralRewardFor('upgrade')).toEqual({
      kind: 'tokens',
      amount: REFERRAL_REWARD_TOKENS,
    })
    expect(referralRewardFor(null)).toEqual({
      kind: 'tokens',
      amount: REFERRAL_REWARD_TOKENS,
    })
  })

  it('top-up token TIDAK memberi reward (bukan pembelian paket)', () => {
    expect(referralRewardFor('topup')).toBeNull()
  })

  it('copy reward tetap menyebut Token AI', () => {
    expect(getReferrerReward().highlight).toContain('Token AI')
  })
})
