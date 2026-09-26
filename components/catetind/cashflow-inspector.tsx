'use client'

import { CalendarCheck, Check, Plus, Sparkles, TriangleAlert } from 'lucide-react'
import { cn } from '@/lib/utils'
import { maskMoney } from '@/lib/data/history'
import {
  CLEAN_STREAK_MILESTONE,
  EMPTY_DAY_AI_MESSAGE,
  FIXED_BILL_SAFE_NOTE,
  PLANNED_BADGE_LABEL,
  longDateLabel,
  type CalendarCell,
  type CalendarEntry,
} from '@/lib/data/calendar'

/* ── 3. Panel Detail Tanggal (kolom kanan) ───────────────────────────────────
   Panel yang selalu mengikuti tanggal terpilih di kalender. Ikut dirapikan
   supaya nadanya sama dengan grid kiri: SATU baris ringkasan nominal (bukan
   dua kotak KPI + kotak rincian bertumpuk), satu tombol utama, lalu daftar
   transaksi bergaris pemisah tipis — bukan tumpukan kartu.

   Isinya:
     3A  Tanggal panjang + ringkasan "berapa masuk / berapa keluar" hari itu.
     3B  Satu tombol "Tambah Catatan di Tgl X" — zero-friction backdating
         (tanggalnya terkunci ke tanggal yang dipilih; modalnya:
         components/catetind/add-calendar-note-sheet.tsx).
     3C  Daftar transaksi hari itu. Kalau tanggalnya masih di depan, yang muncul
         adalah RAMALAN tagihan + aksi [Bayar Sekarang]; kalau hari yang sudah
         lewat benar-benar kosong, muncul pesan AI yang menenangkan.

   Sticky di desktop (`lg:sticky lg:top-8`) supaya saat halaman digulir, detail
   tanggal tetap terlihat.
   ────────────────────────────────────────────────────────────────────────── */

/** label kecil di samping tanggal: Hari Ini / n hari lagi / sudah lewat */
function relativeLabel(cell: CalendarCell) {
  if (cell.isToday) return { text: 'Hari Ini', className: 'bg-forest text-mint' }
  if (cell.daysFromToday > 0) {
    return {
      text: cell.daysFromToday === 1 ? 'Besok' : `${cell.daysFromToday} hari lagi`,
      className: 'bg-cream text-ink/55 ring-1 ring-inset ring-soil/[0.05]',
    }
  }
  return {
    text: cell.daysFromToday === -1 ? 'Kemarin' : `${Math.abs(cell.daysFromToday)} hari lalu`,
    className: 'bg-cream text-ink/45 ring-1 ring-inset ring-soil/[0.05]',
  }
}

export function CashflowInspector({
  cell,
  masked,
  dailyAverage,
  paidForecastIds,
  onAddNote,
  onPayForecast,
}: {
  cell: CalendarCell | null
  masked: boolean
  /** rata-rata belanja variabel per hari — pembanding pesan "boros" */
  dailyAverage: number
  /** id ramalan yang sudah ditandai lunas di sesi ini */
  paidForecastIds: string[]
  onAddNote: () => void
  onPayForecast: (entry: CalendarEntry) => void
}) {
  if (!cell) {
    return (
      <aside className="rounded-[2rem] bg-cream p-5 shadow-[0_4px_24px_-4px_rgba(80,58,58,0.06)] ring-1 ring-soil/5 lg:sticky lg:top-8">
        <h2 className="font-display text-[18px] font-semibold tracking-tight text-ink">
          Pilih tanggal dulu
        </h2>
        <p className="mt-1 text-[12.5px] text-ink/50">
          Tap salah satu tanggal di kalender untuk melihat detail harinya.
        </p>
      </aside>
    )
  }

  const relative = relativeLabel(cell)
  const streakMilestone = cell.cleanDay && cell.streak >= CLEAN_STREAK_MILESTONE
  const isEmptyDay = cell.entries.length === 0 && cell.forecast.length === 0
  /* hari yang cuma berisi tagihan terjadwal → beri tahu user bahwa itu netral */
  const plannedOnly = cell.fixedSpend > 0 && cell.variableSpend === 0
  /* rincian cuma ditulis kalau memang ada lebih dari satu jenis uang di hari itu
     — kalau hanya satu, baris ringkasan di atas sudah mewakilinya */
  const breakdown = [
    cell.variableSpend > 0 ? `Variabel ${maskMoney(cell.variableSpend, masked)}` : null,
    cell.fixedSpend > 0 ? `Terjadwal ${maskMoney(cell.fixedSpend, masked)}` : null,
    cell.moved > 0 ? `Pindah dana ${maskMoney(cell.moved, masked)}` : null,
  ].filter((part): part is string => part !== null)

  return (
    <aside className="flex flex-col rounded-[2rem] bg-cream p-5 shadow-[0_4px_24px_-4px_rgba(80,58,58,0.06)] ring-1 ring-soil/5 lg:sticky lg:top-8">
      {/* ── 3A. TANGGAL + RINGKASAN SATU BARIS ───────────────────────────── */}
      <div className="flex items-center justify-between gap-2">
        <span
          className={cn(
            'rounded-full px-2.5 py-1 text-[10.5px] font-bold uppercase tracking-[0.1em]',
            relative.className,
          )}
        >
          {relative.text}
        </span>
        {cell.isFuture && !isEmptyDay && (
          <span className="text-[11px] font-medium text-ink/35">ramalan</span>
        )}
      </div>

      <h2 className="mt-2 font-display text-[20px] font-semibold leading-tight tracking-tight text-ink">
        {longDateLabel(cell.date)}
      </h2>

      {/* ringkasan nominal: hanya menulis bagian yang memang ada isinya */}
      <p className="mt-1.5 flex flex-wrap items-center gap-x-2.5 gap-y-0.5 text-[12.5px] font-semibold tabular-nums">
        {cell.income > 0 && <span className="text-forest">+{maskMoney(cell.income, masked)} masuk</span>}
        {cell.totalSpend > 0 && (
          <span className="text-ink/70">−{maskMoney(cell.totalSpend, masked)} keluar</span>
        )}
        {cell.income === 0 && cell.totalSpend === 0 && (
          <span className="font-medium text-ink/40">Tidak ada uang yang bergerak</span>
        )}
      </p>
      {breakdown.length > 1 && (
        <p className="mt-1 text-[11.5px] text-ink/40">{breakdown.join(' · ')}</p>
      )}

      {/* ── pesan kontekstual hari itu: maksimal satu yang menonjol ──────── */}
      {cell.tone === 'deficit' && (
        <p className="mt-3 flex items-start gap-2 rounded-2xl bg-hud-terracotta/10 px-3 py-2.5 text-[11.5px] leading-relaxed text-hud-terracotta ring-1 ring-inset ring-hud-terracotta/20">
          <TriangleAlert className="mt-0.5 size-3.5 shrink-0" strokeWidth={2.4} />
          <span>
            Belanja variabel hari ini {maskMoney(cell.variableSpend, masked)} — di atas
            rata-rata harianmu {maskMoney(Math.round(dailyAverage), masked)}.
          </span>
        </p>
      )}
      {plannedOnly && cell.tone !== 'deficit' && (
        <p className="mt-3 flex items-start gap-2 text-[11.5px] leading-relaxed text-ink/45">
          <CalendarCheck className="mt-0.5 size-3.5 shrink-0 text-ink/30" strokeWidth={2.4} />
          <span>{FIXED_BILL_SAFE_NOTE}</span>
        </p>
      )}
      {streakMilestone && (
        <p className="mt-3 flex items-start gap-2 text-[11.5px] leading-relaxed text-ink/45">
          <Sparkles className="mt-0.5 size-3.5 shrink-0 text-hud-amber" strokeWidth={2.4} />
          <span>{cell.streak} hari beruntun tanpa belanja variabel 🌱</span>
        </p>
      )}

      {/* ── 3B. ZERO-FRICTION BACKDATING ─────────────────────────────────── */}
      <button
        type="button"
        onClick={onAddNote}
        className="mt-4 inline-flex h-11 w-full items-center justify-center gap-2 rounded-2xl bg-forest px-4 text-[13px] font-semibold text-mint shadow-[0_16px_34px_-20px_rgba(69,89,78,0.9)] transition-colors hover:bg-forest-soft active:scale-[0.99]"
      >
        <Plus className="size-4" strokeWidth={2.8} />
        Tambah Catatan di Tgl {cell.day}
      </button>


      {/* ── 3C. DAFTAR TRANSAKSI / RAMALAN ───────────────────────────────── */}
      <section className="mt-5 border-t border-soil/[0.06] pt-4">
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-[11px] font-bold uppercase tracking-[0.12em] text-ink/45">
            {cell.isFuture
              ? cell.forecast.length > 0
                ? 'Ramalan Tagihan'
                : 'Catatan Tercatat'
              : 'Transaksi Hari Ini'}
          </h3>
          <span className="text-[11px] font-semibold tabular-nums text-ink/40">
            {cell.entries.length + cell.forecast.length} catatan
          </span>
        </div>

        {isEmptyDay ? (
          /* hari kosong: pesan yang menenangkan, tanpa kotak bergaris putus */
          <div className="mt-4 flex flex-col items-center px-2 pb-2 text-center">
            <span aria-hidden className="text-[22px] leading-none opacity-80">
              {cell.isFuture ? '🗓' : '🌿'}
            </span>
            <p className="mt-2 font-display text-[13px] font-bold tracking-tight text-ink">
              {cell.isFuture ? 'Belum ada tagihan terjadwal' : 'Kosong & aman'}
            </p>
            <p className="mt-1 max-w-[16rem] text-[11.5px] leading-relaxed text-ink/45">
              {cell.isFuture
                ? 'Tidak ada tagihan jatuh tempo di tanggal ini. Tenang aja 🌿'
                : EMPTY_DAY_AI_MESSAGE}
            </p>
          </div>
        ) : (
          <ul
            data-lenis-prevent
            className="mt-1 flex max-h-[21rem] flex-col divide-y divide-soil/[0.05] overflow-y-auto pr-0.5"
          >
            {/* ramalan tampil lebih dulu — inilah yang butuh keputusan user */}
            {cell.forecast.map((entry) => (
              <CashflowEntryRow
                key={entry.id}
                entry={entry}
                masked={masked}
                forecast
                paid={paidForecastIds.includes(entry.id)}
                deficitDay={false}
                onPay={onPayForecast}
              />
            ))}
            {cell.entries.map((entry) => (
              <CashflowEntryRow
                key={entry.id}
                entry={entry}
                masked={masked}
                forecast={false}
                paid={false}
                deficitDay={cell.tone === 'deficit'}
                onPay={onPayForecast}
              />
            ))}
          </ul>
        )}
      </section>
    </aside>
  )
}

/* ── Satu baris catatan di dalam panel detail ────────────────────────────────
   Tiga warna tegas supaya user tidak pernah salah baca:
     hijau  → uang MASUK
     hitam  → uang KELUAR (variabel; terracotta kalau hari itu memang boros)
     biru   → cuma PINDAH DANA (net worth tidak berubah)
   Barisnya dipisah garis tipis, bukan dibungkus kartu kecil — daftar jadi
   terasa lebih tenang. Tagihan terjadwal memakai label "Terencana", sama
   dengan legenda di kalender. */
const ENTRY_CHIP: Record<CalendarEntry['type'], { label: string; className: string }> = {
  income: { label: 'Pemasukan', className: 'text-forest' },
  fixed_bill: { label: PLANNED_BADGE_LABEL, className: 'text-thistle' },
  variable_expense: { label: 'Variabel', className: 'text-hud-terracotta' },
  money_movement: { label: 'Pindah dana', className: 'text-thistle' },
}

function CashflowEntryRow({
  entry,
  masked,
  forecast,
  paid,
  deficitDay,
  onPay,
}: {
  entry: CalendarEntry
  masked: boolean
  forecast: boolean
  paid: boolean
  /** hari itu ditandai boros → nominal variabel ditebalkan plum */
  deficitDay: boolean
  onPay: (entry: CalendarEntry) => void
}) {
  const chip = ENTRY_CHIP[entry.type]
  const isIncome = entry.type === 'income'
  const isMovement = entry.type === 'money_movement'

  return (
    <li className="flex items-start gap-3 py-3 first:pt-2 last:pb-1">
      <span
        aria-hidden
        className={cn(
          'mt-0.5 shrink-0 text-[15px] leading-none',
          forecast && 'opacity-60 saturate-50',
        )}
      >
        {entry.emoji}
      </span>

      <span className="min-w-0 flex-1">
        <span className="block truncate text-[13px] font-semibold text-ink">{entry.name}</span>
        <span className="mt-1 flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-[11px] text-ink/40">
          <span className={cn('font-semibold', chip.className)}>{chip.label}</span>
          <span aria-hidden className="text-ink/20">
            ·
          </span>
          <span className="truncate">
            {entry.category} · {entry.wallet}
            {entry.time ? ` · ${entry.time}` : ''}
          </span>
        </span>

        {/* aksi kontekstual khusus ramalan tagihan */}
        {forecast && (
          <span className="mt-2 flex items-center gap-2">
            {paid ? (
              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#503a3a]">
                <Check className="size-3" strokeWidth={3} />
                Sudah ditandai lunas
              </span>
            ) : entry.type === 'income' ? (
              <span className="text-[11px] text-ink/40">Menunggu masuk otomatis</span>
            ) : (
              <button
                type="button"
                onClick={() => onPay(entry)}
                className="inline-flex h-7 items-center gap-1.5 rounded-full bg-forest px-3 text-[11px] font-semibold text-mint transition-colors hover:bg-forest-soft active:scale-95"
              >
                Bayar Sekarang
              </button>
            )}
          </span>
        )}
      </span>

      <span
        className={cn(
          'shrink-0 text-right font-display text-[13px] font-semibold tabular-nums',
          isIncome
            ? 'text-forest'
            : isMovement
              ? 'text-thistle'
              : deficitDay
                ? 'text-hud-terracotta'
                : 'text-ink/75',
        )}
      >
        {isIncome ? '+' : isMovement ? '⇄ ' : '−'}
        {maskMoney(entry.amount, masked)}
        {forecast && (
          <span className="mt-0.5 block text-[10px] font-medium text-ink/35">ramalan</span>
        )}
      </span>
    </li>
  )
}

