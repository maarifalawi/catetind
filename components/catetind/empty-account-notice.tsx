'use client'

import Link from 'next/link'
import { Sprout } from 'lucide-react'
import { EMPTY_ACCOUNT_COPY } from '@/lib/data/account'
import { isAccountEmpty, useMoneyStore } from '@/lib/money/store'
import { ONBOARDING_ROUTE } from '@/lib/onboarding'

/* ── KEADAAN KOSONG SETELAH AKUN DIHAPUS (paket 43 · Stage 6 #2) ─────────────
   Setelah user menghapus akunnya, Home TIDAK boleh lagi berpura-pura semuanya
   normal: dompet kanon di-upstream sudah tidak dipakai (`purged`), tapi kartu
   lain di halaman ini masih memuat angka contoh repo ini. Kalau keadaan itu
   dibiarkan tanpa satu kalimat pun, user yang baru selesai menghapus akun akan
   melihat "saldo" dan mengira datanya kembali — persis kesan yang tidak boleh
   muncul di aplikasi keuangan.

   Karena itu satu kartu kecil di atas grid: menyebut apa yang terjadi, apa yang
   masih contoh, dan jalan memulai lagi dari onboarding. `null` kalau akunnya
   masih punya data (mayoritas pemakaian tidak melihat ini sama sekali). */

export function EmptyAccountNotice() {
  const snapshot = useMoneyStore()
  if (!isAccountEmpty(snapshot)) return null

  return (
    <section
      role="status"
      aria-live="polite"
      className="mt-5 rounded-[1.75rem] bg-cream p-5 ring-1 ring-soil/12 sm:p-6"
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <p className="inline-flex items-center gap-2 text-[15px] font-semibold text-ink">
            <Sprout className="size-4 shrink-0 text-forest" strokeWidth={2.2} aria-hidden />
            {EMPTY_ACCOUNT_COPY.title}
          </p>
          <p className="mt-1.5 text-[13px] leading-relaxed text-ink/60">
            {EMPTY_ACCOUNT_COPY.body}
          </p>
          <p className="mt-1.5 text-[11.5px] leading-relaxed text-ink/45">
            {EMPTY_ACCOUNT_COPY.hint}
          </p>
        </div>

        <Link
          href={ONBOARDING_ROUTE}
          className="inline-flex shrink-0 items-center justify-center gap-2 rounded-2xl bg-forest px-5 py-3 text-sm font-semibold text-mint transition-colors hover:bg-forest-soft"
        >
          {EMPTY_ACCOUNT_COPY.cta}
        </Link>
      </div>
    </section>
  )
}
