'use client'

import { memo, useEffect, useState } from 'react'
import Link from 'next/link'
import { Fuel, PiggyBank, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { SINKING_NUDGE_COPY } from '@/lib/data/budget'
import { AI_GAUGE_BANNER_COPY, AI_QUOTA_EXHAUSTED_COPY, complementaryPct, planQuota } from '@/lib/ai-quota'
import { useAiQuota } from '@/hooks/use-ai-quota'
import { useNudgeState } from '@/hooks/use-nudge-state'
import {
  dismissNudge,
  isNudgeDismissedToday,
  markNudgeShown,
  wasNudgeShownTodayAtLoad,
  type NudgeId,
} from '@/lib/nudge-store'
import { DEMO_MODE } from '@/lib/demo'
import { useSubscriptionGate } from './subscription-gate-provider'
import { TopUpModal } from './top-up-modal'

/* ── mock kondisi — nanti dari backend (Domain 5A, 2C.3, 4B) ──
   Catatan: kondisi RENEWAL tidak lagi hidup di sini. Ia dibaca dari
   `lib/data/renewal.ts` (satu sumber dengan modal Renewal), supaya banner &
   modalnya tidak pernah beda cerita soal sisa hari.
   Sama untuk pemakaian AI: angkanya dibaca dari `lib/ai-quota.ts`, bukan
   di-mock ulang di sini — soft-nudge ini menilai angka yang sama dengan yang
   tampil di kartu sidebar, halaman Billing, dan dokumen /terms. */
const DEMO = {
  /* tanggal >5 & belum kontribusi (Domain 2C.3). Saklarnya ikut
     `NEXT_PUBLIC_DEMO` (paket 42): di produksi nudge ini hanya boleh muncul
     kalau kondisinya BENAR-BENAR terjadi, bukan selalu. */
  sinkingFundPending: DEMO_MODE,
}

/** ambang soft-nudge ala PRD 4770/4894: muncul hanya saat pemakaian >70% */
const SOFT_NUDGE_USAGE_PCT = 70

/** shell banner kompak — ikon, copy, CTA opsional, tombol dismiss */
function BannerShell({
  icon,
  tone,
  title,
  body,
  cta,
  onDismiss,
  dismissLabel,
}: {
  icon: React.ReactNode
  tone: 'amber' | 'white'
  title: React.ReactNode
  body?: React.ReactNode
  cta?: React.ReactNode
  onDismiss: () => void
  dismissLabel: string
}) {
  return (
    <div
      role="status"
      className={cn(
        'rounded-2xl px-4 py-3 ring-1',
        tone === 'amber' && 'bg-hud-amber/10 ring-hud-amber/25',
        tone === 'white' && 'bg-cream ring-soil/12',
      )}
    >
      {/* Ikon + copy + tombol tutup di baris pertama; tombol AKSI di baris
          sendiri (rata kanan). Dulu aksi duduk sebaris dengan judul, dan di
          375px itu menyisakan ~140px untuk judul — judul pendek pun harus
          dipotong ellipsis atau turun baris. Dengan aksi dipindah ke bawah,
          judul dapat seluruh lebar kartu dan tetap SATU baris tanpa dipotong. */}
      <div className="flex items-center gap-3">
        {icon}
        <div className="min-w-0 flex-1">
          <p className="text-[14px] leading-snug font-medium break-words text-forest">{title}</p>
          {body && <p className="mt-0.5 text-xs leading-relaxed text-forest/55">{body}</p>}
        </div>
        <button
          type="button"
          aria-label={dismissLabel}
          onClick={onDismiss}
          className="flex size-7 shrink-0 items-center justify-center rounded-full text-forest/35 transition-colors hover:bg-soil/8 hover:text-forest"
        >
          <X className="size-3.5" strokeWidth={2.4} />
        </button>
      </div>
      {cta && <div className="mt-2 flex justify-end">{cta}</div>}
    </div>
  )
}

/**
 * Stack banner conditional di Home — priority: AI Fuel Gauge > Sinking Fund.
 * Dismiss per-banner tersimpan di localStorage dan muncul lagi keesokan harinya.
 *
 * Banner RENEWAL sudah DIHAPUS di paket 84: pengingat perpanjangan tidak punya
 * arti lagi karena semua paket adalah akses selamanya. Ajakan upgrade sekarang
 * hidup di SATU tempat saja — `subscription-banner.tsx` di root layout — supaya
 * tidak ada dua banner yang berbicara soal paket di satu layar.
 *
 * Banner KUOTA AI (prompt 24) tetap berfungsi penuh: CTA-nya membuka
 * `TopUpModal` yang sudah ada (bukan modal kedua), dan setelah "pembayaran" mock
 * masuk, token add-on bertambah di sesi ini sehingga banner-nya berhenti sendiri.
 * Nudge yang tetap menagih beli SESUDAH user beli = dark pattern, dan repo ini
 * menolaknya (PRD 4507–4509/4594: transparan, tanpa dorongan berulang).
 */
/** Dibungkus `memo` — props-nya primitif/stabil (state dari hook, callback
 *  `useCallback`), jadi tidak perlu ikut re-render saat HomeScreen mengubah state
 *  popup lain (lihat catatan di cash-flow-card.tsx).
 *  State dismiss lokalnya tetap jalan normal. */
export const HomeBanners = memo(function HomeBanners() {
  /** modal Top Up AI — dibuka CTA banner kuota (reuse komponen yang sama
   *  dengan /settings/billing; harga & token tetap dari `lib/ai-quota.ts`) */
  const [topUpOpen, setTopUpOpen] = useState(false)
  /** snapshot kuota AI hidup (paket 42): angka yang sama dengan kartu sidebar,
   *  Fuel Gauge Billing, dan header AI Coach — dan angka itu TURUN saat dipakai */
  const quota = useAiQuota()

  /* Kuota AI hanya berlaku untuk paket BERKUOTA (paket 85): paket tanpa AI
     tidak punya tangki sama sekali, dan Paket Sultan tidak dibatasi — banner
     "kuota menyusut" beserta ajakan top up TIDAK berlaku untuk keduanya.
     Kalau paket belum diketahui (`planKnown` false, mis. build demo / backend
     mati), perilaku lama DIPERTAHANKAN: jangan mengunci karena ketidaktahuan. */
  const { planId, planKnown } = useSubscriptionGate()
  const planLimits = planQuota(planId)
  const quotaApplies = !planKnown || (planLimits.aiEnabled && !planLimits.unlimited)

  /* Persistensi nudge (paket 64): LINTAS RELOAD tanpa hydration mismatch & tanpa
     flicker — nilai tersimpan sudah dipakai sejak render pertama client (lihat
     `lib/nudge-store.ts`). Gerbang `mounted` yang dulu bikin banner "pop-in"
     sesudah cat pertama sudah tidak ada. */
  const nudges = useNudgeState()

  /** true = user menutup banner INI hari ini (per hari kalender, reaktif) */
  const isDismissed = (id: NudgeId) => isNudgeDismissedToday(nudges, id)
  const dismiss = (id: NudgeId) => dismissNudge(id, nudges.today)

  /* Semua gerbang tanggal menunggu `nudges.today` terisi (client). Sebelum itu
     tidak ada yang dirender — dan pengisiannya terjadi SAAT hidrasi, bukan
     sesudah paint, jadi tidak ada banner yang "melompat" masuk. */
  const ready = Boolean(nudges.today)
  /** tanggal (1–31) bulan ini — ambang sinking fund `> 5` (mock) */
  const dayOfMonth = nudges.today ? Number(nudges.today.slice(8, 10)) : 0

  /* soft-nudge kuota: pemakaian kuota dasar >70% DAN user belum menambah token
     di sesi ini — begitu sudah beli, ajakannya selesai (lihat catatan komponen).
     Saat kuota benar-benar habis, banner tetap muncul (persen sisa 0) tapi
     kalimatnya berganti jadi penjelasan + jalan keluar, bukan ajakan halus.
     PAKET 64: dibatasi SATU kali per hari kalender — `wasNudgeShownTodayAtLoad`
     membekukan keputusan itu saat halaman dimuat, jadi menandai "sudah tampil"
     tidak menyembunyikan banner di sesi yang sama. */
  const aiEligible =
    quotaApplies && quota.usedPct > SOFT_NUDGE_USAGE_PCT && quota.addon.purchasedTokens === 0
  const showAiGauge =
    ready && aiEligible && !wasNudgeShownTodayAtLoad(nudges, 'ai-gauge')
  const showFundNudge = DEMO.sinkingFundPending && dayOfMonth > 5

  /* Catat "kuota AI sudah tampil hari ini" begitu banner-nya benar-benar tampil &
     belum ditutup user. Ditulis di effect (render tetap murni) dan tidak memicu
     re-render — lihat catatan `shownAtLoad` di `lib/nudge-store.ts`. */
  useEffect(() => {
    if (!ready || !aiEligible) return
    if (isDismissed('ai-gauge')) return
    if (wasNudgeShownTodayAtLoad(nudges, 'ai-gauge')) return
    markNudgeShown('ai-gauge', nudges.today)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, aiEligible, nudges])

  return (
    <>
      {/* 1 — AI USAGE FUEL GAUGE (muncul saat >70% usage, berhenti setelah top up) */}
      {showAiGauge && !isDismissed('ai-gauge') && (
        <BannerShell
          tone="white"
          dismissLabel={AI_GAUGE_BANNER_COPY.dismissLabel}
          onDismiss={() => dismiss('ai-gauge')}
          icon={
            <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-sage text-forest">
              <Fuel className="size-4.5" strokeWidth={2.2} />
            </span>
          }
          title={
            quota.exhausted
              ? AI_QUOTA_EXHAUSTED_COPY.bannerTitle
              : /* sisa persen diturunkan dari angka yang SAMA dengan lebar bar di
                   bawah judul, jadi judul & bar tidak mungkin berbeda */
                AI_GAUGE_BANNER_COPY.title(complementaryPct(quota.usedPct))
          }
          body={
            quota.exhausted ? (
              <span>{AI_QUOTA_EXHAUSTED_COPY.body}</span>
            ) : (
              /* bar saja: angka "terpakai" tidak diulang sebagai teks, cukup
                 judul yang menyebut sisa persen */
              <span className="mt-1.5 flex items-center">
                <span
                  role="progressbar"
                  aria-label={AI_GAUGE_BANNER_COPY.usageBarLabel(quota.usedPct)}
                  aria-valuenow={quota.usedPct}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  className="block h-1.5 w-full max-w-40 overflow-hidden rounded-full bg-soil/[0.09]"
                >
                  <span
                    className="block h-full rounded-full bg-hud-amber"
                    style={{ width: `${quota.usedPct}%` }}
                  />
                </span>
              </span>
            )
          }
          cta={
            <button
              type="button"
              onClick={() => setTopUpOpen(true)}
              className="shrink-0 rounded-full px-2 py-1 text-xs font-medium text-forest transition-colors hover:bg-sage/60"
            >
              {AI_GAUGE_BANNER_COPY.cta}
            </button>
          }
        />
      )}

      {/* 2 — SINKING FUND NUDGE (tanggal >5, belum kontribusi).
          CTA-nya TAUTAN, bukan tombol diam: setoran dikerjakan di kartu Celengan
          Impian (/budget) karena di sanalah daftar dana & sheet setornya hidup —
          Home tidak boleh menyimpan salinan state dana yang bisa beda cerita. */}
      {showFundNudge && !isDismissed('fund-nudge') && (
        <BannerShell
          tone="white"
          dismissLabel={SINKING_NUDGE_COPY.dismissLabel}
          onDismiss={() => dismiss('fund-nudge')}
          icon={
            <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-mint/25 text-forest">
              <PiggyBank className="size-4.5" strokeWidth={2.2} />
            </span>
          }
          title={SINKING_NUDGE_COPY.title}
          body={SINKING_NUDGE_COPY.body}
          cta={
            <Link
              href={SINKING_NUDGE_COPY.ctaHref}
              className="shrink-0 rounded-full bg-sage px-4 py-2 text-xs font-medium text-forest transition-colors hover:bg-mint/40 active:scale-95"
            >
              {SINKING_NUDGE_COPY.cta}
            </Link>
          }
        />
      )}

      {/* modal Top Up AI (prompt 24) — satu komponen untuk Home & Billing, jadi
          harga, token, dan aturan reset tidak punya salinan kedua di repo ini */}
      <TopUpModal open={topUpOpen} onClose={() => setTopUpOpen(false)} />
    </>
  )
})

