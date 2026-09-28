import {
  consumeInviteIn,
  createInviteRecord,
  demoInviteRecords,
  isInviteUsable,
  resolveInviteFrom,
  type InviteRecord,
  type ResolvedInvite,
} from './data/joint-invite'
import { INITIAL_JOINT_WALLET } from './data/joint'
import { INVITE_TTL_MS } from './data/joint-invite'

/* ── PENYIMPANAN KODE UNDANGAN (paket 39) ────────────────────────────────────
   Satu tempat yang tahu di mana kode undangan hidup, supaya aturan "satu kode
   aktif per dompet" dan "sekali pakai" tidak pernah ditebak dua tempat berbeda.

   Di repo demo ini storagenya `localStorage` (`catet-ind-invites`) + cache di
   memori modul. Konsekuensi yang WAJIB dinyatakan jujur:
     • kode yang dibuat user hidup di PERANGKATNYA, bukan di server — jadi kode
       itu tidak bisa dipakai orang lain di perangkat lain (di produksi harus
       `POST /api/joint/invite` + `GET /api/joint/invite/:code`);
     • status invite adalah otorisasi, jadi di produksi ia WAJIB dibaca di server,
       bukan dari localStorage. Yang bisa dipakai dari file ini adalah LOGIKA-nya
       (`resolveInviteFrom`/`consumeInviteIn`) — sudah murni & teruji.
   Yang sudah nyata di demo: validasi 24 jam, sekali pakai, dan satu kode per
   dompet berlaku sungguhan (bukan copy).

   Catatan SSR: modul ini juga diimpor `app/join/[code]/page.tsx` (server) untuk
   metadata. Semua bacaan aman saat `window` tidak ada → mengembalikan seed demo
   saja, jadi tidak ada hydration mismatch: layar mengirim hasil server sebagai
   prop awal, lalu me-refresh setelah mount.
   ────────────────────────────────────────────────────────────────────────── */

const INVITE_STORAGE_KEY = 'catet-ind-invites'

const g = globalThis as unknown as { catetindInvites?: InviteRecord[] }

function isInviteRecord(value: unknown): value is InviteRecord {
  const record = value as Partial<InviteRecord> | null
  return (
    !!record &&
    typeof record.code === 'string' &&
    typeof record.walletId === 'string' &&
    typeof record.createdAt === 'number' &&
    typeof record.expiresAt === 'number' &&
    (record.usedBy === null || typeof record.usedBy === 'string')
  )
}

/** record yang dibuat user (di perangkat ini) — hanya ini yang dipersist */
function storedRecords(): InviteRecord[] {
  if (g.catetindInvites) return g.catetindInvites
  let parsed: InviteRecord[] = []
  if (typeof window !== 'undefined') {
    try {
      const raw = window.localStorage.getItem(INVITE_STORAGE_KEY)
      const list = raw ? (JSON.parse(raw) as unknown) : []
      parsed = Array.isArray(list) ? list.filter(isInviteRecord) : []
    } catch {
      /* localStorage diblokir / isinya rusak → mulai dari kosong, jangan crash */
      parsed = []
    }
  }
  g.catetindInvites = parsed
  return parsed
}

function persist(): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(INVITE_STORAGE_KEY, JSON.stringify(storedRecords()))
  } catch {
    /* private mode / kuota penuh — kode tetap hidup sampai tab ditutup */
  }
}

/**
 * Semua record yang dikenal: buatan user dulu, lalu seed demo. Record simpanan
 * menang kalau kodenya sama, dan seed demo sengaja TIDAK pernah dipersist supaya
 * keempat state review di halaman /join selalu bisa diperiksa.
 */
export function inviteRecords(): InviteRecord[] {
  const stored = storedRecords()
  const codes = new Set(stored.map((record) => record.code))
  return [...stored, ...demoInviteRecords().filter((seed) => !codes.has(seed.code))]
}

/** kode yang masih bisa dipakai untuk dompet ini (kode aktif terbaru) */
export function activeInviteFor(walletId: string, now = Date.now()): InviteRecord | null {
  return (
    storedRecords()
      .filter((record) => record.walletId === walletId && isInviteUsable(record, now))
      .sort((a, b) => b.createdAt - a.createdAt)[0] ?? null
  )
}

/**
 * Buat kode baru untuk satu dompet. Satu dompet = satu kode aktif: seluruh kode
 * lama untuk dompet itu ditandai "kedaluwarsa sekarang", sehingga tidak ada dua
 * kode hidup untuk dompet yang sama (itu yang membuat janji "1x pakai" bisa
 * ditelusuri).
 */
export function createInvite(walletId: string, now = Date.now()): InviteRecord {
  const records = inviteRecords()
  const fresh = createInviteRecord({ walletId, existing: records, now })

  for (const record of storedRecords()) {
    if (record.walletId === walletId && record.usedBy === null && record.expiresAt > now) {
      record.expiresAt = now
    }
  }

  storedRecords().push(fresh)
  persist()
  return fresh
}

/** status undangan dari kode — satu-satunya pintu yang dipakai halaman /join */
export function resolveInvite(code: string, now = Date.now()): ResolvedInvite {
  return resolveInviteFrom(inviteRecords(), code, now)
}

/**
 * Tandai kode sudah dipakai (sekali pakai). `null` = kode tidak bisa dipakai.
 *
 * Kode buatan user sudah hidup di simpanan, jadi cukup ditandai. Kode SEED DEMO
 * (mis. tautan review "Valid" di kaki /join) cuma ada di memori, jadi ia
 * DIPROMOSIKAN ke simpanan begitu dipakai — kalau tidak, kode yang sama akan
 * terlihat valid lagi setelah reload dan janji "cuma bisa dipakai 1x" jadi palsu
 * tepat di layar yang memamerkannya.
 */
export function consumeInvite(
  code: string,
  userId: string,
  now = Date.now(),
): InviteRecord | null {
  const normalized = code.trim().toUpperCase()

  const fromStore = consumeInviteIn(storedRecords(), normalized, userId, now)
  if (fromStore) {
    persist()
    return fromStore
  }

  const seed = demoInviteRecords(now).find((record) => record.code === normalized)
  if (seed && isInviteUsable(seed, now)) {
    seed.usedBy = userId
    storedRecords().push(seed)
    persist()
    return seed
  }

  return null
}

/** kosongkan simpanan (dipakai test) */
export function resetInviteStore(): void {
  g.catetindInvites = []
  if (typeof window !== 'undefined') {
    try {
      window.localStorage.removeItem(INVITE_STORAGE_KEY)
    } catch {
      /* diabaikan */
    }
  }
}

/* ── STATUS DARI SERVER (paket 45) ──────────────────────────────────────────
   Kode undangan yang hidup di database (dibuat di perangkat lain) tidak dikenal
   simpanan lokal, jadi `resolveInvite()` akan bilang `unknown` — padahal
   jawabannya sudah ada di server. Fungsi di bawah menyerap jawaban itu ke bentuk
   yang SUDAH dipakai halaman /join (`ResolvedInvite`), yaitu dengan mencatat
   fakta "kode ini sudah dipakai / kedaluwarsa" sebagai record lokal.

   Kenapa tidak mengembalikan objek `ResolvedInvite` buatan sendiri: bentuk itu
   membawa `validUntilLabel`/`inviterName` yang disusun `resolveInviteFrom()`
   (copy kanon /join). Menyusunnya ulang di komponen berarti dua tempat yang bisa
   berbeda soal copy — persis yang dihindari CONTEXT-WAJIB §4. */

/**
 * Catat status dari server. Mengembalikan `true` kalau ada yang berubah, supaya
 * pemanggil tahu kapan perlu membaca ulang `resolveInvite()`.
 */
export function markInviteFromServer(
  code: string,
  status: 'used' | 'expired',
  now = Date.now(),
): boolean {
  const normalized = code.trim().toUpperCase()
  const records = storedRecords()
  const existing = records.find((record) => record.code === normalized)

  if (existing) {
    const alreadyUsed = existing.usedBy !== null
    const alreadyExpired = existing.expiresAt <= now
    if (status === 'used' && !alreadyUsed) existing.usedBy = 'server'
    if (status === 'expired' && !alreadyExpired) existing.expiresAt = now
    if ((status === 'used' && alreadyUsed) || (status === 'expired' && alreadyExpired)) return false
    persist()
    return true
  }

  /* kode yang cuma dikenal server: simpan sebagai record supaya statusnya bisa
     dibaca jalur yang sama (dan tidak "hilang" saat halaman di-refresh) */
  records.push({
    code: normalized,
    walletId: INITIAL_JOINT_WALLET.id,
    createdAt: now,
    expiresAt: status === 'expired' ? now : now + INVITE_TTL_MS,
    usedBy: status === 'used' ? 'server' : null,
  })
  persist()
  return true
}

