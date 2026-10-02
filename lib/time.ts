/* ── SATU "HARI INI" UNTUK SELURUH APP (paket 57 · audit AKAR B) ─────────────
   Sebelum file ini ada, repo punya LIMA jangkar tanggal yang berbeda-beda dan
   semuanya dipatok ke literal:

     lib/data/history.ts:143  HISTORY_TODAY_ISO  = '2026-09-27'
     lib/data/bills.ts:77     TODAY_ISO          = '2026-09-25'
     lib/data/calendar.ts:171 CALENDAR_TODAY_ISO = '2026-09-25'
     lib/data/joint.ts:93     JOINT_TODAY_ISO    = '2026-09-25'
     lib/data/wealth.ts:245   WEALTH_TODAY_ISO   = '2026-09-25'

   Akibatnya lima halaman bisa menyebut tanggal yang BERBEDA pada hari yang
   sama: strip "7 Hari ke Depan" di /bills mulai dari 25 Sep, jangkar /calendar
   25 Sep, label "Hari ini" di /joint 25 Sep, sementara Home & /budget memakai
   27 Sep. Bukan cuma tidak konsisten — itu klaim palsu di depan user
   ("hari ini" yang bukan hari ini), dan aturan repo melarangnya (kanon
   "jujur di setiap klaim", PRD 244).

   ATURAN YANG DIPAKAI SEJAK PAKET 57
   ------------------------------------------------------------------
   1. Satu-satunya definisi "hari ini" = file ini. Semua jangkar UI memakai
      `todayISO()` / `useTodayISO()`; konstanta tanggal di `lib/data/*` TURUN
      menjadi jangkar DEFAULT untuk render server, test, dan data seed — bukan
      lagi sumber tanggal yang dilihat user.
   2. DATA SEED tetap bertanggal tetap (demo stabil & bebas hydration
      mismatch). Yang bergerak cuma JANGKAR: "hari ini", "kemarin", rentang
      "7 hari ke depan", dan jendela periode.
   3. Nilai live WAJIB diisi SETELAH mount lewat `useTodayISO()` (pola yang
      sudah dipakai `wallet-detail-screen.tsx:147` dan `history-screen.tsx:171`).
      Kalau `todayISO()` dibaca saat render server/pertama client, HTML server
      dan hasil hidrasi bisa berbeda (server jam UTC vs client jam lokal) →
      hydration mismatch, yang dilarang `CONTEXT-WAJIB` §8.

   Hook-nya (`useTodayISO()`) hidup di `lib/use-today-iso.ts`, BUKAN di file ini:
   file ini juga diimpor modul yang dipakai SERVER COMPONENT & ROUTE HANDLER
   (`lib/data/history.ts`, `lib/data/joint.ts`), dan begitu ada `useState` di
   dalamnya, build Next menolak dengan "importing a module that depends on
   useState into a React Server Component module". Jadi: fungsi murni di sini,
   hook-nya di file `'use client'` — sama seperti `lib/use-push-notifications.ts`. */

/** tanggal LOKAL (bukan UTC) dalam format `YYYY-MM-DD` */
export function localISODate(date: Date = new Date()): string {
  const m = `${date.getMonth() + 1}`.padStart(2, '0')
  const day = `${date.getDate()}`.padStart(2, '0')
  return `${date.getFullYear()}-${m}-${day}`
}

/**
 * "Hari ini" menurut jam PERANGKAT user.
 *
 * Dipisah dari `localISODate()` supaya pemanggil tidak perlu menebak default-nya
 * (`new Date()` di parameter) dan supaya ada SATU nama yang dipakai semua
 * halaman. Aman dipanggil kapan pun; ia tidak menyimpan state apa pun, jadi dua
 * panggilan dalam satu render selalu memberi nilai yang sama (kasus uji
 * "nilai stabil dalam satu render").
 */
export function todayISO(): string {
  return localISODate()
}

/**
 * Tanggal (1–31) dari sebuah string `YYYY-MM-DD`.
 *
 * Dipakai pemanggil yang butuh "hari ke berapa hari ini" (mis. status telat
 * tagihan) — supaya `Number(iso.slice(8, 10))` tidak ditulis ulang di setiap
 * komponen, dan tanggal rusak tidak pernah jadi `NaN` yang menyebar.
 */
export function dayOfMonth(iso: string, fallback = 1): number {
  const day = Number(iso.slice(8, 10))
  return Number.isFinite(day) && day >= 1 && day <= 31 ? day : fallback
}
