import Link from 'next/link'
import {
  ArrowDownLeft,
  ArrowUpRight,
  Banknote,
  Car,
  ChevronRight,
  Coffee,
  ReceiptText,
  ShoppingBag,
  Sparkles,
  Zap,
  type LucideIcon,
} from 'lucide-react'
import { cn } from '@/lib/utils'

type Transaction = {
  icon: LucideIcon
  title: string
  category: string
  time: string
  amount: string
  type: 'income' | 'expense'
  /* tile ikon: gradient + drop shadow warna per kategori (makin kuat saat hover) */
  tile: string
}

type TransactionGroup = {
  label: string
  /* grup hari ini dapat dot mint berdenyut */
  live?: boolean
  items: Transaction[]
}

const GROUPS: TransactionGroup[] = [
  {
    label: 'Hari ini',
    live: true,
    items: [
      { icon: Coffee, title: 'Starbucks', category: 'Makanan & Minuman', time: '14:32', amount: '-Rp 85.000', type: 'expense', tile: 'bg-gradient-to-br from-amber-100 to-amber-50 text-amber-600 shadow-[0_8px_16px_-8px_rgba(217,119,6,0.45)] group-hover:shadow-[0_14px_24px_-8px_rgba(217,119,6,0.6)]' },
    ],
  },
  {
    label: 'Kemarin',
    items: [
      { icon: Banknote, title: 'Gaji Bulanan', category: 'Pemasukan', time: '09:00', amount: '+Rp 8.500.000', type: 'income', tile: 'bg-gradient-to-br from-mint/80 to-mint/25 text-forest shadow-[0_8px_16px_-8px_rgba(183,224,75,0.55)] group-hover:shadow-[0_14px_24px_-8px_rgba(183,224,75,0.7)]' },
      { icon: Car, title: 'Grab', category: 'Transport', time: '08:15', amount: '-Rp 42.000', type: 'expense', tile: 'bg-gradient-to-br from-blue-100 to-blue-50 text-blue-600 shadow-[0_8px_16px_-8px_rgba(37,99,235,0.4)] group-hover:shadow-[0_14px_24px_-8px_rgba(37,99,235,0.55)]' },
    ],
  },
  {
    label: '21 Sep',
    items: [
      { icon: Zap, title: 'Listrik PLN', category: 'Tagihan', time: '19:40', amount: '-Rp 350.000', type: 'expense', tile: 'bg-gradient-to-br from-yellow-100 to-yellow-50 text-yellow-700 shadow-[0_8px_16px_-8px_rgba(202,138,4,0.45)] group-hover:shadow-[0_14px_24px_-8px_rgba(202,138,4,0.6)]' },
      { icon: ShoppingBag, title: 'Shopee', category: 'Belanja', time: '16:05', amount: '-Rp 275.000', type: 'expense', tile: 'bg-gradient-to-br from-rose-100 to-rose-50 text-rose-500 shadow-[0_8px_16px_-8px_rgba(244,63,94,0.4)] group-hover:shadow-[0_14px_24px_-8px_rgba(244,63,94,0.55)]' },
    ],
  },
]

/* offset item kumulatif per grup — untuk delay animasi staggered */
const OFFSETS: number[] = []
{
  let acc = 0
  for (const group of GROUPS) {
    OFFSETS.push(acc)
    acc += group.items.length
  }
}

export function RecentTransactionsCard() {
  return (
    <div className="flex flex-col rounded-[2rem] bg-white p-6 ring-1 ring-black/5">
      {/* header — konsisten dengan kartu lain */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <span className="flex size-8 items-center justify-center rounded-full bg-sage text-forest">
            <ReceiptText className="size-4" strokeWidth={2.4} />
          </span>
          <div>
            <p className="text-sm font-semibold text-ink">Transaksi Terakhir</p>
            <p className="text-xs text-ink/45">Aktivitas 3 hari terakhir</p>
          </div>
        </div>
        <Link
          href="/insight"
          className="group/link flex items-center gap-1.5 rounded-full bg-sage py-1.5 pl-3 pr-1.5 text-[11px] font-semibold text-forest transition-colors duration-300 hover:bg-forest hover:text-mint"
        >
          Lihat semua
          <span className="flex size-4 items-center justify-center rounded-full bg-forest text-mint transition-colors duration-300 group-hover/link:bg-mint group-hover/link:text-forest">
            <ArrowUpRight className="size-2.5" strokeWidth={2.6} />
          </span>
        </Link>
      </div>

      {/* daftar transaksi — dikelompokkan per hari */}
      <div className="-mx-2 mt-4 flex flex-col gap-4">
        {GROUPS.map((group, gi) => (
          <section key={group.label}>
            <div className="mx-2 flex items-center gap-2">
              <p className="text-[10px] font-semibold tracking-[0.14em] text-ink/40 uppercase">
                {group.label}
              </p>
              {group.live && (
                <span className="relative flex size-1.5">
                  <span className="absolute inline-flex size-full animate-ping rounded-full bg-mint opacity-75" />
                  <span className="relative inline-flex size-1.5 rounded-full bg-mint" />
                </span>
              )}
              <span className="h-px flex-1 bg-black/5" />
            </div>

            <ul className="mt-1.5 flex flex-col gap-0.5">
              {group.items.map((tx, i) => {
                const Icon = tx.icon
                const isIncome = tx.type === 'income'
                return (
                  <li key={tx.title}>
                    <button
                      type="button"
                      aria-label={`${tx.title}, ${tx.category}, ${tx.amount}`}
                      className="group flex w-full cursor-pointer items-center gap-3 rounded-2xl px-2 py-2.5 text-left outline-none transition-all duration-200 animate-[row-in_0.5s_ease_backwards] hover:bg-cream hover:shadow-[0_10px_24px_-14px_rgba(18,40,31,0.35)] focus-visible:bg-cream focus-visible:ring-2 focus-visible:ring-forest/20 active:scale-[0.985]"
                      style={{ animationDelay: `${120 + (OFFSETS[gi] + i) * 70}ms` }}
                    >
                      {/* wrapper tile — badge di luar supaya tidak ke-clip overflow-hidden */}
                      <span className="relative shrink-0">
                        <span
                          className={cn(
                            'relative flex size-11 items-center justify-center overflow-hidden rounded-2xl transition-all duration-300 animate-[tile-pop_0.55s_cubic-bezier(0.34,1.56,0.64,1)_backwards] group-hover:-translate-y-0.5 group-hover:-rotate-6 group-hover:scale-105',
                            tx.tile,
                          )}
                          style={{ animationDelay: `${260 + (OFFSETS[gi] + i) * 70}ms` }}
                        >
                          {/* kilau atas ala kaca */}
                          <span
                            aria-hidden
                            className="absolute inset-x-0 top-0 h-1/2 bg-gradient-to-b from-white/60 to-transparent"
                          />
                          {/* shine sweep saat hover */}
                          <span
                            aria-hidden
                            className="absolute inset-0 -translate-x-[110%] skew-x-12 bg-gradient-to-r from-transparent via-white/70 to-transparent transition-transform duration-700 ease-out group-hover:translate-x-[110%]"
                          />
                          <Icon
                            className="relative size-5 drop-shadow-sm transition-transform duration-300 group-hover:scale-110"
                            strokeWidth={2.2}
                          />
                        </span>
                        {/* badge arah — masuk ↙ mint solid, keluar ↗ rose solid */}
                        <span
                          className={cn(
                            'absolute -bottom-1 -right-1 flex size-5 items-center justify-center rounded-full shadow-sm ring-2 ring-white transition-transform duration-300 animate-[fade-pop_0.4s_ease_backwards] group-hover:scale-110',
                            isIncome ? 'bg-mint text-forest' : 'bg-rose-400 text-white',
                          )}
                          style={{ animationDelay: `${400 + (OFFSETS[gi] + i) * 70}ms` }}
                        >
                          {isIncome ? (
                            <ArrowDownLeft className="size-3" strokeWidth={3} />
                          ) : (
                            <ArrowUpRight className="size-3" strokeWidth={3} />
                          )}
                        </span>
                      </span>

                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium text-ink">
                          {tx.title}
                        </span>
                        <span className="mt-0.5 block truncate text-[11px] text-ink/45">
                          {tx.category} · {tx.time}
                        </span>
                      </span>

                      <span
                        className={cn(
                          'shrink-0 text-sm font-semibold tabular-nums',
                          isIncome ? 'text-forest' : 'text-ink/80',
                        )}
                      >
                        {tx.amount}
                      </span>

                      <ChevronRight
                        className="size-4 shrink-0 -translate-x-1 text-forest opacity-0 transition-all duration-300 group-hover:translate-x-0 group-hover:opacity-100"
                        strokeWidth={2.4}
                      />
                    </button>
                  </li>
                )
              })}
            </ul>
          </section>
        ))}
      </div>

      {/* insight mingguan — pola strip yang sama dengan kartu distribusi */}
      <div className="mt-4 flex items-center justify-center gap-2 rounded-2xl bg-cream px-4 py-2.5 text-center text-xs leading-relaxed text-ink/55">
        <Sparkles className="size-3.5 shrink-0 text-forest" strokeWidth={2.2} />
        <span>
          Minggu ini <b className="font-semibold text-forest">+Rp 8.500.000</b> masuk,{' '}
          <b className="font-semibold text-ink">-Rp 752.000</b> keluar — net{' '}
          <b className="font-semibold text-forest">+Rp 7.748.000</b>
        </span>
      </div>
    </div>
  )
}
