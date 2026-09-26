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
    face: 'bg-gradient-to-br from-[#b5b987] via-[#51533d] to-[#241a1a]', // olive → gelap
    art: 'kawung',
  },
]

/** Total saldo SELURUH dompet likuid (kas) — dipakai Dompet & Akun + Net Worth. */
export function walletAccountsTotal(accounts: WalletAccount[] = INITIAL_WALLET_ACCOUNTS): number {
  return accounts.reduce((sum, account) => sum + account.balance, 0)
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
    bandClass: 'from-[#c4c7af] via-[#fbf6d9] to-[#c4c7af]',
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
    bandClass: 'from-[#dbe4c7] via-[#fbf6d9] to-[#dbe4c7]',
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
    bandClass: 'from-[#e6e4c0] via-[#fbf6d9] to-[#e6e4c0]',
    faceClass: 'from-[#b5b987] via-[#51533d] to-[#241a1a]', // olive
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
    bandClass: 'from-[#e7d8c3] via-[#fbf6d9] to-[#e7d8c3]',
    faceClass: 'from-[#b89191] via-[#534141] to-[#241a1a]', // plum
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
    bandClass: 'from-[#dbdccf] via-[#fbf6d9] to-[#dbdccf]',
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
    bandClass: 'from-[#f6edb7] via-[#fbf6d9] to-[#f6edb7]',
    faceClass: 'from-[#ecd768] via-[#6a612f] to-[#241a1a]', // daisy
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
    bandClass: 'from-[#fbe3c0] via-[#fbf6d9] to-[#fbe3c0]',
    faceClass: 'from-[#ffb885] via-[#73533c] to-[#241a1a]', // cantelope
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
