/* ── JEMBATAN KLIEN → ROUTE AI CAPTURE (paket 101) ────────────────────────────
   Dua pintu masuk AI di app ini — kartu konfirmasi di AI Coach
   (`hooks/use-transaction-capture.ts`) dan tombol 📸/🎤 di form Catat
   (`components/dashboard/transaction-input-engine.tsx`) — WAJIB memakai satu
   jembatan yang sama. Sebelum paket 101 form Catat punya salinan MOCK sendiri
   (selalu "Rp 87.500" + nama berkas, dan "Beli kopi Rp 25.000"), jadi dua pintu
   yang katanya satu mesin memberi cerita berbeda — persis yang dilarang prompt 20.

   Isi modul ini sengaja hanya dua hal:
     1. menormalkan foto struk di BROWSER ke JPEG (penyedia vision hanya menerima
        png/jpeg/webp/gif; foto iPhone lahir HEIC) — lihat `receiptImageToJpeg`;
     2. memanggil route NYATA dan mengembalikan `ExtractedTransaction` yang sudah
        dinormalisasi server, atau copy kegagalan yang bisa dibaca user.

   Tidak ada tebakan di sini. Kalau route gagal, pemanggil menampilkan pesan
   jujur (atau jatuh ke parser aturan LOKAL untuk ucapan, yang teksnya memang
   nyata). Nama penyedia model tidak pernah muncul di berkas ini — ia ikut
   bundel klien. */

import { AI_CAPTURE_COPY } from './ai-chat'
import type { CaptureSource, ExtractedTransaction } from './transaction-ai'

/** batas sisi terpanjang foto struk setelah dinormalkan (piksel) */
const MAX_RECEIPT_EDGE = 1600

/** kualitas JPEG hasil normalisasi — cukup tajam untuk OCR, jauh di bawah batas ukuran route */
const RECEIPT_JPEG_QUALITY = 0.85

export interface ReceiptImage {
  /** base64 tanpa prefix data URL */
  data: string
  mimeType: 'image/jpeg'
}

/**
 * Foto struk dinormalkan ke JPEG DI BROWSER (paket 87, dipindah ke sini paket 101).
 *
 * Kenapa: penyedia vision hanya menerima webp/png/jpeg/gif. Foto kamera iPhone
 * lahir sebagai HEIC/HEIF — `file.type` tidak bisa dipercaya dan Chrome/Windows
 * tidak bisa men-decode-nya sama sekali. Dengan menggambar berkas ke `<canvas>`
 * lalu `toDataURL('image/jpeg')`, format apa pun yang BISA dibaca browser keluar
 * sebagai JPEG (format yang pasti diterima), sekaligus mengecilkan foto kamera
 * 12 MP supaya tidak kena batas ukuran route.
 *
 * `null` = browser ini tidak bisa membuka berkasnya (HEIC di Chrome desktop,
 * berkas rusak/terpotong). Pemanggil menampilkan pesan format yang jujur, bukan
 * "scan gagal" generik yang menyesatkan.
 */
export function receiptImageToJpeg(file: File): Promise<ReceiptImage | null> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file)
    const image = new Image()
    image.onload = () => {
      try {
        if (!image.naturalWidth || !image.naturalHeight) {
          resolve(null)
          return
        }
        const scale = Math.min(1, MAX_RECEIPT_EDGE / Math.max(image.naturalWidth, image.naturalHeight))
        const width = Math.max(1, Math.round(image.naturalWidth * scale))
        const height = Math.max(1, Math.round(image.naturalHeight * scale))
        const canvas = document.createElement('canvas')
        canvas.width = width
        canvas.height = height
        const ctx = canvas.getContext('2d')
        if (!ctx) {
          resolve(null)
          return
        }
        /* JPEG tidak punya alpha: PNG transparan jangan sampai jadi hitam */
        ctx.fillStyle = '#ffffff'
        ctx.fillRect(0, 0, width, height)
        ctx.drawImage(image, 0, 0, width, height)
        const dataUrl = canvas.toDataURL('image/jpeg', RECEIPT_JPEG_QUALITY)
        const comma = dataUrl.indexOf(',')
        resolve(comma >= 0 ? { data: dataUrl.slice(comma + 1), mimeType: 'image/jpeg' } : null)
      } catch {
        resolve(null)
      } finally {
        URL.revokeObjectURL(url)
      }
    }
    image.onerror = () => {
      URL.revokeObjectURL(url)
      resolve(null)
    }
    image.src = url
  })
}

/** payload route AI → `ExtractedTransaction`, atau `null` kalau bentuknya asing */
export function readExtractedTransaction(payload: unknown): ExtractedTransaction | null {
  const transaction = (payload as { transaction?: unknown } | null)?.transaction
  if (!transaction || typeof transaction !== 'object') return null
  return transaction as ExtractedTransaction
}

/** hasil satu permintaan capture: transaksi siap dipakai, atau copy kegagalan */
export type CaptureRequest =
  | { ok: true; transaction: ExtractedTransaction }
  | { ok: false; message: string; cancelled?: boolean }

/**
 * Foto struk → transaksi lewat model vision (`POST /api/ai/ocr`).
 *
 * `signal` dipakai pemanggil untuk membatalkan (user menutup panel / menekan
 * X saat struk masih dibaca). Pembatalan TIDAK pernah muncul sebagai
 * "gagal baca struk": hasilnya ditandai `cancelled` dan pemanggil mengabaikannya.
 */
export async function requestReceiptTransaction(
  file: File,
  signal?: AbortSignal,
): Promise<CaptureRequest> {
  const image = await receiptImageToJpeg(file)
  if (!image) {
    return { ok: false, message: AI_CAPTURE_COPY.scanUnsupported }
  }
  if (signal?.aborted) return { ok: false, message: AI_CAPTURE_COPY.scanFailed, cancelled: true }

  /* Pesan gagal bawaan = kalimat app. Route bisa mengirim alasan yang lebih
     spesifik dan tetap berbahasa user (format foto tidak didukung, model sedang
     penuh, …) — pakai itu kalau ada, jangan ditelan. */
  let failure: string = AI_CAPTURE_COPY.scanFailed
  try {
    const res = await fetch('/api/ai/ocr', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ image: image.data, mimeType: image.mimeType }),
      signal,
    })
    const payload: unknown = await res.json().catch(() => null)
    const transaction = res.ok ? readExtractedTransaction(payload) : null
    if (transaction) return { ok: true, transaction }
    const message = (payload as { error?: unknown } | null)?.error
    if (typeof message === 'string' && message) failure = message
  } catch {
    /* jaringan/berkas gagal → problem di bawah */
  }
  return { ok: false, message: failure, cancelled: signal?.aborted || undefined }
}

/**
 * Teks (hasil STT atau ketikan chat) → transaksi lewat model teks
 * (`POST /api/parse-voice`). `null` = provider/route tidak bisa dipakai.
 *
 * Pemanggil yang memutuskan jalan keluarnya: kartu AI Coach & form Catat
 * sama-sama merapikan teks yang SAMA dengan parser aturan lokal
 * (`parseSpokenTransaction`), jadi tidak ada nilai yang dikarang.
 */
export async function requestTextTransaction(
  transcript: string,
  source: Extract<CaptureSource, 'voice' | 'chat'>,
  signal?: AbortSignal,
): Promise<ExtractedTransaction | null> {
  try {
    const res = await fetch('/api/parse-voice', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ transcript, source }),
      signal,
    })
    const payload: unknown = res.ok ? await res.json() : null
    return readExtractedTransaction(payload)
  } catch {
    return null
  }
}
