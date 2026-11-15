/* ── TIPE PENGINGAT OTOMATIS (DIPAKAI SERVER & KARTU ADMIN) ──────────────────
   File ini SENGAJA hanya berisi tipe: tidak ada impor runtime, jadi aman
   di-`import type` dari komponen klien (kartu kontrol /admin) maupun dari cron
   (yang menarik `web-push` + kunci peran server). Kalau bentuk laporan cron
   ditulis dua kali, angka di layar admin bisa berbeda dari yang benar-benar
   dikirim — satu sumber, di sini.
   ────────────────────────────────────────────────────────────────────────── */

/** tiga pesan yang boleh dikirim cron, urut prioritas */
export type ReminderKind = 'bills' | 'daily' | 'weekly'

/**
 * Jadwal yang sedang dijalankan:
 *  · `morning` → 08:00 WIB (tagihan mendesak / sapaan jatah jajan)
 *  · `weekly`  → Minggu 20:00 WIB (rekap santai penutup pekan)
 */
export type CronMode = 'morning' | 'weekly'

/** alasan user TIDAK dikirimi pesan — dilaporkan apa adanya, tidak disembunyikan */
export interface CronSkipped {
  /** tidak punya satu pun perangkat terdaftar (belum subscribe push) */
  noDevice: number
  /** semua saklar yang relevan dimatikan user */
  prefOff: number
  /** sudah menerima push lain pada hari kalender WIB yang sama (anti-spam) */
  antiSpam: number
  /** slot harinya sengaja disisakan untuk rekap Minggu malam */
  reservedWeekly: number
}

/** satu baris rencana yang ikut ditampilkan di laporan / mode simulasi */
export interface PlannedPushSummary {
  userId: string
  kind: ReminderKind
  title: string
  /** jumlah perangkat user ini yang jadi target */
  devices: number
}

/** hasil satu eksekusi cron (juga bentuk balasan endpoint & kartu admin) */
export interface CronReport {
  ok: boolean
  mode: CronMode
  dryRun: boolean
  /** ISO waktu eksekusi */
  ranAt: string
  /** tanggal WIB `YYYY-MM-DD` yang dipakai sebagai kunci anti-spam */
  dayKey: string
  /** jumlah user yang dapat pesan (belum dikali jumlah perangkat) */
  users: number
  /** jumlah perangkat (subscription) yang jadi target */
  targets: number
  sent: number
  failed: number
  dropped: number
  skipped: CronSkipped
  byKind: Record<ReminderKind, number>
  /** rencana pesan (dibatasi) — dipakai mode simulasi & ringkasan hasil */
  planned: PlannedPushSummary[]
  /** keterangan jujur saat ada bagian yang tidak bisa dijalankan */
  note?: string
  /** pesan kegagalan tingkat eksekusi (bukan per perangkat) */
  error?: string
}

/** riwayat eksekusi di tabel `push_cron_runs` (untuk "Ringkasan Hasil Terakhir") */
export interface CronRunRow {
  id: string
  ranAt: string
  mode: CronMode
  dryRun: boolean
  users: number
  targets: number
  sent: number
  failed: number
  dropped: number
  skipped: CronSkipped
  byKind: Record<ReminderKind, number>
  note: string | null
}
