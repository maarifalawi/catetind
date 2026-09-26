/* ── 404 / Not Found (inventaris #32) · catch-all ─────────────────────────────
   Satu-satunya halaman yang tidak pernah dicari user, tapi justru muncul di
   momen paling rawan: bookmark lama, tautan teman yang salah salin, atau URL
   `/share/[id]` yang datanya sudah dihapus. Nada yang salah di sini (mis.
   "Not Found 404" bergaya sistem) langsung membuyarkan rasa aman yang dibangun
   seluruh produk.

   Karena itu semua copy di bawah ditulis dengan satu tugas saja: **jangan
   menegur, tunjukkan jalan pulang** (PRD 542–568 = nada "teman yang suportif";
   PRD 2079–2099 = error bukan momen untuk menegur). Konsekuensinya:
     · tidak ada kata "error", tidak ada nama teknis, tidak ada stack trace;
     · "404" hanya muncul sebagai kode kecil non-menonjol (informasi, bukan tuduhan);
     · tidak ada satu pun kalimat yang menyalahkan user;
     · rasa aman (data tidak berubah) disebut SEBELUM user sempat bertanya.

   Datanya murni — tanpa React — supaya copy bisa diaudit & diganti sekali saja,
   persis pola `lib/data/*` lainnya. Ikon pintasan dipetakan di komponen,
   bukan di sini, supaya file ini tetap bebas dari dependensi UI.
   ────────────────────────────────────────────────────────────────────────── */

/** kode kecil non-menonjol — memberi tahu SEBAB-nya tanpa menakut-nakuti */
export const NOT_FOUND_EYEBROW = 'Kode 404'

/** H1 hangat: metafora kebun milik produk, bukan "Page Not Found" */
export const NOT_FOUND_TITLE = 'Halaman ini nggak ada di kebun kita 🌱'

/** satu kalimat penjelasan + satu kalimat menenangkan (aman dulu, baru pulang) */
export const NOT_FOUND_BODY =
  'Tautannya mungkin sudah dipindah atau salah ketik. Datamu aman — nggak ada yang berubah.'

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

export const NOT_FOUND_SHORTCUTS_TITLE = 'Mungkin yang kamu cari ada di sini'

export const NOT_FOUND_SHORTCUTS: NotFoundShortcut[] = [
  { href: '/wallet', label: 'Dompet & Akun', blurb: 'Cek saldo & pindah dana' },
  { href: '/history', label: 'Riwayat & Insight', blurb: 'Semua catatan transaksi' },
  { href: '/budget', label: 'Budget & Nabung', blurb: 'Jatah harian & celengan' },
  { href: '/help', label: 'Pusat Bantuan', blurb: 'Cara pakai & jawaban cepat' },
]

/** kotak bantuan kecil — pintu kedua, bukan jalan buntu kedua */
export const NOT_FOUND_HELP_BODY = 'Nyasar terus? Kabarin kami di Pusat Bantuan ya.'
export const NOT_FOUND_HELP_CTA = 'Buka Pusat Bantuan'

/** penutup yang menenangkan: tidak ada yang rusak, tidak ada yang perlu dibetulkan */
export const NOT_FOUND_FOOTNOTE =
  'Catatanmu tetap tersimpan rapi. Nggak ada yang perlu kamu perbaiki di sini.'
