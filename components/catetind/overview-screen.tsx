import { MoreVertical } from 'lucide-react'
import { ScreenShell } from './screen-shell'
import { BalanceRing } from './balance-ring'
import { IncomeCard } from './income-card'

export function OverviewScreen() {
  return (
    <ScreenShell>
      <div className="lg:grid lg:min-h-[calc(100vh-8rem)] lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:items-center lg:gap-12">
        <header className="flex items-start justify-between lg:col-start-1 lg:row-start-1">
          <div>
            <h1 className="font-display text-3xl font-semibold leading-tight tracking-tight text-ink lg:text-4xl">
              Your Balance
              <br />
              Overview
            </h1>
            <p className="mt-1 text-sm text-ink/50">
              Track spending, earnings, and insights
            </p>
          </div>
          <button
            className="flex size-9 items-center justify-center rounded-full bg-white text-ink ring-1 ring-black/5"
            aria-label="Options"
          >
            <MoreVertical className="size-4" />
          </button>
        </header>

        <div className="mt-8 lg:col-start-2 lg:row-span-2 lg:row-start-1 lg:mt-0">
          <BalanceRing />
        </div>

        <div className="mt-10 lg:col-start-1 lg:row-start-2 lg:mt-8">
          <IncomeCard />
        </div>
      </div>
    </ScreenShell>
  )
}
