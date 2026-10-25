/* ── CHANGELOG (/changelog) — data murni, tanpa React ─────────────────────────
   Sumber struktur: export Framer `LP CATETIND_files/BAGIAN CHANGELOG/index.html`
   (halaman `/changelog` template). Isinya diadaptasi ke fitur CatetInd yang
   benar-benar ada di repo ini — bukan copy template yang menyebut Stripe,
   QuickBooks, atau "workspace".

   Satu sumber untuk halaman: komponen `components/landing/lp/changelog.tsx`
   tidak menulis satu pun string user-facing. Tanggal dipatok sebagai konstanta
   (bukan `new Date()`) supaya HTML server & klien selalu sama.
   ────────────────────────────────────────────────────────────────────────── */

export type ChangelogGroupKind = 'new' | 'improved' | 'fixed'

export interface ChangelogGroup {
  kind: ChangelogGroupKind
  /** judul grup di UI: "Baru", "Peningkatan", "Perbaikan" */
  title: string
  items: string[]
}

export interface ChangelogEntry {
  /** anchor stabil untuk tautan langsung, mis. `/changelog#v1-2` */
  id: string
  version: string
  dateIso: string
  dateHuman: string
  title: string
  summary: string[]
  /** gambar produk di dalam kartu (opsional — export Framer memakai satu) */
  image?: string
  imageAlt?: string
  groups: ChangelogGroup[]
}

export const CHANGELOG_META = {
  eyebrow: 'Changelog',
  title: 'Product Updates',
  description:
    'Semua yang baru di CatetInd | fitur, peningkatan, dan perbaikan di setiap versi. Ringkas, tanpa bahasa marketing.',
} as const

/** terbaru lebih dulu — urutan ini yang dipakai halaman */
export const CHANGELOG_ENTRIES: ChangelogEntry[] = [
  {
    id: 'v1-2',
    version: 'V 1.2',
    dateIso: '2026-01-20',
    dateHuman: '20 Januari 2026',
    title: 'Catat 4 detik: struk, suara, dan Minca',
    summary: [
      'Nyatet nggak harus buka form. Kirim chat, foto struk, atau voice note, Minca yang merapikan jadi transaksi.',
      'Scan struk membaca nominal, tanggal, dan merchant langsung dari foto. Kalau ada yang meleset, kamu masih bisa mengeditnya sebelum disimpan.',
    ],
    image: '/landing/ecsvVHaKUpgixFh7HmsoZYYI.png',
    imageAlt: 'Pratinjau dashboard CatetInd',
    groups: [
      {
        kind: 'new',
        title: 'Baru',
        items: [
          'Scan struk (OCR) dengan koreksi otomatis',
          'Input suara untuk transaksi harian',
          'AI Coach Minca dengan kuota token per paket',
        ],
      },
      {
        kind: 'improved',
        title: 'Peningkatan',
        items: [
          'Jatah harian langsung menyesuaikan setiap transaksi baru',
          'Rekap mingguan menandai kategori yang paling boros',
        ],
      },
      {
        kind: 'fixed',
        title: 'Perbaikan',
        items: [
          'Nominal besar tidak lagi terpotong di kartu dompet',
          'Tanggal transaksi mengikuti zona waktu perangkat',
        ],
      },
    ],
  },
  {
    id: 'v1-1',
    version: 'V 1.1',
    dateIso: '2025-12-06',
    dateHuman: '6 Desember 2025',
    title: 'Dompet Bersama & rekap yang lebih jujur',
    summary: [
      'Kelola uang bareng pasangan, keluarga, atau teman tanpa spreadsheet. Setiap anggota melihat catatan yang sama, dan pembagian patungan kelihatan jelas.',
      'Rekap mingguan dan bulanan sekarang bisa dibagikan sebagai kartu, tanpa angka saldo yang sensitif.',
    ],
    groups: [
      {
        kind: 'new',
        title: 'Baru',
        items: [
          'Dompet Bersama dengan kode undangan',
          'Split bill dan catatan siapa bayar apa',
          'Kartu rekap mingguan yang bisa dibagikan',
        ],
      },
      {
        kind: 'improved',
        title: 'Peningkatan',
        items: [
          'Riwayat transaksi bisa disaring per dompet dan kategori',
          'Export data JSON mencakup dompet bersama',
        ],
      },
      {
        kind: 'fixed',
        title: 'Perbaikan',
        items: [
          'Saldo joint tidak lagi dobel saat dua anggota mencatat bersamaan',
          'Tampilan kalender cashflow lebih rapi di layar kecil',
        ],
      },
    ],
  },
  {
    id: 'v1-0',
    version: 'V 1.0',
    dateIso: '2025-05-06',
    dateHuman: '6 Mei 2025',
    title: 'CatetInd 1.0',
    summary: [
      'Versi pertama CatetInd: satu tempat untuk mencatat pemasukan, pengeluaran, budget, tagihan, dan melihat ke mana uang pergi.',
      'Semua dimulai dari satu catatan. Nggak ada bank-sync, nggak ada data yang keluar dari akunmu.',
    ],
    groups: [
      {
        kind: 'new',
        title: 'Baru',
        items: [
          'Catat pemasukan & pengeluaran dengan kategori',
          'Dompet multi-akun dan transfer antar dompet',
          'Budget & target nabung',
          'Tagihan rutin dan kalender cashflow',
          'Insight bulanan dan Daily HUD',
        ],
      },
    ],
  },
]
