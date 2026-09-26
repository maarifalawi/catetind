import { formatIDR } from '../wallets'
import { MASKED_AMOUNT } from './history'

/** satu pintu impor untuk halaman Budget: semua komponennya cukup ambil dari sini */
export { formatIDR }

/* ── Budget & Target Nabung (/app/budget) ────────────────────────────────────
   Satu sumber data + logika murni (tanpa React) untuk dua zona halaman:

   Zona A — Budget Kategori (batas pengeluaran per kategori)
   Zona B — Celengan Impian (sinking fund dengan metafora tanaman)

   Catatan tanggal: "hari ini" dipatok KONSTAN (TODAY_ISO / CURRENT_DAY), bukan
   `new Date()`. Alasannya dua: (1) HTML hasil render server & render pertama
   client jadi identik — tidak ada hydration mismatch pada teks turunan seperti
   pacing ideal, bulan tersisa, dan "nabung Rp X/bulan"; (2) demo bisa
   dipindah-pindah tanggal dengan mengubah satu baris. Nanti saat data datang
   dari Supabase, ganti dua konstanta ini dengan tanggal server.
   ────────────────────────────────────────────────────────────────────────── */

export type BudgetPeriod = 'weekly' | 'monthly' | 'custom'
/** Konteks keuangan halaman ini — sama dengan Scope di Context Switcher app
 *  (PRD 2C.2: Pribadi / Keluarga / Bersama). `bersama` sengaja ikut
 *  didefinisikan supaya halaman bisa membaca KONTEKS GLOBAL (sidebar) tanpa
 *  cast; item mock hari ini baru punya 'pribadi' & 'keluarga', jadi konteks
 *  'bersama' akan menampilkan empty state — bukan data milik konteks lain. */
export type BudgetScope = 'pribadi' | 'keluarga' | 'bersama'
export type GoalPriority = 'rendah' | 'sedang' | 'tinggi' | 'kritis'
export type PlantStage = 'seed' | 'sprout' | 'plant' | 'flower' | 'bloom'
/** tiga warna kanon status pacing (PRD 2B.2) — resolusi: BUKAN merah */
export type PacingTone = 'sage' | 'amber' | 'terracotta'

export interface BudgetItem {
  id: number
  category: string
  /** emoji kategori (mock icon — nanti dari icon set) */
  icon: string
  limit: number
  spent: number
  period: BudgetPeriod
  scope: BudgetScope
}

export interface SinkingFundItem {
  id: number
  name: string
  target: number
  current: number
  /** tanggal lokal `YYYY-MM-DD` */
  deadline: string
  priority: GoalPriority
  stage: PlantStage
  scope: BudgetScope
  /** false = belum setor bulan ini → memicu nudge (Domain 2C.4) */
  contributedThisMonth: boolean
}

/* ── KONSTANTA WAKTU (MOCK) ──────────────────────────────────────────────────
   CURRENT_DAY 27 = mendekati akhir bulan. Kartu "Sapu Bersih" (3G) butuh
   CURRENT_DAY >= SWEEP_TRIGGER_DAY (28) — ubah CURRENT_DAY jadi 28..30 kalau
   mau melihat kartu sweep. */
export const TODAY_ISO = '2026-09-27'
export const CURRENT_DAY = 27
export const DAYS_IN_MONTH = 30
/** 3G: sapu-sapu sisa budget baru muncul di 3 hari terakhir bulan */
export const SWEEP_TRIGGER_DAY = 28

/* ── KONSTANTA UANG (MOCK) ───────────────────────────────────────────────── */
export const MONTHLY_INCOME = 7_500_000
export const TOTAL_INSTALLMENTS = 800_000
export const SPENT_THIS_MONTH = 4_200_000
/** matikan (false) untuk menguji kartu Dry Spell menggantikan Daily HUD */
export const HAS_INCOME_THIS_MONTH = true

/* ── HUD HARIAN — formula kanon PRD 2B.1 (cicilan → celengan → sisa) ────────
   Audit UX #2: jatah harian WAJIB dihitung SETELAH sinking fund. Menampilkan
   "jatah aman" padahal celengan bulan ini belum disetor = ilusi palsu. */
export interface BudgetHud {
  /** pemasukan − cicilan − kewajiban celengan (uang yang benar-benar bebas) */
  availablePool: number
  /** sisa bulan; BOLEH negatif = kurang sekian untuk penuhi celengan */
  remaining: number
  daysLeft: number
  /** jatah harian — 0 saat `shortfall` (jatah ditahan, bukan ditawarkan) */
  dailyBudget: number
  /** cicilan platform aktif yang dipotong lebih dulu (PRD 2B.1) */
  installments: number
  /** total kewajiban celengan bulan ini (sinking funds belum disetor) */
  sinkingObligation: number
  spentThisMonth: number
  /** true = `remaining` < 0: saldo tidak cukup memenuhi celengan bulan ini */
  shortfall: boolean
}

export function computeDailyHud({
  monthlyIncome,
  totalInstallments,
  sinkingObligation = 0,
  spentThisMonth,
  currentDay,
  daysInMonth,
}: {
  monthlyIncome: number
  totalInstallments: number
  /** kewajiban celengan bulan ini — dipotong sebelum jatah harian dihitung */
  sinkingObligation?: number
  spentThisMonth: number
  currentDay: number
  daysInMonth: number
}): BudgetHud {
  const availablePool = monthlyIncome - totalInstallments - sinkingObligation
  const remaining = availablePool - spentThisMonth
  const daysLeft = Math.max(1, daysInMonth - currentDay + 1) // termasuk hari ini
  const shortfall = remaining < 0
  // saat shortfall jatah DITAHAN (0) — jangan pernah tawarkan uang yang belum ada
  const dailyBudget = shortfall ? 0 : Math.max(0, Math.floor(remaining / daysLeft))
  return {
    availablePool,
    remaining,
    daysLeft,
    dailyBudget,
    installments: totalInstallments,
    sinkingObligation,
    spentThisMonth,
    shortfall,
  }
}

/** total kewajiban celengan bulan ini = jumlah "nabung Rp X/bulan" untuk
 *  celengan yang BELUM disetor bulan ini. Setelah user setor, kewajibannya
 *  lunas → jatah harian ikut pulih (uangnya memang sudah keluar). */
export function sinkingObligationOf(funds: SinkingFundItem[]): number {
  return funds
    .filter((fund) => !fund.contributedThisMonth)
    .reduce((sum, fund) => sum + monthlyNeeded(fund.target, fund.current, fund.deadline), 0)
}

export const DAILY_HUD = computeDailyHud({
  monthlyIncome: MONTHLY_INCOME,
  totalInstallments: TOTAL_INSTALLMENTS,
  spentThisMonth: SPENT_THIS_MONTH,
  currentDay: CURRENT_DAY,
  daysInMonth: DAYS_IN_MONTH,
})

/* ── MOCK BUDGET KATEGORI ────────────────────────────────────────────────────
   `spent` menutup dua warna status pacing (sage & amber). Untuk melihat state
   >= 100% (terracotta + banner AI Coach di bawah daftar), naikkan mis. `spent`
   Kopi jadi 310.000. */
export const INITIAL_BUDGETS: BudgetItem[] = [
  { id: 1, category: 'Makanan', icon: '🍜', limit: 1_500_000, spent: 1_180_000, period: 'monthly', scope: 'keluarga' },
  { id: 2, category: 'Transportasi', icon: '🚗', limit: 500_000, spent: 320_000, period: 'monthly', scope: 'pribadi' },
  { id: 3, category: 'Kopi', icon: '☕', limit: 300_000, spent: 285_000, period: 'monthly', scope: 'pribadi' },
  { id: 4, category: 'Hiburan', icon: '🎮', limit: 400_000, spent: 150_000, period: 'monthly', scope: 'keluarga' },
]

/* ── MOCK CELENGAN IMPIAN (sinking funds) ─────────────────────────────────── */
export const INITIAL_SINKING_FUNDS: SinkingFundItem[] = [
  { id: 1, name: 'Tiket Konser Coldplay', target: 3_000_000, current: 1_850_000, deadline: '2026-12-15', priority: 'tinggi', stage: 'plant', scope: 'pribadi', contributedThisMonth: false },
  { id: 2, name: 'Dana Darurat', target: 15_000_000, current: 4_200_000, deadline: '2027-06-01', priority: 'kritis', stage: 'sprout', scope: 'keluarga', contributedThisMonth: false },
  /* iPhone disetel (current 10jt, deadline Des 2026) supaya kewajiban celengan
     bulan ini ≈ Rp 2,67jt — digabung Coldplay Rp 383rb jadi ≈ Rp 3,05jt, lebih
     besar dari sisa uang Rp 2,5jt. Inilah yang memunculkan state "jatah
     ditahan" (audit UX #2) di kartu Jatah Hari Ini. */
  { id: 3, name: 'iPhone 16', target: 18_000_000, current: 10_000_000, deadline: '2026-12-15', priority: 'sedang', stage: 'plant', scope: 'pribadi', contributedThisMonth: false },
]

/* ── PILIHAN KATEGORI BUDGET (grid pill di AddBudgetSheet Step 1) ─────────── */
export const BUDGET_CATEGORY_OPTIONS: { label: string; icon: string }[] = [
  { label: 'Makanan', icon: '🍜' },
  { label: 'Transportasi', icon: '🚗' },
  { label: 'Kopi', icon: '☕' },
  { label: 'Hiburan', icon: '🎮' },
  { label: 'Belanja', icon: '🛍️' },
  { label: 'Tagihan', icon: '🧾' },
  { label: 'Kesehatan', icon: '💊' },
  { label: 'Lainnya', icon: '✨' },
]

export const BUDGET_PERIOD_OPTIONS: { id: BudgetPeriod; label: string }[] = [
  { id: 'weekly', label: 'Mingguan' },
  { id: 'monthly', label: 'Bulanan' },
  { id: 'custom', label: 'Custom' },
]

/* ── PRIORITAS CELENGAN — badge & dot, semua warna dari design system ─────── */
export const PRIORITY_OPTIONS: {
  id: GoalPriority
  label: string
  badge: string
  dot: string
}[] = [
  { id: 'rendah', label: 'Rendah', badge: 'bg-slate-100 text-slate-600 ring-1 ring-slate-400/20', dot: 'bg-slate-400' },
  { id: 'sedang', label: 'Sedang', badge: 'bg-hud-sage/20 text-[#6f8059] ring-1 ring-hud-sage/30', dot: 'bg-hud-sage' },
  { id: 'tinggi', label: 'Tinggi', badge: 'bg-hud-amber/20 text-[#a06a2c] ring-1 ring-hud-amber/30', dot: 'bg-hud-amber' },
  { id: 'kritis', label: 'Kritis', badge: 'bg-hud-terracotta/15 text-hud-terracotta ring-1 ring-hud-terracotta/25', dot: 'bg-hud-terracotta' },
]

export function priorityStyle(priority: GoalPriority) {
  return PRIORITY_OPTIONS.find((p) => p.id === priority) ?? PRIORITY_OPTIONS[0]
}

/* ── METAFORA TANAMAN — tahap pertumbuhan celengan (PRD 2C.3) ─────────────── */
export const PLANT_STAGES: Record<PlantStage, { icon: string; label: string }> = {
  seed: { icon: '🌱', label: 'Baru ditanam' },
  sprout: { icon: '🌿', label: 'Mulai tumbuh!' },
  plant: { icon: '🌳', label: 'Tumbuh subur!' },
  flower: { icon: '🌸', label: 'Hampir mekar!' },
  bloom: { icon: '🌺', label: 'TERCAPAI! 🎉' },
}

/** budget PlantStage → tahap ilustrasi SVG (plant-illustration: 1..4).
 *  Dipakai kartu Celengan di list view supaya progres digambar sebagai
 *  TANAMAN (kanon PRD 2C.3 — SVG statis di list), bukan progress bar generik. */
export const PLANT_STAGE_INDEX: Record<PlantStage, 1 | 2 | 3 | 4> = {
  seed: 1,
  sprout: 2,
  plant: 3,
  flower: 4,
  bloom: 4,
}

/** progress → tahap tanaman: tiap setoran "menumbuhkan" tanamannya */
export function plantStageFrom(current: number, target: number): PlantStage {
  const pct = target > 0 ? (current / target) * 100 : 0
  if (pct >= 100) return 'bloom'
  if (pct >= 75) return 'flower'
  if (pct >= 50) return 'plant'
  if (pct >= 25) return 'sprout'
  return 'seed'
}

/* ── SUMBER DOMPET untuk setoran (mock — disamakan dengan halaman Dompet) ───
   Tile berwarna brand supaya pemilih dompet terasa hidup, bukan dropdown abu-abu. */
export const WALLET_SOURCES: { id: string; name: string; kind: string; tile: string; dot: string }[] = [
  { id: 'bca', name: 'BCA', kind: 'Bank', tile: 'bg-blue-50 text-blue-600 ring-blue-500/15', dot: 'bg-blue-500' },
  { id: 'gopay', name: 'GoPay', kind: 'E-Wallet', tile: 'bg-teal-50 text-teal-600 ring-teal-500/15', dot: 'bg-teal-500' },
  { id: 'tunai', name: 'Tunai', kind: 'Uang cash', tile: 'bg-amber-50 text-amber-600 ring-amber-500/15', dot: 'bg-amber-500' },
]

/* ── COPY TETAP (social proof & nudge) ───────────────────────────────────── */
export const SOCIAL_PROOF_COPY =
  '💡 78% member CatetInd yang set target bulanan berhasil hemat lebih banyak.'

export const NUDGE_COPY =
  'Celengan kamu belum nambah bulan ini. Gapapa, mulai lagi kapan aja ya — kecil-kecilan juga gak masalah 🤗'

/* ── HELPER MURNI (dipakai komponen Zona A & B) ──────────────────────────── */

/** nominal dengan privasi: `Rp 25.000` atau `Rp •••••••` */
export function maskNominal(value: number, masked: boolean): string {
  return masked ? MASKED_AMOUNT : formatIDR(value)
}

/** label "terpakai / limit" — saat privasi aktif cukup satu topeng (anti-berisik) */
export function ratioLabel(part: number, whole: number, masked: boolean): string {
  if (masked) return MASKED_AMOUNT
  return `${formatIDR(part)} / ${formatIDR(whole)}`
}

/** persentase terpakai (bisa > 100 kalau over budget) */
export function spentPercent(budget: BudgetItem): number {
  if (budget.limit <= 0) return 0
  return (budget.spent / budget.limit) * 100
}

/** posisi garis pacing ideal (%) — tempat pengeluaran SEHARUSNYA berada hari ini */
export function pacingPercent(currentDay = CURRENT_DAY, daysInMonth = DAYS_IN_MONTH): number {
  if (daysInMonth <= 0) return 0
  return Math.min(100, (currentDay / daysInMonth) * 100)
}

/** hex warna bar progres kategori — tiga warna kanon Daily HUD (PRD 2B.2) */
export const PACING_HEX: Record<PacingTone, string> = {
  sage: '#a3b18a',
  amber: '#dda15e',
  terracotta: '#bc6c25',
}

/** warna + copy status pacing sebuah kategori (nominal ikut mode privasi) */
export function pacingOf(
  budget: BudgetItem,
  masked = false,
): {
  tone: PacingTone
  percent: number
  copy: string
  /** true = pengeluaran lebih cepat dari pacing ideal hari ini */
  fasterThanPacing: boolean
} {
  const percent = spentPercent(budget)
  const tone: PacingTone = percent >= 100 ? 'terracotta' : percent >= 75 ? 'amber' : 'sage'
  const sisa = Math.max(0, budget.limit - budget.spent)
  const copy =
    tone === 'sage'
      ? 'Masih banyak ruang! 🌿'
      : tone === 'amber'
        ? `Pelan-pelan ya, sisa tinggal ${maskNominal(sisa, masked)} 🌤️`
        : 'Gapapa, besok kita atur ulang bareng! 🌱'
  return { tone, percent, copy, fasterThanPacing: percent > pacingPercent() }
}

/** total sisa (surplus) budget yang belum terpakai habis — inti fitur Sapu Bersih */
export function totalSurplus(budgets: BudgetItem[]): number {
  return budgets.reduce((sum, b) => sum + Math.max(0, b.limit - b.spent), 0)
}

/** budget yang masih punya sisa (kandidat disapu) */
export function surplusBudgets(budgets: BudgetItem[]): BudgetItem[] {
  return budgets.filter((b) => b.limit - b.spent > 0)
}

/** index bulan dari `YYYY-MM-DD` — dipakai untuk hitung bulan tersisa */
function monthIndex(iso: string): number {
  const [year, month] = iso.split('-').map(Number)
  return year * 12 + (month - 1)
}

/** bulan tersisa sampai deadline (deadline bulan ini dihitung 1 bulan) */
export function monthsUntil(deadlineISO: string, fromISO: string = TODAY_ISO): number {
  return Math.max(1, monthIndex(deadlineISO) - monthIndex(fromISO))
}

/** auto-calculation PRD 2C.3: (target - current) / bulan tersisa */
export function monthlyNeeded(
  target: number,
  current: number,
  deadlineISO: string,
  fromISO: string = TODAY_ISO,
): number {
  const months = monthsUntil(deadlineISO, fromISO)
  return Math.max(0, Math.ceil((target - current) / months))
}

export function fundPercent(fund: SinkingFundItem): number {
  if (fund.target <= 0) return 0
  return Math.min(100, (fund.current / fund.target) * 100)
}

/** `2026-12-15` → `15 Des 2026` (UTC dipatok supaya tidak bergeser karena timezone) */
export function formatDeadline(iso: string): string {
  const [year, month, day] = iso.split('-').map(Number)
  return new Intl.DateTimeFormat('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(Date.UTC(year, month - 1, day)))
}
