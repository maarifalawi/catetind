import type { ReactNode } from 'react'
import { DesktopSidebar } from './desktop-sidebar'
import { cn } from '@/lib/utils'

export function ScreenShell({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <section className={cn('relative flex min-h-screen w-full', className)}>
      <DesktopSidebar />
      <div className="relative flex min-h-screen w-full min-w-0 flex-1 flex-col px-5 pb-32 pt-6 sm:px-8 lg:px-10 lg:pb-10 lg:pt-8 xl:px-14 xl:pt-10">
        {children}
      </div>
    </section>
  )
}
