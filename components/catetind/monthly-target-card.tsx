'use client'

import { memo } from 'react'
import Link from 'next/link'
import { ChevronRight, PiggyBank, Target } from 'lucide-react'
import { usePrivacy } from './privacy-provider'
import { monthlyNeeded } from '@/lib/data/budget'
import { MONTHLY_TARGET_CARD_COPY as COPY } from '@/lib/data/monthly-review'
import { useLiveFunds } from '@/lib/money/funds-store'

/**
 * Kartu kecil "Target bulan ini" di Home — efek NYATA dari ritual bulanan.
 *
 * Kenapa ada: modal Monthly Review hanya muncul sendiri tanggal 1–3. Tanpa kartu
 * ini, target yang sudah dipilih user akan "tersimpan sunyi" (tidak terlihat di
 * mana pun), dan tidak ada jalan membukanya lagi setelah auto-popup lewat.
 *
 * Dua wajah:
 *   • sudah ada target   → nominalnya + celengan pilihannya, tombol "Ubah"
 *   • belum ada target   → ajakan set target (20 detik), tombol "Set target 📌"
 *
 * Nama & saran bulanan celengan dibaca dari STORE (`useFundsStore()`), bukan
 * konstanta: kalau celengan yang dipilih ternyata sudah dihapus/diganti nama,
 * kartu ini ikut menyesuaikan — dan celengan yang baru ditanam juga langsung
 * dikenali. Nominal sarannya tetap dari `monthlyNeeded()` yang sama dengan
 * /budget, jadi angkanya tidak bisa berbeda antar layar.
 *
 * Dibungkus `memo` dan props-nya primitif/stabil (callback `useCallback` dari
 * HomeScreen), jadi kartu ini tidak ikut re-render saat state popup lain berubah.
 */
export const MonthlyTargetCard = memo(function MonthlyTargetCard({
  savedThisMonth,
  amount,
  fundId,
  onOpen,
}: {
  /** true = target yang ditampilkan memang milik bulan berjalan */
  savedThisMonth: boolean
  amount: number
  fundId: number | null
  onOpen: () => void
}) {
  const { money } = usePrivacy()
  const funds = useLiveFunds()
  const fund = fundId === null ? null : (funds.find((item) => item.id === fundId) ?? null)
  const fundName = fund?.name ?? null
  const fundMonthly = fund
    ? monthlyNeeded(fund.target, fund.current, fund.deadline)
    : null
  /* tautan ke /budget hanya masuk akal kalau memang ada celengan yang dipilih &
     nominal sarannya dihitung dari sisa target celengan itu */
  const showFundLink = savedThisMonth && fundName !== null && fundMonthly !== null

  return (
    <div className="rounded-2xl bg-cream ring-1 ring-soil/12">
      <button
        type="button"
        onClick={onOpen}
        aria-label={COPY.openLabel}
        className="flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-left transition-colors hover:bg-sage/25"
      >
        <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-sage text-forest">
          <Target className="size-4.5" strokeWidth={2.2} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[13px] font-medium text-forest">
            {savedThisMonth ? COPY.savingsLabel(money(amount)) : COPY.emptyTitle}
          </span>
          <span className="mt-0.5 block text-xs leading-relaxed text-forest/55">
            {savedThisMonth
              ? showFundLink && fundName
                ? COPY.fundLabel(fundName, money(fundMonthly))
                : COPY.title
              : COPY.emptyBody}
          </span>
        </span>
        <span className="flex shrink-0 items-center gap-1 rounded-full bg-forest px-3.5 py-2 text-[11.5px] font-medium text-cream">
          {savedThisMonth ? COPY.ctaEdit : COPY.ctaSet}
          <ChevronRight className="size-3.5" strokeWidth={2.6} />
        </span>
      </button>

      {/* pintasan ke halaman yang MEMANG punya alur setor — kartu ini tidak
          menduplikasi logika setoran celengan */}
      {showFundLink && (
        <div className="border-t border-soil/8 px-4 py-2">
          <Link
            href="/budget"
            className="inline-flex items-center gap-1.5 text-[11.5px] font-medium text-forest transition-colors hover:text-forest-soft"
          >
            <PiggyBank className="size-3.5" strokeWidth={2.4} />
            {COPY.fundLink}
            <ChevronRight className="size-3.5" strokeWidth={2.6} />
          </Link>
        </div>
      )}
    </div>
  )
})
