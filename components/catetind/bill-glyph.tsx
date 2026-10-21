'use client'

import {
  Baby,
  BookOpen,
  BrushCleaning,
  Bus,
  Car,
  Cat,
  Church,
  Clapperboard,
  Coffee,
  CreditCard,
  Dog,
  Droplet,
  Dumbbell,
  Fuel,
  Gamepad2,
  GraduationCap,
  Headphones,
  HeartPulse,
  Hospital,
  House,
  Laptop,
  Landmark,
  MoonStar,
  Music2,
  Palette,
  Pill,
  Plane,
  ReceiptText,
  School,
  ShoppingCart,
  Smartphone,
  Sparkles,
  Stethoscope,
  Tv,
  UtensilsCrossed,
  Wifi,
  Zap,
  type LucideIcon,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Bill } from '@/lib/data/bills'

/* ── GLIF TAGIHAN — SATU GAYA IKON UNTUK SELURUH DAFTAR ─────────────────────
   Dulu tiap kartu menampilkan emoji bawaan sistem: 🏠 realistis, 🎵 flat,
   🔌 bergaya lain lagi. Di satu daftar campuran itu terbaca seperti tempelan,
   bukan satu set ikon. Sekarang SEMUA tagihan memakai ikon garis Lucide
   (stroke 1.9) di dalam lingkaran Oat — bahasa visual yang sama dengan ikon
   dompet, kategori, dan navigasi di halaman lain.

   Emoji TETAP disimpan di data (nilainya dipakai sebagai kunci), tetapi
   picker di sheet tambah kini menampilkan ikon garis yang sama — bukan huruf
   emoji yang dirender berbeda-beda di tiap perangkat. Urutan resolusi:
   nama tagihan → emoji → kategori. */

/** emoji → ikon. Kunci dinormalkan tanpa variation selector (U+FE0F). */
const EMOJI_ICONS: Record<string, LucideIcon> = {
  '🏠': House,
  '🏡': House,
  '🎬': Clapperboard,
  '🎵': Music2,
  '🎶': Music2,
  '📱': Smartphone,
  '💳': CreditCard,
  '📶': Wifi,
  '🔌': Zap,
  '⚡': Zap,
  '💧': Droplet,
  '🏋': Dumbbell,
  '📚': BookOpen,
  '🚗': Car,
  '✨': Sparkles,
  '🛒': ShoppingCart,
  '🧾': ReceiptText,
  '🎮': Gamepad2,
  '☕': Coffee,
  '🍔': UtensilsCrossed,
  '🐶': Dog,
  '🐱': Cat,
  '💊': Pill,
  '🩺': Stethoscope,
  '🏫': School,
  '🎓': GraduationCap,
  '👶': Baby,
  '🚌': Bus,
  '⛽': Fuel,
  '✈': Plane,
  '🏥': Hospital,
  '🧹': BrushCleaning,
  '📺': Tv,
  '🎧': Headphones,
  '🎨': Palette,
  '🕋': Landmark,
  '🕌': MoonStar,
  '⛪': Church,
  '💻': Laptop,
}

/** nama tagihan → ikon (prioritas pertama); emoji & kategori jadi cadangan */
const NAME_ICONS: { pattern: RegExp; icon: LucideIcon }[] = [
  { pattern: /listrik|pln|token|daya/i, icon: Zap },
  { pattern: /internet|wifi|indihome|broadband/i, icon: Wifi },
  { pattern: /pdam|\bair\b/i, icon: Droplet },
  { pattern: /bensin|bbm|pertalite|pertamax/i, icon: Fuel },
  { pattern: /dokter|obat|klinik|rumah sakit|kesehatan/i, icon: HeartPulse },
  { pattern: /\bkos\b|kosan|kost|sewa|rumah|kontrakan|apartemen/i, icon: House },
  { pattern: /spotify|musik|music|apple music/i, icon: Music2 },
  { pattern: /netflix|vidio|disney|youtube|streaming|film/i, icon: Clapperboard },
  { pattern: /\b(hp|ponsel|phone|handphone|gadget)\b/i, icon: Smartphone },
  { pattern: /cicilan|kredit|kartu|paylater|kredivo|pinjaman|utang/i, icon: CreditCard },
  { pattern: /gym|olahraga|fitness|workout/i, icon: Dumbbell },
  { pattern: /asuransi|proteksi/i, icon: HeartPulse },
  { pattern: /pajak|retribusi|donasi|zakat|infaq/i, icon: Landmark },
  { pattern: /sekolah|kuliah|kursus|\bles\b|buku|pendidikan/i, icon: GraduationCap },
  { pattern: /bengkel|servis|parkir|\btol\b|transport/i, icon: Car },
]

/** kategori → ikon (jaring terakhir supaya tidak ada yang jatuh ke emoji) */
const CATEGORY_ICONS: Record<string, LucideIcon> = {
  Tagihan: ReceiptText,
  Hiburan: Clapperboard,
  'Kebutuhan Rumah': House,
  Transportasi: Car,
  Kesehatan: HeartPulse,
  Pendidikan: GraduationCap,
  Lainnya: Sparkles,
}

function normalizeEmoji(emoji?: string): string {
  return (emoji ?? '').replace(/\uFE0F/g, '')
}

/** ikon untuk satu emoji pilihan (dipakai juga oleh picker di sheet tambah)
 *  supaya pratinjau picker & ikon di daftar memakai bahasa visual yang sama. */
export function billEmojiIcon(emoji: string): LucideIcon | null {
  return EMOJI_ICONS[normalizeEmoji(emoji)] ?? null
}

/** ikon yang dipakai satu tagihan — ekspor supaya bisa dipakai ulang.
 *  Nama tagihan didahulukan: user yang menambah "Listrik" dengan ikon default
 *  🏠 tetap melihat ikon petir, bukan rumah. Emoji hanya dipakai saat nama
 *  tidak dikenali (mis. tagihan custom), dan kategori jadi jaring terakhir. */
export function billGlyphIcon(bill: Pick<Bill, 'emoji' | 'name' | 'category'>): LucideIcon {
  const fromName = NAME_ICONS.find(({ pattern }) => pattern.test(bill.name ?? ''))?.icon
  if (fromName) return fromName

  const fromEmoji = EMOJI_ICONS[normalizeEmoji(bill.emoji)]
  if (fromEmoji) return fromEmoji

  return CATEGORY_ICONS[bill.category ?? ''] ?? ReceiptText
}

/**
 * Lingkaran ikon tagihan. `size="sm"` dipakai di baris ringkas (timeline,
 * chip bulan depan), `size="md"` di kartu tagihan. Status lunas hanya
 * menurunkan kontras — bentuk & gaya garisnya tetap sama.
 */
export function BillGlyph({
  bill,
  size = 'md',
  muted = false,
  className,
}: {
  bill: Pick<Bill, 'emoji' | 'name' | 'category'>
  size?: 'sm' | 'md'
  muted?: boolean
  className?: string
}) {
  const Icon = billGlyphIcon(bill)
  return (
    <span
      aria-hidden
      className={cn(
        'flex shrink-0 items-center justify-center rounded-full transition-colors',
        size === 'md' ? 'size-10' : 'size-8',
        muted ? 'bg-sage/35 text-forest-muted' : 'bg-sage/60 text-forest',
        className,
      )}
    >
      <Icon
        className={size === 'md' ? 'size-[18px]' : 'size-4'}
        strokeWidth={1.9}
        aria-hidden
      />
    </span>
  )
}
