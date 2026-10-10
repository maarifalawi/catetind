import { WALLET_BRAND_OPTIONS, type WalletArt } from '../wallets'

/* ── TEMA KARTU DOMPET: 7 BAWAAN BRAND vs 9 TEMA KUSTOM (paket 77) ────────────
   Sampai paket 76 warna muka kartu dompet SELALU ditentukan kode: resep palet
   yang berputar menurut posisi dompet (`walletCardRecipe` di lib/wallets.ts),
   dan itu keputusan yang benar — deck kartu tidak boleh jadi kumpulan warna acak
   (lihat catatan paket 04 di lib/wallets.ts).

   Yang ditambahkan paket ini BUKAN pelanggaran aturan itu, melainkan lapis
   berikutnya: user boleh MEMILIH satu dari SEMBILAN tema kustom yang sudah
   dikurasi di sini. Semua stop gradiennya tetap berasal dari palet kanon "Earth
   Pastel" (docs/theme/PALETTE.md) — user memilih kombinasi yang sudah ada, bukan
   mengetik warna sendiri. Karena itu guard palet
   (`node scripts/theme/audit-palette.mjs`) tetap hijau: tidak ada hex baru di
   file ini.

   DUA KELOMPOK YANG TIDAK BOLEH BERCAMPUR (permintaan paket 77):
     · BAWAAN — 7 tema brand (`DEFAULT_BRAND_THEME_IDS`, diturunkan dari
       `WALLET_BRAND_OPTIONS`: BCA, GoPay, Mandiri, BNI, OVO, Dana, Jago). Ini
       bukan gradien kartu; ia penanda kelompok brand bawaan.
     · KUSTOM — `WALLET_CUSTOM_THEMES`, PERSIS 9 entri, id-nya berawalan
       `custom-` sehingga mustahil bertabrakan dengan `brand-…`.

   `lib/data/wallet-themes.test.ts` mengunci jumlah 9, keunikan id, dan
   keterpisahan kedua kelompok itu — jadi menambah/menghapus tema tanpa sengaja
   akan langsung ketahuan.

   Penyimpanannya (peta `walletId → themeId`) ada di `hooks/use-wallet-theme.ts`
   + `localStorage` `catet-wallet-themes`, dan pembacanya SATU: `WalletFace`
   (`components/catetind/wallet-card-face.tsx`). Itu sebabnya /wallet,
   /wallet/[id], dan pratinjau Tambah Dompet tidak mungkin menampilkan tema yang
   berbeda untuk dompet yang sama.
   🚧 Di produksi: kolom `theme_id` di tabel `wallets` (sinkron antar perangkat).
   ────────────────────────────────────────────────────────────────────────── */

/**
 * Satu tema kartu kustom — data murni, tanpa React.
 *
 * Semua kelasnya LITERAL (bukan dirakit dari potongan string) supaya terbaca
 * scanner Tailwind, persis seperti catatan di `lib/typography.ts`.
 */
export interface WalletCardTheme {
  /** id stabil & unik — inilah yang disimpan di preferensi perangkat */
  id: string
  /** nama tema yang dibaca user */
  name: string
  /** satu kalimat deskripsi (dipakai sebagai keterangan & aria-label) */
  note: string
  /**
   * Kelas gradien MUKA kartu. Aturan kanon (sama dengan `WALLET_SEED`): stop
   * pertama warna aksen, stop terakhir shade gelap dari aksen yang sama —
   * supaya teks cream di atasnya tetap kontras.
   */
  face: string
  /** Kelas gradien halo aksen di belakang kartu (bukan warna muka) */
  color: string
  /** Motif garis yang menemani tema ini (lihat `WalletArtDefs`) */
  art: WalletArt
  /** Pratinjau kecil di pemilih tema (bukan muka kartu) */
  swatch: string
}

/**
 * id tema untuk brand bawaan: `'BCA'` → `'brand-bca'`.
 * Dipakai HANYA untuk menandai kelompok bawaan (dan membuktikan keterpisahannya
 * dari tema kustom) — bukan untuk menyimpan pilihan user.
 */
export function brandThemeId(name: string): string {
  const slug = name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
  return `brand-${slug}`
}

/** 7 tema bawaan — satu per brand di `WALLET_BRAND_OPTIONS` (bukan gradien kartu) */
export const DEFAULT_BRAND_THEME_IDS: readonly string[] = WALLET_BRAND_OPTIONS.map((brand) =>
  brandThemeId(brand.name),
)

/** jumlah tema kustom yang dijanjikan ke user (dikunci di test) */
export const WALLET_THEME_COUNT = 9

/**
 * SEMBILAN tema kustom — persis 9, id unik, terpisah dari 7 tema bawaan.
 *
 * Urutannya adalah urutan tampil di pemilih tema, jadi ia sengaja dibuat
 * bergantian hue (hijau → kuning → biru → ungu → olive → mint →
 * evergreen → kuning daun → tanah) supaya deretnya enak dibaca mata, bukan
 * sembilan gradien yang mirip semua.
 */
export const WALLET_CUSTOM_THEMES: WalletCardTheme[] = [
  {
    id: 'custom-aurora-utara',
    name: 'Aurora Utara',
    note: 'Aurora hijau–mint, terang dari bawah kiri.',
    face: 'bg-gradient-to-tl from-[#91bb9e] via-[#45594e] to-[#161c19]',
    color: 'bg-gradient-to-r from-[#dbe4c7] to-[#91bb9e]',
    art: 'mendung',
    swatch: 'bg-gradient-to-br from-[#dbe4c7] via-[#91bb9e] to-[#161c19]',
  },
  {
    id: 'custom-senja-daisy',
    name: 'Senja Daisy',
    note: 'Kuning daisy ke amber, seperti matahari rendah.',
    face: 'bg-gradient-to-br from-[#ecd768] via-[#e8b06a] to-[#73533c]',
    color: 'bg-gradient-to-r from-[#f6edb7] to-[#e8b06a]',
    art: 'parang',
    swatch: 'bg-gradient-to-br from-[#f6edb7] via-[#ecd768] to-[#73533c]',
  },
  {
    id: 'custom-kabut-thistle',
    name: 'Kabut Thistle',
    note: 'Biru kelabu berkabut, tenang dan sejuk.',
    face: 'bg-gradient-to-tr from-[#91a0b8] via-[#414853] to-[#161c19]',
    color: 'bg-gradient-to-r from-[#dbdccf] to-[#91a0b8]',
    art: 'rings',
    swatch: 'bg-gradient-to-br from-[#dbdccf] via-[#91a0b8] to-[#161c19]',
  },
  {
    id: 'custom-plum-malam',
    name: 'Plum Malam',
    note: 'Ungu plum tua, gelap dari atas ke bawah.',
    face: 'bg-gradient-to-b from-[#b89191] via-[#534141] to-[#000000]',
    color: 'bg-gradient-to-r from-[#e7d8c3] to-[#b89191]',
    art: 'kawung',
    swatch: 'bg-gradient-to-b from-[#e7d8c3] via-[#b89191] to-[#000000]',
  },
  {
    id: 'custom-olive-rimba',
    name: 'Olive Rimba',
    note: 'Olive hutan yang hangat dan kalem.',
    face: 'bg-gradient-to-tl from-[#b5b987] via-[#51533d] to-[#000000]',
    color: 'bg-gradient-to-r from-[#e6e4c0] to-[#b5b987]',
    art: 'mendung',
    swatch: 'bg-gradient-to-br from-[#e6e4c0] via-[#b5b987] to-[#51533d]',
  },
  {
    id: 'custom-mint-kabut',
    name: 'Mint Kabut',
    note: 'Mint lembut di atas hijau tua.',
    face: 'bg-gradient-to-bl from-[#dbe4c7] via-[#52685c] to-[#161c19]',
    color: 'bg-gradient-to-r from-[#91bb9e] to-[#52685c]',
    art: 'kawung',
    swatch: 'bg-gradient-to-bl from-[#dbe4c7] via-[#91bb9e] to-[#52685c]',
  },
  {
    id: 'custom-hutan-sepi',
    name: 'Hutan Sepi',
    note: 'Evergreen pekat, hampir gelap total.',
    face: 'bg-gradient-to-t from-[#52685c] via-[#1f2823] to-[#000000]',
    color: 'bg-gradient-to-r from-[#c4c7af] to-[#45594e]',
    art: 'rings',
    swatch: 'bg-gradient-to-t from-[#52685c] via-[#45594e] to-[#000000]',
  },
  {
    id: 'custom-daun-kuning',
    name: 'Daun Kuning',
    note: 'Kuning daun yang perlahan jadi olive.',
    face: 'bg-gradient-to-br from-[#f6edb7] via-[#b5b987] to-[#51533d]',
    color: 'bg-gradient-to-r from-[#ecd768] to-[#b5b987]',
    art: 'mendung',
    swatch: 'bg-gradient-to-br from-[#f6edb7] via-[#ecd768] to-[#51533d]',
  },
  {
    id: 'custom-tanah-senja',
    name: 'Tanah Senja',
    note: 'Cokelat tanah dengan semburat senja.',
    face: 'bg-gradient-to-tr from-[#e8b06a] via-[#534141] to-[#000000]',
    color: 'bg-gradient-to-r from-[#fbe3c0] to-[#e8b06a]',
    art: 'parang',
    swatch: 'bg-gradient-to-tr from-[#fbe3c0] via-[#e8b06a] to-[#534141]',
  },
]

/** tema kustom dari id-nya; `null` = id bawaan/kosong/tidak dikenal */
export function walletThemeById(id: string | null | undefined): WalletCardTheme | null {
  if (!id) return null
  return WALLET_CUSTOM_THEMES.find((theme) => theme.id === id) ?? null
}

/** true = id ini menunjuk tema kustom (bukan tema brand bawaan) */
export function isCustomWalletTheme(id: string | null | undefined): boolean {
  return walletThemeById(id) !== null
}

/**
 * Dompet + tema → dompet yang BENAR-BENAR dirender.
 *
 * Murni & generik supaya bisa dipakai bentuk apa pun yang punya `face`/`color`/
 * `art` (`WalletAccount` di /wallet, dan objek pratinjau di sheet Tambah
 * Dompet). Tema tidak dikenal = dompet dikembalikan APA ADANYA (identitas objek
 * dipertahankan) sehingga pemanggil bisa memakai hasilnya sebagai dependency
 * `useMemo` tanpa render berulang.
 */
export function applyWalletTheme<T extends { face: string; color: string; art: WalletArt }>(
  wallet: T,
  themeId: string | null | undefined,
): T {
  const theme = walletThemeById(themeId)
  if (!theme) return wallet
  return { ...wallet, face: theme.face, color: theme.color, art: theme.art }
}

/**
 * Stop gradien muka kartu deck Dashboard (`from-… via-… to-…`) — TANPA arahnya.
 *
 * Arah gradien tidak ikut dipindah karena muka kartu deck menempelkan arahnya
 * sendiri (`bg-gradient-to-br`, lihat `wallet-card-stack.tsx`): yang dibutuhkan
 * dari tema hanya ramp warnanya. Kelasnya tetap literal di file ini, jadi scanner
 * Tailwind tetap menemukannya.
 */
export function themeGradientStops(face: string): string {
  return face.replace(/^bg-gradient-to-[a-z]+\s+/, '')
}

/**
 * Dompet bentuk DECK (`Wallet`: `faceClass`/`bandClass`/`glowClass`/`art`) + tema
 * → dompet yang dirender.
 *
 * Kenapa dipisah dari `applyWalletTheme()`: dua muka kartu app ini memang memakai
 * kunci warna yang berbeda (deck Dashboard memakai `faceClass`+`bandClass`,
 * halaman Dompet memakai `face`+`color`). Yang DISAMAKAN adalah TEMANYA — dompet
 * bertema tidak boleh berbeda warna antara Dashboard, /wallet, dan /wallet/[id].
 */
export function applyWalletDeckTheme<
  T extends { faceClass: string; bandClass: string; glowClass?: string; art: WalletArt },
>(wallet: T, themeId: string | null | undefined): T {
  const theme = walletThemeById(themeId)
  if (!theme) return wallet
  return {
    ...wallet,
    faceClass: themeGradientStops(theme.face),
    bandClass: themeGradientStops(theme.swatch),
    glowClass: theme.color,
    art: theme.art,
  }
}

/* ── PREFERENSI TEMA DI PERANGKAT ────────────────────────────────────────────
   Peta `walletId → themeId`. Disimpan di localStorage (perangkat ini), dan
   SANITIZED saat dibaca: id tema yang sudah tidak ada di `WALLET_CUSTOM_THEMES`
   dibuang, bukan dipakai — supaya tema yang dihapus di versi berikutnya tidak
   meninggalkan kartu tanpa gradien. */

/** kunci localStorage — satu-satunya nama key tema kartu di app */
export const WALLET_THEME_STORAGE_KEY = 'catet-wallet-themes'

/** peta dompet → tema kustom yang dipilih user */
export type WalletThemePrefs = Readonly<Record<string, string>>

/** dibaca mentah dari localStorage → peta bersih (entri tidak valid dibuang) */
export function parseWalletThemePrefs(raw: string | null | undefined): WalletThemePrefs {
  if (!raw) return {}
  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch {
    /* nilai rusak ≠ app rusak: kembali ke bawaan, jangan melempar */
    return {}
  }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {}
  const out: Record<string, string> = {}
  for (const [walletId, themeId] of Object.entries(parsed as Record<string, unknown>)) {
    if (!walletId || typeof themeId !== 'string') continue
    if (!isCustomWalletTheme(themeId)) continue
    out[walletId] = themeId
  }
  return out
}

/** peta bersih → teks yang disimpan (urut kunci supaya tulisan stabil) */
export function serializeWalletThemePrefs(prefs: WalletThemePrefs): string {
  const keys = Object.keys(prefs).sort()
  const out: Record<string, string> = {}
  for (const key of keys) out[key] = prefs[key]
  return JSON.stringify(out)
}

/**
 * Set satu tema dompet. `themeId` `null` = kembali ke kartu bawaan (kuncinya
 * DIHAPUS, bukan diisi penanda "bawaan" — supaya peta hanya memuat pilihan yang
 * benar-benar dibuat user). Kalau tidak ada yang berubah, peta lama dikembalikan
 * APA ADANYA: pemanggil (store preferensi) memakainya sebagai penanda "tidak
 * perlu menyimpan apa-apa".
 */
export function withWalletTheme(
  prefs: WalletThemePrefs,
  walletId: string,
  themeId: string | null,
): WalletThemePrefs {
  if (!walletId) return prefs
  const clean = themeId && isCustomWalletTheme(themeId) ? themeId : null
  if (clean === null) {
    if (!(walletId in prefs)) return prefs
    const next = { ...prefs }
    delete next[walletId]
    return next
  }
  if (prefs[walletId] === clean) return prefs
  return { ...prefs, [walletId]: clean }
}

/* ── COPY PEMILIH TEMA (user-facing, tidak boleh ditulis di JSX) ───────────── */

export const WALLET_THEME_COPY = {
  label: 'Tema kartu',
  defaultName: 'Bawaan',
  defaultNote: 'Kartu memakai resep bawaan dompetmu.',
  /** pembaca layar: nama tema + keterangannya, bukan warna saja */
  chooseA11y: (name: string, note: string) => `Pakai tema ${name}. ${note}`,
  /** penanda tema yang sedang aktif di pemilih */
  activeBadge: 'Dipilih',
  /** jumlah tema kustom di kepala bagian — dibaca dari data, bukan ditulis manual */
  count: (count: number) => `${count} tema kustom`,
} as const
