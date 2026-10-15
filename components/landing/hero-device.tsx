import type { ReactNode } from 'react'
import Image from 'next/image'
import {
  ArrowUpRight,
  Bell,
  ChevronLeft,
  ChevronRight,
  Eye,
  Home as HomeIcon,
  LayoutGrid,
  Menu,
  PieChart,
  Plus,
  ReceiptText,
  Wallet as WalletIcon,
  Wifi,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { amountSign } from '@/lib/data/history'
import {
  HERO_DEVICE,
  HERO_DEVICE_FLOAT,
  HERO_DEVICE_MONTHLY_SUMMARY,
  HERO_DEVICE_SCREENSHOT,
  HERO_DEVICE_STATUS_TIME,
  formatIDR,
} from '@/lib/data/landing'
import { PlantIllustration } from '@/components/catetind/plant-illustration'
import { LogoWordmark } from '@/components/catetind/logo-wordmark'
import type { TransactionType } from '@/lib/types'

/* ── SECTION 1b · ADEGAN "LAYAR APP DI DALAM IPHONE YANG dipegang TANGAN" ─────
   Hero landing bukan lagi satu kartu melayang, tapi SATU ADEGAN product shot:
   tangan memegang iPhone, layarnya menampilkan Home CatetInd, dan kartu-kartu
   kaca kecil melayang di sekelilingnya (pola yang sama dengan gambar referensi
   pemilik produk).

   TIGA KEPUTUSAN YANG MENENTUKAN SELURUH BENTUK FILE INI:

     1. TIDAK ADA SATU PUN ASET GAMBAR. Bingkai iPhone digambar CSS, layarnya
        REPLIKA LIVE dari Home (`/app`), tangannya SVG. Karena itu adegannya
        tetap tajam di semua kerapatan layar, tidak menambah berat halaman, dan
        — yang paling penting — angkanya ikut `lib/data/landing.ts` yang sama
        dengan yang dipakai hero: tidak ada screenshot yang bisa basi.
        Kalau suatu hari pemilik produk ingin screenshot asli, `HERO_DEVICE_SCREENSHOT`
        di data sudah menyediakannya (satu berkas di `public/`, nol perubahan
        di sini).

     2. SATU SISTEM UKURAN: SATUAN `cqw` (container query). Layar app di sini
        hanya ±200px lebar, jadi ukuran px apa pun akan terlihat salah begitu
        ponselnya mengecil di mobile. Dengan `@container` di ponselnya sendiri,
        setiap ukuran di dalam layar ditulis dalam PERSEN LEBAR LAYAR
        (mis. `text-[3.5cqw]` = 3,5% lebar layar ± seperti 14px di app aslinya),
        sehingga komposisinya identik di HP maupun desktop — persis seperti
        screenshot yang diperkecil, bukan layout kedua yang harus dirawat.

     3. GEOMETRI TANGAN & PONSEL SATU KOORDINAT. Ponsel diletakkan di dalam
        "panggung" ber-viewBox 430×560 (rasio panggung WAJIB sama dengan viewBox
        SVG-nya, lihat `STAGE`), lalu tangan digambar sebagai dua lapis SVG
        ber-viewBox yang SAMA:
           · `HandBehind`  → telapak + pergelangan (DI BELAKANG ponsel);
           · `HandFront`   → empat ujung jari yang melingkari tepi kiri ponsel
                             (di DEPAN layar, supaya terlihat benar-benar
                             menggenggam).
        Karena keduanya memakai koordinat yang sama, tepi jari mustahil
        melenceng dari tepi ponsel — dan tidak ada satu pun nilai px absolut di
        sini, semuanya ikut ukuran panggung.
   ────────────────────────────────────────────────────────────────────────── */

/** panggung adegan: viewBox SVG = rasio kotaknya (jangan diubah sepihak) */
const STAGE = { w: 430, h: 560 } as const

/**
 * Tapak ponsel DI DALAM panggung, ditulis sebagai kelas supaya tidak ada nilai
 * px absolut yang perlu disinkronkan: lebar 50% panggung (x 107,5 → 322,5 pada
 * koordinat viewBox — angka 107,5 itulah tepi kiri ponsel yang dipakai jalur
 * jari di `HAND_PATH`/`FINGERS`), tinggi mengikuti rasio bodi iPhone
 * (71,6 × 147,6 mm), titik tengah tepat di tengah panggung.
 */
const DEVICE_CLASS = 'absolute left-[25%] top-[4%] w-[50%] aspect-[71.6/147.6]'

/** posisi kartu kaca melayang — persen dari panggung, menyentuh tepi ponsel */
const FLOAT_POSITION = {
  jatah: 'left-[-11%] top-[8%]',
  masuk: 'left-[-9%] top-[48%]',
  keluar: 'right-[-13%] top-[20%]',
  tanaman: 'right-[-9%] top-[64%]',
} as const

/**
 * Jalur tapak tangan (telapak + pergelangan) di koordinat panggung.
 *
 * Kenapa satu jalur, bukan tumpukan bentuk: telapak yang menempel ke pergelangan
 * harus mustahil terlihat "disambung" — dengan satu jalur + satu gradien, tidak
 * ada garis sambungan yang bisa muncul di ukuran layar mana pun. Bentuknya
 * sengaja keluar dari DUA sisi panggung (kiri dan bawah) supaya tangannya
 * terbaca "masuk" ke dalam frame, seperti foto produk sungguhan.
 */
const HAND_PATH =
  'M 30 342 C 14 345, 6 366, 6 392 C 6 420, 2 448, -8 476 C -20 506, -34 534, -46 560 ' +
  'L 98 560 C 110 526, 122 490, 130 456 C 138 424, 143 388, 138 362 C 132 344, 112 334, 92 332 ' +
  'C 62 328, 46 333, 30 342 Z'

/**
 * Empat jari yang melingkari tepi kiri ponsel: badan (kapsul panjang) + kuku +
 * sorot tipis di punggung jari. Digambar dalam grup yang dirotasi, jadi kukunya
 * selalu ikut kemiringan jarinya tanpa perhitungan kedua.
 *
 * Dua angka yang menentukan "terbaca sebagai tangan" atau tidak:
 *   · PANJANG jari (x → x+w) harus jauh lebih besar daripada tingginya, kalau
 *     tidak ujungnya terlihat seperti bulatan-bulatan lepas (bukan genggaman);
 *   · UJUNG jari (x+w ≈ 146) sengaja berhenti TEPAT sebelum teks judul catatan
 *     di layar — yang tertutup hanya tile ikonnya, seperti jempol di foto asli.
 */
const FINGERS = [
  { x: 46, y: 312, w: 100, h: 43, rotate: -9, nailX: 118, nailY: 327 },
  { x: 44, y: 357, w: 104, h: 43, rotate: -7, nailX: 118, nailY: 372 },
  { x: 46, y: 402, w: 96, h: 43, rotate: -5, nailX: 116, nailY: 417 },
  { x: 54, y: 447, w: 80, h: 38, rotate: -3, nailX: 108, nailY: 461 },
] as const

/** slot tumpukan dompet di belakang kartu depan (paling dalam ditulis lebih dulu) */
const PEEK_SLOT = [
  'left-[7.2cqw] right-[7.2cqw] -top-[16.2cqw] bottom-[16.2cqw] opacity-55',
  'left-[4.8cqw] right-[4.8cqw] -top-[10.8cqw] bottom-[10.8cqw] opacity-70',
  'left-[2.4cqw] right-[2.4cqw] -top-[5.4cqw] bottom-[5.4cqw] opacity-85',
] as const

/**
 * Lapisan tangan DI BELAKANG ponsel: telapak + pergelangan, keluar dari sudut
 * kiri bawah panggung. Warnanya memakai turunan palet kanon (`oat` → `plum-light`
 * → `plum`, shade `plum-deep`) — bukan warna kulit literal — supaya tangan ini
 * tetap terasa satu keluarga dengan seluruh halaman, sama seperti ilustrasi
 * tanaman di app.
 */
function HandBehind() {
  return (
    <svg
      aria-hidden
      viewBox={`0 0 ${STAGE.w} ${STAGE.h}`}
      className="absolute inset-0 size-full [mask-image:linear-gradient(to_bottom,rgba(0,0,0,1)_72%,rgba(0,0,0,0)_100%)]"
    >
      <defs>
        <linearGradient id="hero-hand-skin" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#ebe4de" />
          <stop offset="42%" stopColor="#e7d8c3" />
          <stop offset="100%" stopColor="#b89191" />
        </linearGradient>
        <linearGradient id="hero-hand-shade" x1="1" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#534141" stopOpacity="0.38" />
          <stop offset="58%" stopColor="#534141" stopOpacity="0.08" />
          <stop offset="100%" stopColor="#534141" stopOpacity="0" />
        </linearGradient>
        <radialGradient id="hero-hand-drop" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#000000" stopOpacity="0.2" />
          <stop offset="100%" stopColor="#000000" stopOpacity="0" />
        </radialGradient>
      </defs>

      {/* bayangan lembut di kanvas — tanpa ini tangannya terasa mengambang */}
      <ellipse cx="118" cy="442" rx="188" ry="150" fill="url(#hero-hand-drop)" />

      {/* telapak + pergelangan: satu jalur, satu gradien, satu garis tepi */}
      <path d={HAND_PATH} fill="url(#hero-hand-skin)" />
      <path d={HAND_PATH} fill="url(#hero-hand-shade)" />
      <path d={HAND_PATH} fill="none" stroke="#534141" strokeOpacity="0.32" strokeWidth="2" />
      {/* garis lipatan telapak — dua lengkung tipis: yang membuat bidangnya
          terbaca sebagai tangan, bukan bidang polos */}
      <g fill="none" stroke="#534141" strokeOpacity="0.24" strokeWidth="2.2" strokeLinecap="round">
        <path d="M 26 386 C 52 396, 76 414, 92 440" />
        <path d="M 20 432 C 44 444, 66 462, 78 486" />
      </g>
    </svg>
  )
}

/**
 * Lapisan tangan DI DEPAN layar: empat ujung jari yang melingkari tepi kiri
 * ponsel. Inilah bagian yang membuat adegannya terbaca "digenggam" — dan
 * sengaja hanya menyentuh pinggir kiri (tidak menutupi teks di tengah layar).
 * Ibu jari tidak digambar: dengan cengkeraman begini ia memang ada di balik
 * bodi ponsel, jadi menampilkannya justru membuat anatominya salah.
 */
function HandFront() {
  return (
    <svg
      aria-hidden
      viewBox={`0 0 ${STAGE.w} ${STAGE.h}`}
      className="pointer-events-none absolute inset-0 z-20 size-full [mask-image:linear-gradient(to_bottom,rgba(0,0,0,1)_88%,rgba(0,0,0,0)_100%)]"
    >
      <defs>
        <linearGradient id="hero-finger-skin" x1="1" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#ebe4de" />
          <stop offset="52%" stopColor="#e7d8c3" />
          <stop offset="100%" stopColor="#b89191" />
        </linearGradient>
        {/* bayangan jari jatuh ke layar — kedalaman tanpa satu pun bentuk tambahan */}
        <filter id="hero-finger-shadow" x="-30%" y="-30%" width="160%" height="160%">
          <feDropShadow dx="1.5" dy="3" stdDeviation="3" floodColor="#000000" floodOpacity="0.3" />
        </filter>
      </defs>

      <g filter="url(#hero-finger-shadow)">
        {FINGERS.map((finger) => (
          <g
            key={finger.y}
            transform={`rotate(${finger.rotate} ${finger.x + finger.w / 2} ${finger.y + finger.h / 2})`}
          >
            <rect
              x={finger.x}
              y={finger.y}
              width={finger.w}
              height={finger.h}
              rx={finger.h / 2}
              fill="url(#hero-finger-skin)"
              stroke="#534141"
              strokeOpacity="0.24"
              strokeWidth="1.6"
            />
            {/* punggung jari yang menangkap cahaya */}
            <rect
              x={finger.x + 8}
              y={finger.y + 4}
              width={finger.w - 22}
              height="7"
              rx="3.5"
              fill="#ffffff"
              fillOpacity="0.24"
            />
            {/* kuku */}
            <rect
              x={finger.nailX}
              y={finger.nailY}
              width="22"
              height="17"
              rx="8.5"
              fill="#fbe3c0"
              stroke="#b89191"
              strokeOpacity="0.5"
              strokeWidth="1.4"
            />
            <rect
              x={finger.nailX + 4}
              y={finger.nailY + 3}
              width="14"
              height="6"
              rx="3"
              fill="#ffffff"
              fillOpacity="0.45"
            />
          </g>
        ))}
      </g>
    </svg>
  )
}

/**
 * Bingkai iPhone + layarnya. Bingkai digambar CSS (nol aset): gradien gelap untuk
 * bodi, hairline terang untuk kilau tepi, tombol samping sebagai elemen kecil
 * sendiri, dan Dynamic Island. Seluruh ukuran di tingkat ini memakai `cqw` dari
 * BODI ponsel (`@container` di elemen terluar), jadi proporsi bingkai tetap sama
 * dari mobile sampai desktop — hanya skalanya yang berubah.
 */
function Device() {
  return (
    <div className={cn('@container z-10', DEVICE_CLASS)}>
      <div className="relative size-full rounded-[13cqw] bg-[linear-gradient(150deg,rgba(0,0,0,0.92)_0%,rgba(0,0,0,0.7)_34%,rgba(0,0,0,0.95)_100%)] p-[2.4cqw] shadow-[0_4cqw_6cqw_-2cqw_rgba(0,0,0,0.5)]">
        {/* hairline kilau tepi bodi */}
        <span
          aria-hidden
          className="pointer-events-none absolute inset-0 rounded-[13cqw] ring-[0.3cqw] ring-inset ring-[rgba(255,255,255,0.28)]"
        />
        {/* tombol samping: senyap + volume di kiri, daya di kanan */}
        <span
          aria-hidden
          className="absolute -left-[0.85cqw] top-[17%] h-[5cqw] w-[0.85cqw] rounded-l-[0.5cqw] bg-[rgba(0,0,0,0.85)]"
        />
        <span
          aria-hidden
          className="absolute -left-[0.85cqw] top-[25%] h-[9cqw] w-[0.85cqw] rounded-l-[0.5cqw] bg-[rgba(0,0,0,0.85)]"
        />
        <span
          aria-hidden
          className="absolute -left-[0.85cqw] top-[36%] h-[9cqw] w-[0.85cqw] rounded-l-[0.5cqw] bg-[rgba(0,0,0,0.85)]"
        />
        <span
          aria-hidden
          className="absolute -right-[0.85cqw] top-[29%] h-[12cqw] w-[0.85cqw] rounded-r-[0.5cqw] bg-[rgba(0,0,0,0.85)]"
        />

        {/* layar — permukaan putih rata seperti app aslinya */}
        <div className="@container relative size-full overflow-hidden rounded-[10.8cqw] bg-canvas shadow-[inset_0_0_8cqw_rgba(0,0,0,0.16)]">
          <Screen />
          {/* kilau kaca + vignette tepi: yang membuatnya terasa benda, bukan gambar */}
          <span
            aria-hidden
            className="pointer-events-none absolute inset-0 bg-[linear-gradient(118deg,rgba(255,255,255,0.26)_0%,rgba(255,255,255,0)_34%,rgba(255,255,255,0)_76%,rgba(255,255,255,0.09)_100%)]"
          />
        </div>

        {/* Dynamic Island */}
        <span
          aria-hidden
          className="absolute top-[3.6cqw] left-1/2 h-[4.2cqw] w-[26%] -translate-x-1/2 rounded-full bg-[rgba(0,0,0,0.92)]"
        />
      </div>
    </div>
  )
}

/**
 * Isi layar. Dua mode, dipilih data (bukan dua komponen):
 *   · `HERO_DEVICE_SCREENSHOT` terisi → gambar apa adanya (`next/image`);
 *   · kosong (default)               → replika live Home di bawah ini.
 */
function Screen() {
  if (HERO_DEVICE_SCREENSHOT) {
    return (
      <Image
        src={HERO_DEVICE_SCREENSHOT}
        alt=""
        fill
        sizes="(max-width: 640px) 45vw, 210px"
        className="object-cover object-top"
      />
    )
  }
  return (
    <div className="flex size-full flex-col px-[4.6cqw] pt-[2.8cqw] pb-[1.4cqw]">
      <StatusBar />
      <ScreenHeader />
      <WalletDeck />
      <LedgerCard />
      <BottomNav />
    </div>
  )
}

/** strip status iOS — jam + indikator sinyal, WiFi, baterai (digambar inline) */
function StatusBar() {
  return (
    <div className="flex shrink-0 items-center justify-between text-[3.1cqw] font-medium text-forest/85">
      <span className="tabular-nums">{HERO_DEVICE_STATUS_TIME}</span>
      <span className="flex items-center gap-[1.6cqw]">
        <span aria-hidden className="flex items-end gap-[0.5cqw]">
          {[1.2, 1.9, 2.6, 3.3].map((height) => (
            <span
              key={height}
              className="w-[0.8cqw] rounded-full bg-forest/80"
              style={{ height: `${height}cqw` }}
            />
          ))}
        </span>
        <Wifi className="size-[3.2cqw] text-forest/80" strokeWidth={2.6} aria-hidden />
        <span aria-hidden className="flex items-center">
          <span className="flex h-[3.1cqw] w-[6.4cqw] items-center rounded-[0.9cqw] border border-forest/35 px-[0.6cqw]">
            <span className="h-[1.7cqw] w-[3.6cqw] rounded-[0.4cqw] bg-forest/80" />
          </span>
          <span className="h-[1.2cqw] w-[0.5cqw] rounded-r-full bg-forest/30" />
        </span>
      </span>
    </div>
  )
}

/** header app: wordmark + lonceng (dot mint), tombol mata, dan tombol menu */
function ScreenHeader() {
  return (
    <div className="mt-[2.8cqw] flex shrink-0 items-center justify-between">
      <LogoWordmark className="h-[4.6cqw]" />
      <div className="flex items-center gap-[1.6cqw]">
        <ScreenHeaderButton>
          <Bell className="size-[3.9cqw]" strokeWidth={2.2} aria-hidden />
          <span
            aria-hidden
            className="absolute top-[0.6cqw] right-[0.8cqw] size-[2.2cqw] rounded-full bg-mint ring-[0.5cqw] ring-cream"
          />
        </ScreenHeaderButton>
        <ScreenHeaderButton>
          <Eye className="size-[3.9cqw]" strokeWidth={2.2} aria-hidden />
        </ScreenHeaderButton>
        <ScreenHeaderButton>
          <Menu className="size-[3.9cqw]" strokeWidth={2.4} aria-hidden />
        </ScreenHeaderButton>
      </div>
    </div>
  )
}

/** satu tombol bulat di header layar (dekoratif — bukan kontrol sungguhan) */
function ScreenHeaderButton({ children }: { children: ReactNode }) {
  return (
    <span className="relative flex size-[8.6cqw] items-center justify-center rounded-full bg-cream text-forest ring-1 ring-soil/12">
      {children}
    </span>
  )
}
/**
 * Deck dompet Home: kantong gelap → kartu-kartu yang mengintip → kartu depan
 * "Semua Dompet" + kontrol geser. Urutan tumpukannya SENGAJA begitu (paling
 * dalam ditulis lebih dulu) supaya kartu yang lebih dalam berada DI BELAKANG
 * kartu di depannya — sama seperti deck sungguhan, dan sama seperti tumpukan di
 * gambar referensi.
 */
function WalletDeck() {
  const deck = HERO_DEVICE.walletDeck
  return (
    <div className="mt-[17cqw] shrink-0">
      <div className="relative h-[28.5cqw]">
        {/* kantong dompet: lebih lebar & lebih dalam dari kartunya, jadi sisi
            gelapnya terlihat mengapit kartu — ilusi "kartu ada di dalam dompet" */}
        <span
          aria-hidden
          className="absolute -top-[3.4cqw] -right-[2.2cqw] -bottom-[4.2cqw] -left-[2.2cqw] rounded-[6cqw] bg-gradient-to-b from-evergreen-deep/85 to-forest/75 ring-1 ring-soil/15"
        />
        {deck.peeking.map((name, index) => (
          <span
            key={name}
            className={cn(
              'absolute rounded-[4.6cqw] bg-gradient-to-br from-forest-soft via-forest to-evergreen-deep ring-1 ring-cream/12',
              PEEK_SLOT[index],
            )}
          >
            <span className="absolute top-[0.9cqw] left-[4.6cqw] text-[3.1cqw] font-medium text-cream/75">
              {name}
            </span>
            <span
              aria-hidden
              className="absolute inset-x-[3cqw] top-0 h-px bg-gradient-to-r from-transparent via-cream/35 to-transparent"
            />
          </span>
        ))}

        {/* kartu depan */}
        <span className="absolute inset-0 z-30 overflow-hidden rounded-[4.6cqw] bg-gradient-to-br from-forest-soft via-forest to-evergreen-deep text-cream">
          <span
            aria-hidden
            className="absolute inset-0 bg-gradient-to-br from-cream/20 via-cream/[0.04] to-soil/25"
          />
          <span
            aria-hidden
            className="absolute -top-[8cqw] -right-[6cqw] size-[20cqw] rounded-full bg-cream/25 blur-2xl"
          />
          <span
            aria-hidden
            className="absolute inset-x-[4cqw] top-0 h-px bg-gradient-to-r from-transparent via-cream/50 to-transparent"
          />

          <span className="relative flex h-full flex-col justify-between p-[4.2cqw]">
            <span className="flex items-start gap-[2.6cqw]">
              <span className="flex size-[7.8cqw] shrink-0 items-center justify-center rounded-[2.6cqw] bg-mint-soft text-forest">
                <WalletIcon className="size-[4.2cqw]" strokeWidth={2.2} aria-hidden />
              </span>
              <span className="pt-[0.2cqw]">
                <span className="block text-[3.9cqw] leading-tight font-medium">{deck.label}</span>
                <span className="block text-[3cqw] leading-tight text-cream/60">{deck.sub}</span>
              </span>
            </span>

            <span className="font-display text-[8.2cqw] font-semibold tracking-tight tabular-nums">
              {formatIDR(deck.total)}
            </span>

            <span className="flex items-center gap-[2.4cqw]">
              {/* chip EMV */}
              <span
                aria-hidden
                className="relative h-[4.4cqw] w-[5.6cqw] shrink-0 overflow-hidden rounded-[1.2cqw] bg-gradient-to-br from-daisy-light via-daisy to-cantelope"
              >
                <span className="absolute inset-y-[1cqw] left-1/2 w-px -translate-x-1/2 bg-soil/20" />
                <span className="absolute inset-x-[1cqw] top-1/2 h-px -translate-y-1/2 bg-soil/20" />
              </span>
              <Wifi className="size-[3.4cqw] rotate-90 text-cream/50" strokeWidth={2.4} aria-hidden />
              {/* wordmark putih di ujung kanan — mask alpha aset yang sama dengan
                  kartu dompet sungguhan, jadi brand mark-nya tidak digambar ulang */}
              <span className="ml-auto block h-[2.4cqw] aspect-[1779/490] bg-cream opacity-90 [mask-image:url(/Dashboard-putih.png)] [mask-position:center] [mask-repeat:no-repeat] [mask-size:contain]" />
            </span>
          </span>
        </span>

        {/* bibir kantong di DEPAN — menutupi tepi bawah kartu, seperti kartu yang
            benar-benar dimasukkan ke dompet */}
        <span
          aria-hidden
          className="absolute -right-[1.4cqw] -bottom-[2.2cqw] -left-[1.4cqw] z-40 h-[3.6cqw] rounded-b-[4.4cqw] bg-gradient-to-b from-evergreen-deep to-evergreen-deeper"
        >
          <span className="absolute inset-x-[5cqw] top-1/2 border-t border-dashed border-cream/20" />
        </span>
      </div>

      {/* kontrol geser deck */}
      <div className="mt-[2.8cqw] flex items-center justify-between">
        <DeckArrow>
          <ChevronLeft className="size-[3.4cqw]" strokeWidth={2.4} aria-hidden />
        </DeckArrow>
        <span className="flex items-center gap-[1.8cqw]">
          {Array.from({ length: deck.dots }, (_, index) => (
            <span
              key={index}
              className={cn(
                'rounded-full',
                index === 0 ? 'h-[1.1cqw] w-[5.6cqw] bg-forest' : 'size-[1.5cqw] bg-soil/15',
              )}
            />
          ))}
          <span className="ml-[0.6cqw] flex size-[5.4cqw] items-center justify-center rounded-full border border-dashed border-soil/25 text-forest/40">
            <Plus className="size-[3cqw]" strokeWidth={2.4} aria-hidden />
          </span>
        </span>
        <DeckArrow>
          <ChevronRight className="size-[3.4cqw]" strokeWidth={2.4} aria-hidden />
        </DeckArrow>
      </div>
    </div>
  )
}

/** tombol panah deck (dekoratif) */
function DeckArrow({ children }: { children: ReactNode }) {
  return (
    <span className="flex size-[7cqw] items-center justify-center rounded-full bg-cream text-forest/70 ring-1 ring-soil/12">
      {children}
    </span>
  )
}

/**
 * Kartu "Transaksi Terakhir" — replika kartu Home: kepala kartu + tombol "Lihat
 * semua", label grup hari, lima baris catatan hari ini, dan strip ringkasan
 * periode di dasar kartu.
 *
 * Kartu ini `flex-1`, dan strip ringkasannya `mt-auto`: tinggi layar iPhone
 * (yang rasionya tetap) jarang pas dengan tinggi isinya, jadi kelebihan ruangnya
 * diserap kartu ini — bukan menyisakan pita putih kosong di dasar layar. Kalau
 * isinya kebetulan lebih panjang, `overflow-hidden` di induknya yang memotong
 * (persis seperti screenshot yang di-scroll).
 */
function LedgerCard() {
  const txn = HERO_DEVICE.txn
  const summary = HERO_DEVICE_MONTHLY_SUMMARY
  return (
    <div className="mt-[3.4cqw] flex min-h-0 flex-1 flex-col overflow-hidden rounded-[5cqw] bg-cream p-[3.6cqw] ring-1 ring-soil/10">
      {/* kepala kartu */}
      <div className="flex shrink-0 items-center justify-between">
        <div className="flex items-center gap-[2.2cqw]">
          <span className="flex size-[6.8cqw] items-center justify-center rounded-full bg-sage text-forest">
            <ReceiptText className="size-[3.5cqw]" strokeWidth={2.4} aria-hidden />
          </span>
          <span>
            <span className="block text-[3.4cqw] leading-tight font-medium text-forest">
              {txn.title}
            </span>
            <span className="block text-[2.9cqw] leading-tight text-forest/45">{txn.subtitle}</span>
          </span>
        </div>
        <span className="flex items-center gap-[1.2cqw] rounded-full bg-sage py-[1.2cqw] pr-[1.2cqw] pl-[2.8cqw] text-[2.9cqw] font-medium text-forest">
          {txn.seeAll}
          <span className="flex size-[3.8cqw] items-center justify-center rounded-full bg-forest text-mint">
            <ArrowUpRight className="size-[2.5cqw]" strokeWidth={2.6} aria-hidden />
          </span>
        </span>
      </div>

      {/* label grup hari + titik "ada catatan hari ini" */}
      <div className="mt-[2.2cqw] flex shrink-0 items-center gap-[2cqw]">
        <span className="text-[2.6cqw] font-medium tracking-[0.14em] text-forest/40 uppercase">
          {txn.dayLabel}
        </span>
        <span aria-hidden className="size-[1.6cqw] rounded-full bg-mint" />
        <span aria-hidden className="h-px flex-1 bg-soil/10" />
      </div>

      <ul className="mt-[2cqw] flex flex-col gap-[1.4cqw]">
        {txn.rows.map((row) => (
          <li
            key={row.title}
            className="flex items-center gap-[2.4cqw] rounded-[4.4cqw] bg-plum/10 px-[2.8cqw] py-[1.9cqw]"
          >
            <span className="relative flex size-[8.4cqw] shrink-0 items-center justify-center rounded-[3cqw] bg-plum/25 text-plum-deep">
              <ReceiptText className="size-[4.4cqw]" strokeWidth={2.2} aria-hidden />
              <span
                aria-hidden
                className="absolute -right-[1.2cqw] -bottom-[1.2cqw] flex size-[4cqw] items-center justify-center rounded-full bg-plum text-cream ring-[0.6cqw] ring-cream"
              >
                <ArrowUpRight className="size-[2.4cqw]" strokeWidth={3} aria-hidden />
              </span>
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[3.4cqw] leading-tight font-medium text-forest">
                {row.title}
              </span>
              <span className="mt-[1cqw] flex items-center gap-[1.6cqw]">
                <span className="truncate rounded-full bg-plum/15 px-[2cqw] py-[0.6cqw] text-[2.7cqw] text-plum-deep">
                  {row.category}
                </span>
                <span className="text-[2.7cqw] text-forest/40 tabular-nums">{row.time}</span>
              </span>
            </span>
            <span className="shrink-0 text-[3.5cqw] font-medium text-hud-terracotta tabular-nums">
              {moneyLabel(row)}
            </span>
            <span className="flex size-[6.2cqw] shrink-0 items-center justify-center rounded-full text-forest/45 ring-1 ring-soil/12">
              <ChevronRight className="size-[3.2cqw]" strokeWidth={2.2} aria-hidden />
            </span>
          </li>
        ))}
      </ul>

      {/* strip ringkasan periode — kata sambungnya dari copy kanon Home */}
      <p className="mt-auto shrink-0 pt-[2.2cqw] text-center text-[2.8cqw] leading-snug text-forest/55">
        {summary.period} <b className="font-medium text-forest">+{formatIDR(summary.income)}</b>{' '}
        {summary.inflow} <b className="font-medium text-forest">-{formatIDR(summary.spending)}</b>{' '}
        {summary.outflow} <b className="font-medium text-forest">+{formatIDR(summary.net)}</b>
      </p>
    </div>
  )
}

/** navigasi bawah app (ikon saja di app aslinya) + home indicator iOS */
function BottomNav() {
  return (
    <div className="mt-[2.6cqw] shrink-0">
      <div className="flex items-center justify-between border-t border-soil/8 px-[3cqw] pt-[2.4cqw]">
        <HomeIcon className="size-[4.6cqw] text-forest" strokeWidth={1.8} aria-hidden />
        <WalletIcon className="size-[4.6cqw] text-forest/25" strokeWidth={1.8} aria-hidden />
        <span className="flex size-[9cqw] -translate-y-[1.4cqw] items-center justify-center rounded-full bg-forest text-mint">
          <Plus className="size-[5cqw]" strokeWidth={2.4} aria-hidden />
        </span>
        <PieChart className="size-[4.6cqw] text-forest/25" strokeWidth={1.8} aria-hidden />
        <LayoutGrid className="size-[4.6cqw] text-forest/25" strokeWidth={1.8} aria-hidden />
      </div>
      <span
        aria-hidden
        className="mx-auto mt-[1.6cqw] block h-[1.2cqw] w-[32cqw] rounded-full bg-soil/25"
      />
    </div>
  )
}

/** label nominal satu baris — arah dari kanon `amountSign`, angka dari `formatIDR` */
function moneyLabel(row: { amount: number; type: TransactionType }): string {
  return `${amountSign(row.type)}${formatIDR(row.amount)}`
}

/**
 * Satu kartu kaca melayang di sekitar ponsel (dekoratif).
 *
 * Kartu "tanaman" SENGAJA punya bentuk sendiri: isinya ilustrasi tanaman yang
 * sama dengan Home (`PlantIllustration`), sementara kartu lain menampilkan
 * angka. `progress` menggambar bar tipis seperti kartu jatah harian.
 */
function FloatCard({
  card,
  position,
}: {
  card: (typeof HERO_DEVICE_FLOAT)[number]
  position: string
}) {
  return (
    <div
      aria-hidden
      className={cn(
        'pointer-events-none absolute hidden w-[40%] rounded-[1.1rem] bg-cream/65 p-3.5 ring-1 ring-soil/10 backdrop-blur-md xl:block',
        'shadow-[0_22px_36px_-24px_rgba(0,0,0,0.45)]',
        position,
      )}
    >
      <p className="text-[10px] font-medium tracking-[0.12em] text-forest/45 uppercase">
        {card.label}
      </p>

      {card.id === 'tanaman' ? (
        <div className="mt-2 flex items-center gap-2.5">
          <span className="w-8 shrink-0">
            <PlantIllustration stage={2} />
          </span>
          <p className="text-[11px] leading-snug font-medium text-forest/70">{card.value}</p>
        </div>
      ) : (
        <>
          <p className="mt-1 font-display text-[15px] font-semibold tracking-tight text-forest tabular-nums">
            {card.value}
          </p>
          {card.progress !== null && (
            <span className="mt-2 block h-1.5 w-full overflow-hidden rounded-full bg-forest/10">
              <span
                className="block h-full rounded-full bg-mint"
                style={{ width: `${Math.round(card.progress * 100)}%` }}
              />
            </span>
          )}
          {card.hint ? (
            <p className="mt-1.5 text-[10px] leading-snug text-forest/45">{card.hint}</p>
          ) : null}
        </>
      )}
    </div>
  )
}

/**
 * ADEGAN HERO — "ponsel di tangan".
 *
 * Susunannya, dari belakang ke depan:
 *   1. halo `mint` samar (pemisah adegan dari latar putih halaman);
 *   2. kartu-kartu kaca melayang — HANYA dari `xl` ke atas: di bawah itu kolomnya
 *      terlalu sempit sehingga kartu-kartu itu menutupi ponselnya sendiri;
 *   3. PANGGUNG: tangan (belakang) → ponsel → jari (depan), satu panggung
 *      ber-aspect 430:560 yang mengapung pelan (`animate-hero-device`).
 *
 * Kartu melayang sengaja TIDAK ikut mengapung: merekalah jangkar visual yang
 * membuat ponselnya terlihat bergerak.
 *
 * Seluruh adegan ini ILUSTRASI: `aria-hidden` di panggungnya, dan isinya
 * diringkas sekali di `HERO_DEVICE_ARIA` (dibaca `hero.tsx` lewat `sr-only`).
 */
export function HeroDevice() {
  return (
    <div className="relative mx-auto w-full max-w-[420px]">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-[2%] top-[10%] bottom-[12%] rounded-[50%] bg-mint/25 blur-[70px]"
      />

      {HERO_DEVICE_FLOAT.map((card) => (
        <FloatCard key={card.id} card={card} position={FLOAT_POSITION[card.id]} />
      ))}

      <div aria-hidden className="relative motion-safe:animate-hero-device">
        <div className="relative aspect-[430/560] w-full">
          <HandBehind />
          <Device />
          <HandFront />
        </div>
      </div>
    </div>
  )
}
