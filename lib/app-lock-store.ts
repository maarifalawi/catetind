import { EMPTY_ATTEMPT_STATE, isValidPin, type PinAttemptState } from './data/app-lock'

/* ── PENYIMPANAN PIN PERANGKAT (paket 39) ────────────────────────────────────
   Apa yang disimpan: SALT + HASH PBKDF2-SHA256 (210.000 iterasi). Tidak ada
   angka PIN, tidak ada kunci turunan yang bisa dipakai langsung. Verifikasinya
   memakai perbandingan XOR penuh (bukan `===` yang berhenti di byte pertama).

   Di mana: `localStorage` perangkat ini. Di produksi (kalau PIN tetap dipakai)
   ia harus jadi kredensial perangkat yang disimpan platform (WebAuthn passkey /
   Secure Enclave / Keychain) atau minimal IndexedDB + kunci yang di-derive dari
   biometrik — bukan localStorage yang bisa dibaca DevTools. Batas ini dinyatakan
   di UI (`LOCK_SCREEN_COPY.deviceOnlyNote`) dan di laporan paket.

   Modul ini SENGAJA tidak memakai `'use client'`: ia hanya menyentuh browser
   saat dipanggil, bukan saat diimpor, dan seluruh bacaan dijaga `typeof window`
   → aman di-render server tanpa hydration mismatch.
   ────────────────────────────────────────────────────────────────────────── */

const LOCK_STORAGE_KEY = 'catet-ind-app-lock'
const ATTEMPT_STORAGE_KEY = 'catet-ind-app-lock-attempts'

/** iterasi PBKDF2 — angka standar OWASP 2023 untuk SHA-256 */
export const PBKDF2_ITERATIONS = 210_000

export interface LockRecord {
  version: 1
  /** salt acak 16 byte (base64) */
  salt: string
  /** hash PBKDF2 (base64) */
  hash: string
  iterations: number
  /** id kredensial WebAuthn perangkat; `null` = biometrik belum dinyalakan */
  credentialId: string | null
  /** epoch ms saat PIN terakhir diubah */
  updatedAt: number
}

function toBase64(bytes: Uint8Array): string {
  let binary = ''
  for (const byte of bytes) binary += String.fromCharCode(byte)
  return btoa(binary)
}

function fromBase64(value: string): Uint8Array {
  const binary = atob(value)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  return bytes
}

function randomSalt(): Uint8Array {
  return crypto.getRandomValues(new Uint8Array(16))
}

async function derive(pin: string, salt: Uint8Array, iterations: number): Promise<Uint8Array> {
  const material = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(pin),
    'PBKDF2',
    false,
    ['deriveBits'],
  )
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt, iterations, hash: 'SHA-256' },
    material,
    256,
  )
  return new Uint8Array(bits)
}

/** perbandingan konstan-waktu sederhana: selalu menelusuri seluruh byte */
function equalBytes(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false
  let diff = 0
  for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i]
  return diff === 0
}

function storage(): Storage | null {
  if (typeof window === 'undefined') return null
  try {
    return window.localStorage
  } catch {
    /* localStorage diblokir (mode privat) — app tetap jalan, PIN tidak persist */
    return null
  }
}

function parseLockRecord(raw: string | null): LockRecord | null {
  if (!raw) return null
  try {
    const parsed = JSON.parse(raw) as Partial<LockRecord>
    if (
      parsed.version !== 1 ||
      typeof parsed.salt !== 'string' ||
      typeof parsed.hash !== 'string' ||
      typeof parsed.iterations !== 'number'
    ) {
      return null
    }
    return {
      version: 1,
      salt: parsed.salt,
      hash: parsed.hash,
      iterations: parsed.iterations,
      credentialId: typeof parsed.credentialId === 'string' ? parsed.credentialId : null,
      updatedAt: typeof parsed.updatedAt === 'number' ? parsed.updatedAt : 0,
    }
  } catch {
    return null
  }
}

/** record PIN tersimpan; `null` = kunci app belum pernah dinyalakan */
export function readLockRecord(): LockRecord | null {
  const store = storage()
  return store ? parseLockRecord(store.getItem(LOCK_STORAGE_KEY)) : null
}

export function lockIsEnabled(): boolean {
  return readLockRecord() !== null
}

/**
 * Buat/ganti PIN. Angka PIN divalidasi `isValidPin` (6 digit) — pemanggil yang
 * salah bentuk akan mendapat `null`, bukan record setengah jadi.
 */
export async function createLockRecord(pin: string): Promise<LockRecord | null> {
  if (!isValidPin(pin)) return null
  const salt = randomSalt()
  const hash = await derive(pin, salt, PBKDF2_ITERATIONS)
  const previous = readLockRecord()
  const record: LockRecord = {
    version: 1,
    salt: toBase64(salt),
    hash: toBase64(hash),
    iterations: PBKDF2_ITERATIONS,
    /* ganti PIN = kredensial biometrik lama tetap dipakai, asal perangkat sama */
    credentialId: previous?.credentialId ?? null,
    updatedAt: Date.now(),
  }
  storage()?.setItem(LOCK_STORAGE_KEY, JSON.stringify(record))
  return record
}

/** PIN benar? (menghitung ulang PBKDF2 dari salt tersimpan) */
export async function verifyPin(pin: string): Promise<boolean> {
  const record = readLockRecord()
  if (!record || !isValidPin(pin)) return false
  const candidate = await derive(pin, fromBase64(record.salt), record.iterations)
  return equalBytes(candidate, fromBase64(record.hash))
}

/** matikan kunci app (PIN & state percobaan dibuang dari perangkat ini) */
export function clearLockRecord(): void {
  const store = storage()
  if (!store) return
  store.removeItem(LOCK_STORAGE_KEY)
  store.removeItem(ATTEMPT_STORAGE_KEY)
}

/* ── KREDENSIAL BIOMETRIK ─────────────────────────────────────────────────── */

export function setBiometricCredential(credentialId: string | null): void {
  const store = storage()
  const record = readLockRecord()
  if (!store || !record) return
  store.setItem(LOCK_STORAGE_KEY, JSON.stringify({ ...record, credentialId }))
}

export function readBiometricCredentialId(): string | null {
  return readLockRecord()?.credentialId ?? null
}

/* ── STATE PERCOBAAN SALAH (anti brute-force) ───────────────────────────────
   SENGAJA dipersist: kalau hanya hidup di memori, menutup tab akan mengembalikan
   5 percobaan baru — dan anti brute-force-nya tinggal di-refresh. */

export function readAttemptState(): PinAttemptState {
  const store = storage()
  if (!store) return { ...EMPTY_ATTEMPT_STATE }
  try {
    const parsed = JSON.parse(store.getItem(ATTEMPT_STORAGE_KEY) ?? 'null') as Partial<PinAttemptState> | null
    if (!parsed || typeof parsed.failures !== 'number') return { ...EMPTY_ATTEMPT_STATE }
    return {
      failures: Math.max(0, parsed.failures),
      lockedUntil: typeof parsed.lockedUntil === 'number' ? parsed.lockedUntil : null,
    }
  } catch {
    return { ...EMPTY_ATTEMPT_STATE }
  }
}

export function writeAttemptState(state: PinAttemptState): void {
  storage()?.setItem(ATTEMPT_STORAGE_KEY, JSON.stringify(state))
}
