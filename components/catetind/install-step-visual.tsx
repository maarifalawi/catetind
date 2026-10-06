import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'
import { VISUAL_CAPTION, type InstallVisualKey } from '@/lib/data/install'

/* ── Diagram langkah install · /install ──────────────────────────────────────
   Prinsip halaman ini: TUNJUKKAN, JANGAN JELASKAN. Satu diagram posisi tombol
   Share menyelesaikan lebih banyak kebingungan daripada tiga paragraf.

   Aturan gambar (sama dengan ios-install-arrow.tsx):
   • SVG inline, `aria-hidden` — maknanya dibawa caption teks yang bisa dibaca
     screen reader & ikut ukuran font user (bukan teks di dalam SVG).
   • Warna HANYA dari palet: `currentColor` mewarisi warna teks figura
     (`text-forest`), sorotan memakai kelas token (`text-mint`). Nol hex/rgb.
   • Bentuk geometris abstrak — TIDAK menyalin ikon/logo browser & OS berlisensi.
   • Kanvas tetap 0 0 320 88 + `w-full` supaya skalanya sama di 375 px maupun
     desktop, dan tidak pernah memaksa horizontal scroll.
   ─────────────────────────────────────────────────────────────────────────── */

/** baris teks palsu — menggambarkan label tanpa merender huruf (nol dependency font) */
function TextLine({
  x,
  y,
  w,
  h = 5,
  opacity = 0.3,
}: {
  x: number
  y: number
  w: number
  h?: number
  opacity?: number
}) {
  return <rect x={x} y={y} width={w} height={h} rx={h / 2} fill="currentColor" opacity={opacity} />
}

/** tombol ikon netral (belum disorot) — kotak kecil di toolbar/menu */
function MutedIconBox({ x, y, w = 13, h = 12 }: { x: number; y: number; w?: number; h?: number }) {
  return <rect x={x} y={y} width={w} height={h} rx={3} fill="currentColor" opacity={0.22} />
}

/** sorotan lembut di belakang ikon yang jadi target tap (warna uang/positif = mint) */
function TapSpotlight({ cx, cy, r }: { cx: number; cy: number; r: number }) {
  return (
    <g className="text-mint">
      <circle cx={cx} cy={cy} r={r} fill="currentColor" opacity={0.55} />
      <circle
        cx={cx}
        cy={cy}
        r={r}
        fill="none"
        stroke="currentColor"
        strokeOpacity={0.85}
        strokeWidth={1.5}
      />
    </g>
  )
}

/** glyph "pasang ke perangkat": panah turun menuju garis dasar */
function InstallGlyph({ x, y }: { x: number; y: number }) {
  return (
    <g
      className="text-forest"
      fill="none"
      stroke="currentColor"
      strokeWidth={2.2}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d={`M${x} ${y} v9`} />
      <path d={`M${x - 3.5} ${y + 5.5} L${x} ${y + 9} L${x + 3.5} ${y + 5.5}`} />
      <path d={`M${x - 5.5} ${y + 12.5} h11`} />
    </g>
  )
}

/** kelima diagram langkah — dipetakan lewat kunci dari data, bukan if-bertingkat */
const DIAGRAMS: Record<InstallVisualKey, () => ReactNode> = {
  'ios-share-button': IosShareButtonDiagram,
  'ios-add-to-home': IosAddToHomeDiagram,
  'android-menu': AndroidMenuDiagram,
  'android-install-item': AndroidInstallItemDiagram,
  'desktop-address-bar': DesktopAddressBarDiagram,
}

/**
 * InstallStepVisual — satu diagram untuk satu langkah panduan.
 *
 * `visual` datang dari `lib/data/install.ts`, jadi menambah/menghapus langkah
 * bergambar cukup diubah di data; langkah tanpa visual jujur tidak punya blok
 * gambar sama sekali (lebih baik daripada kotak kosong).
 */
export function InstallStepVisual({
  visual,
  className,
}: {
  visual: InstallVisualKey
  className?: string
}) {
  const Diagram = DIAGRAMS[visual]

  return (
    <figure className={cn('rounded-2xl bg-sage/50 px-3 py-3 ring-1 ring-forest/10', className)}>
      {/* warna strok utama mewarisi `text-forest` dari figura ini */}
      <div className="mx-auto w-full max-w-[320px] text-forest">
        <svg viewBox="0 0 320 88" className="h-auto w-full" aria-hidden>
          <Diagram />
        </svg>
      </div>
      <figcaption className="mt-2 text-center text-[11px] leading-snug text-forest/50">
        {VISUAL_CAPTION[visual]}
      </figcaption>
    </figure>
  )
}

/* ── Diagram 1 · iOS: tombol Share di toolbar bawah Safari ──────────────────
   Yang paling sering dicari user: tombol Share "tersembunyi" di toolbar bawah.
   Karena itu ia yang paling terang (mint) dan sisanya dibiarkan redup. */
function IosShareButtonDiagram() {
  return (
    <>
      <rect
        x={8}
        y={34}
        width={304}
        height={46}
        rx={14}
        fill="currentColor"
        opacity={0.06}
        stroke="currentColor"
        strokeOpacity={0.18}
        strokeWidth={1.5}
      />
      <MutedIconBox x={30} y={49} w={24} h={16} />
      <MutedIconBox x={266} y={49} w={24} h={16} />
      <TapSpotlight cx={160} cy={57} r={21} />
      <g
        className="text-forest"
        fill="none"
        stroke="currentColor"
        strokeWidth={2.4}
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {/* kotak "share" dengan tutup terbuka + panah keluar */}
        <path d="M153 55 v7 h14 v-7" />
        <path d="M160 64 V45" />
        <path d="M154.5 50.5 L160 45 L165.5 50.5" />
      </g>
    </>
  )
}

/* ── Diagram 2 · iOS: sheet 'Tambahkan ke Layar Utama' + tombol 'Tambah' ─── */
function IosAddToHomeDiagram() {
  return (
    <>
      <rect
        x={46}
        y={4}
        width={228}
        height={80}
        rx={16}
        fill="currentColor"
        opacity={0.06}
        stroke="currentColor"
        strokeOpacity={0.18}
        strokeWidth={1.5}
      />
      {/* tombol 'Tambah' di pojok kanan atas — digambar sebagai pill + tanda plus */}
      <g className="text-forest">
        <rect x={204} y={8} width={62} height={18} rx={9} fill="currentColor" opacity={0.14} />
        <g
          fill="none"
          stroke="currentColor"
          strokeWidth={2.2}
          strokeLinecap="round"
          strokeOpacity={0.7}
        >
          <path d="M235 13 v8" />
          <path d="M231 17 h8" />
        </g>
      </g>
      {/* baris menu biasa */}
      <rect x={58} y={32} width={204} height={22} rx={8} fill="currentColor" opacity={0.05} />
      <MutedIconBox x={68} y={37} />
      <TextLine x={88} y={40} w={104} opacity={0.26} />
      {/* baris yang harus user pilih */}
      <g className="text-mint">
        <rect x={58} y={58} width={204} height={22} rx={8} fill="currentColor" opacity={0.5} />
      </g>
      <g className="text-forest">
        <rect
          x={68}
          y={61}
          width={15}
          height={15}
          rx={3.5}
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
        />
        <g fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round">
          <path d="M75.5 65.5 v6" />
          <path d="M72.5 68.5 h6" />
        </g>
        <rect x={92} y={64} width={96} height={5} rx={2.5} fill="currentColor" opacity={0.5} />
        <rect x={92} y={72} width={56} height={4} rx={2} fill="currentColor" opacity={0.32} />
      </g>
    </>
  )
}

/* ── Diagram 3 · Android: ikon titik tiga di bar atas Chrome ────────────────
   Diagram sengaja memotret BAR ATAS saja (bukan seluruh layar) supaya mata user
   langsung jatuh ke satu-satunya titik yang penting. */
function AndroidMenuDiagram() {
  return (
    <>
      <rect
        x={8}
        y={14}
        width={304}
        height={60}
        rx={14}
        fill="currentColor"
        opacity={0.05}
        stroke="currentColor"
        strokeOpacity={0.18}
        strokeWidth={1.5}
      />
      <rect
        x={26}
        y={26}
        width={210}
        height={24}
        rx={12}
        fill="currentColor"
        opacity={0.08}
        stroke="currentColor"
        strokeOpacity={0.18}
        strokeWidth={1.2}
      />
      <TextLine x={40} y={36} w={120} />
      <TapSpotlight cx={282} cy={38} r={17} />
      <g className="text-forest" fill="currentColor">
        <circle cx={282} cy={31} r={2.3} />
        <circle cx={282} cy={38} r={2.3} />
        <circle cx={282} cy={45} r={2.3} />
      </g>
    </>
  )
}

/* ── Diagram 4 · Android: item install di dalam menu ─────────────────────── */
function AndroidInstallItemDiagram() {
  return (
    <>
      <rect
        x={124}
        y={4}
        width={188}
        height={80}
        rx={14}
        fill="currentColor"
        opacity={0.06}
        stroke="currentColor"
        strokeOpacity={0.18}
        strokeWidth={1.5}
      />
      {/* item netral di atas & bawah — konteks menu, bukan target */}
      <rect x={136} y={11} width={164} height={20} rx={8} fill="currentColor" opacity={0.05} />
      <MutedIconBox x={146} y={15} />
      <TextLine x={166} y={16} w={88} opacity={0.26} />
      <rect x={136} y={59} width={164} height={20} rx={8} fill="currentColor" opacity={0.05} />
      <MutedIconBox x={146} y={63} />
      <TextLine x={166} y={64} w={72} opacity={0.2} />
      {/* item yang harus user pilih */}
      <g className="text-mint">
        <rect x={136} y={35} width={164} height={20} rx={8} fill="currentColor" opacity={0.5} />
      </g>
      <InstallGlyph x={152.5} y={39} />
      <g className="text-forest">
        <rect x={166} y={40} width={92} height={5} rx={2.5} fill="currentColor" opacity={0.5} />
        <rect x={166} y={48} width={58} height={4} rx={2} fill="currentColor" opacity={0.32} />
      </g>
    </>
  )
}

/* ── Diagram 5 · Desktop: ikon install di ujung kanan address bar ───────────
   Di desktop, ikon ini sering terlewat karena kecil dan nyempil di kanan —
   jadi posisinya digambar apa adanya, bukan diidealkan. */
function DesktopAddressBarDiagram() {
  return (
    <>
      <rect
        x={8}
        y={12}
        width={304}
        height={64}
        rx={14}
        fill="currentColor"
        opacity={0.05}
        stroke="currentColor"
        strokeOpacity={0.18}
        strokeWidth={1.5}
      />
      <g fill="currentColor" opacity={0.3}>
        <circle cx={22} cy={22} r={2} />
        <circle cx={30} cy={22} r={2} />
        <circle cx={38} cy={22} r={2} />
      </g>
      <rect
        x={52}
        y={30}
        width={176}
        height={26}
        rx={13}
        fill="currentColor"
        opacity={0.08}
        stroke="currentColor"
        strokeOpacity={0.18}
        strokeWidth={1.2}
      />
      <TextLine x={68} y={40} w={110} />
      <TapSpotlight cx={252} cy={43} r={17} />
      <InstallGlyph x={252} y={35} />
    </>
  )
}


