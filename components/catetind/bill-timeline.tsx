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

/* ── Timeline 7 Hari ke Depan (Section 5) ────────────────────────────────────
   Strip tanggal yang bisa digeser: emoji tagihan di atas lingkaran tanggal.
   Tap tanggal → daftar di samping/bawah menggulir ke kartu tagihan itu.

   Audit UX #3 — strip ini HANYA menampilkan tagihan yang benar-benar ada di
   list "Aktif" (belum lunas). Dulu tagihan yang sudah LUNAS tetap muncul di sel
   siklus bulan depan (Kos tgl 1), padahal ia tidak ada di daftar Aktif — jadi
   kalender dan daftar saling bertentangan.

   Audit UX #5 — cukup SATU penanda status. Titik oranye di bawah tanggal
   dihapus (redundan dengan emoji brand di atasnya + lingkaran tanggal). Status
   urgent dipindah ke warna cincin tanggal: terracotta = telat, amber = hari ini.

   Tanggalnya dihitung dari tanggal PERANGKAT (`useTodayISO()` yang dikirim
   halaman sebagai `todayIso`, paket 57), bukan konstanta TODAY_ISO: dulu strip
   ini mulai dari 25 Sep walau hari ini 28 Sep, jadi "7 hari ke depan" bukan
   rentang yang benar. Sel yang melewati akhir bulan tetap ditandai singkatan
   bulannya, dan karena nilainya baru diisi setelah mount, HTML server & render
   pertama client tetap identik (tidak ada hydration mismatch).
   ────────────────────────────────────────────────────────────────────────── */

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
  /* sabuk pengaman: apa pun yang dioper pemanggil, tagihan lunas tetap disaring
     di sini supaya kalender TIDAK PERNAH menampilkan tagihan di luar list Aktif */
  const activeBills = bills.filter((bill) => !bill.isPaidThisMonth)
  const hasBills = days.some((day) => billsOnDay(activeBills, day.day).length > 0)

  return (
    <section
      aria-label="Tagihan 7 hari ke depan"
      className={cn(
        'mt-5 rounded-[1.75rem] bg-cream p-5 shadow-[0_4px_24px_-4px_rgba(0,0,0,0.06)] ring-1 ring-soil/12 sm:p-6',
        className,
      )}
    >
      <h2 className="font-display text-[15px] font-semibold tracking-tight text-forest">
        📅 7 Hari ke Depan
      </h2>

      <ul className="hide-scrollbar -mx-5 mt-3 flex snap-x gap-1 overflow-x-auto px-5 pb-1 sm:-mx-6 sm:px-6">
        {days.map((day) => {
          const dayBills = billsOnDay(activeBills, day.day)
          /* status dikompilasi jadi SATU warna cincin (audit #5) */
          const statuses = dayBills.map((bill) => getBillStatus(bill, currentDay))
          const hasOverdue = statuses.includes('overdue')
          const hasDueToday = statuses.includes('due_today')
          const primary = dayBills[0]
          const clickable = dayBills.length > 0

          return (
            <li key={day.iso} className="snap-start">
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
                  'flex w-[52px] flex-col items-center gap-1.5 rounded-2xl px-1 py-2 transition-colors',
                  clickable ? 'hover:bg-sage/40 active:scale-95' : 'cursor-default',
                )}
              >
                {/* emoji tagihan hari itu (maks 2 + penanda sisanya) */}
                <span className="flex h-5 items-center gap-0.5 text-[13px] leading-none">
                  {dayBills.slice(0, 2).map((bill) => (
                    <span key={bill.id} aria-hidden>
                      {bill.emoji}
                    </span>
                  ))}
                  {dayBills.length > 2 && (
                    <span className="text-[9px] font-medium text-forest/40" aria-hidden>
                      +{dayBills.length - 2}
                    </span>
                  )}
                </span>

                {/* lingkaran tanggal — sekaligus SATU-SATUNYA penanda status.
                    Audit #5: titik oranye di bawah tanggal dihapus. */}
                <span
                  aria-hidden
                  className={cn(
                    'flex size-9 items-center justify-center rounded-full text-[13px] font-semibold tabular-nums transition-colors',
                    day.isToday
                      ? 'bg-cream font-medium text-forest ring-2 ring-forest'
                      : hasOverdue
                        ? 'bg-hud-terracotta/12 text-hud-terracotta ring-2 ring-hud-terracotta/55'
                        : hasDueToday
                          ? 'bg-hud-amber/15 text-[#b89191] ring-2 ring-hud-amber/55'
                          : clickable
                            ? 'bg-sage/60 text-forest'
                            : 'bg-cream text-forest/55',
                  )}
                >
                  {day.day}
                </span>

                {/* penanda siklus bulan depan — tinggi baris dikunci biar rapi */}
                <span className="h-3 text-[9px] font-medium leading-3 text-forest/35">
                  {day.nextMonth ? day.monthShort : ''}
                </span>
              </button>
            </li>
          )
        })}
      </ul>

      {!hasBills && (
        <p className="mt-2 text-[11.5px] font-medium text-forest/45">
          Gak ada tagihan minggu ini. Santai! 🌿
        </p>
      )}
    </section>
  )
}
