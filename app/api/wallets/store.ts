import { WALLET_SEED, toHomeWallet, type Wallet, type WalletSeed } from '@/lib/wallets'
import { restConfigured, restFetch } from '@/lib/supabase/rest'
import { toWalletDbRow, toWalletSeed, type WalletDbRow } from '@/lib/supabase/mappers'

/* ── STORE DOMPET ROUTE API (paket 45: PROXY SUPABASE, BUKAN SUMBER KEDUA) ───
   Arah yang dipilih untuk `app/api/wallets/**` di paket ini adalah **proxy**:
   setiap fungsi di bawah meneruskan permintaan ke PostgREST dengan
   `Authorization: Bearer <token pemanggil>`. Konsekuensinya penting:

     · database yang memutuskan siapa boleh melihat apa (RLS `user_id = auth.uid()`),
       jadi route ini tidak perlu — dan tidak boleh — menyaring sendiri;
     · tidak ada state kedua yang bisa berbeda dari database. Versi paket 39
       adalah `Map<userId, Wallet[]>` di memory: hilang saat restart, dan satu
       instance server bisa punya isi berbeda dengan instance lain.

   Yang dipertahankan dari paket 39: janji bahwa user A tidak pernah menyentuh
   baris user B. Bedanya, penjaganya sekarang policy di database — dan itu
   dibuktikan `curl` dua akun di laporan paket 45.

   JALUR DEMO/TEST: kalau `NEXT_PUBLIC_SUPABASE_*` tidak ada (test tanpa env &
   build tanpa backend), fungsi-fungsi ini jatuh ke store memory yang sama seperti
   paket 39 supaya perilaku 401/isolasi tetap bisa diuji tanpa jaringan. Fallback
   ini TIDAK pernah aktif kalau backend dipasangkan. */

const g = globalThis as unknown as { catetindWalletStore?: Map<string, Wallet[]> }

/** `Wallet` (deck Home) → `WalletSeed` (bentuk tabel) */
function toSeed(wallet: Wallet): WalletSeed {
  return {
    id: wallet.id,
    name: wallet.name,
    holder: wallet.holder,
    number: wallet.number,
    network: wallet.network,
    opening: Math.max(0, Math.round(wallet.balance)),
    kind: wallet.kind,
    /* `Wallet` (deck Home) tidak punya label `type` — label itu milik halaman
       Dompet. Diturunkan dari `kind` supaya kolom `type` tetap terisi konsisten
       dan tidak ada dua sumber label. */
    type: wallet.kind === 'bank' ? 'Bank' : wallet.kind === 'ewallet' ? 'E-Wallet' : 'Cash',
    context: wallet.context,
    art: wallet.art,
    color: '',
    face: '',
    bandClass: wallet.bandClass,
    faceClass: wallet.faceClass,
    ...(wallet.glowClass ? { glowClass: wallet.glowClass } : {}),
  }
}

/** baris database → `Wallet` dengan `balance = opening` (lihat catatan `walletsOf`) */
function toWallet(dbRow: WalletDbRow): Wallet {
  const seed = toWalletSeed(dbRow)
  return toHomeWallet(seed, seed.opening)
}

/* ── FALLBACK MEMORY (test & build tanpa backend) ─────────────────────────── */

function memoryStore(): Map<string, Wallet[]> {
  return (g.catetindWalletStore ??= new Map<string, Wallet[]>())
}

function seedWallets(): Wallet[] {
  /* saldo seed = `opening` dompet kanon — angka yang sama dengan halaman Dompet */
  return WALLET_SEED.map((record) => toHomeWallet(record, record.opening))
}

function memoryWallets(userId: string): Wallet[] {
  const store = memoryStore()
  const existing = store.get(userId)
  if (existing) return existing
  const seeded = seedWallets()
  store.set(userId, seeded)
  return seeded
}

/* ── API (async: pemanggilnya route handler, yang memang async) ───────────── */

/**
 * Daftar dompet milik pemanggil.
 *
 * `balance` yang dikembalikan = `opening` (saldo pembuka), karena saldo yang
 * sebenarnya adalah turunan `opening + Σ baris ledger` dan itu dibaca dari view
 * `wallet_balances` (dipakai store klien). Route ini sengaja tidak menebak saldo:
 * menebak di sini berarti dua angka untuk satu dompet (temuan audit #8).
 */
export async function walletsOf(userId: string, token: string): Promise<Wallet[]> {
  if (!restConfigured() || !token) return memoryWallets(userId)
  const res = await restFetch<WalletDbRow[]>('wallets?select=*&order=sort_index.asc', {
    accessToken: token,
  })
  if (!res.ok || !res.data) return []
  return res.data.map(toWallet)
}

export async function findWallet(
  userId: string,
  id: string,
  token: string,
): Promise<Wallet | undefined> {
  if (!restConfigured() || !token) return memoryWallets(userId).find((wallet) => wallet.id === id)
  const res = await restFetch<WalletDbRow[]>(
    `wallets?select=*&id=eq.${encodeURIComponent(id)}&limit=1`,
    { accessToken: token },
  )
  const row = res.data?.[0]
  return row ? toWallet(row) : undefined
}

export async function insertWallet(userId: string, wallet: Wallet, token: string): Promise<Wallet> {
  if (!restConfigured() || !token) {
    memoryWallets(userId).push(wallet)
    return wallet
  }
  const res = await restFetch<WalletDbRow[]>('wallets', {
    method: 'POST',
    accessToken: token,
    body: toWalletDbRow(toSeed(wallet), memoryWallets(userId).length),
  })
  const row = res.data?.[0]
  return row ? toWallet(row) : wallet
}

export async function replaceWallet(
  userId: string,
  id: string,
  patch: Partial<Wallet>,
  token: string,
): Promise<Wallet | null> {
  if (!restConfigured() || !token) {
    const list = memoryWallets(userId)
    const index = list.findIndex((wallet) => wallet.id === id)
    if (index < 0) return null
    const updated: Wallet = { ...list[index], ...patch, id }
    list.splice(index, 1, updated)
    return updated
  }

  const body: Record<string, unknown> = {}
  if (patch.name !== undefined) body.name = patch.name
  if (patch.holder !== undefined) body.holder = patch.holder
  if (patch.number !== undefined) body.number = patch.number
  if (patch.network !== undefined) body.network = patch.network
  if (patch.balance !== undefined) body.opening = Math.max(0, Math.round(patch.balance))
  if (patch.kind !== undefined) body.kind = patch.kind
  if (patch.art !== undefined) body.art = patch.art
  if (patch.bandClass !== undefined) body.band_class = patch.bandClass
  if (patch.faceClass !== undefined) body.face_class = patch.faceClass
  if (patch.glowClass !== undefined) body.glow_class = patch.glowClass

  const res = await restFetch<WalletDbRow[]>(`wallets?id=eq.${encodeURIComponent(id)}`, {
    method: 'PATCH',
    accessToken: token,
    body,
  })
  const row = res.data?.[0]
  return row ? toWallet(row) : null
}

export async function removeWallet(
  userId: string,
  id: string,
  token: string,
): Promise<Wallet | null> {
  if (!restConfigured() || !token) {
    const list = memoryWallets(userId)
    const index = list.findIndex((wallet) => wallet.id === id)
    if (index < 0) return null
    return list.splice(index, 1)[0] ?? null
  }
  const res = await restFetch<WalletDbRow[]>(`wallets?id=eq.${encodeURIComponent(id)}`, {
    method: 'DELETE',
    accessToken: token,
  })
  const row = res.data?.[0]
  return row ? toWallet(row) : null
}

/** kosongkan fallback memory (dipakai test; di produksi "reset" tidak punya arti) */
export function resetWalletStore(): void {
  memoryStore().clear()
}

