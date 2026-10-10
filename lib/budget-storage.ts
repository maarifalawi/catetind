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
  try {
    store.setItem(
      BUDGETS_STORAGE_KEY,
      JSON.stringify({ version: BUDGETS_VERSION, budgets: [...budgets] } satisfies PersistedBudgets),
    )
  } catch {
    /* kuota penuh / mode privat — nilai tetap hidup di memori sampai tab ditutup */
  }
}
