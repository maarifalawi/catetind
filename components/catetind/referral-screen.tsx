'use client'

import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import {
  Check,
  ChevronDown,
  CircleHelp,
  Copy,
  Gift,
  HeartHandshake,
  Info,
  Share2,
  Users,
} from 'lucide-react'
import { toast } from 'sonner'
import { ScreenShell } from './screen-shell'
import { cn } from '@/lib/utils'
import {
  REFERRAL_DEMO_NOTICE,
  REFERRAL_EMPTY_COPY,
  REFERRAL_PRIVACY_PLEDGE,
  REFERRAL_SHOWS_DEMO_NOTICE,
  REFERRAL_STEPS,
  REFERRED_FRIEND_BENEFIT,
  SHARE_TEXT,
  SHARE_TITLE,
  buildReferralLinkText,
  buildReferralShareText,
  buildReferralShareUrl,
  formatRewardEarned,
  getReferrerReward,
  type ReferralFriend,
  type RewardCopy,
} from '@/lib/data/referral'
import { refreshReferral, useReferral } from '@/lib/money/referral-store'

/* ── Ajak Teman (/referral) — SATU PEKERJAAN: membuat user menekan Bagikan.
   Konten dibaca sebagai satu alur dari atas ke bawah:

     1. Reward Lo        — apa yang user dapat
     2. Link Referral Lo — tinggal salin / bagikan
     3. Pencapaian Lo    — tiga angka + total reward dalam SATU blok
     4. Riwayat Teman    — dikelompokkan per status
     5. Cara kerja       — accordion tertutup default

   SUMBER DATA (perbaikan P0): seluruh angka & kode datang dari
   `useReferral()` → `GET /api/referral/me` (RPC `catetind_referral_overview()`,
   dibatasi `auth.uid()`). Tidak ada satu pun angka contoh di file ini. Kode
   contoh dan daftar teman karangan sudah DIHAPUS dari repo, karena sebelumnya
   tombol Copy/Bagikan mengirim link milik orang lain.

   Tiga keadaan yang HARUS dibedakan, bukan disamakan:
     · belum ada kode         → tombol Copy/Bagikan dimatikan + alasannya;
     · server belum menjawab  → "angka belum bisa dimuat" + tombol coba lagi;
     · memang nol             → angka 0 apa adanya, daftar teman kosong singkat.

   Warna hanya memakai token yang sudah ada (cream, sage, mint, forest, soil,
   hud-amber). Copy tanpa em-dash dan tanpa emoji.
   ────────────────────────────────────────────────────────────────────────── */

/** cubic-bezier khas app: masuk cepat lalu settle lembut (animasi accordion 4D) */
const EASE: [number, number, number, number] = [0.22, 1, 0.36, 1]

/** label kecil di atas judul kartu — satu gaya untuk semua kartu halaman ini */
const CARD_EYEBROW = 'text-[11px] font-medium uppercase tracking-[0.14em] text-forest/40'

/**
 * `2026-09-15` → `15 Sep 2026`. `timeZone: 'UTC'` supaya tanggal dari server
 * (yang disimpan sebagai tanggal, bukan waktu) tidak bergeser satu hari antara
 * server & client. Tanggal kosong/asing → '' (barisnya tidak menampilkan apa pun,
 * bukan "Invalid Date").
 */
const JOIN_DATE = new Intl.DateTimeFormat('id-ID', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
  timeZone: 'UTC',
})

function formatJoinedAt(iso: string): string {
  if (!iso) return ''
  const parsed = new Date(`${iso}T00:00:00Z`)
  return Number.isNaN(parsed.getTime()) ? '' : JOIN_DATE.format(parsed)
}

export function ReferralScreen() {
  /** accordion 4D — tertutup default, teks langkah baru dibaca kalau diminta */
  const [howItWorksOpen, setHowItWorksOpen] = useState(false)
  /** micro-feedback 2 detik di tombol Copy (pola sama dengan InstallQrHandoff) */
  const [copied, setCopied] = useState(false)

  const state = useReferral()
  const referralCode = state.code
  /** link yang benar-benar dibagikan — `null` = belum ada kode, jangan mengarang */
  const referralLink = referralCode ? buildReferralLinkText(referralCode) : null
  const reward = getReferrerReward()

  /* ── AKSI ───────────────────────────────────────────────────────────────── */

  /** 3C — salin LINK saja (tanpa kalimat share) */
  async function handleCopyLink() {
    if (!referralLink) return
    try {
      await navigator.clipboard.writeText(referralLink)
      setCopied(true)
      toast.success('Link berhasil disalin!')
      window.setTimeout(() => setCopied(false), 2000)
    } catch {
      toast.error('Gagal menyalin, salin link-nya manual ya')
    }
  }

  /**
   * 3D — Web Share API dulu (satu payload: judul + kalimat + link unik).
   * Pengecekan pakai `typeof` (bukan `'share' in navigator`) supaya TypeScript
   * tidak mempersempit tipe `navigator` menjadi `never` di cabang fallback.
   *
   * Browser desktop tanpa Web Share API otomatis jatuh ke clipboard: kalimat +
   * link https-nya disalin sekaligus, jadi user tetap cukup sekali tempel.
   */
  async function handleShare() {
    if (!referralCode) return
    const canShare =
      typeof navigator !== 'undefined' && typeof navigator.share === 'function'

    if (canShare) {
      try {
        await navigator.share({
          title: SHARE_TITLE,
          text: SHARE_TEXT,
          url: buildReferralShareUrl(referralCode),
        })
        toast.success('Makasih sudah berbagi!', {
          description: 'Reward cair otomatis begitu temanmu membeli paket.',
        })
      } catch {
        /* user membatalkan dialog share — bukan error, jangan bikin toast ganggu */
      }
      return
    }

    try {
      await navigator.clipboard.writeText(buildReferralShareText(referralCode))
      toast.success('Teks + link tersalin!', {
        description: 'Tinggal tempel di WhatsApp, X, atau DM temanmu.',
      })
    } catch {
      toast.error('Gagal menyalin, pakai tombol Copy Link ya')
    }
  }

  const loading = !state.hydrated || state.status === 'loading'
  const failed = state.status === 'error'
  const notConfigured = state.status === 'ready' && !state.configured

  /* ── RENDER ─────────────────────────────────────────────────────────────── */
  return (
    <ScreenShell>
      {/* HEADER — judul saja. Eyebrow lama & tiga chip (kode/klik/beli)
          dicabut: kode sudah ada di kartu link, angka sudah ada di blok
          pencapaian. */}
      <header className="mt-4 flex items-start justify-between gap-3 lg:mt-0">
        <h1 className="font-display text-3xl font-semibold tracking-tight text-forest lg:text-4xl">
          Ajak Teman
        </h1>
      </header>

      {/* Satu alur, dua kolom di desktop.
          KIRI  (5/12) = janji reward + aksi bagikan
          KANAN (7/12) = bukti (pencapaian + riwayat) + cara kerja */}
      <div className="mt-5 grid grid-cols-1 gap-5 lg:mt-6 lg:grid-cols-12 lg:gap-6">
        <div className="flex flex-col gap-5 lg:col-span-5 lg:gap-6">
          <RewardCard reward={reward} />
          <ShareCard
            referralLink={referralLink}
            copied={copied}
            disabled={!referralLink}
            onCopy={handleCopyLink}
            onShare={handleShare}
          />
        </div>

        <div className="flex flex-col gap-5 lg:col-span-7 lg:gap-6">
          {/* Catatan mode demo: HANYA saat DEMO_MODE (build produksi selalu
              mati). Isinya menjelaskan kenapa angkanya kosong, bukan
              menampilkan angka contoh. */}
          {REFERRAL_SHOWS_DEMO_NOTICE && (
            <p className="flex flex-wrap items-center gap-2 rounded-2xl bg-hud-amber/15 px-3.5 py-2.5 text-[13px] leading-relaxed text-forest/70 ring-1 ring-hud-amber/30">
              <span className="rounded-full bg-hud-amber/40 px-2 py-0.5 text-[11.5px] font-medium tracking-wide text-forest">
                {REFERRAL_DEMO_NOTICE.badge}
              </span>
              {REFERRAL_DEMO_NOTICE.body}
            </p>
          )}

          {failed ? (
            <LoadFailedCard onRetry={() => void refreshReferral()} />
          ) : loading ? (
            <LoadingCard />
          ) : (
            <>
              <AchievementCard
                clicks={state.clicks}
                registered={state.pending}
                converted={state.converted}
                total={formatRewardEarned(state.rewardTokens)}
              />

              {notConfigured && (
                <p className="rounded-2xl bg-soil/[0.06] px-3.5 py-2.5 text-[13px] leading-relaxed text-forest/60">
                  {REFERRAL_EMPTY_COPY.notConfigured}
                </p>
              )}

              <FriendHistoryCard friends={state.friends} />
            </>
          )}

          <HowItWorksCard
            open={howItWorksOpen}
            onToggle={() => setHowItWorksOpen((prev) => !prev)}
          />
        </div>
      </div>
    </ScreenShell>
  )
}

/* ── komponen kecil halaman ini ───────────────────────────────────────────── */

/**
 * REWARD LO — satu janji, satu kartu. Kalimat reward datang dari
 * `getReferrerReward()` supaya tidak mungkin berbeda dari aturan produk. Baris
 * kedua adalah sisi lain program dua arah: apa yang didapat TEMAN saat checkout.
 */
export function RewardCard({ reward }: { reward: RewardCopy }) {
  return (
    <section className="rounded-[1.75rem] bg-cream p-5 ring-1 ring-soil/12 sm:p-6">
      <p className={CARD_EYEBROW}>Reward Lo</p>
      <p className="mt-2 font-display text-[22px] font-semibold leading-snug tracking-tight text-forest sm:text-[26px]">
        {reward.lead}{' '}
        <span className="font-medium">{reward.highlight}</span>
      </p>
      <p className="mt-3 flex items-start gap-2 border-t border-soil/12 pt-3.5 text-[13.5px] leading-relaxed text-forest/65">
        <HeartHandshake
          className="mt-0.5 size-4 shrink-0 text-forest/70"
          strokeWidth={2.2}
          aria-hidden
        />
        {REFERRED_FRIEND_BENEFIT}
      </p>
    </section>
  )
}

/**
 * LINK REFERRAL LO — label, link, dan dua aksi. Satu-satunya informasi tambahan
 * (janji privasi) hidup di balik ikon info.
 *
 * `disabled` = belum ada kode yang bisa dibagikan. Kedua tombol MATI dan
 * alasannya ditulis, karena tombol yang bisa ditekan tapi tidak mengirim apa pun
 * lebih buruk daripada tombol yang jujur tidak aktif.
 */
export function ShareCard({
  referralLink,
  copied,
  disabled = false,
  onCopy,
  onShare,
}: {
  referralLink: string | null
  copied: boolean
  disabled?: boolean
  onCopy: () => void
  onShare: () => void
}) {
  return (
    <section className="rounded-[1.75rem] bg-cream p-5 ring-1 ring-soil/12 sm:p-6">
      <div className="flex items-center justify-between gap-2">
        <p className={CARD_EYEBROW}>Link Referral Lo</p>

        {/* 3E — segel privasi dipindah ke tooltip. `title` tetap jadi cadangan
            native; hover/focus menampilkan kalimat lengkapnya. */}
        <span
          tabIndex={0}
          aria-describedby="referral-privacy-tip"
          title={REFERRAL_PRIVACY_PLEDGE}
          className="group relative inline-flex size-6 shrink-0 cursor-help items-center justify-center rounded-full text-forest/35 outline-none transition-colors hover:text-forest/60 focus-visible:ring-2 focus-visible:ring-forest/25"
        >
          <Info className="size-3.5" strokeWidth={2.4} aria-hidden />
          <span
            id="referral-privacy-tip"
            role="tooltip"
            className="pointer-events-none absolute right-0 bottom-full z-20 mb-2 w-60 rounded-xl bg-forest px-3 py-2 text-left text-[12px] font-normal leading-relaxed text-cream opacity-0 transition-opacity duration-150 group-hover:opacity-100 group-focus-visible:opacity-100 motion-reduce:transition-none"
          >
            {REFERRAL_PRIVACY_PLEDGE}
          </span>
        </span>
      </div>

      <p className="mt-3 truncate rounded-xl bg-soil/[0.06] px-3.5 py-3 font-mono text-[14px] text-forest/70">
        {referralLink ?? REFERRAL_EMPTY_COPY.noCode}
      </p>

      <div className="mt-3 grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={onCopy}
          disabled={disabled}
          aria-label={copied ? 'Link sudah tersalin' : 'Salin link referral'}
          className={cn(
            'inline-flex h-11 items-center justify-center gap-2 rounded-xl px-3 text-[13.5px] font-medium transition-colors',
            disabled
              ? 'cursor-not-allowed bg-ink/[0.05] text-forest/30'
              : 'bg-sage text-forest hover:bg-sage/70 active:scale-[0.97]',
          )}
        >
          {copied ? (
            <Check className="size-4" strokeWidth={2.6} aria-hidden />
          ) : (
            <Copy className="size-4" strokeWidth={2.2} aria-hidden />
          )}
          {copied ? 'Tersalin' : 'Copy Link'}
        </button>
        <button
          type="button"
          onClick={onShare}
          disabled={disabled}
          className={cn(
            'inline-flex h-11 items-center justify-center gap-2 rounded-xl px-3 text-[13.5px] font-medium transition-colors',
            disabled
              ? 'cursor-not-allowed bg-ink/[0.05] text-forest/30'
              : 'bg-forest text-cream hover:bg-forest-soft active:scale-[0.97]',
          )}
        >
          <Share2 className="size-4" strokeWidth={2.4} aria-hidden />
          Bagikan
        </button>
      </div>
    </section>
  )
}

/** server belum menjawab — jangan menampilkan angka apa pun sebelum itu */
function LoadingCard() {
  return (
    <section className="rounded-[1.75rem] bg-cream p-5 ring-1 ring-soil/12 sm:p-6">
      <p className={CARD_EYEBROW}>Pencapaian Lo</p>
      <p className="mt-3 text-[14px] text-forest/50">Memuat angka referral...</p>
    </section>
  )
}

/** gagal baca: beda dari "nol". Ada satu jalan keluar, bukan toast sekali. */
function LoadFailedCard({ onRetry }: { onRetry: () => void }) {
  return (
    <section className="rounded-[1.75rem] bg-cream p-5 ring-1 ring-soil/12 sm:p-6">
      <p className={CARD_EYEBROW}>Pencapaian Lo</p>
      <p className="mt-3 text-[14px] leading-relaxed text-forest/60">
        {REFERRAL_EMPTY_COPY.loadFailed}
      </p>
      <button
        type="button"
        onClick={onRetry}
        className="mt-3 inline-flex h-10 items-center justify-center rounded-xl bg-sage px-4 text-[13px] font-medium text-forest transition-colors hover:bg-sage/70"
      >
        {REFERRAL_EMPTY_COPY.retry}
      </button>
    </section>
  )
}

/**
 * PENCAPAIAN LO — tiga angka + total reward dalam SATU blok. Angka besar &
 * tebal, label kecil & redup; total reward duduk di bawah garis pemisah sebagai
 * ringkasan, bukan kartu kedua.
 *
 * Angkanya SELALU angka nyata dari server (boleh 0). Tidak ada nilai default
 * contoh yang bisa muncul kalau prop-nya kosong.
 */
export function AchievementCard({
  clicks,
  registered,
  converted,
  total,
}: {
  clicks: number
  registered: number
  converted: number
  total: string
}) {
  const stats: { id: string; label: string; value: number }[] = [
    { id: 'clicks', label: 'Klik Link', value: clicks },
    { id: 'registered', label: 'Mendaftar', value: registered },
    { id: 'converted', label: 'Sudah Beli', value: converted },
  ]

  return (
    <section
      aria-label="Pencapaian referral"
      className="rounded-[1.75rem] bg-cream p-5 ring-1 ring-soil/12 sm:p-6"
    >
      <p className={CARD_EYEBROW}>Pencapaian Lo</p>

      <div className="mt-4 grid grid-cols-3 gap-3">
        {stats.map(({ id, label, value }) => (
          <div key={id}>
            <p className="font-display text-[28px] font-semibold leading-none tracking-tight tabular-nums text-forest sm:text-[32px]">
              {value}
            </p>
            <p className="mt-1.5 text-[11.5px] font-medium leading-tight text-forest/45 sm:text-[12.5px]">
              {label}
            </p>
          </div>
        ))}
      </div>

      <div className="mt-4 flex items-center justify-between gap-3 border-t border-soil/12 pt-4">
        <span className="flex min-w-0 items-center gap-2 text-[13.5px] text-forest/55">
          <Gift className="size-4 shrink-0" strokeWidth={2.2} aria-hidden />
          Total Reward
        </span>
        <span className="shrink-0 text-right font-display text-[16px] font-semibold tracking-tight text-forest sm:text-[17px]">
          {total}
        </span>
      </div>
    </section>
  )
}

/** kelompok riwayat — urutan tetap: yang sudah membayar dulu, baru yang menunggu */
const FRIEND_GROUPS = [
  { id: 'converted', label: 'Sudah Beli', converted: true },
  { id: 'pending', label: 'Menunggu Pembayaran', converted: false },
] as const

/**
 * RIWAYAT TEMAN — dikelompokkan per status dengan pembatas tipis (pola yang
 * sama dengan "Akan Datang" / "Sudah Dibayar" di halaman Tagihan). Status
 * dibawa oleh kelompok + tint baris, jadi tiap baris cukup nama & tanggal.
 *
 * BELUM ADA TEMAN = satu kalimat pendek, bukan paragraf dan bukan baris contoh.
 */
export function FriendHistoryCard({ friends }: { friends: ReferralFriend[] }) {
  const groups = FRIEND_GROUPS.map((group) => ({
    ...group,
    items: friends.filter((friend) => friend.converted === group.converted),
  })).filter((group) => group.items.length > 0)

  return (
    <section className="rounded-[1.75rem] bg-cream p-5 ring-1 ring-soil/12 sm:p-6">
      <div className="flex items-center justify-between gap-3">
        <h2 className="font-display text-xl font-medium tracking-tight text-forest">
          Riwayat Teman
        </h2>
        <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-sage text-forest">
          <Users className="size-4" strokeWidth={2.2} aria-hidden />
        </span>
      </div>

      {groups.length === 0 ? (
        <p className="mt-4 text-[14px] leading-relaxed text-forest/50">
          {REFERRAL_EMPTY_COPY.noFriends}
        </p>
      ) : (
        <div className="mt-4 flex flex-col gap-4">
          {groups.map((group) => (
            <div key={group.id}>
              <div className="flex items-center gap-3 px-1">
                <h3 className="shrink-0 text-[12px] font-medium text-forest-muted">
                  {group.label}
                </h3>
                <span aria-hidden className="h-px flex-1 bg-soil/10" />
              </div>

              <ul className="mt-2 flex flex-col gap-1">
                {group.items.map((friend) => (
                  <li
                    key={friend.id}
                    className={cn(
                      'flex items-center justify-between gap-3 rounded-xl px-3 py-2.5',
                      group.converted ? 'bg-mint/[0.14]' : 'bg-soil/[0.04]',
                    )}
                  >
                    <span
                      className={cn(
                        'min-w-0 truncate text-[14px] font-medium',
                        group.converted ? 'text-forest' : 'text-forest/55',
                      )}
                    >
                      {friend.name}
                    </span>
                    <span
                      className={cn(
                        'shrink-0 text-[12.5px] tabular-nums',
                        group.converted ? 'text-forest/50' : 'text-forest/40',
                      )}
                    >
                      {formatJoinedAt(friend.joinedAt)}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
    </section>
  )
}

/**
 * 4D — Accordion "Bagaimana cara kerjanya?": tiga langkah, tertutup default.
 * Pola buka/tutupnya sama dengan "Detail per Aset" di halaman Kekayaan
 * (AnimatePresence + tinggi auto + chevron berputar) supaya bahasa geraknya
 * konsisten lintas halaman.
 */
function HowItWorksCard({ open, onToggle }: { open: boolean; onToggle: () => void }) {
  return (
    <section className="rounded-[1.75rem] bg-cream ring-1 ring-soil/12">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-3 rounded-[1.75rem] px-5 py-4 text-left outline-none transition-colors hover:bg-sage/40 focus-visible:ring-2 focus-visible:ring-forest/30 sm:px-6"
      >
        <span className="flex min-w-0 items-center gap-3">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-sage text-forest">
            <CircleHelp className="size-4" strokeWidth={2.2} aria-hidden />
          </span>
          <span className="min-w-0">
            <span className="block font-display text-[16px] font-medium tracking-tight text-forest">
              Bagaimana cara kerjanya?
            </span>
            <span className="mt-0.5 block text-[12.5px] text-forest/45">
              3 langkah, tanpa proses klaim
            </span>
          </span>
        </span>
        <ChevronDown
          className={cn(
            'size-4 shrink-0 text-forest/35 transition-transform duration-300',
            open && 'rotate-180',
          )}
          strokeWidth={2.4}
          aria-hidden
        />
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            key="how-it-works"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3, ease: EASE }}
            className="overflow-hidden"
          >
            <ol className="flex flex-col gap-3 border-t border-soil/12 px-5 pb-5 pt-4 sm:px-6">
              {REFERRAL_STEPS.map((step, index) => (
                <li key={step} className="flex items-start gap-3">
                  <span className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full bg-sage text-[12px] font-semibold tabular-nums text-forest">
                    {index + 1}
                  </span>
                  <p className="text-[13.5px] leading-relaxed text-forest/65">{step}</p>
                </li>
              ))}
            </ol>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  )
}
