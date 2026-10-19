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

/* ── REALTIME KELUARGA KEKAYAAN & ASET FISIK (paket 84) ──────────────────────
   Sebelum ini hanya `joint_transactions` yang punya langganan nyata: halaman
   `/wealth` baru melihat perubahan dari perangkat/tab LAIN saat di-refresh.
   Sekarang tabel kekayaan (investments, debts, debt_payments,
   asset_transactions) dan `physical_assets` ikut berlangganan Postgres Changes.

   Yang dikirim ke pemanggil BUKAN barisnya, tapi sinyal "ada yang berubah":
   tiap sinyal hanya memicu BACA ULANG server (`readRemoteWealth()` /
   `readRemotePhysicalAssets()`) lalu digabung lewat jalur yang SAMA dengan
   hidrasi. Jadi tidak ada pemetaan baris per baris yang bisa berbeda dari jalur
   REST — dan RLS tetap yang menentukan baris mana yang sampai ke klien.

   Dua hal kecil yang sama dengan channel joint: channel dibuang saat tab
   disembunyikan, dan `stop()` aman dipanggil berkali-kali. */

export interface WealthRealtimeHandle {
  /** hentikan langganan (idempoten) */
  stop: () => void
  /** true = channel benar-benar tersambung ke Supabase */
  live: boolean
}

/** tabel kekayaan yang perubahannya menarik `/wealth` untuk membaca ulang */
const WEALTH_TABLES = ['investments', 'debts', 'debt_payments', 'asset_transactions'] as const

export function subscribeTables(
  name: string,
  tables: readonly string[],
  onChange: () => void,
): WealthRealtimeHandle | null {
  const client = browserSupabase()
  if (!client) return null

  let channel: RealtimeChannel | null = null
  let stopped = false
  let timer: ReturnType<typeof setTimeout> | null = null

  /* debounce 250 ms — satu tindakan user bisa menulis beberapa baris (mis.
     pelunasan = 1 debt + 1 payment + 1 baris kas), dan kita tidak perlu
     membaca ulang server tiga kali */
  const fire = () => {
    if (timer) clearTimeout(timer)
    timer = setTimeout(() => {
      timer = null
      onChange()
    }, 250)
  }

  const open = () => {
    if (stopped || channel) return
    let next = client.channel(name)
    for (const table of tables) {
      next = next.on(
        'postgres_changes',
        { event: '*', schema: 'public', table: table as never },
        fire,
      )
    }
    channel = next.subscribe()
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
      if (timer) clearTimeout(timer)
      document.removeEventListener('visibilitychange', onVisibility)
      close()
    },
  }
}

/** langganan perubahan kekayaan — `onChange` dipanggil (debounced) saat ada baris baru */
export function subscribeWealthChanges(onChange: () => void): WealthRealtimeHandle | null {
  return subscribeTables('wealth-changes', WEALTH_TABLES, onChange)
}

/** langganan perubahan aset fisik/properti */
export function subscribePhysicalChanges(onChange: () => void): WealthRealtimeHandle | null {
  return subscribeTables('physical-changes', ['physical_assets'], onChange)
}

/* ── REALTIME METER PEMAKAIAN AI (paket 86) ──────────────────────────────────
   Sebelum ini kuota AI hanya dibaca sekali per pemuatan halaman, jadi user yang
   memakai AI di perangkat lain baru melihat angkanya bergerak setelah refresh.
   Sekarang `ai_usage` (pemakaian) & `ai_addons` (saldo token yang dibeli) ikut
   berlangganan Postgres Changes — ditambahkan ke publication oleh migrasi
   20261013120000. Sinyalnya cuma memicu BACA ULANG lewat jalur REST yang sama
   dengan hidrasi (`lib/ai-usage-store.ts` → `refreshAiUsage()`), jadi tidak ada
   perhitungan yang berbeda dari jalur normal dan RLS tetap menyaring user. */
export function subscribeAiUsageChanges(onChange: () => void): WealthRealtimeHandle | null {
  return subscribeTables('ai-usage-changes', ['ai_usage', 'ai_addons'], onChange)
}

/* ── REALTIME PENGHITUNG PENGGUNA LANDING (paket 87) ─────────────────────────
   Helper untuk angka publik di `landing_stats`: ketika ada langganan baru,
   trigger database menaikkan `subscriber_count`, dan helper ini mengirim ANGKA
   barunya ke pemanggil. Hero landing sekarang memakai label statis `1.000+`,
   jadi helper ini tidak dipanggil dari hero; tetap tersedia untuk pemakaian
   lain yang membutuhkan angka realtime (mis. halaman internal/eksperimen).

   Yang dikirim ke pemanggil hanya ANGKA — bukan baris mentah — karena itu
   satu-satunya kolom yang boleh tampil di landing. Seperti channel lain di
   file ini: RLS tetap berlaku, channel ditutup saat tab disembunyikan, dan
   `stop()` aman dipanggil berkali-kali. */
export function subscribeLandingStats(
  onCount: (count: number) => void,
): JointRealtimeHandle | null {
  const client = browserSupabase()
  if (!client) return null

  let channel: RealtimeChannel | null = null
  let stopped = false

  const open = () => {
    if (stopped || channel) return
    channel = client
      .channel('landing:stats')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'landing_stats',
          filter: 'id=eq.global',
        },
        (payload) => {
          const row = payload.new as { subscriber_count?: unknown } | null
          const next = Number(row?.subscriber_count)
          if (Number.isFinite(next) && next > 0) onCount(Math.floor(next))
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
