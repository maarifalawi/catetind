'use client'

/* ── PREFERENSI KECIL: SATU POLA UNTUK LOKAL + LINTAS PERANGKAT ───────────────
   Dua preferensi (AI & notifikasi) hidup di localStorage sejak dulu. Supaya
   keduanya ikut pindah perangkat TANPA bertabrakan dengan penulis lain di
   `user_settings.privacy`, tiap preferensi punya KOLOM JSONB SENDIRI
   (`ai_prefs`, `notif_prefs`) dan membawa `updatedAt`.

   Aturan adopsi sengaja LAST-WRITE-WINS berbasis `updatedAt` (sama seperti
   `money` & `budgets`):
     · server tanpa `updatedAt` TIDAK PERNAH menimpa perangkat (data lama hasil
       migrasi tidak boleh menghapus pilihan user yang lebih baru);
     · perangkat tanpa nilai lokal selalu mengadopsi server (perangkat baru);
     · kalau lokal lebih baru, nilai lokal yang menang dan akan dikirim ulang.

   Semua fungsi aman dipanggil di server/test: akses `window` dijaga. */

/** event internal: komponen yang sedang terbuka ikut memperbarui tampilannya */
export const PREFS_UPDATED_EVENT = 'catet:prefs-updated'

/** `updatedAt` dari sebuah payload (0 = tidak ada / tidak sah) */
export function readUpdatedAt(value: unknown): number {
  if (!value || typeof value !== 'object') return 0
  const raw = (value as { updatedAt?: unknown }).updatedAt
  return typeof raw === 'number' && Number.isFinite(raw) && raw > 0 ? raw : 0
}

/** tambahkan stempel waktu ke payload yang akan disimpan/dikirim */
export function withUpdatedAt<T extends object>(value: T, at = Date.now()): T & { updatedAt: number } {
  return { ...value, updatedAt: at }
}

/**
 * Apakah nilai dari server lebih baru daripada yang ada di perangkat?
 * Fungsi MURNI (menerima JSON mentah) supaya bisa diuji tanpa localStorage.
 */
export function shouldAdoptRemote(remote: unknown, localRaw: string | null): boolean {
  if (!remote || typeof remote !== 'object') return false
  const remoteAt = readUpdatedAt(remote)
  if (remoteAt <= 0) return false
  if (!localRaw) return true
  let localAt = 0
  try {
    localAt = readUpdatedAt(JSON.parse(localRaw))
  } catch {
    localAt = 0
  }
  return remoteAt > localAt
}

/** JSON mentah satu preferensi di perangkat ini (`null` = belum ada) */
export function readPrefsRaw(key: string): string | null {
  if (typeof window === 'undefined') return null
  try {
    return window.localStorage.getItem(key)
  } catch {
    return null
  }
}

/** tulis payload (sudah ber-`updatedAt`) ke perangkat ini */
export function writePrefsRaw(key: string, payload: unknown): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(key, JSON.stringify(payload))
  } catch {
    /* storage diblokir / penuh → nilai tetap berlaku untuk sesi ini */
  }
}

/** beri tahu komponen yang sedang terbuka bahwa preferensi ini berubah */
export function notifyPrefsChanged(scope: string): void {
  if (typeof window === 'undefined') return
  /* lingkungan tanpa `dispatchEvent` (SSR/uji dengan window tiruan) bukan alasan
     menggagalkan penyimpanan preferensi */
  if (typeof window.dispatchEvent !== 'function') return
  if (typeof CustomEvent !== 'function') return
  window.dispatchEvent(new CustomEvent(PREFS_UPDATED_EVENT, { detail: scope }))
}

/** dengarkan perubahan preferensi `scope`; mengembalikan fungsi pembersih */
export function onPrefsChanged(scope: string, listener: () => void): () => void {
  if (typeof window === 'undefined') return () => {}
  if (typeof window.addEventListener !== 'function') return () => {}
  const handler = (event: Event) => {
    if ((event as CustomEvent<string>).detail === scope) listener()
  }
  window.addEventListener(PREFS_UPDATED_EVENT, handler)
  return () => window.removeEventListener(PREFS_UPDATED_EVENT, handler)
}

/**
 * Terapkan preferensi dari server ke perangkat ini bila memang lebih baru.
 * `true` = nilai lokal berubah (komponen perlu membaca ulang).
 */
export function applyRemotePrefs(key: string, remote: unknown, scope: string): boolean {
  if (!shouldAdoptRemote(remote, readPrefsRaw(key))) return false
  writePrefsRaw(key, remote)
  notifyPrefsChanged(scope)
  return true
}
