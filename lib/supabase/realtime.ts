'use client'

import type { RealtimeChannel } from '@supabase/supabase-js'
import type { JointTransactionDbRow } from './mappers'
import { browserSupabase } from './client'

/* ── REALTIME TRANSAKSI DOMPET BERSAMA (paket 45) ────────────────────────────
   Sebelum paket ini "transaksi partner masuk sendiri" adalah TIMER: setelah
   5 detik, `REALTIME_ARRIVAL` (konstanta mock di `lib/data/joint.ts`) muncul
   sebagai catatan baru. Itu demo yang jujur disebut demo, tapi bukan realtime —
   tidak ada satu baris pun datang dari perangkat orang lain.

   Sekarang langganannya nyata: channel Postgres Changes pada
   `joint_transactions` yang difilter `joint_wallet_id`. Database yang mengirim
   barisnya (publication `supabase_realtime` + `replica identity full` diatur
   migrasi 04), dan RLS tetap berlaku — akun yang bukan anggota dompet itu TIDAK
   menerima apa pun, sekalipun mencoba berlangganan ke wallet id yang sama.

   Dua hal kecil yang membuat ini tidak bocor sumber daya:
     · channel dibuang saat tab disembunyikan (`visibilitychange`) — tab yang
       ditinggal berjam-jam tidak perlu menahan koneksi websocket;
     · `stop()` selalu aman dipanggil berkali-kali (dipakai cleanup React).

   `null` = backend belum dipasangkan → pemanggil memakai perilaku demo
   (`DEMO_REALTIME_MOCK`) seperti sebelumnya.

   PAKET 52 — siapa yang berlangganan: `lib/money/joint-store.ts`, bukan lagi
   halaman `/joint`. Alasannya: id dompetnya kini dibaca dari tabel
   `joint_wallets` (bukan id kanon yang tidak ada di sana), dan kalau halaman
   yang berlangganan maka dua tab bisa membuka dua channel untuk satu kantong
   yang sama sementara barisnya tidak pernah bertemu. Baris yang datang
   diteruskan ke store lewat `applyRemoteJointRow()` (dedupe by id). */

export interface JointRealtimeHandle {
  /** hentikan langganan (idempoten) */
  stop: () => void
  /** true = channel benar-benar tersambung ke Supabase */
  live: boolean
}

/**
 * Baris yang datang lewat Postgres Changes = baris `joint_transactions` UTUH
 * (migrasi 04 memasang `replica identity full`), jadi bentuknya sama dengan
 * baris yang dibaca lewat REST — termasuk kolom split & `is_settlement`.
 *
 * Paket 52: dulu tipe ini hanya memuat kolom pajangan, sehingga baris partner
 * SELALU dianggap "bagi rata" dan baris settle dari server bisa terhitung
 * sebagai pengeluaran. Sekarang pemetaannya satu jalur:
 * `toJointTransaction()` di `./mappers`.
 */
export type JointTransactionPayload = JointTransactionDbRow

export function subscribeJointTransactions(
  jointWalletId: string,
  onInsert: (row: JointTransactionPayload) => void,
): JointRealtimeHandle | null {
  const client = browserSupabase()
  if (!client || !jointWalletId) return null

  let channel: RealtimeChannel | null = null
  let stopped = false

  const open = () => {
    if (stopped || channel) return
    channel = client
      .channel(`joint:${jointWalletId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'joint_transactions',
          filter: `joint_wallet_id=eq.${jointWalletId}`,
        },
        (payload) => {
          const row = payload.new as unknown as JointTransactionPayload
          if (row?.id === '') return
          onInsert(row)
        },
      )
      .subscribe()
  }

  const close = () => {
    if (!channel) return
    const current = channel
    channel = null
    void client.removeChannel(current)
  }

  const onVisibility = () => {
    if (document.visibilityState === 'hidden') close()
    else open()
  }

  open()
  document.addEventListener('visibilitychange', onVisibility)

  return {
    live: true,
    stop: () => {
      stopped = true
      document.removeEventListener('visibilitychange', onVisibility)
      close()
    },
  }
}
