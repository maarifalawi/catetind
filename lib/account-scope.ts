/* ── ISOLASI PENYIMPANAN PER AKUN (satu pintu) ───────────────────────────────
   Satu browser boleh dipakai beberapa akun. Sebelum modul ini, SEMUA preferensi
   yang hidup di localStorage memakai satu kunci global (`catet-ind-money-settings`,
   `catet-ind-budgets`, `catet-ai-prefs`, `catet-onboarding`, …). Akibatnya akun B
   yang masuk setelah akun A langsung mewarisi pemasukan, cicilan, limit budget,
   kategori kustom, target bulanan, preferensi AI/notifikasi, dan penanda
   onboarding milik A — lalu `SettingsSync` MENGIRIM warisan itu ke server B
   (last-write-wins), sehingga data akun A mencemari akun B secara permanen.

   Solusi: "parkir & pulihkan" pada SATU titik pergantian akun.

     · Saat akun aktif berganti A → B, seluruh kunci berawalan `catet` (kecuali
       penanda akun aktif) dipindahkan ke `catet-…#A`, lalu versi milik B
       (`catet-…#B`) dipulihkan ke kunci aslinya. Modul-modul lama yang membaca
       kunci global TIDAK perlu diubah satu per satu — dan tidak ada satu pun
       nilai A yang terbaca oleh B.
     · Pemilik yang TIDAK DIKETAHUI (penanda kosong tapi kunci `catet*` sudah
       ada — mis. upgrade dari versi lama) TIDAK PERNAH diadopsi. Nilainya
       diparkir ke bucket `#orphan`, bukan diserahkan ke akun berikutnya yang
       kebetulan login. Data yang terlanjur tidak bertuan lebih baik tidak
       dipakai daripada tercampur.
     · `sessionStorage` (penanda SESI: onboarding selesai/dilewati, toast
       sambutan) selalu DIKOSONGKAN saat akun berganti — penanda itu bercerita
       tentang alur akun sebelumnya di tab ini, bukan tentang akun baru.
     · Ingatan modul (cache & store yang hidup di memory) dikosongkan dengan
       RELOAD PENUH setelah parkir/pulih. Itulah sebabnya `needsReload` benar
       begitu ada data yang dipindahkan: lebih baik satu kali muat ulang daripada
       satu frame angka akun lain muncul di layar.

   Batas jujur: satu browser = satu akun aktif pada satu waktu (localStorage
   memang dibagi semua tab). Dua tab dengan dua akun berbeda tidak didukung —
   ditulis di sini supaya tidak ada yang mengira sebaliknya.
   ────────────────────────────────────────────────────────────────────────── */

/** penanda akun yang sedang memegang penyimpanan global (localStorage) */
export const ACTIVE_ACCOUNT_KEY = 'catet-active-account'

/**
 * Awalan SEMUA kunci milik app ini. Sama dengan `APP_STORAGE_PREFIX` di
 * `lib/account.ts` (dijaga `lib/account-scope.test.ts`) — didefinisikan ulang di
 * sini supaya modul ini tetap ringan (tanpa menarik store uang & Supabase).
 */
export const SCOPE_STORAGE_PREFIX = 'catet'

/** pemisah antara kunci asli dan pemiliknya: `catet-ai-prefs#<userId>` */
const OWNER_SEPARATOR = '#'

/** bucket untuk data yang pemiliknya tidak bisa dibuktikan */
export const ORPHAN_OWNER = 'orphan'

/**
 * Pembersih CACHE di memori (bukan penyimpanan). Modul yang menyimpan nilai
 * akun di variabel modul mendaftarkan dirinya di sini, sehingga cakupan akun
 * yang berganti langsung membuang nilai lama — bahkan sebelum reload yang
 * dijadwalkan. Tidak ada satu pun pembersih yang boleh menyentuh localStorage:
 * parkir/pulih penyimpanan adalah tugas `planAccountSwitch`.
 */
const cacheResetters = new Set<() => void>()

/** daftarkan pembersih cache modul (dipanggil sekali saat modul dimuat) */
export function registerAccountCacheReset(reset: () => void): void {
  cacheResetters.add(reset)
}

/** kosongkan seluruh cache modul yang terdaftar (aman dipanggil berulang) */
export function resetAccountCaches(): void {
  for (const reset of cacheResetters) {
    try {
      reset()
    } catch {
      /* satu modul gagal membersihkan diri tidak boleh menahan yang lain */
    }
  }
}

/**
 * true = `activateAccount()` sudah pernah menetapkan cakupan di dokumen ini.
 * Dipakai membedakan "halaman baru dimuat" (aman menata penyimpanan sebelum app
 * dirender) dari "akun berganti di tengah pemakaian" (wajib reload).
 */
let scopeActivatedInDocument = false

/** bagian localStorage/sessionStorage yang dipakai modul ini */
export interface AccountStorage {
  readonly length: number
  key(index: number): string | null
  getItem(key: string): string | null
  setItem(key: string, value: string): void
  removeItem(key: string): void
}

export interface AccountSwitchPlan {
  /** akun yang memegang penyimpanan global sebelum pergantian */
  from: string | null
  /** akun yang akan menjadi pemilik penyimpanan global */
  to: string
  /** kunci global yang diparkir ke `kunci#from` (atau `#orphan`) */
  parked: string[]
  /** kunci milik `to` yang dipulihkan dari `kunci#to` */
  restored: string[]
  /** true = ada data tanpa pemilik yang diparkir ke `#orphan` */
  orphaned: boolean
  /**
   * true = penyimpanan benar-benar berpindah tangan, jadi ingatan modul WAJIB
   * dikosongkan (reload penuh) sebelum ada layar yang dirender.
   */
  needsReload: boolean
}

/** `catet-ai-prefs` + `user-1` → `catet-ai-prefs#user-1` */
export function accountScopedKey(key: string, owner: string): string {
  return `${key}${OWNER_SEPARATOR}${owner}`
}

/** kunci yang sudah diparkir (punya pemilik di belakang `#`) */
export function isParkedKey(key: string): boolean {
  return key.includes(OWNER_SEPARATOR)
}

/** pemilik sebuah kunci terparkir; `null` kalau kunci itu bukan hasil parkir */
export function parkedOwnerOf(key: string): string | null {
  const index = key.indexOf(OWNER_SEPARATOR)
  if (index <= 0) return null
  return key.slice(index + 1) || null
}

/** kunci dasar sebuah kunci terparkir (`catet-ai-prefs#A` → `catet-ai-prefs`) */
export function parkedBaseOf(key: string): string {
  const index = key.indexOf(OWNER_SEPARATOR)
  return index > 0 ? key.slice(0, index) : key
}

function isManagedKey(key: string): boolean {
  return key.startsWith(SCOPE_STORAGE_PREFIX) && key !== ACTIVE_ACCOUNT_KEY
}

function allKeys(storage: AccountStorage): string[] {
  const keys: string[] = []
  for (let index = 0; index < storage.length; index += 1) {
    const key = storage.key(index)
    if (key) keys.push(key)
  }
  return keys
}

/** kunci global yang BELUM diparkir (milik siapa pun yang sedang aktif) */
export function globalAccountKeys(storage: AccountStorage): string[] {
  return allKeys(storage).filter((key) => isManagedKey(key) && !isParkedKey(key))
}

/**
 * PARKIR seluruh kunci global ke bawah satu pemilik (`kunci#owner`).
 * Tidak pernah memulihkan apa pun — pemulihan hanya terjadi saat akun masuk.
 */
export function parkGlobalKeys(storage: AccountStorage, owner: string): string[] {
  const parked: string[] = []
  for (const key of globalAccountKeys(storage)) {
    const value = storage.getItem(key)
    if (value === null) continue
    storage.setItem(accountScopedKey(key, owner), value)
    storage.removeItem(key)
    parked.push(key)
  }
  return parked
}


/**
 * Rencana perpindahan penyimpanan A → B (fungsi MURNI terhadap `AccountStorage`;
 * `from` & `to` ditulis eksplisit supaya bisa diuji tanpa browser).
 *
 * Urutannya penting dan sengaja:
 *   1. PARKIR dulu — nilai global yang ada sekarang milik `from` (atau tanpa
 *      pemilik). Tidak ada satu pun yang dibiarkan menempel untuk `to`;
 *   2. PULIHKAN versi `to` kalau pernah diparkir sebelumnya;
 *   3. `to` menjadi pemilik penanda akun aktif (ditulis oleh `activateAccount`).
 */
export function planAccountSwitch(
  storage: AccountStorage,
  from: string | null,
  to: string,
): AccountSwitchPlan {
  const parked: string[] = []
  const restored: string[] = []
  const bucket = from ?? ORPHAN_OWNER

  parked.push(...parkGlobalKeys(storage, bucket))

  for (const key of allKeys(storage)) {
    if (!isManagedKey(key) || !isParkedKey(key)) continue
    if (parkedOwnerOf(key) !== to) continue
    const value = storage.getItem(key)
    if (value === null) continue
    storage.setItem(parkedBaseOf(key), value)
    storage.removeItem(key)
    restored.push(parkedBaseOf(key))
  }

  return {
    from,
    to,
    parked,
    restored,
    orphaned: parked.length > 0 && from === null,
    needsReload: parked.length > 0 || restored.length > 0,
  }
}

/* ── SISI RUNTIME (browser) ───────────────────────────────────────────────── */

function safeStorage(get: () => Storage | undefined): AccountStorage | null {
  try {
    return get() ?? null
  } catch {
    /* mode privat / storage diblokir */
    return null
  }
}

function local(): AccountStorage | null {
  if (typeof window === 'undefined') return null
  return safeStorage(() => window.localStorage)
}

function session(): AccountStorage | null {
  if (typeof window === 'undefined') return null
  return safeStorage(() => window.sessionStorage)
}

/** akun yang saat ini memegang penyimpanan global (`null` = belum diketahui) */
export function readActiveAccount(storage: AccountStorage | null = local()): string | null {
  if (!storage) return null
  try {
    const value = storage.getItem(ACTIVE_ACCOUNT_KEY)
    return value && value.trim().length > 0 ? value : null
  } catch {
    return null
  }
}

function writeActiveAccount(storage: AccountStorage | null, userId: string | null): void {
  if (!storage) return
  try {
    if (userId) storage.setItem(ACTIVE_ACCOUNT_KEY, userId)
    else storage.removeItem(ACTIVE_ACCOUNT_KEY)
  } catch {
    /* storage penuh / diblokir — penanda hilang berarti akun berikutnya
       diperlakukan "tanpa pemilik" (data lama diparkir, tidak diadopsi) */
  }
}

/**
 * Kosongkan penanda SESI milik app ini (onboarding selesai/dilewati, toast
 * sambutan, guard reload). Tidak diparkir: penanda itu milik TAB, bukan akun.
 */
export function clearSessionScope(storage: AccountStorage | null = session()): string[] {
  if (!storage) return []
  const removed: string[] = []
  for (const key of allKeys(storage)) {
    if (!key.startsWith(SCOPE_STORAGE_PREFIX)) continue
    storage.removeItem(key)
    removed.push(key)
  }
  return removed
}

/**
 * Tetapkan akun aktif. Dipanggil setelah identitas sesi terbaca (`/api/session`).
 *
 * `needsReload: true` = penyimpanan berpindah tangan SEMENTARA app di dokumen
 * ini sudah pernah memakai data akun sebelumnya; pemanggil WAJIB memuat ulang
 * halaman sebelum merender app. Pada dokumen yang baru dimuat (mis. tepat
 * setelah login — semua modul masih lahir baru), parkir/pulih aman dilakukan
 * tanpa reload tambahan.
 */
export function activateAccount(
  userId: string,
  options: { storage?: AccountStorage | null; documentSettled?: boolean } = {},
): AccountSwitchPlan & { changed: boolean } {
  const storage = options.storage === undefined ? local() : options.storage
  const settled = options.documentSettled ?? scopeActivatedInDocument
  const current = readActiveAccount(storage)
  if (current === userId) {
    scopeActivatedInDocument = true
    return {
      from: current,
      to: userId,
      parked: [],
      restored: [],
      orphaned: false,
      needsReload: false,
      changed: false,
    }
  }

  const plan = storage
    ? planAccountSwitch(storage, current, userId)
    : { from: current, to: userId, parked: [], restored: [], orphaned: false, needsReload: false }
  writeActiveAccount(storage, userId)
  /* cache modul dibuang SEKARANG: nilai akun lama tidak boleh hidup di memori
     walau halaman belum sempat dimuat ulang */
  resetAccountCaches()
  /* penanda sesi tab ini bercerita tentang akun LAMA — jangan diwariskan */
  clearSessionScope()
  scopeActivatedInDocument = true
  return {
    ...plan,
    needsReload: settled && (plan.parked.length > 0 || plan.restored.length > 0),
    changed: true,
  }
}

/**
 * Lepas penyimpanan saat KELUAR (logout).
 *
 * `ownerHint` = id akun yang sedang keluar (dari sesi). Ini penting untuk
 * perangkat yang belum punya penanda akun (upgrade dari versi lama): nilainya
 * tetap diparkir atas nama pemiliknya, bukan dibiarkan menempel untuk akun
 * berikutnya.
 */
export function releaseAccount(
  ownerHint: string | null = null,
  storage: AccountStorage | null = local(),
): { owner: string | null; parked: string[] } {
  const owner = readActiveAccount(storage) ?? ownerHint
  clearSessionScope()
  /* keluar = memori app tidak boleh menyimpan angka akun yang baru saja pergi */
  resetAccountCaches()

  if (!storage) return { owner, parked: [] }

  /* Keluar = HANYA memarkir. Jangan pernah memulihkan: pemulihan terjadi saat
     akun (mungkin akun yang sama) masuk lagi lewat `activateAccount`. Kalau
     `releaseAccount` ikut memulihkan, nilai akun yang baru keluar tetap
     menempel di kunci global dan justru diwariskan ke akun berikutnya. */
  const parked = parkGlobalKeys(storage, owner ?? ORPHAN_OWNER)
  writeActiveAccount(storage, null)
  return { owner, parked }
}
