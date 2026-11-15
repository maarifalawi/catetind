/* ── KAPAN FORM TRANSAKSI BOLEH DI-RESET ─────────────────────────────────────
   Form input transaksi (`transaction-input-engine.tsx`) menyimpan isian user di
   state lokal: nominal, catatan, dompet, tanggal. Isian itu HANYA boleh
   dikosongkan ketika panel BENAR-BENAR dibuka (atau baris yang diedit berganti)
   — bukan setiap kali salah satu prop berganti identitas.

   Temuan pemilik produk (11 Nov 2026): di halaman Dompet Bersama, mengetik
   nominal menghapus isian sendiri. Penyebabnya dua hal yang bertemu:
     1. `joint-add-sheet.tsx` mengirim `types={['expense','income']}` — array
        literal, jadi identitasnya baru di setiap render;
     2. laporan isian (`onDraftChange`, dulu `onAmountChange`) milik halaman
        Joint memperbarui state induk di SETIAP digit, sehingga induk render
        ulang → array baru → effect reset engine dianggap "panel dibuka lagi" →
        nominal & catatan dikosongkan.

   Fungsi di bawah memisahkan "panel dibuka" dari "prop berubah", supaya
   keputusan itu bisa diuji tanpa DOM (repo ini environment test-nya node).
   ────────────────────────────────────────────────────────────────────────── */

import { formatAmountDigits } from '../money/amount-input'

/**
 * Kunci satu PEMBUKAAN panel:
 *   · `'new'`      → catat transaksi baru;
 *   · `'edit:<id>'`→ mengubah baris tertentu (id berubah = form harus diisi ulang);
 *   · `null`       → panel tertutup.
 *
 * `initialId` menerima string MAUPUN number: id transaksi riwayat berupa angka
 * (`HistoryTransaction.id`), sedangkan id baris dompet bersama berupa string.
 * Keduanya dipakai apa adanya sebagai kunci — yang penting perubahannya terlihat.
 */
export function transactionFormOpenKey(
  active: boolean,
  initialId?: string | number | null,
): string | null {
  if (!active) return null
  return initialId !== null && initialId !== undefined && `${initialId}` !== ''
    ? `edit:${initialId}`
    : 'new'
}

/**
 * true = form boleh di-reset sekarang.
 *
 * `previousKey` = kunci pembukaan yang terakhir kali dipakai me-reset (disimpan
 * di ref oleh engine). Render ulang dengan kunci yang SAMA bukan pembukaan baru,
 * jadi isian user harus dibiarkan apa adanya.
 */
export function shouldResetTransactionForm(
  previousKey: string | null,
  nextKey: string | null,
): boolean {
  return nextKey !== null && nextKey !== previousKey
}

/* ── ISIAN YANG DIPULIHKAN SAAT PANEL DIBUKA LAGI ───────────────────────────
   Kasus nyata (11 Nov 2026, halaman Dompet Bersama): user mengisi nominal &
   catatan, membuka "Atur Pembagian" (sheet itu WAJIB menutup sheet input —
   dua Drawer tidak boleh hidup bersamaan), lalu kembali. Effect reset engine
   melihat "panel dibuka" dan mengosongkan form, jadi nominal yang barusan
   diketik HILANG padahal user hanya mampir ke pengaturan pembagian.

   Solusinya bukan "jangan reset", karena panel memang harus kosong setiap
   transaksi baru. Solusinya: shell boleh menitipkan DRAFT-nya, dan engine
   memakai draft itu sebagai isi awal. Pemanggil yang tidak mengirim draft
   (`resume = null`) berperilaku persis seperti sebelumnya.

   Fungsi murni supaya keputusan ini bisa diuji tanpa DOM. */

export type TransactionFormResume = {
  amount?: number
  note?: string
  category?: string
  /** tipe transaksi (Pengeluaran/Pemasukan/…) yang tadi dipilih user */
  type?: string
}

export type TransactionFormInitialState<T extends string> = {
  type: T
  /** teks yang dipasang ke field nominal (sudah bergrup ribuan) */
  amountText: string
  note: string
  category: string
  /** true = form baru yang benar-benar kosong → boleh langsung fokus ke nominal */
  focusAmount: boolean
}

export function transactionFormResume<T extends string>(
  resume: TransactionFormResume | null | undefined,
  starterType: T,
): TransactionFormInitialState<T> {
  const amount = Math.round(Number(resume?.amount ?? 0))
  const hasAmount = Number.isFinite(amount) && amount > 0
  return {
    type: (resume?.type as T | undefined) ?? starterType,
    /* `formatAmountDigits` = satu-satunya bentuk kanon angka yang tampil di
       field (sama dengan yang dipakai setelah user selesai mengetik) */
    amountText: hasAmount ? formatAmountDigits(amount) : '',
    note: resume?.note ?? '',
    category: resume?.category ?? '',
    /* Fokus otomatis hanya untuk form KOSONG. Kalau isinya dipulihkan, menarik
       keyboard langsung saat sheet terbuka justru menutupi tombol "Catat". */
    focusAmount: !resume && !hasAmount,
  }
}
