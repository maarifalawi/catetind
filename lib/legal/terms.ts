/* ── Syarat & Ketentuan (/terms, inventaris #5) · PRD Domain 5E & 5A ──────────
   Dokumen kembar `lib/legal/privacy.ts`. Bentuk datanya SAMA (`LegalDocument`)
   supaya `/privacy` dan `/terms` tidak pernah tampil sebagai dua desain
   berbeda — keduanya disusun oleh `components/catetind/legal-shell.tsx` yang
   sama, dan sengaja tidak ada satu pun warna/layout yang ditulis di file ini.

   Kenapa halaman ini ada (bukan formalitas): positioning produk kita adalah
   "jujur di setiap klaim" (PRD 244), dan audiensnya orang yang sudah skeptis
   pada produk finansial. ToS ini adalah janji anti-dark-pattern yang ditulis
   resmi — tanpa auto-renew, tanpa harga yang berubah diam-diam, tanpa data
   yang hilang karena langganan habis.

   ATURAN ISI:
     1. Yang WAJIB PERSIS dari PRD ditulis persis (lihat penanda "verbatim" di
        tiap bagian) — terutama 4 poin "CatetInd BUKAN" (PRD 5085–5089), karena
        itulah batas legalnya terhadap OJK.
     2. Angka ditulis dalam bahasa manusia, tidak disembunyikan: grace period,
        siklus reset kuota, dan aturan token add-on disebut terang-terangan.
     3. Nominal harga TIDAK ditulis di sini. Satu-satunya sumber harga app ini
        adalah `lib/data/pricing.ts` (dipakai /checkout & /settings/billing),
        jadi menyalin angkanya ke dokumen ini cuma menciptakan daftar harga
        kedua yang bisa basi. Yang ditulis adalah ATURANNYA (satu harga per
        paket, tahunan = bayar 8 bulan, tanpa biaya tersembunyi).
     4. Yang tidak ada di PRD TIDAK dikarang — ditandai kotak `tone: 'review'`
        (`REVIEW LEGAL`) yang terbaca user, bukan disembunyikan di komentar.

   ── REVIEW LEGAL ──────────────────────────────────────────────────────────
   SELURUH TEKS DI FILE INI BELUM LEWAT TINJAUAN HUKUM. Yang perlu diputuskan
   advokat sebelum publikasi: (a) rumusan batas tanggung jawab/ganti rugi,
   (b) sanksi untuk pelanggaran aturan akun, (c) badan hukum + pengadilan yang
   berwenang, (d) cakupan garansi uang kembali untuk token add-on yang sudah
   terpakai sebagian. Poin yang memang belum bisa dijawab sekarang DITAMPILKAN
   ke pembaca sebagai kotak "REVIEW LEGAL" (`note.tone: 'review'`).

   ── CATATAN BAHASA (penting, jangan "diperbaiki") ─────────────────────────
   Kata "saran" dan "rekomendasi" HANYA boleh muncul di dalam kalimat
   PENYANGKALAN yang diminta verbatim oleh PRD 5091–5094 & 5106–5114
   ("BUKAN merupakan saran keuangan…", "❌ Memberikan saran investasi
   spesifik"). Di luar kutipan itu, semua deskripsi kemampuan AI memakai
   "insight/informasi" — kanon copy PRD 5033–5040 & CONTEXT-WAJIB §5.6.
   ────────────────────────────────────────────────────────────────────────── */

import type { LegalDocument } from './types'

/**
 * Tanggal versi DIPATOK sebagai konstanta, sama seperti tanggal mock lain di
 * repo (`TODAY_ISO` di lib/data/*). Bukan `new Date()`: tanggal hidup membuat
 * nilai server & klien berbeda dan memicu hydration mismatch.
 *
 * Sengaja sama dengan `PRIVACY_UPDATED_ISO`: kedua dokumen diterbitkan sebagai
 * satu paket (janji di kaki dokumen), jadi versi 1.0 keduanya berlaku serentak.
 */
export const TERMS_UPDATED_ISO = '2026-09-27'
export const TERMS_UPDATED_HUMAN = '27 September 2026'
export const TERMS_VERSION_LABEL = 'Versi 1.0'

/**
 * Nama dokumen ini hanya ditulis SEKALI di sini. Dipakai kaki Pusat Bantuan,
 * kartu "Dokumen Legal" di Pengaturan, dan kaki `/privacy` (sebagai dokumen
 * kembarnya) — supaya satu dokumen tidak pernah disebut dengan dua nama.
 */
export const TERMS_LINK_COPY = {
  label: 'Syarat & Ketentuan',
  hint: 'Aturan main layanan ini: batas AI Coach, cara kerja langganan, dan apa yang tetap jadi milikmu.',
} as const

export const TERMS_DOC: LegalDocument = {
  eyebrow: 'Legal · CatetInd',
  title: 'Syarat & Ketentuan',
  intro: [
    'Halaman ini aturan main memakai CatetInd: apa yang layanan ini lakukan, apa yang sengaja TIDAK dilakukannya, dan apa yang tetap jadi milikmu. Kami menulisnya dengan bahasa manusia, termasuk bagian yang biasanya disembunyikan di huruf kecil.',
    'Kalau kamu hanya punya waktu satu menit, baca bagian Ringkasan di bawah. Sisanya adalah penjelasan lengkap untuk tiap janji — plus tanda jujur di bagian mana yang masih menunggu tinjauan hukum.',
  ],
  updatedLabel: 'Terakhir diperbarui',
  updatedHuman: TERMS_UPDATED_HUMAN,
  updatedIso: TERMS_UPDATED_ISO,
  versionLabel: TERMS_VERSION_LABEL,
  tocLabel: 'Isi dokumen',
  sections: [
    /* ── 1. RINGKASAN BAHASA MANUSIA (wajib dibaca) ───────────────────────── */
    {
      id: 'ringkasan',
      title: 'Ringkasan: inti yang kamu setujui',
      paragraphs: [
        'Empat hal ini yang paling penting. Semuanya dijelaskan lebih lengkap di bagian berikutnya — mereka ada di atas supaya kamu benar-benar membacanya, bukan supaya kamu melewatinya.',
      ],
      bullets: [
        'CatetInd adalah alat pencatatan keuangan pribadi dengan fitur edukasi berbasis AI. Ia membantu kamu belajar mengelola uang — bukan mengelola uangmu, dan bukan memberi keputusan keuangan untukmu.',
        'Langganan bersifat prabayar (prepaid). Kamu bayar di muka, dan KAMU yang menekan tombol perpanjang. Tidak ada tagihan otomatis di sistem kami, kapan pun.',
        'Masa aktif habis bukan kiamat: app tetap bisa dibuka, seluruh data & riwayat tetap bisa dibaca (read-only), dan catatanmu TIDAK PERNAH dihapus — bahkan kalau kamu tidak kembali selama berbulan-bulan.',
        'Data keuanganmu milikmu. Kamu bisa mengekspornya jadi satu file JSON atau menghapus akunmu sendiri, tanpa perlu menghubungi siapa pun.',
      ],
      note: {
        label: 'Kami bukan penasihat investasi',
        body: 'Batas itu sengaja ditulis tebal-tebal di bagian "Yang CatetInd BUKAN". Kalau ada jawaban AI yang terasa seperti nasihat produk keuangan, itu bukan cara kerja yang kami rancang — laporkan lewat Pusat Bantuan supaya bisa kami telusuri.',
        tone: 'info',
      },
    },

    /* ── 2. APA ITU CATETIND — verbatim PRD 5082–5084 ─────────────────────── */
    {
      id: 'apa-itu',
      title: 'Apa itu CatetInd',
      paragraphs: [
        /* VERBATIM PRD 5082–5084 (baris digabung, kata tidak diubah) */
        'CatetInd adalah aplikasi pencatatan keuangan personal (personal finance tracker) yang dilengkapi fitur edukasi keuangan berbasis AI.',
      ],
      note: {
        label: 'Tidak tersambung ke rekening bank mana pun',
        body: 'Tidak ada bank sync dan tidak ada akses ke rekeningmu. Semua catatan masuk dari tanganmu sendiri — diketik, diucapkan, atau dipindai dari struk. Karena itu akurasi laporanmu sepenuhnya bergantung pada lengkapnya catatanmu (lihat bagian "Sejauh mana tanggung jawab kami").',
        tone: 'info',
      },
    },

    /* ── 3. YANG CATETIND BUKAN — VERBATIM PENUH (PRD 5085–5089) ─────────────
       Ini bagian yang paling tidak boleh diubah satu kata pun: inilah batas
       legal kami terhadap OJK (PRD Domain 5E, 5077–5099). */
    {
      id: 'bukan',
      title: 'Yang CatetInd BUKAN',
      paragraphs: [
        /* VERBATIM PRD 5085 */
        'CatetInd BUKAN:',
      ],
      bullets: [
        /* VERBATIM PRD 5086–5089 */
        'Penasihat Investasi terdaftar di Otoritas Jasa Keuangan (OJK)',
        'Perencana Keuangan (Certified Financial Planner)',
        'Agen Penjual Efek Reksa Dana (APERD)',
        'Lembaga Jasa Keuangan',
      ],
      note: {
        label: 'Kenapa empat baris ini ditulis lebih tebal',
        body: 'Kami tidak berizin dan tidak menawarkan jasa keuangan apa pun. CatetInd adalah alat bantu belajar dan mencatat — sama seperti buku catatan atau spreadsheet, hanya dengan AI yang membantu merapikan isinya.',
        tone: 'info',
      },
    },

    /* ── 4. INSIGHT INFORMATIF — VERBATIM PRD 5091–5094 & 5096–5098 ─────────
       Dipisah jadi bagian sendiri supaya klaimnya punya tempat yang bisa
       dirujuk (dicari orang, dipakai jawab pertanyaan "ini saran bukan?"), dan
       supaya urutan PRD tetap terjaga: definisi → BUKAN → informatif →
       tanggung jawab user. */
    {
      id: 'informatif',
      title: 'Insight kami informatif & edukatif',
      paragraphs: [
        /* VERBATIM PRD 5091–5094; kata "saran"/"rekomendasi" di sini ADA
           SENGAJA karena kalimatnya berbentuk penyangkalan — lihat catatan
           bahasa di kepala file. */
        'Seluruh informasi, insight, dan konten edukasi yang disediakan oleh CatetInd (termasuk AI Financial Coach) bersifat informatif dan edukatif, BUKAN merupakan saran keuangan, saran investasi, atau rekomendasi pembelian/penjualan produk keuangan apapun.',
        /* VERBATIM PRD 5096–5098 */
        'Pengguna bertanggung jawab penuh atas keputusan keuangan yang diambil. Untuk saran keuangan profesional, pengguna disarankan berkonsultasi dengan perencana keuangan bersertifikat (CFP).',
      ],
      note: {
        label: 'Berarti itu memang informasi, bukan arahan',
        body: 'CatetInd menampilkan datamu dan menjelaskan artinya — misalnya "pengeluaran makan bulan ini naik dibanding bulan lalu". Yang memutuskan untuk mengubah kebiasaan, memperpanjang celengan, atau mengambil produk keuangan tetap kamu. Untuk keputusan yang besar, perencana keuangan bersertifikat (CFP) adalah tempat yang tepat.',
        tone: 'info',
      },
    },

    /* ── 5. BATAS AI COACH ──────────────────────────────────────────────────
       Verbatim: daftar "bisa / TIDAK bisa" PRD 5106–5114 + perilaku disclaimer
       otomatis 5119–5125 + larangan keras 5066–5070. */
    {
      id: 'ai-batas',
      title: 'Batas Minca, AI Coach',
      paragraphs: [
        'Minca adalah AI Financial Coach di CatetInd — teman belajar keuangan, bukan penasihat. Ia bekerja dengan batas yang sengaja dipasang, dan batas itu kami sebut di sini supaya kamu tidak perlu menemukannya sendiri lewat coba-coba.',
        'Saat pertama kamu membuka AI Coach, Minca memperkenalkan dua daftar ini:',
      ],
      bullets: [
        /* VERBATIM PRD 5107–5109 */
        '✅ Memahami pola pengeluaranmu',
        '✅ Belajar konsep keuangan dasar',
        '✅ Menjawab pertanyaan seputar budgeting',
        /* VERBATIM PRD 5112–5114 */
        '❌ Memberikan saran investasi spesifik',
        '❌ Merekomendasikan produk keuangan',
        '❌ Menggantikan perencana keuangan profesional',
      ],
      note: {
        label: 'Yang diblokir otomatis',
        body: 'Jawaban yang menyebut nama produk investasi spesifik, angka imbal hasil, atau nama perusahaan asuransi diblokir otomatis oleh sistem. Dan setiap jawaban yang menyentuh investasi, hutang, atau asuransi ditutup otomatis — bukan pesan yang bisa dimatikan — dengan kalimat: "ℹ️ Ini informasi edukatif, bukan saran keuangan profesional."',
        tone: 'info',
      },
    },

    /* ── 6. LANGGANAN & MASA AKTIF (PRD 4505–4548, A3 5146–5148, A4 5150–5152,
          A8 5166–5168, bonus referral 6499–6502) ──────────────────────────── */
    {
      id: 'langganan',
      title: 'Cara kerja langganan & masa aktif',
      paragraphs: [
        'CatetInd memakai model prabayar: kamu membeli masa aktif, memakainya sampai habis, lalu memilih sendiri kapan memperpanjang. Kami tidak menyimpan mandat penagihan, jadi tidak ada satu pun mekanisme di sistem kami yang bisa menarik uangmu tanpa kamu menekan tombol lebih dulu.',
        'Perpanjangan bisa lewat tombol satu-tap dengan metode pembayaran yang sudah tersimpan, atau lewat halaman pembelian biasa. Satu-tap tetap butuh ketukan dan konfirmasi darimu di jendela Midtrans — token yang tersimpan hanya menghemat pengetikan data pembayaran, bukan memberi izin menagih.',
      ],
      bullets: [
        'Masa aktif bertumpuk, bukan mereset. Kalau kamu memperpanjang sebelum masa aktifmu habis, sisa harinya ditambahkan — tidak ada hari yang hangus.',
        'Bonus dari mengajak teman ikut ditumpuk ke periode yang sedang berjalan: tambahan +30 hari masa aktif untuk pemilik paket bulanan/tahunan, atau tambahan token AI untuk pemilik paket seumur hidup.',
        'Berhenti kapan saja lewat "Berhenti Berlangganan" di Pengaturan → Langganan. Yang berhenti hanya perpanjangan berikutnya; masa aktif yang sudah kamu bayar tetap berjalan sampai tanggalnya habis, dan datamu tetap utuh.',
        'Masa aktif habis — grace period 7 hari pertama: app tetap bisa dibuka dan seluruh data & riwayat tetap bisa dibaca, tapi pencatatan transaksi baru diblokir. Tanamanmu masuk mode tidur: warna redup dan mata tertutup, bukan mati.',
        'Setelah lewat 7 hari: statusnya tetap read-only, hanya kalimat pengingatnya yang berubah jadi ajakan, bukan peringatan. Tidak ada fitur yang dikunci, tidak ada tanggal yang memaksa.',
        'Data TIDAK PERNAH dihapus, bahkan kalau kamu tidak pernah memperpanjang lagi. Kembali enam bulan kemudian, perpanjang lagi, dan seluruh catatanmu masih persis seperti saat kamu tinggalkan.',
        'Paket seumur hidup (Founding Member) tidak punya tanggal berakhir dan tidak butuh perpanjangan — sekali bayar, selesai.',
      ],
      note: {
        label: 'Tanpa auto-renew paksa — kamu yang pegang kendali',
        body: 'Ini bukan disclaimer yang dikarang untuk halaman ini, tapi cara produk ini dibangun (PRD 4507–4509). Pengingat perpanjangan datang 7 hari, 3 hari, dan 1 hari sebelum masa aktif habis — lewat banner di app dan email. Pesan terakhirnya pun selalu punya tombol "Nanti aja", dan kalau kamu tidak menekan tombol perpanjang, tidak ada uang yang keluar dari rekeningmu.',
        tone: 'info',
      },
    },

    /* ── 7. KUOTA & TOKEN AI (PRD 4774–4860 + A5 5154–5156 & A6 5158–5160) ──
       Angka kuota DITULIS (jangan disembunyikan), tapi nominal rupiahnya tidak:
       harga add-on hidup di modal top-up / `lib/data/pricing.ts`, dan menyalinnya
       ke sini cuma bikin daftar harga kedua yang bisa basi. */
    {
      id: 'token-ai',
      title: 'Kuota & Token AI',
      paragraphs: [
        'Fitur AI — kategorisasi otomatis, penamaan transaksi, chat dengan Minca, pindai struk, input suara, apresiasi, dan recap mingguan — dihitung dengan token dan sudah termasuk dalam langgananmu. Kuota dasarnya sengaja dipasang di atas pemakaian normal: perkiraan kami, 80% orang tidak akan pernah menyentuh batasnya.',
        'Ini rinciannya, tanpa angka yang disembunyikan:',
      ],
      bullets: [
        'Kuota dasar per bulan sekitar 601.500 token, setara kurang lebih 1.265 panggilan: kategorisasi & penamaan 800 panggilan, chat 200, pindai struk (OCR) 100, input suara 150, apresiasi AI 10, dan recap mingguan 5.',
        'Kuota dasar di-reset setiap tanggal 1, bukan dihitung bergulir 30 hari. Sisa kuota bulan lalu tidak menumpuk ke bulan baru.',
        'Kalau kuotanya habis, fitur AI berhenti sampai bulan berganti atau sampai kamu mengisi ulang. Mencatat manual TIDAK terbatas — app tetap berfungsi penuh tanpa AI.',
        'Isi ulang (add-on) tersedia dalam tiga ukuran: 200.000 token, 400.000 token, dan 800.000 token. Harganya tampil apa adanya sebelum kamu membayar, dan tidak ada harga berbeda di halaman lain.',
        'Token isi ulang TIDAK hangus saat bulan berganti — ia berlaku sampai benar-benar terpakai. Yang di-reset bulanan hanya kuota dasarnya.',
        'Sisa kuotamu bisa dilihat kapan saja di Pengaturan → Langganan, di kartu "Bahan Bakar AI". Framingnya sisa bahan bakar, bukan hitungan mundur — kami sengaja tidak memakai warna alarm untuk hal ini.',
      ],
      note: {
        label: 'REVIEW LEGAL — rincian yang belum diputuskan',
        body: 'Angka kuota, siklus reset, dan aturan "token isi ulang tidak hangus" sudah final. Yang belum diputuskan: cara menghitung kuota kalau kamu berpindah paket di tengah bulan, dan pemakaian dari dua perangkat sekaligus. Dua hal itu sengaja belum kami tulis di sini — lebih baik kosong dan bisa ditanyakan lewat Pusat Bantuan daripada tegas tapi salah.',
        tone: 'review',
      },
    },

    /* ── 8. PEMBAYARAN (PRD 4594–4606 & 4671, A1 5138–5140; refund 5972–5976;
          refund slot Founding Member 4361) ──────────────────────────────── */
    {
      id: 'pembayaran',
      title: 'Pembayaran',
      paragraphs: [
        'Semua pembayaran diproses oleh Midtrans — payment gateway yang juga dipakai layanan besar di Indonesia. Data kartu atau e-wallet-mu diproses langsung oleh Midtrans: kami tidak pernah melihatnya dan tidak pernah menyimpannya.',
        'Harga yang kamu lihat di halaman pembelian adalah harga yang kamu bayar. Satu harga per paket, sama di semua tempat — halaman pembelian, Pengaturan → Langganan, dan pengingat perpanjangan. Tidak ada biaya tersembunyi, tidak ada harga yang berubah setelah kamu menyetujui, dan tidak ada promo yang bikin harga aslinya jadi misterius.',
        'Satu-satunya potongan harga adalah diskon 10% untuk teman yang kamu ajak lewat kode referral — dan potongan itu selalu terlihat di ringkasan sebelum kamu menekan tombol bayar.',
      ],
      bullets: [
        'Periode tahunan selalu dihitung dengan aturan yang sama: kamu membayar 8 bulan untuk masa aktif 365 hari. Itu sebabnya penghematannya selalu di atas 30%, dan angkanya tidak pernah berubah-ubah.',
        'Harga paket seumur hidup (Founding Member) memang naik setiap kali ada yang membeli — itu bagian dari aturan mainnya, bukan kenaikan diam-diam. Harga yang berlaku untukmu adalah harga yang tampil di halaman pembelian saat kamu membayar.',
        'Kalau kamu sudah membayar tetapi slot Founding Member keburu penuh sebelum pembayaranmu tercatat, uangmu kami kembalikan utuh.',
        'Garansi uang kembali: kalau dalam 30 hari kamu merasa CatetInd bukan untukmu, kirim email ke support@catetind.com dengan alasan singkat dan kami proses pengembaliannya dalam 3–5 hari kerja. Tanpa pertanyaan yang aneh-aneh.',
      ],
      note: {
        label: 'REVIEW LEGAL — cakupan garansi',
        body: 'Poin garansi di atas adalah janji publik, jadi kami tulis apa adanya — bukan "syarat & ketentuan berlaku" yang kabur. Yang belum diputuskan: perlakuannya untuk token isi ulang yang sudah terpakai sebagian dan untuk langganan yang berjalan setengah periode. Dua kasus itu masih ditinjau kasus per kasus sampai ada aturan tertulisnya.',
        tone: 'review',
      },
    },

    /* ── 9. AKUN & LARANGAN (pelengkap PRD Domain 4C: PIN hanya di perangkat) ─ */
    {
      id: 'akun',
      title: 'Akun & hal yang tidak boleh dilakukan',
      paragraphs: [
        'Akun CatetInd dibuat dengan email dan nama panggilan — tanpa password, nomor telepon, alamat, KTP, atau tanggal lahir. Kamu bisa mengunci app dengan PIN atau biometrik, dan PIN itu hanya tersimpan di perangkatmu, bukan di server kami.',
        'Aturan pakainya pendek, karena app ini memang dirancang untuk satu orang:',
      ],
      bullets: [
        'Satu akun untuk satu orang. Isinya kondisi keuanganmu, jadi jangan dipakai bergantian atau diperjualbelikan.',
        'Jangan memakai CatetInd untuk hal yang melanggar hukum, atau untuk mengganggu layanan — misalnya menyerang server, menyalin isi app secara otomatis, atau memakai fitur AI di luar pemakaian wajar.',
        'Jangan memasukkan data milik orang lain tanpa izinnya. Dompet Bersama memang untuk berdua, tapi undangannya dikirim satu per satu ke orang yang kamu pilih — bukan tautan yang bisa disebar.',
        'Jangan mengaku sebagai CatetInd untuk mendapatkan data orang lain. Kami tidak pernah menghubungimu untuk meminta data pribadi atau uang.',
        'Kalau kamu merasa akunmu diakses orang lain, kamu bisa langsung mengunci atau menghapusnya sendiri dari Pengaturan → Keamanan & Privasi.',
      ],
      note: {
        label: 'REVIEW LEGAL — langkah yang belum diputuskan',
        body: 'Tim produk belum memutuskan langkah yang kami ambil kalau ada akun yang melanggar aturan di atas (peringatan, pembekuan sementara, atau penutupan akun). Kami tidak menulis sanksi yang belum disepakati; bagian ini menunggu keputusan hukum sebelum dokumen ini mengikat.',
        tone: 'review',
      },
    },

    /* ── 10. KEPEMILIKAN DATA (PRD Domain 4C: export, hapus akun, admin
           zero-access + screenshot policy 3435–3504) ─────────────────────── */
    {
      id: 'data',
      title: 'Data keuanganmu milikmu',
      paragraphs: [
        'Semua catatan yang kamu masukkan adalah milikmu. Kami hanya menyimpannya untukmu: tidak menjualnya, tidak memakainya untuk iklan, dan tidak membukanya untuk keperluan pemasaran apa pun.',
        'Kamu bisa membawa datamu keluar kapan saja. Tombol Export Data Saya membuat salinan lengkap dalam bentuk JSON dan mengirimkannya ke emailmu sendiri. Kamu juga bisa menghapus akunmu sendiri dari Pengaturan → Keamanan & Privasi.',
      ],
      bullets: [
        'Tidak ada satu pun orang di CatetInd yang bisa membuka catatan transaksimu — termasuk kami sendiri. Kalau kamu menghubungi support, kami meminta screenshot, bukan akses ke data.',
        'Data yang kamu hapus benar-benar hilang dari sistem kami, bukan disembunyikan atau disimpan diam-diam.',
        'Rincian lengkap soal data — apa yang disimpan, bagian mana yang diproses penyedia model AI, dan sakelar untuk mematikannya — ada di Kebijakan Privasi. Sengaja tidak kami ulang di sini supaya tidak lahir dua versi janji yang sama.',
        'Data tetap tersimpan meski masa aktifmu habis, dan tetap bisa kamu ekspor. Tidak ada catatan yang disandera di balik langganan.',
      ],
    },

    /* ── 11. BATASAN TANGGUNG JAWAB (akurasi data: A1 1692–1694 & A6 1712–1714;
           batas ganti rugi → REVIEW LEGAL) ────────────────────────────────── */
    {
      id: 'tanggung-jawab',
      title: 'Sejauh mana tanggung jawab kami',
      paragraphs: [
        'CatetInd adalah alat bantu mencatat dan belajar. Kami berusaha keras supaya angka yang ditampilkan benar, tapi hasilnya bergantung pada data yang kamu masukkan sendiri — dan kamu yang paling tahu angka sebenarnya.',
        'Dua hal teknis yang menjelaskan kenapa itu penting: saldo dompet disimpan sebagai angka yang diperbarui setiap kali kamu mencatat transaksi (bukan hasil membaca rekening bank, karena kami memang tidak terhubung ke bank), dan tabungan, transfer, serta pengeluaran adalah tiga tipe transaksi yang terpisah. Salah memilih tipe membuat ringkasanmu melenceng — untungnya setiap transaksi bisa kamu edit kapan saja.',
      ],
      bullets: [
        'Keputusan keuangan tetap milikmu, beserta hasilnya. Keuntungan maupun kerugian dari keputusan itu bukan tanggung jawab kami.',
        'Kami tidak menjanjikan hasil finansial tertentu. Insight kami adalah pembacaan atas datamu, bukan jaminan.',
        'Kalau ada kekeliruan teknis — angka tidak tampil, salah hitung, atau penyimpanan gagal — laporkan lewat Pusat Bantuan. Kami perbaiki, dan kalau perlu membantu memulihkan catatanmu dari file export.',
        'Kami bisa menghentikan sementara sebuah fitur untuk perbaikan, tapi tidak akan menghentikan layanan ini diam-diam: kalau CatetInd benar-benar berhenti permanen, kami beri tahu lebih dulu lewat email supaya kamu sempat mengekspor datamu.',
      ],
      note: {
        label: 'REVIEW LEGAL — batas ganti rugi',
        body: 'Apakah ganti rugi dibatasi sebesar biaya langganan yang pernah kamu bayar, dan bagaimana rumusannya, belum diputuskan. Kami tidak mencantumkan batas angka yang belum disetujui — bagian ini menunggu rumusan advokat, dan tanggal versinya akan naik begitu isinya berubah.',
        tone: 'review',
      },
    },

    /* ── 12. PERUBAHAN DOKUMEN ───────────────────────────────────────────── */
    {
      id: 'perubahan',
      title: 'Kalau syarat ini berubah',
      paragraphs: [
        'Halaman ini punya nomor versi dan tanggal di bagian atas. Setiap kali isinya berubah, keduanya ikut naik — dan Kebijakan Privasi diperbarui bersamaan, supaya tidak pernah ada dua dokumen legal yang saling bertentangan.',
      ],
      bullets: [
        'Perubahan yang mengubah hakmu — aturan masa aktif, kuota AI, atau cara pembayaran — kami beri tahu lewat notifikasi di app dan email SEBELUM berlaku, bukan sesudah.',
        'Perubahan kecil (perbaikan kalimat, tambahan contoh) tidak perlu notifikasi, tapi nomor versinya tetap naik supaya riwayatnya bisa ditelusuri.',
        'Versi yang berlaku adalah yang tampil di halaman ini; salinan yang tersebar di tempat lain bukan acuan.',
        'Kalau kamu tidak setuju dengan versi barunya, kamu tidak wajib memperpanjang langgananmu — dan seperti biasa, datamu tetap bisa kamu ekspor dan hapus sendiri.',
      ],
    },

    /* ── 13. HUKUM & YURISDIKSI (badan hukum → REVIEW LEGAL, PRD A9 5170–5172) */
    {
      id: 'hukum',
      title: 'Hukum yang berlaku',
      paragraphs: [
        'Syarat & Ketentuan ini tunduk pada hukum Republik Indonesia. Kalau ada perselisihan, kami akan mengupayakan penyelesaian lewat Pusat Bantuan dan email lebih dulu — jalur yang paling cepat dan paling murah untuk kita berdua.',
      ],
      note: {
        label: 'REVIEW LEGAL — badan hukum & pengadilan',
        body: 'Nama badan hukum penyelenggara, domisili, dan pengadilan yang berwenang belum ditetapkan: pendaftaran merchant masih atas nama individu. Rumusan bagian ini menunggu advokat dan akan diperbarui bersamaan dengan berdirinya badan hukum, tanpa mengubah janji di bagian lain.',
        tone: 'review',
      },
    },

    /* ── 14. KONTAK — jalan yang benar-benar ada, bukan alamat karangan ──── */
    {
      id: 'kontak',
      title: 'Kontak',
      paragraphs: [
        'Pertanyaan, keberatan, atau permintaan soal akun dan datamu bisa dimulai dari Pusat Bantuan: buka artikel mana pun, tekan 👎 di kakinya, lalu kirim pesan. Balasan datang dari manusia — langsung dari founder, bukan bot dan bukan tiket yang mengantre.',
        'Kalau lebih nyaman lewat email, kirim ke support@catetind.com — sertakan screenshot untuk masalah tampilan, karena kami memang tidak bisa membuka datamu untuk mengeceknya sendiri.',
      ],
    },
  ],

  /* ── KAKI DOKUMEN ─────────────────────────────────────────────────────────
     Tiga hal yang harus jujur di sini: (1) status hukumnya, (2) bahwa build ini
     masih demo, (3) tautan ke halaman yang BENAR-BENAR ada di repo. Semuanya
     disebut apa adanya — sama seperti yang dilakukan `/privacy`. */
  reviewNote: {
    label: 'REVIEW LEGAL — belum lewat tinjauan hukum',
    body: 'CatetInd masih di tahap awal dan syarat ini disusun oleh tim produk, bukan advokat. Setiap bagian yang masih menunggu keputusan ditandai terang-terangan di atas, dan bagian yang belum ada aturannya sengaja kami kosongkan daripada diisi klausul karangan. Nomor versi dan tanggal di atas naik setiap kali isinya berubah.',
    tone: 'review',
  },
  demoNote:
    'Catatan build demo: versi CatetInd yang sedang kamu buka adalah prototipe desain. Bagian langganan, kuota token, dan pembayaran di atas menjelaskan cara kerja versi produksinya — di build ini tidak ada pembayaran nyata, tidak ada penagihan, dan tidak ada satu pun permintaan yang benar-benar dikirim ke penyedia model AI.',
  related: {
    title: 'Lihat juga',
    links: [
      {
        href: '/privacy',
        label: 'Kebijakan Privasi',
        desc: 'Data apa yang kami simpan, siapa yang boleh melihatnya, dan sakelar untuk mematikan AI.',
      },
      {
        href: '/help',
        label: 'Pusat Bantuan',
        desc: 'Cara pakai sehari-hari, batas kuota AI, dan jalan ngobrol langsung sama founder.',
      },
      {
        href: '/settings/billing',
        label: 'Langganan & Billing',
        desc: 'Paket yang sedang aktif, tanggal berakhir, dan tombol perpanjang atau berhenti.',
      },
      {
        href: '/settings/security',
        label: 'Keamanan & Privasi',
        desc: 'Kunci app dengan PIN atau biometrik, lalu hapus akun dari halaman yang sama.',
      },
    ],
    crossNote:
      'Syarat & Ketentuan ini punya kembaran: Kebijakan Privasi. Keduanya diterbitkan sebagai satu paket dan nomor versinya naik bersamaan, jadi janji di halaman ini tidak akan pernah bertabrakan dengan yang di sana.',
  },
  /* Disclaimer wajib PRD 5E (footer): satu baris, tanpa nada menakut-nakuti */
  disclaimer:
    'CatetInd adalah aplikasi pencatatan keuangan personal. Bukan penasihat investasi terdaftar OJK.',
}
