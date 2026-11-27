/* ── Pusat Bantuan (/app/help, inventaris #30) · Domain 4C ───────────────────
   Satu sumber data + logika MURNI (tanpa React) untuk halaman bantuan:

    1. TOPIK + ARTIKEL — 9 grup topik, masing-masing punya `blurb` (sapaan
       Minca) dan artikel berisi langkah bernomor + `proTip` ("Perlu Tahu").
       Gaya copy WAJIB suara Minca: santai, hangat, bahasa sehari-hari.
    2. QUICK ANSWERS — 5 pertanyaan yang paling sering bikin panik. Ini konten
       DEFAULT saat belum ada topik yang dipilih.
    3. PENCARIAN — `searchHelp()` mencocokkan judul + isi (langkah, proTip,
       pertanyaan, jawaban) secara real-time, tanpa index eksternal.

   Yang DIHAPUS dari file ini: `buildHelpExportPayload()`. Fungsi itu menyusun
   JSON ekspor dari KONSTANTA contoh (`WALLET_SEED`, `ALL_TRANSACTIONS`,
   `INITIAL_*`), dan setelah tombol "Export Data Saya" memakai
   `downloadMoneyExport()` (`lib/money/export.ts`, membaca store hidup) fungsi
   itu tidak punya pemanggil lagi — hanya test yang memakainya, dan itulah cara
   data contoh bisa hidup kembali. Satu jalur ekspor saja: `money/export.ts`.
   ────────────────────────────────────────────────────────────────────────── */

import { LOGIN_PATH } from './auth'
import { PRIVACY_LINK_COPY } from '../legal/privacy'
import { TERMS_LINK_COPY } from '../legal/terms'
import { SITE_DOMAIN } from '../site'

/* ── 2. TOPIK + ARTIKEL ───────────────────────────────────────────────────── */

export interface HelpArticle {
  /** id stabil — dipakai sebagai key React & penanda state feedback per artikel */
  id: string
  /** mis. "Cara Catet Transaksi dalam 4 Tap" */
  title: string
  /** langkah bernomor, ditulis dengan suara Minca (nomornya digambar oleh <ol>) */
  steps: string[]
  /** opsional — kotak "💡 Perlu Tahu" di bawah langkah */
  proTip?: string
}

export interface HelpTopic {
  id: string
  /** label di sidebar kiri */
  label: string
  /** emoji penanda topik (dipakai juga di chip mobile) */
  emoji: string
  /** satu-dua kalimat sapaan Minca saat topik dibuka */
  blurb: string
  articles: HelpArticle[]
}

export const HELP_TOPICS: HelpTopic[] = [
  {
    id: 'mulai',
    label: 'Mulai dari Sini',
    emoji: '🚀',
    blurb: 'Baru kenalan sama CatetInd? Dua menit di sini, sisanya aku yang urus.',
    articles: [
      {
        id: 'mulai-siapin',
        title: 'Siapin CatetInd dalam 2 Menit',
        steps: [
          'Isi nama kamu, nama panggilan juga boleh, aku yang bakal manggil 😄',
          'Masukin penghasilan bulanan. Nggak perlu pas, perkiraan aja dulu.',
          'Pilih situasi kamu (mahasiswa, kerja, freelance) biar saran aku lebih nyambung.',
          'Lihat puzzle-mu muncul di dashboard. Kepingannya nambah tiap kamu rajin nyatet 🧩',
        ],
        proTip:
          'Belum siap masukin angka? Skip aja. Semua isian bisa diubah kapan aja lewat Pengaturan → Profil.',
      },
      {
        id: 'mulai-puzzle',
        title: 'Puzzle Kamu Ngapain Sih?',
        steps: [
          'Dia bukan hiasan, dia ringkasan visual kebiasaan nyatet kamu.',
          'Nyatet tiap hari → satu kepingan kepasang, dari kosong sampai penuh 🧩',
          'Skip beberapa hari → progresnya berhenti sebentar. Nggak rusak, cuma jeda.',
          'Makin lengkap puzzle-mu, makin tajam saran yang aku kasih.',
        ],
        proTip:
          'Status puzzle nggak pernah mengunci fitur apa pun. Dia teman visual, bukan hakim.',
      },
    ],
  },
  {
    id: 'catat-transaksi',
    label: 'Catet Transaksi',
    emoji: '✍️',
    blurb: 'Empat tap, lalu balik ke hidupmu. Segitu doang.',
    articles: [
      {
        id: 'catat-4-tap',
        title: 'Cara Catet Transaksi dalam 4 Tap',
        steps: [
          'Tap tombol + gede di tengah bawah',
          'Masukin angkanya (nggak perlu ketik "Rp")',
          'Pilih kategori, atau biarin Minca yang nebak otomatis',
          'Done! Cuma 4 tap.',
        ],
        proTip:
          'Ketik aja "kopi 25rb" di kolom catetan. Aku pecah sendiri jadi nominal + kategori, kamu nggak perlu pindah field.',
      },
      {
        id: 'catat-koreksi-ai',
        title: 'Minca Salah Nebak Kategori, Gimana?',
        steps: [
          'Tap transaksinya di Riwayat atau di kartu "Transaksi Terakhir".',
          'Pilih Edit, terus ganti kategorinya.',
          'Aku belajar dari koreksi kamu, beberapa kali koreksi biasanya cukup buat nangkep polanya.',
          'Nggak mau nunggu? Set aturan tetap di Pengaturan → Kategori (mis. "kopi" selalu Makanan).',
        ],
        proTip:
          'Merchant yang sama salah terus? Itu tanda paling jelas buat bikin aturan tetap, bukan ngoreksi manual tiap hari.',
      },
      {
        id: 'catat-offline',
        title: 'Catet Pas Nggak Ada Sinyal, Bisa?',
        steps: [
          'Bisa banget. Catet kayak biasa, aku simpan dulu di HP kamu.',
          'Transaksinya muncul dengan ikon jam kecil ⏳ artinya masih ngantri kirim.',
          'Begitu sinyal balik, semuanya otomatis terkirim. Kamu nggak perlu ngapa-ngapain.',
          'Kalau setelah 5 menit masih gagal, aku kasih tanda + tombol "Coba Lagi".',
        ],
        proTip:
          'Transaksi yang belum terkirim tetap kehitung di saldo kamu, jadi laporan bulananmu nggak bolong.',
      },
    ],
  },
  {
    id: 'budget-target',
    label: 'Budget & Target Nabung',
    emoji: '🎯',
    blurb: 'Batasnya kamu yang nentuin. Aku cuma yang ingetin, bukan yang nyuruh.',
    articles: [
      {
        id: 'budget-pertama',
        title: 'Set Budget Pertama Kamu',
        steps: [
          'Buka Budget & Target Nabung, tap "Tambah Budget".',
          'Pilih kategori + nominalnya. Contoh: Makan 1.500.000 per bulan.',
          'Pilih periode: mingguan, bulanan, atau custom buat kamu yang gajian tanggal 25.',
          'Simpan. Bar di kartu kategori langsung nunjukin progres kamu.',
        ],
        proTip:
          'Mulai dari 3 kategori paling besar aja. Budget 12 kategori biasanya cuma bikin pusing, bukan bikin hemat.',
      },
      {
        id: 'budget-lewat',
        title: 'Budget Kamu Lewat, Panik Nggak?',
        steps: [
          'Nggak usah. Aku nggak pakai warna merah buat ngagetin kamu, ada aksen sendiri buat "lewat batas".',
          'Kartunya bilang kamu lewat berapa, dan sisa hari di bulan ini masih berapa.',
          'Kalau porsinya memang kurang realistis, tap kategori → "Sesuaikan Budget".',
          'Kalau cuma boros minggu ini, aku kasih tahu kebiasaan mana yang paling nyumbang.',
        ],
        proTip:
          'Lewat berturut-turut 3 bulan di kategori yang sama? Itu tandanya budgetnya yang perlu diubah, bukan kamu.',
      },
      {
        id: 'budget-target-nabung',
        title: 'Bikin Target Nabung (Sinking Fund)',
        steps: [
          'Buka tab Target Nabung, tap "Tambah Target".',
          'Isi tujuannya: "Dana darurat", "Laptop baru", "Tiket konser", apa aja, aku nggak nyalahin.',
          'Masukin nominal target + tenggatnya. Aku hitung sendiri berapa yang perlu kamu sisihkan per bulan.',
          'Tiap kamu sisihkan duit, targetnya naik dan kepingan puzzle-nya ikut nambah 🧩',
        ],
        proTip:
          'Ada rejeki lebih di akhir bulan? Fitur Sweep mindahin sisa saldomu ke target otomatis.',
      },
    ],
  },
  {
    id: 'tagihan-rutin',
    label: 'Tagihan Rutin',
    emoji: '🔔',
    blurb: 'Biar Netflix dan kos nggak ngejutin kamu tiap tanggal 13.',
    articles: [
      {
        id: 'tagihan-tambah',
        title: 'Nambah Tagihan (Netflix, Kos, Wifi)',
        steps: [
          'Buka Tagihan Rutin → tap "+ Tambah".',
          'Pilih emojinya dulu, biar mata kamu gampang nyariin di daftar.',
          'Isi nominal + tanggal jatuh temponya tiap bulan.',
          'Set reminder H-3, atau H-1 buat kamu yang suka adrenaline 😅',
        ],
        proTip:
          'Tagihan yang nominalnya nggak tetap (listrik, air) boleh dikosongin, aku bakal tanya pas kamu tandai lunas.',
      },
      {
        id: 'tagihan-reminder',
        title: 'Reminder-nya Datang di Mana?',
        steps: [
          'Default: push notification H-3 sebelum jatuh tempo.',
          'Aktifin push dulu, banner di halaman Tagihan akan nawarin.',
          'Di iPhone, push cuma jalan kalau CatetInd udah di-install ke Home Screen. Itu aturan iOS, bukan salah kita 😅',
          'Nggak mau notif sama sekali? Matiin di Pengaturan → Notifikasi, aplikasinya tetap jalan penuh.',
        ],
        proTip:
          'Pembayaranmu nggak pernah otomatis didebit. CatetInd nggak nyambung ke rekening bank, aku cuma ngingetin.',
      },
      {
        id: 'tagihan-lunas',
        title: 'Nandain Tagihan Udah Dibayar',
        steps: [
          'Tap kartu tagihannya.',
          'Klik "Tandai Lunas". Kalau nominalnya masih kosong, aku minta isi dulu.',
          'Aku otomatis bikin transaksi pengeluaran + kurangi budget kategori itu.',
          'Lupa nandain? Bulan depan tagihannya muncul lagi sendiri kalau kamu pilih "Berulang setiap bulan".',
        ],
        proTip:
          'Tekan lama kartunya buat lihat riwayat pembayaran bulan-bulan sebelumnya.',
      },
    ],
  },
  {
    id: 'dompet-kita',
    label: 'Dompet Kita (Joint Wallet)',
    emoji: '👫',
    blurb: 'Duit bareng pasangan, teman kos, atau tim trip. Transparan, dan bisa lebih dari dua orang.',
    articles: [
      {
        id: 'dompet-buat',
        title: 'Bikin Dompet Kita Bareng Siapa Aja?',
        steps: [
          'Tap "Buat Dompet Kita" → kasih nama (mis. "Kos Melati", "Dana Trip Bali").',
          'Bagikan kode 6 karakter ke orang yang mau kamu ajak.',
          'Mereka buka kodenya, login, langsung gabung, nggak ada proses persetujuan yang ribet.',
          'Satu kode bisa dipakai beberapa orang (maksimal 8 anggota), dan kodenya berlaku 24 jam.',
        ],
        proTip:
          'Dompet Kita terpisah dari dompet pribadimu. Saldo dan riwayatnya nggak pernah nyampur.',
      },
      {
        id: 'dompet-settlement',
        title: 'Patungannya Nggak Cocok, Gimana?',
        steps: [
          'Buka Dompet Kita → lihat widget "siapa utang siapa" di halaman itu.',
          'Kalau angkanya beda dengan hitunganmu, cek daftar transaksinya.',
          'Transaksi privat tetap dihitung, cuma nama itemnya disamarkan, nominalnya tetap bisa kamu cek.',
          'Ada yang salah catet? Tap transaksinya → Edit. Angka settlement ikut berubah otomatis.',
        ],
        proTip:
          'Setelah Lunas, semua catetannya tetap ada. Riwayat nggak pernah dihapus, cuma ditandai selesai.',
      },
    ],
  },
  {
    id: 'kekayaan-hutang',
    label: 'Kekayaan & Hutang',
    emoji: '💼',
    blurb: '"Net worth" kedengeran serem, padahal cuma: punya apa, dikurangi utang berapa.',
    articles: [
      {
        id: 'kekayaan-aset',
        title: 'Catet Investasi & Aset Pertama',
        steps: [
          'Buka Kekayaan & Hutang → tab Investasi → "Tambah Investasi".',
          'Pilih jenisnya: reksadana, saham, emas, atau properti.',
          'Isi jumlah unit + harga belinya. Aku yang hitung nilai dan return-nya.',
          'Punya aset lama yang dibeli setahun lalu? Pilih "Sudah punya", saldo dompetmu nggak ikut terpotong.',
        ],
        proTip:
          'Harga sebagian aset di-refresh berkala. Kalau angkanya keliatan basi, aku kasih tanda + tombol update manual.',
      },
      {
        id: 'kekayaan-hutang-catat',
        title: 'Daftarin Hutang Tanpa Rasa Malu',
        steps: [
          'Tab Hutang → "Tambah Hutang".',
          'Isi total pinjaman, cicilan per bulan, dan sisa tenornya.',
          'Aku hitung rasio cicilan vs penghasilanmu, kalau masuk zona aman, santai aja.',
          'Nyalain Debt Snowball: aku urutin dari hutang terkecil biar kamu cepat dapat kemenangan pertama.',
        ],
        proTip:
          'Hutang ke teman juga boleh dicatet di sini. Nyatet bukan berarti kamu lagi kenapa-napa, cuma biar nggak lupa.',
      },
      {
        id: 'kekayaan-networth',
        title: 'Net Worth Kamu Kok Turun?',
        steps: [
          'Lihat Net Worth bar di bagian atas halaman.',
          'Bandingin dua sisinya: total aset dan total hutang.',
          'Aset turun biasanya karena harga pasar (saham/emas), bukan karena kamu salah.',
          'Hutang turun itu kabar bagus, walau angka "total"-nya jadi kelihatan lebih kecil.',
        ],
        proTip:
          'Lihat tren per bulan, bukan per hari. Kamu nggak bisa menilai keuangan dari satu hari yang jelek.',
      },
    ],
  },
  {
    id: 'ai-coach',
    label: 'Minca',
    emoji: '✨',
    blurb: 'Itu aku. Kerja 24 jam, nggak pernah nyalahin pengeluaranmu.',
    articles: [
      {
        id: 'ai-cara-nanya',
        title: 'Cara Nanya Biar Jawaban Aku Bagus',
        steps: [
          'Tap balon chat di pojok kanan bawah.',
          'Nanya pakai bahasa sehari-hari aja: "boros nggak nih bulan ini?"',
          'Makin spesifik makin tajam: "bulan lalu aku keluar berapa buat kopi?"',
          'Aku jawab dari data kamu sendiri, nggak ada banding-bandingin sama pengguna lain.',
        ],
        proTip:
          'Ketik "scan struk" atau foto struknya langsung. Aku baca nominal + kategorinya, kamu tinggal konfirmasi.',
      },
      {
        id: 'ai-token-habis',
        title: 'Token AI Habis, Ngapain?',
        steps: [
          'Buka Pengaturan → AI Token → pilih paket isi ulang.',
          'Atau lebih hemat: buka halaman "Ajak Teman" dan bagikan link referralmu.',
          '1 teman yang membeli paket = Token AI gratis 1 bulan, masuk otomatis tanpa klaim.',
          'Token dan Voice dihitung terpisah, jadi kamu bisa lihat mana yang lebih cepat habis.',
        ],
        proTip:
          'Sisa kuota selalu kelihatan di kartu "Bahan Bakar AI" pada sidebar. Nggak ada kejutan mendadak.',
      },
      {
        id: 'ai-lambat',
        title: 'Jawaban Aku Lama, Kenapa?',
        steps: [
          'Kalau di bagian atas halaman ini ada tanda kuning, artinya antrean aku sedang panjang.',
          'Coba lagi beberapa menit. Pertanyaanmu nggak hilang, kok.',
          'Kalau kamu sedang offline, aku bakal bilang jawabannya pakai data lama.',
          'Masih lama? Tunggu sampai statusnya balik hijau, tim kami cepat sadar dan langsung benerin.',
        ],
        proTip:
          'Aku nggak akan ngarang angka. Kalau datanya belum cukup, aku bilang belum cukup.',
      },
    ],
  },
  {
    id: 'keamanan-privasi',
    label: 'Keamanan & Privasi',
    emoji: '🔒',
    blurb: 'Ini bagian yang paling aku banggain: apa yang kami SENDIRI nggak bisa lihat.',
    articles: [
      {
        id: 'privasi-siapa-lihat',
        title: 'Siapa Sih yang Bisa Lihat Data Keuangan Aku?',
        steps: [
          'Jawaban singkatnya: cuma kamu. Titik.',
          'Tim CatetInd | termasuk founder, nggak punya endpoint atau admin panel buat buka data transaksi individual.',
          'Ini bukan janji marketing. Struktur database-nya (row-level security milikmu sendiri) yang bikin itu mustahil.',
          'Yang bisa kami lihat cuma angka agregat anonim, mis. "berapa banyak orang yang pakai fitur Budget".',
        ],
        proTip:
          'Kalau ada layanan yang bilang "CS kami bisa bantu cek transaksimu", artinya manusia di sana memang bisa membacanya.',
      },
      {
        id: 'privasi-sensor',
        title: 'Sensorkan Angka di Depan Orang (KRL Friendly)',
        steps: [
          'Tap ikon mata di header, dan SEMUA nominal di layar langsung tersamar.',
          'Cocok buat: lagi di KRL, antre di kasir, atau ngobrol sama orang tua 😅',
          'Statusnya berlaku ke seluruh halaman (dashboard, budget, riwayat), nggak perlu diulang.',
          'Tap lagi buat balikin angkanya.',
        ],
        proTip:
          'Transaksi privat di Dompet Kita tetap tersamarkan walau sensor dimatikan. Gemboknya lebih kuat dari sakelar.',
      },
      {
        id: 'privasi-export',
        title: 'Ambil Datamu Kapan Aja (No Lock-in)',
        steps: [
          'Buka Pengaturan → "Export Data Saya".',
          'Datamu di-compile jadi file JSON: transaksi, dompet, hutang, dan target nabung.',
          'Simpan di HP atau laptop kamu sendiri, nggak ada yang perlu kamu minta izin dulu.',
          'Mau berhenti pakai CatetInd kapan pun? Datamu tetap bisa kamu export kapan saja.',
        ],
        proTip:
          'File export dibuat buat kamu, bukan buat kami. Kami nggak punya salinannya.',
      },
    ],
  },
  {
    id: 'langganan-pembayaran',
    label: 'Paket & Pembayaran',
    emoji: '💳',
    blurb: 'Bayar sekali, naik paket, isi ulang token, tombolnya ada di depan semua, nggak disembunyiin.',
    articles: [
      {
        id: 'langganan-upgrade',
        title: 'Cara Naik Paket (Bayar Selisih Aja)',
        steps: [
          'Buka Pengaturan → Langganan.',
          'Tap tombol "Upgrade paket", lalu pilih paket tujuan.',
          'Yang kamu bayar cuma SELISIH harganya, bukan harga penuh dari nol.',
          'Setelah pembayaran masuk, fitur paket barunya langsung terbuka dan berlaku selamanya.',
        ],
        proTip:
          'Nggak ada perpanjangan dan nggak ada tagihan berkala: paket itu sekali bayar untuk akses selamanya. Turun paket (downgrade) nggak ditawarin karena pembelian bersifat final.',
      },
      {
        id: 'langganan-metode',
        title: 'Bayar Pakai Apa Aja?',
        steps: [
          'QRIS (paling cepat), Virtual Account bank, atau kartu.',
          'Tagihan dan instruksi bayarnya muncul di halaman ini juga, nggak pindah ke situs lain.',
          'Setelah pembayaran masuk, aksesmu aktif otomatis, kadang cuma hitungan detik.',
          'Metode favoritmu belum ada? Kabarin kami lewat tombol di bawah artikel ini ya.',
        ],
        proTip:
          'Simpan bukti pembayarannya. Kalau aksesmu belum kebuka dalam 1 jam, kirim bukti itu ke kami.',
      },
      {
        id: 'langganan-refund',
        title: 'Refund & Salah Bayar',
        steps: [
          'Pembelian paket CatetInd bersifat final: sekali bayar untuk akses selamanya, tanpa auto-debit dan tanpa perpanjangan otomatis. Jadi nggak ada tagihan berulang yang perlu dibatalkan.',
          'Kalau ada kendala teknis, misalnya salah nominal atau terbayar ganda (double charge), kabarin kami lewat WhatsApp atau email halo@catetind.com.',
          'Sertakan screenshot bukti bayar bagian yang bermasalah aja. Kami nggak butuh akses ke data transaksi pribadimu.',
          'Tim kami cek ke catatan pembayaran dan bantu selesaikan sampai jelas, tanpa muter-muter.',
        ],
        proTip:
          'Simpan bukti pembayaran sampai aksesmu aktif. Kalau akses belum kebuka, kirim buktinya ke kami lewat WhatsApp atau email.',
      },
    ],
  },
]

/* ── 3. QUICK ANSWERS — konten DEFAULT "Sering Bikin Bingung" ─────────────── */

export interface QuickAnswer {
  id: string
  question: string
  answer: string
  /** label topik tujuan (dicocokkan ke `HELP_TOPICS[].label` lewat `topicByLabel`) */
  topic: string
  /** H11-3 — kartu keamanan/privasi ditandai "Paling Sering Ditanya" & lebih besar */
  mostAsked?: boolean
}

export const HELP_QUICK_ANSWERS: QuickAnswer[] = [
  {
    id: 'saldo-sinkron',
    question: 'Kok saldo aku kayaknya nggak sinkron?',
    answer:
      'Tenang, biasanya karena ada catatan yang belum ke-sync waktu kamu offline. Coba tarik layar ke bawah buat refresh. Kalau masih beda, cek di Riwayat, mungkin ada catatan yang kedobel atau belum masuk.',
    topic: 'Catet Transaksi',
  },
  {
    id: 'dompet-banyak-orang',
    mostAsked: true,
    question: 'Dompet Kita bisa dipakai berapa orang?',
    answer:
      'Bisa lebih dari dua orang. Ajak pasangan, teman kos, atau tim liburan pakai satu kode undangan 6 karakter yang sama. Tagihan bisa dibagi pakai 5 cara (bagi rata, porsi, persen, nominal, atau traktir), dan pelunasannya dihitung otomatis per pasangan.',
    topic: 'Dompet Kita (Joint Wallet)',
  },
  {
    id: 'stop-langganan',
    question: 'Kalau aku mau berhenti pakai, gimana? Ribet nggak?',
    answer:
      'Nggak ribet sama sekali, karena TIDAK ADA langganan auto-debit yang perlu dibatalkan. CatetInd nggak pernah motong saldo diam-diam. Datamu tetap bisa di-export kapan aja, dan akun bisa kamu hapus sendiri langsung dari Pengaturan.',
    topic: 'Paket & Pembayaran',
  },
  {
    id: 'aman-data',
    question: 'Aman nggak sih data keuangan aku di sini?',
    answer:
      'Aman banget. Bahkan tim CatetInd sendiri nggak bisa ngintip isi catatan pribadi kamu karena aksesnya dikunci langsung untuk akunmu sendiri. Kami juga nggak pernah minta akses login m-banking kamu.',
    topic: 'Keamanan & Privasi',
  },
  {
    id: 'token-habis',
    question: 'Token AI aku habis, beli lagi di mana?',
    answer:
      'Buka Pengaturan -> Kuota AI -> pilih paket isi ulang, atau naik ke Paket Sultan biar tanpa batas. Mau gratis? Ajak teman pakai kode referral kamu di halaman Ajak Teman buat dapet bonus kuota AI!',
    topic: 'Minca',
  },
]

/** label → topik, dipakai kartu quick answer supaya bisa "buka topik"-nya */
export function topicByLabel(label: string): HelpTopic | undefined {
  return HELP_TOPICS.find((topic) => topic.label === label)
}

/** total artikel — dipakai chip meta di header (biar user tahu seberapa lengkap) */
export function totalHelpArticles(topics: HelpTopic[] = HELP_TOPICS): number {
  return topics.reduce((sum, topic) => sum + topic.articles.length, 0)
}

/* ── 4. PENCARIAN ─────────────────────────────────────────────────────────── */

export interface HelpArticleHit {
  /** artikel + topik pemiliknya, siap dirender tanpa lookup tambahan */
  article: HelpArticle
  topic: HelpTopic
  /** 2 = cocok di judul, 1 = cocok di isi (langkah / proTip) */
  score: number
}

export interface HelpSearchResult {
  /** query apa adanya dari input (dipakai di judul hasil & pesan kosong) */
  query: string
  articles: HelpArticleHit[]
  quickAnswers: QuickAnswer[]
  /** true kalau query kosong → halaman menampilkan konten default */
  idle: boolean
}

/**
 * Pecah query jadi kata kunci. Tanda baca & spasi jadi pemisah, dan kata
 * satu huruf dibuang karena terlalu umum ("e", "a") — kecuali query-nya
 * memang cuma itu, maka dipakai apa adanya.
 */
function queryWords(needle: string): string[] {
  const words = needle.split(/[^a-z0-9]+/).filter((word) => word.length >= 2)
  return words.length > 0 ? words : [needle]
}

/**
 * Cocok kalau SEMUA kata kunci ada di haystack (AND) — bukan harus satu frasa
 * utuh. Ini yang bikin contoh di placeholder benar-benar bekerja:
 * "cara sembunyiin transaksi" tetap ketemu walau kalimat itu tidak pernah
 * ditulis persis — "cara" dari judul artikel, "sembunyiin" & "transaksi" dari
 * langkahnya. Tanpa ini, user yang meniru contoh placeholder akan selalu
 * mendapat "0 hasil" dan langsung curiga halamannya rusak.
 */
function matchesAllWords(haystack: string, words: string[]): boolean {
  return words.every((word) => haystack.includes(word))
}

/**
 * Pencarian sederhana tapi jujur: mencocokkan JUDUL + ISI (langkah, proTip,
 * pertanyaan, jawaban) per kata kunci. Urutannya judul dulu (skor 2), lalu isi
 * (skor 1), supaya yang paling relevan selalu naik ke atas. Tanpa index, tanpa
 * backend — cukup untuk 26 artikel + 5 quick answer.
 */
export function searchHelp(query: string, topics: HelpTopic[] = HELP_TOPICS): HelpSearchResult {
  const needle = query.trim().toLowerCase()
  if (needle.length === 0) {
    return { query, articles: [], quickAnswers: [], idle: true }
  }
  const words = queryWords(needle)

  const articles: HelpArticleHit[] = []
  for (const topic of topics) {
    for (const article of topic.articles) {
      const haystackTitle = `${article.title} ${topic.label}`.toLowerCase()
      const haystackBody = [...article.steps, article.proTip ?? ''].join(' ').toLowerCase()
      /* pencocokan dinilai pada judul+isi; SKOR ditentukan dari judul saja,
         jadi "cocok di judul" selalu naik ke atas hasil "cocok di isi" */
      if (!matchesAllWords(`${haystackTitle} ${haystackBody}`, words)) continue
      articles.push({ article, topic, score: matchesAllWords(haystackTitle, words) ? 2 : 1 })
    }
  }

  const quickAnswers = HELP_QUICK_ANSWERS.filter((item) =>
    matchesAllWords(`${item.question} ${item.answer} ${item.topic}`.toLowerCase(), words),
  )

  /* judul dulu, lalu isi — urutan asli tetap terjaga untuk skor yang sama
     karena `Array.prototype.sort` stabil, jadi topik tetap dalam urutan sidebar */
  articles.sort((a, b) => b.score - a.score)

  return { query, articles, quickAnswers, idle: false }
}

/* ── 5. COPY HALAMAN (semua bersuara Minca) ───────────────────────────────── */

export const HELP_TITLE = 'Pusat Bantuan'
export const HELP_SIDEBAR_TITLE = 'Topik'
export const HELP_DEFAULT_TITLE = 'Sering Bikin Bingung'
/* H11-1 (audit UI/UX): placeholder dipendekkan (dulu contoh panjang ikut di
   dalam placeholder) + saran pencarian ditampilkan saat user mulai mengetik. */
export const HELP_SEARCH_PLACEHOLDER = 'Cari bantuan...'
export const HELP_SUGGEST_LABEL = 'Saran:'
export const HELP_MOST_ASKED_BADGE = '🔒 Paling Sering Ditanya'
export const HELP_SEARCH_LABEL = 'Cari di pusat bantuan'
export const HELP_RESULT_TITLE = 'Hasil pencarian'
export const HELP_EMPTY_TITLE = 'Aku nggak nemu yang pas 😅'
export const HELP_EMPTY_BLURB =
  'Coba kata kunci lain atau pilih topik. Masih nggak ada? Klik 👎 di artikel mana pun.'
export const HELP_BACK_TO_QUICK = 'Balik ke pertanyaan populer'
export const HELP_OPEN_TOPIC = 'Buka topik'
export const HELP_FEEDBACK_QUESTION = 'Apakah artikel ini membantu?'
export const HELP_FEEDBACK_THANKS = 'Senang bisa membantu! 💚'
export const HELP_PRO_TIP_LABEL = '💡 Perlu Tahu'
export const HELP_PRIVACY_SHIELD =
  'Kami nggak bisa mengakses data transaksimu. Kalau ada masalah teknis, kirim screenshot, kami bantu tanpa melihat datamu.'
export const HELP_SUPPORT_FOOTNOTE = 'Balasan langsung dari founder, bukan bot, bukan tiket.'
export const HELP_EXPORT_LABEL = 'Export Data Saya (JSON)'
export const HELP_CONTACT_LABEL = 'Hubungi Founder'
/* Revisi 11 Nov 2026 (pemilik produk): pintu kontak berhenti jadi tombol
   MELAYANG di pojok layar — ia menutupi navigasi bawah & terasa menempel di
   atas konten. Sekarang ia blok biasa di KAKI halaman, jadi tetap ada tetapi
   tidak menghalangi apa pun. Judulnya dipisah dari label tombol supaya blok
   itu punya kalimat pembuka sendiri. */
export const HELP_CONTACT_SECTION_TITLE = 'Masih butuh manusia?'
export const HELP_CONTACT_SUBJECT = 'Butuh Bantuan - CatetInd'
export const HELP_CONTACT_TO = 'halo@catetind.com'
export const HELP_EXPORT_TOAST =
  'File JSON-nya udah masuk perangkatmu 📦 Cuma kamu yang punya salinannya.'

/* ── 7. KAKI HALAMAN: jalan ke dokumen legal ────────────────────────────────
   Pusat Bantuan menjawab pertanyaan "data aku aman nggak?" (topik "Keamanan &
   Privasi"), jadi jawabannya harus bisa ditelusuri sampai dokumen tertulisnya.
   Tanpa tautan ini, `/privacy` & `/terms` hanya bisa ditempuh dari Pengaturan —
   padahal orang yang paling skeptis justru sampai ke sini lebih dulu.

   Nama tiap dokumen diambil dari file datanya masing-masing
   (`lib/legal/privacy.ts` & `lib/legal/terms.ts`) supaya satu dokumen tidak
   pernah disebut dengan dua nama berbeda. `/terms` baru ditautkan di sini
   SETELAH route-nya benar-benar ada (prompt 13) — bukan lebih dulu. */
export const HELP_LEGAL_NOTE = 'Dokumen resmi:'
export const HELP_LEGAL_LINKS: { href: string; label: string }[] = [
  { href: '/privacy', label: PRIVACY_LINK_COPY.label },
  { href: '/terms', label: TERMS_LINK_COPY.label },
]

/* ── 5b. HALAMAN BANTUAN PUBLIK `/bantuan` ──────────────────────────────────
   Kenapa ada dua halaman bantuan (dan kenapa itu SENGAJA):

     · `/help`    → Pusat Bantuan DI DALAM app. Memakai `ScreenShell`, jadi ia
                    menampilkan sidebar + navigasi app (Dompet, Budget, Insight,
                    …) dan tombol "Export Data Saya". Halaman ini WAJIB di balik
                    login (lihat `lib/public-routes.ts`).
     · `/bantuan` → halaman ini. Untuk pengunjung yang BELUM masuk — termasuk
                    orang yang menekan "Emailmu nggak ketemu? Kabarin kami di
                    Pusat Bantuan" di halaman masuk. Isinya hanya artikel bantuan
                    + jalan kontak: TIDAK ada sidebar, TIDAK ada data keuangan,
                    dan TIDAK ada jalan langsung ke dashboard. Jadi aturan
                    "tidak ada yang masuk app kecuali lewat login" tetap utuh,
                    sementara user tidak dijebak di tautan yang memantul balik ke
                    halaman masuk.

   Semua copy halaman publik tinggal di sini supaya komponen landanya nol string
   user-facing (konvensi `lib/data/landing.ts`). */
export const PUBLIC_HELP_PATH = '/bantuan'

export const PUBLIC_HELP_COPY = {
  eyebrow: HELP_TITLE,
  title: 'Ada yang bikin bingung?',
  subtitle:
    'Semua jawaban di bawah ini bisa dibaca tanpa akun. Kalau masih mentok, kabarin kami, balasan datang dari manusia, bukan bot.',
  description:
    'Pusat Bantuan CatetInd: jawaban singkat soal paket, nyatet keuangan, AI, dan privasi, bisa dibaca tanpa akun. Masih bingung? WhatsApp atau email tim CatetInd.',
  meta: `${totalHelpArticles()} artikel · ${HELP_TOPICS.length} topik`,
  searchLabel: HELP_SEARCH_LABEL,
  searchPlaceholder: HELP_SEARCH_PLACEHOLDER,
  searchClearLabel: 'Hapus pencarian',
  quickTitle: HELP_DEFAULT_TITLE,
  topicsTitle: 'Jelajahi topik',
  topicsLabel: 'Topik bantuan',
  resultTitle: HELP_RESULT_TITLE,
  emptyTitle: HELP_EMPTY_TITLE,
  emptyBody: 'Coba kata kunci lain, atau kabarin kami lewat WhatsApp/email di bawah.',
  proTipLabel: HELP_PRO_TIP_LABEL,
  supportTitle: 'Masih butuh bantuan?',
  supportBody:
    'Emailmu nggak ketemu atau ada yang terasa aneh? Kabarin kami langsung. Kami tidak bisa melihat datamu, jadi sertakan screenshot kalau masalahnya soal tampilan.',
  whatsappCta: 'Chat WhatsApp',
  emailCta: 'Kirim email',
  loginTitle: 'Sudah punya akun?',
  loginBody: 'Dashboard dan catatan keuanganmu ada di balik login.',
  loginCta: 'Masuk ke CatetInd',
  loginHref: LOGIN_PATH,
  registerCta: 'Belum punya akun? Lihat paket',
  registerHref: '/checkout',
  footerNote:
    'Halaman bantuan ini terbuka untuk siapa saja dan tidak menampilkan data keuangan siapa pun.',
} as const
