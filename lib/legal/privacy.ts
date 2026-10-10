/* ── Kebijakan Privasi (/privacy, inventaris #4) · PRD Domain 4C & 5E ──────────
   Halaman ini bukan formalitas. Positioning produk kita adalah "jujur di setiap
   klaim" (PRD 244), dan audiensnya orang yang sudah pernah dikecewakan aplikasi
   keuangan lain — kebijakan yang kabur akan langsung terbaca sebagai "data gue
   dijual". Karena itu isinya SPESIFIK: sebut yang benar-benar dilakukan sistem
   (RLS per akun, admin zero-access, screenshot policy), sebut juga yang memang
   kami kirim ke luar (data ke fitur AI), dan jangan mengklaim yang belum ada.

   Semua kalimat user-facing tinggal di file ini (CONTEXT-WAJIB §4) — legal-shell
   hanya menyusunnya jadi halaman. Tiap bagian punya komentar singkat berisi
   sumber PRD-nya, supaya klaim bisa ditelusuri balik.

   ATURAN ISI:
     1. Spesifik, bukan slogan. "Hanya kamu" harus bisa dijelaskan mekanismenya.
     2. Jujur soal AI. Bagian AI menyebut data apa yang dikirim, untuk apa, kuota,
        dan SAKELAR untuk mematikannya (Settings → AI Preferences).
     3. Tidak melebih-lebih. Tidak ada "enkripsi end-to-end", tidak ada klaim
        sertifikasi, tidak ada nama vendor yang tidak ada di PRD.

   ── REVIEW LEGAL ──────────────────────────────────────────────────────────
   SELURUH TEKS DI FILE INI BELUM LEWAT TINJAUAN HUKUM. Yang perlu diputuskan
   advokat sebelum publikasi: (a) batas usia pengguna, (b) rujukan pasal UU PDP +
   tenggat tanggapan permintaan data, (c) perjanjian pemrosesan data/no-training
   dengan penyedia model bahasa, (d) nama badan hukum + lokasi server. Poin yang
   memang belum bisa dijawab sekarang DITAMPILKAN ke pembaca sebagai kotak
   "REVIEW LEGAL" (`note.tone: 'review'`) — bukan disembunyikan di komentar kode,
   supaya pembaca tahu status dokumen ini apa adanya.
   ────────────────────────────────────────────────────────────────────────── */

import type { LegalDocument } from './types'

/**
 * Tanggal versi DIPATOK sebagai konstanta, sama seperti tanggal mock lain di repo
 * (`TODAY_ISO` di lib/data/*). Tidak memakai `new Date()`: tanggal hidup membuat
 * nilai server & klien berbeda dan memicu hydration mismatch.
 */
export const PRIVACY_UPDATED_ISO = '2026-09-27'
export const PRIVACY_UPDATED_HUMAN = '27 September 2026'
export const PRIVACY_VERSION_LABEL = 'Versi 1.0'

/**
 * Nama dokumen ini hanya boleh ditulis SEKALI. Dipakai di empat tempat: kaki
 * Pusat Bantuan, kartu Dokumen Legal di Pengaturan, kaki `/terms`, dan halaman
 * ini sendiri.
 */
export const PRIVACY_LINK_COPY = {
  label: 'Kebijakan Privasi',
  /** judul kartu di Pengaturan → Keamanan & Privasi */
  cardTitle: 'Dokumen Legal',
  hint: 'Versi tertulis dari janji privasi & aturan layanan yang dipakai seluruh halaman CatetInd.',
  /**
   * Sejak prompt 13 `/terms` sudah terbit, jadi catatan "sedang disiapkan" di
   * sini WAJIB diganti. Isinya sekarang menjelaskan bahwa dua dokumen legal
   * diterbitkan sebagai satu paket — dipakai di kartu Pengaturan dan di kaki
   * KEDUA dokumen (`related.crossNote`), supaya pembaca tidak perlu menebak
   * versi mana yang lebih baru.
   */
  pairNote:
    'Kebijakan Privasi dan Syarat & Ketentuan diperbarui sebagai satu paket — nomor versinya selalu naik bersamaan, jadi tidak akan pernah ada dua janji yang berbeda di antara keduanya.',
} as const

export const PRIVACY_DOC: LegalDocument = {
  eyebrow: 'Legal · CatetInd',
  title: 'Kebijakan Privasi',
  intro: [
    'Halaman ini menjelaskan data apa yang kami simpan, siapa yang bisa melihatnya, dan apa yang bisa kamu lakukan terhadapnya — semuanya sebelum kamu menekan "setuju" pada apa pun.',
    'Kami menulisnya spesifik, bukan dengan kalimat aman yang bisa diartikan apa saja. Kalau ada bagian yang belum bisa kami janjikan, itu kami tandai terang-terangan sebagai belum ditinjau hukum.',
  ],
  updatedLabel: 'Terakhir diperbarui',
  updatedHuman: PRIVACY_UPDATED_HUMAN,
  updatedIso: PRIVACY_UPDATED_ISO,
  versionLabel: PRIVACY_VERSION_LABEL,
  tocLabel: 'Isi dokumen',
  sections: [
    /* ── 1. RINGKASAN — dibaca 30 detik, sebelum orang menyerah membaca ───── */
    {
      id: 'ringkasan',
      title: 'Ringkasan singkat',
      paragraphs: [
        'Kami taruh ringkasannya di depan, karena dokumen legal sepanjang puluhan halaman bukan cara jujur untuk menjelaskan ke mana datamu pergi.',
      ],
      bullets: [
        'Yang kamu catat hanya bisa dibuka oleh akunmu sendiri — bukan admin, bukan founder, bukan tim support.',
        'CatetInd tidak tersambung ke rekening bankmu. Tidak ada bank-sync, tidak ada akses kontak, galeri, atau lokasi.',
        'Fitur AI memang memproses sebagian data keuangmu ke penyedia model bahasa. Kami tulis apa adanya di bagian AI, termasuk cara mematikannya.',
        'Kamu bisa mengekspor seluruh datamu (file JSON) dan menghapus akunmu sendiri, kapan saja, tanpa minta izin ke siapa pun.',
      ],
    },

    /* ── 2. DATA YANG DISIMPAN — inventaris akun PRD 5933 (dua field, nol password) */
    {
      id: 'data-yang-kami-simpan',
      title: 'Data yang kami simpan, dan kenapa',
      paragraphs: [
        'CatetInd adalah aplikasi pencatatan keuangan personal. Isinya berasal dari kamu sendiri: yang kamu ketik, foto struk yang kamu unggah, atau suara yang kamu rekam. Yang tersimpan:',
      ],
      bullets: [
        'Catatan transaksi — nominal, tanggal, jenis, kategori, deskripsi, dan wallet sumbernya.',
        'Dompet & saldo — termasuk catatan Dompet Bersama dan pembagian patungan di dalamnya.',
        'Tagihan rutin, celengan (target tabungan), serta hutang dan investasi yang kamu input sendiri.',
        'Preferensi — kategori custom, pengaturan AI, jam pengingat, dan gaya bicara Minca.',
        'Akun — email dan nama panggilan. Tidak ada password, nomor telepon, alamat, KTP, atau tanggal lahir.',
      ],
      note: {
        label: 'Kenapa kami menyimpannya',
        body: 'Supaya kamu bisa membuka catatanmu dari perangkat lain, dan supaya angka turunannya bisa dihitung: jatah harian, progres celengan, pengingat tagihan, rekap mingguan. Semua angka turunan itu dihitung dari catatan yang sama — tidak ada profil tersembunyi tentang dirimu yang disimpan di tempat lain.',
        tone: 'info',
      },
    },
    /* ── 3. YANG TIDAK DIAMBIL — PRD 7036 (ZERO open banking) & 5025 (DILARANG
       selamanya menjual lead data) ───────────────────────────────────────── */
    {
      id: 'yang-tidak-kami-ambil',
      title: 'Yang tidak kami ambil',
      paragraphs: [
        'Privasi yang jujur bukan cuma soal apa yang disimpan, tapi apa yang memang tidak pernah masuk. Ini yang tidak ada di CatetInd:',
      ],
      bullets: [
        'Tidak ada bank-sync atau open banking. Tidak ada satu pun koneksi ke rekening bank/e-wallet-mu — angka di app ada karena kamu sendiri yang mencatat, memindai struk, atau berbicara.',
        'Tidak ada akses ke kontak, galeri, lokasi, atau SMS. Mikrofon hanya menyala saat kamu sengaja menekan tombol input suara, dan berhenti begitu rekamannya selesai.',
        'Tidak ada pelacak iklan, dan tidak ada iklan di dalam app. Kami tidak membangun profil perilaku untuk dijual ke pengiklan.',
        'Kami tidak menjual, menyewakan, atau mengirimkan data transaksimu ke lembaga keuangan, agen asuransi, atau pihak ketiga mana pun — termasuk dalam bentuk lead.',
        'Tidak ada langganan yang menagih otomatis di belakangmu: perpanjangan selalu kamu yang menekan.',
      ],
      note: {
        label: 'Kalau nanti ada fitur yang butuh izin baru',
        body: 'Misalnya kamera untuk memindai struk. Izinnya diminta lewat dialog sistem, hanya aktif saat fitur itu dipakai, dan halaman ini diperbarui lebih dulu sebelum fiturnya rilis.',
        tone: 'info',
      },
    },

    /* ── 4. SIAPA YANG BISA MELIHAT — tulang punggung klaim privasi:
       RLS single user (PRD 3079–3131), admin ZERO individual access
       (PRD 3353–3433), lapisan privasi joint wallet (PRD 2D.1) ──────────── */
    {
      id: 'siapa-yang-bisa-melihat',
      title: 'Siapa yang bisa melihat data kamu',
      paragraphs: [
        'Jawaban singkatnya: cuma kamu.',
        'Batasnya bukan di tampilan, tapi di lapisan basis data (row-level security). Setiap baris transaksi terikat ke satu akun, dan permintaan yang datang dari akun lain tidak akan pernah mengembalikannya. Tidak ada panel admin yang bisa membuka batas itu — karena panelnya memang tidak dibuat.',
        'Tim CatetInd, termasuk founder, tidak punya endpoint atau halaman admin untuk membaca data individualmu. Yang tersedia untuk tim hanya statistik agregat tanpa identitas, misalnya "berapa banyak orang memakai fitur Budget bulan ini". Untuk bisa membaca data individual, kami harus menulis kebijakan akses baru, membuat endpoint baru, mengubah halaman ini lebih dulu, dan mengulang audit keamanan — bukan sekadar menyalakan sakelar.',
      ],
      bullets: [
        'Dompet Bersama punya lapisan privasi sendiri: pasanganmu hanya melihat transaksi yang dicatat di wallet bersama itu, dan wallet pribadimu tidak ikut terlihat saat kamu berpindah konteks.',
        'Transaksi yang kamu tandai privat tidak ditampilkan ke pasanganmu — bahkan tidak ada tanda bahwa transaksi itu ada.',
        'Sensor layar (ikon mata) menyembunyikan semua nominal di layar. Itu kontrol tampilan di perangkatmu sendiri, bukan fitur berbagi.',
      ],
      note: {
        label: 'Konsekuensinya kami tanggung',
        body: 'Kalau kamu pernah pakai layanan yang CS-nya bisa "bantu cek transaksimu", artinya manusia di sana memang bisa membacanya. Di CatetInd tidak bisa — dan itu keputusan sadar (PRD Domain 8): kami menukar kemudahan support dengan jaminan bahwa tidak ada satu pun orang di sini yang bisa melihat catatanmu.',
        tone: 'info',
      },
    },
    /* ── 5. BANTUAN TANPA AKSES — PRD 3435–3504: Export Data Saya, Screenshot
       Policy, error telemetry tanpa PII ──────────────────────────────────── */
    {
      id: 'bantuan-tanpa-akses',
      title: 'Kalau kamu butuh bantuan, padahal kami tidak bisa melihat datamu',
      paragraphs: [
        'Ini konsekuensi nyata dari bagian sebelumnya, jadi kami jelaskan cara kerjanya — bukan cuma menjanjikan. Ada empat jalur, dan semuanya bertumpu pada datamu sendiri:',
      ],
      bullets: [
        'Export Data Saya (Pengaturan → Export Data Saya) — seluruh catatanmu (transaksi, dompet, tagihan, celengan, hutang) dikompilasi menjadi file JSON dan dikirim ke emailmu sendiri. Kalau kamu mau memperlihatkan sebagiannya ke kami, kamu yang memilih bagiannya.',
        'Screenshot policy — untuk masalah tampilan atau dugaan bug, sertakan screenshot layar yang bermasalah. Kami menelusuri masalahnya dari gambar yang kamu kirim sendiri, bukan dari data di server.',
        'Laporan error tanpa identitas — saat terjadi error, yang tercatat hanya kode error dan berapa kali dicoba. Tidak ada nominal, nama merchant, kategori, atau identitasmu di dalamnya.',
        'Pintu masuk bantuan — buka Pusat Bantuan, pilih artikel mana pun, lalu tekan 👎 di kakinya untuk mengirim pesan ke founder. Untuk masalah di Dompet Bersama, minta pasanganmu mengirim screenshot bagian miliknya sendiri — kami memang tidak bisa mengambilnya dari sini.',
      ],
      note: {
        label: 'Kalau masalahnya menyangkut isi catatanmu',
        body: 'Kamu bisa mengirim file export ke email support supaya kami bisa membedah masalahnya bersama-sama. File itu ada di tanganmu; kami tidak punya salinannya sampai kamu mengirimnya sendiri.',
        tone: 'info',
      },
    },

    /* ── 6a. AI: DATA YANG DIPROSES — PRD Domain 4B (satu provider DeepSeek
       untuk teks & gambar + konteks yang dikirim tiap request) ──────────── */
    {
      id: 'ai-data',
      title: 'Fitur AI: data apa yang diproses',
      paragraphs: [
        'CatetInd punya Minca, AI Coach yang membantu kategorisasi, merapikan nama transaksi, membaca struk, dan menemani review keuanganmu. Supaya itu bekerja, sebagian data harus diproses oleh penyedia model bahasa — dan kami sebut apa adanya:',
      ],
      bullets: [
        'Kategorisasi & penamaan otomatis — teks yang kamu tulis di transaksi (misal "indmrt 24rb") dikirim untuk ditebak kategorinya dan dirapikan namanya.',
        'Chat & coaching — pertanyaanmu beserta ringkasan angka yang relevan dengan pertanyaannya: pemasukan bulan ini, kategori terbesar, sisa jatah harian, progres celengan, cicilan aktif. Bukan seluruh riwayat transaksimu, dan bukan data wallet milik orang lain.',
        'Scan struk — foto struk yang kamu unggah, untuk dibaca menjadi baris transaksi.',
        'Input suara — ucapanmu diubah menjadi teks lebih dulu, lalu teks itulah yang diproses untuk menyusun baris transaksinya.',
      ],
      note: {
        label: 'REVIEW LEGAL — masa simpan di sisi penyedia model',
        body: 'Kami belum menandatangani perjanjian pemrosesan data dengan penyedia model bahasa, jadi belum bisa menjanjikan berapa lama data bertahan di sana atau menegaskan bahwa data itu tidak dipakai untuk pelatihan model. Kami menuliskannya di sini daripada mengklaim sesuatu yang belum ada kesepakatannya.',
        tone: 'review',
      },
    },

    /* ── 6b. KUOTA & SAKELAR AI — PRD 5C (reset tanggal 1, add-on tidak hangus)
       + panel AI Preferences yang sudah ada di Settings ─────────────────── */
    {
      id: 'ai-kontrol',
      title: 'Kuota AI & cara mematikannya',
      paragraphs: [
        'Pemakaian AI dihitung dengan kuota token bulanan yang di-reset setiap tanggal 1. Paket token tambahan yang kamu beli berlaku sampai habis — tidak hangus saat bulan berganti. Kalau kuotanya habis, fitur AI berhenti sampai kamu isi ulang atau bulan berganti; pencatatan manual tetap jalan normal tanpa batas.',
        'Semua yang berjalan otomatis bisa dimatikan di Pengaturan → AI Preferences, lewat sakelar "Kategorisasi Otomatis oleh AI" dan "Penamaan Otomatis Transaksi". Kalau keduanya kamu matikan, teks transaksimu tidak dikirim untuk dua tugas itu — kamu yang memilih kategorinya sendiri.',
        'Chat AI tidak pernah berjalan sendiri: ia memproses saat kamu mengirim pesan, dan berhenti kalau kamu berhenti memakainya. Kamu juga bisa mengatur gaya bicara Minca di halaman yang sama, tanpa memengaruhi data apa pun.',
      ],
      note: {
        label: 'AI kami bukan penasihat keuangan',
        body: 'Jawaban yang menyentuh topik sensitif (investasi, hutang, asuransi) selalu ditutup dengan pengingat bahwa itu informasi edukatif, bukan saran profesional (PRD 5E). Untuk keputusan yang lebih spesifik, kami menganjurkan konsultasi ke perencana keuangan bersertifikat (CFP).',
        tone: 'info',
      },
    },
    /* ── 7. PIHAK KETIGA — nama vendor HANYA yang ada di PRD: Supabase & Vercel
       (PRD 4693–4694), DeepSeek (PRD 2785), Midtrans (PRD 5974), Resend
       (PRD 3471) ─────────────────────────────────────────────────────────── */
    {
      id: 'pihak-ketiga',
      title: 'Pihak ketiga yang ikut bekerja',
      paragraphs: [
        'Aplikasi ini tidak jalan sendiri. Berikut pihak yang menyentuh data, beserta perannya masing-masing — tidak ada yang lebih luas dari yang tertulis di sini:',
      ],
      bullets: [
        'Basis data & autentikasi (Supabase) — menyimpan akun dan catatanmu, sekaligus menegakkan aturan akses per akun di sisi basis data. Tautan masuk ke email juga lewat layanan ini.',
        'Penyedia model bahasa (DeepSeek — teks & gambar, termasuk membaca foto struk) — memproses teks atau foto hanya untuk tugas yang kamu picu, lalu mengembalikan hasilnya ke CatetInd.',
        'Pembayaran (Midtrans) — memproses pembayaran langganan dan paket token. Data kartu/e-wallet-mu diproses langsung di Midtrans, bukan di CatetInd: kami tidak pernah menyimpan detail pembayaranmu.',
        'Email transaksional (Resend) — mengirim tautan masuk, struk pembayaran, dan file export data ke alamatmu sendiri.',
        'Hosting & analitik dasar (Vercel) — menjalankan aplikasinya dan menghitung jumlah kunjungan tanpa cookie iklan dan tanpa identitasmu.',
        'Kalau nanti ada pihak baru, namanya masuk ke daftar ini sebelum dipakai — bukan sesudah.',
      ],
      note: {
        label: 'REVIEW LEGAL — detail vendor belum dikunci',
        body: 'Daftar di atas berasal dari rencana teknis produk dan belum dilengkapi perjanjian pemrosesan data. Nama badan hukum resmi, lokasi server, dan mekanisme pemindahan data antar-negara belum ditetapkan, jadi semuanya masih perlu dikonfirmasi sebelum halaman ini dinyatakan final.',
        tone: 'review',
      },
    },

    /* ── 8. HAK KAMU — semua jalurnya SUDAH ada di repo: /settings/data,
       /settings/security, /settings/ai, /help. Tidak ada janji kosong. ──── */
    {
      id: 'hak-kamu',
      title: 'Hak kamu atas datamu',
      paragraphs: [
        'Kamu tidak perlu meminta izin untuk mengurus datamu sendiri. Semua ini bisa kamu pakai langsung dari dalam app:',
      ],
      bullets: [
        'Melihat & mengekspor — Pengaturan → "Export Data Saya" mengirim seluruh catatanmu sebagai file JSON ke emailmu sendiri.',
        'Membetulkan — setiap catatan bisa diedit atau dihapus sendiri: transaksi lewat geser pada barisnya, tagihan dan celengan lewat tombol edit di halamannya.',
        'Menghapus akun — Pengaturan → Keamanan & Privasi → "Hapus Akun Permanen". Konfirmasinya dengan mengetik emailmu, dan seluruh transaksi, dompet, budget, serta hutang ikut terhapus.',
        'Mengatur AI & notifikasi — AI Preferences dan pengaturan Notifikasi bisa dimatikan kapan saja tanpa kehilangan data.',
        'Bertanya soal data — lewat Pusat Bantuan ke founder, atau email ke support@catetind.com.',
      ],
      note: {
        label: 'REVIEW LEGAL — rujukan pasal & tenggat tanggapan',
        body: 'Hak-hak ini mengikuti UU Perlindungan Data Pribadi. Rujukan pasalnya dan tenggat tanggapan permintaan (misalnya jumlah hari kerja) belum dicantumkan menunggu tinjauan hukum — kami tidak mau menulis tenggat yang belum tentu bisa kami penuhi.',
        tone: 'review',
      },
    },
    /* ── 9. ANAK DI BAWAH UMUR ────────────────────────────────────────────── */
    {
      id: 'anak',
      title: 'Anak di bawah umur',
      paragraphs: [
        'CatetInd dibuat untuk orang yang sudah mengelola uangnya sendiri, dan produknya tidak menyasar anak-anak: tidak ada fitur yang memerlukan data anak, tidak ada uang jajan, tidak ada mode khusus anak.',
        'Kami tidak mengumpulkan data anak dengan sengaja. Kalau kamu tahu ada akun yang dibuat oleh anak di bawah umur, beri tahu kami lewat Pusat Bantuan — akun dan seluruh datanya akan kami hapus.',
      ],
      note: {
        label: 'REVIEW LEGAL — batas usia minimum',
        body: 'Angka pastinya (18 tahun, atau 17 tahun dengan izin orang tua) beserta kalimat izin orang tua belum ditetapkan, jadi belum kami tulis di sini. Menunggu keputusan hukum supaya tidak ada aturan yang tampak tegas tapi tidak dijalankan.',
        tone: 'review',
      },
    },

    /* ── 10. PERUBAHAN KEBIJAKAN ──────────────────────────────────────────── */
    {
      id: 'perubahan',
      title: 'Kalau kebijakan ini berubah',
      paragraphs: [
        'Halaman ini punya nomor versi dan tanggal di bagian atas. Setiap kali isinya berubah, keduanya ikut naik — jadi kamu selalu bisa tahu versi mana yang sedang berlaku dan sejak kapan.',
      ],
      bullets: [
        'Perubahan yang memengaruhi caramu memakai app — misalnya jenis data baru yang dikumpulkan atau pemrosesan AI yang baru — kami beri tahu lewat notifikasi di app dan email sebelum berlaku, bukan sesudah.',
        'Perubahan kecil (perbaikan kalimat, tambahan contoh) tidak perlu notifikasi, tapi nomor versinya tetap naik supaya riwayatnya bisa ditelusuri.',
        'Versi yang berlaku adalah yang tampil di halaman ini; salinan yang tersebar di tempat lain bukan acuan.',
        'Kalau kamu tidak setuju dengan versi barunya, kamu selalu bisa mengekspor datamu lalu menghapus akunmu — tanpa perlu alasan dan tanpa perlu menghubungi kami.',
      ],
    },

    /* ── 11. KONTAK ───────────────────────────────────────────────────────── */
    {
      id: 'kontak',
      title: 'Kontak',
      paragraphs: [
        'Pertanyaan, keberatan, atau permintaan soal datamu bisa mulai dari Pusat Bantuan: buka artikel mana pun, tekan 👎 di kakinya, lalu kirim pesan. Balasan datang dari manusia — langsung dari founder, bukan bot dan bukan tiket yang mengantre.',
        'Kalau lebih nyaman lewat email, kirim ke support@catetind.com — sertakan screenshot untuk masalah tampilan, karena kami memang tidak bisa membuka datamu untuk mengeceknya sendiri.',
      ],
    },
  ],

  /* ── KAKI DOKUMEN ─────────────────────────────────────────────────────────
     Tiga hal yang harus jujur di sini: (1) status hukumnya, (2) bahwa build ini
     masih demo, (3) tautan ke halaman yang BENAR-BENAR ada di repo. */
  reviewNote: {
    label: 'REVIEW LEGAL — belum lewat tinjauan hukum',
    body: 'CatetInd masih di tahap awal dan dokumen ini disusun oleh tim produk, bukan advokat. Teks final menunggu tinjauan hukum; tanggal dan nomor versi di atas diperbarui setiap kali isinya berubah, jadi kamu bisa tahu versi mana yang sedang berlaku.',
    tone: 'review',
  },
  demoNote:
    'Catatan build demo: versi CatetInd yang sedang kamu buka adalah prototipe desain. Seluruh isinya masih contoh, belum tersambung ke basis data, dan belum ada satu pun permintaan yang benar-benar dikirim ke penyedia model AI. Bagian-bagian di atas menjelaskan cara kerja versi produksinya.',
  related: {
    title: 'Lihat juga',
    links: [
      {
        /* dokumen kembarnya, prompt 13 — sekarang route-nya ada, jadi boleh
           ditautkan (sebelumnya hanya disebut sebagai "menyusul") */
        href: '/terms',
        label: 'Syarat & Ketentuan',
        desc: 'Aturan main layanan ini: batas AI Coach, cara kerja langganan, dan kuota token.',
      },
      {
        href: '/help',
        label: 'Pusat Bantuan',
        desc: 'Cari jawaban pakai bahasa sehari-hari, atau kirim pesan langsung ke founder.',
      },
      {
        href: '/settings/data',
        label: 'Export Data Saya',
        desc: 'Kompilasi seluruh catatanmu jadi file JSON dan kirim ke emailmu sendiri.',
      },
      {
        href: '/settings/security',
        label: 'Keamanan & Privasi',
        desc: 'Kunci app dengan PIN atau biometrik, dan hapus akun kalau kamu mau pergi.',
      },
    ],
    crossNote: PRIVACY_LINK_COPY.pairNote,
  },
  /* Disclaimer wajib PRD 5E (footer): satu baris, tanpa nada menakut-nakuti */
  disclaimer:
    'CatetInd adalah aplikasi pencatatan keuangan personal. Bukan penasihat investasi terdaftar OJK.',
}
