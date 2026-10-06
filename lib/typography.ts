/* ── Token tipografi NOMINAL DUIT (satu sumber untuk seluruh app) ─────────────
   Dipakai bersama oleh muka kartu dompet di Dashboard
   (components/catetind/wallet-card-stack.tsx) dan halaman Dompet & Akun
   (components/catetind/wallet-screen.tsx) supaya angka saldo punya ukuran,
   bobot (weight), dan letter-spacing yang PERSIS sama di mana pun ia muncul.

   Kenapa perlu: sebelumnya halaman Dompet & Akun menulis sendiri
   `font-black` + tracking sendiri, sehingga nominal Rp-nya terasa lebih bulky
   dan rapat daripada nominal di Dashboard. Dengan token ini tidak ada lagi
   font-weight "karangan per halaman".

   Kelas ditulis LITERAL (bukan dirakit dari potongan string) supaya terbaca
   scanner Tailwind — Tailwind hanya meng-generate kelas yang teksnya muncul
   utuh di source code. */

/** eyebrow kecil di atas nominal — "SALDO", "TOTAL SALDO" */
export const AMOUNT_LABEL = 'text-[11px] font-medium uppercase tracking-[0.14em]'

/** nominal besar: hero Dompet & Akun + muka kartu "Total Saldo" di Dashboard */
export const AMOUNT_XL = 'text-3xl font-medium tracking-tight tabular-nums sm:text-4xl'

/** nominal sedang: muka tiap kartu dompet di halaman Dompet & Akun */
export const AMOUNT_LG = 'text-2xl font-medium tracking-tight tabular-nums sm:text-3xl'

/* ── FIELD NOMINAL YANG SEDANG DIKETIK (paket 53) ───────────────────────────────
   Kelas untuk angka yang user KETIK — berbeda tugas dengan AMOUNT_XL/AMOUNT_LG di
   atas, yang menampilkan angka yang sudah tersimpan.

   Kenapa dipisah: field nominal engine dulu menulis `font-black tracking-tighter`
   sendiri, dan begitu dicoba di layar angkanya terasa berat/bulky. Resep kanon
   angka app ini semibold (lihat catatan bobot di app/globals.css), jadi field
   yang diketik mengikuti resep itu, bukan mengarang bobot baru. Tiga tingkat
   ukuran di bawah mengecil bertahap saat angkanya makin panjang supaya 13 digit
   (maksimum app) tetap muat tanpa terpotong di 375 px.

   Digit & ritme: `tabular-nums` supaya lebar digit seragam (angka tidak
   "bergeser" saat diketik), `leading-none` supaya tinggi baris = ukuran font —
   pemanggil yang memaku tinggi barisnya (lihat engine) supaya tidak melompat. */

/** ≤ 7 digit — mis. "1.000.000" (field nominal engine, paling besar) */
export const AMOUNT_INPUT =
  'font-display text-[2.75rem] font-medium leading-none tracking-tight tabular-nums sm:text-[3.25rem]'

/** 8–10 digit — mis. "9.999.999.999" */
export const AMOUNT_INPUT_SM =
  'font-display text-[2.1rem] font-medium leading-none tracking-tight tabular-nums sm:text-[2.6rem]'

/** 11–13 digit — mis. "9.999.999.999.999" (rapat, tapi tidak terpotong) */
export const AMOUNT_INPUT_XS =
  'font-display text-[1.6rem] font-medium leading-none tracking-tight tabular-nums sm:text-[1.9rem]'

/**
 * Resep dasar tanpa ukuran untuk field nominal di kolom kecil (RupiahField di
 * sheet & form konfirmasi AI): font, bobot, dan ritme angka yang sama dengan
 * engine — ukurannya ikut konteks kolomnya, jadi sengaja TIDAK dipaku di sini.
 */
export const AMOUNT_INPUT_FIELD = 'font-display font-medium tracking-tight tabular-nums'

/**
 * Pilih tingkat ukuran field nominal dari banyaknya DIGIT (bukan panjang string:
 * titik ribuan ikut dihitung di `display`, jadi "1.000.000" = 7 digit).
 * Satu aturan untuk semua shell — bottom sheet, modal web, sheet edit, kalender.
 */
export function amountInputFont(digitCount: number): string {
  if (digitCount <= 7) return AMOUNT_INPUT
  if (digitCount <= 10) return AMOUNT_INPUT_SM
  return AMOUNT_INPUT_XS
}
