'use client'

import { MASKED_AMOUNT } from '@/lib/data/history'
import { cn } from '@/lib/utils'

/* ── LOCKED AMOUNT — nominal dengan LEBAR TERKUNCI (paket 59 · item 59.5) ─────
   Menekan tombol mata TIDAK BOLEH menggeser tata letak. Angka "Rp 1.450.000"
   yang berubah jadi "Rp •••••••" punya panjang berbeda; kalau panjangnya ikut
   berubah, semua elemen di sebelahnya melompat — di kartu dompet, di baris
   "Jatah Hari Ini", sampai label sumbu chart.

   Pola ini SATU-satunya cara menampilkan nominal yang bisa disensor:

     · DUA lapis teks ditumpuk di SATU sel grid (`col-start-1 row-start-1`),
       jadi lebar kotaknya = teks TERPANJANG di antara keduanya — titiknya
       sendiri tidak pernah bisa memotong teks di sebelahnya;
     · titiknya rata KIRI (`justify-self-start`) TANPA `tracking` tambahan,
       sehingga jatuh persis di posisi karakter pertama angka tadi;
     · angka aslinya tetap hidup di DOM (tidak di-unmount), jadi fade-nya mulus
       dan pengukuran lebar tidak pernah bergantung pada animasi.

   A11y: yang dibaca pembaca layar adalah nilai yang memang TERLIHAT — saat
   tersensor, angka aslinya `aria-hidden` (kanon §5.7: yang dibaca disensor).
   Nominal yang sedang DISUNTING tidak pernah lewat komponen ini: field input
   punya jalurnya sendiri. */

export function LockedAmount({
  value,
  masked,
  className,
}: {
  /** nominal yang sudah diformat pemanggil (mis. `formatIDR(balance)`) */
  value: string
  /** true = tampilkan titik sensor (`MASKED_AMOUNT`) */
  masked: boolean
  /** kelas tipografi/warna dari pemanggil — lebar TIDAK boleh diatur di sini */
  className?: string
}) {
  const fade = 'transition-all duration-300 ease-out motion-reduce:transition-none'
  /* `select-none` dipasang pada lapisan yang sedang TIDAK terlihat. Tanpa ini,
     menyalin teks (Ctrl+A / seleksi) menghasilkan DUA nilai sekaligus —
     "Rp 0" dan "Rp •••••••" — karena keduanya memang hidup di DOM (dan saat
     mode sensor aktif, menyalin justru membawa angka aslinya). */
  const hiddenSelect = 'select-none'

  return (
    <span className="inline-grid">
      <span
        aria-hidden={masked}
        className={cn(
          'col-start-1 row-start-1 justify-self-start',
          fade,
          masked ? cn('blur-[6px] opacity-0', hiddenSelect) : 'blur-0 opacity-100',
          className,
        )}
      >
        {value}
      </span>
      <span
        aria-hidden
        className={cn(
          'col-start-1 row-start-1 justify-self-start',
          fade,
          masked ? 'blur-0 opacity-100' : cn('blur-[6px] opacity-0', hiddenSelect),
          className,
        )}
      >
        {MASKED_AMOUNT}
      </span>
    </span>
  )
}
