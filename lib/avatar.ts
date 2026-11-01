/* ── FOTO PROFIL: KOMPRES DI KLIEN ───────────────────────────────────────────
   Batas yang dipegang:
     · bingkai 160×160 (cukup untuk avatar 80px @2x), center-crop persegi;
     · WebP dulu (paling kecil), JPEG sebagai cadangan;
     · hasil akhir HARUS ≤ 20 KB — kalau tidak, kualitasnya diturunkan bertahap
       dan kalau tetap tidak muat, user diberi tahu (bukan menyimpan 200 KB
       diam-diam ke database).

   Yang disimpan adalah DATA URL di `profiles.avatar_url`, BUKAN di cookie sesi:
   cookie punya batas 4096 byte, dan avatar 20 KB akan membuat request ditolak
   `431 Request Header Fields Too Large` (lihat `app/api/profile`). */

export const AVATAR_SIZE = 160
export const AVATAR_MAX_BYTES = 20 * 1024
export const AVATAR_INPUT_MAX_BYTES = 8 * 1024 * 1024
export const AVATAR_TYPES = ['image/png', 'image/jpeg', 'image/webp'] as const

export const AVATAR_COPY = {
  type: 'Foto harus JPG, PNG, atau WebP ya.',
  tooBig: 'Fotonya lebih dari 8 MB. Pilih foto lain ya.',
  canvas: 'Browser ini tidak bisa mengolah foto. Coba browser lain.',
  tooHeavy: 'Fotonya belum bisa dikecilkan di bawah 20 KB. Coba foto yang lebih sederhana.',
  read: 'Fotonya tidak bisa dibaca. Coba file lain ya.',
} as const

/** perkiraan ukuran biner dari data URL base64 (tanpa Buffer — jalan di browser & test) */
export function estimateDataUrlBytes(dataUrl: string): number {
  const comma = dataUrl.indexOf(',')
  const base64 = comma >= 0 ? dataUrl.slice(comma + 1) : ''
  if (!base64) return 0
  const padding = (base64.match(/=+$/) ?? [''])[0].length
  return Math.floor((base64.length * 3) / 4) - padding
}

/** bentuk yang boleh disimpan di `profiles.avatar_url` (atau `null` = tanpa foto) */
export function isAvatarDataUrl(value: unknown): value is string {
  if (typeof value !== 'string') return false
  if (!/^data:image\/(webp|jpeg|png);base64,[A-Za-z0-9+/=]+$/.test(value)) return false
  return estimateDataUrlBytes(value) <= AVATAR_MAX_BYTES
}

export type AvatarCompression =
  | { ok: true; dataUrl: string; bytes: number }
  | { ok: false; error: string }

async function loadBitmap(file: File): Promise<ImageBitmap | HTMLImageElement | null> {
  try {
    if (typeof createImageBitmap === 'function') return await createImageBitmap(file)
  } catch {
    /* jatuh ke <img> di bawah */
  }
  return await new Promise((resolve) => {
    const url = URL.createObjectURL(file)
    const image = new Image()
    image.onload = () => {
      URL.revokeObjectURL(url)
      resolve(image)
    }
    image.onerror = () => {
      URL.revokeObjectURL(url)
      resolve(null)
    }
    image.src = url
  })
}

/**
 * Kompres foto pilihan user jadi avatar ≤ 20 KB. Dipanggil di panel Pengaturan
 * SEBELUM menyimpan; hasilnya yang dikirim ke `/api/profile`.
 */
export async function compressAvatarFile(file: File): Promise<AvatarCompression> {
  if (!(AVATAR_TYPES as readonly string[]).includes(file.type)) {
    return { ok: false, error: AVATAR_COPY.type }
  }
  if (file.size > AVATAR_INPUT_MAX_BYTES) return { ok: false, error: AVATAR_COPY.tooBig }
  if (typeof document === 'undefined') return { ok: false, error: AVATAR_COPY.canvas }

  const bitmap = await loadBitmap(file)
  if (!bitmap) return { ok: false, error: AVATAR_COPY.read }

  const canvas = document.createElement('canvas')
  canvas.width = AVATAR_SIZE
  canvas.height = AVATAR_SIZE
  const context = canvas.getContext('2d')
  if (!context) return { ok: false, error: AVATAR_COPY.canvas }

  const width = 'width' in bitmap ? bitmap.width : 0
  const height = 'height' in bitmap ? bitmap.height : 0
  const side = Math.min(width, height)
  if (!side) return { ok: false, error: AVATAR_COPY.read }
  const sourceX = (width - side) / 2
  const sourceY = (height - side) / 2
  context.drawImage(bitmap, sourceX, sourceY, side, side, 0, 0, AVATAR_SIZE, AVATAR_SIZE)

  for (const quality of [0.8, 0.7, 0.6, 0.5, 0.4, 0.3]) {
    for (const type of ['image/webp', 'image/jpeg']) {
      const dataUrl = canvas.toDataURL(type, quality)
      const bytes = estimateDataUrlBytes(dataUrl)
      if (bytes > 0 && bytes <= AVATAR_MAX_BYTES) return { ok: true, dataUrl, bytes }
    }
  }
  return { ok: false, error: AVATAR_COPY.tooHeavy }
}
