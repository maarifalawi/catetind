/**
 * scripts/tools/copy-tone-pass.mjs — P1.2 · nada copy "kamu".
 *
 * Aturan nada yang diminta pemilik produk:
 *   · sapa pembaca dengan **kamu** (bukan "lo"/"Anda");
 *   · Minca menyebut dirinya **aku** (bukan "gue");
 *   · kalimat pendek, hangat, tanpa menghakimi;
 *   · nol "harus/wajib" di teks yang dibaca user.
 *
 * Skrip ini IDEMPOTEN: dijalankan dua kali hasilnya sama. Semua penggantian
 * ditulis eksplisit (bukan regex buta) supaya kalimat yang sudah benar tidak
 * ikut berubah — mis. "harus" di komentar kode tidak disentuh karena komentar
 * bukan teks layar.
 *
 * Pakai: node scripts/tools/copy-tone-pass.mjs
 */
import fs from 'node:fs'

/** [berkas, cari, ganti] — urut dari yang paling spesifik ke umum. */
const EDITS = [
  /* ── Pusat Bantuan ─────────────────────────────────────────────────────── */
  ['lib/data/help.ts', 'Puzzle Gue Ngapain Sih?', 'Puzzle Kamu Ngapain Sih?'],
  ['lib/data/help.ts', 'Budget Gue Lewat, Panik Nggak?', 'Budget Kamu Lewat, Panik Nggak?'],
  ['lib/data/help.ts', 'Net Worth Gue Kok Turun?', 'Net Worth Kamu Kok Turun?'],
  ['lib/data/help.ts', 'Nggak harus pas, perkiraan aja dulu.', 'Nggak perlu pas, perkiraan aja dulu.'],
  ['lib/data/help.ts', 'gue nggak nge-judge.', 'aku nggak nyalahin.'],
  ['lib/data/help.ts', 'nggak pernah nge-judge pengeluaranmu.', 'nggak pernah nyalahin pengeluaranmu.'],
  ['lib/data/help.ts', 'Gue nggak nemu yang pas 😅', 'Aku nggak nemu yang pas 😅'],
  ['lib/data/help.ts', 'Gue', 'Aku'],
  ['lib/data/help.ts', 'gue', 'aku'],

  /* ── Rekap mingguan ────────────────────────────────────────────────────── */
  ['lib/weekly-recap.ts', 'bukan angka yang harus dikejar.', 'bukan angka yang perlu dikejar.'],
  [
    'lib/weekly-recap.ts',
    'Belum ada pengeluaran minggu ini, yang kamu catat otomatis muncul di sini.',
    'Belum ada pengeluaran minggu ini. Catatanmu otomatis muncul di sini.',
  ],
  [
    'lib/weekly-recap.ts',
    'Belum ada pemasukan minggu ini, catat pemasukan biar perbandingannya kebaca.',
    'Belum ada pemasukan minggu ini. Catat pemasukan biar perbandingannya kebaca.',
  ],
  [
    'lib/weekly-recap.ts',
    'Pengeluaran pekan ini masih nol, minggu depan bebas kamu atur.',
    'Pengeluaran pekan ini masih nol. Minggu depan bebas kamu atur.',
  ],
  [
    'lib/weekly-recap.ts',
    'Rekap ini menggambar dari catatanmu sendiri, catat transaksi pertama, dan angka serta grafiknya langsung hidup.',
    'Rekap ini dari catatanmu sendiri. Catat transaksi pertama, angka dan grafiknya langsung hidup.',
  ],

  /* ── Budget ────────────────────────────────────────────────────────────── */
  ['lib/data/budget.ts', 'buat pos wajib sebelum', 'buat pos rutin sebelum'],

  /* ── Ajak Teman ────────────────────────────────────────────────────────── */
  [
    'lib/data/referral.ts',
    'Gue lagi pakai CatetInd buat track keuangan. Cuma 4 tap buat catat pengeluaran dan ada Minca yang nggak nge-judge. Kalau mau coba, pake link gue buat dapet diskon 10%:',
    'Aku lagi pakai CatetInd buat catat keuangan. Cuma 4 tap buat nyatet pengeluaran, ada AI yang bantu tanpa nyalahin. Kalau mau coba, pakai link aku, kamu dapat diskon 10%:',
  ],
  ['components/catetind/referral-screen.tsx', 'Reward Lo', 'Reward Kamu'],
  ['components/catetind/referral-screen.tsx', 'Link Referral Lo', 'Link Referral Kamu'],
  ['components/catetind/referral-screen.tsx', 'Pencapaian Lo', 'Pencapaian Kamu'],

  /* ── Landing ───────────────────────────────────────────────────────────── */
  ['lib/data/landing.ts', 'buat lo yang ', 'buat kamu yang '],
  ['lib/data/landing.ts', 'Lo terima beres', 'Kamu terima beres'],
  ['lib/data/landing.ts', 'tanpa di-judge', 'tanpa nyalahin'],
  ['lib/data/landing.ts', 'Aplikasi catet keuangan buat lo yang males nyatet', 'Aplikasi catet keuangan buat kamu yang males nyatet'],
  ['lib/data/landing.ts', "'harus-paham-keuangan'", "'perlu-paham-keuangan'"],
  ['lib/data/landing.ts', 'Harus ngerti keuangan dulu ngga', 'Perlu ngerti keuangan dulu ngga'],
  ['lib/data/landing.ts', 'atau harus di-download?', 'atau perlu di-download?'],
  ['lib/data/landing.ts', 'Bank-sync berarti kamu harus kasih akses', 'Bank-sync berarti kamu perlu kasih akses'],
  ['lib/data/landing.ts', "'Nama wajib diisi.'", "'Nama perlu diisi.'"],
  ['lib/data/landing.ts', "'Kontak wajib diisi. Isi nomor WhatsApp atau email.'", "'Kontak perlu diisi. Isi nomor WhatsApp atau email.'"],
  ['lib/data/landing.ts', "'Pesan atau pertanyaan wajib diisi.'", "'Pesan atau pertanyaan perlu diisi.'"],
  ['lib/data/landing.ts', 'Lo ', 'Kamu '],
  ['lib/data/landing.ts', ' lo.', ' kamu.'],
  ['lib/data/landing.ts', ' lo,', ' kamu,'],
  ['lib/data/landing.ts', ' lo?', ' kamu?'],
  /* "Halo" bukan sapaan "lo" — dikembalikan kalau sempat tersentuh. */
  ['lib/data/landing.ts', 'Hakamu Minca', 'Halo Minca'],

  /* ── Validasi form dompet (teks layar) ─────────────────────────────────── */
  ['lib/data/add-wallet.ts', 'wajib diisi', 'perlu diisi'],

  /* ── Changelog: judul bahasa Inggris + deskripsi berpipa ───────────────── */
  ['lib/data/changelog.ts', "title: 'Product Updates'", "title: 'Yang Baru di CatetInd'"],
  [
    'lib/data/changelog.ts',
    'Semua yang baru di CatetInd | fitur, peningkatan, dan perbaikan di setiap versi. Ringkas, tanpa bahasa marketing.',
    'Fitur baru, peningkatan, dan perbaikan di setiap versi. Ringkas, tanpa bahasa marketing.',
  ],
  /* ── Kalkulator Uang Gaib (landing publik) ─────────────────────────────── */
  ['lib/data/pain-calculator.ts', "titleEmphasis: 'gaji lo'", "titleEmphasis: 'gaji kamu'"],
  ['lib/data/pain-calculator.ts', 'Masih aman, tapi jangan lengah!', 'Masih aman. Pelan-pelan aja.'],
  ['lib/data/pain-calculator.ts', 'Bocor halus terdeteksi! Gaji lo mulai terancam.', 'Bocor halus terdeteksi. Gaji kamu mulai menipis.'],
  [
    'lib/data/pain-calculator.ts',
    'DARURAT! Gaji lo cuma numpang lewat buat foya-foya gaib.',
    'Gaji kamu hampir habis buat jajan kecil. Masih bisa dirapikan, kok.',
  ],

  /* ── Testimoni landing & copy joint yang masih "lo/gue" ────────────────── */
  ['lib/data/landing.ts', 'Selama ini gue cuma tau', 'Selama ini aku cuma tau'],
  ['lib/data/landing.ts', 'ketahuan gue ngabisin', 'ketahuan aku ngabisin'],
  ['lib/data/landing.ts', 'gak nge-judge', 'gak nyalahin'],
  ['lib/data/landing.ts', 'Gue freelancer', 'Aku freelancer'],
  ['lib/data/landing.ts', 'pertama gue berhasil', 'pertama aku berhasil'],
  ['lib/data/landing.ts', 'Pacar gue juga pake', 'Pacar aku juga pake'],
  [
    'components/catetind/joint-screen.tsx',
    'Pasangan lo belum bisa lihat catatan ini. Gue coba kirim ulang otomatis',
    'Pasangan kamu belum bisa lihat catatan ini. Aku coba kirim ulang otomatis',
  ],
  ['components/catetind/joint-screen.tsx', 'Bukan berarti dompet lo kosong', 'Bukan berarti dompet kamu kosong'],
]

const changed = []
for (const [file, from, to] of EDITS) {
  if (!fs.existsSync(file)) {
    console.error(`✗ berkas tidak ada: ${file}`)
    process.exit(1)
  }
  const before = fs.readFileSync(file, 'utf8')
  if (!before.includes(from)) continue
  const after = before.split(from).join(to)
  fs.writeFileSync(file, after)
  changed.push(`${file}  «${from.slice(0, 48)}» → «${to.slice(0, 48)}»`)
}

console.log(`✓ ${changed.length} penggantian diterapkan (idempoten).`)
for (const line of changed) console.log(`  · ${line}`)
