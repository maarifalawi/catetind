import { cn } from '@/lib/utils'

/**
 * InstallRewardBanner — spanduk ajakan pasang CatetInd di layar utama HP.
 *
 * Nama komponen dibiarkan apa adanya karena sudah dipakai halaman /install,
 * tapi isinya SUDAH BUKAN bonus. Dulu blok ini menjanjikan "+100 Nyawa AI" &
 * "Skin Papan Emas" yang otomatis masuk setelah app dibuka dari Homescreen —
 * janji yang tidak pernah bisa ditepati karena repo ini tidak punya backend
 * reward. Sekarang copy-nya jujur: satu-satunya "hadiah" memasang app di layar
 * utama adalah jalan pintas satu tap ke layar catat pengeluaran. Tidak ada
 * klaim bonus yang dikirim ke mana pun.
 */
export function InstallRewardBanner({ className }: { className?: string }) {
  return (
    <section className={cn('mt-6', className)}>
      <div className="relative overflow-hidden rounded-3xl bg-forest p-5 text-cream ring-1 ring-forest/20 sm:p-6">
        <div
          aria-hidden
          className="pointer-events-none absolute -top-12 -right-10 size-40 rounded-full bg-mint/20 blur-2xl"
        />

        <div className="relative">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-mint/15 px-2.5 py-1 text-[12px] font-medium tracking-[0.18em] text-mint uppercase">
            Dari Bestie Kamu
          </span>

          <h2 className="mt-3 text-lg leading-snug font-medium sm:text-xl">
            Pasang CatetInd di layar utama HP, yuk 💛
          </h2>

          <p className="mt-2 text-sm leading-relaxed text-cream/85">
            Biar buka aplikasi dan catat pengeluaran secepat kilat — tinggal tap ikonnya, gak
            perlu buka browser atau ngetik alamat lagi.
          </p>

          <ul className="mt-4 grid gap-2.5 sm:grid-cols-2">
            <li className="flex items-center gap-2.5 rounded-2xl bg-cream/10 px-3.5 py-3 ring-1 ring-cream/10">
              <span aria-hidden className="text-base">
                ⚡
              </span>
              <span className="text-sm font-medium">Sekali tap, app langsung kebuka.</span>
            </li>
            <li className="flex items-center gap-2.5 rounded-2xl bg-cream/10 px-3.5 py-3 ring-1 ring-cream/10">
              <span aria-hidden className="text-base">
                ✍️
              </span>
              <span className="text-sm font-medium">
                Langsung sampai ke layar catat, walau kamu lagi buru-buru.
              </span>
            </li>
          </ul>

          <p className="mt-4 text-xs leading-relaxed text-cream-muted">
            Jujur ya: yang kamu dapat cuma satu hal — jalan pintas ke layar catat. Itu aja, dan
            itu cukup bikin nyatet pengeluaran jadi lebih gampang.
          </p>
        </div>
      </div>
    </section>
  )
}
