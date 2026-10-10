import { formatIDR } from '../wallets'
import type { HistoryTransaction } from './history'

/* ── Modal Tambah Dompet & Sheet Pindah Dana (paket 04 → diseragamkan paket 55) ──
   Satu tempat untuk SEMUA kalimat yang dilihat user di dua alur baru halaman
   Dompet & Akun (aturan repo: tidak ada string copy yang ditulis di JSX).
   Nada kopya mengikuti PRD 2A.4 / CONTEXT §5: menemani, bukan menyalahkan —
   pesan gagal pun dibaca seperti teman yang mengingatkan, bukan alarm merah.
   ────────────────────────────────────────────────────────────────────────── */

/**
 * Tanggal "hari ini" versi DATA SEED — jangkar DEFAULT & fallback.
 *
 * PAKET 57: `transfer-sheet.tsx` memakai tanggal perangkat (`useTodayISO()`) dan
 * konstanta ini hanya dipakai sebelum nilainya terisi (render server / test) dan
 * sebagai tanggal data dompet di `lib/data/wallet-detail.ts`. Tanggal dipatok
 * tetap supaya demo stabil & bebas hydration mismatch — tapi jangkar UI-nya
 * sekarang dari jam asli.
 */
export const WALLET_TODAY_ISO = '2026-09-27'

export const ADD_WALLET_SHEET_COPY = {
  title: 'Tambah Dompet',
  /** nama kartu saat field nama masih kosong (preview tidak boleh kosong) */
  previewFallbackName: 'Dompet Baru',
  kindLabel: 'Jenis akun',
  /** pemilih brand = "pilih logo bank dari daftar" (inventaris #o) */
  brandLabel: 'Pilih bank atau e-wallet',
  brandNone: 'Lainnya',
  nameLabel: 'Nama akun',
  namePlaceholder: 'Contoh: BCA Tabungan, GoPay, Dompet Tunai',
  numberLabel: '4 angka terakhir',
  numberPlaceholder: '0849',
  numberHint: 'Cuma buat pajangan di kartunya — nomor aslinya nggak perlu diketik.',
  balanceLabel: 'Saldo sekarang',
  balanceHint: 'Boleh dikosongin. Nanti bisa dirapikan lewat “Sesuaikan Saldo”.',
  /* `previewBalanceLabel: 'Saldo'` DIHAPUS di paket 77: label mikro "Saldo" di
     pratinjau (dan di semua muka kartu) dibuang karena mengulang hal yang sudah
     jelas — lihat catatan panjangnya di `wallet-card-face.tsx` / `wallet-screen.tsx`. */
  submit: 'Simpan Dompet 🌿',
  toastTitle: 'Dompet baru siap 🌿',
  toastDescription: (name: string) => `${name} langsung ikut kehitung di Total Saldo.`,
} as const

export const TRANSFER_SHEET_COPY = {
  /**
   * Judul diseragamkan jadi “Pindah Dana” (paket 55) — sebelumnya sheet ini
   * berjudul “Pindah Saldo” sementara menu & halaman lain menyebut aksi yang
   * sama dengan nama berbeda. PRD 2A.4 menyebutnya pindah dana, dan PRD 2A.6
   * melarang satu aksi punya dua nama: user yang mencari “Pindah Dana” harus
   * menemukan aksi yang sama persis di semua pintu.
   */
  title: 'Pindah Dana',
  description: 'Dua saldo ikut menyesuaikan sekaligus — nggak ada yang dobel.',
  /** dompet asal sudah DIPUTUSKAN pintu masuknya (kartu / dompet detail) */
  fromLabel: 'Dari dompet ini',
  /** dompet asal belum diketahui (pintu “Lainnya”) → langkah 1 = memilih */
  fromPickLabel: 'Dari dompet mana?',
  fromPickHint: 'Ketuk dompet yang saldonya mau dipindah — sisanya tinggal dua langkah.',
  /** tombol kecil di kartu asal: user tetap boleh membetulkan pilihannya */
  changeFrom: 'Ganti dompet asal',
  toLabel: 'Ke dompet mana?',
  amountLabel: 'Mau pindah berapa?',
  /** chip isi-cepat: seluruh saldo dompet sumber */
  allAmount: 'Semua',
  /** label tanggal — user tidak memilih tanggal; pindah dana selalu "hari ini" */
  dateLabel: 'Tanggal',
  today: 'Hari ini',
  noteLabel: 'Catatan',
  notePlaceholder: 'Opsional — mis. “bagi uang jajan”',
  summaryLabel: 'Ringkasan',
  /**
   * Ringkasan sebelum disimpan: `Rp 250.000 · BCA → GoPay`.
   * Nominalnya ikut tombol mata privasi global, jadi ringkasan ini tidak
   * membocorkan angka yang sedang disembunyikan user.
   */
  summary: (amountLabel: string, from: string, to: string) => `${amountLabel} · ${from} → ${to}`,
  /** copy menolak dengan nada menemani (BUKAN pesan error merah) */
  overBalance: (sourceName: string, balance: number) =>
    `Saldo ${sourceName} tinggal ${formatIDR(balance)} — kecilin nominalnya dulu ya.`,
  /**
   * Saldo asal nol: chip “Semua” mati, dan alasannya DIKATAKAN — kontrol yang
   * mati tanpa penjelasan adalah pelanggaran kanon paket 29/49. Pindah dana
   * bukan cara mengisi saldo, jadi jalan keluarnya mengarah ke “Sesuaikan Saldo”.
   */
  emptyBalance: (sourceName: string) =>
    `${sourceName} lagi kosong, jadi belum ada yang bisa dipindah. Isi saldonya dulu lewat “Sesuaikan Saldo” di halaman dompetnya.`,
  /** jaring aman kalau dompetnya cuma satu (pindah dana butuh dua sisi) */
  needSecond: 'Pindah dana butuh minimal dua dompet. Tambah dompet baru dulu ya 🌱',
  /** empty state jujur (bukan sheet kosong) + CTA yang benar-benar menutupinya */
  needSecondTitle: 'Butuh satu dompet lagi',
  needSecondCta: 'Tambah dompet',
  needSecondCtaHint: 'Dompet baru langsung bisa jadi tujuan pindah dana.',
  /**
   * Badge konteks (paket 47) saat dompet tujuan berada di konteks uang lain.
   * Pindah antar konteks itu SAH (uangnya tetap milik user yang sama, dan Total
   * Saldo tidak berubah) — yang dibutuhkan cuma kesadaran, bukan larangan.
   */
  crossContextNote: (toLabel: string, fromLabel: string) =>
    `Tujuanmu ada di konteks ${toLabel}, asalnya di ${fromLabel}. Total Saldo tetap sama — yang pindah cuma dompet yang menampungnya.`,
  submit: 'Pindah Dana ⇄',
  /** tombol menyebut nominalnya sendiri supaya tidak ada tebakan sebelum tekan */
  submitFor: (amountLabel: string) => `Pindah ${amountLabel}`,
  /**
   * Jaring terakhir kalau store menolak padahal sheet sudah mengizinkan — satu-
   * satunya sebab yang masuk akal adalah saldo dompet asal berubah dari halaman
   * lain di antara membuka sheet dan menekan tombol. Tetap dikatakan, bukan
   * gagal diam-diam.
   */
  failed: 'Pindah dananya belum jadi — cek lagi saldo dompet asalnya ya.',
  toastTitle: 'Pindah dana beres 🌿',
  /**
   * Nominal datang sebagai LABEL yang sudah lewat sensor tombol mata
   * (`money(amount)` dari `PrivacyProvider` di pemanggil), bukan angka mentah —
   * jadi saat privasi menyala toast ini cuma menampilkan `Rp •••••••`, sementara
   * nama dompet asal/tujuan TETAP terbaca (nama ≠ nominal, §5.7).
   */
  toastDescription: (amountLabel: string, from: string, to: string) =>
    `${amountLabel} dari ${from} ke ${to} — dua saldo langsung ikut menyesuaikan.`,

  /* ── PEMBATALAN (paket 55) ────────────────────────────────────────────────
     Pindah dana yang salah dibatalkan dari Riwayat/Home/dompet detail — jalur
     hapus yang sama dengan catatan lain (tombstone). Bedanya satu hal: baris
     `transfer` menggerakkan DUA dompet, jadi uangnya harus dikembalikan ke DUA
     sisi sekaligus. Store menuliskannya sebagai dua baris koreksi bernama jelas
     (bukan perubahan saldo tanpa jejak), dan dua nama itulah yang dibaca user di
     Riwayat. Kanon “hapus catatan ≠ uang kembali” tetap utuh untuk catatan
     belanja/pemasukan: yang dikembalikan di sini hanya uang yang memang PINDAH
     dompet, dan jejaknya tetap ada. */
  cancelNoteIn: (toName: string) => `Batal pindah ke ${toName}`,
  cancelNoteOut: (fromName: string) => `Batal terima dari ${fromName}`,
  /**
   * Uang pindahnya sudah terpakai di dompet tujuan → pembatalan TIDAK bisa
   * dijalankan tanpa membuat saldo dompet itu minus (klaim palsu). Ditolak
   * dengan menyebut sisa saldonya, bukan gagal diam-diam.
   */
  cancelRefused: (toName: string, balanceLabel: string) =>
    `Saldo ${toName} tinggal ${balanceLabel}, sedangkan uang pindahnya lebih besar dari itu — sudah kepakai ya. Sesuaikan dulu saldo dompet itu, baru batalkan.`,
  cancelToastTitle: 'Pindah dana dibatalkan — uangnya balik 🌿',
  cancelToastDescription: (fromName: string, toName: string) =>
    `${fromName} dan ${toName} kembali seperti sebelum pindah. Jejak pembatalannya tercatat di Riwayat.`,
  /**
   * Jejak Undo: Undo TIDAK menghapus baris koreksi pembatalan (kanon “hapus
   * baris ≠ uang kembali” — baris yang di-tombstone tetap dihitung), jadi yang
   * ditulis adalah pasangan koreksi BARU yang mengembalikan efek pindah dananya.
   * Namanya menyebut apa yang terjadi supaya Riwayat terbaca sebagai cerita:
   * “Batal pindah ke GoPay” → “Pindah ke GoPay dipulihkan”.
   */
  cancelRestoreNote: (toName: string) => `Pindah ke ${toName} dipulihkan`,
  cancelRestoreIn: (fromName: string) => `Terima dari ${fromName} dipulihkan`,
} as const

/* ── PINTU MASUK “PINDAH DANA” (paket 55) ───────────────────────────────────
   Satu aksi punya beberapa pintu, tapi SATU nama (PRD 2A.6). Definisi labelnya
   ditaruh di sini supaya menu “Lainnya”, sidebar desktop, tombol di halaman
   dompet detail, dan popover kartu dompet tidak pernah menyebut aksi yang sama
   dengan kata yang berbeda — kesalahan yang bikin user merasa alurnya
   “ngambang”. */
export const TRANSFER_DOOR_COPY = {
  /** entri menu “Lainnya” (bottom-nav) & sidebar desktop */
  menuLabel: 'Pindah Dana',
  menuHint: 'Pindah dana antar dompet sendiri',
  /** tombol aksi di halaman detail dompet: asalnya sudah jelas dari halaman itu */
  detailLabel: 'Pindah Dana',
  detailHint: 'Uang keluar dari dompet ini',
  /** judul kelompok di menu “Lainnya” (bottom-nav) tempat pintunya duduk */
  menuGroupLabel: 'Aksi Cepat',
} as const

/* ── CATATAN PINDAH DANA (hasil TransferSheet) ────────────────────────────────
   Pindah saldo bukan cuma mengubah dua angka: ia juga CATATAN. Bentuk catatannya
   memakai `HistoryTransaction` yang sama dengan halaman Riwayat, dengan
   `type: 'transfer'` — jadi chip "pindah dana" di Riwayat/`isMoneyMovement()`
   otomatis mengenalinya, dan tidak ada tipe data kedua yang bisa berbeda makna.

   Di repo demo ini belum ada backend bersama antar-halaman, jadi catatannya
   hidup di state /wallet selama sesi (dan ditampilkan di panel "Pindah Dana
   Terakhir"). Saat Supabase aktif, INSERT ke tabel `transactions` dengan kolom
   yang persis sama — termasuk `destination_wallet_id` (Asumsi A1) — lalu daftar
   di Riwayat tinggal membaca tabel itu. */

/** satu catatan pindah dana + dua nama dompetnya (untuk pajangan "BCA → GoPay") */
export interface WalletTransferRecord {
  /** catatan versi halaman Riwayat — bukan tipe data karangan baru */
  transaction: HistoryTransaction
  fromName: string
  toName: string
  /** catatan bebas dari user — hidup di record ini karena `HistoryTransaction`
   *  milik halaman Riwayat memang tidak punya kolomnya di V1 */
  note?: string
}

export const WALLET_TRANSFER_LOG_COPY = {
  title: 'Pindah Dana Terakhir',
  count: (total: number) => `${total} catatan`,
  /** penanda teks di baris catatan — sama seperti di halaman Riwayat */
  movementChip: 'pindah dana',
  /** nama catatan di Riwayat (kolom `name`) */
  transferName: (toName: string) => `Pindah ke ${toName}`,
  /**
   * Kategori yang tersimpan — salah satu nilai `TRANSACTION_CATEGORY_OPTIONS`.
   *
   * Selalu `'Transfer'`, BUKAN label bebas: filter kategori di Riwayat bekerja
   * dengan mencocokkan salah satu nilai kanon itu, jadi kategori yang dikarang
   * sendiri (“Pindah Dana”) membuat baris pindah dana mustahil dijaring filter.
   * Konstanta ini dipakai store saat menulis barisnya (`postTransfer`), jadi
   * yang ditulis = yang difilter = yang dibaca user (paket 55).
   */
  transferCategory: 'Transfer',
} as const

/* `WALLET_NEW_CARD_COPY`, `nextTransferId()`, dan `buildTransferRecord()`
   DIHAPUS di paket 40 bersama alasan keberadaannya:

     · penanda "Baru" dulu membedakan kartu dompet yang belum punya halaman
       detail — sekarang `/wallet/[id]` membaca store yang sama dengan `/wallet`,
       jadi semua dompet punya halamannya dan pembeda itu tidak lagi benar;
     · id transfer & bentuk catatannya dulu dirakit di halaman Dompet karena
       tidak ada ledger bersama. Sekarang SATU baris `transfer` ditulis store
       (`postTransfer`) dan panel "Pindah Dana Terakhir" menurunkannya dari baris
       itu (`transferLogOf`) — dua jalur tulis yang bisa melenceng sudah tidak ada.

   Tipe `WalletTransferRecord` di atas TETAP dipakai: itu bentuk pajangan lognya. */
