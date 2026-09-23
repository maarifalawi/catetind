export type WalletKind = 'bank' | 'ewallet' | 'cash'

export interface Wallet {
  id: string
  /** nama dompet — tampil besar di band kartu ("BCA", "GoPay") */
  name: string
  /** nama pemegang */
  holder: string
  /** nomor kartu/akun ter-mask, atau label bebas ("Uang cash") */
  number: string
  /** label jaringan/tipe di kanan bawah band ("VISA", "E-WALLET", "TUNAI") */
  network: string
  balance: number
  /**
   * gradient untuk band terang kartu — string literal lengkap
   * (bukan concatenation dinamis) supaya ter-scan oleh Tailwind
   */
  bandClass: string
  /** gradient vivid seluruh muka kartu — juga string literal lengkap */
  faceClass: string
}

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
    faceClass: 'from-[#1e9bf0] via-[#0f7ccc] to-[#0a4f92]',
  },
  {
    id: 'gopay',
    name: 'GoPay',
    holder: 'Jon Snow',
    number: '•••• 2210',
    network: 'E-WALLET',
    balance: 1309573,
    bandClass: 'from-[#b5ebe1] via-[#d3f6ef] to-[#9fe0d4]',
    faceClass: 'from-[#17c6ea] via-[#089ec9] to-[#056c94]',
  },
  {
    id: 'tunai',
    name: 'Tunai',
    holder: 'Jon Snow',
    number: 'Uang cash',
    network: 'TUNAI',
    balance: 500000,
    bandClass: 'from-sage via-cream to-sage',
    faceClass: 'from-[#46c95e] via-[#26a346] to-[#116f36]',
  },
]

/**
 * Pool kandidat saat user menekan "Tambah Dompet" (demo).
 * Dipakai berurutan lalu berputar dari awal.
 */
export const WALLET_POOL: Wallet[] = [
  {
    id: 'ovo',
    name: 'OVO',
    holder: 'Jon Snow',
    number: '•••• 5566',
    network: 'E-WALLET',
    balance: 750000,
    bandClass: 'from-[#e4d8f8] via-[#f0e9fc] to-[#d5c3f3]',
    faceClass: 'from-[#8a5cf0] via-[#6434cd] to-[#3f1f96]',
  },
  {
    id: 'dana',
    name: 'DANA',
    holder: 'Jon Snow',
    number: '•••• 8890',
    network: 'E-WALLET',
    balance: 425000,
    bandClass: 'from-[#a9d6fb] via-[#cbe7fd] to-[#93c9f8]',
    faceClass: 'from-[#3fb1f5] via-[#1a8fe6] to-[#0b5aa8]',
  },
  {
    id: 'mandiri',
    name: 'Mandiri',
    holder: 'Jon Snow',
    number: '•••• 7712',
    network: 'DEBIT',
    balance: 5250000,
    bandClass: 'from-[#fbe9a8] via-[#fdf3c9] to-[#f6dd85]',
    faceClass: 'from-[#f0b02e] via-[#cf8a0c] to-[#8f5c05]',
  },
  {
    id: 'jago',
    name: 'Jago',
    holder: 'Jon Snow',
    number: '•••• 3345',
    network: 'VISA',
    balance: 1100000,
    bandClass: 'from-[#ffd9b8] via-[#ffe9d4] to-[#ffc994]',
    faceClass: 'from-[#ff9e4f] via-[#f06c1b] to-[#a8430a]',
  },
]

export function formatIDR(value: number) {
  return `Rp ${value.toLocaleString('id-ID')}`
}
