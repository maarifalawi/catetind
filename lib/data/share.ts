/* ── Share Preview Publik (/share/[id]) · Domain 7D Loop 2 & 3 ───────────────
   Ini SATU-SATUNYA halaman CatetInd yang dibuka oleh orang yang belum kenal
   produknya — dan ia datang karena rasa bangga seseorang, bukan karena iklan.
   Dua hal itu menentukan seluruh isi file ini:

     1. PRIVACY GUARD (PRD 6572–6576) — kartu ini DIPUBLIKASIKAN, jadi isinya
        dipotong dari akarnya: hanya jumlah transaksi, hari konsisten, milestone,
        dan tahap tanaman. Nominal rupiah, kategori, nama merchant, dan persentase
        DILARANG ada di tipe `ShareCard` — bukan disensor saat render, tapi memang
        tidak pernah diambil dari sumber data keuangan (`buildSharePayload()`
        memilih field satu per satu; tidak boleh `...spread` objek keuangan).
     2. JUJUR (PRD 5174–5177 & 572) — kalau datanya masih tipis, kartu ditampilkan
        apa adanya sebagai "masih tumbuh". Tidak ada pencapaian, testimoni, atau
        angka sosial yang dikarang.

   Semua angka + copy tinggal di sini (file MURNI, tanpa React) supaya bisa
   diaudit sekali jalan; komponen halaman nol string copy (CONTEXT-WAJIB §4).

   Arah produksi: `getShareCard()` membaca `GET /api/share/:id` di server, dan
   thumbnail kartu 1080×1920 digenerate server-side (PRD 6580–6611) supaya
   pratinjau WhatsApp/IG punya gambar. Di repo demo ini registry-nya mock & statis,
   jadi tidak ada permintaan jaringan yang bisa gagal di tengah review desain.
   ────────────────────────────────────────────────────────────────────────── */

/**
 * Tahap tanaman yang boleh tampil di kartu publik. Nilainya SENGAJA identik
 * dengan `PlantStage` di `components/catetind/plant-illustration.tsx`
 * (1 Benih … 4 Berbunga), tapi ditulis ulang di sini supaya lapis data tidak
 * pernah mengimpor komponen UI — dan supaya perubahan visual tanaman tidak
 * diam-diam mengubah kontrak publik halaman ini.
 */
export type SharePlantStage = 1 | 2 | 3 | 4

/* ════════════════════════════════════════════════════════════════════════════
   ⛔ DILARANG menambah field nominal / kategori / merchant / persentase ke tipe
      di bawah ini. Kartu ini dipublikasikan lewat tautan yang bisa dibuka
      siapa pun tanpa login (PRD 6572–6576). Kalau butuh angka keuangan, itu
      bukan kartu ini — pakai panel rekap di dalam app yang sudah ada
      (mis. slide "Pengeluaran" di `weekly-recap-modal.tsx`).
   ════════════════════════════════════════════════════════════════════════════ */

/** Isi kartu yang aman dibagikan. Delapan field, dan itu sudah seluruhnya. */
export interface ShareCard {
  /** slug publik di URL `/share/<id>` */
  id: string
  /** nama pemilik — nama panggilan saja (PRD 5176: nama depan, bukan identitas penuh) */
  ownerName: string
  /** label bulan yang SUDAH diformat ("September 2026") — string statis supaya
   *  render server & client identik (pola anti hydration-mismatch repo) */
  monthLabel: string
  /** jumlah catatan yang berhasil dibuat bulan itu — bukan jumlah uang */
  totalTransactions: number
  /** hari beruntun mencatat; tidak pernah ditampilkan sebagai "kegagalan" */
  streakDays: number
  /** pencapaian yang BENAR-BENAR terjadi; array kosong = jangan mengarang */
  milestones: string[]
  plantStage: SharePlantStage
}

/**
 * Registry kartu (mock). Dua kartu sengaja berbeda karakter supaya kedua state
 * penting bisa direview tanpa menebak URL:
 *   • `rina-sep`  → kartu penuh (data sudah melewati ambang insight)
 *   • `dimas-okt` → kartu tipis (di bawah `SHARE_MIN_TRANSACTIONS`) → tampil
 *                   apa adanya sebagai "masih tumbuh"
 * Angka `totalTransactions` dimasukkan apa adanya: 87 & 5 adalah jumlah CATATAN,
 * bukan rupiah — satu-satunya keluarga angka yang diizinkan PRD 6575.
 */
export const SHARE_CARDS: Record<string, ShareCard> = {
  'rina-sep': {
    id: 'rina-sep',
    ownerName: 'Rina',
    monthLabel: 'September 2026',
    totalTransactions: 87,
    streakDays: 21,
    milestones: ['Capai 1 target tabungan', 'Setor celengan 4 kali'],
    plantStage: 4,
  },
  'dimas-okt': {
    id: 'dimas-okt',
    ownerName: 'Dimas',
    monthLabel: 'Oktober 2026',
    totalTransactions: 5,
    streakDays: 3,
    /* kosong dengan sengaja: belum ada pencapaian yang jujur untuk ditulis */
    milestones: [],
    plantStage: 2,
  },
}

/** kartu milik user yang sedang login di demo ini — dipakai trigger di dalam app */
export const ACTIVE_SHARE_CARD_ID = 'rina-sep'

/** id yang pasti tidak ada di registry — dipakai tautan review state "tidak tersedia" */
export const DEMO_UNKNOWN_SHARE_ID = 'kartu-lama'

/** hasil pencarian kartu: kartu, atau penanda tegas bahwa id-nya asing */
export type ShareLookup = ShareCard | 'unknown'

/**
 * Baca kartu dari registry. Mengembalikan `'unknown'` (bukan `null` bertopi tipis)
 * supaya pemanggil WAJIB memikirkan keadaan "kartu tidak ada" — di halaman
 * publik itu empty state hangat, bukan 404 kaku (inventaris #16).
 */
export function getShareCard(id: string): ShareLookup {
  const key = id.trim().toLowerCase()
  return SHARE_CARDS[key] ?? 'unknown'
}

/* ── TAUTAN (3 bentuk, jangan dicampur) ───────────────────────────────────────
   Sama seperti referral: link yang DIKIRIM harus https absolut, sedangkan yang
   DITAMPILKAN cukup tanpa skema biar ringkas di kotak mono. */

/** basis URL share — selalu https + domain, bukan teks yang ditampilkan */
export const SHARE_URL_BASE = 'https://catetind.com/share/'

/** route internal (dipakai `<Link>` di dalam app) */
export function buildShareHref(id: string): string {
  return `/share/${id.trim().toLowerCase()}`
}

/** URL absolut untuk Web Share API / pratinjau metadata */
export function buildShareUrl(id: string): string {
  return `${SHARE_URL_BASE}${id.trim().toLowerCase()}`
}

/** teks link yang ditampilkan ke user (tanpa skema, pola `referralLink`) */
export function buildShareLinkText(id: string): string {
  return `catetind.com/share/${id.trim().toLowerCase()}`
}

/* ── HASHTAG & PAYLOAD SHARE ──────────────────────────────────────────────── */

/** hashtag kanon kampanye (PRD 6566) — satu-satunya "ajakan" di dalam kartu */
export const SHARE_HASHTAG = '#CatetAjaDulu'

/** judul share di sistem operasi (WhatsApp/IG/Twitter) — tanpa angka keuangan */
export const SHARE_ACTION_TITLE = 'CatetInd — Kartu Pencapaian'

/**
 * Kalimat yang menemani link saat dibagikan. Disusun dari kalimat tetap + link;
 * TIDAK ada angka rupiah, kategori, atau nama merchant di sini (PRD 6572–6576) —
 * jumlah catatan/hari hanya boleh muncul di kartu, bukan di teks chat, supaya
 * yang pertama dibaca orang tetap terasa hangat, bukan seperti laporan.
 */
export function buildShareActionText(id: string): string {
  return `Aku lagi rajin nyatat di CatetInd 🌱 Ini kartu pencapaianku bulan ini: ${buildShareLinkText(id)}`
}

export interface SharePayload {
  title: string
  text: string
  /** URL absolut — dipakai `navigator.share({ url })` */
  url: string
}

/**
 * Kumpulkan payload share untuk satu kartu. Field diambil SATU PER SATU dari
 * `ShareCard` — tidak ada `...spread` objek keuangan apa pun, jadi menambah
 * field uang di tempat lain tidak akan pernah ikut bocor ke halaman publik.
 */
export function buildSharePayload(id: string): SharePayload | null {
  const card = getShareCard(id)
  if (card === 'unknown') return null

  return {
    title: SHARE_ACTION_TITLE,
    text: buildShareActionText(card.id),
    url: buildShareUrl(card.id),
  }
}

/* ── BARIS PENCAPAIAN ─────────────────────────────────────────────────────── */

/** baris yang selalu ada, dalam urutan tetap: catatan → hari → milestone */
export type ShareAchievementKey = 'transactions' | 'streak' | 'milestone'

export interface ShareAchievementRow {
  key: ShareAchievementKey
  /** teks SIAP TAMPIL (angka sudah disisipkan di sini, bukan di JSX) */
  text: string
}

/** dipakai saat belum ada milestone jujur untuk ditulis (PRD 5174–5177) */
export const SHARE_MILESTONE_GROWING = 'Lagi menumbuhkan pencapaian pertamanya'

/** teks baris "hari berturut-turut" — angka streak boleh tampil (PRD 6575) */
export function streakLabel(days: number): string {
  return `${days} hari berturut-turut`
}

/**
 * Tiga baris pencapaian kartu. Milestone hanya ditampilkan kalau memang ada;
 * kalau belum ada, barisnya jujur mengatakan masih menumbuhkan — bukan
 * dipaksa jadi "Capai 1 target" yang tidak terjadi.
 */
export function achievementRows(card: ShareCard): ShareAchievementRow[] {
  return [
    { key: 'transactions', text: `Catat ${card.totalTransactions} transaksi` },
    { key: 'streak', text: streakLabel(card.streakDays) },
    { key: 'milestone', text: card.milestones[0] ?? SHARE_MILESTONE_GROWING },
  ]
}

/** milestone kedua dan seterusnya — ditampilkan sebagai pil kecil di bawah baris */
export function extraMilestones(card: ShareCard): string[] {
  return card.milestones.slice(1)
}

/* ── AMBANG DATA TIPIS ────────────────────────────────────────────────────── */

/**
 * Ambang insight PRD 574–586: di bawah 7 catatan, angka belum bercerita apa pun.
 * Untuk kartu publik artinya bukan "sembunyikan", tapi "tampilkan apa adanya"
 * plus satu kalimat yang menenangkan.
 */
export const SHARE_MIN_TRANSACTIONS = 7

export function isThinCard(card: ShareCard): boolean {
  return card.totalTransactions < SHARE_MIN_TRANSACTIONS
}

/* ── COPY HALAMAN ─────────────────────────────────────────────────────────── */

export const SHARE_PAGE_EYEBROW = 'Kartu pencapaian'

/**
 * H1 halaman. Nama pemilik dipakai apa adanya supaya terasa personal — ini
 * kartu ORANG, bukan halaman fitur (bandingkan `/join/[code]` yang menaruh nama
 * pengundang di depan).
 */
export function shareHeadline(ownerName: string): string {
  return `Progres ${ownerName} bulan ini`
}

export const SHARE_PAGE_SUBHEAD =
  'Kartu ini bukan laporan keuangan — hanya jumlah catatan, hari konsisten, dan tahap tanamannya.'

/** label kecil di dalam kartu, sebelum baris pencapaian */
export function shareCardLead(ownerName: string): string {
  return `${ownerName} berhasil:`
}

/**
 * Caption di bawah tanaman. Emoji dipakai hemat sebagai penanda nada
 * (CONTEXT-WAJIB §4), dan setiap tahap punya kalimatnya sendiri supaya tanaman
 * tidak pernah terasa seperti hiasan statis.
 */
export const SHARE_STAGE_CAPTION: Record<SharePlantStage, string> = {
  1: 'Benihnya baru mulai disiram 🌱',
  2: 'Tunasku mulai tumbuh 🌿',
  3: 'Tanamanku makin rimbun 🌿',
  4: 'Pohon keuanganku udah berbunga! 🌸',
}

/** footer kecil di dalam kartu — alamat yang bisa diketik manual */
export const SHARE_CARD_DOMAIN = 'catetind.com'

/* ── PRIVASI (WAJIB, DUA LAPIS) ───────────────────────────────────────────────
   CONTEXT-WAJIB §5.3 poin 5: setiap halaman yang menyentuh data orang lain
   wajib mengulang janji privasi. Lapis pertama menjelaskan APA yang tampil,
   lapis kedua mengutip janji share dari PRD 6633 apa adanya (verbatim). */

/** lapis 1 — di bawah kartu, satu baris, menjelaskan isi kartu */
export const SHARE_CARD_PRIVACY_LINE =
  'Yang tampil di kartu ini cuma jumlah catatan, hari konsisten, dan tahap tanaman — tanpa nominal, kategori, atau nama merchant.'

/** lapis 2 — PRD 6633, VERBATIM, jangan diedit gayanya */
export const SHARE_PRIVACY_NOTE =
  'Beberapa slide bersifat pribadi dan tidak termasuk dalam share. Privasi kamu kami jaga 💚'

/** janji privasi untuk PENGUNJUNG (PRD 7032–7057: privasi = keunggulan struktural) */
export function shareVisitorPledge(ownerName: string): string {
  return `Rincian keuangannya tetap 100% privat. ${ownerName} sendiri yang memilih bagian ini untuk dibagikan — sisanya tidak pernah ikut keluar.`
}

/* ── CTA (PRD 6568 & inventaris #16) ──────────────────────────────────────── */

export const SHARE_CTA = 'Mau kayak gini? Gabung CatetInd'
/** route yang ADA di repo ini (`app/checkout/page.tsx`) — jangan ganti tanpa route-nya */
export const SHARE_CTA_HREF = '/checkout'
export const SHARE_CTA_HINT = 'Empat tap buat nyatat, satu tanaman buat nemenin konsistenmu.'

/** kartu ajakan untuk pengunjung yang belum kenal CatetInd (bukan hard-sell) */
export const SHARE_INVITE_TITLE = 'Tanaman kamu mulai dari benih 🌱'
export const SHARE_INVITE_BODY =
  'Nyatat pengeluaran cukup 4 tap. Tiap kali kamu konsisten, tanamanmu tumbuh — dan kartu seperti di atas dibuat otomatis dari catatanmu.'


/** satu kalimat nurturing untuk CTA kartu yang datanya masih tipis */
export const SHARE_THIN_CTA_HINT =
  'Mulai dari sedikit juga jalan, kok. Yang penting catatannya mulai jalan.'

/* ── STATE "MASIH TUMBUH" (PRD 5174–5177 & 572) ───────────────────────────── */

export const SHARE_GROWING_TITLE = 'Kartu ini masih tumbuh 🌱'

/** apa adanya: sebut jumlahnya, jangan dibulatkan jadi pencapaian palsu */
export function shareGrowingNote(card: ShareCard): string {
  return `Baru ${card.totalTransactions} catatan tercatat di ${card.monthLabel}. Kami tampilkan apa adanya — nggak ada pencapaian yang dikarang.`
}

/* ── STATE "KARTU TIDAK ADA" (inventaris #16: hangat, bukan 404 kaku) ─────── */

export const SHARE_UNAVAILABLE_TITLE = 'Kartu ini sudah tidak tersedia atau tautannya salah 🌱'
export const SHARE_UNAVAILABLE_BODY =
  'Mungkin tautannya terpotong saat dikirim, atau pemiliknya sudah menghapus kartunya. Nggak ada yang rusak — kamu tetap bisa kenalan sama CatetInd di bawah.'
/** CTA pulang ke beranda (bukan halaman error) */
export const SHARE_UNAVAILABLE_CTA = 'Balik ke Beranda'
export const SHARE_UNAVAILABLE_CTA_HREF = '/'
export const SHARE_UNAVAILABLE_ART_LABEL = 'Tunas kecil di pot — tanaman CatetInd masih tumbuh'

/* ── PANEL BAGIKAN DI DALAM APP (trigger dari Rekap Mingguan) ──────────────── */

export const SHARE_PANEL_COPY = {
  title: 'Bagikan kartu pencapaian',
  blurb:
    'Yang ikut terkirim cuma jumlah catatan, hari konsisten, dan milestone. Nggak ada satu pun angka rupiah di dalamnya.',
  shareLabel: 'Bagikan',
  copyLabel: 'Salin link',
  /** paket 63 — ekspor kartu sebagai GAMBAR (Web Share API, fallback unduh) */
  shareImageLabel: 'Share Report',
  /** toast + status inline — pola sama dengan serah-terima /install */
  status: {
    copied: 'Link kartu tersalin!',
    shared: 'Kartu terkirim! 🌿',
    downloaded: 'Gambar kartu tersimpan di perangkatmu 🌿',
    failed: 'Gagal menyalin — salin link-nya manual ya',
  },
  /** pola JOIN_PREVIEW_COPY: pratinjau halaman yang dilihat orang lain */
  previewLabel: 'Lihat kartu seperti yang dilihat temanmu',
  previewHint: 'Tampilan ini yang muncul saat tautannya dibuka orang lain.',
} as const

/* ── GAMBAR KARTU (paket 63) ─────────────────────────────────────────────────
   Kartu yang sama dengan `share-achievement-card.tsx`, dibangkitkan server-side
   (`next/og` `ImageResponse`) untuk pratinjau tautan (OG/Twitter) dan untuk
   tombol "Share Report". Isinya HANYA yang boleh publik: nama panggilan, bulan,
   jumlah catatan, hari konsisten, milestone, tahap tanaman — nol angka rupiah
   (PRD 6572–6576). Semua teks di gambar tinggal di sini, bukan di komponen. */

export const SHARE_IMAGE_COPY = {
  brand: 'CatetInd',
  eyebrow: 'Kartu pencapaian',
  /** pengingat singkat di kaki gambar (bukan ajakan jualan) */
  footer: 'Catat 4 tap, tumbuh tiap hari',
  /** dipakai versi Story di bawah tanaman */
  storyFooter: 'Tanaman kamu mulai dari benih 🌱',
} as const

/** route gambar Story 1080×1920 (dipakai tombol "Share Report") */
export function buildShareImagePath(id: string): string {
  return `/api/share/${id.trim().toLowerCase()}/image`
}

/** teks alternatif gambar kartu (a11y di halaman publik) */
export function shareImageAlt(card: ShareCard): string {
  return `Kartu pencapaian ${card.ownerName} di CatetInd — ${card.monthLabel}`
}

/* ── KAKI DEMO ────────────────────────────────────────────────────────────────
   Sama seperti `/join/[code]`: tiga state halaman ini hanya bisa direview kalau
   tautannya terlihat. Blok ini memakai permukaan pucat & teks sekunder supaya
   tidak pernah terasa seperti aksi produk. */

export const SHARE_DEMO_COPY = {
  title: 'Di build demo',
  body: 'Registry kartu masih mock (tanpa backend), jadi tiga contoh di bawah memperlihatkan semua state halaman: kartu penuh, kartu yang catatannya masih tipis, dan kartu yang sudah tidak tersedia.',
  statesLabel: 'Coba state lain',
} as const

export const DEMO_SHARE_STATES: { label: string; id: string }[] = [
  { label: 'Kartu penuh', id: ACTIVE_SHARE_CARD_ID },
  { label: 'Masih tumbuh', id: 'dimas-okt' },
  { label: 'Tidak tersedia', id: DEMO_UNKNOWN_SHARE_ID },
]

/* ── METADATA (dibaca `generateMetadata` di route) ───────────────────────────
   Tautan ini beredar lewat WhatsApp/IG, jadi judul & deskripsi harus enak
   dipratinjau — DAN tetap bebas angka keuangan (PRD 6572–6576). Karena itu
   penulisannya sengaja TIDAK menyisipkan nominal apa pun. */

export function shareMetadataTitle(card: ShareCard): string {
  return `${shareHeadline(card.ownerName)} — CatetInd`
}

export function shareMetadataDescription(card: ShareCard): string {
  return `Kartu pencapaian ${card.ownerName} di CatetInd: jumlah catatan, hari konsisten, dan tahap tanaman — tanpa satu pun angka rupiah.`
}

/** judul/deskripsi untuk id yang tidak dikenal: sebut apa adanya, jangan mengarang nama */
export const SHARE_UNKNOWN_METADATA_TITLE = 'Kartu pencapaian — CatetInd'

export const SHARE_UNKNOWN_METADATA_DESCRIPTION =
  'Kartu pencapaian CatetInd: jumlah catatan, hari konsisten, dan tahap tanaman — tanpa satu pun angka rupiah.'



