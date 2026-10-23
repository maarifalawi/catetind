import { restConfigured, restFetch } from '@/lib/supabase/rest'

/* ── STATUS ONBOARDING PEMANGGIL (satu sumber) ───────────────────────────────
   Onboarding BUKAN sekadar halaman opsional: ia langkah pertama yang membuat
   akun punya data miliknya sendiri (dompet + transaksi pertama). Sebelum modul
   ini, hasil onboarding hanya disimpan di localStorage dan `user_settings.
   onboarding` tidak pernah dibaca siapa pun — akibatnya user baru langsung
   mendarat di Dashboard tanpa onboarding dan bisa melihat saldo yang bukan
   miliknya (mis. data lokal lama yang ikut termigrasi).

   Modul ini menjawab SATU pertanyaan untuk gerbang app: "apakah akun ini sudah
   menyelesaikan onboarding?" Jawabannya dibaca dari database memakai token
   pemanggil (RLS `user_id = auth.uid()`).

   Bentuk keputusan yang jujur:
     · `configured:false` (backend belum diisi/demo) → `known:false`; gerbang
       TIDAK boleh mengunci karena kita memang tidak tahu.
     · query gagal (jaringan/DB) → `known:false`; satu request gagal bukan
       alasan menahan user di layar setup.
     · `onboarding` punya `completedAt` → selesai.
     · `onboarding` kosong TAPI sudah ada dompet → LEGACY: akun lama yang dibuat
       sebelum penanda ini ada. Dianggap selesai supaya pelanggan lama tidak
       dipaksa mengulang onboarding.
     · `onboarding` kosong & belum punya dompet → belum onboarding.
   ────────────────────────────────────────────────────────────────────────── */

export interface CallerOnboarding {
  /** backend Supabase terkonfigurasi → jawabannya bisa dipercaya */
  configured: boolean
  /** true = jawaban di bawah benar-benar terbaca (bukan "tidak tahu") */
  known: boolean
  /** true = onboarding selesai; `null` saat `known:false` */
  onboarded: boolean | null
  /** ada baris dompet di akun ini (bukti akun sudah pernah dipakai) */
  hasWallets: boolean
  /** true = akun lama yang belum punya penanda `onboarding` */
  legacy: boolean
}

const UNKNOWN: CallerOnboarding = {
  configured: false,
  known: false,
  onboarded: null,
  hasWallets: false,
  legacy: false,
}

/** hasil onboarding dianggap selesai hanya kalau `completedAt` berisi tanggal */
export function isOnboardingComplete(value: unknown): boolean {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false
  const completedAt = (value as { completedAt?: unknown }).completedAt
  return typeof completedAt === 'string' && completedAt.trim().length > 0
}

/** keputusan murni (dipakai route + test) */
export function onboardingDecision(input: {
  configured: boolean
  settingsOk: boolean
  walletsOk: boolean
  onboarding: unknown
  walletCount: number
  /** baris ledger juga bukti akun pernah dipakai (akun lama bisa tanpa dompet) */
  rowCount?: number
}): CallerOnboarding {
  if (!input.configured) return UNKNOWN
  if (!input.settingsOk || !input.walletsOk) {
    return { configured: true, known: false, onboarded: null, hasWallets: false, legacy: false }
  }
  const hasWallets = input.walletCount > 0
  if (isOnboardingComplete(input.onboarding)) {
    return { configured: true, known: true, onboarded: true, hasWallets, legacy: false }
  }
  /* Akun lama: sudah punya dompet/catatan tetapi belum punya penanda onboarding.
     Jangan paksa onboarding ulang — itu akan terasa seperti kehilangan data. */
  if (hasWallets || (input.rowCount ?? 0) > 0) {
    return { configured: true, known: true, onboarded: true, hasWallets, legacy: true }
  }
  return { configured: true, known: true, onboarded: false, hasWallets: false, legacy: false }
}

interface SettingsRow {
  onboarding?: unknown
}

interface WalletRow {
  id?: string
}

export async function readCallerOnboarding(token: string): Promise<CallerOnboarding> {
  if (!restConfigured()) return UNKNOWN

  const [settings, wallets, rows] = await Promise.all([
    restFetch<SettingsRow[]>('user_settings?select=onboarding&limit=1', {
      accessToken: token,
    }),
    restFetch<WalletRow[]>('wallets?select=id&limit=1', { accessToken: token }),
    restFetch<WalletRow[]>('ledger_rows?select=id&limit=1', { accessToken: token }),
  ])

  return onboardingDecision({
    configured: true,
    settingsOk: settings.ok,
    walletsOk: wallets.ok && rows.ok,
    onboarding: Array.isArray(settings.data) ? settings.data[0]?.onboarding : null,
    walletCount: Array.isArray(wallets.data) ? wallets.data.length : 0,
    rowCount: Array.isArray(rows.data) ? rows.data.length : 0,
  })
}

/* ── VALIDASI HASIL ONBOARDING (POST /api/onboarding) ───────────────────────
   Yang diperiksa hanya bentuk MINIMUM yang dipakai gerbang & konfigurasi uang:
   `completedAt`, `situations`, `modules`, dan `wallet`. Field lain (nominal,
   catatan transaksi pertama) tetap disimpan apa adanya supaya kontrak
   `OnboardingResult` tidak kehilangan informasi. */
export function isOnboardingPayload(value: unknown): value is Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false
  const record = value as Record<string, unknown>
  const wallet = record.wallet
  return (
    typeof record.completedAt === 'string' &&
    record.completedAt.trim().length > 0 &&
    Array.isArray(record.situations) &&
    Array.isArray(record.modules) &&
    Boolean(wallet) &&
    typeof wallet === 'object' &&
    !Array.isArray(wallet)
  )
}
