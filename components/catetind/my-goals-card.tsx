'use client'

import { memo } from 'react'
import Link from 'next/link'
import { ArrowUpRight, Goal, Plus, Sprout } from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  budgetPlantHref,
  fundPercentRounded,
  heroFundOf,
  sortFundsByUrgency,
  type SinkingFundItem,
} from '@/lib/data/budget'
import { HOME_GOALS_COPY } from '@/lib/data/home'
import { useLiveFunds } from '@/lib/money/funds-store'
import { PlantIllustration, STAGE_NAMES, type PlantStage } from './plant-illustration'
import { usePrivacy } from './privacy-provider'

/* ── SATU SUMBER: `INITIAL_SINKING_FUNDS` (paket 30) ─────────────────────────
   Kartu ini dulu menampilkan daftar tampilannya SENDIRI (satu goal utama + tiga
   mini goal, dua di antaranya tidak ada di data mana pun). Akibatnya ketiga
   tautannya terpaksa menunjuk `/budget` generik, karena menautkan goal tampilan
   ke `/budget/1` ("Tiket Konser Coldplay") akan jadi tautan yang berbohong.
   Masalahnya cuma pindah, belum selesai: user menekan tautan yang menjanjikan
   satu celengan, lalu tidak menemukan celengan itu di halaman tujuan — persis
   pola yang dilarang kanon "jujur di setiap klaim" (PRD 244).

   Sekarang kartu membaca daftar yang SAMA dengan /budget & /budget/<id>:
     • hero + baris mini  → `heroFundOf()` & `sortFundsByUrgency()` (lib/data)
     • persen & tahap     → `fundPercentRounded()` + `stageFromPercent(pct)`
     • tiap panah         → `/budget/<id>` celengan yang benar-benar ada
     • tombol `+`         → `budgetPlantHref()` (`/budget?tanam=1`), satu-satunya
                            jalur yang memang membuka sheet "Tanam Celengan
                            Baru" (sheet itu milik state `funds` di /budget;
                            menulis celengan dari Home = janji palsu).

   Kartu ini sengaja GLOBAL (tanpa saringan `useMoneyContext()`) — alasannya
   ditulis di `HOME_GOALS_COPY` (lib/data/home.ts), berdampingan dengan copy-nya
   supaya keputusan itu tidak bisa hilang dari konteksnya. */

/* ── Metafora Tanaman untuk Sinking Fund (PRD Domain 2C & 3B) ────────────────
   Sebelumnya Tabungan Impian digambar sebagai circular progress bar biasa,
   sementara widget "Tanamanmu" berdiri sendiri tanpa konteks — jadi gamifikasi
   terasa gimmick dan user tidak tahu APA yang membuat tanaman itu tumbuh.

   Sekarang keduanya dijahit jadi satu: progress tabungan = TAHAP tanaman.
   Setiap setoran = menyiram. Tidak ada angka streak, tidak ada hukuman.

   Dua helper di bawah tinggal di sini (bukan disalin ke kartu lain) supaya
   tabel tahap Home hanya ada SATU: kartu Tabungan Impian memakai keduanya, dan
   widget Tanamanmu memakai keduanya juga — pada layar yang sama keduanya harus
   menyebut tahap yang sama untuk celengan yang sama. */

/** batas bawah tiap tahap dalam persen — SATU tabel untuk `stageFromPercent()`
 *  dan `stageBandProgress()`, jadi keduanya tidak mungkin berbeda pendapat */
const STAGE_FLOOR = [0, 25, 50, 80] as const

export function stageFromPercent(pct: number): PlantStage {
  if (pct < STAGE_FLOOR[1]) return 1 // Benih
  if (pct < STAGE_FLOOR[2]) return 2 // Tunas
  if (pct < STAGE_FLOOR[3]) return 3 // Tanaman Muda
  return 4 // Berbunga
}

/** progres DI DALAM tahap yang sedang berjalan (0–100) — jarak ke tahap
 *  berikutnya. Dipakai bar "menuju tahap berikutnya" di widget Tanamanmu supaya
 *  angkanya TURUNAN dari progres celengan, bukan angka pajangan terpisah yang
 *  bisa bertabrakan dengan persen di kartu sebelahnya. Tahap 4 = tahap terakhir
 *  (tidak ada tahap berikutnya), jadi barnya penuh. */
export function stageBandProgress(pct: number): number {
  const stage = stageFromPercent(pct)
  if (stage === 4) return 100
  const floor = STAGE_FLOOR[stage - 1]
  const ceiling = STAGE_FLOOR[stage]
  return Math.max(0, Math.round((((pct - floor) / (ceiling - floor)) * 100)))
}

/* label ringkas untuk batang tumbuh 4 titik */
const SHORT_STAGE: Record<PlantStage, string> = {
  1: 'Benih',
  2: 'Tunas',
  3: 'Muda',
  4: 'Berbunga',
}

/* warna pastel yang benar-benar berbeda per goal (olive · daisy · plum) —
   senada dengan palet distribusi pengeluaran, jadi bahasa warna app konsisten */
const TINTS = [
  'bg-[#b5b987]/25 text-forest',
  'bg-[#ffb885]/25 text-[#b89191]',
  'bg-[#b89191]/15 text-hud-terracotta',
]

/** batang tumbuh: benih → tunas → muda → berbunga. Warnanya menanjak dari
 *  cokelat tanah ke olive lalu leaf — "tumbuh", bukan "progress bar". */
function GrowthTrack({ pct, stage }: { pct: number; stage: PlantStage }) {
  return (
    <div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-soil/[0.09]">
        <div
          className="h-full rounded-full bg-gradient-to-r from-[#b89191] via-[#b5b987] to-mint"
          style={{ width: `${pct}%` }}
          aria-hidden
        />
      </div>
      <div className="mt-1.5 flex items-center justify-between gap-1">
        {([1, 2, 3, 4] as PlantStage[]).map((s) => (
          <span
            key={s}
            className={cn(
              'text-[9.5px] font-medium tabular-nums transition-colors',
              s === stage
                ? 'font-medium text-forest'
                : s < stage
                  ? 'text-forest/45'
                  : 'text-forest/30',
            )}
          >
            {SHORT_STAGE[s]}
          </span>
        ))}
      </div>
    </div>
  )
}

/* ── KEPALA KARTU ────────────────────────────────────────────────────────────
   Dipisah jadi komponen sendiri karena dipakai kartu berisi DAN empty state.
   Tombol `+` ada di dua-duanya, dan ia bukan jalan buntu: `/budget?tanam=1`
   benar-benar membuka sheet "Tanam Celengan Baru". */
function CardHeader() {
  return (
    <div className="flex items-center justify-between px-1 pt-1">
      <div className="flex items-center gap-2.5">
        <span className="flex size-8 items-center justify-center rounded-full bg-sage text-forest">
          <Goal className="size-4" strokeWidth={2.4} />
        </span>
        <div>
          <p className="text-sm font-medium text-forest">{HOME_GOALS_COPY.title}</p>
        </div>
      </div>
      <Link
        href={budgetPlantHref()}
        aria-label={HOME_GOALS_COPY.addLabel}
        className="flex size-8 items-center justify-center rounded-full bg-cream text-forest ring-1 ring-soil/16 transition-colors hover:bg-sage focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-forest/25 active:scale-95"
      >
        <Plus className="size-4" strokeWidth={2.4} aria-hidden />
      </Link>
    </div>
  )
}

/* ── EMPTY STATE ─────────────────────────────────────────────────────────────
   Mock hari ini selalu berisi 3 celengan, jadi cabang ini belum pernah tampil —
   dan itu justru alasannya ditulis: begitu daftarnya datang dari Supabase, kartu
   kosong tidak boleh jadi kotak tanpa kalimat. CTA-nya tautan nyata ke
   `/budget?tanam=1`, bukan tombol mati. */
function EmptyGoals() {
  return (
    <div className="mt-4 rounded-2xl border border-dashed border-oat bg-cream/60 px-5 py-8 text-center">
      {/* ikon (bukan emoji di JSX): copy kartu ini seluruhnya tinggal di
          lib/data/home.ts, jadi tidak ada literal yang perlu diaudit di sini */}
      <span
        aria-hidden
        className="mx-auto flex size-11 items-center justify-center rounded-full bg-sage text-forest"
      >
        <Sprout className="size-5" strokeWidth={2.2} />
      </span>
      <p className="mt-2 text-sm font-medium text-forest">{HOME_GOALS_COPY.emptyTitle}</p>
      <p className="mx-auto mt-1.5 max-w-[19rem] text-[12.5px] leading-relaxed text-forest/55">
        {HOME_GOALS_COPY.emptyBody}
      </p>
      <Link
        href={budgetPlantHref()}
        className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-forest px-4 py-2.5 text-[12.5px] font-medium text-cream transition-colors hover:bg-forest-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-forest/30 active:scale-95"
      >
        <Plus className="size-3.5" strokeWidth={3} aria-hidden />
        {HOME_GOALS_COPY.emptyCta}
      </Link>
    </div>
  )
}

/** Hero — tanaman sebagai wajah dari progress celengan yang paling perlu
 *  diingatkan (`heroFundOf()` di lib/data/budget.ts). Nama, nominal, persen, dan
 *  tahap di sini TURUNAN dari `fund`; tidak ada satu pun angka yang ditulis
 *  manual, jadi bagian mana pun bisa ditelusuri ke /budget/<id>-nya. */
function HeroFund({ fund }: { fund: SinkingFundItem }) {
  const { money } = usePrivacy()
  const pct = fundPercentRounded(fund)
  const stage = stageFromPercent(pct)

  return (
    <div className="relative mt-4 overflow-hidden rounded-2xl bg-gradient-to-b from-sage/70 via-cream to-cream p-4 ring-1 ring-soil/8 sm:p-5">
      {/* glow mint sangat lembut di belakang tanaman */}
      <div
        aria-hidden
        className="pointer-events-none absolute -left-6 top-6 h-28 w-40 rounded-full bg-mint/20 blur-3xl"
      />

      <div className="relative flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-forest">{fund.name}</p>
        </div>
        {/* panah = halaman detail celengan INI, jadi id yang dibuka pasti ada */}
        <Link
          href={`/budget/${fund.id}`}
          aria-label={HOME_GOALS_COPY.openDetail(fund.name)}
          className="flex size-7 shrink-0 items-center justify-center rounded-full bg-cream text-forest ring-1 ring-soil/12 transition-colors hover:bg-sage focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-forest/25"
        >
          <ArrowUpRight className="size-3.5" strokeWidth={2.4} aria-hidden />
        </Link>
      </div>

      {/* tanaman + tahap + batang tumbuh, sejajar supaya hemat tinggi */}
      <div className="relative mt-2 flex items-center gap-4">
        <PlantIllustration stage={stage} className="w-24 shrink-0 sm:w-28" />
        <div className="min-w-0 flex-1">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-cream/85 px-2.5 py-1 text-[11px] font-medium text-forest ring-1 ring-forest/10">
            <Sprout className="size-3" strokeWidth={2.4} aria-hidden />
            {HOME_GOALS_COPY.stageBadge(stage, STAGE_NAMES[stage])}
          </span>
          {/* kalimat penyemangat HANYA saat celengannya sudah penuh (tahap 4):
              teks berulang "Tiap setoran bikin tanaman ini naik tahap…" DIHAPUS
              (permintaan pemilik produk) — badge tahap + batang tumbuh di bawah
              sudah mengatakan hal yang sama tanpa mengulanginya tiap kali. */}
          {stage === 4 && (
            <p className="mt-2 text-[11.5px] leading-snug text-forest/55">
              {HOME_GOALS_COPY.heroBlurbBloom}
            </p>
          )}
          <div className="mt-2.5">
            <GrowthTrack pct={pct} stage={stage} />
          </div>
        </div>
      </div>

      {/* nominal — di luar area tanaman, angka besar tidak menimpa ilustrasi.
          Nominalnya milik celengan hero (bukan angka kartu terpisah), jadi
          tombol mata & halaman detail selalu bercerita hal yang sama. */}
      <div className="relative mt-4 border-t border-soil/12 pt-3.5">
        <div className="flex items-center justify-between gap-3">
          <p className="shrink-0 text-[11px] font-medium uppercase tracking-[0.12em] text-forest/40">
            {HOME_GOALS_COPY.savedLabel}
          </p>
          <p className="truncate text-base font-medium text-forest tabular-nums">
            {money(fund.current)}
          </p>
        </div>
        <div className="mt-1.5 flex items-center justify-between gap-3">
          <p className="shrink-0 text-[11px] font-medium uppercase tracking-[0.12em] text-forest/45">
            {HOME_GOALS_COPY.targetLabel}
          </p>
          <p className="truncate text-sm font-medium text-forest/55 tabular-nums">
            {money(fund.target)}
          </p>
        </div>
      </div>
    </div>
  )
}


/** Baris mini — satu celengan lain di daftar yang sama. SELURUH baris jadi
 *  tautan ke `/budget/<id>` celengan itu (sasaran tap ibu jari jadi jauh lebih
 *  lapang daripada ikon panah 24px), dan panahnya tinggal penanda arah. */
function MiniGoalRow({ fund, tintIndex }: { fund: SinkingFundItem; tintIndex: number }) {
  const pct = fundPercentRounded(fund)
  const stage = stageFromPercent(pct)

  return (
    <Link
      href={`/budget/${fund.id}`}
      aria-label={HOME_GOALS_COPY.openDetail(fund.name)}
      className="block rounded-xl bg-cream px-3.5 py-2.5 ring-1 ring-soil/8 transition-colors hover:bg-sage/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-forest/25"
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2">
          <span
            className={cn(
              'flex size-6 shrink-0 items-center justify-center rounded-full',
              TINTS[tintIndex % TINTS.length],
            )}
          >
            <Sprout className="size-3" strokeWidth={2.4} aria-hidden />
          </span>
          <p className="truncate text-[13px] font-medium text-forest">{fund.name}</p>
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          <span className="text-[10.5px] font-medium text-forest">{SHORT_STAGE[stage]}</span>
          <span className="text-xs font-medium text-forest/55 tabular-nums">{pct}%</span>
          {/* ArrowUpRight (bukan ChevronDown): ikon ini MENUJU halaman, bukan
              membuka baris — chevron ke bawah dulu menjanjikan expand yang
              tidak pernah ada */}
          <ArrowUpRight className="size-3.5 text-forest/35" strokeWidth={2.2} aria-hidden />
        </div>
      </div>
      {/* batang tumbuh mini: 4 segmen = 4 tahap */}
      <div className="mt-2 flex gap-1" aria-hidden>
        {([1, 2, 3, 4] as PlantStage[]).map((s) => (
          <span
            key={s}
            className={cn(
              'h-1.5 flex-1 rounded-full transition-colors',
              s <= stage ? 'bg-gradient-to-r from-[#b5b987] to-mint' : 'bg-soil/[0.09]',
            )}
          />
        ))}
      </div>
    </Link>
  )
}

/** Kartu Tabungan Impian — daftarnya sekarang datang dari STORE celengan
 *  (`useLiveFunds()`), bukan konstanta `INITIAL_SINKING_FUNDS`:
 *  celengan yang ditanam di /budget dan setoran dari /budget/<id> langsung
 *  terlihat di sini, dan sebaliknya. Sebelum paket 46 kartu ini membaca
 *  konstanta statis, jadi Home & /budget bisa menyebut progres yang berbeda.
 *  Sejak paket 60.2 daftarnya juga sudah disaring TOMBSTONE: celengan yang
 *  dihapus user tidak lagi tampil (dan tidak ikut dipotong di Jatah Hari Ini).
 *  Daftar awalnya tetap `INITIAL_SINKING_FUNDS` (lihat `SERVER_SNAPSHOT` di
 *  `lib/money/funds-store.ts`) — render server & render pertama client identik. */
export const MyGoalsCard = memo(function MyGoalsCard() {
  const funds = useLiveFunds()
  const hero = heroFundOf(funds)
  /* baris mini = SEMUA celengan selain hero; urutannya prioritas → progres
     (`sortFundsByUrgency`). Kurang dari 3 celengan ⇒ tampil apa adanya. */
  const rest = sortFundsByUrgency(funds).filter((fund) => fund.id !== hero?.id)

  return (
    <div className="flex h-full flex-col rounded-[2rem] bg-cream p-4 ring-1 ring-soil/12 sm:p-5">
      <CardHeader />
      {hero ? (
        <>
          <HeroFund fund={hero} />
          {rest.length > 0 && (
            <div className="mt-3">
              <p className="px-1 text-[11px] font-medium uppercase tracking-[0.12em] text-forest/40">
                {HOME_GOALS_COPY.restTitle(rest.length)}
              </p>
              {/* tiap celengan punya batang tumbuhnya sendiri (4 segmen), jadi
                  bahasa visualnya sama dengan tanaman hero di atas */}
              <div className="mt-2 flex flex-col gap-2">
                {rest.map((fund, i) => (
                  <MiniGoalRow key={fund.id} fund={fund} tintIndex={i} />
                ))}
              </div>
            </div>
          )}
        </>
      ) : (
        <EmptyGoals />
      )}
    </div>
  )
})

