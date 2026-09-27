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
   Di produksi cukup ganti `AI_USAGE_CALLS` + `AI_ADDON_TOKENS_REMAINING` dengan
   hasil endpoint usage; seluruh komponen cuma membaca turunan dari file ini. */

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

/* ── 3. PEMAKAIAN BULAN INI (MOCK — satu-satunya tempat angka "terpakai") ────
   Panggilan terpakai mengikuti contoh di PRD 4925–4928 supaya halaman Billing
   dan kartu sidebar bercerita sama. Token terpakai TIDAK ditulis manual: ia
   diturunkan dari `callsUsed × tokensPerCall` tabel kanon di atas. */
const AI_USAGE_CALLS: Record<AiQuotaActivityId, number> = {
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

/** tabel kanon + pemakaian, siap dirender — komponen tidak hitung apa pun sendiri */
export const AI_USAGE: AiUsageRow[] = AI_BASE_QUOTA.map((activity) => {
  const callsUsed = AI_USAGE_CALLS[activity.id]
  const callsRemaining = Math.max(0, activity.calls - callsUsed)
  return {
    ...activity,
    callsUsed,
    callsRemaining,
    tokensUsed: callsUsed * activity.tokensPerCall,
    tokensRemaining: callsRemaining * activity.tokensPerCall,
  }
})

/** versi peta: komponen bisa langsung ambil satu aktivitas (mis. `voice`) */
export const AI_USAGE_BY_ID = Object.fromEntries(AI_USAGE.map((row) => [row.id, row])) as Record<
  AiQuotaActivityId,
  AiUsageRow
>

/** token add-on yang belum kepakai (mock) — tidak hangus saat reset (PRD 4802) */
export const AI_ADDON_TOKENS_REMAINING = 150_000

/* ── 4. TURUNAN YANG DIPAKAI UI (semua angka di layar datang dari sini) ──────
   Dua kolam sengaja TIDAK digabung jadi satu persen:
     • kuota dasar  → 601.500 token/bulan, di-reset tanggal 1  ← angka utama
     • token add-on → beli tambahan, tidak hangus sampai terpakai
   Angka utama ("X% sisa") memakai KUOTA DASAR — persis seperti contoh PRD
   4919–4930 (bar + baris "Token tambahan: 150.000") dan ambang soft-nudge Home
   (>70% pemakaian). Dengan begitu sidebar, Billing, Home, dan /terms sejalan. */

/** 464.020 = 174.720+156.000+78.000+44.800+3.600+6.900 (turunan, bukan konstanta) */
export const AI_BASE_TOKENS_USED = AI_USAGE.reduce((total, row) => total + row.tokensUsed, 0)
/** sisa kuota dasar bulan ini — 601.500 − 464.020 = 137.480 */
export const AI_BASE_TOKENS_REMAINING = AI_BASE_TOKENS_TOTAL - AI_BASE_TOKENS_USED
/** persen kuota dasar TERPAKAI (bulat) — 77; pemicu soft-nudge di Home (>70%) */
export const AI_USED_PCT = Math.round(usedPercent(AI_BASE_TOKENS_USED, AI_BASE_TOKENS_TOTAL))
/** persen SISA kuota dasar (bulat) — 23; angka yang selalu ditonjolkan */
export const AI_REMAINING_PCT = Math.round(
  remainingPercent(AI_BASE_TOKENS_USED, AI_BASE_TOKENS_TOTAL),
)
/** sisa kuota dasar diterjemahkan ke jumlah catatan AI yang masih bisa dibuat */
export const AI_RECORDS_LEFT = estimateRecords(AI_BASE_TOKENS_REMAINING)
/** token add-on diterjemahkan dengan ukuran yang sama biar bisa dibandingkan */
export const AI_ADDON_RECORDS_LEFT = estimateRecords(AI_ADDON_TOKENS_REMAINING)

/* ── 4b. TANGKI ADD-ON YANG BERJALAN (pembelian SESI INI) ─────────────────────
   Prompt 24: tombol "Beli Add-On →" di Home harus benar-benar MENAMBAH kuota,
   bukan menutup modal lalu diam. Tanpa backend, satu-satunya tempat yang bisa
   "bertambah" adalah sesi yang sedang jalan (lihat `lib/ai-quota-bus.ts`) — dan
   turunannya ditulis DI SINI, bukan di komponen, supaya angka add-on di banner
   Home, Fuel Gauge Billing, dan toast sesudah bayar tidak mungkin berbeda
   (aturan yang sama dengan §4 di atas).

   Kuota dasar sengaja TIDAK ikut berubah: token add-on masuk ke tangki
   tambahan yang tidak hangus saat reset (PRD 4790–4802), jadi persen utama
   ("X% sisa" dari kuota dasar) tetap jadi angka utama — persis contoh PRD
   4919–4930. Yang bertambah adalah baris "Token tambahan". */
export interface AiAddonTank {
  /** token add-on yang dibeli di sesi demo ini (0 = belum pernah beli) */
  purchasedTokens: number
  /** sisa token add-on = jatah mock bawaan + pembelian sesi ini */
  tokensRemaining: number
  /** terjemahan ke jumlah catatan AI — satuan yang user rasakan */
  recordsLeft: number
}

/** jatah add-on bawaan (mock) + pembelian sesi ini → satu angka siap render */
export function aiAddonTank(purchasedTokens: number): AiAddonTank {
  const purchased = Math.max(0, Math.round(purchasedTokens))
  const tokensRemaining = AI_ADDON_TOKENS_REMAINING + purchased
  return {
    purchasedTokens: purchased,
    tokensRemaining,
    recordsLeft: estimateRecords(tokensRemaining),
  }
}

/* Voice: PRD menghitung PANGGILAN (150/bulan), bukan jam. Kalau UI masih ingin
   menampilkan satuan waktu, waktunya DITURUNKAN dari sisa panggilan dengan asumsi
   rata-rata satu catatan suara ≈ 30 detik — angka panggilan kanon tetap utuh. */
export const AI_VOICE_SECONDS_PER_CALL = 30
export const AI_VOICE_CALLS_PER_MONTH = AI_USAGE_BY_ID.voice.calls
export const AI_VOICE_CALLS_REMAINING = AI_USAGE_BY_ID.voice.callsRemaining
export const AI_VOICE_REMAINING_SECONDS = AI_VOICE_CALLS_REMAINING * AI_VOICE_SECONDS_PER_CALL

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

/** tanggal reset berikutnya (mock) — sudah berupa string terformat supaya bebas
    masalah hydration mismatch (pola tanggal mock di repo ini) */
export const AI_QUOTA_RESET_DATE = '1 Oktober 2026'
/** sisa hari menuju reset — pasangan dari tanggal di atas; keduanya mock dan
    harus diubah bersamaan */
export const AI_QUOTA_RESET_DAYS = 4

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
