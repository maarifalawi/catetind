'use client'

import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'
import { LockedAmount } from './locked-amount'
import type { WalletAccount } from '@/lib/wallets'

/* ── Muka kartu dompet — SATU sumber visual untuk /wallet DAN detailnya ──────
   Sebelumnya seluruh resep muka kartu (gradien `face`, motif batik `art`,
   lapisan kaca, scrim, kilau holografik, chip EMV) hidup di dalam
   wallet-screen.tsx. Ketika halaman detail dompet butuh kartu yang SAMA persis,
   menyalin resepnya berarti cepat atau lambat kedua halaman akan berbeda
   (satu kartu diubah, yang lain tertinggal) — dan user melihat dua "kartu BCA"
   yang tidak identik di satu app.

   Karena itu resepnya diangkat ke file ini:
     · <WalletArtDefs/>  → definisi pattern batik (dibuat sekali per halaman)
     · <WalletFace/>     → cangkang muka kartu + semua lapisan dekoratifnya
     · <WalletTypeMark/> → elemen kanan-atas yang MENGIKUTI benda aslinya
     · <MaskedAmount/>   → angka nominal yang ikut tombol mata global

   Aturan pakai: pemanggil HANYA boleh mengatur radius/padding/shadow/animasi
   lewat `className` — warna & teksturnya tidak boleh ditimpa dari luar, supaya
   deck kartu tetap satu keluarga di mana pun ia muncul. */

/** label jenis akun berbahasa Indonesia (data `type` tetap Inggris) */
export const WALLET_TYPE_LABEL: Record<WalletAccount['type'], string> = {
  Bank: 'Bank',
  'E-Wallet': 'E-Wallet',
  Cash: 'Tunai',
}

/** bayangan teks lembut — nama & saldo tetap terbaca di atas stop gradien termuda */
const CARD_TEXT_SHADOW = '[text-shadow:0_1px_9px_rgba(0,0,0,0.55)]'

/** halo default di belakang kartu (mekar saat hover lewat `group`) */
const HALO_DEFAULT =
  'absolute -inset-x-3 -bottom-4 top-6 rounded-[2.6rem] opacity-40 blur-2xl transition-all duration-500 ease-out group-hover:-bottom-6 group-hover:opacity-70 motion-reduce:transition-none'

/**
 * Definisi motif batik sekali di awal halaman, dipakai ulang tiap kartu lewat
 * `url(#wallet-art-…)`. Prefix `wallet-art` supaya tidak bentrok dengan id
 * pattern deck di Dashboard (`card-art-…`).
 */
export function WalletArtDefs() {
  return (
    <svg aria-hidden className="absolute size-0">
      <defs>
        {/* batik kawung: lingkaran-lingkaran saling beririsan */}
        <pattern id="wallet-art-kawung" width="72" height="72" patternUnits="userSpaceOnUse">
          <g fill="none" stroke="white" strokeOpacity="0.14" strokeWidth="1.6">
            <circle cx="36" cy="36" r="26" />
            <circle cx="0" cy="0" r="26" />
            <circle cx="72" cy="0" r="26" />
            <circle cx="0" cy="72" r="26" />
            <circle cx="72" cy="72" r="26" />
          </g>
          <circle cx="36" cy="36" r="5" fill="white" fillOpacity="0.14" />
        </pattern>
        {/* batik mega mendung: lengkung awan berlapis */}
        <pattern id="wallet-art-mendung" width="90" height="44" patternUnits="userSpaceOnUse">
          <g fill="none" stroke="white">
            <path d="M0 44 Q22.5 8 45 44 Q67.5 8 90 44" strokeOpacity="0.16" strokeWidth="1.8" />
            <path d="M0 32 Q22.5 -4 45 32 Q67.5 -4 90 32" strokeOpacity="0.1" strokeWidth="1.6" />
            <path d="M0 20 Q22.5 -16 45 20 Q67.5 -16 90 20" strokeOpacity="0.07" strokeWidth="1.4" />
          </g>
        </pattern>
        {/* batik parang: gelombang diagonal berirama */}
        <pattern id="wallet-art-parang" width="48" height="48" patternUnits="userSpaceOnUse">
          <g fill="none" stroke="white" strokeLinecap="round">
            <path d="M-12 36 Q0 24 12 36 T36 36 T60 36" strokeOpacity="0.15" strokeWidth="2" />
            <path d="M-12 20 Q0 8 12 20 T36 20 T60 20" strokeOpacity="0.1" strokeWidth="1.8" />
            <path d="M-12 44 Q0 32 12 44 T36 44 T60 44" strokeOpacity="0.07" strokeWidth="1.4" />
          </g>
        </pattern>
        {/* rings: garis kontur topografi konsentris */}
        <pattern id="wallet-art-rings" width="150" height="150" patternUnits="userSpaceOnUse">
          <g fill="none" stroke="white" strokeWidth="1.6">
            <circle cx="150" cy="0" r="34" strokeOpacity="0.17" />
            <circle cx="150" cy="0" r="62" strokeOpacity="0.13" />
            <circle cx="150" cy="0" r="90" strokeOpacity="0.1" />
            <circle cx="150" cy="0" r="118" strokeOpacity="0.07" />
          </g>
        </pattern>
      </defs>
    </svg>
  )
}


/**
 * Cangkang muka kartu dompet: gradien `wallet.face` + motif batik + lapisan
 * kaca/scrim/noise + halo di belakangnya.
 *
 * Mengembalikan FRAGMENT (halo + article) karena halo-nya harus boleh mekar
 * keluar tepi kartu sementara article-nya `overflow-hidden`.
 */
export function WalletFace({
  wallet,
  className,
  haloClassName = HALO_DEFAULT,
  children,
}: {
  wallet: WalletAccount
  /** radius, padding, shadow, animasi hover — bukan warna */
  className?: string
  /** penyesuaian halo bila kartunya dipakai sebagai hero (lebih besar) */
  haloClassName?: string
  children: ReactNode
}) {
  return (
    <>
      <div aria-hidden className={cn('pointer-events-none', haloClassName, wallet.color)} />
      <article
        className={cn(
          'relative overflow-hidden text-cream ring-1 ring-inset ring-cream/30',
          CARD_TEXT_SHADOW,
          wallet.face,
          className,
        )}
      >
        {/* lapisan kaca: sorot lembut kiri atas + sudut gelap → kedalaman */}
        <div
          aria-hidden
          className="absolute inset-0 bg-gradient-to-br from-cream/20 via-cream/[0.04] to-soil/25"
        />
        {/* kilau holografik blush-lila menyapu diagonal — ciri kartu edisi khusus */}
        <div
          aria-hidden
          className="absolute inset-0 [background-image:linear-gradient(112deg,rgba(255,255,255,0.34)_0%,rgba(255,255,255,0)_32%,rgba(231,216,195,0.42)_56%,rgba(231,216,195,0.3)_72%,rgba(255,255,255,0)_92%)]"
        />
        {/* scrim halus di sisi kiri — jaga kontras teks di atas stop terang */}
        <div
          aria-hidden
          className="absolute inset-0 bg-gradient-to-r from-[#1f2823]/35 via-transparent to-transparent"
        />
        {/* tekstur noise halus supaya muka kartu tidak terasa flat */}
        <div
          aria-hidden
          className="absolute inset-0 opacity-[0.16] [background-image:radial-gradient(rgba(255,255,255,0.99)_1px,transparent_1.2px)] [background-size:9px_9px]"
        />
        {/* aksen batik khas kartu (parang/mendung/kawung/rings) — tema per dompet
            seperti kartu bank edisi batik. Duduk di atas warna dasar & di bawah
            teks, memudar dari kanan atas supaya nama + saldo tetap terbaca. */}
        <svg
          aria-hidden
          className="absolute inset-0 h-full w-full [mask-image:radial-gradient(150%_135%_at_92%_-18%,black_14%,transparent_74%)]"
        >
          <rect width="100%" height="100%" fill={`url(#wallet-art-${wallet.art})`} />
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
 *   · Bank     → chip EMV + untaian mutiara
 *   · E-Wallet → monogram brand (tanpa chip/contactless/nomor kartu)
 *   · Tunai    → ilustrasi tumpukan uang kertas (tanpa chip/nomor seri)
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
    return (
      <div className={cn('flex shrink-0 flex-col items-end gap-2.5', className)}>
        <ChipIcon
          id={chipId}
          className="mt-0.5 h-6 w-8 shrink-0 drop-shadow-[0_2px_5px_rgba(0,0,0,0.35)]"
        />
        {/* untaian mutiara kecil di bawah chip — sentuhan perhiasan */}
        <span aria-hidden className="flex items-center gap-1 pr-0.5">
          <span className="size-1 rounded-full bg-cream/45" />
          <span className="size-1.5 rounded-full bg-cream/70 shadow-[0_0_6px_rgba(255,255,255,0.6)]" />
          <span className="size-1 rounded-full bg-cream/40" />
        </span>
      </div>
    )
  }

  if (wallet.type === 'E-Wallet') {
    return (
      <span
        className={cn(
          'flex size-9 shrink-0 items-center justify-center rounded-xl bg-cream/20 text-[13px] font-medium text-cream ring-1 ring-inset ring-cream/30',
          className,
        )}
      >
        {wallet.name.charAt(0)}
      </span>
    )
  }

  return (
    <span
      className={cn(
        'flex size-9 shrink-0 items-center justify-center rounded-xl bg-cream/20 text-cream ring-1 ring-inset ring-cream/30',
        className,
      )}
    >
      <CashStackIcon className="size-5" />
    </span>
  )
}

/**
 * Angka saldo dengan transisi privasi.
 *
 * PAKET 59 · 59.5 — bentuknya sekarang delegasi ke `<LockedAmount/>`: lebar
 * dikunci oleh DUA lapis teks yang ditumpuk di satu sel grid, dan titik sensornya
 * rata kiri tanpa `tracking` tambahan sehingga jatuh persis di posisi angka tadi.
 * Versi lama mengunci lebar dengan angka aslinya, tapi titiknya ditaruh
 * `absolute inset-0 justify-center tracking-[0.18em]` — hasilnya titik tidak
 * pernah berada di tempat angka tadi (angka rapat kiri, titik melebar ke tengah).
 *
 * SENSORNYA SATU — `MASKED_AMOUNT` (`lib/data/history.ts`), bukan titik lepas
 * yang ditulis per pemanggil. Keputusan 27 Sep 2026: dua dialek titik yang dulu
 * hidup di muka kartu ('••••••' sebagai default & '••••' yang dioper /wallet,
 * keduanya TANPA "Rp") dihapus supaya nominal tersensor selalu berbentuk
 * `Rp •••••••` di permukaan mana pun — sama seperti kartu, daftar transaksi, dan
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
 * Uang fisik TIDAK punya chip EMV, contactless, atau nomor seri — jadi elemen
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

