'use client'

import { cn } from '@/lib/utils'
import {
  TIMELINE_DAYS,
  TODAY_ISO,
  billsOnDay,
  getBillStatus,
  upcomingDays,
  type Bill,
} from '@/lib/data/bills'
import { formatDayLabel } from '@/lib/data/history'

/* ── Timeline 7 Hari ke Depan ────────────────────────────────────────────────
   Tujuh hari sebagai GRID 7 kolom selebar kartu (bukan strip yang harus
   digeser): tiap sel = label hari + tanggal + emoji tagihan. Tap sel → daftar
   menggulir ke kartu tagihan itu.

   Tampilan sengaja BERWARNA memakai palet kanon supaya tidak "full putih":
     · hari ini                         → terisi Evergreen (`bg-forest`, teks cream)
     · ada tagihan telat                → tint Plum   (`bg-hud-terracotta/15`)
     · ada tagihan jatuh tempo hari ini → tint Cantelope (`bg-hud-amber/20`)
     · hari yang ada tagihannya         → tint Oat    (`bg-sage/60`)
     · hari kosong                      → Oat lebih tipis (`bg-sage/30`)

   Hanya menampilkan tagihan yang ada di list "Aktif" (belum lunas) supaya
   kalender & daftar tidak kontradiksi (audit UX #3). Tanggal dihitung dari
   tanggal PERANGKAT (`todayIso`, paket 57) sehingga render server & render
   pertama client tetap identik (tidak ada hydration mismatch).
   ────────────────────────────────────────────────────────────────────────── */

/** singkatan hari (indeks 0 = Minggu, mengikuti `Date.getDay()`) */
const WEEKDAY_SHORT = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab']

/** indeks hari dari ISO 'YYYY-MM-DD' — dihitung lokal, tanpa pergeseran zona waktu */
function weekdayOf(iso: string): number {
  const [year, month, day] = iso.split('-').map(Number)
  return new Date(year, (month ?? 1) - 1, day ?? 1).getDay()
}

export function BillTimeline({
  bills,
  currentDay,
  todayIso = TODAY_ISO,
  onPick,
  className,
}: {
  bills: Bill[]
  currentDay: number
  /** tanggal "hari ini" milik user (`useTodayISO()` di halaman) */
  todayIso?: string
  onPick: (bill: Bill) => void
  /** override margin luar (dipakai saat kartu disusun dalam grid 2 kolom) */
  className?: string
}) {
  const days = upcomingDays(TIMELINE_DAYS, todayIso)
  /* sabuk pengaman: apa pun yang dioper pemanggil, tagihan lunas tetap disaring */
  const activeBills = bills.filter((bill) => !bill.isPaidThisMonth)
  const dueCount = days.reduce((sum, day) => sum + billsOnDay(activeBills, day.day).length, 0)
  const hasBills = dueCount > 0

  return (
    <section
      aria-label="Tagihan 7 hari ke depan"
      className={cn('rounded-3xl bg-cream p-4 ring-1 ring-soil/10', className)}
    >
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="text-[11px] font-medium uppercase tracking-[0.16em] text-forest/40">
          7 hari ke depan
        </h2>
        {hasBills && (
          <span className="text-[11px] font-medium tabular-nums text-forest/40">
            {dueCount} tagihan
          </span>
        )}
      </div>

      <ul className="mt-3 grid grid-cols-7 gap-1.5">
        {days.map((day) => {
          const dayBills = billsOnDay(activeBills, day.day)
          /* status dikompilasi jadi SATU warna sel (audit #5) */
          const statuses = dayBills.map((bill) => getBillStatus(bill, currentDay))
          const hasOverdue = statuses.includes('overdue')
          const hasDueToday = statuses.includes('due_today')
          const clickable = dayBills.length > 0
          const primary = dayBills[0]

          return (
            <li key={day.iso}>
              <button
                type="button"
                disabled={!clickable}
                onClick={() => primary && onPick(primary)}
                aria-label={
                  clickable
                    ? `${formatDayLabel(day.iso)}: ${dayBills.map((bill) => bill.name).join(', ')}`
                    : formatDayLabel(day.iso)
                }
                className={cn(
                  'flex w-full flex-col items-center gap-1 rounded-2xl px-0.5 py-2 transition-colors',
                  clickable ? 'active:scale-95' : 'cursor-default',
                  day.isToday
                    ? 'bg-forest text-cream shadow-[0_10px_22px_-14px_rgba(69,89,78,0.85)]'
                    : hasOverdue
                      ? 'bg-hud-terracotta/15'
                      : hasDueToday
                        ? 'bg-hud-amber/20'
                        : clickable
                          ? 'bg-sage/60 hover:bg-sage'
                          : 'bg-sage/30',
                )}
              >
                <span
                  className={cn(
                    'text-[9px] font-semibold uppercase tracking-wide',
                    day.isToday ? 'text-cream/70' : 'text-forest/45',
                  )}
                >
                  {WEEKDAY_SHORT[weekdayOf(day.iso)]}
                </span>

                <span
                  className={cn(
                    'text-[15px] font-semibold leading-none tabular-nums',
                    day.isToday ? 'text-cream' : 'text-forest',
                  )}
                >
                  {day.day}
                </span>

                <span className="flex h-4 items-center gap-0.5 text-[11px] leading-none">
                  {dayBills.length > 0 ? (
                    <>
                      {dayBills.slice(0, 2).map((bill) => (
                        <span key={bill.id} aria-hidden>
                          {bill.emoji}
                        </span>
                      ))}
                      {dayBills.length > 2 && (
                        <span
                          className={cn(
                            'text-[8px] font-medium',
                            day.isToday ? 'text-cream/80' : 'text-forest/50',
                          )}
                          aria-hidden
                        >
                          +{dayBills.length - 2}
                        </span>
                      )}
                    </>
                  ) : day.nextMonth ? (
                    <span className="text-[8px] font-medium text-forest/35" aria-hidden>
                      {day.monthShort}
                    </span>
                  ) : null}
                </span>
              </button>
            </li>
          )
        })}
      </ul>

    </section>
  )
}
