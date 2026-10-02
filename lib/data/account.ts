/* ── COPY: KEPATUHAN DATA — Export & Hapus Akun (paket 43 · Stage 6) ─────────
   Dua fitur yang paling banyak "dijanjikan" aplikasi keuangan dan paling sering
   bohong: (1) "unduh datamu" yang tidak pernah menghasilkan file, dan (2) "hapus
   akun" yang cuma menyembunyikan menu. Semua kalimatnya ditinggal di sini (aturan
   repo: nol string user-facing di JSX) supaya bisa dibaca sebagai satu janji.

   Yang dijaga ketat di file ini: JANGAN mengklaim kepatuhan hukum (GDPR/UU PDP)
   dan jangan mengklaim "data dihapus dari server" — di repo demo ini tidak ada
   server. Yang tertulis hanya apa yang BENAR-BENAR terjadi: perangkat ini bersih,
   dan tidak ada salinan di tempat lain karena tidak ada tempat lain. */

/** kata kunci konfirmasi hapus akun — huruf besar, mudah diketik ulang, tidak ambigu */
export const DELETE_ACCOUNT_KEYWORD = 'HAPUS AKUN'

/**
 * Cocokkan kata kunci konfirmasi. Sengaja toleran terhadap kapital & spasi
 * berlebih (user mengetik di HP), tapi TIDAK toleran terhadap kesalahan kata:
 * keputusan ini tidak bisa dibatalkan, jadi harus benar-benar ketik.
 */
export function matchesDeleteKeyword(value: string): boolean {
  return value.trim().replace(/\s+/g, ' ').toUpperCase() === DELETE_ACCOUNT_KEYWORD
}

/* ── 1. KEBIJAKAN RETENSI (ditulis di UI, bukan disembunyikan di komentar) ────
   Empat baris ini menjawab pertanyaan yang paling sering muncul saat user mau
   menghapus akun: "apa yang hilang", "apa yang tersisa", "berapa lama", dan
   "apakah masih ada di tempat lain". */

export const RETENTION_POLICY = {
  title: 'Apa yang terjadi saat dihapus',
  summary:
    'Penghapusan ini mengosongkan data di PERANGKAT ini dan tidak ada salinan di tempat lain — bukan karena kami memilih begitu, tapi karena aplikasi demo ini belum punya server penyimpanan.',
  points: [
    {
      icon: 'device' as const,
      title: 'Dihapus sekarang juga',
      body: 'Semua catatan, dompet, saldo, hutang/piutang, target, preferensi AI, kode undangan, PIN kunci app, dan antrean catatan offline di perangkat ini.',
    },
    {
      icon: 'database' as const,
      title: 'IndexedDB dikosongkan',
      body: 'Basis data lokal tempat baris ledger disimpan dihapus seluruhnya, bukan cuma dikosongkan isinya.',
    },
    {
      icon: 'server' as const,
      title: 'Tidak ada retensi di server',
      body: 'Tidak ada salinan di server untuk dihapus maupun disimpan: repo demo ini belum punya backend, jadi tidak ada satu pun data yang pernah dikirim keluar dari perangkatmu.',
    },
    {
      icon: 'lock' as const,
      title: 'Yang tetap tertinggal',
      body: 'Satu penanda kecil "akun sudah dihapus" di perangkat ini. Isinya hanya kata itu — tanpa nominal, tanpa catatan — dan fungsinya supaya dompet contoh tidak muncul kembali setelah refresh.',
    },
  ],
} as const

export const DELETE_ACCOUNT_COPY = {
  /* kartu di panel Keamanan & Privasi */
  cardTitle: 'Hapus Akun',
  cardBody:
    'Menghapus akun berarti menghapus SEMUA datamu di perangkat ini: catatan, dompet, hutang, celengan, sampai catatan yang belum tersinkron. Ini tidak bisa dibatalkan.',
  cardCta: 'Hapus Akun Saya',
  /* lapis 1 — penjelasan + tulis kata kunci */
  dialogOneTitle: 'Hapus semua data di perangkat ini?',
  dialogOneLead: 'Ketiga langkah ini terjadi bersamaan dan tidak bisa dibatalkan:',
  dialogOneSteps: [
    'Semua catatan & dompet di perangkat ini dihapus.',
    'Basis data lokal (IndexedDB) dikosongkan seluruhnya.',
    'Sesi di perangkat ini diakhiri, lalu kamu kembali ke halaman masuk.',
  ],
  keywordLabel: `Ketik ${DELETE_ACCOUNT_KEYWORD} untuk lanjut`,
  keywordPlaceholder: DELETE_ACCOUNT_KEYWORD,
  downloadFirstLead: 'Mau simpan salinannya dulu?',
  downloadFirstCta: 'Unduh Data Saya (JSON)',
  downloadFirstHint:
    'File JSON-nya berisi dompet, seluruh baris ledger, hutang/piutang, celengan, dan pengaturan privasimu.',
  continueCta: 'Lanjut Hapus',
  cancelCta: 'Batal',
  /* lapis 2 — konfirmasi terakhir, setelah kata kuncinya benar */
  dialogTwoTitle: 'Konfirmasi terakhir',
  dialogTwoBody:
    'Ini kesempatan terakhir untuk membatalkan. Setelah kamu menekan tombol di bawah, tidak ada cara mengembalikan datanya — dan tidak ada salinan di server yang bisa diminta kembali.',
  dialogTwoCta: 'Ya, Hapus Permanen',
  cancelTwoCta: 'Simpan Dataku',
  busyLabel: 'Menghapus…',
  /* hasil */
  doneTitle: 'Semua data di perangkat ini sudah dihapus',
  doneDescription:
    'Kamu diarahkan ke halaman masuk dengan keadaan kosong. Belum ada server yang menyimpan salinan, jadi ini benar-benar bersih.',
  idbBlockedTitle: 'Sebagian penghapusan tertutup tab lain',
  idbBlockedDescription:
    'Catatan di layar sudah kosong, tapi basis data lokal masih dipakai tab lain. Tutup tab CatetInd yang lain lalu ulangi penghapusan supaya perangkat benar-benar bersih.',
  sessionFailedTitle: 'Sesi tidak bisa diakhiri',
  sessionFailedDescription:
    'Data di perangkat ini sudah dihapus, tapi cookie sesi gagal dihapus server. Coba muat ulang halaman lalu keluar sekali lagi.',
} as const

/* ── 2. PANEL EXPORT DATA SAYA (/settings/data) ─────────────────────────────
   Satu tombol, satu janji: filenya keluar di perangkat user sendiri. Jalur email
   tetap ditawarkan, tapi DIBERI LABEL DEMO — karena mengirim email butuh server
   yang belum ada, dan tombol yang mengaku "sudah dikirim" adalah kebohongan yang
   paling gampang diperiksa user (inbox-nya kosong). */

export const EXPORT_DATA_COPY = {
  eyebrow: 'Export Data',
  title: 'Export Data Saya',
  desc: 'Unduh seluruh catatanmu sebagai satu file JSON — utuh, tanpa dipotong, dan tanpa dikirim ke siapa pun.',
  cardTitle: 'Isi filenya apa saja?',
  includes: [
    'Dompet & saldo hasil hitung ulang dari baris ledger',
    'Dompet yang sudah kamu hapus, ditandai sebagai terhapus (paket 62)',
    'Seluruh baris ledger, termasuk yang sudah kamu hapus (ditandai)',
    'Hutang & piutang beserta riwayat pembayarannya',
    'Celengan/target tabungan dan target bulanan',
    'Pengaturan privasi yang tersimpan di perangkat ini',
  ],
  metadataNote:
    'Di dalam file ada `exportedAt`, versi skema, dan jumlah baris tiap bagian — supaya file ini bisa diaudit tanpa harus dibaca habis.',
  downloadCta: 'Unduh File JSON',
  preparingCta: 'Menyiapkan file…',
  downloadedTitle: (fileName: string) => `File tersimpan: ${fileName}`,
  downloadedDescription: (wallets: number, rows: number) =>
    `${wallets} dompet & ${rows} baris ledger ikut di dalamnya. Cek folder unduhan di perangkatmu.`,
  failedTitle: 'File tidak bisa disiapkan di sini',
  failedDescription:
    'Browser ini menolak membuat berkas unduhan. Coba buka halaman ini di tab biasa (bukan mode privasi ketat).',
  emailTitle: 'Kirim ke email saya',
  emailDemoBadge: 'Demo',
  emailBody:
    'Jalur ini disiapkan untuk produksi: server yang mengompilasi JSON lalu mengirim lewat email transaksional. Di repo demo ini belum ada server pengirim, jadi tombolnya TIDAK mengirim apa pun — file-nya kamu unduh sendiri di atas.',
  emailCta: 'Kirim ke Email Saya (demo)',
  emailToastTitle: 'Belum ada server pengirim email',
  emailToastDescription:
    'Jadi tidak ada email yang dikirim — silakan unduh file JSON-nya, itu yang benar-benar berisi datamu.',
  emailTargetLabel: 'Alamat tujuan',
} as const

/* ── 3. KEADAAN KOSONG SETELAH AKUN DIHAPUS (dipakai Home) ───────────────────
   Setelah akun dihapus, Home tidak boleh menampilkan angka contoh seolah-olah
   masih milik user. Yang tampil adalah kalimat keadaan ini + jalan memulai lagi
   dari onboarding. */

export const EMPTY_ACCOUNT_COPY = {
  title: 'Akun ini kosong — datanya sudah dihapus',
  body: 'Semua catatan, dompet, dan saldo di perangkat ini sudah tidak ada. Kartu-kartu di halaman ini masih memuat angka contoh aplikasi sampai kamu mulai mencatat lagi.',
  cta: 'Mulai Lagi dari Onboarding',
  hint: 'Butuh salinannya? Tidak ada salinan yang bisa dipulihkan dari server — repo demo ini memang belum punya server.',
} as const
