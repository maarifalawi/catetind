/* ── KOLOM YANG DIBACA DASHBOARD ADMIN (SATU DAFTAR, BISA DIAUDIT) ───────────
   Daftar ini adalah pagar privasi yang paling mudah diperiksa: kalau ada yang
   menambahkan `note`, `description`, `amount`, atau `balance` ke salah satu
   SELECT di bawah, dashboard admin berubah menjadi alat mengintip catatan
   pribadi user. Test `columns.test.ts` mengunci janji itu.

   Yang dibaca hanya:
     · `user_id` (untuk menghitung per akun),
     · penanda aktivitas (`ai_generated`),
     · jumlah/keadaan langganan & pembelian (uang masuk ke CatetInd).

   Nama tabel & kolom mengikuti migrasi yang ada (`supabase/migrations/*`).
   ────────────────────────────────────────────────────────────────────────── */

export const ADMIN_COLUMNS = {
  /** nama panggilan terbaru; identitas utama tetap dari `auth.users` */
  profiles: 'user_id,nickname',
  wallets: 'user_id',
  /** HANYA penanda AI — tanpa nominal, kategori, atau catatan transaksi */
  ledgerRows: 'user_id,ai_generated',
  bills: 'user_id',
  goals: 'user_id',
  jointMembers: 'user_id',
  debts: 'user_id',
  investments: 'user_id',
  physicalAssets: 'user_id',
  aiUsage: 'user_id,month_key,calls_used',
  aiAddons: 'user_id,tokens',
  referrals: 'referrer_user_id',
  userSettings: 'user_id,onboarding',
  subscriptions:
    'user_id,tier_name,billing_period,is_lifetime,is_active,started_at,expires_at',
  purchases:
    'order_id,user_id,status,price_paid,payment_method,purpose,tier_name,billing_period,created_at,paid_at,expected_amount',
} as const

/** nama tabel yang boleh dibaca dashboard (dipakai dokumentasi & test) */
export const ADMIN_TABLES = [
  'profiles',
  'wallets',
  'ledger_rows',
  'bills',
  'goals',
  'joint_members',
  'debts',
  'investments',
  'physical_assets',
  'ai_usage',
  'ai_addons',
  'referrals',
  'user_settings',
  'user_subscriptions',
  'purchases',
] as const
