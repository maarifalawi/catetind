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
export const AMOUNT_XL = 'text-3xl font-semibold tracking-tight tabular-nums sm:text-4xl'

/** nominal sedang: muka tiap kartu dompet di halaman Dompet & Akun */
export const AMOUNT_LG = 'text-2xl font-semibold tracking-tight tabular-nums sm:text-3xl'
