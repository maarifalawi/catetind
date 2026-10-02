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
  /* AUDIT "CLEAN UI" (paket 63): summary dulu dua kalimat; cukup satu baris.
     Detail tiap poin pindah ke balik disclosure di panel (InfoNote). */
  summary: 'Semua data di perangkat ini dihapus, dan nggak ada salinan di tempat lain.',
  detailLabel: 'Detail',
  points: [
    {
      icon: 'device' as const,
      title: 'Dihapus sekarang juga',
      body: 'Catatan, dompet, saldo, hutang/piutang, target, preferensi AI, kode undangan, PIN, sampai antrean catatan offline.',
    },
    {
      icon: 'database' as const,
      title: 'Basis lokal dikosongkan',
      body: 'Penyimpanan lokal tempat ledger disimpan dihapus seluruhnya — bukan cuma dikosongkan isinya.',
    },
    {
      icon: 'server' as const,
      title: 'Nggak ada retensi di server',
      body: 'Demo ini belum punya backend, jadi nggak pernah ada datamu yang dikirim keluar dari perangkat ini.',
    },
    {
      icon: 'lock' as const,
      title: 'Yang tetap tertinggal',
      body: 'Satu penanda kecil "akun sudah dihapus" — tanpa nominal, tanpa catatan — supaya dompet contoh nggak muncul lagi.',
    },
  ],
} as const

export const DELETE_ACCOUNT_COPY = {
  /* kartu di panel Keamanan & Privasi */
  cardTitle: 'Hapus Akun',
  cardBody: 'Menghapus SEMUA datamu di perangkat ini. Nggak bisa dibatalkan.',
  cardCta: 'Hapus Akun Saya',
  /* lapis 1 — penjelasan + tulis kata kunci */
  dialogOneTitle: 'Hapus semua data di perangkat ini?',
  dialogOneLead: 'Ketiga langkah ini terjadi bersamaan dan tidak bisa dibatalkan:',
  dialogOneSteps: [
    'Semua catatan & dompet di perangkat ini dihapus.',
    'Penyimpanan lokal di perangkat ini dikosongkan.',
    'Sesi berakhir, lalu kamu kembali ke halaman masuk.',
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
  dialogTwoBody: 'Kesempatan terakhir. Setelah ini datanya nggak bisa dikembalikan.',
  dialogTwoCta: 'Ya, Hapus Permanen',
  cancelTwoCta: 'Simpan Dataku',
  busyLabel: 'Menghapus…',
  /* hasil */
  doneTitle: 'Semua data di perangkat ini sudah dihapus',
  doneDescription: 'Kamu diarahkan ke halaman masuk dengan keadaan kosong.',
  idbBlockedTitle: 'Sebagian penghapusan tertutup tab lain',
  idbBlockedDescription:
    'Penyimpanan lokal masih dipakai tab CatetInd lain. Tutup tab lainnya, lalu ulangi penghapusan.',
  sessionFailedTitle: 'Sesi tidak bisa diakhiri',
  sessionFailedDescription:
    'Datanya sudah dihapus, tapi sesi gagal ditutup. Muat ulang halaman, lalu keluar sekali lagi.',
} as const

/* ── 2. PANEL EXPORT DATA SAYA (/settings/data) ─────────────────────────────
   Satu tombol, satu janji: filenya keluar di perangkat user sendiri. Jalur email
   tetap ditawarkan, tapi DIBERI LABEL DEMO — karena mengirim email butuh server
   yang belum ada, dan tombol yang mengaku "sudah dikirim" adalah kebohongan yang
   paling gampang diperiksa user (inbox-nya kosong). */

export const EXPORT_DATA_COPY = {
  eyebrow: 'Export Data',
  title: 'Export Data Saya',
  desc: 'Unduh seluruh catatanmu sebagai satu file JSON.',
  cardTitle: 'Isi filenya apa saja?',
  includes: [
    'Dompet & saldo',
    'Dompet yang sudah kamu hapus (ditandai)',
    'Semua baris ledger, termasuk yang dihapus (ditandai)',
    'Hutang & piutang + riwayat bayarnya',
    'Celengan & target bulanan',
    'Pengaturan privasi di perangkat ini',
  ],
  metadataNote: 'Plus metadata: waktu ekspor, versi skema, dan jumlah baris.',
  downloadCta: 'Unduh File JSON',
  preparingCta: 'Menyiapkan file…',
  downloadedTitle: (fileName: string) => `Tersimpan: ${fileName}`,
  downloadedDescription: (wallets: number, rows: number) =>
    `${wallets} dompet & ${rows} baris ledger ikut di dalamnya.`,
  failedTitle: 'File nggak bisa disiapkan di sini',
  failedDescription: 'Browser ini menolak unduhan. Coba buka di tab biasa (bukan mode privasi ketat).',
  emailTitle: 'Kirim ke email saya',
  emailDemoBadge: 'Demo',
  emailBody:
    'Jalur ini disiapkan untuk produksi. Demo ini belum punya server pengirim, jadi tombolnya nggak mengirim email — unduh filenya di atas.',
  emailCta: 'Kirim ke Email Saya (demo)',
  emailToastTitle: 'Belum ada server pengirim email',
  emailToastDescription: 'Nggak ada email yang dikirim — pakai tombol unduh di atas ya.',
  emailTargetLabel: 'Alamat tujuan',
} as const

/* ── 3. KEADAAN KOSONG SETELAH AKUN DIHAPUS (dipakai Home) ───────────────────
   Setelah akun dihapus, Home tidak boleh menampilkan angka contoh seolah-olah
   masih milik user. Yang tampil adalah kalimat keadaan ini + jalan memulai lagi
   dari onboarding. */

export const EMPTY_ACCOUNT_COPY = {
  title: 'Akun ini kosong — datanya sudah dihapus',
  body: 'Kartu-kartu di halaman ini masih pakai angka contoh sampai kamu mulai mencatat lagi.',
  cta: 'Mulai Lagi dari Onboarding',
  hint: 'Nggak ada salinan yang bisa dipulihkan — demo ini belum punya server.',
} as const
