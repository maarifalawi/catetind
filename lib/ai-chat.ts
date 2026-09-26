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
}

/** Domain 4B — sliding window: maks 10 pesan terakhir sebagai context window */
export const AI_CONTEXT_WINDOW = 10

/* Sisa kuota AI TIDAK didefinisikan di sini — angka itu milik `lib/ai-quota.ts`
   (satu sumber kebenaran). Widget AI Coach membaca `AI_REMAINING_PCT` dari sana
   supaya gauge di header tidak beda cerita dengan kartu sidebar / halaman Billing. */

/** C. Sapaan proaktif saat panel pertama dibuka — refer ke kondisi finansial user, bukan "Hello!" generik */
export const PROACTIVE_WELCOME: Omit<ChatMessage, 'id'> = {
  role: 'ai',
  kind: 'coaching',
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

/** G. Balasan generik selama API asli belum disambungkan */
export const MOCK_FALLBACK_REPLY =
  'Fitur AI Coach sedang dalam pengembangan. Nanti aku bisa bantu analisis keuanganmu secara real-time! 🌿'

/** D. Demo Quick Action — dipicu chip "Bantu atur ulang budget".
 *  `href` menuju halaman Budget yang SUDAH ada, tempat limit kategori dibuat:
 *  tombol demo yang berhenti dengan pesan "menyusul" lebih buruk daripada tombol
 *  yang mengantar user ke layar yang benar. */
export const MOCK_LIMIT_REPLY: Omit<ChatMessage, 'id'> = {
  role: 'ai',
  kind: 'coaching',
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
  content:
    'Makasih udah mau cerita, Jon! Ngomongin duit itu nggak gampang — dan kamu udah ambil langkah paling penting 💚',
}
