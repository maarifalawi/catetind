import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import {
  ACTIVE_ACCOUNT_KEY,
  ORPHAN_OWNER,
  SCOPE_STORAGE_PREFIX,
  accountScopedKey,
  activateAccount,
  planAccountSwitch,
  releaseAccount,
  type AccountStorage,
} from './account-scope'
import {
  USER_MONEY_SETTINGS_KEY,
  readUserMoneySettings,
  resetUserMoneySettings,
  saveUserMoneySettings,
} from './user-money-settings'
import { BUDGETS_STORAGE_KEY, readBudgets, writeBudgets } from './budget-storage'
import { CATEGORY_PREFS_STORAGE_KEY } from './data/category-prefs'

/* ── ISOLASI DUA AKUN DI SATU BROWSER ───────────────────────────────────────
   Yang dibuktikan di sini adalah janji privasi yang paling mudah dilanggar
   aplikasi keuangan: akun B yang masuk setelah akun A di browser yang SAMA
   tidak boleh melihat — apalagi mengirim ke server — angka milik A.

   Skenarionya meniru pemakaian nyata:
     1. A masuk, mengisi pemasukan/cicilan/gajian, limit budget, kategori kustom,
        dan penanda onboarding selesai;
     2. A keluar (`releaseAccount`) → penyimpanan diparkir atas nama A, memori
        dibersihkan;
     3. B masuk & mengosongkan gaji di onboarding → semua yang dibaca B adalah
        NOL/kosong (nilai inilah yang nanti dikirim ke server B);
     4. B keluar, A masuk lagi → seluruh nilai A kembali apa adanya.

   Modul membaca localStorage lewat `window`/global `localStorage`, jadi test
   memasang tiruannya (pola `lib/user-money-settings.test.ts`). */

class FakeStorage implements AccountStorage {
  private readonly data = new Map<string, string>()

  get length(): number {
    return this.data.size
  }

  key(index: number): string | null {
    return [...this.data.keys()][index] ?? null
  }

  getItem(key: string): string | null {
    return this.data.get(key) ?? null
  }

  setItem(key: string, value: string): void {
    this.data.set(key, value)
  }

  removeItem(key: string): void {
    this.data.delete(key)
  }

  /** semua pasangan kunci→nilai (untuk pemeriksaan "tidak ada yang bocor") */
  entries(): [string, string][] {
    return [...this.data.entries()]
  }
}

let local: FakeStorage
let session: FakeStorage
const globals = globalThis as {
  window?: unknown
  localStorage?: unknown
  sessionStorage?: unknown
}

beforeEach(() => {
  /* cache dibersihkan SEBELUM storage tiruan dipasang (lihat catatan di
     `lib/user-money-settings.test.ts`) */
  resetUserMoneySettings()
  local = new FakeStorage()
  session = new FakeStorage()
  globals.window = { localStorage: local, sessionStorage: session }
  globals.localStorage = local
  globals.sessionStorage = session
})

afterEach(() => {
  resetUserMoneySettings()
  delete globals.window
  delete globals.localStorage
  delete globals.sessionStorage
})

/** data milik akun A: gaji, cicilan, gajian, budget, kategori, onboarding */
function fillAccountA() {
  activateAccount('user-a', { storage: local, documentSettled: false })
  saveUserMoneySettings({
    monthlyIncome: 12_000_000,
    totalInstallments: 850_000,
    paydayDate: 25,
    dashboardPeriod: 'cycle',
  })
  writeBudgets([
    {
      id: 1,
      category: 'Makan',
      icon: '🍚',
      limit: 2_500_000,
      spent: 0,
      period: 'monthly',
      scope: 'pribadi',
    },
  ])
  local.setItem(
    CATEGORY_PREFS_STORAGE_KEY,
    JSON.stringify({ version: 1, custom: [{ id: 'c-a', label: 'Kopi A' }], hidden: [] }),
  )
  session.setItem('catet-onboarding-selesai', '1')
  session.setItem('catet-onboarding', JSON.stringify({ monthlyIncome: 12_000_000 }))
}

describe('ganti akun di browser yang sama', () => {
  it('akun B tidak mewarisi pemasukan, cicilan, gajian, budget, kategori, atau penanda onboarding A', () => {
    fillAccountA()
    /* A benar-benar menyimpan angkanya */
    expect(readUserMoneySettings().monthlyIncome).toBe(12_000_000)

    /* A keluar → parkir + memori bersih */
    const released = releaseAccount('user-a', local)
    expect(released.owner).toBe('user-a')
    expect(local.getItem(USER_MONEY_SETTINGS_KEY)).toBeNull()
    expect(local.getItem(BUDGETS_STORAGE_KEY)).toBeNull()
    expect(local.getItem(CATEGORY_PREFS_STORAGE_KEY)).toBeNull()
    expect(session.getItem('catet-onboarding-selesai')).toBeNull()
    expect(session.getItem('catet-onboarding')).toBeNull()
    /* nilai A TIDAK hilang: tersimpan atas namanya */
    expect(local.getItem(accountScopedKey(USER_MONEY_SETTINGS_KEY, 'user-a'))).toContain(
      '12000000',
    )

    /* B masuk dengan gaji kosong */
    activateAccount('user-b', { storage: local, documentSettled: false })
    const settings = readUserMoneySettings()
    expect(settings.monthlyIncome).toBe(0)
    expect(settings.totalInstallments).toBe(0)
    expect(settings.paydayDate).toBeNull()
    expect(readBudgets()).toEqual([])
    expect(local.getItem(CATEGORY_PREFS_STORAGE_KEY)).toBeNull()
    expect(session.getItem('catet-onboarding-selesai')).toBeNull()

    /* tidak ada satu pun kunci GLOBAL yang masih memuat angka/kategori A —
       inilah yang nanti dikirim `SettingsSync` ke server B */
    for (const [key, value] of local.entries()) {
      if (key.includes('#')) continue
      expect(value).not.toContain('12000000')
      expect(value).not.toContain('Kopi A')
    }
  })

  it('saat A masuk lagi, seluruh nilainya kembali apa adanya', () => {
    fillAccountA()
    releaseAccount('user-a', local)
    activateAccount('user-b', { storage: local, documentSettled: false })
    releaseAccount('user-b', local)

    activateAccount('user-a', { storage: local, documentSettled: false })
    const settings = readUserMoneySettings()
    expect(settings.monthlyIncome).toBe(12_000_000)
    expect(settings.totalInstallments).toBe(850_000)
    expect(settings.paydayDate).toBe(25)
    expect(readBudgets().map((budget) => budget.category)).toEqual(['Makan'])
    expect(local.getItem(CATEGORY_PREFS_STORAGE_KEY)).toContain('Kopi A')
  })

  it('data tanpa pemilik TIDAK diadopsi akun berikutnya (diparkir sebagai orphan)', () => {
    /* perangkat dari versi lama / logout yang tidak sempat parkir */
    local.setItem(
      USER_MONEY_SETTINGS_KEY,
      JSON.stringify({ version: 1, monthlyIncome: 9_000_000, updatedAt: Date.now() }),
    )

    activateAccount('user-b', { storage: local, documentSettled: false })

    expect(readUserMoneySettings().monthlyIncome).toBe(0)
    expect(local.getItem(USER_MONEY_SETTINGS_KEY)).toBeNull()
    expect(local.getItem(accountScopedKey(USER_MONEY_SETTINGS_KEY, ORPHAN_OWNER))).toContain(
      '9000000',
    )
  })

  it('pergantian di tengah pemakaian menandai perlunya reload; halaman baru tidak', () => {
    activateAccount('user-a', { storage: local, documentSettled: false })
    saveUserMoneySettings({ monthlyIncome: 5_000_000 })

    const inPage = activateAccount('user-b', { storage: local, documentSettled: true })
    expect(inPage.changed).toBe(true)
    expect(inPage.needsReload).toBe(true)

    /* dokumen yang baru dimuat (tepat setelah login) cukup ditata di tempat */
    releaseAccount('user-b', local)
    const freshPage = activateAccount('user-a', { storage: local, documentSettled: false })
    expect(freshPage.changed).toBe(true)
    expect(freshPage.needsReload).toBe(false)
  })

  it('penanda akun aktif sendiri tidak pernah ikut diparkir', () => {
    activateAccount('user-a', { storage: local, documentSettled: false })
    local.setItem(ACTIVE_ACCOUNT_KEY, 'user-a')
    const plan = planAccountSwitch(local, 'user-a', 'user-b')
    expect(plan.parked).not.toContain(ACTIVE_ACCOUNT_KEY)
    expect(local.getItem(ACTIVE_ACCOUNT_KEY)).toBe('user-a')
  })
})

describe('awalan kunci', () => {
  it('memakai awalan yang sama dengan penyapu "Hapus Akun"', () => {
    /* kalau salah, data terparkir tidak ikut tersapu saat user menghapus akun */
    expect(SCOPE_STORAGE_PREFIX).toBe('catet')
    expect(USER_MONEY_SETTINGS_KEY.startsWith(SCOPE_STORAGE_PREFIX)).toBe(true)
    expect(BUDGETS_STORAGE_KEY.startsWith(SCOPE_STORAGE_PREFIX)).toBe(true)
    expect(CATEGORY_PREFS_STORAGE_KEY.startsWith(SCOPE_STORAGE_PREFIX)).toBe(true)
  })

  it('riwayat obrolan AI TIDAK disimpan di browser (jadi tidak bisa bocor antar akun)', async () => {
    /* Obrolan AI hidup di state React widget (bertahan selama tab hidup, hilang
       saat reload/logout). Kalau suatu saat ia mulai menulis ke localStorage,
       kunci itu WAJIB berawalan `catet` supaya ikut terparkir saat akun
       berganti — test ini menjadi alarm untuk perubahan itu. */
    const { readFile } = await import('node:fs/promises')
    const source = await readFile(
      new URL('../hooks/use-ai-chat.ts', import.meta.url),
      'utf8',
    )
    expect(source).not.toMatch(/localStorage/)
    expect(source).not.toMatch(/sessionStorage/)
  })
})

