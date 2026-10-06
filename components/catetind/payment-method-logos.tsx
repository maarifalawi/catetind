import {
  Banknote,
  Coins,
  Landmark,
  QrCode,
  ShoppingBag,
  Smartphone,
  type LucideIcon,
} from 'lucide-react'
import { cn } from '@/lib/utils'

/* ── Logo metode pembayaran (mock, monokrom) ───────────────────────────────────
   Mark digambar monokrom pakai `currentColor` + filter `grayscale`, jadi TIDAK ada
   warna brand yang masuk ke palet project (aturan: pakai palet CatetInd saja).
   Strukturnya siap ditukar aset SVG resmi dari Midtrans tanpa ubah pemakaian.

   `va` = Virtual Account (transfer bank). Mark-nya ikon gedung generik, BUKAN
   logo bank/QRIS berlisensi — metode hanya boleh disebut sebagai metode. */

export type PaymentMethodId = 'qris' | 'gopay' | 'ovo' | 'shopeepay' | 'dana' | 'va'

export const PAYMENT_METHODS: { id: PaymentMethodId; label: string; icon: LucideIcon }[] = [
  { id: 'qris', label: 'QRIS', icon: QrCode },
  { id: 'gopay', label: 'GoPay', icon: Coins },
  { id: 'ovo', label: 'OVO', icon: Smartphone },
  { id: 'shopeepay', label: 'ShopeePay', icon: ShoppingBag },
  { id: 'dana', label: 'DANA', icon: Banknote },
  { id: 'va', label: 'Virtual Account', icon: Landmark },
]

/** satu chip logo (mark + wordmark) — muted & netral, tanpa warna brand */
export function PaymentLogo({ id, className }: { id: PaymentMethodId; className?: string }) {
  const method = PAYMENT_METHODS.find((item) => item.id === id)
  if (!method) return null

  const Icon = method.icon
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-lg bg-cream px-2 py-1 ring-1 ring-soil/12',
        className,
      )}
    >
      <Icon className="size-3.5 text-forest/45" strokeWidth={2.4} />
      <span className="text-[10px] font-medium tracking-wide text-forest/45">{method.label}</span>
    </span>
  )
}

/** baris logo metode pembayaran — grayscale sesuai brief trust section */
export function PaymentLogoRow({ className }: { className?: string }) {
  return (
    <div className={cn('flex flex-wrap items-center gap-1.5 grayscale', className)}>
      {PAYMENT_METHODS.map((method) => (
        <PaymentLogo key={method.id} id={method.id} />
      ))}
    </div>
  )
}
