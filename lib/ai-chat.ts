// ---------------------------------------------------------------------------
// AI Coach CatetInd — kontrak data & konten mock (Domain 4B, DeepSeek V3).
// Semua copy AI Coach dikumpulkan di sini supaya hook (use-ai-chat) dan widget
// (ai-chat-widget) pakai satu sumber kebenaran — nanti tinggal diganti respons
// asli dari /api/ai/text tanpa menyentuh UI.
// ---------------------------------------------------------------------------

/** Siapa pengirim pesan */
export type ChatRole = 'user' | 'ai'

/**
 * Jenis pesan AI (Domain 3C):
 * - 'coaching'     → jawaban/coaching biasa
 * - 'appreciation' → pujian acak setelah user mencatat transaksi;
 *                    dapat treatment visual beda (highlight olive + sparkle)
 */
export type AIMessageKind = 'coaching' | 'appreciation'

/**
 * Tombol aksi inline di dalam bubble AI (Quick Actions, Domain 4B).
 *
 * `href` WAJIB: aksi AI yang tidak menuju ke mana-mana (tombol yang diam saat
 * ditekan) adalah janji kosong — dan widget ini dulu punya satu, tombol demo
 * tanpa tujuan yang menunggu disambungkan ke flow Budget. `kind` cuma memilih
 * ikon di UI (`create` = bikin sesuatu, `open` = buka halaman), jadi ikon tetap
 * tinggal di komponen dan maknanya tetap di data.
 */
export interface ChatAction {
  label: string
  /** route tujuan — harus route yang SUDAH ada di repo */
  href: string
  /** 'create' (ikon +) atau 'open' (ikon panah); default 'open' */
  kind?: 'create' | 'open'
}

export interface ChatMessage {
  id: string
  role: ChatRole
  kind: AIMessageKind
  content: string
  action?: ChatAction
  /**
   * Jawaban ini datang dari ATURAN LOKAL, bukan dari model AI (paket 44).
   *
   * Dipakai widget untuk mencetak label kecil **"belum pakai model"** di bubble
   * — keputusan produk paket 44: selama provider LLM belum tersambung (butuh API
   * key di server, lihat §AI prompt 44), copy tidak boleh menyiratkan kemampuan
   * yang belum ada. Jawaban berbasis data lokal tetap berguna, jadi ia TIDAK
   * dihapus — cuma diberi label yang jujur.
   */
  ruleBased?: boolean
}

/** Domain 4B — sliding window: maks 10 pesan terakhir sebagai context window */
export const AI_CONTEXT_WINDOW = 10

/* ── JALAN MENUJU AI YANG SUNGGUHAN (paket 44) ───────────────────────────────
   Label & route-nya tinggal di sini karena dipakai DUA tempat: tombol di bubble
   balasan jujur dan banner status di panel AI Coach. Satu literal, satu route —
   dan route-nya harus route yang SUDAH ada (`app/settings/ai/page.tsx`). */
export const AI_CONNECT_LABEL = 'Hubungkan AI'
export const AI_CONNECT_HREF = '/settings/ai'

/* Sisa kuota AI TIDAK didefinisikan di sini — angka itu milik
   `lib/ai-usage-store.ts` + `lib/ai-quota.ts` (satu sumber kebenaran). Widget AI
   Coach membaca `useAiQuota().remainingPct` dari sana supaya gauge di header
   tidak beda cerita dengan kartu sidebar / halaman Billing, dan angkanya BENAR-
   BENAR turun setiap kali user memakai AI (paket 42). */

/** C. Sapaan proaktif saat panel pertama dibuka — refer ke kondisi finansial user, bukan "Hello!" generik */
export const PROACTIVE_WELCOME: Omit<ChatMessage, 'id'> = {
  role: 'ai',
  kind: 'coaching',
  /** catatan finansial di kalimat ini dibaca dari DATA LOKAL app, bukan model */
  ruleBased: true,
  content:
    "Halo Jon! Sisa jatah kamu hari ini Rp 150.000 — masih aman nih. Btw, pengeluaran 'Kopi' minggu ini naik 35% dari minggu lalu. Mau aku bantu atur ulang limit jajan? ☕",
}

/** C. Quick-suggestion chips di bawah sapaan — tap = kirim sebagai pesan user */
export const QUICK_REPLIES = [
  'Analisis pengeluaran minggu ini',
  'Tips hemat bulan ini',
  'Bantu atur ulang budget',
  'Ceritain kondisi keuangan gue',
] as const

/**
 * G. AI BELUM TERSAMBUNG KE MODEL — jawaban jujur + jalan keluarnya (paket 44).
 *
 * Menggantikan `MOCK_FALLBACK_REPLY` yang berbunyi "Fitur AI Coach sedang dalam
 * pengembangan. Nanti aku bisa bantu analisis keuanganmu secara real-time!" —
 * kalimat yang (a) menjanjikan kemampuan yang belum ada, dan (b) tidak
 * menyebutkan satu pun jalan keluar, sehingga user hanya bisa menunggu.
 *
 * Versi ini melakukan tiga hal sekaligus: menyebut apa yang TIDAK bisa dilakukan,
 * menyebut apa yang MASIH bisa (pertanyaan yang jawabannya ada di data lokal),
 * dan menyediakan tombol menuju tempat AI benar-benar disambungkan.
 */
export const AI_NOT_CONNECTED_REPLY: Omit<ChatMessage, 'id'> = {
  role: 'ai',
  kind: 'coaching',
  content:
    'Jujur ya: aku belum tersambung ke model AI, jadi pertanyaan bebas belum bisa aku jawab. Yang bisa aku bantu sekarang: hal-hal yang jawabannya ada di data app kamu (pengeluaran hari ini, limit kategori, ringkasan arus uang). Mau aku bisa mikir lebih jauh? Hubungkan AI-nya dulu ya 🌿',
  action: { label: AI_CONNECT_LABEL, href: AI_CONNECT_HREF },
}

/** D. Demo Quick Action — dipicu chip "Bantu atur ulang budget".
 *  `href` menuju halaman Budget yang SUDAH ada, tempat limit kategori dibuat:
 *  tombol demo yang berhenti dengan pesan "menyusul" lebih buruk daripada tombol
 *  yang mengantar user ke layar yang benar. */
export const MOCK_LIMIT_REPLY: Omit<ChatMessage, 'id'> = {
  role: 'ai',
  kind: 'coaching',
  /** angkanya dibaca dari data lokal (Ringkasan/limit kategori mock) — bukan model */
  ruleBased: true,
  content:
    'Pengeluaran kopi kamu Rp 350.000 bulan ini. Mau aku buatin limit khusus buat kategori Kopi?',
  action: {
    label: 'Buat Limit Kopi Rp 200.000/bulan',
    href: '/budget',
    kind: 'create',
  },
}

/** F. Balasan untuk seed dari panel "Review Pengeluaran Hari Ini" (prompt 19).
 *  Seed-nya diperiksa SEBELUM pola lain supaya pertanyaan panel tidak jatuh ke
 *  balasan fallback "sedang dalam pengembangan" — panel yang baru menampilkan
 *  angka lengkap lalu dijawab "fitur menyusul" itu pengalaman yang bodoh.
 *  Angkanya sengaja TIDAK diulang di sini (panelnya sudah menampilkan) dan tidak
 *  ada klaim baru soal kondisi user; isinya ajakan melanjutkan obrolan. */
export const MOCK_SPENDING_REVIEW_REPLY: Omit<ChatMessage, 'id'> = {
  role: 'ai',
  kind: 'coaching',
  /** melanjutkan panel yang angkanya dihitung data lokal — tanpa model */
  ruleBased: true,
  content:
    'Barusan kita lihat bareng di panel ya — jadi aku nggak ngulang angkanya di sini 🌿 Mau lanjut yang mana dulu: rapikan limit kategori, atau cari celah buat nyisihin ke celengan?',
}

/* ── BAHASA SHELL PANEL AI COACH ─────────────────────────────────────────────
   Dulu kalimat-kalimat ini menempel di JSX widget (judul panel, placeholder
   composer, aria-label). Dipindahkan ke sini supaya aturan repo "semua copy
   user-facing tinggal sebagai konstanta" berlaku juga untuk widget chat, bukan
   cuma untuk halaman. */
export const AI_CHAT_COPY = {
  panelLabel: 'AI Coach CatetInd',
  title: 'AI Coach',
  /** label Fuel Gauge kuota AI di header panel */
  quota: (percent: number) => `${percent}% sisa`,
  inputPlaceholder: 'Tanya apa aja soal keuanganmu...',
  inputLabel: 'Ketik pesan untuk AI Coach',
  sendLabel: 'Kirim pesan',
  closeLabel: 'Tutup AI Coach',
  openLabel: 'Buka AI Coach',
  appreciationBadge: 'Apresiasi',
  quickRepliesLabel: 'Saran pertanyaan',
  /**
   * Label kecil di bubble yang jawabannya datang dari ATURAN LOKAL (paket 44).
   * Sengaja menyebut mekanismenya, bukan menyamarkan: user berhak tahu bahwa ia
   * belum bicara dengan model — dan bahwa pertanyaan bebas belum bisa dijawab.
   */
  ruleBasedBadge: 'belum pakai model',
  /**
   * Status AI di panel (paket 44, keputusan §AI = opsi b): provider LLM belum
   * tersambung karena belum ada API key yang boleh disimpan di server. Daripada
   * membiarkan janji "Nanti aku bisa analisis real-time", panelnya menjelaskan
   * keadaan hari ini + satu tombol ke tempat AI disambungkan.
   */
  notConnectedNote:
    'AI Coach masih menjawab dari aturan lokal (belum pakai model), jadi pertanyaan bebas belum bisa dijawab.',
  connectLabel: AI_CONNECT_LABEL,
  connectHint: 'Buka Pengaturan → AI',
} as const

/* ── COPY ALUR VOICE & SCAN STRUK (prompt 20) ────────────────────────────────
   Dua pintu masuk "AI-conversational-first" (PRD 192–193): bicara dan foto
   struk. Semua kalimatnya tinggal di sini supaya widget tidak pernah menyimpan
   copy di JSX, dan nadanya bisa diaudit sekali jalan.

   Nadanya mengikuti PRD 542–568: kolaboratif, bukan otoriter. "AI mengusulkan,
   user yang memutuskan" — karena itu setiap hasil selalu lewat kartu konfirmasi
   yang bisa diedit, dan setiap kegagalan teknis menyebut jalan keluarnya
   (ketik aja), bukan istilah mesin. */
export const AI_CAPTURE_COPY = {
  /* ── pemicu ─────────────────────────────────────────────────────────────── */
  scanLabel: 'Scan struk',
  voiceLabel: 'Catat pakai suara',
  voiceStopLabel: 'Selesai bicara',

  /* ── sedang membaca struk (PRD 399–400) ─────────────────────────────────── */
  readingTitle: 'Lagi baca struknya... ✨',
  readingHint: 'AI CatetInd lagi cocokin nominal & tanggalnya',

  /* ── sedang mendengar (PRD 512–518) ────────────────────────────────────── */
  listeningTitle: 'Lagi dengerin...',
  listeningHint: 'Bicara santai aja, nanti aku yang rapikan.',
  listeningPlaceholder: 'Belum kedengeran suara...',
  finish: 'Selesai',
  cancel: 'Batal',

  /* ── kartu konfirmasi (PRD 550 & A11) ──────────────────────────────────── */
  confirmIntro: 'AI udah bantu catat. Cek dulu ya, udah pas belum datanya?',
  confirmReceiptTitle: 'Struknya kebaca nih',
  confirmVoiceTitle: 'Ucapanmu udah aku rapikan',
  transcriptLabel: 'Yang aku denger',
  fieldLabels: {
    type: 'Tipe',
    name: 'Nama catatan',
    amount: 'Nominal',
    date: 'Tanggal',
    category: 'Kategori',
    wallet: 'Dompet',
  },
  /** PRD A11: confidence < 0.5 → AI wajib mengaku belum yakin */
  lowConfidenceAlarm: 'AI kurang yakin dengan hasil scan ini. Tolong cek ulang datanya ya ✨',
  /** penanda per-field di bawah field yang keyakinannya rendah */
  lowFieldHint: 'Yang ini aku belum yakin — boleh dicek dulu?',
  needAmount: 'Isi nominalnya dulu ya 🌿',
  /**
   * PAKET 54: hasil ekstraksi bisa datang tanpa kategori — itu keadaan sah saat
   * user mematikan "Kategorisasi Otomatis oleh AI" di Pengaturan
   * (`lib/ai-prefs.ts`), bukan hasil AI yang ragu. Karena itu kalimatnya bukan
   * "aku belum yakin", tapi ajakan memilih: kategori karangan tidak boleh
   * tersimpan, dan 'Lainnya' bukan pilihan kalau user belum memutuskan.
   */
  needCategory: 'Pilih kategorinya dulu ya 🌿 Kategori di Riwayat ikut pilihanmu.',
  /**
   * PAKET 55: parser suara bisa MENDENGAR kata "transfer", tapi jalur ini tidak
   * punya tempat menanyakan dompet TUJUAN — dan pindah dana tanpa tujuan bikin
   * saldo dompet berbeda dari cerita (uang keluar, tidak mendarat di mana pun).
   * Jadi kalimatnya mengarahkan ke alur yang benar, bukan menawarkan simpan.
   */
  needTransferFlow:
    'Ini kedengeran seperti pindah dana. Pindah dana dicatat lewat alur “Pindah Dana” ya — di situ dompet asal & tujuannya ditanyakan sekali jalan.',
  transferFlowCta: 'Buka Dompet & Akun → Pindah Dana',
  save: 'Catat ✓',
  /** dipakai kalau user mengosongkan nama catatannya sendiri */
  untitled: 'Catatan dari AI Coach',
  /** jaring aman kalau penyimpanan gagal (produksi: POST /api/transactions) */
  saveFailed: 'Aduh, gagal nyimpan. Coba lagi ya — data kamu aman kok.',
  saveFailedRetry: 'Coba simpan lagi',

  /* ── hasil ─────────────────────────────────────────────────────────────── */
  /** jejak user-side: foto yang barusan dipilih & transkrip yang barusan didengar */
  photoEcho: (fileName: string) => `📎 ${fileName}`,
  savedToast: {
    title: 'Sip, udah dicatet dengan aman! 🌿',
    description: (amount: string) => `${amount} masuk ke Riwayat — buka kapan aja buat ngecek.`,
  },
  saved: (name: string, amount: string) => `Beres! “${name}” — ${amount} udah masuk Riwayat 🌿`,
  viewHistory: 'Lihat riwayat',

  /* ── graceful degradation (prompt 20 butir 2) ───────────────────────────── */
  voiceUnsupported: 'Di perangkat ini belum bisa bicara — ketik aja ya, sama cepatnya 🌿',
  voiceDenied:
    'Izin mikrofonnya belum nyala. Boleh dinyalain dulu di pengaturan browser — atau ketik aja ya, sama enaknya 🌿',
  voiceNoSpeech: 'Aku belum denger suaranya. Coba lagi ya, atau ketik aja 🌿',
  voiceNoMic: 'Mikrofonnya belum kebaca di perangkat ini. Coba lagi, atau ketik aja ya 🌿',
  voiceNetwork: 'Sambungannya lagi goyang, jadi suaramu keputus. Ketik aja ya 🌿',
  voiceFailed: 'Aku keputus di tengah jalan. Coba lagi, atau ketik aja ya 🌿',
  problemRetry: 'Coba lagi',
  problemFallback: 'Oke, ketik aja',

  /* ── composer ──────────────────────────────────────────────────────────── */
  finishDraftFirst: 'Selesaikan dulu catatan di atas ya — sebentar aja 🌿',
} as const

/** E. Demo pesan Appreciation — di production dipicu event "transaksi tercatat" */
export const MOCK_APPRECIATION_REPLY: Omit<ChatMessage, 'id'> = {
  role: 'ai',
  kind: 'appreciation',
  /** pujian terkurasi (bukan hasil model) — labelnya jujur karena itu */
  ruleBased: true,
  content:
    'Makasih udah mau cerita, Jon! Ngomongin duit itu nggak gampang — dan kamu udah ambil langkah paling penting 💚',
}

/* ── STATUS AI DI HALAMAN PENGATURAN → AI (paket 44) ─────────────────────────
   Tombol "Hubungkan AI" di AI Coach menuju `/settings/ai`. Supaya tujuannya
   bukan jalan buntu, halaman itu menyebut keadaannya apa adanya: hari ini app
   menjawab dari aturan lokal, dan semua saklar di halaman ini baru berlaku penuh
   saat model AI disambungkan (butuh API key LLM yang disimpan SERVER-side —
   `§AI` opsi (a) prompt 44; belum ada di build ini, jadi keputusannya opsi (b)).

   Kalimatnya sengaja tidak menyebut "segera hadir" maupun tanggal: yang bisa
   dijanjikan tanpa backend hanya keadaan hari ini + apa yang tetap berguna. */
export const AI_STATUS_COPY = {
  badge: 'Belum tersambung ke model',
  title: 'Status AI hari ini',
  body: 'AI Coach CatetInd masih menjawab dari aturan lokal + data di perangkat ini, jadi preferensi di bawah belum dijalankan oleh model AI. Begitu provider AI disambungkan (butuh API key LLM yang disimpan di server — belum ada di build ini), semua saklar ini langsung berlaku apa adanya tanpa kamu atur ulang.',
  worksNow: 'Yang tetap jalan sekarang: catat transaksi manual (kategorinya kamu pilih sendiri — bukan tebakan app), scan struk, input suara, dan AI Coach menjawab dari data lokalmu.',
} as const
