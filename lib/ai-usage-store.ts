import { AI_BASE_QUOTA, AI_SEED_USAGE_CALLS, type AiQuotaActivityId } from './ai-quota'
import { trackMoneyEvent } from './analytics'
import { accountStateKey, loadDeviceState, saveDeviceState } from './money/idb'
import { browserUserId } from './supabase/client'
import { readAiUsage, recordAiUsageRemote, type RemoteAiUsage } from './supabase/ai-usage-remote'
import { subscribeAiUsageChanges } from './supabase/realtime'

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
   (provider AI-nya sendiri masih mock). Yang NYATA sejak paket 45/86 adalah
   METER-nya: pemakaian disimpan di server (`ai_usage`, satu baris per
   user+bulan+aktivitas) lalu dibaca ulang saat berlangganan, saat ada sinyal
   realtime, dan saat tab kembali terlihat — jadi angka yang sama muncul di semua
   perangkat user dan tidak hilang saat refresh.

   Snapshot-nya beku & stabil (`useSyncExternalStore` di `hooks/use-ai-quota.ts`),
   supaya HTML server dan render pertama client identik (anti hydration
   mismatch) — pola yang sama dengan `lib/money/store.ts`. */

export interface AiUsageState {
  /** panggilan terpakai per aktivitas */
  callsUsed: Record<AiQuotaActivityId, number>
  /** token add-on yang dibeli di sesi ini (Top Up) */
  purchasedTokens: number
}

/** semua aktivitas 0 — titik berangkat user NYATA (belum memakai apa pun) */
function emptyCallsUsed(): Record<AiQuotaActivityId, number> {
  return Object.fromEntries(
    AI_BASE_QUOTA.map((activity) => [activity.id, 0]),
  ) as Record<AiQuotaActivityId, number>
}

/** titik berangkat TANPA data contoh: tangki masih penuh */
const ZERO_STATE: AiUsageState = Object.freeze({
  callsUsed: emptyCallsUsed(),
  purchasedTokens: 0,
})

/* ── TITIK BERANGKAT (paket 86) ──────────────────────────────────────────────
   Dulu store SELALU mulai dari angka contoh (`AI_SEED_USAGE_CALLS`), jadi user
   baru mana pun langsung melihat tangki sudah terpakai separuh — angka milik
   orang lain (temuan "masih seed data").

   Sekarang data contoh HANYA dipakai di lingkungan TEST (banyak test mengunci
   angka kanon). Di `pnpm dev` DAN di build produksi titik berangkatnya NOL, dan
   angka yang sebenarnya datang dari server (`ai_usage`) lewat `hydrateAiUsage()`
   + langganan realtime di bawah. Pemilik produk melihat sendiri akibat versi
   lama: kartu sidebar menulis "23% sisa" untuk akun yang baru dibuat dan angka
   itu TIDAK bergerak setelah AI dipakai — karena seed (`categorize: 624`,
   `chat: 156`) selalu menang pada penggabungan `max` melawan server yang kosong. */
const SEED_STATE: AiUsageState =
  process.env.NODE_ENV === 'test'
    ? Object.freeze({ callsUsed: { ...AI_SEED_USAGE_CALLS }, purchasedTokens: 0 })
    : ZERO_STATE

let live: AiUsageState = SEED_STATE
/**
 * true = state masih titik berangkat yang belum disentuh user.
 *
 * Selama masih true, pembacaan server PERTAMA kali MENGGANTI angkanya (bukan
 * digabung `max`): angka server adalah kebenaran akun ini, sedangkan titik
 * berangkat hanyalah tebakan awal. Tanpa aturan ini, angka contoh yang lebih
 * besar akan menang selamanya dan meter tidak pernah turun.
 */
let untouchedStartup = true
/** id user yang angkanya sedang dipegang store — dipakai mendeteksi ganti akun */
let liveUserId: string | null = null
const listeners = new Set<() => void>()


/** snapshot hidup (referensinya stabil sampai ada perubahan) */
export function readAiUsageState(): AiUsageState {
  return live
}

/** snapshot awal — dipakai React saat render server & hidrasi */
export function seedAiUsageState(): AiUsageState {
  return SEED_STATE
}

/* ── LANGGANAN HIDUP (paket 86) ──────────────────────────────────────────────
   Kuota AI berubah di jalur yang tidak selalu lewat tab ini: user memakai AI di
   HP lalu membuka laptop, atau membeli token add-on di perangkat lain. Karena
   itu begitu ada komponen yang berlangganan (`useSyncExternalStore`), kita:
     1. baca server SEKALI (hidrasi awal), dan
     2. buka SATU channel realtime untuk `ai_usage` + `ai_addons`; setiap sinyal
        perubahan memicu `refreshAiUsage()` (baca ulang REST, gabung `max`).

   Satu channel untuk SEMUA pelanggan (bukan satu per hook): penghitung
   `realtimeUsers` memastikan channel ditutup hanya setelah pelanggan TERAKHIR
   pergi — kalau tidak, kartu sidebar & halaman Billing yang hidup berbarengan
   akan saling membuka/menutup channel terus-menerus.
   Saat tab disembunyikan channel ditutup oleh helper realtime; begitu tab
   kembali terlihat kita baca ulang sekali supaya tidak ada perubahan yang
   terlewat selagi tab tidur (pola yang sama dengan store kekayaan). */
let realtimeUsers = 0
let realtimeHandle: { stop: () => void } | null = null

function onVisibilityRefresh(): void {
  if (document.visibilityState === 'visible') void refreshAiUsage()
}

function attachRealtime(): void {
  if (typeof document === 'undefined') return
  realtimeUsers += 1
  if (realtimeUsers > 1) return
  realtimeHandle = subscribeAiUsageChanges(() => void refreshAiUsage())
  document.addEventListener('visibilitychange', onVisibilityRefresh)
}

function detachRealtime(): void {
  if (typeof document === 'undefined') return
  realtimeUsers = Math.max(0, realtimeUsers - 1)
  if (realtimeUsers > 0) return
  realtimeHandle?.stop()
  realtimeHandle = null
  document.removeEventListener('visibilitychange', onVisibilityRefresh)
}

export function subscribeAiUsage(listener: () => void): () => void {
  listeners.add(listener)
  /* pemakaian dari perangkat/perangkat lain dibaca saat ada yang berlangganan
     (pola yang sama dengan hidrasi store uang), lalu dijaga hidup oleh realtime */
  void hydrateAiUsage()
  attachRealtime()
  return () => {
    listeners.delete(listener)
    detachRealtime()
  }
}

let hydrated = false

/* ── CACHE PERANGKAT PER AKUN ────────────────────────────────────────────────
   Kenapa ada: meter yang bergantung 100% pada satu bacaan jaringan bisa
   "kembali penuh" saat bacaan itu gagal, lambat, atau ditolak — padahal user
   SUDAH memakai AI. Itu yang dilaporkan pemilik produk ("token gua balik lagi ke
   100%"). Cache ini menyimpan pemakaian terakhir per akun di perangkat, lalu
   digabung `max` dengan server: angka tidak pernah turun sendiri.

   Ia BUKAN pengganti server dan tidak diklaim sebagai sinkronisasi: RLS & tabel
   `ai_usage` tetap sumber kebenaran lintas perangkat. Cache hanya jaring pengaman
   supaya tampilan tidak pernah memberi jatah yang sudah dipakai. */
const AI_USAGE_STATE_KEY = 'ai-usage'

interface PersistedAiUsage {
  callsUsed: Record<string, number>
  purchasedTokens: number
}

/** akun yang cache-nya sudah dibaca di sesi halaman ini */
let cachedUsageUser: string | null = null

/** angka dari cache → bentuk state kanon (aktivitas asing diabaikan) */
function normalizeCalls(raw: Record<string, number> | null | undefined): Record<AiQuotaActivityId, number> {
  const callsUsed = emptyCallsUsed()
  for (const [activity, calls] of Object.entries(raw ?? {})) {
    if (!Number.isFinite(calls)) continue
    callsUsed[activity as AiQuotaActivityId] = Math.max(0, Math.round(calls))
  }
  return callsUsed
}

function persistAiUsage(): void {
  if (typeof window === 'undefined') return
  saveDeviceState<PersistedAiUsage>(accountStateKey(AI_USAGE_STATE_KEY, liveUserId), {
    callsUsed: live.callsUsed,
    purchasedTokens: live.purchasedTokens,
  })
}

/**
 * Baca cache akun ini SEKALI per ganti akun. Pemakaian yang tersimpan di
 * perangkat dipakai sebagai titik berangkat pembacaan server — bukan `max`
 * terhadap angka contoh, karena cache ini memang milik akun yang sama.
 */
async function loadCachedAiUsage(userId: string): Promise<void> {
  if (cachedUsageUser === userId) return
  cachedUsageUser = userId
  const cached = await loadDeviceState<PersistedAiUsage>(accountStateKey(AI_USAGE_STATE_KEY, userId))
  if (!cached) return
  live = {
    callsUsed: normalizeCalls(cached.callsUsed),
    purchasedTokens: Math.max(0, cached.purchasedTokens ?? 0),
  }
  /* angka cache = angka yang BENAR untuk akun ini, jadi jangan ditimpa jalur
     "titik berangkat" saat server menjawab */
  untouchedStartup = false
  emit()
}

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

/**
 * Baca ulang meter dari server dan gabungkan.
 *
 * TIDAK digerbangi `hydrated` — justru inilah yang dipanggil realtime dan saat
 * tab kembali terlihat, jadi ia memang boleh jalan berkali-kali.
 * `false` = tidak ada yang dibaca (tanpa backend/sesi).
 *
 * TIGA aturan yang membuat angkanya BENAR-BENAR milik akun ini dan TIDAK PERNAH
 * "kembali penuh" hanya karena satu bacaan gagal:
 *   1. cache perangkat per akun dibaca DULU. Pembacaan server yang gagal/lambat
 *      tidak boleh mengembalikan tangki ke 100% — pemakaian yang sudah tercatat
 *      di perangkat ini tetap dihitung (temuan pemilik produk: "kok token gua
 *      balik lagi ke 100% padahal udah pernah dipake");
 *   2. pembacaan pertama saat state masih titik berangkat → GANTI (angka server
 *      yang berlaku), bukan digabung `max`;
 *   3. kalau id user berubah (logout lalu masuk akun lain di tab yang sama),
 *      angka akun sebelumnya dibuang dulu — kuota tidak boleh "menempel" antar
 *      akun, dan cache akun baru yang dipakai.
 */
export async function refreshAiUsage(): Promise<boolean> {
  /* `browserUserId()` = id sesi di perangkat ini. Hanya dipakai sebagai penanda
     GANTI AKUN (label), bukan sebagai dasar izin data — RLS tetap yang menjaga. */
  const userId = await browserUserId()
  if (userId && liveUserId && userId !== liveUserId) {
    live = SEED_STATE
    untouchedStartup = true
    lowQuotaReported.clear()
    cachedUsageUser = null
    emit()
  }
  if (userId) liveUserId = userId
  if (userId) await loadCachedAiUsage(userId)

  const remote = await readAiUsage()
  /* Gagal baca BUKAN alasan mereset angka: yang tersimpan di perangkat tetap
     dipakai sampai server bisa menjawab. */
  if (!remote) return false

  if (untouchedStartup) {
    /* Semua aktivitas kanon diisi angka server (termasuk 0) supaya tidak ada
       aktivitas yang tertinggal di nilai titik berangkat. */
    const callsUsed = emptyCallsUsed()
    for (const [activity, calls] of Object.entries(remote.callsUsed)) {
      if (Number.isFinite(calls)) callsUsed[activity as AiQuotaActivityId] = calls
    }
    live = { callsUsed, purchasedTokens: Math.max(0, remote.purchasedTokens) }
    untouchedStartup = false
  } else {
    live = mergeAiUsage(live, remote)
  }
  persistAiUsage()
  emit()
  return true
}

/**
 * Baca meter dari server SEKALI per sesi halaman (hidrasi awal).
 * `false` = tidak ada yang dibaca, jadi boleh dicoba lagi saat ada pelanggan baru
 * (backend belum siap → jangan kunci `hydrated`).
 */
export async function hydrateAiUsage(): Promise<boolean> {
  if (hydrated) return false
  hydrated = true
  const ok = await refreshAiUsage()
  if (!ok) hydrated = false
  return ok
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
  untouchedStartup = false
  /* SIMPAN DI PERANGKAT SEBELUM apa pun: kalau RPC ke server gagal (offline,
     sesi habis, migrasi belum jalan), angka ini tetap jadi dasar bacaan
     berikutnya — bukan kembali ke 100%. */
  persistAiUsage()
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
  untouchedStartup = false
  persistAiUsage()
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
 * angka yang sama; UI tidak pernah memanggilnya. Sejak kuota dasar TIDAK
 * di-refill, angka pemakaian memang kumulatif — "reset" di produksi hanya
 * terjadi kalau pemilik akun menghapus akunnya, bukan saat bulan berganti.
 */
export function resetAiUsageStore(): void {
  live = SEED_STATE
  untouchedStartup = true
  liveUserId = null
  cachedUsageUser = null
  hydrated = false
  lowQuotaReported.clear()
  emit()
}
