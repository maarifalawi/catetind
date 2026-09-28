/* ── Kuota AI — SATU-SATUNYA SUMBER ANGKA ("satu sumber kebenaran") ───────────
   Semua permukaan yang menampilkan bahan bakar AI membaca dari sini:

     • components/catetind/ai-fuel-card.tsx    → kartu sisa kuota di sidebar desktop
     • components/catetind/billing-panel.tsx   → fuel gauge di /settings/billing
     • components/catetind/top-up-modal.tsx    → paket add-on + harga + tokennya
     • components/catetind/ai-chat-widget.tsx  → gauge kecil di header AI Coach
     • lib/legal/terms.ts                      → dokumen /terms memakai angka kanon
                                                 yang sama (ToS mengikuti PRD)
     • lib/data/referral.ts                    → memakai ulang `remainingPercent`

   Kanon angkanya: PRD 4774–4802 (Base Quota · Add-on Paket · Reset bulanan) dan
   PRD 4892–4933 (AI Usage Meter "Fuel Gauge"). Tabel di bawah adalah SALINAN
   PERSIS tabel PRD; totalnya TIDAK ditulis manual, tapi DITURUNKAN dengan
   `reduce` — jadi tidak mungkin lagi sidebar bilang "4,99 jt token" sementara
   ToS bilang 601.500 (pelanggaran "Harga Konsisten & Transparan", PRD 4594).

   Framing selalu SISA ("tanki bensin"), bukan hitungan batas: tidak ada kata
   habis/limit dan tidak ada warna merah — kanon Domain 2B.2 & 5C.
   Di produksi cukup ganti isi `lib/ai-usage-store.ts` dengan hasil endpoint usage
   (`ai_usage` di PRD 4806–4886); seluruh komponen cuma membaca turunan dari file
   ini. Satu pengecualian yang DISENGAJA ada kata "habis": keadaan kuota benar-
   benar habis (`AI_QUOTA_EXHAUSTED_COPY`) — menutupi fakta itu dengan bahasa
   tanki bensin justru bikin user menekan tombol yang tidak akan bekerja. */

/* ── 1. HELPER SUDUT PANDANG (dipakai lintas halaman) ─────────────────────── */

/** estimasi 1 transaksi hasil AI (parse teks/struk + auto-kategori) ≈ 400 token */
export const AI_TOKENS_PER_RECORD = 400

/** 950 → "950" · 11 900 → "11,9 rb" · 287 480 → "287,5 rb" · 4 988 100 → "4,99 jt" */
export function compactNumber(value: number): string {
  const trim = (n: number) => n.toLocaleString('id-ID', { maximumFractionDigits: n < 10 ? 2 : 1 })
  if (value >= 1_000_000) return `${trim(value / 1_000_000)} jt`
  if (value >= 1_000) return `${trim(value / 1_000)} rb`
  return `${Math.round(value)}`
}

/** 200 000 → "200.000" — nominal token mau dibaca PERSIS, bukan disingkat "rb/jt" */
export function formatTokens(tokens: number): string {
  return Math.max(0, Math.round(tokens)).toLocaleString('id-ID')
}

/** persentase TERPAKAI dengan satu desimal (464 020 / 601 500 → 77,1) */
export function usedPercent(used: number, limit: number): number {
  if (limit <= 0) return 0
  return Math.round((used / limit) * 1000) / 10
}

/** persentase SISA kuota (0–100, satu desimal) — angka yang selalu ditonjolkan */
export function remainingPercent(used: number, limit: number): number {
  return Math.round((100 - usedPercent(used, limit)) * 10) / 10
}

/** sisa token diterjemahkan ke nilai yang user rasakan, bukan angka teknis */
export function estimateRecords(remainingTokens: number): number {
  return Math.max(0, Math.floor(remainingTokens / AI_TOKENS_PER_RECORD))
}

/** 13 → "13 dtk" · 21 540 → "5 j 59 m" · 7200 → "2 j" */
export function formatDuration(totalSeconds: number): string {
  const s = Math.max(0, Math.round(totalSeconds))
  const hours = Math.floor(s / 3600)
  const minutes = Math.floor((s % 3600) / 60)
  if (hours) return minutes ? `${hours} j ${minutes} m` : `${hours} j`
  if (minutes) return `${minutes} m`
  return `${s} dtk`
}

/* ── 2. BASE QUOTA (kanon PRD 4778–4786 — termasuk dalam langganan) ───────── */

export type AiQuotaActivityId = 'categorize' | 'chat' | 'ocr' | 'voice' | 'appreciation' | 'recap'

export interface AiQuotaActivity {
  id: AiQuotaActivityId
  /** label baris rincian di fuel gauge */
  label: string
  /** panggilan per bulan — angka kanon PRD, ubah berarti ubah ToS juga */
  calls: number
  /** estimasi token per panggilan — angka kanon PRD */
  tokensPerCall: number
}

export const AI_BASE_QUOTA: AiQuotaActivity[] = [
  { id: 'categorize', label: 'Kategorisasi + AI naming', calls: 800, tokensPerCall: 280 },
  { id: 'chat', label: 'Chat & coaching', calls: 200, tokensPerCall: 1_000 },
  { id: 'ocr', label: 'Pindai struk (OCR)', calls: 100, tokensPerCall: 1_000 },
  { id: 'voice', label: 'Input suara', calls: 150, tokensPerCall: 400 },
  { id: 'appreciation', label: 'Apresiasi AI', calls: 10, tokensPerCall: 600 },
  { id: 'recap', label: 'Recap mingguan', calls: 5, tokensPerCall: 2_300 },
]

/** total panggilan kuota dasar — 800+200+100+150+10+5 = 1.265 (kanon PRD 4786) */
export const AI_BASE_CALLS_TOTAL = AI_BASE_QUOTA.reduce(
  (total, activity) => total + activity.calls,
  0,
)

/** total token kuota dasar — 224.000+200.000+100.000+60.000+6.000+11.500 = 601.500
    (harus sama dengan angka yang tertulis di dokumen /terms) */
export const AI_BASE_TOKENS_TOTAL = AI_BASE_QUOTA.reduce(
  (total, activity) => total + activity.calls * activity.tokensPerCall,
  0,
)

/* ── 3. PEMAKAIAN — DARI STORE, BUKAN KONSTANTA MATI (paket 42) ──────────────
   Temuan audit Stage 5 #5: pemakaian dulu konstanta MATI sementara setiap
   panggilan AI/voice/OCR user tidak pernah menambahinya. Akibatnya meter di
   sidebar, Billing, banner Home, dan header AI Coach tidak pernah turun walau
   kuota benar-benar terpakai — angka pajangan, bukan alat.

   Sekarang pemakaian hidup di `lib/ai-usage-store.ts` (satu store untuk seluruh
   app, satu langganan). File INI tetap MURNI: ia cuma MENERJEMAHKAN pemakaian
   jadi baris & angka siap render. Jadi tidak ada komponen yang menghitung kuota
   sendiri, dan tidak ada dua tempat yang bisa beda cerita.

   Angka di bawah adalah TITIK BERANGKAT demo (mock PRD 4925–4928), bukan angka
   yang dikunci: begitu user memakai AI, store menambahinya dan seluruh gauge
   ikut turun. */
export const AI_SEED_USAGE_CALLS: Record<AiQuotaActivityId, number> = {
  categorize: 624,
  chat: 156,
  ocr: 78,
  voice: 112,
  appreciation: 6,
  recap: 3,
}

export interface AiUsageRow extends AiQuotaActivity {
  callsUsed: number
  callsRemaining: number
  tokensUsed: number
  tokensRemaining: number
}

/** tabel kanon + pemakaian hidup, siap dirender — komponen tidak hitung apa pun sendiri */
export function aiUsageRows(callsUsed: Record<AiQuotaActivityId, number>): AiUsageRow[] {
  return AI_BASE_QUOTA.map((activity) => {
    /* pemakaian sengaja TIDAK dipotong di batas aktivitas: kelebihannya adalah
       token yang diambil dari tangki add-on (PRD 4859–4876: dasar dulu, baru
       add-on), jadi baris ini harus jujur menunjukkan berapa yang terpakai */
    const used = Math.max(0, callsUsed[activity.id] ?? 0)
    const callsRemaining = Math.max(0, activity.calls - used)
    return {
      ...activity,
      callsUsed: used,
      callsRemaining,
      tokensUsed: used * activity.tokensPerCall,
      tokensRemaining: callsRemaining * activity.tokensPerCall,
    }
  })
}

/** versi peta: komponen bisa langsung ambil satu aktivitas (mis. `voice`) */
export function aiUsageById(rows: AiUsageRow[]): Record<AiQuotaActivityId, AiUsageRow> {
  return Object.fromEntries(rows.map((row) => [row.id, row])) as Record<
    AiQuotaActivityId,
    AiUsageRow
  >
}

/** jatah token add-on bawaan (mock) — tidak hangus saat reset (PRD 4802) */
export const AI_ADDON_TOKENS_ALLOTMENT = 150_000

/* ── 4. TANGKI ADD-ON (jatah bawaan + pembelian sesi − limpahan pemakaian) ────
   Prompt 24: tombol "Beli Add-On →" di Home harus benar-benar MENAMBAH kuota.
   Paket 42 menambahkan paruh kedua yang dulu hilang: kuota itu juga harus
   benar-benar BERKURANG saat terpakai.

   Urutannya mengikuti PRD 4859–4876: kuota dasar dulu, baru add-on. Karena itu
   pemakaian di atas kapasitas dasar disebut `overflowTokens` dan menggerus
   tangki add-on — bukan hilang tanpa jejak.

   Kuota dasar sengaja TIDAK ikut berubah oleh pembelian: persen utama ("X%
   sisa") tetap dihitung dari kuota dasar (PRD 4919–4930), dan token tambahan
   punya barisnya sendiri. */
export interface AiAddonTank {
  /** token add-on yang dibeli di sesi demo ini (0 = belum pernah beli) */
  purchasedTokens: number
  /** sisa token add-on = jatah bawaan + pembelian − limpahan pemakaian */
  tokensRemaining: number
  /** token yang sudah dipakai MELEBIHI kuota dasar (dibayar dari tangki ini) */
  overflowTokens: number
  /** terjemahan ke jumlah catatan AI — satuan yang user rasakan */
  recordsLeft: number
}

/** jatah bawaan (mock) + pembelian sesi − limpahan → satu angka siap render */
export function aiAddonTank(purchasedTokens: number, overflowTokens = 0): AiAddonTank {
  const purchased = Math.max(0, Math.round(purchasedTokens))
  const overflow = Math.max(0, Math.round(overflowTokens))
  const tokensRemaining = Math.max(0, AI_ADDON_TOKENS_ALLOTMENT + purchased - overflow)
  return {
    purchasedTokens: purchased,
    tokensRemaining,
    overflowTokens: overflow,
    recordsLeft: estimateRecords(tokensRemaining),
  }
}

/* ── 4b. SNAPSHOT KUOTA — satu bentuk yang dibaca SEMUA gauge (paket 42) ─────
   Sebelumnya tiap gauge membaca konstanta berbeda (`AI_REMAINING_PCT`,
   `AI_RECORDS_LEFT`, `AI_VOICE_*`, `aiAddonTank`) sehingga "kuota habis" tidak
   punya satu definisi pun. Sekarang semuanya lahir dari fungsi ini, dan
   `exhausted` dihitung dari dua kolam sekaligus — itulah yang dipakai engine
   input & widget AI untuk mematikan voice/OCR sambil menjelaskan alasannya.

   Pemakaian TIDAK di-clamp di batas kuota dasar: kelebihannya masuk tangki
   add-on, jadi keadaan "habis" benar-benar habis di KEDUA kolam. */
export interface AiQuotaSnapshot {
  /** rincian per aktivitas (tabel kanon + pemakaian hidup) */
  rows: AiUsageRow[]
  byId: Record<AiQuotaActivityId, AiUsageRow>
  /** token kuota dasar terpakai bulan ini */
  baseTokensUsed: number
  /** sisa kuota dasar (0 = kolam dasar habis) */
  baseTokensRemaining: number
  /** persen kuota dasar terpakai (bulat) — pemicu soft-nudge Home (>70%) */
  usedPct: number
  /** persen sisa kuota dasar (bulat) — angka yang selalu ditonjolkan */
  remainingPct: number
  /** sisa kuota dasar diterjemahkan ke jumlah catatan AI */
  recordsLeft: number
  /** sisa PANGGILAN suara (kanon PRD: panggilan, bukan jam) */
  voiceCallsRemaining: number
  /** terjemahan panggilan suara ke durasi (asumsi 30 dtk/panggilan) */
  voiceRemainingSeconds: number
  addon: AiAddonTank
  /** true = kuota dasar DAN tangki add-on dua-duanya habis */
  exhausted: boolean
}

/** pemakaian + pembelian → seluruh angka kuota yang ditampilkan app */
export function aiQuotaSnapshot(
  callsUsed: Record<AiQuotaActivityId, number>,
  purchasedTokens = 0,
): AiQuotaSnapshot {
  const rows = aiUsageRows(callsUsed)
  const byId = aiUsageById(rows)

  const baseTokensUsed = rows.reduce((total, row) => total + row.tokensUsed, 0)
  const baseTokensRemaining = Math.max(0, AI_BASE_TOKENS_TOTAL - baseTokensUsed)
  /* limpahan = pemakaian yang melewati kapasitas dasar → dibayar dari add-on */
  const overflowTokens = Math.max(0, baseTokensUsed - AI_BASE_TOKENS_TOTAL)
  const addon = aiAddonTank(purchasedTokens, overflowTokens)
  const voiceCallsRemaining = byId.voice.callsRemaining

  return {
    rows,
    byId,
    baseTokensUsed,
    baseTokensRemaining,
    /* dua persen ini di-clamp ke 0–100 walau pemakaian sudah melewati kuota
       dasar: angka yang tampil ke user tidak boleh negatif (bar "0% sisa" yang
       ditulis −100% adalah angka rusak). Kelebihannya tetap jujur terlihat
       lewat `addon.overflowTokens`. */
    usedPct: Math.min(100, Math.round(usedPercent(baseTokensUsed, AI_BASE_TOKENS_TOTAL))),
    remainingPct: Math.max(
      0,
      Math.round(remainingPercent(baseTokensUsed, AI_BASE_TOKENS_TOTAL)),
    ),
    recordsLeft: estimateRecords(baseTokensRemaining),
    voiceCallsRemaining,
    voiceRemainingSeconds: voiceCallsRemaining * AI_VOICE_SECONDS_PER_CALL,
    addon,
    exhausted: baseTokensRemaining <= 0 && addon.tokensRemaining <= 0,
  }
}

/* Voice: PRD menghitung PANGGILAN (150/bulan), bukan jam. Kalau UI masih ingin
   menampilkan satuan waktu, waktunya DITURUNKAN dari sisa panggilan dengan asumsi
   rata-rata satu catatan suara ≈ 30 detik — angka panggilan kanon tetap utuh.
   Sisa panggilannya sendiri hidup di `AiQuotaSnapshot.voiceCallsRemaining`
   (paket 42), bukan konstanta. */
export const AI_VOICE_SECONDS_PER_CALL = 30

/* ── 5. ADD-ON PAKET (kanon PRD 4790–4798) ──────────────────────────────────
   Nama sengaja kasual ("Receh/Sedang/Gede") — bukan "Basic/Pro/Enterprise" —
   sesuai tone Gen-Z. `best` = decoy yang di-highlight penuh di modal top-up. */

export type AiAddonPackageId = 'receh' | 'sedang' | 'gede'

export interface AiAddonPackage {
  id: AiAddonPackageId
  name: string
  price: number
  /** token tambahan yang masuk ke tangki — TIDAK hangus saat reset bulanan */
  tokens: number
  /** setara panggilan (kanon PRD 4794–4796) biar user bisa hitung sendiri */
  note: string
  best?: boolean
}

export const AI_ADDON_PACKAGES: AiAddonPackage[] = [
  {
    id: 'receh',
    name: 'Paket Receh',
    price: 19_000,
    tokens: 200_000,
    note: '≈ 50 chat + 20 OCR + 100 kategorisasi',
  },
  {
    id: 'sedang',
    name: 'Paket Sedang',
    price: 29_000,
    tokens: 400_000,
    note: '≈ 100 chat + 40 OCR + 200 kategorisasi',
    best: true,
  },
  {
    id: 'gede',
    name: 'Paket Gede',
    price: 49_000,
    tokens: 800_000,
    note: '≈ 200 chat + 80 OCR + 400 kategorisasi',
  },
]

/* ── 6. ATURAN RESET (kanon PRD 4800–4802) ──────────────────────────────────
   Reset BULANAN tanggal 1, BUKAN rolling 30 hari: lebih gampang dijelaskan dan
   ikut siklus tagihan. Yang di-reset cuma kuota dasar; token add-on berlaku
   sampai benar-benar terpakai. */
export const AI_RESET_RULE_COPY =
  'Kuota dasar di-reset tanggal 1 tiap bulan. Token add-on tidak hangus.'

/* Satu tanggal kanon (audit fintech Stage 2 #6): label tanggal & sisa hari
   DITURUNKAN dari sini, jadi tidak ada dua konstanta mock yang bisa lupa
   disinkronkan. Tanggal ditulis sebagai `YYYY-MM-DD` + hari "hari ini" mock —
   dua string tetap, gaya tanggal mock halaman lain (bukan `new Date()`),
   supaya HTML server & client identik. */
export const AI_QUOTA_RESET_ISO = '2026-10-01'
/** hari "hari ini" mock — pembanding tanggal reset di atas */
export const AI_QUOTA_TODAY_ISO = '2026-09-27'

const RESET_MONTHS_LONG = [
  'Januari',
  'Februari',
  'Maret',
  'April',
  'Mei',
  'Juni',
  'Juli',
  'Agustus',
  'September',
  'Oktober',
  'November',
  'Desember',
]

/** `'2026-10-01'` → `'1 Oktober 2026'` (ditulis manual, bebas locale mesin) */
export function indonesianDateLabel(iso: string): string {
  const [year, month, day] = iso.split('-').map(Number)
  const label = RESET_MONTHS_LONG[month - 1] ?? iso
  return `${day} ${label} ${year}`
}

/** jarak hari bulat antara dua tanggal lokal — bebas timezone */
export function daysUntil(fromIso: string, toIso: string): number {
  const [fromYear, fromMonth, fromDay] = fromIso.split('-').map(Number)
  const [toYear, toMonth, toDay] = toIso.split('-').map(Number)
  const from = Date.UTC(fromYear, fromMonth - 1, fromDay)
  const to = Date.UTC(toYear, toMonth - 1, toDay)
  return Math.max(0, Math.round((to - from) / 86_400_000))
}

/** tanggal reset berikutnya (mock) — TURUNAN dari tanggal kanon di atas */
export const AI_QUOTA_RESET_DATE = indonesianDateLabel(AI_QUOTA_RESET_ISO)
/** sisa hari menuju reset — TURUNAN dari tanggal kanon & hari mock di atas,
 *  jadi dua angka ini tidak mungkin lagi berbeda cerita */
export const AI_QUOTA_RESET_DAYS = daysUntil(AI_QUOTA_TODAY_ISO, AI_QUOTA_RESET_ISO)

/* ── 7. COPY HALAMAN BILLING & KARTU SIDEBAR ────────────────────────────────
   Judul kartu + kalimat aturan reset dipakai di lebih dari satu komponen, jadi
   ditulis sekali di sini (aturan repo: copy user-facing bukan string di JSX). */

export const AI_FUEL_COPY = {
  cardTitle: 'Bahan Bakar AI',
  /** label pendamping angka besar — selalu "sisa", tidak pernah "terpakai" */
  remainingLabel: 'sisa',
  baseLabel: 'Kuota dasar',
  addonLabel: 'Token tambahan',
  detailLabel: 'Rincian pemakaian',
  resetLabel: 'Reset kuota dasar',
  resetRule: AI_RESET_RULE_COPY,
  /** baris rincian per aktivitas, mis. "44 dari 200 sisa" */
  callsRemaining: (remaining: number, total: number) => `${remaining} dari ${total} sisa`,
  /** nilai yang user rasakan, mis. "≈ 718 catatan AI lagi" */
  recordsLeft: (records: number) => `≈ ${records.toLocaleString('id-ID')} catatan AI lagi`,
  addonBandBadge: 'AI Token Add-on',
  addonBandTitle: 'Wah, AI Coach kamu udah kerja keras bulan ini!',
  addonBandCta: 'Beli Kuota Tambahan',
} as const

export const AI_TOPUP_COPY = {
  title: 'Top Up AI Token',
  description: 'Tambah napas AI biar pencatatanmu tetap otomatis ⚡',
  packageLegend: 'Pilih paket top up AI token',
  bestBadge: 'Paling Laris',
  onceLabel: 'sekali bayar',
  emptySelection: 'Belum ada paket dipilih',
  payCta: 'Bayar Sekarang',
  payingCta: 'Memproses…',
  trustNote: 'Bayar sekali. Tanpa perpanjangan otomatis.',
  closeLabel: 'Tutup',
  backdropLabel: 'Tutup top up AI token',
  /* Konfirmasi sesudah bayar (mock). Nominal RUPIAH sengaja tidak diulang di
     sini: yang user butuh tahu cuma "token-ku nambah berapa" — dan angka token
     itu dibaca dari paket yang sama, bukan disalin manual. */
  successTitle: (packageName: string) => `${packageName} masuk! ⚡`,
  successDescription: (tokens: number) =>
    `+${formatTokens(tokens)} token siap dipakai. Gak ada perpanjangan otomatis.`,
} as const

/* ── 8. COPY BANNER SOFT-NUDGE DI HOME (kuota AI >70%) ──────────────────────
   Banner ini AJAKAN menambah token, bukan pajangan statistik — karena itu
   kalimatnya menyebut keadaan ("menyusut"), bukan menuduh. Angka pemakaian tetap
   ditulis di data, bukan di JSX, supaya bar + teks di banner tidak bisa beda. */
export const AI_GAUGE_BANNER_COPY = {
  title: 'Kuota AI-mu menyusut',
  dismissLabel: 'Tutup info kuota AI',
  cta: 'Beli Add-On →',
  /** dua angka dalam satu baris — disusun di data, bukan di komponen */
  usage: (usedPct: number, remainingPct: number) =>
    `${usedPct}% terpakai · ${remainingPct}% sisa`,
} as const

/* ── 9. STATE KUOTA HABIS + DEGRADASI (paket 42 · temuan audit #5) ──────────
   Dulu kuota bisa habis di atas kertas TAPI app tidak punya keadaan itu: tombol
   voice/scan tetap hijau dan user cuma melihat "0% sisa" tanpa tahu apa yang
   masih bisa ia lakukan.

   Aturan degrade-nya sengaja dipilih supaya pencatatan TIDAK pernah berhenti —
   mencatat adalah alasan app ini ada:
     · kategorisasi MANUAL tetap jalan penuh (engine input tidak dikunci);
     · voice & OCR dimatikan, dan dikatakan kenapa + apa penggantinya;
     · user dikasih satu jalan keluar: reset tanggal 1 atau top up token.

   Copy-nya di sini (bukan di komponen) karena tiga permukaan berbeda memakainya:
   engine input (`transaction-input-engine.tsx`), widget AI Coach, dan banner Home. */
export const AI_QUOTA_EXHAUSTED_COPY = {
  /** judul banner Home saat kolam dasar & add-on dua-duanya habis */
  bannerTitle: 'Kuota AI bulan ini habis',
  badge: 'Kuota habis',
  /** penjelasan panjang (banner Home / kartu Billing) */
  body:
    'Catat manual tetap jalan penuh — nominal, catatan, kategori, semuanya bisa kamu isi sendiri. Voice & scan struk nyala lagi setelah reset tanggal 1 atau setelah top up token.',
  /** alasan tombol voice dimatikan (engine input & widget AI Coach) */
  voiceOff: 'Input suara sedang mati karena kuota AI habis. Catat manual tetap bisa, kok 🌿',
  /** alasan tombol scan struk dimatikan */
  ocrOff: 'Scan struk sedang mati karena kuota AI habis. Isi nominalnya manual dulu ya 🌿',
  /** satu baris di gauge: menyebut sisa + jalan keluarnya, tanpa nada menuduh */
  gaugeNote: (resetDate: string) =>
    `Kuota AI habis — reset ${resetDate}, atau tambah token kalau mau lanjut sekarang.`,
  /** label pembaca layar untuk bar yang benar-benar kosong */
  progressLabel: 'Kuota AI habis',
} as const
