import { todayISO } from './time'

/* ── STATE NUDGE YANG BERTAHAN TANPA FLICKER (anti hydration mismatch) ────────
   Banner Home (renewal, kuota AI, sinking fund) & kartu nudge harian punya dua
   aturan yang HARUS hidup lintas reload:

     · "tutup untuk HARI INI"       → besok boleh muncul lagi (per hari kalender);
     · "tampil sekali per HARI"     → kuota AI tidak boleh menagih dua kali sehari.

   Versi lama membaca localStorage di `useEffect` lalu `return null` sampai
   `mounted` — artinya banner SELALU muncul sesudah cat pertama (pop-in) dan
   sempat berkedip. Pola di file ini memakai `useSyncExternalStore` (sama dengan
   `lib/ai-usage-store.ts`):

     · `seedNudgeState()` = snapshot SERVER yang deterministik (``today`` kosong,
       peta kosong) ⇒ HTML server & render pertama client identik, tidak ada
       hydration mismatch;
     · `readNudgeState()` menghidrasi dari localStorage saat render pertama DI
       CLIENT (bukan di effect sesudah paint) ⇒ nilainya sudah benar sebelum
       frame pertama, jadi tidak ada pop-in.

   Tiga hal yang disengaja dan mudah salah dibaca:
     1. `shownAtLoad` DIBEKUKAN saat halaman dimuat dan TIDAK pernah berubah oleh
        `markNudgeShown`. Kalau penandanya ikut berubah saat ditulis, banner yang
        baru saja ditandai "sudah tampil" akan langsung menghilang di sesi yang
        sama. Yang kita inginkan: tetap tampil sekarang, tidak tampil lagi di
        reload berikutnya.
     2. `dismissed` reaktif (menekan X harus langsung menyembunyikan banner).
     3. `today` ikut di snapshot karena dipakai sebagai kunci perbandingan; ia
        adalah string lokal perangkat (`todayISO()`), bukan UTC. */

export const NUDGE_DISMISSED_KEY = 'catet-home-banners-dismissed'
export const NUDGE_SHOWN_KEY = 'catet-home-banners-shown'

/** id banner yang diatur file ini — satu daftar supaya tidak ada salah ketik */
export type NudgeId = 'renewal' | 'ai-gauge' | 'fund-nudge' | 'daily-nudge'

export interface NudgeState {
  /** id → tanggal (YYYY-MM-DD) saat user menutupnya */
  dismissed: Record<string, string>
  /** id → tanggal saat banner PERTAMA tampil di hari itu (beku per page load) */
  shownAtLoad: Record<string, string>
  /** tanggal lokal perangkat pada render ini; `''` saat server */
  today: string
}

/** snapshot server & titik berangkat test: tidak ada apa pun yang tampil */
const SEED: NudgeState = Object.freeze({ dismissed: {}, shownAtLoad: {}, today: '' })

let live: NudgeState = SEED
/** peta "sudah pernah tampil" milik localStorage — dibaca sekali, ditulis saat tampil */
let shownMap: Record<string, string> = {}
let hydrated = false
const listeners = new Set<() => void>()

/** JSON → `Record<string,string>` dengan aman (bentuk salah ≠ crash) */
export function parseNudgeMap(raw: string | null): Record<string, string> {
  if (!raw) return {}
  try {
    const parsed = JSON.parse(raw) as unknown
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {}
    const out: Record<string, string> = {}
    for (const [key, value] of Object.entries(parsed as Record<string, unknown>)) {
      if (typeof value === 'string') out[key] = value
    }
    return out
  } catch {
    return {}
  }
}

function readKey(key: string): string | null {
  try {
    return window.localStorage.getItem(key)
  } catch {
    /* storage diblokir (mode privat) — state hidup di memory saja */
    return null
  }
}

function writeKey(key: string, value: string): void {
  try {
    window.localStorage.setItem(key, value)
  } catch {
    /* diabaikan: gagal menulis preferensi TIDAK boleh menjatuhkan halaman */
  }
}


/** baca localStorage SEKALI per page load; idempotent */
function hydrate(): void {
  if (hydrated || typeof window === 'undefined') return
  hydrated = true
  const dismissed = parseNudgeMap(readKey(NUDGE_DISMISSED_KEY))
  shownMap = parseNudgeMap(readKey(NUDGE_SHOWN_KEY))
  live = { ...live, dismissed, shownAtLoad: { ...shownMap } }
}

/** snapshot hidup — referensinya stabil sampai ada perubahan nyata */
export function readNudgeState(): NudgeState {
  if (typeof window === 'undefined') return live
  hydrate()
  const today = todayISO()
  if (live.today !== today) live = { ...live, today }
  return live
}

/** snapshot awal — dipakai React saat render server & hidrasi */
export function seedNudgeState(): NudgeState {
  return SEED
}

function emit(): void {
  for (const listener of listeners) listener()
}

function onStorage(event: StorageEvent): void {
  /* tab lain menutup banner → sinkronkan supaya tidak "hidup lagi" di tab ini */
  if (event.key !== NUDGE_DISMISSED_KEY) return
  live = { ...live, dismissed: parseNudgeMap(event.newValue) }
  emit()
}

export function subscribeNudge(listener: () => void): () => void {
  listeners.add(listener)
  hydrate()
  if (typeof window !== 'undefined') window.addEventListener('storage', onStorage)
  return () => {
    listeners.delete(listener)
    if (listeners.size === 0 && typeof window !== 'undefined') {
      window.removeEventListener('storage', onStorage)
    }
  }
}

/** "tutup untuk hari ini" → tersimpan, dan hilang seketika dari layar */
export function dismissNudge(id: NudgeId, day: string): void {
  if (!day || live.dismissed[id] === day) return
  live = { ...live, dismissed: { ...live.dismissed, [id]: day } }
  writeKey(NUDGE_DISMISSED_KEY, JSON.stringify(live.dismissed))
  emit()
}

/**
 * Tandai banner SUDAH tampil hari ini. SENGAJA tidak men-`emit()` dan tidak
 * menyentuh `shownAtLoad`, supaya banner yang sedang terlihat tidak langsung
 * menghilang — efeknya baru terasa di page load berikutnya.
 */
export function markNudgeShown(id: NudgeId, day: string): void {
  if (!day || shownMap[id] === day) return
  shownMap = { ...shownMap, [id]: day }
  writeKey(NUDGE_SHOWN_KEY, JSON.stringify(shownMap))
}

/** true kalau banner ini sudah ditutup HARI INI (dipakai komponen untuk render) */
export function isNudgeDismissedToday(state: NudgeState, id: NudgeId): boolean {
  return Boolean(state.today) && state.dismissed[id] === state.today
}

/** true kalau banner ini sudah pernah tampil di hari ini SAAT halaman dimuat */
export function wasNudgeShownTodayAtLoad(state: NudgeState, id: NudgeId): boolean {
  return Boolean(state.today) && state.shownAtLoad[id] === state.today
}

/** kembalikan ke titik berangkat — dipakai test; UI tidak pernah memanggilnya */
export function resetNudgeStore(): void {
  live = SEED
  shownMap = {}
  hydrated = false
  listeners.clear()
}
