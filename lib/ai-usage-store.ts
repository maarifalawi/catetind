import { AI_BASE_QUOTA, AI_SEED_USAGE_CALLS, type AiQuotaActivityId } from './ai-quota'
import { trackMoneyEvent } from './analytics'
import { readAiUsage, recordAiUsageRemote, type RemoteAiUsage } from './supabase/ai-usage-remote'

/* ── USAGE STORE AI — SATU-SATUNYA TEMPAT ANGKA "TERPAKAI" BERUBAH (paket 42) ─
   Temuan audit Stage 5 #5: pemakaian dulu konstanta mati (`AI_USAGE_CALLS` di
   `lib/ai-quota.ts`), jadi meter di sidebar, Billing, banner Home, dan header AI
   Coach TIDAK PERNAH turun walau user benar-benar memakai AI/voice/OCR. Meter
   yang tidak pernah bergerak bukan meter — itu hiasan.

   File ini menutupnya: satu store untuk seluruh app, dan setiap panggilan AI
   memanggil `recordAiUsage(...)`:

     · `categorize`  ← kategorisasi & penamaan otomatis di jalur AI CAPTURE
                       (struk/ucapan), dan hanya saat saklarnya menyala
                       (`lib/ai-prefs.ts`). Paket 54 memindahkannya ke sana:
                       jalur manual tidak memakai AI sama sekali, jadi catatan
                       manual berhenti menagih jatah kategorisasi
     · `chat`        ← setiap pesan di AI Coach
     · `ocr`         ← setiap pemindaian struk
     · `voice`       ← setiap input suara yang menghasilkan draft

   Yang TIDAK dilakukannya (batas jujur): tidak ada request ke model AI mana pun
   dan tidak ada penyimpanan server. Pemakaian hidup di memory sesi ini — refresh
   halaman mengembalikannya ke titik berangkat demo (`AI_SEED_USAGE_CALLS`).
   Di produksi file ini digantikan endpoint usage (`ai_usage` — PRD 4806–4886),
   dan yang berubah cuma isi fungsi-fungsi di bawah.

   Snapshot-nya beku & stabil (`useSyncExternalStore` di `hooks/use-ai-quota.ts`),
   supaya HTML server dan render pertama client identik (anti hydration
   mismatch) — pola yang sama dengan `lib/money/store.ts`. */

export interface AiUsageState {
  /** panggilan terpakai per aktivitas */
  callsUsed: Record<AiQuotaActivityId, number>
  /** token add-on yang dibeli di sesi ini (Top Up) */
  purchasedTokens: number
}

/** titik berangkat: angka mock kanon — dipakai server, hidrasi, dan test */
const SEED_STATE: AiUsageState = Object.freeze({
  callsUsed: { ...AI_SEED_USAGE_CALLS },
  purchasedTokens: 0,
})

let live: AiUsageState = SEED_STATE
const listeners = new Set<() => void>()

/** snapshot hidup (referensinya stabil sampai ada perubahan) */
export function readAiUsageState(): AiUsageState {
  return live
}

/** snapshot awal — dipakai React saat render server & hidrasi */
export function seedAiUsageState(): AiUsageState {
  return SEED_STATE
}

export function subscribeAiUsage(listener: () => void): () => void {
  listeners.add(listener)
  /* pemakaian dari perangkat/perangkat lain dibaca sekali saat ada yang
     berlangganan (pola yang sama dengan hidrasi store uang) */
  void hydrateAiUsage()
  return () => {
    listeners.delete(listener)
  }
}

let hydrated = false

/**
 * Gabungkan pemakaian LOKAL dengan pemakaian di SERVER (paket 45).
 *
 * Aturannya `max` per aktivitas, dan itu disengaja: angka yang lebih besar berarti
 * jatah user SUDAH terpakai di suatu tempat. Mengambil angka terkecil akan
 * "mengembalikan" jatah yang sudah dipakai hanya karena user pindah perangkat —
 * hadiah yang tidak pernah dijanjikan, dan dihitung sebagai pemakaian gratis.
 */
export function mergeAiUsage(local: AiUsageState, remote: RemoteAiUsage): AiUsageState {
  const callsUsed = { ...local.callsUsed }
  for (const [activity, calls] of Object.entries(remote.callsUsed)) {
    const current = callsUsed[activity as AiQuotaActivityId] ?? 0
    if (Number.isFinite(calls) && calls > current) callsUsed[activity as AiQuotaActivityId] = calls
  }
  return {
    callsUsed,
    purchasedTokens: Math.max(local.purchasedTokens, remote.purchasedTokens),
  }
}

/** baca meter dari server sekali per sesi halaman; `false` = tidak ada yang dibaca */
export async function hydrateAiUsage(): Promise<boolean> {
  if (hydrated) return false
  hydrated = true
  const remote = await readAiUsage()
  if (!remote) {
    hydrated = false // backend belum siap → coba lagi saat ada pelanggan baru
    return false
  }
  live = mergeAiUsage(live, remote)
  emit()
  return true
}


function emit(): void {
  for (const listener of listeners) listener()
}

const KNOWN_ACTIVITIES = new Set<string>(AI_BASE_QUOTA.map((activity) => activity.id))

/* ── AMBANG KUOTA MENIPIS + JEJAKNYA (paket 43 · audit Stage 6 #4) ──────────
   Kuota AI adalah "bahan bakar" app ini: kalau user kehabisan tanpa pernah
   diberi tanda, ia berhenti mencatat. Karena itu keadaan menipis dihitung di
   SATU tempat (di sini, tempat pemakaian benar-benar bertambah) dan sekaligus
   ditinggalkan jejak analitik supaya bisa diperiksa di produksi. */
const LOW_QUOTA_RATIO = 0.2

/** aktivitas yang sudah pernah dilaporkan menipis di SESI ini — anti spam */
const lowQuotaReported = new Set<AiQuotaActivityId>()

/**
 * Tembak `ai_quota_low` saat sisa panggilan satu aktivitas pertama kali menyentuh
 * ≤ 20% kuotanya. Yang dikirim hanya satuan teknis (nama aktivitas + jumlah
 * panggilan) — bukan nominal uang dan bukan isi percakapan/struk.
 */
function reportLowQuota(id: AiQuotaActivityId): void {
  const activity = AI_BASE_QUOTA.find((entry) => entry.id === id)
  if (!activity) return
  const used = Math.max(0, live.callsUsed[id] ?? 0)
  const remaining = Math.max(0, activity.calls - used)
  if (remaining > activity.calls * LOW_QUOTA_RATIO) return
  if (lowQuotaReported.has(id)) return
  lowQuotaReported.add(id)
  trackMoneyEvent('ai_quota_low', {
    activity: id,
    remaining_calls: remaining,
    quota_calls: activity.calls,
    exhausted: remaining === 0,
  })
}

/**
 * Catat pemakaian AI. Dipanggil di titik user BENAR-BENAR memakai fitur itu —
 * bukan di tempat yang enak dipanggil (lihat daftar di doc atas file ini).
 * Dibungkus try/catch oleh pemanggil? Tidak: fungsi ini tidak bisa melempar
 * (id asing hanya diabaikan), karena gagal mencatat meter TIDAK boleh
 * menggagalkan aksi user yang sedang menyimpan uangnya.
 */
export function recordAiUsage(id: AiQuotaActivityId, calls = 1): AiUsageState {
  if (!KNOWN_ACTIVITIES.has(id)) return live
  const step = Number.isFinite(calls) ? Math.max(1, Math.round(calls)) : 1
  const next = (live.callsUsed[id] ?? 0) + step
  live = { ...live, callsUsed: { ...live.callsUsed, [id]: next } }
  emit()
  /* setelah angka benar-benar berubah: menipis atau tidak? (`lib/analytics.ts`) */
  reportLowQuota(id)
  /* METER KE SERVER (paket 45): satu baris per (user, bulan, aktivitas), dan
     penambahannya atomik di RPC — dua tab yang chat bersamaan tidak saling
     menimpa. Gagal kirim tidak menggagalkan aksi user (angka lokal sudah benar). */
  void recordAiUsageRemote(id, step)
  return live
}

/**
 * "Pembayaran" top up berhasil (mock, dipanggil `top-up-modal.tsx`) → token
 * add-on bertambah untuk SELURUH app. Mengembalikan total pembelian sesi ini.
 *
 * Tokennya juga dicatat di server dengan aktivitas khusus `addon`: pembelian
 * add-on bukan pemakaian aktivitas AI mana pun, jadi menempelkannya ke `chat`
 * akan menggelembungkan angka chat user.
 */
export const ADDON_ACTIVITY = 'addon'

export function purchaseAiAddon(tokens: number): number {
  const added = Math.max(0, Math.round(tokens))
  if (added === 0) return live.purchasedTokens
  live = { ...live, purchasedTokens: live.purchasedTokens + added }
  emit()
  void recordAiUsageRemote(ADDON_ACTIVITY, 0, added)
  return live.purchasedTokens
}

/** total pembelian add-on sesi ini (0 = belum pernah beli) */
export function readPurchasedAddonTokens(): number {
  return live.purchasedTokens
}

/**
 * Kembalikan store ke titik berangkat. Dipakai test supaya tiap kasus mulai dari
 * angka yang sama; UI tidak pernah memanggilnya (di produksi "reset" hanya
 * terjadi saat bulan berganti, dan itu urusan server).
 */
export function resetAiUsageStore(): void {
  live = SEED_STATE
  lowQuotaReported.clear()
  emit()
}
