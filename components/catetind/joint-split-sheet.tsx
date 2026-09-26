'use client'

import { useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { Scale } from 'lucide-react'
import { BudgetSheet, ChoicePills, RevealStep, RupiahField, SheetSubmit } from './budget-sheet'
import {
  JOINT_ME,
  JOINT_PARTNER,
  PERCENT_PRESETS,
  SPLIT_MODES,
  moneyLabel,
  type JointPerson,
  type JointSplitType,
} from '@/lib/data/joint'
import { cn } from '@/lib/utils'

/* ── Split Bill Bottom Sheet (Section 6) ─────────────────────────────────────
   Empat mode pembagian, urut dari yang paling sering dipakai:
   1. Bagi Rata (default) · 2. Persentase (slider dua sisi yang bergerak
   bersama) · 3. Nominal Custom (isi satu sisi, sisi lain dihitung otomatis) ·
   4. "Yang ini gue yang bayar" (100% satu orang).

   Semua mode menghasilkan DRAFT dengan bentuk yang sama, jadi halaman Joint
   cukup menyimpan satu objek kecil per transaksi (splitType + splits/payerId).
   ────────────────────────────────────────────────────────────────────────── */

export type JointSplitDraft = {
  splitType: JointSplitType
  splits?: Record<string, number>
  payerId?: string
}

/** batasi nilai ke rentang [min, max] */
function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

export function JointSplitSheet({
  open,
  onClose,
  total,
  initial,
  onSave,
  me = JOINT_ME,
  partner = JOINT_PARTNER,
}: {
  open: boolean
  onClose: () => void
  /** nominal transaksi — basis hitung mode persentase & nominal */
  total: number
  initial?: JointSplitDraft
  onSave: (draft: JointSplitDraft) => void
  me?: JointPerson
  partner?: JointPerson
}) {
  /* Nilai awal diambil dari transaksi yang dipilih; pemanggil memakai
     `key={targetId}` sehingga ganti target = instance baru (tanpa effect reset). */
  const [mode, setMode] = useState<JointSplitType>(initial?.splitType ?? 'equal')
  const [myPercent, setMyPercent] = useState(
    initial?.splitType === 'percentage' ? (initial.splits?.[me.id] ?? 50) : 50,
  )
  const [mineDigits, setMineDigits] = useState(
    initial?.splitType === 'nominal'
      ? String(initial.splits?.[me.id] ?? Math.round(total / 2))
      : '',
  )
  const [payerId, setPayerId] = useState<string>(initial?.payerId ?? me.id)

  const nominalMine = Number(mineDigits || '0')
  /** sisi pasangan = sisa dari total (auto-kalkulasi real-time) */
  const nominalPartner = Math.max(0, total - nominalMine)
  const nominalReady = mode !== 'nominal' || (nominalMine > 0 && nominalMine <= total)

  const mineShare =
    mode === 'percentage'
      ? Math.round((total * myPercent) / 100)
      : mode === 'nominal'
        ? nominalMine
        : mode === 'single_payer'
          ? payerId === me.id
            ? total
            : 0
          : Math.round(total / 2)

  function handleSave() {
    if (!nominalReady) return
    if (mode === 'equal') return onSave({ splitType: 'equal' })
    if (mode === 'percentage')
      return onSave({
        splitType: 'percentage',
        splits: { [me.id]: myPercent, [partner.id]: 100 - myPercent },
      })
    if (mode === 'nominal')
      return onSave({
        splitType: 'nominal',
        splits: { [me.id]: nominalMine, [partner.id]: nominalPartner },
      })
    return onSave({ splitType: 'single_payer', payerId })
  }

  return (
    <BudgetSheet
      open={open}
      onClose={onClose}
      title="Atur Pembagian"
      description="Biar adil, biar gak ada yang ngerasa berat sebelah. 💚"
      footer={
        <SheetSubmit onClick={handleSave} disabled={!nominalReady}>
          Simpan Pembagian ✓
        </SheetSubmit>
      }
    >
      {/* nominal transaksi yang sedang dibagi */}
      <div className="flex items-center justify-between gap-3 rounded-2xl bg-cream px-4 py-3 ring-1 ring-soil/12">
        <span className="flex items-center gap-2 text-[12.5px] font-semibold text-ink/60">
          <Scale className="size-4 text-forest" strokeWidth={2.3} />
          Nominal transaksi
        </span>
        <span className="text-[15px] font-black tabular-nums text-ink">
          {moneyLabel(total, false)}
        </span>
      </div>

      {/* mode pembagian */}
      <ChoicePills
        className="mt-4"
        options={SPLIT_MODES.map((item) => ({ id: item.id, label: item.label }))}
        value={mode}
        onChange={setMode}
        ariaLabel="Mode pembagian"
      />
      <p className="mt-2 text-[11.5px] leading-relaxed text-ink/45">
        {SPLIT_MODES.find((item) => item.id === mode)?.hint}
      </p>

      {/* ── kendali per mode (progressive disclosure) ───────────────────── */}
      <div className="mt-4 space-y-3">
        <RevealStep show={mode === 'equal'}>
          <div className="rounded-2xl bg-cream px-4 py-3.5 ring-1 ring-soil/12">
            <p className="text-[12.5px] font-semibold text-ink/70">
              {me.name} 50% · {partner.name} 50%
            </p>
            <p className="mt-1 text-[11.5px] text-ink/45">
              Bagi rata = {moneyLabel(Math.round(total / 2), false)} per orang.
            </p>
          </div>
        </RevealStep>

        <RevealStep show={mode === 'percentage'}>
          <PercentSlider
            percent={myPercent}
            onPercentChange={setMyPercent}
            me={me}
            partner={partner}
            total={total}
          />
        </RevealStep>

        <RevealStep show={mode === 'nominal'}>
          <div className="space-y-3">
            <RupiahField
              label={`${me.name} bayar`}
              digits={mineDigits}
              onDigitsChange={setMineDigits}
              placeholder={total > 0 ? `Rp ${Math.round(total / 2).toLocaleString('id-ID')}` : 'Rp 0'}
            />
            <RupiahField
              label={`${partner.name} bayar (otomatis)`}
              digits={String(nominalPartner)}
              onDigitsChange={(digits) =>
                setMineDigits(String(Math.max(0, total - Number(digits || '0'))))
              }
              placeholder="Rp 0"
            />
            {total <= 0 ? (
              <p className="text-[11.5px] leading-relaxed text-hud-terracotta">
                Isi nominal transaksinya dulu ya, biar sisi satunya bisa dihitung otomatis.
              </p>
            ) : (
              <p className="text-[11.5px] leading-relaxed text-ink/45">
                Ketik di salah satu sisi — sisi satunya menyesuaikan sendiri supaya tetap pas{' '}
                {moneyLabel(total, false)}.
              </p>
            )}
          </div>
        </RevealStep>

        <RevealStep show={mode === 'single_payer'}>
          <ChoicePills
            options={[
              { id: me.id, label: `${me.name} yang bayar` },
              { id: partner.id, label: `${partner.name} yang bayar` },
            ]}
            value={payerId}
            onChange={setPayerId}
            ariaLabel="Siapa yang bayar"
          />
        </RevealStep>
      </div>

      {/* ringkasan hasil pembagian — selalu terlihat sebelum simpan */}
      <div className="mt-4 rounded-2xl bg-hud-sage/15 px-4 py-3 ring-1 ring-hud-sage/30">
        <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#000000]/70">
          Hasil pembagian
        </p>
        <p className="mt-2 flex items-center justify-between gap-3 text-[12.5px] font-semibold text-[#000000]">
          <span>
            {me.avatar} {me.name}
          </span>
          <span className="tabular-nums">{moneyLabel(mineShare, false)}</span>
        </p>
        <p className="mt-1 flex items-center justify-between gap-3 text-[12.5px] font-semibold text-[#000000]">
          <span>
            {partner.avatar} {partner.name}
          </span>
          <span className="tabular-nums">{moneyLabel(total - mineShare, false)}</span>
        </p>
      </div>
    </BudgetSheet>
  )
}

/**
 * Slider persentase "dua sisi yang bergerak bersama": satu pegangan di batas
 * dua bagian, digeser dengan jari/pointer atau panah keyboard. Karena sisi
 * pasangan selalu `100 − aku`, kedua angka otomatis menyesuaikan.
 */
function PercentSlider({
  percent,
  onPercentChange,
  me,
  partner,
  total,
}: {
  percent: number
  onPercentChange: (percent: number) => void
  me: JointPerson
  partner: JointPerson
  total: number
}) {
  const trackRef = useRef<HTMLDivElement>(null)
  const [dragging, setDragging] = useState(false)

  /** posisi pointer → persentase (langkah 5% supaya angkanya bulat) */
  function percentFromClientX(clientX: number): number {
    const track = trackRef.current
    if (!track) return percent
    const rect = track.getBoundingClientRect()
    const ratio = clamp((clientX - rect.left) / rect.width, 0, 1)
    return Math.round((ratio * 100) / 5) * 5
  }

  const mineShare = Math.round((total * percent) / 100)

  return (
    <div className="rounded-2xl bg-cream px-4 py-4 ring-1 ring-soil/12">
      <div className="flex items-center justify-between gap-2 text-[12.5px] font-semibold">
        <span className="flex items-center gap-1.5 text-[#000000]">
          <span aria-hidden>{me.avatar}</span>
          {me.name} {percent}%
        </span>
        <span className="flex items-center gap-1.5 text-[#b89191]">
          {partner.name} {100 - percent}%
          <span aria-hidden>{partner.avatar}</span>
        </span>
      </div>

      <div
        ref={trackRef}
        role="slider"
        tabIndex={0}
        aria-label="Persentase pembagian"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={percent}
        aria-valuetext={`${me.name} ${percent} persen, ${partner.name} ${100 - percent} persen`}
        onPointerDown={(event) => {
          event.currentTarget.setPointerCapture(event.pointerId)
          setDragging(true)
          onPercentChange(percentFromClientX(event.clientX))
        }}
        onPointerMove={(event) => {
          if (!dragging) return
          onPercentChange(percentFromClientX(event.clientX))
        }}
        onPointerUp={() => setDragging(false)}
        onPointerCancel={() => setDragging(false)}
        onKeyDown={(event) => {
          if (event.key === 'ArrowLeft' || event.key === 'ArrowDown') {
            event.preventDefault()
            onPercentChange(clamp(percent - 5, 0, 100))
          }
          if (event.key === 'ArrowRight' || event.key === 'ArrowUp') {
            event.preventDefault()
            onPercentChange(clamp(percent + 5, 0, 100))
          }
        }}
        className="relative mt-4 h-8 cursor-pointer touch-none select-none"
      >
        {/* track dua warna: sage (aku) & amber (pasangan) */}
        <span className="absolute inset-x-0 top-1/2 h-2.5 -translate-y-1/2 overflow-hidden rounded-full bg-hud-amber/30">
          <span className="block h-full bg-hud-sage/80" style={{ width: `${percent}%` }} />
        </span>
        {/* pegangan di batas dua sisi — begeser = dua sisi ikut menyesuaikan */}
        <motion.span
          aria-hidden
          animate={{ scale: dragging ? 1.14 : 1 }}
          transition={{ type: 'spring', stiffness: 420, damping: 30 }}
          style={{ left: `${percent}%` }}
          className="absolute top-1/2 flex size-6 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-[#ffffff] ring-2 ring-forest shadow-[0_8px_18px_-10px_rgba(69,89,78,0.9)]"
        >
          <span className="size-1.5 rounded-full bg-forest" />
        </motion.span>
      </div>

      <div className="mt-1.5 flex items-center justify-between text-[11.5px] font-semibold tabular-nums text-ink/50">
        <span>{moneyLabel(mineShare, false)}</span>
        <span>{moneyLabel(total - mineShare, false)}</span>
      </div>

      {/* quick-pick 60/40 · 70/30 · 80/20 */}
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <span className="text-[11px] font-semibold text-ink/40">Cepat:</span>
        {PERCENT_PRESETS.map((preset) => {
          const active = percent === preset.me
          return (
            <button
              key={preset.me}
              type="button"
              onClick={() => onPercentChange(preset.me)}
              aria-pressed={active}
              className={cn(
                'rounded-full px-3 py-1.5 text-[11.5px] font-semibold transition-colors active:scale-95',
                active
                  ? 'bg-forest text-mint'
                  : 'bg-soil/[0.1] text-ink/60 hover:bg-soil/[0.1]',
              )}
            >
              {preset.me}/{preset.partner}
            </button>
          )
        })}
      </div>
    </div>
  )
}
