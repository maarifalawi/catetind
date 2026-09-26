import { MonitorDown, Smartphone } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { DeviceType } from '@/hooks/use-device-detect'

export type Tutorial = {
  /** label tab + judul kartu */
  label: string
  /** catatan kecil di bawah judul */
  note: string
  steps: string[]
}

/** isi panduan manual per perangkat — copy kanon halaman /install */
export const TUTORIALS: Record<DeviceType, Tutorial> = {
  ios: {
    label: 'iPhone / iPad',
    note: 'Wajib Safari ya — Chrome & browser lain di iPhone tidak bisa install PWA.',
    steps: [
      'Buka catetind.com di browser Safari (wajib Safari, Chrome iOS tidak support).',
      'Tap ikon Share (📤) di bagian bawah layar.',
      "Scroll ke bawah, pilih 'Tambahkan ke Layar Utama' (➕).",
      "Tap 'Tambah' di pojok kanan atas. Selesai!",
    ],
  },
  android: {
    label: 'Android',
    note: 'Paling mulus dari Chrome. Kalau tombol install otomatis tidak muncul, pakai cara ini.',
    steps: [
      'Buka catetind.com di browser Chrome.',
      'Tap ikon titik tiga (⋮) di sudut kanan atas.',
      "Pilih 'Install Aplikasi' atau 'Tambahkan ke Layar Utama'.",
      'Konfirmasi install. Ikon CatetInd muncul di menu HP kamu!',
    ],
  },
  desktop: {
    label: 'Desktop',
    note: 'Chrome atau Edge — paling cepat lewat ikon install di address bar.',
    steps: [
      'Buka catetind.com di Chrome atau Edge.',
      'Klik ikon Install (⬇️) di sisi kanan address bar.',
      "Klik 'Install'. CatetInd terbuka sebagai aplikasi desktop mandiri.",
    ],
  },
}

/**
 * ManualTutorial — panduan install langkah-per-langkah.
 *
 * Ini adalah jalur utama untuk iOS (Safari tidak punya beforeinstallprompt) dan
 * fallback untuk Android/desktop saat dialog install otomatis tidak tersedia.
 * Tiap langkah punya nomor bulat + slot ilustrasi (masih placeholder).
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
      aria-label={`Panduan install ${tutorial.label}`}
      className={cn(
        'rounded-3xl bg-cream/85 p-4 ring-1 ring-soil/12 backdrop-blur-xl sm:p-5',
        className,
      )}
    >
      <header className="flex items-start gap-3">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-sage text-forest">
          <Icon className="size-4" strokeWidth={2.2} />
        </span>
        <div className="min-w-0">
          <h2 className="text-sm font-semibold text-ink">
            Cara install di {tutorial.label}
          </h2>
          <p className="mt-0.5 text-xs leading-relaxed text-ink/50">{tutorial.note}</p>
        </div>
      </header>

      <ol className="mt-4 space-y-2.5">
        {tutorial.steps.map((step, index) => (
          <li
            key={step}
            className="rounded-2xl bg-cream/70 px-3.5 py-3.5 ring-1 ring-forest/[0.07]"
          >
            <div className="flex items-start gap-3">
              <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-forest text-xs font-semibold text-mint">
                {index + 1}
              </span>
              <p className="pt-1 text-sm leading-relaxed text-ink/75">{step}</p>
            </div>

            {/* TODO: Add animated GIF or Lottie illustration for this step */}
            <div className="mt-3 flex h-24 items-center justify-center rounded-xl border-2 border-dashed border-forest/15 bg-cream/70 text-[11px] font-medium text-ink/35">
              [Ilustrasi segera hadir]
            </div>
          </li>
        ))}
      </ol>
    </section>
  )
}
