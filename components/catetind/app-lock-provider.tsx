'use client'

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { usePathname } from 'next/navigation'
import { isPublicRoute } from '@/lib/public-routes'
import {
  AUTO_LOCK_IDLE_MS,
  EMPTY_ATTEMPT_STATE,
  attemptsLeft,
  formatLockoutCountdown,
  isLockedOut,
  lockoutRemainingMs,
  registerFailedAttempt,
  registerSuccess,
  type PinAttemptState,
} from '@/lib/data/app-lock'
import {
  clearLockRecord,
  createLockRecord,
  readAttemptState,
  readLockRecord,
  setBiometricCredential,
  verifyPin,
  writeAttemptState,
} from '@/lib/app-lock-store'
import { assertBiometric, isBiometricAvailable, registerBiometric } from '@/lib/biometric-unlock'
import { endSession, fetchSessionUser } from '@/lib/session-client'
import { AppLockScreen } from './app-lock-screen'

/* ── GERBANG KUNCI APLIKASI (paket 39) ───────────────────────────────────────
   Toggle PIN di Pengaturan dulu hanya `useState` yang tidak dibaca siapa pun
   sambil berjanji "app minta PIN tiap dibuka". Provider ini yang menepati janji
   itu: saat PIN aktif, SELURUH halaman app tidak dirender sampai PIN benar —
   bukan cuma ditutup overlay.

   Kapan terkunci:
     • saat app dibuka / di-refresh (`unlocked` sengaja state memori, bukan
       sessionStorage — kalau dipersist di storage, refresh justru tidak mengunci);
     • saat tab ditinggalkan (`visibilitychange` → hidden) — nominal tidak lagi
       terbuka di app switcher;
     • setelah 60 detik tanpa interaksi (idle).

   Kapan TIDAK terkunci: di route publik/pre-app (`lib/public-routes.ts`). Kalau
   layar kunci muncul di /login, user yang lupa PIN tidak punya jalan masuk sama
   sekali — gerbang yang salah tempat = gerbang yang menjebak.

   Batas jujur: keputusannya baru bisa diambil SETELAH mount (record PIN hidup di
   localStorage), jadi ada satu frame di mana halaman app sempat terbentuk sebelum
   layar kunci menggantikannya. Di produksi hal ini tidak terjadi karena sesi &
   gerbangnya diputuskan server (cookie httpOnly) — lihat `lib/session.ts`.
   ────────────────────────────────────────────────────────────────────────── */

type AppLockValue = {
  /** PIN aktif di perangkat ini? (dibaca setelah mount) */
  enabled: boolean
  /** sedang menampilkan layar kunci */
  locked: boolean
  /** sisa percobaan sebelum masa tunggu */
  attemptsLeftCount: number
  /** hitung mundur masa tunggu (`m:ss`) atau `null` kalau tidak sedang dikunci */
  lockoutCountdown: string | null
  biometricAvailable: boolean
  biometricEnabled: boolean
  /** true = PIN benar & app terbuka */
  unlock: (pin: string) => Promise<boolean>
  enablePin: (pin: string) => Promise<boolean>
  changePin: (currentPin: string, nextPin: string) => Promise<boolean>
  disablePin: (currentPin: string) => Promise<boolean>
  enableBiometric: () => Promise<boolean>
  disableBiometric: () => void
  unlockWithBiometric: () => Promise<boolean>
  /**
   * "Lupa PIN": akhiri sesi di perangkat ini + buang PIN-nya, lalu pemanggil
   * mengarahkan user ke /login untuk verifikasi email ulang. Jangan pernah
   * membuka kunci tanpa langkah ini — itu artinya siapa pun yang memegang HP
   * bisa melihat data keuangan.
   */
  forgotPin: () => Promise<void>
  /** kunci seketika (dipakai handler lain bila perlu) */
  lockNow: () => void
}


export function AppLockProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname()
  const [enabled, setEnabled] = useState(false)
  const [locked, setLocked] = useState(false)
  const [attempts, setAttempts] = useState<PinAttemptState>({ ...EMPTY_ATTEMPT_STATE })
  /* penanda tik untuk hitung mundur masa tunggu (1 detik) */
  const [tick, setTick] = useState(0)
  const [biometricAvailable, setBiometricAvailable] = useState(false)
  const [biometricEnabled, setBiometricEnabled] = useState(false)

  /* Baca record PIN SETELAH mount: render pertama server & client sama-sama
     "tidak terkunci" (HTML identik), lalu keadaan sebenarnya diterapkan. */
  useEffect(() => {
    const record = readLockRecord()
    setEnabled(record !== null)
    setLocked(record !== null)
    setBiometricEnabled(record?.credentialId != null)
    setAttempts(readAttemptState())
    void isBiometricAvailable().then(setBiometricAvailable)
  }, [])

  const lockNow = useCallback(() => {
    if (readLockRecord()) setLocked(true)
  }, [])

  /* auto-lock: ditinggal (hidden) atau menganggur 60 detik */
  useEffect(() => {
    if (!enabled) return

    const onVisibility = () => {
      if (document.hidden) lockNow()
    }

    let idleTimer: number | null = null
    const resetIdle = () => {
      if (idleTimer) window.clearTimeout(idleTimer)
      idleTimer = window.setTimeout(lockNow, AUTO_LOCK_IDLE_MS)
    }

    const activity: (keyof WindowEventMap)[] = ['pointerdown', 'keydown', 'mousemove', 'scroll']

    document.addEventListener('visibilitychange', onVisibility)
    activity.forEach((event) => window.addEventListener(event, resetIdle, { passive: true }))
    resetIdle()

    return () => {
      document.removeEventListener('visibilitychange', onVisibility)
      activity.forEach((event) => window.removeEventListener(event, resetIdle))
      if (idleTimer) window.clearTimeout(idleTimer)
    }
  }, [enabled, lockNow])

  /* hitung mundur masa tunggu — hanya berjalan saat memang sedang dikunci */
  const countingDown = isLockedOut(attempts)
  useEffect(() => {
    if (!countingDown) return
    const id = window.setInterval(() => setTick((value) => value + 1), 1000)
    return () => window.clearInterval(id)
  }, [countingDown])

  /* begitu masa tunggu habis, bersihkan state-nya supaya keypad hidup lagi */
  useEffect(() => {
    if (!countingDown) return
    if (lockoutRemainingMs(attempts) === 0) {
      const cleared = registerSuccess()
      writeAttemptState(cleared)
      setAttempts(cleared)
    }
  }, [attempts, countingDown, tick])

  const unlock = useCallback(async (pin: string) => {
    const current = readAttemptState()
    if (isLockedOut(current)) return false

    const ok = await verifyPin(pin)
    if (!ok) {
      const next = registerFailedAttempt(current)
      writeAttemptState(next)
      setAttempts(next)
      return false
    }

    const cleared = registerSuccess()
    writeAttemptState(cleared)
    setAttempts(cleared)
    setLocked(false)
    return true
  }, [])

  const enablePin = useCallback(async (pin: string) => {
    const record = await createLockRecord(pin)
    if (!record) return false
    const cleared = registerSuccess()
    writeAttemptState(cleared)
    setAttempts(cleared)
    setEnabled(true)
    /* sengaja TIDAK langsung mengunci: user baru saja memasangnya di Pengaturan,
       dan janji di UI ("minta PIN tiap dibuka / saat ditinggal") tetap benar
       karena refresh + auto-lock menjalankannya. */
    setLocked(false)
    return true
  }, [])

  const changePin = useCallback(async (currentPin: string, nextPin: string) => {
    if (!(await verifyPin(currentPin))) return false
    const record = await createLockRecord(nextPin)
    if (!record) return false
    const cleared = registerSuccess()
    writeAttemptState(cleared)
    setAttempts(cleared)
    return true
  }, [])

  const disablePin = useCallback(async (currentPin: string) => {
    if (!(await verifyPin(currentPin))) return false
    clearLockRecord()
    setEnabled(false)
    setLocked(false)
    setBiometricEnabled(false)
    setAttempts({ ...EMPTY_ATTEMPT_STATE })
    return true
  }, [])

  const enableBiometric = useCallback(async () => {
    if (!readLockRecord()) return false
    /* identitas untuk kredensial: sesi (kalau ada), kalau tidak akun demo —
       `registerBiometric` hanya memakainya sebagai label kredensial perangkat */
    const user =
      (await fetchSessionUser()) ?? {
        id: 'catetind-device',
        email: 'perangkat@catetind.example',
        name: 'Pemilik perangkat',
      }
    const credentialId = await registerBiometric(user)
    if (!credentialId) return false
    setBiometricCredential(credentialId)
    setBiometricEnabled(true)
    return true
  }, [])

  const disableBiometric = useCallback(() => {
    setBiometricCredential(null)
    setBiometricEnabled(false)
  }, [])

  const unlockWithBiometric = useCallback(async () => {
    const record = readLockRecord()
    if (!record?.credentialId) return false
    const ok = await assertBiometric(record.credentialId)
    if (!ok) return false
    setLocked(false)
    return true
  }, [])

  const forgotPin = useCallback(async () => {
    /* urutannya penting: sesi diakhiri DULU (verifikasi email ulang jadi syarat
       masuk lagi), baru kunci perangkatnya dibuang */
    await endSession()
    clearLockRecord()
    setEnabled(false)
    setLocked(false)
    setBiometricEnabled(false)
    setAttempts({ ...EMPTY_ATTEMPT_STATE })
  }, [])

  const remaining = lockoutRemainingMs(attempts)

  const value = useMemo<AppLockValue>(
    () => ({
      enabled,
      locked,
      attemptsLeftCount: attemptsLeft(attempts),
      lockoutCountdown: countingDown ? formatLockoutCountdown(remaining) : null,
      biometricAvailable,
      biometricEnabled,
      unlock,
      enablePin,
      changePin,
      disablePin,
      enableBiometric,
      disableBiometric,
      unlockWithBiometric,
      forgotPin,
      lockNow,
    }),
    [
      enabled,
      locked,
      attempts,
      countingDown,
      remaining,
      biometricAvailable,
      biometricEnabled,
      unlock,
      enablePin,
      changePin,
      disablePin,
      enableBiometric,
      disableBiometric,
      unlockWithBiometric,
      forgotPin,
      lockNow,
    ],
  )

  /**
   * Route publik/pre-app dilewati: user yang belum bisa masuk tidak boleh
   * ditahan di balik layar kunci milik perangkat (lihat catatan di atas).
   */
  const gateShows = enabled && locked && !isPublicRoute(pathname)

  return (
    <AppLockContext.Provider value={value}>
      {gateShows ? <AppLockScreen /> : children}
    </AppLockContext.Provider>
  )
}

/** dipakai pengaturan (enable/change/disable PIN & biometrik) dan layar kunci */
export function useAppLock() {
  const ctx = useContext(AppLockContext)
  if (!ctx) {
    throw new Error('useAppLock harus dipakai di dalam <AppLockProvider>')
  }
  return ctx
}

const AppLockContext = createContext<AppLockValue | null>(null)