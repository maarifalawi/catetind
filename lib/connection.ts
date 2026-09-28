/* ── KONEKSI (ONLINE/OFFLINE) — satu sumber untuk banner & antrean (paket 42) ─
   Sebelum paket ini repo NOL memakai `navigator.onLine`: app tidak pernah tahu
   dirinya sedang offline, jadi tidak ada banner, tidak ada antrean, dan tidak
   ada tanda "catatan ini belum beres". Modul ini yang menjawab pertanyaan itu,
   dan sengaja dipisah dari UI supaya:

     · store uang bisa menandai baris yang lahir OFFLINE (`lib/money/store.ts`)
       tanpa mengimpor React;
     · banner offline cuma membaca satu nilai, bukan membaca browser sendiri;
     · jalur ini bisa diuji: `setOnlineOverride(false)` membuat test bisa
       mensimulasikan "sedang offline" secara deterministik — `navigator` tidak
       ada di lingkungan test.

   Batas jujurnya (ditulis di banner juga): tanpa backend, "online" hanya berarti
   perangkat punya jaringan. Tidak ada server yang menerima apa pun. */

/** pemakai bisa berlangganan perubahan status (banner memakainya) */
const listeners = new Set<() => void>()

/** `null` = ikut browser; dipakai test & tombol review */
let override: boolean | null = null

/** nilai browser terakhir yang terbaca (dibaca malas: `navigator` hanya di klien) */
let browserValue = true
let browserRead = false

function readBrowser(): boolean {
  if (typeof navigator === 'undefined') return true
  return navigator.onLine !== false
}

/** status efektif sekarang. Di SSR/test (tanpa `navigator`) → true (anggap online). */
export function readOnline(): boolean {
  if (override !== null) return override
  if (!browserRead) {
    browserValue = readBrowser()
    browserRead = true
  }
  return browserValue
}

/**
 * Paksa status koneksi (test & review desain). `null` mengembalikan kendali ke
 * browser. Di produksi fungsi ini tidak dipanggil siapa pun — ia ada supaya
 * jalur offline bisa dibuktikan dengan test, bukan cuma diklaim.
 */
export function setOnlineOverride(value: boolean | null): void {
  if (override === value) return
  override = value
  emit()
}

/** baca ulang status browser (dipanggil dari event `online`/`offline`); true = berubah */
export function syncConnection(): boolean {
  const next = override !== null ? override : readBrowser()
  browserRead = true
  const changed = next !== browserValue
  browserValue = next
  emit()
  return changed
}

export function subscribeConnection(listener: () => void): () => void {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

function emit(): void {
  for (const listener of listeners) listener()
}
