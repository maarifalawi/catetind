/* ── 404 / Not Found (inventaris #32) · catch-all ─────────────────────────────
   Momen paling rawan: bookmark lama, tautan salah salin, atau `/share/[id]`
   yang datanya sudah dihapus. Satu tugas copy di sini: **jangan menegur,
   tunjukkan jalan pulang** (PRD 542–568).

   AUDIT "CLEAN UI" (paket 63): versi lama punya badan dua kalimat, kotak bantuan
   terpisah, DAN satu paragraf penutup miring yang mengulang lagi "datamu aman".
   Tiga kali pesan yang sama = noise. Sekarang: satu baris penjelasan, satu baris
   penenang yang menyatu di baris itu, lalu aksi. Tidak ada kata "error" dan
   tidak ada "404" yang menonjol.

   Datanya murni — tanpa React — supaya copy bisa diaudit & diganti sekali saja,
   persis pola `lib/data/*` lainnya. Ikon dipetakan di komponen, bukan di sini. */

/** kode kecil non-menonjol — memberi tahu SEBAB-nya tanpa menakut-nakuti */
export const NOT_FOUND_EYEBROW = 'Kode 404'

/** H1 hangat: metafora kebun milik produk, bukan "Page Not Found" */
export const NOT_FOUND_TITLE = 'Halaman ini nggak ada di kebun kita 🌱'

/** SATU baris: sebabnya + penenangnya, tanpa paragraf kedua */
export const NOT_FOUND_BODY = 'Tautannya mungkin salah ketik atau sudah pindah — datamu aman.'

/** label ilustrasi tanaman kecil di kepala halaman (dekoratif, tetap punya makna) */
export const NOT_FOUND_ART_LABEL = 'Tunas kecil di pot — tanaman CatetInd masih tumbuh'

/** CTA utama — satu tombol, satu arah: pulang ke Dashboard */
export const NOT_FOUND_HOME_CTA = 'Balik ke Beranda'

/** pintasan sekunder: halaman yang paling mungkin user cari, bukan daftar menu */
export type NotFoundShortcut = {
  href: string
  label: string
  blurb: string
}

export const NOT_FOUND_SHORTCUTS_TITLE = 'Mungkin kamu cari ini'

export const NOT_FOUND_SHORTCUTS: NotFoundShortcut[] = [
  { href: '/wallet', label: 'Dompet & Akun', blurb: 'Cek saldo' },
  { href: '/history', label: 'Riwayat & Insight', blurb: 'Semua catatan' },
  { href: '/budget', label: 'Budget & Nabung', blurb: 'Jatah & celengan' },
  { href: '/help', label: 'Pusat Bantuan', blurb: 'Jawaban cepat' },
]

/** kotak bantuan kecil — pintu kedua, bukan jalan buntu kedua */
export const NOT_FOUND_HELP_BODY = 'Masih nyasar? Sapa kami di Pusat Bantuan.'
export const NOT_FOUND_HELP_CTA = 'Buka Bantuan'
