'use client'

/* ── PEMBUKA LAYAR KUNCI DENGAN SENSOR PERANGKAT (WebAuthn lokal) ────────────
   Paket 39. Sebelumnya baris "Buka dengan Sidik Jari / Face ID" hanya
   `useState` + toast sukses — tidak ada sensor yang pernah dipanggil.

   Yang benar-benar terjadi sekarang:
     1. `registerBiometric()` memanggil `navigator.credentials.create()` dengan
        `authenticatorAttachment: 'platform'` + `userVerification: 'required'`,
        jadi OS-lah yang meminta sidik jari/PIN perangkat, dan kredensialnya
        disimpan di authenticator (Secure Enclave / TPM / Keychain).
     2. `assertBiometric()` memanggil `navigator.credentials.get()` dengan
        kredensial itu; OS kembali meminta verifikasi user. Kalau berhasil, layar
        kunci dibuka.

   ⚠️ BATAS YANG TIDAK BOLEH DISAMARKAN: tanda tangan (`signature`) dari assertion
   TIDAK diverifikasi di sini, karena verifikasinya wajib dilakukan server
   (challenge dibuat server, public key disimpan server) — dan repo ini demo tanpa
   backend. Artinya sensor ini dipakai sebagai **pembuka layar di perangkat yang
   sama**, bukan sebagai otorisasi data. Yang benar-benar menjaga data tetap
   `lib/session.ts` + RLS di produksi. Jangan pakai pola ini untuk hal yang butuh
   jaminan kriptografis sampai ada endpoint verifikasi.
   ────────────────────────────────────────────────────────────────────────── */

function toBase64Url(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer)
  let binary = ''
  for (const byte of bytes) binary += String.fromCharCode(byte)
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function fromBase64Url(value: string): Uint8Array {
  const padded = value.replace(/-/g, '+').replace(/_/g, '/')
  const binary = atob(padded.padEnd(Math.ceil(padded.length / 4) * 4, '='))
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  return bytes
}

/**
 * Perangkat punya platform authenticator (Windows Hello, Touch ID, Android
 * biometrik, …)? Dipakai pengaturan untuk memutuskan baris biometrik tampil atau
 * tidak — user tidak pernah menjumpai switch yang pasti gagal.
 */
export async function isBiometricAvailable(): Promise<boolean> {
  if (
    typeof PublicKeyCredential === 'undefined' ||
    typeof PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable !== 'function'
  ) {
    return false
  }
  try {
    return await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable()
  } catch {
    return false
  }
}

/** daftarkan kredensial perangkat; mengembalikan id-nya, atau `null` kalau gagal */
export async function registerBiometric(user: {
  id: string
  email: string
  name: string
}): Promise<string | null> {
  if (typeof navigator === 'undefined' || !navigator.credentials) return null
  const challenge = crypto.getRandomValues(new Uint8Array(32))
  try {
    const credential = (await navigator.credentials.create({
      publicKey: {
        challenge,
        rp: { name: 'CatetInd' },
        user: {
          id: new TextEncoder().encode(user.id),
          name: user.email,
          displayName: user.name,
        },
        pubKeyCredParams: [
          { type: 'public-key', alg: -7 },
          { type: 'public-key', alg: -257 },
        ],
        authenticatorSelection: {
          authenticatorAttachment: 'platform',
          userVerification: 'required',
          residentKey: 'preferred',
        },
        timeout: 60_000,
        attestation: 'none',
      },
    })) as PublicKeyCredential | null

    return credential ? toBase64Url(credential.rawId) : null
  } catch {
    /* user membatalkan, atau perangkat tidak mendaftarkan biometrik */
    return null
  }
}

/** minta verifikasi sensor untuk kredensial perangkat ini */
export async function assertBiometric(credentialId: string): Promise<boolean> {
  if (typeof navigator === 'undefined' || !navigator.credentials) return false
  const challenge = crypto.getRandomValues(new Uint8Array(32))
  try {
    const assertion = (await navigator.credentials.get({
      publicKey: {
        challenge,
        allowCredentials: [
          { id: fromBase64Url(credentialId) as unknown as BufferSource, type: 'public-key' },
        ],
        userVerification: 'required',
        timeout: 60_000,
      },
    })) as PublicKeyCredential | null

    return assertion !== null && toBase64Url(assertion.rawId) === credentialId
  } catch {
    return false
  }
}