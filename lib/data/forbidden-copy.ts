/* ── DAFTAR TEKS TERLARANG (54 butir keputusan produk) ──────────────────────────
   Satu sumber kebenaran untuk "operasi sapu bersih teks". Dipakai oleh:
     · lib/data/copy-cleanliness.test.ts  → penjaga otomatis di unit test
     · scripts/tools/audit-copy.mjs       → audit manual / CI
   Berkas ini SENGAJA memuat kalimat terlarang, jadi berkas ini dilewati saat
   penyisiran. Kalau kalimat ini muncul di app/components/lib (selain di sini),
   berarti teks lama bocor kembali ke layar dan harus dihapus. */

export const FORBIDDEN_COPY: readonly string[] = [
  // 1
  'Seluruh catatan bareng di dalamnya ikut terhapus',
  // 2
  'Kalau kamu cuma mau berhenti ikut, pakai "Keluar"',
  // 3 — blok skala di halaman Riwayat (label + seluruh variasi angkanya)
  '> Rp 28.520',
  '< Rp 13.800',
  'Rp 13.800–Rp 28.520',
  'Rp 13.800-Rp 28.520',
  '13.800',
  '28.520',
  // 4
  'Ubah yang keliru aja, sisanya tetap seperti semula.',
  // 5
  'Perubahan langsung tampil di riwayat, total harian, dan dompetnya.',
  // 6
  'Minca sedang menyelaraskan polamu',
  // 7
  'transaksi lagi buat kalibrasi profilmu',
  // 8
  'Aku masih belajar polamu',
  // 9
  'Total Saldo = semua dompet',
  'Dompet Pribadi: Rp',
  // 10
  'Belum punya impian yang ditabung?',
  // 11
  'Belum ada budget di periode ini',
  // 12
  'Perkiraan aja dulu, limitnya bisa diubah kapan pun kok.',
  // 13
  'Kos, langganan, cicilan, catat biar jatah harianmu lebih akurat.',
  // 14
  'Cukup nama & tanggal jatuh tempo dulu',
  // 15
  '(Opsional, kosongkan kalau nominalnya berubah-ubah)',
  'kosongkan kalau nominalnya berubah-ubah',
  // 16
  'tagihan belum lunas Total Rp',
  'tagihan belum lunas',
  // 17
  'Catat pengeluaran atau pemasukan di tanggal yang kamu pilih',
  // 18
  'Dompet baru langsung bisa jadi tujuan pindah dana.',
  // 19
  'Pindah dana butuh minimal dua dompet',
  // 20
  'Bukan buat gaya-gayaan',
  // 21
  'Saham, reksadana, crypto, emas, catat di sini agar Net Worth akurat.',
  // 22
  'Catat rumah, kendaraan, atau barang berharga biar Total Kekayaan akurat.',
  // 23
  'Uang masuk ke kas bersama, tidak menambah utang siapa pun.',
  // 24
  'Dua saldo ikut menyesuaikan sekaligus, nggak ada yang dobel.',
  // 25
  'Biar nyatet pengeluaran secepat buka Instagram.',
  // 26
  'Tekan Enter buat simpan',
  // 27
  'Gak perlu persis, dan boleh dikosongkan',
  // 28
  'Pilih satu dulu biar transaksi pertamamu punya tempat menempel.',
  // 29
  'Setiap kali kamu catat, tanamanmu akan tumbuh',
  // 30
  'belum pakai model',
  // 31
  'Tambah napas AI biar pencatatanmu tetap otomatis',
  // 32
  'Kuota dasar berlaku sekali di bulan pertama',
  // 33
  'Menu Pengaturan',
  // 34
  'Nama & email yang dipakai akun ini.',
  // 35
  'Nama ini yang menyapa kamu di Dashboard',
  // 36
  'Hubungi support untuk ganti email.',
  // 37
  'Ini menentukan kapan dashboard dan kalender kamu di-reset',
  // 38
  'Isi gaji bulanan kamu supaya Jatah Hari Ini bisa dihitung akurat.',
  // 39
  'Cicilan platform (HP, paylater, motor)',
  // 40
  'Matikan konteks yang ngga kamu pakai',
  // 41
  'Kode undangannya cuma berlaku 24 jam',
  // 42
  'Paket yang kamu miliki, fitur yang terbuka',
  // 43
  'Akses selamanya. Sekali bayar, tanpa tagihan berkala',
  'Lifetime tidak perlu diperpanjang.',
  // 44
  'Semua transaksi kamu tercatat rapi di sini.',
  // 45
  'Simpan kategori tambahanmu di perangkat ini',
  // 46
  'Cuma bisa disembunyikan, nggak bisa dihapus',
  // 47
  'Bikin, ubah, hapus sesuka kamu, tidak ada yang dikunci.',
  // 48
  'Catatan: daftar ini tersimpan di perangkat ini',
  // 49
  'Atur seberapa jauh Minca boleh bantu',
  'Status AI hari ini',
  'Tersambung ke model',
  'Minca berjalan lewat Minca Engine v1',
  'Yang selalu jalan: catat transaksi manual',
  'Khusus scan struk & input suara',
  'Catatan yang kamu input manual selalu pakai kategori',
  'Nentuin nada Minca waktu nemenin',
  // 50
  'Push notif muncul di HP walau app lagi ditutup',
  'CatetInd kirim MAKSIMAL 3 push per minggu',
  'Pilih yang penting buat kamu, sisanya kita gak ganggu.',
  'Pengingat tagihan, rekap mingguan, dan info paketmu bakal muncul di sini',
  // 51
  'Kunci app di perangkat ini, plus jalan keluar yang jelas',
  'Semua data di perangkat ini dihapus, dan nggak ada salinan di tempat lain.',
  'Menghapus SEMUA datamu di perangkat ini. Nggak bisa dibatalkan.',
  'Versi tertulis dari janji privasi & aturan layanan',
  'Kebijakan Privasi dan Syarat & Ketentuan diperbarui sebagai satu paket',
  'Unduh seluruh catatanmu sebagai satu file JSON.',
  // 52
  'Cek inbox',
  'Tautan konfirmasi sudah dikirim ke emailmu',
  'Kami kirim tautan masuk & kode 6 angka ke email ini:',
  // 53
  '+100 Nyawa AI & Skin Emas otomatis masuk',
] as const

/** Berkas yang boleh memuat teks di atas (daftar + penjaga + audit). */
export const FORBIDDEN_COPY_SELF = 'forbidden-copy.ts'
