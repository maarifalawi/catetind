/* ── Pusat Bantuan (/app/help, inventaris #30) · Domain 4C ───────────────────
   Satu sumber data + logika MURNI (tanpa React) untuk halaman bantuan:

    1. STATUS SISTEM — satu strip kecil yang HANYA muncul kalau ada yang tidak
       normal ("no news is good news"). Kalau semua hijau, halaman tidak punya
       elemen itu sama sekali — ini yang menjaga bantuan tetap bersih.
    2. TOPIK + ARTIKEL — 9 grup topik, masing-masing punya `blurb` (sapaan
       Minca) dan artikel berisi langkah bernomor + `proTip` ("Perlu Tahu").
       Gaya copy WAJIB suara Minca: santai, hangat, bahasa sehari-hari.
    3. QUICK ANSWERS — 5 pertanyaan yang paling sering bikin panik. Ini konten
       DEFAULT saat belum ada topik yang dipilih.
    4. PENCARIAN — `searchHelp()` mencocokkan judul + isi (langkah, proTip,
       pertanyaan, jawaban) secara real-time, tanpa index eksternal.
    5. PAYLOAD EXPORT — `buildHelpExportPayload()` menyusun JSON untuk tombol
       "Export Data Saya" di dalam deflection loop (PRD Domain 4C, Mekanisme 1).
       Di produksi data ini di-compile di server lalu dikirim ke email user
       sendiri; di prototipe ini disusun di klien supaya tombolnya bekerja.

   Catatan: semua angka/teks di bawah masih MOCK. Begitu endpoint asli siap,
   cukup ganti nilai di file ini — komponen halaman hanya membaca turunan dari
   sini, jadi tidak ada teks yang perlu diburu di JSX.
   ────────────────────────────────────────────────────────────────────────── */

import { INITIAL_BILLS } from './bills'
import { INITIAL_SINKING_FUNDS } from './budget'
import { INITIAL_DEBTS, INITIAL_INVESTMENTS } from './wealth'
import { ALL_TRANSACTIONS } from './transactions'
import { PRIVACY_LINK_COPY } from '../legal/privacy'
import { TERMS_LINK_COPY } from '../legal/terms'
import { INITIAL_WALLETS, INITIAL_WALLET_ACCOUNTS } from '../wallets'

/* ── 1. STATUS SISTEM ─────────────────────────────────────────────────────── */

/** tingkat kesehatan satu subsistem */
export type SystemHealth = 'operational' | 'degraded' | 'down'

export interface SystemStatus {
  /** sinkronisasi data & backup transaksi */
  dataSync: SystemHealth
  /** mesin AI Coach (Minca) */
  aiEngine: SystemHealth
}

/** mock state — sengaja `aiEngine: 'degraded'` supaya strip statusnya terlihat */
export const SYSTEM_STATUS: SystemStatus = {
  dataSync: 'operational',
  aiEngine: 'degraded',
}

/** nama subsistem seperti yang dibaca user (bukan nama teknis) */
export const SYSTEM_NAME: Record<keyof SystemStatus, string> = {
  dataSync: 'Data & Backup',
  aiEngine: 'AI Coach',
}

/**
 * Emoji + kalimat status. Titik berwarna dipakai sebagai penanda cepat, bukan
 * ikon baru: hijau = jalan normal, kuning = sedang antri, merah = ada gangguan.
 */
export const HEALTH_COPY: Record<SystemHealth, { emoji: string; label: string }> = {
  operational: { emoji: '🟢', label: 'Normal' },
  degraded: { emoji: '🟡', label: 'Sedang antri, mungkin agak lambat' },
  down: { emoji: '🔴', label: 'Lagi gangguan, tim kami udah meluncur' },
}

export interface SystemIndicator {
  key: keyof SystemStatus
  /** mis. "Data & Backup" */
  name: string
  /** mis. "🟢" */
  emoji: string
  /** mis. "Normal" */
  label: string
  health: SystemHealth
}

/** urutan subsistem di strip — data sync dulu, lalu AI */
const SYSTEM_ORDER: (keyof SystemStatus)[] = ['dataSync', 'aiEngine']

/**
 * "No news is good news": strip status hanya layak tampil kalau MINIMAL satu
 * subsistem tidak normal. Semua `operational` → strip disembunyikan total.
 */
export function hasSystemIssue(status: SystemStatus = SYSTEM_STATUS): boolean {
  return SYSTEM_ORDER.some((key) => status[key] !== 'operational')
}

/** baris indikator siap render (emoji + nama + kalimat status) */
export function systemIndicators(status: SystemStatus = SYSTEM_STATUS): SystemIndicator[] {
  return SYSTEM_ORDER.map((key) => {
    const health = status[key]
    const copy = HEALTH_COPY[health]
    return {
      key,
      name: SYSTEM_NAME[key],
      emoji: copy.emoji,
      label: copy.label,
      health,
    }
  })
}

/* ── 2. TOPIK + ARTIKEL ───────────────────────────────────────────────────── */

export interface HelpArticle {
  /** id stabil — dipakai sebagai key React & penanda state feedback per artikel */
  id: string
  /** mis. "Cara Catat Transaksi dalam 4 Tap" */
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
    blurb: 'Baru kenalan sama CatetInd? Dua menit di sini, sisanya gue yang urus.',
    articles: [
      {
        id: 'mulai-siapin',
        title: 'Siapin CatetInd dalam 2 Menit',
        steps: [
          'Isi nama kamu — nama panggilan juga boleh, gue yang bakal manggil 😄',
          'Masukin penghasilan bulanan. Nggak harus pas, perkiraan aja dulu.',
          'Pilih situasi kamu (mahasiswa, kerja, freelance) biar saran gue lebih nyambung.',
          'Lihat tanamanmu muncul di dashboard. Dia tumbuh tiap kamu rajin nyatet 🌱',
        ],
        proTip:
          'Belum siap masukin angka? Skip aja. Semua isian bisa diubah kapan aja lewat Pengaturan → Profil.',
      },
      {
        id: 'mulai-tanaman',
        title: 'Tanaman Gue Ngapain Sih?',
        steps: [
          'Dia bukan hiasan — dia ringkasan visual kebiasaan catat kamu.',
          'Catat tiap hari → dia tumbuh, dari benih sampai mekar 🌸',
          'Skip beberapa hari → dia agak lesu. Nggak mati, cuma ngambek dikit.',
          'Makin sehat tanamanmu, makin tajam saran yang gue kasih.',
        ],
        proTip:
          'Status tanaman nggak pernah mengunci fitur apa pun. Dia teman visual, bukan hakim.',
      },
    ],
  },
  {
    id: 'catat-transaksi',
    label: 'Catat Transaksi',
    emoji: '✍️',
    blurb: 'Empat tap, lalu balik ke hidupmu. Segitu doang.',
    articles: [
      {
        id: 'catat-4-tap',
        title: 'Cara Catat Transaksi dalam 4 Tap',
        steps: [
          'Tap tombol + gede di tengah bawah',
          'Masukin angkanya (nggak perlu ketik "Rp")',
          'Pilih kategori — atau biarin Minca yang nebak otomatis',
          'Done! Cuma 4 tap.',
        ],
        proTip:
          'Ketik aja "kopi 25rb" di kolom catatan. Gue pecah sendiri jadi nominal + kategori, kamu nggak perlu pindah field.',
      },
      {
        id: 'catat-koreksi-ai',
        title: 'Minca Salah Nebak Kategori, Gimana?',
        steps: [
          'Tap transaksinya di Riwayat atau di kartu "Transaksi Terakhir".',
          'Pilih Edit, terus ganti kategorinya.',
          'Gue belajar dari koreksi kamu — beberapa kali koreksi biasanya cukup buat nangkep polanya.',
          'Nggak mau nunggu? Set aturan tetap di Pengaturan → Kategori (mis. "kopi" selalu Makanan).',
        ],
        proTip:
          'Merchant yang sama salah terus? Itu tanda paling jelas buat bikin aturan tetap, bukan ngoreksi manual tiap hari.',
      },
      {
        id: 'catat-offline',
        title: 'Catat Pas Nggak Ada Sinyal, Bisa?',
        steps: [
          'Bisa banget. Catat kayak biasa — gue simpan dulu di HP kamu.',
          'Transaksinya muncul dengan ikon jam kecil ⏳ artinya masih ngantri kirim.',
          'Begitu sinyal balik, semuanya otomatis terkirim. Kamu nggak perlu ngapa-ngapain.',
          'Kalau setelah 5 menit masih gagal, gue kasih tanda + tombol "Coba Lagi".',
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
    blurb: 'Batasnya kamu yang nentuin. Gue cuma yang ingetin, bukan yang nyuruh.',
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
        title: 'Budget Gue Lewat, Panik Nggak?',
        steps: [
          'Nggak usah. Gue nggak pakai warna merah buat ngagetin kamu — ada aksen sendiri buat "lewat batas".',
          'Kartunya bilang kamu lewat berapa, dan sisa hari di bulan ini masih berapa.',
          'Kalau porsinya memang kurang realistis, tap kategori → "Sesuaikan Budget".',
          'Kalau cuma boros minggu ini, gue kasih tahu kebiasaan mana yang paling nyumbang.',
        ],
        proTip:
          'Lewat berturut-turut 3 bulan di kategori yang sama? Itu tandanya budgetnya yang perlu diubah, bukan kamu.',
      },
      {
        id: 'budget-target-nabung',
        title: 'Bikin Target Nabung (Sinking Fund)',
        steps: [
          'Buka tab Target Nabung, tap "Tambah Target".',
          'Isi tujuannya: "Dana darurat", "Laptop baru", "Tiket konser" — apa aja, gue nggak nge-judge.',
          'Masukin nominal target + tenggatnya. Gue hitung sendiri berapa yang perlu kamu sisihkan per bulan.',
          'Tiap kamu sisihkan duit, targetnya naik dan benihnya ikut tumbuh 🌱',
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
          'Tagihan yang nominalnya nggak tetap (listrik, air) boleh dikosongin — gue bakal tanya pas kamu tandai lunas.',
      },
      {
        id: 'tagihan-reminder',
        title: 'Reminder-nya Datang di Mana?',
        steps: [
          'Default: push notification H-3 sebelum jatuh tempo.',
          'Aktifin push dulu — banner di halaman Tagihan akan nawarin.',
          'Di iPhone, push cuma jalan kalau CatetInd udah di-install ke Home Screen. Itu aturan iOS, bukan salah kita 😅',
          'Nggak mau notif sama sekali? Matiin di Pengaturan → Notifikasi, aplikasinya tetap jalan penuh.',
        ],
        proTip:
          'Pembayaranmu nggak pernah otomatis didebit. CatetInd nggak nyambung ke rekening bank — gue cuma ngingetin.',
      },
      {
        id: 'tagihan-lunas',
        title: 'Nandain Tagihan Udah Dibayar',
        steps: [
          'Tap kartu tagihannya.',
          'Klik "Tandai Lunas". Kalau nominalnya masih kosong, gue minta isi dulu.',
          'Gue otomatis bikin transaksi pengeluaran + kurangi budget kategori itu.',
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
    blurb: 'Duit bareng pasangan, teman kos, atau tim trip. Transparan, tapi tetap ada privasi.',
    articles: [
      {
        id: 'dompet-privat',
        title: 'Cara Nyembunyiin Pengeluaran dari Pasangan',
        steps: [
          'Buka Dompet Kita, tap transaksi yang mau kamu sembunyiin.',
          'Nyalain toggle 🔒 Privat.',
          'Nama itemnya berubah jadi "Pengeluaran Privat" — pasanganmu nggak lihat kamu beli apa.',
          'Nominalnya tetap kehitung di patungan, jadi pembagiannya tetap fair.',
        ],
        proTip:
          'Privasi itu dua arah: pasanganmu juga punya toggle yang sama. Nggak ada yang bisa lihat daftar privat orang lain.',
      },
      {
        id: 'dompet-buat',
        title: 'Bikin Dompet Kita Bareng Siapa Aja?',
        steps: [
          'Tap "Buat Dompet Kita" → kasih nama (mis. "Kos Melati", "Dana Trip Bali").',
          'Bagikan kode 6 karakter ke orang yang mau kamu ajak.',
          'Mereka buka kodenya, login, langsung gabung — nggak ada proses persetujuan yang ribet.',
          'Satu dompet maksimal 2 orang, biar pembagiannya selalu jelas.',
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
          'Transaksi privat tetap dihitung, cuma nama itemnya disamarkan — nominalnya tetap bisa kamu cek.',
          'Ada yang salah catat? Tap transaksinya → Edit. Angka settlement ikut berubah otomatis.',
        ],
        proTip:
          'Setelah Lunas, semua catatannya tetap ada. Riwayat nggak pernah dihapus, cuma ditandai selesai.',
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
        title: 'Catat Investasi & Aset Pertama',
        steps: [
          'Buka Kekayaan & Hutang → tab Investasi → "Tambah Investasi".',
          'Pilih jenisnya: reksadana, saham, emas, atau properti.',
          'Isi jumlah unit + harga belinya. Gue yang hitung nilai dan return-nya.',
          'Punya aset lama yang dibeli setahun lalu? Pilih "Sudah punya" — saldo dompetmu nggak ikut terpotong.',
        ],
        proTip:
          'Harga sebagian aset di-refresh berkala. Kalau angkanya keliatan basi, gue kasih tanda + tombol update manual.',
      },
      {
        id: 'kekayaan-hutang-catat',
        title: 'Daftarin Hutang Tanpa Rasa Malu',
        steps: [
          'Tab Hutang → "Tambah Hutang".',
          'Isi total pinjaman, cicilan per bulan, dan sisa tenornya.',
          'Gue hitung rasio cicilan vs penghasilanmu — kalau masuk zona aman, santai aja.',
          'Nyalain Debt Snowball: gue urutin dari hutang terkecil biar kamu cepat dapat kemenangan pertama.',
        ],
        proTip:
          'Hutang ke teman juga boleh dicatat di sini. Nyatet bukan berarti kamu lagi kenapa-napa, cuma biar nggak lupa.',
      },
      {
        id: 'kekayaan-networth',
        title: 'Net Worth Gue Kok Turun?',
        steps: [
          'Lihat Net Worth bar di bagian atas halaman.',
          'Bandingin dua sisinya: total aset dan total hutang.',
          'Aset turun biasanya karena harga pasar (saham/emas), bukan karena kamu salah.',
          'Hutang turun itu kabar bagus — walau angka "total"-nya jadi kelihatan lebih kecil.',
        ],
        proTip:
          'Lihat tren per bulan, bukan per hari. Kamu nggak bisa menilai keuangan dari satu hari yang jelek.',
      },
    ],
  },
  {
    id: 'ai-coach',
    label: 'AI Coach (Minca)',
    emoji: '✨',
    blurb: 'Itu gue. Kerja 24 jam, nggak pernah nge-judge pengeluaranmu.',
    articles: [
      {
        id: 'ai-cara-nanya',
        title: 'Cara Nanya Biar Jawaban Gue Bagus',
        steps: [
          'Tap balon chat di pojok kanan bawah.',
          'Nanya pakai bahasa sehari-hari aja: "boros nggak nih bulan ini?"',
          'Makin spesifik makin tajam: "bulan lalu gue keluar berapa buat kopi?"',
          'Gue jawab dari data kamu sendiri — nggak ada banding-bandingin sama pengguna lain.',
        ],
        proTip:
          'Ketik "scan struk" atau foto struknya langsung. Gue baca nominal + kategorinya, kamu tinggal konfirmasi.',
      },
      {
        id: 'ai-token-habis',
        title: 'Token AI Habis, Ngapain?',
        steps: [
          'Buka Pengaturan → AI Token → pilih paket isi ulang.',
          'Atau lebih hemat: buka halaman "Ajak Teman" dan bagikan link referralmu.',
          '1 teman yang berlangganan = Token AI gratis 1 bulan, masuk otomatis tanpa klaim.',
          'Token dan Voice dihitung terpisah, jadi kamu bisa lihat mana yang lebih cepat habis.',
        ],
        proTip:
          'Sisa kuota selalu kelihatan di kartu "Bahan Bakar AI" pada sidebar. Nggak ada kejutan mendadak.',
      },
      {
        id: 'ai-lambat',
        title: 'Jawaban Gue Lama, Kenapa?',
        steps: [
          'Kalau di bagian atas halaman ini ada tanda kuning, artinya antrean gue sedang panjang.',
          'Coba lagi beberapa menit. Pertanyaanmu nggak hilang, kok.',
          'Kalau kamu sedang offline, gue bakal bilang jawabannya pakai data lama.',
          'Masih lama? Tunggu sampai statusnya balik hijau — tim kami cepat sadar dan langsung benerin.',
        ],
        proTip:
          'Gue nggak akan ngarang angka. Kalau datanya belum cukup, gue bilang belum cukup.',
      },
    ],
  },
  {
    id: 'keamanan-privasi',
    label: 'Keamanan & Privasi',
    emoji: '🔒',
    blurb: 'Ini bagian yang paling gue banggain: apa yang kami SENDIRI nggak bisa lihat.',
    articles: [
      {
        id: 'privasi-siapa-lihat',
        title: 'Siapa Sih yang Bisa Lihat Data Keuangan Gue?',
        steps: [
          'Jawaban singkatnya: cuma kamu. Titik.',
          'Tim CatetInd — termasuk founder — nggak punya endpoint atau admin panel buat buka data transaksi individual.',
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
          'Statusnya berlaku ke seluruh halaman (dashboard, budget, riwayat) — nggak perlu diulang.',
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
          'Simpan di HP atau laptop kamu sendiri — nggak ada yang perlu kamu minta izin dulu.',
          'Mau berhenti langganan tahun depan? Datamu tetap bisa kamu export kapan saja.',
        ],
        proTip:
          'File export dibuat buat kamu, bukan buat kami. Kami nggak punya salinannya.',
      },
    ],
  },
  {
    id: 'langganan-pembayaran',
    label: 'Langganan & Pembayaran',
    emoji: '💳',
    blurb: 'Bayar, berhenti, isi ulang — tombolnya ada di depan semua, nggak disembunyiin.',
    articles: [
      {
        id: 'langganan-stop',
        title: 'Cara Stop Langganan (Nggak Ribet)',
        steps: [
          'Buka Pengaturan → Langganan.',
          'Tap tombol "Jangan Perpanjang".',
          'Selesai. Nggak ada telepon CS, nggak ada pertanyaan "yakin mau berhenti?".',
          'Datamu tetap bisa di-export kapan aja, termasuk setelah berhenti.',
        ],
        proTip:
          'CatetInd nggak pakai auto-debit diam-diam. Masa aktif habis dan kamu nggak bayar = aplikasi berhenti, tanpa tagihan nyempil.',
      },
      {
        id: 'langganan-metode',
        title: 'Bayar Pakai Apa Aja?',
        steps: [
          'QRIS (paling cepat), transfer bank, atau kartu.',
          'Setelah bayar, masa aktif langsung nambah — kadang cuma hitungan detik.',
          'Bayar lagi sebelum masa aktifnya habis? Harinya ditumpuk, bukan direset.',
          'Metode favoritmu belum ada? Kabarin kami lewat tombol di bawah artikel ini ya.',
        ],
        proTip:
          'Simpan bukti pembayarannya. Kalau aksesmu belum kebuka dalam 1 jam, kirim bukti itu ke kami.',
      },
      {
        id: 'langganan-refund',
        title: 'Refund & Salah Bayar',
        steps: [
          'Kelewat bayar dua kali? Duitnya nggak hilang — bakal ditumpuk jadi masa aktif.',
          'Kalau mau dikembalikan: klik 👎 di bawah artikel ini, terus pilih "Hubungi Founder".',
          'Sertakan screenshot bukti bayarnya. Nggak ada data transaksi yang perlu kamu bocorin ke kami 🙂',
          'Yang menangani langsung founder, bukan tim CS berlapis.',
        ],
        proTip:
          'Cukup screenshot bagian yang bermasalah. Jangan kirim data yang nggak perlu — sekecil apa pun itu.',
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
}

export const HELP_QUICK_ANSWERS: QuickAnswer[] = [
  {
    id: 'saldo-sinkron',
    question: 'Kok saldo gue kayaknya nggak sinkron?',
    answer:
      'Tenang, ini biasanya karena ada transaksi yang belum ke-sync (misal kamu tadi offline). Coba tarik ke bawah buat refresh. Kalau masih beda, cek di Riwayat — mungkin ada yang kedobel atau belum tercatat.',
    topic: 'Catat Transaksi',
  },
  {
    id: 'sembunyi-transaksi',
    question: 'Cara nyembunyiin pengeluaran dari pasangan?',
    answer:
      'Di Dompet Kita, setiap transaksi punya toggle 🔒 Privat. Kalau kamu nyalain ini, pasanganmu tetap bisa lihat nominalnya masuk ke perhitungan patungan, tapi nama itemnya jadi "Pengeluaran Privat". Jadi nggak ketahuan beli apa, tapi duitnya tetap kejitung fair.',
    topic: 'Dompet Kita (Joint Wallet)',
  },
  {
    id: 'stop-langganan',
    question: 'Gimana cara stop langganan? Ribet nggak?',
    answer:
      'Nggak ribet sama sekali. Buka Settings → Langganan → Tombol "Jangan Perpanjang". Selesai. Nggak ada dark pattern, nggak ada telepon CS, nggak ada pertanyaan "yakin mau berhenti?". Datamu tetap bisa di-export kapan aja.',
    topic: 'Langganan & Pembayaran',
  },
  {
    id: 'aman-data',
    question: 'Aman nggak sih data keuangan gue di sini?',
    answer:
      'Super aman. Bahkan tim CatetInd sendiri — termasuk founder — TIDAK BISA melihat data transaksi kamu. Ini bukan janji marketing, ini arsitektur database-nya yang memang nggak memungkinkan. Nggak ada endpoint, nggak ada admin panel yang bisa intip data individual.',
    topic: 'Keamanan & Privasi',
  },
  {
    id: 'token-habis',
    question: 'Token AI gue habis, beli lagi di mana?',
    answer:
      'Buka Settings → AI Token → Pilih paket isi ulang. Atau lebih hemat: ajak 1 teman pakai link referral kamu di halaman "Ajak Teman", dan kamu langsung dapat Token AI gratis 1 bulan!',
    topic: 'AI Coach (Minca)',
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

export const HELP_EYEBROW = 'Bantuan & Panduan'
export const HELP_TITLE = 'Pusat Bantuan'
export const HELP_GREETING =
  'Hai, gue Minca 🌱 Nggak perlu baca manual 200 halaman. Cari, klik, kelar. Kalau masih mentok, ada jalan buat ngobrol langsung sama founder.'
export const HELP_SIDEBAR_TITLE = 'Mau bahas apa hari ini?'
export const HELP_DEFAULT_TITLE = 'Sering Bikin Bingung'
export const HELP_DEFAULT_BLURB =
  'Pertanyaan yang paling sering mampir ke kepala pengguna CatetInd 👇 Klik kartunya, jawabannya langsung kebuka di sini.'
export const HELP_SEARCH_PLACEHOLDER = 'Cari bantuan... contoh: "cara sembunyiin transaksi"'
export const HELP_SEARCH_LABEL = 'Cari di pusat bantuan'
export const HELP_RESULT_TITLE = 'Hasil pencarian'
export const HELP_EMPTY_TITLE = 'Gue nggak nemu yang pas 😅'
export const HELP_EMPTY_BLURB =
  'Coba kata kunci lain (mis. "privasi", "langganan", "nabung", "offline") atau pilih topik di samping. Kalau memang artikelnya belum ada, kasih tahu gue lewat tombol 👎 di artikel mana pun.'
export const HELP_BACK_TO_QUICK = 'Balik ke pertanyaan populer'
export const HELP_OPEN_TOPIC = 'Buka topik'
export const HELP_FEEDBACK_QUESTION = 'Apakah artikel ini membantu?'
export const HELP_FEEDBACK_THANKS = 'Senang bisa membantu! 💚'
export const HELP_PRO_TIP_LABEL = '💡 Perlu Tahu'
/** catatan kecil di sidebar: kasih tahu jalan ke support TANPA membuka gerbangnya */
export const HELP_SIDEBAR_NOTE =
  'Nggak nemu jawabannya? Buka artikel mana pun, klik 👎 di bawahnya, dan tombol buat ngobrol langsung sama founder bakal muncul di situ.'
export const HELP_PRIVACY_SHIELD =
  'Tim CatetInd tidak bisa mengakses data transaksi kamu — ini adalah jaminan privasi kami. Jika kamu mengalami masalah teknis, mohon sertakan screenshot layar yang bermasalah saat menghubungi support. Ini membantu kami mendebug masalah tanpa melihat data personal kamu.'
export const HELP_SUPPORT_FOOTNOTE =
  'Balasan datang langsung dari founder — bukan bot, bukan tiket yang nyangkut antre.'
export const HELP_EXPORT_LABEL = 'Export Data Saya (JSON)'
export const HELP_CONTACT_LABEL = 'Hubungi Founder'
export const HELP_CONTACT_SUBJECT = 'Butuh Bantuan - CatetInd'
export const HELP_CONTACT_TO = 'support@catetind.com'
export const HELP_EXPORT_TOAST =
  'File JSON-nya udah ke-download ke perangkatmu 📦 Nggak ada satu pun orang di CatetInd yang punya salinannya.'

/* ── 7. KAKI HALAMAN: jalan ke dokumen legal ────────────────────────────────
   Pusat Bantuan menjawab pertanyaan "data gue aman nggak?" (topik "Keamanan &
   Privasi"), jadi jawabannya harus bisa ditelusuri sampai dokumen tertulisnya.
   Tanpa tautan ini, `/privacy` & `/terms` hanya bisa ditempuh dari Pengaturan —
   padahal orang yang paling skeptis justru sampai ke sini lebih dulu.

   Nama tiap dokumen diambil dari file datanya masing-masing
   (`lib/legal/privacy.ts` & `lib/legal/terms.ts`) supaya satu dokumen tidak
   pernah disebut dengan dua nama berbeda. `/terms` baru ditautkan di sini
   SETELAH route-nya benar-benar ada (prompt 13) — bukan lebih dulu. */
export const HELP_LEGAL_NOTE =
  'Jaminan privasi dan aturan layanan di halaman ini punya versi tertulis, lengkap dengan tanggal versinya:'
export const HELP_LEGAL_LINKS: { href: string; label: string }[] = [
  { href: '/privacy', label: PRIVACY_LINK_COPY.label },
  { href: '/terms', label: TERMS_LINK_COPY.label },
]

/* ── 6. EXPORT DATA (PRD Domain 4C, Mekanisme 1) ──────────────────────────── */

export interface HelpExportPayload {
  exported_at: string
  source: 'catetind.app/help'
  /** pengingat di dalam file: tidak ada manusia di CatetInd yang membacanya */
  note: string
  data: {
    wallets: typeof INITIAL_WALLETS
    /** akun bank/e-wallet yang tersambung sebagai sumber saldo */
    wallet_accounts: typeof INITIAL_WALLET_ACCOUNTS
    transactions: typeof ALL_TRANSACTIONS
    bills: typeof INITIAL_BILLS
    sinking_funds: typeof INITIAL_SINKING_FUNDS
    debts: typeof INITIAL_DEBTS
    investments: typeof INITIAL_INVESTMENTS
  }
}

/**
 * Susun payload export versi KLIEN (prototipe). Bentuk objeknya sengaja dibuat
 * sama seperti respons `/api/user/export` di PRD Domain 4C supaya begitu
 * endpoint aslinya siap, komponen halaman tidak perlu diubah — cukup ganti
 * sumbernya dari mock ke `fetch`.
 */
export function buildHelpExportPayload(now: Date = new Date()): HelpExportPayload {
  return {
    exported_at: now.toISOString(),
    source: 'catetind.app/help',
    note: 'File ini dibuat atas permintaanmu sendiri. Tim CatetInd tidak memiliki salinan datamu.',
    data: {
      wallets: INITIAL_WALLETS,
      wallet_accounts: INITIAL_WALLET_ACCOUNTS,
      transactions: ALL_TRANSACTIONS,
      bills: INITIAL_BILLS,
      sinking_funds: INITIAL_SINKING_FUNDS,
      debts: INITIAL_DEBTS,
      investments: INITIAL_INVESTMENTS,
    },
  }
}

/** nama file yang enak dibaca: catetind-export-2026-09-27.json */
export function helpExportFilename(now: Date = new Date()): string {
  /* `toISOString()` selalu UTC — dipotong saja tanggalnya, tanpa Intl, supaya
     server & klien menghasilkan nama file yang sama (tidak ada hydration drift) */
  return `catetind-export-${now.toISOString().slice(0, 10)}.json`
}
