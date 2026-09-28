/* ── KUNCI APLIKASI (PIN) — data, copy, dan kebijakan murni (paket 39) ───────
   Sebelum paket ini, toggle "Kunci Aplikasi dengan PIN" hanya `useState` di
   `settings-panel-privacy.tsx` sambil berbunyi "App minta PIN tiap dibuka" —
   tidak ada satu baris lain di repo yang membaca statusnya. Janji itu sekarang
   ditepati: layar kunci ada di root layout dan benar-benar menghalangi render
   halaman app.

   File ini memegang hal-hal yang BISA DIUJI tanpa browser (angka kebijakan +
   aturan anti brute-force + seluruh copy). Penyimpanan & kriptografinya ada di
   `lib/app-lock-store.ts`, UI-nya di `components/catetind/app-lock-*`.

   Batas yang harus jujur: PIN ini mengunci PERANGKAT, bukan akun. Ia tersimpan
   sebagai hash PBKDF2 di perangkat (bukan di server), jadi:
     • orang yang memegang perangkat + punya akses DevTools bisa menghapus
       storagenya — APP LOCK bukan pengganti autentikasi server (`lib/session.ts`);
     • PIN 6 angka hanya punya 10⁶ kemungkinan, jadi brute-force OFFLINE tetap
       mungkin; PBKDF2 210.000 iterasi memperlambatnya, dan anti brute-force di
       UI menutup jalur online (5 salah → tunggu 5 menit).
   ────────────────────────────────────────────────────────────────────────── */

/** panjang PIN — 6 angka, sama seperti yang tertulis di pengaturan */
export const PIN_LENGTH = 6

/** percobaan salah sebelum dikunci sementara */
export const MAX_PIN_ATTEMPTS = 5

/** lama tunggu setelah melewati batas percobaan (audit: 5 menit) */
export const PIN_LOCKOUT_MS = 5 * 60 * 1000

/** idle → auto-lock. 60 detik: cukup untuk menaruh HP, tidak mengganggu saat membaca */
export const AUTO_LOCK_IDLE_MS = 60 * 1000

/* ── KEBIJAKAN MURNI (diuji di `lib/data/app-lock.test.ts`) ────────────────── */

export interface PinAttemptState {
  /** jumlah percobaan salah berturut-turut */
  failures: number
  /** epoch ms sampai kapan input ditolak; `null` = tidak sedang dikunci */
  lockedUntil: number | null
}

export const EMPTY_ATTEMPT_STATE: PinAttemptState = { failures: 0, lockedUntil: null }

/** hanya angka & panjangnya tepat — dipakai keypad maupun dialog pengaturan */
export function isValidPin(pin: string): boolean {
  return new RegExp(`^\\d{${PIN_LENGTH}}$`).test(pin)
}

export function isLockedOut(state: PinAttemptState, now = Date.now()): boolean {
  return state.lockedUntil !== null && now < state.lockedUntil
}

/** sisa waktu tunggu (ms); 0 kalau tidak sedang dikunci */
export function lockoutRemainingMs(state: PinAttemptState, now = Date.now()): number {
  if (state.lockedUntil === null) return 0
  return Math.max(0, state.lockedUntil - now)
}

/**
 * Catat satu percobaan SALAH.
 *
 * Saat percobaan ke-`MAX_PIN_ATTEMPTS` habis, state masuk mode tunggu 5 menit dan
 * hitungan percobaan di-reset — supaya setelah masa tunggu selesai user kembali
 * punya 5 kesempatan (bukan terkunci selamanya karena satu salah ketik lagi).
 */
export function registerFailedAttempt(state: PinAttemptState, now = Date.now()): PinAttemptState {
  const failures = state.failures + 1
  if (failures >= MAX_PIN_ATTEMPTS) {
    return { failures: 0, lockedUntil: now + PIN_LOCKOUT_MS }
  }
  return { failures, lockedUntil: null }
}

/** PIN benar: percobaan salah & masa tunggu dibersihkan */
export function registerSuccess(): PinAttemptState {
  return { ...EMPTY_ATTEMPT_STATE }
}

/** `m:ss` — dipakai hitung mundur masa tunggu (tanpa `toFixed`/locale mesin) */
export function formatLockoutCountdown(ms: number): string {
  const total = Math.max(0, Math.ceil(ms / 1000))
  const minutes = Math.floor(total / 60)
  const seconds = total % 60
  return `${minutes}:${String(seconds).padStart(2, '0')}`
}

/** sisa percobaan yang masih dimiliki user (dipakai copy peringatan) */
export function attemptsLeft(state: PinAttemptState): number {
  return Math.max(0, MAX_PIN_ATTEMPTS - state.failures)
}

/* ── COPY ───────────────────────────────────────────────────────────────────
   Semua kalimat yang dilihat user tinggal di sini; komponennya nol string.
   Nada layar kunci sengaja tenang & tidak menuduh (CONTEXT-WAJIB §5.3): yang
   dibutuhkan user yang lupa PIN bukan teguran, tapi jalan keluar. */

export const LOCK_SCREEN_COPY = {
  eyebrow: 'Kunci aplikasi',
  title: 'Masukin PIN kamu 🔒',
  subtitle: (length: number) => `${length} angka. PIN-nya cuma ada di perangkat ini.`,
  keypadAria: 'Papan angka PIN',
  backspaceAria: 'Hapus satu angka',
  /** dipakai pembaca layar untuk menghitung angka yang sudah masuk */
  progressAria: (filled: number, length: number) => `${filled} dari ${length} angka terisi`,
  wrongPin: (left: number) =>
    left > 0
      ? `PIN-nya belum cocok. Sisa ${left} percobaan sebelum app dikunci sementara.`
      : 'PIN-nya belum cocok.',
  lockoutTitle: 'Tunggu sebentar ya ⏳',
  lockoutBody: (countdown: string) =>
    `Karena sudah ${MAX_PIN_ATTEMPTS} kali salah, input PIN ditutup sementara. Coba lagi dalam ${countdown}.`,
  /** "Lupa PIN" = jalan keluar, bukan layar buntu */
  forgotLink: 'Lupa PIN?',
  forgotTitle: 'Lupa PIN? Tenang, ada jalan keluarnya',
  forgotBody:
    'Kami akhiri sesi di perangkat ini dan kamu masuk ulang lewat tautan email. Setelah itu kamu bisa bikin PIN baru. Catatan keuanganmu tidak ikut terhapus.',
  forgotCta: 'Akhiri sesi & masuk ulang',
  forgotCancel: 'Nggak jadi',
  biometricCta: 'Buka dengan Sidik Jari / Face ID',
  biometricPending: 'Menunggu sensor perangkat…',
  biometricFailed: 'Sensor perangkatnya belum berhasil. Pakai PIN dulu ya.',
  /** keterangan jujur soal apa yang diverifikasi perangkat & apa yang tidak */
  biometricNote:
    'Sensor perangkat yang memeriksa sidik jari/wajahmu. CatetInd cuma menerima jawabannya sebagai pembuka layar ini.',
  deviceOnlyNote: 'PIN & kunci datanya tersimpan di perangkat ini — tidak dikirim ke server.',
} as const

export const LOCK_SETTINGS_COPY = {
  toggleLabel: 'Kunci Aplikasi dengan PIN',
  toggleHelper: (length: number) =>
    `Minta PIN ${length} angka setiap kali app dibuka atau ditinggal sebentar.`,
  /** baris biometrik — hanya muncul kalau perangkat punya platform authenticator */
  biometricLabel: 'Buka dengan Sidik Jari / Face ID',
  biometricHelper: 'Setelah PIN dibuat, sensor perangkat bisa jadi jalan cepat membuka kunci.',
  biometricNeedsPin:
    'Buat PIN dulu — sensor perangkat jadi jalan cepat, bukan satu-satunya kunci.',
  biometricUnsupported:
    'Perangkat ini belum menyediakan sensor biometrik untuk web, jadi opsi itu disembunyikan.',
  createTitle: 'Buat PIN Aplikasi',
  changeTitle: 'Ubah PIN Aplikasi',
  disableTitle: 'Matikan Kunci PIN',
  createBody:
    'PIN ini cuma tersimpan di perangkatmu — yang kami simpan sidiknya (hash), bukan angkanya.',
  changeBody: (length: number) => `Masukin PIN lama ${length} angka, lalu PIN barunya.`,
  disableBody: (length: number) =>
    `Masukin PIN ${length} angka buat memastikan yang mematikannya memang kamu.`,
  currentLabel: (length: number) => `PIN sekarang (${length} angka)`,
  newLabel: (length: number) => `PIN baru (${length} angka)`,
  pinPlaceholder: '••••••',
  saveLabel: 'Simpan PIN',
  cancelLabel: 'Batal',
  enableToast: 'Kunci app dengan PIN aktif 🔒',
  enableToastDescription: 'App minta PIN tiap dibuka dan saat ditinggal sebentar.',
  disableToast: 'Kunci PIN dimatikan',
  disableToastDescription: 'App bisa dibuka tanpa PIN di perangkat ini.',
  wrongCurrentPin: 'PIN-nya belum cocok. Coba lagi ya.',
  savedToast: 'PIN aplikasi disimpan 🔒',
  savedToastDescription: 'Cuma tersimpan di perangkat ini, bukan di server kami.',
  biometricOnToast: 'Sidik jari / Face ID aktif 👆',
  biometricOnToastDescription: 'Sensor perangkat sekarang bisa membuka layar kunci.',
  biometricOffToast: 'Biometrik dimatikan',
  biometricFailToast: 'Sensor perangkatnya nggak bisa dipakai',
  biometricFailToastDescription:
    'Bisa jadi perangkatnya belum mendaftarkan sidik jari/wajah. PIN tetap bisa dipakai.',
} as const
