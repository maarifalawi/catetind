import { useSyncExternalStore } from 'react'
import { readOnboardingResult, type DashboardPeriod } from './onboarding'
import type { MoneyContext } from './types'

/* ── KONFIGURASI UANG USER — SATU SUMBER (paket 57 · audit AKAR D) ───────────
   Temuan audit uji-pakai: onboarding MENGUMPULKAN pemasukan bulanan user
   (`onboarding-step-income.tsx` → `saveOnboardingResult({ monthlyIncome })`),
   lalu nilai itu **tidak dipakai siapa pun**. Grep `readOnboardingResult()` di
   seluruh repo cuma menemukan SATU pemakai (`cashflow-calendar-screen.tsx:134`)
   dan hanya untuk field `paydayDate`.

   Akibatnya kartu "Jatah Hari Ini" dihitung dari konstanta demo
   (`lib/data/budget.ts`: pemasukan 7.500.000, cicilan 800.000, pengeluaran
   2.300.000) — angka yang TIDAK berasal dari user. Setelah user mengosongkan
   seluruh datanya, kartunya masih menampilkan nominal contoh.

   File ini menutupnya dengan satu konfigurasi yang eksplisit:

     monthlyIncome      — pemasukan bulanan user (Rp; 0 = belum diatur)
     totalInstallments  — total cicilan platform per bulan (Rp)
     paydayDate         — tanggal gajian 1–31 (null = tidak diatur)
     dashboardPeriod    — siklus dashboard: bulan kalender / siklus gajian

   Dua janji yang mengikat (bukan sekadar bentuk data):

     1. BENTUK JSON POLOS siap HTTP. Sama seperti `lib/money/idb.ts` dan
        store-store perangkat lain: di produksi nilai ini hidup di tabel
        `user_settings` (satu baris per `auth.uid()`) dan dibaca/ditulis lewat
        `GET/PATCH /api/settings`. Karena itu bentuknya primitif — tanpa kelas,
        tanpa fungsi tersimpan.
     2. PENANDA `purged`. "Hapus Akun" (`lib/account.ts` → `purgeDeviceData()`)
        wajib benar-benar membersihkannya, dan penanda itu yang mencegah nilai
        dari onboarding lama "lahir kembali" setelah penghapusan (pola yang sama
        dengan `purged` di `lib/money/{idb,store,funds-store}.ts`).

   Sumber awal nilainya = hasil onboarding (`readOnboardingResult().monthlyIncome`)
   — supaya pemasukan yang sudah user isi saat onboarding tidak diminta dua kali.
   Yang BELUM ada di sana tetap "belum diatur" (0), dan kartu Jatah Hari Ini
   menampilkan CTA jujur, bukan angka contoh: itu inti paket 57.

   ⚠️ Batas jujur: nilai ini hidup di PERANGKAT (localStorage), bukan di server.
   Belum ada sinkronisasi antar-perangkat, dan `paydayDate` yang diubah di
   Pengaturan tidak mengubah hasil onboarding yang sudah tersimpan (dibaca sekali
   sebagai sumber awal). */

/** kunci localStorage — berawalan `catet` supaya ikut tersapu "Hapus Akun" */
export const USER_MONEY_SETTINGS_KEY = 'catet-ind-money-settings'

/** versi bentuk data; bentuk asing/versi lain diperlakukan sebagai "belum ada" */
const SETTINGS_VERSION = 1

export interface UserMoneySettings {
  /** versi bentuk data (JSON polos, siap dikirim HTTP) */
  version?: number
  /** pemasukan bulanan user dalam Rupiah — `0` = belum diatur */
  monthlyIncome: number
  /** total cicilan platform per bulan dalam Rupiah — `0` = belum/tidak ada */
  totalInstallments: number
  /** tanggal gajian 1–31; `null` = periode mengikuti bulan kalender */
  paydayDate: number | null
  dashboardPeriod: DashboardPeriod
  /**
   * Konteks uang yang dipakai user (paket 87) — `pribadi` SELALU ikut.
   *
   * `undefined` = belum pernah dipilih user, jadi nilainya diwarisi dari hasil
   * onboarding (pasangan → `bersama`, tanggungan → `keluarga`) oleh `resolve()`.
   * Field ini PREFERENSI, bukan hak menyembunyikan uang: konteks yang masih
   * berisi dompet tetap dipaksa tampil di lapis UI (`availableContexts()` di
   * `lib/data/money-context.ts`).
   */
  enabledContexts?: MoneyContext[]
  /** true = akun ini sudah dihapus user → jangan ambil nilai dari onboarding */
  purged?: boolean
  /** kapan user terakhir mengubahnya sendiri (epoch ms) — 0 = warisan onboarding */
  updatedAt?: number
}

/** titik berangkat saat user belum mengatur apa pun */
export const DEFAULT_USER_MONEY_SETTINGS: UserMoneySettings = {
  monthlyIncome: 0,
  totalInstallments: 0,
  paydayDate: null,
  dashboardPeriod: 'calendar',
  enabledContexts: ['pribadi'],
}

/** konteks minimal yang selalu ada — titik berangkat seluruh app */
export const DEFAULT_ENABLED_CONTEXTS: MoneyContext[] = ['pribadi']

/** urutan & nilai sah konteks — satu-satunya daftar di file ini */
const VALID_CONTEXTS: MoneyContext[] = ['pribadi', 'keluarga', 'bersama']

/**
 * true = pemasukan bulanan sudah diatur user.
 *
 * Dipakai kartu Jatah Hari Ini untuk memilih antara ANGKA (dihitung dari
 * konfigurasi user) dan CTA ("Atur pemasukanmu dulu"). Ambangnya `> 0` karena
 * pemasukan nol bukan angka yang bisa dibagi — dan menampilkan "Rp 0/hari"
 * seolah itu jatahnya adalah klaim palsu.
 */
export function hasConfiguredIncome(settings: UserMoneySettings): boolean {
  return settings.monthlyIncome > 0
}

/**
 * Konteks yang dipakai user — `pribadi` selalu ada, bahkan untuk file lama yang
 * belum punya field `enabledContexts`. Karena itu bentuknya fungsi, bukan
 * property langsung: pemanggil tidak perlu menambal default sendiri-sendiri.
 */
export function enabledContextsOf(settings: UserMoneySettings): MoneyContext[] {
  return settings.enabledContexts ?? DEFAULT_ENABLED_CONTEXTS
}

/* ── COPY FORM "KONFIGURASI UANG" (dipakai settings-panel-account.tsx) ───────
   Label & catatan field ditulis di sini, bukan di JSX: aturan repo ini
   melarang string copy user-facing yang tersebar di komponen (`CONTEXT-WAJIB`
   §2), dan pemilik copy-nya jelas — file yang memegang datanya. Nada kalimatnya
   mengikuti §5: menjelaskan, tidak menyalahkan. */
export const MONEY_SETTINGS_COPY = {
  incomeLabel: 'Pemasukan Bulanan',
  /* H12-2 (audit UI/UX): angka contoh 75 juta tidak relatable buat target
     Gen-Z (gaji 5-7 juta). Field dibiarkan KOSONG dengan prompt yang menjelaskan
     kenapa sebaiknya diisi. */
  incomeNote: 'Isi gaji bulanan kamu supaya Jatah Hari Ini bisa dihitung akurat.',
  incomePlaceholder: '',
  installmentsLabel: 'Total Cicilan Bulanan',
  installmentsNote: 'Cicilan platform (HP, paylater, motor), dipotong lebih dulu dari pemasukan.',
  installmentsPlaceholder: '800.000',
  effectNote:
    'Nilai ini menggantikan angka contoh: begitu diisi, kartu “Jatah Hari Ini” di Dashboard & Budget langsung memakai angka kamu.',
} as const

/* ── PARSING MURNI (bisa diuji tanpa browser) ─────────────────────────────── */

/** Rupiah yang sah: angka terhingga ≥ 0. Nilai lain (string, NaN, negatif) → null */
function money(value: unknown): number | null {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) return null
  return Math.round(value)
}

/** tanggal gajian yang sah: bilangan bulat 1–31; `null` dibiarkan sebagai null */
function payday(value: unknown): number | null | undefined {
  if (value === null || value === undefined) return null
  if (typeof value !== 'number' || !Number.isFinite(value)) return undefined
  const day = Math.round(value)
  return day >= 1 && day <= 31 ? day : undefined
}

function period(value: unknown): DashboardPeriod | undefined {
  return value === 'calendar' || value === 'cycle' ? value : undefined
}

/**
 * Daftar konteks yang sah: nilai asing dibuang, `pribadi` selalu ikut, urut &
 * unik. Non-array → `undefined` supaya pemanggil memperlakukannya sebagai
 * "belum ada pilihan user" (bukan menebak).
 */
function contexts(value: unknown): MoneyContext[] | undefined {
  if (!Array.isArray(value)) return undefined
  const picked = new Set<MoneyContext>(['pribadi'])
  for (const item of value) {
    if (VALID_CONTEXTS.includes(item as MoneyContext)) picked.add(item as MoneyContext)
  }
  return VALID_CONTEXTS.filter((ctx) => picked.has(ctx))
}

/**
 * Ubah isi storage menjadi konfigurasi yang sah.
 *
 * `null` = tidak ada / bentuknya asing / versinya lain → pemanggil memperlakukan
 * ini sebagai "belum pernah diatur" (bukan menebak sebagian field). Aturan ini
 * penting untuk privasi & kejujuran: file yang rusak atau milik aplikasi lain
 * tidak boleh menghasilkan angka uang yang tampak sah.
 */
export function parseUserMoneySettings(raw: string | null): UserMoneySettings | null {
  if (!raw) return null
  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch {
    return null
  }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return null
  const value = parsed as Record<string, unknown>
  if (value.version !== undefined && value.version !== SETTINGS_VERSION) return null

  /* Field yang TIDAK ADA di file diperlakukan sebagai "tidak diketahui", bukan
     sebagai 0 — kalau default 0 ikut dihitung sebagai nilai sah, setiap objek
     JSON asing akan lolos dan berubah jadi konfigurasi uang palsu. */
  const has = (key: string) => Object.prototype.hasOwnProperty.call(value, key)
  const income = has('monthlyIncome') ? money(value.monthlyIncome) : null
  const installments = has('totalInstallments') ? money(value.totalInstallments) : null
  const paydayDate = has('paydayDate') ? payday(value.paydayDate) : null
  const dashboardPeriod = period(value.dashboardPeriod)
  const enabledContexts = contexts(value.enabledContexts)
  /* tidak satu pun field dikenal & sah → bentuk asing, bukan konfigurasi kosong */
  const known =
    income !== null ||
    installments !== null ||
    paydayDate !== null ||
    dashboardPeriod !== undefined ||
    enabledContexts !== undefined ||
    value.purged === true
  if (!known) return null

  return {
    version: SETTINGS_VERSION,
    monthlyIncome: money(value.monthlyIncome) ?? 0,
    totalInstallments: money(value.totalInstallments) ?? 0,
    paydayDate: payday(value.paydayDate) ?? null,
    dashboardPeriod: dashboardPeriod ?? 'calendar',
    enabledContexts,
    purged: value.purged === true ? true : undefined,
    updatedAt:
      typeof value.updatedAt === 'number' && Number.isFinite(value.updatedAt)
        ? value.updatedAt
        : undefined,
  }
}

/* ── BACA / TULIS (localStorage + cache memori) ───────────────────────────── */

/** `null` = localStorage tidak bisa dipakai (SSR/test, mode privat) */
function storage(): Storage | null {
  if (typeof window === 'undefined') return null
  try {
    return window.localStorage
  } catch {
    /* Safari mode privat melempar saat properti ini disentuh */
    return null
  }
}

/** state terakhir yang dibaca/ditulis — jaring pengaman kalau storage diblokir */
let cache: UserMoneySettings | null = null

/* ── LANGGANAN (paket 87) ────────────────────────────────────────────────────
   Sebelum paket ini nilai di file ini cuma dibaca SEKALI saat komponen mount,
   jadi mengubah "Konteks Uang" di Pengaturan tidak pernah menyegarkan pemilih
   konteks di halaman lain. Sekarang tiap penulisan memberi tahu pelanggannya,
   dan `useUserMoneySettings()` membacanya lewat `useSyncExternalStore` — satu
   jalur berlangganan, tanpa event global atau store kedua. */
const listeners = new Set<() => void>()

function notify(): void {
  for (const listener of listeners) listener()
}

/** berlangganan perubahan konfigurasi uang (dipakai `useUserMoneySettings()`) */
export function subscribeUserMoneySettings(listener: () => void): () => void {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

/**
 * Konteks yang DIWARISI dari onboarding (paket 87).
 *
 * Onboarding sudah menanyakan hal ini tanpa menyebut kata "konteks": "Pasangan
 * Serius / Menikah" menyalakan modul `joint_wallet`, "Ada Tanggungan Keluarga"
 * menyalakan `sandwich_generation` (lihat `LIFE_SITUATIONS`). Jadi user TIDAK
 * ditanya dua kali — pilihan di langkah 1 langsung menentukan konteks mana yang
 * tampil di pemilih.
 */
function contextsFromOnboarding(): MoneyContext[] {
  const onboarded = readOnboardingResult()
  const picked = new Set<MoneyContext>(['pribadi'])
  if (onboarded?.modules.includes('sandwich_generation')) picked.add('keluarga')
  if (onboarded?.modules.includes('joint_wallet')) picked.add('bersama')
  return VALID_CONTEXTS.filter((ctx) => picked.has(ctx))
}

/** nilai awal dari hasil onboarding — sumber pertama sebelum user mengubahnya */
function fromOnboarding(): UserMoneySettings | null {
  const onboarded = readOnboardingResult()
  if (!onboarded) return null
  const income = money(onboarded.monthlyIncome) ?? 0
  const paydayDate = payday(onboarded.paydayDate) ?? null
  const dashboardPeriod = period(onboarded.dashboardPeriod) ?? 'calendar'
  /* onboarding yang di-skip (pemasukan opsional) bukan konfigurasi: kalau isinya
     sama dengan default, jangan pura-pura ada isinya */
  if (income === 0 && paydayDate === null && dashboardPeriod === 'calendar') return null
  return {
    version: SETTINGS_VERSION,
    monthlyIncome: income,
    totalInstallments: 0,
    paydayDate,
    dashboardPeriod,
    enabledContexts: contextsFromOnboarding(),
    updatedAt: 0,
  }
}

function resolve(): UserMoneySettings {
  const store = storage()
  if (!store) {
    return { ...DEFAULT_USER_MONEY_SETTINGS, enabledContexts: contextsFromOnboarding() }
  }
  let raw: string | null = null
  try {
    raw = store.getItem(USER_MONEY_SETTINGS_KEY)
  } catch {
    raw = null
  }
  const stored = parseUserMoneySettings(raw)
  /* penanda `purged`: user sudah menghapus akunnya → jangan ambil nilai dari
     onboarding lama (kalau tidak, "Hapus Akun" terlihat berhasil padahal
     pengaturan uangnya hidup lagi) */
  if (stored?.purged) return { ...DEFAULT_USER_MONEY_SETTINGS, purged: true }
  /* file lama (sebelum paket 87) belum punya `enabledContexts` → warisi dari
     onboarding supaya user lama tidak kehilangan konteks yang jelas ia pakai */
  if (stored) {
    return { ...stored, enabledContexts: stored.enabledContexts ?? contextsFromOnboarding() }
  }
  return (
    fromOnboarding() ?? {
      ...DEFAULT_USER_MONEY_SETTINGS,
      enabledContexts: contextsFromOnboarding(),
    }
  )
}

/**
 * Konfigurasi uang user untuk hari ini.
 *
 * Aman dipanggil di server/test (`window` tidak ada) dan saat localStorage
 * diblokir: selalu mengembalikan bentuk yang sah — TIDAK PERNAH melempar.
 */
export function readUserMoneySettings(): UserMoneySettings {
  cache ??= resolve()
  return cache
}

function persist(settings: UserMoneySettings): void {
  const store = storage()
  if (!store) return
  try {
    store.setItem(USER_MONEY_SETTINGS_KEY, JSON.stringify(settings))
  } catch {
    /* kuota penuh / mode privat — nilai tetap hidup di memori sampai tab ditutup */
  }
}

/**
 * Simpan sebagian perubahan (patch) — satu-satunya jalur tulis.
 *
 * Field yang tidak disebut TIDAK berubah; nilai yang tidak sah diabaikan
 * (bukan ditulis sebagai angka tebakan). `updatedAt` dicap waktu perangkat
 * supaya bisa dibedakan dari warisan onboarding (`updatedAt: 0`).
 */
export function saveUserMoneySettings(patch: Partial<UserMoneySettings>): UserMoneySettings {
  const current = readUserMoneySettings()
  const income =
    patch.monthlyIncome === undefined
      ? current.monthlyIncome
      : (money(patch.monthlyIncome) ?? current.monthlyIncome)
  const installments =
    patch.totalInstallments === undefined
      ? current.totalInstallments
      : (money(patch.totalInstallments) ?? current.totalInstallments)
  const paydayDate =
    patch.paydayDate === undefined
      ? current.paydayDate
      : (payday(patch.paydayDate) ?? current.paydayDate)
  const dashboardPeriod =
    patch.dashboardPeriod === undefined
      ? current.dashboardPeriod
      : (period(patch.dashboardPeriod) ?? current.dashboardPeriod)
  const enabledContexts =
    patch.enabledContexts === undefined
      ? enabledContextsOf(current)
      : (contexts(patch.enabledContexts) ?? enabledContextsOf(current))

  const next: UserMoneySettings = {
    version: SETTINGS_VERSION,
    monthlyIncome: income,
    totalInstallments: installments,
    paydayDate,
    dashboardPeriod,
    enabledContexts,
    updatedAt: Date.now(),
  }
  cache = next
  persist(next)
  notify()
  /* PUSH ke server (sinkron antar-perangkat). Tidak ditunggu: penyimpanan lokal
     sudah sah, dan kegagalan jaringan tidak boleh menggagalkan aksi user. */
  void pushMoneySettingsToServer(next)
  return next
}

/* ── SINKRON ANTAR-PERANGKAT ─────────────────────────────────────────────────
   Konfigurasi ini dipakai menghitung Jatah Hari Ini, jadi ia data AKUN, bukan
   data perangkat. Dua fungsi di bawah menutup dua arahnya:

     · `pushMoneySettingsToServer()` — dipanggil setiap penulisan;
     · `hydrateMoneySettingsFromServer()` — dipanggil sekali saat app dibuka.

   Aturan penggabungan: LAST-WRITE-WINS lewat `updatedAt`. Nilai server hanya
   dipakai kalau lebih baru daripada nilai perangkat; sebaliknya nilai perangkat
   yang lebih baru diunggah (migrasi sekali jalan, tanpa menimpa data server yang
   lebih segar). Penanda `purged` selalu menang: akun yang sudah dihapus tidak
   boleh diisi ulang oleh nilai server lama. */
export async function pushMoneySettingsToServer(
  settings: UserMoneySettings = readUserMoneySettings(),
): Promise<boolean> {
  const { patchUserSettings } = await import('./supabase/user-settings-remote')
  return patchUserSettings({
    money: {
      version: settings.version ?? SETTINGS_VERSION,
      monthlyIncome: settings.monthlyIncome,
      totalInstallments: settings.totalInstallments,
      paydayDate: settings.paydayDate,
      dashboardPeriod: settings.dashboardPeriod,
      enabledContexts: enabledContextsOf(settings),
      updatedAt: settings.updatedAt ?? 0,
      purged: settings.purged === true,
    },
  })
}

/**
 * Ambil konfigurasi dari server dan terapkan kalau lebih baru.
 *
 * `applied` = nilai server benar-benar dipakai (perangkat ini berubah);
 * `pushed`  = nilai perangkat yang lebih baru dikirim naik.
 *
 * `remote` boleh dioper oleh pemanggil yang SUDAH membaca `user_settings` —
 * itulah yang membuat boot cukup SATU panggilan untuk uang, budget, onboarding,
 * sensor, dan target bulanan (lihat `components/catetind/settings-sync.tsx`).
 */
export async function hydrateMoneySettingsFromServer(remote?: {
  money?: unknown
} | null): Promise<{
  applied: boolean
  pushed: boolean
}> {
  if (typeof window === 'undefined') return { applied: false, pushed: false }
  let payload = remote
  if (!payload) {
    const { readUserSettings } = await import('./supabase/user-settings-remote')
    payload = await readUserSettings()
  }
  if (!payload) return { applied: false, pushed: false }

  const local = readUserMoneySettings()
  /* akun yang sudah dihapus di perangkat ini tidak boleh diisi ulang */
  if (local.purged) return { applied: false, pushed: false }

  const remoteSettings = parseRemoteMoney(payload.money)
  if (!remoteSettings) {
    /* server belum punya nilai → unggah yang ada di perangkat (migrasi sekali) */
    const pushed = await pushMoneySettingsToServer(local)
    return { applied: false, pushed }
  }

  const localAt = local.updatedAt ?? 0
  const remoteAt = remoteSettings.updatedAt ?? 0
  if (remoteAt > localAt) {
    cache = remoteSettings
    persist(remoteSettings)
    notify()
    return { applied: true, pushed: false }
  }
  if (localAt > remoteAt) {
    const pushed = await pushMoneySettingsToServer(local)
    return { applied: false, pushed }
  }
  return { applied: false, pushed: false }
}

/**
 * Bentuk JSON dari server → `UserMoneySettings` yang sah.
 *
 * Memakai parser yang SAMA dengan penyimpanan perangkat, jadi nilai asing di
 * server tidak bisa menghasilkan angka uang yang tampak sah.
 */
export function parseRemoteMoney(value: unknown): UserMoneySettings | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null
  return parseUserMoneySettings(JSON.stringify(value))
}

/**
 * Buang konfigurasi uang perangkat (dipakai "Hapus Akun").
 *
 * Menulis PENANDA `purged` — pola yang sama dengan store uang: tanpa penanda ini,
 * `readUserMoneySettings()` akan mengambil ulang nilai dari hasil onboarding
 * (kalau kuncinya belum sempat tersapu) dan konfigurasi yang baru dihapus muncul
 * lagi. Penanda ini juga alasan `purgeDeviceData()` memanggil fungsi ini SETELAH
 * penyapuan kunci `catet*`, bukan sebelumnya.
 */
export function purgeUserMoneySettings(): void {
  cache = { ...DEFAULT_USER_MONEY_SETTINGS, purged: true, updatedAt: Date.now() }
  notify()
  const store = storage()
  if (!store) return
  try {
    store.removeItem(USER_MONEY_SETTINGS_KEY)
    store.setItem(USER_MONEY_SETTINGS_KEY, JSON.stringify(cache))
  } catch {
    /* storage diblokir — cache di memori tetap membuat sesi ini jujur */
  }
}

/** Kosongkan cache & kunci (dipakai test supaya tiap kasus mulai bersih) */
export function resetUserMoneySettings(): void {
  cache = null
  notify()
  const store = storage()
  if (!store) return
  try {
    store.removeItem(USER_MONEY_SETTINGS_KEY)
  } catch {
    /* diabaikan dengan sengaja */
  }
}

/**
 * Konfigurasi uang untuk komponen.
 *
 * `getServerSnapshot` = `DEFAULT_USER_MONEY_SETTINGS` (konstanta, stabil) supaya
 * render server & render pertama client identik — tidak ada hydration mismatch
 * (`CONTEXT-WAJIB` §8). `getSnapshot`-nya `readUserMoneySettings()` yang
 * mengembalikan objek TER-CACHE (identitasnya stabil antar render), dan setiap
 * penulisan memberi tahu pelanggannya lewat `subscribeUserMoneySettings` — jadi
 * saklar "Konteks Uang" di Pengaturan langsung menyegarkan pemilih konteks di
 * halaman lain (paket 87).
 */
export function useUserMoneySettings(): UserMoneySettings {
  return useSyncExternalStore(
    subscribeUserMoneySettings,
    readUserMoneySettings,
    () => DEFAULT_USER_MONEY_SETTINGS,
  )
}

