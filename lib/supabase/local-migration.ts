'use client'

import { ONBOARDING_STORE_KEY } from '@/lib/onboarding'
import { PRIVACY_MASKED_KEY } from '@/lib/privacy-settings'
import { TARGET_STORE_KEY } from '@/lib/data/monthly-review'
import type { MoneyRow, PersistedMoney } from '@/lib/money/store'
import { browserSupabase } from './client'
import { toLedgerInsert, toWalletDbRow } from './mappers'
import { patchUserSettings } from './user-settings-remote'


/* ── MIGRASI DATA LOKAL → SERVER, SEKALI JALAN (paket 45) ────────────────────
   User yang sudah memakai app versi lokal (IndexedDB) datang ke backend baru
   membawa datanya sendiri. Dua pilihan yang keduanya salah kalau dipilih tanpa
   pikir:

     · mengabaikan data lokal → catatannya "hilang" (ini pelanggaran terberat
       untuk aplikasi keuangan);
     · menyalinnya setiap kali login → catatan berlipat.

   Karena itu migrasi ini: (1) hanya jalan SEKALI per akun (penanda
   `catet-ind-migrated-v1:<userId>`), (2) idempotent di sisi server lewat
   `client_tx_id` + `on conflict`, jadi menekan refresh di tengah proses pun
   tidak menggandakan baris, dan (3) tidak menghapus apa pun di perangkat —
   IndexedDB tetap jadi cache offline (Stage 5 tidak diturunkan). */

const FLAG_PREFIX = 'catet-ind-migrated-v1'

export function migrationFlagKey(userId: string): string {
  return `${FLAG_PREFIX}:${userId}`
}

export function readMigrationFlag(userId: string): boolean {
  if (typeof window === 'undefined') return false
  try {
    return window.localStorage.getItem(migrationFlagKey(userId)) === '1'
  } catch {
    return false
  }
}

export function markMigrated(userId: string): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(migrationFlagKey(userId), '1')
  } catch {
    /* storage diblokir → migrasi akan dicoba lagi lain kali (idempotent, aman) */
  }
}

/** pengaturan lokal yang ikut naik ke `user_settings` */
export interface LocalSettingsSnapshot {
  onboarding: unknown | null
  monthlyTargets: unknown | null
  masked: boolean
}

function readJson(key: string): unknown | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = window.localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as unknown) : null
  } catch {
    return null
  }
}

export function readLocalSettings(): LocalSettingsSnapshot {
  let masked = false
  if (typeof window !== 'undefined') {
    try {
      masked = window.localStorage.getItem(PRIVACY_MASKED_KEY) === '1'
    } catch {
      masked = false
    }
  }
  return {
    onboarding: readJson(ONBOARDING_STORE_KEY),
    monthlyTargets: readJson(TARGET_STORE_KEY),
    masked,
  }
}

export interface LocalMigrationResult {
  /** true = data lokal benar-benar dikirim ke server pada pemanggilan ini */
  ran: boolean
  /** true = sudah pernah (atau tidak ada yang perlu diimpor) */
  alreadyDone: boolean
  wallets: number
  rows: number
  settings: boolean
}

/** `null` = backend/sesi tidak ada → jangan tandai apa pun, coba lagi nanti */
export async function migrateLocalDataToServer(
  input: {
    userId: string
    wallets: PersistedMoney['wallets'] | undefined
    rows: readonly MoneyRow[]
  },
  { readSettings = readLocalSettings }: { readSettings?: () => LocalSettingsSnapshot } = {},
): Promise<LocalMigrationResult> {
  const walletsToImport = input.wallets ?? []
  const rowsToImport = input.rows ?? []
  const empty: LocalMigrationResult = {
    ran: false,
    alreadyDone: false,
    wallets: 0,
    rows: 0,
    settings: false,
  }

  const client = browserSupabase()
  if (!client) return empty
  if (readMigrationFlag(input.userId)) return { ...empty, alreadyDone: true }

  /* Server sudah berisi data (mis. user masuk di perangkat kedua) → tidak ada
     yang perlu diimpor: yang benar adalah MEMBACA server, bukan menimpa. */
  const [walletCount, rowCount] = await Promise.all([
    client.from('wallets').select('id', { count: 'exact', head: true }),
    client.from('ledger_rows').select('id', { count: 'exact', head: true }),
  ])
  if ((walletCount.count ?? 0) > 0 || (rowCount.count ?? 0) > 0) {
    markMigrated(input.userId)
    return { ...empty, alreadyDone: true }
  }

  let wallets = 0
  for (const [index, wallet] of walletsToImport.entries()) {
    const { error } = await client
      .from('wallets')
      .upsert(toWalletDbRow(wallet, index), { onConflict: 'user_id,id' })
    if (!error || error.code === '23505') wallets += 1
  }

  let rows = 0
  /* urut dari yang PALING LAMA supaya `seq` yang lebih kecil masuk lebih dulu;
     urutannya tidak wajib, tapi membuat hasilnya mudah dibaca saat diperiksa */
  const oldestFirst = [...rowsToImport].sort((a, b) => a.seq - b.seq)
  for (const row of oldestFirst) {
    const { error } = await client.from('ledger_rows').insert(toLedgerInsert(row))
    if (!error || error.code === '23505') rows += 1
  }

  const local = readSettings()
  const settings = await patchUserSettings({
    ...(local.onboarding ? { onboarding: local.onboarding } : {}),
    ...(local.monthlyTargets ? { monthlyTargets: local.monthlyTargets } : {}),
    masked: local.masked,
  })

  /* Penanda dipasang HANYA kalau semua baris benar-benar sampai. Kalau tidak,
     percobaan berikutnya mengirim ulang — dan itu aman (idempotent). */
  if (wallets === walletsToImport.length && rows === rowsToImport.length) {
    markMigrated(input.userId)
    return { ran: true, alreadyDone: false, wallets, rows, settings }
  }

  return { ran: true, alreadyDone: false, wallets, rows, settings }
}
