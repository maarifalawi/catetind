import { useEffect, useState } from 'react'
import { readOnboardingResult, type DashboardPeriod } from './onboarding'

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
}

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

/* ── COPY FORM "KONFIGURASI UANG" (dipakai settings-panel-account.tsx) ───────
   Label & catatan field ditulis di sini, bukan di JSX: aturan repo ini
   melarang string copy user-facing yang tersebar di komponen (`CONTEXT-WAJIB`
   §2), dan pemilik copy-nya jelas — file yang memegang datanya. Nada kalimatnya
   mengikuti §5: menjelaskan, tidak menyalahkan. */
export const MONEY_SETTINGS_COPY = {
  incomeLabel: 'Pemasukan Bulanan',
  incomeNote: 'Angka ini yang dipakai menghitung Jatah Hari Ini. Kosongkan kalau belum mau diatur.',
  incomePlaceholder: '7.500.000',
  installmentsLabel: 'Total Cicilan Bulanan',
  installmentsNote: 'Cicilan platform (HP, paylater, motor) — dipotong lebih dulu dari pemasukan.',
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
  /* tidak satu pun field dikenal & sah → bentuk asing, bukan konfigurasi kosong */
  const known =
    income !== null ||
    installments !== null ||
    paydayDate !== null ||
    dashboardPeriod !== undefined ||
    value.purged === true
  if (!known) return null

  return {
    version: SETTINGS_VERSION,
    monthlyIncome: money(value.monthlyIncome) ?? 0,
    totalInstallments: money(value.totalInstallments) ?? 0,
    paydayDate: payday(value.paydayDate) ?? null,
    dashboardPeriod: dashboardPeriod ?? 'calendar',
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
    updatedAt: 0,
  }
}

function resolve(): UserMoneySettings {
  const store = storage()
  if (!store) return { ...DEFAULT_USER_MONEY_SETTINGS }
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
  if (stored) return stored
  return fromOnboarding() ?? { ...DEFAULT_USER_MONEY_SETTINGS }
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

  const next: UserMoneySettings = {
    version: SETTINGS_VERSION,
    monthlyIncome: income,
    totalInstallments: installments,
    paydayDate,
    dashboardPeriod,
    updatedAt: Date.now(),
  }
  cache = next
  persist(next)
  return next
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
  const store = storage()
  if (!store) return
  try {
    store.removeItem(USER_MONEY_SETTINGS_KEY)
  } catch {
    /* diabaikan dengan sengaja */
  }
}

/**
 * Konfigurasi uang untuk komponen: `DEFAULT_USER_MONEY_SETTINGS` sampai komponen
 * selesai mount, lalu nilai sebenarnya.
 *
 * Pola yang sama dengan pembacaan `paydayDate` di `cashflow-calendar-screen.tsx`
 * dan `localISODate()` di `wallet-detail-screen.tsx`: render server & render
 * pertama client identik, jadi tidak ada hydration mismatch (`CONTEXT-WAJIB` §8).
 */
export function useUserMoneySettings(): UserMoneySettings {
  const [settings, setSettings] = useState<UserMoneySettings>(DEFAULT_USER_MONEY_SETTINGS)
  useEffect(() => {
    setSettings(readUserMoneySettings())
  }, [])
  return settings
}

