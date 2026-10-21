import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

/* ── CINCIN PROGRES (dipakai kartu budget & ringkasan) ───────────────────────
   Satu cincin untuk dua kebutuhan halaman Budget:
     · kartu kategori  → progres terpakai + TICK garis pacing ideal;
     · ringkasan       → total terpakai periode.

   Kenapa cincin, bukan bar tipis: bar 4px di daftar panjang terbaca sebagai
   hiasan, bukan angka. Cincin 44–60px memberi satu titik fokus per baris dan
   membuat halaman terasa seperti dashboard, bukan tabel.

   Implementasi sengaja tanpa library chart: dua <circle> + satu <line>. Busur
   mulai dari jam 12 (rotasi -90°) dan `stroke-dasharray` dianimasikan halus
   (aman untuk `prefers-reduced-motion`). `tickPct` menggambar garis pacing —
   posisi pengeluaran IDEAL hari ini — sehingga garis ideal dari desain lama
   tidak hilang, hanya pindah ke atas cincin. */
export function ProgressRing({
  percent,
  size = 44,
  stroke = 4.5,
  color,
  trackClassName = 'text-soil/[0.08]',
  tickPct,
  ariaLabel,
  title,
  className,
  children,
}: {
  /** 0–100+ (di atas 100 digambar penuh; angkanya tetap jujur) */
  percent: number
  size?: number
  stroke?: number
  /** warna hex busur — dari `PACING_HEX` (sumber tunggal status) */
  color: string
  /** kelas warna track (mis. `text-cream/15` di permukaan gelap) */
  trackClassName?: string
  /** posisi garis pacing ideal (0–100); kosong = tanpa tick */
  tickPct?: number
  /** kalau diisi, cincin diumumkan sebagai gambar dengan kalimat ini */
  ariaLabel?: string
  /** tooltip native untuk pengguna mouse (mis. penjelasan garis pacing) */
  title?: string
  className?: string
  /** isi tengah cincin (persen) */
  children?: ReactNode
}) {
  const radius = (size - stroke) / 2
  const circumference = 2 * Math.PI * radius
  const clamped = Math.min(100, Math.max(0, percent))
  const dash = (clamped / 100) * circumference
  const center = size / 2
  /* tick digambar dari tepi luar ke dalam, mulai jam 12 */
  const tickOuter = radius + stroke / 2 + 0.5
  const tickInner = radius - stroke / 2 - 1.5

  return (
    <span
      role={ariaLabel ? 'img' : undefined}
      aria-label={ariaLabel}
      title={title}
      className={cn('relative inline-flex shrink-0 items-center justify-center', className)}
      style={{ width: size, height: size }}
    >
      <svg viewBox={`0 0 ${size} ${size}`} className="size-full" aria-hidden>
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          strokeWidth={stroke}
          className={trackClassName}
          stroke="currentColor"
        />
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={`${dash} ${circumference - dash}`}
          transform={`rotate(-90 ${center} ${center})`}
          className="transition-[stroke-dasharray] duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none"
        />
        {tickPct != null && (
          <line
            x1={center}
            y1={center - tickOuter}
            x2={center}
            y2={center - tickInner}
            stroke="currentColor"
            strokeWidth={1.5}
            strokeLinecap="round"
            className="text-forest/30"
            transform={`rotate(${(Math.min(100, Math.max(0, tickPct)) / 100) * 360} ${center} ${center})`}
          />
        )}
      </svg>
      {children != null && (
        <span className="absolute inset-0 flex items-center justify-center">{children}</span>
      )}
    </span>
  )
}
