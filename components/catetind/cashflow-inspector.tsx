'use client'

import { CalendarCheck, Plus, Sparkles, TriangleAlert } from 'lucide-react'
import { cn } from '@/lib/utils'
import { maskMoney } from '@/lib/data/history'
import {
  CALENDAR_DAY_COPY,
  CALENDAR_ENTRY_CHIP,
  CLEAN_STREAK_MILESTONE,
  FIXED_BILL_SAFE_NOTE,
  longDateLabel,
  type CalendarCell,
  type CalendarEntry,
} from '@/lib/data/calendar'
import { categoryVisualFor } from './transaction-category-visual'

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
     3C  Daftar uang yang BENAR-BENAR tercatat di hari itu.

   PAKET 56 — yang dihapus dari panel ini beserta alasannya:
     • judul "Ramalan Tagihan" + badge `ramalan`, karena tidak ada lagi angka masa
       depan yang ditampilkan panel ini;
     • aksi [Bayar Sekarang], karena ia menandai lunas tanpa membayar apa pun
       (tidak ada baris kas, tidak ada saldo yang bergerak). Rumah tagihan adalah
       `/bills`, dan di sana "Lunas" memang menggerakkan uang (paket 51);
     • janji "Belum ada tagihan terjadwal" untuk hari mendatang — diganti empty
       state jujur yang mengarahkan user ke tombol catat di atasnya.

   Sticky di desktop (`lg:sticky lg:top-8`) supaya saat halaman digulir, detail
   tanggal tetap terlihat.
   ────────────────────────────────────────────────────────────────────────── */

/** micro-badge relatif di kepala panel detail tanggal.
 *  "Hari Ini" = pil forest dengan titik hidup; hari lain = aksen tipografis
 *  kecil (titik warna + angka tabular), TANPA kotak — supaya kepala panel
 *  tetap tenang dan tanggal panjang di bawahnya yang jadi fokus. */
function relativeBadge(cell: CalendarCell) {
  if (cell.isToday) return { text: 'Hari Ini', tone: 'today' as const }
  if (cell.daysFromToday > 0) {
    return {
      text: cell.daysFromToday === 1 ? 'Besok' : `${cell.daysFromToday} hari lagi`,
      tone: 'ahead' as const,
    }
  }
  return {
    text: cell.daysFromToday === -1 ? 'Kemarin' : `${Math.abs(cell.daysFromToday)} hari lalu`,
    tone: 'behind' as const,
  }
}

export function CashflowInspector({
  cell,
  masked,
  dailyAverage,
  onAddNote,
}: {
  cell: CalendarCell | null
  masked: boolean
  /** rata-rata belanja variabel per hari — pembanding pesan "boros" */
  dailyAverage: number
  /** buka `AddCalendarNoteSheet` untuk tanggal yang sedang dipilih */
  onAddNote: () => void
}) {
  if (!cell) {
    return (
      <aside className="rounded-[2rem] bg-cream p-5 shadow-[0_4px_24px_-4px_rgba(0,0,0,0.06)] ring-1 ring-soil/12 lg:sticky lg:top-8">
        <h2 className="font-display text-[18px] font-medium tracking-tight text-forest">
          {CALENDAR_DAY_COPY.pickTitle}
        </h2>
        <p className="mt-1 text-[12.5px] text-forest/50">{CALENDAR_DAY_COPY.pickBody}</p>
      </aside>
    )
  }

  const relative = relativeBadge(cell)
  const streakMilestone = cell.cleanDay && cell.streak >= CLEAN_STREAK_MILESTONE
  /* PAKET 56: satu-satunya isi hari = entri yang benar-benar tercatat */
  const isEmptyDay = cell.entries.length === 0
  /* hari yang cuma berisi tagihan tetap → beri tahu user bahwa itu netral */
  const plannedOnly = cell.fixedSpend > 0 && cell.variableSpend === 0
  /* rincian cuma ditulis kalau memang ada lebih dari satu jenis uang di hari itu
     — kalau hanya satu, baris ringkasan di atas sudah mewakilinya */
  const breakdown = [
    cell.variableSpend > 0 ? `Variabel ${maskMoney(cell.variableSpend, masked)}` : null,
    cell.fixedSpend > 0 ? `Terjadwal ${maskMoney(cell.fixedSpend, masked)}` : null,
    cell.moved > 0 ? `Pindah dana ${maskMoney(cell.moved, masked)}` : null,
  ].filter((part): part is string => part !== null)

  return (
    <aside className="flex flex-col rounded-[2rem] bg-cream p-5 shadow-[0_4px_24px_-4px_rgba(0,0,0,0.06)] ring-1 ring-soil/12 lg:sticky lg:top-8">
      {/* ── 3A. TANGGAL + RINGKASAN SATU BARIS ───────────────────────────── */}
      <div className="flex items-center gap-2">
        {relative.tone === 'today' ? (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-forest px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-mint">
            <span className="relative flex size-1.5" aria-hidden>
              <span className="absolute inline-flex size-full animate-ping rounded-full bg-mint/70 motion-reduce:animate-none" />
              <span className="relative inline-flex size-1.5 rounded-full bg-mint" />
            </span>
            {relative.text}
          </span>
        ) : (
          <span className="inline-flex items-center gap-1.5 text-[10.5px] font-semibold uppercase tracking-[0.14em] tabular-nums text-forest/40">
            <span
              aria-hidden
              className={cn(
                'size-1.5 rounded-full',
                relative.tone === 'ahead' ? 'bg-forest/30' : 'bg-soil/40',
              )}
            />
            {relative.text}
          </span>
        )}
      </div>

      <h2 className="mt-2 font-display text-[20px] font-medium leading-tight tracking-tight text-forest">
        {longDateLabel(cell.date)}
      </h2>

      {/* ringkasan nominal: hanya menulis bagian yang memang ada isinya */}
      <p className="mt-1.5 flex flex-wrap items-center gap-x-2.5 gap-y-0.5 text-[12.5px] font-medium tabular-nums">
        {cell.income > 0 && <span className="text-forest">+{maskMoney(cell.income, masked)} masuk</span>}
        {cell.totalSpend > 0 && (
          <span className="text-forest/70">−{maskMoney(cell.totalSpend, masked)} keluar</span>
        )}
        {cell.income === 0 && cell.totalSpend === 0 && (
          <span className="font-medium text-forest/40">{CALENDAR_DAY_COPY.neutralSummary}</span>
        )}
      </p>
      {breakdown.length > 1 && (
        <p className="mt-1 text-[11.5px] text-forest/40">{breakdown.join(' · ')}</p>
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
        <p className="mt-3 flex items-start gap-2 text-[11.5px] leading-relaxed text-forest/45">
          <CalendarCheck className="mt-0.5 size-3.5 shrink-0 text-forest/30" strokeWidth={2.4} />
          <span>{FIXED_BILL_SAFE_NOTE}</span>
        </p>
      )}
      {streakMilestone && (
        <p className="mt-3 flex items-start gap-2 text-[11.5px] leading-relaxed text-forest/45">
          <Sparkles className="mt-0.5 size-3.5 shrink-0 text-hud-amber" strokeWidth={2.4} />
          <span>{cell.streak} hari beruntun tanpa belanja variabel 🌱</span>
        </p>
      )}

      {/* ── 3B. ZERO-FRICTION BACKDATING ─────────────────────────────────── */}
      <button
        type="button"
        onClick={onAddNote}
        className="mt-4 inline-flex h-11 w-full items-center justify-center gap-2 rounded-2xl bg-forest px-4 text-[13px] font-medium text-mint shadow-[0_16px_34px_-20px_rgba(69,89,78,0.9)] transition-colors hover:bg-forest-soft active:scale-[0.99]"
      >
        <Plus className="size-4" strokeWidth={2.8} />
        {CALENDAR_DAY_COPY.addNote(cell.day)}
      </button>


      {/* ── 3C. DAFTAR CATATAN HARI ITU (hanya yang benar-benar tercatat) ──── */}
      <section className="mt-5 border-t border-soil/12 pt-4">
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-[11px] font-semibold uppercase tracking-[0.12em] text-forest/45">
            {CALENDAR_DAY_COPY.listTitle(cell.isFuture)}
          </h3>
          <span className="text-[11px] font-medium tabular-nums text-forest/40">
            {CALENDAR_DAY_COPY.countLabel(cell.entries.length)}
          </span>
        </div>

        {isEmptyDay ? (
          /* hari kosong: masa depan tidak dijanjikan apa pun (dulu "Belum ada
             tagihan terjadwal"), hari yang sudah lewat dapat pesan menenangkan.
             Keduanya menunjuk ke tombol catat di atas — bukan kotak mati. */
          <div className="mt-4 flex flex-col items-center px-2 pb-2 text-center">
            <span aria-hidden className="text-[22px] leading-none opacity-80">
              {cell.isFuture
                ? CALENDAR_DAY_COPY.emptyFuture.emoji
                : CALENDAR_DAY_COPY.emptyPast.emoji}
            </span>
            <p className="mt-2 font-display text-[13px] font-medium tracking-tight text-forest">
              {cell.isFuture
                ? CALENDAR_DAY_COPY.emptyFuture.title
                : CALENDAR_DAY_COPY.emptyPast.title}
            </p>
            <p className="mt-1 max-w-[16rem] text-[11.5px] leading-relaxed text-forest/45">
              {cell.isFuture
                ? CALENDAR_DAY_COPY.emptyFuture.body
                : CALENDAR_DAY_COPY.emptyPast.body}
            </p>
          </div>
        ) : (
          <ul
            data-lenis-prevent
            className="mt-1 flex max-h-[21rem] flex-col divide-y divide-soil/10 overflow-y-auto pr-0.5"
          >
            {cell.entries.map((entry) => (
              <CashflowEntryRow
                key={entry.id}
                entry={entry}
                masked={masked}
                deficitDay={cell.tone === 'deficit'}
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
   terasa lebih tenang. Label chip-nya tinggal di `lib/data/calendar.ts`
   (`CALENDAR_ENTRY_CHIP`) supaya tagihan tetap berbunyi sama dengan legenda
   kalender — tidak ada dua versi label di dua berkas.

   PAKET 56: baris ini tidak lagi punya cabang ramalan — tidak ada chip
   "ramalan", tidak ada [Bayar Sekarang], tidak ada "Menunggu masuk otomatis".
   Yang tampil hanya catatan yang benar-benar ada. */
function CashflowEntryRow({
  entry,
  masked,
  deficitDay,
}: {
  entry: CalendarEntry
  masked: boolean
  /** hari itu ditandai boros → nominal variabel ditebalkan plum */
  deficitDay: boolean
}) {
  const chip = CALENDAR_ENTRY_CHIP[entry.type]
  const isIncome = entry.type === 'income'
  const isMovement = entry.type === 'money_movement'

  return (
    <li className="flex items-start gap-3 py-3.5 first:pt-2 last:pb-1">
      <span aria-hidden className="mt-0.5 shrink-0 text-[15px] leading-none">
        {entry.emoji}
      </span>

      <span className="min-w-0 flex-1">
        <span className="block truncate text-[13px] font-medium text-forest">{entry.name}</span>
        <span className="mt-1 flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-[11px] text-forest/40">
          <span className={cn('font-medium', chip.className)}>{chip.label}</span>
          <span aria-hidden className="text-forest/20">
            ·
          </span>
          {/* chip kategori (paket 78) — memakai tabel kategori yang SAMA dengan
              Dashboard & Riwayat (`transaction-category-visual`), jadi kategori
              di panel kalender ini berwarna persis seperti di daftar lain. Chip
              TIPE di sebelahnya tetap milik bahasa kalender
              (`CALENDAR_ENTRY_CHIP`) — dua hal berbeda, dua label berbeda. */}
          <span
            className={cn(
              'shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-medium',
              categoryVisualFor(entry.category).chip,
            )}
          >
            {entry.category}
          </span>
          <span className="min-w-0 truncate">
            {entry.wallet}
            {entry.time ? ` · ${entry.time}` : ''}
          </span>
        </span>
      </span>

      <span
        className={cn(
          'shrink-0 text-right font-display text-[13px] font-medium tabular-nums',
          isIncome
            ? 'text-forest'
            : isMovement
              ? 'text-thistle'
              : deficitDay
                ? 'text-hud-terracotta'
                : 'text-forest/75',
        )}
      >
        {isIncome ? '+' : isMovement ? '⇄ ' : '−'}
        {maskMoney(entry.amount, masked)}
      </span>
    </li>
  )
}

