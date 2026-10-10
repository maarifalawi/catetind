'use client'

import { memo, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import {
  ArrowUpRight,
  ChevronRight,
  Pencil,
  ReceiptText,
  Sparkles,
  Sprout,
  Trash2,
  type LucideIcon,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { formatIDR } from '@/lib/wallets'
import { amountSign } from '@/lib/data/history'
import {
  HOME_MONEY_COPY,
  capHomeRecentRows,
  groupHomeMoneyRows,
  homeRowsInLastDays,
  summarizeHomeMoney,
  type HomeMoneyRow,
} from '@/lib/data/home-money'
import { cancelTransferRow, removeRow, useMoneyStore } from '@/lib/money/store'
import { homeMoneyRowsForContext } from '@/lib/money/context-filter'
import { useTodayISO } from '@/lib/use-today-iso'
import type { TransactionType } from '@/lib/types'
import { TransactionBottomSheet } from '@/components/dashboard/transaction-bottom-sheet'
import { categoryVisualFor, moneyRowVisualFor } from './transaction-category-visual'
import { useMoneyContext } from './money-context-provider'
import { usePrivacy } from './privacy-provider'

/**
 * Satu baris di kartu "Transaksi Terakhir" Home.
 *
 * `value` (angka) adalah SATU-SATUNYA sumber nominalnya; label `-Rp 85.000`
 * diturunkan dari angka itu lewat `moneyLabel()`. Dulu labelnya ditulis manual
 * DAN ringkasan di bawah kartu juga angka manual — begitu ada catatan baru
 * (paket 33), dua tempat itu tidak mungkin ikut bergerak. Sejak paket 35 barisnya
 * lahir dari `lib/data/home-money.ts` (satu sumber dengan kartu "Arus Uang"),
 * jadi nominal tidak lagi ditulis di komponen ini.
 */
type Transaction = {
  /** id unik — key React & sasaran hapus (judul bisa kembar: dua "Kopi") */
  id: string
  icon: LucideIcon
  title: string
  category: string
  time: string
  /** nominal asli (selalu positif; arah uang ditentukan `type`) */
  value: number
  /** ikut tipe transaksi app-wide, bukan cuma masuk/keluar — catatan baru dari
   *  panel input bisa berupa tabungan/transfer dan tidak boleh hilang di sini */
  type: TransactionType
  /* tile ikon: gradient + drop shadow warna per kategori (makin kuat saat hover) */
  tile: string
  /* latar baris SOFT per kategori (paket 68) — keluarga warna yang SAMA dengan
     `tile`, opasitas rendah supaya teks tetap kontras; inilah yang membuat daftar
     mudah dipindai alih-alih jadi dinding putih. */
  rowBg: string
  /* chip kategori di baris meta (paket 78) — tint keluarga yang SAMA dengan
     `tile`/`rowBg`, dipakai agar baris "kategori · jam" tidak jadi teks abu
     polos. Sumbernya satu tabel dengan Riwayat & Insight. */
  chip: string
}

type TransactionGroup = {
  label: string
  /* grup hari ini dapat dot leaf berdenyut */
  live?: boolean
  items: Transaction[]
}

/** label nominal satu baris — tanda arah dari kanon `amountSign`, angka dari `formatIDR` */
function moneyLabel(value: number, type: TransactionType): string {
  return `${amountSign(type)}${formatIDR(value)}`
}

/** warna nominal & badge arah per tipe — SATU sumber sejak paket 78: tabel
 *  `MONEY_ROW_VISUAL` (components/catetind/transaction-category-visual.tsx) yang
 *  `text`-nya sendiri menunjuk `MONEY_TONE` (lib/data/history). Tabel kedua
 *  `ROW_TONE` yang dulu hidup di file ini DICABUT: nominal pengeluaran di kartu
 *  ini pernah hijau pudar padahal Riwayat & Insight memakai terracotta. */

/*
 * ── PAKET 78 — TABEL KATEGORI PINDAH RUMAH ─────────────────────────────────
 * `CATEGORY_VISUAL`/`FALLBACK_VISUAL`/`SEED_VISUAL`/`visualFor()` yang sejak
 * paket 68 tinggal DI SINI sekarang ada di
 * `components/catetind/transaction-category-visual.tsx`, dan bagian murninya
 * (nama kategori → keluarga warna) di `lib/data/transaction-category.ts`.
 * Alasannya satu: halaman Riwayat & Insight menampilkan transaksi yang SAMA,
 * jadi ia harus membaca tabel yang sama — bukan salinannya. Kartu ini sekarang
 * sekadar PEMAKAI tabel itu, persis seperti baris di Riwayat & Dompet Detail.
 */

/**
 * baris ringkasan Home (seed ATAU catatan sesi) → bentuk yang dipakai kartu ini.
 * Satu jalur konversi untuk dua sumber, jadi visual kategori mustahil berbeda
 * antara catatan lama & catatan yang baru dicatat.
 */
function cardRow(row: HomeMoneyRow): Transaction {
  const visual = categoryVisualFor(row.category)
  return {
    id: row.id,
    icon: visual.icon,
    title: row.name,
    category: row.category,
    time: row.time,
    value: row.amount,
    type: row.type,
    tile: visual.tile,
    rowBg: visual.row,
    chip: visual.chip,
  }
}

/**
 * Kelompokkan catatan NYATA dari store jadi grup harian kartu ini (paket 58).
 *
 * Sumbernya baris LEDGER (`recordedTransactions()` → `homeMoneyRowFrom()`),
 * bukan lagi `HOME_MONEY_GROUPS` — konstanta seed demo berhenti menjadi sumber
 * angka Home (temuan AKAR A: setelah akun dikosongkan, kartu ini tetap terisi
 * angka contoh). Label grup & urutannya TURUNAN dari tanggal baris
 * (`groupHomeMoneyRows()`), jadi catatan yang tanggalnya diedit pun pindah
 * kelompok dengan jujur ("Hari ini" / "Kemarin" / "21 Sep").
 *
 * Visual tiap baris tetap dari `cardRow()` — satu jalur konversi, jadi catatan
 * baru & baris lama tidak mungkin beda tampilan.
 */
function listGroups(rows: HomeMoneyRow[], todayIso: string): TransactionGroup[] {
  return groupHomeMoneyRows(rows, todayIso).map((group) => ({
    label: group.label,
    live: group.live,
    items: group.rows.map(cardRow),
  }))
}



/* offset item kumulatif per grup dihitung ulang di dalam komponen (`delays`)
   dari grup yang MASIH tampil — angka statis di tingkat modul dulu tidak pernah
   dipakai lagi setelah baris bisa dihapus, jadi ia dibuang di paket 33. */


/**
 * Baris transaksi swipeable (tabel gesture Domain 3D):
 * geser KANAN → reveal tombol "Edit" (olive) · geser KIRI → reveal "Hapus" (plum).
 * Works via pointer events — mouse drag di desktop & touch di mobile.
 */
function SwipeRow({
  tx,
  delay,
  onDelete,
}: {
  tx: Transaction
  delay: number
  onDelete: () => void
}) {
  const { hide } = usePrivacy()
  const [dx, setDx] = useState(0)
  const [dragging, setDragging] = useState(false)
  const startX = useRef<number | null>(null)
  const moved = useRef(false)
  /* nada + badge arah tipe ini — SATU tabel bersama dengan Riwayat & Insight
     (`MONEY_ROW_VISUAL`, paket 78); nominalnya juga dari sini, bukan tabel kedua */
  const tone = moneyRowVisualFor(tx.type)

  const clamp = (v: number) => Math.max(-REVEAL, Math.min(REVEAL, v))

  const onPointerDown = (e: React.PointerEvent<HTMLButtonElement>) => {
    startX.current = e.clientX
    moved.current = false
    e.currentTarget.setPointerCapture(e.pointerId)
  }
  const onPointerMove = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (startX.current === null) return
    const d = e.clientX - startX.current
    if (Math.abs(d) > 6) {
      moved.current = true
      setDragging(true)
    }
    setDx(clamp(d))
  }
  const settle = () => {
    if (startX.current === null) return
    startX.current = null
    setDragging(false)
    setDx((v) => (Math.abs(v) > 44 ? Math.sign(v) * REVEAL : 0))
  }
  /* klik biasa tetap jalan — tap tanpa geser dianggap buka detail */
  const onClick = (e: React.MouseEvent) => {
    if (moved.current || dx !== 0) {
      e.preventDefault()
      e.stopPropagation()
      setDx(0)
    }
  }

  const exposed = Math.abs(dx) / REVEAL

  return (
    <li className="relative select-none overflow-hidden rounded-2xl">
      {/* aksi kanan — swipe KIRI (hapus) */}
      <button
        type="button"
        aria-label={`Hapus ${tx.title}`}
        onClick={onDelete}
        className="absolute inset-y-0 right-0 flex w-[84px] flex-col items-center justify-center gap-1 rounded-r-2xl bg-plum/15 text-plum transition-opacity"
        style={{ opacity: dx < 0 ? exposed : 0, pointerEvents: dx < -20 ? 'auto' : 'none' }}
      >
        <Trash2 className="size-4" strokeWidth={2.2} />
        <span className="text-[10px] font-medium">Hapus</span>
      </button>

      {/* aksi kiri — swipe KANAN (edit) */}
      <button
        type="button"
        aria-label={`Edit ${tx.title}`}
        onClick={() => setDx(0)}
        className="absolute inset-y-0 left-0 flex w-[84px] flex-col items-center justify-center gap-1 rounded-l-2xl bg-sage text-forest transition-opacity"
        style={{ opacity: dx > 0 ? exposed : 0, pointerEvents: dx > 20 ? 'auto' : 'none' }}
      >
        <Pencil className="size-4" strokeWidth={2.2} />
        <span className="text-[10px] font-medium">Edit</span>
      </button>

      {/* konten baris */}
      <button
        type="button"
        aria-label={`${tx.title}, ${tx.category}, ${hide(moneyLabel(tx.value, tx.type))}`}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={settle}
        onPointerCancel={settle}
        onClick={onClick}
        className={cn(
          /* latar baris = warna SOFT kategori (`tx.rowBg`, paket 68) — ini yang
             bikin daftar gampang dipindai. `bg-cream`/`hover:bg-cream`/
             `focus-visible:bg-cream` lama DIHAPUS di sini: kalau tidak, ia
             menutupi warna kategorinya. Arah hover sekarang cuma menaikkan
             opasitas tint (kelas `hover:bg-*` sudah ikut di dalam `rowBg`) plus
             bayangan naik. */
          'group relative flex w-full cursor-pointer touch-pan-y items-center gap-3 rounded-2xl px-2.5 py-3 text-left outline-none transition-[background,box-shadow,transform] duration-200 animate-[row-in_0.5s_ease_backwards] hover:shadow-[0_10px_24px_-14px_rgba(0,0,0,0.35)] focus-visible:ring-2 focus-visible:ring-forest/20',
          tx.rowBg,
        )}
        style={{
          transform: `translateX(${dx}px)`,
          transitionDuration: dragging ? '0ms' : undefined,
          animationDelay: `${delay}ms`,
        }}
      >
        {/* wrapper tile — badge di luar supaya tidak ke-clip overflow-hidden */}
        <span className="relative shrink-0">
          <span
            className={cn(
              'relative flex size-11 items-center justify-center overflow-hidden rounded-2xl transition-all duration-300 animate-[tile-pop_0.55s_cubic-bezier(0.34,1.56,0.64,1)_backwards] group-hover:-translate-y-0.5 group-hover:-rotate-6 group-hover:scale-105',
              tx.tile,
            )}
            style={{ animationDelay: `${delay + 140}ms` }}
          >
            {/* kilau atas ala kaca */}
            <span
              aria-hidden
              className="absolute inset-x-0 top-0 h-1/2 bg-gradient-to-b from-cream/60 to-transparent"
            />
            {/* shine sweep saat hover */}
            <span
              aria-hidden
              className="absolute inset-0 -translate-x-[110%] skew-x-12 bg-gradient-to-r from-transparent via-cream/70 to-transparent transition-transform duration-700 ease-out group-hover:translate-x-[110%]"
            />
            <tx.icon
              className="relative size-5 drop-shadow-sm transition-transform duration-300 group-hover:scale-110"
              strokeWidth={2.2}
            />
          </span>
          {/* badge arah — masuk ↙ mint solid, keluar ↗ plum solid, pindah dana ⇄
              tinta netral; glyph & kelasnya dari SATU tabel bersama (`MONEY_ROW_VISUAL`) */}
          <span
            className={cn(
              'absolute -bottom-1 -right-1 flex size-5 items-center justify-center rounded-full shadow-sm ring-2 ring-cream transition-transform duration-300 animate-[fade-pop_0.4s_ease_backwards] group-hover:scale-110',
              tone.badge,
            )}
            style={{ animationDelay: `${delay + 280}ms` }}
          >
            <tone.icon className="size-3" strokeWidth={3} aria-hidden />
          </span>
        </span>

        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-medium text-forest">
            {tx.title}
          </span>
          {/* baris meta/notes (paket 78): kategori jadi CHIP bertint keluarga yang
              sama — dulu teks abu polos, jadi baris kategori hilang di antara
              nominal & jam. Jamnya tetap murni teks. `min-w-0 truncate` di chip
              menjaga baris ini tetap muat di 375px. */}
          <span className="mt-0.5 flex min-w-0 items-center gap-1.5 text-[11px] text-forest/45">
            <span
              className={cn(
                'min-w-0 truncate rounded-full px-1.5 py-0.5 text-[10px] font-medium',
                tx.chip,
              )}
            >
              {tx.category}
            </span>
            <span className="shrink-0">{tx.time}</span>
          </span>
        </span>

        <span
          className={cn(
            'shrink-0 text-sm font-medium tabular-nums',
            tone.text,
          )}
        >
          {hide(moneyLabel(tx.value, tx.type))}
        </span>

        {/* Affordance geser yang RAPI (audit "Micro-Interaction"): dulu ada DUA
            chevron bertumpuk yang saling menggeser dan terlihat berantakan.
            Sekarang SATU chevron di dalam lingkaran tipis — pola "arrow in a
            chip" yang sudah dipakai tombol "Lihat semua" di header kartu ini —
            dengan hover halus (lingkaran terisi forest + panah bergeser) memakai
            token warna & transisi design system yang sudah ada. */}
        <span className="ml-1 flex size-6 shrink-0 items-center justify-center rounded-full bg-cream text-forest/30 ring-1 ring-soil/12 transition-all duration-300 group-hover:bg-forest group-hover:text-mint group-hover:ring-forest/20">
          <ChevronRight className="size-3.5 transition-transform duration-300 group-hover:translate-x-0.5" strokeWidth={2.6} />
        </span>
      </button>
    </li>
  )
}

/** Dibungkus `memo` — kartu ini tidak menerima props, jadi tidak perlu ikut
 *  re-render saat HomeScreen mengubah state popup (lihat catatan di
 *  cash-flow-card.tsx). Baris-baris swipe tetap punya state sendiri. */
export const RecentTransactionsCard = memo(function RecentTransactionsCard() {
  const { hide } = usePrivacy()
  /* "hari ini" dari jam perangkat — `''` pada render pertama (hidrasi aman) */
  const today = useTodayISO()
  /* Catatan NYATA dari SATU store uang (`lib/money/store.ts`). Sejak paket 58
     kartu ini TIDAK lagi menggabung `HOME_MONEY_GROUPS` (seed demo): campuran
     itu yang membuat kartu tetap berisi lima baris contoh setelah akun
     dikosongkan (temuan AKAR A). Satu sumber: baris ledger — tombstone sudah
     dibuang `recordedTransactions()`, hapusnya lewat `removeRow()` (satu jalur
     tulis, sama seperti Riwayat & /wallet/[id]). */
  const snapshot = useMoneyStore()
  const { context } = useMoneyContext()
  const rows = useMemo(() => homeMoneyRowsForContext(snapshot, context), [snapshot, context])

  /* 58.6 — daftar dibatasi 7 hari kalender terakhir; yang lebih tua tetap utuh
     di /history (tombol "Lihat semua" di kepala kartu). Sebelum "hari ini"
     diketahui, penyaringan dilewati supaya HTML server = render pertama client.
     Paket 64 menambah batas JUMLAH; paket 66 menurunkannya ke 5 baris supaya
     kartu ini tetap ringkasan & dashboard berakhir simetris — `/history` yang
     menyimpan daftar penuh. */
  const recentRows = useMemo(
    () => capHomeRecentRows(homeRowsInLastDays(rows, today)),
    [rows, today],
  )
  const visibleGroups = useMemo(() => listGroups(recentRows, today), [recentRows, today])
  const totalItems = recentRows.length

  /* Ringkasan periode TURUNAN dari baris yang sama (uang masuk/keluar; pindah
     dana netral, sama seperti kanon `summarizeTransactions`). Labelnya
     `HOME_MONEY_COPY.period` ("Bulan ini") — string yang sama dengan kartu
     "Arus Uang" di layar ini. */
  const period = useMemo(() => {
    const inMonth = today
      ? rows.filter((row) => row.date.slice(0, 7) === today.slice(0, 7))
      : rows
    return summarizeHomeMoney(inMonth)
  }, [rows, today])

  /**
   * Hapus baris lewat SATU pintu: `removeRow()` menulis tombstone di store, jadi
   * barisnya hilang dari SEMUA halaman yang menampilkan catatan — Home, `/history`,
   * dan `/wallet/[id]` — dan tetap hilang setelah pindah halaman. Itu alasan dulu
   * kartu ini "menyembunyikan" barisnya sendiri saja: bus tidak punya API hapus.
   *
   * PAKET 55 — baris `transfer` tidak cukup di-tombstone: ia menggerakkan DUA
   * dompet, jadi uangnya harus dikembalikan ke kedua sisi. `cancelTransferRow()`
   * melakukannya (dan mengembalikan `null` kalau barisnya bukan pindah dana,
   * mis. catatan demo, atau uangnya sudah terpakai di dompet tujuan) — kalau
   * `null`, hapus biasa yang berlaku. Kartu ini tidak memasang toast Undo, jadi
   * pembatalan di sini bersifat final; jejaknya tetap terbaca di Riwayat sebagai
   * dua baris koreksi bernama jelas.
   */
  const deleteTx = (tx: { id: string; type: TransactionType }) => {
    const cancellation = tx.type === 'transfer' ? cancelTransferRow(tx.id) : null
    if (!cancellation) removeRow(tx.id)
  }

  /* delay staggered kumulatif — direcompute dari grup yang masih tampil */
  const delays: number[] = (() => {
    let acc = 0
    return visibleGroups.map((g) => {
      const a = acc
      acc += g.items.length
      return a
    })
  })()

  return (
    <div className="flex h-full flex-col rounded-[2rem] bg-cream p-6 ring-1 ring-soil/12">
      {/* header — konsisten dengan kartu lain */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <span className="flex size-8 items-center justify-center rounded-full bg-sage text-forest">
            <ReceiptText className="size-4" strokeWidth={2.4} />
          </span>
          <div>
            <p className="text-sm font-medium text-forest">{HOME_MONEY_COPY.txnTitle}</p>
            <p className="text-xs text-forest/45">{HOME_MONEY_COPY.txnSubtitle}</p>
          </div>
        </div>
        <Link
          href="/history"
          className="group/link flex items-center gap-1.5 rounded-full bg-sage py-1.5 pl-3 pr-1.5 text-[11px] font-medium text-forest transition-colors duration-300 hover:bg-forest hover:text-mint"
        >
          {HOME_MONEY_COPY.seeAll}
          <span className="flex size-4 items-center justify-center rounded-full bg-forest text-mint transition-colors duration-300 group-hover/link:bg-mint group-hover/link:text-forest">
            <ArrowUpRight className="size-2.5" strokeWidth={2.6} />
          </span>
        </Link>
      </div>

      {totalItems === 0 ? (
        /* ── Empty State I — copy nurturing (PRD State I) ── */
        <div className="mx-2 mt-4 flex flex-col items-center rounded-2xl border-2 border-dashed border-forest/15 bg-cream/50 px-6 py-10 text-center">
          <span className="flex size-12 items-center justify-center rounded-full bg-sage text-forest">
            <Sprout className="size-6" strokeWidth={1.8} />
          </span>
          <p className="mt-4 text-sm font-medium text-forest">
            {HOME_MONEY_COPY.txnEmptyTitle}
          </p>
          <p className="mt-1 text-xs text-forest/50">
            {HOME_MONEY_COPY.txnEmptyBody}
          </p>
          {/* CTA empty state: dulu tombol MATI (bisa dipencet, tidak terjadi apa
              pun). Sekarang membuka Transaction Input Engine — pola `trigger=`
              yang sama dengan FAB di bottom nav dan tombol di kartu dompet, jadi
              user bisa langsung mencatat tanpa keluar dari Home. */}
          <TransactionBottomSheet
            trigger={
              <button
                type="button"
                className="mt-4 rounded-full bg-forest px-5 py-2.5 text-[13px] font-medium text-cream transition-colors hover:bg-forest-soft active:scale-[0.97]"
              >
                {HOME_MONEY_COPY.txnEmptyCta}
              </button>
            }
          />
        </div>
      ) : (
        /* ── daftar transaksi — dikelompokkan per hari, SATU kolom.
           Kartu ini FULL-WIDTH (ROW 2 bento), jadi tiap transaksi tetap
           dirender sebagai baris HORIZONTAL (ikon · nama/kategori · nominal ·
           chevron) yang memakai lebar kartu dengan wajar — bukan grid
           multi-kolom (permintaan pemilik produk). Teksnya `truncate`, jadi
           baris tidak pernah melar walau lebar kartu berubah. */
        <div className="-mx-2 mt-4 flex flex-col gap-4">
          {visibleGroups.map((group, gi) => (
            <section key={group.label}>
              <div className="mx-2 flex items-center gap-2">
                <p className="text-[10px] font-medium tracking-[0.14em] text-forest/40 uppercase">
                  {group.label}
                </p>
                {group.live && (
                  <span className="relative flex size-1.5">
                    <span className="absolute inline-flex size-full animate-ping rounded-full bg-mint opacity-75" />
                    <span className="relative inline-flex size-1.5 rounded-full bg-mint" />
                  </span>
                )}
                <span className="h-px flex-1 bg-soil/8" />
              </div>

              <ul className="mx-2 mt-2 flex flex-col gap-1.5">
                {group.items.map((tx, i) => (
                  <SwipeRow
                    key={tx.id}
                    tx={tx}
                    delay={120 + (delays[gi] + i) * 70}
                    onDelete={() => deleteTx(tx)}
                  />
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}

      {/* insight periode — pola strip yang sama dengan kartu distribusi. Label
          periode & kata sambungnya dari `HOME_MONEY_COPY` (string yang SAMA
          dengan legend kartu "Arus Uang"), angkanya dari `period` (turunan). */}
      <div className="mx-auto mt-4 flex max-w-3xl items-center justify-center gap-2 rounded-2xl bg-cream px-4 py-2.5 text-center text-xs leading-relaxed text-forest/55">
        <Sparkles className="size-3.5 shrink-0 text-forest" strokeWidth={2.2} />
        <span>
          {HOME_MONEY_COPY.period}{' '}
          <b className="font-medium text-forest">{hide(`+${formatIDR(period.income)}`)}</b>{' '}
          {HOME_MONEY_COPY.txnInflow}{' '}
          <b className="font-medium text-forest">{hide(`-${formatIDR(period.expense)}`)}</b>{' '}
          {HOME_MONEY_COPY.txnOutflow}{' '}
          <b
            className={cn(
              'font-medium',
              /* negatif = pengeluaran lebih besar; tetap terracotta lembut, bukan merah
                 (kanon warna status: "lewat batas" tidak diteriakkan) */
              period.net < 0 ? 'text-hud-terracotta' : 'text-forest',
            )}
          >
            {hide(`${period.net < 0 ? '-' : '+'}${formatIDR(Math.abs(period.net))}`)}
          </b>
        </span>
      </div>
    </div>
  )
})

/* lebar area aksi yang terungkap saat swipe (px) */
const REVEAL = 84
