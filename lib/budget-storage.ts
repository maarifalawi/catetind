import { INITIAL_BUDGETS, type BudgetItem } from './data/budget'
import { DEMO_MODE } from './demo'

/* ── PENYIMPANAN BUDGET KATEGORI (revisi "tanpa seed") ───────────────────────
   Sebelumnya `/budget` menyimpan limit kategori di `useState(INITIAL_BUDGETS)`:
   daftar contoh repo yang (a) selalu tampil sebagai "milik user" dan (b) hilang
   begitu halaman di-refresh. Dua-duanya salah untuk data yang seharusnya milik
   user.

   Modul ini menyimpannya di PERANGKAT (localStorage), pola yang sama dengan
   `lib/user-money-settings.ts` & `lib/privacy-settings.ts`:

     · `readBudgets()`  — daftar tersimpan; KOSONG kalau belum ada apa pun
       (mode `NEXT_PUBLIC_DEMO` saja yang mulai dari contoh `INITIAL_BUDGETS`);
     · `writeBudgets()` — satu-satunya jalur tulis.

   Kuncinya berawalan `catet` supaya ikut tersapu aksi "Hapus Akun" (yang
   menyapu berdasarkan awalan `catet*`). `spent` di kartu kategori TIDAK dibaca
   dari sini — ia dihitung dari baris ledger nyata di halaman `/budget`; yang
   tersimpan di sini hanya `limit` + setelan yang user isi sendiri.

   ⚠️ Batas jujur: nilai ini hidup di PERANGKAT, belum disinkronkan ke server
   (di produksi: tabel `budgets` satu baris per `auth.uid()`). */

const BUDGETS_VERSION = 1

/** kunci localStorage — berawalan `catet` supaya ikut tersapu "Hapus Akun" */
export const BUDGETS_STORAGE_KEY = 'catet-ind-budgets'

interface PersistedBudgets {
  version: number
  budgets: BudgetItem[]
  /** cap waktu tulisan terakhir — dasar last-write-wins saat sinkron ke server */
  updatedAt?: number
}

function storage(): Storage | null {
  if (typeof window === 'undefined') return null
  try {
    return window.localStorage
  } catch {
    /* mode privat / storage diblokir */
    return null
  }
}

/**
 * Baca limit budget tersimpan.
 * `[]` = belum ada budget user (keadaan awal yang jujur, bukan daftar contoh).
 */
export function readBudgets(): BudgetItem[] {
  const store = storage()
  if (store) {
    try {
      const raw = store.getItem(BUDGETS_STORAGE_KEY)
      if (raw) {
        const parsed = JSON.parse(raw) as PersistedBudgets
        if (parsed?.version === BUDGETS_VERSION && Array.isArray(parsed.budgets)) {
          return parsed.budgets
        }
      }
    } catch {
      /* data rusak → perlakukan sebagai "belum ada" */
    }
  }
  /* jalur DEMO saja: mulai dari daftar contoh supaya mode review desain terisi */
  return DEMO_MODE ? INITIAL_BUDGETS.map((budget) => ({ ...budget })) : []
}

/** Simpan seluruh daftar budget — satu-satunya jalur tulis */
export function writeBudgets(budgets: readonly BudgetItem[]): void {
  const store = storage()
  if (!store) return
  const payload = { version: BUDGETS_VERSION, budgets: [...budgets], updatedAt: Date.now() }
  try {
    store.setItem(BUDGETS_STORAGE_KEY, JSON.stringify(payload))
  } catch {
    /* kuota penuh / mode privat — nilai tetap hidup di memori sampai tab ditutup */
  }
  /* PUSH ke server supaya limit kategori ikut ke perangkat lain. Tidak ditunggu:
     penulisan lokal sudah sah. */
  void pushBudgetsToServer(payload)
}

/* ── SINKRON ANTAR-PERANGKAT (limit kategori = data AKUN) ────────────────────
   Sebelum ini limit budget hidup hanya di localStorage: pindah perangkat berarti
   semua batas kategori hilang, padahal yang hilang adalah angka yang user isi
   sendiri. Bentuk yang dikirim sama persis dengan yang disimpan (`version`,
   `budgets`, `updatedAt`), dan `updatedAt` dipakai untuk last-write-wins. */

/** state terakhir yang ditulis — dipakai hidrasi tanpa membaca storage dua kali */
let lastWrittenAt = 0

export function readBudgetsUpdatedAt(): number {
  if (lastWrittenAt > 0) return lastWrittenAt
  const store = storage()
  if (!store) return 0
  try {
    const raw = store.getItem(BUDGETS_STORAGE_KEY)
    if (!raw) return 0
    const parsed = JSON.parse(raw) as PersistedBudgets
    return typeof parsed?.updatedAt === 'number' ? parsed.updatedAt : 0
  } catch {
    return 0
  }
}

export async function pushBudgetsToServer(payload: {
  version: number
  budgets: BudgetItem[]
  updatedAt: number
}): Promise<boolean> {
  lastWrittenAt = payload.updatedAt
  const { patchUserSettings } = await import('./supabase/user-settings-remote')
  return patchUserSettings({ budgets: payload })
}

/**
 * Ambil limit kategori dari server dan terapkan kalau lebih baru.
 *
 * `applied` = daftar di perangkat benar-benar diganti; `pushed` = daftar
 * perangkat yang lebih baru diunggah. Server kosong + perangkat berisi = unggah
 * sekali (migrasi), tanpa menimpa data server yang lebih segar.
 *
 * `remote` boleh dioper oleh pemanggil yang sudah membaca `user_settings`, jadi
 * boot tidak perlu memanggil server dua kali untuk satu baris yang sama.
 */
export async function hydrateBudgetsFromServer(remote?: {
  budgets?: unknown
} | null): Promise<{ applied: boolean; pushed: boolean }> {
  if (typeof window === 'undefined') return { applied: false, pushed: false }
  let payload = remote
  if (!payload) {
    const { readUserSettings } = await import('./supabase/user-settings-remote')
    payload = await readUserSettings()
  }
  if (!payload) return { applied: false, pushed: false }

  const remotePayload = payload.budgets as
    | { version?: unknown; budgets?: unknown; updatedAt?: unknown }
    | null
  const remoteAt = typeof remotePayload?.updatedAt === 'number' ? remotePayload.updatedAt : 0
  const localAt = readBudgetsUpdatedAt()
  const localItems = readBudgets()

  if (remoteAt === 0) {
    if (localItems.length === 0) return { applied: false, pushed: false }
    const pushed = await pushBudgetsToServer({
      version: BUDGETS_VERSION,
      budgets: localItems,
      updatedAt: localAt || Date.now(),
    })
    return { applied: false, pushed }
  }

  if (remoteAt > localAt && Array.isArray(remotePayload?.budgets)) {
    const items = (remotePayload.budgets as BudgetItem[]).filter(
      (item) => item && typeof item.category === 'string',
    )
    const store = storage()
    if (store) {
      try {
        store.setItem(
          BUDGETS_STORAGE_KEY,
          JSON.stringify({ version: BUDGETS_VERSION, budgets: items, updatedAt: remoteAt }),
        )
      } catch {
        return { applied: false, pushed: false }
      }
    }
    lastWrittenAt = remoteAt
    return { applied: true, pushed: false }
  }

  if (localAt > remoteAt) {
    const pushed = await pushBudgetsToServer({
      version: BUDGETS_VERSION,
      budgets: localItems,
      updatedAt: localAt,
    })
    return { applied: false, pushed }
  }
  return { applied: false, pushed: false }
}
