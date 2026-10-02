import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  DEFAULT_USER_MONEY_SETTINGS,
  USER_MONEY_SETTINGS_KEY,
  hasConfiguredIncome,
  parseUserMoneySettings,
  purgeUserMoneySettings,
  readUserMoneySettings,
  resetUserMoneySettings,
  saveUserMoneySettings,
} from './user-money-settings'
import { ONBOARDING_STORE_KEY } from './onboarding'

/* ── KONFIGURASI UANG USER (paket 57 · audit AKAR D) ────────────────────────
   Yang dikunci di sini bukan cuma bentuk datanya, tapi janji privasi &
   kejujurannya:

     • pemasukan yang diisi user saat onboarding BENAR-BENAR jadi sumber awal
       (sebelum paket ini nilainya nol pemakai);
     • nilai yang rusak / milik aplikasi lain diperlakukan sebagai "belum ada" —
       jangan pernah menebak angka uang dari file yang tidak dikenal;
     • storage yang diblokir (mode privat / SSR / test) tidak pernah melempar;
     • "Hapus Akun" benar-benar membuang konfigurasi ini & menandainya `purged`,
       sehingga nilai lama TIDAK lahir kembali dari hasil onboarding.

   Catatan lingkungan: vitest repo ini berjalan di node (tanpa `window`), jadi
   tiap kasus menyalakan localStorage tiruan — pola yang sama dengan
   `lib/ai-prefs.test.ts`. */

interface FakeStore {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
  removeItem(key: string): void
}

/** localStorage tiruan + jalur masuk `window` & global `localStorage` */
function withFakeStorage(seed: Record<string, string>, run: (store: FakeStore) => void) {
  const data = new Map<string, string>(Object.entries(seed))
  const store: FakeStore = {
    getItem: (key) => data.get(key) ?? null,
    setItem: (key, value) => void data.set(key, value),
    removeItem: (key) => void data.delete(key),
  }
  const globals = globalThis as { window?: unknown; localStorage?: unknown }
  const beforeWindow = globals.window
  const beforeLocal = globals.localStorage
  /* cache dibersihkan SEBELUM storage tiruan dipasang: kalau sesudah, fungsi
     reset ikut MENGHAPUS nilai yang baru saja disemai test ini. */
  resetUserMoneySettings()
  /* `readOnboardingResult()` (lib/onboarding.ts) membaca `localStorage` LANGSUNG
     — bukan lewat `window` — jadi keduanya perlu disiapkan agar sumber awal dari
     onboarding benar-benar teruji. */
  globals.window = { localStorage: store }
  globals.localStorage = store
  try {
    run(store)
  } finally {
    globals.window = beforeWindow
    globals.localStorage = beforeLocal
    resetUserMoneySettings()
  }
}

function storedSettings(store: FakeStore): Record<string, unknown> | null {
  const raw = store.getItem(USER_MONEY_SETTINGS_KEY)
  return raw ? (JSON.parse(raw) as Record<string, unknown>) : null
}

/** hasil onboarding yang "khas" (pemasukan diisi user 9 juta, siklus gajian) */
const ONBOARDED = {
  situations: ['first-jobber'],
  modules: [],
  dashboardPeriod: 'cycle',
  paydayDate: 25,
  monthlyIncome: 9_000_000,
  wallet: { name: 'BCA', balance: 0 },
  firstTransaction: { type: 'expense', amount: 25_000, description: 'Kopi' },
  reminderEnabled: true,
  completedAt: '2026-09-27T10:00:00.000Z',
}

beforeEach(() => {
  resetUserMoneySettings()
})

afterEach(() => {
  resetUserMoneySettings()
})

describe('saveUserMoneySettings · tulis & baca', () => {
  it('menulis bentuk JSON polos siap HTTP (versi + updatedAt) yang bisa dibaca ulang', () => {
    withFakeStorage({}, (store) => {
      const saved = saveUserMoneySettings({ monthlyIncome: 7_500_000, totalInstallments: 800_000 })
      expect(saved.monthlyIncome).toBe(7_500_000)
      expect(saved.totalInstallments).toBe(800_000)

      const persisted = storedSettings(store)
      expect(persisted?.version).toBe(1)
      expect(typeof persisted?.updatedAt).toBe('number')
      expect(persisted?.monthlyIncome).toBe(7_500_000)
      expect(hasConfiguredIncome(readUserMoneySettings())).toBe(true)
    })
  })

  it('patch hanya mengubah field yang disebut - sisanya tetap', () => {
    withFakeStorage({}, () => {
      saveUserMoneySettings({ monthlyIncome: 7_500_000, totalInstallments: 800_000, paydayDate: 25 })
      const after = saveUserMoneySettings({ monthlyIncome: 9_000_000 })
      expect(after.monthlyIncome).toBe(9_000_000)
      expect(after.totalInstallments).toBe(800_000)
      expect(after.paydayDate).toBe(25)
    })
  })

  it('nilai tidak sah diabaikan (tidak ditulis sebagai angka tebakan)', () => {
    withFakeStorage({}, () => {
      saveUserMoneySettings({ monthlyIncome: 5_000_000, paydayDate: 10 })
      /* NaN / negatif / string bukan Rupiah yang sah -> nilai lama dipertahankan */
      saveUserMoneySettings({ monthlyIncome: Number.NaN })
      saveUserMoneySettings({ monthlyIncome: -1 })
      saveUserMoneySettings({ monthlyIncome: '9 juta' as unknown as number })
      expect(readUserMoneySettings().monthlyIncome).toBe(5_000_000)
      /* tanggal di luar 1-31 juga tidak dipakai */
      saveUserMoneySettings({ paydayDate: 45 })
      expect(readUserMoneySettings().paydayDate).toBe(10)
    })
  })
})

describe('nilai rusak / asing / storage diblokir', () => {
  it('JSON rusak -> dianggap belum ada (bukan error yang membuntuti user)', () => {
    withFakeStorage({ [USER_MONEY_SETTINGS_KEY]: 'bukan-json' }, () => {
      expect(readUserMoneySettings()).toEqual(DEFAULT_USER_MONEY_SETTINGS)
    })
  })

  it('bentuk asing / versi lain -> dianggap belum ada', () => {
    expect(parseUserMoneySettings('"teks"')).toBeNull()
    expect(parseUserMoneySettings(null)).toBeNull()
    expect(parseUserMoneySettings(JSON.stringify({ monthlyIncome: 'x', lain: true }))).toBeNull()
    expect(parseUserMoneySettings(JSON.stringify({ version: 99, monthlyIncome: 1 }))).toBeNull()

    withFakeStorage(
      { [USER_MONEY_SETTINGS_KEY]: JSON.stringify({ monthlyIncome: 'banyak', foo: 1 }) },
      () => {
        expect(readUserMoneySettings().monthlyIncome).toBe(0)
      },
    )
  })

  it('storage diblokir (getItem/setItem melempar) -> tidak melempar sama sekali', () => {
    const globalWithWindow = globalThis as { window?: unknown }
    const before = globalWithWindow.window
    const blocked = () => {
      throw new Error('blocked')
    }
    globalWithWindow.window = {
      localStorage: { getItem: blocked, setItem: blocked, removeItem: blocked },
    }
    resetUserMoneySettings()
    try {
      expect(readUserMoneySettings()).toEqual(DEFAULT_USER_MONEY_SETTINGS)
      /* nilai tetap hidup di memori sesi ini walau tidak bisa dipersist */
      expect(saveUserMoneySettings({ monthlyIncome: 4_000_000 }).monthlyIncome).toBe(4_000_000)
      expect(readUserMoneySettings().monthlyIncome).toBe(4_000_000)
      expect(() => purgeUserMoneySettings()).not.toThrow()
    } finally {
      globalWithWindow.window = before
      resetUserMoneySettings()
    }
  })
})
describe('readUserMoneySettings · default & sumber awal', () => {


  it('tanpa window (server/test) -> default: belum diatur, bukan angka contoh', () => {
    expect(readUserMoneySettings()).toEqual(DEFAULT_USER_MONEY_SETTINGS)
    expect(hasConfiguredIncome(readUserMoneySettings())).toBe(false)
  })

  it('tanpa apa pun di storage -> pemasukan 0 & `hasConfiguredIncome` false', () => {
    withFakeStorage({}, () => {
      const settings = readUserMoneySettings()
      expect(settings.monthlyIncome).toBe(0)
      expect(settings.totalInstallments).toBe(0)
      expect(settings.paydayDate).toBeNull()
      expect(hasConfiguredIncome(settings)).toBe(false)
    })
  })

  it('hasil onboarding jadi SUMBER AWAL (dulu `monthlyIncome` nol pemakai)', () => {
    withFakeStorage({ [ONBOARDING_STORE_KEY]: JSON.stringify(ONBOARDED) }, () => {
      const settings = readUserMoneySettings()
      expect(settings.monthlyIncome).toBe(9_000_000)
      expect(settings.paydayDate).toBe(25)
      expect(settings.dashboardPeriod).toBe('cycle')
      expect(hasConfiguredIncome(settings)).toBe(true)
    })
  })

  it('onboarding yang di-SKIP (pemasukan opsional) bukan konfigurasi', () => {
    const skipped = { ...ONBOARDED, monthlyIncome: 0, paydayDate: null, dashboardPeriod: 'calendar' }
    withFakeStorage({ [ONBOARDING_STORE_KEY]: JSON.stringify(skipped) }, () => {
      expect(readUserMoneySettings().monthlyIncome).toBe(0)
      expect(hasConfiguredIncome(readUserMoneySettings())).toBe(false)
    })
  })


describe('purge (Hapus Akun)', () => {
  it('membuang nilai & menulis penanda `purged` supaya tidak lahir kembali', async () => {
    const globals = globalThis as { window?: unknown; localStorage?: unknown }
    const settingsRaw = JSON.stringify({ version: 1, monthlyIncome: 9_000_000 })
    const seed = {
      [ONBOARDING_STORE_KEY]: JSON.stringify(ONBOARDED),
      [USER_MONEY_SETTINGS_KEY]: settingsRaw,
    }
    /* realisasi mini dari `purgeDeviceData()`: kunci `catet*` disapu dulu... */
    withFakeStorage(seed, (store) => {
      store.removeItem(USER_MONEY_SETTINGS_KEY)
      /* ...lalu store-nya dipanggil (urutan yang sama dengan lib/account.ts) */
      purgeUserMoneySettings()

      expect(readUserMoneySettings().monthlyIncome).toBe(0)
      expect(hasConfiguredIncome(readUserMoneySettings())).toBe(false)
      /* penandanya tertulis — bukti, bukan klaim */
      expect(storedSettings(store)?.purged).toBe(true)

      /* MUAT ULANG HALAMAN: modul dibaca dari nol, storage dibiarkan apa adanya.
         Nilai dari onboarding TIDAK boleh hidup lagi setelah "Hapus Akun". */
      const stillSeeded = store
      expect(stillSeeded.getItem(ONBOARDING_STORE_KEY)).not.toBeNull()
      vi.resetModules()
      return import('./user-money-settings').then((fresh) => {
        expect(fresh.readUserMoneySettings().monthlyIncome).toBe(0)
      })
    })
    expect(globals.window).toBeUndefined()
  })
})

describe('hasConfiguredIncome', () => {
  it('hanya true kalau pemasukan benar-benar > 0 (0 = belum diatur)', () => {
    expect(hasConfiguredIncome({ ...DEFAULT_USER_MONEY_SETTINGS, monthlyIncome: 0 })).toBe(false)
    expect(hasConfiguredIncome({ ...DEFAULT_USER_MONEY_SETTINGS, monthlyIncome: 1 })).toBe(true)
  })
})

  it('nilai tersimpan MENANG atas hasil onboarding (user sudah mengubahnya)', () => {
    withFakeStorage(
      {
        [ONBOARDING_STORE_KEY]: JSON.stringify(ONBOARDED),
        [USER_MONEY_SETTINGS_KEY]: JSON.stringify({
          version: 1,
          monthlyIncome: 12_000_000,
          totalInstallments: 1_070_000,
          paydayDate: 20,
          dashboardPeriod: 'calendar',
          updatedAt: 1,
        }),
      },
      () => {
        const settings = readUserMoneySettings()
        expect(settings.monthlyIncome).toBe(12_000_000)
        expect(settings.totalInstallments).toBe(1_070_000)
        expect(settings.paydayDate).toBe(20)
        expect(settings.dashboardPeriod).toBe('calendar')
      },
    )
  })
})

