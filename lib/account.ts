/* ── HAPUS AKUN — YANG BENAR-BENAR DIJALANKAN (paket 43 · audit Stage 6 #2) ────
   Temuan audit: repo ini tidak punya penghapusan akun sama sekali. Satu-satunya
   pintu keluar adalah `/settings/logout`, dan itu memang mengakhiri sesi TANPA
   menghapus apa pun. Untuk aplikasi keuangan, "hapus akun" adalah hak dasar user
   — bukan hiasan menu.

   Yang dilakukan file ini, berurutan dan satu arah:

     1. `purgeDeviceData()`
        a. buang SEMUA penanda lokal milik app ini (localStorage &
           sessionStorage, awalan `catet`) — preferensi PIN, kode undangan,
           target bulanan, preferensi notifikasi, penanda settle legacy
           `/joint`, semuanya;
        b. hapus BASIS DATA IndexedDB tempat baris ledger, dompet, celengan,
           kekayaan, tagihan, & kantong bersama disimpan;
        c. kosongkan store uang, celengan, kekayaan, tagihan, & kantong bersama di
           memory + tandai `purged` supaya data contoh tidak pernah muncul kembali
           setelah refresh (`lib/money/store.ts`, `lib/money/funds-store.ts`,
           `lib/money/wealth-store.ts`, `lib/money/bills-store.ts`,
           `lib/money/joint-store.ts`);
        d. kosongkan store yang hidup di memory: antrean undangan & pemakaian AI.
     2. `endSession()` — cookie sesi dihapus server (`DELETE /api/session`).

   ⚠️ BATAS YANG HARUS JUJUR DIKATAKAN (dan sudah tertulis di UI):
     · TIDAK ada penghapusan di sisi server, karena demo ini tidak punya server
       penyimpanan — jadi tidak ada salinan yang bisa diminta dihapus.
     · Di produksi fungsi yang sama memanggil `DELETE /api/account`: satu transaksi
       yang menghapus baris `wallets`/`ledger_rows`/`debt*`/`goals` milik
       `auth.uid()`, menghapus objek di storage, lalu menghapus auth user Supabase.
       Klien tetap menjalankan langkah (a)–(d) di atas, karena cache lokal juga
       harus ikut bersih. */

import { resetAiUsageStore } from './ai-usage-store'
import { resetInviteStore } from './invite-store'
import { clearMoneyState } from './money/idb'
import { getBillsSnapshot, liveBills, purgeBillsStore } from './money/bills-store'
import { getJointSnapshot, jointNotes, purgeJointStore } from './money/joint-store'
import { getFundsSnapshot, purgeFundsStore } from './money/funds-store'
import { getWealthSnapshot, purgeWealthStore } from './money/wealth-store'
import { getMoneySnapshot, purgeMoneyStore } from './money/store'
import { purgeUserMoneySettings } from './user-money-settings'
import { endSession } from './session-client'
import { browserSupabase } from './supabase/client'

/**
 * Bentuk terkecil dari Web Storage yang dibutuhkan pembersihan ini. Ditulis
 * sebagai tipe sendiri supaya jalur pembersihan bisa diuji dengan penyimpanan
 * palsu (`lib/account.test.ts`) — `localStorage` tidak ada di lingkungan test.
 */
export interface StorageLike {
  readonly length: number
  key(index: number): string | null
  removeItem(key: string): void
}

/**
 * Awalan SEMUA penanda milik app ini (`catet-onboarding`, `catet-ind-app-lock`,
 * `catet-ind-invites`, `catet-theme`, …).
 *
 * Dibuang berdasarkan AWALAN, bukan daftar nama: daftar nama akan ketinggalan
 * setiap kali ada preferensi baru, dan "hapus akun" yang menyisakan satu penanda
 * user adalah bug privasi yang tidak terlihat sampai ada yang memeriksanya.
 */
export const APP_STORAGE_PREFIX = 'catet'

/**
 * Buang semua kunci ber-awalan `catet` dari satu penyimpanan. Mengembalikan
 * nama kunci yang benar-benar dihapus, supaya hasilnya bisa DIBUKTIKAN (dipakai
 * test & laporan) — bukan cuma diklaim.
 */
export function purgeStorageKeys(storage: StorageLike): string[] {
  const doomed: string[] = []
  for (let index = 0; index < storage.length; index += 1) {
    const key = storage.key(index)
    if (key !== null && key.startsWith(APP_STORAGE_PREFIX)) doomed.push(key)
  }
  /* dihapus di loop KEDUA: menghapus saat indeksnya sedang dibaca akan menggeser
     kunci berikutnya dan menyisakan sebagian penanda */
  const removed: string[] = []
  for (const key of doomed) {
    try {
      storage.removeItem(key)
      removed.push(key)
    } catch {
      /* storage diblokir — kunci berikutnya tetap dicoba */
    }
  }
  return removed
}

export interface PurgeReport {
  /** nama kunci localStorage yang dihapus (untuk bukti, bukan untuk UI) */
  localStorageKeys: string[]
  sessionStorageKeys: string[]
  /** true = database IndexedDB benar-benar terhapus */
  indexedDbCleared: boolean
  /** jumlah dompet & baris ledger yang ikut hilang dari store */
  walletsCleared: number
  ledgerRowsCleared: number
  /**
   * jumlah celengan yang ikut hilang dari store perangkat (paket 46). State
   * celengan hidup di database yang SAMA dengan uang, jadi "Hapus Akun" yang
   * benar harus membersihkannya juga — dan jumlahnya dilaporkan sebagai bukti,
   * bukan cuma diklaim.
   */
  fundsCleared: number
  /**
   * jumlah catatan kekayaan yang ikut hilang dari store perangkat (paket 50):
   * hutang/piutang, aset investasi, dan baris riwayat pembayarannya. Ketiganya
   * hidup di database IndexedDB yang SAMA dengan uang, jadi "Hapus Akun" yang
   * benar harus membersihkannya juga — dan jumlahnya dilaporkan sebagai bukti.
   */
  debtsCleared: number
  investmentsCleared: number
  debtPaymentsCleared: number
  /**
   * jumlah tagihan rutin yang ikut hilang dari store perangkat (paket 51).
   * Tagihan hidup di database IndexedDB yang SAMA dengan uang, jadi "Hapus Akun"
   * yang benar harus membersihkannya juga — dan jumlahnya dilaporkan sebagai
   * bukti, bukan cuma diklaim. Tanpa langkah ini, tagihan contoh (Kos, Netflix,
   * cicilan HP) muncul kembali setelah refresh.
   */
  billsCleared: number
  /**
   * jumlah catatan kantong bersama yang ikut hilang dari store perangkat
   * (paket 52). Kantong bersama hidup di database IndexedDB yang SAMA dengan
   * uang, jadi "Hapus Akun" yang benar harus membersihkannya juga — dan
   * jumlahnya dilaporkan sebagai bukti, bukan cuma diklaim. Tanpa langkah ini,
   * kantong contoh (Dompet Kita, catatan WiFi) muncul kembali setelah refresh.
   */
  jointRowsCleared: number
  /**
   * true = konfigurasi uang user (pemasukan bulanan, total cicilan, tanggal
   * gajian, periode dashboard) sudah dibuang & ditandai `purged` (paket 57).
   *
   * Dilaporkan sebagai boolean, bukan jumlah baris: yang dibuang cuma satu
   * catatan kecil, tapi efeknya besar — tanpa langkah ini "Hapus Akun" bisa
   * meninggalkan pemasukan user hidup di perangkat, dan Jatah Harian berikutnya
   * dihitung dari angka yang seharusnya sudah dihapus.
   */
  moneySettingsPurged: boolean
}

function storageOf(kind: 'local' | 'session'): StorageLike | null {
  if (typeof window === 'undefined') return null
  try {
    const storage = kind === 'local' ? window.localStorage : window.sessionStorage
    return storage ?? null
  } catch {
    /* mode privasi ketat bisa MELEMPAR saat propertinya diakses */
    return null
  }
}

/**
 * Bersihkan seluruh data akun dari perangkat ini. Aman dipanggil berkali-kali
 * (idempoten): pembersihan kedua tidak menemukan apa pun dan tetap "berhasil".
 */
export async function purgeDeviceData(): Promise<PurgeReport> {
  const before = getMoneySnapshot()
  /* celengan & kekayaan dibaca SEBELUM dibersihkan — jumlahnya jadi bukti di laporan */
  const fundsBefore = getFundsSnapshot().funds.length
  const wealthBefore = getWealthSnapshot()
  const debtsBefore = wealthBefore.debts.length
  const investmentsBefore = wealthBefore.investments.length
  const debtPaymentsBefore = wealthBefore.payments.length
  /* tagihan dibaca SEBELUM dibersihkan — jumlahnya jadi bukti di laporan (paket 51) */
  const billsBefore = liveBills(getBillsSnapshot()).length
  /* kantong bersama dibaca SEBELUM dibersihkan (paket 52) — jumlah CATATAN-nya
     yang dilaporkan, karena itu bagian yang user kenali sebagai datanya */
  const jointBefore = getJointSnapshot()
  const jointRowsBefore = jointNotes(jointBefore).length

  const local = storageOf('local')
  const session = storageOf('session')
  const localStorageKeys = local ? purgeStorageKeys(local) : []
  const sessionStorageKeys = session ? purgeStorageKeys(session) : []

  /* urutannya penting: HAPUS dulu database-nya, baru tulis state kosong — kalau
     dibalik, tulisan state kosong itu ikut terhapus dan tidak ada penanda
     `purged` yang tersisa untuk refresh berikutnya */
  const indexedDbCleared = await clearMoneyState()
  purgeMoneyStore()
  /* state celengan hidup di database yang sama (key `funds`), jadi ia harus
     dikosongkan di memory JUGA — database yang terhapus tidak menghapus isi
     memory modul */
  purgeFundsStore()
  /* state kekayaan hidup di database yang sama (key `wealth`), jadi ia harus
     dikosongkan di memory JUGA — database yang terhapus tidak menghapus isi
     memory modul. Tanpa langkah ini, hutang Kredivo & saham BBCA muncul kembali
     di `/wealth` sampai user refresh. */
  purgeWealthStore()
  /* Tagihan juga hidup di database yang sama (key `bills`) — dikosongkan di
     memory JUGA, supaya daftar contoh tidak muncul kembali di `/bills` sampai
     user refresh (temuan E laporan 46, paket 51). */
  purgeBillsStore()
  /* Kantong bersama juga hidup di database yang sama (key `joint`) — dikosongkan
     di memory JUGA, dan langganan realtime-nya dilepas. Tanpa langkah ini,
     kantong contoh & catatan WiFi muncul kembali di `/joint` sampai user refresh
     (temuan F laporan 46, paket 52). */
  purgeJointStore()

  resetInviteStore()
  resetAiUsageStore()

  /* Konfigurasi UANG user (paket 57): pemasukan bulanan, total cicilan, tanggal
     gajian, periode dashboard. Dipanggil SETELAH penyapuan kunci `catet*` di
     atas — `purgeUserMoneySettings()` justru MENULIS penanda `purged` supaya
     nilainya tidak "lahir kembali" dari hasil onboarding yang mungkin masih ada
     di perangkat lain (pola yang sama dengan store uang). */
  purgeUserMoneySettings()

  return {
    localStorageKeys,
    sessionStorageKeys,
    indexedDbCleared,
    walletsCleared: before.wallets.length,
    ledgerRowsCleared: before.rows.length,
    fundsCleared: fundsBefore,
    debtsCleared: debtsBefore,
    investmentsCleared: investmentsBefore,
    debtPaymentsCleared: debtPaymentsBefore,
    billsCleared: billsBefore,
    jointRowsCleared: jointRowsBefore,
    moneySettingsPurged: true,
  }
}

export interface DeleteAccountResult {
  report: PurgeReport
  /** false = cookie sesi gagal dihapus server (dikatakan apa adanya di UI) */
  sessionEnded: boolean
  /** true = baris milik user benar-benar sudah dihapus di server (RPC jalan) */
  serverPurged: boolean
  /** jumlah baris server yang dihapus per tabel — bukti, bukan klaim */
  serverCounts: Record<string, number> | null
}

/**
 * Hapus data akun DI SERVER: RPC `security definer`
 * `catetind_delete_account_data()` (migrasi 04). `null` = tidak ada sesi/backend
 * atau RPC-nya ditolak — dan itu dibedakan dari "berhasil menghapus nol baris":
 * user berhak tahu kalau datanya masih ada di server.
 */
async function deleteServerData(): Promise<{ counts: Record<string, number> | null } | null> {
  const client = browserSupabase()
  if (!client) return null
  try {
    const { data, error } = await client.rpc('catetind_delete_account_data')
    if (error) return null
    return { counts: (data ?? {}) as Record<string, number> }
  } catch {
    return null
  }
}

/**
 * Hapus akun: hapus di SERVER dulu (butuh sesi yang masih hidup), lalu bersihkan
 * perangkat, lalu akhiri sesinya.
 */
export async function deleteAccount(): Promise<DeleteAccountResult> {
  const server = await deleteServerData()
  const report = await purgeDeviceData()
  const sessionEnded = await endSession()
  return { report, sessionEnded, serverPurged: server !== null, serverCounts: server?.counts ?? null }
}
