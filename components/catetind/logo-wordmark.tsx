import { cn } from '@/lib/utils'

/**
 * "catet" wordmark built from fonts:
 *  c / a / e — Plus Jakarta Sans (the "a" is a mirrored "e")
 *  t         — Yaldevi Colombo Medium
 */
export function LogoWordmark({ className }: { className?: string }) {
  return (
    <span
      role="img"
      aria-label="catet"
      className={cn(
        'inline-flex items-baseline font-jakarta text-2xl font-medium leading-none tracking-tight text-ink',
        className,
      )}
    >
      <span aria-hidden>c</span>
      <span aria-hidden className="-scale-x-100">
        e
      </span>
      <span aria-hidden className="font-yaldevi font-medium">
        t
      </span>
      <span aria-hidden>e</span>
      <span aria-hidden className="font-yaldevi font-medium">
        t
      </span>
    </span>
  )
}
