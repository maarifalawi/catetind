'use client'

import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'
import { LockedAmount } from './locked-amount'
import { useThemedWallet } from '@/hooks/use-wallet-theme'
import type { WalletAccount, WalletArt } from '@/lib/wallets'

/* â”€â”€ Muka kartu dompet â€” SATU sumber visual untuk /wallet DAN detailnya â”€â”€â”€â”€â”€â”€
   Sebelumnya seluruh resep muka kartu (gradien `face`, motif batik `art`,
   lapisan kaca, scrim, kilau holografik, chip EMV) hidup di dalam
   wallet-screen.tsx. Ketika halaman detail dompet butuh kartu yang SAMA persis,
   menyalin resepnya berarti cepat atau lambat kedua halaman akan berbeda
   (satu kartu diubah, yang lain tertinggal) â€” dan user melihat dua "kartu BCA"
   yang tidak identik di satu app.

   Karena itu resepnya diangkat ke file ini:
     Â· <WalletArtDefs/>  â†’ definisi pattern batik (dibuat sekali per halaman)
     Â· <WalletFace/>     â†’ cangkang muka kartu + semua lapisan dekoratifnya
     Â· <WalletTypeMark/> â†’ elemen kanan-atas yang MENGIKUTI benda aslinya
     Â· <MaskedAmount/>   â†’ angka nominal yang ikut tombol mata global

   Aturan pakai: pemanggil HANYA boleh mengatur radius/padding/shadow/animasi
   lewat `className` â€” warna & teksturnya tidak boleh ditimpa dari luar, supaya
   deck kartu tetap satu keluarga di mana pun ia muncul. */

/** label jenis akun berbahasa Indonesia (data `type` tetap Inggris) */
export const WALLET_TYPE_LABEL: Record<WalletAccount['type'], string> = {
  Bank: 'Bank',
  'E-Wallet': 'E-Wallet',
  Cash: 'Tunai',
}

/** bayangan teks lembut â€” nama & saldo tetap terbaca di atas stop gradien termuda */
const CARD_TEXT_SHADOW = '[text-shadow:0_1px_9px_rgba(0,0,0,0.55)]'

/** halo default di belakang kartu (mekar saat hover lewat `group`) */
const HALO_DEFAULT =
  'absolute -inset-x-3 -bottom-4 top-6 rounded-[2.6rem] opacity-40 blur-2xl transition-all duration-500 ease-out group-hover:-bottom-6 group-hover:opacity-70 motion-reduce:transition-none'

/**
 * Definisi motif batik sekali di awal halaman, dipakai ulang tiap kartu lewat
 * `url(#wallet-art-â€¦)`. Prefix `wallet-art` supaya tidak bentrok dengan id
 * pattern deck di Dashboard (`card-art-â€¦`).
 */
export function WalletArtDefs() {
  return (
    <svg aria-hidden data-catetind-batik className="pointer-events-none absolute size-0">
      <defs>
        {/* KAWUNG — empat kelopak kolang-kaling + inti mlinjon emas.
            Motif ini yang membuat muka kartu benar-benar terbaca sebagai batik
            (bukan cincin/gelembung seperti versi lama). */}
        <g id="wallet-art-kawung-unit">
          {[0, 90, 180, 270].map((angle) => (
            <g key={angle} transform={`rotate(${angle})`}>
              <ellipse cx="0" cy="-19" rx="8.6" ry="14" />
              <ellipse cx="0" cy="-19" rx="4.3" ry="7.6" />
            </g>
          ))}
          <circle cx="0" cy="0" r="1.6" fill="white" fillOpacity="0.45" stroke="none" />
          <path d="M0 -27 1.6 -25 0 -23 -1.6 -25Z" fill="white" fillOpacity="0.3" stroke="none" />
          <path d="M0 27 1.6 25 0 23 -1.6 25Z" fill="white" fillOpacity="0.3" stroke="none" />
        </g>
        <pattern id="wallet-art-kawung" width="64" height="64" patternUnits="userSpaceOnUse">
          <g fill="none" stroke="white" strokeOpacity="0.17" strokeWidth="1.15">
            {[
              [32, 32],
              [0, 0],
              [64, 0],
              [0, 64],
              [64, 64],
            ].map(([x, y]) => (
              <use key={`${x}-${y}`} href="#wallet-art-kawung-unit" x={x} y={y} />
            ))}
          </g>
        </pattern>

        {/* MEGA MENDUNG — awan Cirebon berlapis dengan curl di ujung */}
        <pattern id="wallet-art-mendung" width="96" height="48" patternUnits="userSpaceOnUse">
          <g fill="none" stroke="white" strokeLinecap="round">
            <path d="M0 40 Q12 12 24 40 Q36 12 48 40 Q60 12 72 40 Q84 12 96 40" strokeOpacity="0.18" strokeWidth="1.8" />
            <path d="M0 29 Q12 3 24 29 Q36 3 48 29 Q60 3 72 29 Q84 3 96 29" strokeOpacity="0.12" strokeWidth="1.6" />
            <path d="M0 19 Q12 -6 24 19 Q36 -6 48 19 Q60 -6 72 19 Q84 -6 96 19" strokeOpacity="0.08" strokeWidth="1.4" />
          </g>
          <g fill="white" fillOpacity="0.16" stroke="none">
            <circle cx="24" cy="40" r="1.1" />
            <circle cx="72" cy="29" r="1" />
            <circle cx="48" cy="19" r="0.9" />
          </g>
        </pattern>

        {/* PARANG — pita S diagonal + mlinjon emas (aksen `daisy`) */}
        <pattern
          id="wallet-art-parang"
          width="52"
          height="52"
          patternUnits="userSpaceOnUse"
          patternTransform="rotate(45)"
        >
          <g fill="none" stroke="white" strokeOpacity="0.16" strokeWidth="1.9" strokeLinecap="round">
            <path d="M-26 13 Q-13 3 0 13 T26 13 T52 13" />
            <path d="M-26 33 Q-13 23 0 33 T26 33 T52 33" />
          </g>
          <g className="text-daisy" fill="currentColor" stroke="none" opacity="0.5">
            <path d="M13 20 17 26 13 32 9 26Z" />
            <path d="M39 40 43 46 39 52 35 46Z" />
          </g>
        </pattern>

        {/* RINGS — kontur konsentris + cecek, motif "topografi" */}
        <pattern id="wallet-art-rings" width="150" height="150" patternUnits="userSpaceOnUse">
          <g fill="none" stroke="white" strokeWidth="1.6">
            <circle cx="150" cy="0" r="34" strokeOpacity="0.17" />
            <circle cx="150" cy="0" r="62" strokeOpacity="0.13" />
            <circle cx="150" cy="0" r="90" strokeOpacity="0.1" />
            <circle cx="150" cy="0" r="118" strokeOpacity="0.07" />
          </g>
          <g fill="white" fillOpacity="0.2" stroke="none">
            <circle cx="24" cy="112" r="1.1" />
            <circle cx="76" cy="46" r="1.1" />
            <circle cx="118" cy="132" r="1" />
          </g>
        </pattern>

        {/* GEOMETRI — tekstur cetak dasar (bukan motif tema), dipasang tipis */}
        <pattern id="wallet-art-geo" width="36" height="36" patternUnits="userSpaceOnUse">
          <g fill="none" stroke="white" strokeWidth="1">
            <path d="M18 1 35 18 18 35 1 18Z" strokeOpacity="0.9" />
            <path d="M0 0h36v36H0z" strokeOpacity="0.5" />
            <circle cx="18" cy="18" r="2.4" strokeOpacity="0.7" />
          </g>
        </pattern>
      </defs>
    </svg>
  )
}


/** motif yang punya definisi pattern di `WalletArtDefs` */
const KNOWN_ART: readonly WalletArt[] = ['kawung', 'mendung', 'parang', 'rings']

/**
 * motif aman untuk muka kartu.
 *
 * Data dompet lama / tema tak dikenal bisa membawa nilai di luar daftar. Tanpa
 * penjaga ini `url(#wallet-art-undefined)` menghasilkan lapisan KOSONG — persis
 * gejala "batik cuma muncul di 1–2 kartu". Kartu seperti itu sekarang jatuh ke
 * kawung, jadi SEMUA kartu tetap bercorak.
 */
function artIdOf(art: WalletArt | string | undefined): WalletArt {
  return KNOWN_ART.includes(art as WalletArt) ? (art as WalletArt) : 'kawung'
}

/**
 * Cangkang muka kartu dompet: gradien `wallet.face` + motif batik + lapisan
 * kaca/scrim/noise/geometris + halo di belakangnya.
 *
 * Mengembalikan FRAGMENT (halo + article) karena halo-nya harus boleh mekar
 * keluar tepi kartu sementara article-nya `overflow-hidden`.
 *
 * PAKET 77 â€” dua hal baru yang penting dibaca sebelum mengubah file ini:
 *   1. TEMA: warna & motif yang dipakai BUKAN selalu `wallet.face` mentah. Bila
 *      user memilih tema kustom untuk dompet ini, `useThemedWallet()` menimpanya
 *      di sini (lihat komentar di dalam fungsi);
 *   2. TEKSTUR: ada satu lapisan SVG geometris (`wallet-art-geo`, `opacity-5`)
 *      sebagai dasar muka kartu â€” bukan motif tema, tapi tekstur cetak.
 * Pemanggil tetap hanya boleh mengatur radius/padding/shadow/animasi.
 */
export function WalletFace({
  wallet,
  className,
  haloClassName = HALO_DEFAULT,
  children,
}: {
  wallet: WalletAccount
  /** radius, padding, shadow, animasi hover â€” bukan warna */
  className?: string
  /** penyesuaian halo bila kartunya dipakai sebagai hero (lebih besar) */
  haloClassName?: string
  children: ReactNode
}) {
  /* TEMA KARTU KUSTOM (paket 77) â€” dibaca DI SINI, bukan di tiap halaman.
     Peta `walletId â†’ themeId` hidup di `hooks/use-wallet-theme.ts`; karena muka
     kartu inilah satu-satunya tempat warna/motif dompet diputuskan, /wallet,
     /wallet/[id], dan pratinjau Tambah Dompet mustahil menampilkan tema berbeda
     untuk dompet yang sama. Tema tidak dikenal = dompet dikembalikan apa adanya,
     jadi kartu tanpa tema tetap memakai resep palet bawaannya. */
  const themed = useThemedWallet(wallet)
  const art = artIdOf(themed.art)
  return (
    <>
      <div aria-hidden className={cn('pointer-events-none', haloClassName, themed.color)} />
      <article
        data-catetind-kartu-dompet
        data-wallet-id={wallet.id}
        className={cn(
          'relative overflow-hidden text-cream ring-1 ring-inset ring-cream/30',
          CARD_TEXT_SHADOW,
          themed.face,
          className,
        )}
      >
        {/* lapisan kaca: sorot lembut kiri atas + sudut gelap â†’ kedalaman */}
        <div
          aria-hidden
          className="absolute inset-0 bg-gradient-to-br from-cream/20 via-cream/[0.04] to-soil/25"
        />
        {/* kilau holografik blush-lila menyapu diagonal â€” ciri kartu edisi khusus */}
        <div
          aria-hidden
          className="absolute inset-0 [background-image:linear-gradient(112deg,rgba(255,255,255,0.34)_0%,rgba(255,255,255,0)_32%,rgba(231,216,195,0.42)_56%,rgba(231,216,195,0.3)_72%,rgba(255,255,255,0)_92%)]"
        />
        {/* scrim halus di sisi kiri â€” jaga kontras teks di atas stop terang */}
        <div
          aria-hidden
          className="absolute inset-0 bg-gradient-to-r from-evergreen-deep/35 via-transparent to-transparent"
        />
        {/* tekstur noise halus supaya muka kartu tidak terasa flat */}
        <div
          aria-hidden
          className="absolute inset-0 opacity-[0.16] [background-image:radial-gradient(rgba(255,255,255,0.99)_1px,transparent_1.2px)] [background-size:9px_9px]"
        />
        {/* TEKSTUR GEOMETRIS — lapisan dasar low-opacity supaya muka kartu terasa
            benda fisik tercetak, bukan gradien datar. Duduk di PALING BAWAH
            teks (sebelum motif tema & seluruh skrim/kilau), jadi kontras nama
            + saldo di atasnya tidak berubah sedikit pun. */}
        <svg
          aria-hidden
          data-catetind-batik
          className="pointer-events-none absolute inset-0 h-full w-full opacity-5"
        >
          <rect width="100%" height="100%" fill="url(#wallet-art-geo)" />
        </svg>
        {/* CORAK BATIK UTAMA (kawung/mendung/parang/rings sesuai tema dompet).
            Memudar dari kanan atas supaya nama + saldo tetap tajam, tetapi
            bidangnya sengaja lebih LUAS dari versi lama (74% → 86% radius)
            supaya motif benar-benar terbaca di kartu yang kecil — termasuk
            kartu ke-3, ke-4, dan seterusnya di deck Dashboard. */}
        <svg
          aria-hidden
          data-catetind-batik
          className="pointer-events-none absolute inset-0 h-full w-full [mask-image:radial-gradient(165%_150%_at_90%_-14%,black_20%,transparent_86%)]"
        >
          <rect width="100%" height="100%" fill={`url(#wallet-art-${art})`} />
        </svg>
        {/* SABUK PARANG di kaki kartu — motif yang SAMA untuk semua dompet
            (bank, e-wallet, tunai). Ini jaminan bahwa tiap muka kartu punya
            corak batik, bahkan bila tema dompet memakai motif lain. */}
        <svg
          aria-hidden
          data-catetind-batik
          className="pointer-events-none absolute inset-0 h-full w-full [mask-image:linear-gradient(to_top,black_0%,black_16%,transparent_48%)]"
        >
          <rect width="100%" height="100%" fill="url(#wallet-art-parang)" />
        </svg>
        <div aria-hidden className="absolute -right-12 -top-16 size-40 rounded-full bg-cream/25 blur-3xl" />
        {/* highlight tipis di bibir atas kartu */}
        <div
          aria-hidden
          className="absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-cream/50 to-transparent"
        />
        {/* kilau menyapu saat kartu di-hover (parent wajib `group`) */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-y-0 left-0 w-1/3 -translate-x-[320%] -skew-x-12 bg-gradient-to-r from-transparent via-cream/30 to-transparent transition-transform duration-[900ms] ease-out group-hover:translate-x-[420%] motion-reduce:transition-none"
        />
        {children}
      </article>
    </>
  )
}

/**
 * Elemen kanan-atas muka kartu, MENGIKUTI benda aslinya:
 *   Â· Bank     â†’ chip EMV + untaian mutiara
 *   Â· E-Wallet â†’ monogram brand (tanpa chip/contactless/nomor kartu)
 *   Â· Tunai    â†’ ilustrasi tumpukan uang kertas (tanpa chip/nomor seri)
 *
 * `chipId` wajib unik per instance: gradien chip didefinisikan inline, jadi id
 * yang dipakai dua kali akan membuat DOM punya id ganda (mis. saat dua halaman
 * sempat hidup bersamaan di tengah transisi route).
 */
export function WalletTypeMark({
  wallet,
  chipId,
  className,
}: {
  wallet: WalletAccount
  chipId: string
  className?: string
}) {
  if (wallet.type === 'Bank') {
    /* SAPU BERSIH SVG HIASAN (sesi 3): chip EMV + untaian mutiara adalah
       dekorasi tiruan kartu fisik. Diganti monogram huruf â€” tetap informatif
       (membedakan jenis dompet), tanpa SVG. */
    return (
      <span
        className={cn(
          'flex size-9 shrink-0 items-center justify-center rounded-xl bg-cream/20 text-[14px] font-medium text-cream ring-1 ring-inset ring-cream/30',
          className,
        )}
      >
        {wallet.name.charAt(0)}
      </span>
    )
  }

  if (wallet.type === 'E-Wallet') {
    return (
      <span
        className={cn(
          'flex size-9 shrink-0 items-center justify-center rounded-xl bg-cream/20 text-[14px] font-medium text-cream ring-1 ring-inset ring-cream/30',
          className,
        )}
      >
        {wallet.name.charAt(0)}
      </span>
    )
  }

  /* SAPU BERSIH SVG HIASAN (sesi 3): tumpukan uang kertas adalah ilustrasi
     dekoratif. Tunai tidak butuh penanda kanan-atas. */
  void chipId
  return null
}

/**
 * Angka saldo dengan transisi privasi.
 *
 * PAKET 59 Â· 59.5 â€” bentuknya sekarang delegasi ke `<LockedAmount/>`: lebar
 * dikunci oleh DUA lapis teks yang ditumpuk di satu sel grid, dan titik sensornya
 * rata kiri tanpa `tracking` tambahan sehingga jatuh persis di posisi angka tadi.
 * Versi lama mengunci lebar dengan angka aslinya, tapi titiknya ditaruh
 * `absolute inset-0 justify-center tracking-[0.18em]` â€” hasilnya titik tidak
 * pernah berada di tempat angka tadi (angka rapat kiri, titik melebar ke tengah).
 *
 * SENSORNYA SATU â€” `MASKED_AMOUNT` (`lib/data/history.ts`), bukan titik lepas
 * yang ditulis per pemanggil. Keputusan 27 Sep 2026: dua dialek titik yang dulu
 * hidup di muka kartu ('â€¢â€¢â€¢â€¢â€¢â€¢' sebagai default & 'â€¢â€¢â€¢â€¢' yang dioper /wallet,
 * keduanya TANPA "Rp") dihapus supaya nominal tersensor selalu berbentuk
 * `Rp â€¢â€¢â€¢â€¢â€¢â€¢â€¢` di permukaan mana pun â€” sama seperti kartu, daftar transaksi, dan
 * toast.
 *
 * Nama & tanda tangannya dipertahankan supaya pemanggil lama (`/wallet`,
 * `/wallet/[id]`) tidak perlu tahu bahwa mesinnya pindah.
 */
export function MaskedAmount({
  value,
  masked,
  className,
}: {
  value: string
  masked: boolean
  className?: string
}) {
  return <LockedAmount value={value} masked={masked} className={className} />
}

/**
 * Chip EMV mock di sudut kanan atas muka kartu.
 *
 * `id` wajib unik per kartu: gradient emasnya didefinisikan inline, jadi id yang
 * sama di beberapa instance akan membuat DOM punya id duplikat.
 */
export function ChipIcon({ id, className }: { id: string; className?: string }) {
  return (
    <svg viewBox="0 0 32 24" className={className} aria-hidden>
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#f6edb7" />
          <stop offset="45%" stopColor="#ecd768" />
          <stop offset="100%" stopColor="#ffb885" />
        </linearGradient>
      </defs>
      <rect
        x="0.8"
        y="0.8"
        width="30.4"
        height="22.4"
        rx="4.2"
        fill={`url(#${id})`}
        stroke="rgba(255,255,255,0.45)"
        strokeWidth="0.9"
      />
      <g stroke="rgba(115,83,60,0.45)" strokeWidth="0.9" fill="none">
        <path d="M0.8 8.4h9.6M0.8 15.6h9.6" />
        <path d="M21.6 0.8v22.4" />
        <path d="M21.6 8.4h9.6M21.6 15.6h9.6" />
        <rect x="10.4" y="8.4" width="11.2" height="7.2" rx="1.6" />
      </g>
    </svg>
  )
}

/** Ikon contactless (tiga busur) di samping nama dompet. */
export function ContactlessIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
      <path
        d="M8.6 7.4a9.6 9.6 0 0 1 0 9.2M12.4 5.4a13.4 13.4 0 0 1 0 13.2M16.2 3.4a17.2 17.2 0 0 1 0 17.2"
        stroke="currentColor"
        strokeWidth="1.9"
        strokeLinecap="round"
      />
    </svg>
  )
}

/**
 * Ilustrasi uang kertas (varian muka kartu Tunai).
 *
 * Uang fisik TIDAK punya chip EMV, contactless, atau nomor seri â€” jadi elemen
 * kanan atas kartu Tunai memakai tumpukan lembaran ini, bukan chip kuningan
 * yang hanya masuk akal di muka kartu bank.
 */
export function CashStackIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" fill="none" className={className} aria-hidden>
      {/* tiga lembar kertas bertingkat = tumpukan uang */}
      <g stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round">
        <rect x="7" y="5" width="20" height="11" rx="2.2" opacity="0.45" />
        <rect x="5.5" y="9.5" width="20" height="11" rx="2.2" opacity="0.75" />
        <rect x="4" y="14" width="20" height="11" rx="2.2" />
      </g>
      {/* ornamen tengah lembaran (bukan chip) */}
      <circle cx="14" cy="19.5" r="2.6" stroke="currentColor" strokeWidth="1.5" opacity="0.9" />
      <g stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" opacity="0.75">
        <path d="M18.6 17.6h3.6M18.6 21.4h3.6" />
      </g>
    </svg>
  )
}

