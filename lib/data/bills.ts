import { formatIDR } from '../wallets'
import type { BudgetScope } from './budget'
import { UNDO_WINDOW_MS, shiftISODate } from './history'

/** satu pintu impor untuk halaman Tagihan: komponennya cukup ambil dari sini */
export { formatIDR }
export { maskMoney, UNDO_WINDOW_MS } from './history'

/* ── Tagihan / Recurring Bills (/app/bills) ──────────────────────────────────
   Satu sumber data + logika murni (tanpa React) untuk halaman Tagihan Rutin:

   1. Daftar tagihan berulang (Kos, Netflix, Spotify, cicilan HP, Kredivo, …)
      beserta status bulan ini.
   2. Fungsi status/filter/pengelompokan — dipakai chip filter & daftar.
   3. Data turunan untuk dua visual khas halaman ini: ringkasan nominal
      (belum dibayar · progres · total) dan strip 7 hari (tanggal + titik).

   Yang TIDAK ada lagi di sini: Waterfall Gaji / "Gaji terpakai". Porsi
   pemasukan adalah cerita Dashboard & Budget; halaman Tagihan hanya bicara
   nominal tagihan, progres membayar, dan tanggal jatuh tempo.

   Catatan tanggal: "hari ini" dipatok KONSTAN (TODAY_ISO / CURRENT_DAY), bukan
   `new Date()`. Sebabnya dua: (1) HTML hasil render server & render pertama
   client jadi identik — tidak ada hydration mismatch pada teks turunan seperti
   "Telat 3 hari" atau tanggal di strip 7 hari; (2) demo bisa dipindah tanggal
   dengan mengubah satu baris. Nanti saat data datang dari Supabase, dua
   konstanta ini yang diganti tanggal server.
   ────────────────────────────────────────────────────────────────────────── */

export type BillStatus = 'upcoming' | 'due_today' | 'overdue' | 'paid'
export type BillFilter = 'semua' | 'aktif' | 'telat' | 'lunas'

export interface Bill {
  id: string
  /** id baris `bills` di Supabase (uuid) — `undefined` = belum dikirim (paket 64) */
  remoteId?: string
  /** emoji identitas tagihan (pengganti logo brand) */
  emoji: string
  name: string
  /** nominal per bulan; 0 = nominal berubah-ubah (opsional saat input) */
  amount: number
  /** jatuh tempo tiap bulan, tanggal 1–31 */
  dueDate: number
  isRecurring: boolean
  category: string
  /** id dompet sumber pembayaran ('bca' | 'gopay' | 'tunai' | …) */
  walletId: string
  isPaidThisMonth: boolean
  /** ingatkan sekian hari sebelum jatuh tempo (0 = jangan ingatkan) */
  reminderDaysBefore: number
  /**
   * Konteks uang tagihan ini (paket 47) — Pribadi / Keluarga / Bersama
   * (PRD Domain 2C.2). Tipenya diimpor dari `lib/data/budget.ts` supaya app
   * hanya punya SATU definisi konteks; tidak ada tipe konteks kedua.
   *
   * Halaman Tagihan menyaring daftarnya dengan kolom ini, sementara ringkasan
   * (nominal belum dibayar & progres lunas) tetap menghitung SEMUA tagihan —
   * konteks menyaring daftar & arus, bukan total (kanon paket 47).
   */
  scope: BudgetScope
  /** cicilan berbatas: total tenor dalam bulan (kosong = tanpa batas) */
  endAfterMonths?: number
  /** bulan ke-berapa sekarang (1..endAfterMonths) */
  currentMonth?: number
  /**
   * id baris ledger pembayaran bulan ini (paket 51).
   *
   * Diisi HANYA oleh `markBillPaid()` — tagihan yang benar-benar dibayar lewat
   * app, bukan stempel contoh. Yang disimpan id barisnya (bukan cuma boolean)
   * supaya `unmarkBillPaid()` bisa membalikkan baris kas yang SAMA ketika user
   * salah tekan, dan supaya jejak uangnya bisa ditelusuri dari kartunya.
   * Tagihan contoh yang sudah "Lunas" di seed tidak punya kolom ini: barisnya
   * memang tidak pernah ada di ledger (lihat catatan di `lib/money/bills-store.ts`).
   */
  paidRowId?: string
  note?: string
}

/* ── KONSTANTA WAKTU & UANG (jangkar DEFAULT + kanon demo) ───────────────────
   PAKET 57: "hari ini" milik user datang dari `lib/time.ts`. Konstanta tanggal di
   bawah tinggal sebagai jangkar DEFAULT (render server, test, data seed) dan
   TIDAK lagi dibaca layar — halaman Tagihan mengirim `todayIso` dari
   `useTodayISO()` supaya strip 7 hari & status telat memakai hari yang
   benar-benar berjalan. */
export const TODAY_ISO = '2026-09-25'
export const CURRENT_DAY = 25
export const DAYS_IN_MONTH = 30
/** panjang kalender tagihan di halaman Tagihan (dua minggu ke depan) */
export const TIMELINE_DAYS = 14

/* ── MOCK TAGIHAN BULAN INI ─────────────────────────────────────────────────
   Sengaja campur: 4 sudah lunas, 1 jatuh tempo HARI INI (Cicilan HP), 1 masih
   akan datang (Kredivo tgl 28). Untuk menguji tampilan "telat", turunkan
   CURRENT_DAY atau majukan dueDate salah satu tagihan yang belum dibayar.

   `scope` (paket 47) mengikuti arti tagihannya: mayoritas milik Pribadi, tapi
   ketiga konteks sengaja punya isi nyata — kalau semua `pribadi`, bug penyaring
   (daftar tidak berubah saat konteks ditukar) justru tidak akan pernah terlihat. */
export const INITIAL_BILLS: Bill[] = [
  {
    id: '1',
    emoji: '🏠',
    name: 'Kos Bulanan',
    amount: 1_500_000,
    dueDate: 1,
    isRecurring: true,
    category: 'Tagihan',
    walletId: 'bca',
    isPaidThisMonth: true,
    reminderDaysBefore: 3,
    scope: 'pribadi',
  },
  {
    id: '2',
    emoji: '🎬',
    name: 'Netflix',
    amount: 54_000,
    dueDate: 15,
    isRecurring: true,
    category: 'Hiburan',
    walletId: 'gopay',
    isPaidThisMonth: true,
    reminderDaysBefore: 1,
    /* langganan ini dipakai berdua di rumah → masuk konteks Keluarga */
    scope: 'keluarga',
  },
  {
    id: '3',
    emoji: '🎵',
    name: 'Spotify',
    amount: 54_990,
    dueDate: 20,
    isRecurring: true,
    category: 'Hiburan',
    walletId: 'gopay',
    isPaidThisMonth: true,
    reminderDaysBefore: 1,
    scope: 'pribadi',
  },
  {
    id: '4',
    emoji: '📱',
    name: 'Cicilan HP',
    amount: 450_000,
    dueDate: 25,
    isRecurring: true,
    category: 'Tagihan',
    walletId: 'bca',
    isPaidThisMonth: false,
    endAfterMonths: 12,
    currentMonth: 5,
    reminderDaysBefore: 3,
    scope: 'pribadi',
  },
  {
    id: '5',
    emoji: '💳',
    name: 'Kredivo',
    amount: 350_000,
    dueDate: 28,
    isRecurring: true,
    category: 'Tagihan',
    walletId: 'bca',
    isPaidThisMonth: false,
    endAfterMonths: 6,
    currentMonth: 3,
    reminderDaysBefore: 3,
    scope: 'pribadi',
  },
  {
    id: '6',
    emoji: '📶',
    name: 'Paket Internet',
    amount: 100_000,
    dueDate: 10,
    isRecurring: true,
    category: 'Tagihan',
    walletId: 'tunai',
    isPaidThisMonth: true,
    reminderDaysBefore: 1,
    /* WiFi rumah dibayar dari uang patungan → konteks Bersama */
    scope: 'bersama',
  },
]

/* ── STATUS ────────────────────────────────────────────────────────────────── */

export function getBillStatus(bill: Bill, currentDay: number = CURRENT_DAY): BillStatus {
  if (bill.isPaidThisMonth) return 'paid'
  if (currentDay > bill.dueDate) return 'overdue'
  if (currentDay === bill.dueDate) return 'due_today'
  return 'upcoming'
}

/** jumlah hari keterlambatan (selalu >= 0) */
export function daysLate(bill: Bill, currentDay: number = CURRENT_DAY): number {
  return Math.max(0, currentDay - bill.dueDate)
}

/** jumlah hari menuju jatuh tempo (selalu >= 0) */
export function daysUntil(bill: Bill, currentDay: number = CURRENT_DAY): number {
  return Math.max(0, bill.dueDate - currentDay)
}

/** konteks jatuh tempo di kartu tagihan — teks + warna kanonnya */
export function dueContext(
  bill: Bill,
  status: BillStatus,
  currentDay: number = CURRENT_DAY,
): { text: string; className: string } {
  if (status === 'paid') return { text: 'Lunas', className: 'text-hud-sage' }
  if (status === 'overdue') {
    return {
      text: `Jatuh tempo tgl ${bill.dueDate}, Telat ${daysLate(bill, currentDay)} hari`,
      className: 'text-hud-terracotta',
    }
  }
  if (status === 'due_today') return { text: 'Jatuh tempo HARI INI', className: 'text-hud-amber' }
  return {
    text: `Tgl ${bill.dueDate} · ${daysUntil(bill, currentDay)} hari lagi`,
    className: 'text-forest/45',
  }
}

/** 'Bulan 5/12' untuk cicilan berbatas, null kalau tanpa batas */
export function endAfterLabel(bill: Bill): string | null {
  if (!bill.endAfterMonths) return null
  return `Bulan ${bill.currentMonth ?? 1}/${bill.endAfterMonths}`
}

/* ── RINGKASAN UANG ────────────────────────────────────────────────────────── */

export function totalMonthlyBills(bills: Bill[]): number {
  return bills.reduce((sum, bill) => sum + bill.amount, 0)
}

export function paidBills(bills: Bill[]): Bill[] {
  return bills.filter((bill) => bill.isPaidThisMonth)
}

/* ── FILTER (chip Section 6) ──────────────────────────────────────────────── */

export const BILL_FILTERS: { id: BillFilter; label: string }[] = [
  { id: 'semua', label: 'Semua' },
  { id: 'aktif', label: 'Aktif' },
  { id: 'telat', label: 'Telat' },
  { id: 'lunas', label: 'Lunas' },
]

export function matchesBillFilter(
  bill: Bill,
  filter: BillFilter,
  currentDay: number = CURRENT_DAY,
): boolean {
  const status = getBillStatus(bill, currentDay)
  if (filter === 'semua') return true
  if (filter === 'aktif') return status === 'upcoming' || status === 'due_today'
  if (filter === 'telat') return status === 'overdue'
  return status === 'paid'
}

export function filterBills(
  bills: Bill[],
  filter: BillFilter,
  currentDay: number = CURRENT_DAY,
): Bill[] {
  return bills.filter((bill) => matchesBillFilter(bill, filter, currentDay))
}

/** jumlah per chip — selalu dihitung dari SEMUA tagihan, jadi angkanya tidak
 *  ikut berubah saat salah satu chip dipilih */
export function billFilterCounts(
  bills: Bill[],
  currentDay: number = CURRENT_DAY,
): Record<BillFilter, number> {
  return {
    semua: bills.length,
    aktif: bills.filter((bill) => matchesBillFilter(bill, 'aktif', currentDay)).length,
    telat: bills.filter((bill) => matchesBillFilter(bill, 'telat', currentDay)).length,
    lunas: bills.filter((bill) => matchesBillFilter(bill, 'lunas', currentDay)).length,
  }
}

/* ── PENGELOMPOKAN DAFTAR (Section 7A) ────────────────────────────────────── */

export interface BillGroupMeta {
  status: BillStatus
  label: string
}

/** urutan prioritas: telat → hari ini → akan datang → sudah dibayar */
export const BILL_GROUPS: BillGroupMeta[] = [
  { status: 'overdue', label: 'Terlambat' },
  { status: 'due_today', label: 'Hari ini' },
  { status: 'upcoming', label: 'Akan datang' },
  { status: 'paid', label: 'Sudah dibayar' },
]

export interface BillGroup {
  meta: BillGroupMeta
  items: Bill[]
}

/* ── TIMELINE 7 HARI (Section 5) ─────────────────────────────────────────── */

const MONTHS_SHORT = [
  'Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun',
  'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des',
]

export interface TimelineDay {
  iso: string
  /** tanggal 1–31 */
  day: number
  /** singkatan bulan (mis. 'Sep'), dipakai untuk penanda siklus bulan depan */
  monthShort: string
  isToday: boolean
  /** true = sel ini milik bulan berikutnya (siklus tagihan yang baru) */
  nextMonth: boolean
}

/**
 * 7 hari ke depan dimulai hari ini (offset 0..count-1).
 *
 * `fromIso` = tanggal "hari ini" milik user (paket 57): halaman Tagihan
 * mengirim `useTodayISO()`, jadi strip-nya benar-benar 7 hari ke depan.
 */
export function upcomingDays(count: number = TIMELINE_DAYS, fromIso: string = TODAY_ISO): TimelineDay[] {
  const [, baseMonth] = fromIso.split('-').map(Number)
  return Array.from({ length: count }, (_, i) => {
    const iso = shiftISODate(fromIso, i)
    const [y, m, d] = iso.split('-').map(Number)
    return {
      iso,
      day: d,
      monthShort: MONTHS_SHORT[(m ?? 1) - 1],
      /* offset 0 selalu hari ini — sumbernya TODAY_ISO, bukan jam mesin user */
      isToday: i === 0,
      nextMonth: m !== baseMonth || y !== (fromIso.split('-').map(Number)[0] ?? y),
    }
  })
}

/** tagihan yang jatuh tempo di tanggal `day` (1–31) */
export function billsOnDay(bills: Bill[], day: number): Bill[] {
  return bills.filter((bill) => bill.dueDate === day)
}

/** kelompokkan tagihan; grup kosong tidak dikembalikan; di dalam grup diurut
 *  naik berdasarkan tanggal jatuh tempo */
export function groupBills(bills: Bill[], currentDay: number = CURRENT_DAY): BillGroup[] {
  return BILL_GROUPS.map((meta) => ({
    meta,
    items: bills
      .filter((bill) => getBillStatus(bill, currentDay) === meta.status)
      .sort((a, b) => a.dueDate - b.dueDate),
  })).filter((group) => group.items.length > 0)
}

/* ── PILIHAN DI SHEET TAMBAH TAGIHAN (Section 9) ─────────────────────────── */

/** 12 kunci ikon preset — baris pertama picker. Nilainya tetap emoji supaya
 *  data tagihan lama (dan sinkronisasi Supabase) tidak perlu dimigrasi; yang
 *  dirender ke user adalah ikon garis dari `bill-glyph.tsx`. */
export const BILL_EMOJI_PRESETS = [
  '🏠', '🎬', '🎵', '📱', '💳', '📶', '🔌', '💧', '🏋️', '📚', '🚗', '✨',
] as const

/** tombol 'Lainnya' → grid emoji tambahan (tanpa dependensi emoji-picker) */
export const BILL_EMOJI_MORE = [
  '🛒', '🧾', '🎮', '☕', '🍔', '🐶', '🐱', '💊', '🩺', '🏫', '🎓', '👶',
  '🚌', '⛽', '✈️', '🏥', '🧹', '📺', '🎧', '🎨', '🕋', '🕌', '⛪', '💻',
] as const

export const BILL_CATEGORY_OPTIONS = [
  'Tagihan',
  'Hiburan',
  'Kebutuhan Rumah',
  'Transportasi',
  'Kesehatan',
  'Pendidikan',
  'Lainnya',
] as const

/** dompet sumber pembayaran — diselaraskan dengan halaman Dompet & Akun */
export const BILL_WALLET_OPTIONS: { id: string; name: string; kind: string }[] = [
  { id: 'bca', name: 'BCA', kind: 'Bank' },
  { id: 'gopay', name: 'GoPay', kind: 'E-Wallet' },
  { id: 'tunai', name: 'Tunai', kind: 'Uang cash' },
  { id: 'ovo', name: 'OVO', kind: 'E-Wallet' },
]

export function billWalletName(walletId: string): string {
  return BILL_WALLET_OPTIONS.find((wallet) => wallet.id === walletId)?.name ?? walletId
}

/* ── OPSI SAAT MODE EDIT ────────────────────────────────────────────────────
   Dua helper di bawah menjaga prinsip yang sama: sheet edit TIDAK boleh
   diam-diam mengubah data user. Kalau tagihan lamanya memakai kategori/dompet
   yang belum ada di daftar kanon (mis. dompet baru dari paket 04), nilainya
   tetap ditampilkan sebagai opsi — bukan dipaksa pindah ke opsi pertama. */

/** daftar kategori + kategori lama (kalau belum ada di daftar) */
export function billCategoryOptions(current?: string): string[] {
  const list: string[] = [...BILL_CATEGORY_OPTIONS]
  if (current && !list.includes(current)) list.push(current)
  return list
}

/** daftar dompet + dompet lama (kalau belum ada di daftar) */
export function billWalletOptions(
  currentId?: string,
): { id: string; name: string; kind: string }[] {
  if (!currentId || BILL_WALLET_OPTIONS.some((wallet) => wallet.id === currentId)) {
    return BILL_WALLET_OPTIONS
  }
  return [...BILL_WALLET_OPTIONS, { id: currentId, name: billWalletName(currentId), kind: 'Dompet lain' }]
}

/** 'Ingatkan sebelum jatuh tempo' — nilai = hari (0 = jangan ingatkan) */
export const BILL_REMINDER_OPTIONS: { days: number; label: string }[] = [
  { days: 1, label: '1 hari' },
  { days: 3, label: '3 hari' },
  { days: 7, label: '1 minggu' },
  { days: 0, label: 'Jangan ingatkan' },
]

/* ── COPY TETAP ───────────────────────────────────────────────────────────── */

/* ── SHEET TAMBAH ⇄ EDIT TAGIHAN ────────────────────────────────────────────
   Satu sheet dipakai untuk dua mode (paket 03). Judul & CTA-nya berganti —
   kata "Edit" dipakai apa adanya supaya user tahu ia sedang mengubah yang
   sudah ada, bukan menambah baru. Deskripsi mode edit sengaja menenangkan:
   yang salah cuma satu bagian, bukan seluruh catatannya. */
export const BILL_SHEET_COPY = {
  add: {
    title: 'Tambah Tagihan Baru',
    description: 'Cukup nama & tanggal jatuh tempo dulu, sisanya opsional.',
    submit: 'Simpan Tagihan',
  },
  edit: {
    title: 'Edit Tagihan',
    description: 'Ubah bagian yang keliru aja, sisanya tetap seperti semula.',
    submit: 'Simpan Perubahan',
  },
} as const

export const ADD_BILL_TOAST = {
  title: 'Tagihan baru ditambahkan! 🔔',
} as const

export const UPDATE_BILL_TOAST = {
  title: 'Tagihan diperbarui 🌿',
  description: 'Perubahannya langsung tampil di daftar rutinmu.',
  /** jaring pengaman: tagihannya sudah tidak ada (mis. dihapus di tab lain) */
  expired: 'Tagihannya sudah tidak ada di daftar, jadi tidak ada yang diubah 🌿',
} as const

/**
 * Dipakai saat kartu dicap LUNAS (stempel + haptic + toast) — dan sejak paket 51
 * kalimatnya menyebut NOMINAL + DOMPET, karena uangnya benar-benar keluar dari
 * dompet itu sebelum stempelnya naik (satu baris ledger ditulis `markBillPaid()`
 * lebih dulu). Toast "LUNAS!" yang tidak menyebut dari mana uangnya keluar
 * adalah jenis klaim yang justru ditutup paket ini.
 */
export const MARK_PAID_TOAST = (name: string, amount: string, walletName: string) =>
  `${name} ${amount} lunas dari ${walletName} ✅`

/* ── KONFIRMASI & UNDO HAPUS TAGIHAN ────────────────────────────────────────
   Menghapus tagihan rutin itu merusak kebiasaan yang sudah jalan (ringkasan &
   progres ikut berubah). Karena itu hapus SELALU lewat konfirmasi + menyediakan
   Undo 5 detik — bukan langsung hilang. */
export const CONFIRM_DELETE_BILL_COPY = {
  overlay: 'Batal hapus tagihan',
  title: 'Hapus tagihan ini?',
  body: (name: string) => `“${name}” bakal keluar dari daftar rutinmu.`,
  safety: `Tenang, masih bisa kamu balikin lewat tombol Undo selama ${
    UNDO_WINDOW_MS / 1000
  } detik.`,
  cancel: 'Batal',
  confirm: 'Hapus',
} as const

export const DELETE_BILL_TOAST = {
  title: 'Tagihan dihapus',
  description: (name: string) => `${name} keluar dari daftar rutinmu.`,
  undo: 'Undo',
  undoneTitle: 'Tagihan dikembalikan 🌿',
  undoneDescription: 'Tagihannya balik ke daftar seperti semula.',
  /** jaring pengaman tetap jujur kalau tombol Undo ditekan setelah jendelanya tutup */
  expired: 'Jendela Undo-nya sudah lewat, tagihannya bisa ditambahkan lagi kapan aja 🌿',
} as const

/**
 * "Bersihkan" = HAPUS semua tagihan lunas sekaligus (bukan sekadar disembunyikan).
 * Karena itu ia selalu lewat konfirmasi lebih dulu + tetap punya jendela Undo,
 * sama seperti hapus satu tagihan.
 */
export const CONFIRM_CLEAR_PAID_COPY = {
  overlay: 'Batal bersihkan tagihan lunas',
  title: (count: number) => `Bersihkan ${count} tagihan lunas?`,
  body: 'Tagihan yang sudah dibayar akan dihapus dari daftar rutin dan tidak muncul lagi bulan depan.',
  safety: `Masih bisa dibatalkan lewat Undo selama ${UNDO_WINDOW_MS / 1000} detik.`,
  note: 'Catatan pembayarannya tetap tersimpan di Riwayat, yang hilang cuma tagihannya dari daftar rutin.',
  cancel: 'Nanti saja',
  confirm: 'Bersihkan',
} as const

export const CLEAR_PAID_TOAST = {
  title: (count: number) => `${count} tagihan lunas dibersihkan`,
  description: 'Catatan pembayarannya tetap ada di Riwayat.',
  undo: 'Undo',
  undoneTitle: 'Tagihan lunas dikembalikan 🌿',
  undoneDescription: 'Tagihannya balik ke daftar seperti semula.',
  expired: 'Jendela Undo-nya sudah lewat, tagihannya tetap terhapus.',
  failed: 'Tidak ada tagihan lunas yang bisa dibersihkan, daftarnya sudah berubah.',
} as const

export const HUD_DEDUCTION_HELPER =
  '💡 Tagihan rutin otomatis dipotong dari Jatah Harian kamu'

export const NOTIF_NUDGE_COPY =
  'Aktifkan notifikasi biar gak pernah telat bayar tagihan'
export const NOTIF_NUDGE_HELPER = 'Diingatkan 1-3 hari sebelum jatuh tempo. Gak spam.'
/** kunci localStorage penolakan permanen banner notifikasi */
export const NOTIF_NUDGE_KEY = 'catetind-bills-notif-nudge'

/* ── BAYAR TAGIHAN YANG BENAR-BENAR MENGGERAKKAN UANG (paket 51) ─────────────
   Sebelum paket ini, satu geser ke kanan hanya menempelkan stempel LUNAS + toast
   "sudah dibayar": tidak ada satu baris pun di ledger kas, jadi saldo dompet
   tidak berkurang (temuan E laporan 46 — jenis yang SAMA dengan audit #1 paket
   41, dan dilarang kanon "jujur di setiap klaim" PRD 244: kata "LUNAS" di layar
   tidak boleh berarti uangnya masih utuh).

   Sekarang "Tandai Lunas" membuka pemilih DOMPET, dan baris kasnya ditulis
   (kategori `BILL_PAYMENT_CATEGORY`) SEBELUM statusnya berubah. Semua kalimatnya
   tinggal di sini — termasuk yang menjelaskan bahwa uangnya benar-benar keluar —
   supaya tidak ada halaman yang mengarang versinya sendiri. */

/** kategori baris ledger untuk pembayaran tagihan (satu nilai, satu tempat) */
export const BILL_PAYMENT_CATEGORY = 'Tagihan'

/** sheet "Tandai Lunas" — pemilih dompet + nominal yang benar-benar dibayar */
export const MARK_PAID_SHEET_COPY = {
  title: (name: string) => `Tandai ${name} lunas`,
  amountLabel: 'Nominal dibayar',
  walletLabel: 'Dompet sumber',
  submit: 'Tandai Lunas',
  /** pengingat sebelum menekan simpan: uangnya keluar dari dompet mana */
  cashLine: (amount: string, walletName: string) => `${amount} akan keluar dari ${walletName}.`,
  walletBalance: (value: string) => `Saldo ${value}`,
  noWallet: 'Belum ada dompet yang bisa dipakai. Tambah dompet dulu di halaman Dompet & Akun.',
  invalid: 'Nominalnya belum sah, isi angka rupiah lebih dari nol.',
  insufficient: (walletName: string) =>
    `Saldo ${walletName} gak cukup untuk ini. Pilih dompet lain atau catat nominal yang lebih kecil.`,
  /** ditolak store (mis. statusnya keburu berubah / dompetnya sudah tidak ada) */
  rejected: 'Tagihannya belum bisa ditandai lunas sekarang. Buka ulang halamannya ya 🌿',
  /**
   * Saat sheet DITUTUP tanpa menekan simpan: tidak ada yang dibayar, jadi
   * statusnya sengaja TIDAK berubah. Kalimat ini yang dikatakan ke user — bukan
   * stempel LUNAS tanpa uang keluar.
   */
  closedNote: 'Belum ada yang dibayar, status tagihannya masih seperti semula.',
} as const

/** detail toast setelah baris kasnya benar-benar tertulis */
export const MARK_PAID_TOAST_EXTRA = {
  description: 'Saldo dompetnya sudah berkurang & catatannya masuk Riwayat.',
  /** tombol batal di toast: membalikkan baris kas yang baru ditulis */
  undo: 'Batal',
  undoneTitle: 'Tanda lunas dibatalkan',
  undoneDescription: 'Catatan pembayarannya ikut dibatalkan, saldo dompetmu kembali seperti semula.',
  /** jaring pengaman kalau tombolnya ditekan setelah jendelanya tutup */
  expired: 'Jendela batal-nya sudah lewat, catatan pembayarannya tetap ada di Riwayat 🌿',
} as const

/**
 * Nama baris kas yang MENGEMBALIKAN uang saat pembatalan "Lunas".
 *
 * Ditulis apa adanya ("Batal bayar Kredivo") karena:
 *   · `removeRow()` saja hanya menyembunyikan barisnya — saldo dompet tidak ikut
 *     pulih (kanon paket 46), jadi pengembaliannya harus ditulis;
 *   · kalau baris itu memakai copy koreksi saldo bawaan ("Pemasukan tak
 *     tercatat"), user membaca seolah mendapat uang entah dari mana.
 */
export const BILL_UNPAID_REVERSAL_NOTE = (name: string) => `Batal bayar ${name}`

/* ── AKSI BAYAR YANG TERLIHAT DI KARTU (paket 60 · 60.4 · AKAR B) ────────────
   Temuan audit: satu-satunya jalan menandai lunas adalah GESER KANAN pada kartu.
   Di desktop gesture itu nyaris tidak ditemukan — tidak ada tombol, tidak ada
   menu, hanya garis sage tipis di tepi kartu sebagai petunjuk. Aksi terpenting
   halaman Tagihan tidak boleh cuma bisa dijangkau oleh user yang tahu rahasianya.

   Sekarang kartu punya tombolnya sendiri, dan geser tetap hidup sebagai jalur
   cepat (bukan lagi satu-satunya jalur). Tiga keadaan, tiga perlakuan — dan
   bedanya penting supaya tidak ada tombol tanpa akibat:

     · BELUM LUNAS          → tombol `markPaid` (buka sheet pemilih dompet,
                              paket 51: uangnya benar-benar keluar);
     · LUNAS + ada catatan  → tombol `unmarkPaid` (dengan konfirmasi, karena
       pembayaran di app     baris kasnya dibalikkan & saldonya pulih);
     · LUNAS tanpa catatan  → TIDAK ada tombol batal; keadaannya dijelaskan
       (tagihan contoh seed)  lewat `paidSeedNote`. Membatalkannya tidak akan
                              mengembalikan uang apa pun, jadi tombol yang
                              "kelihatan bisa" justru klaim palsu (PRD 244). */
export const BILL_CARD_ACTION_COPY = {
  markPaid: 'Tandai Lunas',
  markPaidA11y: (name: string) => `Tandai ${name} lunas`,
  markPaidHint: 'Pilih dompet sumbernya, saldonya langsung berkurang.',
  /** label di area aksi yang tersingkap saat geser kanan (jalur cepat) */
  markPaidSwipe: 'Tandai Lunas',
  unmarkPaid: 'Batal lunas',
  unmarkPaidA11y: (name: string) => `Batalkan status lunas ${name}`,
  unmarkPaidHint: 'Mengembalikan uangnya ke dompet yang kamu pakai membayar.',
  /** aksi di balik geser KIRI — label & nama untuk pembaca layar */
  edit: 'Edit',
  editA11y: (name: string) => `Edit ${name}`,
  delete: 'Hapus',
  deleteA11y: (name: string) => `Hapus ${name}`,
  /** penanda di baris meta untuk tagihan contoh yang stempelnya tidak punya baris kas */
  paidSeedNote: 'Lunas contoh (tanpa catatan dompet)',
} as const

/** konfirmasi "Batal lunas" — uangnya benar-benar kembali ke dompet, jadi aksi
 *  ini tidak boleh jalan tanpa persetujuan (kanon: aksi merusak selalu ditolak
 *  dulu; pola `ConfirmDialog` yang sama dengan hapus) */
export const CONFIRM_UNPAID_COPY = {
  overlay: 'Batal batalkan lunas',
  title: 'Batalkan tanda lunas?',
  body: (name: string, amountLabel: string) =>
    `“${name}” balik jadi belum dibayar, dan ${amountLabel} dikembalikan ke dompet yang kamu pakai membayar.`,
  note:
    'Catatan pembayarannya tetap tersimpan di Riwayat sebagai baris yang dibatalkan, jejak uangnya tidak dihapus, supaya saldo dompetmu tetap bisa dijelaskan.',
  cancel: 'Nanti saja',
  confirm: 'Batalkan lunas',
} as const

/** toast setelah "Batal lunas" berhasil (uangnya benar-benar kembali) */
export const UNPAID_TOAST = {
  title: (name: string) => `Tanda lunas ${name} dibatalkan`,
  description: (amountLabel: string, walletName: string) =>
    `${amountLabel} kembali ke ${walletName}, dan tagihannya masuk lagi ke daftar aktif.`,
  /** percobaan yang tidak mengubah apa pun (statusnya keburu berubah di tab lain) */
  rejected: 'Status tagihan ini sudah berubah, tidak ada yang dibatalkan.',
  /** tagihan contoh: tidak ada baris kas yang bisa dibalikkan */
  noRow: 'Tagihan contoh ini tidak punya catatan pembayaran di app, jadi tidak ada uang yang bisa dikembalikan.',
} as const

/* ── COPY REVISI AUDIT UI/UX (H6) ────────────────────────────────────────────
   H6-4 — placeholder mengajak menambah tagihan rutin lain. */

export const BILL_ADD_PLACEHOLDER = {
  title: 'Tambah tagihan rutin lainnya',
  body: 'Langganan, kos, atau cicilan',
} as const

