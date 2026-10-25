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
  REFERRAL_HISTORY,
  REFERRAL_IS_SAMPLE,
  REFERRAL_PRIVACY_PLEDGE,
  REFERRAL_SAMPLE_NOTICE,
  REFERRAL_STEPS,
  REFERRED_FRIEND_BENEFIT,
  SHARE_TEXT,
  SHARE_TITLE,
  buildReferralShareText,
  buildReferralShareUrl,
  getReferrerReward,
  referralState,
  type ReferralFriend,
  type RewardCopy,
} from '@/lib/data/referral'

/* ── Ajak Teman (/app/referral) — satu pekerjaan: membuat user menekan tombol
   bagikan. Konten dibaca sebagai satu alur dari atas ke bawah:

     1. Reward Lo        — apa yang user dapat (satu kartu, tanpa tautan paket)
     2. Link Referral Lo — tinggal salin / bagikan (dua tombol sejajar)
     3. Pencapaian Lo    — tiga angka + total reward dalam SATU blok
     4. Riwayat Teman    — dikelompokkan per status, tanpa badge berulang
     5. Cara kerja       — accordion tertutup default

   Zero noise: tidak ada eyebrow, paragraf penjelas, disclaimer privasi inline,
   chip kode di header, atau badge reward per baris teman. Privasi hidup di balik
   ikon info. Warna hanya memakai token yang sudah ada (cream, sage, mint,
   forest, soil, hud-amber) — tanpa hex atau warna baru.
   ────────────────────────────────────────────────────────────────────────── */

/** cubic-bezier khas app: masuk cepat lalu settle lembut (animasi accordion 4D) */
const EASE: [number, number, number, number] = [0.22, 1, 0.36, 1]

/** label kecil di atas judul kartu — satu gaya untuk semua kartu halaman ini */
const CARD_EYEBROW = 'text-[10px] font-medium uppercase tracking-[0.14em] text-forest/40'

export function ReferralScreen() {
  /** accordion 4D — tertutup default, teks langkah baru dibaca kalau diminta */
  const [howItWorksOpen, setHowItWorksOpen] = useState(false)
  /** micro-feedback 2 detik di tombol Copy (pola sama dengan InstallQrHandoff) */
  const [copied, setCopied] = useState(false)

  const {
    referralCode,
    referralLink,
    totalClicks,
    friendsPending,
    friendsConverted,
    totalRewardEarned,
  } = referralState

  const reward = getReferrerReward()

  /* ── AKSI ───────────────────────────────────────────────────────────────── */

  /** 3C — salin LINK saja (tanpa kalimat share) */
  async function handleCopyLink() {
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
    const canShare =
      typeof navigator !== 'undefined' && typeof navigator.share === 'function'

    if (canShare) {
      try {
        await navigator.share({
          title: SHARE_TITLE,
          text: SHARE_TEXT,
          url: buildReferralShareUrl(referralCode),
        })
        toast.success('Makasih sudah berbagi! 🌿', {
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
        description: 'Tinggal tempel di WhatsApp, Twitter, atau DM temanmu.',
      })
    } catch {
      toast.error('Gagal menyalin, pakai tombol Copy Link ya')
    }
  }

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

      {/* ── SATU ALUR, DUA KOLOM DI DESKTOP ─────────────────────────────────
          KIRI  (5/12) = janji reward + aksi bagikan
          KANAN (7/12) = bukti (pencapaian + riwayat) + cara kerja
          Di mobile urutannya sama: reward dulu, baru link, baru bukti. */}
      <div className="mt-5 grid grid-cols-1 gap-5 lg:mt-6 lg:grid-cols-12 lg:gap-6">
        <div className="flex flex-col gap-5 lg:col-span-5 lg:gap-6">
          <RewardCard reward={reward} />
          <ShareCard
            referralLink={referralLink}
            copied={copied}
            onCopy={handleCopyLink}
            onShare={handleShare}
          />
        </div>

        <div className="flex flex-col gap-5 lg:col-span-7 lg:gap-6">
          <AchievementCard
            clicks={totalClicks}
            registered={friendsPending}
            converted={friendsConverted}
            total={totalRewardEarned}
          />

          {/* Tanda JUJUR (paket 85): angka & riwayat di halaman ini masih
              CONTOH — jangan sampai statistik teman karangan terbaca sebagai
              milik user. Ditempatkan dekat data yang ia jelaskan. */}
          {REFERRAL_IS_SAMPLE && (
            <p className="flex flex-wrap items-center gap-2 rounded-2xl bg-hud-amber/15 px-3.5 py-2.5 text-[12px] leading-relaxed text-forest/70 ring-1 ring-hud-amber/30">
              <span className="rounded-full bg-hud-amber/40 px-2 py-0.5 text-[10.5px] font-medium tracking-wide text-forest">
                {REFERRAL_SAMPLE_NOTICE.badge}
              </span>
              {REFERRAL_SAMPLE_NOTICE.body}
            </p>
          )}

          <FriendHistoryCard friends={REFERRAL_HISTORY} />

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
 * REWARD LO — satu janji, satu kartu, tanpa tautan penjelasan paket. Kalimat
 * reward datang dari `getReferrerReward()` supaya tidak mungkin berbeda dari
 * aturan produk. Baris kedua adalah sisi lain program dua arah: apa yang
 * didapat TEMAN saat checkout.
 */
export function RewardCard({ reward }: { reward: RewardCopy }) {
  return (
    <section className="rounded-[1.75rem] bg-cream p-5 ring-1 ring-soil/12 sm:p-6">
      <p className={CARD_EYEBROW}>Reward Lo</p>
      <p className="mt-2 font-display text-[22px] font-semibold leading-snug tracking-tight text-forest sm:text-[26px]">
        {reward.lead}{' '}
        <span className="font-medium">{reward.highlight}</span>
      </p>
      <p className="mt-3 flex items-start gap-2 border-t border-soil/12 pt-3.5 text-[12.5px] leading-relaxed text-forest/65">
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
 * LINK REFERRAL LO — hanya label, link, dan dua aksi. Tidak ada sub-teks
 * penjelas. Satu-satunya informasi tambahan (janji privasi) hidup di balik
 * ikon info supaya tidak masuk alur baca utama.
 */
export function ShareCard({
  referralLink,
  copied,
  onCopy,
  onShare,
}: {
  referralLink: string
  copied: boolean
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
            className="pointer-events-none absolute right-0 bottom-full z-20 mb-2 w-60 rounded-xl bg-forest px-3 py-2 text-left text-[11px] font-normal leading-relaxed text-cream opacity-0 transition-opacity duration-150 group-hover:opacity-100 group-focus-visible:opacity-100 motion-reduce:transition-none"
          >
            {REFERRAL_PRIVACY_PLEDGE}
          </span>
        </span>
      </div>

      <p className="mt-3 truncate rounded-xl bg-soil/[0.06] px-3.5 py-3 font-mono text-[13px] text-forest/70">
        {referralLink}
      </p>

      <div className="mt-3 grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={onCopy}
          aria-label={copied ? 'Link sudah tersalin' : 'Salin link referral'}
          className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-sage px-3 text-[12.5px] font-medium text-forest transition-colors hover:bg-sage/70 active:scale-[0.97]"
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
          className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-forest px-3 text-[12.5px] font-medium text-cream transition-colors hover:bg-forest-soft active:scale-[0.97]"
        >
          <Share2 className="size-4" strokeWidth={2.4} aria-hidden />
          Bagikan
        </button>
      </div>
    </section>
  )
}

/**
 * PENCAPAIAN LO — penggabungan baris KPI (12 / 3 / 2) dan kartu hero total
 * reward menjadi SATU blok. Angka besar & tebal, label kecil & redup; total
 * reward duduk di bawah garis pemisah sebagai ringkasan, bukan kartu kedua.
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
            <p className="mt-1.5 text-[10.5px] font-medium leading-tight text-forest/45 sm:text-[11.5px]">
              {label}
            </p>
          </div>
        ))}
      </div>

      <div className="mt-4 flex items-center justify-between gap-3 border-t border-soil/12 pt-4">
        <span className="flex min-w-0 items-center gap-2 text-[12.5px] text-forest/55">
          <Gift className="size-4 shrink-0" strokeWidth={2.2} aria-hidden />
          Total Reward
        </span>
        <span className="shrink-0 text-right font-display text-[15px] font-semibold tracking-tight text-forest sm:text-[16px]">
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
 * dibawa oleh kelompok + tint baris, jadi tiap baris cukup nama & tanggal:
 * tidak ada badge status maupun badge reward berulang.
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

      <div className="mt-4 flex flex-col gap-4">
        {groups.map((group) => (
          <div key={group.id}>
            <div className="flex items-center gap-3 px-1">
              <h3 className="shrink-0 text-[11px] font-medium text-forest-muted">
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
                    /* tint Mint 14% — token yang sama dengan baris "Lunas" di Tagihan */
                    group.converted && 'bg-mint/[0.14]',
                  )}
                >
                  <span
                    className={cn(
                      'min-w-0 truncate text-[13px] font-medium',
                      group.converted ? 'text-forest' : 'text-forest/55',
                    )}
                  >
                    {friend.name}
                  </span>
                  <span
                    className={cn(
                      'shrink-0 text-[11.5px] tabular-nums',
                      group.converted ? 'text-forest/50' : 'text-forest/40',
                    )}
                  >
                    {friend.joinedAt}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </section>
  )
}

/**
 * 4D — Accordion "Bagaimana cara kerjanya?": tiga langkah, tertutup default.
 * Pola buka/tutupnya sama dengan "Detail per Aset" di halaman Kekayaan
 * (AnimatePresence + tinggi auto + chevron berputar) supaya bahasa geraknya
 * konsisten lintas halaman. TIDAK diubah oleh redesain ini.
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
            <span className="block font-display text-[15px] font-medium tracking-tight text-forest">
              Bagaimana cara kerjanya?
            </span>
            <span className="mt-0.5 block text-[11.5px] text-forest/45">
              3 langkah · tanpa proses klaim
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
                  <span className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full bg-sage text-[11px] font-semibold tabular-nums text-forest">
                    {index + 1}
                  </span>
                  <p className="text-[12.5px] leading-relaxed text-forest/65">{step}</p>
                </li>
              ))}
            </ol>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  )
}

