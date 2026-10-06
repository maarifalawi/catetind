export type WalletKind = 'bank' | 'ewallet' | 'cash'
export type WalletArt = 'parang' | 'mendung' | 'kawung' | 'rings'

export interface Wallet {
  id: string
  name: string
  holder: string
  number: string
  network: string
  balance: number
  bandClass: string
  faceClass: string
  glowClass?: string
  art: WalletArt
  kind: WalletKind
  context: 'pribadi' | 'keluarga' | 'bersama'
}

/**
 * Bentuk dompet untuk halaman Dompet & Akun (`/wallet`).
 *
 * Beda dengan `Wallet` (yang dipakai deck kartu Home): di sini `color` adalah
 * kelas latar Tailwind utuh (mis. `'bg-thistle'`) supaya kartu bisa diwarnai
 * langsung dari data tanpa lookup map — dan `id` berupa number karena state
 * halaman ini murni mock lokal.
 */
export interface WalletAccount {
  /** id dompet kanon (string) — sama dengan `WalletSeed.id`, dipakai URL detail */
  id: string
  name: string
  /** jenis akun — dipakai sebagai label kecil di kartu */
  type: 'Bank' | 'E-Wallet' | 'Cash'
  balance: number
  /** nomor akun tersamarkan (mis. '•••• 0849') — pajangan kecil di muka kartu,
   *  bikin kartunya terasa seperti kartu asli, bukan kotak saldo */
  number?: string
  /**
   * Kelas GRADIEN aksen Tailwind (mis. `'bg-gradient-to-r from-[#dbe4c7] to-[#91bb9e]'`).
   *
   * Dipakai untuk halo cahaya di belakang kartu, segmen bar komposisi di hero, dan
   * titik legenda. Sengaja gradien — bukan warna solid — supaya aksennya lembut,
   * tidak "blok warna" keras; semuanya tetap di palet kanon (Olive, Leaf, Thistle,
   * Plum, Cantelope, Daisy). Rujukan: docs/theme/PALETTE.md
   */
  color: string
  /**
   * Kelas gradien MUKA kartu (mis. `'bg-gradient-to-br from-[#91bb9e] via-[#52685c] to-[#161c19]'`).
   *
   * Resep kanon: stop PERTAMA = warna aksen palet, stop TERAKHIR selalu shade
   * gelap dari aksen yang sama (×0.45 → ×0.32) supaya nama & saldo putih tetap
   * kontras di atasnya. Satu dompet = satu keluarga warna palet, jadi seluruh
   * deck kartu terasa satu sistem, bukan kumpulan warna acak.
   */
  face: string
  /** motif aksen muka kartu — sama seperti deck di Home, jadi tiap kartu punya
   *  "tema" sendiri (parang/mendung/kawung/rings) seperti kartu bank edisi batik */
  art: WalletArt
  /**
   * Konteks uang dompet ini (PRD Domain 2C.2) — ikut dibawa ke bentuk KARTU
   * sejak paket 55.
   *
   * Sebelumnya konteks hanya hidup di `WalletSeed`/`Wallet` (deck Home), padahal
   * sheet pindah dana bekerja dengan bentuk kartu ini. Akibatnya sheet tidak bisa
   * memberi tahu bahwa dompet TUJUAN berada di konteks uang lain — padahal
   * pindah dana antar konteks itu sah dan perlu disadari user (paket 47).
   */
  context: 'pribadi' | 'keluarga' | 'bersama'
}

/**
 * DOMPET KANON — SATU-SATUNYA sumber identitas dompet, warna kartunya, dan
 * saldo PEMBUKA-nya (paket 40).
 *
 * Sebelum paket 40 ada DUA daftar dengan nama dompet yang sama tapi saldo
 * berbeda: satu berbunyi Rp 1.850.000 (dipakai Dompet & Kekayaan) dan satu lagi
 * Rp 4.309.573 (dipakai Home & API). Satu user punya dua
 * "Total Saldo" yang berbeda Rp 2.459.573. Sekarang definisinya satu, dan
 * angka `opening` di bawah adalah angka kanon yang dipakai SEMUA halaman:
 *
 *   total = Rp 1.850.000 (BCA Rp 1.450.000 + GoPay Rp 350.000 + Tunai Rp 50.000)
 *
 * `opening` = saldo SEBELUM baris ledger apa pun (`lib/money/ledger.ts`).
 * Saldo yang dibaca halaman SELALU `opening + Σ baris ledger` (lihat
 * `lib/money/store.ts`) — tidak ada lagi angka saldo yang disimpan di komponen.
 *
 * 🚧 Produksi: `SELECT id, name, opening_balance, … FROM wallets WHERE user_id = auth.uid()`.
 */
export interface WalletSeed {
  /** id publik dompet — dipakai URL `/wallet/[id]` dan kunci baris ledger */
  id: string
  name: string
  holder: string
  /** nomor akun tersamarkan (`•••• 0849`) atau keterangan cash (`Uang cash`) */
  number: string
  network: string
  /** saldo pembuka (kas awal user) — integer rupiah */
  opening: number
  /** jenis untuk muka kartu Home (deck) */
  kind: WalletKind
  /** jenis untuk kartu halaman Dompet & Akun */
  type: WalletAccount['type']
  /** konteks uang (PRD Domain 2C.2) */
  context: 'pribadi' | 'keluarga' | 'bersama'
  /** gelombang warna header kartu (deck Home) */
  bandClass: string
  /** muka kartu versi deck Home */
  faceClass: string
  glowClass?: string
  /** halo aksen muka kartu halaman Dompet & Akun */
  color: string
  /** muka kartu halaman Dompet & Akun */
  face: string
  art: WalletArt
}

export const WALLET_SEED: WalletSeed[] = [
  {
    id: 'bca',
    name: 'BCA',
    holder: 'Jon Snow',
    number: '•••• 0849',
    network: 'VISA',
    opening: 1_450_000,
    kind: 'bank',
    type: 'Bank',
    context: 'pribadi',
    bandClass: 'from-[#c4c7af] via-[#ffffff] to-[#c4c7af]',
    faceClass: 'from-[#52685c] via-[#45594e] to-[#161c19]', // evergreen
    glowClass: 'bg-evergreen/25',
    /* aksen & muka kartu diambil dari palet kanon (Evergreen family),
       satu keluarga dengan hero & halaman lain — lihat docs/theme/PALETTE.md */
    color: 'bg-gradient-to-r from-[#c4c7af] to-[#45594e]',
    face: 'bg-gradient-to-br from-[#52685c] via-[#45594e] to-[#161c19]', // evergreen → gelap
    art: 'parang',
  },
  {
    id: 'gopay',
    name: 'GoPay',
    holder: 'Jon Snow',
    number: '•••• 2210',
    network: 'E-WALLET',
    opening: 350_000,
    kind: 'ewallet',
    type: 'E-Wallet',
    context: 'pribadi',
    bandClass: 'from-[#dbe4c7] via-[#ffffff] to-[#dbe4c7]',
    faceClass: 'from-[#91bb9e] via-[#52685c] to-[#161c19]', // leaf
    glowClass: 'bg-leaf/25',
    color: 'bg-gradient-to-r from-[#dbe4c7] to-[#91bb9e]',
    face: 'bg-gradient-to-br from-[#91bb9e] via-[#52685c] to-[#161c19]', // leaf → gelap
    art: 'mendung',
  },
  {
    id: 'tunai',
    name: 'Tunai',
    holder: 'Jon Snow',
    /* uang kertas tidak punya nomor seri yang ditampilkan di muka kartu —
       varian muka kartu Tunai memakai ilustrasi tumpukan uang, bukan
       chip EMV / contactless / nomor akun */
    number: 'Uang cash',
    network: 'TUNAI',
    opening: 50_000,
    kind: 'cash',
    type: 'Cash',
    context: 'keluarga',
    bandClass: 'from-[#e6e4c0] via-[#ffffff] to-[#e6e4c0]',
    faceClass: 'from-[#b5b987] via-[#51533d] to-[#000000]', // olive
    glowClass: 'bg-olive/30',
    color: 'bg-gradient-to-r from-[#e6e4c0] to-[#b5b987]',
    face: 'bg-gradient-to-br from-[#b5b987] via-[#51533d] to-[#000000]', // olive → gelap
    art: 'kawung',
  },
]

/**
 * Total saldo SELURUH dompet likuid (kas) — dipakai Dompet & Akun, Net Worth,
 * Home, dan `/wallet/[id]`.
 *
 * Daftarnya WAJIB datang dari pemanggil (state `lib/money/store.ts`); tidak ada
 * lagi nilai default yang membaca konstanta, karena justru itu yang dulu bikin
 * halaman berbeda angka. Satu implementasi, dipakai semua halaman.
 */
export function walletAccountsTotal(accounts: readonly WalletAccount[]): number {
  return accounts.reduce((sum, account) => sum + account.balance, 0)
}

/** dompet kanon → bentuk muka kartu halaman Dompet & Akun (`balance` dihitung store) */
export function toWalletAccount(record: WalletSeed, balance: number): WalletAccount {
  return {
    id: record.id,
    name: record.name,
    type: record.type,
    balance,
    ...(record.number ? { number: record.number } : {}),
    color: record.color,
    face: record.face,
    art: record.art,
    /* konteks ikut dibawa (paket 55): sheet pindah dana perlu tahu dompet tujuan
       ada di konteks uang mana, supaya pindah antar konteks tidak terjadi diam-diam */
    context: record.context,
  }
}

/** dompet kanon → bentuk kartu deck Home (`balance` dihitung store) */
export function toHomeWallet(record: WalletSeed, balance: number): Wallet {
  return {
    id: record.id,
    name: record.name,
    holder: record.holder,
    number: record.number,
    network: record.network,
    balance,
    bandClass: record.bandClass,
    faceClass: record.faceClass,
    glowClass: record.glowClass,
    art: record.art,
    kind: record.kind,
    context: record.context,
  }
}

/** jenis akun → jenis kartu deck Home (satu pemetaan, dipakai dompet baru juga) */
export function walletKindOf(type: WalletAccount['type']): WalletKind {
  if (type === 'Bank') return 'bank'
  if (type === 'E-Wallet') return 'ewallet'
  return 'cash'
}

/** jenis akun → label jaringan di muka kartu (bukan pilihan user) */
export function walletNetworkOf(type: WalletAccount['type']): string {
  if (type === 'Bank') return 'DEBIT'
  if (type === 'E-Wallet') return 'E-WALLET'
  return 'TUNAI'
}

/** filter dompet kanon per konteks uang (PRD Domain 2C.2) */
export function filterWalletsByContext<T extends { context: WalletSeed['context'] }>(
  wallets: readonly T[],
  ctx: 'pribadi' | 'keluarga' | 'bersama' | 'all',
): T[] {
  if (ctx === 'all') return [...wallets]
  return wallets.filter((wallet) => wallet.context === ctx)
}


/* ── SISTEM WARNA & IDENTITAS DOMPET BARU (paket 04) ──────────────────────────
   Modal "Tambah Dompet" tidak boleh mengarang gradien/hex baru: kalau boleh,
   deck kartu di /wallet perlahan jadi kumpulan warna acak dan halaman berhenti
   terasa satu sistem. Karena itu warna dompet baru DIBACA dari resep yang sudah
   ada di `WALLET_SEED` — bukan diisi dari form.

   Resepnya diangkat ke array sendiri supaya pemakaiannya bisa memutar (siklus):
   dompet ke-4 memakai lagi kartu Evergreen, ke-5 Leaf, ke-6 Olive, dan
   seterusnya. Menambah resep ke-4 berarti mengambil keluarga warna baru dari
   docs/theme/PALETTE.md — bukan menulis hex di komponen. */

export interface WalletCardRecipe {
  /** halo aksen (gradien) */
  color: string
  /** muka kartu (gradien gelap) */
  face: string
  /** motif batik muka kartu */
  art: WalletArt
}

/** resep warna muka kartu dompet — SATU-SATUNYA sumber untuk kartu dompet baru */
export const WALLET_CARD_RECIPES: WalletCardRecipe[] = WALLET_SEED.map(
  ({ color, face, art }) => ({ color, face, art }),
)

/** resep untuk dompet ke-`index` (siklus berurutan, tidak pernah undefined) */
export function walletCardRecipe(index: number): WalletCardRecipe {
  return WALLET_CARD_RECIPES[index % WALLET_CARD_RECIPES.length]
}

/**
 * Jenis akun yang bisa dipilih di modal Tambah Dompet.
 * `id` sengaja SAMA dengan `WalletAccount.type` supaya tidak perlu pemetaan;
 * `label` bahasa produk (data tetap Inggris — pola WALLET_TYPE_LABEL).
 */
export const WALLET_KIND_OPTIONS: { id: WalletAccount['type']; label: string }[] = [
  { id: 'Bank', label: 'Bank' },
  { id: 'E-Wallet', label: 'E-Wallet' },
  { id: 'Cash', label: 'Tunai' },
]

export interface WalletBrandOption {
  name: string
  /** jenis akun yang paling masuk akal untuk brand ini (mengisi jenis otomatis) */
  type: 'Bank' | 'E-Wallet'
  /** kelas monogram brand (palet kanon) — literal supaya terbaca scanner Tailwind */
  tile: string
  /** bayangan saat kartu brand di-hover (rail "Tambah Dompet Cepat") */
  frame: string
}

/**
 * Daftar brand populer untuk: (a) rail "Tambah Dompet Cepat" di /wallet dan
 * (b) pemilih brand di modal Tambah Dompet. SATU daftar, dua pemakai — supaya
 * brand yang disarankan rail tidak pernah beda warnanya dari brand di modal.
 *
 * Pool ini bukan yang langsung tampil di rail: brand yang sudah dimiliki user
 * disaring keluar dulu (lihat `suggestedBrands` di wallet-screen.tsx).
 */
export const WALLET_BRAND_OPTIONS: WalletBrandOption[] = [
  {
    name: 'BCA',
    type: 'Bank',
    tile: 'bg-gradient-to-br from-sage via-mint-soft to-mint text-forest ring-mint/40',
    frame: 'hover:shadow-[0_22px_40px_-26px_rgba(69,89,78,0.55)]',
  },
  {
    name: 'GoPay',
    type: 'E-Wallet',
    tile: 'bg-gradient-to-br from-[#dbe4c7] via-[#91bb9e] to-[#91bb9e] text-forest ring-[#91bb9e]/50',
    frame: 'hover:shadow-[0_22px_40px_-26px_rgba(145,187,158,0.75)]',
  },
  {
    name: 'Mandiri',
    type: 'Bank',
    tile: 'bg-gradient-to-br from-[#f6edb7] via-[#ecd768] to-[#ecd768] text-forest ring-[#ecd768]/60',
    frame: 'hover:shadow-[0_22px_40px_-26px_rgba(236,215,104,0.85)]',
  },
  {
    name: 'BNI',
    type: 'Bank',
    tile: 'bg-gradient-to-br from-[#fbe3c0] via-[#ffb885] to-[#ffb885] text-forest ring-[#ffb885]/60',
    frame: 'hover:shadow-[0_22px_40px_-26px_rgba(255,184,133,0.8)]',
  },
  {
    name: 'OVO',
    type: 'E-Wallet',
    tile: 'bg-gradient-to-br from-[#e7d8c3] via-[#b89191] to-[#b89191] text-forest ring-[#b89191]/50',
    frame: 'hover:shadow-[0_22px_40px_-26px_rgba(184,145,145,0.8)]',
  },
  {
    name: 'Dana',
    type: 'E-Wallet',
    tile: 'bg-gradient-to-br from-[#e6e4c0] via-[#b5b987] to-[#b5b987] text-forest ring-[#b5b987]/50',
    frame: 'hover:shadow-[0_22px_40px_-26px_rgba(181,185,135,0.9)]',
  },
  {
    name: 'Jago',
    type: 'Bank',
    tile: 'bg-gradient-to-br from-sage via-[#c4c7af] to-[#c4c7af] text-forest ring-[#c4c7af]/60',
    frame: 'hover:shadow-[0_22px_40px_-26px_rgba(196,199,175,0.9)]',
  },
]

/** brand menurut namanya (case-insensitive) — mis. ghost card "BCA" → resep BCA */
export function walletBrandByName(name: string): WalletBrandOption | null {
  const key = name.trim().toLowerCase()
  return WALLET_BRAND_OPTIONS.find((brand) => brand.name.toLowerCase() === key) ?? null
}

/** brand yang cocok dengan satu jenis akun (Tunai tidak punya brand) */
export function walletBrandsByKind(kind: WalletAccount['type']): WalletBrandOption[] {
  return WALLET_BRAND_OPTIONS.filter((brand) => brand.type === kind)
}

/**
 * Simbol sensor di depan nomor akun (mis. `•••• 0849`).
 *
 * Ditaruh di lapis data, bukan ditulis di JSX: muka kartu, pratinjau dompet baru,
 * dan data awal di `WALLET_SEED` memakai simbol yang SAMA supaya bentuk
 * nomor tersamarkan tidak pernah beda antar tempat.
 */
export const WALLET_NUMBER_MASK = '••••'

/** `0849` → `•••• 0849` (empat angka terakhir yang diketik user) */
export function maskedAccountNumber(last4: string): string {
  return `${WALLET_NUMBER_MASK} ${last4.trim()}`
}

/** isi form modal Tambah Dompet (teks & angka mentah, belum jadi WalletAccount) */
export interface WalletDraft {
  name: string
  type: WalletAccount['type']
  /** nomor akun tersamarkan siap pajang (mis. '•••• 0849') — opsional */
  number?: string
  /** saldo yang user ketik sendiri — 0 kalau dikosongkan */
  balance: number
}

/**
 * Dompet baru siap pakai.
 *
 * Nama & saldo datang dari user; WARNA tidak pernah dari user: `index` (posisi
 * dompet di daftar) menentukan resep mana yang dipakai lewat `walletCardRecipe()`,
 * jadi mustahil ada kartu dengan gradien di luar palet. `number` cuma dipasang
 * kalau memang ada isinya, supaya muka kartu tidak pernah mencetak "undefined".
 *
 * `id` sengaja TIDAK ada di sini (paket 40): yang menentukan id adalah store
 * (`lib/money/store.ts`) — satu tempat yang juga menulis baris ledger-nya, jadi
 * mustahil ada dompet di halaman Dompet yang tidak dikenal ledger.
 */
export function createWalletAccount(
  draft: WalletDraft,
  index: number,
): Omit<WalletAccount, 'id'> {
  const recipe = walletCardRecipe(index)
  const number = draft.number?.trim()
  return {
    name: draft.name.trim(),
    type: draft.type,
    balance: Math.max(0, Math.round(draft.balance)),
    ...(number ? { number } : {}),
    ...recipe,
    /* Pratinjau kartu di modal Tambah Dompet tidak punya pilihan konteks: yang
       menentukan konteks dompet baru adalah KONTEKS UANG YANG SEDANG AKTIF, dan
       itu diputuskan store saat menyimpan (`addWalletAccount(input.context)`).
       Nilai di sini cuma dipakai muka kartu pratinjau, jadi selalu 'pribadi'
       sampai store menggantinya (paket 55). */
    context: 'pribadi',
  }
}




/**
 * Kartu yang sedang di depan deck dompet (halaman Home).
 *
 * Dipakai panel "Your Balance Overview": panel MENGIKUTI kartu yang dipencet
 * user — kartu BCA → detail BCA, kartu GoPay → detail GoPay — bukan selalu
 * menampilkan total gabungan semua dompet.
 */
export type DeckSelection =
  | { type: 'all'; total: number }
  | { type: 'wallet'; wallet: Wallet }

/**
 * Pool kandidat saat user menekan "Tambah Dompet" (demo) — dipakai deck Home.
 * Saldonya jadi `opening` dompet baru saat store menambahkannya, jadi kandidat
 * ini juga ikut terhitung di "Total Saldo" baik di Home maupun `/wallet`.
 */
export const WALLET_POOL: Wallet[] = [
  {
    id: 'ovo',
    name: 'OVO',
    holder: 'Jon Snow',
    number: '•••• 5566',
    network: 'E-WALLET',
    balance: 750000,
    bandClass: 'from-[#e7d8c3] via-[#ffffff] to-[#e7d8c3]',
    faceClass: 'from-[#b89191] via-[#534141] to-[#000000]', // plum
    glowClass: 'bg-plum/30',
    art: 'rings',
    kind: 'ewallet',
    context: 'keluarga',
  },
  {
    id: 'dana',
    name: 'DANA',
    holder: 'Jon Snow',
    number: '•••• 8890',
    network: 'E-WALLET',
    balance: 425000,
    bandClass: 'from-[#dbdccf] via-[#ffffff] to-[#dbdccf]',
    faceClass: 'from-[#91a0b8] via-[#414853] to-[#161c19]', // thistle
    glowClass: 'bg-thistle/25',
    art: 'mendung',
    kind: 'ewallet',
    context: 'bersama',
  },
  {
    id: 'mandiri',
    name: 'Mandiri',
    holder: 'Jon Snow',
    number: '•••• 7712',
    network: 'DEBIT',
    balance: 5250000,
    bandClass: 'from-[#f6edb7] via-[#ffffff] to-[#f6edb7]',
    faceClass: 'from-[#ecd768] via-[#6a612f] to-[#000000]', // daisy
    glowClass: 'bg-daisy/30',
    art: 'parang',
    kind: 'bank',
    context: 'bersama',
  },
  {
    id: 'jago',
    name: 'Jago',
    holder: 'Jon Snow',
    number: '•••• 3345',
    network: 'VISA',
    balance: 1100000,
    bandClass: 'from-[#fbe3c0] via-[#ffffff] to-[#fbe3c0]',
    faceClass: 'from-[#ffb885] via-[#73533c] to-[#000000]', // cantelope
    glowClass: 'bg-cantelope/25',
    art: 'kawung',
    kind: 'bank',
    context: 'bersama',
  },
]

export function formatIDR(value: number) {
  return `Rp ${value.toLocaleString('id-ID')}`
}
