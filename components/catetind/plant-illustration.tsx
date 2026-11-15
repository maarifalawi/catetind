import { cn } from '@/lib/utils'
import { PLANT_SLEEP_COPY } from '@/lib/data/upgrade'

/* ── PUZZLE KEUANGAN — METAFORA PENGGANTI TANAMAN (revisi pemilik produk) ────
   Dulu komponen ini menggambar tanaman yang tumbuh dari benih → berbunga.
   Sekarang yang digambar adalah PAPAN PUZZLE 4×3 = 12 KEPINGAN: tiap kemajuan
   memasang satu keping, dan "puzzle lengkap" = target tercapai.

   Nama file & nama ekspor SENGAJA dipertahankan (`PlantIllustration`,
   `PlantStage`, `plant-*`) supaya seluruh pemanggil (Dashboard, Tabungan Impian,
   detail celengan, rekap mingguan/bulanan, perayaan, kartu share, 404) tidak
   perlu diubah sekaligus — yang berubah adalah ISI & bahasanya. Kalau nanti mau
   rename total ke `Puzzle*`, itu pekerjaan terpisah yang mekanis.

   TIGA KEPUTUSAN TEKNIS:

   1. BENTUK KEPINGAN DETERMINISTIK. Tonjolan/lekuk tiap sisi internal diambil
      dari tabel konstanta (`V_SIGN`/`H_SIGN`), BUKAN `Math.random()`. Server dan
      browser harus menghasilkan `d` yang identik, kalau tidak React melaporkan
      hydration mismatch. Koordinat dibulatkan 3 desimal karena alasan yang sama.
   2. TANPA FILE ASET. Semua kepingan digambar dari satu fungsi `edgePath()`
      (kurva jigsaw klasik) + `piecePath()`; tidak ada `<image>` maupun SVG
      eksternal, jadi tidak ada request tambahan.
   3. TETAP TURUNAN, BUKAN ANGKA PAJANGAN. `progress` (persen celengan) yang
      menentukan jumlah kepingan; `stage` hanya dipakai saat pemanggil tidak
      punya persen (mis. rekap mingguan/bulanan).

   STATE (analog state tanaman lama, supaya tidak ada perilaku yang hilang):
     · `wilted`   = progres rendah (dulu "tanaman layu") → kepingan terpasang
                    dipudarkan & kontrasnya diturunkan;
     · `sleeping` = paket belum aktif ("puzzle menunggu") → grayscale + garis
                    putus-putus, TANPA nada menghukum (PRD 4542).
   ────────────────────────────────────────────────────────────────────────── */

/* tahap kepingan puzzle — kanon Domain 3B */
export type PlantStage = 1 | 2 | 3 | 4

export const STAGE_NAMES: Record<PlantStage, string> = {
  1: 'Awal tersusun',
  2: 'Setengah jalan',
  3: 'Hampir lengkap',
  4: 'Puzzle lengkap',
}

/* ── GEOMETRI PAPAN ─────────────────────────────────────────────────────────
   Grid 4×3 (12 keping) — SAMA dengan referensi pemilik produk. Ukuran sel 60
   dipilih supaya `viewBox` tetap kecil (240×180) tetapi kurvanya tetap mulus
   saat diperbesar di kartu Dashboard. */
export const PUZZLE_COLS = 4
export const PUZZLE_ROWS = 3
export const PUZZLE_TOTAL = PUZZLE_COLS * PUZZLE_ROWS
const CELL = 60
const BOARD_W = PUZZLE_COLS * CELL
const BOARD_H = PUZZLE_ROWS * CELL

/** arah tonjolan tiap sisi INTERNAL vertikal: +1 = menonjol ke kanan */
const V_SIGN: ReadonlyArray<ReadonlyArray<1 | -1>> = [
  [1, -1, 1],
  [-1, 1, -1],
  [1, 1, -1],
]

/** arah tonjolan tiap sisi INTERNAL horizontal: +1 = menonjol ke bawah */
const H_SIGN: ReadonlyArray<ReadonlyArray<1 | -1>> = [
  [1, -1, 1, -1],
  [-1, 1, -1, 1],
]

/** jumlah kepingan yang terpasang untuk tiap tahap (3 · 6 · 9 · 12) */
export function piecesForStage(stage: PlantStage): number {
  return Math.min(PUZZLE_TOTAL, stage * 3)
}

/** persen progres (0–100) → jumlah kepingan terpasang, dibulatkan */
export function piecesForProgress(percent: number): number {
  const clamped = Math.min(100, Math.max(0, percent))
  return Math.round((clamped / 100) * PUZZLE_TOTAL)
}

/** bulatkan ke 3 desimal: angka panjang bikin `d` berbeda antar-render */
function r3(value: number): number {
  return Math.round(value * 1000) / 1000
}

/**
 * Satu sisi kepingan: garis lurus (sisi tepi papan) atau kurva jigsaw.
 *
 * `sign` = arah tonjolan terhadap arah gambar: `1` menonjol KELUAR, `-1` masuk
 * (lekuk), `0` lurus. Normal keluar dihitung `(uy, -ux)` karena semua kepingan
 * digambar searah jarum jam.
 */
function edgePath(
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  sign: 1 | -1 | 0,
): string {
  if (sign === 0) return `L ${r3(x1)} ${r3(y1)}`

  const dx = x1 - x0
  const dy = y1 - y0
  const len = Math.hypot(dx, dy)
  const ux = dx / len
  const uy = dy / len
  const nx = uy * sign
  const ny = -ux * sign

  /** titik pada sisi: `t` = posisi memanjang (0–1), `n` = tinggi tonjolan */
  const at = (t: number, n: number) =>
    `${r3(x0 + ux * len * t + nx * len * n)} ${r3(y0 + uy * len * t + ny * len * n)}`

  /* kurva jigsaw klasik: leher sempit → kepala melebar → leher lagi */
  return [
    `L ${at(0.34, 0)}`,
    `C ${at(0.42, 0.02)} ${at(0.33, 0.1)} ${at(0.38, 0.16)}`,
    `C ${at(0.44, 0.24)} ${at(0.56, 0.24)} ${at(0.62, 0.16)}`,
    `C ${at(0.67, 0.1)} ${at(0.58, 0.02)} ${at(0.66, 0)}`,
    `L ${r3(x1)} ${r3(y1)}`,
  ].join(' ')
}

/** path tertutup satu kepingan (baris, kolom) — searah jarum jam dari kiri-atas */
function piecePath(row: number, col: number): string {
  const x0 = col * CELL
  const y0 = row * CELL
  const x1 = x0 + CELL
  const y1 = y0 + CELL

  /* sisi papan (tepi luar) selalu lurus; sisi internal memakai tonjolan yang
     SAMA dengan kepingan tetangganya, hanya arahnya dibalik. */
  const top: 1 | -1 | 0 = row === 0 ? 0 : ((-H_SIGN[row - 1][col]) as 1 | -1)
  const right: 1 | -1 | 0 = col === PUZZLE_COLS - 1 ? 0 : V_SIGN[row][col]
  const bottom: 1 | -1 | 0 = row === PUZZLE_ROWS - 1 ? 0 : H_SIGN[row][col]
  const left: 1 | -1 | 0 = col === 0 ? 0 : ((-V_SIGN[row][col - 1]) as 1 | -1)

  return [
    `M ${x0} ${y0}`,
    edgePath(x0, y0, x1, y0, top),
    edgePath(x1, y0, x1, y1, right),
    edgePath(x1, y1, x0, y1, bottom),
    edgePath(x0, y1, x0, y0, left),
    'Z',
  ].join(' ')
}

/**
 * Papan puzzle — dipakai di SEMUA tempat yang dulu memakai ilustrasi tanaman.
 *
 * `progress` OPSIONAL (0–100). Tanpa `progress`, jumlah kepingan mengikuti
 * `stage` (3/6/9/12). Dengan `progress`, kepingan bertambah tiap ~8%, jadi
 * celengan 20% dan 80% benar-benar terlihat berbeda — bukan empat wujud diskret.
 */
export function PlantIllustration({
  stage,
  progress,
  wilted = false,
  sleeping = false,
  className,
}: {
  stage: PlantStage
  /** progres celengan 0–100 (opsional) — menentukan jumlah kepingan */
  progress?: number
  wilted?: boolean
  /** true = mode "menunggu paket aktif" (tanpa angka apa pun) */
  sleeping?: boolean
  className?: string
}) {
  /* ── SAPU BERSIH SVG HIASAN (keputusan produk, sesi 3) ───────────────────────
     Ilustrasi tanaman/puzzle adalah HIASAN: tidak bisa ditekan, tidak dibaca
     sebagai angka, dan dulu membawa kalimat gamifikasi yang dilarang. Seluruh
     bentuk SVG-nya dicabut. API komponen (nama, props) dipertahankan supaya
     10+ pemanggil tidak perlu diubah dan tata letak tetap diatur pemanggil. */
  void stage
  void progress
  void wilted
  void sleeping
  void className
  return null
}
