'use client'

import { useState } from 'react'
import Image from 'next/image'
import { AlignRight, Bell, Search } from 'lucide-react'
import { ScreenShell } from './screen-shell'
import { LogoWordmark } from './logo-wordmark'
import { WalletCardStack } from './wallet-card-stack'
import { ExpenseDistributionCard } from './expense-distribution-card'
import { MyGoalsCard } from './my-goals-card'
import { RecentTransactionsCard } from './recent-transactions-card'
import { OverviewPanel } from './overview-panel'
import { cn } from '@/lib/utils'

export function HomeScreen() {
  const [overviewOpen, setOverviewOpen] = useState(false)

  return (
    <ScreenShell>
      <div
        className={cn(
          'transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]',
          overviewOpen && 'scale-[0.96] opacity-90',
        )}
      >
        {/* mobile header — the desktop sidebar takes over on large screens */}
        <header className="flex items-start justify-between lg:hidden">
          <LogoWordmark className="text-xl" />
          <div className="flex items-center gap-2">
            <button
              className="flex size-9 items-center justify-center rounded-full bg-white text-ink ring-1 ring-black/5"
              aria-label="Menu"
            >
              <AlignRight className="size-4" />
            </button>
            <span className="relative size-9 overflow-hidden rounded-full ring-1 ring-black/5">
              <Image
                src="/avatar-maarif.png"
                alt="Jon Snow"
                fill
                sizes="36px"
                className="object-cover"
              />
            </span>
          </div>
        </header>

        {/* greeting row — doubles as the desktop topbar */}
        <div className="mt-5 lg:mt-0 lg:flex lg:items-center lg:justify-between lg:gap-8">
          <div>
            <p className="text-sm text-ink/50">Hi Jon Snow,</p>
            <h1 className="text-3xl font-semibold tracking-tight text-ink lg:text-4xl">
              Welcome Back!
            </h1>
            <p className="mt-1 text-sm text-ink/50">
              {"Here's your latest account overview"}
            </p>
          </div>

          {/* desktop topbar actions */}
          <div className="hidden items-center gap-3 lg:flex">
            <label className="flex h-11 w-72 items-center gap-2.5 rounded-full bg-white px-4 ring-1 ring-black/5 transition-shadow focus-within:ring-2 focus-within:ring-forest/30">
              <Search className="size-4 shrink-0 text-ink/40" />
              <input
                type="search"
                placeholder="Search transactions..."
                className="w-full bg-transparent text-sm text-ink outline-none placeholder:text-ink/35"
              />
            </label>
            <button
              className="relative flex size-11 shrink-0 items-center justify-center rounded-full bg-white text-ink ring-1 ring-black/5 transition-colors hover:bg-sage"
              aria-label="Notifications"
            >
              <Bell className="size-4" />
              <span className="absolute right-3 top-3 size-2 rounded-full bg-mint ring-2 ring-white" />
            </button>
            <span className="relative size-11 shrink-0 overflow-hidden rounded-full ring-1 ring-black/5">
              <Image
                src="/avatar-maarif.png"
                alt="Jon Snow"
                fill
                sizes="44px"
                className="object-cover"
              />
            </span>
          </div>
        </div>

        {/* main grid — kiri: saldo + transaksi, kanan: distribusi + goals */}
        <div className="mt-6 grid grid-cols-1 gap-5 lg:mt-8 lg:grid-cols-12 lg:gap-6">
          <div className="flex flex-col gap-5 lg:col-span-7 lg:gap-6">
            <div>
              <WalletCardStack onOpen={() => setOverviewOpen(true)} />
              <p className="mt-4 text-center text-xs text-ink/40">
                Geser kartu untuk ganti dompet — tap untuk lihat Balance Overview
              </p>
            </div>
            <RecentTransactionsCard />
          </div>

          <div className="flex flex-col gap-5 lg:col-span-5 lg:gap-6">
            <ExpenseDistributionCard />
            <MyGoalsCard />
          </div>
        </div>
      </div>

      <OverviewPanel open={overviewOpen} onClose={() => setOverviewOpen(false)} />
    </ScreenShell>
  )
}
