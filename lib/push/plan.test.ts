import { describe, expect, it } from 'vitest'
import {
  alreadySentToday,
  dueDayThisMonth,
  jakartaNow,
  planReminders,
  resolveCronMode,
  type BillInput,
  type ReminderUser,
} from './plan'

/* ── ATURAN PENGINGAT: PRIORITAS, ZONA WAKTU, ANTI-SPAM ──────────────────────
   Yang dikunci di file ini adalah keputusan yang paling mahal kalau salah:

     1. konversi UTC → WIB (server Vercel berjalan di UTC, jadi `getDay()`
        biasa berbohong 7 jam setiap hari);
     2. tagihan jatuh tempo MENDAHULUI sapaan harian & rekap pekan;
     3. maksimal satu push per user per hari kalender WIB;
     4. tanggal 29–31 tetap dihitung benar di bulan yang lebih pendek;
     5. jadwal Minggu pagi menyisakan slot untuk rekap Minggu malam. */

/** Jumat 6 Nov 2026, 08:00 WIB (= 01:00 UTC) — jadwal pagi */
const FRI_MORNING = new Date('2026-11-06T01:00:00.000Z')
/** Minggu 8 Nov 2026, 08:00 WIB — jadwal pagi di hari Minggu */
const SUN_MORNING = new Date('2026-11-08T01:00:00.000Z')
/** Minggu 8 Nov 2026, 20:00 WIB (= 13:00 UTC) — jadwal rekap pekan */
const SUN_EVENING = new Date('2026-11-08T13:00:00.000Z')

function user(over: Partial<ReminderUser> = {}): ReminderUser {
  return { userId: 'u1', devices: 1, notifPrefs: null, lastSentAt: null, ...over }
}

function bill(over: Partial<BillInput> = {}): BillInput {
  return {
    userId: 'u1',
    name: 'Netflix',
    amount: 54_000,
    /* 6 Nov + 3 hari = 9 Nov → H-3 dari jadwal pagi */
    dueDay: 9,
    reminderDays: 3,
    active: true,
    ...over,
  }
}

describe('jakartaNow · UTC → WIB', () => {
  it('01:00 UTC = 08:00 WIB pada tanggal yang sama', () => {
    const at = jakartaNow(FRI_MORNING)
    expect(at.dayKey).toBe('2026-11-06')
    expect(at.hour).toBe(8)
    expect(at.weekday).toBe(5) // Jumat
  })

  it('18:30 UTC sudah masuk tanggal WIB berikutnya', () => {
    const at = jakartaNow(new Date('2026-11-05T18:30:00.000Z'))
    expect(at.dayKey).toBe('2026-11-06')
    expect(at.hour).toBe(1)
    expect(at.minute).toBe(30)
  })

  it('Minggu malam WIB dikenali sebagai weekday 0 jam 20', () => {
    const at = jakartaNow(SUN_EVENING)
    expect(at.weekday).toBe(0)
    expect(at.hour).toBe(20)
  })
})

describe('jatuh tempo · penyesuaian akhir bulan', () => {

describe('planReminders · prioritas pesan', () => {
  it('tagihan H-3 mendahului sapaan harian (walau dua saklar menyala)', () => {
    const plan = planReminders({
      now: FRI_MORNING,
      mode: 'morning',
      users: [user()],
      bills: [bill()],
    })
    expect(plan.pushes).toHaveLength(1)
    expect(plan.pushes[0].kind).toBe('bills')
    expect(plan.pushes[0].url).toBe('/bills')
    expect(plan.pushes[0].tag).toBe('catetind-bills')
    expect(plan.pushes[0].body).toContain('Netflix')
  })

  it('tanpa tagihan mendesak → sapaan jatah jajan ke /app', () => {
    const plan = planReminders({
      now: FRI_MORNING,
      mode: 'morning',
      users: [user()],
      /* jatuh tempo 2 minggu lagi → di luar jendela */
      bills: [bill({ dueDay: 20 })],
    })
    expect(plan.pushes.map((push) => push.kind)).toEqual(['daily'])
    expect(plan.pushes[0].url).toBe('/app')
    expect(plan.pushes[0].tag).toBe('catetind-daily')
  })

  it('saklar tagihan dimatikan → sapaan harian tetap jalan', () => {
    const plan = planReminders({
      now: FRI_MORNING,
      mode: 'morning',
      users: [user({ notifPrefs: { 'tagihan-jatuh-tempo': false } })],
      bills: [bill()],
    })
    expect(plan.pushes.map((push) => push.kind)).toEqual(['daily'])
  })

  it('tagihan dengan remind_days 0 tidak pernah mendesak', () => {
    const plan = planReminders({
      now: FRI_MORNING,
      mode: 'morning',
      users: [user()],
      bills: [bill({ reminderDays: 0 })],
    })
    expect(plan.pushes.map((push) => push.kind)).toEqual(['daily'])
  })

  it('kedua saklar dimatikan → tidak ada push, dilaporkan sebagai prefOff', () => {
    const plan = planReminders({
      now: FRI_MORNING,
      mode: 'morning',
      users: [user({ notifPrefs: { 'tagihan-jatuh-tempo': false, 'reminder-harian': false } })],
      bills: [bill()],
    })
    expect(plan.pushes).toHaveLength(0)
    expect(plan.skips.prefOff).toBe(1)
  })

  it('user tanpa perangkat terdaftar dilewati (noDevice), bukan dianggap terkirim', () => {
    const plan = planReminders({
      now: FRI_MORNING,
      mode: 'morning',
      users: [user({ devices: 0 })],
      bills: [bill()],
    })
    expect(plan.pushes).toHaveLength(0)
    expect(plan.skips.noDevice).toBe(1)
  })
})

describe('planReminders · anti-spam 1 push per hari (WIB)', () => {
  it('sudah dikirimi hari ini → dilewati walau tagihan mendesak', () => {
    const plan = planReminders({
      now: FRI_MORNING,
      mode: 'morning',
      users: [user({ lastSentAt: '2026-11-06T00:30:00.000Z' })], // 07:30 WIB, hari sama
      bills: [bill()],
    })
    expect(plan.pushes).toHaveLength(0)
    expect(plan.skips.antiSpam).toBe(1)
  })

  it('kiriman kemarin tidak menghalangi hari ini', () => {
    const plan = planReminders({
      now: FRI_MORNING,
      mode: 'morning',
      users: [user({ lastSentAt: '2026-11-05T03:00:00.000Z' })],
      bills: [bill()],
    })
    expect(plan.pushes).toHaveLength(1)
  })

  it('stempel rusak dianggap belum pernah kirim', () => {
    expect(alreadySentToday('bukan-tanggal', jakartaNow(FRI_MORNING))).toBe(false)
    expect(alreadySentToday(null, jakartaNow(FRI_MORNING))).toBe(false)
  })
})

describe('planReminders · rekap Minggu malam', () => {
  it('rekap dikirim ke /history pada jadwal Minggu malam', () => {
    const plan = planReminders({
      now: SUN_EVENING,
      mode: 'weekly',
      users: [user()],
      bills: [],
    })
    expect(plan.pushes.map((push) => push.kind)).toEqual(['weekly'])
    expect(plan.pushes[0].url).toBe('/history')
    expect(plan.pushes[0].tag).toBe('catetind-weekly')
  })

  it('tagihan mendesak pada Minggu malam tetap menang atas rekap', () => {
    const plan = planReminders({
      now: SUN_EVENING,
      mode: 'weekly',
      users: [user()],
      bills: [bill({ dueDay: 9 })],
    })
    expect(plan.pushes.map((push) => push.kind)).toEqual(['bills'])
  })

  it('Minggu pagi menyisakan slot untuk rekap malam (tidak dobel di hari yang sama)', () => {
    const morning = planReminders({
      now: SUN_MORNING,
      mode: 'morning',
      users: [user()],
      bills: [],
    })
    expect(morning.pushes).toHaveLength(0)
    expect(morning.skips.reservedWeekly).toBe(1)

    /* di malam yang sama, rekap terkirim dan menjadi satu-satunya pesan hari itu */
    const evening = planReminders({
      now: SUN_EVENING,
      mode: 'weekly',
      users: [user()],
      bills: [],
    })
    expect(evening.pushes.map((push) => push.kind)).toEqual(['weekly'])
  })

  it('saklar rekap dimatikan → sapaan pagi Minggu tetap terkirim', () => {
    const plan = planReminders({
      now: SUN_MORNING,
      mode: 'morning',
      users: [user({ notifPrefs: { 'laporan-mingguan': false } })],
      bills: [],
    })
    expect(plan.pushes.map((push) => push.kind)).toEqual(['daily'])
  })
})

describe('resolveCronMode · mode otomatis dari jam WIB', () => {
  it('Minggu malam → weekly, Minggu pagi → morning', () => {
    expect(resolveCronMode('auto', SUN_EVENING)).toBe('weekly')
    expect(resolveCronMode(null, SUN_MORNING)).toBe('morning')
    expect(resolveCronMode(undefined, FRI_MORNING)).toBe('morning')
  })

  it('mode eksplisit selalu dipakai apa pun jamnya', () => {
    expect(resolveCronMode('morning', SUN_EVENING)).toBe('morning')
    expect(resolveCronMode('weekly', FRI_MORNING)).toBe('weekly')
  })
})

  it('tanggal 31 di-clamp ke hari terakhir bulan pendek', () => {
    expect(dueDayThisMonth(31, 28)).toBe(28) // Februari
    expect(dueDayThisMonth(31, 30)).toBe(30) // April
    expect(dueDayThisMonth(31, 31)).toBe(31)
  })

  it('nilai tidak sah tidak membuat tagihan hilang', () => {
    expect(dueDayThisMonth(0, 30)).toBe(1)
    expect(dueDayThisMonth(Number.NaN, 30)).toBe(1)
  })
})
