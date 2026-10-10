import { memo, useMemo, useState } from 'react'
import { Droplet, Moon, Sprout } from 'lucide-react'
import { cn } from '@/lib/utils'
import { fundPercentRounded, heroFundOf } from '@/lib/data/budget'
import { activeLedgerDays } from '@/lib/data/home-money'
import { recordedTransactions, useMoneyStore } from '@/lib/money/store'
import { useLiveFunds } from '@/lib/money/funds-store'
import { useTodayISO } from '@/lib/use-today-iso'
import { HOME_PLANT_COPY } from '@/lib/data/home'
import { PLANT_SLEEP_COPY } from '@/lib/data/renewal'
import { useSubscriptionGate } from './subscription-gate-provider'
import { PlantIllustration, STAGE_NAMES, type PlantStage } from './plant-illustration'
import { PlantDetailModal } from './plant-detail-modal'
import { stageBandProgress, stageFromPercent } from './my-goals-card'
/* `stage` SENGAJA tidak lagi ditentukan widget ini: tahap tanaman = progres
   celengan (`stageFromPercent()` di bawah), bukan state kedua yang bisa berbeda
   dari kartu Tabungan Impian di layar yang sama. */
/* ── STATE TANAMAN = TURUNAN, BUKAN MOCK (paket 58 · temuan AKAR A) ──────────
   Dulu di sini hidup `MOCK { hp: 82, activeDays: 21, wilted: false }` — dua
   angka yang tidak berasal dari data user mana pun (audit 2026-09: "82% / 21
   hari"). Sekarang keduanya turunan:
     · `hp`         = progres celengan hero (`fundPercentRounded()`) — tanaman
                      tumbuh karena celengan yang benar-benar dikejar;
     · `activeDays` = jumlah TANGGAL UNIK di ledger bulan berjalan
                      (`activeLedgerDays()`, tombstone sudah disaring store);
     · `wilted`     = hp ≤ 20, dan hanya muncul kalau memang ada celengan yang
                      tertinggal — akun tanpa celengan tidak dihukum.
   `stage` tetap dari celengan yang sama (paket 30). Tanpa data, widget tidak
   menampilkan angka contoh: barisnya jatuh ke copy jujur ("Belum ada…"). */

/** widget tanaman di homescreen - "teman visual", tap -> Plant Detail (modal j) */
/** Dibungkus `memo` — kartu ini cuma menerima SATU prop opsional berupa callback
 *  stabil (`useCallback` di HomeScreen), jadi ia tetap tidak ikut re-render saat
 *  HomeScreen mengubah state popup. State lokalnya sendiri (buka/tutup detail
 *  tanaman) tetap bekerja normal karena state itu ada DI DALAM komponen ini. */
export const PlantWidget = memo(function PlantWidget({
  onReplayCelebration,
}: {
  /** pintu "Lihat perayaan" di Plant Detail — perayaan otomatis memang hanya
   *  muncul sekali (inventaris #k), jadi meninjau ulang butuh jalan yang wajar */
  onReplayCelebration?: () => void
}) {
  const [detailOpen, setDetailOpen] = useState(false)
  /* masa aktif habis → tanaman masuk mode "tidur" (inventaris state VI · PRD 4542).
     Detail tanaman tetap bisa dibuka: membaca tidak pernah dikunci. */
  const { inputLocked } = useSubscriptionGate()
  const sleeping = inputLocked

  /* ── NUTRISI = CELENGAN, SATU SUMBER ────────────────────────────────────────
     "Apa yang bikin tanaman ini tumbuh?" dijawab celengan yang jadi wajah kartu
     Tabungan Impian (`heroFundOf()` dari STORE, bukan konstanta). Persen, tahap
     tanaman, dan bar "menuju tahap berikutnya" semuanya turunan dari satu angka
     itu — tidak ada mock kedua, dan tidak ada angka pajangan seperti 68% yang
     dulu tidak berasal dari mana pun. Belum ada celengan ⇒ 0% ⇒ tahap 1
     (Benih), yang jujur: belum ada yang dikejar.

     Sejak paket 46 sumbernya `useFundsStore()` — sama dengan kartu di
     sebelahnya, jadi setoran dari halaman detail langsung menumbuhkan tanaman
     ini tanpa perlu refresh. */
  const funds = useLiveFunds()
  const nutrition = heroFundOf(funds)
  const nutritionPct = nutrition ? fundPercentRounded(nutrition) : 0
  const stage = stageFromPercent(nutritionPct)
  const bandPct = stageBandProgress(nutritionPct)
  /* PAKET 58 — hp & hari aktif kini TURUNAN, lihat blok di atas komponen */
  const snapshot = useMoneyStore()
  const today = useTodayISO()
  /* hari aktif = tanggal unik di LEDGER (bukan mock 21): catatan yang dihapus
     ikut hilang karena `recordedTransactions()` membuang tombstone */
  const ledger = useMemo(() => recordedTransactions(snapshot), [snapshot])
  const activeDays = useMemo(() => activeLedgerDays(ledger, today), [ledger, today])
  /* HP = progres celengan hero — satu-satunya sumber "kesehatan" sekarang */
  const hp = nutritionPct
  const wilted = hp > 0 && hp <= 20
  /* MEKAR PENUH (tahap 4 / "Berbunga"): BENTUK tanaman di dalam kartu berubah
     jadi latar penuh yang rimbun. Kartunya TETAP setengah lebar (sepasang dengan
     Tabungan Impian) — tata letak grid-nya sudah final, jadi yang diperkaya di
     sini murni tampilan tanamannya. Status mekar dibaca dari DATA yang sama
     dengan tahap di atas (`stage`), jadi tidak ada perhitungan kedua. */
  const fullBloom = stage === 4 && !sleeping && !wilted
  const nextStage = Math.min(stage + 1, 4) as PlantStage
  const footerLabel =
    stage === 4
      ? nutritionPct >= 100
        ? HOME_PLANT_COPY.targetReached
        : HOME_PLANT_COPY.lastStage
      : HOME_PLANT_COPY.nextStage(nextStage, STAGE_NAMES[nextStage])

  return (
    <>
              <section
        aria-label="Tanaman kamu"
        className={cn(
          'relative flex h-full flex-col overflow-hidden rounded-[2rem] bg-cream p-6 shadow-[0_4px_24px_-4px_rgba(0,0,0,0.06)] ring-1 ring-soil/12',
          fullBloom && 'min-h-[400px] lg:min-h-[460px]',
        )}
      >
        {/* MEKAR (tahap 4): tanaman jadi LATAR PENUH kartu — satu bidang rimbun,
            bukan ikon kecil di tengah. Kartunya sendiri tetap 6/12 (sepasang
            dengan Tabungan Impian); yang berubah hanya bentuk di dalamnya.
            Konten di atasnya dipaku `relative z-10` supaya tetap terbaca. */}
        {fullBloom && (
          <>
            {/* langit lembut + dua glow: hangat dari atas, mint dari bawah */}
            <span
              aria-hidden
              className="pointer-events-none absolute inset-0 bg-gradient-to-b from-mint/25 via-sage/45 to-cream"
            />
            <span
              aria-hidden
              className="pointer-events-none absolute -top-10 left-1/2 h-56 w-56 -translate-x-1/2 rounded-full bg-hud-amber/25 blur-3xl"
            />
            <span
              aria-hidden
              className="pointer-events-none absolute -bottom-12 left-1/2 h-56 w-72 -translate-x-1/2 rounded-full bg-mint/30 blur-3xl"
            />
            <PlantIllustration
              stage={4}
              className="pointer-events-none absolute -bottom-8 left-1/2 h-[120%] w-auto max-w-none -translate-x-1/2 opacity-95 lg:h-[128%]"
            />
            {/* scrim atas & bawah supaya teks header + kaki kartu tetap terbaca */}
            <span
              aria-hidden
              className="pointer-events-none absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-cream via-cream/70 to-transparent"
            />
            <span
              aria-hidden
              className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-cream/70 to-transparent"
            />
          </>
        )}

        {/* header - konsisten dengan kartu lain */}
        <div className="relative z-10 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span
              className={cn(
                'flex size-8 items-center justify-center rounded-full',
                sleeping ? 'bg-soil/[0.09] text-forest/45' : 'bg-sage text-forest',
              )}
            >
              {sleeping ? (
                <Moon className="size-4" strokeWidth={2.4} />
              ) : (
                <Sprout className="size-4" strokeWidth={2.4} />
              )}
            </span>
            <div>
              <p className="text-sm font-medium text-forest">Tanamanmu</p>
              {sleeping ? (
                /* saat tidur, label tahap diganti status — bukan angka HP/streak
                   yang bisa terasa seperti hukuman (PRD 1989–1994) */
                <p className="text-xs text-forest/45">{PLANT_SLEEP_COPY.badge}</p>
              ) : (
                <p className="text-xs text-forest/45">
                  Tahap {stage} - {STAGE_NAMES[stage]}
                </p>
              )}
            </div>
          </div>
          {/* HP visual halus - droplet, bukan angka streak. Saat tidur,
              dropletnya disembunyikan sama sekali: tidak ada yang "menurun". */}
          {!sleeping && (
            <span
              className="flex items-center gap-0.5"
              title={HOME_PLANT_COPY.hpTitle(hp)}
            >
              {Array.from({ length: 5 }).map((_, i) => (
                <Droplet
                  key={i}
                  className={cn(
                    'size-3',
                    i < Math.round((hp / 100) * 5)
                      ? 'fill-mint text-mint-soft'
                      : 'text-forest/10',
                  )}
                  strokeWidth={1.6}
                />
              ))}
            </span>
          )}
        </div>

        {/* area tanaman - tap untuk buka detail */}
                <button
          type="button"
          onClick={() => setDetailOpen(true)}
          aria-label={sleeping ? PLANT_SLEEP_COPY.detailHint : 'Lihat detail tanaman'}
          className={cn(
            'group relative mt-3 flex flex-1 flex-col items-center rounded-2xl px-4 pt-8 pb-6 ring-1 transition-all duration-300',
            fullBloom
              ? /* mekar: tombol jadi lapisan bening di atas latar full-bleed */
                'z-10 justify-end bg-transparent ring-transparent'
              : sleeping
                ? 'justify-center bg-gradient-to-b from-soil/[0.06] via-cream to-cream ring-soil/8'
                : 'justify-center bg-gradient-to-b from-sage/50 via-cream to-cream ring-soil/8 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.08)] hover:from-sage/70 hover:shadow-[0_8px_32px_-4px_rgba(0,0,0,0.12)]',
          )}
        >
          {/* glow + ilustrasi HANYA saat BELUM mekar: saat mekar ilustrasinya sudah
              jadi latar kartu, jadi jangan digambar dua kali di dalam tombol */}
          {!fullBloom && (
            <>
              {/* glow mint lembut di belakang tanaman — dimatikan saat tidur supaya
                  tidak ada kesan "segar" yang menyesatkan */}
              {!sleeping && (
                <span
                  aria-hidden
                  className="pointer-events-none absolute bottom-8 h-20 w-36 rounded-full bg-mint/20 blur-2xl"
                />
              )}
              <PlantIllustration
                stage={stage}
                wilted={wilted}
                sleeping={sleeping}
                className={cn(
                  /* kartu tanaman kini SETENGAH lebar (paket 67) — ilustrasinya ikut
                     dibesarkan supaya tidak tenggelam di ruang yang lebih lega */
                  'relative w-40 sm:w-48 lg:w-56',
                  !sleeping && 'transition-transform duration-300 group-hover:scale-[1.03]',
                )}
              />
            </>
          )}
                    <span className="mt-4 text-[11px] font-medium text-forest/40 transition-colors group-hover:text-forest">
            {sleeping ? PLANT_SLEEP_COPY.detailHint : 'Tap untuk lihat detail'}
          </span>
          {/** sparkle kecil di samping teks untuk sentuhan modern (tidak saat tidur) */}
          {!sleeping && (
            <span className="absolute -top-1 -right-1 opacity-60 group-hover:opacity-100 group-hover:animate-pulse">
              <Sprout className="size-3 text-mint" strokeWidth={2.8} />
            </span>
          )}
        </button>

        {/* baris konteks: HANYA saat tanaman sedang "tidur" (masa aktif habis) —
            satu-satunya keadaan yang memang perlu dijelaskan. Baris nutrisi
            "Tumbuh dari <celengan> (n%) — setor lagi biar naik tahap" DIHAPUS
            (permintaan pemilik produk, paket 66): badge tahap di header + bar
            "menuju tahap berikutnya" di kaki kartu sudah menceritakan hal yang
            sama, dan kalimat itu terpampang di setiap kunjungan. */}
        {sleeping && (
          <div className="mt-3 flex items-center gap-2 rounded-xl bg-sage/60 px-3 py-2 ring-1 ring-forest/[0.06]">
            <Moon className="size-3.5 shrink-0 text-forest" strokeWidth={2.4} aria-hidden />
            <p className="text-[11.5px] leading-snug text-forest/65">{PLANT_SLEEP_COPY.caption}</p>
          </div>
        )}

        {/* footer - progress menuju tahap berikutnya, mengisi bawah kartu.
            Angkanya jarak ke tahap berikutnya, diturunkan dari persen celengan
            yang sama (`stageBandProgress`) — dulu di sini tertulis 68% yang tidak
            berasal dari data mana pun dan bertabrakan dengan persen di baris
            atasnya. Tahap terakhir tidak punya "tahap berikutnya": labelnya
            diganti kalimat target, bukan "menuju tahap 4 - Berbunga". */}
        <div className="relative z-10 mt-3 border-t border-soil/12 pt-3.5">
          <div className="flex items-center justify-between text-[11px]">
            <span className="font-medium text-forest/45">{footerLabel}</span>
            <span className="font-medium text-forest tabular-nums">{bandPct}%</span>
          </div>
          <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-soil/[0.09]">
            <div
              className="h-full rounded-full bg-gradient-to-r from-forest to-mint"
              style={{ width: `${bandPct}%` }}
            />
          </div>
        </div>
      </section>

      <PlantDetailModal
        open={detailOpen}
        onClose={() => setDetailOpen(false)}
        plant={{ stage, hp, activeDays, wilted }}
        onReplay={onReplayCelebration}
      />
    </>
  )
})

