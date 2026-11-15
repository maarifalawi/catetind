import { normalizeNotifPrefs } from '@/lib/notification-prefs-core'
import type { CronMode, CronSkipped, ReminderKind } from './types'

/* ── PERENCANA PENGINGAT OTOMATIS (MURNI — TANPA I/O) ────────────────────────
   Semua keputusan "siapa dapat pesan apa hari ini" hidup di sini, tanpa
   menyentuh database, jaringan, atau `web-push`. Akibatnya aturan yang paling
   mahal kalau salah — prioritas pesan & anti-spam — bisa diuji langsung
   (`lib/push/plan.test.ts`) tanpa server.

   TIGA PESAN, URUT PRIORITAS (paket ini):

     1. `bills`  — tagihan jatuh tempo H-3 … hari H. Prioritas TERTINGGI: kalau
                   ada tagihan mendesak, sapaan harian TIDAK dikirim (satu push
                   per hari, dan uang yang harus disisihkan lebih penting).
     2. `daily`  — sapaan jatah jajan pagi (08:00 WIB), hanya bila tidak ada
                   tagihan mendesak hari itu.
     3. `weekly` — rekap santai Minggu malam (20:00 WIB).

   ANTI-SPAM: satu push per user per HARI KALENDER WIB. Stempelnya
   `user_settings.push_state.lastSentAt` (ditulis `lib/push/cron.ts`), jadi cron
   yang terulang (retry Vercel, tombol "Jalankan sekarang" ditekan dua kali)
   tidak pernah mengirim pesan ganda.

   Bentrok yang diselesaikan dengan sengaja: rekap mingguan jatuh pada Minggu
   malam, sedangkan sapaan pagi juga berjalan Minggu pagi. Kalau keduanya
   dibiarkan, aturan 1-push/hari akan MEMBUANG rekap mingguan setiap pekan.
   Karena itu jadwal pagi Minggu MELEWATKAN user yang menyalakan rekap mingguan
   (slot harinya disisakan untuk pesan 20:00) — kecuali ada tagihan mendesak,
   yang tetap dikirim pagi karena prioritasnya lebih tinggi.

   ZONA WAKTU: seluruh perhitungan memakai WIB (UTC+7) yang dihitung eksplisit
   dari `Date` UTC. Server Vercel berjalan di UTC, dan `new Date().getDay()`
   akan berbohong selama 7 jam setiap hari — itu yang membuat pengingat "pagi"
   bisa terkirim tengah malam.

   BATAS YANG DISEBUT APA ADANYA: tabel `bills` di server tidak menyimpan status
   "sudah dibayar bulan ini" (status itu diturunkan dari baris ledger di
   perangkat). Jadi filter "belum dibayar" di sini memakai kolom `active` —
   artinya tagihan yang SUDAH dibayar lewat app tetap bisa ikut diingatkan
   selama baris `bills`-nya masih aktif. Ini dicatat di laporan paket.
   ────────────────────────────────────────────────────────────────────────── */

/** WIB = UTC+7, tanpa DST — konversi cukup satu penjumlahan */
export const WIB_OFFSET_MINUTES = 7 * 60

/** jendela pengingat bawaan: H-3 sampai hari H */
export const DUE_WINDOW_DAYS = 3

/** batas atas pengingat yang boleh diminta satu tagihan (H-7) */
export const MAX_REMIND_DAYS = 7

/** tujuan tap notifikasi — selalu path internal (`sw.js` menolak selain ini) */
export const REMINDER_URL: Record<ReminderKind, string> = {
  bills: '/bills',
  daily: '/app',
  weekly: '/history',
}

/**
 * `tag` notifikasi: pesan sejenis SALING MEMPERBARUI di bilah notifikasi HP,
 * jadi tidak menumpuk liar saat cron berjalan beberapa hari berturut-turut.
 */
export const REMINDER_TAG: Record<ReminderKind, string> = {
  bills: 'catetind-bills',
  daily: 'catetind-daily',
  weekly: 'catetind-weekly',
}

export interface JakartaNow {
  /** tanggal WIB `YYYY-MM-DD` — kunci anti-spam 1-push/hari */
  dayKey: string
  year: number
  /** 1–12 */
  month: number
  /** 1–31 */
  day: number
  /** 0 = Minggu … 6 = Sabtu (WIB) */
  weekday: number
  hour: number
  minute: number
}

/** "sekarang" menurut jam dinding Jakarta, dihitung dari `Date` UTC */
export function jakartaNow(now: Date): JakartaNow {
  const shifted = new Date(now.getTime() + WIB_OFFSET_MINUTES * 60_000)
  return {
    dayKey: shifted.toISOString().slice(0, 10),
    year: shifted.getUTCFullYear(),
    month: shifted.getUTCMonth() + 1,
    day: shifted.getUTCDate(),
    weekday: shifted.getUTCDay(),
    hour: shifted.getUTCHours(),
    minute: shifted.getUTCMinutes(),
  }
}

/** jumlah hari pada bulan (28/29/30/31) — `Date.UTC(y, m, 0)` = hari terakhir */
export function daysInMonth(year: number, month: number): number {
  if (!Number.isFinite(year) || !Number.isFinite(month) || month < 1 || month > 12) return 31
  return new Date(Date.UTC(year, month, 0)).getUTCDate()
}

/**
 * Tanggal jatuh tempo YANG BERLAKU bulan ini.
 *
 * Aturannya SAMA dengan `effectiveDueDay()` di `lib/data/bills.ts` (paket 103):
 * tagihan tanggal 29/30/31 tidak boleh "menghilang" di bulan yang lebih pendek,
 * jadi tanggalnya di-clamp ke hari terakhir bulan itu (31 → 30 di April,
 * 31 → 28/29 di Februari).
 */
export function dueDayThisMonth(dueDay: number, totalDays: number): number {
  const safeDay = Math.round(Number.isFinite(dueDay) ? dueDay : 1)
  return Math.min(Math.max(1, safeDay), Math.max(1, totalDays))
}

/** jarak (hari) ke jatuh tempo bulan ini; negatif = sudah lewat */
export function daysUntilDue(dueDay: number, at: JakartaNow): number {
  return dueDayThisMonth(dueDay, daysInMonth(at.year, at.month)) - at.day
}

/** `remind_days` → jendela pengingat; 0 = user minta jangan diingatkan */
export function reminderWindowDays(reminderDays: number): number {
  const days = Math.round(Number.isFinite(reminderDays) ? reminderDays : 0)
  if (days <= 0) return 0
  return Math.min(MAX_REMIND_DAYS, days)
}

/** nominal notifikasi — `Rp 54.000` (id-ID), tanpa desimal */
export function formatRupiah(amount: number): string {
  const safe = Math.max(0, Math.round(Number.isFinite(amount) ? amount : 0))
  return `Rp${safe.toLocaleString('id-ID')}`
}


/* ── COPY PESAN (gaya bahasa bestie, ramah, tidak menakut-nakuti) ───────────
   String user-facing tidak ditulis di JSX/route: semuanya di sini supaya bisa
   diuji dan diubah tanpa menyentuh logika pengiriman. */
export const REMINDER_COPY = {
  bills: {
    title: 'Tagihan udah deket nih ⚡',
    /** `when` = "jatuh tempo hari ini" / "besok" / "3 hari lagi" */
    body: (name: string, amount: string, when: string, others: number) =>
      `${name}${amount} ${when}. Yuk disisihin biar pikiran tenang 🧩` +
      (others > 0 ? ` Plus ${others} tagihan lain yang juga nunggu.` : ''),
  },
  daily: {
    title: 'Pagi bestie! ☀️',
    body: 'Jatah jajan aman hari ini udah siap dicek, yuk intip bentar biar hari ini tenang.',
  },
  weekly: {
    title: 'Rekap pekan ini udah jadi 📊',
    body: 'Pekan ini kamu udah rajin nyatet, keren banget! 🧩 Pekan depan semangat lagi ya, sisihkan dikit buat diri sendiri.',
  },
} as const

/* ── MASUKAN PERENCANAAN ─────────────────────────────────────────────────── */

/** satu baris tabel `bills` yang relevan bagi cron */
export interface BillInput {
  userId: string
  name: string
  amount: number
  /** tanggal jatuh tempo 1–31 */
  dueDay: number
  /** `remind_days` — 0 = jangan diingatkan */
  reminderDays: number
  active: boolean
}

/** satu user yang PUNYA perangkat terdaftar (kalau tidak ada, tidak ada tujuan) */
export interface ReminderUser {
  userId: string
  /** jumlah perangkat (subscription) milik user */
  devices: number
  /** jsonb `user_settings.notif_prefs` (boleh kosong/asing) */
  notifPrefs: unknown
  /** stempel kirim terakhir (ISO) — `null` = belum pernah */
  lastSentAt: string | null
}

export interface PlannedPush {
  userId: string
  kind: ReminderKind
  title: string
  body: string
  /** path internal tujuan tap notifikasi */
  url: string
  tag: string
}

export interface ReminderPlan {
  mode: CronMode
  at: JakartaNow
  pushes: PlannedPush[]
  skips: CronSkipped
}

/* ── INTI PERENCANAAN ────────────────────────────────────────────────────── */

/** tagihan yang jatuh tempo dalam jendela pengingatnya, urut paling mendesak */
function dueSoonBills(
  bills: readonly BillInput[],
  at: JakartaNow,
): { bill: BillInput; days: number }[] {
  const due: { bill: BillInput; days: number }[] = []
  for (const bill of bills) {
    if (!bill.active) continue
    const window = reminderWindowDays(bill.reminderDays)
    if (window === 0) continue
    const days = daysUntilDue(bill.dueDay, at)
    /* yang lewat jatuh tempo (negatif) bukan urusan pengingat ini: yang dikirim
       "bentar lagi", bukan tagihan yang sudah telat berhari-hari */
    if (days < 0 || days > window) continue
    due.push({ bill, days })
  }
  return due.sort((a, b) => a.days - b.days || a.bill.name.localeCompare(b.bill.name))
}

/** "hari ini" / "besok" / "3 hari lagi" — dipakai di badan pesan tagihan */
function duePhrase(days: number): string {
  if (days <= 0) return 'jatuh tempo hari ini'
  if (days === 1) return 'jatuh tempo besok'
  return `jatuh tempo ${days} hari lagi`
}

function billsPush(userId: string, due: { bill: BillInput; days: number }[]): PlannedPush {
  const nearest = due[0]
  const amount = nearest.bill.amount > 0 ? ` (${formatRupiah(nearest.bill.amount)})` : ''
  return {
    userId,
    kind: 'bills',
    title: REMINDER_COPY.bills.title,
    body: REMINDER_COPY.bills.body(nearest.bill.name, amount, duePhrase(nearest.days), due.length - 1),
    url: REMINDER_URL.bills,
    tag: REMINDER_TAG.bills,
  }
}

/**
 * Hitung pesan yang layak dikirim untuk satu eksekusi cron.
 *
 * Fungsi ini deterministik: masukan yang sama → keluaran yang sama, tanpa jam
 * sistem maupun database. Semua stempel waktu datang dari `now`.
 */
export function planReminders({
  now,
  mode,
  users,
  bills,
}: {
  now: Date
  mode: CronMode
  users: readonly ReminderUser[]
  bills: readonly BillInput[]
}): ReminderPlan {
  const at = jakartaNow(now)

  const billsByUser = new Map<string, BillInput[]>()
  for (const bill of bills) {
    const list = billsByUser.get(bill.userId)
    if (list) list.push(bill)
    else billsByUser.set(bill.userId, [bill])
  }

  const pushes: PlannedPush[] = []
  const skips: CronSkipped = { noDevice: 0, prefOff: 0, antiSpam: 0, reservedWeekly: 0 }

  for (const user of users) {
    if (user.devices <= 0) {
      skips.noDevice++
      continue
    }

    /* satu push per user per hari kalender WIB — apa pun hasil perencanaan di
       bawah, stempel ini yang menahan kiriman ganda saat cron terulang */
    if (alreadySentToday(user.lastSentAt, at)) {
      skips.antiSpam++
      continue
    }

    const prefs = normalizeNotifPrefs(user.notifPrefs)
    const due = dueSoonBills(billsByUser.get(user.userId) ?? [], at)

    /* 1. tagihan jatuh tempo = prioritas tertinggi, mendahului sapaan harian */
    if (due.length > 0 && prefs['tagihan-jatuh-tempo']) {
      pushes.push(billsPush(user.userId, due))
      continue
    }

    if (mode === 'weekly') {
      /* 3. rekap santai Minggu malam */
      if (prefs['laporan-mingguan']) {
        pushes.push({
          userId: user.userId,
          kind: 'weekly',
          title: REMINDER_COPY.weekly.title,
          body: REMINDER_COPY.weekly.body,
          url: REMINDER_URL.weekly,
          tag: REMINDER_TAG.weekly,
        })
        continue
      }
      skips.prefOff++
      continue
    }

    /* Minggu pagi: sisakan slot harinya untuk rekap 20:00 bagi yang menyalakan
       rekap mingguan (kalau tidak, aturan 1-push/hari membuang rekapnya). */
    if (at.weekday === 0 && prefs['laporan-mingguan']) {
      skips.reservedWeekly++
      continue
    }

    /* 2. sapaan jatah jajan pagi */
    if (prefs['reminder-harian']) {
      pushes.push({
        userId: user.userId,
        kind: 'daily',
        title: REMINDER_COPY.daily.title,
        body: REMINDER_COPY.daily.body,
        url: REMINDER_URL.daily,
        tag: REMINDER_TAG.daily,
      })
      continue
    }

    skips.prefOff++
  }

  return { mode, at, pushes, skips }
}

/* ── ANTI-SPAM ───────────────────────────────────────────────────────────── */

/**
 * True kalau user SUDAH menerima push pada hari kalender WIB yang sama.
 *
 * Stempel yang tidak bisa dibaca (null/NaN) dianggap "belum pernah" — lebih baik
 * satu pesan terkirim daripada pengingat hilang karena stempel rusak.
 */
export function alreadySentToday(lastSentAt: string | null | undefined, at: JakartaNow): boolean {
  if (!lastSentAt) return false
  const time = Date.parse(lastSentAt)
  if (!Number.isFinite(time)) return false
  return jakartaNow(new Date(time)).dayKey === at.dayKey
}

/**
 * Mode yang paling masuk akal saat pemanggil tidak menentukan mode (tombol
 * "Jalankan sekarang"): Minggu sore/malam = rekap pekan, selain itu pagi.
 */
export function resolveCronMode(raw: unknown, now: Date = new Date()): CronMode {
  if (raw === 'morning' || raw === 'weekly') return raw
  const at = jakartaNow(now)
  return at.weekday === 0 && at.hour >= 17 ? 'weekly' : 'morning'
}
