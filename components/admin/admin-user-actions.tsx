'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Bot, CalendarPlus, Crown, RefreshCw, RotateCcw, X } from 'lucide-react'
import { PLANS, type PlanId } from '@/lib/data/pricing'
import { ADMIN_ACTION_ERRORS } from '@/lib/admin/actions'
import type { AdminBillingPeriod, AdminUserRow } from '@/lib/admin/types'
import { planLabelOf } from '@/lib/admin/filters'
import { postAdminAction } from './admin-api'
import { AdminPill, formatDate, formatNumber } from './admin-ui'

/* ── PANEL TINDAKAN CEPAT USER (FOUNDER TOOLS) ───────────────────────────────
   Tiga tindakan yang diminta pemilik:

     1. Beri/ubah paket manual (30 hari atau selamanya) — untuk kreator, penguji,
        atau penyelesaian keluhan;
     2. Perpanjang masa aktif (7 / 30 / 90 hari);
     3. Kelola kuota AI: bonus token atau reset pemakaian bulan berjalan.

   Semuanya dikirim ke `/api/admin/action`, divalidasi ulang di server
   (`parseAdminAction`), dan hanya ditulis setelah admin diverifikasi. Layar ini
   hanya mengumpulkan niat admin — tidak pernah menentukan hasilnya sendiri.
   ────────────────────────────────────────────────────────────────────────── */

const DAY_OPTIONS = [7, 30, 90] as const

const FIELD_CLASS =
  'mt-1 w-full rounded-xl bg-cream px-3 py-2 text-[12.5px] text-forest ring-1 ring-soil/[0.08] outline-none transition focus:ring-2 focus:ring-forest/25'

const BUTTON_CLASS =
  'inline-flex items-center justify-center gap-1.5 rounded-xl bg-forest px-3.5 py-2 text-[12px] font-semibold text-cream transition-colors hover:bg-forest-soft disabled:cursor-not-allowed disabled:bg-ink/[0.07] disabled:text-forest/35'

const CARD_CLASS = 'rounded-xl bg-cream/70 p-3 ring-1 ring-soil/[0.06]'

export function AdminUserActions({
  user,
  onClose,
}: {
  user: AdminUserRow
  onClose: () => void
}) {
  const router = useRouter()
  const [planId, setPlanId] = useState<PlanId>(user.plan.planId ?? 'catet-aja')
  const [period, setPeriod] = useState<AdminBillingPeriod>(
    user.plan.period === 'lifetime' ? 'lifetime' : 'monthly',
  )
  const [days, setDays] = useState<number>(30)
  const [tokens, setTokens] = useState<string>('50000')
  const [confirmReset, setConfirmReset] = useState(false)
  const [busy, setBusy] = useState<string | null>(null)

  async function run(key: string, payload: Record<string, unknown>) {
    setBusy(key)
    const result = await postAdminAction(payload)
    setBusy(null)
    if (result.ok) {
      toast.success(result.message)
      router.refresh()
    } else {
      toast.error(result.message)
    }
  }

  async function extend() {
    await run('extend', { action: 'extend-plan', userId: user.id, days })
  }

  async function bonus() {
    const value = Number(tokens)
    if (!Number.isFinite(value) || value <= 0) {
      toast.error(ADMIN_ACTION_ERRORS.tokens)
      return
    }
    await run('bonus', { action: 'ai-bonus', userId: user.id, tokens: Math.round(value) })
  }

  return (
    <div className="rounded-2xl bg-sage/40 p-3 ring-1 ring-soil/[0.06]">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[13px] font-semibold text-forest">
            Kelola {user.name || user.email || user.id}
          </p>
          <p className="mt-0.5 truncate text-[12px] text-forest/55">{user.email || 'tanpa email'}</p>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Tutup panel tindakan"
          className="rounded-full p-1.5 text-forest/50 transition-colors hover:bg-forest/10 hover:text-forest"
        >
          <X className="size-4" aria-hidden />
        </button>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-1.5">
        <AdminPill tone={user.plan.active && user.plan.planId ? 'mint' : 'thistle'}>
          {planLabelOf(user.plan.planId)}
          {user.plan.isLifetime
            ? ' · selamanya'
            : user.plan.expiresAt
              ? ` · s/d ${formatDate(user.plan.expiresAt)}`
              : ''}
        </AdminPill>
        <AdminPill tone="daisy">AI {formatNumber(user.aiCallsThisMonth)} panggilan</AdminPill>
        <AdminPill tone="thistle">{formatNumber(user.aiBonusTokens)} token bonus</AdminPill>
      </div>

      <div className="mt-3 grid gap-3 lg:grid-cols-3">
        {/* 1 — UBAH / BERI PAKET */}
        <div className={CARD_CLASS}>
          <p className="flex items-center gap-1.5 text-[12px] font-semibold text-forest">
            <Crown className="size-3.5" aria-hidden /> Beri / ubah paket
          </p>
          <div className="mt-2 space-y-2">
            <label className="block text-[11px] text-forest/55">
              Paket
              <select
                value={planId}
                onChange={(event) => setPlanId(event.target.value as PlanId)}
                className={FIELD_CLASS}
              >
                {PLANS.map((plan) => (
                  <option key={plan.id} value={plan.id}>
                    {plan.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-[11px] text-forest/55">
              Durasi
              <select
                value={period}
                onChange={(event) => setPeriod(event.target.value as AdminBillingPeriod)}
                className={FIELD_CLASS}
              >
                <option value="monthly">30 hari</option>
                <option value="lifetime">Akses selamanya</option>
              </select>
            </label>
            <button
              type="button"
              disabled={busy !== null}
              onClick={() => void run('plan', { action: 'set-plan', userId: user.id, planId, period })}
              className={`${BUTTON_CLASS} w-full`}
            >
              {busy === 'plan' ? 'Menyimpan…' : 'Simpan paket'}
            </button>
          </div>
        </div>

        {/* 2 — PERPANJANG MASA AKTIF */}
        <div className={CARD_CLASS}>
          <p
            className="flex items-center gap-1.5 text-[12px] font-semibold text-forest"
            title="Menumpuk dari sisa hari. Tidak berlaku untuk akses selamanya."
          >
            <CalendarPlus className="size-3.5" aria-hidden strokeWidth={1.8} /> Perpanjang
          </p>
          <div className="mt-2 space-y-2">
            <label className="block text-[11px] text-forest/55">
              Tambah
              <select
                value={days}
                onChange={(event) => setDays(Number(event.target.value))}
                className={FIELD_CLASS}
              >
                {DAY_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    {option} hari
                  </option>
                ))}
              </select>
            </label>
            <button
              type="button"
              disabled={busy !== null}
              onClick={() => void extend()}
              className={`${BUTTON_CLASS} w-full`}
            >
              {busy === 'extend' ? 'Memproses…' : `Tambah ${days} hari`}
            </button>
          </div>
        </div>

        {/* 3 — KUOTA AI */}
        <div className={CARD_CLASS}>
          <p className="flex items-center gap-1.5 text-[12px] font-semibold text-forest">
            <Bot className="size-3.5" aria-hidden strokeWidth={1.8} /> Kuota AI
          </p>
          <div className="mt-2 space-y-2">
            <label className="block text-[11px] text-forest/55">
              Bonus token
              <input
                type="number"
                min={1}
                step={1000}
                value={tokens}
                onChange={(event) => setTokens(event.target.value)}
                className={FIELD_CLASS}
              />
            </label>
            <button
              type="button"
              disabled={busy !== null}
              onClick={() => void bonus()}
              className={`${BUTTON_CLASS} w-full`}
            >
              {busy === 'bonus' ? 'Menambahkan…' : 'Tambah bonus token'}
            </button>
            {confirmReset ? (
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  disabled={busy !== null}
                  onClick={() => {
                    setConfirmReset(false)
                    void run('reset', { action: 'ai-reset', userId: user.id })
                  }}
                  className="flex-1 rounded-xl bg-plum px-2 py-2 text-[11px] font-semibold text-cream transition-colors hover:bg-plum-deep"
                >
                  Yakin, reset
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmReset(false)}
                  className="flex-1 rounded-xl bg-ink/[0.06] px-2 py-2 text-[11px] font-semibold text-forest transition-colors hover:bg-ink/10"
                >
                  Batal
                </button>
              </div>
            ) : (
              <button
                type="button"
                disabled={busy !== null}
                onClick={() => setConfirmReset(true)}
                className="inline-flex w-full items-center justify-center gap-1.5 rounded-xl bg-ink/[0.06] px-3 py-2 text-[11px] font-semibold text-forest transition-colors hover:bg-ink/10"
              >
                <RotateCcw className="size-3" aria-hidden /> Reset pemakaian bulan ini
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="mt-2.5 flex flex-wrap items-center gap-2">
        <button
          type="button"
          disabled={busy !== null}
          onClick={() => void run('repair', { action: 'repair-plan', userId: user.id })}
          className="inline-flex items-center gap-1.5 rounded-xl bg-cream px-3 py-2 text-[11px] font-semibold text-forest ring-1 ring-soil/[0.08] transition-colors hover:bg-sage/60 disabled:cursor-not-allowed disabled:text-forest/35"
          title="Menulis ulang hak akses ke user_subscriptions dari baris pembelian yang lunas."
        >
          <RefreshCw className="size-3" aria-hidden strokeWidth={1.8} />
          {busy === 'repair' ? 'Menyinkronkan…' : 'Sinkron dari pembayaran lunas'}
        </button>
        <span className="text-[10.5px] text-forest/35">ditulis ke tabel yang sama dengan aplikasi</span>
      </div>
    </div>
  )
}

