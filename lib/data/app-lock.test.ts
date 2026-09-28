import { describe, expect, it } from 'vitest'
import {
  AUTO_LOCK_IDLE_MS,
  EMPTY_ATTEMPT_STATE,
  MAX_PIN_ATTEMPTS,
  PIN_LENGTH,
  PIN_LOCKOUT_MS,
  attemptsLeft,
  formatLockoutCountdown,
  isLockedOut,
  isValidPin,
  lockoutRemainingMs,
  registerFailedAttempt,
  registerSuccess,
  type PinAttemptState,
} from './app-lock'

/* ── Test kebijakan kunci aplikasi (paket 39) ────────────────────────────────
   PIN 6 angka dengan 5 percobaan tanpa pengaman adalah PIN 6 angka yang bisa
   dibuka siapa pun yang sempat memegang HP-nya selama satu menit. Test ini
   mengunci kebijakan yang menutupnya — dan sekaligus mengunci janji copy-nya:
   "5 salah → tunggu 5 menit", bukan angka yang bisa berubah diam-diam. */

const NOW = 1_800_000_000_000

function failTimes(count: number, from: PinAttemptState = EMPTY_ATTEMPT_STATE) {
  let state = from
  for (let i = 0; i < count; i++) state = registerFailedAttempt(state, NOW)
  return state
}

describe('isValidPin · bentuk PIN', () => {
  it(`menerima tepat ${PIN_LENGTH} angka`, () => {
    expect(isValidPin('123456')).toBe(true)
    expect(isValidPin('000000')).toBe(true)
  })

  it('menolak panjang salah, huruf, spasi, atau angka campur', () => {
    expect(isValidPin('12345')).toBe(false)
    expect(isValidPin('1234567')).toBe(false)
    expect(isValidPin('12345a')).toBe(false)
    expect(isValidPin(' 123456')).toBe(false)
    expect(isValidPin('')).toBe(false)
  })
})

describe('anti brute-force · 5 salah → tunggu 5 menit', () => {
  it('percobaan 1–4 belum mengunci, tapi sisa percobaannya berkurang', () => {
    const afterOne = registerFailedAttempt(EMPTY_ATTEMPT_STATE, NOW)
    expect(isLockedOut(afterOne, NOW)).toBe(false)
    expect(attemptsLeft(afterOne)).toBe(MAX_PIN_ATTEMPTS - 1)

    const afterFour = failTimes(MAX_PIN_ATTEMPTS - 1)
    expect(isLockedOut(afterFour, NOW)).toBe(false)
    expect(attemptsLeft(afterFour)).toBe(1)
  })

  it('percobaan kelima → terkunci tepat 5 menit', () => {
    const locked = failTimes(MAX_PIN_ATTEMPTS)
    expect(isLockedOut(locked, NOW)).toBe(true)
    expect(locked.lockedUntil).toBe(NOW + PIN_LOCKOUT_MS)
    expect(lockoutRemainingMs(locked, NOW)).toBe(PIN_LOCKOUT_MS)
  })

  it('sisa waktu menyusut dan hitung mundurnya terbaca `m:ss`', () => {
    const locked = failTimes(MAX_PIN_ATTEMPTS)
    const twoMinutesIn = NOW + PIN_LOCKOUT_MS - 2 * 60 * 1000
    expect(lockoutRemainingMs(locked, twoMinutesIn)).toBe(2 * 60 * 1000)
    expect(formatLockoutCountdown(2 * 60 * 1000)).toBe('2:00')
    expect(formatLockoutCountdown(59 * 1000)).toBe('0:59')
  })

  it('setelah masa tunggu lewat, user kembali punya 5 percobaan', () => {
    const locked = failTimes(MAX_PIN_ATTEMPTS)
    const after = NOW + PIN_LOCKOUT_MS + 1
    expect(isLockedOut(locked, after)).toBe(false)
    expect(lockoutRemainingMs(locked, after)).toBe(0)
    /* catatan penting: counter sudah di-reset saat masuk mode tunggu, jadi salah
       ketik berikutnya mulai dari 1 — bukan langsung mengunci lagi */
    expect(locked.failures).toBe(0)
  })

  it('PIN benar membersihkan percobaan salah & masa tunggu', () => {
    const state = registerSuccess()
    expect(state).toEqual(EMPTY_ATTEMPT_STATE)
  })

  it('format hitung mundur tidak pernah negatif', () => {
    expect(formatLockoutCountdown(-5000)).toBe('0:00')
  })
})

describe('angka idle auto-lock', () => {
  it('60 detik — cukup untuk menaruh HP, tidak mengganggu saat membaca', () => {
    expect(AUTO_LOCK_IDLE_MS).toBe(60 * 1000)
  })
})
