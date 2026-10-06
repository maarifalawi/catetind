/* ── HALAMAN DEPAN (/welcome) — copy & data ─────────────────────────────────
   Satu-satunya layar yang dilihat orang SEBELUM punya akun. Dua keputusan yang
   mengikat seluruh isi file ini:

     1. JUDUL TRI-SEGMEN dengan ritme em-dash — kalimat dibelah tiga tarikan
        napas supaya terbaca seperti poster, bukan seperti paragraf pemasaran.
        Isinya satu janji saja: ncatet uang jadi ringan.
     2. NOL angka fiktif, NOL countdown, NOL testimoni karangan. Kartu di hero
        cuma ILUSTRASI antarmuka produk (`aria-hidden`) — sejalan dengan PRD
        5174–5177 yang melarang social proof & urgensi palsu.

   File ini murni data (tanpa React), sama seperti `lib/data/auth.ts` dan
   `lib/data/pricing.ts`, supaya komponennya nol string user-facing.
   ────────────────────────────────────────────────────────────────────────── */

/** route halaman ini — satu sumber, dipakai juga oleh tautan "kembali" di /login */
export const WELCOME_PATH = '/welcome'

/** dua pintu yang SUDAH ada di repo — jadi tidak ada tautan mati di halaman ini */
export const WELCOME_LINKS = {
  /** daftar akun: alur harga + sheet registrasi (inventaris #3) */
  register: '/checkout',
  /** masuk: magic link (inventaris #8) */
  login: '/login',
} as const

export const WELCOME_COPY = {
  eyebrow: 'Pelacak uang buat Gen-Z Indonesia',
  /** tiga tarikan napas — komponen merender tiap baris jadi satu blok */
  headlineLines: ['Nggak ada lagi —', 'Ribet atau Buntu —', 'Cuma Catet yang Enak.'],
  subtitle:
    'Catat pemasukan & pengeluaran tanpa drama. Rapi otomatis, jelas dalam sekali lihat, dan nggak perlu bikin password.',
  ctaPrimary: 'Mulai Sekarang',
  /** keterangan kecil di bawah CTA — menenangkan, bukan menagih */
  ctaNote: 'Tanpa auto-renew paksa · Kamu yang pegang kendali',
  /** pintu kedua di kanan atas bar brand */
  loginLead: 'Sudah punya akun?',
  loginLink: 'Masuk',
  legalNote: 'Dibuat di Jakarta 🌿',
} as const

/**
 * Chip kepercayaan di bawah CTA. `icon` sengaja berupa KUNCI string, bukan
 * komponen Lucide — file `lib/data/*` wajib bebas React; pemetaannya di
 * `welcome-screen.tsx`.
 */
export const WELCOME_TRUST_CHIPS = [
  { id: 'no-password', icon: 'shield', label: 'Tanpa password' },
  { id: 'encrypted', icon: 'lock', label: 'Data terenkripsi' },
  { id: 'fast', icon: 'zap', label: 'Mulai < 1 menit' },
] as const

/**
 * Kartu dekoratif di hero — ILUSTRASI antarmuka produk, bukan data nyata
 * (parent-nya `aria-hidden`). `tone` memetakan permukaan kanon di komponen:
 * daisy (kuning) · forest (hijau tua) · mint (hijau sage).
 */
export const WELCOME_CARDS = [
  { id: 'kopi', tone: 'daisy', tag: 'Harian', label: 'Kopi Pagi', amount: 'Rp 25.000' },
  { id: 'gaji', tone: 'forest', tag: 'Pemasukan', label: 'Gaji Bulanan', amount: 'Rp 8.500.000' },
  { id: 'dapur', tone: 'mint', tag: 'Budget', label: 'Kantong Dapur', amount: 'Rp 1.200.000' },
] as const

export type WelcomeCard = (typeof WELCOME_CARDS)[number]
export type WelcomeTone = WelcomeCard['tone']

/** dokumen legal publik yang benar-benar ada — bukan tautan mati */
export const WELCOME_LEGAL_LINKS = [
  { label: 'Kebijakan Privasi', href: '/privacy' },
  { label: 'Ketentuan Layanan', href: '/terms' },
] as const
