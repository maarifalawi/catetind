'use client'

import { memo } from 'react'
import Link from 'next/link'
import { ArrowUpRight, Goal, Plane, Plus, Puzzle, ShieldCheck, Smartphone } from 'lucide-react'
import { cn } from '@/lib/utils'
import { AMOUNT_LG } from '@/lib/typography'
import {
  budgetPlantHref,
  fundPercentRounded,
  heroFundOf,
  monthlyNeeded,
  sortFundsByUrgency,
  type SinkingFundItem,
} from '@/lib/data/budget'
import { HOME_GOALS_COPY } from '@/lib/data/home'
import { useLiveFunds } from '@/lib/money/funds-store'
import type { PlantStage } from './plant-illustration'
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
                            jalur yang memang membuka sheet "Buat Celengan
                            Baru" (sheet itu milik state `funds` di /budget;
                            menulis celengan dari Home = janji palsu).

   Kartu ini sengaja GLOBAL (tanpa saringan `useMoneyContext()`) — alasannya
   ditulis di `HOME_GOALS_COPY` (lib/data/home.ts), berdampingan dengan copy-nya
   supaya keputusan itu tidak bisa hilang dari konteksnya. */

/* ── Tahap untuk Sinking Fund (PRD Domain 2C & 3B) ───────────────────────────
   Sebelumnya Tabungan Impian digambar sebagai circular progress bar biasa,
   sementara widget terpisah berdiri sendiri tanpa konteks — jadi gamifikasi
   terasa gimmick dan user tidak tahu APA yang menentukan tahapnya.

   Sekarang satu sumber: progress tabungan = TAHAP. Setiap setoran = satu
   kepingan terpasang. Tidak ada angka streak, tidak ada hukuman.

   Dua helper di bawah tinggal di sini (bukan disalin ke kartu lain) supaya
   tabel tahap Home hanya ada SATU: kartu Tabungan Impian memakai keduanya untuk
   badge & bar, dan kartu "Puzzle kamu" memakainya untuk papan puzzle — pada
   layar yang sama keduanya harus menyebut tahap yang sama untuk celengan yang
   sama. (Papannya sendiri sekarang HANYA di "Puzzle kamu"; kartu ini tidak lagi
   menggambar papan kembar — lihat catatan di `HeroFund`.) */

/** batas bawah tiap tahap dalam persen — SATU tabel untuk `stageFromPercent()`
 *  dan `stageBandProgress()`, jadi keduanya tidak mungkin berbeda pendapat */
const STAGE_FLOOR = [0, 25, 50, 80] as const

export function stageFromPercent(pct: number): PlantStage {
  if (pct < STAGE_FLOOR[1]) return 1 // Awal tersusun
  if (pct < STAGE_FLOOR[2]) return 2 // Setengah jalan
  if (pct < STAGE_FLOOR[3]) return 3 // Hampir lengkap
  return 4 // Puzzle lengkap
}

/** progres DI DALAM tahap yang sedang berjalan (0–100) — jarak ke tahap
 *  berikutnya. Dipakai bar "menuju tahap berikutnya" di kartu Puzzle kamu supaya
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

/* label ringkas untuk jalur tahap 4 titik */
const SHORT_STAGE: Record<PlantStage, string> = {
  1: 'Awal',
  2: 'Setengah',
  3: 'Hampir',
  4: 'Lengkap',
}

/* warna pastel yang benar-benar berbeda per goal (olive · daisy · plum) —
   senada dengan palet distribusi pengeluaran, jadi bahasa warna app konsisten */
const TINTS = [
  'bg-hud-sage/25 text-forest',
  'bg-hud-amber/25 text-hud-terracotta',
  'bg-hud-terracotta/15 text-hud-terracotta',
]

/** jalur tahap papan: awal tersusun → setengah jalan → hampir lengkap →
 *  puzzle lengkap. Warnanya menanjak dari terracotta ke olive lalu leaf —
 *  "kepingan yang makin terpasang", bukan progress bar generik. */
function GrowthTrack({ pct, stage }: { pct: number; stage: PlantStage }) {
  return (
    <div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-soil/[0.09]">
        <div
          className="h-full rounded-full bg-gradient-to-r from-hud-terracotta via-hud-sage to-mint"
          style={{ width: `${pct}%` }}
          aria-hidden
        />
      </div>
      <div className="mt-1.5 flex items-center justify-between gap-1">
        {([1, 2, 3, 4] as PlantStage[]).map((s) => (
          <span
            key={s}
            className={cn(
              'text-[10.5px] font-medium tabular-nums transition-colors',
              s === stage
                ? 'font-medium text-forest'
                : s < stage
                  ? 'text-forest-muted'
                  : 'text-forest-muted',
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
   Tombol `+` di kepala kartu DISEMBUNYIKAN saat daftar masih kosong: di keadaan
   itu tombol utama "Buat celengan" di dalam kartu melakukan hal yang persis
   sama, jadi dua tombol dengan aksi identik cuma bikin bingung. Begitu ada satu
   celengan, tombol `+` muncul lagi (ia bukan jalan buntu: `/budget?tanam=1`
   benar-benar membuka sheet "Buat Celengan Baru"). */
function CardHeader({ showAdd }: { showAdd: boolean }) {
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
      {showAdd && (
        <Link
          href={budgetPlantHref()}
          aria-label={HOME_GOALS_COPY.addLabel}
          className="flex size-8 items-center justify-center rounded-full bg-cream text-forest ring-1 ring-soil/16 transition-colors hover:bg-sage focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-forest/25 active:scale-95"
        >
          <Plus className="size-4" strokeWidth={2.4} aria-hidden />
        </Link>
      )}
    </div>
  )
}

/** ikon Lucide per chip contoh celengan. Data (`HOME_GOALS_COPY.emptyPopular`)
 *  hanya menyimpan `id` + label, jadi tidak ada emoji yang ikut ke data layer
 *  dan tidak ada nama ikon sebagai string yang gampang salah ketik: pemetaannya
 *  dijaga tipe (`id` chip wajib punya ikon di sini). */
const GOAL_IDEA_ICON: Record<
  (typeof HOME_GOALS_COPY.emptyPopular)[number]['id'],
  typeof Smartphone
> = {
  gadget: Smartphone,
  holiday: Plane,
  emergency: ShieldCheck,
}

/* ── EMPTY STATE ─────────────────────────────────────────────────────────────
   Struktur FINAL (tanpa paragraf, tanpa emoji, tanpa label contoh):
     ikon → "Belum ada celengan" → 3 chip contoh → tombol "Buat celengan".
   Chip tetap memprefill nama celengan lewat jalur yang SAMA dengan tombol utama
   (`/budget?tanam=1` → sheet "Buat Celengan Baru"), bukan tombol mati. */
function EmptyGoals() {
  return (
    <div data-catetind-empty className="mt-4 rounded-2xl border border-dashed border-oat bg-cream/60 px-5 py-8 text-center">
      <p className="mt-2 text-sm font-medium text-forest">{HOME_GOALS_COPY.emptyTitle}</p>
      {/* contoh celengan populer: placeholder yang BISA DITAP. Ikonnya Lucide,
          dipilih dari `id` di data supaya tidak ada emoji di data/JSX. */}
      <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
        {HOME_GOALS_COPY.emptyPopular.map((example) => {
          const IdeaIcon = GOAL_IDEA_ICON[example.id]
          return (
            <Link
              key={example.id}
              href={budgetPlantHref()}
              className="inline-flex items-center gap-1.5 rounded-full bg-sage/70 px-3 py-1.5 text-[13px] font-medium text-forest ring-1 ring-forest/10 transition-colors hover:bg-sage focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-forest/25 active:scale-95"
            >
              {example.label}
            </Link>
          )
        })}
      </div>
      <Link
        href={budgetPlantHref()}
        className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-forest px-4 py-2.5 text-[13.5px] font-medium text-cream transition-colors hover:bg-forest-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-forest/30 active:scale-95"
      >
        {HOME_GOALS_COPY.emptyCta}
      </Link>
    </div>
  )
}

/** Hero — NOMINAL + TAHAP dari celengan yang paling perlu diingatkan
 *  (`heroFundOf()` di lib/data/budget.ts). Nama, nominal, persen, dan tahap di
 *  sini TURUNAN dari `fund`; tidak ada satu pun angka yang ditulis manual, jadi
 *  bagian mana pun bisa ditelusuri ke /budget/<id>-nya.
 *
 *  REVISI (permintaan pemilik produk): PAPAN PUZZLE DICABUT dari kartu ini.
 *  Dulu kartu ini menggambar papan puzzle kecil sebagai "wajah" progres, padahal
 *  di sebelahnya ada kartu "Puzzle kamu" yang menggambar papan dari angka YANG
 *  SAMA — jadi satu layar punya dua papan kembar. Sekarang pembagiannya tegas:
 *    · kartu ini  → angka, badge tahap, dan bar progres (ringkas, tanpa papan);
 *    · Puzzle kamu → SATU-SATUNYA papan puzzle di Dashboard. */
function HeroFund({ fund }: { fund: SinkingFundItem }) {
  const { money } = usePrivacy()
  const pct = fundPercentRounded(fund)
  const stage = stageFromPercent(pct)

  return (
    <div className="relative mt-4 overflow-hidden rounded-2xl bg-gradient-to-b from-sage/70 via-cream to-cream p-4 ring-1 ring-soil/8 sm:p-5">
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

      {/* bar progres — tanpa badge tahap (diminta dihapus) dan tanpa ilustrasi,
          jadi seluruh lebar kartu terpakai oleh informasi yang benar-benar
          dibaca: seberapa jauh celengan ini jalan. */}
      <div className="relative mt-3">
        {/* kalimat penyemangat HANYA saat celengannya sudah penuh (tahap 4):
            teks berulang "Tiap setoran bikin celengan ini naik tahap…" DIHAPUS
            (permintaan pemilik produk) — bar progres di bawah sudah mengatakan
            hal yang sama tanpa mengulanginya tiap kali. */}
        {stage === 4 && (
          <p className="mb-2 text-[12.5px] leading-snug text-forest-muted">
            {HOME_GOALS_COPY.heroBlurbBloom}
          </p>
        )}
        <GrowthTrack pct={pct} stage={stage} />
      </div>

      {/* NOMINAL — gaya minimalis (revisi pemilik produk): TIDAK ada lagi dua
          baris berlabel "TERKUMPUL / TARGET" yang saling menyaingi. Satu label
          kecil di atas, satu angka besar sebagai pahlawan, dan target disebut
          sekali sebagai konteks ("dari Rp 30.000.000"). Nominalnya tetap milik
          celengan hero, jadi tombol mata & halaman detail bercerita sama. */}
      <div className="relative mt-4 border-t border-soil/12 pt-3.5">
        <p className="text-[11.5px] font-medium text-forest-muted">
          {HOME_GOALS_COPY.savedLabel}
        </p>
        <div className="mt-0.5 flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
          <p className={cn('min-w-0 truncate text-forest', AMOUNT_LG)}>
            {money(fund.current)}
          </p>
          <p className="shrink-0 text-[12.5px] text-forest-muted tabular-nums">
            {HOME_GOALS_COPY.targetPrefix} {money(fund.target)}
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
            <Puzzle className="size-3" strokeWidth={2.4} aria-hidden />
          </span>
          <p className="truncate text-[14px] font-medium text-forest">{fund.name}</p>
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          <span className="text-[11.5px] font-medium text-forest">{SHORT_STAGE[stage]}</span>
          <span className="text-xs font-medium text-forest-muted tabular-nums">{pct}%</span>
          {/* ArrowUpRight (bukan ChevronDown): ikon ini MENUJU halaman, bukan
              membuka baris — chevron ke bawah dulu menjanjikan expand yang
              tidak pernah ada */}
          <ArrowUpRight className="size-3.5 text-forest-muted" strokeWidth={2.2} aria-hidden />
        </div>
      </div>
      {/* jalur tahap mini: 4 segmen = 4 tahap */}
      <div className="mt-2 flex gap-1" aria-hidden>
        {([1, 2, 3, 4] as PlantStage[]).map((s) => (
          <span
            key={s}
            className={cn(
              'h-1.5 flex-1 rounded-full transition-colors',
              s <= stage ? 'bg-gradient-to-r from-hud-sage to-mint' : 'bg-soil/[0.09]',
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
  const { money } = usePrivacy()
  /* baris mini = SEMUA celengan selain hero; urutannya prioritas → progres
     (`sortFundsByUrgency`). Kurang dari 3 celengan ⇒ tampil apa adanya. */
  const rest = sortFundsByUrgency(funds).filter((fund) => fund.id !== hero?.id)
  /* kewajiban setoran bulanan celengan hero — angka NYATA dari target/tenggat
     (`monthlyNeeded()` yang sama dengan halaman detail), dipakai sebagai baris
     pendukung supaya dasar kartu tidak kosong saat dipasangkan dengan puzzle. */
  const monthlySetAside = hero ? monthlyNeeded(hero.target, hero.current, hero.deadline) : 0

  return (
    <div className="flex h-full flex-col rounded-[2rem] bg-cream p-4 ring-1 ring-soil/12 sm:p-5">
      <CardHeader showAdd={hero !== null} />
      {hero ? (
        <>
          <HeroFund fund={hero} />
          {rest.length > 0 && (
            <div className="mt-3 flex flex-1 flex-col">
              <p className="px-1 text-[12px] font-medium uppercase tracking-[0.12em] text-forest-muted">
                {HOME_GOALS_COPY.restTitle(rest.length)}
              </p>
              {/* tiap celengan punya bar progresnya sendiri (4 segmen), jadi
                  bahasa visualnya sama dengan hero di atas & papan puzzle.
                  `justify-start` + `flex-1`: saat kartu dipasangkan dengan
                  tetangga yang lebih tinggi, ruang sisa dibagi sebagai jarak
                  antar-baris — bukan menumpuk jadi satu lubang di dasar. */}
              <div className="mt-2 flex flex-1 flex-col justify-start gap-2">
                {rest.map((fund, i) => (
                  <MiniGoalRow key={fund.id} fund={fund} tintIndex={i} />
                ))}
              </div>
            </div>
          )}
          {/* SETORAN BULAN INI — baris pendukung (bukan hiasan): angka dari
              `monthlyNeeded()` celengan hero, statusnya dari
              `contributedThisMonth`. Ditempatkan SEBELUM tautan penutup supaya
              dasar kartu terisi informasi, bukan ruang kosong. */}
          <div className="mt-3 flex items-center justify-between gap-3 rounded-xl bg-sage/35 px-3 py-2 ring-1 ring-soil/[0.05]">
            <span className="text-[11.5px] font-medium text-forest-muted">
              {HOME_GOALS_COPY.monthlySetAside}
            </span>
            <span className="shrink-0 text-[11.5px] font-semibold text-forest tabular-nums">
              {money(monthlySetAside)}
              <span className="font-medium text-forest-muted">
                /{HOME_GOALS_COPY.perMonth}
              </span>
            </span>
          </div>
          {/* PINTU KELUAR — tautan halaman penuh, dipaku di dasar kartu. Dulu
              dasar kartu ini kosong saat tingginya mengikuti pasangan di sebelah;
              sekarang baris ini yang menutup kartu, jadi tidak ada ruang mati. */}
          <Link
            href="/budget"
            className="mt-auto flex items-center justify-between gap-2 pt-3 text-[12.5px] font-medium text-forest-muted transition-colors hover:text-forest"
          >
            {HOME_GOALS_COPY.seeAll}
            <ArrowUpRight className="size-3.5 shrink-0" strokeWidth={2.4} aria-hidden />
          </Link>
        </>
      ) : (
        <EmptyGoals />
      )}
    </div>
  )
})

