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
 * kelas latar Tailwind utuh (mis. `'bg-blue-600'`) supaya kartu bisa diwarnai
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
   * Kelas GRADIEN aksen Tailwind (mis. `'bg-gradient-to-r from-mint-soft to-mint'`).
   *
   * Dipakai untuk halo cahaya di belakang kartu, segmen bar komposisi di hero, dan
   * titik legenda. Sengaja gradien — bukan warna solid — supaya aksennya lembut,
   * tidak "blok warna" keras; semuanya tetap di palet brand (mint, sakura-sage,
   * amber–terracotta dari palet status HUD) supaya nyambung dengan halaman lain.
   */
  color: string
  /**
   * Kelas gradien MUKA kartu (mis. `'bg-gradient-to-br from-[#43c08a] via-[#17543c] to-[#06231a]'`).
   *
   * Palet: forest emerald (bank), deep teal (e-wallet), amber–terracotta (tunai) —
   * satu keluarga dengan hero Dompet & Akun dan deck kartu di Home. Aturan penting:
   * stop TERAKHIR selalu gelap (near-black bernuansa sama) supaya nama & saldo putih
   * tetap kontras di atasnya.
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
    /* aksen & muka kartu sengaja diambil dari palet brand (forest–mint),
       bukan merah muda: satu keluarga dengan hero & halaman lain */
    color: 'bg-gradient-to-r from-mint-soft to-mint',
    face: 'bg-gradient-to-br from-[#43c08a] via-[#17543c] to-[#06231a]', // forest emerald
    art: 'parang',
  },
  {
    id: 2,
    name: 'GoPay',
    type: 'E-Wallet',
    number: '•••• 2210',
    balance: 350_000,
    color: 'bg-gradient-to-r from-[#a7ded1] to-[#0f766e]',
    face: 'bg-gradient-to-br from-[#2dd4bf] via-[#0d6e63] to-[#04211f]', // deep teal
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
    color: 'bg-gradient-to-r from-hud-amber to-hud-terracotta',
    face: 'bg-gradient-to-br from-[#e8bd7f] via-[#b06a27] to-[#3a1d06]', // amber → terracotta
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
    bandClass: 'from-[#bfe3f7] via-[#dcf0fc] to-[#a8d5f2]',
    faceClass: 'from-[#3b82f6] via-[#1d4ed8] to-[#172554]',
    glowClass: 'bg-cyan-300/25',
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
    bandClass: 'from-[#b5ebe1] via-[#d3f6ef] to-[#9fe0d4]',
    faceClass: 'from-[#22d3ee] via-[#0891b2] to-[#083344]',
    glowClass: 'bg-teal-200/30',
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
    bandClass: 'from-sage via-cream to-sage',
    faceClass: 'from-[#34d399] via-[#059669] to-[#022c22]',
    glowClass: 'bg-lime-300/25',
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
    bandClass: 'from-[#e4d8f8] via-[#f0e9fc] to-[#d5c3f3]',
    faceClass: 'from-[#a78bfa] via-[#7c3aed] to-[#2e1065]',
    glowClass: 'bg-fuchsia-300/25',
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
    bandClass: 'from-[#a9d6fb] via-[#cbe7fd] to-[#93c9f8]',
    faceClass: 'from-[#38bdf8] via-[#0284c7] to-[#082f49]',
    glowClass: 'bg-sky-200/30',
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
    bandClass: 'from-[#fbe9a8] via-[#fdf3c9] to-[#f6dd85]',
    faceClass: 'from-[#fbbf24] via-[#d97706] to-[#451a03]',
    glowClass: 'bg-yellow-200/30',
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
    bandClass: 'from-[#ffd9b8] via-[#ffe9d4] to-[#ffc994]',
    faceClass: 'from-[#fb923c] via-[#ea580c] to-[#431407]',
    glowClass: 'bg-orange-200/30',
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
