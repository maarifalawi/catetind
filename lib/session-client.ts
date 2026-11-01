'use client'

import { browserSupabase } from './supabase/client'
import { buildVerifyHref } from './data/auth'

/* ── SESI DARI SISI CLIENT (paket 45: SUPABASE AUTH, BUKAN MOCK) ─────────────
   Versi paket 39 meminta cookie ke `POST /api/session` — endpoint demo yang
   menulis cookie tanpa tanda tangan. Sejak paket 45 sesinya milik Supabase:

     · masuk  → `signInWithOtp` mengirim tautan/kode ke email;
     · masuk  → `verifyOtp` (kode 6 angka) atau `exchangeCodeForSession` (tautan);
     · keluar → `DELETE /api/session` (server yang mencabut token + hapus cookie).

   Pengecualian tunggal: akun pemilik (env `OWNER_TEST_EMAIL` / `OWNER_TEST_OTP`
   di server) masuk dengan kode tetap lewat `POST /api/auth/owner` — tidak ada
   email, sesi dibuat server. Klien tidak pernah tahu email/kodenya; ia hanya
   BERTANYA ke route itu (lihat `ownerFastLoginAvailable`).

   Semua fungsi di sini mengembalikan `{ ok }` alih-alih melempar: layar masuk
   harus bisa menampilkan pesan Indonesia yang manusiawi, dan kegagalan jaringan
   bukan pengecualian yang layak menutup halaman. */

export type AuthResult =
  /**
   * `emailSent: false` = jalur tanpa email (kode tetap pemilik). Layar masuk
   * memakainya untuk tidak mengaku "kode dikirim ke inbox". Lihat
   * `lib/data/owner-access.ts`.
   */
  | { ok: true; message?: string; emailSent?: boolean }
  | { ok: false; error: string }

export interface SessionUserView {
  id: string
  email: string
  name: string
  /**
   * Foto profil (data URL ≤ 20 KB) dari `profiles.avatar_url` — TIDAK PERNAH
   * dari cookie sesi: cookie dibatasi 4096 byte (lihat `app/api/profile`).
   */
  avatarUrl?: string | null
  /**
   * true = akun pemilik/admin. Hanya BOOLEAN yang dikirim server — daftar
   * emailnya tetap di `lib/admin/access.ts`. Dipakai menampilkan tautan
   * Dashboard Admin; BUKAN dasar izin (halaman & API memeriksa ulang).
   */
  isAdmin?: boolean
}

/**
 * Alamat tujuan tautan masuk — halaman /login/verify yang sudah ada. `next`
 * opsional: diteruskan supaya user yang membuka TAUTAN dari emailnya mendarat
 * di halaman yang dituju (mis. `/checkout/bayar?…`), bukan Dashboard.
 */
export function loginRedirectUrl(email: string, next?: string | null): string {
  const origin = typeof window === 'undefined' ? '' : window.location.origin
  return `${origin}${buildVerifyHref(email, next)}`
}

/**
 * Tanya ke SERVER apakah email ini memakai jalur kode tetap pemilik.
 *
 * Klien sengaja TIDAK menyimpan email/kode pemilik (nilainya hanya di env
 * server, bukan `NEXT_PUBLIC_*`). Kalau route belum dikonfigurasi, dimatikan,
 * atau tidak terjangkau, jawabannya `false` — login OTP biasa berjalan normal.
 */
async function ownerFastLoginAvailable(email: string): Promise<boolean> {
  try {
    const res = await fetch('/api/auth/owner', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: email.trim() }),
    })
    if (!res.ok) return false
    const data = (await res.json().catch(() => null)) as { fastLogin?: boolean } | null
    return data?.fastLogin === true
  } catch {
    return false
  }
}

/**
 * Kirim tautan masuk / kode OTP ke email. `shouldCreateUser: true` karena app ini
 * mendaftarkan user hanya dengan email (zero password, PRD 5933).
 *
 * Konfirmasi email WAJIB di project ini (`mailer_autoconfirm: false`), jadi user
 * baru harus membuka inbox dulu — layar /login/verify yang menjelaskan langkahnya.
 */
export async function sendLoginLink(email: string, next?: string | null): Promise<AuthResult> {
  /* Jalur kode tetap pemilik: TIDAK ada email yang dikirim. Supaya permintaan
     ini tidak menyentuh SMTP Supabase sama sekali, layar masuk langsung lanjut
     ke langkah kode dengan penanda `emailSent: false`. */
  if (await ownerFastLoginAvailable(email)) {
    return {
      ok: true,
      message: 'Kode akses pemilik siap dipakai.',
      emailSent: false,
    }
  }

  const client = browserSupabase()
  if (!client) return { ok: false, error: 'Backend Supabase belum dikonfigurasi di build ini.' }
  try {
    const { error } = await client.auth.signInWithOtp({
      email: email.trim(),
      options: { emailRedirectTo: loginRedirectUrl(email, next), shouldCreateUser: true },
    })
    if (error) return { ok: false, error: error.message }
    return { ok: true, message: 'Tautan masuk sudah dikirim ke emailmu.' }
  } catch {
    return { ok: false, error: 'Jaringan tidak bisa dihubungi. Coba lagi ya.' }
  }
}

/**
 * Masuk dengan kode 6 angka.
 *
 * `fastLogin` = petunjuk dari layar masuk hasil `sendLoginLink`:
 *   · `true`  → email ini jalur pemilik; JANGAN jatuh ke Supabase (OTP-nya
 *               memang tidak pernah dikirim);
 *   · `false` → jalur OTP biasa;
 *   · tidak diisi (mis. halaman `/login/verify`) → coba jalur pemilik dulu,
 *               lalu jatuh ke OTP biasa kalau route menjawab 401.
 * Validasi kredensial pemilik tetap 100% di server (`/api/auth/owner`); petunjuk
 * ini hanya memilih jalur, bukan memberi izin.
 */
export async function verifyEmailOtp(
  email: string,
  token: string,
  { fastLogin }: { fastLogin?: boolean } = {},
): Promise<AuthResult> {
  const code = token.replace(/\D/g, '')
  if (code.length < 6) return { ok: false, error: 'Kodenya 6 angka ya. Cek lagi emailnya.' }

  /* ── JALUR PEMILIK: kode tetap, sesi dibuat SERVER ────────────────────────
     Supabase tidak pernah mengirim OTP untuk jalur ini, jadi `verifyOtp` biasa
     pasti ditolak. Route `/api/auth/owner` yang memvalidasi kredensial, membuat
     token lewat Admin API tanpa email, lalu menukarnya jadi sesi + cookie lewat
     `@supabase/ssr`. Browser tidak pernah menerima token itu. */
  if (fastLogin !== false) {
    try {
      const res = await fetch('/api/auth/owner', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), code }),
      })
      const data = (await res.json().catch(() => null)) as { ok?: boolean; error?: string } | null
      if (res.ok && data?.ok === true) return { ok: true }
      /* Petunjuk `true` = email ini memang jalur pemilik → jangan lanjut ke
         Supabase; tampilkan alasan dari server apa adanya. */
      if (fastLogin === true || res.status !== 401) {
        return { ok: false, error: data?.error ?? 'Kode akses belum bisa dipakai.' }
      }
      /* 401 tanpa petunjuk = bukan jalur pemilik → verifikasi OTP biasa di bawah */
    } catch {
      /* jaringan bermasalah: biarkan jalur OTP biasa mencoba */
    }
  }

  const client = browserSupabase()
  if (!client) return { ok: false, error: 'Backend Supabase belum dikonfigurasi di build ini.' }
  try {
    const { error } = await client.auth.verifyOtp({ email: email.trim(), token: code, type: 'email' })
    if (error) return { ok: false, error: error.message }
    return { ok: true }
  } catch {
    return { ok: false, error: 'Jaringan tidak bisa dihubungi. Coba lagi ya.' }
  }
}

/**
 * Tukar `?code=` dari tautan email jadi sesi (PKCE). Dipanggil halaman
 * /login/verify — jalur pertama yang selesai oleh user yang membuka email di
 * browser yang sama.
 */
export async function completeMagicLink(code: string): Promise<AuthResult> {
  const client = browserSupabase()
  if (!client) return { ok: false, error: 'Backend Supabase belum dikonfigurasi di build ini.' }
  try {
    const { error } = await client.auth.exchangeCodeForSession(code)
    if (error) return { ok: false, error: error.message }
    return { ok: true }
  } catch {
    return { ok: false, error: 'Jaringan tidak bisa dihubungi. Coba lagi ya.' }
  }
}

/** Akhiri sesi: server mencabut token Supabase lalu menghapus cookie-nya. */
export async function endSession(): Promise<boolean> {
  try {
    const res = await fetch('/api/session', { method: 'DELETE' })
    return res.ok
  } catch {
    return false
  }
}

/**
 * Pindah halaman SETELAH sesi jadi — RELOAD PENUH, bukan `router.push`.
 *
 * Kenapa bukan navigasi client: store uang (dan seluruh store domain lain)
 * hidup di memory modul dan hanya dihidrasi SEKALI per dokumen
 * (`hydrateMoneyStore()`). Dengan `router.push`, tab yang tadinya berisi sesi
 * lain / data lokal tetap memakai state lama sampai user menekan refresh —
 * persis gejala "setelah login tampilannya beda, setelah refresh baru benar".
 * `assign` memastikan semua modul lahir kosong dan membaca sesi yang baru.
 *
 * Alasan yang sama dipakai tombol Keluar (`settings-panel-account.tsx`), jadi
 * masuk & keluar memperlakukan memory modul dengan aturan yang sama.
 */
export function navigateAfterSignIn(path: string): void {
  if (typeof window === 'undefined') return
  window.location.assign(path)
}

/**
 * Siapa yang sedang masuk? Dibaca lewat `/api/session` (bukan
 * `supabase.auth.getSession()` di klien) supaya jawabannya SAMA dengan yang
 * dipakai route server — satu sumber kebenaran identitas, seperti sebelum paket
 * 45; yang berubah cuma isinya (sekarang token Supabase yang sah).
 */
/* ── GANTI NAMA TAMPILAN (perbaikan: nama benar-benar tersimpan) ──────────────
   Sebelum ini tombol "Simpan Perubahan" di Pengaturan → Profil & Akun hanya
   menutup penanda `dirty` lalu menampilkan toast sukses. Tidak ada satu pun
   tulisan yang keluar dari perangkat, jadi sapaan Dashboard & identitas di
   sidebar tetap memakai nama lama selamanya — persis keluhan "di pengaturan
   bilang berhasil, tapi nyatanya nggak berubah".

   Sekarang namanya disimpan di DUA tempat, dan dua-duanya memang dipakai:
     · `user_metadata.nickname` (Supabase Auth) → dibaca `readSupabaseSession()`
       dan dipakai sapaan Dashboard, sidebar, serta panel Pengaturan;
     · `profiles.nickname` → dipakai identitas di dompet bersama & referral
       (RLS owner-only: user hanya bisa mengubah barisnya sendiri).

   `profiles` diperlakukan best-effort: kalau barisnya tidak bisa diperbarui,
   hasilnya tetap `ok` TAPI `profileSynced: false` supaya UI bisa mengatakan apa
   yang belum ikut berubah — bukan mengaku semuanya beres. */

/** panjang maksimum nama tampilan — cukup untuk nama lengkap, tidak untuk paragraf */
export const DISPLAY_NAME_MAX = 40

/** copy panel nama — satu sumber untuk validasi & pesan yang dilihat user */
export const DISPLAY_NAME_COPY = {
  empty: 'Nama nggak boleh kosong ya.',
  tooLong: `Nama maksimal ${DISPLAY_NAME_MAX} karakter.`,
  noBackend: 'Nama belum bisa disimpan: backend akun belum tersambung di build ini.',
  noSession: 'Sesi kamu sudah berakhir. Masuk lagi untuk mengganti nama.',
  failed: 'Nama belum tersimpan. Coba lagi ya.',
  network: 'Jaringan tidak bisa dihubungi. Coba lagi ya.',
} as const

/** rapikan ketikan user: spasi ganda & spasi di tepi dibuang */
export function normalizeDisplayName(raw: string): string {
  return (raw ?? '').replace(/\s+/g, ' ').trim()
}

export type DisplayNameResult =
  | { ok: true; name: string; profileSynced: boolean }
  | { ok: false; error: string }

/**
 * Simpan nama tampilan. Urutannya sengaja: validasi dulu (tanpa jaringan),
 * baru tulis metadata akun (sumber sapaan), lalu `profiles` (identitas yang
 * dilihat anggota dompet bersama).
 */
export async function updateDisplayName(raw: string): Promise<DisplayNameResult> {
  const name = normalizeDisplayName(raw)
  if (!name) return { ok: false, error: DISPLAY_NAME_COPY.empty }
  if (name.length > DISPLAY_NAME_MAX) return { ok: false, error: DISPLAY_NAME_COPY.tooLong }
  if (typeof window === 'undefined') return { ok: false, error: DISPLAY_NAME_COPY.noBackend }

  /* JALUR 1 — klien browser (token user, RLS yang menjaga). */
  const client = browserSupabase()
  if (client) {
    try {
      const { data: sessionData } = await client.auth.getSession()
      const session = sessionData.session
      if (session?.access_token) {
        const { data, error } = await client.auth.updateUser({ data: { nickname: name } })
        if (!error) {
          const saved =
            normalizeDisplayName(String(data.user?.user_metadata?.nickname ?? '')) || name
          let profileSynced = false
          try {
            const { error: profileError } = await client
              .from('profiles')
              .update({ nickname: saved, updated_at: new Date().toISOString() })
              .eq('user_id', session.user.id)
            profileSynced = !profileError
          } catch {
            profileSynced = false
          }
          return { ok: true, name: saved, profileSynced }
        }
      }
    } catch {
      /* jatuh ke jalur server */
    }
  }

  /* JALUR 2 — server dengan cookie sesi. Ini yang membuat user yang BISA
     membuka app (middleware menerimanya) tidak pernah gagal mengganti nama
     hanya karena klien Supabase di browser tidak punya sesi. */
  return saveNameViaServer(name)
}

interface ProfilePatch {
  name?: string
  avatarUrl?: string | null
}

type ProfilePatchResult =
  | { ok: true; name?: string; avatarUrl?: string | null }
  | { ok: false; error: string }

async function patchProfileViaServer(patch: ProfilePatch): Promise<ProfilePatchResult> {
  try {
    const res = await fetch('/api/profile', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(patch),
    })
    const json = (await res.json().catch(() => null)) as
      | { name?: string; avatarUrl?: string | null; error?: string }
      | null
    if (!res.ok) return { ok: false, error: json?.error ?? DISPLAY_NAME_COPY.failed }
    return { ok: true, name: json?.name, avatarUrl: json?.avatarUrl }
  } catch {
    return { ok: false, error: DISPLAY_NAME_COPY.network }
  }
}

async function saveNameViaServer(name: string): Promise<DisplayNameResult> {
  const result = await patchProfileViaServer({ name })
  if (!result.ok) return result
  return {
    ok: true,
    name: normalizeDisplayName(result.name ?? name) || name,
    profileSynced: true,
  }
}

export type AvatarResult = { ok: true; avatarUrl: string | null } | { ok: false; error: string }

/**
 * Simpan (atau hapus, dengan `null`) foto profil. Data URL sudah dikompres klien
 * (`lib/avatar.ts`); di sini hanya soal menulisnya ke `profiles.avatar_url`
 * lewat jalur browser, dengan jalur server sebagai cadangan.
 */
export async function updateAvatar(avatarUrl: string | null): Promise<AvatarResult> {
  if (typeof window === 'undefined') return { ok: false, error: DISPLAY_NAME_COPY.noBackend }

  const client = browserSupabase()
  if (client) {
    try {
      const { data: sessionData } = await client.auth.getSession()
      const userId = sessionData.session?.user.id
      if (userId) {
        const { error } = await client
          .from('profiles')
          .update({ avatar_url: avatarUrl, updated_at: new Date().toISOString() })
          .eq('user_id', userId)
        if (!error) return { ok: true, avatarUrl }
      }
    } catch {
      /* jatuh ke jalur server */
    }
  }

  const result = await patchProfileViaServer({ avatarUrl })
  if (!result.ok) return result
  return { ok: true, avatarUrl: result.avatarUrl ?? avatarUrl }
}

export async function fetchSessionUser(): Promise<SessionUserView | null> {
  try {
    const res = await fetch('/api/session', { method: 'GET', cache: 'no-store' })
    if (!res.ok) return null
    const data = (await res.json()) as { user?: SessionUserView }
    return data.user ?? null
  } catch {
    return null
  }
}

/* ── REGISTRASI (paket 64: SUPABASE AUTH NYATA, BUKAN MOCK) ───────────────────
   Langkah 1 checkout dulu cuma mengumpulkan email + nama lalu lanjut ke
   "pembayaran" mock. Sekarang ia benar-benar MENDAFTARKAN akun:

     1. validasi kode teman di BACKEND (kalau ada) — integritas referral; kode
        yang tidak ada di database MENOLAK proses sebelum akun difinalkan;
     2. `signInWithOtp` + `shouldCreateUser` = pendaftaran tanpa password,
        persis kanon PRD 5933 (satu email, nol password). Nama panggilan ikut
        sebagai metadata user supaya trigger profil memakainya;
     3. LIFECYCLE HANDOFF — kalau Supabase mengembalikan `session` (auto-confirm
        ON) → `dashboard`; kalau verifikasi email wajib (produksi:
        `mailer_autoconfirm: false`) → `verify`, dan UI merender langkah "buka
        emailmu" yang jelas.

   Panggilan yang sama dipakai halaman masuk, jadi tidak ada dua cara berbeda
   membuat akun di app ini. */

const NETWORK_ERROR = 'Jaringan tidak bisa dihubungi. Coba lagi ya.'

export type RegisterNext = 'verify' | 'dashboard'

export type RegisterOutcome =
  | { ok: true; next: RegisterNext }
  | { ok: false; error: string }

/**
 * Validasi kode teman ke backend (yang memeriksanya ke DATABASE). Dipakai dua
 * arah: sebagai langkah pertama registrasi, dan (lewat endpoint yang sama) oleh
 * apa pun yang butuh memastikan kode benar-benar ada.
 */
export async function validateReferralCode(code: string, email: string): Promise<AuthResult> {
  try {
    const res = await fetch('/api/referral/validate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code: code.trim(), email: email.trim() }),
    })
    const data = (await res.json().catch(() => null)) as { ok?: boolean; error?: string } | null
    if (!res.ok || !data || data.ok === false) {
      return {
        ok: false,
        error: data?.error ?? 'Kode temannya nggak ketemu. Cek lagi ya, atau lanjut tanpa kode.',
      }
    }
    return { ok: true }
  } catch {
    return { ok: false, error: NETWORK_ERROR }
  }
}

/** Daftar akun baru (email + nama panggilan, tanpa password) + integritas referral. */
export async function registerAccount({
  email,
  nickname,
  referralCode,
  next,
}: {
  email: string
  nickname: string
  /** kode teman yang sudah "dipakai" di checkout (opsional) */
  referralCode?: string | null
  /** halaman tujuan setelah verifikasi email (mis. `/checkout/bayar?…`) */
  next?: string | null
}): Promise<RegisterOutcome> {
  const client = browserSupabase()
  if (!client) return { ok: false, error: 'Backend Supabase belum dikonfigurasi di build ini.' }

  const trimmedEmail = email.trim()
  const trimmedNickname = nickname.trim()

  /* 1 — integritas referral DULU: menolak lebih awal berarti tidak ada akun
     setengah jadi yang menunggu dibersihkan. */
  const code = referralCode?.trim()
  if (code) {
    const check = await validateReferralCode(code, trimmedEmail)
    if (!check.ok) return { ok: false, error: check.error }
  }

  /* 2 — buat akun (passwordless) + simpan nama panggilan di metadata user */
  try {
    const { data, error } = await client.auth.signInWithOtp({
      email: trimmedEmail,
      options: {
        shouldCreateUser: true,
        emailRedirectTo: loginRedirectUrl(trimmedEmail, next),
        data: { nickname: trimmedNickname },
      },
    })
    if (error) return { ok: false, error: error.message }
    /* 3 — handoff: sesi ada = auto-login; tidak ada = wajib cek email dulu */
    return { ok: true, next: data.session ? 'dashboard' : 'verify' }
  } catch {
    return { ok: false, error: NETWORK_ERROR }
  }
}
