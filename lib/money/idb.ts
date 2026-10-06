/* ── PERSIST STATE UANG TANPA DEPENDENCY (paket 40) ──────────────────────────
   Ini BUKAN backend dan tidak boleh diklaim sebagai sinkronisasi antar-perangkat:
   IndexedDB hanya milik browser ini, di perangkat ini. Fungsinya satu — supaya
   baris ledger & dompet yang baru dibuat user tidak hilang saat halaman
   di-refresh, karena `lib/money/store.ts` hidup di memory modul.

   LIMA KEY DI SATU DATABASE (paket 46, 50, 51, & 52): selain snapshot uang
   (`money`), database ini juga menyimpan state celengan impian (`funds`),
   state kekayaan — hutang/piutang/investasi (`wealth`), daftar tagihan
   rutin (`bills`), dan kantong bersama `/joint` — dompet + buku besar bersama
   (`joint`). Lima key — bukan lima database — supaya satu "Hapus Akun"
   (`clearMoneyState()`) benar-benar membersihkan SEMUA state keuangan
   perangkat, tanpa ada database kedua yang bisa terlupa.

   🚧 Di produksi file ini TIDAK DIPAKAI: tiap penulisan jadi
   `POST /api/transactions` (baris ledger) / `POST /api/wallets`, lalu halaman
   membacanya dari Supabase. Karena itu seluruh state-nya berbentuk JSON polos
   yang siap dikirim/diterima HTTP.

   Kendala yang ditangani (sengaja, bukan kebetulan):
     · mode privat / `indexedDB` tidak ada → jatuh ke MEMORY (app tetap jalan,
       cuma tidak persist). Tidak ada satu pun jalur yang melempar error.
     · `open()` gagal / diblokir → sama, memory.
     · penulisan gagal (kuota, koneksi database ditutup versi lain) → diabaikan
       dengan senyap; state di layar sudah benar, dan state itu yang user lihat.

   Tulisannya juga dibatasi 200 baris terakhir: ledger ini pajangan demo, dan
   membuang data lama lebih baik daripada bikin IndexedDB tumbuh tanpa batas. */

const DB_NAME = 'catetind-money'
const STORE_NAME = 'state'
/** key snapshot uang (dompet + baris ledger) — dipakai `loadMoneyState`/`saveMoneyState` */
const MONEY_STATE_KEY = 'snapshot'
/** key state celengan impian — store kedua di database yang SAMA (paket 46) */
export const FUNDS_STATE_KEY = 'funds'
/** key state kekayaan (hutang/piutang/investasi) — store ketiga, database yang SAMA (paket 50) */
export const WEALTH_STATE_KEY = 'wealth'
/** key state tagihan rutin — store keempat, database yang SAMA (paket 51) */
export const BILLS_STATE_KEY = 'bills'
/** key state kantong bersama `/joint` (dompet + buku besar bersama) — store
 *  kelima, database yang SAMA (paket 52) */
export const JOINT_STATE_KEY = 'joint'
/** key state aset fisik / properti (tab `/wealth`) — store keenam, database yang
 *  SAMA (paket 63). Satu database supaya "Hapus Akun" tetap membersihkan semua. */
export const PHYSICAL_STATE_KEY = 'physical'

/** `null` = IndexedDB tidak bisa dipakai (mode privat / browser tua) → memory */
let dbPromise: Promise<IDBDatabase | null> | null = null

function openDb(): Promise<IDBDatabase | null> {
  if (typeof indexedDB === 'undefined') return Promise.resolve(null)
  dbPromise ??= new Promise<IDBDatabase | null>((resolve) => {
    try {
      const request = indexedDB.open(DB_NAME, 1)
      request.onupgradeneeded = () => {
        const db = request.result
        if (!db.objectStoreNames.contains(STORE_NAME)) db.createObjectStore(STORE_NAME)
      }
      request.onsuccess = () => resolve(request.result)
      request.onerror = () => resolve(null)
      request.onblocked = () => resolve(null)
    } catch {
      resolve(null)
    }
  })
  return dbPromise
}

/** state terakhir yang pernah dibaca/ditulis — jaring pengaman kalau IDB mati.
 *  PER KEY: state celengan tidak boleh menimpa snapshot uang saat IDB diblokir. */
const memory = new Map<string, unknown>()

/**
 * Baca satu key state perangkat. `null` = belum pernah ditulis / state tidak
 * bisa dibaca — pemanggil yang memutuskan apa artinya (untuk store uang: pakai
 * data seed; untuk celengan: pakai `INITIAL_SINKING_FUNDS`).
 */
export async function loadDeviceState<T>(key: string): Promise<T | null> {
  const db = await openDb()
  if (!db) return (memory.get(key) as T | undefined) ?? null
  return new Promise<T | null>((resolve) => {
    try {
      const request = db.transaction(STORE_NAME, 'readonly').objectStore(STORE_NAME).get(key)
      request.onsuccess = () => {
        memory.set(key, request.result ?? null)
        resolve((request.result as T | undefined) ?? null)
      }
      request.onerror = () => resolve((memory.get(key) as T | undefined) ?? null)
    } catch {
      resolve((memory.get(key) as T | undefined) ?? null)
    }
  })
}

export function saveDeviceState<T>(key: string, state: T): void {
  memory.set(key, state)
  void openDb().then((db) => {
    if (!db) return
    try {
      db.transaction(STORE_NAME, 'readwrite').objectStore(STORE_NAME).put(state, key)
    } catch {
      /* gagal menyimpan bukan alasan menghentikan user — state di layar sudah sah */
    }
  })
}

export function loadMoneyState<T>(): Promise<T | null> {
  return loadDeviceState<T>(MONEY_STATE_KEY)
}

export function saveMoneyState<T>(state: T): void {
  saveDeviceState(MONEY_STATE_KEY, state)
}

/**
 * HAPUS SELURUH STATE UANG DARI PERANGKAT (paket 43 — alur "Hapus Akun").
 *
 * Ini satu-satunya fungsi di file ini yang membuang data, dan ia sengaja
 * MENGHAPUS DATABASE-nya (bukan cuma mengosongkan satu key): kalau nanti ada
 * tabel/key baru di database yang sama, alur hapus akun tidak perlu diperbarui
 * agar tetap benar-benar bersih. Itu sebabnya state celengan (`FUNDS_STATE_KEY`)
 * ikut terhapus tanpa kode tambahan di sini.
 *
 * Mengembalikan `true` kalau database benar-benar terhapus. `false` bukan
 * kegagalan yang boleh disembunyikan: artinya permintaan hapus DIBLOKIR (tab lain
 * masih memegang koneksi, atau mode privat) — dan `lib/account.ts` menyampaikan
 * hasilnya apa adanya ke user.
 */
export function clearMoneyState(): Promise<boolean> {
  memory.clear()
  if (typeof indexedDB === 'undefined') return Promise.resolve(false)

  const pending = dbPromise
  dbPromise = null

  return new Promise<boolean>((resolve) => {
    const drop = () => {
      try {
        const request = indexedDB.deleteDatabase(DB_NAME)
        request.onsuccess = () => resolve(true)
        request.onerror = () => resolve(false)
        /* `blocked` = masih ada koneksi hidup di tab/konteks lain */
        request.onblocked = () => resolve(false)
      } catch {
        resolve(false)
      }
    }

    /* koneksi yang masih terbuka MENGHALANGI deleteDatabase — tutup dulu */
    if (!pending) {
      drop()
      return
    }
    void pending
      .then((db) => {
        try {
          db?.close()
        } catch {
          /* koneksi sudah tertutup — tidak apa-apa */
        }
        drop()
      })
      .catch(() => drop())
  })
}
