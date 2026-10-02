/* ── Data & copy alur AKUN (registrasi di /checkout · login magic link) ───────
   PRD 5904–5905 & 5933 (BIMA & CANDRA): user mendaftar dengan DUA field saja —
   email + nama panggilan. ZERO password, telepon, alamat, gender, tanggal lahir.
   Verifikasi email TIDAK memblokir: user langsung masuk onboarding, tautan masuk
   (magic link) dikirim ke emailnya dan bisa diklik kapan saja.

   File ini murni data + validasi (tanpa React) supaya tidak ada string form yang
   tersebar di JSX. Prompt 09 (login) menambah konstanta sisi login ke file yang
   SAMA — jangan bikin file kedua untuk hal yang sama.
   ────────────────────────────────────────────────────────────────────────── */

/** batas panjang field — angka teknis, bukan gaya bahasa */
export const EMAIL_MAX_LENGTH = 254
export const NICKNAME_MAX_LENGTH = 24

export const REGISTRATION_COPY = {
  /** judul sheet registrasi (inventaris: "Registration / Identifikasi") */
  title: 'Daftar CatetInd',
  description: 'Dua field aja. Nggak ada password, nggak ada data pribadi lain.',
  emailLabel: 'Email',
  emailPlaceholder: 'namakamu@email.com',
  emailHint: 'Tautan masuk & struk pembayaran dikirim ke alamat ini.',
  nameLabel: 'Nama panggilan',
  namePlaceholder: 'Rina',
  nameHint: 'Dipakai buat nyapa kamu di app. Bisa diubah kapan aja.',
  /** copy kanon PRD 5933 — kekuatan halaman ini ada di kalimat ini */
  noPasswordNote: 'Nggak perlu bikin password — kita kirim tautan masuk ke emailmu.',
  submitLabel: 'Buat akun',
  /** label tombol saat permintaan registrasi sedang berjalan (paket 64) —
   *  mencegah dua ketukan membuat dua pendaftaran */
  submittingLabel: 'Mendaftarkan…',
  invalidEmail: 'Hmm, format emailnya belum benar. Contoh: rina@email.com',
  invalidNickname: 'Nama panggilan minimal 2 huruf ya.',
  /** tautan dua arah ke /login — dilunasi di prompt 09 setelah route-nya ada */
  hasAccountLead: 'Sudah punya akun?',
  hasAccountLink: 'Masuk',
  /** catatan langkah berikutnya di sheet (paket 64). Sheet registrasi BENAR-BENAR
   *  mendaftarkan akun Supabase, jadi user wajib tahu langkah berikutnya ada di
   *  inbox. Paragraf "demo" yang panjang dihapus — footer sheet bukan disclaimer. */
  emailNextNote: 'Langkah terakhir: buka tautan konfirmasi yang kami kirim ke emailmu.',
} as const

/**
 * Validasi email ringan (bukan RFC lengkap): satu `@`, ada titik di domain,
 * tanpa spasi. Cukup untuk menahan salah ketik — verifikasi sungguhan tetap
 * dilakukan Supabase lewat magic link yang benar-benar diklik user.
 */
export function isValidEmail(value: string): boolean {
  const trimmed = value.trim()
  return trimmed.length > 0 && trimmed.length <= EMAIL_MAX_LENGTH && /^[^\s@]+@[^\s@]+\.[A-Za-z]{2,}$/.test(trimmed)
}

/** nama panggilan: minimal 2 huruf, tanpa perlu nama lengkap/formalitas */
export function isValidNickname(value: string): boolean {
  const trimmed = value.trim()
  return trimmed.length >= 2 && trimmed.length <= NICKNAME_MAX_LENGTH
}

/* ── MASUK DENGAN MAGIC LINK (inventaris #8 & #9 · PRD 5931–5933) ────────────
   CANDRA: "Magic link: Supabase Auth supports OTP/magic link natively… lebih
   simpel dari password + confirm password dan lebih aman." Karena itu halaman
   masuk di sini TIDAK punya satu pun field password: user cuma menulis email,
   lalu tautan masuk dikirim ke inbox-nya.

   Tiga aturan psikologis yang mengikat seluruh copy di bawah (CONTEXT-WAJIB §5):
     1. ZERO password — user yang diminta bikin password saat baru mau masuk
        adalah user yang berhenti. Satu field, satu tombol.
     2. Jangan mengungkap keberadaan akun — untuk email yang tidak terdaftar
        pesannya TETAP netral ("kalau emailnya terdaftar…"), sekaligus aman & sopan.
     3. Jangan membuat menunggu terasa hampa — halaman cek email harus memberi
        langkah berikutnya + jalan keluar (kirim ulang, ganti email, buka demo).

   Arah produksi (sekali baca, biar tidak ada yang menebak-nebak):
     await supabase.auth.signInWithOtp({
       email,
       options: { emailRedirectTo: `${window.location.origin}/login/verify` },
     })
   Supabase yang membuat token sekali pakai + masa berlakunya dan yang mengirim
   emailnya. Di repo demo ini pengirimannya MOCK: cuma timer di klien.
   ────────────────────────────────────────────────────────────────────────── */

/** detik cooldown "Kirim ulang" — rate-limit dikomunikasikan sebagai hitung
 *  mundur, bukan tombol mati tanpa penjelasan */
export const RESEND_SECONDS = 60

/**
 * Lama simulasi pengiriman (ms). Cukup untuk memperlihatkan state loading pada
 * tombol — MOCK, bukan jaringan sungguhan: tidak ada apa pun di sini yang
 * menyamar sebagai request nyata. Di produksi nilai ini digantikan oleh
 * `await supabase.auth.signInWithOtp(...)`.
 */
export const MAGIC_LINK_SENDER = 'CatetInd'

/** berapa lama konfirmasi "tautan baru sudah dikirim" tampil di halaman (ms) */
export const RESENT_NOTE_MS = 6000

/** basis tautan di dalam email (absolute, karena dibuka dari app email) */

/** token demo statis — di produksi tokennya sekali pakai & digenerate Supabase */

/** halaman masuk & halaman tujuan tautan — satu sumber supaya tidak bercabang */
export const LOGIN_PATH = '/login'
export const VERIFY_PATH = '/login/verify'

export const LOGIN_COPY = {
  eyebrow: 'Masuk',
  title: 'Masuk ke CatetInd',
  subtitle: 'Cukup satu email. Kami kirim tautan masuk — nggak ada password yang perlu diingat.',
  emailLabel: 'Email',
  emailPlaceholder: 'namakamu@email.com',
  emailHint: 'Tautan masuk dikirim ke alamat ini. Tautannya sekali pakai, aman dibuka dari HP mana pun.',
  /** copy kanon yang diminta prompt halaman ini — janji kepercayaan produk */
  trustNote:
    'Nggak perlu bikin password. Kami kirim tautan masuk ke emailmu — kamu yang pegang kendali, kami nggak simpan password apa pun.',
  submitLabel: 'Kirim Magic Link',
  sendingLabel: 'Mengirim tautan…',
  /** aksi sekunder: belum punya akun → daftar (route /checkout sudah ada) */
  registerLead: 'Belum punya akun?',
  registerLink: 'Daftar',
  /** jalan keluar kecil di kaki halaman — bukan user yang disalahkan, tapi kami yang dibantu */
  helpLead: 'Emailmu nggak ketemu?',
  helpLink: 'Kabarin kami di Pusat Bantuan.',
  helpHref: '/help',
} as const


/* ── CEK EMAIL / CALLBACK (inventaris #9) ────────────────────────────────────
   Halaman ini punya satu pekerjaan: membuat menunggu terasa punya langkah.
   Karena itu isinya bukan cuma "cek email", tapi urutan berikutnya + tombol
   kirim ulang ber-cooldown + jalan keluar (ganti email / lanjut demo). */

export const VERIFY_COPY = {
  eyebrow: 'Cek email',
  title: 'Cek emailmu, ya 📩',
  /** diikuti alamat email di baris berikutnya — lihat `VerifyEmailScreen` */
  sentLead: 'Tautan masuk sudah dikirim ke',
  /** kalau user sampai ke sini tanpa `?email=` (mis. bookmark lama) */
  emailFallback: 'email yang kamu masukkan tadi',
  /** PESAN NETRAL — sengaja sama untuk email terdaftar maupun tidak terdaftar */
  neutralNote:
    'Kalau emailnya terdaftar, tautan sudah dikirim — pesannya sengaja sama buat semua email, jadi nggak ada yang bisa menebak siapa punya akun.',
  expireNote: 'Tautan sekali pakai dan umurnya pendek, jadi jangan diteruskan ke orang lain ya.',
  stepsTitle: 'Urutan berikutnya',
  steps: [
    'Buka inbox email itu — cek folder spam/promosi kalau belum kelihatan',
    'Klik tombol "Masuk ke CatetInd" di dalam email',
    'Kamu balik ke app dengan sesi aktif, tanpa isi apa pun lagi',
  ],
  /** `mailto:` tanpa alamat = buka app email default, bukan mengirim ke siapa pun */
  openMailLabel: 'Buka email',
  resendLabel: 'Kirim ulang',
  /** umpan balik kecil setelah kirim ulang — menenangkan, bukan heboh */
  resendSentNote: 'Tautan baru sudah dikirim. Cek inbox lagi ya 📩',
  /** state #9b: tautan kedaluwarsa / sudah dipakai (jangan pernah layar buntu) */
  expiredTitle: 'Tautan ini sudah dipakai atau kedaluwarsa.',

  expiredBody: 'Kirim ulang ya — nggak ada yang hilang.',
  changeEmailLabel: 'Ganti email',
  /** kartu masuk dengan KODE dari email (paket 45: Supabase Auth, bukan demo) */
  otpTitle: 'Masuk pakai kode dari email',
  otpLabel: 'Kode 6 angka dari email',
  otpHint: 'Tulis 6 angka yang ada di emailnya — atau klik tautannya langsung dari inbox.',
  otpSubmitLabel: 'Masuk sekarang',
  otpFailedTitle: 'Kodenya belum bisa dipakai',
  /** tautan email gagal ditukar jadi sesi (sudah dipakai / kedaluwarsa) */
  linkFailedTitle: 'Tautan masuknya tidak berlaku lagi',
  resendFailed: 'Gagal mengirim ulang tautan',
} as const

/**
 * Jembatan "Keluar → Masuk lagi": dipakai panel Keluar di Pengaturan supaya
 * kalimat "masuk lagi" tidak pernah bercabang antar halaman.
 */
export const RELOGIN_COPY = {
  lead: 'Mau keluar dan masuk lagi nanti?',
  link: 'Masuk pakai tautan email',
  suffix: '— tanpa password, cukup dari inbox.',
} as const

/* ── SESI (paket 39) ────────────────────────────────────────────────────────
   Copy untuk UI yang MEMBUAT & MENGAKHIRI sesi: tombol "Lanjut masuk (demo)" di
   /login/verify, panel Keluar, dan alur "Lupa PIN" di layar kunci.

   Nada yang dijaga: tidak pernah berpura-pura ada sesi produksi. Tombol yang
   membuat sesi diberi label "demo", dan konfirmasi keluar menyebut apa yang
   benar-benar terjadi ("sesi di perangkat ini diakhiri") — dulu panel Keluar
   justru mengaku "sesi belum benar-benar diakhiri" padahal tidak ada sesi
   sama sekali. */
export const SESSION_COPY = {
  /** label tombol saat permintaan sesi sedang berjalan (tukar tautan / kode) */
  signingIn: 'Menyambungkan ke akunmu…',
  signInToast: 'Kamu sudah masuk 🌿',
  signInToastDescription:
    'Sesi ini milik Supabase Auth: tokennya ditandatangani server, dan datamu hanya bisa dibaca atas nama akunmu (RLS di database).',
  signInFailed: 'Gagal masuk',
  /** panel Keluar */
  signedOutToast: 'Sampai jumpa lagi! 👋',
  signedOutToastDescription: 'Sesi di perangkat ini sudah diakhiri. Datamu tetap tersimpan di akun.',
  signOutFailed: 'Sesi tidak bisa diakhiri dari sini',
  signOutFailedDescription: 'Jaringan tidak bisa dihubungi. Coba lagi sebentar ya.',
  /**
   * Dipakai titik yang MEMBUTUHKAN sesi (mis. tombol tes push) saat endpoint
   * menjawab 401. Sebelum paket 39 titik itu menganggap dirinya berhasil, karena
   * endpoint-nya memang tidak pernah memeriksa sesi.
   */
  noSessionTitle: 'Sesi belum aktif',
  noSessionBody:
    'Masuk dulu lewat halaman masuk (tautan atau kode dari email) supaya notifikasi ini tersimpan atas namamu — bukan atas nama pemanggil anonim.',
  noSessionCta: 'Buka halaman masuk',
} as const

/** halaman masuk in-app (bukan tautan absolute yang ada di email) */
export function buildVerifyHref(email: string): string {
  return `${VERIFY_PATH}?email=${encodeURIComponent(email.trim())}`
}

/**
 * Pratinjau state kedaluwarsa (`?status=expired`). Query, bukan route baru:
 * kejadian ini tidak punya alamat sendiri di produk nyata — user datang ke
 * `/login/verify` yang sama, hanya saja tautannya sudah tidak berlaku.
 */
export function buildExpiredPreviewHref(email: string): string {
  return `${buildVerifyHref(email)}&status=expired`
}

/** label hitung mundur kirim ulang — teks yang menjelaskan, bukan tombol mati */
export function resendCountdownLabel(secondsLeft: number): string {
  return `${VERIFY_COPY.resendLabel} dalam ${secondsLeft} detik`
}
