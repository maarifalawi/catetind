'use client'

import { motion, useReducedMotion } from 'framer-motion'
import { ArrowRight } from 'lucide-react'
import type { JointPerson, SettlementState } from '@/lib/data/joint'
import {
  JOINT_ME,
  JOINT_PARTNER,
  SETTLEMENT_SCOPE_COPY,
  moneyLabel,
  netPhrase,
  netShortLabel,
  signedMoneyLabel,
} from '@/lib/data/joint'
import { cn } from '@/lib/utils'

/* ── Balance Scale Settlement Gauge (Section 3) ──────────────────────────────
   Visual tanda tangan halaman ini: pengeluaran bersama divisualkan sebagai
   TIMBANGAN FISIK, bukan kalimat "Jon bayar Rp 550.000 lebih banyak".

   Cara kerjanya:
   • Beam (palang) berputar via Framer Motion spring (damping 15 / stiffness 80)
     sesuai `settlement.tiltDeg`; sisi yang menanggung beban LEBIH BESAR TURUN
     (hukum berat dasar — audit #5): kalau aku yang mengeluarkan lebih banyak
     untuk pengeluaran patungan, panci kiriku ada di posisi lebih rendah.
   • Isi panci = NET tiap orang (`myNet`/`partnerNet` = bayar − kewajiban), yaitu
     angka yang SAMA dengan yang menentukan arah & nominal transfer. Sebelum
     Stage 2 panci menampilkan "uang yang keluar dari kantong" sementara palang
     sudah dibaca dari net — dua bahasa di satu komponen, dan utangnya jadi
     tidak bisa ditelusuri. Sekarang nominal panci selalu berlabel
     (`+Rp X · berhak menerima` / `-Rp X · harus transfer`), jadi tidak ada
     angka negatif telanjang di layar.
     Aturan "apa yang ditimbang" (traktiran keluar, nominal 🔒 privat tetap
     masuk) tetap diputuskan di `lib/data/joint.ts` (audit #2 & #3) — komponen
     ini tidak menghitung ulang apa pun.
   • Panci digantung di kedua ujung beam. Karena panci adalah ANAK dari beam
     yang berputar, posisinya otomatis ikut turun/naik seperti timbangan asli.
   • Isi panci diberi rotasi berlawanan (`-beamDeg`) supaya selalu tegak — sama
     seperti mangkuk timbangan yang menggantung di tali.
   • Fulcrum (segitiga) digambar sebagai SVG; pelat dasarnya jadi poros visual.
   
   Konvensi sudut: CSS `rotate` positif = searah jarum jam = sisi KANAN turun.
   `tiltDeg` dari data justru positif saat AKU lebih berat, jadi beam memakai
   `-tiltDeg` supaya panci kiri (aku) yang turun. Dibalik satu kali di sini saja —
   jangan dibalik lagi di tempat lain (itu penyebab bug "timbangan kebalik").
   ────────────────────────────────────────────────────────────────────────── */

/** cubic-bezier khas app: masuk cepat lalu settle lembut */
const EASE: [number, number, number, number] = [0.22, 1, 0.36, 1]

/** pegas timbangan — persis angka di spec Section 3 (biar terasa "mengayun" dulu) */
const SWING = { type: 'spring' as const, damping: 15, stiffness: 80 }

/**
 * Dimensi dua varian. Kelas Tailwind ditulis LITERAL di dalam objek ini supaya
 * tetap terbaca scanner Tailwind (pola yang sama dengan GHOST_BRANDS).
 */
const SIZES = {
  lg: {
    /* +14px dari sebelumnya: panci kini memuat baris label arah net di bawah
       nominalnya, jadi tinggi frame ikut naik supaya labelnya tidak menabrak
       copy di bawah timbangan */
    frame: 'h-[210px] sm:h-[228px] max-w-[430px]',
    beamTop: 'top-10',
    /* lebar beam sengaja lebih sempit di mobile: panci + ujung beam
       (±62% × 318px) tetap muat di layar 360–390px tanpa geser horizontal.
       Panci 112px dipilih supaya net terpanjang yang realistis di demo
       ("+Rp 250.000") masih satu baris di dalam chip. */
    beam: 'h-2 w-[62%] sm:w-[76%]',
    fulcrum: 'top-[44px] w-[118px]',
    base: 'top-[100px] h-2.5 w-[132px]',
    strings: 'h-[30px]',
    panWrap: 'w-[112px] sm:w-[126px]',
    chip: 'w-[112px] px-2 py-1.5 sm:w-[126px] sm:px-2.5 sm:py-2',
    chipText: 'text-[12px] sm:text-[13.5px]',
    avatar: 'size-6 text-[13px] sm:size-7 sm:text-[15px]',
    plate: 'mt-1 h-2 w-[120px] sm:w-[136px]',
  },
  sm: {
    frame: 'h-[126px] max-w-[260px]',
    beamTop: 'top-[26px]',
    beam: 'h-1.5 w-[64%]',
    fulcrum: 'top-[29px] w-[62px]',
    base: 'top-[68px] h-1.5 w-[74px]',
    strings: 'h-[16px]',
    panWrap: 'w-[76px]',
    chip: 'w-[76px] px-1.5 py-1',
    chipText: 'text-[10px]',
    avatar: 'size-3.5 text-[9px]',
    plate: 'mt-0.5 h-1.5 w-[86px]',
  },
} as const

export function JointBalanceScale({
  settlement,
  masked,
  me = JOINT_ME,
  partner = JOINT_PARTNER,
  size = 'lg',
  showCopy = true,
  onSettle,
}: {
  settlement: SettlementState
  /** ikut toggle privasi halaman — nominal jadi Rp ••••••• */
  masked: boolean
  me?: JointPerson
  partner?: JointPerson
  size?: 'lg' | 'sm'
  showCopy?: boolean
  onSettle?: () => void
}) {
  const reduceMotion = useReducedMotion()
  const dim = SIZES[size]
  /* sisi kiri = AKU → positif = kiri turun (lihat catatan konvensi sudut di atas) */
  const beamDeg = -settlement.tiltDeg

  const swing = reduceMotion
    ? { duration: 0 }
    : SWING

  return (
    <div className="flex flex-col items-center">
      <div
        role="img"
        aria-label={`Timbangan posisi bersih pengeluaran patungan (tanpa traktiran). ${
          me.name
        } ${netPhrase(settlement.myNet, masked)}, ${partner.name} ${netPhrase(
          settlement.partnerNet,
          masked,
        )}. Sisi yang lebih berat turun.`}
        className={cn('relative w-full', dim.frame)}
      >
        {/* ── fulcrum: segitiga poros + pelat dasar ─────────────────────── */}
        <svg
          viewBox="0 0 120 62"
          className={cn('absolute left-1/2 -translate-x-1/2', dim.fulcrum)}
          aria-hidden
        >
          <polygon
            points="60,0 88,58 32,58"
            className="fill-hud-sage/30 stroke-hud-sage/60"
            strokeWidth="1.5"
          />
        </svg>
        <span
          aria-hidden
          className={cn(
            'absolute left-1/2 -translate-x-1/2 rounded-full bg-forest/12 ring-1 ring-forest/10',
            dim.base,
          )}
        />

        {/* ── beam + dua panci ───────────────────────────────────────────
            Beam berputar di titik tengahnya (transform-origin default), jadi
            kedua ujungnya naik/turun sama besar — seperti palang timbangan. */}
        <motion.div
          initial={{ rotate: 0 }}
          animate={{ rotate: beamDeg }}
          transition={swing}
          className={cn(
            'absolute left-1/2 -translate-x-1/2 rounded-full',
            'bg-gradient-to-r from-hud-sage to-hud-amber',
            'shadow-[0_8px_18px_-12px_rgba(69,89,78,0.7)]',
            dim.beamTop,
            dim.beam,
          )}
        >
          {/* knob poros di tengah beam */}
          <span
            aria-hidden
            className="absolute left-1/2 top-1/2 size-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-hud-terracotta ring-2 ring-[#ffffff]"
          />
          <ScalePan
            person={me}
            net={settlement.myNet}
            masked={masked}
            side="left"
            dim={dim}
            swing={swing}
            deg={beamDeg}
            compact={size === 'sm'}
          />
          <ScalePan
            person={partner}
            net={settlement.partnerNet}
            masked={masked}
            side="right"
            dim={dim}
            swing={swing}
            deg={beamDeg}
            compact={size === 'sm'}
          />
        </motion.div>
      </div>

      {showCopy && (
        <>
          {/* audit #2 & #3: jelaskan APA yang ditimbang — supaya panci tidak
              terlihat "salah hitung" di mata user */}
          <p className="mt-3.5 w-full max-w-[430px] text-center text-[10.5px] leading-relaxed text-ink/40">
            {SETTLEMENT_SCOPE_COPY}
          </p>
          <SettlementCopy settlement={settlement} masked={masked} onSettle={onSettle} />
        </>
      )}
    </div>
  )
}

/**
 * Satu panci timbangan: tali + pelat + chip "barang" (avatar, nama, NOMINAL NET
 * + artinya). `side` menentukan sisi beam tempat panci digantung; nominal ikut
 * toggle privasi, dan label arahnya (`berhak menerima` / `harus transfer`)
 * selalu tampil supaya angka negatif tidak pernah berdiri sendiri.
 */
function ScalePan({
  person,
  net,
  masked,
  side,
  dim,
  swing,
  deg,
  compact = false,
}: {
  person: JointPerson
  /** posisi bersih orang ini: `bayar − kewajiban` (positif = berhak menerima) */
  net: number
  masked: boolean
  side: 'left' | 'right'
  dim: (typeof SIZES)['lg'] | (typeof SIZES)['sm']
  swing: { type: 'spring'; damping: number; stiffness: number } | { duration: number }
  deg: number
  compact?: boolean
}) {
  const isMe = person.id === JOINT_ME.id
  const stringTone = isMe ? 'bg-hud-sage/55' : 'bg-hud-amber/60'
  const plateTone = isMe
    ? 'from-hud-sage/75 to-hud-sage/40'
    : 'from-hud-amber/85 to-hud-amber/45'

  return (
    <div
      className={cn(
        'absolute top-[3px] flex justify-center',
        side === 'left' ? 'left-0 -translate-x-1/2' : 'right-0 translate-x-1/2',
        dim.panWrap,
      )}
    >
      {/* rotasi berlawanan (origin di ujung beam) → isi panci selalu tegak */}
      <motion.div
        initial={{ rotate: 0 }}
        animate={{ rotate: -deg }}
        transition={swing}
        style={{ transformOrigin: '50% 0%' }}
        className="relative flex flex-col items-center"
      >
        {/* dua tali yang membentang dari ujung beam ke tepi pelat */}
        <span
          aria-hidden
          className={cn('absolute left-1/2 top-0 w-px origin-top rotate-[14deg]', stringTone, dim.strings)}
        />
        <span
          aria-hidden
          className={cn('absolute left-1/2 top-0 w-px origin-top -rotate-[14deg]', stringTone, dim.strings)}
        />
        {/* penahan tinggi: supaya chip mulai TEPAT di bawah tali */}
        <span aria-hidden className={cn('w-px', dim.strings)} />

        <div
          className={cn(
            'relative z-10 flex flex-col items-center rounded-2xl bg-[#ffffff] ring-1',
            'shadow-[0_12px_24px_-20px_rgba(69,89,78,0.95)]',
            isMe ? 'ring-hud-sage/50' : 'ring-hud-amber/55',
            dim.chip,
          )}
        >
          <span
            aria-hidden
            className={cn(
              'flex shrink-0 items-center justify-center rounded-full ring-1',
              person.tint,
              dim.avatar,
            )}
          >
            {person.avatar}
          </span>
          {!compact && (
            <span className="mt-1 text-[11px] font-semibold leading-none text-ink/50">
              {person.name}
            </span>
          )}
          <span className={cn('mt-1 font-black tabular-nums leading-none text-ink', dim.chipText)}>
            {signedMoneyLabel(net, masked)}
          </span>
          {/* label arah net — WAJIB ada di SEMUA varian supaya nominal negatif
              tidak pernah tampil telanjang. Varian `sm` (banner & modal) memakai
              huruf lebih kecil, bukan menghilangkan labelnya. */}
          <span
            className={cn(
              'mt-0.5 font-semibold leading-none text-ink/45',
              compact ? 'text-[8px]' : 'text-[9.5px]',
            )}
          >
            {netShortLabel(net)}
          </span>
        </div>

        {/* pelat mangkuk */}
        <span
          aria-hidden
          className={cn(
            'rounded-full bg-gradient-to-r shadow-[0_10px_18px_-14px_rgba(69,89,78,0.85)]',
            plateTone,
            dim.plate,
          )}
        />
      </motion.div>
    </div>
  )
}

/**
 * Copy settlement di bawah timbangan (Section 3). Tiga level dari data:
 * 'settle' (> Rp100.000) → ajakan transfer + tombol · 'close' → "Hampir impas!"
 * · 'equal' → "Perfectly balanced!" dengan glow olive tipis.
 */
export function SettlementCopy({
  settlement,
  masked,
  onSettle,
}: {
  settlement: SettlementState
  masked: boolean
  onSettle?: () => void
}) {
  const { level, difference, settlementAmount, whoOwes, whoIsOwed, settled } = settlement

  if (settled) {
    return <CopyCard copy="Bulan ini sudah settle ✅ Mulai dari nol lagi bulan depan, ya 💚" />
  }

  if (level === 'equal') {
    return <CopyCard copy="Perfectly balanced! Kalian kompak banget bulan ini ⚖️✨" glow />
  }

  if (level === 'close') {
    return (
      <CopyCard
        copy={`Hampir impas! Posisi bersih kalian beda cuma ${moneyLabel(difference, masked)}. Gak perlu settle 💚`}
      />
    )
  }

  return (
    <div className="mt-4 w-full max-w-[430px] rounded-[1.5rem] bg-[#ffffff] px-4 py-4 text-center ring-1 ring-hud-terracotta/25 shadow-[0_20px_44px_-34px_rgba(184,145,145,0.9)]">
      <p className="text-[13.5px] leading-relaxed text-ink">
        <b className="font-bold">{whoOwes.name}</b> perlu transfer{' '}
        <b className="font-bold tabular-nums text-hud-terracotta">
          {moneyLabel(settlementAmount, masked)}
        </b>{' '}
        ke <b className="font-bold">{whoIsOwed.name}</b> — satu transfer aja langsung impas ⚖️
      </p>
      <button
        type="button"
        onClick={onSettle}
        className="mt-3.5 inline-flex h-11 w-full items-center justify-center gap-2 rounded-2xl bg-forest text-[13.5px] font-semibold text-mint transition-colors hover:bg-forest-soft active:scale-[0.99]"
      >
        Settle Sekarang
        <ArrowRight className="size-4" strokeWidth={2.6} />
      </button>
    </div>
  )
}

/** Kartu copy kondisi "aman" (olive) — dipakai close/equal/sudah-settle */
function CopyCard({ copy, glow = false }: { copy: string; glow?: boolean }) {
  return (
    <div
      className={cn(
        'mt-4 w-full max-w-[430px] rounded-[1.5rem] bg-hud-sage/15 px-4 py-3.5 text-center ring-1 ring-hud-sage/35',
        glow && 'shadow-[0_0_0_7px_rgba(181,185,135,0.13)]',
      )}
    >
      <p className="text-[13px] font-semibold leading-relaxed text-[#000000]">{copy}</p>
    </div>
  )
}

