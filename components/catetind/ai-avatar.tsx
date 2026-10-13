import Image from 'next/image'
import { cn } from '@/lib/utils'

/**
 * Avatar AI Coach — tombol melayang (FAB), kepala bubble, dan header panel.
 *
 * Dipakai bersama oleh `ai-chat-widget.tsx` (FAB + bubble teks + header panel)
 * dan `ai-capture-bubble.tsx` (bubble alur voice/scan), jadi wajah AI di semua
 * tempat itu mustahil berbeda. Diekstrak ke file sendiri ketimbang diekspor dari
 * widget supaya komponen anak tidak perlu mengimpor induknya.
 *
 * PAKET 94 (permintaan pemilik produk): penanda identitas AI memakai MARK BRAND
 * dari artwork resmi (brush "A!i" hitam) — bukan lagi ikon kilau Lucide
 * `Sparkles`, bukan teks "AI".
 *
 * File yang dipasang: `public/logo-ai.png` — artwork yang ditaruh langsung oleh
 * pemilik produk (1916×1930, PNG ber-alpha, ±2,6 MB). Permintaannya eksplisit:
 * dipakai APA ADANYA — "gausah di tambahin apa apa, gausah di tambahin
 * background2". Karena itu tidak ada pemrosesan/generate untuk file ini lagi
 * (langkah `pnpm icons` yang dulu memperkecilnya sudah dicabut dari
 * `scripts/generate-icons.mjs`), dan komponen ini TIDAK menambah apa pun:
 *   • tidak ada bentuk yang dipaksakan CSS — cakram putih + sudut transparannya
 *     bagian dari artwork; tepi bulatnya dibawa alpha file itu,
 *   • tidak ada `rounded-full`, ring, atau hairline,
 *   • tidak ada `bg-*`: tidak ada latar tambahan,
 *   • tidak ada crop/zoom/geser — komposisi mark di dalam cakram milik artwork.
 *
 * Akibatnya di atas permukaan putih app (`--color-cream` = `#ffffff`, termasuk
 * bubble chatnya) cakram putih itu melebur dengan latarnya sehingga yang terlihat
 * hanya mark-nya; di atas tombol forest (FAB), tepi cakram dibawa alpha artwork.
 *
 * `width`/`height` di bawah ditulis SAMA dengan ukuran file (1916×1930) supaya
 * rasio yang ditebak `next/image` jujur (repo ini `images.unoptimized`, jadi
 * yang dikirim ke browser ya file itu sendiri). Kalau file-nya diganti dengan
 * ukuran lain, perbarui dua angka ini — ukuran TAMPILAN tetap dari kelas
 * `size-*` di pemanggil, bukan dari angka ini.
 *
 * `alt=""` + `aria-hidden`: gambar ini murni hiasan, persis seperti ikon lucide
 * sebelumnya (lucide-react otomatis memberi `aria-hidden="true"` pada ikon tanpa
 * anak) — maknanya dibawa `aria-label`/judul pemanggilnya.
 *
 * Ukuran bawaan `size-7` (28px) = ukuran di kepala bubble; pemanggil yang butuh
 * lebih besar cukup menimpanya (header panel `size-9`, FAB `size-8`) karena
 * `cn()` memakai tailwind-merge.
 */
export function AIAvatar({ className }: { className?: string }) {
  return (
    <Image
      src="/logo-ai.png"
      alt=""
      aria-hidden
      width={1916}
      height={1930}
      className={cn('shrink-0', className ?? 'size-7')}
    />
  )
}
