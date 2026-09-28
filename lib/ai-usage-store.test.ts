import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  AI_ADDON_TOKENS_ALLOTMENT,
  AI_BASE_QUOTA,
  AI_BASE_TOKENS_TOTAL,
  AI_SEED_USAGE_CALLS,
  aiQuotaSnapshot,
  type AiQuotaActivityId,
} from './ai-quota'
import {
  purchaseAiAddon,
  readAiUsageState,
  readPurchasedAddonTokens,
  recordAiUsage,
  resetAiUsageStore,
  subscribeAiUsage,
  type AiUsageState,
} from './ai-usage-store'
import { setAnalyticsSink } from './analytics'
/* ── Test METERING AI NYATA (paket 42 · audit Stage 5 #5) ───────────────────
   Temuan auditnya: pemakaian AI adalah konstanta MATI (`AI_USAGE_CALLS`), jadi
   meter di sidebar, Billing, banner Home, dan header AI Coach tidak pernah
   turun walau user benar-benar memakai AI/voice/OCR.

   Angka yang dikunci di sini adalah angka kanon PRD (tabel yang sama dengan
   /terms), dihitung dari titik berangkat demo:

     174.720 (kategorisasi) + 156.000 (chat) + 78.000 (OCR)
   + 44.800 (voice) + 3.600 (apresiasi) + 6.900 (recap) = 464.020 token
   601.500 − 464.020 = 137.480 sisa (23%)

   Yang diuji BUKAN angka itu, tapi bahwa angka itu BERGESER ketika user memakai
   AI — itulah yang dulu tidak pernah terjadi. */

const snapshot = (): ReturnType<typeof aiQuotaSnapshot> =>
  aiQuotaSnapshot(readAiUsageState().callsUsed, readPurchasedAddonTokens())

/** semua aktivitas dipakai 2× jatah → kuota dasar lewat, memakan tangki add-on */
function overBudgetUsage(): Record<AiQuotaActivityId, number> {
  return Object.fromEntries(
    AI_BASE_QUOTA.map((activity) => [activity.id, activity.calls * 2]),
  ) as Record<AiQuotaActivityId, number>
}

beforeEach(() => {
  resetAiUsageStore()
})

describe('titik berangkat (seed) = kanon PRD', () => {
  it('pemakaian awal & angka turunannya sama dengan tabel kanon', () => {
    const state = readAiUsageState()
    expect(state.callsUsed).toEqual(AI_SEED_USAGE_CALLS)
    expect(state.purchasedTokens).toBe(0)

    const awal = snapshot()
    expect(awal.baseTokensUsed).toBe(464_020)
    expect(awal.baseTokensRemaining).toBe(137_480)
    expect(awal.usedPct).toBe(77)
    expect(awal.remainingPct).toBe(23)
    expect(awal.voiceCallsRemaining).toBe(AI_BASE_QUOTA.find((a) => a.id === 'voice')!.calls - 112)
    expect(awal.exhausted).toBe(false)
  })
})

describe('pemakaian AI benar-benar menggerakkan meter', () => {
  it('3 panggilan chat menurunkan sisa kuota (angka sebelum → sesudah)', () => {
    const sebelum = snapshot()

    recordAiUsage('chat')
    recordAiUsage('chat')
    recordAiUsage('chat')
    const sesudah = snapshot()

    /* 3 × 1.000 token (tabel kanon PRD) benar-benar hilang dari kuota dasar */
    expect(sesudah.byId.chat.callsUsed).toBe(sebelum.byId.chat.callsUsed + 3)
    expect(sesudah.byId.chat.callsRemaining).toBe(sebelum.byId.chat.callsRemaining - 3)
    expect(sesudah.baseTokensUsed).toBe(sebelum.baseTokensUsed + 3_000)
    expect(sesudah.baseTokensRemaining).toBe(sebelum.baseTokensRemaining - 3_000)
    expect(sesudah.remainingPct).toBeLessThan(sebelum.remainingPct)
  })

  it('scan struk & input suara ikut mengurangi jatah aktivitasnya masing-masing', () => {
    const sebelum = snapshot()
    recordAiUsage('ocr')
    recordAiUsage('voice', 2)
    const sesudah = snapshot()

    expect(sesudah.byId.ocr.callsRemaining).toBe(sebelum.byId.ocr.callsRemaining - 1)
    expect(sesudah.voiceCallsRemaining).toBe(sebelum.voiceCallsRemaining - 2)
    expect(sesudah.voiceRemainingSeconds).toBe(sesudah.voiceCallsRemaining * 30)
  })

  it('pemanggil yang sedang terpasang diberi tahu setiap kali pemakaian bertambah', () => {
    const listener = vi.fn()
    const unsubscribe = subscribeAiUsage(listener)

    recordAiUsage('categorize')
    purchaseAiAddon(200_000)

    expect(listener).toHaveBeenCalledTimes(2)
    unsubscribe()
    recordAiUsage('categorize')
    expect(listener).toHaveBeenCalledTimes(2)
  })

  it('reset mengembalikan ke titik berangkat (dipakai test, bukan UI)', () => {
    recordAiUsage('chat', 40)
    expect(snapshot().byId.chat.callsUsed).toBe(196)
    resetAiUsageStore()
    expect(snapshot().byId.chat.callsUsed).toBe(156)
  })
})

describe('state KUOTA HABIS + degradasi', () => {
  it('kuota dasar habis TAPI tangki add-on masih ada → belum "habis"', () => {
    /* 1.000 kategorisasi ekstra = 280.000 token: 137.480 dipakai menutup kuota
       dasar, sisanya (142.520) diambil dari jatah add-on 150.000 — jadi kuota
       dasar habis tapi tangki masih menyisakan 7.480 token. */
    const calls = { ...AI_SEED_USAGE_CALLS, categorize: AI_SEED_USAGE_CALLS.categorize + 1_000 }
    const habisDasar = aiQuotaSnapshot(calls, 0)

    expect(habisDasar.baseTokensRemaining).toBe(0)
    expect(habisDasar.remainingPct).toBe(0)
    expect(habisDasar.addon.overflowTokens).toBe(142_520)
    expect(habisDasar.addon.tokensRemaining).toBe(AI_ADDON_TOKENS_ALLOTMENT - 142_520)
    expect(habisDasar.exhausted).toBe(false)
  })

  it('dua kolam habis → exhausted: voice & OCR berhenti, sisanya dijelaskan copy', () => {
    const habis = aiQuotaSnapshot(overBudgetUsage(), 0)

    expect(habis.exhausted).toBe(true)
    expect(habis.voiceCallsRemaining).toBe(0)
    expect(habis.recordsLeft).toBe(0)
    /* bar yang benar-benar kosong tidak pernah negatif (dipakai lebar bar di UI) */
    expect(habis.remainingPct).toBe(0)
  })

  it('pemakaian yang melewati kuota dasar memakan tangki add-on sampai bisa habis', () => {
    /* seed + 1.000 panggilan suara ekstra = 400.000 token di atas kuota dasar,
       jauh melebihi jatah add-on 150.000 → tangki terkuras habis */
    const calls = { ...AI_SEED_USAGE_CALLS, voice: AI_SEED_USAGE_CALLS.voice + 1_000 }
    const terkuras = aiQuotaSnapshot(calls, 0)

    expect(terkuras.baseTokensUsed).toBeGreaterThan(AI_BASE_TOKENS_TOTAL)
    expect(terkuras.addon.overflowTokens).toBe(terkuras.baseTokensUsed - AI_BASE_TOKENS_TOTAL)
    expect(terkuras.addon.tokensRemaining).toBe(0)
    expect(terkuras.exhausted).toBe(true)
  })
})

describe('pembelian add-on (Top Up) — naik DAN bisa turun', () => {
  it('membeli token menambah sisa tangki + memberi tahu pelanggan', () => {
    const sebelum = snapshot()
    const total = purchaseAiAddon(400_000)
    const sesudah = snapshot()

    expect(total).toBe(400_000)
    expect(sesudah.addon.purchasedTokens).toBe(400_000)
    expect(sesudah.addon.tokensRemaining).toBe(sebelum.addon.tokensRemaining + 400_000)
    expect(readPurchasedAddonTokens()).toBe(400_000)
  })

  it('membeli 0 token tidak mengubah apa pun (tombol tidak boleh "menambah" tanpa paket)', () => {
    const state: AiUsageState = readAiUsageState()
    expect(purchaseAiAddon(0)).toBe(0)
    expect(readAiUsageState()).toBe(state)
  })
})

describe('jejak analitik kuota menipis (paket 43 · audit Stage 6 #4)', () => {
  it('menembak `ai_quota_low` SEKALI saat sisa panggilan menyentuh ≤ 20% kuotanya', () => {
    const seen: { name: string; payload: Record<string, unknown> }[] = []
    setAnalyticsSink((name, payload) => seen.push({ name, payload }))

    /* `chat`: kuota 200 panggilan, seed sudah memakai 156 → sisa 44 (22%)
       Tiga panggilan lagi → sisa 41, masih di atas ambang 20% (40 panggilan) */
    recordAiUsage('chat', 3)
    expect(seen).toHaveLength(0)

    /* panggilan berikutnya → sisa 40 = tepat 20% kuota → inilah saatnya diberi tahu */
    recordAiUsage('chat')
    expect(seen).toHaveLength(1)
    expect(seen[0]).toEqual({
      name: 'ai_quota_low',
      payload: { activity: 'chat', remaining_calls: 40, quota_calls: 200, exhausted: false },
    })

    /* pemakaian berikutnya TIDAK menembak ulang (anti spam satu sesi) */
    recordAiUsage('chat')
    recordAiUsage('chat')
    expect(seen).toHaveLength(1)

    setAnalyticsSink(null)
  })

  it('cukup satu kunci: payloadnya tidak memuat data uang/percakapan', () => {
    const seen: Record<string, unknown>[] = []
    setAnalyticsSink((_name, payload) => seen.push(payload))

    recordAiUsage('appreciation', 10)

    expect(Object.keys(seen[0]).sort()).toEqual(
      ['activity', 'exhausted', 'quota_calls', 'remaining_calls'].sort(),
    )

    setAnalyticsSink(null)
  })
})
