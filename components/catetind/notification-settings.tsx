'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import {
  Bell,
  BellOff,
  CheckCircle2,
  Download,
  Loader2,
  Send,
  Smartphone,
  UserRoundCheck,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { LOGIN_PATH, SESSION_COPY } from '@/lib/data/auth'
import { usePushNotifications } from '@/lib/use-push-notifications'

/* 5 jenis notifikasi kanon inventaris #22 (Domain 3A) */
const PREFS = [
  {
    id: 'reminder-harian',
    label: 'Reminder Harian',
    desc: 'Ingatkan catat pengeluaran — jam 12:30 & 19:00 WIB (maks 2x/hari)',
  },
  {
    id: 'laporan-mingguan',
    label: 'Laporan Mingguan',
    desc: 'Recap 7 hari terakhir — Minggu 20:00 WIB',
  },
  {
    id: 'laporan-bulanan',
    label: 'Laporan Bulanan',
    desc: 'AI recap bulanan — tanggal 1 tiap bulan',
  },
  {
    id: 'tanaman-layu',
    label: 'Tanaman Layu',
    desc: 'Peringatan kalau kamu lama gak catat (tanamanmu kangen 🌱)',
  },
  {
    id: 'tagihan-jatuh-tempo',
    label: 'Tagihan Jatuh Tempo',
    desc: 'Otomatis H-3 & H-1 sebelum tagihanmu jatuh tempo',
  },
  /* ditambahkan dari brief halaman Pengaturan: peringatan budget hampir habis.
     Framingnya lembut (bukan alarm) supaya konsisten dengan kanon 2B.2. */
  {
    id: 'budget-hampir-habis',
    label: 'Peringatan Budget Hampir Habis',
    desc: 'Kabar singkat begitu budget kategori terpakai 80%',
  },
] as const

type PrefId = (typeof PREFS)[number]['id']
const DEFAULT_PREFS: Record<PrefId, boolean> = {
  'reminder-harian': true,
  'laporan-mingguan': true,
  'laporan-bulanan': true,
  'tanaman-layu': true,
  'tagihan-jatuh-tempo': true,
  'budget-hampir-habis': true,
}
const PREFS_KEY = 'catet-notif-prefs'

export function NotificationSettings() {
  const {
    support,
    permission,
    subscribed,
    sessionMissing,
    activate,
    deactivate,
    testLocal,
    testRemote,
  } = usePushNotifications()
  const [prefs, setPrefs] = useState<Record<PrefId, boolean>>(DEFAULT_PREFS)
  const [busy, setBusy] = useState(false)
  const [sentMsg, setSentMsg] = useState<string | null>(null)

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(PREFS_KEY) ?? 'null')
      if (saved) setPrefs({ ...DEFAULT_PREFS, ...saved })
    } catch {
      /* abaikan JSON rusak */
    }
  }, [])

  const toggle = (id: PrefId) => {
    setPrefs((prev) => {
      const next = { ...prev, [id]: !prev[id] }
      localStorage.setItem(PREFS_KEY, JSON.stringify(next))
      return next
    })
  }

  const handleActivate = async () => {
    setBusy(true)
    await activate()
    setBusy(false)
  }
  const handleTestRemote = async () => {
    setBusy(true)
    const result = await testRemote()
    setBusy(false)
    if (result === 'ok') {
      setSentMsg('Push dikirim! Cek tray notifikasi HP kamu 🚀')
    } else if (result === 'no-session') {
      /* jujur: endpoint-nya memang menolak tanpa sesi (401) sejak paket 39 */
      setSentMsg(null)
    } else {
      setSentMsg('Push belum terkirim — coba lagi sebentar ya.')
    }
    setTimeout(() => setSentMsg(null), 4000)
  }

  return (
    <div className="space-y-5">
      {/* ── kartu status push ── */}
      <section className="rounded-[2rem] bg-cream p-5 ring-1 ring-soil/12 sm:p-6">
        <div className="flex items-start gap-3.5">
          <span
            className={cn(
              'flex size-10 shrink-0 items-center justify-center rounded-full',
              subscribed ? 'bg-mint/25 text-forest' : 'bg-sage text-forest',
            )}
          >
            {subscribed ? (
              <Bell className="size-5" strokeWidth={2.2} />
            ) : (
              <BellOff className="size-5" strokeWidth={2.2} />
            )}
          </span>
          <div className="min-w-0 flex-1">
            <h2 className="text-base font-medium text-forest">Notifikasi Push HP</h2>
            <p className="mt-0.5 text-sm leading-relaxed text-forest/55">
              {subscribed
                ? 'Aktif! Kamu bakal terima push walau app lagi ditutup.'
                : 'Aktifkan biar dapat reminder tanpa harus buka app dulu.'}
            </p>
          </div>
        </div>

        {/* iOS: harus install dulu (audit PRD #18) */}
        {support === 'needs-install' && (
          <div className="mt-4 flex items-start gap-3 rounded-2xl bg-hud-amber/10 px-4 py-3 ring-1 ring-hud-amber/25">
            <Download className="mt-0.5 size-4 shrink-0 text-hud-terracotta" />
            <p className="text-[13px] leading-relaxed text-forest/70">
              Di iOS, pasang dulu CatetInd ke layar utama:{' '}
              <b>Safari → Share → Add to Home Screen</b>. Setelah itu push
              notif bisa aktif.
            </p>
          </div>
        )}
        {support === 'unsupported' && (
          <p className="mt-4 rounded-2xl bg-soil/[0.1] px-4 py-3 text-[13px] text-forest/55">
            Browser ini belum mendukung Web Push — coba Chrome/Edge atau
            Safari iOS 16.4+ yang sudah di-install ke Home Screen.
          </p>
        )}
        {permission === 'denied' && support === 'supported' && (
          <p className="mt-4 rounded-2xl bg-hud-terracotta/10 px-4 py-3 text-[13px] text-hud-terracotta">
            Izin notifikasi ditolak browser — ubah lewat ikon 🔒 → Izin Situs →
            Notifikasi.
          </p>
        )}

        {support === 'supported' && permission !== 'denied' && (
          <div className="mt-4 flex flex-wrap items-center gap-2.5">
            {subscribed ? (
              <>
                <button
                  type="button"
                  onClick={handleTestRemote}
                  disabled={busy}
                  className="flex items-center gap-2 rounded-full bg-forest px-5 py-2.5 text-[13px] font-medium text-cream transition-colors hover:bg-forest-soft active:scale-[0.97] disabled:opacity-50"
                >
                  {busy ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <Send className="size-4" strokeWidth={2.2} />
                  )}
                  Kirim Push Test
                </button>
                <button
                  type="button"
                  onClick={testLocal}
                  className="rounded-full bg-sage px-5 py-2.5 text-[13px] font-medium text-forest transition-colors hover:bg-mint/40 active:scale-[0.97]"
                >
                  Tes Notif Lokal
                </button>
                <button
                  type="button"
                  onClick={deactivate}
                  className="rounded-full px-4 py-2.5 text-[13px] font-medium text-forest/45 transition-colors hover:text-forest"
                >
                  Nonaktifkan
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={handleActivate}
                disabled={busy}
                className="flex items-center gap-2 rounded-full bg-forest px-5 py-2.5 text-[13px] font-medium text-cream transition-colors hover:bg-forest-soft active:scale-[0.97] disabled:opacity-50"
              >
                {busy ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Bell className="size-4" strokeWidth={2.2} />
                )}
                Aktifkan Notifikasi
              </button>
            )}
          </div>
        )}

        {sentMsg && (
          <p className="mt-3 flex items-center gap-2 text-[13px] font-medium text-forest">
            <CheckCircle2 className="size-4" strokeWidth={2.2} />
            {sentMsg}
          </p>
        )}

        {/* 401 dari server (paket 39): tanpa sesi, subscription tidak punya
            pemilik — jadi bukan "berhasil", dan user diberi jalan keluarnya. */}
        {sessionMissing && (
          <div className="mt-3 rounded-2xl bg-hud-amber/20 px-4 py-3 ring-1 ring-hud-amber/50">
            <p className="flex items-center gap-2 text-[12.5px] font-medium text-forest">
              <UserRoundCheck className="size-4 shrink-0 text-forest/60" strokeWidth={2.2} aria-hidden />
              {SESSION_COPY.noSessionTitle}
            </p>
            <p className="mt-1 text-[11.5px] leading-relaxed text-forest/60">
              {SESSION_COPY.noSessionBody}
            </p>
            <Link
              href={LOGIN_PATH}
              className="mt-2 inline-flex text-[11.5px] font-medium text-forest underline underline-offset-2 hover:text-forest"
            >
              {SESSION_COPY.noSessionCta}
            </Link>
          </div>
        )}

        <p className="mt-4 flex items-start gap-2 rounded-2xl bg-cream px-4 py-3 text-xs leading-relaxed text-forest/50">
          <Smartphone className="mt-0.5 size-3.5 shrink-0 text-forest/40" />
          CatetInd kirim MAKSIMAL 3 push per minggu — bantu kamu balik catat,
          bukan nge-spam.
        </p>
      </section>

      {/* ── kartu toggle per jenis (inventaris #22) ── */}
      <section className="rounded-[2rem] bg-cream p-5 ring-1 ring-soil/12 sm:p-6">
        <h2 className="text-base font-medium text-forest">Jenis Notifikasi</h2>
        <p className="mt-0.5 text-sm text-forest/50">
          Pilih yang penting buat kamu — sisanya kita gak ganggu.
        </p>

        <ul className="mt-4 divide-y divide-soil/10">
          {PREFS.map((pref) => (
            <li
              key={pref.id}
              className="flex items-center gap-4 py-3.5 first:pt-0 last:pb-0"
            >
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-forest">{pref.label}</p>
                <p className="mt-0.5 text-xs leading-relaxed text-forest/50">
                  {pref.desc}
                </p>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={prefs[pref.id]}
                aria-label={`Toggle ${pref.label}`}
                onClick={() => toggle(pref.id)}
                className={cn(
                  'relative h-7 w-12 shrink-0 rounded-full transition-colors duration-200',
                  prefs[pref.id] ? 'bg-forest' : 'bg-soil/[0.12]',
                )}
              >
                <span
                  className={cn(
                    'absolute left-0.5 top-0.5 size-6 rounded-full bg-cream shadow-sm transition-transform duration-200',
                    prefs[pref.id] && 'translate-x-5',
                  )}
                />
              </button>
            </li>
          ))}
        </ul>
      </section>
    </div>
  )
}