import type { SupabaseClient } from '@supabase/supabase-js'
import type { PushSubscription } from 'web-push'
import webpush from 'web-push'
import { adminSupabase } from '@/lib/supabase/admin'
import { deliverPushes, pushPayload, type OutboundPush } from './deliver'
import { jakartaNow, planReminders, resolveCronMode, type BillInput, type ReminderUser } from './plan'
import type { CronMode, CronReport, CronRunRow, CronSkipped, ReminderKind } from './types'

/* ── MESIN CRON PENGINGAT (SERVER SAJA) ──────────────────────────────────────
   Menyambung tiga bagian yang sudah diuji sendiri-sendiri:

     `plan.ts`    → memutuskan siapa dapat pesan apa (murni, tanpa I/O)
     `deliver.ts` → mengirim per kelompok paralel + menandai perangkat mati
     file ini     → membaca data lintas user, menulis stempel anti-spam, dan
                    menyimpan riwayat eksekusi

   Kenapa memakai kunci peran server: cron tidak punya sesi user, sedangkan RLS
   `push_subscriptions.user_id = auth.uid()` membuat seluruh baris tidak terbaca
   tanpa sesi. Kunci ini MEM-BYPASS RLS, jadi file ini hanya boleh diimpor oleh
   route handler yang sudah memverifikasi rahasia cron
   (`app/api/cron/reminders`) atau sesi admin (`app/api/admin/push-cron`).

   Batas ukuran sengaja dipasang: satu eksekusi membaca maksimal
   `MAX_SUBSCRIPTIONS` langganan dan mengirim maksimal `MAX_DELIVERIES` push.
   Kalau jumlahnya menyentuh batas, laporan menyebutkannya (`note`) — bukan
   diam-diam mengirim sebagian lalu terlihat "sukses".
   ────────────────────────────────────────────────────────────────────────── */

/** kelompok paralel per gelombang — lihat alasan di `deliver.ts` */
export const PUSH_BATCH_SIZE = 10

/** batas baca per eksekusi (perangkat & tagihan) */
const MAX_SUBSCRIPTIONS = 2000
const MAX_BILLS = 5000

/** jumlah `user_id` per query preferensi (URL PostgREST tidak boleh kepanjangan) */
const SETTINGS_CHUNK = 200

/** batas kirim per eksekusi — menjaga fungsi serverless di bawah batas waktunya */
const MAX_DELIVERIES = 500

/** TTL push: 6 jam — pengingat pagi tidak berguna kalau baru muncul malam */
const PUSH_TTL_SECONDS = 6 * 60 * 60

/** berapa rencana pesan yang ikut dikembalikan (untuk laporan & mode simulasi) */
const MAX_PLANNED_IN_REPORT = 20

/* ── VAPID ───────────────────────────────────────────────────────────────── */

interface VapidKeys {
  publicKey: string
  privateKey: string
  subject: string
}

/** dibaca SAAT DIPANGGIL supaya test/env yang berubah langsung terpakai */
function vapidEnv(): VapidKeys {
  return {
    publicKey: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? '',
    privateKey: process.env.VAPID_PRIVATE_KEY ?? '',
    subject: process.env.VAPID_SUBJECT ?? 'mailto:admin@catetind.example',
  }
}

let vapidFingerprint = ''

/** `null` = siap; string = pesan galat yang dilaporkan apa adanya */
function ensureVapid(): string | null {
  const keys = vapidEnv()
  if (!keys.publicKey || !keys.privateKey) {
    return 'Kunci VAPID belum di-set di server (NEXT_PUBLIC_VAPID_PUBLIC_KEY & VAPID_PRIVATE_KEY) — push tidak bisa dikirim.'
  }
  const fingerprint = `${keys.subject}|${keys.publicKey}`
  if (fingerprint !== vapidFingerprint) {
    webpush.setVapidDetails(keys.subject, keys.publicKey, keys.privateKey)
    vapidFingerprint = fingerprint
  }
  return null
}

/* ── DATA YANG DIBACA ────────────────────────────────────────────────────── */

interface SubscriptionRow {
  endpoint?: string | null
  user_id?: string | null
  subscription?: PushSubscription | null
}

interface SettingsRow {
  user_id?: string | null
  notif_prefs?: unknown
  push_state?: unknown
}

interface BillRow {
  user_id?: string | null
  name?: string | null
  amount?: number | string | null
  due_day?: number | string | null
  active?: boolean | null
  remind_days?: number | string | null
}

interface Device {
  endpoint: string
  subscription: PushSubscription
}

interface CronData {
  devices: Map<string, Device[]>
  users: ReminderUser[]
  bills: BillInput[]
  /** true = salah satu tabel menyentuh batas baca (angka bisa terpotong) */
  truncated: boolean
}

/** satu kiriman + objek langganan yang dibutuhkan `web-push` */
interface CronDelivery extends OutboundPush {
  subscription: PushSubscription
}

function intOf(value: unknown): number {
  const parsed = typeof value === 'number' ? value : Number(value)
  return Number.isFinite(parsed) ? Math.round(parsed) : 0
}

/** stempel kirim terakhir dari jsonb `push_state` */
function readLastSentAt(state: unknown): string | null {
  if (!state || typeof state !== 'object') return null
  const raw = (state as { lastSentAt?: unknown }).lastSentAt
  return typeof raw === 'string' ? raw : null
}

/**
 * Preferensi + stempel untuk user yang benar-benar punya perangkat.
 *
 * Dibaca per potongan `SETTINGS_CHUNK` (bukan satu query raksasa: URL PostgREST
 * dengan ribuan `in` nilai bisa ditolak) dan bukan `limit` global (lihat
 * penjelasan di `loadCronData`). Kegagalan satu potongan tidak menghentikan yang
 * lain — user yang barisnya tidak terbaca memakai default "semua menyala",
 * sama seperti perangkat baru.
 */
async function loadSettings(
  client: SupabaseClient,
  userIds: readonly string[],
): Promise<SettingsRow[]> {
  const rows: SettingsRow[] = []
  for (let index = 0; index < userIds.length; index += SETTINGS_CHUNK) {
    const slice = userIds.slice(index, index + SETTINGS_CHUNK)
    const { data, error } = await client
      .from('user_settings')
      .select('user_id,notif_prefs,push_state')
      .in('user_id', slice)
    if (error) break
    rows.push(...((data ?? []) as SettingsRow[]))
  }
  return rows
}

/**
 * Baca langganan + preferensi + tagihan untuk SEMUA user.
 *
 * Bukan satu query per user: N+1 query untuk ribuan user adalah penyebab
 * pertama cron timeout, sebelum urusan pengiriman.
 *
 * `user_settings` sengaja dibaca SETELAH langganan diketahui, dengan
 * `user_id in (…)` per potongan `SETTINGS_CHUNK`. Kalau dibaca dengan `limit`
 * global, akun yang barisnya jatuh di luar batas akan memakai nilai default
 * (semua menyala) — artinya user yang MEMATIKAN pengingat bisa tetap dikirimi.
 * Preferensi yang memang tidak terbaca tetap jatuh ke default, dan itu
 * disebutkan sebagai batas di laporan (bukan diam-diam).
 */
async function loadCronData(client: SupabaseClient): Promise<CronData> {
  const [subscriptions, bills] = await Promise.all([
    client
      .from('push_subscriptions')
      .select('endpoint,user_id,subscription')
      .limit(MAX_SUBSCRIPTIONS + 1),
    client
      .from('bills')
      .select('user_id,name,amount,due_day,active,remind_days')
      .eq('active', true)
      .limit(MAX_BILLS + 1),
  ])

  if (subscriptions.error) {
    throw new Error(`push_subscriptions: ${subscriptions.error.message}`)
  }
  if (bills.error) {
    throw new Error(`bills: ${bills.error.message}`)
  }

  const subscriptionRows = (subscriptions.data ?? []) as SubscriptionRow[]
  const billRows = (bills.data ?? []) as BillRow[]

  const devices = new Map<string, Device[]>()
  for (const row of subscriptionRows) {
    if (!row.user_id || !row.endpoint || !row.subscription) continue
    const device: Device = { endpoint: row.endpoint, subscription: row.subscription }
    const list = devices.get(row.user_id)
    if (list) list.push(device)
    else devices.set(row.user_id, [device])
  }

  const settingsRows = await loadSettings(client, [...devices.keys()])

  const settingsByUser = new Map<string, SettingsRow>()
  for (const row of settingsRows) {
    if (row.user_id) settingsByUser.set(row.user_id, row)
  }

  const users: ReminderUser[] = [...devices.entries()].map(([userId, list]) => {
    const setting = settingsByUser.get(userId)
    return {
      userId,
      devices: list.length,
      notifPrefs: setting?.notif_prefs ?? null,
      lastSentAt: readLastSentAt(setting?.push_state),
    }
  })

  const billInputs: BillInput[] = []
  for (const row of billRows) {
    if (!row.user_id || !row.name) continue
    const dueDay = intOf(row.due_day)
    billInputs.push({
      userId: row.user_id,
      name: row.name,
      amount: intOf(row.amount),
      /* tanpa `due_day` yang sah tidak ada tanggal untuk dihitung */
      dueDay: dueDay >= 1 && dueDay <= 31 ? dueDay : 1,
      reminderDays:
        row.remind_days === null || row.remind_days === undefined ? 3 : intOf(row.remind_days),
      active: row.active !== false,
    })
  }

  return {
    devices,
    users,
    bills: billInputs,
    truncated: subscriptionRows.length > MAX_SUBSCRIPTIONS || billRows.length > MAX_BILLS,
  }
}

/* ── PENULISAN HASIL (BEST-EFFORT, TAPI TIDAK DISEMBUNYIKAN) ───────────────── */

/**
 * Tulis stempel anti-spam ke `user_settings.push_state`.
 *
 * Hanya user yang MINIMAL satu perangkatnya menerima pesan yang dicap: kalau
 * semua kiriman gagal, user tidak boleh kehilangan pengingatnya besok hanya
 * karena percobaan hari ini tercatat.
 */
async function recordPushState(
  client: SupabaseClient,
  userIds: readonly string[],
  stamp: { at: Date; dayKey: string },
  kindByUser: Map<string, ReminderKind>,
): Promise<string | null> {
  if (userIds.length === 0) return null
  const rows = userIds.map((userId) => ({
    user_id: userId,
    push_state: {
      lastSentAt: stamp.at.toISOString(),
      lastDay: stamp.dayKey,
      lastKind: kindByUser.get(userId) ?? null,
    },
  }))
  const { error } = await client.from('user_settings').upsert(rows, { onConflict: 'user_id' })
  return error ? `Stempel anti-spam gagal ditulis: ${error.message}` : null
}

/** hapus langganan yang dinyatakan mati oleh layanan push (404/410) */
async function removeDeadEndpoints(
  client: SupabaseClient,
  endpoints: readonly string[],
): Promise<string | null> {
  if (endpoints.length === 0) return null
  const unique = [...new Set(endpoints)]
  const { error } = await client.from('push_subscriptions').delete().in('endpoint', unique)
  return error ? `Langganan mati gagal dihapus: ${error.message}` : null
}

/** catat satu eksekusi ke `push_cron_runs` (bahan "Ringkasan Hasil Terakhir") */
async function saveRun(
  client: SupabaseClient,
  report: CronReport,
  actor: string,
): Promise<string | null> {
  const { error } = await client.from('push_cron_runs').insert({
    ran_at: report.ranAt,
    mode: report.mode,
    dry_run: report.dryRun,
    users: report.users,
    targets: report.targets,
    sent: report.sent,
    failed: report.failed,
    dropped: report.dropped,
    skipped: report.skipped,
    by_kind: report.byKind,
    actor,
    note: report.note ?? null,
  })
  return error ? `Riwayat eksekusi gagal dicatat: ${error.message}` : null
}

/* ── EKSEKUSI ────────────────────────────────────────────────────────────── */

export interface RunReminderOptions {
  /** `'auto'` = ditentukan jam WIB saat ini (Minggu malam = rekap pekan) */
  mode?: CronMode | 'auto'
  /** true = hanya menghitung (tidak menembakkan push, tidak menulis stempel) */
  dryRun?: boolean
  /** untuk pengujian & pemutaran ulang: waktu acuan */
  now?: Date
  /** siapa yang memicu — `cron` (Vercel) atau `admin` (tombol dashboard) */
  actor?: string
}

/**
 * Jalankan satu siklus pengingat.
 *
 * Urutannya sengaja: baca data → rencanakan → (simulasi berhenti di sini) →
 * kirim berkelompok → cap stempel → bersihkan endpoint mati → catat riwayat.
 * Setiap kegagalan tingkat eksekusi dikembalikan sebagai `error`/`note` pada
 * laporan, bukan dilempar, supaya endpoint cron bisa menjawab dengan status
 * yang jujur (503) tanpa kehilangan rinciannya.
 */
export async function runReminderCron(options: RunReminderOptions = {}): Promise<CronReport> {
  const now = options.now ?? new Date()
  const mode = resolveCronMode(options.mode ?? 'auto', now)
  const dryRun = options.dryRun === true
  const at = jakartaNow(now)

  const report: CronReport = {
    ok: false,
    mode,
    dryRun,
    ranAt: now.toISOString(),
    dayKey: at.dayKey,
    users: 0,
    targets: 0,
    sent: 0,
    failed: 0,
    dropped: 0,
    skipped: { noDevice: 0, prefOff: 0, antiSpam: 0, reservedWeekly: 0 },
    byKind: { bills: 0, daily: 0, weekly: 0 },
    planned: [],
  }

  const client = adminSupabase()
  if (!client) {
    return {
      ...report,
      error:
        'Kunci peran server (SUPABASE_SERVICE_ROLE_KEY) belum dikonfigurasi — cron tidak bisa membaca langganan lintas user.',
    }
  }

  let data: CronData
  try {
    data = await loadCronData(client)
  } catch (error) {
    return {
      ...report,
      error:
        error instanceof Error
          ? `Data cron gagal dibaca: ${error.message}`
          : 'Data cron gagal dibaca.',
    }
  }

  const plan = planReminders({ now, mode, users: data.users, bills: data.bills })

  const deliveries: CronDelivery[] = []
  for (const push of plan.pushes) {
    for (const device of data.devices.get(push.userId) ?? []) {
      deliveries.push({ ...push, endpoint: device.endpoint, subscription: device.subscription })
    }
  }

  const byKind: Record<ReminderKind, number> = { bills: 0, daily: 0, weekly: 0 }
  for (const delivery of deliveries) byKind[delivery.kind as ReminderKind]++

  report.users = plan.pushes.length
  report.targets = deliveries.length
  report.skipped = plan.skips
  report.byKind = byKind
  report.planned = plan.pushes.slice(0, MAX_PLANNED_IN_REPORT).map((push) => ({
    userId: push.userId,
    kind: push.kind,
    title: push.title,
    devices: (data.devices.get(push.userId) ?? []).length,
  }))

  if (dryRun) {
    return {
      ...report,
      ok: true,
      note: 'Mode simulasi: tidak ada push yang ditembakkan dan tidak ada stempel harian yang ditulis.',
    }
  }

  if (deliveries.length === 0) {
    return {
      ...report,
      ok: true,
      note: 'Tidak ada perangkat yang perlu dikirimi pesan pada jadwal ini.',
    }
  }

  const vapidError = ensureVapid()
  if (vapidError) return { ...report, error: vapidError }

  const toSend = deliveries.slice(0, MAX_DELIVERIES)
  const kindByUser = new Map<string, ReminderKind>()
  for (const push of plan.pushes) kindByUser.set(push.userId, push.kind)

  const deadEndpoints = new Set<string>()
  const delivery = await deliverPushes(toSend, {
    batchSize: PUSH_BATCH_SIZE,
    send: async (push) => {
      try {
        await webpush.sendNotification(push.subscription, pushPayload(push), {
          TTL: PUSH_TTL_SECONDS,
        })
        return { ok: true }
      } catch (error) {
        /* 404/410 = perangkat hilang/izin dicabut → ditangani `deliverPushes` */
        const statusCode = (error as { statusCode?: number } | null)?.statusCode ?? null
        return { ok: false, statusCode }
      }
    },
    drop: async (push) => {
      deadEndpoints.add(push.endpoint)
    },
  })

  const notes: string[] = []
  if (data.truncated) {
    notes.push('Data menyentuh batas baca — sebagian user mungkin belum ikut diproses.')
  }
  if (deliveries.length > MAX_DELIVERIES) {
    notes.push(
      `Kiriman dibatasi ${MAX_DELIVERIES} perangkat pada eksekusi ini (${deliveries.length - MAX_DELIVERIES} tertunda ke siklus berikutnya).`,
    )
  }

  const stampError = await recordPushState(
    client,
    delivery.sentUserIds,
    { at: now, dayKey: at.dayKey },
    kindByUser,
  )
  if (stampError) notes.push(stampError)

  const cleanupError = await removeDeadEndpoints(client, [...deadEndpoints])
  if (cleanupError) notes.push(cleanupError)

  const finished: CronReport = {
    ...report,
    ok: true,
    sent: delivery.sent,
    failed: delivery.failed,
    dropped: delivery.dropped,
  }
  if (notes.length > 0) finished.note = notes.join(' ')

  const historyError = await saveRun(client, finished, options.actor ?? 'cron')
  if (historyError) {
    finished.note = [finished.note, historyError].filter(Boolean).join(' ')
  }

  return finished
}

/* ── RIWAYAT EKSEKUSI ("RINGKASAN HASIL TERAKHIR") ────────────────────────── */

export interface LastRunResult {
  ok: boolean
  last: CronRunRow | null
  error?: string
}

function asSkipped(value: unknown): CronSkipped {
  const raw = (value && typeof value === 'object' ? value : {}) as Record<string, unknown>
  return {
    noDevice: intOf(raw.noDevice),
    prefOff: intOf(raw.prefOff),
    antiSpam: intOf(raw.antiSpam),
    reservedWeekly: intOf(raw.reservedWeekly),
  }
}

function asByKind(value: unknown): Record<ReminderKind, number> {
  const raw = (value && typeof value === 'object' ? value : {}) as Record<string, unknown>
  return { bills: intOf(raw.bills), daily: intOf(raw.daily), weekly: intOf(raw.weekly) }
}

function toRunRow(row: Record<string, unknown>): CronRunRow {
  return {
    id: String(row.id ?? ''),
    ranAt: typeof row.ran_at === 'string' ? row.ran_at : new Date(0).toISOString(),
    mode: row.mode === 'weekly' ? 'weekly' : 'morning',
    dryRun: row.dry_run === true,
    users: intOf(row.users),
    targets: intOf(row.targets),
    sent: intOf(row.sent),
    failed: intOf(row.failed),
    dropped: intOf(row.dropped),
    skipped: asSkipped(row.skipped),
    byKind: asByKind(row.by_kind),
    note: typeof row.note === 'string' ? row.note : null,
  }
}

/**
 * Eksekusi terakhir dari tabel `push_cron_runs` — bahan "Ringkasan Hasil
 * Terakhir" di Dashboard Admin.
 *
 * `ok:false` dipakai saat backend/kolomnya belum siap (migrasi belum dijalankan),
 * dan pesannya diteruskan apa adanya ke layar: kartu admin harus bisa menjelaskan
 * kenapa riwayatnya kosong, bukan menampilkan "belum pernah jalan" yang menyesatkan.
 */
export async function readLastCronRun(): Promise<LastRunResult> {
  const client = adminSupabase()
  if (!client) {
    return {
      ok: false,
      last: null,
      error: 'Kunci peran server belum dikonfigurasi — riwayat cron tidak bisa dibaca.',
    }
  }

  const { data, error } = await client
    .from('push_cron_runs')
    .select('*')
    .order('ran_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error) {
    return { ok: false, last: null, error: `Riwayat cron tidak bisa dibaca: ${error.message}` }
  }
  if (!data) return { ok: true, last: null }
  return { ok: true, last: toRunRow(data as Record<string, unknown>) }
}

