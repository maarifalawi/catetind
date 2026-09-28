/* ── COPY: ERROR BOUNDARY PER SEGMEN (paket 43 · audit Stage 6 #3) ────────────
   Sebelum paket ini repo hanya punya `app/not-found.tsx`. Artinya SATU error
   render di halaman uang (mis. satu baris ledger yang bentuknya tidak terduga)
   menghasilkan layar mati total: user tidak bisa pindah halaman, tidak bisa
   mengunduh catatannya, dan tidak tahu apakah datanya hilang.

   Nada copy di sini sengaja TENANG dan selalu menyebut tiga hal: (1) apa yang
   gagal, (2) datanya TIDAK hilang, (3) apa langkah berikutnya. Tidak ada
   kalimat menyalahkan user, tidak ada kode error mentah di layar — kode teknis
   hanya masuk laporan konsol, bukan wajah aplikasi. */

export type SegmentErrorArea = 'app' | 'wallet' | 'wealth' | 'history' | 'joint'

export interface SegmentErrorCopy {
  eyebrow: string
  title: string
  body: string
  /** apa yang bisa dicoba user — satu langkah, bukan daftar panjang */
  hint: string
}

export const SEGMENT_ERROR_COPY: Record<SegmentErrorArea, SegmentErrorCopy> = {
  app: {
    eyebrow: 'Ada yang gagal dimuat',
    title: 'Halaman ini berhenti di tengah jalan',
    body: 'Bagian ini gagal ditampilkan. Catatanmu tetap tersimpan di perangkat ini — tidak ada yang hilang karena error ini.',
    hint: 'Coba muat ulang dulu. Kalau masih gagal, unduh datamu supaya tetap aman di tanganmu.',
  },
  wallet: {
    eyebrow: 'Dompet & Akun',
    title: 'Daftar dompet gagal dimuat',
    body: 'Kami tidak bisa menggambar kartu dompetmu kali ini. Saldo & baris ledger-nya tetap utuh di perangkat ini.',
    hint: 'Muat ulang biasanya cukup. Kalau tidak, unduh datamu lewat tombol di bawah — sidebar tetap bisa dipakai untuk pindah halaman.',
  },
  wealth: {
    eyebrow: 'Kekayaan & Hutang',
    title: 'Perhitungan kekayaan gagal ditampilkan',
    body: 'Net Worth dihitung dari beberapa bagian sekaligus, dan salah satunya gagal dibaca. Angka saldomu tidak ikut berubah karena ini.',
    hint: 'Muat ulang untuk menghitung ulang, atau unduh datamu supaya kamu punya salinan angkanya.',
  },
  history: {
    eyebrow: 'Riwayat',
    title: 'Riwayat catatan gagal dimuat',
    body: 'Daftar catatanmu tidak bisa ditampilkan saat ini. Tidak ada catatan yang terhapus karena kegagalan ini.',
    hint: 'Muat ulang dulu. Kalau tetap gagal, unduh datamu — poin pentingnya tidak hilang di perangkat ini.',
  },
  joint: {
    eyebrow: 'Dompet Bersama',
    title: 'Dompet bersama gagal dimuat',
    body: 'Buku besar bersama kalian tidak bisa digambar sekarang. Catatanmu sendiri tetap aman di perangkat ini.',
    hint: 'Muat ulang halaman ini, atau lanjut mengurus catatan pribadimu dulu — sidebar tetap jalan.',
  },
}

export const SEGMENT_ERROR_ACTIONS = {
  reloadLabel: 'Muat ulang halaman',
  exportLabel: 'Unduh Data Saya (JSON)',
  exportHint: 'Menghasilkan file JSON berisi dompet, seluruh baris ledger, hutang/piutang, dan target.',
  exportDoneTitle: (fileName: string) => `File tersimpan: ${fileName}`,
  exportDoneBody: 'Catatanmu sekarang ada di perangkatmu sendiri sebagai berkas JSON.',
  exportFailedTitle: 'Export tidak bisa disiapkan dari halaman ini',
  exportFailedBody: 'Coba muat ulang halaman lalu unduh dari Pengaturan → Export Data Saya.',
  homeLabel: 'Kembali ke Beranda',
  safeNote:
    'Data uangmu hidup di store ledger + IndexedDB perangkat ini, bukan di komponen yang gagal tadi — jadi tidak ada catatan yang hilang.',
} as const
