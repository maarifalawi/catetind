import { restConfigured, restFetch } from '@/lib/supabase/rest'

/* ── LEDGER REWARD REFERRAL (paket 63) — IDEMPOTEN BY SCHEMA ─────────────────
   `grantReferralReward()` dirancang untuk dipanggil WEBHOOK PEMBAYARAN: reward
   pengundang baru masuk setelah yang diundang benar-benar membayar (Domain 7D,
   Key Flow #6). Karena pembayaran belum aktif, ledger-nya **kosong secara jujur**
   — fungsi ini tidak pernah dipanggil dari UI.

   Idempotensi bukan janji kode, tapi kenyataan SKEMA: `referral_rewards` punya
   `unique (referral_id)`, dan penulisan memakai `resolution=ignore-duplicates`.
   Jadi webhook yang terkirim dua kali (Midtrans memang bisa mengulang) tidak
   bisa memberi dua reward untuk satu relasi.

   Penulisan memakai `accessToken` PEMANGGIL. Di produksi token itu milik kunci
   peran server (webhook), bukan klien — dan RLS `referral_rewards` tidak punya
   policy insert, jadi klien tidak punya jalur menulis sama sekali. */

export interface RewardGrant {
  referralId: string
  referrerUserId: string
  /** 'days' = tambahan masa aktif · 'tokens' = token AI add-on */
  rewardKind: 'days' | 'tokens'
  rewardAmount: number
}

export interface RewardResult {
  ok: boolean
  /** true = baris BARU ditulis; false = sudah ada (idempoten) atau gagal */
  granted: boolean
  reason?: 'not-configured' | 'provider'
}

export async function grantReferralReward(input: RewardGrant, accessToken: string): Promise<RewardResult> {
  if (!restConfigured() || !accessToken) {
    return { ok: false, granted: false, reason: 'not-configured' }
  }

  const res = await restFetch<unknown>('referral_rewards?on_conflict=referral_id', {
    method: 'POST',
    accessToken,
    prefer: 'resolution=ignore-duplicates,return=representation',
    body: {
      referral_id: input.referralId,
      referrer_user_id: input.referrerUserId,
      reward_kind: input.rewardKind,
      reward_amount: Math.max(0, Math.round(input.rewardAmount)),
    },
  })

  if (!res.ok) return { ok: false, granted: false, reason: 'provider' }

  /* `return=representation` + ignore-duplicates: baris kosong = sudah ada (no-op) */
  const granted = Array.isArray(res.data) && res.data.length > 0
  return { ok: true, granted }
}
