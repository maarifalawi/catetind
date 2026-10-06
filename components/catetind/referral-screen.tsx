'use client'

import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import {
  AlertTriangle,
  Check,
  ChevronDown,
  CircleHelp,
  Clock,
  Copy,
  Gift,
  HeartHandshake,
  Link2,
  Lock,
  Share2,
  Sparkles,
  Users,
  type LucideIcon,
} from 'lucide-react'
import { toast } from 'sonner'
import { ScreenShell } from './screen-shell'
import { MetaChip } from './meta-chip'
import { cn } from '@/lib/utils'
import {
  REFERRAL_HISTORY,
  REFERRAL_PRIVACY_PLEDGE,
  REFERRAL_STEPS,
  REFERRED_FRIEND_BENEFIT,
  SHARE_TEXT,
  SHARE_TITLE,
  SUBSCRIPTION_LABEL,
  buildReferralShareText,
  buildReferralShareUrl,
  friendStatusLabel,
  getReferrerReward,
  referralState,
  tokenRemainingPct,
  type ReferralFriend,
  type RewardCopy,
} from '@/lib/data/referral'

/* ── Ajak Teman (/app/referral) — mesin pertumbuhan organik (Domain 7D) ──────
   Halaman ini sengaja HANYA punya satu pekerjaan: membuat user menekan tombol
   bagikan. Karena itu urutannya PSIKOLOGIS, bukan urutan data:

     KIRI  (5/12)  1. Bahan Bakar AI menipis           → "aku butuh isi ulang"
                   2. Kartu reward dinamis             → "oh, aku dapat ini"
                   3. Link + satu CTA + segel privasi  → "tinggal tekan, aman"
     KANAN (7/12)  4. KPI + total reward               → "lihat gunung reward-nya"
                   5. Riwayat teman                    → "siapa yang belum bayar?"
                   6. Cara kerja (accordion)           → "tanpa proses klaim, ya"

   Tidak ada leaderboard, tidak ada fitur sosial, tidak ada kartu opsional —
   setiap elemen di sini harus mendorong tombol Bagikan. Layout melebar penuh
   (`lg:grid-cols-12`, sama seperti Tagihan & Joint) TANPA container sempit di
   tengah layar.

   Warna memakai token palet apa adanya: Cantelope (`hud-amber`) = "mendekati
   batas" untuk gauge token yang menipis, Sage/Mint (`leaf`) = positif & reward
   cair, Evergreen (`forest`) = tombol utama + hero total reward, Daisy
   (`brand`) = pop brand di lingkaran ikon reward.
   ────────────────────────────────────────────────────────────────────────── */

/** cubic-bezier khas app: masuk cepat lalu settle lembut (animasi accordion 4D) */
const EASE: [number, number, number, number] = [0.22, 1, 0.36, 1]

/** ambang "hampir kosong" — di bawah ini gauge memberi sinyal menipis */
const LOW_FUEL_PCT = 20

export function ReferralScreen() {
  /** accordion 4D — tertutup default, teks langkah baru dibaca kalau diminta */
  const [howItWorksOpen, setHowItWorksOpen] = useState(false)
  /** micro-feedback 2 detik di tombol Copy (pola sama dengan InstallQrHandoff) */
  const [copied, setCopied] = useState(false)

  const {
    userSubscription,
    referralCode,
    referralLink,
    aiTokenUsedPct,
    aiTokenDaysLeft,
    totalClicks,
    friendsPending,
    friendsConverted,
    totalRewardEarned,
  } = referralState

  const tokenLeftPct = tokenRemainingPct(aiTokenUsedPct)
  const reward = getReferrerReward(userSubscription)

  /* ── AKSI ───────────────────────────────────────────────────────────────── */

  /** 3C — salin LINK saja (tanpa kalimat share) */
  async function handleCopyLink() {
    try {
      await navigator.clipboard.writeText(referralLink)
      setCopied(true)
      toast.success('Link berhasil disalin!')
      window.setTimeout(() => setCopied(false), 2000)
    } catch {
      toast.error('Gagal menyalin — salin link-nya manual ya')
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
          description: 'Reward cair otomatis begitu temanmu berlangganan.',
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
      toast.error('Gagal menyalin — pakai tombol Copy Link ya')
    }
  }

  /* ── RENDER ─────────────────────────────────────────────────────────────── */
  return (
    <ScreenShell>
      {/* ── HEADER — resep kanonik H1 yang sama dengan Dashboard & halaman lain ── */}
      <header className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-[13px] font-medium text-forest/45">Program Ajak Teman</p>
          <h1 className="mt-1 font-display text-3xl font-semibold tracking-tight text-forest lg:text-4xl">
            Ajak Teman
          </h1>
          <div className="mt-2 flex flex-wrap items-center gap-2 lg:mt-3">
            <MetaChip icon={Gift}>Kode {referralCode}</MetaChip>
            <MetaChip icon={Link2}>{totalClicks} klik link</MetaChip>
            <MetaChip icon={Users}>{friendsConverted} teman berlangganan</MetaChip>
          </div>
        </div>
      </header>

      {/* ── FULL-WIDTH 2 KOLOM ───────────────────────────────────────────────
          KIRI (5/12)  = motivator + satu aksi
          KANAN (7/12) = statistik & transparansi
          Di mobile tetap satu kolom, urutannya sama (motivasi dulu, baru bukti). */}
      <div className="mt-5 grid grid-cols-1 gap-5 lg:mt-6 lg:grid-cols-12 lg:gap-6">
        <div className="flex flex-col gap-5 lg:col-span-5 lg:gap-6">
          <FuelGaugeCard remainingPct={tokenLeftPct} daysLeft={aiTokenDaysLeft} />
          <RewardCard reward={reward} planLabel={SUBSCRIPTION_LABEL[userSubscription]} />
          <ShareCard
            referralLink={referralLink}
            copied={copied}
            onCopy={handleCopyLink}
            onShare={handleShare}
          />
        </div>

        <div className="flex flex-col gap-5 lg:col-span-7 lg:gap-6">
          <KpiRow clicks={totalClicks} pending={friendsPending} converted={friendsConverted} />
          <TotalRewardCard total={totalRewardEarned} />
          <HistoryCard
            friends={REFERRAL_HISTORY}
            converted={friendsConverted}
            pending={friendsPending}
          />
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
 * 3A — Bahan Bakar AI: pemicu psikologis utama (kuota menipis → butuh isi ulang).
 * Sengaja diletakkan DI ATAS tombol bagikan supaya "tangki"-nya terbaca dulu.
 *
 * Ring-nya jalur Oat (`stroke-soil/10`) dengan isi Cantelope — kanon warna
 * "mendekati batas". Angka yang sama dibaca dua kali: di tengah ring dan di
 * kalimat besar, jadi tidak ada user yang melewatkannya.
 *
 * Catatan kanon PRD 2B.2 & 5C: framingnya tetap "SISA" — tidak ada kata
 * habis/limit dan tidak ada warna merah, termasuk di label chip (`Menipis`).
 */
function FuelGaugeCard({ remainingPct, daysLeft }: { remainingPct: number; daysLeft: number }) {
  const SIZE = 120
  const STROKE = 11
  const RADIUS = (SIZE - STROKE) / 2 - 4
  const CIRCUMFERENCE = 2 * Math.PI * RADIUS
  const low = remainingPct <= LOW_FUEL_PCT

  return (
    <section className="rounded-[1.75rem] bg-cream p-5 shadow-[0_18px_40px_-34px_rgba(0,0,0,0.55)] ring-1 ring-soil/12 sm:p-6">
      <div className="flex items-center gap-4 sm:gap-5">
        <div
          className="relative shrink-0"
          role="img"
          aria-label={`Sisa token AI ${remainingPct} persen`}
        >
          <svg
            viewBox={`0 0 ${SIZE} ${SIZE}`}
            className="size-[96px] -rotate-90 sm:size-[104px]"
            aria-hidden
          >
            <circle
              cx={SIZE / 2}
              cy={SIZE / 2}
              r={RADIUS}
              fill="none"
              strokeWidth={STROKE}
              className="stroke-soil/10"
            />
            <circle
              cx={SIZE / 2}
              cy={SIZE / 2}
              r={RADIUS}
              fill="none"
              strokeWidth={STROKE}
              strokeLinecap="round"
              strokeDasharray={`${CIRCUMFERENCE * (remainingPct / 100)} ${CIRCUMFERENCE}`}
              className="stroke-hud-amber"
            />
          </svg>
          <span className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="font-display text-[22px] font-semibold leading-none tracking-tight tabular-nums text-forest sm:text-[24px]">
              {remainingPct}%
            </span>
            <span className="mt-1 text-[9.5px] font-medium uppercase tracking-[0.14em] text-forest/40">
              sisa
            </span>
          </span>
        </div>

        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-[10px] font-medium uppercase tracking-[0.14em] text-forest/40">
              Bahan Bakar AI
            </p>
            {low && (
              <span className="inline-flex items-center gap-1 rounded-full bg-hud-amber/25 px-2 py-0.5 text-[10px] font-medium text-forest ring-1 ring-hud-amber/40">
                <AlertTriangle className="size-3" strokeWidth={2.6} aria-hidden />
                Menipis
              </span>
            )}
          </div>
          {/* kalimat besar yang diminta mandat — angka SISA, bukan angka terpakai */}
          <p className="mt-1.5 font-display text-[17px] font-medium leading-snug tracking-tight text-forest">
            Sisa Token AI-mu: {remainingPct}%
          </p>
          <p className="mt-1.5 text-[12.5px] leading-relaxed text-forest/55">
            Tersisa <b className="font-medium text-forest/75">{daysLeft} hari</b> lagi. Ajak 1
            teman untuk langsung isi ulang!
          </p>
        </div>
      </div>

      <p className="mt-4 text-[11px] leading-relaxed text-forest/40">
        Kuota ini yang dipakai Catat AI, Scan Struk, dan AI Coach. Begitu temanmu berlangganan,
        token kamu langsung nambah.
      </p>
    </section>
  )
}

/**
 * 3B — Kartu reward DINAMIS. Kalimat reward-nya TIDAK ditulis di sini: ia
 * datang dari `getReferrerReward(userSubscription)` supaya pengguna bulanan/
 * tahunan melihat "+30 hari masa aktif" dan pengguna lifetime/founding member
 * melihat "1 bulan Token AI". Chip paket di sebelah label membuat alasan
 * kalimatnya berubah itu terlihat oleh user (transparansi, bukan teka-teki).
 */
function RewardCard({ reward, planLabel }: { reward: RewardCopy; planLabel: string }) {
  return (
    <section className="rounded-[1.75rem] bg-cream p-5 ring-1 ring-soil/12 sm:p-6">
      <div className="flex items-start gap-3.5">
        {/* Daisy = pop brand; ikon di atas aksen terang memakai tinta hitam */}
        <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-brand text-forest">
          <Sparkles className="size-5" strokeWidth={2.2} />
        </span>
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-[10px] font-medium uppercase tracking-[0.14em] text-forest/40">
              Reward kamu
            </p>
            <span className="rounded-full bg-sage/70 px-2.5 py-0.5 text-[10.5px] font-medium text-forest ring-1 ring-forest/10">
              {planLabel}
            </span>
          </div>
          <p className="mt-1.5 text-[14.5px] font-medium leading-snug text-forest">
            {reward.lead}{' '}
            <span className="font-display font-medium tracking-tight">{reward.highlight}</span>
          </p>
        </div>
      </div>

      {/* sisi lain dari program dua arah: apa yang didapat TEMAN saat checkout */}
      <p className="mt-4 flex items-start gap-2 border-t border-soil/12 pt-3.5 text-[12.5px] leading-relaxed text-forest/65">
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
 * 3C + 3D + 3E — Blok aksi: kotak link mono, SATU tombol bagikan, lalu segel
 * privasi. Ketiganya satu kartu karena secara psikologis ia satu gerakan:
 * "lihat link → tekan → tenang karena data kamu aman".
 *
 * Tombol Copy sengaja dibuat tenang (Oat/Sage) supaya satu-satunya tombol yang
 * berteriak adalah "Bagikan ke Teman".
 */
function ShareCard({
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
      <h2 className="font-display text-[17px] font-semibold tracking-tight text-forest">Link unikmu</h2>
      <p className="mt-0.5 text-[11.5px] leading-relaxed text-forest/45">
        Semua teman yang mendaftar lewat link ini otomatis tercatat atas namamu.
      </p>

      {/* 3C — kotak mono + tombol salin. Isian tipis `bg-soil/[0.06]` adalah
          minimum yang masih terbaca di atas kartu putih. */}
      <div className="mt-3.5 flex items-center gap-2 rounded-2xl bg-cream p-1.5 ring-1 ring-soil/12">
        <span className="min-w-0 flex-1 truncate rounded-xl bg-soil/[0.06] px-3.5 py-2.5 font-mono text-[12.5px] text-forest/70">
          {referralLink}
        </span>
        <button
          type="button"
          onClick={onCopy}
          aria-label={copied ? 'Link sudah tersalin' : 'Salin link referral'}
          className="inline-flex h-10 shrink-0 items-center gap-1.5 rounded-xl bg-sage px-3.5 text-[12.5px] font-medium text-forest transition-colors hover:bg-sage/70 active:scale-[0.97]"
        >
          {copied ? (
            <Check className="size-4" strokeWidth={2.6} aria-hidden />
          ) : (
            <Copy className="size-4" strokeWidth={2.2} aria-hidden />
          )}
          {copied ? 'Tersalin' : 'Copy Link'}
        </button>
      </div>

      {/* 3D — satu tombol utama, selebar kartu. Tidak ada tombol kedua. */}
      <button
        type="button"
        onClick={onShare}
        className="mt-3 inline-flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-forest text-[14px] font-medium text-cream shadow-[0_18px_36px_-20px_rgba(69,89,78,0.95)] transition-colors hover:bg-forest-soft active:scale-[0.99]"
      >
        <Share2 className="size-4" strokeWidth={2.4} aria-hidden />
        Bagikan ke Teman
      </button>

      {/* 3E — segel privasi. Satu baris, ikon kunci, nada tenang: ini yang
          membunuh keberatan nomor satu ("nanti data keuanganku kelihatan"). */}
      <p className="mt-3 flex items-start gap-1.5 text-[11.5px] leading-relaxed text-forest/45">
        <Lock className="mt-[1px] size-3.5 shrink-0" strokeWidth={2.2} aria-hidden />
        {REFERRAL_PRIVACY_PLEDGE}
      </p>
    </section>
  )
}

/** label kepala kolom riwayat — satu kelas untuk tiga kolom pertama */
const HISTORY_HEAD = 'text-[10.5px] font-medium uppercase tracking-[0.14em] text-forest/40'

/**
 * 4A — KPI ringkas: TIGA kartu dalam satu baris. Di mobile tetap 3 kolom
 * (isinya menyusut vertikal: ikon → angka → label) supaya ketiga angka bisa
 * dibandingkan tanpa menggulir.
 */
function KpiRow({
  clicks,
  pending,
  converted,
}: {
  clicks: number
  pending: number
  converted: number
}) {
  const cards: { id: string; label: string; value: number; icon: LucideIcon; positive?: boolean }[] =
    [
      { id: 'clicks', label: 'Klik Link', value: clicks, icon: Link2 },
      { id: 'pending', label: 'Teman Mendaftar', value: pending, icon: Clock },
      /* berlangganan = uang berpindah = satu-satunya kartu bernada positif (Sage) */
      { id: 'converted', label: 'Teman Berlangganan', value: converted, icon: Check, positive: true },
    ]

  return (
    <section aria-label="Statistik referral" className="grid grid-cols-3 gap-2.5 sm:gap-3">
      {cards.map(({ id, label, value, icon: Icon, positive }) => (
        <div key={id} className="rounded-[1.5rem] bg-cream p-3.5 ring-1 ring-soil/12 sm:p-4">
          <span
            className={cn(
              'flex size-8 items-center justify-center rounded-xl sm:size-9',
              positive ? 'bg-mint/30 text-forest' : 'bg-sage text-forest/80',
            )}
          >
            <Icon className="size-4" strokeWidth={2.4} aria-hidden />
          </span>
          <p className="mt-2.5 font-display text-[22px] font-semibold leading-none tracking-tight tabular-nums text-forest sm:text-[26px]">
            {value}
          </p>
          <p className="mt-1 text-[10.5px] font-medium leading-tight text-forest/45 sm:text-[11.5px]">
            {label}
          </p>
        </div>
      ))}
    </section>
  )
}

/**
 * 4B — Hero "ego bait": akumulasi reward ditulis besar di atas permukaan
 * Evergreen supaya terasa seperti pencapaian, bukan baris tabel. Kalimat
 * lengkapnya tetap utuh untuk pembaca layar lewat aria-label.
 */
function TotalRewardCard({ total }: { total: string }) {
  return (
    <section
      aria-label={`Total Reward yang Kamu Dapat: ${total}`}
      className="flex items-center gap-4 rounded-[1.75rem] bg-forest p-5 text-cream shadow-[0_24px_50px_-30px_rgba(69,89,78,0.95)] sm:p-6"
    >
      <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-brand text-forest">
        <Gift className="size-5" strokeWidth={2.2} aria-hidden />
      </span>
      <div className="min-w-0">
        <p className="text-[10px] font-medium uppercase tracking-[0.14em] text-cream/55">
          Total Reward yang Kamu Dapat
        </p>
        <p className="mt-1 font-display text-[26px] font-medium leading-none tracking-tight text-cream sm:text-[30px]">
          {total}
        </p>
      </div>
    </section>
  )
}

/**
 * Baris riwayat teman. HP = 2 kolom (nama + status, lalu tanggal + reward),
 * >= sm = 4 kolom sejajar seperti tabel. Penempatannya dibiarkan mengalir
 * otomatis (`grid` flow), jadi hanya ada SATU salinan markup per teman —
 * tidak ada tabel ganda yang harus dijaga tetap sinkron.
 */
const HISTORY_ROW =
  'grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1 py-3.5 sm:grid-cols-[minmax(0,1.5fr)_minmax(0,1.15fr)_minmax(0,0.8fr)_auto] sm:gap-3'

const HISTORY_COLS_SM =
  'sm:grid-cols-[minmax(0,1.5fr)_minmax(0,1.15fr)_minmax(0,0.8fr)_auto]'

/**
 * 4C — Riwayat teman: transparansi "kenapa reward saya belum nambah?".
 * Teman yang BELUM bayar dibuat buram (`opacity-55`) supaya perbedaan
 * "berlangganan" vs "belum bayar" terasa tanpa warna/ikon alarm baru.
 */
function HistoryCard({
  friends,
  converted,
  pending,
}: {
  friends: ReferralFriend[]
  converted: number
  pending: number
}) {
  return (
    <section className="rounded-[1.75rem] bg-cream p-5 ring-1 ring-soil/12 sm:p-6">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="font-display text-xl font-medium tracking-tight text-forest">
            Riwayat Teman yang Kamu Ajak
          </h2>
          <p className="mt-1 text-[13px] leading-relaxed text-forest/55">
            {converted} sudah berlangganan · {pending} masih menunggu pembayaran
          </p>
        </div>
        <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-sage text-forest">
          <Users className="size-4" strokeWidth={2.2} aria-hidden />
        </span>
      </div>

      {/* kepala kolom: hanya di >= sm; di HP tiap baris sudah menjelaskan diri */}
      <div
        className={cn(
          'mt-4 hidden gap-3 border-b border-soil/12 pb-2 sm:grid',
          HISTORY_COLS_SM,
        )}
      >
        <span className={HISTORY_HEAD}>Nama</span>
        <span className={HISTORY_HEAD}>Status</span>
        <span className={HISTORY_HEAD}>Tanggal</span>
        <span className={cn(HISTORY_HEAD, 'justify-self-end')}>Reward</span>
      </div>

      <ul className="divide-y divide-soil/12 border-t border-soil/12 sm:border-t-0">
        {friends.map((friend) => (
          <li key={friend.id} className={cn(HISTORY_ROW, !friend.converted && 'opacity-55')}>
            <span className="min-w-0 truncate text-[13px] font-medium text-forest">
              {friend.name}
            </span>

            <span
              className={cn(
                'inline-flex shrink-0 items-center justify-self-end rounded-full px-2.5 py-0.5 text-[10.5px] font-medium sm:justify-self-start',
                friend.converted ? 'bg-mint/30 text-forest' : 'bg-sage text-forest/55',
              )}
            >
              {friendStatusLabel(friend.converted)}
            </span>

            <span className="text-[11.5px] tabular-nums text-forest/50">{friend.joinedAt}</span>

            <span
              className={cn(
                'justify-self-end text-right text-[12.5px] tabular-nums',
                friend.converted ? 'font-medium text-forest' : 'text-forest/40',
              )}
            >
              {friend.reward}
            </span>
          </li>
        ))}
      </ul>
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
