/* ── EXPORT DATA SAYA — FILE JSON YANG BENAR-BENAR TERUNDUH (paket 43) ────────
   Temuan audit Stage 6 #1: halaman `/settings/data` bernama "Export Data Saya",
   tombolnya menampilkan toast "Menyiapkan file…" lalu mengaku "Data berhasil
   dikirim ke emailmu" — dan TIDAK ADA file yang pernah keluar, tidak ada email
   yang pernah dikirim. Untuk aplikasi keuangan, itu janji portabilitas data yang
   tidak ditepati.

   File ini menutupnya dengan dua hal:

     1. `downloadMoneyExport()` benar-benar membuat Blob JSON dan memicunya lewat
        `URL.createObjectURL` + `<a download>` — file itu ada di folder unduhan
        user, bisa dibuka tanpa app ini.
     2. Isinya bisa DIAUDIT: `schema`, `schemaVersion`, `exportedAt`, `counts`
        (jumlah baris per bagian), dan `limits` (batas yang masih terbuka).
        Tanpa tiga hal itu, file ekspor cuma gumpalan JSON yang tidak bisa
        dipertanggungjawabkan.

   Jalur EMAIL tetap ada di UI, dan sengaja DIBERI LABEL DEMO: mengirim email
   butuh server (Resend/SMTP) yang belum ada di repo ini. Yang tidak boleh
   terjadi adalah tombol yang mengaku sudah mengirim padahal tidak.

   🚧 Di produksi bentuk file ini TIDAK berubah (ia sudah JSON polos siap
   di-HMAC/versi), yang berubah cuma sumber datanya: `SELECT * FROM … WHERE
   user_id = auth.uid()` untuk tiap bagian, dan pengirimannya diganti
   `POST /api/export` + email transaksional. */

import { readSavedTarget } from '@/lib/data/monthly-review'
import { cashDirectionOf } from '@/lib/data/wealth-cash'
import {
  netWorthParts,
  totalPortfolioValue,
  type Debt,
  type DebtPayment,
  type Investment,
} from '@/lib/data/wealth'
import type { SinkingFundItem } from '@/lib/data/budget'
import type { Bill } from '@/lib/data/bills'
import type { SessionUser } from '@/lib/session'
import { getMoneySnapshot, type MoneyRow, type MoneySnapshot } from './store'
import { getBillsSnapshot, liveBills } from './bills-store'
import { getFundsSnapshot } from './funds-store'
import { getWealthSnapshot } from './wealth-store'
import { readMaskedSetting } from '@/lib/privacy-settings'
import { balanceOf } from './ledger'

/** penanda bentuk file — supaya penerima bisa tahu ini file apa sebelum dibaca */
export const EXPORT_SCHEMA = 'catetind.money-export'

/**
 * Versi skema. WAJIB naik setiap kali bentuk file berubah: user yang menyimpan
 * ekspor tahun lalu harus bisa tahu mengapa field-nya berbeda. (Sama seperti
 * `schema_version` di produksi.)
 *
 * v2 (paket 51): menambah bagian `bills` — daftar tagihan rutin yang dibaca dari
 * store perangkat, bukan dari konstanta seed lagi.
 */
export const EXPORT_SCHEMA_VERSION = 2

/** pengaturan privasi yang ikut diekspor (yang tersimpan di perangkat ini) */
export interface ExportedPrivacySettings {
  /** true = user memilih menyensor nominal di layar (tersimpan di localStorage) */
  amountsMasked: boolean
}

/** semua bahan yang dibutuhkan file ekspor — bentuk eksplisit supaya bisa diuji */
export interface MoneyExportSources {
  wallets: MoneySnapshot['wallets']
  rows: MoneySnapshot['rows']
  removedIds: MoneySnapshot['removedIds']
  debts: readonly Debt[]
  debtPayments: readonly DebtPayment[]
  investments: readonly Investment[]
  funds: readonly SinkingFundItem[]
  /** tagihan rutin yang BENAR-BENAR dimiliki user (store tagihan, paket 51) */
  bills: readonly Bill[]
  monthlyTarget: ReturnType<typeof readSavedTarget>
  privacy: ExportedPrivacySettings
  user: SessionUser | null
}

export interface MoneyExportCounts {
  wallets: number
  ledgerRows: number
  removedRows: number
  debts: number
  receivables: number
  debtPayments: number
  investments: number
  funds: number
  bills: number
}

export interface MoneyExportFile {
  schema: typeof EXPORT_SCHEMA
  schemaVersion: number
  exportedAt: string
  app: { name: string; buildStage: string }
  user: { id: string; name: string; email: string } | null
  /** jumlah baris per bagian — supaya file bisa diaudit tanpa membacanya habis */
  counts: MoneyExportCounts
  totals: { cash: number; investments: number; receivables: number; debts: number; netWorth: number }
  wallets: {
    id: string
    name: string
    type: string
    number?: string
    network: string
    context: string
    opening: number
    balance: number
  }[]
  ledgerRows: (MoneyRow & { removed: boolean })[]
  removedRowIds: string[]
  /** hutang (yang kita bayar) dan piutang (yang orang lain bayar ke kita) */
  debts: { payable: Debt[]; receivable: Debt[] }
  debtPayments: DebtPayment[]
  investments: Investment[]
  /** celengan / target tabungan (sinking fund) */
  goals: { funds: SinkingFundItem[] }
  /**
   * Tagihan rutin (paket 51). Yang ikut hanyalah tagihan yang benar-benar ada —
   * tagihan yang baru saja dihapus user (masih di jendela Undo) TIDAK ikut, karena
   * daftarnya dibaca dari store yang sama dengan halaman Tagihan.
   */
  bills: Bill[]
  /** target bulanan yang terakhir disimpan user */
  monthlyTarget: ReturnType<typeof readSavedTarget>
  settings: { privacy: ExportedPrivacySettings }
  /**
   * BATAS JUJUR, ditulis DI DALAM file (bukan cuma di komentar kode): penerima
   * ekspor harus tahu bagian mana yang catatan sesi di perangkat dan bagian mana
   * yang masih data contoh repo ini.
   */
  limits: string[]
}

/**
 * Susun file ekspor dari sumber yang diberikan. MURNI (tanpa browser, tanpa
 * store hidup) supaya bisa diuji dan supaya bentuk filenya tidak bergantung
 * pada halaman mana yang memanggilnya.
 */
export function buildMoneyExport(
  sources: MoneyExportSources,
  exportedAt: string,
): MoneyExportFile {
  const removed = new Set(sources.removedIds)
  const cash = sources.wallets.reduce(
    (sum, wallet) => sum + balanceOf(sources.rows, wallet.id, wallet.opening),
    0,
  )
  const payable = sources.debts.filter((debt) => cashDirectionOf(debt) === 'out')
  const receivable = sources.debts.filter((debt) => cashDirectionOf(debt) === 'in')
  const investmentsValue = totalPortfolioValue([...sources.investments])
  const parts = netWorthParts({
    cash,
    investments: investmentsValue,
    receivables: receivable.reduce((sum, debt) => sum + debt.remaining, 0),
    debts: payable.reduce((sum, debt) => sum + debt.remaining, 0),
  })

  return {
    schema: EXPORT_SCHEMA,
    schemaVersion: EXPORT_SCHEMA_VERSION,
    exportedAt,
    app: { name: 'CatetInd', buildStage: 'demo' },
    user: sources.user
      ? { id: sources.user.id, name: sources.user.name, email: sources.user.email }
      : null,
    counts: {
      wallets: sources.wallets.length,
      ledgerRows: sources.rows.length,
      removedRows: sources.removedIds.length,
      debts: payable.length,
      receivables: receivable.length,
      debtPayments: sources.debtPayments.length,
      investments: sources.investments.length,
      funds: sources.funds.length,
      bills: sources.bills.length,
    },
    totals: {
      cash: parts.cash,
      investments: parts.investments,
      receivables: parts.receivables,
      debts: parts.debts,
      netWorth: parts.netWorth,
    },
    wallets: sources.wallets.map((wallet) => ({
      id: wallet.id,
      name: wallet.name,
      type: wallet.type,
      ...(wallet.number ? { number: wallet.number } : {}),
      network: wallet.network,
      context: wallet.context,
      opening: wallet.opening,
      balance: balanceOf(sources.rows, wallet.id, wallet.opening),
    })),
    /* SEMUA baris ikut, termasuk yang sudah dihapus (ditandai `removed`) —
       ekspor yang menyembunyikan baris yang pernah ada bukan ekspor yang jujur */
    ledgerRows: sources.rows.map((row) => ({ ...row, removed: removed.has(row.id) })),
    removedRowIds: [...sources.removedIds],
    debts: { payable: [...payable], receivable: [...receivable] },
    debtPayments: [...sources.debtPayments],
    investments: [...sources.investments],
    goals: { funds: [...sources.funds] },
    bills: [...sources.bills],
    monthlyTarget: sources.monthlyTarget,
    settings: { privacy: sources.privacy },
    limits: [
      'Data di file ini dibaca dari perangkat ini (store uang, store kekayaan, store celengan, store tagihan + IndexedDB + data contoh repo).',
      'Tidak ada salinan di server: repo demo ini belum punya backend, jadi tidak ada data yang dikirim ke mana pun saat penghapusan akun.',
      'Baris ledger berisi catatan yang kamu buat/diubah di app ini; transaksi contoh dari masa lalu hidup di konstanta lib/data/* dan ikut apa adanya.',
      'Hutang, piutang, pembayaran, dan aset investasi dibaca dari store perangkat ini — termasuk yang baru kamu catat di halaman Kekayaan (paket 50).',
      'Saldo dompet dihitung dari opening + baris ledger (tidak pernah disimpan sebagai angka terpisah).',
      'Tagihan rutin dibaca dari store perangkat ini — termasuk yang baru kamu tambah/ubah di halaman Tagihan, dan status "lunas bulan ini" apa adanya (paket 51).',
    ],
  }
}

/**
 * Kumpulkan bahan ekspor dari state hidup di perangkat ini.
 *
 * TIDAK butuh browser (aman dipanggil di test): `readSavedTarget()` &
 * `readMaskedSetting()` mengembalikan nilai default saat `window` tidak ada.
 */
export function collectExportSources(): MoneyExportSources {
  const snapshot = getMoneySnapshot()
  /* kekayaan (hutang/piutang/pembayaran/investasi) dibaca dari STORE perangkat
     (`lib/money/wealth-store.ts`), bukan konstanta seed: file ekspor harus
     memuat catatan yang benar-benar dimiliki user — temuan D laporan 46 */
  const wealth = getWealthSnapshot()
  return {
    wallets: snapshot.wallets,
    rows: snapshot.rows,
    removedIds: snapshot.removedIds,
    debts: wealth.debts,
    debtPayments: wealth.payments,
    investments: wealth.investments,
    /* tagihan dibaca dari STORE perangkat (`lib/money/bills-store.ts`), bukan
       konstanta `INITIAL_BILLS`: file ekspor harus memuat tagihan yang benar-benar
       dimiliki user — termasuk yang baru ditambah/diubah/dihapus (temuan E
       laporan 46, paket 51). `liveBills()` menyaring tombstone Undo, jadi yang
       ikut hanyalah tagihan yang memang masih ada di daftar. */
    bills: liveBills(getBillsSnapshot()),
    /* celengan dibaca dari STORE perangkat (`lib/money/funds-store.ts`), bukan
       konstanta seed: ekspor harus memuat celengan & progres yang benar-benar
       dimiliki user di perangkat ini, termasuk yang baru ditanam (paket 46) */
    funds: getFundsSnapshot().funds,
    monthlyTarget: readSavedTarget(),
    privacy: { amountsMasked: readMaskedSetting() },
    user: null,
  }
}

/** nama file: aman di semua OS (tanpa `:`/`.` dari ISO) & tetap urut kronologis */
export function moneyExportFileName(exportedAt: string): string {
  return `catetind-export-${exportedAt.replace(/[:.]/g, '-')}.json`
}

/** JSON siap unduh — dipisah dari unduhannya supaya bisa diuji & diperiksa */
export function moneyExportJson(user: SessionUser | null = null, exportedAt = new Date().toISOString()): {
  fileName: string
  content: string
  file: MoneyExportFile
} {
  const file = buildMoneyExport({ ...collectExportSources(), user }, exportedAt)
  return {
    fileName: moneyExportFileName(exportedAt),
    /* 2 spasi: file ini dibuka MANUSIA (auditor, akuntan, atau diri sendiri
       setahun dari sekarang), bukan mesin yang butuh byte paling kecil */
    content: JSON.stringify(file, null, 2),
    file,
  }
}

export interface MoneyExportDownload {
  fileName: string
  byteLength: number
  counts: MoneyExportCounts
}

/**
 * Unduh ekspor sebagai file `.json` yang BENAR-BENAR keluar dari browser.
 *
 * `null` = tidak bisa mengunduh di lingkungan ini (SSR/test tanpa DOM) — dan itu
 * dikatakan apa adanya oleh pemanggil, bukan ditutup dengan toast palsu.
 */
export function downloadMoneyExport(user: SessionUser | null = null): MoneyExportDownload | null {
  if (typeof document === 'undefined' || typeof URL === 'undefined') return null

  const { fileName, content, file } = moneyExportJson(user)
  const blob = new Blob([content], { type: 'application/json' })
  const url = URL.createObjectURL(blob)

  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = fileName
  anchor.rel = 'noopener'
  anchor.style.display = 'none'
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()

  /* objek URL ditahan sebentar: melepasnya seketika bisa membatalkan unduhan
     di sebagian browser (pola yang sama dipakai library unduhan pada umumnya) */
  window.setTimeout(() => URL.revokeObjectURL(url), 4000)

  return { fileName, byteLength: blob.size, counts: file.counts }
}
