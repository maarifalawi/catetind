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
  id: number
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
}

/**
 * Dompet awal yang terdaftar di halaman Dompet & Akun (`/wallet`) — SATU sumber
 * kebenaran untuk KAS LIKUID user.
 *
 * PENTING (audit fintech #1): daftar ini bukan cuma data pajangan halaman
 * Dompet. `walletAccountsTotal()` di bawah dipakai halaman Kekayaan & Hutang
 * untuk menghitung sisi ASET pada Net Worth
 * (`Net Worth = Kas Likuid + Aset Investasi − Hutang`). Sebelumnya Net Worth
 * hanya menjumlahkan investasi, sehingga user yang uangnya penuh di rekening
 * tapi belum punya saham akan ditampilkan ber-Net-Worth nol — cacat akuntansi.
 * Karena itu angkanya tidak boleh lagi disalin-tempel di komponen: satu
 * perubahan di sini otomatis ikut ke halaman Dompet DAN ke perhitungan Net Worth.
 *
 * Total ketiganya = Rp 1.850.000 (BCA Rp 1.450.000 + GoPay Rp 350.000 + Tunai Rp 50.000).
 * TODO: saat Supabase aktif, ganti dengan `SUM(balance) FROM wallets WHERE user_id = …`
 * (bandingkan view `user_net_worth` di PRD) — halaman Dompet & Kekayaan harus
 * membaca angka yang sama.
 */
export const INITIAL_WALLET_ACCOUNTS: WalletAccount[] = [
  {
    id: 1,
    name: 'BCA',
    type: 'Bank',
    number: '•••• 0849',
    balance: 1_450_000,
    /* aksen & muka kartu diambil dari palet kanon (Evergreen family),
       satu keluarga dengan hero & halaman lain — lihat docs/theme/PALETTE.md */
    color: 'bg-gradient-to-r from-[#c4c7af] to-[#45594e]',
    face: 'bg-gradient-to-br from-[#52685c] via-[#45594e] to-[#161c19]', // evergreen → gelap
    art: 'parang',
  },
  {
    id: 2,
    name: 'GoPay',
    type: 'E-Wallet',
    number: '•••• 2210',
    balance: 350_000,
    color: 'bg-gradient-to-r from-[#dbe4c7] to-[#91bb9e]',
    face: 'bg-gradient-to-br from-[#91bb9e] via-[#52685c] to-[#161c19]', // leaf → gelap
    art: 'mendung',
  },
  {
    id: 3,
    name: 'Tunai',
    type: 'Cash',
    /* uang kertas tidak punya nomor seri yang ditampilkan di muka kartu —
       varian muka kartu Tunai memakai ilustrasi tumpukan uang, bukan
       chip EMV / contactless / nomor akun */
    balance: 50_000,
    color: 'bg-gradient-to-r from-[#e6e4c0] to-[#b5b987]',
    face: 'bg-gradient-to-br from-[#b5b987] via-[#51533d] to-[#000000]', // olive → gelap
    art: 'kawung',
  },
]

/** Total saldo SELURUH dompet likuid (kas) — dipakai Dompet & Akun + Net Worth. */
export function walletAccountsTotal(accounts: WalletAccount[] = INITIAL_WALLET_ACCOUNTS): number {
  return accounts.reduce((sum, account) => sum + account.balance, 0)
}

/* ── SISTEM WARNA & IDENTITAS DOMPET BARU (paket 04) ──────────────────────────
   Modal "Tambah Dompet" tidak boleh mengarang gradien/hex baru: kalau boleh,
   deck kartu di /wallet perlahan jadi kumpulan warna acak dan halaman berhenti
   terasa satu sistem. Karena itu warna dompet baru DIBACA dari resep yang sudah
   ada di INITIAL_WALLET_ACCOUNTS — bukan diisi dari form.

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
export const WALLET_CARD_RECIPES: WalletCardRecipe[] = INITIAL_WALLET_ACCOUNTS.map(
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
    tile: 'bg-gradient-to-br from-[#dbe4c7] via-[#91bb9e] to-[#91bb9e] text-[#000000] ring-[#91bb9e]/50',
    frame: 'hover:shadow-[0_22px_40px_-26px_rgba(145,187,158,0.75)]',
  },
  {
    name: 'Mandiri',
    type: 'Bank',
    tile: 'bg-gradient-to-br from-[#f6edb7] via-[#ecd768] to-[#ecd768] text-[#000000] ring-[#ecd768]/60',
    frame: 'hover:shadow-[0_22px_40px_-26px_rgba(236,215,104,0.85)]',
  },
  {
    name: 'BNI',
    type: 'Bank',
    tile: 'bg-gradient-to-br from-[#fbe3c0] via-[#ffb885] to-[#ffb885] text-[#000000] ring-[#ffb885]/60',
    frame: 'hover:shadow-[0_22px_40px_-26px_rgba(255,184,133,0.8)]',
  },
  {
    name: 'OVO',
    type: 'E-Wallet',
    tile: 'bg-gradient-to-br from-[#e7d8c3] via-[#b89191] to-[#b89191] text-[#000000] ring-[#b89191]/50',
    frame: 'hover:shadow-[0_22px_40px_-26px_rgba(184,145,145,0.8)]',
  },
  {
    name: 'Dana',
    type: 'E-Wallet',
    tile: 'bg-gradient-to-br from-[#e6e4c0] via-[#b5b987] to-[#b5b987] text-[#000000] ring-[#b5b987]/50',
    frame: 'hover:shadow-[0_22px_40px_-26px_rgba(181,185,135,0.9)]',
  },
  {
    name: 'Jago',
    type: 'Bank',
    tile: 'bg-gradient-to-br from-sage via-[#c4c7af] to-[#c4c7af] text-[#000000] ring-[#c4c7af]/60',
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

/** id dompet berikutnya — selalu 1 lebih besar dari id tertinggi yang ada */
export function nextWalletId(accounts: WalletAccount[]): number {
  return accounts.reduce((max, account) => Math.max(max, account.id), 0) + 1
}

/**
 * Simbol sensor di depan nomor akun (mis. `•••• 0849`).
 *
 * Ditaruh di lapis data, bukan ditulis di JSX: muka kartu, pratinjau dompet baru,
 * dan data awal di INITIAL_WALLET_ACCOUNTS memakai simbol yang SAMA supaya bentuk
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
 * `id` sengaja dibiarkan 0 di sini: pemanggil yang tahu daftar dompet terkini
 * mengisinya lewat `nextWalletId()`.
 */
export function createWalletAccount(draft: WalletDraft, index: number): WalletAccount {
  const recipe = walletCardRecipe(index)
  const number = draft.number?.trim()
  return {
    id: 0,
    name: draft.name.trim(),
    type: draft.type,
    balance: Math.max(0, Math.round(draft.balance)),
    ...(number ? { number } : {}),
    ...recipe,
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

/** Dompet bawaan — total saldonya Rp 4.309.573, sama seperti saldo yang selama ini tampil */
export const INITIAL_WALLETS: Wallet[] = [
  {
    id: 'bca',
    name: 'BCA',
    holder: 'Jon Snow',
    number: '•••• 0849',
    network: 'VISA',
    balance: 2500000,
    bandClass: 'from-[#c4c7af] via-[#ffffff] to-[#c4c7af]',
    faceClass: 'from-[#52685c] via-[#45594e] to-[#161c19]', // evergreen
    glowClass: 'bg-evergreen/25',
    art: 'parang',
    kind: 'bank',
    context: 'pribadi',
  },
  {
    id: 'gopay',
    name: 'GoPay',
    holder: 'Jon Snow',
    number: '•••• 2210',
    network: 'E-WALLET',
    balance: 1309573,
    bandClass: 'from-[#dbe4c7] via-[#ffffff] to-[#dbe4c7]',
    faceClass: 'from-[#91bb9e] via-[#52685c] to-[#161c19]', // leaf
    glowClass: 'bg-leaf/25',
    art: 'mendung',
    kind: 'ewallet',
    context: 'pribadi',
  },
  {
    id: 'tunai',
    name: 'Tunai',
    holder: 'Jon Snow',
    number: 'Uang cash',
    network: 'TUNAI',
    balance: 500000,
    bandClass: 'from-[#e6e4c0] via-[#ffffff] to-[#e6e4c0]',
    faceClass: 'from-[#b5b987] via-[#51533d] to-[#000000]', // olive
    glowClass: 'bg-olive/30',
    art: 'kawung',
    kind: 'cash',
    context: 'keluarga',
  },
]

/** Pool kandidat saat user menekan "Tambah Dompet" (demo). */
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

/** Filter dompet berdasarkan konteks keuangan (PRD Domain 2C.2). */
export function getWalletsByContext(ctx: 'pribadi' | 'keluarga' | 'bersama' | 'all'): Wallet[] {
  if (ctx === 'all') return INITIAL_WALLETS
  return INITIAL_WALLETS.filter((w) => w.context === ctx)
}

export function formatIDR(value: number) {
  return `Rp ${value.toLocaleString('id-ID')}`
}
