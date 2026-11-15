'use client'

import { useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { Scale } from 'lucide-react'
import { BudgetSheet, ChoicePills, RevealStep, RupiahField, SheetSubmit } from './budget-sheet'
import {
  JOINT_SPLIT_MISMATCH,
  JOINT_SPLIT_NOMINAL_LABEL,
  JOINT_SPLIT_PARTICIPANTS_HINT,
  JOINT_SPLIT_PARTICIPANTS_LABEL,
  JOINT_SPLIT_PERCENT_HINT,
  JOINT_SPLIT_PERCENT_LABEL,
  JOINT_SPLIT_TOTAL_LABEL,
  PERCENT_PRESETS,
  SPLIT_MODES,
  moneyLabel,
  type JointPerson,
  type JointSplitType,
} from '@/lib/data/joint'
import type { SplitSpec } from '@/lib/data/joint-ledger'
import { cn } from '@/lib/utils'

/* ── Split Bill Bottom Sheet (Section 6) ─────────────────────────────────────
   Empat mode pembagian, urut dari yang paling sering dipakai:
   1. Bagi Rata (default) · 2. Persentase (slider dua sisi yang bergerak
   bersama) · 3. Nominal Custom (isi satu sisi, sisi lain dihitung otomatis) ·
   4. "Yang ini gue yang bayar" (100% satu orang).

   Semua mode menghasilkan DRAFT dengan bentuk yang sama — satu `SplitSpec`
   (`lib/data/joint-ledger.ts`) — jadi halaman Joint cukup menyimpan satu objek
   kecil per transaksi dan tidak ada bentuk kedua yang bisa dibaca salah.
   ────────────────────────────────────────────────────────────────────────── */

/**
 * Draft pembagian yang dikembalikan sheet ini.
 *
 * Stage 2: bentuknya `SplitSpec`, BUKAN `{ splitType, splits }`. Di bentuk lama
 * persen (60) dan rupiah (60.000) menempati field yang SAMA, jadi satu salah
 * baca = tagihan hancur; sekarang bentuk datanya sendiri yang memaksa benar.
 */
export type JointSplitDraft = {
  split: SplitSpec
}

/** batasi nilai ke rentang [min, max] */
function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

export function JointSplitSheet({
  open,
  onClose,
  onBack,
  total,
  initial,
  onSave,
  people,
  memberAccess = false,
}: {
  open: boolean
  onClose: () => void
  /** tombol "kembali" di header — kembali ke form Catat Bareng (isian utuh) */
  onBack?: () => void
  /** nominal transaksi — basis hitung mode persentase & nominal */
  total: number
  initial?: JointSplitDraft
  onSave: (draft: JointSplitDraft) => void
  /**
   * Seluruh anggota kantong (2 orang atau lebih), pemilik sesi di urutan
   * pertama. SEMUA mode tersedia untuk semua jumlah anggota: Bagi Rata dengan
   * centang peserta, Persentase per orang, Nominal per orang, dan "satu orang
   * yang bayar".
   */
  people: JointPerson[]
  /** true = anggota aktif dompet: simpan tidak ditahan kunci paket */
  memberAccess?: boolean
}) {
  const me = people[0]
  const partner = people[1] ?? people[0]
  const multi = people.length > 2
  const availableModes = SPLIT_MODES
  /* Nilai awal diambil dari transaksi yang dipilih; pemanggil memakai
     `key={targetId}` sehingga ganti target = instance baru (tanpa effect reset). */
  const start = initial?.split
  const [mode, setMode] = useState<JointSplitType>(start?.type ?? 'equal')
  const [myPercent, setMyPercent] = useState(
    start?.type === 'percentage' ? (start.percents[me.id] ?? 50) : 50,
  )
  const [mineDigits, setMineDigits] = useState(
    start?.type === 'nominal' ? String(start.amounts[me.id] ?? Math.round(total / 2)) : '',
  )
  const [payerId, setPayerId] = useState<string>(
    start?.type === 'single_payer' ? start.payerId : me.id,
  )
  /* ── PESERTA "Bagi Rata" (3–4 orang) ──────────────────────────────────────
     Bawaannya SEMUA anggota tercentang; user boleh melepas yang tidak ikut
     (mis. 3 dari 4 ikut makan malam). Daftar ini disimpan ke server
     (`split_members`) supaya perangkat anggota lain menghitung porsi sama. */
  const allIds = people.map((person) => person.id)
  const [participants, setParticipants] = useState<string[]>(() => {
    if (start?.type !== 'equal') return allIds
    const chosen = (start.participants ?? []).filter((id) => allIds.includes(id))
    return chosen.length > 0 ? chosen : allIds
  })
  /* persentase & nominal PER ANGGOTA (berlaku juga untuk dua orang) */
  const [percents, setPercents] = useState<Record<string, string>>(() => {
    if (start?.type === 'percentage') {
      return Object.fromEntries(
        people.map((person) => [person.id, String(start.percents[person.id] ?? 0)]),
      )
    }
    const each = Math.floor(100 / people.length)
    return Object.fromEntries(
      people.map((person, index) => [
        person.id,
        String(index === 0 ? 100 - each * (people.length - 1) : each),
      ]),
    )
  })
  const [amountDigits, setAmountDigits] = useState<Record<string, string>>(() => {
    if (start?.type === 'nominal') {
      return Object.fromEntries(
        people.map((person) => [person.id, String(start.amounts[person.id] ?? 0)]),
      )
    }
    return Object.fromEntries(people.map((person) => [person.id, '']))
  })

  const percentOf = (id: string) => Math.max(0, Math.min(100, Number(percents[id] ?? '0') || 0))
  const amountOf = (id: string) => Math.max(0, Number(amountDigits[id] ?? '0') || 0)

  /** sisi pasangan (dua orang) = sisa nominal — auto-kalkulasi real-time */
  const nominalMine = Number(mineDigits || '0')
  const nominalPartner = Math.max(0, total - nominalMine)

  const percentTotal = people.reduce((acc, person) => acc + percentOf(person.id), 0)
  const nominalTotal = people.reduce((acc, person) => acc + amountOf(person.id), 0)

  const percentReady = multi ? Math.round(percentTotal) === 100 : true
  const nominalReady =
    mode !== 'nominal'
      ? true
      : multi
        ? total > 0 && nominalTotal === Math.round(total)
        : nominalMine > 0 && nominalMine <= total
  const equalReady = participants.length > 0
  const ready = equalReady && (mode !== 'percentage' || percentReady) && nominalReady

  const selectedParticipants = people.filter((person) => participants.includes(person.id))
  const equalEach = Math.floor(total / Math.max(1, selectedParticipants.length))

  /** porsi tiap anggota untuk ringkasan (satu rumus dengan `handleSave`) */
  function shareOf(person: JointPerson, index: number): number {
    if (mode === 'equal') {
      return participants.includes(person.id) ? equalEach : 0
    }
    if (mode === 'percentage') {
      if (!multi) return Math.round((total * (index === 0 ? myPercent : 100 - myPercent)) / 100)
      return Math.round((total * percentOf(person.id)) / 100)
    }
    if (mode === 'nominal') {
      return multi ? amountOf(person.id) : index === 0 ? nominalMine : nominalPartner
    }
    return payerId === person.id ? total : 0
  }

  function toggleParticipant(id: string) {
    setParticipants((current) => {
      if (current.includes(id)) {
        /* minimal satu peserta — dompet tidak boleh membagi ke nol orang */
        return current.length <= 1 ? current : current.filter((item) => item !== id)
      }
      return [...current, id]
    })
  }

  function handleSave() {
    if (!ready) return
    if (mode === 'equal') {
      return onSave({
        split:
          participants.length === people.length
            ? { type: 'equal' }
            : { type: 'equal', participants: [...participants] },
      })
    }
    if (mode === 'percentage') {
      /* dua orang tetap memakai slider (sisi pasangan = 100 − aku); 3+ orang
         memakai isian per anggota dengan validasi total 100% */
      if (!multi) {
        return onSave({
          split: {
            type: 'percentage',
            percents: { [me.id]: myPercent, [partner.id]: 100 - myPercent },
          },
        })
      }
      return onSave({
        split: {
          type: 'percentage',
          percents: Object.fromEntries(people.map((person) => [person.id, percentOf(person.id)])),
        },
      })
    }
    if (mode === 'nominal') {
      if (!multi) {
        return onSave({
          split: {
            type: 'nominal',
            amounts: { [me.id]: nominalMine, [partner.id]: nominalPartner },
          },
        })
      }
      return onSave({
        split: {
          type: 'nominal',
          amounts: Object.fromEntries(people.map((person) => [person.id, amountOf(person.id)])),
        },
      })
    }
    return onSave({ split: { type: 'single_payer', payerId } })
  }

  return (
    <BudgetSheet
      open={open}
      onClose={onClose}
      onBack={onBack}
      title="Atur Pembagian"
      footer={
        <SheetSubmit onClick={handleSave} disabled={!ready} gate={!memberAccess}>
          Simpan Pembagian
        </SheetSubmit>
      }
    >
      {/* nominal transaksi yang sedang dibagi */}
      <div className="flex items-center justify-between gap-3 rounded-2xl bg-cream px-4 py-3 ring-1 ring-soil/12">
        <span className="flex items-center gap-2 text-[13.5px] font-medium text-forest-muted">
          <Scale className="size-4 text-forest" strokeWidth={2.3} />
          Nominal transaksi
        </span>
        <span className="text-[16px] font-semibold tabular-nums text-forest">
          {moneyLabel(total, false)}
        </span>
      </div>

      {/* mode pembagian — SEMUA mode tersedia untuk semua jumlah anggota.
          Keterangan tiap mode sengaja TIDAK ditulis lagi: pil + kendali di
          bawahnya sudah menjelaskan sendiri, dan paragrafnya memenuhi layar. */}
      <ChoicePills
        className="mt-4"
        options={availableModes.map((item) => ({ id: item.id, label: item.label }))}
        value={mode}
        onChange={setMode}
        ariaLabel="Mode pembagian"
      />

      {/* ── kendali per mode (progressive disclosure) ───────────────────── */}
      <div className="mt-4 space-y-3">
        <RevealStep show={mode === 'equal'}>
          <div className="rounded-2xl bg-cream px-4 py-3.5 ring-1 ring-soil/12">
            <p className="text-[13px] font-medium text-forest-soft">
              {JOINT_SPLIT_PARTICIPANTS_LABEL}
            </p>
            <p className="mt-1 text-[12px] leading-relaxed text-forest-muted">
              {JOINT_SPLIT_PARTICIPANTS_HINT}
            </p>
            <ul className="mt-2.5 space-y-1.5">
              {people.map((person) => {
                const checked = participants.includes(person.id)
                return (
                  <li key={person.id}>
                    <label className="flex cursor-pointer items-center gap-2.5 rounded-xl bg-sage/30 px-3 py-2 ring-1 ring-soil/10">
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleParticipant(person.id)}
                        className="size-4 shrink-0 accent-forest"
                      />
                      <span aria-hidden className="text-[15px]">
                        {person.avatar}
                      </span>
                      <span className="min-w-0 flex-1 truncate text-[13.5px] font-medium text-forest">
                        {person.name}
                      </span>
                      <span className="shrink-0 text-[12.5px] font-medium tabular-nums text-forest-muted">
                        {checked ? moneyLabel(equalEach, false) : '—'}
                      </span>
                    </label>
                  </li>
                )
              })}
            </ul>
          </div>
        </RevealStep>

        <RevealStep show={mode === 'percentage'}>
          {multi ? (
            <div className="rounded-2xl bg-cream px-4 py-3.5 ring-1 ring-soil/12">
              <p className="text-[13px] font-medium text-forest-soft">
                {JOINT_SPLIT_PERCENT_LABEL}
              </p>
              <p className="mt-1 text-[12px] leading-relaxed text-forest-muted">
                {JOINT_SPLIT_PERCENT_HINT}
              </p>
              <ul className="mt-2.5 space-y-2">
                {people.map((person) => (
                  <li key={person.id} className="flex items-center gap-2.5">
                    <span aria-hidden className="text-[15px]">
                      {person.avatar}
                    </span>
                    <span className="min-w-0 flex-1 truncate text-[13.5px] font-medium text-forest">
                      {person.name}
                    </span>
                    <span className="flex items-center gap-1">
                      <input
                        type="number"
                        min={0}
                        max={100}
                        inputMode="numeric"
                        value={percents[person.id] ?? ''}
                        onChange={(event) =>
                          setPercents((current) => ({ ...current, [person.id]: event.target.value }))
                        }
                        aria-label={`Persentase ${person.name}`}
                        className="h-9 w-16 rounded-xl bg-sage/40 px-2 text-right text-[13.5px] font-medium tabular-nums text-forest outline-none ring-1 ring-soil/15 focus:ring-2 focus:ring-forest/35"
                      />
                      <span className="text-[12.5px] font-medium text-forest-muted">%</span>
                    </span>
                    <span className="w-20 shrink-0 text-right text-[12.5px] tabular-nums text-forest-muted">
                      {moneyLabel(Math.round((total * percentOf(person.id)) / 100), false)}
                    </span>
                  </li>
                ))}
              </ul>
              <p
                className={cn(
                  'mt-2.5 text-[12.5px] font-medium tabular-nums',
                  percentReady ? 'text-forest-muted' : 'text-hud-terracotta',
                )}
              >
                {JOINT_SPLIT_TOTAL_LABEL}: {Math.round(percentTotal)}%
                {percentReady ? '' : ` · ${JOINT_SPLIT_PERCENT_HINT}`}
              </p>
            </div>
          ) : (
            <PercentSlider
              percent={myPercent}
              onPercentChange={setMyPercent}
              me={me}
              partner={partner}
              total={total}
            />
          )}
        </RevealStep>

        <RevealStep show={mode === 'nominal'}>
          {multi ? (
            <div className="space-y-3">
              <p className="text-[13px] font-medium text-forest-soft">
                {JOINT_SPLIT_NOMINAL_LABEL}
              </p>
              {people.map((person) => (
                <RupiahField
                  key={person.id}
                  label={`${person.name} menanggung`}
                  digits={amountDigits[person.id] ?? ''}
                  onDigitsChange={(digits) =>
                    setAmountDigits((current) => ({ ...current, [person.id]: digits }))
                  }
                  placeholder="Rp 0"
                />
              ))}
              <p
                className={cn(
                  'text-[12.5px] font-medium tabular-nums',
                  nominalReady ? 'text-forest-muted' : 'text-hud-terracotta',
                )}
              >
                {JOINT_SPLIT_TOTAL_LABEL}: {moneyLabel(nominalTotal, false)} /{' '}
                {moneyLabel(total, false)}
                {nominalReady ? '' : ` · ${JOINT_SPLIT_MISMATCH(moneyLabel(total, false))}`}
              </p>
              {total <= 0 && (
                <p className="text-[12.5px] leading-relaxed text-hud-terracotta">
                  Isi nominal transaksinya dulu ya, biar porsinya bisa dipastikan pas.
                </p>
              )}
            </div>
          ) : (
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
                <p className="text-[12.5px] leading-relaxed text-hud-terracotta">
                  Isi nominal transaksinya dulu ya, biar sisi satunya bisa dihitung otomatis.
                </p>
              ) : null}
            </div>
          )}
        </RevealStep>

        <RevealStep show={mode === 'single_payer'}>
          <ChoicePills
            options={people.map((person) => ({
              id: person.id,
              label: `${person.name} yang bayar`,
            }))}
            value={payerId}
            onChange={setPayerId}
            ariaLabel="Siapa yang bayar"
          />
        </RevealStep>
      </div>

      {/* ringkasan hasil pembagian — selalu terlihat sebelum simpan */}
      <div className="mt-4 rounded-2xl bg-hud-sage/15 px-4 py-3 ring-1 ring-hud-sage/30">
        <p className="text-[12px] font-medium uppercase tracking-[0.14em] text-forest-soft">
          Hasil pembagian
        </p>
        {people.map((person, index) => {
          const share = shareOf(person, index)
          return (
            <p
              key={person.id}
              className="mt-2 flex items-center justify-between gap-3 text-[13.5px] font-medium text-forest"
            >
              <span>
                {person.avatar} {person.name}
              </span>
              <span className="tabular-nums">{moneyLabel(share, false)}</span>
            </p>
          )
        })}
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
      <div className="flex items-center justify-between gap-2 text-[13.5px] font-medium">
        <span className="flex items-center gap-1.5 text-forest">
          <span aria-hidden>{me.avatar}</span>
          {me.name} {percent}%
        </span>
        <span className="flex items-center gap-1.5 text-hud-terracotta">
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
          className="absolute top-1/2 flex size-6 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-cream ring-2 ring-forest shadow-[0_8px_18px_-10px_rgba(0,0,0,0.9)]"
        >
          <span className="size-1.5 rounded-full bg-forest" />
        </motion.span>
      </div>

      <div className="mt-1.5 flex items-center justify-between text-[12.5px] font-medium tabular-nums text-forest-muted">
        <span>{moneyLabel(mineShare, false)}</span>
        <span>{moneyLabel(total - mineShare, false)}</span>
      </div>

      {/* quick-pick 60/40 · 70/30 · 80/20 */}
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <span className="text-[12px] font-medium text-forest-muted">Cepat:</span>
        {PERCENT_PRESETS.map((preset) => {
          const active = percent === preset.me
          return (
            <button
              key={preset.me}
              type="button"
              onClick={() => onPercentChange(preset.me)}
              aria-pressed={active}
              className={cn(
                'rounded-full px-3 py-1.5 text-[12.5px] font-medium transition-colors active:scale-95',
                active
                  ? 'bg-forest text-mint'
                  : 'bg-soil/[0.1] text-forest-muted hover:bg-soil/[0.1]',
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
