/* ── Keamanan Data (/security) · halaman PUBLIK ──────────────────────────────
   Ringkasan keamanan dalam bahasa manusia, bukan halaman marketing. Isinya
   hanya hal yang benar-benar ada di sistem dan halaman lain di repo:

     · tanpa bank-sync / open banking  → lib/legal/privacy.ts
     · RLS per akun + admin zero access → lib/legal/privacy.ts
     · kunci app PIN/biometrik          → /settings/security
     · export & hapus akun              → /settings/data
     · preferensi AI                    → /settings/ai
     · pembayaran via Midtrans          → /checkout + lib/data/pricing.ts

   Sama seperti dua dokumen legal lain, teks ini BELUM lewat tinjauan hukum.
   Bentuk datanya memakai `LegalDocument`, jadi `LegalShell` bisa menyusunnya
   tanpa cabang khusus. Tanggal sengaja statis (bukan `new Date()`) supaya
   server & klien merender nilai yang sama. */

import type { LegalDocument } from './types'

export const SECURITY_UPDATED_ISO = '2026-10-18'
export const SECURITY_UPDATED_HUMAN = '18 Oktober 2026'
export const SECURITY_VERSION_LABEL = 'Versi 1.0'

export const SECURITY_DOC: LegalDocument = {
  eyebrow: 'Legal · CatetInd',
  title: 'Keamanan Data',
  intro: [
    'Cara CatetInd menjaga catatan keuanganmu: tanpa akses rekening bank, tanpa panel admin yang bisa membaca data pribadi, dan tanpa penjualan data.',
  ],
  updatedLabel: 'Terakhir diperbarui',
  updatedHuman: SECURITY_UPDATED_HUMAN,
  updatedIso: SECURITY_UPDATED_ISO,
  versionLabel: SECURITY_VERSION_LABEL,
  tocLabel: 'Isi dokumen',
  homeLabel: 'Balik ke halaman depan CatetInd',
  sections: [
    {
      id: 'ringkasan',
      title: 'Ringkasan singkat',
      paragraphs: [
        'Keamanan di CatetInd dibangun dari tiga hal yang bisa kamu periksa sendiri: data dipisahkan per akun, akses ke rekening bank tidak pernah diminta, dan seluruh data bisa kamu ekspor atau hapus sendiri.',
      ],
      bullets: [
        'Catatanmu hanya bisa dibuka oleh akun yang membuatnya.',
        'Tidak ada koneksi ke rekening bank, e-wallet, SMS, kontak, atau lokasi.',
        'Tidak ada panel admin untuk membaca data individual pengguna.',
        'Kamu bisa mengunci app dengan PIN atau biometrik di perangkatmu.',
      ],
    },
    {
      id: 'tanpa-akses-rekening',
      title: 'Tanpa akses rekening bank',
      paragraphs: [
        'CatetInd tidak memakai bank-sync atau open banking. Kami tidak pernah meminta kredensial m-Banking, PIN, OTP, atau nomor kartu. Semua catatan berasal dari yang kamu ketik sendiri, struk yang kamu foto, atau suara yang kamu rekam.',
        'Karena tidak ada koneksi rekening, tidak ada juga pembacaan saldo otomatis di belakang layar. Angka yang tampil adalah angka yang kamu catat atau setujui sendiri.',
      ],
      note: {
        label: 'Kenapa ini disengaja',
        body: 'Akses rekening berarti kredensial perbankanmu berpindah ke pihak ketiga. Kami memilih jalur yang lebih sempit: input manual, scan struk, dan voice input. Lebih lambat sedikit, tetapi tidak ada akses perbankan yang harus dipercayakan.',
        tone: 'info',
      },
    },
    {
      id: 'pemisahan-data',
      title: 'Data dipisahkan per akun',
      paragraphs: [
        'Batas antar akun dijaga di lapisan basis data dengan row-level security. Setiap baris transaksi, dompet, budget, dan tagihan terikat ke satu akun; permintaan dari akun lain tidak akan mengembalikannya.',
        'Tim CatetInd, termasuk founder, tidak memiliki halaman atau endpoint admin untuk membuka data individual. Statistik yang tersedia untuk tim bersifat agregat dan tanpa identitas.',
      ],
      bullets: [
        'Dompet Bersama hanya memperlihatkan transaksi yang memang dicatat di wallet bersama.',
        'Transaksi privat tidak ditampilkan ke pasangan, termasuk keberadaannya.',
        'Sensor nominal di layar adalah kontrol tampilan di perangkatmu, bukan fitur berbagi.',
      ],
    },
    {
      id: 'kunci-app',
      title: 'Kunci app di perangkat',
      paragraphs: [
        'Kamu bisa mengaktifkan kunci app lewat Pengaturan → Keamanan & Privasi. Pilih PIN atau biometrik yang tersedia di perangkat. Kunci ini melindungi app saat perangkat berpindah tangan, dan bisa dimatikan lagi kapan pun oleh pemilik akun.',
        'Kunci app bukan enkripsi tambahan di server. Fungsinya mencegah orang lain membuka CatetInd di perangkat yang sama tanpa izinmu.',
      ],
    },
    {
      id: 'pembayaran',
      title: 'Pembayaran tanpa menyimpan kartu',
      paragraphs: [
        'Pembayaran paket diproses oleh Midtrans sebagai payment gateway. Data kartu atau e-wallet diproses di sisi Midtrans, bukan disimpan sebagai data bebas di CatetInd.',
        'Paket dijual sekali bayar untuk akses selamanya. Tidak ada auto-debit, tidak ada token kartu yang disimpan untuk penagihan berulang, dan tidak ada biaya tersembunyi.',
      ],
    },
    {
      id: 'data-ai',
      title: 'Data saat memakai fitur AI',
      paragraphs: [
        'Fitur AI hanya bekerja saat kamu memakainya. Data yang dikirim adalah konteks yang dibutuhkan untuk menjawab permintaan itu, bukan seluruh isi akunmu.',
        'Kamu bisa mengatur preferensi AI kapan saja di Pengaturan → AI Preferences. Mematikan fitur AI tidak menghapus catatan keuanganmu.',
      ],
    },
    {
      id: 'kontrol-data',
      title: 'Ekspor dan hapus data',
      paragraphs: [
        'Pengaturan → Export Data Saya mengompilasi transaksi, dompet, tagihan, celengan, dan hutangmu menjadi file JSON yang dikirim ke emailmu sendiri.',
        'Pengaturan → Keamanan & Privasi menyediakan Hapus Akun Permanen. Konfirmasi dilakukan dengan mengetik email, lalu seluruh catatan yang terikat ke akun itu ikut terhapus.',
      ],
    },
    {
      id: 'melaporkan',
      title: 'Melaporkan masalah keamanan',
      paragraphs: [
        'Kalau kamu menemukan celah atau perilaku yang mencurigakan, kirim detailnya ke halo@catetind.com. Sertakan langkah yang bisa kami ulangi; jangan kirim data keuangan pribadi yang tidak diperlukan.',
        'Kami akan mengonfirmasi penerimaan laporan, menelusuri dampaknya, dan memberi tahu kamu begitu ada perbaikan yang perlu kamu ketahui.',
      ],
    },
  ],
  reviewNote: {
    label: 'REVIEW LEGAL — belum lewat tinjauan hukum',
    body: 'Halaman ini disusun oleh tim produk, bukan advokat. Teks final menunggu tinjauan hukum; tanggal dan nomor versi diperbarui setiap kali isinya berubah.',
    tone: 'review',
  },
  demoNote:
    'Catatan build demo: versi CatetInd yang sedang kamu buka adalah prototipe desain. Sebagian alur masih memakai data contoh, dan penjelasan di atas menggambarkan cara kerja versi produksi.',
  related: {
    title: 'Lihat juga',
    links: [
      {
        href: '/privacy',
        label: 'Kebijakan Privasi',
        desc: 'Data apa yang disimpan, siapa yang bisa melihatnya, dan cara mengekspor atau menghapusnya.',
      },
      {
        href: '/terms',
        label: 'Syarat & Ketentuan',
        desc: 'Aturan main layanan: batas AI Coach, paket akses selamanya, dan kuota token.',
      },
      {
        href: '/settings/security',
        label: 'Keamanan & Privasi',
        desc: 'Kunci app dengan PIN atau biometrik, dan hapus akun kalau kamu mau pergi.',
      },
    ],
    crossNote:
      'Kebijakan Privasi, Syarat & Ketentuan, dan halaman Keamanan Data diperbarui sebagai satu paket — nomor versinya naik bersamaan supaya tidak ada janji yang berbeda di antara ketiganya.',
  },
  disclaimer:
    'CatetInd adalah aplikasi pencatatan keuangan pribadi & budgeting harian. Minca AI bukan penasihat keuangan berlisensi atau anjuran investasi resmi.',
}

