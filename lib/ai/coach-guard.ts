// ---------------------------------------------------------------------------
// PAGAR JAWABAN AI COACH — MURNI (tanpa store, tanpa jaringan, tanpa JSX).
//
// Dua hal yang TIDAK BOLEH lagi lolos dari mulut AI Coach:
//
//   1. KLAIM AKSI yang tidak terjadi. Temuan uji pakai 8 Okt 2026: user mengetik
//      "makn gacoan 30k" → AI menjawab "sudah tercatat sebagai pengeluaranmu",
//      padahal Riwayat tetap kosong. Model memang TIDAK punya kemampuan menulis;
//      karena itu klaim seperti itu dilarang, dan ada pagar deterministik yang
//      memeriksa balasannya (`claimsRecordedAction`).
//
//   2. JAWABAN DI LUAR KONTEKS. Peran AI di app ini satu: menemani keuangan
//      pribadi user (PRD 244 + guardrail OJK). Pertanyaan koding, tugas sekolah,
//      politik, resep, atau soal AI-nya sendiri harus DITOLAK — bukan dijawab
//      sebagai asisten umum (`detectOutOfScope`).
//
// Kenapa modul ini dipakai DUA sisi (route server sebagai pagar terakhir, hook
// chat sebagai pagar pertama): supaya aturannya mustahil berbeda. Karena itu ia
// sengaja bebas dari store/hook — satu-satunya isinya aturan bahasa.
// ---------------------------------------------------------------------------

/**
 * Kata di dalam teks (huruf kecil, tanpa tanda baca). Dipakai bersama oleh
 * pencocokan persis & toleran-salah-ketik supaya keduanya membaca teks dengan
 * cara yang SAMA.
 */
function tokenizeWords(text: string): string[] {
  return text
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter(Boolean)
}

/**
 * Jarak edit (Levenshtein) dua kata — cukup untuk toleransi salah ketik ringan.
 * Implementasi dua baris (bukan matriks penuh) supaya murah dipanggil berkali-kali
 * dan tidak butuh dependency baru.
 */
export function editDistance(a: string, b: string): number {
  if (a === b) return 0
  const [short, long] = a.length <= b.length ? [a, b] : [b, a]
  /* beda panjang > 3 tidak mungkin relevan untuk ambang kita (maks 2) */
  if (long.length - short.length > 3) return long.length

  let prev: number[] = []
  for (let j = 0; j <= short.length; j += 1) prev[j] = j

  for (let i = 1; i <= long.length; i += 1) {
    const curr: number[] = [i]
    for (let j = 1; j <= short.length; j += 1) {
      const cost = long[i - 1] === short[j - 1] ? 0 : 1
      curr[j] = Math.min((prev[j] ?? 0) + 1, (curr[j - 1] ?? 0) + 1, (prev[j - 1] ?? 0) + cost)
    }
    prev = curr
  }
  return prev[short.length] ?? long.length
}

/**
 * Teks menyebut salah satu kata kunci — PERSIS, tanpa toleransi salah ketik.
 *
 * Dipakai untuk daftar yang salah tafsirnya MAHAL: menolak pertanyaan yang
 * sebenarnya sah lebih merugikan daripada menjawab satu pertanyaan nyasar. Kata
 * kunci berupa frasa ("kamu siapa") dicocokkan sebagai potongan teks.
 */
export function mentionsWord(
  text: string,
  keywords: readonly string[],
  options?: {
    /**
     * Ikut mencocokkan kata BERIMBUHAN ("pengeluaranku", "gajian", "resepnya").
     * Hanya berlaku untuk kata kunci ≥ 4 huruf supaya kata pendek tidak menelan
     * kata lain (mis. "pr" tidak boleh cocok dengan "pria").
     */
    allowSuffix?: boolean
  },
): boolean {
  const haystack = text.toLowerCase()
  const tokens = tokenizeWords(haystack)
  return keywords.some((keyword) => {
    const needle = keyword.toLowerCase()
    if (needle.includes(' ')) return haystack.includes(needle)
    if (tokens.includes(needle)) return true
    if (!options?.allowSuffix || needle.length < 4) return false
    return tokens.some((token) => token.startsWith(needle))
  })
}

/**
 * Teks menyebut salah satu kata kunci — TOLERAN salah ketik.
 *
 * Ambangnya sengaja konservatif supaya tidak menelan kata lain:
 *   · kata kunci ≤ 3 huruf  → harus persis (terlalu pendek untuk ditoleransi);
 *   · 4–6 huruf            → toleran 1 huruf ("makn" → "makan");
 *   · ≥ 7 huruf            → toleran 2 huruf ("sarapn" → "sarapan").
 * "kapan" vs "makan" berjarak 2 dengan panjang 5 → tidak pernah cocok; itulah
 * alasan ambangnya tidak seragam.
 *
 * Dipakai untuk GERBANG NIAT MENCATAT, tempat salah tafsirnya murah: yang muncul
 * cuma kartu konfirmasi yang bisa dibatalkan, sementara yang ditutup adalah
 * jawaban model yang mengaku sudah mencatat.
 */
export function mentionsWordLoose(text: string, keywords: readonly string[]): boolean {
  const tokens = tokenizeWords(text)
  if (tokens.length === 0) return false
  return keywords.some((keyword) => {
    const needle = keyword.toLowerCase()
    if (needle.includes(' ')) return text.toLowerCase().includes(needle)
    if (tokens.includes(needle)) return true
    if (needle.length < 4) return false
    const tolerance = needle.length <= 6 ? 1 : 2
    return tokens.some(
      (token) =>
        token.length >= 3 &&
        Math.abs(token.length - needle.length) <= tolerance &&
        editDistance(token, needle) <= tolerance,
    )
  })
}

/* ── GERBANG KONTEKS (pertanyaan di luar keuangan pribadi) ──────────────────── */

/**
 * Kata yang MEMBATALKAN penolakan: selama pesannya menyentuh uang/keuangan,
 * model yang menjawab — termasuk pertanyaan investasi, yang punya guardrail
 * sendiri di prompt (edukatif + disclaimer), bukan penolakan.
 */
const FINANCE_WORDS = [
  'uang',
  'duit',
  'rupiah',
  'rp',
  'saldo',
  'dompet',
  'jatah',
  'budget',
  'anggaran',
  'pengeluaran',
  'pemasukan',
  'pendapatan',
  'penghasilan',
  'gaji',
  'gajian',
  'bonus',
  'thr',
  'hutang',
  'utang',
  'cicilan',
  'kredit',
  'paylater',
  'pinjaman',
  'tabungan',
  'nabung',
  'menabung',
  'celengan',
  'investasi',
  'saham',
  'reksadana',
  'bitcoin',
  'kripto',
  'crypto',
  'emas',
  'pajak',
  'tagihan',
  'transaksi',
  'catat',
  'catet',
  'keuangan',
  'finansial',
  'hemat',
  'boros',
  'belanja',
  'bayar',
  'harga',
  'biaya',
  'asuransi',
  'darurat',
  'tujuan',
  'target',
  'cashflow',
  'arus kas',
  'dana',
  'income',
  'expense',
  'gopay',
  'ovo',
  'bca',
  'dompet digital',
  /* ── kata AKSI belanja/bayar ────────────────────────────────────────────────
     Ikut masuk daftar pembatal-penolakan supaya kalimat TRANSAKSI tidak pernah
     ditolak hanya karena menyebut topik lain yang kebetulan ada di daftar luar
     konteks: "beli tiket film 100k" adalah catatan pengeluaran, bukan pertanyaan
     film. Kata aksi di sini SENGAJA tidak menyerap kata yang ambigu sebagai
     pertanyaan (mis. "obat" tetap topik, jadi "obat apa untuk batuk?" tetap
     ditolak — sementara "beli obat 50k" lolos lewat "beli"). */
  'beli',
  'makan',
  'minum',
  'jajan',
  'sewa',
  'ngekos',
  'langganan',
  'tiket',
  'parkir',
  'bensin',
  'ongkos',
  'kopi',
  'laundry',
  'servis',
  'donasi',
  'sedekah',
  'zakat',
  'pulsa',
  'kuota',
  'listrik',
  'wifi',
  'apotek',
  'topup',
  'cicil',
] as const

/**
 * Topik yang jelas bukan urusan app ini. Daftarnya SENGAJA berupa frasa/kata
 * yang khas — bukan kategori luas seperti "seni" — supaya penolakannya tidak
 * pernah menelan pertanyaan keuangan yang tidak sengaja mirip.
 */
const OUT_OF_SCOPE_TOPICS = [
  /* tentang AI-nya sendiri, bukan soal uang user */
  'kamu siapa',
  'siapa kamu',
  'kamu model apa',
  'kamu ai apa',
  'pakai model',
  'model apa',
  'kamu bisa bahasa',
  'kamu bisa gak',
  'yang bikin kamu',
  'apa itu ai',
  'kamu robot',
  'kamu manusia',
  'siapa yang buat kamu',
  /* koding/perangkat */
  'koding',
  'coding',
  'ngoding',
  'programming',
  'javascript',
  'typescript',
  'python',
  'java',
  'php',
  'html',
  'css',
  'sql',
  'regex',
  'script',
  'database',
  'query',
  'deploy',
  'repository',
  'compiler',
  'algoritma',
  'algorithm',
  'error',
  'debug',
  'npm',
  'framework',
  'website',
  'aplikasi android',
  'belajar coding',
  /* sekolah/kuliah/akademik */
  'pr',
  'tugas sekolah',
  'tugas kuliah',
  'ujian',
  'soal',
  'matematika',
  'fisika',
  'kimia',
  'biologi',
  'sejarah',
  'esai',
  'puisi',
  'pantun',
  'karangan',
  'ringkas artikel',
  'sinopsis',
  'resensi',
  'terjemahkan',
  'translate',
  'bahasa inggris',
  /* berita, politik, agama, hiburan, olahraga */
  'politik',
  'presiden',
  'pemilu',
  'partai',
  'agama',
  'dosa',
  'ibadah',
  'doa',
  'resep',
  'cara masak',
  'cuaca',
  'liga',
  'sepak bola',
  'piala',
  'pertandingan',
  'artis',
  'selebgram',
  'drakor',
  'sinetron',
  'lagu',
  'lirik',
  'film',
  /* kesehatan, hubungan, lainnya */
  'obat',
  'gejala',
  'penyakit',
  'dokter',
  'diagnosa',
  'curhat',
  'mantan',
  'pacar',
  'jodoh',
  'patah hati',
  'psikolog',
  'motivasi',
  'beasiswa',
  'kuliah jurusan',
] as const

/**
 * `true` = pesan ini harus DITOLAK AI Coach karena di luar konteks.
 *
 * Aturan pengambilan keputusan (satu baris, sengaja sederhana):
 *   ada kata keuangan?      → jawab model (investasi/utang punya guardrail prompt)
 *   ada topik luar konteks? → TOLAK
 *   selain itu              → jawab model
 *
 * "Selain itu" tidak ditolak karena penolakan yang salah lebih merugikan: user
 * yang bertanya soal cicilannya lalu ditolak akan kehilangan kepercayaan, dan
 * bahaya utamanya (klaim mencatat) sudah ditahan `claimsRecordedAction`.
 */
export function detectOutOfScope(text: string): boolean {
  const t = text.trim()
  if (!t) return false
  if (mentionsWord(t, FINANCE_WORDS, { allowSuffix: true })) return false
  return mentionsWord(t, OUT_OF_SCOPE_TOPICS, { allowSuffix: true })
}

/* ── PAGAR KLAIM AKSI (jangan pernah bilang "sudah dicatat" tanpa baris nyata) ─ */

/**
 * Pola kalimat yang mengklaim AI BARU SAJA menulis/mengubah data user.
 *
 * Pagar ini memeriksa balasan BARU saja (bukan riwayat percakapan). Kalimat jujur
 * yang dibuat SETELAH pencatatan — `buildRecordedReply()` di
 * `lib/ai/coach-context.ts` — dibentuk di klien sesudah barisnya benar-benar
 * tertulis, jadi ia memang berbunyi "sudah aku catat"; yang dilarang adalah MODEL
 * mengucapkannya, karena model tidak bisa menulis apa pun ke ledger.
 */
const CLAIM_PATTERNS: readonly RegExp[] = [
  /* "sudah/udah/telah [aku] catat|simpan|masukkan|input|update|potong|kurangi" */
  /\b(udah|sudah|telah|dah)\s+(aku\s+|gue\s+|saya\s+)?(catat|catet|mencatat|mencatet|catatkan|simpan|menyimpan|masukin|masukkan|memasukkan|input|menginput|update|mengubah|potong|memotong|kurangi|mengurangi)\b/i,
  /* balasan yang DIBUKA dengan "Oke/Sip, aku catat" — klaim tanpa kata "sudah" */
  /^(oke|ok|okei|sip|siap|baik|baiklah|done|beres)\b[^\n]{0,24}\b(aku|gue|saya)\s+(catat|catet|simpan|masukin|masukkan|input)\b/i,
  /* "sudah tercatat / tersimpan / terinput" */
  /\b(udah|sudah|telah)\s+(tercatat|tercatet|tersimpan|terinput|terekam)\b/i,
  /* "sudah masuk ke riwayat/catatan" */
  /\b(udah|sudah|telah)\s+masuk\s+(ke\s+)?(riwayat|catatan|ledger|histori)\b/i,
  /* "saldo/jatahmu sudah berkurang / dipotong / diperbarui" */
  /\b(saldo|jatah|budget|catatan|riwayat|pengeluaran|pemasukan)(mu|nya|ku)?\s+(udah|sudah|telah)\s+(aku\s+)?(berubah|berkurang|bertambah|dipotong|dikurangi|diperbarui|diupdate|tersimpan|tercatat)\b/i,
]

/**
 * `true` = balasan ini mengklaim aksi tulis yang tidak bisa dibuktikan.
 * Pemanggil (route server / hook chat) menggantinya dengan copy kanon jujur,
 * bukan menampilkannya apa adanya.
 */
export function claimsRecordedAction(reply: string): boolean {
  const text = reply.trim()
  if (!text) return false
  return CLAIM_PATTERNS.some((pattern) => pattern.test(text))
}
