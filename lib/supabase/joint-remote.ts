'use client'

import type { JointSettlementRecord, JointTransaction, JointWallet } from '@/lib/data/joint'
import {
  DEFAULT_SETTLEMENT_METHOD,
  JOINT_DEFAULT_CATEGORY,
  SETTLEMENT_METHODS,
  splitSpecOf,
} from '@/lib/data/joint'
import { browserSupabase } from './client'
import { toJointTransaction, toSplitColumns, type JointTransactionDbRow } from './mappers'
import { isUuid } from './uuid'

/* ── BACA DOMPET BERSAMA DARI SERVER (paket 52) ──────────────────────────────
   Ini menutup temuan yang ditulis apa adanya di laporan 45:

     "/joint masih memakai id dompet kanon (`joint-1`) sehingga realtime belum
      menerima baris sampai /joint membaca `joint_wallets`"

   Sebelum paket 52, halaman `/joint` berlangganan Postgres Changes dengan id
   KANON itu — id yang tidak pernah ada di tabel `joint_wallets` (primary key-nya
   uuid). Artinya langganannya tidak akan pernah menerima satu baris pun walau
   backend sudah dipasangkan. Sekarang id-nya DIBACA dari tabelnya: RLS
   `joint_wallets_member_select` (migrasi 03) yang memutuskan dompet mana yang
   berhak dilihat pemanggil, jadi satu akun hanya bisa menemukan dompet yang
   memang ia anggotai.

   Satu panggilan mengembalikan tiga hal yang menentukan seluruh layar:
     · `wallet`   — id + nama + tanggal dibuat (bukan id kanon lagi);
     · `members`  — siapa saja anggotanya (`joint_members` + pemilik), dipakai
                    memutuskan halaman ini berwujud undangan atau kantong aktif;
     · `rows`     — catatan yang SUDAH ada di server, dibaca dari view masker
                    `joint_transactions_public` supaya catatan privat orang lain
                    tidak pernah masuk ke perangkat ini dalam bentuk aslinya.

   `null` = tidak ada sesi/backend, tabelnya kosong, ATAU salah satu bacaan
   gagal. Pemanggil (`lib/money/joint-store.ts`) lalu memakai jalur lokal —
   bukan mengosongkan layar: lebih baik menampilkan state perangkat yang jujur
   daripada layar kosong yang terlihat seperti data hilang. */

export interface RemoteJointWallet {
  wallet: JointWallet
  /** id user pemanggil — dipakai memutuskan isi catatan privat siapa yang boleh tampil */
  viewerId: string
  /**
   * PEMILIK dompet menurut server (`owner_id`). `null`/kosong = tidak terbaca
   * (backend lama / tanpa sesi). Dipakai UI untuk memutuskan siapa yang boleh
   * menghapus dompet & mengeluarkan anggota; server tetap penentu akhir lewat
   * RLS/RPC.
   */
  ownerId?: string | null
  /** id anggota (pemilik + `joint_members`), unik, urut kali pertama terlihat */
  members: string[]
  /**
   * Nama panggilan anggota (dari RPC `catetind_joint_roster`, yang memeriksa
   * keanggotaan lebih dulu). `{}` = nama belum terbaca; pemanggil memakai
   * sebutan netral ("Kamu"/"Pasangan") alih-alih nama karangan.
   */
  memberNames: Record<string, string>
  /** catatan yang sudah ada di server, terbaru dulu (pola urut store) */
  rows: JointTransaction[]
  /**
   * PENANDA SETTLE per bulan (`YYYY-MM` → record) dari tabel
   * `joint_settlements`.
   *
   * Tanpa ini, "bulan ini sudah settle" hanya hidup di perangkat yang menekan
   * tombolnya: akun pasangan tetap melihat "Belum Impas / Settle Sekarang"
   * selamanya. Isinya adalah kesepakatan bersama, jadi tempatnya di server.
   *
   * `null`/tidak diisi = bacaan settle gagal / backend lama → penanda yang sudah
   * ada di perangkat DIPERTAHANKAN (jangan dianggap "belum settle").
   */
  settlements?: Record<string, JointSettlementRecord> | null
}

/* ── BACA SEMUA BARIS, BUKAN 200 TERBARU ──────────────────────────────────────
   Batas `limit(200)` membuat riwayat kantong bersama terpotong tanpa penjelasan:
   pengeluaran lama hilang dari layar (dan dari timbangan settle) sementara di
   perangkat lain masih ada. Sekarang dibaca bertahap dengan batas keras — pola
   yang sama dengan `lib/supabase/money-remote.ts`. */
const REMOTE_PAGE_SIZE = 500
/** batas keras: 5000 baris ≈ beberapa tahun catatan bersama */
const REMOTE_ROW_MAX = 5_000

type WalletRow = { id: string; name: string; created_at?: string | null; owner_id?: string | null }

export async function readRemoteJointWallet(): Promise<RemoteJointWallet | null> {
  const client = browserSupabase()
  if (!client) return null

  try {
    const { data: session } = await client.auth.getSession()
    const viewerId = session.session?.user.id
    if (!viewerId) return null

    /* Dompet paling awal dibuat dipilih supaya hasilnya deterministik kalau
       kelak satu akun punya lebih dari satu dompet bersama.
       PRIORITAS ANGGOTA UNDANGAN: kalau akun ini punya dompet sendiri (mis.
       sisa percobaan lama) DAN juga diundang ke dompet orang lain, yang dibuka
       adalah dompet UNDANGAN — kalau tidak, anggota gratis yang diundang tidak
       pernah melihat dompet yang baru ia masuki. */
    const { data: walletRows, error: walletError } = await client
      .from('joint_wallets')
      .select('id,name,created_at,owner_id')
      .order('created_at', { ascending: true })
      .limit(20)
    if (walletError) return null

    const candidates = (walletRows ?? []) as WalletRow[]
    /**
     * Pilih dompet yang paling "hidup": jumlah anggota TERBANYAK. Ini menutup
     * kasus nyata anggota undangan yang masih punya dompet lamanya sendiri
     * (kosong, 1 anggota) — tanpa aturan ini, dompet yang baru ia masuki tidak
     * pernah terbuka karena dompet lamanya lebih dulu dibuat.
     * Seri → dompet yang BUKAN miliknya didahulukan (undangan), lalu yang
     * paling awal dibuat supaya hasilnya deterministik.
     */
    let raw = candidates[0]
    if (candidates.length > 1) {
      const ids = candidates.map((row) => row.id)
      const { data: memberRows } = await client
        .from('joint_members')
        .select('joint_wallet_id')
        .in('joint_wallet_id', ids)
      const counts = new Map<string, number>()
      for (const row of (memberRows ?? []) as { joint_wallet_id?: string }[]) {
        const id = row.joint_wallet_id
        if (!id) continue
        counts.set(id, (counts.get(id) ?? 0) + 1)
      }
      raw = [...candidates].sort((a, b) => {
        const diff = (counts.get(b.id) ?? 0) - (counts.get(a.id) ?? 0)
        if (diff !== 0) return diff
        const ownedA = a.owner_id === viewerId ? 1 : 0
        const ownedB = b.owner_id === viewerId ? 1 : 0
        return ownedA - ownedB
      })[0]
    }
    if (!raw?.id) return null

    /* anggota & baris dibaca paralel; barisnya bertahap (lihat catatan di atas) */
    const membersPromise = client
      .from('joint_members')
      .select('user_id')
      .eq('joint_wallet_id', raw.id)

    const allRows: JointTransactionDbRow[] = []
    for (let from = 0; from < REMOTE_ROW_MAX; from += REMOTE_PAGE_SIZE) {
      const to = Math.min(from + REMOTE_PAGE_SIZE, REMOTE_ROW_MAX) - 1
      const { data, error } = await client
        .from('joint_transactions_public')
        .select('*')
        .eq('joint_wallet_id', raw.id)
        .order('date', { ascending: false })
        /* `id` unik → urutan stabil antar-halaman (tanpa ini `range` bisa
           menggandakan satu baris dan melewatkan baris lain) */
        .order('id', { ascending: false })
        .range(from, to)
      /* Bacaannya hanya sah kalau barisnya benar-benar bisa dibaca: kalau gagal,
         pemanggil memakai jalur lokal — bukan menampilkan kantong "kosong" yang
         bisa disalahartikan sebagai data yang hilang. */
      if (error) return null
      const page = (data ?? []) as JointTransactionDbRow[]
      allRows.push(...page)
      if (page.length < REMOTE_PAGE_SIZE) break
    }

    const membersRes = await membersPromise
    const settlements = await readRemoteSettlements(raw.id)

    const members: string[] = []
    const memberIds = [
      viewerId,
      raw.owner_id,
      ...((membersRes.data ?? []) as { user_id?: string }[]).map((row) => row.user_id),
    ]
    for (const id of memberIds) {
      if (id && !members.includes(id)) members.push(id)
    }

    const rows = allRows
      .filter((row) => Boolean(row?.id))
      .map((row) => toJointTransaction(row, viewerId))

    return {
      wallet: {
        id: raw.id,
        name: raw.name,
        /* `created_at` di database bertimestamp; domain ini memakai tanggal
           lokal `YYYY-MM-DD` (dibaca apa adanya, tanpa `Date` & timezone) */
        createdAt: (raw.created_at ?? '').slice(0, 10),
      },
      viewerId,
      ownerId: raw.owner_id ?? null,
      members,
      memberNames: await readMemberNames(raw.id, viewerId),
      rows,
      settlements,
    }
  } catch {
    return null
  }
}

/**
 * Nama panggilan anggota kantong (`catetind_joint_roster`).
 *
 * Dipisah & gagal-sunyi: kalau RPC-nya belum ada (backend lama) atau gagal,
 * hasilnya `{}` dan layar memakai sebutan netral. Nama yang KOSONG tidak pernah
 * diganti nama karangan.
 */
async function readMemberNames(
  walletId: string,
  viewerId: string,
): Promise<Record<string, string>> {
  const client = browserSupabase()
  if (!client) return {}
  try {
    const { data, error } = await client.rpc('catetind_joint_roster', { p_wallet: walletId })
    if (error || !data) return {}
    const out: Record<string, string> = {}
    let others = 0
    for (const raw of data as { roster_user_id?: string; roster_nickname?: string }[]) {
      const id = raw.roster_user_id
      if (!id) continue
      const name = (raw.roster_nickname ?? '').trim()
      /* pemilik sesi selalu "Kamu" — itu yang dibaca user tentang dirinya di
         buku besar bersama, bukan nama panggilan yang ia isi saat daftar */
      if (id === viewerId) {
        out[id] = 'Kamu'
        continue
      }
      /* anggota lain TANPA nama panggilan: yang kedua tetap "Pasangan" (bahasa
         lama), yang ketiga & seterusnya "Anggota N" — jangan sampai tiga orang
         di satu layar sama-sama bernama "Pasangan". */
      others += 1
      out[id] = name || (others === 1 ? 'Pasangan' : `Anggota ${others + 1}`)
    }
    return out
  } catch {
    return {}
  }
}

/* ── PENANDA SETTLE DI SERVER ────────────────────────────────────────────────
   Dulu "bulan ini sudah settle" hanya ditulis ke IndexedDB perangkat yang
   menekan tombolnya (`recordSettlement()`), jadi akun pasangan TIDAK PERNAH
   melihatnya dan terus diminta menekan "Settle Sekarang" untuk bulan yang sama.

   Tabel `joint_settlements` (migrasi `20261111140000_...`) menyimpan SATU baris
   per dompet+bulan; RLS membatasinya ke anggota, dan tabelnya ikut publication
   realtime. Bentuknya sengaja bukan baris `joint_transactions`: settle bukan
   pengeluaran, dan `carry_over`/`method` tidak punya kolom di sana.
   ────────────────────────────────────────────────────────────────────────── */

interface JointSettlementRow {
  month_key?: string | null
  from_user_id?: string | null
  to_user_id?: string | null
  amount?: number | string | null
  method?: string | null
  carry_over?: number | string | null
  settled_at?: string | null
}

/** `timestamptz` → tanggal & jam LOKAL perangkat (yang dibaca user) */
function localMoment(iso: string | null | undefined): { date: string; time: string } {
  if (!iso) return { date: '', time: '' }
  const parsed = new Date(iso)
  if (Number.isNaN(parsed.getTime())) return { date: iso.slice(0, 10), time: '' }
  const pad = (value: number) => String(value).padStart(2, '0')
  return {
    date: `${parsed.getFullYear()}-${pad(parsed.getMonth() + 1)}-${pad(parsed.getDate())}`,
    time: `${pad(parsed.getHours())}:${pad(parsed.getMinutes())}`,
  }
}

/** satu baris tabel → `[bulan, record]`; `null` = bentuknya tidak sah */
function toJointSettlement(row: JointSettlementRow): [string, JointSettlementRecord] | null {
  const month = (row.month_key ?? '').trim()
  if (!/^\d{4}-\d{2}$/.test(month)) return null
  const from = row.from_user_id ?? ''
  const to = row.to_user_id ?? ''
  if (!from || !to || from === to) return null
  const method =
    SETTLEMENT_METHODS.find((item) => item === row.method) ?? DEFAULT_SETTLEMENT_METHOD
  const moment = localMoment(row.settled_at)
  const record: JointSettlementRecord = {
    month,
    from,
    to,
    amount: Math.max(0, Math.round(Number(row.amount) || 0)),
    method,
    carryOver: Math.max(0, Math.round(Number(row.carry_over) || 0)),
    ...(moment.date ? { settledAt: moment.date } : {}),
    ...(moment.time ? { settledTime: moment.time } : {}),
  }
  return [month, record]
}

/**
 * Baca penanda settle kantong ini.
 *
 * `null` = tabelnya TIDAK BISA DIBACA (backend lama / jaringan) — pemanggil
 * mempertahankan penanda yang sudah ada di perangkat. `{}` = benar-benar belum
 * ada settle. Perbedaan ini penting: kalau kegagalan dibaca sebagai "kosong",
 * satu gangguan jaringan akan menghapus status "sudah settle" di layar.
 */
async function readRemoteSettlements(
  walletId: string,
): Promise<Record<string, JointSettlementRecord> | null> {
  const client = browserSupabase()
  if (!client) return null
  try {
    const { data, error } = await client
      .from('joint_settlements')
      .select('month_key,from_user_id,to_user_id,amount,method,carry_over,settled_at')
      .eq('joint_wallet_id', walletId)
    if (error) return null
    const out: Record<string, JointSettlementRecord> = {}
    for (const raw of (data ?? []) as JointSettlementRow[]) {
      const mapped = toJointSettlement(raw)
      if (mapped) out[mapped[0]] = mapped[1]
    }
    return out
  } catch {
    return null
  }
}

/**
 * Tulis/ubah penanda settle satu bulan. Upsert pada `(joint_wallet_id,
 * month_key)` → menekan tombol dua kali tidak pernah membuat dua baris.
 * `false` = tidak ada sesi/backend atau server menolak; pemanggil menandai
 * record sebagai `pendingSync` dan mengirim ulang nanti.
 */
export async function pushJointSettlement(
  record: JointSettlementRecord,
  input: { walletId: string; viewerId: string },
): Promise<boolean> {
  const client = browserSupabase()
  if (!client) return false
  if (!isUuid(input.walletId) || !isUuid(input.viewerId)) return false
  if (!isUuid(record.from) || !isUuid(record.to)) return false
  try {
    const moment = record.settledAt
      ? new Date(`${record.settledAt}T${record.settledTime ?? '00:00'}:00`)
      : new Date()
    const settledAt = Number.isNaN(moment.getTime()) ? new Date().toISOString() : moment.toISOString()
    const { error } = await client.from('joint_settlements').upsert(
      {
        joint_wallet_id: input.walletId,
        month_key: record.month,
        from_user_id: record.from,
        to_user_id: record.to,
        amount: Math.max(0, Math.round(record.amount)),
        method: record.method,
        carry_over: Math.max(0, Math.round(record.carryOver)),
        settled_at: settledAt,
        created_by_user_id: input.viewerId,
      },
      { onConflict: 'joint_wallet_id,month_key' },
    )
    return !error
  } catch {
    return false
  }
}

/** Cabut penanda settle satu bulan di server (dipakai "Batalkan settle"). */
export async function deleteRemoteJointSettlement(
  walletId: string,
  month: string,
): Promise<boolean> {
  const client = browserSupabase()
  if (!client) return false
  if (!isUuid(walletId) || !/^\d{4}-\d{2}$/.test(month)) return false
  try {
    const { error } = await client
      .from('joint_settlements')
      .delete()
      .eq('joint_wallet_id', walletId)
      .eq('month_key', month)
    return !error
  } catch {
    return false
  }
}


/* ── KANTONG BERSAMA DI SERVER (paket 100) ──────────────────────────────────
   `createJointPocket()` di store hanya menamai kantong di PERANGKAT. Akibatnya
   `wallet.id` masih id kanon (`joint_1`) — bukan uuid — sehingga
   `catetind_create_invite` selalu menjawab "Kamu bukan anggota dompet bersama
   itu", dan kode undangan tidak pernah sampai ke tabel `invite_codes` (partner
   di perangkat lain tidak akan pernah bisa gabung).

   RPC `catetind_ensure_joint_pocket` menutupnya secara IDEMPOTEN: satu pemilik =
   satu kantong (yang paling awal dibuat dipakai ulang), nama disesuaikan, dan
   baris keanggotaan pemilik (`role = 'owner'`) dipastikan ada. `null` = tidak ada
   sesi/backend atau RPC belum tersedia → pemanggil tetap di jalur lokal.
*/
export async function ensureJointPocketRemote(name: string): Promise<JointWallet | null> {
  const client = browserSupabase()
  if (!client) return null
  const trimmed = name.trim()
  try {
    const { data, error } = await client.rpc('catetind_ensure_joint_pocket', {
      p_name: trimmed.length > 0 ? trimmed : null,
    })
    if (error || !data) return null
    const row = (Array.isArray(data) ? data[0] : data) as
      | { pocket_id?: string; pocket_name?: string; pocket_created_at?: string }
      | undefined
    if (!row?.pocket_id) return null
    return {
      id: row.pocket_id,
      name: row.pocket_name ?? trimmed,
      /* kolomnya timestamptz; domain ini memakai tanggal lokal `YYYY-MM-DD` */
      createdAt: (row.pocket_created_at ?? '').slice(0, 10),
    }
  } catch {
    return null
  }
}

/* ── JALUR TULIS KANTONG BERSAMA KE SERVER (paket 64 · Paket D) ──────────────
   Sebelumnya `/joint` hanya MEMBACA dari server; catatan baru tetap di perangkat.
   Fungsi di bawah mengirim satu baris ke `joint_transactions` dengan
   `client_tx_id` (uuid baris itu) sebagai kunci idempotensi — constraint
   `unique (joint_wallet_id, client_tx_id)` sudah ada, jadi double-tap / retry
   tidak menggandakan catatan.

   Kolom `user_id`/`paid_by_user_id` bertipe uuid, dan SEJAK identitas kantong
   bersama memakai uuid sungguhan, `pocketId` memang uuid peserta. Baris lama
   yang masih membawa id contoh dinormalkan oleh store
   (`jointIdentityMap`) sebelum sampai ke sini. */

/**
 * Keluar dari kantong bersama: hapus baris keanggotaan MILIK SENDIRI.
 *
 * RLS `joint_members_owner_delete` mengizinkan `user_id = auth.uid()`, jadi ini
 * satu-satunya jalur "putus koneksi" yang benar-benar mengubah data. Dompet &
 * catatan pasangan TIDAK ikut terhapus — keluar dari satu kantong bukan alasan
 * menghapus data orang lain.
 *
 * `false` = tidak ada sesi/backend; pemanggil tetap membersihkan state lokal dan
 * mengatakannya apa adanya.
 */
export async function deleteRemoteJointMembership(
  jointWalletId: string,
  userId: string,
): Promise<boolean> {
  const client = browserSupabase()
  if (!client) return false
  try {
    const { data, error } = await client
      .from('joint_members')
      .delete()
      .eq('joint_wallet_id', jointWalletId)
      .eq('user_id', userId)
      .select('user_id')
    return !error && Array.isArray(data) && data.length > 0
  } catch {
    return false
  }
}

/**
 * Status akses pemanggil terhadap satu dompet menurut SERVER.
 *
 *   · `'owner'` / `'member'` → dompet masih ada & ia berhak membukanya;
 *   · `'none'`               → dompet sudah DIHAPUS pemilik atau ia sudah
 *                              DIKELUARKAN (dua hal yang bagi perangkat tampak
 *                              sama: "tidak ada dompet");
 *   · `null`                 → tidak bisa diperiksa (tanpa sesi / RPC belum ada).
 *
 * `null` sengaja TIDAK diperlakukan sebagai `'none'`: backend yang tidak bisa
 * dihubungi tidak boleh membuat perangkat menghapus data user.
 */
export async function readRemoteJointAccess(
  jointWalletId: string,
): Promise<'owner' | 'member' | 'none' | null> {
  const client = browserSupabase()
  if (!client || !isUuid(jointWalletId)) return null
  try {
    const { data, error } = await client.rpc('catetind_joint_access', { p_wallet: jointWalletId })
    if (error) return null
    const value = typeof data === 'string' ? data : null
    return value === 'owner' || value === 'member' || value === 'none' ? value : null
  } catch {
    return null
  }
}

/**
 * PEMILIK mengeluarkan satu anggota (`catetind_remove_joint_member`).
 *
 * RPC-nya memeriksa kepemilikan di server; `false` = bukan pemilik / anggota
 * tidak ada / tanpa sesi. Riwayat catatan anggota itu TIDAK disentuh: baris
 * `joint_transactions` menyimpan `user_id` sebagai uuid, dan saat namanya tidak
 * lagi ada di roster, UI memakai sebutan netral (bukan nama contoh).
 */
export async function removeRemoteJointMember(
  jointWalletId: string,
  userId: string,
): Promise<boolean> {
  const client = browserSupabase()
  if (!client || !isUuid(jointWalletId) || !isUuid(userId)) return false
  try {
    const { data, error } = await client.rpc('catetind_remove_joint_member', {
      p_wallet: jointWalletId,
      p_user: userId,
    })
    if (error) return false
    return data === true
  } catch {
    return false
  }
}

/**
 * HAPUS DOMPET BERSAMA di server (bukan sekadar keluar).
 *
 * `joint_wallets` punya `on delete cascade` ke `joint_members` &
 * `joint_transactions`, jadi satu delete di sini membersihkan seluruh isi
 * dompet. RLS `joint_wallets_owner_delete` membatasi operasi ini untuk PEMILIK;
 * anggota biasa yang mencoba akan mendapat 0 baris terhapus (tanpa error) —
 * karena itu pemanggil TIDAK boleh mengklaim "sudah terhapus di server" hanya
 * dari `true`. `false` = tidak ada sesi/backend, atau server menolak.
 */
export async function deleteRemoteJointWallet(jointWalletId: string): Promise<boolean> {
  const client = browserSupabase()
  if (!client) return false
  try {
    const { data, error } = await client
      .from('joint_wallets')
      .delete()
      .eq('id', jointWalletId)
      .select('id')
    return !error && Array.isArray(data) && data.length > 0
  } catch {
    return false
  }
}

/** Simpan nama dompet bersama ke server (nama yang diubah user tidak boleh
 *  hanya berubah di perangkat ini). */
export async function updateRemoteJointWalletName(
  jointWalletId: string,
  name: string,
): Promise<boolean> {
  const client = browserSupabase()
  if (!client) return false
  const trimmed = name.trim()
  if (!jointWalletId || !trimmed) return false
  try {
    const { error } = await client
      .from('joint_wallets')
      .update({ name: trimmed })
      .eq('id', jointWalletId)
    return !error
  } catch {
    return false
  }
}

export async function pushJointTransactionToServer(
  row: JointTransaction,
  input: { walletId: string; viewerId: string; pocketId: string; remoteId: string },
): Promise<boolean> {
  const client = browserSupabase()
  if (!client) return false
  try {
    const split = splitSpecOf(row)
    const cols = toSplitColumns(split)
    /* Penerima manfaat pelunasan = pihak yang porsinya 100% (`single_payer`).
       Disimpan EKSPLISIT supaya perangkat anggota lain tidak perlu menebak, dan
       supaya RLS bisa memastikan penerimanya memang anggota dompet. */
    const beneficiary =
      row.isSettlement && split.type === 'single_payer' && isUuid(split.payerId)
        ? split.payerId
        : null
    const { error } = await client.from('joint_transactions').insert({
      id: input.remoteId,
      joint_wallet_id: input.walletId,
      user_id: input.viewerId,
      paid_by_user_id: input.pocketId,
      description: row.description,
      amount: Math.max(0, Math.round(row.amount)),
      category: row.category || JOINT_DEFAULT_CATEGORY,
      date: row.date || null,
      time_label: row.time || '00:00',
      split_type: cols.split_type,
      split_percents: cols.split_percents,
      split_amounts: cols.split_amounts,
      /* Peserta mode Bagi Rata — tanpa kolom ini, perangkat anggota lain
         membagi ke SEMUA orang sementara penginput membagi ke sebagian */
      split_members: cols.split_members,
      bearer_id:
        split.type === 'single_payer' && isUuid(split.payerId)
          ? split.payerId
          : row.payerId && isUuid(row.payerId)
            ? row.payerId
            : null,
      settle_to_user_id: beneficiary,
      is_private: row.isPrivate === true,
      private_for_user: row.isPrivate ? (row.privateForUser ?? input.viewerId) : null,
      is_settlement: row.isSettlement === true,
      /* jenis baris: pemasukan bersama TIDAK boleh tersimpan sebagai pengeluaran
         (kolom `kind` datang dari migrasi multi-member) */
      kind: row.kind === 'income' ? 'income' : 'expense',
      /* bulan yang DISELESAIKAN untuk baris settle (bisa beda dari tanggal
         transfer); untuk catatan biasa tetap bulan tanggalnya */
      month_key: row.settlementMonth ?? ((row.date || '').slice(0, 7) || '1970-01'),
      client_tx_id: input.remoteId,
    })
    return !error || error.code === '23505'
  } catch {
    return false
  }
}

/**
 * Ubah baris yang SUDAH ada di server (pembagian, kantong pembayar, jenis).
 *
 * Sebelum ini `syncJointRow()` selalu INSERT; baris dengan `remoteId` lalu
 * ditolak unique constraint (`23505`) dan dianggap "berhasil", sehingga
 * perubahan pembagian hanya hidup di perangkat pengubah — persis yang membuat
 * angka antar-perangkat berbeda. Kolom `user_id`/`client_tx_id` TIDAK ikut
 * diubah: penulis asli & kunci idempotensi harus tetap.
 */
export async function updateJointTransactionOnServer(
  row: JointTransaction,
  remoteId: string,
): Promise<boolean> {
  const client = browserSupabase()
  if (!client || !isUuid(remoteId)) return false
  try {
    const split = splitSpecOf(row)
    const cols = toSplitColumns(split)
    const beneficiary =
      row.isSettlement && split.type === 'single_payer' && isUuid(split.payerId)
        ? split.payerId
        : null
    const { data, error } = await client
      .from('joint_transactions')
      .update({
        paid_by_user_id: row.paidByUserId && isUuid(row.paidByUserId) ? row.paidByUserId : undefined,
        description: row.description,
        amount: Math.max(0, Math.round(row.amount)),
        category: row.category || JOINT_DEFAULT_CATEGORY,
        date: row.date || null,
        time_label: row.time || '00:00',
        split_type: cols.split_type,
        split_percents: cols.split_percents,
        split_amounts: cols.split_amounts,
        split_members: cols.split_members,
        bearer_id:
          split.type === 'single_payer' && isUuid(split.payerId)
            ? split.payerId
            : row.payerId && isUuid(row.payerId)
              ? row.payerId
              : null,
        settle_to_user_id: beneficiary,
        is_private: row.isPrivate === true,
        private_for_user: row.isPrivate ? (row.privateForUser ?? null) : null,
        is_settlement: row.isSettlement === true,
        kind: row.kind === 'income' ? 'income' : 'expense',
        month_key: row.settlementMonth ?? ((row.date || '').slice(0, 7) || '1970-01'),
      })
      .eq('id', remoteId)
      .select('id')
    return !error && Array.isArray(data) && data.length > 0
  } catch {
    return false
  }
}

/**
 * HAPUS satu catatan di server.
 *
 * Versi lama hanya memeriksa `error`. Di Postgres + RLS, DELETE yang ditolak
 * TIDAK menghasilkan error — hasilnya 0 baris. Akibatnya penghapusan yang
 * ditolak dilaporkan "berhasil", barisnya hilang di perangkat ini saja, dan
 * anggota lain (atau refresh berikutnya) tetap melihat catatan yang sama —
 * persis keluhan "di akun kedua transaksinya masih ada".
 *
 * Pola `.select('id')` + cek jumlah baris dipakai juga oleh
 * `deleteRemoteJointWallet` & `deleteRemoteJointMembership`: satu-satunya bukti
 * "benar-benar terhapus" adalah baris yang dikembalikan server.
 */
export async function deleteRemoteJointTransaction(remoteId: string): Promise<boolean> {
  const client = browserSupabase()
  if (!client || !isUuid(remoteId)) return false
  try {
    const { data, error } = await client
      .from('joint_transactions')
      .delete()
      .eq('id', remoteId)
      .select('id')
    return !error && Array.isArray(data) && data.length > 0
  } catch {
    return false
  }
}

