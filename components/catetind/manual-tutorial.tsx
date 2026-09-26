import { MonitorDown, Smartphone } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { DeviceType } from '@/hooks/use-device-detect'
import { TUTORIALS, tutorialAriaLabel, tutorialCardTitle } from '@/lib/data/install'
import { InstallStepVisual } from './install-step-visual'

/**
 * ManualTutorial — panduan install langkah-per-langkah.
 *
 * Ini jalur utama untuk iOS (Safari tidak punya beforeinstallprompt) dan
 * fallback Android/desktop saat dialog install otomatis tidak tersedia.
 *
 * Isi langkah tinggal di `lib/data/install.ts`. Langkah yang butuh ditunjukkan
 * mengambil diagram nyata dari InstallStepVisual; langkah tanpa visual jelas
 * jujur tampil tanpa blok gambar — bukan kotak dashed placeholder.
 */
export function ManualTutorial({
  device,
  className,
}: {
  device: DeviceType
  className?: string
}) {
  const tutorial = TUTORIALS[device]
  const Icon = device === 'desktop' ? MonitorDown : Smartphone

  return (
    <section
      aria-label={tutorialAriaLabel(tutorial.label)}
      className={cn(
        'rounded-3xl bg-cream/85 p-4 ring-1 ring-soil/12 backdrop-blur-xl sm:p-5',
        className,
      )}
    >
      <header className="flex items-start gap-3">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-sage text-forest">
          <Icon className="size-4" strokeWidth={2.2} aria-hidden />
        </span>
        <div className="min-w-0">
          <h2 className="text-sm font-semibold text-ink">{tutorialCardTitle(tutorial.label)}</h2>
          <p className="mt-0.5 text-xs leading-relaxed text-ink/50">{tutorial.note}</p>
        </div>
      </header>

      <ol className="mt-4 space-y-2.5">
        {tutorial.steps.map((step, index) => (
          <li
            key={step.text}
            className="rounded-2xl bg-cream/70 px-3.5 py-3.5 ring-1 ring-forest/[0.07]"
          >
            <div className="flex items-start gap-3">
              <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-forest text-xs font-semibold text-mint">
                {index + 1}
              </span>
              <p className="pt-1 text-sm leading-relaxed text-ink/75">{step.text}</p>
            </div>

            {/* diagram hanya muncul kalau langkahnya memang punya visual jelas */}
            {step.visual && <InstallStepVisual visual={step.visual} className="mt-3" />}
          </li>
        ))}
      </ol>
    </section>
  )
}
