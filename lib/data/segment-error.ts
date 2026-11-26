/* ── COPY: ERROR BOUNDARY PER SEGMEN (paket 43 · audit Stage 6 #3) ────────────
   Satu komponen, dipakai lima `error.tsx` (`app/`, `/wallet`, `/wealth`,
   `/history`, `/joint`).

   AUDIT "CLEAN UI" (paket 63): layar ini dulu menumpuk TIGA paragraf sekaligus
   (body + hint + kotak "batas jujur" yang menyebut store ledger/IndexedDB).
   Itu bahasa manual di momen paling panik. Sekarang defaultnya CUMA dua hal:
   apa yang gagal (satu baris) + apa yang bisa dilakukan (tombol). Semua
   penjelasan teknis pindah ke balik satu disclosure `<InfoNote>` yang tertutup:
   `safeSummary` selalu tampak sebagai penenang singkat, `safeBody` dibuka kalau
   user benar-benar mau tahu. Tidak ada kalimat menyalahkan user. */

export type SegmentErrorArea = 'app' | 'wallet' | 'wealth' | 'history' | 'joint' | 'budget'

export interface SegmentErrorCopy {
  eyebrow: string
  title: string
  /** satu baris: apa yang gagal — bukan paragraf */
  body: string
  /** penenang singkat yang selalu tampak di baris disclosure */
  safeSummary: string
  /** detail teknis, hanya tampil setelah disclosure dibuka */
  safeBody: string
}

export const SEGMENT_ERROR_COPY: Record<SegmentErrorArea, SegmentErrorCopy> = {
  app: {
    eyebrow: 'Gagal dimuat',
    title: 'Halaman ini berhenti di tengah jalan',
    body: 'Bagian ini nggak bisa digambar sekarang.',
    safeSummary: 'Catatanmu aman, nggak ada yang hilang.',
    safeBody:
      'Data uangmu hidup di store ledger perangkat ini, bukan di layar yang gagal tadi, jadi tetap utuh.',
  },
  wallet: {
    eyebrow: 'Dompet & Akun',
    title: 'Daftar dompet gagal dimuat',
    body: 'Kartu dompetmu nggak bisa digambar sekarang.',
    safeSummary: 'Saldo & ledger tetap utuh.',
    safeBody:
      'Saldo dan baris ledger disimpan di perangkat ini, kegagalan menggambar kartunya nggak menyentuh angkanya.',
  },
  wealth: {
    eyebrow: 'Kekayaan & Hutang',
    title: 'Perhitungan kekayaan gagal ditampilkan',
    body: 'Salah satu bagian Net Worth nggak terbaca.',
    safeSummary: 'Angka saldomu nggak berubah.',
    safeBody:
      'Net Worth dihitung ulang tiap halaman dibuka. Satu bagian gagal dibaca bukan berarti saldomu ikut berubah.',
  },
  history: {
    eyebrow: 'Riwayat',
    title: 'Riwayat catatan gagal dimuat',
    body: 'Daftar catatanmu nggak bisa ditampilkan sekarang.',
    safeSummary: 'Nggak ada catatan yang terhapus.',
    safeBody:
      'Riwayat dibaca dari ledger perangkat ini. Gagal menggambar daftarnya nggak menghapus satu baris pun.',
  },
  budget: {
    eyebrow: 'Budget & Nabung',
    title: 'Budget & celengan gagal dimuat',
    body: 'Jatah harian dan daftar celenganmu nggak bisa digambar sekarang.',
    safeSummary: 'Angka catatanmu nggak berubah.',
    safeBody:
      'Budget dihitung ulang dari ledger perangkat ini tiap halaman dibuka, gagal menggambar kartunya nggak menyentuh satu baris pun.',
  },
  joint: {
    eyebrow: 'Dompet Bersama',
    title: 'Dompet bersama gagal dimuat',
    body: 'Buku besar bersama kalian nggak bisa digambar sekarang.',
    safeSummary: 'Catatanmu sendiri tetap aman.',
    safeBody:
      'Buku besar bersama dan catatan pribadimu disimpan terpisah, yang gagal satu, bukan dua-duanya.',
  },
}

export const SEGMENT_ERROR_ACTIONS = {
  reloadLabel: 'Muat ulang',
  exportLabel: 'Unduh data saya',
  exportHint: 'File JSON: dompet, seluruh ledger, hutang, dan target.',
  exportDoneTitle: (fileName: string) => `Tersimpan: ${fileName}`,
  exportDoneBody: 'Datamu sekarang ada di perangkatmu sendiri.',
  exportFailedTitle: 'Nggak bisa ekspor dari halaman ini',
  exportFailedBody: 'Muat ulang halaman, lalu coba lagi.',
  homeLabel: 'Ke beranda',
  safeTitle: 'Kenapa aman?',
  safeLabel: 'Baca alasannya',
} as const

/* ── KEGAGALAN MEMUAT ASET (CHUNK) — PENYEBAB LAYAR INI DI CHECKOUT ──────────
   Kasus nyata yang dilaporkan pemilik produk: `/checkout?period=lifetime&plan=waras`
   menampilkan layar ini padahal SERVER-nya sehat (HTML 200, tanpa error).

   Yang terjadi bukan bug halaman: SATU berkas JS milik rute itu gagal dimuat —
   `ChunkLoadError: Failed to load chunk /_next/static/chunks/….js`. Pemicunya
   bisa (a) tab lama yang dibuka sebelum deploy baru (nama chunk ber-hash sudah
   tidak ada di server), (b) dokumen lama yang disajikan service worker saat
   jaringan gagal sesaat, atau (c) request chunk yang diputus jaringan/adblock.

   Untuk kegagalan seperti ini `reset()` TIDAK MENOLONG: ia menggambar ulang
   pohon yang sama dan meminta chunk dengan URL lama yang memang sudah 404 —
   tombol "Muat ulang" terasa tidak bekerja dan user tersangkut. Yang benar
   adalah reload dokumen (`window.location.reload()`), karena itu mengambil HTML
   baru beserta nama chunk yang baru. Itulah yang dipicu `isStaleAssetError()`.

   Batas jujur: reload hanya ditawarkan/dijalankan sekali per jendela waktu
   (`STALE_ASSET_RELOAD_WINDOW_MS`), supaya kalau jaringannya memang mati total
   layar ini tidak berputar-putar me-reload selamanya. */
const STALE_ASSET_PATTERN =
  /chunkloaderror|loading chunk .* failed|failed to fetch dynamically imported module|error loading dynamically imported module|importing a module script failed/i

/** kunci `sessionStorage` penjaga reload otomatis (satu kali per tab per jendela) */
export const STALE_ASSET_RELOAD_GUARD_KEY = 'catetind:stale-asset-reload-at'

/** jarak minimum antar-reload otomatis; di bawah ini layar error ditampilkan */
export const STALE_ASSET_RELOAD_WINDOW_MS = 15_000

/**
 * true = error ini kegagalan MEMUAT BERKAS (chunk/dynamic import), bukan
 * kegagalan render komponen. Hanya jenis ini yang aman & berguna di-reload.
 */
export function isStaleAssetError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false
  const { name, message } = error as { name?: unknown; message?: unknown }
  const text = `${typeof name === 'string' ? name : ''} ${
    typeof message === 'string' ? message : ''
  }`.trim()
  if (!text) return false
  return STALE_ASSET_PATTERN.test(text)
}
