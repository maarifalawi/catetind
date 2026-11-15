'use client'

import { useCallback, useEffect, useState } from 'react'
import { BellRing, Loader2, Play, TestTube2 } from 'lucide-react'
import type { CronReport, CronRunRow, ReminderKind } from '@/lib/push/types'
import { fetchLastPushCronRun, triggerPushCron } from './admin-api'
import {
  ADMIN_PRIMARY_BUTTON,
  ADMIN_SMALL_BUTTON,
  AdminList,
  AdminListRow,
  AdminMeta,
  AdminPill,
  AdminSection,
  AdminStat,
  formatDateTime,
  formatNumber,
} from './admin-ui'

/* ── KARTU KONTROL PENGINGAT PUSH ────────────────────────────────────────────
   Pemilik produk butuh dua hal yang tidak bisa diberikan jadwal Vercel:

     · "Jalankan sekarang" → memastikan pesan benar-benar sampai ke HP penguji
       tanpa menunggu 08.00 WIB besok;
     · "Mode simulasi"     → melihat berapa perangkat yang akan menerima dan
       pesan jenis apa, TANPA menembakkan push (tidak ada notifikasi nyasar ke
       user saat pengujian).

   Angkanya datang dari `POST/GET /api/admin/push-cron` — route yang sudah
   memverifikasi sesi + email admin. Komponen ini tidak menghitung apa pun
   sendiri, jadi layar dan riwayat `push_cron_runs` tidak bisa berbeda.

   Konvensi tampilan mengikuti `admin-ui.tsx`: angka dulu, satu keterangan
   pendek, tanpa shadow, warna hanya untuk arti.
   ────────────────────────────────────────────────────────────────────────── */

const KIND_LABEL: Record<ReminderKind, string> = {
  bills: 'Tagihan jatuh tempo',
  daily: 'Sapaan jatah jajan',
  weekly: 'Rekap pekan',
}

const MODE_LABEL: Record<'morning' | 'weekly', string> = {
  morning: 'jadwal pagi (08.00 WIB)',
  weekly: 'jadwal Minggu malam (20.00 WIB)',
}

export function AdminPushCard() {
  const [busy, setBusy] = useState<'live' | 'dry' | null>(null)
  const [report, setReport] = useState<CronReport | null>(null)
  const [last, setLast] = useState<CronRunRow | null>(null)
  const [message, setMessage] = useState<string | null>(null)

  const loadLast = useCallback(async () => {
    const result = await fetchLastPushCronRun()
    setLast(result.last)
    if (!result.ok) setMessage(result.message)
  }, [])

  useEffect(() => {
    void loadLast()
  }, [loadLast])

  async function run(dryRun: boolean) {
    setBusy(dryRun ? 'dry' : 'live')
    setMessage(null)
    const result = await triggerPushCron(dryRun)
    setBusy(null)
    setMessage(result.message)
    if (result.report) {
      setReport(result.report)
      /* eksekusi nyata menulis baris riwayat baru → ringkasan dimuat ulang */
      if (!dryRun) void loadLast()
    }
  }

  /* Hasil yang sedang tampil: eksekusi dari tombol ini, atau riwayat terakhir
     dari database saat halaman baru dibuka. */
  const shown = report
  const sent = shown?.sent ?? last?.sent ?? 0
  const failed = shown?.failed ?? last?.failed ?? 0
  const dropped = shown?.dropped ?? last?.dropped ?? 0
  const targets = shown?.targets ?? last?.targets ?? 0
  const ranAt = shown?.ranAt ?? last?.ranAt ?? null
  const dryRun = shown?.dryRun ?? last?.dryRun ?? false
  const mode = shown?.mode ?? last?.mode ?? 'morning'
  const note = shown?.note ?? last?.note ?? null
  const planned = shown?.planned ?? []

  return (
    <AdminSection
      title="Pengingat push"
      note="Maksimal satu notifikasi per user per hari (WIB). Tagihan jatuh tempo didahulukan, lalu sapaan jatah jajan; rekap pekan dikirim Minggu malam. Langganan yang ditolak layanan push (404/410) dihapus otomatis."
    >
      <div className="grid grid-cols-3 gap-3">
        <AdminStat
          label="Terkirim"
          value={formatNumber(sent)}
          hint={`${formatNumber(targets)} perangkat`}
        />
        <AdminStat label="Gagal" value={formatNumber(failed)} hint="bukan 404/410" />
        <AdminStat label="Dibersihkan" value={formatNumber(dropped)} hint="langganan mati" />
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-soil/[0.06] pt-3">
        <button
          type="button"
          onClick={() => void run(false)}
          disabled={busy !== null}
          className={ADMIN_PRIMARY_BUTTON}
        >
          {busy === 'live' ? (
            <Loader2 className="size-4 animate-spin" aria-hidden strokeWidth={2} />
          ) : (
            <Play className="size-4" aria-hidden strokeWidth={2} />
          )}
          Jalankan sekarang
        </button>
        <button
          type="button"
          onClick={() => void run(true)}
          disabled={busy !== null}
          className={ADMIN_SMALL_BUTTON}
        >
          {busy === 'dry' ? (
            <Loader2 className="size-4 animate-spin" aria-hidden strokeWidth={2} />
          ) : (
            <TestTube2 className="size-4" aria-hidden strokeWidth={1.8} />
          )}
          Mode simulasi
        </button>
        <AdminPill tone={dryRun ? 'thistle' : 'mint'}>
          <BellRing className="size-3.5" aria-hidden strokeWidth={2} />
          {dryRun ? 'simulasi terakhir' : MODE_LABEL[mode]}
        </AdminPill>
      </div>

      {ranAt && (
        <AdminMeta className="mt-3">
          Eksekusi terakhir {formatDateTime(ranAt)}
          {shown ? ` · ${formatNumber(shown.users)} user` : ''}
        </AdminMeta>
      )}

      {message && (
        <p className="mt-2 rounded-xl bg-sage/50 px-3 py-2 text-[12.5px] leading-snug text-forest-muted">
          {message}
        </p>
      )}

      {note && <AdminMeta className="mt-2">{note}</AdminMeta>}

      {planned.length > 0 ? (
        <>
          <AdminMeta className="mt-3">Rencana pesan (maks. 20):</AdminMeta>
          <AdminList className="mt-1 max-h-[220px] overflow-y-auto">
            {planned.slice(0, 20).map((item) => (
              <AdminListRow
                key={`${item.userId}-${item.kind}`}
                left={KIND_LABEL[item.kind]}
                meta={item.title}
                right={`${formatNumber(item.devices)} perangkat`}
              />
            ))}
          </AdminList>
        </>
      ) : null}
    </AdminSection>
  )
}

