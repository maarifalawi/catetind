'use client'

import { useMemo, useState, useSyncExternalStore } from 'react'
import { Sparkles, Sprout, X } from 'lucide-react'
import { TransactionWebModal } from '@/components/dashboard/transaction-web-modal'
import { DEMO_MODE } from '@/lib/demo'
import { cn } from '@/lib/utils'
import { HOME_NUDGE_COPY } from '@/lib/data/home'
import { shouldShowDailyNudge } from '@/lib/data/home-money'
import { isAccountEmpty, recordedTransactions, useMoneyStore } from '@/lib/money/store'
import { dismissNudge, isNudgeDismissedToday } from '@/lib/nudge-store'
import { useNudgeState } from '@/hooks/use-nudge-state'

/* ── Slot Nudge Kontekstual (Habit Loop, PRD Domain 3A) ───────────────────────
   Satu slot KECIL yang sifatnya conditional: tempat AI ngobrol singkat dengan
   user. Sifatnya bukan banner promosi — ia cuma muncul kalau memang ada yang
   perlu diingatkan, dan boleh ditutup untuk hari itu.

   Pembagian peran (supaya tidak ada CTA dobel — pelajaran dari audit #1):
   · WeeklyRecapBanner  → rekap akhir pekan (Jumat–Minggu)
   · HomeBanners        → renewal, kuota AI, sinking fund nudge
   · DailyNudge (ini)   → "hari ini belum ada catatan" — satu-satunya nudge yang
     menyentuh kebiasaan harian, CTA-nya membuka modal input yang SAMA dengan
     tombol utama di sidebar (Single Entry Point).

   PAKET 58 — PICUNYA KINI NYATA (temuan AKAR A): dulu baris `HAS_RECORD_TODAY =
   false` adalah konstanta, jadi "hari ini belum ada catatan" diucapkan bahkan
   ketika user baru saja mencatat. Sekarang fakta itu dibaca dari SATU store
   uang (`recordedTransactions()`), dan tanggalnya dari store nudge
   (`lib/nudge-store.ts`, yang memakai `todayISO()` lokal perangkat — bukan UTC).
   PAKET 64 — gerbang tanggal & penanda "sudah ditutup hari ini" ikut store itu,
   sehingga tidak ada lagi `useEffect` "hydrate dulu baru render" yang membuat
   nudge sempat berkedip muncul-hilang saat halaman dimuat. Nada nudge ini tetap
   benar-benar berhenti begitu ada catatan hari ini. Akun yang sudah dikosongkan
   ("Hapus Akun") tidak dinudge: tidak ada apa pun untuk dicatat di akun kosong. */

/** paksa tampil untuk kebutuhan review desain — perilaku produksi (default):
 *  nudge hanya muncul sore hari & hanya kalau hari ini belum dicatat.
 *  Saklarnya ikut `NEXT_PUBLIC_DEMO` (paket 42). */
const DEMO_FORCE_SHOW = DEMO_MODE


/** jam perangkat dibaca lewat `useSyncExternalStore`: server memakai `null`,
 *  client mengisi angka SAAT hidrasi (bukan sesudah cat pertama) — jadi nudge
 *  sore hari tidak "pop-in". Subscribe-nya no-op karena satu render = satu jam. */
const subscribeHour = () => () => {}
const readHour = (): number | null => (typeof window === 'undefined' ? null : new Date().getHours())
const seedHour = (): number | null => null

export function DailyNudge() {
  const [addOpen, setAddOpen] = useState(false)
  const hour = useSyncExternalStore(subscribeHour, readHour, seedHour)
  /* tanggal + penanda "sudah ditutup hari ini" dari SATU store nudge — persisten
     lintas reload tanpa hydration mismatch (lihat `lib/nudge-store.ts`). */
  const nudges = useNudgeState()
  const today = nudges.today
  const snapshot = useMoneyStore()

  /* apakah sudah ada catatan bertanggal HARI INI di ledger? — fakta dari store,
     bukan konstanta. `recordedTransactions()` sudah membuang tombstone. */
  const hasRecordToday = useMemo(
    () => recordedTransactions(snapshot).some((tx) => tx.date === today),
    [snapshot, today],
  )

  /* urutan gate: tanggal perangkat belum diketahui → sudah ditutup hari ini →
     akun kosong → jam & catatan nyata */
  if (!today || hour === null) return null
  if (isNudgeDismissedToday(nudges, 'daily-nudge')) return null

  /* pemicunya fungsi MURNI (shouldShowDailyNudge) supaya perilaku ini teruji: */
  const show = shouldShowDailyNudge({
    hour,
    hasRecordToday,
    accountEmpty: isAccountEmpty(snapshot),
    forceShow: DEMO_FORCE_SHOW,
  })
  if (!show) return null

  /* ditutup untuk HARI INI saja (per hari kalender) — penandanya di store nudge */
  const dismiss = () => dismissNudge('daily-nudge', today)

  return (
    <>
      <section
        aria-label={HOME_NUDGE_COPY.coachLabel}
        className={cn(
          'flex items-start gap-3 rounded-[2rem] bg-gradient-to-br from-sage/80 via-cream to-cream p-4 ring-1 ring-forest/10',
        )}
      >
        <span className="relative flex size-9 shrink-0 items-center justify-center rounded-full bg-cream text-forest ring-1 ring-soil/12">
          <Sprout className="size-4" strokeWidth={2.4} aria-hidden />
          <Sparkles
            className="absolute -right-0.5 -top-0.5 size-3 text-mint"
            strokeWidth={2.6}
            aria-hidden
          />
        </span>

        <div className="min-w-0 flex-1">
          <p className="flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-[0.14em] text-forest/60">
            {HOME_NUDGE_COPY.coachLabel}
          </p>
          <p className="mt-1 text-[13.5px] font-medium leading-snug text-forest">
            {HOME_NUDGE_COPY.title}
          </p>
          <p className="mt-1 text-[12.5px] leading-snug text-forest/55">
            {HOME_NUDGE_COPY.body}
          </p>
          <button
            type="button"
            onClick={() => setAddOpen(true)}
            className="mt-2.5 inline-flex items-center gap-1.5 rounded-full bg-forest px-3.5 py-1.5 text-[12px] font-medium text-cream transition-colors hover:bg-forest-soft active:scale-[0.97]"
          >
            {HOME_NUDGE_COPY.cta}
          </button>
        </div>

        <button
          type="button"
          onClick={dismiss}
          aria-label={HOME_NUDGE_COPY.dismissLabel}
          className="flex size-7 shrink-0 items-center justify-center rounded-full text-forest/35 transition-colors hover:bg-soil/8 hover:text-forest"
        >
          <X className="size-3.5" strokeWidth={2.4} aria-hidden />
        </button>
      </section>

      {/* modal input yang sama dengan tombol utama di sidebar — Single Entry Point */}
      <TransactionWebModal open={addOpen} onOpenChange={setAddOpen} />
    </>
  )
}
